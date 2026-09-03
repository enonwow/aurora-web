import { describe, expect, it } from "vitest";
import {
  canEditExistingPlaceableScriptSlot,
  materializeExistingPlaceableScriptSlots
} from "../../../../../src/modules/layout/application/placeableScriptProvenance";
import { createEmptyPlaceableScriptSlots } from "../../../../../src/modules/scene/domain/sceneFactory";

describe("existing placeable script provenance", () => {
  it("admits only exact GIT placeable slots, preserving explicitly empty source values", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "placeable" as const,
      placeableOnUsed: "",
      placeableScriptResRefs: { onClick: "", onOpen: "old_open" }
    };

    expect(canEditExistingPlaceableScriptSlot(source, "onUsed")).toBe(true);
    expect(canEditExistingPlaceableScriptSlot(source, "onClick")).toBe(true);
    expect(canEditExistingPlaceableScriptSlot(source, "onOpen")).toBe(true);
    expect(canEditExistingPlaceableScriptSlot(source, "onLock")).toBe(false);
    expect(canEditExistingPlaceableScriptSlot({ ...source, type: "seed" }, "onOpen")).toBe(false);
    expect(canEditExistingPlaceableScriptSlot({ ...source, sourceKind: "creature" }, "onOpen"))
      .toBe(false);
  });

  it("materializes changed proven slots while restoring every unproven draft value", () => {
    const current = {
      ...createEmptyPlaceableScriptSlots(),
      onLock: "keep_lock",
      onOpen: "old_open",
      onUsed: "old_used"
    };
    const draft = {
      ...current,
      onClick: "unproven_click",
      onLock: "unproven_lock",
      onOpen: "new_open",
      onUsed: "new_used"
    };
    const result = materializeExistingPlaceableScriptSlots(
      {
        type: "aurora_git",
        sourceKind: "placeable",
        placeableOnUsed: "old_used",
        placeableScriptResRefs: { onOpen: "old_open" }
      },
      current,
      draft,
      true
    );

    expect(result).toEqual({
      ...current,
      onOpen: "new_open",
      onUsed: "new_used"
    });
    expect(result).not.toBe(current);
  });

  it("preserves an existing payload when the hidden enable flag is false and never invents one", () => {
    const current = createEmptyPlaceableScriptSlots();
    const source = { type: "aurora_git" as const, sourceKind: "placeable" as const };

    expect(materializeExistingPlaceableScriptSlots(source, current, current, false))
      .toEqual(current);
    expect(materializeExistingPlaceableScriptSlots(source, undefined, current, true))
      .toBeUndefined();
    expect(materializeExistingPlaceableScriptSlots(
      { ...source, sourceKind: "creature" },
      current,
      current,
      false
    )).toBeUndefined();
    expect(materializeExistingPlaceableScriptSlots(
      { type: "seed", sourceKind: "placeable" },
      current,
      current,
      false
    )).toBeUndefined();
  });
});
