from __future__ import annotations

import argparse
import importlib.util
import json
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image


BASE_VALIDATOR_PATH = Path(__file__).with_name("validate-vfx-row28-web-v5.py")
BASE_SPEC = importlib.util.spec_from_file_location("aurora_row28_web_v5_validator", BASE_VALIDATOR_PATH)
if BASE_SPEC is None or BASE_SPEC.loader is None:
    raise RuntimeError("row28_web_v6_base_validator_import_failed")
base = importlib.util.module_from_spec(BASE_SPEC)
BASE_SPEC.loader.exec_module(base)

REPO_ROOT = base.REPO_ROOT
EVIDENCE_ROOT = base.EVIDENCE_ROOT
NATIVE_SUMMARY = base.NATIVE_SUMMARY
STATIC_CALIBRATION = base.STATIC_CALIBRATION
TIMING_CALIBRATION = (
    EVIDENCE_ROOT
    / "calibration-v18-client-animation-rate"
    / "source-aligned-playback-calibration-summary.json"
)
IMMUTABLE_INPUTS = {
    NATIVE_SUMMARY: "edefa3849244012132be29e6bb3e2cb99751a2bb2c19c237275fa0fc9adda529",
    STATIC_CALIBRATION: "3e7266103e0696a6faba71717266d0268657b96e24d6d5c9d17660f1b34c03a3",
    TIMING_CALIBRATION: "d22e85452db810c32b7e162c82360760238c56ef3dbe8ff899ffbbec7f771b26",
}
FFMPEG_DEFAULT = base.FFMPEG_DEFAULT
FPS = base.FPS
TRIGGER_WALL_SECONDS = base.TRIGGER_WALL_SECONDS
TIMING_TOLERANCE_SECONDS = base.TIMING_TOLERANCE_SECONDS
PEAK_PHASE_TOLERANCE_SECONDS = base.PEAK_PHASE_TOLERANCE_SECONDS
VISUAL_ANCHOR_ENERGY_TOLERANCE_PERCENT = 15.0
VISUAL_ANCHOR_CENTROID_AXIS_TOLERANCE_PIXELS = 40.0
VISUAL_ANCHOR_FRAME_TOLERANCE_SECONDS = 0.5 / FPS


def validate_bound_inputs(
    video: Path, summary: Path, video_hash: str, summary_hash: str
) -> None:
    for path, expected_hash in IMMUTABLE_INPUTS.items():
        if not path.is_file() or base.sha256(path) != expected_hash:
            raise RuntimeError(f"immutable_row28_v6_input_binding_mismatch:{path}")
    for path, expected_hash in ((video, video_hash), (summary, summary_hash)):
        if not path.is_file():
            raise RuntimeError(f"web_v6_input_missing:{path}")
        if len(expected_hash) != 64 or base.sha256(path) != expected_hash.lower():
            raise RuntimeError(f"web_v6_input_hash_mismatch:{path}")


def nearest_record(records: list[dict[str, object]], target_seconds: float) -> dict[str, object]:
    return min(
        records,
        key=lambda record: abs(float(record["triggerRelativeSeconds"]) - target_seconds),
    )


