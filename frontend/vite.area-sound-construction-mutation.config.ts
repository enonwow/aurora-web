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
      /Area waypoint construction profile|creates new waypoints from the exact admitted Aurora UTW blueprint profile|assigns sound positioning baseline to sound objects|round-trips immutable Aurora blueprint provenance for a new waypoint|round-trips immutable Aurora blueprint provenance for a new sound/u,
  },
});
