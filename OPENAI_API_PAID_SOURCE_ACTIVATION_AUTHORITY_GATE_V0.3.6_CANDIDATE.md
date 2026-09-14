# OpenAI API v0.3.6 Paid Source Activation Authority Gate Candidate

## Purpose
Implement STEP 6 of the OpenAI Setup Workflow.

The gate activates the already-registered SOURCE-OPENAI for governed paid execution only after:
- Secret Reference ACTIVE
- Operation Contract REGISTERED
- USD Resource Budget ACTIVE
- Usage Policy ACTIVE
- Per-request Hard Cap configured
- Explicit trusted Project Owner approval

## Safety
- Generic ACTIVATE_PAID_API remains Hard Denied.
- Dedicated action: ACTIVATE_GOVERNED_PAID_SOURCE.
- Authority is scoped to SOURCE-OPENAI and revoked after one-time activation.
- No real OpenAI request is sent by this Candidate.
- No automatic Budget expansion.
- No automatic recharge.
- No automatic credential failover.
- Approved scope does not require per-request human approval.
- Real API Test remains a separate STEP 7.

## Stepper behavior
Before approval:
STEP 6 = Current

After approval:
STEP 6 = Complete
STEP 7 = Current

## Validation
- Paid Source Activation Gate: 18/18 PASS
- Setup Workflow UI: 11/11 PASS
- OpenAI Phase2: 20/20 PASS
- Source Registration Gate: 8/8 PASS
- Operation Contract Gate: 9/9 PASS
- USD Budget Gate: 16/16 PASS
- Usage Policy Gate: 17/17 PASS
- API / Secret Manager v1: 20/20 PASS
- Gateway: 38/38 PASS
- Phase4 Acquisition: 14/14 PASS
- Phase6 Security: 15/15 PASS
- Manifest: 410/410
- Critical failures: 0

## Promotion boundary
This Candidate does not perform a real paid OpenAI request.
The next implementation target is STEP 7 Real API Test.
