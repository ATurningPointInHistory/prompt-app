/* ===============================
   FILE: 13_development_dashboard.js
   AI Prompt OS v7.0
   Development Dashboard
=============================== */

/* ===============================
   Dashboard Registry
=============================== */

const DEVELOPMENT_DASHBOARD_MODULES = [
  {
    id: "Migration",
    name: "Migration Engine",
    statusApi: "getMigrationStatus",
    fallback: {
      version: "7.0.0",
      total: 8,
      capabilities: [
        "Registry",
        "Scanner",
        "Preview",
        "Executor",
        "Validator",
        "Reporter",
        "Rollback",
        "History"
      ],
      nextTask: "scanKnowledgeMigration"
    }
  },
  {
    id: "Repository",
    name: "Repository Core",
    statusApi: "getRepositoryStatus",
    fallback: {
      version: "7.0.0",
      total: 4,
      capabilities: [
        "Repository Manager",
        "Repository Database",
        "Repository Cache",
        "Repository Settings"
      ],
      nextTask: "createRepositoryManager"
    }
  },
  {
    id: "Validation",
    name: "Validation Engine",
    statusApi: "getValidationStatus",
    fallback: {
      version: "7.0.0",
      total: 4,
      capabilities: [
        "Metadata Validation",
        "Relationship Validation",
        "Dependency Validation",
        "Repository Validation"
      ],
      nextTask: "validateKnowledgeMigration"
    }
  },
  {
    id: "Publication",
    name: "Publication Engine",
    statusApi: "getPublicationStatus",
    fallback: {
      version: "7.0.0",
      total: 4,
      capabilities: [
        "Package Export",
        "Publication Index",
        "AI Handoff Generator",
        "Official Summary Generator"
      ],
      nextTask: "buildPublicationIndex"
    }
  }
];

/* ===============================
   Utility
=============================== */

function checkDevelopmentFunction(name) {

  return typeof window[name] === "function";

}

function calculateProgress(implemented, total) {

  const done =
    Number(implemented || 0);

  const max =
    Number(total || 0);

  if (!max) {
    return 0;
  }

  return Math.round(
    done / max * 100
  );

}

function buildProgressBar(progress) {

  const value =
    Math.max(
      0,
      Math.min(
        100,
        Number(progress || 0)
      )
    );

  const filled =
    Math.round(value / 10);

  const empty =
    10 - filled;

  return "█".repeat(filled) +
    "□".repeat(empty);

}

function calculateHealth(status) {

  if (!status) {
    return 0;
  }

  const base =
    Number(status.health || 0);

  const errors =
    Array.isArray(status.errors)
      ? status.errors.length
      : 0;

  const warnings =
    Array.isArray(status.warnings)
      ? status.warnings.length
      : 0;

  let health =
    base || 100;

  health -= errors * 20;
  health -= warnings * 5;

  return Math.max(
    0,
    Math.min(100, health)
  );

}

/* ===============================
   Fallback Status
=============================== */

function buildFallbackModuleStatus(moduleConfig) {

  const fallback =
    moduleConfig.fallback || {};

  const capabilities =
    fallback.capabilities || [];

  return {
    id: moduleConfig.id,
    name: moduleConfig.name,
    version: fallback.version || "1.0.0",

    status: "Not Implemented",
    ready: false,

    health: 0,

    implemented: 0,
    total: fallback.total || capabilities.length || 0,

    capabilities:
      capabilities.map(name => ({
        id: name,
        name: name,
        implemented: false
      })),

    warnings: [
      "Status API not found: " + moduleConfig.statusApi
    ],
    errors: [],

    nextTask: fallback.nextTask || "",

    dependsOn: [],
    message: "Module status API is not implemented yet.",

    updatedAt: Date.now()
  };

}

/* ===============================
   Status Collector
=============================== */

function collectDevelopmentDashboardStatuses() {

  return DEVELOPMENT_DASHBOARD_MODULES.map(moduleConfig => {

    const apiName =
      moduleConfig.statusApi;

    if (
      apiName &&
      typeof window[apiName] === "function"
    ) {

      try {

        const status =
          window[apiName]();

        return normalizeDashboardStatus(
          status,
          moduleConfig
        );

      } catch (error) {

        const fallback =
          buildFallbackModuleStatus(moduleConfig);

        fallback.status = "Error";
        fallback.ready = false;
        fallback.errors.push(
          String(error.message || error)
        );
        fallback.message =
          "Status API execution failed.";

        return fallback;

      }

    }

    return buildFallbackModuleStatus(
      moduleConfig
    );

  });

}

