from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import cv2
from PIL import Image, ImageDraw, ImageFont, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[2]
EVIDENCE_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-web-row28"
)
WEB_ROOT = EVIDENCE_ROOT / "web-v3"
OUTPUT_ROOT = EVIDENCE_ROOT / "presentation-v1"
FRAME_ROOT = OUTPUT_ROOT / "frames"
VIDEO = WEB_ROOT / "aurora-web-row28-one-trigger-v3.mp4"
PROOF_MANIFEST = WEB_ROOT / "proof-manifest-v3.json"
SUMMARY = WEB_ROOT / "aurora-web-row28-one-trigger-v3-summary.json"
VISUAL_VALIDATION = WEB_ROOT / "aurora-web-row28-one-trigger-v3-visual-validation.json"
RETAIL_BLOCKER = EVIDENCE_ROOT / "retail-oracle-blocker-v1.json"
CONTACT_SHEET = OUTPUT_ROOT / "row28-web-lifecycle-retail-missing-contact-sheet-v1.png"
PRESENTATION_MANIFEST = OUTPUT_ROOT / "row28-proof-presentation-v1.json"

EXPECTED_INPUTS = {
    VIDEO: "1008fd200f86113d3c746736acaa1871c3b6c2c0c78a879f2d0a7cd00a8df6a6",
    PROOF_MANIFEST: "f4d6939c542a543c7c2379057e9954d26f2cbf15d95d1ee58b760d3d13771a14",
    SUMMARY: "89f37a59f7ffa0e21860f12799798fcb25d785c3de13f7ad0e44ccec721b9e0c",
    VISUAL_VALIDATION: "152e14fcecdbcf978ea564944bb16e7149e7ce8053baec820e4611a8a3f68414",
    RETAIL_BLOCKER: "2349f7b39ccf496e11e7f632a4cb21062fd35db7b41422fb03fe3c8cc87557b4",
}

SAMPLES = [
    {"phase": "baseline", "wallSeconds": 1.500, "onsetRelativeSeconds": -0.500},
    {"phase": "early", "wallSeconds": 2.167, "onsetRelativeSeconds": 0.167},
    {"phase": "active", "wallSeconds": 3.500, "onsetRelativeSeconds": 1.500},
    {"phase": "late", "wallSeconds": 5.000, "onsetRelativeSeconds": 3.000},
    {"phase": "post", "wallSeconds": 8.000, "onsetRelativeSeconds": 6.000},
]

SHEET_WIDTH = 1280
GLOBAL_HEADER_HEIGHT = 124
COLUMN_HEADER_HEIGHT = 54
ROW_LABEL_HEIGHT = 34
PANEL_WIDTH = 640
PANEL_HEIGHT = 360
ROW_HEIGHT = ROW_LABEL_HEIGHT + PANEL_HEIGHT


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def repo_path(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def media_record(path: Path) -> dict[str, object]:
    return {
        "path": repo_path(path),
        "sizeBytes": path.stat().st_size,
        "sha256": sha256(path),
    }


def load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_path = Path("C:/Windows/Fonts") / ("arialbd.ttf" if bold else "arial.ttf")
    return ImageFont.truetype(str(font_path), size) if font_path.exists() else ImageFont.load_default()


def fit_panel(source: Image.Image) -> Image.Image:
    contained = ImageOps.contain(source.convert("RGB"), (PANEL_WIDTH, PANEL_HEIGHT), Image.Resampling.LANCZOS)
    panel = Image.new("RGB", (PANEL_WIDTH, PANEL_HEIGHT), "#101417")
    panel.paste(
        contained,
        ((PANEL_WIDTH - contained.width) // 2, (PANEL_HEIGHT - contained.height) // 2),
    )
    return panel


def read_frame(capture: cv2.VideoCapture, seconds: float) -> tuple[Image.Image, int]:
    capture.set(cv2.CAP_PROP_POS_MSEC, seconds * 1000.0)
    ok, frame = capture.read()
    if not ok:
        raise RuntimeError(f"Cannot decode accepted row28 video at {seconds:.3f}s")
    frame_index = int(round(capture.get(cv2.CAP_PROP_POS_FRAMES))) - 1
    return Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)), frame_index


