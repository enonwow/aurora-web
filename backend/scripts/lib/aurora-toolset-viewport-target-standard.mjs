export const AURORA_VIEWPORT_TARGET_STANDARD_VERSION = "aurora-toolset-viewport-target/v1";

const DEFAULT_TOLERANCE = Object.freeze({
  yawDegrees: 1,
  pitchDegrees: 1,
  zoomRatio: 0.02,
  screenCenterPixels: 12,
});

export function resolveSourceTileTarget({
  tileLayout,
  tileIndex = undefined,
  tileX = undefined,
  tileY = undefined,
  tileId = undefined,
  orientation = undefined,
}) {
  const tiles = Array.isArray(tileLayout?.tiles) ? tileLayout.tiles : null;
  if (!tiles) throw standardError("source_tile_layout_invalid", "Tile layout must contain a tiles array.");

  const hasIndex = tileIndex !== undefined && tileIndex !== null;
  const hasX = tileX !== undefined && tileX !== null;
  const hasY = tileY !== undefined && tileY !== null;
  const hasTileId = tileId !== undefined && tileId !== null;
  const hasOrientation = orientation !== undefined && orientation !== null;
  if (!hasIndex && !hasX && !hasTileId) {
    throw standardError("source_tile_selector_required", "Provide tileIndex, tileX/tileY, or tileId.");
  }
  if (hasX !== hasY) {
    throw standardError("source_tile_coordinates_incomplete", "tileX and tileY must be provided together.");
  }

  const normalized = {
    tileIndex: hasIndex ? integer(tileIndex, "tileIndex") : null,
    tileX: hasX ? integer(tileX, "tileX") : null,
    tileY: hasY ? integer(tileY, "tileY") : null,
    tileId: hasTileId ? integer(tileId, "tileId") : null,
    orientation: hasOrientation ? integer(orientation, "orientation") : null,
  };
  let matches = tiles.filter((tile) =>
    (!hasIndex || Number(tile.index) === normalized.tileIndex) &&
    (!hasX || (Number(tile.x) === normalized.tileX && Number(tile.y) === normalized.tileY)) &&
    (!hasTileId || Number(tile.tileId) === normalized.tileId) &&
    (!hasOrientation || Number(tile.orientation) === normalized.orientation),
  );
  if (matches.length === 0) {
    throw standardError("source_tile_target_not_found", "No source tile matches the requested identity.", { requested: normalized });
  }
  if (matches.length !== 1) {
    throw standardError("source_tile_target_ambiguous", "The requested tile identity resolves to more than one source tile.", {
      requested: normalized,
      matches: matches.map((tile) => tile.index),
    });
  }
  const tile = matches[0];
  return {
    index: integer(tile.index, "tile.index"),
    x: integer(tile.x, "tile.x"),
    y: integer(tile.y, "tile.y"),
    tileId: integer(tile.tileId, "tile.tileId"),
    orientation: integer(tile.orientation, "tile.orientation"),
  };
}

export function buildAuroraViewportTarget({ sourceTile, yawDegrees, pitchDegrees, zoomPixelsPerTile, tolerance = {} }) {
  const target = {
    version: AURORA_VIEWPORT_TARGET_STANDARD_VERSION,
    sourceTile: requiredSourceTile(sourceTile),
    camera: {
      yawDegrees: boundedNumber(yawDegrees, "yawDegrees", 0, 360, { inclusiveMaximum: false }),
      pitchDegrees: boundedNumber(pitchDegrees, "pitchDegrees", 0, 90),
      zoomPixelsPerTile: positiveNumber(zoomPixelsPerTile, "zoomPixelsPerTile"),
    },
    tolerance: {
      yawDegrees: positiveNumber(tolerance.yawDegrees ?? DEFAULT_TOLERANCE.yawDegrees, "tolerance.yawDegrees"),
      pitchDegrees: positiveNumber(tolerance.pitchDegrees ?? DEFAULT_TOLERANCE.pitchDegrees, "tolerance.pitchDegrees"),
      zoomRatio: boundedNumber(tolerance.zoomRatio ?? DEFAULT_TOLERANCE.zoomRatio, "tolerance.zoomRatio", 0, 1, { inclusiveMinimum: false }),
      screenCenterPixels: positiveNumber(tolerance.screenCenterPixels ?? DEFAULT_TOLERANCE.screenCenterPixels, "tolerance.screenCenterPixels"),
    },
    acceptance: {
      requiresDirectToolsetTileReadback: true,
      requiresWorldYawReadback: true,
      requiresMeasuredPitch: true,
      requiresMeasuredZoom: true,
      requiresSelectionCenter: true,
      rejectsDurationAsCameraUnit: true,
    },
  };
  return target;
}

