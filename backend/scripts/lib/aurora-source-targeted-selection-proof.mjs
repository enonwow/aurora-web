/**
 * Verifies the controller's own source-directed selection transaction. It is
 * intentionally not a Toolset semantic readback: it proves the requested
 * source tile was targeted and produced a fresh visual selection outline.
 */
export function verifySourceTargetedSelection({ sourceTile, dispatch, beforeAnchor, afterAnchor, viewportBounds, capturePath }) {
  const tile = normalizeTile(sourceTile);
  const safety = normalizeDispatch(dispatch);
  if (!capturePath) return blocked("source_targeted_selection_capture_missing", "Post-click viewport capture path is required.");
  if (beforeAnchor?.acceptance?.accepted === true) return blocked("source_targeted_selection_baseline_not_clear", "Baseline already contains a selection anchor; fresh selection cannot be proven.");
  const anchor = afterAnchor?.selectionAnchor;
  if (afterAnchor?.acceptance?.accepted !== true || !finitePoint(anchor?.center) || !finiteBounds(anchor?.bounds)) {
    return blocked("source_targeted_selection_outline_missing", "Post-click capture has no accepted blue selection outline.");
  }
  const bounds = normalizeBounds(viewportBounds);
  if (!pointInBounds(safety.click, anchor.bounds)) return blocked("source_targeted_selection_click_outside_outline", "Targeted click does not fall inside the resulting selection outline.", { click: safety.click, outline: anchor.bounds });
  if (!pointInBounds(anchor.center, bounds) || !boundsContains(bounds, anchor.bounds)) return blocked("source_targeted_selection_outline_outside_viewport", "Selection outline is not fully inside the validated viewport.");
  return {
    status: "verified",
    evidenceKind: "source-targeted-visual-selection/v1",
    semanticClaim: "source tile was targeted by the controller and visually selected; Toolset did not expose a Tile_ID readback",
    sourceTile: tile,
    selectionCenter: { x: Number(anchor.center.x), y: Number(anchor.center.y) },
    selectionOutline: normalizeBounds(anchor.bounds),
    capturePath,
    dispatch: safety,
  };
}

function normalizeTile(value) {
  if (!["index", "x", "y", "tileId", "orientation"].every((key) => Number.isInteger(Number(value?.[key])))) throw codedError("source_targeted_selection_tile_invalid", "Exact source tile identity is required.");
  return Object.fromEntries(["index", "x", "y", "tileId", "orientation"].map((key) => [key, Number(value[key])]));
}
function normalizeDispatch(value) {
  if (value?.targetClass !== "TScrollBox" || value?.method !== "targeted_wm_lbuttondown_up" || value?.usesGlobalCursor || value?.usesGlobalKeyboard || value?.usesGlobalMouse || !finitePoint(value?.click)) {
    throw codedError("source_targeted_selection_dispatch_invalid", "Selection must use a non-global down/up transaction targeted to the validated TScrollBox.");
  }
  return { targetClass: value.targetClass, method: value.method, click: { x: Number(value.click.x), y: Number(value.click.y) }, usesGlobalCursor: false, usesGlobalKeyboard: false, usesGlobalMouse: false };
}
function normalizeBounds(value) { if (!finiteBounds(value)) throw codedError("source_targeted_selection_viewport_invalid", "Finite viewport bounds are required."); return { left: Number(value.left ?? 0), top: Number(value.top ?? 0), width: Number(value.width), height: Number(value.height), right: Number(value.right ?? (Number(value.left ?? 0) + Number(value.width))), bottom: Number(value.bottom ?? (Number(value.top ?? 0) + Number(value.height))) }; }
function finiteBounds(value) { const left=Number(value?.left ?? 0), top=Number(value?.top ?? 0), width=Number(value?.width ?? ((Number(value?.right) - left))), height=Number(value?.height ?? ((Number(value?.bottom) - top))); return [left, top, width, height].every(Number.isFinite) && width > 0 && height > 0; }
function finitePoint(value) { return Number.isFinite(Number(value?.x)) && Number.isFinite(Number(value?.y)); }
function pointInBounds(point, bounds) { const b=normalizeBounds(bounds); return Number(point.x)>=b.left && Number(point.x)<=b.right && Number(point.y)>=b.top && Number(point.y)<=b.bottom; }
function boundsContains(outer, inner) { const a=normalizeBounds(outer), b=normalizeBounds(inner); return b.left>=a.left && b.top>=a.top && b.right<=a.right && b.bottom<=a.bottom; }
function blocked(blockerCode, reason, details=undefined) { return { status: "blocked", blockerCode, reason, ...(details === undefined ? {} : { details }) }; }
function codedError(code, message) { const error=new Error(message); error.code=code; return error; }
