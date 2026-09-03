import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureSavingThrowBonus,
  materializeExistingCreatureSavingThrowBonuses,
  reduceExistingCreatureSavingThrowBonus,
} from "../../../../../src/modules/layout/application/creatureSavingThrowBonusesProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureSavingThrowBonuses: {
    fortitude: { present: true, nativeType: "short", value: 3 },
    reflex: { present: true, nativeType: "short", value: 1 },
    will: { present: true, nativeType: "short", value: 2 },
  },
};

describe("existing Creature saving-throw bonus provenance", () => {
  it("activates each member only from exact present native Creature provenance", () => {
    expect(canEditExistingCreatureSavingThrowBonus(exactSource, "fortitude")).toBe(true);
    expect(canEditExistingCreatureSavingThrowBonus({
      ...exactSource,
      creatureSavingThrowBonuses: {
        ...exactSource.creatureSavingThrowBonuses!,
        reflex: { present: false },
      },
    }, "reflex")).toBe(false);
    expect(canEditExistingCreatureSavingThrowBonus({
      ...exactSource,
      sourceKind: "placeable",
    }, "will")).toBe(false);
    expect(canEditExistingCreatureSavingThrowBonus({
      ...exactSource,
      sourceIndex: undefined,
    }, "fortitude")).toBe(false);
  });

  it("reduces only admitted targets and keeps seed authoring bounded", () => {
    expect(reduceExistingCreatureSavingThrowBonus(exactSource, "fortitude", 3, 4)).toBe(4);
    expect(reduceExistingCreatureSavingThrowBonus(exactSource, "fortitude", 3, 251)).toBe(3);
    expect(reduceExistingCreatureSavingThrowBonus({
      ...exactSource,
      creatureSavingThrowBonuses: {
        ...exactSource.creatureSavingThrowBonuses!,
        fortitude: { present: false },
      },
    }, "fortitude", 3, 4)).toBe(3);
    expect(reduceExistingCreatureSavingThrowBonus({ type: "seed" }, "will", 0, 250)).toBe(250);
  });

  it("materializes admitted members and preserves every blocked member", () => {
    expect(materializeExistingCreatureSavingThrowBonuses(
      exactSource,
      { fortitude: 3, reflex: 1, will: 2 },
      { fortitude: 4, reflex: 5, will: 6 },
    )).toEqual({ fortitude: 4, reflex: 5, will: 6 });
    expect(materializeExistingCreatureSavingThrowBonuses(
      {
        ...exactSource,
        creatureSavingThrowBonuses: {
          ...exactSource.creatureSavingThrowBonuses!,
          reflex: { present: false },
        },
      },
      { fortitude: 3, reflex: 1, will: 2 },
      { fortitude: 4, reflex: 5, will: 251 },
    )).toEqual({ fortitude: 4, reflex: 1, will: 2 });
  });
});
