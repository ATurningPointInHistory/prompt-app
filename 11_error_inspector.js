/* ===============================
   FILE: 11_error_inspector.js
   IDE-050
   Error Inspector
=============================== */

let errorInspectorRecords = [];

let errorInspectorInitialized =
  false;

const errorInspectorMaxRecords =
  100;

/* ===============================
   Initialize Error Inspector
=============================== */

function initErrorInspector() {

  if (
    errorInspectorInitialized
  ) {
    return false;
  }

  errorInspectorInitialized =
    true;

  hookErrorInspectorRuntimeError();

  hookErrorInspectorPromiseRejection();

  return true;

}

/* ===============================
   Hook Runtime Error
=============================== */

function hookErrorInspectorRuntimeError() {

  window.addEventListener(
    "error",
    event => {

      addErrorInspectorRecord({

        source:
          "runtime",

        type:
          getErrorInspectorErrorType(
            event.error,
            event.message
          ),

        message:
          event.message ||
          "Unknown runtime error",

        file:
          event.filename ||
          "",

        line:
          Number(
            event.lineno || 0
          ),

        column:
          Number(
            event.colno || 0
          ),

        stack:
          event.error &&
          event.error.stack
            ? String(
                event.error.stack
              )
            : ""

      });

    }
  );

}

/* ===============================
   Hook Promise Rejection
=============================== */

function hookErrorInspectorPromiseRejection() {

  window.addEventListener(
    "unhandledrejection",
    event => {

      const reason =
        event.reason;

      addErrorInspectorRecord({

        source:
          "promise",

        type:
          getErrorInspectorErrorType(
            reason,
            "UnhandledPromiseRejection"
          ),

        message:
          getErrorInspectorMessage(
            reason
          ),

        file:
          "",

        line:
          0,

        column:
          0,

        stack:
          reason &&
          reason.stack
            ? String(
                reason.stack
              )
            : ""

      });

    }
  );

}

/* ===============================
   Add Error Inspector Record
=============================== */

function addErrorInspectorRecord(
  data = {}
) {

  const record = {

    id:
      createErrorInspectorRecordId(),

    source:
      String(
        data.source ||
        "manual"
      ),

    type:
      String(
        data.type ||
        "Error"
      ),

    message:
      String(
        data.message ||
        "Unknown Error"
      ),

    file:
      String(
        data.file ||
        ""
      ),

    line:
      Number(
        data.line || 0
      ),

    column:
      Number(
        data.column || 0
      ),

    functionName:
      String(
        data.functionName ||
        ""
      ),

    stack:
      String(
        data.stack ||
        ""
      ),

    createdAt:
      Date.now()

  };

  errorInspectorRecords.push(
    record
  );

  if (
    errorInspectorRecords.length >
    errorInspectorMaxRecords
  ) {

    errorInspectorRecords.splice(
      0,
      errorInspectorRecords.length -
      errorInspectorMaxRecords
    );

  }

  return record;

}

/* ===============================
   Create Error Record ID
=============================== */

function createErrorInspectorRecordId() {

  return [
    "ERR",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8)
  ].join("-");

}

/* ===============================
   Get Error Type
=============================== */

function getErrorInspectorErrorType(
  error,
  fallback
) {

  if (
    error &&
    error.name
  ) {
    return String(
      error.name
    );
  }

  const message =
    String(
      fallback || ""
    );

  const match =
    message.match(
      /^([A-Za-z]+Error)\s*:/
    );

  if (match) {
    return match[1];
  }

  return "Error";

}

/* ===============================
   Get Error Message
=============================== */

function getErrorInspectorMessage(
  error
) {

  if (!error) {
    return "Unknown Error";
  }

  if (
    typeof error ===
    "string"
  ) {
    return error;
  }

  if (
    error.message
  ) {
    return String(
      error.message
    );
  }

  try {

    return JSON.stringify(
      error
    );

  } catch (jsonError) {

    return String(
      error
    );

  }

}

/* ===============================
   Get Error Inspector Records
=============================== */

function getErrorInspectorRecords() {

  return errorInspectorRecords
    .slice()
    .sort((a, b) =>
      b.createdAt -
      a.createdAt
    );

}

/* ===============================
   Get Error Inspector Record
=============================== */

function getErrorInspectorRecord(
  id
) {

  const recordId =
    String(id || "");

  return errorInspectorRecords
    .find(record =>
      record.id ===
      recordId
    ) || null;

}

/* ===============================
   Clear Error History
=============================== */