function normalizeDashboardStatus(status, moduleConfig) {

  const fallback =
    buildFallbackModuleStatus(moduleConfig);

  const merged =
    Object.assign(
      {},
      fallback,
      status || {}
    );

  merged.id =
    merged.id || moduleConfig.id;

  merged.name =
    merged.name || moduleConfig.name;

  merged.warnings =
    Array.isArray(merged.warnings)
      ? merged.warnings
      : [];

  merged.errors =
    Array.isArray(merged.errors)
      ? merged.errors
      : [];

  merged.dependsOn =
    Array.isArray(merged.dependsOn)
      ? merged.dependsOn
      : [];

  merged.capabilities =
    Array.isArray(merged.capabilities)
      ? merged.capabilities
      : [];

  merged.implemented =
    Number(merged.implemented || 0);

  merged.total =
    Number(merged.total || 0);

  merged.health =
    calculateHealth(merged);

  merged.updatedAt =
    merged.updatedAt || Date.now();

  return merged;

}

/* ===============================
   Dashboard Calculation
=============================== */

function calculateOverallProgress(statuses) {

  const total =
    statuses.reduce(
      (sum, item) =>
        sum + Number(item.total || 0),
      0
    );

  const implemented =
    statuses.reduce(
      (sum, item) =>
        sum + Number(item.implemented || 0),
      0
    );

  return calculateProgress(
    implemented,
    total
  );

}

function calculateOverallHealth(statuses) {

  if (!statuses.length) {
    return 0;
  }

  const total =
    statuses.reduce(
      (sum, item) =>
        sum + Number(item.health || 0),
      0
    );

  return Math.round(
    total / statuses.length
  );

}

function countDashboardWarnings(statuses) {

  return statuses.reduce(
    (sum, item) =>
      sum + (
        Array.isArray(item.warnings)
          ? item.warnings.length
          : 0
      ),
    0
  );

}

function countDashboardErrors(statuses) {

  return statuses.reduce(
    (sum, item) =>
      sum + (
        Array.isArray(item.errors)
          ? item.errors.length
          : 0
      ),
    0
  );

}

/* ===============================
   Roadmap
=============================== */

function buildNextTask(statuses) {

  const target =
    statuses.find(item =>
      item.nextTask &&
      calculateProgress(
        item.implemented,
        item.total
      ) < 100
    );

  return target
    ? target.nextTask
    : "No next task.";
}

function buildRoadmap(statuses) {

  return statuses
    .filter(item =>
      calculateProgress(
        item.implemented,
        item.total
      ) < 100
    )
    .map(item => ({
      id: item.id,
      name: item.name,
      progress: calculateProgress(
        item.implemented,
        item.total
      ),
      nextTask: item.nextTask || ""
    }));

}

function sortDashboardModules(statuses) {

  return statuses.slice().sort((a, b) => {

    const pa =
      calculateProgress(
        a.implemented,
        a.total
      );

    const pb =
      calculateProgress(
        b.implemented,
        b.total
      );

    return pa - pb;

  });

}

/* ===============================
   Report Builder
=============================== */

