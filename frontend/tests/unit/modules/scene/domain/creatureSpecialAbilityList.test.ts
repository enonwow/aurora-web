import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureSpecialAbilityList,
  readCreatureSpecialAbilityListStorage,
} from "../../../../../src/modules/scene/domain/creatureSpecialAbilityList";

const table = {
  resourceName: "spells.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/spells.2da",
  sourceLayer: "vanilla" as const,
  sha256: "e".repeat(64),
  sizeBytes: 456_789,
  rowCount: 131,
};

describe("Creature SpecAbilityList provenance", () => {
  const exact = {
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 4 as const,
    entries: [
      { spellId: 2, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
      { spellId: 2, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
      { spellId: 7, spellFlags: 1, casterLevel: 0, opaqueSiblingFieldCount: 0 },
    ],
    table,
  };

  it("reads one exact ordered physical type-4 list", () => {
    expect(readCreatureSpecialAbilityListStorage(exact)).toEqual(exact);
    const read = readCreatureSpecialAbilityListStorage(exact);
    expect(read?.present && read.entries).not.toBe(exact.entries);
  });

  it.each([
    { ...exact, structTypeId: 3 },
    { ...exact, entries: [{ ...exact.entries[0], spellId: 65_536 }] },
    { ...exact, entries: [{ ...exact.entries[0], spellFlags: 256 }] },
    { ...exact, entries: [{ ...exact.entries[0], casterLevel: 256 }] },
    { ...exact, table: { ...table, resourceName: "feat.2da" } },
    { ...exact, extra: true },
  ])("rejects malformed physical provenance %#", (value) => {
    expect(readCreatureSpecialAbilityListStorage(value)).toBeNull();
  });

  it("authorizes only a bound canonical retained Creature list", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creatureSpecialAbilityList: exact,
    };
    expect(canEditExistingCreatureSpecialAbilityList(source)).toBe(true);
    expect(canEditExistingCreatureSpecialAbilityList({
      ...source,
      creatureSpecialAbilityList: {
        ...exact,
        entries: [exact.entries[0], exact.entries[2], exact.entries[1]],
      },
    })).toBe(false);
    expect(canEditExistingCreatureSpecialAbilityList({
      ...source,
      creatureSpecialAbilityList: {
        ...exact,
        entries: [{ ...exact.entries[0], opaqueSiblingFieldCount: 1 }],
      },
    })).toBe(false);
  });
});
