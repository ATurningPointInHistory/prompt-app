# OpenAI API v0.3.10 Usage Reconciliation + Human-Centered Review Feedback Hotfix Candidate

## Root cause fixed
The real OpenAI request reached the provider successfully (HTTP 200 / output `OK`), but the shared Browser redaction layer treated accounting keys such as `input_tokens`, `output_tokens`, and `total_tokens` as credential-like secret keys because they contain the word `token`.

This removed provider usage counters before OpenAI cost reconciliation and caused `AMBIGUOUS_ESTIMATE_RESERVED` even though the raw provider response contained valid usage values.

## Functional fix
- Exact known OpenAI token usage metric keys are preserved only when values are finite non-negative numbers.
- Usage detail containers (`input_tokens_details`, `output_tokens_details`) are recursively sanitized.
- Credential-like values such as `access_token`, `bearer_token`, session tokens, API keys, unknown token-like strings, etc. remain redacted.
- OpenAI provider usage can now reconcile actual token usage and FINANCIAL_COST.
- Reconciliation-pending results explicitly distinguish request attempted / provider network reached / request performed.

## Human-Centered Review feedback
When a review or impact check detects a real problem or material risk, the UI can show a compact modal with:
- detected problem
- recommended change
- impact / safety boundary
- `変更しない`
- `詳細を見る`
- `修正候補を了承`

`修正候補を了承` only acknowledges the repair candidate. It does not mutate the Repository, expand Authority, increase Budget, or expose Secret values.

Already-complete (`ALREADY_*`) and cancelled flows do not trigger the warning modal.

## API Runtime / Usage visibility
The External Intelligence Control Center now exposes:
- Acquisition Requests
- API Requests
- Provider Response
- Last API Test
- Actual Tokens
- Actual Cost
- Budget Reconciled

Unreconciled estimates are never labeled as actual usage/cost.
Provider response success remains separate from Evidence persistence / Knowledge promotion.

## Expected STEP 7 behavior after application
For the observed real response with:
- input_tokens = 11
- output_tokens = 5
- total_tokens = 16
- model = gpt-5.6-luna

the usage reconciliation produces:
- AI_TOKEN_USAGE = 16
- FINANCIAL_COST = 0.0000082 USD
- reconciliationState = PROVIDER_USAGE_RECONCILED

If the output is `OK`, STEP 7 can complete and advance to STEP 8 Final Validation.

## Validation
- Usage Reconciliation Hotfix: 8/8 PASS
- Human-Centered Review Feedback: 8/8 PASS
- API Runtime / Usage UI: 7/7 PASS
- Real API Test Gate: 20/20 PASS
- Gateway Acquisition Bridge Runtime: 9/9 PASS
- Paid Source Activation: 18/18 PASS
- Usage Policy: 17/17 PASS
- USD Budget: 16/16 PASS
- Operation Contract: 9/9 PASS
- Source Registration: 8/8 PASS
- OpenAI Phase2: 20/20 PASS
- Setup Workflow: 11/11 PASS
- Runtime UI: 10/10 PASS
- API / Secret Manager: 20/20 PASS
- Gateway: 38/38 PASS
- Phase4 Acquisition: 14/14 PASS
- Phase6 Security: 15/15 PASS
- Manifest Integrity: 8/8 PASS (410/410 scripts)
- Critical failures: 0

## Safety boundary
- directRepositoryMutationAllowed = false
- generic ACTIVATE_PAID_API Hard Deny preserved
- EXECUTE_TRADE Hard Deny preserved
- automatic Budget expansion = false
- automatic recharge = false
- Secret values remain outside Browser UI
- this package itself performs no provider network request
