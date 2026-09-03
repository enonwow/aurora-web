import { describe, expect, it } from "vitest";
import {
  canEditExistingPlaceableLocalizedString,
  materializeExistingPlaceableLocalizedStrings,
  readExistingPlaceableLocalizedString,
  reduceExistingPlaceableLocalizedString,
} from "../../../../../src/modules/layout/application/placeableLocalizedStringProvenance";
import type {
  SceneObjectPlaceableProperties,
  SceneObjectSourceMetadata,
} from "../../../../../src/modules/scene/contracts";

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "placeable",
    sourceIndex: 0,
    placeableLocalizedStrings: {
      locName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "Q2hlc3Q=" }],
      },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "U3RvcmFnZQ==" }],
      },
    },
  };
}

describe("existing Placeable localized-string mutation provenance", () => {
  it("admits each exact field independently and reads its retained text", () => {
    const source = exactSource() as any;
    expect(canEditExistingPlaceableLocalizedString(source, "localizedName")).toBe(true);
    expect(canEditExistingPlaceableLocalizedString(source, "description")).toBe(true);
    expect(readExistingPlaceableLocalizedString(source, "localizedName")).toBe("Chest");
    expect(readExistingPlaceableLocalizedString(source, "description")).toBe("Storage");

    source.placeableLocalizedStrings!.description = { present: false };
    expect(canEditExistingPlaceableLocalizedString(source, "localizedName")).toBe(true);
    expect(canEditExistingPlaceableLocalizedString(source, "description")).toBe(false);
  });

  it("reduces valid printable ASCII verbatim, including spaces and empty text", () => {
    const source = exactSource() as any;
    expect(reduceExistingPlaceableLocalizedString(
      source,
      "localizedName",
      "Chest",
      " Chest 2 ",
    )).toBe(" Chest 2 ");
    expect(reduceExistingPlaceableLocalizedString(
      source,
      "description",
      "Storage",
      "",
    )).toBe("");
  });

  it.each([
    ["missing ordinal", (source: SceneObjectSourceMetadata) => { delete source.sourceIndex; }, "New"],
    ["negative ordinal", (source: SceneObjectSourceMetadata) => { source.sourceIndex = -1; }, "New"],
    ["fractional ordinal", (source: SceneObjectSourceMetadata) => { source.sourceIndex = 0.5; }, "New"],
    ["wrong family", (source: SceneObjectSourceMetadata) => { source.sourceKind = "creature"; }, "New"],
    ["wrong source", (source: SceneObjectSourceMetadata) => { source.type = "seed"; }, "New"],
    ["TLK source", (source: SceneObjectSourceMetadata) => {
      source.placeableLocalizedStrings!.locName = { present: true, strRef: 7, entries: [] };
    }, "New"],
    ["non-ASCII target", () => undefined, "Żółć"],
    ["over-budget target", () => undefined, "x".repeat(257)],
  ])("preserves the current name for %s", (_label, mutate, target) => {
    const source = exactSource();
    mutate(source);
    expect(reduceExistingPlaceableLocalizedString(
      source,
      "localizedName",
      "Chest",
      target,
    )).toBe("Chest");
  });

  it("materializes both proven fields independently and preserves unrelated Comments", () => {
    const current: SceneObjectPlaceableProperties = {
      plot: false,
      useable: false,
      hasInventory: false,
      localizedName: "Chest",
      description: "Storage",
      comments: "editor-only",
    };
    expect(materializeExistingPlaceableLocalizedStrings(
      exactSource(),
      current,
      { localizedName: " Chest 2 ", description: "Storage room" },
    )).toEqual({ localizedName: " Chest 2 ", description: "Storage room" });
    expect(current.comments).toBe("editor-only");
  });

  it("never creates an unproven field and preserves an existing target fail-closed", () => {
    const source = exactSource();
    source.placeableLocalizedStrings!.description = { present: false };
    expect(materializeExistingPlaceableLocalizedStrings(
      source,
      { plot: false, useable: false, hasInventory: false, localizedName: "Chest" },
      { localizedName: "New", description: "invented" },
    )).toStrictEqual({ localizedName: "New" });
    expect(materializeExistingPlaceableLocalizedStrings(
      { ...source, sourceIndex: undefined },
      {
        plot: false,
        useable: false,
        hasInventory: false,
        localizedName: "Chest",
        description: "keep",
      },
      { localizedName: "New", description: "changed" },
    )).toStrictEqual({ localizedName: "Chest", description: "keep" });

    const inherited = Object.create({ localizedName: "inherited" }) as SceneObjectPlaceableProperties;
    Object.assign(inherited, { plot: false, useable: false, hasInventory: false });
    expect(materializeExistingPlaceableLocalizedStrings(
      { ...source, sourceIndex: undefined },
      inherited,
      { localizedName: "New", description: "changed" },
    )).toStrictEqual({});

    expect(materializeExistingPlaceableLocalizedStrings(
      { ...source, sourceIndex: undefined },
      {
        plot: false,
        useable: false,
        hasInventory: false,
        localizedName: 7 as unknown as string,
      },
      { localizedName: "New", description: "changed" },
    )).toStrictEqual({});
  });
});