function buildDashboardReport() {

  const statuses =
    collectDevelopmentDashboardStatuses();

  const sorted =
    sortDashboardModules(statuses);

  const overallProgress =
    calculateOverallProgress(statuses);

  const overallHealth =
    calculateOverallHealth(statuses);

  const warnings =
    countDashboardWarnings(statuses);

  const errors =
    countDashboardErrors(statuses);

  const nextTask =
    buildNextTask(sorted);

  const lines = [];

  lines.push(
    "========================================"
  );
  lines.push(
    "AI Prompt OS Development Dashboard"
  );
  lines.push(
    "========================================"
  );
  lines.push("");

  sorted.forEach(item => {

    const progress =
      calculateProgress(
        item.implemented,
        item.total
      );

    lines.push(item.name);
    lines.push("");
    lines.push(
      buildProgressBar(progress) +
        " " +
        progress +
        "%"
    );
    lines.push(
      "Health: " + item.health + "%"
    );
    lines.push(
      "Status: " + item.status
    );

    if (item.nextTask) {
      lines.push(
        "Next: " + item.nextTask
      );
    }

    lines.push("");

  });

  lines.push(
    "----------------------------------------"
  );
  lines.push("");
  lines.push("Overall");
  lines.push("");
  lines.push(
    buildProgressBar(overallProgress) +
      " " +
      overallProgress +
      "%"
  );
  lines.push("");
  lines.push(
    "Health"
  );
  lines.push(
    overallHealth + "%"
  );
  lines.push("");
  lines.push(
    "Warnings"
  );
  lines.push(String(warnings));
  lines.push("");
  lines.push(
    "Errors"
  );
  lines.push(String(errors));
  lines.push("");
  lines.push(
    "----------------------------------------"
  );
  lines.push("");
  lines.push(
    "Current Phase"
  );
  lines.push(
    "Repository Implementation"
  );
  lines.push("");
  lines.push(
    "Next"
  );
  lines.push(nextTask);
  lines.push("");
  lines.push(
    "========================================"
  );

  return lines.join("\n");

}

function copyDashboardReport() {

  const report =
    buildDashboardReport();

  if (
    navigator.clipboard &&
    navigator.clipboard.writeText
  ) {

    navigator.clipboard.writeText(report);

  }

  return report;

}

/* ===============================
   UI
=============================== */

function buildDevelopmentDashboardHtml() {

  const statuses =
    collectDevelopmentDashboardStatuses();

  const overallProgress =
    calculateOverallProgress(statuses);

  const overallHealth =
    calculateOverallHealth(statuses);

  const warnings =
    countDashboardWarnings(statuses);

  const errors =
    countDashboardErrors(statuses);

  let html = "";

  html += "<div class='dashboard-box'>";
  html += "<h2>Development Dashboard</h2>";

  html += "<div>";
  html += "<b>Overall</b><br>";
  html += buildProgressBar(overallProgress);
  html += " " + overallProgress + "%<br>";
  html += "Health: " + overallHealth + "%<br>";
  html += "Warnings: " + warnings + "<br>";
  html += "Errors: " + errors + "<br>";
  html += "</div>";

  html += "<hr>";

  statuses.forEach(item => {

    const progress =
      calculateProgress(
        item.implemented,
        item.total
      );

    html += "<div class='dashboard-module'>";
    html += "<h3>" + item.name + "</h3>";
    html += "<div>";
    html += buildProgressBar(progress);
    html += " " + progress + "%";
    html += "</div>";
    html += "<div>Status: " + item.status + "</div>";
    html += "<div>Health: " + item.health + "%</div>";

    if (item.nextTask) {
      html += "<div>Next: " + item.nextTask + "</div>";
    }

    if (item.warnings.length) {
      html += "<div>Warnings: " +
        item.warnings.length +
        "</div>";
    }

    if (item.errors.length) {
      html += "<div>Errors: " +
        item.errors.length +
        "</div>";
    }

    html += "</div>";

  });

  html += "<hr>";
  html += "<button onclick='showDevelopmentDashboardReport()'>";
  html += "Report";
  html += "</button> ";

  html += "<button onclick='copyDashboardReport()'>";
  html += "Copy Report";
  html += "</button>";

  html += "</div>";

  return html;

}

function showDevelopmentDashboard() {

  const target =
    document.getElementById(
      "developmentDashboard"
    );

  if (!target) {

    console.log(
      buildDashboardReport()
    );

    return;

  }

  target.innerHTML =
    buildDevelopmentDashboardHtml();

}

function showDevelopmentDashboardReport() {

  const report =
    buildDashboardReport();

  const target =
    document.getElementById(
      "developmentDashboardReport"
    );

  if (target) {
    target.textContent = report;
  }

  console.log(report);

  return report;

}

function getDevelopmentDashboardStatus() {

  const dashboard =
    buildDevelopmentDashboardStatus();

  return {
    id: "DevelopmentDashboard",
    name: "Development Dashboard",
    version: dashboard.version,

    status: "Ready",
    ready: true,

    health: dashboard.progress,

    implemented: dashboard.ok,
    total: dashboard.total,

    warnings: [],
    errors: [],

    nextTask:
      dashboard.missing > 0
        ? "Implement missing dashboard checks."
        : "Completed",

    dependsOn: [],

    message:
      "Development Dashboard self-check is available.",

    updatedAt: Date.now()
  };

}

