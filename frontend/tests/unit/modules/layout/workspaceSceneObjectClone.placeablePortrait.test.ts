import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable PortraitId", () => {
  it("independently clones immutable table provenance and the Advanced target", () => {
    const source = createNewSceneObject("placeables", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:plc_chest:source",
      placeablePortrait: {
        expectedValue: 462,
        tableSha256: "a".repeat(64),
        tableRowCount: 700,
      },
    };
    source.placeableProperties!.advancedSettings = {
      portraitId: 462,
      portraitResRef: "po_hu_m_01_",
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.placeablePortrait).toEqual(source.source.placeablePortrait);
    expect(cloned.source?.placeablePortrait).not.toBe(source.source.placeablePortrait);
    expect(cloned.placeableProperties?.advancedSettings).toEqual({
      portraitId: 462,
      portraitResRef: "po_hu_m_01_",
    });
    expect(cloned.placeableProperties?.advancedSettings)
      .not.toBe(source.placeableProperties.advancedSettings);
  });
});
