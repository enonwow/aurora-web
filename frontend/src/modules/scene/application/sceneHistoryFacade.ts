import type {
  AreaScene,
  SceneHistoryState
} from "../contracts";
import {
  commitSceneHistory,
  redoSceneHistory,
  undoSceneHistory
} from "../sceneHistory";

export interface SceneHistoryFacade {
  commit(history: SceneHistoryState, nextScene: AreaScene): SceneHistoryState;
  undo(history: SceneHistoryState): SceneHistoryState;
  redo(history: SceneHistoryState): SceneHistoryState;
}

export function createSceneHistoryFacade(): SceneHistoryFacade {
  return {
    commit(history: SceneHistoryState, nextScene: AreaScene): SceneHistoryState {
      return commitSceneHistory(history, nextScene);
    },
    undo(history: SceneHistoryState): SceneHistoryState {
      return undoSceneHistory(history);
    },
    redo(history: SceneHistoryState): SceneHistoryState {
      return redoSceneHistory(history);
    }
  };
}

