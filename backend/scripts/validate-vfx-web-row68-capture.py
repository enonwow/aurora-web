from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
PROOF_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-web-row68"
)
WEB_ROOT = PROOF_ROOT / "web"
CAPTURE_TAG = os.environ.get("VFX_CAPTURE_TAG", "v11")
VIDEO_PATH = WEB_ROOT / f"web-row68-one-trigger-{CAPTURE_TAG}.mp4"
SOURCE_SUMMARY_PATH = WEB_ROOT / f"web-row68-one-trigger-{CAPTURE_TAG}-summary.json"
MANIFEST_PATH = PROOF_ROOT / "fixture-manifest.json"
OUTPUT_PATH = WEB_ROOT / f"validated-summary-{CAPTURE_TAG}.json"
BLOOM_AUDIT_PATH = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "artifacts"
    / "vfx-bloom-2026-07-15"
    / "retail-bloom-shader-audit.json"
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def media_record(path: Path) -> dict[str, object]:
    return {
        "path": str(path),
        "sha256": sha256(path),
        "sizeBytes": path.stat().st_size,
    }


def bloom_bright_pixel_count(frame: np.ndarray) -> int:
    maximum = frame.max(axis=2)
    return int(np.count_nonzero(maximum >= 180))


def save_frame(frames: list[np.ndarray], index: int, name: str) -> dict[str, object]:
    path = WEB_ROOT / name
    if not cv2.imwrite(str(path), frames[index]):
        raise RuntimeError(f"Could not write still: {path}")
    return {
        "frameIndex": index,
        "videoSeconds": index / FPS,
        **media_record(path),
    }


source_summary = json.loads(SOURCE_SUMMARY_PATH.read_text(encoding="utf-8"))
manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
bloom_audit = json.loads(BLOOM_AUDIT_PATH.read_text(encoding="utf-8"))

capture = cv2.VideoCapture(str(VIDEO_PATH))
if not capture.isOpened():
    raise RuntimeError(f"Could not decode video: {VIDEO_PATH}")

FPS = float(capture.get(cv2.CAP_PROP_FPS))
frames: list[np.ndarray] = []
metrics: list[int] = []
while True:
    ok, frame = capture.read()
    if not ok:
        break
    frames.append(frame)
    metrics.append(bloom_bright_pixel_count(frame))
capture.release()

if not frames or FPS <= 0:
    raise RuntimeError("Decoded Web proof has no frames or invalid FPS.")

baseline_end = min(len(frames), max(1, int(FPS * 1.5)))
baseline = np.asarray(metrics[:baseline_end], dtype=np.float64)
baseline_median = float(np.median(baseline))
baseline_p99 = float(np.percentile(baseline, 99))
visibility_threshold = max(100.0, baseline_p99 + 100.0)
visible_indices = [index for index, metric in enumerate(metrics) if metric > visibility_threshold]
if not visible_indices:
    raise RuntimeError("No visible effect interval was found in the Web proof.")

onset_index = visible_indices[0]
peak_index = int(np.argmax(np.asarray(metrics)))
last_visible_index = visible_indices[-1]
post_start = min(len(frames) - 1, int(FPS * 6.2))
post_metrics = metrics[post_start:]
light_receiver_frame_index = min(len(frames) - 1, int(FPS * 2.7))
baseline_receiver_frame = frames[min(len(frames) - 1, int(FPS))]
light_receiver_frame = frames[light_receiver_frame_index]
post_receiver_frame = frames[min(len(frames) - 1, int(FPS * 7.5))]
proof_scene_status = str((manifest.get("proofScene") or {}).get("status") or "")
source_backed_proof_scene = proof_scene_status.startswith("source-backed-exact-row68-")
if source_backed_proof_scene:
    receiver_probe_mode = "source-backed-scene-rug-flanks-saturation-masked"
    receiver_roi_records = [
        {"x": 300, "y": 250, "width": 100, "height": 100},
        {"x": 500, "y": 250, "width": 100, "height": 100},
    ]
    baseline_samples: list[np.ndarray] = []
    light_samples: list[np.ndarray] = []
    post_samples: list[np.ndarray] = []
    for roi in receiver_roi_records:
        ys = slice(roi["y"], roi["y"] + roi["height"])
        xs = slice(roi["x"], roi["x"] + roi["width"])
        baseline_roi = baseline_receiver_frame[ys, xs]
        light_roi = light_receiver_frame[ys, xs]
        post_roi = post_receiver_frame[ys, xs]
        mask = (
            (baseline_roi.max(axis=2) < 160)
            & (light_roi.max(axis=2) < 160)
            & (post_roi.max(axis=2) < 160)
        )
        baseline_samples.append(baseline_roi[mask])
        light_samples.append(light_roi[mask])
        post_samples.append(post_roi[mask])
    baseline_receiver_pixels = np.concatenate(baseline_samples, axis=0)
    light_receiver_pixels = np.concatenate(light_samples, axis=0)
    post_receiver_pixels = np.concatenate(post_samples, axis=0)
    if len(baseline_receiver_pixels) < 1000:
        raise RuntimeError("The source-backed scene receiver probe has insufficient pixels.")
    baseline_receiver_bgr = baseline_receiver_pixels.mean(axis=0)
    light_receiver_bgr = light_receiver_pixels.mean(axis=0)
    post_receiver_bgr = post_receiver_pixels.mean(axis=0)
    receiver_probe_pixel_count = len(baseline_receiver_pixels)
