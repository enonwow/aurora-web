import { vi } from "vitest";
import {
  loadExistingCreaturePhenotypeCatalog,
  materializeExistingCreaturePhenotype,
  readExistingCreaturePhenotypeProvenance,
} from "../../../../../src/modules/layout/application/creaturePhenotypeProvenance";

describe("Creature Phenotype provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creaturePhenotype: {
      present: true as const,
      nativeType: "int" as const,
      value: 0,
      table: {
        resourceName: "phenotype.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/phenotype.2da",
        sourceLayer: "vanilla" as const,
        sha256: "a".repeat(64),
        sizeBytes: 337,
        rowCount: 9,
        rowIndex: 0,
      },
    },
    creatureAppearance: {
      present: true as const,
      nativeType: "word" as const,
      value: 6,
      table: {
        resourceName: "appearance.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
        sourceLayer: "vanilla" as const,
        sha256: "b".repeat(64),
        sizeBytes: 1000,
        rowCount: 100,
        rowIndex: 6,
      },
    },
  };

  it("loads rows with both immutable table identities and appearance gate", async () => {
    const listRows = vi.fn(async () => ({
      resourceName: "phenotype.2da" as const,
      sha256: "a".repeat(64),
      rowCount: 9,
      items: [
        { rowIndex: 0, displayName: "Normal", displaySource: "strref" as const, nameStrRef: 2223 },
        { rowIndex: 2, displayName: "Large", displaySource: "strref" as const, nameStrRef: 2225 },
      ],
      total: 2,
      limit: 256,
      offset: 0,
    }));
    const catalog = await loadExistingCreaturePhenotypeCatalog(
      { queries: { listRows } },
      "token",
      source,
      "",
      2,
    );
    expect(listRows).toHaveBeenCalledWith("token", expect.objectContaining({
      tableSha256: "a".repeat(64),
      appearanceTableSha256: "b".repeat(64),
      appearanceRowCount: 100,
      appearanceType: 6,
    }));
    expect(materializeExistingCreaturePhenotype(source, 0, 2, catalog)).toBe(2);
  });

  it("fails provenance when either table binding is absent", () => {
    expect(readExistingCreaturePhenotypeProvenance({
      ...source,
      creatureAppearance: { present: true, nativeType: "word", value: 6 },
    })).toBeNull();
    expect(readExistingCreaturePhenotypeProvenance({
      ...source,
      creaturePhenotype: { present: true, nativeType: "int", value: 0 },
    })).toBeNull();
  });

  it("never materializes native-normalized row 1", () => {
    const provenance = readExistingCreaturePhenotypeProvenance(source)!;
    const catalog = {
      tableSha256: provenance.tableSha256,
      rowCount: provenance.rowCount,
      appearanceTableSha256: provenance.appearanceTableSha256,
      appearanceRowCount: provenance.appearanceRowCount,
      appearanceType: provenance.appearanceType,
      query: "",
      items: [{
        rowIndex: 0,
        displayName: "Normal",
        displaySource: "strref" as const,
        nameStrRef: 2223,
      }],
    };
    expect(materializeExistingCreaturePhenotype(source, 0, 1, catalog)).toBe(0);
  });
});