export function evaluateAuroraViewportTarget({ target, observation, toolsetSelectionReadback = null }) {
  const normalizedTarget = normalizeTarget(target);
  const blockers = [];
  const targetArea = String(observation?.target?.areaResref ?? "").trim().toLowerCase();
  const sourceArea = String(observation?.sourceScene?.area?.resref ?? observation?.target?.areaResref ?? "").trim().toLowerCase();
  if (!targetArea) blockers.push(blocker("viewport_target_observation_area_missing", "Observation has no Area resref."));
  if (targetArea && sourceArea && targetArea !== sourceArea) {
    blockers.push(blocker("viewport_target_area_mismatch", "Observation target and source Area do not match.", { targetArea, sourceArea }));
  }

  const tileVerification = verifyTileSelectionEvidence(normalizedTarget.sourceTile, toolsetSelectionReadback);
  if (tileVerification.status !== "verified") blockers.push(tileVerification.blocker);

  const pose = observation?.cameraPose;
  const cameraVerification = verifyCameraReadback(normalizedTarget.camera, normalizedTarget.tolerance, pose);
  blockers.push(...cameraVerification.blockers);

  const selectionCenter = verifySelectionCenter(normalizedTarget.tolerance, toolsetSelectionReadback, observation?.capture?.viewportBounds);
  if (selectionCenter.status !== "verified") blockers.push(selectionCenter.blocker);

  return {
    version: AURORA_VIEWPORT_TARGET_STANDARD_VERSION,
    status: blockers.length === 0 ? "verified" : "blocked",
    target: normalizedTarget,
    observation: {
      areaResref: targetArea || null,
      cameraPoseStatus: pose?.status ?? "missing",
    },
    verification: {
      tile: tileVerification,
      camera: cameraVerification,
      selectionCenter,
    },
    blockerCodes: blockers.map((item) => item.code),
    blockers,
    rule: "A viewport target is verified only from exact tile-selection evidence (direct Toolset identity or source-targeted visual transaction), full numeric camera readback, and measured selection-centre evidence. A blue outline, image difference, or input duration alone cannot substitute for these facts.",
  };
}

function verifyTileSelectionEvidence(targetTile, readback) {
  if (!readback || readback.status !== "verified") {
    return blocked("toolset_selected_tile_identity_unavailable", "No verified exact selected-tile evidence is available.");
  }
  const sourceTargeted = readback.evidenceKind === "source-targeted-visual-selection/v1";
  const actual = sourceTargeted ? readback.sourceTile : (readback.tile ?? readback);
  const fields = ["index", "x", "y", "tileId", "orientation"];
  const mismatch = fields.find((field) => Number(actual[field]) !== Number(targetTile[field]));
  if (mismatch) {
    return blocked("toolset_selected_tile_identity_mismatch", "Selected tile evidence does not match the requested source tile.", {
      expected: targetTile,
      actual: fields.reduce((result, field) => ({ ...result, [field]: actual[field] ?? null }), {}),
      mismatch,
    });
  }
  return {
    status: "verified",
    tile: targetTile,
    source: sourceTargeted ? "source_targeted_visual_selection" : "direct_toolset_readback",
    semanticClaim: sourceTargeted ? readback.semanticClaim ?? null : "Toolset direct tile identity",
  };
}

function verifyCameraReadback(targetCamera, tolerance, pose) {
  const blockers = [];
  if (!pose || pose.status !== "estimated") {
    blockers.push(blocker("camera_pose_readback_unavailable", "No accepted numeric camera pose is available."));
    return { status: "blocked", blockers };
  }
  if (!Number.isFinite(Number(pose.yawDegrees)) || pose?.yawEvidence?.method !== "source-grid-directed-selection/v1") {
    blockers.push(blocker("camera_world_yaw_readback_unavailable", "Only modulo-90 visual yaw is available; the standard requires world yaw 0-360."));
  } else if (periodicDistance(Number(pose.yawDegrees), targetCamera.yawDegrees, 360) > tolerance.yawDegrees) {
    blockers.push(blocker("camera_yaw_target_out_of_tolerance", "World yaw is outside target tolerance.", { expected: targetCamera.yawDegrees, actual: Number(pose.yawDegrees), tolerance: tolerance.yawDegrees }));
  }
  if (!Number.isFinite(Number(pose.pitchDegrees))) {
    blockers.push(blocker("camera_pitch_readback_unavailable", "Numeric pitch is unavailable."));
  } else if (Math.abs(Number(pose.pitchDegrees) - targetCamera.pitchDegrees) > tolerance.pitchDegrees) {
    blockers.push(blocker("camera_pitch_target_out_of_tolerance", "Pitch is outside target tolerance.", { expected: targetCamera.pitchDegrees, actual: Number(pose.pitchDegrees), tolerance: tolerance.pitchDegrees }));
  }
  if (!Number.isFinite(Number(pose.zoomPixelsPerTile))) {
    blockers.push(blocker("camera_zoom_readback_unavailable", "Numeric visual zoom is unavailable."));
  } else {
    const ratio = Number(pose.zoomPixelsPerTile) / targetCamera.zoomPixelsPerTile;
    if (Math.abs(Math.log(ratio)) > Math.log(1 + tolerance.zoomRatio)) {
      blockers.push(blocker("camera_zoom_target_out_of_tolerance", "Zoom is outside target tolerance.", { expected: targetCamera.zoomPixelsPerTile, actual: Number(pose.zoomPixelsPerTile), toleranceRatio: tolerance.zoomRatio }));
    }
  }
  return { status: blockers.length === 0 ? "verified" : "blocked", pose: pose ?? null, blockers };
}

