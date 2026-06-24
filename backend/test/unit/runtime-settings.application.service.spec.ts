import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Logger } from "@nestjs/common";
import {
  RuntimeSettingsApplicationService,
  resolveHakSettingsByAsset
} from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
import type { DerivedAssetGeneratorPort } from "../../src/modules/runtime-settings/application/ports/derived-asset-generator.port";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { PackedModuleExtractorPort } from "../../src/modules/runtime-settings/application/ports/packed-module-extractor.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { RuntimeSettingsRecord } from "../../src/modules/runtime-settings/domain/runtime-settings.types";

const POC_PATHS = {
  vanillaDataPath:
    "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data",
  hakDirectoryPath: "C:/Users/enonw/Documents/Neverwinter Nights/hak",
  moduleDecompiledPath:
    "C:/Users/enonw/Documents/Neverwinter Nights/LC-Decompiled/temp0",
  modulePackedPath: "C:/Users/enonw/Documents/Neverwinter Nights/modules/the_last_city.mod",
  tlkBasePath:
    "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/lang/en/data/dialog.tlk",
  tlkCustomPath: ""
} as const;

describe("RuntimeSettingsApplicationService", () => {
  let repository: jest.Mocked<RuntimeSettingsRepositoryPort>;
  let packedModuleExtractor: jest.Mocked<PackedModuleExtractorPort>;
  let moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort>;
  let service: RuntimeSettingsApplicationService;

  beforeEach(() => {
    repository = {
      get: jest.fn(),
      save: jest.fn()
    };
    packedModuleExtractor = {
      extractFromPackedModule: jest.fn()
    };
    moduleBlobStorage = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    service = new RuntimeSettingsApplicationService(
      repository,
      packedModuleExtractor,
      moduleBlobStorage
    );
  });

  it("returns runtime settings from repository", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);

    const response = await service.getRuntimeSettings();

    expect(repository.get).toHaveBeenCalledTimes(1);
    expect(response).toEqual(current);
  });

  it("replaces settings and bumps revision metadata", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    repository.save.mockResolvedValue();

    const {
      revision: _revision,
      updatedAt: _updatedAt,
      updatedBy: _updatedBy,
      ...basePayload
    } = current;
    const nextPayload = {
      ...basePayload,
      telemetryDebugMode: "basic" as const
    };

    const saved = await service.replaceRuntimeSettings(nextPayload, "admin.user");

    expect(saved.revision).toBe(current.revision + 1);
    expect(saved.updatedBy).toBe("admin.user");
    expect(saved.telemetryDebugMode).toBe("basic");
    expect(saved.updatedAt).toEqual(expect.any(String));
    expect(repository.save).toHaveBeenCalledWith(saved);
  });

  it("returns resolved hak settings by source", async () => {
    const current = buildSettingsRecord();
    current.paths.moduleDecompiledPath = "";
    current.sources.placeable.hakProfileId = "lc_models";
    current.sources.tile.hakPriorityList = ["custom_tiles.hak", "custom_tiles.hak"];
    current.sources.sound.includeHaks = false;
    current.sources.vfx.hakProfileId = "lc_vfx";
    repository.get.mockResolvedValue(current);

    const resolved = await service.getResolvedHakSettings();

    expect(resolved.placeable.mode).toBe("profile");
    expect(resolved.placeable.hakPriorityList).toEqual([
      "lc_2da.hak",
      "lc_placeable.hak",
      "lc_placeable_cust.hak",
      "lc_hd_plcbls.hak",
      "q_placeables.hak",
      "cep3_core0.hak",
      "nwic_placeables.hak"
    ]);
    expect(resolved.tile.mode).toBe("inline");
    expect(resolved.tile.hakPriorityList).toEqual(["custom_tiles.hak"]);
    expect(resolved.sound.mode).toBe("disabled");
    expect(resolved.sound.hakPriorityList).toEqual([]);
    expect(resolved.vfx.mode).toBe("profile");
    expect(resolved.vfx.hakPriorityList).toEqual([
      "lc_2da.hak",
      "lc_vfx.hak",
      "cep3_vfx.hak"
    ]);
  });

  it("resolves placeable hak priority from module.ifo when config list is empty", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-module-ifo-"));
    const moduleIfo = createModuleIfoGff([
      "first_placeable_hak.hak",
      "Second_Placeable_HAK.hak",
      "FIRST_PLACEABLE_HAK.hak",
      "  "
    ]);
    await writeFile(join(tempRoot, "module.ifo"), moduleIfo);

    try {
      const current = buildSettingsRecord();
      current.paths.moduleDecompiledPath = tempRoot;
      current.sources.placeable.hakPriorityList = [];
      current.sources.placeable.hakProfileId = "";

      repository.get.mockResolvedValue(current);

      const resolved = await service.getResolvedHakSettings();

      expect(resolved.placeable.mode).toBe("module_ifo");
      expect(resolved.placeable.hakPriorityList).toEqual([
        "first_placeable_hak",
        "Second_Placeable_HAK",
        "FIRST_PLACEABLE_HAK"
      ]);
      expect(resolved.placeable.hakPaths).toEqual([
        "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak\\first_placeable_hak.hak",
        "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak\\Second_Placeable_HAK.hak",
        "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak\\FIRST_PLACEABLE_HAK.hak"
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("uses placeable explicit hak list before module.ifo fallback", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-module-ifo-"));
    const moduleIfo = createModuleIfoGff(["module_fallback.hak"]);
    await writeFile(join(tempRoot, "module.ifo"), moduleIfo);

    try {
      const current = buildSettingsRecord();
      current.paths.moduleDecompiledPath = tempRoot;
      current.sources.placeable.hakPriorityList = ["explicit_one.hak", "explicit_two.hak"];
      current.sources.placeable.hakProfileId = "lc_core";

      repository.get.mockResolvedValue(current);

      const resolved = await service.getResolvedHakSettings();

      expect(resolved.placeable.mode).toBe("inline");
      expect(resolved.placeable.hakPriorityList).toEqual([
        "explicit_one.hak",
        "explicit_two.hak"
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("falls back to profile after module.ifo when no placeable explicit list exists", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-module-ifo-"));
    const moduleIfo = createModuleIfoGff([]);
    await writeFile(join(tempRoot, "module.ifo"), moduleIfo);

    try {
      const current = buildSettingsRecord();
      current.paths.moduleDecompiledPath = tempRoot;
      current.sources.placeable.hakPriorityList = [];
      current.sources.placeable.hakProfileId = "lc_models";

      repository.get.mockResolvedValue(current);

      const resolved = await service.getResolvedHakSettings();

      expect(resolved.placeable.mode).toBe("profile");
      expect(resolved.placeable.hakProfileId).toBe("lc_models");
      expect(resolved.placeable.hakPriorityList).toEqual(current.hakProfiles.lc_models);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("uses module.ifo before placeable profile when explicit list is empty", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-module-ifo-"));
    const moduleIfo = createModuleIfoGff(["module_priority"]);
    await writeFile(join(tempRoot, "module.ifo"), moduleIfo);

    try {
      const current = buildSettingsRecord();
      current.paths.moduleDecompiledPath = tempRoot;
      current.sources.placeable.hakPriorityList = [];
      current.sources.placeable.hakProfileId = "lc_models";

      repository.get.mockResolvedValue(current);

      const resolved = await service.getResolvedHakSettings();

      expect(resolved.placeable.mode).toBe("module_ifo");
      expect(resolved.placeable.hakProfileId).toBe("lc_models");
      expect(resolved.placeable.hakPriorityList).toEqual(["module_priority"]);
      expect(resolved.placeable.hakPaths).toEqual([
        "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak\\module_priority.hak"
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("keeps non-placeable assets on profile fallback", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-module-ifo-"));
    const moduleIfo = createModuleIfoGff(["module_fallback.hak"]);
    await writeFile(join(tempRoot, "module.ifo"), moduleIfo);

    try {
      const current = buildSettingsRecord();
      current.paths.moduleDecompiledPath = tempRoot;
      current.sources.tile.hakProfileId = "lc_tiles";
      current.sources.tile.hakPriorityList = [];
      current.sources.area.hakProfileId = "lc_core";
      current.sources.area.hakPriorityList = [];
      current.sources.vfx.hakProfileId = "lc_vfx";
      current.sources.vfx.hakPriorityList = [];
      current.sources.placeable.hakPriorityList = [];
      current.sources.placeable.hakProfileId = "";

      repository.get.mockResolvedValue(current);

      const resolved = await service.getResolvedHakSettings();

      expect(resolved.tile.mode).toBe("profile");
      expect(resolved.tile.hakPriorityList).toEqual(current.hakProfiles.lc_tiles);
      expect(resolved.area.mode).toBe("profile");
      expect(resolved.area.hakPriorityList).toEqual(current.hakProfiles.lc_core);
      expect(resolved.vfx.mode).toBe("profile");
      expect(resolved.vfx.hakPriorityList).toEqual(current.hakProfiles.lc_vfx);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("resolves profile and absolute hak entries into hak paths", () => {
    const current = buildSettingsRecord();
    current.paths.hakDirectoryPath = POC_PATHS.hakDirectoryPath;
    current.sources.area.hakProfileId = "mixed";
    current.hakProfiles.mixed = ["relative/one.hak", "D:/external/two.hak"];

    const resolved = resolveHakSettingsByAsset(current);

    expect(resolved.area.hakPaths).toEqual([
      "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak\\relative\\one.hak",
      "D:/external/two.hak"
    ]);
  });

  it("returns module cache summary from blob storage", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-v1",
      totalFiles: 2,
      totalBytes: 42,
      objects: [
        {
          key: "modules/current/module.ifo",
          size: 10
        },
        {
          key: "modules/current/areas/test.are",
          size: 32
        }
      ],
      truncated: false
    });

    const summary = await service.getModuleBlobCacheSummary(200);

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledWith(
      current.blobStorage,
      { limit: 200 }
    );
    expect(summary.totalFiles).toBe(2);
    expect(summary.moduleHash).toBe("hash-v1");
  });

  it("returns texture index metadata and supports case-insensitive resref query", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/__aurora/meta/texture-index.v1.json",
      size: 123,
      contentType: "application/json",
      bytes: Buffer.from(
        JSON.stringify({
          version: "texture-index/v1",
          generatedAt: "2026-05-25T12:00:00.000Z",
          settingsRevision: 7,
          modulePrefix: "modules/current/",
          totalTextures: 3,
          totalBytes: 30,
          entries: [
            {
              textureId: "id-module",
              resref: "M_Module",
              extension: "dds",
              objectKey: "modules/current/textures/m_module.dds",
              sizeBytes: 10,
              sha256: "a".repeat(64),
              source: "module",
              sourcePath: "textures/m_module.dds"
            },
            {
              textureId: "id-hak",
              resref: "h_fire",
              extension: "dds",
              objectKey: "modules/current/__aurora/sources/hak/lc_core/h_fire.dds",
              sizeBytes: 9,
              sha256: "b".repeat(64),
              source: "hak",
              sourcePath: "lc_core.hak"
            },
            {
              textureId: "id-vanilla",
              resref: "v_stone",
              extension: "tga",
              objectKey: "modules/current/__aurora/sources/vanilla/textures/v_stone.tga",
              sizeBytes: 11,
              sha256: "c".repeat(64),
              source: "vanilla",
              sourcePath: "textures/v_stone.tga"
            }
          ],
          byResref: {}
        }),
        "utf-8"
      )
    });

    const summary = await service.getTextureIndexMetadataSummary();
    const filtered = await service.queryTextureIndex({
      resref: "M_MODULE",
      limit: 50,
      offset: 0
    });
    const paged = await service.queryTextureIndex({
      limit: 1,
      offset: 1
    });

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      current.blobStorage,
      "modules/current/__aurora/meta/texture-index.v1.json"
    );
    expect(summary).toEqual({
      indexObjectKey: "modules/current/__aurora/meta/texture-index.v1.json",
      available: true,
      version: "texture-index/v1",
      generatedAt: "2026-05-25T12:00:00.000Z",
      settingsRevision: 7,
      modulePrefix: "modules/current/",
      totalTextures: 3,
      totalBytes: 30
    });
    expect(filtered.available).toBe(true);
    expect(filtered.totalEntries).toBe(1);
    expect(filtered.entries).toHaveLength(1);
    expect(filtered.entries[0]!.resref).toBe("M_Module");
    expect(filtered.query.resref).toBe("m_module");
    expect(paged.totalEntries).toBe(3);
    expect(paged.entries).toHaveLength(1);
    expect(paged.entries[0]!.resref).toBe("h_fire");
  });

  it("reuses in-memory texture index lookup across summary/query/blob operations", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    moduleBlobStorage.getModuleObject
      .mockResolvedValueOnce({
        key: "modules/current/__aurora/meta/texture-index.v1.json",
        size: 123,
        contentType: "application/json",
        bytes: Buffer.from(
          JSON.stringify({
            version: "texture-index/v1",
            generatedAt: "2026-05-25T12:00:00.000Z",
            settingsRevision: 7,
            modulePrefix: "modules/current/",
            totalTextures: 1,
            totalBytes: 10,
            entries: [
              {
                textureId: "abcdefabcdefabcdefabcdef",
                resref: "m_module",
                extension: "dds",
                objectKey: "modules/current/textures/m_module.dds",
                sizeBytes: 10,
                sha256: "a".repeat(64),
                source: "module",
                sourcePath: "textures/m_module.dds"
              }
            ],
            byResref: {}
          }),
          "utf-8"
        )
      })
      .mockResolvedValueOnce({
        key: "modules/current/textures/m_module.dds",
        size: 10,
        contentType: "image/vnd-ms.dds",
        bytes: Buffer.from([1, 2, 3, 4])
      });

    await service.getTextureIndexMetadataSummary();
    await service.queryTextureIndex({
      resref: "M_MODULE",
      limit: 10,
      offset: 0
    });
    await service.getTextureBlobById("abcdefabcdefabcdefabcdef");

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledTimes(2);
    expect(moduleBlobStorage.getModuleObject).toHaveBeenNthCalledWith(
      1,
      current.blobStorage,
      "modules/current/__aurora/meta/texture-index.v1.json"
    );
    expect(moduleBlobStorage.getModuleObject).toHaveBeenNthCalledWith(
      2,
      current.blobStorage,
      "modules/current/textures/m_module.dds"
    );
  });

  it("invalidates in-memory texture index lookup after runtime settings replacement", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    repository.save.mockResolvedValue();
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/__aurora/meta/texture-index.v1.json",
      size: 123,
      contentType: "application/json",
      bytes: Buffer.from(
        JSON.stringify({
          version: "texture-index/v1",
          generatedAt: "2026-05-25T12:00:00.000Z",
          settingsRevision: 7,
          modulePrefix: "modules/current/",
          totalTextures: 1,
          totalBytes: 10,
          entries: [
            {
              textureId: "abcdefabcdefabcdefabcdef",
              resref: "m_module",
              extension: "dds",
              objectKey: "modules/current/textures/m_module.dds",
              sizeBytes: 10,
              sha256: "a".repeat(64),
              source: "module",
              sourcePath: "textures/m_module.dds"
            }
          ],
          byResref: {}
        }),
        "utf-8"
      )
    });

    await service.queryTextureIndex({
      limit: 10,
      offset: 0
    });

    const {
      revision: _revision,
      updatedAt: _updatedAt,
      updatedBy: _updatedBy,
      ...payload
    } = current;
    await service.replaceRuntimeSettings(payload, "admin.user");

    await service.queryTextureIndex({
      limit: 10,
      offset: 0
    });

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledTimes(2);
  });

  it("builds texture delivery contracts and filters by texture ids", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/__aurora/meta/texture-index.v1.json",
      size: 123,
      contentType: "application/json",
      bytes: Buffer.from(
        JSON.stringify({
          version: "texture-index/v1",
          generatedAt: "2026-05-25T12:00:00.000Z",
          settingsRevision: 7,
          modulePrefix: "modules/current/",
          totalTextures: 2,
          totalBytes: 19,
          entries: [
            {
              textureId: "abcdefabcdefabcdefabcdef",
              resref: "M_Module",
              extension: "dds",
              objectKey: "modules/current/textures/m_module.dds",
              sizeBytes: 10,
              sha256: "a".repeat(64),
              source: "module",
              sourcePath: "textures/m_module.dds"
            },
            {
              textureId: "1234567890abcdef12345678",
              resref: "h_fire",
              extension: "tga",
              objectKey: "modules/current/__aurora/sources/hak/lc_core/h_fire.tga",
              sizeBytes: 9,
              sha256: "b".repeat(64),
              source: "hak",
              sourcePath: "lc_core.hak"
            }
          ],
          byResref: {}
        }),
        "utf-8"
      )
    });

    const contracts = await service.getTextureDeliveryContracts({
      textureIds: ["1234567890abcdef12345678"]
    });

    expect(contracts.available).toBe(true);
    expect(contracts.assets).toHaveLength(1);
    expect(contracts.assets[0]).toMatchObject({
      textureId: "1234567890abcdef12345678",
      objectKey: "modules/current/__aurora/sources/hak/lc_core/h_fire.tga",
      deliveryPath: "/api/v1/settings/runtime/module-cache/textures/1234567890abcdef12345678",
      s3Url: "s3://aurora-module-assets/modules/current/__aurora/sources/hak/lc_core/h_fire.tga"
    });
  });

  it("resolves texture blob payload by texture id", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    moduleBlobStorage.getModuleObject
      .mockResolvedValueOnce({
        key: "modules/current/__aurora/meta/texture-index.v1.json",
        size: 123,
        contentType: "application/json",
        bytes: Buffer.from(
          JSON.stringify({
            version: "texture-index/v1",
            generatedAt: "2026-05-25T12:00:00.000Z",
            settingsRevision: 7,
            modulePrefix: "modules/current/",
            totalTextures: 1,
            totalBytes: 10,
            entries: [
              {
                textureId: "abcdefabcdefabcdefabcdef",
                resref: "m_module",
                extension: "dds",
                objectKey: "modules/current/textures/m_module.dds",
                sizeBytes: 10,
                sha256: "a".repeat(64),
                source: "module",
                sourcePath: "textures/m_module.dds"
              }
            ],
            byResref: {}
          }),
          "utf-8"
        )
      })
      .mockResolvedValueOnce({
        key: "modules/current/textures/m_module.dds",
        size: 10,
        contentType: "image/vnd-ms.dds",
        bytes: Buffer.from([1, 2, 3, 4])
      });

    const blob = await service.getTextureBlobById("abcdefabcdefabcdefabcdef");

    expect(blob.texture.textureId).toBe("abcdefabcdefabcdefabcdef");
    expect(blob.deliveryPath).toBe(
      "/api/v1/settings/runtime/module-cache/textures/abcdefabcdefabcdefabcdef"
    );
    expect(blob.payload.size).toBe(10);
    expect(blob.payload.contentType).toBe("image/vnd-ms.dds");
  });

  it("returns empty texture index response when index object does not exist", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const summary = await service.getTextureIndexMetadataSummary();
    const query = await service.queryTextureIndex({ resref: "missing", limit: 20, offset: 0 });

    expect(summary).toEqual({
      indexObjectKey: "modules/current/__aurora/meta/texture-index.v1.json",
      available: false
    });
    expect(query.available).toBe(false);
    expect(query.totalEntries).toBe(0);
    expect(query.entries).toEqual([]);
  });

  it("falls back to unavailable texture index when payload contains invalid json", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/__aurora/meta/texture-index.v1.json",
      size: 1,
      contentType: "application/json",
      bytes: Buffer.from("{", "utf-8")
    });

    const summary = await service.getTextureIndexMetadataSummary();
    const query = await service.queryTextureIndex({ limit: 10, offset: 0 });

    expect(summary).toEqual({
      indexObjectKey: "modules/current/__aurora/meta/texture-index.v1.json",
      available: false
    });
    expect(query.available).toBe(false);
    expect(query.totalEntries).toBe(0);
    expect(query.entries).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Texture index payload is malformed JSON; falling back to unavailable index.")
    );
    warnSpy.mockRestore();
  });

  it("falls back to unavailable texture index when payload has invalid schema", async () => {
    const current = buildSettingsRecord();
    repository.get.mockResolvedValue(current);
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation();
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/__aurora/meta/texture-index.v1.json",
      size: 64,
      contentType: "application/json",
      bytes: Buffer.from(
        JSON.stringify({
          version: "texture-index/v1",
          generatedAt: "2026-05-25T12:00:00.000Z",
          settingsRevision: 7,
          modulePrefix: "modules/current/",
          totalTextures: 1,
          totalBytes: 10,
          entries: [
            {
              textureId: "id-module",
              resref: "m_module",
              extension: "dds",
              objectKey: "modules/current/textures/m_module.dds",
              sizeBytes: "invalid-size",
              sha256: "a".repeat(64),
              source: "module",
              sourcePath: "textures/m_module.dds"
            }
          ]
        }),
        "utf-8"
      )
    });

    const summary = await service.getTextureIndexMetadataSummary();
    const query = await service.queryTextureIndex({ limit: 10, offset: 0 });

    expect(summary).toEqual({
      indexObjectKey: "modules/current/__aurora/meta/texture-index.v1.json",
      available: false
    });
    expect(query.available).toBe(false);
    expect(query.totalEntries).toBe(0);
    expect(query.entries).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Texture index payload has invalid schema; falling back to unavailable index.")
    );
    warnSpy.mockRestore();
  });

  it("rebuilds module cache from decompiled directory when path is configured", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-cache-"));
    const nestedDir = join(tempRoot, "areas");
    await mkdir(nestedDir, { recursive: true });
    await writeFile(join(tempRoot, "module.ifo"), "ifo", "utf-8");
    await writeFile(join(nestedDir, "test.are"), "are", "utf-8");

    try {
      const current = buildSettingsRecord();
      current.paths.moduleDecompiledPath = tempRoot;
      current.paths.modulePackedPath = "C:/ignored.mod";
      current.sources.vfx.includeHaks = false;
      repository.get.mockResolvedValue(current);
      moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-new",
        previousModuleHash: "hash-old",
        status: "updated",
        uploadedFiles: 2,
        uploadedBytes: 6,
        deletedFiles: 0,
        deletedBytes: 0,
        unchangedFiles: 0,
        totalFiles: 2
      });

      const result = await service.rebuildModuleBlobCache("admin.user");

      expect(result.mode).toBe("incremental");
      expect(result.source.type).toBe("decompiled");
      expect(result.sync.uploadedFiles).toBe(2);
      expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledWith(
        current.blobStorage,
        expect.arrayContaining([
          expect.objectContaining({ fileName: "module.ifo" }),
          expect.objectContaining({ fileName: "areas/test.are" })
        ]),
        { forceFull: false }
      );
      expect(packedModuleExtractor.extractFromPackedModule).not.toHaveBeenCalled();
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  }, 15000);

  it("rebuilds module cache from packed module when decompiled path is empty", async () => {
    const current = buildSettingsRecord();
    current.paths.moduleDecompiledPath = "";
    current.paths.modulePackedPath = "C:/modules/the_last_city.mod";
    repository.get.mockResolvedValue(current);
    packedModuleExtractor.extractFromPackedModule.mockResolvedValue([
      {
        fileName: "module.ifo",
        resourceType: 2014,
        bytes: Buffer.from("ifo")
      }
    ]);
    moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-new",
      previousModuleHash: "hash-old",
      status: "updated",
      uploadedFiles: 1,
      uploadedBytes: 3,
      deletedFiles: 0,
      deletedBytes: 0,
      unchangedFiles: 0,
      totalFiles: 1
    });

    const result = await service.rebuildModuleBlobCache("admin.user");

    expect(result.mode).toBe("incremental");
    expect(result.source.type).toBe("packed");
    expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledWith(
      "C:/modules/the_last_city.mod"
    );
    expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledWith(
      current.blobStorage,
      expect.arrayContaining([expect.objectContaining({ fileName: "module.ifo" })]),
      { forceFull: false }
    );
  });

  it("supports full mode sync when rebuild is forced", async () => {
    const current = buildSettingsRecord();
    current.paths.moduleDecompiledPath = "";
    current.paths.modulePackedPath = "C:/modules/the_last_city.mod";
    repository.get.mockResolvedValue(current);
    packedModuleExtractor.extractFromPackedModule.mockResolvedValue([
      {
        fileName: "module.ifo",
        resourceType: 2014,
        bytes: Buffer.from("ifo")
      }
    ]);
    moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-new",
      previousModuleHash: "hash-old",
      status: "updated",
      uploadedFiles: 1,
      uploadedBytes: 3,
      deletedFiles: 2,
      deletedBytes: 64,
      unchangedFiles: 0,
      totalFiles: 1
    });

    const result = await service.rebuildModuleBlobCache("admin.user", {
      forceFull: true
    });

    expect(result.mode).toBe("full");
    expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledWith(
      current.blobStorage,
      expect.arrayContaining([expect.objectContaining({ fileName: "module.ifo" })]),
      { forceFull: true }
    );
  });

  it("includes HAK-provided placeables and model assets when rebuilding module cache", async () => {
    const moduleRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-module-"));
    const hakRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-haks-"));
    const hakPath = join(hakRoot, "lc_core.hak");
    await writeFile(join(moduleRoot, "module.ifo"), "ifo", "utf-8");
    await writeFile(hakPath, "hak", "utf-8");
    const current = buildSettingsRecord();
    current.paths.moduleDecompiledPath = moduleRoot;
    current.paths.modulePackedPath = "";
    current.paths.hakDirectoryPath = hakRoot;
    current.sources.placeable.includeVanilla = false;
    current.sources.tile.includeVanilla = false;
    current.sources.area.includeVanilla = false;
    repository.get.mockResolvedValue(current);
    packedModuleExtractor.extractFromPackedModule.mockResolvedValue([
      {
        fileName: "h_fire.dds",
        resourceType: 2033,
        bytes: Buffer.from([7, 8, 9])
      },
      {
        fileName: "placeables.2da",
        resourceType: 1234,
        bytes: Buffer.from("2da", "utf-8")
      },
      {
        fileName: "tiles/tcn01.set",
        resourceType: 2013,
        bytes: Buffer.from("[TILE15]\nModel=tcn01_a01_01", "utf-8")
      },
      {
        fileName: "blueprints/plc_city_gate.utp",
        resourceType: 2044,
        bytes: Buffer.from("utp", "utf-8")
      },
      {
        fileName: "models/plc_city_gate.mdl",
        resourceType: 2002,
        bytes: Buffer.from("mdl", "utf-8")
      },
      {
        fileName: "models/plc_city_gate.pwk",
        resourceType: 2003,
        bytes: Buffer.from("pwk", "utf-8")
      }
    ]);
    moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-new",
      previousModuleHash: "hash-old",
      status: "updated",
      uploadedFiles: 6,
      uploadedBytes: 23,
      deletedFiles: 0,
      deletedBytes: 0,
      unchangedFiles: 0,
      totalFiles: 6
    });

    try {
      await service.rebuildModuleBlobCache("admin.user");

      expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledWith(hakPath);
      expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledTimes(1);
      expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledWith(
        current.blobStorage,
        expect.arrayContaining([
          expect.objectContaining({ fileName: "module.ifo" }),
          expect.objectContaining({ fileName: "__aurora/sources/hak/lc_core/h_fire.dds" }),
          expect.objectContaining({
            fileName: "__aurora/sources/hak/lc_core/placeables.2da"
          }),
          expect.objectContaining({
            fileName: "__aurora/sources/hak/lc_core/tiles/tcn01.set"
          }),
          expect.objectContaining({
            fileName: "__aurora/sources/hak/lc_core/blueprints/plc_city_gate.utp"
          }),
          expect.objectContaining({
            fileName: "__aurora/sources/hak/lc_core/models/plc_city_gate.mdl"
          }),
          expect.objectContaining({
            fileName: "__aurora/sources/hak/lc_core/models/plc_city_gate.pwk"
          })
        ]),
        { forceFull: false }
      );
    } finally {
      await rm(moduleRoot, { recursive: true, force: true });
      await rm(hakRoot, { recursive: true, force: true });
    }
  });

  it("includes HAK-provided sound assets when rebuilding module cache", async () => {
    const moduleRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-module-"));
    const hakRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-haks-"));
    const soundHakPath = join(hakRoot, "lc_sounds.hak");
    await writeFile(join(moduleRoot, "module.ifo"), "ifo", "utf-8");
    await writeFile(soundHakPath, "hak", "utf-8");
    const current = buildSettingsRecord();
    current.paths.moduleDecompiledPath = moduleRoot;
    current.paths.modulePackedPath = "";
    current.paths.hakDirectoryPath = hakRoot;
    current.sources.placeable.includeHaks = false;
    current.sources.placeable.includeVanilla = false;
    current.sources.tile.includeHaks = false;
    current.sources.tile.includeVanilla = false;
    current.sources.area.includeHaks = false;
    current.sources.area.includeVanilla = false;
    current.sources.vfx.includeHaks = false;
    current.sources.vfx.includeVanilla = false;
    current.sources.sound.includeHaks = true;
    current.sources.sound.hakProfileId = "lc_audio";
    current.sources.sound.hakPriorityList = [];
    repository.get.mockResolvedValue(current);
    packedModuleExtractor.extractFromPackedModule.mockResolvedValue([
      {
        fileName: "sfx/door_creak.wav",
        resourceType: 4,
        bytes: Buffer.from([1, 2, 3])
      },
      {
        fileName: "ambient/amb_market_day.ogg",
        resourceType: 4,
        bytes: Buffer.from([4, 5])
      },
      {
        fileName: "music/mus_city_theme.bmu",
        resourceType: 4,
        bytes: Buffer.from([6, 7, 8, 9])
      },
      {
        fileName: "docs/readme.txt",
        resourceType: 10,
        bytes: Buffer.from("ignored", "utf-8")
      }
    ]);
    moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-new",
      previousModuleHash: "hash-old",
      status: "updated",
      uploadedFiles: 5,
      uploadedBytes: 32,
      deletedFiles: 0,
      deletedBytes: 0,
      unchangedFiles: 0,
      totalFiles: 5
    });

    try {
      await service.rebuildModuleBlobCache("admin.user");

      expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledWith(soundHakPath);
      expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledTimes(1);
      const uploadedFiles = moduleBlobStorage.replaceModuleSnapshot.mock.calls[0]![1];
      const uploadedNames = uploadedFiles.map((entry) => entry.fileName);
      expect(uploadedNames).toEqual(
        expect.arrayContaining([
          "module.ifo",
          "__aurora/sources/hak/lc_sounds/sfx/door_creak.wav",
          "__aurora/sources/hak/lc_sounds/ambient/amb_market_day.ogg",
          "__aurora/sources/hak/lc_sounds/music/mus_city_theme.bmu",
          "__aurora/meta/texture-index.v1.json"
        ])
      );
      expect(uploadedNames).not.toContain("__aurora/sources/hak/lc_sounds/docs/readme.txt");
    } finally {
      await rm(moduleRoot, { recursive: true, force: true });
      await rm(hakRoot, { recursive: true, force: true });
    }
  });

  it("continues to an existing audio HAK when an earlier configured audio HAK is missing", async () => {
    const moduleRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-module-"));
    const hakRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-haks-"));
    const realSoundHakPath = join(hakRoot, "npc_sounds.hak");
    await writeFile(join(moduleRoot, "module.ifo"), "ifo", "utf-8");
    await writeFile(realSoundHakPath, "hak", "utf-8");
    const current = buildSettingsRecord();
    current.paths.moduleDecompiledPath = moduleRoot;
    current.paths.modulePackedPath = "";
    current.paths.hakDirectoryPath = hakRoot;
    current.hakProfiles.lc_audio = ["lc_sounds.hak", "npc_sounds.hak"];
    current.sources.placeable.includeHaks = false;
    current.sources.placeable.includeVanilla = false;
    current.sources.tile.includeHaks = false;
    current.sources.tile.includeVanilla = false;
    current.sources.area.includeHaks = false;
    current.sources.area.includeVanilla = false;
    current.sources.vfx.includeHaks = false;
    current.sources.vfx.includeVanilla = false;
    current.sources.sound.includeHaks = true;
    current.sources.sound.hakProfileId = "lc_audio";
    current.sources.sound.hakPriorityList = [];
    repository.get.mockResolvedValue(current);
    packedModuleExtractor.extractFromPackedModule.mockResolvedValue([
      {
        fileName: "dia_hakon_add_12.wav",
        resourceType: 4,
        bytes: Buffer.from([1, 2, 3])
      }
    ]);
    moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-new",
      previousModuleHash: "hash-old",
      status: "updated",
      uploadedFiles: 3,
      uploadedBytes: 16,
      deletedFiles: 0,
      deletedBytes: 0,
      unchangedFiles: 0,
      totalFiles: 3
    });

    try {
      await service.rebuildModuleBlobCache("admin.user");

      expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledWith(
        realSoundHakPath
      );
      expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledTimes(1);
      const uploadedFiles = moduleBlobStorage.replaceModuleSnapshot.mock.calls[0]![1];
      const uploadedNames = uploadedFiles.map((entry) => entry.fileName);
      expect(uploadedNames).toEqual(
        expect.arrayContaining([
          "module.ifo",
          "__aurora/sources/hak/npc_sounds/dia_hakon_add_12.wav",
          "__aurora/meta/texture-index.v1.json"
        ])
      );
    } finally {
      await rm(moduleRoot, { recursive: true, force: true });
      await rm(hakRoot, { recursive: true, force: true });
    }
  });

  it("adds derived asset generator output to module blob sync", async () => {
    const current = buildSettingsRecord();
    current.paths.moduleDecompiledPath = "";
    current.paths.modulePackedPath = "C:/modules/the_last_city.mod";
    repository.get.mockResolvedValue(current);
    packedModuleExtractor.extractFromPackedModule.mockResolvedValue([
      {
        fileName: "models/plc_city_gate.mdl",
        resourceType: 2002,
        bytes: Buffer.from("mdl")
      }
    ]);
    moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-new",
      previousModuleHash: "hash-old",
      status: "updated",
      uploadedFiles: 2,
      uploadedBytes: 6,
      deletedFiles: 0,
      deletedBytes: 0,
      unchangedFiles: 0,
      totalFiles: 2
    });
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn(async (_input) => ({
        files: [
          {
            fileName: "__aurora/derived/models/plc_city_gate.glb",
            resourceType: 0,
            bytes: Buffer.from("glb")
          }
        ],
        summary: {
          generator: "test-generator",
          generatedFiles: 99,
          generatedBytes: 99
        }
      }))
    };
    const serviceWithGenerator = new RuntimeSettingsApplicationService(
      repository,
      packedModuleExtractor,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithGenerator.rebuildModuleBlobCache("admin.user");

    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledWith({
      settingsRevision: current.revision,
      modulePrefix: current.blobStorage.modulePrefix,
      sourceFiles: expect.arrayContaining([
        expect.objectContaining({ fileName: "models/plc_city_gate.mdl" })
      ])
    });
    expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledWith(
      current.blobStorage,
      expect.arrayContaining([
        expect.objectContaining({ fileName: "models/plc_city_gate.mdl" }),
        expect.objectContaining({
          fileName: "__aurora/derived/models/plc_city_gate.glb"
        })
      ]),
      { forceFull: false }
    );
    expect(result.derivedAssets).toEqual({
      generator: "test-generator",
      generatedFiles: 1,
      generatedBytes: 3
    });
  });

  it("syncs hak and vanilla textures and writes texture index metadata", async () => {
    const moduleRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-module-"));
    const hakRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-haks-"));
    const vanillaRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-vanilla-"));
    const hakPath = join(hakRoot, "lc_core.hak");
    await mkdir(join(moduleRoot, "textures"), { recursive: true });
    await mkdir(join(vanillaRoot, "textures", "city"), { recursive: true });
    await writeFile(join(moduleRoot, "module.ifo"), "ifo", "utf-8");
    await writeFile(join(moduleRoot, "textures", "m_module.dds"), Buffer.from([1, 2, 3]));
    await writeFile(hakPath, "hak", "utf-8");
    await writeFile(
      join(vanillaRoot, "textures", "city", "v_stone.tga"),
      Buffer.from([4, 5])
    );
    await writeFakeKeyBif(vanillaRoot, [
      {
        resref: "placeables",
        resourceType: 2017,
        bytes: Buffer.from(
          ["2DA V2.0", "", "  Label ModelName", '1 "Vanilla Chair" plc_vanilla'].join("\n"),
          "utf-8"
        )
      },
      {
        resref: "tcn01",
        resourceType: 2013,
        bytes: Buffer.from("[TILE15]\nModel=tcn01_a01_01", "utf-8")
      },
      {
        resref: "plc_vanilla",
        resourceType: 2002,
        bytes: Buffer.from("newmodel plc_vanilla\n", "utf-8")
      },
      {
        resref: "plc_vanilla",
        resourceType: 2053,
        bytes: Buffer.from("pwk", "utf-8")
      }
    ]);

    try {
      const current = buildSettingsRecord();
      current.paths.moduleDecompiledPath = moduleRoot;
      current.paths.modulePackedPath = "";
      current.paths.hakDirectoryPath = hakRoot;
      current.paths.vanillaDataPath = vanillaRoot;
      repository.get.mockResolvedValue(current);
      packedModuleExtractor.extractFromPackedModule.mockImplementation(
        async (modulePackedPath) => {
          if (modulePackedPath !== hakPath) {
            throw new Error(`Unexpected packed source: ${modulePackedPath}`);
          }
          return [
            {
              fileName: "h_fire.dds",
              resourceType: 2033,
              bytes: Buffer.from([7, 8, 9])
            },
            {
              fileName: "readme.txt",
              resourceType: 10,
              bytes: Buffer.from("ignored", "utf-8")
            }
          ];
        }
      );
      moduleBlobStorage.replaceModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-new",
        previousModuleHash: "hash-old",
        status: "updated",
        uploadedFiles: 6,
        uploadedBytes: 1000,
        deletedFiles: 0,
        deletedBytes: 0,
        unchangedFiles: 0,
        totalFiles: 6
      });

      const result = await service.syncModuleBlobCache("admin.user");

      expect(packedModuleExtractor.extractFromPackedModule).toHaveBeenCalledWith(hakPath);
      expect(moduleBlobStorage.replaceModuleSnapshot).toHaveBeenCalledTimes(1);
      const uploadedFiles = moduleBlobStorage.replaceModuleSnapshot.mock.calls[0]![1];
      const uploadedNames = uploadedFiles.map((entry) => entry.fileName);
      expect(uploadedNames).toEqual(
        expect.arrayContaining([
          "module.ifo",
          "textures/m_module.dds",
          "__aurora/sources/hak/lc_core/h_fire.dds",
          "__aurora/sources/vanilla/textures/city/v_stone.tga",
          "__aurora/sources/vanilla/tilesets/tcn01.set",
          "__aurora/sources/vanilla/placeables.2da",
          "__aurora/sources/vanilla/models/plc_vanilla.mdl",
          "__aurora/sources/vanilla/walkmeshes/plc_vanilla.pwk",
          "__aurora/meta/texture-index.v1.json"
        ])
      );

      const textureIndexFile = uploadedFiles.find(
        (entry) => entry.fileName === "__aurora/meta/texture-index.v1.json"
      );
      expect(textureIndexFile).toBeDefined();
      const parsed = JSON.parse(
        textureIndexFile!.bytes.toString("utf-8")
      ) as {
        totalTextures: number;
        entries: Array<{ source: string; resref: string; objectKey: string }>;
        byResref: Record<string, Array<{ source: string }>>;
      };

      expect(parsed.totalTextures).toBe(3);
      expect(parsed.entries.map((entry) => entry.source).sort()).toEqual([
        "hak",
        "module",
        "vanilla"
      ]);
      expect(parsed.byResref["m_module"]![0]!.source).toBe("module");
      expect(parsed.byResref["h_fire"]![0]!.source).toBe("hak");
      expect(parsed.byResref["v_stone"]![0]!.source).toBe("vanilla");
      expect(parsed.entries.every((entry) => entry.objectKey.startsWith("modules/current/"))).toBe(
        true
      );

      expect(result.textures.uploadedTextureFiles).toBe(3);
      expect(result.textures.uploadedTextureBytes).toBe(8);
      expect(result.textures.moduleTextures).toBe(1);
      expect(result.textures.hakTextures).toBe(1);
      expect(result.textures.vanillaTextures).toBe(1);
      expect(result.textures.textureIndexObjectKey).toBe(
        "modules/current/__aurora/meta/texture-index.v1.json"
      );
    } finally {
      await rm(moduleRoot, { recursive: true, force: true });
      await rm(hakRoot, { recursive: true, force: true });
      await rm(vanillaRoot, { recursive: true, force: true });
    }
  });

  it("syncs vanilla tileset SET sources without rebuilding the full module snapshot", async () => {
    const vanillaRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-vanilla-tilesets-"));
    await writeFakeKeyBif(vanillaRoot, [
      {
        resref: "tcn01",
        resourceType: 2013,
        bytes: Buffer.from("[TILE15]\nModel=tcn01_a01_01", "utf-8")
      }
    ]);

    try {
      const current = buildSettingsRecord();
      current.paths.vanillaDataPath = vanillaRoot;
      current.sources.tile.includeVanilla = true;
      repository.get.mockResolvedValue(current);
      const putModuleObject = moduleBlobStorage.putModuleObject as jest.MockedFunction<
        NonNullable<ModuleBlobStoragePort["putModuleObject"]>
      >;
      putModuleObject.mockImplementation(async (_settings, file) => ({
        key: `modules/current/${file.fileName}`,
        size: file.bytes.length,
        etag: "etag-tcn01"
      }));

      const result = await service.syncVanillaTilesetSetSources("admin.user");

      expect(result).toMatchObject({
        mode: "vanilla-tileset-set-source-sync",
        settingsRevision: 7,
        triggeredBy: "admin.user",
        enabled: true,
        uploadedFiles: 1,
        uploadedBytes: Buffer.byteLength("[TILE15]\nModel=tcn01_a01_01")
      });
      expect(result.files).toEqual([
        {
          fileName: "__aurora/sources/vanilla/tilesets/tcn01.set",
          objectKey: "modules/current/__aurora/sources/vanilla/tilesets/tcn01.set",
          size: Buffer.byteLength("[TILE15]\nModel=tcn01_a01_01"),
          resourceType: 2013,
          etag: "etag-tcn01"
        }
      ]);
      expect(moduleBlobStorage.replaceModuleSnapshot).not.toHaveBeenCalled();
      expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledWith(
        current.blobStorage,
        expect.objectContaining({
          fileName: "__aurora/sources/vanilla/tilesets/tcn01.set",
          resourceType: 2013,
          bytes: Buffer.from("[TILE15]\nModel=tcn01_a01_01", "utf-8")
        })
      );
    } finally {
      await rm(vanillaRoot, { recursive: true, force: true });
    }
  });

  it("syncs requested vanilla tile model source assets without rebuilding the full module snapshot", async () => {
    const vanillaRoot = await mkdtemp(join(tmpdir(), "aurora-runtime-vanilla-tile-models-"));
    const mdlBytes = Buffer.from("tile-mdl", "utf-8");
    const wokBytes = Buffer.from("tile-wok", "utf-8");
    await writeFakeKeyBif(vanillaRoot, [
      {
        resref: "tcn01_c01_01",
        resourceType: 2002,
        bytes: mdlBytes
      },
      {
        resref: "tcn01_c01_01",
        resourceType: 2016,
        bytes: wokBytes
      }
    ]);

    try {
      const current = buildSettingsRecord();
      current.paths.vanillaDataPath = vanillaRoot;
      current.sources.tile.includeVanilla = true;
      repository.get.mockResolvedValue(current);
      const putModuleObject = moduleBlobStorage.putModuleObject as jest.MockedFunction<
        NonNullable<ModuleBlobStoragePort["putModuleObject"]>
      >;
      putModuleObject.mockImplementation(async (_settings, file) => ({
        key: `modules/current/${file.fileName}`,
        size: file.bytes.length,
        etag: `etag-${file.resourceType}`
      }));

      const result = await service.syncVanillaTileModelSources("admin.user", [
        "TCN01_C01_01",
        "missing_model",
        "tcn01_c01_01"
      ]);

      expect(result).toMatchObject({
        mode: "vanilla-tile-model-source-sync",
        settingsRevision: 7,
        triggeredBy: "admin.user",
        enabled: true,
        requestedModelResRefs: ["missing_model", "tcn01_c01_01"],
        missingModelResRefs: ["missing_model"],
        uploadedFiles: 2,
        uploadedBytes: mdlBytes.length + wokBytes.length
      });
      expect(result.files).toEqual([
        {
          fileName: "__aurora/sources/vanilla/models/tcn01_c01_01.mdl",
          objectKey: "modules/current/__aurora/sources/vanilla/models/tcn01_c01_01.mdl",
          size: mdlBytes.length,
          resourceType: 2002,
          etag: "etag-2002"
        },
        {
          fileName: "__aurora/sources/vanilla/walkmeshes/tcn01_c01_01.wok",
          objectKey:
            "modules/current/__aurora/sources/vanilla/walkmeshes/tcn01_c01_01.wok",
          size: wokBytes.length,
          resourceType: 2016,
          etag: "etag-2016"
        }
      ]);
      expect(moduleBlobStorage.replaceModuleSnapshot).not.toHaveBeenCalled();
      expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledWith(
        current.blobStorage,
        expect.objectContaining({
          fileName: "__aurora/sources/vanilla/models/tcn01_c01_01.mdl",
          resourceType: 2002,
          bytes: mdlBytes
        })
      );
      expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledWith(
        current.blobStorage,
        expect.objectContaining({
          fileName: "__aurora/sources/vanilla/walkmeshes/tcn01_c01_01.wok",
          resourceType: 2016,
          bytes: wokBytes
        })
      );
    } finally {
      await rm(vanillaRoot, { recursive: true, force: true });
    }
  });

  it("skips targeted vanilla tileset SET source sync when vanilla tile sources are disabled", async () => {
    const current = buildSettingsRecord();
    current.sources.tile.includeVanilla = false;
    current.sources.tile.includeHaks = false;
    repository.get.mockResolvedValue(current);

    const result = await service.syncVanillaTilesetSetSources("admin.user");

    expect(result).toMatchObject({
      mode: "vanilla-tileset-set-source-sync",
      enabled: false,
      uploadedFiles: 0,
      uploadedBytes: 0,
      files: [],
      skippedReason: "tile_set_sources_disabled"
    });
    expect(moduleBlobStorage.putModuleObject).not.toHaveBeenCalled();
    expect(moduleBlobStorage.replaceModuleSnapshot).not.toHaveBeenCalled();
  });

  it("skips targeted vanilla tile model source sync when vanilla tile sources are disabled", async () => {
    const current = buildSettingsRecord();
    current.sources.tile.includeVanilla = false;
    current.sources.tile.includeHaks = false;
    repository.get.mockResolvedValue(current);

    const result = await service.syncVanillaTileModelSources("admin.user", [
      "tcn01_c01_01"
    ]);

    expect(result).toMatchObject({
      mode: "vanilla-tile-model-source-sync",
      enabled: false,
      requestedModelResRefs: ["tcn01_c01_01"],
      missingModelResRefs: ["tcn01_c01_01"],
      uploadedFiles: 0,
      uploadedBytes: 0,
      files: [],
      skippedReason: "tile_model_sources_disabled"
    });
    expect(moduleBlobStorage.putModuleObject).not.toHaveBeenCalled();
    expect(moduleBlobStorage.replaceModuleSnapshot).not.toHaveBeenCalled();
  });
});

