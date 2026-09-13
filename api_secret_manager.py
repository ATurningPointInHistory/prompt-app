# -*- coding: utf-8 -*-
"""AI Prompt OS governed API / Secret Manager v1 model.

Decision: EXTERNAL-010-DECISION-056

Security boundary
-----------------
- Secret values are process-memory / process-environment only in v1.
- Secret values are never serialized by this module.
- Persistent launcher state stores metadata only.
- Browser / Repository / Evidence remain reference-only.
"""

from __future__ import annotations

import os
import re
from copy import deepcopy

MODULE_VERSION = "1.0.0"
DECISION_ID = "EXTERNAL-010-DECISION-056"
PROFILE_STATE_KEY = "api_secret_profiles"
PROFILE_STATES = ("ACTIVE", "STANDBY", "DISABLED", "RETIRED")
SECRET_TYPES = ("BEARER_TOKEN", "API_KEY", "ACCESS_TOKEN", "CUSTOM_SECRET")
REFERENCE_RE = re.compile(r"^SECRET-[A-Z0-9-]+$")

DEFAULT_PROFILES = (
    {
        "provider": "OPENAI",
        "alias": "LEGACY",
        "secretReferenceId": "SECRET-OPENAI-LEGACY",
        "secretType": "BEARER_TOKEN",
        "lifecycleState": "ACTIVE",
        "billingProfileId": "BILLING-OPENAI-LEGACY",
        "budgetId": None,
        "capabilityProfileId": "OPENAI-RESPONSES-INITIAL",
        "lastValidationStatus": "NOT_VALIDATED",
        "lastValidationAt": None,
    },
    {
        "provider": "OPENAI",
        "alias": "PRIMARY",
        "secretReferenceId": "SECRET-OPENAI-PRIMARY",
        "secretType": "BEARER_TOKEN",
        "lifecycleState": "STANDBY",
        "billingProfileId": "BILLING-OPENAI-PRIMARY",
        "budgetId": None,
        "capabilityProfileId": "OPENAI-RESPONSES-INITIAL",
        "lastValidationStatus": "NOT_VALIDATED",
        "lastValidationAt": None,
    },
)


def normalize_reference(reference_id: str) -> str:
    value = str(reference_id or "").strip().upper()
    if not REFERENCE_RE.fullmatch(value):
        raise ValueError("SECRET_REFERENCE_INVALID")
    return value


def normalize_provider(provider: str) -> str:
    value = re.sub(r"[^A-Z0-9_-]+", "-", str(provider or "").strip().upper()).strip("-")
    if not value:
        raise ValueError("PROVIDER_REQUIRED")
    return value[:64]


def normalize_alias(alias: str) -> str:
    value = re.sub(r"[^A-Z0-9_-]+", "-", str(alias or "").strip().upper()).strip("-")
    if not value:
        raise ValueError("ALIAS_REQUIRED")
    return value[:64]


def normalize_secret_type(secret_type: str) -> str:
    value = str(secret_type or "").strip().upper()
    if value not in SECRET_TYPES:
        raise ValueError("SECRET_TYPE_INVALID")
    return value


def normalize_lifecycle(state: str) -> str:
    value = str(state or "").strip().upper()
    if value not in PROFILE_STATES:
        raise ValueError("PROFILE_STATE_INVALID")
    return value


def secret_env_name(reference_id: str) -> str:
    reference_id = normalize_reference(reference_id)
    normalized = re.sub(r"[^A-Z0-9]+", "_", reference_id)
    return f"EXTERNAL010_SECRET_{normalized}"


def _profiles_dict(state: dict) -> dict:
    value = state.get(PROFILE_STATE_KEY)
    return value if isinstance(value, dict) else {}


