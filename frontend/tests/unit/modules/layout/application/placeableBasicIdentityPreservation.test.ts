import { describe, expect, it } from "vitest";

import {
  formatPreservedPlaceableAppearanceType,
  materializePlaceableBasicIdentity,
  mustPreserveAuroraGitPlaceableBasicIdentity,
  reducePlaceableBasicIdentityField,
  resolvePreservedPlaceableAppearanceDword
} from "../../../../../src/modules/layout/application/placeableBasicIdentityPreservation";
import { createNewSceneObject } from "../../../../../src/modules/scene/domain/sceneFactory";
import { cloneSceneObject } from "../../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("existing Area Placeable basic identity preservation", () => {
  it("formats only an exact unsigned DWord Appearance value", () => {
    expect(formatPreservedPlaceableAppearanceType(0)).toBe("0");
    expect(formatPreservedPlaceableAppearanceType(104)).toBe("104");
    expect(formatPreservedPlaceableAppearanceType(0xffff_ffff)).toBe("4294967295");
    expect(formatPreservedPlaceableAppearanceType(undefined)).toBe("");
    expect(formatPreservedPlaceableAppearanceType("104")).toBe("");
    expect(formatPreservedPlaceableAppearanceType(-1)).toBe("");
    expect(formatPreservedPlaceableAppearanceType(104.5)).toBe("");
    expect(formatPreservedPlaceableAppearanceType(0x1_0000_0000)).toBe("");
  });

  it("resolves only canonical DWord provenance and rejects generic or legacy values", () => {
    expect(resolvePreservedPlaceableAppearanceDword({
      type: "aurora_git",
      appearanceType: 999,
      placeableBasicIdentity: {
        tag: { present: false },
        appearance: { present: true, nativeType: "dword", value: 104 }
      }
    })).toBe(104);
    expect(resolvePreservedPlaceableAppearanceDword({
      type: "aurora_git",
      appearanceType: 104
    })).toBeUndefined();
    expect(resolvePreservedPlaceableAppearanceDword({
      type: "aurora_git",
      placeableBasicIdentity: {
        tag: { present: false },
        appearance: { present: true, nativeType: "byte", value: 104 }
      }
    })).toBeUndefined();
    expect(resolvePreservedPlaceableAppearanceDword(undefined)).toBeUndefined();
  });

  it("deep-clones nested source provenance for cancel and undo snapshots", () => {
    const object = createNewSceneObject("placeables", 1, 2, 3);
    object.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      placeableBasicIdentity: {
        tag: { present: true, value: "WaterTrough" },
        appearance: {
          present: true,
          nativeType: "dword",
          value: 104,
          table: {
            resourceName: "placeables.2da",
            sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
            sourceLayer: "hak",
            sha256: "a".repeat(64),
            sizeBytes: 8192,
            rowCount: 16500,
            rowIndex: 104
          }
        }
      }
    };

    const clone = cloneSceneObject(object);
    expect(clone.source?.placeableBasicIdentity).toEqual(object.source.placeableBasicIdentity);
    expect(clone.source?.placeableBasicIdentity).not.toBe(object.source.placeableBasicIdentity);
    expect(clone.source?.placeableBasicIdentity?.tag)
      .not.toBe(object.source.placeableBasicIdentity.tag);
    expect(clone.source?.placeableBasicIdentity?.appearance)
      .not.toBe(object.source.placeableBasicIdentity.appearance);
    expect(clone.source?.placeableBasicIdentity?.appearance.present &&
      clone.source.placeableBasicIdentity.appearance.table)
      .not.toBe(object.source.placeableBasicIdentity.appearance.present &&
        object.source.placeableBasicIdentity.appearance.table);
  });

  it.each([
    { present: false as const },
    { present: true as const, nativeType: "byte" as const, value: 1 },
    { present: true as const, nativeType: "dword" as const, value: 1 }
  ])("clones an Appearance state without table provenance %#", (appearance) => {
    const object = createNewSceneObject("placeables", 1, 2, 3);
    object.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      placeableBasicIdentity: {
        tag: { present: false },
        appearance
      }
    };

    const clone = cloneSceneObject(object);
    expect(clone.source?.placeableBasicIdentity?.appearance).toEqual(appearance);
    expect(clone.source?.placeableBasicIdentity?.appearance).not.toBe(appearance);
    expect(clone.source?.placeableBasicIdentity?.appearance).not.toHaveProperty("table");
  });

  it("fails closed for every retained aurora_git object even with incomplete family provenance", () => {
    expect(mustPreserveAuroraGitPlaceableBasicIdentity({
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "placeable:0"
    })).toBe(true);
    expect(mustPreserveAuroraGitPlaceableBasicIdentity({
      type: "aurora_git"
    })).toBe(true);
    expect(mustPreserveAuroraGitPlaceableBasicIdentity({
      type: "aurora_git",
      sourceKind: "creature"
    })).toBe(true);
    expect(mustPreserveAuroraGitPlaceableBasicIdentity({
      type: "seed",
      sourceKind: "placeable"
    })).toBe(false);
    expect(mustPreserveAuroraGitPlaceableBasicIdentity(undefined)).toBe(false);
  });

  it("rejects draft Name, Tag, and TemplateResRef changes for retained GIT objects", () => {
    const source = {
      type: "aurora_git" as const,
      sourceKind: "placeable" as const,
      sourceObjectId: "placeable:0"
    };

    expect(reducePlaceableBasicIdentityField(source, "Water Trough", "Changed Name"))
      .toBe("Water Trough");
    expect(reducePlaceableBasicIdentityField(source, "WaterTrough", "ChangedTag"))
      .toBe("WaterTrough");
    expect(reducePlaceableBasicIdentityField(source, "plc_watertrough", "plc_other"))
      .toBe("plc_watertrough");
  });

  it("materializes the retained object identity, never a tampered draft", () => {
    const object = createNewSceneObject("placeables", 1, 2, 3);
    object.name = "Water Trough";
    object.tag = "WaterTrough";
    object.resRef = "plc_watertrough";
    object.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "placeable:0"
    };

    expect(materializePlaceableBasicIdentity(object, {
      name: "Changed Name",
      tag: "ChangedTag",
      resRef: "plc_other"
    })).toEqual({
      name: "Water Trough",
      tag: "WaterTrough",
      resRef: "plc_watertrough"
    });
  });

  it("materializes only an ordinal-bound exact Placeable Tag while preserving Name and TemplateResRef", () => {
    const object = createNewSceneObject("placeables", 1, 2, 3);
    object.name = "Water Trough";
    object.tag = "WaterTrough";
    object.resRef = "plc_watertrough";
    object.source = {
      type: "aurora_git",
      sourceKind: "placeable",
      sourceObjectId: "diagnostic_tag_identity",
      sourceIndex: 0,
      placeableBasicIdentity: {
        tag: { present: true, value: "WaterTrough" },
        appearance: { present: false }
      }
    };

    expect(materializePlaceableBasicIdentity(object, {
      name: "Changed Name",
      tag: " New Tag ",
      resRef: "plc_other"
    })).toEqual({
      name: "Water Trough",
      tag: " New Tag ",
      resRef: "plc_watertrough"
    });
    expect(object.tag).toBe("WaterTrough");
  });

  it("uses the retained tag only as the existing frontend display-name fallback", () => {
    const object = createNewSceneObject("placeables", 1, 2, 3);
    object.name = undefined;
    object.tag = "WaterTrough";
    object.resRef = "plc_watertrough";
    object.source = { type: "aurora_git" };

    expect(materializePlaceableBasicIdentity(object, {
      name: "Changed Name",
      tag: "ChangedTag",
      resRef: "plc_other"
    })).toEqual({
      name: "WaterTrough",
      tag: "WaterTrough",
      resRef: "plc_watertrough"
    });
  });

  it("retains the existing local-object edit semantics outside aurora_git", () => {
    const object = createNewSceneObject("placeables", 1, 2, 3);
    object.source = { type: "seed", sourceKind: "placeable" };

    expect(materializePlaceableBasicIdentity(object, {
      name: "  Local Name  ",
      tag: "  LocalTag  ",
      resRef: "  plc_local  "
    })).toEqual({
      name: "Local Name",
      tag: "LocalTag",
      resRef: "plc_local"
    });
  });
});
