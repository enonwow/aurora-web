import {
  createLayoutPreferencesFacade,
  type LayoutPreferencesFacade
} from "./layoutPreferencesFacade";
import {
  createWorkspaceChromeFacade,
  type WorkspaceChromeFacade
} from "./workspaceChromeFacade";
import { createViewportFacade, type ViewportFacade } from "./viewportFacade";
import type { LayoutPreferencesPort } from "../ports/layoutPreferencesPort";

export interface LayoutFacadeBundle {
  preferences: LayoutPreferencesFacade;
  chrome: WorkspaceChromeFacade;
  viewport: ViewportFacade;
}

interface LayoutFacadeBundleDependencies {
  preferencesPort: LayoutPreferencesPort;
}

export function createLayoutFacadeBundle(
  dependencies: LayoutFacadeBundleDependencies
): LayoutFacadeBundle {
  return {
    preferences: createLayoutPreferencesFacade(dependencies.preferencesPort),
    chrome: createWorkspaceChromeFacade(),
    viewport: createViewportFacade()
  };
}
