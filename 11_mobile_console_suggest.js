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

  localStorage.setItem(
    "devConsoleHistory",
    JSON.stringify(
      devConsoleHistory
    )
  );

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

  localStorage.setItem(
    "devConsoleFavorites",
    JSON.stringify(
      devConsoleFavorites
    )
  );

  alert("Favorite保存しました");

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

  localStorage.setItem(
    "devConsoleFavorites",
    JSON.stringify(
      devConsoleFavorites
    )
  );

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