def ensure_default_profiles(state: dict) -> tuple[dict, bool]:
    """Return state with default OpenAI metadata profiles. Never writes secret values."""
    state = state if isinstance(state, dict) else {}
    profiles = _profiles_dict(state)
    changed = not isinstance(state.get(PROFILE_STATE_KEY), dict)
    if changed:
        state[PROFILE_STATE_KEY] = profiles

    for default in DEFAULT_PROFILES:
        ref = default["secretReferenceId"]
        current = profiles.get(ref)
        if not isinstance(current, dict):
            profiles[ref] = deepcopy(default)
            changed = True
            continue
        # Add only missing metadata fields. Preserve user-selected lifecycle state.
        for key, value in default.items():
            if key not in current:
                current[key] = deepcopy(value)
                changed = True
    return state, changed


def list_profiles(state: dict) -> list[dict]:
    state, _ = ensure_default_profiles(state)
    items = []
    for ref, profile in _profiles_dict(state).items():
        if not isinstance(profile, dict):
            continue
        item = deepcopy(profile)
        item["secretReferenceId"] = ref
        item["secretLoadedInLauncherProcess"] = is_secret_loaded(ref)
        # Explicitly never include any environment variable value.
        item["secretValueReturned"] = False
        items.append(item)
    return sorted(items, key=lambda x: (str(x.get("provider", "")), str(x.get("alias", "")), x["secretReferenceId"]))


def get_profile(state: dict, reference_id: str) -> dict | None:
    ref = normalize_reference(reference_id)
    state, _ = ensure_default_profiles(state)
    profile = _profiles_dict(state).get(ref)
    if not isinstance(profile, dict):
        return None
    item = deepcopy(profile)
    item["secretReferenceId"] = ref
    item["secretLoadedInLauncherProcess"] = is_secret_loaded(ref)
    item["secretValueReturned"] = False
    return item


def upsert_profile_metadata(
    state: dict,
    *,
    provider: str,
    alias: str,
    reference_id: str,
    secret_type: str,
    lifecycle_state: str = "STANDBY",
    billing_profile_id: str | None = None,
    budget_id: str | None = None,
    capability_profile_id: str | None = None,
) -> dict:
    state, _ = ensure_default_profiles(state)
    ref = normalize_reference(reference_id)
    provider = normalize_provider(provider)
    alias = normalize_alias(alias)
    secret_type = normalize_secret_type(secret_type)
    lifecycle_state = normalize_lifecycle(lifecycle_state)
    existing = _profiles_dict(state).get(ref) if isinstance(_profiles_dict(state).get(ref), dict) else {}
    profile = {
        "provider": provider,
        "alias": alias,
        "secretReferenceId": ref,
        "secretType": secret_type,
        "lifecycleState": lifecycle_state,
        "billingProfileId": str(billing_profile_id or f"BILLING-{provider}-{alias}").strip(),
        "budgetId": str(budget_id).strip() if budget_id else None,
        "capabilityProfileId": str(capability_profile_id).strip() if capability_profile_id else None,
        "lastValidationStatus": existing.get("lastValidationStatus", "NOT_VALIDATED"),
        "lastValidationAt": existing.get("lastValidationAt"),
    }
    _profiles_dict(state)[ref] = profile
    if lifecycle_state == "ACTIVE":
        set_profile_lifecycle(state, ref, "ACTIVE")
    return deepcopy(profile)


def set_profile_lifecycle(state: dict, reference_id: str, lifecycle_state: str) -> dict:
    state, _ = ensure_default_profiles(state)
    ref = normalize_reference(reference_id)
    lifecycle_state = normalize_lifecycle(lifecycle_state)
    profiles = _profiles_dict(state)
    profile = profiles.get(ref)
    if not isinstance(profile, dict):
        raise KeyError("PROFILE_NOT_FOUND")

    provider = str(profile.get("provider", "")).upper()
    if lifecycle_state == "ACTIVE":
        # One ACTIVE credential per provider. Existing ACTIVE becomes STANDBY, not deleted.
        for other_ref, other in profiles.items():
            if other_ref == ref or not isinstance(other, dict):
                continue
            if str(other.get("provider", "")).upper() == provider and str(other.get("lifecycleState", "")).upper() == "ACTIVE":
                other["lifecycleState"] = "STANDBY"
    profile["lifecycleState"] = lifecycle_state
    return deepcopy(profile)


