import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureNameLocalizedString,
  materializeExistingCreatureNameLocalizedStrings,
  readExistingCreatureNameLocalizedString,
  readExistingCreatureNameLocalizedStringEntries,
  reduceExistingCreatureNameLocalizedString,
  reduceExistingCreatureNameLocalizedStringEntries,
} from "../../../../../src/modules/layout/application/creatureLocalizedStringProvenance";
import type {
  SceneObjectCreatureProperties,
  SceneObjectSourceMetadata,
} from "../../../../../src/modules/scene/contracts";

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "creature",
    sourceIndex: 0,
    creatureLocalizedStrings: {
      firstName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "R3VhcmQ=" }],
      },
      lastName: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [],
      },
      description: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "T2xkIGRlc2NyaXB0aW9u" }],
      },
    },
  } as SceneObjectSourceMetadata;
}

describe("existing Creature name localized-string mutation provenance", () => {
  it("admits First Name, Last Name, and Description independently from immutable native source", () => {
    const source = exactSource();
    expect(canEditExistingCreatureNameLocalizedString(source, "firstName")).toBe(true);
    expect(canEditExistingCreatureNameLocalizedString(source, "lastName")).toBe(true);
    expect(canEditExistingCreatureNameLocalizedString(source, "description")).toBe(true);
    expect(readExistingCreatureNameLocalizedString(source, "firstName")).toBe("Guard");
    expect(readExistingCreatureNameLocalizedString(source, "lastName")).toBe("");
    expect(readExistingCreatureNameLocalizedString(source, "description")).toBe("Old description");

    (source as any).creatureLocalizedStrings.lastName = { present: true, strRef: 42, entries: [] };
    expect(canEditExistingCreatureNameLocalizedString(source, "firstName")).toBe(true);
    expect(canEditExistingCreatureNameLocalizedString(source, "lastName")).toBe(false);
  });

  it("reduces valid targets verbatim and rejects unsupported source or target", () => {
    expect(reduceExistingCreatureNameLocalizedString(
      exactSource(),
      "firstName",
      "Guard",
      " Captain ",
    )).toBe(" Captain ");
    expect(reduceExistingCreatureNameLocalizedString(
      exactSource(),
      "lastName",
      "Old",
      "",
    )).toBe("");

    expect(reduceExistingCreatureNameLocalizedString(
      { ...exactSource(), sourceKind: "placeable" },
      "firstName",
      "Guard",
      "Captain",
    )).toBe("Guard");
    expect(reduceExistingCreatureNameLocalizedString(
      exactSource(),
      "firstName",
      "Guard",
      "Żółć",
    )).toBe("Guard");
  });

  it("edits, reorders, removes, and catalog-adds complete lists while retaining unknown source IDs", () => {
    const source = exactSource();
    source.creatureLocalizedStrings!.firstName = {
      present: true,
      strRef: 0xffff_ffff,
      entries: [
        { languageId: 42, textBytesBase64: "TGVnYWN5" },
        { languageId: 0, textBytesBase64: "R3VhcmQ=" },
        { languageId: 10, textBytesBase64: "U3RyYXpuaWs=" },
      ],
    };
    expect(readExistingCreatureNameLocalizedStringEntries(source, "firstName")).toEqual([
      { languageId: 42, text: "Legacy" },
      { languageId: 0, text: "Guard" },
      { languageId: 10, text: "Straznik" },
    ]);

    const current = readExistingCreatureNameLocalizedStringEntries(source, "firstName")!;
    expect(reduceExistingCreatureNameLocalizedStringEntries(source, "firstName", current, [
      { languageId: 0, text: "Guard 2" },
      { languageId: 2, text: "Garde" },
      { languageId: 42, text: "Legacy 2" },
    ])).toEqual([
      { languageId: 0, text: "Guard 2" },
      { languageId: 2, text: "Garde" },
      { languageId: 42, text: "Legacy 2" },
    ]);
  });

  it.each([
    ["unknown new identifier", [{ languageId: 0, text: "Guard" }, { languageId: 77, text: "No" }]],
    ["empty new entry", [{ languageId: 0, text: "Guard" }, { languageId: 2, text: "" }]],
    ["alternate-only target", [{ languageId: 10, text: "Straznik" }]],
    ["duplicate identifier", [{ languageId: 0, text: "Guard" }, { languageId: 0, text: "Again" }]],
    ["non-ASCII text", [{ languageId: 0, text: "Żółć" }]],
  ])("preserves the current entry list for %s", (_label, candidate) => {
    const current = [{ languageId: 0, text: "Guard" }];
    const result = reduceExistingCreatureNameLocalizedStringEntries(
      exactSource(),
      "firstName",
      current,
      candidate,
    );
    expect(result).toEqual(current);
    expect(result).not.toBe(current);
  });

  it("materializes admitted names independently and never creates an unproven field", () => {
    const current = {
      firstName: "Guard",
      lastName: "",
      description: "Old description",
    } as SceneObjectCreatureProperties;

    expect(materializeExistingCreatureNameLocalizedStrings(
      exactSource(),
      current,
      { firstName: " Captain ", lastName: "Aribeth", description: "New description" },
    )).toEqual({
      firstName: " Captain ", lastName: "Aribeth", description: "New description",
    });

    const source = exactSource();
    (source as any).creatureLocalizedStrings.lastName = { present: false };
    expect(materializeExistingCreatureNameLocalizedStrings(
      source,
      current,
      { firstName: "Captain", lastName: "Invented", description: "New description" },
    )).toEqual({
      firstName: "Captain", lastName: "", description: "New description",
    });

    const inherited = Object.create({
      firstName: "inherited", lastName: "inherited", description: "inherited",
    });
    expect(materializeExistingCreatureNameLocalizedStrings(
      { ...source, sourceIndex: undefined },
      inherited,
      { firstName: "Captain", lastName: "Aribeth", description: "New description" },
    )).toEqual({});
  });

  it("materializes complete lists only when language zero agrees with the scalar target", () => {
    const current = {
      firstName: "Guard",
      firstNameEntries: [{ languageId: 0, text: "Guard" }],
      lastName: "",
      lastNameEntries: [],
      description: "Old description",
      descriptionEntries: [{ languageId: 0, text: "Old description" }],
    } as SceneObjectCreatureProperties;
    expect(materializeExistingCreatureNameLocalizedStrings(exactSource(), current, {
      firstName: "Guard 2",
      firstNameEntries: [
        { languageId: 2, text: "Garde" },
        { languageId: 0, text: "Guard 2" },
      ],
      lastName: "Aribeth",
      lastNameEntries: [{ languageId: 0, text: "Aribeth" }],
      description: "",
      descriptionEntries: [],
    })).toEqual({
      firstName: "Guard 2",
      firstNameEntries: [
        { languageId: 2, text: "Garde" },
        { languageId: 0, text: "Guard 2" },
      ],
      lastName: "Aribeth",
      lastNameEntries: [{ languageId: 0, text: "Aribeth" }],
      description: "",
      descriptionEntries: [],
    });

    expect(materializeExistingCreatureNameLocalizedStrings(exactSource(), current, {
      firstName: "Mismatch",
      firstNameEntries: [{ languageId: 0, text: "Different" }],
      lastName: "",
      lastNameEntries: [],
      description: "Old description",
      descriptionEntries: [{ languageId: 0, text: "Old description" }],
    })).toEqual(current);
  });
});
