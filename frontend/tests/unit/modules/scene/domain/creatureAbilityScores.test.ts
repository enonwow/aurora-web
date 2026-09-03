import { describe, expect, it } from "vitest";
import {
  CREATURE_ABILITY_SCORE_FIELDS,
  normalizeCreatureAbilityScore,
  readCreatureAbilityScoresStorage,
} from "../../../../../src/modules/scene/domain/creatureAbilityScores";

describe("Creature base ability-score Byte storage", () => {
  it("retains the six canonical keys and native labels in Aurora order", () => {
    expect(CREATURE_ABILITY_SCORE_FIELDS).toEqual([
      { key: "strength", nativeLabel: "Str" },
      { key: "dexterity", nativeLabel: "Dex" },
      { key: "constitution", nativeLabel: "Con" },
      { key: "intelligence", nativeLabel: "Int" },
      { key: "wisdom", nativeLabel: "Wis" },
      { key: "charisma", nativeLabel: "Cha" },
    ]);
    expect(Object.isFrozen(CREATURE_ABILITY_SCORE_FIELDS)).toBe(true);
  });

  it.each([0, 1, 15, 255])("admits Byte value %i", (value) => {
    expect(normalizeCreatureAbilityScore(value)).toBe(value);
  });

  it.each([-1, 256, 1.5, Number.NaN, "15", null])(
    "rejects out-of-profile value %#",
    (value) => expect(normalizeCreatureAbilityScore(value)).toBeNull(),
  );

  it("reads one exact immutable six-member presence-sensitive group", () => {
    const storage = readCreatureAbilityScoresStorage({
      strength: { present: true, nativeType: "byte", value: 15 },
      dexterity: { present: true, nativeType: "byte", value: 12 },
      constitution: { present: false },
      intelligence: { present: true, nativeType: "byte", value: 10 },
      wisdom: { present: true, nativeType: "byte", value: 11 },
      charisma: { present: true, nativeType: "byte", value: 8 },
    });
    expect(storage).toEqual({
      strength: { present: true, nativeType: "byte", value: 15 },
      dexterity: { present: true, nativeType: "byte", value: 12 },
      constitution: { present: false },
      intelligence: { present: true, nativeType: "byte", value: 10 },
      wisdom: { present: true, nativeType: "byte", value: 11 },
      charisma: { present: true, nativeType: "byte", value: 8 },
    });
    expect(Object.isFrozen(storage)).toBe(true);
    expect(Object.isFrozen(storage?.strength)).toBe(true);
  });

  it.each([
    undefined,
    {},
    {
      strength: { present: true, nativeType: "byte", value: 15 },
      dexterity: { present: true, nativeType: "byte", value: 12 },
      constitution: { present: true, nativeType: "byte", value: 14 },
      intelligence: { present: true, nativeType: "byte", value: 10 },
      wisdom: { present: true, nativeType: "byte", value: 11 },
    },
    {
      strength: { present: true, nativeType: "word", value: 15 },
      dexterity: { present: true, nativeType: "byte", value: 12 },
      constitution: { present: true, nativeType: "byte", value: 14 },
      intelligence: { present: true, nativeType: "byte", value: 10 },
      wisdom: { present: true, nativeType: "byte", value: 11 },
      charisma: { present: true, nativeType: "byte", value: 8 },
    },
  ])("rejects malformed group %#", (value) => {
    expect(readCreatureAbilityScoresStorage(value)).toBeNull();
  });
});
