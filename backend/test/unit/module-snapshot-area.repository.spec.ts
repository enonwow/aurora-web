import { ModuleSnapshotAreaRepository } from "../../src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";

type SupportedField =
  | { label: string; type: "dword"; value: number }
  | { label: string; type: "float"; value: number }
  | { label: string; type: "cexostring"; value: string }
  | { label: string; type: "resref"; value: string }
  | { label: string; type: "cexolocstring"; value: string }
  | { label: string; type: "struct"; value: number }
  | { label: string; type: "list"; value: number[] };

interface StructDef {
  typeId?: number;
  fields: SupportedField[];
}

const FIELD_TYPE = {
  DWORD: 4,
  FLOAT: 8,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  STRUCT: 14,
  LIST: 15
} as const;

const HEADER_SIZE = 56;
const STRUCT_ENTRY_SIZE = 12;
const FIELD_ENTRY_SIZE = 12;
const LABEL_ENTRY_SIZE = 16;

describe("ModuleSnapshotAreaRepository", () => {
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

  function createModuleBlobStorage(): jest.Mocked<ModuleBlobStoragePort> {
    return {
      replaceModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-v1",
        totalFiles: 3,
        totalBytes: 2200,
        truncated: false,
        continuationToken: undefined,
        objects: [
          {
            key: "modules/current/areas/market_district.are",
            size: 1000,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "a1"
          },
          {
            key: "modules/current/areas/swamp_crossing.are",
            size: 800,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "a2"
          },
          {
            key: "modules/current/readme.txt",
            size: 20,
            lastModified: "2026-05-25T10:00:00.000Z",
            etag: "x1"
          }
        ]
      })
    };
  }

  it("lists and resolves areas from module snapshot", async () => {
    const repository = new ModuleSnapshotAreaRepository(
      createRuntimeSettingsRepository(),
      createModuleBlobStorage()
    );

    const list = await repository.list({
      limit: 20,
      offset: 0
    });
    expect(list.total).toBe(2);
    expect(list.items[0].objectCounts.total).toBe(0);
    expect(list.items.some((item) => item.biome === "urban")).toBe(true);

    const first = list.items[0];
    await expect(repository.findById(first.areaId)).resolves.toMatchObject({
      areaId: first.areaId
    });
    expect(repository.getPrecomputedAreaProcessing(first.areaId)).toEqual({
      cacheKey: expect.stringMatching(/^[a-f0-9]{64}$/u),
      composition: {
        placeables: 0,
        creatures: 0,
        items: 0,
        total: 0
      }
    });
  });

  it("parses ARE/GIT object placements from blob payloads", async () => {
    const runtimeSettings = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();

    moduleBlobStorage.listModuleSnapshot.mockResolvedValueOnce({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-v2",
      totalFiles: 2,
      totalBytes: 2048,
      truncated: false,
      continuationToken: undefined,
      objects: [
        {
          key: "modules/current/areas/market_district.are",
          size: 1024,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "a1"
        },
        {
          key: "modules/current/areas/market_district.git",
          size: 1024,
          lastModified: "2026-05-25T10:00:00.000Z",
          etag: "g1"
        }
      ]
    });

    const areBytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "Name", type: "cexolocstring", value: "Market District" },
            { label: "Width", type: "dword", value: 24 },
            { label: "Height", type: "dword", value: 20 },
            { label: "Tileset", type: "resref", value: "tno01" },
            { label: "Tile_List", type: "list", value: [1, 2, 3] }
          ]
        },
        { fields: [] },
        { fields: [] },
        { fields: [] }
      ],
      "ARE "
    );

    const gitBytes = buildNestedGffBuffer(
      [
        {
          fields: [
            { label: "Placeable List", type: "list", value: [1] },
            { label: "Door List", type: "list", value: [2] },
            { label: "Creature List", type: "list", value: [3] },
            { label: "Item List", type: "list", value: [4] }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "plc_crate_01" },
            { label: "XPosition", type: "float", value: 12.5 },
            { label: "YPosition", type: "float", value: 6.25 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "utd_city_gate_01" },
            { label: "XPosition", type: "float", value: 20 },
            { label: "YPosition", type: "float", value: 10 },
            { label: "XOrientation", type: "float", value: 0 },
            { label: "YOrientation", type: "float", value: 1 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "cre_guard_01" },
            { label: "XPosition", type: "float", value: 7.75 },
            { label: "YPosition", type: "float", value: 8.5 }
          ]
        },
        {
          fields: [
            { label: "TemplateResRef", type: "resref", value: "itm_potion_01" },
            { label: "Position", type: "struct", value: 5 }
          ]
        },
        {
          fields: [
            { label: "X", type: "float", value: 1.5 },
            { label: "Y", type: "float", value: 2.5 },
            { label: "Z", type: "float", value: 0 }
          ]
        }
      ],
      "GIT "
    );

    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key.endsWith(".are")) {
        return {
          key,
          size: areBytes.length,
          contentType: "application/octet-stream",
          bytes: areBytes,
          etag: "a1",
          lastModified: "2026-05-25T10:00:00.000Z"
        };
      }
      if (key.endsWith(".git")) {
        return {
          key,
          size: gitBytes.length,
          contentType: "application/octet-stream",
          bytes: gitBytes,
          etag: "g1",
          lastModified: "2026-05-25T10:00:00.000Z"
        };
      }
      return null;
    });

    const repository = new ModuleSnapshotAreaRepository(runtimeSettings, moduleBlobStorage);

    const list = await repository.list({ limit: 20, offset: 0 });
    expect(list.total).toBe(1);

    const area = await repository.findById(list.items[0].areaId);
    expect(area).not.toBeNull();
    expect(area?.name).toBe("Market District");
    expect(area?.width).toBe(24);
    expect(area?.height).toBe(20);
    expect(area?.textureAtlasId).toBe("atlas_tno01_v1");
    expect(area?.objects).toHaveLength(4);

    const composition = repository.getPrecomputedAreaProcessing(list.items[0].areaId);
    expect(composition?.composition).toEqual({
      placeables: 2,
      creatures: 1,
      items: 1,
      total: 4
    });
  });

  it("falls back to static repository when no area files found", async () => {
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
    const repository = new ModuleSnapshotAreaRepository(runtimeSettings, moduleBlobStorage);

    const list = await repository.list({
      limit: 20,
      offset: 0
    });
    expect(list.total).toBeGreaterThan(0);
  });
});

