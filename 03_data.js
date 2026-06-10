/* ===============================
   FILE: 03_data.js
   Data / Settings / Managers
=============================== */

/* ===============================
   Manager Toggle
=============================== */

function toggleTemplateManager() {
  const isOpen = get("template-manager").style.display !== "none";
  closeAllManagers();
  if (!isOpen) {
    get("template-manager").style.display = "block";
    renderTemplates();
    renderTemplateSelect();
  }
  updatePanelButtonStates();
}

function toggleDangerManager() {
  const isOpen = get("danger-manager").style.display !== "none";
  closeAllManagers();
  if (!isOpen) {
    get("danger-manager").style.display = "block";
    renderDangerWords();
  }
  updatePanelButtonStates();
}

function togglePatternManager() {
  const isOpen = get("pattern-manager").style.display !== "none";
  closeAllManagers();
  if (!isOpen) {
    get("pattern-manager").style.display = "block";
    renderPatterns();
  }
  updatePanelButtonStates();
}

function toggleAiPresetManager() {
  const isOpen = get("ai-preset-manager").style.display !== "none";
  closeAllManagers();

  if (!isOpen) {
    get("ai-preset-manager").style.display = "block";
    loadAiPresetToEditor();
  }
  updatePanelButtonStates();
}

/* ===============================
   AI Preset Management
=============================== */

function loadAiPresetToEditor() {
  const target = get("aiPresetTarget").value;
  const preset = getAiPreset(target);
  get("aiPresetName").value = preset.name || "";
  get("aiPresetInstruction").value = preset.instruction || "";
}

function saveAiPresetFromEditor() {
  const target = get("aiPresetTarget").value;
  const name = get("aiPresetName").value.trim();
  const instruction = get("aiPresetInstruction").value.trim();
  if (!name || !instruction) {
    alert("表示名と変換方針を入力してください");
    return;
  }
  const presets = getAiPresets();
  presets[target] = {
    name,
    instruction
  };
  saveAiPresets(presets);
  alert("AIプリセットを保存しました");
}

function resetAiPreset() {
  const target = get("aiPresetTarget").value;
  const saved = loadJson("aiPresets", {});
  delete saved[target];
  saveAiPresets(saved);
  loadAiPresetToEditor();
  alert("初期値に戻しました");
}


/* ===============================
   Danger Word Management
=============================== */

function saveDangerWord() {
  const word = get("dangerWord").value.trim();
  if (!word) {
    alert("危険ワードを入力してください");
    return;
  }
  let list = loadJson("dangerWords", []);
  if (defaultDangerWords.includes(word) || list.includes(word)) {
    alert("すでに登録されています");
    return;
  }
  list.push(word);
  localStorage.setItem("dangerWords", JSON.stringify(list));
  get("dangerWord").value = "";
  renderDangerWords();
}

function renderDangerWords() {
  const local = loadJson("dangerWords", []);
  const all = [...defaultDangerWords, ...local];
  get("dangerList").innerHTML = all.map((word, i) => `
    <div class="danger-item">
      <b>${escapeHtml(word)}</b>
      <div class="item-actions">
        ${
          i >= defaultDangerWords.length
            ? `<button onclick="deleteDangerWord(${i - defaultDangerWords.length})">削除</button>`
            : `<span class="small">固定ワード</span>`
        }
      </div>
    </div>
  `).join("");
}

function deleteDangerWord(index) {
  let list = loadJson("dangerWords", []);
  list.splice(index, 1);
  localStorage.setItem("dangerWords", JSON.stringify(list));
  renderDangerWords();
}

function getAllDangerWords() {
  const local = loadJson("dangerWords", []);
  return [...defaultDangerWords, ...local];
}

/* ===============================
   Danger Pattern Management
=============================== */

function savePattern() {
  const name = get("patternName").value.trim();
  const regex = get("patternRegex").value.trim();
  const flags = get("patternFlags").value.trim() || "g";
  if (!name || !regex) {
    alert("パターン名と正規表現を入力してください");
    return;
  }
  try {
    new RegExp(regex, flags);
  } catch {
    alert("正規表現が正しくありません");
    return;
  }
  let list = loadJson("dangerPatterns", []);
  list.push({ name, regex, flags });
  localStorage.setItem("dangerPatterns", JSON.stringify(list));
  get("patternName").value = "";
  get("patternRegex").value = "";
  get("patternFlags").value = "";
  alert("NGパターンを追加しました");
  renderPatterns();
}

