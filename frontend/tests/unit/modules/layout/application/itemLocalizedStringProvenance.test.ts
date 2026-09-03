import { describe, expect, it } from "vitest";
import {
  canEditExistingItemLocalizedString,
  materializeExistingItemLocalizedStrings,
  readExistingItemLocalizedString,
  reduceExistingItemLocalizedString,
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
});
