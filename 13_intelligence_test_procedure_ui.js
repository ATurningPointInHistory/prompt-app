/* ============================================================
   FILE: 13_intelligence_test_procedure_ui.js
   IDE-170 Intelligence Platform
   Version: 1.6.0
   Architecture Decision: 011 v1.1.0
   Phase: Test Procedure Intake and Validation Compiler (Pre-Phase 4)
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Test Procedure UI blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const VERSION = "1.6.0";
  const CAPABILITY_ID = "IDE-170-TEST-PROCEDURE-UI";
  const UI_ID = "ide170-test-procedure-console";

  const viewState = {
    procedureId: null,
    parsedProcedureId: null,
    candidateId: null,
    datasetId: null,
    lastRunResult: null,
    manualConfirmationState: {},
    displayMode: "expanded",
    busy: false
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function ensureStyle() {
    if (!global.document || global.document.getElementById(UI_ID + "-style")) return;
    const style = global.document.createElement("style");
    style.id = UI_ID + "-style";
    style.textContent = `
#${UI_ID}{position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.72);display:flex;align-items:stretch;justify-content:center;padding:10px;font-family:system-ui,-apple-system,sans-serif;color:#eef2f7}
#${UI_ID} .ide170-panel{width:min(980px,100%);height:100%;background:#111827;border:1px solid #374151;border-radius:14px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.45)}
#${UI_ID} .ide170-header{display:flex;gap:10px;align-items:center;padding:12px 14px;background:#0b1220;border-bottom:1px solid #374151}
#${UI_ID} .ide170-title{font-weight:700;flex:1;min-width:0}
#${UI_ID} .ide170-dock-summary{font-size:12px;color:#93c5fd;white-space:nowrap}
#${UI_ID} .ide170-body{overflow:auto;padding:14px;display:grid;gap:14px}
#${UI_ID} .ide170-section{border:1px solid #374151;border-radius:10px;padding:12px;background:#182131}
#${UI_ID} .ide170-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
#${UI_ID} button,#${UI_ID} input[type=file]{font:inherit}
#${UI_ID} button{border:1px solid #4b5563;background:#263247;color:#fff;border-radius:8px;padding:9px 12px;cursor:pointer}
#${UI_ID} button.primary{background:#2563eb;border-color:#3b82f6}
#${UI_ID} button.success{background:#047857;border-color:#10b981}
#${UI_ID} button.warning{background:#92400e;border-color:#f59e0b}
#${UI_ID} button:disabled{opacity:.45;cursor:not-allowed}
#${UI_ID} .ide170-step{border:1px solid #3f4a5d;border-radius:9px;padding:10px;margin-top:9px;background:#111827}
#${UI_ID} .ide170-step.auto{border-left:5px solid #10b981}
#${UI_ID} .ide170-step.warning{border-left:5px solid #f59e0b}
#${UI_ID} .ide170-step.manual{border-left:5px solid #60a5fa}
#${UI_ID} .ide170-step.prohibited{border-left:5px solid #ef4444}
#${UI_ID} .ide170-step.unrecognized{border-left:5px solid #a78bfa}
#${UI_ID} .ide170-badge{display:inline-block;border-radius:999px;padding:2px 8px;background:#334155;font-size:12px;margin-left:6px}
#${UI_ID} pre{white-space:pre-wrap;word-break:break-word;background:#080d16;border:1px solid #303a4b;border-radius:8px;padding:9px;max-height:240px;overflow:auto}
#${UI_ID} .ide170-muted{color:#aab4c4;font-size:13px}
#${UI_ID} .ide170-error{color:#fca5a5}
#${UI_ID} .ide170-ok{color:#6ee7b7}
#${UI_ID} .ide170-footer{padding:10px 14px;background:#0b1220;border-top:1px solid #374151;display:flex;gap:8px;flex-wrap:wrap}
#${UI_ID} .ide170-progress{height:8px;background:#263247;border-radius:999px;overflow:hidden;margin-top:8px}
#${UI_ID} .ide170-progress>span{display:block;height:100%;width:0;background:#3b82f6;transition:width .15s}
#${UI_ID} [data-role=restore]{display:none}
#${UI_ID}.ide170-minimized{inset:auto 8px 8px auto;width:min(420px,calc(100vw - 16px));height:auto;background:transparent;padding:0;display:block;pointer-events:none}
#${UI_ID}.ide170-minimized .ide170-panel{width:100%;height:auto;min-height:0;border-radius:12px;pointer-events:auto;box-shadow:0 12px 36px rgba(0,0,0,.5)}
#${UI_ID}.ide170-minimized .ide170-header{border-bottom:0;padding:8px 10px}
#${UI_ID}.ide170-minimized .ide170-body,#${UI_ID}.ide170-minimized .ide170-footer{display:none}
#${UI_ID}.ide170-minimized [data-role=minimize]{display:none}
#${UI_ID}.ide170-minimized [data-role=restore]{display:inline-block}
#${UI_ID}.ide170-minimized .ide170-title{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media(max-width:600px){#${UI_ID}{padding:0}#${UI_ID} .ide170-panel{border-radius:0;border:0}#${UI_ID} .ide170-body{padding:10px}#${UI_ID}.ide170-minimized{padding:0;right:6px;bottom:6px;width:calc(100vw - 12px)}#${UI_ID}.ide170-minimized .ide170-panel{border:1px solid #374151;border-radius:10px}}
`;
    global.document.head.appendChild(style);
  }

  function root() {
    return global.document && global.document.getElementById(UI_ID);
  }

  function manualConfirmationProgress() {
    if (!viewState.candidateId) return { confirmed: 0, total: 0 };
    const candidate = namespace.getValidationDatasetCandidate(viewState.candidateId);
    if (!candidate || !Array.isArray(candidate.steps)) return { confirmed: 0, total: 0 };
    const selectedManualSteps = candidate.steps.filter(function selectedManual(step) {
      if (step.executionPolicy !== "Manual Confirmation") return false;
      const selection = Array.isArray(candidate.ownerSelections)
        ? candidate.ownerSelections.find(function find(item) { return item.stepId === step.stepId; })
        : null;
      return Boolean(selection && selection.selected === true);
    });
    const confirmed = selectedManualSteps.filter(function confirmedStep(step) {
      return viewState.manualConfirmationState[step.stepId] === true;
    }).length;
    return { confirmed: confirmed, total: selectedManualSteps.length };
  }

  function updateDockSummary() {
    const container = root();
    if (!container) return;
    const element = container.querySelector("[data-role=dock-summary]");
    if (!element) return;
    const progress = manualConfirmationProgress();
    const evidenceReady = Boolean(
      viewState.lastRunResult &&
      viewState.lastRunResult.data &&
      viewState.lastRunResult.data.evidencePackageId
    );
    if (viewState.busy) {
      element.textContent = "実行中";
    } else if (evidenceReady) {
      element.textContent = "Evidence保存可能";
    } else if (progress.total) {
      element.textContent = "手動確認 " + progress.confirmed + "/" + progress.total;
    } else if (viewState.candidateId) {
      element.textContent = "解析済み";
    } else {
      element.textContent = "待機中";
    }
  }

  function setDisplayMode(mode) {
    const container = root();
    if (!container) return;
    viewState.displayMode = mode === "minimized" ? "minimized" : "expanded";
    container.classList.toggle("ide170-minimized", viewState.displayMode === "minimized");
    updateDockSummary();
  }

  function minimizeTestProcedureValidationConsole() {
    setDisplayMode("minimized");
    return internal.buildResult(true, "TEST_PROCEDURE_UI_MINIMIZED", "Ready", {
      manualConfirmationProgress: manualConfirmationProgress()
    });
  }

  function restoreTestProcedureValidationConsole() {
    const container = root();
    if (container) container.style.display = "flex";
    setDisplayMode("expanded");
    return internal.buildResult(true, "TEST_PROCEDURE_UI_RESTORED", "Ready", null);
  }

  function setMessage(message, type) {
    const element = root() && root().querySelector("[data-role=message]");
    if (!element) return;
    element.className = type === "error" ? "ide170-error" : type === "ok" ? "ide170-ok" : "ide170-muted";
    element.textContent = String(message || "");
  }

  function syncActionButtons() {
    const container = root();
    if (!container) return;
    const importButton = container.querySelector("[data-role=import]");
    const approveButton = container.querySelector("[data-role=approve]");
    const runButton = container.querySelector("[data-role=run]");
    const downloadButton = container.querySelector("[data-role=download]");
    if (importButton) importButton.disabled = viewState.busy;
    if (approveButton) approveButton.disabled = viewState.busy || !viewState.candidateId || Boolean(viewState.datasetId);
    if (runButton) runButton.disabled = viewState.busy || !viewState.datasetId;
    if (downloadButton) {
      downloadButton.disabled = viewState.busy || !(
        viewState.lastRunResult &&
        viewState.lastRunResult.data &&
        viewState.lastRunResult.data.evidencePackageId
      );
    }
    updateDockSummary();
  }

  function setBusy(busy, message) {
    viewState.busy = busy === true;
    const container = root();
    if (!container) return;
    if (viewState.busy) {
      container.querySelectorAll("button").forEach(function disable(button) {
        if (!["close", "minimize", "restore"].includes(button.dataset.role)) button.disabled = true;
      });
    } else {
      syncActionButtons();
    }
    if (message) setMessage(message);
  }

  function setProgress(event) {
    const container = root();
    if (!container) return;
    const bar = container.querySelector("[data-role=progress-bar]");
    const text = container.querySelector("[data-role=progress-text]");
    if (bar) bar.style.width = Math.max(0, Math.min(100, Number(event && event.progress) || 0)) + "%";
    if (text) text.textContent = event ? (event.stage + " " + (event.message || "")) : "";
  }

  function policyClass(policy) {
    if (policy === "Auto Executable") return "auto";
    if (policy === "Warning Selectable") return "warning";
    if (policy === "Manual Confirmation") return "manual";
    if (policy === "Prohibited") return "prohibited";
    return "unrecognized";
  }

  function policyLabel(policy) {
    return {
      "Auto Executable": "自動実行可能",
      "Warning Selectable": "警告付き実行可能",
      "Manual Confirmation": "手動確認",
      Prohibited: "実行禁止",
      Unrecognized: "認識できません"
    }[policy] || policy;
  }

  function renderPlan() {
    const container = root();
    if (!container || !viewState.candidateId) return;
    const plan = namespace.getProcedureExecutionPlan(viewState.candidateId);
    const area = container.querySelector("[data-role=plan]");
    if (!area || !plan) return;

    const summary = `<div class="ide170-muted">全${plan.total}件 / 選択${plan.selected}件 / 自動${plan.autoExecutable} / 警告${plan.warningSelectable} / 手動${plan.manualConfirmation} / 禁止${plan.prohibited} / 未認識${plan.unrecognized}</div>`;
    const steps = plan.steps.map(function step(item) {
      const disabled = item.executionPolicy === "Prohibited";
      const isWarning = item.executionPolicy === "Warning Selectable";
      const isUnrecognized = item.executionPolicy === "Unrecognized";
      const checked = item.selected ? "checked" : "";
      const reasons = item.warningReasons.concat(item.prohibitedReasons).map(function reason(value) {
        return "- " + escapeHtml(value);
      }).join("\n");
      const expected = item.expectedConditions.length
        ? escapeHtml(JSON.stringify(item.expectedConditions, null, 2))
        : "期待結果を認識できませんでした。";
      return `<div class="ide170-step ${policyClass(item.executionPolicy)}" data-step-id="${escapeHtml(item.stepId)}">
        <div><strong>${escapeHtml(item.stepId)} ${escapeHtml(item.title)}</strong><span class="ide170-badge">${escapeHtml(policyLabel(item.executionPolicy))}</span>${item.warningLevel ? `<span class="ide170-badge">${escapeHtml(item.warningLevel)}</span>` : ""}</div>
        ${reasons ? `<pre>${reasons}</pre>` : ""}
        ${item.executionCode ? `<details><summary>実行コード</summary><pre>${escapeHtml(item.executionCode)}</pre></details>` : ""}
        <details><summary>期待結果</summary><pre>${expected}</pre></details>
        <div class="ide170-row">
          ${isUnrecognized ? `<label><input type="checkbox" data-role="convert-warning"> 警告付き実行可能へ変更</label>` : ""}
          ${isWarning || isUnrecognized ? `<label><input type="checkbox" data-role="ack-warning" ${item.warningAcknowledged ? "checked" : ""}> 警告を確認しました</label>` : ""}
          <label><input type="checkbox" data-role="select-step" ${checked} ${disabled ? "disabled" : ""}> ${item.executionPolicy === "Manual Confirmation" ? "確認項目に含める" : "実行対象に含める"}</label>
          ${item.executionPolicy === "Manual Confirmation" ? `<label><input type="checkbox" data-role="confirm-manual" ${viewState.manualConfirmationState[item.stepId] ? "checked" : ""}> 実機で確認しました</label>` : ""}
        </div>
      </div>`;
    }).join("");
    area.innerHTML = summary + steps;
    updateDockSummary();

    area.querySelectorAll("[data-role=select-step]").forEach(function bind(checkbox) {
      checkbox.addEventListener("change", function update() {
        const stepElement = checkbox.closest("[data-step-id]");
        const stepId = stepElement.dataset.stepId;
        const ack = stepElement.querySelector("[data-role=ack-warning]");
        const convert = stepElement.querySelector("[data-role=convert-warning]");
        const result = namespace.updateProcedureStepSelection(viewState.candidateId, stepId, {
          selected: checkbox.checked,
          warningAcknowledged: Boolean(ack && ack.checked),
          convertToWarningSelectable: Boolean(convert && convert.checked),
          selectedBy: "Project Owner"
        }, { actor: "Project Owner" });
        if (!result.ok) {
          checkbox.checked = false;
          setMessage(result.error && result.error.message || result.code, "error");
        } else {
          setMessage("選択を更新しました。", "ok");
          renderPlan();
        }
      });
    });
    area.querySelectorAll("[data-role=confirm-manual]").forEach(function bindManual(checkbox) {
      checkbox.addEventListener("change", function rememberManual() {
        const stepElement = checkbox.closest("[data-step-id]");
        if (!stepElement) return;
        viewState.manualConfirmationState[stepElement.dataset.stepId] = checkbox.checked === true;
        updateDockSummary();
      });
    });
  }

  async function importSelectedFile() {
    const container = root();
    const input = container.querySelector("[data-role=file]");
    const file = input && input.files && input.files[0];
    if (!file) {
      setMessage("実機検証手順ファイルを選択してください。", "error");
      return;
    }
    setBusy(true, "手順書を取り込んで解析しています…");
    try {
      const imported = await namespace.importTestProcedure(file, {
        actor: "Project Owner",
        version: "1.0.0",
        phase: namespace.implementationPhase
      });
      if (!imported.ok) throw new Error(imported.error && imported.error.message || imported.code);
      viewState.procedureId = imported.data.procedure.procedureId;
      const parsed = namespace.parseTestProcedure(viewState.procedureId, { actor: "Project Owner" });
      if (!parsed.ok) throw new Error(parsed.error && parsed.error.message || parsed.code);
      viewState.parsedProcedureId = parsed.data.parsedProcedure.parsedProcedureId;
      const compiled = namespace.compileTestProcedure(viewState.parsedProcedureId, { actor: "Project Owner" });
      if (!compiled.ok) throw new Error(compiled.error && compiled.error.message || compiled.code);
      viewState.candidateId = compiled.data.candidate.candidateId;
      viewState.datasetId = null;
      viewState.lastRunResult = null;
      viewState.manualConfirmationState = {};
      renderPlan();
      syncActionButtons();
      setMessage("解析が完了しました。警告と実行対象を確認してください。", "ok");
    } catch (error) {
      setMessage(error.message || String(error), "error");
    } finally {
      setBusy(false);
    }
  }

  function approveCandidate() {
    if (!viewState.candidateId) return;
    const result = namespace.approveValidationDatasetCandidate(viewState.candidateId, {
      actor: "Project Owner",
      version: "1.0.0"
    });
    if (!result.ok) {
      setMessage(result.error && result.error.message || result.code, "error");
      return;
    }
    viewState.datasetId = result.data.dataset.datasetId;
    syncActionButtons();
    setMessage("Test Datasetを承認・Freezeしました。テストを開始できます。", "ok");
    renderPlan();
  }

  function collectManualConfirmations() {
    const candidate = namespace.getValidationDatasetCandidate(viewState.candidateId);
    const dataset = viewState.datasetId ? namespace.getTestDataset(viewState.datasetId) : null;
    if (!candidate || !dataset) return [];
    const result = [];
    candidate.steps.filter(function manual(step) { return step.executionPolicy === "Manual Confirmation"; }).forEach(function map(step) {
      const selection = candidate.ownerSelections.find(function find(item) { return item.stepId === step.stepId; });
      if (!selection || !selection.selected) return;
      const testCase = dataset.testCases.find(function find(item) { return item.tags && item.tags.includes(step.stepId); });
      const checkbox = root().querySelector(`[data-step-id="${step.stepId}"] [data-role=confirm-manual]`);
      result.push({
        caseId: testCase && testCase.caseId,
        testType: "Manual Confirmation",
        description: step.description || step.title,
        required: step.required !== false,
        confirmed: Boolean(
          (checkbox && checkbox.checked) ||
          viewState.manualConfirmationState[step.stepId]
        ),
        confirmedBy: "Project Owner",
        device: global.navigator && global.navigator.userAgent || "",
        evidence: Boolean(
          (checkbox && checkbox.checked) ||
          viewState.manualConfirmationState[step.stepId]
        ) ? "Confirmed in Test Procedure Console." : "Not Confirmed"
      });
    });
    return result.filter(function valid(item) { return Boolean(item.caseId); });
  }

  async function runApprovedDataset() {
    if (!viewState.datasetId) return;
    setBusy(true, "選択したテストを実行しています…");
    setProgress({ stage: "Preparing", progress: 1 });
    try {
      const result = await namespace.runImportedTestProcedure({
        datasetId: viewState.datasetId,
        actor: "Project Owner",
        confirmedBy: "Project Owner",
        manualConfirmations: collectManualConfirmations(),
        downloadEvidence: false,
        onProgress: setProgress,
        onEvidenceProgress: setProgress
      });
      viewState.lastRunResult = result;
      updateDockSummary();
      const evidenceId = result.data && result.data.evidencePackageId;
      const run = result.data && result.data.validationRun;
      const release = namespace.getReleaseStatus();
      const output = {
        passed: Boolean(result.ok && run && run.summary.requiredGatePassed),
        validationRunId: run && run.validationRunId,
        summary: run && run.summary,
        evidencePackageId: evidenceId,
        evidenceValidation: result.data && result.data.evidenceValidation,
        releaseStatus: release
      };
      root().querySelector("[data-role=result]").textContent = JSON.stringify(output, null, 2);
      syncActionButtons();
      setMessage(output.passed ? "テストと期待結果照合が完了しました。Evidence ZIPを保存してください。" : "テスト結果に未完了または失敗があります。", output.passed ? "ok" : "error");
    } catch (error) {
      setMessage(error.message || String(error), "error");
    } finally {
      setBusy(false);
      setProgress({ stage: "Complete", progress: 100 });
    }
  }

  async function downloadEvidence() {
    const packageId = viewState.lastRunResult && viewState.lastRunResult.data && viewState.lastRunResult.data.evidencePackageId;
    if (!packageId) {
      setMessage("保存できるEvidence Packageがありません。", "error");
      return;
    }
    const result = await namespace.retryEvidenceDownload(packageId, { actor: "Project Owner" });
    setMessage(result.ok ? "Evidence ZIPの保存を開始しました。端末のダウンロードを確認してください。" : (result.error && result.error.message || result.code), result.ok ? "ok" : "error");
  }

  function createUI() {
    ensureStyle();
    const existing = root();
    if (existing) return existing;
    const overlay = global.document.createElement("div");
    overlay.id = UI_ID;
    overlay.innerHTML = `<div class="ide170-panel">
      <div class="ide170-header">
        <div class="ide170-title">🧪 IDE-170 実機検証手順コンソール <span class="ide170-badge">v${VERSION}</span></div>
        <span class="ide170-dock-summary" data-role="dock-summary">待機中</span>
        <button data-role="minimize" title="パネルを右下へ最小化し、元画面を操作します">元画面を確認</button>
        <button data-role="restore">検証へ戻る</button>
        <button data-role="close">閉じる</button>
      </div>
      <div class="ide170-body">
        <section class="ide170-section">
          <strong>1. 実機検証手順を選択</strong>
          <div class="ide170-row" style="margin-top:8px">
            <input type="file" data-role="file" accept=".txt,.md,.markdown,.json,text/plain,text/markdown,application/json">
            <button class="primary" data-role="import">取込み・解析</button>
          </div>
          <div class="ide170-muted">解析結果を確認するまでコードは実行されません。警告付き項目は初期OFFです。</div>
        </section>
        <section class="ide170-section">
          <strong>2. 解析結果と実行対象</strong>
          <div class="ide170-muted" style="margin-top:6px">手動確認中は上部の「元画面を確認」で右下へ最小化できます。検証状態とチェック内容は保持されます。</div>
          <div data-role="plan" class="ide170-muted" style="margin-top:8px">手順書を取り込むと表示されます。</div>
        </section>
        <section class="ide170-section">
          <strong>3. Dataset承認・実行</strong>
          <div class="ide170-row" style="margin-top:8px">
            <button class="warning" data-role="approve" disabled>選択内容を承認・Freeze</button>
            <button class="success" data-role="run" disabled>選択したテストを実行</button>
            <button class="primary" data-role="download" disabled>Evidence ZIPを保存</button>
          </div>
          <div class="ide170-progress"><span data-role="progress-bar"></span></div>
          <div class="ide170-muted" data-role="progress-text"></div>
        </section>
        <section class="ide170-section">
          <strong>結果</strong>
          <div data-role="message" class="ide170-muted">待機中</div>
          <pre data-role="result">{}</pre>
        </section>
      </div>
      <div class="ide170-footer">
        <span class="ide170-muted">Repository直接変更・GitHub自動反映・実行禁止項目の選択は許可されません。</span>
      </div>
    </div>`;
    global.document.body.appendChild(overlay);
    overlay.querySelector("[data-role=close]").addEventListener("click", closeTestProcedureValidationConsole);
    overlay.querySelector("[data-role=minimize]").addEventListener("click", minimizeTestProcedureValidationConsole);
    overlay.querySelector("[data-role=restore]").addEventListener("click", restoreTestProcedureValidationConsole);
    overlay.querySelector("[data-role=import]").addEventListener("click", importSelectedFile);
    overlay.querySelector("[data-role=approve]").addEventListener("click", approveCandidate);
    overlay.querySelector("[data-role=run]").addEventListener("click", runApprovedDataset);
    overlay.querySelector("[data-role=download]").addEventListener("click", downloadEvidence);
    return overlay;
  }

  function openTestProcedureValidationConsole() {
    if (!global.document || !global.document.body) {
      return internal.buildResult(false, "DOCUMENT_UNAVAILABLE", "Blocked", null, {
        error: { message: "Document UI is unavailable.", category: "Environment Failure" }
      });
    }
    const element = createUI();
    element.style.display = "flex";
    setDisplayMode("expanded");
    if (viewState.candidateId) {
      renderPlan();
      const approveButton = element.querySelector("[data-role=approve]");
      const runButton = element.querySelector("[data-role=run]");
      const downloadButton = element.querySelector("[data-role=download]");
      if (approveButton) approveButton.disabled = Boolean(viewState.datasetId);
      if (runButton) runButton.disabled = !viewState.datasetId;
      if (downloadButton) downloadButton.disabled = !(viewState.lastRunResult && viewState.lastRunResult.data && viewState.lastRunResult.data.evidencePackageId);
    }
    return internal.buildResult(true, "TEST_PROCEDURE_UI_OPENED", "Ready", null);
  }

  function closeTestProcedureValidationConsole() {
    const element = root();
    if (element) element.style.display = "none";
    viewState.displayMode = "expanded";
  }

  function initializeTestProcedureUI() {
    return internal.buildResult(true, "TEST_PROCEDURE_UI_INITIALIZED", "Ready", {
      documentAvailable: Boolean(global.document)
    });
  }

  Object.assign(namespace.api, {
    initializeTestProcedureUI: initializeTestProcedureUI,
    openTestProcedureValidationConsole: openTestProcedureValidationConsole,
    minimizeTestProcedureValidationConsole: minimizeTestProcedureValidationConsole,
    restoreTestProcedureValidationConsole: restoreTestProcedureValidationConsole,
    closeTestProcedureValidationConsole: closeTestProcedureValidationConsole
  });
  Object.assign(namespace, {
    openTestProcedureValidationConsole: openTestProcedureValidationConsole,
    minimizeTestProcedureValidationConsole: minimizeTestProcedureValidationConsole,
    restoreTestProcedureValidationConsole: restoreTestProcedureValidationConsole,
    closeTestProcedureValidationConsole: closeTestProcedureValidationConsole
  });

  namespace.modules.testProcedureUI = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    fileSelection: true,
    parseReview: true,
    warningSelection: true,
    prohibitedSelectionAllowed: false,
    manualConfirmation: true,
    nonBlockingMinimize: true,
    persistentCloseState: true,
    explicitEvidenceDownloadButton: true,
    loadedAt: internal.nowIso()
  };

  global.openIntelligenceTestProcedureConsole = openTestProcedureValidationConsole;
})(typeof window !== "undefined" ? window : globalThis);
