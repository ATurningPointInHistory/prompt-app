AI Prompt OS / EXTERNAL-010 Local Gateway
Phase 02 Foundation + Phase 04 Governed Acquisition
Gateway v1.2.0

Purpose:
- Loopback-only Node.js gateway
- Minimal health endpoint
- Ephemeral browser session
- Request freshness / nonce / replay protection
- Runtime identity
- Governed public JSON acquisition for Phase 04
- Zero external npm dependencies

Start on Windows:
  start_gateway.bat

Or:
  node gateway.cjs

Default endpoint:
  http://127.0.0.1:43110

Default allowed browser origin:
  https://aturningpointinhistory.github.io

Optional exact-origin override (comma separated):
  EXTERNAL010_ALLOWED_ORIGINS

Phase 04 acquisition target allowlist (comma separated hostnames):
  EXTERNAL010_ACQUISITION_ALLOWED_HOSTS

Remote HTTP acquisition is blocked by default. For controlled local validation only:
  EXTERNAL010_ALLOW_HTTP_ACQUISITION=true

Optional port override:
  EXTERNAL010_GATEWAY_PORT

Do not expose this server to a remote interface.
The implementation intentionally binds to 127.0.0.1 only.

Phase 02 regression validation:
  node validate_gateway.cjs

Phase 04 real HTTP gateway validation:
  node validate_phase4_acquisition.cjs

PC browser real-runtime helper services:
  start_phase4_pc_runtime.bat

No npm install is required.

Phase 05 Immutable Evidence / Persistence
-----------------------------------------
PC persistence validator:
  node validate_phase5_persistence.cjs

Interactive browser runtime services:
  .\start_phase5_pc_runtime.bat

Phase 05 persistence uses Node built-ins only. Raw content is stored in a SHA-256
content-addressed file store, while metadata/evidence/checkpoints use node:sqlite.
The browser never becomes the SQLite writer; the Local Gateway remains the single
writer boundary. Bulk external evidence is not automatically included in project ZIPs.
