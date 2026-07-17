import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  parseAuroraItpPalette,
  type ParsedAuroraItpPaletteNode
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-itp-palette-parser";
import { serializeItemPaletteToItpGff } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-itp-palette-writer";

const RETAIL_ITP_DIR = "C:\\Projects\\New Folder\\item-retail-extract\\itp";
const itempalstdPath = join(RETAIL_ITP_DIR, "itempalstd.itp");
const itempalPath = join(RETAIL_ITP_DIR, "itempal.itp");

const describeIfRetailItpExists =
  existsSync(itempalstdPath) && existsSync(itempalPath) ? describe : describe.skip;

function findPaletteNodeByResRef(
  nodes: ParsedAuroraItpPaletteNode[],
  resRef: string
): ParsedAuroraItpPaletteNode | null {
  for (const node of nodes) {
    if (node.resRef === resRef) {
      return node;
    }
    const child = findPaletteNodeByResRef(node.children, resRef);
    if (child) {
      return child;
    }
  }
  return null;
}

describeIfRetailItpExists("parseAuroraItpPalette", () => {
  it("walks Aurora itempalstd.itp folders and item blueprint leaves", () => {
    const parsed = parseAuroraItpPalette(readFileSync(itempalstdPath));

    expect(parsed).not.toBeNull();
    expect(parsed).toMatchObject({
      sourceFileType: "ITP ",
      sourceFileVersion: "V3.2",
      rootCount: 6,
      leafCount: 2754,
      folderCount: 72,
      categoryLeafCount: 0,
      maxDepth: 4
    });
    expect(parsed?.roots[0]).toMatchObject({
      kind: "folder",
      strRef: 335
    });

    const cloth = findPaletteNodeByResRef(parsed?.roots ?? [], "nw_cloth027");
    expect(cloth).toMatchObject({
      kind: "leaf",
      label: "nw_cloth027",
      strRef: 12928,
      leafCount: 1,
      folderCount: 0
    });
  });

  it("preserves itempal.itp category-only custom palette branches", () => {
    const parsed = parseAuroraItpPalette(readFileSync(itempalPath));

    expect(parsed).toMatchObject({
      sourceFileType: "ITP ",
      sourceFileVersion: "V3.2",
      rootCount: 8,
      leafCount: 0,
      folderCount: 14,
      categoryLeafCount: 65,
      maxDepth: 3
    });
  });
});

describe("serializeItemPaletteToItpGff", () => {
  it("round-trips Aurora custom palette folders, leaves, and empty categories", () => {
    const bytes = serializeItemPaletteToItpGff({
      roots: [
        {
          label: "Custom Weapons",
          strRef: 123,
          id: 10,
          children: [
            {
              label: "Bronze Dagger",
              strRef: 124,
              id: 11,
              resRef: "cnr_b_dagger"
            },
            {
              label: "Empty Custom Category",
              id: 12
            }
          ]
        }
      ]
    });

    const parsed = parseAuroraItpPalette(bytes);

    expect(parsed).toMatchObject({
      sourceFileType: "ITP ",
      sourceFileVersion: "V3.2",
      rootCount: 1,
      leafCount: 1,
      folderCount: 1,
      categoryLeafCount: 1,
      maxDepth: 2
    });
    expect(parsed?.roots[0]).toMatchObject({
      kind: "folder",
      label: "Custom Weapons",
      strRef: 123,
      id: 10
    });
    expect(parsed?.roots[0]?.children[0]).toMatchObject({
      kind: "leaf",
      label: "Bronze Dagger",
      strRef: 124,
      id: 11,
      resRef: "cnr_b_dagger"
    });
    expect(parsed?.roots[0]?.children[1]).toMatchObject({
      kind: "category",
      label: "Empty Custom Category",
      id: 12
    });
  });
});
