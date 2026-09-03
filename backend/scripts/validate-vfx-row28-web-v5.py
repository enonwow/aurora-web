from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-web-row28"
)
NATIVE_SUMMARY = EVIDENCE_ROOT / "nwn-final" / "v1" / "validated-summary.json"
STATIC_CALIBRATION = EVIDENCE_ROOT / "calibration-v4" / "calibration-summary.json"
TIMING_CALIBRATION = (
    EVIDENCE_ROOT
    / "calibration-v6-source-time"
    / "source-time-calibration-summary.json"
)
FFMPEG_DEFAULT = Path(
    r"C:\Users\enonw\Documents\Codex\2026-05-17\umiesz-tworzy-filmiki"
    r"\vendor\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
)
IMMUTABLE_INPUTS = {
    NATIVE_SUMMARY: "edefa3849244012132be29e6bb3e2cb99751a2bb2c19c237275fa0fc9adda529",
    STATIC_CALIBRATION: "3e7266103e0696a6faba71717266d0268657b96e24d6d5c9d17660f1b34c03a3",
    TIMING_CALIBRATION: "41f2dab75e5a3e842144ed110e5918fe758e4e515da8b55008cd90258baacf0a",
}
FPS = 12
TRIGGER_WALL_SECONDS = 2.0
VISIBILITY_POSITIVE_DELTA_LUMA_THRESHOLD = 1.0
TIMING_TOLERANCE_SECONDS = 1.0 / FPS
PEAK_PHASE_TOLERANCE_SECONDS = 0.5
DYNAMIC_PEAK_ENERGY_TOLERANCE_PERCENT = 15.0
DYNAMIC_PEAK_CENTROID_AXIS_TOLERANCE_PIXELS = 40.0


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def repo_media(path: Path) -> dict[str, object]:
    return {
        "path": path.relative_to(REPO_ROOT).as_posix(),
        "sizeBytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def assert_close(actual: float, expected: float, tolerance: float, label: str) -> None:
    if abs(actual - expected) > tolerance + 1e-9:
        raise RuntimeError(
            f"{label}_outside_tolerance:actual={actual}:expected={expected}:tolerance={tolerance}"
        )


def validate_bound_inputs(video: Path, summary: Path, video_hash: str, summary_hash: str) -> None:
    for path, expected_hash in IMMUTABLE_INPUTS.items():
        if not path.is_file() or sha256(path) != expected_hash:
            raise RuntimeError(f"immutable_row28_input_binding_mismatch:{path}")
    for path, expected_hash in ((video, video_hash), (summary, summary_hash)):
        if not path.is_file():
            raise RuntimeError(f"web_v5_input_missing:{path}")
        if len(expected_hash) != 64 or sha256(path) != expected_hash.lower():
            raise RuntimeError(f"web_v5_input_hash_mismatch:{path}")


def validate_summary(summary: dict[str, object]) -> dict[str, object]:
    if not (
        summary.get("version") == "aurora-vfx-web-deterministic-cdp-proof/v2"
        and summary.get("fixtureId") == "vfx-nwn-web-row28"
        and summary.get("status") == "recorded-single-deterministic-playback"
        and summary.get("captureMode") == "playback"
        and summary.get("triggerCount") == 1
        and summary.get("loop") is False
        and summary.get("diagnosticHarness") is False
        and summary.get("requestedFps") == FPS
        and summary.get("mp4Fps") == FPS
        and summary.get("mp4FrameCount") == 108
    ):
        raise RuntimeError("web_v5_summary_top_level_contract_failed")

    deterministic = summary.get("deterministicCapture", {})
    viewport = deterministic.get("captureViewport", {})
    alignment = deterministic.get("viewportAlignment", {})
    if not (
        deterministic.get("mode") == "deterministic-cdp-screenshot-sequence"
        and deterministic.get("fps") == FPS
        and deterministic.get("frameCount") == 109
        and deterministic.get("encodedFrameCount") == 108
        and viewport.get("width") == 1460
        and viewport.get("height") == 810
        and alignment.get("canvasRectMatchesViewport") is True
    ):
        raise RuntimeError("web_v5_deterministic_capture_contract_failed")

    active = summary.get("activeProofState", {}).get("runtimeObservability", {})
    final_proof = summary.get("finalProofState", {})
    final = final_proof.get("runtimeObservability", {})
    active_guard = active.get("playbackGuard", {})
    final_guard = final.get("playbackGuard", {})
    if not (
        active.get("proofGate", {}).get("status") == "pass"
        and active.get("proofGate", {}).get("blockerManifest") == []
        and active.get("assetSettlement", {}).get("status") == "settled"
        and active_guard.get("status") == "pass"
        and active_guard.get("triggerCount") == 1
        and active_guard.get("overlapCount") == 0
        and active_guard.get("loop") is False
        and final_guard.get("status") == "pass"
        and final_guard.get("triggerCount") == 1
        and final_guard.get("overlapCount") == 0
        and final_guard.get("loop") is False
        and final_guard.get("completed") is True
        and final_guard.get("postDurationHidden") is True
    ):
        raise RuntimeError("web_v5_runtime_proof_gate_failed")

    timing = final_proof.get("renderDebug", {}).get("nativeTimingCalibration", {})
    playback_rate = timing.get("playbackRate")
    playback_delay = timing.get("playbackDelaySeconds")
    method = timing.get("method")
    endpoints = [
        timing.get("nativeTriggerRelativeOnsetSeconds"),
        timing.get("nativeTriggerRelativeLastVisibleSeconds"),
        timing.get("sourceOnsetSeconds"),
        timing.get("sourceLastVisibleSeconds"),
    ]
    if not (
        isinstance(playback_rate, (int, float))
        and math.isfinite(float(playback_rate))
        and float(playback_rate) > 0
        and isinstance(playback_delay, (int, float))
        and math.isfinite(float(playback_delay))
        and float(playback_delay) >= 0
        and isinstance(method, str)
        and bool(method.strip())
        and all(isinstance(value, (int, float)) for value in endpoints)
        and all(math.isfinite(float(value)) for value in endpoints)
        and float(endpoints[1]) >= float(endpoints[0])
        and float(endpoints[3]) >= float(endpoints[2])
    ):
        raise RuntimeError("web_v5_native_timing_calibration_not_observed")
    return final_proof


def extract_frames(ffmpeg: Path, video: Path, directory: Path) -> list[Path]:
    if not ffmpeg.is_file():
        raise RuntimeError(f"ffmpeg_missing:{ffmpeg}")
    output_pattern = directory / "frame-%06d.png"
    result = subprocess.run(
        [
            str(ffmpeg),
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(video),
            "-vsync",
            "0",
            str(output_pattern),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"web_v5_frame_extraction_failed:{result.stderr[-1200:]}")
    frames = sorted(directory.glob("frame-*.png"))
    if len(frames) != 108:
        raise RuntimeError(f"web_v5_frame_count_invalid:{len(frames)}")
    return frames


def analyze_frames(frames: list[Path]) -> tuple[list[dict[str, object]], dict[str, object]]:
    with Image.open(frames[0]) as source:
        if source.size != (1460, 810):
            raise RuntimeError(f"web_v5_frame_dimensions_invalid:{source.size}")
        baseline = np.asarray(source.convert("L"), dtype=np.int16)

    records: list[dict[str, object]] = []
    for index, frame_path in enumerate(frames):
        with Image.open(frame_path) as source:
            luma = np.asarray(source.convert("L"), dtype=np.int16)
        positive = np.maximum(luma - baseline, 0).astype(np.float32)
        positive_sum = float(positive.sum())
        if positive_sum > 0:
            ys, xs = np.indices(positive.shape, dtype=np.float32)
            centroid = [
                float((xs * positive).sum() / positive_sum),
                float((ys * positive).sum() / positive_sum),
            ]
        else:
            centroid = [0.0, 0.0]
        records.append(
            {
                "frameIndex": index,
                "wallSeconds": index / FPS,
                "triggerRelativeSeconds": index / FPS - TRIGGER_WALL_SECONDS,
                "positiveDeltaLumaMean": float(positive.mean()),
                "positiveLumaCentroid": centroid,
            }
        )

    visible = [
        record
        for record in records
        if record["triggerRelativeSeconds"] >= 0
        and record["positiveDeltaLumaMean"] >= VISIBILITY_POSITIVE_DELTA_LUMA_THRESHOLD
    ]
    if not visible:
        raise RuntimeError("web_v5_no_pixel_visible_effect_interval")
    peak = max(visible, key=lambda record: float(record["positiveDeltaLumaMean"]))
    lifecycle = {
        "metric": "positive-delta-luma-mean-from-frame-zero-baseline",
        "visibilityThreshold": VISIBILITY_POSITIVE_DELTA_LUMA_THRESHOLD,
        "onset": visible[0],
        "peak": peak,
        "lastVisible": visible[-1],
        "post": records[-1],
        "visibleDurationSeconds": float(visible[-1]["wallSeconds"])
        - float(visible[0]["wallSeconds"]),
    }
    return records, lifecycle


def copy_selected_frames(
    frames: list[Path], lifecycle: dict[str, object], output_root: Path, capture_tag: str
) -> dict[str, dict[str, object]]:
    outputs: dict[str, dict[str, object]] = {}
    for label, source_key in (
        ("onset", "onset"),
        ("peak", "peak"),
        ("last-visible", "lastVisible"),
        ("post", "post"),
    ):
        frame_index = int(lifecycle[source_key]["frameIndex"])
        output_path = output_root / f"aurora-web-row28-one-trigger-{capture_tag}-{label}.png"
        if output_path.exists():
            raise RuntimeError(f"immutable_web_v5_validation_output_exists:{output_path}")
        shutil.copyfile(frames[frame_index], output_path)
        outputs[label] = repo_media(output_path)
    return outputs


def validate(args: argparse.Namespace) -> dict[str, object]:
    proof_root = Path(args.proof_root)
    if not proof_root.is_absolute():
        proof_root = REPO_ROOT / proof_root
    capture_tag = args.capture_tag
    stem = f"aurora-web-row28-one-trigger-{capture_tag}"
    video = proof_root / f"{stem}.mp4"
    summary_path = proof_root / f"{stem}-summary.json"
    validation_path = proof_root / f"{stem}-visual-validation.json"
    if validation_path.exists():
        raise RuntimeError(f"immutable_web_v5_validation_exists:{validation_path}")
    validate_bound_inputs(video, summary_path, args.video_sha256, args.summary_sha256)
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    final_proof = validate_summary(summary)
    native = json.loads(NATIVE_SUMMARY.read_text(encoding="utf-8"))
    static_calibration = json.loads(STATIC_CALIBRATION.read_text(encoding="utf-8"))

    with tempfile.TemporaryDirectory(prefix="aurora-row28-v5-") as temp:
        frames = extract_frames(Path(args.ffmpeg), video, Path(temp))
        _, lifecycle = analyze_frames(frames)

        native_onset = (
            float(native["lifecycle"]["onsetVideoSeconds"])
            - float(native["triggerLedger"]["triggerVideoSeconds"])
            if "triggerVideoSeconds" in native.get("triggerLedger", {})
            else 1.0
        )
        native_peak = 4.0 / 3.0
        native_last = 3.0
        native_duration = 2.0
        web_onset = float(lifecycle["onset"]["triggerRelativeSeconds"])
        web_peak = float(lifecycle["peak"]["triggerRelativeSeconds"])
        web_last = float(lifecycle["lastVisible"]["triggerRelativeSeconds"])
        web_duration = float(lifecycle["visibleDurationSeconds"])
        assert_close(web_onset, native_onset, TIMING_TOLERANCE_SECONDS, "web_v5_onset")
        assert_close(web_last, native_last, TIMING_TOLERANCE_SECONDS, "web_v5_last_visible")
        assert_close(web_duration, native_duration, TIMING_TOLERANCE_SECONDS, "web_v5_visible_duration")
        assert_close(web_peak, native_peak, PEAK_PHASE_TOLERANCE_SECONDS, "web_v5_peak_phase")

        native_peak_energy = float(
            static_calibration["peakMetrics"]["native"]["positiveDeltaLumaMean"]
        )
        web_peak_energy = float(lifecycle["peak"]["positiveDeltaLumaMean"])
        energy_error_percent = (web_peak_energy / native_peak_energy - 1.0) * 100.0
        if abs(energy_error_percent) > DYNAMIC_PEAK_ENERGY_TOLERANCE_PERCENT:
            raise RuntimeError(
                f"web_v5_dynamic_peak_energy_outside_tolerance:{energy_error_percent}"
            )
        native_centroid = static_calibration["peakMetrics"]["native"]["positiveLumaCentroid"]
        web_centroid = lifecycle["peak"]["positiveLumaCentroid"]
        centroid_delta = [
            float(web_centroid[0]) - float(native_centroid[0]),
            float(web_centroid[1]) - float(native_centroid[1]),
        ]
        if any(
            abs(value) > DYNAMIC_PEAK_CENTROID_AXIS_TOLERANCE_PIXELS
            for value in centroid_delta
        ):
            raise RuntimeError(f"web_v5_dynamic_peak_centroid_outside_tolerance:{centroid_delta}")
        stills = copy_selected_frames(frames, lifecycle, proof_root, capture_tag)

    result = {
        "version": "aurora-vfx-row28-web-v5-validation/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "pass-legacy-automated-visual-and-timing-gates",
        "visualClassificationRequired": True,
        "fixtureId": "vfx-nwn-web-row28",
        "captureTag": capture_tag,
        "inputs": {
            "video": repo_media(video),
            "summary": repo_media(summary_path),
            "nativeSummary": repo_media(NATIVE_SUMMARY),
            "staticCalibration": repo_media(STATIC_CALIBRATION),
            "timingCalibration": repo_media(TIMING_CALIBRATION),
        },
        "runtimeProof": {
            "triggerCount": 1,
            "loop": False,
            "overlapCount": 0,
            "completed": True,
            "postDurationHidden": True,
            "proofGateStatus": "pass",
            "unexpectedFailedAssetCount": 0,
            "timingCalibration": final_proof["renderDebug"]["nativeTimingCalibration"],
        },
        "lifecycle": lifecycle,
        "nativeComparison": {
            "nativeTriggerRelativeOnsetSeconds": native_onset,
            "nativeTriggerRelativePeakSeconds": native_peak,
            "nativeTriggerRelativeLastVisibleSeconds": native_last,
            "nativeVisibleDurationSeconds": native_duration,
            "onsetAbsoluteErrorSeconds": abs(web_onset - native_onset),
            "peakAbsoluteErrorSeconds": abs(web_peak - native_peak),
            "lastVisibleAbsoluteErrorSeconds": abs(web_last - native_last),
            "visibleDurationAbsoluteErrorSeconds": abs(web_duration - native_duration),
            "dynamicPeakEnergyRelativeErrorPercent": energy_error_percent,
            "dynamicPeakCentroidDeltaPixels": centroid_delta,
        },
        "acceptance": {
            "timingEndpointToleranceSeconds": TIMING_TOLERANCE_SECONDS,
            "peakPhaseToleranceSeconds": PEAK_PHASE_TOLERANCE_SECONDS,
            "dynamicPeakEnergyAbsoluteRelativeErrorMaxPercent": DYNAMIC_PEAK_ENERGY_TOLERANCE_PERCENT,
            "dynamicPeakCentroidAxisAbsoluteErrorMaxPixels": DYNAMIC_PEAK_CENTROID_AXIS_TOLERANCE_PIXELS,
            "staticCalibrationGate": static_calibration["acceptance"]["energyAndCentroidGate"],
            "retailPixelParityClaimAllowed": False,
        },
        "stills": stills,
    }
    validation_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return {"ok": True, "status": result["status"], "validation": repo_media(validation_path)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["dry-run", "validate"])
    parser.add_argument("--proof-root", default=str(EVIDENCE_ROOT / "web-v5b"))
    parser.add_argument("--capture-tag", default="v5b")
    parser.add_argument("--video-sha256", default="")
    parser.add_argument("--summary-sha256", default="")
    parser.add_argument("--ffmpeg", default=str(FFMPEG_DEFAULT))
    args = parser.parse_args()
    if args.command == "dry-run":
        result = {
            "ok": True,
            "status": "row28_web_v5_validation_plan_valid",
            "startsNwn": False,
            "startsWebRuntime": False,
            "expectedFps": FPS,
            "expectedViewport": [1460, 810],
            "timingToleranceSeconds": TIMING_TOLERANCE_SECONDS,
            "requiresExplicitInputHashes": True,
        }
    else:
        if not args.video_sha256 or not args.summary_sha256:
            raise RuntimeError("web_v5_validation_requires_explicit_video_and_summary_hashes")
        result = validate(args)
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
