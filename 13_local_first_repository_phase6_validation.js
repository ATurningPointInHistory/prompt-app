/* ============================================================
   FILE: 13_local_first_repository_phase6_validation.js
   REPOSITORY-010 Local-First Repository Coordination
   Release: 1.5.0 / Module: Phase 6 Validation 1.0.0
   Phase 6: PC Local Repository / Desktop Adapter Foundation
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.REPOSITORY010LocalFirstRepository;
  const VERSION_MANIFEST = global.REPOSITORY010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("REPOSITORY-010 Phase 6 Validation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("phase6Validation");
  const TEST_NODE_ID = "REPOSITORY010-PC-LOCAL-INITIAL-CANONICAL";
  const TEST_DESCRIPTOR_ID = "REPOSITORY010-PC-LOCAL-REPOSITORY-DESCRIPTOR";

  function collector(defaultGroup) {
    const checks = [];
    return {
      checks: checks,
      check: function check(name, passed, detail, group, severity) {
        checks.push({ name: name, passed: passed === true, detail: detail, group: group || defaultGroup || "Phase 6", severity: severity || "High" });
      }
    };
  }

  function summarize(checks, idPrefix, passStatus, failStatus, extras) {
    const passed = checks.filter(function p(item) { return item.passed; }).length;
    const failed = checks.length - passed;
    const criticalFailed = checks.filter(function c(item) { return !item.passed && item.severity === "Critical"; }).length;
    return Object.assign({
      id: internal.nextId(idPrefix),
      componentId: "REPOSITORY-010",
      version: VERSION_MANIFEST.release.version,
      implementationPhase: VERSION_MANIFEST.release.implementationPhase,
      passed: passed,
      failed: failed,
      total: checks.length,
      health: checks.length ? Math.round((passed / checks.length) * 10000) / 100 : 100,
      criticalFailed: criticalFailed,
      status: failed === 0 ? passStatus : failStatus,
      checks: checks,
      validatedAt: internal.nowIso()
    }, extras || {});
  }

  async function sha256(input) {
    let buffer;
    if (input instanceof ArrayBuffer) buffer = input;
    else buffer = new TextEncoder().encode(String(input == null ? "" : input)).buffer;
    const digest = await global.crypto.subtle.digest("SHA-256", buffer);
    return Array.from(new Uint8Array(digest)).map(function hex(v) { return v.toString(16).padStart(2, "0"); }).join("");
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (!value || typeof value !== "object") return value;
    const output = {};
    Object.keys(value).sort().forEach(function each(key) { output[key] = stableValue(value[key]); });
    return output;
  }

  function fileObject(text) {
    const content = String(text);
    return {
      text: async function () { return content; },
      arrayBuffer: async function () { return new TextEncoder().encode(content).buffer; }
    };
  }

  async function buildFakeDirectoryHandle() {
    const scripts = { "alpha.js": "window.alpha = 1;\n", "beta.js": "window.beta = 2;\n" };
    const hashes = {};
    const scriptUrls = [];
    for (const name of Object.keys(scripts)) {
      const hash = await sha256(scripts[name]);
      hashes[name] = { sha256: hash, byteSize: new TextEncoder().encode(scripts[name]).byteLength, cacheKey: hash.slice(0, 12) };
      scriptUrls.push("./" + name + "?h=" + hash.slice(0, 12));
    }
    const scriptSetPayload = scriptUrls.map(function map(src) { const path = src.split("?")[0].replace(/^\.\//, ""); return path + ":" + hashes[path].sha256; }).join("\n");
    const manifest = {
      version: "test", manifestSchemaVersion: "2.0.0", applicationReleaseVersion: "test", versionArchitecture: "test",
      mode: "static-script-manifest", description: "Phase 6 validation fixture", hashAlgorithm: "SHA-256", cacheKeyLength: 12,
      updatedAt: internal.nowIso(), scripts: scriptUrls, hashes: hashes, scriptSetHash: await sha256(scriptSetPayload)
    };
    const payload = JSON.parse(JSON.stringify(manifest)); delete payload.updatedAt;
    manifest.manifestHash = await sha256(JSON.stringify(stableValue(payload)));
    const projectInfo = { project: "AIプロンプト生成Pro", version: "v6.0", entryFile: "index.html", complete: true, requestedFiles: ["index.html", "alpha.js", "beta.js"] };
    const indexHtml = '<!doctype html><html><body><script src="' + scriptUrls[0] + '"></script><script src="' + scriptUrls[1] + '"></script></body></html>';
    const files = Object.assign({}, scripts, {
      "index.html": indexHtml,
      "project_info.json": JSON.stringify(projectInfo),
      "00_script_manifest.json": JSON.stringify(manifest)
    });
    return {
      kind: "directory",
      name: "REPOSITORY010-PHASE6-FAKE-PC-REPOSITORY",
      queryPermission: async function () { return "granted"; },
      getFileHandle: async function (name, options) {
        if (options && options.create === true) throw new Error("Write/create is prohibited in Phase 6 fixture.");
        if (!Object.prototype.hasOwnProperty.call(files, name)) throw new Error("NotFound: " + name);
        return { kind: "file", name: name, getFile: async function () { return fileObject(files[name]); } };
      }
    };
  }

  function captureDesktopRuntimeState() {
    return {
      descriptor: state.desktopRepositoryDescriptors instanceof Map ? state.desktopRepositoryDescriptors.get(TEST_DESCRIPTOR_ID) || null : null,
      node: state.nodeIdentities instanceof Map ? state.nodeIdentities.get(TEST_NODE_ID) || null : null,
      lastScan: internal.clone(state.lastDesktopRepositoryScan),
      adapterStatus: state.desktopAdapterStatus
    };
  }

  function cleanupPreDeviceFixture(saved) {
    if (state.desktopRepositoryDescriptors instanceof Map) {
      state.desktopRepositoryDescriptors.delete(TEST_DESCRIPTOR_ID);
      if (saved && saved.descriptor) state.desktopRepositoryDescriptors.set(TEST_DESCRIPTOR_ID, saved.descriptor);
    }
    if (state.nodeIdentities instanceof Map) {
      state.nodeIdentities.delete(TEST_NODE_ID);
      if (saved && saved.node) state.nodeIdentities.set(TEST_NODE_ID, saved.node);
    }
    if (saved) {
      state.lastDesktopRepositoryScan = internal.clone(saved.lastScan);
      state.desktopAdapterStatus = saved.adapterStatus;
    }
  }

  async function runLocalFirstRepositoryPhase6Validation() {
    const c = collector("Phase 6 Pre-Device");
    const check = c.check;
    const prior = VERSION_MANIFEST.release.priorValidatedBaseline || null;
    const phase5 = typeof namespace.runLocalFirstRepositoryPhase5Validation === "function" ? await namespace.runLocalFirstRepositoryPhase5Validation() : null;

    check("Phase 5 deterministic regression passes", Boolean(phase5 && phase5.failed === 0 && phase5.criticalFailed === 0), phase5 && phase5.status, "Regression", "Critical");
    check("Prior Phase 5 Android release baseline is recorded", Boolean(prior && prior.phase === 5 && prior.version === "1.4.0" && prior.androidRealValidationPassed === true), prior, "Release Lineage", "Critical");
    check("Phase 6 scope is Desktop Adapter Foundation", VERSION_MANIFEST.implementation.phase === 6 && VERSION_MANIFEST.implementation.desktopAdapterImplemented === true, VERSION_MANIFEST.implementation, "Scope", "Critical");
    check("Phase 6 requires PC real validation", VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet.pcRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet, "Gate Applicability", "Critical");
    check("Phase 6 does not require Android real validation", VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet.androidRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet, "Gate Applicability", "Critical");
    check("Phase 6 does not claim Cross-device validation", VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet, "Gate Applicability", "Critical");
    check("Desktop Repository contract is registered", Boolean(namespace.getContractDefinition("desktopRepositoryDescriptor")), namespace.getContractDefinition("desktopRepositoryDescriptor"), "Contract", "Critical");
    check("Desktop Adapter module is loaded", Boolean(namespace.modules.desktopAdapter), namespace.modules.desktopAdapter, "Module", "Critical");
    check("Desktop Adapter is read-only", namespace.modules.desktopAdapter && namespace.modules.desktopAdapter.readOnly === true && namespace.modules.desktopAdapter.writeAttempted === false, namespace.modules.desktopAdapter, "Safety", "Critical");
    check("PC canonical mutation remains unimplemented", VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false, VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented, "Safety", "Critical");
    check("Actual V2 Transfer remains unimplemented", VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented === false && VERSION_MANIFEST.implementation.crossDeviceRealSyncImplemented === false, VERSION_MANIFEST.implementation, "Transfer Boundary", "Critical");
    check("Sync Engine remains unimplemented", VERSION_MANIFEST.implementation.syncEngineImplemented === false, VERSION_MANIFEST.implementation.syncEngineImplemented, "Safety", "Critical");
    check("Direct Repository Mutation remains prohibited", VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, VERSION_MANIFEST.safety.directRepositoryMutationAllowed, "Safety", "Critical");

    const savedDesktopRuntime = captureDesktopRuntimeState();
    cleanupPreDeviceFixture();
    const fakeHandle = await buildFakeDirectoryHandle();
    const scan = await namespace.scanDesktopRepositoryDirectory(fakeHandle);
    check("Read-only fake Desktop Repository scan succeeds", Boolean(scan && scan.ok === true), scan && scan.code, "Desktop Scan", "Critical");
    check("Fake repository file hashes verify", Boolean(scan && scan.data && scan.data.integrity && scan.data.integrity.allFileHashesVerified === true), scan && scan.data && scan.data.integrity, "Integrity", "Critical");
    check("Fake repository Script Set verifies", Boolean(scan && scan.data && scan.data.integrity && scan.data.integrity.scriptSetVerified === true), scan && scan.data && scan.data.integrity, "Integrity", "Critical");
    check("Fake repository Manifest Hash verifies", Boolean(scan && scan.data && scan.data.integrity && scan.data.integrity.manifestHashVerified === true), scan && scan.data && scan.data.integrity, "Integrity", "Critical");
    check("Fake repository index script sequence verifies", Boolean(scan && scan.data && scan.data.integrity && scan.data.integrity.indexSequenceMatches === true), scan && scan.data && scan.data.integrity, "Integrity", "Critical");
    check("Desktop Node is canonical type but identity grants no Authority", Boolean(scan && scan.data && scan.data.nodeIdentity && scan.data.nodeIdentity.nodeType === "canonical" && scan.data.nodeIdentity.identityGrantsAuthority === false), scan && scan.data && scan.data.nodeIdentity, "Authority", "Critical");
    check("Desktop descriptor is read-only", Boolean(scan && scan.data && scan.data.descriptor && scan.data.descriptor.scanMode === "read-only" && scan.data.descriptor.writeAttempted === false), scan && scan.data && scan.data.descriptor, "Safety", "Critical");
    check("Desktop descriptor grants no mutation authority", Boolean(scan && scan.data && scan.data.descriptor && scan.data.descriptor.mutationAuthorityGranted === false && scan.data.descriptor.authorityEffect === "none"), scan && scan.data && scan.data.descriptor, "Authority", "Critical");
    check("Desktop scan performs no Transfer", Boolean(scan && scan.data && scan.data.actualTransferAttempted === false && scan.data.syncEngineInvoked === false), scan && scan.data, "Transfer Boundary", "Critical");

    cleanupPreDeviceFixture(savedDesktopRuntime);
    const status = namespace.getDesktopRepositoryAdapterStatus();
    check("Desktop Adapter exposes read-only capability", status.desktopAdapterImplemented === true && status.pcLocalRepositoryReadOnlyScanImplemented === true, status, "Status", "Critical");
    check("Desktop Adapter exposes no write capability", status.pcCanonicalMutationImplemented === false && status.writeAttempted === false && status.writePermissionRequested === false, status, "Status", "Critical");

    const result = summarize(c.checks, "REPOSITORY-010-PHASE6-PREDEVICE-VALIDATION", "REPOSITORY-010 Phase 6 Pre-Device Validation PASS", "REPOSITORY-010 Phase 6 Pre-Device Validation FAIL", {
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet),
      pcRealValidationRequired: true,
      androidRealValidationRequired: false,
      crossDeviceRealValidationRequired: false,
      actualV2TransferImplemented: false,
      releaseAllowed: false,
      phase6Complete: false
    });
    internal.markPhase6PreDeviceValidation(result);
    return result;
  }

  async function finalizePCValidation(scanResult) {
    const pre = state.lastPhase6Validation && state.phase6PreDeviceValidationPassed === true
      ? internal.clone(state.lastPhase6Validation)
      : await runLocalFirstRepositoryPhase6Validation();
    const c = collector("Phase 6 PC Real");
    const check = c.check;
    const userAgent = global.navigator && global.navigator.userAgent || "";
    const platform = global.navigator && global.navigator.platform || "";
    const pcRealDevice = /Windows|Macintosh|Linux x86_64|Win32|Win64/i.test(userAgent + " " + platform) && !/Android|Mobile/i.test(userAgent);
    const scan = scanResult;

    check("Phase 6 pre-device validation passes", Boolean(pre && pre.failed === 0 && pre.criticalFailed === 0), pre && pre.status, "Pre-Device", "Critical");
    check("Prior Phase 5 Android release baseline remains inherited", Boolean(VERSION_MANIFEST.release.priorValidatedBaseline && VERSION_MANIFEST.release.priorValidatedBaseline.phase === 5 && VERSION_MANIFEST.release.priorValidatedBaseline.androidRealValidationPassed === true), VERSION_MANIFEST.release.priorValidatedBaseline, "Release Lineage", "Critical");
    check("Runtime is PC", pcRealDevice === true, { userAgent: userAgent, platform: platform }, "PC Real Environment", "Critical");
    check("Secure Context is available", global.isSecureContext === true, global.isSecureContext, "PC Real Environment", "Critical");
    check("File System Access API is available", typeof global.showDirectoryPicker === "function", typeof global.showDirectoryPicker, "PC Real Environment", "Critical");
    check("PC Real Validation is required by Phase 6", VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet.pcRealValidation === "required", VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet.pcRealValidation, "Gate Applicability", "Critical");
    check("Cross-device Real Validation is not yet required", VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet.crossDeviceRealValidation === "not-required", VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet.crossDeviceRealValidation, "Gate Applicability", "Critical");
    check("Selected Desktop Repository verifies", Boolean(scan && scan.ok === true && scan.code === "REPOSITORY010_DESKTOP_REPOSITORY_VERIFIED"), scan && scan.code, "Desktop Repository", "Critical");
    check("Project entry file is index.html", Boolean(scan && scan.data && scan.data.projectInfo && scan.data.projectInfo.entryFile === "index.html"), scan && scan.data && scan.data.projectInfo, "Repository Identity", "Critical");
    check("Project Package is marked complete", Boolean(scan && scan.data && scan.data.projectInfo && scan.data.projectInfo.complete === true), scan && scan.data && scan.data.projectInfo, "Repository Identity", "Critical");
    check("All Script file SHA-256 values match manifest", Boolean(scan && scan.data && scan.data.integrity && scan.data.integrity.allFileHashesVerified === true), scan && scan.data && scan.data.integrity, "Integrity", "Critical");
    check("Script Set Hash matches", Boolean(scan && scan.data && scan.data.integrity && scan.data.integrity.scriptSetVerified === true), scan && scan.data && scan.data.integrity, "Integrity", "Critical");
    check("Manifest Hash matches", Boolean(scan && scan.data && scan.data.integrity && scan.data.integrity.manifestHashVerified === true), scan && scan.data && scan.data.integrity, "Integrity", "Critical");
    check("index script sequence matches Static Manifest", Boolean(scan && scan.data && scan.data.integrity && scan.data.integrity.indexSequenceMatches === true), scan && scan.data && scan.data.integrity, "Integrity", "Critical");
    check("PC Node is observed as initial canonical node", Boolean(scan && scan.data && scan.data.descriptor && scan.data.descriptor.initialCanonicalNodeObserved === true && scan.data.descriptor.nodeType === "canonical"), scan && scan.data && scan.data.descriptor, "Canonical Node Identity", "Critical");
    check("Node identity itself grants no Authority", Boolean(scan && scan.data && scan.data.nodeIdentity && scan.data.nodeIdentity.identityGrantsAuthority === false), scan && scan.data && scan.data.nodeIdentity, "Authority", "Critical");
    check("Desktop Repository scan remains read-only", Boolean(scan && scan.data && scan.data.readOnly === true && scan.data.writeAttempted === false && scan.data.writePermissionRequested === false), scan && scan.data, "Safety", "Critical");
    check("No mutation authority is granted", Boolean(scan && scan.data && scan.data.mutationAuthorityGranted === false && scan.data.canonicalMutationPerformed === false), scan && scan.data, "Authority", "Critical");
    check("No actual Transfer is attempted", Boolean(scan && scan.data && scan.data.actualTransferAttempted === false), scan && scan.data, "Transfer Boundary", "Critical");
    check("Sync Engine is not invoked", Boolean(scan && scan.data && scan.data.syncEngineInvoked === false), scan && scan.data, "Safety", "Critical");
    check("V2 actual Transfer remains unimplemented", VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented === false, VERSION_MANIFEST.implementation.v2TransferIntegrityValidationImplemented, "V2 Boundary", "Critical");
    check("Canonical mutation remains prohibited", VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented === false && VERSION_MANIFEST.safety.directRepositoryMutationAllowed === false, { pcCanonicalMutationImplemented: VERSION_MANIFEST.implementation.pcCanonicalMutationImplemented, directRepositoryMutationAllowed: VERSION_MANIFEST.safety.directRepositoryMutationAllowed }, "Safety", "Critical");

    const passedAll = c.checks.every(function all(item) { return item.passed; });
    const result = summarize(c.checks, "REPOSITORY-010-PHASE6-PC-VALIDATION", "REPOSITORY-010 Phase 6 PC Local Repository Validation PASS", "REPOSITORY-010 Phase 6 PC Local Repository Validation FAIL", {
      pcRealDevice: pcRealDevice,
      userAgent: userAgent,
      platform: platform,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet),
      releaseAllowed: passedAll,
      phase6Complete: passedAll,
      pcLocalRepositoryVerified: passedAll,
      readOnlyValidation: true,
      actualV2TransferImplemented: false,
      crossDeviceRealValidationRequired: false,
      desktopAdapterStatus: namespace.getDesktopRepositoryAdapterStatus(),
      repositoryScan: scan && scan.data ? internal.clone(scan.data) : null
    });
    internal.markPhase6PCValidation(result);
    return result;
  }

  async function runLocalFirstRepositoryPhase6PCValidation(directoryHandle) {
    if (!directoryHandle) {
      return summarize([{ name: "Desktop directory handle is supplied", passed: false, detail: "Use the Phase 6 PC validation button so the browser can request a directory with a user gesture.", group: "PC Real Environment", severity: "Critical" }], "REPOSITORY-010-PHASE6-PC-VALIDATION", "REPOSITORY-010 Phase 6 PC Local Repository Validation PASS", "REPOSITORY-010 Phase 6 PC Local Repository Validation FAIL", { pcRealDevice: true, releaseAllowed: false, phase6Complete: false });
    }
    if (state.phase6PreDeviceValidationPassed !== true) await runLocalFirstRepositoryPhase6Validation();
    const scan = await namespace.scanDesktopRepositoryDirectory(directoryHandle);
    return finalizePCValidation(scan);
  }

  async function launchLocalFirstRepositoryPhase6PCValidation() {
    const pre = await runLocalFirstRepositoryPhase6Validation();
    if (!pre || pre.failed !== 0 || pre.criticalFailed !== 0) return internal.buildResult(false, "REPOSITORY010_PHASE6_PREDEVICE_BLOCKED", "Blocked", pre);
    const old = global.document && global.document.getElementById("repository010Phase6PCValidationButton");
    if (old) old.remove();
    if (!global.document || !global.document.body) return internal.buildResult(false, "REPOSITORY010_PHASE6_UI_UNAVAILABLE", "Blocked", null);
    const button = global.document.createElement("button");
    button.id = "repository010Phase6PCValidationButton";
    button.textContent = "REPOSITORY-010 Phase 6: PCフォルダを選択して検証";
    Object.assign(button.style, { position: "fixed", right: "18px", bottom: "18px", zIndex: "2147483647", padding: "12px 16px", fontSize: "14px", fontWeight: "700", cursor: "pointer", borderRadius: "8px", border: "1px solid currentColor" });
    button.addEventListener("click", async function onClick() {
      button.disabled = true;
      button.textContent = "PC Repositoryを検証中...";
      try {
        const scan = await namespace.selectAndScanDesktopRepository();
        if (!scan || !scan.ok) {
          button.textContent = scan && scan.code === "REPOSITORY010_DESKTOP_DIRECTORY_SELECTION_CANCELLED" ? "選択がキャンセルされました" : "Phase 6 検証失敗";
          button.disabled = false;
          console.log(JSON.stringify({ scan: scan, status: namespace.getStatus() }, null, 2));
          return;
        }
        const result = await finalizePCValidation(scan);
        button.textContent = result.failed === 0 ? "Phase 6 PC Validation PASS" : "Phase 6 PC Validation FAIL";
        button.disabled = false;
        console.log(JSON.stringify({ validation: result, status: namespace.getStatus() }, null, 2));
      } catch (error) {
        button.textContent = "Phase 6 検証例外";
        button.disabled = false;
        console.error(error);
      }
    });
    global.document.body.appendChild(button);
    return internal.buildResult(true, "REPOSITORY010_PHASE6_PC_VALIDATION_BUTTON_READY", "Ready", { buttonId: button.id, instruction: "Click the button and select the extracted AI Prompt OS project folder. Read-only validation only." });
  }

  function getLocalFirstRepositoryPhase6ValidationStatus() {
    return {
      preDevice: internal.clone(state.lastPhase6Validation),
      pcReal: internal.clone(state.lastPhase6PCValidation),
      phase6PreDeviceValidationPassed: state.phase6PreDeviceValidationPassed === true,
      pcPhase6ValidationPassed: state.pcPhase6ValidationPassed === true,
      phase6Complete: state.phase6PreDeviceValidationPassed === true && state.pcPhase6ValidationPassed === true,
      releaseAllowed: state.phase6PreDeviceValidationPassed === true && state.pcPhase6ValidationPassed === true,
      requiredGateSet: internal.clone(VERSION_MANIFEST.validationAuthority.phase6RequiredGateSet),
      actualV2TransferImplemented: false,
      crossDeviceRealValidationRequired: false
    };
  }

  Object.assign(namespace.api, {
    runLocalFirstRepositoryPhase6Validation: runLocalFirstRepositoryPhase6Validation,
    runLocalFirstRepositoryPhase6PCValidation: runLocalFirstRepositoryPhase6PCValidation,
    launchLocalFirstRepositoryPhase6PCValidation: launchLocalFirstRepositoryPhase6PCValidation,
    getLocalFirstRepositoryPhase6ValidationStatus: getLocalFirstRepositoryPhase6ValidationStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.phase6Validation = {
    id: "REPOSITORY-010-PHASE6-VALIDATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 6,
    pcRealValidationRequired: true,
    androidRealValidationRequired: false,
    crossDeviceRealValidationRequired: false,
    readOnlyValidation: true,
    actualV2TransferImplemented: false,
    loadedAt: internal.nowIso()
  };

  global.runLocalFirstRepositoryPhase6Validation = runLocalFirstRepositoryPhase6Validation;
  global.runLocalFirstRepositoryPhase6PCValidation = runLocalFirstRepositoryPhase6PCValidation;
  global.launchLocalFirstRepositoryPhase6PCValidation = launchLocalFirstRepositoryPhase6PCValidation;
})(typeof window !== "undefined" ? window : globalThis);
