import { describe, expect, it } from "vitest";
import {
  MOVE_ALLOWED_KINDS,
  resolveMovableVisibleSelection
} from "../../../../../src/modules/layout/application/workspaceSceneInteraction";
import { createDefaultToolbarState } from "../../../../../src/modules/layout/roleTopbarPolicy";
import { createNewSceneObject } from "../../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceSceneInteraction MOVE_ALLOWED_KINDS", () => {
  it("allows moving both static and non-static placeables (Aurora Toolset parity)", () => {
    // Static placeables are movable in the Aurora Toolset and per docs 4.1;
    // the Static flag only gates VT rendering, not world move/rotate/height.
    const staticPlaceable = createNewSceneObject("placeables", 1, 1, 1);
    const dynamicPlaceable = {
      ...createNewSceneObject("placeables", 1, 1, 2),
      isStatic: false
    };
    const toolbarState = createDefaultToolbarState();

    expect(MOVE_ALLOWED_KINDS.has("placeables")).toBe(true);
    expect(
      resolveMovableVisibleSelection({
        selectedObjectIds: [staticPlaceable.id],
        objects: [staticPlaceable],
        toolbarState
      })
    ).toEqual({ ids: [staticPlaceable.id] });
    expect(
      resolveMovableVisibleSelection({
        selectedObjectIds: [dynamicPlaceable.id],
        objects: [dynamicPlaceable],
        toolbarState
      })
    ).toEqual({ ids: [dynamicPlaceable.id] });
  });

  it("still allows moving creatures, items, and sounds", () => {
    expect(MOVE_ALLOWED_KINDS.has("creatures")).toBe(true);
    expect(MOVE_ALLOWED_KINDS.has("items")).toBe(true);
    expect(MOVE_ALLOWED_KINDS.has("sounds")).toBe(true);
  });
});
