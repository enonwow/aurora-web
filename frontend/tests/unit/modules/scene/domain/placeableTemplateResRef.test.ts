import { describe, expect, it } from "vitest";

import {
  isPlaceableTemplateResRef,
  readPlaceableTemplateResRef,
} from "../../../../../src/modules/scene/domain/placeableTemplateResRef";

describe("Placeable TemplateResRef", () => {
  it.each(["a", "plc_chest", "abcdefghijklmnop", "a_0"])(
    "admits the exact lowercase native profile: %s",
    (value) => expect(isPlaceableTemplateResRef(value)).toBe(true),
  );

  it.each(["", "PLC_CHEST", "abcdefghijklmnopq", "bad-resref", "bad value", "żuraw", 1, null])(
    "rejects an unproven profile: %#",
    (value) => expect(isPlaceableTemplateResRef(value)).toBe(false),
  );

  it("reads only the exact value without normalization", () => {
    expect(readPlaceableTemplateResRef("plc_chest")).toBe("plc_chest");
    expect(readPlaceableTemplateResRef("PLC_CHEST")).toBeUndefined();
    expect(readPlaceableTemplateResRef(" plc_chest ")).toBeUndefined();
  });
});
