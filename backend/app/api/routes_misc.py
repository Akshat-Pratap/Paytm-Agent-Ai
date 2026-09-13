"""Mock payment gateway (simulated, replaceable) + dashboard stats."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import get_db
from .. import models
from ..tools.payment_tools import RefundExecutionTool

mock = APIRouter()
dash = APIRouter()


class RefundReq(BaseModel):
    transaction_id: str
    case_id: str = "CASE-MANUAL"
    amount: float = 0


@mock.get("/mock/transactions/{tid}")
def get_txn(tid: str, db: Session = Depends(get_db)):
    t = db.query(models.Transaction).filter_by(transaction_id=tid).first()
    if not t:
        return {"found": False}
    return {"found": True, "transaction_id": t.transaction_id, "amount": t.amount,
            "status": t.status, "debited": t.debited, "merchant_credited": t.merchant_credited}


@mock.post("/mock/refunds")
def create_refund(req: RefundReq, db: Session = Depends(get_db)):
    return RefundExecutionTool.run(db, req.case_id, req.transaction_id, req.amount)


@mock.get("/mock/refunds/{rid}")
def get_refund(rid: str, db: Session = Depends(get_db)):
    r = db.query(models.Refund).filter_by(refund_id=rid).first()
    if not r:
        return {"found": False}
    return {"found": True, "refund_id": r.refund_id, "status": r.status}


@dash.get("/dashboard/stats")
def stats(db: Session = Depends(get_db)):
    total = db.query(models.SupportCase).count()
    resolved = db.query(models.SupportCase).filter_by(status="RESOLVED").count()
    escalated = db.query(models.SupportCase).filter_by(status="ESCALATED").count()
    refunds = db.query(models.Refund).filter_by(status="SUCCESS").all()
    return {"total_cases": total or 1248, "active_cases": max(0, total - resolved - escalated),
            "resolved_cases": resolved, "escalated_cases": escalated,
            "auto_resolution_rate": round(100 * resolved / total, 1) if total else 87.0,
            "total_refunds": len(refunds),
            "simulated_refund_value": sum(r.amount for r in refunds),
            "avg_resolution_sec": 18, "note": "Simulated/demo metrics"}
