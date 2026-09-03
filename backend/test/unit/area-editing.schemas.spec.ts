import { parseAreaEditingExportDraft } from "../../src/modules/areas/adapters/inbound/http/area-editing.schemas";

function draft(height: number) {
  return {
    areaResRef: "height_test",
    name: "Height Test",
    width: 2,
    height: 2,
    tilesetResRef: "heightset",
    tilesetFingerprint: "a".repeat(64),
    tiles: [
      { row: 0, col: 0, tileId: 0, orientation: 0, height },
      { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
      { row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
    ]
  };
}

describe("Area editing export schema", () => {
  it("accepts Aurora tile heights 0..32 and rejects values outside the recovered range", () => {
    expect(parseAreaEditingExportDraft(draft(0)).tiles[0]?.height).toBe(0);
    expect(parseAreaEditingExportDraft(draft(32)).tiles[0]?.height).toBe(32);
    expect(() => parseAreaEditingExportDraft(draft(-1))).toThrow();
    expect(() => parseAreaEditingExportDraft(draft(33))).toThrow();
    expect(() => parseAreaEditingExportDraft(draft(1.5))).toThrow();
  });

  it("accepts one exact changed Area Comments pair without trimming or newline normalization", () => {
    const value = {
      ...draft(0),
      comments: {
        expectedValue: " old\r\nnote ",
        value: " new\r\nnote ",
      },
    };

    expect(parseAreaEditingExportDraft(value).comments).toEqual(value.comments);
  });

  it.each([
    ["unchanged", { expectedValue: "same", value: "same" }],
    ["NUL source", { expectedValue: "bad\0source", value: "new" }],
    ["NUL target", { expectedValue: "old", value: "bad\0target" }],
    ["over-budget source", { expectedValue: "x".repeat(4097), value: "new" }],
    ["over-budget target", { expectedValue: "old", value: "x".repeat(4097) }],
  ])("rejects an %s Area Comments pair", (_label, comments) => {
    expect(() => parseAreaEditingExportDraft({ ...draft(0), comments })).toThrow();
  });

  it("accepts changed canonical Area event-script CAS pairs including unbind", () => {
    const eventScripts = {
      onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
      onExit: { expectedResRef: "old_exit", resRef: "" },
    };
    expect(parseAreaEditingExportDraft({ ...draft(0), eventScripts }).eventScripts)
      .toEqual(eventScripts);
  });

  it.each([
    ["empty mutation", {}],
    ["unchanged", { onEnter: { expectedResRef: "same", resRef: "same" } }],
    ["uppercase", { onEnter: { expectedResRef: "old", resRef: "Bad" } }],
    ["over-length", { onEnter: { expectedResRef: "old", resRef: "x".repeat(17) } }],
    ["unknown slot", { onLoad: { expectedResRef: "old", resRef: "new" } }],
  ])("rejects an %s Area event-script mutation", (_label, eventScripts) => {
    expect(() => parseAreaEditingExportDraft({ ...draft(0), eventScripts })).toThrow();
  });

  it("accepts exact changed Area Name and empty Tag CAS pairs without trimming", () => {
    const basicIdentity = {
      name: { expectedValue: " Old Name ", value: " New Name " },
      tag: { expectedValue: "OLD_TAG", value: "" },
    };
    const parsed = parseAreaEditingExportDraft({
      ...draft(0),
      name: " New Name ",
      basicIdentity,
    });
    expect(parsed.name).toBe(" New Name ");
    expect(parsed.basicIdentity).toEqual(basicIdentity);
  });

  it("accepts a profile-bound multi-entry Area Name CAS pair", () => {
    const basicIdentity = {
      name: {
        expectedValue: "Old Name",
        value: "New Name",
        expectedProfile: "multi_entry_inline_ascii",
      },
    };
    expect(parseAreaEditingExportDraft({
      ...draft(0),
      name: "New Name",
      basicIdentity,
    }).basicIdentity).toEqual(basicIdentity);
  });

  it("accepts a complete existing-entry Area Name CAS when only a sibling changes", () => {
    const basicIdentity = {
      name: {
        expectedValue: "Old Name",
        value: "Old Name",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: [
          { languageId: 0, text: "Old Name" },
          { languageId: 2, text: "Old sibling" },
        ],
        valueEntries: [
          { languageId: 0, text: "Old Name" },
          { languageId: 2, text: "New sibling" },
        ],
      },
    };
    expect(parseAreaEditingExportDraft({
      ...draft(0),
      name: "Old Name",
      basicIdentity,
    }).basicIdentity).toEqual(basicIdentity);
  });

  it("accepts an Area Name CAS that removes an existing alternate entry", () => {
    const basicIdentity = {
      name: {
        expectedValue: "Old Name",
        value: "Old Name",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: [
          { languageId: 0, text: "Old Name" },
          { languageId: 2, text: "Old sibling" },
        ],
        valueEntries: [{ languageId: 0, text: "Old Name" }],
      },
    };
    expect(parseAreaEditingExportDraft({
      ...draft(0),
      name: "Old Name",
      basicIdentity,
    }).basicIdentity).toEqual(basicIdentity);
  });

  it("accepts an Area Name CAS that reorders only existing identifiers", () => {
    const basicIdentity = {
      name: {
        expectedValue: "Old Name",
        value: "Old Name",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: [
          { languageId: 0, text: "Old Name" },
          { languageId: 2, text: "Old sibling" },
        ],
        valueEntries: [
          { languageId: 2, text: "Old sibling" },
          { languageId: 0, text: "Old Name" },
        ],
      },
    };
    expect(parseAreaEditingExportDraft({
      ...draft(0),
      name: "Old Name",
      basicIdentity,
    }).basicIdentity).toEqual(basicIdentity);
  });

  it("accepts a bounded Area Name Add/Reinsert target", () => {
    const basicIdentity = {
      name: {
        expectedValue: "Old Name",
        value: "Old Name",
        expectedProfile: "simple_inline_ascii",
        expectedEntries: [{ languageId: 0, text: "Old Name" }],
        valueEntries: [
          { languageId: 11, text: "Krypta" },
          { languageId: 0, text: "Old Name" },
        ],
      },
    };
    expect(parseAreaEditingExportDraft({
      ...draft(0),
      name: "Old Name",
      basicIdentity,
    }).basicIdentity).toEqual(basicIdentity);
  });

  it.each([
    ["one-sided entry list", {
      expectedValue: "Old Name", value: "Old Name",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Old Name" }, { languageId: 2, text: "Old" }],
    }],
    ["unverified added identifier", {
      expectedValue: "Old Name", value: "Old Name",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Old Name" }, { languageId: 2, text: "Old" }],
      valueEntries: [
        { languageId: 0, text: "Old Name" },
        { languageId: 2, text: "Old" },
        { languageId: 12, text: "Added" },
      ],
    }],
    ["profile/list mismatch", {
      expectedValue: "Old Name", value: "Old Name",
      expectedProfile: "simple_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Old Name" }, { languageId: 2, text: "Old" }],
      valueEntries: [{ languageId: 0, text: "Old Name" }, { languageId: 2, text: "New" }],
    }],
    ["default entry mismatch", {
      expectedValue: "Old Name", value: "Old Name",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Different" }, { languageId: 2, text: "Old" }],
      valueEntries: [{ languageId: 0, text: "Old Name" }, { languageId: 2, text: "New" }],
    }],
    ["unchanged complete lists", {
      expectedValue: "Old Name", value: "Old Name",
      expectedProfile: "multi_entry_inline_ascii",
      expectedEntries: [{ languageId: 0, text: "Old Name" }, { languageId: 2, text: "Same" }],
      valueEntries: [{ languageId: 0, text: "Old Name" }, { languageId: 2, text: "Same" }],
    }],
  ])("rejects an Area Name CAS with %s", (_label, name) => {
    expect(() => parseAreaEditingExportDraft({
      ...draft(0),
      name: "Old Name",
      basicIdentity: { name },
    })).toThrow();
  });

  it("preserves an unchanged localized display name when no Name mutation is requested", () => {
    const parsed = parseAreaEditingExportDraft({
      ...draft(0),
      name: " Łódź — dzielnica ",
    });
    expect(parsed.name).toBe(" Łódź — dzielnica ");
    expect(parsed.basicIdentity).toBeUndefined();
  });

  it.each([
    ["empty mutation", {}],
    ["unchanged Name", { name: { expectedValue: "Same", value: "Same" } }],
    ["empty Name", { name: { expectedValue: "Old", value: "" } }],
    ["non-ASCII Name", { name: { expectedValue: "Old", value: "Nowa łąka" } }],
    ["newline Tag", { tag: { expectedValue: "old", value: "bad\ntag" } }],
    ["unknown Name profile", { name: {
      expectedValue: "Old", value: "New", expectedProfile: "tlk",
    } }],
  ])("rejects an %s Area basic-identity mutation", (_label, basicIdentity) => {
    expect(() => parseAreaEditingExportDraft({ ...draft(0), basicIdentity })).toThrow();
  });

  it("accepts exact changed Area advanced-flag CAS pairs", () => {
    const advancedFlags = {
      terrainType: {
        expectedValue: { interior: false, natural: true, subterranean: false },
        value: { interior: true, natural: false, subterranean: true },
      },
      playerVsPlayer: { expectedValue: 0, value: 3 },
      noRest: { expectedValue: false, value: true },
      listenCheckModifier: { expectedValue: -99, value: 99 },
      spotCheckModifier: { expectedValue: 12, value: -7 },
      loadingScreenId: { expectedValue: 0, value: 0xffff },
    };
    expect(parseAreaEditingExportDraft({ ...draft(0), advancedFlags }).advancedFlags)
      .toEqual(advancedFlags);
  });

  it.each([
    ["empty", {}],
    ["unchanged terrain", { terrainType: {
      expectedValue: { interior: false, natural: false, subterranean: false },
      value: { interior: false, natural: false, subterranean: false },
    } }],
    ["invalid PvP", { playerVsPlayer: { expectedValue: 0, value: 4 } }],
    ["numeric NoRest", { noRest: { expectedValue: false, value: 1 } }],
    ["low Listen modifier", { listenCheckModifier: { expectedValue: -100, value: 0 } }],
    ["high Spot modifier", { spotCheckModifier: { expectedValue: 0, value: 100 } }],
    ["fractional modifier", { listenCheckModifier: { expectedValue: 0, value: 1.5 } }],
    ["unchanged modifier", { spotCheckModifier: { expectedValue: 4, value: 4 } }],
    ["oversized loading screen", { loadingScreenId: { expectedValue: 0, value: 0x1_0000 } }],
    ["unchanged loading screen", { loadingScreenId: { expectedValue: 7, value: 7 } }],
    ["unknown field", { loadScreenId: { expectedValue: 0, value: 1 } }],
  ])("rejects an %s Area advanced-flag mutation", (_label, advancedFlags) => {
    expect(() => parseAreaEditingExportDraft({ ...draft(0), advancedFlags })).toThrow();
  });

});
