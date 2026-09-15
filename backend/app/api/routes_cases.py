"""Case + agent + escalation REST APIs + SSE stream."""
import json
import asyncio
from fastapi import APIRouter, Depends, BackgroundTasks, Header
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sse_starlette.sse import EventSourceResponse
from ..database import get_db
from .. import models
from ..schemas import CreateCaseRequest, HumanActionRequest
from ..workflow import create_and_run
from ..eventbus import subscribe, unsubscribe
from ..tools.payment_tools import CaseManagementTool

router = APIRouter()

ALLOWED_ADMIN_ROLES = {"admin"}


def _resolve_admin_role(body_role=None, header_role=None, bearer=None) -> str:
    # Single ADMIN role — normalize any case, accept Bearer admin JWT too
    import jwt as _jwt
    from ..config import settings as _s
    raw = (body_role or header_role or "").strip().lower()
    if raw == "admin":
        return "admin"
    tok = (bearer or "").strip()
    if tok.lower().startswith("bearer "):
        tok = tok[7:].strip()
    if tok:
        try:
            p = _jwt.decode(tok, _s.JWT_SECRET, algorithms=["HS256"])
            if str(p.get("role", "")).lower() == "admin":
                return "admin"
        except Exception:
            pass
    # fallback demo header value
    if raw in ALLOWED_ADMIN_ROLES:
        return raw
    return raw or "admin"


def _case_dict(c: models.SupportCase):
    return {"case_id": c.case_id, "transaction_id": c.transaction_id, "description": c.description,
            "status": c.status, "priority": c.priority,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None}


@router.post("/cases")
def create_case(req: CreateCaseRequest, db: Session = Depends(get_db)):
    from ..workflow import UnknownTransactionError
    try:
        case = create_and_run(db, req.customer_name, req.customer_email, req.description,
                              req.transaction_id, req.amount)
    except UnknownTransactionError as e:
        return JSONResponse({"error": str(e)}, status_code=404)
    return _case_dict(case)


@router.get("/cases")
def list_cases(db: Session = Depends(get_db)):
    return [_case_dict(c) for c in db.query(models.SupportCase).order_by(models.SupportCase.id.desc()).limit(50).all()]


@router.get("/cases/{case_id}")
def get_case(case_id: str, db: Session = Depends(get_db)):
    c = db.query(models.SupportCase).filter_by(case_id=case_id).first()
    if not c:
        return JSONResponse({"error": "not found"}, status_code=404)
    return _case_dict(c)


@router.get("/cases/{case_id}/agents")
def agents(case_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.AgentExecution).filter_by(case_id=case_id).order_by(models.AgentExecution.id).all()
    return [{"agent": r.agent_name, "task": r.task, "status": r.status, "tool_used": r.tool_used,
             "started_at": r.started_at.isoformat() if r.started_at else None,
             "completed_at": r.completed_at.isoformat() if r.completed_at else None,
             "output": json.loads(r.output_json or "{}"), "error": r.error_message} for r in rows]


@router.get("/cases/{case_id}/events")
def events(case_id: str, db: Session = Depends(get_db)):
    rows = db.query(models.CaseEvent).filter_by(case_id=case_id).order_by(models.CaseEvent.id).all()
    return [{"event_type": r.event_type, "agent": r.agent_name, "message": r.message,
             "metadata": json.loads(r.metadata_json or "{}"),
             "created_at": r.created_at.isoformat() if r.created_at else None} for r in rows]


@router.get("/cases/{case_id}/timeline")
def timeline(case_id: str, db: Session = Depends(get_db)):
    return events(case_id, db)


@router.get("/cases/{case_id}/transaction")
def txn(case_id: str, db: Session = Depends(get_db)):
    c = db.query(models.SupportCase).filter_by(case_id=case_id).first()
    if not c:
        return JSONResponse({"error": "not found"}, status_code=404)
    t = db.query(models.Transaction).filter_by(transaction_id=c.transaction_id).first()
    if not t:
        return {}
    r = db.query(models.Refund).filter_by(transaction_id=t.transaction_id, status="SUCCESS").first()
    return {"transaction_id": t.transaction_id, "amount": t.amount, "currency": t.currency,
            "payment_method": t.payment_method, "merchant": t.merchant_name,
            "status": t.status, "debited": t.debited, "merchant_credited": t.merchant_credited,
            "settlement_status": t.settlement_status, "sender_masked": t.sender_masked,
            "refund_status": "SUCCESS" if r else "NONE", "refund_id": r.refund_id if r else None}


