from __future__ import annotations

import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import cv2
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[2]
ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-broad-proof-2026-07-16"
)
COMPARISON_ROOT = ROOT / "comparisons"
MANIFEST_PATH = (
    COMPARISON_ROOT
    / "broad-nwn-vs-aurora-web-comparison-manifest-pixel-aligned-v3.json"
)
OUTPUT_PATH = COMPARISON_ROOT / "comparison-validation-pixel-aligned-v3.json"
FFMPEG_PATH = Path(
    os.environ.get(
        "FFMPEG_PATH",
        "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
        "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
    )
)


def sha256(file_path: Path) -> str:
    digest = hashlib.sha256()
    with file_path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_record(record: dict[str, object], label: str) -> Path:
    file_path = Path(str(record["path"]))
    if not file_path.exists():
        raise RuntimeError(f"{label} is missing: {file_path}")
    if file_path.stat().st_size != int(record["sizeBytes"]):
        raise RuntimeError(f"{label} size mismatch: {file_path}")
    if sha256(file_path) != record["sha256"]:
        raise RuntimeError(f"{label} SHA-256 mismatch: {file_path}")
    return file_path


def video_metadata(file_path: Path) -> dict[str, object]:
    capture = cv2.VideoCapture(str(file_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video: {file_path}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fourcc_value = int(capture.get(cv2.CAP_PROP_FOURCC))
    capture.release()
    fourcc = "".join(chr((fourcc_value >> (8 * index)) & 0xFF) for index in range(4))
    return {
        "fps": fps,
        "frameCount": frames,
        "durationSeconds": frames / fps,
        "width": width,
        "height": height,
        "fourcc": fourcc,
    }


def assert_faststart(file_path: Path) -> dict[str, int]:
    data = file_path.read_bytes()
    moov = data.find(b"moov")
    mdat = data.find(b"mdat")
    if moov < 0 or mdat < 0 or moov >= mdat:
        raise RuntimeError(f"MP4 is not faststart/moov-first: {file_path}")
    return {"moovOffset": moov, "mdatOffset": mdat}


def decode(file_path: Path) -> None:
    result = subprocess.run(
        [str(FFMPEG_PATH), "-v", "error", "-i", str(file_path), "-f", "null", "-"],
        cwd=REPO_ROOT,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Video decode failed: {file_path}\n{result.stderr[-1200:]}")


def validate_video(
    record: dict[str, object], label: str, expected_duration: float | None = None
) -> dict[str, object]:
    file_path = assert_record(record, label)
    metadata = video_metadata(file_path)
    if metadata["width"] != 1280 or metadata["height"] != 444:
        raise RuntimeError(f"{label} dimensions are invalid: {metadata}")
    if abs(float(metadata["fps"]) - 8.0) > 0.01:
        raise RuntimeError(f"{label} fps is not 8: {metadata}")
    if str(metadata["fourcc"]).lower() not in {"avc1", "h264"}:
        raise RuntimeError(f"{label} is not H.264: {metadata}")
    if expected_duration is not None and abs(float(metadata["durationSeconds"]) - expected_duration) > 0.2:
        raise RuntimeError(
            f"{label} duration differs from the manifest: {metadata['durationSeconds']} vs {expected_duration}"
        )
    faststart = assert_faststart(file_path)
    decode(file_path)
    return {"path": str(file_path), **metadata, **faststart}


def main() -> None:
    if not FFMPEG_PATH.exists():
        raise RuntimeError(f"ffmpeg is missing: {FFMPEG_PATH}")
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    if manifest["fixtureCount"] != 10 or len(manifest["entries"]) != 10:
        raise RuntimeError("Comparison manifest does not contain ten fixtures.")
    if manifest["proofRules"]["nwnRecordingsReusedWithoutRerun"] is not True:
        raise RuntimeError("Manifest does not preserve the saved-NWN-oracle rule.")
    if manifest["proofRules"]["canonicalVisualParityPromoted"] is not False:
        raise RuntimeError("Manifest incorrectly promotes visual parity.")

    results = []
    for entry in manifest["entries"]:
        if entry["status"] != "comparison-ready-open-parity-gaps":
            raise RuntimeError(f"Unexpected comparison status: {entry['slug']}")
        if not entry["openParityGaps"]:
            raise RuntimeError(f"Open gap list is empty: {entry['slug']}")
        if entry["nwn"]["recordingReusedWithoutRerun"] is not True:
            raise RuntimeError(f"NWN reuse marker is false: {entry['slug']}")
        metadata = validate_video(
            entry["comparison"]["video"],
            f"{entry['slug']} comparison",
            float(entry["comparison"]["durationSeconds"]),
        )
        results.append(
            {
                "slug": entry["slug"],
                "status": "valid-pixel-aligned-comparison",
                "openParityGapCount": len(entry["openParityGaps"]),
                "video": metadata,
            }
        )

    overview = validate_video(manifest["overview"], "overview")
    full_set = validate_video(manifest["fullSet"], "full set")
    contact_path = assert_record(manifest["contactSheet"], "contact sheet")
    with Image.open(contact_path) as contact:
        contact_size = contact.size
    if contact_size != (1280, 1190):
        raise RuntimeError(f"Contact sheet dimensions are invalid: {contact_size}")

    output = {
        "version": "aurora-vfx-broad-comparison-validation/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "valid-10-fixture-pixel-aligned-comparison-set",
        "manifest": {
            "path": str(MANIFEST_PATH),
            "sizeBytes": MANIFEST_PATH.stat().st_size,
            "sha256": sha256(MANIFEST_PATH),
        },
        "checks": {
            "fixtureCount": 10,
            "allComparisonVideosDecode": True,
            "allComparisonVideosH264": True,
            "allComparisonVideosFaststart": True,
            "allComparisonVideosEightFps": True,
            "allComparisonVideos1280x444": True,
            "allNwnOraclesReusedWithoutRerun": True,
            "canonicalVisualParityPromoted": False,
        },
        "overview": overview,
        "fullSet": full_set,
        "contactSheet": {"path": str(contact_path), "width": 1280, "height": 1190},
        "results": results,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2), encoding="ascii")
    print(json.dumps({"output": str(OUTPUT_PATH), "status": output["status"]}, indent=2))


if __name__ == "__main__":
    main()
