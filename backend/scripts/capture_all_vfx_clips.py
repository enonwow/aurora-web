import argparse
import ctypes
import csv
import json
import os
import re
import subprocess
import time
from pathlib import Path

import cv2
import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_ROOT = REPO_ROOT / "backend" / "docs" / "aurora-reverse" / "artifacts" / "vfx-catalog-lab-map"
GENERATED_SCRIPTS_DIR = ARTIFACT_ROOT / "generated-scripts"
COMPILED_SCRIPTS_DIR = ARTIFACT_ROOT / "compiled-scripts"
SEQUENCES_JSON = ARTIFACT_ROOT / "vfx-capture-sequences.json"
CLIPS_CSV = ARTIFACT_ROOT / "vfx-capture-clips.csv"
DEFAULT_OUTPUT_DIR = REPO_ROOT / ".codex-tmp" / "aurora-live-evidence" / "vfx-capture-clips" / "all-v2"
OUTPUT_DIR = DEFAULT_OUTPUT_DIR
LOG_PATH = OUTPUT_DIR / "capture-all.log"
PROGRESS_PATH = OUTPUT_DIR / "capture-progress.json"

NWN_EXE = Path(r"C:\Program Files (x86)\Steam\steamapps\common\Neverwinter Nights\bin\win32\nwmain.exe")
NWN_USER_DIR = Path.home() / "Documents" / "Neverwinter Nights"
NWN_SETTINGS_PATH = NWN_USER_DIR / "settings.tml"
NWN_CAPTURE_SETTINGS_BACKUP = NWN_USER_DIR / "settings.tml.codex-vfx-capture.bak"
SCRIPT_COMPILER = Path(r"C:\Projects\Claude\Radoub\Trebuchet\Trebuchet\tools\nwn_script_comp.exe")
SCRIPT_COMPILER_DLL_DIR = Path(
    r"C:\Projects\ai-documentations\nwn-repo-audit\repo-audit\niv__neverwinter.nim\dist\pkg-x86_64-windows"
)
MODULE_NAME = os.environ.get("VFX_LAB_MODULE_NAME", "tlc_vfx_catalog_lab")
AUTOSTART_DELAY_SECONDS = 30.0
LOAD_SETTLE_SECONDS = 3.0
MIN_SETTLED_BEFORE_SEQUENCE_SECONDS = 2.0
FIRST_EFFECT_DELAY_SECONDS = 1.0
PRE_PAD_SECONDS = 0.35
POST_PAD_SECONDS = 0.35
FPS = 8.0
STAGE_CROP = (360, 70, 1700, 870)
MODE_CROPS = {
    "object_turntable": (360, 70, 1700, 870),
    "object_instant": (360, 70, 1700, 870),
    "object_head_closeup": (520, 40, 1400, 790),
    "object_node_closeup": (760, 200, 1160, 700),
    "object_impact_closeup": (650, 130, 1320, 800),
    "beam_two_targets": (240, 60, 1800, 870),
    "location_area": (300, 60, 1760, 870),
    "large_scene": (180, 40, 1860, 870),
}
MIN_MEDIA_BYTES = 8192
MIN_PNG_BYTES = 1024
MIN_JSON_BYTES = 128
NWN_GAME_TITLE = "Neverwinter Nights"
NWN_TOOLSET_TITLE_FRAGMENT = "Toolset"


user32 = ctypes.windll.user32
gdi32 = ctypes.windll.gdi32
EnumWindows = user32.EnumWindows
IsWindowVisible = user32.IsWindowVisible
GetWindowTextLengthW = user32.GetWindowTextLengthW
GetWindowTextW = user32.GetWindowTextW
GetWindowThreadProcessId = user32.GetWindowThreadProcessId
GetWindowRect = user32.GetWindowRect
EnumDisplayMonitors = user32.EnumDisplayMonitors
GetMonitorInfoW = user32.GetMonitorInfoW
SetWindowPos = user32.SetWindowPos
SetForegroundWindow = user32.SetForegroundWindow
ShowWindow = user32.ShowWindow
PostMessageW = user32.PostMessageW
PrintWindow = user32.PrintWindow
GetWindowDC = user32.GetWindowDC
ReleaseDC = user32.ReleaseDC
CreateCompatibleDC = gdi32.CreateCompatibleDC
CreateCompatibleBitmap = gdi32.CreateCompatibleBitmap
SelectObject = gdi32.SelectObject
DeleteObject = gdi32.DeleteObject
DeleteDC = gdi32.DeleteDC
GetDIBits = gdi32.GetDIBits
WM_CLOSE = 0x0010
SW_RESTORE = 9
SWP_NOZORDER = 0x0004
SWP_NOACTIVATE = 0x0010
SWP_SHOWWINDOW = 0x0040


