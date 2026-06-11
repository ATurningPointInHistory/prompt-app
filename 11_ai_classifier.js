/* ===============================
   FILE: 11_ai_classifier.js
   AI File Classifier
=============================== */

function classifyAiChanges(functionName = "") {

  const name =
    String(functionName).toLowerCase();

  const rules = [

    {
      file: "00_bootstrap.js",
      score: [
        "float",
        "panel",
        "menu",
        "bootstrap",
        "switchapp"
      ]
    },

    {
      file: "01_core.js",
      score: [
        "escape",
        "copy",
        "helper",
        "util",
        "safe"
      ]
    },

    {
      file: "02_prompt.js",
      score: [
        "prompt",
        "review",
        "convert",
        "command",
        "generate"
      ]
    },

    {
      file: "03_data.js",
      score: [
        "save",
        "load",
        "history",
        "storage",
        "state"
      ]
    },

    {
      file: "04_tools.js",
      score: [
        "template",
        "danger",
        "pattern",
        "preset",
        "todo"
      ]
    },

    {
      file: "05_repair.js",
      score: [
        "repair",
        "undo",
        "redo",
        "editor",
        "functionsort"
      ]
    },

    {
      file: "06_search.js",
      score: [
        "search",
        "replace",
        "highlight",
        "cursor"
      ]
    },

    {
      file: "07_backup_health.js",
      score: [
        "backup",
        "health",
        "diagnose",
        "dependency",
        "safe"
      ]
    },

    {
      file: "09_relation_map.js",
      score: [
        "relation",
        "graph",
        "map"
      ]
    },

    {
      file: "10_ai_integrator.js",
      score: [
        "ai",
        "integration",
        "diff",
        "classifier"
      ]
    }

  ];

  let best =
    "unknown";

  let bestScore =
    0;

  rules.forEach(rule => {

    let score = 0;

    rule.score.forEach(word => {

      if (
        name.includes(word)
      ) {
        score++;
      }

    });

    if (score > bestScore) {

      bestScore = score;

      best =
        rule.file;

    }

  });

  return {
    file: best,
    score: bestScore
  };

}