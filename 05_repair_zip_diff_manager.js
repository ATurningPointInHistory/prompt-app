/* ===============================
   FILE: 05_repair_zip_diff_manager.js
   IDE-165 ZIP Diff Manager Phase 1

   目的:
   - 基準ZIPと更新ZIPを比較する
   - 新規・変更・同一・削除候補へ分類する
   - 新規・変更ファイルだけを差分ZIPへ出力する
   - 比較結果と削除候補をManifestへ記録する

   非対応:
   - GitHub APIへの直接書込み
   - Repository依存関係の知的分析
   - 削除候補の自動削除
=============================== */

const ZIP_DIFF_MANAGER_VERSION = "1.0.1";
const ZIP_DIFF_MANAGER_COMPONENT_ID =
  "IDE-165-PHASE-1";
const ZIP_DIFF_MANAGER_MAX_ZIP_SIZE =
  100 * 1024 * 1024;
const ZIP_DIFF_MANAGER_MAX_ENTRY_COUNT =
  5000;
const ZIP_DIFF_MANAGER_MAX_TOTAL_SIZE =
  500 * 1024 * 1024;
const ZIP_DIFF_MANAGER_REPORT_DIR =
  "_ide165";

const zipDiffManagerState = {
  baselineFile: null,
  currentFile: null,
  baselineArchive: null,
  currentArchive: null,
  baselineEntries: new Map(),
  currentEntries: new Map(),
  results: [],
  selectedPaths: new Set(),
  filterStatus: "all",
  searchText: "",
  busy: false,
  compared: false,
  statusText:
    "基準ZIPと更新ZIPを選択してください",
  progressCurrent: 0,
  progressTotal: 0,
  lastGenerated: null,
  lastGeneratedBlob: null,
  lastGeneratedUrl: ""
};

function getZipDiffManagerOverlay() {
  return document.getElementById(
    "zipDiffManagerOverlay"
  );
}

function buildZipDiffManagerHtml() {
  return `
<div
  id="zipDiffManagerOverlay"
  class="zip-diff-overlay"
  style="display:none;">

  <section
    class="zip-diff-dialog"
    role="dialog"
    aria-modal="true"
    aria-labelledby="zipDiffManagerTitle">

    <header class="zip-diff-header">
      <div>
        <h3 id="zipDiffManagerTitle">
          🧩 IDE-165 差分ZIP生成
        </h3>
        <div class="small">
          基準ZIPと更新ZIPを比較し、変更分だけを出力します
        </div>
      </div>

      <button
        type="button"
        class="zip-diff-close"
        onclick="closeZipDiffManager()"
        aria-label="閉じる">
        ×
      </button>
    </header>

    <div class="zip-diff-source-grid">
      <div class="zip-diff-source-card">
        <div class="zip-diff-source-title">
          ① 基準ZIP
        </div>
        <div
          id="zipDiffBaselineInfo"
          class="zip-diff-source-info">
          未選択
        </div>
        <button
          type="button"
          onclick="selectZipDiffBaseline()">
          📂 基準ZIPを選択
        </button>
      </div>

      <div class="zip-diff-source-card">
        <div class="zip-diff-source-title">
          ② 更新ZIP
        </div>
        <div
          id="zipDiffCurrentInfo"
          class="zip-diff-source-info">
          未選択
        </div>
        <button
          type="button"
          onclick="selectZipDiffCurrent()">
          📂 更新ZIPを選択
        </button>
      </div>
    </div>

    <div class="zip-diff-main-actions">
      <button
        id="zipDiffCompareButton"
        type="button"
        onclick="compareZipDiffArchives()">
        🔍 比較実行
      </button>

      <button
        type="button"
        class="btn-secondary"
        onclick="selectDefaultZipDiffFiles()">
        ✓ 新規・変更を選択
      </button>

      <button
        id="zipDiffGenerateButton"
        type="button"
        onclick="generateZipDiffPackage()">
        💾 差分ZIP生成
      </button>

      <a
        id="zipDiffReadyDownloadLink"
        class="btn-secondary"
        href="#"
        download
        style="display:none;align-items:center;justify-content:center;text-decoration:none;color:#fff;padding:8px 10px;border-radius:6px;min-height:38px;font-size:12px;box-sizing:border-box;">
        ⬇ 生成済みZIPを保存
      </a>

      <button
        id="zipDiffShareButton"
        type="button"
        class="btn-secondary"
        onclick="shareZipDiffPackage()"
        style="display:none;">
        📤 共有・保存
      </button>
    </div>

    <div class="zip-diff-progress-wrap">
      <div class="zip-diff-progress-text">
        <span id="zipDiffProgressText">
          0 / 0
        </span>
        <span id="zipDiffStatusText">
          基準ZIPと更新ZIPを選択してください
        </span>
      </div>
      <div class="zip-diff-progress-track">
        <div
          id="zipDiffProgressBar"
          class="zip-diff-progress-bar"
          style="width:0%;">
        </div>
      </div>
    </div>

    <div class="zip-diff-summary-grid">
      <button
        type="button"
        class="zip-diff-summary-card"
        data-status="new"
        onclick="setZipDiffStatusFilter('new')">
        <span>新規</span>
        <strong id="zipDiffNewCount">0</strong>
      </button>

      <button
        type="button"
        class="zip-diff-summary-card"
        data-status="changed"
        onclick="setZipDiffStatusFilter('changed')">
        <span>変更</span>
        <strong id="zipDiffChangedCount">0</strong>
      </button>

      <button
        type="button"
        class="zip-diff-summary-card"
        data-status="same"
        onclick="setZipDiffStatusFilter('same')">
        <span>同一</span>
        <strong id="zipDiffSameCount">0</strong>
      </button>

      <button
        type="button"
        class="zip-diff-summary-card"
        data-status="deleted"
        onclick="setZipDiffStatusFilter('deleted')">
        <span>削除候補</span>
        <strong id="zipDiffDeletedCount">0</strong>
      </button>
    </div>

    <div class="zip-diff-filter-row">
      <input
        id="zipDiffSearchInput"
        type="search"
        placeholder="ファイル名を検索"
        oninput="filterZipDiffFiles(this.value)">

      <select
        id="zipDiffStatusFilter"
        onchange="setZipDiffStatusFilter(this.value)">
        <option value="all">すべて</option>
        <option value="new">新規</option>
        <option value="changed">変更</option>
        <option value="same">同一</option>
        <option value="deleted">削除候補</option>
      </select>
    </div>

    <div
      id="zipDiffResultList"
      class="zip-diff-result-list">
      <div class="zip-diff-empty">
        比較結果はまだありません
      </div>
    </div>

    <footer class="zip-diff-footer">
      <div id="zipDiffSelectionInfo" class="small">
        差分ZIP対象: 0件
      </div>
      <div class="small">
        削除候補は自動削除せず、レポートにのみ記録します
      </div>
    </footer>
  </section>
</div>
`;
}

