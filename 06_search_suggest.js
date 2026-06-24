/* ===============================
   FILE: 06_search_suggest.js
   Search Suggest
=============================== */

function updateRepairSearchSuggestions() {

  const input =
    get("repairSearch");

  const box =
    get("repairSearchSuggestBox");

  if (!input || !box) {
    return;
  }

  const keyword =
    input.value.trim().toLowerCase();

  if (!keyword) {
    box.innerHTML = "";
    box.style.display = "none";
    return;
  }

  const suggestions =
    collectRepairSearchSuggestions()
      .filter(word =>
        word
          .toLowerCase()
          .includes(keyword)
      )
      .slice(0, 10);

  if (!suggestions.length) {
    box.innerHTML = "";
    box.style.display = "none";
    return;
  }

  box.style.display =
    "block";

  box.innerHTML =
    suggestions
      .map(word => `
<div
  class="function-item"

  onclick="selectRepairSearchSuggestion('${
    typeof escapeJs === "function"
      ? escapeJs(word)
      : String(word || "")
          .replace(/\\/g, "\\\\")
          .replace(/'/g, "\\'")
          .replace(/\r?\n/g, "\\n")
  }')"

  🔍 ${escapeHtml(word)}
</div>
`)
      .join("");

}

function collectRepairSearchSuggestions() {

  const words = [];

  collectRepairSearchHistorySuggestions(
    words
  );

  collectRepairSearchSourceSuggestions(
    words
  );

  collectRepairSearchDatabaseSuggestions(
    words
  );

  return normalizeRepairSearchSuggestions(
    words
  );

}

function collectRepairSearchHistorySuggestions(
  words
) {

  if (
    !Array.isArray(
      repairSearchHistory
    )
  ) {
    return;
  }

  repairSearchHistory.forEach(item => {

    if (item && item.keyword) {
      words.push(
        item.keyword
      );
    }

  });

}

function collectRepairSearchSourceSuggestions(
  words
) {

  let sources = [];

  if (
    typeof getProjectAnalyzeSources ===
    "function"
  ) {

    sources =
      getProjectAnalyzeSources(
        typeof getCurrentProjectAnalyzeMode === "function"
          ? getCurrentProjectAnalyzeMode()
          : "editor"
      );

  } else {

    const editor =
      get("repairEditor");

    if (editor && editor.value) {
      sources = [
        {
          fileName:
            currentRepairFile ||
            "Repair Editor",
          code:
            editor.value
        }
      ];
    }

  }

  sources.forEach(source => {

    const code =
      source.code ||
      source.text ||
      "";

    words.push(
      ...extractRepairSearchWordsFromText(
        code
      )
    );

  });

}

function collectRepairSearchDatabaseSuggestions(
  words
) {

  if (
    typeof projectFunctionDatabase !== "object" ||
    !projectFunctionDatabase
  ) {
    return;
  }

  words.push(
    ...Object.keys(
      projectFunctionDatabase
    )
  );

}

function extractRepairSearchWordsFromText(
  text
) {

  return String(text || "")
    .match(/[a-zA-Z_$][\w$]{2,}/g) ||
    [];

}

function normalizeRepairSearchSuggestions(
  words
) {

  return [
    ...new Set(
      words
        .map(word =>
          String(word || "").trim()
        )
        .filter(word =>
          word.length >= 2
        )
    )
  ]
    .sort();

}

function selectRepairSearchSuggestion(
  word
) {

  const input =
    get("repairSearch");

  if (!input) {
    return;
  }

  input.value =
    word;

  input.focus();

  const box =
    get("repairSearchSuggestBox");

  if (box) {
    box.innerHTML = "";
    box.style.display = "none";
  }

  searchRepairText();

}