class RECT(ctypes.Structure):
    _fields_ = [
        ("left", ctypes.c_long),
        ("top", ctypes.c_long),
        ("right", ctypes.c_long),
        ("bottom", ctypes.c_long),
    ]


class MONITORINFO(ctypes.Structure):
    _fields_ = [
        ("cbSize", ctypes.c_ulong),
        ("rcMonitor", RECT),
        ("rcWork", RECT),
        ("dwFlags", ctypes.c_ulong),
    ]


class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [
        ("biSize", ctypes.c_uint32),
        ("biWidth", ctypes.c_int32),
        ("biHeight", ctypes.c_int32),
        ("biPlanes", ctypes.c_uint16),
        ("biBitCount", ctypes.c_uint16),
        ("biCompression", ctypes.c_uint32),
        ("biSizeImage", ctypes.c_uint32),
        ("biXPelsPerMeter", ctypes.c_int32),
        ("biYPelsPerMeter", ctypes.c_int32),
        ("biClrUsed", ctypes.c_uint32),
        ("biClrImportant", ctypes.c_uint32),
    ]


class BITMAPINFO(ctypes.Structure):
    _fields_ = [("bmiHeader", BITMAPINFOHEADER), ("bmiColors", ctypes.c_uint32 * 3)]


def log(message):
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    line = f"{time.strftime('%Y-%m-%d %H:%M:%S')} {message}"
    print(line, flush=True)
    with LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(line + "\n")


def configure_output_dir(path):
    global OUTPUT_DIR, LOG_PATH, PROGRESS_PATH
    OUTPUT_DIR = Path(path)
    LOG_PATH = OUTPUT_DIR / "capture-all.log"
    PROGRESS_PATH = OUTPUT_DIR / "capture-progress.json"


def read_window_title(hwnd):
    length = GetWindowTextLengthW(hwnd)
    if length <= 0:
        return ""
    buffer = ctypes.create_unicode_buffer(length + 1)
    GetWindowTextW(hwnd, buffer, length + 1)
    return buffer.value


def enumerate_nwn_windows(pid=None):
    windows = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p)
    def callback(hwnd, _):
        if not IsWindowVisible(hwnd):
            return True
        title = read_window_title(hwnd)
        if NWN_GAME_TITLE not in title or NWN_TOOLSET_TITLE_FRAGMENT in title:
            return True
        got_pid = ctypes.c_ulong()
        GetWindowThreadProcessId(hwnd, ctypes.byref(got_pid))
        if pid is None or got_pid.value == pid:
            rect = RECT()
            GetWindowRect(hwnd, ctypes.byref(rect))
            windows.append(
                {
                    "hwnd": hwnd,
                    "pid": got_pid.value,
                    "title": title,
                    "rect": [rect.left, rect.top, rect.right, rect.bottom],
                }
            )
        return True

    EnumWindows(callback, 0)
    return windows


def monitor_work_area(preferred):
    monitors = []

    @ctypes.WINFUNCTYPE(ctypes.c_bool, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p)
    def callback(hmonitor, _hdc, _rect, _data):
        info = MONITORINFO()
        info.cbSize = ctypes.sizeof(MONITORINFO)
        if GetMonitorInfoW(hmonitor, ctypes.byref(info)):
            monitors.append(
                {
                    "primary": bool(info.dwFlags & 1),
                    "left": info.rcWork.left,
                    "top": info.rcWork.top,
                    "right": info.rcWork.right,
                    "bottom": info.rcWork.bottom,
                }
            )
        return True

    EnumDisplayMonitors(0, 0, callback, 0)
    if preferred == "primary":
        for monitor in monitors:
            if monitor["primary"]:
                return monitor
        return monitors[0] if monitors else None
    if preferred == "secondary":
        for monitor in monitors:
            if not monitor["primary"]:
                return monitor
        return None
    return None


def secondary_monitor_work_area():
    return monitor_work_area("secondary")


