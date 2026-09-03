import { createHash } from "node:crypto";
import { ModuleSnapshotTemplateCatalogRepository } from
  "../../src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository";
import type {
  ModuleBlobObjectPayload,
  ModuleBlobStoragePort,
} from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from
  "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";

describe("effective Area loading-screen repository", () => {
  it("resolves the strongest table, physical rows, and strongest effective TGA", async () => {
    const tableKey = "modules/current/loadscreens.2da";
    const tableBytes = Buffer.from([
      "2DA V2.0",
      "Label ScriptingName BMPResRef TileSet StrRef",
      "10 Random **** **** **** 63402",
      "77 City AREA_TRANSITION_CITY LS_CITY_01 TCN01 ****",
      "91 Missing AREA_TRANSITION_MISSING LS_MISSING TCN01 ****",
    ].join("\n"), "utf8");
    const moduleImageKey = "modules/current/ls_city_01.tga";
    const moduleImageBytes = Buffer.from("strong-module-tga", "utf8");
    const weakerHakImageKey =
      "modules/current/__aurora/sources/hak/cep/ls_city_01.tga";
    const weakerHakImageBytes = Buffer.from("weaker-hak-tga", "utf8");
    const payloads = new Map<string, ModuleBlobObjectPayload>([
      [tableKey, payload(tableKey, tableBytes, "text/plain")],
      [moduleImageKey, payload(moduleImageKey, moduleImageBytes, "image/x-tga")],
      [weakerHakImageKey, payload(weakerHakImageKey, weakerHakImageBytes, "image/x-tga")],
    ]);
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      settingsRepository(),
      storage(payloads),
    );

    const catalog = await repository.resolveEffectiveAreaLoadingScreenCatalog();
    expect(catalog).toEqual({
      schemaVersion: "area-loading-screen-catalog.v1",
      descriptor: {
        resourceName: "loadscreens.2da",
        sourceObjectKey: tableKey,
        sourceLayer: "module",
        sha256: createHash("sha256").update(tableBytes).digest("hex"),
        sizeBytes: tableBytes.length,
        rowCount: 3,
      },
      rows: [
        {
          rowIndex: 0,
          sourceRowId: 10,
          label: "Random",
          strRef: 63402,
          displayName: "Row 0",
          displaySource: "row_index",
          toolsetSelectable: false,
        },
        {
          rowIndex: 1,
          sourceRowId: 77,
          label: "City",
          imageResRef: "LS_CITY_01",
          tileSetResRef: "TCN01",
          displayName: "City",
          displaySource: "label",
          toolsetSelectable: true,
          imageAsset: {
            resourceName: "ls_city_01.tga",
            sourceObjectKey: moduleImageKey,
            sourceLayer: "module",
            sha256: createHash("sha256").update(moduleImageBytes).digest("hex"),
            sizeBytes: moduleImageBytes.length,
          },
        },
        {
          rowIndex: 2,
          sourceRowId: 91,
          label: "Missing",
          imageResRef: "LS_MISSING",
          tileSetResRef: "TCN01",
          displayName: "Missing",
          displaySource: "label",
          toolsetSelectable: false,
        },
      ],
    });
    const second = await repository.resolveEffectiveAreaLoadingScreenCatalog();
    expect(second).toEqual(catalog);
    expect(second).not.toBe(catalog);
    expect(second!.rows).not.toBe(catalog!.rows);
    expect(second!.rows[1]!.imageAsset).not.toBe(catalog!.rows[1]!.imageAsset);
  });

  it("does not fall through to a weaker table when the strongest source is malformed", async () => {
    const moduleKey = "modules/current/loadscreens.2da";
    const vanillaKey =
      "modules/current/__aurora/sources/vanilla/nwn_base.key/loadscreens.2da";
    const moduleBytes = Buffer.from([
      "2DA V2.0", "Label BMPResRef TileSet", "0 Broken ls_x tcn01",
    ].join("\n"), "utf8");
    const vanillaBytes = Buffer.from([
      "2DA V2.0", "Label BMPResRef TileSet StrRef", "0 Valid ls_x tcn01 1",
    ].join("\n"), "utf8");
    const payloads = new Map<string, ModuleBlobObjectPayload>([
      [moduleKey, payload(moduleKey, moduleBytes, "text/plain")],
      [vanillaKey, payload(vanillaKey, vanillaBytes, "text/plain")],
    ]);
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      settingsRepository(),
      storage(payloads),
    );

    await expect(repository.resolveEffectiveAreaLoadingScreenCatalog()).resolves.toBeNull();
  });

  it("ignores non-contract external fixture layers instead of letting them shadow a HAK", async () => {
    const externalTableKey = "modules/current/__aurora/sources/aaa/loadscreens.2da";
    const hakTableKey = "modules/current/__aurora/sources/hak/cep/loadscreens.2da";
    const externalImageKey = "modules/current/__aurora/sources/aaa/ls_hak.tga";
    const hakImageKey = "modules/current/__aurora/sources/hak/cep/ls_hak.tga";
    const hakTableBytes = Buffer.from([
      "2DA V2.0", "Label BMPResRef TileSet StrRef", "0 Default LS_HAK **** ****",
    ].join("\n"), "utf8");
    const hakImageBytes = Buffer.from("hak-image", "utf8");
    const payloads = new Map<string, ModuleBlobObjectPayload>([
      [externalTableKey, payload(externalTableKey, Buffer.from("invalid"), "text/plain")],
      [hakTableKey, payload(hakTableKey, hakTableBytes, "text/plain")],
      [externalImageKey, payload(externalImageKey, Buffer.from("external"), "image/x-tga")],
      [hakImageKey, payload(hakImageKey, hakImageBytes, "image/x-tga")],
    ]);
    const repository = new ModuleSnapshotTemplateCatalogRepository(
      settingsRepository(),
      storage(payloads),
    );

    const catalog = await repository.resolveEffectiveAreaLoadingScreenCatalog();
    expect(catalog?.descriptor).toMatchObject({
      sourceObjectKey: hakTableKey,
      sourceLayer: "hak",
    });
    expect(catalog?.rows[0]?.imageAsset).toMatchObject({
      sourceObjectKey: hakImageKey,
      sourceLayer: "hak",
      sha256: createHash("sha256").update(hakImageBytes).digest("hex"),
    });
  });
});

