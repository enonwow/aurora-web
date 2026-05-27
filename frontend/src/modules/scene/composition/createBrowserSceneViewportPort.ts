import {
  createSceneViewportPort,
  type SceneViewportPort
} from "../application/sceneViewportPort";
import { createBrowserSceneFacadeBundle } from "./createBrowserSceneFacadeBundle";

export function createBrowserSceneViewportPort(
  storage: Storage | null = typeof window === "undefined" ? null : window.localStorage,
  now: () => number = () => Date.now()
): SceneViewportPort {
  return createSceneViewportPort(createBrowserSceneFacadeBundle(storage, now));
}
