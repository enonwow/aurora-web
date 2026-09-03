import { parseRawGffDocument } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { mutateExistingAreaObjectsInGitGic } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import {
  creatureAreaObjectPair,
  gffList,
} from "../support/area-object-pair-writer-fixture";

describe("Aurora GIT Creature catalog-property writer", () => {
  it("rewrites the exact SoundSetFile Word and preserves the paired GIC", () => {
    const pair = creatureAreaObjectPair([
      { label: "SoundSetFile", type: "word", value: 0 },
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        soundSetFile: {
          expectedValue: 0,
          value: 27,
          tableSha256: "a".repeat(64),
          rowCount: 5_100,
        },
      }],
    });

    expect(creature(result.gitBytes).fields).toEqual([
      { label: "SoundSetFile", type: "word", value: 27 },
      { label: "Unrelated", type: "int", value: 77 },
    ]);
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("rewrites StartingPackage while preserving the complete ClassList and GIC", () => {
    const classList = {
      label: "ClassList" as const,
      type: "list" as const,
      value: [{
        typeId: 2,
        fields: [
          { label: "Class", type: "int" as const, value: 4 },
          { label: "ClassLevel", type: "short" as const, value: 3 },
        ],
      }],
    };
    const pair = creatureAreaObjectPair([
      { label: "StartingPackage", type: "byte", value: 0 },
      classList,
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        startingPackage: {
          expectedValue: 0,
          value: 2,
          expectedClassIds: [4],
          tableSha256: "c".repeat(64),
          rowCount: 132,
        },
      }],
    });

    expect(creature(result.gitBytes).fields).toEqual([
      { label: "StartingPackage", type: "byte", value: 2 },
      classList,
      { label: "Unrelated", type: "int", value: 77 },
    ]);
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("expands SkillList canonically while preserving opaque siblings", () => {
    const pair = creatureAreaObjectPair([{
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
    }]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
        skillList: {
          expectedRanks: [4, 0],
          ranks: [7, 0, 2],
          tableSha256: "c".repeat(64),
          rowCount: 3,
          resizeMode: "expand_zero_tail",
          confirmTruncation: false,
        },
      }],
    });

    expect(creature(result.gitBytes).fields[0]).toEqual({
      label: "SkillList",
      type: "list",
      value: [
        {
          typeId: 0,
          fields: [
            { label: "Rank", type: "byte", value: 7 },
            { label: "Opaque", type: "cexostring", value: "preserve" },
          ],
        },
        { typeId: 0, fields: [{ label: "Rank", type: "byte", value: 0 }] },
        { typeId: 0, fields: [{ label: "Rank", type: "byte", value: 2 }] },
      ],
    });
    expect(result.gicBytes).toEqual(pair.gic);
  });

  it("couples same-roster ClassLevel Shorts to the derived HP triplet", () => {
    const classList = {
      label: "ClassList" as const,
      type: "list" as const,
      value: [
        {
          typeId: 2,
          fields: [
            { label: "Class", type: "int" as const, value: 4 },
            { label: "ClassLevel", type: "short" as const, value: 3 },
            { label: "KnownList0", type: "list" as const, value: [] },
            { label: "Opaque", type: "cexostring" as const, value: "preserve" },
          ],
        },
        {
          typeId: 2,
          fields: [
            { label: "Class", type: "int" as const, value: 7 },
            { label: "ClassLevel", type: "short" as const, value: 2 },
            { label: "MemorizedList0", type: "list" as const, value: [] },
          ],
        },
      ],
    };
    const pair = creatureAreaObjectPair([
      classList,
      { label: "HitPoints", type: "short", value: 10 },
      { label: "CurrentHitPoints", type: "short", value: 7 },
      { label: "MaxHitPoints", type: "short", value: 99 },
      { label: "Con", type: "byte", value: 14 },
      { label: "Race", type: "byte", value: 1 },
    ]);
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "creature",
        sourceIndex: 0,
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
      }],
    });

    const fields = creature(result.gitBytes).fields;
    const candidateClassList = fields[0];
    expect(candidateClassList).toEqual({
      ...classList,
      value: classList.value.map((entry, index) => ({
        ...entry,
        fields: entry.fields.map((field) => field.label === "ClassLevel"
          ? { ...field, value: index === 0 ? 4 : 3 }
          : field),
      })),
    });
    expect(fields.find((field) => field.label === "CurrentHitPoints"))
      .toEqual({ label: "CurrentHitPoints", type: "short", value: 4 });
    expect(fields.find((field) => field.label === "MaxHitPoints"))
      .toEqual({ label: "MaxHitPoints", type: "short", value: 31 });
    expect(result.gicBytes).toEqual(pair.gic);
  });
});

function creature(bytes: Buffer) {
  return gffList(parseRawGffDocument(bytes), "Creature List")!.value[0]!;
}