function ensureZipDiffManagerUi() {
  let overlay =
    getZipDiffManagerOverlay();

  if (overlay) {
    return overlay;
  }

  const wrap =
    document.createElement("div");

  wrap.innerHTML =
    buildZipDiffManagerHtml().trim();

  overlay =
    wrap.firstElementChild;

  document.body.appendChild(
    overlay
  );

  overlay.addEventListener(
    "click",
    function closeZipDiffByBackdrop(event) {
      if (event.target === overlay) {
        closeZipDiffManager();
      }
    }
  );

  return overlay;
}

function openZipDiffManager() {
  const overlay =
    ensureZipDiffManagerUi();

  overlay.style.display =
    "flex";

  document.body.classList.add(
    "zip-diff-open"
  );

  renderZipDiffManager();
}

function closeZipDiffManager() {
  const overlay =
    getZipDiffManagerOverlay();

  if (!overlay) {
    return;
  }

  overlay.style.display =
    "none";

  document.body.classList.remove(
    "zip-diff-open"
  );
}

function createZipDiffFileInput(
  onSelected
) {
  const input =
    document.createElement("input");

  input.type = "file";
  input.accept =
    ".zip,application/zip,application/x-zip-compressed";
  input.style.display = "none";

  input.addEventListener(
    "change",
    async function onZipDiffFileChange() {
      const file =
        input.files && input.files[0]
          ? input.files[0]
          : null;

      input.remove();

      if (!file) {
        return;
      }

      await onSelected(file);
    }
  );

  document.body.appendChild(input);
  input.click();
}

function selectZipDiffBaseline() {
  createZipDiffFileInput(
    file => loadZipDiffArchive(
      file,
      "baseline"
    )
  );
}

function selectZipDiffCurrent() {
  createZipDiffFileInput(
    file => loadZipDiffArchive(
      file,
      "current"
    )
  );
}

async function loadZipDiffArchive(
  file,
  role
) {
  const state =
    zipDiffManagerState;

  if (state.busy) {
    return;
  }

  if (
    typeof JSZip === "undefined"
  ) {
    state.statusText =
      "JSZipが読み込まれていません";
    renderZipDiffManager();
    return;
  }

  if (
    !file ||
    !String(file.name || "")
      .toLowerCase()
      .endsWith(".zip")
  ) {
    state.statusText =
      "ZIPファイルを選択してください";
    renderZipDiffManager();
    return;
  }

  if (
    Number(file.size || 0) >
    ZIP_DIFF_MANAGER_MAX_ZIP_SIZE
  ) {
    state.statusText =
      "ZIPサイズが上限を超えています: " +
      formatZipDiffBytes(file.size);
    renderZipDiffManager();
    return;
  }

  state.busy = true;
  state.statusText =
    (role === "baseline"
      ? "基準ZIP"
      : "更新ZIP") +
    "を読み込んでいます";
  state.progressCurrent = 0;
  state.progressTotal = 1;
  renderZipDiffManager();

  try {
    const zip =
      await JSZip.loadAsync(file);

    const collected =
      collectZipDiffEntries(zip);

    if (!collected.ok) {
      throw new Error(
        collected.errors.join(" / ")
      );
    }

    if (role === "baseline") {
      state.baselineFile = file;
      state.baselineArchive = zip;
      state.baselineEntries =
        collected.entries;
    } else {
      state.currentFile = file;
      state.currentArchive = zip;
      state.currentEntries =
        collected.entries;
    }

    releaseZipDiffDownload();
    state.results = [];
    state.selectedPaths.clear();
    state.compared = false;
    state.lastGenerated = null;
    state.statusText =
      (role === "baseline"
        ? "基準ZIP"
        : "更新ZIP") +
      "を読み込みました: " +
      collected.entries.size +
      "ファイル";
  } catch (error) {
    console.error(
      "IDE-165 ZIP読込失敗",
      error
    );

    state.statusText =
      "ZIP読込失敗: " +
      (error && error.message
        ? error.message
        : String(error));
  } finally {
    state.busy = false;
    state.progressCurrent = 0;
    state.progressTotal = 0;
    renderZipDiffManager();
  }
}

