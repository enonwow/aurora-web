const DEFAULT_TOLERANCE_DEGREES = 8;

/**
 * Resolves the 0..360 ambiguity from source-grid directions, not from a
 * toolbar duration. Each sample must already carry direct Toolset identity or
 * a verified source-targeted visual selection transaction, plus its centre.
 *
 * Convention: 0 degrees is source Area +X projected to screen-right;
 * positive rotation follows Windows screen coordinates (clockwise).
 */
export function deriveSourceGridCalibratedYaw({ samples, toleranceDegrees = DEFAULT_TOLERANCE_DEGREES }) {
  const normalized = (samples ?? []).map(normalizeSample);
  if (normalized.length < 2) return blocked("camera_world_yaw_calibration_samples_missing", "At least two direct selected-tile samples are required.");
  const axisPairs = [];
  for (let left = 0; left < normalized.length; left += 1) {
    for (let right = left + 1; right < normalized.length; right += 1) {
      const pair = makeAxisPair(normalized[left], normalized[right]);
      if (pair) axisPairs.push(pair);
    }
  }
  const xPairs = axisPairs.filter((pair) => pair.axis === "x");
  const yPairs = axisPairs.filter((pair) => pair.axis === "y");
  if (xPairs.length === 0 && yPairs.length === 0) return blocked("camera_world_yaw_axis_pair_missing", "Samples need two tiles sharing source x or source y so one directed source axis is known.");
  const xYaw = xPairs.length ? circularMean(xPairs.map((pair) => pair.axisBearingDegrees)) : null;
  const yYaw = yPairs.length ? normalizeDegrees(circularMean(yPairs.map((pair) => pair.axisBearingDegrees)) - 90) : null;
  if (xYaw !== null && yYaw !== null && circularDistance(xYaw, yYaw) > Number(toleranceDegrees)) {
    return blocked("camera_world_yaw_axis_inconsistent", "Source +X and +Y screen projections do not agree on one world bearing.", { xYawDegrees: xYaw, yYawDegrees: yYaw, toleranceDegrees: Number(toleranceDegrees) });
  }
  const yawDegrees = round(xYaw ?? yYaw);
  return {
    status: "estimated",
    yawDegrees,
    yawEvidence: {
      method: "source-grid-directed-selection/v1",
      coordinateSystem: "aurora-area-source-grid/v1",
      convention: "0deg=source+X-to-screen-right; positive=screen-clockwise",
      directTileSamples: normalized.map(({ tile, selectionCenter }) => ({ tile, selectionCenter })),
      axisPairCount: axisPairs.length,
      toleranceDegrees: Number(toleranceDegrees),
    },
  };
}

function normalizeSample(value) {
  const sourceTargeted = value?.evidenceKind === "source-targeted-visual-selection/v1";
  const tile = sourceTargeted ? value?.sourceTile : (value?.tile ?? value);
  if (value?.status !== "verified" || !["x", "y", "index", "tileId", "orientation"].every((key) => Number.isInteger(Number(tile?.[key]))) || !finitePoint(value?.selectionCenter)) {
    const error = new Error("Each yaw calibration sample requires verified exact tile-selection evidence and finite selectionCenter.");
    error.code = "camera_world_yaw_sample_invalid";
    throw error;
  }
  return { tile: { index: Number(tile.index), x: Number(tile.x), y: Number(tile.y), tileId: Number(tile.tileId), orientation: Number(tile.orientation) }, selectionCenter: { x: Number(value.selectionCenter.x), y: Number(value.selectionCenter.y) } };
}

function makeAxisPair(left, right) {
  const dx = right.tile.x - left.tile.x;
  const dy = right.tile.y - left.tile.y;
  if ((dx === 0 && dy === 0) || (dx !== 0 && dy !== 0)) return null;
  const screenX = right.selectionCenter.x - left.selectionCenter.x;
  const screenY = right.selectionCenter.y - left.selectionCenter.y;
  const distance = Math.hypot(screenX, screenY);
  if (distance < 1) return null;
  const sourceDelta = dx !== 0 ? dx : dy;
  return { axis: dx !== 0 ? "x" : "y", axisBearingDegrees: normalizeDegrees(toDegrees(Math.atan2(screenY / sourceDelta, screenX / sourceDelta))) };
}

function circularMean(values) { return normalizeDegrees(toDegrees(Math.atan2(values.reduce((sum, value) => sum + Math.sin(toRadians(value)), 0), values.reduce((sum, value) => sum + Math.cos(toRadians(value)), 0)))); }
function circularDistance(left, right) { const raw = Math.abs(normalizeDegrees(left) - normalizeDegrees(right)); return Math.min(raw, 360 - raw); }
function finitePoint(value) { return Number.isFinite(Number(value?.x)) && Number.isFinite(Number(value?.y)); }
function normalizeDegrees(value) { return ((Number(value) % 360) + 360) % 360; }
function toDegrees(value) { return value * 180 / Math.PI; }
function toRadians(value) { return value * Math.PI / 180; }
function round(value) { return Math.round(value * 1000) / 1000; }
function blocked(blockerCode, reason, details = undefined) { return { status: "blocked", blockerCode, reason, ...(details === undefined ? {} : { details }) }; }
