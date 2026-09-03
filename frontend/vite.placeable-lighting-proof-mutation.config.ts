import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/layout/auroraPlaceableLightingProof.test.ts",
      "tests/unit/modules/layout/auroraPlaceableLightingProofAdapter.test.ts"
    ]
  }
});