function clearErrorHistory() {

  errorInspectorRecords = [];

  renderErrorInspector();

  return true;

}

/* ===============================
   Build Error Inspector Summary
=============================== */

function buildErrorInspectorSummaryHtml() {

  const records =
    getErrorInspectorRecords();

  const runtimeCount =
    records.filter(record =>
      record.source ===
      "runtime"
    ).length;

  const promiseCount =
    records.filter(record =>
      record.source ===
      "promise"
    ).length;

  return `
<div class="small">
Total:
<b>${records.length}</b>
　
Runtime:
<b>${runtimeCount}</b>
　
Promise:
<b>${promiseCount}</b>
</div>
`;

}

/* ===============================
   Build Error Inspector List
=============================== */

function buildErrorInspectorRecordsHtml() {

  const records =
    getErrorInspectorRecords();

  if (!records.length) {

    return `
<div class="small">
エラー履歴はありません。
</div>
`;

  }

  return records
    .map(record =>
      buildErrorInspectorRecordHtml(
        record
      )
    )
    .join("");

}

/* ===============================
   Build Error Inspector Record
=============================== */

function buildErrorInspectorRecordHtml(
  record
) {

  const location =
    buildErrorInspectorLocation(
      record
    );

  return `
<div
  class="function-help-item"
  onclick="showErrorInspectorDetail('${escapeHtml(
    record.id
  )}')"
  style="cursor:pointer;"
>

<div>
  <b>
    ⚠
    ${escapeHtml(
      record.type
    )}
  </b>
</div>

<div class="small">
  ${escapeHtml(
    record.message
  )}
</div>

<div class="small">
  ${escapeHtml(
    location
  )}
</div>

<div class="small">
  ${escapeHtml(
    formatErrorInspectorTime(
      record.createdAt
    )
  )}
</div>

</div>

<hr>
`;

}

/* ===============================
   Build Error Location
=============================== */

function buildErrorInspectorLocation(
  record
) {

  if (!record) {
    return "";
  }

  const parts = [];

  if (record.file) {

    parts.push(
      getErrorInspectorFileName(
        record.file
      )
    );

  }

  if (record.line) {

    parts.push(
      "line:" +
      record.line
    );

  }

  if (record.column) {

    parts.push(
      "column:" +
      record.column
    );

  }

  return parts.join(" ");
}

/* ===============================
   Get Error File Name
=============================== */

function getErrorInspectorFileName(
  file
) {

  const value =
    String(file || "");

  if (!value) {
    return "";
  }

  const parts =
    value.split("/");

  return (
    parts[
      parts.length - 1
    ] ||
    value
  );

}

/* ===============================
   Format Error Time
=============================== */

function formatErrorInspectorTime(
  timestamp
) {

  if (!timestamp) {
    return "";
  }

  return new Date(
    timestamp
  ).toLocaleTimeString();

}

/* ===============================
   Show Error Inspector
=============================== */

function showErrorInspector() {

  initErrorInspector();

  openFloatPanel(

    "Error Inspector",

    `
<div class="small">
実行時エラーと未処理Promiseを確認します。
</div>

<div
  class="float-panel-actions"
  style="margin-top:8px;"
>

<button
  onclick="renderErrorInspector()"
>
🔄 Refresh
</button>

<button
  onclick="runErrorInspection()"
>
🔍 Scan
</button>

<button
  onclick="clearErrorHistory()"
>
🗑 Clear
</button>

<button
  onclick="createErrorInspectorTestError()"
>
🧪 Test
</button>

</div>

<div
  id="errorInspectorContent"
  style="margin-top:10px;"
>
</div>
`

  );

  renderErrorInspector();

}

/* ===============================
   Render Error Inspector
=============================== */

function renderErrorInspector() {

  const container =
    document.getElementById(
      "errorInspectorContent"
    );

  if (!container) {
    return false;
  }

  container.innerHTML = `

<div>
  <b>Runtime Errors</b>
</div>

${buildErrorInspectorSummaryHtml()}

<hr>

${buildErrorInspectorRecordsHtml()}

<hr>

<div>
  <b>Static Inspection</b>
</div>

${buildErrorInspectorScanSummaryHtml()}

<hr>

${buildErrorInspectorScanResultsHtml()}

`;

  return true;

}

/* ===============================
   Show Error Inspector Detail
=============================== */

