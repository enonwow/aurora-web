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
  strRef: 0xffff_ffff,
  entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
} as const;

describe("Area Update retained Trigger LocalizedName projection", () => {
  it("projects one exact changed inline localized-string CAS", () => {
    expect(project(PRESENT_SOURCE, " Inner Gate Trigger ").objectEditing?.propertyMutations)
      .toEqual([{
        kind: "trigger",
        sourceObjectId: "obj_trg_newgeneric",
        sourceIndex: 0,
        localizedName: {
          expectedValue: "Gate Trigger",
          value: " Inner Gate Trigger ",
        },
      }]);
  });

  it("coalesces LocalizedName, TemplateResRef, and Tag into one immutable ordinal mutation", () => {
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

    expect(projectAreaUpdateDraft(value, context()).objectEditing?.propertyMutations)
      .toEqual([{
        kind: "trigger",
        sourceObjectId: "obj_trg_newgeneric",
        sourceIndex: 0,
        tag: { expectedValue: "GenericTrigger", value: "CUSTOM_TRIGGER" },
        templateResRef: {
          expectedResRef: "newgeneric",
          resRef: "custom_trigger",
        },
        localizedName: {
          expectedValue: "Gate Trigger",
          value: "Inner Gate Trigger",
        },
      }]);
  });

  it("emits no mutation for an unchanged target or untouched absent field", () => {
    expect(project(PRESENT_SOURCE, "Gate Trigger").objectEditing?.propertyMutations)
      .toBeUndefined();
    expect(project({ present: false }, undefined).objectEditing?.propertyMutations)
      .toBeUndefined();
  });

  it.each([
    ["absent source insertion", { present: false }, "Inner Gate Trigger"],
    ["TLK-backed source", { present: true, strRef: 14759, entries: [] }, "Inner Gate Trigger"],
    ["malformed source", { present: true, strRef: 0xffff_ffff }, "Inner Gate Trigger"],
    ["control-byte target", PRESENT_SOURCE, "Bad\nName"],
    ["non-ASCII target", PRESENT_SOURCE, "Łowcy"],
    ["overlength target", PRESENT_SOURCE, "A".repeat(257)],
  ])("rejects %s", (_label, source, target) => {
    expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
  });
});

function snapshot() {
  const value = areaUpdateDraftProjectorSnapshot();
  (value.draft.payload.editableScene.objects as any[]).push({
    id: "area_crypt01:obj_trg_newgeneric",
    kind: "triggers",
    resRef: "newgeneric",
    tag: "GenericTrigger",
    triggerLocalizedName: "Inner Gate Trigger",
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
      triggerLocalizedNameStorage: PRESENT_SOURCE,
    },
  });
  return value;
}
function project(source: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  object.source.triggerLocalizedNameStorage = source;
  if (target === undefined) delete object.triggerLocalizedName;
  else object.triggerLocalizedName = target;
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
