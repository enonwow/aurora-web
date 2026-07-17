import type { WorkspaceToolbarState } from "./application/workspaceChromeFacade";
import type { SceneObject, SceneObjectKind, SceneObjectVisualTransform } from "./contracts";

export type CanvasGizmoMode = WorkspaceToolbarState["canvasDebug"]["gizmoMode"];
export type CanvasDebugState = WorkspaceToolbarState["canvasDebug"];

const VISUAL_TRANSFORM_EDITABLE_KINDS = new Set<SceneObjectKind>([
  "creatures",
  "doors",
  "encounters",
  "items",
  "placeables",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
]);

const VISUAL_TRANSFORM_GIZMO_MODES = new Set<CanvasGizmoMode>([
  "vt_rotate",
  "vt_translate",
  "vt_scale"
]);

export const WORLD_GIZMO_COLORS = {
  x: "#ff4f5f",
  y: "#58df74",
  z: "#4f8cff",
  active: "#ffd166"
};

export const VT_GIZMO_COLORS = {
  x: "#ffe45e",
  y: "#ff9f1c",
  z: "#00d1b2",
  active: "#ffffff"
};

export function isVisualTransformEditableForObject(object: SceneObject): boolean {
  return VISUAL_TRANSFORM_EDITABLE_KINDS.has(object.kind);
}

export function canUseVisualTransformGizmoForObject(object: SceneObject): boolean {
  if (!isVisualTransformEditableForObject(object)) {
    return false;
  }
  return true;
}

export function isVisualTransformAppliedToObject(object: SceneObject): boolean {
  return hasNonDefaultVisualTransform(object.visualTransform);
}

function hasNonDefaultVisualTransform(transform: SceneObjectVisualTransform): boolean {
  const scaleX = transform.scaleX ?? transform.scale;
  const scaleY = transform.scaleY ?? transform.scale;
  const scaleZ = transform.scaleZ ?? transform.scale;
  return (
    Math.abs(scaleX - 1) > 1e-6 ||
    Math.abs(scaleY - 1) > 1e-6 ||
    Math.abs(scaleZ - 1) > 1e-6 ||
    Math.abs(transform.offsetX) > 1e-6 ||
    Math.abs(transform.offsetY) > 1e-6 ||
    Math.abs(transform.offsetZ) > 1e-6 ||
    Math.abs(transform.pitch) > 1e-6 ||
    Math.abs(transform.roll) > 1e-6 ||
    Math.abs(transform.yaw) > 1e-6
  );
}

export function isVisualTransformGizmoMode(mode: CanvasGizmoMode): boolean {
  return VISUAL_TRANSFORM_GIZMO_MODES.has(mode);
}

export function resolveVisualTransformSelectionBlockedReason(
  targets: SceneObject[],
  debugState: CanvasDebugState
): string | null {
  if (targets.length === 0) {
    return "Select at least one object to use Visual Transform gizmo.";
  }

  const blockedKinds = Array.from(
    new Set(
      targets
        .filter((object) => !isVisualTransformEditableForObject(object))
        .map((object) => object.kind)
    )
  );
  if (blockedKinds.length > 0) {
    return `Visual Transform is unavailable for selected kind(s): ${blockedKinds.join(", ")}.`;
  }

  const lockedKinds = Array.from(
    new Set(
      targets
        .filter((object) => debugState.lockedKinds[object.kind])
        .map((object) => object.kind)
    )
  );
  if (lockedKinds.length > 0) {
    return `Visual Transform is blocked by locked layer(s): ${lockedKinds.join(", ")}.`;
  }

  return null;
}

export function resolveGizmoColorPalette(gizmoMode: CanvasGizmoMode) {
  return isVisualTransformGizmoMode(gizmoMode) ? VT_GIZMO_COLORS : WORLD_GIZMO_COLORS;
}

