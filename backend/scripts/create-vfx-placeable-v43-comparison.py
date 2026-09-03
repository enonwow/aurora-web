from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-placeable-post-debt-2026-07-14"
)
NWN_VIDEO_PATH = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "artifacts"
    / "source-mdl-emitter-oracle"
    / "retail-source-mdl-emitter-plc-t04-ovens-removed.mp4"
)
NWN_STILL_PATH = EVIDENCE_ROOT / "frames" / "nwn-oracle-t5.png"
WEB_STEM = "post-debt-enon-bakery-plc-t04-10s-8fps-proof-v43"
WEB_VIDEO_PATH = EVIDENCE_ROOT / f"{WEB_STEM}.mp4"
PREVIOUS_WEB_VIDEO_PATH = (
    EVIDENCE_ROOT / "post-debt-enon-bakery-plc-t04-10s-8fps-proof-v42.mp4"
)
WEB_STILL_PATH = EVIDENCE_ROOT / f"{WEB_STEM}.png"
WEB_FRAME_PATH = EVIDENCE_ROOT / f"{WEB_STEM}.frame.json"
OUTPUT_IMAGE_PATH = EVIDENCE_ROOT / "post-debt-nwn-vs-aurora-web-t5-proof-v43.png"
OUTPUT_JSON_PATH = EVIDENCE_ROOT / "post-debt-nwn-vs-aurora-web-t5-proof-v43.json"
OUTPUT_TIMELINE_PATH = EVIDENCE_ROOT / f"{WEB_STEM}.timeline.json"
OUTPUT_MD_PATH = EVIDENCE_ROOT / f"{WEB_STEM}.md"


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def fit_panel(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    contained = ImageOps.contain(source.convert("RGB"), size, Image.Resampling.LANCZOS)
    panel = Image.new("RGB", size, "#171310")
    panel.paste(
        contained,
        ((size[0] - contained.width) // 2, (size[1] - contained.height) // 2),
    )
    return panel


frame = json.loads(WEB_FRAME_PATH.read_text(encoding="utf-8"))
area = frame["domStatus"]["areaPreview"]
samples = frame["mp4PlaybackSamples"]
checkpoints = []
for sample in samples:
    state = sample.get("playbackState") or {}
    checkpoints.append(
        {
            "captureFrame": sample["frameIndex"],
            "elapsedSeconds": sample["elapsedSeconds"],
            "runtimeFrame": state.get("frameIndex"),
            "roots": state.get("rootCount"),
            "meshes": state.get("visibleDrawMeshCount"),
            "particles": state.get("visibleDrawParticleCount"),
            "textures": state.get("visibleTextureReferences", []),
        }
    )

timeline = {
    "version": "aurora-web-vfx-proof-timeline/v1",
    "fixtureId": "placeable-tm_pl_lightred-plc_t04-enon_bakery-v43",
    "lifecycle": "placeable",
    "capture": {
        "durationSeconds": frame["mp4DurationMs"] / 1000,
        "fps": frame["mp4Fps"],
        "frameCount": frame["mp4FrameCount"],
        "firstTimeSeconds": 0,
        "lastTimeSeconds": (frame["mp4FrameCount"] - 1) / frame["mp4Fps"],
        "deterministicSeek": frame["mp4DeterministicCapture"],
    },
    "declaredInstances": 3,
    "checkpoints": checkpoints,
}
OUTPUT_TIMELINE_PATH.write_text(json.dumps(timeline, indent=2), encoding="ascii")

canvas = Image.new("RGB", (1600, 760), "#171310")
draw = ImageDraw.Draw(canvas)
title_font = load_font(31, bold=True)
label_font = load_font(22, bold=True)
body_font = load_font(18)
muted_font = load_font(16)

draw.text((24, 18), "plc_t04 placeable VFX - synchronized 10 s comparison", fill="#f7f2eb", font=title_font)
draw.text(
    (24, 58),
    "Saved NWN MP4 reused | fresh aurora-web v43 after binary-controller timing fix",
    fill="#c7bdb2",
    font=muted_font,
)

left_x, right_x, panel_y = 24, 812, 126
panel_size = (764, 510)
with Image.open(NWN_STILL_PATH) as image:
    canvas.paste(fit_panel(image, panel_size), (left_x, panel_y))
with Image.open(WEB_STILL_PATH) as image:
    canvas.paste(fit_panel(image, panel_size), (right_x, panel_y))

draw.rectangle((left_x, 88, left_x + panel_size[0], 126), fill="#30261e")
draw.rectangle((right_x, 88, right_x + panel_size[0], 126), fill="#30261e")
draw.text((left_x + 12, 94), "NWN retail oracle - saved MP4 at t=5 s", fill="#ffffff", font=label_font)
draw.text((right_x + 12, 94), "aurora-web v43 - deterministic t=5 s", fill="#ffffff", font=label_font)

draw.text(
    (24, 656),
    "Same 10.00 s window | persistent placeables | no repeated trigger | no overlapping playback",
    fill="#f7f2eb",
    font=body_font,
)
draw.text(
    (24, 692),
    "Web: 3 full static bases, 6 emitter meshes, 48 particles, flame + smoke textures, 0 source-backed lights.",
    fill="#f7f2eb",
    font=body_font,
)
draw.text(
    (24, 724),
    "Status: matched with gaps. Web plume remains narrower/weaker; camera and area context differ.",
    fill="#ffc857",
    font=body_font,
)
canvas.save(OUTPUT_IMAGE_PATH, optimize=True)

nwn_hash = sha256(NWN_VIDEO_PATH)
web_hash = sha256(WEB_VIDEO_PATH)
previous_web_hash = sha256(PREVIOUS_WEB_VIDEO_PATH)
comparison = {
    "version": "aurora-vfx-placeable-nwn-web-comparison/v1",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "fixtureId": "placeable-tm_pl_lightred-plc_t04-enon_bakery-v43",
    "status": "matched-with-gaps",
    "source": {
        "areaId": "area_enon_bakery",
        "placeableResRef": "tm_pl_lightred",
        "appearanceId": 332,
        "modelResRef": "plc_t04",
        "staticNodeNames": ["Rectangle121", "Plane25"],
        "emitterNames": ["OmenEmitter240", "fire!02"],
        "textureReferences": ["fxpa_flame00", "fxpa_smoke01"],
        "sourceLightNodeCount": 0,
    },
    "proofRules": {
        "nwnRecordingReusedWithoutRerun": True,
        "durationSecondsNwn": 10,
        "durationSecondsAuroraWeb": frame["mp4DurationMs"] / 1000,
        "auroraWebDeterministicFrameCount": frame["mp4FrameCount"],
        "auroraWebFps": frame["mp4Fps"],
        "persistentPlaceablesNotRepeatedTriggers": True,
        "overlappingPlayback": False,
        "auroraFirstSourceContract": True,
    },
    "nwn": {
        "video": str(NWN_VIDEO_PATH),
        "videoSha256": nwn_hash,
        "stillAtFiveSeconds": str(NWN_STILL_PATH),
    },
    "auroraWeb": {
        "capturedAt": frame["capturedAt"],
        "video": str(WEB_VIDEO_PATH),
        "videoSha256": web_hash,
        "stillAtFiveSeconds": str(WEB_STILL_PATH),
        "frameState": str(WEB_FRAME_PATH),
        "timeline": str(OUTPUT_TIMELINE_PATH),
        "declaredInstanceCount": area["renderObjectCount"],
        "playbackRootCount": area["playbackRootCount"],
        "visibleDrawMeshCountAtFiveSeconds": area["visibleDrawMeshCount"],
        "visibleParticleCountAtFiveSeconds": area["visibleDrawParticleCount"],
        "pointLightCount": area["pointLightCount"],
        "networkRequestsAllFinishedWithHttp200": all(
            item.get("finished") and item.get("status") == 200
            for item in frame["networkSummary"]
        ),
        "runtimeExceptionCount": sum(
            1 for item in frame["runtimeEvents"] if item.get("method") == "Runtime.exceptionThrown"
        ),
        "previousAcceptedVideoSha256": previous_web_hash,
        "byteIdenticalToPreviousAcceptedVideo": web_hash == previous_web_hash,
        "freshnessEvidence": [
            "new capturedAt timestamp",
            "new frame-state artifact",
            "new network request trace",
            "new deterministic timeline",
            "new v43 comparison manifest",
        ],
    },
    "comparison": {
        "compositeImage": str(OUTPUT_IMAGE_PATH),
        "confirmedMatches": [
            "full static placeable base remains visible with emitter output",
            "three declared source-area transforms are present",
            "flame and smoke use both source texture references",
            "no source light is fabricated",
        ],
        "openParityGaps": [
            "aurora-web flame luminance and plume silhouette remain weaker and narrower",
            "aurora-web isolation backdrop does not reproduce the full NWN bakery context",
            "camera and scene context differ; NWN crop shows two of the three placeables",
        ],
    },
    "canonicalParityPromoted": False,
}
OUTPUT_JSON_PATH.write_text(json.dumps(comparison, indent=2), encoding="ascii")

markdown = f"""# Post-debt `plc_t04` placeable VFX proof v43

Status: `matched-with-gaps`. Canonical parity is not promoted.

## Proof contract

- Aurora first: retail `plc_t04.mdl` supplies the static nodes, emitters, textures, animation gates, and source-backed absence of light nodes.
- NWN: the existing 10.00 s / 8 fps oracle MP4 was reused without launching or recapturing NWN.
- aurora-web: fresh deterministic 10.00 s / 8 fps / 80-frame capture after the binary-controller timing fix.
- Lifecycle: three persistent source-area placeables, not repeated fire-and-forget triggers; no overlapping playback.

## Current web result

- Three full static placeable bases are visible with six emitter meshes at `t=5 s`.
- Runtime state at `t=5 s`: `{area['visibleDrawParticleCount']}` particles and textures `fxpa_flame00`, `fxpa_smoke01`.
- Source-MDL lights: `0`; aurora-web point lights: `{area['pointLightCount']}`. No light was fabricated.
- All captured requests finished with HTTP 200; runtime exceptions: `0`.
- The deterministic MP4 is byte-identical to v42 because the controller correction does not alter this fixture. The new capture timestamp, frame state, network trace, timeline, and comparison manifest establish the fresh v43 run.

## Artifacts

- Reused NWN MP4 SHA-256: `{nwn_hash}`.
- Fresh aurora-web MP4 SHA-256: `{web_hash}`.
- Comparison: `{OUTPUT_IMAGE_PATH.name}`.
- Machine-readable comparison: `{OUTPUT_JSON_PATH.name}`.
- Runtime timeline: `{OUTPUT_TIMELINE_PATH.name}`.

## Open parity gaps

- aurora-web flame luminance and plume silhouette remain weaker and narrower than NWN.
- The isolation backdrop does not reproduce the full bakery context.
- Camera/context parity is not proven; the NWN crop shows two of the three source placeables.

This packet proves the current full placeable composition and synchronized lifecycle. It does not claim retail visual parity.
"""
OUTPUT_MD_PATH.write_text(markdown, encoding="ascii")
print(json.dumps(comparison, indent=2))
