import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Creature script ResRefs", () => {
  it("deeply detaches immutable per-slot provenance and script-slot targets", () => {
    const source = createNewSceneObject("creatures", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:source",
      sourceIndex: 0,
      creatureScriptResRefs: {
        onHeartbeat: { expectedResRef: "NW_C2_DEFAULT1" },
        onSpawn: { expectedResRef: "nw_c2_default9" },
      },
    };
    source.creatureProperties!.scriptSlots = {
      ...source.creatureProperties!.scriptSlots!,
      onHeartbeat: "main",
      onSpawn: "spawn_probe",
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.creatureScriptResRefs).toEqual(
      source.source.creatureScriptResRefs,
    );
    expect(cloned.source?.creatureScriptResRefs)
      .not.toBe(source.source.creatureScriptResRefs);
    expect(cloned.source?.creatureScriptResRefs?.onHeartbeat)
      .not.toBe(source.source.creatureScriptResRefs.onHeartbeat);
    expect(cloned.creatureProperties?.scriptSlots)
      .not.toBe(source.creatureProperties?.scriptSlots);
  });
});
