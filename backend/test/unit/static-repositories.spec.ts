import { StaticAreaRepository } from "../../src/modules/areas/adapters/outbound/memory/static-area.repository";
import { StaticTemplateCatalogRepository } from "../../src/modules/catalog/adapters/outbound/memory/static-template-catalog.repository";
import { StaticSoundRepository } from "../../src/modules/sounds/adapters/outbound/memory/static-sound.repository";
import { StaticTileRepository } from "../../src/modules/tiles/adapters/outbound/memory/static-tile.repository";

describe("Static repositories", () => {
  it("filters and resolves template catalog entries", async () => {
    const repository = new StaticTemplateCatalogRepository();

    const allPlaceables = await repository.listByKind("placeable", {
      limit: 50,
      offset: 0
    });
    expect(allPlaceables.total).toBeGreaterThan(0);

    const byQuery = await repository.listByKind("placeable", {
      query: "market",
      limit: 50,
      offset: 0
    });
    expect(byQuery.items.some((item) => item.templateId === "plc_market_stall_001")).toBe(true);

    const bySubtype = await repository.listByKind("placeable", {
      subtype: "door",
      limit: 50,
      offset: 0
    });
    expect(bySubtype.items.every((item) => item.kind === "placeable")).toBe(true);
    expect(bySubtype.items.every((item) => item.placeableSubtype === "door")).toBe(true);

    const byBenchmark = await repository.listByKind("placeable", {
      benchmark: true,
      limit: 50,
      offset: 0
    });
    expect(byBenchmark.items.every((item) => Boolean(item.benchmarkCandidate))).toBe(true);

    await expect(
      repository.findByKindAndId("creature", "cre_guard_human_001")
    ).resolves.toMatchObject({
      templateId: "cre_guard_human_001",
      kind: "creature"
    });
    await expect(
      repository.findByKindAndResref("item", "ITM_POTION_HEALTH")
    ).resolves.toMatchObject({
      templateId: "itm_health_potion_001",
      kind: "item"
    });
    await expect(repository.findByKindAndId("item", "missing")).resolves.toBeNull();

    expect(
      repository.getPrecomputedPlaceableCacheKey("plc_market_stall_001", "generic")
    ).toEqual(expect.stringMatching(/^[a-f0-9]{64}$/u));
    expect(repository.getPrecomputedTemplateCacheKey("creature", "cre_guard_human_001")).toEqual(
      expect.stringMatching(/^[a-f0-9]{64}$/u)
    );
    expect(repository.getPrecomputedTemplateCacheKey("item", "unknown")).toBeNull();
  });

  it("filters and resolves static areas", async () => {
    const repository = new StaticAreaRepository();

    const list = await repository.list({
      query: "market",
      limit: 20,
      offset: 0
    });
    expect(list.total).toBeGreaterThan(0);
    expect(list.items[0].areaId).toBe("area_market_district_001");

    const byBiome = await repository.list({
      biome: "dungeon",
      limit: 20,
      offset: 0
    });
    expect(byBiome.items.every((item) => item.biome === "dungeon")).toBe(true);

    const byTag = await repository.list({
      tag: "combat",
      limit: 20,
      offset: 0
    });
    expect(byTag.items.map((item) => item.areaId)).toContain("area_dungeon_entry_001");

    const byBenchmark = await repository.list({
      benchmark: false,
      limit: 20,
      offset: 0
    });
    expect(byBenchmark.items.every((item) => item.benchmark === false)).toBe(true);

    await expect(repository.findById("area_market_district_001")).resolves.toMatchObject({
      areaId: "area_market_district_001"
    });
    await expect(repository.findById("missing")).resolves.toBeNull();

    expect(repository.getPrecomputedAreaProcessing("area_market_district_001")).toEqual({
      cacheKey: expect.stringMatching(/^[a-f0-9]{64}$/u),
      composition: expect.any(Object)
    });
    expect(repository.getPrecomputedAreaProcessing("missing")).toBeNull();
  });

  it("filters and resolves static tiles", async () => {
    const repository = new StaticTileRepository();

    const list = await repository.list({
      query: "city",
      limit: 20,
      offset: 0
    });
    expect(list.total).toBeGreaterThan(0);

    const byTileset = await repository.list({
      tileset: "dungeon",
      limit: 20,
      offset: 0
    });
    expect(byTileset.items.every((item) => item.tileset === "dungeon")).toBe(true);

    const byTag = await repository.list({
      tag: "water",
      limit: 20,
      offset: 0
    });
    expect(byTag.items.map((item) => item.tileId)).toContain("tile_swamp_water_003");

    const byBenchmark = await repository.list({
      benchmark: true,
      limit: 20,
      offset: 0
    });
    expect(byBenchmark.items.every((item) => item.benchmark === true)).toBe(true);

    await expect(repository.findById("tile_city_street_001")).resolves.toMatchObject({
      tileId: "tile_city_street_001"
    });
    await expect(repository.findById("missing")).resolves.toBeNull();
    expect(repository.getPrecomputedTileProcessing("tile_city_street_001")).toEqual({
      cacheKey: expect.stringMatching(/^[a-f0-9]{64}$/u)
    });
  });

  it("filters and resolves static sounds", async () => {
    const repository = new StaticSoundRepository();

    const list = await repository.list({
      query: "city",
      limit: 20,
      offset: 0
    });
    expect(list.total).toBeGreaterThan(0);

    const byCategory = await repository.list({
      category: "effect",
      limit: 20,
      offset: 0
    });
    expect(byCategory.items.every((item) => item.category === "effect")).toBe(true);

    const byTag = await repository.list({
      tag: "loop",
      limit: 20,
      offset: 0
    });
    expect(byTag.total).toBeGreaterThan(0);

    const byBenchmark = await repository.list({
      benchmark: false,
      limit: 20,
      offset: 0
    });
    expect(byBenchmark.items.every((item) => item.benchmark === false)).toBe(true);

    await expect(repository.findById("sound_effect_door_creak_005")).resolves.toMatchObject({
      soundId: "sound_effect_door_creak_005"
    });
    await expect(repository.findById("missing")).resolves.toBeNull();
    expect(repository.getPrecomputedSoundProcessing("sound_effect_door_creak_005")).toEqual({
      cacheKey: expect.stringMatching(/^[a-f0-9]{64}$/u)
    });
  });
});