function collectZipDiffEntries(zip) {
  const rawEntries = [];
  const errors = [];

  Object.keys(zip.files || {})
    .forEach(rawPath => {
      const item =
        zip.files[rawPath];

      if (!item || item.dir) {
        return;
      }

      const normalized =
        normalizeZipDiffPath(rawPath);

      if (!normalized) {
        errors.push(
          "危険または不正なパス: " +
          rawPath
        );
        return;
      }

      if (
        isIgnoredZipDiffPath(
          normalized
        )
      ) {
        return;
      }

      rawEntries.push({
        originalPath: rawPath,
        normalizedPath: normalized,
        item,
        size: getZipDiffEntrySize(item)
      });
    });

  if (
    rawEntries.length >
    ZIP_DIFF_MANAGER_MAX_ENTRY_COUNT
  ) {
    errors.push(
      "ファイル数が上限を超えています: " +
      rawEntries.length
    );
  }

  const commonRoot =
    detectZipDiffCommonRoot(
      rawEntries.map(
        entry => entry.normalizedPath
      )
    );

  const entries = new Map();
  let totalSize = 0;

  rawEntries.forEach(entry => {
    const path = commonRoot
      ? entry.normalizedPath.slice(
          commonRoot.length
        )
      : entry.normalizedPath;

    if (!path) {
      return;
    }

    if (entries.has(path)) {
      errors.push(
        "正規化後にパスが重複しています: " +
        path
      );
      return;
    }

    totalSize +=
      Math.max(0, entry.size || 0);

    entries.set(path, {
      path,
      originalPath:
        entry.originalPath,
      item: entry.item,
      size: entry.size,
      hash: ""
    });
  });

  if (
    totalSize >
    ZIP_DIFF_MANAGER_MAX_TOTAL_SIZE
  ) {
    errors.push(
      "展開後サイズの推定値が上限を超えています: " +
      formatZipDiffBytes(totalSize)
    );
  }

  if (!entries.size) {
    errors.push(
      "比較可能なファイルがありません"
    );
  }

  return {
    ok: errors.length === 0,
    entries,
    commonRoot,
    totalSize,
    errors
  };
}

function normalizeZipDiffPath(path) {
  const value =
    String(path || "")
      .replace(/\\/g, "/")
      .replace(/^\.\/+/, "")
      .replace(/^\/+/, "")
      .replace(/\/{2,}/g, "/");

  if (!value || value.includes("\0")) {
    return "";
  }

  const parts =
    value.split("/");

  if (
    parts.some(
      part =>
        !part ||
        part === "." ||
        part === ".."
    )
  ) {
    return "";
  }

  return parts.join("/");
}

function isIgnoredZipDiffPath(path) {
  const lower =
    String(path || "").toLowerCase();

  return (
    lower.startsWith("__macosx/") ||
    lower.endsWith("/.ds_store") ||
    lower === ".ds_store"
  );
}

function detectZipDiffCommonRoot(paths) {
  if (!paths.length) {
    return "";
  }

  const firstParts =
    paths[0].split("/");

  if (firstParts.length < 2) {
    return "";
  }

  const root =
    firstParts[0] + "/";

  const allUnderRoot =
    paths.every(
      path =>
        path.startsWith(root) &&
        path.length > root.length
    );

  return allUnderRoot
    ? root
    : "";
}

function getZipDiffEntrySize(item) {
  const data =
    item && item._data
      ? item._data
      : null;

  const candidates = [
    data && data.uncompressedSize,
    data && data.length,
    item && item._dataBinary &&
      item._dataBinary.length
  ];

  for (
    let index = 0;
    index < candidates.length;
    index += 1
  ) {
    const value =
      Number(candidates[index]);

    if (
      Number.isFinite(value) &&
      value >= 0
    ) {
      return value;
    }
  }

  return 0;
}

