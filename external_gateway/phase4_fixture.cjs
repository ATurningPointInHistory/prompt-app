"use strict";

const http = require("node:http");

const host = "127.0.0.1";
const port = Number.parseInt(process.env.EXTERNAL010_PHASE4_FIXTURE_PORT || "43120", 10);
const allowedOrigins = String(process.env.EXTERNAL010_ALLOWED_ORIGINS || "https://aturningpointinhistory.github.io,http://localhost:8000,http://127.0.0.1:8000")
  .split(",").map((value) => value.trim()).filter(Boolean);

function applyCors(req, res) {
  const origin = String(req.headers.origin || "");
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (String(req.headers["access-control-request-private-network"] || "").toLowerCase() === "true") res.setHeader("Access-Control-Allow-Private-Network", "true");
  }
}

const server = http.createServer((req, res) => {
  applyCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET") {
    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, code: "METHOD_NOT_ALLOWED" }));
    return;
  }
  const url = new URL(req.url, `http://${host}:${port}`);
  if (url.pathname === "/health") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true, fixture: "EXTERNAL-010-PHASE4", version: "1.0.0" }));
    return;
  }
  if (url.pathname === "/browser-json" || url.pathname === "/gateway-json") {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("X-Request-Id", `FIXTURE-${Date.now()}`);
    res.end(JSON.stringify({
      ok: true,
      fixture: "EXTERNAL-010-PHASE4",
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
      transport: url.pathname === "/browser-json" ? "BROWSER_DIRECT" : "LOCAL_GATEWAY"
    }));
    return;
  }
  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ ok: false, code: "NOT_FOUND" }));
});

server.listen(port, host, () => {
  console.log(`EXTERNAL-010 Phase 04 HTTP Fixture READY http://${host}:${port}`);
  console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
});

function shutdown() { server.close(() => process.exit(0)); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
