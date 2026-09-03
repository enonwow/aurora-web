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
    / "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1"
)
NWN_VIDEO = ROW_ROOT / "nwn/nwn-row1-one-trigger.mp4"
NWN_SUMMARY = ROW_ROOT / "nwn/validated-summary.json"
WEB_ROOT = ROW_ROOT / "aurora-web"
WEB_STEM = "aurora-web-row1-one-trigger-integer-owner-v2-20260813"
WEB_VIDEO = WEB_ROOT / f"{WEB_STEM}.mp4"
WEB_SUMMARY = WEB_ROOT / f"{WEB_STEM}-summary.json"
OUTPUT_ROOT = ROW_ROOT / "comparisons"
OUTPUT_STEM = "nwn-vs-aurora-web-row1-integer-owner-v2-diagnostic-20260813"
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

EXPECTED_NWN_SHA256 = "9cdc57cf5f559f58f019994e9680266d64b2b2e527b6fea395710b2b4fdb78c7"
EXPECTED_WEB_SHA256 = "d67cf6c092c330b7b73dc8b589599e181f8400ad371a77dba5ed13782ed011d8"
EXPECTED_WEB_SUMMARY_SHA256 = (
    "58fb85695eaac92c3efa42bcbdc4c2893b85b65e412389754e31f0f2b06dec9e"
)
FPS = 8
WEB_ONSET_SECONDS = 2.0
COMPARISON_DURATION_SECONDS = 27.625


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
    font_path = Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")
    return (
        ImageFont.truetype(str(font_path), size)
        if font_path.exists()
        else ImageFont.load_default()
    )


def probe_video(file_path: Path) -> dict[str, float | int]:
    capture = cv2.VideoCapture(str(file_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video: {file_path}")
    result: dict[str, float | int] = {
        "fps": float(capture.get(cv2.CAP_PROP_FPS)),
        "frameCount": int(capture.get(cv2.CAP_PROP_FRAME_COUNT)),
        "width": int(capture.get(cv2.CAP_PROP_FRAME_WIDTH)),
        "height": int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT)),
    }
    capture.release()
    result["durationSeconds"] = float(result["frameCount"]) / float(result["fps"])
    return result


def timeline_at(timeline: list[dict[str, object]], effect_seconds: float) -> dict[str, object]:
    return min(
        timeline,
        key=lambda row: abs(float(row.get("effectSeconds", -1)) - effect_seconds),
    )


def validate_inputs() -> tuple[dict[str, object], dict[str, object], float]:
    if not FFMPEG_PATH.exists():
        raise RuntimeError(f"ffmpeg is missing: {FFMPEG_PATH}")
    if sha256(NWN_VIDEO) != EXPECTED_NWN_SHA256:
        raise RuntimeError("The immutable NWN row1 oracle hash changed.")
    if sha256(WEB_VIDEO) != EXPECTED_WEB_SHA256:
        raise RuntimeError("The fresh Aurora Web row1 proof hash changed.")
    if sha256(WEB_SUMMARY) != EXPECTED_WEB_SUMMARY_SHA256:
        raise RuntimeError("The fresh Aurora Web row1 summary hash changed.")

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
        raise RuntimeError("The NWN row1 oracle is not validated.")
    if not all(nwn.get("checks", {}).get(name) is True for name in required_nwn_checks):
        raise RuntimeError("The NWN row1 oracle checks are incomplete.")

    web = json.loads(WEB_SUMMARY.read_text(encoding="utf-8"))
    final_observability = web["finalProofState"]["runtimeObservability"]
    guard = final_observability["playbackGuard"]
    timeline = web["proofState"]["timeline"]
    stop = timeline_at(timeline, 20.0)
    owner_done = timeline_at(timeline, 20.625)
    release_complete = timeline_at(timeline, 23.625)
    checks = {
        "singlePlayback": web.get("triggerCount") == 1
        and web.get("loop") is False
        and web.get("playbackHookCalled") is True
        and guard.get("overlapCount") == 0,
        "proofGate": final_observability.get("proofGate")
        == {"status": "pass", "blockerManifest": []},
        "capture": web.get("mp4Fps") == FPS
        and web.get("mp4FrameCount") == 221
        and web.get("mp4DurationMs") == 27625,
        "stopSameFrameUpdate": stop.get("objectDurationVisualOwnerPhase") == "cessation"
        and stop.get("objectDurationVisualOwnerTimerRemainingMilliseconds") == 508
        and stop.get("objectDurationVisualOwnerRemovalProcessedAtMilliseconds") == 20000,
        "ownerDone": owner_done.get("objectDurationVisualOwnerPhase") == "released"
        and owner_done.get("objectDurationVisualOwnerActive") is False
        and owner_done.get("objectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds")
        == 2883,
        "releaseComplete": release_complete.get("objectDurationVisualOwnerPhase")
        == "released"
        and release_complete.get(
            "objectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds"
        )
        == 0
        and guard.get("completed") is True
        and guard.get("postDurationHidden") is True,
    }
    failed = [name for name, passed in checks.items() if not passed]
    if failed:
        raise RuntimeError(f"Aurora Web row1 proof validation failed: {', '.join(failed)}")

    nwn_onset = float(nwn["lifecycle"]["onsetVideoSeconds"])
    nwn_start = nwn_onset - WEB_ONSET_SECONDS
    nwn_probe = probe_video(NWN_VIDEO)
    if float(nwn_probe["durationSeconds"]) - nwn_start < COMPARISON_DURATION_SECONDS:
        raise RuntimeError("The saved NWN oracle is too short for the aligned comparison.")
    return nwn, web, nwn_start


