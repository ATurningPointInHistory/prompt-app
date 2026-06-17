/* ===============================
   FILE: 04_repair_quick_buttons.js
   Repair Quick Favorite Buttons

   目的:
   修復モードでよく使う機能だけを
   左中央のフロートボタンとして表示する。

   仕様:
   - HTML編集エリア内には入れない
   - 画面左中央に固定表示
   - 最大15個まで表示
   - ◀で左に隠す
   - ▶で再表示
   - localStorageに保存
=============================== */

/* ===============================
   Repair Quick Favorite Config
=============================== */

const REPAIR_QUICK_STORAGE_KEY =
  "repairQuickFavoriteButtons";

const REPAIR_QUICK_MAX_COUNT =
  15;

const REPAIR_QUICK_DEFAULTS = [
  {
    title: "💚",
    label: "HTML HEALTH",
    action: "showHtmlHealth"
  },
  {
    title: "🩺",
    label: "診断",
    action: "diagnoseRepairHtml"
  },
  {
    title: "📖",
    label: "読込",
    action: "loadRepairHtml"
  },
  {
    title: "💾",
    label: "保存",
    action: "saveRepairHtml"
  },
  {
    title: "↩",
    label: "Undo",
    action: "undoRepairEdit"
  },
  {
    title: "↪",
    label: "Redo",
    action: "redoRepairEdit"
  }
];

/* ===============================
   Repair Quick Favorite Storage
=============================== */

function getRepairQuickFavoriteButtons() {

  const saved =
    loadJson(
      REPAIR_QUICK_STORAGE_KEY,
      null
    );

  if (
    Array.isArray(saved) &&
    saved.length > 0
  ) {
    return saved.slice(
      0,
      REPAIR_QUICK_MAX_COUNT
    );
  }

  return REPAIR_QUICK_DEFAULTS.slice();
}

function saveRepairQuickFavoriteButtons(
  list
) {

  const safeList =
    Array.isArray(list)
      ? list.slice(
          0,
          REPAIR_QUICK_MAX_COUNT
        )
      : [];

  localStorage.setItem(
    REPAIR_QUICK_STORAGE_KEY,
    JSON.stringify(safeList)
  );
}

/* ===============================
   Repair Quick Favorite Action
=============================== */

function runRepairQuickFavoriteAction(
  action
) {

  const fn =
    window[action];

  if (typeof fn !== "function") {
    alert(
      "関数が見つかりません\n" +
      action
    );
    return;
  }

  fn();
}

function toggleRepairFavoriteButton(
  action,
  title,
  label = ""
) {

  if (!action) {
    return;
  }

  const list =
    getRepairQuickFavoriteButtons();

  const exists =
    list.some(item =>
      item.action === action
    );

  let next;

  if (exists) {

    next =
      list.filter(item =>
        item.action !== action
      );

  } else {

    if (
      list.length >=
      REPAIR_QUICK_MAX_COUNT
    ) {
      alert(
        "クイックボタンは最大" +
        REPAIR_QUICK_MAX_COUNT +
        "個までです"
      );
      return;
    }

    next = [
      ...list,
      {
        title: title || "★",
        label: label || title || action,
        action
      }
    ];
  }

  saveRepairQuickFavoriteButtons(
    next
  );

  renderRepairQuickFavoritePanel();

  if (
    typeof refreshRepairToolsPanel === "function"
  ) {
    refreshRepairToolsPanel();
  }
}

/* ===============================
   Repair Quick Favorite Panel
=============================== */

function buildRepairQuickFavoriteHtml() {

  return `

<button
  id="repairQuickFavoriteToggle"
  class="repair-quick-favorite-toggle"
  onclick="toggleRepairQuickFavoritePanel()">
◀
</button>

<div
  id="repairQuickFavoritePanel"
  class="repair-quick-favorite-panel">

  <div class="repair-quick-favorite-title">
    Quick
  </div>

  <div
    id="repairQuickFavoriteList"
    class="repair-quick-favorite-list">
  </div>

</div>

`;

}

/* ===============================
   Repair Quick Favorite Init
=============================== */

function initRepairQuickFavoritePanel() {

  if (
    get("repairQuickFavoritePanel")
  ) {
    renderRepairQuickFavoritePanel();
    openRepairQuickFavoritePanel();
    return;
  }

  const wrap =
    document.createElement("div");

  wrap.innerHTML =
    buildRepairQuickFavoriteHtml();

  while (
    wrap.firstElementChild
  ) {
    document.body.appendChild(
      wrap.firstElementChild
    );
  }

  renderRepairQuickFavoritePanel();

  updateRepairQuickFavoriteVisibility();

  openRepairQuickFavoritePanel();

}

/* ===============================
   Repair Quick Favorite Open
=============================== */

