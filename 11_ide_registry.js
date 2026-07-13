/* ===============================
   FILE: 11_ide_registry.js
   IDE Registry
   Phase 1 Core
=============================== */

let ideRegistry =
  Object.create(null);

/* ===============================
   Register IDE Component
=============================== */

function registerIdeComponent(
  component
) {

  if (
    !component ||
    typeof component !== "object"
  ) {
    return false;
  }

  const id =
    String(
      component.id || ""
    ).trim();

  if (!id) {
    return false;
  }

  ideRegistry[id] = {

    id,

    title:
      String(
        component.title || ""
      ),

    summary:
      String(
        component.summary || ""
      ),

    icon:
      String(
        component.icon || "🧩"
      ),

    version:
      String(
        component.version || "1.0"
      ),

    status:
      String(
        component.status ||
        "Planned"
      ),

    ready:
      Boolean(
        component.ready
      ),

    progress:
      Number(
        component.progress || 0
      ),

    health:
      Number(
        component.health || 0
      ),

    launcher:
      String(
        component.launcher || ""
      ),

    validator:
      String(
        component.validator || ""
      ),

    probe:
      String(
        component.probe || ""
      ),

    category:
      String(
        component.category ||
        "IDE"
      )

  };

  return true;

}

/* ===============================
   Unregister IDE Component
=============================== */

function unregisterIdeComponent(
  id
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

  delete ideRegistry[
    componentId
  ];

  return true;

}

/* ===============================
   Get IDE Registry
=============================== */

function getIdeRegistry() {

  return Object.values(
    ideRegistry
  )
    .map(component => ({
      ...component
    }))
    .sort((a, b) =>
      String(a.id || "")
        .localeCompare(
          String(b.id || "")
        )
    );

}

/* ===============================
   Get IDE Component
=============================== */

function getIdeComponent(
  id
) {

  const componentId =
    String(id || "")
      .trim();

  if (!componentId) {
    return null;
  }

  const component =
    ideRegistry[
      componentId
    ];

  if (!component) {
    return null;
  }

  return {
    ...component
  };

}

/* ===============================
   Check IDE Component
=============================== */

function hasIdeComponent(
  id
) {

  const componentId =
    String(id || "")
      .trim();

  if (!componentId) {
    return false;
  }

  return Boolean(
    ideRegistry[
      componentId
    ]
  );

}

/* ===============================
   Get IDE Component Count
=============================== */

function getIdeComponentCount() {

  return Object.keys(
    ideRegistry
  ).length;

}

/* ===============================
   Clear IDE Registry
=============================== */

function clearIdeRegistry() {

  ideRegistry =
    Object.create(null);

  return true;

}

/* ===============================
   Validate IDE Registry
=============================== */

function validateIdeRegistry() {

  const components =
    getIdeRegistry();

  const ids =
    components.map(component =>
      component.id
    );

  const invalid = [];

  components.forEach(component => {

    const errors = [];

    if (!component.id) {
      errors.push("id");
    }

    if (!component.title) {
      errors.push("title");
    }

    if (!component.version) {
      errors.push("version");
    }

    if (!component.status) {
      errors.push("status");
    }

    if (
      !Number.isFinite(
        component.progress
      ) ||
      component.progress < 0 ||
      component.progress > 100
    ) {
      errors.push("progress");
    }

    if (
      !Number.isFinite(
        component.health
      ) ||
      component.health < 0 ||
      component.health > 100
    ) {
      errors.push("health");
    }

    if (errors.length) {

      invalid.push({
        id:
          component.id || "unknown",

        errors
      });

    }

  });

  const duplicateIds =
    ids.filter(
      (id, index) =>
        ids.indexOf(id) !== index
    );

  const checks = {

    registry:
      ideRegistry &&
      typeof ideRegistry ===
      "object",

    registered:
      components.length > 0,

    uniqueIds:
      duplicateIds.length === 0,

    validComponents:
      invalid.length === 0,

    registerApi:
      typeof registerIdeComponent ===
      "function",

    unregisterApi:
      typeof unregisterIdeComponent ===
      "function",

    listApi:
      typeof getIdeRegistry ===
      "function",

    componentApi:
      typeof getIdeComponent ===
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
      "IDE-REGISTRY",

    title:
      "IDE Registry",

    valid:
      failed.length === 0,

    passed:
      Object.keys(checks).length -
      failed.length,

    total:
      Object.keys(checks).length,

    failed,

    checks,

    registered:
      components.length,

    duplicateIds:
      Array.from(
        new Set(
          duplicateIds
        )
      ),

    invalid
  };

}

/* ===============================
   Register Default IDE Components
=============================== */

