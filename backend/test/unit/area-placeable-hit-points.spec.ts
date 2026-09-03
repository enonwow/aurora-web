import {
  deriveAreaPlaceableCurrentHitPoints,
  isAuroraShort,
  isEditableAreaPlaceableHitPoints,
  readExistingAreaPlaceableHitPointMutation,
} from "../../src/modules/areas/domain/area-placeable-hit-points";

describe("Existing Area Placeable HP / CurrentHP mutation", () => {
  const valid = {
    expectedHitPoints: 15,
    hitPoints: 30,
    expectedCurrentHitPoints: 45,
    currentHitPoints: 90,
  };

  it.each([
    [15, 45, 30, 90],
    [15, 14, 30, 14],
    [15, 0, 30, 0],
    [15, -14, 30, -14],
    [15, 1, 30, 1],
    [15, 29, 30, 30],
    [1, 16_384, 2, 1],
    [1, 32_767, 10_000, 1],
    [10_000, 32_767, 1, 3],
  ])(
    "derives Aurora CurrentHP for HP %i, CurrentHP %i -> HP %i as %i",
    (expectedHitPoints, expectedCurrentHitPoints, hitPoints, expected) => {
      expect(deriveAreaPlaceableCurrentHitPoints({
        expectedHitPoints,
        expectedCurrentHitPoints,
        hitPoints,
      })).toBe(expected);
    },
  );

  it("accepts and freezes one exact changed pair whose CurrentHP matches Aurora", () => {
    const mutation = readExistingAreaPlaceableHitPointMutation(valid);

    expect(mutation).toEqual(valid);
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it("admits exactly the Toolset HP range and signed Aurora Short range", () => {
    expect(isEditableAreaPlaceableHitPoints(1)).toBe(true);
    expect(isEditableAreaPlaceableHitPoints(10_000)).toBe(true);
    expect(isEditableAreaPlaceableHitPoints(0)).toBe(false);
    expect(isEditableAreaPlaceableHitPoints(10_001)).toBe(false);
    expect(isAuroraShort(-32_768)).toBe(true);
    expect(isAuroraShort(32_767)).toBe(true);
    expect(isAuroraShort(-32_769)).toBe(false);
    expect(isAuroraShort(32_768)).toBe(false);
  });

  it("rejects callable records and same-cardinality records with inherited admitted values", () => {
    const callable = Object.assign(() => undefined, valid);
    expect(readExistingAreaPlaceableHitPointMutation(callable)).toBeNull();

    const inherited = Object.assign(Object.create(valid), {
      expectedHitPoints: 15,
      extraA: true,
      extraB: true,
      extraC: true,
    });
    expect(readExistingAreaPlaceableHitPointMutation(inherited)).toBeNull();
  });

  it.each([
    ["null", null],
    ["array", []],
    ["primitive", 15],
    ["unknown key", { ...valid, extra: true }],
    ["missing expected HP", {
      hitPoints: 30,
      expectedCurrentHitPoints: 45,
      currentHitPoints: 90,
    }],
    ["missing target HP", {
      expectedHitPoints: 15,
      expectedCurrentHitPoints: 45,
      currentHitPoints: 90,
    }],
    ["missing expected CurrentHP", {
      expectedHitPoints: 15,
      hitPoints: 30,
      currentHitPoints: 90,
    }],
    ["missing target CurrentHP", {
      expectedHitPoints: 15,
      hitPoints: 30,
      expectedCurrentHitPoints: 45,
    }],
    ["zero source HP", { ...valid, expectedHitPoints: 0 }],
    ["zero target HP", { ...valid, hitPoints: 0 }],
    ["source HP above Toolset maximum", { ...valid, expectedHitPoints: 10_001 }],
    ["target HP above Toolset maximum", { ...valid, hitPoints: 10_001 }],
    ["fractional target HP", { ...valid, hitPoints: 30.5 }],
    ["source CurrentHP below Short", { ...valid, expectedCurrentHitPoints: -32_769 }],
    ["source CurrentHP above Short", { ...valid, expectedCurrentHitPoints: 32_768 }],
    ["target CurrentHP below Short", { ...valid, currentHitPoints: -32_769 }],
    ["target CurrentHP above Short", { ...valid, currentHitPoints: 32_768 }],
    ["fractional target CurrentHP", { ...valid, currentHitPoints: 90.5 }],
    ["unchanged HP", { ...valid, hitPoints: 15, currentHitPoints: 45 }],
    ["incorrect derived CurrentHP", { ...valid, currentHitPoints: 89 }],
    ["inherited exact values", Object.assign(Object.create(valid), {})],
  ])("rejects %s", (_label, candidate) => {
    expect(readExistingAreaPlaceableHitPointMutation(candidate)).toBeNull();
  });

  it.each([
    { expectedHitPoints: 0, expectedCurrentHitPoints: 1, hitPoints: 1 },
    { expectedHitPoints: 1, expectedCurrentHitPoints: 1, hitPoints: 0 },
    { expectedHitPoints: 1, expectedCurrentHitPoints: 32_768, hitPoints: 1 },
  ])("rejects invalid derivation input", (candidate) => {
    expect(deriveAreaPlaceableCurrentHitPoints(candidate)).toBeNull();
  });
});
