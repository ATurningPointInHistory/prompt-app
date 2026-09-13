# -*- coding: utf-8 -*-
"""
AI Prompt OS Selectable Launcher v1.4.5

Canonical Gateway Edition

Modes
-----
1. Normal Start
   - Web Server only
   - Opens http://localhost:8000/

2. External Gateway Start
   - Web Server
   - Canonical External Gateway
   - Opens http://localhost:8000/

Important
---------
Phase 06 validation runtime remains separate:
external_gateway\\start_phase6_pc_runtime.bat

The normal launcher intentionally does NOT start the Phase 06 fixture.
"""

import hashlib
import json
import math
import os
import socket
import subprocess
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path
import tkinter as tk
from tkinter import messagebox
from tkinter import ttk

PROJECT_ROOT = Path(__file__).resolve().parent
GATEWAY_DIR = PROJECT_ROOT / "external_gateway"
GATEWAY_BAT = GATEWAY_DIR / "start_external_gateway.bat"

WEB_URL = "http://localhost:8000/"
WEB_PORT = 8000
WEB_IDENTITY_FILE = "00_script_manifest.json"
WEB_INDEX_FILE = "index.html"
GATEWAY_PORT = 43110
GATEWAY_HEALTH_URL = f"http://127.0.0.1:{GATEWAY_PORT}/health"
GATEWAY_EXPECTED_COMPONENT = "EXTERNAL-010"
GATEWAY_PACKAGE_FILE = GATEWAY_DIR / "package.json"
STARTUP_TIMEOUT = 20

CREATE_NEW_CONSOLE = getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
CREATE_NO_WINDOW = getattr(subprocess, "CREATE_NO_WINDOW", 0)

STATE_DIR = Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "AI_Prompt_OS_Launcher"
STATE_FILE = STATE_DIR / "launcher_state.json"
LOG_FILE = STATE_DIR / "launcher.log"

PHI = (1 + 5 ** 0.5) / 2
BASE_WIDTH = 900
BASE_HEIGHT = 560


def ensure_state_dir():
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def log(message):
    ensure_state_dir()
    stamp = time.strftime("%Y-%m-%d %H:%M:%S")
    with LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(f"[{stamp}] {message}\n")


def load_state():
    ensure_state_dir()
    if not STATE_FILE.exists():
        return {}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def save_state(state):
    ensure_state_dir()
    STATE_FILE.write_text(
        json.dumps(state, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def port_open(port):
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.25):
            return True
    except OSError:
        return False


def normalized_project_root(value):
    try:
        return os.path.normcase(os.path.normpath(str(Path(value).resolve())))
    except Exception:
        return os.path.normcase(os.path.normpath(str(value)))


def state_matches_project(state):
    stored_root = state.get("project_root")
    if not stored_root:
        return False
    return normalized_project_root(stored_root) == normalized_project_root(PROJECT_ROOT)


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def current_web_build_identity():
    manifest_path = PROJECT_ROOT / WEB_IDENTITY_FILE
    version = "unknown"
    manifest_hash = "unknown"
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
        version = str(payload.get("version", "unknown")).strip() or "unknown"
        manifest_hash = str(payload.get("manifestHash", "")).strip() or sha256_bytes(manifest_path.read_bytes())
    except Exception:
        if manifest_path.exists():
            manifest_hash = sha256_bytes(manifest_path.read_bytes())
    return {"version": version, "manifestHash": manifest_hash}


def application_url():
    identity = current_web_build_identity()
    version = identity.get("version", "unknown")
    manifest_hash = identity.get("manifestHash", "unknown")[:16]
    return (
        f"{WEB_URL}index.html?launcher_version={version}"
        f"&manifest={manifest_hash}&fresh={time.time_ns()}"
    )


def open_application_browser():
    url = application_url()
    log(f"Opening application URL: {url}")
    return webbrowser.open_new_tab(url)


def _fetch_web_bytes(url, timeout=0.8):
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "*/*",
            "Cache-Control": "no-cache, no-store, max-age=0",
            "Pragma": "no-cache",
        },
        method="GET",
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP_{response.status}")
        return response.read()


