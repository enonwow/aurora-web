import { createHash } from "node:crypto";
import type {
  AreaGlobalLighting,
  AreaObjectCounts,
  AreaObjectPlacement,
  AreaRecord,
  AreaTileLightColor
} from "./area.types";

export const AREA_PROCESS_CACHE_KEY_VERSION = "area-process/v39-item-base-appearance";

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
  hash.update(`|area-root-editable:${JSON.stringify({
    comments: area.comments === undefined ? null : area.comments,
    eventScripts: [
      area.eventScripts?.onEnter ?? null,
      area.eventScripts?.onExit ?? null,
      area.eventScripts?.onHeartbeat ?? null,
      area.eventScripts?.onUserDefined ?? null,
    ],
    basicIdentity: [
      area.basicIdentity?.name ?? null,
      area.basicIdentity?.nameProfile ?? null,
      area.basicIdentity?.nameEntries?.map((entry) => [entry.languageId, entry.text]) ?? null,
      area.basicIdentity?.tag ?? null,
    ],
    advancedFlags: {
      terrainType: area.advancedFlags?.terrainType
        ? [
            area.advancedFlags.terrainType.interior,
            area.advancedFlags.terrainType.natural,
            area.advancedFlags.terrainType.subterranean,
          ]
        : null,
      playerVsPlayer: area.advancedFlags?.playerVsPlayer ?? null,
      noRest: area.advancedFlags?.noRest ?? null,
      listenCheckModifier: area.advancedFlags?.listenCheckModifier ?? null,
      spotCheckModifier: area.advancedFlags?.spotCheckModifier ?? null,
      loadingScreenId: area.advancedFlags?.loadingScreenId ?? null,
    },
    visualEnvironment: area.visualEnvironment
      ? [
          area.visualEnvironment.dayNightMode,
          area.visualEnvironment.shadowOpacity,
          area.visualEnvironment.chanceRain,
          area.visualEnvironment.chanceSnow,
          area.visualEnvironment.chanceLightning,
          area.visualEnvironment.sun.ambientColor,
          area.visualEnvironment.sun.diffuseColor,
          area.visualEnvironment.sun.fogColor,
          area.visualEnvironment.sun.fogAmount,
          area.visualEnvironment.sun.shadows,
          area.visualEnvironment.moon.ambientColor,
          area.visualEnvironment.moon.diffuseColor,
          area.visualEnvironment.moon.fogColor,
          area.visualEnvironment.moon.fogAmount,
          area.visualEnvironment.moon.shadows,
        ]
      : null,
    visualEnvironmentScalarControls: area.visualEnvironmentScalarControls
      ? [
          area.visualEnvironmentScalarControls.fogClipDistance,
          area.visualEnvironmentScalarControls.windPower,
        ]
      : null,
    visualEnvironmentCatalogSelection: area.visualEnvironmentCatalogSelection
      ? [
          area.visualEnvironmentCatalogSelection.lightingSchemeRowIndex,
          area.visualEnvironmentCatalogSelection.skyBoxRowIndex,
        ]
      : null,
    moduleStartLocation: area.moduleStartLocation
      ? [
          area.moduleStartLocation.areaResRef,
          area.moduleStartLocation.x,
          area.moduleStartLocation.y,
          area.moduleStartLocation.z,
          area.moduleStartLocation.directionX,
          area.moduleStartLocation.directionY,
        ]
      : null,
    moduleStartLocationTargets: area.moduleStartLocationTargets ?? null,
    audioEnvironment: area.audioEnvironment
      ? [
          area.audioEnvironment.ambientSoundDayId,
          area.audioEnvironment.ambientSoundNightId,
          area.audioEnvironment.ambientSoundDayVolume,
          area.audioEnvironment.ambientSoundNightVolume,
          area.audioEnvironment.environmentAudioId,
          area.audioEnvironment.musicBattleId,
          area.audioEnvironment.musicDayId,
          area.audioEnvironment.musicNightId,
          area.audioEnvironment.musicDelayMilliseconds,
        ]
      : null,
    variables: area.variables?.expectedEntries ?? null,
    sourceIfoSha256: area.sourceResources?.ifoSha256 ?? null,
  })}`);

  for (const tile of area.tiles ?? []) {
    hash.update(
      `|tile:${tile.tileInstanceId}|${tile.tilesetResRef}|${tile.row}|${tile.col}|${tile.tileIndex}|${tile.tileId ?? ""}|${tile.modelResRef ?? ""}|${tile.modelSource ?? ""}|${tile.imageMap2D ?? ""}|${tile.orientation ?? ""}|${tile.tilesetOrientation ?? ""}|${tile.mainLight1 ?? ""}|${tile.mainLight2 ?? ""}|${tile.sourceLight1 ?? ""}|${tile.sourceLight2 ?? ""}|${formatAreaTileLightColor(tile.mainLight1Color)}|${formatAreaTileLightColor(tile.mainLight2Color)}|${formatAreaTileLightColor(tile.sourceLight1Color)}|${formatAreaTileLightColor(tile.sourceLight2Color)}|${tile.animLoop1 ?? ""}|${tile.animLoop2 ?? ""}|${tile.animLoop3 ?? ""}|${tile.pathNode ?? ""}|${tile.visibilityNode ?? ""}|${tile.visibilityOrientation ?? ""}|${tile.doorVisibilityNode ?? ""}|${tile.doorVisibilityOrientation ?? ""}|${JSON.stringify(tile.cornerHeights ?? {})}|${JSON.stringify(tile.edges ?? {})}|${tile.height ?? ""}|${tile.fallbackReason ?? ""}`
    );
  }

  hash.update(`|global-lighting:${formatAreaGlobalLighting(area.lighting)}`);
  hash.update(
    `|aurora-vfx-collision:${area.auroraVfxCollision?.version ?? ""}|${area.auroraVfxCollision?.status ?? ""}|${area.auroraVfxCollision?.fingerprint ?? ""}`
  );
  hash.update(
    `|aurora-worldtimer:${area.auroraWorldTimer?.version ?? ""}|${area.auroraWorldTimer?.status ?? ""}|${area.auroraWorldTimer?.fingerprint ?? ""}`
  );
  if (area.placeableTrapTypeCatalog) {
    hash.update(
      `|placeable-trap-type-catalog:${JSON.stringify(area.placeableTrapTypeCatalog)}`,
    );
  }
  if (area.placeableBodyBagCatalog) {
    hash.update(
      `|placeable-body-bag-catalog:${JSON.stringify(area.placeableBodyBagCatalog)}`,
    );
  }
  if (area.placeablePortraitCatalog) {
    hash.update(
      `|placeable-portrait-catalog:${JSON.stringify(area.placeablePortraitCatalog)}`,
    );
  }
  if (area.creaturePortraitCatalog) {
    hash.update(
      `|creature-portrait-catalog:${JSON.stringify(area.creaturePortraitCatalog)}`,
    );
  }
  if (area.itemBaseItemCatalog) {
    hash.update(`|item-base-item-catalog:${JSON.stringify(area.itemBaseItemCatalog)}`);
  }
  if (area.placeableFactionCatalog) {
    hash.update(
      `|placeable-faction-catalog:${JSON.stringify(area.placeableFactionCatalog)}`,
    );
  }
  if (area.audioEnvironmentCatalogs) {
    hash.update(
      `|area-audio-catalogs:${JSON.stringify(area.audioEnvironmentCatalogs)}`,
    );
  }
  if (area.visualEnvironmentCatalogs) {
    hash.update(
      `|area-visual-environment-catalogs:${JSON.stringify(area.visualEnvironmentCatalogs)}`,
    );
  }
  if (area.loadingScreenCatalog) {
    hash.update(
      `|area-loading-screen-catalog:${JSON.stringify(area.loadingScreenCatalog)}`,
    );
  }
  if (area.encounterDifficultyCatalog) {
    hash.update(
      `|area-encounter-difficulty-catalog:${JSON.stringify(area.encounterDifficultyCatalog)}`,
    );
  }

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
    if (object.placeableBasicIdentity) {
      hash.update(`|placeable-basic-identity:${JSON.stringify(object.placeableBasicIdentity)}`);
    }
    if (object.placeableTrapType) {
      hash.update(`|placeable-trap-type:${JSON.stringify(object.placeableTrapType)}`);
    }
    if (object.placeableBodyBag) {
      hash.update(`|placeable-body-bag:${JSON.stringify(object.placeableBodyBag)}`);
    }
    if (object.placeablePortraitId) {
      hash.update(`|placeable-portrait-id:${JSON.stringify(object.placeablePortraitId)}`);
    }
    if (object.placeableFaction) {
      hash.update(`|placeable-faction:${JSON.stringify(object.placeableFaction)}`);
    }
    if (object.placeableVariables) {
      hash.update(`|placeable-variables:${JSON.stringify(object.placeableVariables)}`);
    }
    if (object.placeableTemplateResRef) {
      hash.update(`|placeable-template-resref:${object.placeableTemplateResRef}`);
    }
    if (object.placeableLocalizedStrings) {
      hash.update(
        `|placeable-localized-strings:${JSON.stringify(object.placeableLocalizedStrings)}`,
      );
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
    if (object.creatureTag) {
      hash.update(`|creature-tag:${JSON.stringify(object.creatureTag)}`);
    }
    if (object.creatureConversation) {
      hash.update(
        `|creature-conversation:${JSON.stringify(object.creatureConversation)}`,
      );
    }
    if (object.creatureVariables) {
      hash.update(`|creature-variables:${JSON.stringify(object.creatureVariables)}`);
    }
    if (object.creatureInterruptable) {
      hash.update(
        `|creature-interruptable:${JSON.stringify(object.creatureInterruptable)}`,
      );
    }
    if (object.creatureAdvancedFlags) {
      hash.update(
        `|creature-advanced-flags:${JSON.stringify(object.creatureAdvancedFlags)}`,
      );
    }
    if (object.creatureBodyBag) {
      hash.update(
        `|creature-body-bag:${JSON.stringify(object.creatureBodyBag)}`,
      );
    }
    if (object.triggerTag) {
      hash.update(`|trigger-tag:${JSON.stringify(object.triggerTag)}`);
    }
    if (object.triggerLocalizedName) {
      hash.update(
        `|trigger-localized-name:${JSON.stringify(object.triggerLocalizedName)}`,
      );
    }
    if (object.triggerMetadata) {
      hash.update(`|trigger-metadata:${JSON.stringify(object.triggerMetadata)}`);
    }
    if (object.encounterTag) {
      hash.update(`|encounter-tag:${JSON.stringify(object.encounterTag)}`);
    }
    if (object.waypointTag) {
      hash.update(`|waypoint-tag:${JSON.stringify(object.waypointTag)}`);
    }
    if (object.waypointLocalizedName) {
      hash.update(
        `|waypoint-localized-name:${JSON.stringify(object.waypointLocalizedName)}`,
      );
    }
    if (object.waypointDescription) {
      hash.update(
        `|waypoint-description:${JSON.stringify(object.waypointDescription)}`,
      );
    }
    if (object.waypointMapNote) {
      hash.update(`|waypoint-map-note:${JSON.stringify(object.waypointMapNote)}`);
    }
    if (object.waypointVariables) {
      hash.update(`|waypoint-variables:${JSON.stringify(object.waypointVariables)}`);
    }
    if (object.waypointAppearance) {
      hash.update(`|waypoint-appearance:${JSON.stringify(object.waypointAppearance)}`);
    }
    if (object.waypointMetadata) {
      hash.update(`|waypoint-metadata:${JSON.stringify(object.waypointMetadata)}`);
    }
    if (object.encounterActive) {
      hash.update(`|encounter-active:${JSON.stringify(object.encounterActive)}`);
    }
    if (object.encounterPlayerOnly) {
      hash.update(
        `|encounter-player-only:${JSON.stringify(object.encounterPlayerOnly)}`,
      );
    }
    if (object.encounterReset) {
      hash.update(`|encounter-reset:${JSON.stringify(object.encounterReset)}`);
    }
    if (object.encounterResetTime) {
      hash.update(
        `|encounter-reset-time:${JSON.stringify(object.encounterResetTime)}`,
      );
    }
    if (object.encounterSpawnOption) {
      hash.update(
        `|encounter-spawn-option:${JSON.stringify(object.encounterSpawnOption)}`,
      );
    }
    if (object.encounterRespawns) {
      hash.update(`|encounter-respawns:${JSON.stringify(object.encounterRespawns)}`);
    }
    if (object.encounterCreatureCounts) {
      hash.update(
        `|encounter-creature-counts:${JSON.stringify(object.encounterCreatureCounts)}`,
      );
    }
    if (object.encounterScriptResRefs) {
      hash.update(
        `|encounter-script-resrefs:${JSON.stringify(object.encounterScriptResRefs)}`,
      );
    }
    if (object.encounterFaction) {
      hash.update(`|encounter-faction:${JSON.stringify(object.encounterFaction)}`);
    }
    if (object.encounterDifficulty) {
      hash.update(`|encounter-difficulty:${JSON.stringify(object.encounterDifficulty)}`);
    }
    if (object.encounterLocalizedName) {
      hash.update(
        `|encounter-localized-name:${JSON.stringify(object.encounterLocalizedName)}`,
      );
    }
    if (object.encounterVariables) {
      hash.update(`|encounter-variables:${JSON.stringify(object.encounterVariables)}`);
    }
    if (object.encounterCreatureList) {
      hash.update(`|encounter-creature-list:${JSON.stringify(object.encounterCreatureList)}`);
    }
    if (object.encounterSpawnPoints) {
      hash.update(`|encounter-spawn-points:${JSON.stringify(object.encounterSpawnPoints)}`);
    }
    if (object.encounterMetadata) {
      hash.update(`|encounter-metadata:${JSON.stringify(object.encounterMetadata)}`);
    }
    if (object.creatureDecayTime) {
      hash.update(
        `|creature-decay-time:${JSON.stringify(object.creatureDecayTime)}`,
      );
    }
    if (object.creatureAppearance) {
      hash.update(
        `|creature-appearance:${JSON.stringify(object.creatureAppearance)}`,
      );
    }
    if (object.creatureGender) {
      hash.update(`|creature-gender:${JSON.stringify(object.creatureGender)}`);
    }
    if (object.creaturePerceptionRange) {
      hash.update(`|creature-perception-range:${JSON.stringify(object.creaturePerceptionRange)}`);
    }
    if (object.creatureWalkRate) {
      hash.update(`|creature-walk-rate:${JSON.stringify(object.creatureWalkRate)}`);
    }
    if (object.creaturePhenotype) {
      hash.update(`|creature-phenotype:${JSON.stringify(object.creaturePhenotype)}`);
    }
    if (object.creaturePortrait) {
      hash.update(`|creature-portrait:${JSON.stringify(object.creaturePortrait)}`);
    }
    if (object.creatureChallengeRating) {
      hash.update(
        `|creature-challenge-rating:${JSON.stringify(object.creatureChallengeRating)}`,
      );
    }
    if (object.creatureAbilityScores) {
      hash.update(
        `|creature-ability-scores:${JSON.stringify(object.creatureAbilityScores)}`,
      );
    }
    if (object.creatureAppearanceColors) {
      hash.update(
        `|creature-appearance-colors:${JSON.stringify(object.creatureAppearanceColors)}`,
      );
    }
    if (object.creatureBodyParts) {
      hash.update(
        `|creature-body-parts:${JSON.stringify(object.creatureBodyParts)}`,
      );
    }
    if (object.creatureHitPointState) {
      hash.update(
        `|creature-hit-points:${JSON.stringify(object.creatureHitPointState)}`,
      );
    }
    if (object.creatureNaturalArmorClass) {
      hash.update(
        `|creature-natural-armor-class:${JSON.stringify(object.creatureNaturalArmorClass)}`,
      );
    }
    if (object.creatureSavingThrowBonuses) {
      hash.update(
        `|creature-saving-throw-bonuses:${JSON.stringify(object.creatureSavingThrowBonuses)}`,
      );
    }
    if (object.creatureAlignment) {
      hash.update(`|creature-alignment:${JSON.stringify(object.creatureAlignment)}`);
    }
    if (object.creatureFaction) {
      hash.update(
        `|creature-faction:${JSON.stringify(object.creatureFaction)}`,
      );
    }
    if (object.creatureTemplateResRef) {
      hash.update(
        `|creature-template-resref:${JSON.stringify(object.creatureTemplateResRef)}`,
      );
    }
    if (object.creatureSpecialIdentityStrings) {
      hash.update(
        `|creature-special-identity-strings:${JSON.stringify(object.creatureSpecialIdentityStrings)}`,
      );
    }
    if (object.creatureScriptResRefs) {
      hash.update(`|creature-script-resrefs:${JSON.stringify(object.creatureScriptResRefs)}`);
    }
    if (object.creatureLocalizedStrings) {
      hash.update(
        `|creature-name-localized-strings:${JSON.stringify(object.creatureLocalizedStrings)}`,
      );
    }
    if (object.itemVariables) {
      hash.update(`|item-variables:${JSON.stringify(object.itemVariables)}`);
    }
    if (object.itemPropertyList) {
      hash.update(`|item-property-list:${JSON.stringify(object.itemPropertyList)}`);
    }
    if (object.itemBaseAppearance) {
      hash.update(`|item-base-appearance:${JSON.stringify(object.itemBaseAppearance)}`);
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
  return `${color.rowId}:${color.red ?? ""}:${color.green ?? ""}:${color.blue ?? ""}:${color.sourceKey ?? ""}:${JSON.stringify(color.sourceNode ?? null)}:${JSON.stringify(color.nativeNode ?? null)}`;
}

function formatAreaGlobalLighting(lighting: AreaGlobalLighting | undefined): string {
  if (!lighting) {
    return "";
  }
  return `${lighting.source}:${lighting.fields
    .map((field) => `${field.field}:${field.value}`)
    .join(",")}`;
}
