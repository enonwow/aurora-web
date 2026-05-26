import { ModuleSnapshotTemplateCatalogRepository } from "../../src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository";
import type {
  ModuleBlobObjectPayload,
  ModuleBlobStoragePort
} from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";

describe("ModuleSnapshotTemplateCatalogRepository", () => {
  function createRuntimeSettingsRepository(): jest.Mocked<RuntimeSettingsRepositoryPort> {
    return {
      get: jest.fn().mockResolvedValue({
        revision: 1,
        updatedAt: "2026-05-25T00:00:00.000Z",
        updatedBy: "test",
        paths: {
          vanillaDataPath: "",
          hakDirectoryPath: "",
          moduleDecompiledPath: "",
          modulePackedPath: "",
          tlkBasePath: "",
          tlkCustomPath: ""
        },
        blobStorage: {
          endpoint: "http://seaweedfs:8333",
          region: "us-east-1",
          bucket: "aurora-module-assets",
          modulePrefix: "modules/current",
          accessKeyId: "seaweedfs",
          secretAccessKey: "secret",
          forcePathStyle: true
        },
        telemetryDebugMode: "off",
        hakProfiles: {},
        sources: {
          placeable: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          },
          tile: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          },
          area: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          },
          sound: {
            includeModuleTemp0: true,
            includeModulePacked: false,
            includeHaks: false,
            includeVanilla: false,
            hakProfileId: "",
            hakPriorityList: []
          }
        },
        benchmarkCandidates: {
          placeableHeavyNoVfx: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          placeableHeavyVfx: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          placeableVfxPlcAlternative: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          doorHeavyInstance: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          },
          doorHeavySingleMesh: {
            resref: "",
            metrics: { triangles: 0, meshes: 0, emitters: 0 },
            context: { source: "test" }
          }
        }
      }),
      save: jest.fn()
    };
  }

  function createModuleBlobStorage(
    etagSeed = "v1"
  ): jest.Mocked<ModuleBlobStoragePort> {
    const vfxBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_anchor_generic" },
      { label: "LocName", type: "cexolocstring", value: "Anchor Generic" },
      { label: "Tag", type: "cexostring", value: "vvx_anchor_fire" },
      { label: "ModelName", type: "resref", value: "fx_fire_anchor" },
      { label: "OnUsed", type: "resref", value: "script_anchor_use" }
    ]);

    const doorBytes = buildGffBuffer([
      { label: "TemplateResRef", type: "resref", value: "plc_city_gate" },
      { label: "LocName", type: "cexolocstring", value: "City Gate" },
      { label: "Tag", type: "cexostring", value: "city_gate_main" }
    ], "UTD ");

    const byKey = new Map<string, ModuleBlobObjectPayload>([
      [
        "modules/current/blueprints/placeables/plc_city_gate.utd",
        {
          key: "modules/current/blueprints/placeables/plc_city_gate.utd",
          size: doorBytes.length,
          contentType: "application/octet-stream",
          etag: `door-${etagSeed}`,
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: doorBytes
        }
      ],
      [
        "modules/current/blueprints/placeables/plc_anchor_generic.utp",
        {
          key: "modules/current/blueprints/placeables/plc_anchor_generic.utp",
          size: vfxBytes.length,
          contentType: "application/octet-stream",
          etag: `vfx-${etagSeed}`,
          lastModified: "2026-05-25T10:00:00.000Z",
          bytes: vfxBytes
        }
      ]
    ]);

    return {
      replaceModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(async (_settings, key) => byKey.get(key) ?? null),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: `hash-${etagSeed}`,
        totalFiles: 5,
        totalBytes: 1000,
        truncated: false,
        continuationToken: undefined,
        objects: [
          {
            key: "modules/current/blueprints/placeables/plc_city_gate.utd",
            size: 220,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: `p1-${etagSeed}`
          },
          {
            key: "modules/current/blueprints/placeables/plc_anchor_generic.utp",
            size: 200,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: `p2-${etagSeed}`
          },
          {
            key: "modules/current/blueprints/creatures/cre_guard.utc",
            size: 180,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "c1"
          },
          {
            key: "modules/current/blueprints/items/itm_scroll_fire.utI",
            size: 160,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "i1"
          },
          {
            key: "modules/current/readme.txt",
            size: 80,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "x1"
          }
        ]
      })
    };
  }

  it("lists templates by kind and query filters using snapshot data", async () => {
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage()
    );

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });
    const creatures = await repository.listByKind("creature", {
      limit: 20,
      offset: 0
    });
    const items = await repository.listByKind("item", {
      query: "scroll",
      limit: 20,
      offset: 0
    });

    expect(placeables.total).toBe(2);
    expect(creatures.total).toBe(1);
    expect(items.total).toBe(1);
    expect(placeables.items.some((item) => item.placeableSubtype === "door")).toBe(true);
    expect(placeables.items.some((item) => item.placeableSubtype === "vfx")).toBe(true);
  });

  it("resolves by id and resref and returns precomputed cache keys", async () => {
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage()
    );

    const placeables = await repository.listByKind("placeable", { limit: 20, offset: 0 });
    const first = placeables.items[0];

    await expect(
      repository.findByKindAndId("placeable", first.templateId)
    ).resolves.toMatchObject({
      templateId: first.templateId
    });
    await expect(repository.findByKindAndResref("item", "itm_scroll_fire")).resolves.toMatchObject({
      kind: "item"
    });

    expect(repository.getPrecomputedPlaceableCacheKey(first.templateId, "generic")).toEqual(
      expect.stringMatching(/^[a-f0-9]{64}$/u)
    );
    expect(repository.getPrecomputedTemplateCacheKey("creature", "cre_cre_guard")).toEqual(
      expect.stringMatching(/^[a-f0-9]{64}$/u)
    );
  });

  it("changes precomputed cache keys when source etag changes", async () => {
    const repositoryA = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("a")
    );
    const repositoryB = new ModuleSnapshotTemplateCatalogRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage("b")
    );

    await repositoryA.listByKind("placeable", { limit: 20, offset: 0 });
    await repositoryB.listByKind("placeable", { limit: 20, offset: 0 });

    const keyA = repositoryA.getPrecomputedPlaceableCacheKey("plc_plc_anchor_generic", "vfx");
    const keyB = repositoryB.getPrecomputedPlaceableCacheKey("plc_plc_anchor_generic", "vfx");

    expect(keyA).toBeDefined();
    expect(keyB).toBeDefined();
    expect(keyA).not.toBe(keyB);
  });

  it("falls back to static repository when snapshot has no template files", async () => {
    const runtimeSettings = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    moduleBlobStorage.listModuleSnapshot.mockResolvedValueOnce({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-v2",
      totalFiles: 1,
      totalBytes: 20,
      truncated: false,
      continuationToken: undefined,
      objects: [
        {
          key: "modules/current/readme.txt",
          size: 20,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "x2"
        }
      ]
    });
    const repository = new ModuleSnapshotTemplateCatalogRepository(runtimeSettings, moduleBlobStorage);

    const placeables = await repository.listByKind("placeable", {
      limit: 20,
      offset: 0
    });
    expect(placeables.total).toBeGreaterThan(0);
  });
});

