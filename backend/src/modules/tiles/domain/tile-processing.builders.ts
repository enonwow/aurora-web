import { createHash } from "node:crypto";
import type { TileRecord } from "./tile.types";

export function buildTileProcessCacheKey(tile: TileRecord): string {
  const hash = createHash("sha256");
  hash.update(
    `tile-process/v4|${tile.tileId}|${tile.resref}|${tile.tileset}|${tile.variant}|${tile.textureAtlasId}|${tile.textureAtlasObjectKey}|${tile.textureAtlasContentType}|${tile.textureAtlasSizeBytes}|${tile.textureAtlasEtag ?? ""}|${tile.textureAtlasFingerprint}|${tile.sourceAssetObjectKey ?? ""}|${tile.sourceAssetExtension ?? ""}|${tile.sourceAssetSizeBytes ?? ""}|${tile.sourceAssetEtag ?? ""}|${tile.sourceAssetOrigin ?? ""}|${tile.renderModelObjectKey ?? ""}|${tile.renderModelExtension ?? ""}|${tile.renderModelSizeBytes ?? ""}|${tile.renderModelEtag ?? ""}|${tile.walkmesh}|${tile.updatedAt}`
  );
  hash.update(`|${tile.metrics.triangles}|${tile.metrics.meshes}|${tile.metrics.emitters}`);

  for (const tag of tile.tags) {
    hash.update(`|${tag}`);
  }

  return hash.digest("hex");
}

export function buildTileRendererPreset(tile: TileRecord): "tile-standard" | "tile-water" {
  return tile.walkmesh === "water" ? "tile-water" : "tile-standard";
}
