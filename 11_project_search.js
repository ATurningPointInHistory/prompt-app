/* ===============================
   FILE: 11_project_search.js
   Project Search
   IDE-040
=============================== */

let projectSearchResults =
  [];

let projectSearchState = {
  keyword: "",
  type: "all",
  file: "",
  limit: 100
};

/* ===============================
   Initialize Project Search
=============================== */

function initProjectSearch() {

  projectSearchResults =
    [];

  projectSearchState = {
    keyword: "",
    type: "all",
    file: "",
    limit: 100
  };

  registerProjectSearchCommand();

  return true;

}

/* ===============================
   Get Project Search Database
=============================== */

function getProjectSearchDatabase() {

  if (
    typeof getProjectFunctionDatabase !==
    "function"
  ) {
    return {};
  }

  const database =
    getProjectFunctionDatabase();

  if (
    !database ||
    typeof database !== "object"
  ) {
    return {};
  }

  return database;

}

/* ===============================
   Normalize Project Search Array
=============================== */

function normalizeProjectSearchArray(
  value
) {

  if (Array.isArray(value)) {

    return value
      .filter(item =>
        item !== undefined &&
        item !== null
      )
      .map(item =>
        String(item)
      );

  }

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return [];
  }

  return [
    String(value)
  ];

}

/* ===============================
   Resolve Project Search Function Name
=============================== */

function getProjectSearchFunctionName(
  key,
  info
) {

  if (
    typeof getFunctionName ===
    "function"
  ) {

    const resolved =
      getFunctionName(
        info || {}
      );

    if (
      resolved &&
      resolved !== "unknown"
    ) {
      return resolved;
    }

  }

  return String(
    info?.name ||
    info?.functionName ||
    key ||
    "unknown"
  );

}

/* ===============================
   Resolve Project Search File Name
=============================== */

function getProjectSearchFileName(
  info
) {

  if (
    typeof getFunctionFileName ===
    "function"
  ) {

    const resolved =
      getFunctionFileName(
        info || {}
      );

    if (
      resolved &&
      resolved !== "unknown"
    ) {
      return resolved;
    }

  }

  return String(
    info?.file ||
    info?.fileName ||
    info?.path ||
    "unknown"
  );

}

/* ===============================
   Resolve Called Functions
=============================== */

function getProjectSearchCalledList(
  info
) {

  if (
    typeof getFunctionCalledList ===
    "function"
  ) {
    return normalizeProjectSearchArray(
      getFunctionCalledList(
        info || {}
      )
    );
  }

  return normalizeProjectSearchArray(
    info?.called ||
    info?.calls ||
    info?.dependencies
  );

}

/* ===============================
   Resolve Called By Functions
=============================== */

function getProjectSearchCalledByList(
  info
) {

  if (
    typeof getFunctionCalledByList ===
    "function"
  ) {
    return normalizeProjectSearchArray(
      getFunctionCalledByList(
        info || {}
      )
    );
  }

  return normalizeProjectSearchArray(
    info?.calledBy ||
    info?.callers ||
    info?.usedBy
  );

}

/* ===============================
   Build Project Search Records
=============================== */

function buildProjectSearchRecords() {

  const database =
    getProjectSearchDatabase();

  return Object.entries(
    database
  ).map(entry => {

    const key =
      entry[0];

    const info =
      entry[1] || {};

    const name =
      getProjectSearchFunctionName(
        key,
        info
      );

    const file =
      getProjectSearchFileName(
        info
      );

    return {

      id:
        "function:" + name,

      type:
        "function",

      name,

      title:
        name + "()",

      file,

      line:
        Number(
          info.line ||
          info.lineNumber ||
          0
        ),

      summary:
        String(
          info.summary ||
          info.aiComment ||
          info.description ||
          ""
        ),

      section:
        String(
          info.section ||
          ""
        ),

      category:
        String(
          info.category ||
          ""
        ),

      role:
        String(
          info.role ||
          ""
        ),

      risk:
        String(
          info.risk ||
          ""
        ),

      parameters:
        normalizeProjectSearchArray(
          info.parameters
        ),

      keywords:
        normalizeProjectSearchArray(
          info.keywords ||
          info.tags
        ),

      called:
        getProjectSearchCalledList(
          info
        ),

      calledBy:
        getProjectSearchCalledByList(
          info
        ),

      code:
        String(
          info.code ||
          info.source ||
          ""
        ),

      data:
        info

    };

  });

}

