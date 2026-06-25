/* ===============================
   FILE: 10_macro_favorite.js
   Macro Favorite / Quick Launcher
=============================== */

function normalizeMacroItem(name) {

  const item =
    macroList[name];

  if (Array.isArray(item)) {
    return {
      name,
      label: name,
      icon: "▶",
      favorite: true,
      order: 999,
      category: "",
      actions: item
    };
  }

  return {
    name,
    label: item.label || name,
    icon: item.icon || "▶",
    favorite: item.favorite !== false,
    order:
      typeof item.order === "number"
        ? item.order
        : 999,
    category: item.category || "",
    actions: Array.isArray(item.actions)
      ? item.actions
      : []
  };

}

function saveNormalizedMacroItem(name, data) {

  macroList[name] = {
    name,
    label: data.label || name,
    icon: data.icon || "▶",
    favorite: data.favorite !== false,
    order:
      typeof data.order === "number"
        ? data.order
        : 999,
    category: data.category || "",
    actions: data.actions || []
  };

  localStorage.setItem(
    "macroList",
    JSON.stringify(macroList)
  );

}

function getFavoriteMacroNames() {

  if (
    typeof macroList !== "object" ||
    !macroList
  ) {
    return [];
  }

  return Object.keys(macroList)
    .map(name => normalizeMacroItem(name))
    .filter(item => item.favorite)
    .sort((a, b) =>
      a.order - b.order ||
      a.name.localeCompare(b.name)
    )
    .map(item => item.name);

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

function toggleMacroFavorite(name) {

  if (!macroList[name]) {
    alert("Macroなし");
    return;
  }

  const item =
    normalizeMacroItem(name);

  item.favorite =
    !item.favorite;

  saveNormalizedMacroItem(
    name,
    item
  );

  refreshRepairQuickMacroButtons();

  if (typeof showMacroList === "function") {
    showMacroList();
  }

}

function editMacroIcon(name) {

  if (!macroList[name]) {
    return;
  }

  const item =
    normalizeMacroItem(name);

  const icon =
    prompt(
      "アイコン",
      item.icon || "▶"
    );

  if (icon === null) {
    return;
  }

  item.icon =
    icon || "▶";

  saveNormalizedMacroItem(
    name,
    item
  );

  refreshRepairQuickMacroButtons();

  if (typeof showMacroList === "function") {
    showMacroList();
  }

}

function editMacroLabel(name) {

  if (!macroList[name]) {
    return;
  }

  const item =
    normalizeMacroItem(name);

  const label =
    prompt(
      "表示名",
      item.label || name
    );

  if (label === null) {
    return;
  }

  item.label =
    label || name;

  saveNormalizedMacroItem(
    name,
    item
  );

  refreshRepairQuickMacroButtons();

  if (typeof showMacroList === "function") {
    showMacroList();
  }

}

function moveMacroFavoriteOrder(name, direction) {

  if (!macroList[name]) {
    return;
  }

  const names =
    getFavoriteMacroNames();

  const index =
    names.indexOf(name);

  if (index < 0) {
    return;
  }

  const nextIndex =
    index + direction;

  if (
    nextIndex < 0 ||
    nextIndex >= names.length
  ) {
    return;
  }

  [
    names[index],
    names[nextIndex]
  ] = [
    names[nextIndex],
    names[index]
  ];

  names.forEach((macroName, order) => {

    const item =
      normalizeMacroItem(macroName);

    item.order =
      order;

    saveNormalizedMacroItem(
      macroName,
      item
    );

  });

  refreshRepairQuickMacroButtons();

  if (typeof showMacroList === "function") {
    showMacroList();
  }

}

function openMacroFavoriteMenu(name) {

  const item =
    normalizeMacroItem(name);

  openFloatPanel(
    "Macro Menu : " + name,
    `
<div class="macro-favorite-menu">

<button
  class="float-list-btn"
  onclick='runMacro(${JSON.stringify(name)})'>
  ▶ 実行
</button>

<button
  class="float-list-btn"
  onclick='editMacroLabel(${JSON.stringify(name)})'>
  ✏ 表示名変更
</button>

<button
  class="float-list-btn"
  onclick='editMacroIcon(${JSON.stringify(name)})'>
  😀 アイコン変更
</button>

<button
  class="float-list-btn"
  onclick='toggleMacroFavorite(${JSON.stringify(name)})'>
  ${item.favorite ? "⭐ 非表示" : "☆ 表示"}
</button>

<button
  class="float-list-btn"
  onclick='moveMacroFavoriteOrder(${JSON.stringify(name)}, -1)'>
  ⬆ 上へ
</button>

<button
  class="float-list-btn"
  onclick='moveMacroFavoriteOrder(${JSON.stringify(name)}, 1)'>
  ⬇ 下へ
</button>

<button
  class="float-list-btn"
  onclick='showMacroStepEditor(${JSON.stringify(name)})'>
  🧩 Step編集
</button>

<button
  class="float-list-btn"
  onclick='deleteMacro(${JSON.stringify(name)})'>
  🗑 削除
</button>

</div>
`
  );

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

function showMacroOrderEditor() {

  const names =
    getFavoriteMacroNames();

  if (!names.length) {
    alert("表示中のMacroなし");
    return;
  }

  openFloatPanel(
    "Macro 並び替え",
    `
<div class="macro-list">
${
  names.map(name => {

    const item =
      normalizeMacroItem(name);

    return `
<div class="macro-row">

<button
  class="macro-mini-btn"
  onclick='moveMacroFavoriteOrder(${JSON.stringify(name)}, -1)'>
  ⬆
</button>

<button
  class="macro-mini-btn"
  onclick='moveMacroFavoriteOrder(${JSON.stringify(name)}, 1)'>
  ⬇
</button>

<span class="macro-name">
  ${escapeHtml(item.icon)}
  ${escapeHtml(item.label || name)}
</span>

</div>
`;

  }).join("")
}
</div>
`
  );

}

window.buildRepairQuickMacroButtons =
  buildRepairQuickMacroButtons;

window.refreshRepairQuickMacroButtons =
  refreshRepairQuickMacroButtons;

window.toggleMacroFavorite =
  toggleMacroFavorite;

window.editMacroIcon =
  editMacroIcon;

window.editMacroLabel =
  editMacroLabel;

window.moveMacroFavoriteOrder =
  moveMacroFavoriteOrder;

window.openMacroFavoriteMenu =
  openMacroFavoriteMenu;

window.initMacroFavoritePanel =
  initMacroFavoritePanel;

console.log(
  "10_macro_favorite loaded"
);