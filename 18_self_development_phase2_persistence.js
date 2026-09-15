/* ============================================================
   FILE: 18_self_development_phase2_persistence.js
   Decision 058 Phase 2 / Bounded Local Evidence + Lineage Persistence
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.SELFDEVELOPMENT058Environment, P2 = global.SELFDEVELOPMENT058Phase2VersionManifest;
  if (!namespace || !namespace.__internal || !P2) return;
  const i = namespace.__internal, s = i.state, policy = P2.persistence;
  const memoryFallback = { value: null };
  function getStorage() {
    try { return global.localStorage && typeof global.localStorage.getItem === "function" ? global.localStorage : null; } catch (_) { return null; }
  }
  function safeSnapshotEvidence(e) {
    if (!e || e.persistable !== true) return null;
    return {
      evidenceId: e.evidenceId, evidenceType: e.evidenceType, baselineIdentityId: e.baselineIdentityId || null,
      summary: e.summary, sourceRefs: i.unique(e.sourceRefs || []), snapshot: i.clone(e.snapshot),
      persistable: true, sourceCodePersisted: false, secretValuePersisted: false,
      canonicalMutationPerformed: false, authorityEffect: "none", createdAt: e.createdAt, immutable: true
    };
  }
  function safeSnapshotLineage(l) {
    if (!l) return null;
    return { lineageId: l.lineageId, relationType: l.relationType, outputId: l.outputId, inputIds: i.unique(l.inputIds || []), createdAt: l.createdAt, immutable: true };
  }
  function readEnvelope() {
    const storage = getStorage();
    try {
      const raw = storage ? storage.getItem(policy.key) : memoryFallback.value;
      if (!raw) return { schemaVersion: policy.schemaVersion, evidence: [], lineage: [], updatedAt: null };
      const parsed = JSON.parse(raw);
      if (!parsed || Number(parsed.schemaVersion) !== Number(policy.schemaVersion)) return { schemaVersion: policy.schemaVersion, evidence: [], lineage: [], updatedAt: null };
      return parsed;
    } catch (_) { return { schemaVersion: policy.schemaVersion, evidence: [], lineage: [], updatedAt: null, recovered: true }; }
  }
  function writeEnvelope(envelope) {
    const storage = getStorage(), raw = JSON.stringify(envelope);
    try { if (storage) storage.setItem(policy.key, raw); else memoryFallback.value = raw; return { ok: true, bytes: raw.length, adapter: storage ? "localStorage" : "memory" }; }
    catch (error) { return { ok: false, bytes: 0, adapter: storage ? "localStorage" : "memory", error: error && error.message ? error.message : String(error) }; }
  }
  function persistSelfDevelopmentPhase2Evidence(evidenceId) {
    const e = s.evidence.get(i.text(evidenceId, "")), safe = safeSnapshotEvidence(e);
    if (!safe) return i.buildResult(false, "SELFDEV058_EVIDENCE_NOT_PERSISTABLE", "Blocked", null);
    const env = readEnvelope();
    env.evidence = (Array.isArray(env.evidence) ? env.evidence : []).filter(function (x) { return x.evidenceId !== safe.evidenceId; });
    env.evidence.push(safe); env.evidence = env.evidence.slice(-policy.maxEvidence);
    const linked = Array.from(s.lineage.values()).filter(function (l) { return l && (l.outputId === safe.evidenceId || (Array.isArray(l.inputIds) && l.inputIds.includes(safe.evidenceId))); }).map(safeSnapshotLineage).filter(Boolean);
    env.lineage = (Array.isArray(env.lineage) ? env.lineage : []).concat(linked);
    const seen = new Set(); env.lineage = env.lineage.filter(function (x) { if (seen.has(x.lineageId)) return false; seen.add(x.lineageId); return true; }).slice(-policy.maxLineage);
    env.updatedAt = i.nowIso();
    env.safety = { sourceCodePersisted: false, secretValuePersisted: false, canonicalKnowledgePromotionPerformed: false, canonicalRepositoryMutationPerformed: false };
    const write = writeEnvelope(env);
    return i.buildResult(write.ok, write.ok ? "SELFDEV058_EVIDENCE_PERSISTED_LOCAL" : "SELFDEV058_EVIDENCE_PERSISTENCE_FAILED", write.ok ? "Persisted" : "Failed", { evidenceId: safe.evidenceId, adapter: write.adapter, bytes: write.bytes, bounded: true, canonicalKnowledgePromotionPerformed: false, canonicalRepositoryMutationPerformed: false }, write.ok ? null : { error: write.error });
  }
  function loadSelfDevelopmentPhase2Evidence() {
    const env = readEnvelope(); let restoredEvidence = 0, restoredLineage = 0;
    (Array.isArray(env.evidence) ? env.evidence : []).forEach(function (e) { if (e && e.evidenceId && e.persistable === true && e.sourceCodePersisted === false && e.secretValuePersisted === false) { s.evidence.set(e.evidenceId, i.deepFreeze(i.clone(e))); restoredEvidence += 1; } });
    (Array.isArray(env.lineage) ? env.lineage : []).forEach(function (l) { if (l && l.lineageId) { s.lineage.set(l.lineageId, i.deepFreeze(i.clone(l))); restoredLineage += 1; } });
    if (restoredEvidence || restoredLineage) i.touch();
    return i.buildResult(true, "SELFDEV058_PHASE2_LOCAL_EVIDENCE_LOADED", "Loaded", { restoredEvidence: restoredEvidence, restoredLineage: restoredLineage, adapter: getStorage() ? "localStorage" : "memory", sourceCodePersisted: false, secretValuePersisted: false, canonicalKnowledgePromotionPerformed: false });
  }
  function getSelfDevelopmentPhase2PersistenceStatus() {
    const env = readEnvelope(); return { adapter: getStorage() ? "localStorage" : "memory", key: policy.key, schemaVersion: policy.schemaVersion, evidenceCount: Array.isArray(env.evidence) ? env.evidence.length : 0, lineageCount: Array.isArray(env.lineage) ? env.lineage.length : 0, bounded: true, sourceCodePersistenceAllowed: false, secretPersistenceAllowed: false, canonicalKnowledgePromotionAllowed: false, canonicalRepositoryMutationAllowed: false, updatedAt: env.updatedAt || null };
  }
  Object.assign(namespace.api, { persistSelfDevelopmentPhase2Evidence, loadSelfDevelopmentPhase2Evidence, getSelfDevelopmentPhase2PersistenceStatus }); Object.assign(namespace, namespace.api);
  namespace.modules.phase2Persistence = { id: "SELF-DEVELOPMENT-058-PHASE2-PERSISTENCE", version: P2.version, status: "Ready", adapter: "localStorage", bounded: true, canonicalKnowledgePromotionAllowed: false, loadedAt: i.nowIso() };
})(typeof window !== "undefined" ? window : globalThis);