function registerDefaultIdeComponents() {

  const components = [
    {
      id: "IDE-010",
      title: "Mobile Console",
    
      summary:
        "JavaScript実行・ログ確認・デバッグを行います。",
    
      icon:
        "🖥",
    
      version: "1.0",
      status: "Official",
      ready:
        typeof showMobileConsole ===
        "function",
      progress: 100,
      health: 100,
      launcher:
        "showMobileConsole",
      validator: "",
      probe: "",
      category: "IDE"
    },
    {
      id: "IDE-020",
      title: "Function Help",
    
      summary:
        "関数情報・呼び出し関係・ソースコードを検索します。",
    
      icon:
        "📖",
    
      version: "1.0",
      status: "Official",
      ready:
        typeof showFunctionHelpSearch ===
        "function",
      progress: 100,
      health: 100,
      launcher:
        "showFunctionHelpSearch",
      validator: "",
      probe: "",
      category: "IDE"
    },
    {
      id: "IDE-030",
      title: "Command Palette",
    
      summary:
        "IDEコマンド・関数・履歴・Favoriteを検索して実行します。",
    
      icon:
        "⌨",
    
      version: "1.0",
      status: "Official",
      ready:
        typeof showCommandPalette ===
        "function",
      progress: 100,
      health: 100,
      launcher:
        "showCommandPalette",
      validator:
        "validateCommandPalette",
      probe: "",
      category: "IDE"
    },
    {
      id: "IDE-040",
      title: "Project Search",
      summary:
        "プロジェクト全体を横断検索します。",
      icon:
        "🔍",
      version: "1.0",
      status:
        typeof showProjectSearch ===
        "function"
          ? "Working"
          : "Planned",
      ready:
        typeof showProjectSearch ===
        "function",
      progress:
        typeof showProjectSearch ===
        "function"
          ? 80
          : 0,
      health:
        typeof validateProjectSearch ===
        "function"
          ? 90
          : 0,
      launcher:
        "showProjectSearch",
      validator:
        "validateProjectSearch",
      probe:
        "searchProject",
      category:
        "IDE"
    },
    {
      id: "IDE-050",
      title: "Error Inspector",
    
      summary:
        "エラー・例外・診断情報を確認します。",
    
      icon:
        "⚠",
    
      version: "1.0",
      status: "Planned",
      ready:
        typeof showErrorInspector ===
        "function",
      progress: 0,
      health: 0,
      launcher:
        "showErrorInspector",
      validator: "",
      probe: "",
      category: "IDE"
    },
    {
      id: "IDE-060",
      title: "Quick Command",
    
      summary:
        "登録済みQuick Commandを管理します。",
    
      icon:
        "⚡",
    
      version: "1.0",
      status: "Working",
      ready:
        typeof showDevConsoleQuickEditor ===
        "function",
      progress: 80,
      health: 90,
      launcher:
        "showDevConsoleQuickEditor",
      validator: "",
      probe: "",
      category: "IDE"
    },
    {
      id: "IDE-070",
      title: "Autocomplete",
    
      summary:
        "Console入力を補助する候補生成機能です。",
    
      icon:
        "✍",
    
      version: "1.0",
      status: "Working",
      ready:
        typeof updateDevConsoleSuggestions ===
        "function",
      progress: 80,
      health: 90,
      launcher: "",
      validator: "",
      probe:
        "updateDevConsoleSuggestions",
      category: "IDE"
    },
    {
      id: "IDE-080",
      title: "Virtual Keyboard",
    
      summary:
        "モバイル向けの開発用仮想キーボードです。",
    
      icon:
        "⌨",
    
      version: "1.0",
      status: "Official",
      ready:
        typeof buildVirtualKeyboardHtml ===
        "function",
      progress: 100,
      health: 100,
      launcher: "",
      validator: "",
      probe:
        "buildVirtualKeyboardHtml",
      category: "IDE"
    },
    {
      id: "IDE-090",
      title: "Dashboard Integration",
    
      summary:
        "Development Progress・Health・Repository状態を表示します。",
    
      icon:
        "📊",
    
      version: "1.0",
      status: "Working",
      ready:
        typeof showDevelopmentDashboard ===
        "function",
      progress: 40,
      health: 80,
      launcher:
        "showDevelopmentDashboard",
      validator: "",
      probe: "",
      category: "IDE"
    },
    {
      id: "IDE-100",
      title: "AI Development Assistant",
    
      summary:
        "Repository・Analyzer・IDEを利用してAI開発支援を行います。",
    
      icon:
        "🤖",
    
      version: "1.0",
      status: "Planned",
      ready:
        typeof showAiDevelopmentAssistant ===
        "function",
      progress: 0,
      health: 0,
      launcher:
        "showAiDevelopmentAssistant",
      validator: "",
      probe: "",
      category: "IDE"
    }
  ];

  components.forEach(component => {

    registerIdeComponent(
      component
    );

  });

  return components.length;

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

  return {

    id:
      component.id,

    title:
      component.title,

    status:
      component.status,

    ready:
      resolveIdeComponentReady(
        component
      ),

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

    component.ready =
      resolveIdeComponentReady(
        component
      );

  });

  return getIdeRegistry();

}