function buildNestedGffBuffer(structs: StructDef[], fileType: string): Buffer {
  const uniqueLabels = [
    ...new Set(structs.flatMap((struct) => struct.fields.map((field) => field.label)))
  ];
  const labelIndexByName = new Map(uniqueLabels.map((label, index) => [label, index]));

  const fieldDataChunks: Buffer[] = [];
  const listIndicesChunks: Buffer[] = [];
  const fieldEntries: Array<{ typeId: number; labelIndex: number; dataOrOffset: number }> = [];
  const structFieldIndices: number[][] = structs.map(() => []);

  const pushFieldData = (chunk: Buffer): number => {
    const offset = fieldDataChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldDataChunks.push(chunk);
    return offset;
  };

  const pushListIndicesData = (chunk: Buffer): number => {
    const offset = listIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    listIndicesChunks.push(chunk);
    return offset;
  };

  structs.forEach((struct, structIndex) => {
    struct.fields.forEach((field) => {
      const labelIndex = labelIndexByName.get(field.label);
      if (labelIndex === undefined) {
        throw new Error(`Unknown label index for ${field.label}`);
      }

      let entry: { typeId: number; labelIndex: number; dataOrOffset: number };

      if (field.type === "dword") {
        entry = {
          typeId: FIELD_TYPE.DWORD,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else if (field.type === "float") {
        const inline = Buffer.allocUnsafe(4);
        inline.writeFloatLE(field.value, 0);
        entry = {
          typeId: FIELD_TYPE.FLOAT,
          labelIndex,
          dataOrOffset: inline.readUInt32LE(0)
        };
      } else if (field.type === "cexostring") {
        const valueBytes = Buffer.from(field.value, "utf-8");
        const payload = Buffer.alloc(4 + valueBytes.length);
        payload.writeUInt32LE(valueBytes.length, 0);
        valueBytes.copy(payload, 4);
        entry = {
          typeId: FIELD_TYPE.CEXOSTRING,
          labelIndex,
          dataOrOffset: pushFieldData(payload)
        };
      } else if (field.type === "resref") {
        const valueBytes = Buffer.from(field.value, "ascii");
        const payload = Buffer.alloc(1 + valueBytes.length);
        payload.writeUInt8(valueBytes.length, 0);
        valueBytes.copy(payload, 1);
        entry = {
          typeId: FIELD_TYPE.RESREF,
          labelIndex,
          dataOrOffset: pushFieldData(payload)
        };
      } else if (field.type === "cexolocstring") {
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

        entry = {
          typeId: FIELD_TYPE.CEXOLOCSTRING,
          labelIndex,
          dataOrOffset: pushFieldData(locPayload)
        };
      } else if (field.type === "struct") {
        entry = {
          typeId: FIELD_TYPE.STRUCT,
          labelIndex,
          dataOrOffset: field.value >>> 0
        };
      } else {
        const payload = Buffer.alloc(4 + field.value.length * 4);
        payload.writeUInt32LE(field.value.length, 0);
        field.value.forEach((structIndexFromList, index) => {
          payload.writeUInt32LE(structIndexFromList >>> 0, 4 + index * 4);
        });
        entry = {
          typeId: FIELD_TYPE.LIST,
          labelIndex,
          dataOrOffset: pushListIndicesData(payload)
        };
      }

      const fieldIndex = fieldEntries.length;
      fieldEntries.push(entry);
      structFieldIndices[structIndex].push(fieldIndex);
    });
  });

  const fieldData = Buffer.concat(fieldDataChunks);
  const listIndices = Buffer.concat(listIndicesChunks);

  const fieldIndicesChunks: Buffer[] = [];
  const structEntries: Array<{ typeId: number; dataOrOffset: number; fieldCount: number }> = [];

  structs.forEach((struct, index) => {
    const indices = structFieldIndices[index];
    if (indices.length === 0) {
      structEntries.push({
        typeId: struct.typeId ?? 1,
        dataOrOffset: 0,
        fieldCount: 0
      });
      return;
    }

    if (indices.length === 1) {
      structEntries.push({
        typeId: struct.typeId ?? 1,
        dataOrOffset: indices[0],
        fieldCount: 1
      });
      return;
    }

    const currentOffset = fieldIndicesChunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const chunk = Buffer.alloc(indices.length * 4);
    indices.forEach((fieldIndex, fieldPos) => {
      chunk.writeUInt32LE(fieldIndex >>> 0, fieldPos * 4);
    });
    fieldIndicesChunks.push(chunk);

    structEntries.push({
      typeId: struct.typeId ?? 1,
      dataOrOffset: currentOffset,
      fieldCount: indices.length
    });
  });

  const fieldIndices = Buffer.concat(fieldIndicesChunks);

  const structTable = Buffer.alloc(structEntries.length * STRUCT_ENTRY_SIZE);
  structEntries.forEach((entry, index) => {
    const offset = index * STRUCT_ENTRY_SIZE;
    structTable.writeUInt32LE(entry.typeId >>> 0, offset);
    structTable.writeUInt32LE(entry.dataOrOffset >>> 0, offset + 4);
    structTable.writeUInt32LE(entry.fieldCount >>> 0, offset + 8);
  });

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
  header.writeUInt32LE(structEntries.length, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fieldEntries.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(uniqueLabels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  header.writeUInt32LE(listIndices.length, 52);

  return Buffer.concat([
    header,
    structTable,
    fieldTable,
    labels,
    fieldData,
    fieldIndices,
    listIndices
  ]);
}
