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
        refunds = db.query(models.Refund).filter_by(transaction_id=txn.get("transaction_id")).count()
        if refunds >= 1:
            score += 30; reasons.append("Prior refund attempt detected")
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
        checks = {
            "failed": txn.get("status", txn.get("transactionStatus")) == "FAILED",
            "debited": bool(txn.get("debited")),
            "merchant_not_credited": not bool(txn.get("merchant_credited", txn.get("merchantCredited", False))),
            "low_or_medium_risk": bool(auto_ok),
            "no_existing_refund": no_refund,
            "within_limit": float(txn.get("amount", 0)) <= float(limit),
        }
        eligible = all(checks.values())
        return {"eligible": eligible, "checks": checks}


class RefundExecutionTool:
    """Idempotent refund executor over the mock gateway state (refunds table)."""
    name = "RefundExecutionTool"

    @staticmethod
    def run(db: Session, case_id: str, transaction_id: str, amount: float,
            currency: str = "INR", force_fail: bool = False) -> dict:
        key = f"{case_id}-{transaction_id}-REFUND"
        _log(case_id, "refund", RefundExecutionTool.name, f"Initiating refund (key={key})")
        existing = db.query(models.Refund).filter_by(idempotency_key=key).first()
        if existing:
            _log(case_id, "refund", RefundExecutionTool.name, "Idempotent replay — returning existing refund")
            return {"refund_id": existing.refund_id, "status": existing.status,
                    "amount": existing.amount, "idempotent_replay": True}
        import random
        rid = f"REF{abs(hash(key)) % 90000 + 10000}"
        status = "FAILED" if force_fail else "SUCCESS"
        r = models.Refund(refund_id=rid, transaction_id=transaction_id, case_id=case_id,
                          amount=amount, currency=currency, status=status,
                          failure_reason="Simulated gateway failure" if force_fail else "",
                          idempotency_key=key,
                          completed_at=datetime.utcnow() if status == "SUCCESS" else None)
        db.add(r); db.commit()
        return {"refund_id": rid, "status": status, "amount": amount, "idempotent_replay": False,
                "failure_reason": r.failure_reason}


class RefundStatusTool:
    name = "RefundStatusTool"

    @staticmethod
    def run(db: Session, case_id: str, refund_id: str) -> dict:
        _log(case_id, "verification", RefundStatusTool.name, f"Checking refund {refund_id}")
        r = db.query(models.Refund).filter_by(refund_id=refund_id).first()
        if not r:
            return {"found": False}
        return {"found": True, "refund_id": r.refund_id, "status": r.status, "amount": r.amount}


class CustomerNotificationTool:
    name = "CustomerNotificationTool"

    @staticmethod
    def run(case_id: str, message: str) -> dict:
        _log(case_id, "communication", CustomerNotificationTool.name, message)
        return {"notified": True, "message": message}


class CaseManagementTool:
    name = "CaseManagementTool"

    @staticmethod
    def set_status(db: Session, case_id: str, status: str):
        from ..enums import can_transition
        case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
        if not case:
            return
        if can_transition(case.status, status):
            case.status = status
            db.commit()
        publish(case_id, {"event_type": "status_changed", "agent_name": "orchestrator",
                          "message": f"Case status → {status}", "metadata": {"status": status}})

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
        case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
        if case:
            case.status = CaseStatus.ESCALATED.value
            db.commit()
        CaseManagementTool.add_event(db, case_id, "escalated", "escalation",
                                     f"⚠ Human escalation: {reason}",
                                     {"reason": reason, "recommended_action": recommended_action})
        return {"escalated": True, "reason": reason}
