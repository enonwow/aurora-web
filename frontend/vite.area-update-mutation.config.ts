import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/areas/areaUpdateDraftAdmission.test.ts",
      "tests/unit/modules/areas/areaUpdateFacade.test.ts",
      "tests/unit/modules/areas/httpAreaUpdateApiPort.test.ts"
    ]
  }
});
