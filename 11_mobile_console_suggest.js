/* ===============================
   FILE: 11_mobile_console_suggest.js
   Mobile Console Suggest / History / Favorite
=============================== */

let devConsoleHistory =
  loadJson(
    "devConsoleHistory",
    []
  );

let devConsoleFavorites =
  loadJson(
    "devConsoleFavorites",
    []
  );

const DEV_CONSOLE_HISTORY_ENTRY_LIMIT =
  12000;

const DEV_CONSOLE_HISTORY_TOTAL_LIMIT =
  60000;

function buildPersistableDevConsoleHistory() {

  const result = [];
  let total = 0;

  for (const item of devConsoleHistory) {

    const value =
      String(item || "");

    if (
      !value ||
      value.length >
        DEV_CONSOLE_HISTORY_ENTRY_LIMIT
    ) {
      continue;
    }

    if (
      total + value.length >
      DEV_CONSOLE_HISTORY_TOTAL_LIMIT
    ) {
      break;
    }

    result.push(value);
    total += value.length;

    if (result.length >= 20) {
      break;
    }

  }

  return result;

}

function persistDevConsoleHistory() {

  const persistable =
    buildPersistableDevConsoleHistory();

  try {

    localStorage.setItem(
      "devConsoleHistory",
      JSON.stringify(
        persistable
      )
    );

    return {
      saved: true,
      count: persistable.length
    };

  } catch (error) {

    if (
      typeof recordDevConsoleStorageWarning ===
      "function"
    ) {

      return recordDevConsoleStorageWarning(
        "実行履歴",
        error
      );

    }

    return {
      saved: false,
      reason:
        String(error && error.message || error)
    };

  }

}

function saveDevConsoleHistory(
  code
) {

  if (!code) {
    return;
  }

  devConsoleHistory =
    devConsoleHistory.filter(item =>
      item !== code
    );

  devConsoleHistory.unshift(
    code
  );

  if (devConsoleHistory.length > 30) {
    devConsoleHistory.length = 30;
  }

  return persistDevConsoleHistory();

}

function showDevConsoleHistory() {

  if (!devConsoleHistory.length) {
    alert("履歴なし");
    return;
  }

  openFloatPanel(
    "Dev Console History",
    devConsoleHistory
      .map((code, index) => `
<div class="function-item">
  <button onclick="runDevConsoleHistory(${index})">
    ▶
  </button>
  <button onclick="loadDevConsoleHistory(${index})">
    入力
  </button>
  <pre>${escapeHtml(code)}</pre>
</div>
`)
      .join("")
  );

}

function loadDevConsoleHistory(
  index
) {

  const code =
    devConsoleHistory[index];

  if (!code) {
    return;
  }

  showMobileConsole();

  waitDevConsoleReady(() => {

    setDevConsoleInput(
      code
    );

  });

}

function runDevConsoleHistory(
  index
) {

  const code =
    devConsoleHistory[index];

  if (!code) {
    return;
  }

  showMobileConsole();

  waitDevConsoleReady(() => {

    runDevConsoleCode(
      code
    );

  });

}

function saveDevConsoleFavorite() {

  const input =
    get("devConsoleInput");

  const code =
    input
      ? input.value.trim()
      : "";

  if (!code) {
    alert("保存する入力がありません");
    return;
  }

  const name =
    prompt(
      "Favorite名",
      code.slice(0, 20)
    );

  if (!name) {
    return;
  }

  devConsoleFavorites =
    devConsoleFavorites.filter(
      item =>
        item &&
        item.code !== code
    );

  devConsoleFavorites.unshift({
    name,
    code
  });

  if (
    devConsoleFavorites.length > 50
  ) {
    devConsoleFavorites.length = 50;
  }

  let persisted = false;

  try {

    localStorage.setItem(
      "devConsoleFavorites",
      JSON.stringify(
        devConsoleFavorites
      )
    );

    persisted = true;

  } catch (error) {

    if (
      typeof recordDevConsoleStorageWarning ===
      "function"
    ) {

      recordDevConsoleStorageWarning(
        "Favorite",
        error
      );

    }

  }

  alert(
    persisted
      ? "Favorite保存しました"
      : "保存容量不足のためFavoriteを永続保存できませんでした。\n現在の画面では利用できます。"
  );

}

function showDevConsoleFavorites() {

  if (!devConsoleFavorites.length) {
    alert("Favoriteなし");
    return;
  }

  openFloatPanel(
    "Dev Console Favorite",
    devConsoleFavorites
      .map((item, index) => `
<div class="function-item">
  <b>${escapeHtml(item.name)}</b><br>
  <button onclick="runDevConsoleFavorite(${index})">
    ▶
  </button>
  <button onclick="loadDevConsoleFavorite(${index})">
    入力
  </button>
  <button onclick="deleteDevConsoleFavorite(${index})">
    🗑
  </button>
  <pre>${escapeHtml(item.code)}</pre>
</div>
`)
      .join("")
  );

}

function loadDevConsoleFavorite(
  index
) {

  const item =
    devConsoleFavorites[index];

  if (!item) {
    return;
  }

  showMobileConsole();

  waitDevConsoleReady(() => {

    setDevConsoleInput(
      item.code || ""
    );

  });

}

function runDevConsoleFavorite(
  index
) {

  const item =
    devConsoleFavorites[index];

  if (!item) {
    return;
  }

  showMobileConsole();

  waitDevConsoleReady(() => {

    runDevConsoleCode(
      item.code || ""
    );

  });

}

function deleteDevConsoleFavorite(
  index
) {

  if (
    !confirm("削除しますか？")
  ) {
    return;
  }

  devConsoleFavorites.splice(
    index,
    1
  );

  try {

    localStorage.setItem(
      "devConsoleFavorites",
      JSON.stringify(
        devConsoleFavorites
      )
    );

  } catch (error) {

    if (
      typeof recordDevConsoleStorageWarning ===
      "function"
    ) {

      recordDevConsoleStorageWarning(
        "Favorite削除",
        error
      );

    }

  }

  showDevConsoleFavorites();

}

/* ===============================
   Wait Dev Console Ready
=============================== */

function waitDevConsoleReady(
  callback,
  retry = 0
) {

  const input =
    get("devConsoleInput");

  if (input) {

    callback(input);

    return;

  }

  if (retry >= 10) {
    return;
  }

  requestAnimationFrame(() => {

    waitDevConsoleReady(
      callback,
      retry + 1
    );

  });

}

/* ===============================
   Autocomplete Score
=============================== */

function calculateDevConsoleAutocompleteScore(
  name,
  keyword
) {

  const text =
    String(name || "")
      .toLowerCase();

  const word =
    String(keyword || "")
      .toLowerCase();

  if (!text || !word) {
    return -1;
  }

  if (text === word) {
    return 3000;
  }

  if (text.startsWith(word)) {
    return 2000;
  }

  if (text.includes(word)) {
    return 1000;
  }

  return -1;

}

window.saveDevConsoleHistory =
  saveDevConsoleHistory;

window.showDevConsoleHistory =
  showDevConsoleHistory;

window.loadDevConsoleHistory =
  loadDevConsoleHistory;

window.runDevConsoleHistory =
  runDevConsoleHistory;

window.saveDevConsoleFavorite =
  saveDevConsoleFavorite;

window.showDevConsoleFavorites =
  showDevConsoleFavorites;

window.loadDevConsoleFavorite =
  loadDevConsoleFavorite;

window.runDevConsoleFavorite =
  runDevConsoleFavorite;

window.deleteDevConsoleFavorite =
  deleteDevConsoleFavorite;