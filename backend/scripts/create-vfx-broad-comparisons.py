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
PLACEABLE_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-placeable-post-debt-2026-07-14"
)
COMPARISON_ROOT = EVIDENCE_ROOT / "comparisons"
HEADER_ROOT = COMPARISON_ROOT / "headers"
FFMPEG_PATH = Path(
    os.environ.get(
        "FFMPEG_PATH",
        "C:/Users/enonw/Documents/Codex/2026-05-17/umiesz-tworzy-filmiki/"
        "vendor/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe",
    )
)
TAG = "retail-20260716"
ALIGNMENT_VERSION = "pixel-aligned-v3"
FPS = 8
PANEL_SIZE = (640, 360)
HEADER_SIZE = (1280, 84)
OUTPUT_SIZE = (1280, 444)

WEB_FIXTURES = {
    "row68": "vfx-nwn-web-row68",
    "row44": "vfx-broad-row44",
    "row50": "vfx-broad-row50",
    "row22": "vfx-nwn-web-row22",
    "row210": "vfx-broad-row210",
    "row216": "vfx-broad-row216",
    "row181": "vfx-broad-row181",
    "row1": "vfx-broad-row1",
    "aoe0": "vfx-broad-aoe0",
}

OPEN_GAPS = {
    "row68": [
        "The Web healing column is substantially smaller and narrower in frame than the NWN burst.",
        "Web preserves a white core and rising yellow sparks, but bloom width, density, and tail timing do not match retail.",
    ],
    "row44": [
        "Web resolves as an isolated compact green cloud; NWN spreads a wider aura around the target and ground.",
        "Acid footprint, spatial scale, particle detail, and luminance do not yet match retail.",
    ],
    "row50": [
        "Web reproduces a white core and vertical wisps, but the NWN effect wraps the target with a taller light column.",
        "Burst scale, silhouette, environmental spill, and decay do not yet match retail.",
    ],
    "row22": [
        "The NWN peak is broader, brighter, and saturates the environment more strongly.",
        "The Web flash exposes a shell/lanes silhouette and its late chunks remain too dark.",
    ],
    "row210": [
        "The source-target axis and linked-segment winding are now coherent, but the Web beam is far thinner than NWN.",
        "Web source/target glow, beam width, phase motion, and luminance do not yet match retail.",
    ],
    "row216": [
        "Web is a segmented zig-zag chain, while NWN is a thick smooth looping fire lash around the target.",
        "The retail phase loop is not yet represented by the native runtime owner.",
    ],
    "row181": [
        "Web currently presents one compact blue-violet point instead of proving the retail MIRV split/trajectory behavior.",
        "Native progfx Type10 multiplicity/trajectory ownership is missing; current group motion is manifest-driven.",
    ],
    "row1": [
        "Web appears as a flat radial black ellipse on gray, while NWN is a dark scene-integrated ground volume around actors.",
        "Impact/duration/cessation switching, the retail phase loop, volume footprint, and decay are incomplete.",
    ],
    "aoe0": [
        "Web is an isolated soft green cloud; NWN fills a much wider ground area with dense acid fog.",
        "Native persistent AOE ownership, phase loop, footprint, vertical spread, density, and motion remain incomplete.",
    ],
    "plc_t04": [
        "Web shows all three source instances and their dark star-shaped static bases, but flame plumes remain weaker and narrower.",
        "The isolation backdrop/camera differ from the bakery oracle, which visibly contains two of the three instances.",
    ],
}


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    filename = "arialbd.ttf" if bold else "arial.ttf"
    font_path = Path("C:/Windows/Fonts") / filename
    return ImageFont.truetype(str(font_path), size) if font_path.exists() else ImageFont.load_default()


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
    if fps <= 0 or frame_count <= 0 or width <= 0 or height <= 0:
        raise RuntimeError(f"Invalid video metadata: {file_path}")
    return {
        "fps": fps,
        "frameCount": frame_count,
        "durationSeconds": frame_count / fps,
        "width": width,
        "height": height,
    }