async function writeFakeKeyBif(
  root: string,
  resources: Array<{ resref: string; resourceType: number; bytes: Buffer }>
): Promise<void> {
  const bifFileName = "vanilla_test.bif";
  const bif = buildFakeBif(resources);
  const key = buildFakeKey(bifFileName, bif.length, resources);
  await writeFile(join(root, bifFileName), bif);
  await writeFile(join(root, "nwn_base.key"), key);
}

function buildFakeBif(
  resources: Array<{ resref: string; resourceType: number; bytes: Buffer }>
): Buffer {
  const headerSize = 20;
  const entrySize = 16;
  const tableSize = resources.length * entrySize;
  const dataOffset = headerSize + tableSize;
  const totalSize = dataOffset + resources.reduce((sum, resource) => sum + resource.bytes.length, 0);
  const buffer = Buffer.alloc(totalSize);
  buffer.write("BIFF", 0, "ascii");
  buffer.write("V1  ", 4, "ascii");
  buffer.writeUInt32LE(resources.length, 8);
  buffer.writeUInt32LE(0, 12);
  buffer.writeUInt32LE(headerSize, 16);

  let cursor = dataOffset;
  resources.forEach((resource, index) => {
    const entryOffset = headerSize + index * entrySize;
    buffer.writeUInt32LE(index, entryOffset);
    buffer.writeUInt32LE(cursor, entryOffset + 4);
    buffer.writeUInt32LE(resource.bytes.length, entryOffset + 8);
    buffer.writeUInt32LE(resource.resourceType, entryOffset + 12);
    resource.bytes.copy(buffer, cursor);
    cursor += resource.bytes.length;
  });

  return buffer;
}