function openRepairQuickFavoritePanel() {

  const panel =
    get("repairQuickFavoritePanel");

  const toggle =
    get("repairQuickFavoriteToggle");

  if (!panel || !toggle) {
    return;
  }

  panel.classList.remove(
    "closed"
  );

  toggle.classList.remove(
    "closed"
  );

  toggle.textContent =
    "◀";

}

function renderRepairQuickFavoritePanel() {

  const listBox =
    get("repairQuickFavoriteList");

  if (!listBox) {
    return;
  }

  const buttons =
    getRepairQuickFavoriteButtons();

  listBox.innerHTML =
    buttons.map(item => {

      const title =
        escapeHtml(item.title || "★");

      const label =
        escapeHtml(
          item.label || item.action || ""
        );

      const action =
        escapeHtml(item.action || "");

      return `

<button
  class="repair-quick-favorite-btn"
  title="${label}"
  onclick="runRepairQuickFavoriteAction('${action}')">

  <span class="repair-quick-favorite-icon">
    ${title}
  </span>

  <span class="repair-quick-favorite-label">
    ${label}
  </span>

</button>

`;

    }).join("");

  updateRepairQuickFavoriteVisibility();

}

function toggleRepairQuickFavoritePanel() {

  const panel =
    get("repairQuickFavoritePanel");

  const toggle =
    get("repairQuickFavoriteToggle");

  if (!panel || !toggle) {
    return;
  }

  const closed =
    panel.classList.toggle(
      "closed"
    );

  toggle.classList.toggle(
    "closed",
    closed
  );

  toggle.textContent =
    closed
      ? "▶"
      : "◀";
}

function updateRepairQuickFavoriteVisibility() {

  const panel =
    get("repairQuickFavoritePanel");

  const toggle =
    get("repairQuickFavoriteToggle");

  const show =
    typeof isRepairMode === "function" &&
    isRepairMode();

  if (panel) {
    panel.style.display =
      show
        ? "flex"
        : "none";
  }

  if (toggle) {
    toggle.style.display =
      show
        ? "block"
        : "none";
  }
}

/* ===============================
   Repair Quick Favorite Manager
=============================== */

function openRepairQuickFavoriteManager() {

  const list =
    getRepairQuickFavoriteButtons();

  openFloatPanel(
    "⭐ お気に入り管理",
    `

<div class="small">
登録数：${list.length} / ${REPAIR_QUICK_MAX_COUNT}
</div>

<div class="repair-favorite-manager">

${
list.length
? list.map((item, index) => `

<div class="repair-favorite-manager-row">

  <button
    class="repair-favorite-mini"
    onclick="moveRepairFavoriteUp(${index})">
    ↑
  </button>

  <button
    class="repair-favorite-mini"
    onclick="moveRepairFavoriteDown(${index})">
    ↓
  </button>

  <button
    class="repair-favorite-mini delete"
    onclick="deleteRepairFavorite(${index})">
    ✕
  </button>

  <input
    class="repair-favorite-icon-input"
    value="${escapeHtml(item.title || "★")}"
    onchange="renameRepairFavoriteIcon(${index}, this.value)">

  <input
    class="repair-favorite-name-input"
    value="${escapeHtml(item.label || item.action)}"
    onchange="renameRepairFavoriteLabel(${index}, this.value)">

</div>

`).join("")
: "お気に入りなし"
}

</div>

<div class="float-panel-actions">

<button onclick="resetRepairFavoriteButtons()">
初期化
</button>

<button onclick="saveRepairFavoriteManager()">
💾保存
</button>

<button onclick="exportRepairFavoriteSettings()">
Export
</button>

<button onclick="importRepairFavoriteSettings()">
Import
</button>

<button onclick="closeFloatPanel()">
✕閉じる
</button>

</div>

`
  );
}

function renameRepairFavoriteIcon(
  index,
  value
) {

  const list =
    getRepairQuickFavoriteButtons();

  if (!list[index]) return;

  list[index].title =
    value.trim() || "★";

  saveRepairQuickFavoriteButtons(list);
  renderRepairQuickFavoritePanel();
  openRepairQuickFavoriteManager();
}

function renameRepairFavoriteLabel(
  index,
  value
) {

  const list =
    getRepairQuickFavoriteButtons();

  if (!list[index]) return;

  list[index].label =
    value.trim() || list[index].action;

  saveRepairQuickFavoriteButtons(list);
  renderRepairQuickFavoritePanel();
  openRepairQuickFavoriteManager();
}

/* ===============================
   Repair Favorite Manager Actions
=============================== */

function moveRepairFavoriteUp(
  index
) {

  if (index <= 0) {
    return;
  }

  const list =
    getRepairQuickFavoriteButtons();

  [
    list[index - 1],
    list[index]
  ] = [
    list[index],
    list[index - 1]
  ];

  saveRepairQuickFavoriteButtons(
    list
  );

  renderRepairQuickFavoritePanel();
  openRepairQuickFavoriteManager();

}

