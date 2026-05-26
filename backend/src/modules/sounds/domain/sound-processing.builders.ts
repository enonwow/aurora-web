import { createHash } from "node:crypto";
import type { SoundRecord } from "./sound.types";

export function buildSoundProcessCacheKey(sound: SoundRecord): string {
  const hash = createHash("sha256");
  hash.update(
    `sound-process/v2|${sound.soundId}|${sound.resref}|${sound.category}|${sound.audioAssetId}|${sound.sourceObjectKey}|${sound.sourceFingerprint}|${sound.format}|${sound.sampleRateHz}|${sound.channels}|${sound.spatialMode}|${sound.loop}|${sound.updatedAt}`
  );
  hash.update(
    `|${sound.playback.mode}|${sound.playback.intervalSeconds ?? "none"}|${sound.playback.ambientOnly}`
  );
  hash.update(
    `|${sound.metrics.durationMs}|${sound.metrics.cues}|${sound.metrics.emitters}|${sound.reverseMapping.palette}|${sound.reverseMapping.soundSetTable}|${sound.reverseMapping.soundSetTypeTable}|${sound.reverseMapping.soundTypesTable}|${sound.reverseMapping.categoryFilterTable}`
  );

  for (const tag of sound.tags) {
    hash.update(`|${tag}`);
  }

  return hash.digest("hex");
}

export function buildSoundPlaybackPreset(
  sound: SoundRecord
): "ambient-loop" | "music-stream" | "effect-spatial" {
  if (sound.category === "music") {
    return "music-stream";
  }
  if (sound.spatialMode === "3d") {
    return "effect-spatial";
  }
  return "ambient-loop";
}
