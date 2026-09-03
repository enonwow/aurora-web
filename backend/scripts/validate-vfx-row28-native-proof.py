from __future__ import annotations

import argparse
import ctypes
import hashlib
import json
import msvcrt
import os
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np


GENERIC_READ = 0x80000000
FILE_SHARE_READ = 0x00000001
FILE_SHARE_WRITE = 0x00000002
FILE_SHARE_DELETE = 0x00000004
OPEN_EXISTING = 3
FILE_ATTRIBUTE_NORMAL = 0x00000080
INVALID_HANDLE_VALUE = ctypes.c_void_p(-1).value
EXPECTED_MARKER = (
    "AURORA_VFX_PROOF_TRIGGER fixture=vfx-nwn-web-row28 "
    "row=28 count=1 run=20260818T164640Z"
)
EXPECTED_MODULE_LINE = "Loading Module: codex_vfx_row28"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def media(path: Path) -> dict:
    return {"path": str(path.resolve()), "bytes": path.stat().st_size, "sha256": sha256(path)}


def read_shared(path: Path) -> bytes:
    kernel32 = ctypes.windll.kernel32
    kernel32.CreateFileW.argtypes = [
        ctypes.c_wchar_p,
        ctypes.c_uint32,
        ctypes.c_uint32,
        ctypes.c_void_p,
        ctypes.c_uint32,
        ctypes.c_uint32,
        ctypes.c_void_p,
    ]
    kernel32.CreateFileW.restype = ctypes.c_void_p
    handle = kernel32.CreateFileW(
        str(path),
        GENERIC_READ,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        None,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        None,
    )
    if handle == INVALID_HANDLE_VALUE:
        raise RuntimeError("engine_log_shared_read_open_failed")
    fd = msvcrt.open_osfhandle(handle, os.O_RDONLY)
    with os.fdopen(fd, "rb") as stream:
        return stream.read()


def read_video(path: Path) -> tuple[float, list[np.ndarray]]:
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError("native_mp4_open_failed")
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
    frames: list[np.ndarray] = []
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        frames.append(frame)
    capture.release()
    if fps <= 0 or not frames:
        raise RuntimeError("native_mp4_decode_failed")
    return fps, frames


def bright_saturated_pixels(frame: np.ndarray) -> int:
    maximum = frame.max(axis=2)
    minimum = frame.min(axis=2)
    return int(np.count_nonzero((maximum >= 245) & ((maximum - minimum) >= 35)))


def save_frame(path: Path, frame: np.ndarray) -> dict:
    if not cv2.imwrite(str(path), frame):
        raise RuntimeError(f"frame_write_failed:{path.name}")
    return media(path)


def create_contact_sheet(path: Path, samples: list[tuple[str, np.ndarray]]) -> dict:
    width = 480
    rendered = []
    for label, frame in samples:
        scale = width / frame.shape[1]
        resized = cv2.resize(frame, (width, int(round(frame.shape[0] * scale))))
        canvas = np.zeros((resized.shape[0] + 40, width, 3), dtype=np.uint8)
        canvas[40:] = resized
        cv2.putText(canvas, label, (10, 27), cv2.FONT_HERSHEY_SIMPLEX, 0.64, (255, 255, 255), 1, cv2.LINE_AA)
        rendered.append(canvas)
    sheet = np.vstack([np.hstack(rendered[:3]), np.hstack(rendered[3:6])])
    if not cv2.imwrite(str(path), sheet):
        raise RuntimeError("contact_sheet_write_failed")
    return media(path)