function verifySelectionCenter(tolerance, readback, viewportBounds) {
  const center = readback?.selectionCenter;
  if (!center || !Number.isFinite(Number(center.x)) || !Number.isFinite(Number(center.y))) {
    return blocked("toolset_selection_center_unavailable", "A direct selected-tile screen centre is unavailable.");
  }
  if (!viewportBounds || !Number.isFinite(Number(viewportBounds.width)) || !Number.isFinite(Number(viewportBounds.height))) {
    return blocked("toolset_viewport_bounds_unavailable", "Viewport bounds are unavailable for centring verification.");
  }
  const expectedX = Number(viewportBounds.width) / 2;
  const expectedY = Number(viewportBounds.height) / 2;
  const errorPixels = Math.hypot(Number(center.x) - expectedX, Number(center.y) - expectedY);
  if (errorPixels > tolerance.screenCenterPixels) {
    return blocked("toolset_selection_center_out_of_tolerance", "Selected tile is not centred in the viewport.", { errorPixels: round(errorPixels), tolerance: tolerance.screenCenterPixels });
  }
  return { status: "verified", center: { x: Number(center.x), y: Number(center.y) }, errorPixels: round(errorPixels) };
}

function normalizeTarget(target) {
  if (!target || target.version !== AURORA_VIEWPORT_TARGET_STANDARD_VERSION) {
    throw standardError("viewport_target_invalid", "Viewport target must be created by buildAuroraViewportTarget.");
  }
  return {
    version: AURORA_VIEWPORT_TARGET_STANDARD_VERSION,
    sourceTile: requiredSourceTile(target.sourceTile),
    camera: {
      yawDegrees: boundedNumber(target.camera?.yawDegrees, "camera.yawDegrees", 0, 360, { inclusiveMaximum: false }),
      pitchDegrees: boundedNumber(target.camera?.pitchDegrees, "camera.pitchDegrees", 0, 90),
      zoomPixelsPerTile: positiveNumber(target.camera?.zoomPixelsPerTile, "camera.zoomPixelsPerTile"),
    },
    tolerance: {
      yawDegrees: positiveNumber(target.tolerance?.yawDegrees, "tolerance.yawDegrees"),
      pitchDegrees: positiveNumber(target.tolerance?.pitchDegrees, "tolerance.pitchDegrees"),
      zoomRatio: boundedNumber(target.tolerance?.zoomRatio, "tolerance.zoomRatio", 0, 1, { inclusiveMinimum: false }),
      screenCenterPixels: positiveNumber(target.tolerance?.screenCenterPixels, "tolerance.screenCenterPixels"),
    },
    acceptance: { ...target.acceptance },
  };
}

function requiredSourceTile(tile) {
  if (!tile) throw standardError("source_tile_target_required", "A resolved source tile is required.");
  return {
    index: integer(tile.index, "sourceTile.index"),
    x: integer(tile.x, "sourceTile.x"),
    y: integer(tile.y, "sourceTile.y"),
    tileId: integer(tile.tileId, "sourceTile.tileId"),
    orientation: integer(tile.orientation, "sourceTile.orientation"),
  };
}

function periodicDistance(left, right, period) {
  const raw = Math.abs((left - right) % period);
  return Math.min(raw, period - raw);
}

function blocked(code, reason, details = undefined) {
  return { status: "blocked", blocker: blocker(code, reason, details) };
}

function blocker(code, reason, details = undefined) {
  return { code, reason, ...(details === undefined ? {} : { details }) };
}

function positiveNumber(value, name) {
  const result = Number(value);
  if (!Number.isFinite(result) || result <= 0) throw standardError("viewport_target_number_invalid", `${name} must be a positive finite number.`);
  return result;
}

function boundedNumber(value, name, minimum, maximum, { inclusiveMinimum = true, inclusiveMaximum = true } = {}) {
  const result = Number(value);
  const lower = inclusiveMinimum ? result >= minimum : result > minimum;
  const upper = inclusiveMaximum ? result <= maximum : result < maximum;
  if (!Number.isFinite(result) || !lower || !upper) {
    throw standardError("viewport_target_number_out_of_range", `${name} must be ${inclusiveMinimum ? "at least" : "above"} ${minimum} and ${inclusiveMaximum ? "at most" : "below"} ${maximum}.`);
  }
  return result;
}

function integer(value, name) {
  const result = Number(value);
  if (!Number.isInteger(result)) throw standardError("viewport_target_integer_invalid", `${name} must be an integer.`);
  return result;
}

function standardError(code, message, details = undefined) {
  const error = new Error(message);
  error.code = code;
  if (details !== undefined) error.details = details;
  return error;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
