"use strict";

const { createHash, randomUUID } = require("node:crypto");

const SENSITIVE = /(secret|token|password|credential|authorization|api[_-]?key|private[_-]?key|session[_-]?key)/i;

function redact(value, keyHint = "") {
  if (SENSITIVE.test(String(keyHint))) return "[REDACTED]";
  if (Array.isArray(value)) return value.map((item) => redact(item));
  if (!value || typeof value !== "object") return value;
  const output = {};
  for (const [key, item] of Object.entries(value)) output[key] = redact(item, key);
  return output;
}

function createAudit() {
  const events = [];
  let previousHash = null;
  function append(eventType, outcome, details = {}) {
    const base = {
      auditEventId: `EXTERNAL-010-GATEWAY-AUDIT-${randomUUID()}`,
      sequence: events.length + 1,
      eventType: String(eventType || "UNKNOWN"),
      outcome: String(outcome || "Recorded"),
      details: redact(details),
      previousEventHash: previousHash,
      createdAt: new Date().toISOString()
    };
    const eventHash = createHash("sha256").update(JSON.stringify(base)).digest("hex");
    const event = Object.freeze({ ...base, eventHash });
    events.push(event);
    previousHash = eventHash;
    return event;
  }
  function summary() {
    return { eventCount: events.length, lastEventHash: previousHash, appendOnly: true, secretRedaction: true };
  }
  function list() { return events.map((event) => ({ ...event, details: redact(event.details) })); }
  return { append, summary, list, redact };
}

module.exports = { createAudit, redact };
