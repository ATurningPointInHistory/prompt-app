/* ===============================
   FILE: 11_virtual_keyboard.js
   Virtual Keyboard
   IDE-080
=============================== */

const VIRTUAL_KEYBOARD_STORAGE_KEY =
  "ideVirtualKeyboardSettings";

let virtualKeyboardTarget =
  "devConsoleInput";

let virtualKeyboardSettings =
  loadJson(
    VIRTUAL_KEYBOARD_STORAGE_KEY,
    {
      enabled: true,
      layout: "code"
    }
  );

const VIRTUAL_KEYBOARD_LAYOUTS = {
  code: [
    ["(", "("], [")", ")"], ["{", "{"], ["}", "}"],
    ["[", "["], ["]", "]"], ["'", "'"], ['"', '"'],
    ["`", "`"], ["=>", "=>"], ["&&", "&&"], ["||", "||"],
    [";", ";"], [".", "."], [",", ","], [":", ":"]
  ],
  metadata: [
    ["ID", "ID: "], ["Title", "Title: "], ["Version", "Version: "],
    ["Status", "Status: "], ["Depends", "DependsOn:\n- "],
    ["Provides", "Provides:\n- "], ["Tags", "Tags:\n- "],
    ["Rules", "Rules:\n- "]
  ]
};

function normalizeVirtualKeyboardSettings(settings) {
  const source = settings && typeof settings === "object"
    ? settings
    : {};

  return {
    enabled: source.enabled !== false,
    layout: VIRTUAL_KEYBOARD_LAYOUTS[source.layout]
      ? source.layout
      : "code"
  };
}

function getVirtualKeyboardSettings() {
  return {
    ...normalizeVirtualKeyboardSettings(virtualKeyboardSettings)
  };
}

function updateVirtualKeyboardSettings(patch = {}) {
  virtualKeyboardSettings = normalizeVirtualKeyboardSettings({
    ...virtualKeyboardSettings,
    ...patch
  });

  localStorage.setItem(
    VIRTUAL_KEYBOARD_STORAGE_KEY,
    JSON.stringify(virtualKeyboardSettings)
  );

  refreshVirtualKeyboard();
  return getVirtualKeyboardSettings();
}

function setVirtualKeyboardTarget(id) {
  const targetId = String(id || "").trim();
  if (!targetId || !get(targetId)) {
    return false;
  }

  virtualKeyboardTarget = targetId;
  return true;
}

function getVirtualKeyboardTarget() {
  return get(virtualKeyboardTarget);
}

function getVirtualKeyboardSelection(input) {
  const length = String(input && input.value || "").length;
  const start = input && Number.isFinite(input.selectionStart)
    ? input.selectionStart
    : length;
  const end = input && Number.isFinite(input.selectionEnd)
    ? input.selectionEnd
    : start;

  return {
    start: Math.max(0, Math.min(length, start)),
    end: Math.max(0, Math.min(length, end))
  };
}

function replaceVirtualKeyboardSelection(text, cursorOffset = null) {
  const input = getVirtualKeyboardTarget();
  if (!input) {
    return false;
  }

  const source = String(text == null ? "" : text);
  const selection = getVirtualKeyboardSelection(input);
  const value = String(input.value || "");

  input.value =
    value.slice(0, selection.start) +
    source +
    value.slice(selection.end);

  const position = selection.start + (
    cursorOffset == null ? source.length : cursorOffset
  );

  input.focus();
  input.selectionStart = position;
  input.selectionEnd = position;
  notifyVirtualKeyboardInput(input);
  return true;
}

function insertVirtualKeyboardText(text) {
  return replaceVirtualKeyboardSelection(text);
}

function insertVirtualKeyboardPair(open, close) {
  const input = getVirtualKeyboardTarget();
  if (!input) {
    return false;
  }

  const selection = getVirtualKeyboardSelection(input);
  const selected = String(input.value || "").slice(selection.start, selection.end);
  const text = String(open || "") + selected + String(close || "");
  const offset = String(open || "").length + selected.length;

  return replaceVirtualKeyboardSelection(text, offset);
}

function virtualKeyboardBackspace() {
  const input = getVirtualKeyboardTarget();
  if (!input) {
    return false;
  }

  const selection = getVirtualKeyboardSelection(input);
  if (selection.start !== selection.end) {
    return replaceVirtualKeyboardSelection("");
  }

  if (selection.start <= 0) {
    return false;
  }

  input.selectionStart = selection.start - 1;
  input.selectionEnd = selection.start;
  return replaceVirtualKeyboardSelection("");
}

function virtualKeyboardDelete() {
  const input = getVirtualKeyboardTarget();
  if (!input) {
    return false;
  }

  const selection = getVirtualKeyboardSelection(input);
  if (selection.start !== selection.end) {
    return replaceVirtualKeyboardSelection("");
  }

  if (selection.start >= String(input.value || "").length) {
    return false;
  }

  input.selectionStart = selection.start;
  input.selectionEnd = selection.start + 1;
  return replaceVirtualKeyboardSelection("");
}

