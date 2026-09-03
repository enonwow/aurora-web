import { describe, expect, it } from "vitest";
import { readCreatureClassIdentityState } from
  "../../../../../src/modules/scene/domain/creatureClassIdentity";

const exact = {
  present: true as const,
  nativeType: "list" as const,
  structTypeId: 2 as const,
  classNativeType: "int" as const,
  levelNativeType: "short" as const,
  classListGraphSha256: "c".repeat(64),
  entries: [{
    classId: 4,
    level: 3,
    opaqueSiblingFieldCount: 2,
    canonicalSpellListFieldCount: 4,
    spellEntryCount: 7,
  }],
  classesTable: {
    resourceName: "classes.2da" as const,
    sourceObjectKey: "runtime-source/vanilla/nwn_base.key/classes.2da",
    sourceLayer: "vanilla" as const,
    sha256: "a".repeat(64),
    sizeBytes: 12_000,
    rowCount: 64,
  },
};

describe("Creature class-identity state", () => {
  it("accepts one exact graph and immutable classes.2da binding", () => {
    expect(readCreatureClassIdentityState(exact)).toEqual(exact);
  });

  it.each([
    { ...exact, classListGraphSha256: "bad" },
    { ...exact, entries: [{ ...exact.entries[0], classId: 64 }] },
    { ...exact, entries: [{ ...exact.entries[0], canonicalSpellListFieldCount: 29 }] },
  ])("rejects malformed or out-of-table state %#", (candidate) => {
    expect(readCreatureClassIdentityState(candidate)).toBeNull();
  });
});
