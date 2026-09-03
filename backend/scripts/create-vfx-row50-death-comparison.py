from __future__ import annotations

import hashlib
import json
import os
import statistics
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import cv2
from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-broad-proof-2026-07-16"
)
ROW_ROOT = EVIDENCE_ROOT / "row50"
COMPARISON_ROOT = EVIDENCE_ROOT / "comparisons"
NWN_VIDEO = ROW_ROOT / "nwn" / "nwn-row50-one-trigger-approved-recapture.mp4"
NWN_VALIDATED_SUMMARY = ROW_ROOT / "nwn" / "validated-summary.json"
WEB_TIMELINE_FPS = int(os.environ.get("VFX_ROW50_WEB_TIMELINE_FPS", "8"))
WEB_STEM = os.environ.get(
    "VFX_ROW50_WEB_STEM",
    "aurora-web-row50-one-trigger-four-tile-longitudinal-camera-v16-20260813",
)
WEB_VIDEO = ROW_ROOT / "aurora-web" / f"{WEB_STEM}.mp4"
WEB_SUMMARY = ROW_ROOT / "aurora-web" / f"{WEB_STEM}-summary.json"
WEB_TIMELINE_VIDEO = (
    ROW_ROOT / "aurora-web" / f"{WEB_STEM}-timeline-{WEB_TIMELINE_FPS}fps.mp4"
)
WEB_FIXTURE_MANIFEST = ROW_ROOT / "web-fixture-manifest.json"
OUTPUT_STEM = os.environ.get(
    "VFX_ROW50_OUTPUT_STEM",
    "nwn-vs-aurora-web-row50-four-tile-longitudinal-camera-v16-onset-aligned-20260813",
)
OUTPUT_VIDEO = COMPARISON_ROOT / f"{OUTPUT_STEM}.mp4"
CONTACT_SHEET = COMPARISON_ROOT / f"{OUTPUT_STEM}-contact-sheet.png"
MANIFEST = (
    COMPARISON_ROOT
    / os.environ.get(
        "VFX_ROW50_MANIFEST_NAME",
        "row50-four-tile-longitudinal-camera-v16-onset-aligned-20260813.json",
    )
)
HEADER = COMPARISON_ROOT / "headers" / f"{OUTPUT_STEM}.png"
FFMPEG_PATH = Path(
    os.environ.get(
        "FFMPEG_PATH",
        "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
        "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
    )
)

