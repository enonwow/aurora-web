import {
  AREA_STORE_INVENTORY_BUCKET_TYPE_IDS,
  bindEffectiveBaseItemsTwoDaToStoreInventory,
  packAreaStoreInventoryBuckets,
  readAreaStoreInventoryRawStorage,
  readExistingAreaStoreInventoryMutation,
} from "../../src/modules/areas/domain/area-store-inventory";

describe("Area Store retained inventory domain", () => {
  it("admits the exact five-bucket native source and binds immutable slot dimensions", () => {
    const raw = source();
    expect(readAreaStoreInventoryRawStorage(raw)).toEqual(raw);

    expect(bindEffectiveBaseItemsTwoDaToStoreInventory(raw, table())).toEqual({
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
        { bucketTypeId: 4, entries: [] },
        { bucketTypeId: 2, entries: [] },
        { bucketTypeId: 3, entries: [] },
        { bucketTypeId: 1, entries: [] },
      ],
      tableSha256: "a".repeat(64),
      tableRowCount: 2,
    });
  });

  it.each([
    ["wrong bucket count", { buckets: source().buckets.slice(0, 4) }],
    ["wrong bucket order", { buckets: [source().buckets[1], source().buckets[0], ...source().buckets.slice(2)] }],
    ["non-sequential source index", replaceFirst({ sourceIndex: 2 })],
    ["invalid resref", replaceFirst({ resRef: "bad-resref" })],
    ["invalid base item", replaceFirst({ baseItemId: -1 })],
    ["invalid coordinate", replaceFirst({ x: 65_536 })],
    ["unknown entry key", replaceFirst({ drift: true })],
  ])("rejects %s", (_label, value) => {
    expect(readAreaStoreInventoryRawStorage(value)).toBeNull();
  });

  it("keeps source preserve-only when the effective row has no exact positive in-grid dimensions", () => {
    const invalid = table();
    const rows = invalid.rows.map((row, index) => index === 0
      ? { ...row, invSlotWidth: undefined }
      : row);
    expect(bindEffectiveBaseItemsTwoDaToStoreInventory(source(), {
      ...invalid,
      rows,
    })).toBeNull();
    expect(bindEffectiveBaseItemsTwoDaToStoreInventory(source(), {
      ...invalid,
      rows: invalid.rows.map((row, index) => index === 0
        ? { ...row, invSlotHeight: 11 }
        : row),
    })).toBeNull();
  });

  it("admits removal, in-bucket reorder, and Infinite changes as one exact CAS", () => {
    const provenance = bindEffectiveBaseItemsTwoDaToStoreInventory(source(), table())!;
    const mutation = readExistingAreaStoreInventoryMutation({
      ...provenance,
      buckets: [
        {
          bucketTypeId: 0,
          entries: [{
            sourceIndex: 1,
            resRef: "itm_b",
            baseItemId: 1,
            infinite: true,
          }],
        },
        { bucketTypeId: 4, entries: [] },
        { bucketTypeId: 2, entries: [] },
        { bucketTypeId: 3, entries: [] },
        { bucketTypeId: 1, entries: [] },
      ],
    });
    expect(mutation?.buckets[0]?.entries).toEqual([{
      sourceIndex: 1,
      resRef: "itm_b",
      baseItemId: 1,
      infinite: true,
    }]);
  });

  it.each([
    ["unchanged", (p: any) => p.expectedBuckets.map((bucket: any) => ({
      bucketTypeId: bucket.bucketTypeId,
      entries: bucket.entries.map((entry: any) => ({
        sourceIndex: entry.sourceIndex,
        resRef: entry.resRef,
        baseItemId: entry.baseItemId,
        infinite: entry.infinite,
      })),
    }))],
    ["duplicate source", (p: any) => target(p, [0, 0])],
    ["identity change", (p: any) => target(p, [0], { resRef: "itm_changed" })],
    ["base item change", (p: any) => target(p, [0], { baseItemId: 1 })],
    ["cross-bucket move", (p: any) => {
      const buckets = target(p, []);
      buckets[1] = {
        bucketTypeId: 4,
        entries: [{ sourceIndex: 0, resRef: "itm_a", baseItemId: 0, infinite: true }],
      };
      return buckets;
    }],
  ])("rejects %s target state", (_label, build) => {
    const provenance = bindEffectiveBaseItemsTwoDaToStoreInventory(source(), table())!;
    expect(readExistingAreaStoreInventoryMutation({
      ...provenance,
      buckets: build(provenance),
    })).toBeNull();
  });

  it("packs target order row-major and advances to the next 10-by-10 page", () => {
    const sourceEntries = Array.from({ length: 51 }, (_, sourceIndex) => ({
      sourceIndex,
      resRef: `itm_${sourceIndex}`,
      baseItemId: 0,
      slotWidth: 2,
      slotHeight: 1,
      x: (sourceIndex % 5) * 2,
      y: Math.floor(sourceIndex / 5),
      infinite: false,
    }));
    const expectedBuckets = AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.map((bucketTypeId, index) => ({
      bucketTypeId,
      entries: index === 0 ? sourceEntries : [],
    }));
    const buckets = AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.map((bucketTypeId, index) => ({
      bucketTypeId,
      entries: index === 0
        ? sourceEntries.map(({ sourceIndex, resRef, baseItemId, infinite }) => ({
            sourceIndex,
            resRef,
            baseItemId,
            infinite,
          }))
        : [],
    }));

    const packed = packAreaStoreInventoryBuckets(expectedBuckets, buckets);
    expect(packed?.[0]?.entries.slice(0, 6).map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 4, y: 0 },
      { x: 6, y: 0 },
      { x: 8, y: 0 },
      { x: 0, y: 1 },
    ]);
    expect(packed?.[0]?.entries[50]).toMatchObject({ x: 0, y: 10 });
  });
});

