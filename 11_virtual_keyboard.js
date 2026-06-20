/* ===============================
   FILE: 11_virtual_keyboard.js
   Virtual Keyboard
=============================== */

let virtualKeyboardTarget =
  "devConsoleInput";

function setVirtualKeyboardTarget(
  id
) {

  virtualKeyboardTarget =
    id;

}

function getVirtualKeyboardTarget() {

  return get(
    virtualKeyboardTarget
  );

}

function insertVirtualKeyboardText(
  text
) {

  const input =
    getVirtualKeyboardTarget();

  if (!input) {
    return;
  }

  const start =
    input.selectionStart || 0;

  const end =
    input.selectionEnd || start;

  input.value =
    input.value.slice(0, start) +
    text +
    input.value.slice(end);

  const pos =
    start + text.length;

  input.focus();

  input.selectionStart =
    pos;

  input.selectionEnd =
    pos;

}

function virtualKeyboardBackspace() {

  const input =
    getVirtualKeyboardTarget();

  if (!input) {
    return;
  }

  const start =
    input.selectionStart || 0;

  const end =
    input.selectionEnd || start;

  if (start !== end) {

    input.value =
      input.value.slice(0, start) +
      input.value.slice(end);

    input.selectionStart =
      start;

    input.selectionEnd =
      start;

    return;

  }

  if (start <= 0) {
    return;
  }

  input.value =
    input.value.slice(0, start - 1) +
    input.value.slice(start);

  input.focus();

  input.selectionStart =
    start - 1;

  input.selectionEnd =
    start - 1;

}

function virtualKeyboardDelete() {

  const input =
    getVirtualKeyboardTarget();

  if (!input) {
    return;
  }

  const start =
    input.selectionStart || 0;

  const end =
    input.selectionEnd || start;

  if (start !== end) {

    input.value =
      input.value.slice(0, start) +
      input.value.slice(end);

    input.selectionStart =
      start;

    input.selectionEnd =
      start;

    return;

  }

  input.value =
    input.value.slice(0, start) +
    input.value.slice(start + 1);

  input.focus();

  input.selectionStart =
    start;

  input.selectionEnd =
    start;

}

function moveVirtualKeyboardCursor(
  offset
) {

  const input =
    getVirtualKeyboardTarget();

  if (!input) {
    return;
  }

  const pos =
    Math.max(
      0,
      Math.min(
        input.value.length,
        (input.selectionStart || 0) + offset
      )
    );

  input.focus();

  input.selectionStart =
    pos;

  input.selectionEnd =
    pos;

}

function buildVirtualKeyboardHtml() {

  return `
<div class="virtual-keyboard">

  <button onclick="insertVirtualKeyboardText('(')">(</button>
  <button onclick="insertVirtualKeyboardText(')')">)</button>
  <button onclick="insertVirtualKeyboardText('{')">{</button>
  <button onclick="insertVirtualKeyboardText('}')">}</button>
  <button onclick="insertVirtualKeyboardText('[')">[</button>
  <button onclick="insertVirtualKeyboardText(']')">]</button>

  <button onclick="insertVirtualKeyboardText('=>')">=&gt;</button>
  <button onclick="insertVirtualKeyboardText('&&')">&amp;&amp;</button>
  <button onclick="insertVirtualKeyboardText('||')">||</button>

  <button onclick="insertVirtualKeyboardText(';')">;</button>
  <button onclick="insertVirtualKeyboardText('.')">.</button>
  <button onclick="insertVirtualKeyboardText(',')">,</button>

  <button onclick="moveVirtualKeyboardCursor(-1)">◀</button>
  <button onclick="moveVirtualKeyboardCursor(1)">▶</button>
  <button onclick="virtualKeyboardBackspace()">⌫</button>
  <button onclick="virtualKeyboardDelete()">Del</button>

</div>
`;

}

window.buildVirtualKeyboardHtml =
  buildVirtualKeyboardHtml;

window.setVirtualKeyboardTarget =
  setVirtualKeyboardTarget;

window.getVirtualKeyboardTarget =
  getVirtualKeyboardTarget;

window.insertVirtualKeyboardText =
  insertVirtualKeyboardText;

window.virtualKeyboardBackspace =
  virtualKeyboardBackspace;

window.virtualKeyboardDelete =
  virtualKeyboardDelete;

window.moveVirtualKeyboardCursor =
  moveVirtualKeyboardCursor;

console.log(
  "11_virtual_keyboard loaded"
);