def web_server_identity():
    if not port_open(WEB_PORT):
        return {"ok": False, "state": "STOPPED", "reason": "PORT_CLOSED"}

    local_identity = PROJECT_ROOT / WEB_IDENTITY_FILE
    local_index = PROJECT_ROOT / WEB_INDEX_FILE
    if not local_identity.exists():
        return {
            "ok": False,
            "state": "INVALID",
            "reason": "LOCAL_IDENTITY_FILE_MISSING",
        }
    if not local_index.exists():
        return {
            "ok": False,
            "state": "INVALID",
            "reason": "LOCAL_INDEX_FILE_MISSING",
        }

    local_manifest_bytes = local_identity.read_bytes()
    local_index_bytes = local_index.read_bytes()
    local_manifest_hash = sha256_bytes(local_manifest_bytes)
    local_index_hash = sha256_bytes(local_index_bytes)
    nonce = time.time_ns()

    try:
        remote_manifest_bytes = _fetch_web_bytes(
            f"{WEB_URL}{WEB_IDENTITY_FILE}?launcher_identity={nonce}"
        )
        remote_index_bytes = _fetch_web_bytes(
            f"{WEB_URL}{WEB_INDEX_FILE}?launcher_identity={nonce}"
        )
    except Exception as exc:
        return {
            "ok": False,
            "state": "INVALID",
            "reason": str(exc) or type(exc).__name__,
            "localManifestHash": local_manifest_hash,
            "localIndexHash": local_index_hash,
        }

    remote_manifest_hash = sha256_bytes(remote_manifest_bytes)
    remote_index_hash = sha256_bytes(remote_index_bytes)
    manifest_ok = remote_manifest_hash == local_manifest_hash
    index_ok = remote_index_hash == local_index_hash
    ok = manifest_ok and index_ok

    if not manifest_ok:
        reason = "PROJECT_MANIFEST_MISMATCH"
    elif not index_ok:
        reason = "PROJECT_INDEX_MISMATCH"
    else:
        reason = "PASS"

    build = current_web_build_identity()
    return {
        "ok": ok,
        "state": "READY" if ok else "MISMATCH",
        "reason": reason,
        "localHash": local_manifest_hash,
        "remoteHash": remote_manifest_hash,
        "localManifestHash": local_manifest_hash,
        "remoteManifestHash": remote_manifest_hash,
        "localIndexHash": local_index_hash,
        "remoteIndexHash": remote_index_hash,
        "identityFile": WEB_IDENTITY_FILE,
        "indexFile": WEB_INDEX_FILE,
        "version": build.get("version"),
        "manifestHash": build.get("manifestHash"),
    }

def wait_for_web_ready(timeout=STARTUP_TIMEOUT):
    deadline = time.time() + timeout
    last = {"ok": False, "state": "STOPPED", "reason": "NOT_CHECKED"}
    while time.time() < deadline:
        last = web_server_identity()
        if last.get("ok"):
            return True, last
        time.sleep(0.35)
    last = web_server_identity()
    return bool(last.get("ok")), last


def gateway_expected_version():
    try:
        payload = json.loads(GATEWAY_PACKAGE_FILE.read_text(encoding="utf-8"))
        version = str(payload.get("version", "")).strip()
        return version or None
    except (OSError, ValueError, json.JSONDecodeError):
        return None


def gateway_health():
    if not port_open(GATEWAY_PORT):
        return {"ok": False, "state": "STOPPED", "reason": "PORT_CLOSED"}

    expected_version = gateway_expected_version()
    if not expected_version:
        return {
            "ok": False,
            "state": "INVALID",
            "reason": "LOCAL_GATEWAY_VERSION_UNRESOLVED",
        }

    try:
        request = urllib.request.Request(
            GATEWAY_HEALTH_URL,
            headers={"Accept": "application/json"},
            method="GET",
        )
        with urllib.request.urlopen(request, timeout=0.8) as response:
            if response.status != 200:
                return {
                    "ok": False,
                    "state": "INVALID",
                    "reason": f"HTTP_{response.status}",
                }
            payload = json.loads(response.read().decode("utf-8"))
    except (OSError, urllib.error.URLError, ValueError, json.JSONDecodeError) as exc:
        return {
            "ok": False,
            "state": "INVALID",
            "reason": type(exc).__name__,
        }

    checks = {
        "componentId": payload.get("componentId") == GATEWAY_EXPECTED_COMPONENT,
        "gatewayAvailable": payload.get("gatewayAvailable") is True,
        "runtimeState": payload.get("runtimeState") == "READY",
        "loopbackOnly": payload.get("loopbackOnly") is True,
        "gatewayVersion": payload.get("gatewayVersion") == expected_version,
    }
    ok = all(checks.values())
    return {
        "ok": ok,
        "state": "READY" if ok else "INVALID",
        "reason": "PASS" if ok else "HEALTH_CONTRACT_MISMATCH",
        "payload": payload,
        "checks": checks,
        "expectedGatewayVersion": expected_version,
    }


