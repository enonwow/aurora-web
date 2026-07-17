import { createHash } from "node:crypto";
import {
  buildPlaceableProcessCacheKey,
  buildTemplateProcessCacheKey,
  CREATURE_TEMPLATE_RENDER_FINGERPRINT,
  DEFAULT_PLACEABLE_PROCESS_FINGERPRINT,
  ITEM_TEMPLATE_RENDER_FINGERPRINT
} from "../../src/modules/catalog/domain/cache-key.builders";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../src/modules/runtime-settings/domain/derived-asset-versions";
import { buildTileProcessCacheKey } from "../../src/modules/tiles/domain/tile-processing.builders";
import type { TileRecord } from "../../src/modules/tiles/domain/tile.types";

describe("cache key builders", () => {
  it("versions placeable process cache keys by physical placeables.2da row lookup", () => {
    expect(DEFAULT_PLACEABLE_PROCESS_FINGERPRINT).toContain(
      "appearance-lookup:v5-instance-alias-box-tokens"
    );
  });

  it("includes the Aurora MDL converter version in placeable process cache keys", () => {
    const expected = createHash("sha256")
      .update(
        [
          "placeable-process/v7",
          AURORA_MDL_TO_GLB_CONVERTER_VERSION,
          "plc_nw2barrel4",
          "nw2barrel4",
          "container",
          DEFAULT_PLACEABLE_PROCESS_FINGERPRINT
        ].join("|")
      )
      .digest("hex");

    expect(buildPlaceableProcessCacheKey("plc_nw2barrel4", "nw2barrel4", "container")).toBe(
      expected
    );
  });

  it("includes the Aurora MDL converter version in model-backed template process cache keys", () => {
    expect(buildTemplateProcessCacheKey("creature", "creature_001", "creature_001")).toMatch(
      /^[a-f0-9]{64}$/u
    );
  });

  it("versions creature template process cache keys by render-contract fingerprint", () => {
    const expected = createHash("sha256")
      .update(
        `template-process/v2|creature|creature_001|creature_001|stable|${CREATURE_TEMPLATE_RENDER_FINGERPRINT}|${AURORA_MDL_TO_GLB_CONVERTER_VERSION}`
      )
      .digest("hex");

    expect(buildTemplateProcessCacheKey("creature", "creature_001", "creature_001")).toBe(
      expected
    );
  });

  it("versions item template process cache keys by render-contract fingerprint", () => {
    const expected = createHash("sha256")
      .update(
        `template-process/v2|item|itm_item004|item004|stable|${ITEM_TEMPLATE_RENDER_FINGERPRINT}|${AURORA_MDL_TO_GLB_CONVERTER_VERSION}`
      )
      .digest("hex");

    expect(buildTemplateProcessCacheKey("item", "itm_item004", "item004")).toBe(expected);
  });

  it("includes the Aurora MDL converter version in tile process cache keys", () => {
    const tile: TileRecord = {
      tileId: "tile_sic11_f03_01",
      resref: "sic11_f03_01",
      name: "Tile",
      tileset: "sic11",
      variant: "f03_01",
      tags: ["interior"],
      benchmark: true,
      previewImageUrl: "/preview.webp",
      textureAtlasId: "atlas_sic11_v1",
      textureAtlasObjectKey: "modules/current/tiles/atlases/atlas_sic11_v1.webp",
      textureAtlasContentType: "image/webp",
      textureAtlasSizeBytes: 262144,
      textureAtlasEtag: "atlas-sic11-v1",
      textureAtlasFingerprint: "static:atlas:sic11",
      sourceAssetObjectKey: "modules/current/__aurora/sources/hak/_sic11/sic11_f03_01.mdl",
      sourceAssetExtension: "mdl",
      sourceAssetSizeBytes: 1024,
      sourceAssetEtag: "mdl-v1",
      sourceAssetOrigin: "module-snapshot",
      renderModelObjectKey: "modules/current/__aurora/derived/models/sic11_f03_01.glb",
      renderModelExtension: "glb",
      renderModelSizeBytes: 2048,
      renderModelEtag: "glb-v1",
      walkmesh: "walkable",
      metrics: {
        triangles: 10,
        meshes: 2,
        emitters: 0
      },
      updatedAt: "2026-05-25T00:00:00.000Z"
    };
    const expected = createHash("sha256")
      .update(
        `tile-process/v13|${AURORA_MDL_TO_GLB_CONVERTER_VERSION}|tile_sic11_f03_01|sic11_f03_01|sic11|f03_01|atlas_sic11_v1|modules/current/tiles/atlases/atlas_sic11_v1.webp|image/webp|262144|atlas-sic11-v1|static:atlas:sic11|modules/current/__aurora/sources/hak/_sic11/sic11_f03_01.mdl|mdl|1024|mdl-v1|module-snapshot|modules/current/__aurora/derived/models/sic11_f03_01.glb|glb|2048|glb-v1|walkable`
      );
    expected.update("|10|2|0");
    expected.update("|interior");

    expect(buildTileProcessCacheKey(tile)).toBe(expected.digest("hex"));
  });
});
