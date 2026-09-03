import { describe, expect, it } from "vitest";

import {
  areStorePropertiesDraftsEqual,
  buildStorePropertiesDraft,
  materializeStorePropertiesDraft,
} from "../../../../../src/modules/layout/application/storePropertiesDraft";
import type { SceneObject } from "../../../../../src/modules/scene/contracts";

function storeObject(): SceneObject {
  const commerce = {
    markUp: 100,
    markDown: 65,
    blackMarket: false,
    blackMarketMarkDown: 25,
    identifyPrice: 100,
    maxBuyPrice: -1,
    storeGold: -1,
  };
  return {
    id: "area:store:0",
    kind: "stores",
    resRef: "x2_merc_dye",
    tag: "STORE_DYE",
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
      roll: 0,
      yaw: 0,
    },
    source: {
      type: "aurora_git",
      sourceKind: "store",
      sourceIndex: 0,
      sourceObjectId: "store:0:x2_merc_dye",
      storeEditorComment: "  source note  ",
      storeCommerce: commerce,
      storeScriptResRefs: {
        onOpenStore: "store_open",
        onStoreClosed: "store_closed",
      },
      storeVariables: { expectedEntries: [
        { sourceIndex: 0, name: "Counter", type: "int", value: 1 },
      ] },
    },
    storeProperties: {
      comments: "  source note  ",
      commerce: { ...commerce },
      scriptResRefs: {
        onOpenStore: "store_open",
        onStoreClosed: "store_closed",
      },
      variables: [{ name: "Counter", type: "int", value: 1 }],
    },
  };
}

const itemBaseItemCatalog = {
  descriptor: {
    resourceName: "baseitems.2da" as const,
    sourceObjectKey: "modules/current/baseitems.2da",
    sourceLayer: "module" as const,
    sha256: "e".repeat(64),
    sizeBytes: 4096,
    rowCount: 4,
  },
  rows: Array.from({ length: 4 }, (_, rowIndex) => ({
    rowIndex,
    modelType: 0 as const,
    displayName: `Base item ${rowIndex}`,
    invSlotWidth: 1,
    invSlotHeight: 1,
  })),
};

function storeRestrictionsObject(): SceneObject {
  const store = storeObject();
  store.source = {
    ...store.source!,
    storeRestrictions: {
      expectedValue: {
        willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
        willOnlyBuy: { present: false, baseItemIds: [] },
      },
      tableSha256: "e".repeat(64),
      tableRowCount: 4,
    },
  };
  store.storeProperties = {
    ...store.storeProperties!,
    restrictions: { willNotBuy: [2, 1, 2], willOnlyBuy: [] },
  };
  return store;
}

function storeInventoryObject(): SceneObject {
  const store = storeObject();
  const expectedBuckets = [
    {
      bucketTypeId: 0 as const,
      entries: [
        {
          sourceIndex: 0,
          resRef: "itm_a",
          baseItemId: 0,
          slotWidth: 1,
          slotHeight: 1,
          x: 0,
          y: 0,
          infinite: true,
        },
        {
          sourceIndex: 1,
          resRef: "itm_b",
          baseItemId: 1,
          slotWidth: 1,
          slotHeight: 1,
          x: 1,
          y: 0,
          infinite: false,
        },
      ],
    },
    { bucketTypeId: 4 as const, entries: [] },
    { bucketTypeId: 2 as const, entries: [] },
    { bucketTypeId: 3 as const, entries: [] },
    { bucketTypeId: 1 as const, entries: [] },
  ];
  store.source = {
    ...store.source!,
    storeInventory: {
      expectedBuckets,
      tableSha256: "e".repeat(64),
      tableRowCount: 4,
    },
  };
  store.storeProperties = {
    ...store.storeProperties!,
    inventoryBuckets: expectedBuckets.map((bucket) => ({
      bucketTypeId: bucket.bucketTypeId,
      entries: bucket.entries.map((entry) => ({
        sourceIndex: entry.sourceIndex,
        resRef: entry.resRef,
        baseItemId: entry.baseItemId,
        infinite: entry.infinite,
      })),
    })),
  };
  return store;
}

