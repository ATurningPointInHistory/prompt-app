/* ===============================
   FILE: 11_mobile_console_suggest.js
   Mobile Console Suggest / Quick Command
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

  const input =
    get("devConsoleInput");

  if (!code || !input) {
    return;
  }

  input.value =
    code;

  localStorage.setItem(
    "devConsoleLastInput",
    input.value
  );

  showMobileConsole();

}

function runDevConsoleHistory(
  index
) {

  loadDevConsoleHistory(
    index
  );

  setTimeout(
    executeDevConsole,
    50
  );

}

function saveDevConsoleFavorite() {

  const input =
    get("devConsoleInput");

  const code =
    input ? input.value.trim() : "";

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

  devConsoleFavorites.unshift({
    name,
    code
  });

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

  const input =
    get("devConsoleInput");

  if (!item || !input) {
    return;
  }

  input.value =
    item.code || "";

  localStorage.setItem(
    "devConsoleLastInput",
    input.value
  );

  showMobileConsole();

}

function runDevConsoleFavorite(
  index
) {

  loadDevConsoleFavorite(
    index
  );

  setTimeout(
    executeDevConsole,
    50
  );

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

function updateDevConsoleSuggestions() {

  const box =
    get("devConsoleSuggestion");

  const input =
    get("devConsoleInput");

  if (!box || !input) {
    return;
  }

  const text =
    input.value.trim();

  if (!text) {
    box.innerHTML = "";
    return;
  }

  const names =
    typeof getAllFunctionNames === "function"
      ? getAllFunctionNames()
      : [];

  const hits =
    names
      .filter(name =>
        name
          .toLowerCase()
          .includes(
            text.toLowerCase()
          )
      )
      .slice(0, 10);

  box.innerHTML =
    hits
      .map(name => `
<button onclick="jumpToFunction('${escapeHtml(name)}')">
  ${escapeHtml(name)}
</button>
`)
      .join("");

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

window.updateDevConsoleSuggestions =
  updateDevConsoleSuggestions;