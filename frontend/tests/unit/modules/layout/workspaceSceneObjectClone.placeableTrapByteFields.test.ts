import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Placeable trap Byte fields", () => {
  it("preserves immutable provenance and independently clones the editable target for cancel/undo", () => {
    const source = createNewSceneObject("placeables", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "plc:0:plc_watertrough:source",
      placeableTrapSettings: {
        isTrapped: false,
        detectable: true,
        disarmable: true,
        oneShot: true,
        detectionDc: 0,
        disarmDc: 15
      },
      placeableTrapType: {
        expectedValue: 1,
        tableSha256: "d".repeat(64),
        tableRowCount: 2
      }
    };
    source.placeableProperties!.trapSettings = {
      ...source.placeableProperties!.trapSettings!,
      isTrapped: false,
      detectable: true,
      disarmable: true,
      oneShot: true,
      detectionDc: 0,
      disarmDc: 15,
      trapTypeRow: 1,
      setDc: 20,
      detectDcModWhenSetByRogue: 2,
      disarmDcModWhenSetByRogue: 6
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.placeableTrapSettings).toEqual(source.source.placeableTrapSettings);
    expect(cloned.source?.placeableTrapSettings).not.toBe(source.source.placeableTrapSettings);
    expect(cloned.source?.placeableTrapType).toEqual(source.source.placeableTrapType);
    expect(cloned.source?.placeableTrapType).not.toBe(source.source.placeableTrapType);
    expect(cloned.placeableProperties?.trapSettings).toEqual(
      source.placeableProperties.trapSettings
    );
    expect(cloned.placeableProperties?.trapSettings).not.toBe(
      source.placeableProperties.trapSettings
    );
  });
});
