import { describe, expect, it } from "vitest";
import type { SceneObject, SceneObjectKind } from "../../../../src/modules/scene/contracts";
import { createWorkspaceChromeFacade } from "../../../../src/modules/layout/application/workspaceChromeFacade";
import {
  canUseVisualTransformGizmoForObject,
  isVisualTransformAppliedToObject,
  resolveGizmoColorPalette,
  resolveGizmoTranslationDeltas,
  resolveVisualTransformSelectionBlockedReason,
  resolveVtScaleFactorFromAnchor
} from "../../../../src/modules/layout/visualTransformGizmoRules";

function createObject(kind: SceneObjectKind, patch?: Partial<SceneObject>): SceneObject {
  return {
    id: `${kind}-1`,
    kind,
    name: kind.toUpperCase(),
    tag: `${kind}_tag`,
    resRef: `${kind}_resref`,
    x: 5,
    y: 7,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    ...patch
  };
}

function createCanvasDebugState() {
  return createWorkspaceChromeFacade().createDefaultToolbarState().canvasDebug;
}

const ALL_SCENE_OBJECT_KINDS: SceneObjectKind[] = [
  "creatures",
  "doors",
  "encounters",
  "items",
  "placeables",
  "sounds",
  "stores",
  "triggers",
  "waypoints"
];

describe("visualTransformGizmoRules", () => {
  it("allows VT gizmo for static placeables and keeps default VT inactive", () => {
    const debugState = createCanvasDebugState();
    const staticPlaceable = createObject("placeables", { isStatic: true });

    const reason = resolveVisualTransformSelectionBlockedReason([staticPlaceable], debugState);
    expect(reason).toBeNull();
    expect(canUseVisualTransformGizmoForObject(staticPlaceable)).toBe(true);
    expect(isVisualTransformAppliedToObject(staticPlaceable)).toBe(false);
  });

  it("applies saved Aurora VT for static placeables", () => {
    const staticPlaceable = createObject("placeables", {
      isStatic: true,
      visualTransform: {
        scale: 0.5,
        scaleX: 0.5,
        scaleY: 0.5,
        scaleZ: 0.5,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: Math.PI / 2
      }
    });

    expect(canUseVisualTransformGizmoForObject(staticPlaceable)).toBe(true);
    expect(isVisualTransformAppliedToObject(staticPlaceable)).toBe(true);
  });

  it("keeps default VT inactive for non-static placeables", () => {
    const nonStaticPlaceable = createObject("placeables", { isStatic: false });

    expect(canUseVisualTransformGizmoForObject(nonStaticPlaceable)).toBe(true);
    expect(isVisualTransformAppliedToObject(nonStaticPlaceable)).toBe(false);
  });

  it("reports Aurora VT as applied for non-static placeables", () => {
    const nonStaticPlaceable = createObject("placeables", {
      isStatic: false,
      visualTransform: {
        scale: 0.5,
        scaleX: 0.5,
        scaleY: 0.5,
        scaleZ: 0.5,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: Math.PI / 2
      }
    });

    expect(canUseVisualTransformGizmoForObject(nonStaticPlaceable)).toBe(true);
    expect(isVisualTransformAppliedToObject(nonStaticPlaceable)).toBe(true);
  });

  it("allows VT gizmo for every Area object kind", () => {
    const debugState = createCanvasDebugState();
    for (const kind of ALL_SCENE_OBJECT_KINDS) {
      const object = createObject(kind, kind === "placeables" ? { isStatic: false } : undefined);

      expect(resolveVisualTransformSelectionBlockedReason([object], debugState)).toBeNull();
      expect(canUseVisualTransformGizmoForObject(object)).toBe(true);
    }
  });

  it("blocks VT gizmo only through locked layers", () => {
    const defaultDebug = createCanvasDebugState();
    const door = createObject("doors");
    expect(resolveVisualTransformSelectionBlockedReason([door], defaultDebug)).toBeNull();

    const lockedDebug = {
      ...defaultDebug,
      lockedKinds: {
        ...defaultDebug.lockedKinds,
        items: true
      }
    };
    const item = createObject("items");
    expect(resolveVisualTransformSelectionBlockedReason([item], lockedDebug)).toContain(
      "blocked by locked layer(s): items"
    );
  });

  it("keeps VT palette mapping stable (X=yellow, Y=orange)", () => {
    const vtPalette = resolveGizmoColorPalette("vt_rotate");
    expect(vtPalette.x).toBe("#ffe45e");
    expect(vtPalette.y).toBe("#ff9f1c");
    expect(vtPalette.z).toBe("#00d1b2");

    const worldPalette = resolveGizmoColorPalette("translate");
    expect(worldPalette.x).toBe("#ff4f5f");
    expect(worldPalette.y).toBe("#58df74");
    expect(worldPalette.z).toBe("#4f8cff");
  });

  it("computes stable VT scale factor from anchor delta", () => {
    expect(
      resolveVtScaleFactorFromAnchor(
        { x: 1, y: 1, z: 1 },
        { x: 2, y: 1, z: 1 },
        "X"
      )
    ).toBe(2);
    expect(
      resolveVtScaleFactorFromAnchor(
        { x: 1, y: 2, z: 1 },
        { x: 1, y: 3, z: 1 },
        "Y"
      )
    ).toBe(1.5);
    expect(
      resolveVtScaleFactorFromAnchor(
        { x: 2, y: 2, z: 2 },
        { x: 4, y: 6, z: 2 },
        "XYZ"
      )
    ).toBeCloseTo((2 + 3 + 1) / 3, 6);
  });

  it("applies vertical delta on free-axis VT translation", () => {
    const deltas = resolveGizmoTranslationDeltas(
      { x: 1, y: 2, z: 3 },
      { x: 3, y: 9, z: 8 },
      "XYZ",
      { vtMode: true }
    );
    expect(deltas.deltaX).toBe(2);
    expect(deltas.deltaY).toBe(5);
    expect(deltas.deltaZ).toBe(7);
  });

  it("keeps VT free-axis vertical delta for E and XYZE axis handles", () => {
    const start = { x: 2, y: 1, z: -3 };
    const current = { x: 5, y: 4, z: 2 };

    const deltasE = resolveGizmoTranslationDeltas(start, current, "E", { vtMode: true });
    expect(deltasE.deltaX).toBe(3);
    expect(deltasE.deltaY).toBe(5);
    expect(deltasE.deltaZ).toBe(3);

    const deltasXYZE = resolveGizmoTranslationDeltas(start, current, "XYZE", { vtMode: true });
    expect(deltasXYZE.deltaX).toBe(3);
    expect(deltasXYZE.deltaY).toBe(5);
    expect(deltasXYZE.deltaZ).toBe(3);
  });

  it("keeps vertical delta for free-axis world translation", () => {
    const deltas = resolveGizmoTranslationDeltas(
      { x: 1, y: 2, z: 3 },
      { x: 3, y: 9, z: 8 },
      "XYZ",
      { vtMode: false }
    );
    expect(deltas.deltaX).toBe(2);
    expect(deltas.deltaY).toBe(5);
    expect(deltas.deltaZ).toBe(7);
  });
});
