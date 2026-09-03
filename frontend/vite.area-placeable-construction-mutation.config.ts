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
      /Area waypoint construction profile|creates scene objects with expected defaults|round-trips immutable Aurora blueprint provenance for a new placeable/u,
  },
});
