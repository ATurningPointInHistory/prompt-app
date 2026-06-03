/* ===============================
   FILE: 02_prompt.js
   Prompt Builder
=============================== */

/* ===============================
   Prompt Output Helpers
=============================== */

function formatJsonOutput() {
  const output = get("output");
  let text = output.innerText.trim();
  if (!text || text === "ここに表示") {
    alert("JSONがありません");
    return;
  }
  try {
    // ```json 除去
    text = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    // JSON化
    const parsed = JSON.parse(text);
    // 整形
    const formatted = JSON.stringify(parsed, null, 2);
    output.innerText = formatted;
    alert("JSON整形完了");
  } catch (e) {
    alert("JSON形式が不正です\n\n" + e.message);
  }
}

function reviewPrompt() {
  const text = get("output").innerText.trim();
  if (!text || text === "ここに表示") {
    alert("先に生成してください");
    return;
  }
  let score = 100;
  const goodPoints = [];
  const warnings = [];
  const suggestions = [];
  const hasJsonLike = text.startsWith("{") || text.startsWith("[");
  let parsedJson = null;
  if (hasJsonLike) {
    try {
      parsedJson = JSON.parse(text);
      goodPoints.push("JSONとして解析可能");
    } catch (e) {
      score -= 25;
      warnings.push("JSON形式が不正です");
      suggestions.push("JSON整形ボタンで確認し、余計な説明文やMarkdownを除去してください。");
    }
  }
  const selectedAi = get("ai-target")
      ? get("ai-target").value || "chatgpt"
      : "chatgpt";
    let aiSpecificChecks = [];
    switch (selectedAi) {
      case "chatgpt":
        aiSpecificChecks = [
          {
            ok:
              text.includes("役割") ||
              text.includes('"role"'),
            warning: "ChatGPT向けの役割整理が不足しています"
          },
          {
            ok:
              text.includes("目的") ||
              text.includes('"purpose"'),
            warning: "ChatGPT向けの目的整理が不足しています"
          },
          {
            ok:
              text.includes("出力形式") ||               text.includes('"output_format"'),
            warning: "ChatGPT向けの出力形式整理が不足しています"
          }
        ];
        break;
      case "claude":
        aiSpecificChecks = [
          {
            ok: text.includes("背景"),
            warning: "Claude向けの背景整理が不足しています"
          },
          {
            ok: text.includes("意図"),
            warning: "Claude向けの意図整理が不足しています"
          },
          {
            ok: text.includes("考慮点"),
            warning: "Claude向けの考慮点整理が不足しています"
          }
        ];
        break;
      case "gemini":
        aiSpecificChecks = [
          {
            ok: text.includes("目的"),
            warning: "Gemini向けの目的整理が不足しています"
          },
          {
            ok:
              text.includes("必要な出力") ||
              text.includes("出力"),
            warning: "Gemini向けの必要な出力整理が不足しています"
          },
          {
            ok:
              text.includes("条件") ||
              text.includes("制約"),
            warning: "Gemini向けの条件整理が不足しています"
          },
          {
            ok:
              text.includes("優先") ||
              text.includes("重要"),
            warning: "Gemini向けの優先順位整理が不足しています"
          },
          {
            ok:
              text.includes("成功条件") ||
              text.includes("期待結果"),
            warning: "Gemini向けの成功条件整理が不足しています"
          }
        ];
        break;
      case "cursor":
        aiSpecificChecks = [
          {
            ok: text.includes("現状"),
            warning: "Cursor向けの現状整理が不足しています"
          },
          {
            ok: text.includes("問題"),
            warning: "Cursor向けの問題整理が不足しています"
          },
          {
            ok: text.includes("期待動作"),
            warning: "Cursor向けの期待動作整理が不足しています"
          },
          {
            ok: text.includes("修正方針"),
            warning: "Cursor向けの修正方針整理が不足しています"
          }
        ];
        break;

      case "copilot":
        aiSpecificChecks = [
          {
            ok: text.includes("Goal"),
            warning: "Copilot向けのGoal整理が不足しています"
          },
          {
            ok: text.includes("Context"),
            warning: "Copilot向けのContext整理が不足しています"
          },
          {
            ok: text.includes("Expected behavior"),
            warning: "Copilot向けのExpected behavior整理が不足しています"
          },
          {
            ok: text.includes("Constraints"),
            warning: "Copilot向けのConstraints整理が不足しています"
          }
        ];
        break;
    }
    aiSpecificChecks.forEach(check => {
      if (check.ok) {
        goodPoints.push(`AI別評価OK：${selectedAi}`);
      } else {
        score -= 6;
        warnings.push(check.warning);
      }
    });
  const checks = [
    ...(!["claude", "cursor", "copilot", "gemini"].includes(selectedAi)
      ? [{
          name: "役割",
          ok: text.includes("役割") || text.includes('"role"'),
          penalty: 12,
          warning: "役割が不明です",
          suggestion: "誰として回答するかを明記してください。例：あなたはHTML/JavaScriptに詳しい設計者です。"
        }]
      : []),
    {
      name: "目的",
      ok:
        text.includes("目的") ||
        text.includes('"purpose"') ||
        text.includes("Goal") ||
        text.includes("意図"),
      penalty: 12,
      warning: "目的が不明です",
      suggestion: "何を達成したいのかを1文で明記してください。"
    },
    {
      name: "背景・条件",
      ok:
        text.includes("背景") ||
        text.includes("条件") ||
        text.includes('"conditions"') ||
        text.includes("Context") ||
        text.includes("現状"),
      penalty: 10,
      warning: "背景・条件が不足しています",
      suggestion: "前提、対象範囲、現在の状況を追加してください。"
    },
    ...(!["claude", "gemini"].includes(selectedAi)
      ? [{
          name: "制約",
          ok:
            text.includes("制約") ||
            text.includes("禁止") ||
            text.includes("注意") ||
            text.includes('"constraints"'),
          penalty: 10,
          warning: "制約・禁止事項が不足しています",
          suggestion: "既存仕様を壊さない、API直送しない、出力形式を守るなどを追加してください。"
        }]
      : []),
    ...(!["claude", "cursor", "gemini"].includes(selectedAi)
      ? [{
          name: "出力形式",
          ok:
            text.includes("出力形式") ||
            text.includes('"output_format"') ||
            text.includes("Output"),
          penalty: 12,
          warning: "出力形式が曖昧です",
          suggestion: "箇条書き、表、JSON、修正コードなど、期待する出力形式を指定してください。"
        }]
      : []),
    ...(!["cursor", "copilot"].includes(selectedAi)
      ? [{
          name: "トーン",
          ok:
            text.includes("トーン") ||
            text.includes('"tone"'),
          penalty: 8,
          warning: "トーン指定がありません",
          suggestion: "プロフェッショナル、簡潔、初心者向けなどの文体を指定してください。"
        }]
      : []),
    {
      name: "不足情報",
      ok:
        text.includes("不足") ||
        text.includes("確認") ||        
         text.includes('"missing_information"'),
      penalty: 8,
      warning: "不足情報への対応指示がありません",
      suggestion: "不明点がある場合は、確認するか仮定として明示する指示を追加してください。"
    },
    {
      name: "追加指示",
      ok:
        text.includes("追加変換モード") ||
        text.includes('"commands"'),
      penalty: 5,
      warning: "追加指示・コマンドが反映されていません",
      suggestion: "必要に応じて /step /enemy /schema などを追加してください。"
    }
  ];
  checks.forEach(check => {
    if (check.ok) {
      goodPoints.push(`${check.name}あり`);
    } else {
      score -= check.penalty;
      warnings.push(check.warning);
      suggestions.push(check.suggestion);
    }
  });
  const vagueWords = ["いい感じ", "なんとか", "適当に", "わかりやすく", "詳しく"];
  const foundVague = vagueWords.filter(word => text.includes(word));
  if (foundVague.length > 0) {
    score -= 10;
    warnings.push(`曖昧な表現があります：${foundVague.join("、")}`);
    suggestions.push("曖昧語を、具体的な完了条件・対象範囲・評価基準に置き換えてください。");
  }
  if (text.length < 120) {
    score -= 10;
    warnings.push("内容が短く、情報不足の可能性があります");
    suggestions.push("背景、目的、条件、期待する完成形を追加してください。");
  } else {
    goodPoints.push("一定の情報量あり");
  }
  if (parsedJson) {
    if (parsedJson.version) goodPoints.push("バージョン情報あり");
    if (parsedJson.prompt && parsedJson.prompt.purpose) goodPoints.push("内部JSONの目的あり");
    if (Array.isArray(parsedJson.commands)) goodPoints.push("commands配列あり");
    if (!parsedJson.prompt) {
      score -= 10;
      warnings.push("内部JSONに prompt オブジェクトがありません");
      suggestions.push("buildPromptObject() の構造を確認してください。");
    }
  }
  score = Math.max(0, Math.min(100, score));
  let rank = "C";
  if (score >= 90) rank = "S";
  else if (score >= 80) rank = "A";
  else if (score >= 65) rank = "B";
  let result =
`AIプロンプト生成Pro ${APP_VERSION}
  Prompt Score : ${score} / 100
  Rank : ${rank}
  `;
  if (goodPoints.length > 0) {
    result += "良い点:\n";
    result += [...new Set(goodPoints)].map(x => `✔ ${x}`).join("\n");
    result += "\n\n";
  }
  if (warnings.length > 0) {
    result += "改善候補:\n";
    result += [...new Set(warnings)].map(x => `⚠ ${x}`).join("\n");
    result += "\n\n";
  }
  if (suggestions.length > 0) {
    result += "改善案:\n";
    result += [...new Set(suggestions)].map(x => `・${x}`).join("\n");
  } else {
    result += "大きな改善点は見つかりません。";
  }
  alert(result);
}

