/* ===============================
   FILE: 11_mobile_console_autocomplete.js
   Dev Console Autocomplete
=============================== */

function getDevConsoleAutocompleteWord() {

  const input =
    get("devConsoleInput");

  if (!input) {
    return "";
  }

  const text =
    input.value || "";

  const pos =
    typeof input.selectionStart === "number"
      ? input.selectionStart
      : text.length;

  const before =
    text.slice(0, pos);

  const match =
    before.match(
      /([a-zA-Z_$][\w$]*)$/
    );

  if (match) {
    return match[1];
  }

  const fallback =
    text.match(
      /([a-zA-Z_$][\w$]*)$/
    );

  return fallback
    ? fallback[1]
    : "";

}

function getDevConsoleAutocompleteCandidates(
  keyword
) {

  const word =
    String(keyword || "")
      .toLowerCase();

  if (!word) {
    return [];
  }

  const results = [];

  if (
    typeof getAllFunctionNames ===
    "function"
  ) {

    getAllFunctionNames()
      .forEach(name => {

        if (
          name
            .toLowerCase()
            .includes(word)
        ) {

          const info =
            typeof getFunctionInfoFromDatabase ===
            "function"
              ? getFunctionInfoFromDatabase(name)
              : null;

          results.push({
            type: "function",
            name,
            label:
              name + "()",
            insert:
              name + "()",
            fileName:
              info && info.fileName
                ? info.fileName
                : "",
            line:
              info && info.line
                ? info.line
                : 0
          });

        }

      });

  }

  [
    "projectFunctionDatabase",
    "repairSearchFileStore",
    "repairGlobalSearchResults",
    "repairSearchMatches",
    "currentProjectAnalyzeMode",
    "currentRepairFile",
    "devConsoleResult"
  ].forEach(name => {

    if (
      name
        .toLowerCase()
        .includes(word)
    ) {

      results.push({
        type: "variable",
        name,
        label: name,
        insert: name,
        fileName: "",
        line: 0
      });

    }

  });

  return results
    .slice(0, 20);

}

function updateDevConsoleSuggestions() {

  const box =
    get("devConsoleSuggestion");

  if (!box) {
    return;
  }

  const keyword =
    getDevConsoleAutocompleteWord();

  if (!keyword) {
    box.innerHTML = "";
    return;
  }

  const candidates =
    getDevConsoleAutocompleteCandidates(
      keyword
    );

  if (!candidates.length) {
    box.innerHTML = "";
    return;
  }

  box.innerHTML =
    candidates
      .map((item, index) => {

        const icon =
          item.type === "function"
            ? "📄"
            : "📦";

        const sub =
          item.fileName
            ? `<div class="small">${escapeHtml(item.fileName)} / L${item.line}</div>`
            : "";

        return `
<div
  class="function-item"
  onclick="applyDevConsoleAutocomplete(${index})"
  oncontextmenu="jumpDevConsoleAutocomplete(${index}); return false;">
  ${icon} ${highlightDevConsoleAutocomplete(
    item.label,
    keyword
  )}
  ${sub}
</div>
`;

      })
      .join("");

  window.devConsoleAutocompleteCandidates =
    candidates;

}

function highlightDevConsoleAutocomplete(
  text,
  keyword
) {

  const safeText =
    escapeHtml(text || "");

  const safeKeyword =
    escapeRegExp(
      escapeHtml(keyword || "")
    );

  if (!safeKeyword) {
    return safeText;
  }

  return safeText.replace(
    new RegExp(
      safeKeyword,
      "ig"
    ),
    match => `<mark>${match}</mark>`
  );

}

function applyDevConsoleAutocomplete(
  index
) {

  const item =
    window.devConsoleAutocompleteCandidates
      ? window.devConsoleAutocompleteCandidates[index]
      : null;

  const input =
    get("devConsoleInput");

  if (!item || !input) {
    return;
  }

  const pos =
    input.selectionStart || 0;

  const before =
    input.value.slice(0, pos);

  const after =
    input.value.slice(pos);

  const newBefore =
    before.replace(
      /[a-zA-Z_$][\w$]*$/,
      item.insert
    );

  input.value =
    newBefore + after;

  const newPos =
    newBefore.length;

  input.focus();

  input.selectionStart =
    newPos;

  input.selectionEnd =
    newPos;

  localStorage.setItem(
    "devConsoleLastInput",
    input.value
  );

  updateDevConsoleSuggestions();

}

function jumpDevConsoleAutocomplete(
  index
) {

  const item =
    window.devConsoleAutocompleteCandidates
      ? window.devConsoleAutocompleteCandidates[index]
      : null;

  if (
    !item ||
    item.type !== "function" ||
    !item.name
  ) {
    return;
  }

  if (
    typeof jumpToFunction ===
    "function"
  ) {
    jumpToFunction(
      item.name
    );
  }

}

window.getDevConsoleAutocompleteWord =
  getDevConsoleAutocompleteWord;

window.getDevConsoleAutocompleteCandidates =
  getDevConsoleAutocompleteCandidates;

window.updateDevConsoleSuggestions =
  updateDevConsoleSuggestions;

window.applyDevConsoleAutocomplete =
  applyDevConsoleAutocomplete;

window.jumpDevConsoleAutocomplete =
  jumpDevConsoleAutocomplete;