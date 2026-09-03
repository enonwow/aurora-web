import {
  AREA_EVENT_SCRIPT_CATALOG_MAX_ADMITTED_RESREFS,
  AREA_EVENT_SCRIPT_CATALOG_MAX_INSPECTED_DESCRIPTORS,
  buildAreaEventScriptCatalog,
  type AreaEventScriptCatalogInputDescriptor,
} from "../../src/modules/areas/domain/area-event-script-catalog";

const HASH = "a".repeat(64);

function descriptor(
  logicalKey: string,
  resourceType: number,
  size = 10,
): AreaEventScriptCatalogInputDescriptor {
  return { logicalKey, resourceType, size, sha256: HASH };
}

describe("buildAreaEventScriptCatalog", () => {
  it("projects exact NSS/NCS presence, unverified pair freshness, and ASCII order", () => {
    const catalog = buildAreaEventScriptCatalog([
      descriptor("z_exit.ncs", 2010, 30),
      descriptor("a_enter.nss", 2009, 11),
      descriptor("paired.ncs", 2010, 22),
      descriptor("paired.nss", 2009, 21),
      descriptor("unrelated.are", 2012, 99),
    ]);

    expect(catalog).toEqual({
      items: [
        {
          resRef: "a_enter",
          artifactStatus: "source_only",
          freshness: null,
          source: descriptor("a_enter.nss", 2009, 11),
        },
        {
          resRef: "paired",
          artifactStatus: "source_and_bytecode",
          freshness: "unverified",
          source: descriptor("paired.nss", 2009, 21),
          bytecode: descriptor("paired.ncs", 2010, 22),
        },
        {
          resRef: "z_exit",
          artifactStatus: "bytecode_only",
          freshness: null,
          bytecode: descriptor("z_exit.ncs", 2010, 30),
        },
      ],
      summary: {
        admittedCatalogCount: 3,
        sourceAndBytecode: 1,
        sourceOnly: 1,
        bytecodeOnly: 1,
        rejectedDescriptors: 0,
      },
      diagnostics: [
        "external_runtime_layers_not_resolved",
        "paired_freshness_unverified",
      ],
      inspectedDescriptorCount: 5,
    });
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog.items)).toBe(true);
    expect(Object.isFrozen(catalog.items[1].source)).toBe(true);
  });

  it("counts but never normalizes wrong case, nesting, type pairs, or duplicate slots", () => {
    const duplicate = descriptor("collision.nss", 2009);
    const catalog = buildAreaEventScriptCatalog([
      descriptor("Folder/nested.nss", 2009),
      descriptor("Upper.nss", 2009),
      descriptor("wrong.nss", 2010),
      descriptor("wrong.ncs", 2009),
      descriptor("wrong.txt", 2009),
      duplicate,
      { ...duplicate },
      descriptor("collision.ncs", 2010),
    ]);

    expect(catalog.items).toEqual([
      {
        resRef: "collision",
        artifactStatus: "bytecode_only",
        freshness: null,
        bytecode: descriptor("collision.ncs", 2010),
      },
    ]);
    expect(catalog.summary).toEqual({
      admittedCatalogCount: 1,
      sourceAndBytecode: 0,
      sourceOnly: 0,
      bytecodeOnly: 1,
      rejectedDescriptors: 7,
    });
    expect(catalog.diagnostics).toEqual([
      "external_runtime_layers_not_resolved",
      "rejected_committed_descriptors",
    ]);
  });

  it("fails the whole build instead of truncating descriptor or ResRef budgets", () => {
    const tooManyDescriptors = new Array(
      AREA_EVENT_SCRIPT_CATALOG_MAX_INSPECTED_DESCRIPTORS + 1,
    ) as AreaEventScriptCatalogInputDescriptor[];
    expect(() => buildAreaEventScriptCatalog(tooManyDescriptors)).toThrow(
      expect.objectContaining({
        name: "AreaEventScriptCatalogError",
        code: "AREA_EVENT_SCRIPT_CATALOG_DESCRIPTOR_BUDGET_EXCEEDED",
      }),
    );

    const tooManyResRefs = Array.from(
      { length: AREA_EVENT_SCRIPT_CATALOG_MAX_ADMITTED_RESREFS + 1 },
      (_value, index) => descriptor(`s${index.toString().padStart(5, "0")}.nss`, 2009),
    );
    expect(() => buildAreaEventScriptCatalog(tooManyResRefs)).toThrow(
      expect.objectContaining({
        name: "AreaEventScriptCatalogError",
        code: "AREA_EVENT_SCRIPT_CATALOG_RESREF_BUDGET_EXCEEDED",
      }),
    );
  });
});
