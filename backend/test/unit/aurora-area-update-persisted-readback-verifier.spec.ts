import { AuroraAreaUpdatePersistedReadbackVerifier } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-update-persisted-readback-verifier";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

describe("AuroraAreaUpdatePersistedReadbackVerifier", () => {
  it("accepts an exact existing ARE plus non-empty valid GIT/GIC companions and IFO membership", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();

    expect(verifier.version).toBe("aurora-area-update-persisted-readback.v1");
    await expect(verifier.verify(resourceSet())).resolves.toEqual({
      valid: true,
      diagnostics: [],
    });
  });

  it("rejects a wrong ARE identity, malformed companion, duplicate resource, and absent IFO membership", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const wrongAre = areaBytes("other");
    const result = await verifier.verify({
      ...valid,
      resources: [
        { ...valid.resources[0], bytes: wrongAre },
        { ...valid.resources[1], bytes: Buffer.from("bad-git") },
        valid.resources[2],
        valid.resources[2],
      ],
      moduleIfo: { ...valid.moduleIfo, bytes: moduleIfo("other") },
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      "AREA_UPDATE_READBACK_RESOURCE_DUPLICATE:gic",
      "AREA_UPDATE_READBACK_ARE_IDENTITY_MISMATCH",
      "AREA_UPDATE_READBACK_GIT_INVALID",
      "AREA_UPDATE_READBACK_IFO_MEMBERSHIP_MISSING",
    ]));
  });

  it("rejects an ARE whose Tile_List cardinality does not equal Width*Height", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const sparseAre = areaBytes("crypt01", 3);

    const result = await verifier.verify({
      ...valid,
      resources: [
        { ...valid.resources[0], bytes: sparseAre },
        valid.resources[1],
        valid.resources[2],
      ],
    });

    expect(result).toEqual({
      valid: false,
      diagnostics: ["AREA_UPDATE_READBACK_ARE_TOPOLOGY_INVALID"],
    });
  });

  it("rejects a persisted GIT/GIC family cardinality mismatch", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const mismatchedGic = areaObjectCompanion("GIC ", false);
    const result = await verifier.verify({
      ...valid,
      resources: [valid.resources[0], valid.resources[1], artifact("gic", 2046, mismatchedGic)],
    });

    expect(result).toEqual({
      valid: false,
      diagnostics: ["AREA_UPDATE_READBACK_GIT_GIC_PAIR_MISMATCH"],
    });
  });

  it("reports every missing Area resource independently", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();

    await expect(verifier.verify({ ...valid, resources: [] })).resolves.toEqual({
      valid: false,
      diagnostics: [
        "AREA_UPDATE_READBACK_ARE_MISSING",
        "AREA_UPDATE_READBACK_GIT_MISSING",
        "AREA_UPDATE_READBACK_GIC_MISSING",
      ],
    });
  });

  it.each([
    ["wrong file type", buildGffBuffer([], "GIT ", 0)],
    ["wrong GFF version", withVersion(areaBytes("crypt01"), "V9.9")],
    ["malformed bytes", Buffer.from("not-a-gff")],
  ])("rejects an invalid ARE: %s", async (_label, bytes) => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const result = await verifier.verify({
      ...valid,
      resources: [{ ...valid.resources[0], bytes }, valid.resources[1], valid.resources[2]],
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContain("AREA_UPDATE_READBACK_ARE_INVALID");
  });

  it.each([
    ["git", "GIC ", "AREA_UPDATE_READBACK_GIT_INVALID"],
    ["gic", "GIT ", "AREA_UPDATE_READBACK_GIC_INVALID"],
  ] as const)("rejects %s with the wrong companion file type", async (extension, fileType, code) => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const index = extension === "git" ? 1 : 2;
    const resources = [...valid.resources];
    resources[index] = {
      ...resources[index],
      bytes: buildGffBuffer([], fileType, 0),
    } as typeof resources[number];

    const result = await verifier.verify({ ...valid, resources });
    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContain(code);
  });

  it.each([
    ["missing", null],
    ["wrong label", { label: "Other", type: "resref", value: "crypt01" }],
    ["wrong type", { label: "ResRef", type: "int", value: 7 }],
  ] as const)("rejects an ARE with %s identity", async (_label, identity) => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const bytes = areaBytes("crypt01", 4, identity as SupportedGffField | null);
    const result = await verifier.verify({
      ...valid,
      resources: [{ ...valid.resources[0], bytes }, valid.resources[1], valid.resources[2]],
    });

    expect(result.valid).toBe(false);
    expect(result.diagnostics).toContain("AREA_UPDATE_READBACK_ARE_IDENTITY_MISMATCH");
  });

  it("accepts the documented CExoString alternative for ARE ResRef identity", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const bytes = areaBytes("crypt01", 4, {
      label: "ResRef",
      type: "cexostring",
      value: "CRYPT01",
    });

    await expect(verifier.verify({
      ...valid,
      resources: [{ ...valid.resources[0], bytes }, valid.resources[1], valid.resources[2]],
    })).resolves.toEqual({ valid: true, diagnostics: [] });
  });

  it("independently verifies the complete typed ordered persisted Area VarTable", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const expectedAreaVariables = [
      { name: "TEXT", type: "string" as const, value: "updated" },
      { name: "COUNT", type: "int" as const, value: 7 },
    ];
    const git = areaObjectCompanion("GIT ", true, expectedAreaVariables);

    await expect(verifier.verify({
      ...valid,
      expectedAreaVariables,
      resources: [valid.resources[0], artifact("git", 2023, git), valid.resources[2]],
    })).resolves.toEqual({ valid: true, diagnostics: [] });
  });

  it("rejects persisted GIT bytes whose VarTable differs from the expected target", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();

    const result = await verifier.verify({
      ...valid,
      expectedAreaVariables: [
        { name: "COUNT", type: "int", value: 7 },
      ],
    });

    expect(result).toEqual({
      valid: false,
      diagnostics: ["AREA_UPDATE_READBACK_VARIABLE_TABLE_MISMATCH"],
    });
  });

  it("independently verifies persisted multi-entry Area Name profile and Tag targets", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const are = areaBytes("crypt01", 4, undefined, [
      { label: "Name", type: "cexolocstring", value: {
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 2, text: "Other" },
          { languageId: 0, text: "New Name" },
        ],
      } },
    ]);
    await expect(verifier.verify({
      ...valid,
      expectedAreaBasicIdentity: {
        name: "New Name",
        nameProfile: "multi_entry_inline_ascii",
        nameEntries: [
          { languageId: 2, text: "Other" },
          { languageId: 0, text: "New Name" },
        ],
        tag: "crypt01",
      },
      resources: [{ ...valid.resources[0], bytes: are }, valid.resources[1], valid.resources[2]],
    })).resolves.toEqual({ valid: true, diagnostics: [] });
  });

  it("independently verifies a persisted simple target after alternate Name removal", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const are = areaBytes("crypt01", 4, undefined, [
      { label: "Name", type: "cexolocstring", value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "New Name" }],
      } },
    ]);
    await expect(verifier.verify({
      ...valid,
      expectedAreaBasicIdentity: {
        name: "New Name",
        nameProfile: "simple_inline_ascii",
        nameEntries: [{ languageId: 0, text: "New Name" }],
      },
      resources: [{ ...valid.resources[0], bytes: are }, valid.resources[1], valid.resources[2]],
    })).resolves.toEqual({ valid: true, diagnostics: [] });
  });

  it("independently verifies the exact persisted target after bounded Area Name Add/Reinsert", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const nameEntries = [
      { languageId: 11, text: "Krypta" },
      { languageId: 0, text: "New Name" },
    ];
    const are = areaBytes("crypt01", 4, undefined, [
      { label: "Name", type: "cexolocstring", value: {
        strRef: 0xffff_ffff,
        entries: nameEntries,
      } },
    ]);
    await expect(verifier.verify({
      ...valid,
      expectedAreaBasicIdentity: {
        name: "New Name",
        nameProfile: "multi_entry_inline_ascii",
        nameEntries,
      },
      resources: [{ ...valid.resources[0], bytes: are }, valid.resources[1], valid.resources[2]],
    })).resolves.toEqual({ valid: true, diagnostics: [] });
  });

  it("rejects persisted Area Name order drift against the complete target list", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const are = areaBytes("crypt01", 4, undefined, [
      { label: "Name", type: "cexolocstring", value: {
        strRef: 0xffff_ffff,
        entries: [
          { languageId: 0, text: "New Name" },
          { languageId: 2, text: "Expected sibling" },
        ],
      } },
    ]);
    await expect(verifier.verify({
      ...valid,
      expectedAreaBasicIdentity: {
        name: "New Name",
        nameProfile: "multi_entry_inline_ascii",
        nameEntries: [
          { languageId: 2, text: "Expected sibling" },
          { languageId: 0, text: "New Name" },
        ],
      },
      resources: [{ ...valid.resources[0], bytes: are }, valid.resources[1], valid.resources[2]],
    })).resolves.toEqual({
      valid: false,
      diagnostics: ["AREA_UPDATE_READBACK_BASIC_IDENTITY_MISMATCH"],
    });
  });

  it("rejects persisted Area Name profile drift", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const are = areaBytes("crypt01", 4, undefined, [
      { label: "Name", type: "cexolocstring", value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: "New Name" }],
      } },
    ]);
    const result = await verifier.verify({
      ...valid,
      expectedAreaBasicIdentity: {
        name: "New Name",
        nameProfile: "multi_entry_inline_ascii",
      },
      resources: [{ ...valid.resources[0], bytes: are }, valid.resources[1], valid.resources[2]],
    });
    expect(result).toEqual({
      valid: false,
      diagnostics: ["AREA_UPDATE_READBACK_BASIC_IDENTITY_MISMATCH"],
    });
  });

  it("independently verifies the persisted visual-environment scalar-controls pair", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const exactAre = areaBytes("crypt01", 4, undefined, [
      { label: "FogClipDist", type: "float", value: 120 },
      { label: "WindPower", type: "int", value: 2 },
    ]);
    await expect(verifier.verify({
      ...valid,
      expectedAreaVisualEnvironmentScalarControls: {
        fogClipDistance: 120,
        windPower: 2,
      },
      resources: [{ ...valid.resources[0], bytes: exactAre }, valid.resources[1], valid.resources[2]],
    })).resolves.toEqual({ valid: true, diagnostics: [] });

    const driftedAre = areaBytes("crypt01", 4, undefined, [
      { label: "FogClipDist", type: "float", value: 121 },
      { label: "WindPower", type: "int", value: 2 },
    ]);
    await expect(verifier.verify({
      ...valid,
      expectedAreaVisualEnvironmentScalarControls: {
        fogClipDistance: 120,
        windPower: 2,
      },
      resources: [{ ...valid.resources[0], bytes: driftedAre }, valid.resources[1], valid.resources[2]],
    })).resolves.toEqual({
      valid: false,
      diagnostics: ["AREA_UPDATE_READBACK_VISUAL_ENVIRONMENT_SCALAR_CONTROLS_MISMATCH"],
    });
  });

  it("independently verifies the persisted catalog selection pair", async () => {
    const verifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const valid = resourceSet();
    const exactAre = areaBytes("crypt01", 4, undefined, [
      { label: "LightingScheme", type: "byte", value: 1 },
      { label: "SkyBox", type: "byte", value: 2 },
    ]);
    await expect(verifier.verify({
      ...valid,
      expectedAreaVisualEnvironmentCatalogSelection: {
        lightingSchemeRowIndex: 1,
        skyBoxRowIndex: 2,
      },
      resources: [
        { ...valid.resources[0], bytes: exactAre },
        valid.resources[1],
        valid.resources[2],
      ],
    })).resolves.toEqual({ valid: true, diagnostics: [] });

    const driftedAre = areaBytes("crypt01", 4, undefined, [
      { label: "LightingScheme", type: "byte", value: 1 },
      { label: "SkyBox", type: "byte", value: 3 },
    ]);
    await expect(verifier.verify({
      ...valid,
      expectedAreaVisualEnvironmentCatalogSelection: {
        lightingSchemeRowIndex: 1,
        skyBoxRowIndex: 2,
      },
      resources: [
        { ...valid.resources[0], bytes: driftedAre },
        valid.resources[1],
        valid.resources[2],
      ],
    })).resolves.toEqual({
      valid: false,
      diagnostics: [
        "AREA_UPDATE_READBACK_VISUAL_ENVIRONMENT_CATALOG_SELECTION_MISMATCH",
      ],
    });
  });

});

