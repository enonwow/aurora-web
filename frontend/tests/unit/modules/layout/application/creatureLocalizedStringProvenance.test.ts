import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureNameLocalizedString,
  materializeExistingCreatureNameLocalizedStrings,
  readExistingCreatureNameLocalizedString,
  reduceExistingCreatureNameLocalizedString,
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
});
