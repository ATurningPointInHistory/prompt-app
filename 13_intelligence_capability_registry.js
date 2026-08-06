/* ============================================================
   FILE: 13_intelligence_capability_registry.js
   IDE-170 Intelligence Platform
   Version: 1.4.0
   Phase: 2 Governed Capability Registry - Governed Capability Registry
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE170Intelligence;
  if (!namespace || !namespace.__internal) {
    console.warn("IDE-170 Capability Registry blocked: Core is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const VERSION = "1.4.0";
  const CAPABILITY_ID_PATTERN = /^[A-Z][A-Z0-9]*(?:[.:-][A-Z0-9]+)*$/;
  const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
  const ALLOWED_STATUSES = Object.freeze([
    "Proposed",
    "Registered",
    "Active",
    "Experimental",
    "Validating",
    "Conditional",
    "Official",
    "Deprecated",
    "Blocked",
    "Retired"
  ]);
  const ALLOWED_TYPES = Object.freeze([
    "Core",
    "Registry",
    "Adapter",
    "Pipeline",
    "Interpreter",
    "Query",
    "Validation",
    "Package",
    "Integration",
    "Service"
  ]);

  const BUILT_IN_CAPABILITIES = Object.freeze([
    Object.freeze({
      capabilityId: "IDE-170-CORE",
      name: "Intelligence Platform Core",
      version: VERSION,
      type: "Core",
      status: "Active",
      owner: "IDE-170",
      description: "Platform identity, lifecycle, Session, Audit and Status APIs.",
      dependencies: [],
      schemas: ["IDE-170-SCHEMA-INTELLIGENCE-SESSION", "IDE-170-SCHEMA-AUDIT-RECORD"],
      provides: ["Session Lifecycle", "Basic Audit", "Status API"],
      source: "built-in"
    }),
    Object.freeze({
      capabilityId: "IDE-170-CAPABILITY-REGISTRY",
      name: "Governed Capability Registry",
      version: VERSION,
      type: "Registry",
      status: "Active",
      owner: "IDE-170",
      description: "Registers governed Capabilities and validates versions and dependencies.",
      dependencies: [
        { capabilityId: "IDE-170-CORE", minimumVersion: VERSION, optional: false }
      ],
      schemas: ["IDE-170-SCHEMA-CAPABILITY-DEFINITION"],
      provides: ["Capability Registration", "Dependency Validation", "Version Resolution"],
      source: "built-in"
    })
  ]);

  function normalizeDependency(input) {
    if (typeof input === "string") {
      return {
        capabilityId: internal.canonicalId(input),
        minimumVersion: "0.0.0",
        optional: false
      };
    }

    const source = internal.isPlainObject(input) ? input : {};
    return {
      capabilityId: internal.canonicalId(source.capabilityId || source.id),
      minimumVersion: internal.text(source.minimumVersion || source.version, "0.0.0"),
      optional: source.optional === true
    };
  }

  function normalizeCapability(input) {
    const source = internal.isPlainObject(input) ? input : {};
    const dependencies = internal.asArray(source.dependencies)
      .map(normalizeDependency)
      .filter(function filterDependency(item) {
        return Boolean(item.capabilityId);
      });

    return {
      capabilityId: internal.canonicalId(source.capabilityId || source.id),
      name: internal.text(source.name || source.title, ""),
      version: internal.text(source.version, ""),
      type: internal.text(source.type, "Service"),
      status: internal.text(source.status, "Active"),
      enabled: source.enabled !== false,
      owner: internal.text(source.owner, "IDE-170"),
      description: internal.text(source.description || source.summary, ""),
      dependencies: dependencies,
      schemas: internal.unique(source.schemas),
      provides: internal.unique(source.provides || source.capabilities),
      metadata: internal.isPlainObject(source.metadata) ? internal.clone(source.metadata) : {},
      source: internal.text(source.source, "user"),
      governed: source.governed !== false
    };
  }

  function compareSemver(left, right) {
    const a = String(left || "0.0.0").split(/[+-]/)[0].split(".").map(Number);
    const b = String(right || "0.0.0").split(/[+-]/)[0].split(".").map(Number);
    for (let index = 0; index < 3; index += 1) {
      const difference = (a[index] || 0) - (b[index] || 0);
      if (difference !== 0) return difference > 0 ? 1 : -1;
    }
    return 0;
  }

  function validateCapability(definition) {
    const normalized = normalizeCapability(definition);
    const checks = [];

    function check(name, passed, detail, field) {
      checks.push({
        name: name,
        passed: passed === true,
        detail: internal.text(detail, ""),
        field: field || ""
      });
    }

    check(
      "Capability ID is present",
      Boolean(normalized.capabilityId),
      normalized.capabilityId,
      "capabilityId"
    );
    check(
      "Capability ID format",
      CAPABILITY_ID_PATTERN.test(normalized.capabilityId),
      normalized.capabilityId,
      "capabilityId"
    );
    check(
      "Capability name is present",
      Boolean(normalized.name),
      normalized.name,
      "name"
    );
    check(
      "Semantic version is valid",
      SEMVER_PATTERN.test(normalized.version),
      normalized.version,
      "version"
    );
    check(
      "Capability type is governed",
      ALLOWED_TYPES.includes(normalized.type),
      normalized.type,
      "type"
    );
    check(
      "Capability status is governed",
      ALLOWED_STATUSES.includes(normalized.status),
      normalized.status,
      "status"
    );
    check(
      "Owner is present",
      Boolean(normalized.owner),
      normalized.owner,
      "owner"
    );
    check(
      "Capability is governed",
      normalized.governed === true,
      String(normalized.governed),
      "governed"
    );

    const dependencyIds = new Set();
    normalized.dependencies.forEach(function validateDependency(dependency, index) {
      check(
        "Dependency ID format #" + (index + 1),
        CAPABILITY_ID_PATTERN.test(dependency.capabilityId),
        dependency.capabilityId,
        "dependencies"
      );
      check(
        "Dependency version format #" + (index + 1),
        SEMVER_PATTERN.test(dependency.minimumVersion),
        dependency.minimumVersion,
        "dependencies"
      );
      check(
        "Dependency is not self-reference #" + (index + 1),
        dependency.capabilityId !== normalized.capabilityId,
        dependency.capabilityId,
        "dependencies"
      );
      check(
        "Dependency is unique #" + (index + 1),
        !dependencyIds.has(dependency.capabilityId),
        dependency.capabilityId,
        "dependencies"
      );
      dependencyIds.add(dependency.capabilityId);
    });

    const passed = checks.filter(function countPassed(item) {
      return item.passed;
    }).length;

    return {
      id: internal.nextId("IDE-170-CAPABILITY-VALIDATION"),
      componentId: namespace.componentId,
      valid: checks.length > 0 && passed === checks.length,
      passed: passed,
      failed: checks.length - passed,
      total: checks.length,
      checks: checks,
      capability: normalized,
      validatedAt: internal.nowIso()
    };
  }

  function checkCapabilityDependencies(capabilityOrId) {
    const capability = typeof capabilityOrId === "string"
      ? state.capabilities.get(internal.canonicalId(capabilityOrId))
      : normalizeCapability(capabilityOrId);

    if (!capability) {
      return {
        capabilityId: internal.canonicalId(capabilityOrId),
        ready: false,
        missing: [internal.canonicalId(capabilityOrId)],
        incompatible: [],
        blocked: [],
        optionalMissing: [],
        checkedAt: internal.nowIso()
      };
    }

    const missing = [];
    const incompatible = [];
    const blocked = [];
    const optionalMissing = [];

    internal.asArray(capability.dependencies).forEach(function checkDependency(dependencyInput) {
      const dependency = normalizeDependency(dependencyInput);
      const registered = state.capabilities.get(dependency.capabilityId);
      if (!registered) {
        if (dependency.optional) optionalMissing.push(dependency.capabilityId);
        else missing.push(dependency.capabilityId);
        return;
      }
      if (registered.enabled === false || registered.status === "Blocked") {
        if (!dependency.optional) blocked.push(dependency.capabilityId);
        return;
      }
      if (compareSemver(registered.version, dependency.minimumVersion) < 0) {
        if (!dependency.optional) {
          incompatible.push({
            capabilityId: dependency.capabilityId,
            registeredVersion: registered.version,
            minimumVersion: dependency.minimumVersion
          });
        }
      }
    });

    return {
      capabilityId: capability.capabilityId,
      ready: missing.length === 0 && incompatible.length === 0 && blocked.length === 0,
      missing: missing,
      incompatible: incompatible,
      blocked: blocked,
      optionalMissing: optionalMissing,
      checkedAt: internal.nowIso()
    };
  }

  function registerCapability(definition) {
    const validation = validateCapability(definition);
    const capability = validation.capability;

    if (!validation.valid) {
      internal.appendAudit({
        action: "CAPABILITY_REGISTRATION_BLOCKED",
        actor: capability.owner,
        targetType: "Capability",
        targetId: capability.capabilityId || "UNKNOWN",
        capabilityId: capability.capabilityId,
        outcome: "Blocked",
        detail: { reason: "Invalid Capability", validation: validation }
      });
      return internal.buildResult(false, "CAPABILITY_INVALID", "Blocked", {
        validation: validation
      }, {
        error: {
          message: "Capability definition failed validation.",
          category: "Validation Failure"
        }
      });
    }

    if (state.capabilities.has(capability.capabilityId)) {
      const existing = state.capabilities.get(capability.capabilityId);
      internal.appendAudit({
        action: "CAPABILITY_REGISTRATION_BLOCKED",
        actor: capability.owner,
        targetType: "Capability",
        targetId: capability.capabilityId,
        capabilityId: capability.capabilityId,
        outcome: "Blocked",
        detail: {
          reason: "Duplicate Capability",
          existingVersion: existing.version,
          requestedVersion: capability.version
        }
      });
      return internal.buildResult(false, "CAPABILITY_DUPLICATE", "Blocked", {
        capability: internal.clone(existing)
      }, {
        error: {
          message: "Capability is already registered.",
          category: "Governance Failure"
        }
      });
    }

    const dependencyStatus = checkCapabilityDependencies(capability);
    if (!dependencyStatus.ready) {
      internal.appendAudit({
        action: "CAPABILITY_REGISTRATION_BLOCKED",
        actor: capability.owner,
        targetType: "Capability",
        targetId: capability.capabilityId,
        capabilityId: capability.capabilityId,
        outcome: "Blocked",
        detail: {
          reason: "Dependency Validation Failed",
          dependencyStatus: dependencyStatus
        }
      });
      return internal.buildResult(false, "CAPABILITY_DEPENDENCY_INVALID", "Blocked", {
        dependencyStatus: dependencyStatus
      }, {
        error: {
          message: "Capability dependencies are unavailable or incompatible.",
          category: "Dependency Failure"
        }
      });
    }

    const registeredAt = internal.nowIso();
    const record = internal.deepFreeze(Object.assign({}, capability, {
      registeredAt: registeredAt,
      updatedAt: registeredAt,
      immutable: true
    }));
    state.capabilities.set(record.capabilityId, record);
    internal.touch();

    internal.appendAudit({
      action: "CAPABILITY_REGISTERED",
      actor: record.owner,
      targetType: "Capability",
      targetId: record.capabilityId,
      capabilityId: record.capabilityId,
      outcome: "Succeeded",
      detail: {
        version: record.version,
        type: record.type,
        status: record.status,
        source: record.source
      }
    });

    return internal.buildResult(true, "CAPABILITY_REGISTERED", "Ready", {
      capability: getCapability(record.capabilityId)
    });
  }

  function getCapability(capabilityId) {
    const record = state.capabilities.get(internal.canonicalId(capabilityId));
    if (!record) return null;
    const copy = internal.clone(record);
    copy.dependencyStatus = checkCapabilityDependencies(record);
    return copy;
  }

  function getCapabilities(options) {
    const settings = internal.isPlainObject(options) ? options : {};
    const type = internal.text(settings.type, "");
    const status = internal.text(settings.status, "");
    const includeDisabled = settings.includeDisabled === true;

    return [...state.capabilities.values()]
      .filter(function filterCapability(item) {
        if (!includeDisabled && item.enabled === false) return false;
        if (type && item.type !== type) return false;
        if (status && item.status !== status) return false;
        return true;
      })
      .sort(function sortCapability(left, right) {
        return left.capabilityId.localeCompare(right.capabilityId);
      })
      .map(function mapCapability(item) {
        return getCapability(item.capabilityId);
      });
  }

  function initializeCapabilityRegistry() {
    const results = [];
    BUILT_IN_CAPABILITIES.forEach(function registerBuiltIn(definition) {
      if (state.capabilities.has(definition.capabilityId)) {
        results.push({
          capabilityId: definition.capabilityId,
          registered: true,
          existing: true
        });
        return;
      }
      const result = registerCapability(definition);
      results.push({
        capabilityId: definition.capabilityId,
        registered: result.ok === true,
        code: result.code
      });
    });

    const failed = results.filter(function filterFailure(item) {
      return item.registered !== true;
    });

    return internal.buildResult(failed.length === 0,
      failed.length ? "CAPABILITY_REGISTRY_INITIALIZATION_FAILED" : "CAPABILITY_REGISTRY_INITIALIZED",
      failed.length ? "Blocked" : "Ready",
      {
        builtInCount: BUILT_IN_CAPABILITIES.length,
        registryCount: state.capabilities.size,
        results: results
      },
      failed.length ? {
        error: {
          message: "One or more built-in Capabilities could not be registered.",
          category: "Initialization Failure"
        }
      } : {});
  }

  function removeCapabilityForValidation(capabilityId) {
    return state.capabilities.delete(internal.canonicalId(capabilityId));
  }

  Object.assign(internal, {
    capabilityIdPattern: CAPABILITY_ID_PATTERN,
    semverPattern: SEMVER_PATTERN,
    compareSemver: compareSemver,
    normalizeCapability: normalizeCapability,
    removeCapabilityForValidation: removeCapabilityForValidation
  });

  Object.assign(namespace.api, {
    initializeCapabilityRegistry: initializeCapabilityRegistry,
    getCapabilities: getCapabilities,
    getCapability: getCapability,
    registerCapability: registerCapability,
    validateCapability: validateCapability,
    checkCapabilityDependencies: checkCapabilityDependencies
  });

  Object.assign(namespace, {
    getCapabilities: getCapabilities,
    getCapability: getCapability,
    registerCapability: registerCapability,
    validateCapability: validateCapability,
    checkCapabilityDependencies: checkCapabilityDependencies
  });

  namespace.modules.capabilityRegistry = {
    id: "IDE-170-CAPABILITY-REGISTRY",
    version: VERSION,
    status: "Ready",
    duplicateProtection: true,
    dependencyValidation: true,
    versionValidation: true,
    loadedAt: internal.nowIso()
  };

  global.registerIntelligenceCapability = registerCapability;
  global.getIntelligenceCapability = getCapability;
  global.getIntelligenceCapabilities = getCapabilities;
  global.validateIntelligenceCapability = validateCapability;
})(typeof window !== "undefined" ? window : globalThis);