function renderPatterns() {
  const local = loadJson("dangerPatterns", []);
  const all = [...defaultPatterns, ...local];

  get("patternList").innerHTML = all.map((p, i) => `
    <div class="pattern-item">
      <b>${escapeHtml(p.name)}</b>
      <div class="code-like">/${escapeHtml(p.regex)}/${escapeHtml(p.flags || "")}</div>
      <div class="item-actions">
        ${
          i >= defaultPatterns.length
            ? `<button onclick="deletePattern(${i - defaultPatterns.length})">削除</button>`
            : `<span class="small">固定パターン</span>`
        }
      </div>
    </div>
  `).join("");
}

function deletePattern(index) {
  let list = loadJson("dangerPatterns", []);
  list.splice(index, 1);
  localStorage.setItem("dangerPatterns", JSON.stringify(list));
  renderPatterns();
}

function getAllPatterns() {
  const local = loadJson("dangerPatterns", []);
  return [...defaultPatterns, ...local];
}

/* ===============================
   Sensitive Content Check
=============================== */

function detectSensitiveContent(text) {
  const source = String(text || "");
  const foundWords = getAllDangerWords().filter(word => word && source.includes(word));
  const foundPatterns = [];
  for (const p of getAllPatterns()) {
    try {
      const regex = new RegExp(p.regex, p.flags || "g");
      const matches = source.match(regex);
      if (matches && matches.length > 0) {
        foundPatterns.push({
          name: p.name,
          count: matches.length,
          samples: [...new Set(matches)].slice(0, 3)
        });
      }
    } catch {}
  }
  return {
    hasAny: foundWords.length > 0 || foundPatterns.length > 0,
    foundWords,
    foundPatterns
  };
}

function checkSensitiveContent(text) {
  const report = detectSensitiveContent(text);
  if (!report.hasAny) {
    hideWarning();
    return;
  }
  const lines = [];
  lines.push("警告：個人情報・認証情報が含まれている可能性があります。");
  lines.push("");
  if (report.foundWords.length > 0) {
    lines.push("【危険ワード】");
    lines.push(report.foundWords.join("、"));
    lines.push("");
  }
  if (report.foundPatterns.length > 0) {
    lines.push("【NGパターン検出】");
    report.foundPatterns.forEach(item => {
      const sampleText = item.samples.length > 0 ? ` 例: ${item.samples.join(" / ")}` : "";
      lines.push(`・${item.name}（${item.count}件）${sampleText}`);
    });
    lines.push("");
  }
  lines.push("外部に送る前に、本当に問題ないか確認してください。");
  get("warningBox").style.display = "block";
  get("warningBox").innerText = lines.join("\n");
}

function buildConfirmMessage(report, actionName) {
  const lines = [];
  lines.push(`警告：${actionName}前に確認してください。`);
  lines.push("");
  if (report.foundWords.length > 0) {
    lines.push("【危険ワード】");
    lines.push(report.foundWords.join("、"));
    lines.push("");
  }
  if (report.foundPatterns.length > 0) {
    lines.push("【NGパターン検出】");
    report.foundPatterns.forEach(item => {
      const sampleText = item.samples.length > 0 ? ` 例: ${item.samples.join(" / ")}` : "";
      lines.push(`・${item.name}（${item.count}件）${sampleText}`);
    });
    lines.push("");
  }
  lines.push(`それでも${actionName}しますか？`);
  return lines.join("\n");
}

function hideWarning() {
  get("warningBox").style.display = "none";
  get("warningBox").innerText = "";
}

/* ===============================
   State Save / Load
=============================== */

function saveCurrentState() {

  if (isLoading) return;

  if (!get("raw-input")) return;

  localStorage.setItem(
    "rawInput",
    get("raw-input").value
  );

  localStorage.setItem(
    "roughTone",
    get("rough-tone").value
  );

  localStorage.setItem(
    "roughOutputFormat",
    get("rough-output-format").value
  );
  localStorage.setItem(
    "roleValue",
    get("role").value
  );
  localStorage.setItem(
    "taskValue",
    get("task").value
  );
  localStorage.setItem(
    "detailsValue",
    get("details").value
  );
  localStorage.setItem(
    "toneValue",
    get("tone").value
  );
  localStorage.setItem(
    "currentTab",
    String(currentTab)
  );
  localStorage.setItem(
    "aiTarget",
    get("ai-target").value
  );
}

