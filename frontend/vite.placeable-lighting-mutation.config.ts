import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/layout/canonicalSourceMdlLightFallbackPolicy.test.ts"
    ]
  }
});