else:
    receiver_probe_mode = "legacy-diagnostic-plane"
    receiver_roi_records = [{"x": 80, "y": 360, "width": 180, "height": 110}]
    receiver_roi = (slice(360, 470), slice(80, 260))
    baseline_receiver_bgr = baseline_receiver_frame[receiver_roi].mean(axis=(0, 1))
    light_receiver_bgr = light_receiver_frame[receiver_roi].mean(axis=(0, 1))
    post_receiver_bgr = post_receiver_frame[receiver_roi].mean(axis=(0, 1))
    receiver_probe_pixel_count = 180 * 110
receiver_light_delta = float(np.linalg.norm(light_receiver_bgr - baseline_receiver_bgr))
receiver_post_delta = float(np.linalg.norm(post_receiver_bgr - baseline_receiver_bgr))
receiver_illumination_threshold = max(5.0, receiver_post_delta * 10.0)

proof_state = source_summary.get("proofState") or {}
proof_status = proof_state.get("status") or {}
proof_timeline = proof_state.get("timeline") or []
final_proof_state = source_summary.get("finalProofState") or {}
final_render_debug = final_proof_state.get("renderDebug") or {}
object_attachment = final_render_debug.get("objectAttachment") or {}
runtime_frames = manifest.get("runtimeFrameCounts") or []


def runtime_observability_pass(state_name: str) -> bool:
    state = source_summary.get(state_name) or {}
    observability = state.get("runtimeObservability") or {}
    proof_gate = observability.get("proofGate") or {}
    return (
        observability.get("version") == "aurora-vfx-runtime-observability/v1"
        and (observability.get("identity") or {}).get("status") == "ready"
        and (observability.get("hostGraph") or {}).get("status") == "pass"
        and (observability.get("assetSettlement") or {}).get("status") == "settled"
        and (observability.get("drawLedger") or {}).get("status") == "pass"
        and proof_gate.get("status") == "pass"
        and not proof_gate.get("blockerManifest")
    )


runtime_observability_states_pass = all(
    runtime_observability_pass(state_name)
    for state_name in ("activeProofState", "finalProofState")
)
baseline_light_entries = [entry for entry in proof_timeline if entry.get("phase") == "baseline"]
effect_light_entries = [entry for entry in proof_timeline if entry.get("phase") == "effect"]
black_tail_light_entries = [
    entry
    for entry in effect_light_entries
    if float(entry.get("effectSeconds", 0)) >= 2.0
]
bloom_entries = [
    entry
    for entry in proof_timeline
    if entry.get("bloomStatus") == "source-backed-retail-bloom-active"
]
checks = {
    "exactlyOneWebPlayback": source_summary.get("triggerCount") == 1
    and proof_state.get("oneTrigger") is True,
    "loopDisabled": source_summary.get("loop") is False
    and proof_state.get("loop") is False,
    "runtimeObservabilityProofGatesPass": runtime_observability_states_pass,
    "nativeCreatureHeadAttachmentApplied": (
        object_attachment.get("status") == "attached"
        and object_attachment.get("sourceColumn") == "Imp_HeadCon_Node"
        and object_attachment.get("targetKind") == "creature"
        and object_attachment.get("requestedNodeName") == "head"
        and object_attachment.get("resolvedNodeName") == "head"
        and object_attachment.get("orientWithGroundRaw") == "0"
        and object_attachment.get("orientationPolicy")
        == "aurora-attach-no-orientation"
    ),
    "sourceBackedProofSceneReceiverEnabled": source_backed_proof_scene
    or receiver_probe_mode == "legacy-diagnostic-plane",
    "captureArmedBeforePlayback": source_summary.get("captureArmedBeforePlayback") is True,
    "mp4Decodes": len(frames) > 0,
    "baselineBeforeVisibleEffect": onset_index >= int(FPS * 1.8),
    "visibleEffectIntervalPresent": last_visible_index > onset_index,
    "runtimeEndsAtLastFrame": proof_status.get("frameIndex")
    == proof_status.get("frameCount", 0) - 1,
    "runtimeEndsWithZeroDrawParticles": proof_status.get("drawParticles") == 0,
    "allEmittersEndWithZeroActiveParticles": bool(runtime_frames)
    and all(entry.get("finalActiveParticleCount") == 0 for entry in runtime_frames),
    "postRollIsClean": bool(post_metrics)
    and max(post_metrics) <= visibility_threshold,
    "baselineHasNoActiveSourceLight": bool(baseline_light_entries)
    and all(entry.get("sourceLightCount") == 0 for entry in baseline_light_entries),
    "effectHasSourceFlashLight": bool(effect_light_entries)
    and any(
        entry.get("sourceLightCount") == 1
        and abs(float(entry.get("sourceLightRadius", 0)) - 5) < 1e-6
        and abs(float(entry.get("sourceLightIntensity", 0)) - 1.6) < 1e-3
        and entry.get("sourceLightColor") not in ("", "#000000")
        for entry in effect_light_entries
    ),
    "sourceFlashLightHoldsFinalBlackKey": bool(black_tail_light_entries)
    and all(entry.get("sourceLightColor") == "#000000" for entry in black_tail_light_entries),
    "receiverShowsSourceLightIllumination": receiver_light_delta
    >= receiver_illumination_threshold,
    "receiverReturnsToBaselineAfterLight": receiver_post_delta <= 3,
    "retailBloomSourceAuditRecovered": bloom_audit.get("status")
    == "retail-bloom-source-and-default-profile-recovered",
    "retailBloomProfileActive": bool(bloom_entries)
    and proof_status.get("bloomStatus") == "source-backed-retail-bloom-active"
    and proof_status.get("bloomDownscaleOffset") == 0
    and proof_status.get("bloomDownscaleSteps") == 7
    and abs(float(proof_status.get("bloomThreshold", 0)) - 1.0) < 1e-6
    and abs(float(proof_status.get("bloomSoftness", 0)) - 0.9) < 1e-6
    and abs(float(proof_status.get("bloomMultiplier", 0)) - 1.0) < 1e-6,
}
status = "valid-single-playback-web-proof" if all(checks.values()) else "invalid"

