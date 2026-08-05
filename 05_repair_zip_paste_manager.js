/* ===============================
   FILE: 05_repair_zip_paste_manager.js
   ZIP Paste Progress Manager

   目的:
   - ZIP内のファイルを一覧表示する
   - 選択したテキストファイルを確認・コピーする
   - コピー成功したファイルを完了表示する
   - ZIP単位で完了状態をlocalStorageに保存する
=============================== */

const ZIP_PASTE_MANAGER_VERSION = "1.0.0";
const ZIP_PASTE_MANAGER_STORAGE_PREFIX =
  "zipPasteManagerProgress:";
const ZIP_PASTE_MANAGER_MAX_ZIP_SIZE =
  100 * 1024 * 1024;
const ZIP_PASTE_MANAGER_PREVIEW_LIMIT =
  300000;
const ZIP_PASTE_MANAGER_MAX_ENTRY_COUNT =
  5000;
const ZIP_PASTE_MANAGER_MAX_TOTAL_SIZE =
  250 * 1024 * 1024;

const zipPasteManagerState = {
  file: null,
  zip: null,
  archiveId: "",
  archiveName: "",
  entries: [],
  entryMap: new Map(),
  completedPaths: new Set(),
  selectedPath: "",
  selectedText: "",
  selectedLoaded: false,
  selectedLoadToken: 0,
  searchText: "",
  incompleteOnly: false,
  busy: false,
  statusText: "ZIPを読み込んでください"
};

function getZipPasteManagerOverlay() {
  return document.getElementById(
    "zipPasteManagerOverlay"
  );
}

function buildZipPasteManagerHtml() {
  return `
<div
  id="zipPasteManagerOverlay"
  class="zip-paste-overlay"
  style="display:none;">

  <section
    class="zip-paste-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="zipPasteManagerTitle">

    <header class="zip-paste-header">
      <div>
        <h3 id="zipPasteManagerTitle">
          📦 ZIP貼付管理
        </h3>
        <div
          id="zipPasteArchiveInfo"
          class="small">
          ZIP未読込
        </div>
      </div>

      <button
        type="button"
        class="zip-paste-close"
        onclick="closeZipPasteManager()"
        aria-label="閉じる">
        ×
      </button>
    </header>

    <div class="zip-paste-top-actions">
      <button
        type="button"
        onclick="selectZipForPasteManager()">
        📂 ZIP読込
      </button>

      <button
        type="button"
        onclick="selectNextIncompleteZipPasteFile()">
        ⏭ 次の未完了
      </button>

      <button
        id="zipPasteIncompleteOnlyButton"
        type="button"
        class="btn-secondary"
        onclick="toggleZipPasteIncompleteOnly()">
        未完了のみ: OFF
      </button>

      <button
        type="button"
        class="btn-secondary"
        onclick="resetZipPasteProgress()">
        ↺ 完了を全解除
      </button>
    </div>

    <div class="zip-paste-progress-wrap">
      <div class="zip-paste-progress-text">
        <span id="zipPasteProgressText">
          0 / 0 完了
        </span>
        <span id="zipPasteStatusText">
          ZIPを読み込んでください
        </span>
      </div>

      <div class="zip-paste-progress-track">
        <div
          id="zipPasteProgressBar"
          class="zip-paste-progress-bar"
          style="width:0%;">
        </div>
      </div>
    </div>

    <div class="zip-paste-workspace">
      <aside class="zip-paste-sidebar">
        <input
          id="zipPasteSearchInput"
          type="search"
          placeholder="ファイル名を検索"
          oninput="filterZipPasteFiles(this.value)">

        <div
          id="zipPasteFileList"
          class="zip-paste-file-list">
          <div class="zip-paste-empty">
            ZIPを読み込むとファイル一覧が表示されます
          </div>
        </div>
      </aside>

      <main class="zip-paste-preview-panel">
        <div class="zip-paste-selected-header">
          <div>
            <div
              id="zipPasteSelectedPath"
              class="zip-paste-selected-path">
              ファイル未選択
            </div>
            <div
              id="zipPasteSelectedMeta"
              class="small">
            </div>
          </div>

          <div class="zip-paste-selected-actions">
            <button
              id="zipPasteCopyButton"
              type="button"
              onclick="copySelectedZipPasteFile()"
              disabled>
              📋 選択ファイルをコピー
            </button>

            <button
              id="zipPasteCompleteButton"
              type="button"
              class="btn-secondary"
              onclick="toggleSelectedZipPasteCompleted()"
              disabled>
              ✓ 手動で完了
            </button>
          </div>
        </div>

        <textarea
          id="zipPastePreview"
          class="zip-paste-preview"
          readonly
          spellcheck="false"
          placeholder="選択したファイルの内容を表示します"></textarea>
      </main>
    </div>
  </section>
</div>
`;
}

