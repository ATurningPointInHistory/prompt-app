/* ===============================
   11_function_help.js
   Search Function Help
=============================== */

function searchFunctionHelp(
  keyword
) {

  const query =
    String(keyword || "")
      .trim()
      .toLowerCase();

  const database =
    getProjectFunctionDatabase();

  if (
    !database ||
    typeof database !== "object"
  ) {
    return [];
  }

  const functions =
    Object.entries(database)
      .map(entry => {

        const key =
          entry[0];

        const info =
          entry[1] || {};

        return {
          ...info,

          name:
            getFunctionName(info) !== "unknown"
              ? getFunctionName(info)
              : key,

          file:
            getFunctionFileName(info)
        };

      });

  if (!query) {

    return functions.sort(
      (a, b) =>
        String(a.name || "")
          .localeCompare(
            String(b.name || "")
          )
    );

  }

  return functions
    .filter(info => {

      const called =
        getFunctionCalledList(
          info
        );

      const calledBy =
        getFunctionCalledByList(
          info
        );

      const values = [

        info.name,
        info.functionName,
        info.title,
        info.summary,
        info.description,
        info.file,
        info.fileName,
        info.path,
        info.category,
        info.section,
        ...(info.tags || []),
        ...(info.parameters || []),
        ...(called || []),
        ...(calledBy || [])

      ];

      return values
        .filter(value =>
          value !== undefined &&
          value !== null
        )
        .some(value =>
          String(value)
            .toLowerCase()
            .includes(query)
        );

    })
    .sort(
      (a, b) => {

        const aName =
          String(a.name || "")
            .toLowerCase();

        const bName =
          String(b.name || "")
            .toLowerCase();

        const aExact =
          aName === query;

        const bExact =
          bName === query;

        if (aExact !== bExact) {
          return aExact
            ? -1
            : 1;
        }

        const aStarts =
          aName.startsWith(query);

        const bStarts =
          bName.startsWith(query);

        if (aStarts !== bStarts) {
          return aStarts
            ? -1
            : 1;
        }

        return aName.localeCompare(
          bName
        );

      }
    );

}

/* ===============================
   Get Function Help
=============================== */

function getFunctionHelp(
  functionName
) {

  const name =
    String(functionName || "")
      .trim();

  if (!name) {
    return null;
  }

  const database =
    getProjectFunctionDatabase();

  if (
    !database ||
    typeof database !== "object"
  ) {
    return null;
  }

  const normalized =
    name.toLowerCase();

  const entry =
    Object.entries(database)
      .find(([key, info]) => {

        const actualName =
          getFunctionName(
            info
          );

        return (
          String(key)
            .toLowerCase() ===
            normalized ||

          String(actualName)
            .toLowerCase() ===
            normalized
        );

      });

  if (!entry) {
    return null;
  }

  const key =
    entry[0];

  const info =
    entry[1] || {};

  const resolvedName =
    getFunctionName(info) !==
    "unknown"
      ? getFunctionName(info)
      : key;

  return {
    ...info,

    name:
      resolvedName,

    file:
      getFunctionFileName(
        info
      ),

    called:
      filterSelfFunctionCalls(
        resolvedName,
        getFunctionCalledList(
          info
        )
      ),

    calledBy:
      filterSelfFunctionCalls(
        resolvedName,
        getFunctionCalledByList(
          info
        )
      )

  };

}