/* ===============================
   Simple Status APIs
   Temporary self-check versions
=============================== */

function getMigrationStatus() {

  const checks = [
    {
      id: "Registry",
      name: "Migration Registry",
      fn: "getKnowledgeMigrationRegistry"
    },
    {
      id: "Scanner",
      name: "Scanner",
      fn: "scanKnowledgeMigration"
    },
    {
      id: "Preview",
      name: "Preview",
      fn: "previewKnowledgeMigration"
    },
    {
      id: "Executor",
      name: "Executor",
      fn: "executeKnowledgeMigration"
    },
    {
      id: "Validator",
      name: "Validator",
      fn: "validateKnowledgeMigration"
    },
    {
      id: "Reporter",
      name: "Reporter",
      fn: "buildKnowledgeMigrationReport"
    },
    {
      id: "Rollback",
      name: "Rollback",
      fn: "rollbackKnowledgeMigration"
    },
    {
      id: "History",
      name: "History",
      fn: "getKnowledgeMigrationHistory"
    }
  ];

  const capabilities =
    checks.map(item => ({
      id: item.id,
      name: item.name,
      implemented:
        checkDevelopmentFunction(item.fn),
      functionName: item.fn
    }));

  const implemented =
    capabilities.filter(item =>
      item.implemented
    ).length;

  const warnings = [];

  if (!checkDevelopmentFunction("scanKnowledgeMigration")) {
    warnings.push(
      "scanKnowledgeMigration is not implemented."
    );
  }

  return {
    id: "Migration",
    name: "Migration Engine",
    version: "7.0.0",

    status:
      implemented > 0
        ? "Working"
        : "Not Implemented",

    ready:
      checkDevelopmentFunction(
        "scanKnowledgeMigration"
      ),

    health:
      implemented > 0
        ? 90
        : 0,

    implemented: implemented,
    total: checks.length,

    capabilities: capabilities,

    warnings: warnings,
    errors: [],

    nextTask:
      getNextMissingCapabilityName(
        capabilities
      ),

    dependsOn: [
      "Memo Box",
      "Document Parser"
    ],

    message:
      "Migration Engine status generated by Dashboard self-check.",

    updatedAt: Date.now()
  };

}

function getNextMissingCapabilityName(capabilities) {

  const missing =
    capabilities.find(item =>
      !item.implemented
    );

  return missing
    ? missing.functionName || missing.name
    : "Completed";

}

/* ===============================
   Migration Registry
=============================== */

function getKnowledgeMigrationRegistry() {

  return {

    version: "7.0.0",

    replacements: [

      {
        from: "IMPORT-001",
        to: "TRANSFER-001"
      },

      {
        from: "LOGGING-001",
        to: "OBSERVABILITY-001"
      },

      {
        from: "SEARCH-001",
        to: "RETRIEVAL-001"
      },

      {
        from: "DATABASE-001",
        to: "REPOSITORY-001"
      },

      {
        from: "SETTING-001",
        to: "CONFIGURATION-001"
      },

      {
        from: "TEST-001",
        to: "VALIDATION-001"
      },

      {
        from: "QUALITY-001",
        to: "VALIDATION-001"
      },

      {
        from: "AUDIT-001",
        to: "OBSERVABILITY-001"
      },

      {
        from: "MONITORING-001",
        to: "OBSERVABILITY-001"
      },

      {
        from: "HEALTH-001",
        to: "OBSERVABILITY-001"
      }

    ],

    metadataFields: [

      "Authority",
      "DependsOn",
      "Provides"

    ],

    rules: {

      preserveMemoCount: true,

      preserveUserText: true,

      overwriteKnownRulesOnly: true,

      useSaveMemoBoxes: true

    }

  };

}

/* ===============================
   Migration Scanner
=============================== */