def detect_pixel_onset(file_path: Path) -> dict[str, float | int]:
    capture = cv2.VideoCapture(str(file_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open video for onset analysis: {file_path}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    baseline_frames = []
    baseline_count = max(1, int(round(fps * 1.5)))
    for _ in range(baseline_count):
        ok, frame = capture.read()
        if not ok:
            break
        baseline_frames.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    capture.release()
    if not baseline_frames:
        raise RuntimeError(f"Cannot read baseline frames: {file_path}")
    baseline = np.median(np.stack(baseline_frames).astype(np.float32), axis=0)

    capture = cv2.VideoCapture(str(file_path))
    frame_index = 0
    result = None
    while True:
        ok, frame = capture.read()
        if not ok:
            break
        elapsed = frame_index / fps
        if elapsed >= 1.5:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB).astype(np.float32)
            delta = np.max(np.abs(rgb - baseline), axis=2)
            changed_pixels = int(np.count_nonzero(delta >= 20))
            mean_delta = float(delta.mean())
            if changed_pixels >= 100 or mean_delta >= 0.5:
                result = {
                    "frameIndex": frame_index,
                    "seconds": elapsed,
                    "changedPixelCount": changed_pixels,
                    "meanMaxChannelDelta": mean_delta,
                    "threshold": "changed pixels >= 100 at max-channel delta >= 20, or mean delta >= 0.5",
                }
                break
        frame_index += 1
    capture.release()
    if result is None:
        raise RuntimeError(f"No pixel-visible onset found: {file_path}")
    return result


def make_header(slug: str, label: str, lifecycle: str) -> Path:
    header_path = HEADER_ROOT / f"{slug}.png"
    image = Image.new("RGB", HEADER_SIZE, "#1d252b")
    draw = ImageDraw.Draw(image)
    title_font = load_font(24, bold=True)
    label_font = load_font(17, bold=True)
    muted_font = load_font(15)
    draw.text((18, 8), f"{slug} | {label}", fill="#f7f9fa", font=title_font)
    draw.text((18, 48), "NWN / Aurora retail oracle", fill="#ffffff", font=label_font)
    draw.text((658, 48), "Aurora Web current implementation", fill="#ffffff", font=label_font)
    draw.text((1015, 13), lifecycle, fill="#b8c2c9", font=muted_font)
    draw.line((640, 42, 640, 82), fill="#55636d", width=2)
    image.save(header_path, optimize=True)
    return header_path


def create_comparison_video(
    slug: str,
    label: str,
    lifecycle: str,
    nwn_video: Path,
    web_video: Path,
    nwn_start: float,
    duration: float,
) -> Path:
    output_path = COMPARISON_ROOT / f"nwn-vs-aurora-web-{slug}-{TAG}-{ALIGNMENT_VERSION}.mp4"
    if output_path.exists():
        probe = probe_video(output_path)
        if probe["width"] != OUTPUT_SIZE[0] or probe["height"] != OUTPUT_SIZE[1]:
            raise RuntimeError(f"Existing comparison has invalid dimensions: {output_path} {probe}")
        return output_path
    header_path = make_header(slug, label, lifecycle)
    filter_graph = (
        "[0:v]fps=8,scale=640:360:force_original_aspect_ratio=decrease,"
        "pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[left];"
        "[1:v]fps=8,scale=640:360:force_original_aspect_ratio=decrease,"
        "pad=640:360:(ow-iw)/2:(oh-ih)/2:color=0x111315,setsar=1[right];"
        "[left][right]hstack=inputs=2[body];"
        "[2:v]fps=8,scale=1280:84,setsar=1[header];"
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
        str(nwn_video),
        "-i",
        str(web_video),
        "-loop",
        "1",
        "-framerate",
        str(FPS),
        "-i",
        str(header_path),
        "-filter_complex",
        filter_graph,
        "-map",
        "[out]",
        "-t",
        f"{duration:.6f}",
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
        str(output_path),
    ]
    subprocess.run(command, check=True, cwd=REPO_ROOT)
    probe = probe_video(output_path)
    if probe["width"] != OUTPUT_SIZE[0] or probe["height"] != OUTPUT_SIZE[1]:
        raise RuntimeError(f"Unexpected comparison dimensions: {output_path} {probe}")
    return output_path


def read_frame(file_path: Path, elapsed_seconds: float) -> Image.Image:
    capture = cv2.VideoCapture(str(file_path))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open comparison: {file_path}")
    capture.set(cv2.CAP_PROP_POS_MSEC, elapsed_seconds * 1000)
    ok, frame = capture.read()
    capture.release()
    if not ok:
        raise RuntimeError(f"Cannot read frame at {elapsed_seconds:.3f}s: {file_path}")
    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    return Image.fromarray(rgb)


def create_contact_sheet(entries: list[dict[str, object]]) -> Path:
    output_path = COMPARISON_ROOT / f"nwn-vs-aurora-web-10-fixture-contact-sheet-{ALIGNMENT_VERSION}.png"
    thumb_size = (640, 222)
    sheet = Image.new("RGB", (1280, 80 + 5 * thumb_size[1]), "#101417")
    draw = ImageDraw.Draw(sheet)
    draw.text(
        (20, 16),
        "NWN retail vs Aurora Web | 10-fixture onset-aligned proof set",
        fill="#f7f9fa",
        font=load_font(28, bold=True),
    )
    draw.text(
        (20, 51),
        "Each tile is sampled from its H.264 side-by-side MP4; full duration clips remain the proof.",
        fill="#b8c2c9",
        font=load_font(16),
    )
    for index, entry in enumerate(entries):
        frame = read_frame(Path(entry["comparison"]["video"]["path"]), float(entry["sampleTimeSeconds"]))
        frame = frame.resize(thumb_size, Image.Resampling.LANCZOS)
        x = (index % 2) * thumb_size[0]
        y = 80 + (index // 2) * thumb_size[1]
        sheet.paste(frame, (x, y))
    sheet.save(output_path, optimize=True)
    return output_path


def create_overview_video(entries: list[dict[str, object]]) -> Path:
    output_path = COMPARISON_ROOT / f"nwn-vs-aurora-web-10-fixture-overview-{ALIGNMENT_VERSION}.mp4"
    if output_path.exists():
        probe_video(output_path)
        return output_path
    command = [str(FFMPEG_PATH), "-y", "-hide_banner", "-loglevel", "error"]
    clip_lengths = []
    for entry in entries:
        duration = float(entry["comparison"]["durationSeconds"])
        sample = float(entry["sampleTimeSeconds"])
        start = max(0.0, min(sample - 1.5, max(0.0, duration - 3.0)))
        clip_length = min(3.0, duration - start)
        clip_lengths.append(clip_length)
        command.extend(
            [
                "-ss",
                f"{start:.6f}",
                "-t",
                f"{clip_length:.6f}",
                "-i",
                str(entry["comparison"]["video"]["path"]),
            ]
        )
    filters = []
    for index in range(len(entries)):
        filters.append(f"[{index}:v]fps=8,scale=1280:444,setsar=1[v{index}]")
    concat_inputs = "".join(f"[v{index}]" for index in range(len(entries)))
    filters.append(f"{concat_inputs}concat=n={len(entries)}:v=1:a=0[out]")
    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[out]",
            "-an",
            "-r",
            str(FPS),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(output_path),
        ]
    )
    subprocess.run(command, check=True, cwd=REPO_ROOT)
    return output_path


