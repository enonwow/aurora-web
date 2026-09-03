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
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-broad-proof-2026-07-16"
)
ROW_ROOT = EVIDENCE_ROOT / "row210"
COMPARISON_ROOT = EVIDENCE_ROOT / "comparisons"
NWN_VIDEO = ROW_ROOT / "nwn" / "nwn-row210-one-trigger.mp4"
NWN_VALIDATED_SUMMARY = ROW_ROOT / "nwn" / "validated-summary.json"
WEB_STEM = (
    "aurora-web-row210-one-trigger-lightning-radius-"
    "post-duration-observability-v2-20260719"
)
WEB_VIDEO = ROW_ROOT / "aurora-web" / f"{WEB_STEM}.mp4"
WEB_FRAME_MANIFEST = ROW_ROOT / "aurora-web" / f"{WEB_STEM}.frame.json"
OUTPUT_STEM = (
    "nwn-vs-aurora-web-row210-lightning-radius-"
    "post-duration-onset-aligned-v2-20260719"
)
OUTPUT_VIDEO = COMPARISON_ROOT / f"{OUTPUT_STEM}.mp4"
CONTACT_SHEET = COMPARISON_ROOT / f"{OUTPUT_STEM}-contact-sheet.png"
MANIFEST = (
    COMPARISON_ROOT
    / "row210-lightning-radius-post-duration-onset-aligned-v2-20260719.json"
)
HEADER = COMPARISON_ROOT / "headers" / f"{OUTPUT_STEM}.png"
FFMPEG_PATH = Path(
    os.environ.get(
        "FFMPEG_PATH",
        "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
        "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
    )
)

EXPECTED_NWN_SHA256 = "808fe520f277c490d3bf723562c7e3fc38f5d2b25323a79bef557ce8dec05a6c"
EXPECTED_WEB_SHA256 = "e2f31f41878defeb1844e751f9a762c0403198d9802c3470f41adbd236e1f578"
EXPECTED_WEB_FRAME_SHA256 = (
    "5d56fc65254d71567506c0b3b2cd154180ab6d6e387082d91807d16a81352ec7"
)
EXPECTED_OBSERVABILITY_VERSION = "aurora-vfx-runtime-observability/v1"
FPS = 30
PANEL_SIZE = (640, 540)
HEADER_SIZE = (1280, 92)
OUTPUT_SIZE = (1280, 632)
COMPARISON_ONSET_SECONDS = 2.0
COMPARISON_DURATION_SECONDS = 22.9


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


def validate_nwn_oracle(summary: dict[str, object]) -> dict[str, object]:
    video = summary.get("video")
    lifecycle = summary.get("lifecycle")
    checks = summary.get("checks")
    if not isinstance(video, dict) or not isinstance(lifecycle, dict):
        raise RuntimeError("Saved NWN validation summary is incomplete.")
    if not isinstance(checks, dict):
        raise RuntimeError("Saved NWN validation checks are missing.")
    validation = {
        "status": summary.get("status") == "valid-single-trigger-visible-nwn-oracle",
        "videoHash": video.get("sha256") == EXPECTED_NWN_SHA256,
        "singleTrigger": checks.get("exactlyOneTriggerMarker") is True,
        "durationMarker": checks.get("expectedEndMarkerForDuration") is True,
        "decodes": checks.get("mp4Decodes") is True,
        "baseline": checks.get("baselineBeforeVisibleEffect") is True,
        "visibleInterval": checks.get("visibleEffectIntervalPresent") is True,
        "durationMargins": checks.get("captureCoversRequestedDurationPlusMargins") is True,
        "noAutomaticRetry": checks.get("noAutomaticRetry") is True,
        "requestedDuration": lifecycle.get("requestedDurationSeconds") == 20.0,
    }
    failed = [name for name, passed in validation.items() if not passed]
    if failed:
        raise RuntimeError(f"Saved NWN oracle validation failed: {', '.join(failed)}")
    return {
        "checks": validation,
        "onsetSeconds": float(lifecycle["onsetVideoSeconds"]),
        "lastVisibleSeconds": float(lifecycle["lastVisibleVideoSeconds"]),
        "requestedDurationSeconds": float(lifecycle["requestedDurationSeconds"]),
    }


