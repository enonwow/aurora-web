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
    `area-process/v3|${area.areaId}|${area.width}|${area.height}|${area.updatedAt}|${area.textureAtlasId}|${area.textureAtlasObjectKey}|${area.textureAtlasContentType}|${area.textureAtlasSizeBytes}|${area.textureAtlasEtag ?? ""}|${area.textureAtlasFingerprint}`
  );

  for (const object of area.objects) {
    hash.update(
      `|${object.objectId}|${object.kind}|${object.templateId}|${object.x}|${object.y}|${object.z}|${object.bearing}`
    );
  }

  hash.update(
    `|${area.soundscape.bindingKeys.areaKey}|${area.soundscape.bindingKeys.randomKey}|${area.soundscape.bindingKeys.positionalKey}`
  );

  for (const reference of area.soundscape.area) {
    hash.update(
      `|area:${reference.soundId}|${reference.resref}|${reference.category}|${reference.playbackMode}|${reference.ambientOnly}`
    );
  }
  for (const reference of area.soundscape.random) {
    hash.update(
      `|random:${reference.soundId}|${reference.resref}|${reference.category}|${reference.playbackMode}|${reference.ambientOnly}`
    );
  }
  for (const reference of area.soundscape.positional) {
    hash.update(
      `|pos:${reference.soundId}|${reference.resref}|${reference.category}|${reference.playbackMode}|${reference.ambientOnly}`
    );
  }

  return hash.digest("hex");
}
