import { createHash } from "node:crypto";
import type {
  AreaGlobalLighting,
  AreaObjectCounts,
  AreaObjectPlacement,
  AreaRecord,
  AreaTileLightColor
} from "./area.types";

export const AREA_PROCESS_CACHE_KEY_VERSION = "area-process/v14-global-lighting";

export function countAreaObjectsByKind(objects: AreaObjectPlacement[]): AreaObjectCounts {
  const counts = {
    placeables: 0,
    doors: 0,
    creatures: 0,
    encounters: 0,
    items: 0,
    sounds: 0,
    stores: 0,
    triggers: 0,
    waypoints: 0,
    total: 0
  };

  for (const object of objects) {
    counts.total += 1;
    if (object.kind === "placeable") {
      counts.placeables += 1;
      continue;
    }
    if (object.kind === "door") {
      counts.doors += 1;
      continue;
    }
    if (object.kind === "creature") {
      counts.creatures += 1;
      continue;
    }
    if (object.kind === "encounter") {
      counts.encounters += 1;
      continue;
    }
    if (object.kind === "sound") {
      counts.sounds += 1;
      continue;
    }
    if (object.kind === "store") {
      counts.stores += 1;
      continue;
    }
    if (object.kind === "trigger") {
      counts.triggers += 1;
      continue;
    }
    if (object.kind === "waypoint") {
      counts.waypoints += 1;
      continue;
    }
    counts.items += 1;
  }

  return counts;
}

export function buildAreaProcessCacheKey(area: AreaRecord): string {
  const hash = createHash("sha256");
  hash.update(
    `${AREA_PROCESS_CACHE_KEY_VERSION}|${area.areaId}|${area.width}|${area.height}|${area.updatedAt}|${area.textureAtlasId}|${area.textureAtlasObjectKey}|${area.textureAtlasContentType}|${area.textureAtlasSizeBytes}|${area.textureAtlasEtag ?? ""}|${area.textureAtlasFingerprint}`
  );

  for (const tile of area.tiles ?? []) {
    hash.update(
      `|tile:${tile.tileInstanceId}|${tile.tilesetResRef}|${tile.row}|${tile.col}|${tile.tileIndex}|${tile.tileId ?? ""}|${tile.modelResRef ?? ""}|${tile.modelSource ?? ""}|${tile.imageMap2D ?? ""}|${tile.orientation ?? ""}|${tile.tilesetOrientation ?? ""}|${tile.mainLight1 ?? ""}|${tile.mainLight2 ?? ""}|${tile.sourceLight1 ?? ""}|${tile.sourceLight2 ?? ""}|${formatAreaTileLightColor(tile.mainLight1Color)}|${formatAreaTileLightColor(tile.mainLight2Color)}|${formatAreaTileLightColor(tile.sourceLight1Color)}|${formatAreaTileLightColor(tile.sourceLight2Color)}|${tile.animLoop1 ?? ""}|${tile.animLoop2 ?? ""}|${tile.animLoop3 ?? ""}|${tile.pathNode ?? ""}|${tile.visibilityNode ?? ""}|${tile.visibilityOrientation ?? ""}|${tile.doorVisibilityNode ?? ""}|${tile.doorVisibilityOrientation ?? ""}|${JSON.stringify(tile.cornerHeights ?? {})}|${JSON.stringify(tile.edges ?? {})}|${tile.height ?? ""}|${tile.fallbackReason ?? ""}`
    );
  }

  hash.update(`|global-lighting:${formatAreaGlobalLighting(area.lighting)}`);

  for (const object of area.objects) {
    hash.update(
      `|${object.objectId}|${object.kind}|${object.templateId}|${object.resRef ?? ""}|${object.tag ?? ""}|${object.x}|${object.y}|${object.z}|${object.bearing}`
    );
    hash.update(
      `|text-context:${JSON.stringify([object.localizedName ?? "", object.description ?? ""])}`
    );
    if (object.visualTransform) {
      hash.update(`|visual-transform:${JSON.stringify(object.visualTransform)}`);
    }
    if (object.appearanceType !== undefined) {
      hash.update(`|appearance:${object.appearanceType}`);
    }
    if (object.genericType !== undefined) {
      hash.update(`|generic:${object.genericType}`);
    }
    if (object.soundPositioning) {
      hash.update(`|sound-pos:${JSON.stringify(object.soundPositioning)}`);
    }
    if (object.doorTransition) {
      hash.update(`|door-transition:${JSON.stringify(object.doorTransition)}`);
    }
    if (object.creatureMetadata) {
      hash.update(`|creature-metadata:${JSON.stringify(object.creatureMetadata)}`);
    }
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

function formatAreaTileLightColor(color: AreaTileLightColor | undefined): string {
  if (!color) {
    return "";
  }
  return `${color.rowId}:${color.red ?? ""}:${color.green ?? ""}:${color.blue ?? ""}:${color.sourceKey ?? ""}`;
}

function formatAreaGlobalLighting(lighting: AreaGlobalLighting | undefined): string {
  if (!lighting) {
    return "";
  }
  return `${lighting.source}:${lighting.fields
    .map((field) => `${field.field}:${field.value}`)
    .join(",")}`;
}
