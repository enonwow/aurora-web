import {
  AREA_CREATURE_ADVANCED_FLAG_FIELDS,
  readAreaCreatureAdvancedFlagsStorage,
  readExistingAreaCreatureAdvancedFlagMutations,
} from "../../src/modules/areas/domain/area-creature-advanced-flags";

const present = (value: 0 | 1) => ({ present: true as const, value });

describe("existing Area Creature advanced flags", () => {
  it("freezes the exact web/native field mapping", () => {
    expect(AREA_CREATURE_ADVANCED_FLAG_FIELDS).toEqual([
      { key: "disarmable", nativeLabel: "Disarmable" },
      { key: "plot", nativeLabel: "Plot" },
      { key: "immortal", nativeLabel: "IsImmortal" },
      { key: "lootable", nativeLabel: "Lootable" },
      { key: "noPermanentDeath", nativeLabel: "NoPermDeath" },
    ]);
    expect(Object.isFrozen(AREA_CREATURE_ADVANCED_FLAG_FIELDS)).toBe(true);
  });

  it("retains five independently presence-sensitive native Byte fields", () => {
    const storage = readAreaCreatureAdvancedFlagsStorage({
      disarmable: present(1),
      plot: { present: false },
      immortal: present(0),
      lootable: present(1),
      noPermanentDeath: present(0),
    });

    expect(storage).toEqual({
      disarmable: { present: true, value: 1 },
      plot: { present: false },
      immortal: { present: true, value: 0 },
      lootable: { present: true, value: 1 },
      noPermanentDeath: { present: true, value: 0 },
    });
    expect(Object.isFrozen(storage)).toBe(true);
    expect(Object.values(storage ?? {}).every(Object.isFrozen)).toBe(true);
  });

  it.each([
    null,
    [],
    {},
    {
      disarmable: present(1),
      plot: present(0),
      immortal: present(0),
      lootable: present(0),
    },
    {
      disarmable: present(1),
      plot: present(0),
      immortal: present(0),
      lootable: present(0),
      noPermanentDeath: present(0),
      extra: present(0),
    },
    {
      disarmable: { present: true, value: 2 },
      plot: present(0),
      immortal: present(0),
      lootable: present(0),
      noPermanentDeath: present(0),
    },
  ])("rejects malformed aggregate storage %#", (input) => {
    expect(readAreaCreatureAdvancedFlagsStorage(input)).toBeNull();
  });

  it("accepts a non-empty independently changed CAS subset", () => {
    const mutation = readExistingAreaCreatureAdvancedFlagMutations({
      disarmable: { expectedValue: 1, value: 0 },
      lootable: { expectedValue: 0, value: 1 },
    });

    expect(mutation).toEqual({
      disarmable: { expectedValue: 1, value: 0 },
      lootable: { expectedValue: 0, value: 1 },
    });
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.values(mutation ?? {}).every(Object.isFrozen)).toBe(true);
  });

  it.each([
    {},
    { unknown: { expectedValue: 0, value: 1 } },
    { plot: null },
    { plot: { expectedValue: 0 } },
    { plot: { expectedValue: 0, value: 1, extra: true } },
    { plot: { expectedValue: false, value: 1 } },
    { plot: { expectedValue: 0, value: 2 } },
    { plot: { expectedValue: 1, value: 1 } },
  ])("rejects malformed or unchanged mutation %#", (input) => {
    expect(readExistingAreaCreatureAdvancedFlagMutations(input)).toBeNull();
  });
});
