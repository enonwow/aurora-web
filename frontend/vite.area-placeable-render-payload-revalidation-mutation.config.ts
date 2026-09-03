import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/layout/application/areaPlaceableRenderPayloadRevalidation.test.ts",
      "tests/unit/modules/placeables/placeableRenderPayloadResolver.test.ts",
      "tests/unit/modules/placeables/placeableThreeAssetLoader.cacheMissRecovery.test.ts"
    ],
    testNamePattern:
      "Area placeable render payload revalidation|fetchPlaceableViewportRenderPayload|placeable asset cache-miss recovery signal"
  }
});
