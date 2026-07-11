/* ===============================
   FILE: 11_virtual_keyboard.js
   IDE-080
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

  const source =
    String(text || "");

  const start =
    Number.isFinite(
      input.selectionStart
    )
      ? input.selectionStart
      : 0;

  const end =
    Number.isFinite(
      input.selectionEnd
    )
      ? input.selectionEnd
      : start;

  input.value =
    input.value.slice(0, start) +
    source +
    input.value.slice(end);

  const position =
    start + source.length;

  input.focus();

  input.selectionStart =
    position;

  input.selectionEnd =
    position;

  notifyVirtualKeyboardInput(
    input
  );

}

function virtualKeyboardBackspace() {

  const input =
    getVirtualKeyboardTarget();

  if (!input) {
    return;
  }

  const start =
    Number.isFinite(
      input.selectionStart
    )
      ? input.selectionStart
      : 0;

  const end =
    Number.isFinite(
      input.selectionEnd
    )
      ? input.selectionEnd
      : start;

  if (start !== end) {

    input.value =
      input.value.slice(0, start) +
      input.value.slice(end);

    input.focus();

    input.selectionStart =
      start;

    input.selectionEnd =
      start;

    notifyVirtualKeyboardInput(
      input
    );

    return;

  }

  if (start <= 0) {
    return;
  }

  input.value =
    input.value.slice(0, start - 1) +
    input.value.slice(start);

  const position =
    start - 1;

  input.focus();

  input.selectionStart =
    position;

  input.selectionEnd =
    position;

  notifyVirtualKeyboardInput(
    input
  );

}

function virtualKeyboardDelete() {

  const input =
    getVirtualKeyboardTarget();

  if (!input) {
    return;
  }

  const start =
    Number.isFinite(
      input.selectionStart
    )
      ? input.selectionStart
      : 0;

  const end =
    Number.isFinite(
      input.selectionEnd
    )
      ? input.selectionEnd
      : start;

  if (start !== end) {

    input.value =
      input.value.slice(0, start) +
      input.value.slice(end);

    input.focus();

    input.selectionStart =
      start;

    input.selectionEnd =
      start;

    notifyVirtualKeyboardInput(
      input
    );

    return;

  }

  if (
    start >=
    input.value.length
  ) {
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

  notifyVirtualKeyboardInput(
    input
  );

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

  <button type="button"
  onclick="insertVirtualKeyboardText('(')">(</button>

  <button type="button"
  onclick="insertVirtualKeyboardText(')')">)</button>

  <button type="button"
  onclick="insertVirtualKeyboardText('{')">{</button>

  <button type="button"
  onclick="insertVirtualKeyboardText('}')">}</button>

  <button type="button"
  onclick="insertVirtualKeyboardText('[')">[</button>

  <button type="button"
  onclick="insertVirtualKeyboardText(']')">]</button>

  <button type="button"
  onclick="insertVirtualKeyboardText('=>')">=&gt;</button>

  <button type="button"
  onclick="insertVirtualKeyboardText('&&')">&amp;&amp;</button>

  <button type="button"
  onclick="insertVirtualKeyboardText('||')">||</button>

  <button type="button"
  onclick="insertVirtualKeyboardText(';')">;</button>

  <button type="button"
  onclick="insertVirtualKeyboardText('.')">.</button>

  <button type="button"
  onclick="insertVirtualKeyboardText(',')">,</button>

  <button type="button"
  onclick="moveVirtualKeyboardCursor(-1)">◀</button>

  <button type="button"
  onclick="moveVirtualKeyboardCursor(1)">▶</button>

  <button type="button"
  onclick="virtualKeyboardBackspace()">⌫</button>

  <button type="button"
  onclick="virtualKeyboardDelete()">Del</button>

</div>
`;

}

/* ===============================
   Notify Virtual Keyboard Input
=============================== */

function notifyVirtualKeyboardInput(
  input
) {

  if (!input) {
    return;
  }

  input.dispatchEvent(
    new Event(
      "input",
      {
        bubbles: true
      }
    )
  );

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

window.notifyVirtualKeyboardInput =
  notifyVirtualKeyboardInput;

console.log(
  "11_virtual_keyboard loaded"
);