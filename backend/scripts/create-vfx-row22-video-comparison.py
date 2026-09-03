from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from vfx_row22_oracle_timing import audit_oracle_timing


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-web-row22"
)
ROOT = Path(os.environ.get("VFX_PROOF_ROOT", DEFAULT_ROOT)).resolve()
PROOF_VERSION = os.environ.get("VFX_PROOF_VERSION", "v11")
if not re.fullmatch(r"v\d+[a-z0-9-]*", PROOF_VERSION, re.IGNORECASE):
    raise RuntimeError(f"Invalid VFX_PROOF_VERSION: {PROOF_VERSION}")

FFMPEG = Path(
    os.environ.get(
        "FFMPEG_PATH",
        (
            "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
            "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
        ),
    )
)
NWN_SUMMARY_PATH = Path(
    os.environ.get(
        "VFX_NWN_VALIDATED_SUMMARY_PATH",
        ROOT / "nwn" / "validated-summary.json",
    )
).resolve()
NWN_CAPTURE_SUMMARY_PATH = Path(
    os.environ.get(
        "VFX_NWN_CAPTURE_SUMMARY_PATH",
        ROOT / "nwn" / "summary.json",
    )
).resolve()
WEB_SUMMARY_PATH = Path(
    os.environ.get(
        "VFX_WEB_VALIDATED_SUMMARY_PATH",
        ROOT / "web" / f"validated-summary-{PROOF_VERSION}.json",
    )
).resolve()
OUTPUT_PATH = Path(
    os.environ.get(
        "VFX_COMPARISON_OUTPUT_PATH",
        ROOT
        / "comparisons"
        / f"nwn-vs-aurora-web-row22-{PROOF_VERSION}-source-scene-onset-aligned.mp4",
    )
).resolve()
OUTPUT_DIR = OUTPUT_PATH.parent
MANIFEST_PATH = OUTPUT_PATH.with_suffix(".json")
HEADER_PATH = OUTPUT_PATH.with_name(f"{OUTPUT_PATH.stem}-header.png")
FPS = 12
PANEL_WIDTH = 640
PANEL_HEIGHT = 544
HEADER_HEIGHT = 72
MAX_COMPARISON_FRAMES = 57


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_font(size: int, bold: bool = False):
    filename = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / filename
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def write_header() -> None:
    image = Image.new("RGB", (PANEL_WIDTH * 2, HEADER_HEIGHT), "#171a1d")
    draw = ImageDraw.Draw(image)
    title_font = load_font(24, bold=True)
    label_font = load_font(18, bold=True)
    draw.text(
        (18, 8),
        "VFX_FNF_FIREBALL - onset-aligned encoded sequence",
        fill="#f4f6f8",
        font=title_font,
    )
    draw.text(
        (18, 43),
        "LEFT: saved NWN retail oracle",
        fill="#ffcf70",
        font=label_font,
    )
    draw.text(
        (PANEL_WIDTH + 18, 43),
        "RIGHT: fresh aurora-web proof",
        fill="#8ec5ff",
        font=label_font,
    )
    image.save(HEADER_PATH, optimize=True)


if not FFMPEG.exists():
    raise RuntimeError(f"ffmpeg is missing: {FFMPEG}")

nwn = json.loads(NWN_SUMMARY_PATH.read_text(encoding="utf-8"))
nwn_capture = json.loads(NWN_CAPTURE_SUMMARY_PATH.read_text(encoding="utf-8"))
web = json.loads(WEB_SUMMARY_PATH.read_text(encoding="utf-8"))
if nwn["status"] != "valid-single-trigger-oracle":
    raise RuntimeError("Saved NWN oracle is not validated.")
if not web.get("captureValid"):
    raise RuntimeError(f"Web proof {PROOF_VERSION} is not capture-valid.")
if not nwn["checks"]["exactlyOneTriggerMarkerForRunId"]:
    raise RuntimeError("Saved NWN oracle does not prove exactly one trigger.")
if not web["checks"]["exactlyOneWebPlayback"]:
    raise RuntimeError("Web proof does not prove exactly one playback.")

nwn_timing_audit = audit_oracle_timing(nwn, nwn_capture)
nwn_video = Path(nwn["video"]["path"])
web_video = Path(web["video"]["path"])
if not nwn_video.exists() or not web_video.exists():
    raise RuntimeError("A validated source video is missing.")

