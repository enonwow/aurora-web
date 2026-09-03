import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

describe("Area Update retained Trigger editor Comment projection", () => {
  it("projects one exact changed pair", () => {
    expect(project("  west gate  ", "  inner gate  ")
      .objectEditing?.propertyMutations).toEqual([{
      kind: "trigger",
      sourceObjectId: "obj_trg_newgeneric",
      sourceIndex: 0,
      editorComment: {
        expectedValue: "  west gate  ",
        value: "  inner gate  ",
      },
    }]);
  });

  it("coalesces Comment with Tag, TemplateResRef, and LocalizedName", () => {
    const value = snapshot();
    const object = value.draft.payload.editableScene.objects[0] as any;
    object.tag = "CUSTOM_TRIGGER";
    object.source.triggerTag = { present: true, value: "GenericTrigger" };
    object.triggerTemplateResRef = "custom_trigger";
    object.source.triggerTemplateResRef = {
      present: true,
      nativeType: "resref",
      value: "newgeneric",
    };
    object.triggerLocalizedName = "Inner Gate Trigger";
    object.source.triggerLocalizedNameStorage = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
    };

    expect(projectAreaUpdateDraft(value, context()).objectEditing?.propertyMutations)
      .toEqual([{
        kind: "trigger",
        sourceObjectId: "obj_trg_newgeneric",
        sourceIndex: 0,
        tag: { expectedValue: "GenericTrigger", value: "CUSTOM_TRIGGER" },
        templateResRef: { expectedResRef: "newgeneric", resRef: "custom_trigger" },
        localizedName: { expectedValue: "Gate Trigger", value: "Inner Gate Trigger" },
        editorComment: { expectedValue: "source", value: "target" },
      }]);
  });

  it("emits no mutation for unchanged or absent preserve-only provenance", () => {
    expect(project("source", "source").objectEditing?.propertyMutations).toBeUndefined();
    expect(project(undefined, undefined).objectEditing?.propertyMutations).toBeUndefined();
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
    id: "area_crypt01:obj_trg_newgeneric",
    kind: "triggers",
    resRef: "newgeneric",
    tag: "GenericTrigger",
    triggerEditorComment: "target",
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
      sourceObjectId: "obj_trg_newgeneric",
      sourceKind: "trigger",
      sourceIndex: 0,
      triggerEditorComment: "source",
    },
  });
  return value;
}

function project(source: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  if (source === undefined) delete object.source.triggerEditorComment;
  else object.source.triggerEditorComment = source;
  if (target === undefined) delete object.triggerEditorComment;
  else object.triggerEditorComment = target;
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
