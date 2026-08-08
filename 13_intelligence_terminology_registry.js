/* ============================================================
   FILE: 13_intelligence_terminology_registry.js
   IDE-170 Intelligence Platform
   Release: Version Manifest / Module: 1.0.0
   Phase 6: Japanese Terminology Registry and Normalization
   Architecture Decision: IDE-170-007
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  const VERSION_MANIFEST = global.IDE170VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) return;
  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("terminologyRegistry");
  const CAPABILITY_ID = "IDE-170-TERMINOLOGY-REGISTRY";
  const CAPABILITY_VERSION = VERSION_MANIFEST.getCapabilityVersion(CAPABILITY_ID);
  const SCHEMA_ID = "IDE-170-SCHEMA-TERMINOLOGY-RECORD";
  const SCHEMA_VERSION = VERSION_MANIFEST.getSchemaVersion(SCHEMA_ID);
  const MINIMUM_VERSION = VERSION_MANIFEST.compatibility.minimumInternalCapabilityVersion;

  if (!(state.terminologyRecords instanceof Map)) state.terminologyRecords = new Map();

  const BUILT_INS = [
    { id:"TERM-FUNCTION", formalTerm:"function", japaneseName:"関数", englishName:"Function", aliases:["メソッド","function"], recordType:"function", domain:"repository" },
    { id:"TERM-FILE", formalTerm:"file", japaneseName:"ファイル", englishName:"File", aliases:["ソース","script","スクリプト"], recordType:"file", domain:"repository" },
    { id:"TERM-MODULE", formalTerm:"module", japaneseName:"モジュール", englishName:"Module", aliases:["module","コンポーネント"], recordType:"module", domain:"repository" },
    { id:"TERM-PROJECT", formalTerm:"project", japaneseName:"プロジェクト", englishName:"Project", aliases:["project"], recordType:"project", domain:"repository" },
    { id:"TERM-DEPENDENCY", formalTerm:"dependency", japaneseName:"依存", englishName:"Dependency", aliases:["依存先","呼出先","呼び出し先"], domain:"repository" },
    { id:"TERM-REVERSE-DEPENDENCY", formalTerm:"reverse-dependency", japaneseName:"逆依存", englishName:"Reverse Dependency", aliases:["呼出元","呼び出し元","参照元","使っている側"], domain:"repository" },
    { id:"TERM-CHANGE", formalTerm:"change", japaneseName:"変更", englishName:"Change", aliases:["修正","差分","変更履歴"], domain:"change" },
    { id:"TERM-SNAPSHOT", formalTerm:"snapshot", japaneseName:"スナップショット", englishName:"Snapshot", aliases:["snapshot","前回","基準状態"], domain:"change" },
    { id:"TERM-WORKFLOW", formalTerm:"workflow", japaneseName:"ワークフロー", englishName:"Workflow", aliases:["作業履歴","workflow"], domain:"workflow" },
    { id:"TERM-DECISION", formalTerm:"decision", japaneseName:"決定", englishName:"Decision", aliases:["判断","decision"], domain:"workflow" },
    { id:"TERM-APPROVAL", formalTerm:"approval", japaneseName:"承認", englishName:"Approval", aliases:["approval"], domain:"workflow" },
    { id:"TERM-ROLLBACK", formalTerm:"rollback", japaneseName:"ロールバック", englishName:"Rollback", aliases:["巻き戻し","rollback"], domain:"workflow" },
    { id:"TERM-VALIDATION", formalTerm:"validation", japaneseName:"検証", englishName:"Validation", aliases:["テスト","validation"], domain:"quality" },
    { id:"TERM-EVIDENCE", formalTerm:"evidence", japaneseName:"根拠", englishName:"Evidence", aliases:["証拠","evidence"], domain:"intelligence" },
    { id:"TERM-EXPLANATION", formalTerm:"explanation", japaneseName:"説明", englishName:"Explanation", aliases:["理由","なぜ","explanation"], domain:"intelligence" },
    { id:"TERM-MEMBER-LIST", formalTerm:"member-list", japaneseName:"一覧", englishName:"Member List", aliases:["関数一覧","メンバー一覧"], domain:"repository" },
    { id:"TERM-STATUS", formalTerm:"status", japaneseName:"状態", englishName:"Status", aliases:["ステータス","概要","status"], domain:"repository" },
    { id:"TERM-USAGE", formalTerm:"usage", japaneseName:"使用", englishName:"Usage", aliases:["使われている","使用されている"], domain:"repository" }
  ];

  function normalizeJapaneseQuery(value) {
    let text = String(value == null ? "" : value);
    if (typeof text.normalize === "function") text = text.normalize("NFKC");
    text = text
      .replace(/[‐‑‒–—―ー]+/g, "-")
      .replace(/\bIDE\s*-?\s*(\d{2,4})\b/gi, function (_, n) { return "IDE-" + n; })
      .replace(/([0-9A-Za-z_.-])\s+([0-9A-Za-z_.-])/g, "$1 $2")
      .replace(/[\t\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text;
  }

  function normalizeDefinition(definition) {
    const d = internal.isPlainObject(definition) ? definition : {};
    const id = internal.canonicalId(d.terminologyId || d.id || d.formalTerm);
    return {
      terminologyId: id,
      formalTerm: internal.text(d.formalTerm, ""),
      japaneseName: internal.text(d.japaneseName, ""),
      englishName: internal.text(d.englishName, ""),
      aliases: internal.unique(d.aliases || []),
      reading: internal.text(d.reading, ""),
      domain: internal.text(d.domain, "repository"),
      recordType: internal.text(d.recordType, ""),
      priority: Number.isFinite(Number(d.priority)) ? Number(d.priority) : 100,
      status: internal.text(d.status, "Official"),
      version: internal.text(d.version, CAPABILITY_VERSION),
      usageExamples: internal.asArray(d.usageExamples),
      conflictTerms: internal.asArray(d.conflictTerms),
      source: internal.text(d.source, "Architecture Decision 007")
    };
  }

  function registerTerminology(definition) {
    const record = normalizeDefinition(definition);
    if (!record.terminologyId || !record.formalTerm || !record.japaneseName) {
      return internal.buildResult(false, "TERMINOLOGY_INVALID", "Blocked", { record: record }, { error: { message: "Terminology requires id, formalTerm and japaneseName.", category: "Validation Failure" } });
    }
    if (state.terminologyRecords.has(record.terminologyId)) {
      return internal.buildResult(false, "TERMINOLOGY_DUPLICATE", "Blocked", { terminology: getTerminology(record.terminologyId) });
    }
    const stored = internal.deepFreeze(Object.assign({}, record, { createdAt: internal.nowIso(), immutable: true }));
    state.terminologyRecords.set(stored.terminologyId, stored);
    internal.touch();
    return internal.buildResult(true, "TERMINOLOGY_REGISTERED", "Ready", { terminology: internal.clone(stored) });
  }

  function getTerminology(id) {
    return internal.clone(state.terminologyRecords.get(internal.canonicalId(id)) || null);
  }

  function listTerminology(options) {
    const o = internal.isPlainObject(options) ? options : {};
    return [...state.terminologyRecords.values()].filter(function (x) {
      if (o.domain && x.domain !== o.domain) return false;
      if (o.recordType && x.recordType !== o.recordType) return false;
      return true;
    }).sort(function (a,b) { return a.priority - b.priority || a.formalTerm.localeCompare(b.formalTerm); }).map(internal.clone);
  }

  function resolveTerminology(input) {
    const normalized = normalizeJapaneseQuery(input);
    const lower = normalized.toLowerCase();
    const matches = [];
    state.terminologyRecords.forEach(function (record) {
      const terms = internal.unique([record.formalTerm, record.japaneseName, record.englishName].concat(record.aliases));
      const used = terms.filter(function (term) { return term && lower.includes(String(term).toLowerCase()); });
      if (used.length) matches.push({ terminologyId: record.terminologyId, formalTerm: record.formalTerm, domain: record.domain, recordType: record.recordType, matchedTerms: used, priority: record.priority });
    });
    matches.sort(function (a,b) { return a.priority - b.priority || a.formalTerm.localeCompare(b.formalTerm); });
    return { originalInput: String(input == null ? "" : input), normalizedInput: normalized, matches: matches, resolvedTerms: internal.unique(matches.map(function (x) { return x.formalTerm; })) };
  }

  function registerSchema() {
    if (!namespace.registerSchema || !namespace.getSchema) return internal.buildResult(false, "SCHEMA_REGISTRY_UNAVAILABLE", "Blocked");
    const existing = namespace.getSchema(SCHEMA_ID);
    if (existing && existing.version === SCHEMA_VERSION) return internal.buildResult(true, "SCHEMA_EXISTS", "Ready", { schema: existing });
    if (existing && internal.removeSchemaForValidation) internal.removeSchemaForValidation(SCHEMA_ID);
    return namespace.registerSchema({
      schemaId: SCHEMA_ID, name: "Terminology Record", version: SCHEMA_VERSION, type: "object",
      required: ["terminologyId","formalTerm","japaneseName","aliases","domain","status","version","immutable"],
      properties: { terminologyId:{type:"string"}, formalTerm:{type:"string"}, japaneseName:{type:"string"}, aliases:{type:"array"}, domain:{type:"string"}, status:{type:"string"}, version:{type:"string"}, immutable:{type:"boolean"} },
      additionalProperties: true, owner: "IDE-170", source: "Architecture Decision 007"
    });
  }

  function registerCapability() {
    if (!namespace.registerCapability || !namespace.getCapability) return internal.buildResult(false, "CAPABILITY_REGISTRY_UNAVAILABLE", "Blocked");
    const existing = namespace.getCapability(CAPABILITY_ID);
    if (existing && existing.version === CAPABILITY_VERSION) return internal.buildResult(true, "CAPABILITY_EXISTS", "Ready", { capability: existing });
    if (existing && internal.removeCapabilityForValidation) internal.removeCapabilityForValidation(CAPABILITY_ID);
    return namespace.registerCapability({
      capabilityId: CAPABILITY_ID, name: "Japanese Terminology Registry", version: CAPABILITY_VERSION, type: "Query", status: "Active", owner: "IDE-170",
      dependencies: [{ capabilityId:"IDE-170-CORE", minimumVersion:MINIMUM_VERSION, optional:false },{ capabilityId:"IDE-170-SCHEMA-REGISTRY", minimumVersion:MINIMUM_VERSION, optional:false }],
      schemas: [SCHEMA_ID], provides: ["Japanese Normalization","Terminology Resolution","Alias Resolution"], source: "Architecture Decision 007"
    });
  }

  function initializeTerminologyRegistry() {
    const schemaResult = registerSchema();
    const capabilityResult = registerCapability();
    const registered = [];
    BUILT_INS.forEach(function (item) {
      const id = internal.canonicalId(item.id);
      if (state.terminologyRecords.has(id)) return;
      const r = registerTerminology(Object.assign({}, item, { terminologyId:id, version:CAPABILITY_VERSION, status:"Official" }));
      registered.push({ id:id, ok:r.ok });
    });
    const ready = schemaResult.ok === true && capabilityResult.ok === true && state.terminologyRecords.size >= BUILT_INS.length;
    if (namespace.modules.terminologyRegistry) namespace.modules.terminologyRegistry.status = ready ? "Ready" : "Blocked";
    return internal.buildResult(ready, ready ? "TERMINOLOGY_REGISTRY_INITIALIZED" : "TERMINOLOGY_REGISTRY_INITIALIZATION_FAILED", ready ? "Ready" : "Blocked", { registeredCount:state.terminologyRecords.size, schemaResult:schemaResult, capabilityResult:capabilityResult });
  }

  function getTerminologyStatus() {
    return { id:"IDE-170-TERMINOLOGY-STATUS", version:MODULE_VERSION, capabilityVersion:CAPABILITY_VERSION, status:state.terminologyRecords.size ? "Ready" : "Loaded", ready:state.terminologyRecords.size >= BUILT_INS.length, terminologyCount:state.terminologyRecords.size, japaneseNormalizer:true, aliases:true };
  }

  Object.assign(namespace.api, { initializeTerminologyRegistry, registerTerminology, getTerminology, listTerminology, resolveTerminology, normalizeJapaneseQuery, getTerminologyStatus });
  Object.assign(namespace, namespace.api);
  namespace.modules.terminologyRegistry = { id:CAPABILITY_ID, version:MODULE_VERSION, capabilityVersion:CAPABILITY_VERSION, status:"Loaded", japaneseNormalization:true, terminologyResolution:true, aliasResolution:true, loadedAt:internal.nowIso() };
  global.normalizeIntelligenceJapaneseQuery = normalizeJapaneseQuery;
})(typeof window !== "undefined" ? window : globalThis);
