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

  box.innerHTML =
    suggestions
      .map(word => `
<div
  class="function-item"
  onclick="selectRepairSearchSuggestion('${escapeJsString(word)}')">
  🔍 ${escapeHtml(word)}
</div>
`)
      .join("");

}

function collectRepairSearchSuggestions() {

  const words = [];

  if (
    Array.isArray(repairSearchHistory)
  ) {
    repairSearchHistory.forEach(item => {
      if (item.keyword) {
        words.push(item.keyword);
      }
    });
  }

  const editor =
    get("repairEditor");

  if (editor && editor.value) {
    words.push(
      ...(
        editor.value.match(
          /[a-zA-Z_$][\w$]{2,}/g
        ) || []
      )
    );
  }

  if (
    typeof projectFunctionDatabase ===
    "object" &&
    projectFunctionDatabase
  ) {
    words.push(
      ...Object.keys(
        projectFunctionDatabase
      )
    );
  }

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
  ];

}

function selectRepairSearchSuggestion(word) {

  const input =
    get("repairSearch");

  if (!input) {
    return;
  }

  input.value =
    word;

  input.focus();

  searchRepairText();

}