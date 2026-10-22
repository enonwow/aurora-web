import { describe, expect, it } from "vitest";
import {
  materializeExistingCreatureClassSpellClear,
  readExistingCreatureClassSpellClearProvenance,
} from "../../../../../src/modules/layout/application/creatureClassSpellClearProvenance";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";

const source = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  sourceObjectId: "creature:0:nw_guard:source",
  creatureClassIdentityState: {
    present: true,
    nativeType: "list",
    structTypeId: 2,
    classNativeType: "int",
    levelNativeType: "short",
    classListGraphSha256: "c".repeat(64),
    entries: [
      {
        classId: 4,
        level: 3,
        opaqueSiblingFieldCount: 1,
        canonicalSpellListFieldCount: 2,
        spellEntryCount: 3,
      },
      {
        classId: 7,
        level: 2,
        opaqueSiblingFieldCount: 0,
        canonicalSpellListFieldCount: 0,
        spellEntryCount: 0,
      },
    ],
  },
} satisfies SceneObjectSourceMetadata;

const currentClasses = [
  { classId: 4, className: "Fighter", level: 3 },
  { classId: 7, className: "Rogue", level: 2 },
];

describe("existing Creature class spell-list clear provenance", () => {
  it("reads the exact source graph and per-slot canonical spell-list counts", () => {
    expect(readExistingCreatureClassSpellClearProvenance(source)).toEqual({
      classListGraphSha256: "c".repeat(64),
      sourceClassIds: [4, 7],
      sourceLevels: [3, 2],
      canonicalSpellListFieldCounts: [2, 0],
    });
  });

  it("materializes a confirmed clear for unchanged spell-owning class slots", () => {
    const result = materializeExistingCreatureClassSpellClear(
      source,
      currentClasses,
      [0],
      true,
    );

    expect(result).toEqual({
      classListGraphSha256: "c".repeat(64),
      expectedClassIds: [4, 7],
      expectedLevels: [3, 2],
      classSlotIndices: [0],
      destructiveSpellClearConfirmed: true,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.classSlotIndices)).toBe(true);
  });

  it.each([
    { slots: [], confirmed: true },
    { slots: [1], confirmed: true },
    { slots: [0, 0], confirmed: true },
    { slots: [1, 0], confirmed: true },
    { slots: [2], confirmed: true },
    { slots: [0], confirmed: false },
  ])("rejects an unsupported clear request %#", ({ slots, confirmed }) => {
    expect(materializeExistingCreatureClassSpellClear(
      source,
      currentClasses,
      slots,
      confirmed,
    )).toBeNull();
  });

  it("rejects a clear when the retained class roster or level vector changed", () => {
    expect(materializeExistingCreatureClassSpellClear(
      source,
      [{ ...currentClasses[0]!, level: 4 }, currentClasses[1]!],
      [0],
      true,
    )).toBeNull();
    expect(materializeExistingCreatureClassSpellClear(
      source,
      [{ ...currentClasses[0]!, classId: 5 }, currentClasses[1]!],
      [0],
      true,
    )).toBeNull();
  });

  it("rejects unbound, absent, or non-Creature source metadata", () => {
    expect(readExistingCreatureClassSpellClearProvenance(undefined)).toBeNull();
    expect(readExistingCreatureClassSpellClearProvenance({
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creatureClassIdentityState: { present: false },
    })).toBeNull();
    expect(readExistingCreatureClassSpellClearProvenance({
      type: "aurora_git",
      sourceKind: "placeable",
      sourceIndex: 0,
      creatureClassIdentityState: source.creatureClassIdentityState,
    })).toBeNull();
  });
});
