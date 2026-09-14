"""Seed data: 5 demo scenarios + demo user (idempotent upsert)."""
from sqlalchemy.orm import Session
from . import models


def seed(db: Session):
    u = db.query(models.User).filter_by(email="demo@example.com").first()
    if not u:
        u = models.User(name="Demo Customer", email="demo@example.com", phone="+91-98XXXXXX01")
        db.add(u); db.commit(); db.refresh(u)
    txns = [
        # Scenario 1 — auto refund success
        dict(transaction_id="TXN-DEMO-001", user_id=u.id, amount=2000, status="FAILED",
             debited=True, merchant_credited=False, settlement_status="NOT_SETTLED"),
        # Scenario 2 — high risk (₹50k)
        dict(transaction_id="TXN-DEMO-002", user_id=u.id, amount=50000, status="FAILED",
             debited=True, merchant_credited=False, settlement_status="NOT_SETTLED"),
        # Scenario 3 — pending
        dict(transaction_id="TXN-DEMO-003", user_id=u.id, amount=3500, status="PENDING",
             debited=True, merchant_credited=False, settlement_status="PENDING"),
        # Scenario 4 — already refunded
        dict(transaction_id="TXN-DEMO-004", user_id=u.id, amount=2000, status="FAILED",
             debited=True, merchant_credited=False, settlement_status="NOT_SETTLED"),
        # Scenario 5 — refund failure (gateway forced fail via description flag)
        dict(transaction_id="TXN-DEMO-005", user_id=u.id, amount=2000, status="FAILED",
             debited=True, merchant_credited=False, settlement_status="NOT_SETTLED"),
        # Generic TXN10001 alias of scenario 1
        dict(transaction_id="TXN10001", user_id=u.id, amount=2000, status="FAILED",
             debited=True, merchant_credited=False, settlement_status="NOT_SETTLED"),
    ]
    for t in txns:
        existing = db.query(models.Transaction).filter_by(transaction_id=t["transaction_id"]).first()
        if existing:
            existing.user_id = t["user_id"]; existing.amount = t["amount"]
            existing.status = t["status"]; existing.debited = t["debited"]
            existing.merchant_credited = t["merchant_credited"]
            existing.settlement_status = t["settlement_status"]
        else:
            db.add(models.Transaction(transaction_id=t["transaction_id"], user_id=t["user_id"],
                                      amount=t["amount"], status=t["status"], debited=t["debited"],
                                      merchant_credited=t["merchant_credited"],
                                      settlement_status=t["settlement_status"]))
    db.commit()
    # Pre-existing successful refund for scenario 4 (txn-scoped idempotency key)
    if not db.query(models.Refund).filter_by(transaction_id="TXN-DEMO-004", status="SUCCESS").first():
        if not db.query(models.Refund).filter_by(idempotency_key="TXN-DEMO-004-REFUND").first():
            db.add(models.Refund(refund_id="REF40001", transaction_id="TXN-DEMO-004",
                                 case_id="CASE-SEED", amount=2000, status="SUCCESS",
                                 idempotency_key="TXN-DEMO-004-REFUND"))
            db.commit()
