"""Seed data: demo scenarios + 2 permanent users with histories (idempotent upsert)."""
from datetime import datetime
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from . import models

_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _ensure_user(db: Session, phone: str, name: str, password: str, email=None):
    u = db.query(models.User).filter_by(phone=phone).first()
    h = _pwd.hash(password)
    if not u:
        u = models.User(name=name, email=email, phone=phone, password_hash=h, role="customer")
        db.add(u); db.commit(); db.refresh(u)
    else:
        u.name = name; u.password_hash = h; u.role = "customer"
        if email:
            u.email = email
        db.commit(); db.refresh(u)
    return u


def _ensure_txn(db: Session, **t):
    existing = db.query(models.Transaction).filter_by(transaction_id=t["transaction_id"]).first()
    if existing:
        for k in ("user_id", "amount", "status", "debited", "merchant_credited",
                  "settlement_status", "merchant_name", "utr_number", "created_at",
                  "payment_method", "sender_masked"):
            if k in t and t[k] is not None:
                setattr(existing, k, t[k])
    else:
        db.add(models.Transaction(**t))


def seed(db: Session):
    u = db.query(models.User).filter_by(email="demo@example.com").first()
    if not u:
        u = models.User(name="Demo Customer", email="demo@example.com", phone="98XXXXXX01", role="customer")
        db.add(u); db.commit(); db.refresh(u)
    txns = [
        dict(transaction_id="TXN-DEMO-001", user_id=u.id, amount=2000, status="FAILED",
             debited=True, merchant_credited=False, settlement_status="NOT_SETTLED"),
        dict(transaction_id="TXN-DEMO-002", user_id=u.id, amount=50000, status="FAILED",
             debited=True, merchant_credited=False, settlement_status="NOT_SETTLED"),
        dict(transaction_id="TXN-DEMO-003", user_id=u.id, amount=3500, status="PENDING",
             debited=True, merchant_credited=False, settlement_status="PENDING"),
        dict(transaction_id="TXN-DEMO-004", user_id=u.id, amount=2000, status="FAILED",
             debited=True, merchant_credited=False, settlement_status="NOT_SETTLED"),
        dict(transaction_id="TXN-DEMO-005", user_id=u.id, amount=2000, status="FAILED",
             debited=True, merchant_credited=False, settlement_status="NOT_SETTLED"),
        dict(transaction_id="TXN10001", user_id=u.id, amount=2000, status="FAILED",
             debited=True, merchant_credited=False, settlement_status="NOT_SETTLED"),
    ]
    for t in txns:
        _ensure_txn(db, **t)
    db.commit()
    if not db.query(models.Refund).filter_by(transaction_id="TXN-DEMO-004", status="SUCCESS").first():
        if not db.query(models.Refund).filter_by(idempotency_key="TXN-DEMO-004-REFUND").first():
            db.add(models.Refund(refund_id="REF40001", transaction_id="TXN-DEMO-004",
                                 case_id="CASE-SEED", amount=2000, status="SUCCESS",
                                 idempotency_key="TXN-DEMO-004-REFUND"))
            db.commit()

    # Permanent User 1 — Rohan Sharma, auto-refund path (debited, merchant not credited)
    rohan = _ensure_user(db, "9123456789", "Rohan Sharma", "123456")
    rohan_txns = [
        ("TXN-ROHAN-01", "Amazon Groceries", 1249, "SUCCESS", True, True, "SETTLED", "UTR202609010001", datetime(2026, 9, 1, 10, 15)),
        ("TXN-ROHAN-02", "Zepto", 649, "SUCCESS", True, True, "SETTLED", "UTR202609030002", datetime(2026, 9, 3, 18, 40)),
        ("TXN-ROHAN-03", "Blinkit", 899, "SUCCESS", True, True, "SETTLED", "UTR202609050003", datetime(2026, 9, 5, 12, 5)),
        ("TXN-ROHAN-04", "Flipkart", 4999, "SUCCESS", True, True, "SETTLED", "UTR202609070004", datetime(2026, 9, 7, 15, 30)),
        ("TXN-ROHAN-05", "Dev Confectionaries", 350, "SUCCESS", True, True, "SETTLED", "UTR202609070005", datetime(2026, 9, 7, 19, 20)),
        ("TXN-ROHAN-06", "Swiggy", 720, "SUCCESS", True, True, "SETTLED", "UTR202609100006", datetime(2026, 9, 10, 13, 45)),
        ("TXN-ROHAN-07", "IRCTC", 1850, "SUCCESS", True, True, "SETTLED", "UTR202609120007", datetime(2026, 9, 12, 9, 10)),
        ("TXN-ROHAN-08", "Dev Confectionaries", 890, "FAILED", True, False, "NOT_SETTLED", "UTR202609140008", datetime(2026, 9, 14, 11, 25)),
    ]
    for tid, merch, amt, st, deb, cred, sett, utr, dt in rohan_txns:
        _ensure_txn(db, transaction_id=tid, user_id=rohan.id, amount=amt, status=st,
                    debited=deb, merchant_credited=cred, settlement_status=sett,
                    merchant_name=merch, utr_number=utr, created_at=dt,
                    payment_method="UPI", sender_masked="XXXX-XXXX-6789")
    db.commit()

    # Permanent User 2 — Abhishek Singh, technical-failure escalate path (no debit)
    abhi = _ensure_user(db, "9987654321", "Abhishek Singh", "123456")
    abhi_txns = [
        ("TXN-ABHI-01", "BigBasket", 2100, "SUCCESS", True, True, "SETTLED", "UTR202609020101", datetime(2026, 9, 2, 11, 0)),
        ("TXN-ABHI-02", "Zomato", 540, "SUCCESS", True, True, "SETTLED", "UTR202609040102", datetime(2026, 9, 4, 20, 15)),
        ("TXN-ABHI-03", "Myntra", 3299, "SUCCESS", True, True, "SETTLED", "UTR202609060103", datetime(2026, 9, 6, 14, 50)),
        ("TXN-ABHI-04", "DMart", 1120, "SUCCESS", True, True, "SETTLED", "UTR202609080104", datetime(2026, 9, 8, 17, 5)),
        ("TXN-ABHI-05", "Chai Point", 220, "SUCCESS", True, True, "SETTLED", "UTR202609090105", datetime(2026, 9, 9, 10, 30)),
        ("TXN-ABHI-06", "Uber", 410, "SUCCESS", True, True, "SETTLED", "UTR202609110106", datetime(2026, 9, 11, 8, 45)),
        ("TXN-ABHI-07", "BookMyShow", 999, "SUCCESS", True, True, "SETTLED", "UTR202609130107", datetime(2026, 9, 13, 21, 20)),
        ("TXN-ABHI-08", "Croma Electronics", 2450, "FAILED", False, False, "FAILED", "UTR202609140108", datetime(2026, 9, 14, 16, 40)),
    ]
    for tid, merch, amt, st, deb, cred, sett, utr, dt in abhi_txns:
        _ensure_txn(db, transaction_id=tid, user_id=abhi.id, amount=amt, status=st,
                    debited=deb, merchant_credited=cred, settlement_status=sett,
                    merchant_name=merch, utr_number=utr, created_at=dt,
                    payment_method="UPI", sender_masked="XXXX-XXXX-4321")
    db.commit()
