import { describe, expect, it } from "vitest";
import {
  areaNameStorageEntriesEqual,
  areaNameStorageEntryIdentifiersFormAdmittedTarget,
  isAreaNameStorageProfile,
  isEditableAreaName,
  readEditableAreaNameEntries,
  readExistingAreaBasicIdentityMutations,
} from "../../../../src/modules/areas/domain/areaBasicIdentity";

describe("Area basic identity", () => {
  it("admits only frozen Area Name storage profile tokens", () => {
    expect(isAreaNameStorageProfile("simple_inline_ascii")).toBe(true);
    expect(isAreaNameStorageProfile("multi_entry_inline_ascii")).toBe(true);
    expect(isAreaNameStorageProfile("tlk")).toBe(false);
    expect(isAreaNameStorageProfile(undefined)).toBe(false);
  });

  it("keeps the editable default Name bounded to printable ASCII", () => {
    expect(isEditableAreaName(" Crypt ")).toBe(true);
    expect(isEditableAreaName("Krypta łódzka")).toBe(false);
  });

  it("validates and compares detached ordered existing-entry Name lists", () => {
    const source = [
      { languageId: 3, text: "Crypt F" },
      { languageId: 0, text: "Crypt" },
      { languageId: 0xffff_ffff, text: "" },
    ];
    const parsed = readEditableAreaNameEntries(source);

    expect(parsed).toEqual(source);
    expect(parsed).not.toBe(source);
    expect(parsed?.[0]).not.toBe(source[0]);
    expect(areaNameStorageEntriesEqual(source, parsed ?? [])).toBe(true);
    expect(areaNameStorageEntriesEqual(source, [
      source[0]!, source[1]!, { languageId: 0xffff_ffff, text: "Changed" },
    ])).toBe(false);
  });

  it("accepts complete existing-identifier CAS pairs with edit, removal, or reorder", () => {
    const expectedEntries = [
      { languageId: 0, text: "Crypt" },
      { languageId: 2, text: "Krypta" },
    ];
    const valueEntries = [
      { languageId: 0, text: "Crypt" },
      { languageId: 2, text: "Vault" },
    ];
    expect(readExistingAreaBasicIdentityMutations({
      name: {
        expectedValue: "Crypt",
        value: "Crypt",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries,
        valueEntries,
      },
    })).toEqual({
      name: {
        expectedValue: "Crypt",
        value: "Crypt",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries,
        valueEntries,
      },
    });
    expect(readExistingAreaBasicIdentityMutations({
      name: {
        expectedValue: "Crypt",
        value: "Crypt",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries,
        valueEntries: [...valueEntries].reverse(),
      },
    })?.name?.valueEntries).toEqual([...valueEntries].reverse());

    const removalTarget = [{ languageId: 0, text: "Crypt" }];
    expect(areaNameStorageEntryIdentifiersFormAdmittedTarget(
      expectedEntries,
      removalTarget,
    )).toBe(true);
    expect(readExistingAreaBasicIdentityMutations({
      name: {
        expectedValue: "Crypt",
        value: "Crypt",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries,
        valueEntries: removalTarget,
      },
    })).toEqual({
      name: {
        expectedValue: "Crypt",
        value: "Crypt",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries,
        valueEntries: removalTarget,
      },
    });

    expect(readExistingAreaBasicIdentityMutations({
      name: {
        expectedValue: "Crypt",
        value: "Crypt",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries,
        valueEntries: [...expectedEntries, { languageId: 4, text: "Added" }],
      },
    })?.name?.valueEntries).toEqual([
      ...expectedEntries,
      { languageId: 4, text: "Added" },
    ]);

    expect(areaNameStorageEntryIdentifiersFormAdmittedTarget(
      [{ languageId: 0, text: "Crypt" }, { languageId: 50, text: "Existing" }],
      [
        { languageId: 11, text: "Krypta" },
        { languageId: 50, text: "Existing" },
        { languageId: 0, text: "Crypt" },
      ],
    )).toBe(true);
    expect(areaNameStorageEntryIdentifiersFormAdmittedTarget(
      [{ languageId: 0, text: "Crypt" }],
      [{ languageId: 0, text: "Crypt" }, { languageId: 50, text: "Unknown" }],
    )).toBe(false);
    expect(areaNameStorageEntryIdentifiersFormAdmittedTarget(
      [{ languageId: 0, text: "Crypt" }],
      [{ languageId: 0, text: "Crypt" }, { languageId: 11, text: "" }],
    )).toBe(false);
    expect(areaNameStorageEntryIdentifiersFormAdmittedTarget(
      [{ languageId: 0, text: "Crypt" }],
      [{ languageId: 0, text: "Crypt" }, { languageId: 11, text: "Krypta łódzka" }],
    )).toBe(false);
  });
});
