# OpenAI API Integration v0.3.4 Candidate

## Scope
Usage Policy Authority Gate for SOURCE-OPENAI / INTERNAL_ANALYSIS, plus UI clarification for the per-request hard cap edit location.

## Added
- Usage Policy review
- Usage Policy Candidate creation
- Project Owner explicit activation Gate
- Trusted user interaction requirement
- One-time ACTIVATE_USAGE_POLICY authority with immediate revoke
- INTERNAL_ANALYSIS only, ALLOWED_WITH_CONDITIONS
- legalAuthorityGranted=false / aiInterpretationEqualsLegalAuthority=false
- Active USD Budget required before policy creation
- Paid Source activation and real API request remain disabled
- Budget panel now states that 1-request Hard Cap is changed in Simple Settings

## Validation
- Usage Policy Gate: 17/17 PASS
- USD Budget Gate: 16/16 PASS
- Operation Contract Gate: 9/9 PASS
- API / Secret Manager v1: 20/20 PASS
- Gateway baseline: 38/38 PASS
- Phase 4: 14/14 PASS
- Phase 6: 15/15 PASS
- Static Script Manifest: 410/410
- Critical Failed: 0

## Safety
No Paid Source activation, real OpenAI API request, automatic budget expansion, automatic recharge, or legal-authority assertion is performed by this Candidate.
