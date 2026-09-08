EXTERNAL-010 Phase 10 v1.9.1 Corrective Hotfix

Purpose:
- Formalize Phase 10 Contract Registry entries.
- Formalize Phase 10 Schema Registry entries.
- Formalize EXTERNAL-020 Reliability Input Contract.
- Apply Contract + Schema guards before Phase 10 records enter runtime state.
- Expand Phase 10 validation with negative validation and readback checks.

Not changed:
- Gateway remains 1.4.0.
- Final Reliability Authority remains EXTERNAL-020.
- Existing Phase 05 persistence architecture is not repurposed.
- Phase 11 is not started.

Local validation:
- Phase 10 validation: 23/23 PASS, Health 100.
- Node PC-runtime harness: 7/7 PASS, Health 100.

Project Owner must still perform actual PC and Android real-device validation.
