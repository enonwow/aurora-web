import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/layout/application/placeableBasicIdentityPreservation.test.ts",
      "tests/unit/modules/layout/components/properties/PlaceablePropertiesDialog.test.tsx"
    ],
    testNamePattern:
      "existing Area Placeable basic identity preservation|PlaceablePropertiesDialog"
  }
});
