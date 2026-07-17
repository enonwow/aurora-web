import { afterEach, describe, expect, it, vi } from "vitest";
import { HttpItemApiPort } from "../../../../src/modules/items/adapters/httpItemApiPort";

const originalFetch = globalThis.fetch;

describe("HttpItemApiPort", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("calls the default fetch through globalThis", async () => {
    let observedThis: unknown;
    let observedInit: RequestInit | undefined;

    globalThis.fetch = vi.fn(function (
      this: unknown,
      _input: RequestInfo | URL,
      init?: RequestInit
    ) {
      observedThis = this;
      observedInit = init;
      return Promise.resolve(
        new Response(
          JSON.stringify({
            data: {
              items: [],
              total: 0,
              limit: 1,
              offset: 0
            }
          }),
          {
            headers: {
              "Content-Type": "application/json"
            },
            status: 200
          }
        )
      );
    }) as typeof fetch;

    const port = new HttpItemApiPort(undefined, "/_aurora/v1");

    await expect(port.listItems("token-123", { limit: 1 })).resolves.toMatchObject({
      items: [],
      total: 0
    });

    expect(observedThis).toBe(globalThis);
    expect(observedInit?.headers).toMatchObject({
      Authorization: "Bearer token-123"
    });
  });

  it("processes item templates with model asset manifests", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "cache_item_dagger",
              hit: false,
              storedAt: "2026-06-29T10:00:00.000Z",
              hits: 0
            },
            item: {
              templateId: "item_cnr_b_dagger",
              kind: "item",
              resref: "cnr_b_dagger",
              name: "Bronze Dagger",
              category: "Weapons",
              benchmarkCandidate: false,
              metadata: {
                baseItemModelType: "wswdg",
                modelPartResRef1: "wswdg_b_011"
              },
              render: {
                backendType: "item",
                frontendType: "item",
                rendererPreset: "item-standard"
              },
              assetManifest: {
                version: "placeable-asset-manifest/v1",
                source: "module-blob-snapshot",
                generatedAt: "2026-06-29T10:00:00.000Z",
                assetCount: 1,
                candidatesScanned: 1,
                assets: [
                  {
                    assetId: "asset-wswdg-b",
                    role: "model",
                    fileName: "wswdg_b_011.glb",
                    objectKey: "modules/current/__aurora/derived/models/wswdg_b_011.glb",
                    extension: "glb",
                    sizeBytes: 4808,
                    contentType: "model/gltf-binary"
                  }
                ]
              },
              itemRuntime: {
                visual: {
                  baseItemModelType: "wswdg",
                  modelParts: [11],
                  modelPartResRefs: ["wswdg_b_011"],
                  modelPartResRefRoles: ["blade"]
                }
              },
              itemValidationIssues: [],
              processedAt: "2026-06-29T10:00:00.000Z"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpItemApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.processItem("token-123", {
      templateId: "item_cnr_b_dagger"
    });

    expect(fetchFn).toHaveBeenCalledWith("https://aurora.test/api/v1/catalog/items/process", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-123",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ templateId: "item_cnr_b_dagger" })
    });
    expect(result.item.assetManifest?.assets[0]).toMatchObject({
      fileName: "wswdg_b_011.glb",
      assetId: "asset-wswdg-b"
    });
  });

  it("sends item visual override payloads for creator previews", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "cache_item_creator",
              hit: false,
              storedAt: "2026-06-29T10:00:00.000Z",
              hits: 0
            },
            item: {
              templateId: "itm_aarcl009",
              kind: "item",
              resref: "aarcl009",
              name: "Hide Armor",
              category: "Armor",
              benchmarkCandidate: false,
              metadata: {},
              render: {
                backendType: "item",
                frontendType: "item",
                rendererPreset: "item-standard"
              },
              itemRuntime: {
                visual: {
                  armorParts: {
                    torso: 0,
                    rHand: 4
                  }
                }
              },
              itemValidationIssues: [],
              processedAt: "2026-06-29T10:00:00.000Z"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpItemApiPort(fetchFn, "https://aurora.test/api/v1");

    await port.processItem("token-123", {
      templateId: "itm_aarcl009",
      itemVisualOverride: {
        modelPart1: 12,
        armorParts: {
          torso: 0,
          rHand: 4
        },
        materialColors: {
          leather1: 7,
          metal2: 21
        }
      },
      bypassCache: true
    });

    expect(fetchFn).toHaveBeenCalledWith("https://aurora.test/api/v1/catalog/items/process", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-123",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        templateId: "itm_aarcl009",
        itemVisualOverride: {
          modelPart1: 12,
          armorParts: {
            torso: 0,
            rHand: 4
          },
          materialColors: {
            leather1: 7,
            metal2: 21
          }
        },
        bypassCache: true
      })
    });
  });

  it("loads baseitems.2da rows for the item type picker", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            generatedAt: "2026-06-30T10:00:00.000Z",
            sourceKey: "baseitems.2da",
            count: 1,
            items: [
              {
                baseItem: 0,
                sourceKey: "baseitems.2da",
                label: "shortsword",
                itemClass: "wswss",
                modelType: "wswss",
                defaultIcon: "iwswss",
                invSlotWidth: 1,
                invSlotHeight: 2,
                equipableSlots: "0x1C030",
                baseCost: 10,
                storePanel: 1,
                storePanelSort: 19,
                reqFeats: [45, 50]
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpItemApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.getItemBaseItems("token-123");

    expect(fetchFn).toHaveBeenCalledWith("https://aurora.test/api/v1/catalog/items/base-items", {
      method: "GET",
      headers: {
        Authorization: "Bearer token-123"
      }
    });
    expect(result.items[0]).toMatchObject({
      baseItem: 0,
      label: "shortsword",
      reqFeats: [45, 50]
    });
  });

  it("loads item generator support status from real UTG headers", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            generatedAt: "2026-07-01T00:00:00.000Z",
            supported: false,
            status: "unsupported",
            sourceCount: 4,
            gffCandidateCount: 0,
            parseableGffCount: 0,
            ltrLexiconCount: 4,
            parserImplemented: false,
            sources: [
              {
                objectKey: "C:\\Projects\\New Folder\\item-retail-extract\\utg\\animal.utg",
                fileName: "animal.utg",
                sizeBytes: 273177,
                source: "local-retail-extract",
                header: "LTR V1.0",
                classification: "ltr-lexicon",
                supported: false,
                parseable: false,
                reason: "LTR V1.0 resource, not a GFF item-generator blueprint."
              }
            ],
            notes: [
              "Detected .utg resources are LTR V1.0 lexicons, not item-generator blueprints."
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpItemApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.getItemGeneratorSupport("token-123");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/items/generator-support",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token-123"
        }
      }
    );
    expect(result).toMatchObject({
      supported: false,
      status: "unsupported",
      sourceCount: 4,
      gffCandidateCount: 0,
      parseableGffCount: 0,
      ltrLexiconCount: 4,
      parserImplemented: false,
      sources: [
        {
          fileName: "animal.utg",
          header: "LTR V1.0",
          classification: "ltr-lexicon",
          supported: false,
          parseable: false
        }
      ]
    });
  });

  it("writes custom itempalcus palette trees", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            palette: {
              resref: "itempalcus",
              objectKey: "modules/current/itempalcus.itp",
              fileName: "itempalcus.itp",
              sizeBytes: 256,
              etag: "etag-itempalcus",
              sourceFileType: "ITP ",
              sourceFileVersion: "V3.2",
              rootCount: 1,
              leafCount: 1,
              folderCount: 1,
              categoryLeafCount: 0,
              maxDepth: 2
            },
            tree: {
              generatedAt: "2026-06-30T10:00:00.000Z",
              activeSource: "itempalcus",
              sources: [
                {
                  resref: "itempalcus",
                  objectKey: "modules/current/itempalcus.itp",
                  fileName: "modules/current/itempalcus.itp",
                  sourceFileType: "ITP ",
                  sourceFileVersion: "V3.2",
                  rootCount: 1,
                  leafCount: 1,
                  folderCount: 1,
                  categoryLeafCount: 0,
                  maxDepth: 2,
                  selected: true
                }
              ],
              rootCount: 1,
              leafCount: 1,
              folderCount: 1,
              categoryLeafCount: 0,
              maxDepth: 2,
              roots: [
                {
                  nodeId: "0",
                  kind: "folder",
                  depth: 0,
                  label: "Custom Weapons",
                  leafCount: 1,
                  folderCount: 1,
                  categoryLeafCount: 0,
                  children: [
                    {
                      nodeId: "0/0",
                      kind: "leaf",
                      depth: 1,
                      label: "Bronze Dagger",
                      resRef: "cnr_b_dagger",
                      leafCount: 1,
                      folderCount: 0,
                      categoryLeafCount: 0,
                      children: []
                    }
                  ]
                }
              ]
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpItemApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.writeCustomItemPalette("token-123", {
      roots: [
        {
          label: "Custom Weapons",
          children: [{ label: "Bronze Dagger", resRef: "cnr_b_dagger" }]
        }
      ]
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/items/palette-tree/custom",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          roots: [
            {
              label: "Custom Weapons",
              children: [{ label: "Bronze Dagger", resRef: "cnr_b_dagger" }]
            }
          ]
        })
      }
    );
    expect(result).toMatchObject({
      palette: {
        resref: "itempalcus",
        objectKey: "modules/current/itempalcus.itp"
      },
      tree: {
        activeSource: "itempalcus",
        roots: [
          {
            label: "Custom Weapons",
            children: [{ resRef: "cnr_b_dagger" }]
          }
        ]
      }
    });
  });

  it("updates module-backed item blueprints through PUT", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            blueprint: {
              templateId: "itm_test_item",
              resref: "test_item",
              name: "Updated Item",
              objectKey: "modules/current/test_item.uti",
              sizeBytes: 512,
              etag: "etag-test-item",
              sourceFileType: "UTI ",
              sourceFileVersion: "V3.2"
            },
            cache: {
              key: "cache_updated_item",
              hit: false,
              storedAt: "2026-06-30T10:00:00.000Z",
              hits: 0
            },
            item: {
              templateId: "itm_test_item",
              kind: "item",
              resref: "test_item",
              name: "Updated Item",
              category: "custom",
              benchmarkCandidate: false,
              metadata: {},
              render: {
                backendType: "item",
                frontendType: "item",
                rendererPreset: "item-standard"
              },
              processedAt: "2026-06-30T10:00:00.000Z"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpItemApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.updateItemBlueprint("token-123", "test_item", {
      templateResRef: "test_item",
      name: "Updated Item",
      tag: "UPDATED_ITEM",
      baseItem: 22,
      modelPart1: 11,
      overwrite: true
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/items/blueprints/test_item",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateResRef: "test_item",
          name: "Updated Item",
          tag: "UPDATED_ITEM",
          baseItem: 22,
          modelPart1: 11,
          overwrite: true
        })
      }
    );
    expect(result.blueprint).toMatchObject({
      templateId: "itm_test_item",
      resref: "test_item",
      objectKey: "modules/current/test_item.uti"
    });
  });

  it("deletes module-backed item blueprints through DELETE", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            resref: "test_item",
            objectKey: "modules/current/test_item.uti",
            deleted: true
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpItemApiPort(fetchFn, "https://aurora.test/api/v1");

    const result = await port.deleteItemBlueprint("token-123", "test_item");

    expect(fetchFn).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/items/blueprints/test_item",
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token-123"
        }
      }
    );
    expect(result).toEqual({
      resref: "test_item",
      objectKey: "modules/current/test_item.uti",
      deleted: true
    });
  });
});
