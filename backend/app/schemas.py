"""Pydantic DTOs — structured agent I/O."""
from pydantic import BaseModel, Field
from typing import Optional
from .enums import (
    TransactionStatus, RiskLevel, ResolutionType, VerificationStatus,
    RefundStatus, CaseStatus, AgentStatus,
)


class CreateCaseRequest(BaseModel):
    customer_name: str = "Demo Customer"
    customer_email: str = "demo@example.com"
    description: str = Field(..., min_length=3)
    transaction_id: Optional[str] = None
    amount: Optional[float] = None


class TransactionInvestigationResult(BaseModel):
    transactionId: str
    amount: float
    transactionStatus: TransactionStatus
    debited: bool
    merchantCredited: bool
    settled: bool
    refundExists: bool
    investigationStatus: str
    confidence: float


class RiskAssessmentResult(BaseModel):
    riskScore: int
    riskLevel: RiskLevel
    automaticResolutionAllowed: bool
    reasons: list[str]


class ResolutionDecisionResult(BaseModel):
    decision: ResolutionType
    reason: str
    automaticActionAllowed: bool
    confidence: float


class VerificationResult(BaseModel):
    verification: VerificationStatus
    checks: dict
    message: str


class RefundResult(BaseModel):
    refundId: str
    transactionId: str
    amount: float
    status: RefundStatus
    timestamp: str


class AgentExecutionResult(BaseModel):
    agent: str
    status: AgentStatus
    output: dict
    tool_used: str = ""
    duration_ms: int = 0
    error: str = ""


class HumanActionRequest(BaseModel):
    action: str  # APPROVE | REJECT | CLOSE
    note: str = ""