function resourceSet() {
  const are = areaBytes("crypt01");
  const git = areaObjectCompanion("GIT ", true);
  const gic = areaObjectCompanion("GIC ", true);
  return {
    areaId: "crypt01",
    resources: [
      artifact("are", 2012, are),
      artifact("git", 2023, git),
      artifact("gic", 2046, gic),
    ],
    moduleIfo: {
      key: "module.ifo",
      size: moduleIfo("crypt01").length,
      sha256: "9".repeat(64),
      bytes: moduleIfo("crypt01"),
    },
  } as const;
}

function areaObjectCompanion(
  fileType: "GIT " | "GIC ",
  includeCreature: boolean,
  variables?: readonly Readonly<{
    name: string;
    type: "int" | "float" | "string";
    value: number | string;
  }>[],
): Buffer {
  const profiles = [
    ["Creature List", 4], ["Door List", 8], ["Encounter List", 7],
    ["List", 0], ["Placeable List", 9], ["SoundList", 6],
    ["StoreList", 11], ["TriggerList", 1], ["WaypointList", 5],
  ] as const;
  return buildGffBuffer([
    ...(fileType === "GIT " && variables ? [{
      label: "VarTable",
      type: "list" as const,
      value: variables.map((entry) => ({
        typeId: 0,
        fields: [
          { label: "Name", type: "cexostring" as const, value: entry.name },
          { label: "Type", type: "dword" as const, value: entry.type === "int" ? 1 : entry.type === "float" ? 2 : 3 },
          entry.type === "int"
            ? { label: "Value", type: "int" as const, value: entry.value as number }
            : entry.type === "float"
              ? { label: "Value", type: "float" as const, value: entry.value as number }
              : { label: "Value", type: "cexostring" as const, value: entry.value as string },
        ],
      })),
    }] : []),
    ...profiles.map(([label, typeId]) => ({
      label,
      type: "list" as const,
      value: label === "Creature List" && includeCreature
        ? [{ typeId, fields: [] }]
        : [],
    })),
  ], fileType, 0);
}

