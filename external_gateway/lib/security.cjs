"use strict";

function createSecurity(config, audit) {
  function originAllowed(origin) {
    return Boolean(origin && config.allowedOrigins.includes(String(origin)));
  }
  function hostAllowed(host) {
    return Boolean(host && config.allowedHosts.has(String(host).toLowerCase()));
  }
  function applyCors(req, res) {
    const origin = req.headers.origin;
    if (!originAllowed(origin)) return false;
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", [
      "Content-Type",
      "X-EXTERNAL-010-Client",
      "X-EXTERNAL-010-Contract-Version",
      "X-EXTERNAL-010-Session",
      "X-EXTERNAL-010-Session-Id",
      "X-EXTERNAL-010-Request-Id",
      "X-EXTERNAL-010-Nonce",
      "X-EXTERNAL-010-Request-Time"
    ].join(", "));
    res.setHeader("Access-Control-Max-Age", "60");
    if (String(req.headers["access-control-request-private-network"] || "").toLowerCase() === "true") {
      res.setHeader("Access-Control-Allow-Private-Network", "true");
    }
    return true;
  }
  function validateHost(req) {
    const ok = hostAllowed(req.headers.host);
    if (!ok) audit.append("GATEWAY_HOST_REJECTED", "Rejected", { host: req.headers.host || null });
    return ok;
  }
  function validateOrigin(req) {
    const ok = originAllowed(req.headers.origin);
    if (!ok) audit.append("GATEWAY_ORIGIN_REJECTED", "Rejected", { origin: req.headers.origin || null });
    return ok;
  }
  function validateClientHeaders(req) {
    const client = String(req.headers[config.clientHeader] || "");
    const contract = String(req.headers[config.contractHeader] || "");
    return client === config.requiredClientHeaderValue && contract === config.contractVersion;
  }
  return { originAllowed, hostAllowed, applyCors, validateHost, validateOrigin, validateClientHeaders };
}

module.exports = { createSecurity };
