import { parseRawGffDocument } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { SupportedGffField } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  AreaObjectPairMutationError,
  mutateExistingAreaObjectsInGitGic,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import { fingerprintAreaCreatureClassListField } from
  "../../src/modules/areas/adapters/outbound/blob/area-creature-class-list-gff";
import {
  creatureAreaObjectPair,
  gffList,
} from "../support/area-object-pair-writer-fixture";

describe("Aurora GIT Creature class-identity writer", () => {
  it("replaces only an exact no-metamagic class spell Word", () => {
    const classList = classListRemovalFixture();
    const pair = creatureAreaObjectPair([classList]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classSpellReplacement: {
          expectedClassIds: [1, 7],
          expectedLevels: [3, 2],
          classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
          classesTableSha256: "a".repeat(64),
          classesRowCount: 11,
          spellsTableSha256: "b".repeat(64),
          spellsRowCount: 100,
          replacements: [{
            classSlotIndex: 0,
            listKind: "known",
            spellLevel: 0,
            entryIndex: 0,
            expectedSpellId: 11,
            targetSpellId: 13,
          }],
          spellReplacementConfirmed: true,
        },
      }],
    });

    const creature = gffList(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    const target = creature.fields.find((field) => field.label === "ClassList");
    expect(target?.type).toBe("list");
    if (target?.type !== "list" || classList.type !== "list") return;
    const known = target.value[0]!.fields.find((field) => field.label === "KnownList0");
    expect(known?.type).toBe("list");
    if (known?.type !== "list") return;
    expect(known.value[0]).toEqual({
      typeId: 3,
      fields: [
        { label: "Spell", type: "word", value: 13 },
        { label: "SpellMetaMagic", type: "byte", value: 0 },
        { label: "SpellFlags", type: "byte", value: 1 },
      ],
    });
    expect(known.value[1]).toEqual(
      classList.value[0]!.fields.find((field) => field.label === "KnownList0")!.value[1],
    );
    expect(target.value[0]!.fields.find((field) => field.label === "Opaque"))
      .toEqual({ label: "Opaque", type: "cexostring", value: "preserve" });
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("reorders exact existing spell structs within one list and preserves every field", () => {
    const classList = classListRemovalFixture();
    const pair = creatureAreaObjectPair([classList]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classSpellReorder: {
          expectedClassIds: [1, 7],
          expectedLevels: [3, 2],
          classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
          reorders: [{
            classSlotIndex: 0,
            listKind: "known",
            spellLevel: 0,
            entryOrder: [1, 0],
          }],
          spellReorderConfirmed: true,
        },
      }],
    });

    const creature = gffList(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    const target = creature.fields.find((field) => field.label === "ClassList");
    expect(target?.type).toBe("list");
    if (!target || target.type !== "list" || classList.type !== "list") return;
    const sourceKnown = classList.value[0]!.fields.find(
      (field) => field.label === "KnownList0",
    );
    expect(sourceKnown?.type).toBe("list");
    if (!sourceKnown || sourceKnown.type !== "list") return;
    expect(target.value[0]?.fields.find((field) => field.label === "KnownList0"))
      .toEqual({
        label: "KnownList0",
        type: "list",
        value: [sourceKnown.value[1], sourceKnown.value[0]],
      });
    expect(target.value[0]?.fields.find((field) => field.label === "Opaque"))
      .toEqual({ label: "Opaque", type: "cexostring", value: "preserve" });
    expect(target.value[1]).toEqual(classList.value[1]);
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("removes exact existing spell structs and drops only emptied list fields", () => {
    const classList = classListRemovalFixture();
    const pair = creatureAreaObjectPair([classList]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classSpellRemoval: {
          expectedClassIds: [1, 7],
          expectedLevels: [3, 2],
          classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
          targets: [
            { classSlotIndex: 0, listKind: "known", spellLevel: 0, entryIndex: 0 },
            { classSlotIndex: 1, listKind: "memorized", spellLevel: 0, entryIndex: 0 },
          ],
          destructiveSpellRemovalConfirmed: true,
        },
      }],
    });

    const creature = gffList(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    const target = creature.fields.find((field) => field.label === "ClassList");
    expect(target?.type).toBe("list");
    if (!target || target.type !== "list" || classList.type !== "list") return;
    expect(target.value[0]?.fields.find((field) => field.label === "KnownList0")).toEqual({
      label: "KnownList0",
      type: "list",
      value: [classList.value[0]!.fields.find((field) => field.label === "KnownList0")!
        .value[1]],
    });
    expect(target.value[1]?.fields.some((field) => field.label === "MemorizedList0"))
      .toBe(false);
    expect(target.value[0]?.fields.find((field) => field.label === "Opaque"))
      .toEqual({ label: "Opaque", type: "cexostring", value: "preserve" });
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("clears spell lists from selected unchanged class slots and preserves every sibling", () => {
    const classList = classListFixture();
    const pair = creatureAreaObjectPair([classList]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classSpellClear: {
          expectedClassIds: [4, 7],
          expectedLevels: [3, 2],
          classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
          classSlotIndices: [0],
          destructiveSpellClearConfirmed: true,
        },
      }],
    });

    const candidate = gffList(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    const target = candidate.fields.find((field) => field.label === "ClassList");
    expect(target?.type).toBe("list");
    if (!target || target.type !== "list" || classList.type !== "list") return;
    expect(target.value[0]?.fields).toEqual([
      { label: "Class", type: "int", value: 4 },
      { label: "ClassLevel", type: "short", value: 3 },
      { label: "Opaque", type: "cexostring", value: "preserve" },
    ]);
    expect(target.value[1]).toEqual(classList.value[1]);
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("rejects spell-list clear against a stale whole-graph fingerprint", () => {
    const classList = classListFixture();
    const pair = creatureAreaObjectPair([classList]);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classSpellClear: {
          expectedClassIds: [4, 7],
          expectedLevels: [3, 2],
          classListGraphSha256: "f".repeat(64),
          classSlotIndices: [0],
          destructiveSpellClearConfirmed: true,
        },
      }],
    })).toThrow(AreaObjectPairMutationError);
  });

  it("clears changed-slot spells and updates ClassLevel and StartingPackage atomically", () => {
    const classList = classListFixture();
    const pair = creatureAreaObjectPair([
      { label: "StartingPackage", type: "byte", value: 0 },
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 7 },
      { label: "MaxHitPoints", type: "short", value: 99 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
      classList,
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classIdentity: mutation(classList),
        hitPoints: hitPointMutation(),
      }],
    });

    const candidate = gffList(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    expect(candidate.fields.find((field) => field.label === "ClassList")).toEqual({
      label: "ClassList",
      type: "list",
      value: [
        {
          typeId: 2,
          fields: [
            { label: "Class", type: "int", value: 5 },
            { label: "ClassLevel", type: "short", value: 4 },
            { label: "Opaque", type: "cexostring", value: "preserve" },
          ],
        },
        classList.type === "list" ? classList.value[1]! : undefined,
      ],
    });
    expect(candidate.fields.find((field) => field.label === "StartingPackage"))
      .toEqual({ label: "StartingPackage", type: "byte", value: 2 });
    expect(candidate.fields.find((field) => field.label === "MaxHitPoints"))
      .toEqual({ label: "MaxHitPoints", type: "short", value: 28 });
    expect(candidate.fields.find((field) => field.label === "Unrelated"))
      .toEqual({ label: "Unrelated", type: "int", value: 77 });
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("rejects a stale complete ClassList fingerprint", () => {
    const classList = classListFixture();
    const pair = creatureAreaObjectPair([
      { label: "StartingPackage", type: "byte", value: 0 },
      classList,
    ]);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classIdentity: {
          ...mutation(classList),
          classListGraphSha256: "f".repeat(64),
        },
      }],
    })).toThrow(AreaObjectPairMutationError);
  });

  it("rejects a destructive class change without explicit confirmation", () => {
    const classList = classListFixture();
    const pair = creatureAreaObjectPair([
      { label: "StartingPackage", type: "byte", value: 0 },
      classList,
    ]);
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classIdentity: {
          ...mutation(classList),
          destructiveSpellClearConfirmed: false,
        },
      }],
    })).toThrow(AreaObjectPairMutationError);
  });

  it("appends one canonical empty-spell class tail and updates package and HP", () => {
    const classList = classListFixture();
    const pair = creatureAreaObjectPair([
      { label: "StartingPackage", type: "byte", value: 0 },
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 7 },
      { label: "MaxHitPoints", type: "short", value: 99 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
      classList,
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classSlotResize: resizeMutation(classList, [4, 7, 5], [3, 2, 1], "append_tail", false),
        hitPoints: { ...hitPointMutation(), targetClassLevels: [3, 2, 1], maxHitPoints: 28 },
      }],
    });
    const candidate = gffList(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    const target = candidate.fields.find((field) => field.label === "ClassList");
    expect(target?.type).toBe("list");
    if (!target || target.type !== "list" || classList.type !== "list") return;
    expect(target.value.slice(0, 2)).toEqual(classList.value);
    expect(target.value[2]).toEqual({
      typeId: 2,
      fields: [
        { label: "Class", type: "int", value: 5 },
        { label: "ClassLevel", type: "short", value: 1 },
      ],
    });
    expect(candidate.fields.find((field) => field.label === "StartingPackage"))
      .toEqual({ label: "StartingPackage", type: "byte", value: 2 });
  });

  it("truncates the confirmed tail and keeps the complete retained prefix", () => {
    const classList = classListFixture();
    const pair = creatureAreaObjectPair([
      { label: "StartingPackage", type: "byte", value: 0 },
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 7 },
      { label: "MaxHitPoints", type: "short", value: 99 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
      classList,
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        classSlotResize: resizeMutation(classList, [4], [3], "truncate_tail", true),
        hitPoints: {
          ...hitPointMutation(),
          targetClassLevels: [3],
          currentHitPoints: 16,
          maxHitPoints: 19,
        },
      }],
    });
    const candidate = gffList(parseRawGffDocument(result.gitBytes), "Creature List")!.value[0]!;
    expect(candidate.fields.find((field) => field.label === "ClassList")).toEqual({
      label: "ClassList",
      type: "list",
      value: classList.type === "list" ? [classList.value[0]] : [],
    });
  });
});