function moveVirtualKeyboardCursor(offset, extend = false) {
  const input = getVirtualKeyboardTarget();
  if (!input) {
    return false;
  }

  const selection = getVirtualKeyboardSelection(input);
  const base = extend ? selection.end : selection.start;
  const position = Math.max(
    0,
    Math.min(String(input.value || "").length, base + Number(offset || 0))
  );

  input.focus();
  if (extend) {
    input.selectionEnd = position;
  } else {
    input.selectionStart = position;
    input.selectionEnd = position;
  }
  return true;
}

function moveVirtualKeyboardLine(direction) {
  const input = getVirtualKeyboardTarget();
  if (!input) {
    return false;
  }

  const value = String(input.value || "");
  const position = getVirtualKeyboardSelection(input).start;
  const lineStart = value.lastIndexOf("\n", Math.max(0, position - 1)) + 1;
  const column = position - lineStart;

  if (direction < 0) {
    if (lineStart <= 0) {
      return moveVirtualKeyboardCursor(-position);
    }
    const previousEnd = lineStart - 1;
    const previousStart = value.lastIndexOf("\n", Math.max(0, previousEnd - 1)) + 1;
    const next = Math.min(previousStart + column, previousEnd);
    input.selectionStart = next;
    input.selectionEnd = next;
  } else {
    const currentEnd = value.indexOf("\n", position);
    if (currentEnd < 0) {
      return moveVirtualKeyboardCursor(value.length - position);
    }
    const nextStart = currentEnd + 1;
    const nextEndRaw = value.indexOf("\n", nextStart);
    const nextEnd = nextEndRaw < 0 ? value.length : nextEndRaw;
    const next = Math.min(nextStart + column, nextEnd);
    input.selectionStart = next;
    input.selectionEnd = next;
  }

  input.focus();
  return true;
}

function virtualKeyboardIndent(outdent = false) {
  const input = getVirtualKeyboardTarget();
  if (!input) {
    return false;
  }

  const selection = getVirtualKeyboardSelection(input);
  const value = String(input.value || "");
  const lineStart = value.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const lineEndRaw = value.indexOf("\n", selection.end);
  const lineEnd = lineEndRaw < 0 ? value.length : lineEndRaw;
  const block = value.slice(lineStart, lineEnd);

  const changed = outdent
    ? block.replace(/^( {1,2}|\t)/gm, "")
    : block.replace(/^/gm, "  ");

  input.selectionStart = lineStart;
  input.selectionEnd = lineEnd;
  return replaceVirtualKeyboardSelection(changed);
}

function virtualKeyboardUndo() {
  const input = getVirtualKeyboardTarget();
  if (!input) {
    return false;
  }
  input.focus();
  return typeof document.execCommand === "function"
    ? document.execCommand("undo")
    : false;
}

function virtualKeyboardRedo() {
  const input = getVirtualKeyboardTarget();
  if (!input) {
    return false;
  }
  input.focus();
  return typeof document.execCommand === "function"
    ? document.execCommand("redo")
    : false;
}

function toggleVirtualKeyboardLayout() {
  const next = getVirtualKeyboardSettings().layout === "code"
    ? "metadata"
    : "code";
  updateVirtualKeyboardSettings({ layout: next });
  return next;
}

function buildVirtualKeyboardKeyHtml(label, text) {
  const escapedText = JSON.stringify(String(text || ""));
  return `
<button type="button"
  onclick='insertVirtualKeyboardText(${escapedText})'>
  ${escapeHtml(label)}
</button>`;
}

function buildVirtualKeyboardHtml() {
  const settings = getVirtualKeyboardSettings();
  if (!settings.enabled) {
    return "";
  }

  const keys = VIRTUAL_KEYBOARD_LAYOUTS[settings.layout]
    .map(item => buildVirtualKeyboardKeyHtml(item[0], item[1]))
    .join("");

  return `
<div id="ideVirtualKeyboard" class="virtual-keyboard" data-layout="${escapeHtml(settings.layout)}">
  <button type="button" onclick="toggleVirtualKeyboardLayout()">${settings.layout === "code" ? "Meta" : "Code"}</button>
  ${keys}
  <button type="button" onclick="insertVirtualKeyboardPair('(', ')')">( )</button>
  <button type="button" onclick="insertVirtualKeyboardPair('{', '}')">{ }</button>
  <button type="button" onclick="insertVirtualKeyboardPair('[', ']')">[ ]</button>
  <button type="button" onclick="moveVirtualKeyboardCursor(-1)">◀</button>
  <button type="button" onclick="moveVirtualKeyboardCursor(1)">▶</button>
  <button type="button" onclick="moveVirtualKeyboardLine(-1)">▲</button>
  <button type="button" onclick="moveVirtualKeyboardLine(1)">▼</button>
  <button type="button" onclick="virtualKeyboardIndent(false)">Tab</button>
  <button type="button" onclick="virtualKeyboardIndent(true)">⇧Tab</button>
  <button type="button" onclick="virtualKeyboardUndo()">Undo</button>
  <button type="button" onclick="virtualKeyboardRedo()">Redo</button>
  <button type="button" onclick="virtualKeyboardBackspace()">⌫</button>
  <button type="button" onclick="virtualKeyboardDelete()">Del</button>
</div>`;
}

