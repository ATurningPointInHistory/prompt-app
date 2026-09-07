"use strict";

const DEFAULT_PORT = 43110;
const DEFAULT_ORIGINS = ["https://aturningpointinhistory.github.io"];

function integerEnv(name, fallback, min, max) {
  const value = Number.parseInt(process.env[name] || "", 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}


function booleanEnv(name, fallback) {
  const raw = String(process.env[name] || "").trim().toLowerCase();
  if (!raw) return fallback;
  return ["1", "true", "yes", "on"].includes(raw);
}

function stringSetEnv(name) {
  return new Set(String(process.env[name] || "")
    .split(",")
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean));
}

function normalizeOrigin(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (!/^https?:$/.test(url.protocol)) return null;
    if (url.pathname !== "/" || url.search || url.hash || url.username || url.password) return null;
    return url.origin;
  } catch (_) {
    return null;
  }
}

function buildConfig() {
  const port = integerEnv("EXTERNAL010_GATEWAY_PORT", DEFAULT_PORT, 1024, 65535);
  const configuredOrigins = String(process.env.EXTERNAL010_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);
  const allowedOrigins = [...new Set(configuredOrigins.length ? configuredOrigins : DEFAULT_ORIGINS)];
  const allowedHosts = new Set([
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    `[::1]:${port}`
  ]);

  const acquisitionAllowedHosts = stringSetEnv("EXTERNAL010_ACQUISITION_ALLOWED_HOSTS");
  const evidenceStorageRoot = require("node:path").resolve(process.env.EXTERNAL010_EVIDENCE_STORAGE_ROOT || require("node:path").join(__dirname, "..", "data", "external_intelligence"));

  return Object.freeze({
    componentId: "EXTERNAL-010",
    gatewayVersion: "1.3.0",
    contractVersion: "1.0.0",
    host: "127.0.0.1",
    port,
    loopbackOnly: true,
    allowedOrigins: Object.freeze(allowedOrigins),
    allowedHosts,
    sessionTtlMs: integerEnv("EXTERNAL010_SESSION_TTL_MS", 300000, 30000, 3600000),
    requestFreshnessMs: integerEnv("EXTERNAL010_REQUEST_FRESHNESS_MS", 60000, 5000, 300000),
    maxBodyBytes: integerEnv("EXTERNAL010_MAX_BODY_BYTES", 65536, 1024, 1048576),
    replayCacheMaxPerSession: integerEnv("EXTERNAL010_REPLAY_CACHE_MAX", 2048, 64, 10000),
    acquisitionAllowedHosts,
    allowHttpAcquisition: booleanEnv("EXTERNAL010_ALLOW_HTTP_ACQUISITION", false),
    acquisitionDefaultTimeoutMs: integerEnv("EXTERNAL010_ACQUISITION_TIMEOUT_MS", 15000, 250, 120000),
    acquisitionMaxTimeoutMs: integerEnv("EXTERNAL010_ACQUISITION_MAX_TIMEOUT_MS", 120000, 1000, 300000),
    acquisitionMaxResponseBytes: integerEnv("EXTERNAL010_ACQUISITION_MAX_RESPONSE_BYTES", 1048576, 1024, 10485760),
    evidenceStorageRoot,
    requiredClientHeaderValue: "AI-Prompt-OS-Browser",
    sessionHeader: "x-external-010-session",
    sessionIdHeader: "x-external-010-session-id",
    requestIdHeader: "x-external-010-request-id",
    nonceHeader: "x-external-010-nonce",
    requestTimeHeader: "x-external-010-request-time",
    clientHeader: "x-external-010-client",
    contractHeader: "x-external-010-contract-version"
  });
}

module.exports = { buildConfig, normalizeOrigin };
