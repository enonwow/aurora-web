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
ROW_ROOT = REPO_ROOT / "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row216"
NWN_VIDEO = ROW_ROOT / "nwn/nwn-row216-one-trigger.mp4"
NWN_SUMMARY = ROW_ROOT / "nwn/validated-summary.json"
WEB_ROOT = ROW_ROOT / "aurora-web"
WEB_STEM = "aurora-web-row216-one-trigger-host-animation-pause1-20260812"
WEB_VIDEO = WEB_ROOT / f"{WEB_STEM}.mp4"
WEB_FRAME_ROOT = WEB_ROOT / f"{WEB_STEM}.frames"
TELEMETRY_STEM = "aurora-web-row216-static-timeline-host-animation-pause1-telemetry-20260812"
TELEMETRY_VIDEO = WEB_ROOT / f"{TELEMETRY_STEM}.mp4"
TELEMETRY_SUMMARY = WEB_ROOT / f"{TELEMETRY_STEM}-summary.json"
OUTPUT_ROOT = ROW_ROOT / "comparison"
OUTPUT_STEM = "nwn-vs-aurora-web-row216-host-animation-onset-aligned-20260812"
OUTPUT_VIDEO = OUTPUT_ROOT / f"{OUTPUT_STEM}.mp4"
CONTACT_SHEET = OUTPUT_ROOT / f"{OUTPUT_STEM}-contact-sheet.png"
HEADER = OUTPUT_ROOT / f"{OUTPUT_STEM}-header.png"
MANIFEST = OUTPUT_ROOT / f"{OUTPUT_STEM}.json"
RECOVERY_SUMMARY = WEB_ROOT / f"{WEB_STEM}-recovery-summary.json"
FFMPEG_PATH = Path(
    os.environ.get(
        "FFMPEG_PATH",
        "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
        "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
    )
)

EXPECTED_NWN_SHA256 = "0b0d5e91d176710c5b38cd9b4c7c2b885c3c08ab3c10142d8242e96495484f67"
EXPECTED_WEB_SHA256 = "66dd5c84219ed7a7a0bced78ce20f3b156bfc85a12c2e3fd5e6b77c6d9f27ace"
EXPECTED_TELEMETRY_SUMMARY_SHA256 = "004da79ffe14c07426d14db381a18faf89613e17307f61d2ff9b8098f930fab9"
FPS = 8
WEB_ONSET_SECONDS = 2.0
COMPARISON_DURATION_SECONDS = 24.0


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
    font_path = Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")
    return ImageFont.truetype(str(font_path), size) if font_path.exists() else ImageFont.load_default()