nwn_onset_frame = int(nwn["lifecycle"]["onsetFrameIndex"])
web_onset_frame = int(web["lifecycle"]["onsetFrameIndex"])
nwn_remaining_frames = int(nwn["lifecycle"]["frameCount"]) - nwn_onset_frame
web_remaining_frames = int(web["lifecycle"]["frameCount"]) - web_onset_frame
comparison_frame_count = min(
    MAX_COMPARISON_FRAMES,
    nwn_remaining_frames,
    web_remaining_frames,
)
if comparison_frame_count <= 0:
    raise RuntimeError("Comparison frame count is not positive.")
encoded_duration = comparison_frame_count / FPS

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
write_header()
filter_graph = (
    f"[0:v]trim=start_frame={nwn_onset_frame}:"
    f"end_frame={nwn_onset_frame + comparison_frame_count},setpts=PTS-STARTPTS,"
    f"fps={FPS},scale={PANEL_WIDTH}:{PANEL_HEIGHT}:force_original_aspect_ratio=decrease,"
    f"pad={PANEL_WIDTH}:{PANEL_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x0b0d0e[nwn];"
    f"[1:v]trim=start_frame={web_onset_frame}:"
    f"end_frame={web_onset_frame + comparison_frame_count},setpts=PTS-STARTPTS,"
    f"fps={FPS},scale={PANEL_WIDTH}:{PANEL_HEIGHT}:force_original_aspect_ratio=decrease,"
    f"pad={PANEL_WIDTH}:{PANEL_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=0x0b0d0e[web];"
    "[nwn][web]hstack=inputs=2[body];"
    "[2:v][body]vstack=inputs=2[out]"
)
command = [
    str(FFMPEG),
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    str(nwn_video),
    "-i",
    str(web_video),
    "-loop",
    "1",
    "-framerate",
    str(FPS),
    "-i",
    str(HEADER_PATH),
    "-filter_complex",
    filter_graph,
    "-map",
    "[out]",
    "-t",
    f"{encoded_duration:.6f}",
    "-r",
    str(FPS),
    "-c:v",
    "libx264",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    str(OUTPUT_PATH),
]
completed = subprocess.run(command, capture_output=True, text=True, check=False)
if completed.returncode != 0:
    raise RuntimeError(f"ffmpeg comparison failed: {completed.stderr[-2000:]}")
if not OUTPUT_PATH.exists() or OUTPUT_PATH.stat().st_size <= 4096:
    raise RuntimeError("Comparison MP4 was not created.")

manifest = {
    "version": f"aurora-vfx-row22-video-comparison/{PROOF_VERSION}",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "status": "diagnostic-only-no-shared-runtime-time-open-context-gaps",
    "alignment": "onset-frame-aligned-encoded-sequence-runtime-time-unavailable",
    "fps": FPS,
    "encodedSequenceFrameCount": comparison_frame_count,
    "encodedSequenceDurationSeconds": encoded_duration,
    "sharedRuntimeDurationClaimed": False,
    "left": {
        "label": "saved NWN retail oracle",
        "path": str(nwn_video),
        "sha256": sha256(nwn_video),
        "onsetFrameIndex": nwn_onset_frame,
        "triggerCount": 1,
        "rerun": False,
        "timingAudit": nwn_timing_audit,
    },
    "right": {
        "label": "fresh aurora-web proof",
        "path": str(web_video),
        "sha256": sha256(web_video),
        "onsetFrameIndex": web_onset_frame,
        "playbackCount": 1,
        "loop": False,
    },
    "comparison": {
        "path": str(OUTPUT_PATH),
        "sha256": sha256(OUTPUT_PATH),
        "sizeBytes": OUTPUT_PATH.stat().st_size,
        "cameraMatchEstablished": web["comparisonContext"]["cameraMatchEstablished"],
        "sceneMatchEstablished": web["comparisonContext"]["sceneMatchEstablished"],
        "ownerTargetMatchEstablished": web["comparisonContext"][
            "ownerTargetMatchEstablished"
        ],
        "pixelParityClaimed": False,
    },
}
MANIFEST_PATH.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
print(json.dumps(manifest, indent=2))
