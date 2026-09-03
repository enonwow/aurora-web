from __future__ import annotations

import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
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
ROW_ROOT = EVIDENCE_ROOT / "row44"
COMPARISON_ROOT = EVIDENCE_ROOT / "comparisons"
NWN_VIDEO = ROW_ROOT / "nwn" / "nwn-row44-one-trigger-approved-recapture.mp4"
WEB_TIMELINE_FPS = int(os.environ.get("ROW44_WEB_TIMELINE_FPS", "60"))
WEB_STEM = os.environ.get(
    "ROW44_WEB_STEM",
    (
        "aurora-web-row44-one-trigger-animation-origin-60fps-"
        "exact-base-scene-target-actor-observability-v5-20260719"
    ),
)
WEB_VIDEO = ROW_ROOT / "aurora-web" / f"{WEB_STEM}.mp4"
WEB_SUMMARY = ROW_ROOT / "aurora-web" / f"{WEB_STEM}-summary.json"
WEB_TIMELINE_VIDEO = (
    ROW_ROOT / "aurora-web" / f"{WEB_STEM}-timeline-{WEB_TIMELINE_FPS}fps.mp4"
)
OUTPUT_STEM = os.environ.get(
    "ROW44_OUTPUT_STEM",
    (
        "nwn-vs-aurora-web-row44-exact-base-scene-"
        "target-actor-visible-onset-aligned-v5-20260719"
    ),
)
OUTPUT_VIDEO = COMPARISON_ROOT / f"{OUTPUT_STEM}.mp4"
CONTACT_SHEET = COMPARISON_ROOT / f"{OUTPUT_STEM}-contact-sheet.png"
MANIFEST = COMPARISON_ROOT / os.environ.get(
    "ROW44_MANIFEST_NAME",
    "row44-exact-base-scene-target-actor-visible-onset-aligned-v5-20260719.json",
)
HEADER = COMPARISON_ROOT / "headers" / f"{OUTPUT_STEM}.png"
FFMPEG_PATH = Path(
    os.environ.get(
        "FFMPEG_PATH",
        "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
        "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
    )
)

EXPECTED_NWN_SHA256 = "6db297444b59edaee29c3b9e4b465cb6bee29013a693d9cec22ad0302ee5c95d"
EXPECTED_OBSERVABILITY_VERSION = "aurora-vfx-runtime-observability/v1"
COMPARISON_VERSION = os.environ.get("ROW44_COMPARISON_VERSION", "aurora-vfx-row44-comparison/v5")
FPS = 30
PANEL_SIZE = (440, 374)
HEADER_SIZE = (880, 92)
OUTPUT_SIZE = (880, 466)
COMPARISON_ONSET_SECONDS = 2.0
COMPARISON_DURATION_SECONDS = 6.8


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


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
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


