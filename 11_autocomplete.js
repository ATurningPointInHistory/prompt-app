/* ===============================
   FILE: 11_autocomplete.js
   Autocomplete
   IDE-070
=============================== */

const IDE_AUTOCOMPLETE_STORAGE_KEY =
  "ideAutocompleteSettings";

let ideAutocompleteSettings =
  loadJson(
    IDE_AUTOCOMPLETE_STORAGE_KEY,
    {
      enabled: true,
      maxCandidates: 20,
      includeMetadata: true,
      includeFunctions: true,
      includeVariables: true
    }
  );

const IDE_AUTOCOMPLETE_METADATA_FIELDS = [
  "ID", "Title", "Summary", "Version", "Layer",
  "Category", "KnowledgeType", "Status", "Priority",
  "Stability", "Authority", "DecisionLevel", "DependsOn",
  "Provides", "Input", "Output", "Tags", "Keywords",
  "Relationships", "Workflow", "Rules", "Owner", "Created",
  "Updated"
];

function normalizeAutocompleteSettings(settings) {
  const source = settings && typeof settings === "object"
    ? settings
    : {};

  return {
    enabled: source.enabled !== false,
    maxCandidates: Math.max(
      1,
      Math.min(50, Number(source.maxCandidates) || 20)
    ),
    includeMetadata: source.includeMetadata !== false,
    includeFunctions: source.includeFunctions !== false,
    includeVariables: source.includeVariables !== false
  };
}

function getAutocompleteSettings() {
  return {
    ...normalizeAutocompleteSettings(ideAutocompleteSettings)
  };
}

function updateAutocompleteSettings(patch = {}) {
  ideAutocompleteSettings = normalizeAutocompleteSettings({
    ...ideAutocompleteSettings,
    ...patch
  });

  localStorage.setItem(
    IDE_AUTOCOMPLETE_STORAGE_KEY,
    JSON.stringify(ideAutocompleteSettings)
  );

  if (!ideAutocompleteSettings.enabled) {
    clearAutocompleteSuggestions();
  } else {
    refreshAutocompleteSuggestions();
  }

  return getAutocompleteSettings();
}

function setAutocompleteEnabled(enabled) {
  return updateAutocompleteSettings({
    enabled: enabled !== false
  });
}

function isAutocompleteEnabled() {
  return getAutocompleteSettings().enabled;
}

function getAutocompleteContext(inputId = "devConsoleInput") {
  const input = get(inputId);

  if (!input) {
    return {
      inputId,
      value: "",
      cursor: 0,
      word: "",
      line: "",
      mode: "unknown"
    };
  }

  const value = String(input.value || "");
  const cursor = Number.isFinite(input.selectionStart)
    ? input.selectionStart
    : value.length;
  const before = value.slice(0, cursor);
  const line = before.split("\n").pop() || "";
  const wordMatch = before.match(/([a-zA-Z_$][\w$-]*)$/);
  const metadataMatch = line.match(/^\s*([A-Za-z][A-Za-z0-9]*)?$/);

  return {
    inputId,
    value,
    cursor,
    word: wordMatch ? wordMatch[1] : "",
    line,
    mode: metadataMatch && inputId !== "devConsoleInput"
      ? "metadata"
      : "code"
  };
}

function calculateAutocompleteCandidateScore(label, keyword, priority = 0) {
  const text = String(label || "").toLowerCase();
  const word = String(keyword || "").toLowerCase();

  if (!word) {
    return priority;
  }

  if (text === word) {
    return 1000 + priority;
  }

  if (text.startsWith(word)) {
    return 700 - text.length + priority;
  }

  const index = text.indexOf(word);
  if (index >= 0) {
    return 400 - index - text.length + priority;
  }

  return -1;
}

function getMetadataAutocompleteCandidates(keyword) {
  if (!getAutocompleteSettings().includeMetadata) {
    return [];
  }

  return IDE_AUTOCOMPLETE_METADATA_FIELDS
    .map(name => ({
      type: "metadata",
      name,
      label: `${name}:`,
      insert: `${name}: `,
      summary: "Official Metadata field",
      score: calculateAutocompleteCandidateScore(name, keyword, 100)
    }))
    .filter(item => item.score >= 0);
}

function getRepositoryAutocompleteCandidates(keyword) {
  const records = [];
  const databases = [
    window.architectureDatabase && window.architectureDatabase.objects,
    window.repositoryDatabase && window.repositoryDatabase.objects
  ];

  databases.forEach(database => {
    if (!database || typeof database !== "object") {
      return;
    }

    Object.keys(database).forEach(id => {
      const score = calculateAutocompleteCandidateScore(id, keyword, 150);
      if (score < 0) {
        return;
      }

      const record = database[id] || {};
      records.push({
        type: "repository",
        name: id,
        label: id,
        insert: id,
        summary: record.title || record.name || "Repository object",
        score
      });
    });
  });

  return records;
}

