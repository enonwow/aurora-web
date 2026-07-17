#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const DEFAULT_SOURCE_PACK =
  "backend/docs/aurora-reverse/artifacts/areas-runtime-capture/enon_bakery-proof-20260703Tcurrent-nonstatic-vt";
const DEFAULT_FRAME =
  "backend/docs/aurora-reverse/artifacts/areas-runtime-capture/enon_bakery-proof-20260703Tcurrent-nonstatic-vt/web-frame.json";
const DEFAULT_BASE_URL = "http://127.0.0.1:5335/_aurora/v1";
const DEFAULT_AREA_ID = "area_enon_bakery";

function readArgs(argv) {
  const options = {
    sourcePack: DEFAULT_SOURCE_PACK,
    frame: DEFAULT_FRAME,
    baseUrl: DEFAULT_BASE_URL,
    areaId: DEFAULT_AREA_ID,
    username: "builder.user",
    password: "builder123",
    offline: true,
    requireVisualEvidence: true,
    allowPartialSharedRenderer: false,
    allowPartialTextureReadiness: false,
    visualComparison: "",
    out: ""
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--sourcePack" && next) {
      options.sourcePack = next;
      index += 1;
    } else if (arg === "--frame" && next) {
      options.frame = next;
      index += 1;
    } else if (arg === "--baseUrl" && next) {
      options.baseUrl = next.replace(/\/+$/u, "");
      index += 1;
    } else if (arg === "--areaId" && next) {
      options.areaId = next;
      index += 1;
    } else if (arg === "--username" && next) {
      options.username = next;
      index += 1;
    } else if (arg === "--password" && next) {
      options.password = next;
      index += 1;
    } else if (arg === "--online") {
      options.offline = false;
    } else if (arg === "--offline") {
      options.offline = true;
    } else if (arg === "--skipVisualEvidence") {
      options.requireVisualEvidence = false;
    } else if (arg === "--requireVisualEvidence") {
      options.requireVisualEvidence = true;
    } else if (arg === "--allowPartialSharedRenderer") {
      options.allowPartialSharedRenderer = true;
    } else if (arg === "--allowPartialTextureReadiness") {
      options.allowPartialTextureReadiness = true;
    } else if (arg === "--visualComparison" && next) {
      options.visualComparison = next;
      index += 1;
    } else if (arg === "--out" && next) {
      options.out = next;
      index += 1;
    }
  }
  return options;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === "\"") {
        if (text[index + 1] === "\"") {
          field += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === "\"") {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/u, ""));
    rows.push(row);
  }
  const [headers, ...body] = rows;
  return body
    .filter((entry) => headers && entry.length === headers.length)
    .map((entry) => Object.fromEntries(headers.map((header, index) => [header, entry[index]])));
}

function readCsv(filePath) {
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, ""));
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function normalizeResref(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 64);
}

function kindPrefix(kind) {
  if (kind === "creature") return "cre";
  if (kind === "encounter") return "enc";
  if (kind === "item") return "itm";
  if (kind === "door") return "dr";
  if (kind === "sound") return "snd";
  if (kind === "store") return "sto";
  if (kind === "trigger") return "trg";
  if (kind === "waypoint") return "wpt";
  return "plc";
}

function buildTemplateId(kind, prefix, resref) {
  if (["door", "sound", "store", "trigger", "waypoint"].includes(kind)) {
    return resref.slice(0, 80);
  }
  return (new RegExp(`^${prefix}_`, "iu").test(resref) ? resref : `${prefix}_${resref}`).slice(
    0,
    80
  );
}

function buildObjectId(row, usedIds) {
  const prefix = kindPrefix(row.kind);
  const tag = normalizeResref(row.tag);
  const resref = normalizeResref(row.templateResRef);
  const baseToken = tag || resref || `entry_${Number(row.listIndex) + 1}`;
  const base = `obj_${prefix}_${baseToken}`.slice(0, 72);
  if (!usedIds.has(base)) {
    usedIds.add(base);
    return base;
  }
  for (let suffix = 2; suffix < 9999; suffix += 1) {
    const candidate = `${base}_${suffix}`.slice(0, 80);
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      return candidate;
    }
  }
  throw new Error(`Could not allocate objectId for ${base}`);
}

function numberOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clampCoordinate(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)) : 0;
}

function clampScale(value) {
  return Number.isFinite(value) && value > 0 ? Number(value.toFixed(4)) : 1;
}

function clampRadians(value) {
  return Number.isFinite(value) ? Number(value.toFixed(6)) : 0;
}

function clampBearing(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number((((value % 360) + 360) % 360).toFixed(4));
}

function degreesToRadians(value) {
  return Number.isFinite(value) ? (value * Math.PI) / 180 : 0;
}

function close(left, right, epsilon = 1e-5) {
  return Math.abs(Number(left ?? 0) - Number(right ?? 0)) <= epsilon;
}

function closeAngle(left, right, epsilon = 1e-5) {
  const leftNumber = Number(left ?? 0);
  const rightNumber = Number(right ?? 0);
  let delta = Math.abs(leftNumber - rightNumber) % (Math.PI * 2);
  if (delta > Math.PI) {
    delta = Math.PI * 2 - delta;
  }
  return delta <= epsilon;
}

const AREA_VISUAL_TRANSFORM_YAW_COMPOSITION =
  "placementMatrix * visualTransformMatrix";
const AREA_VISUAL_TRANSFORM_AXIS_MAPPING =
  "aurora-basis-matrix x/y/z -> three x/z/y; scale and offset use the same basis; rotation uses basis(AuroraEulerXYZ)";
const AURORA_TO_THREE_VISUAL_BASIS_3X3 = [
  [1, 0, 0],
  [0, 0, 1],
  [0, 1, 0]
];

function expectedObjectRenderYaw(row, bearingRadians, visualTransform) {
  void row;
  const renderMatrix = multiplyMatrix3(
    rotationY3(-bearingRadians),
    auroraVisualRotationToThreeMatrix3(visualTransform)
  );
  return clampRadians(eulerXyzYFromMatrix3(renderMatrix));
}

function expectedObjectYawComposition(row) {
  void row;
  return AREA_VISUAL_TRANSFORM_YAW_COMPOSITION;
}

function auroraVisualRotationToThreeMatrix3(visualTransform) {
  if (!visualTransform) {
    return identityMatrix3();
  }
  const auroraRotation = eulerXyzMatrix3(
    visualTransform.pitch ?? 0,
    visualTransform.roll ?? 0,
    visualTransform.yaw ?? 0
  );
  return multiplyMatrix3(
    multiplyMatrix3(AURORA_TO_THREE_VISUAL_BASIS_3X3, auroraRotation),
    AURORA_TO_THREE_VISUAL_BASIS_3X3
  );
}

function identityMatrix3() {
  return [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1]
  ];
}

function rotationY3(angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c]
  ];
}

function eulerXyzMatrix3(x, y, z) {
  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);
  return [
    [cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz],
    [cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz],
    [-sy, sx * cy, cx * cy]
  ];
}

function multiplyMatrix3(left, right) {
  return [
    [
      left[0][0] * right[0][0] + left[0][1] * right[1][0] + left[0][2] * right[2][0],
      left[0][0] * right[0][1] + left[0][1] * right[1][1] + left[0][2] * right[2][1],
      left[0][0] * right[0][2] + left[0][1] * right[1][2] + left[0][2] * right[2][2]
    ],
    [
      left[1][0] * right[0][0] + left[1][1] * right[1][0] + left[1][2] * right[2][0],
      left[1][0] * right[0][1] + left[1][1] * right[1][1] + left[1][2] * right[2][1],
      left[1][0] * right[0][2] + left[1][1] * right[1][2] + left[1][2] * right[2][2]
    ],
    [
      left[2][0] * right[0][0] + left[2][1] * right[1][0] + left[2][2] * right[2][0],
      left[2][0] * right[0][1] + left[2][1] * right[1][1] + left[2][2] * right[2][1],
      left[2][0] * right[0][2] + left[2][1] * right[1][2] + left[2][2] * right[2][2]
    ]
  ];
}

function eulerXyzYFromMatrix3(matrix) {
  const m13 = Math.max(-1, Math.min(1, matrix[0][2]));
  return Math.asin(m13);
}

function pushNumberDiff(diffs, id, field, expected, actual, epsilon = 1e-5) {
  if (!close(expected, actual, epsilon)) {
    diffs.push({ id, field, expected, actual });
  }
}

function expectedVisualTransform(row) {
  return {
    scale: clampScale(
      (numberOr(row.vtScaleX, 1) + numberOr(row.vtScaleY, 1) + numberOr(row.vtScaleZ, 1)) /
        3
    ),
    scaleX: clampScale(numberOr(row.vtScaleX, 1)),
    scaleY: clampScale(numberOr(row.vtScaleY, 1)),
    scaleZ: clampScale(numberOr(row.vtScaleZ, 1)),
    offsetX: clampCoordinate(numberOr(row.vtTranslateX) / 10),
    offsetY: clampCoordinate(numberOr(row.vtTranslateY) / 10),
    offsetZ: clampCoordinate(numberOr(row.vtTranslateZ) / 10),
    pitch: clampRadians(degreesToRadians(numberOr(row.vtRotateX))),
    yaw: clampRadians(degreesToRadians(numberOr(row.vtRotateZ))),
    roll: clampRadians(degreesToRadians(numberOr(row.vtRotateY)))
  };
}

function parseVisualTransformEvidence(value) {
  const parsed = {};
  if (typeof value !== "string") {
    return parsed;
  }
  for (const part of value.split(",")) {
    const equalsIndex = part.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }
    parsed[part.slice(0, equalsIndex)] = Number(part.slice(equalsIndex + 1));
  }
  return parsed;
}

function pushEvidenceNumberMismatch(failures, id, field, expected, actual, epsilon = 1e-5) {
  if (!close(expected, actual, epsilon)) {
    failures.push({
      code: "visual_transform_runtime_value_mismatch",
      id,
      field,
      expected,
      actual
    });
  }
}

function pushEvidenceAngleMismatch(failures, id, field, expected, actual, epsilon = 1e-5) {
  if (!closeAngle(expected, actual, epsilon)) {
    failures.push({
      code: "visual_transform_runtime_angle_mismatch",
      id,
      field,
      expected,
      actual: clampRadians(actual)
    });
  }
}

