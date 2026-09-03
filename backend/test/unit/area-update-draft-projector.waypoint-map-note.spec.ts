import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

describe("Area Update retained Waypoint map-note projection", () => {
  it("projects one exact changed complete vector", () => {
    expect(project(storage(0, "", 1), value(true, "Northern gate", true))
      .objectEditing?.propertyMutations).toEqual([{
      kind: "waypoint",
      sourceObjectId: "obj_wpt_nw_waypoint001",
      sourceIndex: 0,
      mapNote: {
        expectedValue: value(false, "", true),
        value: value(true, "Northern gate", true),
      },
    }]);
  });

  it("coalesces the vector with an independently admitted Comment", () => {
    const draft = snapshot();
    const object = draft.draft.payload.editableScene.objects[0] as any;
    object.source.waypointEditorComment = "source";
    object.waypointEditorComment = "target";
    (draft.draft.payload.provenance as any).sourceGicSha256 = "c".repeat(64);
    expect(projectAreaUpdateDraft(draft, context()).objectEditing?.propertyMutations)
      .toEqual([expect.objectContaining({
        kind: "waypoint",
        mapNote: expect.any(Object),
        editorComment: { expectedValue: "source", value: "target" },
      })]);
  });

  it("emits no mutation for an unchanged vector", () => {
    const unchanged = value(false, "", true);
    expect(project(storage(0, "", 1), unchanged).objectEditing?.propertyMutations)
      .toBeUndefined();
  });

  it.each([
    ["missing source", undefined, value(true, "A", true)],
    ["partial source", { hasMapNoteByte: 0, mapNoteEnabledByte: 1 }, value(true, "A", true)],
    ["non-binary flag", storage(2 as never, "", 1), value(true, "A", true)],
    ["unsupported localized profile", {
      hasMapNoteByte: 0,
      mapNoteStorage: { present: true, strRef: 5, entries: [] },
      mapNoteEnabledByte: 1,
    }, value(true, "A", true)],
    ["partial target", storage(0, "", 1), { hasMapNote: true, mapNoteText: "A" }],
    ["non-ASCII target", storage(0, "", 1), value(true, "Północ", true)],
  ])("rejects %s", (_label, source, target) => {
    expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
  });
});

function snapshot() {
  const draft = areaUpdateDraftProjectorSnapshot();
  (draft.draft.payload.editableScene.objects as any[]).push({
    id: "area_crypt01:obj_wpt_nw_waypoint001",
    kind: "waypoints",
    resRef: "nw_waypoint001",
    tag: "NW_WAYPOINT001",
    waypointMapNote: value(true, "Northern gate", true),
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
      waypointMapNoteStorage: storage(0, "", 1),
    },
  });
  return draft;
}

function project(source: unknown, target: unknown) {
  const draft = snapshot();
  const object = draft.draft.payload.editableScene.objects[0] as any;
  if (source === undefined) delete object.source.waypointMapNoteStorage;
  else object.source.waypointMapNoteStorage = source;
  if (target === undefined) delete object.waypointMapNote;
  else object.waypointMapNote = target;
  return projectAreaUpdateDraft(draft, context());
}

function value(hasMapNote: boolean, mapNoteText: string, mapNoteEnabled: boolean) {
  return { hasMapNote, mapNoteText, mapNoteEnabled };
}

function storage(hasMapNoteByte: 0 | 1, text: string, mapNoteEnabledByte: 0 | 1) {
  return {
    hasMapNoteByte,
    mapNoteStorage: {
      present: true,
      strRef: 0xffff_ffff,
      entries: text
        ? [{ languageId: 0, textBytesBase64: Buffer.from(text).toString("base64") }]
        : [],
    },
    mapNoteEnabledByte,
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