type SupportedField =
  | { label: string; type: "byte"; value: number }
  | { label: string; type: "dword"; value: number }
  | { label: string; type: "cexostring"; value: string }
  | { label: string; type: "resref"; value: string }
  | { label: string; type: "cexolocstring"; value: string };

const FIELD_TYPE = {
  BYTE: 0,
  DWORD: 4,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12
} as const;

const HEADER_SIZE = 56;
const STRUCT_ENTRY_SIZE = 12;
const FIELD_ENTRY_SIZE = 12;
const LABEL_ENTRY_SIZE = 16;

function buildGffBuffer(fields: SupportedField[], fileType = "UTP "): Buffer {
  const uniqueLabels = [...new Set(fields.map((field) => field.label))];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];

  const pushFieldData = (chunk: Buffer): number => {
    const offset = fieldDataChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldDataChunks.push(chunk);
    return offset;
  };

  for (const field of fields) {
    const labelIndex = labelIndexByName.get(field.label);
    if (labelIndex === undefined) {
      throw new Error(`Unknown label index for ${field.label}`);
    }

    if (field.type === "byte") {
      fieldEntries.push({
        typeId: FIELD_TYPE.BYTE,
        labelIndex,
        dataOrOffset: field.value & 0xff
      });
      continue;
    }

    if (field.type === "dword") {
      fieldEntries.push({
        typeId: FIELD_TYPE.DWORD,
        labelIndex,
        dataOrOffset: field.value >>> 0
      });
      continue;
    }

    if (field.type === "cexostring") {
      const valueBytes = Buffer.from(field.value, "utf-8");
      const payload = Buffer.alloc(4 + valueBytes.length);
      payload.writeUInt32LE(valueBytes.length, 0);
      valueBytes.copy(payload, 4);
      fieldEntries.push({
        typeId: FIELD_TYPE.CEXOSTRING,
        labelIndex,
        dataOrOffset: pushFieldData(payload)
      });
      continue;
    }

    if (field.type === "resref") {
      const valueBytes = Buffer.from(field.value, "ascii");
      const payload = Buffer.alloc(1 + valueBytes.length);
      payload.writeUInt8(valueBytes.length, 0);
      valueBytes.copy(payload, 1);
      fieldEntries.push({
        typeId: FIELD_TYPE.RESREF,
        labelIndex,
        dataOrOffset: pushFieldData(payload)
      });
      continue;
    }

    const valueBytes = Buffer.from(field.value, "utf-8");
    const entryPayload = Buffer.alloc(8 + valueBytes.length);
    entryPayload.writeUInt32LE(0, 0);
    entryPayload.writeUInt32LE(valueBytes.length, 4);
    valueBytes.copy(entryPayload, 8);

    const locPayload = Buffer.alloc(12 + entryPayload.length);
    const totalSize = 8 + entryPayload.length;
    locPayload.writeUInt32LE(totalSize, 0);
    locPayload.writeUInt32LE(0, 4);
    locPayload.writeUInt32LE(1, 8);
    entryPayload.copy(locPayload, 12);

    fieldEntries.push({
      typeId: FIELD_TYPE.CEXOLOCSTRING,
      labelIndex,
      dataOrOffset: pushFieldData(locPayload)
    });
  }

  const fieldData = Buffer.concat(fieldDataChunks);

  const structTable = Buffer.alloc(STRUCT_ENTRY_SIZE);
  structTable.writeUInt32LE(1, 0);
  structTable.writeUInt32LE(fields.length <= 1 ? 0 : 0, 4);
  structTable.writeUInt32LE(fields.length, 8);

  const fieldTable = Buffer.alloc(fieldEntries.length * FIELD_ENTRY_SIZE);
  fieldEntries.forEach((entry, index) => {
    const offset = index * FIELD_ENTRY_SIZE;
    fieldTable.writeUInt32LE(entry.typeId, offset);
    fieldTable.writeUInt32LE(entry.labelIndex, offset + 4);
    fieldTable.writeUInt32LE(entry.dataOrOffset, offset + 8);
  });

  const labels = Buffer.alloc(uniqueLabels.length * LABEL_ENTRY_SIZE);
  uniqueLabels.forEach((label, index) => {
    const offset = index * LABEL_ENTRY_SIZE;
    const bytes = Buffer.from(label.slice(0, LABEL_ENTRY_SIZE), "ascii");
    bytes.copy(labels, offset);
  });

  const fieldIndices = Buffer.alloc(fields.length > 1 ? fields.length * 4 : 0);
  if (fields.length > 1) {
    for (let index = 0; index < fields.length; index += 1) {
      fieldIndices.writeUInt32LE(index, index * 4);
    }
  }

  const structOffset = HEADER_SIZE;
  const fieldOffset = structOffset + structTable.length;
  const labelOffset = fieldOffset + fieldTable.length;
  const fieldDataOffset = labelOffset + labels.length;
  const fieldIndicesOffset = fieldDataOffset + fieldData.length;
  const listIndicesOffset = fieldIndicesOffset + fieldIndices.length;

  const header = Buffer.alloc(HEADER_SIZE);
  header.write(fileType, 0, "ascii");
  header.write("V3.2", 4, "ascii");
  header.writeUInt32LE(structOffset, 8);
  header.writeUInt32LE(1, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fieldEntries.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(uniqueLabels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  header.writeUInt32LE(0, 52);

  return Buffer.concat([header, structTable, fieldTable, labels, fieldData, fieldIndices]);
}
