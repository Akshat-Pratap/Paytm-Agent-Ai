"""Tools: agents use these instead of touching the DB directly.
Each tool logs its invocation via the event bus."""
import json
from datetime import datetime
from sqlalchemy.orm import Session
from .. import models
from ..eventbus import publish


def _log(case_id, agent, tool, message, meta=None):
    publish(case_id, {"event_type": "tool_invoked", "agent_name": agent,
                      "tool": tool, "message": message, "metadata": meta or {}})


class TransactionLookupTool:
    name = "TransactionLookupTool"

    @staticmethod
    def run(db: Session, case_id: str, transaction_id: str) -> dict:
        _log(case_id, "transaction", TransactionLookupTool.name, f"Looking up {transaction_id}")
        txn = db.query(models.Transaction).filter_by(transaction_id=transaction_id).first()
        if not txn:
            return {"found": False}
        refund = db.query(models.Refund).filter_by(transaction_id=txn.transaction_id,
                                                   status="SUCCESS").first()
        return {"found": True, "transaction_id": txn.transaction_id, "amount": txn.amount,
                "currency": txn.currency, "payment_method": txn.payment_method,
                "merchant": txn.merchant_name, "merchant_id": txn.merchant_id,
                "status": txn.status, "debited": txn.debited,
                "merchant_credited": txn.merchant_credited,
                "settlement_status": txn.settlement_status,
                "sender_masked": txn.sender_masked,
                "user_id": txn.user_id,
                "created_at": txn.created_at.isoformat() if txn.created_at else "",
                "refundExists": bool(refund),
                "refund_id": refund.refund_id if refund else None}


class TransactionHistoryTool:
    name = "TransactionHistoryTool"

    @staticmethod
    def run(db: Session, case_id: str, user_id: int, limit: int = 10) -> dict:
        _log(case_id, "risk", TransactionHistoryTool.name, "Fetching user history")
        txns = db.query(models.Transaction).filter_by(user_id=user_id).order_by(
            models.Transaction.id.desc()).limit(limit).all()
        return {"count": len(txns),
                "transactions": [{"id": t.transaction_id, "amount": t.amount, "status": t.status} for t in txns]}


class RiskAnalysisTool:
    """Deterministic risk scoring (LLM may add narrative, never the score)."""
    name = "RiskAnalysisTool"

    @staticmethod
    def run(db: Session, case_id: str, txn: dict, history: dict) -> dict:
        _log(case_id, "risk", RiskAnalysisTool.name, "Scoring transaction risk")
        score = 5
        reasons = []
        amt = txn.get("amount", 0)
        if amt >= 50000:
            score += 55; reasons.append("Unusually large amount (>= ₹50,000)")
        elif amt >= 20000:
            score += 25; reasons.append("Large amount (>= ₹20,000)")
        else:
            reasons.append("Normal transaction amount")
        refunds = db.query(models.Refund).filter_by(
            transaction_id=txn.get("transaction_id"), status="SUCCESS").count()
        if refunds >= 1:
            score += 30; reasons.append("Prior successful refund detected — duplicate must be blocked")
        recent_failed = [t for t in history.get("transactions", []) if t.get("status") == "FAILED"]
        if len(recent_failed) >= 3:
            score += 25; reasons.append("Multiple recent failed transactions")
        else:
            reasons.append("No suspicious velocity detected")
        if txn.get("status") == "PENDING":
            score += 10; reasons.append("Transaction still pending — outcome uncertain")
        if not reasons or score <= 20:
            reasons.append("No suspicious activity detected")
        score = max(0, min(100, score))
        level = "LOW" if score <= 30 else ("MEDIUM" if score <= 70 else "HIGH")
        return {"risk_score": score, "risk_level": level,
                "automatic_resolution_allowed": level != "HIGH",
                "reasons": reasons}


class RefundEligibilityTool:
    name = "RefundEligibilityTool"

    @staticmethod
    def run(case_id: str, txn: dict, risk: dict, limit: float) -> dict:
        _log(case_id, "verification", RefundEligibilityTool.name, "Checking refund eligibility")
        auto_ok = risk.get("automatic_resolution_allowed", risk.get("automaticResolutionAllowed", False))
        no_refund = not bool(txn.get("refundExists", txn.get("refund_exists", False)))
        try:
            within_limit = float(txn.get("amount", 0)) <= float(limit)
        except (TypeError, ValueError):
            within_limit = False
        checks = {
            "failed": txn.get("status", txn.get("transactionStatus")) == "FAILED",
            "debited": bool(txn.get("debited")),
            "merchant_not_credited": not bool(txn.get("merchant_credited", txn.get("merchantCredited", False))),
            "low_or_medium_risk": bool(auto_ok),
            "no_existing_refund": no_refund,
            "within_limit": within_limit,
        }
        eligible = all(checks.values())
        return {"eligible": eligible, "checks": checks}


