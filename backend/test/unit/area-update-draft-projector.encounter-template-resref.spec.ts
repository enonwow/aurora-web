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
  value: "x2_gnoll001",
} as const;

describe("Area Update retained Encounter TemplateResRef projection", () => {
  it("projects one exact changed native ResRef CAS", () => {
    expect(project(PRESENT_SOURCE, "custom_encounter").objectEditing?.propertyMutations)
      .toEqual([{
        kind: "encounter",
        sourceObjectId: "obj_enc_x2_gnoll001",
        sourceIndex: 0,
        templateResRef: {
          expectedResRef: "x2_gnoll001",
          resRef: "custom_encounter",
        },
      }]);
  });

  it("coalesces TemplateResRef and Tag into one immutable ordinal mutation", () => {
    const value = snapshot();
    const object = value.draft.payload.editableScene.objects[0] as any;
    object.tag = "CUSTOM_ENCOUNTER";
    object.source.encounterTag = { present: true, value: "X2_GNOLL001" };

    expect(projectAreaUpdateDraft(value, context()).objectEditing?.propertyMutations)
      .toEqual([{
        kind: "encounter",
        sourceObjectId: "obj_enc_x2_gnoll001",
        sourceIndex: 0,
        tag: { expectedValue: "X2_GNOLL001", value: "CUSTOM_ENCOUNTER" },
        templateResRef: {
          expectedResRef: "x2_gnoll001",
          resRef: "custom_encounter",
        },
      }]);
  });

  it("emits no mutation for an unchanged target or an untouched absent field", () => {
    expect(project(PRESENT_SOURCE, "x2_gnoll001").objectEditing?.propertyMutations)
      .toBeUndefined();
    expect(project({ present: false }, undefined).objectEditing?.propertyMutations)
      .toBeUndefined();
  });

  it.each([
    ["absent source insertion", { present: false }, "custom_encounter"],
    ["malformed source", { present: true, nativeType: "resref" }, "custom_encounter"],
    ["uppercase target", PRESENT_SOURCE, "CUSTOM_ENCOUNTER"],
    ["invalid-character target", PRESENT_SOURCE, "custom-encounter"],
    ["overlength target", PRESENT_SOURCE, "abcdefghijklmnopq"],
  ])("rejects %s", (_label, source, target) => {
    expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
  });
});

function snapshot() {
  const value = areaUpdateDraftProjectorSnapshot();
  (value.draft.payload.editableScene.objects as any[]).push({
    id: "area_crypt01:obj_enc_x2_gnoll001",
    kind: "encounters",
    resRef: "x2_gnoll001",
    tag: "X2_GNOLL001",
    encounterTemplateResRef: "custom_encounter",
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
      sourceObjectId: "obj_enc_x2_gnoll001",
      sourceKind: "encounter",
      sourceIndex: 0,
      encounterTemplateResRef: PRESENT_SOURCE,
    },
  });
  return value;
}

function project(source: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  object.source.encounterTemplateResRef = source;
  if (target === undefined) delete object.encounterTemplateResRef;
  else object.encounterTemplateResRef = target;
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
