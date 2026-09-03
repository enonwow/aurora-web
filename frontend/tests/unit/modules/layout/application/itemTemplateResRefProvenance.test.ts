import { describe, expect, it } from "vitest";
import {
  canEditExistingItemTemplateResRef,
  materializeExistingItemTemplateResRef,
  reduceExistingItemTemplateResRef,
} from "../../../../../src/modules/layout/application/itemTemplateResRefProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "item",
  sourceIndex: 0,
  itemTemplateResRef: {
    present: true,
    nativeType: "resref",
    value: "nw_sword",
  },
};

describe("existing ground-Item TemplateResRef provenance", () => {
  it("activates only exact present native Item provenance", () => {
    expect(canEditExistingItemTemplateResRef(exactSource)).toBe(true);
    expect(canEditExistingItemTemplateResRef({
      ...exactSource,
      itemTemplateResRef: { present: false },
    })).toBe(false);
    expect(canEditExistingItemTemplateResRef({ ...exactSource, sourceKind: "creature" }))
      .toBe(false);
    expect(canEditExistingItemTemplateResRef({ ...exactSource, sourceIndex: undefined }))
      .toBe(false);
    expect(canEditExistingItemTemplateResRef({
      ...exactSource,
      itemTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: "NW_SWORD",
      },
    })).toBe(false);
  });

  it("reduces only admitted canonical targets", () => {
    expect(reduceExistingItemTemplateResRef(exactSource, "nw_sword", "custom_sword"))
      .toBe("custom_sword");
    expect(reduceExistingItemTemplateResRef(exactSource, "nw_sword", "CUSTOM_SWORD"))
      .toBe("nw_sword");
    expect(reduceExistingItemTemplateResRef(exactSource, "nw_sword", ""))
      .toBe("nw_sword");
  });

  it("fails closed for preserve-only provenance", () => {
    expect(materializeExistingItemTemplateResRef(
      { ...exactSource, itemTemplateResRef: { present: false } },
      "nw_sword",
      "custom_sword",
    )).toBe("nw_sword");
  });
});
