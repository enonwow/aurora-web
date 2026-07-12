import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

describe("Aurora GFF writer CExoLocString preservation", () => {
  it("preserves explicit empty localized entries instead of collapsing them to no entries", () => {
    const parsed = parseRawGffDocument(
      buildGffBuffer(
        [
          {
            label: "Mod_Description",
            type: "cexolocstring",
            value: {
              strRef: 0xffffffff,
              entries: [
                { languageId: 10, text: "" },
                { languageId: 0, text: "Visible" }
              ]
            }
          }
        ],
        "IFO ",
        0xffffffff
      )
    );

    expect(parsed?.fields).toEqual([
      {
        label: "Mod_Description",
        type: "cexolocstring",
        value: {
          strRef: 0xffffffff,
          entries: [
            { languageId: 10, text: "" },
            { languageId: 0, text: "Visible" }
          ]
        }
      }
    ]);
  });
});