/* ===============================
   Normalize Project Search Query
=============================== */

function normalizeProjectSearchQuery(
  keyword
) {

  return String(keyword || "")
    .trim()
    .toLowerCase();

}

/* ===============================
   Get Project Search Values
=============================== */

function getProjectSearchValues(
  record
) {

  if (!record) {
    return [];
  }

  return [

    record.name,
    record.title,
    record.file,
    record.summary,
    record.section,
    record.category,
    record.role,
    record.risk,
    ...normalizeProjectSearchArray(
      record.parameters
    ),
    ...normalizeProjectSearchArray(
      record.keywords
    ),
    ...normalizeProjectSearchArray(
      record.called
    ),
    ...normalizeProjectSearchArray(
      record.calledBy
    ),
    record.code

  ]
    .filter(value =>
      value !== undefined &&
      value !== null
    )
    .map(value =>
      String(value)
        .toLowerCase()
    );

}

/* ===============================
   Calculate Project Search Score
=============================== */

function calculateProjectSearchScore(
  record,
  keyword
) {

  const query =
    normalizeProjectSearchQuery(
      keyword
    );

  if (!query) {
    return 0;
  }

  const name =
    String(
      record?.name || ""
    ).toLowerCase();

  const file =
    String(
      record?.file || ""
    ).toLowerCase();

  const summary =
    String(
      record?.summary || ""
    ).toLowerCase();

  let score =
    -1;

  if (name === query) {
    score = Math.max(
      score,
      1000
    );
  }

  if (name.startsWith(query)) {
    score = Math.max(
      score,
      800
    );
  }

  if (name.includes(query)) {
    score = Math.max(
      score,
      600
    );
  }

  if (file === query) {
    score = Math.max(
      score,
      500
    );
  }

  if (file.includes(query)) {
    score = Math.max(
      score,
      400
    );
  }

  if (summary.includes(query)) {
    score = Math.max(
      score,
      300
    );
  }

  const values =
    getProjectSearchValues(
      record
    );

  if (
    values.some(value =>
      value.includes(query)
    )
  ) {
    score = Math.max(
      score,
      100
    );
  }

  return score;

}

/* ===============================
   Match Project Search Filter
=============================== */

function matchProjectSearchFilter(
  record,
  options = {}
) {

  if (!record) {
    return false;
  }

  const type =
    String(
      options.type || "all"
    ).toLowerCase();

  const file =
    String(
      options.file || ""
    )
      .trim()
      .toLowerCase();

  if (
    type !== "all" &&
    String(record.type || "")
      .toLowerCase() !== type
  ) {
    return false;
  }

  if (
    file &&
    !String(record.file || "")
      .toLowerCase()
      .includes(file)
  ) {
    return false;
  }

  return true;

}

/* ===============================
   Compare Project Search Results
=============================== */

function compareProjectSearchResults(
  a,
  b
) {

  const scoreDifference =
    Number(b.score || 0) -
    Number(a.score || 0);

  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  const fileDifference =
    String(a.file || "")
      .localeCompare(
        String(b.file || "")
      );

  if (fileDifference !== 0) {
    return fileDifference;
  }

  return String(a.name || "")
    .localeCompare(
      String(b.name || "")
    );

}

/* ===============================
   Search Project
=============================== */

