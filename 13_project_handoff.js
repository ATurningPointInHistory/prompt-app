/* ===============================
   FILE: 13_project_handoff.js
   Project Handoff Report
=============================== */

/* ===============================
   Repair Flow
=============================== */

function buildRepairFlowReport() {

  return `=== Repair Flow ===

loadRepairHtml()
↓
repairEditor

↓

saveCurrentSearchEditorFile()

↓

registerRepairSearchFile()

↓

repairSearchFileStore

↓

Project Explorer

↓

Analyzer
`;

}

/* ===============================
   Global Export
=============================== */

window.buildProjectSourceFlowReport =
  buildProjectSourceFlowReport;

window.buildProjectManagerReport =
  buildProjectManagerReport;

window.buildAnalyzerFlowReport =
  buildAnalyzerFlowReport;

window.buildAiHandoffReport =
  buildAiHandoffReport;

window.copyAiHandoffReport =
  copyAiHandoffReport;

window.showAiHandoffReport =
  showAiHandoffReport;

window.showAiReportManager =
  showAiReportManager;

window.generateSelectedAiReport =
  generateSelectedAiReport;

window.copySelectedAiReport =
  copySelectedAiReport;

window.copySelectedAiReport =
  copySelectedAiReport;

console.log(
  "13_project_handoff loaded"
);