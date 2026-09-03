import { describe, expect, it } from "vitest";
import {
  canEditExistingPlaceableTrapScript,
  materializeExistingPlaceableTrapSettings
} from "../../../../../src/modules/layout/application/placeableTrapScriptProvenance";
import type { SceneObjectPlaceableTrapSettings } from "../../../../../src/modules/scene/contracts";

const current: SceneObjectPlaceableTrapSettings = {
  isTrapped: true,
  trapType: "Spike Trap, Minor",
  detectionDc: 10,
  disarmDc: 15,
  oneShot: true,
  detectable: true,
  disarmable: true,
  onDisarmScript: "old_disarm",
  onTrapTriggeredScript: "old_trap",
  setDc: 5,
  detectDcModWhenSetByRogue: 10,
  disarmDcModWhenSetByRogue: 22
};

describe("existing placeable trap script provenance", () => {
  it("admits only exact GIT placeable trap script fields", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "placeable" as const,
      placeableTrapScriptResRefs: { onDisarmScript: "" }
    };
    expect(canEditExistingPlaceableTrapScript(source, "onDisarmScript")).toBe(true);
    expect(canEditExistingPlaceableTrapScript(source, "onTrapTriggeredScript")).toBe(false);
    expect(canEditExistingPlaceableTrapScript({ ...source, type: "seed" }, "onDisarmScript"))
      .toBe(false);
    expect(canEditExistingPlaceableTrapScript({ ...source, sourceKind: "creature" }, "onDisarmScript"))
      .toBe(false);
  });

  it("applies proven script changes while restoring every other trap field", () => {
    const result = materializeExistingPlaceableTrapSettings(
      {
        type: "aurora_git",
        sourceKind: "placeable",
        placeableTrapScriptResRefs: { onDisarmScript: "old_disarm" }
      },
      current,
      {
        ...current,
        isTrapped: false,
        trapType: "Fire Trap",
        detectionDc: 99,
        onDisarmScript: "new_disarm",
        onTrapTriggeredScript: "unproven_trap"
      }
    );
    expect(result).toEqual({ ...current, onDisarmScript: "new_disarm" });
    expect(result).not.toBe(current);
  });

  it("applies OnTrapTriggered without admitting an unproven OnDisarm change", () => {
    const result = materializeExistingPlaceableTrapSettings(
      {
        type: "aurora_git",
        sourceKind: "placeable",
        placeableTrapScriptResRefs: { onTrapTriggeredScript: "old_trap" }
      },
      current,
      {
        ...current,
        onDisarmScript: "unproven_disarm",
        onTrapTriggeredScript: "new_trap"
      }
    );
    expect(result).toEqual({ ...current, onTrapTriggeredScript: "new_trap" });
  });

  it("does not invent trap settings without an existing payload", () => {
    const source = { type: "aurora_git" as const, sourceKind: "placeable" as const };
    expect(materializeExistingPlaceableTrapSettings(source, undefined, current)).toBeUndefined();
  });
});
