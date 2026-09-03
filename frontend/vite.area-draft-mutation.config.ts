import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/areas/areaDraftSaveQueue.test.ts",
      "tests/unit/modules/layout/useWorkspaceCommandSignal.areaDraft.test.tsx",
      "tests/unit/modules/layout/WorkspaceLayout.viewportWiring.test.tsx"
    ],
    testNamePattern:
      /areaDraftSaveQueue|useWorkspaceCommandSignal Area draft persistence|passes Area scene persistence ports down and refreshes the draft list after save/u
  }
});