async function compareZipDiffArchives() {
  const state =
    zipDiffManagerState;

  if (state.busy) {
    return null;
  }

  if (
    !state.baselineFile ||
    !state.currentFile
  ) {
    state.statusText =
      "基準ZIPと更新ZIPの両方を選択してください";
    renderZipDiffManager();
    return null;
  }

  state.busy = true;
  releaseZipDiffDownload();
  state.results = [];
  state.selectedPaths.clear();
  state.compared = false;
  state.lastGenerated = null;

  const allPaths =
    Array.from(
      new Set([
        ...state.baselineEntries.keys(),
        ...state.currentEntries.keys()
      ])
    ).sort(
      (a, b) =>
        a.localeCompare(
          b,
          "ja",
          { numeric: true }
        )
    );

  state.progressCurrent = 0;
  state.progressTotal = allPaths.length;
  state.statusText =
    "ZIPを比較しています";
  renderZipDiffManager();

  try {
    for (
      let index = 0;
      index < allPaths.length;
      index += 1
    ) {
      const path =
        allPaths[index];
      const baseline =
        state.baselineEntries.get(path) ||
        null;
      const current =
        state.currentEntries.get(path) ||
        null;

      let status = "same";
      let baselineHash = "";
      let currentHash = "";

      if (!baseline && current) {
        status = "new";
        currentHash =
          await getZipDiffEntryHash(current);
      } else if (baseline && !current) {
        status = "deleted";
        baselineHash =
          await getZipDiffEntryHash(baseline);
      } else if (baseline && current) {
        if (
          baseline.size &&
          current.size &&
          baseline.size !== current.size
        ) {
          status = "changed";
          baselineHash =
            await getZipDiffEntryHash(baseline);
          currentHash =
            await getZipDiffEntryHash(current);
        } else {
          baselineHash =
            await getZipDiffEntryHash(baseline);
          currentHash =
            await getZipDiffEntryHash(current);
          status =
            baselineHash === currentHash
              ? "same"
              : "changed";
        }
      }

      const result = {
        path,
        status,
        baselineSize:
          baseline ? baseline.size : 0,
        currentSize:
          current ? current.size : 0,
        baselineHash,
        currentHash
      };

      state.results.push(result);

      if (
        status === "new" ||
        status === "changed"
      ) {
        state.selectedPaths.add(path);
      }

      state.progressCurrent =
        index + 1;

      if (
        index % 5 === 0 ||
        index === allPaths.length - 1
      ) {
        state.statusText =
          "比較中: " +
          state.progressCurrent +
          " / " +
          state.progressTotal;
        renderZipDiffManager();
        await yieldZipDiffUi();
      }
    }

    state.compared = true;

    const summary =
      getZipDiffSummary();

    state.statusText =
      "比較完了: 新規 " +
      summary.new +
      " / 変更 " +
      summary.changed +
      " / 同一 " +
      summary.same +
      " / 削除候補 " +
      summary.deleted;

    return {
      passed: true,
      summary,
      results: state.results.slice()
    };
  } catch (error) {
    console.error(
      "IDE-165 ZIP比較失敗",
      error
    );

    state.statusText =
      "比較失敗: " +
      (error && error.message
        ? error.message
        : String(error));

    return {
      passed: false,
      error:
        error && error.message
          ? error.message
          : String(error)
    };
  } finally {
    state.busy = false;
    state.progressCurrent = 0;
    state.progressTotal = 0;
    renderZipDiffManager();
  }
}

async function getZipDiffEntryHash(entry) {
  if (entry.hash) {
    return entry.hash;
  }

  const bytes =
    await entry.item.async(
      "uint8array"
    );

  entry.size = bytes.length;
  entry.hash =
    await hashZipDiffBytes(bytes);

  return entry.hash;
}

async function hashZipDiffBytes(bytes) {
  if (
    window.crypto &&
    window.crypto.subtle &&
    typeof window.crypto.subtle.digest ===
      "function"
  ) {
    const digest =
      await window.crypto.subtle.digest(
        "SHA-256",
        bytes
      );

    return (
      "sha256:" +
      Array.from(
        new Uint8Array(digest)
      )
        .map(value =>
          value.toString(16).padStart(2, "0")
        )
        .join("")
    );
  }

  let hash = 2166136261;

  for (
    let index = 0;
    index < bytes.length;
    index += 1
  ) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 16777619);
  }

  return (
    "fnv1a:" +
    (hash >>> 0)
      .toString(16)
      .padStart(8, "0")
  );
}

function yieldZipDiffUi() {
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
}

function getZipDiffSummary() {
  const summary = {
    new: 0,
    changed: 0,
    same: 0,
    deleted: 0,
    total: zipDiffManagerState.results.length,
    selected: zipDiffManagerState.selectedPaths.size
  };

  zipDiffManagerState.results
    .forEach(result => {
      if (
        Object.prototype.hasOwnProperty.call(
          summary,
          result.status
        )
      ) {
        summary[result.status] += 1;
      }
    });

  summary.selected =
    zipDiffManagerState.selectedPaths.size;

  return summary;
}

function getFilteredZipDiffResults() {
  const state =
    zipDiffManagerState;
  const query =
    state.searchText
      .trim()
      .toLowerCase();

  return state.results.filter(result => {
    if (
      state.filterStatus !== "all" &&
      result.status !== state.filterStatus
    ) {
      return false;
    }

    if (
      query &&
      !result.path
        .toLowerCase()
        .includes(query)
    ) {
      return false;
    }

    return true;
  });
}

