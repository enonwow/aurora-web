import { describe, expect, it, vi } from "vitest";
import {
  AreaApiRequestError,
  HttpAreaApiPort
} from "../../../../src/modules/areas/adapters/httpAreaApiPort";

describe("HttpAreaApiPort", () => {
  it("logs in and returns backend access token", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            session: {
              accessToken: "token_123"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.login("viewer.user", "viewer123");

    expect(result.accessToken).toBe("token_123");
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/auth/login",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("lists areas with encoded query params", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [
              {
                areaId: "area_001",
                name: "Area One",
                biome: "urban",
                width: 24,
                height: 24,
                tags: ["benchmark"],
                benchmark: true,
                previewImageUrl: "/assets/previews/areas/area_001.webp",
                textureAtlasId: "atlas_area_001",
                objectCounts: {
                  placeables: 2,
                  doors: 1,
                  creatures: 3,
                  items: 4,
                  sounds: 5,
                  total: 15
                },
                updatedAt: "2026-05-27T10:00:00.000Z"
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
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.listAreas("token_abc", {
      query: "market",
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.areaId).toBe("area_001");
    expect(result.items[0]).toMatchObject({
      previewImageUrl: "/assets/previews/areas/area_001.webp",
      textureAtlasId: "atlas_area_001",
      objectCounts: {
        placeables: 2,
        doors: 1,
        creatures: 3,
        items: 4,
        sounds: 5,
        total: 15
      }
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas?query=market&benchmark=true&limit=20&offset=0",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      })
    );
  });

  it("fetches area detail and maps object placements", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            areaId: "area_001",
            name: "Area One",
            biome: "urban",
            width: 24,
            height: 24,
            tags: ["city"],
            benchmark: false,
            previewImageUrl: "/assets/previews/areas/area_001.webp",
            textureAtlas: {
              atlasId: "atlas_area_001",
              cacheKey: "atlas_area_001:24x24",
              strategy: "blob-cache",
              objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
              contentType: "image/webp",
              sizeBytes: 262144,
              etag: "atlas-area-001"
            },
            tileSet: "tno01",
            tiles: [
              {
                tileInstanceId: "area_001:tile:0",
                areaId: "area_001",
                tilesetResRef: "tno01",
                row: 0,
                col: 0,
                tileIndex: 0,
                tileId: 101,
                modelResRef: "tno01_a01_01",
                modelSource: "set-tile-section",
                orientation: 1,
                height: 0.5,
                source: "are-tile-list"
              },
              {
                tileInstanceId: "area_001:tile:1",
                areaId: "area_001",
                tilesetResRef: "tno01",
                row: 0,
                col: 1,
                tileIndex: 1,
                tileId: 102,
                orientation: 2,
                source: "are-tile-list",
                fallbackReason: "tile-model-reference-missing"
              }
            ],
            composition: {
              placeables: 1,
              doors: 1,
              creatures: 0,
              items: 0,
              sounds: 1,
              total: 3
            },
            updatedAt: "2026-05-27T10:00:00.000Z",
            objects: [
              {
                objectId: "obj_1",
                kind: "placeable",
                templateId: "plc_market_stall_001",
                x: 1,
                y: 2,
                z: 0,
                bearing: 90
              },
              {
                objectId: "obj_door_1",
                kind: "door",
                templateId: "utd_city_gate_01",
                x: 2,
                y: 3,
                z: 0,
                bearing: 45
              },
              {
                objectId: "obj_sound_1",
                kind: "sound",
                templateId: "sfx_forge_loop_heavy",
                x: 4,
                y: 5,
                z: 1,
                bearing: 0,
                soundPositioning: {
                  mode: "specific",
                  elevation: 1,
                  maxVolumeDistance: 2,
                  cutoffDistance: 16,
                  randomRangeWestEast: 0,
                  randomRangeNorthSouth: 0,
                  preserve: {
                    timeWindow: "",
                    hourMask: "",
                    active: true,
                    whenToPlay: "always",
                    dayNight: "both",
                    playStyle: "loop",
                    playOrder: "sequential",
                    intervalMs: 6000,
                    intervalVariationMs: 0,
                    volume: 0.85,
                    volumeVariation: 0,
                    pitchVariation: 0,
                    priority: 1,
                    flags: {
                      active: true,
                      looping: true,
                      positional: true
                    },
                    extra: {
                      auroraSoundList: "sfx_forge_loop_heavy"
                    }
                  }
                }
              }
            ]
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaById("token_abc", "area_001");

    expect(result.areaId).toBe("area_001");
    expect(result.previewImageUrl).toBe("/assets/previews/areas/area_001.webp");
    expect(result.textureAtlas).toMatchObject({
      atlasId: "atlas_area_001",
      objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
      contentType: "image/webp"
    });
    expect(result.tileSet).toBe("tno01");
    expect(result.tiles).toEqual([
      {
        tileInstanceId: "area_001:tile:0",
        areaId: "area_001",
        tilesetResRef: "tno01",
        row: 0,
        col: 0,
        tileIndex: 0,
        tileId: 101,
        modelResRef: "tno01_a01_01",
        modelSource: "set-tile-section",
        orientation: 1,
        height: 0.5,
        source: "are-tile-list"
      },
      {
        tileInstanceId: "area_001:tile:1",
        areaId: "area_001",
        tilesetResRef: "tno01",
        row: 0,
        col: 1,
        tileIndex: 1,
        tileId: 102,
        orientation: 2,
        source: "are-tile-list",
        fallbackReason: "tile-model-reference-missing"
      }
    ]);
    expect(result.composition).toMatchObject({
      placeables: 1,
      doors: 1,
      sounds: 1,
      total: 3
    });
    expect(result.objects).toHaveLength(3);
    expect(result.objects[0]?.kind).toBe("placeable");
    expect(result.objects[1]?.kind).toBe("door");
    expect(result.objects[2]).toMatchObject({
      kind: "sound",
      soundPositioning: {
        mode: "specific",
        preserve: {
          playStyle: "loop",
          extra: {
            auroraSoundList: "sfx_forge_loop_heavy"
          }
        }
      }
    });
  });

  it("processes an area and preserves backend cache and processed metadata", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: {
              key: "4f8c2a1b9e7d6c5a",
              hit: false,
              storedAt: "2026-06-16T18:20:00.000Z",
              hits: 0
            },
            area: {
              areaId: "area_001",
              name: "Area One",
              biome: "urban",
              width: 24,
              height: 24,
              tags: ["city"],
              benchmark: false,
              previewImageUrl: "/assets/previews/areas/area_001.webp",
              textureAtlas: {
                atlasId: "atlas_area_001",
                cacheKey: "atlas_area_001:24x24",
                strategy: "blob-cache",
                objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
                contentType: "image/webp",
                sizeBytes: 262144,
                etag: "atlas-area-001"
              },
              soundscape: {
                bindingKeys: {
                  areaKey: "GI_sound_area",
                  randomKey: "GI_sound_rndm",
                  positionalKey: "GI_sound_pos"
                },
                area: [],
                random: [],
                positional: []
              },
              composition: {
                placeables: 1,
                doors: 1,
                creatures: 1,
                items: 1,
                sounds: 1,
                total: 5
              },
              updatedAt: "2026-05-27T10:00:00.000Z",
              processedAt: "2026-06-16T18:20:00.000Z",
              objects: [
                {
                  objectId: "obj_sound_1",
                  kind: "sound",
                  templateId: "sfx_forge_loop_heavy",
                  x: 4,
                  y: 5,
                  z: 1,
                  bearing: 0,
                  soundPositioning: {
                    mode: "specific",
                    elevation: 1,
                    maxVolumeDistance: 2,
                    cutoffDistance: 16,
                    randomRangeWestEast: 0,
                    randomRangeNorthSouth: 0
                  }
                }
              ]
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.processArea("token_abc", "area_001", { bypassCache: true });

    expect(result.cache).toMatchObject({
      key: "4f8c2a1b9e7d6c5a",
      hit: false,
      hits: 0
    });
    expect(result.area).toMatchObject({
      areaId: "area_001",
      previewImageUrl: "/assets/previews/areas/area_001.webp",
      processedAt: "2026-06-16T18:20:00.000Z",
      composition: {
        placeables: 1,
        doors: 1,
        creatures: 1,
        items: 1,
        sounds: 1,
        total: 5
      }
    });
    expect(result.area.objects[0]).toMatchObject({
      kind: "sound",
      soundPositioning: {
        mode: "specific",
        elevation: 1
      }
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/area_001/process",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token_abc",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bypassCache: true })
      })
    );
  });

  it("fetches proxy texture atlas delivery contracts for a processed area cache", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cacheKey: "4f8c2a1b9e7d6c5a",
            textureAtlas: {
              mode: "proxy",
              atlasId: "atlas_area_001",
              objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
              contentType: "image/webp",
              sizeBytes: 262144,
              etag: "atlas-area-001",
              proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
              proxyUrl: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaTextureAtlasContracts("token_abc", "4f8c2a1b9e7d6c5a");

    expect(result).toMatchObject({
      cacheKey: "4f8c2a1b9e7d6c5a",
      textureAtlas: {
        mode: "proxy",
        atlasId: "atlas_area_001",
        proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures"
      }
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures/contracts?mode=proxy",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_abc" }
      })
    );
  });

  it("fetches direct texture atlas delivery contracts when backend exposes direct delivery", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cacheKey: "4f8c2a1b9e7d6c5a",
            textureAtlas: {
              mode: "direct",
              atlasId: "atlas_area_001",
              objectKey: "modules/current/areas/atlases/atlas_area_001.webp",
              contentType: "image/webp",
              sizeBytes: 262144,
              proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
              proxyUrl: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
              directUrl: "https://assets.example.test/modules/current/areas/atlases/atlas_area_001.webp",
              s3Url: "s3://aurora-modules/modules/current/areas/atlases/atlas_area_001.webp"
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    const result = await port.getAreaTextureAtlasContracts(
      "token_abc",
      "4f8c2a1b9e7d6c5a",
      "direct"
    );

    expect(result.textureAtlas).toMatchObject({
      mode: "direct",
      directUrl: "https://assets.example.test/modules/current/areas/atlases/atlas_area_001.webp",
      s3Url: "s3://aurora-modules/modules/current/areas/atlases/atlas_area_001.webp"
    });
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures/contracts?mode=direct",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("surfaces backend texture delivery contract failures without fallback behavior", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "AREA_DIRECT_DELIVERY_UNAVAILABLE",
            message: "Direct area delivery is unavailable without blob storage settings."
          }
        }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(
      port.getAreaTextureAtlasContracts("token_abc", "4f8c2a1b9e7d6c5a", "direct")
    ).rejects.toMatchObject({
      status: 422,
      code: "AREA_DIRECT_DELIVERY_UNAVAILABLE"
    });
  });

  it("throws AreaApiRequestError with backend code on non-2xx response", async () => {
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
    const port = new HttpAreaApiPort(fetchStub as unknown as typeof fetch, "http://localhost:3000/api/v1");

    await expect(port.listAreas("token_bad")).rejects.toBeInstanceOf(AreaApiRequestError);
    await expect(port.listAreas("token_bad")).rejects.toMatchObject({
      status: 403,
      code: "FORBIDDEN_ROLE"
    });
  });
});