EXPECTED_NWN_SHA256 = "a1a9df16a51579f01ac1399435ceb0c770b4887e684b7e4364198cabbeb84bd8"
EXPECTED_WEB_SHA256 = os.environ.get(
    "VFX_ROW50_EXPECTED_WEB_SHA256",
    "8d5b5ac98b2ae71555073d4591fc3be314d1a31c0fae89f24e6b1a1e796bc981",
)
EXPECTED_WEB_SUMMARY_SHA256 = os.environ.get(
    "VFX_ROW50_EXPECTED_WEB_SUMMARY_SHA256",
    "83f79ce854c51c1027aa03a9012e45c55e4f5f042e9314cd4dbead4142f14854",
)
EXPECTED_FIXTURE_SHA256 = os.environ.get(
    "VFX_ROW50_EXPECTED_FIXTURE_SHA256",
    "ad55d7d22e645735cc755fe523b7ba756ef4beb56a52c68f865152720b697f85",
)
EXPECTED_OBSERVABILITY_VERSION = "aurora-vfx-runtime-observability/v1"
WEB_HEADER_LABEL = os.environ.get(
    "VFX_ROW50_WEB_HEADER_LABEL",
    f"Aurora Web (accepted v16, 4/4 tiles, {WEB_TIMELINE_FPS} fps timeline)",
)
COMPARISON_CONTRACT_VERSION = os.environ.get(
    "VFX_ROW50_COMPARISON_CONTRACT_VERSION",
    "aurora-vfx-row50-comparison/v16",
)
DEFAULT_OPEN_PARITY_GAPS = [
    "The exact source player appearance is not reconstructed.",
    "The Web camera is longitudinally capture-calibrated rather than an exact reconstruction of the retail camera transform.",
    "Retail RNG seed is unavailable.",
    "Effect shape, luminance, alpha, light, bloom, postprocess, and tail parity require review of this fresh comparison.",
]
OPEN_PARITY_GAPS = json.loads(
    os.environ.get(
        "VFX_ROW50_OPEN_PARITY_GAPS_JSON",
        json.dumps(DEFAULT_OPEN_PARITY_GAPS),
    )
)
EXPECTED_PLAYBACK_DURATION_SECONDS = float(
    os.environ.get("VFX_ROW50_EXPECTED_PLAYBACK_DURATION_SECONDS", "6.15")
)
EXPECTED_RUNTIME_DT_SECONDS = float(
    os.environ.get("VFX_ROW50_EXPECTED_RUNTIME_DT_SECONDS", str(1 / 60))
)
EXPECTED_OUTPUT_FRAME_STRIDE = int(
    os.environ.get("VFX_ROW50_EXPECTED_OUTPUT_FRAME_STRIDE", "2")
)
EXPECTED_SERIALIZED_FRAME_STEP_SECONDS = float(
    os.environ.get("VFX_ROW50_EXPECTED_SERIALIZED_FRAME_STEP_SECONDS", str(1 / 30))
)
EXPECTED_WEB_FRAME_COUNT = int(os.environ.get("VFX_ROW50_EXPECTED_WEB_FRAME_COUNT", "82"))
EXPECTED_WEB_DURATION_MS = int(os.environ.get("VFX_ROW50_EXPECTED_WEB_DURATION_MS", "10150"))
EXPECTED_ATTACHMENT_POSITION = tuple(
    float(value)
    for value in json.loads(
        os.environ.get(
            "VFX_ROW50_EXPECTED_ATTACHMENT_POSITION_JSON",
            "[-0.024781223563851915, 1.4320385552715178, -0.09771301377223568]",
        )
    )
)
if len(EXPECTED_ATTACHMENT_POSITION) != 3:
    raise RuntimeError("Expected row50 attachment position must contain exactly three values.")
FPS = 30
PANEL_SIZE = (640, 540)
HEADER_SIZE = (1280, 92)
OUTPUT_SIZE = (1280, 632)
COMPARISON_ONSET_SECONDS = 2.0
COMPARISON_DURATION_SECONDS = 8.6


def sha256(file_path: Path) -> str:
    digest = hashlib.sha256()
    with file_path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def media_record(file_path: Path) -> dict[str, object]:
    return {
        "path": str(file_path),
        "sizeBytes": file_path.stat().st_size,
        "sha256": sha256(file_path),
    }


def load_font(
    size: int, *, bold: bool = False
) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    filename = "arialbd.ttf" if bold else "arial.ttf"
    font_path = Path("C:/Windows/Fonts") / filename
    if font_path.exists():
        return ImageFont.truetype(str(font_path), size)
    return ImageFont.load_default()


