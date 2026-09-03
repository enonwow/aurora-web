import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

const SOURCE = Object.freeze({
  onDisarm: "TRG_DISARM",
  onTrapTriggered: "trg_trapped",
  onClick: "",
  onHeartbeat: "trg_heartbeat",
  onEnter: "trg_enter",
  onExit: "trg_exit",
  onUserDefined: "trg_user",
});
const TARGET = Object.freeze({
  ...SOURCE,
  onDisarm: "trg_disarm_new",
  onClick: "trg_click",
});

describe("Area Update retained Trigger event-script projection", () => {
  it("projects one complete changed exact seven-field CAS tuple", () => {
    expect(project(SOURCE, TARGET).objectEditing?.propertyMutations).toEqual([{
      kind: "trigger",
      sourceObjectId: "obj_trg_newgeneric",
      sourceIndex: 0,
      scripts: { expectedValue: SOURCE, value: TARGET },
    }]);
  });

  it("emits no mutation for unchanged or absent preserve-only provenance", () => {
    expect(project(SOURCE, SOURCE).objectEditing?.propertyMutations).toBeUndefined();
    expect(project(undefined, undefined).objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["target without source", undefined, TARGET],
    ["partial source", { ...SOURCE, onUserDefined: undefined }, TARGET],
    ["uppercase target", SOURCE, { ...TARGET, onClick: "TRG_CLICK" }],
    ["partial target", SOURCE, { ...TARGET, onUserDefined: undefined }],
  ])("rejects %s", (_label, source, target) => {
    expect(() => project(source, target)).toThrow(AreaUpdateDraftProjectionError);
  });

  it("rejects Trigger script provenance on another object family", () => {
    const value = snapshot();
    const object = value.draft.payload.editableScene.objects[0] as any;
    object.source.sourceKind = "waypoint";
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
    triggerScriptResRefs: { ...TARGET },
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
      triggerScriptResRefsStorage: { ...SOURCE },
    },
  });
  return value;
}

function project(source: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  if (source === undefined) delete object.source.triggerScriptResRefsStorage;
  else object.source.triggerScriptResRefsStorage = source;
  if (target === undefined) delete object.triggerScriptResRefs;
  else object.triggerScriptResRefs = target;
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
