import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureTag,
  materializeExistingCreatureTag,
  reduceExistingCreatureTag,
} from "../../../../../src/modules/layout/application/creatureTagProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureTag: { present: true, value: "NW_GUARD" },
};

describe("existing Creature Tag provenance", () => {
  it("activates only exact present native Creature provenance", () => {
    expect(canEditExistingCreatureTag(exactSource)).toBe(true);
    expect(canEditExistingCreatureTag({ ...exactSource, creatureTag: { present: false } })).toBe(false);
    expect(canEditExistingCreatureTag({ ...exactSource, sourceKind: "placeable" })).toBe(false);
    expect(canEditExistingCreatureTag({ ...exactSource, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureTag({
      ...exactSource,
      creatureTag: { present: true, value: "x".repeat(33) },
    })).toBe(false);
  });

  it("reduces admitted values verbatim, including empty and whitespace-only", () => {
    expect(reduceExistingCreatureTag(exactSource, "NW_GUARD", "  renamed  "))
      .toBe("  renamed  ");
    expect(reduceExistingCreatureTag(exactSource, "NW_GUARD", "")).toBe("");
    expect(reduceExistingCreatureTag(exactSource, "NW_GUARD", "   ")).toBe("   ");
  });

  it("fails closed for preserve-only or malformed candidates", () => {
    expect(materializeExistingCreatureTag(
      { ...exactSource, creatureTag: { present: false } },
      "NW_GUARD",
      "RENAMED",
    )).toBe("NW_GUARD");
    expect(materializeExistingCreatureTag(exactSource, "NW_GUARD", "x".repeat(33)))
      .toBe("NW_GUARD");
    expect(materializeExistingCreatureTag(exactSource, "NW_GUARD", "bad\0tag"))
      .toBe("NW_GUARD");
  });
});
