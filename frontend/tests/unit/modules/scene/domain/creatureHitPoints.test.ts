import { describe, expect, it } from "vitest";
import {
  calculateCreatureAbilityModifier,
  calculateCreatureHitPoints,
  deriveExistingCreatureHitPointTarget,
  readCreatureHitPointState,
} from "../../../../../src/modules/scene/domain/creatureHitPoints";

describe("Creature coupled hit-point provenance", () => {
  const source = () => ({
    present: true as const,
    hitPoints: { nativeType: "short" as const, value: 10 },
    currentHitPoints: { nativeType: "short" as const, value: 7 },
    maxHitPoints: { nativeType: "short" as const, value: 99 },
    constitution: { nativeType: "byte" as const, value: 14 },
    race: { nativeType: "byte" as const, value: 1 },
    classLevels: [3, 2],
    featRow40Present: false,
    racialTypes: {
      resourceName: "racialtypes.2da" as const,
      sourceObjectKey: "module/racialtypes.2da",
      sourceLayer: "module" as const,
      sha256: "a".repeat(64),
      sizeBytes: 100,
      rowCount: 5,
      rowIndex: 1,
      constitutionAdjust: 2,
    },
  });

  it.each([
    [0, -5], [1, -5], [2, -4], [16, 3], [-1, -5], [-2, -6], [-3, -6],
  ])("matches Aurora signed ability modifier for %p", (score, expected) => {
    expect(calculateCreatureAbilityModifier(score)).toBe(expected);
  });

  it("keeps a negative Constitution bonus and the dynamic Base HP minimum", () => {
    expect(calculateCreatureHitPoints({
      baseHitPoints: 15,
      constitution: 4,
      racialConstitutionAdjust: 2,
      classLevels: [3, 2],
      featRow40Present: true,
    })).toEqual({
      levelCount: 5,
      constitutionModifier: -2,
      constitutionBonus: -5,
      minimumBaseHitPoints: 15,
      ordinaryMaximum: 5,
      maxHitPoints: 10,
    });
  });

  it("reads a detached exact state and derives the native target triplet", () => {
    const parsed = readCreatureHitPointState(source());
    expect(parsed).toEqual(source());
    expect(parsed).not.toBe(source());
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(deriveExistingCreatureHitPointTarget(parsed!, {
      baseHitPoints: 12,
      constitution: 12,
    })).toEqual({
      hitPoints: 12,
      currentHitPoints: 15,
      maxHitPoints: 22,
      constitution: 12,
    });
  });

  it("derives the HP triplet against a changed same-roster level vector", () => {
    expect(deriveExistingCreatureHitPointTarget(source(), {
      baseHitPoints: 10,
      constitution: 14,
      classLevels: [4, 3],
    })).toEqual({
      hitPoints: 10,
      currentHitPoints: 4,
      maxHitPoints: 31,
      constitution: 14,
    });
  });

  it("derives the HP triplet against a changed feat-row-40 state", () => {
    expect(deriveExistingCreatureHitPointTarget(source(), {
      baseHitPoints: 10,
      constitution: 14,
      featRow40Present: true,
    })).toEqual({
      hitPoints: 10,
      currentHitPoints: 5,
      maxHitPoints: 30,
      constitution: 14,
    });
  });

  it("fails closed without table binding or below the Toolset dynamic minimum", () => {
    const { racialTypes: _table, ...unbound } = source();
    expect(deriveExistingCreatureHitPointTarget(unbound, {
      baseHitPoints: 12,
      constitution: 12,
    })).toBeNull();
    const weak = source();
    weak.constitution.value = 4;
    expect(deriveExistingCreatureHitPointTarget(weak, {
      baseHitPoints: 14,
      constitution: 4,
    })).toBeNull();
  });

  it.each([
    { present: false, extra: true },
    { ...source(), hitPoints: { nativeType: "word", value: 10 } },
    { ...source(), classLevels: [181] },
    { ...source(), racialTypes: { ...source().racialTypes, rowIndex: 2 } },
  ])("rejects malformed state %#", (value) => {
    expect(readCreatureHitPointState(value)).toBeNull();
  });
});
