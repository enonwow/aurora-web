import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableTemplateResRef,
  materializeExistingPlaceableTemplateResRef,
  reduceExistingPlaceableTemplateResRef,
} from "../../../../../src/modules/layout/application/placeableTemplateResRefProvenance";

describe("Existing Placeable TemplateResRef provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "placeable" as const,
    placeableTemplateResRef: "plc_chest",
  };
  const current = {
    blueprintResRef: "plc_chest",
    conversation: "old_conv",
    noInterrupt: true,
  };

  it("admits only an exact existing GIT Placeable source", () => {
    expect(canEditExistingPlaceableTemplateResRef(source)).toBe(true);
    expect(canEditExistingPlaceableTemplateResRef({ ...source, type: "seed" })).toBe(false);
    expect(canEditExistingPlaceableTemplateResRef({ ...source, sourceKind: "creature" })).toBe(false);
    expect(canEditExistingPlaceableTemplateResRef({ ...source, placeableTemplateResRef: "PLC_CHEST" }))
      .toBe(false);
    expect(canEditExistingPlaceableTemplateResRef({
      type: "aurora_git",
      sourceKind: "placeable",
    })).toBe(false);
  });

  it("reduces only admitted targets verbatim", () => {
    expect(reduceExistingPlaceableTemplateResRef(source, "plc_chest", "plc_chest_alt"))
      .toBe("plc_chest_alt");
    expect(reduceExistingPlaceableTemplateResRef(source, "plc_chest", "PLC_CHEST_ALT"))
      .toBe("plc_chest");
    expect(reduceExistingPlaceableTemplateResRef({ ...source, type: "seed" }, "keep", "plc_alt"))
      .toBe("keep");
  });

  it("materializes only blueprintResRef and preserves every sibling", () => {
    expect(materializeExistingPlaceableTemplateResRef(source, current, "plc_chest_alt"))
      .toEqual({ ...current, blueprintResRef: "plc_chest_alt" });
    expect(materializeExistingPlaceableTemplateResRef(source, current, "bad-alt"))
      .toBe(current);
    expect(materializeExistingPlaceableTemplateResRef({ ...source, type: "seed" }, current, "plc_alt"))
      .toBe(current);
    expect(materializeExistingPlaceableTemplateResRef(source, undefined, "plc_alt"))
      .toBeUndefined();
  });
});
