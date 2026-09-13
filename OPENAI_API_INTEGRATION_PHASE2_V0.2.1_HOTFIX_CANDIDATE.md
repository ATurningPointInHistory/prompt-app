# OpenAI API Integration Phase 2 v0.2.1 Hotfix Candidate

Decision: EXTERNAL-010-DECISION-055
Parent implementation: OpenAI API Integration Phase 2 v0.2.0 Candidate (Phase 1 already applied)

## Scope

1. Gateway Session UI/state synchronization
   - Public state read revalidates session lifetime.
   - An expired ACTIVE session becomes EXPIRED.
   - Expired in-memory session token is cleared.
   - Gateway remains the final enforcement boundary.

2. OpenAI configuration save UI refresh
   - Successful draft save immediately refreshes the External Intelligence Control Center.
   - The saved result remains visible after refresh.
   - No provider registration, paid activation, budget mutation, or API request is performed.

## Validation

- Hotfix-specific: 2/2 PASS
- OpenAI Phase 2 regression: 20/20 PASS
- Gateway baseline: 38/38 PASS
- Phase 4 Acquisition: 14/14 PASS
- Phase 6 Security: 15/15 PASS
- Script Manifest: 410/410 PASS
- Critical failures: 0
- Real paid OpenAI request: NOT PERFORMED

## Promotion state

Candidate only. Apply on top of the already-applied OpenAI API Integration Phase 2 v0.2.0 Candidate.
Do not proceed to Provider registration until this Hotfix is applied and PC UI behavior is reconfirmed.