/* ===============================
   Command / Preset Parser
=============================== */

function parseCommands(text) {
  const commandKeys = Object.keys(commandDefinitions);
  const found = [];
  const matches = text.match(/\/[a-zA-Z0-9]+/g) || [];
  matches.forEach(m => {
    const cmd = m.replace("/", "").toLowerCase();
    if (commandKeys.includes(cmd)) {
      found.push(cmd);
    }
  });
  const cleaned = text.replace(/\/[a-zA-Z0-9]+/g, "").trim();
  return {
    cleanedText: cleaned,
    commands: [...new Set(found)]
  };
}

function buildCommandInstructionsFromObject(obj) {
  if (!obj.commands || obj.commands.length === 0) return "";
  const lines = obj.commands.map(cmd => {
    return `・${cmd.key}: ${cmd.instruction}`;
  });
  return `
# 追加変換モード
以下の変換モードを反映してください。
${lines.join("\n")}
`;
}

/* ===============================
   Command / Preset UI
=============================== */

function renderCommandChips() {
  const box = get("commandBox");
  if (!box) return;
  box.innerHTML = Object.keys(commandDefinitions).map(cmd => {
    return `<button
      type="button"
      class="command-chip"
      data-cmd="${cmd}"
      onclick="addCommand('${cmd}')">
      /${cmd}
    </button>`;
  }).join("");
  syncCommandButtons();
}

