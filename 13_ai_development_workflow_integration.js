/* ============================================================
   FILE: 13_ai_development_workflow_integration.js
   IDE-160 Full Application Integration / Dashboard / Handoff
   Version: 2.0.1
   Phase: 9 - Full Application Integration
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.AIPromptOSIDE160;
  if (!namespace || !namespace.__internal) return;
  const internal = namespace.__internal;
  const VERSION = namespace.version;
  const integrationState = { statusRegistry: false, ideRegistry: false, dashboard: false, handoff: true, registeredAt: null, lastError: null };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function replace(char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function registerIDE160FullApplicationIntegration() {
    const results = {};
    try {
      if (typeof global.registerDevelopmentStatus === "function") {
        results.statusRegistry = global.registerDevelopmentStatus({ id: "IDE-160", statusApi: "getAIDevelopmentWorkflowStatus", validator: "validateAIDevelopmentWorkflow" }, { source: "built-in", persist: false });
        integrationState.statusRegistry = Boolean(results.statusRegistry && results.statusRegistry.registered);
      } else {
        results.statusRegistry = { registered: false, unavailable: true };
      }
      if (typeof global.registerIdeComponent === "function") {
        const status = namespace.api.getAIDevelopmentWorkflowStatus();
        integrationState.ideRegistry = global.registerIdeComponent({
          id: "IDE-160", title: "AI Development Workflow", summary: "DefinitionからCompletion GateまでAI開発Workflowを安全に統制します。", icon: "🧠", version: VERSION,
          status: status.ready ? "Official" : "Working", ready: status.ready, progress: status.ready ? 100 : 95, health: Number.isFinite(status.health) ? status.health : 100,
          launcher: "showAIDevelopmentWorkflow", validator: "validateAIDevelopmentWorkflow", probe: "getAIDevelopmentWorkflowStatus", category: "IDE"
        }) === true;
        results.ideRegistry = { registered: integrationState.ideRegistry };
      } else {
        results.ideRegistry = { registered: false, unavailable: true };
      }
      integrationState.dashboard = typeof global.buildDevelopmentDashboard === "function" || typeof global.collectDevelopmentDashboardStatuses === "function";
      integrationState.registeredAt = internal.nowIso();
      integrationState.lastError = null;
      return internal.buildResult(true, "IDE160_FULL_APPLICATION_INTEGRATED", "Ready", { integration: internal.clone(integrationState), results: results });
    } catch (error) {
      integrationState.lastError = error && error.message ? error.message : String(error);
      return internal.buildResult(false, "IDE160_INTEGRATION_FAILED", "Degraded", { integration: internal.clone(integrationState), results: results }, { error: { message: integrationState.lastError, category: "System Failure", severity: "Medium" } });
    }
  }

  function getAIDevelopmentWorkflowIntegrationStatus() {
    return {
      id: "IDE-160-INTEGRATION-STATUS",
      componentId: namespace.componentId,
      version: VERSION,
      status: integrationState.lastError ? "Degraded" : "Ready",
      ready: !integrationState.lastError,
      statusRegistry: integrationState.statusRegistry,
      ideRegistry: integrationState.ideRegistry,
      dashboard: integrationState.dashboard,
      handoff: integrationState.handoff,
      externalRegistryAvailable: typeof global.registerDevelopmentStatus === "function",
      externalIdeRegistryAvailable: typeof global.registerIdeComponent === "function",
      registeredAt: integrationState.registeredAt,
      lastError: integrationState.lastError,
      updatedAt: internal.nowIso()
    };
  }

  function buildAIDevelopmentWorkflowDashboardHtml() {
    const status = namespace.api.getAIDevelopmentWorkflowStatus();
    const modules = Object.keys(status.modules || {}).map(function map(name) {
      return "<div><b>" + escapeHtml(name) + "</b>: " + (status.modules[name] ? "Ready" : "Unavailable") + "</div>";
    }).join("");
    return "<section class='ide160-dashboard'>" +
      "<h2>IDE-160 AI Development Workflow</h2>" +
      "<div>Version: " + escapeHtml(status.version) + "</div>" +
      "<div>Status: " + escapeHtml(status.status) + "</div>" +
      "<div>Implementation: " + escapeHtml(status.implementationStatus) + "</div>" +
      "<div>Validation: " + escapeHtml(status.validationStatus) + "</div>" +
      "<div>Health: " + escapeHtml(status.health == null ? "Not Run" : status.health) + "</div>" +
      "<div>Handoff: " + escapeHtml(status.handoffTarget || "IDE-170") + "</div>" +
      "<hr>" + modules +
      "</section>";
  }

  function showAIDevelopmentWorkflowDashboard(options) {
    const settings = options && typeof options === "object" ? options : {};
    const html = buildAIDevelopmentWorkflowDashboardHtml();
    if (global.document) {
      const targetId = internal.text(settings.targetId, "");
      const target = targetId ? global.document.getElementById(targetId) : null;
      if (target) target.innerHTML = html;
      else if (typeof global.showDevConsoleOutput === "function") global.showDevConsoleOutput(html);
      else if (typeof global.showModal === "function") global.showModal("IDE-160 AI Development Workflow", html);
    }
    return internal.buildResult(true, "IDE160_DASHBOARD_RENDERED", "Ready", { html: html, status: namespace.api.getAIDevelopmentWorkflowStatus() });
  }

  function buildIDE160Handoff(workflowId) {
    const workflow = namespace.api.getWorkflow(workflowId);
    const packageValue = typeof namespace.api.getWorkflowPackage === "function" ? namespace.api.getWorkflowPackage(workflowId) : null;
    const baseline = typeof namespace.api.getWorkflowBaseline === "function" ? namespace.api.getWorkflowBaseline(workflowId) : null;
    if (!workflow && !packageValue && !baseline) return internal.buildResult(false, "IDE160_HANDOFF_SOURCE_NOT_FOUND", "Blocked", null);
    const handoff = {
      handoffId: internal.nextId("IDE-160-HANDOFF"),
      componentId: namespace.componentId,
      componentVersion: VERSION,
      source: "IDE-160 AI Development Workflow",
      target: packageValue && packageValue.handoffTarget || workflow && workflow.definition && workflow.definition.handoffTarget || "IDE-170",
      workflowId: workflowId,
      workflowStatus: workflow && workflow.status || "Completed",
      packageReference: packageValue ? { packageId: packageValue.packageId, packageVersion: packageValue.packageVersion, packageHash: packageValue.packageHash } : null,
      baselineReference: baseline ? { baselineId: baseline.baselineId, baselineVersion: baseline.baselineVersion, baselineHash: baseline.baselineHash } : null,
      metrics: packageValue && internal.clone(packageValue.metrics) || workflow && internal.clone(workflow.metrics) || {},
      remainingRisk: packageValue && internal.clone(packageValue.remainingRisk) || [],
      unresolvedItems: packageValue && internal.clone(packageValue.unresolvedItems) || [],
      releaseStatus: baseline ? "Ready" : "Pending",
      persistentCommitExecuted: false,
      zipFileMutation: false,
      createdAt: internal.nowIso()
    };
    const integrity = internal.hashCanonicalSync(handoff);
    handoff.integrity = integrity;
    return internal.buildResult(true, "IDE160_HANDOFF_BUILT", baseline ? "Ready" : "Pending", { handoff: handoff });
  }

  function validateWorkflowIntegration(options) {
    const checks = [];
    function check(name, passed, detail, group) { checks.push({ name: name, passed: passed === true, detail: internal.text(detail, ""), group: group }); }
    const registration = registerIDE160FullApplicationIntegration();
    const status = getAIDevelopmentWorkflowIntegrationStatus();
    const publicApi = namespace.api.getAIDevelopmentWorkflowPublicApi();
    check("Integration module loaded", namespace.modules.integration && namespace.modules.integration.status === "Ready", namespace.modules.integration && namespace.modules.integration.status, "Module");
    check("Core global status API", typeof global.getAIDevelopmentWorkflowStatus === "function", typeof global.getAIDevelopmentWorkflowStatus, "Global API");
    check("Core global validator API", typeof global.validateAIDevelopmentWorkflow === "function", typeof global.validateAIDevelopmentWorkflow, "Global API");
    check("Core global launcher API", typeof global.showAIDevelopmentWorkflow === "function", typeof global.showAIDevelopmentWorkflow, "Global API");
    check("Namespace public API listed", Array.isArray(publicApi.namespaceFunctions) && publicApi.namespaceFunctions.length > 20, "count=" + publicApi.namespaceFunctions.length, "Public API");
    check("Integration registration returns", registration.ok === true, registration.code, "Registry");
    check("Status Registry integrated or safely unavailable", status.statusRegistry === true || status.externalRegistryAvailable === false, JSON.stringify(status), "Registry");
    check("IDE Registry integrated or safely unavailable", status.ideRegistry === true || status.externalIdeRegistryAvailable === false, JSON.stringify(status), "Registry");
    if (typeof global.getDevelopmentStatus === "function") {
      const registered = global.getDevelopmentStatus("IDE-160");
      const resolvesIDE160 = Boolean(registered && (registered.id === "IDE-160" || registered.componentId === "IDE-160"));
      check("Development Status Registry resolves IDE-160", resolvesIDE160, JSON.stringify(registered), "Registry");
    } else check("Development Status Registry optional in standalone", true, "Standalone", "Registry");
    if (typeof global.getIdeComponent === "function") {
      const component = global.getIdeComponent("IDE-160");
      check("IDE Registry resolves IDE-160", Boolean(component && component.id === "IDE-160"), JSON.stringify(component), "Registry");
    } else check("IDE Registry optional in standalone", true, "Standalone", "Registry");
    check("Dashboard HTML generated", buildAIDevelopmentWorkflowDashboardHtml().includes("IDE-160 AI Development Workflow"), "HTML", "Dashboard");
    const shown = showAIDevelopmentWorkflowDashboard({});
    check("Dashboard launcher returns", shown.ok === true, shown.code, "Dashboard");
    check("IDE-170 Handoff API available", typeof buildIDE160Handoff === "function", typeof buildIDE160Handoff, "Handoff");
    check("Integration status lightweight", status.componentId === "IDE-160" && status.status === "Ready", JSON.stringify(status), "Status");
    check("Full Pipeline modules visible", ["core","storage","state","planning","adapter","execution","decision","approval","monitoring","package","completion"].every(function every(name) { return Boolean(namespace.modules[name]); }), Object.keys(namespace.modules).join(","), "Pipeline");
    check("Persistent commit remains prohibited", namespace.api.getAIDevelopmentWorkflowStatus().persistentCommitAllowed === false, "false", "Safety");
    check("ZIP mutation remains prohibited", namespace.api.getAIDevelopmentWorkflowStatus().zipFileMutationAllowed === false, "false", "Safety");
    const passed = checks.filter(function count(c) { return c.passed; }).length; const groups = {};
    checks.forEach(function group(c) { if (!groups[c.group]) groups[c.group] = { passed: 0, failed: 0, total: 0 }; groups[c.group].total += 1; c.passed ? groups[c.group].passed += 1 : groups[c.group].failed += 1; });
    return { id: internal.nextId("IDE-160-INTEGRATION-VALIDATION"), componentId: namespace.componentId, version: VERSION, mode: internal.text(options && options.mode, "Phase 9 Full Application Integration"), valid: passed === checks.length, passed: passed, failed: checks.length - passed, total: checks.length, health: checks.length ? Number(((passed / checks.length) * 100).toFixed(2)) : null, status: passed === checks.length ? "Passed" : "Failed", groups: groups, checks: checks, warnings: [], executedAt: internal.nowIso() };
  }

  Object.assign(internal, { integrationState: integrationState });
  Object.assign(namespace.api, { registerIDE160FullApplicationIntegration: registerIDE160FullApplicationIntegration, getAIDevelopmentWorkflowIntegrationStatus: getAIDevelopmentWorkflowIntegrationStatus, buildAIDevelopmentWorkflowDashboardHtml: buildAIDevelopmentWorkflowDashboardHtml, showAIDevelopmentWorkflowDashboard: showAIDevelopmentWorkflowDashboard, buildIDE160Handoff: buildIDE160Handoff, validateWorkflowIntegration: validateWorkflowIntegration });
  namespace.modules.integration = { id: "IDE-160-INTEGRATION", version: VERSION, status: "Ready", registryIntegration: true, dashboardIntegration: true, handoffIntegration: true, loadedAt: internal.nowIso() };
  global.showAIDevelopmentWorkflow = showAIDevelopmentWorkflowDashboard;
  global.getIDE160IntegrationStatus = getAIDevelopmentWorkflowIntegrationStatus;
  global.buildIDE160Handoff = buildIDE160Handoff;
  registerIDE160FullApplicationIntegration();
  internal.touch();
})(typeof window !== "undefined" ? window : globalThis);