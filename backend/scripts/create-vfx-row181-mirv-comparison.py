from __future__ import annotations

import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import cv2
import PIL
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
ROW_ROOT = EVIDENCE_ROOT / "row181"
COMPARISON_ROOT = EVIDENCE_ROOT / "comparisons"
NWN_VIDEO = (
    ROW_ROOT
    / "nwn-recapture-2"
    / "nwn-row181-one-trigger-approved-recapture.mp4"
)
NWN_SUMMARY = ROW_ROOT / "nwn-recapture-2" / "validated-summary.json"
NWN_CAPTURE_SUMMARY = ROW_ROOT / "nwn-recapture-2" / "summary.json"
NWN_PREFLIGHT = ROW_ROOT / "nwn-recapture-2" / "preflight.json"
NWN_TRIGGER_LEDGER = ROW_ROOT / "nwn-recapture-2" / "trigger-ledger.json"
NWN_TRIGGER_SCRIPT = ROW_ROOT / "nwn-recapture-2" / "scripts" / "vb181shot.nss"
NWN_ENTRY_SCRIPT = ROW_ROOT / "nwn-recapture-2" / "scripts" / "vb181entry.nss"
WEB_STEM = os.environ.get(
    "VFX_ROW181_WEB_STEM",
    "aurora-web-row181-one-trigger-log-distance-source-scene-camera-v2-20260813",
)
WEB_VIDEO = ROW_ROOT / "aurora-web" / f"{WEB_STEM}.mp4"
WEB_SUMMARY = ROW_ROOT / "aurora-web" / f"{WEB_STEM}-summary.json"
FIXTURE_MANIFEST = (
    REPO_ROOT
    / "frontend"
    / "public"
    / "dev-fixtures"
    / "vfx-broad-row181"
    / "manifest.json"
)
FIXTURE_PAYLOAD = FIXTURE_MANIFEST.with_name("payload.json")
TYPE10_AUDIT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "vfx-progfx-type10-log-timing-correction-audit-2026-08-13.md"
)
OUTPUT_STEM = os.environ.get(
    "VFX_ROW181_OUTPUT_STEM",
    "nwn-vs-aurora-web-row181-visible-window-diagnostic-v4-20260813",
)
OUTPUT_VIDEO = COMPARISON_ROOT / f"{OUTPUT_STEM}.mp4"
CONTACT_SHEET = COMPARISON_ROOT / f"{OUTPUT_STEM}-contact-sheet.png"
MANIFEST = COMPARISON_ROOT / f"{OUTPUT_STEM}.json"
BLOCKER_MANIFEST = COMPARISON_ROOT / f"{OUTPUT_STEM}-blocker.json"
HEADER = COMPARISON_ROOT / "headers" / f"{OUTPUT_STEM}.png"
FFMPEG_PATH = Path(
    os.environ.get(
        "FFMPEG_PATH",
        "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
        "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
    )
)

EXPECTED_HASHES = {
    NWN_VIDEO: "b6106159ad902a281fa245331bf92a366b1199a650c2d2a71909f569e71ed7c6",
    NWN_SUMMARY: "cb45bbe2f7418d753c2be5e955c6a910d617f019300c8ac191f9dd176c403bfb",
    NWN_CAPTURE_SUMMARY: "698b8a13260b170009246577cf1a12106a1c993118eb25613f7ec77ccab5b031",
    NWN_PREFLIGHT: "5f5bbb9c723067a63f20dc25308ae6a748edb214a5ca414580fc0c263aa129b1",
    NWN_TRIGGER_LEDGER: "dacd1037d8a5484717c9219d0350ad902fa46304e749e871f68aedea5c8db210",
    NWN_TRIGGER_SCRIPT: "1694501f72c07814a4624242a131edf49bda883368845b0667f0b7956137124f",
    NWN_ENTRY_SCRIPT: "9a7747fc77de065c82fc2c8900718fd57d37247909dc3275a8242285064fd77c",
    WEB_VIDEO: "cb580ffc541df6c3fd6ce2f3a79badd18e5c59c335e7dca077755785ccdf33af",
    WEB_SUMMARY: "099098421b1c6247aff2c4bb3ad922cacafd3b90a0edb8c351d9d085240076d5",
    FIXTURE_MANIFEST: "8ea495c2753e5a0649574f835c9d054086105336a63c960b593b1ade975a3b1c",
    FIXTURE_PAYLOAD: "40f178a8ee340122a326f86d78c9958fda4b10cd59ba03f37424d6e8b28b3237",
    TYPE10_AUDIT: "a430922037bd400dc933b0e70df3d1165cb4ba610a23a2976de7468c883bc8d7",
}
FPS = 30
COMPARISON_VISIBLE_ONSET_SECONDS = 2.0
NATIVE_OWNER_DURATION_SECONDS = 0.625
PANEL_SIZE = (640, 546)
HEADER_SIZE = (1280, 90)
OUTPUT_SIZE = (1280, 636)


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


