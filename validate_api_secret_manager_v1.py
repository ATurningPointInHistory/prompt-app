# -*- coding: utf-8 -*-
"""Decision 056 API / Secret Manager v1 static/unit validation."""
from pathlib import Path
import json
import os
import re
import sys
import tempfile

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import api_secret_manager as asm

checks = []

def check(name, passed, detail=None):
    checks.append({"name": name, "passed": bool(passed), "detail": detail})

# Isolated metadata state.
state = {}
state, changed = asm.ensure_default_profiles(state)
profiles = asm.list_profiles(state)
refs = {p["secretReferenceId"]: p for p in profiles}
check("Default OpenAI LEGACY profile exists and is ACTIVE", refs.get("SECRET-OPENAI-LEGACY", {}).get("lifecycleState") == "ACTIVE", refs.get("SECRET-OPENAI-LEGACY"))
check("Default OpenAI PRIMARY profile exists and is STANDBY", refs.get("SECRET-OPENAI-PRIMARY", {}).get("lifecycleState") == "STANDBY", refs.get("SECRET-OPENAI-PRIMARY"))
check("Credential aliases contain no account-identifying data", refs.get("SECRET-OPENAI-LEGACY", {}).get("alias") == "LEGACY" and refs.get("SECRET-OPENAI-PRIMARY", {}).get("alias") == "PRIMARY", [p.get("alias") for p in profiles])

expected_env = "EXTERNAL010_SECRET_SECRET_OPENAI_LEGACY"
check("Secret Reference maps to canonical Gateway environment name", asm.secret_env_name("SECRET-OPENAI-LEGACY") == expected_env, asm.secret_env_name("SECRET-OPENAI-LEGACY"))

# Ephemeral load/remove without echo.
old_value = os.environ.get(expected_env)
try:
    result = asm.load_ephemeral_secret("SECRET-OPENAI-LEGACY", "test-secret-value-never-print")
    check("Ephemeral secret loads without returning value", result.get("ok") and result.get("secretValueReturned") is False and "test-secret" not in json.dumps(result), result)
    public = asm.public_state_snapshot(state)
    check("Public snapshot never includes secret value", "test-secret-value-never-print" not in json.dumps(public), {"profileCount": len(public.get("profiles", [])), "secretValueReturned": public.get("secretValueReturned")})
    hosts = asm.apply_managed_gateway_environment(state)
    check("OpenAI loaded profile automatically adds only canonical api.openai.com host", "api.openai.com" in hosts.get("managedProviderHosts", []) and hosts.get("arbitraryHostExpansionPerformed") is False, hosts)
    removed = asm.remove_ephemeral_secret("SECRET-OPENAI-LEGACY")
    check("Ephemeral secret can be removed locally without provider revocation claim", removed.get("ok") and removed.get("secretValueReturned") is False, removed)
finally:
    if old_value is None:
        os.environ.pop(expected_env, None)
    else:
        os.environ[expected_env] = old_value

# Lifecycle switching.
asm.set_profile_lifecycle(state, "SECRET-OPENAI-PRIMARY", "ACTIVE")
legacy = asm.get_profile(state, "SECRET-OPENAI-LEGACY")
primary = asm.get_profile(state, "SECRET-OPENAI-PRIMARY")
check("Manual ACTIVE switch demotes previous ACTIVE to STANDBY", primary.get("lifecycleState") == "ACTIVE" and legacy.get("lifecycleState") == "STANDBY", {"legacy": legacy.get("lifecycleState"), "primary": primary.get("lifecycleState")})
asm.set_profile_lifecycle(state, "SECRET-OPENAI-PRIMARY", "DISABLED")
check("Credential lifecycle supports DISABLED", asm.get_profile(state, "SECRET-OPENAI-PRIMARY").get("lifecycleState") == "DISABLED", "DISABLED")
asm.set_profile_lifecycle(state, "SECRET-OPENAI-PRIMARY", "RETIRED")
check("Credential lifecycle supports RETIRED", asm.get_profile(state, "SECRET-OPENAI-PRIMARY").get("lifecycleState") == "RETIRED", "RETIRED")

# Generic provider profile support.
custom = asm.upsert_profile_metadata(
    state,
    provider="TEST_PROVIDER",
    alias="PRIMARY",
    reference_id="SECRET-TEST-PROVIDER-PRIMARY",
    secret_type="API_KEY",
    lifecycle_state="STANDBY",
    billing_profile_id="BILLING-TEST-PROVIDER-PRIMARY",
)
check("Manager model supports additional providers without provider-specific commands", custom.get("provider") == "TEST_PROVIDER" and custom.get("secretType") == "API_KEY", custom)
check("Serialized metadata state contains no secret material keys", asm.assert_no_secret_material_in_state(state), True)

# Static UI/source checks.
launcher = (ROOT / "AI_Prompt_OS_Launcher.pyw").read_text(encoding="utf-8")
browser_ui = (ROOT / "17_external_intelligence_openai_provider_ui.js").read_text(encoding="utf-8")
start_bat = (ROOT / "Start_AI_Prompt_OS.bat").read_text(encoding="utf-8")
check("Launcher exposes API / Secret Manager v1", "API / Secret Managerを開く" in launcher and "Launcher v1.5.0" in launcher, "launcher-ui-present")
check("Launcher warns local removal is not provider-side revoke", "Provider側API KeyのRevokeではありません" in launcher, "revoke-distinction-present")
check("Launcher supports safe Gateway restart after secret changes", "Gatewayへ反映（安全に再起動）" in launcher and "現在のGateway Sessionは無効" in launcher, "restart-gate-present")
check("Browser OpenAI UI exposes LEGACY and PRIMARY Secret References without secret input", "SECRET-OPENAI-LEGACY" in browser_ui and "SECRET-OPENAI-PRIMARY" in browser_ui and "APIキー本体ではなくGateway用の参照ID" in browser_ui, "reference-only-options")
check("Start BAT contains no embedded API secret", "sk-" not in start_bat.lower() and "api_key=" not in start_bat.lower(), "bat-secret-free")
check("Automatic credential failover remains disabled in v1", asm.public_state_snapshot(state).get("automaticCredentialFailoverEnabled") is False, False)
check("Automatic budget expansion remains disabled", asm.public_state_snapshot(state).get("automaticBudgetExpansionAllowed") is False, False)

passed = sum(1 for c in checks if c["passed"])
failed = len(checks) - passed
result = {
    "id": "EXTERNAL-010-API-SECRET-MANAGER-V1-VALIDATION",
    "decisionId": "EXTERNAL-010-DECISION-056",
    "version": "1.0.0",
    "launcherVersion": "1.5.0",
    "passed": passed,
    "failed": failed,
    "total": len(checks),
    "health": round((passed / len(checks) * 100) if checks else 0, 1),
    "criticalFailed": failed,
    "persistentSecretStorageEnabled": False,
    "automaticCredentialFailoverEnabled": False,
    "paidApiRequestPerformed": False,
    "providerRegistrationPerformed": False,
    "checks": checks,
}
print(json.dumps(result, ensure_ascii=False, indent=2))
raise SystemExit(0 if failed == 0 else 1)
