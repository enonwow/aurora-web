import type { SceneDraftPort } from "../ports/sceneDraftPort";
import {
  createSceneCanvasFacade,
  type SceneCanvasFacade
} from "./sceneCanvasFacade";
import {
  createSceneHistoryFacade,
  type SceneHistoryFacade
} from "./sceneHistoryFacade";
import {
  createSceneMutationsFacade,
  type SceneMutationsFacade
} from "./sceneMutationsFacade";

interface SceneFacadeBundleDependencies {
  draftPort: SceneDraftPort;
  now?: () => number;
}

export interface SceneFacadeBundle {
  canvas: SceneCanvasFacade;
  history: SceneHistoryFacade;
  mutations: SceneMutationsFacade;
}

export function createSceneFacadeBundle(
  dependencies: SceneFacadeBundleDependencies
): SceneFacadeBundle {
  return {
    canvas: createSceneCanvasFacade({
      draftPort: dependencies.draftPort,
      now: dependencies.now
    }),
    history: createSceneHistoryFacade(),
    mutations: createSceneMutationsFacade()
  };
}
