/* ============================================================
   FILE: 17_external_intelligence_console.js
   EXTERNAL-010 External Intelligence Control Center
   Release: 1.20.1 Conformance Repair Candidate
   ============================================================ */
(function (global) {
  "use strict";

  const n = global.EXTERNAL010ExternalIntelligence;
  const m = global.EXTERNAL010VersionManifest;
  if (!n || !n.__internal || !m) return;
  const i = n.__internal;
  const s = i.state;

  function el(id) { return global.document ? global.document.getElementById(id) : null; }
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
  function safeJson(value) {
    try { return JSON.stringify(value, null, 2); } catch (_) { return String(value); }
  }

  function gatewayState() {
    if (typeof n.getExternalIntelligenceGatewayClientState === "function") return n.getExternalIntelligenceGatewayClientState();
    return s.gatewayClientState ? i.clone(s.gatewayClientState) : null;
  }

  function countMap(key) { return s[key] instanceof Map ? s[key].size : 0; }

  function getExternalIntelligenceConsoleSnapshot() {
    const gateway = gatewayState();
    const lastConformance = s.latestConformanceValidation ? i.clone(s.latestConformanceValidation) : null;
    const lastPhase21 = s.latestPhase21Validation ? i.clone(s.latestPhase21Validation) : null;
    return {
      componentId: "EXTERNAL-010",
      version: m.release.version,
      gatewayVersion: m.gateway.gatewayVersion,
      implementationPhase: m.release.implementationPhase,
      foundationInitialized: s.initialized === true,
      moduleCount: Object.keys(n.modules || {}).length,
      gateway: gateway,
      counts: {
        sources: countMap("sourceRegistry"),
        acquisitionRequests: countMap("acquisitionRequests"),
        rawEvidence: countMap("rawEvidenceRecords"),
        acquisitionEvidence: countMap("acquisitionEvidenceRecords"),
        normalizedRecords: countMap("normalizedRecords"),
        claims: countMap("claimCandidates"),
        entities: countMap("entityRegistry"),
        signals: countMap("signalRecords"),
        hypotheses: countMap("hypothesisRecords"),
        predictions: countMap("predictionRecords"),
        outcomes: countMap("outcomeRecords"),
        watches: countMap("monitoringWatches"),
        notifications: countMap("notificationCandidates"),
        marketBars: countMap("marketBars"),
        strategyExperiments: countMap("strategyExperimentProtocols")
      },
      safety: {
        directRepositoryMutationAllowed: m.safety.directRepositoryMutationAllowed,
        automaticTradingAllowed: m.safety.automaticTradeExecutionAllowed,
        automaticDependencyInstallAllowed: m.safety.automaticSoftwareInstallAllowed,
        validationEqualsApproval: false
      },
      conformanceRepair: n.modules && n.modules.conformanceRepair ? i.clone(n.modules.conformanceRepair) : null,
      latestConformanceValidation: lastConformance ? {
        status: lastConformance.status,
        passed: lastConformance.passed,
        failed: lastConformance.failed,
        total: lastConformance.total,
        health: lastConformance.health,
        validatedAt: lastConformance.validatedAt
      } : null,
      latestPhase21Validation: lastPhase21 ? {
        status: lastPhase21.status,
        passed: lastPhase21.passed,
        failed: lastPhase21.failed,
        total: lastPhase21.total,
        health: lastPhase21.health,
        validatedAt: lastPhase21.validatedAt
      } : null,
      capturedAt: i.nowIso()
    };
  }

  function statusBadge(label, state, goodStates) {
    const good = (goodStates || ["READY", "PASS", "ACTIVE", "TRUE"]).includes(String(state == null ? "" : state).toUpperCase());
    return '<div class="external-status-card ' + (good ? "is-good" : "") + '"><span>' + esc(label) + '</span><strong>' + esc(state == null ? "UNKNOWN" : state) + '</strong></div>';
  }

  function renderCounts(counts) {
    const labels = {
      sources: "Sources", rawEvidence: "Raw Evidence", acquisitionEvidence: "Evidence", normalizedRecords: "Normalized",
      claims: "Claims", entities: "Entities", signals: "Signals", hypotheses: "Hypotheses",
      predictions: "Predictions", outcomes: "Outcomes", watches: "Watches", notifications: "Notifications",
      marketBars: "Market Bars", strategyExperiments: "Experiments"
    };
    return Object.keys(labels).map(function (key) {
      return '<div class="external-count-card"><span>' + esc(labels[key]) + '</span><strong>' + esc(counts[key] || 0) + '</strong></div>';
    }).join("");
  }

  function renderExternalIntelligenceConsole() {
    const root = el("externalIntelligenceConsoleRoot");
    if (!root) return false;
    const snapshot = getExternalIntelligenceConsoleSnapshot();
    const gateway = snapshot.gateway || {};
    const session = gateway.session || null;
    const conf = snapshot.latestConformanceValidation;
    const p21 = snapshot.latestPhase21Validation;

    root.innerHTML = '' +
      '<section class="external-hero">' +
        '<div><div class="external-kicker">EXTERNAL-010</div><h3>External Intelligence Control Center</h3>' +
        '<p>外部情報取得・Evidence・分析基盤の状態確認と検証を、ここから行います。</p></div>' +
        '<div class="external-version">v' + esc(snapshot.version) + '<small>Gateway ' + esc(snapshot.gatewayVersion) + '</small></div>' +
      '</section>' +

      '<section class="external-grid external-status-grid">' +
        statusBadge("Foundation", snapshot.foundationInitialized ? "READY" : "NOT READY") +
        statusBadge("Gateway", gateway.healthState || "UNKNOWN") +
        statusBadge("Session", session && session.state || "INACTIVE", ["ACTIVE"]) +
        statusBadge("Conformance", conf ? (conf.failed === 0 ? "PASS" : "FAIL") : "NOT RUN") +
        statusBadge("Phase 21", p21 ? (p21.failed === 0 ? "PASS" : "FAIL") : "NOT RUN") +
      '</section>' +

      '<section class="external-section">' +
        '<h4>最初に使うボタン</h4>' +
        '<div class="external-actions">' +
          '<button onclick="externalConsoleInitialize()">① Foundation初期化</button>' +
          '<button onclick="externalConsoleCheckGateway()">② Gateway確認</button>' +
          '<button onclick="externalConsoleOpenSession()">③ Gateway Session開始</button>' +
          '<button onclick="externalConsoleRunConformance()">Memo準拠検証</button>' +
          '<button onclick="externalConsoleRunPhase21()">Phase 21検証</button>' +
          '<button class="btn-secondary" onclick="externalConsoleRefresh()">状態更新</button>' +
        '</div>' +
        '<div class="external-help">PCで外部Gatewayを使う場合は ①→②→③。AndroidやGatewayなしでは、Core / 保存済みEvidence / 分析系はGatewayなしでも利用可能です。</div>' +
      '</section>' +

      '<section class="external-section">' +
        '<h4>現在のデータ</h4><div class="external-grid external-count-grid">' + renderCounts(snapshot.counts) + '</div>' +
      '</section>' +

      '<section class="external-section">' +
        '<h4>使い方</h4>' +
        '<div class="external-flow">' +
          '<div><b>1. 外部Source</b><span>SourceをRegistryへ登録</span></div><i>→</i>' +
          '<div><b>2. Acquisition</b><span>Browser / Gatewayで取得</span></div><i>→</i>' +
          '<div><b>3. Evidence</b><span>Raw Evidenceを保存</span></div><i>→</i>' +
          '<div><b>4. Intelligence</b><span>Claim / Entity / Signal / Prediction</span></div><i>→</i>' +
          '<div><b>5. Outcome</b><span>結果を残して評価</span></div>' +
        '</div>' +
        '<div class="external-note">この画面は現在、安全側のControl Centerです。Source登録・有料API・Repository変更・売買は勝手に実行しません。Authorityが必要な操作は別Gateで止まります。</div>' +
      '</section>' +

      '<section class="external-section">' +
        '<div class="external-section-head"><h4>安全境界</h4><button class="btn-secondary" onclick="externalConsoleCopyStatus()">状態をコピー</button></div>' +
        '<div class="external-boundary-grid">' +
          '<div>Repository自動変更<strong>' + (snapshot.safety.directRepositoryMutationAllowed ? "許可" : "禁止") + '</strong></div>' +
          '<div>自動売買<strong>' + (snapshot.safety.automaticTradingAllowed ? "許可" : "禁止") + '</strong></div>' +
          '<div>依存関係の自動Install<strong>' + (snapshot.safety.automaticDependencyInstallAllowed ? "許可" : "禁止") + '</strong></div>' +
          '<div>Validation = Approval<strong>NO</strong></div>' +
        '</div>' +
      '</section>' +

      '<section class="external-section">' +
        '<h4>実行結果</h4><pre id="externalConsoleOutput" class="external-output">' + esc(safeJson(snapshot)) + '</pre>' +
      '</section>';
    return true;
  }

  function setOutput(value) {
    const out = el("externalConsoleOutput");
    if (out) out.textContent = safeJson(value);
  }

  async function withBusy(label, fn) {
    setOutput({ status: "RUNNING", action: label, startedAt: i.nowIso() });
    try {
      const result = await fn();
      setOutput(result);
      renderExternalIntelligenceConsole();
      const out = el("externalConsoleOutput");
      if (out) out.textContent = safeJson(result);
      return result;
    } catch (error) {
      const result = { ok: false, status: "FAILED", action: label, error: error && error.message || String(error), failedAt: i.nowIso() };
      setOutput(result);
      return result;
    }
  }

  function externalConsoleInitialize() {
    return withBusy("Foundation初期化", async function () {
      return n.initializeExternalIntelligenceFoundation();
    });
  }

  function externalConsoleCheckGateway() {
    return withBusy("Gateway確認", async function () {
      if (typeof n.getExternalIntelligenceGatewayHealth !== "function") return { ok: false, code: "GATEWAY_HEALTH_API_UNAVAILABLE" };
      return n.getExternalIntelligenceGatewayHealth();
    });
  }

  function externalConsoleOpenSession() {
    return withBusy("Gateway Session開始", async function () {
      if (typeof n.openExternalIntelligenceGatewaySession !== "function") return { ok: false, code: "GATEWAY_SESSION_API_UNAVAILABLE" };
      return n.openExternalIntelligenceGatewaySession();
    });
  }

  function externalConsoleRunConformance() {
    return withBusy("Memo準拠検証", async function () {
      if (typeof n.runExternalIntelligenceConformanceValidation !== "function") return { ok: false, code: "CONFORMANCE_VALIDATION_UNAVAILABLE" };
      return n.runExternalIntelligenceConformanceValidation();
    });
  }

  function externalConsoleRunPhase21() {
    return withBusy("Phase 21検証", async function () {
      if (typeof n.runExternalIntelligencePhase21Validation !== "function") return { ok: false, code: "PHASE21_VALIDATION_UNAVAILABLE" };
      return n.runExternalIntelligencePhase21Validation();
    });
  }

  function externalConsoleRefresh() {
    renderExternalIntelligenceConsole();
    return getExternalIntelligenceConsoleSnapshot();
  }

  async function externalConsoleCopyStatus() {
    const text = safeJson(getExternalIntelligenceConsoleSnapshot());
    try {
      if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) {
        await global.navigator.clipboard.writeText(text);
        setOutput({ ok: true, status: "COPIED", copiedAt: i.nowIso() });
        return true;
      }
    } catch (_) {}
    setOutput({ ok: false, status: "CLIPBOARD_UNAVAILABLE", text: text });
    return false;
  }

  function initExternalIntelligenceConsole() {
    if (!global.document) return false;
    renderExternalIntelligenceConsole();
    global.setTimeout(renderExternalIntelligenceConsole, 400);
    global.setTimeout(renderExternalIntelligenceConsole, 1500);
    return true;
  }

  Object.assign(n.api, {
    getExternalIntelligenceConsoleSnapshot: getExternalIntelligenceConsoleSnapshot,
    initExternalIntelligenceConsole: initExternalIntelligenceConsole
  });
  Object.assign(n, n.api);

  n.modules.externalConsole = {
    id: "EXTERNAL-010-CONTROL-CENTER",
    version: m.getModuleVersion("externalConsole") || m.release.version,
    status: "Ready",
    phase: 21,
    dedicatedUi: true,
    autoAuthorityGrant: false,
    loadedAt: i.nowIso()
  };

  Object.assign(global, {
    initExternalIntelligenceConsole: initExternalIntelligenceConsole,
    renderExternalIntelligenceConsole: renderExternalIntelligenceConsole,
    externalConsoleInitialize: externalConsoleInitialize,
    externalConsoleCheckGateway: externalConsoleCheckGateway,
    externalConsoleOpenSession: externalConsoleOpenSession,
    externalConsoleRunConformance: externalConsoleRunConformance,
    externalConsoleRunPhase21: externalConsoleRunPhase21,
    externalConsoleRefresh: externalConsoleRefresh,
    externalConsoleCopyStatus: externalConsoleCopyStatus
  });
})(typeof window !== "undefined" ? window : globalThis);
