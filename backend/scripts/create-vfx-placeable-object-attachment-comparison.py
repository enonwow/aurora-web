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
EVIDENCE_ROOT = (
    REPO_ROOT
    / "backend/docs/aurora-reverse/evidence/vfx-placeable-object-attachment-row50"
)
NWN_ROOT = EVIDENCE_ROOT / "nwn/profile-v2/run-20260813T160758Z"
WEB_ROOT = EVIDENCE_ROOT / "web/profile-v2/accepted-scene-complete"
OUTPUT_ROOT = EVIDENCE_ROOT / "comparison/profile-v2"
NWN_VIDEO = NWN_ROOT / "nwn-row50-placeable-one-trigger.mp4"
NWN_LEDGER = NWN_ROOT / "trigger-ledger.json"
WEB_VIDEO = WEB_ROOT / "aurora-web-row50-placeable-one-trigger-v3.mp4"
WEB_SUMMARY = WEB_ROOT / "aurora-web-row50-placeable-one-trigger-v3-summary.json"
OUTPUT_STEM = "nwn-vs-aurora-web-row50-placeable-onset-aligned-v3"
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

EXPECTED_NWN_SHA256 = "f12b6dc289554e3ac30d9a9f873b9a075fd255ed35062e756ba376a6402e628f"
EXPECTED_WEB_SHA256 = "cf7d377cbfd51c29b006d964d9acff104ade55062f1683503bf0805caf4e7d37"
EXPECTED_WEB_SUMMARY_SHA256 = "136861f42c963b744afd25da1e49fceec63bcab1f20c0e1e978c7dec1f789b45"
FPS = 12
NWN_START_SECONDS = 7.5
WEB_START_SECONDS = 1.0
COMPARISON_DURATION_SECONDS = 3.5


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


