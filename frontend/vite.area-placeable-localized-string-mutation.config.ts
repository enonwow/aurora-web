import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/scene/domain/placeableLocalizedStrings.test.ts",
      "tests/unit/modules/layout/application/placeableLocalizedStringProvenance.test.ts",
      "tests/unit/modules/areas/areaSceneMapper.test.ts",
      "tests/unit/modules/scene/domain/sceneFactory.test.ts",
      "tests/unit/modules/layout/application/placeableLocalizedStringsPreservation.test.ts",
      "tests/unit/modules/layout/components/properties/PlaceablePropertiesDialog.test.tsx"
    ]
  }
});
