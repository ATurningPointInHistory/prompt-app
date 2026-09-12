"use strict";

const { randomUUID } = require("node:crypto");

function createRuntime(config) {
  const startedAt = new Date().toISOString();
  const runtime = {
    runtimeInstanceId: `EXTERNAL-010-GATEWAY-${randomUUID()}`,
    runtimeType: "NODE_GATEWAY",
    runtimeVersion: config.gatewayVersion,
    startupEpoch: `${Date.now().toString(36).toUpperCase()}-${randomUUID()}`,
    recoveryEpoch: null,
    startedAt,
    healthState: "STARTING",
    executionAuthorityGranted: false,
    businessAuthorityGranted: false,
    singleWriter: true,
    loopbackOnly: true,
    nodeVersion: process.version,
    platform: process.platform,
    architecture: process.arch,
    pid: process.pid
  };

  function setState(value) { runtime.healthState = String(value || "UNKNOWN").toUpperCase(); }
  function setRecoveryEpoch(value) { runtime.recoveryEpoch = String(value || "").trim() || null; }
  function minimalHealth() {
    return {
      componentId: config.componentId,
      gatewayAvailable: runtime.healthState === "READY" || runtime.healthState === "DEGRADED",
      gatewayVersion: config.gatewayVersion,
      contractVersion: config.contractVersion,
      runtimeState: runtime.healthState,
      recoveryEpochPresent: Boolean(runtime.recoveryEpoch),
      loopbackOnly: true,
      sessionRequiredForProtectedEndpoints: true
    };
  }
  function protectedDetails() {
    return {
      runtimeInstanceId: runtime.runtimeInstanceId,
      runtimeType: runtime.runtimeType,
      runtimeVersion: runtime.runtimeVersion,
      startupEpoch: runtime.startupEpoch,
      recoveryEpoch: runtime.recoveryEpoch,
      startedAt: runtime.startedAt,
      healthState: runtime.healthState,
      executionAuthorityGranted: false,
      businessAuthorityGranted: false,
      singleWriter: true,
      loopbackOnly: true,
      nodeVersion: runtime.nodeVersion,
      platform: runtime.platform,
      architecture: runtime.architecture
    };
  }
  return { runtime, setState, setRecoveryEpoch, minimalHealth, protectedDetails };
}

module.exports = { createRuntime };
