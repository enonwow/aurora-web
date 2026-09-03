import { createHash } from "node:crypto";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from
  "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  AreaObjectPairMutationError,
  mutateExistingAreaObjectsInGitGic,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";
import { AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE } from
  "../../src/modules/areas/domain/area-waypoint-construction-profile";
import {
  dynamicWaypointAdditionFixture,
  dynamicWaypointBlueprintFields,
  expectedDynamicWaypointGitFields,
} from "../support/area-waypoint-construction-fixture";

const FAMILY_LISTS = Object.freeze([
  ["Creature List", 4], ["Door List", 8], ["Encounter List", 7], ["List", 0],
  ["Placeable List", 9], ["SoundList", 6], ["StoreList", 11], ["TriggerList", 1],
  ["WaypointList", 5],
] as const);

describe("dynamic effective-catalog UTW waypoint construction", () => {
  it("freezes the bounded current-winner profile", () => {
    expect(AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE).toEqual({
      id: "effective-catalog-utw-waypoint-copy-v1",
      sourceKind: "waypoint",
      sceneKind: "waypoints",
      sourceExtension: "utw",
      fileType: "UTW ",
      fileVersion: "V3.2",
      rootStructTypeId: 0xffffffff,
      resourceType: 2058,
      maxSourceBytes: 1024 * 1024,
      maxSourceObjectKeyCodeUnits: 2048,
      maxAdditionsPerUpdate: 1024,
    });
    expect(Object.isFrozen(AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE)).toBe(true);
  });

  it("copies an exact UTW with defaults, VarTable, bearing, and paired GIC comment", () => {
    const pair = emptyPair();
    const transform = { x: 3.25, y: 4.5, z: 0.125, bearing: Math.PI / 3 };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [dynamicWaypointAdditionFixture(transform)],
    });
    const gitEntry = list(parseRawGffDocument(result.gitBytes), "WaypointList").value[0]!;
    const gicEntry = list(parseRawGffDocument(result.gicBytes), "WaypointList").value[0]!;
    expect(gitEntry).toEqual({ typeId: 5, fields: expectedDynamicWaypointGitFields(transform) });
    expect(gicEntry).toEqual({ typeId: 5, fields: [{
      label: "Comment", type: "cexostring", value: "Dynamic waypoint palette comment.",
    }] });
    expect(gitEntry.fields.some((field) => ["PaletteID", "Comment"].includes(field.label)))
      .toBe(false);
  });

  it("materializes optional native defaults and omits an empty VarTable", () => {
    const pair = emptyPair();
    const blueprintBytes = buildGffBuffer(
      dynamicWaypointBlueprintFields().filter((field) =>
        !["Appearance", "MapNote", "MapNoteEnabled", "VarTable", "Comment"].includes(field.label)),
      "UTW ",
      0xffffffff,
    );
    const addition = {
      ...dynamicWaypointAdditionFixture(),
      blueprintBytes,
      sourceSizeBytes: blueprintBytes.length,
      sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    };
    const result = mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [addition],
    });
    const fields = list(parseRawGffDocument(result.gitBytes), "WaypointList").value[0]!.fields;
    expect(fields.slice(0, 9)).toEqual([
      { label: "Appearance", type: "byte", value: 1 },
      expect.objectContaining({ label: "LinkedTo" }),
      expect.objectContaining({ label: "TemplateResRef" }),
      expect.objectContaining({ label: "Tag" }),
      expect.objectContaining({ label: "LocalizedName" }),
      expect.objectContaining({ label: "Description" }),
      expect.objectContaining({ label: "HasMapNote" }),
      { label: "MapNote", type: "cexolocstring", value: { strRef: 0xffffffff, entries: [] } },
      { label: "MapNoteEnabled", type: "byte", value: 1 },
    ]);
    expect(fields.some((field) => field.label === "VarTable")).toBe(false);
    expect(list(parseRawGffDocument(result.gicBytes), "WaypointList").value[0]!.fields)
      .toEqual([{ label: "Comment", type: "cexostring", value: "" }]);
  });

  it.each([
    ["missing source key", { sourceObjectKey: undefined }, "profile_or_identity_mismatch"],
    ["wrong source size", { sourceSizeBytes: 1 }, "profile_or_identity_mismatch"],
    ["wrong template", { templateResRef: "wp_other" }, "source_identity_mismatch"],
    ["wrong tag", { tag: "OTHER" }, "source_identity_mismatch"],
  ])("rejects a dynamic Waypoint with %s", (_label, patch, diagnostic) => {
    const pair = emptyPair();
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git,
      sourceGic: pair.gic,
      deletions: [],
      additions: [{ ...dynamicWaypointAdditionFixture(), ...patch }],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [expect.stringContaining(diagnostic)],
    });
  });

  it.each([
    ["unknown root field", (fields: SupportedGffField[]) => [
      ...fields, { label: "Unknown", type: "byte" as const, value: 0 },
    ], "Unknown:byte"],
    ["duplicate root field", (fields: SupportedGffField[]) => [fields[0]!, ...fields], "Comment:count=2"],
    ["non-canonical boolean", (fields: SupportedGffField[]) => fields.map((field) =>
      field.label === "HasMapNote" ? { ...field, value: 2 } as SupportedGffField : field),
    "HasMapNote:value=2"],
    ["malformed variable", (fields: SupportedGffField[]) => fields.map((field) =>
      field.label === "VarTable"
        ? { ...field, value: [{ typeId: 0, fields: [] }] } as SupportedGffField
        : field), "VarTable:entry=0"],
  ])("fails closed on a dynamic UTW with %s", (_label, mutate, diagnostic) => {
    const pair = emptyPair();
    const blueprintBytes = buildGffBuffer(
      mutate(dynamicWaypointBlueprintFields()) as SupportedGffField[], "UTW ", 0xffffffff,
    );
    const addition = {
      ...dynamicWaypointAdditionFixture(), blueprintBytes,
      sourceSizeBytes: blueprintBytes.length,
      sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    };
    expect(pairError(() => mutateExistingAreaObjectsInGitGic({
      sourceGit: pair.git, sourceGic: pair.gic, deletions: [], additions: [addition],
    }))).toMatchObject({
      code: "AREA_UPDATE_OBJECT_MUTATION_INVALID",
      diagnostics: [expect.stringContaining(diagnostic)],
    });
  });
});

function emptyPair(): { git: Buffer; gic: Buffer } {
  const fields = FAMILY_LISTS.map(([label]) => ({ label, type: "list" as const, value: [] }));
  return {
    git: buildGffBuffer(fields, "GIT ", 0xffffffff),
    gic: buildGffBuffer(fields, "GIC ", 0xffffffff),
  };
}

function list(document: ReturnType<typeof parseRawGffDocument>, label: string) {
  const field = document?.fields.find((candidate) => candidate.label === label);
  if (field?.type !== "list") throw new Error(`Missing ${label} list.`);
  return field;
}

function pairError(action: () => unknown): AreaObjectPairMutationError {
  try { action(); } catch (error) {
    if (error instanceof AreaObjectPairMutationError) return error;
    throw error;
  }
  throw new Error("Expected AreaObjectPairMutationError.");
}
