/* ============================================================
   FILE: 13_knowledge_navigator_session.js
   IDE-180 Knowledge Navigator
   Release: Version Manifest / Module: Session 1.0.0
   Phase 7: Session / Persistence / Reload
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE180KnowledgeNavigator;
  const VERSION_MANIFEST = global.IDE180VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-180 Session blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("session");
  const SESSION_VERSION = "1.0.0";

  if (!(state.navigationSessions instanceof Map)) state.navigationSessions = new Map();
  if (!Object.prototype.hasOwnProperty.call(state, "activeNavigationSessionId")) state.activeNavigationSessionId = null;
  if (!Object.prototype.hasOwnProperty.call(state, "lastNavigationSession")) state.lastNavigationSession = null;

  function providerSnapshot() {
    const providers = typeof namespace.listProviderDefinitions === "function" ? namespace.listProviderDefinitions() : [];
    return providers.map(function mapProvider(item) {
      const definition = typeof namespace.getProviderDefinition === "function" ? namespace.getProviderDefinition(item.providerId) : null;
      let described = null;
      try { described = definition && typeof definition.describe === "function" ? definition.describe() : null; } catch (_) { described = null; }
      const source = described || definition || {};
      return {
        providerId: item.providerId,
        providerVersion: source.providerVersion || null,
        sourceType: source.sourceType || null,
        readMode: source.readMode || null,
        availability: source.availability || "unknown",
        recordCount: Number.isFinite(Number(source.recordCount)) ? Number(source.recordCount) : null,
        relationshipCount: Number.isFinite(Number(source.relationshipCount)) ? Number(source.relationshipCount) : null
      };
    }).sort(function sortProvider(a, b) { return String(a.providerId).localeCompare(String(b.providerId)); });
  }

  function captureSourceSnapshot() {
    const intelligence = typeof namespace.getIntelligenceProviderStatus === "function" ? namespace.getIntelligenceProviderStatus() : null;
    const activePackage = intelligence && intelligence.activePackage || null;
    const contractVersions = internal.clone(VERSION_MANIFEST.contractVersions || {});
    const resolverDefinitions = typeof namespace.listResolverDefinitions === "function" ? namespace.listResolverDefinitions() : [];
    return internal.deepFreeze({
      snapshotVersion: "1.0.0",
      capturedAt: internal.nowIso(),
      ide170Package: activePackage ? {
        packageId: activePackage.packageId || null,
        packageHash: activePackage.packageHash || null,
        sourceOrigin: activePackage.sourceOrigin || null,
        providerVersion: intelligence && intelligence.providerVersion || null,
        availability: intelligence && intelligence.availability || null
      } : null,
      providers: providerSnapshot(),
      ide180: {
        releaseVersion: VERSION_MANIFEST.release.version,
        designFreezeVersion: VERSION_MANIFEST.release.designFreezeVersion,
        contractVersions: contractVersions,
        providerCount: typeof namespace.listProviderDefinitions === "function" ? namespace.listProviderDefinitions().length : 0,
        resolverCount: resolverDefinitions.length,
        navigationTypeCount: typeof namespace.listNavigationTypes === "function" ? namespace.listNavigationTypes().length : 0
      }
    });
  }

  function normalizeSessionStatus(value) {
    const allowed = ["created", "active", "completed", "partial", "cancelled", "failed", "stale"];
    return allowed.includes(value) ? value : "created";
  }

  function createNavigationSession(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const sessionId = internal.text(settings.sessionId, "") || internal.nextId("IDE-180-NAV-SESSION");
    if (state.navigationSessions.has(sessionId)) {
      return internal.buildResult(false, "IDE180_SESSION_DUPLICATE", "Blocked", { sessionId: sessionId });
    }
    const session = {
      sessionId: sessionId,
      version: SESSION_VERSION,
      createdAt: internal.nowIso(),
      updatedAt: null,
      status: "created",
      rootRequest: null,
      currentRequest: null,
      contextId: null,
      sourceSnapshot: captureSourceSnapshot(),
      navigationHistory: [],
      activeBudget: internal.clone(settings.activeBudget || null),
      metadata: internal.clone(settings.metadata || {}),
      readOnly: true
    };
    state.navigationSessions.set(sessionId, session);
    state.activeNavigationSessionId = sessionId;
    state.lastNavigationSession = internal.clone(session);
    internal.touch();
    return internal.buildResult(true, "IDE180_SESSION_CREATED", "Ready", { session: internal.clone(session) });
  }

  function getNavigationSession(sessionId) {
    const id = internal.text(sessionId || state.activeNavigationSessionId, "");
    return id && state.navigationSessions.has(id) ? internal.clone(state.navigationSessions.get(id)) : null;
  }

  function listNavigationSessions() {
    return Array.from(state.navigationSessions.values()).map(function copy(item) { return internal.clone(item); });
  }

  function summarizeHistory(result) {
    return {
      resultId: result && result.resultId || null,
      requestId: result && result.requestId || null,
      status: result && result.status || "error",
      navigationType: result && result.metadata && result.metadata.navigationType || null,
      target: result && result.target ? internal.clone(result.target) : null,
      pathLength: Array.isArray(result && result.navigationPath) ? result.navigationPath.length : 0,
      sourceCount: Array.isArray(result && result.sources) ? result.sources.length : 0,
      relationshipCount: Array.isArray(result && result.relationships) ? result.relationships.length : 0,
      missingSourceCount: Array.isArray(result && result.missingSources) ? result.missingSources.length : 0,
      conflictCount: Array.isArray(result && result.conflicts) ? result.conflicts.length : 0,
      createdAt: result && result.metadata && result.metadata.createdAt || internal.nowIso()
    };
  }

  async function navigateInSession(sessionId, input, options) {
    const id = internal.text(sessionId || state.activeNavigationSessionId, "");
    let session = id && state.navigationSessions.get(id) || null;
    if (!session) {
      const created = createNavigationSession({ metadata: { autoCreated: true } });
      if (!created.ok) return created;
      session = state.navigationSessions.get(created.data.session.sessionId);
    }
    if (typeof namespace.navigate !== "function") {
      return internal.buildResult(false, "IDE180_SESSION_NAVIGATOR_UNAVAILABLE", "Blocked", { sessionId: session.sessionId });
    }

    session.status = "active";
    session.updatedAt = internal.nowIso();
    const result = await namespace.navigate(input, options);
    if (result && result.requestId) {
      const requestSummary = {
        requestId: result.requestId,
        navigationType: result.metadata && result.metadata.navigationType || null,
        target: result.target ? internal.clone(result.target) : null,
        scope: result.metadata && result.metadata.scope ? internal.clone(result.metadata.scope) : null
      };
      if (!session.rootRequest) session.rootRequest = internal.clone(requestSummary);
      session.currentRequest = internal.clone(requestSummary);
    }
    session.contextId = result && result.metadata && result.metadata.contextId || session.contextId || internal.nextId("IDE-180-NAV-CONTEXT");
    session.sourceSnapshot = captureSourceSnapshot();
    session.navigationHistory.push(summarizeHistory(result));
    session.status = result && result.status === "partial" ? "partial" : (result && ["complete", "not-found", "missing-source", "unsupported"].includes(result.status) ? "completed" : "failed");
    session.updatedAt = internal.nowIso();
    state.lastNavigationSession = internal.clone(session);
    state.activeNavigationSessionId = session.sessionId;
    internal.touch();

    return internal.buildResult(true, "IDE180_SESSION_NAVIGATION_COMPLETE", session.status, {
      session: internal.clone(session),
      result: internal.clone(result)
    });
  }

  function completeNavigationSession(sessionId, status) {
    const id = internal.text(sessionId || state.activeNavigationSessionId, "");
    const session = id && state.navigationSessions.get(id) || null;
    if (!session) return internal.buildResult(false, "IDE180_SESSION_NOT_FOUND", "not-found", { sessionId: id });
    session.status = normalizeSessionStatus(status || "completed");
    session.updatedAt = internal.nowIso();
    state.lastNavigationSession = internal.clone(session);
    internal.touch();
    return internal.buildResult(true, "IDE180_SESSION_COMPLETED", session.status, { session: internal.clone(session) });
  }

  function clearNavigationRuntimeSessions() {
    const count = state.navigationSessions.size;
    state.navigationSessions.clear();
    state.activeNavigationSessionId = null;
    state.lastNavigationSession = null;
    internal.touch();
    return internal.buildResult(true, "IDE180_RUNTIME_SESSIONS_CLEARED", "Ready", { cleared: count, persistedReceiptsAffected: false });
  }

  function getSessionStatus() {
    return {
      id: "IDE-180-SESSION-STATUS",
      version: MODULE_VERSION,
      status: namespace.modules.session && namespace.modules.session.status || "Loaded",
      sessionCount: state.navigationSessions.size,
      activeSessionId: state.activeNavigationSessionId,
      lastSession: internal.clone(state.lastNavigationSession),
      runtimeOnly: true,
      hiddenLearningAllowed: false,
      readOnly: true
    };
  }

  function initializeSession() {
    namespace.modules.session.status = "Ready";
    return internal.buildResult(true, "IDE180_SESSION_INITIALIZED", "Ready", getSessionStatus());
  }

  Object.assign(namespace.api, {
    initializeSession: initializeSession,
    captureKnowledgeNavigatorSourceSnapshot: captureSourceSnapshot,
    createNavigationSession: createNavigationSession,
    getNavigationSession: getNavigationSession,
    listNavigationSessions: listNavigationSessions,
    navigateKnowledgeInSession: navigateInSession,
    completeNavigationSession: completeNavigationSession,
    clearNavigationRuntimeSessions: clearNavigationRuntimeSessions,
    getKnowledgeNavigatorSessionStatus: getSessionStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.session = {
    id: "IDE-180-SESSION",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 7,
    runtimeOnly: true,
    readOnly: true,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
