import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

const SOURCE = Object.freeze({
  trapDetectable: 1,
  trapDetectDc: 0,
  trapDisarmable: 1,
  disarmDc: 15,
  trapFlag: 0,
  trapOneShot: 1,
  trapType: 0,
});
const TARGET = Object.freeze({
  trapDetectable: 0,
  trapDetectDc: 17,
  trapDisarmable: 0,
  disarmDc: 23,
  trapFlag: 1,
  trapOneShot: 0,
  trapType: 7,
});

describe("Area Update retained Trigger trap-properties projection", () => {
  it("projects one complete changed exact CAS tuple", () => {
    expect(project(SOURCE, TARGET).objectEditing?.propertyMutations).toEqual([{
      kind: "trigger",
      sourceObjectId: "obj_trg_newgeneric",
      sourceIndex: 0,
      trapProperties: { expectedValue: SOURCE, value: TARGET },
    }]);
  });

  it("emits no mutation for unchanged or absent preserve-only provenance", () => {
    expect(project(SOURCE, SOURCE).objectEditing?.propertyMutations).toBeUndefined();
    expect(project(undefined, undefined).objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["target without source", undefined, TARGET],
    ["partial source", { ...SOURCE, trapType: undefined }, TARGET],
    ["negative target", SOURCE, { ...TARGET, disarmDc: -1 }],
    ["partial target", SOURCE, { ...TARGET, trapFlag: undefined }],
  ])("rejects %s", (_label, source, target) => {
    expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
  });

  it("rejects Trigger trap provenance on another object family", () => {
    const value = snapshot();
    const object = value.draft.payload.editableScene.objects[0] as any;
    object.source.sourceKind = "door";
    expect(() => projectAreaUpdateDraft(value, context()))
      .toThrow(AreaUpdateDraftProjectionError);
  });
});

function snapshot() {
  const value = areaUpdateDraftProjectorSnapshot();
  (value.draft.payload.provenance as any).sourceGitSha256 = "b".repeat(64);
  (value.draft.payload.editableScene.objects as any[]).push({
    id: "area_crypt01:obj_trg_newgeneric",
    kind: "triggers",
    resRef: "newgeneric",
    tag: "GenericTrigger",
    triggerTrapProperties: { ...TARGET },
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
      triggerTrapProperties: { ...SOURCE },
    },
  });
  return value;
}

function project(source: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  if (source === undefined) delete object.source.triggerTrapProperties;
  else object.source.triggerTrapProperties = source;
  if (target === undefined) delete object.triggerTrapProperties;
  else object.triggerTrapProperties = target;
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
