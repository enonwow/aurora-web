import { describe, expect, it } from "vitest";

import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Waypoint Appearance", () => {
  it("deep-clones immutable waypoint.2da provenance and retains the target row", () => {
    const source = createNewSceneObject("waypoints", 1, 2, 1);
    source.waypointAppearance = 4;
    source.source = {
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      sourceObjectId: "waypoint:0:appearance",
      waypointAppearance: {
        present: true,
        nativeType: "byte",
        value: 1,
        table: {
          resourceName: "waypoint.2da",
          sourceObjectKey: "vanilla:waypoint.2da",
          sourceLayer: "vanilla",
          sha256: "a".repeat(64),
          sizeBytes: 321,
          rowCount: 5,
          rowIndex: 1,
        },
      },
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.waypointAppearance).toBe(4);
    expect(cloned.source?.waypointAppearance).toEqual(source.source.waypointAppearance);
    expect(cloned.source?.waypointAppearance).not.toBe(source.source.waypointAppearance);
    expect(cloned.source?.waypointAppearance?.table)
      .not.toBe(source.source.waypointAppearance.table);
  });
});