function ensureZipPasteManagerUi() {
  let overlay =
    getZipPasteManagerOverlay();

  if (overlay) {
    return overlay;
  }

  const wrap =
    document.createElement("div");

  wrap.innerHTML =
    buildZipPasteManagerHtml().trim();

  overlay =
    wrap.firstElementChild;

  document.body.appendChild(
    overlay
  );

  overlay.addEventListener(
    "click",
    function closeByBackdrop(event) {
      if (event.target === overlay) {
        closeZipPasteManager();
      }
    }
  );

  return overlay;
}

function openZipPasteManager() {
  const overlay =
    ensureZipPasteManagerUi();

  overlay.style.display =
    "flex";

  document.body.classList.add(
    "zip-paste-open"
  );

  renderZipPasteManager();
}

function closeZipPasteManager() {
  const overlay =
    getZipPasteManagerOverlay();

  if (!overlay) {
    return;
  }

  overlay.style.display =
    "none";

  document.body.classList.remove(
    "zip-paste-open"
  );
}

function selectZipForPasteManager() {
  if (
    typeof JSZip === "undefined"
  ) {
    alert(
      "JSZipが読み込まれていません"
    );
    return;
  }

  const input =
    document.createElement("input");

  input.type = "file";
  input.accept =
    ".zip,application/zip,application/x-zip-compressed";

  input.onchange = async event => {
    const file =
      event.target.files &&
      event.target.files[0];

    if (!file) {
      return;
    }

    await loadZipIntoPasteManager(
      file
    );
  };

  input.click();
}

