import { describe, expect, it } from "vitest";
import {
  applyCreatureClassSpellReorders,
  materializeExistingCreatureClassSpellReorder,
  readExistingCreatureClassSpellReorderProvenance,
} from "../../../../../src/modules/layout/application/creatureClassSpellReorderProvenance";
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
        classId: 1,
        level: 3,
        opaqueSiblingFieldCount: 1,
        canonicalSpellListFieldCount: 1,
        spellEntryCount: 3,
        spellLists: [{
          listKind: "known",
          spellLevel: 0,
          entries: [
            { spellId: 11, spellMetaMagic: 0, spellFlags: 1, opaqueSiblingFieldCount: 0 },
            { spellId: 12, spellMetaMagic: 2, spellFlags: 1, opaqueSiblingFieldCount: 1 },
            { spellId: 13, spellMetaMagic: 0, spellFlags: 3, opaqueSiblingFieldCount: 0 },
          ],
        }],
      },
      {
        classId: 7,
        level: 2,
        opaqueSiblingFieldCount: 0,
        canonicalSpellListFieldCount: 1,
        spellEntryCount: 1,
        spellLists: [{
          listKind: "memorized",
          spellLevel: 3,
          entries: [
            { spellId: 22, spellMetaMagic: 1, spellFlags: 0, opaqueSiblingFieldCount: 0 },
          ],
        }],
      },
    ],
  },
} satisfies SceneObjectSourceMetadata;

const currentClasses = [
  { classId: 1, className: "Bard", level: 3 },
  { classId: 7, className: "Wizard", level: 2 },
];

const reorder = {
  classSlotIndex: 0,
  listKind: "known" as const,
  spellLevel: 0,
  entryOrder: [2, 0, 1],
};

describe("existing Creature class spell-entry reorder provenance", () => {
  it("reads only exact source lists that contain at least two entries", () => {
    expect(readExistingCreatureClassSpellReorderProvenance(source)).toEqual({
      classListGraphSha256: "c".repeat(64),
      sourceClassIds: [1, 7],
      sourceLevels: [3, 2],
      lists: [{
        classSlotIndex: 0,
        listKind: "known",
        spellLevel: 0,
        entries: source.creatureClassIdentityState.entries[0]!.spellLists[0]!.entries,
      }],
    });
  });

  it("materializes a confirmed canonical non-identity full permutation", () => {
    expect(materializeExistingCreatureClassSpellReorder(
      source,
      currentClasses,
      [reorder],
      true,
    )).toEqual({
      expectedClassIds: [1, 7],
      expectedLevels: [3, 2],
      classListGraphSha256: "c".repeat(64),
      reorders: [reorder],
      spellReorderConfirmed: true,
    });
  });

  it("reorders only matching display entries in the selected native list", () => {
    const spells = [
      { spellId: 11, classIndex: 0, prepared: false, name: "One", spellLevel: 0,
        castingLevel: 3, metaMagic: 0, flags: 1 },
      { spellId: 12, classIndex: 0, prepared: false, name: "Two", spellLevel: 0,
        castingLevel: 3, metaMagic: 2, flags: 1 },
      { spellId: 13, classIndex: 0, prepared: false, name: "Three", spellLevel: 0,
        castingLevel: 3, metaMagic: 0, flags: 3 },
      { spellId: 22, classIndex: 1, prepared: true, name: "Other", spellLevel: 3,
        castingLevel: 2, metaMagic: 1, flags: 1 },
    ];
    expect(applyCreatureClassSpellReorders(
      spells,
      readExistingCreatureClassSpellReorderProvenance(source)!,
      [reorder],
    )).toEqual([spells[2], spells[0], spells[1], spells[3]]);
  });

  it.each([
    { reorders: [], confirmed: true },
    { reorders: [{ ...reorder, entryOrder: [0, 1, 2] }], confirmed: true },
    { reorders: [{ ...reorder, entryOrder: [2, 0, 0] }], confirmed: true },
    { reorders: [{ ...reorder, entryOrder: [1, 0] }], confirmed: true },
    { reorders: [reorder], confirmed: false },
  ])("rejects unsupported reorder vectors %#", ({ reorders, confirmed }) => {
    expect(materializeExistingCreatureClassSpellReorder(
      source,
      currentClasses,
      reorders,
      confirmed,
    )).toBeNull();
  });

  it("rejects legacy count-only provenance and a changed class roster", () => {
    const legacy = {
      ...source,
      creatureClassIdentityState: {
        ...source.creatureClassIdentityState,
        entries: source.creatureClassIdentityState.entries.map(({ spellLists: _ignored, ...entry }) =>
          entry),
      },
    } satisfies SceneObjectSourceMetadata;
    expect(readExistingCreatureClassSpellReorderProvenance(legacy)).toBeNull();
    expect(materializeExistingCreatureClassSpellReorder(
      source,
      [{ ...currentClasses[0]!, level: 4 }, currentClasses[1]!],
      [reorder],
      true,
    )).toBeNull();
  });
});
