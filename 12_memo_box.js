/* ===============================
   Memo Box
=============================== */

let memoBoxList =
  loadJson(
    "memoBoxList",
    [
      {
        name: "メモ1",
        text: ""
      },
      {
        name: "メモ2",
        text: ""
      }
    ]
  );

let memoBoxActiveIndex = 0;

function saveMemoBoxes() {

  localStorage.setItem(
    "memoBoxList",
    JSON.stringify(
      memoBoxList
    )
  );

}

function selectMemoBox(index) {

  memoBoxActiveIndex =
    index;

  showMemoBox();

}

function saveMemoBoxCurrent() {

  const name =
    get("memoBoxName")
      ?.value || "";

  const text =
    get("memoBoxText")
      ?.value || "";

  memoBoxList[
    memoBoxActiveIndex
  ] = {
    name,
    text
  };

  saveMemoBoxes();

}

function useMemoForSearch() {

  saveMemoBoxCurrent();

  const box =
    get("repairSearch");

  if (!box) {
    return;
  }

  box.value =
    memoBoxList[
      memoBoxActiveIndex
    ].text;

}

function copyMemoBox() {

  saveMemoBoxCurrent();

  copyTextFallback(
    memoBoxList[
      memoBoxActiveIndex
    ].text
  );

}

function addMemoBox() {

  memoBoxList.push({

    name:
      `メモ${memoBoxList.length + 1}`,

    text: ""

  });

  memoBoxActiveIndex =
    memoBoxList.length - 1;

  saveMemoBoxes();

  showMemoBox();

}

function deleteMemoBox() {

  if (
    memoBoxList.length <= 1
  ) {
    return;
  }

  memoBoxList.splice(
    memoBoxActiveIndex,
    1
  );

  memoBoxActiveIndex =
    Math.max(
      0,
      memoBoxActiveIndex - 1
    );

  saveMemoBoxes();

  showMemoBox();

}

function showMemoBox() {

  const tabs =
    memoBoxList
      .map((item, index) => `
<button
  class="tab ${
    index === memoBoxActiveIndex
      ? "active"
      : ""
  }"
  onclick="selectMemoBox(${index})">
${escapeHtml(item.name)}
</button>
`)
      .join("");

  const current =
    memoBoxList[
      memoBoxActiveIndex
    ];

  openFloatPanel(
    "MEMO BOX",
    `
<div class="tab-container">
${tabs}

<button
  class="tab"
  onclick="addMemoBox()">
＋
</button>
</div>

<input
  id="memoBoxName"
  value="${escapeHtml(current.name)}">

<textarea
  id="memoBoxText"
  rows="12"
  style="width:100%;">
${escapeHtml(current.text)}
</textarea>

<div class="btn-group">

<button onclick="saveMemoBoxCurrent()">
💾保存
</button>

<button onclick="useMemoForSearch()">
🔍検索
</button>

<button onclick="copyMemoBox()">
📋コピー
</button>

<button onclick="deleteMemoBox()">
🗑削除
</button>

</div>
`
  );

}