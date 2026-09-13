# OpenAI API Integration Phase 2 v0.2.3 Secret Setup UI Hotfix Candidate

- Parent: Phase 2 v0.2.2 Provider Workflow Hotfix
- Decision: EXTERNAL-010-DECISION-055
- Adds `Secret準備確認` to OpenAI UI.
- Checks Gateway `SECRET-OPENAI-PRIMARY` via `/v1/secret/status` using reference only.
- Browser metadata is registered only after Gateway confirms the secret is ACTIVE.
- Browser never receives or stores the secret value.
- Missing Gateway secret fails closed and directs the operator to set the Gateway process environment and restart Gateway.
- Provider registration is NOT performed.
- Paid API request is NOT performed.

Manifest Hash: `4d6ac3edbadcca358382af371e52c0b43f849c55882a3843952934c3f2ef92af`
Script Set Hash: `c7f1507bf6c10b40a01c931efc70441150811081bca917c3e6f74545840e9973`
