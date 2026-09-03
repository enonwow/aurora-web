import { describe, expect, it } from "vitest";
import {
  MAX_ITEM_PROPERTY_LIST_ENTRIES,
  itemPropertyListEntriesEqual,
  itemPropertyListSourceEntriesEqual,
  readItemPropertyListProvenance,
  readItemPropertyListTargetEntries,
} from "../../../../../src/modules/scene/domain/itemPropertyList";

const entry = (overrides: Record<string, unknown> = {}) => ({
  propertyName: 1,
  subtype: 0xffff,
  costTable: 2,
  costValue: 3,
  param1: 0xff,
  param1Value: 0,
  chanceAppear: 100,
  ...overrides,
});

describe("itemPropertyList", () => {
  it("reads and detaches one exact duplicate-preserving source and target vector", () => {
    const raw = {
      present: true,
      expectedEntries: [
        { sourceIndex: 0, ...entry() },
        { sourceIndex: 1, ...entry() },
      ],
    };
    const provenance = readItemPropertyListProvenance(raw);
    const target = readItemPropertyListTargetEntries([entry(), entry()]);

    expect(provenance).toEqual(raw);
    expect(provenance).not.toBe(raw);
    expect(provenance?.expectedEntries).not.toBe(raw.expectedEntries);
    expect(target).toEqual([entry(), entry()]);
    expect(itemPropertyListEntriesEqual(provenance!.expectedEntries, target!)).toBe(true);
    expect(itemPropertyListSourceEntriesEqual(
      provenance!.expectedEntries,
      provenance!.expectedEntries.map((value) => ({ ...value })),
    )).toBe(true);
  });

  it("represents physical absence without granting entries", () => {
    expect(readItemPropertyListProvenance({ present: false, expectedEntries: [] }))
      .toEqual({ present: false, expectedEntries: [] });
    expect(readItemPropertyListProvenance({
      present: false,
      expectedEntries: [{ sourceIndex: 0, ...entry() }],
    })).toBeNull();
  });

  it.each([
    ["missing field", [{ propertyName: 1 }]],
    ["extra field", [entry({ label: "display only" })]],
    ["noninteger", [entry({ costValue: 1.5 })]],
    ["overflow Word", [entry({ subtype: 0x1_0000 })]],
    ["overflow Byte", [entry({ param1Value: 0x100 })]],
    ["property-48 invariant", [entry({ propertyName: 48, costTable: 23 })]],
  ])("rejects target entries with %s", (_label, value) => {
    expect(readItemPropertyListTargetEntries(value)).toBeNull();
  });

  it("rejects nonsequential source indexes and the inline budget overflow", () => {
    expect(readItemPropertyListProvenance({
      present: true,
      expectedEntries: [{ sourceIndex: 1, ...entry() }],
    })).toBeNull();
    expect(readItemPropertyListTargetEntries(Array.from(
      { length: MAX_ITEM_PROPERTY_LIST_ENTRIES + 1 },
      () => entry(),
    ))).toBeNull();
  });
});