function searchProject(
  keyword,
  options = {}
) {

  const query =
    normalizeProjectSearchQuery(
      keyword
    );

  const limit =
    Math.max(
      1,
      Number(
        options.limit ||
        projectSearchState.limit ||
        100
      )
    );

  const records =
    buildProjectSearchRecords();

  const results =
    records
      .filter(record =>
        matchProjectSearchFilter(
          record,
          options
        )
      )
      .map(record => ({
        ...record,

        score:
          query
            ? calculateProjectSearchScore(
                record,
                query
              )
            : 0
      }))
      .filter(record =>
        !query ||
        record.score >= 0
      )
      .sort(
        compareProjectSearchResults
      )
      .slice(
        0,
        limit
      );

  projectSearchState = {

    keyword:
      String(keyword || ""),

    type:
      String(
        options.type || "all"
      ),

    file:
      String(
        options.file || ""
      ),

    limit

  };

  projectSearchResults =
    results;

  return results;

}

/* ===============================
   Get Project Search Files
=============================== */

function getProjectSearchFiles() {

  return [
    ...new Set(
      buildProjectSearchRecords()
        .map(record =>
          record.file
        )
        .filter(file =>
          file &&
          file !== "unknown"
        )
    )
  ].sort((a, b) =>
    String(a)
      .localeCompare(
        String(b)
      )
  );

}

/* ===============================
   Build Project Search File Options
=============================== */

function buildProjectSearchFileOptions() {

  return getProjectSearchFiles()
    .map(file => `
<option value="${escapeHtml(
  file
)}">
${escapeHtml(file)}
</option>
`)
    .join("");

}

/* ===============================
   Show Project Search
=============================== */

function showProjectSearch() {

  openFloatPanel(

    "Project Search",

    `
<div class="small">
プロジェクト内の関数・ファイル・呼び出し関係・ソースコードを横断検索します。
</div>

<input
  id="projectSearchKeyword"
  type="text"
  placeholder="関数名・ファイル名・キーワード・コード"
  style="
    width:100%;
    margin-top:8px;
  "
  oninput="updateProjectSearch()"
  onkeydown="handleProjectSearchKeydown(event)"
>

<div
  style="
    display:flex;
    gap:6px;
    margin-top:8px;
  "
>

<select
  id="projectSearchType"
  onchange="updateProjectSearch()"
  style="flex:1;"
>
  <option value="all">
    All
  </option>

  <option value="function">
    Function
  </option>
</select>

<select
  id="projectSearchFile"
  onchange="updateProjectSearch()"
  style="flex:2;"
>
  <option value="">
    All Files
  </option>

  ${buildProjectSearchFileOptions()}
</select>

</div>

<div
  class="float-panel-actions"
  style="margin-top:8px;"
>

<button
  onclick="executeProjectSearch()"
>
🔍 Search
</button>

<button
  onclick="clearProjectSearch()"
>
Clear
</button>

<button
  onclick="refreshProjectSearchDatabase()"
>
🔄 Refresh DB
</button>

</div>

<div
  id="projectSearchSummary"
  class="small"
  style="margin-top:8px;"
>
検索語を入力してください。
</div>

<div
  id="projectSearchResult"
  style="margin-top:8px;"
>
</div>
`

  );

  requestAnimationFrame(() => {

    const input =
      get(
        "projectSearchKeyword"
      );

    if (input) {
      input.focus();
    }

  });

  return true;

}

/* ===============================
   Execute Project Search
=============================== */

function executeProjectSearch() {

  const keywordInput =
    get(
      "projectSearchKeyword"
    );

  const typeInput =
    get(
      "projectSearchType"
    );

  const fileInput =
    get(
      "projectSearchFile"
    );

  const keyword =
    keywordInput
      ? keywordInput.value
      : "";

  const options = {

    type:
      typeInput
        ? typeInput.value
        : "all",

    file:
      fileInput
        ? fileInput.value
        : "",

    limit: 100

  };

  const results =
    searchProject(
      keyword,
      options
    );

  renderProjectSearchResults(
    results
  );

  return results;

}

/* ===============================
   Update Project Search
=============================== */

