import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

const SOURCE = Object.freeze({
  autoRemoveKey: 0,
  factionId: 1,
  cursorId: 0,
  highlightHeight: Math.fround(0),
  keyName: "",
  portraitId: 0,
  triggerType: 0,
});
const TARGET = Object.freeze({
  autoRemoveKey: 1,
  factionId: 2,
  cursorId: 3,
  highlightHeight: Math.fround(1.5),
  keyName: "gate_key",
  portraitId: 4,
  triggerType: 1,
});

describe("Area Update retained Trigger core-properties projection", () => {
  it("projects one complete changed exact CAS tuple", () => {
    expect(project(SOURCE, TARGET).objectEditing?.propertyMutations).toEqual([{
      kind: "trigger",
      sourceObjectId: "obj_trg_newgeneric",
      sourceIndex: 0,
      coreProperties: { expectedValue: SOURCE, value: TARGET },
    }]);
  });

  it("emits no mutation for unchanged or absent preserve-only provenance", () => {
    expect(project(SOURCE, SOURCE).objectEditing?.propertyMutations).toBeUndefined();
    expect(project(undefined, undefined).objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["target without source", undefined, TARGET],
    ["partial source", { ...SOURCE, portraitId: undefined }, TARGET],
    ["non-f32 target", SOURCE, { ...TARGET, highlightHeight: 1.1 }],
    ["partial target", SOURCE, { ...TARGET, factionId: undefined }],
  ])("rejects %s", (_label, source, target) => {
    expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
  });

  it("rejects Trigger core provenance on another object family", () => {
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
    triggerCoreProperties: { ...TARGET },
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
      triggerCoreProperties: { ...SOURCE },
    },
  });
  return value;
}

function project(source: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  if (source === undefined) delete object.source.triggerCoreProperties;
  else object.source.triggerCoreProperties = source;
  if (target === undefined) delete object.triggerCoreProperties;
  else object.triggerCoreProperties = target;
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