def validate(args) -> dict:
    if args.out_dir.exists():
        raise RuntimeError("immutable_final_proof_output_exists")
    capture = json.loads(args.capture.read_text(encoding="utf-8"))
    observation = json.loads(args.observation.read_text(encoding="utf-8"))
    profile = json.loads(args.profile.read_text(encoding="utf-8"))
    if capture.get("ok") is not True or capture.get("status") != "recorded_pending_lifecycle_validation":
        raise RuntimeError("capture_metadata_status_invalid")
    if capture.get("artifact", {}).get("sha256") != sha256(args.video):
        raise RuntimeError("capture_video_hash_mismatch")
    if capture.get("artifact", {}).get("bytes") != args.video.stat().st_size:
        raise RuntimeError("capture_video_size_mismatch")
    process = capture.get("process", {})
    if observation.get("profileId") != profile.get("id") or observation.get("process", {}).get("pid") != process.get("pid"):
        raise RuntimeError("runtime_observation_process_binding_mismatch")
    if capture.get("capture", {}).get("candidateCaptureStartedAtSeconds", 999) > 0.25:
        raise RuntimeError("capture_did_not_start_at_first_candidate_frame")
    if capture.get("safety") != {
        "startsNwn": False,
        "usesGlobalCursor": False,
        "usesGlobalMouse": False,
        "usesGlobalKeyboard": False,
        "activatesWindow": False,
        "changesZOrder": False,
        "visibilityMutation": "SW_SHOWNOACTIVATE only if the exact window becomes iconic",
    }:
        raise RuntimeError("capture_safety_binding_mismatch")

    log_bytes = read_shared(args.engine_log)
    log_text = log_bytes.decode("utf-8", errors="replace")
    markers = [line.strip() for line in log_text.splitlines() if EXPECTED_MARKER in line]
    module_lines = [line.strip() for line in log_text.splitlines() if EXPECTED_MODULE_LINE in line]
    if len(markers) != 1 or len(module_lines) != 1:
        raise RuntimeError(f"engine_log_binding_invalid:markers={len(markers)}:modules={len(module_lines)}")

    fps, frames = read_video(args.video)
    width = int(frames[0].shape[1])
    height = int(frames[0].shape[0])
    if fps != 12.0 or (width, height) != (1460, 810) or len(frames) != capture.get("capture", {}).get("frameCount"):
        raise RuntimeError("native_video_metadata_binding_mismatch")
    baseline_count = int(round(fps * 4.0))
    if len(frames) < baseline_count + int(round(fps * 8.0)):
        raise RuntimeError("native_video_duration_too_short")
    metrics = [bright_saturated_pixels(frame) for frame in frames]
    baseline_metrics = np.asarray(metrics[:baseline_count], dtype=np.float64)
    baseline_median = float(np.median(baseline_metrics))
    baseline_p99 = float(np.percentile(baseline_metrics, 99))
    threshold = max(1000.0, baseline_p99 + max(750.0, baseline_p99 * 1.5))
    visible = [index for index in range(baseline_count, len(frames)) if metrics[index] >= threshold]
    if not visible:
        raise RuntimeError("meteor_swarm_visible_interval_missing")
    onset = visible[0]
    last = visible[-1]
    peak = max(visible, key=metrics.__getitem__)
    baseline_index = max(0, onset - int(round(fps * 2.0)))
    post_index = len(frames) - 1
    post_window = metrics[-int(round(fps * 5.0)) :]
    checks = {
        "exactlyOneTriggerMarker": len(markers) == 1,
        "exactModuleLoaded": len(module_lines) == 1,
        "mp4DecodesCompletely": len(frames) == capture["capture"]["frameCount"],
        "baselineBeforeOnset": baseline_index < onset and onset >= baseline_count,
        "visibleMeteorIntervalPresent": last > onset and metrics[peak] >= threshold,
        "postRollHidden": max(post_window) < threshold,
        "singleFinalRuntimeBound": observation["process"]["pid"] == process["pid"],
        "captureStartedAtFirstCandidate": capture["capture"]["candidateCaptureStartedAtSeconds"] <= 0.25,
    }
    if not all(checks.values()):
        raise RuntimeError(f"native_lifecycle_checks_failed:{checks}")

    args.out_dir.mkdir(parents=True, exist_ok=False)
    engine_snapshot = args.out_dir / "nwclientLog1-final-run.txt"
    engine_snapshot.write_bytes(log_bytes)
    stills = {
        "baseline": save_frame(args.out_dir / "nwn-row28-baseline.png", frames[baseline_index]),
        "onset": save_frame(args.out_dir / "nwn-row28-onset.png", frames[onset]),
        "peak": save_frame(args.out_dir / "nwn-row28-peak.png", frames[peak]),
        "lastVisible": save_frame(args.out_dir / "nwn-row28-last-visible.png", frames[last]),
        "post": save_frame(args.out_dir / "nwn-row28-post.png", frames[post_index]),
    }
    samples = [
        (f"baseline {baseline_index / fps:.2f}s", frames[baseline_index]),
        (f"onset {onset / fps:.2f}s", frames[onset]),
        (f"peak {peak / fps:.2f}s", frames[peak]),
        (f"last {last / fps:.2f}s", frames[last]),
        (f"post {post_index / fps:.2f}s", frames[post_index]),
        ("single trigger / native NWN", frames[peak]),
    ]
    contact = create_contact_sheet(args.out_dir / "nwn-row28-lifecycle-contact-sheet.png", samples)
    ledger = {
        "version": "aurora-vfx-trigger-ledger/v1",
        "fixtureId": "vfx-nwn-web-row28",
        "runId": "20260818T164640Z",
        "intentionalTriggerCount": 1,
        "observedTriggerLogCount": len(markers),
        "validSingleTrigger": len(markers) == 1,
        "triggerLogLines": markers,
        "moduleLoadLines": module_lines,
        "sourceRowId": 28,
        "sourceLabel": "VFX_FNF_METEOR_SWEARM",
        "publicConstant": "VFX_FNF_METEOR_SWARM",
        "sourceModel": "vff_rainmeteor",
        "attemptDisclosure": {
            "finalAcceptedRuntimeExecution": "runtime-execution-v9",
            "priorRuntimeExecutionsRejected": [
                "runtime-execution",
                "runtime-execution-v2",
                "runtime-execution-v3",
                "runtime-execution-v4",
                "runtime-execution-v5",
                "runtime-execution-v6",
                "runtime-execution-v7",
                "runtime-execution-v8",
            ],
            "automaticRetryClaim": False,
        },
    }
    ledger_path = args.out_dir / "trigger-ledger.json"
    ledger_path.write_text(json.dumps(ledger, indent=2) + "\n", encoding="utf-8")
    summary = {
        "version": "aurora-vfx-row28-native-nwn-proof/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "valid-single-trigger-visible-native-nwn-oracle",
        "fixtureId": "vfx-nwn-web-row28",
        "profileId": profile["id"],
        "module": profile["module"],
        "process": process,
        "video": media(args.video),
        "captureMetadata": media(args.capture),
        "runtimeObservation": media(args.observation),
        "engineLoadLog": media(engine_snapshot),
        "triggerLedger": media(ledger_path),
        "lifecycle": {
            "fps": fps,
            "frameCount": len(frames),
            "durationSeconds": len(frames) / fps,
            "metric": "saturated-bright-pixel-count(max>=245,channel-range>=35)",
            "baselineFrameCount": baseline_count,
            "baselineMedian": baseline_median,
            "baselineP99": baseline_p99,
            "visibilityThreshold": threshold,
            "onsetFrameIndex": onset,
            "onsetVideoSeconds": onset / fps,
            "peakFrameIndex": peak,
            "peakVideoSeconds": peak / fps,
            "peakMetric": metrics[peak],
            "lastVisibleFrameIndex": last,
            "lastVisibleVideoSeconds": last / fps,
            "postFrameIndex": post_index,
            "postVideoSeconds": post_index / fps,
        },
        "stills": stills,
        "contactSheet": contact,
        "checks": checks,
    }
    summary_path = args.out_dir / "validated-summary.json"
    summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    packet = {
        "version": "aur-s07-runtime-packet/v1",
        "profileId": profile["id"],
        "moduleSha256": profile["module"]["sha256"],
        "area": profile["module"]["area"],
        "entryPoint": profile["module"]["entryPoint"],
        "fixtures": profile["fixtures"],
        "modelVisibility": {"status": "visible", "blank": False, "placeholder": False},
        "artifacts": [
            {"kind": "runtime-observation", **media(args.observation)},
            {"kind": "runtime-capture", **media(args.video)},
            {"kind": "engine-load-log", **media(engine_snapshot)},
        ],
    }
    packet_path = args.out_dir / "aur-s07-runtime-packet.json"
    packet_path.write_text(json.dumps(packet, indent=2) + "\n", encoding="utf-8")
    return {
        "ok": True,
        "status": summary["status"],
        "summary": media(summary_path),
        "packet": media(packet_path),
        "video": summary["video"],
        "lifecycle": summary["lifecycle"],
        "checks": checks,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["dry-run", "validate"])
    parser.add_argument("--video", type=Path, required=True)
    parser.add_argument("--capture", type=Path, required=True)
    parser.add_argument("--observation", type=Path, required=True)
    parser.add_argument("--profile", type=Path, required=True)
    parser.add_argument("--engineLog", dest="engine_log", type=Path, required=True)
    parser.add_argument("--outDir", dest="out_dir", type=Path, required=True)
    args = parser.parse_args()
    if args.command == "dry-run":
        result = {
            "ok": True,
            "status": "vfx_row28_native_proof_validation_plan_valid",
            "expectedMarker": EXPECTED_MARKER,
            "expectedModuleLine": EXPECTED_MODULE_LINE,
            "readsLockedEngineLogWithFileShareReadWrite": True,
            "writesImmutableFinalPacket": True,
        }
    else:
        result = validate(args)
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
