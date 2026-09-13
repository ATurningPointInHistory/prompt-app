# OpenAI API Integration Phase 2 v0.2.2 Provider Workflow Hotfix Candidate

Decision: EXTERNAL-010-DECISION-055
Parent Candidate: OpenAI API Integration Phase 2 v0.2.1
Canonical parent release: EXTERNAL-010 v1.20.1 FINAL_FREEZE

## Purpose
Fix the Provider Candidate workflow discovered during PC real UI validation.

Before this hotfix, `Provider候補を確認` required an already-registered SOURCE-OPENAI in order to obtain its Secret Reference. That inverted the intended workflow.

## Corrected workflow
1. Canonical Secret Reference candidate: `SECRET-OPENAI-PRIMARY`
2. Show Secret Reference readiness in UI (reference only; never secret value)
3. Build OpenAI Source Candidate before Source registration
4. Build Responses API Operation Candidate
5. If Secret metadata is not ready, explicitly require Gateway secret setup + reference metadata registration next
6. Only after the Secret reference becomes active may Source Registration Authority be the next step

## Safety properties preserved
- No API key value input in Browser UI
- No secret value stored in Browser / Repository / Evidence
- Provider registration is not performed by this hotfix
- Paid activation is not performed
- Budget mutation is not performed
- No real OpenAI request is performed
- Generic `ACTIVATE_PAID_API` Hard Deny remains unchanged
- OpenAI Responses API remains POST JSON / `store:false` / retry max 1

## Validation
- Provider Workflow Hotfix: 5/5 PASS
- OpenAI Phase 2: 20/20 PASS
- Session/UI Hotfix: 2/2 PASS
- Gateway baseline: regression required before promotion
- Phase 4 Acquisition: regression required before promotion
- Phase 6 Security: regression required before promotion

Status: CANDIDATE / NO PROVIDER REGISTRATION / NO PAID REQUEST
