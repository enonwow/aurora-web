import {
  createSceneFacadeBundle,
  type SceneFacadeBundle
} from "../application/sceneFacadeBundle";
import { createLocalStorageSceneDraftPort } from "../adapters/localStorageSceneDraftPort";

export function createBrowserSceneFacadeBundle(
  storage: Storage | null = typeof window === "undefined" ? null : window.localStorage,
  now: () => number = () => Date.now()
): SceneFacadeBundle {
  return createSceneFacadeBundle({
    draftPort: createLocalStorageSceneDraftPort(storage),
    now
  });
}
