# OpenAI API v0.3.8 Real API Test Authority Gate Candidate

## Purpose
Implement STEP 7 of the OpenAI Setup Workflow.

This Candidate performs the first real OpenAI Responses API request only after an explicit trusted Project Owner confirmation.

## Fixed Real API Test
- Provider: OpenAI
- Endpoint: `POST https://api.openai.com/v1/responses`
- Input: `Reply exactly with: OK`
- Project/chat data transmitted: NO
- `store`: false
- Tools: OFF
- Streaming: OFF
- Background: OFF
- Retry: max 1 attempt
- Test `max_output_tokens`: capped at 64
- Model: current registered UI selection
- Budget: active USD Resource Budget
- Per-request cap: existing approved Hard Cap

## Gate sequence
1. Review is mutation-free and network-free.
2. Cost Preflight estimates maximum USD cost.
3. Active Budget and per-request Hard Cap are revalidated.
4. Trusted Project Owner click is required for this first real test.
5. A one-time `EXECUTE_EXTERNAL_ACQUISITION` authority is issued for the exact test Request ID.
6. Gateway obtains the required `ACQUIRE_EXTERNAL` session scope.
7. Exactly one governed request is sent.
8. Provider usage is reconciled to actual `FINANCIAL_COST`.
9. Resource Budget usage is recorded.
10. Output must resolve to exactly `OK`.
11. The one-time execution Authority is revoked.
12. STEP 7 is marked complete only when response + usage reconciliation both PASS.

## Pricing / reconciliation
The pricing metadata continues to use the registered GPT-5.6 model profiles verified on 2026-09-14 from OpenAI's official model documentation.
Snapshot-style returned model IDs such as `gpt-5.6-luna-YYYY-MM-DD` are resolved to the canonical registered pricing profile for reconciliation.

## Safety boundaries
- Generic `ACTIVATE_PAID_API` Hard Deny remains preserved.
- `EXECUTE_TRADE` Hard Deny remains preserved.
- Secret values remain Gateway-only.
- Secret values are not returned to Browser, Audit, or Validation output.
- Unknown / ambiguous paid cost is never assumed to be zero.
- Failed provider usage reconciliation does not complete STEP 7.
- No automatic Budget expansion.
- No automatic recharge.
- No automatic credential failover.
- This Candidate does not create general runtime execution authority for normal requests; Final Validation remains STEP 8.

## Stepper behavior
Before successful test:
- STEP 7 = Current
- STEP 8 = Locked

After successful test:
- STEP 7 = Complete
- STEP 8 = Current

## Validation
- Real API Test Gate: 19/19 PASS (simulated governed request; no provider network call)
- Paid Source Activation Gate: 18/18 PASS
- Runtime Workflow Compaction: 10/10 PASS
- Setup Workflow UI: 11/11 PASS
- OpenAI Phase2: 20/20 PASS
- Source Registration Gate: 8/8 PASS
- Operation Contract Gate: 9/9 PASS
- USD Budget Gate: 16/16 PASS
- Usage Policy Gate: 17/17 PASS
- Secret Setup UI: 4/4 PASS
- API / Secret Manager v1: 20/20 PASS
- Gateway: 38/38 PASS
- Phase4 Acquisition: 14/14 PASS
- Phase6 Security: 15/15 PASS
- Manifest: 410/410
- Critical failures: 0

## Promotion boundary
This Candidate does not itself send a real OpenAI request during build/validation.
The first actual provider request occurs only on the user's PC when the Project Owner clicks the STEP 7 confirmation button.
