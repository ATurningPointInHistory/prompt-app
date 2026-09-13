# OpenAI API Source Registration Credential Selection Hotfix v0.3.1

Decisions: EXTERNAL-010-DECISION-055 / 056
Parent: v0.3.0 Source Registration Authority Gate

## Fixes
- Align initial OpenAI Secret Reference with API / Secret Manager v1: LEGACY is the initial ACTIVE credential; PRIMARY remains STANDBY.
- After successful Secret preparation, persist the selected Secret Reference before Control Center rerender.
- Source registration review/approval therefore remains bound to the credential the Project Owner actually selected.
- UI now explains successful Source registration visibility: Provider becomes REGISTERED and Sources count increases.

## Safety
- No provider registration is performed by applying this hotfix.
- No paid activation, Budget mutation, Operation Contract registration, or real OpenAI request is performed.
- Secret values remain Gateway-only.

## Validation
- Credential Selection Hotfix: 5/5 PASS
- Source Registration Authority Gate: 8/8 PASS
- Existing OpenAI / Gateway regressions remain PASS.
