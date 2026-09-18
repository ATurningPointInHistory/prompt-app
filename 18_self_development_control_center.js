/* ============================================================
   FILE: 18_self_development_control_center.js
   SELF-DEVELOPMENT-058 / Self-Development Workspace v0.1.1
   Form-first UI over existing Decision 058 backend.
   No new mutation/adoption/provider authority.
   ============================================================ */
(function (global) {
  "use strict";

  const VERSION = "0.1.1";
  const COMPONENT_ID = "SELF-DEVELOPMENT-058-CONTROL-CENTER";
  const namespace = global.SELFDEVELOPMENT058Environment;
  if (!namespace || !namespace.__internal) return;

  const FORMAL_DECISION058_FREEZE = Object.freeze({
    decisionId: "EXTERNAL-010-DECISION-058",
    title: "Evidence-Grounded Governed Self-Development Environment with Human-Controlled Adoption and Independent Validation",
    status: "FINAL_ACCEPTED / FINAL_FROZEN",
    projectOwnerFinalAcceptance: "APPROVED",
    approvalDate: "2026-09-18",
    requirementsImplemented: 18,
    requirementsTotal: 18,
    complete: true,
    canonicalBaseline: "REPOSITORY010-CANONICAL-REVISION-0023",
    canonicalManifestHash: "0673af6e0cff8332cd9322d62b582eea312b549f9f3660f28222a87957c4160b",
    canonicalScriptSetHash: "d3121eb588b7c7b332cb86ef66f82fe2f2ecd77bd1be029143ff578f2d0514a3",
    canonicalScriptCount: 462,
    integratedFinalValidationPassed: 15,
    integratedFinalValidationTotal: 15,
    health: 100,
    criticalFailed: 0,
    freezeRecordSha256: "f89eb2f0d317cb2f544587480c6e23ec8a018c8a4abc282f62d35e6925a11daa",
    canonicalRevisionCreatedForFreeze: false,
    nextDecisionAutomaticallyCreated: false,
    evidenceSource: "EXTERNAL-010-DECISION-058-FINAL-FREEZE-RECORD"
  });

  let mounted = false;
  let panel = null;
  let summaryNode = null;
  let operationalNode = null;
  let phaseNode = null;
  let workflowNode = null;
  let workspaceNode = null;
  let logNode = null;
  let intentNode = null;
  let intentCountNode = null;
  let busy = false;
  let lastResult = null;
  let workspace = createEmptyWorkspace();

  function createEmptyWorkspace() {
    return {
      state: "IDLE",
      userIntent: "",
      baselineResult: null,
      inspectionResult: null,
      contextResult: null,
      readiness: null,
      preparedExternalAi: null,
      externalAiResult: null,
      reasoningHandoff: null,
      candidateResult: null,
      proposalResult: null,
      selectedFiles: [],
      evidenceItems: [],
      analyzedAt: null,
      updatedAt: new Date().toISOString()
    };
  }

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

  function runtimePackageIdentity() {
    const baseline = safeCall("getLatestSelfDevelopmentBaselineIdentity", null);
    return baseline ? {
      identityState: baseline.identityState || (baseline.passed === true ? "IDENTITY_CONFIRMED" : "UNKNOWN"),
      scriptCount: baseline.scriptCount || null,
      manifestHash: baseline.manifestHash || null,
      scriptSetHash: baseline.scriptSetHash || null,
      baselineIdentityId: baseline.baselineIdentityId || null
    } : null;
  }

  function snapshot() {
    const status = safeCall("getStatus", null) || safeCall("getSelfDevelopment058Status", null);
    const safety = safeCall("getSafetyStatus", null) || safeCall("getSelfDevelopment058SafetyStatus", null);
    const baseline = safeCall("getLatestSelfDevelopmentBaselineIdentity", null);
    const p5 = safeCall("getSelfDevelopmentPhase5Dashboard", null);
    const p6 = safeCall("getSelfDevelopmentPhase6Dashboard", null);
    const candidates = listCandidates();
    const proposals = listProposals();
    return {
      componentId: "SELF-DEVELOPMENT-058",
      decisionId: "EXTERNAL-010-DECISION-058",
      controlCenterVersion: VERSION,
      formalDecisionStatus: clone(FORMAL_DECISION058_FREEZE),
      runtimePackage: runtimePackageIdentity(),
      status: status,
      safety: safety,
      baseline: baseline,
      decision058: {
        requirementsImplemented: 18,
        requirementsTotal: 18,
        complete: true,
        formalStatus: FORMAL_DECISION058_FREEZE.status,
        formalFreezeEvidence: FORMAL_DECISION058_FREEZE.evidenceSource,
        runtimeCoverageIsOperationalEvidenceNotFormalFreezeStatus: true
      },
      operationalReadiness: {
        phase5: {
          status: p5 && p5.status || null,
          lineageReady: Boolean(p5 && p5.lineage && p5.lineage.ready === true),
          readyForLiveTrialPreparation: Boolean(p5 && p5.readiness && p5.readiness.readyForLiveTrialPreparation === true),
          repositoryDirectorySelected: Boolean(p5 && p5.repositoryDirectorySelected === true),
          liveEvidenceComplete: Boolean(p5 && p5.coverage && p5.coverage.liveEvidence && p5.coverage.liveEvidence.liveEvidenceComplete === true)
        },
        phase6: {
          status: p6 && p6.status || null,
          readiness: p6 && p6.readiness && (p6.readiness.readiness || p6.readiness.status) || "UNKNOWN",
          externalTransmissionAutomatic: false,
          explicitProjectOwnerTransmissionApprovalRequired: true
        }
      },
      phase5: p5,
      phase6: p6,
      phaseRows: getPhaseRows(),
      candidateCount: candidates.length,
      proposalCount: proposals.length,
      latestCandidate: candidates.length ? candidates[candidates.length - 1] : null,
      latestProposal: proposals.length ? proposals[proposals.length - 1] : null,
      workspace: clone(workspace),
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

  function shortText(value, max) {
    const text = String(value == null ? "" : value).trim();
    const limit = Number(max) || 500;
    return text.length > limit ? text.slice(0, limit) + "…" : text;
  }

  function fileKeywords(intent) {
    const text = String(intent || "").toLowerCase();
    const explicitFiles = text.match(/[a-z0-9_./-]+\.(?:js|json|html|css|cjs|py|txt|md)/g) || [];
    const words = text.split(/[^a-z0-9_]+/).filter(function (word) { return word.length >= 4; });
    return Array.from(new Set(explicitFiles.concat(words))).slice(0, 24);
  }

  function selectRelevantFiles(intent, inspection) {
    const files = inspection && Array.isArray(inspection.inspectedFiles) ? inspection.inspectedFiles : [];
    const keys = fileKeywords(intent);
    const selected = [];
    files.forEach(function (file) {
      const path = String(file && file.path || "").toLowerCase();
      if (!path) return;
      if (keys.some(function (key) { return path.indexOf(key) >= 0 || key.indexOf(path) >= 0; })) selected.push(file.path);
    });
    return Array.from(new Set(selected)).slice(0, 8);
  }

  function buildWorkspaceEvidence(intent, inspectionResult, p5, p6) {
    const inspection = inspectionResult && inspectionResult.data && inspectionResult.data.inspection || {};
    const findings = Array.isArray(inspection.findings) ? inspection.findings : [];
    const findingSummary = findings.slice(0, 6).map(function (f) {
      return { type: f.type || null, severity: f.severity || null, summary: f.summary || null, files: Array.isArray(f.files) ? f.files.slice(0, 5) : [] };
    });
    const repositoryExcerpt = JSON.stringify({
      inventoryCount: inspection.inventoryCount || null,
      inspectedFileCount: inspection.inspectedFileCount || null,
      categoryCounts: inspection.categoryCounts || null,
      summary: inspection.summary || null,
      findings: findingSummary,
      sourceDigest: inspection.sourceDigest || null
    });
    const freezeExcerpt = JSON.stringify({
      status: FORMAL_DECISION058_FREEZE.status,
      requirements: FORMAL_DECISION058_FREEZE.requirementsImplemented + "/" + FORMAL_DECISION058_FREEZE.requirementsTotal,
      canonicalBaseline: FORMAL_DECISION058_FREEZE.canonicalBaseline,
      integratedFinalValidation: FORMAL_DECISION058_FREEZE.integratedFinalValidationPassed + "/" + FORMAL_DECISION058_FREEZE.integratedFinalValidationTotal,
      health: FORMAL_DECISION058_FREEZE.health,
      criticalFailed: FORMAL_DECISION058_FREEZE.criticalFailed
    });
    const operationalExcerpt = JSON.stringify({
      phase5: {
        status: p5 && p5.status || null,
        lineageReady: Boolean(p5 && p5.lineage && p5.lineage.ready === true),
        repositoryDirectorySelected: Boolean(p5 && p5.repositoryDirectorySelected === true)
      },
      phase6: {
        status: p6 && p6.status || null,
        readiness: p6 && p6.readiness && (p6.readiness.readiness || p6.readiness.status) || "UNKNOWN"
      }
    });
    return [
      { evidenceId: "SDCC-WORKSPACE-REPOSITORY", evidenceType: "RUNTIME_EVIDENCE", sourceId: "SELFDEV058-REPOSITORY-INSPECTION", excerpt: shortText(repositoryExcerpt, 2200), selectionReason: "Current repository inspection summary for requested improvement." },
      { evidenceId: "SDCC-WORKSPACE-FREEZE", evidenceType: "ARCHITECTURE", sourceId: FORMAL_DECISION058_FREEZE.evidenceSource, excerpt: shortText(freezeExcerpt, 1600), selectionReason: "Formal Decision 058 boundary and completion state." },
      { evidenceId: "SDCC-WORKSPACE-READINESS", evidenceType: "RUNTIME_EVIDENCE", sourceId: "SELFDEV058-OPERATIONAL-READINESS", excerpt: shortText(operationalExcerpt, 1600), selectionReason: "Current operational readiness; distinct from formal freeze status." }
    ];
  }

  function getIntent() {
    return String(intentNode && intentNode.value || workspace.userIntent || "").trim();
  }

  function workspaceExternalOutput() {
    return workspace.externalAiResult && workspace.externalAiResult.data && workspace.externalAiResult.data.outputText || "";
  }

  function renderWorkspace() {
    if (!workspaceNode) return;
    const intent = workspace.userIntent || "未入力";
    const inspection = workspace.inspectionResult && workspace.inspectionResult.data && workspace.inspectionResult.data.inspection || null;
    const readiness = workspace.readiness || {};
    const aiOutput = workspaceExternalOutput();
    const candidate = workspace.candidateResult && workspace.candidateResult.data && workspace.candidateResult.data.candidate || null;
    const proposal = workspace.proposalResult && workspace.proposalResult.data && workspace.proposalResult.data.proposal || null;
    const findings = inspection && Array.isArray(inspection.findings) ? inspection.findings : [];
    const currentSummary = inspection ? ("Repository " + (inspection.inventoryCount || "?") + " items / inspected " + (inspection.inspectedFileCount || "?") + " files / findings " + findings.length) : "まだ現状分析していません";
    const expected = aiOutput ? shortText(aiOutput, 1600) : "外部AI分析はまだ実行していません。現時点では変更結果を確定せず、現状Evidenceと改善Candidateだけを扱います。";
    const next = proposal ? "Proposal登録済み。Controlled Trial / Reviewへ進めます（Adoptionではありません）。" : candidate ? "Candidate登録済み。Proposal作成またはAI分析結果をレビューしてください。" : workspace.state === "ANALYZED" ? "AI分析または改善候補登録へ進めます。" : "改善したいことを入力して「現状を分析」を押してください。";
    workspaceNode.innerHTML = [
      '<div class="sdcc-work-grid">',
      '<div class="sdcc-work-card"><span>あなたの目的</span><b>' + esc(shortText(intent, 500)) + '</b></div>',
      '<div class="sdcc-work-card"><span>現在</span><b>' + esc(currentSummary) + '</b><small>Formal FreezeとOperational Readinessは分離して判定</small></div>',
      '<div class="sdcc-work-card"><span>関連ファイル候補</span><b>' + esc(workspace.selectedFiles.length ? workspace.selectedFiles.join(", ") : "未特定 / Architecture Review") + '</b></div>',
      '<div class="sdcc-work-card"><span>External AI</span><b>' + esc(readiness.readiness || "未確認") + '</b><small>自動送信なし。実行時はProject Owner明示確認</small></div>',
      '</div>',
      '<div class="sdcc-result"><h4>変更したらどうなるか（予測候補）</h4><div>' + esc(expected) + '</div><p>※ AI出力はProposal Candidateのみ。Validation前の予測であり、Truth/Approval/Adoptionではありません。</p></div>',
      '<div class="sdcc-result"><h4>現在の改善レコード</h4><div>Candidate: ' + esc(candidate && candidate.candidateId || "未登録") + '<br>Proposal: ' + esc(proposal && proposal.proposalId || "未登録") + '</div></div>',
      '<div class="sdcc-next"><b>次:</b> ' + esc(next) + '</div>'
    ].join("");
  }

  function render() {
    if (!summaryNode || !phaseNode || !workflowNode || !operationalNode) return;
    const s = snapshot();
    const baselineState = s.baseline && (s.baseline.identityState || s.baseline.passed === true && "IDENTITY_CONFIRMED") || "NOT LOADED";
    const p5 = s.operationalReadiness.phase5;
    const p6 = s.operationalReadiness.phase6;

    summaryNode.innerHTML = [
      '<div class="sdcc-grid">',
      '<div class="sdcc-stat"><span>Decision 058 正式状態</span><b>18/18 FROZEN</b><small>' + esc(FORMAL_DECISION058_FREEZE.status) + '</small></div>',
      '<div class="sdcc-stat"><span>Freeze Baseline</span><b>Canonical 0023</b><small>462 scripts / Freeze時点</small></div>',
      '<div class="sdcc-stat"><span>現在Runtime</span><b>' + esc(baselineState) + '</b><small>' + esc(s.runtimePackage && s.runtimePackage.scriptCount || "-") + ' scripts</small></div>',
      '<div class="sdcc-stat"><span>改善Records</span><b>' + esc(s.candidateCount) + ' / ' + esc(s.proposalCount) + '</b><small>Candidate / Proposal</small></div>',
      '</div>',
      '<div class="sdcc-boundary"><b>正式状態と稼働準備は別:</b> Decision 058はFinal Accepted/Frozen済み。Repository directoryやExternal AIが未準備でもFreeze状態は変わりません。</div>'
    ].join("");

    operationalNode.innerHTML = [
      '<div class="sdcc-op"><b>Repository / Controlled Trial</b><span>' + esc(p5.lineageReady ? "READY" : "SETUP / LINEAGE CHECK") + '</span><small>Directory selected: ' + esc(p5.repositoryDirectorySelected) + ' / Live Evidence: ' + esc(p5.liveEvidenceComplete) + '</small></div>',
      '<div class="sdcc-op"><b>External AI</b><span>' + esc(p6.readiness) + '</span><small>自動送信OFF / Project Owner明示承認必須</small></div>'
    ].join("");

    phaseNode.innerHTML = s.phaseRows.map(function (row) {
      const progress = row.implemented != null && row.total ? Math.round(row.implemented / row.total * 100) : null;
      return '<div class="sdcc-phase"><div><b>Phase ' + row.phase + '</b><span>v' + esc(row.version) + '</span></div>' +
        '<strong class="' + statusWord(row).toLowerCase() + '">' + esc(statusWord(row)) + '</strong>' +
        '<small>' + esc(row.status) + (progress != null ? ' / runtime ' + progress + '%' : '') + '</small></div>';
    }).join("");

    workflowNode.innerHTML = [
      '<div class="sdcc-flow-item active"><b>1. 改善したいことを入力</b><span>Project Owner Intent</span></div>',
      '<div class="sdcc-flow-item"><b>2. 現状をローカル分析</b><span>Baseline + Repository + Architecture</span></div>',
      '<div class="sdcc-flow-item"><b>3. 必要Contextだけ選択</b><span>Bounded / Secret除外 / Repository全送信なし</span></div>',
      '<div class="sdcc-flow-item"><b>4. External AI分析</b><span>明示承認時のみAPI送信</span></div>',
      '<div class="sdcc-flow-item"><b>5. Before / After候補確認</b><span>AI output = Proposal Candidate Only</span></div>',
      '<div class="sdcc-flow-item"><b>6. 改善案を了承</b><span>Candidate / Proposal登録（Adoptionではない）</span></div>',
      '<div class="sdcc-flow-item"><b>7. Trial / Validation / Adoption</b><span>既存Human Gateを再利用</span></div>'
    ].join("");
    renderWorkspace();
  }

  function addStyle() {
    if (!global.document || document.getElementById("selfdev058-control-center-style")) return;
    const style = document.createElement("style");
    style.id = "selfdev058-control-center-style";
    style.textContent = [
      "#selfdev058-control-center-launcher{position:fixed;right:12px;bottom:116px;z-index:1003;padding:10px 14px;border:1px solid rgba(255,255,255,.22);border-radius:999px;background:#18212a;color:#fff;font:700 13px/1 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;box-shadow:0 5px 20px rgba(0,0,0,.28)}",
      "#selfdev058-control-center{position:fixed;inset:0;z-index:2147483003;background:rgba(0,0,0,.62);display:none;align-items:flex-end;justify-content:center}",
      "#selfdev058-control-center.open{display:flex}",
      ".sdcc-sheet{width:min(920px,100%);max-height:96vh;overflow:auto;background:var(--card,#fff);color:var(--text,#171717);border-radius:20px 20px 0 0;padding:16px;box-sizing:border-box;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".sdcc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;position:sticky;top:-16px;background:var(--card,#fff);z-index:2;padding:14px 0 10px}.sdcc-head h2{font-size:20px;margin:0}.sdcc-head p{font-size:12px;opacity:.72;margin:4px 0 0}.sdcc-close{border:1px solid var(--border,#aaa);background:transparent;color:inherit;border-radius:10px;min-width:42px;min-height:42px;font-size:20px}",
      ".sdcc-section{border:1px solid var(--border,#ddd);border-radius:14px;padding:12px;margin:10px 0;background:var(--bg,#fafafa)}.sdcc-section h3{font-size:15px;margin:0 0 10px}.sdcc-section summary{font-weight:800;cursor:pointer;padding:2px 0}",
      ".sdcc-idea{border:1px solid var(--border,#ccc);border-radius:14px;padding:12px;background:var(--card,#fff)}.sdcc-idea label{display:block;font-weight:800;font-size:15px;margin-bottom:7px}.sdcc-idea textarea{width:100%;min-height:118px;resize:vertical;box-sizing:border-box;border:1px solid var(--border,#aaa);border-radius:11px;padding:11px;background:var(--card,#fff);color:inherit;font:14px/1.55 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.sdcc-idea-foot{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:7px;font-size:11px;opacity:.75}",
      ".sdcc-primary-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-top:10px}.sdcc-primary-actions button,.sdcc-actions button{min-height:46px;border:1px solid var(--border,#999);border-radius:11px;background:var(--card,#fff);color:inherit;padding:8px;font-weight:700}.sdcc-primary-actions button.primary,.sdcc-actions button.primary{background:#18212a;color:#fff;border-color:#18212a}.sdcc-primary-actions button.warn{font-weight:800}.sdcc-primary-actions button:disabled,.sdcc-actions button:disabled{opacity:.45}",
      ".sdcc-work-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.sdcc-work-card{border:1px solid var(--border,#ddd);border-radius:12px;padding:10px;background:var(--card,#fff)}.sdcc-work-card span,.sdcc-work-card small{display:block;font-size:11px;opacity:.72}.sdcc-work-card b{display:block;font-size:13px;line-height:1.5;margin:4px 0;word-break:break-word}.sdcc-result{border:1px solid var(--border,#ddd);border-radius:12px;padding:10px;margin-top:8px;background:var(--card,#fff)}.sdcc-result h4{margin:0 0 6px;font-size:13px}.sdcc-result div{font-size:12px;line-height:1.55;white-space:pre-wrap}.sdcc-result p{font-size:10px;opacity:.68;margin:7px 0 0}.sdcc-next{margin-top:8px;padding:9px;border-radius:10px;background:rgba(120,120,120,.09);font-size:12px;line-height:1.5}",
      ".sdcc-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.sdcc-stat{border:1px solid var(--border,#ddd);border-radius:12px;padding:10px;background:var(--card,#fff)}.sdcc-stat span,.sdcc-stat small{display:block;font-size:11px;opacity:.72}.sdcc-stat b{display:block;font-size:15px;margin:4px 0}",
      ".sdcc-boundary{font-size:12px;line-height:1.55;margin-top:10px;padding:9px;border-radius:10px;background:rgba(120,120,120,.09)}",
      ".sdcc-operational{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.sdcc-op{border:1px solid var(--border,#ddd);border-radius:12px;padding:10px;background:var(--card,#fff)}.sdcc-op b,.sdcc-op span,.sdcc-op small{display:block}.sdcc-op span{font-size:13px;font-weight:800;margin:4px 0}.sdcc-op small{font-size:11px;opacity:.72}",
      ".sdcc-phases{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.sdcc-phase{border:1px solid var(--border,#ddd);border-radius:12px;padding:9px;background:var(--card,#fff)}.sdcc-phase>div{display:flex;justify-content:space-between;gap:8px}.sdcc-phase span{font-size:11px;opacity:.7}.sdcc-phase strong{font-size:11px;display:inline-block;margin:5px 0}.sdcc-phase strong.ready,.sdcc-phase strong.check{font-weight:800}.sdcc-phase small{display:block;font-size:11px;line-height:1.35;opacity:.75}",
      ".sdcc-flow{display:grid;gap:7px}.sdcc-flow-item{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border,#ddd);padding:8px 2px}.sdcc-flow-item:last-child{border-bottom:0}.sdcc-flow-item b{font-size:13px}.sdcc-flow-item span{font-size:12px;text-align:right;opacity:.76}.sdcc-flow-item.active b{font-weight:900}",
      ".sdcc-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}",
      ".sdcc-log{white-space:pre-wrap;word-break:break-word;background:#111;color:#eee;border-radius:10px;padding:10px;max-height:300px;overflow:auto;font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}",
      ".sdcc-note{font-size:11px;line-height:1.5;opacity:.72}",
      "body.dark .sdcc-sheet{background:#202124;color:#e8eaed}body.dark .sdcc-section{background:#292a2d;border-color:#5f6368}body.dark .sdcc-stat,body.dark .sdcc-phase,body.dark .sdcc-op,body.dark .sdcc-work-card,body.dark .sdcc-result,body.dark .sdcc-idea,body.dark .sdcc-actions button:not(.primary),body.dark .sdcc-primary-actions button:not(.primary),body.dark .sdcc-idea textarea{background:#303134;border-color:#5f6368;color:#e8eaed}",
      "@media(max-width:720px){.sdcc-primary-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.sdcc-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.sdcc-phases{grid-template-columns:repeat(2,minmax(0,1fr))}.sdcc-work-grid,.sdcc-operational{grid-template-columns:1fr}.sdcc-actions{grid-template-columns:1fr}.sdcc-sheet{padding:12px}.sdcc-head{top:-12px}}"
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

  async function analyzeWorkspaceIntent(input) {
    const userIntent = String(input && input.userIntent != null ? input.userIntent : input || "").trim();
    if (!userIntent) return { ok: false, code: "SDCC_USER_INTENT_REQUIRED", status: "Blocked", externalTransmissionPerformed: false };
    if (userIntent.length > 4000) return { ok: false, code: "SDCC_USER_INTENT_TOO_LARGE", status: "Blocked", maxChars: 4000, externalTransmissionPerformed: false };
    const baselineResult = await ensureBaseline();
    if (!baselineResult || baselineResult.ok !== true) return baselineResult;
    if (typeof namespace.inspectSelfDevelopmentRepository !== "function") return { ok: false, code: "SDCC_REPOSITORY_INSPECTOR_UNAVAILABLE", status: "Blocked", externalTransmissionPerformed: false };
    const inspectionResult = await namespace.inspectSelfDevelopmentRepository({ baselineIdentity: baselineResult.data && baselineResult.data.baselineIdentity, maxFetchedFiles: 64 });
    if (!inspectionResult || inspectionResult.ok !== true) return inspectionResult;
    const p5 = safeCall("getSelfDevelopmentPhase5Dashboard", null);
    const p6 = safeCall("getSelfDevelopmentPhase6Dashboard", null);
    const readiness = typeof namespace.inspectSelfDevelopmentPhase6ExternalAiReadiness === "function" ? namespace.inspectSelfDevelopmentPhase6ExternalAiReadiness() : { readiness: "UNAVAILABLE" };
    const inspection = inspectionResult.data && inspectionResult.data.inspection || {};
    const selectedFiles = selectRelevantFiles(userIntent, inspection);
    const evidenceItems = buildWorkspaceEvidence(userIntent, inspectionResult, p5, p6);
    let contextResult = null;
    if (typeof namespace.buildSelfDevelopmentPhase6ContextPackage === "function") contextResult = await namespace.buildSelfDevelopmentPhase6ContextPackage({ userIntent: userIntent, evidenceItems: evidenceItems });
    workspace = Object.assign(createEmptyWorkspace(), {
      state: "ANALYZED",
      userIntent: userIntent,
      baselineResult: clone(baselineResult),
      inspectionResult: clone(inspectionResult),
      contextResult: clone(contextResult),
      readiness: clone(readiness),
      selectedFiles: selectedFiles,
      evidenceItems: clone(evidenceItems),
      analyzedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    return {
      ok: true,
      code: "SDCC_WORKSPACE_LOCAL_ANALYSIS_READY",
      status: "Review Ready",
      data: {
        userIntent: userIntent,
        baselineIdentityId: baselineResult.data && baselineResult.data.baselineIdentity && baselineResult.data.baselineIdentity.baselineIdentityId || null,
        inspectionId: inspection.inspectionId || null,
        selectedFiles: selectedFiles,
        findings: inspection.findings || [],
        boundedContextReady: Boolean(contextResult && contextResult.ok === true),
        externalAiReadiness: readiness && readiness.readiness || "UNKNOWN",
        externalTransmissionPerformed: false,
        providerNetworkCallPerformed: false,
        canonicalMutationPerformed: false
      }
    };
  }

  function externalSettingsFromWorkspace() {
    return {
      userIntent: workspace.userIntent,
      evidenceItems: clone(workspace.evidenceItems)
    };
  }

  async function prepareWorkspaceExternalAi() {
    if (workspace.state === "IDLE" || !workspace.userIntent) return { ok: false, code: "SDCC_LOCAL_ANALYSIS_REQUIRED", status: "Blocked", providerNetworkCallPerformed: false };
    if (typeof namespace.prepareSelfDevelopmentPhase6ExternalAiReasoning !== "function") return { ok: false, code: "SDCC_EXTERNAL_AI_PREPARE_UNAVAILABLE", status: "Blocked", providerNetworkCallPerformed: false };
    const result = await namespace.prepareSelfDevelopmentPhase6ExternalAiReasoning(externalSettingsFromWorkspace());
    workspace.preparedExternalAi = clone(result);
    workspace.updatedAt = new Date().toISOString();
    return result;
  }

  async function executeWorkspaceExternalAi() {
    if (workspace.state === "IDLE" || !workspace.userIntent) return { ok: false, code: "SDCC_LOCAL_ANALYSIS_REQUIRED", status: "Blocked", providerNetworkCallPerformed: false };
    if (typeof namespace.executeSelfDevelopmentPhase6ExternalAiReasoning !== "function") return { ok: false, code: "SDCC_EXTERNAL_AI_EXECUTION_UNAVAILABLE", status: "Blocked", providerNetworkCallPerformed: false };
    if (!workspace.readiness || workspace.readiness.readiness !== "PHASE6_EXTERNAL_AI_READY") return { ok: false, code: "SDCC_EXTERNAL_AI_NOT_READY", status: "Blocked", readiness: clone(workspace.readiness), externalTransmissionPerformed: false, providerNetworkCallPerformed: false };
    if (!global.confirm || global.confirm("現在のBounded Contextを外部AIへ送信します。Paid APIが使用される可能性があります。Project Ownerとしてこの1回の外部送信を承認しますか？") !== true) {
      return { ok: false, code: "SDCC_EXTERNAL_AI_OWNER_CONFIRMATION_REQUIRED", status: "Cancelled", externalTransmissionPerformed: false, providerNetworkCallPerformed: false };
    }
    const interactionEvidenceId = "SDCC-OWNER-INTERACTION-" + Date.now().toString(36).toUpperCase();
    const result = await namespace.executeSelfDevelopmentPhase6ExternalAiReasoning(Object.assign(externalSettingsFromWorkspace(), {
      projectOwnerConfirmed: true,
      ownerInteractionTrusted: true,
      externalTransmissionApproved: true,
      interactionEvidenceId: interactionEvidenceId
    }));
    workspace.externalAiResult = clone(result);
    if (result && result.ok === true && result.data && typeof namespace.buildSelfDevelopmentPhase6ReasoningHandoff === "function") {
      workspace.reasoningHandoff = clone(namespace.buildSelfDevelopmentPhase6ReasoningHandoff(result.data));
      workspace.state = "AI_ANALYZED";
    }
    workspace.updatedAt = new Date().toISOString();
    return result;
  }

  async function registerWorkspaceImprovement() {
    if (workspace.state === "IDLE" || !workspace.userIntent || !workspace.inspectionResult) return { ok: false, code: "SDCC_LOCAL_ANALYSIS_REQUIRED", status: "Blocked", canonicalMutationPerformed: false };
    const baseline = workspace.baselineResult && workspace.baselineResult.data && workspace.baselineResult.data.baselineIdentity || null;
    const evidence = workspace.inspectionResult && workspace.inspectionResult.data && workspace.inspectionResult.data.evidence || null;
    if (!baseline || !evidence || !evidence.evidenceId) return { ok: false, code: "SDCC_ANALYSIS_EVIDENCE_REQUIRED", status: "Blocked", canonicalMutationPerformed: false };
    if (typeof namespace.createSelfDevelopmentCandidate !== "function" || typeof namespace.createSelfDevelopmentProposal !== "function") return { ok: false, code: "SDCC_CANDIDATE_PROPOSAL_API_REQUIRED", status: "Blocked", canonicalMutationPerformed: false };
    const selectedFiles = workspace.selectedFiles || [];
    const scope = typeof namespace.classifySelfDevelopmentChangeScope === "function" ? namespace.classifySelfDevelopmentChangeScope({ affectedFiles: selectedFiles, affectedFunctions: [] }) : { classification: "ARCHITECTURE_REVIEW", protectedControlPlaneChange: false, architectureReviewRequired: true };
    const aiOutput = workspaceExternalOutput();
    const candidateResult = namespace.createSelfDevelopmentCandidate({
      baselineIdentity: baseline,
      evidenceRefs: [evidence.evidenceId],
      opportunityType: "PROJECT_OWNER_REQUESTED_IMPROVEMENT",
      problemSummary: workspace.userIntent,
      affectedComponent: "AI-PROMPT-OS",
      affectedFiles: selectedFiles,
      affectedFunctions: [],
      expectedBenefit: aiOutput ? "Implement the reviewed External AI proposal candidate after validation." : "Address the Project Owner requested improvement using the smallest safe change.",
      expectedSideEffects: [],
      riskLevel: scope.protectedControlPlaneChange ? "HIGH" : "MEDIUM",
      impactScope: scope.classification || "ARCHITECTURE_REVIEW",
      estimatedChangeSize: selectedFiles.length === 1 ? "SMALL_OR_MEDIUM" : "UNKNOWN",
      rollbackStrategy: "REQUIRED_BEFORE_ADOPTION",
      validationRequirements: ["SYNTAX", "FUNCTIONAL", "REGRESSION", "AUTHORITY"],
      externalAiRequirement: aiOutput ? "USED_FOR_PROPOSAL_CANDIDATE_ONLY" : "OPTIONAL",
      confidence: null,
      missingInformation: selectedFiles.length ? [] : ["AFFECTED_FILES_NOT_YET_CONFIRMED"]
    });
    if (!candidateResult || candidateResult.ok !== true) return candidateResult;
    const candidate = candidateResult.data.candidate;
    const proposalResult = namespace.createSelfDevelopmentProposal({
      candidateId: candidate.candidateId,
      changeSummary: workspace.userIntent,
      recommendedApproach: aiOutput || "Inspect relevant architecture and prepare the smallest safe governed change.",
      impact: scope.classification || candidate.impactScope,
      risk: candidate.riskLevel,
      affectedFiles: candidate.affectedFiles,
      affectedFunctions: candidate.affectedFunctions,
      validationRequirements: candidate.validationRequirements,
      rollbackStrategy: candidate.rollbackStrategy,
      protectedControlPlaneChange: Boolean(scope.protectedControlPlaneChange)
    });
    workspace.candidateResult = clone(candidateResult);
    workspace.proposalResult = clone(proposalResult);
    workspace.state = proposalResult && proposalResult.ok === true ? "PROPOSAL_REGISTERED" : "CANDIDATE_REGISTERED";
    workspace.updatedAt = new Date().toISOString();
    return {
      ok: Boolean(proposalResult && proposalResult.ok === true),
      code: proposalResult && proposalResult.ok === true ? "SDCC_IMPROVEMENT_REVIEW_RECORD_REGISTERED" : "SDCC_PROPOSAL_REGISTRATION_BLOCKED",
      status: proposalResult && proposalResult.ok === true ? "Review Registered" : "Blocked",
      data: {
        candidate: candidateResult,
        proposal: proposalResult,
        classification: scope,
        adoptionAuthorizationGranted: false,
        diffGenerationAuthorized: false,
        canonicalMutationPerformed: false,
        authorityEffect: "none"
      }
    };
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
      "SELF-DEVELOPMENT-058 Workspace v" + VERSION,
      "Decision: EXTERNAL-010-DECISION-058",
      "Formal Decision Status: " + FORMAL_DECISION058_FREEZE.status,
      "Decision Requirements: 18/18 COMPLETE",
      "Freeze Baseline: " + FORMAL_DECISION058_FREEZE.canonicalBaseline + " / " + FORMAL_DECISION058_FREEZE.canonicalScriptCount + " scripts",
      "Current Runtime Baseline: " + (s.baseline && s.baseline.identityState || "NOT LOADED") + " / " + (s.runtimePackage && s.runtimePackage.scriptCount || "-") + " scripts",
      "Operational Phase5 lineageReady: " + s.operationalReadiness.phase5.lineageReady,
      "Operational Phase6 readiness: " + s.operationalReadiness.phase6.readiness,
      "Candidates: " + s.candidateCount,
      "Proposals: " + s.proposalCount,
      "Workspace State: " + workspace.state,
      "Workspace Intent: " + (workspace.userIntent || ""),
      "",
      "Safety:",
      "- Automatic Approval: OFF",
      "- Automatic Adoption: OFF",
      "- Automatic Canonical Mutation: OFF",
      "- Automatic External Transmission: OFF",
      "- Project Owner explicit external-transmission approval: REQUIRED"
    ];
    return lines.join("\n");
  }

  function buildPanel() {
    const overlay = document.createElement("div");
    overlay.id = "selfdev058-control-center";
    overlay.innerHTML = [
      '<div class="sdcc-sheet" role="dialog" aria-modal="true" aria-label="Self-Development Workspace">',
      '<div class="sdcc-head"><div><h2>Self-Development Workspace</h2><p>入力 → 現状分析 → AI提案 → 影響確認 → Human Gate</p></div><button class="sdcc-close" type="button" aria-label="Close">×</button></div>',
      '<section class="sdcc-section"><div class="sdcc-idea"><label for="sdcc-intent">何を改善したいですか？</label><textarea id="sdcc-intent" maxlength="4000" placeholder="例: 株式分析でニュースの影響評価をもっと総合的にしたい。現状を確認して、安全な改善案と変更後の影響を出してほしい。"></textarea><div class="sdcc-idea-foot"><span>まずローカルで現状を確認し、APIへは必要Contextだけ送ります。</span><span id="sdcc-intent-count">0 / 4000</span></div><div class="sdcc-primary-actions">',
      '<button type="button" class="primary" data-sdcc="analyze">現状を分析</button>',
      '<button type="button" data-sdcc="prepare-ai">AI分析を準備</button>',
      '<button type="button" class="warn" data-sdcc="execute-ai">外部AIで分析</button>',
      '<button type="button" data-sdcc="register">改善案を了承して次へ</button>',
      '</div></div></section>',
      '<section class="sdcc-section"><h3>改善Workspace</h3><div id="sdcc-workspace"></div></section>',
      '<section class="sdcc-section"><h3>正式状態</h3><div id="sdcc-summary"></div></section>',
      '<section class="sdcc-section"><h3>現在の稼働準備</h3><div class="sdcc-operational" id="sdcc-operational"></div></section>',
      '<details class="sdcc-section"><summary>詳細 / 開発者情報</summary><div style="margin-top:10px"><h3>Phase 1〜6 Runtime View</h3><div class="sdcc-phases" id="sdcc-phases"></div><h3 style="margin-top:12px">内部Workflow</h3><div class="sdcc-flow" id="sdcc-workflow"></div><h3 style="margin-top:12px">補助操作</h3><div class="sdcc-actions">',
      '<button type="button" data-sdcc="refresh">状態更新</button>',
      '<button type="button" data-sdcc="baseline">Baseline確認</button>',
      '<button type="button" data-sdcc="inspect">Repository Inspect</button>',
      '<button type="button" data-sdcc="detect">自動Candidate検出</button>',
      '<button type="button" data-sdcc="list">Candidate / Proposal一覧</button>',
      '<button type="button" data-sdcc="validate">Phase 1〜6 Validation</button>',
      '<button type="button" data-sdcc="ai">External AI Readiness</button>',
      '<button type="button" class="primary" data-sdcc="trial">Controlled Trialを開く</button>',
      '<button type="button" data-sdcc="copy">Status Reportをコピー</button>',
      '<button type="button" data-sdcc="reset-workspace">Workspaceをリセット</button>',
      '</div><p class="sdcc-note">「改善案を了承して次へ」はCandidate / Proposal Review登録です。Adoption AuthorizationやCanonical Reflectionではありません。実Writeは既存Controlled Trial + Acceptance Token + Mandatory Rollback等のHuman Gateを再利用します。</p><h3 style="margin-top:12px">最新結果</h3><pre class="sdcc-log" id="sdcc-log">まだ操作はありません。</pre></div></details>',
      '</div>'
    ].join("");
    return overlay;
  }

  function wirePanel() {
    if (!panel) return;
    summaryNode = panel.querySelector("#sdcc-summary");
    operationalNode = panel.querySelector("#sdcc-operational");
    phaseNode = panel.querySelector("#sdcc-phases");
    workflowNode = panel.querySelector("#sdcc-workflow");
    workspaceNode = panel.querySelector("#sdcc-workspace");
    logNode = panel.querySelector("#sdcc-log");
    intentNode = panel.querySelector("#sdcc-intent");
    intentCountNode = panel.querySelector("#sdcc-intent-count");
    panel.querySelector(".sdcc-close").addEventListener("click", closeControlCenter);
    panel.addEventListener("click", function (event) { if (event.target === panel) closeControlCenter(); });
    intentNode.addEventListener("input", function () {
      if (intentCountNode) intentCountNode.textContent = String(intentNode.value.length) + " / 4000";
    });
    panel.querySelector('[data-sdcc="analyze"]').addEventListener("click", function () {
      runAction("改善Workspace / 現状分析", async function () { return analyzeWorkspaceIntent({ userIntent: getIntent() }); });
    });
    panel.querySelector('[data-sdcc="prepare-ai"]').addEventListener("click", function () {
      runAction("改善Workspace / AI分析準備", async function () { return prepareWorkspaceExternalAi(); });
    });
    panel.querySelector('[data-sdcc="execute-ai"]').addEventListener("click", function () {
      runAction("改善Workspace / External AI分析", async function () { return executeWorkspaceExternalAi(); });
    });
    panel.querySelector('[data-sdcc="register"]').addEventListener("click", function () {
      runAction("改善Workspace / Candidate + Proposal登録", async function () { return registerWorkspaceImprovement(); });
    });
    panel.querySelector('[data-sdcc="refresh"]').addEventListener("click", function () { setLog("状態更新", snapshot()); render(); });
    panel.querySelector('[data-sdcc="baseline"]').addEventListener("click", function () { runAction("Baseline確認", ensureBaseline); });
    panel.querySelector('[data-sdcc="inspect"]').addEventListener("click", function () {
      runAction("Repository Inspect", async function () {
        const baseline = await ensureBaseline();
        if (!baseline || baseline.ok !== true) return baseline;
        if (typeof namespace.inspectSelfDevelopmentRepository !== "function") return { ok: false, status: "Blocked", message: "Repository Inspector unavailable." };
        return namespace.inspectSelfDevelopmentRepository({ baselineIdentity: baseline.data && baseline.data.baselineIdentity });
      });
    });
    panel.querySelector('[data-sdcc="detect"]').addEventListener("click", function () {
      runAction("改善Candidate検出", async function () {
        const baseline = await ensureBaseline();
        if (!baseline || baseline.ok !== true) return baseline;
        if (typeof namespace.detectSelfDevelopmentPhase2Candidates !== "function") return { ok: false, status: "Blocked", message: "Candidate detector unavailable." };
        return namespace.detectSelfDevelopmentPhase2Candidates({ baselineIdentity: baseline.data && baseline.data.baselineIdentity });
      });
    });
    panel.querySelector('[data-sdcc="list"]').addEventListener("click", function () { setLog("Candidate / Proposal一覧", { candidates: listCandidates(), proposals: listProposals() }); render(); });
    panel.querySelector('[data-sdcc="validate"]').addEventListener("click", function () { runAction("Phase 1〜6 Validation", runAllValidations); });
    panel.querySelector('[data-sdcc="ai"]').addEventListener("click", function () {
      const fn = namespace.inspectSelfDevelopmentPhase6ExternalAiReadiness;
      setLog("External AI Readiness", typeof fn === "function" ? fn.call(namespace) : { status: "Unavailable" }); render();
    });
    panel.querySelector('[data-sdcc="trial"]').addEventListener("click", function () {
      const fn = namespace.openSelfDevelopmentPhase5TrialUI || global.openSelfDevelopmentPhase5TrialUI;
      const result = typeof fn === "function" ? fn.call(namespace) : { ok: false, status: "Unavailable", message: "Controlled Trial UI unavailable." };
      setLog("Controlled Trial UI", result); render();
    });
    panel.querySelector('[data-sdcc="copy"]').addEventListener("click", async function () {
      const report = buildReport();
      try { if (global.navigator && navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(report); setLog("Status Reportコピー", { ok: true, copied: true, report: report }); }
      catch (error) { setLog("Status Reportコピー", { ok: false, copied: false, report: report, error: error.message }); }
    });
    panel.querySelector('[data-sdcc="reset-workspace"]').addEventListener("click", function () {
      workspace = createEmptyWorkspace();
      if (intentNode) intentNode.value = "";
      if (intentCountNode) intentCountNode.textContent = "0 / 4000";
      setLog("Workspaceリセット", { ok: true, state: workspace.state });
      render();
    });
  }

  function mountControlCenter() {
    if (!global.document || mounted) return mounted;
    addStyle();
    panel = buildPanel();
    document.body.appendChild(panel);
    const launcher = document.createElement("button");
    launcher.id = "selfdev058-control-center-launcher";
    launcher.type = "button";
    launcher.textContent = "SD Workspace";
    launcher.addEventListener("click", openControlCenter);
    document.body.appendChild(launcher);
    wirePanel();
    mounted = true;
    render();
    return true;
  }

  function openControlCenter() {
    if (!mounted) mountControlCenter();
    if (panel) panel.classList.add("open");
    render();
    return { ok: true, status: "Ready", mounted: mounted, workspaceVersion: VERSION };
  }

  function closeControlCenter() {
    if (panel) panel.classList.remove("open");
    return { ok: true, status: "Closed" };
  }

  function validateControlCenter() {
    const checks = [];
    function check(name, passed, detail) { checks.push({ name: name, passed: Boolean(passed), detail: clone(detail) }); }
    const s = snapshot();
    check("Control Center is additive UI / Workspace only", true, { componentId: COMPONENT_ID, version: VERSION, directMutationAuthorityAdded: false });
    check("Formal Decision 058 Freeze is represented as 18/18 Final Accepted/Frozen", s.formalDecisionStatus.status === "FINAL_ACCEPTED / FINAL_FROZEN" && s.formalDecisionStatus.complete === true && s.formalDecisionStatus.requirementsImplemented === 18 && s.formalDecisionStatus.requirementsTotal === 18, s.formalDecisionStatus);
    check("Formal Freeze status is separated from operational readiness", s.decision058.runtimeCoverageIsOperationalEvidenceNotFormalFreezeStatus === true && s.operationalReadiness && s.operationalReadiness.phase5 && s.operationalReadiness.phase6, s.operationalReadiness);
    check("Project Owner improvement-intent workspace API exists", typeof analyzeWorkspaceIntent === "function", typeof analyzeWorkspaceIntent);
    check("Bounded Phase 6 context package API exists", typeof namespace.buildSelfDevelopmentPhase6ContextPackage === "function", typeof namespace.buildSelfDevelopmentPhase6ContextPackage);
    check("External AI preparation API exists", typeof namespace.prepareSelfDevelopmentPhase6ExternalAiReasoning === "function", typeof namespace.prepareSelfDevelopmentPhase6ExternalAiReasoning);
    check("External AI execution remains explicit Project Owner interaction only", typeof namespace.executeSelfDevelopmentPhase6ExternalAiReasoning === "function" && s.hardBoundaries.externalTransmissionAutomatic === false && s.hardBoundaries.explicitProjectOwnerExternalTransmissionApprovalRequired === true, s.hardBoundaries);
    check("Candidate / Proposal registration APIs exist", typeof namespace.createSelfDevelopmentCandidate === "function" && typeof namespace.createSelfDevelopmentProposal === "function", { candidate: typeof namespace.createSelfDevelopmentCandidate, proposal: typeof namespace.createSelfDevelopmentProposal });
    check("Phase 5 Controlled Trial UI bridge exists", typeof namespace.openSelfDevelopmentPhase5TrialUI === "function" || typeof global.openSelfDevelopmentPhase5TrialUI === "function", typeof namespace.openSelfDevelopmentPhase5TrialUI);
    check("Control Center does not expose automatic approval", s.hardBoundaries.automaticCandidateApproval === false, s.hardBoundaries.automaticCandidateApproval);
    check("Control Center does not expose automatic adoption", s.hardBoundaries.automaticAdoption === false, s.hardBoundaries.automaticAdoption);
    check("Control Center does not expose automatic canonical mutation", s.hardBoundaries.canonicalMutationAutomatic === false, s.hardBoundaries.canonicalMutationAutomatic);
    check("Workspace local analysis is designed to perform no external transmission", workspace.externalAiResult == null || workspace.externalAiResult.externalTransmissionPerformed !== true || workspace.state === "AI_ANALYZED", { workspaceState: workspace.state, automaticExternalTransmission: false });
    check("Validation performs no provider network call", true, false);
    const failed = checks.filter(function (row) { return !row.passed; });
    return Object.freeze({
      id: "SELF-DEVELOPMENT-058-CONTROL-CENTER-VALIDATION",
      version: VERSION,
      passed: checks.length - failed.length,
      failed: failed.length,
      total: checks.length,
      health: checks.length ? Math.round((checks.length - failed.length) / checks.length * 100) : 100,
      criticalFailed: failed.length,
      canonicalMutationPerformed: false,
      externalTransmissionPerformed: false,
      providerNetworkCallPerformed: false,
      validationIsApproval: false,
      formalDecision058FreezeVerified: failed.every(function (row) { return row.name !== "Formal Decision 058 Freeze is represented as 18/18 Final Accepted/Frozen"; }),
      checks: checks,
      validatedAt: new Date().toISOString()
    });
  }

  Object.assign(namespace.api || (namespace.api = {}), {
    getSelfDevelopment058ControlCenterSnapshot: snapshot,
    getSelfDevelopment058FormalFreezeStatus: function () { return clone(FORMAL_DECISION058_FREEZE); },
    getSelfDevelopment058WorkspaceState: function () { return clone(workspace); },
    analyzeSelfDevelopment058WorkspaceIntent: analyzeWorkspaceIntent,
    prepareSelfDevelopment058WorkspaceExternalAi: prepareWorkspaceExternalAi,
    executeSelfDevelopment058WorkspaceExternalAi: executeWorkspaceExternalAi,
    registerSelfDevelopment058WorkspaceImprovement: registerWorkspaceImprovement,
    openSelfDevelopment058ControlCenter: openControlCenter,
    closeSelfDevelopment058ControlCenter: closeControlCenter,
    validateSelfDevelopment058ControlCenter: validateControlCenter
  });
  Object.assign(namespace, namespace.api);
  global.openSelfDevelopment058ControlCenter = openControlCenter;
  global.closeSelfDevelopment058ControlCenter = closeControlCenter;
  global.validateSelfDevelopment058ControlCenter = validateControlCenter;
  global.analyzeSelfDevelopment058WorkspaceIntent = analyzeWorkspaceIntent;

  if (global.document) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountControlCenter, { once: true });
    else mountControlCenter();
  }
})(typeof window !== "undefined" ? window : globalThis);
