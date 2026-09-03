import { createHash } from "node:crypto";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { planExistingAreaObjectDeletions } from "../../src/modules/areas/adapters/outbound/blob/area-existing-object-deletion-planner";
import { mutateExistingAreaObjectsInGitGic } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import type { ProjectedAreaObjectEditing } from "../../src/modules/areas/domain/area-update-draft-projector";

const ROOT_TYPE = 0xffff_ffff;
const PROFILES = [
  ["Creature List", 4],
  ["Door List", 8],
  ["Encounter List", 7],
  ["List", 0],
  ["Placeable List", 9],
  ["SoundList", 6],
  ["StoreList", 11],
  ["TriggerList", 1],
  ["WaypointList", 5],
] as const;

describe("retained Waypoint MapNote persistence", () => {
  it("plans one exact complete CAS vector from paired source provenance", () => {
    const pair = fixturePair();
    const editing = fixtureEditing(pair.git);

    const plan = planExistingAreaObjectDeletions(pair.git, pair.gic, editing);

    expect(plan.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceIndex: 0,
      mapNote: {
        expectedValue: {
          hasMapNote: false,
          mapNoteText: "Old marker",
          mapNoteEnabled: true,
        },
        value: {
          hasMapNote: true,
          mapNoteText: " New marker ",
          mapNoteEnabled: false,
        },
      },
    }]);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).mapNote)).toBe(true);
    expect(Object.isFrozen((plan.propertyMutations[0] as any).mapNote.value)).toBe(true);
  });

  it("writes all three native fields atomically and preserves exact GIC bytes", () => {
    const pair = fixturePair();
    const plan = planExistingAreaObjectDeletions(pair.git, pair.gic, fixtureEditing(pair.git));

    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: plan.deletions,
      propertyMutations: plan.propertyMutations,
    });

    const sourceEntry = waypointEntry(pair.git);
    const candidateEntry = waypointEntry(result.gitBytes);
    expect(candidateEntry.fields).toEqual(sourceEntry.fields.map((field) => {
      if (field.label === "HasMapNote") {
        return { label: "HasMapNote", type: "byte", value: 1 };
      }
      if (field.label === "MapNote") {
        return {
          label: "MapNote",
          type: "cexolocstring",
          value: {
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, text: " New marker " }],
          },
        };
      }
      if (field.label === "MapNoteEnabled") {
        return { label: "MapNoteEnabled", type: "byte", value: 0 };
      }
      return field;
    }));
    expect(result.gicBytes).toEqual(pair.gic);
    expect(result.propertyUpdatedCounts).toMatchObject({ waypoint: 1 });
  });

  it("rejects a stale component before returning either candidate companion", () => {
    const pair = fixturePair();
    expect(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      propertyMutations: [{
        kind: "waypoint",
        sourceIndex: 0,
        mapNote: {
          expectedValue: {
            hasMapNote: true,
            mapNoteText: "Old marker",
            mapNoteEnabled: true,
          },
          value: {
            hasMapNote: false,
            mapNoteText: "Changed",
            mapNoteEnabled: false,
          },
        },
      } as never],
    })).toThrow(/HasMapNote source value differs from retained provenance/u);
  });
});

function fixturePair(): Readonly<{ git: Buffer; gic: Buffer }> {
  const gitFields: SupportedGffField[] = PROFILES.map(([label, typeId]) => ({
    label,
    type: "list",
    value: label === "WaypointList"
      ? [{ typeId, fields: waypointFields() }]
      : [],
  }));
  const gicFields: SupportedGffField[] = PROFILES.map(([label, typeId]) => ({
    label,
    type: "list",
    value: label === "WaypointList"
      ? [{ typeId, fields: [] }]
      : [],
  }));
  return Object.freeze({
    git: buildGffBuffer(gitFields, "GIT ", ROOT_TYPE),
    gic: buildGffBuffer(gicFields, "GIC ", ROOT_TYPE),
  });
}

function waypointFields(): SupportedGffField[] {
  return [
    { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
    { label: "Tag", type: "cexostring", value: "WAYPOINT" },
    { label: "XPosition", type: "float", value: Math.fround(33.1162) },
    { label: "YPosition", type: "float", value: Math.fround(47.7472) },
    { label: "ZPosition", type: "float", value: 0 },
    { label: "XOrientation", type: "float", value: Math.fround(Math.cos(Math.PI * 1.5)) },
    { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(Math.PI * 1.5)) },
    { label: "HasMapNote", type: "byte", value: 0 },
    {
      label: "MapNote",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "Old marker" }],
      },
    },
    { label: "MapNoteEnabled", type: "byte", value: 1 },
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
      x: Math.fround(33.1162) / 10,
      y: Math.fround(47.7472) / 10,
      z: 0,
      bearing: Math.PI * 1.5,
    }],
    newObjects: [],
    propertyMutations: [{
      kind: "waypoint",
      sourceObjectId: "obj_wpt_waypoint",
      sourceIndex: 0,
      mapNote: {
        expectedValue: {
          hasMapNote: false,
          mapNoteText: "Old marker",
          mapNoteEnabled: true,
        },
        value: {
          hasMapNote: true,
          mapNoteText: " New marker ",
          mapNoteEnabled: false,
        },
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
