/* ===============================
   FILE: 11_command_palette.js
   Command Palette
   IDE-030
=============================== */

let commandPaletteRegistry =
  [];

let commandPaletteResults =
  [];

let commandPaletteRecent =
  loadJson(
    "commandPaletteRecent",
    []
  );

let commandPaletteFavorites =
  loadJson(
    "commandPaletteFavorites",
    []
  );

/* ===============================
   Initialize Command Palette
=============================== */

function initCommandPalette() {

  commandPaletteRegistry =
    [];

  cleanupCommandPaletteStoredState();

  registerDefaultCommandPaletteCommands();

}

/* ===============================
   Register Command
=============================== */

function registerCommandPaletteCommand(
  command
) {

  if (
    !command ||
    typeof command !== "object"
  ) {
    return false;
  }

  const id =
    String(command.id || "")
      .trim();

  if (!id) {
    return false;
  }

  const existingIndex =
    commandPaletteRegistry
      .findIndex(item =>
        item.id === id
      );

  const normalized = {

    id,

    type:
      command.type ||
      "command",

    title:
      command.title ||
      id,

    summary:
      command.summary ||
      "",

    category:
      command.category ||
      "General",

    keywords:
      Array.isArray(
        command.keywords
      )
        ? command.keywords
        : [],

    icon:
      command.icon ||
      "⚙",

    action:
      typeof command.action ===
      "function"
        ? command.action
        : null,

    enabled:
      command.enabled !== false,

    data:
      command.data || null

  };

  if (existingIndex >= 0) {

    commandPaletteRegistry[
      existingIndex
    ] = normalized;

  } else {

    commandPaletteRegistry.push(
      normalized
    );

  }

  return true;

}

/* ===============================
   Remove Command
=============================== */

function removeCommandPaletteCommand(
  id
) {

  const commandId =
    String(id || "")
      .trim();

  if (!commandId) {
    return false;
  }

  const before =
    commandPaletteRegistry.length;

  commandPaletteRegistry =
    commandPaletteRegistry
      .filter(item =>
        item.id !== commandId
      );

  return (
    commandPaletteRegistry.length <
    before
  );

}

/* ===============================
   Get Registered Commands
=============================== */

function getCommandPaletteCommands() {

  return commandPaletteRegistry
    .slice();

}

/* ===============================
   Register Default Commands
=============================== */

