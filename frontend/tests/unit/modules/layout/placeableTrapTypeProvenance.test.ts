import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableTrapType,
  materializeExistingPlaceableTrapType,
} from "../../../../src/modules/layout/application/placeableTrapTypeProvenance";

const source = {
  type: "aurora_git" as const,
  sourceKind: "placeable" as const,
  placeableTrapType: {
    expectedValue: 1,
    tableSha256: "d".repeat(64),
    tableRowCount: 2,
  },
};
const catalog = {
  descriptor: {
    resourceName: "traps.2da" as const,
    sourceObjectKey: "modules/current/traps.2da",
    sourceLayer: "module" as const,
    sha256: "d".repeat(64),
    sizeBytes: 2048,
    rowCount: 2,
  },
  rows: [
    { rowIndex: 0, setDc: 10, detectDcMod: 0, disarmDcMod: 3, displayName: "Minor", displaySource: "label" as const },
    { rowIndex: 1, setDc: 20, detectDcMod: 2, disarmDcMod: 6, displayName: "Deadly", displaySource: "strref" as const },
  ],
};

describe("existing Placeable TrapType provenance", () => {
  it("materializes only an admitted physical row and its read-only derived values", () => {
    expect(canEditExistingPlaceableTrapType(source, catalog)).toBe(true);
    expect(materializeExistingPlaceableTrapType(source, { trapTypeRow: 1, setDc: 20 }, 0, catalog))
      .toMatchObject({ trapTypeRow: 0, setDc: 10, detectDcModWhenSetByRogue: 0, disarmDcModWhenSetByRogue: 3 });
  });

  it("preserves current settings for stale, invalid, or unproven input", () => {
    const current = { trapTypeRow: 1, setDc: 20 };
    expect(materializeExistingPlaceableTrapType(source, current, 2, catalog)).toBe(current);
    expect(materializeExistingPlaceableTrapType(source, current, -1, catalog)).toBe(current);
    expect(materializeExistingPlaceableTrapType(source, current, 0.5, catalog)).toBe(current);
    expect(materializeExistingPlaceableTrapType(source, undefined, 0, catalog)).toBeUndefined();
    expect(materializeExistingPlaceableTrapType({ ...source, type: "seed" }, current, 0, catalog)).toBe(current);
    expect(materializeExistingPlaceableTrapType({ ...source, sourceKind: "door" }, current, 0, catalog)).toBe(current);
    expect(materializeExistingPlaceableTrapType(source, current, 0, {
      ...catalog,
      descriptor: { ...catalog.descriptor, sha256: "e".repeat(64) },
    })).toBe(current);
    expect(materializeExistingPlaceableTrapType(source, current, 0, {
      ...catalog,
      descriptor: { ...catalog.descriptor, rowCount: 1 },
      rows: [catalog.rows[0]],
    })).toBe(current);
    expect(materializeExistingPlaceableTrapType(source, current, 0, {
      ...catalog,
      rows: [{ ...catalog.rows[0], unexpected: true }, catalog.rows[1]],
    } as never)).toBe(current);
  });
});
