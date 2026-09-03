import argparse
import importlib.util
import json
import os
import re
import subprocess
import time
from pathlib import Path
from types import SimpleNamespace

import cv2
import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPT_NAME_PREFIX = "vfxctx"
DEFAULT_OUTPUT_ROOT = (
    REPO_ROOT
    / ".codex-tmp"
    / "aurora-live-evidence"
    / "vfx-context-probe"
    / "apply-target-vs-location"
)
MAP_PATH = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "artifacts"
    / "vfx-catalog-lab-map"
    / "vfx-catalog-lab-map.json"
)

PROBES = [
    {"rowId": 4256, "label": "ANTHVFX_FNF_FW_SPIRAL_S_PURPLE", "original": "location"},
    {"rowId": 859, "label": "PRCVFX_FNF_NEWWORD_2", "original": "location"},
    {"rowId": 919, "label": "PRCVFX_FNF_INVISIBILITY_SPHERE", "original": "location"},
    {"rowId": 4210, "label": "ANTHVFX_FNF_FW_BLAST_B_WHITE", "original": "location"},
    {"rowId": 1078, "label": "CEPVFX_IMP_HEALING_S_YELLOW", "original": "object"},
    {"rowId": 1932, "label": "HGVFX_IMP_DEATH_CYAN", "original": "object"},
    {"rowId": 896, "label": "PRCVFX_IMP_FAERIE_FIRE_2", "original": "object"},
    {"rowId": 809, "label": "PRCVFX_IMP_EPIC_GEM_EMERALD_2", "original": "object"},
    {"rowId": 6040, "label": "HGVFX_FNF_TEST_01", "original": "location"},
    {"rowId": 92, "label": "VFX_IMP_REMOVE_CONDITION", "original": "object"},
]