def is_secret_loaded(reference_id: str) -> bool:
    env_name = secret_env_name(reference_id)
    return bool(os.environ.get(env_name, ""))


def load_ephemeral_secret(reference_id: str, secret_value: str) -> dict:
    """Load secret into current process environment only. Never serialize or echo it."""
    ref = normalize_reference(reference_id)
    value = str(secret_value or "")
    if not value:
        raise ValueError("SECRET_VALUE_REQUIRED")
    env_name = secret_env_name(ref)
    os.environ[env_name] = value
    return {
        "ok": True,
        "code": "EPHEMERAL_SECRET_LOADED",
        "secretReferenceId": ref,
        "environmentVariable": env_name,
        "secretValueReturned": False,
        "persistentStoragePerformed": False,
    }


def remove_ephemeral_secret(reference_id: str) -> dict:
    ref = normalize_reference(reference_id)
    env_name = secret_env_name(ref)
    existed = env_name in os.environ
    os.environ.pop(env_name, None)
    return {
        "ok": True,
        "code": "EPHEMERAL_SECRET_REMOVED" if existed else "EPHEMERAL_SECRET_ALREADY_ABSENT",
        "secretReferenceId": ref,
        "secretValueReturned": False,
        "persistentStorageMutationPerformed": False,
    }


def profile_state_is_usable(state: dict, reference_id: str) -> bool:
    profile = get_profile(state, reference_id)
    return bool(
        profile
        and profile.get("lifecycleState") in ("ACTIVE", "STANDBY")
        and profile.get("secretLoadedInLauncherProcess") is True
    )


def public_state_snapshot(state: dict) -> dict:
    """Safe diagnostic snapshot: metadata only, never secret values."""
    return {
        "moduleVersion": MODULE_VERSION,
        "decisionId": DECISION_ID,
        "profiles": list_profiles(state),
        "secretValueReturned": False,
        "persistentSecretStorageEnabled": False,
        "automaticCredentialFailoverEnabled": False,
        "automaticBudgetExpansionAllowed": False,
    }


def assert_no_secret_material_in_state(state: dict) -> bool:
    """Conservative key-name check for serialized launcher state."""
    forbidden_fragments = ("secretvalue", "apikeyvalue", "bearertokenvalue", "plaintextsecret", "rawsecret")

    def walk(value):
        if isinstance(value, dict):
            for key, item in value.items():
                normalized = re.sub(r"[^a-z0-9]", "", str(key).lower())
                if any(fragment in normalized for fragment in forbidden_fragments):
                    return False
                if not walk(item):
                    return False
        elif isinstance(value, (list, tuple)):
            for item in value:
                if not walk(item):
                    return False
        return True

    return walk(state)

PROVIDER_ACQUISITION_HOSTS = {
    "OPENAI": ("api.openai.com",),
}


def managed_acquisition_hosts(state: dict) -> list[str]:
    """Return provider hosts implied by loaded, non-disabled credential profiles."""
    hosts = []
    for profile in list_profiles(state):
        if profile.get("lifecycleState") in ("DISABLED", "RETIRED"):
            continue
        if not profile.get("secretLoadedInLauncherProcess"):
            continue
        for host in PROVIDER_ACQUISITION_HOSTS.get(str(profile.get("provider", "")).upper(), ()):
            if host not in hosts:
                hosts.append(host)
    return hosts


def apply_managed_gateway_environment(state: dict) -> dict:
    """Merge known provider hosts into the Gateway allowlist without broadening arbitrary hosts."""
    existing = [
        item.strip().lower()
        for item in str(os.environ.get("EXTERNAL010_ACQUISITION_ALLOWED_HOSTS", "")).split(",")
        if item.strip()
    ]
    managed = managed_acquisition_hosts(state)
    merged = []
    for host in existing + managed:
        if host not in merged:
            merged.append(host)
    if merged:
        os.environ["EXTERNAL010_ACQUISITION_ALLOWED_HOSTS"] = ",".join(merged)
    return {
        "ok": True,
        "acquisitionAllowedHosts": merged,
        "managedProviderHosts": managed,
        "arbitraryHostExpansionPerformed": False,
    }
