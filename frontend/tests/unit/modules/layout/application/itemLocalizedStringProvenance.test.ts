import { describe, expect, it } from "vitest";
import {
  canEditExistingItemLocalizedString,
  materializeExistingItemLocalizedStrings,
  readExistingItemLocalizedString,
  readExistingItemLocalizedStringEntries,
  reduceExistingItemLocalizedString,
  reduceExistingItemLocalizedStringEntries,
} from "../../../../../src/modules/layout/application/itemLocalizedStringProvenance";
import type {
  SceneObjectItemProperties,
  SceneObjectSourceMetadata,
} from "../../../../../src/modules/scene/contracts";

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "item",
    sourceIndex: 0,
    itemLocalizedStrings: {
      localizedName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "U3dvcmQ=" }],
      },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [],
      },
      identifiedDescription: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "SWRlbnRpZmllZA==" }],
      },
    },
  } as SceneObjectSourceMetadata;
}

describe("existing Item localized-string mutation provenance", () => {
  it("admits each audited member independently from immutable native source", () => {
    const source = exactSource();
    expect(readExistingItemLocalizedString(source, "localizedName")).toBe("Sword");
    expect(readExistingItemLocalizedString(source, "description")).toBe("");
    expect(readExistingItemLocalizedString(source, "identifiedDescription")).toBe("Identified");

    (source as any).itemLocalizedStrings.description = {
      present: true,
      strRef: 42,
      entries: [],
    };
    expect(canEditExistingItemLocalizedString(source, "localizedName")).toBe(true);
    expect(canEditExistingItemLocalizedString(source, "description")).toBe(false);
    expect(canEditExistingItemLocalizedString(source, "identifiedDescription")).toBe(true);
  });

  it("reduces admitted ASCII targets verbatim and preserves unsupported values", () => {
    expect(reduceExistingItemLocalizedString(
      exactSource(),
      "localizedName",
      "Sword",
      " Exact Sword ",
    )).toBe(" Exact Sword ");
    expect(reduceExistingItemLocalizedString(
      exactSource(),
      "description",
      "Old",
      "",
    )).toBe("");
    expect(reduceExistingItemLocalizedString(
      { ...exactSource(), sourceKind: "placeable" },
      "localizedName",
      "Sword",
      "Axe",
    )).toBe("Sword");
    expect(reduceExistingItemLocalizedString(
      exactSource(),
      "localizedName",
      "Sword",
      "Żółć",
    )).toBe("Sword");
  });

  it("edits, reorders, removes, and catalog-adds complete lists while retaining unknown source IDs", () => {
    const source = exactSource();
    source.itemLocalizedStrings!.localizedName = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [
        { languageId: 42, textBytesBase64: "TGVnYWN5" },
        { languageId: 0, textBytesBase64: "U3dvcmQ=" },
        { languageId: 10, textBytesBase64: "TWllY3o=" },
      ],
    };
    expect(readExistingItemLocalizedStringEntries(source, "localizedName")).toEqual([
      { languageId: 42, text: "Legacy" },
      { languageId: 0, text: "Sword" },
      { languageId: 10, text: "Miecz" },
    ]);

    const current = readExistingItemLocalizedStringEntries(source, "localizedName")!;
    expect(reduceExistingItemLocalizedStringEntries(source, "localizedName", current, [
      { languageId: 0, text: "Sword 2" },
      { languageId: 2, text: "Epee" },
      { languageId: 42, text: "Legacy 2" },
    ])).toEqual([
      { languageId: 0, text: "Sword 2" },
      { languageId: 2, text: "Epee" },
      { languageId: 42, text: "Legacy 2" },
    ]);
  });

  it.each([
    ["unknown new identifier", [{ languageId: 0, text: "Sword" }, { languageId: 77, text: "No" }]],
    ["empty new entry", [{ languageId: 0, text: "Sword" }, { languageId: 2, text: "" }]],
    ["alternate-only target", [{ languageId: 10, text: "Miecz" }]],
    ["duplicate identifier", [{ languageId: 0, text: "Sword" }, { languageId: 0, text: "Again" }]],
    ["non-ASCII text", [{ languageId: 0, text: "Żółć" }]],
  ])("preserves the current entry list for %s", (_label, candidate) => {
    const current = [{ languageId: 0, text: "Sword" }];
    const result = reduceExistingItemLocalizedStringEntries(
      exactSource(),
      "localizedName",
      current,
      candidate,
    );
    expect(result).toEqual(current);
    expect(result).not.toBe(current);
  });

  it("materializes members independently and never creates an unproven field", () => {
    const current = {
      localizedName: "Sword",
      description: "",
      identifiedDescription: "Identified",
    } as SceneObjectItemProperties;
    expect(materializeExistingItemLocalizedStrings(
      exactSource(),
      current,
      {
        localizedName: " Exact Sword ",
        description: "New description",
        identifiedDescription: "Known blade",
      },
    )).toEqual({
      localizedName: " Exact Sword ",
      description: "New description",
      identifiedDescription: "Known blade",
    });

    const source = exactSource();
    (source as any).itemLocalizedStrings.description = { present: false };
    expect(materializeExistingItemLocalizedStrings(
      source,
      current,
      {
        localizedName: "Axe",
        description: "Invented",
        identifiedDescription: "Known axe",
      },
    )).toEqual({
      localizedName: "Axe",
      description: "",
      identifiedDescription: "Known axe",
    });

    const inherited = Object.create({
      localizedName: "inherited",
      description: "inherited",
      identifiedDescription: "inherited",
    });
    expect(materializeExistingItemLocalizedStrings(
      { ...source, sourceIndex: undefined },
      inherited,
      { localizedName: "Axe", description: "Text", identifiedDescription: "Known" },
    )).toEqual({});
  });

  it("materializes complete lists only when language zero agrees with the scalar target", () => {
    const current = {
      localizedName: "Sword",
      localizedNameEntries: [{ languageId: 0, text: "Sword" }],
      description: "",
      descriptionEntries: [],
      identifiedDescription: "Identified",
      identifiedDescriptionEntries: [{ languageId: 0, text: "Identified" }],
    } as SceneObjectItemProperties;
    expect(materializeExistingItemLocalizedStrings(exactSource(), current, {
      localizedName: "Sword 2",
      localizedNameEntries: [
        { languageId: 2, text: "Epee" },
        { languageId: 0, text: "Sword 2" },
      ],
      description: "",
      descriptionEntries: [],
      identifiedDescription: "Known",
      identifiedDescriptionEntries: [{ languageId: 0, text: "Known" }],
    })).toEqual({
      localizedName: "Sword 2",
      localizedNameEntries: [
        { languageId: 2, text: "Epee" },
        { languageId: 0, text: "Sword 2" },
      ],
      description: "",
      descriptionEntries: [],
      identifiedDescription: "Known",
      identifiedDescriptionEntries: [{ languageId: 0, text: "Known" }],
    });

    expect(materializeExistingItemLocalizedStrings(exactSource(), current, {
      localizedName: "Mismatch",
      localizedNameEntries: [{ languageId: 0, text: "Different" }],
      description: "",
      descriptionEntries: [],
      identifiedDescription: "Identified",
      identifiedDescriptionEntries: [{ languageId: 0, text: "Identified" }],
    })).toEqual(current);
  });
});
