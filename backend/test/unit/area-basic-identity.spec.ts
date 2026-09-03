import {
  isEditableAreaName,
  isAreaNameStorageProfile,
  isEditableAreaTag,
  areaNameStorageEntriesEqual,
  areaNameStorageEntryIdentifiersFormAdmittedTarget,
  readEditableAreaNameEntries,
  readEditableAreaNameStorage,
  readExistingAreaBasicIdentityMutations,
} from "../../src/modules/areas/domain/area-basic-identity";

describe("existing Area basic identity contract", () => {
  it.each(["A", "Market District", "x".repeat(256)])(
    "admits printable ASCII Area Name %j",
    (value) => expect(isEditableAreaName(value)).toBe(true),
  );

  it.each(["", "   ", "bad\nname", "bad\0name", "ą", "x".repeat(257)])(
    "rejects unsupported Area Name %j",
    (value) => expect(isEditableAreaName(value)).toBe(false),
  );

  it.each(["", "AREA_TAG", "tag with spaces", "x".repeat(64)])(
    "admits printable ASCII Area Tag %j",
    (value) => expect(isEditableAreaTag(value)).toBe(true),
  );

  it.each(["bad\ntag", "bad\0tag", "ą", "x".repeat(65)])(
    "rejects unsupported Area Tag %j",
    (value) => expect(isEditableAreaTag(value)).toBe(false),
  );

  it("reads changed exact Name and empty-Tag CAS pairs", () => {
    expect(readExistingAreaBasicIdentityMutations({
      name: { expectedValue: "Old Name", value: "New Name" },
      tag: { expectedValue: "OLD_TAG", value: "" },
    })).toEqual({
      name: { expectedValue: "Old Name", value: "New Name" },
      tag: { expectedValue: "OLD_TAG", value: "" },
    });
  });

  it("classifies simple and ordered multi-entry inline ASCII Name storage", () => {
    expect(readEditableAreaNameStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IENyeXB0IA==" }],
    })).toEqual({
      name: " Crypt ",
      profile: "simple_inline_ascii",
      entries: [{ languageId: 0, text: " Crypt " }],
    });
    expect(readEditableAreaNameStorage({
      present: true,
      strRef: 0xffff_ffff,
      entries: [
        { languageId: 3, textBytesBase64: "Q3J5cHQgRg==" },
        { languageId: 0, textBytesBase64: "Q3J5cHQ=" },
        { languageId: 8, textBytesBase64: "" },
      ],
    })).toEqual({
      name: "Crypt",
      profile: "multi_entry_inline_ascii",
      entries: [
        { languageId: 3, text: "Crypt F" },
        { languageId: 0, text: "Crypt" },
        { languageId: 8, text: "" },
      ],
    });
    expect(isAreaNameStorageProfile("simple_inline_ascii")).toBe(true);
    expect(isAreaNameStorageProfile("multi_entry_inline_ascii")).toBe(true);
    expect(isAreaNameStorageProfile("tlk")).toBe(false);
  });

  it.each([
    ["TLK-backed", { present: true, strRef: 7, entries: [{ languageId: 0, textBytesBase64: "Q3J5cHQ=" }] }],
    ["missing default", { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 2, textBytesBase64: "Q3J5cHQ=" }] }],
    ["duplicate default", { present: true, strRef: 0xffff_ffff, entries: [
      { languageId: 0, textBytesBase64: "Q3J5cHQ=" },
      { languageId: 0, textBytesBase64: "QWdhaW4=" },
    ] }],
    ["duplicate sibling", { present: true, strRef: 0xffff_ffff, entries: [
      { languageId: 0, textBytesBase64: "Q3J5cHQ=" },
      { languageId: 2, textBytesBase64: "QQ==" },
      { languageId: 2, textBytesBase64: "Qg==" },
    ] }],
    ["empty default", { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 0, textBytesBase64: "" }] }],
    ["non-ASCII sibling", { present: true, strRef: 0xffff_ffff, entries: [
      { languageId: 0, textBytesBase64: "Q3J5cHQ=" },
      { languageId: 2, textBytesBase64: "/w==" },
    ] }],
    ["non-canonical base64", { present: true, strRef: 0xffff_ffff, entries: [{ languageId: 0, textBytesBase64: "Q3J5cHQ" }] }],
  ])("rejects %s Area Name storage", (_label, storage) => {
    expect(readEditableAreaNameStorage(storage)).toBeUndefined();
  });

  it("reads profile-bound Name CAS and keeps legacy pairs backward-compatible", () => {
    expect(readExistingAreaBasicIdentityMutations({
      name: {
        expectedValue: "Old Name",
        value: "New Name",
        expectedProfile: "multi_entry_inline_ascii",
      },
    })).toEqual({
      name: {
        expectedValue: "Old Name",
        value: "New Name",
        expectedProfile: "multi_entry_inline_ascii",
      },
    });
    expect(readExistingAreaBasicIdentityMutations({
      name: { expectedValue: "Old Name", value: "New Name" },
    })).toEqual({ name: { expectedValue: "Old Name", value: "New Name" } });
  });

  it("reads one complete existing-entry Name CAS without normalizing identifiers or text", () => {
    const expectedEntries = [
      { languageId: 3, text: " Crypt F " },
      { languageId: 0, text: "Crypt" },
      { languageId: 0xffff_ffff, text: "" },
    ];
    const valueEntries = [
      { languageId: 3, text: " Vault F " },
      { languageId: 0, text: "Crypt" },
      { languageId: 0xffff_ffff, text: "Last" },
    ];

    expect(readEditableAreaNameEntries(expectedEntries)).toEqual(expectedEntries);
    expect(areaNameStorageEntriesEqual(expectedEntries, expectedEntries.map((entry) => ({ ...entry })))).toBe(true);
    expect(areaNameStorageEntriesEqual(expectedEntries, valueEntries)).toBe(false);
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
  });

  it("admits an existing-identifier subset target that removes alternate Name entries", () => {
    const expectedEntries = [
      { languageId: 3, text: "Nom" },
      { languageId: 0, text: "Crypt" },
      { languageId: 8, text: "Empty alternate" },
    ];
    const valueEntries = [{ languageId: 0, text: "Crypt" }];

    expect(areaNameStorageEntryIdentifiersFormAdmittedTarget(
      expectedEntries,
      valueEntries,
    )).toBe(true);
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
  });

  it("admits an explicit permutation of already-existing Name identifiers", () => {
    const expectedEntries = [
      { languageId: 0, text: "Crypt" },
      { languageId: 2, text: "Krypta" },
      { languageId: 5, text: "Crypte" },
    ];
    const valueEntries = [
      { languageId: 5, text: "Crypte" },
      { languageId: 0, text: "Crypt" },
      { languageId: 2, text: "Krypta" },
    ];
    expect(areaNameStorageEntryIdentifiersFormAdmittedTarget(
      expectedEntries,
      valueEntries,
    )).toBe(true);
    expect(readExistingAreaBasicIdentityMutations({
      name: {
        expectedValue: "Crypt",
        value: "Crypt",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries,
        valueEntries,
      },
    })?.name?.valueEntries).toEqual(valueEntries);
  });

  it("admits bounded Add/Reinsert while retaining source-bound unknown identifiers", () => {
    const source = [
      { languageId: 0, text: "Crypt" },
      { languageId: 50, text: "Source-bound" },
    ];
    const target = [
      { languageId: 11, text: "Krypta" },
      { languageId: 50, text: "Source-bound" },
      { languageId: 0, text: "Crypt" },
    ];

    expect(areaNameStorageEntryIdentifiersFormAdmittedTarget(source, target)).toBe(true);
    expect(readExistingAreaBasicIdentityMutations({
      name: {
        expectedValue: "Crypt",
        value: "Crypt",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: source,
        valueEntries: target,
      },
    })?.name?.valueEntries).toEqual(target);
  });

  it.each([
    ["English female", 1, "Forbidden"],
    ["unverified absent identifier", 12, "Forbidden"],
    ["unknown source identifier", 50, "Forbidden"],
    ["empty new text", 11, ""],
    ["non-ASCII new text", 11, "Krypta łódzka"],
  ])("rejects %s synthesis", (_label, languageId, text) => {
    expect(areaNameStorageEntryIdentifiersFormAdmittedTarget(
      [{ languageId: 0, text: "Crypt" }],
      [{ languageId: 0, text: "Crypt" }, { languageId, text }],
    )).toBe(false);
  });

  it.each([
    ["one missing list", {
      expectedValue: "Crypt", value: "Crypt", expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 2, text: "Krypta" }],
    }],
    ["unverified new identifier", {
      expectedValue: "Crypt", value: "Crypt", expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 2, text: "Krypta" }],
      valueEntries: [
        { languageId: 0, text: "Crypt" },
        { languageId: 2, text: "Krypta" },
        { languageId: 12, text: "Added" },
      ],
    }],
    ["removed default identifier", {
      expectedValue: "Crypt", value: "Crypt", expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 2, text: "Krypta" }],
      valueEntries: [{ languageId: 2, text: "Krypta" }],
    }],
    ["default mismatch", {
      expectedValue: "Crypt", value: "Vault", expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 2, text: "Krypta" }],
      valueEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 2, text: "Vault" }],
    }],
    ["profile mismatch", {
      expectedValue: "Crypt", value: "Vault", expectedProfile: "simple_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 2, text: "Krypta" }],
      valueEntries: [{ languageId: 0, text: "Vault" }, { languageId: 2, text: "Krypta" }],
    }],
    ["unchanged complete lists", {
      expectedValue: "Crypt", value: "Crypt", expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 2, text: "Krypta" }],
      valueEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 2, text: "Krypta" }],
    }],
    ["duplicate identifier", {
      expectedValue: "Crypt", value: "Crypt", expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 0, text: "Again" }],
      valueEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 0, text: "Changed" }],
    }],
    ["non-ASCII sibling", {
      expectedValue: "Crypt", value: "Crypt", expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 2, text: "Krypta" }],
      valueEntries: [{ languageId: 0, text: "Crypt" }, { languageId: 2, text: "Krypta łódzka" }],
    }],
  ])("rejects %s in an existing-entry Name CAS", (_label, name) => {
    expect(readExistingAreaBasicIdentityMutations({ name })).toBeNull();
  });

  it.each([
    {},
    { name: { expectedValue: "Same", value: "Same" } },
    { name: { expectedValue: "Old", value: "" } },
    { tag: { expectedValue: "old", value: "bad\nvalue" } },
    { Name: { expectedValue: "Old", value: "New" } },
    { name: { expectedValue: "Old", value: "New", extra: true } },
    { name: { expectedValue: "Old", value: "New", expectedProfile: "tlk" } },
  ])("rejects malformed Area basic-identity mutation %#", (value) => {
    expect(readExistingAreaBasicIdentityMutations(value)).toBeNull();
  });
});
