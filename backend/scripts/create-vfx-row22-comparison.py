from __future__ import annotations

import json
import os
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

from vfx_row22_oracle_timing import audit_oracle_timing, build_frame_progression


REPO_ROOT = Path(__file__).resolve().parents[2]
ROOT = REPO_ROOT / "backend" / "docs" / "aurora-reverse" / "evidence" / "vfx-nwn-web-row22"
PROOF_VERSION = os.environ.get("VFX_PROOF_VERSION", "v11")
if not re.fullmatch(r"v\d+[a-z0-9-]*", PROOF_VERSION, re.IGNORECASE):
    raise RuntimeError(f"Invalid VFX_PROOF_VERSION: {PROOF_VERSION}")
REUSE_EXISTING_PROGRESSION_STILLS = (
    os.environ.get("VFX_REUSE_EXISTING_PROGRESSION_STILLS", "0") == "1"
)
NWN_SUMMARY_PATH = ROOT / "nwn" / "validated-summary.json"
NWN_CAPTURE_SUMMARY_PATH = ROOT / "nwn" / "summary.json"
WEB_SUMMARY_PATH = ROOT / "web" / f"validated-summary-{PROOF_VERSION}.json"
DIAGNOSTIC_LIGHT_SUMMARY_PATH = ROOT / "web" / "validated-summary-v6.json"
MANIFEST_PATH = ROOT / "fixture-manifest.json"
OUTPUT_IMAGE_PATH = ROOT / f"nwn-vs-aurora-web-row22-comparison-{PROOF_VERSION}.png"
OUTPUT_JSON_PATH = ROOT / f"nwn-vs-aurora-web-row22-comparison-{PROOF_VERSION}.json"
OUTPUT_MD_PATH = ROOT / "README.md"
PROGRESSION_STILLS_DIR = (
    ROOT / "comparisons" / f"row22-{PROOF_VERSION}-progression-stills"
)
FFMPEG_PATH = Path(
    os.environ.get(
        "FFMPEG_PATH",
        (
            "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
            "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe"
        ),
    )
)