def wait_for_gateway_ready(timeout=STARTUP_TIMEOUT):
    deadline = time.time() + timeout
    last = {"ok": False, "state": "STOPPED", "reason": "NOT_CHECKED"}
    while time.time() < deadline:
        last = gateway_health()
        if last.get("ok"):
            return True, last
        time.sleep(0.35)
    last = gateway_health()
    return bool(last.get("ok")), last


def pid_running(pid):
    if not pid:
        return False
    try:
        result = subprocess.run(
            ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
            capture_output=True,
            text=True,
            creationflags=CREATE_NO_WINDOW,
        )
        return str(pid) in result.stdout
    except Exception:
        return False


def kill_process_tree(pid):
    if not pid or not pid_running(pid):
        return False
    result = subprocess.run(
        ["taskkill", "/PID", str(pid), "/T", "/F"],
        capture_output=True,
        text=True,
        creationflags=CREATE_NO_WINDOW,
    )
    return result.returncode == 0


def cleanup_stale_state():
    state = load_state()
    changed = False

    for key in ("web_pid", "gateway_pid"):
        pid = state.get(key)
        if pid and not pid_running(pid):
            state.pop(key, None)
            changed = True

    if changed:
        save_state(state)

    return state


def start_console(title, command, cwd):
    full_command = f'title {title} && {command}'
    return subprocess.Popen(
        ["cmd.exe", "/k", full_command],
        cwd=str(cwd),
        creationflags=CREATE_NEW_CONSOLE,
    )


def start_web_server():
    state = cleanup_stale_state()

    if port_open(WEB_PORT):
        identity = web_server_identity()
        if identity.get("ok"):
            log("Web Server already available for current Project Root; duplicate start skipped")
            return "already"
        raise RuntimeError(
            "port 8000 は使用中ですが、現在のAI Prompt OS Projectと一致しません。\n"
            f"Current Project: {PROJECT_ROOT}\n"
            f"Reason: {identity.get('reason', 'UNKNOWN')}\n\n"
            "旧版または別フォルダのWeb Serverを停止してから再実行してください。"
        )

    if not PROJECT_ROOT.exists():
        raise FileNotFoundError(f"Project folder not found:\n{PROJECT_ROOT}")

    proc = start_console(
        "AI Prompt OS Web Server",
        "py -m http.server 8000",
        PROJECT_ROOT,
    )
    state["web_pid"] = proc.pid
    state["project_root"] = str(PROJECT_ROOT)
    save_state(state)
    log(f"Web Server started PID={proc.pid} PROJECT_ROOT={PROJECT_ROOT}")
    return "started"


def start_gateway():
    state = cleanup_stale_state()

    if port_open(GATEWAY_PORT):
        health = gateway_health()
        if health.get("ok"):
            log("Canonical Gateway already available; duplicate start skipped")
            return "already"
        raise RuntimeError(
            "port 43110 は使用中ですが、EXTERNAL-010 Canonical Gatewayとして検証できません。\n"
            f"Reason: {health.get('reason', 'UNKNOWN')}"
        )

    if not GATEWAY_BAT.exists():
        raise FileNotFoundError(
            "Canonical Gateway launcher not found:\n"
            f"{GATEWAY_BAT}\n\n"
            "同じAI Prompt OS配布ZIP内の external_gateway フォルダも反映してください。"
        )

    proc = start_console(
        "AI Prompt OS Canonical External Gateway",
        "call start_external_gateway.bat",
        GATEWAY_DIR,
    )
    state["gateway_pid"] = proc.pid
    state["project_root"] = str(PROJECT_ROOT)
    save_state(state)
    log(f"Canonical Gateway launcher started PID={proc.pid}")
    return "started"


