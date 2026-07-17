import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { parseAreaMetadataFromAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { serializeAreaEditingDraftToAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-editing-writer";

describe("serializeAreaEditingDraftToAreGff", () => {
  it("fails closed when claimed source provenance has no Tile_List struct", () => {
    expect(() => serializeAreaEditingDraftToAreGff(
      {
        areaResRef: "new_area",
        name: "New Area",
        width: 2,
        height: 2,
        tilesetResRef: "testset",
        tiles: [
          { row: 0, col: 0, sourceRow: 9, sourceCol: 9, tileId: 0, orientation: 0, height: 0 }
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
        { label: "Tile_ID", type: "dword", value: 11 },
        { label: "Tile_Orientation", type: "dword", value: 1 },
        { label: "Tile_Height", type: "dword", value: 2 },
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
        { label: "Tile_AnimLoop1", type: "byte", value: 0 },
        { label: "Tile_AnimLoop2", type: "byte", value: 0 },
        { label: "Tile_AnimLoop3", type: "byte", value: 0 }
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
        { label: "Width", type: "dword", value: 2 }
      ])
    );
    expect(document?.fields.filter((field) => field.label === "Width")).toHaveLength(1);
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
        { label: "Tile_ID", type: "dword", value: 101 },
        { label: "Tile_Orientation", type: "dword", value: 1 },
        { label: "Tile_Height", type: "dword", value: 11 }
      ])
    );
    expect(tileList.value[1]?.fields).toEqual(
      expect.arrayContaining([
        { label: "Tile_CustomStr", type: "cexostring", value: "keep second" },
        { label: "Tile_ID", type: "dword", value: 102 },
        { label: "Tile_Orientation", type: "dword", value: 2 },
        { label: "Tile_Height", type: "dword", value: 12 },
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
            { row: 0, col: 2, sourceRow: 0, sourceCol: 1, tileId: 102, orientation: 0, height: 0 }
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
    expect(tileList.value.map((tile) => tile.typeId)).toEqual([0, 70, 71]);
    expect(tileList.value[0]?.fields.some((field) => field.label === "Unknown")).toBe(false);
    expect(tileList.value[1]?.fields).toContainEqual({ label: "Unknown", type: "int", value: 700 });
    expect(tileList.value[2]?.fields).toContainEqual({ label: "Unknown", type: "int", value: 701 });
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
        { label: "Width", type: "dword", value: 2 },
        { label: "Height", type: "dword", value: 2 },
        { label: "Tileset", type: "resref", value: "newset" }
      ])
    );
    const tileList = document?.fields.find((field) => field.label === "Tile_List");
    expect(tileList).toMatchObject({ type: "list" });
    if (!tileList || tileList.type !== "list") return;
    expect(tileList.value).toHaveLength(4);
    expect(tileList.value[0]?.fields).toEqual(
      expect.arrayContaining([
        { label: "Tile_ID", type: "dword", value: 21 },
        { label: "Tile_Height", type: "dword", value: 1 }
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
