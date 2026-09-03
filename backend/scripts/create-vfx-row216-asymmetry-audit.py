from __future__ import annotations

import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont


REPO_ROOT = Path(__file__).resolve().parents[2]
ROW_ROOT = (
    REPO_ROOT
    / "backend"
    / "docs"
    / "aurora-reverse"
    / "evidence"
    / "vfx-nwn-broad-proof-2026-07-16"
    / "row216"
)
NWN_STILL = ROW_ROOT / "nwn" / "validated-steady.png"
WEB_STILL = (
    ROW_ROOT
    / "aurora-web"
    / "preflight"
    / "vfx-broad-row216-time-2-current-global-runtime-20260812.png"
)
WEB_PAYLOAD = REPO_ROOT / "frontend" / "public" / "dev-fixtures" / "vfx-broad-row216" / "payload.json"
OUTPUT_ROOT = ROW_ROOT / "comparison" / "asymmetry-audit-20260812"
OUTPUT_IMAGE = OUTPUT_ROOT / "row216-asymmetry-diagnostic.png"
OUTPUT_METRICS = OUTPUT_ROOT / "row216-asymmetry-metrics.json"

EXPECTED_SHA256 = {
    NWN_STILL: "93fd93d248b124fcc050852d5aca7b68b0bc4a7d4cdaed62805ac8008436ae0e",
    WEB_STILL: "4e2ea0aa315de8dc85b418721da7ad95f35d87620ee0c03e2366a6f23b6819cf",
    WEB_PAYLOAD: "fec4b8040bd65edb5822fedfd2e73878e931a34e997bfe6f08a26a644bf8f61d",
}
EXPECTED_MODEL_SHA256 = "89561022afa322832b3c034b21c9b5a69d2c6e9e8caec762a76c21092f4b27bc"
CORE_RGB_MINIMUM = (245, 225, 100)
SAMPLE_TIME_SECONDS = 2.0


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def relative_path(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    font_name = "arialbd.ttf" if bold else "arial.ttf"
    font_path = Path("C:/Windows/Fonts") / font_name
    return ImageFont.truetype(str(font_path), size) if font_path.exists() else ImageFont.load_default()


def validate_inputs() -> None:
    for path, expected_hash in EXPECTED_SHA256.items():
        if not path.exists():
            raise RuntimeError(f"Missing audit input: {path}")
        if sha256(path) != expected_hash:
            raise RuntimeError(f"Immutable audit input hash changed: {path}")
    if OUTPUT_IMAGE.exists() or OUTPUT_METRICS.exists():
        raise RuntimeError("Asymmetry audit outputs already exist; reuse the immutable artifacts.")


def core_mask(image_bgr: np.ndarray) -> np.ndarray:
    image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    minimum = np.asarray(CORE_RGB_MINIMUM, dtype=np.uint8)
    return np.all(image_rgb >= minimum, axis=2).astype(np.uint8)


def axis_measurement(xs: np.ndarray, ys: np.ndarray, *, label: str) -> dict[str, object]:
    points = np.column_stack((xs, ys)).astype(np.float64)
    eigenvalues, eigenvectors = np.linalg.eigh(np.cov(points, rowvar=False))
    vector = eigenvectors[:, int(np.argmax(eigenvalues))]
    if vector[1] > 0:
        vector = -vector
    angle = math.degrees(math.atan2(float(vector[0]), float(-vector[1])))
    return {
        "label": label,
        "pixelCount": int(points.shape[0]),
        "bbox": {
            "minX": int(xs.min()),
            "minY": int(ys.min()),
            "maxX": int(xs.max()),
            "maxY": int(ys.max()),
        },
        "centroid": {"x": float(xs.mean()), "y": float(ys.mean())},
        "principalAxis": {"x": float(vector[0]), "y": float(vector[1])},
        "signedAngleDegreesFromVertical": angle,
        "absoluteAngleDegreesFromVertical": abs(angle),
    }


def measure_nwn(mask: np.ndarray) -> list[dict[str, object]]:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    candidates: list[tuple[int, int]] = []
    for component_id in range(1, count):
        area = int(stats[component_id, cv2.CC_STAT_AREA])
        if area >= 50:
            candidates.append((area, component_id))
    selected = sorted(candidates, reverse=True)[:2]
    if len(selected) != 2:
        raise RuntimeError("Expected two dominant NWN core components.")
    measurements = []
    for _, component_id in selected:
        ys, xs = np.where(labels == component_id)
        measurements.append(axis_measurement(xs, ys, label="unassigned"))
    measurements.sort(key=lambda value: float(value["centroid"]["x"]))
    measurements[0]["label"] = "left-core"
    measurements[1]["label"] = "right-core"
    return measurements


def measure_web(mask: np.ndarray) -> list[dict[str, object]]:
    midpoint = mask.shape[1] // 2
    measurements = []
    for label, start_x, end_x in (
        ("left-core", 0, midpoint),
        ("right-core", midpoint, mask.shape[1]),
    ):
        ys, local_xs = np.where(mask[:, start_x:end_x] > 0)
        if len(local_xs) == 0:
            raise RuntimeError(f"No Web core pixels found for {label}.")
        measurements.append(axis_measurement(local_xs + start_x, ys, label=label))
    return measurements


def magnitude_delta(measurements: list[dict[str, object]]) -> float:
    return abs(
        float(measurements[0]["absoluteAngleDegreesFromVertical"])
        - float(measurements[1]["absoluteAngleDegreesFromVertical"])
    )


def rotate_local_z(orientation: dict[str, object]) -> list[float]:
    axis = np.asarray(orientation["axis"], dtype=np.float64)
    axis /= np.linalg.norm(axis)
    angle = float(orientation["angleRadians"])
    vector = np.asarray((0.0, 0.0, 1.0), dtype=np.float64)
    rotated = (
        vector * math.cos(angle)
        + np.cross(axis, vector) * math.sin(angle)
        + axis * np.dot(axis, vector) * (1.0 - math.cos(angle))
    )
    return [float(value) for value in rotated]


def emitter_source_facts(source_graph: dict[str, object], emitter_name: str) -> dict[str, object]:
    nodes = source_graph["nodes"]
    emitter = next(node for node in nodes if node.get("nodeKind") == "emitter" and node.get("nodeName") == emitter_name)
    parent = next(node for node in nodes if node.get("nodeName") == emitter["parentNodeName"])
    reference = emitter["referenceNodes"][0]
    transform_track_properties = {
        row.get("property")
        for animation in emitter.get("animationPasses", [])
        for row in animation.get("emitterState", {}).get("keyRows", [])
        if row.get("property") in {"position", "orientation"}
    }
    return {
        "emitterName": emitter_name,
        "parent": {
            "nodeName": parent["nodeName"],
            "transform": parent["transform"],
        },
        "localTransform": emitter["transform"],
        "reference": {
            "nodeName": reference["nodeName"],
            "transform": reference["transform"],
        },
        "transformAnimationTracks": sorted(transform_track_properties),
        "simulation": {
            key: emitter["simulation"][key]
            for key in ("velocity", "randvel", "spread", "grav", "drag", "p2p", "inherit", "p2pType")
        },
    }


def runtime_measurement(runtime_emitters: list[dict[str, object]], emitter_name: str) -> tuple[dict[str, object], list[dict[str, object]]]:
    emitter = next(item for item in runtime_emitters if item["emitterNodeName"] == emitter_name)
    frame = min(emitter["runtimeFrames"], key=lambda item: abs(float(item["timeSeconds"]) - SAMPLE_TIME_SECONDS))
    records = frame["renderContract"]["drawRecords"]
    if not records:
        raise RuntimeError(f"No draw records for {emitter_name} at t=2 seconds.")
    orientation = records[0]["emitterOrientation"]
    direction = rotate_local_z(orientation)
    positions = [record["position"] for record in records]
    return {
        "emitterName": emitter_name,
        "sampleTimeSeconds": float(frame["timeSeconds"]),
        "drawRecordCount": len(records),
        "worldOrientation": orientation,
        "worldLocalZDirection": direction,
        "azimuthDegrees": math.degrees(math.atan2(direction[0], direction[1])),
        "elevationDegrees": math.degrees(math.asin(max(-1.0, min(1.0, direction[2])))),
        "bounds": {
            axis: {"min": min(float(value[axis]) for value in positions), "max": max(float(value[axis]) for value in positions)}
            for axis in ("x", "y", "z")
        },
    }, records


def mirror_measurement(first: list[dict[str, object]], second: list[dict[str, object]]) -> dict[str, object]:
    first_by_id = {int(record["particleId"]): record for record in first}
    second_by_id = {int(record["particleId"]): record for record in second}
    particle_ids = sorted(first_by_id.keys() & second_by_id.keys())
    source_center_x = float(first[0]["previousPosition"]["x"])
    residuals = []
    for particle_id in particle_ids:
        first_position = first_by_id[particle_id]["position"]
        second_position = second_by_id[particle_id]["position"]
        residuals.append(
            math.sqrt(
                (float(first_position["x"]) + float(second_position["x"]) - 2.0 * source_center_x) ** 2
                + (float(first_position["y"]) - float(second_position["y"])) ** 2
                + (float(first_position["z"]) - float(second_position["z"])) ** 2
            )
        )
    return {
        "pairedParticleCount": len(particle_ids),
        "mirrorPlaneX": source_center_x,
        "rmsResidualMeters": math.sqrt(sum(value * value for value in residuals) / len(residuals)),
        "maxResidualMeters": max(residuals),
    }


def annotate_frame(image_bgr: np.ndarray, measurements: list[dict[str, object]]) -> Image.Image:
    annotated = image_bgr.copy()
    colors = ((0, 220, 255), (255, 150, 50))
    for measurement, color in zip(measurements, colors, strict=True):
        bbox = measurement["bbox"]
        center = measurement["centroid"]
        axis = measurement["principalAxis"]
        cv2.rectangle(
            annotated,
            (int(bbox["minX"]), int(bbox["minY"])),
            (int(bbox["maxX"]), int(bbox["maxY"])),
            color,
            3,
        )
        start = (
            int(float(center["x"]) - float(axis["x"]) * 135),
            int(float(center["y"]) - float(axis["y"]) * 135),
        )
        end = (
            int(float(center["x"]) + float(axis["x"]) * 135),
            int(float(center["y"]) + float(axis["y"]) * 135),
        )
        cv2.arrowedLine(annotated, start, end, color, 4, cv2.LINE_AA, tipLength=0.08)
    return Image.fromarray(cv2.cvtColor(annotated, cv2.COLOR_BGR2RGB))


def fit_panel(source: Image.Image, size: tuple[int, int]) -> Image.Image:
    panel = Image.new("RGB", size, "#101417")
    fitted = source.copy()
    fitted.thumbnail((size[0] - 24, size[1] - 24), Image.Resampling.LANCZOS)
    panel.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2))
    return panel


