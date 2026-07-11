/* ===============================
   FILE:11_command_palette.js
   Show Command Palette
   IDE-030
=============================== */

function showCommandPalette() {

  openFloatPanel(

    "Command Palette",

    `
<div class="small">

Command

</div>

<input
  id="commandPaletteKeyword"
  type="text"
  placeholder="Function..."
  style="width:100%;"
>

<div
class="float-panel-actions"
style="margin-top:8px;">

<button
onclick="executeCommandPaletteSearch()">

🔍 Search

</button>

</div>

<div
id="commandPaletteResult"
style="margin-top:10px;">

検索してください

</div>

`

  );

}

/* ===============================
   Search Command Palette
=============================== */

function searchCommandPalette(
  keyword
) {

  const query =
    String(keyword || "")
      .trim();

  if (!query) {
    return [];
  }

  return searchFunctionHelp(
    query
  ).map(info => ({

    type:
      "function",

    name:
      info.name,

    title:
      info.name + "()",

    summary:
      info.summary || "",

    file:
      info.file ||
      info.fileName ||

      "",

    data:
      info

  }));

}
