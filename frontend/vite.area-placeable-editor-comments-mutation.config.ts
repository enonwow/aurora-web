import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/scene/domain/placeableEditorComment.test.ts",
      "tests/unit/modules/layout/application/placeableEditorCommentProvenance.test.ts",
      "tests/unit/modules/layout/workspaceSceneObjectClone.placeableEditorComment.test.ts",
      "tests/unit/modules/areas/areaSceneMapper.test.ts",
      "tests/unit/modules/layout/components/properties/PlaceablePropertiesDialog.test.tsx",
      "tests/unit/modules/layout/AreaSelectionPanel.copyOnOpen.test.tsx",
      "tests/unit/modules/areas/httpAreaLifecyclePort.test.ts"
    ]
  }
});
