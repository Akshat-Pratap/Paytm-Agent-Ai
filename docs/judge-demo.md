# Judge Demo (3–5 minutes)

## 0:00–0:30 — Problem
"Support chatbots answer questions. Ours resolves them: a customer says ₹2,000 UPI failed but money was deducted — the AI team must investigate, decide, refund, verify, and only involve humans on exceptions."

## 0:30–1:00 — Customer issue
Show Customer Support Interface. Click **▶ Run Successful Refund Demo**.

## 1:00–2:30 — Autonomous workflow
Watch Live Agent Control Center: ORCHESTRATOR → TRANSACTION (TXN-DEMO-001, FAILED, debited, merchant not credited) → RISK (12-ish/LOW, allowed) → RESOLUTION (REFUND 96%) → COMMUNICATION → VERIFICATION (PASSED) → timeline streams each step.

## 2:30–3:00 — Refund
REFUND agent executes idempotent refund → Refund panel shows REF id + SUCCESS.

## 3:00–3:30 — Final verification
Post-refund verification confirms SUCCESS → CASE RESOLVED → customer notified. Open "Why did the AI decide this?" evidence panel.

## 3:30–4:00 — High-risk escalation
Click **▶ Run High Risk Demo** (₹50,000) → RISK HIGH → ESCALATED → Human panel with Approve/Reject/Close.

## 4:00–5:00 — Why autonomous teammates
"One manager, six specialists, tools, safety gates, verified actions, humans only for exceptions — not a chatbot."
