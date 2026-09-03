import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

describe("Area Update retained Waypoint Appearance projection", () => {
  it("projects one exact digest-bound changed Byte CAS", () => {
    expect(project(source(), 4).objectEditing?.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceObjectId: "obj_wpt_nw_waypoint001",
      sourceIndex: 0,
      appearance: {
        expectedValue: 1,
        value: 4,
        tableSha256: "a".repeat(64),
        rowCount: 5,
      },
    }]);
  });

  it("emits no mutation for the retained source row", () => {
    expect(project(source(), 1).objectEditing?.propertyMutations).toBeUndefined();
    expect(project(source(), undefined).objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["missing source", undefined, 4],
    ["mismatched retained row", {
      ...source(),
      table: { ...source().table, rowIndex: 2 },
    }, 4],
    ["target outside table", source(), 5],
    ["unknown provenance key", { ...source(), extra: true }, 4],
  ])("rejects %s", (_label, provenance, target) => {
    expect(() => project(provenance, target)).toThrow(AreaUpdateDraftProjectionError);
  });
});

function snapshot() {
  const draft = areaUpdateDraftProjectorSnapshot();
  (draft.draft.payload.editableScene.objects as any[]).push({
    id: "area_crypt01:obj_wpt_nw_waypoint001",
    kind: "waypoints",
    resRef: "nw_waypoint001",
    tag: "NW_WAYPOINT001",
    waypointAppearance: 4,
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
    },
    source: {
      type: "aurora_git",
      areaId: "area_crypt01",
      sourceObjectId: "obj_wpt_nw_waypoint001",
      sourceKind: "waypoint",
      sourceIndex: 0,
      waypointAppearance: source(),
    },
  });
  return draft;
}

function project(provenance: unknown, target: unknown) {
  const draft = snapshot();
  const object = draft.draft.payload.editableScene.objects[0] as any;
  if (provenance === undefined) delete object.source.waypointAppearance;
  else object.source.waypointAppearance = provenance;
  if (target === undefined) delete object.waypointAppearance;
  else object.waypointAppearance = target;
  return projectAreaUpdateDraft(draft, {
    areaResRef: "crypt01",
    draftId: "draft_01",
    draftRevision: 7,
    draftNormalizedSha256: AREA_UPDATE_DRAFT_HASH,
  });
}

function source() {
  return {
    present: true as const,
    nativeType: "byte" as const,
    value: 1,
    table: {
      resourceName: "waypoint.2da" as const,
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/waypoint.2da",
      sourceLayer: "vanilla" as const,
      sha256: "a".repeat(64),
      sizeBytes: 272,
      rowCount: 5,
      rowIndex: 1,
    },
  };
}