def detect_green_onset(
    file_path: Path,
    *,
    search_start_seconds: float,
    minimum_green_excess: int,
    minimum_pixel_count: int,
) -> dict[str, float | int | str]:
    capture = cv2.VideoCapture(str(file_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video for onset analysis: {file_path}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frame_index = 0
    result: dict[str, float | int | str] | None = None
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        elapsed = frame_index / fps
        if elapsed >= search_start_seconds:
            blue = frame[:, :, 0].astype(np.int16)
            green = frame[:, :, 1].astype(np.int16)
            red = frame[:, :, 2].astype(np.int16)
            green_excess = green - np.maximum(red, blue)
            saturated_green = (green >= 80) & (green_excess >= minimum_green_excess)
            pixel_count = int(np.count_nonzero(saturated_green))
            if pixel_count >= minimum_pixel_count:
                result = {
                    "frameIndex": frame_index,
                    "seconds": elapsed,
                    "greenPixelCount": pixel_count,
                    "method": (
                        f"G>=80 and G-max(R,B)>={minimum_green_excess}; "
                        f"pixel count>={minimum_pixel_count}"
                    ),
                }
                break
        frame_index += 1
    capture.release()
    if result is None:
        raise RuntimeError(f"No green VFX onset found: {file_path}")
    return result


def validate_web_proof(summary: dict[str, object]) -> dict[str, object]:
    active_proof_state = summary.get("activeProofState")
    if not isinstance(active_proof_state, dict):
        raise RuntimeError("Aurora Web summary has no activeProofState.")
    active_observability = active_proof_state.get("runtimeObservability")
    if not isinstance(active_observability, dict):
        raise RuntimeError("Aurora Web active proof has no runtime observability report.")

    proof_state = summary.get("finalProofState", summary.get("proofState"))
    if not isinstance(proof_state, dict):
        raise RuntimeError("Aurora Web summary has no finalProofState.")
    proof_gate = proof_state.get("runtimeObservability")
    if not isinstance(proof_gate, dict):
        raise RuntimeError("Aurora Web summary has no runtime observability report.")
    proof_gate_status = proof_gate.get("proofGate")
    if not isinstance(proof_gate_status, dict):
        raise RuntimeError("Aurora Web proof report has no proofGate status.")
    blocker_manifest = proof_gate_status.get("blockerManifest")
    playback_guard = proof_gate.get("playbackGuard")
    if not isinstance(playback_guard, dict):
        raise RuntimeError("Aurora Web proof report has no playbackGuard.")
    timeline = proof_state.get("timeline")
    if not isinstance(timeline, list) or not timeline:
        raise RuntimeError("Aurora Web proof report has no timeline.")
    final_sample = max(
        (sample for sample in timeline if isinstance(sample, dict)),
        key=lambda sample: float(sample.get("wallSeconds", -1)),
    )
    checks = {
        "recordedSingleContinuousPlayback": (
            summary.get("status")
            in {
                "recorded-single-continuous-playback",
                "recorded-single-deterministic-playback",
            }
        ),
        "deterministicCapture": summary.get("mp4DeterministicCapture") is True,
        "singleTrigger": summary.get("triggerCount") == 1,
        "loopDisabled": summary.get("loop") is False,
        "captureArmedBeforePlayback": summary.get("captureArmedBeforePlayback") is True,
        "diagnosticHarnessDisabled": summary.get("diagnosticHarness") is False,
        "observabilityVersion": proof_gate.get("version") == EXPECTED_OBSERVABILITY_VERSION,
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
        "proofGate": proof_gate_status.get("status") == "pass",
        "runtimeIdentity": proof_gate.get("identity", {}).get("status") == "ready",
        "hostGraph": proof_gate.get("hostGraph", {}).get("status") == "pass",
        "assetSettlement": proof_gate.get("assetSettlement", {}).get("status") == "settled",
        "drawLedger": proof_gate.get("drawLedger", {}).get("status") == "pass",
        "playbackGuard": playback_guard.get("status") == "pass",
        "playbackGuardSingleTrigger": playback_guard.get("triggerCount") == 1,
        "playbackGuardNoOverlap": playback_guard.get("overlapCount") == 0,
        "playbackGuardCompleted": playback_guard.get("completed") is True,
        "playbackGuardPostDurationHidden": (
            playback_guard.get("postDurationHidden") is True
            and playback_guard.get("postDurationHiddenRequired") is True
        ),
        "blockerManifestEmpty": blocker_manifest in ({}, [], None),
        "debugOverlayFinalDisabled": (
            proof_gate.get("debugOverlay", {}).get("finalProfileDisabled") is True
        ),
        "finalSampleIsPost": final_sample.get("phase") == "post",
        "finalSampleHasNoVisibleFrames": final_sample.get("visibleFrameCount") == 0,
        "finalSampleHasNoParticles": final_sample.get("drawParticles") == 0,
        # The final timeline sample can precede the terminal hidden-state commit by one
        # render tick. The immutable finalProofState is the v2 recorder's authority.
        "finalCommittedProofGate": proof_gate_status.get("status") == "pass",
        "finalCommittedBlockersEmpty": blocker_manifest in ({}, [], None),
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise RuntimeError(f"Aurora Web proof gate failed: {', '.join(failed)}")
    return {
        "version": proof_gate["version"],
        "checks": checks,
        "proofGate": proof_gate_status,
        "playbackGuard": playback_guard,
        "blockerManifest": blocker_manifest,
        "terminalTimelineSample": {
            "wallSeconds": final_sample.get("wallSeconds"),
            "effectSeconds": final_sample.get("effectSeconds"),
            "frameIndex": final_sample.get("frameIndex"),
            "phase": final_sample.get("phase"),
            "visibleFrameCount": final_sample.get("visibleFrameCount"),
            "drawParticles": final_sample.get("drawParticles"),
            "proofGateStatus": final_sample.get("vfxRuntimeProofGateStatus"),
            "blockers": final_sample.get("vfxRuntimeProofBlockers"),
        },
        "finalCommittedState": {
            "proofGateStatus": proof_gate_status.get("status"),
            "blockers": blocker_manifest,
            "completed": playback_guard.get("completed"),
            "postDurationHidden": playback_guard.get("postDurationHidden"),
        },
    }


def create_header() -> None:
    HEADER.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", HEADER_SIZE, "#171d21")
    draw = ImageDraw.Draw(image)
    draw.text(
        (18, 10),
        "row44 | VFX_IMP_ACID_S / vim_explacid",
        fill="#f7f9fa",
        font=load_font(24, bold=True),
    )
    draw.text(
        (18, 53),
        "NWN retail oracle (saved MP4)",
        fill="#ffffff",
        font=load_font(17, bold=True),
    )
    draw.text(
        (458, 53),
        f"Aurora Web (accepted proof, {WEB_TIMELINE_FPS} fps timeline)",
        fill="#ffffff",
        font=load_font(17, bold=True),
    )
    draw.line((440, 43, 440, 90), fill="#55636d", width=2)
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
        f"[1:v]fps={FPS},tpad=stop_mode=clone:stop_duration=4,setsar=1,"
        f"scale={PANEL_SIZE[0]}:{PANEL_SIZE[1]}:"
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
        f"{nwn_start:.6f}",
        "-i",
        str(NWN_VIDEO),
        "-ss",
        f"{web_start:.6f}",
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
        ("baseline", 1.5),
        ("first visible", 2.0),
        ("early burst", 2.067),
        ("retail late phase", 3.8),
        ("Web tail", 5.0),
        ("post", 6.7),
    ]
    frame_width, frame_height = OUTPUT_SIZE
    caption_height = 34
    sheet = Image.new(
        "RGB",
        (frame_width, len(samples) * (frame_height + caption_height)),
        "#101417",
    )
    draw = ImageDraw.Draw(sheet)
    records = []
    for index, (label, seconds) in enumerate(samples):
        frame = read_frame(OUTPUT_VIDEO, seconds)
        y = index * (frame_height + caption_height)
        draw.text(
            (14, y + 7),
            f"{label} | aligned t={seconds:.3f} s",
            fill="#e9eef1",
            font=load_font(17, bold=True),
        )
        sheet.paste(frame, (0, y + caption_height))
        records.append({"label": label, "comparisonSeconds": seconds})
    sheet.save(CONTACT_SHEET, optimize=True)
    return records


def main() -> None:
    for required in [FFMPEG_PATH, NWN_VIDEO, WEB_VIDEO, WEB_SUMMARY]:
        if not required.exists():
            raise RuntimeError(f"Required artifact is missing: {required}")
    if sha256(NWN_VIDEO) != EXPECTED_NWN_SHA256:
        raise RuntimeError("Saved NWN oracle hash does not match the approved row44 recapture.")

    web_summary = json.loads(WEB_SUMMARY.read_text(encoding="utf-8"))
    proof_validation = validate_web_proof(web_summary)
    final_proof_state = web_summary.get("finalProofState", web_summary.get("proofState", {}))
    render_debug = final_proof_state.get("renderDebug", {}) if isinstance(final_proof_state, dict) else {}
    proof_scene = render_debug.get("proofScene", {}) if isinstance(render_debug, dict) else {}
    proof_actors = proof_scene.get("actors", []) if isinstance(proof_scene, dict) else []
    exact_bic_source_actor_present = any(
        isinstance(actor, dict)
        and actor.get("sourceModel") == "pfh0"
        and actor.get("status") == "source-backed-bic-part-models-equipment-supermodel-pause1-playing"
        for actor in proof_actors
    )
    COMPARISON_ROOT.mkdir(parents=True, exist_ok=True)
    web_timeline_probe = create_web_timeline_video()

    nwn_onset = detect_green_onset(
        NWN_VIDEO,
        search_start_seconds=8.0,
        minimum_green_excess=20,
        minimum_pixel_count=40,
    )
    web_onset = detect_green_onset(
        WEB_TIMELINE_VIDEO,
        search_start_seconds=1.5,
        minimum_green_excess=20,
        minimum_pixel_count=20,
    )
    nwn_start = max(0.0, float(nwn_onset["seconds"]) - COMPARISON_ONSET_SECONDS)
    web_start = max(0.0, float(web_onset["seconds"]) - COMPARISON_ONSET_SECONDS)
    create_comparison_video(nwn_start, web_start)
    samples = create_contact_sheet()

    manifest = {
        "version": COMPARISON_VERSION,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "matched-with-gaps",
        "fixtureId": "vfx-broad-row44",
        "policy": {
            "auroraFirst": True,
            "nwnRecordingReusedWithoutRerun": True,
            "auroraWebAcceptedPlaybackCount": 1,
            "comparisonDoesNotRetriggerEitherRuntime": True,
            "xoreosUsed": False,
        },
        "alignment": {
            "strategy": "first green VFX-visible encoded frame aligned at comparison t=2.0 s",
            "comparisonOnsetSeconds": COMPARISON_ONSET_SECONDS,
            "nwnSourceOnset": nwn_onset,
            "nwnSourceStartSeconds": nwn_start,
            "auroraWebSourceOnset": web_onset,
            "auroraWebSourceStartSeconds": web_start,
        },
        "nwn": {
            "video": media_record(NWN_VIDEO),
            "probe": probe_video(NWN_VIDEO),
            "oracleStatus": "approved-saved-retail-capture",
        },
        "auroraWeb": {
            "acceptedCapture": media_record(WEB_VIDEO),
            "summary": media_record(WEB_SUMMARY),
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
            "proof": proof_validation,
            "runtimeIdentity": (
                web_summary.get("proofState", {})
                .get("runtimeObservability", {})
                .get("identity")
            ),
        },
        "comparison": {
            "video": media_record(OUTPUT_VIDEO),
            "contactSheet": media_record(CONTACT_SHEET),
            "durationSeconds": COMPARISON_DURATION_SECONDS,
            "fps": FPS,
            "samples": samples,
        },
        "sourceSceneCoverage": {
            "sourceTileCount": 4,
            "admittedExactBaseTileCount": 4,
            "unresolvedTileInstanceIndices": [],
            "exactBicSourceActorPresent": exact_bic_source_actor_present,
            "targetPositionMeters": [0.0, 3.0, 0.0],
            "sourcePositionMeters": [0.0, 0.0, 0.0],
            "targetActor": {
                "templateResRef": "nw_innkeeper",
                "sourceModel": "c_yinnkeep",
                "supermodel": "a_ba",
                "animation": "pause1",
                "sourceForwardAuroraXY": [0.0, -1.0],
                "orientationSource": (
                    "vb44shot.nss SetFacingPoint(GetPosition(oSource))"
                ),
            },
        },
        "openParityGaps": [
            (
                "The exact BIC source/player and source-backed target actors are present."
                if exact_bic_source_actor_present
                else "The source/player actor remains absent; the target actor is source-backed and active."
            ),
            "All four source tile instances and source-backed area/tile lighting are present, but the Web floor/material response remains visibly different.",
            "The saved retail runner did not apply a camera profile, so the internal Aurora camera transform is unknown.",
            "The Web camera is capture-calibrated and explicitly not an exact Aurora transform.",
            "Remaining VFX luminance, material, bloom, randomization, and tail differences require Aurora-first evidence before tuning.",
        ],
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    print(
        json.dumps(
            {
                "status": manifest["status"],
                "nwnOnset": nwn_onset,
                "auroraWebOnset": web_onset,
                "comparison": media_record(OUTPUT_VIDEO),
                "contactSheet": media_record(CONTACT_SHEET),
                "manifest": media_record(MANIFEST),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