def load_font(size: int, bold: bool = False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    path = Path("C:/Windows/Fonts") / name
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def fit_panel(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    contained = ImageOps.contain(source.convert("RGB"), size, Image.Resampling.LANCZOS)
    panel = Image.new("RGB", size, "#0b0d0e")
    panel.paste(contained, ((size[0] - contained.width) // 2, (size[1] - contained.height) // 2))
    return panel


def extract_encoded_frame(video: Path, frame_index: int, output: Path) -> None:
    if output.exists():
        if REUSE_EXISTING_PROGRESSION_STILLS:
            return
        raise RuntimeError(f"Progression still already exists: {output}")
    completed = subprocess.run(
        [
            str(FFMPEG_PATH),
            "-nostdin",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(video),
            "-vf",
            f"select=eq(n\\,{frame_index})",
            "-vsync",
            "0",
            "-frames:v",
            "1",
            str(output),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0 or not output.exists():
        raise RuntimeError(
            f"Could not extract progression still at frame {frame_index}: "
            f"{completed.stderr[-2000:]}"
        )


nwn = json.loads(NWN_SUMMARY_PATH.read_text(encoding="utf-8"))
nwn_capture = json.loads(NWN_CAPTURE_SUMMARY_PATH.read_text(encoding="utf-8"))
web = json.loads(WEB_SUMMARY_PATH.read_text(encoding="utf-8"))
manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
diagnostic_light = json.loads(DIAGNOSTIC_LIGHT_SUMMARY_PATH.read_text(encoding="utf-8"))
nwn_lifecycle = nwn["lifecycle"]
web_lifecycle = web["lifecycle"]

assert nwn["status"] == "valid-single-trigger-oracle"
assert web["status"] in {
    "valid-single-playback-web-proof",
    "diagnostic-only-single-playback-open-context-gaps",
}
assert nwn["checks"]["exactlyOneTriggerMarkerForRunId"] is True
assert web["checks"]["exactlyOneWebPlayback"] is True
if not FFMPEG_PATH.exists():
    raise RuntimeError(f"ffmpeg is missing: {FFMPEG_PATH}")

nwn_timing_audit = audit_oracle_timing(nwn, nwn_capture)
PROGRESSION_STILLS_DIR.mkdir(parents=True, exist_ok=True)
progression_frame_offsets = [0, 3, 9]
progression_stills: dict[str, list[Path]] = {"nwn": [], "web": []}
frame_progressions: dict[str, list[dict[str, int | str]]] = {}
for runtime_name, summary, lifecycle in (
    ("nwn", nwn, nwn_lifecycle),
    ("web", web, web_lifecycle),
):
    video = Path(summary["video"]["path"])
    progression = build_frame_progression(
        onset_frame_index=int(lifecycle["onsetFrameIndex"]),
        frame_offsets=progression_frame_offsets,
        frame_count=int(lifecycle["frameCount"]),
    )
    frame_progressions[runtime_name] = progression
    for index, point in enumerate(progression):
        output = PROGRESSION_STILLS_DIR / (
            f"{runtime_name}-onset-plus-{point['frameOffset']}-frames.png"
        )
        extract_encoded_frame(video, int(point["frameIndex"]), output)
        progression_stills[runtime_name].append(output)

canvas = Image.new("RGB", (1920, 1670), "#171a1d")
draw = ImageDraw.Draw(canvas)
title_font = load_font(34, bold=True)
label_font = load_font(23, bold=True)
body_font = load_font(19)
muted_font = load_font(17)

draw.text((42, 24), "VFX_FNF_FIREBALL (row 22) - one-trigger comparison", fill="#f4f6f8", font=title_font)
draw.text(
    (42, 68),
    "Retail vff_explfire.mdl | saved NWN oracle reused | fresh aurora-web playback",
    fill="#aeb8c2",
    font=muted_font,
)

columns = [(42, "NWN retail - one EffectVisualEffect"), (981, "aurora-web - one deterministic playback")]
rows = [
    (132, "onset", 0, (897, 410)),
    (578, "onset + 3 captured frames", 1, (897, 410)),
    (1024, "onset + 9 captured frames", 2, (897, 410)),
]
for x, heading in columns:
    draw.rectangle((x, 96, x + 897, 132), fill="#26313a")
    draw.text((x + 14, 101), heading, fill="#ffffff", font=label_font)

for y, row_label, still_index, panel_size in rows:
    for column_index, (x, _) in enumerate(columns):
        runtime_name = "nwn" if column_index == 0 else "web"
        path = progression_stills[runtime_name][still_index]
        with Image.open(path) as image:
            canvas.paste(fit_panel(image, panel_size), (x, y))
        draw.rectangle((x, y, x + 190, y + 31), fill="#000000")
        draw.text((x + 10, y + 5), row_label, fill="#ffffff", font=muted_font)

draw.text(
    (42, 1470),
    "Encoded-frame progression only: the saved NWN MP4 does not preserve runtime timestamps.",
    fill="#f4f6f8",
    font=body_font,
)
draw.text(
    (42, 1502),
    "Onset + 0 / 3 / 9 captured frames; these rows are not shared runtime-time samples.",
    fill="#f4f6f8",
    font=body_font,
)
draw.text(
    (42, 1534),
    "Proof validity: NWN 1 trigger (saved MP4 reused); Web 1 playback; no loop; no overlap; clean post-roll.",
    fill="#f4f6f8",
    font=body_font,
)
draw.text(
    (42, 1566),
    "No proof geometry | source-backed fixture | visual parity remains a reviewed comparison, not an assertion.",
    fill="#aeb8c2",
    font=muted_font,
)
canvas.save(OUTPUT_IMAGE_PATH, optimize=True)

comparison = {
    "version": f"aurora-vfx-nwn-web-comparison/{PROOF_VERSION}",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "fixtureId": "vfx-nwn-web-row22",
    "sourceRowId": 22,
    "sourceLabel": "VFX_FNF_FIREBALL",
    "status": "diagnostic-only-single-playback-open-context-gaps",
    "source": {
        "modelResRef": "vff_explfire",
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
        "sharedPixelMetric": nwn_lifecycle["metric"] == web_lifecycle["metric"],
        "cameraMatchEstablished": web["comparisonContext"]["cameraMatchEstablished"],
        "sceneMatchEstablished": web["comparisonContext"]["sceneMatchEstablished"],
        "ownerTargetMatchEstablished": web["comparisonContext"][
            "ownerTargetMatchEstablished"
        ],
        "sharedRuntimeTimeMappingEstablished": False,
    },
    "nwn": {
        "validatedSummary": str(NWN_SUMMARY_PATH),
        "video": nwn["video"],
        "encodedVisibleFrameCount": nwn_lifecycle["visibleFrameCount"],
        "timingAudit": nwn_timing_audit,
    },
    "auroraWeb": {
        "validatedSummary": str(WEB_SUMMARY_PATH),
        "video": web["video"],
        "runtimeVisibleSpanSeconds": web_lifecycle["visibleSpanSeconds"],
        "diagnosticHarness": web_lifecycle["diagnosticHarness"],
    },
    "comparison": {
        "mode": "onset-aligned-encoded-frame-progression-not-runtime-time",
        "runtimeDurationParityAvailable": False,
        "progressionFrameOffsets": progression_frame_offsets,
        "frameProgressions": frame_progressions,
        "progressionStills": {
            runtime_name: [str(path) for path in paths]
            for runtime_name, paths in progression_stills.items()
        },
        "sharedFeatures": [
            "yellow-white central explosion",
            "orange-red fire contour",
            "smoke and chunk tail after the flash",
        ],
        "openParityGaps": [
            "NWN peak fills more of the saved camera frame with yellow-white overexposure",
            "NWN environment and both subjects receive light, but the Web proof does not yet reconstruct the subjects",
            "the saved NWN capture lacks one runtime timestamp per frame, so lifecycle duration cannot be compared from its encoded PTS",
            "the exact saved NWN camera pose has not been recovered",
            "the Web scene contains exact source floor/rug receivers, ARE global lighting, six native main tile lights, and the one source carrier permitted by exact tile slot count, but omits wall/ceiling fade",
        ],
        "axisImplementation": {
            "billboardToWorldZ": "native mode 2 now uses the world-Z basis instead of the generic camera billboard",
            "chunkRotation": "Chunk models now receive the coordinate-converted particle orientation axis instead of a hard-coded Three Z rotation",
            "vectorMap": "Aurora (x, y, z) to Three (x, z, y), unchanged pending the cardinal-axis oracle",
            "tileModelConversion": "the MDL-to-GLB converter already applies Aurora-to-Three vertex conversion; no second proof-scene geometry transform is applied",
            "cameraParity": "not established; this remains a non-parity visual comparison",
        },
        "sourceSceneProof": {
            "meshFilter": manifest["proofScene"]["meshFilter"],
            "modelCount": len(manifest["proofScene"]["models"]),
            "textureCount": len(manifest["proofScene"]["textures"]),
            "areaLightingStatus": manifest["proofScene"]["areaLighting"]["status"],
            "areaLightingPhase": manifest["proofScene"]["areaLighting"]["phase"],
            "localTileLightingStatus": manifest["proofScene"]["areaLighting"][
                "localTileLightingStatus"
            ],
        },
        "globalRendererFixes": [
            "chunk-model textures use a cloned glTF texture with flipY=false because the MDL-to-GLB converter already writes glTF UV orientation",
            "particle billboard textures keep their existing sampler orientation",
        ],
        "chunkCollisionProof": {
            "profile": web["collisionOracle"]["staticTraversalProfile"],
            "queryCount": web["collisionOracle"]["runtimeSummary"]["queryCount"],
            "hitCount": web["collisionOracle"]["runtimeSummary"]["hitCount"],
            "appliedHitCount": web["collisionOracle"]["runtimeSummary"]["appliedHitCount"],
            "staticNoHitCount": web["collisionOracle"]["runtimeSummary"]["staticNoHitCount"],
            "landedParticleIds": web["collisionOracle"]["runtimeSummary"]["landedParticleIds"],
            "dynamicTraversalStatus": web["collisionOracle"]["dynamicTraversalStatus"],
            "maxRenderedChunkModels": max(
                int(entry.get("renderedChunkModels") or 0)
                for entry in json.loads(
                    (
                        ROOT
                        / "web"
                        / f"web-row22-one-trigger-{PROOF_VERSION}-summary.json"
                    ).read_text(
                        encoding="utf-8"
                    )
                )["proofState"]["timeline"]
            ),
            "maxBoundChunkMaterials": max(
                int(entry.get("boundChunkMaterialCount") or 0)
                for entry in json.loads(
                    (
                        ROOT
                        / "web"
                        / f"web-row22-one-trigger-{PROOF_VERSION}-summary.json"
                    ).read_text(
                        encoding="utf-8"
                    )
                )["proofState"]["timeline"]
            ),
        },
        "sourceLightProof": {
            "nodeName": "AuroraLight01",
            "radius": 10,
            "multiplier": 1,
            "timelineValidatedWithoutProofGeometry": web["checks"]["effectHasSourceFlashLight"],
            "finalBlackKeyHeld": web["checks"]["sourceFlashLightHoldsFinalBlackKey"],
            "diagnosticReceiverEvidence": {
                "summary": str(DIAGNOSTIC_LIGHT_SUMMARY_PATH),
                "illuminatedDelta": diagnostic_light["lifecycle"]["sourceLightReceiverProbe"]["illuminatedDelta"],
                "postDelta": diagnostic_light["lifecycle"]["sourceLightReceiverProbe"]["postDelta"],
            },
        },
        "compositeImage": str(OUTPUT_IMAGE_PATH),
    },
}
OUTPUT_JSON_PATH.write_text(json.dumps(comparison, indent=2), encoding="utf-8")

markdown = f"""# VFX row 22 NWN vs aurora-web diagnostic comparison

Status: `diagnostic-only-single-playback-open-context-gaps`.

- NWN retail: one `EffectVisualEffect(VFX_FNF_FIREBALL)` trigger; saved MP4 reused.
- aurora-web: one deterministic 12 fps playback, no loop, no overlap, clean baseline and post-roll, no diagnostic capsule or receiver.
- Retail source: row 22, `vff_explfire.mdl`, impact animation `{manifest['runtime']['animationLengthSeconds']:.6f}` seconds.
- Timing status: `{nwn_timing_audit['status']}`; encoded NWN PTS is not accepted as runtime time.
- Still alignment: onset plus 0, 3, and 9 captured frames; this compares sequence morphology, not equal runtime seconds.
- Source-backed static WOK collision: {web['collisionOracle']['runtimeSummary']['appliedHitCount']} hits applied; chunk particles {', '.join(str(entry) for entry in web['collisionOracle']['runtimeSummary']['landedParticleIds'])} landed.
- Source-backed Web scene: exact floor/rug receivers, {len(manifest['proofScene']['textures'])} source textures, and global moon ambient/diffuse from the saved ARE.
- Global renderer fix: chunk-model texture clones use glTF `flipY=false`; particle billboard texture orientation is unchanged.
- Source-backed tile lighting: all six native main lights and the one available source slot are resolved; five non-zero ARE source references have no corresponding tile slots and correctly create no Aurora carriers.
- Open gaps: exact NWN camera pose, owner/target creatures, and retail wall/ceiling fade are not reconstructed.
- VFX helper profile: static misses resolve as no-hit; shared dynamic traversal is not selected when helper arg0 is `1`.
- Capture limitation: missing NWN per-frame timestamps plus scene and camera gaps prevent timing and pixel-parity claims.
"""
OUTPUT_MD_PATH.write_text(markdown, encoding="ascii")
print(json.dumps(comparison, indent=2))