function updateProjectSearch() {

  return executeProjectSearch();

}

/* ===============================
   Render Project Search Results
=============================== */

function renderProjectSearchResults(
  results
) {

  const resultBox =
    get(
      "projectSearchResult"
    );

  const summaryBox =
    get(
      "projectSearchSummary"
    );

  if (summaryBox) {

    summaryBox.textContent =
      String(
        Array.isArray(results)
          ? results.length
          : 0
      ) +
      "件";

  }

  if (!resultBox) {
    return false;
  }

  resultBox.innerHTML =
    buildProjectSearchResultsHtml(
      results
    );

  return true;

}

/* ===============================
   Build Project Search Results HTML
=============================== */

function buildProjectSearchResultsHtml(
  results
) {

  if (
    !Array.isArray(results) ||
    !results.length
  ) {

    return `
<div class="small">
検索結果はありません。
</div>
`;

  }

  return results
    .map((record, index) =>
      buildProjectSearchResultHtml(
        record,
        index
      )
    )
    .join("");

}

/* ===============================
   Build Project Search Result HTML
=============================== */

function buildProjectSearchResultHtml(
  record,
  index
) {

  const summary =
    record.summary ||
    "説明なし";

  return `
<div
  class="function-help-item"
  onclick="openProjectSearchResult(${index})"
>

<div>
  <b>
    🔧
    ${escapeHtml(
      record.title ||
      record.name ||
      "unknown"
    )}
  </b>
</div>

<div class="small">
  ${escapeHtml(
    record.file ||
    "unknown"
  )}
  ${
    record.line
      ? " : line " +
        escapeHtml(
          record.line
        )
      : ""
  }
</div>

<div class="small">
  ${escapeHtml(summary)}
</div>

<div
  class="float-panel-actions"
  style="margin-top:6px;"
>

<button
  onclick="
    event.stopPropagation();
    showFunctionHelp('${escapeHtml(
      record.name
    )}');
  "
>
📖 Help
</button>

<button
  onclick="
    event.stopPropagation();
    jumpToProjectSearchResult(${index});
  "
>
➡ Jump
</button>

</div>

</div>

<hr>
`;

}

/* ===============================
   Get Project Search Result
=============================== */

function getProjectSearchResult(
  index
) {

  const resultIndex =
    Number(index);

  if (
    !Number.isInteger(
      resultIndex
    ) ||
    resultIndex < 0 ||
    resultIndex >=
      projectSearchResults.length
  ) {
    return null;
  }

  return projectSearchResults[
    resultIndex
  ] || null;

}

/* ===============================
   Open Project Search Result
=============================== */

function openProjectSearchResult(
  index
) {

  const record =
    getProjectSearchResult(
      index
    );

  if (!record) {
    return false;
  }

  if (
    typeof showFunctionHelp ===
    "function"
  ) {
    return showFunctionHelp(
      record.name
    );
  }

  return false;

}

/* ===============================
   Jump To Project Search Result
=============================== */

function jumpToProjectSearchResult(
  index
) {

  const record =
    getProjectSearchResult(
      index
    );

  if (!record) {
    return false;
  }

  if (
    typeof jumpToFunction ===
    "function"
  ) {
    return jumpToFunction(
      record.name
    );
  }

  if (
    typeof showFunctionHelp ===
    "function"
  ) {
    return showFunctionHelp(
      record.name
    );
  }

  alert(
    "関数移動APIが見つかりません。\n\n" +
    record.name
  );

  return false;

}

/* ===============================
   Clear Project Search
=============================== */

function clearProjectSearch() {

  const keywordInput =
    get(
      "projectSearchKeyword"
    );

  const typeInput =
    get(
      "projectSearchType"
    );

  const fileInput =
    get(
      "projectSearchFile"
    );

  if (keywordInput) {
    keywordInput.value = "";
  }

  if (typeInput) {
    typeInput.value = "all";
  }

  if (fileInput) {
    fileInput.value = "";
  }

  projectSearchResults =
    [];

  return executeProjectSearch();

}

