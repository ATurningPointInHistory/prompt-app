/* ===============================
   FILE: 11_ide_launcher.js
   Development IDE Launcher
   IDE-000 Common Entry
=============================== */

/* ===============================
   Get IDE Launcher Items
=============================== */

function getIdeLauncherItems() {

  if (
    typeof getIdeRegistry !==
    "function"
  ) {
    return [];
  }

  if (
    typeof refreshIdeRegistry ===
    "function"
  ) {
    refreshIdeRegistry();
  }

  return getIdeRegistry()
    .sort((a, b) =>
      String(a.id || "")
        .localeCompare(
          String(b.id || "")
        )
    );

}

/* ===============================
   Get IDE Launcher Item
=============================== */

function getIdeLauncherItem(
  id
) {

  const itemId =
    String(id || "")
      .trim();

  if (!itemId) {
    return null;
  }

  return getIdeLauncherItems()
    .find(item =>
      item.id === itemId
    ) || null;

}

/* ===============================
   Check IDE Launcher Item Ready
=============================== */

function isIdeLauncherItemReady(
  item
) {

  if (!item) {
    return false;
  }

  if (
    typeof resolveIdeComponentReady ===
    "function"
  ) {
    return resolveIdeComponentReady(
      item
    );
  }

  if (
    item.launcher &&
    typeof window[
      item.launcher
    ] === "function"
  ) {
    return true;
  }

  if (
    item.probe &&
    typeof window[
      item.probe
    ] === "function"
  ) {
    return true;
  }

  if (
    item.validator &&
    typeof window[
      item.validator
    ] === "function"
  ) {
    return true;
  }

  return Boolean(
    item.ready
  );

}

/* ===============================
   Get IDE Launcher Runtime Status
=============================== */

function getIdeLauncherRuntimeStatus(
  item
) {

  if (!item) {
    return "Unavailable";
  }

  if (
    isIdeLauncherItemReady(
      item
    )
  ) {
    return "Ready";
  }

  if (
    item.status === "Official" &&
    !item.launcher
  ) {
    return "Embedded";
  }

  return (
    item.status ||
    "Planned"
  );

}

/* ===============================
   Get IDE Launcher Status Label
=============================== */

function getIdeLauncherStatusLabel(
  status
) {

  const labels = {
    Ready:
      "✅ Ready",

    Official:
      "✅ Official",

    Embedded:
      "✅ Embedded",

    Working:
      "🚧 Working",

    Planned:
      "⬜ Planned",

    Disabled:
      "⛔ Disabled",

    Unavailable:
      "⚠ Unavailable"
  };

  return (
    labels[status] ||
    String(status || "Unknown")
  );

}

/* ===============================
   Build IDE Launcher Item HTML
=============================== */

function buildIdeLauncherItemHtml(
  item
) {

  if (!item) {
    return "";
  }

  const runtimeStatus =
    getIdeLauncherRuntimeStatus(
      item
    );

  const ready =
    runtimeStatus === "Ready";

  return `
<div
  class="function-help-item"
  onclick="openIdeLauncherItem('${escapeHtml(
    item.id
  )}')"
  style="
    opacity:${ready ? "1" : "0.75"};
    cursor:pointer;
  ">

<div>
  <b>
    ${escapeHtml(
      item.icon || "🧩"
    )}
    ${escapeHtml(
      item.id || ""
    )}
    ${escapeHtml(
      item.title || ""
    )}
  </b>
</div>

<div class="small">
  ${escapeHtml(
    getIdeLauncherStatusLabel(
      runtimeStatus
    )
  )}
</div>

<div class="small">
  ${escapeHtml(
    item.summary || ""
  )}
</div>

</div>

<hr>
`;

}

/* ===============================
   Build IDE Launcher HTML
=============================== */

function buildIdeLauncherHtml() {

  const items =
    getIdeLauncherItems();

  const readyCount =
    items.filter(item =>
      getIdeLauncherRuntimeStatus(
        item
      ) === "Ready"
    ).length;

  return `
<div class="small">
Development IDE
</div>

<div style="margin-bottom:10px;">
Ready:
<b>${readyCount}</b>
/
<b>${items.length}</b>
</div>

<div class="float-panel-actions">

<button
  type="button"
  onclick="showCommandPalette()">
  ⌨ Command Palette
</button>

<button
  type="button"
  onclick="refreshIdeLauncher()">
  🔄 Refresh
</button>

</div>

<hr>

<div id="ideLauncherItems">

${items
  .map(
    buildIdeLauncherItemHtml
  )
  .join("")}

</div>
`;

}

/* ===============================
   Show IDE Launcher
=============================== */

function showIdeLauncher() {

  openFloatPanel(
    "Development IDE",
    buildIdeLauncherHtml()
  );

  return true;

}

/* ===============================
   Refresh IDE Launcher
=============================== */

function refreshIdeLauncher() {

  const container =
    get(
      "ideLauncherItems"
    );

  if (!container) {

    showIdeLauncher();

    return false;

  }

  container.innerHTML =
    getIdeLauncherItems()
      .map(
        buildIdeLauncherItemHtml
      )
      .join("");

  return true;

}