stills = {
    "baseline": save_frame(frames, min(len(frames) - 1, int(FPS)), f"web-row68-{CAPTURE_TAG}-baseline.png"),
    "onset": save_frame(frames, onset_index, f"web-row68-{CAPTURE_TAG}-onset.png"),
    "peak": save_frame(frames, peak_index, f"web-row68-{CAPTURE_TAG}-peak.png"),
    "lastVisible": save_frame(
        frames, last_visible_index, f"web-row68-{CAPTURE_TAG}-last-visible.png"
    ),
    "sourceLightReceiver": save_frame(
        frames, light_receiver_frame_index, f"web-row68-{CAPTURE_TAG}-source-light-receiver.png"
    ),
    "postRoll": save_frame(
        frames, min(len(frames) - 1, int(FPS * 7.5)), f"web-row68-{CAPTURE_TAG}-post-roll.png"
    ),
}

result = {
    "version": "aurora-vfx-web-one-playback-validated-proof/v1",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "fixtureId": "vfx-nwn-web-row68",
    "status": status,
    "sourceSummary": str(SOURCE_SUMMARY_PATH),
    "video": media_record(VIDEO_PATH),
    "lifecycle": {
        "fps": FPS,
        "frameCount": len(frames),
        "durationSeconds": len(frames) / FPS,
        "metric": "bloom-bright-pixel-count(max-channel>=180)",
        "metricRationale": "includes the neutral white retail bloom core while excluding the dark proof scene; visibility uses baselineP99+100 with a floor of 100 pixels",
        "baselineFrameCount": baseline_end,
        "baselineMedian": baseline_median,
        "baselineP99": baseline_p99,
        "visibilityThreshold": visibility_threshold,
        "onsetFrameIndex": onset_index,
        "onsetVideoSeconds": onset_index / FPS,
        "peakFrameIndex": peak_index,
        "peakVideoSeconds": peak_index / FPS,
        "peakMetric": metrics[peak_index],
        "lastVisibleFrameIndex": last_visible_index,
        "lastVisibleVideoSeconds": last_visible_index / FPS,
        "visibleSpanSeconds": (last_visible_index - onset_index + 1) / FPS,
        "visibleFrameCount": len(visible_indices),
        "sourceLightReceiverProbe": {
            "mode": receiver_probe_mode,
            "proofSceneStatus": proof_scene_status,
            "roiPixels": receiver_roi_records,
            "samplePixelCount": receiver_probe_pixel_count,
            "baselineMeanBgr": baseline_receiver_bgr.tolist(),
            "illuminatedMeanBgr": light_receiver_bgr.tolist(),
            "postMeanBgr": post_receiver_bgr.tolist(),
            "illuminatedDelta": receiver_light_delta,
            "postDelta": receiver_post_delta,
            "illuminationThreshold": receiver_illumination_threshold,
        },
        "stills": stills,
    },
    "runtime": manifest.get("runtime"),
    "runtimeFrameCounts": runtime_frames,
    "objectAttachment": object_attachment,
    "bloom": {
        "audit": str(BLOOM_AUDIT_PATH),
        "status": proof_status.get("bloomStatus"),
        "downscaleOffset": proof_status.get("bloomDownscaleOffset"),
        "downscaleSteps": proof_status.get("bloomDownscaleSteps"),
        "threshold": proof_status.get("bloomThreshold"),
        "softness": proof_status.get("bloomSoftness"),
        "multiplier": proof_status.get("bloomMultiplier"),
        "normalizationFactor": proof_status.get("bloomNormalizationFactor"),
    },
    "checks": checks,
}
OUTPUT_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result, indent=2))
if status == "invalid":
    raise SystemExit(1)
