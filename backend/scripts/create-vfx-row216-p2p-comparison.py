from __future__ import annotations

import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import cv2
from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[2]
ROW_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-broad-proof-2026-07-16"
    / "row216"
)
NWN_VIDEO = ROW_ROOT / "nwn" / "nwn-row216-one-trigger.mp4"
NWN_SUMMARY = ROW_ROOT / "nwn" / "validated-summary.json"
WEB_STEM = "aurora-web-row216-one-trigger-p2p-audited-current-global-20260812"
WEB_VIDEO = ROW_ROOT / "aurora-web" / f"{WEB_STEM}.mp4"
WEB_SUMMARY = ROW_ROOT / "aurora-web" / f"{WEB_STEM}-summary.json"
OUTPUT_ROOT = ROW_ROOT / "comparison"
OUTPUT_STEM = "nwn-vs-aurora-web-row216-p2p-audited-onset-aligned-20260812"
OUTPUT_VIDEO = OUTPUT_ROOT / f"{OUTPUT_STEM}.mp4"
CONTACT_SHEET = OUTPUT_ROOT / f"{OUTPUT_STEM}-contact-sheet.png"
HEADER = OUTPUT_ROOT / f"{OUTPUT_STEM}-header.png"
MANIFEST = OUTPUT_ROOT / f"{OUTPUT_STEM}.json"
FFMPEG_PATH = Path(
    os.environ.get(
        "FFMPEG_PATH",
        "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
        "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
    )
)

EXPECTED_NWN_SHA256 = "0b0d5e91d176710c5b38cd9b4c7c2b885c3c08ab3c10142d8242e96495484f67"
EXPECTED_WEB_SHA256 = "fed5123aa1f809edc8600662faebde4d0b6e10e13d58266602b11c5ac4504382"
FPS = 30
WEB_ONSET_SECONDS = 2.0
COMPARISON_DURATION_SECONDS = 24.0
PANEL_SIZE = (640, 540)
HEADER_SIZE = (1280, 92)
OUTPUT_SIZE = (1280, 632)


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


def load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    filename = "arialbd.ttf" if bold else "arial.ttf"
    font_path = Path("C:/Windows/Fonts") / filename
    return ImageFont.truetype(str(font_path), size) if font_path.exists() else ImageFont.load_default()


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


def validate_inputs() -> tuple[dict[str, object], dict[str, object], float]:
    if not FFMPEG_PATH.exists():
        raise RuntimeError(f"ffmpeg is missing: {FFMPEG_PATH}")
    if sha256(NWN_VIDEO) != EXPECTED_NWN_SHA256:
        raise RuntimeError("The immutable NWN oracle hash changed.")
    if sha256(WEB_VIDEO) != EXPECTED_WEB_SHA256:
        raise RuntimeError("The accepted Aurora Web proof hash changed.")

    nwn = json.loads(NWN_SUMMARY.read_text(encoding="utf-8"))
    web = json.loads(WEB_SUMMARY.read_text(encoding="utf-8"))
    nwn_checks = nwn.get("checks", {})
    required_nwn_checks = [
        "exactlyOneTriggerMarker",
        "expectedEndMarkerForDuration",
        "mp4Decodes",
        "baselineBeforeVisibleEffect",
        "visibleEffectIntervalPresent",
        "captureCoversRequestedDurationPlusMargins",
        "noAutomaticRetry",
    ]
    if nwn.get("status") != "valid-single-trigger-visible-nwn-oracle":
        raise RuntimeError("The NWN oracle is not validated.")
    if not all(nwn_checks.get(name) is True for name in required_nwn_checks):
        raise RuntimeError("The NWN oracle checks are incomplete.")
    if float(nwn["lifecycle"]["requestedDurationSeconds"]) != 20.0:
        raise RuntimeError("The NWN requested duration is not 20 seconds.")

    guard = web["finalProofState"]["runtimeObservability"]["playbackGuard"]
    gate = web["finalProofState"]["runtimeObservability"]["proofGate"]
    web_checks = {
        "status": web.get("status") == "recorded-single-deterministic-playback",
        "captureMode": web.get("captureMode") == "playback",
        "triggerCount": web.get("triggerCount") == 1 and guard.get("triggerCount") == 1,
        "loopDisabled": web.get("loop") is False and guard.get("loop") is False,
        "noOverlap": guard.get("overlapCount") == 0,
        "duration": abs(float(guard.get("durationSeconds", 0)) - 20.0) < 1e-9,
        "completed": guard.get("completed") is True,
        "postHidden": guard.get("postDurationHidden") is True,
        "proofGate": gate.get("status") == "pass",
        "noBlockers": gate.get("blockerManifest") == [],
        "deterministicMp4": web.get("mp4DeterministicCapture") is True,
        "captureDuration": web.get("mp4DurationMs") == 24000,
        "fps": web.get("mp4Fps") == FPS,
        "frameCount": web.get("mp4FrameCount") == 720,
    }
    failed = [name for name, passed in web_checks.items() if not passed]
    if failed:
        raise RuntimeError(f"Aurora Web proof validation failed: {', '.join(failed)}")

    nwn_onset = float(nwn["lifecycle"]["onsetVideoSeconds"])
    return nwn, web, nwn_onset - WEB_ONSET_SECONDS


def create_header() -> None:
    image = Image.new("RGB", HEADER_SIZE, "#1d252b")
    draw = ImageDraw.Draw(image)
    draw.text((18, 9), "row216 | VFX_BEAM_FIRE_LASH | 20 s", fill="#f7f9fa", font=load_font(24, bold=True))
    draw.text((18, 52), "NWN retail oracle", fill="#ffffff", font=load_font(17, bold=True))
    draw.text((658, 52), "Aurora Web current runtime", fill="#ffffff", font=load_font(17, bold=True))
    draw.text((845, 13), "onset aligned at t=2.000 s; scene/camera differ", fill="#b8c2c9", font=load_font(15))
    draw.line((640, 43, 640, 90), fill="#55636d", width=2)
    image.save(HEADER, optimize=True)


