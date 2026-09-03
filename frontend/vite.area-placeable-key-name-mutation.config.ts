import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/areas/areaSceneMapper.test.ts",
      "tests/unit/modules/layout/application/placeableLockProvenance.test.ts",
      "tests/unit/modules/layout/components/properties/LockTrapPropertySections.test.tsx",
      "tests/unit/modules/layout/components/properties/PlaceablePropertiesDialog.test.tsx"
    ]
  }
});
