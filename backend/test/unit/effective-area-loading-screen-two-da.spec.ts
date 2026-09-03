import {
  AREA_LOADING_SCREEN_DEFAULT_STRREF,
  MAX_EFFECTIVE_AREA_LOADING_SCREEN_CATALOG_BYTES,
  buildEffectiveAreaLoadingScreenCatalog,
  isExactEffectiveAreaLoadingScreenCatalog,
  parseEffectiveAreaLoadingScreenTwoDa,
  type EffectiveAreaLoadingScreenImageAsset,
} from "../../src/modules/catalog/domain/effective-area-loading-screen-two-da";

describe("effective Area loading-screen 2DA catalog", () => {
  const moduleImage: EffectiveAreaLoadingScreenImageAsset = Object.freeze({
    resourceName: "ls_city_01.tga",
    sourceObjectKey: "module/ls_city_01.tga",
    sourceLayer: "module",
    sha256: "b".repeat(64),
    sizeBytes: 128,
  });

  it("uses the native physical row ordinal while retaining the source row token", () => {
    const table = parseEffectiveAreaLoadingScreenTwoDa({
      bytes: twoDa(
        "Label ScriptingName BMPResRef TileSet StrRef",
        [
          "10 First AREA_TRANSITION_FIRST LS_CITY_01 TCN01 100",
          "77 Second **** LS_CITY_02 **** ****",
        ],
      ),
      sourceObjectKey: "module/loadscreens.2da",
      sourceLayer: "module",
    });

    expect(table).toMatchObject({
      descriptor: {
        resourceName: "loadscreens.2da",
        sourceObjectKey: "module/loadscreens.2da",
        sourceLayer: "module",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        sizeBytes: expect.any(Number),
        rowCount: 2,
      },
      rows: [
        {
          rowIndex: 0,
          sourceRowId: 10,
          label: "First",
          imageResRef: "LS_CITY_01",
          tileSetResRef: "TCN01",
          strRef: 100,
        },
        {
          rowIndex: 1,
          sourceRowId: 77,
          label: "Second",
          imageResRef: "LS_CITY_02",
        },
      ],
    });
  });

  it("resolves Area row zero through the dedicated TLK entry and other rows by StrRef then Label", () => {
    const table = parseEffectiveAreaLoadingScreenTwoDa({
      bytes: twoDa("Label BMPResRef TileSet StrRef", [
        "0 Random **** **** 63402",
        "1 FromStrRef LS_CITY_01 TCN01 68545",
        "2 FromLabel LS_CITY_02 TCN01 ****",
        "3 **** LS_CITY_03 **** ****",
      ]),
      sourceObjectKey: "module/loadscreens.2da",
      sourceLayer: "module",
    });
    const requestedStrRefs: number[] = [];
    const catalog = buildEffectiveAreaLoadingScreenCatalog(
      table!,
      (strRef) => {
        requestedStrRefs.push(strRef);
        if (strRef === AREA_LOADING_SCREEN_DEFAULT_STRREF) return "Default";
        if (strRef === 68545) return "City gates";
        return undefined;
      },
      (resRef) => resRef === "LS_CITY_01" ? moduleImage : undefined,
    );

    expect(requestedStrRefs).toEqual([AREA_LOADING_SCREEN_DEFAULT_STRREF, 68545]);
    expect(catalog.rows).toEqual([
      expect.objectContaining({
        rowIndex: 0,
        displayName: "Default",
        displaySource: "area_default_strref",
        toolsetSelectable: false,
      }),
      expect.objectContaining({
        rowIndex: 1,
        displayName: "City gates",
        displaySource: "strref",
        toolsetSelectable: true,
        imageAsset: moduleImage,
      }),
      expect.objectContaining({
        rowIndex: 2,
        displayName: "FromLabel",
        displaySource: "label",
        toolsetSelectable: false,
      }),
      expect.objectContaining({
        rowIndex: 3,
        displayName: "Row 3",
        displaySource: "row_index",
        toolsetSelectable: false,
      }),
    ]);
  });

  it("does not use table row zero Label or StrRef when the Area-default TLK text is unavailable", () => {
    const table = parseEffectiveAreaLoadingScreenTwoDa({
      bytes: twoDa("Label BMPResRef TileSet StrRef", ["99 Random **** **** 63402"]),
      sourceObjectKey: "module/loadscreens.2da",
      sourceLayer: "module",
    });
    const catalog = buildEffectiveAreaLoadingScreenCatalog(table!, () => "", () => undefined);

    expect(catalog.rows[0]).toMatchObject({
      rowIndex: 0,
      sourceRowId: 99,
      label: "Random",
      strRef: 63402,
      displayName: "Row 0",
      displaySource: "row_index",
    });
  });

  it.each([
    ["duplicate required column", "Label BMPResRef BMPResRef TileSet StrRef", ["0 A x x T 1"]],
    ["missing required column", "Label BMPResRef StrRef", ["0 A x 1"]],
    ["invalid image ResRef", "Label BMPResRef TileSet StrRef", ["0 A ../escape T 1"]],
    ["invalid tileset ResRef", "Label BMPResRef TileSet StrRef", ["0 A x too-long-tileset-name 1"]],
    ["invalid StrRef", "Label BMPResRef TileSet StrRef", ["0 A x T -1"]],
    ["invalid source row token", "Label BMPResRef TileSet StrRef", ["not-a-row A x T 1"]],
  ])("rejects %s", (_label, header, rows) => {
    expect(parseEffectiveAreaLoadingScreenTwoDa({
      bytes: twoDa(header, rows),
      sourceObjectKey: "module/loadscreens.2da",
      sourceLayer: "module",
    })).toBeNull();
  });

  it("validates one exact immutable catalog and its effective image provenance", () => {
    const table = parseEffectiveAreaLoadingScreenTwoDa({
      bytes: twoDa("Label BMPResRef TileSet StrRef", [
        "0 Random **** **** 63402",
        "1 City LS_CITY_01 TCN01 68545",
      ]),
      sourceObjectKey: "module/loadscreens.2da",
      sourceLayer: "module",
    });
    const catalog = buildEffectiveAreaLoadingScreenCatalog(
      table!,
      (strRef) => strRef === AREA_LOADING_SCREEN_DEFAULT_STRREF ? "Default" : "City gates",
      () => moduleImage,
    );

    expect(isExactEffectiveAreaLoadingScreenCatalog(catalog)).toBe(true);
    expect(isExactEffectiveAreaLoadingScreenCatalog({ ...catalog, extra: true })).toBe(false);
    expect(isExactEffectiveAreaLoadingScreenCatalog({
      ...catalog,
      rows: catalog.rows.map((row) => row.rowIndex === 1
        ? { ...row, imageAsset: { ...moduleImage, resourceName: "wrong.tga" } }
        : row),
    })).toBe(false);
    expect(isExactEffectiveAreaLoadingScreenCatalog({
      ...catalog,
      rows: catalog.rows.map((row) => row.rowIndex === 1
        ? { ...row, toolsetSelectable: false }
        : row),
    })).toBe(false);
  });

  it("rejects an otherwise exact catalog above the serialized response budget", () => {
    const rowCount = 1100;
    const catalog = {
      schemaVersion: "area-loading-screen-catalog.v1",
      descriptor: {
        resourceName: "loadscreens.2da",
        sourceObjectKey: "module/loadscreens.2da",
        sourceLayer: "module",
        sha256: "a".repeat(64),
        sizeBytes: 128,
        rowCount,
      },
      rows: Array.from({ length: rowCount }, (_, rowIndex) => ({
        rowIndex,
        sourceRowId: rowIndex,
        displayName: "A".repeat(1024),
        displaySource: "row_index",
        toolsetSelectable: false,
      })),
    };

    expect(Buffer.byteLength(JSON.stringify(catalog), "utf8")).toBeGreaterThan(
      MAX_EFFECTIVE_AREA_LOADING_SCREEN_CATALOG_BYTES,
    );
    expect(isExactEffectiveAreaLoadingScreenCatalog(catalog)).toBe(false);
  });
});

function twoDa(header: string, rows: readonly string[]): Buffer {
  return Buffer.from(["2DA V2.0", "", header, ...rows, ""].join("\n"), "utf8");
}