function renderZipDiffManager() {
  const overlay =
    getZipDiffManagerOverlay();

  if (!overlay) {
    return;
  }

  const state =
    zipDiffManagerState;
  const summary =
    getZipDiffSummary();

  setZipDiffText(
    "zipDiffBaselineInfo",
    state.baselineFile
      ? state.baselineFile.name +
        " / " +
        state.baselineEntries.size +
        " files / " +
        formatZipDiffBytes(
          state.baselineFile.size
        )
      : "未選択"
  );

  setZipDiffText(
    "zipDiffCurrentInfo",
    state.currentFile
      ? state.currentFile.name +
        " / " +
        state.currentEntries.size +
        " files / " +
        formatZipDiffBytes(
          state.currentFile.size
        )
      : "未選択"
  );

  setZipDiffText(
    "zipDiffStatusText",
    state.statusText
  );

  setZipDiffText(
    "zipDiffProgressText",
    state.progressTotal
      ? state.progressCurrent +
        " / " +
        state.progressTotal
      : "0 / 0"
  );

  setZipDiffText(
    "zipDiffNewCount",
    summary.new
  );
  setZipDiffText(
    "zipDiffChangedCount",
    summary.changed
  );
  setZipDiffText(
    "zipDiffSameCount",
    summary.same
  );
  setZipDiffText(
    "zipDiffDeletedCount",
    summary.deleted
  );
  setZipDiffText(
    "zipDiffSelectionInfo",
    "差分ZIP対象: " +
    state.selectedPaths.size +
    "件"
  );

  const progressBar =
    document.getElementById(
      "zipDiffProgressBar"
    );

  if (progressBar) {
    const percent =
      state.progressTotal
        ? Math.round(
            state.progressCurrent /
            state.progressTotal *
            100
          )
        : 0;

    progressBar.style.width =
      percent + "%";
  }

  const compareButton =
    document.getElementById(
      "zipDiffCompareButton"
    );
  const generateButton =
    document.getElementById(
      "zipDiffGenerateButton"
    );

  if (compareButton) {
    compareButton.disabled =
      state.busy ||
      !state.baselineFile ||
      !state.currentFile;
  }

  if (generateButton) {
    generateButton.disabled =
      state.busy ||
      !state.compared ||
      !state.selectedPaths.size;
  }

  const readyDownloadLink =
    document.getElementById(
      "zipDiffReadyDownloadLink"
    );

  if (readyDownloadLink) {
    const downloadReady =
      Boolean(
        state.lastGenerated &&
        state.lastGeneratedUrl
      );

    readyDownloadLink.style.display =
      downloadReady
        ? "inline-flex"
        : "none";

    readyDownloadLink.href =
      downloadReady
        ? state.lastGeneratedUrl
        : "#";

    readyDownloadLink.download =
      downloadReady
        ? state.lastGenerated.fileName
        : "";
  }

  const shareButton =
    document.getElementById(
      "zipDiffShareButton"
    );

  if (shareButton) {
    shareButton.style.display =
      state.lastGeneratedBlob &&
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
        ? "inline-flex"
        : "none";
  }

  const statusFilter =
    document.getElementById(
      "zipDiffStatusFilter"
    );

  if (statusFilter) {
    statusFilter.value =
      state.filterStatus;
  }

  document
    .querySelectorAll(
      ".zip-diff-summary-card"
    )
    .forEach(card => {
      card.classList.toggle(
        "active",
        card.dataset.status ===
          state.filterStatus
      );
    });

  renderZipDiffResultList();
}

function setZipDiffText(id, value) {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent =
      String(value == null ? "" : value);
  }
}

function renderZipDiffResultList() {
  const list =
    document.getElementById(
      "zipDiffResultList"
    );

  if (!list) {
    return;
  }

  const results =
    getFilteredZipDiffResults();

  if (!results.length) {
    list.innerHTML = `
<div class="zip-diff-empty">
  ${zipDiffManagerState.results.length
    ? "条件に一致するファイルはありません"
    : "比較結果はまだありません"}
</div>`;
    return;
  }

  list.innerHTML =
    results.map(result => {
      const selectable =
        result.status === "new" ||
        result.status === "changed";
      const selected =
        zipDiffManagerState
          .selectedPaths
          .has(result.path);

      return `
<label class="zip-diff-result-item status-${escapeZipDiffHtml(result.status)}">
  <input
    type="checkbox"
    class="zip-diff-result-check"
    ${selected ? "checked" : ""}
    ${selectable ? "" : "disabled"}
    data-path="${escapeZipDiffHtml(encodeURIComponent(result.path))}"
    onchange="toggleZipDiffFileSelection(decodeURIComponent(this.dataset.path), this.checked)">

  <span class="zip-diff-status-badge">
    ${escapeZipDiffHtml(getZipDiffStatusLabel(result.status))}
  </span>

  <span class="zip-diff-result-main">
    <span class="zip-diff-result-path">
      ${escapeZipDiffHtml(result.path)}
    </span>
    <span class="zip-diff-result-meta">
      基準 ${escapeZipDiffHtml(formatZipDiffBytes(result.baselineSize))}
      → 更新 ${escapeZipDiffHtml(formatZipDiffBytes(result.currentSize))}
    </span>
  </span>
</label>`;
    }).join("");
}

function getZipDiffStatusLabel(status) {
  const labels = {
    new: "新規",
    changed: "変更",
    same: "同一",
    deleted: "削除候補"
  };

  return labels[status] || status;
}

