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

    saveRepairQuickFavoriteButtons(
      next
    );

    alert(
      "クイックから削除しました"
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
        title:
          title || "★",
        label:
          label || title || action,
        action
      }
    ];

    saveRepairQuickFavoriteButtons(
      next
    );

    alert(
      "クイックに追加しました"
    );
  }

  renderRepairQuickFavoritePanel();
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

  const old =
    get("repairQuickFavoritePanel");

  const wasClosed =
    old &&
    old.classList.contains("closed");

  if (old) {
    old.remove();
  }

  const wrap =
    document.createElement("div");

  wrap.innerHTML =
    buildRepairQuickFavoriteHtml();

  const panel =
    wrap.firstElementChild;

  if (!panel) {
    return;
  }

  if (wasClosed) {
    panel.classList.add("closed");

    const toggle =
      panel.querySelector(
        "#repairQuickFavoriteToggle"
      );

    if (toggle) {
      toggle.textContent = "▶";
    }
  }

  document.body.appendChild(
    panel
  );

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