def create_full_set_video(entries: list[dict[str, object]]) -> Path:
    output_path = COMPARISON_ROOT / f"nwn-vs-aurora-web-10-fixture-full-set-{ALIGNMENT_VERSION}.mp4"
    if output_path.exists():
        probe_video(output_path)
        return output_path
    command = [str(FFMPEG_PATH), "-y", "-hide_banner", "-loglevel", "error"]
    for entry in entries:
        command.extend(["-i", str(entry["comparison"]["video"]["path"])])
    filters = []
    for index in range(len(entries)):
        filters.append(f"[{index}:v]fps=8,scale=1280:444,setsar=1[v{index}]")
    concat_inputs = "".join(f"[v{index}]" for index in range(len(entries)))
    filters.append(f"{concat_inputs}concat=n={len(entries)}:v=1:a=0[out]")
    command.extend(
        [
            "-filter_complex",
            ";".join(filters),
            "-map",
            "[out]",
            "-an",
            "-r",
            str(FPS),
            "-c:v",
            "libx264",
            "-preset",
            "fast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            str(output_path),
        ]
    )
    subprocess.run(command, check=True, cwd=REPO_ROOT)
    return output_path


def write_report(
    entries: list[dict[str, object]], contact_sheet: Path, overview: Path, full_set: Path
) -> Path:
    output_path = COMPARISON_ROOT / f"README-{ALIGNMENT_VERSION}.md"
    lines = [
        "# NWN retail vs Aurora Web broad VFX proof",
        "",
        "Status: `comparison-ready-open-parity-gaps`.",
        "",
        "## Contract",
        "",
        "- Aurora first: Web fixtures are generated from retail-source manifests and payloads.",
        "- Existing NWN/Aurora MP4 oracles are reused; NWN was not launched for this comparison.",
        "- Fire-and-forget VFX have exactly one Web trigger; duration VFX run for 20 seconds.",
        "- NWN onset is aligned to the first pixel-visible Aurora Web frame in each encoded MP4.",
        "- No diagnostic receiver, capsule, plane, or proof-only geometry is visible.",
        "- Camera/environment mismatch is explicit; these artifacts do not claim pixel parity.",
        "",
        "## Artifacts",
        "",
        f"- Full 10-fixture MP4: `{full_set.name}`.",
        f"- Overview MP4: `{overview.name}`.",
        f"- Contact sheet: `{contact_sheet.name}`.",
        f"- Machine manifest: `broad-nwn-vs-aurora-web-comparison-manifest-{ALIGNMENT_VERSION}.json`.",
        "",
        "## Fixture findings",
        "",
    ]
    for entry in entries:
        lines.append(f"### {entry['slug']} | {entry['label']}")
        lines.append("")
        lines.append(f"- Comparison: `{Path(entry['comparison']['video']['path']).name}`.")
        lines.append(
            f"- Window: {entry['comparison']['durationSeconds']:.3f} s; "
            f"NWN starts at source t={entry['alignment']['nwnSourceStartSeconds']:.3f} s."
        )
        for gap in entry["openParityGaps"]:
            lines.append(f"- Open gap: {gap}")
        lines.append("")
    output_path.write_text("\n".join(lines), encoding="ascii")
    return output_path


