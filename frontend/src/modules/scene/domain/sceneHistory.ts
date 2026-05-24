import type { AreaScene, SceneHistoryState } from "../contracts";

const DEFAULT_HISTORY_LIMIT = 120;

function cloneScene(scene: AreaScene): AreaScene {
  return JSON.parse(JSON.stringify(scene)) as AreaScene;
}

function withTimestamp(scene: AreaScene): AreaScene {
  return {
    ...scene,
    updatedAtUnixMs: Date.now()
  };
}

export function createSceneHistory(initialScene: AreaScene): SceneHistoryState {
  return {
    past: [],
    present: withTimestamp(cloneScene(initialScene)),
    future: []
  };
}

export function commitSceneHistory(
  history: SceneHistoryState,
  nextPresent: AreaScene,
  historyLimit = DEFAULT_HISTORY_LIMIT
): SceneHistoryState {
  if (nextPresent === history.present) {
    return history;
  }

  const normalizedLimit = Math.max(0, Math.floor(historyLimit));
  const nextPast = [...history.past, cloneScene(history.present)];
  if (nextPast.length > normalizedLimit) {
    nextPast.splice(0, nextPast.length - normalizedLimit);
  }

  return {
    past: nextPast,
    present: withTimestamp(cloneScene(nextPresent)),
    future: []
  };
}

export function undoSceneHistory(history: SceneHistoryState): SceneHistoryState {
  if (history.past.length === 0) {
    return history;
  }

  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: withTimestamp(cloneScene(previous)),
    future: [cloneScene(history.present), ...history.future]
  };
}

export function redoSceneHistory(history: SceneHistoryState): SceneHistoryState {
  if (history.future.length === 0) {
    return history;
  }

  const [next, ...restFuture] = history.future;
  return {
    past: [...history.past, cloneScene(history.present)],
    present: withTimestamp(cloneScene(next)),
    future: restFuture
  };
}
