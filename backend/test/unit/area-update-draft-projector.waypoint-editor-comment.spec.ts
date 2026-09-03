import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

describe("Area Update retained Waypoint editor Comment projection", () => {
  it("projects one exact changed pair", () => {
    expect(project("  patrol  ", "  northern patrol  ")
      .objectEditing?.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceObjectId: "obj_wpt_nw_waypoint001",
      sourceIndex: 0,
      editorComment: {
        expectedValue: "  patrol  ",
        value: "  northern patrol  ",
      },
    }]);
  });

  it("coalesces Comment with Tag, LocalizedName, and Description", () => {
    const value = snapshot();
    const object = value.draft.payload.editableScene.objects[0] as any;
    object.tag = "NORTH_PATROL";
    object.source.waypointTag = { present: true, value: "NW_WAYPOINT001" };
    object.waypointLocalizedName = "North Patrol";
    object.source.waypointLocalizedNameStorage = inline("Patrol");
    object.waypointDescription = "North route";
    object.source.waypointDescriptionStorage = inline("Route");

    expect(projectAreaUpdateDraft(value, context()).objectEditing?.propertyMutations)
      .toEqual([{
        kind: "waypoint",
        sourceObjectId: "obj_wpt_nw_waypoint001",
        sourceIndex: 0,
        tag: { expectedValue: "NW_WAYPOINT001", value: "NORTH_PATROL" },
        localizedName: { expectedValue: "Patrol", value: "North Patrol" },
        description: { expectedValue: "Route", value: "North route" },
        editorComment: { expectedValue: "source", value: "target" },
      }]);
  });

  it("emits no mutation for unchanged or absent preserve-only provenance", () => {
    expect(project("source", "source").objectEditing?.propertyMutations).toBeUndefined();
    const value = snapshot();
    const object = value.draft.payload.editableScene.objects[0] as any;
    delete object.source.waypointEditorComment;
    delete object.waypointEditorComment;
    expect(projectAreaUpdateDraft(value, context()).objectEditing?.propertyMutations)
      .toBeUndefined();
  });

  it.each([
    ["missing source", undefined, "target"],
    ["NUL source", "bad\0source", "target"],
    ["NUL target", "source", "bad\0target"],
    ["over-budget target", "source", "x".repeat(4097)],
  ])("rejects %s", (_label, source, target) => {
    expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
  });
});

function snapshot() {
  const value = areaUpdateDraftProjectorSnapshot();
  (value.draft.payload.provenance as any).sourceGicSha256 = "c".repeat(64);
  (value.draft.payload.editableScene.objects as any[]).push({
    id: "area_crypt01:obj_wpt_nw_waypoint001",
    kind: "waypoints",
    resRef: "nw_waypoint001",
    tag: "NW_WAYPOINT001",
    waypointEditorComment: "target",
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
      waypointEditorComment: "source",
    },
  });
  return value;
}

function project(source: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  if (source === undefined) delete object.source.waypointEditorComment;
  else object.source.waypointEditorComment = source;
  if (target === undefined) delete object.waypointEditorComment;
  else object.waypointEditorComment = target;
  return projectAreaUpdateDraft(value, context());
}

function inline(text: string) {
  return {
    present: true,
    strRef: 0xffff_ffff,
    entries: [{ languageId: 0, textBytesBase64: Buffer.from(text).toString("base64") }],
  };
}

function context() {
  return {
    areaResRef: "crypt01",
    draftId: "draft_01",
    draftRevision: 7,
    draftNormalizedSha256: AREA_UPDATE_DRAFT_HASH,
  };
}
