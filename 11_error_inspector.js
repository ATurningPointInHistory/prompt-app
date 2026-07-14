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

${buildErrorInspectorSummaryHtml()}

<hr>

${buildErrorInspectorRecordsHtml()}

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