def analyze_frames_with_native_lifecycle_metric(
    frames: list[Path],
) -> tuple[list[dict[str, object]], dict[str, object]]:
    with Image.open(frames[0]) as source:
        if source.size != (1460, 810):
            raise RuntimeError(f"web_v6_frame_dimensions_invalid:{source.size}")
        baseline_luma = np.asarray(source.convert("L"), dtype=np.int16)

    records: list[dict[str, object]] = []
    for index, frame_path in enumerate(frames):
        with Image.open(frame_path) as source:
            rgb = np.asarray(source.convert("RGB"), dtype=np.int16)
            luma = np.asarray(source.convert("L"), dtype=np.int16)
        maximum = rgb.max(axis=2)
        minimum = rgb.min(axis=2)
        saturated_bright_count = int(
            np.count_nonzero((maximum >= 245) & ((maximum - minimum) >= 35))
        )
        positive = np.maximum(luma - baseline_luma, 0).astype(np.float32)
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
                "saturatedBrightPixelCount": saturated_bright_count,
                "positiveDeltaLumaMean": float(positive.mean()),
                "positiveLumaCentroid": centroid,
            }
        )

    baseline_count = int(round(TRIGGER_WALL_SECONDS * FPS))
    baseline_metrics = np.asarray(
        [record["saturatedBrightPixelCount"] for record in records[:baseline_count]],
        dtype=np.float64,
    )
    baseline_median = float(np.median(baseline_metrics))
    baseline_p99 = float(np.percentile(baseline_metrics, 99))
    threshold = max(1000.0, baseline_p99 + max(750.0, baseline_p99 * 1.5))
    visible = [
        record
        for record in records
        if record["triggerRelativeSeconds"] >= 0
        and record["saturatedBrightPixelCount"] >= threshold
    ]
    if not visible:
        raise RuntimeError("web_v6_no_native_metric_visible_effect_interval")
    peak = max(visible, key=lambda record: int(record["saturatedBrightPixelCount"]))
    lifecycle = {
        "metric": "saturated-bright-pixel-count(max>=245,channel-range>=35)",
        "baselineFrameCount": baseline_count,
        "baselineMedian": baseline_median,
        "baselineP99": baseline_p99,
        "visibilityThreshold": threshold,
        "onset": visible[0],
        "peak": peak,
        "lastVisible": visible[-1],
        "post": records[-1],
        "visibleDurationSeconds": float(visible[-1]["wallSeconds"])
        - float(visible[0]["wallSeconds"]),
    }
    return records, lifecycle