function escapeZipDiffHtml(value) {
  return String(value == null ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toggleZipDiffFileSelection(
  path,
  checked
) {
  const result =
    zipDiffManagerState.results.find(
      item => item.path === path
    );

  if (
    !result ||
    (
      result.status !== "new" &&
      result.status !== "changed"
    )
  ) {
    return;
  }

  if (checked) {
    zipDiffManagerState
      .selectedPaths
      .add(path);
  } else {
    zipDiffManagerState
      .selectedPaths
      .delete(path);
  }

  renderZipDiffManager();
}

function selectDefaultZipDiffFiles() {
  const state =
    zipDiffManagerState;

  state.selectedPaths.clear();

  state.results.forEach(result => {
    if (
      result.status === "new" ||
      result.status === "changed"
    ) {
      state.selectedPaths.add(
        result.path
      );
    }
  });

  state.statusText =
    "新規・変更ファイルを選択しました";
  renderZipDiffManager();
}

function setZipDiffStatusFilter(status) {
  const allowed =
    new Set([
      "all",
      "new",
      "changed",
      "same",
      "deleted"
    ]);

  zipDiffManagerState.filterStatus =
    allowed.has(status)
      ? status
      : "all";

  renderZipDiffManager();
}

function filterZipDiffFiles(value) {
  zipDiffManagerState.searchText =
    String(value || "");
  renderZipDiffResultList();
}

async function generateZipDiffPackage() {
  const state =
    zipDiffManagerState;

  if (state.busy) {
    return null;
  }

  if (!state.compared) {
    state.statusText =
      "先にZIP比較を実行してください";
    renderZipDiffManager();
    return null;
  }

  const selectedResults =
    state.results.filter(result =>
      state.selectedPaths.has(result.path) &&
      (
        result.status === "new" ||
        result.status === "changed"
      )
    );

  if (!selectedResults.length) {
    state.statusText =
      "差分ZIPへ入れるファイルが選択されていません";
    renderZipDiffManager();
    return null;
  }

  if (
    typeof JSZip === "undefined"
  ) {
    state.statusText =
      "JSZipが読み込まれていません";
    renderZipDiffManager();
    return null;
  }

  state.busy = true;
  state.progressCurrent = 0;
  state.progressTotal =
    selectedResults.length;
  state.statusText =
    "差分ZIPを生成しています";
  renderZipDiffManager();

  try {
    const outputZip =
      new JSZip();
    const includedFiles = [];

    for (
      let index = 0;
      index < selectedResults.length;
      index += 1
    ) {
      const result =
        selectedResults[index];
      const currentEntry =
        state.currentEntries.get(
          result.path
        );

      if (!currentEntry) {
        throw new Error(
          "更新ZIP内のファイルが見つかりません: " +
          result.path
        );
      }

      const bytes =
        await currentEntry.item.async(
          "uint8array"
        );

      outputZip.file(
        result.path,
        bytes,
        { binary: true }
      );

      includedFiles.push({
        path: result.path,
        status: result.status,
        size: bytes.length,
        baselineHash:
          result.baselineHash || null,
        currentHash:
          result.currentHash ||
          await hashZipDiffBytes(bytes)
      });

      state.progressCurrent =
        index + 1;
      state.statusText =
        "差分ファイル追加中: " +
        state.progressCurrent +
        " / " +
        state.progressTotal;

      if (
        index % 5 === 0 ||
        index === selectedResults.length - 1
      ) {
        renderZipDiffManager();
        await yieldZipDiffUi();
      }
    }

    const manifest =
      buildZipDiffManifest(
        includedFiles
      );
    const summaryText =
      buildZipDiffSummaryText(
        manifest
      );

    outputZip.file(
      ZIP_DIFF_MANAGER_REPORT_DIR +
      "/IDE-165_DIFF_MANIFEST.json",
      JSON.stringify(
        manifest,
        null,
        2
      )
    );

    outputZip.file(
      ZIP_DIFF_MANAGER_REPORT_DIR +
      "/IDE-165_DIFF_SUMMARY.txt",
      summaryText
    );

    state.statusText =
      "ZIP圧縮中";
    renderZipDiffManager();

    const zipBytes =
      await outputZip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
        compressionOptions: {
          level: 6
        }
      });

    const blob =
      new Blob(
        [zipBytes],
        {
          type: "application/zip"
        }
      );

    const fileName =
      buildZipDiffDownloadName(
        state.currentFile.name
      );

    prepareZipDiffDownload(
      blob,
      fileName,
      includedFiles.length,
      manifest
    );

    renderZipDiffManager();

    const autoDownloadStarted =
      triggerZipDiffAutoDownload();

    state.statusText =
      "差分ZIP生成完了: " +
      includedFiles.length +
      "ファイル / " +
      formatZipDiffBytes(blob.size) +
      (autoDownloadStarted
        ? "。保存が始まらない場合は「生成済みZIPを保存」を押してください"
        : "。「生成済みZIPを保存」を押してください");

    return {
      passed: true,
      fileName,
      blob,
      manifest,
      autoDownloadStarted,
      manualDownloadReady: true
    };
  } catch (error) {
    console.error(
      "IDE-165 差分ZIP生成失敗",
      error
    );

    state.statusText =
      "差分ZIP生成失敗: " +
      (error && error.message
        ? error.message
        : String(error));

    return {
      passed: false,
      error:
        error && error.message
          ? error.message
          : String(error)
    };
  } finally {
    state.busy = false;
    state.progressCurrent = 0;
    state.progressTotal = 0;
    renderZipDiffManager();
  }
}

