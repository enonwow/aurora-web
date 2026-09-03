import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

describe("Area Update retained Waypoint VarTable projection", () => {
  it("projects one exact changed complete ordered table", () => {
    expect(project(source(), [{ name: "label", type: "string", value: "north" }])
      .objectEditing?.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceObjectId: "obj_wpt_nw_waypoint001",
      sourceIndex: 0,
      variables: {
        expectedEntries: source().expectedEntries,
        entries: [{ name: "label", type: "string", value: "north" }],
      },
    }]);
  });

  it("emits no mutation for an unchanged table", () => {
    expect(project(source(), [{ name: "counter", type: "int", value: 1 }])
      .objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["missing source", undefined, [{ name: "counter", type: "int", value: 2 }]],
    ["noncontiguous source", { expectedEntries: [
      { sourceIndex: 1, name: "counter", type: "int", value: 1 },
    ] }, [{ name: "counter", type: "int", value: 2 }]],
    ["missing target", source(), undefined],
    ["unsupported float", source(), [{ name: "counter", type: "float", value: 0.1 }]],
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
    waypointVariables: [{ name: "label", type: "string", value: "north" }],
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    visualTransform: { scale: 1, offsetX: 0, offsetY: 0, offsetZ: 0, pitch: 0, yaw: 0, roll: 0 },
    source: {
      type: "aurora_git",
      areaId: "area_crypt01",
      sourceObjectId: "obj_wpt_nw_waypoint001",
      sourceKind: "waypoint",
      sourceIndex: 0,
      waypointVariables: source(),
    },
  });
  return draft;
}

function project(provenance: unknown, target: unknown) {
  const draft = snapshot();
  const object = draft.draft.payload.editableScene.objects[0] as any;
  if (provenance === undefined) delete object.source.waypointVariables;
  else object.source.waypointVariables = provenance;
  if (target === undefined) delete object.waypointVariables;
  else object.waypointVariables = target;
  return projectAreaUpdateDraft(draft, {
    areaResRef: "crypt01",
    draftId: "draft_01",
    draftRevision: 7,
    draftNormalizedSha256: AREA_UPDATE_DRAFT_HASH,
  });
}

function source() {
  return {
    expectedEntries: [{ sourceIndex: 0, name: "counter", type: "int", value: 1 }],
  };
}