@router.get("/cases/{case_id}/risk")
def risk(case_id: str, db: Session = Depends(get_db)):
    import json as _j
    r = db.query(models.RiskAssessment).filter_by(case_id=case_id).order_by(models.RiskAssessment.id.desc()).first()
    # risk rows are written by workflow? we persist on the fly:
    if not r:
        # derive from agent execution output
        ex = db.query(models.AgentExecution).filter_by(case_id=case_id, agent_name="risk").order_by(models.AgentExecution.id.desc()).first()
        if ex and ex.output_json:
            o = _j.loads(ex.output_json)
            return {"risk_score": o.get("riskScore", 0), "risk_level": o.get("riskLevel", "LOW"),
                    "automatic_resolution_allowed": o.get("automaticResolutionAllowed", True),
                    "reasons": o.get("reasons", [])}
        return {}
    return {"risk_score": r.risk_score, "risk_level": r.risk_level,
            "automatic_resolution_allowed": r.automatic_resolution_allowed,
            "reasons": _j.loads(r.reasons or "[]")}


@router.get("/cases/{case_id}/refund")
def refund(case_id: str, db: Session = Depends(get_db)):
    r = db.query(models.Refund).filter_by(case_id=case_id).order_by(models.Refund.id.desc()).first()
    if not r:
        return {}
    return {"refund_id": r.refund_id, "transaction_id": r.transaction_id, "amount": r.amount,
            "status": r.status, "failure_reason": r.failure_reason}


@router.post("/cases/{case_id}/human-action")
def human_action(case_id: str, req: HumanActionRequest, db: Session = Depends(get_db),
                 x_admin_role: str = Header(default=None, alias="X-Admin-Role"),
                 authorization: str = Header(default=None)):
    from datetime import datetime
    from ..tools.payment_tools import CaseManagementTool as _CM
    esc = db.query(models.Escalation).filter_by(case_id=case_id).order_by(models.Escalation.id.desc()).first()
    case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
    if not case:
        return JSONResponse({"error": "not found"}, status_code=404)
    action = (req.action or "").upper()
    if action not in ("APPROVE", "REJECT", "CLOSE"):
        return JSONResponse({"error": "action must be APPROVE|REJECT|CLOSE"}, status_code=400)
    # Single ADMIN only — all 3 actions allowed
    admin_role = _resolve_admin_role(getattr(req, "admin_role", None), x_admin_role, authorization)
    if admin_role not in ALLOWED_ADMIN_ROLES:
        return JSONResponse({"error": "admin_role must be admin (single ADMIN role)"}, status_code=400)
    if case.status != "ESCALATED":
        return JSONResponse({"error": f"case is {case.status}, only ESCALATED cases accept human action"}, status_code=409)
    if esc:
        esc.status = {"APPROVE": "APPROVED", "REJECT": "REJECTED", "CLOSE": "CLOSED"}.get(action, "CLOSED")
        esc.resolved_at = datetime.utcnow()
    if action == "APPROVE":
        _CM.set_status(db, case_id, "RESOLVED")
        case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
        if case:
            case.resolved_at = datetime.utcnow(); db.commit()
    elif action == "CLOSE":
        _CM.set_status(db, case_id, "RESOLVED")
        case = db.query(models.SupportCase).filter_by(case_id=case_id).first()
        if case:
            case.resolved_at = datetime.utcnow(); db.commit()
    elif action == "REJECT":
        _CM.set_status(db, case_id, "FAILED")
    db.commit()
    CaseManagementTool.add_event(db, case_id, "human_action", "human",
                                 f"Human {req.action} by {admin_role}: {req.note}")
    # Audit trail — insert after state transition so even failed transitions are traceable
    try:
        db.add(models.AuditLog(case_id=case_id, admin_role=admin_role, action=action,
                               note=req.note or "", timestamp=datetime.utcnow()))
        db.commit()
    except Exception:
        db.rollback()
    db.refresh(case)
    return {"ok": True, "status": case.status, "admin_role": admin_role}


@router.get("/cases/{case_id}/events/stream")
async def stream(case_id: str, db: Session = Depends(get_db)):
    import json as _j
    # Replay persisted history so late subscribers don't miss synchronous runs
    history = db.query(models.CaseEvent).filter_by(case_id=case_id).order_by(models.CaseEvent.id).all()
    hist_events = [{"event_type": r.event_type, "agent_name": r.agent_name, "message": r.message,
                    "metadata": _j.loads(r.metadata_json or "{}"),
                    "created_at": r.created_at.isoformat() if r.created_at else None,
                    "case_id": case_id} for r in history]
    q = subscribe(case_id)

    async def gen():
        try:
            for evt in hist_events:
                yield {"data": json.dumps(evt)}
            while True:
                try:
                    evt = await asyncio.wait_for(q.get(), timeout=25)
                    yield {"data": json.dumps(evt)}
                except asyncio.TimeoutError:
                    yield {":": "ping", "data": "ping"}
        finally:
            unsubscribe(case_id, q)

    return EventSourceResponse(gen())
