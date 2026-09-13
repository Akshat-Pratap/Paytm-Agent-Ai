# Architecture
See README for diagram. Key decisions:
- **Orchestrator delegates**; specialists own one job + one toolset + typed I/O.
- **LLM abstraction** (`app/llm.py`): demo|gemini|openai|ollama via env; demo deterministic so hackathon never breaks.
- **Safety**: LLM proposes narrative only; `RefundEligibilityTool` + `VerificationAgent` + `RefundAgent` guard enforce the 5-rule refund policy deterministically.
- **State machine** (`enums.py`): invalid transitions rejected.
- **Observability**: every agent run → `agent_executions` row + `case_events` row + SSE publish.
- **Idempotency**: `{case}-{txn}-REFUND` unique key; replay returns existing refund.
- **DB**: SQLite default for zero-setup; set `DATABASE_URL` to Postgres in prod/docker.
