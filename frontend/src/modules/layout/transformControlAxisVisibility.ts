export type GizmoMode =
  | "translate"
  | "rotate"
  | "scale"
  | "vt_rotate"
  | "vt_translate"
  | "vt_scale";

export interface TransformControlAxisVisibility {
  showX: boolean;
  showY: boolean;
  showZ: boolean;
}

export function resolveTransformControlAxisVisibility(
  gizmoMode: GizmoMode
): TransformControlAxisVisibility {
  if (gizmoMode === "translate") {
    // In Aurora-style coordinates, height is stored as Z while the 3D up axis remains Y.
    // Keeping Y visible in translate mode preserves vertical movement editing.
    return { showX: true, showY: true, showZ: true };
  }
  if (gizmoMode === "rotate") {
    return { showX: false, showY: true, showZ: false };
  }
  if (gizmoMode === "vt_rotate" || gizmoMode === "vt_translate" || gizmoMode === "vt_scale") {
    return { showX: true, showY: true, showZ: true };
  }
  return { showX: false, showY: false, showZ: false };
}