function renderPresetChips() {
  const box = get("presetBox");
  if (!box) return;
  box.innerHTML = Object.keys(presetDefinitions).map(name => {
    return `<button
      type="button"
      class="preset-chip"
      onclick="applyPresetByName('${name}')">
      ${name}
    </button>`;
  }).join("");
}

function applyPresetByName(name) {
  const commands = presetDefinitions[name];
  if (!commands) return;
  applyPreset(commands);
}

function applyPreset(commands) {
  const input = get("raw-input");
  // 既存コマンド削除
  let text = input.value.replace(/\/[a-zA-Z0-9]+/g, "").trim();
  // プリセット追加
  const commandText = commands.map(c => `/${c}`).join(" ");
  input.value = `${text} ${commandText}`.trim();
  syncCommandButtons();
  saveCurrentState();
  input.focus();
}

function addCommand(cmd) {
  const input = get("raw-input");
  let current = input.value;
  const commandText = `/${cmd}`;
  const commands = current.match(/\/[a-zA-Z0-9]+/g) || [];
  const exists = commands.includes(commandText);
  if (exists) {
    current = current
      .split(/\s+/)
      .filter(part => part !== commandText)
      .join(" ")
      .trim();
  } else {
    current = `${current.trim()} ${commandText}`.trim();
  }
  input.value = current;
  syncCommandButtons();
  saveCurrentState();
  input.focus();
}