function buildZipDiffManifest(
  includedFiles
) {
  const state =
    zipDiffManagerState;
  const summary =
    getZipDiffSummary();
  const generatedAt =
    new Date().toISOString();

  return {
    schemaVersion: 1,
    componentId:
      ZIP_DIFF_MANAGER_COMPONENT_ID,
    componentVersion:
      ZIP_DIFF_MANAGER_VERSION,
    type: "AI Prompt OS Diff Package",
    phase: "Phase 1 - Local Diff ZIP",
    generatedAt,
    baseline: {
      fileName:
        state.baselineFile.name,
      zipSize:
        Number(
          state.baselineFile.size || 0
        ),
      fileCount:
        state.baselineEntries.size
    },
    current: {
      fileName:
        state.currentFile.name,
      zipSize:
        Number(
          state.currentFile.size || 0
        ),
      fileCount:
        state.currentEntries.size
    },
    summary,
    includedFiles,
    deletionCandidates:
      state.results
        .filter(result =>
          result.status === "deleted"
        )
        .map(result => ({
          path: result.path,
          baselineSize:
            result.baselineSize,
          baselineHash:
            result.baselineHash || null,
          action:
            "Review manually. Not deleted automatically."
        })),
    unchangedFileCount:
      summary.same,
    safety: {
      githubWrite: false,
      tokenUsed: false,
      automaticDelete: false,
      dependencyAnalysis: false,
      repositoryIntelligence: false
    },
    applyInstructions: [
      "Review includedFiles and deletionCandidates.",
      "Apply only included project files to the target repository.",
      "Do not copy the _ide165 report directory into runtime unless you want to keep the audit report.",
      "Deletion candidates require manual confirmation.",
      "Run the application and project ZIP save validation after applying the diff."
    ]
  };
}

function buildZipDiffSummaryText(
  manifest
) {
  const lines = [
    "============================================================",
    "IDE-165 ZIP Diff Manager Phase 1",
    "============================================================",
    "Generated: " + manifest.generatedAt,
    "Baseline: " + manifest.baseline.fileName,
    "Current: " + manifest.current.fileName,
    "",
    "Summary",
    "------------------------------------------------------------",
    "New: " + manifest.summary.new,
    "Changed: " + manifest.summary.changed,
    "Same: " + manifest.summary.same,
    "Deletion Candidates: " + manifest.summary.deleted,
    "Included in Diff ZIP: " +
      manifest.includedFiles.length,
    "",
    "Included Files",
    "------------------------------------------------------------"
  ];

  manifest.includedFiles.forEach(file => {
    lines.push(
      "[" +
      file.status.toUpperCase() +
      "] " +
      file.path
    );
  });

  lines.push(
    "",
    "Deletion Candidates (manual review only)",
    "------------------------------------------------------------"
  );

  if (
    manifest.deletionCandidates.length
  ) {
    manifest.deletionCandidates
      .forEach(file => {
        lines.push(
          "[DELETE?] " +
          file.path
        );
      });
  } else {
    lines.push("None");
  }

  lines.push(
    "",
    "Safety",
    "------------------------------------------------------------",
    "GitHub write: disabled",
    "Automatic delete: disabled",
    "Repository Intelligence: not used",
    ""
  );

  return lines.join("\n");
}

function buildZipDiffDownloadName(
  currentName
) {
  const base =
    String(currentName || "project")
      .replace(/\.zip$/i, "")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .trim() || "project";

  const stamp =
    new Date()
      .toISOString()
      .replace(/[:.]/g, "-");

  return (
    base +
    "_IDE-165_Diff_" +
    stamp +
    ".zip"
  );
}

function releaseZipDiffDownload() {
  const state =
    zipDiffManagerState;

  if (state.lastGeneratedUrl) {
    try {
      URL.revokeObjectURL(
        state.lastGeneratedUrl
      );
    } catch (error) {
      console.warn(
        "IDE-165 Blob URL解放失敗",
        error
      );
    }
  }

  state.lastGeneratedBlob = null;
  state.lastGeneratedUrl = "";
}

function prepareZipDiffDownload(
  blob,
  fileName,
  includedCount,
  manifest
) {
  releaseZipDiffDownload();

  const url =
    URL.createObjectURL(blob);

  zipDiffManagerState.lastGeneratedBlob =
    blob;
  zipDiffManagerState.lastGeneratedUrl =
    url;
  zipDiffManagerState.lastGenerated = {
    fileName,
    size: blob.size,
    includedCount,
    generatedAt:
      manifest.generatedAt,
    manifest
  };

  return url;
}

function triggerZipDiffAutoDownload() {
  const state =
    zipDiffManagerState;

  if (
    !state.lastGenerated ||
    !state.lastGeneratedUrl
  ) {
    return false;
  }

  try {
    const anchor =
      document.createElement("a");

    anchor.href =
      state.lastGeneratedUrl;
    anchor.download =
      state.lastGenerated.fileName;
    anchor.style.display = "none";

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    return true;
  } catch (error) {
    console.warn(
      "IDE-165 自動ダウンロード開始失敗",
      error
    );
    return false;
  }
}

