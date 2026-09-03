from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_ROOT = REPO_ROOT / "backend" / "docs" / "aurora-reverse" / "evidence" / "vfx-nwn-broad-proof-2026-07-16"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def read_video(path: Path) -> tuple[float, list[np.ndarray]]:
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not open {path}")
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
    frames = []
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        frames.append(frame)
    capture.release()
    if not frames or fps <= 0:
        raise RuntimeError("NWN MP4 has no decodable frames or FPS metadata")
    return fps, frames


def changed_pixels(frame: np.ndarray, baseline: np.ndarray) -> int:
    delta = np.max(cv2.absdiff(frame, baseline), axis=2)
    return int(np.count_nonzero(delta >= 42))


def save_frame(path: Path, frame: np.ndarray) -> dict:
    if not cv2.imwrite(str(path), frame):
        raise RuntimeError(f"Could not write {path}")
    return {"path": str(path), "sha256": sha256(path), "sizeBytes": path.stat().st_size}


def create_contact_sheet(path: Path, samples: list[tuple[str, np.ndarray]]) -> dict:
    target_width = 440
    rendered = []
    for label, frame in samples:
        scale = target_width / frame.shape[1]
        resized = cv2.resize(frame, (target_width, int(round(frame.shape[0] * scale))))
        canvas = np.zeros((resized.shape[0] + 34, target_width, 3), dtype=np.uint8)
        canvas[34:, :] = resized
        cv2.putText(canvas, label, (10, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)
        rendered.append(canvas)
    while len(rendered) < 6:
        rendered.append(np.zeros_like(rendered[0]))
    rows = [np.hstack(rendered[index : index + 3]) for index in range(0, 6, 3)]
    sheet = np.vstack(rows)
    if not cv2.imwrite(str(path), sheet):
        raise RuntimeError(f"Could not write {path}")
    return {"path": str(path), "sha256": sha256(path), "sizeBytes": path.stat().st_size}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fixture", required=True)
    parser.add_argument("--proof-dir", default="nwn")
    args = parser.parse_args()
    proof_root = EVIDENCE_ROOT / args.fixture / args.proof_dir
    summary_path = proof_root / "summary.json"
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    ledger = json.loads((proof_root / "trigger-ledger.json").read_text(encoding="utf-8"))
    videos = sorted(proof_root.glob("*.mp4"))
    if len(videos) != 1:
        raise RuntimeError(f"Expected exactly one MP4 in {proof_root}, received {len(videos)}")
    video_path = videos[0]
    fps, frames = read_video(video_path)
    baseline_count = max(4, min(int(round(fps * 4.0)), len(frames) // 3))
    baseline = np.median(np.stack(frames[:baseline_count]).astype(np.float32), axis=0).astype(np.uint8)
    metrics = [changed_pixels(frame, baseline) for frame in frames]
    baseline_metrics = np.asarray(metrics[:baseline_count], dtype=np.float64)
    baseline_p99 = float(np.percentile(baseline_metrics, 99))
    threshold = max(1800.0, baseline_p99 + max(1400.0, baseline_p99 * 0.8))
    search_start = min(len(frames) - 1, int(round(fps * 4.0)))
    visible = [index for index in range(search_start, len(frames)) if metrics[index] >= threshold]
    peak = max(range(search_start, len(frames)), key=metrics.__getitem__)
    post = len(frames) - 1
    if visible:
        onset = visible[0]
        last = visible[-1]
        steady = min(len(frames) - 1, onset + int(round(fps * 10.0)))
        baseline_index = max(0, onset - int(round(fps * 2.0)))
        samples = [
            (f"baseline {baseline_index / fps:.2f}s", frames[baseline_index]),
            (f"onset {onset / fps:.2f}s", frames[onset]),
            (f"peak {peak / fps:.2f}s", frames[peak]),
            (f"steady {steady / fps:.2f}s", frames[steady]),
            (f"last {last / fps:.2f}s", frames[last]),
            (f"post {post / fps:.2f}s", frames[post]),
        ]
        stills = {
            "baseline": save_frame(proof_root / "validated-baseline.png", frames[baseline_index]),
            "onset": save_frame(proof_root / "validated-onset.png", frames[onset]),
            "peak": save_frame(proof_root / "validated-peak.png", frames[peak]),
            "steady": save_frame(proof_root / "validated-steady.png", frames[steady]),
            "lastVisible": save_frame(proof_root / "validated-last-visible.png", frames[last]),
            "post": save_frame(proof_root / "validated-post.png", frames[post]),
        }
    else:
        onset = None
        last = None
        baseline_index = max(0, search_start - int(round(fps * 2.0)))
        samples = [
            (f"baseline {baseline_index / fps:.2f}s", frames[baseline_index]),
            (f"max delta {peak / fps:.2f}s", frames[peak]),
            (f"post {post / fps:.2f}s", frames[post]),
        ]
        stills = {
            "baseline": save_frame(proof_root / "validated-baseline.png", frames[baseline_index]),
            "maxDelta": save_frame(proof_root / "validated-max-delta.png", frames[peak]),
            "post": save_frame(proof_root / "validated-post.png", frames[post]),
        }
    contact_sheet = create_contact_sheet(proof_root / "validated-contact-sheet.png", samples)
    duration_seconds = float(ledger.get("durationSeconds") or 0)
    duration_coverage = len(frames) / fps >= duration_seconds + 8.0 if duration_seconds > 0 else True
    exactly_one_trigger = ledger.get("observedTriggerLogCount") == 1 and ledger.get("validSingleTrigger") is True
    expected_end_marker = ledger.get("expectedEndLogCount") == 1 if duration_seconds > 0 else True
    checks = {
        "exactlyOneTriggerMarker": exactly_one_trigger,
        "expectedEndMarkerForDuration": expected_end_marker,
        "mp4Decodes": bool(frames),
        "baselineBeforeVisibleEffect": onset is not None and baseline_index < onset,
        "visibleEffectIntervalPresent": bool(visible),
        "captureCoversRequestedDurationPlusMargins": duration_coverage,
        "noAutomaticRetry": summary.get("automaticRetry") is False,
    }
    valid = all(checks.values())
    validated = {
        "version": "aurora-vfx-nwn-broad-validated-proof/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": summary["fixtureId"],
        "runId": summary["runId"],
        "status": "valid-single-trigger-visible-nwn-oracle" if valid else "invalid-nwn-oracle",
        "video": {"path": str(video_path), "sha256": sha256(video_path), "sizeBytes": video_path.stat().st_size},
        "lifecycle": {
            "fps": fps,
            "frameCount": len(frames),
            "durationSeconds": len(frames) / fps,
            "metric": "pixel-count with max-channel absolute delta >= 42 from four-second baseline median",
            "baselineFrameCount": baseline_count,
            "baselineP99": baseline_p99,
            "visibilityThreshold": threshold,
            "onsetFrameIndex": onset,
            "onsetVideoSeconds": onset / fps if onset is not None else None,
            "peakFrameIndex": peak,
            "peakVideoSeconds": peak / fps,
            "peakMetric": metrics[peak],
            "lastVisibleFrameIndex": last,
            "lastVisibleVideoSeconds": last / fps if last is not None else None,
            "requestedDurationSeconds": duration_seconds,
        },
        "stills": stills,
        "contactSheet": contact_sheet,
        "checks": checks,
    }
    output_path = proof_root / "validated-summary.json"
    output_path.write_text(json.dumps(validated, indent=2), encoding="utf-8")
    summary["status"] = validated["status"]
    summary["visualValidation"] = {
        "path": str(output_path),
        "status": validated["status"],
        "validatedAt": validated["generatedAt"],
    }
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps({**validated, "validatedSummary": str(output_path)}, indent=2), flush=True)
    if not valid:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
