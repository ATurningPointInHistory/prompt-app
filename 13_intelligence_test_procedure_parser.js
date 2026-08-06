/* ============================================================
   FILE: 13_intelligence_test_procedure_parser.js
   IDE-170 Intelligence Platform
   Version: 1.4.1
   Architecture Decision: 011 v1.1.0
   Phase: Test Procedure Intake and Validation Compiler (Pre-Phase 4)
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Test Procedure Parser blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.4.1";
  const CAPABILITY_ID = "IDE-170-TEST-PROCEDURE-PARSER";
  const POLICIES = Object.freeze([
    "Auto Executable",
    "Warning Selectable",
    "Manual Confirmation",
    "Prohibited",
    "Unrecognized"
  ]);

  if (!(state.parsedTestProcedures instanceof Map)) state.parsedTestProcedures = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "latestParsedTestProcedureId")) {
    state.latestParsedTestProcedureId = null;
  }

  const MARKER_PATTERNS = [
    { key: "execution", pattern: /^(?:実行|実行コード|コマンド|execute|command)\s*[:：]\s*$/i },
    { key: "expected", pattern: /^(?:期待結果|合格条件|expected|expected result|pass condition)\s*[:：]\s*$/i },
    { key: "manual", pattern: /^(?:手動確認|確認項目|manual confirmation)\s*[:：]\s*$/i },
    { key: "warning", pattern: /^(?:注意|警告|warning)\s*[:：]\s*$/i },
    { key: "failure", pattern: /^(?:失敗時|failure rule)\s*[:：]\s*$/i },
    { key: "finalGate", pattern: /^(?:最終gate|最終コマンド|final gate)\s*[:：]\s*$/i }
  ];

  const PROHIBITED_PATTERNS = [
    { code: "GITHUB_AUTOMATIC_MUTATION", pattern: /(?:git(?:hub)?\s*(?:push|commit)|octokit|api\.github\.com.*(?:push|commit)|createOrUpdateFileContents)/i },
    { code: "REPOSITORY_DIRECT_MUTATION", pattern: /(?:deleteSourceFile|removeSourceFile|writeSourceFile|replaceSourceFile|directRepositoryMutation)/i },
    { code: "CREDENTIAL_ACCESS", pattern: /(?:document\.cookie|password|authToken|accessToken|refreshToken|authorization\s*[:=])/i },
    { code: "UNBOUNDED_DYNAMIC_CODE", pattern: /(?:\beval\s*\(|new\s+Function\s*\(|Function\s*\()/i },
    { code: "AUTOMATIC_WORKFLOW_EXECUTION", pattern: /(?:executeWorkflowAutomatically|automaticWorkflowExecution\s*=\s*true)/i },
    { code: "MANUAL_CONFIRMATION_AUTOMATION", pattern: /(?:confirmed\s*:\s*true.*confirmedBy\s*:\s*["']AI|autoConfirmManual)/i }
  ];

  const WARNING_PATTERNS = [
    { level: "High", reason: "External or same-origin Network communication may occur.", pattern: /\bfetch\s*\(|XMLHttpRequest|WebSocket/i },
    { level: "High", reason: "A browser File or ZIP will be generated.", pattern: /JSZip|generateAsync|buildValidationEvidencePackage|saveProjectPackage|saveAs\s*\(/i },
    { level: "Medium", reason: "Browser Download will be initiated.", pattern: /downloadEvidence\s*:\s*true|\.download\s*=|\.click\s*\(\s*\)|createObjectURL/i },
    { level: "Medium", reason: "Local Storage or Session Storage may be changed.", pattern: /localStorage|sessionStorage/i },
    { level: "Medium", reason: "A Session, Snapshot, Dataset, or Validation Run may be created.", pattern: /startSession|buildRepository|buildCanonicalSnapshot|captureSources|runAutomatedValidation|registerTestDataset/i },
    { level: "Medium", reason: "Page state or navigation may change.", pattern: /location\.(?:reload|assign|replace)|history\.(?:pushState|replaceState)/i },
    { level: "Low", reason: "The operation may process a large number of Records.", pattern: /sourceIntake|repositorySnapshot|canonicalSnapshot|recordCount/i }
  ];

  const SAFE_PATTERNS = [
    /^(?:await\s+)?IDE170Intelligence\.getStatus\(\)\s*;?$/,
    /^(?:await\s+)?IDE170Intelligence\.getReleaseStatus\(\)\s*;?$/,
    /^(?:await\s+)?getAIDevelopmentWorkflowStatus\(\)\s*;?$/,
    /^(?:await\s+)?getIntelligencePlatformStatus\(\)\s*;?$/,
    /^(?:await\s+)?getIntelligencePlatformReleaseStatus\(\)\s*;?$/,
    /^(?:await\s+)?IDE170Intelligence\.calculateSHA256\([\s\S]*\)\s*;?$/,
    /^(?:await\s+)?IDE170Intelligence\.validate[A-Za-z0-9_]*\([\s\S]*\)\s*;?$/
  ];

  function sha256(value) {
    return namespace.calculateSHA256(String(value == null ? "" : value));
  }

  function cleanCode(text) {
    let code = String(text || "").trim();
    code = code.replace(/^```(?:javascript|js)?\s*/i, "").replace(/\s*```$/, "").trim();
    return code;
  }

  function parseLiteral(value) {
    const text = String(value || "").trim().replace(/[。；;]$/, "");
    if (/^true$/i.test(text)) return true;
    if (/^false$/i.test(text)) return false;
    if (/^null$/i.test(text)) return null;
    if (/^undefined$/i.test(text)) return undefined;
    if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
      return text.slice(1, -1);
    }
    try {
      if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
        return JSON.parse(text);
      }
    } catch (error) {
      return text;
    }
    return text;
  }

  function parseExpectedLine(line) {
    const text = String(line || "")
      .replace(/^[-*☑□✓✔]\s*/, "")
      .trim();
    if (!text) return null;

    const ratio = text.match(/^([A-Za-z0-9_. -]+)\s*=\s*(\d+)\s*\/\s*(\d+)\s*PASS$/i);
    if (ratio) {
      return {
        path: ratio[1].trim().replace(/\s+/g, ""),
        comparator: "Exact",
        expected: { passed: Number(ratio[2]), total: Number(ratio[3]), failed: 0 },
        sourceText: text,
        parserWarning: "Ratio expression was normalized to a Partial Object expectation."
      };
    }

    const range = text.match(/^([A-Za-z0-9_.\[\]-]+)\s*(?:=|:)\s*(-?\d+(?:\.\d+)?)\s*(?:\.\.|〜|~|to)\s*(-?\d+(?:\.\d+)?)$/i);
    if (range) {
      return {
        path: range[1],
        comparator: "Numeric Range",
        minimum: Number(range[2]),
        maximum: Number(range[3]),
        sourceText: text
      };
    }

    const match = text.match(/^([A-Za-z0-9_$.[\]-]+)\s*(?:=|:)\s*(.+)$/);
    if (match) {
      const path = match[1].trim();
      const rawValue = match[2].trim();
      const alternatives = rawValue.split(/\s+(?:または|or)\s+/i).map(function trim(item) { return item.trim(); });
      if (alternatives.length > 1) {
        return {
          path: path,
          comparator: "One Of",
          values: alternatives.map(parseLiteral),
          sourceText: text
        };
      }
      return {
        path: path,
        comparator: "Exact",
        expected: parseLiteral(rawValue),
        sourceText: text
      };
    }

    if (/PASS/i.test(text)) {
      return {
        path: null,
        comparator: "Unrecognized",
        expected: text,
        sourceText: text,
        parserWarning: "PASS condition could not be mapped to a Field Path."
      };
    }
    return null;
  }

  function parseExpectedEntries(entries) {
    const conditions = [];
    let contextPath = "";
    let listTruePrefix = "";
    let pendingAssignment = null;
    const lines = entries.map(function normalize(entry) {
      return internal.isPlainObject(entry) ? { lineNumber: entry.lineNumber, text: String(entry.text || "") } : { lineNumber: null, text: String(entry || "") };
    });

    for (let index = 0; index < lines.length; index += 1) {
      let text = lines[index].text.trim();
      if (!text) continue;
      text = text.replace(/^[-*☑□✓✔]\s*/, "").trim();

      if (pendingAssignment) {
        const joined = pendingAssignment + " " + text;
        const condition = parseExpectedLine(joined);
        if (condition) {
          conditions.push(condition);
          pendingAssignment = null;
          continue;
        }
      }
      if (/^[A-Za-z0-9_$.[\]-]+\s*(?:=|:)\s*$/.test(text)) {
        pendingAssignment = text;
        continue;
      }

      const moduleList = text.match(/^(?:以下の)?全?([A-Za-z0-9_-]*Module)がtrue\s*[:：]?$/i);
      if (moduleList || /以下の全Moduleがtrue/i.test(text)) {
        listTruePrefix = "modules";
        contextPath = "";
        continue;
      }
      if (listTruePrefix && /^[A-Za-z_$][A-Za-z0-9_$-]*$/.test(text)) {
        conditions.push({ path: listTruePrefix + "." + text, comparator: "Exact", expected: true, sourceText: text + " = true" });
        continue;
      }

      const contextMatch = text.match(/^([A-Za-z_$][A-Za-z0-9_$.-]*)\s*[:：]\s*$/);
      if (contextMatch && !markerFor(text)) {
        contextPath = contextMatch[1].replace(/\.$/, "");
        listTruePrefix = "";
        continue;
      }

      const ratioOnly = text.match(/^(\d+)\s*\/\s*(\d+)\s*(?:PASS|Passed)$/i);
      if (ratioOnly) {
        conditions.push({
          path: contextPath || null,
          comparator: "Partial Object",
          expected: { passed: Number(ratioOnly[1]), total: Number(ratioOnly[2]), failed: 0 },
          sourceText: text
        });
        continue;
      }

      const condition = parseExpectedLine(text);
      if (condition) {
        if (contextPath && condition.path && !condition.path.includes(".")) {
          condition.path = contextPath + "." + condition.path;
        }
        conditions.push(condition);
      }
    }
    return conditions;
  }

  function extractImplicitCode(entries) {
    const lines = entries.map(function line(entry) { return String(entry.text || ""); });
    let start = -1;
    for (let index = 0; index < lines.length; index += 1) {
      const text = lines[index].trim();
      if (/^(?:\(\s*async\s*\(|\(\s*\(\s*\)|\(\s*function\b|IDE170Intelligence\.|get[A-Z][A-Za-z0-9_]*\s*\(|validate[A-Z][A-Za-z0-9_]*\s*\()/i.test(text)) {
        start = index;
        break;
      }
    }
    if (start < 0) return "";
    const first = lines[start].trim();
    if (/^(?:IDE170Intelligence\.|get[A-Z]|validate[A-Z])/.test(first) && !first.includes("=>") && !first.endsWith("{")) {
      return cleanCode(first);
    }
    return cleanCode(lines.slice(start).join("\n"));
  }

  function markerFor(line) {
    const value = String(line || "").trim();
    for (const marker of MARKER_PATTERNS) {
      if (marker.pattern.test(value)) return marker.key;
    }
    return null;
  }

  function isSeparator(line) {
    return /^\s*[=－—-]{5,}\s*$/.test(String(line || ""));
  }

  function buildSections(text) {
    const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    const sections = [];
    let current = { title: "Procedure", startLine: 1, lines: [] };

    function pushCurrent(endLine) {
      if (current.lines.some(function has(line) { return String(line).trim(); })) {
        current.endLine = endLine;
        sections.push(current);
      }
    }

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const markdown = line.match(/^\s*#{1,6}\s+(.+?)\s*$/);
      if (markdown) {
        pushCurrent(index);
        current = { title: markdown[1].trim(), startLine: index + 1, lines: [] };
        continue;
      }
      if (isSeparator(line)) {
        let nextIndex = index + 1;
        while (nextIndex < lines.length && !lines[nextIndex].trim()) nextIndex += 1;
        let afterTitle = nextIndex + 1;
        while (afterTitle < lines.length && !lines[afterTitle].trim()) afterTitle += 1;
        if (nextIndex < lines.length && afterTitle < lines.length && isSeparator(lines[afterTitle])) {
          pushCurrent(index);
          current = { title: lines[nextIndex].trim(), startLine: nextIndex + 1, lines: [] };
          index = afterTitle;
          continue;
        }
      }
      current.lines.push({ lineNumber: index + 1, text: line });
    }
    pushCurrent(lines.length);
    return sections;
  }

  function classifyCode(code, context) {
    const source = cleanCode(code);
    if (context.manual === true) {
      return { policy: "Manual Confirmation", warningLevel: null, warningReasons: [], prohibitedReasons: [] };
    }
    if (!source) {
      return { policy: "Unrecognized", warningLevel: null, warningReasons: ["Execution code was not found."], prohibitedReasons: [] };
    }
    const prohibitedReasons = PROHIBITED_PATTERNS
      .filter(function match(item) { return item.pattern.test(source); })
      .map(function reason(item) { return item.code; });
    if (prohibitedReasons.length) {
      return { policy: "Prohibited", warningLevel: "Critical", warningReasons: [], prohibitedReasons: prohibitedReasons };
    }
    const safe = SAFE_PATTERNS.some(function match(pattern) { return pattern.test(source); });
    const warnings = WARNING_PATTERNS.filter(function match(item) { return item.pattern.test(source); });
    if (warnings.length || !safe) {
      const rank = { Low: 1, Medium: 2, High: 3 };
      const level = warnings.reduce(function highest(current, item) {
        return rank[item.level] > rank[current] ? item.level : current;
      }, safe ? "Low" : "Medium");
      const reasons = warnings.map(function reason(item) { return item.reason; });
      if (!safe) reasons.unshift("The code is not a directly registered read-only Validation Target.");
      return {
        policy: "Warning Selectable",
        warningLevel: level,
        warningReasons: internal.unique(reasons),
        prohibitedReasons: []
      };
    }
    return { policy: "Auto Executable", warningLevel: null, warningReasons: [], prohibitedReasons: [] };
  }

  function targetDescriptor(code) {
    const source = cleanCode(code).replace(/;$/, "").trim();
    if (/^IDE170Intelligence\.getStatus\(\)$/.test(source) || /^getIntelligencePlatformStatus\(\)$/.test(source)) {
      return { targetId: "IDE-170-TARGET-CURRENT-STATUS", executionType: "Status Probe", input: {} };
    }
    if (/^IDE170Intelligence\.getReleaseStatus\(\)$/.test(source) || /^getIntelligencePlatformReleaseStatus\(\)$/.test(source)) {
      return { targetId: "IDE-170-TARGET-CURRENT-RELEASE", executionType: "Status Probe", input: {} };
    }
    if (/^getAIDevelopmentWorkflowStatus\(\)$/.test(source)) {
      return { targetId: "IDE-170-TARGET-IDE160-STATUS", executionType: "Regression Probe", input: {} };
    }
    const sha = source.match(/^IDE170Intelligence\.calculateSHA256\((.*)\)$/s);
    if (sha) {
      return { targetId: "IDE-170-TARGET-SHA256", executionType: "Function", input: { arguments: [parseLiteral(sha[1])] } };
    }
    return {
      targetId: "IDE-170-TARGET-OWNER-APPROVED-CODE",
      executionType: /\bawait\b|^\(async\b/.test(source) ? "Async Function" : "Function",
      input: { code: source }
    };
  }

  function parseSection(section, startIndex) {
    const buckets = { execution: [], expected: [], manual: [], warning: [], failure: [], finalGate: [] };
    let currentKey = null;
    const freeLines = [];
    section.lines.forEach(function route(entry) {
      const marker = markerFor(entry.text);
      if (marker) {
        currentKey = marker;
        return;
      }
      if (currentKey) buckets[currentKey].push(entry);
      else freeLines.push(entry);
    });

    const steps = [];
    const executionEntries = buckets.execution.length
      ? buckets.execution
      : buckets.finalGate;
    let executionText = cleanCode(executionEntries.map(function text(item) { return item.text; }).join("\n"));
    if (!executionText) executionText = extractImplicitCode(section.lines);
    const expectedConditions = parseExpectedEntries(buckets.expected);
    const warningText = buckets.warning.map(function text(item) { return item.text.trim(); }).filter(Boolean);
    const failureRule = buckets.failure.map(function text(item) { return item.text.trim(); }).filter(Boolean).join("\n");
    const isFinalGate = buckets.finalGate.length > 0 || /最終\s*(?:Gate|ゲート|コマンド)|Final Gate/i.test(section.title);

    if (executionText) {
      const classification = classifyCode(executionText, { manual: false });
      const descriptor = targetDescriptor(executionText);
      const parserWarnings = [];
      expectedConditions.forEach(function warning(condition) {
        if (condition.parserWarning) parserWarnings.push(condition.parserWarning);
      });
      if (!expectedConditions.length) parserWarnings.push("Expected Result was not found for executable Step.");
      steps.push({
        stepId: "STEP-" + String(startIndex + steps.length + 1).padStart(3, "0"),
        order: startIndex + steps.length + 1,
        title: section.title,
        description: freeLines.map(function text(item) { return item.text; }).join("\n").trim(),
        sourceLineStart: section.startLine,
        sourceLineEnd: section.endLine,
        executionCode: executionText,
        executionType: descriptor.executionType,
        targetId: descriptor.targetId,
        input: descriptor.input,
        expectedText: buckets.expected.map(function text(item) { return item.text; }).join("\n").trim(),
        expectedConditions: expectedConditions,
        manualConfirmation: false,
        warningText: warningText,
        failureRule: failureRule,
        finalGate: isFinalGate,
        required: true,
        parserConfidence: classification.policy === "Auto Executable" && expectedConditions.length ? "High" : expectedConditions.length ? "Medium" : "Low",
        parserWarnings: internal.unique(parserWarnings),
        executionPolicy: classification.policy,
        warningLevel: classification.warningLevel,
        warningReasons: internal.unique(classification.warningReasons.concat(warningText)),
        prohibitedReasons: classification.prohibitedReasons,
        defaultSelected: classification.policy === "Auto Executable",
        codeHash: sha256(executionText)
      });
    }

    let manualEntries = buckets.manual.slice();
    if (!manualEntries.length && /手動|実機.*確認|画面.*確認/i.test(section.title + "\n" + freeLines.map(function item(entry) { return entry.text; }).join("\n"))) {
      manualEntries = section.lines.filter(function bullet(entry) {
        return /^\s*[-*☑□✓✔]\s+/.test(entry.text);
      });
    }
    if (!executionText && !manualEntries.length && /ZIP保存確認|Evidence ZIP確認|ダウンロード確認|保存確認/i.test(section.title)) {
      manualEntries = [{ lineNumber: section.startLine, text: section.title }];
    }

    manualEntries.forEach(function manual(entry) {
      const description = entry.text.replace(/^[-*☑□✓✔]\s*/, "").trim();
      if (!description) return;
      steps.push({
        stepId: "STEP-" + String(startIndex + steps.length + 1).padStart(3, "0"),
        order: startIndex + steps.length + 1,
        title: section.title + (description === section.title ? "" : " - " + description),
        description: description,
        sourceLineStart: entry.lineNumber,
        sourceLineEnd: entry.lineNumber,
        executionCode: "",
        executionType: "Manual Confirmation",
        targetId: "",
        input: {},
        expectedText: "confirmed = true",
        expectedConditions: [{ path: null, comparator: "Exact", expected: true, sourceText: "confirmed = true" }],
        manualConfirmation: true,
        warningText: warningText,
        failureRule: failureRule,
        finalGate: isFinalGate,
        required: true,
        parserConfidence: "High",
        parserWarnings: [],
        executionPolicy: "Manual Confirmation",
        warningLevel: null,
        warningReasons: [],
        prohibitedReasons: [],
        defaultSelected: true,
        codeHash: null
      });
    });

    if (!steps.length &&
        /^\s*\d+\.|確認|テスト|実行|Gate/i.test(section.title) &&
        !/期待結果|失敗時のルール|テスト手順終了|Procedure/i.test(section.title)) {
      steps.push({
        stepId: "STEP-" + String(startIndex + 1).padStart(3, "0"),
        order: startIndex + 1,
        title: section.title,
        description: section.lines.map(function text(item) { return item.text; }).join("\n").trim(),
        sourceLineStart: section.startLine,
        sourceLineEnd: section.endLine,
        executionCode: "",
        executionType: "Function",
        targetId: "",
        input: {},
        expectedText: "",
        expectedConditions: [],
        manualConfirmation: false,
        warningText: [],
        failureRule: "",
        finalGate: isFinalGate,
        required: false,
        parserConfidence: "Unrecognized",
        parserWarnings: ["Execution code and Manual Confirmation could not be recognized."],
        executionPolicy: "Unrecognized",
        warningLevel: null,
        warningReasons: ["The Step requires Project Owner review before it can become Warning Selectable."],
        prohibitedReasons: [],
        defaultSelected: false,
        codeHash: null
      });
    }

    return steps;
  }

  function parseStructuredJson(procedure) {
    const parsed = JSON.parse(procedure.originalText);
    const sourceSteps = Array.isArray(parsed.steps)
      ? parsed.steps
      : Array.isArray(parsed.testCases)
        ? parsed.testCases
        : [];
    return sourceSteps.map(function normalize(step, index) {
      const code = cleanCode(step.executionCode || step.code || step.command || "");
      const manual = step.executionPolicy === "Manual Confirmation" || step.executionType === "Manual Confirmation";
      const classification = classifyCode(code, { manual: manual });
      const descriptor = targetDescriptor(code);
      const expectedConditions = Array.isArray(step.expectedConditions)
        ? internal.clone(step.expectedConditions)
        : step.expected
          ? [{ path: step.expected.path || null, comparator: step.expected.comparator || "Exact", expected: step.expected.value }]
          : [];
      return {
        stepId: internal.canonicalId(step.stepId || "STEP-" + String(index + 1).padStart(3, "0")),
        order: Number(step.order) || index + 1,
        title: internal.text(step.title || step.name, "Step " + (index + 1)),
        description: internal.text(step.description, ""),
        sourceLineStart: null,
        sourceLineEnd: null,
        executionCode: code,
        executionType: manual ? "Manual Confirmation" : internal.text(step.executionType, descriptor.executionType),
        targetId: manual ? "" : internal.text(step.targetId || step.target, descriptor.targetId),
        input: internal.isPlainObject(step.input) ? internal.clone(step.input) : descriptor.input,
        expectedText: internal.text(step.expectedText, ""),
        expectedConditions: expectedConditions,
        manualConfirmation: manual,
        warningText: internal.unique(step.warningText),
        failureRule: internal.text(step.failureRule, ""),
        finalGate: step.finalGate === true,
        required: step.required !== false,
        parserConfidence: internal.text(step.parserConfidence, expectedConditions.length ? "High" : "Low"),
        parserWarnings: internal.unique(step.parserWarnings),
        executionPolicy: internal.text(step.executionPolicy, classification.policy),
        warningLevel: internal.text(step.warningLevel, classification.warningLevel) || null,
        warningReasons: internal.unique(step.warningReasons).concat(classification.warningReasons),
        prohibitedReasons: internal.unique(step.prohibitedReasons).concat(classification.prohibitedReasons),
        defaultSelected: Object.prototype.hasOwnProperty.call(step, "defaultSelected")
          ? step.defaultSelected === true
          : classification.policy === "Auto Executable" || manual,
        codeHash: code ? sha256(code) : null
      };
    });
  }

  function summarizePolicies(steps) {
    return steps.reduce(function summarize(summary, step) {
      summary[step.executionPolicy] = (summary[step.executionPolicy] || 0) + 1;
      return summary;
    }, {
      "Auto Executable": 0,
      "Warning Selectable": 0,
      "Manual Confirmation": 0,
      Prohibited: 0,
      Unrecognized: 0
    });
  }

  function parseTestProcedure(procedureInput, options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const procedure = typeof procedureInput === "string"
      ? namespace.getTestProcedure(procedureInput)
      : internal.isPlainObject(procedureInput)
        ? internal.clone(procedureInput)
        : null;
    if (!procedure) {
      return internal.buildResult(false, "TEST_PROCEDURE_NOT_FOUND", "Blocked", null, {
        error: { message: "Test Procedure was not found.", category: "Input Failure" }
      });
    }
    try {
      let steps = [];
      let sections = [];
      if (procedure.format === "json") {
        steps = parseStructuredJson(procedure);
      } else {
        sections = buildSections(procedure.originalText);
        sections.forEach(function parse(section) {
          if (/^(?:\d+\.\s*)?(?:期待結果|Expected Result)\s*$/i.test(section.title) && steps.length) {
            const looseExpected = parseExpectedEntries(section.lines);
            const targetStep = [...steps].reverse().find(function find(step) {
              return step.executionPolicy !== "Manual Confirmation" && step.executionPolicy !== "Prohibited";
            });
            if (targetStep && looseExpected.length) {
              targetStep.expectedConditions = targetStep.expectedConditions.concat(looseExpected);
              targetStep.expectedText = [targetStep.expectedText, section.lines.map(function text(item) { return item.text; }).join("\n")].filter(Boolean).join("\n");
              targetStep.finalGate = true;
              targetStep.parserWarnings = targetStep.parserWarnings.filter(function remove(item) {
                return item !== "Expected Result was not found for executable Step.";
              });
              targetStep.parserConfidence = targetStep.executionPolicy === "Auto Executable" ? "High" : "Medium";
              return;
            }
          }
          steps = steps.concat(parseSection(section, steps.length));
        });
      }

      const parserWarnings = [];
      if (!steps.length) parserWarnings.push("No executable or manual confirmation Step was recognized.");
      steps.forEach(function collect(step) {
        step.parserWarnings.forEach(function warning(item) {
          parserWarnings.push(step.stepId + ": " + item);
        });
      });
      const policySummary = summarizePolicies(steps);
      const highConfidence = steps.filter(function filter(step) { return step.parserConfidence === "High"; }).length;
      const parsedId = internal.canonicalId(
        settings.parsedProcedureId ||
        "IDE-170-PARSED-PROCEDURE-" + procedure.procedureId.replace(/^IDE-170-PROCEDURE-/, "")
      );
      const record = {
        parsedProcedureId: parsedId,
        procedureId: procedure.procedureId,
        procedureVersion: procedure.version,
        procedureHash: procedure.procedureHash,
        parserVersion: VERSION,
        status: "Frozen",
        immutable: true,
        sectionCount: sections.length,
        stepCount: steps.length,
        steps: steps,
        policySummary: policySummary,
        parserWarnings: internal.unique(parserWarnings),
        parserConfidence: steps.length && highConfidence === steps.length
          ? "High"
          : steps.length && highConfidence >= Math.ceil(steps.length / 2)
            ? "Medium"
            : steps.length
              ? "Low"
              : "Unrecognized",
        parsedAt: internal.nowIso(),
        parsedBy: internal.text(settings.actor, "Project Owner"),
        parseHash: null
      };
      record.parseHash = sha256(internal.stableStringify(Object.assign({}, record, { parseHash: null })));
      const stored = internal.deepFreeze(record);
      state.parsedTestProcedures.set(parsedId, stored);
      state.latestParsedTestProcedureId = parsedId;
      internal.touch();
      internal.appendAudit({
        action: "TEST_PROCEDURE_PARSED",
        actor: record.parsedBy,
        targetType: "Parsed Test Procedure",
        targetId: parsedId,
        outcome: steps.length ? "Succeeded" : "Blocked",
        detail: { stepCount: steps.length, policySummary: policySummary, parserWarnings: record.parserWarnings.length }
      });
      return internal.buildResult(steps.length > 0,
        steps.length ? "TEST_PROCEDURE_PARSED" : "TEST_PROCEDURE_UNRECOGNIZED",
        steps.length ? "Frozen" : "Blocked",
        { parsedProcedure: getParsedTestProcedure(parsedId) },
        steps.length ? {} : { error: { message: "No Steps were recognized.", category: "Parser Failure" } }
      );
    } catch (error) {
      return internal.buildResult(false, "TEST_PROCEDURE_PARSE_FAILED", "Failed", null, {
        error: { message: internal.text(error && error.message, String(error)), category: "Parser Failure" }
      });
    }
  }

  function getParsedTestProcedure(parsedProcedureId) {
    const record = state.parsedTestProcedures.get(internal.canonicalId(parsedProcedureId));
    return record ? internal.clone(record) : null;
  }

  function listParsedTestProcedures() {
    return [...state.parsedTestProcedures.values()]
      .sort(function sort(left, right) { return left.parsedAt.localeCompare(right.parsedAt); })
      .map(internal.clone);
  }

  function registerSchemas() {
    if (namespace.getSchema && namespace.getSchema("IDE-170-SCHEMA-PARSED-TEST-PROCEDURE")) {
      return [{ schemaId: "IDE-170-SCHEMA-PARSED-TEST-PROCEDURE", registered: true, existing: true }];
    }
    const result = namespace.registerSchema({
      schemaId: "IDE-170-SCHEMA-PARSED-TEST-PROCEDURE",
      name: "Parsed Test Procedure",
      version: VERSION,
      type: "object",
      required: ["parsedProcedureId", "procedureId", "parserVersion", "steps", "policySummary", "parseHash"],
      properties: {
        parsedProcedureId: { type: "string", minLength: 1 },
        procedureId: { type: "string", minLength: 1 },
        parserVersion: { type: "string", format: "semver" },
        steps: { type: "array" },
        policySummary: { type: "object" },
        parseHash: { type: "string", minLength: 64, maxLength: 64 }
      },
      owner: "IDE-170",
      source: "Architecture Decision 011 v1.1.0"
    });
    return [{ schemaId: "IDE-170-SCHEMA-PARSED-TEST-PROCEDURE", registered: result.ok === true, code: result.code }];
  }

  function registerCapability() {
    if (namespace.getCapability && namespace.getCapability(CAPABILITY_ID)) {
      return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: namespace.getCapability(CAPABILITY_ID) });
    }
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID,
      name: "Deterministic Test Procedure Parser",
      version: VERSION,
      type: "Validation",
      status: "Active",
      owner: "IDE-170",
      dependencies: [
        { capabilityId: "IDE-170-TEST-PROCEDURE-INTAKE", minimumVersion: VERSION, optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-PARSED-TEST-PROCEDURE"],
      provides: ["Heading Parser", "Code Parser", "Expected Result Parser", "Execution Policy Classification", "Parser Warning"],
      source: "Architecture Decision 011 v1.1.0"
    });
  }

  function initializeTestProcedureParser() {
    const schemaResults = registerSchemas();
    const capabilityResult = registerCapability();
    const ready = schemaResults.every(function item(result) { return result.registered; }) && capabilityResult.ok === true;
    return internal.buildResult(ready,
      ready ? "TEST_PROCEDURE_PARSER_INITIALIZED" : "TEST_PROCEDURE_PARSER_INITIALIZATION_FAILED",
      ready ? "Ready" : "Blocked",
      { schemaResults: schemaResults, capabilityResult: capabilityResult }
    );
  }

  function removeParsedTestProcedureForValidation(parsedProcedureId) {
    const id = internal.canonicalId(parsedProcedureId);
    const removed = state.parsedTestProcedures.delete(id);
    if (state.latestParsedTestProcedureId === id) state.latestParsedTestProcedureId = null;
    return removed;
  }

  Object.assign(internal, {
    testProcedureExecutionPolicies: POLICIES,
    classifyTestProcedureCode: classifyCode,
    parseTestProcedureExpectedLine: parseExpectedLine,
    parseTestProcedureExpectedEntries: parseExpectedEntries,
    removeParsedTestProcedureForValidation: removeParsedTestProcedureForValidation
  });

  Object.assign(namespace.api, {
    initializeTestProcedureParser: initializeTestProcedureParser,
    parseTestProcedure: parseTestProcedure,
    getParsedTestProcedure: getParsedTestProcedure,
    listParsedTestProcedures: listParsedTestProcedures
  });
  Object.assign(namespace, {
    parseTestProcedure: parseTestProcedure,
    getParsedTestProcedure: getParsedTestProcedure,
    listParsedTestProcedures: listParsedTestProcedures
  });

  namespace.modules.testProcedureParser = {
    id: CAPABILITY_ID,
    version: VERSION,
    status: "Ready",
    deterministic: true,
    recognizedLanguages: ["ja", "en"],
    executionPolicies: POLICIES.slice(),
    missingInformationInferenceAllowed: false,
    loadedAt: internal.nowIso()
  };

  global.parseIntelligenceTestProcedure = parseTestProcedure;
})(typeof window !== "undefined" ? window : globalThis);