function areaBytes(
  areaResRef: string,
  tileCount = 4,
  identity: SupportedGffField | null | undefined = {
    label: "ResRef",
    type: "resref",
    value: areaResRef,
  },
  additionalFields: readonly SupportedGffField[] = [],
): Buffer {
  const resolvedIdentity = identity === undefined
    ? { label: "ResRef", type: "resref" as const, value: areaResRef }
    : identity;
  return buildGffBuffer([
    ...(resolvedIdentity ? [resolvedIdentity] : []),
    ...additionalFields,
    { label: "Tag", type: "cexostring", value: areaResRef },
    { label: "Width", type: "int", value: 2 },
    { label: "Height", type: "int", value: 2 },
    { label: "Tileset", type: "resref", value: "tin01" },
    {
      label: "Tile_List",
      type: "list",
      value: Array.from({ length: tileCount }, () => ({
        typeId: 1,
        fields: [
          { label: "Tile_ID", type: "int" as const, value: 12 },
          { label: "Tile_Orientation", type: "int" as const, value: 0 },
          { label: "Tile_Height", type: "int" as const, value: 0 },
        ],
      })),
    },
  ], "ARE ", 0);
}

function moduleIfo(areaResRef: string): Buffer {
  return buildGffBuffer([
    {
      label: "Mod_Area_list",
      type: "list",
      value: [{
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref", value: areaResRef }],
      }],
    },
  ], "IFO ", 0);
}

function artifact(extension: "are" | "git" | "gic", resourceType: number, bytes: Buffer) {
  return {
    extension,
    key: `crypt01.${extension}`,
    fileName: `crypt01.${extension}`,
    resourceType,
    size: bytes.length,
    sha256: extension.repeat(64).slice(0, 64),
    bytes,
  } as const;
}

function withVersion(bytes: Buffer, version: string): Buffer {
  const changed = Buffer.from(bytes);
  changed.write(version, 4, 4, "ascii");
  return changed;
}
