"""Workflow engine: creates case + runs orchestrator synchronously (SSE streams progress)."""
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from . import models
from .agents.orchestrator import OrchestratorAgent
from .tools.payment_tools import CaseManagementTool


class UnknownTransactionError(ValueError):
    pass


def _next_case_id(db: Session) -> str:
    """Atomic-ish sequence: derive from autoincrement PK max, not a full table scan parse."""
    max_id = db.query(func.max(models.SupportCase.id)).scalar() or 0
    return f"CASE-{10000 + max_id + 1}"


def _resolve_txn(db: Session, transaction_id, amount, description) -> str:
    if transaction_id:
        t = db.query(models.Transaction).filter_by(transaction_id=transaction_id).first()
        if t:
            return t.transaction_id
        raise UnknownTransactionError(f"Transaction {transaction_id} not found")
    # keyword-based demo routing (only when no explicit id given)
    d = (description or "").lower()
    if "50000" in d or "50,000" in d or "high risk" in d:
        return "TXN-DEMO-002"
    if "pending" in d:
        return "TXN-DEMO-003"
    if "already" in d:
        return "TXN-DEMO-004"
    if "fail" in d and ("refund fail" in d or "gateway fail" in d):
        return "TXN-DEMO-005"
    try:
        if amount is not None and float(amount) >= 50000:
            return "TXN-DEMO-002"
    except (TypeError, ValueError):
        pass
    return "TXN-DEMO-001"


def create_and_run(db: Session, customer_name: str, customer_email: str,
                   description: str, transaction_id=None, amount=None) -> models.SupportCase:
    user = db.query(models.User).filter_by(email=customer_email).first()
    if not user:
        user = models.User(name=customer_name, email=customer_email)
        db.add(user); db.commit(); db.refresh(user)
    txn_id = _resolve_txn(db, transaction_id, amount, description)
    # Retry on rare case_id collision (concurrent creators)
    case = None
    case_id = ""
    for _ in range(3):
        case_id = _next_case_id(db)
        case = models.SupportCase(case_id=case_id, user_id=user.id, transaction_id=txn_id,
                                  description=description, status="CREATED")
        db.add(case)
        try:
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            case = None
            continue
    if case is None:
        raise RuntimeError("Could not allocate case id")
    db.refresh(case)
    case_id = case.case_id
    CaseManagementTool.add_event(db, case_id, "case_created", "orchestrator",
                                 f"Case {case_id} created for: {description[:120]}",
                                 {"transaction_id": txn_id})
    ctx = {"case_id": case_id, "transaction_id": txn_id, "description": description,
           "customer": {"name": customer_name, "email": customer_email}}
    OrchestratorAgent().execute(db, case_id, ctx)
    _persist_snapshots(db, case_id, txn_id, ctx)
    db.refresh(case)
    return case


def _persist_snapshots(db: Session, case_id: str, txn_id: str, ctx: dict):
    import json as _j
    r = ctx.get("riskAssessment")
    if r:
        db.add(models.RiskAssessment(case_id=case_id, transaction_id=txn_id,
                                     risk_score=r.get("riskScore", 0), risk_level=r.get("riskLevel", "LOW"),
                                     automatic_resolution_allowed=r.get("automaticResolutionAllowed", True),
                                     reasons=_j.dumps(r.get("reasons", []))))
    d = ctx.get("resolutionDecision")
    if d:
        db.add(models.ResolutionDecision(case_id=case_id, decision=d.get("decision", ""),
                                         reason=d.get("reason", ""), confidence=d.get("confidence", 0),
                                         automatic_action_allowed=d.get("automaticActionAllowed", False)))
    db.commit()
