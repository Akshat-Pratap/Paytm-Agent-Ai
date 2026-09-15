"""Admin portal APIs: escalated queue + audit log — single ADMIN role only."""
import jwt
from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from ..database import get_db
from .. import models
from ..config import settings

router = APIRouter()
ALLOWED = {"admin"}


def _admin_from_token(auth: str) -> str:
    if not auth:
        return ""
    tok = auth.strip()
    if tok.lower().startswith("bearer "):
        tok = tok[7:].strip()
    try:
        p = jwt.decode(tok, settings.JWT_SECRET, algorithms=["HS256"])
        if str(p.get("role", "")).lower() == "admin":
            return "admin"
    except Exception:
        pass
    return ""


def require_admin(x_admin_role: str = Header(default=None, alias="X-Admin-Role"),
                  authorization: str = Header(default=None)) -> str:
    # Accept either X-Admin-Role header or Bearer admin JWT
    role = (x_admin_role or "").strip().lower()
    if role == "admin":
        return "admin"
    tok_role = _admin_from_token(authorization or "")
    if tok_role:
        return tok_role
    return ""


def _deny():
    return JSONResponse({"error": "unauthenticated: admin login required (ADMIN / 123456) → send X-Admin-Role: admin or Authorization: Bearer <admin JWT>"}, status_code=401)


def _case_dict(c: models.SupportCase):
    return {"case_id": c.case_id, "transaction_id": c.transaction_id, "description": c.description,
            "status": c.status, "priority": c.priority,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None}


@router.get("/admin/escalated")
def escalated(db: Session = Depends(get_db), x_admin_role: str = Header(default=None, alias="X-Admin-Role"),
              authorization: str = Header(default=None)):
    role = require_admin(x_admin_role, authorization)
    if not role:
        return _deny()
    rows = db.query(models.SupportCase).filter_by(status="ESCALATED").order_by(models.SupportCase.id.desc()).limit(100).all()
    out = []
    for c in rows:
        d = _case_dict(c)
        t = db.query(models.Transaction).filter_by(transaction_id=c.transaction_id).first()
        if t:
            d.update({"amount": t.amount, "currency": t.currency})
        r = db.query(models.RiskAssessment).filter_by(case_id=c.case_id).order_by(models.RiskAssessment.id.desc()).first()
        if r:
            d.update({"risk_level": r.risk_level, "risk_score": r.risk_score})
        out.append(d)
    return out


@router.get("/admin/audit")
def audit(db: Session = Depends(get_db), x_admin_role: str = Header(default=None, alias="X-Admin-Role"),
          authorization: str = Header(default=None)):
    role = require_admin(x_admin_role, authorization)
    if not role:
        return _deny()
    rows = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(200).all()
    return [{"id": r.id, "case_id": r.case_id, "admin_role": r.admin_role, "action": r.action,
             "note": r.note or "",
             "timestamp": r.timestamp.isoformat() if r.timestamp else None} for r in rows]
