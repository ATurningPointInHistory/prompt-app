function insertDevConsoleText(
  text
) {

  const input =
    get("devConsoleInput");

  if (!input) {
    return;
  }

  const start =
    input.selectionStart || 0;

  const end =
    input.selectionEnd || start;

  const value =
    input.value || "";

  input.value =
    value.slice(0, start) +
    text +
    value.slice(end);

  const pos =
    start + text.length;

  input.focus();

  input.selectionStart =
    pos;

  input.selectionEnd =
    pos;

  localStorage.setItem(
    "devConsoleLastInput",
    input.value
  );

  updateDevConsoleSuggestions();

}

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