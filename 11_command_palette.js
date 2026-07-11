/* ===============================
   Show Command Palette
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

executeCommandPaletteSearch()

searchCommandPalette()

buildCommandPaletteListHtml()

executeCommandPaletteItem()