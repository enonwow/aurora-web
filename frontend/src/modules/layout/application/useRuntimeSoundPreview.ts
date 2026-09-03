import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceToolbarState } from "./workspaceChromeFacade";
import type { SceneObject } from "../contracts";
import { isKindVisibleWithIsolation, isObjectVisible } from "./workspaceSceneInteraction";
import {
  normalizeSoundGuidePositioning,
  resolveSoundGuideWorldGeometry
} from "../soundGuideDomain";
import type {
  WorkspaceRuntimeRef,
  WorkspaceSoundListenerRuntimePort
} from "../ports/workspaceRenderRuntimePort";
import {
  areRuntimeSoundNowPlayingBadgesEqual,
  createRuntimeSoundPlaybackState,
  reconcileRuntimeSoundPlaybackState,
  type RuntimeSoundNowPlayingBadge,
  type RuntimeSoundPlaybackState as RuntimeSoundPlaybackStateModel
} from "../runtimeSoundPlaybackState";
import {
  clampUnitInterval,
  resolveDistanceAttenuation,
  resolveEffectiveSoundPlayOrder,
  resolveNextRuntimeSoundDelayMs,
  resolveRuntimeSoundNowPlayingLabel,
  resolveSelectedSoundPreviewKey,
  resolveSoundPlaybackList,
  resolveSoundPreviewAssetUrl,
  SOUND_PRESERVE_DEFAULTS,
  type SoundPropertiesDialogState
} from "./workspaceObjectPropertyDrafts";

type RuntimeSoundPlaybackState = RuntimeSoundPlaybackStateModel;

interface RuntimeSoundLoopChannel {
  audio: HTMLAudioElement;
  sourceX: number;
  sourceY: number;
  sourceZ: number;
  label: string;
}

interface RuntimeSoundNowPlayingState {
  expiresAtUnixMs: number;
  label: string;
}

const SOUND_RUNTIME_TICK_MS = 200;
const SOUND_NOW_PLAYING_BADGE_TTL_MS = 1200;

export function isRuntimeSoundPreviewEligible(
  object: SceneObject,
  toolbarState: WorkspaceToolbarState,
  renderObjectIdsSet: ReadonlySet<string> | null = null
): boolean {
  return (
    object.kind === "sounds" &&
    (renderObjectIdsSet === null || renderObjectIdsSet.has(object.id)) &&
    isObjectVisible(object, toolbarState) &&
    isKindVisibleWithIsolation(toolbarState.canvasDebug, object.kind)
  );
}

