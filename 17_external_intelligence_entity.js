/* ============================================================
   FILE: 17_external_intelligence_entity.js
   EXTERNAL-010 External Intelligence Platform
   Release: 1.6.0
   Phase 07: Stable Entity / Alias / Identifier / Resolution Candidates
   Decision: 027 / Supporting 022 / 037 / 042 / 050
   ============================================================ */
(function (global) {
  "use strict";
  const namespace = global.EXTERNAL010ExternalIntelligence;
  const VERSION_MANIFEST = global.EXTERNAL010VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("entity");
  ["entityRegistry", "entityAliasRecords", "entityIdentifierRecords", "entityMentions", "entityResolutionCandidates", "entityMergeSplitCandidates"].forEach(function ensure(key){if(!(state[key] instanceof Map))state[key]=new Map();});
  const RESOLUTION_STATES = new Set(VERSION_MANIFEST.entity.resolutionStates || []);

  function validate(contractKey, schemaId, record) {
    const cv = namespace.validateExternalIntelligenceContract(contractKey, record);
    const sv = namespace.validateExternalIntelligenceRecord(schemaId, record);
    return { valid: cv.valid === true && sv.valid === true, contract: cv, schema: sv };
  }

  function registerExternalIntelligenceEntity(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const entityId = internal.text(x.entityId, "");
    const entityType = internal.text(x.entityType, "UNKNOWN").toUpperCase();
    const canonicalLabel = internal.text(x.canonicalLabel, "");
    if (!entityId || !canonicalLabel) return internal.buildResult(false, "EXTERNAL010_ENTITY_STABLE_ID_AND_LABEL_REQUIRED", "Blocked", null);
    if (state.entityRegistry.has(entityId)) {
      return internal.buildResult(true, "EXTERNAL010_ENTITY_ALREADY_REGISTERED", "Ready", { entity: internal.clone(state.entityRegistry.get(entityId)), identityMerged: false });
    }
    const record = internal.deepFreeze({
      entityId,
      entityType,
      canonicalLabel,
      namespace: internal.text(x.namespace, "EXTERNAL-010"),
      validFrom: x.validFrom ? String(x.validFrom) : null,
      validUntil: x.validUntil ? String(x.validUntil) : null,
      resolutionState: "EXPLICIT_REGISTRY_ENTRY",
      evidenceRefs: internal.unique(x.evidenceRefs || []),
      aliasCount: 0,
      identifierCount: 0,
      identityCreatedFromNameMatchOnly: false,
      knowledgeIdentityLinkPerformed: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const validity = validate("entityRecord", "EXTERNAL-010-SCHEMA-ENTITY-RECORD", record);
    if (!validity.valid) return internal.buildResult(false, "EXTERNAL010_ENTITY_RECORD_INVALID", "Blocked", validity);
    state.entityRegistry.set(entityId, record); internal.touch();
    return internal.buildResult(true, "EXTERNAL010_ENTITY_REGISTERED", "Ready", { entity: internal.clone(record), authorityGranted: false });
  }

  function addExternalIntelligenceEntityAlias(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const entityId = internal.text(x.entityId, "");
    const alias = internal.text(x.alias, "");
    if (!entityId || !state.entityRegistry.has(entityId) || !alias) return internal.buildResult(false, "EXTERNAL010_ENTITY_ALIAS_INPUT_INVALID", "Blocked", null);
    const record = internal.deepFreeze({ entityAliasId: internal.nextId("EXTERNAL-010-ENTITY-ALIAS"), entityId, alias, namespace: internal.text(x.namespace, "GENERAL"), language: internal.text(x.language, "") || null, validFrom: x.validFrom ? String(x.validFrom) : null, validUntil: x.validUntil ? String(x.validUntil) : null, evidenceRefs: internal.unique(x.evidenceRefs || []), aliasMatchEqualsExactIdentity: false, createdAt: internal.nowIso(), immutable: true });
    const validity = validate("entityAliasRecord", "EXTERNAL-010-SCHEMA-ENTITY-ALIAS", record); if (!validity.valid) return internal.buildResult(false,"EXTERNAL010_ENTITY_ALIAS_INVALID","Blocked",validity);
    state.entityAliasRecords.set(record.entityAliasId, record); internal.touch(); return internal.buildResult(true,"EXTERNAL010_ENTITY_ALIAS_RECORDED","Ready",{entityAlias:internal.clone(record)});
  }

  function addExternalIntelligenceEntityIdentifier(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const entityId = internal.text(x.entityId, "");
    const identifier = internal.text(x.identifier, "");
    const namespaceId = internal.text(x.namespace, "");
    if (!entityId || !state.entityRegistry.has(entityId) || !identifier || !namespaceId) return internal.buildResult(false, "EXTERNAL010_ENTITY_IDENTIFIER_INPUT_INVALID", "Blocked", null);
    const record = internal.deepFreeze({ entityIdentifierId: internal.nextId("EXTERNAL-010-ENTITY-IDENTIFIER"), entityId, namespace: namespaceId, identifier, validFrom: x.validFrom ? String(x.validFrom) : null, validUntil: x.validUntil ? String(x.validUntil) : null, evidenceRefs: internal.unique(x.evidenceRefs || []), identifierEqualsPermanentIdentity: false, createdAt: internal.nowIso(), immutable: true });
    const validity = validate("entityIdentifierRecord", "EXTERNAL-010-SCHEMA-ENTITY-IDENTIFIER", record); if (!validity.valid) return internal.buildResult(false,"EXTERNAL010_ENTITY_IDENTIFIER_INVALID","Blocked",validity);
    state.entityIdentifierRecords.set(record.entityIdentifierId, record); internal.touch(); return internal.buildResult(true,"EXTERNAL010_ENTITY_IDENTIFIER_RECORDED","Ready",{entityIdentifier:internal.clone(record)});
  }

  function createEntityMention(input, mode) {
    const x = internal.isPlainObject(input) ? input : {};
    const sourceEvidenceId = internal.text(x.sourceEvidenceId, "");
    if (!sourceEvidenceId || !state.acquisitionEvidenceRecords.has(sourceEvidenceId)) return internal.buildResult(false, "EXTERNAL010_ENTITY_MENTION_EVIDENCE_REQUIRED", "Blocked", null);
    const mentionText = internal.text(x.mentionText, "") || null;
    const visualReference = internal.text(x.visualReference, "") || null;
    if (mode === "VISUAL" && !visualReference) return internal.buildResult(false, "EXTERNAL010_VISUAL_ENTITY_REFERENCE_REQUIRED", "Blocked", null);
    if (mode !== "VISUAL" && !mentionText && !visualReference) return internal.buildResult(false, "EXTERNAL010_ENTITY_MENTION_CONTENT_REQUIRED", "Blocked", null);
    const record = internal.deepFreeze({
      entityMentionId: internal.nextId("EXTERNAL-010-ENTITY-MENTION"),
      sourceEvidenceId,
      rawEvidenceId: internal.text(x.rawEvidenceId, "") || null,
      mentionMode: mode,
      mentionText,
      visualReference,
      contextReference: internal.text(x.contextReference, "") || null,
      candidateEntityIds: internal.unique(x.candidateEntityIds || []),
      resolvedEntityId: null,
      resolutionState: internal.text(x.resolutionState, "UNRESOLVED").toUpperCase(),
      mentionEqualsResolvedEntity: false,
      visualMentionEqualsResolvedEntity: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const validity = validate("entityMention", "EXTERNAL-010-SCHEMA-ENTITY-MENTION", record); if (!validity.valid) return internal.buildResult(false,"EXTERNAL010_ENTITY_MENTION_INVALID","Blocked",validity);
    state.entityMentions.set(record.entityMentionId, record); internal.touch(); return internal.buildResult(true,"EXTERNAL010_ENTITY_MENTION_CREATED","Candidate",{entityMention:internal.clone(record)});
  }

  function createExternalIntelligenceEntityMention(input) { return createEntityMention(input, "TEXT"); }
  function createExternalIntelligenceVisualEntityMention(input) { return createEntityMention(input, "VISUAL"); }

  function createExternalIntelligenceEntityResolutionCandidate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const mentionId = internal.text(x.entityMentionId, "");
    if (!mentionId || !state.entityMentions.has(mentionId)) return internal.buildResult(false, "EXTERNAL010_ENTITY_RESOLUTION_MENTION_REQUIRED", "Blocked", null);
    const candidateEntityId = internal.text(x.candidateEntityId, "") || null;
    let resolutionState = internal.text(x.resolutionState, "AMBIGUOUS").toUpperCase();
    if (!RESOLUTION_STATES.has(resolutionState)) resolutionState = "UNKNOWN";
    const visualSimilarityOnly = x.visualSimilarityOnly === true;
    const record = internal.deepFreeze({
      entityResolutionCandidateId: internal.nextId("EXTERNAL-010-ENTITY-RESOLUTION-CANDIDATE"),
      entityMentionId: mentionId,
      candidateEntityId,
      resolverId: internal.text(x.resolverId, "UNSPECIFIED"),
      resolverVersion: internal.text(x.resolverVersion, "UNKNOWN"),
      resolutionState,
      confidence: internal.text(x.confidence, "UNKNOWN").toUpperCase(),
      evidenceRefs: internal.unique(x.evidenceRefs || []),
      contextEvidenceRefs: internal.unique(x.contextEvidenceRefs || []),
      multimodalEvidenceRefs: internal.unique(x.multimodalEvidenceRefs || []),
      visualSimilarityOnly,
      canonicalResolutionPerformed: false,
      destructiveMergePerformed: false,
      knowledgeMutationPerformed: false,
      aiResolutionEqualsCanonicalConfirmation: false,
      visualSimilarityEqualsIdentity: false,
      createdAt: internal.nowIso(),
      immutable: true
    });
    const validity = validate("entityResolutionCandidate", "EXTERNAL-010-SCHEMA-ENTITY-RESOLUTION-CANDIDATE", record); if (!validity.valid) return internal.buildResult(false,"EXTERNAL010_ENTITY_RESOLUTION_CANDIDATE_INVALID","Blocked",validity);
    state.entityResolutionCandidates.set(record.entityResolutionCandidateId, record); internal.touch(); return internal.buildResult(true,"EXTERNAL010_ENTITY_RESOLUTION_CANDIDATE_CREATED",resolutionState,{resolutionCandidate:internal.clone(record),canonicalEntityResolved:false});
  }

  function createExternalIntelligenceEntityMergeSplitCandidate(input) {
    const x = internal.isPlainObject(input) ? input : {};
    const operation = internal.text(x.operation, "").toUpperCase();
    if (!["MERGE", "SPLIT"].includes(operation)) return internal.buildResult(false, "EXTERNAL010_ENTITY_MERGE_SPLIT_OPERATION_INVALID", "Blocked", null);
    const entityIds = internal.unique(x.entityIds || []);
    if ((operation === "MERGE" && entityIds.length < 2) || (operation === "SPLIT" && entityIds.length < 1)) return internal.buildResult(false, "EXTERNAL010_ENTITY_MERGE_SPLIT_ENTITY_COUNT_INVALID", "Blocked", { entityIds });
    const record = internal.deepFreeze({ entityMergeSplitCandidateId: internal.nextId("EXTERNAL-010-ENTITY-MERGE-SPLIT-CANDIDATE"), operation, entityIds, proposedEntityIds: internal.unique(x.proposedEntityIds || []), evidenceRefs: internal.unique(x.evidenceRefs || []), resolverId: internal.text(x.resolverId,"UNSPECIFIED"), resolverVersion: internal.text(x.resolverVersion,"UNKNOWN"), destructiveOperationPerformed:false, canonicalRegistryMutationPerformed:false, approvalGranted:false, createdAt:internal.nowIso(), immutable:true });
    const validity = validate("entityMergeSplitCandidate", "EXTERNAL-010-SCHEMA-ENTITY-MERGE-SPLIT-CANDIDATE", record); if(!validity.valid)return internal.buildResult(false,"EXTERNAL010_ENTITY_MERGE_SPLIT_CANDIDATE_INVALID","Blocked",validity);
    state.entityMergeSplitCandidates.set(record.entityMergeSplitCandidateId,record);internal.touch();return internal.buildResult(true,"EXTERNAL010_ENTITY_MERGE_SPLIT_CANDIDATE_CREATED","Candidate",{candidate:internal.clone(record),destructiveOperationPerformed:false});
  }

  function getExternalIntelligenceEntity(entityId) { const id=internal.text(entityId,""); const record=id&&state.entityRegistry.get(id); return record?internal.clone(record):null; }
  function getExternalIntelligenceEntityResolutionCandidate(id) { const key=internal.text(id,""); const record=key&&state.entityResolutionCandidates.get(key); return record?internal.clone(record):null; }

  function initializeExternalIntelligenceEntity() {
    namespace.modules.entity.status="Ready";
    return internal.buildResult(true,"EXTERNAL010_ENTITY_INITIALIZED","Ready",{stableEntityRegistry:true,aliasIdentifierGraph:true,evidenceGroundedResolutionCandidates:true,multimodalCandidateHook:true,visualSimilarityAutoResolveAllowed:false,ambiguousEntityMayBeSilentlyResolved:false});
  }

  Object.assign(namespace.api,{initializeExternalIntelligenceEntity,registerExternalIntelligenceEntity,addExternalIntelligenceEntityAlias,addExternalIntelligenceEntityIdentifier,createExternalIntelligenceEntityMention,createExternalIntelligenceVisualEntityMention,createExternalIntelligenceEntityResolutionCandidate,createExternalIntelligenceEntityMergeSplitCandidate,getExternalIntelligenceEntity,getExternalIntelligenceEntityResolutionCandidate});
  Object.assign(namespace,namespace.api);
  namespace.modules.entity={id:"EXTERNAL-010-ENTITY",version:MODULE_VERSION,status:"Loaded",phase:7,decisions:["027"],supporting:["022","037","042","050"],loadedAt:internal.nowIso()};
})(typeof window!=="undefined"?window:globalThis);