def create_visual(
    nwn_image: np.ndarray,
    web_image: np.ndarray,
    nwn_measurements: list[dict[str, object]],
    web_measurements: list[dict[str, object]],
) -> None:
    canvas = Image.new("RGB", (1600, 900), "#182026")
    draw = ImageDraw.Draw(canvas)
    draw.text((28, 18), "row216 | authored-angle asymmetry audit", fill="#ffffff", font=load_font(30, bold=True))
    draw.text(
        (28, 57),
        "DIAGNOSTIC ONLY: screen-space RGB threshold; camera, actors and occlusion differ",
        fill="#f4c96b",
        font=load_font(18, bold=True),
    )
    canvas.paste(fit_panel(annotate_frame(nwn_image, nwn_measurements), (780, 660)), (15, 108))
    canvas.paste(fit_panel(annotate_frame(web_image, web_measurements), (780, 660)), (805, 108))
    draw.text((36, 120), "NWN retail saved oracle", fill="#ffffff", font=load_font(21, bold=True))
    draw.text((826, 120), "Aurora Web current preflight, t=2 s", fill="#ffffff", font=load_font(21, bold=True))
    nwn_delta = magnitude_delta(nwn_measurements)
    web_delta = magnitude_delta(web_measurements)
    draw.text(
        (36, 790),
        f"NWN | |left|-|right| = {nwn_delta:.3f} deg",
        fill="#ffffff",
        font=load_font(21, bold=True),
    )
    draw.text(
        (826, 790),
        f"Web | |left|-|right| = {web_delta:.3f} deg",
        fill="#ffffff",
        font=load_font(21, bold=True),
    )
    draw.text(
        (28, 838),
        "Hard finding comes from exact MDL transforms + Aurora decompilation; this image only quantifies the visible mismatch.",
        fill="#c7d1d8",
        font=load_font(17),
    )
    canvas.save(OUTPUT_IMAGE, optimize=True)