function showErrorInspectorDetail(
  id
) {

  const record =
    getErrorInspectorRecord(
      id
    );

  if (!record) {
    return false;
  }

  openFloatPanel(

    "Error Detail",

    `
<div>
  <b>
    ${escapeHtml(
      record.type
    )}
  </b>
</div>

<div
  class="small"
  style="margin-top:6px;"
>
Source
</div>

<div>
  ${escapeHtml(
    record.source
  )}
</div>

<div
  class="small"
  style="margin-top:6px;"
>
Message
</div>

<pre style="
  white-space:pre-wrap;
  word-break:break-word;
">${escapeHtml(
  record.message
)}</pre>

<div
  class="small"
  style="margin-top:6px;"
>
Location
</div>

<pre style="
  white-space:pre-wrap;
  word-break:break-word;
">${escapeHtml(
  buildErrorInspectorLocation(
    record
  ) || "Unknown"
)}</pre>

<div
  class="small"
  style="margin-top:6px;"
>
Stack
</div>

<pre style="
  white-space:pre-wrap;
  word-break:break-word;
">${escapeHtml(
  record.stack ||
  "No stack trace"
)}</pre>

<div
  class="float-panel-actions"
  style="margin-top:8px;"
>

<button
  onclick="showErrorInspector()"
>
← Back
</button>

</div>
`

  );

  return true;

}

/* ===============================
   Get Error Inspector Status
=============================== */

function getErrorInspectorStatus() {

  const records =
    getErrorInspectorRecords();

  const errorCount =
    records.length;

  const health =
    Math.max(
      0,
      100 -
      errorCount * 5
    );

  return {

    id:
      "IDE-050",

    title:
      "Error Inspector",

    version:
      "1.0.0",

    status:
      errorInspectorInitialized
        ? "Working"
        : "Ready",

    ready:
      typeof showErrorInspector ===
      "function",

    progress:
      30,

    health,

    errors:
      errorCount,

    warnings:
      0,

    nextTask:
      "Add static error scanners",

    updatedAt:
      Date.now()

  };

}

/* ===============================
   Test Runtime Error
=============================== */

function createErrorInspectorTestError() {

  setTimeout(() => {

    throw new Error(
      "IDE-050 test error"
    );

  }, 0);

}

/* ===============================
   Validate Error Inspector
=============================== */

function validateErrorInspector() {

  const before =
    errorInspectorRecords.length;

  const record =
    addErrorInspectorRecord({

      source:
        "validation",

      type:
        "ValidationError",

      message:
        "IDE-050 validation record"

    });

  const checks = {

    storage:
      Array.isArray(
        errorInspectorRecords
      ),

    add:
      Boolean(
        record &&
        record.id
      ),

    get:
      getErrorInspectorRecord(
        record.id
      ) === record,

    renderer:
      typeof buildErrorInspectorRecordsHtml ===
      "function",

    launcher:
      typeof showErrorInspector ===
      "function",

    status:
      typeof getErrorInspectorStatus ===
      "function",

    runtimeHook:
      typeof hookErrorInspectorRuntimeError ===
      "function",

    promiseHook:
      typeof hookErrorInspectorPromiseRejection ===
      "function"

  };

  errorInspectorRecords =
    errorInspectorRecords
      .filter(item =>
        item.id !==
        record.id
      );

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
      "IDE-050",

    title:
      "Error Inspector",

    valid:
      failed.length === 0,

    passed:
      Object.keys(checks).length -
      failed.length,

    total:
      Object.keys(checks).length,

    failed,

    checks,

    recordsBefore:
      before,

    recordsAfter:
      errorInspectorRecords.length

  };

}

/* ===============================
   Error Inspector Scan State
=============================== */

let errorInspectorScanResult = {

  duplicateFunctions: [],

  missingFunctions: [],

  invalidRecords: [],

  scannedFunctions: 0,

  scannedAt: 0

};

/* ===============================
   Get Inspector Function Database
=============================== */

function getErrorInspectorFunctionDatabase() {

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
    typeof database !==
    "object"
  ) {
    return {};
  }

  return database;

}

/* ===============================
   Normalize Inspector Array
=============================== */

