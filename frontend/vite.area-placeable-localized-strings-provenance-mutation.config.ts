import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/scene/domain/placeableLocalizedStrings.test.ts",
      "tests/unit/modules/areas/httpAreaApiPort.test.ts",
      "tests/unit/modules/areas/areaSceneMapper.test.ts",
      "tests/unit/modules/layout/application/placeableLocalizedStringsPreservation.test.ts",
    ],
  },
});
