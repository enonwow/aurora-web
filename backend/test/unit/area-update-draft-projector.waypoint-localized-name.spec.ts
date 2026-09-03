import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

const INLINE_SOURCE = {
  present: true,
  strRef: 0xffff_ffff,
  entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
} as const;

describe("Area Update retained Waypoint LocalizedName projection", () => {
  it("projects one changed exact pair without requiring Tag provenance", () => {
    expect(project(INLINE_SOURCE, " North Patrol Point ")
      .objectEditing?.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceObjectId: "obj_wpt_nw_waypoint001",
      sourceIndex: 0,
      localizedName: {
        expectedValue: "Patrol Point",
        value: " North Patrol Point ",
      },
    }]);
  });

  it("coalesces independently changed Tag and LocalizedName into one ordinal mutation", () => {
    const value = snapshot();
    const object = value.draft.payload.editableScene.objects[0] as any;
    object.tag = "NORTH_PATROL";
    object.source.waypointTag = { present: true, value: "NW_WAYPOINT001" };

    expect(projectAreaUpdateDraft(value, context()).objectEditing?.propertyMutations)
      .toEqual([{
        kind: "waypoint",
        sourceObjectId: "obj_wpt_nw_waypoint001",
        sourceIndex: 0,
        tag: { expectedValue: "NW_WAYPOINT001", value: "NORTH_PATROL" },
        localizedName: {
          expectedValue: "Patrol Point",
          value: "North Patrol Point",
        },
      }]);
  });

  it("emits no mutation for unchanged or unsupported preserve-only storage", () => {
    expect(project(INLINE_SOURCE, "Patrol Point").objectEditing?.propertyMutations)
      .toBeUndefined();
    expect(project({ present: true, strRef: 14817, entries: [] }, undefined)
      .objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["TLK-backed source", { present: true, strRef: 14817, entries: [] }, "North"],
    ["non-ASCII target", INLINE_SOURCE, "Północ"],
    ["control-byte target", INLINE_SOURCE, "North\nPoint"],
    ["over-budget target", INLINE_SOURCE, "A".repeat(257)],
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
    waypointLocalizedName: "North Patrol Point",
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
      waypointLocalizedNameStorage: INLINE_SOURCE,
    },
  });
  return value;
}

function project(source: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  object.source.waypointLocalizedNameStorage = source;
  if (target === undefined) delete object.waypointLocalizedName;
  else object.waypointLocalizedName = target;
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
