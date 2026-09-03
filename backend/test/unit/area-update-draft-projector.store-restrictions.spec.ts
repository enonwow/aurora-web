import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

const TABLE_SHA256 = "e".repeat(64);

function itemBaseItemCatalog() {
  return {
    descriptor: {
      resourceName: "baseitems.2da",
      sourceObjectKey: "modules/current/baseitems.2da",
      sourceLayer: "module",
      sha256: TABLE_SHA256,
      sizeBytes: 1_024,
      rowCount: 4,
    },
    rows: [
      { rowIndex: 0, modelType: 0, displayName: "Simple" },
      { rowIndex: 1, modelType: 1, displayName: "Weapon" },
      { rowIndex: 2, modelType: 2, displayName: "Armor" },
      { rowIndex: 3, modelType: 3, displayName: "Composite" },
    ],
  };
}

function sourceRestrictions() {
  return {
    expectedValue: {
      willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
      willOnlyBuy: { present: false, baseItemIds: [] },
    },
    tableSha256: TABLE_SHA256,
    tableRowCount: 4,
  };
}

function retainedStore(
  target = { willNotBuy: [2, 1, 2], willOnlyBuy: [] as number[] },
) {
  return {
    id: "area_crypt01:obj_store_dye",
    kind: "stores",
    resRef: "store_dye",
    tag: "STORE_DYE",
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    source: {
      type: "aurora_git",
      areaId: "area_crypt01",
      sourceObjectId: "obj_store_dye",
      sourceKind: "store",
      sourceIndex: 0,
      storeRestrictions: sourceRestrictions(),
    },
    storeProperties: { restrictions: target },
  };
}

function project(snapshot = areaUpdateDraftProjectorSnapshot()) {
  return projectAreaUpdateDraft(snapshot, {
    areaResRef: "crypt01",
    draftId: "draft_01",
    draftRevision: 7,
    draftNormalizedSha256: AREA_UPDATE_DRAFT_HASH,
  });
}

describe("projectAreaUpdateDraft retained Store restrictions", () => {
  it("projects one exact catalog-bound ordered pair while retaining duplicates and presence", () => {
    const snapshot = areaUpdateDraftProjectorSnapshot();
    const scene = (snapshot.draft.payload as Record<string, any>).editableScene;
    scene.itemBaseItemCatalog = itemBaseItemCatalog();
    scene.objects = [retainedStore({ willNotBuy: [1, 2, 1], willOnlyBuy: [0, 0] })];

    const mutation = project(snapshot).objectEditing?.propertyMutations?.[0] as any;

    expect(mutation).toEqual({
      kind: "store",
      sourceObjectId: "obj_store_dye",
      sourceIndex: 0,
      restrictions: {
        expectedValue: {
          willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
          willOnlyBuy: { present: false, baseItemIds: [] },
        },
        value: { willNotBuy: [1, 2, 1], willOnlyBuy: [0, 0] },
        tableSha256: TABLE_SHA256,
        tableRowCount: 4,
      },
    });
    expect(Object.isFrozen(mutation.restrictions)).toBe(true);
    expect(Object.isFrozen(mutation.restrictions.expectedValue.willNotBuy.baseItemIds))
      .toBe(true);
    expect(Object.isFrozen(mutation.restrictions.value.willOnlyBuy)).toBe(true);
  });

  it("omits an unchanged exact ordered pair", () => {
    const snapshot = areaUpdateDraftProjectorSnapshot();
    const scene = (snapshot.draft.payload as Record<string, any>).editableScene;
    scene.itemBaseItemCatalog = itemBaseItemCatalog();
    scene.objects = [retainedStore()];

    expect(project(snapshot).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("rejects a target without immutable source restrictions provenance", () => {
    const snapshot = areaUpdateDraftProjectorSnapshot();
    const scene = (snapshot.draft.payload as Record<string, any>).editableScene;
    scene.itemBaseItemCatalog = itemBaseItemCatalog();
    const object = retainedStore({ willNotBuy: [1], willOnlyBuy: [] });
    delete (object.source as Record<string, unknown>).storeRestrictions;
    scene.objects = [object];

    expect(() => project(snapshot)).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.0.source.storeRestrictions",
    } satisfies Partial<AreaUpdateDraftProjectionError>));
  });

  it.each([
    ["missing catalog", undefined],
    ["stale catalog", {
      ...itemBaseItemCatalog(),
      descriptor: { ...itemBaseItemCatalog().descriptor, sha256: "f".repeat(64) },
    }],
  ])("rejects a changed pair with %s", (_label, catalog) => {
    const snapshot = areaUpdateDraftProjectorSnapshot();
    const scene = (snapshot.draft.payload as Record<string, any>).editableScene;
    if (catalog) scene.itemBaseItemCatalog = catalog;
    scene.objects = [retainedStore({ willNotBuy: [1], willOnlyBuy: [] })];

    expect(() => project(snapshot)).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.itemBaseItemCatalog",
    } satisfies Partial<AreaUpdateDraftProjectionError>));
  });

  it("rejects a target row outside the exact bound catalog", () => {
    const snapshot = areaUpdateDraftProjectorSnapshot();
    const scene = (snapshot.draft.payload as Record<string, any>).editableScene;
    scene.itemBaseItemCatalog = itemBaseItemCatalog();
    scene.objects = [retainedStore({ willNotBuy: [4], willOnlyBuy: [] })];

    expect(() => project(snapshot)).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.0.storeProperties.restrictions",
    } satisfies Partial<AreaUpdateDraftProjectionError>));
  });
});
