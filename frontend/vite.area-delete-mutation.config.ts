import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/areas/areaDeleteAdmission.test.ts",
      "tests/unit/modules/areas/areaDeleteFacade.test.ts",
      "tests/unit/modules/areas/httpAreaDeleteApiPort.test.ts"
    ]
  }
});
