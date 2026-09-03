import { createHash } from "node:crypto";

import { planExistingAreaObjectDeletions } from
  "../../src/modules/areas/adapters/outbound/blob/area-existing-object-deletion-planner";
import { mutateExistingAreaObjectsInGitGic } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import { parseRawGffDocument } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import type { ProjectedAreaObjectEditing } from
  "../../src/modules/areas/domain/area-update-draft-projector";

const ROOT_TYPE = 0xffff_ffff;
const TABLE_SHA256 = "a".repeat(64);
const PROFILES = [
  ["Creature List", 4], ["Door List", 8], ["Encounter List", 7], ["List", 0],
  ["Placeable List", 9], ["SoundList", 6], ["StoreList", 11], ["TriggerList", 1],
  ["WaypointList", 5],
] as const;

describe("retained Waypoint Appearance persistence", () => {
  it("plans one immutable-ordinal digest-bound Byte CAS", () => {
    const pair = fixturePair([{ label: "Appearance", type: "byte", value: 1 }]);

    const plan = planExistingAreaObjectDeletions(pair.git, pair.gic, fixtureEditing(pair.git));

    expect(plan.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceIndex: 0,
      appearance: {
        expectedValue: 1,
        value: 4,
        tableSha256: TABLE_SHA256,
        rowCount: 5,
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).appearance)).toBe(true);
  });

  it("rewrites only exact Appearance and preserves paired GIC bytes", () => {
    const pair = fixturePair([{ label: "Appearance", type: "byte", value: 1 }]);
    const plan = planExistingAreaObjectDeletions(pair.git, pair.gic, fixtureEditing(pair.git));

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: plan.deletions,
      propertyMutations: plan.propertyMutations,
    });

    const source = waypointEntry(pair.git);
    const candidate = waypointEntry(result.gitBytes);
    expect(candidate.fields).toEqual(source.fields.map((field) => field.label === "Appearance"
      ? { label: "Appearance", type: "byte", value: 4 }
      : field));
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ waypoint: 1 });
  });

  it.each([
    ["missing", []],
    ["wrong case", [{ label: "appearance", type: "byte" as const, value: 1 }]],
    ["wrong type", [{ label: "Appearance", type: "word" as const, value: 1 }]],
    ["duplicate", [
      { label: "Appearance", type: "byte" as const, value: 1 },
      { label: "Appearance", type: "byte" as const, value: 2 },
    ]],
  ] as const)("rejects %s native Appearance storage before publication", (_label, fields) => {
    const pair = fixturePair([...fields]);
    expect(() => planExistingAreaObjectDeletions(
      pair.git,
      pair.gic,
      fixtureEditing(pair.git),
    )).toThrow(/Appearance/u);
  });

  it("rejects a stale expected Byte before returning either candidate companion", () => {
    const pair = fixturePair([{ label: "Appearance", type: "byte", value: 1 }]);
    const editing = fixtureEditing(pair.git) as any;
    editing.propertyMutations[0].appearance.expectedValue = 2;
    expect(() => planExistingAreaObjectDeletions(pair.git, pair.gic, editing))
      .toThrow(/differs from the exact source GIT/u);
  });
});

function fixturePair(appearanceFields: readonly SupportedGffField[]) {
  const gitFields: SupportedGffField[] = PROFILES.map(([label, typeId]) => ({
    label,
    type: "list",
    value: label === "WaypointList"
      ? [{ typeId, fields: waypointFields(appearanceFields) }]
      : [],
  }));
  const gicFields: SupportedGffField[] = PROFILES.map(([label, typeId]) => ({
    label,
    type: "list",
    value: label === "WaypointList" ? [{ typeId, fields: [] }] : [],
  }));
  return {
    git: buildGffBuffer(gitFields, "GIT ", ROOT_TYPE),
    gic: buildGffBuffer(gicFields, "GIC ", ROOT_TYPE),
  };
}

function waypointFields(appearanceFields: readonly SupportedGffField[]): SupportedGffField[] {
  return [
    { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
    { label: "Tag", type: "cexostring", value: "WAYPOINT" },
    ...appearanceFields,
    { label: "XPosition", type: "float", value: 10 },
    { label: "YPosition", type: "float", value: 20 },
    { label: "ZPosition", type: "float", value: 0 },
    { label: "XOrientation", type: "float", value: 1 },
    { label: "YOrientation", type: "float", value: 0 },
  ];
}

function fixtureEditing(sourceGit: Buffer): ProjectedAreaObjectEditing {
  return {
    sourceGitSha256: createHash("sha256").update(sourceGit).digest("hex"),
    retainedObjects: [{
      sourceObjectId: "obj_wpt_waypoint",
      sourceKind: "waypoint",
      sceneKind: "waypoints",
      sourceIndex: 0,
      resRef: "nw_waypoint001",
      tag: "WAYPOINT",
      x: 1,
      y: 2,
      z: 0,
      bearing: 0,
    }],
    newObjects: [],
    propertyMutations: [{
      kind: "waypoint",
      sourceObjectId: "obj_wpt_waypoint",
      sourceIndex: 0,
      appearance: {
        expectedValue: 1,
        value: 4,
        tableSha256: TABLE_SHA256,
        rowCount: 5,
      },
    } as never],
  };
}

function waypointEntry(bytes: Buffer) {
  const document = parseRawGffDocument(bytes);
  const field = document?.fields.find((candidate) => candidate.label === "WaypointList");
  if (!field || field.type !== "list" || field.value.length !== 1) {
    throw new Error("Expected exactly one WaypointList entry.");
  }
  return field.value[0]!;
}
