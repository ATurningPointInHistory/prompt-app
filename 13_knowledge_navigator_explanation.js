/* ============================================================
   FILE: 13_knowledge_navigator_explanation.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Explanation 1.2.0
   Phase 5: Authority / Evidence / Lineage
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 explanation blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("explanation");
  const CONTRACT_VERSION = VERSION_MANIFEST.getContractVersion("navigationExplanation");

  function humanText(status, target, request, detail) {
    const label = target && (target.name || target.qualifiedName || target.canonicalId) || internal.text(request && request.query, internal.text(request && request.navigationType, "対象"));
    const type = internal.text(request && request.navigationType, "");
    const relationshipType = ["relationship", "dependency", "reverse-dependency", "workflow"].includes(type);
    if (status === "complete" && relationshipType) return "「" + label + "」について、現在のFact Relationship GraphをRead-OnlyでTraversalし、Phase 5のAuthorityを非スコア方式で評価しました。Evidence参照は解決可能な範囲で保持します。";
    if (status === "complete") return "「" + label + "」へのNavigationを現在の正式Sourceから解決し、Authority・Evidence・Lineage・Validationの利用可能範囲を明示しました。";
    if (status === "not-found") return "「" + label + "」は現在の利用可能Sourceから見つかりませんでした。存在しないとは断定せず、現在Sourceでは未検出として扱います。";
    if (status === "missing-source") return "Navigationに必要なSourceが現在利用できません。不足情報は推測して補完していません。";
    if (status === "partial" && relationshipType) return "Relationship Traversalは実行しましたが、BudgetまたはSource境界により結果がPartialです。取得済みPathは保持しています。";
    if (status === "partial") return "Navigation候補を取得しましたが、一意に確定できないかSourceが部分的です。候補を保持したまま返します。";
    if (status === "unsupported") return "指定されたNavigation Typeは現在Phaseでは未実装です。別Typeへ推測変換していません。";
    return "Navigation Requestを完了できませんでした。" + (detail ? " " + detail : "");
  }

  function buildBasicExplanation(result, request, resolution) {
    const target = result.target || resolution && resolution.target || null;
    const explanation = {
      explanationId: internal.nextId("IDE-180-EXPLANATION"),
      version: CONTRACT_VERSION,
      resultId: result.resultId,
      conclusion: result.status,
      appliedRules: [
        "Explicit Navigation Type",
        "Canonical Identity Resolution",
        ["relationship", "dependency", "reverse-dependency"].includes(request && request.navigationType) ? "Deterministic Relationship Traversal" : "Basic Canonical Navigation",
        request && request.navigationType === "workflow" ? "Hybrid Workflow Traversal Policy" : null,
        "Fact Layer Default",
        "Cycle Detection",
        "No Authority Scoring",
        "No Missing Source Inference"
      ].filter(Boolean),
      navigationPath: internal.clone(result.navigationPath || []),
      sources: internal.clone(result.sources || []),
      authority: internal.clone(result.authority || { status: "not-applicable" }),
      evidence: internal.clone(result.evidence || []),
      validation: internal.clone(result.validation || { status: "not-evaluated" }),
      missingSources: internal.clone(result.missingSources || []),
      limitations: internal.unique((result.metadata && result.metadata.limitations || []).concat([
        "Phase 5 Authority uses deterministic rules and never uses a numeric score.",
        "Evidence and Lineage are limited to explicit records available in the current IDE-170 Intelligence Package.",
        "Missing Source information is not inferred."
      ])),
      truncation: internal.clone(result.metadata && result.metadata.truncation || { truncated: false, reason: null }),
      ambiguity: internal.clone(result.metadata && result.metadata.ambiguity || { status: "none", candidates: [] }),
      humanReadable: humanText(result.status, target, request, result.partialReason),
      metadata: {
        componentId: "IDE-180",
        implementationPhase: VERSION_MANIFEST.release.implementationPhase,
        generatedFromStructuredResult: true,
        hiddenReasoningIncluded: false,
        createdAt: internal.nowIso()
      }
    };
    return internal.deepFreeze(explanation);
  }

  function initializeExplanation() {
    namespace.modules.explanation.status = "Ready";
    return internal.buildResult(true, "IDE180_EXPLANATION_INITIALIZED", "Ready", {
      structured: true,
      humanReadable: true,
      hiddenReasoningIncluded: false,
      readOnly: true
    });
  }

  Object.assign(namespace.api, {
    initializeExplanation: initializeExplanation,
    buildBasicNavigationExplanation: buildBasicExplanation,
    buildKnowledgeNavigationExplanation: buildBasicExplanation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.explanation = {
    id: "IDE-180-EXPLANATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 5,
    structured: true,
    humanReadable: true,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
