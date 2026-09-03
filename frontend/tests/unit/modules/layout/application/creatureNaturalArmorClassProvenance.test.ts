import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureNaturalArmorClass,
  materializeExistingCreatureNaturalArmorClass,
  reduceExistingCreatureNaturalArmorClass,
} from "../../../../../src/modules/layout/application/creatureNaturalArmorClassProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureNaturalArmorClass: {
    present: true,
    nativeType: "byte",
    value: 0,
  },
};

describe("existing Creature NaturalAC provenance", () => {
  it("activates only exact present native Creature provenance", () => {
    expect(canEditExistingCreatureNaturalArmorClass(exactSource)).toBe(true);
    expect(canEditExistingCreatureNaturalArmorClass({
      ...exactSource,
      creatureNaturalArmorClass: { present: false },
    })).toBe(false);
    expect(canEditExistingCreatureNaturalArmorClass({
      ...exactSource,
      sourceKind: "placeable",
    })).toBe(false);
    expect(canEditExistingCreatureNaturalArmorClass({
      ...exactSource,
      sourceIndex: undefined,
    })).toBe(false);
  });

  it("reduces only admitted Byte values and keeps seed authoring bounded", () => {
    expect(reduceExistingCreatureNaturalArmorClass(exactSource, 0, 2)).toBe(2);
    expect(reduceExistingCreatureNaturalArmorClass(exactSource, 0, 256)).toBe(0);
    expect(reduceExistingCreatureNaturalArmorClass(
      { ...exactSource, creatureNaturalArmorClass: { present: false } },
      0,
      2,
    )).toBe(0);
    expect(reduceExistingCreatureNaturalArmorClass({ type: "seed" }, 0, 2)).toBe(2);
    expect(reduceExistingCreatureNaturalArmorClass({ type: "seed" }, 0, 1_000)).toBe(0);
  });

  it("materializes admitted values and otherwise preserves the current state", () => {
    expect(materializeExistingCreatureNaturalArmorClass(exactSource, 0, 2)).toBe(2);
    expect(materializeExistingCreatureNaturalArmorClass(exactSource, 0, -1)).toBe(0);
    expect(materializeExistingCreatureNaturalArmorClass(
      { ...exactSource, creatureNaturalArmorClass: { present: false } },
      0,
      2,
    )).toBe(0);
    expect(materializeExistingCreatureNaturalArmorClass({ type: "seed" }, 0, 255))
      .toBe(255);
  });
});
