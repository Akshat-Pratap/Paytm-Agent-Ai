"""Relational schema: users, transactions, support_cases, agent_executions,
risk_assessments, resolution_decisions, refunds, case_events, escalations."""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from datetime import datetime
from .database import Base


def _now():
    return datetime.utcnow()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(120), nullable=False)
    email = Column(String(160), unique=True, nullable=False)
    phone = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=_now)


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True)
    transaction_id = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    merchant_id = Column(String(64), default="MERCH-DEMO-01")
    merchant_name = Column(String(120), default="Demo Merchant")
    amount = Column(Float, nullable=False)
    currency = Column(String(8), default="INR")
    payment_method = Column(String(16), default="UPI")
    status = Column(String(16), default="FAILED")  # SUCCESS|FAILED|PENDING
    debited = Column(Boolean, default=False)
    merchant_credited = Column(Boolean, default=False)
    settlement_status = Column(String(16), default="NOT_SETTLED")
    sender_masked = Column(String(32), default="XXXX-XXXX-1234")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)


class SupportCase(Base):
    __tablename__ = "support_cases"
    id = Column(Integer, primary_key=True)
    case_id = Column(String(32), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    transaction_id = Column(String(64), nullable=True)
    issue_type = Column(String(64), default="PAYMENT_FAILURE_DEBIT")
    description = Column(Text, default="")
    status = Column(String(32), default="CREATED")
    priority = Column(String(16), default="MEDIUM")
    created_at = Column(DateTime, default=_now)
    updated_at = Column(DateTime, default=_now, onupdate=_now)
    resolved_at = Column(DateTime, nullable=True)


class AgentExecution(Base):
    __tablename__ = "agent_executions"
    id = Column(Integer, primary_key=True)
    case_id = Column(String(32), index=True, nullable=False)
    agent_name = Column(String(64), nullable=False)
    task = Column(String(128), default="")
    status = Column(String(16), default="RUNNING")
    input_json = Column(Text, default="{}")
    output_json = Column(Text, default="{}")
    tool_used = Column(String(64), default="")
    started_at = Column(DateTime, default=_now)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, default="")


class RiskAssessment(Base):
    __tablename__ = "risk_assessments"
    id = Column(Integer, primary_key=True)
    case_id = Column(String(32), index=True)
    transaction_id = Column(String(64))
    risk_score = Column(Integer, default=0)
    risk_level = Column(String(16), default="LOW")
    automatic_resolution_allowed = Column(Boolean, default=True)
    reasons = Column(Text, default="[]")
    created_at = Column(DateTime, default=_now)


class ResolutionDecision(Base):
    __tablename__ = "resolution_decisions"
    id = Column(Integer, primary_key=True)
    case_id = Column(String(32), index=True)
    decision = Column(String(32), default="REFUND")
    reason = Column(Text, default="")
    confidence = Column(Float, default=0.0)
    automatic_action_allowed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=_now)


class Refund(Base):
    __tablename__ = "refunds"
    id = Column(Integer, primary_key=True)
    refund_id = Column(String(64), unique=True, index=True)
    transaction_id = Column(String(64), index=True)
    case_id = Column(String(32), index=True)
    amount = Column(Float, default=0)
    currency = Column(String(8), default="INR")
    status = Column(String(16), default="INITIATED")
    failure_reason = Column(Text, default="")
    idempotency_key = Column(String(128), unique=True)
    created_at = Column(DateTime, default=_now)
    completed_at = Column(DateTime, nullable=True)


class CaseEvent(Base):
    __tablename__ = "case_events"
    id = Column(Integer, primary_key=True)
    case_id = Column(String(32), index=True)
    event_type = Column(String(64), default="")
    agent_name = Column(String(64), default="")
    message = Column(Text, default="")
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=_now)


class Escalation(Base):
    __tablename__ = "escalations"
    id = Column(Integer, primary_key=True)
    case_id = Column(String(32), index=True)
    reason = Column(Text, default="")
    priority = Column(String(16), default="HIGH")
    status = Column(String(16), default="OPEN")
    recommended_action = Column(Text, default="Manual review required")
    created_at = Column(DateTime, default=_now)
    resolved_at = Column(DateTime, nullable=True)