/* ===============================
   Initialize IDE Registry
=============================== */

function initIdeRegistry() {

  clearIdeRegistry();

  registerDefaultIdeComponents();

  registerIdeRegistryCommand();

  return validateIdeRegistry();

}

/* ===============================
   Build IDE Registry Item HTML
=============================== */

function buildIdeRegistryItemHtml(
  component
) {

  if (!component) {
    return "";
  }

  const status =
    getIdeComponentStatus(
      component.id
    );

  return `
<div class="function-help-item">

<b>
${escapeHtml(component.id)}
</b>

<div>
${escapeHtml(component.title)}
</div>

<div class="small">

Status :
${escapeHtml(status.status)}

<br>

Ready :
${status.ready ? "✅" : "❌"}

<br>

Progress :
${status.progress}%

<br>

Health :
${status.health}%

</div>

</div>

<hr>
`;

}

/* ===============================
   Build IDE Registry HTML
=============================== */

function buildIdeRegistryHtml() {

  const list =
    getIdeRegistry();

  return `

<div class="small">

IDE Components

</div>

<div
class="float-panel-actions">

<button
onclick="
refreshIdeRegistryView()
">

🔄 Refresh

</button>

</div>

<hr>

<div
id="ideRegistryList">

${list
  .map(
    buildIdeRegistryItemHtml
  )
  .join("")}

</div>

`;

}

/* ===============================
   Show IDE Registry
=============================== */

function showIdeRegistry() {

  openFloatPanel(
    "IDE Registry",
    buildIdeRegistryHtml()
  );

  return true;

}

/* ===============================
   Refresh IDE Registry View
=============================== */

function refreshIdeRegistryView() {

  refreshIdeRegistry();

  const box =
    get(
      "ideRegistryList"
    );

  if (!box) {
    return;
  }

  box.innerHTML =
    getIdeRegistry()
      .map(
        buildIdeRegistryItemHtml
      )
      .join("");

}

/* ===============================
   Register IDE Registry Command
=============================== */

function registerIdeRegistryCommand() {

  if (
    typeof registerCommandPaletteCommand !==
    "function"
  ) {
    return false;
  }

  return registerCommandPaletteCommand({

    id:
      "ide.registry",

    type:
      "ide",

    title:
      "Open IDE Registry",

    summary:
      "IDE Registryを表示します。",

    category:
      "IDE",

    keywords: [
      "registry",
      "ide",
      "status"
    ],

    icon:
      "📋",

    action() {

      return showIdeRegistry();

    }

  });

}

/* ===============================
   Resolve IDE Component Ready
=============================== */

function resolveIdeComponentReady(
  component
) {

  if (!component) {
    return false;
  }

  if (
    component.launcher
  ) {

    return (
      typeof window[
        component.launcher
      ] === "function"
    );

  }

  if (
    component.probe
  ) {

    return (
      typeof window[
        component.probe
      ] === "function"
    );

  }

  if (
    component.validator
  ) {

    return (
      typeof window[
        component.validator
      ] === "function"
    );

  }

  return Boolean(
    component.ready
  );

}

/* ===============================
   Public API
=============================== */

window.registerIdeComponent =
  registerIdeComponent;

window.unregisterIdeComponent =
  unregisterIdeComponent;

window.getIdeRegistry =
  getIdeRegistry;

window.getIdeComponent =
  getIdeComponent;

window.hasIdeComponent =
  hasIdeComponent;

window.getIdeComponentCount =
  getIdeComponentCount;

window.clearIdeRegistry =
  clearIdeRegistry;

window.registerDefaultIdeComponents =
  registerDefaultIdeComponents;

window.validateIdeRegistry =
  validateIdeRegistry;

window.initIdeRegistry =
  initIdeRegistry;

window.getIdeComponentStatus =
  getIdeComponentStatus;

window.updateIdeComponentStatus =
  updateIdeComponentStatus;

window.refreshIdeRegistry =
  refreshIdeRegistry;

window.showIdeRegistry =
  showIdeRegistry;

window.refreshIdeRegistryView =
  refreshIdeRegistryView;

window.registerIdeRegistryCommand =
  registerIdeRegistryCommand;

window.resolveIdeComponentReady =
  resolveIdeComponentReady;

initIdeRegistry();

console.log(
  "11_ide_registry loaded"
);