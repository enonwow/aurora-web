import { describe, expect, it, vi } from "vitest";
import { HttpStoreApiPort } from "../../../../src/modules/stores/adapters/httpStoreApiPort";

describe("HttpStoreApiPort", () => {
  it("lists Aurora UTM store templates through the backend catalog", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                templateId: "store_nw_storemagic001",
                resref: "nw_storemagic001",
                name: "Magic Store",
                category: "Stores",
                tags: ["store"],
                previewImageUrl: "",
                metadata: {
                  templateResRef: "nw_storemagic001",
                  tag: "magic_shop",
                  markUp: 110,
                  markDown: 40,
                  storeListCount: 5,
                  storeItemListTotal: 136
                }
              }
            ],
            total: 1,
            limit: 25,
            offset: 0
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpStoreApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.listStores("token-123", { limit: 25, offset: 0 });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/stores?limit=25&offset=0",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token-123"
        }
      }
    );
    expect(result.items[0]).toMatchObject({
      templateId: "store_nw_storemagic001",
      resref: "nw_storemagic001",
      metadata: {
        storeListCount: 5,
        storeItemListTotal: 136
      }
    });
  });

  it("gets a typed store preview payload", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            templateId: "store_nw_storemagic001",
            resref: "nw_storemagic001",
            name: "Magic Store",
            category: "Stores",
            tags: ["store"],
            previewImageUrl: "",
            metadata: {},
            kind: "store",
            benchmarkCandidate: true,
            benchmarkBucket: "retail"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpStoreApiPort(fetchFn, "https://aurora.test/api/v1");

    await expect(port.getStorePreview("token-123", "store_nw_storemagic001")).resolves.toMatchObject({
      kind: "store",
      benchmarkCandidate: true,
      benchmarkBucket: "retail"
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/stores/store_nw_storemagic001/preview",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token-123"
        }
      }
    );
  });

  it("creates module-backed UTM store blueprints", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            blueprint: {
              templateId: "str_custom_store_001",
              resref: "custom_store_001",
              name: "Custom Store",
              objectKey: "modules/current/custom_store_001.utm",
              sizeBytes: 512,
              etag: "etag-store",
              sourceFileType: "UTM ",
              sourceFileVersion: "V3.2"
            },
            store: {
              templateId: "str_custom_store_001",
              kind: "store",
              resref: "custom_store_001",
              name: "Custom Store",
              category: "custom",
              tags: ["custom", "wizard"],
              previewImageUrl: "",
              metadata: {
                templateResRef: "custom_store_001",
                storeListCount: 5,
                storeItemListTotal: 1
              }
            }
          }
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpStoreApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.createStoreBlueprint("token-123", {
      resRef: "custom_store_001",
      name: "Custom Store",
      storeListEntries: [
        {
          bucketTypeId: 0,
          itemListEntries: [{ resRef: "nw_it_mpotion021", x: 0, y: 0, infinite: true }]
        }
      ]
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/stores/blueprints",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resRef: "custom_store_001",
          name: "Custom Store",
          storeListEntries: [
            {
              bucketTypeId: 0,
              itemListEntries: [{ resRef: "nw_it_mpotion021", x: 0, y: 0, infinite: true }]
            }
          ]
        })
      }
    );
    expect(result.blueprint).toMatchObject({
      templateId: "str_custom_store_001",
      objectKey: "modules/current/custom_store_001.utm",
      sourceFileType: "UTM "
    });
    expect(result.store.metadata).toMatchObject({
      storeListCount: 5,
      storeItemListTotal: 1
    });
  });

  it("updates module-backed UTM store blueprints", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            blueprint: {
              templateId: "str_custom_store_001",
              resref: "custom_store_001",
              name: "Updated Store",
              objectKey: "modules/current/custom_store_001.utm",
              sizeBytes: 768,
              sourceFileType: "UTM ",
              sourceFileVersion: "V3.2"
            },
            store: {
              templateId: "str_custom_store_001",
              kind: "store",
              resref: "custom_store_001",
              name: "Updated Store",
              category: "custom",
              tags: ["custom", "wizard"],
              previewImageUrl: "",
              metadata: {
                markUp: 175,
                storeListCount: 5
              }
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpStoreApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.updateStoreBlueprint("token-123", "custom_store_001", {
      resRef: "custom_store_001",
      name: "Updated Store",
      markUp: 175,
      overwrite: true
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/stores/blueprints/custom_store_001",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resRef: "custom_store_001",
          name: "Updated Store",
          markUp: 175,
          overwrite: true
        })
      }
    );
    expect(result.store).toMatchObject({
      resref: "custom_store_001",
      name: "Updated Store",
      metadata: {
        markUp: 175
      }
    });
  });

  it("deletes module-backed UTM store blueprints", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            resref: "custom_store_001",
            objectKey: "modules/current/custom_store_001.utm",
            deleted: true
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpStoreApiPort(fetchFn, "https://aurora.test/api/v1");

    await expect(port.deleteStoreBlueprint("token-123", "custom_store_001")).resolves.toEqual({
      resref: "custom_store_001",
      objectKey: "modules/current/custom_store_001.utm",
      deleted: true
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/stores/blueprints/custom_store_001",
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token-123"
        }
      }
    );
  });
});