/* ===============================
   Open IDE Launcher Item
=============================== */

function openIdeLauncherItem(
  id
) {

  const item =
    getIdeLauncherItem(
      id
    );

  if (!item) {

    alert(
      "IDE Componentが見つかりません\n\n" +
      String(id || "")
    );

    return false;

  }

  const launcher =
    String(
      item.launcher || ""
    ).trim();

  if (
    launcher &&
    typeof window[
      launcher
    ] === "function"
  ) {

    try {

      const result =
        window[
          launcher
        ]();

      return result === undefined
        ? true
        : result;

    } catch (error) {

      alert(
        [
          "IDE Componentの起動に失敗しました",
          "",
          item.id +
            " " +
            item.title,
          "",
          typeof formatDevConsoleError ===
          "function"
            ? formatDevConsoleError(
                error
              )
            : String(
                error &&
                error.message
                  ? error.message
                  : error
              )
        ].join("\n")
      );

      return false;

    }

  }

  showIdeLauncherComingSoon(
    item
  );

  return false;

}

/* ===============================
   Show IDE Launcher Coming Soon
=============================== */

function showIdeLauncherComingSoon(
  item
) {

  if (!item) {
    return false;
  }

  openFloatPanel(
    item.id +
      " " +
      item.title,

    `
<div class="small">
Status
</div>

<h3>
${escapeHtml(
  getIdeLauncherStatusLabel(
    getIdeLauncherRuntimeStatus(
      item
    )
  )
)}
</h3>

<div>
${escapeHtml(
  item.summary || ""
)}
</div>

<hr>

<div class="small">
このIDE Componentは現在、単独画面として起動できません。
</div>
`
  );

  return true;

}

/* ===============================
   Register Launcher Command
=============================== */

function registerIdeLauncherCommand() {

  if (
    typeof registerCommandPaletteCommand !==
    "function"
  ) {
    return false;
  }

  return registerCommandPaletteCommand({
    id:
      "ide.launcher.open",

    type:
      "ide",

    title:
      "Open Development IDE",

    summary:
      "Development IDE Launcherを開きます。",

    category:
      "IDE",

    keywords: [
      "ide",
      "launcher",
      "development",
      "workspace",
      "開発"
    ],

    icon:
      "🧰",

    action() {

      return showIdeLauncher();

    }
  });

}

/* ===============================
   Validate IDE Launcher
=============================== */

function validateIdeLauncher() {

  const items =
    getIdeLauncherItems();

  const ids =
    items.map(item =>
      item.id
    );

  const ready =
    items.filter(item =>
      isIdeLauncherItemReady(
        item
      )
    );

  const checks = {

    items:
      Array.isArray(
        items
      ) &&
      items.length === 10,

    uniqueIds:
      new Set(
        ids
      ).size ===
      ids.length,

    mobileConsole:
      !!getIdeLauncherItem(
        "IDE-010"
      ),

    functionHelp:
      !!getIdeLauncherItem(
        "IDE-020"
      ),

    commandPalette:
      !!getIdeLauncherItem(
        "IDE-030"
      ),

    openFunction:
      typeof openIdeLauncherItem ===
      "function",

    renderer:
      typeof buildIdeLauncherHtml ===
      "function",

    launcher:
      typeof showIdeLauncher ===
      "function"

  };

  const failed =
    Object.entries(checks)
      .filter(entry =>
        entry[1] !== true
      )
      .map(entry =>
        entry[0]
      );

  return {
    id:
      "IDE-LAUNCHER",

    title:
      "Development IDE Launcher",

    valid:
      failed.length === 0,

    passed:
      Object.keys(
        checks
      ).length -
      failed.length,

    total:
      Object.keys(
        checks
      ).length,

    failed,

    checks,

    components:
      items.length,

    ready:
      ready.map(item =>
        item.id
      )
  };

}

/* ===============================
   Initialize IDE Launcher
=============================== */

function initIdeLauncher() {

  registerIdeLauncherCommand();

  return true;

}

/* ===============================
   Public API
=============================== */

window.getIdeLauncherItems =
  getIdeLauncherItems;

window.getIdeLauncherItem =
  getIdeLauncherItem;

window.isIdeLauncherItemReady =
  isIdeLauncherItemReady;

window.getIdeLauncherRuntimeStatus =
  getIdeLauncherRuntimeStatus;

window.buildIdeLauncherItemHtml =
  buildIdeLauncherItemHtml;

window.buildIdeLauncherHtml =
  buildIdeLauncherHtml;

window.showIdeLauncher =
  showIdeLauncher;

window.refreshIdeLauncher =
  refreshIdeLauncher;

window.openIdeLauncherItem =
  openIdeLauncherItem;

window.showIdeLauncherComingSoon =
  showIdeLauncherComingSoon;

window.registerIdeLauncherCommand =
  registerIdeLauncherCommand;

window.validateIdeLauncher =
  validateIdeLauncher;

window.initIdeLauncher =
  initIdeLauncher;

window.getIdeLauncherItems =
  getIdeLauncherItems;

window.buildIdeLauncherItemHtml =
  buildIdeLauncherItemHtml;

initIdeLauncher();

console.log(
  "11_ide_launcher loaded"
);