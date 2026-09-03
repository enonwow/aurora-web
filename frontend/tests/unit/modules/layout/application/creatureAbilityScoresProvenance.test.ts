import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureAbilityScore,
  materializeExistingCreatureAbilityScores,
  reduceExistingCreatureAbilityScore,
} from "../../../../../src/modules/layout/application/creatureAbilityScoresProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureAbilityScores: {
    strength: { present: true, nativeType: "byte", value: 15 },
    dexterity: { present: true, nativeType: "byte", value: 12 },
    constitution: { present: true, nativeType: "byte", value: 14 },
    intelligence: { present: false },
    wisdom: { present: true, nativeType: "byte", value: 11 },
    charisma: { present: true, nativeType: "byte", value: 8 },
  },
  creatureHitPointState: {
    present: true,
    hitPoints: { nativeType: "short", value: 20 },
    currentHitPoints: { nativeType: "short", value: 20 },
    maxHitPoints: { nativeType: "short", value: 30 },
    constitution: { nativeType: "byte", value: 14 },
    race: { nativeType: "byte", value: 1 },
    classLevels: [5],
    featRow40Present: false,
    racialTypes: {
      resourceName: "racialtypes.2da",
      sourceObjectKey: "runtime-source/module/racialtypes.2da",
      sourceLayer: "module",
      sha256: "a".repeat(64),
      sizeBytes: 400,
      rowCount: 3,
      rowIndex: 1,
      constitutionAdjust: 0,
    },
  },
};

describe("existing Creature base ability-score provenance", () => {
  it("activates each canonical member independently", () => {
    expect(canEditExistingCreatureAbilityScore(exactSource, "strength")).toBe(true);
    expect(canEditExistingCreatureAbilityScore(exactSource, "constitution")).toBe(true);
    expect(canEditExistingCreatureAbilityScore(exactSource, "intelligence")).toBe(false);
    expect(canEditExistingCreatureAbilityScore(
      { ...exactSource, sourceKind: "placeable" },
      "strength",
    )).toBe(false);
    expect(canEditExistingCreatureAbilityScore({
      ...exactSource,
      creatureHitPointState: { present: false },
    }, "constitution")).toBe(false);
    expect(canEditExistingCreatureAbilityScore(
      { ...exactSource, sourceIndex: undefined },
      "strength",
    )).toBe(false);
  });

  it("reduces only admitted Byte values on editable members", () => {
    expect(reduceExistingCreatureAbilityScore(exactSource, "strength", 15, 17)).toBe(17);
    expect(reduceExistingCreatureAbilityScore(exactSource, "strength", 15, 256)).toBe(15);
    expect(reduceExistingCreatureAbilityScore(exactSource, "intelligence", 10, 18)).toBe(10);
    expect(reduceExistingCreatureAbilityScore({ type: "seed" }, "strength", 10, 15))
      .toBe(15);
  });

  it("materializes only present exact members and preserves invalid or absent ones", () => {
    const current = {
      strength: 15,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 11,
      charisma: 8,
    };
    expect(materializeExistingCreatureAbilityScores(exactSource, current, {
      strength: 17,
      dexterity: 999,
      constitution: 16,
      intelligence: 18,
      wisdom: 13,
      charisma: 10,
    })).toEqual({
      strength: 17,
      dexterity: 12,
      constitution: 16,
      intelligence: 10,
      wisdom: 13,
      charisma: 10,
    });
    expect(materializeExistingCreatureAbilityScores({ type: "seed" }, current, {
      ...current,
      strength: 18,
    }).strength).toBe(18);
  });
});
