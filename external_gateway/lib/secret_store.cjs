"use strict";

const REFERENCE = /^SECRET-[A-Z0-9-]+$/;
const TYPES = new Set(["API_KEY","BEARER_TOKEN","ACCESS_TOKEN","REFRESH_TOKEN","CLIENT_SECRET","CUSTOM_SECRET"]);

function envName(referenceId) {
  return `EXTERNAL010_SECRET_${String(referenceId || "").toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

function createSecretStore(_config, audit) {
  const memory = new Map();

  function metadata(referenceId, type, provider, status) {
    return Object.freeze({
      secretReferenceId: referenceId,
      secretType: TYPES.has(String(type || "").toUpperCase()) ? String(type).toUpperCase() : "CUSTOM_SECRET",
      provider: String(provider || "LOCAL_GATEWAY"),
      status: status || "UNKNOWN",
      valueExposed: false,
      storageProvider: "EPHEMERAL_ENVIRONMENT_REFERENCE",
      persistentAtRestTechnologyFixed: false
    });
  }

  function resolve(referenceId, expectedType) {
    const id = String(referenceId || "").toUpperCase();
    if (!REFERENCE.test(id)) return { ok:false, code:"SECRET_REFERENCE_INVALID", metadata:metadata(id, expectedType, "LOCAL_GATEWAY", "MISSING") };
    const runtime = memory.get(id);
    const value = runtime && runtime.value != null ? String(runtime.value) : String(process.env[envName(id)] || "");
    if (!value) {
      audit.append("GATEWAY_SECRET_RESOLUTION_MISSING", "Blocked", { secretReferenceId:id, secretValueLogged:false });
      return { ok:false, code:"SECRET_MISSING", metadata:metadata(id, expectedType, runtime && runtime.provider, "MISSING") };
    }
    const type = String((runtime && runtime.secretType) || expectedType || "CUSTOM_SECRET").toUpperCase();
    if (expectedType && String(expectedType).toUpperCase() !== type && !(expectedType === "OAUTH" && ["ACCESS_TOKEN","BEARER_TOKEN"].includes(type))) {
      return { ok:false, code:"SECRET_TYPE_MISMATCH", metadata:metadata(id, type, runtime && runtime.provider, "ACTIVE") };
    }
    audit.append("GATEWAY_SECRET_RESOLVED", "Ready", { secretReferenceId:id, secretType:type, secretValueLogged:false });
    return { ok:true, value, metadata:metadata(id, type, runtime && runtime.provider, "ACTIVE") };
  }

  function status(referenceId, expectedType) {
    const resolved = resolve(referenceId, expectedType);
    return { ok:resolved.ok, code:resolved.code || "SECRET_ACTIVE", metadata:resolved.metadata, secretValueReturned:false };
  }

  function setEphemeral(referenceId, value, options) {
    const id = String(referenceId || "").toUpperCase();
    if (!REFERENCE.test(id) || !String(value || "")) return { ok:false, code:"SECRET_EPHEMERAL_INPUT_INVALID" };
    const x = options && typeof options === "object" ? options : {};
    memory.set(id, { value:String(value), secretType:String(x.secretType || "CUSTOM_SECRET").toUpperCase(), provider:String(x.provider || "LOCAL_RUNTIME") });
    return { ok:true, code:"SECRET_EPHEMERAL_SET", metadata:metadata(id, x.secretType, x.provider, "ACTIVE"), secretValueReturned:false };
  }

  function clearEphemeral(referenceId) { memory.delete(String(referenceId || "").toUpperCase()); }

  return { resolve, status, setEphemeral, clearEphemeral, envName };
}

module.exports = { createSecretStore, envName };
