# API / Secret Manager v1 Candidate

Decision: `EXTERNAL-010-DECISION-056` (Accepted / Frozen)
Version: `1.0.0 Candidate`
Launcher: `v1.5.0`
Parent runtime: OpenAI API Integration Phase 2 v0.2.3 + Launcher v1.4.6 Stop Recovery Hotfix

## Implemented scope

- Launcher contains a dedicated **API / Secret Manager**.
- Ordinary operation no longer requires the user to memorize PowerShell commands for API secret injection.
- Secret values are accepted through a masked input and loaded only into the Launcher process environment.
- Secret values are not serialized into Launcher state, BAT, JSON, Browser storage, Repository, Evidence, or audit output.
- Metadata only is persisted in `%LOCALAPPDATA%/AI_Prompt_OS_Launcher/launcher_state.json`.
- OpenAI default credential profiles:
  - `SECRET-OPENAI-LEGACY` = `ACTIVE`
  - `SECRET-OPENAI-PRIMARY` = `STANDBY`
- Credential lifecycle supports `ACTIVE / STANDBY / DISABLED / RETIRED`.
- Manual ACTIVE switching shows before/after impact and does not change Paid Authority or Budget.
- Multiple providers can be represented using generic Provider / Alias / Secret Reference / Secret Type metadata.
- OpenAI Browser UI exposes both LEGACY and PRIMARY Secret Reference identifiers, while remaining secret-value-free.
- When a loaded OpenAI credential is present, Launcher automatically adds only `api.openai.com` to the Gateway acquisition allowlist. Arbitrary provider hosts remain fail-closed.
- Secret changes can be applied to a running Gateway using **Gatewayへ反映（安全に再起動）**. Existing Browser Gateway Session is intentionally invalidated and must be recreated.
- Local secret removal is explicitly distinguished from provider-side API key revocation.
- Automatic credential failover remains disabled in v1.
- Persistent secret storage remains disabled in v1.
- Paid API execution and Provider registration are not automatically performed.

## Not implemented in v1

- Windows Credential Manager / DPAPI persistent secret storage.
- Automatic LEGACY → PRIMARY failover.
- Provider billing/quota error normalization (`credit_balance_exhausted`, auth, rate-limit, network, provider outage).
- Automatic standby notification / failover policy execution.
- Hot-switching the Secret binding of an already registered immutable Source without a governed Source version transition.
- Credential-specific actual-cost ledger attribution.
- Capability OFF / Provider DISABLED execution-layer controls beyond credential lifecycle metadata.
- Secret rotation audit lineage.
- Cross-billing-account Budget compatibility promotion gate.

## Security properties

`API Key possession != Paid Authority` remains unchanged.

The Manager only prepares credential material for the Gateway. Existing Decision 055 Source Registration, Budget, Usage Policy, Authority, Paid Activation, cost preflight, and request execution gates remain separate.

## Expected first OpenAI migration

The currently funded older OpenAI credential can be entered into `OpenAI / LEGACY` and kept `ACTIVE`.
The newer current-account credential can be entered into `OpenAI / PRIMARY` and kept `STANDBY`.

In v1, switching ACTIVE credentials is manual. It does not by itself switch a registered Source or authorize payment. Later phases will bind credential lifecycle to governed Source versions and billing profiles.

## Validation

- API / Secret Manager v1: 20/20 PASS
- OpenAI Phase 2: 20/20 PASS
- Provider Workflow Hotfix: 5/5 PASS
- Secret Setup UI Hotfix: 4/4 PASS
- Gateway baseline: 38/38 PASS
- Phase 4 Acquisition: 14/14 PASS
- Phase 6 Security: 15/15 PASS
- Script Manifest: 410/410 integrity PASS
- Critical Failed: 0
- Real paid OpenAI request: NOT PERFORMED
- Provider registration: NOT PERFORMED