function syncCommandButtons() {
  const input = get("raw-input");
  const text = input.value;
  const commands = text.match(/\/[a-zA-Z0-9]+/g) || [];
  document.querySelectorAll(".command-chip").forEach(btn => {
    const cmd = btn.dataset.cmd;
    btn.classList.toggle("active", commands.includes(`/${cmd}`));
  });
}

/* ===============================
   Prompt Builder
=============================== */

function buildPromptObject(raw, tone, commands) {
  const safeRaw = String(raw || "").trim();
  const safeTone = tone || "プロフェッショナル";
  const safeCommands = Array.isArray(commands) ? commands : [];

  return {
    version: APP_VERSION,
    source: {
      input_type: "rough",
      raw_text: safeRaw
    },

    prompt: {
      role: "AIアシスタント",
      purpose: safeRaw,
      background: [],
      conditions: [],
      constraints: [],
      output_format: "目的に合った最適な形式で出力する",
      tone: safeTone,
      additional_instructions: []
    },

    commands: safeCommands.map(cmd => ({
      key: cmd,
      instruction: commandDefinitions[cmd] || ""
    })),

    assumptions: [],
    missing_information: [],

    metadata: {
      created_at: new Date().toISOString(),
      app_name: "AIプロンプト生成Pro",
      app_version: APP_VERSION
    }
  };
}

function generatePrompt() {
  let p = "";
  if (currentTab === 1) {
    const role = get("role").value.trim() || "AIアシスタント";
    const task = get("task").value.trim();
    const details = get("details").value.trim();
    const tone = get("tone").value;
    if (!task) {
      alert("目的を入力してください");
      return;
    }
    p = `あなたは「${role}」として振る舞ってください。

# 目的
${task}
`;

    if (details) {
      p += `
# 詳細・条件
${details}
`;
    }

    p += `
# トーン
${tone}

上記に基づき、具体的かつ最適な回答を出力してください。`;

  } else {
    const rawOriginal = get("raw-input").value.trim();
    const tone = get("rough-tone").value;
    const outputFormat = get("rough-output-format").value;
    const aiTarget = get("ai-target").value || "chatgpt";
    const parsed = parseCommands(rawOriginal);
    const raw = parsed.cleanedText;
    if (!raw) {
      alert("内容を入力してください");
      return;
    }
    const obj = buildPromptObject(
      raw,
      tone,
      parsed.commands
    );
    p = convertForAI(
      obj,
      aiTarget,
      outputFormat
    );
  }

  get("output").innerText = p;
  saveHistory(p);
  checkSensitiveContent(p);
  saveCurrentState();
}

/* ===============================
   AI Converter
=============================== */

function convertForAI(obj, aiTarget, outputFormat) {
  if (outputFormat === "json") {
    return JSON.stringify(obj, null, 2);
  }
  obj.ai_preset = getAiPreset(aiTarget);
  switch (aiTarget) {
    case "chatgpt":
      return convertForChatGPT(obj);
    case "claude":
      return convertForClaude(obj);
    case "gemini":
      return convertForGemini(obj);
    case "cursor":
      return convertForCursor(obj);
    case "copilot":
      return convertForCopilot(obj);
    default:
      return convertForChatGPT(obj);
  }
}

