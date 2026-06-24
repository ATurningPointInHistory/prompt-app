/* ===============================
   FILE: 06_search_history.js
   検索履歴 ※次工程で実装
=============================== */

function saveSearchHistory(
  file,
  line,
  keyword
) {

  repairSearchHistory.unshift({

    file,
    line,
    keyword,
    time:
      Date.now()

  });

  if (
    repairSearchHistory.length > 50
  ) {
    repairSearchHistory.length =
      50;
  }

  localStorage.setItem(
    "repairSearchHistory",
    JSON.stringify(
      repairSearchHistory
    )
  );

}

function showSearchHistory() {

  if (!repairSearchHistory.length) {
    alert("履歴なし");
    return;
  }

  openFloatPanel(
    "検索履歴",
    repairSearchHistory
      .map(item => `
<div
  class="function-item"
  onclick='jumpToSearchHistory(
    ${JSON.stringify(item.file)},
    ${Number(item.line) || 1}
  )'>
📄 ${escapeHtml(item.file)}
<br>
L${item.line}
<br>
${escapeHtml(item.keyword)}
</div>
`)
      .join("")
  );

}

function jumpToSearchHistory(
  fileName,
  line
) {

  if (
    !openRepairTarget(
      fileName,
      line
    )
  ) {
    return;
  }

  closeFloatPanel();

}

function loadSearchHistory() {

  try {

    repairSearchHistory =
      JSON.parse(
        localStorage.getItem(
          "repairSearchHistory"
        ) || "[]"
      );

  } catch {

    repairSearchHistory = [];

  }

}

