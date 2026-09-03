from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PROOF_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-web-row22"
)
PROOF_ROOT = Path(os.environ.get("VFX_PROOF_ROOT", DEFAULT_PROOF_ROOT)).resolve()
WEB_ROOT = Path(os.environ.get("VFX_WEB_ROOT", PROOF_ROOT / "web")).resolve()
PROOF_VERSION = os.environ.get("VFX_PROOF_VERSION", "v11")
if not re.fullmatch(r"v\d+[a-z0-9-]*", PROOF_VERSION, re.IGNORECASE):
    raise RuntimeError(f"Invalid VFX_PROOF_VERSION: {PROOF_VERSION}")
VIDEO_PATH = Path(
    os.environ.get(
        "VFX_VIDEO_PATH",
        WEB_ROOT / f"web-row22-one-trigger-{PROOF_VERSION}.mp4",
    )
).resolve()
SOURCE_SUMMARY_PATH = Path(
    os.environ.get(
        "VFX_SOURCE_SUMMARY_PATH",
        WEB_ROOT / f"web-row22-one-trigger-{PROOF_VERSION}-summary.json",
    )
).resolve()
MANIFEST_PATH = Path(
    os.environ.get("VFX_MANIFEST_PATH", PROOF_ROOT / "fixture-manifest.json")
).resolve()
OUTPUT_PATH = Path(
    os.environ.get(
        "VFX_VALIDATED_SUMMARY_PATH",
        WEB_ROOT / f"validated-summary-{PROOF_VERSION}.json",
    )
).resolve()
FFMPEG_PATH = Path(
    r"C:\Users\enonw\Documents\Codex\2026-05-17\umiesz-tworzy-filmiki"
    r"\vendor\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
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


def saturated_bright_pixel_count(frame: np.ndarray) -> int:
    maximum = frame.max(axis=2)
    minimum = frame.min(axis=2)
    return int(np.count_nonzero((maximum >= 245) & ((maximum - minimum) >= 35)))


def probe_video(path: Path) -> tuple[int, int]:
    result = subprocess.run(
        [str(FFMPEG_PATH), "-hide_banner", "-i", str(path)],
        capture_output=True,
        check=False,
        text=True,
    )
    match = re.search(r"\b(\d{2,5})x(\d{2,5})\b", result.stderr)
    if not match:
        raise RuntimeError(f"Could not read video dimensions: {result.stderr[-2000:]}")
    return int(match.group(1)), int(match.group(2))


def iter_video_frames(path: Path, width: int, height: int):
    frame_size = width * height * 3
    process = subprocess.Popen(
        [
            str(FFMPEG_PATH),
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(path),
            "-f",
            "rawvideo",
            "-pix_fmt",
            "bgr24",
            "pipe:1",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if process.stdout is None:
        raise RuntimeError("ffmpeg raw-video pipe is unavailable.")
    try:
        while True:
            raw = process.stdout.read(frame_size)
            if not raw:
                break
            while len(raw) < frame_size:
                chunk = process.stdout.read(frame_size - len(raw))
                if not chunk:
                    break
                raw += chunk
            if len(raw) != frame_size:
                raise RuntimeError("ffmpeg returned a truncated raw video frame.")
            yield np.frombuffer(raw, dtype=np.uint8).reshape((height, width, 3)).copy()
    finally:
        process.stdout.close()
        stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
        return_code = process.wait()
        if return_code != 0:
            raise RuntimeError(f"ffmpeg raw-video decode failed: {stderr[-2000:]}")


def read_selected_frames(
    path: Path, width: int, height: int, indices: set[int]
) -> dict[int, np.ndarray]:
    selected: dict[int, np.ndarray] = {}
    for index, frame in enumerate(iter_video_frames(path, width, height)):
        if index in indices:
            selected[index] = frame
    missing = sorted(indices - selected.keys())
    if missing:
        raise RuntimeError(f"Could not decode selected frames: {missing}")
    return selected


def save_frame(frames: dict[int, np.ndarray], index: int, name: str) -> dict[str, object]:
    path = WEB_ROOT / name
    Image.fromarray(frames[index][:, :, ::-1], mode="RGB").save(path)
    return {
        "frameIndex": index,
        "videoSeconds": index / FPS,
        **media_record(path),
    }


source_summary = json.loads(SOURCE_SUMMARY_PATH.read_text(encoding="utf-8"))
manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
FPS = float(source_summary.get("requestedFps") or 0)
WIDTH, HEIGHT = probe_video(VIDEO_PATH)
metrics: list[int] = []
for frame in iter_video_frames(VIDEO_PATH, WIDTH, HEIGHT):
    metrics.append(saturated_bright_pixel_count(frame))

frame_count = len(metrics)
if frame_count == 0 or FPS <= 0:
    raise RuntimeError("Decoded Web proof has no frames or invalid FPS.")

baseline_end = min(frame_count, max(1, int(FPS * 1.5)))
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
post_start = min(frame_count - 1, int(FPS * 12.5))
post_metrics = metrics[post_start:]
baseline_frame_index = min(frame_count - 1, int(FPS))
tail_frame_index = min(frame_count - 1, int(FPS * 3.2))
post_frame_index = min(frame_count - 1, int(FPS * 14.5))
selected_indices = {
    baseline_frame_index,
    onset_index,
    peak_index,
    last_visible_index,
    tail_frame_index,
    post_frame_index,
}
selected_frames = read_selected_frames(VIDEO_PATH, WIDTH, HEIGHT, selected_indices)
proof_state = source_summary.get("proofState") or {}
proof_status = proof_state.get("status") or {}
proof_render_debug = proof_state.get("renderDebug") or {}
proof_scene = proof_render_debug.get("proofScene") or {}
proof_timeline = proof_state.get("timeline") or []
runtime_observability = proof_state.get("runtimeObservability") or {}
runtime_proof_gate = runtime_observability.get("proofGate") or {}
runtime_playback_guard = runtime_observability.get("playbackGuard") or {}
runtime_frames = manifest.get("runtimeFrameCounts") or []
collision_oracle = manifest.get("collisionOracle") or {}
collision_summary = collision_oracle.get("runtimeSummary") or {}
collision_query_count = collision_summary.get("queryCount")
collision_hit_count = collision_summary.get("hitCount")
collision_no_hit_count = collision_summary.get("staticNoHitCount")
manifest_proof_scene = manifest.get("proofScene") or {}
manifest_area_lighting = manifest_proof_scene.get("areaLighting") or {}
baseline_light_entries = [entry for entry in proof_timeline if entry.get("phase") == "baseline"]
effect_light_entries = [entry for entry in proof_timeline if entry.get("phase") == "effect"]
effect_visual_entries = [
    entry
    for entry in effect_light_entries
    if int(entry.get("drawParticles") or 0) > 0
    or int(entry.get("renderedChunkModels") or 0) > 0
]
black_tail_light_entries = [
    entry
    for entry in effect_light_entries
    if float(entry.get("effectSeconds", 0)) >= 2.0
]
capture_checks = {
    "exactlyOneWebPlayback": source_summary.get("triggerCount") == 1
    and proof_state.get("oneTrigger") is True,
    "loopDisabled": source_summary.get("loop") is False
    and proof_state.get("loop") is False,
    "captureArmedBeforePlayback": source_summary.get("captureArmedBeforePlayback") is True,
    "runtimeObservabilityProofGatePasses": (
        runtime_observability.get("version")
        == "aurora-vfx-runtime-observability/v1"
        and runtime_proof_gate.get("status") == "pass"
        and not runtime_proof_gate.get("blockerManifest")
    ),
    "runtimeObservabilityProvesOneCompletedHiddenPlayback": (
        runtime_playback_guard.get("status") == "pass"
        and runtime_playback_guard.get("triggerCount") == 1
        and runtime_playback_guard.get("loop") is False
        and runtime_playback_guard.get("overlapCount") == 0
        and runtime_playback_guard.get("completed") is True
        and runtime_playback_guard.get("postDurationHidden") is True
        and runtime_playback_guard.get("postDurationHiddenRequired") is True
    ),
    "diagnosticHarnessDisabled": source_summary.get("diagnosticHarness") is False
    and "diagnostics=1" not in str(source_summary.get("route") or ""),
    "mp4Decodes": frame_count > 0,
    "baselineBeforeVisibleEffect": onset_index >= int(FPS * 1.8),
    "visibleEffectIntervalPresent": bool(visible_indices)
    and len(effect_visual_entries) >= 2,
    "runtimeEndsAtLastFrame": proof_status.get("frameIndex")
    == proof_status.get("frameCount", 0) - 1,
    "runtimeEndsWithZeroDrawParticles": proof_status.get("drawParticles") == 0,
    "sourceBackedStaticWokProfile": collision_oracle.get("staticTraversalProfile")
    == "nwn-row22-enon-test-effect-static-wok/v1",
    "collisionQueriesRecorded": isinstance(collision_query_count, int)
    and collision_query_count > 0
    and collision_query_count
    == int(collision_hit_count or 0) + int(collision_no_hit_count or 0),
    "staticWokHitsApplied": int(collision_summary.get("hitCount") or 0) > 0
    and collision_summary.get("hitCount") == collision_summary.get("appliedHitCount"),
    "staticMissesResolveAsVfxNoHit": int(
        collision_summary.get("staticNoHitCount") or 0
    )
    > 0
    and collision_oracle.get("dynamicTraversalStatus")
    == "not-selected-by-vfx-query-helper-arg0-1",
    "chunkParticlesLandOnRetailWok": len(
        collision_summary.get("landedParticleIds") or []
    )
    > 0,
    "proofCarriesCollisionManifest": proof_status.get("collisionProfile")
    == collision_oracle.get("staticTraversalProfile")
    and proof_status.get("collisionQueryCount") == collision_summary.get("queryCount")
    and proof_status.get("collisionAppliedHitCount")
    == collision_summary.get("appliedHitCount")
    and proof_status.get("collisionStaticNoHitCount")
    == collision_summary.get("staticNoHitCount")
    and proof_status.get("collisionLandedParticleCount")
    == len(collision_summary.get("landedParticleIds") or []),
    "proofCarriesSourceAreaFloorScene": proof_scene.get("status")
    == manifest_proof_scene.get("status")
    and proof_scene.get("modelCount") == len(manifest_proof_scene.get("models") or [])
    and proof_scene.get("textureCount")
    == len(manifest_proof_scene.get("textures") or []),
    "proofUsesSourceAreaGlobalLighting": proof_scene.get("areaLightingStatus")
    == manifest_area_lighting.get("status")
    and proof_scene.get("areaLightingPhase")
    == manifest_area_lighting.get("phase")
    and proof_scene.get("areaLightingLightCount") == 2
    and proof_scene.get("localTileLightingStatus")
    == manifest_area_lighting.get("localTileLightingStatus"),
    "chunkModelsRendered": any(
        int(entry.get("renderedChunkModels") or 0) > 0 for entry in effect_light_entries
    ),
    "chunkSourceMaterialBound": any(
        int(entry.get("boundChunkMaterialCount") or 0) > 0
        for entry in effect_light_entries
    ),
    "allEmittersEndWithZeroActiveParticles": bool(runtime_frames)
    and all(entry.get("finalActiveParticleCount") == 0 for entry in runtime_frames),
    "postRollIsClean": bool(post_metrics)
    and max(post_metrics) <= visibility_threshold,
    "baselineHasNoActiveSourceLight": bool(baseline_light_entries)
    and all(entry.get("sourceLightCount") == 0 for entry in baseline_light_entries),
    "effectHasSourceFlashLight": bool(effect_light_entries)
    and any(
        entry.get("sourceLightCount") == 1
        and abs(float(entry.get("sourceLightRadius", 0)) - 10) < 1e-6
        and abs(float(entry.get("sourceLightIntensity", 0)) - 1) < 1e-3
        and entry.get("sourceLightColor") not in ("", "#000000")
        for entry in effect_light_entries
    ),
    "sourceFlashLightHoldsFinalBlackKey": bool(black_tail_light_entries)
    and all(entry.get("sourceLightColor") == "#000000" for entry in black_tail_light_entries),
}
comparison_context = manifest.get("comparisonContext") or {}
comparison_checks = {
    "cameraMatchEstablished": comparison_context.get("cameraMatchEstablished") is True,
    "sceneMatchEstablished": comparison_context.get("sceneMatchEstablished") is True,
    "ownerTargetMatchEstablished": comparison_context.get("ownerTargetMatchEstablished") is True,
}
checks = {**capture_checks, **comparison_checks}
capture_valid = all(capture_checks.values())
comparison_ready = all(comparison_checks.values())
status = (
    "valid-single-playback-web-proof"
    if capture_valid and comparison_ready
    else "diagnostic-only-single-playback-open-context-gaps"
    if capture_valid
    else "invalid"
)

stills = {
    "baseline": save_frame(
        selected_frames, baseline_frame_index, f"web-row22-{PROOF_VERSION}-baseline.png"
    ),
    "onset": save_frame(
        selected_frames, onset_index, f"web-row22-{PROOF_VERSION}-onset.png"
    ),
    "peak": save_frame(
        selected_frames, peak_index, f"web-row22-{PROOF_VERSION}-peak.png"
    ),
    "lastVisible": save_frame(
        selected_frames,
        last_visible_index,
        f"web-row22-{PROOF_VERSION}-last-visible.png",
    ),
    "tail": save_frame(
        selected_frames, tail_frame_index, f"web-row22-{PROOF_VERSION}-tail.png"
    ),
    "postRoll": save_frame(
        selected_frames, post_frame_index, f"web-row22-{PROOF_VERSION}-post-roll.png"
    ),
}

result = {
    "version": f"aurora-vfx-web-one-playback-validated-proof/{PROOF_VERSION}",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "fixtureId": "vfx-nwn-web-row22",
    "status": status,
    "sourceSummary": str(SOURCE_SUMMARY_PATH),
    "video": media_record(VIDEO_PATH),
    "lifecycle": {
        "fps": FPS,
        "frameCount": frame_count,
        "durationSeconds": frame_count / FPS,
        "metric": "saturated-bright-pixel-count(max>=245,channel-range>=35)",
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
        "diagnosticHarness": False,
        "stills": stills,
    },
    "runtime": manifest.get("runtime"),
    "runtimeFrameCounts": runtime_frames,
    "collisionOracle": collision_oracle,
    "comparisonContext": comparison_context,
    "captureValid": capture_valid,
    "comparisonReady": comparison_ready,
    "checks": checks,
}
OUTPUT_PATH.write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result, indent=2))
if status == "invalid":
    raise SystemExit(1)
