/* ===============================
   FILE: 10_macro_favorite.js
   Macro Favorite / Quick Launcher
=============================== */

function buildRepairQuickMacroButtons() {

  if (
    typeof macroList !== "object" ||
    !macroList
  ) {
    return buildMacroFavoriteEmptyButton();
  }

  const names =
    Object.keys(macroList);

  if (!names.length) {
    return buildMacroFavoriteEmptyButton();
  }

  return names.map(name => {

    const macro =
      macroList[name];

    const icon =
      macro.icon ||
      "▶";

    const label =
      macro.label ||
      name;

    return `
<button
  class="macro-quick-btn"
  title="${escapeHtml(name)}"
  onclick='runMacro(${JSON.stringify(name)})'>
  <span class="macro-quick-icon">
    ${escapeHtml(icon)}
  </span>
  <span class="macro-quick-label">
    ${escapeHtml(label)}
  </span>
</button>
`;

  }).join("");

}

function buildMacroFavoriteEmptyButton() {

  return `
<button
  class="macro-quick-btn"
  onclick="showMacroList()">
  <span class="macro-quick-icon">
    ▶
  </span>
  <span class="macro-quick-label">
    Macro
  </span>
</button>
`;

}

function refreshRepairQuickMacroButtons() {

  const box =
    get("repairQuickMacroButtons");

  if (!box) {
    return;
  }

  box.innerHTML =
    buildRepairQuickMacroButtons();

}

function initMacroFavoritePanel() {

  if (
    typeof initRepairSearchQuickPanel ===
    "function"
  ) {
    initRepairSearchQuickPanel();
  }

  refreshRepairQuickMacroButtons();

}

console.log(
  "10_macro_favorite loaded"
);