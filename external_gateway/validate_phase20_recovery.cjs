"use strict";

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash, randomUUID } = require("node:crypto");

const checks = [];
function check(name, passed, detail, group="Phase 20 Recovery") { checks.push({ name, passed: passed === true, detail: detail == null ? "" : typeof detail === "string" ? detail : JSON.stringify(detail), group, severity:"Critical" }); }
function sha256(value) { return createHash("sha256").update(Buffer.from(String(value), "utf8")).digest("hex"); }
function wait(ms){ return new Promise(r=>setTimeout(r,ms)); }

const origin = "https://aturningpointinhistory.github.io";
const port = 43220 + Math.floor(Math.random()*300);
const root = fs.mkdtempSync(path.join(os.tmpdir(), "external010-phase20-"));
let proc = null;
let stdout = "", stderr = "";

async function request(method, urlPath, body, headers={}) {
  const response = await fetch(`http://127.0.0.1:${port}${urlPath}`, {
    method,
    headers: Object.assign({ Origin: origin, "Content-Type":"application/json", "X-EXTERNAL-010-Client":"AI-Prompt-OS-Browser", "X-EXTERNAL-010-Contract-Version":"1.0.0" }, headers),
    body: body == null ? undefined : JSON.stringify(body)
  });
  let parsed = null;
  try { parsed = await response.json(); } catch (_) {}
  return { status: response.status, ok: response.ok, body: parsed };
}

