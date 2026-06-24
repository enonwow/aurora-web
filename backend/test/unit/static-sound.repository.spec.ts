import { StaticSoundRepository } from "../../src/modules/sounds/adapters/outbound/memory/static-sound.repository";

describe("StaticSoundRepository", () => {
  let repository: StaticSoundRepository;

  beforeEach(() => {
    repository = new StaticSoundRepository();
  });

  it("lists all static sounds with pagination metadata", async () => {
    const result = await repository.list({
      limit: 20,
      offset: 0
    });

    expect(result.total).toBeGreaterThanOrEqual(5);
    expect(result.limit).toBe(20);
    expect(result.offset).toBe(0);
    expect(result.items[0]).toMatchObject({
      soundId: expect.any(String),
      category: expect.any(String),
      format: expect.any(String),
      source: {
        layer: "module"
      },
      auroraUsage: expect.any(Object)
    });
  });

  it("filters by query, category, tag and benchmark", async () => {
    const filtered = await repository.list({
      query: "forge",
      category: "effect",
      tag: "METAL",
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(filtered.total).toBe(1);
    expect(filtered.items[0]).toMatchObject({
      soundId: "sound_effect_forge_loop_003",
      category: "effect",
      benchmark: true
    });
  });

  it("applies pagination offset and limit", async () => {
    const first = await repository.list({
      limit: 2,
      offset: 0
    });
    const second = await repository.list({
      limit: 2,
      offset: 2
    });

    expect(first.items).toHaveLength(2);
    expect(second.items).toHaveLength(2);
    expect(first.items[0].soundId).not.toBe(second.items[0].soundId);
  });

  it("filters by aurora binding/source/defaults table and format", async () => {
    const filtered = await repository.list({
      bindingKey: "GI_sound_pos",
      sourceField: "PlacedSound",
      defaultsTable: "sounddefaultspos",
      format: "wav",
      spatialMode: "3d",
      limit: 20,
      offset: 0
    });

    expect(filtered.total).toBe(1);
    expect(filtered.items[0]).toMatchObject({
      soundId: "sound_effect_forge_loop_003",
      format: "wav",
      auroraUsage: {
        bindingKey: "GI_sound_pos",
        sourceField: "PlacedSound",
        defaultsTable: "sounddefaultspos"
      }
    });
  });

  it("returns sound by id with reverse mapping metadata", async () => {
    const sound = await repository.findById("sound_ambient_city_market_001");

    expect(sound).not.toBeNull();
    expect(sound?.reverseMapping).toMatchObject({
      palette: "soundpalstd",
      soundPalette: "soundpal",
      soundSetTable: "soundset"
    });
    expect(sound?.playback).toMatchObject({
      mode: "interval",
      ambientOnly: true
    });
    expect(sound?.auroraUsage).toMatchObject({
      bindingKey: "GI_sound_area",
      sourceField: "AmbientSoundDay"
    });
    expect(sound?.reverseMapping).toMatchObject({
      soundDefaultsTimingTable: "sounddefaultstim",
      soundDefaultsPositionTable: "sounddefaultspos"
    });
  });

  it("keeps native BMU format for music assets", async () => {
    const sound = await repository.findById("sound_music_city_theme_002");
    expect(sound?.format).toBe("bmu");
  });

  it("returns null for unknown sound id", async () => {
    await expect(repository.findById("sound_unknown")).resolves.toBeNull();
  });

  it("returns precomputed processing cache key for known sound", () => {
    const precomputed = repository.getPrecomputedSoundProcessing("sound_ambient_city_market_001");

    expect(precomputed).toEqual({
      cacheKey: expect.stringMatching(/^[a-f0-9]{64}$/u)
    });
  });

  it("returns null precomputed key for unknown sound", () => {
    expect(repository.getPrecomputedSoundProcessing("sound_unknown")).toBeNull();
  });
});
