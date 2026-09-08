/* ============================================================
   FILE: 17_external_intelligence_phase3_validation.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.3.0
   Phase 03 Validation
   Decisions: 004 / 023 / 024 / 025
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("EXTERNAL-010 Phase 03 validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase3Validation");
  const PURPOSE = "phase3-validation";
  const EXPECTED_BROWSER_FILES = Object.freeze([
    "17_external_intelligence_version_manifest.js",
    "17_external_intelligence_core.js",
    "17_external_intelligence_contracts.js",
    "17_external_intelligence_schema_registry.js",
    "17_external_intelligence_authority.js",
    "17_external_intelligence_audit.js",
    "17_external_intelligence_runtime_coordination.js",
    "17_external_intelligence_software_supply_chain.js",
    "17_external_intelligence_gateway_client.js",
    "17_external_intelligence_source_registry.js",
    "17_external_intelligence_source_discovery.js",
    "17_external_intelligence_resource_budget.js",
    "17_external_intelligence_usage_policy.js",
    "17_external_intelligence_phase1_validation.js",
    "17_external_intelligence_phase2_validation.js",
    "17_external_intelligence_phase3_validation.js"
  ]);

  function collector() {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : (typeof detail === "string" ? detail : internal.stableStringify(detail)), group: group || "General", severity: severity || "Critical" });
      }
    };
  }

  function summarize(checks) {
    const passed = checks.filter(function item(c) { return c.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function critical(c) { return !c.passed && c.severity === "Critical"; }).length;
    return { passed: passed, failed: failed, total: checks.length, criticalFailed: criticalFailed, health: checks.length ? Math.round((passed / checks.length) * 1000) / 10 : 0 };
  }

  async function grantAuthority(action, targetType, targetId, envelopes) {
    const candidate = namespace.createExternalIntelligenceAuthorityEnvelopeCandidate({
      action: action,
      target: { type: targetType, id: targetId },
      purpose: PURPOSE,
      scope: { domain: "EXTERNAL-010", operation: action, constraints: { validationOnly: true } }
    });
    if (!candidate.ok || !candidate.data || !candidate.data.envelope) return { ok: false, candidate: candidate, activated: null };
    const activated = await namespace.activateExternalIntelligenceAuthorityEnvelope(candidate.data.envelope.authorityEnvelopeId, { validationEvidence: true });
    if (activated && activated.ok) envelopes.push(candidate.data.envelope.authorityEnvelopeId);
    return { ok: Boolean(activated && activated.ok), candidate: candidate, activated: activated };
  }

  async function runExternalIntelligencePhase3Validation() {
    const c = collector();
    const check = c.check;
    const authorityEnvelopes = [];

    check("Release Version is compatible with Phase 03 baseline", VERSION_MANIFEST.isReleaseCompatibleFrom("1.2.0"), VERSION_MANIFEST.release.version, "Foundation");
    check("Implementation Phase is Phase 03 or later", VERSION_MANIFEST.release.phase >= 3, VERSION_MANIFEST.release.implementationPhase, "Foundation");
    check("Design Freeze remains canonical", VERSION_MANIFEST.release.designFreezeId === "EXTERNAL-010-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Foundation");
    check("Roadmap remains 2.1.0", VERSION_MANIFEST.release.implementationRoadmapId === "EXTERNAL-010-IMPLEMENTATION-ROADMAP-2.1.0", VERSION_MANIFEST.release.implementationRoadmapId, "Foundation");
    check("Decision coverage remains 54", VERSION_MANIFEST.release.decisionCount === 54, VERSION_MANIFEST.release.decisionCount, "Foundation");

    const init = await namespace.initializeExternalIntelligenceFoundation();
    check("Phase 03 foundation initializes", init && init.ok === true, init && init.code, "Initialization");

    const phase1 = await namespace.runExternalIntelligencePhase1Validation();
    check("Phase 01 regression remains PASS", phase1 && phase1.failed === 0 && phase1.criticalFailed === 0, phase1 && { passed: phase1.passed, failed: phase1.failed, health: phase1.health }, "Regression");
    const phase2 = await namespace.runExternalIntelligencePhase2Validation({ requireGateway: false });
    check("Phase 02 degraded regression remains PASS", phase2 && phase2.failed === 0 && phase2.criticalFailed === 0 && phase2.gatewayValidated === true, phase2 && { passed: phase2.passed, failed: phase2.failed, health: phase2.health, gatewayValidated: phase2.gatewayValidated }, "Regression");

    Object.keys(VERSION_MANIFEST.safety).forEach(function safetyFlag(key) {
      check("Safety flag " + key + " remains false", (VERSION_MANIFEST.safety[key] === false || (key === "scannerIdentityVerificationRequired" && VERSION_MANIFEST.release.phase >= 6 && VERSION_MANIFEST.safety[key] === true)), VERSION_MANIFEST.safety[key], "Safety");
    });
    check("Registry-first source governance is enabled", VERSION_MANIFEST.sourceGovernance.registryFirst === true && VERSION_MANIFEST.sourceGovernance.arbitraryDirectUrlNormalOperation === false, VERSION_MANIFEST.sourceGovernance, "Source Governance");
    check("Discovery does not grant activation", VERSION_MANIFEST.discovery.controlledInspectionGrantsActivation === false, VERSION_MANIFEST.discovery, "Discovery");
    check("Hard budget limit blocks execution", VERSION_MANIFEST.resourceBudget.hardLimitBlocksExecution === true, VERSION_MANIFEST.resourceBudget, "Budget");
    check("Unknown usage policy defaults to blocked", VERSION_MANIFEST.usagePolicy.unknownDefaultsToAllowed === false, VERSION_MANIFEST.usagePolicy, "Usage Policy");

    const contracts = namespace.listExternalIntelligenceContracts();
    const schemas = namespace.listExternalIntelligenceSchemas();
    check("Phase 03 contracts are registered", contracts.length >= 21, contracts.length, "Contracts");
    check("Phase 03 schemas are registered", schemas.length >= 18, schemas.length, "Schemas");
    ["sourceRecord", "sourceDiscoveryRecord", "controlledInspectionRecord", "resourceBudget", "resourceUsageRecord", "usagePolicy", "phase3ValidationResult"].forEach(function contractPresent(key) {
      check("Contract " + key + " is registered", Boolean(namespace.getExternalIntelligenceContract(key)), key, "Contracts");
    });
    ["EXTERNAL-010-SCHEMA-SOURCE-RECORD", "EXTERNAL-010-SCHEMA-SOURCE-DISCOVERY-RECORD", "EXTERNAL-010-SCHEMA-CONTROLLED-INSPECTION-RECORD", "EXTERNAL-010-SCHEMA-RESOURCE-BUDGET", "EXTERNAL-010-SCHEMA-RESOURCE-USAGE-RECORD", "EXTERNAL-010-SCHEMA-USAGE-POLICY", "EXTERNAL-010-SCHEMA-PHASE3-VALIDATION-RESULT"].forEach(function schemaPresent(id) {
      check("Schema " + id + " is registered", Boolean(namespace.getExternalIntelligenceSchema(id)), id, "Schemas");
    });

    const approvalAdapter = namespace.setExternalIntelligenceAuthorityApprovalAdapter({
      adapterId: "EXTERNAL-010-PHASE3-VALIDATION-OWNER",
      requiresExplicitOwnerInteraction: true,
      verifyApproval: async function verifyApproval() { return { approved: true, actorType: "Project Owner", interactionEvidenceId: internal.nextId("PHASE3-OWNER-APPROVAL") }; }
    });
    check("Project Owner validation approval adapter can be configured", approvalAdapter.ok === true, approvalAdapter.code, "Authority", "Warning");

    try {
      const discovery = namespace.createExternalIntelligenceSourceDiscovery({
        candidateUrl: "https://data.example.test/api",
        discoveredBy: "Phase 03 Validation",
        discoveryReason: "USER_REQUEST",
        sourceTypeCandidate: "PUBLIC_API",
        goalId: "PHASE3-GOAL",
        planId: "PHASE3-PLAN"
      });
      check("Source candidate can be discovered", discovery.ok === true && discovery.data.discovery.lifecycleState === "DISCOVERED", discovery.data || discovery.code, "Discovery");
      check("Discovery grants no registration or activation authority", discovery.ok === true && discovery.data.discovery.registrationAuthorityGranted === false && discovery.data.discovery.activationAuthorityGranted === false, discovery.data && discovery.data.discovery, "Discovery");
      const discoveryId = discovery.ok ? discovery.data.discovery.discoveryId : null;

      const identified = discoveryId ? namespace.identifyExternalIntelligenceSourceCandidate({ discoveryId: discoveryId, provider: "Example Public Data", canonicalHost: "data.example.test", officialReference: "https://data.example.test/terms", httpsObserved: true, identityState: "VERIFIED" }) : null;
      check("Discovered source can be identified without trust grant", identified && identified.ok === true && identified.data.discovery.lifecycleState === "IDENTIFIED" && identified.data.trustGranted === false, identified && (identified.data || identified.code), "Discovery");

      const assessed = discoveryId ? await namespace.assessExternalIntelligenceSourceCandidate({ discoveryId: discoveryId, riskClassification: "LOW", networkRisk: "LOW", payloadRisk: "LOW", promptInjectionRisk: "LOW", authenticationRisk: "LOW", costRisk: "LOW", operationRisk: "READ_ONLY", dataUploadRisk: "NONE", financialCapabilityRisk: "NONE", unknownProviderRisk: "LOW", costClassification: "FREE", authenticationRequirement: "NONE", assessmentEvidenceIds: ["PHASE3-ASSESSMENT-EVIDENCE"] }) : null;
      check("Identified source can be assessed", assessed && assessed.ok === true && assessed.data.discovery.lifecycleState === "ASSESSED", assessed && (assessed.data || assessed.code), "Discovery");
      check("Assessment still grants no activation authority", assessed && assessed.data.discovery.activationAuthorityGranted === false && assessed.data.discovery.registrationAuthorityGranted === false, assessed && assessed.data.discovery, "Discovery");

      const inspection = discoveryId ? namespace.createExternalIntelligenceControlledInspection({ discoveryId: discoveryId, inspectionPurpose: "Validate inspection contract", requestedMethod: "GET" }) : null;
      check("Controlled inspection contract can be created", inspection && inspection.ok === true && inspection.data.inspection.state === "CONTRACT_ONLY", inspection && (inspection.data || inspection.code), "Discovery");
      check("Controlled inspection performs no network execution or activation", inspection && inspection.data.networkExecutionPerformed === false && inspection.data.inspection.networkAuthorityGranted === false && inspection.data.inspection.activationAuthorityGranted === false, inspection && inspection.data, "Discovery");
      check("Controlled inspection requires security boundary", inspection && inspection.data.inspection.securityBoundaryRequired === true && inspection.data.inspection.contentInstructionAuthorityGranted === false, inspection && inspection.data.inspection, "Discovery");

      const uniqueSuffix = Date.now().toString(36).toUpperCase();
      const mainSourceId = "SOURCE-PHASE3-" + uniqueSuffix;
      const registerAuthority = await grantAuthority("REGISTER_EXTERNAL_SOURCE", "source", mainSourceId, authorityEnvelopes);
      check("Source registration authority can be explicitly granted", registerAuthority.ok === true, registerAuthority.activated && registerAuthority.activated.code, "Authority", "Warning");

      const secretRejected = await namespace.registerExternalIntelligenceSource({
        sourceId: "SOURCE-SECRET-" + uniqueSuffix,
        sourceName: "Invalid Secret Source",
        sourceType: "PUBLIC_API",
        provider: "Invalid",
        accessMode: "LOCAL_GATEWAY",
        adapterId: "HTTP_JSON_ADAPTER",
        authenticationMode: "API_KEY",
        apiKey: "must-not-be-stored",
        allowedOperations: ["READ"],
        allowedMethods: ["GET"],
        pricingMode: "FREE",
        purpose: PURPOSE
      });
      check("Secret-bearing source registration is rejected", secretRejected.ok === false && secretRejected.code === "EXTERNAL010_SOURCE_REGISTRATION_INVALID" && secretRejected.data.errors.includes("SECRET_VALUE_PRESENT"), secretRejected.data || secretRejected.code, "Source Governance");

      const registered = await namespace.registerExternalIntelligenceSource({
        sourceId: mainSourceId,
        sourceName: "Phase 03 Validation Public Source",
        sourceType: "PUBLIC_API",
        provider: "Example Public Data",
        category: "RESEARCH",
        accessMode: "LOCAL_GATEWAY",
        adapterId: "HTTP_JSON_ADAPTER",
        endpointPolicy: { canonicalHost: "data.example.test", endpointReference: "official-api", allowRedirects: false },
        authenticationMode: "NONE",
        allowedOperations: ["READ", "INTERNAL_ANALYSIS", "EXPORT"],
        allowedMethods: ["GET"],
        pricingMode: "FREE",
        identityState: "VERIFIED",
        discoveryId: discoveryId,
        purpose: PURPOSE
      });
      check("Assessed source can be registered by stable sourceId", registered.ok === true && registered.data.source.sourceId === mainSourceId && registered.data.source.lifecycleState === "REGISTERED", registered.data || registered.code, "Source Governance");
      check("Registration does not enable source", registered.ok === true && registered.data.source.enabled === false && registered.data.source.authorityGranted === false, registered.data && registered.data.source, "Source Governance");
      check("Source identity grants no reliability", registered.ok === true && registered.data.source.reliabilityState === "UNASSESSED", registered.data && registered.data.source, "Source Governance");
      check("Source registry stores no secret value", registered.ok === true && registered.data.source.secretReferenceId === null, registered.data && registered.data.source, "Source Governance");
      check("Endpoint policy forbids arbitrary direct URL normal operation", registered.ok === true && registered.data.source.endpointPolicy.directUrlAccessAllowed === false && registered.data.source.endpointPolicy.operationResolutionRequired === true, registered.data && registered.data.source.endpointPolicy, "Source Governance");

      const duplicate = await namespace.registerExternalIntelligenceSource({ sourceId: mainSourceId, sourceName: "Duplicate", sourceType: "PUBLIC_API", provider: "Duplicate", accessMode: "LOCAL_GATEWAY", adapterId: "HTTP_JSON_ADAPTER", authenticationMode: "NONE", allowedOperations: ["READ"], allowedMethods: ["GET"], pricingMode: "FREE", purpose: PURPOSE });
      check("Duplicate sourceId registration is rejected", duplicate.ok === false && duplicate.code === "EXTERNAL010_SOURCE_DUPLICATE", duplicate.code, "Source Governance");

      const unregisteredResolve = namespace.resolveExternalIntelligenceSourceForOperation({ sourceId: "SOURCE-UNREGISTERED-" + uniqueSuffix, operation: "READ" });
      check("Unregistered source normal operation is blocked", unregisteredResolve.ok === false && unregisteredResolve.code === "EXTERNAL010_UNREGISTERED_SOURCE_ACCESS_BLOCKED", unregisteredResolve.code, "Source Governance");

      const beforePolicy = namespace.checkExternalIntelligenceUsagePolicy({ sourceId: mainSourceId, operation: "READ" });
      check("Missing usage policy remains UNKNOWN and blocked", beforePolicy.ok === false && beforePolicy.code === "EXTERNAL010_USAGE_POLICY_UNKNOWN" && beforePolicy.data.unknownUsagePolicyEqualsAllowed === false, beforePolicy.data || beforePolicy.code, "Usage Policy");

      const policyCandidate = namespace.createExternalIntelligenceUsagePolicyCandidate({
        sourceId: mainSourceId,
        policyVersion: "1",
        effectiveAt: internal.nowIso(),
        policyEvidenceIds: ["POLICY-EVIDENCE-PHASE3-001"],
        analysisVersion: "1.2.0",
        policyCompleteness: "COMPLETE",
        interpretationConfidence: "HIGH",
        rights: {
          READ: { state: "ALLOWED", evidenceIds: ["POLICY-EVIDENCE-PHASE3-001"], clauseReference: "clause-read", confidence: "HIGH" },
          INTERNAL_ANALYSIS: { state: "ALLOWED_WITH_CONDITIONS", conditions: ["internal-only"], evidenceIds: ["POLICY-EVIDENCE-PHASE3-001"], clauseReference: "clause-analysis", confidence: "HIGH" },
          EXPORT: { state: "BLOCKED", evidenceIds: ["POLICY-EVIDENCE-PHASE3-001"], clauseReference: "clause-export", confidence: "HIGH" },
          COMMERCIAL_USE: { state: "AMBIGUOUS", evidenceIds: ["POLICY-EVIDENCE-PHASE3-001"], clauseReference: "clause-commercial", confidence: "LOW" }
        }
      });
      check("Usage policy candidate preserves evidence and ambiguity", policyCandidate.ok === true && policyCandidate.data.usagePolicy.status === "REVIEW_REQUIRED" && policyCandidate.data.usagePolicy.policyEvidenceIds.includes("POLICY-EVIDENCE-PHASE3-001"), policyCandidate.data || policyCandidate.code, "Usage Policy");
      check("AI policy interpretation grants no legal authority", policyCandidate.ok === true && policyCandidate.data.legalAuthorityGranted === false && policyCandidate.data.usagePolicy.aiInterpretationEqualsLegalAuthority === false, policyCandidate.data && policyCandidate.data.usagePolicy, "Usage Policy");

      const policyId = policyCandidate.ok ? policyCandidate.data.usagePolicy.usagePolicyId : null;
      const policyAuthority = policyId ? await grantAuthority("ACTIVATE_USAGE_POLICY", "usage-policy", policyId, authorityEnvelopes) : { ok: false };
      check("Usage policy activation authority can be explicitly granted", policyAuthority.ok === true, policyAuthority.activated && policyAuthority.activated.code, "Authority", "Warning");
      const policyActivated = policyId ? await namespace.activateExternalIntelligenceUsagePolicy({ usagePolicyId: policyId, purpose: PURPOSE }) : null;
      check("Governed usage policy can be activated", policyActivated && policyActivated.ok === true && policyActivated.data.usagePolicy.status === "ACTIVE", policyActivated && (policyActivated.data || policyActivated.code), "Usage Policy");

      const readPolicy = namespace.checkExternalIntelligenceUsagePolicy({ sourceId: mainSourceId, operation: "READ" });
      check("Explicit READ permission is allowed", readPolicy.ok === true && readPolicy.data.right.state === "ALLOWED", readPolicy.data || readPolicy.code, "Usage Policy");
      const exportPolicy = namespace.checkExternalIntelligenceUsagePolicy({ sourceId: mainSourceId, operation: "EXPORT" });
      check("Explicit EXPORT block is enforced", exportPolicy.ok === false && exportPolicy.data.right.state === "BLOCKED", exportPolicy.data || exportPolicy.code, "Usage Policy");
      const missingPolicy = namespace.checkExternalIntelligenceUsagePolicy({ sourceId: mainSourceId, operation: "MODEL_TRAINING" });
      check("Missing operation rule remains UNKNOWN", missingPolicy.ok === false && missingPolicy.data.right.state === "UNKNOWN", missingPolicy.data || missingPolicy.code, "Usage Policy");
      const ambiguousPolicy = namespace.checkExternalIntelligenceUsagePolicy({ sourceId: mainSourceId, operation: "COMMERCIAL_USE" });
      check("Ambiguous operation rule is not treated as allowed", ambiguousPolicy.ok === false && ambiguousPolicy.data.right.state === "AMBIGUOUS", ambiguousPolicy.data || ambiguousPolicy.code, "Usage Policy");

      const enableAuthority = await grantAuthority("ENABLE_EXTERNAL_SOURCE", "source", mainSourceId, authorityEnvelopes);
      const activateAuthority = await grantAuthority("ACTIVATE_EXTERNAL_SOURCE", "source", mainSourceId, authorityEnvelopes);
      const disableAuthority = await grantAuthority("DISABLE_EXTERNAL_SOURCE", "source", mainSourceId, authorityEnvelopes);
      check("Source enable/activate/disable authorities are scoped", enableAuthority.ok && activateAuthority.ok && disableAuthority.ok, { enable: enableAuthority.ok, activate: activateAuthority.ok, disable: disableAuthority.ok }, "Authority", "Warning");

      const enableBlockedOperation = await namespace.enableExternalIntelligenceSource({ sourceId: mainSourceId, operations: ["READ", "EXPORT"], purpose: PURPOSE });
      check("Source enablement is blocked when one requested operation violates usage policy", enableBlockedOperation.ok === false && enableBlockedOperation.code === "EXTERNAL010_SOURCE_USAGE_POLICY_BLOCKED", enableBlockedOperation.data || enableBlockedOperation.code, "Source Governance");
      const enabled = await namespace.enableExternalIntelligenceSource({ sourceId: mainSourceId, operations: ["READ", "INTERNAL_ANALYSIS"], purpose: PURPOSE });
      check("Allowed source operations can be enabled", enabled.ok === true && enabled.data.source.lifecycleState === "ENABLED", enabled.data || enabled.code, "Source Governance");
      const active = await namespace.activateExternalIntelligenceSource({ sourceId: mainSourceId, purpose: PURPOSE });
      check("Enabled free source can be activated with authority", active.ok === true && active.data.source.lifecycleState === "ACTIVE", active.data || active.code, "Source Governance");
      const resolved = namespace.resolveExternalIntelligenceSourceForOperation({ sourceId: mainSourceId, operation: "READ" });
      check("Active source READ resolves by stable sourceId", resolved.ok === true && resolved.data.sourceId === mainSourceId && resolved.data.operationId === "READ", resolved.data || resolved.code, "Source Governance");
      check("Resolved source grants no reliability/economic/source authority", resolved.ok === true && resolved.data.reliabilityGranted === false && resolved.data.economicAuthorityGranted === false && resolved.data.sourceAuthorityGranted === false, resolved.data, "Source Governance");
      const blockedExportResolve = namespace.resolveExternalIntelligenceSourceForOperation({ sourceId: mainSourceId, operation: "EXPORT" });
      check("Blocked usage right also blocks source resolution", blockedExportResolve.ok === false && blockedExportResolve.code === "EXTERNAL010_SOURCE_USAGE_POLICY_BLOCKED", blockedExportResolve.data || blockedExportResolve.code, "Source Governance");

      const termsHook = namespace.setExternalIntelligenceTermsAnalysisHook({
        hookId: "PHASE3-TERMS-HOOK",
        analyze: async function analyze() {
          return { policyVersion: "2-candidate", policyEvidenceIds: ["POLICY-EVIDENCE-PHASE3-002"], policyCompleteness: "PARTIAL", interpretationConfidence: "MEDIUM", analysisStatus: "SUCCESS", rights: { READ: { state: "ALLOWED", evidenceIds: ["POLICY-EVIDENCE-PHASE3-002"], confidence: "MEDIUM" }, EXPORT: { state: "REVIEW_REQUIRED", evidenceIds: ["POLICY-EVIDENCE-PHASE3-002"], confidence: "LOW" } } };
        }
      });
      check("Terms analysis hook can be configured", termsHook.ok === true, termsHook.code, "Usage Policy", "Warning");
      const termsCandidate = await namespace.analyzeExternalIntelligenceTerms({ sourceId: mainSourceId, policyEvidenceIds: ["POLICY-EVIDENCE-PHASE3-002"] });
      check("AI terms analysis creates candidate, not legal authority", termsCandidate.ok === true && termsCandidate.data.usagePolicy.status === "REVIEW_REQUIRED" && termsCandidate.data.legalAuthorityGranted === false, termsCandidate.data || termsCandidate.code, "Usage Policy");
      check("Policy change is detected against active version", termsCandidate.ok === true && termsCandidate.data.usagePolicy.policyChangeDetected === true, termsCandidate.data && termsCandidate.data.usagePolicy, "Usage Policy");
      namespace.setExternalIntelligenceTermsAnalysisHook(null);
      const researchGoal = namespace.createExternalIntelligenceTermsResearchGoal({ sourceId: mainSourceId, reason: "Ambiguous commercial rights" });
      check("Unknown/ambiguous terms can create research goal without authority", researchGoal.ok === true && researchGoal.data.goal.activationAuthorityGranted === false && researchGoal.data.goal.legalAuthorityGranted === false, researchGoal.data || researchGoal.code, "Usage Policy");

      const budgetCandidate = namespace.createExternalIntelligenceResourceBudgetCandidate({
        scopeType: "GLOBAL",
        scopeId: "EXTERNAL-010",
        period: { type: "VALIDATION_RUN" },
        currency: "JPY",
        limits: {
          REQUEST_COUNT: { softLimit: 3, hardLimit: 5 },
          NETWORK_BYTES: { softLimit: 1000, hardLimit: 2000 },
          FINANCIAL_COST: { softLimit: 10, hardLimit: 20 }
        }
      });
      check("Resource budget candidate can be created", budgetCandidate.ok === true && budgetCandidate.data.budget.state === "CANDIDATE", budgetCandidate.data || budgetCandidate.code, "Budget");
      check("Budget candidate grants no spending/trading authority", budgetCandidate.ok === true && budgetCandidate.data.budget.authorityGranted === false && budgetCandidate.data.budget.automaticReallocationAllowed === false, budgetCandidate.data && budgetCandidate.data.budget, "Budget");
      const budgetId = budgetCandidate.ok ? budgetCandidate.data.budget.budgetId : null;
      const budgetAuthority = budgetId ? await grantAuthority("ACTIVATE_RESOURCE_BUDGET", "resource-budget", budgetId, authorityEnvelopes) : { ok: false };
      check("Resource budget activation authority can be explicitly granted", budgetAuthority.ok === true, budgetAuthority.activated && budgetAuthority.activated.code, "Authority", "Warning");
      const budgetActivated = budgetId ? await namespace.activateExternalIntelligenceResourceBudget({ budgetId: budgetId, purpose: PURPOSE }) : null;
      check("Resource budget can be activated", budgetActivated && budgetActivated.ok === true && budgetActivated.data.budget.state === "ACTIVE", budgetActivated && (budgetActivated.data || budgetActivated.code), "Budget");

      const budgetPass = namespace.checkExternalIntelligenceResourceBudget({ budgetIds: [budgetId], pricingMode: "FREE", estimatedUsage: { REQUEST_COUNT: 2, NETWORK_BYTES: 500, FINANCIAL_COST: 0 } });
      check("Estimated usage within hard limits passes", budgetPass.ok === true && budgetPass.data.hardLimitExceeded === false, budgetPass.data || budgetPass.code, "Budget");
      const softWarning = namespace.checkExternalIntelligenceResourceBudget({ budgetIds: [budgetId], pricingMode: "FREE", estimatedUsage: { REQUEST_COUNT: 4, NETWORK_BYTES: 500, FINANCIAL_COST: 0 } });
      check("Soft budget exceed warns without silently becoming hard block", softWarning.ok === true && softWarning.code === "EXTERNAL010_RESOURCE_BUDGET_SOFT_LIMIT_WARNING" && softWarning.data.softLimitExceeded === true, softWarning.data || softWarning.code, "Budget");
      const usage = await namespace.recordExternalIntelligenceResourceUsage({ operationId: "READ", budgetIds: [budgetId], estimatedUsage: { REQUEST_COUNT: 2, NETWORK_BYTES: 500, FINANCIAL_COST: 0 }, actualUsage: { REQUEST_COUNT: 2, NETWORK_BYTES: 400, FINANCIAL_COST: 0 }, sourceId: mainSourceId, goalId: "PHASE3-GOAL", planId: "PHASE3-PLAN" });
      check("Actual resource usage is reconciled and recorded", usage.ok === true && usage.data.usageRecord.reconciled === true, usage.data || usage.code, "Budget");
      const hardBlock = namespace.checkExternalIntelligenceResourceBudget({ budgetIds: [budgetId], pricingMode: "FREE", estimatedUsage: { REQUEST_COUNT: 4, NETWORK_BYTES: 100, FINANCIAL_COST: 0 } });
      check("Projected hard budget exceed is blocked", hardBlock.ok === false && hardBlock.code === "EXTERNAL010_RESOURCE_BUDGET_HARD_LIMIT_EXCEEDED" && hardBlock.data.priorityMayBypassHardLimit === false, hardBlock.data || hardBlock.code, "Budget");
      const unknownPaid = namespace.checkExternalIntelligenceResourceBudget({ budgetIds: [budgetId], pricingMode: "USAGE_BASED", paidRequest: true, estimatedUsage: { REQUEST_COUNT: 1 } });
      check("Unknown paid cost is never assumed zero", unknownPaid.ok === false && unknownPaid.code === "EXTERNAL010_RESOURCE_BUDGET_UNKNOWN_PAID_COST" && unknownPaid.data.unknownCostMayBeAssumedZero === false, unknownPaid.data || unknownPaid.code, "Budget");
      const budgetProposal = namespace.createExternalIntelligenceAdditionalBudgetProposal({ budgetId: budgetId, reason: "Validation candidate", proposedLimits: { REQUEST_COUNT: { softLimit: 5, hardLimit: 8 } } });
      check("Additional budget proposal grants no budget authority", budgetProposal.ok === true && budgetProposal.data.proposal.budgetAuthorityGranted === false && budgetProposal.data.proposal.automaticAllocationPerformed === false, budgetProposal.data || budgetProposal.code, "Budget");
      const ledger = namespace.getExternalIntelligenceResourceBudgetLedger();
      check("Budget ledger records candidate, activation, usage and hard block", ["BUDGET_CANDIDATE_CREATED", "BUDGET_ACTIVATED", "RESOURCE_USAGE_RECORDED", "BUDGET_HARD_LIMIT_BLOCK"].every(function eventPresent(type) { return ledger.some(function event(item) { return item.eventType === type; }); }), ledger.slice(-8), "Budget");

      const paidDiscovery = namespace.createExternalIntelligenceSourceDiscovery({ candidateUrl: "https://paid.example.test/api", discoveredBy: "Phase 03 Validation", discoveryReason: "AI_RESEARCH", sourceTypeCandidate: "MARKET_DATA" });
      const paidDiscoveryId = paidDiscovery.ok ? paidDiscovery.data.discovery.discoveryId : null;
      if (paidDiscoveryId) namespace.identifyExternalIntelligenceSourceCandidate({ discoveryId: paidDiscoveryId, provider: "Paid Example", canonicalHost: "paid.example.test", identityState: "VERIFIED", httpsObserved: true });
      if (paidDiscoveryId) await namespace.assessExternalIntelligenceSourceCandidate({ discoveryId: paidDiscoveryId, riskClassification: "MEDIUM", costClassification: "USAGE_BASED", authenticationRequirement: "NONE", operationRisk: "READ_ONLY" });
      const paidSourceId = "SOURCE-PAID-" + uniqueSuffix;
      const paidRegisterAuthority = await grantAuthority("REGISTER_EXTERNAL_SOURCE", "source", paidSourceId, authorityEnvelopes);
      check("Paid source registration remains separate from subscription authority", paidRegisterAuthority.ok === true, paidRegisterAuthority.activated && paidRegisterAuthority.activated.code, "Authority", "Warning");
      const paidRegistered = await namespace.registerExternalIntelligenceSource({ sourceId: paidSourceId, sourceName: "Paid Phase 03 Source", sourceType: "MARKET_DATA", provider: "Paid Example", accessMode: "LOCAL_GATEWAY", adapterId: "HTTP_JSON_ADAPTER", authenticationMode: "NONE", allowedOperations: ["READ"], allowedMethods: ["GET"], pricingMode: "USAGE_BASED", discoveryId: paidDiscoveryId, purpose: PURPOSE });
      check("Paid source may be registered without being subscribed or enabled", paidRegistered.ok === true && paidRegistered.data.source.enabled === false, paidRegistered.data || paidRegistered.code, "Source Governance");
      const paidEnable = await namespace.enableExternalIntelligenceSource({ sourceId: paidSourceId, operations: ["READ"], purpose: PURPOSE });
      check("Paid source cannot auto-enable without separate economic authority", paidEnable.ok === false && paidEnable.code === "EXTERNAL010_PAID_SOURCE_ENABLEMENT_REQUIRES_SEPARATE_ECONOMIC_AUTHORITY", paidEnable.data || paidEnable.code, "Source Governance");

      const disabled = await namespace.disableExternalIntelligenceSource({ sourceId: mainSourceId, purpose: PURPOSE, reason: "Phase 03 validation cleanup" });
      check("Source can be disabled without deleting history", disabled.ok === true && disabled.data.source.lifecycleState === "DISABLED" && disabled.data.historicalEvidenceDeletionPerformed === false, disabled.data || disabled.code, "Source Governance");
      const history = namespace.getExternalIntelligenceSourceHistory(mainSourceId);
      check("Source version history is retained across register/enable/activate/disable", history.length >= 4 && history[0].lifecycleState === "REGISTERED" && history[history.length - 1].lifecycleState === "DISABLED", history.map(function row(v) { return { version: v.version, state: v.lifecycleState }; }), "Source Governance");
      const discoveryAfterDisable = discoveryId ? namespace.getExternalIntelligenceSourceDiscovery(discoveryId) : null;
      check("Discovery lifecycle stays linked to governed source lifecycle", discoveryAfterDisable && discoveryAfterDisable.lifecycleState === "DISABLED" && discoveryAfterDisable.sourceId === mainSourceId, discoveryAfterDisable, "Discovery");
      const disabledResolve = namespace.resolveExternalIntelligenceSourceForOperation({ sourceId: mainSourceId, operation: "READ" });
      check("Disabled source cannot be used", disabledResolve.ok === false && disabledResolve.code === "EXTERNAL010_SOURCE_NOT_ACTIVE", disabledResolve.code, "Source Governance");

      const auditChain = await namespace.verifyExternalIntelligenceAuditChain();
      check("Phase 03 governance audit chain remains valid", auditChain.valid === true, { valid: auditChain.valid, eventCount: auditChain.eventCount }, "Audit");

      EXPECTED_BROWSER_FILES.forEach(function fileMapped(file) {
        check("Browser file mapped: " + file, file === "17_external_intelligence_version_manifest.js" || Boolean(VERSION_MANIFEST.fileModules[file]), file, "Static Integration");
      });
      ["core", "contracts", "schemaRegistry", "authority", "audit", "runtimeCoordination", "softwareSupplyChain", "gatewayClient", "sourceRegistry", "sourceDiscovery", "resourceBudget", "usagePolicy", "phase1Validation", "phase2Validation", "phase3Validation"].forEach(function moduleLoaded(name) {
        check("Module " + name + " is loaded", Boolean(namespace.modules[name]), namespace.modules[name] && namespace.modules[name].status, "Modules");
      });
    } catch (error) {
      check("Phase 03 validation execution completes without exception", false, { message: error && error.message || String(error), stack: error && error.stack || null }, "Validation");
    } finally {
      authorityEnvelopes.forEach(function revoke(id) { namespace.revokeExternalIntelligenceAuthorityEnvelope(id, "Phase 03 validation completed"); });
      namespace.setExternalIntelligenceAuthorityApprovalAdapter(null);
      if (typeof namespace.setExternalIntelligenceTermsAnalysisHook === "function") namespace.setExternalIntelligenceTermsAnalysisHook(null);
      if (typeof namespace.setExternalIntelligenceSourceRiskAssessmentHook === "function") namespace.setExternalIntelligenceSourceRiskAssessmentHook(null);
    }

    const summary = summarize(c.checks);
    const passedGate = summary.failed === 0 && summary.criticalFailed === 0;
    const result = {
      id: internal.nextId("EXTERNAL-010-PHASE3-VALIDATION"),
      componentId: "EXTERNAL-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      designFreezeId: VERSION_MANIFEST.release.designFreezeId,
      roadmapId: VERSION_MANIFEST.release.implementationRoadmapId,
      decisionCoverage: VERSION_MANIFEST.release.decisionCount,
      passed: summary.passed,
      failed: summary.failed,
      total: summary.total,
      health: summary.health,
      criticalFailed: summary.criticalFailed,
      status: passedGate ? "EXTERNAL-010 Phase 03 Validation PASS" : "EXTERNAL-010 Phase 03 Validation FAIL",
      releaseAllowed: passedGate,
      phase3Complete: passedGate,
      phase4Allowed: passedGate,
      checks: c.checks,
      safety: internal.clone(VERSION_MANIFEST.safety),
      validatedAt: internal.nowIso()
    };

    const contractValidation = namespace.validateExternalIntelligenceContract("phase3ValidationResult", result);
    const schemaValidation = namespace.validateExternalIntelligenceRecord("EXTERNAL-010-SCHEMA-PHASE3-VALIDATION-RESULT", result);
    if (!contractValidation.valid || !schemaValidation.valid) {
      result.failed += 1;
      result.total += 1;
      result.criticalFailed += 1;
      result.health = Math.round((result.passed / result.total) * 1000) / 10;
      result.status = "EXTERNAL-010 Phase 03 Validation FAIL";
      result.releaseAllowed = false;
      result.phase3Complete = false;
      result.phase4Allowed = false;
      result.checks.push({ name: "Phase 03 result validates against contract and schema", passed: false, detail: internal.stableStringify({ contract: contractValidation, schema: schemaValidation }), group: "Validation", severity: "Critical" });
    } else {
      result.checks.push({ name: "Phase 03 result validates against contract and schema", passed: true, detail: "valid", group: "Validation", severity: "Critical" });
      result.passed += 1;
      result.total += 1;
      result.health = Math.round((result.passed / result.total) * 1000) / 10;
    }

    state.latestPhase3Validation = internal.deepFreeze(internal.clone(result));
    namespace.modules.phase3Validation.status = result.failed === 0 ? "Passed" : "Failed";
    internal.touch();
    return internal.clone(result);
  }

  function getLatestExternalIntelligencePhase3Validation() { return state.latestPhase3Validation ? internal.clone(state.latestPhase3Validation) : null; }

  Object.assign(namespace.api, {
    runExternalIntelligencePhase3Validation: runExternalIntelligencePhase3Validation,
    getLatestExternalIntelligencePhase3Validation: getLatestExternalIntelligencePhase3Validation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase3Validation = {
    id: "EXTERNAL-010-PHASE3-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    decisions: ["004", "023", "024", "025"],
    pcValidationRequired: true,
    androidValidationRequired: true,
    liveGatewayRequired: false,
    expectedBrowserFiles: EXPECTED_BROWSER_FILES.slice(),
    loadedAt: internal.nowIso()
  };

  global.runExternalIntelligencePhase3Validation = runExternalIntelligencePhase3Validation;
  global.getLatestExternalIntelligencePhase3Validation = getLatestExternalIntelligencePhase3Validation;
})(typeof window !== "undefined" ? window : globalThis);
