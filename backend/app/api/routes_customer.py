"""Customer self-service: total tickets, profile, notifications (JWT phone auth)."""
import re
import jwt
from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from ..database import get_db
from .. import models
from ..config import settings

router = APIRouter()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _customer_from_auth(authorization: str = Header(default=None)):
    tok = (authorization or "").strip()
    if tok.lower().startswith("bearer "):
        tok = tok[7:].strip()
    if not tok:
        return None
    try:
        p = jwt.decode(tok, settings.JWT_SECRET, algorithms=["HS256"])
        if str(p.get("role", "")).lower() != "customer":
            return None
        return p
    except Exception:
        return None

def _get_customer_user(db: Session, payload):
    cid = payload.get("sub")
    try:
        uid = int(cid)
    except Exception:
        return None
    return db.query(models.User).filter_by(id=uid).first()

@router.get("/customer/cases")
def customer_cases(db: Session = Depends(get_db), authorization: str = Header(default=None)):
    payload = _customer_from_auth(authorization)
    if not payload:
        return JSONResponse({"error": "unauthenticated"}, status_code=401)
    u = _get_customer_user(db, payload)
    if not u:
        return JSONResponse({"error": "user not found"}, status_code=404)
    rows = db.query(models.SupportCase).filter_by(user_id=u.id).order_by(models.SupportCase.id.desc()).all()
    return [{"case_id": c.case_id, "status": c.status, "transaction_id": c.transaction_id, "created_at": c.created_at.isoformat() if c.created_at else None} for c in rows]

@router.get("/customer/profile")
def get_profile(db: Session = Depends(get_db), authorization: str = Header(default=None)):
    payload = _customer_from_auth(authorization)
    if not payload:
        return JSONResponse({"error": "unauthenticated"}, status_code=401)
    u = _get_customer_user(db, payload)
    if not u:
        return JSONResponse({"error": "user not found"}, status_code=404)
    return {"id": u.id, "name": u.name, "phone": u.phone, "email": u.email}

@router.put("/customer/profile")
def update_profile(payload: dict, db: Session = Depends(get_db), authorization: str = Header(default=None)):
    auth = _customer_from_auth(authorization)
    if not auth:
        return JSONResponse({"error": "unauthenticated"}, status_code=401)
    u = _get_customer_user(db, auth)
    if not u:
        return JSONResponse({"error": "user not found"}, status_code=404)
    name = (payload.get("name") or "").strip()
    phone = re.sub(r"[\s\-()]", "", str(payload.get("phone") or "").strip())
    if phone.startswith("+91"):
        phone = phone[3:]
    elif phone.startswith("91") and len(phone) == 12:
        phone = phone[2:]
    if name and len(name) < 2:
        return JSONResponse({"error": "name min 2 chars"}, status_code=400)
    if phone and not re.match(r"^[6-9]\d{9}$", phone):
        return JSONResponse({"error": "phone must be 10 digits starting 6-9"}, status_code=400)
    if phone and phone != u.phone:
        if db.query(models.User).filter_by(phone=phone).first():
            return JSONResponse({"error": "phone already registered"}, status_code=409)
        u.phone = phone
    if name:
        u.name = name
    pw = payload.get("password")
    if pw:
        if len(str(pw)) < 6:
            return JSONResponse({"error": "password min 6 chars"}, status_code=400)
        u.password_hash = pwd.hash(str(pw))
    db.commit(); db.refresh(u)
    # re-issue token with new claims
    import jwt as _jwt
    from datetime import datetime, timedelta, timezone
    exp = datetime.now(timezone.utc) + timedelta(hours=settings.JWT_EXPIRE_HOURS)
    tok = _jwt.encode({"sub": str(u.id), "phone": u.phone, "role": "customer", "name": u.name, "exp": exp}, settings.JWT_SECRET, algorithm="HS256")
    return {"token": tok, "user": {"id": u.id, "name": u.name, "phone": u.phone}}

@router.get("/customer/notifications")
def notifications(db: Session = Depends(get_db), authorization: str = Header(default=None)):
    payload = _customer_from_auth(authorization)
    if not payload:
        return JSONResponse({"error": "unauthenticated"}, status_code=401)
    u = _get_customer_user(db, payload)
    if not u:
        return JSONResponse({"error": "user not found"}, status_code=404)
    cases = db.query(models.SupportCase).filter_by(user_id=u.id).order_by(models.SupportCase.id.desc()).limit(20).all()
    cids = [c.case_id for c in cases]
    if not cids:
        return []
    evs = db.query(models.CaseEvent).filter(models.CaseEvent.case_id.in_(cids)).order_by(models.CaseEvent.created_at.desc()).limit(50).all()
    return [{"case_id": e.case_id, "event_type": e.event_type, "message": e.message, "created_at": e.created_at.isoformat() if e.created_at else None} for e in evs]


def _txn_dict(t: models.Transaction):
    r = None
    try:
        r = t._refund_cache
    except AttributeError:
        r = None
    return {"transaction_id": t.transaction_id, "merchant": t.merchant_name,
            "amount": t.amount, "currency": t.currency, "status": t.status,
            "debited": t.debited, "merchant_credited": t.merchant_credited,
            "settlement_status": t.settlement_status, "utr_number": t.utr_number,
            "payment_method": t.payment_method,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "refund_status": r.status if r else "NONE", "refund_id": r.refund_id if r else None}


@router.get("/customer/transactions")
def customer_transactions(db: Session = Depends(get_db), authorization: str = Header(default=None)):
    payload = _customer_from_auth(authorization)
    if not payload:
        return JSONResponse({"error": "unauthenticated"}, status_code=401)
    u = _get_customer_user(db, payload)
    if not u:
        return JSONResponse({"error": "user not found"}, status_code=404)
    txns = db.query(models.Transaction).filter_by(user_id=u.id).order_by(models.Transaction.created_at.desc()).all()
    out = []
    for t in txns:
        r = db.query(models.Refund).filter_by(transaction_id=t.transaction_id, status="SUCCESS").first()
        t._refund_cache = r
        out.append(_txn_dict(t))
    return out


@router.get("/customer/failed")
def customer_failed(db: Session = Depends(get_db), authorization: str = Header(default=None)):
    payload = _customer_from_auth(authorization)
    if not payload:
        return JSONResponse({"error": "unauthenticated"}, status_code=401)
    u = _get_customer_user(db, payload)
    if not u:
        return JSONResponse({"error": "user not found"}, status_code=404)
    txns = db.query(models.Transaction).filter_by(user_id=u.id, status="FAILED").order_by(models.Transaction.created_at.desc()).all()
    out = []
    for t in txns:
        # skip already-refunded failures (no duplicate resolve)
        r = db.query(models.Refund).filter_by(transaction_id=t.transaction_id, status="SUCCESS").first()
        if r:
            continue
        t._refund_cache = r
        d = _txn_dict(t)
        d["operations"] = ["RESOLVE"] if t.debited and not t.merchant_credited else ["RESOLVE_ESCALATE"]
        out.append(d)
    return out
