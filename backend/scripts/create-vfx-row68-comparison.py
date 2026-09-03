from __future__ import annotations

import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[2]
ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-web-row68"
)
NWN_SUMMARY_PATH = ROOT / "nwn" / "validated-summary.json"
WEB_CAPTURE_TAG = os.environ.get("VFX_WEB_CAPTURE_TAG", "v11")
COMPARISON_TAG = os.environ.get("VFX_COMPARISON_TAG", "v6")
WEB_SUMMARY_PATH = ROOT / "web" / f"validated-summary-{WEB_CAPTURE_TAG}.json"
MANIFEST_PATH = ROOT / "fixture-manifest.json"
OUTPUT_IMAGE_PATH = ROOT / f"nwn-vs-aurora-web-row68-comparison-{COMPARISON_TAG}.png"
OUTPUT_JSON_PATH = ROOT / f"nwn-vs-aurora-web-row68-comparison-{COMPARISON_TAG}.json"
OUTPUT_VIDEO_PATH = ROOT / f"nwn-vs-aurora-web-row68-comparison-{COMPARISON_TAG}.mp4"
OUTPUT_CONTACT_SHEET_PATH = (
    ROOT / f"nwn-vs-aurora-web-row68-comparison-{COMPARISON_TAG}-contact-sheet.png"
)
OUTPUT_HEADER_PATH = ROOT / f"nwn-vs-aurora-web-row68-comparison-{COMPARISON_TAG}-header.png"
OUTPUT_MD_PATH = ROOT / "README.md"
FFMPEG_PATH = Path(
    os.environ.get(
        "FFMPEG_PATH",
        "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
        "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
    )
)
COMPARISON_FPS = 8


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


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def fit_panel(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    contained = ImageOps.contain(source.convert("RGB"), size, Image.Resampling.LANCZOS)
    panel = Image.new("RGB", size, "#101214")
    panel.paste(
        contained,
        ((size[0] - contained.width) // 2, (size[1] - contained.height) // 2),
    )
    return panel


def probe_video(path: Path) -> dict[str, float | int]:
    capture = cv2.VideoCapture(str(path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not decode comparison video: {path}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    capture.release()
    if fps <= 0 or frame_count <= 0 or width <= 0 or height <= 0:
        raise RuntimeError(f"Invalid comparison video metadata: {path}")
    return {
        "fps": fps,
        "frameCount": frame_count,
        "durationSeconds": frame_count / fps,
        "width": width,
        "height": height,
    }


def create_comparison_header() -> None:
    image = Image.new("RGB", (1280, 84), "#1d252b")
    draw = ImageDraw.Draw(image)
    draw.text(
        (18, 8),
        "row68 | VFX_IMP_HEALING_M | encoded-frame onset aligned",
        fill="#f7f9fa",
        font=load_font(24, bold=True),
    )
    draw.text((18, 48), "NWN retail oracle", fill="#ffffff", font=load_font(17, bold=True))
    draw.text((658, 48), "Aurora Web current runtime", fill="#ffffff", font=load_font(17, bold=True))
    draw.text((1060, 12), "one trigger each", fill="#b8c2c9", font=load_font(15))
    draw.line((640, 42, 640, 82), fill="#55636d", width=2)
    image.save(OUTPUT_HEADER_PATH, optimize=True)


def create_comparison_video(
    nwn_video: Path,
    web_video: Path,
    nwn_start_seconds: float,
    duration_seconds: float,
) -> dict[str, object]:
    if not FFMPEG_PATH.exists():
        raise RuntimeError(f"ffmpeg is missing: {FFMPEG_PATH}")
    create_comparison_header()
    if not OUTPUT_VIDEO_PATH.exists():
        filter_graph = (
            "[0:v]fps=8,scale=640:360:force_original_aspect_ratio=decrease,"
            "pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[left];"
            "[1:v]fps=8,scale=640:360:force_original_aspect_ratio=decrease,"
            "pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[right];"
            "[left][right]hstack=inputs=2[body];"
            "[2:v]fps=8,scale=1280:84,setsar=1[header];"
            "[header][body]vstack=inputs=2[out]"
        )
        subprocess.run(
            [
                str(FFMPEG_PATH),
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-ss",
                f"{nwn_start_seconds:.6f}",
                "-i",
                str(nwn_video),
                "-i",
                str(web_video),
                "-loop",
                "1",
                "-framerate",
                str(COMPARISON_FPS),
                "-i",
                str(OUTPUT_HEADER_PATH),
                "-filter_complex",
                filter_graph,
                "-map",
                "[out]",
                "-t",
                f"{duration_seconds:.6f}",
                "-an",
                "-r",
                str(COMPARISON_FPS),
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "22",
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                str(OUTPUT_VIDEO_PATH),
            ],
            check=True,
            cwd=REPO_ROOT,
        )
    probe = probe_video(OUTPUT_VIDEO_PATH)
    if probe["width"] != 1280 or probe["height"] != 444:
        raise RuntimeError(f"Unexpected row68 comparison dimensions: {probe}")
    return {**media_record(OUTPUT_VIDEO_PATH), **probe}


def create_contact_sheet(video_path: Path, sample_seconds: list[float]) -> dict[str, object]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not decode comparison contact-sheet input: {video_path}")
    frames: list[Image.Image] = []
    for seconds in sample_seconds:
        capture.set(cv2.CAP_PROP_POS_MSEC, seconds * 1000)
        ok, frame = capture.read()
        if not ok:
            capture.release()
            raise RuntimeError(f"Could not read comparison frame at {seconds:.3f}s")
        frames.append(Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)))
    capture.release()
    sheet = Image.new("RGB", (1280, len(frames) * 444), "#101214")
    for index, frame in enumerate(frames):
        sheet.paste(frame, (0, index * 444))
    sheet.save(OUTPUT_CONTACT_SHEET_PATH, optimize=True)
    return {
        **media_record(OUTPUT_CONTACT_SHEET_PATH),
        "sampleSeconds": sample_seconds,
    }


def analyze_shared_bloom_brightness(
    video_path: Path, baseline_seconds: float
) -> dict[str, object]:
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not decode comparison input: {video_path}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    metrics: list[int] = []
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        metrics.append(int(np.count_nonzero(frame.max(axis=2) >= 180)))
    capture.release()
    if not metrics or fps <= 0:
        raise RuntimeError(f"Comparison input has no frames: {video_path}")
    baseline_count = max(1, min(len(metrics), int(fps * baseline_seconds)))
    baseline = np.asarray(metrics[:baseline_count], dtype=np.float64)
    baseline_p99 = float(np.percentile(baseline, 99))
    visibility_threshold = max(100.0, baseline_p99 + 100.0)
    visible = [index for index, metric in enumerate(metrics) if metric > visibility_threshold]
    if not visible:
        raise RuntimeError(f"No common-metric visible interval in {video_path}")
    peak_index = int(np.argmax(np.asarray(metrics)))
    return {
        "video": str(video_path),
        "fps": fps,
        "frameCount": len(metrics),
        "baselineSeconds": baseline_seconds,
        "baselineFrameCount": baseline_count,
        "baselineP99": baseline_p99,
        "visibilityThreshold": visibility_threshold,
        "onsetVideoSeconds": visible[0] / fps,
        "peakVideoSeconds": peak_index / fps,
        "peakMetric": metrics[peak_index],
        "lastVisibleVideoSeconds": visible[-1] / fps,
        "visibleSpanSeconds": (visible[-1] - visible[0] + 1) / fps,
        "visibleFrameCount": len(visible),
    }


nwn = json.loads(NWN_SUMMARY_PATH.read_text(encoding="utf-8"))
web = json.loads(WEB_SUMMARY_PATH.read_text(encoding="utf-8"))
manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
if web.get("status") != "valid-single-playback-web-proof":
    raise RuntimeError(
        f"Web proof {WEB_CAPTURE_TAG} is not capture-valid: {web.get('status')}"
    )
nwn_lifecycle = nwn["lifecycle"]
web_lifecycle = web["lifecycle"]
nwn_peak_path = Path(nwn_lifecycle["stills"]["peak"]["path"])
web_peak_path = Path(web_lifecycle["stills"]["peak"]["path"])
nwn_shared_metric = analyze_shared_bloom_brightness(Path(nwn["video"]["path"]), 6.0)
web_shared_metric = analyze_shared_bloom_brightness(Path(web["video"]["path"]), 1.5)
nwn_video_path = Path(nwn["video"]["path"])
web_video_path = Path(web["video"]["path"])
nwn_video_probe = probe_video(nwn_video_path)
web_video_probe = probe_video(web_video_path)
nwn_start_seconds = max(
    0.0,
    float(nwn_shared_metric["onsetVideoSeconds"])
    - float(web_shared_metric["onsetVideoSeconds"]),
)
comparison_duration_seconds = min(
    float(web_video_probe["durationSeconds"]),
    float(nwn_video_probe["durationSeconds"]) - nwn_start_seconds,
)
comparison_video = create_comparison_video(
    nwn_video_path,
    web_video_path,
    nwn_start_seconds,
    comparison_duration_seconds,
)
contact_sheet = create_contact_sheet(
    OUTPUT_VIDEO_PATH,
    [
        max(0.0, float(web_shared_metric["onsetVideoSeconds"]) - 0.25),
        float(web_shared_metric["peakVideoSeconds"]),
        min(
            comparison_duration_seconds - (1 / COMPARISON_FPS),
            max(
                float(nwn_shared_metric["lastVisibleVideoSeconds"])
                - nwn_start_seconds,
                float(web_shared_metric["lastVisibleVideoSeconds"]),
            )
            + 0.25,
        ),
    ],
)

canvas = Image.new("RGB", (1920, 820), "#171a1d")
draw = ImageDraw.Draw(canvas)
title_font = load_font(34, bold=True)
label_font = load_font(25, bold=True)
body_font = load_font(20)
muted_font = load_font(17)

draw.text((42, 28), "VFX_IMP_HEALING_M (row 68) - single-trigger comparison", fill="#f4f6f8", font=title_font)
draw.text(
    (42, 72),
    "Same retail source model vim_heal04.mdl | same bloom-bright metric (max channel >= 180)",
    fill="#aeb8c2",
    font=muted_font,
)

left_x, right_x, panel_y = 42, 981, 140
panel_size = (897, 560)
with Image.open(nwn_peak_path) as image:
    canvas.paste(fit_panel(image, panel_size), (left_x, panel_y))
with Image.open(web_peak_path) as image:
    canvas.paste(fit_panel(image, panel_size), (right_x, panel_y))

draw.rectangle((left_x, 104, left_x + panel_size[0], 140), fill="#26313a")
draw.rectangle((right_x, 104, right_x + panel_size[0], 140), fill="#26313a")
draw.text((left_x + 14, 108), "NWN retail - one EffectVisualEffect trigger", fill="#ffffff", font=label_font)
draw.text((right_x + 14, 108), f"aurora-web {WEB_CAPTURE_TAG} - one deterministic playback", fill="#ffffff", font=label_font)

nwn_span = float(nwn_shared_metric["visibleSpanSeconds"])
web_span = float(web_shared_metric["visibleSpanSeconds"])
delta = web_span - nwn_span
frame_interval = 1 / float(nwn_lifecycle["fps"])
timing_aligned = abs(delta) <= frame_interval
proof_scene_status = str((manifest.get("proofScene") or {}).get("status") or "")
source_backed_scene_target = proof_scene_status.startswith(
    "source-backed-exact-row68-"
)
if source_backed_scene_target:
    comparison_status = (
        "valid-comparison-source-backed-scene-bic-target-calibrated-camera-"
        "open-pixel-and-timing-gaps"
    )
else:
    comparison_status = (
        "valid-comparison-source-backed-bloom-timing-aligned-with-open-spatial-gap"
        if timing_aligned
        else "valid-comparison-source-backed-bloom-with-open-timing-and-spatial-gaps"
    )
draw.text(
    (left_x, 720),
    f"Visible span: {nwn_span:.3f} s | peak at video {float(nwn_shared_metric['peakVideoSeconds']):.3f} s",
    fill="#f4f6f8",
    font=body_font,
)
draw.text(
    (right_x, 720),
    f"Visible span: {web_span:.3f} s | peak at video {float(web_shared_metric['peakVideoSeconds']):.3f} s",
    fill="#f4f6f8",
    font=body_font,
)
draw.text(
    (42, 765),
    (
        f"Current result: Fountain density + mode-2 front-face/culling fixed; timing delta {delta:+.3f} s; "
        "native creature/head attachment fixed; emitter-space, camera, and pixel gaps remain open."
    ),
    fill="#ffc857",
    font=body_font,
)
canvas.save(OUTPUT_IMAGE_PATH, optimize=True)

comparison = {
    "version": "aurora-vfx-nwn-web-comparison/v1",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "fixtureId": "vfx-nwn-web-row68",
    "sourceRowId": 68,
    "sourceLabel": "VFX_IMP_HEALING_M",
    "status": comparison_status,
    "source": {
        "modelResRef": "vim_heal04",
        "modelSha256": manifest["sourceModel"]["sha256"],
        "animationName": manifest["runtime"]["animationName"],
        "animationLengthSeconds": manifest["runtime"]["animationLengthSeconds"],
        "emitterNames": manifest["emitterNames"],
        "sourceLightNames": manifest["sourceLightNames"],
    },
    "proofRules": {
        "nwnExactTriggerCount": 1,
        "nwnRecordingReusedWithoutRerun": True,
        "webExactPlaybackCount": 1,
        "webLoop": False,
        "overlappingEffects": False,
        "sharedPixelMetric": "bloom-bright-pixel-count(max-channel>=180)",
        "sharedVisibilityThresholdPolicy": "max(100, baselineP99 + 100)",
    },
    "nwn": {
        "validatedSummary": str(NWN_SUMMARY_PATH),
        "video": nwn["video"],
        "visibleSpanSeconds": nwn_span,
        "sharedMetricLifecycle": nwn_shared_metric,
        "peakStill": str(nwn_peak_path),
    },
    "auroraWeb": {
        "validatedSummary": str(WEB_SUMMARY_PATH),
        "video": web["video"],
        "visibleSpanSeconds": web_span,
        "sharedMetricLifecycle": web_shared_metric,
        "peakStill": str(web_peak_path),
        "allEmittersEndWithZeroActiveParticles": web["checks"][
            "allEmittersEndWithZeroActiveParticles"
        ],
        "bloom": web["bloom"],
        "proofSceneStatus": proof_scene_status,
        "sourceBackedExactBicTarget": source_backed_scene_target,
        "objectAttachment": web["objectAttachment"],
    },
    "comparison": {
        "visibleSpanDeltaSecondsWebMinusNwn": delta,
        "nwnFrameIntervalSeconds": frame_interval,
        "timingAlignedWithinNwnFrameInterval": timing_aligned,
        "previousV7VisibleSpanDeltaSecondsWebMinusNwn": -0.3461240310077518,
        "previousV8VisibleSpanDeltaSecondsWebMinusNwn": 0.04908527131782958,
        "previousV9VisibleSpanDeltaSecondsWebMinusNwn": -0.0654147286821708,
        "fountainDensityAndCullCorrection": {
            "v9MaxActiveCounts": [23, 8, 16, 15],
            "v10MaxActiveCounts": [68, 24, 64, 45],
            "v11MaxActiveCounts": [
                int(entry["maxActiveParticleCount"])
                for entry in web["runtimeFrameCounts"]
            ],
            "v9PeakMetric": 793,
            "v10PeakMetric": 2118,
            "v11PeakMetric": int(web_shared_metric["peakMetric"]),
            "v11MaterialCullLane": "default_cull_lane",
            "v11Mode2FrontFace": "aurora-plus-z-mapped-to-three-plus-y",
        },
        "sharedMetric": "bloom-bright-pixel-count(max-channel>=180)",
        "sharedVisibilityThresholdPolicy": "max(100, baselineP99 + 100)",
        "sharedFeatures": [
            "yellow-white central burst",
            "white core with cool secondary sparks",
            "ascending spark and ray elements",
        ],
        "openParityGaps": [
            "the exact NWN camera matrix is not recovered; the Web perspective is a saved-frame calibration",
            (
                "the exact first-PC BIC target and Area geometry are recovered, but the Web floor/material/lighting response still differs from the saved retail room"
                if source_backed_scene_target
                else "the Web target and scene are not source matched"
            ),
            "the object-applied effect now follows Aurora's native creature head node with OrientWithGround=0, but at the aligned peak the Web cool core and ascending yellow column still occupy a taller vertical screen-space span; emitter-space composition and camera projection require a separate Aurora-first audit",
            "the encoded-pixel Web visible span is longer, but unmatched camera/material/postprocess and encoder cadence do not authorize lifecycle tuning",
        ],
        "sourceLightProof": {
            "nodeName": "flash",
            "radius": 5,
            "multiplier": 1.6,
            "receiverIlluminationMeasured": web["checks"][
                "receiverShowsSourceLightIllumination"
            ],
            "finalBlackKeyHeld": web["checks"][
                "sourceFlashLightHoldsFinalBlackKey"
            ],
        },
        "compositeImage": str(OUTPUT_IMAGE_PATH),
        "onsetAlignedVideo": comparison_video,
        "contactSheet": contact_sheet,
        "alignment": {
            "mode": "encoded-frame-onset-aligned-not-runtime-time",
            "nwnSourceStartSeconds": nwn_start_seconds,
            "webSourceStartSeconds": 0.0,
            "outputOnsetSeconds": float(web_shared_metric["onsetVideoSeconds"]),
            "durationSeconds": comparison_duration_seconds,
        },
    },
}
OUTPUT_JSON_PATH.write_text(json.dumps(comparison, indent=2), encoding="utf-8")

markdown = f"""# VFX row 68 NWN vs aurora-web proof

Status: `{comparison_status}`.

## Inputs

- NWN retail: one `EffectVisualEffect(VFX_IMP_HEALING_M)` trigger, saved MP4 reused without rerunning NWN.
- aurora-web: one deterministic playback, no loop, no overlap, clean baseline and post-roll.
- aurora-web bloom: source-backed retail profile `offset=0`, `steps=7`, `threshold=1.0`, `softness=0.9`, `multiplier=1.0`.
- Source: retail row 68, `vim_heal04.mdl`, impact animation `{manifest['runtime']['animationLengthSeconds']:.6f}` seconds.
- Runtime: four emitters and source light `flash`; all emitters end with zero active particles.

## Comparison

- Shared visual structure: yellow-white central burst, cyan-white core, rising sparks and rays.
- NWN visible span: `{nwn_span:.3f}` seconds.
- aurora-web visible span: `{web_span:.3f}` seconds.
- Current timing delta: `{delta:+.3f}` seconds in aurora-web under the same pixel metric; timingAlignedWithinNwnFrameInterval=`{str(timing_aligned).lower()}` for one `{frame_interval:.3f}` second NWN frame.
- Previous v7 timing delta: `-0.346` seconds; the source-axis and proof-scale correction removes that apparent timing defect.
- Previous v8 timing delta: `+0.049` seconds before the source-backed bloom pass.
- Fountain density correction: v9 max active counts `23/8/16/15` became v10/v11 `68/24/64/45` under the native x87 burst-count formula.
- Material/culling correction in v11: emitter `twosidedtex=0` uses the native cull-enabled lane, while reflected mode-2 quads reverse their triangle winding so Aurora `+Z` remains Three `+Y` on the front face.
- Object attachment correction in v22: source `Imp_HeadCon_Node` resolves to the native creature node `head`, not `headconjure`; `OrientWithGround=0` follows that node's live position while preserving the VFX orientation.
- Current context: the Web proof uses the exact first-PC BIC target, the admitted four-tile Area geometry, the GIT innkeeper, and the saved-frame calibrated perspective. The exact NWN camera matrix is still not recovered.
- Current spatial gap: after correcting the attachment height, the Web cool core and ascending yellow column still occupy a taller vertical screen-space span than retail, while the room floor/material/lighting response remains visibly different.
- Source light `flash`: radius `5`, multiplier `1.6`, receiver illumination measured, final black color key held through the particle tail.
- Capture limitation: the encoded-pixel timing delta is descriptive; different camera/material/postprocess response and encoder cadence prevent source-lifecycle tuning from this metric alone.

This packet proves the current Fountain scheduler, mode-2 front-face/culling, exact BIC target, native creature-head attachment, source scene, and source light in a valid single-trigger comparison. It does not claim retail visual parity.
"""
if os.environ.get("VFX_UPDATE_README") == "1":
    OUTPUT_MD_PATH.write_text(markdown, encoding="ascii")
print(json.dumps(comparison, indent=2))
