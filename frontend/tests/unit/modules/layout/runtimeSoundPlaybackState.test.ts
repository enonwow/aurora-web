import { describe, expect, it } from "vitest";
import {
  createRuntimeSoundPlaybackState,
  reconcileRuntimeSoundPlaybackState,
  type RuntimeSoundPlaybackState
} from "../../../../src/modules/layout/runtimeSoundPlaybackState";

describe("runtimeSoundPlaybackState", () => {
  it("creates initial playback state with warmup", () => {
    const state = createRuntimeSoundPlaybackState(1000, "repeat", 250);
    expect(state).toEqual({
      nextPlayAtUnixMs: 1250,
      nextSequentialIndex: 0,
      playedOnce: false,
      lastPlayStyle: "repeat"
    });
  });

  it("keeps once+playedOnce infinity unchanged", () => {
    const state: RuntimeSoundPlaybackState = {
      nextPlayAtUnixMs: Number.POSITIVE_INFINITY,
      nextSequentialIndex: 1,
      playedOnce: true,
      lastPlayStyle: "once"
    };
    const patch = reconcileRuntimeSoundPlaybackState(state, "once", 2000);
    expect(patch.shouldStopLoopChannel).toBe(false);
    expect(state.nextPlayAtUnixMs).toBe(Number.POSITIVE_INFINITY);
    expect(state.playedOnce).toBe(true);
  });

  it("resets infinity and playedOnce when switching from once to repeat", () => {
    const state: RuntimeSoundPlaybackState = {
      nextPlayAtUnixMs: Number.POSITIVE_INFINITY,
      nextSequentialIndex: 0,
      playedOnce: true,
      lastPlayStyle: "once"
    };
    const patch = reconcileRuntimeSoundPlaybackState(state, "repeat", 5000, 200);
    expect(patch.shouldStopLoopChannel).toBe(false);
    expect(state.lastPlayStyle).toBe("repeat");
    expect(state.playedOnce).toBe(false);
    expect(state.nextPlayAtUnixMs).toBe(5200);
  });

  it("requests loop channel stop when leaving loop style", () => {
    const state: RuntimeSoundPlaybackState = {
      nextPlayAtUnixMs: Number.POSITIVE_INFINITY,
      nextSequentialIndex: 0,
      playedOnce: true,
      lastPlayStyle: "loop"
    };
    const patch = reconcileRuntimeSoundPlaybackState(state, "repeat", 9000, 200);
    expect(patch.shouldStopLoopChannel).toBe(true);
    expect(state.lastPlayStyle).toBe("repeat");
    expect(state.nextPlayAtUnixMs).toBe(9200);
    expect(state.playedOnce).toBe(false);
  });

  it("recovers repeat mode when nextPlayAt was infinite", () => {
    const state: RuntimeSoundPlaybackState = {
      nextPlayAtUnixMs: Number.POSITIVE_INFINITY,
      nextSequentialIndex: 3,
      playedOnce: false,
      lastPlayStyle: "repeat"
    };
    const patch = reconcileRuntimeSoundPlaybackState(state, "repeat", 10000, 350);
    expect(patch.shouldStopLoopChannel).toBe(false);
    expect(state.nextPlayAtUnixMs).toBe(10350);
    expect(state.playedOnce).toBe(false);
    expect(state.nextSequentialIndex).toBe(3);
  });
});
