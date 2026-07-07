/* ===============================
   FILE: 13_development_dashboard.js
   Development Dashboard v1
=============================== */

/* ===============================
   Dashboard Check Config
=============================== */

const DEVELOPMENT_DASHBOARD_CHECKS = [
  {
    phase: "Migration Engine",
    items: [
      {
        name: "Scan",
        fn: "scanKnowledgeMigration"
      },
      {
        name: "Preview",
        fn: "previewKnowledgeMigration"
      },
      {
        name: "Execute",
        fn: "executeKnowledgeMigration"
      },
      {
        name: "Validation",
        fn: "validateKnowledgeMigration"
      },
      {
        name: "Report",
        fn: "buildKnowledgeMigrationReport"
      }
    ]
  },
  {
    phase: "Repository Manager",
    items: [
      {
        name: "Repository Manager",
        fn: "getRepositoryManagerStatus"
      },
      {
        name: "Repository Status",
        fn: "getRepositoryStatus"
      }
    ]
  },
  {
    phase: "Development Dashboard",
    items: [
      {
        name: "Function Check",
        fn: "checkDevelopmentFunction"
      },
      {
        name: "Dashboard Build",
        fn: "buildDevelopmentDashboard"
      },
      {
        name: "Dashboard Report",
        fn: "buildDevelopmentDashboardReport"
      },
      {
        name: "Dashboard Show",
        fn: "showDevelopmentDashboard"
      }
    ]
  }
];

/* ===============================
   Function Check
=============================== */

function checkDevelopmentFunction(name) {

  return typeof window[name] === "function";

}

/* ===============================
   Build Dashboard Data
=============================== */

function buildDevelopmentDashboard() {

  const phases =
    DEVELOPMENT_DASHBOARD_CHECKS.map(group => {

      const items =
        group.items.map(item => {

          const exists =
            checkDevelopmentFunction(item.fn);

          return {
            name: item.name,
            fn: item.fn,
            exists: exists,
            status: exists ? "OK" : "MISSING"
          };

        });

      const total =
        items.length;

      const ok =
        items.filter(item => item.exists).length;

      const progress =
        total
          ? Math.round((ok / total) * 100)
          : 0;

      return {
        phase: group.phase,
        total: total,
        ok: ok,
        missing: total - ok,
        progress: progress,
        items: items
      };

    });

  const total =
    phases.reduce((sum, phase) => sum + phase.total, 0);

  const ok =
    phases.reduce((sum, phase) => sum + phase.ok, 0);

  const progress =
    total
      ? Math.round((ok / total) * 100)
      : 0;

  return {
    title: "Development Dashboard",
    version: "1.0.0",
    currentPhase: "Development Dashboard Phase",
    total: total,
    ok: ok,
    missing: total - ok,
    progress: progress,
    phases: phases,
    updatedAt: new Date().toISOString()
  };

}

/* ===============================
   Build Copyable Report
=============================== */

function buildDevelopmentDashboardReport() {

  const dashboard =
    buildDevelopmentDashboard();

  const lines = [];

  lines.push("========================================");
  lines.push("AI Prompt OS v7.0");
  lines.push("Development Dashboard Report");
  lines.push("========================================");
  lines.push("");
  lines.push("Current Phase");
  lines.push(dashboard.currentPhase);
  lines.push("");
  lines.push("Overall Progress");
  lines.push(dashboard.progress + "%");
  lines.push("");
  lines.push("Implemented");
  lines.push(dashboard.ok + " / " + dashboard.total);
  lines.push("");
  lines.push("Missing");
  lines.push(String(dashboard.missing));
  lines.push("");

  dashboard.phases.forEach(phase => {

    lines.push("----------------------------------------");
    lines.push(phase.phase);
    lines.push("----------------------------------------");
    lines.push("Progress: " + phase.progress + "%");
    lines.push("");

    phase.items.forEach(item => {
      lines.push(
        "[" + item.status + "] " +
        item.name +
        " : " +
        item.fn
      );
    });

    lines.push("");

  });

  lines.push("Updated");
  lines.push(dashboard.updatedAt);
  lines.push("");
  lines.push("========================================");
  lines.push("END");
  lines.push("========================================");

  return lines.join("\n");

}

/* ===============================
   Show Dashboard
=============================== */

function showDevelopmentDashboard() {

  const report =
    buildDevelopmentDashboardReport();

  console.log(report);

  return report;

}

/* ===============================
   Short Status API
=============================== */

function getDevelopmentDashboardStatus() {

  const dashboard =
    buildDevelopmentDashboard();

  return {
    name: "Development Dashboard",
    version: dashboard.version,
    ready: true,
    health: dashboard.progress,
    progress: dashboard.progress,
    missing: dashboard.missing
  };

}