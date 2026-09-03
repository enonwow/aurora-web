import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/scene/domain/areaWaypointConstructionProfile.test.ts",
      "tests/unit/modules/scene/domain/sceneFactory.doorHookConstruction.test.ts",
      "tests/unit/modules/scene/application/sceneAuthoringFacade.test.ts",
      "tests/unit/modules/scene/composition/createBrowserSceneViewportPort.test.ts",
      "tests/unit/modules/layout/useWorkspacePointerSelection.areaPlacementPreview.test.tsx",
      "tests/unit/modules/layout/useWorkspaceObjectAddDragDrop.test.tsx",
      "tests/unit/modules/layout/useWorkspaceObjectCommands.doorHook.test.tsx",
    ],
  },
});
