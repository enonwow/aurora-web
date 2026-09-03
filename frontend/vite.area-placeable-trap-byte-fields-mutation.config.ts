import { mergeConfig } from "vitest/config";

import baseConfig from "./vite.config";

export default mergeConfig(baseConfig, {
  test: {
    include: [
      "tests/unit/modules/scene/domain/placeableTrapByteFields.test.ts",
      "tests/unit/modules/layout/application/placeableTrapByteProvenance.test.ts",
      "tests/unit/modules/layout/workspaceSceneObjectClone.placeableTrapByteFields.test.ts",
      "tests/unit/modules/areas/areaSceneMapper.test.ts",
      "tests/unit/modules/layout/components/properties/PlaceablePropertiesDialog.test.tsx"
    ]
  }
});
