import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/scene/domain/placeableAnimationState.test.ts",
      "tests/unit/modules/layout/application/placeableAnimationStateProvenance.test.ts",
      "tests/unit/modules/layout/application/placeableConversationInterruptableProvenance.test.ts",
      "tests/unit/modules/layout/workspaceSceneObjectClone.placeableAnimationState.test.ts",
      "tests/unit/modules/areas/areaSceneMapper.test.ts",
      "tests/unit/modules/layout/components/properties/PlaceablePropertiesDialog.test.tsx",
      "tests/unit/modules/scene/sceneFactory.test.ts"
    ]
  }
});
