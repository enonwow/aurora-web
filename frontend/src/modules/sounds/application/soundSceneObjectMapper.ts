import type { AreaScene, SceneObject, ScenePreservePrimitive } from "../../scene/contracts";
import { createNewSceneObject, createSeedAreaScene } from "../../scene/domain/sceneFactory";
import {
  createDefaultSoundPositioningPreservePayload,
  DEFAULT_SOUND_CUTOFF_DISTANCE,
  DEFAULT_SOUND_ELEVATION,
  DEFAULT_SOUND_MAX_VOLUME_DISTANCE,
  DEFAULT_SOUND_RANDOM_RANGE_NORTH_SOUTH,
  DEFAULT_SOUND_RANDOM_RANGE_WEST_EAST
} from "../../scene/domain/sound";
import type { SoundApiListItem, SoundApiPlaybackMode } from "../contracts";

const SOUNDS_MODE_PREVIEW_SCENE_SIZE_TILES = 12;
const SOUNDS_MODE_PREVIEW_CENTER = SOUNDS_MODE_PREVIEW_SCENE_SIZE_TILES / 2;

function sanitizeIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  return normalized.length > 0 ? normalized : fallback;
}

function toSoundTag(resref: string): string {
  return `SOUND_${sanitizeIdentifier(resref, "SOUND").toUpperCase()}`;
}

function toSoundPlayStyle(playbackMode: SoundApiPlaybackMode) {
  return playbackMode === "looping" ? "loop" : "repeat";
}

function toSoundPlayOrder(playbackMode: SoundApiPlaybackMode) {
  return playbackMode === "random" ? "random" : "sequential";
}

function buildSoundTemplateExtra(sound: SoundApiListItem): Record<string, ScenePreservePrimitive> {
  return {
    backendSoundId: sound.soundId,
    category: sound.category,
    format: sound.format,
    spatialMode: sound.spatialMode,
    playbackMode: sound.playbackMode,
    auroraBindingKey: sound.auroraUsage.bindingKey,
    auroraSourceField: sound.auroraUsage.sourceField,
    durationMs: sound.metrics.durationMs,
    previewWaveformUrl: sound.previewWaveformUrl,
    soundTemplateSource: "backend-catalog"
  };
}

export function mapSoundApiListItemToSceneObject(
  sound: SoundApiListItem,
  sequence = 1
): SceneObject {
  const object = createNewSceneObject(
    "sounds",
    SOUNDS_MODE_PREVIEW_CENTER,
    SOUNDS_MODE_PREVIEW_CENTER,
    sequence
  );
  const normalizedSoundId = sanitizeIdentifier(sound.soundId, `sound_${sequence}`);
  const preserve = createDefaultSoundPositioningPreservePayload();

  return {
    ...object,
    id: `snd_template_${normalizedSoundId}`,
    name: sound.name,
    resRef: sound.resref,
    tag: toSoundTag(sound.resref),
    previewImageUrl: sound.previewWaveformUrl,
    soundPositioning: {
      mode: sound.spatialMode === "3d" ? "specific" : "everywhere",
      elevation: DEFAULT_SOUND_ELEVATION,
      maxVolumeDistance: DEFAULT_SOUND_MAX_VOLUME_DISTANCE,
      cutoffDistance: DEFAULT_SOUND_CUTOFF_DISTANCE,
      randomRangeWestEast: DEFAULT_SOUND_RANDOM_RANGE_WEST_EAST,
      randomRangeNorthSouth: DEFAULT_SOUND_RANDOM_RANGE_NORTH_SOUTH,
      preserve: {
        ...preserve,
        playStyle: toSoundPlayStyle(sound.playbackMode),
        playOrder: toSoundPlayOrder(sound.playbackMode),
        flags: {
          ...preserve.flags,
          backendBenchmark: sound.benchmark
        },
        extra: {
          ...preserve.extra,
          ...buildSoundTemplateExtra(sound)
        }
      }
    }
  };
}

export function createSoundsModeSceneSeed(sound: SoundApiListItem): AreaScene {
  const scene = createSeedAreaScene(
    SOUNDS_MODE_PREVIEW_SCENE_SIZE_TILES,
    SOUNDS_MODE_PREVIEW_SCENE_SIZE_TILES
  );
  const soundObject = mapSoundApiListItemToSceneObject(sound);

  return {
    ...scene,
    sceneId: `sounds_mode_preview_${sanitizeIdentifier(sound.soundId, "sound")}`,
    areaName: "Sounds Mode Preview",
    objects: [soundObject],
    updatedAtUnixMs: Date.now()
  };
}
