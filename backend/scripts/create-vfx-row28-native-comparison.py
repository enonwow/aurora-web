from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import cv2
from PIL import Image, ImageDraw, ImageFont, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[2]
ROW_ROOT = REPO_ROOT / "backend" / "docs" / "aurora-reverse" / "evidence" / "vfx-nwn-web-row28"
NWN_VIDEO = ROW_ROOT / "nwn-runtime" / "v1" / "capture" / "nwn-row28-meteor-swarm-one-trigger-v8.mp4"
NWN_SUMMARY = ROW_ROOT / "nwn-final" / "v1" / "validated-summary.json"
WEB_VIDEO = ROW_ROOT / "web-v3" / "aurora-web-row28-one-trigger-v3.mp4"
WEB_SUMMARY = ROW_ROOT / "web-v3" / "aurora-web-row28-one-trigger-v3-summary.json"
WEB_VISUAL = ROW_ROOT / "web-v3" / "aurora-web-row28-one-trigger-v3-visual-validation.json"
OUT_ROOT = ROW_ROOT / "comparison-v1"
FFMPEG = Path(
    r"C:\Users\enonw\Documents\Codex\2026-05-17\umiesz-tworzy-filmiki"
    r"\vendor\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe"
)
EXPECTED = {
    NWN_VIDEO: "bdddeb001cf59bb2d6476909adc3b1d022674b06b59749f39fc11fc290dc31de",
    NWN_SUMMARY: "edefa3849244012132be29e6bb3e2cb99751a2bb2c19c237275fa0fc9adda529",
    WEB_VIDEO: "1008fd200f86113d3c746736acaa1871c3b6c2c0c78a879f2d0a7cd00a8df6a6",
    WEB_SUMMARY: "89f37a59f7ffa0e21860f12799798fcb25d785c3de13f7ad0e44ccec721b9e0c",
    WEB_VISUAL: "152e14fcecdbcf978ea564944bb16e7149e7ce8053baec820e4611a8a3f68414",
}
RELATIVE_SAMPLES = [-1.0, 0.0, 0.5, 1.5, 3.0, 5.5]
PANEL = (640, 360)
HEADER_HEIGHT = 88


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def media(path: Path) -> dict:
    return {"path": str(path.resolve()), "bytes": path.stat().st_size, "sha256": sha256(path)}


def font(size: int, bold: bool = False):
    path = Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def read_frame(path: Path, seconds: float) -> Image.Image:
    capture = cv2.VideoCapture(str(path))
    capture.set(cv2.CAP_PROP_POS_MSEC, seconds * 1000.0)
    ok, frame = capture.read()
    capture.release()
    if not ok:
        raise RuntimeError(f"comparison_frame_decode_failed:{path.name}:{seconds}")
    return Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))