def probe_video(file_path: Path) -> dict[str, float | int]:
    capture = cv2.VideoCapture(str(file_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video: {file_path}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    capture.release()
    if min(fps, frame_count, width, height) <= 0:
        raise RuntimeError(f"Invalid video metadata: {file_path}")
    return {
        "fps": fps,
        "frameCount": frame_count,
        "durationSeconds": frame_count / fps,
        "width": width,
        "height": height,
    }


def load_font(
    size: int, *, bold: bool = False
) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_path = Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")
    return (
        ImageFont.truetype(str(font_path), size)
        if font_path.exists()
        else ImageFont.load_default()
    )


def validate_inputs() -> tuple[
    dict[str, object],
    dict[str, object],
    dict[str, object],
    dict[str, object],
    dict[str, object],
]:
    for file_path, expected_hash in EXPECTED_HASHES.items():
        if not file_path.exists():
            raise RuntimeError(f"Required artifact is missing: {file_path}")
        actual_hash = sha256(file_path)
        if actual_hash != expected_hash:
            raise RuntimeError(
                f"Immutable source hash changed: {file_path}; "
                f"expected={expected_hash}, actual={actual_hash}"
            )
    nwn = json.loads(NWN_SUMMARY.read_text(encoding="utf-8"))
    nwn_capture = json.loads(NWN_CAPTURE_SUMMARY.read_text(encoding="utf-8"))
    nwn_preflight = json.loads(NWN_PREFLIGHT.read_text(encoding="utf-8"))
    nwn_ledger = json.loads(NWN_TRIGGER_LEDGER.read_text(encoding="utf-8"))
    web = json.loads(WEB_SUMMARY.read_text(encoding="utf-8"))
    fixture = json.loads(FIXTURE_MANIFEST.read_text(encoding="utf-8"))
    payload = json.loads(FIXTURE_PAYLOAD.read_text(encoding="utf-8"))

    nwn_checks = nwn.get("checks", {})
    nwn_run_id = nwn.get("runId")
    nwn_chain_checks = {
        "validatedStatus": nwn.get("status")
        == "valid-single-trigger-visible-nwn-oracle",
        "validatedSingleTrigger": nwn_checks.get("exactlyOneTriggerMarker") is True,
        "validatedDecode": nwn_checks.get("mp4Decodes") is True,
        "validatedNoRetry": nwn_checks.get("noAutomaticRetry") is True,
        "runIdentity": bool(nwn_run_id)
        and nwn_capture.get("runId") == nwn_run_id
        and nwn_preflight.get("runId") == nwn_run_id
        and nwn_ledger.get("runId") == nwn_run_id,
        "fixtureIdentity": nwn.get("fixtureId") == "vfx-nwn-broad-row181"
        and nwn_capture.get("fixtureId") == "vfx-nwn-broad-row181"
        and nwn_preflight.get("fixtureId") == "vfx-nwn-broad-row181"
        and nwn_ledger.get("fixtureId") == "vfx-nwn-broad-row181",
        "ledgerSingleTrigger": nwn_ledger.get("intentionalTriggerCount") == 1
        and nwn_ledger.get("observedTriggerLogCount") == 1
        and nwn_ledger.get("validSingleTrigger") is True,
        "captureSingleAttempt": nwn_capture.get("attemptCountThisApprovedRun") == 1
        and nwn_capture.get("automaticRetry") is False,
        "moduleIdentity": nwn_capture.get("module", {}).get("moduleSha256")
        == "4ed1a443d4382e0e2b6de58a89b2d1da1376e0dc58b475238b1bd4603e2f42a4",
        "scriptIdentity": nwn_ledger.get("scriptIdentity") == "vb181shot"
        and nwn_preflight.get("scripts", {}).get("vb181shot", {}).get("sha256")
        == EXPECTED_HASHES[NWN_TRIGGER_SCRIPT]
        and nwn_preflight.get("scripts", {}).get("vb181entry", {}).get("sha256")
        == EXPECTED_HASHES[NWN_ENTRY_SCRIPT],
        "videoIdentity": nwn.get("video", {}).get("sha256")
        == EXPECTED_HASHES[NWN_VIDEO]
        and nwn_capture.get("runtime", {})
        .get("wallClockRetiming", {})
        .get("retimedVideo", {})
        .get("sha256")
        == EXPECTED_HASHES[NWN_VIDEO],
    }
    failed_nwn_checks = [
        name for name, passed in nwn_chain_checks.items() if not passed
    ]
    if failed_nwn_checks:
        raise RuntimeError(
            "Saved NWN oracle chain validation failed: "
            + ", ".join(failed_nwn_checks)
        )
    if (
        nwn.get("status") != "valid-single-trigger-visible-nwn-oracle"
        or nwn.get("lifecycle", {}).get("metric")
        != "pixel-count with max-channel absolute delta >= 42 from four-second baseline median"
    ):
        raise RuntimeError("Saved NWN visibility-window metric is not the expected diagnostic.")

    active_report = web.get("activeProofState", {}).get("runtimeObservability", {})
    final_report = web.get("finalProofState", {}).get("runtimeObservability", {})
    playback = final_report.get("playbackGuard", {})
    baseline_gate = active_report.get("proofGate", {})
    final_gate = final_report.get("proofGate", {})
    active_overlay = active_report.get("debugOverlay", {})
    final_overlay = final_report.get("debugOverlay", {})
    identity = final_report.get("identity", {})
    frontend_identity = identity.get("frontend", {})
    backend_identity = identity.get("backend", {})
    visual_readiness = (
        web.get("finalProofState", {})
        .get("renderDebug", {})
        .get("visualParityReadiness", {})
    )
    dom = web.get("domState", {})
    web_checks = {
        "recorded": web.get("status") == "recorded-single-deterministic-playback",
        "deterministic": web.get("mp4DeterministicCapture") is True,
        "singleTrigger": web.get("triggerCount") == 1,
        "loopDisabled": web.get("loop") is False,
        "diagnosticsDisabled": web.get("diagnosticHarness") is False,
        "frameCount": web.get("mp4FrameCount") == 72,
        "fps": web.get("mp4Fps") == 12,
        "duration": web.get("mp4DurationMs") == 6000,
        "captureArmed": web.get("captureArmedBeforePlayback") is True,
        "playbackHook": web.get("playbackHookCalled") is True,
        "baselineObservabilityVersion": active_report.get("version")
        == "aurora-vfx-runtime-observability/v1",
        "finalObservabilityVersion": final_report.get("version")
        == "aurora-vfx-runtime-observability/v1",
        "baselineGate": baseline_gate.get("status") == "pass"
        and baseline_gate.get("blockerManifest") == [],
        "finalGate": final_gate.get("status") == "pass"
        and final_gate.get("blockerManifest") == [],
        "identity": identity.get("status") == "ready"
        and frontend_identity.get("commit") == backend_identity.get("commit")
        and frontend_identity.get("builtAt") == backend_identity.get("builtAt"),
        "baselineOverlay": active_overlay.get("enabled") is False
        and active_overlay.get("finalProfileDisabled") is True,
        "finalOverlay": final_overlay.get("enabled") is False
        and final_overlay.get("finalProfileDisabled") is True,
        "hostGraph": final_report.get("hostGraph", {}).get("status") == "pass",
        "assets": final_report.get("assetSettlement", {}).get("status") == "settled",
        "drawLedger": final_report.get("drawLedger", {}).get("status") == "pass",
        "playbackGuard": playback.get("status") == "pass",
        "playbackTrigger": playback.get("triggerCount") == 1,
        "playbackNoOverlap": playback.get("overlapCount") == 0,
        "playbackCompleted": playback.get("completed") is True,
        "postHidden": playback.get("postDurationHidden") is True,
        "finalPost": dom.get("phase") == "post" and dom.get("drawParticles") == 0,
        "visualReadinessDiagnosticOnly": visual_readiness.get("status")
        == "diagnostic-only",
        "visualReadinessBlockers": set(visual_readiness.get("blockerManifest", []))
        == {
            "camera-match-unproven",
            "scene-match-unproven",
            "owner-target-match-unproven",
        },
    }
    failed_web_checks = [name for name, passed in web_checks.items() if not passed]
    if failed_web_checks:
        raise RuntimeError(
            "Aurora Web proof validation failed: " + ", ".join(failed_web_checks)
        )

    scene = fixture.get("proofScene", {})
    source_module = scene.get("sourceModule", {})
    source_area = scene.get("sourceArea", {})
    coverage = scene.get("coverage", {})
    actors = scene.get("actors", [])
    projectile = fixture.get("proofLifecycle", {}).get("progFxType10Projectile", {})
    runtime_emitters = payload.get("contracts", {}).get("runtimeEmitters", [])
    owner_frames = (
        runtime_emitters[0].get("runtimeFrames", []) if runtime_emitters else []
    )
    first_owner_transform = (
        owner_frames[0].get("sourceOwnerTransform", {})
        if owner_frames
        else {}
    )
    endpoint_owner_frame = next(
        (
            frame
            for frame in owner_frames
            if frame.get("timeSeconds") == NATIVE_OWNER_DURATION_SECONDS
        ),
        {},
    )
    post_endpoint_owner_frame = next(
        (
            frame
            for frame in owner_frames
            if float(frame.get("timeSeconds", 0)) > NATIVE_OWNER_DURATION_SECONDS
        ),
        {},
    )
    endpoint_owner_transform = endpoint_owner_frame.get("sourceOwnerTransform", {})
    post_endpoint_owner_transform = post_endpoint_owner_frame.get(
        "sourceOwnerTransform", {}
    )
    fixture_checks = {
        "fixture": fixture.get("fixtureId") == "vfx-broad-row181",
        "scene": scene.get("status")
        == "source-backed-exact-row181-module-area-source-target-actor",
        "module": source_module.get("sha256")
        == "4ed1a443d4382e0e2b6de58a89b2d1da1376e0dc58b475238b1bd4603e2f42a4",
        "are": source_area.get("areSha256")
        == "f2e52a1f014ff5e9b4eab6998dad0b1ddc3d9b17e44bd7e717a16bf83c056061",
        "git": source_area.get("gitSha256")
        == "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6",
        "tiles": coverage.get("admittedTileCount") == 4
        and coverage.get("unresolvedTileCount") == 0,
        "targetActor": len(actors) == 1
        and actors[0].get("sourceModel") == "c_yinnkeep"
        and actors[0].get("normalizedPosition") == [0, 3, 0],
        "source": projectile.get("sourcePosition") == {"x": 0, "y": 0, "z": 0},
        "target": projectile.get("targetPosition") == {"x": 0, "y": 3, "z": 0},
        "provenance": projectile.get("provenance") == "retail-client-disassembly",
        "noSyntheticRandomUnit": "randomUnit" not in projectile,
        "ownerDuration": first_owner_transform.get("durationSeconds")
        == NATIVE_OWNER_DURATION_SECONDS,
        "ownerProofStatus": first_owner_transform.get("proofStatus")
        == "retail-client-disassembly-backed-type10-path4-log-distance",
        "ownerEndpoint": endpoint_owner_transform.get("position") == [0, 3, 0]
        and endpoint_owner_transform.get("progress") == 1,
        "ownerPostEndpoint": post_endpoint_owner_transform.get("position")
        == [0, 3, 0]
        and post_endpoint_owner_transform.get("progress") == 1
        and post_endpoint_owner_transform.get("active") is False,
    }
    failed_fixture_checks = [
        name for name, passed in fixture_checks.items() if not passed
    ]
    if failed_fixture_checks:
        raise RuntimeError(
            "Row181 fixture validation failed: "
            + ", ".join(failed_fixture_checks)
        )
    return nwn, web, fixture, payload, {
        "captureSummary": nwn_capture,
        "preflight": nwn_preflight,
        "triggerLedger": nwn_ledger,
        "chainChecks": nwn_chain_checks,
        "visualReadiness": visual_readiness,
        "endpointOwnerFrame": endpoint_owner_frame,
        "postEndpointOwnerFrame": post_endpoint_owner_frame,
    }


def create_header() -> None:
    HEADER.parent.mkdir(parents=True, exist_ok=True)
    image = Image.new("RGB", HEADER_SIZE, "#171d21")
    draw = ImageDraw.Draw(image)
    draw.text(
        (18, 9),
        "row181 | VFX_IMP_MIRV | one fire-and-forget trigger",
        fill="#f7f9fa",
        font=load_font(23, bold=True),
    )
    draw.text(
        (18, 51),
        "NWN retail oracle (saved approved MP4)",
        fill="#ffffff",
        font=load_font(17, bold=True),
    )
    draw.text(
        (658, 51),
        "Aurora Web (fresh source scene + source-centered camera)",
        fill="#ffffff",
        font=load_font(17, bold=True),
    )
    draw.line((640, 42, 640, 88), fill="#55636d", width=2)
    image.save(HEADER, optimize=True)


def create_comparison_video(
    nwn_start_seconds: float,
    web_start_seconds: float,
    duration_seconds: float,
) -> None:
    create_header()
    filter_graph = (
        f"[0:v]fps={FPS},setsar=1,scale={PANEL_SIZE[0]}:{PANEL_SIZE[1]}:"
        "force_original_aspect_ratio=decrease,"
        f"pad={PANEL_SIZE[0]}:{PANEL_SIZE[1]}:(ow-iw)/2:(oh-ih)/2:"
        "color=0x090b0c[left];"
        f"[1:v]fps={FPS},setsar=1,scale={PANEL_SIZE[0]}:{PANEL_SIZE[1]}:"
        "force_original_aspect_ratio=decrease,"
        f"pad={PANEL_SIZE[0]}:{PANEL_SIZE[1]}:(ow-iw)/2:(oh-ih)/2:"
        "color=0x090b0c[right];"
        "[left][right]hstack=inputs=2[body];"
        f"[2:v]fps={FPS},scale={HEADER_SIZE[0]}:{HEADER_SIZE[1]}[header];"
        "[header][body]vstack=inputs=2[out]"
    )
    command = [
        str(FFMPEG_PATH),
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        f"{nwn_start_seconds:.9f}",
        "-i",
        str(NWN_VIDEO),
        "-ss",
        f"{web_start_seconds:.9f}",
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
        f"{duration_seconds:.9f}",
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


def read_frame(elapsed_seconds: float) -> tuple[Image.Image, int, float]:
    capture = cv2.VideoCapture(str(OUTPUT_VIDEO))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open comparison: {OUTPUT_VIDEO}")
    capture.set(cv2.CAP_PROP_POS_MSEC, elapsed_seconds * 1000)
    ok, frame = capture.read()
    frame_index = max(0, int(round(capture.get(cv2.CAP_PROP_POS_FRAMES))) - 1)
    actual_seconds = frame_index / FPS
    capture.release()
    if not ok:
        raise RuntimeError(f"Cannot read comparison at {elapsed_seconds:.3f}s")
    return (
        Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)),
        frame_index,
        actual_seconds,
    )


def create_contact_sheet() -> list[dict[str, float | int | str]]:
    samples = [
        ("baseline", 1.0),
        ("threshold-visible onset", 2.0),
        ("visible window +0.12 s", 2.12),
        ("visible window +0.24 s", 2.24),
        ("visible window +0.36 s", 2.36),
        ("diagnostic tail", 2.5),
        ("post", 4.0),
        ("terminal post", 5.5),
    ]
    thumb_size = (640, 318)
    caption_height = 34
    sheet = Image.new(
        "RGB",
        (thumb_size[0] * 2, 4 * (thumb_size[1] + caption_height)),
        "#101417",
    )
    draw = ImageDraw.Draw(sheet)
    records: list[dict[str, float | int | str]] = []
    for index, (label, seconds) in enumerate(samples):
        frame, frame_index, actual_seconds = read_frame(seconds)
        frame.thumbnail(thumb_size, Image.Resampling.LANCZOS)
        x = (index % 2) * thumb_size[0]
        y = (index // 2) * (thumb_size[1] + caption_height)
        draw.text(
            (x + 14, y + 7),
            f"{label} | output t={actual_seconds:.3f} s",
            fill="#e9eef1",
            font=load_font(16, bold=True),
        )
        sheet.paste(frame, (x, y + caption_height))
        records.append(
            {
                "label": label,
                "requestedComparisonSeconds": seconds,
                "outputFrameIndex": frame_index,
                "actualComparisonSeconds": actual_seconds,
            }
        )
    sheet.save(CONTACT_SHEET, optimize=True)
    return records


def main() -> None:
    if not FFMPEG_PATH.exists():
        raise RuntimeError(f"ffmpeg is missing: {FFMPEG_PATH}")
    if OUTPUT_VIDEO.exists() and OUTPUT_VIDEO.stat().st_size == 0:
        OUTPUT_VIDEO.unlink()
    immutable_outputs = [OUTPUT_VIDEO, CONTACT_SHEET, MANIFEST, BLOCKER_MANIFEST]
    if any(path.exists() for path in immutable_outputs):
        raise RuntimeError("Row181 comparison already exists; reuse it instead of regenerating.")
    nwn, web, fixture, payload, validation = validate_inputs()
    nwn_visible_onset = float(nwn["lifecycle"]["onsetVideoSeconds"])
    timeline = web.get("finalProofState", {}).get("timeline", [])
    web_visible_sample = next(
        (
            sample
            for sample in timeline
            if isinstance(sample, dict)
            and float(sample.get("wallSeconds", 0)) >= 2.0
            and (
                int(sample.get("drawParticles") or 0) > 0
                or int(sample.get("sourceLightCount") or 0) > 0
            )
        ),
        None,
    )
    if web_visible_sample is None:
        raise RuntimeError("Aurora Web proof has no visible draw/light timeline sample.")
    web_visible_onset = float(web_visible_sample["wallSeconds"])
    nwn_start = nwn_visible_onset - COMPARISON_VISIBLE_ONSET_SECONDS
    web_start = web_visible_onset - COMPARISON_VISIBLE_ONSET_SECONDS
    if min(nwn_start, web_start) < 0:
        raise RuntimeError("A source video has insufficient pre-roll.")
    comparison_duration = min(
        probe_video(NWN_VIDEO)["durationSeconds"] - nwn_start,
        probe_video(WEB_VIDEO)["durationSeconds"] - web_start,
    )
    if comparison_duration < 5.5:
        raise RuntimeError("Aligned comparison window is unexpectedly short.")

    COMPARISON_ROOT.mkdir(parents=True, exist_ok=True)
    create_comparison_video(nwn_start, web_start, comparison_duration)
    output_probe = probe_video(OUTPUT_VIDEO)
    expected_frame_count = round(comparison_duration * FPS)
    if (
        (output_probe["width"], output_probe["height"]) != OUTPUT_SIZE
        or output_probe["frameCount"] != expected_frame_count
    ):
        raise RuntimeError(f"Unexpected comparison encoding: {output_probe}")
    samples = create_contact_sheet()

    final_report = web["finalProofState"]["runtimeObservability"]
    manifest = {
        "version": "aurora-vfx-row181-comparison/v3",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "diagnostic-only-open-camera-scene-owner-target-and-temporal-alignment",
        "fixtureId": "vfx-broad-row181",
        "sourceRowId": 181,
        "label": "VFX_IMP_MIRV",
        "policy": {
            "auroraFirst": True,
            "nwnRecordingReusedWithoutRerun": True,
            "auroraWebAcceptedPlaybackCount": 1,
            "comparisonDoesNotRetriggerEitherRuntime": True,
            "xoreosUsed": False,
        },
        "alignment": {
            "strategy": "diagnostic threshold-visible alignment only; the saved NWN capture has no hash-bound trigger-to-video PTS or projectile endpoint tracker",
            "comparisonVisibleOnsetSeconds": COMPARISON_VISIBLE_ONSET_SECONDS,
            "nwnSourceVisibleOnsetSeconds": nwn_visible_onset,
            "nwnSourceStartSeconds": nwn_start,
            "nwnSourceFramePeriodSeconds": 1 / float(nwn["lifecycle"]["fps"]),
            "nwnMetric": nwn["lifecycle"]["metric"],
            "auroraWebSourceVisibleSampleSeconds": web_visible_onset,
            "auroraWebSourceStartSeconds": web_start,
            "auroraWebSourceFramePeriodSeconds": 1 / float(web["mp4Fps"]),
            "auroraWebFirstVisibleTimelineSample": web_visible_sample,
            "temporalParityVerdict": "not-proven",
            "ownerEndpointParityVerdict": "not-proven",
            "uncertainty": "At least one source frame in each input, plus threshold/alpha/luminance dependence; comparison output resampling does not add timing evidence.",
            "durationSeconds": comparison_duration,
            "samples": samples,
        },
        "nwn": {
            "video": media_record(NWN_VIDEO),
            "validatedSummary": media_record(NWN_SUMMARY),
            "captureSummary": media_record(NWN_CAPTURE_SUMMARY),
            "preflight": media_record(NWN_PREFLIGHT),
            "triggerLedger": media_record(NWN_TRIGGER_LEDGER),
            "triggerScript": media_record(NWN_TRIGGER_SCRIPT),
            "entryScript": media_record(NWN_ENTRY_SCRIPT),
            "probe": probe_video(NWN_VIDEO),
            "oracleStatus": nwn["status"],
            "runId": nwn["runId"],
            "chainChecks": validation["chainChecks"],
        },
        "auroraWeb": {
            "video": media_record(WEB_VIDEO),
            "summary": media_record(WEB_SUMMARY),
            "fixtureManifest": media_record(FIXTURE_MANIFEST),
            "fixturePayload": media_record(FIXTURE_PAYLOAD),
            "probe": probe_video(WEB_VIDEO),
            "runtimeIdentity": final_report["identity"],
            "proofGate": final_report["proofGate"],
            "playbackGuard": final_report["playbackGuard"],
            "debugOverlay": final_report["debugOverlay"],
            "visualParityReadiness": validation["visualReadiness"],
            "proofSceneStatus": fixture["proofScene"]["status"],
            "ownerStartFrame": payload["contracts"]["runtimeEmitters"][0][
                "runtimeFrames"
            ][0],
            "ownerEndpointFrame": validation["endpointOwnerFrame"],
            "ownerPostEndpointFrame": validation["postEndpointOwnerFrame"],
        },
        "auroraReverseEvidence": {
            "type10TimingAudit": media_record(TYPE10_AUDIT),
            "formula": "speed = 1.5 + 3 * logf(distance); durationMs = trunc(distance / speed * 1000)",
            "distanceMetres": 3.0,
            "durationMilliseconds": 625,
            "implementationVerdict": "source-closed independently of this video's temporal alignment",
        },
        "generatorEnvironment": {
            "generator": media_record(Path(__file__).resolve()),
            "ffmpeg": media_record(FFMPEG_PATH),
            "opencvVersion": cv2.__version__,
            "pillowVersion": PIL.__version__,
            "normalFont": media_record(Path("C:/Windows/Fonts/arial.ttf")),
            "boldFont": media_record(Path("C:/Windows/Fonts/arialbd.ttf")),
            "header": media_record(HEADER),
        },
        "comparison": {
            "video": media_record(OUTPUT_VIDEO),
            "contactSheet": media_record(CONTACT_SHEET),
            "probe": output_probe,
            "layout": "NWN left; Aurora Web right",
        },
        "boundContextFacts": [
            "one intentional fire-and-forget trigger in each runtime",
            "saved NWN run, module, scripts, trigger ledger, summary, and MP4 share one validated run identity",
            "Web fixture source and target are separated by three Aurora metres",
            "all four Web Area tiles resolve through the exact q_tilesets.hak scene pack",
            "Web target actor is nw_innkeeper/c_yinnkeep in pause1",
            "clean Aurora Web post-roll with zero drawn particles",
            "Web implementation records the disassembly-backed Type10 path-4 owner duration of 625 ms",
        ],
        "openParityGaps": [
            "The saved NWN recording has no hash-bound trigger or owner-endpoint PTS; temporal and endpoint parity are not proven.",
            "Aurora Web reports camera-match-unproven, scene-match-unproven, and owner-target-match-unproven.",
            "The exact source player appearance is not reconstructed.",
            "The Web camera is a saved-frame longitudinal fit, not the recovered internal Aurora camera matrix.",
            "Particle silhouette, alpha, luminance, light, bloom, trajectory cadence, and decay require review of this fresh comparison.",
        ],
        "rejectedAsProof": [
            {
                "artifactStem": "nwn-vs-aurora-web-row181-source-scene-camera-visual-onset-aligned-v2-20260813",
                "reason": "Visibility-threshold alignment is diagnostic only and cannot prove trajectory time.",
            },
            {
                "artifactStem": "nwn-vs-aurora-web-row181-log-distance-owner-endpoint-aligned-v3-20260813",
                "reason": "It treated lastVisibleVideoSeconds as an owner destination PTS although the validator measures only a global pixel threshold.",
            },
        ],
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")
    print(
        json.dumps(
            {
                "status": manifest["status"],
                "nwnReused": True,
                "auroraWebAcceptedPlaybackCount": 1,
                "proofGate": final_report["proofGate"]["status"],
                "comparison": media_record(OUTPUT_VIDEO),
                "contactSheet": media_record(CONTACT_SHEET),
                "manifest": media_record(MANIFEST),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    owned_paths = [OUTPUT_VIDEO, CONTACT_SHEET, MANIFEST, HEADER]
    preexisting = {path: path.exists() for path in owned_paths}
    try:
        main()
    except Exception as error:
        for path in owned_paths:
            if not preexisting[path] and path.exists():
                path.unlink()
        if not BLOCKER_MANIFEST.exists() and not any(preexisting.values()):
            BLOCKER_MANIFEST.parent.mkdir(parents=True, exist_ok=True)
            BLOCKER_MANIFEST.write_text(
                json.dumps(
                    {
                        "version": "aurora-vfx-row181-comparison-blocker/v1",
                        "createdAt": datetime.now(timezone.utc).isoformat(),
                        "status": "failed",
                        "outputStem": OUTPUT_STEM,
                        "failedGate": type(error).__name__,
                        "message": str(error),
                        "resumeCondition": "Correct the failed validation and use a new immutable output stem.",
                    },
                    indent=2,
                )
                + "\n",
                encoding="ascii",
            )
        raise
