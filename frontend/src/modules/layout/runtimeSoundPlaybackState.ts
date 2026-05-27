export type RuntimeSoundPlayStyle = "once" | "repeat" | "loop";

export interface RuntimeSoundPlaybackState {
  nextPlayAtUnixMs: number;
  nextSequentialIndex: number;
  playedOnce: boolean;
  lastPlayStyle: RuntimeSoundPlayStyle;
}

export function createRuntimeSoundPlaybackState(
  nowUnixMs: number,
  playStyle: RuntimeSoundPlayStyle,
  warmupMs = 200
): RuntimeSoundPlaybackState {
  return {
    nextPlayAtUnixMs: nowUnixMs + Math.max(0, warmupMs),
    nextSequentialIndex: 0,
    playedOnce: false,
    lastPlayStyle: playStyle
  };
}

export function reconcileRuntimeSoundPlaybackState(
  state: RuntimeSoundPlaybackState,
  playStyle: RuntimeSoundPlayStyle,
  nowUnixMs: number,
  warmupMs = 200
): { shouldStopLoopChannel: boolean } {
  let shouldStopLoopChannel = false;
  const nextWarmupAt = nowUnixMs + Math.max(0, warmupMs);

  if (state.lastPlayStyle !== playStyle) {
    shouldStopLoopChannel = state.lastPlayStyle === "loop";
    state.lastPlayStyle = playStyle;
    state.playedOnce = false;
    state.nextPlayAtUnixMs = nextWarmupAt;
  }

  if (
    !Number.isFinite(state.nextPlayAtUnixMs) &&
    (playStyle !== "once" || !state.playedOnce)
  ) {
    state.playedOnce = false;
    state.nextPlayAtUnixMs = nextWarmupAt;
  }

  return { shouldStopLoopChannel };
}