def validate_web_proof(frame_manifest: dict[str, object]) -> dict[str, object]:
    report = frame_manifest.get("proofGateReport")
    samples = frame_manifest.get("mp4PlaybackSamples")
    if not isinstance(report, dict):
        raise RuntimeError("Aurora Web capture has no observability report.")
    if not isinstance(samples, list) or not samples:
        raise RuntimeError("Aurora Web capture has no playback samples.")
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

    playback_samples = [
        sample
        for sample in samples
        if isinstance(sample, dict) and isinstance(sample.get("playbackState"), dict)
    ]
    final_sample = max(
        playback_samples,
        key=lambda sample: float(sample.get("elapsedSeconds", -1)),
    )
    final_state = final_sample["playbackState"]
    effect_samples = [
        sample
        for sample in playback_samples
        if sample["playbackState"].get("phase") == "effect"
    ]
    if not effect_samples:
        raise RuntimeError("Aurora Web proof has no effect-phase sample.")
    first_effect = min(
        effect_samples,
        key=lambda sample: float(sample.get("elapsedSeconds", -1)),
    )

    validation = {
        "accepted": frame_manifest.get("accepted") is True,
        "deterministicCapture": frame_manifest.get("mp4DeterministicCapture") is True,
        "exactFrameCount": frame_manifest.get("mp4FrameCount") == 690,
        "exactFps": frame_manifest.get("mp4Fps") == FPS,
        "exactDuration": frame_manifest.get("mp4DurationMs") == 23000,
        "observabilityVersion": report.get("version") == EXPECTED_OBSERVABILITY_VERSION,
        "identity": identity.get("status") == "ready",
        "hostGraph": host_graph.get("status") == "pass",
        "assets": assets.get("status") == "settled",
        "draws": draws.get("status") == "pass",
        "playbackGuard": playback.get("status") == "pass",
        "singleTrigger": playback.get("triggerCount") == 1,
        "loopDisabled": playback.get("loop") is False,
        "noOverlap": playback.get("overlapCount") == 0,
        "requestedDuration": playback.get("durationSeconds") == 20,
        "completed": playback.get("completed") is True,
        "postDurationHidden": playback.get("postDurationHidden") is True,
        "postDurationRequired": playback.get("postDurationHiddenRequired") is True,
        "proofGate": gate.get("status") == "pass",
        "blockerManifestEmpty": gate.get("blockerManifest") in ([], {}, None),
        "overlayDisabled": overlay.get("enabled") is False,
        "finalProfileDisabled": overlay.get("finalProfileDisabled") is True,
        "finalPhase": final_state.get("phase") == "post",
        "finalDrawsZero": final_state.get("drawParticles") == 0,
        "finalVisibleZero": final_state.get("visibleFrameCount") == 0,
        "finalProofGate": final_state.get("vfxRuntimeProofGateStatus") == "pass",
        "finalBlockersEmpty": final_state.get("vfxRuntimeProofBlockers") in (
            "",
            [],
            {},
            None,
        ),
    }
    failed = [name for name, passed in validation.items() if not passed]
    if failed:
        raise RuntimeError(f"Aurora Web proof validation failed: {', '.join(failed)}")
    return {
        "checks": validation,
        "firstEffectSeconds": float(first_effect["elapsedSeconds"]),
        "finalSample": {
            "elapsedSeconds": final_sample.get("elapsedSeconds"),
            "phase": final_state.get("phase"),
            "effectSeconds": final_state.get("effectSeconds"),
            "drawParticles": final_state.get("drawParticles"),
            "visibleFrameCount": final_state.get("visibleFrameCount"),
            "proofGate": final_state.get("vfxRuntimeProofGateStatus"),
            "blockers": final_state.get("vfxRuntimeProofBlockers"),
        },
        "runtimeObservability": {
            "version": report.get("version"),
            "identity": identity,
            "hostGraph": {
                "status": host_graph.get("status"),
                "expected": host_graph.get("expected"),
                "attached": host_graph.get("attached"),
                "mismatches": host_graph.get("mismatches"),
            },
            "assetSettlement": {
                "status": assets.get("status"),
                "entryCount": len(assets.get("entries", [])),
            },
            "drawLedger": {
                "status": draws.get("status"),
                "entryCount": len(draws.get("entries", [])),
            },
            "playbackGuard": playback,
            "debugOverlay": overlay,
            "proofGate": gate,
        },
    }