export function useRuntimeSoundPreview<TRuntime>(args: {
  runtimeRef: WorkspaceRuntimeRef<TRuntime>;
  soundListenerRuntimePort: WorkspaceSoundListenerRuntimePort<TRuntime>;
  soundPropertiesDialog: SoundPropertiesDialogState | null;
  sceneObjects: readonly SceneObject[];
  toolbarState: WorkspaceToolbarState;
  renderObjectIdsSet: ReadonlySet<string> | null;
  unitsPerTile: number;
  enableRuntimeSoundPreview: boolean;
}): {
  runtimeSoundNowPlayingBadges: RuntimeSoundNowPlayingBadge[];
  playSelectedSoundPreview: () => void;
  stopSoundPreviewPlayback: () => void;
} {
  const {
    runtimeRef,
    soundListenerRuntimePort,
    soundPropertiesDialog,
    sceneObjects,
    toolbarState,
    renderObjectIdsSet,
    unitsPerTile,
    enableRuntimeSoundPreview
  } = args;
  const soundPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const runtimeSoundPlaybackStateRef = useRef<Map<string, RuntimeSoundPlaybackState>>(
    new Map<string, RuntimeSoundPlaybackState>()
  );
  const runtimeSoundLoopChannelsRef = useRef<Map<string, RuntimeSoundLoopChannel>>(
    new Map<string, RuntimeSoundLoopChannel>()
  );
  const runtimeSoundOneShotChannelsRef = useRef<Set<HTMLAudioElement>>(new Set<HTMLAudioElement>());
  const runtimeSoundNowPlayingRef = useRef<Map<string, RuntimeSoundNowPlayingState>>(
    new Map<string, RuntimeSoundNowPlayingState>()
  );
  const [runtimeSoundNowPlayingBadges, setRuntimeSoundNowPlayingBadges] = useState<
    RuntimeSoundNowPlayingBadge[]
  >([]);

  const syncRuntimeSoundNowPlayingState = useCallback((nowUnixMs: number) => {
    const nowPlayingMap = runtimeSoundNowPlayingRef.current;
    let changed = false;
    for (const [objectId, state] of nowPlayingMap.entries()) {
      if (state.expiresAtUnixMs <= nowUnixMs) {
        nowPlayingMap.delete(objectId);
        changed = true;
      }
    }

    if (changed) {
      const nextBadges = Array.from(nowPlayingMap.entries())
        .map(([objectId, state]) => ({ objectId, label: state.label }))
        .sort((left, right) => left.objectId.localeCompare(right.objectId));
      setRuntimeSoundNowPlayingBadges((current) =>
        areRuntimeSoundNowPlayingBadgesEqual(current, nextBadges) ? current : nextBadges
      );
    }
  }, []);

  const markRuntimeSoundAsNowPlaying = useCallback(
    (objectId: string, nowUnixMs: number, soundKey: string) => {
      const nowPlayingMap = runtimeSoundNowPlayingRef.current;
      const label = resolveRuntimeSoundNowPlayingLabel(soundKey);
      nowPlayingMap.set(objectId, {
        expiresAtUnixMs: nowUnixMs + SOUND_NOW_PLAYING_BADGE_TTL_MS,
        label
      });
      const nextBadges = Array.from(nowPlayingMap.entries())
        .map(([entryObjectId, state]) => ({ objectId: entryObjectId, label: state.label }))
        .sort((left, right) => left.objectId.localeCompare(right.objectId));
      setRuntimeSoundNowPlayingBadges((current) =>
        areRuntimeSoundNowPlayingBadgesEqual(current, nextBadges) ? current : nextBadges
      );
    },
    []
  );

  const stopRuntimeLoopSoundChannelById = useCallback((objectId: string) => {
    const channel = runtimeSoundLoopChannelsRef.current.get(objectId);
    if (!channel) {
      return;
    }
    channel.audio.pause();
    channel.audio.currentTime = 0;
    runtimeSoundLoopChannelsRef.current.delete(objectId);
  }, []);

  const stopAllRuntimeSoundChannels = useCallback(() => {
    runtimeSoundLoopChannelsRef.current.forEach((channel) => {
      channel.audio.pause();
      channel.audio.currentTime = 0;
    });
    runtimeSoundLoopChannelsRef.current.clear();

    runtimeSoundOneShotChannelsRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    runtimeSoundOneShotChannelsRef.current.clear();

    runtimeSoundPlaybackStateRef.current.clear();
    runtimeSoundNowPlayingRef.current.clear();
    setRuntimeSoundNowPlayingBadges((current) => (current.length === 0 ? current : []));
  }, []);

  const stopSoundPreviewPlayback = useCallback(() => {
    const currentAudio = soundPreviewAudioRef.current;
    if (!currentAudio) {
      return;
    }
    currentAudio.pause();
    currentAudio.currentTime = 0;
    soundPreviewAudioRef.current = null;
  }, []);

  const playSelectedSoundPreview = useCallback(() => {
    if (typeof window === "undefined" || !soundPropertiesDialog) {
      return;
    }
    const previewKey = resolveSelectedSoundPreviewKey(soundPropertiesDialog.draft);
    const previewAssetUrl = resolveSoundPreviewAssetUrl(previewKey);
    if (!previewAssetUrl) {
      return;
    }

    const previousAudio = soundPreviewAudioRef.current;
    if (previousAudio) {
      previousAudio.pause();
      previousAudio.currentTime = 0;
    }

    const audio = new Audio(previewAssetUrl);
    audio.volume = Math.min(1, Math.max(0, soundPropertiesDialog.draft.volume));
    audio.loop = soundPropertiesDialog.draft.playStyle === "loop";
    audio.onended = () => {
      if (soundPreviewAudioRef.current === audio) {
        soundPreviewAudioRef.current = null;
      }
    };
    audio.onerror = () => {
      if (soundPreviewAudioRef.current === audio) {
        soundPreviewAudioRef.current = null;
      }
    };
    soundPreviewAudioRef.current = audio;

    void audio.play().catch(() => {
      if (soundPreviewAudioRef.current === audio) {
        soundPreviewAudioRef.current = null;
      }
    });
  }, [soundPropertiesDialog]);

  useEffect(() => {
    if (!soundPropertiesDialog) {
      stopSoundPreviewPlayback();
    }
  }, [soundPropertiesDialog, stopSoundPreviewPlayback]);

  useEffect(() => () => stopSoundPreviewPlayback(), [stopSoundPreviewPlayback]);

  useEffect(() => {
    if (!enableRuntimeSoundPreview) {
      stopAllRuntimeSoundChannels();
      return;
    }

    const playTick = () => {
      const runtime = runtimeRef.current;
      const nowUnixMs = Date.now();
      syncRuntimeSoundNowPlayingState(nowUnixMs);

      if (!runtime) {
        return;
      }

      const listenerPosition = soundListenerRuntimePort.getListenerPosition(runtime);
      const listenerX = listenerPosition.x;
      const listenerY = listenerPosition.y;
      const listenerZ = listenerPosition.z;
      const candidateSounds = sceneObjects.filter((object) =>
        isRuntimeSoundPreviewEligible(object, toolbarState, renderObjectIdsSet)
      );
      const candidateIds = new Set(candidateSounds.map((object) => object.id));

      runtimeSoundPlaybackStateRef.current.forEach((_state, objectId) => {
        if (!candidateIds.has(objectId)) {
          runtimeSoundPlaybackStateRef.current.delete(objectId);
        }
      });
      runtimeSoundNowPlayingRef.current.forEach((_expiresAt, objectId) => {
        if (!candidateIds.has(objectId)) {
          runtimeSoundNowPlayingRef.current.delete(objectId);
        }
      });
      runtimeSoundLoopChannelsRef.current.forEach((_channel, objectId) => {
        if (!candidateIds.has(objectId)) {
          stopRuntimeLoopSoundChannelById(objectId);
        }
      });

      for (const object of candidateSounds) {
        const positioning = normalizeSoundGuidePositioning(object.soundPositioning);
        const soundGuideGeometry = resolveSoundGuideWorldGeometry(positioning, unitsPerTile);
        const preserve = object.soundPositioning?.preserve;
        const isActive = preserve?.active ?? SOUND_PRESERVE_DEFAULTS.active;
        const soundList = resolveSoundPlaybackList(object);
        const playStyle = preserve?.playStyle ?? SOUND_PRESERVE_DEFAULTS.playStyle;
        const playOrder = resolveEffectiveSoundPlayOrder(
          preserve?.playOrder ?? SOUND_PRESERVE_DEFAULTS.playOrder
        );
        const baseVolume = clampUnitInterval(preserve?.volume ?? SOUND_PRESERVE_DEFAULTS.volume);
        const intervalMs = Math.max(250, preserve?.intervalMs ?? SOUND_PRESERVE_DEFAULTS.intervalMs);
        const intervalVariationMs = Math.max(
          0,
          preserve?.intervalVariationMs ?? SOUND_PRESERVE_DEFAULTS.intervalVariationMs
        );

        if (!isActive || soundList.length === 0 || baseVolume <= 0) {
          stopRuntimeLoopSoundChannelById(object.id);
          runtimeSoundPlaybackStateRef.current.delete(object.id);
          runtimeSoundNowPlayingRef.current.delete(object.id);
          continue;
        }

        const resolveSourcePosition = () => {
          const baseX = object.x;
          const baseY = object.z + soundGuideGeometry.elevationOffsetWorld;
          const baseZ = object.y;
          if (positioning.mode !== "random") {
            return { x: baseX, y: baseY, z: baseZ };
          }
          const randomOffsetX =
            soundGuideGeometry.randomRangeHalfWidthWorld * (Math.random() * 2 - 1);
          const randomOffsetZ =
            soundGuideGeometry.randomRangeHalfDepthWorld * (Math.random() * 2 - 1);
          return {
            x: baseX + randomOffsetX,
            y: baseY,
            z: baseZ + randomOffsetZ
          };
        };

        const resolveEffectiveVolume = (sourceX: number, sourceY: number, sourceZ: number) => {
          const maxDistance = soundGuideGeometry.maxVolumeRadiusWorld;
          const cutoffDistance = soundGuideGeometry.cutoffRadiusWorld;
          const distance =
            positioning.mode === "everywhere"
              ? 0
              : Math.sqrt(
                  (listenerX - sourceX) ** 2 +
                    (listenerY - sourceY) ** 2 +
                    (listenerZ - sourceZ) ** 2
                );
          const attenuation = clampUnitInterval(
            resolveDistanceAttenuation(positioning.mode, distance, maxDistance, cutoffDistance)
          );
          return clampUnitInterval(baseVolume * attenuation);
        };

        let playbackState = runtimeSoundPlaybackStateRef.current.get(object.id);
        if (!playbackState) {
          playbackState = createRuntimeSoundPlaybackState(nowUnixMs, playStyle);
          runtimeSoundPlaybackStateRef.current.set(object.id, playbackState);
        }

        const playbackStatePatch = reconcileRuntimeSoundPlaybackState(
          playbackState,
          playStyle,
          nowUnixMs
        );
        if (playbackStatePatch.shouldStopLoopChannel) {
          stopRuntimeLoopSoundChannelById(object.id);
        }

        const loopChannel = runtimeSoundLoopChannelsRef.current.get(object.id);
        if (playStyle === "loop") {
          if (loopChannel) {
            const volume = resolveEffectiveVolume(
              loopChannel.sourceX,
              loopChannel.sourceY,
              loopChannel.sourceZ
            );
            loopChannel.audio.volume = volume;
            if (volume > 0) {
              markRuntimeSoundAsNowPlaying(object.id, nowUnixMs, loopChannel.label);
            }
            continue;
          }
          if (nowUnixMs < playbackState.nextPlayAtUnixMs) {
            continue;
          }
        } else if (playStyle === "once" && playbackState.playedOnce) {
          continue;
        } else if (nowUnixMs < playbackState.nextPlayAtUnixMs) {
          continue;
        }

        const selectedListIndex =
          playOrder === "random"
            ? Math.floor(Math.random() * soundList.length)
            : playbackState.nextSequentialIndex % soundList.length;
        if (playOrder === "sequential") {
          playbackState.nextSequentialIndex =
            (playbackState.nextSequentialIndex + 1) % soundList.length;
        }
        const previewKey = soundList[selectedListIndex] ?? object.resRef;
        const previewAssetUrl = resolveSoundPreviewAssetUrl(previewKey);
        if (!previewAssetUrl) {
          playbackState.nextPlayAtUnixMs =
            nowUnixMs + resolveNextRuntimeSoundDelayMs(intervalMs, intervalVariationMs);
          continue;
        }

        const sourcePosition = resolveSourcePosition();
        const effectiveVolume = resolveEffectiveVolume(
          sourcePosition.x,
          sourcePosition.y,
          sourcePosition.z
        );
        if (effectiveVolume <= 0) {
          playbackState.nextPlayAtUnixMs =
            nowUnixMs + resolveNextRuntimeSoundDelayMs(intervalMs, intervalVariationMs);
          continue;
        }

        const audio = new Audio(previewAssetUrl);
        audio.volume = effectiveVolume;
        if (playStyle === "loop") {
          audio.loop = true;
          runtimeSoundLoopChannelsRef.current.set(object.id, {
            audio,
            sourceX: sourcePosition.x,
            sourceY: sourcePosition.y,
            sourceZ: sourcePosition.z,
            label: previewKey
          });
        } else {
          runtimeSoundOneShotChannelsRef.current.add(audio);
          audio.onended = () => {
            runtimeSoundOneShotChannelsRef.current.delete(audio);
          };
          audio.onerror = () => {
            runtimeSoundOneShotChannelsRef.current.delete(audio);
          };
        }
        markRuntimeSoundAsNowPlaying(object.id, nowUnixMs, previewKey);
        void audio.play().catch(() => {
          runtimeSoundOneShotChannelsRef.current.delete(audio);
          if (playStyle === "loop") {
            stopRuntimeLoopSoundChannelById(object.id);
          }
        });

        if (playStyle === "once") {
          playbackState.playedOnce = true;
          playbackState.nextPlayAtUnixMs = Number.POSITIVE_INFINITY;
        } else if (playStyle === "loop") {
          playbackState.playedOnce = true;
          playbackState.nextPlayAtUnixMs = Number.POSITIVE_INFINITY;
        } else {
          playbackState.nextPlayAtUnixMs =
            nowUnixMs + resolveNextRuntimeSoundDelayMs(intervalMs, intervalVariationMs);
        }
      }

      syncRuntimeSoundNowPlayingState(nowUnixMs);
    };

    playTick();
    const timerId = window.setInterval(playTick, SOUND_RUNTIME_TICK_MS);
    return () => {
      window.clearInterval(timerId);
      stopAllRuntimeSoundChannels();
    };
  }, [
    enableRuntimeSoundPreview,
    markRuntimeSoundAsNowPlaying,
    sceneObjects,
    stopAllRuntimeSoundChannels,
    stopRuntimeLoopSoundChannelById,
    syncRuntimeSoundNowPlayingState,
    soundListenerRuntimePort,
    toolbarState,
    renderObjectIdsSet,
    unitsPerTile,
    runtimeRef
  ]);

  return {
    runtimeSoundNowPlayingBadges,
    playSelectedSoundPreview,
    stopSoundPreviewPlayback
  };
}
