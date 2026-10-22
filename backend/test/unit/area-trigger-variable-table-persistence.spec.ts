import { createHash } from "node:crypto";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { planExistingAreaObjectDeletions } from
  "../../src/modules/areas/adapters/outbound/blob/area-existing-object-deletion-planner";
import { mutateExistingAreaObjectsInGitGic } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import type { ProjectedAreaObjectEditing } from
  "../../src/modules/areas/domain/area-update-draft-projector";

const ROOT_TYPE = 0xffff_ffff;
const PROFILES = [
  ["Creature List", 4], ["Door List", 8], ["Encounter List", 7], ["List", 0],
  ["Placeable List", 9], ["SoundList", 6], ["StoreList", 11], ["TriggerList", 1],
  ["WaypointList", 5],
] as const;

describe("retained Trigger VarTable persistence", () => {
  it("plans and writes only the exact ordered VarTable while preserving GIC bytes", () => {
    const pair = fixturePair();
    const plan = planExistingAreaObjectDeletions(pair.git, pair.gic, fixtureEditing(pair.git));

    expect(plan.propertyMutations).toEqual([{
      kind: "trigger",
      sourceIndex: 0,
      variables: {
        expectedEntries: [
          { sourceIndex: 0, name: "counter", type: "int", value: 1 },
          { sourceIndex: 1, name: "label", type: "string", value: "old" },
        ],
        entries: [
          { name: "label", type: "string", value: "new" },
          { name: "scale", type: "float", value: Math.fround(1.5) },
        ],
      },
    }]);

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: plan.deletions,
      propertyMutations: plan.propertyMutations,
    });
    const source = triggerEntry(pair.git);
    const candidate = triggerEntry(result.gitBytes);
    expect(candidate.fields.filter((field) => field.label !== "VarTable"))
      .toEqual(source.fields.filter((field) => field.label !== "VarTable"));
    expect(candidate.fields.find((field) => field.label === "VarTable")).toEqual({
      label: "VarTable",
      type: "list",
      value: [
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "label" },
          { label: "Type", type: "dword", value: 3 },
          { label: "Value", type: "cexostring", value: "new" },
        ] },
        { typeId: 0, fields: [
          { label: "Name", type: "cexostring", value: "scale" },
          { label: "Type", type: "dword", value: 2 },
          { label: "Value", type: "float", value: Math.fround(1.5) },
        ] },
      ],
    });
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ trigger: 1 });
  });

  it("rejects stale retained provenance before returning a candidate", () => {
    const pair = fixturePair();
    const editing = fixtureEditing(pair.git) as any;
    editing.propertyMutations[0].variables.expectedEntries[0].value = 2;
    expect(() => planExistingAreaObjectDeletions(pair.git, pair.gic, editing))
      .toThrow(/differs from immutable provenance|stale/u);
  });
});

function fixturePair(): Readonly<{ git: Buffer; gic: Buffer }> {
  const gitFields: SupportedGffField[] = PROFILES.map(([label, typeId]) => ({
    label,
    type: "list",
    value: label === "TriggerList" ? [{ typeId, fields: triggerFields() }] : [],
  }));
  const gicFields: SupportedGffField[] = PROFILES.map(([label, typeId]) => ({
    label,
    type: "list",
    value: label === "TriggerList" ? [{ typeId, fields: [] }] : [],
  }));
  return Object.freeze({
    git: buildGffBuffer(gitFields, "GIT ", ROOT_TYPE),
    gic: buildGffBuffer(gicFields, "GIC ", ROOT_TYPE),
  });
}

function triggerFields(): SupportedGffField[] {
  return [
    { label: "TemplateResRef", type: "resref", value: "newgeneric" },
    { label: "Tag", type: "cexostring", value: "TRIGGER" },
    { label: "VarTable", type: "list", value: [
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "counter" },
        { label: "Type", type: "dword", value: 1 },
        { label: "Value", type: "int", value: 1 },
      ] },
      { typeId: 0, fields: [
        { label: "Name", type: "cexostring", value: "label" },
        { label: "Type", type: "dword", value: 3 },
        { label: "Value", type: "cexostring", value: "old" },
      ] },
    ] },
    { label: "XPosition", type: "float", value: 10 },
    { label: "YPosition", type: "float", value: 20 },
    { label: "ZPosition", type: "float", value: 0 },
    { label: "Geometry", type: "list", value: [] },
  ];
}

function fixtureEditing(sourceGit: Buffer): ProjectedAreaObjectEditing {
  return {
    sourceGitSha256: createHash("sha256").update(sourceGit).digest("hex"),
    retainedObjects: [{
      sourceObjectId: "obj_trg_trigger",
      sourceKind: "trigger",
      sceneKind: "triggers",
      sourceIndex: 0,
      resRef: "newgeneric",
      tag: "TRIGGER",
      x: 1,
      y: 2,
      z: 0,
      bearing: 0,
    }],
    newObjects: [],
    propertyMutations: [{
      kind: "trigger",
      sourceObjectId: "obj_trg_trigger",
      sourceIndex: 0,
      variables: {
        expectedEntries: [
          { sourceIndex: 0, name: "counter", type: "int", value: 1 },
          { sourceIndex: 1, name: "label", type: "string", value: "old" },
        ],
        entries: [
          { name: "label", type: "string", value: "new" },
          { name: "scale", type: "float", value: Math.fround(1.5) },
        ],
      },
    } as never],
  };
}

function triggerEntry(bytes: Buffer) {
  const document = parseRawGffDocument(bytes);
  const field = document?.fields.find((candidate) => candidate.label === "TriggerList");
  if (!field || field.type !== "list" || field.value.length !== 1) {
    throw new Error("Expected exactly one TriggerList entry.");
  }
  return field.value[0]!;
}
