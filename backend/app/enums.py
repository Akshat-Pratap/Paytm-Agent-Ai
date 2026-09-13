"""Strongly-typed enums — no stringly-typed business logic."""
from enum import Enum


class TransactionStatus(str, Enum):
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    PENDING = "PENDING"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class ResolutionType(str, Enum):
    REFUND = "REFUND"
    MONITOR = "MONITOR"
    RETRY = "RETRY"
    REQUEST_MORE_INFORMATION = "REQUEST_MORE_INFORMATION"
    ESCALATE_HUMAN = "ESCALATE_HUMAN"
    NO_ACTION = "NO_ACTION"


class VerificationStatus(str, Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"


class RefundStatus(str, Enum):
    INITIATED = "INITIATED"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class CaseStatus(str, Enum):
    CREATED = "CREATED"
    INVESTIGATING = "INVESTIGATING"
    RISK_ASSESSMENT = "RISK_ASSESSMENT"
    RESOLUTION_DECISION = "RESOLUTION_DECISION"
    COMMUNICATION = "COMMUNICATION"
    VERIFICATION = "VERIFICATION"
    REFUND_PROCESSING = "REFUND_PROCESSING"
    REFUND_VERIFICATION = "REFUND_VERIFICATION"
    RESOLVED = "RESOLVED"
    ESCALATED = "ESCALATED"
    FAILED = "FAILED"
    WAITING = "WAITING"


class AgentStatus(str, Enum):
    WAITING = "WAITING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ESCALATED = "ESCALATED"


class EscalationStatus(str, Enum):
    OPEN = "OPEN"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CLOSED = "CLOSED"


# Allowed state transitions for the case state machine.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "CREATED": {"INVESTIGATING", "ESCALATED"},
    "INVESTIGATING": {"RISK_ASSESSMENT", "ESCALATED", "FAILED"},
    "RISK_ASSESSMENT": {"RESOLUTION_DECISION", "ESCALATED"},
    "RESOLUTION_DECISION": {"COMMUNICATION", "ESCALATED", "WAITING"},
    "COMMUNICATION": {"VERIFICATION", "ESCALATED"},
    "VERIFICATION": {"REFUND_PROCESSING", "ESCALATED"},
    "REFUND_PROCESSING": {"REFUND_VERIFICATION", "ESCALATED"},
    "REFUND_VERIFICATION": {"RESOLVED", "ESCALATED", "FAILED"},
    "WAITING": {"RESOLUTION_DECISION", "ESCALATED"},
    "ESCALATED": {"RESOLVED", "FAILED"},
    "FAILED": {"ESCALATED"},
    "RESOLVED": set(),
}


def can_transition(frm: str, to: str) -> bool:
    return to in ALLOWED_TRANSITIONS.get(frm, set())