function buildFakeKey(
  bifFileName: string,
  bifSize: number,
  resources: Array<{ resref: string; resourceType: number; bytes: Buffer }>
): Buffer {
  const fileTableOffset = 64;
  const fileTableEntrySize = 12;
  const keyTableOffset = fileTableOffset + fileTableEntrySize;
  const keyEntrySize = 22;
  const fileNameOffset = keyTableOffset + resources.length * keyEntrySize;
  const fileNameBytes = Buffer.from(`${bifFileName}\0`, "ascii");
  const buffer = Buffer.alloc(fileNameOffset + fileNameBytes.length);

  buffer.write("KEY ", 0, "ascii");
  buffer.write("V1  ", 4, "ascii");
  buffer.writeUInt32LE(1, 8);
  buffer.writeUInt32LE(resources.length, 12);
  buffer.writeUInt32LE(fileTableOffset, 16);
  buffer.writeUInt32LE(keyTableOffset, 20);
  buffer.writeUInt32LE(bifSize, fileTableOffset);
  buffer.writeUInt32LE(fileNameOffset, fileTableOffset + 4);
  buffer.writeUInt16LE(fileNameBytes.length, fileTableOffset + 8);
  buffer.writeUInt16LE(0, fileTableOffset + 10);
  fileNameBytes.copy(buffer, fileNameOffset);

  resources.forEach((resource, index) => {
    const entryOffset = keyTableOffset + index * keyEntrySize;
    const resrefBytes = Buffer.from(resource.resref.toLowerCase().slice(0, 16), "ascii");
    resrefBytes.copy(buffer, entryOffset);
    buffer.writeUInt16LE(resource.resourceType, entryOffset + 16);
    buffer.writeUInt32LE(index, entryOffset + 18);
  });

  return buffer;
}

