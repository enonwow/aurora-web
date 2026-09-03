import { describe, expect, it } from "vitest";

import {
  canEditExistingTriggerLocalizedName,
  materializeExistingTriggerLocalizedName,
  readExistingTriggerLocalizedName,
  reduceExistingTriggerLocalizedName,
} from "../../../../../src/modules/layout/application/triggerLocalizedNameProvenance";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "trigger",
    sourceIndex: 0,
    triggerLocalizedNameStorage: {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
    },
  };
}

describe("existing Trigger LocalizedName provenance", () => {
  it("admits only exact retained inline ASCII storage", () => {
    expect(readExistingTriggerLocalizedName(exactSource())).toBe("Gate Trigger");
    expect(canEditExistingTriggerLocalizedName(exactSource())).toBe(true);
    expect(canEditExistingTriggerLocalizedName({
      ...exactSource(),
      triggerLocalizedNameStorage: {
        present: true,
        strRef: 14759,
        entries: [],
      },
    })).toBe(false);
  });

  it("reduces and materializes verbatim bounded ASCII while preserving unsupported input", () => {
    expect(reduceExistingTriggerLocalizedName(
      exactSource(),
      "Gate Trigger",
      " Inner Gate Trigger ",
    )).toBe(" Inner Gate Trigger ");
    expect(reduceExistingTriggerLocalizedName(
      exactSource(),
      "Gate Trigger",
      "Żółć",
    )).toBe("Gate Trigger");
    expect(materializeExistingTriggerLocalizedName(
      exactSource(),
      "Gate Trigger",
      "Inner Gate Trigger",
    )).toBe("Inner Gate Trigger");
    expect(materializeExistingTriggerLocalizedName(
      { ...exactSource(), sourceKind: "encounter" },
      "Gate Trigger",
      "Inner Gate Trigger",
    )).toBe("Gate Trigger");
  });
});