function registerDefaultCommandPaletteCommands() {

  registerCommandPaletteCommand({
    id: "ide.console.open",
    type: "ide",
    title: "Open Mobile Console",
    summary:
      "Mobile Development Consoleを開きます。",
    category: "IDE",
    keywords: [
      "console",
      "mobile",
      "debug",
      "run",
      "実行",
      "コンソール"
    ],
    icon: "🖥",
    action() {

      if (
        typeof showMobileConsole !==
        "function"
      ) {
        throw new Error(
          "showMobileConsole is not defined"
        );
      }

      return showMobileConsole();

    }
  });

  registerCommandPaletteCommand({
    id: "ide.functionHelp.open",
    type: "ide",
    title: "Open Function Help",
    summary:
      "Function Help検索を開きます。",
    category: "IDE",
    keywords: [
      "function",
      "help",
      "search",
      "関数",
      "ヘルプ"
    ],
    icon: "📖",
    action() {

      if (
        typeof showFunctionHelpSearch !==
        "function"
      ) {
        throw new Error(
          "showFunctionHelpSearch is not defined"
        );
      }

      return showFunctionHelpSearch();

    }
  });

  registerCommandPaletteCommand({
    id: "ide.quickCommand.open",
    type: "ide",
    title: "Open Quick Command Editor",
    summary:
      "Quick Command Editorを開きます。",
    category: "IDE",
    keywords: [
      "quick",
      "command",
      "shortcut",
      "editor"
    ],
    icon: "⚡",
    action() {

      if (
        typeof showDevConsoleQuickEditor !==
        "function"
      ) {
        throw new Error(
          "showDevConsoleQuickEditor is not defined"
        );
      }

      return showDevConsoleQuickEditor();

    }
  });

  registerCommandPaletteCommand({
    id: "ide.console.history",
    type: "ide",
    title: "Open Console History",
    summary:
      "Mobile Consoleの実行履歴を開きます。",
    category: "History",
    keywords: [
      "history",
      "console",
      "履歴"
    ],
    icon: "🕘",
    action() {

      if (
        typeof showDevConsoleHistory !==
        "function"
      ) {
        throw new Error(
          "showDevConsoleHistory is not defined"
        );
      }

      return showDevConsoleHistory();

    }
  });

  registerCommandPaletteCommand({
    id: "ide.console.favorites",
    type: "ide",
    title: "Open Console Favorites",
    summary:
      "Mobile ConsoleのFavoriteを開きます。",
    category: "Favorite",
    keywords: [
      "favorite",
      "console",
      "お気に入り"
    ],
    icon: "⭐",
    action() {

      if (
        typeof showDevConsoleFavorites !==
        "function"
      ) {
        throw new Error(
          "showDevConsoleFavorites is not defined"
        );
      }

      return showDevConsoleFavorites();

    }
  });

  registerCommandPaletteCommand({
    id: "project.database.refresh",
    type: "project",
    title: "Refresh Function Database",
    summary:
      "Project Function Databaseを更新します。",
    category: "Project",
    keywords: [
      "refresh",
      "database",
      "function",
      "project",
      "更新"
    ],
    icon: "🔄",
    action() {

      if (
        typeof refreshCurrentProjectFunctionDatabase !==
        "function"
      ) {
        throw new Error(
          "refreshCurrentProjectFunctionDatabase is not defined"
        );
      }

      return (
        refreshCurrentProjectFunctionDatabase()
      );

    }
  });

  registerCommandPaletteCommand({
    id: "project.health.open",
    type: "diagnostic",
    title: "Open HTML Health",
    summary:
      "HTML Health診断を開きます。",
    category: "Diagnostics",
    keywords: [
      "health",
      "html",
      "diagnostic",
      "診断"
    ],
    icon: "🩺",
    action() {

      if (
        typeof showHtmlHealth !==
        "function"
      ) {
        throw new Error(
          "showHtmlHealth is not defined"
        );
      }

      return showHtmlHealth();

    }
  });

}

/* ===============================
   Show Command Palette
=============================== */

function showCommandPalette() {

  if (
    !commandPaletteRegistry.length
  ) {
    initCommandPalette();
  }

  openFloatPanel(

    "Command Palette",

    `
<div class="small">
Command
</div>

<input
  id="commandPaletteKeyword"
  type="text"
  placeholder="コマンド・関数・キーワード"
  style="width:100%;"
  oninput="updateCommandPaletteSearch()"
  onkeydown="handleCommandPaletteKeydown(event)"
>

<div
  class="float-panel-actions"
  style="margin-top:8px;">

<button
  onclick="executeCommandPaletteSearch()">
  🔍 Search
</button>

<button
  onclick="showCommandPaletteRecent()">
  🕘 Recent
</button>

<button
  onclick="showCommandPaletteFavorites()">
  ⭐ Favorite
</button>

</div>

<div
  id="commandPaletteResult"
  style="margin-top:10px;">
検索してください
</div>
`

  );

  requestAnimationFrame(() => {

    const input =
      get(
        "commandPaletteKeyword"
      );

    if (input) {
      input.focus();
    }

  });

}

/* ===============================
   Search Command Palette
=============================== */

