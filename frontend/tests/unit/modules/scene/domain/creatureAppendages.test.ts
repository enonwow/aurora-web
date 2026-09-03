import { describe, expect, it } from "vitest";

import {
  canEditExistingCreatureAppendage,
  readCreatureAppendageStorage,
  readCreatureAppendagesStorage,
} from "../../../../../src/modules/scene/domain/creatureAppendages";

const table = (resourceName: "wingmodel.2da" | "tailmodel.2da", rowIndex: number) => ({
  resourceName,
  sourceObjectKey: `runtime-source/vanilla/nwn_base.key/${resourceName}`,
  sourceLayer: "vanilla",
  sha256: "a".repeat(64),
  sizeBytes: 1_024,
  rowCount: 8,
  rowIndex,
});

describe("Creature appendage source storage", () => {
  it("uses the modern DWord while retaining the legacy Byte sibling", () => {
    expect(readCreatureAppendageStorage({
      present: true,
      value: 7,
      modernDword: {
        present: true,
        nativeType: "dword",
        value: 7,
        table: table("wingmodel.2da", 7),
      },
      legacyByte: { present: true, nativeType: "byte", value: 2 },
    }, "wings")).toEqual({
      present: true,
      value: 7,
      modernDword: {
        present: true,
        nativeType: "dword",
        value: 7,
        table: table("wingmodel.2da", 7),
      },
      legacyByte: { present: true, nativeType: "byte", value: 2 },
    });
  });

  it("retains legacy-only storage but does not expose it as editable", () => {
    const appendages = readCreatureAppendagesStorage({
      wings: { present: false },
      tail: {
        present: true,
        value: 3,
        modernDword: { present: false },
        legacyByte: { present: true, nativeType: "byte", value: 3 },
      },
    });
    const source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creatureAppendages: appendages,
    } as const;
    expect(appendages?.tail.present).toBe(true);
    expect(canEditExistingCreatureAppendage(source as never, "tail")).toBe(false);
  });

  it("admits only the member-specific bound modern table", () => {
    const source = {
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creatureAppendages: {
        wings: {
          present: true,
          value: 1,
          modernDword: {
            present: true,
            nativeType: "dword",
            value: 1,
            table: table("wingmodel.2da", 1),
          },
          legacyByte: { present: false },
        },
        tail: { present: false },
      },
    } as const;
    expect(canEditExistingCreatureAppendage(source as never, "wings")).toBe(true);
    expect(canEditExistingCreatureAppendage(source as never, "tail")).toBe(false);
  });

  it.each([
    ["wrong table", {
      present: true,
      value: 1,
      modernDword: {
        present: true,
        nativeType: "dword",
        value: 1,
        table: table("tailmodel.2da", 1),
      },
      legacyByte: { present: false },
    }],
    ["wrong effective value", {
      present: true,
      value: 2,
      modernDword: { present: true, nativeType: "dword", value: 1 },
      legacyByte: { present: false },
    }],
    ["no storage", {
      present: true,
      value: 1,
      modernDword: { present: false },
      legacyByte: { present: false },
    }],
  ])("rejects %s", (_label, input) => {
    expect(readCreatureAppendageStorage(input, "wings")).toBeNull();
  });
});