function convertForChatGPT(obj) {
  const preset = obj.ai_preset || {};

  return `以下の「やりたいこと」を分析し、プロンプトの各項目に整理して再構成してください。

${preset.instruction || ""}

【やりたいこと】
${obj.prompt.purpose}

${buildCommandInstructionsFromObject(obj)}

不明点がある場合は、
・不足情報
・確認事項
・仮定した内容
を分けて整理してください。

---
出力は以下の形式で整理してください：
役割：
目的：
背景・条件：
出力形式：
トーン：${obj.prompt.tone}`;
}

function convertForClaude(obj) {
  const preset = obj.ai_preset || {};
  return `背景：
${obj.prompt.purpose}

${preset.instruction || ""}

意図：
この依頼で達成したいことを整理してください。

考慮点：
前提、制約、不明点、判断理由を丁寧に整理してください。

${buildCommandInstructionsFromObject(obj)}

不明点がある場合は、
・不足情報
・確認事項
・仮定した内容
を分けて整理してください。

期待する出力：
読みやすく、自然文中心で、必要に応じて箇条書きで回答してください。

トーン：
${obj.prompt.tone}`;
}

function convertForGemini(obj) {
  const preset = obj.ai_preset || {};
  return `目的：

${obj.prompt.purpose}

${preset.instruction || ""}

必要な出力：
要点を短く整理し、実行しやすい形で回答してください。
期待結果：
ユーザーがすぐ実行・判断できる形で整理してください。

条件：
- 簡潔に
- 重要点を優先
- 必要に応じて箇条書き

${buildCommandInstructionsFromObject(obj)}

不明点がある場合は、
・不足情報
・確認事項
・仮定した内容
を分けて整理してください。

トーン：

${obj.prompt.tone}`;
}

function convertForCursor(obj) {
  const preset = obj.ai_preset || {};
  return `目的:
${obj.prompt.purpose}
${preset.instruction || ""}

現状:
現在のコードや動作状況を整理してください。

問題:
発生している不具合・課題・原因候補を整理してください。

期待動作:
修正後にどう動くべきかを明確にしてください。

制約:
既存UI・既存機能を壊さないでください。

${buildCommandInstructionsFromObject(obj)}

不明点がある場合は、
・不足情報
・確認事項
・仮定した内容
を分けて整理してください。

出力:
1. 原因
2. 修正方針
3. 修正コード
4. 確認方法`;
}

function convertForCopilot(obj) {
  const preset = obj.ai_preset || {};
  return `// Goal:
${obj.prompt.purpose}
${preset.instruction || ""}

// Context:
// 現在の状況・背景・関連コードの前提を整理してください。

// Expected behavior:
// 期待する動作・完成状態を整理してください。

// Constraints:
// 制約・禁止事項・注意点を整理してください。

${buildCommandInstructionsFromObject(obj)}

不明点がある場合は、
・不足情報
・確認事項
・仮定した内容
を分けて整理してください。

// Output:
// 必要なコード、修正方針、簡潔な説明を出力してください。`;
}

/* ===============================
   Output Actions
=============================== */

function copyText() {
  const text =
    get("output").innerText.trim();

  if (!text || text === "ここに表示") {
    alert("先に生成してください");
    return;
  }

  const report =
    detectSensitiveContent(text);

  if (report.hasAny) {
    const ok =
      confirm(
        buildConfirmMessage(report, "コピー")
      );

    if (!ok) return;
  }

  if (
    navigator.clipboard &&
    window.isSecureContext
  ) {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("コピー完了"))
      .catch(() => {
        const ok =
          copyTextFallback(text);

        alert(
          ok
            ? "コピー完了"
            : "コピー失敗（長押しコピーしてください）"
        );
      });

    return;
  }

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "コピー完了"
      : "コピー失敗（長押しコピーしてください）"
  );
}

