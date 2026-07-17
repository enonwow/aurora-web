export function buildSelectionAnchorTransition({ before, after }) {
  const beforeAnchor = requiredAnchor(before, "before");
  const afterAnchor = requiredAnchor(after, "after");
  const deltaX = round(afterAnchor.center.x - beforeAnchor.center.x);
  const deltaY = round(afterAnchor.center.y - beforeAnchor.center.y);
  return {
    status: "estimated",
    before: beforeAnchor,
    after: afterAnchor,
    deltaX,
    deltaY,
    distancePixels: round(Math.hypot(deltaX, deltaY)),
  };
}

export function requireMeasuredSelectionAnchorMovement({ baseline, effect }) {
  if (!effect || effect.status !== "estimated") {
    return { status: "blocked", blockerCode: "toolset_selection_anchor_unavailable", reason: "Selection anchor was unavailable after camera movement." };
  }
  const baselineDistance = baseline?.status === "estimated" ? Number(baseline.distancePixels) : 0;
  const requiredDistancePixels = round(Math.max(1, baselineDistance * 5 + 0.5));
  return effect.distancePixels >= requiredDistancePixels
    ? { status: "measured", metric: "selectionAnchorDeltaPixels", value: effect.distancePixels, requiredDistancePixels }
    : { status: "blocked", blockerCode: "toolset_selection_anchor_delta_not_proven", reason: "Selected visual anchor did not move beyond baseline noise.", requiredDistancePixels };
}

function requiredAnchor(analysis, name) {
  if (analysis?.acceptance?.accepted !== true || !analysis.selectionAnchor) {
    const error = new Error(`${name} selection anchor is unavailable.`);
    error.code = "toolset_selection_anchor_unavailable";
    throw error;
  }
  const anchor = analysis.selectionAnchor;
  if (!Number.isFinite(Number(anchor.center?.x)) || !Number.isFinite(Number(anchor.center?.y))) {
    const error = new Error(`${name} selection anchor center is invalid.`);
    error.code = "toolset_selection_anchor_invalid";
    throw error;
  }
  return anchor;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
