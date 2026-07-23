/* ===============================
   FILE: 13_project_governance.js
   Project Governance Platform
=============================== */

const PROJECT_GOVERNANCE_STORAGE_KEY =
  "aiPromptOsProjectGovernanceV1";

function createDefaultProjectGovernanceState() {
  return {
    version: "1.0.0",
    project: "AI Prompt OS / AIプロンプト生成Pro",
    currentPhase: {
      id: "IDE-110",
      title: "Diagnostic Instrumentation Specification",
      type: "Specification",
      status: "Active"
    },
    goal:
      "IDE-110を実装可能な仕様まで完成させる。",
    scope: [
      "Architecture",
      "Public API",
      "Data Model",
      "Workflow",
      "UI",
      "Safety",
      "Validation",
      "Completion Criteria"
    ],
    outOfScope: [
      "Relationship Platform implementation",
      "AI Runtime implementation",
      "Agent Platform implementation"
    ],
    deliverables: [
      "IDE-110 Official Specification",
      "IDE-115 Validation Specification",
      "Implementation Handoff"
    ],
    completionCriteria: [
      { id: "architecture", label: "Architecture確定", completed: false },
      { id: "api", label: "Public API確定", completed: false },
      { id: "data-model", label: "Data Model確定", completed: false },
      { id: "workflow", label: "Workflow確定", completed: false },
      { id: "ui", label: "UI確定", completed: false },
      { id: "validation", label: "Validation確定", completed: false },
      { id: "completion", label: "Completion Criteria確定", completed: false }
    ],
    officialDecisions: [],
    proposals: [],
    parkingLot: [
      "Relationship Database Adapter",
      "Evidence Graph",
      "Decision Graph"
    ],
    knownIssues: [],
    architectureFreeze: {
      enabled: true,
      note: "Architecture変更はProject Ownerの承認を必要とする。"
    },
    rules: [
      "フェーズ外の設計を開始しない。",
      "未承認案をOfficialとして扱わない。",
      "Architectureへ影響する変更はProject Ownerへ確認する。",
      "Completion Criteria完了前に次フェーズへ進まない。",
      "Out of Scope項目はParking Lotへ移す。",
      "仕様フェーズでは実装を開始しない。",
      "実装フェーズでは未承認の仕様変更を行わない。"
    ],
    nextTask:
      "IDE-110 Diagnostic Instrumentation Architectureを確定する。",
    updatedAt: new Date().toISOString()
  };
}