def create_header() -> None:
    image = Image.new("RGB", (1280, 104), "#1d252b")
    draw = ImageDraw.Draw(image)
    draw.text(
        (18, 9),
        "row1 | VFX_DUR_DARKNESS | integer owner lifecycle v2",
        fill="#f7f9fa",
        font=load_font(23, bold=True),
    )
    draw.text(
        (18, 55),
        "NWN retail | saved one-trigger oracle",
        fill="#ffffff",
        font=load_font(17, bold=True),
    )
    draw.text(
        (658, 55),
        "Aurora Web | fresh one-trigger proof",
        fill="#ffffff",
        font=load_font(17, bold=True),
    )
    draw.text(
        (745, 15),
        "onset aligned; camera / scene / target remain open",
        fill="#f4c96b",
        font=load_font(15),
    )
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
        str(FFMPEG_PATH),
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        f"{nwn_start_seconds:.9f}",
        "-i",
        str(NWN_VIDEO),
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
        "22",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        str(OUTPUT_VIDEO),
    ]
    subprocess.run(command, check=True, cwd=REPO_ROOT)
    probe = probe_video(OUTPUT_VIDEO)
    expected_frames = round(COMPARISON_DURATION_SECONDS * FPS)
    if (probe["width"], probe["height"], probe["frameCount"]) != (
        1280,
        644,
        expected_frames,
    ):
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
    samples = (
        (2.125, "impact +0.125 s"),
        (10.0, "duration +8 s"),
        (21.875, "duration +19.875 s"),
        (22.5, "cessation +0.5 s"),
        (22.625, "owner released"),
        (25.625, "post timer complete"),
    )
    sheet = Image.new("RGB", (1280, 1090), "#101417")
    draw = ImageDraw.Draw(sheet)
    draw.text(
        (18, 12),
        "row1 | saved NWN vs fresh Aurora Web owner-v2 runtime",
        fill="#f7f9fa",
        font=load_font(25, bold=True),
    )
    draw.text(
        (18, 45),
        "Diagnostic samples. MP4 is authoritative; camera, scene and owner target are not canonical matches.",
        fill="#f4c96b",
        font=load_font(15),
    )
    for index, (seconds, label) in enumerate(samples):
        frame = read_frame(seconds).resize((640, 322), Image.Resampling.LANCZOS)
        x = (index % 2) * 640
        y = 86 + (index // 2) * 334
        sheet.paste(frame, (x, y))
        draw.rectangle((x, y, x + 245, y + 25), fill="#101417")
        draw.text(
            (x + 8, y + 4),
            f"t={seconds:.3f}s | {label}",
            fill="#ffffff",
            font=load_font(14, bold=True),
        )
    sheet.save(CONTACT_SHEET, optimize=True)


def write_manifest(
    nwn: dict[str, object], web: dict[str, object], nwn_start_seconds: float
) -> None:
    timeline = web["proofState"]["timeline"]
    manifest = {
        "version": "aurora-vfx-row1-object-duration-comparison/v2",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "diagnostic-only-open-camera-scene-owner-target",
        "sourceClass": {
            "nwn": "primary-retail-runtime-proof",
            "auroraWeb": "source-audited-implementation-proof",
        },
        "alignment": {
            "method": "validated-visible-onset",
            "nwnOnsetVideoSeconds": nwn["lifecycle"]["onsetVideoSeconds"],
            "auroraWebOnsetVideoSeconds": WEB_ONSET_SECONDS,
            "nwnTrimStartSeconds": nwn_start_seconds,
            "comparisonDurationSeconds": COMPARISON_DURATION_SECONDS,
            "fps": FPS,
        },
        "lifecycleChecks": {
            "effectDurationMilliseconds": 20000,
            "updateStepMilliseconds": 125,
            "removalProcessedAtMilliseconds": 20000,
            "ownerDoneAtMilliseconds": 20625,
            "releaseCompleteAtMilliseconds": 23625,
            "stopFrame": timeline_at(timeline, 20.0),
            "ownerDoneFrame": timeline_at(timeline, 20.625),
            "releaseCompleteFrame": timeline_at(timeline, 23.625),
        },
        "inputs": {
            "nwn": media_record(NWN_VIDEO),
            "nwnValidation": media_record(NWN_SUMMARY),
            "auroraWeb": media_record(WEB_VIDEO),
            "auroraWebSummary": media_record(WEB_SUMMARY),
        },
        "outputs": {
            "video": media_record(OUTPUT_VIDEO),
            "contactSheet": media_record(CONTACT_SHEET),
        },
        "checks": {
            "savedNwnOracleReused": True,
            "nwnRerun": False,
            "auroraWebSingleTrigger": True,
            "auroraWebOverlapCount": 0,
            "auroraWebProofGate": "pass",
            "onsetAligned": True,
            "exactCameraMatch": False,
            "exactSceneMatch": False,
            "exactOwnerTargetMatch": False,
        },
        "openGaps": [
            "The Web footprint is still flatter and more uniformly elliptical than the scene-integrated NWN darkness volume.",
            "The NWN proof contains the player character and a different camera framing; pixel parity is not claimed.",
            "Exact negative-light response and the remaining local tile-light mapping are not closed by this lifecycle proof.",
        ],
        "xoreosUsed": False,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="ascii")


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    nwn, web, nwn_start_seconds = validate_inputs()
    create_video(nwn_start_seconds)
    create_contact_sheet()
    write_manifest(nwn, web, nwn_start_seconds)
    print(
        json.dumps(
            {
                "status": "pass-diagnostic-only",
                "video": media_record(OUTPUT_VIDEO),
                "contactSheet": media_record(CONTACT_SHEET),
                "manifest": media_record(MANIFEST),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
