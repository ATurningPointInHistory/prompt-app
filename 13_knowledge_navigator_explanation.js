/* ============================================================
   FILE: 13_knowledge_navigator_explanation.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Explanation 1.0.0
   Phase 3: Basic Navigation
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
    if (status === "complete") return "「" + label + "」への基本NavigationをCanonical Snapshotから解決しました。Phase 3ではAuthority・Evidence・Relationshipの判定はまだ行いません。";
    if (status === "not-found") return "「" + label + "」は現在のCanonical Snapshotから見つかりませんでした。存在しないとは断定せず、現在Sourceでは未検出として扱います。";
    if (status === "missing-source") return "Navigationに必要なSourceが現在利用できません。不足情報は推測して補完していません。";
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
        "Canonical Identity Exact/Contains Match",
        "No Authority Scoring",
        "No Missing Source Inference"
      ],
      navigationPath: internal.clone(result.navigationPath || []),
      sources: internal.clone(result.sources || []),
      authority: internal.clone(result.authority || { status: "not-applicable" }),
      evidence: internal.clone(result.evidence || []),
      validation: internal.clone(result.validation || { status: "not-evaluated" }),
      missingSources: internal.clone(result.missingSources || []),
      limitations: internal.unique((result.metadata && result.metadata.limitations || []).concat([
        "Phase 3 Basic Navigation does not resolve authority.",
        "Phase 3 Basic Navigation does not traverse relationships.",
        "Phase 3 Basic Navigation does not resolve evidence or lineage."
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
    buildBasicNavigationExplanation: buildBasicExplanation
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.explanation = {
    id: "IDE-180-EXPLANATION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 3,
    structured: true,
    humanReadable: true,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