function mutation(classList: SupportedGffField) {
  return {
    expectedClassIds: [4, 7],
    classIds: [5, 7],
    expectedLevels: [3, 2],
    levels: [4, 2],
    classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
    destructiveSpellClearConfirmed: true,
    expectedStartingPackage: 0,
    startingPackage: 2,
    classesTableSha256: "a".repeat(64),
    classesRowCount: 64,
    packagesTableSha256: "b".repeat(64),
    packagesRowCount: 132,
  } as const;
}

function hitPointMutation() {
  return {
    expectedHitPoints: 10,
    expectedCurrentHitPoints: 7,
    expectedMaxHitPoints: 99,
    hitPoints: 10,
    currentHitPoints: 7,
    maxHitPoints: 28,
    expectedConstitution: 14,
    constitution: 14,
    race: 1,
    classLevels: [3, 2],
    targetClassLevels: [4, 2],
    featRow40Present: false,
    racialConstitutionAdjust: 2,
    racialTypesSha256: "d".repeat(64),
    racialTypesRowCount: 5,
  } as const;
}

function resizeMutation(
  classList: SupportedGffField,
  classIds: readonly number[],
  levels: readonly number[],
  resizeMode: "append_tail" | "truncate_tail",
  destructiveRemovedSlotsConfirmed: boolean,
) {
  return {
    expectedClassIds: [4, 7],
    expectedLevels: [3, 2],
    classIds,
    levels,
    classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
    resizeMode,
    destructiveRemovedSlotsConfirmed,
    expectedStartingPackage: 0,
    startingPackage: 2,
    classesTableSha256: "a".repeat(64),
    classesRowCount: 64,
    packagesTableSha256: "b".repeat(64),
    packagesRowCount: 132,
  } as const;
}

