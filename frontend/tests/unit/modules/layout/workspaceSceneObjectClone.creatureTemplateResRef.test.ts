import { describe, expect, it } from "vitest";

import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Creature TemplateResRef", () => {
  it("preserves immutable provenance, renderer identity, and an independent Advanced snapshot", () => {
    const source = createNewSceneObject("creatures", 1, 2, 1);
    source.resRef = "renderer_identity";
    source.source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId: "creature:0:source",
      sourceIndex: 0,
      creatureTemplateResRef: { expectedResRef: "nw_guard" },
    };
    source.creatureProperties!.advancedSettings = {
      ...source.creatureProperties!.advancedSettings!,
      blueprintResRef: "nw_guard",
      faction: "Hostile",
    };

    const cloned = cloneSceneObject(source);

    expect(cloned.resRef).toBe("renderer_identity");
    expect(cloned.source?.creatureTemplateResRef).toEqual({ expectedResRef: "nw_guard" });
    expect(cloned.source?.creatureTemplateResRef)
      .not.toBe(source.source.creatureTemplateResRef);
    expect(cloned.creatureProperties?.advancedSettings).toEqual({
      ...source.creatureProperties?.advancedSettings,
    });
    expect(cloned.creatureProperties?.advancedSettings)
      .not.toBe(source.creatureProperties?.advancedSettings);
  });
});
