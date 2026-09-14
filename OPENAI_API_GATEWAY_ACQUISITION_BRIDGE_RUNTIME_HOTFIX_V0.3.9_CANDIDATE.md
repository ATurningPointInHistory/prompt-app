# OpenAI API v0.3.9 Gateway Acquisition Bridge Runtime Hotfix Candidate

## Problem
STEP 7 Real API Test created an Acquisition Request but routing stopped with:

`LOCAL_GATEWAY_ACQUISITION_EXECUTOR_UNAVAILABLE`

The canonical Gateway was READY and the Source / Operation / Budget / Usage Policy / Paid Activation gates were valid, but the Browser runtime had not bound the governed Gateway Acquisition executor during the normal Gateway Session workflow.

## Fix
1. A successful Gateway Session now automatically enables the governed Gateway Acquisition Bridge.
2. Gateway Client state exposes `acquisitionBridgeEnabled`.
3. STEP 7 review re-checks / re-enables the Bridge before allowing the real test.
4. The Bridge automatically re-handshakes for `ACQUIRE_EXTERNAL` when authenticated acquisition needs that scope.
5. STEP 7 UI shows `Gateway Bridge READY / 未接続`.
6. Failure semantics distinguish `realApiRequestAttempted`, `providerNetworkCallPerformed`, and `realApiRequestPerformed`.

## Safety
- Existing `EXECUTE_EXTERNAL_ACQUISITION` authority revalidation remains required.
- Gateway target allowlist remains required.
- Secret values remain Gateway-only.
- No arbitrary URL proxy is enabled.
- Retry remains bounded.
- Generic `ACTIVATE_PAID_API` Hard Deny remains preserved.
- This Hotfix itself performed no real OpenAI provider network call.

## Validation
- Gateway Acquisition Bridge Runtime Hotfix: 9/9 PASS
- Real API Test Gate: 20/20 PASS
- Paid Source Activation Gate: 18/18 PASS
- Runtime UI: 10/10 PASS
- Setup Workflow: 11/11 PASS
- OpenAI Phase 2: 20/20 PASS
- Source Registration Gate: 8/8 PASS
- Secret Setup: 4/4 PASS
- Operation Contract Gate: 9/9 PASS
- USD Budget Gate: 16/16 PASS
- Usage Policy Gate: 17/17 PASS
- API / Secret Manager v1: 20/20 PASS
- Gateway: 38/38 PASS
- Phase 4 Acquisition: 14/14 PASS
- Phase 6 Security: 15/15 PASS
- Manifest: 410/410
- Critical failures: 0

## Expected runtime after application
After `③ Gateway Session開始`:

- Gateway = READY
- Session = ACTIVE
- Acquisition Bridge = READY

STEP 7 review should show `Gateway Bridge READY`.

The next one-time Real API Test can then route through:

Browser → Source Router → Local Gateway Adapter → Canonical Gateway → OpenAI Responses API.
