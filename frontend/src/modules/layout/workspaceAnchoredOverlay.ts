export const CONTEXT_MENU_FALLBACK_WIDTH_PX = 260;
export const CONTEXT_MENU_FALLBACK_HEIGHT_PX = 320;
export const CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX = 14;
export const CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX = 12;

const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_MAX_ANCHOR_OFFSET_PX = 72;

export function normalizeContextMenuAnchorOffset(
  anchorOffsetX: number,
  anchorOffsetY: number
): { x: number; y: number } {
  const length = Math.hypot(anchorOffsetX, anchorOffsetY);
  if (length <= CONTEXT_MENU_MAX_ANCHOR_OFFSET_PX || length === 0) {
    return { x: anchorOffsetX, y: anchorOffsetY };
  }
  const scale = CONTEXT_MENU_MAX_ANCHOR_OFFSET_PX / length;
  return {
    x: anchorOffsetX * scale,
    y: anchorOffsetY * scale
  };
}

export function clampContextMenuPosition(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
  menuWidth: number,
  menuHeight: number
): { x: number; y: number } {
  const minX = CONTEXT_MENU_MARGIN_PX;
  const minY = CONTEXT_MENU_MARGIN_PX;
  const maxX = Math.max(
    CONTEXT_MENU_MARGIN_PX,
    viewportWidth - menuWidth - CONTEXT_MENU_MARGIN_PX
  );
  const maxY = Math.max(
    CONTEXT_MENU_MARGIN_PX,
    viewportHeight - menuHeight - CONTEXT_MENU_MARGIN_PX
  );
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  };
}
