from __future__ import annotations

import argparse
import ctypes
import hashlib
import importlib.util
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import cv2


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = REPO_ROOT / "backend" / "scripts"
LAB_PATH = SCRIPT_DIR / "capture_all_vfx_clips.py"
PREDECESSOR_RUNNER = (
    Path(r"C:\Projects\nwn\VFX")
    / "scripts"
    / "source-scripts"
    / "run-skrytobojca-mark-nwn-proof.py"
)
PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
SYNCHRONIZE = 0x00100000
TH32CS_SNAPPROCESS = 0x00000002
WAIT_TIMEOUT = 0x00000102
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value
SW_SHOWNOACTIVATE = 4
MAX_PATH = 260


class FILETIME(ctypes.Structure):
    _fields_ = [("dwLowDateTime", ctypes.c_uint32), ("dwHighDateTime", ctypes.c_uint32)]


class PROCESSENTRY32W(ctypes.Structure):
    _fields_ = [
        ("dwSize", ctypes.c_uint32),
        ("cntUsage", ctypes.c_uint32),
        ("th32ProcessID", ctypes.c_uint32),
        ("th32DefaultHeapID", ctypes.c_void_p),
        ("th32ModuleID", ctypes.c_uint32),
        ("cntThreads", ctypes.c_uint32),
        ("th32ParentProcessID", ctypes.c_uint32),
        ("pcPriClassBase", ctypes.c_long),
        ("dwFlags", ctypes.c_uint32),
        ("szExeFile", ctypes.c_wchar * MAX_PATH),
    ]


kernel32 = ctypes.windll.kernel32
user32 = ctypes.windll.user32
kernel32.CreateToolhelp32Snapshot.restype = ctypes.c_void_p
kernel32.OpenProcess.restype = ctypes.c_void_p
kernel32.GetProcessTimes.argtypes = [
    ctypes.c_void_p,
    ctypes.POINTER(FILETIME),
    ctypes.POINTER(FILETIME),
    ctypes.POINTER(FILETIME),
    ctypes.POINTER(FILETIME),
]
kernel32.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
kernel32.WaitForSingleObject.restype = ctypes.c_uint32
kernel32.CloseHandle.argtypes = [ctypes.c_void_p]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"module_load_unavailable:{path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def process_ids_by_name(executable: str) -> list[int]:
    snapshot = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    if snapshot == INVALID_HANDLE_VALUE:
        raise RuntimeError("process_snapshot_unavailable")
    result: list[int] = []
    entry = PROCESSENTRY32W()
    entry.dwSize = ctypes.sizeof(PROCESSENTRY32W)
    try:
        ok = kernel32.Process32FirstW(snapshot, ctypes.byref(entry))
        while ok:
            if entry.szExeFile.lower() == executable.lower():
                result.append(int(entry.th32ProcessID))
            ok = kernel32.Process32NextW(snapshot, ctypes.byref(entry))
    finally:
        kernel32.CloseHandle(snapshot)
    return result


def open_exact_process(pid: int, expected_started_at: datetime):
    ids = process_ids_by_name("nwmain.exe")
    if ids != [pid]:
        raise RuntimeError(f"expected_one_exact_nwmain:{ids}")
    handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION | SYNCHRONIZE, False, pid)
    if not handle:
        raise RuntimeError("nwmain_process_handle_unavailable")
    creation = FILETIME()
    exit_time = FILETIME()
    kernel = FILETIME()
    user = FILETIME()
    if not kernel32.GetProcessTimes(
        handle,
        ctypes.byref(creation),
        ctypes.byref(exit_time),
        ctypes.byref(kernel),
        ctypes.byref(user),
    ):
        kernel32.CloseHandle(handle)
        raise RuntimeError("nwmain_process_times_unavailable")
    filetime = (creation.dwHighDateTime << 32) | creation.dwLowDateTime
    actual_unix = (filetime - 116444736000000000) / 10_000_000
    if abs(actual_unix - expected_started_at.timestamp()) > 0.010:
        kernel32.CloseHandle(handle)
        actual = datetime.fromtimestamp(actual_unix, timezone.utc).isoformat()
        raise RuntimeError(f"nwmain_start_mismatch:{actual}")
    return handle, datetime.fromtimestamp(actual_unix, timezone.utc)


