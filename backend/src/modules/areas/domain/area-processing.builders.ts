import { createHash } from "node:crypto";
import type { AreaObjectCounts, AreaObjectPlacement, AreaRecord } from "./area.types";

export function countAreaObjectsByKind(objects: AreaObjectPlacement[]): AreaObjectCounts {
  const counts = {
    placeables: 0,
    creatures: 0,
    items: 0,
    total: 0
  };

  for (const object of objects) {
    counts.total += 1;
    if (object.kind === "placeable") {
      counts.placeables += 1;
      continue;
    }
    if (object.kind === "creature") {
      counts.creatures += 1;
      continue;
    }
    counts.items += 1;
  }

  return counts;
}

export function buildAreaProcessCacheKey(area: AreaRecord): string {
  const hash = createHash("sha256");
  hash.update(
    `area-process/v1|${area.areaId}|${area.width}|${area.height}|${area.updatedAt}|${area.textureAtlasId}`
  );

  for (const object of area.objects) {
    hash.update(
      `|${object.objectId}|${object.kind}|${object.templateId}|${object.x}|${object.y}|${object.z}|${object.bearing}`
    );
  }

  return hash.digest("hex");
}
