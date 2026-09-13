"""Acceptance tests: refund / high-risk / duplicate / failure / verification-blocked / idempotency / transitions."""
import os
os.environ["DATABASE_URL"] = "sqlite:///./test_hub.db"
os.environ["AI_MODE"] = "demo"
os.environ["AGENT_STEP_DELAY"] = "0"
import json

import sys
sys.path.insert(0, ".")
try:
    os.remove("test_hub.db")
except FileNotFoundError:
    pass

from app.database import Base, engine, SessionLocal
from app import models
from app.seed import seed
from app.workflow import create_and_run
from app.tools.payment_tools import RefundExecutionTool
from app.enums import can_transition

Base.metadata.create_all(bind=engine)
db = SessionLocal(); seed(db); db.close()


def fresh():
    return SessionLocal()


def test_refund_success():
    db = fresh()
    c = create_and_run(db, "T", "t1@x.com", "My ₹2,000 UPI payment failed but money was deducted.")
    assert c.status == "RESOLVED", c.status
    r = db.query(models.Refund).filter_by(case_id=c.case_id).first()
    assert r and r.status == "SUCCESS"
    db.close()


def test_high_risk_escalated():
    db = fresh()
    c = create_and_run(db, "T", "t2@x.com", "My ₹50,000 UPI payment failed, high risk test.")
    assert c.status == "ESCALATED", c.status
    db.close()


def test_already_refunded_no_duplicate():
    db = fresh()
    c = create_and_run(db, "T", "t3@x.com", "already refunded case", transaction_id="TXN-DEMO-004")
    assert c.status == "RESOLVED", c.status
    n = db.query(models.Refund).filter_by(transaction_id="TXN-DEMO-004", status="SUCCESS").count()
    assert n == 1, f"duplicate refund! count={n}"
    db.close()


def test_refund_failure_escalates():
    db = fresh()
    c = create_and_run(db, "T", "t4@x.com", "refund fail gateway fail test", transaction_id="TXN-DEMO-005")
    assert c.status == "ESCALATED", c.status
    db.close()


def test_verification_blocks_unverified_refund():
    db = fresh()
    from app.agents.specialists import RefundAgent
    from app import models as m
    case = m.SupportCase(case_id="CASE-TEST-BLOCK", transaction_id="TXN-DEMO-001", description="x", status="VERIFICATION")
    db.add(case); db.commit()
    out = RefundAgent().execute(db, "CASE-TEST-BLOCK", {"verification": {"verification": "FAILED"},
        "resolutionDecision": {"decision": "REFUND"}, "riskAssessment": {"automaticResolutionAllowed": True},
        "transaction": {"transactionId": "TXN-DEMO-001", "amount": 2000}})
    assert out["status"] == "FAILED"
    db.close()


def test_idempotency():
    db = fresh()
    r1 = RefundExecutionTool.run(db, "CASE-IDEM", "TXN-DEMO-001", 2000)
    r2 = RefundExecutionTool.run(db, "CASE-IDEM", "TXN-DEMO-001", 2000)
    assert r1["refund_id"] == r2["refund_id"] and r2["idempotent_replay"] is True
    db.close()


def test_state_transitions():
    assert can_transition("CREATED", "INVESTIGATING")
    assert not can_transition("CREATED", "RESOLVED")
    assert can_transition("VERIFICATION", "REFUND_PROCESSING")
    assert not can_transition("RESOLVED", "CREATED")
