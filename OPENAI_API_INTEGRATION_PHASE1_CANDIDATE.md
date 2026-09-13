# OpenAI API Integration Phase 1 Candidate

Baseline: EXTERNAL-010 v1.20.1 Final Freeze.

Scope implemented:
- Preserve GET behavior.
- Add explicit POST JSON operation contract support only.
- Add request body contract/policy with required/optional field allowlist and size cap.
- Pass body/bodyPolicy through Browser -> Local Gateway.
- Gateway accepts only GET or POST; POST requires JSON body policy and Content-Type application/json.
- Existing Bearer/API_KEY secret resolution remains unchanged.
- No OpenAI source is auto-registered or activated.
- No paid request is automatically executed.

Next gate before real OpenAI request:
1. OpenAI Source/Operation profile registration.
2. Paid-source activation path with explicit Project Owner authority.
3. USD budget and max-cost preflight.
4. OpenAI usage/cost reconciliation.
5. PC Real Runtime validation, then Android validation.
