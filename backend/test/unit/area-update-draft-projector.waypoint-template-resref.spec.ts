import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

const PRESENT_SOURCE = {
  present: true,
  nativeType: "resref",
  value: "nw_waypoint001",
} as const;

describe("Area Update retained Waypoint TemplateResRef projection", () => {
  it("projects one exact changed native ResRef CAS", () => {
    expect(project(PRESENT_SOURCE, "custom_waypoint").objectEditing?.propertyMutations)
      .toEqual([{
        kind: "waypoint",
        sourceObjectId: "obj_wpt_nw_waypoint001",
        sourceIndex: 0,
        templateResRef: {
          expectedResRef: "nw_waypoint001",
          resRef: "custom_waypoint",
        },
      }]);
  });

  it("coalesces TemplateResRef and Tag into one immutable ordinal mutation", () => {
    const value = snapshot();
    const object = value.draft.payload.editableScene.objects[0] as any;
    object.tag = "CUSTOM_WAYPOINT";
    object.source.waypointTag = { present: true, value: "NW_WAYPOINT001" };

    expect(projectAreaUpdateDraft(value, context()).objectEditing?.propertyMutations)
      .toEqual([{
        kind: "waypoint",
        sourceObjectId: "obj_wpt_nw_waypoint001",
        sourceIndex: 0,
        tag: { expectedValue: "NW_WAYPOINT001", value: "CUSTOM_WAYPOINT" },
        templateResRef: {
          expectedResRef: "nw_waypoint001",
          resRef: "custom_waypoint",
        },
      }]);
  });

  it("emits no mutation for an unchanged target or an untouched absent field", () => {
    expect(project(PRESENT_SOURCE, "nw_waypoint001").objectEditing?.propertyMutations)
      .toBeUndefined();
    expect(project({ present: false }, undefined).objectEditing?.propertyMutations)
      .toBeUndefined();
  });

  it.each([
    ["absent source insertion", { present: false }, "custom_waypoint"],
    ["malformed source", { present: true, nativeType: "resref" }, "custom_waypoint"],
    ["uppercase target", PRESENT_SOURCE, "CUSTOM_WAYPOINT"],
    ["invalid-character target", PRESENT_SOURCE, "custom-waypoint"],
    ["overlength target", PRESENT_SOURCE, "abcdefghijklmnopq"],
  ])("rejects %s", (_label, source, target) => {
    expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
  });
});

function snapshot() {
  const value = areaUpdateDraftProjectorSnapshot();
  (value.draft.payload.editableScene.objects as any[]).push({
    id: "area_crypt01:obj_wpt_nw_waypoint001",
    kind: "waypoints",
    resRef: "nw_waypoint001",
    tag: "NW_WAYPOINT001",
    waypointTemplateResRef: "custom_waypoint",
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
      waypointTemplateResRef: PRESENT_SOURCE,
    },
  });
  return value;
}

function project(source: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  object.source.waypointTemplateResRef = source;
  if (target === undefined) delete object.waypointTemplateResRef;
  else object.waypointTemplateResRef = target;
  return projectAreaUpdateDraft(value, context());
}

function context() {
  return {
    areaResRef: "crypt01",
    draftId: "draft_01",
    draftRevision: 7,
    draftNormalizedSha256: AREA_UPDATE_DRAFT_HASH,
  };
}
