import { describe, expect, it, vi } from "vitest";
import {
  HttpSoundApiPort,
  SoundApiRequestError
} from "../../../../src/modules/sounds/adapters/httpSoundApiPort";

function buildSoundListItem() {
  return {
    soundId: "sound_ambient_city_market_001",
    resref: "amb_city_market_day",
    name: "City Market Day",
    category: "ambient",
    format: "ogg",
    tags: ["city", "market"],
    benchmark: true,
    previewWaveformUrl: "/assets/previews/sounds/city-market-day.webp",
    spatialMode: "2d",
    playbackMode: "looping",
    source: {
      layer: "module"
    },
    auroraUsage: {
      bindingKey: "GI_sound_area",
      sourceField: "AmbientSoundDay",
      defaultsTable: "sounddefaultstim"
    },
    metrics: {
      durationMs: 1234,
      cues: 1,
      emitters: 0
    },
    updatedAt: "2026-06-16T10:00:00.000Z"
  } as const;
}

describe("HttpSoundApiPort", () => {
  it("lists sounds with Aurora query params and bearer auth", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            items: [buildSoundListItem()],
            total: 1,
            limit: 20,
            offset: 0
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpSoundApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const result = await port.listSounds("token_123", {
      query: "market",
      bindingKey: "GI_sound_area",
      sourceField: "AmbientSoundDay",
      format: "ogg",
      spatialMode: "2d",
      limit: 20,
      offset: 0
    });

    expect(result.items[0]?.soundId).toBe("sound_ambient_city_market_001");
    expect(result.items[0]?.source.layer).toBe("module");
    expect(result.items[0]?.auroraUsage.bindingKey).toBe("GI_sound_area");
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:3000/api/v1/catalog/sounds?query=market&format=ogg&spatialMode=2d&bindingKey=GI_sound_area&sourceField=AmbientSoundDay&limit=20&offset=0",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_123" }
      })
    );
  });

  it("processes a sound and resolves proxy audio contract + blob", async () => {
    const audioBlob = new Blob(["audio"], { type: "audio/ogg" });
    const fetchStub = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              cache: {
                key: "cache_sound_abc",
                hit: false,
                storedAt: "2026-06-16T10:00:00.000Z",
                hits: 0
              },
              sound: {
                ...buildSoundListItem(),
                audio: {
                  assetId: "asset_sound_001",
                  cacheKey: "audio/ambient/amb_city_market_day:sound_ambient_city_market_001",
                  strategy: "blob-cache",
                  objectKey: "modules/current/audio/ambient/amb_city_market_day.ogg",
                  contentType: "audio/ogg",
                  sizeBytes: 512,
                  format: "ogg",
                  sampleRateHz: 44100,
                  channels: 2
                },
                spatial: {
                  mode: "2d",
                  loop: true
                },
                playback: {
                  mode: "looping",
                  ambientOnly: true
                },
                render: {
                  backendType: "sound",
                  frontendType: "sound",
                  playbackPreset: "ambient-loop"
                },
                processedAt: "2026-06-16T10:00:01.000Z"
              }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              cacheKey: "cache_sound_abc",
              audio: {
                mode: "proxy",
                assetId: "asset_sound_001",
                objectKey: "modules/current/audio/ambient/amb_city_market_day.ogg",
                contentType: "audio/ogg",
                sizeBytes: 512,
                proxyPath: "/api/v1/catalog/sounds/cache/cache_sound_abc/audio",
                proxyUrl: "/api/v1/catalog/sounds/cache/cache_sound_abc/audio"
              }
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      )
      .mockResolvedValueOnce(
        new Response(audioBlob, { status: 200, headers: { "Content-Type": "audio/ogg" } })
      );
    const port = new HttpSoundApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    const processed = await port.processSound("token_123", "sound_ambient_city_market_001", {
      bypassCache: false
    });
    const contracts = await port.getSoundAudioContracts("token_123", processed.cacheKey, "proxy");
    const blob = await port.getSoundAudioBlob("token_123", processed.cacheKey);

    expect(processed.cacheKey).toBe("cache_sound_abc");
    expect(processed.sound.render.frontendType).toBe("sound");
    expect(contracts.audio.proxyPath).toBe("/api/v1/catalog/sounds/cache/cache_sound_abc/audio");
    expect(blob.type).toBe("audio/ogg");
    expect(fetchStub).toHaveBeenNthCalledWith(
      1,
      "http://localhost:3000/api/v1/catalog/sounds/sound_ambient_city_market_001/process",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token_123",
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({ bypassCache: false })
      })
    );
    expect(fetchStub).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/api/v1/catalog/sounds/cache/cache_sound_abc/audio/contracts?mode=proxy",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_123" }
      })
    );
    expect(fetchStub).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3000/api/v1/catalog/sounds/cache/cache_sound_abc/audio",
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer token_123" }
      })
    );
  });

  it("throws SoundApiRequestError with backend code on audio failure", async () => {
    const fetchStub = vi.fn(async () =>
      new Response(
        JSON.stringify({
          error: {
            code: "SOUND_AUDIO_BLOB_NOT_FOUND",
            message: "Sound audio blob was not found."
          }
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      )
    );
    const port = new HttpSoundApiPort(
      fetchStub as unknown as typeof fetch,
      "http://localhost:3000/api/v1"
    );

    await expect(port.getSoundAudioBlob("token_123", "cache_missing")).rejects.toBeInstanceOf(
      SoundApiRequestError
    );
    await expect(port.getSoundAudioBlob("token_123", "cache_missing")).rejects.toMatchObject({
      status: 404,
      code: "SOUND_AUDIO_BLOB_NOT_FOUND"
    });
  });
});