def create_header() -> None:
    HEADER.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", HEADER_SIZE, "#171d21")
    draw = ImageDraw.Draw(image)
    draw.text(
        (18, 10),
        "row210 | VFX_BEAM_FIRE / vim_rayfire | 20 s",
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
        (658, 53),
        "Aurora Web (accepted v2, proof gate PASS)",
        fill="#ffffff",
        font=load_font(17, bold=True),
    )
    draw.line((640, 43, 640, 90), fill="#55636d", width=2)
    image.save(HEADER, optimize=True)


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
        str(WEB_VIDEO),
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
        ("onset +0.5 s", 2.5),
        ("early", 5.0),
        ("steady +10 s", 12.0),
        ("tail +19.5 s", 21.5),
        ("post +20.5 s", 22.5),
    ]
    thumb_size = (640, 316)
    caption_height = 34
    rows = 3
    sheet = Image.new(
        "RGB",
        (thumb_size[0] * 2, rows * (thumb_size[1] + caption_height)),
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
        WEB_FRAME_MANIFEST,
    ]
    for required in required_files:
        if not required.exists():
            raise RuntimeError(f"Required artifact is missing: {required}")
    if sha256(NWN_VIDEO) != EXPECTED_NWN_SHA256:
        raise RuntimeError("Saved NWN oracle hash does not match the approved proof.")
    if sha256(WEB_VIDEO) != EXPECTED_WEB_SHA256:
        raise RuntimeError("Aurora Web video hash does not match accepted row210 v2.")
    if sha256(WEB_FRAME_MANIFEST) != EXPECTED_WEB_FRAME_SHA256:
        raise RuntimeError("Aurora Web frame manifest hash does not match accepted row210 v2.")

    nwn_summary = json.loads(NWN_VALIDATED_SUMMARY.read_text(encoding="utf-8"))
    web_manifest = json.loads(WEB_FRAME_MANIFEST.read_text(encoding="utf-8"))
    nwn_validation = validate_nwn_oracle(nwn_summary)
    web_validation = validate_web_proof(web_manifest)
    nwn_start = max(
        0.0,
        float(nwn_validation["onsetSeconds"]) - COMPARISON_ONSET_SECONDS,
    )
    web_start = max(
        0.0,
        float(web_validation["firstEffectSeconds"]) - COMPARISON_ONSET_SECONDS,
    )

    COMPARISON_ROOT.mkdir(parents=True, exist_ok=True)
    create_comparison_video(nwn_start, web_start)
    samples = create_contact_sheet()
    output_probe = probe_video(OUTPUT_VIDEO)
    if output_probe["frameCount"] != 687:
        raise RuntimeError(f"Unexpected comparison frame count: {output_probe}")

    manifest = {
        "version": "aurora-vfx-row210-comparison/v2",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "matched-with-gaps",
        "fixtureId": "vfx-broad-row210",
        "sourceRowId": 210,
        "label": "VFX_BEAM_FIRE",
        "policy": {
            "auroraFirst": True,
            "nwnRecordingReusedWithoutRerun": True,
            "auroraWebAcceptedPlaybackCount": 1,
            "comparisonDoesNotRetriggerEitherRuntime": True,
            "xoreosUsed": False,
        },
        "alignment": {
            "strategy": "validated first-visible onset aligned at comparison t=2.0 s",
            "comparisonOnsetSeconds": COMPARISON_ONSET_SECONDS,
            "nwnSourceOnsetSeconds": nwn_validation["onsetSeconds"],
            "nwnSourceStartSeconds": nwn_start,
            "nwnLastVisibleSourceSeconds": nwn_validation["lastVisibleSeconds"],
            "auroraWebSourceOnsetSeconds": web_validation["firstEffectSeconds"],
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
            "frameManifest": media_record(WEB_FRAME_MANIFEST),
            "probe": probe_video(WEB_VIDEO),
            "validation": web_validation,
            "runtimeIdentity": web_validation["runtimeObservability"]["identity"],
        },
        "comparison": {
            "video": media_record(OUTPUT_VIDEO),
            "contactSheet": media_record(CONTACT_SHEET),
            "probe": output_probe,
            "layout": "NWN left; Aurora Web right",
        },
        "matchedContracts": [
            "one intentional trigger with loop disabled and overlap count zero",
            "twenty-second requested duration",
            "clean post state with zero drawn particles and zero visible frames",
            "broad orange linked layer plus a narrow bright Lightning layer",
            "source flare and continuous source-to-target attachment",
            "visible midpoint zigzag with retail lightningRadius=0.04",
        ],
        "openParityGaps": [
            "Aurora Web source flare is more circular and more heavily saturated.",
            "Aurora Web broad orange linked layer is visually thinner.",
            "Retail actors, room geometry, occlusion, and exact capture camera are absent from the Web fixture.",
            "Retail RNG seed is unavailable, so instantaneous Lightning paths are not expected to be identical.",
            "Material, bloom, and postprocess parity is not yet pixel-verified.",
        ],
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    print(
        json.dumps(
            {
                "status": manifest["status"],
                "nwnReused": True,
                "auroraWebAcceptedPlaybackCount": 1,
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
