/* ===============================
   FILE: 12_repository_order.js
   Repository Simple Order Engine
=============================== */

const SIMPLE_REPOSITORY_SERIES_ORDER = [
  "VER",
  "DESIGN",
  "CORE",
  "PLATFORM",
  "ARCH",
  "ARCHITECTURE",
  "DOCUMENT",
  "KNOWLEDGE",
  "REPOSITORY",
  "DEPENDENCY",
  "RETRIEVAL",
  "PACKAGE",
  "PROMPT",
  "HANDOFF"
];

function extractSimpleRepositoryId(
  memo = {}
) {

  const text =
    [
      memo.id,
      memo.name,
      memo.title,
      memo.text
    ]
      .filter(Boolean)
      .join("\n");

  const match =
    text.match(
      /\b([A-Z][A-Z0-9]+(?:-[0-9]{3,4}|-[A-Z0-9]+))\b/
    );

  return match
    ? match[1]
    : "";

}

function getSimpleRepositorySeries(
  id = ""
) {

  return String(id || "")
    .split("-")[0]
    .toUpperCase();

}

function getSimpleRepositoryNumber(
  id = ""
) {

  const match =
    String(id || "").match(/-(\d+)/);

  return match
    ? Number(match[1])
    : 9999;

}

function getSimpleRepositorySeriesRank(
  series = ""
) {

  const index =
    SIMPLE_REPOSITORY_SERIES_ORDER.indexOf(
      String(series || "").toUpperCase()
    );

  return index >= 0
    ? index
    : 9999;

}

function compareSimpleRepositoryMemo(
  a = {},
  b = {}
) {

  const idA =
    extractSimpleRepositoryId(a);

  const idB =
    extractSimpleRepositoryId(b);

  const seriesA =
    getSimpleRepositorySeries(idA);

  const seriesB =
    getSimpleRepositorySeries(idB);

  const rankA =
    getSimpleRepositorySeriesRank(seriesA);

  const rankB =
    getSimpleRepositorySeriesRank(seriesB);

  if (rankA !== rankB) {
    return rankA - rankB;
  }

  const numberA =
    getSimpleRepositoryNumber(idA);

  const numberB =
    getSimpleRepositoryNumber(idB);

  if (numberA !== numberB) {
    return numberA - numberB;
  }

  return idA.localeCompare(idB);

}

function sortMemoBoxesBySimpleRepositoryOrder() {

  if (!Array.isArray(memoBoxList)) {
    alert("memoBoxList が見つかりません。");
    return;
  }

  memoBoxList =
    memoBoxList
      .map((memo, index) => ({
        ...memo,
        _beforeIndex: index
      }))
      .sort(compareSimpleRepositoryMemo)
      .map(memo => {
        delete memo._beforeIndex;
        return memo;
      });

  if (typeof saveMemoBoxList === "function") {
    saveMemoBoxList();
  }

  if (typeof renderMemoBoxList === "function") {
    renderMemoBoxList();
  }

  alert("Repository簡易順でメモを並べ替えました。");

}

window.sortMemoBoxesBySimpleRepositoryOrder =
  sortMemoBoxesBySimpleRepositoryOrder;