def validate_live_identity(handle, pid: int, hwnd: int, lab) -> dict:
    wait_result = kernel32.WaitForSingleObject(handle, 0)
    if wait_result != WAIT_TIMEOUT:
        raise RuntimeError(f"nwmain_process_not_live:wait={wait_result}")
    if process_ids_by_name("nwmain.exe") != [pid]:
        raise RuntimeError("nwmain_process_set_drift")
    windows = lab.enumerate_nwn_windows(pid)
    if len(windows) != 1 or int(windows[0]["hwnd"]) != hwnd:
        raise RuntimeError(f"nwmain_window_identity_drift:{windows}")
    owner = ctypes.c_ulong()
    user32.GetWindowThreadProcessId(hwnd, ctypes.byref(owner))
    if owner.value != pid:
        raise RuntimeError(f"nwmain_window_owner_drift:{owner.value}")
    return windows[0]


def ensure_visible_noactivate(hwnd: int) -> bool:
    if not user32.IsIconic(hwnd):
        return False
    if not user32.ShowWindow(hwnd, SW_SHOWNOACTIVATE):
        # ShowWindow returns the previous visibility state, not operation success.
        time.sleep(0.05)
    deadline = time.monotonic() + 1.0
    while time.monotonic() < deadline and user32.IsIconic(hwnd):
        time.sleep(0.025)
    if user32.IsIconic(hwnd):
        raise RuntimeError("nwmain_noactivate_restore_failed")
    return True


def parse_utc(value: str) -> datetime:
    if not value.endswith("Z"):
        raise argparse.ArgumentTypeError("startedAtUtc must end in Z")
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError as error:
        raise argparse.ArgumentTypeError("startedAtUtc must be an ISO-8601 UTC instant") from error
    return parsed.astimezone(timezone.utc)


