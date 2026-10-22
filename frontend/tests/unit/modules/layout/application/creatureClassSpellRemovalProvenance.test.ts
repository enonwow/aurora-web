import { describe, expect, it } from "vitest";
import {
  filterRemovedCreatureClassSpells,
  materializeExistingCreatureClassSpellRemoval,
  readExistingCreatureClassSpellRemovalProvenance,
} from "../../../../../src/modules/layout/application/creatureClassSpellRemovalProvenance";
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
        spellEntryCount: 2,
        spellLists: [{
          listKind: "known",
          spellLevel: 0,
          entries: [
            { spellId: 11, spellMetaMagic: 0, spellFlags: 1, opaqueSiblingFieldCount: 0 },
            { spellId: 12, spellMetaMagic: 2, spellFlags: 1, opaqueSiblingFieldCount: 1 },
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

describe("existing Creature class spell-entry removal provenance", () => {
  it("reads exact bounded source entries with physical removal paths", () => {
    expect(readExistingCreatureClassSpellRemovalProvenance(source)).toEqual({
      classListGraphSha256: "c".repeat(64),
      sourceClassIds: [1, 7],
      sourceLevels: [3, 2],
      entries: [
        {
          target: { classSlotIndex: 0, listKind: "known", spellLevel: 0, entryIndex: 0 },
          spellId: 11,
          spellMetaMagic: 0,
          spellFlags: 1,
          opaqueSiblingFieldCount: 0,
        },
        {
          target: { classSlotIndex: 0, listKind: "known", spellLevel: 0, entryIndex: 1 },
          spellId: 12,
          spellMetaMagic: 2,
          spellFlags: 1,
          opaqueSiblingFieldCount: 1,
        },
        {
          target: { classSlotIndex: 1, listKind: "memorized", spellLevel: 3, entryIndex: 0 },
          spellId: 22,
          spellMetaMagic: 1,
          spellFlags: 0,
          opaqueSiblingFieldCount: 0,
        },
      ],
    });
  });

  it("materializes a confirmed exact source-subset removal", () => {
    const targets = [
      { classSlotIndex: 0, listKind: "known" as const, spellLevel: 0, entryIndex: 1 },
      { classSlotIndex: 1, listKind: "memorized" as const, spellLevel: 3, entryIndex: 0 },
    ];
    expect(materializeExistingCreatureClassSpellRemoval(
      source,
      currentClasses,
      targets,
      true,
    )).toEqual({
      expectedClassIds: [1, 7],
      expectedLevels: [3, 2],
      classListGraphSha256: "c".repeat(64),
      targets,
      destructiveSpellRemovalConfirmed: true,
    });
  });

  it("filters only the display entry bound to the removed exact source record", () => {
    const provenance = readExistingCreatureClassSpellRemovalProvenance(source)!;
    const spells = [
      { spellId: 11, classIndex: 0, prepared: false, name: "One", spellLevel: 0,
        castingLevel: 3, metaMagic: 0, flags: 1 },
      { spellId: 12, classIndex: 0, prepared: false, name: "Two", spellLevel: 0,
        castingLevel: 3, metaMagic: 2, flags: 1 },
      { spellId: 22, classIndex: 1, prepared: true, name: "Three", spellLevel: 3,
        castingLevel: 2, metaMagic: 1, flags: 1 },
    ];
    expect(filterRemovedCreatureClassSpells(spells, provenance, [{
      classSlotIndex: 0,
      listKind: "known",
      spellLevel: 0,
      entryIndex: 1,
    }])).toEqual([spells[0], spells[2]]);
  });

  it.each([
    { targets: [], confirmed: true },
    { targets: [
      { classSlotIndex: 1, listKind: "memorized" as const, spellLevel: 3, entryIndex: 0 },
      { classSlotIndex: 0, listKind: "known" as const, spellLevel: 0, entryIndex: 0 },
    ], confirmed: true },
    { targets: [
      { classSlotIndex: 0, listKind: "known" as const, spellLevel: 0, entryIndex: 2 },
    ], confirmed: true },
    { targets: [
      { classSlotIndex: 0, listKind: "known" as const, spellLevel: 0, entryIndex: 0 },
    ], confirmed: false },
  ])("rejects unsupported target vectors %#", ({ targets, confirmed }) => {
    expect(materializeExistingCreatureClassSpellRemoval(
      source,
      currentClasses,
      targets,
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
    expect(readExistingCreatureClassSpellRemovalProvenance(legacy)).toBeNull();
    expect(materializeExistingCreatureClassSpellRemoval(
      source,
      [{ ...currentClasses[0]!, level: 4 }, currentClasses[1]!],
      [{ classSlotIndex: 0, listKind: "known", spellLevel: 0, entryIndex: 0 }],
      true,
    )).toBeNull();
  });
});