function deduplicateAutocompleteCandidates(candidates) {
  const map = new Map();

  candidates.forEach(item => {
    if (!item || !item.insert) {
      return;
    }

    const key = `${item.type || "item"}:${item.insert}`;
    const current = map.get(key);

    if (!current || Number(item.score || 0) > Number(current.score || 0)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}

function getAutocompleteCandidates(contextOrKeyword) {
  const settings = getAutocompleteSettings();

  if (!settings.enabled) {
    return [];
  }

  const context = typeof contextOrKeyword === "object"
    ? contextOrKeyword
    : {
        ...getAutocompleteContext(),
        word: String(contextOrKeyword || "")
      };

  const keyword = String(context.word || "");
  if (!keyword) {
    return [];
  }

  let candidates = [];

  if (
    context.mode === "code" &&
    typeof getDevConsoleAutocompleteCandidates === "function"
  ) {
    candidates = candidates.concat(
      getDevConsoleAutocompleteCandidates(keyword)
        .filter(item => {
          if (item.type === "function") {
            return settings.includeFunctions;
          }
          if (item.type === "variable") {
            return settings.includeVariables;
          }
          return true;
        })
    );
  }

  candidates = candidates
    .concat(getMetadataAutocompleteCandidates(keyword))
    .concat(getRepositoryAutocompleteCandidates(keyword));

  return deduplicateAutocompleteCandidates(candidates)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .slice(0, settings.maxCandidates);
}

function clearAutocompleteSuggestions() {
  const box = get("devConsoleSuggestion");
  if (box) {
    box.innerHTML = "";
  }
  window.devConsoleAutocompleteCandidates = [];
  return true;
}

function refreshAutocompleteSuggestions() {
  if (!isAutocompleteEnabled()) {
    return clearAutocompleteSuggestions();
  }

  if (typeof updateDevConsoleSuggestions === "function") {
    updateDevConsoleSuggestions();
    return true;
  }

  return false;
}

function registerAutocompleteToCommandPalette() {
  if (typeof registerCommandPaletteCommand !== "function") {
    return false;
  }

  registerCommandPaletteCommand({
    id: "ide.autocomplete.toggle",
    type: "command",
    title: "Toggle Autocomplete",
    summary: "Autocompleteの有効・無効を切り替えます。",
    category: "IDE",
    keywords: ["autocomplete", "completion", "suggest", "IDE-070"],
    icon: "✍",
    action() {
      const next = !isAutocompleteEnabled();
      setAutocompleteEnabled(next);
      return next;
    }
  });

  return true;
}

function validateAutocomplete() {
  const settings = getAutocompleteSettings();
  const checks = {
    settings: Boolean(settings && Number.isFinite(settings.maxCandidates)),
    contextAnalyzer: typeof getAutocompleteContext === "function",
    candidateProvider: typeof getAutocompleteCandidates === "function",
    ranking: typeof calculateAutocompleteCandidateScore === "function",
    deduplicate: typeof deduplicateAutocompleteCandidates === "function",
    consoleIntegration: typeof updateDevConsoleSuggestions === "function",
    applyCompletion: typeof applyDevConsoleAutocomplete === "function",
    commandPalette: typeof registerAutocompleteToCommandPalette === "function"
  };

  const failed = Object.keys(checks).filter(key => checks[key] !== true);

  return {
    id: "IDE-070",
    title: "Autocomplete",
    valid: failed.length === 0,
    passed: Object.keys(checks).length - failed.length,
    total: Object.keys(checks).length,
    failed,
    checks,
    enabled: settings.enabled,
    maxCandidates: settings.maxCandidates
  };
}

function getAutocompleteStatus() {
  const validation = validateAutocomplete();
  const rate = Math.round(validation.passed / validation.total * 100);

  return {
    id: "IDE-070",
    title: "Autocomplete",
    version: "1.0",
    status: validation.valid ? "Ready" : "Error",
    ready: validation.valid,
    progress: rate,
    health: rate,
    enabled: validation.enabled,
    maxCandidates: validation.maxCandidates,
    nextTask: validation.valid ? "IDE-080 Virtual Keyboard" : "Fix Autocomplete validation",
    updatedAt: Date.now()
  };
}

function initAutocomplete() {
  ideAutocompleteSettings = normalizeAutocompleteSettings(ideAutocompleteSettings);
  registerAutocompleteToCommandPalette();
  return true;
}

window.initAutocomplete = initAutocomplete;
window.getAutocompleteSettings = getAutocompleteSettings;
window.updateAutocompleteSettings = updateAutocompleteSettings;
window.setAutocompleteEnabled = setAutocompleteEnabled;
window.isAutocompleteEnabled = isAutocompleteEnabled;
window.getAutocompleteContext = getAutocompleteContext;
window.getAutocompleteCandidates = getAutocompleteCandidates;
window.getMetadataAutocompleteCandidates = getMetadataAutocompleteCandidates;
window.getRepositoryAutocompleteCandidates = getRepositoryAutocompleteCandidates;
window.refreshAutocompleteSuggestions = refreshAutocompleteSuggestions;
window.clearAutocompleteSuggestions = clearAutocompleteSuggestions;
window.validateAutocomplete = validateAutocomplete;
window.getAutocompleteStatus = getAutocompleteStatus;
window.registerAutocompleteToCommandPalette = registerAutocompleteToCommandPalette;

initAutocomplete();