function scanKnowledgeMigration() {

  const registry =
    getKnowledgeMigrationRegistry();

  const list =
    typeof getMemoBoxList === "function"
      ? getMemoBoxList()
      : memoBoxList;

  const results = [];

  list.forEach((memo, index) => {

    const text =
      [
        memo.id,
        memo.name,
        memo.title,
        memo.summary,
        memo.text,
        memo.relationships,
        memo.dependsOn,
        memo.provides
      ]
        .join("\n");

    const replacements =
      registry.replacements.filter(rule =>
        text.includes(rule.from)
      );

    const missingMetadata =
      registry.metadataFields.filter(field => {

        const key =
          field.charAt(0).toLowerCase() +
          field.slice(1);

        return !memo[key];

      });

    if (replacements.length) {

      results.push({
        index: index,
        id: memo.id || "",
        name: memo.name || "",
        title: memo.title || "",
        replacements: replacements,
        missingMetadata: missingMetadata
      });

    }

  });

  return {
    version: registry.version,
    checked: list.length,
    candidates: results.length,
    results: results,
    changed: false,
    message: "Scan completed. No data was modified.",
    updatedAt: Date.now()
  };

}

/* ===============================
   Migration Preview
=============================== */

function previewKnowledgeMigration() {

  const scan =
    scanKnowledgeMigration();

  const lines = [];

  lines.push(
    "========================================"
  );

  lines.push(
    "Knowledge Migration Preview"
  );

  lines.push(
    "========================================"
  );

  lines.push("");

  lines.push(
    "Checked : " +
    scan.checked
  );

  lines.push(
    "Candidates : " +
    scan.candidates
  );

  lines.push("");

  if (!scan.results.length) {

    lines.push(
      "No migration candidates."
    );

    return lines.join("\n");

  }

  scan.results.forEach(item => {

    lines.push(
      "----------------------------------------"
    );

    lines.push(
      "Index : " + item.index
    );

    lines.push(
      "ID : " +
      (item.id || "(none)")
    );

    lines.push(
      "Name : " +
      (item.name || "(unnamed)")
    );

    lines.push("");

    lines.push(
      "Replacement Preview"
    );

    item.replacements.forEach(rule => {

      lines.push(
        "  " +
        rule.from +
        " -> " +
        rule.to
      );

    });

    if (
      item.missingMetadata &&
      item.missingMetadata.length
    ) {

      lines.push("");

      lines.push(
        "Missing Metadata"
      );

      item.missingMetadata.forEach(field => {

        lines.push(
          "  - " + field
        );

      });

    }

    lines.push("");

  });

  lines.push(
    "========================================"
  );

  lines.push(
    "Preview Only"
  );

  lines.push(
    "No data has been modified."
  );

  lines.push(
    "========================================"
  );

  return lines.join("\n");

}

/* ===============================
   Development Progress Bar Chart
=============================== */

function showDevelopmentProgressBarChart(source) {

  const items =
    resolveDevelopmentProgressItems(source);

  const lines = [
    "==================================",
    "Development Progress",
    "==================================",
    ""
  ];

  if (!items.length) {
    lines.push("No development progress data.");
  }

  items.forEach(item => {

    const progress =
      normalizeDevelopmentProgress(item);

    lines.push(
      String(item.name || item.id || "Unknown").padEnd(24, " ") +
      " " +
      buildDevelopmentProgressBar(progress) +
      " " +
      progress + "%"
    );

  });

  const result =
    lines.join("\n");

  const target =
    document.getElementById("developmentProgressBarChart") ||
    document.getElementById("developmentDashboardOutput");

  if (target) {
    target.textContent = result;
  }

  console.log(result);

  return result;

}

function resolveDevelopmentProgressItems(source) {

  if (Array.isArray(source)) {
    return source;
  }

  if (source && Array.isArray(source.modules)) {
    return source.modules;
  }

  if (source && Array.isArray(source.items)) {
    return source.items;
  }

  if (source && typeof source === "object") {
    return Object.values(source);
  }

  if (
    typeof getDevelopmentDashboardModules === "function"
  ) {
    return getDevelopmentDashboardModules();
  }

  if (
    typeof developmentDashboardModules !== "undefined" &&
    Array.isArray(developmentDashboardModules)
  ) {
    return developmentDashboardModules;
  }

  if (
    typeof developmentDashboardRegistry !== "undefined"
  ) {
    return Object.values(developmentDashboardRegistry);
  }

  return [];

}

function normalizeDevelopmentProgress(item) {

  if (!item) {
    return 0;
  }

  if (typeof item.progress === "number") {
    return clampDevelopmentProgress(item.progress);
  }

  if (
    typeof item.implemented === "number" &&
    typeof item.total === "number" &&
    item.total > 0
  ) {
    return clampDevelopmentProgress(
      Math.round(
        item.implemented / item.total * 100
      )
    );
  }

  return 0;

}