def panel(image: Image.Image) -> Image.Image:
    fitted = ImageOps.contain(image.convert("RGB"), PANEL, Image.Resampling.LANCZOS)
    result = Image.new("RGB", PANEL, "#111315")
    result.paste(fitted, ((PANEL[0] - fitted.width) // 2, (PANEL[1] - fitted.height) // 2))
    return result


def validate_inputs() -> tuple[dict, dict, dict]:
    if OUT_ROOT.exists():
        raise RuntimeError("immutable_row28_comparison_exists")
    for path, expected in EXPECTED.items():
        if not path.is_file() or sha256(path) != expected:
            raise RuntimeError(f"comparison_input_binding_mismatch:{path}")
    nwn = json.loads(NWN_SUMMARY.read_text(encoding="utf-8"))
    web = json.loads(WEB_SUMMARY.read_text(encoding="utf-8"))
    web_visual = json.loads(WEB_VISUAL.read_text(encoding="utf-8"))
    if nwn.get("status") != "valid-single-trigger-visible-native-nwn-oracle":
        raise RuntimeError("native_nwn_oracle_not_accepted")
    if web.get("status") != "recorded-single-deterministic-playback" or web.get("triggerCount") != 1:
        raise RuntimeError("web_v3_not_accepted")
    if web_visual.get("status") != "pass-web-runtime-proof":
        raise RuntimeError("web_v3_visual_gate_not_accepted")
    return nwn, web, web_visual


def make_header(path: Path) -> None:
    image = Image.new("RGB", (1280, HEADER_HEIGHT), "#1d252b")
    draw = ImageDraw.Draw(image)
    draw.text((18, 10), "row28 | VFX_FNF_METEOR_SWARM | onset-aligned", fill="#f7f9fa", font=font(24, True))
    draw.text((18, 52), "NWN native retail oracle", fill="#ffffff", font=font(17, True))
    draw.text((658, 52), "Aurora Web v3", fill="#ffffff", font=font(17, True))
    draw.line((640, 43, 640, 86), fill="#55636d", width=2)
    image.save(path, optimize=True)


def create_contact_sheet(path: Path, nwn_onset: float, web_onset: float) -> list[dict]:
    row_height = 34 + PANEL[1]
    canvas = Image.new("RGB", (1280, 110 + row_height * len(RELATIVE_SAMPLES)), "#101417")
    draw = ImageDraw.Draw(canvas)
    draw.rectangle((0, 0, 1280, 110), fill="#1d252b")
    draw.text((18, 10), "row28 | native NWN vs Aurora Web v3", fill="#f7f9fa", font=font(25, True))
    draw.text((18, 50), "Timeline aligned at first pixel-visible meteor onset", fill="#c6d0d7", font=font(17))
    draw.text((18, 80), "Left: NWN retail | Right: Aurora Web", fill="#ffffff", font=font(16, True))
    rows = []
    for index, relative in enumerate(RELATIVE_SAMPLES):
        nwn_time = nwn_onset + relative
        web_time = web_onset + relative
        left = panel(read_frame(NWN_VIDEO, nwn_time))
        right = panel(read_frame(WEB_VIDEO, web_time))
        y = 110 + index * row_height
        draw.rectangle((0, y, 1280, y + 34), fill="#171d22")
        draw.text((18, y + 8), f"onset {relative:+.2f}s | NWN {nwn_time:.2f}s", fill="#c6d0d7", font=font(15, True))
        draw.text((658, y + 8), f"onset {relative:+.2f}s | Web {web_time:.2f}s", fill="#c6d0d7", font=font(15, True))
        canvas.paste(left, (0, y + 34))
        canvas.paste(right, (640, y + 34))
        rows.append({"onsetRelativeSeconds": relative, "nwnSeconds": nwn_time, "webSeconds": web_time})
    canvas.save(path, optimize=True)
    return rows


def create_video(path: Path, header: Path, nwn_onset: float, web_onset: float) -> None:
    start_offset = 1.5
    duration = 7.5
    command = [
        str(FFMPEG), "-y", "-hide_banner", "-loglevel", "error",
        "-ss", f"{nwn_onset - start_offset:.6f}", "-i", str(NWN_VIDEO),
        "-ss", f"{web_onset - start_offset:.6f}", "-i", str(WEB_VIDEO),
        "-loop", "1", "-framerate", "12", "-i", str(header),
        "-filter_complex",
        "[0:v]fps=12,scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[left];"
        "[1:v]fps=12,scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[right];"
        "[left][right]hstack=inputs=2[body];[2:v]fps=12,scale=1280:88,setsar=1[header];[header][body]vstack=inputs=2[out]",
        "-map", "[out]", "-t", f"{duration:.3f}", "-an", "-r", "12",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", str(path),
    ]
    subprocess.run(command, check=True)


def create_comparison() -> dict:
    nwn, web, _ = validate_inputs()
    nwn_onset = float(nwn["lifecycle"]["onsetVideoSeconds"])
    web_onset = 2.0
    OUT_ROOT.mkdir(parents=True, exist_ok=False)
    header = OUT_ROOT / "row28-comparison-header.png"
    contact = OUT_ROOT / "row28-nwn-vs-web-onset-aligned-contact-sheet.png"
    video = OUT_ROOT / "nwn-vs-aurora-web-row28-onset-aligned-v1.mp4"
    make_header(header)
    samples = create_contact_sheet(contact, nwn_onset, web_onset)
    create_video(video, header, nwn_onset, web_onset)
    capture = cv2.VideoCapture(str(video))
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    capture.release()
    if (fps, frames, width, height) != (12.0, 90, 1280, 448):
        raise RuntimeError(f"comparison_video_metadata_invalid:{fps}:{frames}:{width}:{height}")
    manifest = {
        "version": "aurora-vfx-row28-native-comparison/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": "vfx-nwn-web-row28",
        "sourceRowId": 28,
        "publicConstant": "VFX_FNF_METEOR_SWARM",
        "alignment": {
            "kind": "first-pixel-visible-onset",
            "nwnOnsetSeconds": nwn_onset,
            "webOnsetSeconds": web_onset,
            "samples": samples,
        },
        "verdict": {
            "parity": "not-matched",
            "observations": [
                "NWN retail peaks as a much brighter, scene-saturating multi-impact flash.",
                "The NWN bright-visible interval is about two seconds, while Web v3 declares a 4.633-second effect lifecycle.",
                "Web preserves discrete meteor chunks, rings, smoke, and sparks longer than the retail capture.",
                "The cameras are onset-aligned but not pixel-aligned; this comparison supports behavioral and visual-gap review, not a pixel-equality claim.",
            ],
        },
        "inputs": [media(path) for path in EXPECTED],
        "outputs": {"video": media(video), "contactSheet": media(contact), "header": media(header)},
    }
    manifest_path = OUT_ROOT / "comparison-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return {"ok": True, "status": "verified-onset-aligned-comparison", "video": media(video), "contactSheet": media(contact), "manifest": media(manifest_path)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["dry-run", "create"])
    args = parser.parse_args()
    if args.command == "dry-run":
        result = {
            "ok": True,
            "status": "row28_native_comparison_plan_valid",
            "nwnOnsetSeconds": 5.083333333333333,
            "webOnsetSeconds": 2.0,
            "outputFps": 12,
            "outputSize": [1280, 448],
            "startsNwn": False,
            "startsWebRuntime": False,
        }
    else:
        result = create_comparison()
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
