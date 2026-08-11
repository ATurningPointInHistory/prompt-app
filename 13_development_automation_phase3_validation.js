/* ============================================================
   FILE: 13_development_automation_phase3_validation.js
   IDE-190 Development Automation
   Release: 1.2.0 / Module: Phase 3 Validation 1.0.0
   Phase 3: Plan / Propose / Dry Run / Preflight
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) { console.warn("IDE-190 Phase 3 validation blocked: Core or Version Manifest is not loaded."); return; }
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase3Validation");
  const EXPECTED_PHASE3_SCRIPT_FILES = [
    "13_development_automation_planning.js",
    "13_development_automation_proposal.js",
    "13_development_automation_dry_run.js",
    "13_development_automation_preflight.js",
    "13_development_automation_phase3_validation.js"
  ];

  function collector() {
    const checks = [];
    return { checks: checks, check: function check(name, passed, detail, group, severity) { checks.push({ name: name, passed: passed === true, detail: detail == null ? "" : String(detail), group: group || "General", severity: severity || "Critical" }); } };
  }
  function summarize(checks, idPrefix, passStatus, failStatus, extras) {
    const passed = checks.filter(function count(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function count(item) { return !item.passed && item.severity === "Critical"; }).length;
    return Object.assign({ id: internal.nextId(idPrefix), componentId: "IDE-190", version: VERSION_MANIFEST.release.version, implementationPhase: VERSION_MANIFEST.release.implementationPhase, passed: passed, failed: failed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : 0, criticalFailed: criticalFailed, status: failed === 0 ? passStatus : failStatus, checks: checks, validatedAt: internal.nowIso() }, extras || {});
  }
  function getLoadedScriptPaths() {
    if (!global.document || !global.document.scripts) return [];
    return Array.from(global.document.scripts).map(function mapScript(script) {
      const source = String(script && script.src || "");
      if (!source) return "";
      try { return new URL(source, global.document.baseURI).pathname.split("/").pop() || ""; }
      catch (_) { return source.split("?")[0].split("#")[0].split("/").pop() || ""; }
    }).filter(Boolean);
  }

  async function buildPhase3Fixture() {
    const grounded = await namespace.intakeAndGroundLatestIDE180Navigation();
    if (!grounded || grounded.ok !== true || !grounded.data || !grounded.data.grounding) return { grounded: grounded };
    const grounding = grounded.data.grounding;
    const plan = await namespace.createAutomationPlan({
      groundingId: grounding.groundingId,
      objective: "Validate grounded target with a read-only Phase 3 automation plan.",
      operation: { operationType: "Read-Only Grounded Target Validation", capabilityId: "IDE-190-PHASE3-E0-VALIDATION", target: grounding.canonicalTarget, scope: { type: "canonical-target", canonicalId: grounding.canonicalTarget && grounding.canonicalTarget.canonicalId || null }, parameters: { validationOnly: true } },
      automationLevel: "L2", mutationLevel: "M0", requestedExecutionMode: "E0", externalEffectLevel: "X0"
    });
    const proposal = plan && plan.ok ? await namespace.createAutomationProposal({ planId: plan.data.plan.planId, summary: "Read-only proposal for Phase 3 validation.", expectedEffects: ["No Repository mutation", "No application attempt", "No approval request"] }) : null;
    const dryRun = proposal && proposal.ok ? await namespace.runAutomationDryRun({ proposalId: proposal.data.proposal.proposalId }) : null;
    const preflight = dryRun && dryRun.ok ? await namespace.runAutomationPreflight({ dryRunId: dryRun.data.dryRun.dryRunId }) : null;
    return { grounded: grounded, grounding: grounding, planResult: plan, plan: plan && plan.data && plan.data.plan || null, proposalResult: proposal, proposal: proposal && proposal.data && proposal.data.proposal || null, dryRunResult: dryRun, dryRun: dryRun && dryRun.data && dryRun.data.dryRun || null, preflightResult: preflight, preflight: preflight && preflight.data && preflight.data.preflight || null };
  }

  async function runDevelopmentAutomationPhase3Validation() {
    const c = collector(), checks = c.checks, check = c.check;
    const init = namespace.initialize({ requireIDE180: true, requireIDE160: true });
    check("Foundation initialization succeeds", init && init.ok === true, init && init.code, "Initialization", "Critical");
    check("Release Version is 1.2.0", VERSION_MANIFEST.release.version === "1.2.0", VERSION_MANIFEST.release.version, "Manifest", "Critical");
    check("Implementation Phase is Phase 3", VERSION_MANIFEST.implementation.phase === 3, VERSION_MANIFEST.release.implementationPhase, "Manifest", "Critical");
    check("Design Freeze remains exact", VERSION_MANIFEST.release.designFreezeId === "IDE-190-DESIGN-FREEZE-1.0.0", VERSION_MANIFEST.release.designFreezeId, "Manifest", "Critical");
    check("Phases 1 and 2 are recorded complete", JSON.stringify(VERSION_MANIFEST.implementation.completedPhases) === JSON.stringify([1,2]), VERSION_MANIFEST.implementation.completedPhases, "Phase Gate", "Critical");

    Object.keys(VERSION_MANIFEST.safety).forEach(function safety(key) { check("Safety flag remains disabled: " + key, VERSION_MANIFEST.safety[key] === false, VERSION_MANIFEST.safety[key], "Safety", "Critical"); });
    check("L5 remains prohibited", VERSION_MANIFEST.automationLevels.find(function find(x){return x.id === "L5";}).initialPolicy === "PROHIBITED", "L5", "Permission", "Critical");
    check("M3 remains prohibited", VERSION_MANIFEST.mutationLevels.find(function find(x){return x.id === "M3";}).initialPolicy === "PROHIBITED", "M3", "Permission", "Critical");
    check("E2 remains prohibited", VERSION_MANIFEST.executionModes.find(function find(x){return x.id === "E2";}).initialPolicy === "PROHIBITED", "E2", "Permission", "Critical");
    check("X2/X3 remain prohibited", VERSION_MANIFEST.externalEffectLevels.filter(function f(x){return x.id === "X2" || x.id === "X3";}).every(function e(x){return x.initialPolicy === "PROHIBITED";}), "X2/X3", "Permission", "Critical");

    const contracts = namespace.listContractDefinitions();
    check("Ten Phase 1-3 contracts are registered", contracts.length === 10, contracts.length, "Contracts", "Critical");
    ["automationPlan","automationProposal","dryRunRecord","preflightRecord"].forEach(function contract(key) { const def = namespace.getContractDefinition(key); check("Phase 3 contract exists: " + key, Boolean(def && def.version === "1.0.0" && def.readOnly === true), def && def.version, "Contracts", "Critical"); });

    ["planning","proposal","dryRun","preflight"].forEach(function module(key) { check("Module is Ready: " + key, namespace.modules[key] && namespace.modules[key].status === "Ready", namespace.modules[key] && namespace.modules[key].status, "Modules", "Critical"); });
    check("Phase 3 Validation module is loaded", Boolean(namespace.modules.phase3Validation), namespace.modules.phase3Validation && namespace.modules.phase3Validation.status, "Modules", "Critical");

    const api = namespace.getPublicApiDescription();
    check("Planning is implemented", api.planningImplemented === true, api.planningImplemented, "Scope", "Critical");
    check("Proposal is implemented", api.proposalImplemented === true, api.proposalImplemented, "Scope", "Critical");
    check("Dry Run is implemented", api.dryRunImplemented === true, api.dryRunImplemented, "Scope", "Critical");
    check("Preflight is implemented", api.preflightImplemented === true, api.preflightImplemented, "Scope", "Critical");
    check("Gate is not implemented in Phase 3", api.gateImplemented === false, api.gateImplemented, "Scope", "Critical");
    check("Dispatch is not implemented in Phase 3", api.dispatchImplemented === false, api.dispatchImplemented, "Scope", "Critical");
    check("Mutation is not implemented in Phase 3", api.mutationImplemented === false, api.mutationImplemented, "Scope", "Critical");
    check("Persistence is not implemented in Phase 3", api.persistenceImplemented === false, api.persistenceImplemented, "Scope", "Critical");

    const fixture = await buildPhase3Fixture();
    const grounding = fixture.grounding, plan = fixture.plan, proposal = fixture.proposal, dryRun = fixture.dryRun, preflight = fixture.preflight;
    check("V0 Grounding is available", fixture.grounded && fixture.grounded.ok === true && grounding && grounding.groundingStatus === "Grounded", grounding && grounding.groundingStatus, "Grounding", "Critical");
    check("V1 Plan builds", fixture.planResult && fixture.planResult.ok === true, fixture.planResult && fixture.planResult.code, "Plan", "Critical");
    check("Plan is bound to Grounding", plan && plan.groundingId === grounding.groundingId && plan.packageHash === grounding.packageHash && plan.handoffHash === grounding.handoffHash, plan && plan.groundingId, "Plan", "Critical");
    const planHash = plan ? await namespace.verifyAutomationPlanHash(plan) : null;
    check("Plan SHA-256 identity verifies", planHash && planHash.valid === true && /^[a-f0-9]{64}$/.test(plan.planHash), plan && plan.planHash, "Plan", "Critical");
    check("Plan uses V1", plan && plan.validationLayer === "V1", plan && plan.validationLayer, "Plan", "Critical");
    check("Plan does not request Approval", plan && plan.approvalRequested === false, plan && plan.approvalRequested, "Plan", "Critical");
    check("Plan does not Auto Apply", plan && plan.autoApply === false, plan && plan.autoApply, "Plan", "Critical");
    check("Plan cannot Dispatch", plan && plan.dispatchEligible === false, plan && plan.dispatchEligible, "Plan", "Critical");

    check("Proposal builds", fixture.proposalResult && fixture.proposalResult.ok === true, fixture.proposalResult && fixture.proposalResult.code, "Proposal", "Critical");
    check("Proposal is Plan-bound", proposal && proposal.planId === plan.planId && proposal.planHash === plan.planHash, proposal && proposal.planId, "Proposal", "Critical");
    check("Proposal is not Execution Permission", proposal && proposal.executionPermissionGranted === false, proposal && proposal.executionPermissionGranted, "Proposal", "Critical");
    check("Proposal is not Mutation Approval", proposal && proposal.mutationApprovalGranted === false, proposal && proposal.mutationApprovalGranted, "Proposal", "Critical");
    check("Proposal cannot Dispatch", proposal && proposal.dispatchEligible === false, proposal && proposal.dispatchEligible, "Proposal", "Critical");

    check("E0 Dry Run passes", fixture.dryRunResult && fixture.dryRunResult.ok === true && dryRun && dryRun.dryRunStatus === "Passed", dryRun && dryRun.dryRunStatus, "Dry Run", "Critical");
    check("Dry Run uses V2 / E0", dryRun && dryRun.validationLayer === "V2" && dryRun.executionMode === "E0", dryRun && dryRun.validationLayer + "/" + dryRun.executionMode, "Dry Run", "Critical");
    check("E0 repositoryMutation=false", dryRun && dryRun.repositoryMutation === false, dryRun && dryRun.repositoryMutation, "Dry Run", "Critical");
    check("E0 repositoryWriteCount=0", dryRun && dryRun.repositoryWriteCount === 0, dryRun && dryRun.repositoryWriteCount, "Dry Run", "Critical");
    check("E0 sourceUnchanged=true", dryRun && dryRun.sourceUnchanged === true, dryRun && dryRun.sourceUnchanged, "Dry Run", "Critical");
    check("E0 applicationAttempted=false", dryRun && dryRun.applicationAttempted === false, dryRun && dryRun.applicationAttempted, "Dry Run", "Critical");
    check("E0 approvalRequested=false", dryRun && dryRun.approvalRequested === false, dryRun && dryRun.approvalRequested, "Dry Run", "Critical");
    check("E0 autoApply=false", dryRun && dryRun.autoApply === false, dryRun && dryRun.autoApply, "Dry Run", "Critical");
    check("E0 cannot Dispatch", dryRun && dryRun.dispatchEligible === false, dryRun && dryRun.dispatchEligible, "Dry Run", "Critical");

    check("V3 Preflight passes", fixture.preflightResult && fixture.preflightResult.ok === true && preflight && preflight.preflightStatus === "Passed", preflight && preflight.preflightStatus, "Preflight", "Critical");
    check("Preflight uses V3", preflight && preflight.validationLayer === "V3", preflight && preflight.validationLayer, "Preflight", "Critical");
    check("Read-only fixture requires P0", preflight && preflight.approvalClassRequired === "P0", preflight && preflight.approvalClassRequired, "Preflight", "Critical");
    check("Preflight requires Gate", preflight && preflight.gateRequired === true, preflight && preflight.gateRequired, "Preflight", "Critical");
    check("Gate has not passed", preflight && preflight.gatePassed === false, preflight && preflight.gatePassed, "Preflight", "Critical");
    check("Preflight cannot Dispatch", preflight && preflight.dispatchEligible === false, preflight && preflight.dispatchEligible, "Preflight", "Critical");
    check("Preflight writes zero Repository records", preflight && preflight.repositoryMutation === false && preflight.repositoryWriteCount === 0, preflight && preflight.repositoryWriteCount, "Preflight", "Critical");

    const missingOperation = grounding ? await namespace.createAutomationPlan({ groundingId: grounding.groundingId }) : null;
    check("Plan does not infer missing Operation", missingOperation && missingOperation.ok === false && missingOperation.code === "IDE190_PLAN_OPERATION_REQUIRED", missingOperation && missingOperation.code, "Negative", "Critical");
    const hardDeny = grounding ? await namespace.createAutomationPlan({ groundingId: grounding.groundingId, operationType: "Persistent Commit", capabilityId: "FORBIDDEN-E2", automationLevel: "L5", mutationLevel: "M3", requestedExecutionMode: "E2", externalEffectLevel: "X3" }) : null;
    check("Hard-deny Plan is blocked", hardDeny && hardDeny.ok === false && hardDeny.code === "IDE190_PLAN_HARD_DENY", hardDeny && hardDeny.code, "Negative", "Critical");
    const unsafeProposal = proposal ? Object.assign({}, proposal, { executionPermissionGranted: true }) : null;
    const unsafeProposalValidation = unsafeProposal ? namespace.validateContract("automationProposal", unsafeProposal) : null;
    check("Proposal contract rejects Execution Permission", unsafeProposalValidation && unsafeProposalValidation.valid === false, unsafeProposalValidation && unsafeProposalValidation.failed, "Negative", "Critical");
    const unsafeDryRun = dryRun ? Object.assign({}, dryRun, { repositoryWriteCount: 1, sourceUnchanged: false }) : null;
    const unsafeDryRunValidation = unsafeDryRun ? namespace.validateContract("dryRunRecord", unsafeDryRun) : null;
    check("Dry Run contract rejects Repository write", unsafeDryRunValidation && unsafeDryRunValidation.valid === false, unsafeDryRunValidation && unsafeDryRunValidation.failed, "Negative", "Critical");
    const unsafePreflight = preflight ? Object.assign({}, preflight, { gatePassed: true, dispatchEligible: true }) : null;
    const unsafePreflightValidation = unsafePreflight ? namespace.validateContract("preflightRecord", unsafePreflight) : null;
    check("Preflight contract rejects Gate bypass / direct Dispatch", unsafePreflightValidation && unsafePreflightValidation.valid === false, unsafePreflightValidation && unsafePreflightValidation.failed, "Negative", "Critical");

    let mutationPreflight = null;
    if (grounding) {
      const mutationPlan = await namespace.createAutomationPlan({ groundingId: grounding.groundingId, objective: "Controlled Mutation Trial planning fixture", operationType: "Controlled Mutation Trial", capabilityId: "IDE-150-CONTROLLED-MUTATION", automationLevel: "L4", mutationLevel: "M2", requestedExecutionMode: "E1", externalEffectLevel: "X0" });
      const mutationProposal = mutationPlan.ok ? await namespace.createAutomationProposal({ planId: mutationPlan.data.plan.planId, summary: "Mutation trial proposal without Repository baseline." }) : null;
      const mutationDryRun = mutationProposal && mutationProposal.ok ? await namespace.runAutomationDryRun({ proposalId: mutationProposal.data.proposal.proposalId }) : null;
      mutationPreflight = mutationDryRun && mutationDryRun.ok ? await namespace.runAutomationPreflight({ dryRunId: mutationDryRun.data.dryRun.dryRunId }) : null;
    }
    check("M2/L4 Preflight fails closed without Repository baseline", mutationPreflight && mutationPreflight.ok === false && mutationPreflight.data && mutationPreflight.data.preflight && mutationPreflight.data.preflight.preflightStatus === "Blocked", mutationPreflight && mutationPreflight.code, "Repository Baseline", "Critical");
    check("Blocked M2 Preflight still cannot Dispatch", mutationPreflight && mutationPreflight.data && mutationPreflight.data.preflight && mutationPreflight.data.preflight.dispatchEligible === false, mutationPreflight && mutationPreflight.data && mutationPreflight.data.preflight && mutationPreflight.data.preflight.dispatchEligible, "Repository Baseline", "Critical");
    check("Blocked M2 Preflight classifies P2 for later Gate", mutationPreflight && mutationPreflight.data && mutationPreflight.data.preflight && mutationPreflight.data.preflight.approvalClassRequired === "P2", mutationPreflight && mutationPreflight.data && mutationPreflight.data.preflight && mutationPreflight.data.preflight.approvalClassRequired, "Approval Boundary", "Critical");
    check("Phase 3 never invokes IDE-160 Adapter as Dispatch", namespace.modules.preflight && namespace.modules.preflight.dispatchImplemented === false, namespace.modules.preflight && namespace.modules.preflight.dispatchImplemented, "Dispatch Boundary", "Critical");

    const result = summarize(checks, "IDE-190-PHASE3-STAGE-A-VALIDATION", "IDE-190 Phase 3 Stage A Plan / Propose / Dry Run / Preflight PASS", "IDE-190 Phase 3 Stage A Plan / Propose / Dry Run / Preflight FAIL", {
      stage: "A", stageName: "Phase 3 Deterministic / Pre-Android Validation", phase3Complete: false, phase4Allowed: false, androidRealDeviceRequired: true, androidRealDevicePassed: false, releaseAllowed: false, ide190Complete: false,
      groundingId: grounding && grounding.groundingId || null, planId: plan && plan.planId || null, proposalId: proposal && proposal.proposalId || null, dryRunId: dryRun && dryRun.dryRunId || null, preflightId: preflight && preflight.preflightId || null
    });
    internal.markPhase3Validation(result);
    namespace.modules.phase3Validation.status = result.failed === 0 ? "Pre-Device Ready" : "Blocked";
    return internal.clone(result);
  }

  async function runDevelopmentAutomationPhase3AndroidValidation() {
    const preDevice = await runDevelopmentAutomationPhase3Validation();
    const c = collector(), checks = c.checks, check = c.check;
    check("Phase 3 Stage A is PASS", preDevice.failed === 0 && preDevice.criticalFailed === 0, preDevice.status, "Stage A", "Critical");
    const userAgent = global.navigator && global.navigator.userAgent || "";
    check("Android real-device environment is detected", /Android/i.test(userAgent), userAgent, "Android Runtime", "Critical");
    check("Web Crypto SHA-256 is available", Boolean(global.crypto && global.crypto.subtle && typeof global.TextEncoder === "function"), Boolean(global.crypto && global.crypto.subtle), "Android Runtime", "Critical");
    check("IndexedDB is available", Boolean(global.indexedDB), Boolean(global.indexedDB), "Android Runtime", "Critical");
    check("Fetch API is available", typeof global.fetch === "function", typeof global.fetch, "Android Runtime", "Critical");

    const loadedScripts = getLoadedScriptPaths();
    EXPECTED_PHASE3_SCRIPT_FILES.forEach(function loaded(file) { check("Actual script loaded: " + file, loadedScripts.includes(file), loadedScripts.length, "Actual Script Loading", "Critical"); });
    let manifestLoad = null;
    if (typeof global.loadStaticScriptManifest === "function") { try { manifestLoad = await global.loadStaticScriptManifest(); } catch (error) { manifestLoad = { ok: false, errors: [error && error.message ? error.message : String(error)] }; } }
    check("Static Manifest loader API is available", typeof global.loadStaticScriptManifest === "function", typeof global.loadStaticScriptManifest, "Static Integrity", "Critical");
    check("Static Manifest fetch/integrity succeeds", Boolean(manifestLoad && manifestLoad.ok === true), manifestLoad && manifestLoad.errors || [], "Static Integrity", "Critical");
    if (manifestLoad && manifestLoad.manifest) {
      const normalized = (manifestLoad.manifest.scripts || []).map(function norm(src){return String(src||"").split("?")[0].split("#")[0].replace(/^\.\//, "");});
      EXPECTED_PHASE3_SCRIPT_FILES.forEach(function manifest(file){
        check("Static Manifest contains: " + file, normalized.includes(file), normalized.length, "Static Integrity", "Critical");
        const hash = manifestLoad.manifest.hashes && manifestLoad.manifest.hashes[file];
        check("Static Manifest has SHA-256: " + file, Boolean(hash && /^[a-f0-9]{64}$/.test(String(hash.sha256 || ""))), hash && hash.sha256, "Static Integrity", "Critical");
      });
    }
    const dryRun = namespace.getLatestAutomationDryRun();
    const preflight = namespace.getLatestAutomationPreflight();
    check("Latest E0 Dry Run remains read-only", Boolean(dryRun && dryRun.repositoryMutation === false && dryRun.repositoryWriteCount === 0 && dryRun.sourceUnchanged === true && dryRun.applicationAttempted === false), dryRun && dryRun.dryRunId, "Dry Run", "Critical");
    check("Latest Preflight requires later Gate", Boolean(preflight && preflight.gateRequired === true && preflight.gatePassed === false), preflight && preflight.preflightId, "Preflight", "Critical");
    check("Android cannot grant Dispatch in Phase 3", Boolean(preflight && preflight.dispatchEligible === false), preflight && preflight.dispatchEligible, "Dispatch Boundary", "Critical");
    check("Android platform cannot grant Persistent Commit", namespace.getPlatformProfile().persistentCommitPermission === false, namespace.getPlatformProfile().persistentCommitPermission, "Cross-Device", "Critical");
    check("Android platform cannot bypass Approval", namespace.getPlatformProfile().approvalBypassAllowed === false, namespace.getPlatformProfile().approvalBypassAllowed, "Cross-Device", "Critical");

    const combined = preDevice.checks.concat(checks);
    const allPassed = combined.every(function every(item){return item.passed;});
    const result = summarize(combined, "IDE-190-PHASE3-ANDROID-VALIDATION", "IDE-190 Phase 3 Android Real Device Gate PASS", "IDE-190 Phase 3 Android Real Device Gate FAIL", {
      stage: "B", stageName: "Phase 3 Android Real Device Validation", preDeviceValidationId: preDevice.id, preDevicePassed: preDevice.failed === 0 && preDevice.criticalFailed === 0, androidRealDeviceRequired: true, androidRealDevicePassed: allPassed, phaseGatePassed: allPassed, phase3Complete: allPassed, phase4Allowed: allPassed, releaseAllowed: false, ide190Complete: false, userAgent: userAgent
    });
    internal.markPhase3AndroidValidation(result);
    namespace.modules.phase3Validation.status = result.phaseGatePassed ? "Phase 3 Gate Passed" : "Blocked";
    return internal.clone(result);
  }

  function getDevelopmentAutomationPhase3ValidationStatus() { return { componentId: "IDE-190", version: VERSION_MANIFEST.release.version, preDevice: internal.clone(state.lastPhase3Validation), android: internal.clone(state.lastPhase3AndroidValidation), phaseGatePassed: state.androidPhase3ValidationPassed === true, phase3Complete: state.androidPhase3ValidationPassed === true, phase4Allowed: state.androidPhase3ValidationPassed === true, releaseAllowed: false, ide190Complete: false }; }

  Object.assign(namespace.api, { runDevelopmentAutomationPhase3Validation, runDevelopmentAutomationPhase3AndroidValidation, getDevelopmentAutomationPhase3ValidationStatus });
  Object.assign(namespace, namespace.api);
  namespace.modules.phase3Validation = { id: "IDE-190-PHASE3-VALIDATION", version: MODULE_VERSION, status: "Loaded", phase: 3, phaseName: "Plan / Propose / Dry Run / Preflight", androidRealDeviceRequired: true, phaseGate: true, releaseGate: false, loadedAt: internal.nowIso() };
  global.runDevelopmentAutomationPhase3Validation = runDevelopmentAutomationPhase3Validation;
  global.runDevelopmentAutomationPhase3AndroidValidation = runDevelopmentAutomationPhase3AndroidValidation;
  global.getDevelopmentAutomationPhase3ValidationStatus = getDevelopmentAutomationPhase3ValidationStatus;
})(typeof window !== "undefined" ? window : globalThis);
