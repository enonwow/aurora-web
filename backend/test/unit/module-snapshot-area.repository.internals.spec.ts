import {
  __moduleSnapshotAreaRepositoryInternals
} from "../../src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository";
import type { ModuleBlobObjectSummary } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";

describe("module-snapshot-area.repository internals", () => {
  it("extracts file names and extensions from mixed key styles", () => {
    expect(__moduleSnapshotAreaRepositoryInternals.extractFileName("a/b/c/test.are")).toBe("test.are");
    expect(__moduleSnapshotAreaRepositoryInternals.extractFileName("a\\b\\c\\test.git")).toBe("test.git");
    expect(__moduleSnapshotAreaRepositoryInternals.extractExtension("  FILE.ARE ")).toBe("are");
    expect(__moduleSnapshotAreaRepositoryInternals.extractExtension(".hidden")).toBe("");
    expect(__moduleSnapshotAreaRepositoryInternals.extractBasename("town_center.are")).toBe("town_center");
    expect(__moduleSnapshotAreaRepositoryInternals.extractBasename("town_center")).toBe("town_center");
  });

  it("normalizes resrefs, names and prefixes consistently", () => {
    expect(__moduleSnapshotAreaRepositoryInternals.normalizeResref("  Town Center!@#  ")).toBe(
      "town_center_"
    );
    expect(__moduleSnapshotAreaRepositoryInternals.humanizeName("town-center_main")).toBe(
      "Town Center Main"
    );
    expect(__moduleSnapshotAreaRepositoryInternals.normalizePrefixForLookup(" /modules/current/ ")).toBe(
      "modules/current/"
    );
    expect(__moduleSnapshotAreaRepositoryInternals.normalizePrefixForLookup("   ")).toBe("");
  });

  it("handles numeric and coordinate helpers", () => {
    expect(__moduleSnapshotAreaRepositoryInternals.clamp(500, 1, 64)).toBe(64);
    expect(__moduleSnapshotAreaRepositoryInternals.clamp(-5, 1, 64)).toBe(1);
    expect(__moduleSnapshotAreaRepositoryInternals.isPositiveInt(0)).toBe(false);
    expect(__moduleSnapshotAreaRepositoryInternals.isPositiveInt(9)).toBe(true);
    expect(__moduleSnapshotAreaRepositoryInternals.clampCoordinate(Number.NaN)).toBe(0);
    expect(__moduleSnapshotAreaRepositoryInternals.clampCoordinate(1.234567)).toBe(1.2346);
    expect(__moduleSnapshotAreaRepositoryInternals.clampBearing(-45)).toBe(315);
    expect(__moduleSnapshotAreaRepositoryInternals.clampBearing(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("estimates fallback dimensions from blob size", () => {
    expect(__moduleSnapshotAreaRepositoryInternals.estimateDimensions(1).width).toBeGreaterThanOrEqual(8);
    expect(__moduleSnapshotAreaRepositoryInternals.estimateDimensions(1).height).toBeGreaterThanOrEqual(8);
    expect(__moduleSnapshotAreaRepositoryInternals.estimateDimensions(8_000_000).width).toBeLessThanOrEqual(64);
    expect(__moduleSnapshotAreaRepositoryInternals.estimateDimensions(8_000_000).height).toBeLessThanOrEqual(64);
  });

  it("classifies and maps sound helpers", () => {
    expect(
      __moduleSnapshotAreaRepositoryInternals.inferAreaSoundSourceField(
        "modules/current/sounds/ambient/amb_city_day_41.wav",
        "amb_city_day_41"
      )
    ).toBe("AmbientSoundDay");
    expect(
      __moduleSnapshotAreaRepositoryInternals.inferAreaSoundSourceField(
        "modules/current/sounds/music/mus_city_night_11.bmu",
        "mus_city_night_11"
      )
    ).toBe("MusicNight");
    expect(
      __moduleSnapshotAreaRepositoryInternals.inferAreaSoundSourceField(
        "modules/current/sounds/music/mus_city_battle_09.bmu",
        "mus_city_battle_09"
      )
    ).toBe("MusicBattle");
    expect(__moduleSnapshotAreaRepositoryInternals.buildSoundId("sound_foo")).toBe("sound_foo");
    expect(__moduleSnapshotAreaRepositoryInternals.buildSoundId("foo")).toBe("sound_foo");
    expect(__moduleSnapshotAreaRepositoryInternals.extractNumericTokens("amb_day_12_v2_12")).toEqual([2, 12]);
  });

  it("deduplicates and resolves area sounds from lookup", () => {
    const objects: ModuleBlobObjectSummary[] = [
      {
        key: "modules/current/sounds/ambient/amb_city_day_41.wav",
        size: 10,
        lastModified: "2026-05-26T00:00:00.000Z",
        etag: "1"
      },
      {
        key: "modules/current/sounds/ambient/amb_city_day_41.ogg",
        size: 11,
        lastModified: "2026-05-26T00:00:01.000Z",
        etag: "2"
      },
      {
        key: "modules/current/sounds/music/mus_city_day_11.bmu",
        size: 12,
        lastModified: "2026-05-26T00:00:02.000Z",
        etag: "3"
      }
    ];

    const lookup = __moduleSnapshotAreaRepositoryInternals.buildSnapshotSoundLookup(objects);
    const ambient = lookup.bySourceField.get("AmbientSoundDay");
    expect(ambient).toHaveLength(1);

    const resolved = __moduleSnapshotAreaRepositoryInternals.resolveAreaSoundFromLookup(
      lookup,
      "AmbientSoundDay",
      41
    );
    expect(resolved).toMatchObject({
      soundId: "sound_amb_city_day_41",
      category: "ambient"
    });
  });

  it("builds synthetic sound references with correct category and mode", () => {
    const ambient = __moduleSnapshotAreaRepositoryInternals.buildSyntheticAreaSoundReference({
      sourceField: "AmbientSoundNight",
      rawId: 7
    });
    expect(ambient).toMatchObject({
      soundId: "sound_ambient_night_7",
      category: "ambient",
      playbackMode: "interval",
      ambientOnly: true
    });

    const battle = __moduleSnapshotAreaRepositoryInternals.buildSyntheticAreaSoundReference({
      sourceField: "MusicBattle",
      rawId: 9
    });
    expect(battle).toMatchObject({
      soundId: "sound_music_battle_9",
      category: "music",
      playbackMode: "continuous",
      ambientOnly: false
    });
  });

  it("builds area candidates and picks benchmark ids from snapshot objects", () => {
    const objects: ModuleBlobObjectSummary[] = [
      {
        key: "modules/current/areas/town.are",
        size: 100,
        lastModified: "2026-05-26T00:00:00.000Z",
        etag: "a"
      },
      {
        key: "modules/current/areas/town.git",
        size: 50,
        lastModified: "2026-05-26T00:00:01.000Z",
        etag: "b"
      },
      {
        key: "modules/current/areas/city.are",
        size: 300,
        lastModified: "2026-05-26T00:00:00.000Z",
        etag: "c"
      },
      {
        key: "modules/current/areas/xx.are",
        size: 1,
        lastModified: "2026-05-26T00:00:00.000Z",
        etag: "d"
      },
      {
        key: "modules/current/readme.txt",
        size: 1,
        lastModified: "2026-05-26T00:00:00.000Z",
        etag: "e"
      }
    ];

    const candidates = __moduleSnapshotAreaRepositoryInternals.buildAreaCandidatesFromSnapshot(objects);
    expect(candidates.map((candidate) => candidate.resref)).toEqual(
      expect.arrayContaining(["town", "city"])
    );
    expect(candidates.every((candidate) => candidate.areSourceKey.endsWith(".are"))).toBe(true);

    const top = __moduleSnapshotAreaRepositoryInternals.pickBenchmarkIds(candidates);
    expect(top.size).toBeGreaterThan(0);
  });

  it("resolves dimensions from parsed area first, then tile count", () => {
    const parsed = {
      parsedArea: {
        width: 24,
        height: 20,
        tileCount: 400
      },
      areSourceSize: 10
    } as const;
    const exact = __moduleSnapshotAreaRepositoryInternals.resolveDimensions(parsed as never);
    expect(exact).toEqual({ width: 24, height: 20 });

    const derived = __moduleSnapshotAreaRepositoryInternals.resolveDimensions(
      {
        parsedArea: {
          tileCount: 300
        },
        areSourceSize: 10
      } as never
    );
    expect(derived.width).toBeGreaterThanOrEqual(8);
    expect(derived.height).toBeGreaterThanOrEqual(8);
  });

  it("keeps SET ImageMap2D on parsed tile blueprints", () => {
    const tiles = __moduleSnapshotAreaRepositoryInternals.parseAuroraSetTiles(
      Buffer.from(
        [
          "[TILE231]",
          "Model=sic11_a01_12",
          "Orientation=90",
          "ImageMap2D=mi_sic11_a01_12"
        ].join("\n"),
        "utf-8"
      )
    );

    expect(tiles.get(231)).toMatchObject({
      tileId: 231,
      modelResRef: "sic11_a01_12",
      orientation: 1,
      imageMap2D: "mi_sic11_a01_12"
    });
  });

  it("processes all values in mapWithConcurrency", async () => {
    const input = [1, 2, 3, 4, 5, 6];
    const output: number[] = [];
    await __moduleSnapshotAreaRepositoryInternals.mapWithConcurrency(
      input,
      3,
      async (value) => {
        output.push(value);
      }
    );
    expect(output.sort((a, b) => a - b)).toEqual(input);
  });
});