function download() {
  const text =
    get("output").innerText.trim();

  if (!text || text === "ここに表示") {
    alert("先に生成してください");
    return;
  }

  const report =
    detectSensitiveContent(text);

  if (report.hasAny) {
    const ok =
      confirm(
        buildConfirmMessage(report, "保存")
      );

    if (!ok) return;
  }

  const blob =
    new Blob(
      [text],
      { type: "text/plain" }
    );

  const a =
    document.createElement("a");

  a.href =
    URL.createObjectURL(blob);

  a.download =
    "prompt.txt";

  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(a.href);
  }, 1000);
}

function clearOutput() {
  get("output").innerText = "ここに表示";
  hideWarning();
}

function testJsonFormat() {
  get("output").innerText = '{"a":1,"b":2}';
}

function testPromptObject() {
  const rawOriginal =
    get("raw-input").value.trim();

  if (!rawOriginal) {
    alert("ラフ入力欄にテスト用の文章を入力してください");
    return;
  }

  const tone =
    get("rough-tone").value;

  const parsed =
    parseCommands(rawOriginal);

  const obj =
    buildPromptObject(
      parsed.cleanedText,
      tone,
      parsed.commands
    );

  get("output").innerText =
    JSON.stringify(obj, null, 2);
}

function recheckOutput() {
  const text = get("output").innerText.trim();
  if (!text || text === "ここに表示") {
    alert("先に生成してください");
    return;
  }
  checkSensitiveContent(text);
}

/* ===============================
   UI Navigation
=============================== */

function switchTab(tabNum) {
  currentTab = tabNum;
  get("tab1").classList.toggle("active", tabNum === 1);
  get("tab2").classList.toggle("active", tabNum === 2);
  get("mode-normal").style.display = tabNum === 1 ? "block" : "none";
  get("mode-auto").style.display = tabNum === 2 ? "block" : "none";
  get("main-btn").innerText = tabNum === 1
    ? "⚡ プロンプトを生成する"
    : "🪄 AI整形用プロンプトを作る";
  if (!isLoading) {
    localStorage.setItem("currentTab",
String(tabNum));
  }
}

function toggleDark() {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", document.body.classList.contains("dark") ? "1" : "0");
}

function switchAppPage(mode) {
  closeFloatPanel();
  get("appPage").style.display =
    mode === "app" ? "block" : "none";
  get("repairPage").style.display =
    mode === "repair" ? "block" : "none";
  get("appPageTab").classList.toggle(
    "active",
    mode === "app"
  );
  get("repairPageTab").classList.toggle(
    "active",
    mode === "repair"
  );
  if (mode === "repair") {
    resetRepairEditorView();
  }
}

function isRepairMode() {
  return get("repairPage").style.display !== "none";
}

function buildNormalToolsHtml() {
  return `
<button class="float-list-btn" onclick="toggleTemplateManager()">🧩 テンプレ管理</button>
<button class="float-list-btn" onclick="toggleDangerManager()">⚠ 危険ワード管理</button>
<button class="float-list-btn" onclick="togglePatternManager()">🚫 NGパターン管理</button>
<button class="float-list-btn" onclick="toggleAiPresetManager()">🤖 AIプリセット管理</button>
<hr>
<button class="float-list-btn" onclick="backupProgram()">🗂 フルバックアップ</button>
<button class="float-list-btn" onclick="showBackupHistory()">📚 バックアップ履歴</button>
<button class="float-list-btn" onclick="saveProgramHtml()">💾 本体HTML保存</button>
<button class="float-list-btn" onclick="restoreProgramBackup()">♻ フル復元</button>
<hr>
<button class="float-list-btn" onclick="reviewPrompt()">🛠 Promptレビュー</button>
<button class="float-list-btn" onclick="testPromptObject()">🧩 内部JSONテスト</button>
<button class="float-list-btn" onclick="testJsonFormat()">🧪 JSONテスト</button>
<button class="float-list-btn" onclick="formatJsonOutput()">📦 JSON整形</button>
<button class="float-list-btn" onclick="recheckOutput()">🔍 再チェック</button>
<button class="float-list-btn" onclick="diagnoseHtml()">🩺 HTML診断</button>
<button class="float-list-btn" onclick="compareBackupSummary()">📊 バックアップ差分確認</button>
<button class="float-list-btn"
  onclick="previewRepairHtml()">🎨 色分けプレビュー</button>
<button class="float-list-btn" onclick="showHtmlHealth()">💚 HTML HEALTH</button>
<hr>
<button class="float-list-btn" onclick="exportTemplates()">📤 テンプレ保存</button>
<button class="float-list-btn" onclick="importTemplates()">📥 テンプレ復元</button>
<button class="float-list-btn" onclick="exportAiPresets()">🤖 AI設定バックアップ</button>
<button class="float-list-btn" onclick="importAiPresets()">🤖 AI設定復元</button>
<hr>
<button class="float-list-btn" onclick="clearOutput()">🧹 出力クリア</button>
<button class="float-list-btn" onclick="clearHistory()">🗑 履歴全削除</button>
<button class="float-list-btn"onclick="reloadAppPage()">🔄 ページ更新</button>
`;
}

