import argparse
import csv
import json
from pathlib import Path

import cv2
import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
ARTIFACT_ROOT = REPO_ROOT / "backend" / "docs" / "aurora-reverse" / "artifacts" / "vfx-catalog-lab-map"
CLIPS_CSV = ARTIFACT_ROOT / "vfx-capture-clips.csv"
OUTPUT_DIR = REPO_ROOT / ".codex-tmp" / "aurora-live-evidence" / "vfx-capture-clips" / "all-v2"
MIN_DONE_BYTES = 8192


def classify_delta(max_mean_delta, max_changed_ratio):
    if max_changed_ratio < 0.002 and max_mean_delta < 1.5:
        return "probably_no_visible_delta"
    if max_changed_ratio < 0.01 and max_mean_delta < 3.0:
        return "weak_delta"
    return "visible_delta"


def compact_gray(frame, width=320):
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    if gray.shape[1] <= width:
        return gray
    height = max(1, int(gray.shape[0] * (width / gray.shape[1])))
    return cv2.resize(gray, (width, height), interpolation=cv2.INTER_AREA)


def verify_clip(path, max_frames, sample_step):
    if not path.exists():
        return {"status": "missing"}
    size_bytes = path.stat().st_size
    if size_bytes < MIN_DONE_BYTES:
        return {"status": "incomplete", "sizeBytes": size_bytes}

    cap = cv2.VideoCapture(str(path))
    if not cap.isOpened():
        return {"status": "unreadable", "sizeBytes": size_bytes}

    baseline = None
    previous = None
    frame_count = 0
    sampled_frames = 0
    max_mean_delta = 0.0
    max_changed_ratio = 0.0
    max_temporal_mean_delta = 0.0

    try:
        while sampled_frames < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            frame_count += 1
            sampled_frames += 1
            gray = compact_gray(frame)
            if baseline is None:
                baseline = gray
                previous = gray
                for _ in range(max(0, sample_step - 1)):
                    cap.grab()
                continue

            diff = cv2.absdiff(gray, baseline)
            temporal = cv2.absdiff(gray, previous)
            max_mean_delta = max(max_mean_delta, float(np.mean(diff)))
            max_changed_ratio = max(max_changed_ratio, float(np.mean(diff > 18)))
            max_temporal_mean_delta = max(max_temporal_mean_delta, float(np.mean(temporal)))
            previous = gray
            for _ in range(max(0, sample_step - 1)):
                cap.grab()
    finally:
        cap.release()

    if baseline is None or sampled_frames < 3:
        return {
            "status": "too_short",
            "sizeBytes": size_bytes,
            "sampledFrames": sampled_frames,
        }

    return {
        "status": classify_delta(max_mean_delta, max_changed_ratio),
        "sizeBytes": size_bytes,
        "sampledFrames": sampled_frames,
        "maxMeanDelta": round(max_mean_delta, 4),
        "maxChangedRatio": round(max_changed_ratio, 6),
        "maxTemporalMeanDelta": round(max_temporal_mean_delta, 4),
    }


def read_clip_rows(path):
    with path.open("r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-frames", type=int, default=48)
    parser.add_argument("--sample-step", type=int, default=2)
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    parser.add_argument("--csv", type=Path, default=CLIPS_CSV)
    args = parser.parse_args()

    rows = read_clip_rows(args.csv)
    results = []
    for row in rows:
        file_name = row["suggestedFileName"]
        result = verify_clip(args.output_dir / file_name, args.max_frames, args.sample_step)
        results.append(
            {
                "scriptName": row["scriptName"],
                "targetMode": row["targetMode"],
                "captureMode": row.get("captureMode"),
                "sequenceIndex": row["sequenceIndex"],
                "rowId": row["rowId"],
                "label": row["label"],
                "suggestedFileName": file_name,
                **result,
            }
        )

    counts = {}
    for result in results:
        counts[result["status"]] = counts.get(result["status"], 0) + 1

    args.output_dir.mkdir(parents=True, exist_ok=True)
    csv_path = args.output_dir / "capture-visual-verification.csv"
    json_path = args.output_dir / "capture-visual-verification.json"
    fields = [
        "scriptName",
        "targetMode",
        "captureMode",
        "sequenceIndex",
        "rowId",
        "label",
        "suggestedFileName",
        "status",
        "sizeBytes",
        "sampledFrames",
        "maxMeanDelta",
        "maxChangedRatio",
        "maxTemporalMeanDelta",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(results)

    json_path.write_text(
        json.dumps(
            {
                "version": "aurora-vfx-capture-visual-verification/v1",
                "clipCount": len(results),
                "counts": counts,
                "results": results,
            },
            indent=2,
        ),
        encoding="utf-8",
    )

    print(json.dumps({"csv": str(csv_path), "json": str(json_path), "counts": counts}, indent=2))


if __name__ == "__main__":
    main()