function normalizeErrorInspectorArray(
  value
) {

  if (Array.isArray(value)) {

    return value
      .filter(item =>
        item !== undefined &&
        item !== null &&
        item !== ""
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
   Resolve Inspector Function Name
=============================== */

function getErrorInspectorFunctionName(
  key,
  info
) {

  if (
    typeof getFunctionName ===
    "function"
  ) {

    const name =
      getFunctionName(
        info || {}
      );

    if (
      name &&
      name !== "unknown"
    ) {
      return String(name);
    }

  }

  return String(
    info?.name ||
    info?.functionName ||
    key ||
    ""
  );

}

/* ===============================
   Resolve Inspector File Name
=============================== */

function getErrorInspectorFunctionFile(
  info
) {

  if (
    typeof getFunctionFileName ===
    "function"
  ) {

    const file =
      getFunctionFileName(
        info || {}
      );

    if (
      file &&
      file !== "unknown"
    ) {
      return String(file);
    }

  }

  return String(
    info?.file ||
    info?.fileName ||
    info?.path ||
    ""
  );

}

/* ===============================
   Resolve Inspector Called List
=============================== */

function getErrorInspectorCalledList(
  info
) {

  if (
    typeof getFunctionCalledList ===
    "function"
  ) {

    return normalizeErrorInspectorArray(
      getFunctionCalledList(
        info || {}
      )
    );

  }

  return normalizeErrorInspectorArray(
    info?.called ||
    info?.calls ||
    info?.dependencies
  );

}

/* ===============================
   Build Inspector Function Records
=============================== */

function buildErrorInspectorFunctionRecords() {

  const database =
    getErrorInspectorFunctionDatabase();

  return Object.entries(
    database
  ).map(entry => {

    const key =
      entry[0];

    const info =
      entry[1];

    if (
      !info ||
      typeof info !==
      "object"
    ) {

      return {

        key,

        name:
          String(key || ""),

        file:
          "",

        called:
          [],

        valid:
          false

      };

    }

    return {

      key,

      name:
        getErrorInspectorFunctionName(
          key,
          info
        ),

      file:
        getErrorInspectorFunctionFile(
          info
        ),

      called:
        getErrorInspectorCalledList(
          info
        ),

      valid:
        true

    };

  });

}

/* ===============================
   Scan Duplicate Functions
=============================== */

function scanErrorInspectorDuplicateFunctions(
  records
) {

  const source =
    Array.isArray(records)
      ? records
      : [];

  const map =
    Object.create(null);

  source.forEach(record => {

    const name =
      String(
        record?.name || ""
      ).trim();

    if (!name) {
      return;
    }

    if (!map[name]) {
      map[name] = [];
    }

    map[name].push({

      key:
        record.key,

      file:
        record.file

    });

  });

  return Object.entries(map)
    .filter(entry =>
      entry[1].length > 1
    )
    .map(entry => ({

      name:
        entry[0],

      count:
        entry[1].length,

      definitions:
        entry[1]

    }));

}

/* ===============================
   Scan Missing Function Calls
=============================== */

function scanErrorInspectorMissingFunctions(
  records
) {

  const source =
    Array.isArray(records)
      ? records
      : [];

  const definedNames =
    new Set(
      source
        .map(record =>
          String(
            record?.name || ""
          ).trim()
        )
        .filter(Boolean)
    );

  const ignoreNames =
    new Set([

      "alert",
      "confirm",
      "prompt",

      "setTimeout",
      "clearTimeout",

      "setInterval",
      "clearInterval",

      "fetch",

      "parseInt",
      "parseFloat",

      "isNaN",

      "JSON",
      "Date",
      "Math",

      "String",
      "Number",
      "Boolean",

      "Object",
      "Array",
      "Set",
      "Map",

      "console"

    ]);

  const missingMap =
    Object.create(null);

  source.forEach(record => {

    normalizeErrorInspectorArray(
      record.called
    ).forEach(calledName => {

      const name =
        String(
          calledName || ""
        ).trim();

      if (
        !name ||
        definedNames.has(name) ||
        ignoreNames.has(name)
      ) {
        return;
      }

      if (!missingMap[name]) {

        missingMap[name] = {

          name,

          callers: []

        };

      }

      missingMap[name]
        .callers
        .push({

          name:
            record.name,

          file:
            record.file

        });

    });

  });

  return Object.values(
    missingMap
  ).map(item => ({

    ...item,

    callers:
      item.callers.filter(
        (
          caller,
          index,
          list
        ) =>
          index ===
          list.findIndex(compare =>
            compare.name ===
              caller.name &&
            compare.file ===
              caller.file
          )
      )

  }));

}

/* ===============================
   Scan Invalid Function Records
=============================== */

function scanErrorInspectorInvalidRecords(
  records
) {

  const source =
    Array.isArray(records)
      ? records
      : [];

  return source
    .filter(record =>
      !record.valid ||
      !record.name
    )
    .map(record => ({

      key:
        String(
          record?.key || ""
        ),

      name:
        String(
          record?.name || ""
        ),

      file:
        String(
          record?.file || ""
        )

    }));

}

/* ===============================
   Run Error Inspection
=============================== */

function runErrorInspection() {

  const records =
    buildErrorInspectorFunctionRecords();

  const duplicateFunctions =
    scanErrorInspectorDuplicateFunctions(
      records
    );

  const missingFunctions =
    scanErrorInspectorMissingFunctions(
      records
    );

  const invalidRecords =
    scanErrorInspectorInvalidRecords(
      records
    );

  errorInspectorScanResult = {

    duplicateFunctions,

    missingFunctions,

    invalidRecords,

    scannedFunctions:
      records.length,

    scannedAt:
      Date.now()

  };

  renderErrorInspector();

  return {
    ...errorInspectorScanResult
  };

}

/* ===============================
   Get Error Inspection Result
=============================== */

function getErrorInspectionResult() {

  return {

    duplicateFunctions:
      errorInspectorScanResult
        .duplicateFunctions
        .slice(),

    missingFunctions:
      errorInspectorScanResult
        .missingFunctions
        .slice(),

    invalidRecords:
      errorInspectorScanResult
        .invalidRecords
        .slice(),

    scannedFunctions:
      errorInspectorScanResult
        .scannedFunctions,

    scannedAt:
      errorInspectorScanResult
        .scannedAt

  };

}

/* ===============================
   Build Static Scan Summary
=============================== */

function buildErrorInspectorScanSummaryHtml() {

  const result =
    getErrorInspectionResult();

  if (!result.scannedAt) {

    return `
<div class="small">
静的診断はまだ実行されていません。
</div>
`;

  }

  return `
<div class="small">

Scanned:
<b>${result.scannedFunctions}</b>

<br>

Duplicate:
<b>${result.duplicateFunctions.length}</b>

<br>

Missing:
<b>${result.missingFunctions.length}</b>

<br>

Invalid:
<b>${result.invalidRecords.length}</b>

</div>
`;

}

/* ===============================
   Build Static Scan Results
=============================== */

function buildErrorInspectorScanResultsHtml() {

  const result =
    getErrorInspectionResult();

  const sections = [];

  if (
    result.duplicateFunctions.length
  ) {

    sections.push(`

<div>
  <b>Duplicate Functions</b>
</div>

${result.duplicateFunctions
  .map(item => `
<div class="small">
⚠ ${escapeHtml(item.name)}
× ${item.count}
</div>
`)
  .join("")}

`);

  }

  if (
    result.missingFunctions.length
  ) {

    sections.push(`

<div>
  <b>Missing Functions</b>
</div>

${result.missingFunctions
  .map(item => `
<div class="small">
⚠ ${escapeHtml(item.name)}
<br>
Called by:
${escapeHtml(
  item.callers
    .map(caller =>
      caller.name
    )
    .join(", ")
)}
</div>
`)
  .join("<hr>")}

`);

  }

  if (
    result.invalidRecords.length
  ) {

    sections.push(`

<div>
  <b>Invalid Records</b>
</div>

${result.invalidRecords
  .map(item => `
<div class="small">
⚠ ${escapeHtml(
  item.key ||
  "unknown"
)}
</div>
`)
  .join("")}

`);

  }

  if (!sections.length) {

    return `
<div class="small">
静的診断上の問題はありません。
</div>
`;

  }

  return sections.join("<hr>");

}

/* ===============================
   Window Export
=============================== */

window.initErrorInspector =
  initErrorInspector;

window.addErrorInspectorRecord =
  addErrorInspectorRecord;

window.getErrorInspectorRecords =
  getErrorInspectorRecords;

window.getErrorInspectorRecord =
  getErrorInspectorRecord;

window.clearErrorHistory =
  clearErrorHistory;

window.showErrorInspector =
  showErrorInspector;

window.renderErrorInspector =
  renderErrorInspector;

window.showErrorInspectorDetail =
  showErrorInspectorDetail;

window.getErrorInspectorStatus =
  getErrorInspectorStatus;

window.createErrorInspectorTestError =
  createErrorInspectorTestError;

window.validateErrorInspector =
  validateErrorInspector;

window.runErrorInspection =
  runErrorInspection;

window.getErrorInspectionResult =
  getErrorInspectionResult;

window.scanErrorInspectorDuplicateFunctions =
  scanErrorInspectorDuplicateFunctions;

window.scanErrorInspectorMissingFunctions =
  scanErrorInspectorMissingFunctions;