def wait_for_ports(required_ports, timeout=STARTUP_TIMEOUT):
    deadline = time.time() + timeout
    while time.time() < deadline:
        if all(port_open(p) for p in required_ports):
            return True
        time.sleep(0.35)
    return all(port_open(p) for p in required_ports)


def owned_state():
    state = cleanup_stale_state()
    same_project = state_matches_project(state)
    return {
        "web_owned": bool(
            same_project and state.get("web_pid") and pid_running(state.get("web_pid"))
        ),
        "gateway_owned": bool(
            same_project and state.get("gateway_pid") and pid_running(state.get("gateway_pid"))
        ),
    }


def stop_web_server():
    state = cleanup_stale_state()
    pid = state.get("web_pid")

    if pid and pid_running(pid) and state_matches_project(state):
        log(f"Stopping Web Server PID={pid}")
        ok = kill_process_tree(pid)
        state.pop("web_pid", None)
        save_state(state)
        time.sleep(0.4)
        return "stopped" if ok else "failed"

    if port_open(WEB_PORT):
        return "external"

    state.pop("web_pid", None)
    save_state(state)
    return "already"


def stop_gateway():
    state = cleanup_stale_state()
    pid = state.get("gateway_pid")

    if pid and pid_running(pid) and state_matches_project(state):
        log(f"Stopping Canonical Gateway PID={pid}")
        ok = kill_process_tree(pid)
        state.pop("gateway_pid", None)
        save_state(state)
        time.sleep(0.6)
        return "stopped" if ok else "failed"

    if port_open(GATEWAY_PORT):
        return "external"

    state.pop("gateway_pid", None)
    save_state(state)
    return "already"


