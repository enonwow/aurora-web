import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/scene/domain/placeableDurabilitySaveBytes.test.ts",
      "tests/unit/modules/areas/areaSceneMapper.test.ts",
      "tests/unit/modules/layout/application/placeableDurabilitySaveProvenance.test.ts",
      "tests/unit/modules/layout/workspaceSceneObjectClone.placeableDurabilitySave.test.ts",
      "tests/unit/modules/layout/components/properties/PlaceablePropertiesDialog.test.tsx"
    ]
  }
});