/* ===============================
   Refresh Project Search Database
=============================== */

function refreshProjectSearchDatabase() {

  if (
    typeof refreshCurrentProjectFunctionDatabase !==
    "function"
  ) {

    alert(
      "refreshCurrentProjectFunctionDatabase is not defined"
    );

    return false;

  }

  const result =
    refreshCurrentProjectFunctionDatabase();

  if (
    result &&
    typeof result.then ===
    "function"
  ) {

    return result.then(() => {

      showProjectSearch();

      return true;

    });

  }

  showProjectSearch();

  return true;

}

/* ===============================
   Handle Project Search Keydown
=============================== */

function handleProjectSearchKeydown(
  event
) {

  if (!event) {
    return false;
  }

  if (event.key === "Enter") {

    event.preventDefault();

    executeProjectSearch();

    return true;

  }

  if (event.key === "Escape") {

    if (
      typeof closeFloatPanel ===
      "function"
    ) {
      closeFloatPanel();
    }

    return true;

  }

  return false;

}

/* ===============================
   Register Project Search Command
=============================== */

function registerProjectSearchCommand() {

  if (
    typeof registerCommandPaletteCommand !==
    "function"
  ) {
    return false;
  }

  return registerCommandPaletteCommand({

    id:
      "ide.projectSearch.open",

    type:
      "ide",

    title:
      "Open Project Search",

    summary:
      "プロジェクト全体を横断検索します。",

    category:
      "IDE",

    keywords: [
      "project",
      "search",
      "function",
      "file",
      "source",
      "code",
      "検索",
      "横断検索"
    ],

    icon:
      "🔍",

    action() {

      return showProjectSearch();

    }

  });

}

/* ===============================
   Validate Project Search
=============================== */

function validateProjectSearch() {

  const records =
    buildProjectSearchRecords();

  const testResults =
    records.length
      ? searchProject(
          records[0].name,
          {
            limit: 10
          }
        )
      : [];

  const checks = {

    database:
      typeof getProjectFunctionDatabase ===
      "function",

    records:
      Array.isArray(
        records
      ),

    search:
      typeof searchProject ===
      "function",

    renderer:
      typeof buildProjectSearchResultsHtml ===
      "function",

    launcher:
      typeof showProjectSearch ===
      "function",

    command:
      typeof registerProjectSearchCommand ===
      "function",

    exactSearch:
      !records.length ||
      testResults.some(result =>
        result.name ===
        records[0].name
      )

  };

  const failed =
    Object.entries(checks)
      .filter(entry =>
        entry[1] !== true
      )
      .map(entry =>
        entry[0]
      );

  return {

    id:
      "IDE-040",

    title:
      "Project Search",

    valid:
      failed.length === 0,

    passed:
      Object.keys(checks).length -
      failed.length,

    total:
      Object.keys(checks).length,

    failed,

    checks,

    records:
      records.length,

    searchResultCount:
      testResults.length

  };

}

/* ===============================
   Window Export
=============================== */

window.initProjectSearch =
  initProjectSearch;

window.searchProject =
  searchProject;

window.showProjectSearch =
  showProjectSearch;

window.executeProjectSearch =
  executeProjectSearch;

window.updateProjectSearch =
  updateProjectSearch;

window.clearProjectSearch =
  clearProjectSearch;

window.openProjectSearchResult =
  openProjectSearchResult;

window.jumpToProjectSearchResult =
  jumpToProjectSearchResult;

window.refreshProjectSearchDatabase =
  refreshProjectSearchDatabase;

window.handleProjectSearchKeydown =
  handleProjectSearchKeydown;

window.registerProjectSearchCommand =
  registerProjectSearchCommand;

window.validateProjectSearch =
  validateProjectSearch;

/* ===============================
   Initialize
=============================== */

initProjectSearch();

console.log(
  "11_project_search loaded"
);

