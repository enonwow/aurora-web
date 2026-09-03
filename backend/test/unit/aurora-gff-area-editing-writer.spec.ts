import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { parseAreaMetadataFromAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { serializeAreaEditingDraftToAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-editing-writer";

describe("serializeAreaEditingDraftToAreGff", () => {
  it("fails closed before writing a sparse or duplicate-cell Tile_List", () => {
    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "new_area",
      name: "New Area",
      width: 2,
      height: 2,
      tilesetResRef: "testset",
      tiles: [
        { row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
        { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
        { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 }
      ]
    })).toThrow("Tile_List must contain exactly Width*Height unique in-bounds cells.");

    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "new_area",
      name: "New Area",
      width: 2,
      height: 2,
      tilesetResRef: "testset",
      tiles: [
        { row: 0, col: 0, tileId: 0, orientation: 0, height: 0 },
        { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
        { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
        { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 }
      ]
    })).toThrow("Tile_List must contain exactly Width*Height unique in-bounds cells.");
  });

  it("fails closed when claimed source provenance has no Tile_List struct", () => {
    expect(() => serializeAreaEditingDraftToAreGff(
      {
        areaResRef: "new_area",
        name: "New Area",
        width: 2,
        height: 2,
        tilesetResRef: "testset",
        tiles: [
          { row: 0, col: 0, sourceRow: 9, sourceCol: 9, tileId: 0, orientation: 0, height: 0 },
          { row: 0, col: 1, tileId: 0, orientation: 0, height: 0 },
          { row: 1, col: 0, tileId: 0, orientation: 0, height: 0 },
          { row: 1, col: 1, tileId: 0, orientation: 0, height: 0 }
        ]
      },
      {
        rootStructTypeId: 0xffffffff,
        fields: [
          { label: "Width", type: "dword", value: 1 },
          { label: "Height", type: "dword", value: 1 },
          {
            label: "Tile_List",
            type: "list",
            value: [{ typeId: 7, fields: [{ label: "Unknown", type: "int", value: 42 }] }]
          }
        ]
      }
    )).toThrow("Tile (0,0) references missing source tile (9,9).");
  });

  it("writes the retail Tile_List field set without Tile_ResRef or persisted group membership", () => {
    const document = parseRawGffDocument(
      serializeAreaEditingDraftToAreGff({
        areaResRef: "area_test",
        name: "Area Test",
        width: 2,
        height: 2,
        tilesetResRef: "tst01",
        tiles: [
          { row: 0, col: 0, tileId: 11, orientation: 1, height: 2, mainLight1: 3 },
          { row: 0, col: 1, tileId: 12, orientation: 0, height: 2 },
          { row: 1, col: 0, tileId: 13, orientation: 3, height: 2 },
          { row: 1, col: 1, tileId: 14, orientation: 2, height: 2 }
        ]
      })
    );

    expect(document?.fileType).toBe("ARE ");
    const tileList = document?.fields.find((field) => field.label === "Tile_List");
    expect(tileList).toMatchObject({ type: "list" });
    if (!tileList || tileList.type !== "list") return;

    const first = tileList.value[0]?.fields ?? [];
    expect(first).toEqual(
      expect.arrayContaining([
        { label: "Tile_ID", type: "int", value: 11 },
        { label: "Tile_Orientation", type: "int", value: 1 },
        { label: "Tile_Height", type: "int", value: 2 },
        { label: "Tile_MainLight1", type: "byte", value: 3 }
      ])
    );
    expect(first.some((field) => field.label === "Tile_ResRef")).toBe(false);
    expect(first.some((field) => /group/iu.test(field.label))).toBe(false);
    expect(first.filter((field) => /Tile_(?:MainLight|SrcLight|AnimLoop)/u.test(field.label))).toHaveLength(7);
    expect(tileList.value[1]?.fields).toEqual(
      expect.arrayContaining([
        { label: "Tile_MainLight1", type: "byte", value: 0 },
        { label: "Tile_MainLight2", type: "byte", value: 0 },
        { label: "Tile_SrcLight1", type: "byte", value: 0 },
        { label: "Tile_SrcLight2", type: "byte", value: 0 },
        { label: "Tile_AnimLoop1", type: "byte", value: 1 },
        { label: "Tile_AnimLoop2", type: "byte", value: 1 },
        { label: "Tile_AnimLoop3", type: "byte", value: 1 }
      ])
    );
  });
  it("preserves unknown root fields and the original root type when patching an existing ARE", () => {
    const document = parseRawGffDocument(
      serializeAreaEditingDraftToAreGff(
        {
          areaResRef: "area_test",
          name: "Area Test",
          width: 2,
          height: 2,
          tilesetResRef: "tst01",
          tiles: [
            { row: 0, col: 0, tileId: 11, orientation: 0, height: 0 },
            { row: 0, col: 1, tileId: 11, orientation: 0, height: 0 },
            { row: 1, col: 0, tileId: 11, orientation: 0, height: 0 },
            { row: 1, col: 1, tileId: 11, orientation: 0, height: 0 }
          ]
        },
        {
          rootStructTypeId: 42,
          fields: [
            { label: "Comment", type: "cexostring", value: "preserve me" },
            { label: "Width", type: "dword", value: 99 }
          ]
        }
      )
    );

    expect(document?.rootStructTypeId).toBe(42);
    expect(document?.fields).toEqual(
      expect.arrayContaining([
        { label: "Comment", type: "cexostring", value: "preserve me" },
        { label: "Width", type: "int", value: 2 }
      ])
    );
    expect(document?.fields.filter((field) => field.label === "Width")).toHaveLength(1);
  });

  it("replaces only one exact existing Area Comments value after matching expectedValue", () => {
    const document = parseRawGffDocument(serializeAreaEditingDraftToAreGff(
      {
        areaResRef: "area_test",
        name: "Area Test",
        width: 1,
        height: 1,
        tilesetResRef: "tin01",
        comments: { expectedValue: " old\r\nnote ", value: " new\r\nnote " },
        tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
      },
      {
        rootStructTypeId: 42,
        fields: [
          { label: "Before", type: "cexostring", value: "keep-before" },
          { label: "Comments", type: "cexostring", value: " old\r\nnote " },
          { label: "After", type: "cexostring", value: "keep-after" },
          { label: "Width", type: "dword", value: 1 },
          { label: "Height", type: "dword", value: 1 },
          { label: "Tileset", type: "resref", value: "tin01" },
          { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
        ],
      },
    ));

    expect(document?.fields.slice(0, 3)).toEqual([
      { label: "Before", type: "cexostring", value: "keep-before" },
      { label: "Comments", type: "cexostring", value: " new\r\nnote " },
      { label: "After", type: "cexostring", value: "keep-after" },
    ]);
    expect(document?.fields.filter((field) => field.label === "Comments")).toHaveLength(1);
  });

  it("replaces only requested exact existing Area event-script ResRefs in source order", () => {
    const document = parseRawGffDocument(serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test",
      name: "Area Test",
      width: 1,
      height: 1,
      tilesetResRef: "tin01",
      eventScripts: {
        onEnter: { expectedResRef: "old_enter", resRef: "new_enter" },
        onUserDefined: { expectedResRef: "old_user", resRef: "" },
      },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        { label: "OnEnter", type: "resref", value: "old_enter" },
        { label: "OnExit", type: "resref", value: "old_exit" },
        { label: "OnUserDefined", type: "resref", value: "old_user" },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
        { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
      ],
    }));
    expect(document?.fields.slice(0, 3)).toEqual([
      { label: "OnEnter", type: "resref", value: "new_enter" },
      { label: "OnExit", type: "resref", value: "old_exit" },
      { label: "OnUserDefined", type: "resref", value: "" },
    ]);
  });

  it("replaces only admitted exact existing Area Name and Tag storage", () => {
    const document = parseRawGffDocument(serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test", name: " New Name ", width: 1, height: 1,
      tilesetResRef: "tin01",
      basicIdentity: {
        name: { expectedValue: " Old Name ", value: " New Name " },
        tag: { expectedValue: "OLD_TAG", value: "" },
      },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        { label: "Before", type: "cexostring", value: "keep" },
        { label: "Name", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: " Old Name " }],
        } },
        { label: "Tag", type: "cexostring", value: "OLD_TAG" },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
        { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
      ],
    }));
    expect(document?.fields.slice(0, 3)).toEqual([
      { label: "Before", type: "cexostring", value: "keep" },
      { label: "Name", type: "cexolocstring", value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: " New Name " }],
      } },
      { label: "Tag", type: "cexostring", value: "" },
    ]);
  });

  it("replaces only identifier 0 and preserves ordered multi-entry inline Name siblings", () => {
    const document = parseRawGffDocument(serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test", name: "New Name", width: 1, height: 1,
      tilesetResRef: "tin01",
      basicIdentity: {
        name: {
          expectedValue: "Old Name",
          value: "New Name",
          expectedProfile: "multi_entry_inline_ascii",
        },
      },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        { label: "Name", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 3, text: "Nom" },
            { languageId: 0, text: "Old Name" },
            { languageId: 8, text: "" },
          ],
        } },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
        { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
      ],
    }));
    expect(document?.fields.find((field) => field.label === "Name")).toEqual({
      label: "Name",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 3, text: "Nom" },
          { languageId: 0, text: "New Name" },
          { languageId: 8, text: "" },
        ],
      },
    });
  });

  it("replaces existing alternate Name entry text through a complete ordered-list CAS", () => {
    const sourceEntries = [
      { languageId: 3, text: "Nom" },
      { languageId: 0, text: "Old Name" },
      { languageId: 8, text: "" },
    ];
    const targetEntries = [
      { languageId: 3, text: "Nouveau nom" },
      { languageId: 0, text: "Old Name" },
      { languageId: 8, text: "Third" },
    ];
    const document = parseRawGffDocument(serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test", name: "Old Name", width: 1, height: 1,
      tilesetResRef: "tin01",
      basicIdentity: { name: {
        expectedValue: "Old Name",
        value: "Old Name",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: sourceEntries,
        valueEntries: targetEntries,
      } },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        { label: "Name", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: sourceEntries,
        } },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
        { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
      ],
    }));
    expect(document?.fields.find((field) => field.label === "Name")).toEqual({
      label: "Name",
      type: "cexolocstring",
      value: { strRef: 0xffff_ffff, entries: targetEntries },
    });
  });

  it("removes only requested alternate Name entries and preserves retained order", () => {
    const sourceEntries = [
      { languageId: 3, text: "Nom" },
      { languageId: 0, text: "Old Name" },
      { languageId: 8, text: "Third" },
    ];
    const targetEntries = [
      { languageId: 0, text: "Old Name" },
      { languageId: 8, text: "Retained" },
    ];
    const document = parseRawGffDocument(serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test", name: "Old Name", width: 1, height: 1,
      tilesetResRef: "tin01",
      basicIdentity: { name: {
        expectedValue: "Old Name",
        value: "Old Name",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: sourceEntries,
        valueEntries: targetEntries,
      } },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        { label: "Name", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: sourceEntries,
        } },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
        { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
      ],
    }));
    expect(document?.fields.find((field) => field.label === "Name")).toEqual({
      label: "Name",
      type: "cexolocstring",
      value: { strRef: 0xffff_ffff, entries: targetEntries },
    });
  });

  it("writes an explicit permutation of already-existing Name entries", () => {
    const sourceEntries = [
      { languageId: 3, text: "Nom" },
      { languageId: 0, text: "Old Name" },
      { languageId: 8, text: "Third" },
    ];
    const targetEntries = [
      { languageId: 8, text: "Third" },
      { languageId: 0, text: "Old Name" },
      { languageId: 3, text: "Nom" },
    ];
    const document = parseRawGffDocument(serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test", name: "Old Name", width: 1, height: 1,
      tilesetResRef: "tin01",
      basicIdentity: { name: {
        expectedValue: "Old Name",
        value: "Old Name",
        expectedProfile: "multi_entry_inline_ascii",
        expectedEntries: sourceEntries,
        valueEntries: targetEntries,
      } },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        { label: "Name", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: sourceEntries,
        } },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
        { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
      ],
    }));
    expect(document?.fields.find((field) => field.label === "Name")).toEqual({
      label: "Name",
      type: "cexolocstring",
      value: { strRef: 0xffff_ffff, entries: targetEntries },
    });
  });

  it("writes a bounded new Area Name entry at the exact requested position", () => {
    const sourceEntries = [{ languageId: 0, text: "Old Name" }];
    const targetEntries = [
      { languageId: 11, text: "Krypta" },
      { languageId: 0, text: "Old Name" },
    ];
    const document = parseRawGffDocument(serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test", name: "Old Name", width: 1, height: 1,
      tilesetResRef: "tin01",
      basicIdentity: { name: {
        expectedValue: "Old Name",
        value: "Old Name",
        expectedProfile: "simple_inline_ascii",
        expectedEntries: sourceEntries,
        valueEntries: targetEntries,
      } },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        { label: "Name", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: sourceEntries,
        } },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
        { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
      ],
    }));
    expect(document?.fields.find((field) => field.label === "Name")).toEqual({
      label: "Name",
      type: "cexolocstring",
      value: { strRef: 0xffff_ffff, entries: targetEntries },
    });
  });

  it("requires profile CAS for multi-entry Name storage and rejects mismatches", () => {
    const preservation = {
      rootStructTypeId: 42,
      fields: [
        { label: "Name", type: "cexolocstring" as const, value: {
          strRef: 0xffff_ffff,
          entries: [
            { languageId: 0, text: "Old Name" },
            { languageId: 2, text: "Other" },
          ],
        } },
        { label: "Width", type: "dword" as const, value: 1 },
        { label: "Height", type: "dword" as const, value: 1 },
        { label: "Tileset", type: "resref" as const, value: "tin01" },
        { label: "Tile_List", type: "list" as const, value: [{ typeId: 0, fields: [] }] },
      ],
    };
    const draft = {
      areaResRef: "area_test", name: "New Name", width: 1, height: 1,
      tilesetResRef: "tin01",
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    };
    expect(() => serializeAreaEditingDraftToAreGff({
      ...draft,
      basicIdentity: { name: { expectedValue: "Old Name", value: "New Name" } },
    }, preservation)).toThrow("expectedProfile");
    expect(() => serializeAreaEditingDraftToAreGff({
      ...draft,
      basicIdentity: { name: {
        expectedValue: "Old Name",
        value: "New Name",
        expectedProfile: "simple_inline_ascii" as const,
      } },
    }, preservation)).toThrow("expectedProfile does not match");
  });

  it("rejects a changed exact Area Name when its CAS mutation is omitted or incoherent", () => {
    const preservation = {
      rootStructTypeId: 42,
      fields: [
        { label: "Name", type: "cexolocstring" as const, value: {
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, text: "Old Name" }],
        } },
        { label: "Width", type: "dword" as const, value: 1 },
        { label: "Height", type: "dword" as const, value: 1 },
        { label: "Tileset", type: "resref" as const, value: "tin01" },
        { label: "Tile_List", type: "list" as const, value: [{ typeId: 0, fields: [] }] },
      ],
    };
    const draft = {
      areaResRef: "area_test",
      name: "New Name",
      width: 1,
      height: 1,
      tilesetResRef: "tin01",
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    };

    expect(() => serializeAreaEditingDraftToAreGff(draft, preservation))
      .toThrow("requires an exact basic-identity CAS mutation");
    expect(() => serializeAreaEditingDraftToAreGff({
      ...draft,
      name: "Other Name",
      basicIdentity: {
        name: { expectedValue: "Old Name", value: "New Name" },
      },
    }, preservation)).toThrow("must match the exported draft name");
  });

  it("preserves an unsupported localized Name layout during unrelated Area edits", () => {
    const document = parseRawGffDocument(serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test",
      name: "Łódź — dzielnica",
      width: 1,
      height: 1,
      tilesetResRef: "tin01",
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 1, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        { label: "Name", type: "cexolocstring", value: {
          strRef: 42,
          entries: [{ languageId: 0, text: "Łódź — dzielnica" }],
        } },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
        { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
      ],
    }));

    expect(document?.fields.find((field) => field.label === "Name")).toEqual({
      label: "Name",
      type: "cexolocstring",
      value: {
        strRef: 42,
        entries: [{ languageId: 0, text: "Łódź — dzielnica" }],
      },
    });
  });

  it("replaces exact advanced Area fields and preserves their field order and types", () => {
    const document = parseRawGffDocument(serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test",
      name: "Area Test",
      width: 1,
      height: 1,
      tilesetResRef: "tin01",
      advancedFlags: {
        terrainType: {
          expectedValue: { interior: false, natural: true, subterranean: false },
          value: { interior: true, natural: false, subterranean: true },
        },
        playerVsPlayer: { expectedValue: 0, value: 3 },
        noRest: { expectedValue: false, value: true },
        listenCheckModifier: { expectedValue: -8, value: 9 },
        spotCheckModifier: { expectedValue: 11, value: -12 },
        loadingScreenId: { expectedValue: 0, value: 0xffff },
      },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        { label: "Before", type: "cexostring", value: "keep" },
        { label: "Flags", type: "dword", value: 4 },
        { label: "PlayerVsPlayer", type: "byte", value: 0 },
        { label: "NoRest", type: "byte", value: 0 },
        { label: "ModListenCheck", type: "int", value: -8 },
        { label: "ModSpotCheck", type: "int", value: 11 },
        { label: "LoadScreenID", type: "word", value: 0 },
        { label: "After", type: "int", value: 99 },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
        { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
      ],
    }));

    expect(document?.fields.slice(0, 8)).toEqual([
      { label: "Before", type: "cexostring", value: "keep" },
      { label: "Flags", type: "dword", value: 3 },
      { label: "PlayerVsPlayer", type: "byte", value: 3 },
      { label: "NoRest", type: "byte", value: 1 },
      { label: "ModListenCheck", type: "int", value: 9 },
      { label: "ModSpotCheck", type: "int", value: -12 },
      { label: "LoadScreenID", type: "word", value: 0xffff },
      { label: "After", type: "int", value: 99 },
    ]);
  });

  it.each([
    ["wrong-type loading screen", { label: "LoadScreenID", type: "dword" as const, value: 0 }, "exactly one LoadScreenID : word"],
    ["stale loading screen", { label: "LoadScreenID", type: "word" as const, value: 7 }, "expectedValue does not match"],
  ])("fails closed for %s", (_label, field, message) => {
    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test", name: "Area Test", width: 1, height: 1,
      tilesetResRef: "tin01",
      advancedFlags: { loadingScreenId: { expectedValue: 0, value: 1 } },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        field,
        { label: "Width", type: "dword" as const, value: 1 },
        { label: "Height", type: "dword" as const, value: 1 },
        { label: "Tileset", type: "resref" as const, value: "tin01" },
        { label: "Tile_List", type: "list" as const, value: [{ typeId: 0, fields: [] }] },
      ],
    })).toThrow(message);
  });

  it.each([
    ["unknown terrain bits", [{ label: "Flags", type: "dword" as const, value: 8 }], "outside the admitted 0..7 profile"],
    ["wrong-case PvP", [{ label: "playervsplayer", type: "byte" as const, value: 0 }], "exactly one PlayerVsPlayer : byte"],
    ["stale NoRest", [{ label: "NoRest", type: "byte" as const, value: 1 }], "expectedValue does not match"],
    ["wrong-type Listen modifier", [{ label: "ModListenCheck", type: "dword" as const, value: 0 }], "exactly one ModListenCheck : int"],
    ["stale Spot modifier", [{ label: "ModSpotCheck", type: "int" as const, value: 7 }], "expectedValue does not match"],
  ])("fails closed for %s", (_label, advancedFields, message) => {
    const advancedFlags = _label === "unknown terrain bits"
      ? { terrainType: {
          expectedValue: { interior: false, natural: false, subterranean: false },
          value: { interior: true, natural: false, subterranean: false },
        } }
      : _label === "wrong-case PvP"
        ? { playerVsPlayer: { expectedValue: 0 as const, value: 1 as const } }
        : _label === "stale NoRest"
          ? { noRest: { expectedValue: false, value: true } }
          : _label === "wrong-type Listen modifier"
            ? { listenCheckModifier: { expectedValue: 0, value: 1 } }
            : { spotCheckModifier: { expectedValue: 0, value: 1 } };
    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test", name: "Area Test", width: 1, height: 1,
      tilesetResRef: "tin01",
      advancedFlags,
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        ...advancedFields,
        { label: "Width", type: "dword" as const, value: 1 },
        { label: "Height", type: "dword" as const, value: 1 },
        { label: "Tileset", type: "resref" as const, value: "tin01" },
        { label: "Tile_List", type: "list" as const, value: [{ typeId: 0, fields: [] }] },
      ],
    })).toThrow(message);
  });

  it.each([
    ["talk-table Name", [{ label: "Name", type: "cexolocstring" as const, value: {
      strRef: 42, entries: [{ languageId: 0, text: "Old Name" }],
    } }], "simple-inline"],
    ["wrong-case Name", [{ label: "name", type: "cexolocstring" as const, value: {
      strRef: 0xffff_ffff, entries: [{ languageId: 0, text: "Old Name" }],
    } }], "exactly one Name"],
    ["stale Name", [{ label: "Name", type: "cexolocstring" as const, value: {
      strRef: 0xffff_ffff, entries: [{ languageId: 0, text: "Other" }],
    } }], "expectedValue does not match"],
  ])("fails closed for %s", (_label, identityFields, message) => {
    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test", name: "New Name", width: 1, height: 1,
      tilesetResRef: "tin01",
      basicIdentity: { name: { expectedValue: "Old Name", value: "New Name" } },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        ...identityFields,
        { label: "Width", type: "dword" as const, value: 1 },
        { label: "Height", type: "dword" as const, value: 1 },
        { label: "Tileset", type: "resref" as const, value: "tin01" },
        { label: "Tile_List", type: "list" as const, value: [{ typeId: 0, fields: [] }] },
      ],
    })).toThrow(message);
  });

  it.each([
    ["missing", [], "exactly one OnEnter : ResRef"],
    ["wrong case", [{ label: "onenter", type: "resref" as const, value: "old_enter" }], "exactly one OnEnter : ResRef"],
    ["wrong type", [{ label: "OnEnter", type: "cexostring" as const, value: "old_enter" }], "exactly one OnEnter : ResRef"],
    ["stale", [{ label: "OnEnter", type: "resref" as const, value: "other" }], "expectedResRef does not match"],
  ])("fails closed for a %s Area event-script source", (_label, scriptFields, message) => {
    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test", name: "Area Test", width: 1, height: 1,
      tilesetResRef: "tin01",
      eventScripts: { onEnter: { expectedResRef: "old_enter", resRef: "new_enter" } },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        ...scriptFields,
        { label: "Width", type: "dword" as const, value: 1 },
        { label: "Height", type: "dword" as const, value: 1 },
        { label: "Tileset", type: "resref" as const, value: "tin01" },
        { label: "Tile_List", type: "list" as const, value: [{ typeId: 0, fields: [] }] },
      ],
    })).toThrow(message);
  });

  it.each([
    ["missing preservation", undefined, "Area Comments mutation requires retained ARE preservation."],
    ["missing field", [], "exactly one Comments : CExoString"],
    ["wrong case", [{ label: "comments", type: "cexostring" as const, value: "old" }], "exactly one Comments : CExoString"],
    ["wrong type", [{ label: "Comments", type: "dword" as const, value: 1 }], "exactly one Comments : CExoString"],
    ["duplicate", [
      { label: "Comments", type: "cexostring" as const, value: "old" },
      { label: "Comments", type: "cexostring" as const, value: "old" },
    ], "exactly one Comments : CExoString"],
    ["stale", [{ label: "Comments", type: "cexostring" as const, value: "other" }], "expectedValue does not match"],
  ])("fails closed for a %s Area Comments mutation source", (_label, commentFields, expectedMessage) => {
    const preservation = commentFields === undefined ? undefined : {
      rootStructTypeId: 42,
      fields: [
        ...commentFields,
        { label: "Width", type: "dword" as const, value: 1 },
        { label: "Height", type: "dword" as const, value: 1 },
        { label: "Tileset", type: "resref" as const, value: "tin01" },
        { label: "Tile_List", type: "list" as const, value: [{ typeId: 0, fields: [] }] },
      ],
    };

    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test",
      name: "Area Test",
      width: 1,
      height: 1,
      tilesetResRef: "tin01",
      comments: { expectedValue: "old", value: "new" },
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, preservation)).toThrow(expectedMessage);
  });

  it.each([
    ["unchanged", { expectedValue: "same", value: "same" }],
    ["NUL expectedValue", { expectedValue: "bad\0source", value: "new" }],
    ["NUL value", { expectedValue: "old", value: "bad\0target" }],
    ["over-budget expectedValue", { expectedValue: "x".repeat(4097), value: "new" }],
    ["over-budget value", { expectedValue: "old", value: "x".repeat(4097) }],
  ])("rejects an %s Area Comments pair", (_label, comments) => {
    expect(() => serializeAreaEditingDraftToAreGff({
      areaResRef: "area_test",
      name: "Area Test",
      width: 1,
      height: 1,
      tilesetResRef: "tin01",
      comments,
      tiles: [{ row: 0, col: 0, tileId: 12, orientation: 0, height: 0 }],
    }, {
      rootStructTypeId: 42,
      fields: [
        { label: "Comments", type: "cexostring", value: comments.expectedValue },
        { label: "Width", type: "dword", value: 1 },
        { label: "Height", type: "dword", value: 1 },
        { label: "Tileset", type: "resref", value: "tin01" },
        { label: "Tile_List", type: "list", value: [{ typeId: 0, fields: [] }] },
      ],
    })).toThrow();
  });

  it("preserves every non-editable per-tile field and tile struct type while replacing editable fields", () => {
    const document = parseRawGffDocument(
      serializeAreaEditingDraftToAreGff(
        {
          areaResRef: "area_test",
          name: "Area Test",
          width: 2,
          height: 2,
          tilesetResRef: "tst01",
          tiles: [
            {
              row: 0,
              col: 1,
              sourceRow: 0,
              sourceCol: 1,
              tileId: 102,
              orientation: 2,
              height: 12,
              mainLight1: 21,
              mainLight2: 22,
              sourceLight1: 23,
              sourceLight2: 24,
              animLoop1: 25,
              animLoop2: 26,
              animLoop3: 27
            },
            { row: 0, col: 0, sourceRow: 0, sourceCol: 0, tileId: 101, orientation: 1, height: 11 },
            { row: 1, col: 0, sourceRow: 1, sourceCol: 0, tileId: 103, orientation: 3, height: 13 },
            { row: 1, col: 1, sourceRow: 1, sourceCol: 1, tileId: 104, orientation: 0, height: 14 }
          ]
        },
        {
          rootStructTypeId: 42,
          fields: [
            { label: "Width", type: "dword", value: 2 },
            { label: "Height", type: "dword", value: 2 },
            { label: "Tileset", type: "resref", value: "oldset" },
            {
              label: "Tile_List",
              type: "list",
              value: [
                {
                  typeId: 70,
                  fields: [
                    { label: "Tile_ID", type: "dword", value: 1 },
                    { label: "Tile_Orientation", type: "dword", value: 0 },
                    { label: "Tile_Height", type: "dword", value: 0 },
                    { label: "Tile_MainLight1", type: "byte", value: 31 },
                    { label: "Tile_MainLight2", type: "byte", value: 32 },
                    { label: "Tile_SrcLight1", type: "byte", value: 33 },
                    { label: "Tile_SrcLight2", type: "byte", value: 34 },
                    { label: "Tile_AnimLoop1", type: "byte", value: 35 },
                    { label: "Tile_AnimLoop2", type: "byte", value: 36 },
                    { label: "Tile_AnimLoop3", type: "byte", value: 37 },
                    { label: "Tile_CustomWord", type: "word", value: 700 }
                  ]
                },
                {
                  typeId: 71,
                  fields: [
                    { label: "Tile_ID", type: "dword", value: 2 },
                    { label: "Tile_Orientation", type: "dword", value: 0 },
                    { label: "Tile_Height", type: "dword", value: 0 },
                    { label: "Tile_MainLight1", type: "byte", value: 1 },
                    { label: "Tile_MainLight2", type: "byte", value: 2 },
                    { label: "Tile_SrcLight1", type: "byte", value: 3 },
                    { label: "Tile_SrcLight2", type: "byte", value: 4 },
                    { label: "Tile_AnimLoop1", type: "byte", value: 5 },
                    { label: "Tile_AnimLoop2", type: "byte", value: 6 },
                    { label: "Tile_AnimLoop3", type: "byte", value: 7 },
                    { label: "Tile_CustomStr", type: "cexostring", value: "keep second" }
                  ]
                },
                {
                  typeId: 72,
                  fields: [{ label: "Tile_CustomWord", type: "word", value: 702 }]
                },
                {
                  typeId: 73,
                  fields: [{ label: "Tile_CustomWord", type: "word", value: 703 }]
                }
              ]
            }
          ]
        }
      )
    );

    const tileList = document?.fields.find((field) => field.label === "Tile_List");
    expect(tileList).toMatchObject({ type: "list" });
    if (!tileList || tileList.type !== "list") return;
    expect(tileList.value.map((tile) => tile.typeId)).toEqual([70, 71, 72, 73]);
    expect(tileList.value[0]?.fields).toEqual(
      expect.arrayContaining([
        { label: "Tile_CustomWord", type: "word", value: 700 },
        { label: "Tile_ID", type: "int", value: 101 },
        { label: "Tile_Orientation", type: "int", value: 1 },
        { label: "Tile_Height", type: "int", value: 11 },
        { label: "Tile_MainLight1", type: "byte", value: 31 },
        { label: "Tile_MainLight2", type: "byte", value: 32 },
        { label: "Tile_SrcLight1", type: "byte", value: 33 },
        { label: "Tile_SrcLight2", type: "byte", value: 34 },
        { label: "Tile_AnimLoop1", type: "byte", value: 35 },
        { label: "Tile_AnimLoop2", type: "byte", value: 36 },
        { label: "Tile_AnimLoop3", type: "byte", value: 37 }
      ])
    );
    expect(tileList.value[1]?.fields).toEqual(
      expect.arrayContaining([
        { label: "Tile_CustomStr", type: "cexostring", value: "keep second" },
        { label: "Tile_ID", type: "int", value: 102 },
        { label: "Tile_Orientation", type: "int", value: 2 },
        { label: "Tile_Height", type: "int", value: 12 },
        { label: "Tile_MainLight1", type: "byte", value: 21 },
        { label: "Tile_MainLight2", type: "byte", value: 22 },
        { label: "Tile_SrcLight1", type: "byte", value: 23 },
        { label: "Tile_SrcLight2", type: "byte", value: 24 },
        { label: "Tile_AnimLoop1", type: "byte", value: 25 },
        { label: "Tile_AnimLoop2", type: "byte", value: 26 },
        { label: "Tile_AnimLoop3", type: "byte", value: 27 }
      ])
    );
    expect(tileList.value[1]?.fields.filter((field) => field.label === "Tile_MainLight1")).toHaveLength(1);

    const parsed = parseAreaMetadataFromAreGff(
      serializeAreaEditingDraftToAreGff(
        {
          areaResRef: "area_test",
          name: "Area Test",
          width: 2,
          height: 2,
          tilesetResRef: "tst01",
          tiles: [
            { row: 0, col: 0, tileId: 101, orientation: 1, height: 11 },
            { row: 0, col: 1, tileId: 102, orientation: 2, height: 12 },
            { row: 1, col: 0, tileId: 103, orientation: 3, height: 13 },
            { row: 1, col: 1, tileId: 104, orientation: 0, height: 14 }
          ]
        },
        {
          rootStructTypeId: document?.rootStructTypeId ?? 42,
          fields: document?.fields ?? []
        }
      )
    );
    expect(parsed?.tiles).toEqual([
      expect.objectContaining({ row: 0, col: 0, tileId: 101, orientation: 1, height: 11 }),
      expect.objectContaining({ row: 0, col: 1, tileId: 102, orientation: 2, height: 12 }),
      expect.objectContaining({ row: 1, col: 0, tileId: 103, orientation: 3, height: 13 }),
      expect.objectContaining({ row: 1, col: 1, tileId: 104, orientation: 0, height: 14 })
    ]);
  });

  it("uses explicit source provenance after a left-edge resize and leaves the new cell canonical", () => {
    const document = parseRawGffDocument(
      serializeAreaEditingDraftToAreGff(
        {
          areaResRef: "area_test",
          name: "Area Test",
          width: 3,
          height: 2,
          tilesetResRef: "tst01",
          tiles: [
            { row: 0, col: 0, tileId: 100, orientation: 0, height: 0 },
            { row: 0, col: 1, sourceRow: 0, sourceCol: 0, tileId: 101, orientation: 0, height: 0 },
            { row: 0, col: 2, sourceRow: 0, sourceCol: 1, tileId: 102, orientation: 0, height: 0 },
            { row: 1, col: 0, tileId: 103, orientation: 0, height: 0 },
            { row: 1, col: 1, sourceRow: 1, sourceCol: 0, tileId: 104, orientation: 0, height: 0 },
            { row: 1, col: 2, sourceRow: 1, sourceCol: 1, tileId: 105, orientation: 0, height: 0 }
          ]
        },
        {
          rootStructTypeId: 42,
          fields: [
            { label: "Width", type: "dword", value: 2 },
            { label: "Height", type: "dword", value: 2 },
            {
              label: "Tile_List",
              type: "list",
              value: [
                { typeId: 70, fields: [{ label: "Unknown", type: "int", value: 700 }] },
                { typeId: 71, fields: [{ label: "Unknown", type: "int", value: 701 }] },
                { typeId: 72, fields: [{ label: "Unknown", type: "int", value: 702 }] },
                { typeId: 73, fields: [{ label: "Unknown", type: "int", value: 703 }] }
              ]
            }
          ]
        }
      )
    );
    const tileList = document?.fields.find((field) => field.label === "Tile_List");
    expect(tileList).toMatchObject({ type: "list" });
    if (!tileList || tileList.type !== "list") return;
    expect(tileList.value.map((tile) => tile.typeId)).toEqual([0, 70, 71, 0, 72, 73]);
    expect(tileList.value[0]?.fields.some((field) => field.label === "Unknown")).toBe(false);
    expect(tileList.value[1]?.fields).toContainEqual({ label: "Unknown", type: "int", value: 700 });
    expect(tileList.value[2]?.fields).toContainEqual({ label: "Unknown", type: "int", value: 701 });
    expect(tileList.value[3]?.fields.some((field) => field.label === "Unknown")).toBe(false);
    expect(tileList.value[4]?.fields).toContainEqual({ label: "Unknown", type: "int", value: 702 });
    expect(tileList.value[5]?.fields).toContainEqual({ label: "Unknown", type: "int", value: 703 });
  });

  it("preserves the original localized Name and Tag while replacing existing ARE topology", () => {
    const originalName = {
      strRef: 1234,
      entries: [
        { languageId: 0, text: "Original area" },
        { languageId: 2, text: "Oryginalny obszar" }
      ]
    };
    const document = parseRawGffDocument(
      serializeAreaEditingDraftToAreGff(
        {
          areaResRef: "replacement_ref",
          name: "Replacement name",
          width: 2,
          height: 2,
          tilesetResRef: "newset",
          tiles: [
            { row: 0, col: 0, tileId: 21, orientation: 0, height: 1 },
            { row: 0, col: 1, tileId: 22, orientation: 1, height: 2 },
            { row: 1, col: 0, tileId: 23, orientation: 2, height: 3 },
            { row: 1, col: 1, tileId: 24, orientation: 3, height: 4 }
          ]
        },
        {
          rootStructTypeId: 42,
          fields: [
            { label: "Name", type: "cexolocstring", value: originalName },
            { label: "Tag", type: "cexostring", value: "original_tag" },
            { label: "Width", type: "dword", value: 99 },
            { label: "Height", type: "dword", value: 88 },
            { label: "Tileset", type: "resref", value: "oldset" },
            { label: "Tile_List", type: "list", value: [] }
          ]
        }
      )
    );

    expect(document?.fields.find((field) => field.label === "Name")).toEqual({
      label: "Name",
      type: "cexolocstring",
      value: originalName
    });
    expect(document?.fields.find((field) => field.label === "Tag")).toEqual({
      label: "Tag",
      type: "cexostring",
      value: "original_tag"
    });
    expect(document?.fields).toEqual(
      expect.arrayContaining([
        { label: "Width", type: "int", value: 2 },
        { label: "Height", type: "int", value: 2 },
        { label: "Tileset", type: "resref", value: "newset" }
      ])
    );
    const tileList = document?.fields.find((field) => field.label === "Tile_List");
    expect(tileList).toMatchObject({ type: "list" });
    if (!tileList || tileList.type !== "list") return;
    expect(tileList.value).toHaveLength(4);
    expect(tileList.value[0]?.fields).toEqual(
      expect.arrayContaining([
        { label: "Tile_ID", type: "int", value: 21 },
        { label: "Tile_Height", type: "int", value: 1 }
      ])
    );
  });

  it("round-trips ordered tile coordinates and editable runtime fields through the Area parser", () => {
    const parsed = parseAreaMetadataFromAreGff(
      serializeAreaEditingDraftToAreGff({
        areaResRef: "area_test",
        name: "Area Test",
        width: 2,
        height: 2,
        tilesetResRef: "tst01",
        tiles: [
          { row: 1, col: 1, tileId: 14, orientation: 2, height: 4 },
          { row: 0, col: 1, tileId: 12, orientation: 0, height: 2, sourceLight1: 5 },
          { row: 1, col: 0, tileId: 13, orientation: 3, height: 3, animLoop3: 7 },
          { row: 0, col: 0, tileId: 11, orientation: 1, height: 1, mainLight1: 3 }
        ]
      })
    );

    expect(parsed).toMatchObject({ width: 2, height: 2, tileSet: "tst01" });
    expect(parsed?.tiles).toEqual([
      expect.objectContaining({ row: 0, col: 0, tileId: 11, orientation: 1, height: 1, mainLight1: 3 }),
      expect.objectContaining({ row: 0, col: 1, tileId: 12, orientation: 0, height: 2, sourceLight1: 5 }),
      expect.objectContaining({ row: 1, col: 0, tileId: 13, orientation: 3, height: 3, animLoop3: 7 }),
      expect.objectContaining({ row: 1, col: 1, tileId: 14, orientation: 2, height: 4 })
    ]);
  });
});