def load_capture_module():
    path = Path(__file__).with_name("capture_all_vfx_clips.py")
    spec = importlib.util.spec_from_file_location("capture_all_vfx_clips", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def safe_file_label(value):
    return re.sub(r"_+", "_", re.sub(r"[^A-Za-z0-9_]+", "_", value)).strip("_")[:90]


def escape_nw_string(value):
    return str(value).replace("\\", "\\\\").replace('"', '\\"')


def load_catalog_rows():
    data = json.loads(MAP_PATH.read_text(encoding="utf-8"))
    return {int(row["rowId"]): row for row in data.get("visualeffects", [])}


def row_model_ref_columns(row):
    return [str(ref.get("column", "")).upper() for ref in row.get("modelRefs", [])]


def has_model_ref_column(row, pattern):
    return any(re.search(pattern, column) for column in row_model_ref_columns(row))


def classify_capture(row):
    has_head_attachment = has_model_ref_column(row, r"HEAD|EYE|MOUTH|HANDCON")

    if row.get("typeFD") == "B":
        return "beam_two_targets", "beam", "source Type_FD=B: EffectBeam source-target"
    if has_head_attachment:
        return "object_head_closeup", "object", "source model-ref attachment column"
    if row.get("typeFD") == "F" and len(row.get("modelRefs", [])) == 0:
        return "location_area", "location", "source Type_FD=F without object attachment refs"
    if row.get("typeFD") == "F":
        return "object_instant", "object", "source Type_FD=F with object attachment refs"
    return "object_turntable", "object", "no specialized source contract"


def build_selected_probes(row_ids):
    if row_ids is None:
        return [dict(probe) for probe in PROBES]

    catalog_rows = load_catalog_rows()
    selected = []
    known = set()
    for probe in PROBES:
        if probe["rowId"] in row_ids:
            selected.append(dict(probe))
            known.add(probe["rowId"])

    for row_id in sorted(row_ids - known):
        row = catalog_rows.get(row_id)
        if not row:
            raise ValueError(f"Row id {row_id} not found in {MAP_PATH}")
        capture_mode, target_mode, reason = classify_capture(row)
        selected.append(
            {
                "rowId": row_id,
                "label": row.get("label") or f"row_{row_id}",
                "original": target_mode,
                "captureMode": capture_mode,
                "effectDurationSeconds": float(row.get("effectDurationSeconds") or 0.0),
                "captureWindowSeconds": float(row.get("captureWindowSeconds") or 5.0),
                "captureReason": reason,
            }
        )
    return selected


def build_probe_rows(
    row_ids=None,
    isolated=False,
    original_only=False,
    force_object_capture_mode=None,
    inter_effect_gap_seconds=10.0,
):
    selected = build_selected_probes(row_ids)
    rows = []
    start = 1.0
    sequence_index = 0
    script_index = 0
    for probe in selected:
        variants = [probe["original"]] if original_only else ["object", "location"]
        for variant in variants:
            script_name = (
                f"{SCRIPT_NAME_PREFIX}{script_index:02d}"
                if isolated
                else f"{SCRIPT_NAME_PREFIX}00"
            )
            capture_mode = probe.get("captureMode")
            if variant == "location":
                capture_mode = "location_area"
            elif variant == "beam":
                capture_mode = "beam_two_targets"
            elif not capture_mode or capture_mode == "location_area":
                capture_mode = "object_instant"
            if variant == "object" and force_object_capture_mode:
                capture_mode = force_object_capture_mode
            label = probe["label"]
            suffix = f"{variant}_from_{probe['original']}"
            capture_window_seconds = float(probe.get("captureWindowSeconds", 5.0))
            effect_duration_seconds = float(probe.get("effectDurationSeconds", 0.0))
            rows.append(
                {
                    "scriptName": script_name,
                    "targetMode": variant,
                    "captureMode": capture_mode,
                    "sequenceIndex": sequence_index,
                    "rowId": probe["rowId"],
                    "label": label,
                    "startSeconds": start,
                    "endSeconds": start + capture_window_seconds,
                    "midpointSeconds": start + (capture_window_seconds / 2.0),
                    "captureWindowSeconds": capture_window_seconds,
                    "interEffectGapSeconds": max(5.0, capture_window_seconds),
                    "effectDurationSeconds": effect_duration_seconds,
                    "suggestedFileName": (
                        f"{probe['rowId']:05d}_{safe_file_label(label)}__{suffix}.mp4"
                    ),
                    "captureReasons": (
                        f"context probe: target={variant}; original={probe['original']}; "
                        f"{probe.get('captureReason', 'fixed context probe row')}"
                    ),
                    "probeOriginalTarget": probe["original"],
                    "probeVariant": variant,
                }
            )
            if isolated:
                start = 1.0
                script_index += 1
            else:
                start += inter_effect_gap_seconds
            sequence_index += 1
    return rows


def build_nss(rows):
    lines = ['#include "vfxcap_inc"', "", "void main()", "{"]
    for row in rows:
        label = escape_nw_string(f"{row['label']} [{row['probeVariant']}]")
        duration = row["effectDurationSeconds"]
        if row["probeVariant"] == "location":
            lines.append(
                f"    VfxCapQueueLocationRow({row['rowId']}, {row['startSeconds']:.1f}, {duration:.1f}, \"{label}\");"
            )
        elif row["probeVariant"] == "beam":
            lines.append(
                f"    VfxCapQueueBeamRow({row['rowId']}, {row['startSeconds']:.1f}, {duration:.1f}, \"{label}\");"
            )
        else:
            lines.append(
                f"    VfxCapQueueObjectRow({row['rowId']}, {row['startSeconds']:.1f}, {duration:.1f}, \"{label}\", \"{row['captureMode']}\");"
            )
    lines.append("}")
    lines.append("")
    return "\n".join(lines)


def write_and_compile_probe_scripts(cap, rows, module_name):
    cap.GENERATED_SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    cap.COMPILED_SCRIPTS_DIR.mkdir(parents=True, exist_ok=True)
    env = {"PATH": str(cap.SCRIPT_COMPILER_DLL_DIR) + os.pathsep + os.environ.get("PATH", "")}
    script_paths = []
    script_names = sorted({row["scriptName"] for row in rows})
    for script_name in script_names:
        script_rows = [row for row in rows if row["scriptName"] == script_name]
        nss_path = cap.GENERATED_SCRIPTS_DIR / f"{script_name}.nss"
        ncs_path = cap.COMPILED_SCRIPTS_DIR / f"{script_name}.ncs"
        nss_path.write_text(build_nss(script_rows), encoding="utf-8")
        cap.run_command(
            [
                str(cap.SCRIPT_COMPILER),
                "--userdirectory",
                str(Path.home() / "Documents" / "Neverwinter Nights"),
                "--dirs",
                str(cap.GENERATED_SCRIPTS_DIR),
                "-o",
                str(ncs_path),
                str(nss_path),
            ],
            extra_env=env,
        )
        script_paths.append({"scriptName": script_name, "nss": str(nss_path), "ncs": str(ncs_path)})
    cap.run_command(
        ["node", "backend/scripts/inject-vfx-catalog-lab-compiled-scripts.mjs"],
        extra_env={"VFX_LAB_MODULE_FILE": f"{module_name}.mod"},
    )
    return script_paths


def compute_clip_roi_metrics(mp4_path):
    path = Path(mp4_path)
    if not path.exists():
        return {}

    cap = cv2.VideoCapture(str(path))
    ok, baseline = cap.read()
    if not ok:
        cap.release()
        return {}

    height, width = baseline.shape[:2]
    x1, x2 = int(width * 0.34), int(width * 0.68)
    y1, y2 = int(height * 0.25), int(height * 0.72)
    baseline_roi = baseline[y1:y2, x1:x2]
    max_mean_delta = 0.0
    max_changed_ratio = 0.0
    max_color_changed_ratio = 0.0
    max_bright_ratio = 0.0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            roi = frame[y1:y2, x1:x2]
            diff = cv2.absdiff(roi, baseline_roi)
            gray = cv2.cvtColor(diff, cv2.COLOR_BGR2GRAY)
            hsv = cv2.cvtColor(roi, cv2.COLOR_BGR2HSV)
            color_diff = np.max(diff, axis=2) - np.min(diff, axis=2)
            max_mean_delta = max(max_mean_delta, float(np.mean(gray)))
            max_changed_ratio = max(max_changed_ratio, float(np.mean(gray > 25)))
            max_color_changed_ratio = max(max_color_changed_ratio, float(np.mean((gray > 20) & (color_diff > 20))))
            max_bright_ratio = max(max_bright_ratio, float(np.mean(hsv[:, :, 2] > 210)))
    finally:
        cap.release()

    return {
        "roiMeanDelta": max_mean_delta,
        "roiChangedRatio": max_changed_ratio,
        "roiColorChangedRatio": max_color_changed_ratio,
        "roiBrightRatio": max_bright_ratio,
    }


def summarize(output_dir, rows, script_paths):
    by_row = {}
    clip_summaries = []
    for row in rows:
        stem = Path(row["suggestedFileName"]).stem
        json_path = output_dir / f"{stem}.json"
        data = json.loads(json_path.read_text(encoding="utf-8")) if json_path.exists() else {}
        item = {
            "rowId": row["rowId"],
            "label": row["label"],
            "originalTarget": row["probeOriginalTarget"],
            "variant": row["probeVariant"],
            "captureMode": row["captureMode"],
            "mp4": str(output_dir / row["suggestedFileName"]),
            "bestPng": str(output_dir / f"{stem}_best.png"),
            "json": str(json_path),
            "frames": data.get("frames"),
            "bestMeanDelta": data.get("bestMeanDelta"),
            "meanDelta": data.get("meanDelta"),
            "bestElapsed": data.get("bestElapsed"),
            **compute_clip_roi_metrics(output_dir / f"{stem}.mp4"),
        }
        clip_summaries.append(item)
        by_row.setdefault(row["rowId"], {"label": row["label"], "originalTarget": row["probeOriginalTarget"], "variants": {}})
        by_row[row["rowId"]]["variants"][row["probeVariant"]] = item

    comparisons = []
    for row_id, value in by_row.items():
        object_score = value["variants"].get("object", {}).get("bestMeanDelta")
        location_score = value["variants"].get("location", {}).get("bestMeanDelta")
        better = None
        if isinstance(object_score, (int, float)) and isinstance(location_score, (int, float)):
            if object_score > location_score * 1.5 and object_score - location_score > 0.2:
                better = "object"
            elif location_score > object_score * 1.5 and location_score - object_score > 0.2:
                better = "location"
            else:
                better = "similar"
        comparisons.append(
            {
                "rowId": row_id,
                "label": value["label"],
                "originalTarget": value["originalTarget"],
                "objectBestMeanDelta": object_score,
                "locationBestMeanDelta": location_score,
                "better": better,
            }
        )

    summary = {
        "version": "aurora-vfx-apply-context-probe/v1",
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "outputDir": str(output_dir),
        "scriptPaths": script_paths,
        "clipCount": len(rows),
        "clips": clip_summaries,
        "comparisons": comparisons,
    }
    summary_path = output_dir / "context-probe-summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary_path, comparisons


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-dir", type=Path, default=None)
    parser.add_argument(
        "--window-placement",
        choices=["primary", "secondary", "none"],
        default="secondary",
    )
    parser.add_argument(
        "--isolated",
        action="store_true",
        help="Run each variant in its own NWN launch to avoid VFX tail contamination.",
    )
    parser.add_argument(
        "--row-ids",
        default=None,
        help="Comma-separated visualeffects.2da row ids to probe.",
    )
    parser.add_argument(
        "--original-only",
        action="store_true",
        help="Probe only the catalog-inferred original target context for each row.",
    )
    parser.add_argument(
        "--module-name",
        default=os.environ.get("VFX_LAB_MODULE_NAME", "tlc_vfx_catalog_lab"),
        help="Module resref passed to nwmain +TestNewModule, without .mod.",
    )
    parser.add_argument(
        "--force-object-capture-mode",
        choices=[
            "object_turntable",
            "object_instant",
            "object_head_closeup",
            "object_node_closeup",
            "object_impact_closeup",
            "large_scene",
        ],
        default=None,
        help="Override object-variant capture crop mode for small/large VFX reruns.",
    )
    parser.add_argument(
        "--inter-effect-gap-seconds",
        type=float,
        default=10.0,
        help="Delay between queued probe clips when not isolated.",
    )
    args = parser.parse_args()

    output_dir = args.output_dir or DEFAULT_OUTPUT_ROOT / time.strftime("%Y%m%d-%H%M%S")
    output_dir.mkdir(parents=True, exist_ok=True)

    cap = load_capture_module()
    cap.MODULE_NAME = args.module_name
    cap.configure_output_dir(output_dir)
    cap.FPS = 16.0
    cap.PRE_PAD_SECONDS = 0.75
    cap.POST_PAD_SECONDS = 1.0

    row_ids = None
    if args.row_ids:
        row_ids = {int(value.strip()) for value in args.row_ids.split(",") if value.strip()}
    rows = build_probe_rows(
        row_ids=row_ids,
        isolated=args.isolated,
        original_only=args.original_only,
        force_object_capture_mode=args.force_object_capture_mode,
        inter_effect_gap_seconds=args.inter_effect_gap_seconds,
    )
    script_paths = write_and_compile_probe_scripts(cap, rows, args.module_name)
    sequences = []
    for script_name in sorted({row["scriptName"] for row in rows}):
        script_rows = [row for row in rows if row["scriptName"] == script_name]
        sequences.append(
            {
                "scriptName": script_name,
                "targetMode": "context_probe",
                "firstRow": script_rows[0]["rowId"],
                "lastRow": script_rows[-1]["rowId"],
                "rowCount": len(script_rows),
                "durationSeconds": max(row["endSeconds"] for row in script_rows),
                "clips": script_rows,
            }
        )
    (output_dir / "context-probe-input.json").write_text(
        json.dumps({"sequences": sequences, "rows": rows, "isolated": args.isolated}, indent=2),
        encoding="utf-8",
    )

    capture_args = SimpleNamespace(
        window_placement=args.window_placement,
        no_activate_window=False,
        preserve_existing_nwn=True,
    )
    results = []
    for sequence in sequences:
        sequence_rows = [row for row in rows if row["scriptName"] == sequence["scriptName"]]
        results.append(cap.capture_sequence(sequence, sequence_rows, capture_args))
    summary_path, comparisons = summarize(output_dir, rows, script_paths)

    print(json.dumps({"results": results, "summaryPath": str(summary_path), "comparisons": comparisons}, indent=2))


if __name__ == "__main__":
    main()
