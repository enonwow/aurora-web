import type { SoundApiListItem } from "../../sounds/contracts";
import {
  formatSoundBytes,
  formatSoundDuration,
  getSoundPlaybackStatusLabel,
  type SoundPlaybackPipelineState
} from "./SoundsModePanel";

interface SoundsModeRightPanelProps {
  activeSound: SoundApiListItem | null;
  playbackState: SoundPlaybackPipelineState;
}

export function SoundsModeRightPanel({
  activeSound,
  playbackState
}: SoundsModeRightPanelProps) {
  if (!activeSound) {
    return (
      <article className="sidebar-section workspace-sidebar-minimal" aria-label="sounds mode inspector">
        <h2>Sounds Mode</h2>
        <p>Select a sound to inspect its Aurora contract.</p>
      </article>
    );
  }

  const playbackStatusLabel = getSoundPlaybackStatusLabel(playbackState, activeSound.soundId);

  return (
    <article className="sidebar-section workspace-sidebar-minimal" aria-label="sounds mode inspector">
      <h2>Sounds Mode</h2>
      <p>
        soundId: <strong>{activeSound.soundId}</strong>
      </p>
      <p>
        resref: <strong>{activeSound.resref}</strong>
      </p>
      <p>
        category: <strong>{activeSound.category}</strong>
      </p>
      <p>
        format: <strong>{activeSound.format}</strong>
      </p>
      <p>
        source: <strong>{activeSound.source.layer}</strong>
      </p>
      <p>
        spatialMode: <strong>{activeSound.spatialMode}</strong>
      </p>
      <p>
        playbackMode: <strong>{activeSound.playbackMode}</strong>
      </p>
      <p>
        auroraUsage:{" "}
        <strong>
          {activeSound.auroraUsage.bindingKey} / {activeSound.auroraUsage.sourceField}
        </strong>
      </p>
      <p>
        duration: <strong>{formatSoundDuration(activeSound.metrics.durationMs)}</strong>
      </p>
      {playbackStatusLabel ? (
        <p>
          state: <strong>{playbackStatusLabel}</strong>
        </p>
      ) : null}
      {playbackState.soundId === activeSound.soundId && playbackState.message ? (
        <p>
          playback: <strong>{playbackState.message}</strong>
        </p>
      ) : null}
      {playbackState.soundId === activeSound.soundId && "delivery" in playbackState && playbackState.delivery ? (
        <>
          <p>
            delivery:{" "}
            <strong>
              {playbackState.delivery.source} / {playbackState.delivery.mode} /{" "}
              {playbackState.delivery.contentType} /{" "}
              {formatSoundBytes(playbackState.delivery.sizeBytes)}
            </strong>
          </p>
          {playbackState.delivery.preview ? (
            <p>
              preview duration:{" "}
              <strong>
                {formatSoundDuration(playbackState.delivery.preview.durationMs)} (
                {playbackState.delivery.preview.durationSource})
              </strong>
            </p>
          ) : null}
          <p>
            objectKey: <strong>{playbackState.delivery.objectKey}</strong>
          </p>
          {playbackState.delivery.etag ? (
            <p>
              etag: <strong>{playbackState.delivery.etag}</strong>
            </p>
          ) : null}
        </>
      ) : null}
    </article>
  );
}
