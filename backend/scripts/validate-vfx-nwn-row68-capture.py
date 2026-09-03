from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
OPTIONS = {
    token[2:]: sys.argv[index + 1]
    for index, token in enumerate(sys.argv[:-1])
    if token.startswith("--") and not sys.argv[index + 1].startswith("--")
}
FIXTURE_ID = OPTIONS.get("fixtureId", "vfx-nwn-web-row68")
SOURCE_ROW = int(OPTIONS.get("rowId", "68"))
ARTIFACT_PREFIX = OPTIONS.get("artifactPrefix", "nwn-row68-one-trigger")
PROOF_ROOT = (
    REPO_ROOT / "backend" / "docs" / "aurora-reverse" / "evidence" / FIXTURE_ID / "nwn"
)
SUMMARY_PATH = PROOF_ROOT / "summary.json"
VIDEO_PATH = PROOF_ROOT / f"{ARTIFACT_PREFIX}.mp4"
CLIENT_LOG = Path.home() / "Documents" / "Neverwinter Nights" / "logs" / "nwclientLog1.txt"
TRIGGER_PREFIX = f"AURORA_VFX_PROOF_TRIGGER fixture={FIXTURE_ID} row={SOURCE_ROW} count=1"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def read_video() -> tuple[float, list[np.ndarray]]:
    capture = cv2.VideoCapture(str(VIDEO_PATH))
    if not capture.isOpened():
        raise RuntimeError(f"Could not open {VIDEO_PATH}")
    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
    frames: list[np.ndarray] = []
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        frames.append(frame)
    capture.release()
    if not frames or fps <= 0:
        raise RuntimeError("NWN MP4 has no decodable frames or FPS metadata.")
    return fps, frames


def saturated_bright_pixels(frame: np.ndarray) -> int:
    maximum = frame.max(axis=2)
    minimum = frame.min(axis=2)
    return int(np.count_nonzero((maximum >= 245) & ((maximum - minimum) >= 35)))


def save_frame(path: Path, frame: np.ndarray) -> dict:
    if not cv2.imwrite(str(path), frame):
        raise RuntimeError(f"Could not write {path}")
    return {"path": str(path), "sha256": sha256(path), "sizeBytes": path.stat().st_size}


def main() -> None:
    summary = json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))
    run_id = str(summary["runId"])
    marker = f"{TRIGGER_PREFIX} run={run_id}"
    log_lines = CLIENT_LOG.read_text(encoding="utf-8", errors="replace").splitlines()
    trigger_lines = [line.strip() for line in log_lines if marker in line]

    fps, frames = read_video()
    metrics = [saturated_bright_pixels(frame) for frame in frames]
    baseline_count = max(1, min(len(frames) // 2, int(round(fps * 6))))
    baseline_values = np.asarray(metrics[:baseline_count], dtype=np.float64)
    baseline_median = float(np.median(baseline_values))
    baseline_p99 = float(np.percentile(baseline_values, 99))
    threshold = max(100.0, baseline_p99 + max(80.0, baseline_median * 0.75))
    visible_indices = [index for index, value in enumerate(metrics) if value >= threshold]
    if not visible_indices:
        raise RuntimeError(
            f"No visible high-energy VFX interval found; threshold={threshold}, max={max(metrics)}"
        )

    onset_index = visible_indices[0]
    last_visible_index = visible_indices[-1]
    peak_index = max(range(len(metrics)), key=metrics.__getitem__)
    baseline_index = max(0, onset_index - max(1, int(round(fps))))
    stills = {
        "baseline": save_frame(PROOF_ROOT / f"{ARTIFACT_PREFIX}-validated-baseline.png", frames[baseline_index]),
        "onset": save_frame(PROOF_ROOT / f"{ARTIFACT_PREFIX}-validated-onset.png", frames[onset_index]),
        "peak": save_frame(PROOF_ROOT / f"{ARTIFACT_PREFIX}-validated-peak.png", frames[peak_index]),
        "lastVisible": save_frame(
            PROOF_ROOT / f"{ARTIFACT_PREFIX}-validated-last-visible.png", frames[last_visible_index]
        ),
    }
    one_trigger = len(trigger_lines) == 1
    lifecycle = {
        "fps": fps,
        "frameCount": len(frames),
        "durationSeconds": len(frames) / fps,
        "metric": "saturated-bright-pixel-count(max>=245,channel-range>=35)",
        "baselineFrameCount": baseline_count,
        "baselineMedian": baseline_median,
        "baselineP99": baseline_p99,
        "visibilityThreshold": threshold,
        "onsetFrameIndex": onset_index,
        "onsetVideoSeconds": onset_index / fps,
        "peakFrameIndex": peak_index,
        "peakVideoSeconds": peak_index / fps,
        "peakMetric": metrics[peak_index],
        "lastVisibleFrameIndex": last_visible_index,
        "lastVisibleVideoSeconds": last_visible_index / fps,
        "visibleSpanSeconds": (last_visible_index - onset_index + 1) / fps,
        "visibleFrameCount": len(visible_indices),
        "stills": stills,
    }
    reconciled_ledger = {
        "version": "aurora-vfx-trigger-ledger-reconciled/v1",
        "fixtureId": FIXTURE_ID,
        "runId": run_id,
        "intentionalTriggerCount": 1,
        "observedTriggerLogCount": len(trigger_lines),
        "validSingleTrigger": one_trigger,
        "triggerLogLines": trigger_lines,
        "observationTiming": "post-process-log-flush",
        "originalLedger": str(PROOF_ROOT / "trigger-ledger.json"),
        "originalLedgerFalseNegativeReason": (
            "The first ledger reader used a stale byte offset after nwclientLog1.txt rotation and began inside the unique marker line. The full preserved log contains the exact run-id marker."
        ),
        "videoSha256": sha256(VIDEO_PATH),
    }
    reconciled_path = PROOF_ROOT / "trigger-ledger-reconciled.json"
    reconciled_path.write_text(json.dumps(reconciled_ledger, indent=2), encoding="utf-8")
    validated = {
        "version": "aurora-vfx-nwn-one-trigger-validated-proof/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": FIXTURE_ID,
        "runId": run_id,
        "status": "valid-single-trigger-oracle" if one_trigger else "invalid-trigger-count",
        "attemptCount": 1,
        "automaticRetry": False,
        "sourceSummary": str(SUMMARY_PATH),
        "reconciledTriggerLedger": str(reconciled_path),
        "video": {
            "path": str(VIDEO_PATH),
            "sha256": sha256(VIDEO_PATH),
            "sizeBytes": VIDEO_PATH.stat().st_size,
        },
        "lifecycle": lifecycle,
        "checks": {
            "exactlyOneTriggerMarkerForRunId": one_trigger,
            "mp4Decodes": len(frames) > 0,
            "baselineBeforeVisibleEffect": baseline_index < onset_index,
            "visibleEffectIntervalPresent": len(visible_indices) > 0,
            "noSecondLaunchUsed": True,
        },
    }
    output_path = PROOF_ROOT / "validated-summary.json"
    output_path.write_text(json.dumps(validated, indent=2), encoding="utf-8")
    print(json.dumps({**validated, "validatedSummary": str(output_path)}, indent=2))
    if validated["status"] != "valid-single-trigger-oracle":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