function searchCommandPalette(
  keyword
) {

  const query =
    String(keyword || "")
      .trim()
      .toLowerCase();

  const results = [];

  getCommandPaletteCommands()
    .forEach(command => {

      if (
        !command ||
        command.enabled === false
      ) {
        return;
      }

      const score =
        calculateCommandPaletteScore(
          command,
          query
        );

      if (
        query &&
        score < 0
      ) {
        return;
      }

      results.push({
        ...command,
        score
      });

    });

  if (
    typeof searchFunctionHelp ===
    "function"
  ) {

    const functionList =
      searchFunctionHelp(
        query
      );

    functionList
      .slice(0, 50)
      .forEach(info => {

        const name =
          info.name ||
          info.functionName ||
          "unknown";

        const command = {

          id:
            "function." +
            name,

          type:
            "function",

          title:
            name + "()",

          summary:
            info.summary ||
            info.aiComment ||
            "",

          category:
            "Function",

          keywords: [
            name,
            info.file,
            info.fileName,
            info.section,
            ...(info.keywords || [])
          ].filter(Boolean),

          icon:
            "📄",

          data:
            info,

          action() {

            if (
              typeof showFunctionHelp !==
              "function"
            ) {
              throw new Error(
                "showFunctionHelp is not defined"
              );
            }

            return showFunctionHelp(
              name
            );

          }

        };

        results.push({
          ...command,

          score:
            calculateCommandPaletteScore(
              command,
              query
            )
        });

      });

  }

  addQuickCommandsToCommandPalette(
    results,
    query
  );

  addFavoritesToCommandPalette(
    results,
    query
  );

  addHistoryToCommandPalette(
    results,
    query
  );

  return limitCommandPaletteResultsByType(
    deduplicateCommandPaletteResults(
      results
    )
      .sort(
        compareCommandPaletteResults
      )
  );

}

/* ===============================
   Add Quick Commands
=============================== */

function addQuickCommandsToCommandPalette(
  results,
  query
) {

  if (
    !Array.isArray(
      devConsoleQuickButtons
    )
  ) {
    return;
  }

  devConsoleQuickButtons
    .forEach((item, index) => {

      if (!item) {
        return;
      }

      const command = {

        id:
          createCommandPaletteStableId(
            "quick",
            [
              item.label || "",
              item.code || ""
            ].join("\n")
          ),

        type:
          "quick",

        title:
          item.label ||
          "Quick Command",

        summary:
          item.code ||
          "",

        category:
          "Quick Command",

        keywords: [
          item.label,
          item.code,
          "quick",
          "command"
        ].filter(Boolean),

        icon:
          "⚡",

        data:
          item,

        action() {

          return runDevConsoleQuickCommand(
            index
          );

        }

      };

      const score =
        calculateCommandPaletteScore(
          command,
          query
        );

      if (
        !query ||
        score >= 0
      ) {

        results.push({
          ...command,
          score
        });

      }

    });

}

/* ===============================
   Add Favorites
=============================== */

function addFavoritesToCommandPalette(
  results,
  query
) {

  if (
    !Array.isArray(
      devConsoleFavorites
    )
  ) {
    return;
  }

  devConsoleFavorites
    .forEach((item, index) => {

      if (!item) {
        return;
      }

      const command = {

        id:
          createCommandPaletteStableId(
            "favorite.console",
            [
              item.name || "",
              item.code || ""
            ].join("\n")
          ),

        type:
          "favorite",

        title:
          item.name ||
          "Console Favorite",

        summary:
          item.code ||
          "",

        category:
          "Favorite",

        keywords: [
          item.name,
          item.code,
          "favorite"
        ].filter(Boolean),

        icon:
          "⭐",

        data:
          item,

        action() {

          return runDevConsoleFavorite(
            index
          );

        }

      };

      const score =
        calculateCommandPaletteScore(
          command,
          query
        );

      if (
        !query ||
        score >= 0
      ) {

        results.push({
          ...command,
          score
        });

      }

    });

}

/* ===============================
   Add Console History
=============================== */

function addHistoryToCommandPalette(
  results,
  query
) {

  if (
    !Array.isArray(
      devConsoleHistory
    )
  ) {
    return;
  }

  devConsoleHistory
    .slice(0, 20)
    .forEach((code, index) => {

      if (!code) {
        return;
      }

      const command = {

        id:
          createCommandPaletteStableId(
            "history.console",
            code
          ),

        type:
          "history",

        title:
          buildCommandPaletteHistoryTitle(
            code,
            index
          ),

        summary:
          code,

        category:
          "History",

        keywords: [
          code,
          "history"
        ],

        icon:
          "🕘",

        data:
          code,

        action() {

          return runDevConsoleHistory(
            index
          );

        }

      };

      const score =
        calculateCommandPaletteScore(
          command,
          query
        );

      if (
        !query ||
        score >= 0
      ) {

        results.push({
          ...command,
          score
        });

      }

    });

}