class LauncherApp:
    def __init__(self, root):
        self.root = root
        self.root.title("AI Prompt OS Launcher")

        self.status_text = tk.StringVar(value="起動モードを選択してください")
        self.web_text = tk.StringVar()
        self.gateway_text = tk.StringVar()
        self.last_web_identity = None
        self.last_gateway_health = None

        self.setup_style()
        self.build_ui()
        # Launcher open: perform one explicit deep identity / health check.
        self.refresh_status(deep_check=True)
        self.fit_window_to_content()
        self.schedule_refresh()

    def setup_style(self):
        style = ttk.Style()
        try:
            style.theme_use("vista")
        except Exception:
            pass

        style.configure("Title.TLabel", font=("Yu Gothic UI", 22, "bold"))
        style.configure("SubTitle.TLabel", font=("Yu Gothic UI", 11))
        style.configure("Group.TLabelframe.Label", font=("Yu Gothic UI", 11, "bold"))
        style.configure("Status.TLabel", font=("Consolas", 10))
        style.configure("Hint.TLabel", font=("Yu Gothic UI", 9))
        style.configure("Action.TButton", font=("Yu Gothic UI", 11, "bold"), padding=(10, 10))
        style.configure("Small.TButton", font=("Yu Gothic UI", 10), padding=(8, 8))
        style.configure("StatusMessage.TLabel", font=("Yu Gothic UI", 10, "bold"))

    def build_ui(self):
        self.root.geometry(f"{BASE_WIDTH}x{BASE_HEIGHT}")
        self.root.minsize(840, 520)
        self.root.resizable(True, True)

        self.main = ttk.Frame(self.root, padding=(20, 18, 20, 16))
        self.main.pack(fill="both", expand=True)
        self.main.columnconfigure(0, weight=1)

        header = ttk.Frame(self.main)
        header.grid(row=0, column=0, sticky="ew")
        header.columnconfigure(0, weight=1)

        ttk.Label(
            header,
            text="AIプロンプト生成Pro v7.0.0",
            style="Title.TLabel",
            anchor="center",
        ).grid(row=0, column=0, sticky="ew", pady=(0, 4))

        ttk.Label(
            header,
            text="AI Prompt OS Launcher v1.4.4 / Canonical Gateway",
            style="SubTitle.TLabel",
            anchor="center",
        ).grid(row=1, column=0, sticky="ew", pady=(0, 12))

        mode_frame = ttk.LabelFrame(
            self.main,
            text="起動モード",
            padding=(16, 16, 16, 12),
            style="Group.TLabelframe",
        )
        mode_frame.grid(row=1, column=0, sticky="ew", pady=(0, 14))
        mode_frame.columnconfigure(0, weight=1)
        mode_frame.columnconfigure(1, weight=1)

        normal_card = ttk.Frame(mode_frame, padding=(8, 4, 8, 4))
        normal_card.grid(row=0, column=0, sticky="nsew", padx=(0, 10))
        normal_card.columnconfigure(0, weight=1)

        self.normal_button = ttk.Button(
            normal_card,
            text="通常起動\nWeb Serverのみ",
            style="Action.TButton",
            command=self.normal_start,
        )
        self.normal_button.grid(row=0, column=0, sticky="ew")

        ttk.Label(
            normal_card,
            text="通常利用・編集・ローカル操作",
            style="Hint.TLabel",
            anchor="center",
        ).grid(row=1, column=0, sticky="ew", pady=(8, 0))

        external_card = ttk.Frame(mode_frame, padding=(8, 4, 8, 4))
        external_card.grid(row=0, column=1, sticky="nsew", padx=(10, 0))
        external_card.columnconfigure(0, weight=1)

        self.external_button = ttk.Button(
            external_card,
            text="External Gateway付き起動\nWeb + Canonical Gateway",
            style="Action.TButton",
            command=self.external_start,
        )
        self.external_button.grid(row=0, column=0, sticky="ew")

        ttk.Label(
            external_card,
            text="通常の外部API / External Intelligence用",
            style="Hint.TLabel",
            anchor="center",
        ).grid(row=1, column=0, sticky="ew", pady=(8, 0))

        runtime_frame = ttk.LabelFrame(
            self.main,
            text="Runtime状態",
            padding=(16, 14, 16, 12),
            style="Group.TLabelframe",
        )
        runtime_frame.grid(row=2, column=0, sticky="ew", pady=(0, 10))
        runtime_frame.columnconfigure(0, weight=1)

        ttk.Label(
            runtime_frame,
            textvariable=self.web_text,
            style="Status.TLabel",
        ).grid(row=0, column=0, sticky="w", pady=3)

        ttk.Label(
            runtime_frame,
            textvariable=self.gateway_text,
            style="Status.TLabel",
        ).grid(row=1, column=0, sticky="w", pady=3)

        ttk.Label(
            self.main,
            textvariable=self.status_text,
            style="StatusMessage.TLabel",
            anchor="center",
        ).grid(row=3, column=0, sticky="ew", pady=(6, 12))

        stop_frame = ttk.LabelFrame(
            self.main,
            text="停止操作",
            padding=(16, 14, 16, 12),
            style="Group.TLabelframe",
        )
        stop_frame.grid(row=4, column=0, sticky="ew", pady=(0, 12))
        for i in range(3):
            stop_frame.columnconfigure(i, weight=1)

        ttk.Button(
            stop_frame,
            text="Web Server停止",
            style="Small.TButton",
            command=self.stop_web,
        ).grid(row=0, column=0, sticky="ew", padx=(0, 8))

        ttk.Button(
            stop_frame,
            text="Gateway停止",
            style="Small.TButton",
            command=self.stop_gateway_ui,
        ).grid(row=0, column=1, sticky="ew", padx=8)

        ttk.Button(
            stop_frame,
            text="すべて終了",
            style="Small.TButton",
            command=self.stop_all_and_exit,
        ).grid(row=0, column=2, sticky="ew", padx=(8, 0))

        utility_frame = ttk.Frame(self.main)
        utility_frame.grid(row=5, column=0, sticky="ew", pady=(0, 10))
        for i in range(3):
            utility_frame.columnconfigure(i, weight=1)

        ttk.Button(
            utility_frame,
            text="ブラウザを開く",
            style="Small.TButton",
            command=open_application_browser,
        ).grid(row=0, column=0, sticky="ew", padx=(0, 8))

        ttk.Button(
            utility_frame,
            text="状態更新",
            style="Small.TButton",
            command=lambda: self.refresh_status(deep_check=True),
        ).grid(row=0, column=1, sticky="ew", padx=8)

        ttk.Button(
            utility_frame,
            text="ランチャーだけ閉じる",
            style="Small.TButton",
            command=self.root.destroy,
        ).grid(row=0, column=2, sticky="ew", padx=(8, 0))

        footer_text = (
            "※ Canonical Gatewayは通常運用用です。Phase 06検証Fixtureは起動しません。\n"
            "※ Phase 06 PC Real Runtime検証時は external_gateway\\start_phase6_pc_runtime.bat を使用します。"
        )

        ttk.Label(
            self.main,
            text=footer_text,
            style="Hint.TLabel",
            justify="left",
            anchor="w",
        ).grid(row=6, column=0, sticky="ew", pady=(2, 0))

    def fit_window_to_content(self):
        self.root.update_idletasks()

        req_w = self.root.winfo_reqwidth()
        req_h = self.root.winfo_reqheight()

        target_w = max(BASE_WIDTH, req_w + 20)
        target_h = max(BASE_HEIGHT, req_h + 20)

        ratio_w = int(math.ceil(target_h * PHI))
        ratio_h = int(math.ceil(target_w / PHI))

        if ratio_w >= target_w:
            target_w = ratio_w
        else:
            target_h = max(target_h, ratio_h)

        screen_w = self.root.winfo_screenwidth()
        screen_h = self.root.winfo_screenheight()

        max_w = max(800, screen_w - 80)
        max_h = max(520, screen_h - 120)

        target_w = min(target_w, max_w)
        target_h = min(target_h, max_h)

        target_w = max(target_w, min(req_w + 20, max_w))
        target_h = max(target_h, min(req_h + 20, max_h))

        x = max((screen_w - target_w) // 2, 10)
        y = max((screen_h - target_h) // 2, 10)

        self.root.geometry(f"{target_w}x{target_h}+{x}+{y}")

    def schedule_refresh(self):
        # Lightweight refresh only: port / owned-process state.
        # Do not poll manifest or Gateway health every 2 seconds.
        self.refresh_status(deep_check=False)
        self.root.after(2000, self.schedule_refresh)

    def refresh_status(self, deep_check=False):
        ownership = owned_state()

        web_ok = port_open(WEB_PORT)
        gateway_ok = port_open(GATEWAY_PORT)

        if web_ok:
            source = "Launcher" if ownership["web_owned"] else "External"
            if deep_check:
                self.last_web_identity = web_server_identity()

            identity = self.last_web_identity
            if identity is None:
                self.web_text.set(
                    f"Web Server : LISTENING port {WEB_PORT}   [{source} / Identity not checked]"
                )
            elif identity.get("ok"):
                self.web_text.set(
                    f"Web Server : READY    port {WEB_PORT}   [{source} / Project+Index MATCH]"
                )
            else:
                self.web_text.set(
                    f"Web Server : MISMATCH port {WEB_PORT}   [{source}] "
                    f"({identity.get('reason', 'UNKNOWN')})"
                )
        else:
            self.last_web_identity = None
            self.web_text.set(f"Web Server : STOPPED  port {WEB_PORT}")

        if gateway_ok:
            source = "Launcher" if ownership["gateway_owned"] else "External"
            if deep_check:
                self.last_gateway_health = gateway_health()

            health = self.last_gateway_health
            if health is None:
                self.gateway_text.set(
                    f"Gateway    : LISTENING port {GATEWAY_PORT}  [{source} / Health not checked]"
                )
            elif health.get("ok"):
                self.gateway_text.set(f"Gateway    : READY    port {GATEWAY_PORT}  [{source}]")
            else:
                self.gateway_text.set(
                    f"Gateway    : INVALID  port {GATEWAY_PORT}  [{source}] "
                    f"({health.get('reason', 'UNKNOWN')})"
                )
        else:
            self.last_gateway_health = None
            self.gateway_text.set(f"Gateway    : STOPPED  port {GATEWAY_PORT}")

    def set_busy(self, busy=True):
        state = "disabled" if busy else "normal"
        self.normal_button.config(state=state)
        self.external_button.config(state=state)

    def normal_start(self):
        self.set_busy(True)
        self.status_text.set("通常モードを起動中...")

        def worker():
            try:
                start_web_server()

                web_ready, web_detail = wait_for_web_ready()
                if not web_ready:
                    raise RuntimeError(
                        "Web Serverが現在のProject RootとしてREADYになりませんでした。\n"
                        f"Reason: {web_detail.get('reason', 'UNKNOWN')}"
                    )

                self.last_web_identity = web_detail
                self.root.after(0, lambda: self.refresh_status(deep_check=False))
                self.root.after(0, lambda: self.status_text.set("通常モード READY"))
                self.root.after(0, open_application_browser)

            except Exception as exc:
                log(f"Normal start error: {exc!r}")
                self.root.after(0, lambda: messagebox.showerror("起動エラー", str(exc)))
                self.root.after(0, lambda: self.status_text.set("通常モード起動 FAIL"))
            finally:
                self.root.after(0, lambda: self.set_busy(False))
                self.root.after(0, lambda: self.refresh_status(deep_check=False))

        threading.Thread(target=worker, daemon=True).start()

    def external_start(self):
        self.set_busy(True)
        self.status_text.set("Canonical Gateway付きモードを起動中...")

        def worker():
            try:
                start_web_server()
                start_gateway()

                web_ready, web_detail = wait_for_web_ready()
                gateway_ready, gateway_detail = wait_for_gateway_ready()

                if not web_ready or not gateway_ready:
                    details = (
                        f"Web Server 8000 : {'READY' if web_ready else 'NG'}\n"
                        f"Web Project     : {web_detail.get('reason', 'UNKNOWN')}\n"
                        f"Gateway 43110   : {'READY' if gateway_ready else 'NG'}\n"
                        f"Gateway Health  : {gateway_detail.get('reason', 'UNKNOWN')}"
                    )
                    raise RuntimeError(
                        "時間内にRuntimeのREADYを確認できませんでした。\n\n"
                        + details
                        + "\n\n黒いConsole画面のエラーを確認してください。"
                    )

                self.last_web_identity = web_detail
                self.last_gateway_health = gateway_detail
                self.root.after(0, lambda: self.refresh_status(deep_check=False))
                self.root.after(0, lambda: self.status_text.set("Canonical Gateway付きモード READY"))
                self.root.after(0, open_application_browser)

            except Exception as exc:
                log(f"External start error: {exc!r}")
                self.root.after(0, lambda: messagebox.showerror("起動エラー", str(exc)))
                self.root.after(0, lambda: self.status_text.set("Canonical Gateway起動 FAIL"))
            finally:
                self.root.after(0, lambda: self.set_busy(False))
                self.root.after(0, lambda: self.refresh_status(deep_check=False))

        threading.Thread(target=worker, daemon=True).start()

    def stop_web(self):
        result = stop_web_server()

        if result == "external":
            messagebox.showinfo(
                "Web Server停止",
                "Web Serverはこのランチャー以外から起動されています。\n"
                "誤停止防止のため自動終了しません。",
            )
        elif result == "failed":
            messagebox.showwarning("Web Server停止", "Web Serverの終了処理に失敗しました。")

        self.status_text.set("Web Server停止処理を実行しました")
        self.refresh_status()

    def stop_gateway_ui(self):
        result = stop_gateway()

        if result == "external":
            messagebox.showinfo(
                "Gateway停止",
                "Gatewayはこのランチャー以外から起動されています。\n"
                "誤停止防止のため自動終了しません。",
            )
        elif result == "failed":
            messagebox.showwarning("Gateway停止", "Gatewayの終了処理に失敗しました。")

        self.status_text.set("Gateway停止処理を実行しました")
        self.refresh_status()

    def stop_all_and_exit(self):
        if not messagebox.askyesno(
            "すべて終了",
            "このランチャーが起動したWeb ServerとGatewayを停止して、\n"
            "ランチャーも終了しますか？",
        ):
            return

        web_result = stop_web_server()
        gateway_result = stop_gateway()

        external_messages = []
        if web_result == "external":
            external_messages.append("Web Server")
        if gateway_result == "external":
            external_messages.append("Gateway")

        if external_messages:
            messagebox.showinfo(
                "外部起動Runtime",
                "次のRuntimeは別途起動されているため停止していません:\n\n"
                + "\n".join(external_messages),
            )

        self.root.destroy()


def main():
    ensure_state_dir()
    log(f"Launcher v1.4.4 opened PROJECT_ROOT={PROJECT_ROOT}")
    root = tk.Tk()
    app = LauncherApp(root)
    root.after(150, app.fit_window_to_content)
    root.mainloop()


if __name__ == "__main__":
    main()
