import { describe, expect, it, vi } from "vitest";
import {
  HttpPlaceableApiPort,
  PlaceableApiRequestError
} from "../../../../src/modules/placeables/adapters/httpPlaceableApiPort";

describe("HttpPlaceableApiPort", () => {
  it("lists placeables with paging-only query params", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [],
            total: 0,
            limit: 100,
            offset: 25
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await port.listPlaceables("token_123", {
      limit: 100,
      offset: 25
    });

    expect(result).toEqual({
      items: [],
      total: 0,
      limit: 100,
      offset: 25
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/catalog/placeables?limit=100&offset=25",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_123" }
      })
    );
  });

  it("lists placeable templates with query params and auth header", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                templateId: "plc_001",
                resref: "plc_barrel_01",
                name: "Barrel",
                category: "placeables",
                placeableSubtype: "generic",
                tags: ["wood", "container"],
                previewImageUrl: "/assets/placeables/plc_barrel_01.png"
              }
            ],
            total: 1,
            limit: 20,
            offset: 0
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await port.listPlaceables("token_123", {
      query: "barrel",
      subtype: "generic",
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.templateId).toBe("plc_001");
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/catalog/placeables?query=barrel&subtype=generic&benchmark=true&limit=20&offset=0",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_123" }
      })
    );
  });

  it("fetches placeable preview scene payload", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            templateId: "plc_002",
            placeableSubtype: "door",
            resref: "nw_door_ttr_11",
            name: "Door",
            category: "doors",
            previewImageUrl: "/assets/doors/nw_door_ttr_11.png"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await port.getPlaceablePreview("token_123", "plc_002");

    expect(result.templateId).toBe("plc_002");
    expect(result.placeableSubtype).toBe("door");
    expect(result.previewImageUrl).toBe("/assets/doors/nw_door_ttr_11.png");
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/catalog/placeables/plc_002/preview",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_123" }
      })
    );
  });

  it("creates module-backed UTP placeable blueprints", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            blueprint: {
              templateId: "plc_custom_chest_001",
              resref: "custom_chest_001",
              name: "Custom Chest",
              objectKey: "modules/current/custom_chest_001.utp",
              sizeBytes: 512,
              etag: "etag-placeable",
              sourceFileType: "UTP ",
              sourceFileVersion: "V3.2"
            },
            placeable: {
              templateId: "plc_custom_chest_001",
              kind: "placeable",
              resref: "custom_chest_001",
              name: "Custom Chest",
              category: "custom",
              placeableSubtype: "container",
              tags: ["custom", "wizard", "container"],
              previewImageUrl: "/api/v1/catalog/placeables/plc_custom_chest_001/thumbnail",
              metadata: {
                hasInventory: true,
                inventoryItemListCount: 1
              }
            }
          }
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "https://aurora.test/api/v1"
    );

    const result = await port.createPlaceableBlueprint("token-123", {
      templateResRef: "custom_chest_001",
      name: "Custom Chest",
      hasInventory: true,
      inventoryItemListEntries: [
        {
          resRef: "nw_it_mpotion021",
          x: 0,
          y: 0,
          dropable: true,
          infinite: true
        }
      ]
    });

    expect(fetchStub).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/placeables/blueprints",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateResRef: "custom_chest_001",
          name: "Custom Chest",
          hasInventory: true,
          inventoryItemListEntries: [
            {
              resRef: "nw_it_mpotion021",
              x: 0,
              y: 0,
              dropable: true,
              infinite: true
            }
          ]
        })
      }
    );
    expect(result.blueprint).toMatchObject({
      templateId: "plc_custom_chest_001",
      objectKey: "modules/current/custom_chest_001.utp",
      sourceFileType: "UTP "
    });
    expect(result.placeable).toMatchObject({
      kind: "placeable",
      placeableSubtype: "container",
      metadata: {
        hasInventory: true,
        inventoryItemListCount: 1
      }
    });
  });

  it("updates module-backed UTP placeable blueprints", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            blueprint: {
              templateId: "plc_custom_chest_001",
              resref: "custom_chest_001",
              name: "Updated Chest",
              objectKey: "modules/current/custom_chest_001.utp",
              sizeBytes: 768,
              sourceFileType: "UTP ",
              sourceFileVersion: "V3.2"
            },
            placeable: {
              templateId: "plc_custom_chest_001",
              kind: "placeable",
              resref: "custom_chest_001",
              name: "Updated Chest",
              category: "custom",
              tags: ["custom", "wizard"],
              previewImageUrl: "",
              metadata: {
                appearanceId: 205
              }
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "https://aurora.test/api/v1"
    );

    const result = await port.updatePlaceableBlueprint("token-123", "custom_chest_001", {
      templateResRef: "custom_chest_001",
      name: "Updated Chest",
      appearanceId: 205,
      overwrite: true
    });

    expect(fetchStub).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/placeables/blueprints/custom_chest_001",
      {
        method: "PUT",
        headers: {
          Authorization: "Bearer token-123",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          templateResRef: "custom_chest_001",
          name: "Updated Chest",
          appearanceId: 205,
          overwrite: true
        })
      }
    );
    expect(result.placeable).toMatchObject({
      resref: "custom_chest_001",
      name: "Updated Chest",
      metadata: {
        appearanceId: 205
      }
    });
  });

  it("deletes module-backed UTP placeable blueprints", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            resref: "custom_chest_001",
            objectKey: "modules/current/custom_chest_001.utp",
            deleted: true
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "https://aurora.test/api/v1"
    );

    await expect(port.deletePlaceableBlueprint("token-123", "custom_chest_001")).resolves.toEqual({
      resref: "custom_chest_001",
      objectKey: "modules/current/custom_chest_001.utp",
      deleted: true
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "https://aurora.test/api/v1/catalog/placeables/blueprints/custom_chest_001",
      {
        method: "DELETE",
        headers: {
          Authorization: "Bearer token-123"
        }
      }
    );
  });

  it("processes placeable and returns cache metadata + manifest", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "cache_placeable_abc",
              hit: false,
              storedAt: "2026-05-28T12:00:00.000Z",
              hits: 0
            },
            placeable: {
              templateId: "plc_003",
              resref: "plc_table_02",
              name: "Table",
              category: "placeables",
              placeableSubtype: "generic",
              render: {
                backendType: "generic",
                frontendType: "placeable",
                rendererPreset: "placeable-generic",
                isDoor: false,
                isVfx: false
              },
              assetManifest: {
                version: "placeable-asset-manifest/v1",
                source: "module-blob-snapshot",
                generatedAt: "2026-05-28T12:00:00.000Z",
                moduleHash: "abcd1234",
                assetCount: 1,
                candidatesScanned: 10,
                assets: [
                  {
                    assetId: "asset_001",
                    role: "model",
                    fileName: "plc_table_02.mdl",
                    objectKey: "module/plc_table_02.mdl",
                    extension: "mdl",
                    sizeBytes: 1024,
                    contentType: "application/octet-stream",
                    etag: "\"etag_001\""
                  }
                ]
              }
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await port.processPlaceable("token_123", {
      templateId: "plc_003",
      includeBenchmarkMetadata: false
    });

    expect(result.cacheKey).toBe("cache_placeable_abc");
    expect(result.cacheHit).toBe(false);
    expect(result.storedAt).toBe("2026-05-28T12:00:00.000Z");
    expect(result.hits).toBe(0);
    expect(result.placeable.templateId).toBe("plc_003");
    expect(result.placeable.placeableSubtype).toBe("generic");
    expect(result.placeable.render).toEqual({
      backendType: "generic",
      frontendType: "placeable",
      rendererPreset: "placeable-generic",
      isDoor: false,
      isVfx: false
    });
    expect(result.placeable.assetManifest.assetCount).toBe(1);
    expect(result.placeable.assetManifest.assets).toEqual([
      expect.objectContaining({
        assetId: "asset_001",
        role: "model",
        fileName: "plc_table_02.mdl",
        etag: "\"etag_001\""
      })
    ]);
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/catalog/placeables/process",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json"
        })
      })
    );
  });

  it("processes placeable with renderPackage and returns mapped renderPackage", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "cache_placeable_xyz",
              hit: true,
              storedAt: "2026-05-28T12:00:00.000Z",
              hits: 3
            },
            placeable: {
              templateId: "plc_004",
              resref: "plc_rock_01",
              name: "Rock",
              category: "placeables",
              placeableSubtype: "generic",
              render: {
                backendType: "generic",
                frontendType: "placeable",
                rendererPreset: "placeable-generic",
                isDoor: false,
                isVfx: false
              },
              renderPackage: {
                status: "ready",
                diagnostics: [
                  {
                    code: "PLACEABLE_RENDER_READY",
                    severity: "warn",
                    message: "Derived model asset exists."
                  }
                ],
                assetRefs: {
                  modelAssetIds: ["asset_model_001"],
                  derivedModelAssetIds: ["asset_model_derived_001"],
                  textureAssetIds: ["asset_texture_001"],
                  materialAssetIds: ["asset_material_001"],
                  metadataAssetIds: ["asset_meta_001"],
                  otherAssetIds: ["asset_other_001"]
                },
                glbUrl: "/api/v1/catalog/placeables/assets/model.glb",
                textureUrls: ["/api/v1/catalog/placeables/assets/tex_01.dds"],
                textureBindings: [
                  {
                    reference: "tex_01",
                    assetId: "asset_texture_001",
                    fileName: "tex_01.dds",
                    objectKey: "modules/current/textures/tex_01.dds",
                    deliveryUrl: "/api/v1/catalog/placeables/assets/tex_01.dds",
                    txi: {
                      decal: true,
                      clamp: 3,
                      blending: "additive",
                      mipmap: false,
                      filter: false,
                      bumpmaptexture: "tex_01_b",
                      envmaptexture: "tex_01_e"
                    }
                  }
                ],
                auroraLight: {
                  source: "source-mdl",
                  lights: [
                    {
                      source: "aurora-mdl-ascii",
                      sourceModelAssetId: "asset_light_model",
                      sourceModelFileName: "plc_light.mdl",
                      sourceModelObjectKey: "modules/current/models/plc_light.mdl",
                      sourceModelHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                      nodeName: "inverted_light",
                      radius: -1.5,
                      shadowRadius: 1.25,
                      verticalDisplacement: 0.35,
                      multiplier: -0.25,
                      color: [-0.1, 0.5, 1.2],
                      shadow: false,
                      generateFlare: true,
                      textureNames: ["fx_flare_core", "fx_flare_ring"],
                      flareSizes: [0.25, 0.5],
                      flarePositions: [0.1, 0.9],
                      flareColorShifts: [
                        [1, 0.8, 0.4],
                        [0.4, 0.8, 1]
                      ],
                      flareRadius: 12,
                      animations: [
                        {
                          animationName: "default",
                          radiusTimeline: [{ time: 0, value: 3 }],
                          shadowRadiusTimeline: [{ time: 0, value: 1.25 }],
                          verticalDisplacementTimeline: [{ time: 0, value: 0.35 }],
                          multiplierTimeline: [{ time: 0, value: 2 }]
                        }
                      ]
                    }
                  ],
                  diagnostics: []
                },
                auroraMaterial: {
                  source: "mtr",
                  diagnostics: [],
                  materials: [
                    {
                      source: "aurora-mtr",
                      materialAssetId: "asset_material_001",
                      materialFileName: "fx_punch.mtr",
                      materialObjectKey: "modules/current/materials/fx_punch.mtr",
                      state: {
                        blending: "punchthrough",
                        auroraBlendField48: 2,
                        auroraBlendField4c: 3,
                        decal: true,
                        transparency: true,
                        twoSided: true,
                        renderHint: "NormalAndSpecMapped",
                        roughness: 0.62,
                        specularity: 0.45,
                        bumpmaptexture: "fx_punch_bump",
                        bumpyshinytexture: "fx_punch_shiny",
                        envmaptexture: "fx_punch_env",
                        bumpreplacementtexture: "fx_punch_replacement",
                        parameters: [
                          {
                            name: "CustomTint",
                            kind: "float",
                            values: [1, 0.5, 0.25, 1],
                            arity: 4
                          },
                          { name: "CustomMode", kind: "int", values: [2], arity: 1 }
                        ],
                        textureSlots: [
                          {
                            slot: 0,
                            role: "diffuse",
                            reference: "fx_punch_d"
                          },
                          {
                            slot: 1,
                            role: "normal",
                            reference: "fx_punch_n"
                          }
                        ]
                      }
                    }
                  ]
                },
                auroraVfxPayload: {
                  version: "aurora-vfx-payload/v1",
                  canonicalStatus: "canonical",
                  backendCanonical: true,
                  sourceKind: "source_mdl_graph",
                  previewMode: "none",
                  contracts: {
                    renderContract: {
                      version: "aurora-vfx-runtime-render-contract/v1",
                      drawRecords: []
                    }
                  },
                  diagnostics: {
                    payload: [
                      {
                        code: "VFX_AURORA_MDL_EMITTER_RETAIL_PROOF_PENDING",
                        severity: "warn",
                        message: "Retail comparison proof is still required."
                      }
                    ]
                  }
                }
              },
              assetManifest: {
                version: "placeable-asset-manifest/v1",
                source: "module-blob-snapshot",
                generatedAt: "2026-05-28T12:00:00.000Z",
                moduleHash: "wxyz9876",
                assetCount: 2,
                candidatesScanned: 12,
                assets: [
                  {
                    assetId: "asset_model_001",
                    role: "model",
                    fileName: "plc_rock_01.mdl",
                    objectKey: "module/plc_rock_01.mdl",
                    extension: "mdl",
                    sizeBytes: 1024,
                    contentType: "application/octet-stream"
                  }
                ]
              }
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await port.processPlaceable("token_123", {
      templateId: "plc_004",
      includeBenchmarkMetadata: false
    });

    expect(result.cacheHit).toBe(true);
    expect(result.placeable.placeableSubtype).toBe("generic");
    expect(result.placeable.renderPackage).toEqual({
      status: "ready",
      diagnostics: [
        {
          code: "PLACEABLE_RENDER_READY",
          severity: "warn",
          message: "Derived model asset exists."
        }
      ],
      assetRefs: {
        modelAssetIds: ["asset_model_001"],
        derivedModelAssetIds: ["asset_model_derived_001"],
        chunkModelAssetIds: undefined,
        textureAssetIds: ["asset_texture_001"],
        materialAssetIds: ["asset_material_001"],
        metadataAssetIds: ["asset_meta_001"],
        otherAssetIds: ["asset_other_001"]
      },
      modelUrl: undefined,
      glbUrl: "/api/v1/catalog/placeables/assets/model.glb",
      textureUrls: ["/api/v1/catalog/placeables/assets/tex_01.dds"],
      textureBindings: [
        {
          reference: "tex_01",
          assetId: "asset_texture_001",
          fileName: "tex_01.dds",
          objectKey: "modules/current/textures/tex_01.dds",
          deliveryUrl: "/api/v1/catalog/placeables/assets/tex_01.dds",
          txi: {
            decal: true,
            clamp: 3,
            blending: "additive",
            mipmap: false,
            filter: false,
            bumpmaptexture: "tex_01_b",
            envmaptexture: "tex_01_e"
          }
        }
      ],
      auroraEmitter: undefined,
      auroraLight: {
        source: "source-mdl",
        lights: [
          expect.objectContaining({
            nodeName: "inverted_light",
            sourceModelHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            radius: -1.5,
            shadowRadius: 1.25,
            verticalDisplacement: 0.35,
            multiplier: -0.25,
            color: [-0.1, 0.5, 1.2],
            shadow: false,
            generateFlare: true,
            textureNames: ["fx_flare_core", "fx_flare_ring"],
            flareSizes: [0.25, 0.5],
            flarePositions: [0.1, 0.9],
            flareColorShifts: [
              [1, 0.8, 0.4],
              [0.4, 0.8, 1]
            ],
            flareRadius: 12,
            animations: [
              {
                animationName: "default",
                lengthSeconds: undefined,
                transitionSeconds: undefined,
                positionTimeline: undefined,
                colorTimeline: undefined,
                radiusTimeline: [{ time: 0, value: 3 }],
                shadowRadiusTimeline: [{ time: 0, value: 1.25 }],
                verticalDisplacementTimeline: [{ time: 0, value: 0.35 }],
                multiplierTimeline: [{ time: 0, value: 2 }]
              }
            ]
          })
        ],
        diagnostics: []
      },
      auroraMaterial: {
        source: "mtr",
        diagnostics: [],
        materials: [
          {
            source: "aurora-mtr",
            materialAssetId: "asset_material_001",
            materialFileName: "fx_punch.mtr",
            materialObjectKey: "modules/current/materials/fx_punch.mtr",
            state: {
              blending: "punchthrough",
              auroraBlendField48: 2,
              auroraBlendField4c: 3,
              customShaderFS: undefined,
              customShaderGS: undefined,
              customShaderProgram: undefined,
              customShaderVS: undefined,
              decal: true,
              transparency: true,
              twoSided: true,
              volumetric: undefined,
              renderHint: "NormalAndSpecMapped",
              roughness: 0.62,
              sampleFramebuffer: undefined,
              specularity: 0.45,
              bumpmaptexture: "fx_punch_bump",
              bumpyshinytexture: "fx_punch_shiny",
              envmaptexture: "fx_punch_env",
              bumpreplacementtexture: "fx_punch_replacement",
              parameters: [
                {
                  name: "CustomTint",
                  kind: "float",
                  values: [1, 0.5, 0.25, 1],
                  arity: 4
                },
                { name: "CustomMode", kind: "int", values: [2], arity: 1 }
              ],
              textureSlots: [
                {
                  slot: 0,
                  role: "diffuse",
                  reference: "fx_punch_d"
                },
                {
                  slot: 1,
                  role: "normal",
                  reference: "fx_punch_n"
                }
              ]
            }
          }
        ]
      },
      auroraModelGraph: undefined,
      auroraVfxPayload: {
        version: "aurora-vfx-payload/v1",
        canonicalStatus: "canonical",
        backendCanonical: true,
        sourceKind: "source_mdl_graph",
        previewMode: "none",
        contracts: {
          renderContract: {
            version: "aurora-vfx-runtime-render-contract/v1",
            drawRecords: []
          }
        },
        diagnostics: {
          payload: [
            {
              code: "VFX_AURORA_MDL_EMITTER_RETAIL_PROOF_PENDING",
              severity: "warn",
              message: "Retail comparison proof is still required."
            }
          ]
        }
      }
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/catalog/placeables/process",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json"
        })
      })
    );
  });

  it("lists a digest-bound page of physical placeables.2da Appearance rows", async () => {
    const sha256 = "a".repeat(64);
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 16500,
        items: [{
          rowIndex: 104,
          displayName: "Water Trough",
          displaySource: "strref",
          strRef: 5747,
          label: "WaterTrough"
        }],
        total: 1,
        limit: 100,
        offset: 0
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    await expect(port.listPlaceableAppearanceRows("token_123", {
      tableSha256: sha256,
      query: "water trough",
      limit: 100,
      offset: 0
    })).resolves.toEqual({
      resourceName: "placeables.2da",
      sha256,
      rowCount: 16500,
      items: [{
        rowIndex: 104,
        displayName: "Water Trough",
        displaySource: "strref",
        strRef: 5747,
        label: "WaterTrough"
      }],
      total: 1,
      limit: 100,
      offset: 0
    });
    expect(fetchStub).toHaveBeenCalledWith(
      `http://localhost:3000/api/v1/catalog/placeables/appearances?tableSha256=${sha256}&query=water+trough&limit=100&offset=0`,
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_123" }
      })
    );
  });

  it("accepts exact Label and row-index fallbacks while omitting optional query parameters", async () => {
    const sha256 = "c".repeat(64);
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 2,
        items: [
          {
            rowIndex: 0,
            displayName: "NativeLabel",
            displaySource: "label",
            label: "NativeLabel",
            strRef: 5747
          },
          { rowIndex: 1, displayName: "Row 1", displaySource: "row_index" }
        ],
        total: 2,
        limit: 100,
        offset: 0
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "https://aurora.test/api/v1"
    );

    await expect(port.listPlaceableAppearanceRows("token", {
      tableSha256: sha256
    })).resolves.toMatchObject({ total: 2, limit: 100, offset: 0 });
    expect(fetchStub).toHaveBeenCalledWith(
      `https://aurora.test/api/v1/catalog/placeables/appearances?tableSha256=${sha256}`,
      expect.anything()
    );
  });

  it("accepts a strictly ascending page exactly at the requested limit", async () => {
    const sha256 = "d".repeat(64);
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 2,
        items: [
          { rowIndex: 0, displayName: "Row 0", displaySource: "row_index" },
          { rowIndex: 1, displayName: "Row 1", displaySource: "row_index" }
        ],
        total: 2,
        limit: 2,
        offset: 0
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpPlaceableApiPort(fetchStub as unknown as typeof fetch, "https://aurora.test/api/v1");

    await expect(port.listPlaceableAppearanceRows("token", {
      tableSha256: sha256,
      limit: 2,
      offset: 0
    })).resolves.toHaveProperty("items", [
      { rowIndex: 0, displayName: "Row 0", displaySource: "row_index" },
      { rowIndex: 1, displayName: "Row 1", displaySource: "row_index" }
    ]);
  });

  it("rejects an otherwise valid Appearance row page whose digest does not match the request", async () => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        resourceName: "placeables.2da",
        sha256: "b".repeat(64),
        rowCount: 1,
        items: [{ rowIndex: 0, displayName: "Row 0", displaySource: "row_index" }],
        total: 1,
        limit: 100,
        offset: 0
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpPlaceableApiPort(fetchStub as unknown as typeof fetch, "https://aurora.test/api/v1");

    await expect(port.listPlaceableAppearanceRows("token", {
      tableSha256: "a".repeat(64),
      limit: 100,
      offset: 0
    })).rejects.toMatchObject({
      status: 409,
      code: "PLACEABLE_APPEARANCE_TABLE_STALE"
    });
  });

  it("rejects Appearance row pages with inconsistent ordinals, display provenance, or paging echoes", async () => {
    const sha256 = "a".repeat(64);
    const invalidPages = [
      {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 1,
        items: [{ rowIndex: 1, displayName: "Row 1", displaySource: "row_index" }],
        total: 1,
        limit: 100,
        offset: 0
      },
      {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 3,
        items: [
          { rowIndex: 2, displayName: "Row 2", displaySource: "row_index" },
          { rowIndex: 1, displayName: "Row 1", displaySource: "row_index" }
        ],
        total: 2,
        limit: 100,
        offset: 0
      },
      {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 1,
        items: [{
          rowIndex: 0,
          displayName: "Invented display",
          displaySource: "label",
          label: "NativeLabel"
        }],
        total: 1,
        limit: 100,
        offset: 0
      },
      {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 1,
        items: [{ rowIndex: 0, displayName: "Row zero", displaySource: "row_index" }],
        total: 1,
        limit: 100,
        offset: 0
      },
      {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 1,
        items: [],
        total: 2,
        limit: 100,
        offset: 0
      },
      {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 2,
        items: [
          { rowIndex: 0, displayName: "Row 0", displaySource: "row_index" },
          { rowIndex: 1, displayName: "Row 1", displaySource: "row_index" }
        ],
        total: 2,
        limit: 1,
        offset: 0
      },
      {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 1,
        items: [],
        total: 1,
        limit: 100,
        offset: 1
      }
    ];

    for (const data of invalidPages) {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
      const port = new HttpPlaceableApiPort(
        fetchStub as unknown as typeof fetch,
        "https://aurora.test/api/v1"
      );

      await expect(port.listPlaceableAppearanceRows("token", {
        tableSha256: sha256,
        limit: 100,
        offset: 0
      })).rejects.toThrow();
    }
  });

  it("rejects each isolated Appearance page cardinality, duplicate, and echo violation", async () => {
    const sha256 = "e".repeat(64);
    const cases = [
      {
        query: { tableSha256: sha256, limit: 1, offset: 0 },
        data: {
          resourceName: "placeables.2da",
          sha256,
          rowCount: 2,
          items: [
            { rowIndex: 0, displayName: "Row 0", displaySource: "row_index" },
            { rowIndex: 1, displayName: "Row 1", displaySource: "row_index" }
          ],
          total: 2,
          limit: 1,
          offset: 0
        }
      },
      {
        query: { tableSha256: sha256, limit: 100, offset: 0 },
        data: {
          resourceName: "placeables.2da",
          sha256,
          rowCount: 2,
          items: [
            { rowIndex: 0, displayName: "Row 0", displaySource: "row_index" },
            { rowIndex: 0, displayName: "Row 0", displaySource: "row_index" }
          ],
          total: 2,
          limit: 100,
          offset: 0
        }
      },
      {
        query: { tableSha256: sha256, limit: 100, offset: 0 },
        data: {
          resourceName: "placeables.2da",
          sha256,
          rowCount: 1,
          items: [],
          total: 1,
          limit: 99,
          offset: 0
        }
      }
    ];

    for (const candidate of cases) {
      const fetchStub = vi.fn(async () => new Response(JSON.stringify({ data: candidate.data }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
      const port = new HttpPlaceableApiPort(fetchStub as unknown as typeof fetch, "https://aurora.test/api/v1");
      await expect(port.listPlaceableAppearanceRows("token", candidate.query)).rejects.toThrow();
    }
  });

  it.each([
    `${"f".repeat(64)}0`,
    `0${"f".repeat(64)}`
  ])("rejects a non-exact response digest as schema data (%s)", async (sha256) => {
    const fetchStub = vi.fn(async () => new Response(JSON.stringify({
      data: {
        resourceName: "placeables.2da",
        sha256,
        rowCount: 1,
        items: [],
        total: 0,
        limit: 100,
        offset: 0
      }
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const port = new HttpPlaceableApiPort(fetchStub as unknown as typeof fetch, "https://aurora.test/api/v1");

    await expect(port.listPlaceableAppearanceRows("token", {
      tableSha256: "f".repeat(64)
    })).rejects.toMatchObject({ name: "ZodError" });
  });

  it("hydrates a processed placeable from cache without dropping canonical runtime emitters", async () => {
    const controller = new AbortController();
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "cache_vfx_full",
              hit: true,
              storedAt: "2026-07-20T12:00:00.000Z",
              hits: 2
            },
            placeable: {
              templateId: "plc_t04",
              resref: "plc_t04",
              name: "Placeable VFX",
              category: "effects",
              placeableSubtype: "vfx",
              render: {
                backendType: "vfx",
                frontendType: "vfx",
                rendererPreset: "vfx-emitter",
                isDoor: false,
                isVfx: true
              },
              renderPackage: {
                status: "ready",
                diagnostics: [],
                assetRefs: {},
                auroraVfxPayload: {
                  version: "aurora-vfx-payload/v1",
                  canonicalStatus: "canonical",
                  backendCanonical: true,
                  contracts: {
                    runtimeEmitters: [
                      { emitterNodeName: "fire" },
                      { emitterNodeName: "smoke" }
                    ],
                    renderContract: { emitterNodeName: "fire" }
                  }
                }
              },
              assetManifest: {
                version: "placeable-asset-manifest/v1",
                source: "module-blob-snapshot",
                generatedAt: "2026-07-20T12:00:00.000Z",
                assetCount: 0,
                candidatesScanned: 0,
                assets: []
              }
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await port.getProcessedPlaceable(
      "token_123",
      "cache_vfx_full",
      { signal: controller.signal }
    );

    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/catalog/placeables/cache/cache_vfx_full",
      {
        method: "GET",
        headers: { Authorization: "Bearer token_123" },
        signal: controller.signal
      }
    );
    expect(result.cacheKey).toBe("cache_vfx_full");
    expect(
      (
        result.placeable.renderPackage?.auroraVfxPayload as {
          contracts?: { runtimeEmitters?: unknown[] };
        }
      ).contracts?.runtimeEmitters
    ).toHaveLength(2);
  });

  it("maps Aurora emitter simulation fields from processed placeable renderPackage", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "cache_vfx_001",
              hit: false,
              storedAt: "2026-06-05T12:00:00.000Z",
              hits: 0
            },
            placeable: {
              templateId: "plc_cot_fx01",
              resref: "plc_cot_fx01",
              name: "VFX: Smoke, Red*",
              category: "effects",
              placeableSubtype: "vfx",
              render: {
                backendType: "vfx",
                frontendType: "vfx",
                rendererPreset: "vfx-emitter",
                isDoor: false,
                isVfx: true
              },
              renderPackage: {
                status: "ready",
                diagnostics: [],
                assetRefs: {
                  chunkModelAssetIds: ["asset_chunk_model_001"],
                  textureAssetIds: ["asset_texture_001"]
                },
                auroraEmitter: {
                  source: "source-mdl",
                  diagnostics: [],
                  emitters: [
                    {
                      source: "aurora-mdl-ascii",
                      sourceModelAssetId: "asset_model_001",
                      sourceModelFileName: "cot_fx01.mdl",
                      sourceModelObjectKey: "modules/current/models/cot_fx01.mdl",
                      nodeName: "fire!03",
                      texture: "fxpa_smoke01",
                      chunkName: "Red_M_Giblet",
                      chunkModelAssetId: "asset_chunk_model_001",
                      chunkModelFileName: "red_m_giblet.glb",
                      chunkModelObjectKey: "modules/current/__aurora/derived/models/red_m_giblet.glb",
                      emitterType: "Fountain",
                      renderMode: "Billboard_to_World_Z",
                      blendMode: "Normal",
                      simulation: {
                        xSize: 60,
                        ySize: 40,
                        spawnType: 0,
                        birthrate: 5,
                        lifeExp: 5,
                        mass: -0.75,
                        velocity: 0.5,
                        randvel: 0.4,
                        spread: 1.0472,
                        particleRot: 0.2,
                        bounce: true,
                        bounceCoefficient: 0.35,
                        blastRadius: 2.5,
                        blastLength: 1.25,
                        blurLength: 1.2,
                        detonate: 0.5,
                        fps: 4,
                        frameStart: 4,
                        frameEnd: 7,
                        lightningScale: 1.5,
                        lightningDelay: 0.2,
                        lightningRadius: 0.75,
                        deadspace: 0.25,
                        p2p: true,
                        p2pType: "2",
                        grav: 0.8,
                        drag: 0.3,
                        threshold: 0.4,
                        inherit: true,
                        inheritVel: false,
                        inheritLocal: true,
                        inheritPart: true,
                        affectedByWind: true,
                        sizeStart: 1,
                        sizeMid: 4,
                        sizeEnd: 6,
                        sizeStartY: 0.5,
                        sizeMidY: 2,
                        sizeEndY: 0.75,
                        alphaStart: 0.5,
                        alphaMid: 0.85,
                        alphaEnd: 0,
                        colorStart: [0.392157, 0, 0],
                        colorMid: [0.5, 0.25, 0],
                        colorEnd: [0.184314, 0, 0],
                        percentStart: 0.1,
                        percentMid: 0.6,
                        percentEnd: 0.9,
                        timeline: {
                          xSize: [
                            { time: 0, value: 0 },
                            { time: 1, value: 80 }
                          ],
                          ySize: [
                            { time: 0, value: 0 },
                            { time: 1, value: 20 }
                          ],
                          birthrate: [
                            { time: 0, value: 0 },
                            { time: 0.25, value: 18 },
                            { time: 1, value: 0 }
                          ],
                          detonate: [
                            { time: 0, value: 0 },
                            { time: 0.25, value: 1 }
                          ],
                          sizeStart: [
                            { time: 0, value: 0 },
                            { time: 0.5, value: 3 },
                            { time: 1, value: 1 }
                          ],
                          alphaStart: [
                            { time: 0, value: 0 },
                            { time: 0.25, value: 1 },
                            { time: 1, value: 0 }
                          ],
                          fps: [
                            { time: 0, value: 4 },
                            { time: 1, value: 12 }
                          ],
                          frameStart: [
                            { time: 0, value: 4 },
                            { time: 1, value: 4 }
                          ],
                          frameEnd: [
                            { time: 0, value: 7 },
                            { time: 1, value: 7 }
                          ],
                          lightningScale: [
                            { time: 0, value: 0.5 },
                            { time: 1, value: 2 }
                          ],
                          lightningDelay: [
                            { time: 0, value: 0.1 },
                            { time: 1, value: 0.4 }
                          ],
                          lightningRadius: [
                            { time: 0, value: 0.25 },
                            { time: 1, value: 1 }
                          ],
                          percentStart: [
                            { time: 0, value: 0 },
                            { time: 1, value: 0.1 }
                          ],
                          percentMid: [
                            { time: 0, value: 0.4 },
                            { time: 1, value: 0.6 }
                          ],
                          percentEnd: [
                            { time: 0, value: 0.8 },
                            { time: 1, value: 1 }
                          ]
                        },
                        colorTimeline: {
                          colorStart: [
                            { time: 0, value: [1, 0, 0] },
                            { time: 0.5, value: [0, 1, 0] },
                            { time: 1, value: [0, 0, 1] }
                          ],
                          colorMid: [
                            { time: 0, value: [1, 1, 0] },
                            { time: 1, value: [0, 1, 1] }
                          ],
                          colorEnd: [
                            { time: 0, value: [0.2, 0, 0] },
                            { time: 1, value: [0, 0.2, 0] }
                          ]
                        }
                      },
                      transform: {
                        position: [0.0466596, -0.126434, 0.0124961],
                        positionTimeline: [
                          { time: 0, value: [0.0466596, -0.126434, 0.0124961] },
                          { time: 1, value: [0.1466596, -0.026434, 0.1124961] }
                        ],
                        orientation: {
                          axis: [1, 0, 0],
                          angleRadians: -1.42244
                        },
                        orientationTimeline: [
                          {
                            time: 0,
                            value: { axis: [1, 0, 0], angleRadians: -1.42244 }
                          },
                          {
                            time: 1,
                            value: { axis: [1, 0, 0], angleRadians: -0.71122 }
                          }
                        ],
                        scale: 1.5,
                        scaleTimeline: [
                          { time: 0, value: 1.5 },
                          { time: 1, value: 2 }
                        ]
                      },
                      referenceNodes: [
                        {
                          nodeName: "REFm",
                          parentNodeName: "fire!03",
                          transform: {
                            position: [0, 0, 0.63]
                          }
                        }
                      ],
                      events: [
                        {
                          time: 0.25,
                          type: "detonate",
                          animationName: "impact"
                        }
                      ],
                      animations: [
                        {
                          animationName: "off2on",
                          lengthSeconds: 2,
                          transitionSeconds: 0,
                          simulation: {
                            birthrate: -4,
                            timeline: {
                              birthrate: [
                                { time: 0, value: 0 },
                                { time: 1, value: 4 },
                                { time: 2, value: 4 }
                              ]
                            }
                          }
                        },
                        {
                          animationName: "on",
                          lengthSeconds: 2,
                          transitionSeconds: 0,
                          simulation: {
                            birthrate: 4,
                            alphaEnd: 1
                          }
                        }
                      ],
                      sourceState: {
                        renderOrder: -3,
                        renderHintRaw: "normaltangents",
                        renderHintMode: 3,
                        customShaderVS: "fx_smoke_vs",
                        customShaderFS: "fx_smoke_fs",
                        customShaderGS: "fx_smoke_gs",
                        transparency: true,
                        twoSidedMaterial: true,
                        twoSidedTexture: true,
                        sampleFramebuffer: 2,
                        volumetric: true,
                        loop: false,
                        isTinted: false,
                        splat: true,
                        rotateTexture: true
                      }
                    }
                  ]
                }
              },
              assetManifest: {
                version: "placeable-asset-manifest/v1",
                source: "module-blob-snapshot",
                generatedAt: "2026-06-05T12:00:00.000Z",
                assetCount: 2,
                candidatesScanned: 2,
                assets: [
                  {
                    assetId: "asset_chunk_model_001",
                    role: "model",
                    fileName: "red_m_giblet.glb",
                    objectKey: "modules/current/__aurora/derived/models/red_m_giblet.glb",
                    extension: "glb",
                    sizeBytes: 128,
                    contentType: "model/gltf-binary"
                  },
                  {
                    assetId: "asset_texture_001",
                    role: "texture",
                    fileName: "fxpa_smoke01.tga",
                    objectKey: "module/fxpa_smoke01.tga",
                    extension: "tga",
                    sizeBytes: 512,
                    contentType: "image/targa"
                  }
                ]
              },
              placeableRuntime: {
                state: {
                  appearanceType: 11286,
                  animationState: 4,
                  lightState: 1,
                  lightStateSource: "utp.LightState",
                  lightStateProofStatus: "source-backed-utp-lightstate",
                  lightStateDefaulted: false
                }
              }
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await port.processPlaceable("token_123", {
      templateId: "plc_cot_fx01",
      includeBenchmarkMetadata: true
    });

    expect(
      result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.chunkName
    ).toBe("Red_M_Giblet");
    expect(result.placeable.renderPackage?.assetRefs.chunkModelAssetIds).toEqual([
      "asset_chunk_model_001"
    ]);
    expect(
      result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.chunkModelAssetId
    ).toBe("asset_chunk_model_001");
    expect(
      result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.chunkModelFileName
    ).toBe("red_m_giblet.glb");
    expect(
      result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.chunkModelObjectKey
    ).toBe("modules/current/__aurora/derived/models/red_m_giblet.glb");
    expect(
      result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.simulation
    ).toEqual({
      xSize: 60,
      ySize: 40,
      spawnType: 0,
      birthrate: 5,
      lifeExp: 5,
      mass: -0.75,
      velocity: 0.5,
      randvel: 0.4,
      spread: 1.0472,
      particleRot: 0.2,
      bounce: true,
      bounceCoefficient: 0.35,
      blastRadius: 2.5,
      blastLength: 1.25,
      blurLength: 1.2,
      detonate: 0.5,
      fps: 4,
      frameStart: 4,
      frameEnd: 7,
      lightningScale: 1.5,
      lightningDelay: 0.2,
      lightningRadius: 0.75,
      deadspace: 0.25,
      p2p: true,
      p2pType: "2",
      p2pBezier2: undefined,
      p2pBezier3: undefined,
      p2pSource: undefined,
      p2pTarget: undefined,
      combineTime: undefined,
      grav: 0.8,
      drag: 0.3,
      threshold: 0.4,
      inherit: true,
      inheritVel: false,
      inheritLocal: true,
      inheritPart: true,
      affectedByWind: true,
      sizeStart: 1,
      sizeMid: 4,
      sizeEnd: 6,
      sizeStartY: 0.5,
      sizeMidY: 2,
      sizeEndY: 0.75,
      alphaStart: 0.5,
      alphaMid: 0.85,
      alphaEnd: 0,
      colorStart: [0.392157, 0, 0],
      colorMid: [0.5, 0.25, 0],
      colorEnd: [0.184314, 0, 0],
      percentStart: 0.1,
      percentMid: 0.6,
      percentEnd: 0.9,
      timeline: {
        xSize: [
          { time: 0, value: 0 },
          { time: 1, value: 80 }
        ],
        ySize: [
          { time: 0, value: 0 },
          { time: 1, value: 20 }
        ],
        birthrate: [
          { time: 0, value: 0 },
          { time: 0.25, value: 18 },
          { time: 1, value: 0 }
        ],
        detonate: [
          { time: 0, value: 0 },
          { time: 0.25, value: 1 }
        ],
        sizeStart: [
          { time: 0, value: 0 },
          { time: 0.5, value: 3 },
          { time: 1, value: 1 }
        ],
        alphaStart: [
          { time: 0, value: 0 },
          { time: 0.25, value: 1 },
          { time: 1, value: 0 }
        ],
        fps: [
          { time: 0, value: 4 },
          { time: 1, value: 12 }
        ],
        frameStart: [
          { time: 0, value: 4 },
          { time: 1, value: 4 }
        ],
        frameEnd: [
          { time: 0, value: 7 },
          { time: 1, value: 7 }
        ],
        lightningScale: [
          { time: 0, value: 0.5 },
          { time: 1, value: 2 }
        ],
        lightningDelay: [
          { time: 0, value: 0.1 },
          { time: 1, value: 0.4 }
        ],
        lightningRadius: [
          { time: 0, value: 0.25 },
          { time: 1, value: 1 }
        ],
        percentStart: [
          { time: 0, value: 0 },
          { time: 1, value: 0.1 }
        ],
        percentMid: [
          { time: 0, value: 0.4 },
          { time: 1, value: 0.6 }
        ],
        percentEnd: [
          { time: 0, value: 0.8 },
          { time: 1, value: 1 }
        ]
      },
      colorTimeline: {
        colorStart: [
          { time: 0, value: [1, 0, 0] },
          { time: 0.5, value: [0, 1, 0] },
          { time: 1, value: [0, 0, 1] }
        ],
        colorMid: [
          { time: 0, value: [1, 1, 0] },
          { time: 1, value: [0, 1, 1] }
        ],
        colorEnd: [
          { time: 0, value: [0.2, 0, 0] },
          { time: 1, value: [0, 0.2, 0] }
        ]
      }
    });
    expect(
      result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.transform
    ).toEqual({
      position: [0.0466596, -0.126434, 0.0124961],
      positionTimeline: [
        { time: 0, value: [0.0466596, -0.126434, 0.0124961] },
        { time: 1, value: [0.1466596, -0.026434, 0.1124961] }
      ],
      orientation: {
        axis: [1, 0, 0],
        angleRadians: -1.42244
      },
      orientationTimeline: [
        {
          time: 0,
          value: { axis: [1, 0, 0], angleRadians: -1.42244 }
        },
        {
          time: 1,
          value: { axis: [1, 0, 0], angleRadians: -0.71122 }
        }
      ],
      scale: 1.5,
      scaleTimeline: [
        { time: 0, value: 1.5 },
        { time: 1, value: 2 }
      ]
    });
    expect(
      result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.referenceNodes
    ).toEqual([
      {
        nodeName: "REFm",
        parentNodeName: "fire!03",
        transform: {
          position: [0, 0, 0.63],
          orientation: undefined
        }
      }
    ]);
    expect(
      result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.events
    ).toEqual([
      {
        time: 0.25,
        type: "detonate",
        animationName: "impact"
      }
    ]);
    expect(
      result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.animations
    ).toEqual([
      {
        animationName: "off2on",
        lengthSeconds: 2,
        transitionSeconds: 0,
        simulation: {
          xSize: undefined,
          ySize: undefined,
          spawnType: undefined,
          birthrate: -4,
          lifeExp: undefined,
          mass: undefined,
          velocity: undefined,
          randvel: undefined,
          spread: undefined,
          particleRot: undefined,
          bounce: undefined,
          bounceCoefficient: undefined,
          blastRadius: undefined,
          blastLength: undefined,
          blurLength: undefined,
          detonate: undefined,
          lightningScale: undefined,
          lightningDelay: undefined,
          lightningRadius: undefined,
          deadspace: undefined,
          p2p: undefined,
          p2pType: undefined,
          p2pBezier2: undefined,
          p2pBezier3: undefined,
          p2pSource: undefined,
          p2pTarget: undefined,
          combineTime: undefined,
          grav: undefined,
          drag: undefined,
          threshold: undefined,
          inherit: undefined,
          inheritVel: undefined,
          inheritLocal: undefined,
          inheritPart: undefined,
          affectedByWind: undefined,
          sizeStart: undefined,
          sizeMid: undefined,
          sizeEnd: undefined,
          sizeStartY: undefined,
          sizeMidY: undefined,
          sizeEndY: undefined,
          alphaStart: undefined,
          alphaMid: undefined,
          alphaEnd: undefined,
          colorStart: undefined,
          colorMid: undefined,
          colorEnd: undefined,
          percentStart: undefined,
          percentMid: undefined,
          percentEnd: undefined,
          timeline: {
            birthrate: [
              { time: 0, value: 0 },
              { time: 1, value: 4 },
              { time: 2, value: 4 }
            ]
          },
          colorTimeline: undefined
        },
        transform: undefined
      },
      {
        animationName: "on",
        lengthSeconds: 2,
        transitionSeconds: 0,
        simulation: {
          xSize: undefined,
          ySize: undefined,
          spawnType: undefined,
          birthrate: 4,
          lifeExp: undefined,
          mass: undefined,
          velocity: undefined,
          randvel: undefined,
          spread: undefined,
          particleRot: undefined,
          bounce: undefined,
          bounceCoefficient: undefined,
          blastRadius: undefined,
          blastLength: undefined,
          blurLength: undefined,
          detonate: undefined,
          lightningScale: undefined,
          lightningDelay: undefined,
          lightningRadius: undefined,
          deadspace: undefined,
          p2p: undefined,
          p2pType: undefined,
          p2pBezier2: undefined,
          p2pBezier3: undefined,
          p2pSource: undefined,
          p2pTarget: undefined,
          combineTime: undefined,
          grav: undefined,
          drag: undefined,
          threshold: undefined,
          inherit: undefined,
          inheritVel: undefined,
          inheritLocal: undefined,
          inheritPart: undefined,
          affectedByWind: undefined,
          sizeStart: undefined,
          sizeMid: undefined,
          sizeEnd: undefined,
          sizeStartY: undefined,
          sizeMidY: undefined,
          sizeEndY: undefined,
          alphaStart: undefined,
          alphaMid: undefined,
          alphaEnd: 1,
          colorStart: undefined,
          colorMid: undefined,
          colorEnd: undefined,
          percentStart: undefined,
          percentMid: undefined,
          percentEnd: undefined,
          timeline: undefined,
          colorTimeline: undefined
        },
        transform: undefined
      }
    ]);
    expect(
      result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.sourceState
    ).toEqual({
      renderOrder: -3,
      renderHintRaw: "normaltangents",
      renderHintMode: 3,
      customShaderVS: "fx_smoke_vs",
      customShaderFS: "fx_smoke_fs",
      customShaderGS: "fx_smoke_gs",
      transparency: true,
      twoSidedMaterial: true,
      twoSidedTexture: true,
      sampleFramebuffer: 2,
      volumetric: true,
      loop: false,
      isTinted: false,
      splat: true,
      rotateTexture: true
    });
    expect(result.placeable.placeableRuntime?.state).toEqual({
      appearanceType: 11286,
      animationState: 4,
      portraitId: undefined,
      currentHitPoints: undefined,
      hardness: undefined,
      lightState: 1,
      lightStateSource: "utp.LightState",
      lightStateProofStatus: "source-backed-utp-lightstate",
      lightStateDefaulted: false
    });
  });

  it("fetches asset contracts for processed placeable cache key", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cacheKey: "cache_placeable_abc",
            moduleHash: "module_hash_123",
            assets: [
              {
                assetId: "a1",
                objectKey: "module/a1",
                contentType: "image/png",
                sizeBytes: 512,
                deliveryPath: "/api/v1/catalog/placeables/cache/cache_placeable_abc/assets/a1",
                deliveryUrl: "/api/v1/catalog/placeables/cache/cache_placeable_abc/assets/a1",
                s3Url: "https://example.test/module/a1"
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await port.getPlaceableAssetContracts("token_123", "cache_placeable_abc", [
      "a1"
    ]);

    expect(result.cacheKey).toBe("cache_placeable_abc");
    expect(result.assets).toHaveLength(1);
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/catalog/placeables/cache/cache_placeable_abc/assets/contracts?assetIds=a1",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_123" }
      })
    );
  });

  it("parses asset contracts with multiple assetIds and optional fields", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cacheKey: "cache_placeable_multi",
            assets: [
              {
                assetId: "a1",
                objectKey: "module/a1",
                contentType: "image/png",
                sizeBytes: 512,
                deliveryPath: "/api/v1/catalog/placeables/cache/cache_placeable_multi/assets/a1",
                deliveryUrl: "/api/v1/catalog/placeables/cache/cache_placeable_multi/assets/a1"
              },
              {
                assetId: "a2",
                objectKey: "module/a2",
                contentType: "application/octet-stream",
                sizeBytes: 2048,
                deliveryPath: "/api/v1/catalog/placeables/cache/cache_placeable_multi/assets/a2",
                deliveryUrl: "/api/v1/catalog/placeables/cache/cache_placeable_multi/assets/a2",
                s3Url: "https://example.test/module/a2"
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await port.getPlaceableAssetContracts(
      "token_123",
      "cache_placeable_multi",
      ["a1", "a2"]
    );

    expect(result.cacheKey).toBe("cache_placeable_multi");
    expect(result.moduleHash).toBeUndefined();
    expect(result.assets).toEqual([
      {
        assetId: "a1",
        objectKey: "module/a1",
        contentType: "image/png",
        sizeBytes: 512,
        deliveryPath: "/api/v1/catalog/placeables/cache/cache_placeable_multi/assets/a1",
        deliveryUrl: "/api/v1/catalog/placeables/cache/cache_placeable_multi/assets/a1",
        s3Url: undefined
      },
      {
        assetId: "a2",
        objectKey: "module/a2",
        contentType: "application/octet-stream",
        sizeBytes: 2048,
        deliveryPath: "/api/v1/catalog/placeables/cache/cache_placeable_multi/assets/a2",
        deliveryUrl: "/api/v1/catalog/placeables/cache/cache_placeable_multi/assets/a2",
        s3Url: "https://example.test/module/a2"
      }
    ]);
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/catalog/placeables/cache/cache_placeable_multi/assets/contracts?assetIds=a1&assetIds=a2",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_123" }
      })
    );
  });

  it("throws PlaceableApiRequestError with backend error code on non-2xx response", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "FORBIDDEN_ROLE",
            message: "Forbidden for role."
          }
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpPlaceableApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    await expect(port.listPlaceables("token_123")).rejects.toBeInstanceOf(PlaceableApiRequestError);
    await expect(port.listPlaceables("token_123")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN_ROLE"
    });
  });
});
