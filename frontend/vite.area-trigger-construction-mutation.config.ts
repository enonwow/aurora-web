import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/scene/sceneFactory.test.ts",
      "tests/unit/modules/scene/localDraftStore.test.ts",
      "tests/unit/modules/scene/domain/areaWaypointConstructionProfile.test.ts",
    ],
    testNamePattern:
      /Area waypoint construction profile|creates new triggers from the exact admitted Aurora UTT blueprint profile|round-trips immutable Aurora blueprint provenance for a new trigger/u,
  },
});
