"use strict";

const path = require("node:path");
const { spawn } = require("node:child_process");

const cwd = __dirname;
const baseEnv = { ...process.env };

const gatewayPort = String(baseEnv.EXTERNAL010_GATEWAY_PORT || "43110");

const allowedOrigins = String(
  baseEnv.EXTERNAL010_ALLOWED_ORIGINS ||
  "https://aturningpointinhistory.github.io,http://localhost:8000,http://127.0.0.1:8000"
);

const env = {
  ...baseEnv,
  EXTERNAL010_GATEWAY_PORT: gatewayPort,
  EXTERNAL010_ALLOWED_ORIGINS: allowedOrigins
};

/*
  Security note:
  - Acquisition allowlist is NOT broadened here.
  - EXTERNAL010_ACQUISITION_ALLOWED_HOSTS remains owner/environment controlled.
  - If no acquisition hosts are configured, external acquisition fails closed.
  - Provider Secret values remain environment/reference based and are not printed.
*/

const gateway = spawn(
  process.execPath,
  [path.join(cwd, "gateway.cjs")],
  {
    cwd,
    env,
    stdio: ["ignore", "inherit", "inherit"]
  }
);

const acquisitionHostsConfigured =
  String(baseEnv.EXTERNAL010_ACQUISITION_ALLOWED_HOSTS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean).length > 0;

console.log("EXTERNAL-010 Canonical Local Gateway Launcher");
console.log(`Gateway: http://127.0.0.1:${gatewayPort}`);
console.log("Mode: Canonical / Phase-independent");
console.log("Loopback: required by gateway configuration");
console.log("Provider Secret: reference/environment only; values are not printed");
console.log(
  `External acquisition allowlist: ${
    acquisitionHostsConfigured ? "configured" : "not configured (fail-closed)"
  }`
);

let stopping = false;

function stop(code) {
  if (stopping) return;
  stopping = true;

  if (gateway && gateway.exitCode == null) {
    gateway.kill("SIGTERM");
  }

  setTimeout(() => process.exit(code || 0), 250).unref();
}

process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

gateway.on("exit", (code) => {
  if (!stopping && code !== 0) {
    console.error("Canonical Gateway exited unexpectedly:", code);
    stop(code || 1);
  }
});