def copy_selected_frames(
    frames: list[Path],
    lifecycle: dict[str, object],
    visual_anchor: dict[str, object],
    output_root: Path,
    capture_tag: str,
) -> dict[str, dict[str, object]]:
    selected = {
        "onset": lifecycle["onset"],
        "dynamic-peak": lifecycle["peak"],
        "visual-anchor": visual_anchor,
        "last-visible": lifecycle["lastVisible"],
        "post": lifecycle["post"],
    }
    outputs: dict[str, dict[str, object]] = {}
    for label, record in selected.items():
        frame_index = int(record["frameIndex"])
        output_path = output_root / f"aurora-web-row28-one-trigger-{capture_tag}-{label}.png"
        if output_path.exists():
            raise RuntimeError(f"immutable_web_v6_validation_output_exists:{output_path}")
        shutil.copyfile(frames[frame_index], output_path)
        outputs[label] = base.repo_media(output_path)
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
        raise RuntimeError(f"immutable_web_v6_validation_exists:{validation_path}")

    validate_bound_inputs(video, summary_path, args.video_sha256, args.summary_sha256)
    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    final_proof = base.validate_summary(summary)
    static_calibration = json.loads(STATIC_CALIBRATION.read_text(encoding="utf-8"))
    timing_calibration = json.loads(TIMING_CALIBRATION.read_text(encoding="utf-8"))

    native_timing = timing_calibration["immutableNwnOracle"]
    proof_playback = timing_calibration["proofPlayback"]
    source_lifecycle = timing_calibration["webSourceLifecycle"]
    native_onset = float(native_timing["nativeOnsetRelativeSeconds"])
    native_peak = float(native_timing["nativePeakRelativeSeconds"])
    native_last = float(native_timing["nativeLastVisibleRelativeSeconds"])
    native_duration = float(native_timing["nativeVisibleDurationSeconds"])
    playback_rate = float(proof_playback["runtimePlaybackRate"])
    playback_delay = float(proof_playback["runtimePlaybackDelaySeconds"])
    playback_method = str(proof_playback["method"])
    source_to_wall_formula = str(proof_playback["sourceToWallFormula"])
    source_onset = float(source_lifecycle["sourceOnsetSeconds"])
    source_last = float(source_lifecycle["sourceLastVisibleSeconds"])
    visual_anchor_source_seconds = float(
        timing_calibration["visualAnchor"]["sourceDynamicPeakSeconds"]
    )
    target_anchor_seconds = playback_delay + visual_anchor_source_seconds / playback_rate
    expected_web_onset = playback_delay + source_onset / playback_rate
    expected_web_last = playback_delay + source_last / playback_rate
    expected_web_duration = expected_web_last - expected_web_onset

    observed_timing = final_proof["renderDebug"]["nativeTimingCalibration"]
    for label, actual, expected in (
        ("playback_rate", observed_timing["playbackRate"], playback_rate),
        ("playback_delay", observed_timing["playbackDelaySeconds"], playback_delay),
        (
            "native_onset_profile",
            observed_timing["nativeTriggerRelativeOnsetSeconds"],
            native_onset,
        ),
        (
            "native_last_profile",
            observed_timing["nativeTriggerRelativeLastVisibleSeconds"],
            native_last,
        ),
        ("source_onset_profile", observed_timing["sourceOnsetSeconds"], source_onset),
        (
            "source_dynamic_peak_profile",
            observed_timing["sourceDynamicPeakSeconds"],
            visual_anchor_source_seconds,
        ),
        ("source_last_profile", observed_timing["sourceLastVisibleSeconds"], source_last),
    ):
        base.assert_close(float(actual), expected, 1e-9, f"web_v6_{label}")
    if observed_timing["method"] != playback_method:
        raise RuntimeError("web_v6_playback_method_profile_mismatch")

    with tempfile.TemporaryDirectory(prefix="aurora-row28-v6-") as temp:
        frames = base.extract_frames(Path(args.ffmpeg), video, Path(temp))
        records, lifecycle = analyze_frames_with_native_lifecycle_metric(frames)

        web_onset = float(lifecycle["onset"]["triggerRelativeSeconds"])
        web_dynamic_peak = float(lifecycle["peak"]["triggerRelativeSeconds"])
        web_last = float(lifecycle["lastVisible"]["triggerRelativeSeconds"])
        web_duration = float(lifecycle["visibleDurationSeconds"])
        base.assert_close(
            web_onset, expected_web_onset, TIMING_TOLERANCE_SECONDS, "web_v6_source_clock_onset"
        )
        base.assert_close(
            web_last, expected_web_last, TIMING_TOLERANCE_SECONDS, "web_v6_source_clock_last_visible"
        )
        base.assert_close(
            web_duration,
            expected_web_duration,
            TIMING_TOLERANCE_SECONDS,
            "web_v6_source_clock_visible_duration",
        )
        base.assert_close(
            web_dynamic_peak,
            target_anchor_seconds,
            PEAK_PHASE_TOLERANCE_SECONDS,
            "web_v6_source_clock_dynamic_peak_phase",
        )

        visualCalibrationAnchor = nearest_record(records, target_anchor_seconds)
        anchor_frame_error = abs(
            float(visualCalibrationAnchor["triggerRelativeSeconds"]) - target_anchor_seconds
        )
        if anchor_frame_error > VISUAL_ANCHOR_FRAME_TOLERANCE_SECONDS + 1e-9:
            raise RuntimeError(
                f"web_v6_visual_anchor_frame_outside_tolerance:{anchor_frame_error}"
            )

        native_peak_energy = float(
            static_calibration["peakMetrics"]["native"]["positiveDeltaLumaMean"]
        )
        anchor_energy = float(visualCalibrationAnchor["positiveDeltaLumaMean"])
        energy_error_percent = (anchor_energy / native_peak_energy - 1.0) * 100.0
        if abs(energy_error_percent) > VISUAL_ANCHOR_ENERGY_TOLERANCE_PERCENT:
            raise RuntimeError(
                f"web_v6_visual_anchor_energy_outside_tolerance:{energy_error_percent}"
            )
        native_centroid = static_calibration["peakMetrics"]["native"]["positiveLumaCentroid"]
        anchor_centroid = visualCalibrationAnchor["positiveLumaCentroid"]
        centroid_delta = [
            float(anchor_centroid[0]) - float(native_centroid[0]),
            float(anchor_centroid[1]) - float(native_centroid[1]),
        ]
        if any(
            abs(value) > VISUAL_ANCHOR_CENTROID_AXIS_TOLERANCE_PIXELS
            for value in centroid_delta
        ):
            raise RuntimeError(
                f"web_v6_visual_anchor_centroid_outside_tolerance:{centroid_delta}"
            )
        stills = copy_selected_frames(
            frames, lifecycle, visualCalibrationAnchor, proof_root, capture_tag
        )

    dynamicPeak = lifecycle["peak"]
    result = {
        "version": "aurora-vfx-row28-web-v6-validation/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "pass-automated-source-clock-visual-anchor-and-runtime-gates",
        "visualClassificationRequired": True,
        "fixtureId": "vfx-nwn-web-row28",
        "captureTag": capture_tag,
        "inputs": {
            "video": base.repo_media(video),
            "summary": base.repo_media(summary_path),
            "nativeSummary": base.repo_media(NATIVE_SUMMARY),
            "staticCalibration": base.repo_media(STATIC_CALIBRATION),
            "timingCalibration": base.repo_media(TIMING_CALIBRATION),
            "baseValidator": base.repo_media(BASE_VALIDATOR_PATH),
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
        "dynamicPeak": dynamicPeak,
        "visualCalibrationAnchor": {
            "selection": "nearest-captured-frame-to-source-time-calibration-anchor",
            "sourceToWallFormula": source_to_wall_formula,
            "visualAnchorCalibrationMustRemainSourceTime": True,
            "sourceCalibrationSeconds": visual_anchor_source_seconds,
            "targetTriggerRelativeSeconds": target_anchor_seconds,
            "capturedFrameAbsoluteErrorSeconds": anchor_frame_error,
            "frame": visualCalibrationAnchor,
        },
        "nativeComparison": {
            "nativeTriggerRelativeOnsetSeconds": native_onset,
            "nativeTriggerRelativeDynamicPeakSeconds": native_peak,
            "nativeTriggerRelativeLastVisibleSeconds": native_last,
            "nativeVisibleDurationSeconds": native_duration,
            "onsetAbsoluteErrorSeconds": abs(web_onset - native_onset),
            "dynamicPeakAbsoluteErrorSeconds": abs(web_dynamic_peak - native_peak),
            "lastVisibleAbsoluteErrorSeconds": abs(web_last - native_last),
            "visibleDurationAbsoluteErrorSeconds": abs(web_duration - native_duration),
            "visualAnchorEnergyRelativeErrorPercent": energy_error_percent,
            "visualAnchorCentroidDeltaPixels": centroid_delta,
        },
        "acceptance": {
            "sourceClockEndpointToleranceSeconds": TIMING_TOLERANCE_SECONDS,
            "sourceClockDynamicPeakPhaseToleranceSeconds": PEAK_PHASE_TOLERANCE_SECONDS,
            "nativeLifecycleErrorsAreReportedNotAutoAccepted": True,
            "visualAnchorEnergyAbsoluteRelativeErrorMaxPercent": VISUAL_ANCHOR_ENERGY_TOLERANCE_PERCENT,
            "visualAnchorCentroidAxisAbsoluteErrorMaxPixels": VISUAL_ANCHOR_CENTROID_AXIS_TOLERANCE_PIXELS,
            "visualAnchorFrameToleranceSeconds": VISUAL_ANCHOR_FRAME_TOLERANCE_SECONDS,
            "staticCalibrationUsage": "immutable-native-peak-energy-and-screen-centroid-only",
            "retailPixelParityClaimAllowed": False,
        },
        "visualClassification": {
            "status": "requires-human-frame-classification",
            "allowedLabels": ["good", "close", "bad"],
            "automatedGatesAssignParity": False,
        },
        "limitations": {
            "dynamicPeakAndVisualCalibrationAnchorAreDistinct": True,
            "nativeLifecycleAutomatedParityClaim": False,
            "cameraShakeMapped": False,
            "globalAuroraTimingClaim": False,
            "exactPixelIdentityClaimed": False,
        },
        "stills": stills,
    }
    validation_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    return {"ok": True, "validation": base.repo_media(validation_path), "result": result}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["dry-run", "validate"])
    parser.add_argument("--proof-root", default=str(EVIDENCE_ROOT / "web-v5d"))
    parser.add_argument("--capture-tag", default="v5d")
    parser.add_argument("--video-sha256", default="")
    parser.add_argument("--summary-sha256", default="")
    parser.add_argument("--ffmpeg", default=str(FFMPEG_DEFAULT))
    args = parser.parse_args()
    if args.command == "dry-run":
        result = {
            "ok": True,
            "status": "row28_web_v6_validation_plan_valid",
            "startsNwn": False,
            "startsWebRuntime": False,
            "requiresExplicitInputHashes": True,
            "separatesDynamicPeakFromVisualCalibrationAnchor": True,
        }
    else:
        if not args.video_sha256 or not args.summary_sha256:
            raise RuntimeError("row28_web_v6_validation_requires_explicit_input_hashes")
        result = validate(args)
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
