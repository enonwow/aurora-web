import type { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import {
  resolveGizmoColorPalette,
  type CanvasGizmoMode
} from "../../visualTransformGizmoRules";
export {
  resolveGizmoModeBadge,
  resolveTransformControlsMode
} from "../../visualTransformGizmoRules";

export function applyTransformControlsPalette(
  transformControls: TransformControls,
  gizmoMode: CanvasGizmoMode
): void {
  if (typeof transformControls.setColors !== "function") {
    return;
  }

  const palette = resolveGizmoColorPalette(gizmoMode);
  transformControls.setColors(palette.x, palette.y, palette.z, palette.active);
}