def validate_inputs() -> tuple[dict[str, object], dict[str, object], dict[str, object]]:
    if OUTPUT_ROOT.exists():
        raise RuntimeError(f"Presentation output already exists; preserve and reuse it: {OUTPUT_ROOT}")
    for path, expected_hash in EXPECTED_INPUTS.items():
        if not path.is_file():
            raise RuntimeError(f"Bound row28 input is missing: {path}")
        actual_hash = sha256(path)
        if actual_hash != expected_hash:
            raise RuntimeError(f"Bound row28 input hash changed: {path}: {actual_hash}")

    proof = json.loads(PROOF_MANIFEST.read_text(encoding="utf-8"))
    summary = json.loads(SUMMARY.read_text(encoding="utf-8"))
    retail = json.loads(RETAIL_BLOCKER.read_text(encoding="utf-8"))
    if not (
        proof.get("webProofCompleteness") == "verified"
        and proof.get("retailProofCompleteness") == "missing"
        and proof.get("claims", {}).get("retailParity") is False
        and summary.get("status") == "recorded-single-deterministic-playback"
        and summary.get("triggerCount") == 1
        and summary.get("loop") is False
        and summary.get("mp4Fps") == 30
        and summary.get("mp4FrameCount") == 270
        and retail.get("proofCompleteness") == "missing"
        and retail.get("retailParityClaim") is False
    ):
        raise RuntimeError("The accepted Web proof or retail-missing blocker no longer matches the presentation contract")
    guard = summary["finalProofState"]["runtimeObservability"]["playbackGuard"]
    if not (
        guard.get("triggerCount") == 1
        and guard.get("overlapCount") == 0
        and guard.get("loop") is False
        and guard.get("completed") is True
        and guard.get("postDurationHidden") is True
    ):
        raise RuntimeError("The accepted row28 lifecycle guard no longer passes")
    return proof, summary, retail