function source() {
  return {
    buckets: [
      {
        bucketTypeId: 0,
        entries: [
          { sourceIndex: 0, resRef: "itm_a", baseItemId: 0, x: 0, y: 0, infinite: true },
          { sourceIndex: 1, resRef: "itm_b", baseItemId: 1, x: 2, y: 0, infinite: false },
        ],
      },
      { bucketTypeId: 4, entries: [] },
      { bucketTypeId: 2, entries: [] },
      { bucketTypeId: 3, entries: [] },
      { bucketTypeId: 1, entries: [] },
    ],
  };
}

function replaceFirst(replacement: Record<string, unknown>) {
  const value = source();
  value.buckets[0]!.entries[0] = {
    ...value.buckets[0]!.entries[0]!,
    ...replacement,
  } as any;
  return value;
}

function table() {
  return {
    descriptor: {
      resourceName: "baseitems.2da",
      sourceObjectKey: "module/baseitems.2da",
      sourceLayer: "module",
      sha256: "a".repeat(64),
      sizeBytes: 512,
      rowCount: 2,
    },
    rows: [
      { rowIndex: 0, modelType: 0, displayName: "Wide", invSlotWidth: 2, invSlotHeight: 2 },
      { rowIndex: 1, modelType: 0, displayName: "Tall", invSlotWidth: 1, invSlotHeight: 3 },
    ],
  };
}

function target(
  provenance: any,
  sourceIndices: number[],
  replacement: Record<string, unknown> = {},
) {
  return AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.map((bucketTypeId, bucketIndex) => ({
    bucketTypeId,
    entries: bucketIndex === 0
      ? sourceIndices.map((sourceIndex) => {
          const sourceEntry = provenance.expectedBuckets[0].entries[sourceIndex];
          return {
            sourceIndex,
            resRef: sourceEntry?.resRef ?? "itm_a",
            baseItemId: sourceEntry?.baseItemId ?? 0,
            infinite: sourceEntry?.infinite ?? false,
            ...replacement,
          };
        })
      : [],
  }));
}
