import { planExistingAreaObjectDeletions } from
  "../../src/modules/areas/adapters/outbound/blob/area-existing-object-deletion-planner";
import type { ProjectedAreaObjectEditing } from
  "../../src/modules/areas/domain/area-update-draft-projector";
import type { SupportedGffField } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { creatureAreaObjectPair } from
  "../support/area-object-pair-writer-fixture";
import { fingerprintAreaCreatureClassListField } from
  "../../src/modules/areas/adapters/outbound/blob/area-creature-class-list-gff";

describe("existing Area object planner Creature catalog properties", () => {
  it.each([
    [
      "SoundSetFile",
      [{ label: "SoundSetFile", type: "word", value: 0 }],
      {
        soundSetFile: {
          expectedValue: 0,
          value: 27,
          tableSha256: "a".repeat(64),
          rowCount: 5_100,
        },
      },
    ],
    [
      "StartingPackage",
      [
        { label: "StartingPackage", type: "byte", value: 0 },
        {
          label: "ClassList",
          type: "list",
          value: [{
            typeId: 2,
            fields: [
              { label: "Class", type: "int", value: 4 },
              { label: "ClassLevel", type: "short", value: 3 },
            ],
          }],
        },
      ],
      {
        startingPackage: {
          expectedValue: 0,
          value: 2,
          expectedClassIds: [4],
          tableSha256: "c".repeat(64),
          rowCount: 132,
        },
      },
    ],
    [
      "SkillList",
      [{
        label: "SkillList",
        type: "list",
        value: [
          {
            typeId: 0,
            fields: [
              { label: "Rank", type: "byte", value: 4 },
              { label: "Opaque", type: "cexostring", value: "preserve" },
            ],
          },
          { typeId: 0, fields: [{ label: "Rank", type: "byte", value: 0 }] },
        ],
      }],
      {
        skillList: {
          expectedRanks: [4, 0],
          ranks: [7, 0, 2],
          tableSha256: "c".repeat(64),
          rowCount: 3,
          resizeMode: "expand_zero_tail",
          confirmTruncation: false,
        },
      },
    ],
    [
      "SpecAbilityList",
      [{
        label: "SpecAbilityList",
        type: "list",
        value: [
          { typeId: 4, fields: [
            { label: "Spell", type: "word", value: 2 },
            { label: "SpellFlags", type: "byte", value: 1 },
            { label: "SpellCasterLevel", type: "byte", value: 3 },
          ] },
          { typeId: 4, fields: [
            { label: "Spell", type: "word", value: 2 },
            { label: "SpellFlags", type: "byte", value: 1 },
            { label: "SpellCasterLevel", type: "byte", value: 3 },
          ] },
        ],
      }],
      {
        specialAbilityList: {
          expectedEntries: [{ spellId: 2, uses: 2, casterLevel: 3 }],
          entries: [{ spellId: 2, uses: 3, casterLevel: 5 }],
          tableSha256: "e".repeat(64),
          rowCount: 100,
        },
      },
    ],
    [
      "ClassLevel and HP",
      [
        {
          label: "ClassList",
          type: "list",
          value: [
            {
              typeId: 2,
              fields: [
                { label: "Class", type: "int", value: 4 },
                { label: "ClassLevel", type: "short", value: 3 },
                { label: "KnownList0", type: "list", value: [] },
                { label: "Opaque", type: "cexostring", value: "preserve" },
              ],
            },
            {
              typeId: 2,
              fields: [
                { label: "Class", type: "int", value: 7 },
                { label: "ClassLevel", type: "short", value: 2 },
                { label: "MemorizedList0", type: "list", value: [] },
              ],
            },
          ],
        },
        { label: "HitPoints", type: "short", value: 10 },
        { label: "CurrentHitPoints", type: "short", value: 7 },
        { label: "MaxHitPoints", type: "short", value: 99 },
        { label: "Con", type: "byte", value: 14 },
        { label: "Race", type: "byte", value: 1 },
      ],
      {
        classLevels: {
          expectedClassIds: [4, 7],
          expectedLevels: [3, 2],
          levels: [4, 3],
          opaqueSiblingFieldCounts: [2, 1],
        },
        hitPoints: {
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
          racialTypesSha256: "a".repeat(64),
          racialTypesRowCount: 5,
        },
      },
    ],
  ] as const)("plans one exact %s mutation by immutable Creature ordinal", (
    _label,
    propertyFields,
    propertyMutation,
  ) => {
    const pair = creatureAreaObjectPair([
      ...placementFields(),
      ...(propertyFields as readonly SupportedGffField[]),
    ]);
    const projected = {
      kind: "creature" as const,
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      ...propertyMutation,
    };

    expect(planExistingAreaObjectDeletions(
      pair.git,
      pair.gic,
      editing(projected as never),
    ).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      ...propertyMutation,
    }]);
  });

  it("plans one exact ordered Creature VarTable mutation by immutable ordinal", () => {
    const expectedEntries = [
      { sourceIndex: 0, name: "Counter", type: "int" as const, value: 1 },
      { sourceIndex: 1, name: "Label", type: "string" as const, value: "old" },
    ];
    const pair = creatureAreaObjectPair([
      ...placementFields(),
      { label: "VarTable", type: "list", value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Counter" },
          { label: "Type", type: "dword", value: 1 },
          { label: "Value", type: "int", value: 1 },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "Label" },
          { label: "Type", type: "dword", value: 3 },
          { label: "Value", type: "cexostring", value: "old" },
        ] },
      ] },
    ]);
    const mutation = {
      kind: "creature" as const,
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      variables: {
        expectedEntries,
        entries: [
          { name: "Scale", type: "float" as const, value: 2.5 },
          { name: "Counter", type: "int" as const, value: 2 },
        ],
      },
    };

    expect(planExistingAreaObjectDeletions(
      pair.git,
      pair.gic,
      editing(mutation),
    ).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      variables: mutation.variables,
    }]);
  });

  it("plans a catalog-admitted class identity and level change from raw GIT provenance", () => {
    const classList: SupportedGffField = {
      label: "ClassList",
      type: "list",
      value: [
        {
          typeId: 2,
          fields: [
            { label: "Class", type: "int", value: 4 },
            { label: "ClassLevel", type: "short", value: 3 },
            { label: "KnownList0", type: "list", value: [] },
          ],
        },
        {
          typeId: 2,
          fields: [
            { label: "Class", type: "int", value: 7 },
            { label: "ClassLevel", type: "short", value: 2 },
            { label: "MemorizedList0", type: "list", value: [] },
          ],
        },
      ],
    };
    const pair = creatureAreaObjectPair([
      ...placementFields(),
      { label: "StartingPackage", type: "byte", value: 0 },
      classList,
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 7 },
      { label: "MaxHitPoints", type: "short", value: 99 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
    ]);
    const propertyMutation = {
      kind: "creature" as const,
      sourceObjectId: "obj_cre_display_identity",
      sourceIndex: 0,
      classIdentity: {
        expectedClassIds: [4, 7],
        classIds: [5, 7],
        expectedLevels: [3, 2],
        levels: [4, 2],
        classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
        destructiveSpellClearConfirmed: true as const,
        expectedStartingPackage: 0,
        startingPackage: 2,
        classesTableSha256: "a".repeat(64),
        classesRowCount: 64,
        packagesTableSha256: "b".repeat(64),
        packagesRowCount: 132,
      },
      hitPoints: {
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
        racialTypesSha256: "c".repeat(64),
        racialTypesRowCount: 5,
      },
    };

    expect(planExistingAreaObjectDeletions(
      pair.git,
      pair.gic,
      editing(propertyMutation),
    ).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      classIdentity: propertyMutation.classIdentity,
      hitPoints: propertyMutation.hitPoints,
    }]);
  });

  it("plans an exact tail append from raw ClassList and package provenance", () => {
    const classList: SupportedGffField = {
      label: "ClassList",
      type: "list",
      value: [{
        typeId: 2,
        fields: [
          { label: "Class", type: "int", value: 4 },
          { label: "ClassLevel", type: "short", value: 3 },
          { label: "KnownList0", type: "list", value: [] },
        ],
      }],
    };
    const pair = creatureAreaObjectPair([
      ...placementFields(),
      { label: "StartingPackage", type: "byte", value: 0 },
      classList,
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 7 },
      { label: "MaxHitPoints", type: "short", value: 99 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
    ]);
    const classSlotResize = {
      expectedClassIds: [4],
      expectedLevels: [3],
      classIds: [4, 5],
      levels: [3, 1],
      classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
      resizeMode: "append_tail" as const,
      destructiveRemovedSlotsConfirmed: false,
      expectedStartingPackage: 0,
      startingPackage: 2,
      classesTableSha256: "a".repeat(64),
      classesRowCount: 64,
      packagesTableSha256: "b".repeat(64),
      packagesRowCount: 132,
    };
    const hitPoints = {
      expectedHitPoints: 10,
      expectedCurrentHitPoints: 7,
      expectedMaxHitPoints: 99,
      hitPoints: 10,
      currentHitPoints: 7,
      maxHitPoints: 22,
      expectedConstitution: 14,
      constitution: 14,
      race: 1,
      classLevels: [3],
      targetClassLevels: [3, 1],
      featRow40Present: false,
      racialConstitutionAdjust: 2,
      racialTypesSha256: "c".repeat(64),
      racialTypesRowCount: 5,
    };

    expect(planExistingAreaObjectDeletions(
      pair.git,
      pair.gic,
      editing({
        kind: "creature",
        sourceObjectId: "obj_cre_display_identity",
        sourceIndex: 0,
        classSlotResize,
        hitPoints,
      }),
    ).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      classSlotResize,
      hitPoints,
    }]);
  });

  it("plans an exact confirmed class spell-list clear against the raw graph", () => {
    const classList: SupportedGffField = {
      label: "ClassList",
      type: "list",
      value: [{
        typeId: 2,
        fields: [
          { label: "Class", type: "int", value: 4 },
          { label: "ClassLevel", type: "short", value: 3 },
          { label: "KnownList0", type: "list", value: [] },
          { label: "Opaque", type: "byte", value: 7 },
        ],
      }],
    };
    const pair = creatureAreaObjectPair([...placementFields(), classList]);
    const classSpellClear = {
      expectedClassIds: [4],
      expectedLevels: [3],
      classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
      classSlotIndices: [0],
      destructiveSpellClearConfirmed: true as const,
    };

    expect(planExistingAreaObjectDeletions(
      pair.git,
      pair.gic,
      editing({
        kind: "creature",
        sourceObjectId: "obj_cre_display_identity",
        sourceIndex: 0,
        classSpellClear,
      }),
    ).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      classSpellClear,
    }]);
  });

  it("plans exact confirmed class spell-entry removals against the raw graph", () => {
    const classList: SupportedGffField = {
      label: "ClassList",
      type: "list",
      value: [{
        typeId: 2,
        fields: [
          { label: "Class", type: "int", value: 1 },
          { label: "ClassLevel", type: "short", value: 3 },
          { label: "KnownList0", type: "list", value: [
            { typeId: 3, fields: [
              { label: "Spell", type: "word", value: 11 },
              { label: "SpellMetaMagic", type: "byte", value: 0 },
              { label: "SpellFlags", type: "byte", value: 1 },
            ] },
            { typeId: 3, fields: [
              { label: "Spell", type: "word", value: 12 },
              { label: "SpellMetaMagic", type: "byte", value: 2 },
              { label: "SpellFlags", type: "byte", value: 1 },
            ] },
          ] },
        ],
      }],
    };
    const pair = creatureAreaObjectPair([...placementFields(), classList]);
    const classSpellRemoval = {
      expectedClassIds: [1],
      expectedLevels: [3],
      classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
      targets: [
        { classSlotIndex: 0, listKind: "known" as const, spellLevel: 0, entryIndex: 1 },
      ],
      destructiveSpellRemovalConfirmed: true as const,
    };

    expect(planExistingAreaObjectDeletions(
      pair.git,
      pair.gic,
      editing({
        kind: "creature",
        sourceObjectId: "obj_cre_display_identity",
        sourceIndex: 0,
        classSpellRemoval,
      }),
    ).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      classSpellRemoval,
    }]);
  });

  it("plans exact confirmed same-list spell-entry reorders against the raw graph", () => {
    const classList: SupportedGffField = {
      label: "ClassList",
      type: "list",
      value: [{
        typeId: 2,
        fields: [
          { label: "Class", type: "int", value: 1 },
          { label: "ClassLevel", type: "short", value: 3 },
          { label: "KnownList0", type: "list", value: [
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
          ] },
        ],
      }],
    };
    const pair = creatureAreaObjectPair([...placementFields(), classList]);
    const classSpellReorder = {
      expectedClassIds: [1],
      expectedLevels: [3],
      classListGraphSha256: fingerprintAreaCreatureClassListField(classList),
      reorders: [{
        classSlotIndex: 0,
        listKind: "known" as const,
        spellLevel: 0,
        entryOrder: [1, 0],
      }],
      spellReorderConfirmed: true as const,
    };

    expect(planExistingAreaObjectDeletions(
      pair.git,
      pair.gic,
      editing({
        kind: "creature",
        sourceObjectId: "obj_cre_display_identity",
        sourceIndex: 0,
        classSpellReorder,
      }),
    ).propertyMutations).toEqual([{
      kind: "creature",
      sourceIndex: 0,
      classSpellReorder,
    }]);
  });
});

function editing(
  propertyMutation: NonNullable<ProjectedAreaObjectEditing["propertyMutations"]>[number],
): ProjectedAreaObjectEditing {
  return {
    sourceGitSha256: "b".repeat(64),
    retainedObjects: [{
      sourceObjectId: "obj_cre_display_identity",
      sourceKind: "creature",
      sceneKind: "creatures",
      resRef: "nw_guard",
      tag: "NW_GUARD",
      x: 10,
      y: 20,
      z: 0,
      bearing: Math.PI / 2,
      sourceIndex: 0,
    }],
    newObjects: [],
    propertyMutations: [propertyMutation],
  };
}

function placementFields(): SupportedGffField[] {
  return [
    { label: "TemplateResRef", type: "resref", value: "nw_guard" },
    { label: "Tag", type: "cexostring", value: "NW_GUARD" },
    { label: "XPosition", type: "float", value: 10 },
    { label: "YPosition", type: "float", value: 20 },
    { label: "ZPosition", type: "float", value: 0 },
    { label: "XOrientation", type: "float", value: Math.cos(Math.PI / 2) },
    { label: "YOrientation", type: "float", value: -Math.sin(Math.PI / 2) },
  ];
}
