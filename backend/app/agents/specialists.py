"""Specialist agents — each has ROLE/TOOLS/INPUT/OUTPUT/CONSTRAINTS and
delegates only via tools. LLM enhances narrative; scores/decisions are deterministic."""
from sqlalchemy.orm import Session
from .base import Agent
from ..tools.payment_tools import (
    TransactionLookupTool, TransactionHistoryTool, RiskAnalysisTool,
    RefundEligibilityTool, RefundExecutionTool, RefundStatusTool,
    CustomerNotificationTool, CaseManagementTool, HumanEscalationTool,
)
from ..llm import LLMService
from ..config import settings
from .. import models


class TransactionAgent(Agent):
    name = "transaction"; task = "Investigate payment transaction"
    ROLE = "Payment Investigation Specialist"

    def execute(self, db: Session, case_id: str, ctx: dict) -> dict:
        ex = self._start(db, case_id, ctx)
        try:
            txn_id = ctx.get("transaction_id", "")
            info = TransactionLookupTool.run(db, case_id, txn_id)
            if not info.get("found"):
                return self._finish(db, case_id, ex, {"error": "transaction not found"},
                                    TransactionLookupTool.name, "FAILED", "Transaction not found")
            status_map = {"FAILED": "CONFIRMED_DEBIT_FAILED_PAYMENT" if info["debited"] else "FAILED_NO_DEBIT",
                          "SUCCESS": "PAYMENT_SUCCESSFUL", "PENDING": "PAYMENT_PENDING"}
            out = {"transactionId": info["transaction_id"], "amount": info["amount"],
                   "transactionStatus": info["status"], "debited": info["debited"],
                   "merchantCredited": info["merchant_credited"],
                   "settled": info["settlement_status"] == "SETTLED",
                   "refundExists": info["refundExists"],
                   "investigationStatus": status_map.get(info["status"], "UNKNOWN"),
                   "confidence": 0.97}
            out = LLMService.enhance(self.name, f"You are {self.ROLE}. Summarise investigation {out}", out)
            ctx["transaction"] = out; ctx["_txn_raw"] = info
            return self._finish(db, case_id, ex, out, TransactionLookupTool.name)
        except Exception as e:
            return self._finish(db, case_id, ex, {}, TransactionLookupTool.name, "FAILED", str(e))


class RiskAgent(Agent):
    name = "risk"; task = "Assess fraud/safety risk"
    ROLE = "Risk & Safety Specialist"

    def execute(self, db: Session, case_id: str, ctx: dict) -> dict:
        ex = self._start(db, case_id, ctx)
        try:
            raw = ctx.get("_txn_raw", {})
            case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
            hist = TransactionHistoryTool.run(db, case_id, (raw.get("user_id") if raw.get("user_id") else (case.user_id if case else 1)))
            scored = RiskAnalysisTool.run(db, case_id, raw or ctx.get("transaction", {}), hist)
            out = {"riskScore": scored["risk_score"], "riskLevel": scored["risk_level"],
                   "automaticResolutionAllowed": scored["automatic_resolution_allowed"],
                   "reasons": scored["reasons"]}
            out = LLMService.enhance(self.name, f"You are {self.ROLE}. Explain risk {out}", out)
            ctx["riskAssessment"] = out
            return self._finish(db, case_id, ex, out, RiskAnalysisTool.name)
        except Exception as e:
            return self._finish(db, case_id, ex, {}, RiskAnalysisTool.name, "FAILED", str(e))