async function loadZipIntoPasteManager(file) {
  openZipPasteManager();

  if (!file) {
    return;
  }

  if (
    file.size >
    ZIP_PASTE_MANAGER_MAX_ZIP_SIZE
  ) {
    alert(
      "ZIPファイルが大きすぎます。\n" +
      "100MB以下のZIPを選択してください。"
    );
    return;
  }

  zipPasteManagerState.busy = true;
  zipPasteManagerState.statusText =
    "ZIPを解析中...";
  renderZipPasteManager();

  try {
    const zip =
      await JSZip.loadAsync(file);

    const entries =
      Object.keys(zip.files)
        .filter(path => {
          const item =
            zip.files[path];

          return (
            item &&
            !item.dir &&
            !isIgnoredZipPastePath(path)
          );
        })
        .map(path => {
          const item =
            zip.files[path];

          return {
            path,
            name: getZipPasteBaseName(path),
            item,
            text: isZipPasteTextFile(path),
            size: getZipPasteEntrySize(item)
          };
        })
        .sort(compareZipPasteEntries);

    if (!entries.length) {
      throw new Error(
        "ZIP内に表示できるファイルがありません"
      );
    }

    if (
      entries.length >
      ZIP_PASTE_MANAGER_MAX_ENTRY_COUNT
    ) {
      throw new Error(
        "ZIP内のファイル数が多すぎます（上限5000件）"
      );
    }

    const knownTotalSize =
      entries.reduce(
        (total, entry) =>
          total +
          (entry.size || 0),
        0
      );

    if (
      knownTotalSize >
      ZIP_PASTE_MANAGER_MAX_TOTAL_SIZE
    ) {
      throw new Error(
        "ZIP展開後の合計サイズが大きすぎます（上限250MB）"
      );
    }

    const archiveId =
      createZipPasteArchiveId(
        file,
        entries
      );

    zipPasteManagerState.file = file;
    zipPasteManagerState.zip = zip;
    zipPasteManagerState.archiveId =
      archiveId;
    zipPasteManagerState.archiveName =
      file.name || "unknown.zip";
    zipPasteManagerState.entries =
      entries;
    zipPasteManagerState.entryMap =
      new Map(
        entries.map(entry => [
          entry.path,
          entry
        ])
      );
    zipPasteManagerState.completedPaths =
      loadZipPasteCompletedPaths(
        archiveId,
        entries
      );
    zipPasteManagerState.selectedPath =
      "";
    zipPasteManagerState.selectedText =
      "";
    zipPasteManagerState.selectedLoaded =
      false;
    zipPasteManagerState.searchText =
      "";
    zipPasteManagerState.incompleteOnly =
      false;
    zipPasteManagerState.statusText =
      entries.length +
      "ファイルを読み込みました";

    const searchInput =
      document.getElementById(
        "zipPasteSearchInput"
      );

    if (searchInput) {
      searchInput.value = "";
    }

    renderZipPasteManager();

    const first =
      getNextIncompleteZipPasteEntry() ||
      entries.find(entry => entry.text) ||
      entries[0];

    if (first) {
      await selectZipPasteFile(
        first.path
      );
    }

  } catch (error) {
    console.error(
      "ZIP貼付管理 読込失敗",
      error
    );

    zipPasteManagerState.statusText =
      "ZIP読込失敗";

    alert(
      "ZIPの読み込みに失敗しました\n\n" +
      (error && error.message
        ? error.message
        : String(error))
    );
  } finally {
    zipPasteManagerState.busy = false;
    renderZipPasteManager();
  }
}

function isIgnoredZipPastePath(path) {
  const value =
    String(path || "");

  return (
    /(^|\/)__MACOSX\//i.test(value) ||
    /(^|\/)\.DS_Store$/i.test(value)
  );
}

function getZipPasteBaseName(path) {
  const parts =
    String(path || "")
      .split("/")
      .filter(Boolean);

  return parts.length
    ? parts[parts.length - 1]
    : String(path || "");
}

function isZipPasteTextFile(path) {
  const lower =
    String(path || "")
      .toLowerCase();
  const baseName =
    getZipPasteBaseName(lower);

  const textExtensions = [
    ".html", ".htm", ".js", ".mjs", ".cjs",
    ".css", ".scss", ".sass", ".less", ".json",
    ".map", ".md", ".txt", ".log", ".xml",
    ".yml", ".yaml", ".csv", ".tsv", ".svg",
    ".sql", ".py", ".ts", ".tsx", ".jsx",
    ".vue", ".svelte", ".java", ".kt", ".kts",
    ".c", ".cpp", ".h", ".hpp", ".cs",
    ".swift", ".go", ".rs", ".dart", ".php",
    ".rb", ".r", ".lua", ".pl", ".sh",
    ".bat", ".cmd", ".ps1", ".ini", ".env",
    ".toml", ".conf", ".config", ".properties",
    ".lock", ".gradle", ".graphql", ".gql",
    ".proto", ".tf", ".hcl", ".gitignore",
    ".gitattributes", ".editorconfig", ".npmrc",
    ".nvmrc", ".prettierrc", ".eslintrc"
  ];

  const extensionlessTextNames =
    new Set([
      "dockerfile",
      "makefile",
      "license",
      "notice",
      "readme",
      "changelog",
      "authors",
      "contributors"
    ]);

  return (
    textExtensions.some(
      extension =>
        lower.endsWith(extension)
    ) ||
    extensionlessTextNames.has(
      baseName
    )
  );
}