def main() -> None:
    validate_inputs()
    nwn_image = cv2.imread(str(NWN_STILL))
    web_image = cv2.imread(str(WEB_STILL))
    if nwn_image is None or web_image is None:
        raise RuntimeError("An audit still did not decode.")
    nwn_measurements = measure_nwn(core_mask(nwn_image))
    web_measurements = measure_web(core_mask(web_image))

    payload = json.loads(WEB_PAYLOAD.read_text(encoding="utf-8"))
    contracts = payload["contracts"]
    source_graph = contracts["sourceModelGraph"]
    if source_graph["sourceModelHash"] != EXPECTED_MODEL_SHA256:
        raise RuntimeError("The exact row216 source model hash changed.")
    source_emitters = [
        emitter_source_facts(source_graph, emitter_name)
        for emitter_name in ("Fire01", "Fire02")
    ]
    fire01_runtime, fire01_records = runtime_measurement(contracts["runtimeEmitters"], "Fire01")
    fire02_runtime, fire02_records = runtime_measurement(contracts["runtimeEmitters"], "Fire02")

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    create_visual(nwn_image, web_image, nwn_measurements, web_measurements)
    metrics = {
        "version": "aurora-vfx-row216-asymmetry-audit/v1",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "diagnostic-only-not-runtime-parity-proof",
        "inputs": [
            {
                "path": relative_path(path),
                "sha256": EXPECTED_SHA256[path],
            }
            for path in (NWN_STILL, WEB_STILL, WEB_PAYLOAD)
        ],
        "screenSpaceDiagnostic": {
            "threshold": {"minimumRgbInclusive": list(CORE_RGB_MINIMUM)},
            "nwn": {
                "imageSize": {"width": int(nwn_image.shape[1]), "height": int(nwn_image.shape[0])},
                "components": nwn_measurements,
                "absoluteAngleMagnitudeDeltaDegrees": magnitude_delta(nwn_measurements),
            },
            "auroraWeb": {
                "imageSize": {"width": int(web_image.shape[1]), "height": int(web_image.shape[0])},
                "components": web_measurements,
                "absoluteAngleMagnitudeDeltaDegrees": magnitude_delta(web_measurements),
            },
            "limitations": [
                "NWN includes live actors, actor occlusion and the retail scene; the Web still does not.",
                "Camera and projection are not matched.",
                "RGB thresholding measures the bright screen-space core and is not a 3D transform oracle.",
            ],
        },
        "sourceModel": {
            "fileName": source_graph["sourceModelFileName"],
            "sha256": source_graph["sourceModelHash"],
            "emitters": source_emitters,
            "finding": "Fire01 and Fire02 have distinct authored static local hierarchies and reference offsets.",
        },
        "auroraWebRuntimeAtTwoSeconds": {
            "emitters": [fire01_runtime, fire02_runtime],
            "mirroredCurveResidual": mirror_measurement(fire01_records, fire02_records),
            "finding": "The exact source orientations remain distinct, but the resulting static-host curves are nearly mirrored.",
        },
        "primaryAuroraEvidence": [
            {
                "function": "FUN_00a2625c",
                "decompilationLine": 852744,
                "finding": "Particle orientation is initialized from the emitter owner world orientation and used to derive launch velocity.",
            },
            {
                "function": "FUN_00a264c0",
                "decompilationLine": 852921,
                "finding": "Authored spread rotates the launch orientation; row216 Fire01/Fire02 have spread=0 and randvel=0.",
            },
            {
                "function": "CAurBehaviorAttach::UpdateGobPosition",
                "address": "0x49f470",
                "finding": "The retail Type 7 attachment refreshes source and target part position/orientation every frame.",
            },
            {
                "function": "Gob::ReattachReference",
                "address": "0x43fc50",
                "finding": "The beam root is rotated with RotationArc(currentRootZDir, target-source) and qArc*qRoot.",
            },
        ],
        "decision": {
            "runtimeAngleTuningAuthorized": False,
            "reason": "Exact authored emitter angles are already parsed and preserved; arbitrary offsets would contradict source and primary runtime evidence.",
            "nextSharedImplementationTarget": "Provide exact per-frame source/target Impact attachment animation to the existing EffectBeam Type 7 runtime resolver and reproduce the retail proof scene before reassessing particle math.",
        },
        "xoreos": {"consulted": False},
        "output": {
            "diagnosticImagePath": relative_path(OUTPUT_IMAGE),
            "diagnosticImageSha256": sha256(OUTPUT_IMAGE),
        },
    }
    OUTPUT_METRICS.write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "image": relative_path(OUTPUT_IMAGE),
        "imageSha256": sha256(OUTPUT_IMAGE),
        "metrics": relative_path(OUTPUT_METRICS),
        "metricsSha256": sha256(OUTPUT_METRICS),
        "nwnAngleMagnitudeDeltaDegrees": magnitude_delta(nwn_measurements),
        "webAngleMagnitudeDeltaDegrees": magnitude_delta(web_measurements),
    }, indent=2))


if __name__ == "__main__":
    main()