function loadSettings() {

  isLoading = true;

  try {

    if (
      localStorage.getItem(
        "darkMode"
      ) === "1"
    ) {
      document.body
        .classList
        .add("dark");
    }

    closeAllManagers();
    renderHistory();

    if (typeof renderTemplates === "function") {
      renderTemplates();
    } else {
      console.warn("renderTemplates is not defined");
    }

    if (typeof renderTemplateSelect === "function") {
      renderTemplateSelect();
    } else {
      console.warn("renderTemplateSelect is not defined");
    }

    renderDangerWords();
    renderPatterns();
    renderCommandChips();
    renderPresetChips();

    get("raw-input").value =
      localStorage.getItem("rawInput") || "";

    get("rough-tone").value =
      localStorage.getItem("roughTone") ||
      "プロフェッショナル";

    get("rough-output-format").value =
      localStorage.getItem("roughOutputFormat") ||
      "prompt";

    get("role").value =
      localStorage.getItem("roleValue") || "";

    get("task").value =
      localStorage.getItem("taskValue") || "";

    get("details").value =
      localStorage.getItem("detailsValue") || "";

    get("tone").value =
      localStorage.getItem("toneValue") ||
      "プロフェッショナル";

    get("ai-target").value =
      localStorage.getItem("aiTarget") ||
      "chatgpt";

    const savedTab =
      Number(
        localStorage.getItem("currentTab") || "1"
      );

    currentTab =
      savedTab;

    switchTab(
      savedTab
    );

    syncCommandButtons();

    updatePanelButtonStates();

    get("versionLabel").innerText =
      APP_VERSION;

    get("changelogLabel").innerHTML =
      CHANGELOG
        .map(x => escapeHtml(x))
        .join("<br>");

  } finally {

    isLoading = false;

  }
}

/* ===============================
   History Management
=============================== */

function saveHistory(text) {
  let h = loadJson("h", []);
  h.unshift(text);
  h = h.slice(0, 5);
  localStorage.setItem("h", JSON.stringify(h));
  renderHistory();
}

function renderHistory() {
  const h = loadJson("h", []);
  get("history").innerHTML = h.map((x, i) => `
    <div class="history">
      ${escapeHtml(x.substring(0, 80))}...
      <div class="history-actions">
        <button onclick='reuseHistory(${JSON.stringify(x)})'>再利用</button>
        <button onclick='saveFromHistory(${JSON.stringify(x)})'>テンプレ化</button>
        <button onclick='deleteHistory(${i})'>削除</button>
      </div>
    </div>
  `).join("");
}

function reuseHistory(text) {
  get("output").innerText = text;
  checkSensitiveContent(text);
}

function deleteHistory(index) {
  let h = loadJson("h", []);
  h.splice(index, 1);
  localStorage.setItem("h", JSON.stringify(h));
  renderHistory();
}

function clearHistory() {
  if (!confirm("履歴をすべて削除しますか？")) return;
  localStorage.removeItem("h");
  renderHistory();
}

/* ===============================
   Template Management
=============================== */

function saveTemplate() {
  const name = get("tempName").value.trim();
  const role = get("tempRole").value.trim();
  const task = get("tempTask").value.trim();
  const details = get("tempDetails").value.trim();
  const tone = get("tempTone").value;
  if (!name) {
    alert("テンプレ名を入力してください");
    return;
  }
  let list = loadJson("templates", []);
  list.push({ name, role, task, details, tone });
  localStorage.setItem("templates", JSON.stringify(list));
  get("tempName").value = "";
  get("tempRole").value = "";
  get("tempTask").value = "";
  get("tempDetails").value = "";
  get("tempTone").value = "プロフェッショナル";
  alert("保存完了");
  renderTemplates();
  renderTemplateSelect();
}

function renderTemplates() {
  const local = loadJson("templates", []);
  const all = [...defaultTemplates, ...local];
  get("templateList").innerHTML = all.map((t, i) => `
    <div class="template-item">
      <b>${escapeHtml(t.name)}</b><br>
      <div class="small">役割: ${escapeHtml(t.role || "")}</div>
      <div class="item-actions">
        <button onclick="applyTemplateAll(${i})">使う</button>
        ${i >= defaultTemplates.length ? `<button onclick="deleteTemplate(${i - defaultTemplates.length})">削除</button>` : ""}
      </div>
    </div>
  `).join("");
}