export function resolveGizmoModeBadge(mode: CanvasGizmoMode): {
  label: string;
  variant: "world" | "vt";
} {
  if (mode === "translate") {
    return { label: "World Move (1)", variant: "world" };
  }
  if (mode === "rotate") {
    return { label: "World Bearing (2)", variant: "world" };
  }
  if (mode === "vt_rotate") {
    return { label: "VT Rotate (3)", variant: "vt" };
  }
  if (mode === "vt_translate") {
    return { label: "VT Offset (4)", variant: "vt" };
  }
  if (mode === "vt_scale") {
    return { label: "VT Scale (5)", variant: "vt" };
  }
  return { label: `Mode: ${mode}`, variant: "world" };
}

export function resolveTransformControlsMode(
  gizmoMode: CanvasGizmoMode
): "translate" | "rotate" | "scale" | null {
  if (gizmoMode === "translate") {
    return "translate";
  }
  if (gizmoMode === "rotate") {
    return "rotate";
  }
  if (gizmoMode === "vt_translate") {
    return "translate";
  }
  if (gizmoMode === "vt_rotate") {
    return "rotate";
  }
  if (gizmoMode === "vt_scale") {
    return "scale";
  }
  return null;
}

export function resolveVtScaleFactorFromAnchor(
  startAnchorScale: { x: number; y: number; z: number },
  currentAnchorScale: { x: number; y: number; z: number },
  axis: string | null
): number {
  const normalizedAxis = (axis ?? "").toUpperCase();
  const applyAllAxes =
    normalizedAxis.length === 0 ||
    normalizedAxis === "XYZ" ||
    normalizedAxis === "XYZE" ||
    normalizedAxis === "E";

  const ratioX = startAnchorScale.x !== 0 ? currentAnchorScale.x / startAnchorScale.x : 1;
  const ratioY = startAnchorScale.y !== 0 ? currentAnchorScale.y / startAnchorScale.y : 1;
  const ratioZ = startAnchorScale.z !== 0 ? currentAnchorScale.z / startAnchorScale.z : 1;

  const axisRatios: number[] = [];
  if (applyAllAxes || normalizedAxis.includes("X")) {
    axisRatios.push(ratioX);
  }
  if (applyAllAxes || normalizedAxis.includes("Y")) {
    axisRatios.push(ratioY);
  }
  if (applyAllAxes || normalizedAxis.includes("Z")) {
    axisRatios.push(ratioZ);
  }

  const normalizedRatios = axisRatios.filter((value) => Number.isFinite(value) && value > 0);
  const scaleFactor =
    normalizedRatios.length > 0
      ? normalizedRatios.reduce((sum, value) => sum + value, 0) / normalizedRatios.length
      : 1;
  return Math.max(0.01, scaleFactor);
}

export function resolveGizmoTranslationDeltas(
  startAnchorPosition: { x: number; y: number; z: number },
  currentAnchorPosition: { x: number; y: number; z: number },
  axis: string | null,
  options?: { vtMode?: boolean }
): { deltaX: number; deltaY: number; deltaZ: number } {
  const normalizedAxis = (axis ?? "").toUpperCase();
  const isFreeAxis =
    normalizedAxis.length === 0 ||
    normalizedAxis === "XYZ" ||
    normalizedAxis === "XYZE" ||
    normalizedAxis === "E";

  const rawDeltaX = currentAnchorPosition.x - startAnchorPosition.x;
  const rawDeltaY = currentAnchorPosition.z - startAnchorPosition.z;
  const rawDeltaZ = currentAnchorPosition.y - startAnchorPosition.y;

  const vtMode = options?.vtMode ?? false;
  const allowX = isFreeAxis || normalizedAxis.includes("X");
  const allowY = isFreeAxis || normalizedAxis.includes("Z");
  // Aurora-first: VT free translate should support full 3D movement (X/Y/Z).
  // Keep vtMode read to preserve API contract for existing callers.
  void vtMode;
  const allowZ = isFreeAxis || normalizedAxis.includes("Y");

  return {
    deltaX: allowX ? rawDeltaX : 0,
    deltaY: allowY ? rawDeltaY : 0,
    deltaZ: allowZ ? rawDeltaZ : 0
  };
}
