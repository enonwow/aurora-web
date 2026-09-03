import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableTrapByteField,
  materializeExistingPlaceableTrapByteSettings,
  reduceExistingPlaceableTrapByteField
} from "../../../../../src/modules/layout/application/placeableTrapByteProvenance";

const current = {
  isTrapped: false,
  trapType: "Spike Trap, Minor",
  detectionDc: 10,
  disarmDc: 15,
  oneShot: true,
  detectable: true,
  disarmable: true,
  onDisarmScript: "old_disarm",
  onTrapTriggeredScript: "old_trigger",
  setDc: 5,
  detectDcModWhenSetByRogue: 10,
  disarmDcModWhenSetByRogue: 22
};

describe("existing Placeable trap Byte provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "placeable" as const,
    placeableTrapSettings: {
      isTrapped: false,
      detectable: true,
      disarmable: false,
      oneShot: true,
      detectionDc: 0,
      disarmDc: 255
    }
  };

  it("admits each exact field independently for an existing GIT Placeable", () => {
    for (const field of [
      "isTrapped",
      "detectable",
      "disarmable",
      "oneShot",
      "detectionDc",
      "disarmDc"
    ] as const) {
      expect(canEditExistingPlaceableTrapByteField(source, field)).toBe(true);
    }
  });

  it("rejects absent, invalid, and cross-family provenance independently", () => {
    expect(canEditExistingPlaceableTrapByteField({
      type: "aurora_git",
      sourceKind: "placeable",
      placeableTrapSettings: { isTrapped: false }
    }, "detectionDc")).toBe(false);
    expect(canEditExistingPlaceableTrapByteField({
      ...source,
      placeableTrapSettings: { isTrapped: 1 }
    }, "isTrapped")).toBe(false);
    expect(canEditExistingPlaceableTrapByteField({
      ...source,
      placeableTrapSettings: { detectionDc: 256 }
    }, "detectionDc")).toBe(false);
    expect(canEditExistingPlaceableTrapByteField({ ...source, type: "seed" }, "oneShot"))
      .toBe(false);
    expect(canEditExistingPlaceableTrapByteField({
      ...source,
      sourceKind: "creature"
    }, "disarmDc")).toBe(false);
  });

  it("reduces only exact valid target values with matching field provenance", () => {
    expect(reduceExistingPlaceableTrapByteField(source, "isTrapped", false, true)).toBe(true);
    expect(reduceExistingPlaceableTrapByteField(source, "detectionDc", 0, 255)).toBe(255);
    expect(reduceExistingPlaceableTrapByteField(source, "detectionDc", 0, 256)).toBe(0);
    expect(reduceExistingPlaceableTrapByteField(source, "detectable", true, 1)).toBe(true);
    expect(reduceExistingPlaceableTrapByteField({
      ...source,
      placeableTrapSettings: { isTrapped: false }
    }, "oneShot", true, false)).toBe(true);
  });

  it("materializes only proven fields and preserves unsupported or absent values", () => {
    const result = materializeExistingPlaceableTrapByteSettings({
      ...source,
      placeableTrapSettings: { isTrapped: false, detectionDc: 0 }
    }, current, {
      ...current,
      isTrapped: true,
      trapType: "Fire Trap, Deadly",
      detectionDc: 99,
      disarmDc: 77,
      oneShot: false,
      detectable: false,
      disarmable: false,
      setDc: 200
    });

    expect(result).toEqual({
      ...current,
      isTrapped: true,
      detectionDc: 99
    });

    const invalidDraft = materializeExistingPlaceableTrapByteSettings(source, current, {
      ...current,
      detectionDc: 256
    });
    expect(invalidDraft?.detectionDc).toBe(current.detectionDc);

    expect(materializeExistingPlaceableTrapByteSettings(source, undefined, {
      ...current,
      isTrapped: true
    })).toBeUndefined();
  });
});
