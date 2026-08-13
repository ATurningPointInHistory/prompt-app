/* ============================================================
   FILE: 13_development_automation_cross_device.js
   IDE-190 Development Automation
   Release: 1.8.0 / Module: Cross-Device 1.0.0
   Phase 9: UI / Reflection Package / Cross-Device
   Design Freeze: IDE-190-DESIGN-FREEZE-1.0.0
   ============================================================ */
(function (global) {
  "use strict";

  const namespace = global.IDE190DevelopmentAutomation;
  const VERSION_MANIFEST = global.IDE190VersionManifest;
  if (!namespace || !namespace.__internal || !VERSION_MANIFEST) {
    console.warn("IDE-190 Cross-Device blocked: Core or Version Manifest is not loaded.");
    return;
  }

  const internal = namespace.__internal;
  const state = internal.state;
  const MODULE_VERSION = VERSION_MANIFEST.getModuleVersion("crossDevice");

  function sensitivePermissions() {
    return {
      persistentCommitPermission: false,
      githubAutomaticReflectionPermission: false,
      approvalBypassAllowed: false,
      directRepositoryMutationAllowed: false,
      automaticWorkflowExecutionAllowed: false,
      automaticRepositoryRepairAllowed: false,
      externalAutomaticReflectionAllowed: false
    };
  }

  function buildProfilePolicy(profileId, deviceClass, displayMode) {
    return {
      profileId: profileId,
      deviceClass: deviceClass,
      displayMode: displayMode,
      runtime: VERSION_MANIFEST.commonRuntimeBoundary.runtime,
      responsiveUI: true,
      permissionIndependent: true,
      sensitivePermissions: sensitivePermissions()
    };
  }

  function getAutomationCrossDevicePolicyMatrix() {
    return {
      policyVersion: MODULE_VERSION,
      commonRuntime: VERSION_MANIFEST.commonRuntimeBoundary.runtime,
      capabilityBasedProfiles: true,
      displayModeChangesPermission: false,
      pcPermissionEscalationAllowed: false,
      androidPermissionEscalationAllowed: false,
      profiles: [
        buildProfilePolicy("IDE-190-PROFILE-ANDROID-WEB", "Android", "mobile-responsive"),
        buildProfilePolicy("IDE-190-PROFILE-COMMON-WEB", "Web", "responsive-web")
      ],
      immutablePolicySource: "IDE-190-DESIGN-FREEZE-1.0.0"
    };
  }

  function sameSensitivePermissions(left, right) {
    return JSON.stringify(left && left.sensitivePermissions || {}) === JSON.stringify(right && right.sensitivePermissions || {});
  }

  function buildAutomationCrossDeviceRecord() {
    const matrix = getAutomationCrossDevicePolicyMatrix();
    const currentProfile = typeof namespace.getPlatformProfile === "function" ? namespace.getPlatformProfile() : null;
    const androidProfile = matrix.profiles.find(function find(item) { return item.deviceClass === "Android"; });
    const webProfile = matrix.profiles.find(function find(item) { return item.deviceClass === "Web"; });
    const parityVerified = Boolean(
      androidProfile && webProfile &&
      sameSensitivePermissions(androidProfile, webProfile) &&
      matrix.displayModeChangesPermission === false &&
      matrix.pcPermissionEscalationAllowed === false &&
      matrix.androidPermissionEscalationAllowed === false
    );
    const record = {
      crossDeviceRecordId: internal.nextId("IDE-190-CROSS-DEVICE-RECORD"),
      recordVersion: VERSION_MANIFEST.getContractVersion("crossDeviceRecord"),
      componentId: "IDE-190",
      componentVersion: VERSION_MANIFEST.release.version,
      runtime: matrix.commonRuntime,
      currentProfile: internal.clone(currentProfile),
      policyMatrix: internal.clone(matrix),
      parityVerified: parityVerified,
      displayModeChangesPermission: false,
      pcPermissionEscalationAllowed: false,
      androidPermissionEscalationAllowed: false,
      persistentCommitPermission: false,
      githubAutomaticReflectionPermission: false,
      approvalBypassAllowed: false,
      immutable: true,
      createdAt: internal.nowIso()
    };
    const validation = namespace.validateContract("crossDeviceRecord", record);
    if (!validation.valid) return internal.buildResult(false, "IDE190_CROSS_DEVICE_CONTRACT_INVALID", "Blocked", { record: record, validation: validation });
    state.latestCrossDeviceRecord = internal.deepFreeze(internal.clone(record));
    internal.touch();
    return internal.buildResult(true, "IDE190_CROSS_DEVICE_RECORD_READY", "Ready", { record: internal.clone(record), validation: validation });
  }

  function validateAutomationCrossDeviceParity() {
    const result = buildAutomationCrossDeviceRecord();
    if (!result.ok || !result.data || !result.data.record) return result;
    const record = result.data.record;
    const profile = record.currentProfile || {};
    const currentSafe = profile.persistentCommitPermission === false && profile.githubAutomaticReflectionPermission === false && profile.approvalBypassAllowed === false;
    const valid = record.parityVerified === true && currentSafe;
    return internal.buildResult(valid, valid ? "IDE190_CROSS_DEVICE_PARITY_VERIFIED" : "IDE190_CROSS_DEVICE_PARITY_FAILED", valid ? "Verified" : "Blocked", {
      record: record,
      currentSafe: currentSafe,
      currentDeviceClass: profile.deviceClass || "Unknown"
    });
  }

  function getAutomationCrossDeviceStatus() {
    const matrix = getAutomationCrossDevicePolicyMatrix();
    const profile = typeof namespace.getPlatformProfile === "function" ? namespace.getPlatformProfile() : null;
    return {
      status: "Ready",
      currentProfile: internal.clone(profile),
      policyMatrix: internal.clone(matrix),
      displayModeChangesPermission: false,
      permissionParityRequired: true,
      pcPermissionEscalationAllowed: false,
      androidPermissionEscalationAllowed: false
    };
  }

  function initializeCrossDevice() {
    const parity = validateAutomationCrossDeviceParity();
    namespace.modules.crossDevice.status = parity.ok ? "Ready" : "Blocked";
    return internal.buildResult(parity.ok, parity.ok ? "IDE190_CROSS_DEVICE_INITIALIZED" : "IDE190_CROSS_DEVICE_INITIALIZATION_FAILED", parity.ok ? "Ready" : "Blocked", getAutomationCrossDeviceStatus());
  }

  Object.assign(namespace.api, {
    initializeCrossDevice: initializeCrossDevice,
    getAutomationCrossDevicePolicyMatrix: getAutomationCrossDevicePolicyMatrix,
    buildAutomationCrossDeviceRecord: buildAutomationCrossDeviceRecord,
    validateAutomationCrossDeviceParity: validateAutomationCrossDeviceParity,
    getAutomationCrossDeviceStatus: getAutomationCrossDeviceStatus
  });
  Object.assign(namespace, namespace.api);

  namespace.modules.crossDevice = {
    id: "IDE-190-CROSS-DEVICE",
    version: MODULE_VERSION,
    status: "Loaded",
    phase: 9,
    permissionParityRequired: true,
    displayModeChangesPermission: false,
    loadedAt: internal.nowIso()
  };
})(typeof window !== "undefined" ? window : globalThis);