def create_contact_sheet(summary: dict[str, object]) -> list[dict[str, object]]:
    capture = cv2.VideoCapture(str(VIDEO))
    if not capture.isOpened():
        raise RuntimeError(f"Cannot open accepted row28 video: {VIDEO}")
    fps = float(capture.get(cv2.CAP_PROP_FPS))
    frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(capture.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(capture.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if (fps, frame_count, width, height) != (30.0, 270, 880, 750):
        capture.release()
        raise RuntimeError(
            f"Unexpected accepted row28 video metadata: fps={fps}, frames={frame_count}, size={width}x{height}"
        )

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=False)
    FRAME_ROOT.mkdir(parents=True, exist_ok=False)
    sheet_height = GLOBAL_HEADER_HEIGHT + COLUMN_HEADER_HEIGHT + len(SAMPLES) * ROW_HEIGHT
    sheet = Image.new("RGB", (SHEET_WIDTH, sheet_height), "#101417")
    draw = ImageDraw.Draw(sheet)
    draw.rectangle((0, 0, SHEET_WIDTH, GLOBAL_HEADER_HEIGHT), fill="#1d252b")
    draw.text(
        (18, 11),
        "row28 | VFX_FNF_METEOR_SWARM | one-trigger lifecycle review",
        fill="#f7f9fa",
        font=load_font(27, bold=True),
    )
    draw.text(
        (18, 53),
        "Accepted Aurora Web v3 playback; exact NWN retail oracle is missing.",
        fill="#f4c96b",
        font=load_font(18, bold=True),
    )
    draw.text(
        (18, 84),
        "Status: diagnostic-only presentation — retail parity is NOT evaluated or claimed.",
        fill="#ff8f8f",
        font=load_font(17, bold=True),
    )

    column_y = GLOBAL_HEADER_HEIGHT
    draw.rectangle((0, column_y, PANEL_WIDTH, column_y + COLUMN_HEADER_HEIGHT), fill="#26313a")
    draw.rectangle((PANEL_WIDTH, column_y, SHEET_WIDTH, column_y + COLUMN_HEADER_HEIGHT), fill="#26313a")
    draw.line((PANEL_WIDTH, column_y, PANEL_WIDTH, sheet_height), fill="#55636d", width=2)
    draw.text((18, column_y + 14), "NWN retail oracle — MISSING", fill="#ffffff", font=load_font(18, bold=True))
    draw.text(
        (PANEL_WIDTH + 18, column_y + 14),
        "Aurora Web current runtime — verified Web proof",
        fill="#ffffff",
        font=load_font(18, bold=True),
    )

    frame_records: list[dict[str, object]] = []
    for index, sample in enumerate(SAMPLES):
        wall_seconds = float(sample["wallSeconds"])
        image, frame_index = read_frame(capture, wall_seconds)
        frame_path = FRAME_ROOT / f"{index + 1:02d}-{sample['phase']}-t{wall_seconds:.3f}.png"
        image.save(frame_path, optimize=True)
        frame_records.append(
            {
                **sample,
                "encodedFrameIndex": frame_index,
                "frame": media_record(frame_path),
            }
        )

        row_y = GLOBAL_HEADER_HEIGHT + COLUMN_HEADER_HEIGHT + index * ROW_HEIGHT
        draw.rectangle((0, row_y, SHEET_WIDTH, row_y + ROW_LABEL_HEIGHT), fill="#171d22")
        relative = float(sample["onsetRelativeSeconds"])
        draw.text(
            (18, row_y + 7),
            f"{sample['phase']} | onset {relative:+.3f}s",
            fill="#c6d0d7",
            font=load_font(15, bold=True),
        )
        draw.text(
            (PANEL_WIDTH + 18, row_y + 7),
            f"{sample['phase']} | wall t={wall_seconds:.3f}s | frame {frame_index}",
            fill="#c6d0d7",
            font=load_font(15, bold=True),
        )

        panel_y = row_y + ROW_LABEL_HEIGHT
        draw.rectangle((0, panel_y, PANEL_WIDTH, panel_y + PANEL_HEIGHT), fill="#0c0f11")
        missing_title = "MISSING"
        missing_body = "No exact row28 NWN retail capture"
        title_box = draw.textbbox((0, 0), missing_title, font=load_font(32, bold=True))
        body_box = draw.textbbox((0, 0), missing_body, font=load_font(17))
        draw.text(
            ((PANEL_WIDTH - (title_box[2] - title_box[0])) // 2, panel_y + 135),
            missing_title,
            fill="#ff8f8f",
            font=load_font(32, bold=True),
        )
        draw.text(
            ((PANEL_WIDTH - (body_box[2] - body_box[0])) // 2, panel_y + 190),
            missing_body,
            fill="#aeb8c2",
            font=load_font(17),
        )
        sheet.paste(fit_panel(image), (PANEL_WIDTH, panel_y))

    capture.release()
    sheet.save(CONTACT_SHEET, optimize=True)
    if Image.open(CONTACT_SHEET).size != (SHEET_WIDTH, sheet_height):
        raise RuntimeError("Generated row28 contact sheet dimensions are invalid")
    if frame_records[-1]["phase"] != "post" or not summary["finalProofState"]["runtimeObservability"]["playbackGuard"]["postDurationHidden"]:
        raise RuntimeError("The final presentation sample is not bound to the accepted hidden post state")
    return frame_records


def main() -> None:
    proof, summary, retail = validate_inputs()
    frame_records = create_contact_sheet(summary)
    manifest = {
        "version": "aurora-vfx-proof-presentation/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "fixtureId": "vfx-nwn-web-row28",
        "sourceRowId": 28,
        "sourceLabel": "VFX_FNF_METEOR_SWEARM",
        "publicConstant": "VFX_FNF_METEOR_SWARM",
        "sourceModel": "vff_rainmeteor",
        "presentationStatus": "verified-derivative-of-accepted-web-proof",
        "evidenceStatus": "diagnostic-only",
        "webProofCompleteness": proof["webProofCompleteness"],
        "retailProofCompleteness": retail["proofCompleteness"],
        "retailParityClaim": False,
        "verdict": "Web one-trigger lifecycle is reviewable; NWN-vs-Web parity remains missing until an exact row28 retail oracle is captured.",
        "proofRules": {
            "newPlaybackTriggered": False,
            "acceptedVideoReusedWithoutRerun": True,
            "intentionalTriggerCount": 1,
            "loop": False,
            "overlapCount": 0,
            "completed": True,
            "postDurationHidden": True,
            "retailLaneRenderedAsMissingInsteadOfSubstituted": True,
        },
        "timing": {
            "origin": "accepted Web capture wall clock",
            "declaredEffectStartWallSeconds": 2.0,
            "runtimeDurationSeconds": summary["finalProofState"]["runtimeObservability"]["playbackGuard"]["durationSeconds"],
            "samples": frame_records,
        },
        "inputs": [
            media_record(VIDEO),
            media_record(PROOF_MANIFEST),
            media_record(SUMMARY),
            media_record(VISUAL_VALIDATION),
            media_record(RETAIL_BLOCKER),
        ],
        "outputs": {
            "contactSheet": media_record(CONTACT_SHEET),
            "sampleFrameCount": len(frame_records),
        },
        "retailResumeCondition": retail["resumeCondition"],
    }
    PRESENTATION_MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    reloaded = json.loads(PRESENTATION_MANIFEST.read_text(encoding="utf-8"))
    if not (
        reloaded["presentationStatus"] == "verified-derivative-of-accepted-web-proof"
        and reloaded["evidenceStatus"] == "diagnostic-only"
        and reloaded["retailParityClaim"] is False
        and reloaded["outputs"]["sampleFrameCount"] == 5
        and sha256(CONTACT_SHEET) == reloaded["outputs"]["contactSheet"]["sha256"]
    ):
        raise RuntimeError("Generated row28 proof presentation failed self-validation")
    print(
        json.dumps(
            {
                "status": "verified-derivative-of-accepted-web-proof",
                "evidenceStatus": "diagnostic-only",
                "retailParityClaim": False,
                "contactSheet": media_record(CONTACT_SHEET),
                "manifest": media_record(PRESENTATION_MANIFEST),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