class RefundExecutionTool:
    """Idempotent refund executor over the mock gateway state (refunds table)."""
    name = "RefundExecutionTool"

    @staticmethod
    def _key(transaction_id: str) -> str:
        # Transaction-scoped idempotency: one live refund per transaction.
        return f"{transaction_id}-REFUND"

    @staticmethod
    def run(db: Session, case_id: str, transaction_id: str, amount: float,
            currency: str = "INR", force_fail: bool = False) -> dict:
        from sqlalchemy.exc import IntegrityError
        import secrets
        key = RefundExecutionTool._key(transaction_id)
        _log(case_id, "refund", RefundExecutionTool.name, f"Initiating refund (key={key})")
        # Validate txn exists and amount matches (blocks gateway double-spend)
        txn = db.query(models.Transaction).filter_by(transaction_id=transaction_id).first()
        if not txn:
            return {"refund_id": "", "status": "FAILED", "amount": amount,
                    "idempotent_replay": False, "failure_reason": "Transaction not found"}
        if float(amount or 0) != float(txn.amount or 0):
            return {"refund_id": "", "status": "FAILED", "amount": amount,
                    "idempotent_replay": False, "failure_reason": "Amount mismatch"}
        existing = db.query(models.Refund).filter_by(idempotency_key=key).first()
        if existing:
            # FAILED rows must not be replayed as success — caller retries via new attempt,
            # but key is stable so a FAILED row stays FAILED (no duplicate charge).
            _log(case_id, "refund", RefundExecutionTool.name, "Idempotent replay — returning existing refund")
            return {"refund_id": existing.refund_id, "status": existing.status,
                    "amount": existing.amount, "idempotent_replay": True,
                    "failure_reason": existing.failure_reason}
        # Block duplicate SUCCESS refund for same txn even across cases
        dup = db.query(models.Refund).filter_by(transaction_id=transaction_id, status="SUCCESS").first()
        if dup:
            return {"refund_id": dup.refund_id, "status": dup.status,
                    "amount": dup.amount, "idempotent_replay": True,
                    "failure_reason": ""}
        rid = f"REF{secrets.randbelow(90000) + 10000}{secrets.randbelow(10)}"
        status = "FAILED" if force_fail else "SUCCESS"
        r = models.Refund(refund_id=rid, transaction_id=transaction_id, case_id=case_id,
                          amount=txn.amount, currency=currency, status=status,
                          failure_reason="Simulated gateway failure" if force_fail else "",
                          idempotency_key=key,
                          completed_at=datetime.utcnow() if status == "SUCCESS" else None)
        db.add(r)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            existing = db.query(models.Refund).filter_by(idempotency_key=key).first()
            if existing:
                return {"refund_id": existing.refund_id, "status": existing.status,
                        "amount": existing.amount, "idempotent_replay": True,
                        "failure_reason": existing.failure_reason}
            raise
        return {"refund_id": rid, "status": status, "amount": txn.amount, "idempotent_replay": False,
                "failure_reason": r.failure_reason}


class RefundStatusTool:
    name = "RefundStatusTool"

    @staticmethod
    def run(db: Session, case_id: str, refund_id: str) -> dict:
        _log(case_id, "verification", RefundStatusTool.name, f"Checking refund {refund_id}")
        r = db.query(models.Refund).filter_by(refund_id=refund_id).first()
        if not r:
            return {"found": False}
        txn = db.query(models.Transaction).filter_by(transaction_id=r.transaction_id).first()
        return {"found": True, "refund_id": r.refund_id, "status": r.status,
                "amount": r.amount, "transaction_id": r.transaction_id,
                "amount_matches": bool(txn) and float(txn.amount or 0) == float(r.amount or 0)}


class CustomerNotificationTool:
    name = "CustomerNotificationTool"

    @staticmethod
    def run(case_id: str, message: str) -> dict:
        _log(case_id, "communication", CustomerNotificationTool.name, message)
        return {"notified": True, "message": message}


class CaseManagementTool:
    name = "CaseManagementTool"

    @staticmethod
    def set_status(db: Session, case_id: str, status: str) -> bool:
        from ..enums import can_transition
        case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
        if not case:
            return False
        if can_transition(case.status, status):
            case.status = status
            db.commit()
            publish(case_id, {"event_type": "status_changed", "agent_name": "orchestrator",
                              "message": f"Case status → {status}", "metadata": {"status": status}})
            return True
        # Illegal transitions are now visible instead of silently dropped
        publish(case_id, {"event_type": "invalid_transition_blocked", "agent_name": "orchestrator",
                          "message": f"Blocked illegal transition {case.status} → {status}",
                          "metadata": {"from": case.status, "to": status}})
        CaseManagementTool.add_event(db, case_id, "invalid_transition_blocked", "orchestrator",
                                     f"Blocked illegal transition {case.status} → {status}",
                                     {"from": case.status, "to": status})
        return False

    @staticmethod
    def add_event(db: Session, case_id: str, event_type: str, agent: str, message: str, meta=None):
        import json as _j
        db.add(models.CaseEvent(case_id=case_id, event_type=event_type, agent_name=agent,
                                message=message, metadata_json=_j.dumps(meta or {})))
        db.commit()
        publish(case_id, {"event_type": event_type, "agent_name": agent,
                          "message": message, "metadata": meta or {}})


class HumanEscalationTool:
    name = "HumanEscalationTool"

    @staticmethod
    def run(db: Session, case_id: str, reason: str, recommended_action: str = "Manual review required",
            priority: str = "HIGH") -> dict:
        from ..enums import CaseStatus
        _log(case_id, "escalation", HumanEscalationTool.name, f"Escalating: {reason}")
        db.add(models.Escalation(case_id=case_id, reason=reason, priority=priority,
                                 status="OPEN", recommended_action=recommended_action))
        db.commit()
        # Enforce state machine — direct writes bypassed can_transition before
        ok = CaseManagementTool.set_status(db, case_id, CaseStatus.ESCALATED.value)
        if not ok:
            case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
            if case and case.status != CaseStatus.ESCALATED.value:
                # Force-escalate only from terminal-incompatible states via explicit event
                CaseManagementTool.add_event(db, case_id, "escalation_forced", "escalation",
                                             f"Escalation forced from {case.status}")
        CaseManagementTool.add_event(db, case_id, "escalated", "escalation",
                                     f"⚠ Human escalation: {reason}",
                                     {"reason": reason, "recommended_action": recommended_action})
        return {"escalated": True, "reason": reason}
