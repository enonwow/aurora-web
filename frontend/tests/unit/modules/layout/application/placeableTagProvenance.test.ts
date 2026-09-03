import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableTag,
  materializeExistingPlaceableTag,
  reduceExistingPlaceableTag,
} from "../../../../../src/modules/layout/application/placeableTagProvenance";
import { isEditablePlaceableTag } from "../../../../../src/modules/scene/domain/placeableTag";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "placeable" as const,
  sourceIndex: 7,
  placeableBasicIdentity: {
    tag: { present: true as const, value: "WaterTrough" },
    appearance: { present: false as const },
  },
};

describe("existing Placeable Tag provenance", () => {
  it("admits exact bounded strings without normalization", () => {
    expect(isEditablePlaceableTag("")).toBe(true);
    expect(isEditablePlaceableTag(" A ")).toBe(true);
    expect(isEditablePlaceableTag("x".repeat(32))).toBe(true);
    expect(isEditablePlaceableTag("x".repeat(33))).toBe(false);
    expect(isEditablePlaceableTag("bad\0tag")).toBe(false);
    expect(isEditablePlaceableTag(15)).toBe(false);
    expect(isEditablePlaceableTag(undefined)).toBe(false);
  });

  it("requires exact existing Placeable provenance and an immutable family ordinal", () => {
    expect(canEditExistingPlaceableTag(exactSource)).toBe(true);
    expect(canEditExistingPlaceableTag({ ...exactSource, type: "seed" })).toBe(false);
    expect(canEditExistingPlaceableTag({ ...exactSource, sourceKind: "door" })).toBe(false);
    expect(canEditExistingPlaceableTag({ ...exactSource, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingPlaceableTag({ ...exactSource, sourceIndex: -1 })).toBe(false);
    expect(canEditExistingPlaceableTag({
      ...exactSource,
      placeableBasicIdentity: {
        ...exactSource.placeableBasicIdentity,
        tag: { present: false as const },
      },
    })).toBe(false);
    expect(canEditExistingPlaceableTag({
      ...exactSource,
      placeableBasicIdentity: {
        ...exactSource.placeableBasicIdentity,
        tag: { present: false, value: "WaterTrough" } as never,
      },
    })).toBe(false);
  });

  it("reduces and materializes verbatim only under exact provenance", () => {
    expect(reduceExistingPlaceableTag(exactSource, "WaterTrough", " Water Trough "))
      .toBe(" Water Trough ");
    expect(reduceExistingPlaceableTag(exactSource, "WaterTrough", "x".repeat(33)))
      .toBe("WaterTrough");
    expect(reduceExistingPlaceableTag({ ...exactSource, sourceIndex: undefined }, "old", "new"))
      .toBe("old");
    expect(materializeExistingPlaceableTag(exactSource, "WaterTrough", ""))
      .toBe("");
    expect(materializeExistingPlaceableTag({ ...exactSource, type: "seed" }, "old", "new"))
      .toBe("old");
  });
});
