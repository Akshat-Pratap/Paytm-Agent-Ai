# API
Base: http://localhost:8000. Interactive docs: `/docs`.

- POST /api/cases {customer_name, customer_email, description, transaction_id?, amount?} → creates + runs workflow synchronously
- GET /api/cases → latest 50
- GET /api/cases/{id} → case
- GET /api/cases/{id}/agents → agent executions w/ I/O + tools + duration
- GET /api/cases/{id}/events | /timeline → timeline
- GET /api/cases/{id}/transaction | /risk | /refund
- GET /api/cases/{id}/events/stream → SSE (tool_invoked, agent_started/completed, status_changed, escalated, resolved)
- POST /api/cases/{id}/human-action {action: APPROVE|REJECT|CLOSE, note}
- GET /api/dashboard/stats
- GET /api/mock/transactions/{id} · POST /api/mock/refunds {transaction_id, case_id, amount} · GET /api/mock/refunds/{id}
