function updateDevConsoleSuggestions() {

  const input =
    get("devConsoleInput");

  const box =
    get("devConsoleSuggestion");

  if (!input || !box) {
    return;
  }

  const pos =
    input.selectionStart || input.value.length;

  const left =
    input.value.slice(0, pos);

  const keyword =
    left
      .split(/[^A-Za-z0-9_$]/)
      .pop();

  if (!keyword) {
    box.innerHTML = "";
    return;
  }

  const list =
    getDevConsoleSuggestions(
      keyword
    );

  box.innerHTML =
    list.map(name => `

<div
  class="search-result-line"
  onclick='insertDevConsoleSuggestion(${JSON.stringify(name)})'>
  ${escapeHtml(name)}
</div>

`).join("");

}

function getDevConsoleCandidates() {

  const editor =
    get("repairEditor");

  if (!editor) {
    return [];
  }

  const names =
    extractFunctionNames(
      editor.value
    );

  return [
    ...new Set(names)
  ].sort();

}

function getDevConsoleSuggestions(
  keyword
) {

  keyword =
    String(keyword || "")
      .trim()
      .toLowerCase();

  if (!keyword) {
    return [];
  }

  return getDevConsoleCandidates()
    .filter(name =>
      name
        .toLowerCase()
        .includes(keyword)
    )
    .slice(0, 20);

}

function insertDevConsoleSuggestion(name) {

  const input =
    get("devConsoleInput");

  if (!input) {
    return;
  }

  const value =
    input.value;

  const pos =
    input.selectionStart || value.length;

  const left =
    value.slice(0, pos);

  const right =
    value.slice(pos);

  const replacedLeft =
    left.replace(
      /[A-Za-z0-9_$]*$/,
      name
    );

  input.value =
    replacedLeft +
    "()" +
    right;

  const cursorPos =
    replacedLeft.length + 1;

  input.focus();

  setTimeout(() => {

    input.selectionStart =
      cursorPos;

    input.selectionEnd =
      cursorPos;

  }, 0);

  localStorage.setItem(
    "devConsoleLastInput",
    input.value
  );

  updateDevConsoleSuggestions();

}

function insertDevConsoleCommand(code) {

  const input =
    get("devConsoleInput");

  if (!input) {
    return;
  }

  input.value =
    code;

  input.focus();

  input.selectionStart =
    input.selectionEnd =
      input.value.length;

  localStorage.setItem(
    "devConsoleLastInput",
    input.value
  );

  updateDevConsoleSuggestions();

}

function showDevConsoleFunctionInfo(
  name
) {

  const editor =
    get("repairEditor");

  if (!editor) {
    return;
  }

  const info =
    findFunctionInfo(
      name,
      editor.value
    );

  if (!info) {
    return;
  }

  console.log(info);

}