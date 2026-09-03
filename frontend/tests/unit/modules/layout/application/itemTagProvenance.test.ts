import { describe, expect, it } from "vitest";
import {
  canEditExistingItemTag,
  materializeExistingItemTag,
  reduceExistingItemTag,
} from "../../../../../src/modules/layout/application/itemTagProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "item",
  sourceIndex: 0,
  itemTag: { present: true, value: "NW_SWORD" },
};

describe("existing ground-Item Tag provenance", () => {
  it("activates only exact present native Item provenance", () => {
    expect(canEditExistingItemTag(exactSource)).toBe(true);
    expect(canEditExistingItemTag({ ...exactSource, itemTag: { present: false } })).toBe(false);
    expect(canEditExistingItemTag({ ...exactSource, sourceKind: "creature" })).toBe(false);
    expect(canEditExistingItemTag({ ...exactSource, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingItemTag({
      ...exactSource,
      itemTag: { present: true, value: "x".repeat(33) },
    })).toBe(false);
  });

  it("reduces admitted values verbatim, including empty and whitespace-only", () => {
    expect(reduceExistingItemTag(exactSource, "NW_SWORD", "  renamed  "))
      .toBe("  renamed  ");
    expect(reduceExistingItemTag(exactSource, "NW_SWORD", "")).toBe("");
    expect(reduceExistingItemTag(exactSource, "NW_SWORD", "   ")).toBe("   ");
  });

  it("fails closed for preserve-only or malformed candidates", () => {
    expect(materializeExistingItemTag(
      { ...exactSource, itemTag: { present: false } },
      "NW_SWORD",
      "RENAMED",
    )).toBe("NW_SWORD");
    expect(materializeExistingItemTag(exactSource, "NW_SWORD", "x".repeat(33)))
      .toBe("NW_SWORD");
    expect(materializeExistingItemTag(exactSource, "NW_SWORD", "bad\0tag"))
      .toBe("NW_SWORD");
  });
});
