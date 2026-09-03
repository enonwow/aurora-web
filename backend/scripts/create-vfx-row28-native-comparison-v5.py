from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[2]
ROW_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-web-row28"
)
NWN_VIDEO = ROW_ROOT / "nwn-runtime" / "v1" / "capture" / "nwn-row28-meteor-swarm-one-trigger-v8.mp4"
NWN_SUMMARY = ROW_ROOT / "nwn-final" / "v1" / "validated-summary.json"
FFMPEG_DEFAULT = Path(
    r"C:\Users\enonw\Documents\Codex\2026-05-17\umiesz-tworzy-filmiki"
    r"\vendor\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
)
NATIVE_HASHES = {
    NWN_VIDEO: "bdddeb001cf59bb2d6476909adc3b1d022674b06b59749f39fc11fc290dc31de",
    NWN_SUMMARY: "edefa3849244012132be29e6bb3e2cb99751a2bb2c19c237275fa0fc9adda529",
}
RELATIVE_SAMPLES = [-0.5, 0.0, 0.5, 1.0, 4.0 / 3.0, 5.0 / 3.0, 2.0, 3.0, 3.5]
PANEL = (640, 360)
HEADER_HEIGHT = 98
NWN_TRIGGER_VIDEO_SECONDS = 49.0 / 12.0
WEB_TRIGGER_VIDEO_SECONDS = 2.0


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def media(path: Path) -> dict[str, object]:
    return {
        "path": path.relative_to(REPO_ROOT).as_posix(),
        "sizeBytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def font(size: int, bold: bool = False):
    path = Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def panel(image: Image.Image) -> Image.Image:
    fitted = ImageOps.contain(image.convert("RGB"), PANEL, Image.Resampling.LANCZOS)
    result = Image.new("RGB", PANEL, "#111315")
    result.paste(fitted, ((PANEL[0] - fitted.width) // 2, (PANEL[1] - fitted.height) // 2))
    return result


def run_ffmpeg(ffmpeg: Path, args: list[str]) -> None:
    result = subprocess.run(
        [str(ffmpeg), "-hide_banner", "-loglevel", "error", *args],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"row28_v5_ffmpeg_failed:{result.stderr[-1600:]}")


def read_frame(ffmpeg: Path, path: Path, seconds: float, temp_root: Path, name: str) -> Image.Image:
    target = temp_root / f"{name}.png"
    run_ffmpeg(
        ffmpeg,
        ["-ss", f"{seconds:.9f}", "-i", str(path), "-frames:v", "1", "-y", str(target)],
    )
    if not target.is_file():
        raise RuntimeError(f"row28_v5_comparison_frame_missing:{path.name}:{seconds}")
    with Image.open(target) as source:
        return source.convert("RGB")


def validate_inputs(args: argparse.Namespace) -> tuple[Path, Path, Path, dict[str, object]]:
    for path, expected_hash in NATIVE_HASHES.items():
        if not path.is_file() or sha256(path) != expected_hash:
            raise RuntimeError(f"row28_native_input_binding_mismatch:{path}")
    web_root = Path(args.web_root)
    if not web_root.is_absolute():
        web_root = REPO_ROOT / web_root
    stem = f"aurora-web-row28-one-trigger-{args.capture_tag}"
    web_video = web_root / f"{stem}.mp4"
    web_summary = web_root / f"{stem}-summary.json"
    web_validation = web_root / f"{stem}-visual-validation.json"
    for path, expected_hash in (
        (web_video, args.web_video_sha256),
        (web_summary, args.web_summary_sha256),
        (web_validation, args.web_validation_sha256),
    ):
        if not path.is_file() or len(expected_hash) != 64 or sha256(path) != expected_hash.lower():
            raise RuntimeError(f"row28_web_v5_input_binding_mismatch:{path}")
    summary = json.loads(web_summary.read_text(encoding="utf-8"))
    validation = json.loads(web_validation.read_text(encoding="utf-8"))
    if not (
        summary.get("status") == "recorded-single-deterministic-playback"
        and summary.get("triggerCount") == 1
        and summary.get("loop") is False
        and validation.get("status")
        == "pass-automated-source-clock-visual-anchor-and-runtime-gates"
        and validation.get("visualClassificationRequired") is True
        and validation.get("runtimeProof", {}).get("triggerCount") == 1
        and validation.get("runtimeProof", {}).get("overlapCount") == 0
        and validation.get("runtimeProof", {}).get("completed") is True
        and validation.get("runtimeProof", {}).get("postDurationHidden") is True
    ):
        raise RuntimeError("row28_web_v5_proof_not_accepted_for_comparison")
    return web_video, web_summary, web_validation, validation


def make_header(path: Path, capture_tag: str) -> None:
    image = Image.new("RGB", (1280, HEADER_HEIGHT), "#1d252b")
    draw = ImageDraw.Draw(image)
    draw.text(
        (18, 9),
        "row28 | VFX_FNF_METEOR_SWARM | trigger-aligned 12 fps",
        fill="#f7f9fa",
        font=font(24, True),
    )
    draw.text((18, 53), "NWN native retail oracle", fill="#ffffff", font=font(18, True))
    draw.text((658, 53), f"Aurora Web {capture_tag}", fill="#ffffff", font=font(18, True))
    draw.text(
        (658, 76),
        "UNCLASSIFIED AUTOMATED COMPARISON; frame review required",
        fill="#f4c96b",
        font=font(13),
    )
    draw.line((640, 45, 640, 96), fill="#55636d", width=2)
    image.save(path, optimize=True)


def create_contact_sheet(
    ffmpeg: Path, path: Path, web_video: Path, capture_tag: str
) -> list[dict[str, object]]:
    row_height = 34 + PANEL[1]
    canvas = Image.new("RGB", (1280, 118 + row_height * len(RELATIVE_SAMPLES)), "#101417")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1280, 118), fill="#1d252b")
    draw.text(
        (18, 9),
        "row28 | native NWN vs Aurora Web | same time after trigger",
        fill="#f7f9fa",
        font=font(25, True),
    )
    draw.text(
        (18, 51),
        "Left: accepted NWN retail oracle | Right: fresh validated Web proof",
        fill="#ffffff",
        font=font(17, True),
    )
    draw.text(
        (18, 82),
        "Timeline is trigger-aligned, not independently onset-shifted.",
        fill="#c6d0d7",
        font=font(16),
    )
    rows: list[dict[str, object]] = []
    with tempfile.TemporaryDirectory(prefix="aurora-row28-compare-") as temp:
        temp_root = Path(temp)
        for index, relative in enumerate(RELATIVE_SAMPLES):
            nwn_time = NWN_TRIGGER_VIDEO_SECONDS + relative
            web_time = WEB_TRIGGER_VIDEO_SECONDS + relative
            left = panel(read_frame(ffmpeg, NWN_VIDEO, nwn_time, temp_root, f"nwn-{index}"))
            right = panel(read_frame(ffmpeg, web_video, web_time, temp_root, f"web-{index}"))
            y = 118 + index * row_height
            draw.rectangle((0, y, 1280, y + 34), fill="#171d22")
            draw.text(
                (18, y + 8),
                f"trigger {relative:+.3f}s | NWN video {nwn_time:.3f}s",
                fill="#c6d0d7",
                font=font(15, True),
            )
            draw.text(
                (658, y + 8),
                f"trigger {relative:+.3f}s | Web video {web_time:.3f}s",
                fill="#c6d0d7",
                font=font(15, True),
            )
            canvas.paste(left, (0, y + 34))
            canvas.paste(right, (640, y + 34))
            rows.append(
                {
                    "triggerRelativeSeconds": relative,
                    "nwnVideoSeconds": nwn_time,
                    "webVideoSeconds": web_time,
                }
            )
    canvas.save(path, optimize=True)
    return rows


def create_video(ffmpeg: Path, path: Path, header: Path, web_video: Path) -> None:
    relative_start = -0.5
    duration = 4.0
    run_ffmpeg(
        ffmpeg,
        [
            "-y",
            "-ss",
            f"{NWN_TRIGGER_VIDEO_SECONDS + relative_start:.6f}",
            "-i",
            str(NWN_VIDEO),
            "-ss",
            f"{WEB_TRIGGER_VIDEO_SECONDS + relative_start:.6f}",
            "-i",
            str(web_video),
            "-loop",
            "1",
            "-framerate",
            "12",
            "-i",
            str(header),
            "-filter_complex",
            "[0:v]fps=12,scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[left];"
            "[1:v]fps=12,scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[right];"
            "[left][right]hstack=inputs=2[body];[2:v]fps=12,scale=1280:98,setsar=1[header];[header][body]vstack=inputs=2[out]",
            "-map",
            "[out]",
            "-t",
            f"{duration:.3f}",
            "-an",
            "-r",
            "12",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "18",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(path),
        ],
    )


def create(args: argparse.Namespace) -> dict[str, object]:
    ffmpeg = Path(args.ffmpeg)
    if not ffmpeg.is_file():
        raise RuntimeError(f"row28_v5_ffmpeg_missing:{ffmpeg}")
    web_video, web_summary, web_validation, validation = validate_inputs(args)
    output_root = Path(args.output_root)
    if not output_root.is_absolute():
        output_root = REPO_ROOT / output_root
    if output_root.exists():
        raise RuntimeError(f"immutable_row28_v5_comparison_exists:{output_root}")
    if re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,63}", args.capture_tag) is None:
        raise RuntimeError(f"row28_comparison_invalid_capture_tag:{args.capture_tag}")
    output_root.mkdir(parents=True, exist_ok=False)
    artifact_label = args.capture_tag
    header = output_root / f"row28-{artifact_label}-comparison-header.png"
    contact = output_root / f"row28-nwn-vs-web-{artifact_label}-trigger-aligned-contact-sheet.png"
    video = output_root / f"nwn-vs-aurora-web-row28-trigger-aligned-{artifact_label}.mp4"
    make_header(header, args.capture_tag)
    samples = create_contact_sheet(ffmpeg, contact, web_video, args.capture_tag)
    create_video(ffmpeg, video, header, web_video)
    manifest = {
        "version": "aurora-vfx-row28-native-comparison/v6",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": "vfx-nwn-web-row28",
        "sourceRowId": 28,
        "publicConstant": "VFX_FNF_METEOR_SWARM",
        "alignment": {
            "kind": "retail-client-rate-backed-source-event-trigger-alignment-no-independent-onset-shift",
            "nwnTriggerVideoSeconds": NWN_TRIGGER_VIDEO_SECONDS,
            "webTriggerVideoSeconds": WEB_TRIGGER_VIDEO_SECONDS,
            "samples": samples,
        },
        "verdict": {
            "status": "requires-human-frame-classification",
            "parity": None,
            "exactPixelIdentityClaimed": False,
            "visualClassificationRequired": True,
            "nativeComparison": validation["nativeComparison"],
            "limitations": [
                "The native and Web cameras share the accepted viewport and calibrated framing but are not an exact engine pixel pipeline match.",
                "Camera shake remains unmapped in Web and is excluded from the VFX appearance/timing verdict.",
                "The automated gates must pass before this comparison can be created.",
                "The MP4 and frame sheet still require an explicit good/close/bad visual classification.",
            ],
        },
        "inputs": [
            media(NWN_VIDEO),
            media(NWN_SUMMARY),
            media(web_video),
            media(web_summary),
            media(web_validation),
        ],
        "outputs": {
            "video": media(video),
            "contactSheet": media(contact),
            "header": media(header),
        },
    }
    manifest_path = output_root / f"comparison-manifest-{artifact_label}.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return {
        "ok": True,
        "status": "created-unclassified-trigger-aligned-row28-comparison",
        "video": media(video),
        "contactSheet": media(contact),
        "manifest": media(manifest_path),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["dry-run", "create"])
    parser.add_argument("--web-root", default=str(ROW_ROOT / "web-v5b"))
    parser.add_argument("--capture-tag", default="v5b")
    parser.add_argument("--output-root", default=str(ROW_ROOT / "comparison-v5"))
    parser.add_argument("--web-video-sha256", default="")
    parser.add_argument("--web-summary-sha256", default="")
    parser.add_argument("--web-validation-sha256", default="")
    parser.add_argument("--ffmpeg", default=str(FFMPEG_DEFAULT))
    args = parser.parse_args()
    if args.command == "dry-run":
        result = {
            "ok": True,
            "status": "row28_v5_native_comparison_plan_valid",
            "alignment": "same-trigger-relative-time-no-independent-onset-shift",
            "outputFps": 12,
            "outputSize": [1280, 458],
            "startsNwn": False,
            "startsWebRuntime": False,
            "requiresAcceptedWebV6Validation": True,
            "requiresExplicitInputHashes": True,
        }
    else:
        if not (
            args.web_video_sha256
            and args.web_summary_sha256
            and args.web_validation_sha256
        ):
            raise RuntimeError("row28_v5_comparison_requires_explicit_web_input_hashes")
        result = create(args)
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