function getZipPasteEntrySize(item) {
  const data =
    item && item._data;

  const size =
    data &&
    Number(data.uncompressedSize);

  return Number.isFinite(size)
    ? size
    : null;
}

function compareZipPasteEntries(a, b) {
  const priority = path => {
    const lower =
      String(path || "").toLowerCase();

    if (lower === "index.html") {
      return 0;
    }

    if (lower.endsWith("/index.html")) {
      return 1;
    }

    return 2;
  };

  const difference =
    priority(a.path) -
    priority(b.path);

  if (difference !== 0) {
    return difference;
  }

  return a.path.localeCompare(
    b.path,
    "ja",
    {
      numeric: true,
      sensitivity: "base"
    }
  );
}

function createZipPasteArchiveId(
  file,
  entries
) {
  const signature = [
    file.name || "",
    file.size || 0,
    file.lastModified || 0,
    ...entries.map(entry =>
      entry.path + ":" +
      (entry.size == null
        ? "?"
        : entry.size)
    )
  ].join("|");

  let hash = 2166136261;

  for (
    let index = 0;
    index < signature.length;
    index++
  ) {
    hash ^= signature.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (
    (hash >>> 0).toString(16) +
    "-" +
    entries.length
  );
}

function getZipPasteStorageKey(
  archiveId
) {
  return (
    ZIP_PASTE_MANAGER_STORAGE_PREFIX +
    archiveId
  );
}

function loadZipPasteCompletedPaths(
  archiveId,
  entries
) {
  const validPaths =
    new Set(
      entries.map(entry => entry.path)
    );

  try {
    const saved =
      JSON.parse(
        localStorage.getItem(
          getZipPasteStorageKey(
            archiveId
          )
        ) || "null"
      );

    const paths =
      saved &&
      Array.isArray(saved.completedPaths)
        ? saved.completedPaths
        : [];

    return new Set(
      paths.filter(path =>
        validPaths.has(path)
      )
    );
  } catch (error) {
    console.warn(
      "ZIP貼付管理 進捗読込失敗",
      error
    );
    return new Set();
  }
}

function saveZipPasteProgress() {
  const state =
    zipPasteManagerState;

  if (!state.archiveId) {
    return;
  }

  const data = {
    version:
      ZIP_PASTE_MANAGER_VERSION,
    archiveName:
      state.archiveName,
    completedPaths:
      [...state.completedPaths],
    updatedAt:
      new Date().toISOString()
  };

  try {
    localStorage.setItem(
      getZipPasteStorageKey(
        state.archiveId
      ),
      JSON.stringify(data)
    );
  } catch (error) {
    console.warn(
      "ZIP貼付管理 進捗保存失敗",
      error
    );
  }
}

function getFilteredZipPasteEntries() {
  const state =
    zipPasteManagerState;
  const query =
    state.searchText
      .trim()
      .toLowerCase();

  return state.entries.filter(entry => {
    if (state.incompleteOnly) {
      if (!entry.text) {
        return false;
      }

      if (
        state.completedPaths.has(
          entry.path
        )
      ) {
        return false;
      }
    }

    if (
      query &&
      !entry.path
        .toLowerCase()
        .includes(query)
    ) {
      return false;
    }

    return true;
  });
}

function renderZipPasteManager() {
  const overlay =
    getZipPasteManagerOverlay();

  if (!overlay) {
    return;
  }

  const state =
    zipPasteManagerState;
  const total =
    state.entries.filter(
      entry => entry.text
    ).length;
  const completed =
    [...state.completedPaths].filter(
      path => {
        const entry =
          state.entryMap.get(path);
        return entry && entry.text;
      }
    ).length;
  const percent =
    total
      ? Math.round(
          completed / total * 100
        )
      : 0;

  const archiveInfo =
    document.getElementById(
      "zipPasteArchiveInfo"
    );
  const progressText =
    document.getElementById(
      "zipPasteProgressText"
    );
  const progressBar =
    document.getElementById(
      "zipPasteProgressBar"
    );
  const statusText =
    document.getElementById(
      "zipPasteStatusText"
    );
  const incompleteButton =
    document.getElementById(
      "zipPasteIncompleteOnlyButton"
    );

  if (archiveInfo) {
    archiveInfo.textContent =
      state.archiveName
        ? state.archiveName +
          " / " +
          formatZipPasteBytes(
            state.file && state.file.size
          )
        : "ZIP未読込";
  }

  if (progressText) {
    progressText.textContent =
      completed +
      " / " +
      total +
      " 完了（" +
      percent +
      "%）";
  }

  if (progressBar) {
    progressBar.style.width =
      percent + "%";
  }

  if (statusText) {
    statusText.textContent =
      state.busy
        ? "処理中..."
        : state.statusText;
  }

  if (incompleteButton) {
    incompleteButton.textContent =
      "未完了のみ: " +
      (state.incompleteOnly
        ? "ON"
        : "OFF");
    incompleteButton.classList.toggle(
      "active",
      state.incompleteOnly
    );
  }

  renderZipPasteFileList();
  renderZipPasteSelectedFile();
}

function renderZipPasteFileList() {
  const list =
    document.getElementById(
      "zipPasteFileList"
    );

  if (!list) {
    return;
  }

  list.innerHTML = "";

  const entries =
    getFilteredZipPasteEntries();

  if (!zipPasteManagerState.entries.length) {
    const empty =
      document.createElement("div");
    empty.className =
      "zip-paste-empty";
    empty.textContent =
      "ZIPを読み込むとファイル一覧が表示されます";
    list.appendChild(empty);
    return;
  }

  if (!entries.length) {
    const empty =
      document.createElement("div");
    empty.className =
      "zip-paste-empty";
    empty.textContent =
      "条件に一致するファイルはありません";
    list.appendChild(empty);
    return;
  }

  entries.forEach(entry => {
    const completed =
      zipPasteManagerState
        .completedPaths
        .has(entry.path);

    const button =
      document.createElement("button");

    button.type = "button";
    button.className =
      "zip-paste-file-item" +
      (completed
        ? " completed"
        : "") +
      (
        entry.path ===
        zipPasteManagerState.selectedPath
          ? " selected"
          : ""
      );

    button.addEventListener(
      "click",
      () => selectZipPasteFile(
        entry.path
      )
    );

    const status =
      document.createElement("span");
    status.className =
      "zip-paste-file-status";
    status.textContent =
      completed
        ? "✓ 完了"
        : entry.text
          ? "未完了"
          : "対象外";

    const path =
      document.createElement("span");
    path.className =
      "zip-paste-file-path";
    path.textContent =
      entry.path;

    const meta =
      document.createElement("span");
    meta.className =
      "zip-paste-file-meta";
    meta.textContent =
      (
        entry.text
          ? "TEXT"
          : "BINARY"
      ) +
      (
        entry.size == null
          ? ""
          : " / " +
            formatZipPasteBytes(
              entry.size
            )
      );

    button.appendChild(status);
    button.appendChild(path);
    button.appendChild(meta);
    list.appendChild(button);
  });
}

async function selectZipPasteFile(path) {
  const state =
    zipPasteManagerState;
  const entry =
    state.entryMap.get(path);

  if (!entry) {
    return;
  }

  state.selectedPath = path;
  state.selectedText = "";
  state.selectedLoaded = false;
  state.statusText = entry.text
    ? "ファイル内容を読み込み中..."
    : "バイナリファイルはコピー対象外です";

  const token =
    ++state.selectedLoadToken;

  renderZipPasteManager();

  if (!entry.text) {
    return;
  }

  try {
    const text =
      await entry.item.async(
        "string"
      );

    if (
      token !==
      state.selectedLoadToken
    ) {
      return;
    }

    state.selectedText =
      normalizeZipPasteText(text);
    state.selectedLoaded = true;
    state.statusText =
      "コピーできます";

  } catch (error) {
    console.error(
      "ZIP内ファイル読込失敗",
      error
    );

    if (
      token ===
      state.selectedLoadToken
    ) {
      state.selectedText = "";
      state.selectedLoaded = false;
      state.statusText =
        "ファイル内容の読み込みに失敗しました";
    }
  }

  renderZipPasteManager();
}

function normalizeZipPasteText(text) {
  // GitHubへ貼り付ける内容を変えないため、
  // ZIP内の文字列をそのまま保持する。
  return String(
    text == null ? "" : text
  );
}

function renderZipPasteSelectedFile() {
  const state =
    zipPasteManagerState;
  const entry =
    state.entryMap.get(
      state.selectedPath
    );
  const path =
    document.getElementById(
      "zipPasteSelectedPath"
    );
  const meta =
    document.getElementById(
      "zipPasteSelectedMeta"
    );
  const preview =
    document.getElementById(
      "zipPastePreview"
    );
  const copyButton =
    document.getElementById(
      "zipPasteCopyButton"
    );
  const completeButton =
    document.getElementById(
      "zipPasteCompleteButton"
    );

  if (!entry) {
    if (path) {
      path.textContent =
        "ファイル未選択";
    }
    if (meta) {
      meta.textContent = "";
    }
    if (preview) {
      preview.value = "";
    }
    if (copyButton) {
      copyButton.disabled = true;
      copyButton.textContent =
        "📋 選択ファイルをコピー";
    }
    if (completeButton) {
      completeButton.disabled = true;
      completeButton.textContent =
        "✓ 手動で完了";
    }
    return;
  }

  const completed =
    state.completedPaths.has(
      entry.path
    );

  if (path) {
    path.textContent =
      entry.path;
  }

  if (meta) {
    meta.textContent =
      (
        entry.text
          ? "テキストファイル"
          : "バイナリファイル"
      ) +
      (
        entry.size == null
          ? ""
          : " / " +
            formatZipPasteBytes(
              entry.size
            )
      ) +
      (completed
        ? " / 完了"
        : " / 未完了");
  }

  if (preview) {
    if (!entry.text) {
      preview.value =
        "このファイルはバイナリ形式のため、内容表示・コピーの対象外です。";
    } else if (!state.selectedLoaded) {
      preview.value =
        "読み込み中...";
    } else if (
      state.selectedText.length >
      ZIP_PASTE_MANAGER_PREVIEW_LIMIT
    ) {
      preview.value =
        state.selectedText.slice(
          0,
          ZIP_PASTE_MANAGER_PREVIEW_LIMIT
        ) +
        "\n\n--- プレビュー上限のため省略 ---\n" +
        "コピー時はファイル全文をコピーします。";
    } else {
      preview.value =
        state.selectedText;
    }
  }

  if (copyButton) {
    copyButton.disabled =
      !entry.text ||
      !state.selectedLoaded;
    copyButton.textContent =
      completed
        ? "📋 再コピー（完了済み）"
        : "📋 選択ファイルをコピー";
  }

  if (completeButton) {
    completeButton.disabled =
      !entry.text;
    completeButton.textContent =
      completed
        ? "↩ 完了を解除"
        : "✓ 手動で完了";
  }
}

async function copySelectedZipPasteFile() {
  const state =
    zipPasteManagerState;
  const entry =
    state.entryMap.get(
      state.selectedPath
    );

  if (
    !entry ||
    !entry.text ||
    !state.selectedLoaded
  ) {
    state.statusText =
      "コピーできるファイルを選択してください";
    renderZipPasteManager();
    return;
  }

  const text =
    state.selectedText;

  let copied = false;

  try {
    if (
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(
        text
      );
      copied = true;
    } else if (
      typeof copyTextFallback ===
      "function"
    ) {
      copied =
        copyTextFallback(text);
    }
  } catch (error) {
    console.warn(
      "ZIP貼付管理 Clipboard失敗",
      error
    );

    if (
      typeof copyTextFallback ===
      "function"
    ) {
      copied =
        copyTextFallback(text);
    }
  }

  if (!copied) {
    const preview =
      document.getElementById(
        "zipPastePreview"
      );

    if (preview) {
      preview.focus();
      preview.select();
    }

    state.statusText =
      "自動コピーに失敗しました。表示内容を手動コピーしてください";
    renderZipPasteManager();
    return;
  }

  state.completedPaths.add(
    entry.path
  );
  state.statusText =
    "コピー完了: " +
    entry.path;

  saveZipPasteProgress();
  renderZipPasteManager();
}

function toggleSelectedZipPasteCompleted() {
  const state =
    zipPasteManagerState;
  const entry =
    state.entryMap.get(
      state.selectedPath
    );

  if (!entry || !entry.text) {
    return;
  }

  if (
    state.completedPaths.has(
      entry.path
    )
  ) {
    state.completedPaths.delete(
      entry.path
    );
    state.statusText =
      "完了解除: " +
      entry.path;
  } else {
    state.completedPaths.add(
      entry.path
    );
    state.statusText =
      "手動完了: " +
      entry.path;
  }

  saveZipPasteProgress();
  renderZipPasteManager();
}

function getNextIncompleteZipPasteEntry() {
  return zipPasteManagerState.entries.find(
    entry =>
      entry.text &&
      !zipPasteManagerState
        .completedPaths
        .has(entry.path)
  ) || null;
}

async function selectNextIncompleteZipPasteFile() {
  const next =
    getNextIncompleteZipPasteEntry();

  if (!next) {
    zipPasteManagerState.statusText =
      zipPasteManagerState.entries.length
        ? "コピー対象ファイルはすべて完了しています"
        : "ZIPを読み込んでください";
    renderZipPasteManager();
    return;
  }

  await selectZipPasteFile(
    next.path
  );
}

function filterZipPasteFiles(value) {
  zipPasteManagerState.searchText =
    String(value || "");
  renderZipPasteFileList();
}

function toggleZipPasteIncompleteOnly() {
  zipPasteManagerState.incompleteOnly =
    !zipPasteManagerState.incompleteOnly;
  renderZipPasteManager();
}

function resetZipPasteProgress() {
  const state =
    zipPasteManagerState;

  if (!state.archiveId) {
    state.statusText =
      "ZIPを読み込んでください";
    renderZipPasteManager();
    return;
  }

  const ok = confirm(
    "このZIPの完了表示をすべて解除しますか？"
  );

  if (!ok) {
    return;
  }

  state.completedPaths.clear();
  state.statusText =
    "完了表示をすべて解除しました";
  saveZipPasteProgress();
  renderZipPasteManager();
}

function formatZipPasteBytes(value) {
  const bytes =
    Number(value);

  if (!Number.isFinite(bytes)) {
    return "size unknown";
  }

  if (bytes < 1024) {
    return bytes + " B";
  }

  if (bytes < 1024 * 1024) {
    return (
      bytes / 1024
    ).toFixed(1) + " KB";
  }

  return (
    bytes / 1024 / 1024
  ).toFixed(1) + " MB";
}

window.openZipPasteManager =
  openZipPasteManager;
window.closeZipPasteManager =
  closeZipPasteManager;
window.selectZipForPasteManager =
  selectZipForPasteManager;
window.loadZipIntoPasteManager =
  loadZipIntoPasteManager;
window.selectZipPasteFile =
  selectZipPasteFile;
window.copySelectedZipPasteFile =
  copySelectedZipPasteFile;
window.toggleSelectedZipPasteCompleted =
  toggleSelectedZipPasteCompleted;
window.selectNextIncompleteZipPasteFile =
  selectNextIncompleteZipPasteFile;
window.filterZipPasteFiles =
  filterZipPasteFiles;
window.toggleZipPasteIncompleteOnly =
  toggleZipPasteIncompleteOnly;
window.resetZipPasteProgress =
  resetZipPasteProgress;
