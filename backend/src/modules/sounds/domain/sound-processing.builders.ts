import { createHash } from "node:crypto";
import type { SoundRecord } from "./sound.types";

export function buildSoundProcessCacheKey(sound: SoundRecord): string {
  const hash = createHash("sha256");
  hash.update(
    `sound-process/v1|${sound.soundId}|${sound.resref}|${sound.category}|${sound.audioAssetId}|${sound.format}|${sound.sampleRateHz}|${sound.channels}|${sound.spatialMode}|${sound.loop}|${sound.updatedAt}`
  );
  hash.update(`|${sound.metrics.durationMs}|${sound.metrics.cues}|${sound.metrics.emitters}`);

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