function classListFixture(): SupportedGffField {
  return {
    label: "ClassList",
    type: "list",
    value: [
      {
        typeId: 2,
        fields: [
          { label: "Class", type: "int", value: 4 },
          { label: "ClassLevel", type: "short", value: 3 },
          {
            label: "KnownList0",
            type: "list",
            value: [{
              typeId: 3,
              fields: [
                { label: "Spell", type: "word", value: 11 },
                { label: "SpellMetaMagic", type: "byte", value: 0 },
                { label: "SpellFlags", type: "byte", value: 1 },
              ],
            }],
          },
          { label: "Opaque", type: "cexostring", value: "preserve" },
        ],
      },
      {
        typeId: 2,
        fields: [
          { label: "Class", type: "int", value: 7 },
          { label: "ClassLevel", type: "short", value: 2 },
          {
            label: "MemorizedList0",
            type: "list",
            value: [{
              typeId: 3,
              fields: [
                { label: "Spell", type: "word", value: 22 },
                { label: "SpellMetaMagic", type: "byte", value: 1 },
                { label: "SpellFlags", type: "byte", value: 0 },
              ],
            }],
          },
        ],
      },
    ],
  };
}

function classListRemovalFixture(): SupportedGffField {
  return {
    label: "ClassList",
    type: "list",
    value: [
      {
        typeId: 2,
        fields: [
          { label: "Class", type: "int", value: 1 },
          { label: "ClassLevel", type: "short", value: 3 },
          {
            label: "KnownList0",
            type: "list",
            value: [
              { typeId: 3, fields: [
                { label: "Spell", type: "word", value: 11 },
                { label: "SpellMetaMagic", type: "byte", value: 0 },
                { label: "SpellFlags", type: "byte", value: 1 },
              ] },
              { typeId: 3, fields: [
                { label: "Spell", type: "word", value: 12 },
                { label: "SpellMetaMagic", type: "byte", value: 2 },
                { label: "SpellFlags", type: "byte", value: 1 },
                { label: "OpaqueSpell", type: "cexostring", value: "keep" },
              ] },
            ],
          },
          { label: "Opaque", type: "cexostring", value: "preserve" },
        ],
      },
      {
        typeId: 2,
        fields: [
          { label: "Class", type: "int", value: 7 },
          { label: "ClassLevel", type: "short", value: 2 },
          { label: "MemorizedList0", type: "list", value: [{
            typeId: 3,
            fields: [
              { label: "Spell", type: "word", value: 22 },
              { label: "SpellMetaMagic", type: "byte", value: 1 },
              { label: "SpellFlags", type: "byte", value: 0 },
            ],
          }] },
        ],
      },
    ],
  };
}
