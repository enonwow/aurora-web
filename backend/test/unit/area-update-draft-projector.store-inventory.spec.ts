import {
  AreaUpdateDraftProjectionError,
  projectAreaUpdateDraft,
} from "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
} from "../support/area-update-draft-projector-fixture";

const TABLE_SHA256 = "e".repeat(64);
const BUCKET_IDS = [0, 4, 2, 3, 1] as const;

describe("projectAreaUpdateDraft retained Store inventory", () => {
  it("projects removal, reorder, and Infinite changes as one exact catalog-bound CAS", () => {
    const snapshot = areaUpdateDraftProjectorSnapshot();
    const scene = (snapshot.draft.payload as Record<string, any>).editableScene;
    scene.itemBaseItemCatalog = catalog();
    scene.objects = [retainedStore(target([1, 0], true))];

    const mutation = project(snapshot).objectEditing?.propertyMutations?.[0] as any;
    expect(mutation).toEqual({
      kind: "store",
      sourceObjectId: "obj_store_dye",
      sourceIndex: 0,
      inventory: {
        ...provenance(),
        buckets: target([1, 0], true),
      },
    });
    expect(Object.isFrozen(mutation.inventory)).toBe(true);
    expect(Object.isFrozen(mutation.inventory.buckets[0].entries)).toBe(true);
  });

  it("omits an unchanged target", () => {
    const snapshot = areaUpdateDraftProjectorSnapshot();
    const scene = (snapshot.draft.payload as Record<string, any>).editableScene;
    scene.itemBaseItemCatalog = catalog();
    scene.objects = [retainedStore(target([0, 1], false))];
    expect(project(snapshot).objectEditing?.propertyMutations).toBeUndefined();
  });

  it("rejects a target without immutable source inventory provenance", () => {
    const snapshot = areaUpdateDraftProjectorSnapshot();
    const scene = (snapshot.draft.payload as Record<string, any>).editableScene;
    scene.itemBaseItemCatalog = catalog();
    const object = retainedStore(target([1], true));
    delete (object.source as Record<string, unknown>).storeInventory;
    scene.objects = [object];
    expect(() => project(snapshot)).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.0.source.storeInventory",
    } satisfies Partial<AreaUpdateDraftProjectionError>));
  });

  it.each([
    ["stale digest", {
      ...catalog(),
      descriptor: { ...catalog().descriptor, sha256: "f".repeat(64) },
    }],
    ["changed dimensions", {
      ...catalog(),
      rows: catalog().rows.map((row, index) => index === 0
        ? { ...row, invSlotWidth: 3 }
        : row),
    }],
  ])("rejects a changed inventory with %s", (_label, itemBaseItemCatalog) => {
    const snapshot = areaUpdateDraftProjectorSnapshot();
    const scene = (snapshot.draft.payload as Record<string, any>).editableScene;
    scene.itemBaseItemCatalog = itemBaseItemCatalog;
    scene.objects = [retainedStore(target([1], true))];
    expect(() => project(snapshot)).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.itemBaseItemCatalog",
    } satisfies Partial<AreaUpdateDraftProjectionError>));
  });

  it("rejects cross-bucket movement", () => {
    const snapshot = areaUpdateDraftProjectorSnapshot();
    const scene = (snapshot.draft.payload as Record<string, any>).editableScene;
    scene.itemBaseItemCatalog = catalog();
    const buckets = target([], false);
    buckets[1]!.entries = [{ sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: true }];
    scene.objects = [retainedStore(buckets)];
    expect(() => project(snapshot)).toThrow(expect.objectContaining({
      path: "draft.payload.editableScene.objects.0.storeProperties.inventoryBuckets",
    } satisfies Partial<AreaUpdateDraftProjectionError>));
  });
});

function project(snapshot = areaUpdateDraftProjectorSnapshot()) {
  return projectAreaUpdateDraft(snapshot, {
    areaResRef: "crypt01",
    draftId: "draft_01",
    draftRevision: 7,
    draftNormalizedSha256: AREA_UPDATE_DRAFT_HASH,
  });
}

function provenance() {
  return {
    expectedBuckets: [
      {
        bucketTypeId: 0,
        entries: [
          {
            sourceIndex: 0,
            resRef: "itm_a",
            baseItemId: 0,
            slotWidth: 2,
            slotHeight: 2,
            x: 0,
            y: 0,
            infinite: true,
          },
          {
            sourceIndex: 1,
            resRef: "itm_b",
            baseItemId: 1,
            slotWidth: 1,
            slotHeight: 3,
            x: 2,
            y: 0,
            infinite: false,
          },
        ],
      },
      ...BUCKET_IDS.slice(1).map((bucketTypeId) => ({ bucketTypeId, entries: [] })),
    ],
    tableSha256: TABLE_SHA256,
    tableRowCount: 2,
  };
}

function target(indices: number[], lastInfinite: boolean) {
  return BUCKET_IDS.map((bucketTypeId, bucketIndex) => ({
    bucketTypeId,
    entries: bucketIndex === 0
      ? indices.map((sourceIndex, index) => ({
          sourceIndex,
          resRef: sourceIndex === 0 ? "itm_a" : "itm_b",
          baseItemId: sourceIndex,
          infinite: index === indices.length - 1 ? lastInfinite : sourceIndex === 0,
        }))
      : [],
  }));
}

function retainedStore(inventoryBuckets: ReturnType<typeof target>) {
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
      storeInventory: provenance(),
    },
    storeProperties: { inventoryBuckets },
  };
}

function catalog() {
  return {
    descriptor: {
      resourceName: "baseitems.2da",
      sourceObjectKey: "modules/current/baseitems.2da",
      sourceLayer: "module",
      sha256: TABLE_SHA256,
      sizeBytes: 1_024,
      rowCount: 2,
    },
    rows: [
      { rowIndex: 0, modelType: 0, displayName: "Wide", invSlotWidth: 2, invSlotHeight: 2 },
      { rowIndex: 1, modelType: 1, displayName: "Tall", invSlotWidth: 1, invSlotHeight: 3 },
    ],
  };
}