function normalizeProjectGovernanceList(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => String(item || "").trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map(item => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeProjectGovernanceState(input) {
  const defaults = createDefaultProjectGovernanceState();
  const source = input && typeof input === "object" ? input : {};
  const phase = source.currentPhase && typeof source.currentPhase === "object"
    ? source.currentPhase
    : {};

  return {
    ...defaults,
    ...source,
    currentPhase: {
      ...defaults.currentPhase,
      ...phase
    },
    scope: normalizeProjectGovernanceList(source.scope ?? defaults.scope),
    outOfScope: normalizeProjectGovernanceList(source.outOfScope ?? defaults.outOfScope),
    deliverables: normalizeProjectGovernanceList(source.deliverables ?? defaults.deliverables),
    officialDecisions: normalizeProjectGovernanceList(source.officialDecisions),
    proposals: normalizeProjectGovernanceList(source.proposals),
    parkingLot: normalizeProjectGovernanceList(source.parkingLot ?? defaults.parkingLot),
    knownIssues: normalizeProjectGovernanceList(source.knownIssues),
    rules: normalizeProjectGovernanceList(source.rules ?? defaults.rules),
    completionCriteria: Array.isArray(source.completionCriteria)
      ? source.completionCriteria.map((item, index) => ({
          id: String(item?.id || `criteria-${index + 1}`),
          label: String(item?.label || item?.id || `Criteria ${index + 1}`),
          completed: Boolean(item?.completed)
        }))
      : defaults.completionCriteria,
    architectureFreeze: {
      ...defaults.architectureFreeze,
      ...(source.architectureFreeze || {})
    },
    updatedAt: source.updatedAt || new Date().toISOString()
  };
}

function getProjectGovernanceState() {
  try {
    const raw = localStorage.getItem(PROJECT_GOVERNANCE_STORAGE_KEY);
    if (!raw) {
      return createDefaultProjectGovernanceState();
    }
    return normalizeProjectGovernanceState(JSON.parse(raw));
  } catch (error) {
    console.warn("Project Governance load failed", error);
    return createDefaultProjectGovernanceState();
  }
}

function saveProjectGovernanceState(state) {
  const normalized = normalizeProjectGovernanceState(state);
  normalized.updatedAt = new Date().toISOString();
  localStorage.setItem(
    PROJECT_GOVERNANCE_STORAGE_KEY,
    JSON.stringify(normalized)
  );
  window.projectGovernanceState = normalized;
  return normalized;
}

function updateProjectPhaseContract(patch) {
  const current = getProjectGovernanceState();
  const next = {
    ...current,
    ...(patch || {}),
    currentPhase: {
      ...current.currentPhase,
      ...((patch && patch.currentPhase) || {})
    }
  };
  return saveProjectGovernanceState(next);
}

function completeProjectPhaseItem(id, completed = true) {
  const state = getProjectGovernanceState();
  const target = String(id || "");
  state.completionCriteria = state.completionCriteria.map(item =>
    item.id === target ? { ...item, completed: Boolean(completed) } : item
  );
  return saveProjectGovernanceState(state);
}

function addProjectProposal(text) {
  const value = String(text || "").trim();
  if (!value) return getProjectGovernanceState();
  const state = getProjectGovernanceState();
  if (!state.proposals.includes(value)) state.proposals.push(value);
  return saveProjectGovernanceState(state);
}

function moveProjectProposalToParkingLot(text) {
  const value = String(text || "").trim();
  const state = getProjectGovernanceState();
  state.proposals = state.proposals.filter(item => item !== value);
  if (value && !state.parkingLot.includes(value)) state.parkingLot.push(value);
  return saveProjectGovernanceState(state);
}

function approveProjectProposal(text) {
  const value = String(text || "").trim();
  const state = getProjectGovernanceState();
  state.proposals = state.proposals.filter(item => item !== value);
  state.parkingLot = state.parkingLot.filter(item => item !== value);
  if (value && !state.officialDecisions.includes(value)) {
    state.officialDecisions.push(value);
  }
  return saveProjectGovernanceState(state);
}

function validateProjectGovernance(state = getProjectGovernanceState()) {
  const errors = [];
  const warnings = [];

  if (!String(state.currentPhase?.id || "").trim()) errors.push("Current Phase IDが未設定です。");
  if (!String(state.currentPhase?.title || "").trim()) errors.push("Current Phase Titleが未設定です。");
  if (!String(state.goal || "").trim()) errors.push("Goalが未設定です。");
  if (!state.scope.length) errors.push("Scopeが未設定です。");
  if (!state.outOfScope.length) warnings.push("Out of Scopeが未設定です。");
  if (!state.completionCriteria.length) errors.push("Completion Criteriaが未設定です。");
  if (!String(state.nextTask || "").trim()) errors.push("Next Taskが未設定です。");

  const duplicateProposal = state.proposals.filter(item =>
    state.officialDecisions.includes(item)
  );
  if (duplicateProposal.length) {
    errors.push("ProposalとOfficial Decisionsが重複しています: " + duplicateProposal.join(", "));
  }

  const unfinished = state.completionCriteria.filter(item => !item.completed);
  if (unfinished.length) {
    warnings.push(`Completion Criteria未完了: ${unfinished.length}件`);
  }

  return {
    id: "PROJECT-GOVERNANCE-VALIDATION",
    valid: errors.length === 0,
    errors,
    warnings,
    unfinished,
    checkedAt: new Date().toISOString()
  };
}

function appendProjectGovernanceList(lines, title, list, emptyLabel = "none") {
  lines.push(title);
  if (!list.length) {
    lines.push(emptyLabel);
  } else {
    list.forEach(item => lines.push(`- ${item}`));
  }
  lines.push("");
}

function buildProjectGovernanceReport() {
  const state = getProjectGovernanceState();
  const validation = validateProjectGovernance(state);
  const lines = [];

  lines.push("=== Project Governance / AI Startup Contract ===");
  lines.push("");
  lines.push("Project");
  lines.push(state.project || "Unknown");
  lines.push("");
  lines.push("Current Phase");
  lines.push(`${state.currentPhase.id} ${state.currentPhase.title}`.trim());
  lines.push("");
  lines.push("Phase Type / Status");
  lines.push(`${state.currentPhase.type} / ${state.currentPhase.status}`);
  lines.push("");
  lines.push("Goal");
  lines.push(state.goal || "none");
  lines.push("");

  appendProjectGovernanceList(lines, "Scope", state.scope);
  appendProjectGovernanceList(lines, "Out of Scope", state.outOfScope);
  appendProjectGovernanceList(lines, "Deliverables", state.deliverables);

  lines.push("Completion Criteria");
  if (!state.completionCriteria.length) {
    lines.push("none");
  } else {
    state.completionCriteria.forEach(item => {
      lines.push(`[${item.completed ? "x" : " "}] ${item.label}`);
    });
  }
  lines.push("");

  appendProjectGovernanceList(lines, "Official Decisions", state.officialDecisions);
  appendProjectGovernanceList(lines, "Active Proposals", state.proposals);
  appendProjectGovernanceList(lines, "Parking Lot", state.parkingLot);
  appendProjectGovernanceList(lines, "Known Issues", state.knownIssues);

  lines.push("Architecture Freeze");
  lines.push(state.architectureFreeze.enabled ? "Enabled" : "Disabled");
  if (state.architectureFreeze.note) lines.push(state.architectureFreeze.note);
  lines.push("");

  appendProjectGovernanceList(lines, "Mandatory Governance Rules", state.rules);

  lines.push("Next Task");
  lines.push(state.nextTask || "none");
  lines.push("");

  lines.push("Governance Validation");
  lines.push(validation.valid ? "PASS" : "FAIL");
  validation.errors.forEach(item => lines.push(`ERROR: ${item}`));
  validation.warnings.forEach(item => lines.push(`WARNING: ${item}`));
  lines.push("");
  lines.push("Updated At");
  lines.push(state.updatedAt);

  return lines.join("\n");
}

function buildAiStartupContract() {
  return buildProjectGovernanceReport();
}

function getProjectGovernanceStatus() {
  const state = getProjectGovernanceState();
  const validation = validateProjectGovernance(state);
  const total = state.completionCriteria.length;
  const completed = state.completionCriteria.filter(item => item.completed).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  return {
    id: "PROJECT-GOVERNANCE",
    version: state.version,
    status: validation.valid ? "Ready" : "Needs Attention",
    ready: validation.valid,
    progress,
    health: validation.valid ? 100 : Math.max(0, 100 - validation.errors.length * 20),
    currentPhase: state.currentPhase,
    nextTask: state.nextTask,
    validation
  };
}

function showProjectGovernance() {
  const text = buildProjectGovernanceReport();
  if (typeof openFloatPanel === "function") {
    openFloatPanel(
      "Project Governance",
      `<div class="float-panel-actions">
        <button onclick="copyProjectGovernanceHandoff()">📋 コピー</button>
      </div>
      <pre class="code-preview">${typeof escapeHtml === "function" ? escapeHtml(text) : text}</pre>`
    );
    return;
  }
  alert(text);
}

function copyProjectGovernanceHandoff() {
  const text = buildProjectGovernanceReport();
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
      .then(() => alert("Project Governanceをコピーしました"))
      .catch(() => {
        const ok = typeof copyTextFallback === "function" && copyTextFallback(text);
        alert(ok ? "コピー完了" : "コピー失敗");
      });
  }
  const ok = typeof copyTextFallback === "function" && copyTextFallback(text);
  alert(ok ? "コピー完了" : "コピー失敗");
}

function exportProjectGovernanceHandoff() {
  const text = buildProjectGovernanceReport();
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Project_Governance_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

window.createDefaultProjectGovernanceState = createDefaultProjectGovernanceState;
window.getProjectGovernanceState = getProjectGovernanceState;
window.saveProjectGovernanceState = saveProjectGovernanceState;
window.updateProjectPhaseContract = updateProjectPhaseContract;
window.completeProjectPhaseItem = completeProjectPhaseItem;
window.addProjectProposal = addProjectProposal;
window.moveProjectProposalToParkingLot = moveProjectProposalToParkingLot;
window.approveProjectProposal = approveProjectProposal;
window.validateProjectGovernance = validateProjectGovernance;
window.buildProjectGovernanceReport = buildProjectGovernanceReport;
window.buildAiStartupContract = buildAiStartupContract;
window.getProjectGovernanceStatus = getProjectGovernanceStatus;
window.showProjectGovernance = showProjectGovernance;
window.copyProjectGovernanceHandoff = copyProjectGovernanceHandoff;
window.exportProjectGovernanceHandoff = exportProjectGovernanceHandoff;

console.log("13_project_governance loaded");