function clampDevelopmentProgress(value) {

  return Math.max(
    0,
    Math.min(
      100,
      Math.round(Number(value || 0))
    )
  );

}

function buildDevelopmentProgressBar(progress) {

  const total =
    10;

  const filled =
    Math.round(progress / 10);

  return (
    "█".repeat(filled) +
    "□".repeat(total - filled)
  );

}

/* ===============================
   Development Dashboard Status
=============================== */

function buildDevelopmentDashboardStatus() {

  const modules = [

    buildMigrationStatus(),

    buildRepositoryStatus(),

    buildValidationStatus(),

    buildPublicationStatus()

  ];

  return {

    updatedAt:
      new Date().toISOString(),

    modules,

    progress:
      calculateDashboardProgress(
        modules
      ),

    health:
      calculateDashboardHealth(
        modules
      )

  };

}

function calculateDashboardProgress(
  modules
) {

  if (!modules.length) {
    return 0;
  }

  const total =
    modules.reduce(
      (sum, item) =>
        sum + item.progress,
      0
    );

  return Math.round(
    total / modules.length
  );

}

function buildMigrationStatus() {

  const status =
    calculateImplementationProgress([

      "getKnowledgeMigrationRegistry",

      "scanKnowledgeMigration",

      "previewKnowledgeMigration",

      "executeKnowledgeMigration",

      "validateKnowledgeMigration",

      "buildKnowledgeMigrationReport",

      "rollbackKnowledgeMigration",

      "showKnowledgeMigrationHistory"

    ]);

  return {

    id: "Migration",

    name:
      "Migration Engine",

    implemented:
      status.implemented,

    total:
      status.total,

    progress:
      status.progress,

    health:
      status.progress,

    nextTask:
      ""

  };

}

function buildRepositoryStatus() {

  return {
    id: "Repository",
    name: "Repository Core",
    implemented: 0,
    total: 0,
    progress: 0,
    health: 100,
    nextTask: ""
  };

}

function buildValidationStatus() {

  return {
    id: "Validation",
    name: "Validation Engine",
    implemented: 0,
    total: 0,
    progress: 0,
    health: 100,
    nextTask: ""
  };

}

function buildPublicationStatus() {

  return {
    id: "Publication",
    name: "Publication Engine",
    implemented: 0,
    total: 0,
    progress: 0,
    health: 100,
    nextTask: ""
  };

}

/* ===============================
   Dashboard Health Calculation
=============================== */

function calculateDashboardHealth(
  modules
) {

  if (
    !Array.isArray(modules) ||
    !modules.length
  ) {
    return 0;
  }

  const validModules =
    modules.filter(item =>
      item &&
      typeof item.health === "number"
    );

  if (!validModules.length) {
    return 0;
  }

  const total =
    validModules.reduce(
      (sum, item) =>
        sum + item.health,
      0
    );

  return Math.round(
    total / validModules.length
  );

}

/* ===============================
   Development Status Utility
=============================== */

function isImplementedFunction(
  name
) {

  return (
    typeof window[name] ===
    "function"
  );

}

function calculateImplementationProgress(
  functions
) {

  const total =
    functions.length;

  const implemented =
    functions.filter(
      isImplementedFunction
    ).length;

  return {

    implemented,

    total,

    progress:
      total
        ? Math.round(
            implemented /
            total *
            100
          )
        : 0

  };

}

function buildKnowledgeMigrationReport() {

  const scan =
    typeof scanKnowledgeMigration === "function"
      ? scanKnowledgeMigration()
      : {
          checked: 0,
          candidates: []
        };

  const candidates =
    Array.isArray(scan.candidates)
      ? scan.candidates
      : [];

  const lines = [];

  lines.push("==================================");
  lines.push("Knowledge Migration Report");
  lines.push("==================================");
  lines.push("");
  lines.push("Checked: " + (scan.checked || 0));
  lines.push("Candidates: " + candidates.length);
  lines.push("");

  if (!candidates.length) {
    lines.push("No migration candidates.");
    return lines.join("\n");
  }

  candidates.forEach((item, index) => {
    lines.push((index + 1) + ". " + (item.id || item.name || "Unknown"));
    lines.push("Reason: " + (item.reason || ""));
    lines.push("");
  });

  return lines.join("\n");

}