function verifyVisualTransformRuntimeEvidence(sourceRows, evidencePath, options) {
  const failures = [];
  let runtime = null;
  try {
    runtime = readJson(evidencePath);
  } catch (error) {
    return {
      status: "failed",
      path: evidencePath,
      failures: [
        {
          code: "visual_transform_runtime_unreadable",
          path: evidencePath,
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }

  const entries = Array.isArray(runtime.entries) ? runtime.entries : [];
  const expectedRows = prepareSourceRuntimeRows(sourceRows).filter(
    (row) => row.hasNonDefaultVisualTransform
  );
  const nonStaticExpectedRows = expectedRows.filter((row) => !row.isStatic);
  const expectedById = new Map(expectedRows.map((row) => [row.id, row]));
  const entriesById = new Map();
  for (const entry of entries) {
    if (!entry?.sourceId) {
      failures.push({
        code: "visual_transform_runtime_entry_missing_source_id",
        entry
      });
      continue;
    }
    if (entriesById.has(entry.sourceId)) {
      failures.push({
        code: "visual_transform_runtime_duplicate_source_id",
        id: entry.sourceId
      });
      continue;
    }
    entriesById.set(entry.sourceId, entry);
  }

  const expectedAreaResref = options.areaId.replace(/^area_/u, "");
  if (runtime.areaResref && runtime.areaResref !== expectedAreaResref) {
    failures.push({
      code: "visual_transform_runtime_area_resref_mismatch",
      expected: expectedAreaResref,
      actual: runtime.areaResref
    });
  }
  if (runtime.count !== entries.length) {
    failures.push({
      code: "visual_transform_runtime_count_does_not_match_entries",
      count: runtime.count,
      entries: entries.length
    });
  }
  if (entries.length !== expectedRows.length) {
    failures.push({
      code: "visual_transform_runtime_entry_count_mismatch",
      expected: expectedRows.length,
      actual: entries.length
    });
  }
  if (nonStaticExpectedRows.length < 1) {
    failures.push({
      code: "visual_transform_runtime_non_static_source_rows_missing"
    });
  }

  for (const expected of expectedRows) {
    const entry = entriesById.get(expected.id);
    if (!entry) {
      failures.push({
        code: "visual_transform_runtime_entry_missing",
        id: expected.id
      });
      continue;
    }

    const expectedObjectId = `${options.areaId}:${expected.id}`;
    if (entry.objectId && entry.objectId !== expectedObjectId) {
      failures.push({
        code: "visual_transform_runtime_object_id_mismatch",
        id: expected.id,
        expected: expectedObjectId,
        actual: entry.objectId
      });
    }
    if (entry.templateId && entry.templateId !== expected.templateId) {
      failures.push({
        code: "visual_transform_runtime_template_id_mismatch",
        id: expected.id,
        expected: expected.templateId,
        actual: entry.templateId
      });
    }

    const visualTransform = parseVisualTransformEvidence(entry.visualTransform);
    pushEvidenceNumberMismatch(
      failures,
      expected.id,
      "visualTransform.scale",
      expected.visualTransform.scale,
      visualTransform.scale,
      1e-5
    );
    for (const field of ["scaleX", "scaleY", "scaleZ", "offsetX", "offsetY", "offsetZ"]) {
      pushEvidenceNumberMismatch(
        failures,
        expected.id,
        `visualTransform.${field}`,
        expected.visualTransform[field],
        visualTransform[field],
        1e-5
      );
    }
    for (const field of ["pitch", "yaw", "roll"]) {
      pushEvidenceAngleMismatch(
        failures,
        expected.id,
        `visualTransform.${field}`,
        expected.visualTransform[field],
        visualTransform[field],
        1e-5
      );
    }

    pushEvidenceAngleMismatch(
      failures,
      expected.id,
      "renderTransform.sourceBearing",
      expected.sourcePlacement.bearing,
      entry.renderTransform?.sourceBearing,
      1e-5
    );
    pushEvidenceAngleMismatch(
      failures,
      expected.id,
      "renderTransform.renderYaw",
      expected.expectedRenderYaw,
      entry.renderTransform?.renderYaw,
      1e-5
    );
    const expectedYawComposition =
      expected.expectedYawComposition ?? expectedObjectYawComposition(expected);
    if (entry.renderTransform?.yawComposition !== expectedYawComposition) {
      failures.push({
        code: "visual_transform_runtime_yaw_composition_mismatch",
        id: expected.id,
        expected: expectedYawComposition,
        actual: entry.renderTransform?.yawComposition
      });
    }
    if (
      entry.renderTransform?.axisMapping !== AREA_VISUAL_TRANSFORM_AXIS_MAPPING
    ) {
      failures.push({
        code: "visual_transform_runtime_axis_mapping_mismatch",
        id: expected.id,
        expected: AREA_VISUAL_TRANSFORM_AXIS_MAPPING,
        actual: entry.renderTransform?.axisMapping
      });
    }

    pushEvidenceNumberMismatch(
      failures,
      expected.id,
      "rootPosition.x",
      expected.renderAnchorVector.x,
      entry.rootPosition?.x,
      1e-5
    );
    pushEvidenceNumberMismatch(
      failures,
      expected.id,
      "rootPosition.y",
      expected.renderAnchorVector.y,
      entry.rootPosition?.y,
      1e-5
    );
    pushEvidenceNumberMismatch(
      failures,
      expected.id,
      "rootPosition.z",
      expected.renderAnchorVector.z,
      entry.rootPosition?.z,
      1e-5
    );

    const expectedScaleX = expected.visualTransform.scaleX ?? expected.visualTransform.scale;
    const expectedScaleY = expected.visualTransform.scaleZ ?? expected.visualTransform.scale;
    const expectedScaleZ = expected.visualTransform.scaleY ?? expected.visualTransform.scale;
    pushEvidenceNumberMismatch(failures, expected.id, "rootScale.x", expectedScaleX, entry.rootScale?.x, 1e-5);
    pushEvidenceNumberMismatch(failures, expected.id, "rootScale.y", expectedScaleY, entry.rootScale?.y, 1e-5);
    pushEvidenceNumberMismatch(failures, expected.id, "rootScale.z", expectedScaleZ, entry.rootScale?.z, 1e-5);
    pushEvidenceNumberMismatch(
      failures,
      expected.id,
      "renderTransform.scale.x",
      expectedScaleX,
      entry.renderTransform?.scale?.x,
      1e-5
    );
    pushEvidenceNumberMismatch(
      failures,
      expected.id,
      "renderTransform.scale.y",
      expectedScaleY,
      entry.renderTransform?.scale?.y,
      1e-5
    );
    pushEvidenceNumberMismatch(
      failures,
      expected.id,
      "renderTransform.scale.z",
      expectedScaleZ,
      entry.renderTransform?.scale?.z,
      1e-5
    );
  }

  for (const entry of entries) {
    if (entry?.sourceId && !expectedById.has(entry.sourceId)) {
      failures.push({
        code: "visual_transform_runtime_unexpected_entry",
        id: entry.sourceId
      });
    }
  }

  return {
    status: failures.length === 0 ? "passed" : "failed",
    path: evidencePath,
    version: runtime.version ?? null,
    expectedCount: expectedRows.length,
    nonStaticExpectedCount: nonStaticExpectedRows.length,
    entryCount: entries.length,
    matchedCount: expectedRows.filter((row) => entriesById.has(row.id)).length,
    matchedNonStaticCount: nonStaticExpectedRows.filter((row) => entriesById.has(row.id)).length,
    failures
  };
}

function pushSemanticFieldMismatch(failures, artifact, field, expected, actual) {
  if (actual !== expected) {
    failures.push({
      code: `${artifact}_field_mismatch`,
      field,
      expected,
      actual
    });
  }
}

function verifyTileRuntimeContractComparisonEvidence(tileRows, evidencePath, computedTiles) {
  const failures = [];
  let comparison = null;
  try {
    comparison = readJson(evidencePath);
  } catch (error) {
    return {
      status: "failed",
      path: evidencePath,
      failures: [
        {
          code: "tile_runtime_contract_comparison_unreadable",
          path: evidencePath,
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }

  const summary = comparison.summary ?? {};
  const expectedTileRows = tileRows.length;
  pushSemanticFieldMismatch(
    failures,
    "tile_runtime_contract_comparison",
    "version",
    "aurora-area-tile-runtime-contract-comparison/v1",
    comparison.version
  );
  for (const field of [
    "sourceRows",
    "runtimeRows",
    "comparedRows",
    "passedRows",
    "indexMatches",
    "rowColMatches",
    "tileIdMatches",
    "modelMatches",
    "areOrientationMatches",
    "setOrientationMatches",
    "renderYawQuarterTurnMatches",
    "renderYawDegreeMatches",
    "imageMapQuarterTurnMatches",
    "imageMapDegreeMatches",
    "heightMatches",
    "auroraWorldCenterMatches",
    "renderCenterMatches"
  ]) {
    pushSemanticFieldMismatch(
      failures,
      "tile_runtime_contract_comparison",
      `summary.${field}`,
      expectedTileRows,
      summary[field]
    );
  }
  pushSemanticFieldMismatch(
    failures,
    "tile_runtime_contract_comparison",
    "summary.mismatchCount",
    0,
    summary.mismatchCount
  );
  pushSemanticFieldMismatch(
    failures,
    "tile_runtime_contract_comparison",
    "summary.missingRuntimeRows",
    0,
    summary.missingRuntimeRows
  );
  pushSemanticFieldMismatch(
    failures,
    "tile_runtime_contract_comparison",
    "summary.allPassed",
    true,
    summary.allPassed
  );
  pushSemanticFieldMismatch(
    failures,
    "tile_runtime_contract_comparison",
    "runtimeReadiness.terrainStatus",
    "ready",
    comparison.runtimeReadiness?.terrainStatus
  );
  pushSemanticFieldMismatch(
    failures,
    "tile_runtime_contract_comparison",
    "runtimeReadiness.loadedTileCount",
    computedTiles.loadedTileCount,
    comparison.runtimeReadiness?.loadedTileCount
  );
  pushSemanticFieldMismatch(
    failures,
    "tile_runtime_contract_comparison",
    "runtimeReadiness.failedTileCount",
    0,
    comparison.runtimeReadiness?.failedTileCount
  );
  pushSemanticFieldMismatch(
    failures,
    "tile_runtime_contract_comparison",
    "runtimeReadiness.materialTextureAppliedTileCount",
    computedTiles.materialTextureAppliedTileCount,
    comparison.runtimeReadiness?.materialTextureAppliedTileCount
  );

  return {
    status: failures.length === 0 ? "passed" : "failed",
    path: evidencePath,
    sourceRows: summary.sourceRows ?? null,
    runtimeRows: summary.runtimeRows ?? null,
    passedRows: summary.passedRows ?? null,
    failureCount: failures.length,
    failures
  };
}

function verifyPlaceablePlacementRuntimeComparisonEvidence(sourceRows, evidencePath, runtimeToSource) {
  const failures = [];
  let comparison = null;
  try {
    comparison = readJson(evidencePath);
  } catch (error) {
    return {
      status: "failed",
      path: evidencePath,
      failures: [
        {
          code: "placeable_placement_runtime_comparison_unreadable",
          path: evidencePath,
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }

  const summary = comparison.summary ?? {};
  const sourceRuntimeRows = prepareSourceRuntimeRows(sourceRows);
  const sourcePlaceableRows = sourceRuntimeRows.filter((row) => row.kind === "placeable").length;
  const sourceDoorRows = sourceRuntimeRows.filter((row) => row.kind === "door").length;
  const visualTransformRows = sourceRuntimeRows.filter(
    (row) => row.hasNonDefaultVisualTransform
  ).length;
  const nonStaticVisualTransformRows = sourceRuntimeRows.filter(
    (row) => row.hasNonDefaultVisualTransform && !row.isStatic
  ).length;
  const unmatchedRows = Array.isArray(comparison.unmatchedSourceRows)
    ? comparison.unmatchedSourceRows
    : [];
  const expectedUnloadedHelperRows = unmatchedRows.filter((row) =>
    classifyExpectedUnloadedAreaHelper(row)
  );
  const unexpectedUnloadedRows = unmatchedRows.filter(
    (row) => !classifyExpectedUnloadedAreaHelper(row)
  );

  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "version",
    "aurora-area-placeable-runtime-placement-comparison/v1",
    comparison.version
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.sourceRows",
    sourceRuntimeRows.length,
    summary.sourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.sourcePlaceableRows",
    sourcePlaceableRows,
    summary.sourcePlaceableRows
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.sourceDoorRows",
    sourceDoorRows,
    summary.sourceDoorRows
  );
  for (const field of [
    "runtimeRows",
    "matchedRuntimeRows",
    "sourcePlacementMatches",
    "renderAnchorMatches",
    "rootPositionMatches",
    "bearingMatches",
    "visualTransformYawMatches",
    "renderYawBearingPlusVisualYawMatches",
    "visualTransformAppliedFlagMatches"
  ]) {
    pushSemanticFieldMismatch(
      failures,
      "placeable_placement_runtime_comparison",
      `summary.${field}`,
      runtimeToSource.matchedRuntimeRows,
      summary[field]
    );
  }
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.failedRuntimeRows",
    0,
    summary.failedRuntimeRows
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.unmatchedSourceRows",
    runtimeToSource.unloadedSourceRows,
    summary.unmatchedSourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.expectedUnloadedHelperRows",
    runtimeToSource.expectedUnloadedHelperRows,
    summary.expectedUnloadedHelperRows
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.unexpectedUnloadedRows",
    0,
    summary.unexpectedUnloadedRows
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.visualTransformSourceRows",
    visualTransformRows,
    summary.visualTransformSourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.matchedVisualTransformSourceRows",
    visualTransformRows,
    summary.matchedVisualTransformSourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.matchedNonStaticVisualTransformSourceRows",
    nonStaticVisualTransformRows,
    summary.matchedNonStaticVisualTransformSourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.unmatchedSourceRowsFullyAccountedFor",
    true,
    summary.unmatchedSourceRowsFullyAccountedFor
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "summary.allRuntimeReadyRowsPassed",
    true,
    summary.allRuntimeReadyRowsPassed
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "unmatchedSourceRows.length",
    runtimeToSource.unloadedSourceRows,
    unmatchedRows.length
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "expectedUnloadedHelperRows.length",
    runtimeToSource.expectedUnloadedHelperRows,
    expectedUnloadedHelperRows.length
  );
  pushSemanticFieldMismatch(
    failures,
    "placeable_placement_runtime_comparison",
    "unexpectedUnloadedRows.length",
    0,
    unexpectedUnloadedRows.length
  );

  return {
    status: failures.length === 0 ? "passed" : "failed",
    path: evidencePath,
    sourceRows: summary.sourceRows ?? null,
    runtimeRows: summary.runtimeRows ?? null,
    expectedUnloadedHelperRows: summary.expectedUnloadedHelperRows ?? null,
    unexpectedUnloadedRows: summary.unexpectedUnloadedRows ?? null,
    failureCount: failures.length,
    failures
  };
}

function findSemanticCheck(semanticChecks, field) {
  return semanticChecks.find((check) => check.field === field) ?? null;
}

function parseSceneBox(value) {
  if (!Array.isArray(value) || value.length !== 4) {
    return null;
  }
  const [left, top, right, bottom] = value.map((entry) => Number(entry));
  if (![left, top, right, bottom].every(Number.isFinite)) {
    return null;
  }
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { left, top, right, bottom, width, height };
}

function summarizeSceneCropAlignmentEvidence(comparison) {
  const evidence = comparison.visualEvidence ?? {};
  const crop = Array.isArray(evidence.cropSize) ? evidence.cropSize.map((entry) => Number(entry)) : [];
  const cropWidth = crop[0];
  const cropHeight = crop[1];
  const toolsetBox = parseSceneBox(evidence.toolsetSceneBox);
  const webBox = parseSceneBox(evidence.webSceneBox);
  const normalization =
    evidence.normalization && typeof evidence.normalization === "object"
      ? evidence.normalization
      : null;
  if (!toolsetBox || !webBox || !Number.isFinite(cropWidth) || !Number.isFinite(cropHeight)) {
    return {
      status: "missing",
      reason: "scene crop metadata missing or invalid",
      toolsetBox: toolsetBox ?? null,
      webBox: webBox ?? null,
      cropSize: Number.isFinite(cropWidth) && Number.isFinite(cropHeight) ? [cropWidth, cropHeight] : null,
      normalization
    };
  }

  const toolsetWidthDelta = Math.abs(cropWidth - toolsetBox.width);
  const toolsetHeightDelta = Math.abs(cropHeight - toolsetBox.height);
  const webHorizontalPad = cropWidth - webBox.width;
  const webVerticalPad = cropHeight - webBox.height;
  const widthRatio = webBox.width / toolsetBox.width;
  const heightRatio = webBox.height / toolsetBox.height;
  const pixelWarningThreshold = 32;
  const ratioWarningThreshold = 0.1;
  const warnings = [];
  if (webHorizontalPad > pixelWarningThreshold || webVerticalPad > pixelWarningThreshold) {
    warnings.push({
      code: "web_scene_crop_smaller_than_normalized_crop",
      webHorizontalPad,
      webVerticalPad,
      pixelWarningThreshold
    });
  }
  if (Math.abs(1 - widthRatio) > ratioWarningThreshold || Math.abs(1 - heightRatio) > ratioWarningThreshold) {
    warnings.push({
      code: "web_scene_box_size_ratio_differs_from_toolset",
      widthRatio: clampCoordinate(widthRatio),
      heightRatio: clampCoordinate(heightRatio),
      ratioWarningThreshold
    });
  }
  if (toolsetWidthDelta > 1 || toolsetHeightDelta > 1) {
    warnings.push({
      code: "toolset_scene_box_does_not_fill_normalized_crop",
      toolsetWidthDelta,
      toolsetHeightDelta
    });
  }
  const normalizedToToolset =
    normalization?.mode === "web-scene-box-resized-to-toolset-scene-box";
  if (normalizedToToolset && toolsetWidthDelta <= 1 && toolsetHeightDelta <= 1) {
    return {
      status: "passed",
      reason: "web scene box is intentionally normalized to the Toolset scene crop",
      cropSize: [cropWidth, cropHeight],
      toolsetBox,
      webBox,
      webHorizontalPad,
      webVerticalPad,
      widthRatio: clampCoordinate(widthRatio),
      heightRatio: clampCoordinate(heightRatio),
      normalization,
      warnings: []
    };
  }

  return {
    status: warnings.length > 0 ? "warning" : "passed",
    reason:
      warnings.length > 0
        ? "visual diff crop alignment needs a fresh/normalized oracle before it can be transform proof"
        : "scene boxes are aligned with the normalized crop",
    cropSize: [cropWidth, cropHeight],
    toolsetBox,
    webBox,
    webHorizontalPad,
    webVerticalPad,
    widthRatio: clampCoordinate(widthRatio),
    heightRatio: clampCoordinate(heightRatio),
    normalization,
    warnings
  };
}

function checkReferencedVisualComparisonFiles(comparisonPath, fields) {
  const checked = [];
  const missing = [];
  const basePath = path.dirname(comparisonPath);
  for (const [group, values] of Object.entries(fields)) {
    if (!values || typeof values !== "object") {
      continue;
    }
    for (const [field, value] of Object.entries(values)) {
      if (typeof value !== "string" || value.trim().length === 0) {
        continue;
      }
      const filePath = path.resolve(basePath, value);
      const entry = { group, field, path: filePath };
      if (fs.existsSync(filePath)) {
        checked.push(entry);
      } else {
        missing.push(entry);
      }
    }
  }
  return { checked, missing };
}

function normalizeVisualDiffStats(diffStats) {
  const stats = diffStats && typeof diffStats === "object" ? diffStats : {};
  const thresholdRatios = {};
  const thresholdCounts = {};
  for (const [threshold, value] of Object.entries(stats.thresholdRatios ?? {})) {
    const ratio = Number(value);
    if (Number.isFinite(ratio)) {
      thresholdRatios[threshold] = ratio;
    }
  }
  for (const [threshold, value] of Object.entries(stats.thresholdCounts ?? {})) {
    const count = Number(value);
    if (Number.isFinite(count)) {
      thresholdCounts[threshold] = count;
    }
  }
  return {
    method: typeof stats.method === "string" ? stats.method : null,
    meanGray: Number.isFinite(Number(stats.meanGray)) ? Number(stats.meanGray) : null,
    rmsGray: Number.isFinite(Number(stats.rmsGray)) ? Number(stats.rmsGray) : null,
    maxGray: Number.isFinite(Number(stats.maxGray)) ? Number(stats.maxGray) : null,
    pixelCount: Number.isFinite(Number(stats.pixelCount)) ? Number(stats.pixelCount) : null,
    thresholdCounts,
    thresholdRatios
  };
}

function summarizeVisualDiffImprovement(currentStats, legacyStats) {
  const currentMean = Number(currentStats?.meanGray);
  const legacyMean = Number(legacyStats?.meanGray);
  const currentThreshold32 = Number(currentStats?.thresholdRatios?.["32"]);
  const legacyThreshold32 = Number(legacyStats?.thresholdRatios?.["32"]);
  const meanGrayReduction =
    Number.isFinite(currentMean) && Number.isFinite(legacyMean) ? legacyMean - currentMean : null;
  const meanGrayReductionRatio =
    meanGrayReduction !== null && legacyMean > 0 ? meanGrayReduction / legacyMean : null;
  const threshold32Reduction =
    Number.isFinite(currentThreshold32) && Number.isFinite(legacyThreshold32)
      ? legacyThreshold32 - currentThreshold32
      : null;
  const threshold32ReductionRatio =
    threshold32Reduction !== null && legacyThreshold32 > 0
      ? threshold32Reduction / legacyThreshold32
      : null;
  return {
    legacyMeanGray: Number.isFinite(legacyMean) ? legacyMean : null,
    currentMeanGray: Number.isFinite(currentMean) ? currentMean : null,
    meanGrayReduction,
    meanGrayReductionRatio:
      meanGrayReductionRatio === null ? null : clampCoordinate(meanGrayReductionRatio),
    legacyThreshold32: Number.isFinite(legacyThreshold32) ? legacyThreshold32 : null,
    currentThreshold32: Number.isFinite(currentThreshold32) ? currentThreshold32 : null,
    threshold32Reduction,
    threshold32ReductionRatio:
      threshold32ReductionRatio === null ? null : clampCoordinate(threshold32ReductionRatio)
  };
}

function summarizeFreshVisualComparison(options, legacyVisualEvidence) {
  if (!options.visualComparison) {
    return {
      status: "skipped",
      reason: "visualComparison not provided"
    };
  }

  const comparisonPath = path.resolve(options.visualComparison);
  if (!fs.existsSync(comparisonPath)) {
    return {
      status: "failed",
      comparisonPath,
      checkedFiles: 0,
      missingFiles: [{ path: comparisonPath, reason: "visual_comparison_json_missing" }],
      failures: [{ code: "visual_comparison_json_missing", path: comparisonPath }]
    };
  }

  let comparison = null;
  try {
    comparison = readJson(comparisonPath);
  } catch (error) {
    return {
      status: "failed",
      comparisonPath,
      checkedFiles: 0,
      missingFiles: [],
      failures: [
        {
          code: "visual_comparison_json_unreadable",
          path: comparisonPath,
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }

  const diffStats = normalizeVisualDiffStats(comparison.diffStats ?? {});
  const failures = [];
  if (!Number.isFinite(diffStats.meanGray) || !Number.isFinite(diffStats.rmsGray)) {
    failures.push({
      code: "visual_comparison_diff_stats_missing",
      requiredFields: ["diffStats.meanGray", "diffStats.rmsGray"]
    });
  }

  const referencedFiles = checkReferencedVisualComparisonFiles(comparisonPath, {
    inputs: comparison.inputs ?? {},
    outputs: comparison.outputs ?? {}
  });
  for (const missing of referencedFiles.missing) {
    failures.push({
      code: "visual_comparison_referenced_file_missing",
      group: missing.group,
      field: missing.field,
      path: missing.path
    });
  }

  const sceneCropAlignment = summarizeSceneCropAlignmentEvidence({
    visualEvidence: comparison.crop ?? {}
  });
  return {
    status: failures.length === 0 ? "passed" : "failed",
    comparisonPath,
    version: comparison.version ?? null,
    generatedAt: comparison.generatedAt ?? null,
    method:
      typeof comparison.method === "string"
        ? comparison.method
        : diffStats.method,
    checkedFiles: referencedFiles.checked.length,
    missingFiles: referencedFiles.missing,
    outputFiles: comparison.outputs ?? {},
    inputFiles: comparison.inputs ?? {},
    crop: comparison.crop ?? null,
    sceneCropAlignment,
    diffStats,
    improvementVsVisualEvidence: summarizeVisualDiffImprovement(
      diffStats,
      legacyVisualEvidence.diffStats
    ),
    failures
  };
}

function verifyComparisonRuntimeCaptureSummaryEvidence(comparison, computed) {
  const failures = [];
  const runtimeCapture = comparison.runtimeCapture ?? {};
  const offline = runtimeCapture.offlineRuntimeContractVerifier ?? {};
  const placement = runtimeCapture.placeablePlacementRuntimeContract ?? {};
  const tile = runtimeCapture.tileRuntimeContract ?? {};
  const sharedRenderer = runtimeCapture.sharedRenderer ?? {};
  const visualTransformRuntime = runtimeCapture.visualTransformRuntime ?? {};
  const runtime = computed.runtimeToSource;
  const tiles = computed.tiles;
  const semanticChecks = computed.semanticChecks ?? [];
  const visualTransformCheck = findSemanticCheck(semanticChecks, "visualTransformRuntime");
  const tileCheck = findSemanticCheck(semanticChecks, "tileRuntimeContractComparison");
  const placementCheck = findSemanticCheck(semanticChecks, "placeablePlacementRuntimeComparison");

  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "version",
    "aurora-area-proof-comparison/v1",
    comparison.version
  );

  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "sharedRenderer.status",
    "ready",
    sharedRenderer.status
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "sharedRenderer.total",
    runtime.snapshotTotal,
    sharedRenderer.total
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "sharedRenderer.payloadBoundCount",
    runtime.payloadBoundCount,
    sharedRenderer.payloadBoundCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "sharedRenderer.modelReadyCount",
    runtime.modelReadyCount,
    sharedRenderer.modelReadyCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "sharedRenderer.primitiveFallbackCount",
    0,
    sharedRenderer.primitiveFallbackCount
  );

  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "visualTransformRuntime.expectedApiCount",
    runtime.visualTransformSourceCount,
    visualTransformRuntime.expectedApiCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "visualTransformRuntime.runtimeSampleCount",
    runtime.runtimeSampleCount,
    visualTransformRuntime.runtimeSampleCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "visualTransformRuntime.runtimeMatchedExpectedCount",
    runtime.loadedVisualTransformCount,
    visualTransformRuntime.runtimeMatchedExpectedCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "visualTransformRuntime.runtimeAppliedExpectedCount",
    runtime.loadedVisualTransformCount,
    visualTransformRuntime.runtimeAppliedExpectedCount
  );
  for (const field of ["missingRuntimeCount", "notAppliedExpectedCount", "unexpectedAppliedCount"]) {
    pushSemanticFieldMismatch(
      failures,
      "comparison_runtime_capture",
      `visualTransformRuntime.${field}`,
      0,
      visualTransformRuntime[field]
    );
  }

  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "tileRuntimeContract.sourceRows",
    tiles.sourceRows,
    tile.sourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "tileRuntimeContract.runtimeRows",
    tiles.runtimeRows,
    tile.runtimeRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "tileRuntimeContract.passedRows",
    tiles.sourceRows,
    tile.passedRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "tileRuntimeContract.mismatchCount",
    0,
    tile.mismatchCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "tileRuntimeContract.missingRuntimeRows",
    0,
    tile.missingRuntimeRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "tileRuntimeContract.allPassed",
    true,
    tile.allPassed
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "tileRuntimeContract.loadedTileCount",
    tiles.loadedTileCount,
    tile.loadedTileCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "tileRuntimeContract.failedTileCount",
    0,
    tile.failedTileCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "tileRuntimeContract.materialTextureAppliedTileCount",
    tiles.materialTextureAppliedTileCount,
    tile.materialTextureAppliedTileCount
  );

  for (const field of [
    "sourceRows",
    "runtimeRows",
    "matchedRuntimeRows",
    "sourcePlacementMatches",
    "renderAnchorMatches",
    "rootPositionMatches",
    "bearingMatches",
    "visualTransformYawMatches",
    "renderYawBearingPlusVisualYawMatches"
  ]) {
    const expected =
      field === "sourceRows"
        ? runtime.sourceRows
        : field === "runtimeRows" || field === "matchedRuntimeRows"
          ? runtime.matchedRuntimeRows
          : runtime.matchedRuntimeRows;
    pushSemanticFieldMismatch(
      failures,
      "comparison_runtime_capture",
      `placeablePlacementRuntimeContract.${field}`,
      expected,
      placement[field]
    );
  }
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "placeablePlacementRuntimeContract.failedRuntimeRows",
    0,
    placement.failedRuntimeRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "placeablePlacementRuntimeContract.unmatchedSourceRows",
    runtime.unloadedSourceRows,
    placement.unmatchedSourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "placeablePlacementRuntimeContract.expectedUnloadedHelperRows",
    runtime.expectedUnloadedHelperRows,
    placement.expectedUnloadedHelperRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "placeablePlacementRuntimeContract.unexpectedUnloadedRows",
    0,
    placement.unexpectedUnloadedRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "placeablePlacementRuntimeContract.unmatchedSourceRowsFullyAccountedFor",
    true,
    placement.unmatchedSourceRowsFullyAccountedFor
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "placeablePlacementRuntimeContract.matchedVisualTransformSourceRows",
    runtime.visualTransformSourceCount,
    placement.matchedVisualTransformSourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "placeablePlacementRuntimeContract.matchedNonStaticVisualTransformSourceRows",
    visualTransformCheck?.nonStaticExpectedCount ?? runtime.visualTransformSourceCount,
    placement.matchedNonStaticVisualTransformSourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "placeablePlacementRuntimeContract.allRuntimeReadyRowsPassed",
    true,
    placement.allRuntimeReadyRowsPassed
  );

  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.status",
    "passed",
    offline.status
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.diffCount",
    0,
    offline.diffCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.coverageFailureCount",
    0,
    offline.coverageFailureCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.visualEvidenceStatus",
    "passed",
    offline.visualEvidenceStatus
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.visualEvidenceCheckedFiles",
    computed.checkedFiles,
    offline.visualEvidenceCheckedFiles
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.visualEvidenceHashCheckedFiles",
    computed.hashCheckedFiles,
    offline.visualEvidenceHashCheckedFiles
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.runtimeSampleCount",
    runtime.runtimeSampleCount,
    offline.runtimeSampleCount
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.sourceRows",
    runtime.sourceRows,
    offline.sourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.matchedRuntimeRows",
    runtime.matchedRuntimeRows,
    offline.matchedRuntimeRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.unloadedSourceRows",
    runtime.unloadedSourceRows,
    offline.unloadedSourceRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.expectedUnloadedHelperRows",
    runtime.expectedUnloadedHelperRows,
    offline.expectedUnloadedHelperRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.unexpectedUnloadedRows",
    0,
    offline.unexpectedUnloadedRows
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.sourceRowsFullyAccountedFor",
    true,
    offline.sourceRowsFullyAccountedFor
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.visualTransformSemanticStatus",
    visualTransformCheck?.status ?? null,
    offline.visualTransformSemanticStatus
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.tileRuntimeComparisonSemanticStatus",
    tileCheck?.status ?? null,
    offline.tileRuntimeComparisonSemanticStatus
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.placeablePlacementComparisonSemanticStatus",
    placementCheck?.status ?? null,
    offline.placeablePlacementComparisonSemanticStatus
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.sceneCropAlignmentStatus",
    computed.sceneCropAlignment?.status ?? null,
    offline.sceneCropAlignmentStatus
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.sceneCropAlignmentWebHorizontalPad",
    computed.sceneCropAlignment?.webHorizontalPad ?? null,
    offline.sceneCropAlignmentWebHorizontalPad
  );
  pushSemanticFieldMismatch(
    failures,
    "comparison_runtime_capture",
    "offlineRuntimeContractVerifier.sceneCropAlignmentWebVerticalPad",
    computed.sceneCropAlignment?.webVerticalPad ?? null,
    offline.sceneCropAlignmentWebVerticalPad
  );

  return {
    status: failures.length === 0 ? "passed" : "failed",
    sourceRows: runtime.sourceRows,
    matchedRuntimeRows: runtime.matchedRuntimeRows,
    expectedUnloadedHelperRows: runtime.expectedUnloadedHelperRows,
    tileRows: tiles.sourceRows,
    semanticCheckCount: semanticChecks.length,
    failureCount: failures.length,
    failures
  };
}

async function fetchArea(baseUrl, areaId, username, password) {
  const login = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!login.ok) {
    throw new Error(`Login failed: ${login.status}`);
  }
  const token = (await login.json())?.data?.session?.accessToken;
  if (!token) {
    throw new Error("Login response did not include accessToken");
  }
  const response = await fetch(`${baseUrl}/areas/${areaId}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    throw new Error(`Area fetch failed: ${response.status}`);
  }
  return (await response.json()).data;
}

function compareSourceObjectsToApi(sourceRows, apiObjects) {
  const apiById = new Map(apiObjects.map((object) => [object.objectId, object]));
  const usedIds = new Set();
  const mappedIds = [];
  const diffs = [];
  for (const row of sourceRows) {
    const id = buildObjectId(row, usedIds);
    const api = apiById.get(id);
    if (!api) {
      diffs.push({ id, field: "missingApiObject", sourceIndex: row.index });
      continue;
    }
    mappedIds.push(id);
    const resref = normalizeResref(row.templateResRef);
    const prefix = kindPrefix(row.kind);
    const expectedTemplateId = buildTemplateId(row.kind, prefix, resref);
    if (api.templateId !== expectedTemplateId) {
      diffs.push({ id, field: "templateId", expected: expectedTemplateId, actual: api.templateId });
    }
    pushNumberDiff(diffs, id, "x", clampCoordinate(numberOr(row.x) / 10), api.x);
    pushNumberDiff(diffs, id, "y", clampCoordinate(numberOr(row.y) / 10), api.y);
    pushNumberDiff(diffs, id, "z", clampCoordinate(numberOr(row.z) / 10), api.z);
    pushNumberDiff(diffs, id, "bearing", clampBearing(numberOr(row.bearingDegrees)), api.bearing, 1e-4);
    if (row.hasVisualTransform === "true") {
      const expected = expectedVisualTransform(row);
      if (!api.visualTransform) {
        diffs.push({ id, field: "visualTransform", expected, actual: null });
      } else {
        for (const [field, expectedValue] of Object.entries(expected)) {
          pushNumberDiff(
            diffs,
            id,
            `visualTransform.${field}`,
            expectedValue,
            api.visualTransform[field],
            1e-6
          );
        }
      }
    } else if (api.visualTransform) {
      diffs.push({ id, field: "unexpectedVisualTransform", actual: api.visualTransform });
    }
  }
  return {
    sourceRows: sourceRows.length,
    apiObjects: apiObjects.length,
    mapped: mappedIds.length,
    missingFromSource: apiObjects
      .filter((object) => !mappedIds.includes(object.objectId))
      .map((object) => object.objectId),
    diffs
  };
}

function hasNonDefaultVisualTransform(transform) {
  const identity = {
    scale: 1,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
    offsetX: 0,
    offsetY: 0,
    offsetZ: 0,
    pitch: 0,
    yaw: 0,
    roll: 0
  };
  return Object.entries(identity).some(
    ([field, expected]) => Math.abs(Number(transform?.[field] ?? expected) - expected) > 1e-6
  );
}

function classifyExpectedUnloadedAreaHelper(row) {
  if (row.kind !== "placeable" || row.hasNonDefaultVisualTransform || row.hasVisualTransform) {
    return null;
  }
  const tag = String(row.tag ?? "");
  const templateResRef = String(row.templateResRef ?? "").toLowerCase();
  if (
    tag === "VFXFlameLarge1" &&
    templateResRef === "tm_pl_lightred" &&
    row.appearanceType === 332
  ) {
    return "area-vfx-emitter-helper-no-bounds";
  }
  if (
    /^VALELightNodeOrange\d+m$/u.test(tag) &&
    templateResRef === "plc_campfr" &&
    (row.appearanceType === 26949 || row.appearanceType === 26950)
  ) {
    return "area-light-node-helper-no-geometry";
  }
  return null;
}

function parseRuntimeWorldBounds(value) {
  if (typeof value !== "string") {
    return null;
  }
  const match = value.match(
    /^\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\s*->\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\s*$/u
  );
  if (!match) {
    return null;
  }
  return {
    minX: Number(match[1]),
    minY: Number(match[2]),
    minZ: Number(match[3]),
    maxX: Number(match[4]),
    maxY: Number(match[5]),
    maxZ: Number(match[6])
  };
}

function resolveAreaWidthFromTileRows(tileRows) {
  const maxCol = tileRows.reduce((max, row) => {
    const col = Number(row.col);
    return Number.isFinite(col) ? Math.max(max, col) : max;
  }, -1);
  return maxCol >= 0 ? maxCol + 1 : null;
}

function summarizeRuntimeWorldMirrorEvidence(entries, areaWidth) {
  if (!Number.isFinite(areaWidth) || areaWidth <= 0) {
    return {
      areaWidth: null,
      checkedRows: 0,
      passedRows: 0,
      failedRows: 0,
      averageMirrorXError: null,
      averageRawXError: null,
      averageZError: null,
      maxMirrorXError: null,
      maxZError: null,
      sample: []
    };
  }

  const rows = [];
  for (const entry of entries) {
    const bounds = parseRuntimeWorldBounds(entry.worldBounds);
    const rootPosition = entry.rootPosition ?? {};
    const rootX = Number(rootPosition.x);
    const rootZ = Number(rootPosition.z);
    if (!bounds || !Number.isFinite(rootX) || !Number.isFinite(rootZ)) {
      continue;
    }
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerZ = (bounds.minZ + bounds.maxZ) / 2;
    const expectedMirroredWorldX = areaWidth - rootX;
    const mirrorXError = Math.abs(centerX - expectedMirroredWorldX);
    const rawXError = Math.abs(centerX - rootX);
    const zError = Math.abs(centerZ - rootZ);
    rows.push({
      id: entry.sourceId,
      rootX: clampCoordinate(rootX),
      rootZ: clampCoordinate(rootZ),
      worldCenterX: clampCoordinate(centerX),
      worldCenterZ: clampCoordinate(centerZ),
      expectedMirroredWorldX: clampCoordinate(expectedMirroredWorldX),
      mirrorXError: clampCoordinate(mirrorXError),
      rawXError: clampCoordinate(rawXError),
      zError: clampCoordinate(zError),
      passed: mirrorXError <= 0.05 && zError <= 0.05 && mirrorXError < rawXError
    });
  }

  const failedRows = rows.filter((row) => !row.passed);
  const average = (field) =>
    rows.length > 0
      ? clampCoordinate(rows.reduce((sum, row) => sum + row[field], 0) / rows.length)
      : null;
  const max = (field) =>
    rows.length > 0 ? clampCoordinate(Math.max(...rows.map((row) => row[field]))) : null;
  return {
    areaWidth,
    checkedRows: rows.length,
    passedRows: rows.length - failedRows.length,
    failedRows: failedRows.length,
    averageMirrorXError: average("mirrorXError"),
    averageRawXError: average("rawXError"),
    averageZError: average("zError"),
    maxMirrorXError: max("mirrorXError"),
    maxZError: max("zError"),
    sample: failedRows.length > 0 ? failedRows.slice(0, 20) : rows.slice(0, 20)
  };
}

function summarizeAreaRenderFrameMirrorEvidence(snapshot, areaWidth) {
  const mirror = snapshot?.areaRenderFrameMirror ?? null;
  if (!mirror || typeof mirror !== "object") {
    return {
      status: "missing",
      passed: null,
      reason: "areaRenderFrameMirror not present in runtime snapshot"
    };
  }
  const objectLayer = mirror.objectLayer ?? {};
  const boundsLayer = mirror.boundsLayer ?? {};
  const expectedWidth = Number.isFinite(areaWidth) && areaWidth > 0 ? areaWidth : null;
  const objectWidth = Number(objectLayer.mirrorWidth);
  const boundsWidth = Number(boundsLayer.mirrorWidth);
  const objectPositionX = Number(objectLayer.positionX);
  const boundsPositionX = Number(boundsLayer.positionX);
  const objectScaleX = Number(objectLayer.scaleX);
  const boundsScaleX = Number(boundsLayer.scaleX);
  const failures = [];
  if (mirror.status !== "coordinate-x" || mirror.enabled !== true) {
    failures.push({
      field: "status",
      expected: "coordinate-x/enabled",
      actual: `${mirror.status ?? "missing"}/${String(mirror.enabled)}`
    });
  }
  if (objectLayer.mirror !== "coordinate-x") {
    failures.push({ field: "objectLayer.mirror", expected: "coordinate-x", actual: objectLayer.mirror ?? null });
  }
  if (boundsLayer.mirror !== "coordinate-x") {
    failures.push({ field: "boundsLayer.mirror", expected: "coordinate-x", actual: boundsLayer.mirror ?? null });
  }
  if (expectedWidth !== null) {
    for (const [field, value] of [
      ["objectLayer.mirrorWidth", objectWidth],
      ["boundsLayer.mirrorWidth", boundsWidth],
      ["objectLayer.positionX", objectPositionX],
      ["boundsLayer.positionX", boundsPositionX]
    ]) {
      if (!Number.isFinite(value) || Math.abs(value - expectedWidth) > 1e-6) {
        failures.push({ field, expected: expectedWidth, actual: Number.isFinite(value) ? value : null });
      }
    }
  }
  if (!Number.isFinite(objectScaleX) || objectScaleX >= 0) {
    failures.push({ field: "objectLayer.scaleX", expected: "negative", actual: Number.isFinite(objectScaleX) ? objectScaleX : null });
  }
  if (!Number.isFinite(boundsScaleX) || boundsScaleX >= 0) {
    failures.push({ field: "boundsLayer.scaleX", expected: "negative", actual: Number.isFinite(boundsScaleX) ? boundsScaleX : null });
  }
  return {
    status: failures.length === 0 ? "passed" : "failed",
    passed: failures.length === 0,
    expectedWidth,
    objectLayer,
    boundsLayer,
    failures
  };
}

function compareRuntimeObjectsToApi(frame, apiObjects) {
  const snapshot =
    frame.areaObjectSharedRendererSnapshot ??
    frame.domStatus?.areaObjectSharedRendererSnapshot ??
    frame.blocker?.details?.lastStatus?.areaObjectSharedRendererSnapshot ??
    null;
  const entries = Array.isArray(snapshot?.modelBoundsSample) ? snapshot.modelBoundsSample : [];
  const apiById = new Map(apiObjects.map((object) => [object.objectId, object]));
  const loadedIds = new Set(entries.map((entry) => entry.sourceId));
  const visualTransformIds = apiObjects
    .filter((object) => object.visualTransform)
    .map((object) => object.objectId);
  const diffs = [];
  for (const entry of entries) {
    const api = apiById.get(entry.sourceId);
    if (!api) {
      diffs.push({ id: entry.sourceId, field: "missingApiObject" });
      continue;
    }
    const bearingRadians = clampRadians((api.bearing * Math.PI) / 180);
    pushNumberDiff(diffs, entry.sourceId, "sourcePlacement.x", api.x, entry.sourcePlacement?.x);
    pushNumberDiff(diffs, entry.sourceId, "sourcePlacement.y", api.y, entry.sourcePlacement?.y);
    pushNumberDiff(diffs, entry.sourceId, "sourcePlacement.z", api.z, entry.sourcePlacement?.z);
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "sourcePlacement.bearing",
      bearingRadians,
      clampRadians(entry.sourcePlacement?.bearing),
      1e-6
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "renderAnchorVector.x",
      api.x,
      entry.renderAnchorVector?.x
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "renderAnchorVector.y",
      api.z,
      entry.renderAnchorVector?.y
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "renderAnchorVector.z",
      api.y,
      entry.renderAnchorVector?.z
    );
    const visualTransform = api.visualTransform ?? {};
    const applied = hasNonDefaultVisualTransform(visualTransform);
    const expectedYaw = expectedObjectRenderYaw(
      {
        id: entry.sourceId,
        templateId: entry.templateId ?? api.templateId,
        templateResRef: api.templateResRef ?? api.resref,
        tag: api.tag,
        sourceModelResRef: entry.payloadModelResRef
      },
      bearingRadians,
      applied ? visualTransform : null
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "renderTransform.renderYaw",
      expectedYaw,
      clampRadians(entry.renderTransform?.renderYaw),
      1e-6
    );
    if (applied) {
      pushNumberDiff(diffs, entry.sourceId, "rootScale.x", visualTransform.scaleX ?? visualTransform.scale, entry.rootScale?.x, 1e-6);
      pushNumberDiff(diffs, entry.sourceId, "rootScale.y", visualTransform.scaleZ ?? visualTransform.scale, entry.rootScale?.y, 1e-6);
      pushNumberDiff(diffs, entry.sourceId, "rootScale.z", visualTransform.scaleY ?? visualTransform.scale, entry.rootScale?.z, 1e-6);
    }
  }
  return {
    snapshotStatus: snapshot?.status ?? null,
    snapshotTotal: snapshot?.total ?? null,
    runtimeSampleCount: entries.length,
    apiVisualTransformCount: visualTransformIds.length,
    loadedVisualTransformCount: visualTransformIds.filter((id) => loadedIds.has(id)).length,
    missingVisualTransformIds: visualTransformIds.filter((id) => !loadedIds.has(id)),
    diffs
  };
}

function prepareSourceRuntimeRows(sourceRows) {
  const usedIds = new Set();
  return sourceRows.map((row) => {
    const id = buildObjectId(row, usedIds);
    const visualTransform = row.hasVisualTransform === "true" ? expectedVisualTransform(row) : null;
    const bearingRadians = clampRadians(degreesToRadians(numberOr(row.bearingDegrees)));
    const templateResRef = normalizeResref(row.templateResRef);
    const templateId = buildTemplateId(row.kind, kindPrefix(row.kind), templateResRef);
    const runtimeRow = {
      id,
      templateResRef,
      templateId,
      tag: row.tag
    };
    return {
      id,
      sourceIndex: Number(row.index),
      kind: row.kind,
      templateResRef,
      templateId,
      tag: row.tag,
      appearanceType: row.appearanceType === "" ? null : Number(row.appearanceType),
      isStatic: row.isStatic === "true",
      hasVisualTransform: row.hasVisualTransform === "true",
      visualTransform,
      hasNonDefaultVisualTransform: hasNonDefaultVisualTransform(visualTransform),
      sourcePlacement: {
        x: clampCoordinate(numberOr(row.x) / 10),
        y: clampCoordinate(numberOr(row.y) / 10),
        z: clampCoordinate(numberOr(row.z) / 10),
        bearing: bearingRadians,
        bearingDegrees: clampBearing(numberOr(row.bearingDegrees))
      },
      renderAnchorVector: {
        x: clampCoordinate(numberOr(row.x) / 10),
        y: clampCoordinate(numberOr(row.z) / 10),
        z: clampCoordinate(numberOr(row.y) / 10)
      },
      expectedRenderYaw: expectedObjectRenderYaw(
        runtimeRow,
        bearingRadians,
        visualTransform
      ),
      expectedYawComposition: expectedObjectYawComposition(runtimeRow)
    };
  });
}

function compareRuntimeObjectsToSource(frame, sourceRows, tileRows = []) {
  const snapshot =
    frame.areaObjectSharedRendererSnapshot ??
    frame.domStatus?.areaObjectSharedRendererSnapshot ??
    frame.blocker?.details?.lastStatus?.areaObjectSharedRendererSnapshot ??
    null;
  const entries = Array.isArray(snapshot?.modelBoundsSample) ? snapshot.modelBoundsSample : [];
  const sourceRuntimeRows = prepareSourceRuntimeRows(sourceRows);
  const sourceById = new Map(sourceRuntimeRows.map((row) => [row.id, row]));
  const tileByCell = new Map(tileRows.map((row) => [`${row.row}:${row.col}`, row]));
  const areaWidth = resolveAreaWidthFromTileRows(tileRows);
  const loadedIds = new Set(entries.map((entry) => entry.sourceId));
  const visualTransformIds = sourceRuntimeRows
    .filter((row) => row.hasNonDefaultVisualTransform)
    .map((row) => row.id);
  const diffs = [];
  const rotationSeparationRows = [];

  for (const entry of entries) {
    const source = sourceById.get(entry.sourceId);
    if (!source) {
      diffs.push({ id: entry.sourceId, field: "missingSourceObject" });
      continue;
    }
    if (entry.templateId && entry.templateId !== source.templateId) {
      diffs.push({
        id: entry.sourceId,
        field: "templateId",
        expected: source.templateId,
        actual: entry.templateId
      });
    }
    if (
      source.appearanceType !== null &&
      Number.isFinite(source.appearanceType) &&
      entry.sourceAppearanceType !== source.appearanceType
    ) {
      diffs.push({
        id: entry.sourceId,
        field: "sourceAppearanceType",
        expected: source.appearanceType,
        actual: entry.sourceAppearanceType
      });
    }
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "sourcePlacement.x",
      source.sourcePlacement.x,
      entry.sourcePlacement?.x,
      1e-5
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "sourcePlacement.y",
      source.sourcePlacement.y,
      entry.sourcePlacement?.y,
      1e-5
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "sourcePlacement.z",
      source.sourcePlacement.z,
      entry.sourcePlacement?.z,
      1e-5
    );
    if (!closeAngle(source.sourcePlacement.bearing, entry.sourcePlacement?.bearing, 1e-5)) {
      diffs.push({
        id: entry.sourceId,
        field: "sourcePlacement.bearing",
        expected: source.sourcePlacement.bearing,
        actual: clampRadians(entry.sourcePlacement?.bearing)
      });
    }
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "renderAnchorVector.x",
      source.renderAnchorVector.x,
      entry.renderAnchorVector?.x,
      1e-5
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "renderAnchorVector.y",
      source.renderAnchorVector.y,
      entry.renderAnchorVector?.y,
      1e-5
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "renderAnchorVector.z",
      source.renderAnchorVector.z,
      entry.renderAnchorVector?.z,
      1e-5
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "rootPosition.x",
      source.renderAnchorVector.x,
      entry.rootPosition?.x,
      1e-5
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "rootPosition.y",
      source.renderAnchorVector.y,
      entry.rootPosition?.y,
      1e-5
    );
    pushNumberDiff(
      diffs,
      entry.sourceId,
      "rootPosition.z",
      source.renderAnchorVector.z,
      entry.rootPosition?.z,
      1e-5
    );
    if (!closeAngle(source.expectedRenderYaw, entry.renderTransform?.renderYaw, 1e-5)) {
      diffs.push({
        id: entry.sourceId,
        field: "renderTransform.renderYaw",
        expected: source.expectedRenderYaw,
        actual: clampRadians(entry.renderTransform?.renderYaw)
      });
    }
    const tileRow = Math.floor(source.sourcePlacement.y);
    const tileCol = Math.floor(source.sourcePlacement.x);
    const tile = tileByCell.get(`${tileRow}:${tileCol}`);
    if (tile && Number(tile.currentWebMirrorOrientation) !== 0) {
      rotationSeparationRows.push({
        id: entry.sourceId,
        sourceIndex: source.sourceIndex,
        tileIndex: Number(tile.index),
        tileRow,
        tileCol,
        tileRenderYawQuarterTurns: Number(tile.currentWebMirrorOrientation),
        tileRenderYawRadians: clampRadians(
          Number(tile.currentWebMirrorOrientation) * (Math.PI / 2)
        ),
        sourceBearing: source.sourcePlacement.bearing,
        visualTransformYaw: source.visualTransform?.yaw ?? 0,
        expectedPlaceableRenderYaw: source.expectedRenderYaw,
        actualPlaceableRenderYaw: clampRadians(entry.renderTransform?.renderYaw),
        passed: closeAngle(source.expectedRenderYaw, entry.renderTransform?.renderYaw, 1e-5)
      });
    }
    const runtimeVisualTransform = parseVisualTransformEvidence(entry.visualTransform);
    if (source.hasNonDefaultVisualTransform && entry.visualTransformApplied !== true) {
      diffs.push({
        id: entry.sourceId,
        field: "visualTransformApplied",
        expected: true,
        actual: entry.visualTransformApplied
      });
    }
    if (source.visualTransform) {
      for (const field of ["scaleX", "scaleY", "scaleZ", "offsetX", "offsetY", "offsetZ"]) {
        pushNumberDiff(
          diffs,
          entry.sourceId,
          `visualTransform.${field}`,
          source.visualTransform[field],
          runtimeVisualTransform[field],
          1e-5
        );
      }
      for (const field of ["pitch", "yaw", "roll"]) {
        if (!closeAngle(source.visualTransform[field], runtimeVisualTransform[field], 1e-5)) {
          diffs.push({
            id: entry.sourceId,
            field: `visualTransform.${field}`,
            expected: source.visualTransform[field],
            actual: clampRadians(runtimeVisualTransform[field])
          });
        }
      }
      pushNumberDiff(
        diffs,
        entry.sourceId,
        "rootScale.x",
        source.visualTransform.scaleX ?? source.visualTransform.scale,
        entry.rootScale?.x,
        1e-5
      );
      pushNumberDiff(
        diffs,
        entry.sourceId,
        "rootScale.y",
        source.visualTransform.scaleZ ?? source.visualTransform.scale,
        entry.rootScale?.y,
        1e-5
      );
      pushNumberDiff(
        diffs,
        entry.sourceId,
        "rootScale.z",
        source.visualTransform.scaleY ?? source.visualTransform.scale,
        entry.rootScale?.z,
        1e-5
      );
    }
  }

  const unloadedSourceRows = sourceRuntimeRows.filter((row) => !loadedIds.has(row.id));
  const unloadedSourceRowsWithClassification = unloadedSourceRows.map((row) => ({
    ...row,
    expectedUnloadedHelperReason: classifyExpectedUnloadedAreaHelper(row)
  }));
  const expectedUnloadedHelperRows = unloadedSourceRowsWithClassification.filter(
    (row) => row.expectedUnloadedHelperReason
  );
  const unexpectedUnloadedRows = unloadedSourceRowsWithClassification.filter(
    (row) => !row.expectedUnloadedHelperReason
  );
  const areaRenderFrameMirror = summarizeAreaRenderFrameMirrorEvidence(snapshot, areaWidth);
  const worldMirror = summarizeRuntimeWorldMirrorEvidence(entries, areaWidth);
  const rotationSeparationFailedRows = rotationSeparationRows.filter((row) => !row.passed);
  return {
    snapshotStatus: snapshot?.status ?? null,
    snapshotTotal: snapshot?.total ?? null,
    payloadBoundCount: snapshot?.payloadBoundCount ?? null,
    modelReadyCount: snapshot?.modelReadyCount ?? null,
    primitiveFallbackCount: snapshot?.primitiveFallbackCount ?? null,
    textureStatusCounts: snapshot?.textureStatusCounts ?? {},
    texturePendingCount: Array.isArray(snapshot?.texturePendingIds)
      ? snapshot.texturePendingIds.length
      : null,
    runtimeSampleCount: entries.length,
    sourceRows: sourceRuntimeRows.length,
    matchedRuntimeRows: entries.length - diffs.filter((diff) => diff.field === "missingSourceObject").length,
    unloadedSourceRows: unloadedSourceRows.length,
    expectedUnloadedHelperRows: expectedUnloadedHelperRows.length,
    unexpectedUnloadedRows: unexpectedUnloadedRows.length,
    unloadedSourceSample: unloadedSourceRows.slice(0, 20).map((row) => ({
      id: row.id,
      sourceIndex: row.sourceIndex,
      kind: row.kind,
      templateId: row.templateId,
      tag: row.tag,
      hasVisualTransform: row.hasVisualTransform
    })),
    expectedUnloadedHelperSample: expectedUnloadedHelperRows.slice(0, 20).map((row) => ({
      id: row.id,
      sourceIndex: row.sourceIndex,
      kind: row.kind,
      templateId: row.templateId,
      tag: row.tag,
      appearanceType: row.appearanceType,
      expectedUnloadedHelperReason: row.expectedUnloadedHelperReason
    })),
    unexpectedUnloadedSample: unexpectedUnloadedRows.slice(0, 20).map((row) => ({
      id: row.id,
      sourceIndex: row.sourceIndex,
      kind: row.kind,
      templateId: row.templateId,
      tag: row.tag,
      appearanceType: row.appearanceType,
      hasVisualTransform: row.hasVisualTransform
    })),
    visualTransformSourceCount: visualTransformIds.length,
    loadedVisualTransformCount: visualTransformIds.filter((id) => loadedIds.has(id)).length,
    missingVisualTransformIds: visualTransformIds.filter((id) => !loadedIds.has(id)),
    areaRenderFrameMirror,
    worldMirror,
    rotationSeparation: {
      checkedRowsOnNonZeroTileOrientation: rotationSeparationRows.length,
      passedRows: rotationSeparationRows.length - rotationSeparationFailedRows.length,
      failedRows: rotationSeparationFailedRows.length,
      sample: rotationSeparationRows.slice(0, 20)
    },
    diffs
  };
}

function parseTileTransformSample(sample) {
  if (typeof sample !== "string" || sample.trim().length === 0) {
    return [];
  }
  return sample.split("|").flatMap((entry) => {
    const fields = entry.split(",");
    const parsed = {};
    for (const field of fields) {
      if (/^r\d+$/u.test(field)) {
        parsed.row = Number(field.slice(1));
      } else if (/^c\d+$/u.test(field)) {
        parsed.col = Number(field.slice(1));
      } else {
        const equalsIndex = field.indexOf("=");
        if (equalsIndex > 0) {
          parsed[field.slice(0, equalsIndex)] = field.slice(equalsIndex + 1);
        }
      }
    }
    return Number.isFinite(parsed.index) || Number.isFinite(Number(parsed.index))
      ? [{ ...parsed, index: Number(parsed.index), row: Number(parsed.row), col: Number(parsed.col) }]
      : [];
  });
}

function parsePair(value) {
  if (typeof value !== "string") {
    return null;
  }
  const [x, z] = value.split("x").map(Number);
  return Number.isFinite(x) && Number.isFinite(z) ? { x, z } : null;
}

function compareRuntimeTilesToSource(frame, tileRows) {
  const snapshot = frame.terrainTileModelSnapshot ?? frame.domStatus?.terrainTileModelSnapshot ?? null;
  const entries = parseTileTransformSample(snapshot?.tileTransformSample);
  const byIndex = new Map(entries.map((entry) => [Number(entry.index), entry]));
  const diffs = [];
  for (const row of tileRows) {
    const index = Number(row.index);
    const entry = byIndex.get(index);
    if (!entry) {
      diffs.push({ id: `tile:${index}`, field: "missingRuntimeTile" });
      continue;
    }
    const id = `tile:${index}`;
    pushNumberDiff(diffs, id, "row", Number(row.row), Number(entry.row), 0);
    pushNumberDiff(diffs, id, "col", Number(row.col), Number(entry.col), 0);
    pushNumberDiff(diffs, id, "tileId", Number(row.tileId), Number(entry.tile), 0);
    if (String(row.resolvedModelResRef) !== String(entry.model)) {
      diffs.push({
        id,
        field: "model",
        expected: row.resolvedModelResRef,
        actual: entry.model
      });
    }
    pushNumberDiff(
      diffs,
      id,
      "areOrientation",
      Number(row.sourceTileOrientation),
      Number(entry.areOrientation),
      0
    );
    pushNumberDiff(
      diffs,
      id,
      "setOrientation",
      Number(row.tilesetOrientation),
      Number(entry.setOrientation),
      0
    );
    pushNumberDiff(
      diffs,
      id,
      "renderYawQuarterTurns",
      Number(row.currentWebMirrorOrientation),
      Number(entry.renderYawQuarterTurns),
      0
    );
    pushNumberDiff(
      diffs,
      id,
      "renderYawDeg",
      Number(row.currentWebMirrorYawDegrees),
      Number(entry.renderYawDeg),
      0
    );
    pushNumberDiff(
      diffs,
      id,
      "imageMapYawQuarterTurns",
      Number(row.currentWebMirrorOrientation),
      Number(entry.imageMapYawQuarterTurns),
      0
    );
    pushNumberDiff(
      diffs,
      id,
      "imageMapYawDeg",
      Number(row.currentWebMirrorYawDegrees),
      Number(entry.imageMapYawDeg),
      0
    );
    pushNumberDiff(diffs, id, "areHeight", Number(row.height), Number(entry.areHeight), 0);
    const expectedAuroraWorldCenter = {
      x: Number(row.col) * 10 + 5,
      z: Number(row.row) * 10 + 5
    };
    const actualAuroraWorldCenter = parsePair(entry.auroraWorldCenter);
    if (
      !actualAuroraWorldCenter ||
      !close(expectedAuroraWorldCenter.x, actualAuroraWorldCenter.x, 1e-6) ||
      !close(expectedAuroraWorldCenter.z, actualAuroraWorldCenter.z, 1e-6)
    ) {
      diffs.push({
        id,
        field: "auroraWorldCenter",
        expected: `${expectedAuroraWorldCenter.x.toFixed(2)}x${expectedAuroraWorldCenter.z.toFixed(2)}`,
        actual: entry.auroraWorldCenter
      });
    }
    const expectedCenter = `${(Number(row.col) + 0.5).toFixed(2)}x${(Number(row.row) + 0.5).toFixed(2)}`;
    if (entry.renderCenter !== expectedCenter) {
      diffs.push({
        id,
        field: "renderCenter",
        expected: expectedCenter,
        actual: entry.renderCenter
      });
    }
  }
  return {
    snapshotStatus: snapshot?.status ?? null,
    loadedTileCount: snapshot?.loadedTileCount ?? null,
    failedTileCount: snapshot?.failedTileCount ?? null,
    materialTextureAppliedTileCount: snapshot?.materialTextureAppliedTileCount ?? null,
    checkedFields: [
      "row",
      "col",
      "tileId",
      "model",
      "areOrientation",
      "setOrientation",
      "renderYawQuarterTurns",
      "renderYawDeg",
      "imageMapYawQuarterTurns",
      "imageMapYawDeg",
      "areHeight",
      "auroraWorldCenter",
      "renderCenter"
    ],
    sourceRows: tileRows.length,
    runtimeRows: entries.length,
    diffs
  };
}

function verifyVisualEvidence(sourcePackPath, options, sourceRows, tileRows, computed) {
  if (!options.requireVisualEvidence) {
    return {
      status: "skipped",
      reason: "skipVisualEvidence",
      checkedFiles: 0,
      hashCheckedFiles: 0,
      failures: []
    };
  }

  const comparisonPath = path.join(sourcePackPath, "comparison.json");
  const failures = [];
  if (!fs.existsSync(comparisonPath)) {
    return {
      status: "failed",
      comparisonPath,
      checkedFiles: 0,
      hashCheckedFiles: 0,
      failures: [{ code: "comparison_json_missing", path: comparisonPath }]
    };
  }

  let comparison = null;
  try {
    comparison = readJson(comparisonPath);
  } catch (error) {
    return {
      status: "failed",
      comparisonPath,
      checkedFiles: 0,
      hashCheckedFiles: 0,
      failures: [
        {
          code: "comparison_json_unreadable",
          path: comparisonPath,
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }

  const evidence = comparison.visualEvidence ?? {};
  const requiredEvidenceFields = [
    "toolsetTopdown",
    "toolsetViewport",
    "webTopdown",
    "webCanvasTopdown",
    "webFrame",
    "sceneDiffTriptych",
    "webVisualTransformOverlay",
    "visualTransformRuntime",
    "offlineRuntimeContractVerifier",
    "tileRuntimeContractComparison",
    "placeablePlacementRuntimeComparison",
    "floorwoodenVisualTransformTriptych",
    "floorwoodenVisualTransformComparison"
  ];
  const hashFields = {
    toolsetTopdown: "toolsetTopdownSha256",
    webTopdown: "webTopdownSha256",
    webFrame: "webFrameSha256"
  };
  const checkedEvidencePaths = new Map();
  let checkedFiles = 0;
  let hashCheckedFiles = 0;
  const semanticChecks = [];
  const sceneCropAlignment = summarizeSceneCropAlignmentEvidence(comparison);
  const warnings = [];
  if (sceneCropAlignment.status === "warning" || sceneCropAlignment.status === "missing") {
    warnings.push({
      code: "scene_crop_alignment_not_transform_proof",
      status: sceneCropAlignment.status,
      reason: sceneCropAlignment.reason,
      webHorizontalPad: sceneCropAlignment.webHorizontalPad ?? null,
      webVerticalPad: sceneCropAlignment.webVerticalPad ?? null
    });
  }

  for (const field of requiredEvidenceFields) {
    const relativePath = evidence[field];
    if (!relativePath) {
      failures.push({ code: "visual_evidence_field_missing", field });
      continue;
    }
    const evidencePath = path.resolve(sourcePackPath, relativePath);
    if (!fs.existsSync(evidencePath)) {
      failures.push({
        code: "visual_evidence_file_missing",
        field,
        path: evidencePath
      });
      continue;
    }
    checkedEvidencePaths.set(field, evidencePath);
    checkedFiles += 1;
    const expectedHash = evidence.hashes?.[hashFields[field]];
    if (expectedHash) {
      const actualHash = sha256File(evidencePath);
      hashCheckedFiles += 1;
      if (actualHash !== expectedHash) {
        failures.push({
          code: "visual_evidence_hash_mismatch",
          field,
          path: evidencePath,
          expected: expectedHash,
          actual: actualHash
        });
      }
    }
  }

  const visualTransformRuntimePath = checkedEvidencePaths.get("visualTransformRuntime");
  if (visualTransformRuntimePath) {
    const semanticCheck = verifyVisualTransformRuntimeEvidence(
      sourceRows,
      visualTransformRuntimePath,
      options
    );
    semanticChecks.push({
      field: "visualTransformRuntime",
      status: semanticCheck.status,
      expectedCount: semanticCheck.expectedCount,
      nonStaticExpectedCount: semanticCheck.nonStaticExpectedCount,
      entryCount: semanticCheck.entryCount,
      matchedCount: semanticCheck.matchedCount,
      matchedNonStaticCount: semanticCheck.matchedNonStaticCount,
      failureCount: semanticCheck.failures.length
    });
    if (semanticCheck.status !== "passed") {
      failures.push({
        code: "visual_transform_runtime_semantic_mismatch",
        path: visualTransformRuntimePath,
        failures: semanticCheck.failures
      });
    }
  }

  const tileRuntimeContractComparisonPath = checkedEvidencePaths.get(
    "tileRuntimeContractComparison"
  );
  if (tileRuntimeContractComparisonPath) {
    const semanticCheck = verifyTileRuntimeContractComparisonEvidence(
      tileRows,
      tileRuntimeContractComparisonPath,
      computed.tiles
    );
    semanticChecks.push({
      field: "tileRuntimeContractComparison",
      status: semanticCheck.status,
      sourceRows: semanticCheck.sourceRows,
      runtimeRows: semanticCheck.runtimeRows,
      passedRows: semanticCheck.passedRows,
      failureCount: semanticCheck.failureCount
    });
    if (semanticCheck.status !== "passed") {
      failures.push({
        code: "tile_runtime_contract_comparison_semantic_mismatch",
        path: tileRuntimeContractComparisonPath,
        failures: semanticCheck.failures
      });
    }
  }

  const placeablePlacementRuntimeComparisonPath = checkedEvidencePaths.get(
    "placeablePlacementRuntimeComparison"
  );
  if (options.offline && placeablePlacementRuntimeComparisonPath && computed.runtimeToSource) {
    const semanticCheck = verifyPlaceablePlacementRuntimeComparisonEvidence(
      sourceRows,
      placeablePlacementRuntimeComparisonPath,
      computed.runtimeToSource
    );
    semanticChecks.push({
      field: "placeablePlacementRuntimeComparison",
      status: semanticCheck.status,
      sourceRows: semanticCheck.sourceRows,
      runtimeRows: semanticCheck.runtimeRows,
      expectedUnloadedHelperRows: semanticCheck.expectedUnloadedHelperRows,
      unexpectedUnloadedRows: semanticCheck.unexpectedUnloadedRows,
      failureCount: semanticCheck.failureCount
    });
    if (semanticCheck.status !== "passed") {
      failures.push({
        code: "placeable_placement_runtime_comparison_semantic_mismatch",
        path: placeablePlacementRuntimeComparisonPath,
        failures: semanticCheck.failures
      });
    }
  }

  if (options.offline && computed.runtimeToSource) {
    const semanticCheck = verifyComparisonRuntimeCaptureSummaryEvidence(comparison, {
      ...computed,
      checkedFiles,
      hashCheckedFiles,
      semanticChecks,
      sceneCropAlignment
    });
    semanticChecks.push({
      field: "comparisonRuntimeCapture",
      status: semanticCheck.status,
      sourceRows: semanticCheck.sourceRows,
      matchedRuntimeRows: semanticCheck.matchedRuntimeRows,
      expectedUnloadedHelperRows: semanticCheck.expectedUnloadedHelperRows,
      tileRows: semanticCheck.tileRows,
      semanticCheckCount: semanticCheck.semanticCheckCount,
      failureCount: semanticCheck.failureCount
    });
    if (semanticCheck.status !== "passed") {
      failures.push({
        code: "comparison_runtime_capture_semantic_mismatch",
        path: comparisonPath,
        failures: semanticCheck.failures
      });
    }
  }

  return {
    status: failures.length === 0 ? "passed" : "failed",
    comparisonPath,
    checkedFiles,
    hashCheckedFiles,
    requiredEvidenceFields,
    semanticChecks,
    sceneCropAlignment,
    diffStats: comparison.diffStats ?? null,
    warnings,
    failures
  };
}

function buildCoverageFailures({
  options,
  sourceRows,
  tileRows,
  runtimeToSource,
  runtimeToApi,
  tiles,
  visualEvidence,
  freshVisualComparison
}) {
  const failures = [];
  const addFailure = (code, details = {}) => {
    failures.push({ code, ...details });
  };

  if (sourceRows.length < 1) {
    addFailure("source_objects_missing", { sourceRows: sourceRows.length });
  }
  if (tileRows.length < 1) {
    addFailure("source_tile_rows_missing", { sourceRows: tileRows.length });
  }
  if (tiles.snapshotStatus !== "ready") {
    addFailure("terrain_tile_snapshot_not_ready", { snapshotStatus: tiles.snapshotStatus });
  }
  if (tiles.sourceRows < 1 || tiles.runtimeRows < tiles.sourceRows) {
    addFailure("runtime_tile_rows_incomplete", {
      sourceRows: tiles.sourceRows,
      runtimeRows: tiles.runtimeRows
    });
  }
  if (tiles.loadedTileCount !== tiles.sourceRows) {
    addFailure("loaded_tile_count_does_not_match_source_rows", {
      sourceRows: tiles.sourceRows,
      loadedTileCount: tiles.loadedTileCount
    });
  }
  if (tiles.failedTileCount !== 0) {
    addFailure("runtime_tiles_failed", { failedTileCount: tiles.failedTileCount });
  }
  if (
    tiles.materialTextureAppliedTileCount !== tiles.sourceRows &&
    !options.allowPartialTextureReadiness
  ) {
    addFailure("tile_material_texture_coverage_incomplete", {
      sourceRows: tiles.sourceRows,
      materialTextureAppliedTileCount: tiles.materialTextureAppliedTileCount
    });
  }

  const runtime = options.offline ? runtimeToSource : runtimeToApi;
  const acceptsPartialSharedRenderer = isAcceptedPartialSharedRendererRuntime(options, runtime);
  if (!runtime || (runtime.snapshotStatus !== "ready" && !acceptsPartialSharedRenderer)) {
    addFailure("shared_renderer_snapshot_not_ready", {
      snapshotStatus: runtime?.snapshotStatus ?? null,
      allowPartialSharedRenderer: options.allowPartialSharedRenderer
    });
  }
  if ((runtime?.runtimeSampleCount ?? 0) < 1) {
    addFailure("runtime_placeable_sample_missing", {
      runtimeSampleCount: runtime?.runtimeSampleCount ?? 0
    });
  }
  if ((runtime?.snapshotTotal ?? 0) > 0 && runtime?.payloadBoundCount !== runtime.snapshotTotal) {
    addFailure("payload_bound_count_incomplete", {
      snapshotTotal: runtime.snapshotTotal,
      payloadBoundCount: runtime.payloadBoundCount
    });
  }
  if ((runtime?.primitiveFallbackCount ?? 0) !== 0) {
    addFailure("primitive_fallbacks_present", {
      primitiveFallbackCount: runtime?.primitiveFallbackCount ?? null
    });
  }

  if (options.offline) {
    if ((runtimeToSource?.unexpectedUnloadedRows ?? 0) !== 0) {
      addFailure("unexpected_unloaded_source_rows_present", {
        unexpectedUnloadedRows: runtimeToSource?.unexpectedUnloadedRows ?? 0,
        unexpectedUnloadedSample: runtimeToSource?.unexpectedUnloadedSample ?? []
      });
    }
    if (
      (runtimeToSource?.matchedRuntimeRows ?? 0) +
        (runtimeToSource?.expectedUnloadedHelperRows ?? 0) !==
      sourceRows.length
    ) {
      addFailure("source_rows_not_fully_accounted_for", {
        sourceRows: sourceRows.length,
        matchedRuntimeRows: runtimeToSource?.matchedRuntimeRows ?? 0,
        expectedUnloadedHelperRows: runtimeToSource?.expectedUnloadedHelperRows ?? 0,
        unexpectedUnloadedRows: runtimeToSource?.unexpectedUnloadedRows ?? 0
      });
    }
    if (
      (runtimeToSource?.loadedVisualTransformCount ?? 0) !==
      (runtimeToSource?.visualTransformSourceCount ?? 0)
    ) {
      addFailure("visual_transform_runtime_coverage_incomplete", {
        visualTransformSourceCount: runtimeToSource?.visualTransformSourceCount ?? 0,
        loadedVisualTransformCount: runtimeToSource?.loadedVisualTransformCount ?? 0,
        missingVisualTransformIds: runtimeToSource?.missingVisualTransformIds ?? []
      });
    }
    if ((runtimeToSource?.rotationSeparation?.checkedRowsOnNonZeroTileOrientation ?? 0) < 1) {
      addFailure("rotation_separation_sentinel_rows_missing", {
        checkedRowsOnNonZeroTileOrientation:
          runtimeToSource?.rotationSeparation?.checkedRowsOnNonZeroTileOrientation ?? 0
      });
    }
    if ((runtimeToSource?.rotationSeparation?.failedRows ?? 0) !== 0) {
      addFailure("rotation_separation_sentinel_failed", {
        failedRows: runtimeToSource?.rotationSeparation?.failedRows ?? 0
      });
    }
    if (runtimeToSource?.areaRenderFrameMirror?.status === "failed") {
      addFailure("area_render_frame_mirror_failed", {
        failures: runtimeToSource.areaRenderFrameMirror.failures ?? [],
        objectLayer: runtimeToSource.areaRenderFrameMirror.objectLayer ?? null,
        boundsLayer: runtimeToSource.areaRenderFrameMirror.boundsLayer ?? null
      });
    }
    const hasDirectAreaMirrorEvidence =
      runtimeToSource?.areaRenderFrameMirror?.status === "passed";
    if (!hasDirectAreaMirrorEvidence && (runtimeToSource?.worldMirror?.checkedRows ?? 0) < 1) {
      addFailure("world_space_placeable_mirror_rows_missing", {
        directMirrorStatus: runtimeToSource?.areaRenderFrameMirror?.status ?? null,
        checkedRows: runtimeToSource?.worldMirror?.checkedRows ?? 0
      });
    }
    if (!hasDirectAreaMirrorEvidence && (runtimeToSource?.worldMirror?.failedRows ?? 0) !== 0) {
      addFailure("world_space_placeable_mirror_failed", {
        directMirrorStatus: runtimeToSource?.areaRenderFrameMirror?.status ?? null,
        failedRows: runtimeToSource?.worldMirror?.failedRows ?? 0,
        sample: runtimeToSource?.worldMirror?.sample ?? []
      });
    }
    if (
      !hasDirectAreaMirrorEvidence &&
      Number(runtimeToSource?.worldMirror?.averageMirrorXError ?? Number.POSITIVE_INFINITY) >=
      Number(runtimeToSource?.worldMirror?.averageRawXError ?? Number.NEGATIVE_INFINITY)
    ) {
      addFailure("world_space_placeable_mirror_not_better_than_raw_x", {
        directMirrorStatus: runtimeToSource?.areaRenderFrameMirror?.status ?? null,
        averageMirrorXError: runtimeToSource?.worldMirror?.averageMirrorXError ?? null,
        averageRawXError: runtimeToSource?.worldMirror?.averageRawXError ?? null
      });
    }
  } else if (
    (runtimeToApi?.loadedVisualTransformCount ?? 0) !==
    (runtimeToApi?.apiVisualTransformCount ?? 0)
  ) {
    addFailure("visual_transform_api_runtime_coverage_incomplete", {
      apiVisualTransformCount: runtimeToApi?.apiVisualTransformCount ?? 0,
      loadedVisualTransformCount: runtimeToApi?.loadedVisualTransformCount ?? 0,
      missingVisualTransformIds: runtimeToApi?.missingVisualTransformIds ?? []
    });
  }

  if (options.requireVisualEvidence && visualEvidence.status !== "passed") {
    addFailure("visual_evidence_incomplete", {
      status: visualEvidence.status,
      checkedFiles: visualEvidence.checkedFiles,
      hashCheckedFiles: visualEvidence.hashCheckedFiles,
      failures: visualEvidence.failures
    });
  }
  if (options.visualComparison && freshVisualComparison.status !== "passed") {
    addFailure("fresh_visual_comparison_incomplete", {
      status: freshVisualComparison.status,
      checkedFiles: freshVisualComparison.checkedFiles,
      missingFiles: freshVisualComparison.missingFiles,
      failures: freshVisualComparison.failures
    });
  }

  return failures;
}

function isAcceptedPartialSharedRendererRuntime(options, runtime) {
  if (!options.allowPartialSharedRenderer || runtime?.snapshotStatus !== "partial") {
    return false;
  }
  return (
    (runtime?.snapshotTotal ?? 0) > 0 &&
    runtime.payloadBoundCount === runtime.snapshotTotal &&
    (runtime?.runtimeSampleCount ?? 0) > 0 &&
    runtime.modelReadyCount === runtime.runtimeSampleCount &&
    runtime.primitiveFallbackCount === 0
  );
}

function summarizePartialSharedRendererRuntime(options, runtime) {
  const accepted = isAcceptedPartialSharedRendererRuntime(options, runtime);
  return {
    accepted,
    allowPartialSharedRenderer: options.allowPartialSharedRenderer,
    snapshotStatus: runtime?.snapshotStatus ?? null,
    snapshotTotal: runtime?.snapshotTotal ?? null,
    payloadBoundCount: runtime?.payloadBoundCount ?? null,
    modelReadyCount: runtime?.modelReadyCount ?? null,
    runtimeSampleCount: runtime?.runtimeSampleCount ?? null,
    primitiveFallbackCount: runtime?.primitiveFallbackCount ?? null,
    textureStatusCounts: runtime?.textureStatusCounts ?? {},
    texturePendingCount: runtime?.texturePendingCount ?? null,
    reason: accepted
      ? "accepted_partial_texture_loading_for_transform_contract"
      : null
  };
}

function summarizePartialTextureReadiness(options, tiles, runtime) {
  const tileTexturePartial =
    Number(tiles.materialTextureAppliedTileCount ?? 0) < Number(tiles.sourceRows ?? 0);
  const placeableTexturePending = Number(runtime?.texturePendingCount ?? 0) > 0;
  return {
    accepted: options.allowPartialTextureReadiness && (tileTexturePartial || placeableTexturePending),
    allowPartialTextureReadiness: options.allowPartialTextureReadiness,
    tileMaterialTextureAppliedTileCount: tiles.materialTextureAppliedTileCount ?? null,
    tileSourceRows: tiles.sourceRows ?? null,
    placeableTexturePendingCount: runtime?.texturePendingCount ?? null,
    placeableTextureStatusCounts: runtime?.textureStatusCounts ?? {},
    reason:
      options.allowPartialTextureReadiness && (tileTexturePartial || placeableTexturePending)
        ? "accepted_partial_texture_loading_for_transform_contract"
        : null
  };
}

const options = readArgs(process.argv.slice(2));
const sourcePackPath = path.resolve(options.sourcePack);
const framePath = path.resolve(options.frame);
const sourceRows = readCsv(path.join(sourcePackPath, "objects.csv"));
const tileRows = readCsv(path.join(sourcePackPath, "tile-contract.csv"));
const frame = readJson(framePath);

const tiles = compareRuntimeTilesToSource(frame, tileRows);
let sourceToApi = null;
let runtimeToApi = null;
let runtimeToSource = null;
if (options.offline) {
  runtimeToSource = compareRuntimeObjectsToSource(frame, sourceRows, tileRows);
} else {
  const area = await fetchArea(options.baseUrl, options.areaId, options.username, options.password);
  sourceToApi = compareSourceObjectsToApi(sourceRows, area.objects ?? []);
  runtimeToApi = compareRuntimeObjectsToApi(frame, area.objects ?? []);
}
const visualEvidence = verifyVisualEvidence(sourcePackPath, options, sourceRows, tileRows, {
  tiles,
  runtimeToSource,
  runtimeToApi
});
const freshVisualComparison = summarizeFreshVisualComparison(options, visualEvidence);

const diffCount =
  (sourceToApi?.diffs.length ?? 0) +
  (runtimeToApi?.diffs.length ?? 0) +
  (runtimeToSource?.diffs.length ?? 0) +
  tiles.diffs.length;
const coverageFailures = buildCoverageFailures({
  options,
  sourceRows,
  tileRows,
  runtimeToSource,
  runtimeToApi,
  tiles,
  visualEvidence,
  freshVisualComparison
});
const partialSharedRenderer = summarizePartialSharedRendererRuntime(
  options,
  options.offline ? runtimeToSource : runtimeToApi
);
const partialTextureReadiness = summarizePartialTextureReadiness(
  options,
  tiles,
  options.offline ? runtimeToSource : runtimeToApi
);
const failureCount = diffCount + coverageFailures.length;
const result = {
  version: "aurora-area-runtime-contract-verifier/v1",
  generatedAt: new Date().toISOString(),
  areaId: options.areaId,
  mode: options.offline ? "offline-source-pack-and-frame" : "online-api-source-and-frame",
  sourcePack: sourcePackPath,
  frame: framePath,
  status: failureCount === 0 ? "passed" : "failed",
  diffCount,
  coverageFailureCount: coverageFailures.length,
  coverageFailures,
  partialSharedRenderer,
  partialTextureReadiness,
  visualEvidence,
  freshVisualComparison,
  sourceToApi: sourceToApi
    ? {
        ...sourceToApi,
        diffs: sourceToApi.diffs.slice(0, 50)
      }
    : { status: "skipped-offline" },
  runtimeToApi: runtimeToApi
    ? {
        ...runtimeToApi,
        diffs: runtimeToApi.diffs.slice(0, 50)
      }
    : { status: "skipped-offline" },
  runtimeToSource: runtimeToSource
    ? {
        ...runtimeToSource,
        diffs: runtimeToSource.diffs.slice(0, 50)
      }
    : { status: "skipped-online" },
  tiles: {
    ...tiles,
    diffs: tiles.diffs.slice(0, 50)
  }
};

if (options.out) {
  const outPath = path.resolve(options.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

console.log(JSON.stringify(result, null, 2));
process.exitCode = failureCount === 0 ? 0 : 1;
