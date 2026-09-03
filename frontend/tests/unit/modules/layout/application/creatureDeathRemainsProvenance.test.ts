import { describe, expect, it } from "vitest";

import {
  materializeExistingCreatureBodyBagRow,
  materializeExistingCreatureDecayTimeSeconds,
} from "../../../../../src/modules/layout/application/creatureDeathRemainsProvenance";
import type {
  SceneObjectSourceMetadata,
  ScenePlaceableBodyBagCatalog,
} from "../../../../../src/modules/scene/contracts";

const catalog: ScenePlaceableBodyBagCatalog = {
  descriptor: {
    resourceName: "bodybag.2da",
    sourceObjectKey: "runtime-source/vanilla/nwn_base.key/bodybag.2da",
    sourceLayer: "vanilla",
    sha256: "e".repeat(64),
    sizeBytes: 502,
    rowCount: 3,
  },
  rows: [
    { rowIndex: 0, label: "Default", nameStrRef: 1, displayName: "Default", displaySource: "label" },
    { rowIndex: 1, label: "Bag", nameStrRef: 2, displayName: "Bag", displaySource: "label" },
    { rowIndex: 2, label: "Pile", nameStrRef: 3, displayName: "Pile", displaySource: "label" },
  ],
};

const source: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureAdvancedFlags: {
    disarmable: { present: false },
    plot: { present: false },
    immortal: { present: false },
    lootable: { present: true, value: 0 },
    noPermanentDeath: { present: false },
  },
  creatureBodyBag: {
    expectedValue: 2,
    tableSha256: "e".repeat(64),
    tableRowCount: 3,
  },
  creatureDecayTime: { expectedMilliseconds: 12_000 },
};

describe("Creature death-remains property reducers", () => {
  it("materializes independently valid changed targets when current Lootable is true", () => {
    expect(materializeExistingCreatureBodyBagRow(source, catalog, 2, 1, true)).toBe(1);
    expect(materializeExistingCreatureDecayTimeSeconds(source, 12, 15, true)).toBe(15);
  });

  it("preserves current targets when Lootable or own provenance is not proven", () => {
    expect(materializeExistingCreatureBodyBagRow(source, catalog, 2, 1, false)).toBe(2);
    expect(materializeExistingCreatureDecayTimeSeconds(source, 12, 15, false)).toBe(12);
    expect(materializeExistingCreatureBodyBagRow(
      { ...source, creatureBodyBag: undefined },
      catalog,
      2,
      1,
      true,
    )).toBe(2);
    expect(materializeExistingCreatureDecayTimeSeconds(
      { ...source, creatureDecayTime: undefined },
      12,
      15,
      true,
    )).toBe(12);
  });

  it("rejects stale catalogs, nonexistent rows, fractional input, and noncanonical decay", () => {
    expect(materializeExistingCreatureBodyBagRow(
      source,
      { ...catalog, descriptor: { ...catalog.descriptor, sha256: "f".repeat(64) } },
      2,
      1,
      true,
    )).toBe(2);
    expect(materializeExistingCreatureBodyBagRow(source, catalog, 2, 3, true)).toBe(2);
    expect(materializeExistingCreatureBodyBagRow(source, catalog, 2, 1.5, true)).toBe(2);
    expect(materializeExistingCreatureDecayTimeSeconds(source, 12, 4, true)).toBe(12);
    expect(materializeExistingCreatureDecayTimeSeconds(source, 12, 12.5, true)).toBe(12);
    expect(materializeExistingCreatureDecayTimeSeconds(source, 12, 32_768, true)).toBe(12);
  });
});
