import { describe, expect, it } from "vitest";

import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

describe("cloneSceneObject retained Store inventory", () => {
  it("deep-clones provenance and target buckets", () => {
    const expectedBuckets = [
      {
        bucketTypeId: 0 as const,
        entries: [{
          sourceIndex: 0, resRef: "itm_a", baseItemId: 0,
          slotWidth: 1, slotHeight: 1, x: 0, y: 0, infinite: true,
        }],
      },
      { bucketTypeId: 4 as const, entries: [] },
      { bucketTypeId: 2 as const, entries: [] },
      { bucketTypeId: 3 as const, entries: [] },
      { bucketTypeId: 1 as const, entries: [] },
    ];
    const source: SceneObject = {
      id: "store:0",
      kind: "stores",
      resRef: "x2_merc_dye",
      tag: "STORE",
      x: 0,
      y: 0,
      z: 0,
      bearing: 0,
      visualTransform: {
        scale: 1, offsetX: 0, offsetY: 0, offsetZ: 0, pitch: 0, yaw: 0, roll: 0,
      },
      source: {
        type: "aurora_git",
        sourceKind: "store",
        sourceIndex: 0,
        storeInventory: {
          expectedBuckets,
          tableSha256: "e".repeat(64),
          tableRowCount: 1,
        },
      },
      storeProperties: {
        comments: "",
        inventoryBuckets: expectedBuckets.map((bucket) => ({
          bucketTypeId: bucket.bucketTypeId,
          entries: bucket.entries.map((entry) => ({
            sourceIndex: entry.sourceIndex,
            resRef: entry.resRef,
            baseItemId: entry.baseItemId,
            infinite: entry.infinite,
          })),
        })),
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned).toEqual(source);
    expect(cloned.source?.storeInventory).not.toBe(source.source?.storeInventory);
    expect(cloned.source?.storeInventory?.expectedBuckets)
      .not.toBe(source.source?.storeInventory?.expectedBuckets);
    expect(cloned.source?.storeInventory?.expectedBuckets[0]?.entries[0])
      .not.toBe(source.source?.storeInventory?.expectedBuckets[0]?.entries[0]);
    expect(cloned.storeProperties?.inventoryBuckets)
      .not.toBe(source.storeProperties?.inventoryBuckets);
    expect(cloned.storeProperties?.inventoryBuckets?.[0]?.entries[0])
      .not.toBe(source.storeProperties?.inventoryBuckets?.[0]?.entries[0]);
  });
});
