/* ===============================
   FILE: 11_ide_launcher.js
   Development IDE Launcher
   IDE-000 Common Entry
=============================== */

/* ===============================
   Get IDE Launcher Items
=============================== */

function getIdeLauncherItems() {

  return [
    {
      id:
        "IDE-010",

      title:
        "Mobile Console",

      summary:
        "JavaScript実行・ログ確認・デバッグを行います。",

      icon:
        "🖥",

      functionName:
        "showMobileConsole",

      status:
        "Official"
    },
    {
      id:
        "IDE-020",

      title:
        "Function Help",

      summary:
        "関数情報・呼び出し関係・ソースコードを検索します。",

      icon:
        "📖",

      functionName:
        "showFunctionHelpSearch",

      status:
        "Official"
    },
    {
      id:
        "IDE-030",

      title:
        "Command Palette",

      summary:
        "IDEコマンド・関数・履歴・Favoriteを検索して実行します。",

      icon:
        "⌨",

      functionName:
        "showCommandPalette",

      status:
        "Official"
    },
    {
      id:
        "IDE-040",

      title:
        "Project Search",

      summary:
        "プロジェクト全体を横断検索します。",

      icon:
        "🔍",

      functionName:
        "showProjectSearch",

      status:
        "Planned"
    },
    {
      id:
        "IDE-050",

      title:
        "Error Inspector",

      summary:
        "エラー・例外・診断情報を確認します。",

      icon:
        "⚠",

      functionName:
        "showErrorInspector",

      status:
        "Planned"
    },
    {
      id:
        "IDE-060",

      title:
        "Quick Command",

      summary:
        "登録済みQuick Commandを管理します。",

      icon:
        "⚡",

      functionName:
        "showDevConsoleQuickEditor",

      status:
        "Working"
    },
    {
      id:
        "IDE-070",

      title:
        "Autocomplete",

      summary:
        "Console入力を補助する候補生成機能です。",

      icon:
        "✍",

      functionName:
        "",

      status:
        "Working"
    },
    {
      id:
        "IDE-080",

      title:
        "Virtual Keyboard",

      summary:
        "モバイル向けの開発用仮想キーボードです。",

      icon:
        "⌨",

      functionName:
        "",

      status:
        "Official"
    },
    {
      id:
        "IDE-090",

      title:
        "Dashboard",

      summary:
        "Development Progress・Health・Repository状態を表示します。",

      icon:
        "📊",

      functionName:
        "showDevelopmentDashboard",

      status:
        "Planned"
    },
    {
      id:
        "IDE-100",

      title:
        "AI Development Assistant",

      summary:
        "Repository・Analyzer・IDEを利用してAI開発支援を行います。",

      icon:
        "🤖",

      functionName:
        "showAiDevelopmentAssistant",

      status:
        "Planned"
    }
  ];

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

  const functionName =
    String(
      item.functionName || ""
    ).trim();

  if (!functionName) {
    return false;
  }

  return (
    typeof window[
      functionName
    ] === "function"
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
    item.status === "Official"
  ) {
    return "Embedded";
  }

  return item.status || "Planned";

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

  const functionName =
    String(
      item.functionName || ""
    ).trim();

  if (
    functionName &&
    typeof window[
      functionName
    ] === "function"
  ) {

    try {

      window[
        functionName
      ]();

      return true;

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
   Get IDE Component Status
=============================== */

function getIdeComponentStatus(
  id
) {

  const component =
    getIdeComponent(
      id
    );

  if (!component) {
    return null;
  }

  const runtimeReady =
    component.launcher
      ? typeof window[
          component.launcher
        ] === "function"
      : Boolean(
          component.ready
        );

  return {

    id:
      component.id,

    title:
      component.title,

    status:
      component.status,

    ready:
      runtimeReady,

    progress:
      component.progress,

    health:
      component.health

  };

}

/* ===============================
   Update IDE Component Status
=============================== */

function updateIdeComponentStatus(
  id,
  data = {}
) {

  const componentId =
    String(id || "")
      .trim();

  if (
    !componentId ||
    !ideRegistry[
      componentId
    ]
  ) {
    return false;
  }

  const component =
    ideRegistry[
      componentId
    ];

  if (
    data.status !==
    undefined
  ) {
    component.status =
      String(
        data.status
      );
  }

  if (
    data.ready !==
    undefined
  ) {
    component.ready =
      Boolean(
        data.ready
      );
  }

  if (
    data.progress !==
    undefined
  ) {
    component.progress =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            data.progress
          ) || 0
        )
      );
  }

  if (
    data.health !==
    undefined
  ) {
    component.health =
      Math.max(
        0,
        Math.min(
          100,
          Number(
            data.health
          ) || 0
        )
      );
  }

  return true;

}

/* ===============================
   Refresh IDE Registry
=============================== */

function refreshIdeRegistry() {

  Object.keys(
    ideRegistry
  ).forEach(id => {

    const component =
      ideRegistry[id];

    if (!component) {
      return;
    }

    if (
      component.launcher
    ) {

      component.ready =
        typeof window[
          component.launcher
        ] === "function";

      return;

    }

    if (
      component.validator
    ) {

      component.ready =
        typeof window[
          component.validator
        ] === "function";

    }

  });

  return getIdeRegistry();

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

window.getIdeComponentStatus =
  getIdeComponentStatus;

window.updateIdeComponentStatus =
  updateIdeComponentStatus;

window.refreshIdeRegistry =
  refreshIdeRegistry;

initIdeLauncher();

console.log(
  "11_ide_launcher loaded"
);