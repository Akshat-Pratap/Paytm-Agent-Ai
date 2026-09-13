"""Common agent interface."""
import json
import time
from abc import ABC, abstractmethod
from datetime import datetime
from sqlalchemy.orm import Session
from .. import models


class Agent(ABC):
    name: str = "base"
    task: str = ""

    ROLE = ""
    RESPONSIBILITIES = ""
    SAFETY = ""

    @abstractmethod
    def execute(self, db: Session, case_id: str, ctx: dict) -> dict:
        ...

    # --- helpers ---
    def _start(self, db: Session, case_id: str, ctx: dict) -> models.AgentExecution:
        from ..tools.payment_tools import CaseManagementTool
        CaseManagementTool.add_event(db, case_id, "agent_started", self.name,
                                     f"{self.name} started: {self.task}")
        ex = models.AgentExecution(case_id=case_id, agent_name=self.name, task=self.task,
                                   status="RUNNING", input_json=json.dumps(ctx, default=str)[:4000])
        db.add(ex); db.commit(); db.refresh(ex)
        return ex

    def _finish(self, db: Session, case_id: str, ex: models.AgentExecution,
                output: dict, tool: str = "", status: str = "COMPLETED", error: str = ""):
        from ..tools.payment_tools import CaseManagementTool
        ex.status = status
        ex.output_json = json.dumps(output, default=str)[:6000]
        ex.tool_used = tool
        ex.completed_at = datetime.utcnow()
        ex.error_message = error
        db.commit()
        CaseManagementTool.add_event(db, case_id, "agent_completed" if status == "COMPLETED" else "agent_failed",
                                     self.name, f"{self.name} {status.lower()}: {self.task}",
                                     {"output_summary": str(output)[:500]})
        return {"agent": self.name, "status": status, "output": output, "tool_used": tool, "error": error}