def write_placeable_v44_packet(placeable_entry: dict[str, object]) -> Path:
    output_path = PLACEABLE_ROOT / "post-debt-enon-bakery-plc-t04-10s-8fps-proof-v44.md"
    frame = json.loads(
        (PLACEABLE_ROOT / "post-debt-enon-bakery-plc-t04-10s-8fps-proof-v44.frame.json").read_text(
            encoding="utf-8"
        )
    )
    sample = next(item for item in frame["mp4PlaybackSamples"] if item["elapsedSeconds"] == 5)
    state = sample["playbackState"]
    text = f"""# Post-debt `plc_t04` placeable VFX proof v44

Status: `comparison-ready-open-parity-gaps`.

## Proof contract

- Aurora first: retail `plc_t04.mdl` supplies the static nodes, emitters, textures, controllers, and absence of light nodes.
- NWN: the saved 10-second oracle MP4 was reused without launching or recapturing NWN.
- Aurora Web: one fresh deterministic 10.00-second, 8 fps, 80-frame capture.
- Lifecycle: three persistent source-area placeables; no repeated fire-and-forget trigger and no overlap.

## Runtime result at t=5 s

- Playback roots: `{state['rootCount']}`.
- Visible draw meshes: `{state['visibleDrawMeshCount']}`.
- Visible particles: `{state['visibleDrawParticleCount']}`.
- Source textures: `{', '.join(state['visibleTextureReferences'])}`.
- Source-backed point lights: `0`; fabricated Web point lights: `0`.
- Runtime exceptions: `0`.

## Comparison

- Side-by-side MP4: `{Path(placeable_entry['comparison']['video']['path']).name}` in the broad comparison directory.
- Open gap: Web flame luminance and plume silhouette remain weaker and narrower than NWN.
- Open gap: camera and scene context differ; canonical pixel parity is not promoted.
"""
    output_path.write_text(text, encoding="ascii")
    return output_path


