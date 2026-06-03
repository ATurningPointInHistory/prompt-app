/* ===============================
   FILE: 00_bootstrap.js
   Bootstrap / Shared Core
=============================== */

/* ===============================
   Float Panel Core
=============================== */

function openFloatPanel(title, bodyHtml){
  const panel = get("floatPanel");

  panel.innerHTML =
    `<div class="float-panel-header">
      <span class="float-panel-title">${title}</span>
      <button onclick="moveFloatPanelBy(0,-60)">↑</button>
      <button onclick="moveFloatPanelBy(0,60)">↓</button>
      <button onclick="moveFloatPanelBy(-60,0)">←</button>
      <button onclick="moveFloatPanelBy(60,0)">→</button>
      <button onclick="resetFloatPanelPosition()">↘</button>
      <button onmousedown="event.preventDefault()"
      onclick="closeFloatPanelKeepEditorSelection()">×</button>
    </div>` +
    bodyHtml;

  panel.style.display = "block";
}

function moveFloatPanelBy(dx, dy) {
  const panel = get("floatPanel");
  if (!panel) return;

  const rect = panel.getBoundingClientRect();

  let nextLeft = rect.left + dx;
  let nextTop = rect.top + dy;

  const maxLeft =
    window.innerWidth - rect.width;

  const maxTop =
    window.innerHeight - rect.height;

  nextLeft =
    Math.min(
      Math.max(0, nextLeft),
      Math.max(0, maxLeft)
    );

  nextTop =
    Math.min(
      Math.max(0, nextTop),
      Math.max(0, maxTop)
    );

  panel.style.left = nextLeft + "px";
  panel.style.top = nextTop + "px";
  panel.style.right = "auto";
  panel.style.bottom = "auto";
}

function resetFloatPanelPosition() {
  const panel = get("floatPanel");
  if (!panel) return;

  panel.style.left = "auto";
  panel.style.top = "auto";
  panel.style.right = "18px";
  panel.style.bottom = "88px";
}

function closeFloatPanelKeepEditorSelection() {
  const editor = get("repairEditor");
  const start = editor ? editor.selectionStart : null;
  const end = editor ? editor.selectionEnd : null;
  closeFloatPanel();
  if (editor && start !== null && end !== null) {
    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(start, end);
      updateCursorPosition();
    }, 0);
  }
}

function closeFloatPanel(){
  get("floatPanel").style.display = "none";
  const btn = get("toolsBtn");
  if(btn){
    btn.innerText = "⚙";
  }
}
