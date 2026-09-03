import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/scene/domain/placeableTrapType.test.ts",
      "tests/unit/modules/layout/placeableTrapTypeProvenance.test.ts",
      "tests/unit/modules/areas/areaSceneMapper.test.ts",
      "tests/unit/modules/areas/httpAreaLifecyclePort.test.ts",
      "tests/unit/modules/layout/components/properties/PlaceablePropertiesDialog.test.tsx",
      "tests/unit/modules/layout/workspaceSceneObjectClone.placeableTrapByteFields.test.ts",
      "tests/unit/modules/scene/domain/sceneFactory.test.ts"
    ]
  }
});