function buildRepairToolsHtml() {
  return `
<button class="float-list-btn"
  onclick="loadRepairHtml()">📖 HTML読込</button>
<button class="float-list-btn" onclick="backupPartialScript()">📦 JS部分読込</button>
<button class="float-list-btn"
  onclick="copyRepairHtml()">📋 HTMLコピー</button>
<button class="float-list-btn"onclick="
saveRepairEditorAsFile()">💾 repair保存</button>
<button class="float-list-btn"
  onclick="saveRepairHtml()">💾 修正版保存</button>
<hr>


<button class="float-list-btn" onclick="diagnoseRepairHtml()">🩺 編集内容診断</button>
<button class="float-list-btn" onclick="selectFunctionBlock()">📦 関数選択</button>
<button class="float-list-btn" onclick="replaceFunctionBlock()">✏ 関数置換</button>
<button class="float-list-btn" onclick="showFunctionList()">📚 コードブロック一覧</button>
<button class="float-list-btn" onclick="showFunctionSortList()">↕コードブロック並べ替え</button>
<button class="float-list-btn" onclick="toggleRepairSearchBox()">🔍 検索</button>
<button class="float-list-btn" onclick="openReplacePanel()">🔁 検索置換</button>
<hr>
<button class="float-list-btn" onclick="undoRepairEdit()">↩ Undo</button>
<button class="float-list-btn" onclick="redoRepairEdit()">↪ Redo</button>
<button class="float-list-btn"
  onclick="indentRepairSelection()">➡ インデント</button>
<button class="float-list-btn"
  onclick="outdentRepairSelection()">⬅ アウトデント</button>
<button class="float-list-btn" onclick="toggleRepairAutoSave()">💾 AutoSave</button>
<hr>
<button class="float-list-btn" onclick="cleanupCandidates()">🧹 削除候補チェック</button>
<button class="float-list-btn" onclick="deleteCommentedCleanupBlocks()">🗑 コメント化済みを完全削除</button>
<button class="float-list-btn" onclick="previewRepairHtml()">🎨 色分けプレビュー</button>
<button class="float-list-btn" onclick="showHtmlHealth()">💚 HTML HEALTH</button>
<button class="float-list-btn" onclick="reloadAppPage()">🔄 ページ更新</button>
`;
}

function toggleToolsMenu(){
  const panel = get("floatPanel");
  if (panel.style.display !== "none") {
    closeFloatPanel();
    return;
  }
  get("toolsBtn").innerText = "×";
  const repairMode = isRepairMode();
  const title = repairMode
    ? "修復ツール"
    : "通常ツール";
  const bodyHtml = repairMode
    ? buildRepairToolsHtml()
    : buildNormalToolsHtml();
  openFloatPanel(title, bodyHtml);
}

function resetRepairEditorView() {
  const editor = get("repairEditor");
  if (!editor) return;

  editor.scrollLeft = 0;
  editor.style.width = "100%";
  editor.style.maxWidth = "100%";
}
