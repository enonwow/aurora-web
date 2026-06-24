import { describe, expect, it } from "vitest";
import {
  MOVE_ALLOWED_KINDS,
  resolveMovableVisibleSelection
} from "../../../../../src/modules/layout/application/workspaceSceneInteraction";
import { createDefaultToolbarState } from "../../../../../src/modules/layout/roleTopbarPolicy";
import { createNewSceneObject } from "../../../../../src/modules/scene/domain/sceneFactory";

describe("workspaceSceneInteraction MOVE_ALLOWED_KINDS", () => {
  it("allows non-static placeables while keeping static placeables locked", () => {
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
    ).toEqual({ ids: [], reason: "selection_locked_or_immovable" });
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
