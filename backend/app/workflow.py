"""Workflow engine: creates case + runs orchestrator synchronously (SSE streams progress)."""
from datetime import datetime
from sqlalchemy.orm import Session
from . import models
from .agents.orchestrator import OrchestratorAgent
from .tools.payment_tools import CaseManagementTool

def _next_case_id(db: Session) -> str:
    """DB-derived sequence — safe across server restarts (no in-memory counter)."""
    max_n = 10000
    for (cid,) in db.query(models.SupportCase.case_id).all():
        try:
            n = int(str(cid).split("-")[1])
            max_n = max(max_n, n)
        except (IndexError, ValueError):
            continue
    return f"CASE-{max_n + 1}"


def _resolve_txn(db: Session, transaction_id, amount, description) -> str:
    if transaction_id:
        t = db.query(models.Transaction).filter_by(transaction_id=transaction_id).first()
        if t:
            return t.transaction_id
    # keyword-based demo routing
    d = (description or "").lower()
    if "50000" in d or "50,000" in d or "high risk" in d:
        return "TXN-DEMO-002"
    if "pending" in d:
        return "TXN-DEMO-003"
    if "already" in d:
        return "TXN-DEMO-004"
    if "fail" in d and ("refund fail" in d or "gateway fail" in d):
        return "TXN-DEMO-005"
    if amount and float(amount) >= 50000:
        return "TXN-DEMO-002"
    return "TXN-DEMO-001"


def create_and_run(db: Session, customer_name: str, customer_email: str,
                   description: str, transaction_id=None, amount=None) -> models.SupportCase:
    user = db.query(models.User).filter_by(email=customer_email).first()
    if not user:
        user = models.User(name=customer_name, email=customer_email)
        db.add(user); db.commit(); db.refresh(user)
    txn_id = _resolve_txn(db, transaction_id, amount, description)
    case_id = _next_case_id(db)
    case = models.SupportCase(case_id=case_id, user_id=user.id, transaction_id=txn_id,
                              description=description, status="CREATED")
    db.add(case); db.commit(); db.refresh(case)
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