class ResolutionAgent(Agent):
    name = "resolution"; task = "Decide correct resolution"
    ROLE = "Resolution Decision Specialist"

    def execute(self, db: Session, case_id: str, ctx: dict) -> dict:
        ex = self._start(db, case_id, ctx)
        try:
            t = ctx.get("transaction", {}); r = ctx.get("riskAssessment", {})
            if r.get("riskLevel") == "HIGH" or not r.get("automaticResolutionAllowed", True):
                out = {"decision": "ESCALATE_HUMAN", "reason": "High fraud risk — human review required.",
                       "automaticActionAllowed": False, "confidence": 0.93}
            elif t.get("refundExists"):
                out = {"decision": "NO_ACTION", "reason": "Refund already processed — duplicate refund blocked.",
                       "automaticActionAllowed": False, "confidence": 0.99}
            elif t.get("transactionStatus") == "PENDING":
                out = {"decision": "MONITOR", "reason": "Payment still pending — monitor settlement before acting.",
                       "automaticActionAllowed": False, "confidence": 0.9}
            elif (t.get("transactionStatus") == "FAILED" and t.get("debited")
                    and not t.get("merchantCredited") and r.get("automaticResolutionAllowed")):
                out = {"decision": "REFUND", "reason": "Payment failed after customer debit and merchant was not credited.",
                       "automaticActionAllowed": True, "confidence": 0.96}
            elif t.get("transactionStatus") == "SUCCESS":
                out = {"decision": "NO_ACTION", "reason": "Payment succeeded — no refund warranted.",
                       "automaticActionAllowed": False, "confidence": 0.95}
            else:
                out = {"decision": "ESCALATE_HUMAN", "reason": "Unsupported scenario — escalate for manual review.",
                       "automaticActionAllowed": False, "confidence": 0.7}
            out = LLMService.enhance(self.name, f"You are {self.ROLE}. Justify decision {out}", out)
            ctx["resolutionDecision"] = out
            return self._finish(db, case_id, ex, out, "BusinessRuleEngine")
        except Exception as e:
            return self._finish(db, case_id, ex, {}, "BusinessRuleEngine", "FAILED", str(e))


class CommunicationAgent(Agent):
    name = "communication"; task = "Notify customer in plain language"
    ROLE = "Customer Communication Specialist"

    def execute(self, db: Session, case_id: str, ctx: dict) -> dict:
        ex = self._start(db, case_id, ctx)
        try:
            phase = ctx.get("comm_phase", "pre-refund")
            t = ctx.get("transaction", {}); r_ = ctx.get("resolutionDecision", {})
            amt = t.get("amount", 0)
            if phase == "post-refund":
                msg = (f"Your ₹{amt:,.0f} refund has been successfully processed. Your case {case_id} is now resolved."
                       if ctx.get("refund", {}).get("status") == "SUCCESS"
                       else f"Update on case {case_id}: we attempted your ₹{amt:,.0f} refund but it needs human review. A specialist will contact you shortly.")
            elif r_.get("decision") == "ESCALATE_HUMAN":
                msg = (f"Thanks for reporting the ₹{amt:,.0f} payment issue. Our team flagged it for specialist review "
                       f"to keep your money safe. Case {case_id} — we'll update you shortly.")
            elif r_.get("decision") == "NO_ACTION" and t.get("refundExists"):
                msg = (f"Good news — your ₹{amt:,.0f} was already refunded. No further action needed on case {case_id}.")
            elif r_.get("decision") == "MONITOR":
                msg = (f"We've verified your ₹{amt:,.0f} payment is still pending with the bank. We're monitoring it and will update case {case_id} automatically.")
            else:
                msg = (f"We've verified that your ₹{amt:,.0f} payment failed after the amount was deducted. "
                       f"Your transaction is eligible for automatic resolution, and we're proceeding with the refund. (Case {case_id})")
            CustomerNotificationTool.run(case_id, msg)
            out = {"message": msg, "phase": phase}
            ctx["customerMessage"] = msg
            return self._finish(db, case_id, ex, out, CustomerNotificationTool.name)
        except Exception as e:
            return self._finish(db, case_id, ex, {}, CustomerNotificationTool.name, "FAILED", str(e))


class VerificationAgent(Agent):
    name = "verification"; task = "Safety-gate: verify refund preconditions"
    ROLE = "Workflow Verification Specialist"

    def execute(self, db: Session, case_id: str, ctx: dict) -> dict:
        ex = self._start(db, case_id, ctx)
        try:
            raw = ctx.get("_txn_raw", {}); risk = ctx.get("riskAssessment", {}); res = ctx.get("resolutionDecision", {})
            elig = RefundEligibilityTool.run(case_id, raw or ctx.get("transaction", {}), risk, settings.AUTO_REFUND_LIMIT)
            checks = dict(elig["checks"])
            checks["resolution_is_refund"] = res.get("decision") == "REFUND"
            checks["auto_action_allowed"] = bool(res.get("automaticActionAllowed"))
            passed = all(checks.values())
            out = {"verification": "PASSED" if passed else "FAILED", "checks": checks,
                   "message": "All refund preconditions satisfied." if passed else "Preconditions failed — refund blocked."}
            ctx["verification"] = out
            return self._finish(db, case_id, ex, out, RefundEligibilityTool.name)
        except Exception as e:
            return self._finish(db, case_id, ex, {}, RefundEligibilityTool.name, "FAILED", str(e))