function buildSettingsRecord(): RuntimeSettingsRecord {
  return {
    revision: 7,
    updatedAt: "2026-05-23T12:00:00.000Z",
    updatedBy: "admin.user",
    paths: {
      ...POC_PATHS
    },
    blobStorage: {
      endpoint: "http://localhost:8333",
      region: "us-east-1",
      bucket: "aurora-module-assets",
      modulePrefix: "modules/current",
      accessKeyId: "seaweedfs",
      secretAccessKey: "seaweedfs-secret",
      forcePathStyle: true
    },
    telemetryDebugMode: "full",
    hakProfiles: {
      lc_core: ["lc_core.hak"],
      lc_models: [
        "lc_2da.hak",
        "lc_placeable.hak",
        "lc_placeable_cust.hak",
        "lc_hd_plcbls.hak",
        "q_placeables.hak",
        "cep3_core0.hak",
        "nwic_placeables.hak"
      ],
      lc_tiles: ["lc_tiles.hak"],
      lc_audio: ["lc_sounds.hak", "npc_sounds.hak"],
      lc_vfx: ["lc_2da.hak", "lc_vfx.hak", "cep3_vfx.hak"]
    },
    sources: {
      placeable: baseSource(),
      tile: baseSource(),
      area: baseSource(),
      sound: {
        ...baseSource(),
        includeVanilla: false
      },
      vfx: {
        ...baseSource(),
        hakProfileId: "lc_vfx"
      }
    },
    benchmarkCandidates: {
      placeableHeavyNoVfx: baseCandidate("c_wingsmeph", 659, 16, 0),
      placeableHeavyVfx: baseCandidate("ad_top_lion_1", 798, 28, 1),
      placeableVfxPlcAlternative: baseCandidate("plc_x02", 112, 5, 3),
      doorHeavyInstance: baseCandidate(
        "tn_sdoor_14",
        250,
        10,
        0,
        "wnd_slms_swamp__with_placeables",
        12
      ),
      doorHeavySingleMesh: {
        ...baseCandidate(
          "tn_gdoor_05",
          190,
          6,
          0,
          "wnd_slms_swamp__with_placeables",
          8
        ),
        metrics: {
          triangles: 190,
          meshes: 6,
          emitters: 0,
          maxSingleMeshTriangles: 102
        }
      }
    }
  };
}