def create_video(nwn_start_seconds: float) -> None:
    create_header()
    filter_graph = (
        "[0:v]fps=30,scale=640:540:force_original_aspect_ratio=decrease,"
        "pad=640:540:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[left];"
        "[1:v]fps=30,scale=640:540:force_original_aspect_ratio=decrease,"
        "pad=640:540:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[right];"
        "[left][right]hstack=inputs=2[body];"
        "[2:v]fps=30,scale=1280:92,setsar=1[header];"
        "[header][body]vstack=inputs=2[out]"
    )
    command = [
        str(FFMPEG_PATH), "-y", "-hide_banner", "-loglevel", "error",
        "-ss", f"{nwn_start_seconds:.9f}", "-i", str(NWN_VIDEO),
        "-i", str(WEB_VIDEO),
        "-loop", "1", "-framerate", str(FPS), "-i", str(HEADER),
        "-filter_complex", filter_graph, "-map", "[out]",
        "-t", f"{COMPARISON_DURATION_SECONDS:.6f}", "-an", "-r", str(FPS),
        "-c:v", "libx264", "-preset", "fast", "-crf", "22",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUTPUT_VIDEO),
    ]
    subprocess.run(command, check=True, cwd=REPO_ROOT)
    probe = probe_video(OUTPUT_VIDEO)
    if (probe["width"], probe["height"]) != OUTPUT_SIZE:
        raise RuntimeError(f"Unexpected comparison dimensions: {probe}")
    if abs(float(probe["durationSeconds"]) - COMPARISON_DURATION_SECONDS) > 0.05:
        raise RuntimeError(f"Unexpected comparison duration: {probe}")


def read_frame(elapsed_seconds: float) -> Image.Image:
    capture = cv2.VideoCapture(str(OUTPUT_VIDEO))
    capture.set(cv2.CAP_PROP_POS_MSEC, elapsed_seconds * 1000)
    ok, frame = capture.read()
    capture.release()
    if not ok:
        raise RuntimeError(f"Cannot read comparison at {elapsed_seconds:.3f}s")
    return Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))


def create_contact_sheet() -> None:
    samples = [(4.0, "effect +2 s"), (12.0, "effect +10 s"), (21.0, "effect +19 s"), (23.5, "post-effect")]
    sheet = Image.new("RGB", (1280, 738), "#101417")
    draw = ImageDraw.Draw(sheet)
    draw.text((18, 12), "row216 | onset-aligned NWN vs Aurora Web", fill="#f7f9fa", font=load_font(26, bold=True))
    draw.text((18, 44), "Full MP4 is authoritative; tiles are review samples.", fill="#b8c2c9", font=load_font(15))
    for index, (seconds, label) in enumerate(samples):
        frame = read_frame(seconds).resize((640, 316), Image.Resampling.LANCZOS)
        x = (index % 2) * 640
        y = 82 + (index // 2) * 328
        sheet.paste(frame, (x, y))
        draw.rectangle((x, y, x + 176, y + 25), fill="#101417")
        draw.text((x + 8, y + 4), f"t={seconds:.1f}s | {label}", fill="#ffffff", font=load_font(14, bold=True))
    sheet.save(CONTACT_SHEET, optimize=True)


def main() -> None:
    nwn, web, nwn_start = validate_inputs()
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    immutable_outputs = [OUTPUT_VIDEO, CONTACT_SHEET, MANIFEST]
    if any(path.exists() for path in immutable_outputs):
        raise RuntimeError("Comparison output already exists; reuse the immutable artifacts.")
    create_video(nwn_start)
    create_contact_sheet()
    manifest = {
        "version": "aurora-vfx-row216-onset-aligned-comparison/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "comparison-ready-open-camera-scene-parity-gaps",
        "fixtureId": "vfx-broad-row216",
        "alignment": {
            "strategy": "NWN validated visible onset aligned to Aurora Web deterministic effect start",
            "nwnSourceStartSeconds": nwn_start,
            "nwnSourceOnsetSeconds": float(nwn["lifecycle"]["onsetVideoSeconds"]),
            "auroraWebEffectStartSeconds": WEB_ONSET_SECONDS,
            "comparisonOnsetSeconds": WEB_ONSET_SECONDS,
        },
        "nwn": {
            "video": media_record(NWN_VIDEO),
            "recordingReusedWithoutRerun": True,
            "triggerCount": 1,
            "requestedDurationSeconds": 20.0,
        },
        "auroraWeb": {
            "video": media_record(WEB_VIDEO),
            "summary": media_record(WEB_SUMMARY),
            "triggerCount": 1,
            "loop": False,
            "overlapCount": 0,
            "requestedDurationSeconds": 20.0,
            "proofGate": "pass",
        },
        "comparison": {
            "video": media_record(OUTPUT_VIDEO),
            "contactSheet": media_record(CONTACT_SHEET),
            "fps": FPS,
            "durationSeconds": COMPARISON_DURATION_SECONDS,
        },
        "findings": [
            "Both runtimes show two smooth linked lash strands plus the additive fire envelope and source flare.",
            "The obsolete segmented zig-zag Web shape is not present in the current proof.",
            "Camera, scene, actor occlusion, and environmental light spill remain unmatched and prevent a pixel-parity claim.",
            "No particle-math or material tuning is authorized by this unmatched-scene comparison alone.",
        ],
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
