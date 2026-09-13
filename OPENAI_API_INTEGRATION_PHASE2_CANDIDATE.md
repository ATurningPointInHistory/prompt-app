# OpenAI API Integration Phase 2 Candidate

Decision: EXTERNAL-010-DECISION-055 (Accepted / Frozen)
Parent canonical baseline: EXTERNAL-010 v1.20.1 FINAL_FREEZE
Starting implementation baseline: OpenAI API Integration Phase 1 Candidate DIFF (already implemented)
Candidate version: 0.2.0
Live paid OpenAI request: NOT PERFORMED

## Implemented in this delta

- Phase 1 POST JSON transport is reused; it is not re-implemented.
- Source Registry now permits POST only under a governed scope: AI_SERVICE + LOCAL_GATEWAY + explicit source allowedMethods.
- Operation Contract verifies the HTTP method is explicitly allowed by the source.
- Generic JSON Body Policy now supports fixedFields; OpenAI fixes `store` to `false` in both browser validation and Gateway validation.
- Acquisition Request supports request-scoped estimatedUsage so paid cost is checked per request rather than using a static operation estimate.
- OpenAI Provider Profile added for `SOURCE-OPENAI` / Responses API `/v1/responses` / Bearer reference-only authentication.
- Initial registered models: `gpt-5.6-luna`, `gpt-5.6-terra`, `gpt-5.6-sol`.
- Pricing metadata is versioned/effective-dated and USD-based. Cached-input discount is NOT assumed; until independently verified, cached input is conservatively accounted at standard input rate.
- `max_output_tokens` is mandatory and model-bounded.
- Initial scope blocks streaming, background, tools, files, web search and computer use.
- Retry is hard limited to 1 for the initial OpenAI profile.
- Preflight computes FINANCIAL_COST and requires an explicit per-request USD hard cap and active USD Budget.
- Paid activation uses a separate scoped authority `ACTIVATE_GOVERNED_PAID_SOURCE`; the existing generic hard deny `ACTIVATE_PAID_API` remains intact.
- Paid activation requires active Secret Reference, Usage Policy, operation contract, USD Budget, per-request hard cap and Project Owner-approved authority evidence.
- Pre-approved scope does not require human confirmation for every request.
- Provider usage extraction and cost reconciliation are added. Missing/ambiguous provider usage reserves the preflight estimate instead of silently recording zero cost.
- Cost/Risk-aware UI added to EXTERNAL-010 Control Center with progressive disclosure:
  - Simple settings
  - Cost / usage
  - Advanced settings
  - Safety / authority
- UI shows model, budget usage/limit, per-request cap, external transmission category, Tools/Streaming state and GREEN/YELLOW/RED risk status.
- Material cost changes show before/after impact; 4x-or-greater per-request cap increase is treated as RED and is not auto-saved.
- API key values are never requested by the browser UI.

## Decision 055 Traceability status

- IMPLEMENTED: 28 / 31
- PARTIAL: 2 / 31
  - Audit / Evidence / Lineage integration: code path exists, runtime proof remains.
  - Backward compatibility validation: static/Gateway regression passed; cross-platform runtime proof remains.
- PENDING: 1 / 31
  - PC / Android applicable validation.

## Final candidate validation

- OpenAI Phase 2 unit/safety: 20 / 20 PASS
- Existing Gateway baseline: 38 / 38 PASS
- Phase 4 Gateway Acquisition regression: 14 / 14 PASS
- Phase 6 Gateway Security regression: 15 / 15 PASS
- Script Manifest integrity: 410 / 410 PASS
- Critical failures: 0 in executed Gateway validations

No real OpenAI API request was sent and no paid activation was performed.

## Promotion gates still required

1. PC browser runtime validation of Decision 055 candidate.
2. Local Gateway runtime validation with a configured Secret Reference, without exposing the key to Browser/Repository/Evidence.
3. Project Owner-approved USD Budget and governed paid activation scope.
4. One deliberately small real OpenAI Responses API test request.
5. Actual usage / financial cost reconciliation check against that request.
6. Android applicable validation.
7. Decision 055 conformance review before any Final Release promotion.

The v1.20.1 FINAL_FREEZE remains the canonical parent and is not overwritten by this Candidate.