function payload(key: string, bytes: Buffer, contentType: string): ModuleBlobObjectPayload {
  return { key, bytes, size: bytes.length, contentType };
}

function storage(
  payloads: ReadonlyMap<string, ModuleBlobObjectPayload>,
): jest.Mocked<ModuleBlobStoragePort> {
  const objects = [...payloads.values()].map(({ key, size }) => ({ key, size }));
  return {
    replaceModuleSnapshot: jest.fn(),
    listModuleSnapshot: jest.fn().mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current",
      moduleHash: "loading-screen-test",
      totalFiles: objects.length,
      totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
      objects,
      truncated: false,
    }),
    getModuleObject: jest.fn(async (_settings, key) => payloads.get(key) ?? null),
  };
}

function settingsRepository(): jest.Mocked<RuntimeSettingsRepositoryPort> {
  const source = {
    includeModuleTemp0: true,
    includeModulePacked: false,
    includeHaks: false,
    includeVanilla: false,
    hakProfileId: "",
    hakPriorityList: [],
  };
  return {
    get: jest.fn().mockResolvedValue({
      revision: 1,
      updatedAt: "2026-08-24T00:00:00.000Z",
      updatedBy: "test",
      paths: {
        vanillaDataPath: "",
        hakDirectoryPath: "",
        moduleDecompiledPath: "",
        modulePackedPath: "",
        tlkBasePath: "",
        tlkCustomPath: "",
      },
      blobStorage: {
        endpoint: "http://seaweedfs:8333",
        region: "us-east-1",
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current",
        accessKeyId: "seaweedfs",
        secretAccessKey: "secret",
        forcePathStyle: true,
      },
      telemetryDebugMode: "off",
      hakProfiles: {},
      sources: {
        placeable: { ...source },
        tile: { ...source },
        area: { ...source },
        sound: { ...source },
      },
      benchmarkCandidates: {
        placeableHeavyNoVfx: benchmark(),
        placeableHeavyVfx: benchmark(),
        placeableVfxPlcAlternative: benchmark(),
        doorHeavyInstance: benchmark(),
        doorHeavySingleMesh: benchmark(),
      },
    }),
    save: jest.fn(),
  };
}

function benchmark() {
  return {
    resref: "",
    metrics: { triangles: 0, meshes: 0, emitters: 0 },
    context: { source: "test" },
  };
}
