"""Orchestrator: AI Team Manager — classifies, plans, delegates, tracks, stops on safety failure."""
import time
from datetime import datetime
from sqlalchemy.orm import Session
from .base import Agent
from .specialists import (TransactionAgent, RiskAgent, ResolutionAgent, CommunicationAgent,
                          VerificationAgent, RefundAgent, EscalationAgent)
from ..tools.payment_tools import CaseManagementTool, RefundStatusTool
from ..config import settings
from .. import models


class OrchestratorAgent(Agent):
    name = "orchestrator"; task = "Manage end-to-end case resolution"

    def _step(self, delay=True):
        if delay:
            time.sleep(settings.AGENT_STEP_DELAY)

    def execute(self, db: Session, case_id: str, ctx: dict) -> dict:
        ex = self._start(db, case_id, ctx)
        desc = ctx.get("description", "").lower()
        # classify
        if "pending" in desc:
            issue = "PAYMENT_PENDING"
        elif "deduct" in desc or "debit" in desc or "fail" in desc:
            issue = "PAYMENT_FAILURE_DEBIT"
        else:
            issue = "GENERAL_PAYMENT_QUERY"
        ctx["issue_type"] = issue
        CaseManagementTool.add_event(db, case_id, "case_classified", "orchestrator",
                                     f"Issue classified as {issue}. Plan: investigate → risk → decide → communicate → verify → refund → final-verify.",
                                     {"issue_type": issue})
        T, R, Res, C, V, Ref, Esc = (TransactionAgent(), RiskAgent(), ResolutionAgent(),
                                     CommunicationAgent(), VerificationAgent(), RefundAgent(), EscalationAgent())

        # 1 investigate
        CaseManagementTool.set_status(db, case_id, "INVESTIGATING"); self._step()
        r1 = T.execute(db, case_id, ctx)
        if r1["status"] == "FAILED":
            ctx.update(escalation_reason="Transaction data inconsistent or missing.", escalation_recommendation="Verify transaction manually.")
            Esc.execute(db, case_id, ctx)
            return self._finish(db, case_id, ex, {"outcome": "ESCALATED"})

        # 2 risk
        CaseManagementTool.set_status(db, case_id, "RISK_ASSESSMENT"); self._step()
        r2 = R.execute(db, case_id, ctx)
        if r2["status"] == "FAILED":
            ctx.update(escalation_reason="Risk assessment failed.", escalation_recommendation="Manual risk review.")
            Esc.execute(db, case_id, ctx)
            return self._finish(db, case_id, ex, {"outcome": "ESCALATED"})

        # 3 resolution
        CaseManagementTool.set_status(db, case_id, "RESOLUTION_DECISION"); self._step()
        r3 = Res.execute(db, case_id, ctx)
        decision = ctx.get("resolutionDecision", {}).get("decision")

        if decision == "ESCALATE_HUMAN":
            ctx["comm_phase"] = "pre-refund"
            C.execute(db, case_id, ctx)
            ctx.update(escalation_reason=f"Resolution requires human: risk={ctx.get('riskAssessment',{}).get('riskLevel')}",
                       escalation_recommendation="Manual review required")
            Esc.execute(db, case_id, ctx)
            return self._finish(db, case_id, ex, {"outcome": "ESCALATED", "decision": decision})

        if decision in ("NO_ACTION", "MONITOR"):
            ctx["comm_phase"] = "pre-refund"
            CaseManagementTool.set_status(db, case_id, "COMMUNICATION"); self._step()
            C.execute(db, case_id, ctx)
            case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
            # NO duplicate refund + pending monitor both end as WAITING or RESOLVED(no-action)
            if decision == "NO_ACTION" and ctx.get("transaction", {}).get("refundExists"):
                CaseManagementTool.set_status(db, case_id, "RESOLVED")
                case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
                if case:
                    case.resolved_at = datetime.utcnow(); db.commit()
                self._step(False)
                CaseManagementTool.add_event(db, case_id, "resolved", "orchestrator", "Case resolved — refund already existed, no duplicate issued.")
                return self._finish(db, case_id, ex, {"outcome": "RESOLVED", "decision": decision})
            CaseManagementTool.set_status(db, case_id, "WAITING")
            CaseManagementTool.add_event(db, case_id, "waiting", "orchestrator", "Case parked: monitoring pending payment.")
            return self._finish(db, case_id, ex, {"outcome": "WAITING", "decision": decision})

        # 4 communication (pre-refund)
        ctx["comm_phase"] = "pre-refund"
        CaseManagementTool.set_status(db, case_id, "COMMUNICATION"); self._step()
        C.execute(db, case_id, ctx)

        # 5 verification gate
        CaseManagementTool.set_status(db, case_id, "VERIFICATION"); self._step()
        r5 = V.execute(db, case_id, ctx)
        if ctx.get("verification", {}).get("verification") != "PASSED":
            ctx.update(escalation_reason="Verification failed — refund preconditions not met.",
                       escalation_recommendation="Manually verify debit/settlement before refund.")
            Esc.execute(db, case_id, ctx)
            return self._finish(db, case_id, ex, {"outcome": "ESCALATED"})

        # 6 refund — any non-SUCCESS must escalate immediately (no fallthrough)
        CaseManagementTool.set_status(db, case_id, "REFUND_PROCESSING"); self._step()
        r6 = Ref.execute(db, case_id, ctx)
        refund = ctx.get("refund") or {}
        if r6["status"] == "FAILED" or refund.get("status") != "SUCCESS" or not refund.get("refundId"):
            # idempotent replay with SUCCESS counts as success (handled inside RefundAgent);
            # everything else escalates here instead of falling through to post-verify.
            ctx.update(escalation_reason="Refund execution failed after retries.", escalation_recommendation="Retry manually / contact gateway ops.")
            Esc.execute(db, case_id, ctx)
            return self._finish(db, case_id, ex, {"outcome": "ESCALATED"})

        # 7 post-refund verification (never trust attempt alone)
        CaseManagementTool.set_status(db, case_id, "REFUND_VERIFICATION"); self._step()
        chk = RefundStatusTool.run(db, case_id, refund["refundId"])
        if chk.get("status") == "SUCCESS" and chk.get("amount_matches", True):
            CaseManagementTool.set_status(db, case_id, "RESOLVED")
            case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
            if case:
                case.resolved_at = datetime.utcnow(); db.commit()
            ctx["comm_phase"] = "post-refund"
            C.execute(db, case_id, ctx)
            CaseManagementTool.add_event(db, case_id, "resolved", "orchestrator",
                                         f"Case resolved. Refund {ctx['refund']['refundId']} verified SUCCESS.")
            return self._finish(db, case_id, ex, {"outcome": "RESOLVED"})
        ctx.update(escalation_reason="Post-refund verification failed.", escalation_recommendation="Confirm refund with gateway ops.")
        Esc.execute(db, case_id, ctx)
        return self._finish(db, case_id, ex, {"outcome": "ESCALATED"})
