import { describe, expect, it } from "vitest";
import {
  MAX_EFFECTIVE_AREA_AUDIO_CATALOG_BUNDLE_BYTES,
  cloneEffectiveAreaAudioCatalogBundle,
  isEffectiveAreaAudioCatalogBundle,
  resolveEffectiveAreaAudioRows,
} from "../../../../src/modules/areas/domain/effectiveAreaAudioCatalog";
import { effectiveAreaAudioCatalogBundle } from "./areaAudioCatalogFixture";

describe("effective Area audio catalog domain", () => {
  it("validates, clones, and filters exact physical rows by native selector family", () => {
    const catalogs = effectiveAreaAudioCatalogBundle();
    expect(isEffectiveAreaAudioCatalogBundle(catalogs)).toBe(true);

    const clone = cloneEffectiveAreaAudioCatalogBundle(catalogs);
    expect(clone).toEqual(catalogs);
    expect(clone).not.toBe(catalogs);
    expect(Object.isFrozen(clone)).toBe(true);
    expect(Object.isFrozen(clone.ambientMusic.rows)).toBe(true);
    expect(resolveEffectiveAreaAudioRows(clone, "musicBattleId").map((row) => row.rowIndex))
      .toEqual([13]);
    expect(resolveEffectiveAreaAudioRows(clone, "musicDayId").map((row) => row.rowIndex))
      .toEqual([11, 12]);
  });

  it("rejects an otherwise exact bundle above the serialized 2 MiB response budget", () => {
    const rowCount = 700;
    const displayName = "A".repeat(1024);
    const catalog = (
      resourceName: "ambientsound.2da" | "ambientmusic.2da" | "soundeax.2da",
    ) => ({
      descriptor: {
        resourceName,
        sourceObjectKey: `module/${resourceName}`,
        sourceLayer: "module" as const,
        sha256: "a".repeat(64),
        sizeBytes: 64,
        rowCount,
      },
      rows: Array.from({ length: rowCount }, (_, rowIndex) => ({
        rowIndex,
        ...(resourceName === "ambientmusic.2da" ? { battleEligible: false } : {}),
        displayName,
        displaySource: "row_index" as const,
      })),
    });
    const oversized = {
      schemaVersion: "area-audio-environment-catalogs.v1",
      ambientSound: catalog("ambientsound.2da"),
      ambientMusic: catalog("ambientmusic.2da"),
      environmentalAudio: catalog("soundeax.2da"),
    };

    expect(new TextEncoder().encode(JSON.stringify(oversized)).byteLength).toBeGreaterThan(
      MAX_EFFECTIVE_AREA_AUDIO_CATALOG_BUNDLE_BYTES,
    );
    expect(isEffectiveAreaAudioCatalogBundle(oversized)).toBe(false);
  });
});
