
/* ===============================
   FILE: 09_relation_map.js
   Function Relation Map
=============================== */

/* ===============================
   
=============================== */
let functionRelationData = [];

function showFunctionRelationMap() {

  const editor =
    get("repairEditor");

  const text =
    editor && editor.value.trim()
      ? editor.value
      : document.documentElement.outerHTML;

  const blocks =
    extractCodeBlocksFromText(text)
      .filter(block =>
        block.type === "function"
      );

  if (!blocks.length) {
    alert("関数が見つかりません");
    return;
  }

  const names =
    blocks.map(block => block.name);

  functionRelationData =
    blocks.map(block => {

      const calls =
        names.filter(name => {

          if (name === block.name) {
            return false;
          }

          return new RegExp(
            "\\b" +
            escapeRegExp(name) +
            "\\s*\\(",
            "g"
          ).test(block.block);
        });

      const calledBy =
        blocks
          .filter(other => {

            if (other.name === block.name) {
              return false;
            }

            return new RegExp(
              "\\b" +
              escapeRegExp(block.name) +
              "\\s*\\(",
              "g"
            ).test(other.block);
          })
          .map(other => other.name);

      return {
        name: block.name,
        calls,
        calledBy,
        line:
          text
            .slice(0, block.start)
            .split("\n")
            .length
      };
    });

  renderFunctionRelationMap();
}

function renderFunctionRelationMap() {

  const html =
    functionRelationData
      .map((item, index) => {

        return `
<div class="relation-row">

  <button
    class="float-list-btn"
    onclick="toggleFunctionRelationDetail(${index})">
    ▶ ${escapeHtml(item.name)}
    <br>
    <span class="small">
      calls:${item.calls.length}
      / calledBy:${item.calledBy.length}
      / L${item.line}
    </span>
  </button>

  <div
    id="relationDetail${index}"
    class="relation-detail"
    style="display:none;">

    <b>呼び出している関数</b>
    <pre class="code-preview">${
      escapeHtml(
        item.calls.length
          ? item.calls.join("\n")
          : "none"
      )
    }</pre>

    <b>呼び出し元</b>
    <pre class="code-preview">${
      escapeHtml(
        item.calledBy.length
          ? item.calledBy.join("\n")
          : "none"
      )
    }</pre>

  </div>

</div>
`;
      })
      .join("");

  openFloatPanel(
    "🌳 関数関連図",
    `
<div class="float-panel-actions">
  <button onclick="expandAllFunctionRelations()">
    全展開
  </button>

  <button onclick="collapseAllFunctionRelations()">
    全閉
  </button>

  <button onclick="copyFunctionRelationMap()">
    コピー
  </button>
</div>

${html}
`
  );
}

function toggleFunctionRelationDetail(index) {

  const box =
    get("relationDetail" + index);

  if (!box) return;

  box.style.display =
    box.style.display === "none"
      ? "block"
      : "none";
}

function expandAllFunctionRelations() {
  document
    .querySelectorAll(".relation-detail")
    .forEach(el => {
      el.style.display = "block";
    });
}

function collapseAllFunctionRelations() {
  document
    .querySelectorAll(".relation-detail")
    .forEach(el => {
      el.style.display = "none";
    });
}

function copyFunctionRelationMap() {

  if (!functionRelationData.length) {
    alert("コピー内容なし");
    return;
  }

  const text =
    functionRelationData
      .map(item => {

        return `${item.name}
  calls:
${
  item.calls.length
    ? item.calls.map(x => "    - " + x).join("\n")
    : "    - none"
}

  calledBy:
${
  item.calledBy.length
    ? item.calledBy.map(x => "    - " + x).join("\n")
    : "    - none"
}
`;

      })
      .join("\n----------------\n");

  const ok =
    copyTextFallback(text);

  alert(
    ok
      ? "関数関連図をコピーしました"
      : "コピー失敗"
  );
}

/* ===============================
   
=============================== */

