# OpenAI API Source Registration Authority Gate v0.3.0 Candidate

Decision: EXTERNAL-010-DECISION-055 / EXTERNAL-010-DECISION-056
Parent runtime candidate: OpenAI API Integration Phase 2 + API / Secret Manager v1.0.0

## Purpose
Add an explicit Project Owner gate for registering `SOURCE-OPENAI` after the selected Secret Reference has been confirmed ACTIVE. This step registers Source identity only.

## Safety properties
- Requires a trusted browser user event (`event.isTrusted`).
- Requires an explicit Project Owner confirmation dialog.
- Creates authority only for `REGISTER_EXTERNAL_SOURCE` targeting `SOURCE-OPENAI` with purpose `openai-provider-registration`.
- Authority is one-time and is revoked immediately after the registration flow ends.
- Approval adapter is reset after the flow.
- Source is registered as `REGISTERED` / `enabled=false`.
- No Operation Contract registration in this step.
- No Budget mutation.
- No Paid API activation.
- No real OpenAI request.
- No secret value exposure or storage change.

## Next step after PASS
`REGISTER_SOURCE_OPERATION_CONTRACT_AUTHORITY`

## Validation
- Source Registration Authority Gate: 8/8 PASS
- OpenAI Phase 2: 20/20 PASS
- Provider Workflow Hotfix: 5/5 PASS
- Secret Setup UI Hotfix: 4/4 PASS
- API / Secret Manager v1: 20/20 PASS
- Gateway: 38/38 PASS
- Phase 4 Acquisition: 14/14 PASS
- Phase 6 Security: 15/15 PASS
- Critical Failed: 0

This Candidate does not perform paid activation or a real OpenAI API request.
