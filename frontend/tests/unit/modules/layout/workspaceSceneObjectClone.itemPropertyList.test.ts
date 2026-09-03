import { describe, expect, it } from "vitest";
import { cloneSceneObject } from "../../../../src/modules/layout/application/workspaceSceneObjectClone";
import { createNewSceneObject } from "../../../../src/modules/scene/domain/sceneFactory";

describe("cloneSceneObject ground-Item PropertiesList", () => {
  it("clones immutable provenance and editable target independently", () => {
    const entry = {
      propertyName: 1,
      subtype: 0xffff,
      costTable: 2,
      costValue: 3,
      param1: 0xff,
      param1Value: 0,
      chanceAppear: 100,
    };
    const source = createNewSceneObject("items", 1, 2, 1);
    source.source = {
      type: "aurora_git",
      sourceKind: "item",
      sourceIndex: 0,
      sourceObjectId: "itm:0:properties_list",
      itemPropertyList: {
        present: true,
        expectedEntries: [{ sourceIndex: 0, ...entry }],
      },
    };
    source.itemProperties = { propertyList: [{ ...entry, costValue: 4 }] };

    const cloned = cloneSceneObject(source);

    expect(cloned.source?.itemPropertyList).toEqual(source.source.itemPropertyList);
    expect(cloned.source?.itemPropertyList).not.toBe(source.source.itemPropertyList);
    expect(cloned.source?.itemPropertyList?.expectedEntries)
      .not.toBe(source.source.itemPropertyList.expectedEntries);
    expect(cloned.itemProperties?.propertyList).toEqual(source.itemProperties.propertyList);
    expect(cloned.itemProperties?.propertyList).not.toBe(source.itemProperties.propertyList);
  });
});