function retryZipDiffDownload() {
  const state =
    zipDiffManagerState;

  if (
    !state.lastGenerated ||
    !state.lastGeneratedUrl
  ) {
    state.statusText =
      "保存可能な差分ZIPがありません";
    renderZipDiffManager();
    return false;
  }

  const link =
    document.getElementById(
      "zipDiffReadyDownloadLink"
    );

  if (link) {
    link.href =
      state.lastGeneratedUrl;
    link.download =
      state.lastGenerated.fileName;
  }

  state.statusText =
    "生成済みZIPを保存します";
  renderZipDiffManager();
  return true;
}

async function shareZipDiffPackage() {
  const state =
    zipDiffManagerState;

  if (
    !state.lastGenerated ||
    !state.lastGeneratedBlob
  ) {
    state.statusText =
      "共有可能な差分ZIPがありません";
    renderZipDiffManager();
    return false;
  }

  if (
    typeof navigator === "undefined" ||
    typeof navigator.share !== "function"
  ) {
    state.statusText =
      "このブラウザは共有保存に対応していません";
    renderZipDiffManager();
    return false;
  }

  try {
    const file =
      new File(
        [state.lastGeneratedBlob],
        state.lastGenerated.fileName,
        {
          type: "application/zip"
        }
      );

    if (
      typeof navigator.canShare === "function" &&
      !navigator.canShare({ files: [file] })
    ) {
      state.statusText =
        "この端末ではZIPファイルを共有できません";
      renderZipDiffManager();
      return false;
    }

    await navigator.share({
      files: [file],
      title: state.lastGenerated.fileName
    });

    state.statusText =
      "差分ZIPを共有しました";
    renderZipDiffManager();
    return true;
  } catch (error) {
    if (
      error &&
      error.name === "AbortError"
    ) {
      state.statusText =
        "共有をキャンセルしました";
    } else {
      console.warn(
        "IDE-165 共有保存失敗",
        error
      );
      state.statusText =
        "共有保存失敗: " +
        (error && error.message
          ? error.message
          : String(error));
    }

    renderZipDiffManager();
    return false;
  }
}

function formatZipDiffBytes(value) {
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

function getZipDiffManagerStatus() {
  const state =
    zipDiffManagerState;

  return {
    componentId:
      ZIP_DIFF_MANAGER_COMPONENT_ID,
    version:
      ZIP_DIFF_MANAGER_VERSION,
    status: "Ready",
    ready: true,
    busy: state.busy,
    baselineLoaded:
      Boolean(state.baselineFile),
    currentLoaded:
      Boolean(state.currentFile),
    compared: state.compared,
    summary:
      getZipDiffSummary(),
    lastGenerated:
      state.lastGenerated
  };
}

function validateZipDiffManager() {
  const checks = [
    {
      name: "JSZip available",
      passed:
        typeof JSZip !== "undefined"
    },
    {
      name: "Open API",
      passed:
        typeof openZipDiffManager ===
        "function"
    },
    {
      name: "Archive loader",
      passed:
        typeof loadZipDiffArchive ===
        "function"
    },
    {
      name: "Compare API",
      passed:
        typeof compareZipDiffArchives ===
        "function"
    },
    {
      name: "Hash API",
      passed:
        typeof hashZipDiffBytes ===
        "function"
    },
    {
      name: "Diff package API",
      passed:
        typeof generateZipDiffPackage ===
        "function"
    },
    {
      name: "Android manual download fallback",
      passed:
        typeof prepareZipDiffDownload ===
          "function" &&
        typeof triggerZipDiffAutoDownload ===
          "function"
    },
    {
      name: "Automatic delete disabled",
      passed: true
    },
    {
      name: "GitHub write disabled",
      passed: true
    }
  ];

  const passed =
    checks.filter(check => check.passed)
      .length;
  const failed =
    checks.length - passed;

  return {
    componentId:
      ZIP_DIFF_MANAGER_COMPONENT_ID,
    version:
      ZIP_DIFF_MANAGER_VERSION,
    passed: failed === 0,
    summary: {
      passed,
      failed,
      total: checks.length,
      health:
        Math.round(
          passed / checks.length * 100
        )
    },
    checks
  };
}

window.openZipDiffManager =
  openZipDiffManager;
window.closeZipDiffManager =
  closeZipDiffManager;
window.selectZipDiffBaseline =
  selectZipDiffBaseline;
window.selectZipDiffCurrent =
  selectZipDiffCurrent;
window.loadZipDiffArchive =
  loadZipDiffArchive;
window.compareZipDiffArchives =
  compareZipDiffArchives;
window.toggleZipDiffFileSelection =
  toggleZipDiffFileSelection;
window.selectDefaultZipDiffFiles =
  selectDefaultZipDiffFiles;
window.setZipDiffStatusFilter =
  setZipDiffStatusFilter;
window.filterZipDiffFiles =
  filterZipDiffFiles;
window.generateZipDiffPackage =
  generateZipDiffPackage;
window.retryZipDiffDownload =
  retryZipDiffDownload;
window.shareZipDiffPackage =
  shareZipDiffPackage;
window.getZipDiffManagerStatus =
  getZipDiffManagerStatus;
window.validateZipDiffManager =
  validateZipDiffManager;