class RefundAgent(Agent):
    name = "refund"; task = "Execute verified refund (idempotent)"
    ROLE = "Refund Execution Specialist — NEVER decides, only executes verified instructions"

    def execute(self, db: Session, case_id: str, ctx: dict) -> dict:
        ex = self._start(db, case_id, ctx)
        try:
            v = ctx.get("verification", {}); res = ctx.get("resolutionDecision", {})
            risk = ctx.get("riskAssessment", {}); t = ctx.get("transaction", {})
            checks = (v.get("checks") or {}) if isinstance(v, dict) else {}
            try:
                within_limit = float(t.get("amount", 0)) <= float(settings.AUTO_REFUND_LIMIT)
            except (TypeError, ValueError):
                within_limit = False
            allowed = (v.get("verification") == "PASSED" and res.get("decision") == "REFUND"
                       and res.get("automaticActionAllowed") is True
                       and risk.get("automaticResolutionAllowed") is True
                       and checks.get("no_existing_refund", True) is True
                       and checks.get("within_limit", within_limit) is True
                       and within_limit
                       and not t.get("refundExists"))
            if not allowed:
                HumanEscalationTool.run(db, case_id, "Refund attempted without verification — blocked by safety gate.")
                return self._finish(db, case_id, ex, {"blocked": True}, RefundExecutionTool.name, "FAILED",
                                    "Safety gate blocked refund")
            if not t.get("transactionId") or t.get("amount") is None:
                return self._finish(db, case_id, ex, {"blocked": True}, RefundExecutionTool.name, "FAILED",
                                    "Missing transaction context")
            desc = ctx.get("description", "").lower()
            force_fail = ("gateway fail" in desc or "refund fail" in desc) or ctx.get("transaction_id") == "TXN-DEMO-005"
            # retry loop (FAILED idempotent rows stay FAILED — do not spin forever)
            last = None
            for attempt in range(1, settings.MAX_REFUND_RETRIES + 1):
                last = RefundExecutionTool.run(db, case_id, t["transactionId"], t["amount"],
                                               "INR", force_fail=force_fail)
                if last["status"] == "SUCCESS" or last.get("idempotent_replay"):
                    break
                if last.get("failure_reason") in ("Transaction not found", "Amount mismatch"):
                    break
            out = {"refundId": last["refund_id"], "transactionId": t["transactionId"],
                   "amount": last["amount"], "status": last["status"],
                   "timestamp": __import__("datetime").datetime.utcnow().isoformat()}
            ctx["refund"] = out
            st = "COMPLETED" if out["status"] == "SUCCESS" else "FAILED"
            return self._finish(db, case_id, ex, out, RefundExecutionTool.name, st,
                                "" if st == "COMPLETED" else last.get("failure_reason", "gateway failure"))
        except Exception as e:
            return self._finish(db, case_id, ex, {}, RefundExecutionTool.name, "FAILED", str(e))


class EscalationAgent(Agent):
    name = "escalation"; task = "Escalate to human with full context"
    ROLE = "Human Escalation Specialist"

    def execute(self, db: Session, case_id: str, ctx: dict) -> dict:
        ex = self._start(db, case_id, ctx)
        try:
            reason = ctx.get("escalation_reason", "Autonomous workflow cannot safely complete.")
            rec = ctx.get("escalation_recommendation", "Manual review required")
            HumanEscalationTool.run(db, case_id, reason, rec)
            return self._finish(db, case_id, ex, {"escalated": True, "reason": reason})
        except Exception as e:
            return self._finish(db, case_id, ex, {}, "HumanEscalationTool", "FAILED", str(e))