function moveRepairFavoriteDown(
  index
) {

  const list =
    getRepairQuickFavoriteButtons();

  if (
    index >=
    list.length - 1
  ) {
    return;
  }

  [
    list[index],
    list[index + 1]
  ] = [
    list[index + 1],
    list[index]
  ];

  saveRepairQuickFavoriteButtons(
    list
  );

  renderRepairQuickFavoritePanel();
  openRepairQuickFavoriteManager();

}

function deleteRepairFavorite(
  index
) {

  const list =
    getRepairQuickFavoriteButtons();

  list.splice(
    index,
    1
  );

  saveRepairQuickFavoriteButtons(
    list
  );

  renderRepairQuickFavoritePanel();
  openRepairQuickFavoriteManager();

}

function resetRepairFavoriteButtons() {

  if (
    !confirm(
      "お気に入りを初期状態へ戻しますか？"
    )
  ) {
    return;
  }

  saveRepairQuickFavoriteButtons(
    REPAIR_QUICK_DEFAULTS
  );

  renderRepairQuickFavoritePanel();
  openRepairQuickFavoriteManager();

}

/* ===============================
   Repair Favorite Save
=============================== */

function saveRepairFavoriteManager() {

  const list =
    getRepairQuickFavoriteButtons();

  saveRepairQuickFavoriteButtons(
    list
  );

  renderRepairQuickFavoritePanel();

  if (
    typeof refreshRepairToolsPanel ===
    "function"
  ) {
    refreshRepairToolsPanel();
  }

  openRepairQuickFavoriteManager();

  updateRepairStatus(
    "お気に入り保存"
  );

}

/* ===============================
   Repair Favorite Export / Import
=============================== */

function exportRepairFavoriteSettings() {

  const data = {
    type: "repairQuickFavoriteButtons",
    version: "1.0",
    exportedAt: new Date().toISOString(),
    buttons: getRepairQuickFavoriteButtons()
  };

  const text =
    JSON.stringify(data, null, 2);

  const blob =
    new Blob(
      [text],
      { type: "application/json" }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "repair_favorites_" +
    new Date().toISOString().slice(0, 10) +
    ".json";

  a.click();

  URL.revokeObjectURL(a.href);
}

function importRepairFavoriteSettings() {

  const input =
    document.createElement("input");

  input.type = "file";
  input.accept = ".json,application/json";

  input.onchange = (event) => {

    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {

      try {

        const data =
          JSON.parse(reader.result);

        const buttons =
          Array.isArray(data)
            ? data
            : data.buttons;

        if (!Array.isArray(buttons)) {
          alert("お気に入り設定ではありません");
          return;
        }

        saveRepairQuickFavoriteButtons(
          buttons.slice(0, REPAIR_QUICK_MAX_COUNT)
        );

        renderRepairQuickFavoritePanel();

        if (
          typeof refreshRepairToolsPanel === "function"
        ) {
          refreshRepairToolsPanel();
        }

        openRepairQuickFavoriteManager();

        updateRepairStatus(
          "お気に入り設定を読み込みました"
        );

      } catch (e) {

        alert(
          "読み込みに失敗しました\n" +
          e.message
        );
      }
    };

    reader.readAsText(file);
  };

  input.click();
}

/* ===============================
   Repair Quick Favorite Expose
=============================== */

window.initRepairQuickFavoritePanel =
  initRepairQuickFavoritePanel;

window.renderRepairQuickFavoritePanel =
  renderRepairQuickFavoritePanel;

window.toggleRepairQuickFavoritePanel =
  toggleRepairQuickFavoritePanel;

window.toggleRepairFavoriteButton =
  toggleRepairFavoriteButton;

window.runRepairQuickFavoriteAction =
  runRepairQuickFavoriteAction;

window.openRepairQuickFavoritePanel =
  openRepairQuickFavoritePanel;

window.updateRepairQuickFavoriteVisibility =
  updateRepairQuickFavoriteVisibility;

window.openRepairQuickFavoriteManager =
  openRepairQuickFavoriteManager;

window.moveRepairFavoriteUp =
  moveRepairFavoriteUp;

window.moveRepairFavoriteDown =
  moveRepairFavoriteDown;

window.deleteRepairFavorite =
  deleteRepairFavorite;

window.resetRepairFavoriteButtons =
  resetRepairFavoriteButtons;

window.renameRepairFavoriteIcon =
  renameRepairFavoriteIcon;

window.renameRepairFavoriteLabel =
  renameRepairFavoriteLabel;

window.saveRepairFavoriteManager =
  saveRepairFavoriteManager;

window.exportRepairFavoriteSettings =
  exportRepairFavoriteSettings;

window.importRepairFavoriteSettings =
  importRepairFavoriteSettings;

/* ===============================
   Repair Quick Favorite Auto Init
=============================== */

document.addEventListener("DOMContentLoaded", () => {

  setTimeout(() => {

    if (
      typeof initRepairQuickFavoritePanel ===
      "function"
    ) {
      initRepairQuickFavoritePanel();
    }

  }, 500);

});