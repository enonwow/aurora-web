import { describe, expect, it } from "vitest";
import {
  canEditExistingTriggerTemplateResRef,
  materializeExistingTriggerTemplateResRef,
  reduceExistingTriggerTemplateResRef,
} from "../../../../../src/modules/layout/application/triggerTemplateResRefProvenance";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";

const exactSource = {
  type: "aurora_git",
  sourceKind: "trigger",
  sourceIndex: 0,
  triggerTemplateResRef: {
    present: true,
    nativeType: "resref",
    value: "newgeneric",
  },
} as unknown as SceneObjectSourceMetadata;

describe("existing Trigger TemplateResRef provenance", () => {
  it("activates only exact present native Trigger provenance", () => {
    expect(canEditExistingTriggerTemplateResRef(exactSource)).toBe(true);
    expect(canEditExistingTriggerTemplateResRef({
      ...exactSource,
      triggerTemplateResRef: { present: false },
    } as SceneObjectSourceMetadata)).toBe(false);
    expect(canEditExistingTriggerTemplateResRef({
      ...exactSource,
      sourceKind: "encounter",
    })).toBe(false);
    expect(canEditExistingTriggerTemplateResRef({
      ...exactSource,
      sourceIndex: undefined,
    })).toBe(false);
  });

  it("reduces and materializes only admitted canonical targets", () => {
    expect(reduceExistingTriggerTemplateResRef(
      exactSource,
      "newgeneric",
      "custom_trigger",
    )).toBe("custom_trigger");
    expect(reduceExistingTriggerTemplateResRef(
      exactSource,
      "newgeneric",
      "CUSTOM_TRIGGER",
    )).toBe("newgeneric");
    expect(materializeExistingTriggerTemplateResRef(
      { ...exactSource, triggerTemplateResRef: { present: false } } as SceneObjectSourceMetadata,
      "newgeneric",
      "custom_trigger",
    )).toBe("newgeneric");
  });
});