function baseSource() {
  return {
    includeModuleTemp0: true,
    includeModulePacked: false,
    includeHaks: true,
    includeVanilla: true,
    hakProfileId: "lc_core",
    hakPriorityList: []
  };
}

function baseCandidate(
  resref: string,
  triangles: number,
  meshes: number,
  emitters: number,
  areaResref?: string,
  doorIndex?: number
) {
  return {
    resref,
    metrics: {
      triangles,
      meshes,
      emitters
    },
    context: {
      source: areaResref ? "area-data" : "scene.json",
      areaResref,
      doorIndex
    }
  };
}

function createModuleIfoGff(hakNames: string[]): Buffer {
  const normalizedNames = hakNames.map((name) => name.toString().trim());
  const labels = ["Mod_HakList", "Mod_Hak"];
  const fieldData: Buffer[] = [];
  const itemFieldOffsets: number[] = [];
  const itemFieldIndexOffset = 1;

  for (let itemIndex = 0; itemIndex < normalizedNames.length; itemIndex += 1) {
    const item = Buffer.from(normalizedNames[itemIndex], "utf8");
    const data = Buffer.alloc(4 + item.length);
    data.writeUInt32LE(item.length, 0);
    item.copy(data, 4);
    fieldData.push(data);
    itemFieldOffsets.push(0);
  }

  const header = Buffer.alloc(56);
  const structCount = 1 + normalizedNames.length;
  const fieldCount = 1 + normalizedNames.length;
  const structTableSize = structCount * 12;
  const fieldTableSize = fieldCount * 12;
  const labelTableSize = labels.length * 16;

  const listIndexEntries = Buffer.alloc(4 + 4 * normalizedNames.length);
  listIndexEntries.writeUInt32LE(normalizedNames.length, 0);
  for (let index = 0; index < normalizedNames.length; index += 1) {
    listIndexEntries.writeUInt32LE(index + 1, 4 + index * 4);
  }

  let fieldDataOffset = 56 + structTableSize + fieldTableSize + labelTableSize;
  const listFieldOffsets: number[] = [];
  let cursor = 0;
  for (let i = 0; i < fieldData.length; i += 1) {
    listFieldOffsets.push(cursor);
    cursor += fieldData[i]!.length;
  }
  itemFieldOffsets.splice(0, itemFieldOffsets.length, ...listFieldOffsets);

  const fieldsBuffer = Buffer.alloc(fieldTableSize);
  fieldsBuffer.writeUInt32LE(15, 0);
  fieldsBuffer.writeUInt32LE(0, 4);
  fieldsBuffer.writeUInt32LE(0, 8);
  for (let i = 0; i < normalizedNames.length; i += 1) {
    const fieldOffset = 12 * (i + 1);
    fieldsBuffer.writeUInt32LE(10, fieldOffset);
    fieldsBuffer.writeUInt32LE(1, fieldOffset + 4);
    fieldsBuffer.writeUInt32LE(itemFieldOffsets[i], fieldOffset + 8);
  }

  const labelsBuffer = Buffer.alloc(labelTableSize);
  for (let i = 0; i < labels.length; i += 1) {
    const labelBuffer = Buffer.alloc(16);
    labelBuffer.write(labels[i], 0, "ascii");
    labelBuffer.copy(labelsBuffer, i * 16);
  }

  const structsBuffer = Buffer.alloc(structTableSize);
  structsBuffer.writeUInt32LE(1, 0); // root struct
  structsBuffer.writeUInt32LE(0, 4);
  structsBuffer.writeUInt32LE(1, 8);
  for (let i = 0; i < normalizedNames.length; i += 1) {
    const structOffset = (i + 1) * 12;
    structsBuffer.writeUInt32LE(1, structOffset);
    structsBuffer.writeUInt32LE(itemFieldIndexOffset + i, structOffset + 4);
    structsBuffer.writeUInt32LE(1, structOffset + 8);
  }

  header.write("GFF ", 0, "ascii");
  header.write("V3.2", 4, "ascii");
  header.writeUInt32LE(56, 8); // struct offset
  header.writeUInt32LE(structCount, 12);
  header.writeUInt32LE(56 + structTableSize, 16); // field offset
  header.writeUInt32LE(fieldCount, 20);
  header.writeUInt32LE(56 + structTableSize + fieldTableSize, 24); // label offset
  header.writeUInt32LE(labels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.reduce((size, value) => size + value.length, 0), 36);
  header.writeUInt32LE(0, 40);
  header.writeUInt32LE(0, 44);
  header.writeUInt32LE(56 + structTableSize + fieldTableSize + labelTableSize + fieldData.reduce((size, value) => size + value.length, 0), 48);
  header.writeUInt32LE(listIndexEntries.length, 52);

  return Buffer.concat([
    header,
    structsBuffer,
    fieldsBuffer,
    labelsBuffer,
    ...fieldData,
    listIndexEntries
  ]);
}