async function waitHealth() {
  for (let i=0;i<80;i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/health`, { headers:{Origin:origin} });
      if (r.ok) return { status:r.status, body: await r.json() };
    } catch (_) {}
    await wait(100);
  }
  throw new Error("Gateway health timeout");
}

function headersFor(session, id) {
  return {
    "X-EXTERNAL-010-Session": session.token,
    "X-EXTERNAL-010-Session-Id": session.meta.gatewaySessionId,
    "X-EXTERNAL-010-Request-Id": id || `P20-${randomUUID()}`,
    "X-EXTERNAL-010-Nonce": `N-${randomUUID()}`,
    "X-EXTERNAL-010-Request-Time": new Date().toISOString()
  };
}

async function createSession(scopes) {
  const r = await request("POST","/v1/session",{clientSessionId:`P20-${randomUUID()}`,requestedScope:scopes});
  if (!r.ok) throw new Error(`session failed ${JSON.stringify(r.body)}`);
  return { token:r.body.sessionToken, meta:r.body.session };
}

function authority(action) { return { action, allowed:true, decision:"ALLOW", reason:"PHASE20_VALIDATION", authorityEnvelopeId:`P20-AUTH-${action}` }; }

async function main() {
  proc = spawn(process.execPath,["gateway.cjs"],{
    cwd:__dirname,
    env:Object.assign({},process.env,{EXTERNAL010_GATEWAY_PORT:String(port),EXTERNAL010_ALLOWED_ORIGINS:origin,EXTERNAL010_EVIDENCE_STORAGE_ROOT:root}),
    stdio:["ignore","pipe","pipe"]
  });
  proc.stdout.on("data",d=>stdout+=d.toString());
  proc.stderr.on("data",d=>stderr+=d.toString());
  try {
    const health = await waitHealth();
    check("Gateway starts as Phase 20 v1.5.0", health.body && health.body.gatewayVersion === "1.5.0" && health.body.runtimeState === "READY", health.body, "Runtime");
    check("Minimal health exposes only recovery epoch presence, not credentials", health.body && health.body.recoveryEpochPresent === true && !Object.prototype.hasOwnProperty.call(health.body,"recoveryEpoch"), health.body, "Security");

    let session = await createSession(["READ_RUNTIME","PERSIST_EVIDENCE","READ_EVIDENCE","MANAGE_RECOVERY"]);
    check("Session binds to recovery epoch", typeof session.meta.recoveryEpoch === "string" && session.meta.recoveryEpoch.length > 0, session.meta, "Session");

    const rawText = "phase20 recovery evidence payload";
    const hash = sha256(rawText);
    const now = new Date().toISOString();
    const suffix = randomUUID().replace(/-/g,"").toUpperCase();
    const evidenceId = `EXTERNAL-010-EVIDENCE-P20-${suffix}`;
    const rawEvidenceId = `EXTERNAL-010-RAW-P20-${suffix}`;
    const persistPayload = {
      authority:authority("PERSIST_EXTERNAL_EVIDENCE"), rawText,
      contentObject:{contentHash:hash,createdAt:now},
      rawEvidence:{rawEvidenceId,contentHash:hash,contentType:"text/plain",acquiredAt:now,sourceId:"SOURCE-P20",requestId:`REQ-P20-${suffix}`,acquisitionStatus:"ACQUIRED",schemaVersion:"1.0.0",createdAt:now},
      acquisitionEvidence:{evidenceId,rawEvidenceId,requestId:`REQ-P20-${suffix}`,sourceId:"SOURCE-P20",sourceVersion:1,operationId:"READ",adapterId:"ADAPTER-P20",adapterVersion:"1.0.0",accessMode:"LOCAL_GATEWAY",acquiredAt:now,status:"SUCCESS",contentHash:hash,contentType:"text/plain",attemptCount:1,runtimeVersion:"1.19.0",gatewayVersion:"1.5.0",schemaVersion:"1.0.0",recordVersion:1,createdAt:now}
    };
    const persisted = await request("POST","/v1/evidence/persist",persistPayload,headersFor(session));
    check("Evidence persists before Recovery Point", persisted.ok && persisted.body && persisted.body.ok === true, persisted.body, "Evidence");

    const recoveryPointId = `EXTERNAL-010-RECOVERY-POINT-P20-${suffix}`;
    const created = await request("POST","/v1/recovery/create",{
      recoveryPointId,recoveryPointType:"CHECKPOINT",authority:authority("CREATE_RECOVERY_POINT"),
      queueSnapshot:{items:[{jobId:"JOB-1",status:"RUNNING"}],restoredRunningWorkBecomesActive:false,blindRetryAllowed:false},
      watchSnapshot:{items:[{watchId:"WATCH-1",watchState:"ACTIVE",nextCheckAt:"2026-09-01T00:00:00Z"}],overdueAutoCatchupAllowed:false,monitoringGapPreserved:true},
      policyProfile:{state:"REQUIRES_RECONCILIATION_ON_RESTORE"}
    },headersFor(session));
    const manifest = created.body && created.body.recovery && created.body.recovery.recoveryPoint;
    check("Application-consistent Recovery Point is created", created.ok && manifest && manifest.applicationConsistentSnapshot === true && manifest.recoveryPointState === "VALID", created.body, "Recovery Point");
    check("Recovery Point excludes secrets and Gateway session credentials", manifest && manifest.secretValuesIncluded === false && manifest.gatewaySessionTokensIncluded === false && manifest.credentialMaterialPresent === false && manifest.runtimeProfile && manifest.runtimeProfile.sessionCredentialsIncluded === false, manifest, "Security");
    check("Incremental content manifest includes verified evidence hash", manifest && Array.isArray(manifest.incrementalContentManifest) && manifest.incrementalContentManifest.some(x=>x.contentHash===hash&&x.state==="VERIFIED"), manifest && manifest.incrementalContentManifest, "Recovery Point");

    const validated = await request("POST","/v1/recovery/validate",{recoveryPointId,authority:authority("READ_RECOVERY_POINT")},headersFor(session));
    const validation = validated.body && validated.body.recovery;
    check("Cross-store Recovery Point validation passes", validated.ok && validation && validation.valid === true && validation.metadataValidation.valid === true && validation.secretBoundaryPass === true, validation, "Validation");

    const drill = await request("POST","/v1/recovery/restore",{recoveryPointId,mode:"DRILL",authority:authority("RESTORE_RECOVERY_POINT")},headersFor(session));
    const drillResult = drill.body && drill.body.recovery;
    check("Controlled Restore Drill passes without canonical mutation", drill.ok && drillResult && drillResult.state === "RESTORE_DRILL_PASS" && drillResult.restored === false && drillResult.platformReady === false, drillResult, "Restore Drill");

    const rebuild = await request("POST","/v1/recovery/rebuild-assessment",{authority:authority("READ_RECOVERY_POINT")},headersFor(session));
    check("Metadata rebuild hook recognizes recovery-capable manifests", rebuild.ok && rebuild.body && rebuild.body.recovery && rebuild.body.recovery.rebuildableCount >= 1 && rebuild.body.recovery.automaticRebuildPerformed === false, rebuild.body, "Metadata Rebuild");

    const oldEpoch = session.meta.recoveryEpoch;
    const activate = await request("POST","/v1/recovery/restore",{recoveryPointId,mode:"ACTIVATE",authority:authority("RESTORE_RECOVERY_POINT")},headersFor(session));
    const activated = activate.body && activate.body.recovery;
    check("Physical restore changes Recovery Epoch and remains pending policy/queue/watch validation", activate.ok && activated && activated.restored === true && activated.recoveryEpochChanged === true && activated.recoveryEpoch !== oldEpoch && activated.platformReady === false && activated.state === "RESTORED_PENDING_POLICY_CHECK", activated, "Restore");
    check("Physical restore requires current session invalidation", activated && activated.sessionInvalidationRequired === true && activated.restoredSessionRecordBecomesCurrentAuthentication === false, activated, "Session");

    const oldSessionUse = await request("POST","/v1/runtime",{},headersFor(session));
    check("Old Gateway Session is rejected after Recovery Epoch change", oldSessionUse.status === 401 && oldSessionUse.body && ["SESSION_INVALID","RECOVERY_EPOCH_INVALIDATED","RUNTIME_INVALIDATED"].includes(oldSessionUse.body.code), oldSessionUse, "Session");

    session = await createSession(["READ_RUNTIME","READ_EVIDENCE","MANAGE_RECOVERY"]);
    const runtimeState = await request("POST","/v1/runtime",{},headersFor(session));
    const runtime = runtimeState.body && runtimeState.body.runtime;
    check("New Session binds to current Recovery Epoch", runtimeState.ok && runtime && runtime.recoveryEpoch === session.meta.recoveryEpoch && runtime.recoveryEpoch !== oldEpoch, {runtime,session:session.meta}, "Session");

    const integrity = await request("POST","/v1/evidence/integrity",{authority:authority("READ_EXTERNAL_EVIDENCE")},headersFor(session));
    check("Evidence integrity remains valid after physical restore", integrity.ok && integrity.body && integrity.body.integrity && integrity.body.integrity.valid === true, integrity.body, "Integrity");

    const recoveryText = fs.readFileSync(path.join(root,"recovery","points",recoveryPointId,"manifest.json"),"utf8");
    check("Recovery artifacts do not contain active session token", !recoveryText.includes(session.token), "manifest inspected", "Security");
    check("Recovery catalog does not contain provider/session credential material", !fs.readFileSync(path.join(root,"recovery","catalog.json"),"utf8").includes("sessionToken") && !fs.readFileSync(path.join(root,"recovery","catalog.json"),"utf8").includes("secretValue"), "catalog inspected", "Security");
  } catch (error) {
    check("Phase 20 recovery validation completes without exception", false, error && error.stack || String(error), "Runtime");
  } finally {
    if (proc && !proc.killed) { proc.kill("SIGTERM"); await wait(300); if (!proc.killed) proc.kill("SIGKILL"); }
    try { fs.rmSync(root,{recursive:true,force:true}); } catch (_) {}
  }
  const passed=checks.filter(x=>x.passed).length, failed=checks.length-passed, criticalFailed=checks.filter(x=>!x.passed&&x.severity==="Critical").length;
  const result={id:`EXTERNAL-010-PHASE20-GATEWAY-RECOVERY-${randomUUID()}`,componentId:"EXTERNAL-010",version:"1.19.0",gatewayVersion:"1.5.0",runtimeNodeVersion:process.version,passed,failed,total:checks.length,health:checks.length?Math.round(passed/checks.length*1000)/10:0,criticalFailed,status:failed===0&&criticalFailed===0?"EXTERNAL-010 Phase 20 Gateway Recovery Validation PASS":"EXTERNAL-010 Phase 20 Gateway Recovery Validation FAIL",releaseAllowed:failed===0&&criticalFailed===0,checks,validatedAt:new Date().toISOString(),gatewayStdout:stdout.slice(-4000),gatewayStderr:stderr.slice(-4000)};
  console.log(JSON.stringify(result,null,2));
  if(!result.releaseAllowed) process.exitCode=1;
}
main();