def probe_video(file_path: Path) -> dict[str, float | int]:
    capture = cv2.VideoCapture(str(file_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video: {file_path}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    capture.release()
    if fps <= 0 or frame_count <= 0 or width <= 0 or height <= 0:
        raise RuntimeError(f"Invalid video metadata: {file_path}")
    return {
        "fps": fps,
        "frameCount": frame_count,
        "durationSeconds": frame_count / fps,
        "width": width,
        "height": height,
    }


def detect_bright_onset(
    file_path: Path,
    *,
    baseline_before_seconds: float,
    search_start_seconds: float,
) -> dict[str, float | int]:
    capture = cv2.VideoCapture(str(file_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot inspect onset: {file_path}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    counts: list[int] = []
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        counts.append(int((frame.max(axis=2) >= 245).sum()))
    capture.release()
    baseline_end = max(1, min(len(counts), int(baseline_before_seconds * fps)))
    baseline_median = float(statistics.median(counts[:baseline_end]))
    threshold = baseline_median + 1000
    search_start = max(0, int(search_start_seconds * fps))
    onset_frame = next(
        (
            index
            for index in range(search_start, len(counts))
            if counts[index] >= threshold
        ),
        None,
    )
    if onset_frame is None:
        raise RuntimeError(f"No bright visible onset found in {file_path}")
    return {
        "metric": "pixel count with max RGB channel >= 245",
        "baselineMedian": baseline_median,
        "threshold": threshold,
        "frameIndex": onset_frame,
        "seconds": onset_frame / fps,
        "pixelCount": counts[onset_frame],
    }


def validate_nwn_oracle(summary: dict[str, object]) -> dict[str, object]:
    lifecycle = summary.get("lifecycle")
    checks = summary.get("checks")
    if not isinstance(lifecycle, dict) or not isinstance(checks, dict):
        raise RuntimeError("Saved NWN validation summary is incomplete.")
    validation = {
        "status": summary.get("status") == "valid-single-trigger-visible-nwn-oracle",
        "singleTrigger": checks.get("exactlyOneTriggerMarker") is True,
        "durationMarker": checks.get("expectedEndMarkerForDuration") is True,
        "decodes": checks.get("mp4Decodes") is True,
        "baseline": checks.get("baselineBeforeVisibleEffect") is True,
        "visibleInterval": checks.get("visibleEffectIntervalPresent") is True,
        "durationMargins": checks.get("captureCoversRequestedDurationPlusMargins") is True,
        "noAutomaticRetry": checks.get("noAutomaticRetry") is True,
        "fireAndForget": lifecycle.get("requestedDurationSeconds") == 0.0,
    }
    failed = [name for name, passed in validation.items() if not passed]
    if failed:
        raise RuntimeError(f"Saved NWN oracle validation failed: {', '.join(failed)}")
    detected = detect_bright_onset(
        NWN_VIDEO,
        baseline_before_seconds=5.0,
        search_start_seconds=10.0,
    )
    validated_onset = float(lifecycle["onsetVideoSeconds"])
    if abs(float(detected["seconds"]) - validated_onset) > 1 / float(
        lifecycle["fps"]
    ):
        raise RuntimeError("Detected NWN onset disagrees with the validated oracle.")
    return {
        "checks": validation,
        "onset": detected,
        "validatedOnsetSeconds": validated_onset,
        "peakSeconds": float(lifecycle["peakVideoSeconds"]),
        "lastVisibleSeconds": float(lifecycle["lastVisibleVideoSeconds"]),
        "requestedDurationSeconds": 0.0,
    }


def validate_web_proof(summary: dict[str, object]) -> dict[str, object]:
    active_proof_state = summary.get("activeProofState")
    if not isinstance(active_proof_state, dict):
        raise RuntimeError("Aurora Web summary has no activeProofState.")
    active_observability = active_proof_state.get("runtimeObservability")
    if not isinstance(active_observability, dict):
        raise RuntimeError("Aurora Web active proof has no observability report.")

    proof_state = summary.get("finalProofState", summary.get("proofState"))
    if not isinstance(proof_state, dict):
        raise RuntimeError("Aurora Web summary has no finalProofState.")
    report = proof_state.get("runtimeObservability")
    if not isinstance(report, dict):
        raise RuntimeError("Aurora Web final proof has no observability report.")
    timeline = proof_state.get("timeline")
    if not isinstance(timeline, list) or not timeline:
        raise RuntimeError("Aurora Web final proof has no timeline.")
    final_sample = max(
        (sample for sample in timeline if isinstance(sample, dict)),
        key=lambda sample: float(sample.get("wallSeconds", -1)),
    )

    identity = report.get("identity")
    host_graph = report.get("hostGraph")
    assets = report.get("assetSettlement")
    draws = report.get("drawLedger")
    playback = report.get("playbackGuard")
    overlay = report.get("debugOverlay")
    gate = report.get("proofGate")
    if not all(
        isinstance(value, dict)
        for value in [identity, host_graph, assets, draws, playback, overlay, gate]
    ):
        raise RuntimeError("Aurora Web observability report is incomplete.")

    render_debug = active_proof_state.get("renderDebug")
    attachment = (
        render_debug.get("objectAttachment")
        if isinstance(render_debug, dict)
        else None
    )
    attachment_position = (
        attachment.get("worldPosition") if isinstance(attachment, dict) else None
    )
    attachment_position_valid = (
        isinstance(attachment_position, list)
        and len(attachment_position) == 3
        and all(
            abs(float(actual) - expected) <= 1e-12
            for actual, expected in zip(
                attachment_position,
                EXPECTED_ATTACHMENT_POSITION,
                strict=True,
            )
        )
    )
    checks = {
        "recordedSingleDeterministicPlayback": (
            summary.get("status") == "recorded-single-deterministic-playback"
        ),
        "deterministicCapture": summary.get("mp4DeterministicCapture") is True,
        "exactFrameCount": summary.get("mp4FrameCount") == EXPECTED_WEB_FRAME_COUNT,
        "exactFps": summary.get("mp4Fps") == WEB_TIMELINE_FPS,
        "exactDuration": summary.get("mp4DurationMs") == EXPECTED_WEB_DURATION_MS,
        "singleTrigger": summary.get("triggerCount") == 1,
        "loopDisabled": summary.get("loop") is False,
        "captureArmedBeforePlayback": summary.get("captureArmedBeforePlayback") is True,
        "diagnosticHarnessDisabled": summary.get("diagnosticHarness") is False,
        "observabilityVersion": report.get("version") == EXPECTED_OBSERVABILITY_VERSION,
        "activeObservabilityVersion": (
            active_observability.get("version") == EXPECTED_OBSERVABILITY_VERSION
        ),
        "activeProofGate": (
            active_observability.get("proofGate", {}).get("status") == "pass"
        ),
        "activeBlockerManifestEmpty": (
            active_observability.get("proofGate", {}).get("blockerManifest")
            in ({}, [], None)
        ),
        "identity": identity.get("status") == "ready",
        "hostGraph": host_graph.get("status") == "pass",
        "assets": assets.get("status") == "settled",
        "draws": draws.get("status") == "pass",
        "playbackGuard": playback.get("status") == "pass",
        "playbackSingleTrigger": playback.get("triggerCount") == 1,
        "playbackLoopDisabled": playback.get("loop") is False,
        "playbackNoOverlap": playback.get("overlapCount") == 0,
        "playbackDuration": abs(
            float(playback.get("durationSeconds", -1))
            - EXPECTED_PLAYBACK_DURATION_SECONDS
        )
        <= 1e-9,
        "playbackCompleted": playback.get("completed") is True,
        "postDurationHidden": (
            playback.get("postDurationHidden") is True
            and playback.get("postDurationHiddenRequired") is True
        ),
        "proofGate": gate.get("status") == "pass",
        "blockerManifestEmpty": gate.get("blockerManifest") in ({}, [], None),
        "overlayFinalProfileDisabled": overlay.get("finalProfileDisabled") is True,
        "finalPhase": final_sample.get("phase") == "post",
        "finalDrawsZero": final_sample.get("drawParticles") == 0,
        "finalVisibleZero": final_sample.get("visibleFrameCount") == 0,
        "attachmentStatus": (
            isinstance(attachment, dict) and attachment.get("status") == "attached"
        ),
        "attachmentNode": (
            isinstance(attachment, dict)
            and attachment.get("resolvedNodeName") == "Impact"
        ),
        "attachmentPosition": attachment_position_valid,
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise RuntimeError(f"Aurora Web proof validation failed: {', '.join(failed)}")

    return {
        "checks": checks,
        "terminalTimelineSample": {
            "wallSeconds": final_sample.get("wallSeconds"),
            "effectSeconds": final_sample.get("effectSeconds"),
            "frameIndex": final_sample.get("frameIndex"),
            "phase": final_sample.get("phase"),
            "drawParticles": final_sample.get("drawParticles"),
            "visibleFrameCount": final_sample.get("visibleFrameCount"),
        },
        "runtimeObservability": {
            "version": report.get("version"),
            "identity": identity,
            "hostGraph": host_graph,
            "assetSettlement": assets,
            "drawLedger": draws,
            "playbackGuard": playback,
            "debugOverlay": overlay,
            "proofGate": gate,
        },
        "objectAttachment": attachment,
    }


def validate_fixture(fixture: dict[str, object]) -> dict[str, object]:
    proof_scene = fixture.get("proofScene")
    runtime = fixture.get("runtime")
    if not isinstance(proof_scene, dict) or not isinstance(runtime, dict):
        raise RuntimeError("Row50 fixture has no source-backed proof scene.")
    source_module = proof_scene.get("sourceModule")
    source_area = proof_scene.get("sourceArea")
    coverage = proof_scene.get("coverage")
    actors = proof_scene.get("actors")
    if not all(
        isinstance(value, dict) for value in [source_module, source_area, coverage]
    ) or not isinstance(actors, list):
        raise RuntimeError("Row50 source-backed proof scene is incomplete.")
    actor = actors[0] if actors and isinstance(actors[0], dict) else {}
    validation = {
        "fixture": fixture.get("fixtureId") == "vfx-broad-row50",
        "runtimeDt": abs(
            float(runtime.get("dtSeconds", -1)) - EXPECTED_RUNTIME_DT_SECONDS
        )
        <= 1e-12,
        "outputFrameStride": runtime.get("outputFrameStride")
        == EXPECTED_OUTPUT_FRAME_STRIDE,
        "serializedFrameStep": abs(
            float(runtime.get("serializedFrameStepSeconds", -1))
            - EXPECTED_SERIALIZED_FRAME_STEP_SECONDS
        )
        <= 1e-12,
        "runtimeDuration": abs(
            float(runtime.get("durationSeconds", -1))
            - EXPECTED_PLAYBACK_DURATION_SECONDS
        )
        <= 1e-9,
        "sceneStatus": proof_scene.get("status")
        == "source-backed-exact-row50-module-area-target-actor",
        "moduleHash": source_module.get("sha256")
        == "f7602d85db6768af7940f7de19aa54799ab1e9398aa224451bd6bf9d94b24fb1",
        "areaAreHash": source_area.get("areSha256")
        == "3bd24a1014ac5052a34e77c200fda9dc05b908bdc4f696f9b485ea76d9eb6f3c",
        "areaGitHash": source_area.get("gitSha256")
        == "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6",
        "sourceTiles": coverage.get("sourceTileCount") == 4,
        "admittedTiles": coverage.get("admittedTileCount") == 4,
        "unresolvedTiles": coverage.get("unresolvedTileCount") == 0,
        "singleTargetActor": len(actors) == 1,
        "targetModel": actor.get("sourceModel") == "c_yinnkeep",
        "targetAnimation": actor.get("animationName") == "pause1",
        "targetAtOrigin": actor.get("normalizedPosition") == [0, 0, 0],
    }
    failed = [name for name, passed in validation.items() if not passed]
    if failed:
        raise RuntimeError(f"Row50 fixture validation failed: {', '.join(failed)}")
    return {
        "checks": validation,
        "status": proof_scene.get("status"),
        "coverage": coverage,
        "actor": actor,
        "omittedOracleObjects": proof_scene.get("omittedOracleObjects"),
        "knownRuntimeGap": fixture.get("knownRuntimeGap"),
    }


def create_header() -> None:
    HEADER.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", HEADER_SIZE, "#171d21")
    draw = ImageDraw.Draw(image)
    draw.text(
        (18, 10),
        "row50 | VFX_IMP_DEATH / vdu_death01 | fire-and-forget",
        fill="#f7f9fa",
        font=load_font(24, bold=True),
    )
    draw.text(
        (18, 53),
        "NWN retail oracle (saved approved MP4)",
        fill="#ffffff",
        font=load_font(17, bold=True),
    )
    draw.text(
        (658, 53),
        WEB_HEADER_LABEL,
        fill="#ffffff",
        font=load_font(17, bold=True),
    )
    draw.line((640, 43, 640, 90), fill="#55636d", width=2)
    image.save(HEADER, optimize=True)


def create_web_timeline_video() -> dict[str, float | int]:
    source_probe = probe_video(WEB_VIDEO)
    command = [
        str(FFMPEG_PATH),
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        str(WEB_VIDEO),
        "-vf",
        f"setpts=N/({WEB_TIMELINE_FPS}*TB)",
        "-an",
        "-r",
        str(WEB_TIMELINE_FPS),
        "-fps_mode",
        "cfr",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "18",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(WEB_TIMELINE_VIDEO),
    ]
    subprocess.run(command, check=True, cwd=REPO_ROOT)
    timeline_probe = probe_video(WEB_TIMELINE_VIDEO)
    if timeline_probe["frameCount"] != source_probe["frameCount"]:
        raise RuntimeError(
            "Aurora Web timeline normalization changed the encoded frame count: "
            f"source={source_probe}, normalized={timeline_probe}"
        )
    if abs(float(timeline_probe["fps"]) - WEB_TIMELINE_FPS) > 0.01:
        raise RuntimeError(f"Unexpected normalized Web fps: {timeline_probe}")
    return timeline_probe


def create_comparison_video(nwn_start: float, web_start: float) -> None:
    create_header()
    filter_graph = (
        f"[0:v]fps={FPS},setsar=1,scale={PANEL_SIZE[0]}:{PANEL_SIZE[1]}:"
        "force_original_aspect_ratio=decrease,"
        f"pad={PANEL_SIZE[0]}:{PANEL_SIZE[1]}:(ow-iw)/2:(oh-ih)/2:"
        "color=0x090b0c,setsar=1[left];"
        f"[1:v]fps={FPS},setsar=1,scale={PANEL_SIZE[0]}:{PANEL_SIZE[1]}:"
        "force_original_aspect_ratio=decrease,"
        f"pad={PANEL_SIZE[0]}:{PANEL_SIZE[1]}:(ow-iw)/2:(oh-ih)/2:"
        "color=0x090b0c,setsar=1[right];"
        "[left][right]hstack=inputs=2[body];"
        f"[2:v]fps={FPS},scale={HEADER_SIZE[0]}:{HEADER_SIZE[1]},setsar=1[header];"
        "[header][body]vstack=inputs=2[out]"
    )
    command = [
        str(FFMPEG_PATH),
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        f"{nwn_start:.9f}",
        "-i",
        str(NWN_VIDEO),
        "-ss",
        f"{web_start:.9f}",
        "-i",
        str(WEB_TIMELINE_VIDEO),
        "-loop",
        "1",
        "-framerate",
        str(FPS),
        "-i",
        str(HEADER),
        "-filter_complex",
        filter_graph,
        "-map",
        "[out]",
        "-t",
        f"{COMPARISON_DURATION_SECONDS:.6f}",
        "-an",
        "-r",
        str(FPS),
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(OUTPUT_VIDEO),
    ]
    subprocess.run(command, check=True, cwd=REPO_ROOT)
    probe = probe_video(OUTPUT_VIDEO)
    if (probe["width"], probe["height"]) != OUTPUT_SIZE:
        raise RuntimeError(f"Unexpected comparison dimensions: {probe}")


def read_frame(file_path: Path, elapsed_seconds: float) -> Image.Image:
    capture = cv2.VideoCapture(str(file_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open comparison: {file_path}")
    capture.set(cv2.CAP_PROP_POS_MSEC, elapsed_seconds * 1000)
    ok, frame = capture.read()
    capture.release()
    if not ok:
        raise RuntimeError(f"Cannot read frame at {elapsed_seconds:.3f}s: {file_path}")
    return Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))


def create_contact_sheet() -> list[dict[str, float | str]]:
    samples = [
        ("baseline", 1.0),
        ("first visible", 2.0),
        ("early expansion", 2.5),
        ("retail peak vicinity", 3.1),
        ("retail last-visible vicinity", 4.1),
        ("Web late tail", 5.0),
        ("Web terminal tail", 6.0),
        ("post", 8.4),
    ]
    thumb_size = (640, 316)
    caption_height = 34
    sheet = Image.new(
        "RGB",
        (thumb_size[0] * 2, 4 * (thumb_size[1] + caption_height)),
        "#101417",
    )
    draw = ImageDraw.Draw(sheet)
    records: list[dict[str, float | str]] = []
    for index, (label, seconds) in enumerate(samples):
        frame = read_frame(OUTPUT_VIDEO, seconds)
        frame.thumbnail(thumb_size, Image.Resampling.LANCZOS)
        x = (index % 2) * thumb_size[0]
        y = (index // 2) * (thumb_size[1] + caption_height)
        draw.text(
            (x + 14, y + 7),
            f"{label} | aligned t={seconds:.1f} s",
            fill="#e9eef1",
            font=load_font(17, bold=True),
        )
        sheet.paste(frame, (x, y + caption_height))
        records.append({"label": label, "comparisonSeconds": seconds})
    sheet.save(CONTACT_SHEET, optimize=True)
    return records


def main() -> None:
    required_files = [
        FFMPEG_PATH,
        NWN_VIDEO,
        NWN_VALIDATED_SUMMARY,
        WEB_VIDEO,
        WEB_SUMMARY,
        WEB_FIXTURE_MANIFEST,
    ]
    for required in required_files:
        if not required.exists():
            raise RuntimeError(f"Required artifact is missing: {required}")
    expected_hashes = {
        NWN_VIDEO: EXPECTED_NWN_SHA256,
        WEB_VIDEO: EXPECTED_WEB_SHA256,
        WEB_SUMMARY: EXPECTED_WEB_SUMMARY_SHA256,
        WEB_FIXTURE_MANIFEST: EXPECTED_FIXTURE_SHA256,
    }
    for file_path, expected_hash in expected_hashes.items():
        if sha256(file_path) != expected_hash:
            raise RuntimeError(f"Approved artifact hash changed: {file_path}")

    nwn_summary = json.loads(NWN_VALIDATED_SUMMARY.read_text(encoding="utf-8"))
    web_summary = json.loads(WEB_SUMMARY.read_text(encoding="utf-8"))
    fixture_manifest = json.loads(
        WEB_FIXTURE_MANIFEST.read_text(encoding="utf-8")
    )
    nwn_validation = validate_nwn_oracle(nwn_summary)
    web_validation = validate_web_proof(web_summary)
    fixture_validation = validate_fixture(fixture_manifest)
    web_timeline_probe = create_web_timeline_video()
    web_onset = detect_bright_onset(
        WEB_TIMELINE_VIDEO,
        baseline_before_seconds=1.5,
        search_start_seconds=1.5,
    )
    nwn_start = max(
        0.0,
        float(nwn_validation["onset"]["seconds"]) - COMPARISON_ONSET_SECONDS,
    )
    web_start = max(
        0.0,
        float(web_onset["seconds"]) - COMPARISON_ONSET_SECONDS,
    )

    COMPARISON_ROOT.mkdir(parents=True, exist_ok=True)
    create_comparison_video(nwn_start, web_start)
    samples = create_contact_sheet()
    output_probe = probe_video(OUTPUT_VIDEO)
    if output_probe["frameCount"] != 258:
        raise RuntimeError(f"Unexpected comparison frame count: {output_probe}")

    manifest = {
        "version": COMPARISON_CONTRACT_VERSION,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "matched-with-gaps",
        "fixtureId": "vfx-broad-row50",
        "sourceRowId": 50,
        "label": "VFX_IMP_DEATH",
        "policy": {
            "auroraFirst": True,
            "nwnRecordingReusedWithoutRerun": True,
            "auroraWebAcceptedPlaybackCount": 1,
            "comparisonDoesNotRetriggerEitherRuntime": True,
            "xoreosUsed": False,
        },
        "alignment": {
            "strategy": "independently detected first-bright-visible onset aligned at comparison t=2.0 s",
            "comparisonOnsetSeconds": COMPARISON_ONSET_SECONDS,
            "nwnSourceOnset": nwn_validation["onset"],
            "nwnValidatedSourceOnsetSeconds": nwn_validation[
                "validatedOnsetSeconds"
            ],
            "nwnSourceStartSeconds": nwn_start,
            "nwnPeakSourceSeconds": nwn_validation["peakSeconds"],
            "nwnLastVisibleSourceSeconds": nwn_validation["lastVisibleSeconds"],
            "auroraWebSourceOnset": web_onset,
            "auroraWebSourceStartSeconds": web_start,
            "durationSeconds": COMPARISON_DURATION_SECONDS,
            "samples": samples,
        },
        "nwn": {
            "video": media_record(NWN_VIDEO),
            "validatedSummary": media_record(NWN_VALIDATED_SUMMARY),
            "probe": probe_video(NWN_VIDEO),
            "oracleStatus": "approved-saved-retail-capture",
            "validation": nwn_validation,
        },
        "auroraWeb": {
            "video": media_record(WEB_VIDEO),
            "summary": media_record(WEB_SUMMARY),
            "fixtureManifest": media_record(WEB_FIXTURE_MANIFEST),
            "probe": probe_video(WEB_VIDEO),
            "timelineNormalizedPresentation": {
                "video": media_record(WEB_TIMELINE_VIDEO),
                "probe": web_timeline_probe,
                "sourceFrameCountPreserved": True,
                "timelineFps": WEB_TIMELINE_FPS,
                "method": (
                    f"encoded frames re-timestamped as N/({WEB_TIMELINE_FPS}*TB); "
                    "no runtime replay"
                ),
            },
            "validation": web_validation,
            "fixtureValidation": fixture_validation,
            "runtimeIdentity": web_validation["runtimeObservability"]["identity"],
        },
        "comparison": {
            "video": media_record(OUTPUT_VIDEO),
            "contactSheet": media_record(CONTACT_SHEET),
            "probe": output_probe,
            "layout": "NWN left; Aurora Web right",
        },
        "matchedContracts": [
            "one intentional fire-and-forget trigger with loop disabled and overlap count zero",
            "source-backed row50 target position and nw_innkeeper/c_yinnkeep pause1 actor",
            "all four exact source tile instances resolve through the packed module HAK precedence",
            "Imp_Impact_Node resolves to the source-backed target Impact node under the one-time proof-frame X mirror",
            "VFX group remains world-oriented because visualeffects.2da row50 has OrientWithObject=0",
            "five emitter hosts and AuroraLight01 are attached",
            "clean post state with zero drawn particles and zero visible frames",
        ],
        "openParityGaps": OPEN_PARITY_GAPS,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    print(
        json.dumps(
            {
                "status": manifest["status"],
                "nwnReused": True,
                "auroraWebAcceptedPlaybackCount": 1,
                "nwnOnsetSeconds": nwn_validation["onset"]["seconds"],
                "webOnsetSeconds": web_onset["seconds"],
                "webProofGate": web_validation["runtimeObservability"]["proofGate"][
                    "status"
                ],
                "postDurationHidden": web_validation["runtimeObservability"][
                    "playbackGuard"
                ]["postDurationHidden"],
                "comparison": media_record(OUTPUT_VIDEO),
                "contactSheet": media_record(CONTACT_SHEET),
                "manifest": media_record(MANIFEST),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
