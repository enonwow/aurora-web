import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseModuleFactionCatalog } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-faction-catalog";
import { buildGffBuffer, type SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  isExactModuleFactionCatalog,
  MAX_MODULE_FACTION_CATALOG_BYTES,
} from "../../src/modules/catalog/domain/module-faction-catalog";

function factionFields(): SupportedGffField[] {
  return [
    {
      label: "FactionList",
      type: "list",
      value: [
        {
          typeId: 0,
          fields: [
            { label: "FactionName", type: "cexostring", value: "PC" },
            { label: "FactionParentID", type: "dword", value: 0xffffffff },
            { label: "FactionGlobal", type: "word", value: 1 },
          ],
        },
        {
          typeId: 1,
          fields: [
            { label: "FactionName", type: "cexostring", value: "Hostile" },
            { label: "FactionParentID", type: "dword", value: 0xffffffff },
            { label: "FactionGlobal", type: "word", value: 1 },
          ],
        },
      ],
    },
    {
      label: "RepList",
      type: "list",
      value: [
        {
          typeId: 0,
          fields: [
            { label: "FactionID1", type: "dword", value: 0 },
            { label: "FactionID2", type: "dword", value: 1 },
            { label: "FactionRep", type: "dword", value: 0 },
          ],
        },
        {
          typeId: 1,
          fields: [
            { label: "FactionID1", type: "dword", value: 1 },
            { label: "FactionID2", type: "dword", value: 0 },
            { label: "FactionRep", type: "dword", value: 0 },
          ],
        },
      ],
    },
  ];
}

function catalogBytes(fields: SupportedGffField[] = factionFields()): Buffer {
  return buildGffBuffer(fields, "FAC ", 0xffffffff);
}

describe("Aurora module faction catalog", () => {
  it("parses physical faction ordinals and binds the exact module resource digest", () => {
    const bytes = catalogBytes();
    expect(parseModuleFactionCatalog({
      bytes,
      sourceObjectKey: "modules/current/repute.fac",
    })).toEqual({
      descriptor: {
        resourceName: "repute.fac",
        sourceObjectKey: "modules/current/repute.fac",
        sha256: createHash("sha256").update(bytes).digest("hex"),
        sizeBytes: bytes.length,
        factionCount: 2,
      },
      rows: [
        { factionId: 0, name: "PC", parentFactionId: 0xffffffff, isGlobal: true },
        { factionId: 1, name: "Hostile", parentFactionId: 0xffffffff, isGlobal: true },
      ],
    });
  });

  it("parses the immutable five-faction Toolset-produced repute.fac corpus", () => {
    const bytes = readFileSync(resolve(
      process.cwd(),
      "../output/proof/tile-path-connect-native-2026-08-19/runtime-harness/crashed-temp0-2026-08-19T0106/repute.fac",
    ));
    expect(bytes).toHaveLength(1889);
    expect(createHash("sha256").update(bytes).digest("hex"))
      .toBe("9da73c70d0ca712fd6d324a66ac50c1d08c1ef207747554a45b35df083cf0510");
    expect(parseModuleFactionCatalog({
      bytes,
      sourceObjectKey: "modules/current/repute.fac",
    })).toEqual({
      descriptor: {
        resourceName: "repute.fac",
        sourceObjectKey: "modules/current/repute.fac",
        sha256: "9da73c70d0ca712fd6d324a66ac50c1d08c1ef207747554a45b35df083cf0510",
        sizeBytes: 1889,
        factionCount: 5,
      },
      rows: [
        { factionId: 0, name: "PC", parentFactionId: 0xffff_ffff, isGlobal: true },
        { factionId: 1, name: "Hostile", parentFactionId: 0xffff_ffff, isGlobal: true },
        { factionId: 2, name: "Commoner", parentFactionId: 0xffff_ffff, isGlobal: true },
        { factionId: 3, name: "Merchant", parentFactionId: 0xffff_ffff, isGlobal: true },
        { factionId: 4, name: "Defender", parentFactionId: 0xffff_ffff, isGlobal: true },
      ],
    });
  });

  it.each([
    ["wrong file type", buildGffBuffer(factionFields(), "GIT ", 0xffffffff)],
    ["wrong root", buildGffBuffer(factionFields(), "FAC ", 0)],
    ["missing RepList", catalogBytes(factionFields().slice(0, 1))],
    ["extra root field", catalogBytes([...factionFields(), { label: "Extra", type: "byte", value: 1 }])],
    ["wrong physical type ID", catalogBytes((() => {
      const fields = structuredClone(factionFields());
      (fields[0] as Extract<SupportedGffField, { type: "list" }>).value[1]!.typeId = 2;
      return fields;
    })())],
    ["broken parent", catalogBytes((() => {
      const fields = structuredClone(factionFields());
      ((fields[0] as Extract<SupportedGffField, { type: "list" }>).value[1]!.fields[1] as any).value = 8;
      return fields;
    })())],
    ["duplicate directed reputation", catalogBytes((() => {
      const fields = structuredClone(factionFields());
      const list = fields[1] as Extract<SupportedGffField, { type: "list" }>;
      list.value[1]!.fields = structuredClone(list.value[0]!.fields);
      return fields;
    })())],
    ["out of range reputation", catalogBytes((() => {
      const fields = structuredClone(factionFields());
      ((fields[1] as Extract<SupportedGffField, { type: "list" }>).value[0]!.fields[2] as any).value = 101;
      return fields;
    })())],
  ])("rejects %s", (_label, bytes) => {
    expect(parseModuleFactionCatalog({ bytes, sourceObjectKey: "modules/current/repute.fac" }))
      .toBeNull();
  });

  it("enforces input budgets and validates the exact boundary DTO", () => {
    expect(parseModuleFactionCatalog({
      bytes: Buffer.alloc(MAX_MODULE_FACTION_CATALOG_BYTES + 1),
      sourceObjectKey: "modules/current/repute.fac",
    })).toBeNull();
    const value = parseModuleFactionCatalog({
      bytes: catalogBytes(),
      sourceObjectKey: "modules/current/repute.fac",
    });
    expect(isExactModuleFactionCatalog(value)).toBe(true);
    expect(isExactModuleFactionCatalog({ ...value, extra: true })).toBe(false);
    expect(isExactModuleFactionCatalog(null)).toBe(false);
  });
});