function renderTemplateSelect() {
  const local = loadJson("templates", []);
  const all = [...defaultTemplates, ...local];
  get("templateSelect").innerHTML =
    `<option value="">テンプレを選択</option>` +
    all.map((t, i) => `<option value="${i}">${escapeHtml(t.name)}</option>`).join("");
}

function applyTemplateFromSelect() {
  const value = get("templateSelect").value;
  if (value === "") return;
  applyTemplateAll(Number(value));
}

function applyTemplateAll(i) {
  const local = loadJson("templates", []);
  const all = [...defaultTemplates, ...local];
  const t = all[i];
  if (!t) return;
  switchTab(1);
  get("role").value = t.role || "";
  get("task").value = t.task || "";
  get("details").value = t.details || "";
  get("tone").value = t.tone || "プロフェッショナル";
}

function deleteTemplate(i) {
  let list = loadJson("templates", []);
  list.splice(i, 1);
  localStorage.setItem("templates", JSON.stringify(list));
  renderTemplates();
  renderTemplateSelect();
}

function saveFromHistory(text) {
  const name = prompt("テンプレ名を入力してください");
  if (!name) return;
  const roleMatch = text.match(/あなたは「(.+?)」/);
  const taskMatch = text.match(/# 目的\n([\s\S]*?)(\n#|\n$|$)/);
  let list = loadJson("templates", []);
  list.push({
    name,
    role: roleMatch ? roleMatch[1] : "",
    task: taskMatch ? taskMatch[1].trim() : "",
    details: text,
    tone: "プロフェッショナル"
  });
  localStorage.setItem("templates", JSON.stringify(list));
  alert("テンプレ化しました");
  renderTemplates();
  renderTemplateSelect();
}

/* ===============================
   Import / Export
=============================== */

function exportTemplates() {
  const data =
    localStorage.getItem("templates") || "[]";

  const blob =
    new Blob(
      [data],
      { type: "application/json" }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "templates.json";

  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1000);
}

function importTemplates() {
  get("fileInput").click();
}

function exportAiPresets() {

  const data =
    JSON.stringify(
      getAiPresets(),
      null,
      2
    );

  const blob =
    new Blob(
      [data],
      {
        type:
        "application/json"
      }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "ai-presets.json";

  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(
      a.href
    );
  },1000);
}

function importAiPresets() {
  get("aiPresetFileInput").click();
}

/* ===== Import File Events ===== */

function initImportFileEvents() {

  const fileInput =
    get("fileInput");

  const aiPresetFileInput =
    get("aiPresetFileInput");

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        try {
          const parsed =
            JSON.parse(reader.result);

          if (!Array.isArray(parsed)) {
            alert("テンプレファイルの形式が正しくありません");
            return;
          }

          localStorage.setItem(
            "templates",
            JSON.stringify(parsed)
          );

          renderTemplates();
          renderTemplateSelect();

          alert("復元完了");

        } catch {
          alert("読み込みに失敗しました");
        }
      };

      reader.readAsText(file);
      e.target.value = "";
    });
  }

  if (aiPresetFileInput) {
    aiPresetFileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = () => {
        try {
          const parsed =
            JSON.parse(reader.result);

          if (
            !parsed ||
            typeof parsed !== "object" ||
            Array.isArray(parsed)
          ) {
            alert("AIプリセットファイルの形式が正しくありません");
            return;
          }

          const validKeys = [
            "chatgpt",
            "claude",
            "gemini",
            "cursor",
            "copilot"
          ];

          for (const key of Object.keys(parsed)) {
            if (!validKeys.includes(key)) {
              alert(`不明なAI設定が含まれています: ${key}`);
              return;
            }

            if (
              !parsed[key] ||
              typeof parsed[key].name !== "string" ||
              typeof parsed[key].instruction !== "string"
            ) {
              alert(`AI設定の形式が正しくありません: ${key}`);
              return;
            }
          }

          saveAiPresets(parsed);

          if (
            get("ai-preset-manager") &&
            get("ai-preset-manager").style.display !== "none"
          ) {
            loadAiPresetToEditor();
          }

          alert("AIプリセットを復元しました");

        } catch (e) {
          alert(
            "AIプリセットの読み込みに失敗しました\n\n" +
            e.message
          );
        }
      };

      reader.readAsText(file);
      e.target.value = "";
    });
  }
}