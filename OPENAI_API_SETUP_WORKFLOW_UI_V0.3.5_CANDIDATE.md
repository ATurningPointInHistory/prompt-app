# OpenAI API Setup Workflow UI v0.3.5 Candidate

## Purpose
Reorganize the OpenAI API setup controls into a progressive step workflow without changing the underlying Source / Operation / Budget / Usage Policy governance logic.

## Workflow
1. Runtime
2. Provider / Secret
3. Operation Contract
4. USD Resource Budget
5. Usage Policy
6. Paid Source Activation
7. Real API Test
8. Final Validation

## UI behavior
- Current step is expanded.
- Completed steps remain available but collapsed.
- Future steps are locked in the progress overview.
- NEXT ACTION is shown near the top.
- Progress is derived from runtime/governance state, not stored as an authoritative step number.
- Expired/inactive Gateway sessions return the workflow to Step 1.
- Raw execution JSON is moved to a collapsed `実行詳細 / JSON` section at the bottom of the OpenAI panel.
- Existing controls remain the same authority boundaries and call the same underlying functions.

## Safety
- No Paid Source Activation implemented by this Candidate.
- No real OpenAI request performed.
- No budget expansion or automatic recharge.
- No secret-value input in the Browser UI.
- Existing Decision 055 / 056 boundaries remain unchanged.

## Validation
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