def move_window_to_monitor(hwnd, placement, activate=True):
    if placement == "none":
        return None
    monitor = monitor_work_area(placement)
    if monitor is None:
        return None

    width = monitor["right"] - monitor["left"]
    height = monitor["bottom"] - monitor["top"]
    ShowWindow(hwnd, SW_RESTORE)
    SetWindowPos(
        hwnd,
        0,
        monitor["left"],
        monitor["top"],
        width,
        height,
        SWP_NOZORDER | (0 if activate else SWP_NOACTIVATE) | SWP_SHOWWINDOW,
    )
    if activate:
        SetForegroundWindow(hwnd)
    monitor["placement"] = placement
    return monitor


def move_window_to_secondary_monitor(hwnd):
    return move_window_to_monitor(hwnd, "secondary")


def close_existing_nwn():
    for window in enumerate_nwn_windows():
        PostMessageW(window["hwnd"], WM_CLOSE, 0, 0)
    time.sleep(1.5)
    for window in enumerate_nwn_windows():
        subprocess.run(
            ["powershell", "-NoProfile", "-Command", f"Stop-Process -Id {window['pid']} -Force"],
            capture_output=True,
            text=True,
            timeout=10,
        )


def list_active_nwn_processes():
    result = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-Command",
            (
                "Get-CimInstance Win32_Process -Filter \"Name='nwmain.exe'\" | "
                "Select-Object ProcessId,ParentProcessId,CreationDate,CommandLine | "
                "ConvertTo-Json -Compress"
            ),
        ],
        capture_output=True,
        text=True,
        timeout=10,
    )
    if result.returncode != 0:
        raise RuntimeError(
            "Cannot verify NWN runtime slot; refusing to launch.\n"
            f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
    output = result.stdout.strip()
    if not output:
        return []
    parsed = json.loads(output)
    return parsed if isinstance(parsed, list) else [parsed]


def assert_nwn_runtime_slot_free(context):
    processes = list_active_nwn_processes()
    if not processes:
        return
    details = "; ".join(
        f"PID {process.get('ProcessId')}: {process.get('CommandLine')}" for process in processes
    )
    raise RuntimeError(f"NWN runtime slot is busy before {context}; not launching second NWN. Active: {details}")


def restore_capture_settings_backup():
    if not NWN_CAPTURE_SETTINGS_BACKUP.exists():
        return False
    if NWN_SETTINGS_PATH.exists():
        NWN_SETTINGS_PATH.write_bytes(NWN_CAPTURE_SETTINGS_BACKUP.read_bytes())
    NWN_CAPTURE_SETTINGS_BACKUP.unlink()
    log(f"restored NWN settings from {NWN_CAPTURE_SETTINGS_BACKUP}")
    return True


def replace_tml_setting(text, section, key, value):
    pattern = rf"(\[{re.escape(section)}\]\s*\r?\n\s*{re.escape(key)}\s*=\s*)([^\r\n]+)"
    next_text, count = re.subn(pattern, rf"\g<1>{value}", text, count=1)
    return next_text, count


def prepare_capture_settings():
    restore_capture_settings_backup()
    if not NWN_SETTINGS_PATH.exists():
        log(f"capture settings skipped: missing {NWN_SETTINGS_PATH}")
        return False

    original = NWN_SETTINGS_PATH.read_text(encoding="utf-8")
    patched = original
    replacements = [
        ("game.auto-pause.on-focus-loss", "enabled", "false"),
        ("graphics.window.windowed.position", "x", "-1911"),
        ("graphics.window.windowed.position", "y", "32"),
        ("server.log.debug-mode-sends-to-players", "enabled", "false"),
        ("ui.chat.pane.primary", "height", "0.00000000000000000"),
        ("ui.chat.pane.secondary", "height", "0.00000000000000000"),
    ]
    applied = []
    for section, key, value in replacements:
        patched, count = replace_tml_setting(patched, section, key, value)
        if count:
            applied.append(f"{section}.{key}={value}")

    if patched == original:
        log("capture settings unchanged: chat/debug settings were already capture-clean")
        return False

    NWN_CAPTURE_SETTINGS_BACKUP.write_text(original, encoding="utf-8")
    NWN_SETTINGS_PATH.write_text(patched, encoding="utf-8")
    log("capture settings applied: " + ", ".join(applied))
    return True


def capture_window(hwnd):
    rect = RECT()
    GetWindowRect(hwnd, ctypes.byref(rect))
    width = rect.right - rect.left
    height = rect.bottom - rect.top
    hdc = GetWindowDC(hwnd)
    mem = CreateCompatibleDC(hdc)
    bitmap = CreateCompatibleBitmap(hdc, width, height)
    old = SelectObject(mem, bitmap)
    ok = PrintWindow(hwnd, mem, 2) or PrintWindow(hwnd, mem, 0)
    info = BITMAPINFO()
    info.bmiHeader.biSize = ctypes.sizeof(BITMAPINFOHEADER)
    info.bmiHeader.biWidth = width
    info.bmiHeader.biHeight = -height
    info.bmiHeader.biPlanes = 1
    info.bmiHeader.biBitCount = 32
    info.bmiHeader.biCompression = 0
    buffer = (ctypes.c_ubyte * (width * height * 4))()
    GetDIBits(mem, bitmap, 0, height, buffer, ctypes.byref(info), 0)
    array = np.frombuffer(buffer, dtype=np.uint8).reshape((height, width, 4)).copy()[:, :, :3]
    SelectObject(mem, old)
    DeleteObject(bitmap)
    DeleteDC(mem)
    ReleaseDC(hwnd, hdc)
    if not ok:
        raise RuntimeError("PrintWindow failed")
    return array


def capture_window_with_retry(hwnd, attempts=8, delay_seconds=0.2):
    last_error = None
    for attempt in range(1, attempts + 1):
        try:
            if attempt > 1:
                ShowWindow(hwnd, SW_RESTORE)
            return capture_window(hwnd)
        except RuntimeError as error:
            last_error = error
            if attempt < attempts:
                time.sleep(delay_seconds)
    raise last_error


def crop_stage(frame, capture_mode=None):
    height, width = frame.shape[:2]
    x1, y1, x2, y2 = MODE_CROPS.get(capture_mode or "object_turntable", STAGE_CROP)
    return frame[max(0, y1) : min(height, y2), max(0, x1) : min(width, x2)]


def is_gameplay_frame(frame):
    crop = crop_stage(frame)
    if crop.size == 0:
        return False
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    pixels = rgb.reshape(-1, 3)
    mean = pixels.mean(axis=0)
    std = float(pixels.std(axis=0).mean())
    brown_score = float(mean[0] + mean[1] - mean[2])
    brightness = float(mean.mean())
    red_menu_like = mean[0] > mean[1] * 1.35 and mean[0] > mean[2] * 1.35 and mean[0] - mean[1] > 18
    if red_menu_like:
        return False
    return brightness > 18 and std > 20 and brown_score > 25


def run_command(command, cwd=REPO_ROOT, extra_env=None):
    env = os.environ.copy()
    if extra_env:
        env.update(extra_env)
    result = subprocess.run(command, cwd=cwd, env=env, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(
            f"Command failed ({result.returncode}): {' '.join(map(str, command))}\n"
            f"STDOUT:\n{result.stdout}\nSTDERR:\n{result.stderr}"
        )
    return result


def write_autostart_script(script_name):
    source = (
        '#include "vfxlab_inc"\n\n'
        "void main()\n"
        "{\n"
        "    object oEntering = GetEnteringObject();\n"
        "    if (!GetIsPC(oEntering))\n"
        "    {\n"
        "        return;\n"
        "    }\n\n"
        f'    DelayCommand({AUTOSTART_DELAY_SECONDS:.1f}, ExecuteScript("{script_name}", OBJECT_SELF));\n'
        "}\n"
    )
    path = GENERATED_SCRIPTS_DIR / "vfxlab_area.nss"
    path.write_text(source, encoding="utf-8")


def compile_and_inject_autostart():
    env = {"PATH": str(SCRIPT_COMPILER_DLL_DIR) + os.pathsep + os.environ.get("PATH", "")}
    for script_name in ["vfxlab_area", "vfxdemo82"]:
        src = GENERATED_SCRIPTS_DIR / f"{script_name}.nss"
        if not src.exists():
            continue
        out = COMPILED_SCRIPTS_DIR / f"{script_name}.ncs"
        run_command(
            [
                str(SCRIPT_COMPILER),
                "--userdirectory",
                str(Path.home() / "Documents" / "Neverwinter Nights"),
                "--dirs",
                str(GENERATED_SCRIPTS_DIR),
                "-o",
                str(out),
                str(src),
            ],
            extra_env=env,
        )
    run_command(
        ["node", "backend/scripts/inject-vfx-catalog-lab-area-map.mjs"],
        extra_env={"VFX_LAB_MODULE_FILE": f"{MODULE_NAME}.mod"},
    )


def load_sequences():
    data = json.loads(SEQUENCES_JSON.read_text(encoding="utf-8"))
    return data["sequences"]


def load_clip_rows():
    with CLIPS_CSV.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def clip_done(file_name):
    paths = clip_artifact_paths(file_name)
    return (
        paths["mp4"].exists()
        and paths["mp4"].stat().st_size >= MIN_MEDIA_BYTES
        and paths["midPng"].exists()
        and paths["midPng"].stat().st_size >= MIN_PNG_BYTES
        and paths["bestPng"].exists()
        and paths["bestPng"].stat().st_size >= MIN_PNG_BYTES
        and paths["json"].exists()
        and paths["json"].stat().st_size >= MIN_JSON_BYTES
    )


def clip_artifact_paths(file_name):
    stem = Path(file_name).stem
    return {
        "mp4": OUTPUT_DIR / file_name,
        "midPng": OUTPUT_DIR / f"{stem}_mid.png",
        "bestPng": OUTPUT_DIR / f"{stem}_best.png",
        "json": OUTPUT_DIR / f"{stem}.json",
    }


def metadata_safe_stats(stats):
    skipped = {"firstGray", "midFrame", "bestFrame", "bestSamples", "bestSampleGrays"}
    return {key: value for key, value in stats.items() if key not in skipped}


def select_best_frame_from_samples(stats):
    samples = stats.get("bestSamples") or []
    sample_grays = stats.get("bestSampleGrays") or []
    if not samples or len(samples) != len(sample_grays):
        return

    baseline = np.median(np.stack(sample_grays, axis=0), axis=0).astype(np.uint8)
    best_index = 0
    best_score = -1.0
    best_delta = 0.0
    for index, gray in enumerate(sample_grays):
        delta = cv2.absdiff(gray, baseline)
        mean_delta = float(np.mean(delta))
        contrast_delta = float(np.std(delta))
        score = mean_delta + contrast_delta * 0.15
        if score >= best_score:
            best_index = index
            best_score = score
            best_delta = mean_delta

    best_elapsed, best_frame = samples[best_index]
    stats["bestFrame"] = best_frame.copy()
    stats["bestMeanDelta"] = best_delta
    stats["bestScore"] = best_score
    stats["bestElapsed"] = best_elapsed
    stats["bestFrameSelection"] = "median_background_delta"


def save_clip_artifacts(file_name, stats):
    paths = clip_artifact_paths(file_name)
    if stats.get("screenshotPolicy") == "best_frame":
        select_best_frame_from_samples(stats)
    primary_frame = stats.get("bestFrame") if stats.get("screenshotPolicy") == "best_frame" else stats.get("midFrame")
    if stats.get("midFrame") is not None:
        cv2.imwrite(str(paths["midPng"]), primary_frame if primary_frame is not None else stats["midFrame"])
    if stats.get("bestFrame") is not None:
        cv2.imwrite(str(paths["bestPng"]), stats["bestFrame"])
    elif stats.get("midFrame") is not None:
        cv2.imwrite(str(paths["bestPng"]), stats["midFrame"])

    metadata = {
        **metadata_safe_stats(stats),
        "artifacts": {
            "mp4": str(paths["mp4"]),
            "midPng": str(paths["midPng"]) if paths["midPng"].exists() else None,
            "bestPng": str(paths["bestPng"]) if paths["bestPng"].exists() else None,
            "json": str(paths["json"]),
        },
    }
    paths["json"].write_text(json.dumps(metadata, indent=2), encoding="utf-8")


def update_clip_stats(stats, frame, elapsed):
    stats["frames"] += 1
    mid_distance = abs(elapsed - stats["midpointElapsed"])
    if stats.get("midFrame") is None or mid_distance < stats.get("midDistance", 999999.0):
        stats["midFrame"] = frame.copy()
        stats["midDistance"] = mid_distance
        stats["midElapsed"] = elapsed

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    if stats.get("firstGray") is None:
        stats["firstGray"] = gray
        stats["bestFrame"] = frame.copy()
        stats["bestMeanDelta"] = 0.0
        stats["bestElapsed"] = elapsed
    else:
        delta = float(np.mean(cv2.absdiff(gray, stats["firstGray"])))
        if delta >= stats.get("bestMeanDelta", -1.0):
            stats["bestMeanDelta"] = delta
            stats["bestFrame"] = frame.copy()
            stats["bestElapsed"] = elapsed

    if stats.get("screenshotPolicy") == "best_frame":
        stats.setdefault("bestSamples", []).append((elapsed, frame.copy()))
        small_gray = cv2.resize(gray, (160, 90), interpolation=cv2.INTER_AREA)
        stats.setdefault("bestSampleGrays", []).append(small_gray)


def write_progress(payload):
    payload = {**payload, "updatedAt": time.strftime("%Y-%m-%d %H:%M:%S")}
    PROGRESS_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def open_writer(path, size):
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    return cv2.VideoWriter(str(path), fourcc, FPS, size)


def close_clip_writer(file_name, writers, writer_stats):
    writers[file_name].release()
    del writers[file_name]
    writer_stats[file_name]["closed"] = True
    save_clip_artifacts(file_name, writer_stats[file_name])


def capture_sequence(sequence, clip_rows, args):
    script_name = sequence["scriptName"]
    rows = [row for row in clip_rows if row["scriptName"] == script_name]
    missing_rows = [row for row in rows if not clip_done(row["suggestedFileName"])]
    if not missing_rows:
        log(f"SKIP {script_name}: all {len(rows)} clips already exist")
        return {"scriptName": script_name, "status": "skipped", "written": 0}

    log(f"START {script_name}: missing {len(missing_rows)} of {len(rows)}")
    assert_nwn_runtime_slot_free(f"injecting capture script {script_name}")
    write_autostart_script(script_name)
    compile_and_inject_autostart()

    max_end = max(float(row["endSeconds"]) for row in rows)
    max_capture_seconds = 45.0 + AUTOSTART_DELAY_SECONDS + max_end + POST_PAD_SECONDS + 4.0
    if getattr(args, "preserve_existing_nwn", False):
        log("preserve-existing-nwn=true; not closing pre-existing NWN windows")
    else:
        log("single-runtime guard active; not closing pre-existing NWN windows")
    assert_nwn_runtime_slot_free(f"launching {MODULE_NAME} for {script_name}")
    settings_patched = prepare_capture_settings()
    process = subprocess.Popen([str(NWN_EXE), "+TestNewModule", MODULE_NAME], cwd=str(NWN_EXE.parent))
    writers = {}
    writer_stats = {}
    first_gameplay_time = None
    load_settled_at = None
    gameplay_time = None
    sequence_zero = None
    frame_count = 0
    written_count = 0
    consecutive_capture_failures = 0

    try:
        hwnd = None
        window_deadline = time.time() + 35
        while time.time() < window_deadline:
            windows = enumerate_nwn_windows(process.pid)
            if windows:
                hwnd = windows[0]["hwnd"]
                break
            if process.poll() is not None:
                raise RuntimeError(f"nwmain exited before showing a window: {process.returncode}")
            time.sleep(0.1)
        if hwnd is None:
            raise RuntimeError("NWN window did not appear")
        monitor = move_window_to_monitor(hwnd, args.window_placement, activate=not args.no_activate_window)
        if monitor:
            log(
                f"{script_name}: moved NWN window to {monitor['placement']} monitor "
                f"{monitor['left']},{monitor['top']},{monitor['right']},{monitor['bottom']}"
            )

        start = time.perf_counter()
        next_tick = start
        while True:
            now = time.perf_counter()
            elapsed = now - start
            if elapsed > max_capture_seconds:
                break
            if sequence_zero is not None and elapsed > sequence_zero + max_end + POST_PAD_SECONDS + 1.5:
                break
            if now < next_tick:
                time.sleep(min(0.015, next_tick - now))
                continue

            try:
                frame = capture_window_with_retry(hwnd)
                if consecutive_capture_failures:
                    log(f"{script_name}: capture recovered after {consecutive_capture_failures} failed frame(s)")
                consecutive_capture_failures = 0
            except RuntimeError as error:
                consecutive_capture_failures += 1
                if consecutive_capture_failures in {1, 5, 10}:
                    log(
                        f"{script_name}: capture frame failed "
                        f"({consecutive_capture_failures} consecutive): {error}"
                    )
                if consecutive_capture_failures >= 20:
                    raise RuntimeError(
                        f"{script_name}: repeated capture frame failures on secondary window"
                    ) from error
                next_tick += 1.0 / FPS
                continue
            frame_count += 1
            if first_gameplay_time is None and is_gameplay_frame(frame):
                first_gameplay_time = elapsed
                log(f"{script_name}: firstGameplay={first_gameplay_time:.2f}s")
            if (
                gameplay_time is None
                and first_gameplay_time is not None
                and elapsed >= first_gameplay_time + LOAD_SETTLE_SECONDS
                and is_gameplay_frame(frame)
            ):
                gameplay_time = first_gameplay_time
                load_settled_at = elapsed
                sequence_zero = gameplay_time + AUTOSTART_DELAY_SECONDS
                if load_settled_at > sequence_zero - MIN_SETTLED_BEFORE_SEQUENCE_SECONDS:
                    raise RuntimeError(
                        f"{script_name}: area settled too late for clean capture "
                        f"(loadSettled={load_settled_at:.2f}s, sequenceZero={sequence_zero:.2f}s)"
                    )
                log(
                    f"{script_name}: loadSettled={load_settled_at:.2f}s "
                    f"sequenceZero={sequence_zero:.2f}s"
                )

            if sequence_zero is not None:
                for row in rows:
                    file_name = row["suggestedFileName"]
                    if clip_done(file_name) and file_name not in writers:
                        continue
                    capture_mode = row.get("captureMode") or "object_turntable"
                    stage = crop_stage(frame, capture_mode)
                    height, width = stage.shape[:2]
                    clip_start = sequence_zero + float(row["startSeconds"]) - PRE_PAD_SECONDS
                    clip_end = sequence_zero + float(row["endSeconds"]) + POST_PAD_SECONDS
                    if elapsed < clip_start or elapsed > clip_end:
                        if elapsed > clip_end and file_name in writers:
                            close_clip_writer(file_name, writers, writer_stats)
                            written_count += 1
                        continue
                    if file_name not in writers:
                        paths = clip_artifact_paths(file_name)
                        writers[file_name] = open_writer(paths["mp4"], (width, height))
                        midpoint = sequence_zero + float(row.get("midpointSeconds") or (
                            (float(row["startSeconds"]) + float(row["endSeconds"])) / 2.0
                        ))
                        effect_duration_seconds = float(row.get("effectDurationSeconds") or 0.0)
                        writer_stats[file_name] = {
                            "rowId": int(row["rowId"]),
                            "label": row["label"],
                            "targetMode": row.get("targetMode"),
                            "captureMode": capture_mode,
                            "captureReasons": row.get("captureReasons", ""),
                            "file": str(paths["mp4"]),
                            "startElapsed": clip_start,
                            "endElapsed": clip_end,
                            "midpointElapsed": midpoint,
                            "captureWindowSeconds": float(row.get("captureWindowSeconds") or 0.0),
                            "effectDurationSeconds": effect_duration_seconds,
                            "screenshotPolicy": "best_frame" if effect_duration_seconds <= 0.0 else "mid_frame",
                            "frames": 0,
                        }
                    writers[file_name].write(stage)
                    update_clip_stats(writer_stats[file_name], stage, elapsed)

                if written_count >= len(missing_rows) and not writers:
                    break

            next_tick += 1.0 / FPS

        for file_name in list(writers.keys()):
            close_clip_writer(file_name, writers, writer_stats)
            written_count += 1
    finally:
        for window in enumerate_nwn_windows(process.pid):
            PostMessageW(window["hwnd"], WM_CLOSE, 0, 0)
        time.sleep(1.5)
        if process.poll() is None:
            process.terminate()
            time.sleep(1)
        if process.poll() is None:
            process.kill()
        if not getattr(args, "preserve_existing_nwn", False):
            close_existing_nwn()
        if settings_patched:
            restore_capture_settings_backup()

    failed = []
    for row in rows:
        file_name = row["suggestedFileName"]
        if not clip_done(file_name):
            failed.append(file_name)
    if failed:
        log(f"DONE {script_name}: frames={frame_count}, still missing {len(failed)}")
    else:
        log(f"DONE {script_name}: frames={frame_count}, all {len(rows)} clips ready")

    sequence_report = {
        "scriptName": script_name,
        "targetMode": sequence["targetMode"],
        "framesCaptured": frame_count,
        "firstGameplayTime": first_gameplay_time,
        "loadSettledAt": load_settled_at,
        "gameplayTime": gameplay_time,
        "sequenceZero": sequence_zero,
        "writtenOrTouched": sorted(
            (metadata_safe_stats(item) for item in writer_stats.values()),
            key=lambda item: item["rowId"],
        ),
        "missingAfterRun": failed,
    }
    (OUTPUT_DIR / f"{script_name}.json").write_text(json.dumps(sequence_report, indent=2), encoding="utf-8")
    return {
        "scriptName": script_name,
        "status": "ok" if not failed else "partial",
        "written": written_count,
        "missing": len(failed),
    }


def copy_existing_seed_clips():
    seed_dir = REPO_ROOT / ".codex-tmp" / "aurora-live-evidence" / "vfx-capture-clips" / "vfxco0000"
    if not seed_dir.exists():
        return
    for src in seed_dir.glob("*.mp4"):
        if src.name.startswith("vfxco0000_"):
            continue
        dst = OUTPUT_DIR / src.name
        if not dst.exists() or dst.stat().st_size < MIN_MEDIA_BYTES:
            dst.write_bytes(src.read_bytes())


def main():
    raise RuntimeError(
        "This VFX retail capture launcher is retired. It launches and moves nwmain.exe; use a guarded Toolset workflow or user-provided capture ingestion instead."
    )
    parser = argparse.ArgumentParser()
    parser.add_argument("--target-mode", choices=["all", "object", "beam", "location"], default="all")
    parser.add_argument("--start-script", default=None)
    parser.add_argument("--max-sequences", type=int, default=None)
    parser.add_argument("--skip-seed-copy", action="store_true")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument(
        "--window-placement",
        choices=["primary", "secondary", "none"],
        default="primary",
        help="Where to place nwmain. Default avoids the secondary monitor used by other Aurora work.",
    )
    parser.add_argument(
        "--no-activate-window",
        action="store_true",
        help="Move the NWN window without activating it. Not recommended because NWN may pause.",
    )
    parser.add_argument(
        "--preserve-existing-nwn",
        action="store_true",
        help="Do not close NWN windows that were not launched by this capture process.",
    )
    args = parser.parse_args()

    configure_output_dir(args.output_dir)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sequences = load_sequences()
    clip_rows = load_clip_rows()
    if args.target_mode != "all":
        sequences = [sequence for sequence in sequences if sequence["targetMode"] == args.target_mode]
    if args.start_script:
        start_index = next(
            (index for index, sequence in enumerate(sequences) if sequence["scriptName"] == args.start_script),
            None,
        )
        if start_index is None:
            raise RuntimeError(f"start script not found in selected sequences: {args.start_script}")
        sequences = sequences[start_index:]
    if args.max_sequences is not None:
        sequences = sequences[: args.max_sequences]
    if not args.skip_seed_copy and OUTPUT_DIR.name == "all":
        copy_existing_seed_clips()

    total_expected = len({row["suggestedFileName"] for row in clip_rows})
    log(f"CAPTURE ALL start target={args.target_mode} sequences={len(sequences)} expectedMp4={total_expected}")
    for index, sequence in enumerate(sequences, start=1):
        ready = sum(1 for row in clip_rows if clip_done(row["suggestedFileName"]))
        write_progress(
            {
                "status": "running",
                "currentSequence": sequence["scriptName"],
                "sequenceIndex": index,
                "sequenceCount": len(sequences),
                "readyMp4": ready,
                "expectedMp4": total_expected,
                "remainingMp4": total_expected - ready,
                "outputDir": str(OUTPUT_DIR),
            }
        )
        result = capture_sequence(sequence, clip_rows, args)
        if result["status"] == "partial":
            raise RuntimeError(
                f"{sequence['scriptName']} ended partial; missing={result['missing']}. "
                "Stop instead of continuing with a suspect block."
            )

    ready = sum(1 for row in clip_rows if clip_done(row["suggestedFileName"]))
    write_progress(
        {
            "status": "complete" if ready == total_expected else "incomplete",
            "readyMp4": ready,
            "expectedMp4": total_expected,
            "remainingMp4": total_expected - ready,
            "outputDir": str(OUTPUT_DIR),
        }
    )
    log(f"CAPTURE ALL done ready={ready} expected={total_expected} remaining={total_expected - ready}")


if __name__ == "__main__":
    main()
