import { describe, expect, it } from "vitest";
import {
  appendExistingItemProperty,
  canEditExistingItemPropertyList,
  materializeExistingItemPropertyList,
  moveExistingItemProperty,
  removeExistingItemProperty,
  updateExistingItemPropertyField,
} from "../../../../../src/modules/layout/application/itemPropertyListProvenance";
import type {
  SceneObjectItemPropertyEntry,
  SceneObjectSourceMetadata,
} from "../../../../../src/modules/scene/contracts";

const source: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "item",
  sourceIndex: 0,
  itemPropertyList: {
    present: true,
    expectedEntries: [
      {
        sourceIndex: 0,
        propertyName: 43,
        subtype: 2,
        costTable: 3,
        costValue: 4,
        param1: 5,
        param1Value: 6,
        chanceAppear: 100,
      },
      {
        sourceIndex: 1,
        propertyName: 48,
        subtype: 7,
        costTable: 24,
        costValue: 8,
        param1: 9,
        param1Value: 10,
        chanceAppear: 75,
      },
    ],
  },
};

const current: SceneObjectItemPropertyEntry[] = source.itemPropertyList!.expectedEntries.map(
  ({ sourceIndex: _, ...entry }) => entry,
);

describe("itemPropertyListProvenance", () => {
  it("admits only exact, physically present retained Item provenance", () => {
    expect(canEditExistingItemPropertyList(source)).toBe(true);
    expect(canEditExistingItemPropertyList({
      ...source,
      itemPropertyList: { present: false, expectedEntries: [] },
    })).toBe(false);
    expect(canEditExistingItemPropertyList({ ...source, sourceKind: "placeable" })).toBe(false);
    expect(canEditExistingItemPropertyList({ ...source, itemPropertyList: undefined })).toBe(false);
  });

  it("appends an intentionally incomplete row without guessing Aurora values", () => {
    expect(appendExistingItemProperty(source, current)).toEqual([...current, {}]);
    expect(source.itemPropertyList!.expectedEntries).toHaveLength(2);
  });

  it("updates only native persistence fields and native numeric ranges", () => {
    expect(updateExistingItemPropertyField(
      source,
      current,
      0,
      "chanceAppear",
      42,
    )).toEqual([{ ...current[0], chanceAppear: 42 }, current[1]]);
    expect(updateExistingItemPropertyField(
      source,
      current,
      0,
      "param1",
      undefined,
    )).toEqual([{ ...current[0], param1: undefined }, current[1]]);
    expect(updateExistingItemPropertyField(
      source,
      current,
      0,
      "costTable",
      256,
    )).toBe(current);
    expect(updateExistingItemPropertyField(
      source,
      current,
      0,
      "propertyLabel",
      "not-persisted",
    )).toBe(current);
  });

  it("removes and reorders entries without mutating source provenance", () => {
    expect(removeExistingItemProperty(source, current, 0)).toEqual([current[1]]);
    expect(moveExistingItemProperty(source, current, 0, "down")).toEqual([
      current[1],
      current[0],
    ]);
    expect(source.itemPropertyList!.expectedEntries[0]!.propertyName).toBe(43);
  });

  it("materializes only a complete canonical vector and returns detached entries", () => {
    const candidate = [{ ...current[0], chanceAppear: 35 }];
    const materialized = materializeExistingItemPropertyList(source, current, candidate);
    expect(materialized).toEqual(candidate);
    expect(materialized).not.toBe(candidate);
    expect(materialized?.[0]).not.toBe(candidate[0]);

    expect(materializeExistingItemPropertyList(source, current, [
      { propertyName: 43 },
    ])).toEqual(current);
    expect(materializeExistingItemPropertyList(source, current, [
      { ...current[1], costTable: 23 },
    ])).toEqual(current);
  });
});