/* ===============================
   Build History Title
=============================== */

function buildCommandPaletteHistoryTitle(
  code,
  index
) {

  const source =
    String(code || "")
      .trim();

  if (!source) {

    return (
      "Console History " +
      (index + 1)
    );

  }

  const lines =
    source
      .split(/\r?\n/)
      .map(line =>
        line.trim()
      )
      .filter(Boolean);

  const meaningful =
    lines.find(line => {

      if (
        /^[({[\];,]+$/.test(
          line
        )
      ) {
        return false;
      }

      if (
        /^\(?\s*\)?\s*=>\s*\{$/.test(
          line
        )
      ) {
        return false;
      }

      if (
        /^\(\s*\(\s*\)\s*=>\s*\{$/.test(
          line
        )
      ) {
        return false;
      }

      return true;

    });

  const title =
    meaningful ||
    "";

  const cleaned =
    title
      .replace(
        /^[({[]+\s*/,
        ""
      )
      .replace(
        /[;,]+$/,
        ""
      )
      .trim();

  if (!cleaned) {

    return (
      "Console History " +
      (index + 1)
    );

  }

  return cleaned.slice(
    0,
    60
  );

}

/* ===============================
   Cleanup Stored Command State
=============================== */

function cleanupCommandPaletteStoredState() {

  commandPaletteRecent =
    Array.isArray(
      commandPaletteRecent
    )
      ? commandPaletteRecent
          .filter(item =>
            item &&
            item.id &&
            !/^quick\.\d+$/.test(
              item.id
            ) &&
            !/^favorite\.console\.\d+$/.test(
              item.id
            ) &&
            !/^history\.console\.\d+$/.test(
              item.id
            )
          )
      : [];

  commandPaletteFavorites =
    Array.isArray(
      commandPaletteFavorites
    )
      ? commandPaletteFavorites
          .filter(id =>
            id &&
            !/^quick\.\d+$/.test(
              id
            ) &&
            !/^favorite\.console\.\d+$/.test(
              id
            ) &&
            !/^history\.console\.\d+$/.test(
              id
            )
          )
      : [];

  localStorage.setItem(
    "commandPaletteRecent",
    JSON.stringify(
      commandPaletteRecent
    )
  );

  localStorage.setItem(
    "commandPaletteFavorites",
    JSON.stringify(
      commandPaletteFavorites
    )
  );

}

/* ===============================
   Calculate Search Score
=============================== */

function calculateCommandPaletteScore(
  command,
  query
) {

  if (!command) {
    return -1;
  }

  const word =
    String(query || "")
      .trim()
      .toLowerCase();

  const typeBoostMap = {
    ide: 1400,
    project: 1200,
    diagnostic: 1200,
    quick: 1000,
    favorite: 700,
    history: 100,
    function: 0,
    command: 600
  };

  const typeBoost =
    Number(
      typeBoostMap[
        command.type
      ] || 0
    );

  if (!word) {

    return (
      typeBoost +
      getCommandPaletteRecentScore(
        command.id
      ) +
      getCommandPaletteFavoriteScore(
        command.id
      )
    );

  }

  const title =
    String(command.title || "")
      .toLowerCase();

  const id =
    String(command.id || "")
      .toLowerCase();

  const category =
    String(command.category || "")
      .toLowerCase();

  const summary =
    String(command.summary || "")
      .toLowerCase();

  const keywords =
    Array.isArray(
      command.keywords
    )
      ? command.keywords
          .map(value =>
            String(value || "")
              .toLowerCase()
          )
      : [];

  let score = -1;

  if (title === word) {

    score = 5000;

  } else if (id === word) {

    score = 4800;

  } else if (
    title.startsWith(word)
  ) {

    score = 4000;

  } else if (
    id.startsWith(word)
  ) {

    score = 3800;

  } else if (
    title.includes(word)
  ) {

    score = 3000;

  } else if (
    id.includes(word)
  ) {

    score = 2800;

  } else if (
    keywords.some(value =>
      value === word
    )
  ) {

    score = 2500;

  } else if (
    keywords.some(value =>
      value.startsWith(word)
    )
  ) {

    score = 2200;

  } else if (
    keywords.some(value =>
      value.includes(word)
    )
  ) {

    score = 1800;

  } else if (
    category.includes(word)
  ) {

    score = 1400;

  } else if (
    summary.includes(word)
  ) {

    score = 1000;

  }

  if (score < 0) {
    return -1;
  }

  score +=
    typeBoost;

  score +=
    getCommandPaletteRecentScore(
      command.id
    );

  score +=
    getCommandPaletteFavoriteScore(
      command.id
    );

  return score;

}

/* ===============================
   Recent Score
=============================== */

function getCommandPaletteRecentScore(
  id
) {

  const index =
    commandPaletteRecent
      .findIndex(item =>
        item &&
        item.id === id
      );

  if (index < 0) {
    return 0;
  }

  return Math.max(
    0,
    300 - index * 20
  );

}

/* ===============================
   Favorite Score
=============================== */

function getCommandPaletteFavoriteScore(
  id
) {

  return commandPaletteFavorites
    .includes(id)
      ? 500
      : 0;

}

/* ===============================
   Compare Results
=============================== */

function compareCommandPaletteResults(
  a,
  b
) {

  const scoreDiff =
    Number(b.score || 0) -
    Number(a.score || 0);

  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  return String(a.title || "")
    .localeCompare(
      String(b.title || "")
    );

}

/* ===============================
   Limit Results By Type
=============================== */

function limitCommandPaletteResultsByType(
  list
) {

  if (!Array.isArray(list)) {
    return [];
  }

  const limits = {
    ide: 10,
    project: 10,
    diagnostic: 10,
    quick: 10,
    favorite: 5,
    history: 5,
    function: 25,
    command: 10
  };

  const counts = {};

  const output = [];

  list.forEach(item => {

    if (!item) {
      return;
    }

    const type =
      item.type ||
      "command";

    const limit =
      Number(
        limits[type] || 10
      );

    counts[type] =
      Number(
        counts[type] || 0
      );

    if (
      counts[type] >= limit
    ) {
      return;
    }

    counts[type] += 1;

    output.push(
      item
    );

  });

  return output.slice(
    0,
    50
  );

}

/* ===============================
   Deduplicate Results
=============================== */

function deduplicateCommandPaletteResults(
  list
) {

  const map =
    new Map();

  list.forEach(item => {

    if (
      !item ||
      !item.id
    ) {
      return;
    }

    const existing =
      map.get(
        item.id
      );

    if (
      !existing ||
      Number(item.score || 0) >
      Number(existing.score || 0)
    ) {
      map.set(
        item.id,
        item
      );
    }

  });

  return Array.from(
    map.values()
  );

}

/* ===============================
   Execute Palette Search
=============================== */

function executeCommandPaletteSearch() {

  const input =
    get(
      "commandPaletteKeyword"
    );

  return renderCommandPaletteSearch(
    input
      ? input.value
      : ""
  );

}

/* ===============================
   Live Search
=============================== */

function updateCommandPaletteSearch() {

  return executeCommandPaletteSearch();

}

/* ===============================
   Render Search
=============================== */

function renderCommandPaletteSearch(
  keyword
) {

  const resultBox =
    get(
      "commandPaletteResult"
    );

  if (!resultBox) {
    return [];
  }

  const list =
    searchCommandPalette(
      keyword
    );

  commandPaletteResults =
    list;

  resultBox.innerHTML =
    buildCommandPaletteResultHtml(
      list
    );

  return list;

}

/* ===============================
   Build Result HTML
=============================== */

function buildCommandPaletteResultHtml(
  list
) {

  if (
    !Array.isArray(list) ||
    !list.length
  ) {

    return `
<div class="small">
検索結果はありません
</div>
`;

  }

  return list
    .map((item, index) => {

      const favorite =
        commandPaletteFavorites
          .includes(
            item.id
          );

      return `
<div
  class="function-help-item"
  onclick="executeCommandPaletteResult(${index})">

<div>
  <b>
    ${escapeHtml(
      item.icon || "⚙"
    )}
    ${escapeHtml(
      item.title || item.id
    )}
  </b>
</div>

<div class="small">
  ${escapeHtml(
    item.category || "General"
  )}
</div>

<div class="small">
  ${escapeHtml(
    item.summary || ""
  )}
</div>

<div
  class="float-panel-actions"
  style="margin-top:4px;">

<button
  type="button"
  onclick="
    event.stopPropagation();
    toggleCommandPaletteFavorite(${index});
  ">
  ${favorite ? "★" : "☆"}
</button>

</div>

</div>

<hr>
`;

    })
    .join("");

}

/* ===============================
   Execute Result
=============================== */

function executeCommandPaletteResult(
  index
) {

  const command =
    commandPaletteResults[index];

  if (!command) {
    return false;
  }

  return executeCommandPaletteCommand(
    command
  );

}

/* ===============================
   Execute Command
=============================== */

function executeCommandPaletteCommand(
  command
) {

  if (
    !command ||
    command.enabled === false
  ) {
    return false;
  }

  if (
    typeof command.action !==
    "function"
  ) {

    showCommandPaletteExecutionResult(
      "Command action is not available.",
      true
    );

    return false;

  }

  try {

    const result =
      command.action(
        command.data,
        command
      );

    if (
      result &&
      typeof result.then ===
      "function"
    ) {

      return result

        .then(value => {

          saveCommandPaletteRecent(
            command
          );

          showCommandPaletteExecutionResult(
            formatCommandPaletteResult(
              value
            ),
            false
          );

          return value;

        })

        .catch(error => {

          showCommandPaletteExecutionResult(
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
                ),
            true
          );

          return false;

        });

    }

    saveCommandPaletteRecent(
      command
    );

    showCommandPaletteExecutionResult(
      formatCommandPaletteResult(
        result
      ),
      false
    );

    return result === undefined
      ? true
      : result;

  } catch (error) {

    showCommandPaletteExecutionResult(
      typeof formatDevConsoleError ===
      "function"
        ? formatDevConsoleError(
            error
          )
        : String(error),
      true
    );

    return false;

  }

}

/* ===============================
   Format Command Result
=============================== */

function formatCommandPaletteResult(
  value
) {

  if (value === undefined) {
    return "Command executed.";
  }

  if (
    typeof formatDevConsoleValue ===
    "function"
  ) {
    return formatDevConsoleValue(
      value
    );
  }

  if (
    typeof value === "object"
  ) {

    try {
      return JSON.stringify(
        value,
        null,
        2
      );
    } catch (error) {
      return String(value);
    }

  }

  return String(value);

}

/* ===============================
   Show Execution Result
=============================== */

function showCommandPaletteExecutionResult(
  text,
  isError
) {

  const resultBox =
    get(
      "commandPaletteResult"
    );

  if (!resultBox) {
    return;
  }

  resultBox.innerHTML = `
<div class="small">
${isError ? "Execution Error" : "Execution Result"}
</div>

<pre class="code-preview">${escapeHtml(
  text || ""
)}</pre>
`;

}

/* ===============================
   Save Recent Command
=============================== */

function saveCommandPaletteRecent(
  command
) {

  if (
    !command ||
    !command.id
  ) {
    return;
  }

  commandPaletteRecent =
    commandPaletteRecent
      .filter(item =>
        item &&
        item.id !== command.id
      );

  commandPaletteRecent.unshift({
    id:
      command.id,

    title:
      command.title ||
      command.id,

    type:
      command.type ||
      "command",

    time:
      Date.now()
  });

  if (
    commandPaletteRecent.length >
    30
  ) {
    commandPaletteRecent.length =
      30;
  }

  localStorage.setItem(
    "commandPaletteRecent",
    JSON.stringify(
      commandPaletteRecent
    )
  );

}

/* ===============================
   Show Recent Commands
=============================== */

function showCommandPaletteRecent() {

  const commands =
    commandPaletteRecent
      .map(recent =>
        findCommandPaletteCommandById(
          recent.id
        )
      )
      .filter(Boolean);

  commandPaletteResults =
    commands;

  const resultBox =
    get(
      "commandPaletteResult"
    );

  if (!resultBox) {
    return;
  }

  resultBox.innerHTML =
    buildCommandPaletteResultHtml(
      commands
    );

}

/* ===============================
   Toggle Favorite
=============================== */

function toggleCommandPaletteFavorite(
  index
) {

  const command =
    commandPaletteResults[index];

  if (
    !command ||
    !command.id
  ) {
    return false;
  }

  if (
    commandPaletteFavorites
      .includes(
        command.id
      )
  ) {

    commandPaletteFavorites =
      commandPaletteFavorites
        .filter(id =>
          id !== command.id
        );

  } else {

    commandPaletteFavorites.push(
      command.id
    );

  }

  localStorage.setItem(
    "commandPaletteFavorites",
    JSON.stringify(
      commandPaletteFavorites
    )
  );

  executeCommandPaletteSearch();

  return true;

}

/* ===============================
   Show Favorites
=============================== */

function showCommandPaletteFavorites() {

  const commands =
    commandPaletteFavorites
      .map(id =>
        findCommandPaletteCommandById(
          id
        )
      )
      .filter(Boolean);

  commandPaletteResults =
    commands;

  const resultBox =
    get(
      "commandPaletteResult"
    );

  if (!resultBox) {
    return;
  }

  resultBox.innerHTML =
    buildCommandPaletteResultHtml(
      commands
    );

}

/* ===============================
   Find Command By ID
=============================== */

function findCommandPaletteCommandById(
  id
) {

  const commandId =
    String(id || "");

  const registered =
    getCommandPaletteCommands()
      .find(item =>
        item.id === commandId
      );

  if (registered) {
    return registered;
  }

  const all =
    searchCommandPalette(
      ""
    );

  return all.find(item =>
    item.id === commandId
  ) || null;

}

/* ===============================
   Keyboard Control
=============================== */

function handleCommandPaletteKeydown(
  event
) {

  if (!event) {
    return;
  }

  if (
    event.key !== "Enter"
  ) {
    return;
  }

  event.preventDefault();

  const list =
    executeCommandPaletteSearch();

  if (
    Array.isArray(list) &&
    list.length === 1
  ) {
    executeCommandPaletteResult(
      0
    );
  }

}

/* ===============================
   Create Stable Command ID
=============================== */

function createCommandPaletteStableId(
  type,
  value
) {

  const source =
    String(value || "");

  let hash =
    2166136261;

  for (
    let i = 0;
    i < source.length;
    i++
  ) {

    hash ^=
      source.charCodeAt(i);

    hash =
      Math.imul(
        hash,
        16777619
      );

  }

  return [
    String(type || "command"),
    (hash >>> 0).toString(36)
  ].join(".");

}

/* ===============================
   Public API
=============================== */

window.initCommandPalette =
  initCommandPalette;

window.showCommandPalette =
  showCommandPalette;

window.registerCommandPaletteCommand =
  registerCommandPaletteCommand;

window.removeCommandPaletteCommand =
  removeCommandPaletteCommand;

window.getCommandPaletteCommands =
  getCommandPaletteCommands;

window.searchCommandPalette =
  searchCommandPalette;

window.executeCommandPaletteSearch =
  executeCommandPaletteSearch;

window.updateCommandPaletteSearch =
  updateCommandPaletteSearch;

window.executeCommandPaletteResult =
  executeCommandPaletteResult;

window.executeCommandPaletteCommand =
  executeCommandPaletteCommand;

window.toggleCommandPaletteFavorite =
  toggleCommandPaletteFavorite;

window.showCommandPaletteRecent =
  showCommandPaletteRecent;

window.showCommandPaletteFavorites =
  showCommandPaletteFavorites;

window.handleCommandPaletteKeydown =
  handleCommandPaletteKeydown;

initCommandPalette();

console.log(
  "11_command_palette loaded"
);