def validate_inputs() -> tuple[dict[str, object], dict[str, object]]:
    if sha256(NWN_VIDEO) != EXPECTED_NWN_SHA256:
        raise RuntimeError("The immutable NWN oracle hash changed.")
    if sha256(WEB_VIDEO) != EXPECTED_WEB_SHA256:
        raise RuntimeError("The accepted one-trigger Web video hash changed.")
    if sha256(WEB_SUMMARY) != EXPECTED_WEB_SUMMARY_SHA256:
        raise RuntimeError("The accepted Web telemetry summary hash changed.")

    nwn_ledger = json.loads(NWN_LEDGER.read_text(encoding="utf-8"))
    if not (
        nwn_ledger.get("intentionalTriggerCount") == 1
        and nwn_ledger.get("observedTriggerLogCount") == 1
        and nwn_ledger.get("observedTargetCreationLogCount") == 1
        and nwn_ledger.get("validSingleTrigger") is True
        and nwn_ledger.get("validSingleTargetCreation") is True
        and nwn_ledger.get("automaticRetry") is False
        and nwn_ledger.get("loop") is False
    ):
        raise RuntimeError("The NWN one-trigger ledger is not admissible.")

    web = json.loads(WEB_SUMMARY.read_text(encoding="utf-8"))
    active = web["activeProofState"]["runtimeObservability"]
    final = web["finalProofState"]["runtimeObservability"]
    guard = final["playbackGuard"]
    checks = {
        "singlePlayback": web.get("status") == "recorded-single-deterministic-playback"
        and web.get("playbackHookCalled") is True,
        "activeGate": active["proofGate"] == {"status": "pass", "blockerManifest": []},
        "finalGate": final["proofGate"] == {"status": "pass", "blockerManifest": []},
        "guard": guard["triggerCount"] == 1
        and guard["loop"] is False
        and guard["overlapCount"] == 0,
        "postRoll": guard["completed"] is True and guard["postDurationHidden"] is True,
        "capture": web["mp4Fps"] == FPS
        and web["mp4FrameCount"] == 123
        and web["mp4DurationMs"] == 10200,
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise RuntimeError(f"Web proof validation failed: {', '.join(failed)}")
    return nwn_ledger, web


def create_header() -> None:
    image = Image.new("RGB", (1280, 104), "#1d252b")
    draw = ImageDraw.Draw(image)
    draw.text(
        (18, 9),
        "row50 | VFX_IMP_DEATH | placeable impact attachment",
        fill="#f7f9fa",
        font=load_font(23, bold=True),
    )
    draw.text((18, 55), "NWN retail saved oracle", fill="#ffffff", font=load_font(17, bold=True))
    draw.text((658, 55), "Aurora Web | current runtime", fill="#ffffff", font=load_font(17, bold=True))
    draw.text(
        (650, 15),
        "onset aligned; camera / scene material / first flash remain open",
        fill="#f4c96b",
        font=load_font(15),
    )
    draw.line((640, 46, 640, 102), fill="#55636d", width=2)
    image.save(HEADER, optimize=True)


def create_video() -> None:
    create_header()
    filter_graph = (
        "[0:v]fps=12,scale=640:540:force_original_aspect_ratio=decrease,"
        "pad=640:540:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[left];"
        "[1:v]fps=12,scale=640:540:force_original_aspect_ratio=decrease,"
        "pad=640:540:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[right];"
        "[left][right]hstack=inputs=2[body];"
        "[2:v]fps=12,scale=1280:104,setsar=1[header];"
        "[header][body]vstack=inputs=2[out]"
    )
    command = [
        str(FFMPEG_PATH), "-y", "-hide_banner", "-loglevel", "error",
        "-ss", str(NWN_START_SECONDS), "-i", str(NWN_VIDEO),
        "-ss", str(WEB_START_SECONDS), "-i", str(WEB_VIDEO),
        "-loop", "1", "-framerate", str(FPS), "-i", str(HEADER),
        "-filter_complex", filter_graph, "-map", "[out]",
        "-t", str(COMPARISON_DURATION_SECONDS), "-an", "-r", str(FPS),
        "-c:v", "libx264", "-preset", "fast", "-crf", "20",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUTPUT_VIDEO),
    ]
    subprocess.run(command, check=True, cwd=REPO_ROOT)
    probe = probe_video(OUTPUT_VIDEO)
    if (probe["width"], probe["height"], probe["frameCount"]) != (1280, 644, 42):
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
    samples = ((0.75, "pre"), (1.25, "onset"), (1.75, "active"), (2.50, "fade"))
    sheet = Image.new("RGB", (1280, 760), "#101417")
    draw = ImageDraw.Draw(sheet)
    draw.text(
        (18, 12),
        "row50 placeable | saved NWN vs current Aurora Web",
        fill="#f7f9fa",
        font=load_font(25, bold=True),
    )
    draw.text(
        (18, 45),
        "Review samples; attachment is established, visual parity is not claimed.",
        fill="#f4c96b",
        font=load_font(15),
    )
    for index, (seconds, label) in enumerate(samples):
        frame = read_frame(seconds).resize((640, 322), Image.Resampling.LANCZOS)
        x = (index % 2) * 640
        y = 86 + (index // 2) * 334
        sheet.paste(frame, (x, y))
        draw.rectangle((x, y, x + 160, y + 25), fill="#101417")
        draw.text(
            (x + 8, y + 4),
            f"t={seconds:.2f}s | {label}",
            fill="#ffffff",
            font=load_font(14, bold=True),
        )
    sheet.save(CONTACT_SHEET, optimize=True)


def main() -> None:
    nwn_ledger, web = validate_inputs()
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    for output in (OUTPUT_VIDEO, CONTACT_SHEET, HEADER, MANIFEST):
        if output.exists():
            raise RuntimeError(f"Comparison output already exists; reuse it: {output}")
    create_video()
    create_contact_sheet()
    manifest = {
        "version": "aurora-vfx-placeable-object-attachment-comparison/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "matched-with-gaps",
        "fixtureId": "vfx-broad-row50-placeable",
        "effect": {"rowId": 50, "label": "VFX_IMP_DEATH", "lifecycle": "fire-and-forget"},
        "alignment": {
            "method": "first-visible-effect-onset-manual-frame-audit",
            "nwnStartSeconds": NWN_START_SECONDS,
            "webStartSeconds": WEB_START_SECONDS,
            "comparisonDurationSeconds": COMPARISON_DURATION_SECONDS,
        },
        "checks": {
            "nwnSingleTrigger": nwn_ledger["validSingleTrigger"],
            "nwnSingleTarget": nwn_ledger["validSingleTargetCreation"],
            "webSinglePlayback": web["playbackHookCalled"] is True,
            "webProofGate": web["finalProofState"]["runtimeObservability"]["proofGate"],
            "attachmentTarget": "lancrak1_impact",
            "targetModel": "plc_lancrak1",
        },
        "established": [
            "one-trigger lifecycle on both sides",
            "exact placeable model and impact dummy lineage",
            "Web effect attached to the placeable impact host",
            "source and target actor contracts loaded and settled",
        ],
        "openGaps": [
            "exact retail camera pose is not recovered",
            "scene floor/material response differs from retail",
            "Web first flash is stronger and phase progression is not frame-identical",
            "pixel-level visual parity is not established",
        ],
        "inputs": {
            "nwnVideo": media_record(NWN_VIDEO),
            "nwnTriggerLedger": media_record(NWN_LEDGER),
            "webVideo": media_record(WEB_VIDEO),
            "webSummary": media_record(WEB_SUMMARY),
        },
        "outputs": {
            "comparisonVideo": media_record(OUTPUT_VIDEO),
            "contactSheet": media_record(CONTACT_SHEET),
        },
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({**manifest, "manifest": str(MANIFEST)}, indent=2))


if __name__ == "__main__":
    main()