def main() -> None:
    if not FFMPEG_PATH.exists():
        raise RuntimeError(f"ffmpeg is missing: {FFMPEG_PATH}")
    validation_path = EVIDENCE_ROOT / "aurora-web-proof-validation.json"
    validation = json.loads(validation_path.read_text(encoding="utf-8"))
    if validation["status"] != "valid-10-fixture-aurora-web-proof-set":
        raise RuntimeError("Aurora Web proof validation did not pass.")
    nwn_manifest = json.loads((EVIDENCE_ROOT / "nwn-proof-manifest.json").read_text(encoding="utf-8"))
    fixture_by_slug = {entry["fixtureId"]: entry for entry in nwn_manifest["fixtures"]}
    COMPARISON_ROOT.mkdir(parents=True, exist_ok=True)
    HEADER_ROOT.mkdir(parents=True, exist_ok=True)

    entries: list[dict[str, object]] = []
    for slug in ["row68", "row44", "row50", "row22", "row210", "row216", "row181", "row1", "aoe0"]:
        nwn = fixture_by_slug[slug]
        summary_path = (
            EVIDENCE_ROOT
            / slug
            / "aurora-web"
            / f"aurora-web-{slug}-one-trigger-{TAG}-summary.json"
        )
        web_summary = json.loads(summary_path.read_text(encoding="utf-8"))
        nwn_video = Path(nwn["video"]["path"])
        web_video = Path(web_summary["mp4"]["path"])
        nwn_duration = float(nwn["lifecycleObservation"]["durationSeconds"])
        onset = float(nwn["lifecycleObservation"]["onsetVideoSeconds"])
        web_duration = float(web_summary["durationMs"]) / 1000.0
        first_visible = next(
            (
                item
                for item in web_summary["proofState"]["timeline"]
                if float(item.get("wallSeconds", 0)) >= 2.0
                and (
                    int(item.get("visibleFrameCount") or 0) > 0
                    or int(item.get("drawParticles") or 0) > 0
                    or int(item.get("sourceLightCount") or 0) > 0
                )
            ),
            None,
        )
        if first_visible is None:
            raise RuntimeError(f"No visible Aurora Web onset in proof timeline for {slug}")
        timeline_visible_onset = float(first_visible["wallSeconds"])
        pixel_onset = detect_pixel_onset(web_video)
        web_visible_onset = float(pixel_onset["seconds"])
        nwn_start = max(0.0, onset - web_visible_onset)
        duration = min(web_duration, nwn_duration - nwn_start)
        if duration <= 2.0:
            raise RuntimeError(f"Comparison window is too short for {slug}: {duration}")
        peak = float(nwn["lifecycleObservation"]["peakVideoSeconds"])
        sample_time = min(
            duration - 0.125,
            max(web_visible_onset + (1.0 / FPS), web_visible_onset + peak - onset),
        )
        comparison_video = create_comparison_video(
            slug,
            nwn["label"],
            nwn["lifecycle"],
            nwn_video,
            web_video,
            nwn_start,
            duration,
        )
        entries.append(
            {
                "slug": slug,
                "fixtureId": WEB_FIXTURES[slug],
                "label": nwn["label"],
                "lifecycle": nwn["lifecycle"],
                "status": "comparison-ready-open-parity-gaps",
                "alignment": {
                    "strategy": "NWN detected onset aligned to Aurora Web first visible recorded frame",
                    "nwnSourceStartSeconds": nwn_start,
                    "nwnSourceOnsetSeconds": onset,
                    "comparisonOnsetSeconds": web_visible_onset,
                    "auroraWebSourceStartSeconds": 0.0,
                    "auroraWebEffectStartSeconds": 2.0,
                    "auroraWebTimelineFirstVisibleFrameSeconds": timeline_visible_onset,
                    "auroraWebPixelFirstVisibleFrame": pixel_onset,
                },
                "nwn": {
                    "video": media_record(nwn_video),
                    "oracleStatus": nwn["oracleStatus"],
                    "recordingReusedWithoutRerun": True,
                },
                "auroraWeb": {
                    "video": media_record(web_video),
                    "summary": media_record(summary_path),
                    "triggerCount": 1,
                    "loop": False,
                    "diagnosticHarness": False,
                },
                "comparison": {
                    "durationSeconds": duration,
                    "fps": FPS,
                    "video": media_record(comparison_video),
                },
                "sampleTimeSeconds": sample_time,
                "openParityGaps": OPEN_GAPS[slug],
            }
        )

    placeable = fixture_by_slug["plc_t04"]
    placeable_frame_path = (
        PLACEABLE_ROOT / "post-debt-enon-bakery-plc-t04-10s-8fps-proof-v44.frame.json"
    )
    placeable_frame = json.loads(placeable_frame_path.read_text(encoding="utf-8"))
    placeable_nwn_video = Path(placeable["video"]["path"])
    placeable_web_video = Path(placeable_frame["mp4Path"])
    placeable_duration = min(
        10.0,
        float(probe_video(placeable_nwn_video)["durationSeconds"]),
        float(probe_video(placeable_web_video)["durationSeconds"]),
    )
    placeable_comparison = create_comparison_video(
        "plc_t04",
        "plc_t04 / tm_pl_lightred",
        "persistent-placeable",
        placeable_nwn_video,
        placeable_web_video,
        0.0,
        placeable_duration,
    )
    placeable_entry = {
        "slug": "plc_t04",
        "fixtureId": "placeable-tm_pl_lightred-plc_t04-enon_bakery-v44",
        "label": "plc_t04 / tm_pl_lightred",
        "lifecycle": "persistent-placeable",
        "status": "comparison-ready-open-parity-gaps",
        "alignment": {
            "strategy": "same persistent 10-second window",
            "nwnSourceStartSeconds": 0.0,
            "comparisonOnsetSeconds": 0.0,
            "auroraWebSourceStartSeconds": 0.0,
        },
        "nwn": {
            "video": media_record(placeable_nwn_video),
            "oracleStatus": placeable["oracleStatus"],
            "recordingReusedWithoutRerun": True,
        },
        "auroraWeb": {
            "video": media_record(placeable_web_video),
            "frame": media_record(placeable_frame_path),
            "persistentPlaceablesNotRetriggered": True,
            "sourceInstanceCount": 3,
            "pointLightCount": 0,
        },
        "comparison": {
            "durationSeconds": placeable_duration,
            "fps": FPS,
            "video": media_record(placeable_comparison),
        },
        "sampleTimeSeconds": min(5.0, placeable_duration - 0.125),
        "openParityGaps": OPEN_GAPS["plc_t04"],
    }
    entries.append(placeable_entry)

    contact_sheet = create_contact_sheet(entries)
    overview = create_overview_video(entries)
    full_set = create_full_set_video(entries)
    report = write_report(entries, contact_sheet, overview, full_set)
    placeable_packet = write_placeable_v44_packet(placeable_entry)
    manifest = {
        "version": "aurora-vfx-nwn-web-broad-comparison/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "comparison-ready-open-parity-gaps",
        "fixtureCount": len(entries),
        "proofRules": {
            "auroraFirst": True,
            "nwnRecordingsReusedWithoutRerun": True,
            "webFireAndForgetTriggerCount": 1,
            "durationEffectsSeconds": 20,
            "overlappingPlayback": False,
            "diagnosticGeometry": False,
            "cameraParityClaimed": False,
            "canonicalVisualParityPromoted": False,
        },
        "overview": media_record(overview),
        "fullSet": media_record(full_set),
        "contactSheet": media_record(contact_sheet),
        "report": media_record(report),
        "placeablePacket": media_record(placeable_packet),
        "entries": entries,
    }
    manifest_path = (
        COMPARISON_ROOT
        / f"broad-nwn-vs-aurora-web-comparison-manifest-{ALIGNMENT_VERSION}.json"
    )
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="ascii")
    print(
        json.dumps(
            {
                "manifest": str(manifest_path),
                "overview": str(overview),
                "fullSet": str(full_set),
                "contactSheet": str(contact_sheet),
                "comparisonCount": len(entries),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
