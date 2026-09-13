# OpenAI API Integration v0.3.2 Candidate

## Scope
Operation Contract Registration Authority Gate for `EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS`.

## Preconditions
- `SOURCE-OPENAI` is already registered.
- The selected OpenAI Secret Reference has been prepared and validated.
- No paid API activation is implied by Source or Operation registration.

## Added behavior
- Adds `Operation` status to the OpenAI API UI.
- Adds `Operation登録内容を確認` review control.
- Adds `Project OwnerとしてOperation登録` approval control.
- Requires a trusted browser user interaction (`event.isTrusted`).
- Requires an explicit confirmation dialog.
- Creates a one-time Authority Envelope scoped exactly to:
  - Action: `REGISTER_SOURCE_OPERATION_CONTRACT`
  - Target: `EXTERNAL-010-OP-OPENAI-INTERNAL-ANALYSIS`
  - Purpose: `phase4-operation-contract`
- Registers only the already-reviewed Operation Contract.
- Revokes the temporary Authority immediately after registration flow completion.

## Explicit non-effects
This Candidate does NOT:
- enable `SOURCE-OPENAI`,
- activate paid API usage,
- change or create Budget,
- perform a real OpenAI request,
- expand tools/streaming/background capabilities,
- grant trading or repository mutation authority.

## Operation Contract
- Endpoint: `https://api.openai.com/v1/responses`
- Method: `POST`
- Body: governed JSON
- `store=false` fixed
- Retry: max 1 attempt
- Tools / streaming / background remain outside initial scope

## Next action after successful registration
`USD_RESOURCE_BUDGET`

## Validation
- Operation Contract Gate: 9/9 PASS
- OpenAI Phase 2: 20/20 PASS
- Session/UI Hotfix: 2/2 PASS
- Secret Setup UI: 4/4 PASS
- Source Registration Gate: 8/8 PASS
- Credential Selection v0.3.1: 5/5 PASS
- API / Secret Manager v1: 20/20 PASS
- Gateway: 38/38 PASS
- Phase 4 Acquisition: 14/14 PASS
- Phase 6 Security: 15/15 PASS
- Script Manifest: 410/410 PASS

## Validation note
`validate_openai_api_provider_workflow_hotfix.cjs` v0.2.2 contains a pre-Decision-056 assumption that the default OpenAI Secret Reference is PRIMARY. Decision 056 / API & Secret Manager v1 changed the initial default to LEGACY. The current credential-selection validator v0.3.1 is the authoritative successor for that behavior.