def probe_video(file_path: Path) -> dict[str, float | int]:
    capture = cv2.VideoCapture(str(file_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video: {file_path}")
    result = {
        "fps": float(capture.get(cv2.CAP_PROP_FPS)),
        "frameCount": int(capture.get(cv2.CAP_PROP_FRAME_COUNT)),
        "width": int(capture.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT)),
    }
    capture.release()
    result["durationSeconds"] = float(result["frameCount"]) / float(result["fps"])
    return result


def validate_inputs() -> tuple[dict[str, object], dict[str, object], float, str]:
    if sha256(NWN_VIDEO) != EXPECTED_NWN_SHA256:
        raise RuntimeError("The immutable NWN oracle hash changed.")
    if sha256(WEB_VIDEO) != EXPECTED_WEB_SHA256:
        raise RuntimeError("The recovered one-trigger Web video hash changed.")
    if sha256(TELEMETRY_VIDEO) != EXPECTED_WEB_SHA256:
        raise RuntimeError("The no-playback telemetry video is not byte-identical to the one-trigger video.")
    if sha256(TELEMETRY_SUMMARY) != EXPECTED_TELEMETRY_SUMMARY_SHA256:
        raise RuntimeError("The accepted Web telemetry summary hash changed.")

    frames = sorted(WEB_FRAME_ROOT.glob("frame-*.png"))
    if len(frames) != 192:
        raise RuntimeError(f"Expected 192 preserved one-trigger frames, received {len(frames)}.")
    ordered_frame_digest = hashlib.sha256()
    for frame in frames:
        ordered_frame_digest.update(bytes.fromhex(sha256(frame)))

    nwn = json.loads(NWN_SUMMARY.read_text(encoding="utf-8"))
    required_nwn_checks = (
        "exactlyOneTriggerMarker",
        "expectedEndMarkerForDuration",
        "mp4Decodes",
        "baselineBeforeVisibleEffect",
        "visibleEffectIntervalPresent",
        "captureCoversRequestedDurationPlusMargins",
        "noAutomaticRetry",
    )
    if nwn.get("status") != "valid-single-trigger-visible-nwn-oracle":
        raise RuntimeError("The NWN oracle is not validated.")
    if not all(nwn.get("checks", {}).get(name) is True for name in required_nwn_checks):
        raise RuntimeError("The NWN oracle checks are incomplete.")

    telemetry = json.loads(TELEMETRY_SUMMARY.read_text(encoding="utf-8"))
    active = telemetry["activeProofState"]["runtimeObservability"]
    final = telemetry["finalProofState"]["runtimeObservability"]
    guard = final["playbackGuard"]
    checks = {
        "staticNoPlayback": telemetry.get("status") == "recorded-deterministic-static-timeline-no-playback"
        and telemetry.get("playbackHookCalled") is False,
        "identity": active["identity"]["status"] == "ready",
        "hostGraph": active["hostGraph"]["status"] == "pass",
        "assets": active["assetSettlement"]["status"] == "settled",
        "draws": active["drawLedger"]["status"] == "pass",
        "activeGate": active["proofGate"] == {"status": "pass", "blockerManifest": []},
        "finalGate": final["proofGate"] == {"status": "pass", "blockerManifest": []},
        "singlePlaybackContract": guard["triggerCount"] == 1
        and guard["loop"] is False
        and guard["overlapCount"] == 0,
        "postRoll": guard["completed"] is True and guard["postDurationHidden"] is True,
        "capture": telemetry["mp4Fps"] == FPS
        and telemetry["mp4FrameCount"] == 192
        and telemetry["mp4DurationMs"] == 24000,
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise RuntimeError(f"Accepted Web telemetry validation failed: {', '.join(failed)}")

    web_probe = probe_video(WEB_VIDEO)
    if web_probe["frameCount"] != 192 or web_probe["fps"] != FPS:
        raise RuntimeError(f"Recovered Web video metadata changed: {web_probe}")
    nwn_start = float(nwn["lifecycle"]["onsetVideoSeconds"]) - WEB_ONSET_SECONDS
    return nwn, telemetry, nwn_start, ordered_frame_digest.hexdigest()


def create_header() -> None:
    image = Image.new("RGB", (1280, 104), "#1d252b")
    draw = ImageDraw.Draw(image)
    draw.text((18, 9), "row216 | VFX_BEAM_FIRE_LASH | host pause1 runtime", fill="#f7f9fa", font=load_font(23, bold=True))
    draw.text((18, 55), "NWN retail saved oracle", fill="#ffffff", font=load_font(17, bold=True))
    draw.text((658, 55), "Aurora Web | animated Type 7 hosts", fill="#ffffff", font=load_font(17, bold=True))
    draw.text((738, 15), "onset aligned; camera / scene / phase still open", fill="#f4c96b", font=load_font(15))
    draw.line((640, 46, 640, 102), fill="#55636d", width=2)
    image.save(HEADER, optimize=True)


def create_video(nwn_start_seconds: float) -> None:
    create_header()
    filter_graph = (
        "[0:v]fps=8,scale=640:540:force_original_aspect_ratio=decrease,"
        "pad=640:540:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[left];"
        "[1:v]fps=8,scale=640:540:force_original_aspect_ratio=decrease,"
        "pad=640:540:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[right];"
        "[left][right]hstack=inputs=2[body];"
        "[2:v]fps=8,scale=1280:104,setsar=1[header];"
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
    if (probe["width"], probe["height"], probe["frameCount"]) != (1280, 644, 192):
        raise RuntimeError(f"Unexpected comparison metadata: {probe}")


def read_frame(elapsed_seconds: float) -> Image.Image:
    capture = cv2.VideoCapture(str(OUTPUT_VIDEO))
    capture.set(cv2.CAP_PROP_POS_MSEC, elapsed_seconds * 1000)
    ok, frame = capture.read()
    capture.release()
    if not ok:
        raise RuntimeError(f"Cannot read comparison at {elapsed_seconds:.3f}s")
    return Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))


def create_contact_sheet() -> None:
    samples = ((4.0, "effect +2 s"), (10.0, "effect +8 s"), (16.0, "effect +14 s"), (21.0, "effect +19 s"))
    sheet = Image.new("RGB", (1280, 760), "#101417")
    draw = ImageDraw.Draw(sheet)
    draw.text((18, 12), "row216 | saved NWN vs new animated-host Web runtime", fill="#f7f9fa", font=load_font(25, bold=True))
    draw.text((18, 45), "Review samples only. MP4 is authoritative; scene, camera and retail idle phase are unmatched.", fill="#f4c96b", font=load_font(15))
    for index, (seconds, label) in enumerate(samples):
        frame = read_frame(seconds).resize((640, 322), Image.Resampling.LANCZOS)
        x = (index % 2) * 640
        y = 86 + (index // 2) * 334
        sheet.paste(frame, (x, y))
        draw.rectangle((x, y, x + 185, y + 25), fill="#101417")
        draw.text((x + 8, y + 4), f"t={seconds:.1f}s | {label}", fill="#ffffff", font=load_font(14, bold=True))
    sheet.save(CONTACT_SHEET, optimize=True)


def main() -> None:
    nwn, telemetry, nwn_start, frame_set_sha256 = validate_inputs()
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    outputs = (OUTPUT_VIDEO, CONTACT_SHEET, MANIFEST, RECOVERY_SUMMARY)
    if any(path.exists() for path in outputs):
        raise RuntimeError("Host-animation comparison output already exists; reuse it.")
    create_video(nwn_start)
    create_contact_sheet()

    recovery = {
        "version": "aurora-vfx-web-single-playback-frame-recovery/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "visual-media-recovered-telemetry-established-by-byte-identical-no-playback-capture",
        "playback": {
            "triggerCount": 1,
            "automaticRetry": False,
            "replayedAfterGateFailure": False,
            "preservedFrameCount": 192,
            "orderedFrameDigestSha256": frame_set_sha256,
            "video": media_record(WEB_VIDEO),
        },
        "telemetryEquivalence": {
            "strategy": "same deterministic timeline and exact byte-identical encoded MP4",
            "video": media_record(TELEMETRY_VIDEO),
            "summary": media_record(TELEMETRY_SUMMARY),
            "playbackHookCalled": telemetry["playbackHookCalled"],
            "byteIdenticalToPlaybackVideo": sha256(WEB_VIDEO) == sha256(TELEMETRY_VIDEO),
            "activeProofGate": telemetry["activeProofState"]["runtimeObservability"]["proofGate"],
            "finalProofGate": telemetry["finalProofState"]["runtimeObservability"]["proofGate"],
        },
    }
    RECOVERY_SUMMARY.write_text(json.dumps(recovery, indent=2) + "\n", encoding="ascii")

    manifest = {
        "version": "aurora-vfx-row216-host-animation-comparison/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "comparison-ready-open-camera-scene-retail-animation-phase-gaps",
        "fixtureId": "vfx-broad-row216",
        "alignment": {
            "strategy": "validated NWN visible onset aligned to Web effect start",
            "nwnSourceStartSeconds": nwn_start,
            "nwnSourceOnsetSeconds": float(nwn["lifecycle"]["onsetVideoSeconds"]),
            "auroraWebEffectStartSeconds": WEB_ONSET_SECONDS,
        },
        "nwn": {
            "video": media_record(NWN_VIDEO),
            "recordingReusedWithoutRerun": True,
            "triggerCount": 1,
            "requestedDurationSeconds": 20.0,
        },
        "auroraWeb": {
            "video": media_record(WEB_VIDEO),
            "recoverySummary": media_record(RECOVERY_SUMMARY),
            "triggerCount": 1,
            "loop": False,
            "overlapCount": 0,
            "requestedDurationSeconds": 20.0,
            "telemetryProofGate": "pass-byte-identical-no-playback-capture",
        },
        "comparison": {
            "video": media_record(OUTPUT_VIDEO),
            "contactSheet": media_record(CONTACT_SHEET),
            "fps": FPS,
            "durationSeconds": COMPARISON_DURATION_SECONDS,
        },
        "findings": [
            "Web Type 7 now resolves source and target Impact attachments through inherited pause1 host transforms on every runtime frame.",
            "The new Web lash is visibly time-varying and no longer restricted to the base-pose attachment orientation.",
            "Exact retail host-animation phase, camera, actor occlusion, scene lighting, and postprocess matching remain open, so this is not a pixel-parity claim.",
            "The saved NWN MP4 was reused and the Web playback was not repeated after the telemetry identity failure.",
        ],
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
