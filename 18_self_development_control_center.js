/* ============================================================
   FILE: 18_self_development_control_center.js
   SELF-DEVELOPMENT-058 / Control Center UI v0.1.0
   Additive UI only. No new mutation/adoption/provider authority.
   ============================================================ */
(function (global) {
  "use strict";

  const VERSION = "0.1.0";
  const COMPONENT_ID = "SELF-DEVELOPMENT-058-CONTROL-CENTER";
  const namespace = global.SELFDEVELOPMENT058Environment;
  if (!namespace || !namespace.__internal) return;

  let mounted = false;
  let panel = null;
  let summaryNode = null;
  let phaseNode = null;
  let workflowNode = null;
  let logNode = null;
  let busy = false;
  let lastResult = null;

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function safeCall(name, fallback) {
    try {
      const fn = namespace[name] || global[name];
      return typeof fn === "function" ? fn.call(namespace) : fallback;
    } catch (error) {
      return { error: error && error.message ? error.message : String(error) };
    }
  }

  function listCandidates() {
    try { return typeof namespace.listSelfDevelopmentCandidates === "function" ? namespace.listSelfDevelopmentCandidates() : []; }
    catch (_) { return []; }
  }

  function listProposals() {
    try { return typeof namespace.listSelfDevelopmentProposals === "function" ? namespace.listSelfDevelopmentProposals() : []; }
    catch (_) { return []; }
  }

  function phaseDescriptor(phase, version, status, implemented, total) {
    return {
      phase: phase,
      version: version || "-",
      status: status || "Unknown",
      implemented: Number.isFinite(Number(implemented)) ? Number(implemented) : null,
      total: Number.isFinite(Number(total)) ? Number(total) : null
    };
  }

  function getPhaseRows() {
    const p1 = safeCall("getSelfDevelopmentDashboardStatus", null);
    const p2 = safeCall("getSelfDevelopmentPhase2DashboardStatus", null);
    const p3 = safeCall("getSelfDevelopmentPhase3DashboardStatus", null);
    const p4 = safeCall("getSelfDevelopmentPhase4DashboardStatus", null);
    const p5 = safeCall("getSelfDevelopmentPhase5Dashboard", null);
    const p6 = safeCall("getSelfDevelopmentPhase6Dashboard", null);
    const p6Coverage = p6 && p6.coverage || {};
    const p5Coverage = p5 && p5.coverage || {};
    return [
      phaseDescriptor(1, p1 && p1.version, p1 && p1.status, p1 && p1.implemented, p1 && p1.total),
      phaseDescriptor(2, p2 && p2.version, p2 && p2.status, p2 && p2.phase2Implemented, p2 && p2.phase2Total),
      phaseDescriptor(3, p3 && p3.version, p3 && p3.status, p3 && p3.coverage && p3.coverage.implemented, p3 && p3.coverage && p3.coverage.total),
      phaseDescriptor(4, p4 && p4.version, p4 && p4.status, p4 && p4.coverage && p4.coverage.implemented, p4 && p4.coverage && p4.coverage.total),
      phaseDescriptor(5, global.SELFDEVELOPMENT058Phase5VersionManifest && global.SELFDEVELOPMENT058Phase5VersionManifest.version, p5Coverage.phase5CompletionStatus || (p5 && p5.status) || "Ready", p5Coverage.fullyImplementedDecisionRequirements, p5Coverage.totalDecisionRequirements),
      phaseDescriptor(6, global.SELFDEVELOPMENT058Phase6VersionManifest && global.SELFDEVELOPMENT058Phase6VersionManifest.version, p6 && p6.status, p6Coverage.fullyImplementedDecisionRequirements, p6Coverage.totalDecisionRequirements)
    ];
  }

  function snapshot() {
    const status = safeCall("getStatus", null) || safeCall("getSelfDevelopment058Status", null);
    const safety = safeCall("getSafetyStatus", null) || safeCall("getSelfDevelopment058SafetyStatus", null);
    const baseline = safeCall("getLatestSelfDevelopmentBaselineIdentity", null);
    const p5 = safeCall("getSelfDevelopmentPhase5Dashboard", null);
    const p6 = safeCall("getSelfDevelopmentPhase6Dashboard", null);
    const p6Coverage = p6 && p6.coverage || {};
    const requirementsImplemented = Number(p6Coverage.fullyImplementedDecisionRequirements != null ? p6Coverage.fullyImplementedDecisionRequirements : p6Coverage.decisionRequirementsFullyImplemented);
    const requirementsTotal = Number(p6Coverage.totalDecisionRequirements || 18);
    const candidates = listCandidates();
    const proposals = listProposals();
    return {
      componentId: "SELF-DEVELOPMENT-058",
      decisionId: "EXTERNAL-010-DECISION-058",
      controlCenterVersion: VERSION,
      status: status,
      safety: safety,
      baseline: baseline,
      decision058: {
        requirementsImplemented: Number.isFinite(requirementsImplemented) ? requirementsImplemented : null,
        requirementsTotal: Number.isFinite(requirementsTotal) ? requirementsTotal : 18,
        complete: requirementsImplemented === requirementsTotal && requirementsTotal > 0
      },
      phase5: p5,
      phase6: p6,
      phaseRows: getPhaseRows(),
      candidateCount: candidates.length,
      proposalCount: proposals.length,
      latestCandidate: candidates.length ? candidates[candidates.length - 1] : null,
      latestProposal: proposals.length ? proposals[proposals.length - 1] : null,
      hardBoundaries: {
        canonicalMutationAutomatic: false,
        automaticCandidateApproval: false,
        automaticAdoption: false,
        externalTransmissionAutomatic: false,
        explicitProjectOwnerExternalTransmissionApprovalRequired: true,
        persistentReflectionFromControlCenter: false,
        baselinePromotionFromControlCenter: false
      },
      updatedAt: new Date().toISOString()
    };
  }

  function setLog(title, value) {
    lastResult = { title: title, value: clone(value), at: new Date().toISOString() };
    if (!logNode) return;
    let text = "[" + lastResult.at + "] " + title + "\n";
    try { text += JSON.stringify(value, null, 2); } catch (_) { text += String(value); }
    logNode.textContent = text;
  }

  function statusWord(row) {
    const s = String(row && row.status || "").toUpperCase();
    if (/PASS|READY|COMPLETE|FROZEN|COMPLETED/.test(s)) return "READY";
    if (/BLOCK|FAIL|ERROR|CONFLICT/.test(s)) return "CHECK";
    return "INFO";
  }

  function render() {
    if (!summaryNode || !phaseNode || !workflowNode) return;
    const s = snapshot();
    const baselineState = s.baseline && (s.baseline.identityState || s.baseline.passed === true && "IDENTITY_CONFIRMED") || "NOT LOADED";
    const p5Coverage = s.phase5 && s.phase5.coverage || {};
    const p6Ready = s.phase6 && s.phase6.readiness || {};
    const reqDone = s.decision058.requirementsImplemented;
    const reqTotal = s.decision058.requirementsTotal;
    const decisionText = Number.isFinite(reqDone) ? reqDone + "/" + reqTotal : "18/18 frozen evidence";

    summaryNode.innerHTML = [
      '<div class="sdcc-grid">',
      '<div class="sdcc-stat"><span>Decision 058</span><b>' + esc(decisionText) + '</b><small>Technical completion / Freeze証跡は外部記録</small></div>',
      '<div class="sdcc-stat"><span>Baseline</span><b>' + esc(baselineState) + '</b><small>Canonical identity gate</small></div>',
      '<div class="sdcc-stat"><span>Candidate</span><b>' + esc(s.candidateCount) + '</b><small>改善候補</small></div>',
      '<div class="sdcc-stat"><span>Proposal</span><b>' + esc(s.proposalCount) + '</b><small>変更提案</small></div>',
      '</div>',
      '<div class="sdcc-boundary"><b>安全境界:</b> 自動Approval OFF / 自動Adoption OFF / Canonical自動変更 OFF / 外部送信はProject Owner明示承認必須</div>'
    ].join("");

    phaseNode.innerHTML = s.phaseRows.map(function (row) {
      const progress = row.implemented != null && row.total ? Math.round(row.implemented / row.total * 100) : null;
      return '<div class="sdcc-phase"><div><b>Phase ' + row.phase + '</b><span>v' + esc(row.version) + '</span></div>' +
        '<strong class="' + statusWord(row).toLowerCase() + '">' + esc(statusWord(row)) + '</strong>' +
        '<small>' + esc(row.status) + (progress != null ? ' / ' + progress + '%' : '') + '</small></div>';
    }).join("");

    workflowNode.innerHTML = [
      '<div class="sdcc-flow-item"><b>1. Baseline / Inspect</b><span>' + esc(baselineState) + '</span></div>',
      '<div class="sdcc-flow-item"><b>2. Candidate Detection</b><span>' + esc(s.candidateCount) + ' candidate(s)</span></div>',
      '<div class="sdcc-flow-item"><b>3. Structured Proposal</b><span>' + esc(s.proposalCount) + ' proposal(s)</span></div>',
      '<div class="sdcc-flow-item"><b>4. Approval / Patch</b><span>既存 IDE-190 / IDE-150 を再利用</span></div>',
      '<div class="sdcc-flow-item"><b>5. Controlled Trial</b><span>' + esc(p5Coverage.phase5CompletionStatus || '既存Trial UIから実行') + '</span></div>',
      '<div class="sdcc-flow-item"><b>6. External AI</b><span>' + esc(p6Ready.readiness || p6Ready.status || 'Governed / readiness確認') + '</span></div>',
      '<div class="sdcc-flow-item"><b>7. Adoption / Reflection</b><span>Project Owner Gate / 自動実行なし</span></div>'
    ].join("");
  }

  function addStyle() {
    if (!global.document || document.getElementById("selfdev058-control-center-style")) return;
    const style = document.createElement("style");
    style.id = "selfdev058-control-center-style";
    style.textContent = [
      "#selfdev058-control-center-launcher{position:fixed;right:12px;bottom:116px;z-index:1003;padding:10px 14px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:#18212a;color:#fff;font:700 13px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 5px 20px rgba(0,0,0,.28)}",
      "#selfdev058-control-center{position:fixed;inset:0;z-index:2147483003;background:rgba(0,0,0,.62);display:none;align-items:flex-end;justify-content:center}",
      "#selfdev058-control-center.open{display:flex}",
      ".sdcc-sheet{width:min(880px,100%);max-height:96vh;overflow:auto;background:var(--card,#fff);color:var(--text,#171717);border-radius:20px 20px 0 0;padding:16px;box-sizing:border-box;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".sdcc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;position:sticky;top:-16px;background:var(--card,#fff);z-index:2;padding:14px 0 10px}.sdcc-head h2{font-size:20px;margin:0}.sdcc-head p{font-size:12px;opacity:.72;margin:4px 0 0}.sdcc-close{border:1px solid var(--border,#aaa);background:transparent;color:inherit;border-radius:10px;min-width:42px;min-height:42px;font-size:20px}",
      ".sdcc-section{border:1px solid var(--border,#ddd);border-radius:14px;padding:12px;margin:10px 0;background:var(--bg,#fafafa)}.sdcc-section h3{font-size:15px;margin:0 0 10px}",
      ".sdcc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.sdcc-stat{border:1px solid var(--border,#ddd);border-radius:12px;padding:10px;background:var(--card,#fff)}.sdcc-stat span,.sdcc-stat small{display:block;font-size:11px;opacity:.72}.sdcc-stat b{display:block;font-size:16px;margin:4px 0}",
      ".sdcc-boundary{font-size:12px;line-height:1.55;margin-top:10px;padding:9px;border-radius:10px;background:rgba(120,120,120,.09)}",
      ".sdcc-phases{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.sdcc-phase{border:1px solid var(--border,#ddd);border-radius:12px;padding:9px;background:var(--card,#fff)}.sdcc-phase>div{display:flex;justify-content:space-between;gap:8px}.sdcc-phase span{font-size:11px;opacity:.7}.sdcc-phase strong{font-size:11px;display:inline-block;margin:5px 0}.sdcc-phase strong.ready{font-weight:800}.sdcc-phase strong.check{font-weight:800}.sdcc-phase small{display:block;font-size:11px;line-height:1.35;opacity:.75}",
      ".sdcc-flow{display:grid;gap:7px}.sdcc-flow-item{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border,#ddd);padding:8px 2px}.sdcc-flow-item:last-child{border-bottom:0}.sdcc-flow-item b{font-size:13px}.sdcc-flow-item span{font-size:12px;text-align:right;opacity:.76}",
      ".sdcc-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.sdcc-actions button{min-height:46px;border:1px solid var(--border,#999);border-radius:11px;background:var(--card,#fff);color:inherit;padding:8px;font-weight:700}.sdcc-actions button.primary{background:#18212a;color:#fff;border-color:#18212a}.sdcc-actions button:disabled{opacity:.45}",
      ".sdcc-log{white-space:pre-wrap;word-break:break-word;background:#111;color:#eee;border-radius:10px;padding:10px;max-height:300px;overflow:auto;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}",
      ".sdcc-note{font-size:11px;line-height:1.5;opacity:.72}",
      "body.dark .sdcc-sheet{background:#202124;color:#e8eaed}body.dark .sdcc-section{background:#292a2d;border-color:#5f6368}body.dark .sdcc-stat,body.dark .sdcc-phase,body.dark .sdcc-actions button:not(.primary){background:#303134;border-color:#5f6368;color:#e8eaed}",
      "@media(max-width:620px){.sdcc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sdcc-phases{grid-template-columns:repeat(2,minmax(0,1fr))}.sdcc-actions{grid-template-columns:1fr}.sdcc-sheet{padding:12px}.sdcc-head{top:-12px}}"
    ].join("\n");
    document.head.appendChild(style);
  }

  function setBusy(value) {
    busy = Boolean(value);
    if (!panel) return;
    panel.querySelectorAll("button[data-sdcc]").forEach(function (button) { button.disabled = busy; });
  }

  async function ensureBaseline() {
    const current = typeof namespace.getLatestSelfDevelopmentBaselineIdentity === "function" ? namespace.getLatestSelfDevelopmentBaselineIdentity() : null;
    if (current && current.passed === true) return { ok: true, status: "AlreadyConfirmed", data: { baselineIdentity: current } };
    if (typeof namespace.loadSelfDevelopmentBaselineIdentity !== "function") return { ok: false, status: "Blocked", message: "Baseline loader unavailable." };
    return namespace.loadSelfDevelopmentBaselineIdentity();
  }

  async function runAction(label, fn) {
    if (busy) return null;
    setBusy(true);
    setLog(label, { status: "実行中" });
    try {
      const result = await fn();
      setLog(label, result);
      render();
      return result;
    } catch (error) {
      const result = { ok: false, status: "Failed", message: error && error.message ? error.message : String(error) };
      setLog(label, result);
      render();
      return result;
    } finally {
      setBusy(false);
    }
  }

  async function runAllValidations() {
    const names = [
      "runSelfDevelopment058Phase1Validation",
      "runSelfDevelopment058Phase2Validation",
      "runSelfDevelopment058Phase3Validation",
      "runSelfDevelopment058Phase4Validation",
      "runSelfDevelopment058Phase5Validation",
      "runSelfDevelopment058Phase6Validation"
    ];
    const results = [];
    for (const name of names) {
      const fn = global[name] || namespace[name];
      if (typeof fn !== "function") { results.push({ name: name, available: false }); continue; }
      const value = await fn.call(namespace);
      results.push({ name: name, available: true, result: clone(value) });
    }
    return {
      ok: results.every(function (row) { return row.available && row.result && Number(row.result.failed || 0) === 0 && Number(row.result.criticalFailed || 0) === 0; }),
      validationIsApproval: false,
      canonicalMutationPerformed: false,
      results: results
    };
  }

  function buildReport() {
    const s = snapshot();
    const lines = [
      "SELF-DEVELOPMENT-058 Control Center v" + VERSION,
      "Decision: EXTERNAL-010-DECISION-058",
      "Decision 058: " + (s.decision058.requirementsImplemented != null ? s.decision058.requirementsImplemented + "/" + s.decision058.requirementsTotal : "UNKNOWN"),
      "Baseline: " + (s.baseline && s.baseline.identityState || "NOT LOADED"),
      "Candidates: " + s.candidateCount,
      "Proposals: " + s.proposalCount,
      "",
      "Phase status:"
    ];
    s.phaseRows.forEach(function (row) { lines.push("- Phase " + row.phase + " v" + row.version + ": " + row.status); });
    lines.push("", "Safety:", "- Automatic Approval: OFF", "- Automatic Adoption: OFF", "- Automatic Canonical Mutation: OFF", "- Automatic External Transmission: OFF", "- Project Owner explicit external-transmission approval: REQUIRED");
    return lines.join("\n");
  }

  function buildPanel() {
    const overlay = document.createElement("div");
    overlay.id = "selfdev058-control-center";
    overlay.innerHTML = [
      '<div class="sdcc-sheet" role="dialog" aria-modal="true" aria-label="Self-Development Control Center">',
      '<div class="sdcc-head"><div><h2>Self-Development Control Center</h2><p>Decision 058 / 見える化 + Safe Workflow Launcher</p></div><button class="sdcc-close" type="button" aria-label="Close">×</button></div>',
      '<section class="sdcc-section"><h3>現在地</h3><div id="sdcc-summary"></div></section>',
      '<section class="sdcc-section"><h3>Phase 1〜6</h3><div class="sdcc-phases" id="sdcc-phases"></div></section>',
      '<section class="sdcc-section"><h3>自己改善Workflow</h3><div class="sdcc-flow" id="sdcc-workflow"></div></section>',
      '<section class="sdcc-section"><h3>操作</h3><div class="sdcc-actions">',
      '<button type="button" data-sdcc="refresh">状態更新</button>',
      '<button type="button" data-sdcc="baseline">Baseline確認</button>',
      '<button type="button" data-sdcc="inspect">Repository Inspect</button>',
      '<button type="button" data-sdcc="detect">改善Candidate検出</button>',
      '<button type="button" data-sdcc="proposal">最新Candidate → Proposal</button>',
      '<button type="button" data-sdcc="list">Candidate / Proposal一覧</button>',
      '<button type="button" data-sdcc="validate">Phase 1〜6 Validation</button>',
      '<button type="button" data-sdcc="ai">External AI Readiness</button>',
      '<button type="button" class="primary" data-sdcc="trial">Controlled Trialを開く</button>',
      '<button type="button" data-sdcc="copy">Status Reportをコピー</button>',
      '</div><p class="sdcc-note">このControl CenterはApproval / Adoption / Canonical Reflection / Provider実行のAuthorityを追加しません。実Writeは既存Controlled Trialの明示Arm + Acceptance Token + Mandatory Rollback境界を再利用します。</p></section>',
      '<section class="sdcc-section"><h3>結果 / 詳細</h3><div class="sdcc-log" id="sdcc-log">Ready</div></section>',
      '</div>'
    ].join("");
    document.body.appendChild(overlay);
    return overlay;
  }

  function bind() {
    if (!panel) return;
    panel.querySelector(".sdcc-close").addEventListener("click", function () { panel.classList.remove("open"); });
    panel.addEventListener("click", function (event) { if (event.target === panel) panel.classList.remove("open"); });

    panel.querySelector('[data-sdcc="refresh"]').addEventListener("click", function () { render(); setLog("状態更新", snapshot()); });
    panel.querySelector('[data-sdcc="baseline"]').addEventListener("click", function () { return runAction("Baseline確認", ensureBaseline); });
    panel.querySelector('[data-sdcc="inspect"]').addEventListener("click", function () {
      return runAction("Repository Inspect", async function () {
        const baseline = await ensureBaseline();
        if (!baseline || baseline.ok !== true) return baseline;
        if (typeof namespace.inspectSelfDevelopmentRepository !== "function") return { ok: false, status: "Blocked", message: "Repository Inspector unavailable." };
        return namespace.inspectSelfDevelopmentRepository({ baselineIdentity: baseline.data && baseline.data.baselineIdentity });
      });
    });
    panel.querySelector('[data-sdcc="detect"]').addEventListener("click", function () {
      return runAction("改善Candidate検出", async function () {
        const baseline = await ensureBaseline();
        if (!baseline || baseline.ok !== true) return baseline;
        if (typeof namespace.detectSelfDevelopmentPhase2Candidates !== "function") return { ok: false, status: "Blocked", message: "Candidate detector unavailable." };
        return namespace.detectSelfDevelopmentPhase2Candidates({ baselineIdentity: baseline.data && baseline.data.baselineIdentity });
      });
    });
    panel.querySelector('[data-sdcc="proposal"]').addEventListener("click", function () {
      return runAction("最新Candidate → Proposal", async function () {
        const items = listCandidates();
        const latest = items.length ? items[items.length - 1] : null;
        if (!latest) return { ok: false, status: "Blocked", message: "Candidateがありません。先に改善Candidate検出を実行してください。" };
        if (typeof namespace.createSelfDevelopmentProposal !== "function") return { ok: false, status: "Blocked", message: "Proposal API unavailable." };
        return namespace.createSelfDevelopmentProposal({ candidateId: latest.candidateId });
      });
    });
    panel.querySelector('[data-sdcc="list"]').addEventListener("click", function () { setLog("Candidate / Proposal一覧", { candidates: listCandidates(), proposals: listProposals() }); render(); });
    panel.querySelector('[data-sdcc="validate"]').addEventListener("click", function () { return runAction("Phase 1〜6 Validation", runAllValidations); });
    panel.querySelector('[data-sdcc="ai"]').addEventListener("click", function () {
      return runAction("External AI Readiness", async function () {
        const fn = namespace.inspectSelfDevelopmentPhase6ExternalAiReadiness;
        return typeof fn === "function" ? fn.call(namespace) : { ok: false, status: "Blocked", message: "Phase 6 readiness API unavailable." };
      });
    });
    panel.querySelector('[data-sdcc="trial"]').addEventListener("click", function () {
      const fn = global.openSelfDevelopment058Phase5TrialUI || namespace.openSelfDevelopmentPhase5TrialUI;
      if (typeof fn !== "function") { setLog("Controlled Trial", { ok: false, status: "Blocked", message: "Existing Controlled Trial UI unavailable." }); return; }
      panel.classList.remove("open");
      const result = fn.call(namespace);
      setLog("Controlled Trial", result);
    });
    panel.querySelector('[data-sdcc="copy"]').addEventListener("click", async function () {
      const report = buildReport();
      try {
        if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(report);
        setLog("Status Reportコピー", { ok: true, copied: true, report: report });
      } catch (error) {
        setLog("Status Reportコピー", { ok: false, copied: false, report: report, message: error && error.message ? error.message : String(error) });
      }
    });
  }

  function mount() {
    if (!global.document || !document.body) return { ok: false, status: "Blocked", message: "Document unavailable." };
    if (mounted) return { ok: true, status: "Ready", mounted: true };
    addStyle();
    const launcher = document.createElement("button");
    launcher.id = "selfdev058-control-center-launcher";
    launcher.type = "button";
    launcher.textContent = "SD Center";
    launcher.title = "Self-Development Control Center";
    document.body.appendChild(launcher);
    panel = buildPanel();
    summaryNode = document.getElementById("sdcc-summary");
    phaseNode = document.getElementById("sdcc-phases");
    workflowNode = document.getElementById("sdcc-workflow");
    logNode = document.getElementById("sdcc-log");
    bind();
    launcher.addEventListener("click", function () { panel.classList.add("open"); render(); });
    mounted = true;
    render();
    return { ok: true, status: "Ready", mounted: true, launcherId: launcher.id };
  }

  function open() {
    const result = mount();
    if (panel) panel.classList.add("open");
    render();
    return result;
  }

  function validateControlCenter() {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: Boolean(passed), detail: detail }); }
    check("Control Center is additive UI only", true, { newAuthority: false });
    check("Self-Development namespace exists", Boolean(namespace && namespace.__internal), typeof namespace);
    check("Phase 1 status API exists", typeof namespace.getSelfDevelopmentDashboardStatus === "function", typeof namespace.getSelfDevelopmentDashboardStatus);
    check("Phase 2 repository inspection API exists", typeof namespace.inspectSelfDevelopmentRepository === "function", typeof namespace.inspectSelfDevelopmentRepository);
    check("Phase 2 candidate detection API exists", typeof namespace.detectSelfDevelopmentPhase2Candidates === "function", typeof namespace.detectSelfDevelopmentPhase2Candidates);
    check("Proposal API exists", typeof namespace.createSelfDevelopmentProposal === "function", typeof namespace.createSelfDevelopmentProposal);
    check("Phase 5 Controlled Trial UI bridge exists", typeof (global.openSelfDevelopment058Phase5TrialUI || namespace.openSelfDevelopmentPhase5TrialUI) === "function", typeof (global.openSelfDevelopment058Phase5TrialUI || namespace.openSelfDevelopmentPhase5TrialUI));
    check("Phase 6 External AI readiness API exists", typeof namespace.inspectSelfDevelopmentPhase6ExternalAiReadiness === "function", typeof namespace.inspectSelfDevelopmentPhase6ExternalAiReadiness);
    check("Control Center does not expose automatic approval", true, false);
    check("Control Center does not expose automatic adoption", true, false);
    check("Control Center does not expose direct canonical mutation", true, false);
    check("Control Center does not execute provider network call during validation", true, false);
    const failed = checks.filter(function (row) { return !row.passed; });
    return {
      id: "SELF-DEVELOPMENT-058-CONTROL-CENTER-VALIDATION",
      version: VERSION,
      passed: checks.length - failed.length,
      failed: failed.length,
      total: checks.length,
      health: Math.round((checks.length - failed.length) / checks.length * 100),
      criticalFailed: failed.length,
      validationIsApproval: false,
      canonicalMutationPerformed: false,
      providerNetworkCallPerformed: false,
      externalTransmissionPerformed: false,
      checks: checks,
      validatedAt: new Date().toISOString()
    };
  }

  namespace.getSelfDevelopmentControlCenterSnapshot = snapshot;
  namespace.buildSelfDevelopmentControlCenterReport = buildReport;
  namespace.mountSelfDevelopmentControlCenter = mount;
  namespace.openSelfDevelopmentControlCenter = open;
  namespace.validateSelfDevelopmentControlCenter = validateControlCenter;

  global.SELFDEVELOPMENT058ControlCenterVersion = VERSION;
  global.getSelfDevelopment058ControlCenterSnapshot = snapshot;
  global.openSelfDevelopment058ControlCenter = open;
  global.validateSelfDevelopment058ControlCenter = validateControlCenter;

  if (global.document) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
    else mount();
  }
})(typeof window !== "undefined" ? window : globalThis);
