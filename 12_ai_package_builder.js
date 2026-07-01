function buildKnowledgePackage(
  targetId
) {

  buildKnowledgeRepository();

  const packageIds =
    buildKnowledgePrerequisites(
      targetId
    );

  const lines = [];

  lines.push(
    "=================================="
  );

  lines.push(
    "AI PACKAGE"
  );

  lines.push(
    "=================================="
  );

  lines.push("");

  lines.push(
    "Target"
  );

  lines.push(
    targetId
  );

  lines.push("");

  lines.push(
    "Knowledge Objects"
  );

  lines.push("");

  packageIds.forEach(id => {

    const object =
      repositoryDatabase.byId[id];

    lines.push(
      `${id} ${
        object?.title || ""
      }`
    );

  });

  lines.push("");

  lines.push(
    `Object Count : ${packageIds.length}`
  );

  return lines.join("\n");

}

function buildKnowledgePrerequisites(
  targetId
) {

  const result =
    [];

  const visited =
    new Set();

  collectKnowledgeParents(
    targetId,
    visited,
    result
  );

  return result;

}

function collectKnowledgeParents(
  id,
  visited,
  result
) {

  if (
    visited.has(id)
  ) {
    return;
  }

  visited.add(id);

  const parents =
    repositoryDatabase.parents[id] || [];

  parents.forEach(parentId => {

    collectKnowledgeParents(
      parentId,
      visited,
      result
    );

  });

  result.push(id);

}

function showKnowledgePackage(
  targetId
) {

  const text =
    buildKnowledgePackage(
      targetId
    );

  openFloatPanel(
    "AI Package",
`
<div class="memo-actions">

<button
onclick="
copyKnowledgePackage(
'${escapeJs(targetId)}'
)">
📋コピー
</button>

</div>

<pre class="code-preview">
${escapeHtml(text)}
</pre>
`
  );

}

function copyKnowledgePackage(
  targetId
) {

  copyTextFallback(
    buildKnowledgePackage(
      targetId
    )
  );

}

window.buildKnowledgePackage =
  buildKnowledgePackage;

window.buildKnowledgePrerequisites =
  buildKnowledgePrerequisites;

window.collectKnowledgeParents =
  collectKnowledgeParents;

window.showKnowledgePackage =
  showKnowledgePackage;

window.copyKnowledgePackage =
  copyKnowledgePackage;