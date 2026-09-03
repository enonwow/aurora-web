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
  value: "newgeneric",
} as const;

describe("Area Update retained Trigger TemplateResRef projection", () => {
  it("projects one exact changed native ResRef CAS", () => {
    expect(project(PRESENT_SOURCE, "custom_trigger").objectEditing?.propertyMutations)
      .toEqual([{
        kind: "trigger",
        sourceObjectId: "obj_trg_newgeneric",
        sourceIndex: 0,
        templateResRef: {
          expectedResRef: "newgeneric",
          resRef: "custom_trigger",
        },
      }]);
  });

  it("coalesces TemplateResRef and Tag into one immutable ordinal mutation", () => {
    const value = snapshot();
    const object = value.draft.payload.editableScene.objects[0] as any;
    object.tag = "CUSTOM_TRIGGER";
    object.source.triggerTag = { present: true, value: "GenericTrigger" };

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
      }]);
  });

  it("emits no mutation for an unchanged target or an untouched absent field", () => {
    expect(project(PRESENT_SOURCE, "newgeneric").objectEditing?.propertyMutations)
      .toBeUndefined();
    expect(project({ present: false }, undefined).objectEditing?.propertyMutations)
      .toBeUndefined();
  });

  it.each([
    ["absent source insertion", { present: false }, "custom_trigger"],
    ["malformed source", { present: true, nativeType: "resref" }, "custom_trigger"],
    ["uppercase target", PRESENT_SOURCE, "CUSTOM_TRIGGER"],
    ["invalid-character target", PRESENT_SOURCE, "custom-trigger"],
    ["overlength target", PRESENT_SOURCE, "abcdefghijklmnopq"],
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
    triggerTemplateResRef: "custom_trigger",
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
      triggerTemplateResRef: PRESENT_SOURCE,
    },
  });
  return value;
}

function project(source: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  object.source.triggerTemplateResRef = source;
  if (target === undefined) delete object.triggerTemplateResRef;
  else object.triggerTemplateResRef = target;
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
