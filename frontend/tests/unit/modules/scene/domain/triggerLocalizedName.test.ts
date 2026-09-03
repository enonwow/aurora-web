import { describe, expect, it } from "vitest";

import {
  MAX_TRIGGER_LOCALIZED_NAME_ASCII_BYTES,
  canEditExistingTriggerLocalizedName,
  isTriggerLocalizedNameInlineAsciiText,
  readExistingTriggerLocalizedNameSourceValue,
  readTriggerLocalizedNameInlineAsciiStorage,
  readTriggerLocalizedNameStorage,
} from "../../../../../src/modules/scene/domain/triggerLocalizedName";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "trigger" as const,
  sourceIndex: 0,
  triggerLocalizedNameStorage: {
    present: true as const,
    strRef: 0xffff_ffff,
    entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
  },
};

describe("retained Trigger LocalizedName domain", () => {
  it("freezes the 256-byte exact printable-ASCII profile", () => {
    expect(MAX_TRIGGER_LOCALIZED_NAME_ASCII_BYTES).toBe(256);
    expect(isTriggerLocalizedNameInlineAsciiText(" Gate Trigger ")).toBe(true);
    expect(isTriggerLocalizedNameInlineAsciiText("Północ")).toBe(false);
    expect(isTriggerLocalizedNameInlineAsciiText("A".repeat(257))).toBe(false);
  });

  it("reads complete storage and admits only one inline language-0 value", () => {
    expect(readTriggerLocalizedNameStorage(exactSource.triggerLocalizedNameStorage))
      .toEqual(exactSource.triggerLocalizedNameStorage);
    expect(readTriggerLocalizedNameInlineAsciiStorage(
      exactSource.triggerLocalizedNameStorage,
    )).toBe("Gate Trigger");
    expect(readTriggerLocalizedNameInlineAsciiStorage({
      present: true,
      strRef: 14759,
      entries: [],
    })).toBeUndefined();
  });

  it("requires exact Trigger family, ordinal, and admitted provenance", () => {
    expect(canEditExistingTriggerLocalizedName(exactSource)).toBe(true);
    expect(readExistingTriggerLocalizedNameSourceValue(exactSource)).toBe("Gate Trigger");
    expect(canEditExistingTriggerLocalizedName({
      ...exactSource,
      sourceKind: "encounter",
    })).toBe(false);
    expect(canEditExistingTriggerLocalizedName({
      ...exactSource,
      triggerLocalizedNameStorage: {
        present: true,
        strRef: 14759,
        entries: [],
      },
    })).toBe(false);
  });
});
