import { describe, expect, it } from "vitest";
import { cloneSceneObject } from
  "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject Encounter TemplateResRef", () => {
  it.each([
    [{ present: false }],
    [{ present: true, nativeType: "resref", value: "x2_gnoll001" }],
  ] as const)("deep-clones exact presence-sensitive provenance %#", (storage) => {
    const encounter = createNewSceneObject("encounters", 1, 2, 1) as any;
    encounter.encounterTemplateResRef = storage.present
      ? storage.value
      : undefined;
    encounter.source = {
      type: "aurora_git",
      sourceKind: "encounter",
      sourceIndex: 0,
      sourceObjectId: "enc:0:template_resref",
      encounterTemplateResRef: storage,
    };

    const cloned = cloneSceneObject(encounter) as any;

    expect(cloned.source?.encounterTemplateResRef).toEqual(storage);
    expect(cloned.source?.encounterTemplateResRef).not.toBe(storage);
    expect(cloned.encounterTemplateResRef).toBe(encounter.encounterTemplateResRef);
  });
});
