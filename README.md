# Paytm Autonomous Resolution Hub
> **AI teammates that don't just answer — they resolve.**
> Detect. Investigate. Decide. Resolve.

Traditional support chatbots answer; this system is an **AI workforce**: an Orchestrator (team lead)
delegates to specialist agents (transaction, risk, resolution, communication, verification, refund,
escalation) that investigate via **tools**, enforce **deterministic safety rules**, execute a
**mock-gateway refund idempotently**, verify the outcome, and escalate to humans on exceptions.

> **Stack note (environment):** spec asks Java 21/Spring Boot + PostgreSQL + Docker, but this machine has
> no Java/Maven/Docker — only Python 3.12 + Node 24. The implementation therefore uses a
> **Python FastAPI backend** (identical 7-agent architecture, tools, workflow, SSE, safety gates),
> **SQLite by default** (PostgreSQL via `DATABASE_URL`), and **React+Vite frontend**.
> All dependencies are installed in `venv/` (backend) and `frontend/node_modules`.

## Architecture
```
CUSTOMER → ORCHESTRATOR → TRANSACTION → RISK → RESOLUTION → COMMUNICATION
→ VERIFICATION ──FAIL──→ HUMAN ESCALATION
      └──PASS──→ REFUND → MOCK GATEWAY → POST-REFUND VERIFY ──→ RESOLVED / ESCALATED
```
- `backend/app/agents/` — orchestrator + 7 specialists, common `Agent.execute()` interface, per-agent ROLE/tools/schemas
- `backend/app/tools/payment_tools.py` — TransactionLookup/History, RiskAnalysis, RefundEligibility/Execution(idempotent)/Status, Notify, CaseMgmt, Escalation
- `backend/app/llm.py` — provider abstraction (demo|gemini|openai|ollama); demo mode deterministic; LLM never bypasses business rules
- Safety gate: refund only if `verification==PASSED && decision==REFUND && auto_allowed && amount<=limit && no prior SUCCESS`
- Idempotency key: `{case}-{txn}-REFUND`; replays return the existing refund
- Real-time: `GET /api/cases/{id}/events/stream` (SSE) + persisted `case_events`/`agent_executions`

## Quickstart (Windows PowerShell)
```powershell
cd paytm-autonomous-resolution-hub
python -m venv venv
.\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd backend; ..\venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
# new shell:
cd frontend; npm install; npm run dev   # http://localhost:5173
```
Backend: http://localhost:8000 · Swagger: http://localhost:8000/docs (auto) · Health: `/api/health`

## API (see `docs/api.md`)
`POST /api/cases` · `GET /api/cases` · `GET /api/cases/{id}` · `GET .../agents|events|timeline|transaction|risk|refund` · `GET .../events/stream` (SSE) · `POST .../human-action` · `GET /api/dashboard/stats` · mock gateway `GET /api/mock/transactions/{id}`, `POST /api/mock/refunds`, `GET /api/mock/refunds/{id}`

## Demo (3–5 min — full script in `docs/judge-demo.md`)
1. Open frontend → click **▶ Run Successful Refund Demo** (TXN-DEMO-001, ₹2,000 FAILED+debited) → watch agents → RESOLVED + REF id.
2. **▶ Run High Risk Demo** (₹50,000) → ESCALATED + Approve/Reject/Close.
3. **▶ Run Refund Failure / Already Refunded / Pending** for retry, no-duplicate, MONITOR paths.
4. Show "Why did the AI decide this?" evidence panel + timeline + DB-persisted agent executions.

## Scenarios seeded
| Txn | Condition | Expected |
|---|---|---|
| TXN-DEMO-001 ₹2,000 FAILED+debited, low risk | auto refund | RESOLVED |
| TXN-DEMO-002 ₹50,000 FAILED | high risk | ESCALATED |
| TXN-DEMO-003 PENDING | monitor | WAITING |
| TXN-DEMO-004 FAILED + prior SUCCESS refund | no duplicate | RESOLVED (no new refund) |
| TXN-DEMO-005 FAILED | gateway forced fail | ESCALATED after retries |

## Tests
```powershell
cd backend; ..\venv\Scripts\python.exe -m pytest tests -q   # 7 passed
```
Covers refund success, high-risk escalation, no-duplicate, refund-failure escalation, verification-block, idempotency, state machine.

## Security
Simulated payments only — no real money, no secrets in code (`.env.example`), masked sender IDs, CORS allowlist, LLM output validated and never directly mutates finance state.
