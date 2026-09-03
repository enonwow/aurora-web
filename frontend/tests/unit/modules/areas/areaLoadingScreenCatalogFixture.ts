import type { EffectiveAreaLoadingScreenCatalog } from "../../../../src/modules/areas/domain/effectiveAreaLoadingScreenCatalog";

export function effectiveAreaLoadingScreenCatalog(): EffectiveAreaLoadingScreenCatalog {
  return {
    schemaVersion: "area-loading-screen-catalog.v1",
    descriptor: {
      resourceName: "loadscreens.2da",
      sourceObjectKey: "modules/current/loadscreens.2da",
      sourceLayer: "module",
      sha256: "a".repeat(64),
      sizeBytes: 512,
      rowCount: 4,
    },
    rows: [
      {
        rowIndex: 0,
        sourceRowId: 17,
        imageResRef: "ls_default",
        displayName: "Default",
        displaySource: "area_default_strref",
        toolsetSelectable: true,
        imageAsset: imageAsset("ls_default", "b"),
      },
      {
        rowIndex: 1,
        sourceRowId: 42,
        label: "City",
        imageResRef: "ls_city",
        tileSetResRef: "tno01",
        strRef: 123,
        displayName: "City gates",
        displaySource: "strref",
        toolsetSelectable: true,
        imageAsset: imageAsset("ls_city", "c"),
      },
      {
        rowIndex: 2,
        sourceRowId: 99,
        label: "MissingImage",
        imageResRef: "ls_missing",
        displayName: "Missing image",
        displaySource: "label",
        toolsetSelectable: false,
      },
      {
        rowIndex: 3,
        sourceRowId: 100,
        displayName: "Row 3",
        displaySource: "row_index",
        toolsetSelectable: false,
      },
    ],
  };
}

function imageAsset(resRef: string, hashCharacter: string) {
  return {
    resourceName: `${resRef}.tga`,
    sourceObjectKey: `modules/current/${resRef}.tga`,
    sourceLayer: "module" as const,
    sha256: hashCharacter.repeat(64),
    sizeBytes: 2048,
  };
}
