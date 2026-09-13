/* ============================================================
   FILE: 17_external_intelligence_full_memo_audit.js
   EXTERNAL-010 Full Memo Conformance Audit
   Release: 1.20.1 Conformance Repair Candidate

   IMPORTANT:
   - Reads a user-selected memo JSON in the browser only.
   - Does not upload/persist the memo or grant authority.
   - Static evidence candidates are NOT automatic PASS.
   ============================================================ */
(function (global) {
  "use strict";

  const n = global.EXTERNAL010ExternalIntelligence;
  const m = global.EXTERNAL010VersionManifest;
  if (!n || !n.__internal || !m) return;
  const i = n.__internal;
  const s = i.state;

  const CATALOG_URL = "./EXTERNAL-010_REQUIREMENT_TRACEABILITY_1.0.0.json";
  const MANIFEST_URL = "./00_script_manifest.json";
  const STOP = new Set([
    "with","from","into","when","where","that","this","true","false","hook","record","state","profile","candidate","foundation","integration","validation","initial","implementation","external","intelligence","required","requirement","support","supports","supporting","and","the","for","are","not","may","use","using","only","current","existing","explicit","stable","basic","minimum","possible"
  ]);

  function text(v, fallback) { return typeof v === "string" && v.trim() ? v.trim() : (fallback || ""); }
  function clone(v) { try { return JSON.parse(JSON.stringify(v)); } catch (_) { return v; } }
  function normalize(v) {
    return String(v == null ? "" : v)
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[・●○■□◆◇→↓↑≠=+\/\\|:;,.()\[\]{}<>"'`~!@#$%^&*?_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function compact(v) { return normalize(v).replace(/\s+/g, ""); }
  function tokens(v) {
    const raw = normalize(v).split(" ").filter(Boolean);
    const unique = [];
    raw.forEach(function (w) {
      if (w.length < 4 || STOP.has(w) || /^\d+$/.test(w)) return;
      if (!unique.includes(w)) unique.push(w);
    });
    return unique.slice(0, 8);
  }
  function decisionNumber(id) {
    const match = String(id || "").match(/DECISION-(\d{3})/i);
    return match ? match[1] : "";
  }
  function extractDecisionRecords(memo) {
    const list = Array.isArray(memo) ? memo : (memo && Array.isArray(memo.items) ? memo.items : []);
    const map = new Map();
    list.forEach(function (item) {
      if (!item || typeof item !== "object") return;
      const id = text(item.id, "");
      if (!/^EXTERNAL-010-DECISION-\d{3}$/i.test(id)) return;
      map.set(id.toUpperCase(), {
        id: id.toUpperCase(),
        name: text(item.name, ""),
        status: text(item.status, ""),
        body: text(item.text, ""),
        bodyNormalized: normalize(item.text || ""),
        bodyCompact: compact(item.text || "")
      });
    });
    return map;
  }
  async function sha256Hex(content) {
    if (!global.crypto || !global.crypto.subtle) return null;
    const bytes = new TextEncoder().encode(content);
    const digest = await global.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("FETCH_FAILED " + url + " HTTP " + response.status);
    return response.json();
  }
  async function fetchText(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("FETCH_FAILED " + url + " HTTP " + response.status);
    return response.text();
  }
  function scriptNameFromEntry(entry) {
    const raw = String(entry || "");
    const clean = raw.split("?")[0].replace(/^\.\//, "");
    return clean;
  }
  function evidenceScore(requirementText, sourceRecord) {
    const reqCompact = compact(requirementText);
    const srcCompact = sourceRecord && sourceRecord.compact || "";
    if (reqCompact && reqCompact.length >= 8 && srcCompact.includes(reqCompact)) return 100;
    const words = tokens(requirementText);
    if (!words.length) return 0;
    const src = sourceRecord && sourceRecord.normalized || "";
    let hits = 0;
    words.forEach(function (w) { if (src.includes(w)) hits += 1; });
    const ratio = hits / words.length;
    if (words.length >= 3 && ratio === 1) return 90;
    if (words.length >= 4 && ratio >= 0.75) return 75;
    if (words.length >= 2 && ratio === 1) return 70;
    return Math.round(ratio * 60);
  }
  async function buildStaticEvidenceIndex() {
    const manifest = await fetchJson(MANIFEST_URL);
    const scriptEntries = Array.isArray(manifest.scripts) ? manifest.scripts : [];
    const names = scriptEntries.map(scriptNameFromEntry).filter(function (name) {
      return /^17_external_intelligence_.*\.js$/i.test(name);
    });
    const unique = Array.from(new Set(names));
    const sourceMap = new Map();
    await Promise.all(unique.map(async function (name) {
      try {
        const raw = await fetchText("./" + name);
        sourceMap.set(name, { raw: raw, normalized: normalize(raw), compact: compact(raw) });
      } catch (_) { sourceMap.set(name, { raw: "", normalized: "", compact: "" }); }
    }));
    return sourceMap;
  }
  function sourceContainsRequirement(decision, requirementText) {
    if (!decision) return false;
    const reqCompact = compact(requirementText);
    if (reqCompact && decision.bodyCompact.includes(reqCompact)) return true;
    const words = tokens(requirementText);
    if (!words.length) return false;
    const body = decision.bodyNormalized;
    const hits = words.filter(function (w) { return body.includes(w); }).length;
    return words.length <= 2 ? hits === words.length : hits / words.length >= 0.8;
  }
  function findEvidenceCandidates(requirementText, sourceMap) {
    const ranked = [];
    sourceMap.forEach(function (sourceRecord, name) {
      const score = evidenceScore(requirementText, sourceRecord);
      if (score >= 70) ranked.push({ name: name, score: score, validation: /validation/i.test(name) });
    });
    ranked.sort(function (a, b) { return b.score - a.score || a.name.localeCompare(b.name); });
    const implementationRefs = ranked.filter(function (x) { return !x.validation; }).slice(0, 5);
    const validationRefs = ranked.filter(function (x) { return x.validation; }).slice(0, 5);
    return { implementationRefs: implementationRefs, validationRefs: validationRefs };
  }
  function classifyRequirement(sourceMatched, catalogReq, evidence) {
    if (!sourceMatched) return "SOURCE_MISMATCH";
    const curatedImpl = Array.isArray(catalogReq.implementationRefs) && catalogReq.implementationRefs.length > 0;
    const curatedVal = Array.isArray(catalogReq.validationRefs) && catalogReq.validationRefs.length > 0;
    if (catalogReq.verificationState === "VERIFIED" && curatedImpl && curatedVal) return "VERIFIED";
    if (curatedImpl && curatedVal) return "TRACEABILITY_LINKED";
    if (evidence.implementationRefs.length && evidence.validationRefs.length) return "EVIDENCE_CANDIDATE";
    if (evidence.implementationRefs.length) return "IMPLEMENTATION_CANDIDATE";
    if (evidence.validationRefs.length) return "VALIDATION_CANDIDATE";
    return "UNVERIFIED";
  }

  async function auditExternal010MemoText(rawText, fileName) {
    const parsed = JSON.parse(rawText);
    const [catalog, sourceMap] = await Promise.all([fetchJson(CATALOG_URL), buildStaticEvidenceIndex()]);
    const memoSha256 = await sha256Hex(rawText);
    const decisionMap = extractDecisionRecords(parsed);
    const results = [];
    const decisionSummary = [];
    const counts = {
      VERIFIED: 0, TRACEABILITY_LINKED: 0, EVIDENCE_CANDIDATE: 0,
      IMPLEMENTATION_CANDIDATE: 0, VALIDATION_CANDIDATE: 0,
      UNVERIFIED: 0, SOURCE_MISMATCH: 0
    };

    (catalog.decisions || []).forEach(function (decisionCatalog) {
      const decisionId = String(decisionCatalog.decisionId || "").toUpperCase();
      const memoDecision = decisionMap.get(decisionId) || null;
      const localCounts = {};
      (decisionCatalog.requirements || []).forEach(function (req) {
        const sourceMatched = sourceContainsRequirement(memoDecision, req.text);
        const evidence = findEvidenceCandidates(req.text, sourceMap);
        const state = classifyRequirement(sourceMatched, req, evidence);
        counts[state] = (counts[state] || 0) + 1;
        localCounts[state] = (localCounts[state] || 0) + 1;
        results.push({
          requirementId: req.requirementId,
          decisionId: decisionId,
          decisionNumber: decisionNumber(decisionId),
          requirementText: req.text,
          sourceMatched: sourceMatched,
          verificationState: state,
          curatedImplementationRefs: clone(req.implementationRefs || []),
          curatedValidationRefs: clone(req.validationRefs || []),
          implementationEvidenceCandidates: evidence.implementationRefs,
          validationEvidenceCandidates: evidence.validationRefs
        });
      });
      decisionSummary.push({
        decisionId: decisionId,
        memoDecisionPresent: Boolean(memoDecision),
        requirementCount: (decisionCatalog.requirements || []).length,
        states: localCounts
      });
    });

    const total = results.length;
    const fullyVerified = counts.VERIFIED || 0;
    const traceabilityLinked = counts.TRACEABILITY_LINKED || 0;
    const unresolved = total - fullyVerified - traceabilityLinked;
    const report = i.deepFreeze({
      id: i.nextId("EXTERNAL-010-FULL-MEMO-AUDIT"),
      componentId: "EXTERNAL-010",
      version: m.release.version,
      gatewayVersion: m.gateway.gatewayVersion,
      auditType: "FULL_MEMO_TRACEABILITY_AUDIT",
      sourceMemoFileName: text(fileName, "user-selected-memo.json"),
      sourceMemoSha256: memoSha256,
      catalogSourceMemoSha256: catalog.sourceMemoSha256 || null,
      exactCatalogMemoHashMatch: Boolean(memoSha256 && catalog.sourceMemoSha256 && memoSha256 === catalog.sourceMemoSha256),
      decisionRecordsFound: decisionMap.size,
      catalogDecisionCount: catalog.decisionCount,
      requirementCount: total,
      counts: counts,
      fullyVerifiedRequirementCount: fullyVerified,
      traceabilityLinkedRequirementCount: traceabilityLinked,
      unresolvedRequirementCount: unresolved,
      conformanceComplete: unresolved === 0 && counts.SOURCE_MISMATCH === 0,
      releaseAllowedByThisAudit: false,
      projectOwnerAcceptanceRequired: true,
      staticEvidenceCandidatesArePass: false,
      note: "EVIDENCE_CANDIDATE is a static search lead, not a PASS. Only explicit verified traceability may become VERIFIED.",
      decisionSummary: decisionSummary,
      requirements: results,
      auditedAt: i.nowIso(),
      immutable: true
    });
    s.latestFullMemoAudit = report;
    return report;
  }

  async function auditExternal010MemoFile(file) {
    if (!file) throw new Error("MEMO_FILE_REQUIRED");
    const rawText = await file.text();
    return auditExternal010MemoText(rawText, file.name || "memo.json");
  }

  function getExternal010FullMemoAuditSummary() {
    const r = s.latestFullMemoAudit;
    if (!r) return null;
    return {
      id: r.id,
      requirementCount: r.requirementCount,
      counts: clone(r.counts),
      unresolvedRequirementCount: r.unresolvedRequirementCount,
      conformanceComplete: r.conformanceComplete,
      sourceMemoFileName: r.sourceMemoFileName,
      exactCatalogMemoHashMatch: r.exactCatalogMemoHashMatch,
      auditedAt: r.auditedAt
    };
  }

  Object.assign(n.api, {
    auditExternal010MemoText: auditExternal010MemoText,
    auditExternal010MemoFile: auditExternal010MemoFile,
    getExternal010FullMemoAuditSummary: getExternal010FullMemoAuditSummary
  });
  Object.assign(n, n.api);

  n.modules.fullMemoAudit = {
    id: "EXTERNAL-010-FULL-MEMO-AUDIT",
    version: m.release.version,
    status: "Ready",
    phase: 21,
    userSelectedFileOnly: true,
    memoPersistencePerformed: false,
    staticEvidenceCandidatesArePass: false,
    authorityGranted: false,
    loadedAt: i.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
