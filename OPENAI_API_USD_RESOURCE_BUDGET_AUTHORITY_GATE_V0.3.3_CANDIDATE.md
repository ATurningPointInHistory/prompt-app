# OpenAI API Integration v0.3.3 — USD Resource Budget Authority Gate Candidate

Decision authority: EXTERNAL-010-DECISION-055 / EXTERNAL-010-DECISION-056
Parent implementation: OpenAI API v0.3.2 Operation Contract Authority Gate
Canonical parent baseline: EXTERNAL-010 v1.20.1 FINAL_FREEZE

## Purpose
Add the missing USD Resource Budget step after Source and Operation registration without weakening existing paid-API safety boundaries.

## Implemented
- Reuses existing EXTERNAL-010 Resource Budget Engine.
- Adds OpenAI USD Budget review UI.
- Adds Budget Candidate creation.
- Adds one-time Project Owner `ACTIVATE_RESOURCE_BUDGET` authority gate.
- Requires a trusted real UI event plus explicit confirmation.
- Restricts Budget scope to `SOURCE-OPENAI`, currency `USD`, dimension `FINANCIAL_COST`.
- Binds the Budget review to the active OpenAI Secret Reference / credential alias and billing profile ID.
- Rejects Soft Limit > Hard Limit.
- Rejects per-request hard cap > Budget hard limit.
- After activation, automatically selects the ACTIVE USD Budget in the OpenAI draft.
- One-time authority is revoked after activation attempt.
- Automatic Budget expansion remains disabled.
- Automatic recharge remains disabled.
- Paid Source activation is not performed.
- Real OpenAI API request is not performed.
- Next required action after successful Budget activation is `USAGE_POLICY`.

## Budget period semantics
The current Resource Budget Engine does not implement automatic monthly rollover. v0.3.3 therefore labels this Budget as `CURRENT_ALLOCATION` rather than claiming monthly automatic reset. A future lifecycle implementation may add time-period rollover separately.

## UI workflow
1. Secret Reference ACTIVE.
2. Source REGISTERED.
3. Operation REGISTERED.
4. Enter optional warning line (USD).
5. Enter Budget Hard Limit (USD).
6. Review Budget.
7. Create Budget Candidate.
8. Project Owner approves Budget activation.
9. Budget becomes ACTIVE and is selected.
10. Stop before Usage Policy / Paid Source activation.

## Validation
- USD Budget Gate: 16/16 PASS
- OpenAI Phase 2: 20/20 PASS
- Secret Setup UI: 4/4 PASS
- Credential Selection: 5/5 PASS
- Source Registration Gate: 8/8 PASS
- Operation Contract Gate: 9/9 PASS
- API / Secret Manager v1: 20/20 PASS
- Gateway: 38/38 PASS
- Phase 4 Acquisition: 14/14 PASS
- Phase 6 Security: 15/15 PASS
- Script Manifest: 410/410 PASS
- Critical failures: 0

## Safety state
- paidActivationPerformed: false
- realPaidRequestPerformed: false
- automaticBudgetExpansionPerformed: false
- automaticRechargePerformed: false
- tradingAuthorityGranted: false
- repositoryMutationAuthorityGranted: false
