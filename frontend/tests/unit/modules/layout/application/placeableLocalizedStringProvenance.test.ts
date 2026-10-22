import { describe, expect, it } from "vitest";
import {
  canEditExistingPlaceableLocalizedString,
  materializeExistingPlaceableLocalizedStrings,
  readExistingPlaceableLocalizedString,
  readExistingPlaceableLocalizedStringEntries,
  reduceExistingPlaceableLocalizedString,
  reduceExistingPlaceableLocalizedStringEntries,
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

  it("reads and edits a complete ordered source list without losing retained identifiers", () => {
    const source = exactSource();
    source.placeableLocalizedStrings!.locName = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [
        { languageId: 42, textBytesBase64: "UmV0YWluZWQ=" },
        { languageId: 0, textBytesBase64: "Q2hlc3Q=" },
        { languageId: 10, textBytesBase64: "U2tyenluaWE=" },
      ],
    };

    expect(canEditExistingPlaceableLocalizedString(source, "localizedName")).toBe(true);
    expect(readExistingPlaceableLocalizedString(source, "localizedName")).toBe("Chest");
    expect(readExistingPlaceableLocalizedStringEntries(source, "localizedName")).toEqual([
      { languageId: 42, text: "Retained" },
      { languageId: 0, text: "Chest" },
      { languageId: 10, text: "Skrzynia" },
    ]);

    const current = readExistingPlaceableLocalizedStringEntries(source, "localizedName")!;
    expect(reduceExistingPlaceableLocalizedStringEntries(
      source,
      "localizedName",
      current,
      [
        { languageId: 10, text: "Kufer" },
        { languageId: 0, text: "Chest 2" },
        { languageId: 42, text: "Preserved and edited" },
        { languageId: 2, text: "Coffre" },
      ],
    )).toEqual([
      { languageId: 10, text: "Kufer" },
      { languageId: 0, text: "Chest 2" },
      { languageId: 42, text: "Preserved and edited" },
      { languageId: 2, text: "Coffre" },
    ]);
  });

  it.each([
    ["unknown new identifier", [{ languageId: 0, text: "Chest" }, { languageId: 77, text: "No" }]],
    ["empty new entry", [{ languageId: 0, text: "Chest" }, { languageId: 2, text: "" }]],
    ["alternate-only target", [{ languageId: 10, text: "Kufer" }]],
    ["duplicate identifier", [{ languageId: 0, text: "Chest" }, { languageId: 0, text: "Again" }]],
    ["non-ASCII text", [{ languageId: 0, text: "Żółć" }]],
  ])("preserves the current entry list for %s", (_label, candidate) => {
    const source = exactSource();
    const current = [{ languageId: 0, text: "Chest" }];
    const result = reduceExistingPlaceableLocalizedStringEntries(
      source,
      "localizedName",
      current,
      candidate,
    );
    expect(result).toEqual(current);
    expect(result).not.toBe(current);
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

  it("materializes complete entry lists only when their default text agrees with the scalar target", () => {
    const current: SceneObjectPlaceableProperties = {
      plot: false,
      useable: false,
      hasInventory: false,
      localizedName: "Chest",
      localizedNameEntries: [{ languageId: 0, text: "Chest" }],
      description: "Storage",
      descriptionEntries: [{ languageId: 0, text: "Storage" }],
    };
    expect(materializeExistingPlaceableLocalizedStrings(
      exactSource(),
      current,
      {
        localizedName: "Chest 2",
        localizedNameEntries: [
          { languageId: 2, text: "Coffre" },
          { languageId: 0, text: "Chest 2" },
        ],
        description: "",
        descriptionEntries: [],
      },
    )).toEqual({
      localizedName: "Chest 2",
      localizedNameEntries: [
        { languageId: 2, text: "Coffre" },
        { languageId: 0, text: "Chest 2" },
      ],
      description: "",
      descriptionEntries: [],
    });

    expect(materializeExistingPlaceableLocalizedStrings(
      exactSource(),
      current,
      {
        localizedName: "Mismatch",
        localizedNameEntries: [{ languageId: 0, text: "Different" }],
        description: "Storage",
        descriptionEntries: [{ languageId: 0, text: "Storage" }],
      },
    )).toEqual({
      localizedName: "Chest",
      localizedNameEntries: [{ languageId: 0, text: "Chest" }],
      description: "Storage",
      descriptionEntries: [{ languageId: 0, text: "Storage" }],
    });
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
