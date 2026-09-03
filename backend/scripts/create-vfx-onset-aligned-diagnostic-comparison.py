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
FFMPEG_DEFAULT = Path(
    r"C:\Users\enonw\Documents\Codex\2026-05-17\umiesz-tworzy-filmiki"
    r"\vendor\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
)
PANEL = (640, 360)
HEADER_HEIGHT = 104
SAMPLE_OFFSETS_SECONDS = [
    -0.5,
    -0.25,
    -1.0 / 6.0,
    -1.0 / 12.0,
    0.0,
    1.0 / 3.0,
    0.5,
    2.0 / 3.0,
    1.0,
    4.0 / 3.0,
    5.0 / 3.0,
    2.0,
    2.5,
    3.0,
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def media(path: Path) -> dict[str, object]:
    try:
        display_path = path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        display_path = str(path.resolve())
    return {
        "path": display_path,
        "sizeBytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def resolve_path(value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else REPO_ROOT / path


def load_font(size: int, *, bold: bool = False):
    path = Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def fit_panel(image: Image.Image) -> Image.Image:
    fitted = ImageOps.contain(image.convert("RGB"), PANEL, Image.Resampling.LANCZOS)
    result = Image.new("RGB", PANEL, "#111315")
    result.paste(
        fitted,
        ((PANEL[0] - fitted.width) // 2, (PANEL[1] - fitted.height) // 2),
    )
    return result


def run_ffmpeg(ffmpeg: Path, arguments: list[str]) -> None:
    result = subprocess.run(
        [str(ffmpeg), "-hide_banner", "-loglevel", "error", *arguments],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"onset_aligned_diagnostic_ffmpeg_failed:{result.stderr[-2000:]}"
        )


def read_frame(
    ffmpeg: Path,
    video: Path,
    seconds: float,
    temp_root: Path,
    name: str,
) -> Image.Image:
    target = temp_root / f"{name}.png"
    run_ffmpeg(
        ffmpeg,
        [
            "-i",
            str(video),
            "-ss",
            f"{seconds:.9f}",
            "-frames:v",
            "1",
            "-y",
            str(target),
        ],
    )
    if not target.is_file():
        raise RuntimeError(
            f"onset_aligned_diagnostic_frame_missing:{video.name}:{seconds}"
        )
    with Image.open(target) as source:
        return source.convert("RGB")


def validate_input_video(path: Path, expected_sha256: str, side: str) -> None:
    if not path.is_file():
        raise RuntimeError(f"onset_aligned_diagnostic_{side}_video_missing:{path}")
    if re.fullmatch(r"[0-9a-fA-F]{64}", expected_sha256) is None:
        raise RuntimeError(f"onset_aligned_diagnostic_{side}_sha256_invalid")
    actual_sha256 = sha256(path)
    if actual_sha256 != expected_sha256.lower():
        raise RuntimeError(
            f"onset_aligned_diagnostic_{side}_hash_mismatch:"
            f"actual={actual_sha256}:expected={expected_sha256.lower()}"
        )


def validate_arguments(args: argparse.Namespace) -> None:
    if args.left_onset_seconds < 0 or args.right_onset_seconds < 0:
        raise RuntimeError("onset_aligned_diagnostic_onset_must_be_non_negative")
    if args.pre_roll_seconds < 0 or args.post_roll_seconds <= 0:
        raise RuntimeError("onset_aligned_diagnostic_duration_invalid")
    if (
        args.left_onset_seconds < args.pre_roll_seconds
        or args.right_onset_seconds < args.pre_roll_seconds
    ):
        raise RuntimeError("onset_aligned_diagnostic_pre_roll_exceeds_onset")
    if args.fps <= 0 or args.fps > 60:
        raise RuntimeError("onset_aligned_diagnostic_fps_invalid")
    if re.fullmatch(r"[a-z0-9][a-z0-9._-]{0,95}", args.artifact_tag) is None:
        raise RuntimeError("onset_aligned_diagnostic_artifact_tag_invalid")


def make_header(path: Path, args: argparse.Namespace) -> None:
    image = Image.new("RGB", (1280, HEADER_HEIGHT), "#1d252b")
    draw = ImageDraw.Draw(image)
    draw.text(
        (18, 8),
        "First-visible-onset aligned VFX comparison",
        fill="#f7f9fa",
        font=load_font(24, bold=True),
    )
    draw.text((18, 48), args.left_label, fill="#ffffff", font=load_font(17, bold=True))
    draw.text((658, 48), args.right_label, fill="#ffffff", font=load_font(17, bold=True))
    draw.text(
        (18, 76),
        "DIAGNOSTIC: compares appearance after visible onset; not trigger-latency proof",
        fill="#f4c96b",
        font=load_font(14, bold=True),
    )
    draw.line((640, 43, 640, 102), fill="#55636d", width=2)
    image.save(path, optimize=True)


def create_contact_sheet(
    ffmpeg: Path,
    path: Path,
    left_video: Path,
    right_video: Path,
    args: argparse.Namespace,
) -> list[dict[str, object]]:
    samples = [
        offset
        for offset in SAMPLE_OFFSETS_SECONDS
        if -args.pre_roll_seconds <= offset <= args.post_roll_seconds
    ]
    row_height = 34 + PANEL[1]
    canvas = Image.new("RGB", (1280, 126 + row_height * len(samples)), "#101417")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1280, 126), fill="#1d252b")
    draw.text(
        (18, 8),
        "VFX comparison | same time after first visible onset",
        fill="#f7f9fa",
        font=load_font(24, bold=True),
    )
    draw.text(
        (18, 47),
        f"Left: {args.left_label} | Right: {args.right_label}",
        fill="#ffffff",
        font=load_font(16, bold=True),
    )
    draw.text(
        (18, 77),
        "Both visible onsets are placed at +0.000 s. Input-trigger latency is not compared.",
        fill="#c6d0d7",
        font=load_font(15),
    )
    draw.text(
        (18, 101),
        "DIAGNOSTIC / NOT ACCEPTED PARITY PROOF",
        fill="#f06b6b",
        font=load_font(14, bold=True),
    )

    rows: list[dict[str, object]] = []
    with tempfile.TemporaryDirectory(prefix="aurora-vfx-onset-compare-") as temp:
        temp_root = Path(temp)
        for index, relative in enumerate(samples):
            left_seconds = args.left_onset_seconds + relative
            right_seconds = args.right_onset_seconds + relative
            left = fit_panel(
                read_frame(
                    ffmpeg,
                    left_video,
                    left_seconds,
                    temp_root,
                    f"left-{index}",
                )
            )
            right = fit_panel(
                read_frame(
                    ffmpeg,
                    right_video,
                    right_seconds,
                    temp_root,
                    f"right-{index}",
                )
            )
            y = 126 + index * row_height
            draw.rectangle((0, y, 1280, y + 34), fill="#171d22")
            draw.text(
                (18, y + 8),
                f"onset {relative:+.3f}s | video {left_seconds:.3f}s",
                fill="#c6d0d7",
                font=load_font(15, bold=True),
            )
            draw.text(
                (658, y + 8),
                f"onset {relative:+.3f}s | video {right_seconds:.3f}s",
                fill="#c6d0d7",
                font=load_font(15, bold=True),
            )
            canvas.paste(left, (0, y + 34))
            canvas.paste(right, (640, y + 34))
            rows.append(
                {
                    "onsetRelativeSeconds": relative,
                    "leftVideoSeconds": left_seconds,
                    "rightVideoSeconds": right_seconds,
                }
            )
    canvas.save(path, optimize=True)
    return rows


def create_video(
    ffmpeg: Path,
    path: Path,
    header: Path,
    left_video: Path,
    right_video: Path,
    args: argparse.Namespace,
) -> None:
    left_start = args.left_onset_seconds - args.pre_roll_seconds
    right_start = args.right_onset_seconds - args.pre_roll_seconds
    duration = args.pre_roll_seconds + args.post_roll_seconds
    run_ffmpeg(
        ffmpeg,
        [
            "-y",
            "-i",
            str(left_video),
            "-i",
            str(right_video),
            "-loop",
            "1",
            "-framerate",
            str(args.fps),
            "-i",
            str(header),
            "-filter_complex",
            (
                f"[0:v]trim=start={left_start:.9f}:duration={duration:.9f},"
                f"setpts=PTS-STARTPTS,fps={args.fps},"
                "scale=640:360:force_original_aspect_ratio=decrease,"
                "pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[left];"
                f"[1:v]trim=start={right_start:.9f}:duration={duration:.9f},"
                f"setpts=PTS-STARTPTS,fps={args.fps},"
                "scale=640:360:force_original_aspect_ratio=decrease,"
                "pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[right];"
                "[left][right]hstack=inputs=2[body];"
                f"[2:v]fps={args.fps},scale=1280:{HEADER_HEIGHT},setsar=1[header];"
                "[header][body]vstack=inputs=2[out]"
            ),
            "-map",
            "[out]",
            "-t",
            f"{duration:.9f}",
            "-an",
            "-r",
            str(args.fps),
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
    validate_arguments(args)
    ffmpeg = resolve_path(args.ffmpeg)
    if not ffmpeg.is_file():
        raise RuntimeError(f"onset_aligned_diagnostic_ffmpeg_missing:{ffmpeg}")

    left_video = resolve_path(args.left_video)
    right_video = resolve_path(args.right_video)
    validate_input_video(left_video, args.left_sha256, "left")
    validate_input_video(right_video, args.right_sha256, "right")

    output_root = resolve_path(args.output_root)
    if output_root.exists():
        raise RuntimeError(f"immutable_onset_aligned_diagnostic_exists:{output_root}")
    output_root.mkdir(parents=True, exist_ok=False)

    header = output_root / f"{args.artifact_tag}-header.png"
    contact_sheet = output_root / f"{args.artifact_tag}-frames.png"
    video = output_root / f"{args.artifact_tag}.mp4"
    manifest_path = output_root / f"{args.artifact_tag}-manifest.json"

    make_header(header, args)
    samples = create_contact_sheet(
        ffmpeg,
        contact_sheet,
        left_video,
        right_video,
        args,
    )
    create_video(ffmpeg, video, header, left_video, right_video, args)

    manifest = {
        "version": "aurora-vfx-onset-aligned-diagnostic-comparison/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "diagnostic-not-trigger-timing-proof",
        "alignment": {
            "kind": "first-visible-onset",
            "leftOnsetVideoSeconds": args.left_onset_seconds,
            "rightOnsetVideoSeconds": args.right_onset_seconds,
            "comparisonOnsetSeconds": args.pre_roll_seconds,
            "preRollSeconds": args.pre_roll_seconds,
            "postRollSeconds": args.post_roll_seconds,
            "samples": samples,
        },
        "claimBoundary": [
            "Both inputs are shifted so their audited first visible frames occur at the same comparison time.",
            "The comparison supports post-onset morphology, intensity, spatial distribution, and duration review.",
            "It does not compare latency from an application trigger because the input trigger timestamps are not required or inferred.",
            "It is diagnostic evidence and cannot be promoted to accepted parity proof without the task-specific proof gates and visual verdict.",
        ],
        "labels": {"left": args.left_label, "right": args.right_label},
        "inputs": {"leftVideo": media(left_video), "rightVideo": media(right_video)},
        "outputs": {
            "video": media(video),
            "contactSheet": media(contact_sheet),
            "header": media(header),
        },
        "runtimeActions": {
            "startsNwn": False,
            "startsWebRuntime": False,
            "startsBrowser": False,
        },
    }
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return {
        "ok": True,
        "status": "created-onset-aligned-diagnostic-comparison",
        "video": media(video),
        "contactSheet": media(contact_sheet),
        "manifest": media(manifest_path),
    }


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["dry-run", "create"])
    parser.add_argument("--left-video", required=True)
    parser.add_argument("--right-video", required=True)
    parser.add_argument("--left-sha256", required=True)
    parser.add_argument("--right-sha256", required=True)
    parser.add_argument("--left-onset-seconds", required=True, type=float)
    parser.add_argument("--right-onset-seconds", required=True, type=float)
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--left-label", default="Left reference")
    parser.add_argument("--right-label", default="Right candidate")
    parser.add_argument("--artifact-tag", default="vfx-onset-aligned-diagnostic")
    parser.add_argument("--pre-roll-seconds", type=float, default=0.5)
    parser.add_argument("--post-roll-seconds", type=float, default=3.0)
    parser.add_argument("--fps", type=int, default=12)
    parser.add_argument("--ffmpeg", default=str(FFMPEG_DEFAULT))
    return parser.parse_args()


def main() -> None:
    args = parse_arguments()
    validate_arguments(args)
    if args.command == "dry-run":
        result = {
            "ok": True,
            "status": "onset-aligned-diagnostic-comparison-plan-valid",
            "alignmentKind": "first-visible-onset",
            "leftOnsetSeconds": args.left_onset_seconds,
            "rightOnsetSeconds": args.right_onset_seconds,
            "comparisonOnsetSeconds": args.pre_roll_seconds,
            "outputFps": args.fps,
            "outputSize": [1280, PANEL[1] + HEADER_HEIGHT],
            "startsNwn": False,
            "startsWebRuntime": False,
            "startsBrowser": False,
        }
    else:
        result = create(args)
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
