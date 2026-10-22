import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

describe("Area Update retained Trigger VarTable projection", () => {
  it("projects one exact changed complete ordered table", () => {
    expect(project(source(), [{ name: "label", type: "string", value: "north" }])
      .objectEditing?.propertyMutations).toEqual([{
      kind: "trigger",
      sourceObjectId: "obj_trg_newgeneric",
      sourceIndex: 0,
      variables: {
        expectedEntries: source().expectedEntries,
        entries: [{ name: "label", type: "string", value: "north" }],
      },
    }]);
  });

  it("emits no mutation for an unchanged table", () => {
    expect(project(source(), [{ name: "counter", type: "int", value: 1 }])
      .objectEditing?.propertyMutations).toBeUndefined();
  });

  it.each([
    ["missing source", undefined, [{ name: "counter", type: "int", value: 2 }]],
    ["noncontiguous source", { expectedEntries: [
      { sourceIndex: 1, name: "counter", type: "int", value: 1 },
    ] }, [{ name: "counter", type: "int", value: 2 }]],
    ["missing target", source(), undefined],
    ["unsupported float", source(), [{ name: "counter", type: "float", value: 0.1 }]],
  ])("rejects %s", (_label, provenance, target) => {
    expect(() => project(provenance, target)).toThrow(AreaUpdateDraftProjectionError);
  });

  it("rejects Trigger variables on another retained family", () => {
    const value = snapshot();
    (value.draft.payload.editableScene.objects[0] as any).source.sourceKind = "door";
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
    triggerVariables: [{ name: "label", type: "string", value: "north" }],
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
      triggerVariables: source(),
    },
  });
  return value;
}

function project(provenance: unknown, target: unknown) {
  const value = snapshot();
  const object = value.draft.payload.editableScene.objects[0] as any;
  if (provenance === undefined) delete object.source.triggerVariables;
  else object.source.triggerVariables = provenance;
  if (target === undefined) delete object.triggerVariables;
  else object.triggerVariables = target;
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

function source() {
  return {
    expectedEntries: [{ sourceIndex: 0, name: "counter", type: "int", value: 1 }],
  };
}
