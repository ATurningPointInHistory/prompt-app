"use strict";

const { createHash, randomBytes, randomUUID, timingSafeEqual } = require("node:crypto");

function sha256(value) { return createHash("sha256").update(String(value)).digest(); }
function tokenString() { return randomBytes(32).toString("base64url"); }
function safeTokenEqual(raw, hashBuffer) {
  try {
    const incoming = sha256(raw);
    return incoming.length === hashBuffer.length && timingSafeEqual(incoming, hashBuffer);
  } catch (_) { return false; }
}

function createSessionStore(config, runtime, audit) {
  const sessions = new Map();

  function cleanupReplay(session, now) {
    for (const [key, expiry] of session.usedRequestIds.entries()) if (expiry <= now) session.usedRequestIds.delete(key);
    for (const [key, expiry] of session.usedNonces.entries()) if (expiry <= now) session.usedNonces.delete(key);
    while (session.usedRequestIds.size > config.replayCacheMaxPerSession) session.usedRequestIds.delete(session.usedRequestIds.keys().next().value);
    while (session.usedNonces.size > config.replayCacheMaxPerSession) session.usedNonces.delete(session.usedNonces.keys().next().value);
  }

  function publicMetadata(session) {
    return {
      gatewaySessionId: session.gatewaySessionId,
      runtimeInstanceId: session.runtimeInstanceId,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
      state: session.state,
      origin: session.origin,
      contractVersion: config.contractVersion,
      scope: [...session.scope],
      tokenPersisted: false
    };
  }

  function create(input) {
    const now = Date.now();
    const rawToken = tokenString();
    const session = {
      gatewaySessionId: `EXTERNAL-010-GATEWAY-SESSION-${randomUUID()}`,
      runtimeInstanceId: runtime.runtime.runtimeInstanceId,
      clientSessionId: String(input.clientSessionId || "unknown"),
      issuedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + config.sessionTtlMs).toISOString(),
      expiresAtMs: now + config.sessionTtlMs,
      state: "ACTIVE",
      origin: input.origin,
      scope: new Set((Array.isArray(input.scope) ? input.scope.map((value) => String(value).toUpperCase()) : []).filter((value) => ["PROBE", "READ_RUNTIME", "ACQUIRE_PUBLIC", "ACQUIRE_EXTERNAL", "READ_SECRET_METADATA", "PERSIST_EVIDENCE", "READ_EVIDENCE"].includes(value))),
      tokenHash: sha256(rawToken),
      usedRequestIds: new Map(),
      usedNonces: new Map()
    };
    sessions.set(session.gatewaySessionId, session);
    audit.append("GATEWAY_SESSION_CREATED", "Active", { gatewaySessionId: session.gatewaySessionId, runtimeInstanceId: session.runtimeInstanceId, origin: session.origin, scope: [...session.scope] });
    return { sessionToken: rawToken, session: publicMetadata(session) };
  }

  function find(id) { return sessions.get(String(id || "")) || null; }

  function validateSessionOnly(req) {
    const id = String(req.headers[config.sessionIdHeader] || "");
    const rawToken = String(req.headers[config.sessionHeader] || "");
    const session = find(id);
    if (!session || !rawToken) return { ok: false, status: 401, code: "SESSION_INVALID" };
    if (session.runtimeInstanceId !== runtime.runtime.runtimeInstanceId) return { ok: false, status: 401, code: "RUNTIME_INVALIDATED" };
    if (session.state !== "ACTIVE") return { ok: false, status: 401, code: session.state === "REVOKED" ? "SESSION_REVOKED" : "SESSION_INVALID" };
    if (Date.now() >= session.expiresAtMs) {
      session.state = "EXPIRED";
      audit.append("GATEWAY_SESSION_EXPIRED", "Expired", { gatewaySessionId: session.gatewaySessionId });
      return { ok: false, status: 401, code: "SESSION_EXPIRED" };
    }
    if (String(req.headers.origin || "") !== session.origin) return { ok: false, status: 403, code: "SESSION_ORIGIN_MISMATCH" };
    if (!safeTokenEqual(rawToken, session.tokenHash)) return { ok: false, status: 401, code: "SESSION_INVALID" };
    return { ok: true, session };
  }

  function validateProtected(req, requiredScope) {
    const sessionResult = validateSessionOnly(req);
    if (!sessionResult.ok) return sessionResult;
    const session = sessionResult.session;
    if (requiredScope && !session.scope.has(String(requiredScope).toUpperCase())) {
      audit.append("GATEWAY_SESSION_SCOPE_REJECTED", "Rejected", { gatewaySessionId: session.gatewaySessionId, requiredScope: String(requiredScope) });
      return { ok: false, status: 403, code: "SESSION_SCOPE_DENIED" };
    }
    const requestId = String(req.headers[config.requestIdHeader] || "");
    const nonce = String(req.headers[config.nonceHeader] || "");
    const requestTime = String(req.headers[config.requestTimeHeader] || "");
    if (!requestId || !nonce || !requestTime) return { ok: false, status: 400, code: "REQUEST_INTEGRITY_HEADERS_REQUIRED" };
    const timestamp = Date.parse(requestTime);
    if (!Number.isFinite(timestamp) || Math.abs(Date.now() - timestamp) > config.requestFreshnessMs) {
      audit.append("GATEWAY_REQUEST_STALE", "Rejected", { gatewaySessionId: session.gatewaySessionId, requestId });
      return { ok: false, status: 408, code: "REQUEST_STALE" };
    }
    const now = Date.now();
    cleanupReplay(session, now);
    if (session.usedRequestIds.has(requestId) || session.usedNonces.has(nonce)) {
      audit.append("GATEWAY_REPLAY_REJECTED", "Rejected", { gatewaySessionId: session.gatewaySessionId, requestId });
      return { ok: false, status: 409, code: "REQUEST_REPLAYED" };
    }
    const expiry = now + config.requestFreshnessMs * 2;
    session.usedRequestIds.set(requestId, expiry);
    session.usedNonces.set(nonce, expiry);
    audit.append("GATEWAY_REQUEST_ACCEPTED", "Accepted", { gatewaySessionId: session.gatewaySessionId, requestId });
    return { ok: true, session, requestId, nonce, requestTime };
  }

  function revoke(id, reason) {
    const session = find(id);
    if (!session) return false;
    session.state = "REVOKED";
    session.tokenHash = randomBytes(32);
    audit.append("GATEWAY_SESSION_REVOKED", "Revoked", { gatewaySessionId: session.gatewaySessionId, reason: String(reason || "REQUESTED") });
    return true;
  }

  function invalidateAll(reason) {
    for (const session of sessions.values()) {
      session.state = "RUNTIME_INVALIDATED";
      session.tokenHash = randomBytes(32);
    }
    audit.append("GATEWAY_SESSION_RUNTIME_INVALIDATED", "Invalidated", { reason: String(reason || "RUNTIME_STOP") });
  }

  function summary() {
    let active = 0;
    for (const session of sessions.values()) if (session.state === "ACTIVE" && Date.now() < session.expiresAtMs) active += 1;
    return { sessionCount: sessions.size, activeSessionCount: active, tokenPersistence: false };
  }

  return { create, validateSessionOnly, validateProtected, revoke, invalidateAll, summary, publicMetadata };
}

module.exports = { createSessionStore };