def capture(args) -> dict:
    if args.out.exists() or args.result_out.exists():
        raise RuntimeError("immutable_output_already_exists")
    sys.path.insert(0, str(SCRIPT_DIR))
    lab = load_module(LAB_PATH, "aurora_vfx_predecessor_capture_lab")
    predecessor = load_module(PREDECESSOR_RUNNER, "aurora_vfx_predecessor_runner")
    handle, actual_start = open_exact_process(args.pid, args.started_at_utc)
    writer = None
    frames = 0
    ticks = 0
    restore_count = 0
    gameplay_detected_at = None
    forced_gameplay = False
    candidate_capture_started_at = None
    stage_size = None
    hwnd = 0
    started = time.perf_counter()
    next_tick = started
    try:
        windows = lab.enumerate_nwn_windows(args.pid)
        if len(windows) != 1:
            raise RuntimeError(f"expected_one_visible_owned_nwmain_window:{len(windows)}")
        hwnd = int(windows[0]["hwnd"])
        validate_live_identity(handle, args.pid, hwnd, lab)
        restore_count += int(ensure_visible_noactivate(hwnd))
        monitor = lab.monitor_work_area("secondary")
        if monitor is None:
            raise RuntimeError("expected_one_nonprimary_monitor")
        rect = windows[0]["rect"]
        if rect[0] < monitor["left"] or rect[1] < monitor["top"] or rect[2] > monitor["right"] or rect[3] > monitor["bottom"]:
            raise RuntimeError(f"nwmain_window_outside_nonprimary_working_area:{rect}")

        while time.perf_counter() - started < args.duration_seconds:
            now = time.perf_counter()
            if now < next_tick:
                time.sleep(min(0.01, next_tick - now))
                continue
            if ticks % max(1, int(args.fps)) == 0:
                validate_live_identity(handle, args.pid, hwnd, lab)
            restore_count += int(ensure_visible_noactivate(hwnd))
            frame = lab.capture_window(hwnd)
            if gameplay_detected_at is None:
                if predecessor.is_runtime_gameplay_frame(frame):
                    gameplay_detected_at = now - started
                elif now - started >= 12.0 and predecessor.is_capture_candidate_frame(frame):
                    gameplay_detected_at = now - started
                    forced_gameplay = True
            if not predecessor.is_capture_candidate_frame(frame):
                ticks += 1
                next_tick += 1.0 / args.fps
                continue
            stage = lab.crop_stage(frame, args.capture_mode)
            if not predecessor.is_valid_stage_frame(stage):
                ticks += 1
                next_tick += 1.0 / args.fps
                continue
            if writer is None:
                candidate_capture_started_at = now - started
                height, width = stage.shape[:2]
                stage_size = [width, height]
                args.out.parent.mkdir(parents=True, exist_ok=True)
                writer = cv2.VideoWriter(
                    str(args.out),
                    cv2.VideoWriter_fourcc(*"mp4v"),
                    args.fps,
                    (width, height),
                )
                if not writer.isOpened():
                    raise RuntimeError("predecessor_video_writer_open_failed")
            writer.write(stage)
            frames += 1
            ticks += 1
            next_tick += 1.0 / args.fps

        if writer is None or frames < int(args.fps * 5):
            raise RuntimeError(f"insufficient_gameplay_frames:{frames}")
        writer.release()
        writer = None
        validate_live_identity(handle, args.pid, hwnd, lab)
        result = {
            "version": "aurora-vfx-nwmain-predecessor-capture/v1",
            "ok": True,
            "status": "recorded_pending_lifecycle_validation",
            "process": {
                "name": "nwmain",
                "pid": args.pid,
                "startedAtUtc": actual_start.isoformat().replace("+00:00", "Z"),
                "windowHwnd": hwnd,
            },
            "capture": {
                "method": "predecessor PrintWindow(PW_RENDERFULLCONTENT) frame loop",
                "source": str(LAB_PATH),
                "sourceSha256": sha256(LAB_PATH),
                "runnerLineage": str(PREDECESSOR_RUNNER),
                "runnerLineageSha256": sha256(PREDECESSOR_RUNNER),
                "captureMode": args.capture_mode,
                "requestedFps": args.fps,
                "frameCount": frames,
                "stageSize": stage_size,
                "gameplayDetectedAtSeconds": gameplay_detected_at,
                "forcedGameplayDetection": forced_gameplay,
                "candidateCaptureStartedAtSeconds": candidate_capture_started_at,
                "noActivateRestoreCount": restore_count,
            },
            "artifact": {
                "path": str(args.out.resolve()),
                "bytes": args.out.stat().st_size,
                "sha256": sha256(args.out),
            },
            "safety": {
                "startsNwn": False,
                "usesGlobalCursor": False,
                "usesGlobalMouse": False,
                "usesGlobalKeyboard": False,
                "activatesWindow": False,
                "changesZOrder": False,
                "visibilityMutation": "SW_SHOWNOACTIVATE only if the exact window becomes iconic",
            },
        }
        args.result_out.parent.mkdir(parents=True, exist_ok=True)
        args.result_out.write_text(json.dumps(result, indent=2), encoding="utf-8")
        return result
    except Exception:
        if writer is not None:
            writer.release()
        if args.out.exists():
            args.out.unlink()
        raise
    finally:
        kernel32.CloseHandle(handle)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    for command in ("dry-run", "capture"):
        target = subparsers.add_parser(command)
        target.add_argument("--pid", type=int, required=True)
        target.add_argument("--startedAtUtc", dest="started_at_utc", type=parse_utc, required=True)
        target.add_argument("--out", type=Path, required=True)
        target.add_argument("--resultOut", dest="result_out", type=Path, required=True)
        target.add_argument("--durationSeconds", dest="duration_seconds", type=float, default=45.0)
        target.add_argument("--fps", type=float, default=12.0)
        target.add_argument("--captureMode", dest="capture_mode", default="location_area")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    if args.pid <= 0 or not (5.0 <= args.duration_seconds <= 60.0) or not (1.0 <= args.fps <= 30.0):
        raise SystemExit("invalid_capture_arguments")
    if args.command == "dry-run":
        result = {
            "ok": True,
            "status": "predecessor_vfx_capture_plan_valid",
            "expectedProcess": {
                "name": "nwmain",
                "pid": args.pid,
                "startedAtUtc": args.started_at_utc.isoformat().replace("+00:00", "Z"),
            },
            "captureMethod": "predecessor PrintWindow(PW_RENDERFULLCONTENT) frame loop",
            "captureMode": args.capture_mode,
            "durationSeconds": args.duration_seconds,
            "fps": args.fps,
            "startsNwn": False,
            "usesGlobalInput": False,
            "activatesWindow": False,
            "changesZOrder": False,
        }
    else:
        result = capture(args)
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
