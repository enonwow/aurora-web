import {
  bindEffectiveCreatureRacialTypesTwoDaToHitPointState,
  calculateAuroraCreatureHitPoints,
  calculateAuroraAbilityModifier,
  deriveExistingAreaCreatureHitPointTarget,
  readAreaCreatureHitPointState,
  readExistingAreaCreatureHitPointMutation,
} from "../../src/modules/areas/domain/area-creature-hit-points";
import { parseEffectiveCreatureRacialTypesTwoDa } from
  "../../src/modules/catalog/domain/effective-creature-racial-types-two-da";

const short = (value: number) => ({ nativeType: "short", value });
const byte = (value: number) => ({ nativeType: "byte", value });

describe("Existing Area Creature coupled hit-point contract", () => {
  const table = parseEffectiveCreatureRacialTypesTwoDa({
    bytes: Buffer.from([
      "2DA V2.0",
      "",
      "Name ConAdjust",
      "0 100 0",
      "1 101 2",
    ].join("\n"), "ascii"),
    sourceObjectKey: "module/racialtypes.2da",
    sourceLayer: "module",
  })!;
  const source = {
    present: true as const,
    hitPoints: short(10),
    currentHitPoints: short(7),
    maxHitPoints: short(99),
    constitution: byte(14),
    race: byte(1),
    classLevels: [3, 2],
    featRow40Present: false,
  };

  it.each([
    [0, -5],
    [1, -5],
    [2, -4],
    [9, -1],
    [10, 0],
    [16, 3],
    [-1, -5],
    [-2, -6],
    [-3, -6],
  ])("matches Aurora signed ability modifier for %p", (score, expected) => {
    expect(calculateAuroraAbilityModifier(score)).toBe(expected);
  });

  it("calculates the native maximum, feat-40 bonus, and dynamic Base HP minimum", () => {
    expect(calculateAuroraCreatureHitPoints({
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

  it("binds only the effective physical Race row and freezes exact provenance", () => {
    const parsed = readAreaCreatureHitPointState(source)!;
    const bound = bindEffectiveCreatureRacialTypesTwoDaToHitPointState(parsed, table);
    expect(bound).toEqual({
      ...source,
      racialTypes: {
        ...table.descriptor,
        rowIndex: 1,
        constitutionAdjust: 2,
      },
    });
    expect(readAreaCreatureHitPointState(bound)).toEqual(bound);
    expect(Object.isFrozen(bound)).toBe(true);
    expect(bindEffectiveCreatureRacialTypesTwoDaToHitPointState(
      { ...parsed, race: byte(3) },
      table,
    )).not.toHaveProperty("racialTypes");
  });

  it("derives all three Shorts and ignores serialized Current/Max as inputs", () => {
    const bound = bindEffectiveCreatureRacialTypesTwoDaToHitPointState(
      readAreaCreatureHitPointState(source)!,
      table,
    );
    expect(deriveExistingAreaCreatureHitPointTarget(bound, {
      baseHitPoints: 12,
      constitution: 12,
    })).toEqual({
      hitPoints: 12,
      currentHitPoints: 15,
      maxHitPoints: 22,
      constitution: 12,
    });
  });

  it("derives the coupled HP triplet from changed class levels", () => {
    const bound = bindEffectiveCreatureRacialTypesTwoDaToHitPointState(
      readAreaCreatureHitPointState(source)!,
      table,
    );
    expect(deriveExistingAreaCreatureHitPointTarget(bound, {
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

  it("allows a Constitution change inside one modifier bucket even if the triplet is unchanged", () => {
    const bound = bindEffectiveCreatureRacialTypesTwoDaToHitPointState(
      readAreaCreatureHitPointState(source)!,
      table,
    );
    expect(deriveExistingAreaCreatureHitPointTarget(bound, {
      baseHitPoints: 10,
      constitution: 15,
    })).toEqual({
      hitPoints: 10,
      currentHitPoints: 10,
      maxHitPoints: 25,
      constitution: 15,
    });
  });

  it("fails closed for a Base HP below the Toolset dynamic minimum", () => {
    const weak = bindEffectiveCreatureRacialTypesTwoDaToHitPointState(
      readAreaCreatureHitPointState({
        ...source,
        constitution: byte(4),
      })!,
      table,
    );
    expect(deriveExistingAreaCreatureHitPointTarget(weak, {
      baseHitPoints: 14,
      constitution: 4,
    })).toBeNull();
  });

  it("accepts only a self-consistent changed coupled mutation", () => {
    const mutation = {
      expectedHitPoints: 10,
      expectedCurrentHitPoints: 7,
      expectedMaxHitPoints: 99,
      hitPoints: 12,
      currentHitPoints: 15,
      maxHitPoints: 22,
      expectedConstitution: 14,
      constitution: 12,
      race: 1,
      classLevels: [3, 2],
      featRow40Present: false,
      racialConstitutionAdjust: 2,
      racialTypesSha256: table.descriptor.sha256,
      racialTypesRowCount: table.descriptor.rowCount,
    };
    expect(readExistingAreaCreatureHitPointMutation(mutation)).toEqual(mutation);
    expect(readExistingAreaCreatureHitPointMutation({
      ...mutation,
      currentHitPoints: 16,
    })).toBeNull();
    expect(readExistingAreaCreatureHitPointMutation({
      ...mutation,
      hitPoints: 10,
      constitution: 14,
    })).toBeNull();
    expect(readExistingAreaCreatureHitPointMutation({ ...mutation, extra: true }))
      .toBeNull();
  });

  it("accepts additive targetClassLevels only for a consistent level transition", () => {
    const mutation = {
      expectedHitPoints: 10,
      expectedCurrentHitPoints: 7,
      expectedMaxHitPoints: 99,
      hitPoints: 10,
      currentHitPoints: 4,
      maxHitPoints: 31,
      expectedConstitution: 14,
      constitution: 14,
      race: 1,
      classLevels: [3, 2],
      targetClassLevels: [4, 3],
      featRow40Present: false,
      racialConstitutionAdjust: 2,
      racialTypesSha256: table.descriptor.sha256,
      racialTypesRowCount: table.descriptor.rowCount,
    };
    expect(readExistingAreaCreatureHitPointMutation(mutation)).toEqual(mutation);
    expect(readExistingAreaCreatureHitPointMutation({
      ...mutation,
      targetClassLevels: [3, 2],
    })).toBeNull();
    expect(readExistingAreaCreatureHitPointMutation({
      ...mutation,
      currentHitPoints: 5,
    })).toBeNull();
  });

  it.each([
    { present: true, ...source, hitPoints: { nativeType: "word", value: 10 } },
    { ...source, classLevels: [181] },
    { ...source, featRow40Present: 1 },
    { ...source, race: byte(256) },
    { present: false, hitPoints: short(1) },
  ])("rejects malformed or non-authorable exact state %#", (value) => {
    expect(readAreaCreatureHitPointState(value)).toBeNull();
  });
});