function refreshVirtualKeyboard() {
  const keyboard = get("ideVirtualKeyboard");
  if (!keyboard) {
    return false;
  }

  const wrapper = document.createElement("div");
  wrapper.innerHTML = buildVirtualKeyboardHtml();
  const replacement = wrapper.firstElementChild;

  if (!replacement) {
    keyboard.remove();
    return true;
  }

  keyboard.replaceWith(replacement);
  return true;
}

function notifyVirtualKeyboardInput(input) {
  if (!input) {
    return false;
  }

  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function registerVirtualKeyboardToCommandPalette() {
  if (typeof registerCommandPaletteCommand !== "function") {
    return false;
  }

  registerCommandPaletteCommand({
    id: "ide.virtualKeyboard.layout",
    type: "command",
    title: "Switch Virtual Keyboard Layout",
    summary: "CodeとMetadataレイアウトを切り替えます。",
    category: "IDE",
    keywords: ["keyboard", "virtual", "layout", "IDE-080"],
    icon: "⌨",
    action() {
      return toggleVirtualKeyboardLayout();
    }
  });

  return true;
}

function validateVirtualKeyboard() {
  const settings = getVirtualKeyboardSettings();
  const checks = {
    settings: Boolean(settings && VIRTUAL_KEYBOARD_LAYOUTS[settings.layout]),
    target: typeof setVirtualKeyboardTarget === "function" && typeof getVirtualKeyboardTarget === "function",
    input: typeof insertVirtualKeyboardText === "function",
    pairedInput: typeof insertVirtualKeyboardPair === "function",
    cursor: typeof moveVirtualKeyboardCursor === "function" && typeof moveVirtualKeyboardLine === "function",
    editing: typeof virtualKeyboardBackspace === "function" && typeof virtualKeyboardDelete === "function",
    indentation: typeof virtualKeyboardIndent === "function",
    renderer: typeof buildVirtualKeyboardHtml === "function",
    autocompleteIntegration: typeof refreshAutocompleteSuggestions === "function" || typeof updateDevConsoleSuggestions === "function",
    commandPalette: typeof registerVirtualKeyboardToCommandPalette === "function"
  };

  const failed = Object.keys(checks).filter(key => checks[key] !== true);

  return {
    id: "IDE-080",
    title: "Virtual Keyboard",
    valid: failed.length === 0,
    passed: Object.keys(checks).length - failed.length,
    total: Object.keys(checks).length,
    failed,
    checks,
    layout: settings.layout,
    enabled: settings.enabled
  };
}

function getVirtualKeyboardStatus() {
  const validation = validateVirtualKeyboard();
  const rate = Math.round(validation.passed / validation.total * 100);

  return {
    id: "IDE-080",
    title: "Virtual Keyboard",
    version: "1.0",
    status: validation.valid ? "Ready" : "Error",
    ready: validation.valid,
    progress: rate,
    health: rate,
    layout: validation.layout,
    enabled: validation.enabled,
    nextTask: validation.valid ? "IDE-090 Dashboard Integration" : "Fix Virtual Keyboard validation",
    updatedAt: Date.now()
  };
}

function initVirtualKeyboard() {
  virtualKeyboardSettings = normalizeVirtualKeyboardSettings(virtualKeyboardSettings);
  registerVirtualKeyboardToCommandPalette();
  return true;
}

window.initVirtualKeyboard = initVirtualKeyboard;
window.setVirtualKeyboardTarget = setVirtualKeyboardTarget;
window.getVirtualKeyboardTarget = getVirtualKeyboardTarget;
window.getVirtualKeyboardSettings = getVirtualKeyboardSettings;
window.updateVirtualKeyboardSettings = updateVirtualKeyboardSettings;
window.insertVirtualKeyboardText = insertVirtualKeyboardText;
window.insertVirtualKeyboardPair = insertVirtualKeyboardPair;
window.virtualKeyboardBackspace = virtualKeyboardBackspace;
window.virtualKeyboardDelete = virtualKeyboardDelete;
window.moveVirtualKeyboardCursor = moveVirtualKeyboardCursor;
window.moveVirtualKeyboardLine = moveVirtualKeyboardLine;
window.virtualKeyboardIndent = virtualKeyboardIndent;
window.virtualKeyboardUndo = virtualKeyboardUndo;
window.virtualKeyboardRedo = virtualKeyboardRedo;
window.toggleVirtualKeyboardLayout = toggleVirtualKeyboardLayout;
window.buildVirtualKeyboardHtml = buildVirtualKeyboardHtml;
window.refreshVirtualKeyboard = refreshVirtualKeyboard;
window.notifyVirtualKeyboardInput = notifyVirtualKeyboardInput;
window.validateVirtualKeyboard = validateVirtualKeyboard;
window.getVirtualKeyboardStatus = getVirtualKeyboardStatus;
window.registerVirtualKeyboardToCommandPalette = registerVirtualKeyboardToCommandPalette;

initVirtualKeyboard();