describe("storePropertiesDraft", () => {
  it("materializes only the exact evidence-backed Store Comment target", () => {
    const source = storeObject();
    const draft = buildStorePropertiesDraft(source);

    expect(draft).toEqual({
      commentControlState: "ACTIVE_NOW",
      commerceControlState: "ACTIVE_NOW",
      scriptControlState: "ACTIVE_NOW",
      variableControlState: "ACTIVE_NOW",
      restrictionControlState: "PRESERVE_ONLY",
      inventoryControlState: "PRESERVE_ONLY",
      comments: "  source note  ",
      commerce: source.storeProperties?.commerce,
      scriptResRefs: source.storeProperties?.scriptResRefs,
      variables: source.storeProperties?.variables,
      restrictions: null,
      inventoryBuckets: null,
    });

    const changed = materializeStorePropertiesDraft(source, {
      ...draft,
      comments: "  changed\r\nnote  ",
    });
    expect(changed).not.toBe(source);
    expect(changed.source).toEqual(source.source);
    expect(changed.source).not.toBe(source.source);
    expect(changed.storeProperties).toEqual({
      comments: "  changed\r\nnote  ",
      commerce: source.storeProperties?.commerce,
      scriptResRefs: source.storeProperties?.scriptResRefs,
      variables: source.storeProperties?.variables,
    });
    expect(changed.storeProperties).not.toBe(source.storeProperties);
    expect(areStorePropertiesDraftsEqual(
      buildStorePropertiesDraft(changed),
      { ...draft, comments: "  changed\r\nnote  " },
    )).toBe(true);
  });

  it("materializes a complete Store commerce target without changing immutable provenance", () => {
    const source = storeObject();
    const draft = buildStorePropertiesDraft(source);
    const commerce = {
      ...draft.commerce!,
      markUp: 125,
      blackMarket: true,
      maxBuyPrice: 5000,
      storeGold: 20000,
    };

    const changed = materializeStorePropertiesDraft(source, { ...draft, commerce });

    expect(changed.source).toEqual(source.source);
    expect(changed.source?.storeCommerce).not.toBe(source.source?.storeCommerce);
    expect(changed.storeProperties).toEqual({
      comments: "  source note  ",
      commerce,
      scriptResRefs: source.storeProperties?.scriptResRefs,
      variables: source.storeProperties?.variables,
    });
    expect(changed.storeProperties?.commerce).not.toBe(commerce);
    expect(areStorePropertiesDraftsEqual(
      buildStorePropertiesDraft(changed),
      { ...draft, commerce },
    )).toBe(true);
  });

  it("materializes a complete canonical Store script pair without changing immutable provenance", () => {
    const source = storeObject();
    const draft = buildStorePropertiesDraft(source);
    const scriptResRefs = {
      onOpenStore: "nw_store_open",
      onStoreClosed: "nw_store_close",
    };

    const changed = materializeStorePropertiesDraft(source, { ...draft, scriptResRefs });

    expect(changed.source).toEqual(source.source);
    expect(changed.source?.storeScriptResRefs).not.toBe(source.source?.storeScriptResRefs);
    expect(changed.storeProperties?.scriptResRefs).toStrictEqual(scriptResRefs);
    expect(changed.storeProperties?.scriptResRefs).not.toBe(scriptResRefs);
    expect(areStorePropertiesDraftsEqual(
      buildStorePropertiesDraft(changed),
      { ...draft, scriptResRefs },
    )).toBe(true);
  });

  it("materializes one complete ordered Store VarTable without changing immutable provenance", () => {
    const source = storeObject();
    const draft = buildStorePropertiesDraft(source);
    const variables = [
      { name: "Label", type: "string" as const, value: "ready" },
      { name: "Counter", type: "int" as const, value: 2 },
    ];

    const changed = materializeStorePropertiesDraft(source, { ...draft, variables });

    expect(changed.source).toEqual(source.source);
    expect(changed.source?.storeVariables).not.toBe(source.source?.storeVariables);
    expect(changed.storeProperties?.variables).toStrictEqual(variables);
    expect(changed.storeProperties?.variables).not.toBe(variables);
    expect(areStorePropertiesDraftsEqual(
      buildStorePropertiesDraft(changed),
      { ...draft, variables },
    )).toBe(true);
  });

  it.each([
    ["missing provenance", { source: undefined }],
    ["wrong family", { source: { ...storeObject().source, sourceKind: "item" as const } }],
    ["invalid target", { target: "bad\u0000comment" }],
  ])("preserves the source for %s", (_label, fixture) => {
    const source = { ...storeObject(), ...fixture };
    const draft = buildStorePropertiesDraft(source);
    const target = fixture.target ?? "must not be admitted";
    const result = materializeStorePropertiesDraft(source, { ...draft, comments: target });

    expect(result).toEqual(source);
    expect(result).not.toBe(source);
    if (fixture.target === undefined) {
      expect(draft.commentControlState).toBe("PRESERVE_ONLY");
      expect(draft.commerceControlState).toBe("PRESERVE_ONLY");
      expect(draft.scriptControlState).toBe("PRESERVE_ONLY");
      expect(draft.variableControlState).toBe("PRESERVE_ONLY");
      expect(draft.restrictionControlState).toBe("PRESERVE_ONLY");
      expect(draft.inventoryControlState).toBe("PRESERVE_ONLY");
    }
  });

  it("keeps malformed or provenance-free commerce preserve-only", () => {
    const source = storeObject();
    source.source = { ...source.source, storeCommerce: undefined };
    source.storeProperties = {
      comments: "  source note  ",
      commerce: { ...storeObject().storeProperties!.commerce!, markUp: 1.5 },
    };

    const draft = buildStorePropertiesDraft(source);
    const result = materializeStorePropertiesDraft(source, {
      ...draft,
      commerceControlState: "ACTIVE_NOW",
      commerce: storeObject().storeProperties!.commerce!,
    });

    expect(draft.commerceControlState).toBe("PRESERVE_ONLY");
    expect(draft.commerce).toBeNull();
    expect(result).toEqual(source);
  });

  it("keeps malformed or provenance-free Store script pairs preserve-only", () => {
    const source = storeObject();
    source.source = { ...source.source, storeScriptResRefs: undefined };
    source.storeProperties = {
      ...source.storeProperties!,
      scriptResRefs: { onOpenStore: "UPPERCASE", onStoreClosed: "" },
    };

    const draft = buildStorePropertiesDraft(source);
    const result = materializeStorePropertiesDraft(source, {
      ...draft,
      scriptControlState: "ACTIVE_NOW",
      scriptResRefs: { onOpenStore: "nw_store_open", onStoreClosed: "nw_store_close" },
    });

    expect(draft.scriptControlState).toBe("PRESERVE_ONLY");
    expect(draft.scriptResRefs).toBeNull();
    expect(result).toEqual(source);
  });

  it("keeps malformed or provenance-free Store VarTables preserve-only", () => {
    const source = storeObject();
    source.source = { ...source.source, storeVariables: undefined };
    source.storeProperties = {
      ...source.storeProperties!,
      variables: [{ name: "Scale", type: "float", value: 0.1 }],
    };

    const draft = buildStorePropertiesDraft(source);
    const result = materializeStorePropertiesDraft(source, {
      ...draft,
      variableControlState: "ACTIVE_NOW",
      variables: [{ name: "Counter", type: "int", value: 2 }],
    });

    expect(draft.variableControlState).toBe("PRESERVE_ONLY");
    expect(draft.variables).toBeNull();
    expect(result).toEqual(source);
  });

  it("materializes catalog-bound Store restriction lists with order and duplicates intact", () => {
    const source = storeRestrictionsObject();
    const draft = buildStorePropertiesDraft(source, itemBaseItemCatalog);
    const restrictions = { willNotBuy: [1, 2, 1], willOnlyBuy: [0, 0] };

    expect(draft.restrictionControlState).toBe("ACTIVE_NOW");
    expect(draft.restrictions).toStrictEqual({ willNotBuy: [2, 1, 2], willOnlyBuy: [] });

    const changed = materializeStorePropertiesDraft(
      source,
      { ...draft, restrictions },
      itemBaseItemCatalog,
    );

    expect(changed.source).toEqual(source.source);
    expect(changed.source?.storeRestrictions).not.toBe(source.source?.storeRestrictions);
    expect(changed.storeProperties?.restrictions).toStrictEqual(restrictions);
    expect(changed.storeProperties?.restrictions).not.toBe(restrictions);
    expect(changed.storeProperties?.restrictions?.willNotBuy).not.toBe(restrictions.willNotBuy);
    expect(areStorePropertiesDraftsEqual(
      buildStorePropertiesDraft(changed, itemBaseItemCatalog),
      { ...draft, restrictions },
    )).toBe(true);
  });

  it.each([
    ["missing catalog", undefined, itemBaseItemCatalog],
    ["stale catalog", {
      ...itemBaseItemCatalog,
      descriptor: { ...itemBaseItemCatalog.descriptor, sha256: "f".repeat(64) },
    }, itemBaseItemCatalog],
    ["out-of-catalog target", itemBaseItemCatalog, itemBaseItemCatalog],
  ])("keeps Store restrictions preserve-only for %s", (_label, draftCatalog, writeCatalog) => {
    const source = storeRestrictionsObject();
    const draft = buildStorePropertiesDraft(source, draftCatalog);
    const result = materializeStorePropertiesDraft(source, {
      ...draft,
      restrictionControlState: "ACTIVE_NOW",
      restrictions: { willNotBuy: [4], willOnlyBuy: [] },
    }, writeCatalog);

    if (_label !== "out-of-catalog target") {
      expect(draft.restrictionControlState).toBe("PRESERVE_ONLY");
      expect(draft.restrictions).toBeNull();
    }
    expect(result).toEqual(source);
  });

  it("materializes retained Store inventory reorder, removal, and Infinite state", () => {
    const source = storeInventoryObject();
    const draft = buildStorePropertiesDraft(source, itemBaseItemCatalog);
    const inventoryBuckets = draft.inventoryBuckets!.map((bucket, index) => index === 0
      ? {
          ...bucket,
          entries: [{ ...bucket.entries[1]!, infinite: true }],
        }
      : bucket);

    expect(draft.inventoryControlState).toBe("ACTIVE_NOW");
    const changed = materializeStorePropertiesDraft(
      source,
      { ...draft, inventoryBuckets },
      itemBaseItemCatalog,
    );

    expect(changed.source).toEqual(source.source);
    expect(changed.source?.storeInventory).not.toBe(source.source?.storeInventory);
    expect(changed.storeProperties?.inventoryBuckets).toEqual(inventoryBuckets);
    expect(changed.storeProperties?.inventoryBuckets).not.toBe(inventoryBuckets);
    expect(areStorePropertiesDraftsEqual(
      buildStorePropertiesDraft(changed, itemBaseItemCatalog),
      { ...draft, inventoryBuckets },
    )).toBe(true);
  });

  it.each([
    ["missing catalog", undefined],
    ["stale dimensions", {
      ...itemBaseItemCatalog,
      rows: itemBaseItemCatalog.rows.map((row, index) => index === 0
        ? { ...row, invSlotWidth: 2 }
        : row),
    }],
  ])("keeps retained Store inventory preserve-only for %s", (_label, catalog) => {
    const source = storeInventoryObject();
    const draft = buildStorePropertiesDraft(source, catalog);

    expect(draft.inventoryControlState).toBe("PRESERVE_ONLY");
    expect(draft.inventoryBuckets).toBeNull();
    expect(materializeStorePropertiesDraft(source, {
      ...draft,
      inventoryControlState: "ACTIVE_NOW",
      inventoryBuckets: source.storeProperties!.inventoryBuckets!,
    }, catalog)).toEqual(source);
  });

  it("rejects retained Store inventory identity edits", () => {
    const source = storeInventoryObject();
    const draft = buildStorePropertiesDraft(source, itemBaseItemCatalog);
    const inventoryBuckets = draft.inventoryBuckets!.map((bucket, index) => index === 0
      ? {
          ...bucket,
          entries: bucket.entries.map((entry, entryIndex) => entryIndex === 0
            ? { ...entry, resRef: "different" }
            : entry),
        }
      : bucket);

    expect(materializeStorePropertiesDraft(
      source,
      { ...draft, inventoryBuckets },
      itemBaseItemCatalog,
    )).toEqual(source);
  });
});
