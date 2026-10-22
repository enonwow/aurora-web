import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppException } from "../../src/common/http/app-exception";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import {
  CatalogApplicationService,
  compactPlaceableProcessingResultForCacheAdmission,
  compactPlaceableRenderPackageForViewportBatch,
  selectCanonicalRuntimeSourceEmitters
} from "../../src/modules/catalog/application/catalog.application.service";
import type {
  PlaceableProcessingCachePort,
  PlaceableProcessingResult
} from "../../src/modules/catalog/application/ports/placeable-processing-cache.port";
import type { TemplateCatalogRepositoryPort } from "../../src/modules/catalog/application/ports/template-catalog-repository.port";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { DerivedAssetGeneratorPort } from "../../src/modules/runtime-settings/application/ports/derived-asset-generator.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { RuntimeSettingsRecord } from "../../src/modules/runtime-settings/domain/runtime-settings.types";
import { NWN_KEY_BIF_RESOURCE_TYPES } from "../../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { convertAuroraAsciiMdlToGlb } from "../../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../src/modules/runtime-settings/domain/derived-asset-versions";
import { parseTemplateBlueprintFromGff } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { serializeCreatureBlueprintToUtcGff } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-utc-writer";
import { serializeItemBlueprintToUtiGff } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAuroraItpPalette } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-itp-palette-parser";
import type {
  PlaceableRenderPackage,
  TemplateListResult,
  TemplateProcessingResult,
  TemplateRecord
} from "../../src/modules/catalog/domain/template.types";

const MULTI_TEXTURE_PLACEABLE_ASCII_MDL = `
newmodel plc_multi
beginmodelgeom plc_multi
node trimesh mesh_wood
  parent plc_multi
  texture0 tx_wood
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
node trimesh mesh_metal
  parent plc_multi
  bitmap tx_metal
  verts 3
    0 0 1
    1 0 1
    0 1 1
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom plc_multi
`;
const RETAIL_ITEMPALSTD_ITP_PATH =
  "C:/Projects/New Folder/item-retail-extract/itp/itempalstd.itp";

describe("CatalogApplicationService", () => {
  it("publishes a versioned cache hydration contract when viewport VFX frames are deferred", () => {
    const renderPackage = {
      status: "ready",
      diagnostics: [],
      assetRefs: {},
      auroraVfxPayload: {
        version: "aurora-vfx-payload/v1",
        contracts: {
          runtimeEmitters: [
            { emitterNodeName: "fire", runtimeFrames: [{ timeSeconds: 0 }] },
            { emitterNodeName: "smoke", runtimeFrames: [{ timeSeconds: 0 }] }
          ],
          renderContract: { emitterNodeName: "fire" }
        }
      }
    } as PlaceableRenderPackage;

    const compact = compactPlaceableRenderPackageForViewportBatch(
      renderPackage,
      "cache_shared"
    );
    const contracts = (
      compact?.auroraVfxPayload as {
        contracts: Record<string, unknown>;
      }
    ).contracts;

    expect(contracts.runtimeEmitters).toEqual([]);
    expect(contracts.runtimeEmittersDeferred).toBe(true);
    expect(contracts.runtimeEmittersHydration).toEqual({
      version: "aurora-vfx-runtime-emitter-hydration/v1",
      status: "deferred",
      source: "placeable-processing-cache",
      cacheKey: "cache_shared",
      expectedEmitterCount: 2,
      hydrationPath: "/api/v1/catalog/placeables/cache/cache_shared"
    });
    expect(
      (
        (renderPackage.auroraVfxPayload as { contracts: { runtimeEmitters: unknown[] } })
          .contracts.runtimeEmitters
      )
    ).toHaveLength(2);
  });

  it("compacts only cached VFX simulation frames while preserving delivery metadata", () => {
    const value = {
      templateId: "plc_large_vfx",
      resref: "plc_large_vfx",
      name: "Large VFX",
      category: "placeables",
      placeableSubtype: "vfx",
      render: {
        backendType: "vfx",
        frontendType: "placeable",
        rendererPreset: "vfx-emitter",
        isDoor: false,
        isVfx: true
      },
      benchmarkCandidate: false,
      metadata: {},
      assetManifest: buildEmptyManifest(),
      renderPackage: {
        status: "ready",
        diagnostics: [],
        assetRefs: {},
        auroraVfxPayload: {
          version: "aurora-vfx-payload/v1",
          contracts: {
            runtimeEmitters: [
              { emitterNodeName: "fire", runtimeFrames: [{ timeSeconds: 0 }] }
            ]
          }
        }
      },
      classification: {
        source: "template",
        normalizedSubtype: "vfx",
        mismatchWithTemplate: false
      },
      processedAt: "2026-08-18T19:00:00.000Z"
    } as unknown as PlaceableProcessingResult;

    const compact = compactPlaceableProcessingResultForCacheAdmission(
      value,
      "cache_large_vfx"
    );

    expect(compact).not.toBe(value);
    expect(compact.assetManifest).toBe(value.assetManifest);
    expect(compact.renderPackage?.assetRefs).toBe(value.renderPackage?.assetRefs);
    expect(
      (compact.renderPackage?.auroraVfxPayload as {
        contracts: { runtimeEmitters: unknown[]; runtimeEmittersDeferred: boolean };
      }).contracts
    ).toMatchObject({ runtimeEmitters: [], runtimeEmittersDeferred: true });
    expect(
      (value.renderPackage?.auroraVfxPayload as {
        contracts: { runtimeEmitters: unknown[] };
      }).contracts.runtimeEmitters
    ).toHaveLength(1);
  });

  it("preserves the exact cache value when there are no VFX frames to compact", () => {
    const value = {
      templateId: "plc_non_vfx_cache_value",
      renderPackage: {
        status: "ready",
        diagnostics: [],
        assetRefs: {}
      }
    } as unknown as PlaceableProcessingResult;

    expect(
      compactPlaceableProcessingResultForCacheAdmission(
        value,
        "cache_non_vfx"
      )
    ).toBe(value);
  });

  it("excludes animation-only duplicate emitter shells from canonical runtime packaging", () => {
    const emitters = [
      {
        source: "aurora-mdl-binary",
        sourceModelFileName: "plc_i06.mdl",
        sourceModelObjectKey: "runtime-source/vanilla/nwn_base.key/plc_i06.mdl",
        nodeName: "OmenEmitter250",
        texture: "fxpa_flame00",
        emitterType: "Fountain"
      },
      {
        source: "aurora-mdl-binary",
        sourceModelFileName: "plc_i06.mdl",
        sourceModelObjectKey: "runtime-source/vanilla/nwn_base.key/plc_i06.mdl",
        nodeName: "fire!52",
        texture: "fxpa_smoke01",
        emitterType: "Fountain"
      },
      {
        source: "aurora-mdl-binary",
        sourceModelFileName: "plc_i06.mdl",
        sourceModelObjectKey: "runtime-source/vanilla/nwn_base.key/plc_i06.mdl",
        nodeName: "OmenEmitter250",
        simulation: { birthrate: 6 }
      },
      {
        source: "aurora-mdl-binary",
        sourceModelFileName: "plc_i06.mdl",
        sourceModelObjectKey: "runtime-source/vanilla/nwn_base.key/plc_i06.mdl",
        nodeName: "fire!52",
        simulation: { birthrate: 20 }
      }
    ] as NonNullable<PlaceableRenderPackage["auroraEmitter"]>["emitters"];

    expect(selectCanonicalRuntimeSourceEmitters(emitters)).toEqual([
      emitters[0],
      emitters[1]
    ]);
  });

  let repository: jest.Mocked<TemplateCatalogRepositoryPort>;
  let placeableCache: jest.Mocked<PlaceableProcessingCachePort>;
  let service: CatalogApplicationService;

  beforeEach(() => {
    repository = {
      listByKind: jest.fn(),
      findByKindAndId: jest.fn(),
      findByKindAndResref: jest.fn()
    };
    placeableCache = {
      get: jest.fn(),
      set: jest.fn()
    };
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-08-18T19:00:00.000Z",
      hits: 0,
      retained: true
    }));
    service = new CatalogApplicationService(repository, placeableCache);
  });

  it("returns a physical Appearance page only for the requested current table digest", async () => {
    const descriptor = {
      resourceName: "placeables.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/placeables.2da",
      sourceLayer: "vanilla" as const,
      sha256: "a".repeat(64),
      sizeBytes: 3019695,
      rowCount: 16500,
    };
    repository.listEffectivePlaceablesTwoDaRows = jest.fn().mockResolvedValue({
      descriptor,
      items: [{ rowIndex: 104, displayName: "Water Trough", displaySource: "strref", strRef: 5747, label: "WaterTrough" }],
      total: 1,
      limit: 100,
      offset: 0,
    });

    await expect(service.listPlaceableAppearanceRows({
      tableSha256: descriptor.sha256,
      query: "water",
      limit: 100,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "placeables.2da",
      sha256: descriptor.sha256,
      rowCount: 16500,
      items: [{ rowIndex: 104, displayName: "Water Trough", displaySource: "strref", strRef: 5747, label: "WaterTrough" }],
      total: 1,
      limit: 100,
      offset: 0,
    });

    await expect(service.listPlaceableAppearanceRows({
      tableSha256: "b".repeat(64),
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_TABLE_STALE" });
  });

  it("fails closed when the effective Appearance table is unavailable", async () => {
    repository.listEffectivePlaceablesTwoDaRows = jest.fn().mockResolvedValue(null);
    await expect(service.listPlaceableAppearanceRows({
      tableSha256: "a".repeat(64),
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_TABLE_NOT_FOUND" });
  });

  it("returns digest-bound physical Waypoint Appearance rows", async () => {
    const descriptor = {
      resourceName: "waypoint.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/waypoint.2da",
      sourceLayer: "vanilla" as const,
      sha256: "f".repeat(64),
      sizeBytes: 272,
      rowCount: 5,
    };
    repository.listEffectiveWaypointTwoDaRows = jest.fn().mockResolvedValue({
      descriptor,
      items: [{
        rowIndex: 1,
        label: "blue",
        modelResRef: "gi_waypoint01",
        strRef: 67281,
        displayName: "Blue marker",
        displaySource: "strref",
      }],
      total: 1,
      limit: 100,
      offset: 0,
    });

    await expect(service.listWaypointAppearanceRows({
      tableSha256: descriptor.sha256,
      query: "blue",
      limit: 100,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "waypoint.2da",
      sha256: descriptor.sha256,
      rowCount: 5,
      items: [{
        rowIndex: 1,
        label: "blue",
        modelResRef: "gi_waypoint01",
        strRef: 67281,
        displayName: "Blue marker",
        displaySource: "strref",
      }],
      total: 1,
      limit: 100,
      offset: 0,
    });

    await expect(service.listWaypointAppearanceRows({
      tableSha256: "e".repeat(64),
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({ code: "WAYPOINT_APPEARANCE_TABLE_STALE" });
  });

  it("fails closed when the effective Waypoint Appearance table is unavailable", async () => {
    repository.listEffectiveWaypointTwoDaRows = jest.fn().mockResolvedValue(null);
    await expect(service.listWaypointAppearanceRows({
      tableSha256: "f".repeat(64),
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({ code: "WAYPOINT_APPEARANCE_TABLE_NOT_FOUND" });
  });

  it("returns only Toolset-admitted Creature Appearance rows for the current digest", async () => {
    const descriptor = {
      resourceName: "appearance.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
      sourceLayer: "vanilla" as const,
      sha256: "c".repeat(64),
      sizeBytes: 200_000,
      rowCount: 1_000,
    };
    repository.listEffectiveCreatureAppearanceTwoDaRows = jest.fn().mockResolvedValue({
      descriptor,
      items: [{
        rowIndex: 249,
        displayName: "Dwarf, Male",
        displaySource: "strref",
        strRef: 1234,
        label: "DwarfMale",
      }],
      total: 1,
      limit: 100,
      offset: 0,
    });

    await expect(service.listCreatureAppearanceRows({
      tableSha256: descriptor.sha256,
      query: "dwarf",
      limit: 100,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "appearance.2da",
      sha256: descriptor.sha256,
      rowCount: 1_000,
      items: [{
        rowIndex: 249,
        displayName: "Dwarf, Male",
        displaySource: "strref",
        strRef: 1234,
        label: "DwarfMale",
      }],
      total: 1,
      limit: 100,
      offset: 0,
    });

    await expect(service.listCreatureAppearanceRows({
      tableSha256: "d".repeat(64),
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({
      code: "CREATURE_APPEARANCE_TABLE_STALE",
      details: [],
    });
  });

  it("fails closed when the effective Creature Appearance table is unavailable", async () => {
    repository.listEffectiveCreatureAppearanceTwoDaRows = jest.fn().mockResolvedValue(null);
    await expect(service.listCreatureAppearanceRows({
      tableSha256: "a".repeat(64),
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({ code: "CREATURE_APPEARANCE_TABLE_NOT_FOUND" });
  });

  it("returns digest-bound Toolset-admitted Creature Gender rows and exact lookup", async () => {
    const descriptor = {
      resourceName: "gender.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/gender.2da",
      sourceLayer: "vanilla" as const,
      sha256: "e".repeat(64),
      sizeBytes: 250,
      rowCount: 5,
    };
    const row = {
      rowIndex: 3,
      displayName: "Other",
      displaySource: "strref" as const,
      nameStrRef: 201,
      genderToken: "O",
      constant: "GENDER_OTHER",
    };
    repository.listEffectiveCreatureGenderTwoDaRows = jest.fn().mockResolvedValue({
      descriptor,
      items: [row],
      total: 1,
      limit: 100,
      offset: 0,
    });
    repository.resolveEffectiveCreatureGenderTwoDaRow = jest.fn().mockResolvedValue({
      descriptor,
      row,
    });

    await expect(service.listCreatureGenderRows({
      tableSha256: descriptor.sha256,
      query: "other",
      limit: 100,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "gender.2da",
      sha256: descriptor.sha256,
      rowCount: 5,
      items: [row],
      total: 1,
      limit: 100,
      offset: 0,
    });
    await expect(service.listCreatureGenderRows({
      tableSha256: descriptor.sha256,
      rowIndex: 3,
      limit: 1,
      offset: 0,
    })).resolves.toMatchObject({ items: [row], total: 1 });
    await expect(service.listCreatureGenderRows({
      tableSha256: "f".repeat(64),
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({ code: "CREATURE_GENDER_TABLE_STALE" });
  });

  it("returns member-specific digest-bound Creature appendage rows", async () => {
    const descriptor = {
      resourceName: "wingmodel.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/wingmodel.2da",
      sourceLayer: "vanilla" as const,
      sha256: "9".repeat(64),
      sizeBytes: 500,
      rowCount: 8,
    };
    const row = { rowIndex: 3, displayName: "Angel" };
    repository.listEffectiveCreatureAppendageTwoDaRows = jest.fn().mockResolvedValue({
      descriptor,
      items: [row],
      total: 1,
      limit: 100,
      offset: 0,
    });
    repository.resolveEffectiveCreatureAppendageTwoDaRow = jest.fn().mockResolvedValue({
      descriptor,
      row,
    });

    await expect(service.listCreatureAppendageRows({
      kind: "wings",
      tableSha256: descriptor.sha256,
      query: "angel",
      limit: 100,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "wingmodel.2da",
      sha256: descriptor.sha256,
      rowCount: 8,
      items: [row],
      total: 1,
      limit: 100,
      offset: 0,
    });
    expect(repository.listEffectiveCreatureAppendageTwoDaRows).toHaveBeenCalledWith(
      "wingmodel.2da",
      { query: "angel", limit: 100, offset: 0 },
    );
    await expect(service.listCreatureAppendageRows({
      kind: "tail",
      tableSha256: descriptor.sha256,
      rowIndex: 3,
      limit: 1,
      offset: 0,
    })).rejects.toMatchObject({ code: "CREATURE_APPENDAGE_TABLE_MISMATCH" });
    await expect(service.listCreatureAppendageRows({
      kind: "wings",
      tableSha256: "8".repeat(64),
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({ code: "CREATURE_APPENDAGE_TABLE_STALE" });
  });

  it("returns only digest-bound native Toolset PerceptionRange rows", async () => {
    const descriptor = {
      resourceName: "ranges.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/ranges.2da",
      sourceLayer: "vanilla" as const,
      sha256: "e".repeat(64),
      sizeBytes: 1220,
      rowCount: 12,
    };
    const rows = [
      { rowIndex: 8 as const, displayName: "Short", displaySource: "strref" as const, nameStrRef: 6668 },
      { rowIndex: 9 as const, displayName: "Medium", displaySource: "strref" as const, nameStrRef: 6669 },
      { rowIndex: 10 as const, displayName: "Long", displaySource: "strref" as const, nameStrRef: 6670 },
      { rowIndex: 11 as const, displayName: "Default", displaySource: "strref" as const, nameStrRef: 6671 },
    ];
    repository.resolveEffectiveCreaturePerceptionRangesTwoDaTable =
      jest.fn().mockResolvedValue({ descriptor, rows });

    await expect(service.listCreaturePerceptionRangeRows({
      tableSha256: descriptor.sha256,
      query: "medium",
      limit: 16,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "ranges.2da",
      sha256: descriptor.sha256,
      rowCount: 12,
      items: [rows[1]],
      total: 1,
      limit: 16,
      offset: 0,
    });
    await expect(service.listCreaturePerceptionRangeRows({
      tableSha256: descriptor.sha256,
      rowIndex: 11,
      limit: 1,
      offset: 0,
    })).resolves.toMatchObject({ items: [rows[3]], total: 1 });
    await expect(service.listCreaturePerceptionRangeRows({
      tableSha256: "f".repeat(64),
      limit: 16,
      offset: 0,
    })).rejects.toMatchObject({ code: "CREATURE_PERCEPTION_RANGE_TABLE_STALE" });
  });

  it("returns only digest-bound positive Toolset WalkRate rows", async () => {
    const descriptor = {
      resourceName: "creaturespeed.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/creaturespeed.2da",
      sourceLayer: "vanilla" as const,
      sha256: "d".repeat(64),
      sizeBytes: 4_096,
      rowCount: 9,
    };
    const rows = [
      {
        rowIndex: 1,
        displayName: "Immobile",
        displaySource: "strref" as const,
        nameStrRef: 1001,
        twoDaName: "IMMOBILE",
      },
      {
        rowIndex: 4,
        displayName: "Normal",
        displaySource: "strref" as const,
        nameStrRef: 1004,
        twoDaName: "NORM",
      },
    ];
    repository.resolveEffectiveCreatureWalkRatesTwoDaTable =
      jest.fn().mockResolvedValue({ descriptor, rows });

    await expect(service.listCreatureWalkRateRows({
      tableSha256: descriptor.sha256,
      query: "normal",
      limit: 100,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "creaturespeed.2da",
      sha256: descriptor.sha256,
      rowCount: 9,
      items: [rows[1]],
      total: 1,
      limit: 100,
      offset: 0,
    });
    await expect(service.listCreatureWalkRateRows({
      tableSha256: descriptor.sha256,
      rowIndex: 4,
      limit: 1,
      offset: 0,
    })).resolves.toMatchObject({ items: [rows[1]], total: 1 });
    await expect(service.listCreatureWalkRateRows({
      tableSha256: "f".repeat(64),
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({ code: "CREATURE_WALK_RATE_TABLE_STALE" });
  });

  it("returns only digest-bound sparse Toolset SoundSetFile rows", async () => {
    const descriptor = {
      resourceName: "soundset.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
      sourceLayer: "vanilla" as const,
      sha256: "a".repeat(64),
      sizeBytes: 336_678,
      rowCount: 5_100,
    };
    const rows = [
      {
        rowIndex: 0,
        displayName: "Aasimar",
        displaySource: "strref" as const,
        nameStrRef: 8291,
        resRef: "c_aasimar",
      },
      {
        rowIndex: 27,
        displayName: "Custom Dragon",
        displaySource: "label" as const,
        nameStrRef: null,
        resRef: "c_dragon",
      },
    ];
    repository.resolveEffectiveCreatureSoundSetsTwoDaTable =
      jest.fn().mockResolvedValue({ descriptor, rows });

    await expect(service.listCreatureSoundSetRows({
      tableSha256: descriptor.sha256,
      query: "dragon",
      limit: 100,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "soundset.2da",
      sha256: descriptor.sha256,
      rowCount: 5_100,
      items: [rows[1]],
      total: 1,
      limit: 100,
      offset: 0,
    });
    await expect(service.listCreatureSoundSetRows({
      tableSha256: descriptor.sha256,
      rowIndex: 0,
      limit: 1,
      offset: 0,
    })).resolves.toMatchObject({ items: [rows[0]], total: 1 });
    await expect(service.listCreatureSoundSetRows({
      tableSha256: descriptor.sha256,
      query: "c_aasimar",
      limit: 1,
      offset: 0,
    })).resolves.toMatchObject({ items: [rows[0]], total: 1 });
    await expect(service.listCreatureSoundSetRows({
      tableSha256: "f".repeat(64),
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({ code: "CREATURE_SOUND_SET_TABLE_STALE" });
  });

  it("returns only digest- and ClassList-bound sparse StartingPackage rows", async () => {
    const descriptor = {
      resourceName: "packages.2da" as const,
      sourceObjectKey: "runtime-source/module/packages.2da",
      sourceLayer: "module" as const,
      sha256: "b".repeat(64),
      sizeBytes: 200,
      rowCount: 5,
    };
    const rows = [
      { rowIndex: 0, classId: 4, displayName: "Fighter", displaySource: "strref" as const, nameStrRef: 100 },
      { rowIndex: 1, classId: 2, displayName: "Cleric", displaySource: "strref" as const, nameStrRef: 101 },
      { rowIndex: 4, classId: 4, displayName: "Fighter Commander", displaySource: "label" as const, nameStrRef: null },
    ];
    repository.resolveEffectiveCreatureStartingPackagesTwoDaTable =
      jest.fn().mockResolvedValue({ descriptor, rows });

    await expect(service.listCreatureStartingPackageRows({
      tableSha256: descriptor.sha256,
      classIds: [4],
      query: "commander",
      limit: 100,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "packages.2da",
      sha256: descriptor.sha256,
      rowCount: 5,
      classIds: [4],
      items: [rows[2]],
      total: 1,
      limit: 100,
      offset: 0,
    });
    await expect(service.listCreatureStartingPackageRows({
      tableSha256: descriptor.sha256,
      classIds: [4],
      rowIndex: 0,
      limit: 1,
      offset: 0,
    })).resolves.toMatchObject({ items: [rows[0]], total: 1 });
    await expect(service.listCreatureStartingPackageRows({
      tableSha256: descriptor.sha256,
      classIds: [2],
      rowIndex: 0,
      limit: 1,
      offset: 0,
    })).resolves.toMatchObject({ items: [], total: 0 });
    await expect(service.listCreatureStartingPackageRows({
      tableSha256: "f".repeat(64),
      classIds: [4],
      limit: 100,
      offset: 0,
    })).rejects.toMatchObject({ code: "CREATURE_STARTING_PACKAGE_TABLE_STALE" });
  });

  it("resolves one exact Toolset-admitted Creature Appearance row for the current digest", async () => {
    const descriptor = {
      resourceName: "appearance.2da" as const,
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
      sourceLayer: "vanilla" as const,
      sha256: "c".repeat(64),
      sizeBytes: 200_000,
      rowCount: 1_000,
    };
    repository.resolveEffectiveCreatureAppearanceTwoDaRow = jest.fn().mockResolvedValue({
      descriptor,
      row: {
        rowIndex: 249,
        displayName: "Dwarf, Male",
        displaySource: "strref",
        strRef: 1234,
        label: "DwarfMale",
      },
    });
    repository.listEffectiveCreatureAppearanceTwoDaRows = jest.fn();

    await expect(service.listCreatureAppearanceRows({
      tableSha256: descriptor.sha256,
      rowIndex: 249,
      limit: 1,
      offset: 0,
    })).resolves.toEqual({
      resourceName: "appearance.2da",
      sha256: descriptor.sha256,
      rowCount: 1_000,
      items: [{
        rowIndex: 249,
        displayName: "Dwarf, Male",
        displaySource: "strref",
        strRef: 1234,
        label: "DwarfMale",
      }],
      total: 1,
      limit: 1,
      offset: 0,
    });
    expect(repository.listEffectiveCreatureAppearanceTwoDaRows).not.toHaveBeenCalled();
  });

  it("resolves item palette folder labels through the base TLK", async () => {
    let itempalstdBytes: Buffer;
    try {
      itempalstdBytes = await readFile(RETAIL_ITEMPALSTD_ITP_PATH);
    } catch {
      return;
    }

    const tempDir = await mkdtemp(join(tmpdir(), "aurora-item-palette-tlk-"));
    try {
      const tlkPath = join(tempDir, "dialog.tlk");
      await writeFile(tlkPath, buildItemPaletteTestTlkBuffer({ 335: "Resolved Palette Root" }));
      const runtimeSettings = buildRuntimeSettingsRecord();
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue({
          ...runtimeSettings,
          paths: {
            ...runtimeSettings.paths,
            tlkBasePath: tlkPath
          }
        }),
        save: jest.fn()
      };
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(async (_settings, key) =>
          key.endsWith("itempalstd.itp")
            ? {
                key,
                size: itempalstdBytes.length,
                contentType: "application/octet-stream",
                bytes: itempalstdBytes
              }
            : null
        )
      };
      const serviceWithPaletteSource = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithPaletteSource.getItemPaletteTree();

      expect(result.activeSource).toBe("itempalstd");
      expect(result.roots[0]).toMatchObject({
        strRef: 335,
        label: "Resolved Palette Root"
      });
      expect(result.roots[0]?.children[0]?.children[0]).toMatchObject({
        kind: "leaf",
        resRef: "nw_cloth027"
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("writes module-backed itempalcus.itp custom item palettes", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleObjects = new Map<string, Buffer>();
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(async (_settings, key) => {
        const bytes = moduleObjects.get(key);
        return bytes
          ? {
              key,
              size: bytes.length,
              contentType: "application/octet-stream",
              etag: `etag-${key}`,
              bytes
            }
          : null;
      }),
      putModuleObject: jest.fn(async (settings, file) => {
        const key = `${settings.modulePrefix}/${file.fileName}`;
        moduleObjects.set(key, file.bytes);
        return {
          key,
          size: file.bytes.length,
          etag: `etag-${file.fileName}`
        };
      })
    };
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithStorage.writeCustomItemPalette({
      roots: [
        {
          label: "Custom Weapons",
          children: [
            {
              label: "Bronze Dagger",
              resRef: "CNR_B_DAGGER",
              id: 11
            }
          ]
        }
      ]
    });

    expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      expect.objectContaining({
        fileName: "itempalcus.itp",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.ITP,
        bytes: expect.any(Buffer)
      })
    );
    expect(result).toMatchObject({
      palette: {
        resref: "itempalcus",
        objectKey: "modules/current/itempalcus.itp",
        sourceFileType: "ITP ",
        sourceFileVersion: "V3.2",
        rootCount: 1,
        leafCount: 1,
        folderCount: 1
      },
      tree: {
        activeSource: "itempalcus",
        leafCount: 1,
        roots: [
          {
            kind: "folder",
            label: "Custom Weapons",
            children: [
              {
                kind: "leaf",
                label: "Bronze Dagger",
                resRef: "cnr_b_dagger"
              }
            ]
          }
        ]
      }
    });

    const written = (moduleBlobStorage.putModuleObject as jest.Mock).mock.calls[0]?.[1]
      .bytes as Buffer;
    expect(parseAuroraItpPalette(written)).toMatchObject({
      sourceFileType: "ITP ",
      leafCount: 1,
      roots: [
        {
          label: "Custom Weapons",
          children: [{ resRef: "cnr_b_dagger" }]
        }
      ]
    });

    const treeAfterWrite = await serviceWithStorage.getItemPaletteTree();

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/itempalcus.itp"
    );
    expect(treeAfterWrite).toMatchObject({
      activeSource: "itempalcus",
      leafCount: 1
    });
    expect(treeAfterWrite.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          resref: "itempalcus",
          selected: true
        })
      ])
    );
  });

  it("loads baseitems.2da rows for item type selection", async () => {
    const result = await service.getItemBaseItems();
    if (result.count === 0) {
      return;
    }

    expect(result.count).toBeGreaterThanOrEqual(100);
    expect(result.items).toHaveLength(result.count);
    expect(result.items[0]).toMatchObject({
      baseItem: 0,
      label: "shortsword",
      itemClass: "wswss",
      modelType: "wswss",
      defaultIcon: "iwswss",
      invSlotWidth: 1,
      invSlotHeight: 2,
      equipableSlots: "0x1C030",
      baseCost: 10,
      storePanel: 1,
      storePanelSort: 19,
      reqFeats: [45, 50]
    });
  });

  it("updates and deletes module-backed item UTI blueprints", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-item-blueprint-lifecycle",
        totalFiles: 0,
        totalBytes: 0,
        objects: [],
        truncated: false,
        continuationToken: undefined
      }),
      getModuleObject: jest.fn().mockResolvedValue({
        key: "modules/current/test_item.uti",
        size: 32,
        contentType: "application/octet-stream",
        etag: "existing-item",
        bytes: Buffer.from("existing")
      }),
      putModuleObject: jest.fn(),
      deleteModuleObject: jest.fn().mockResolvedValue(true)
    };
    const putModuleObject =
      moduleBlobStorage.putModuleObject as jest.MockedFunction<
        NonNullable<ModuleBlobStoragePort["putModuleObject"]>
      >;
    putModuleObject.mockImplementation(async (settings, file) => ({
      key: `${settings.modulePrefix}/${file.fileName}`,
      size: file.bytes.length,
      etag: `etag-${file.fileName}`
    }));
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-06-30T10:21:00.000Z",
      hits: 0
    }));
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const updated = await serviceWithStorage.updateItemBlueprint("TEST_ITEM", {
      templateResRef: "ignored_body_resref",
      name: "Updated Item",
      localizedNameStrRef: 12840,
      tag: "UPDATED_ITEM",
      description: "Updated description",
      descriptionStrRef: 2001,
      identifiedDescription: "Updated identified description",
      identifiedDescriptionStrRef: 2002,
      baseItem: 22,
      modelPart1: 11,
      modelPart2: 13,
      modelPart3: 63,
      stackSize: 1,
      identified: true,
      armorContext: {
        modelPrefix: "pfh2_",
        label: "human-female-phenotype2",
        gender: 1,
        phenotype: 2,
        raceModel: "human"
      },
      materialColors: {
        metal1: 8
      },
      propertyList: [
        {
          propertyName: 15,
          subtype: 66,
          costTable: 3,
          costValue: 1,
          chanceAppear: 100
        }
      ],
      variableListEntries: [
        { name: " duplicate ", type: "int", value: -7 },
        { name: "duplicate", type: "float", value: Math.fround(1.25) },
        { name: "duplicate", type: "string", value: " exact value " }
      ],
      overwrite: false
    });

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/test_item.uti"
    );
    expect(putModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      expect.objectContaining({
        fileName: "test_item.uti",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTI
      })
    );
    const written = putModuleObject.mock.calls[0]?.[1].bytes;
    const parsed = parseTemplateBlueprintFromGff(written as Buffer);
    expect(parsed).toMatchObject({
      sourceFileType: "UTI ",
      templateResRef: "test_item",
      localizedName: "Updated Item",
      localizedNameStrRef: 12840,
      tag: "UPDATED_ITEM",
      description: "Updated description",
      descriptionStrRef: 2001,
      identifiedDescription: "Updated identified description",
      identifiedDescriptionStrRef: 2002,
      baseItem: 22,
      modelPart1: 11,
      modelPart2: 13,
      modelPart3: 63,
      stackSize: 1,
      metal1Color: 8,
      itemPropertyListEntries: [{
        propertyName: 15,
        subtype: 66,
        costTable: 3,
        costValue: 1,
        chanceAppear: 100
      }],
      variableListEntries: [
        { name: " duplicate ", type: "int", value: -7 },
        { name: "duplicate", type: "float", value: 1.25 },
        { name: "duplicate", type: "string", value: " exact value " }
      ]
    });
    expect(updated).toMatchObject({
      blueprint: {
        templateId: "itm_test_item",
        resref: "test_item",
        name: "Updated Item",
        objectKey: "modules/current/test_item.uti",
        sourceFileType: "UTI ",
        sourceFileVersion: "V3.2"
      },
      item: {
        templateId: "itm_test_item",
        resref: "test_item",
        metadata: expect.objectContaining({
          itemArmorPreviewModelPrefix: "pfh2_",
          itemArmorPreviewContextLabel: "human-female-phenotype2",
          itemArmorPreviewGender: 1,
          itemArmorPreviewPhenotype: 2,
          itemArmorPreviewRaceModel: "human",
          itemPropertyListEntries: expect.any(String),
          variableListCount: 3,
          variableListEntries: JSON.stringify([
            { name: " duplicate ", type: "int", value: -7 },
            { name: "duplicate", type: "float", value: 1.25 },
            { name: "duplicate", type: "string", value: " exact value " }
          ])
        }),
        itemRuntime: expect.objectContaining({
          visual: expect.objectContaining({
            armorPreviewContext: {
              modelPrefix: "pfh2_",
              sourceKey: "item-armor-preview.human-female-phenotype2.ArmorPart",
              label: "human-female-phenotype2",
              gender: 1,
              phenotype: 2,
              raceModel: "human"
            }
          })
        })
      }
    });

    const deleted = await serviceWithStorage.deleteItemBlueprint("TEST_ITEM");

    expect(moduleBlobStorage.deleteModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/test_item.uti"
    );
    expect(deleted).toEqual({
      resref: "test_item",
      objectKey: "modules/current/test_item.uti",
      deleted: true
    });
  });

  it("creates an Item UTI only from exact effective nested inventory references", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn(),
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-item-nested-authoring",
        totalFiles: 0,
        totalBytes: 0,
        objects: [],
        truncated: false,
      }),
      getModuleObject: jest.fn().mockResolvedValue(null),
      putModuleObject: jest.fn(async (settings, file) => ({
        key: `${settings.modulePrefix}/${file.fileName}`,
        size: file.bytes.length,
        etag: `etag-${file.fileName}`,
      })),
      deleteModuleObject: jest.fn(),
    };
    const dependencyResRefs = ["itm_potion", "itm_scroll", "itm_ring"];
    const dependencies = new Map(dependencyResRefs.map((resref) => {
      const bytes = serializeItemBlueprintToUtiGff({
        templateResRef: resref,
        localizedName: resref,
        tag: resref.toUpperCase(),
        baseItem: 0,
      });
      return [resref, {
        bytes,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        sourceObjectKey: `runtime-source/vanilla/${resref}.uti`,
      }] as const;
    }));
    repository.findByKindAndResref.mockImplementation(async (kind, resref) => {
      const dependency = dependencies.get(resref);
      return kind === "item" && dependency
        ? {
            templateId: `itm_${resref}`,
            kind: "item",
            resref,
            name: resref,
            category: "items",
            tags: [],
            previewImageUrl: "",
            metadata: {
              sourceObjectKey: dependency.sourceObjectKey,
              sourceSha256: dependency.sha256,
              sourceSizeBytes: dependency.bytes.length,
              sourceExtension: "uti",
              sourceFileType: "UTI ",
              sourceFileVersion: "V3.2",
              sourceStructTypeId: 0xffffffff,
            },
          }
        : null;
    });
    repository.resolveEffectiveTemplateBlueprint = jest.fn(async (request) => {
      const dependency = dependencies.get(request.templateId.replace(/^itm_/u, ""));
      return dependency
        ? {
            kind: "item",
            templateId: request.templateId,
            resref: request.templateId.replace(/^itm_/u, ""),
            sourceObjectKey: dependency.sourceObjectKey,
            sha256: dependency.sha256,
            bytes: Buffer.from(dependency.bytes),
          }
        : null;
    });
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
    );

    const result = await serviceWithStorage.createItemBlueprint({
      templateResRef: "nested_bag",
      name: "Nested Bag",
      baseItem: 16,
      inventoryItemListEntries: [
        { resRef: "itm_potion", x: 3, y: 4 },
        { resRef: "itm_scroll", x: 5, y: 6 },
      ],
      equipItemListEntries: [{ resRef: "itm_ring", slotMask: 4 }],
      overwrite: false,
    });

    expect(repository.findByKindAndResref).toHaveBeenCalledTimes(3);
    expect(repository.resolveEffectiveTemplateBlueprint).toHaveBeenCalledTimes(3);
    const written = (moduleBlobStorage.putModuleObject as jest.Mock).mock.calls[0]?.[1]
      .bytes as Buffer;
    expect(parseTemplateBlueprintFromGff(written)).toMatchObject({
      inventoryItemListEntries: [
        { resRef: "itm_potion", x: 3, y: 4 },
        { resRef: "itm_scroll", x: 5, y: 6 },
      ],
      equipItemListEntries: [{ resRef: "itm_ring", slotMask: 4 }],
    });
    expect(result.item.metadata).toEqual(expect.objectContaining({
      sourceSha256: createHash("sha256").update(written).digest("hex"),
      inventoryItemListCount: 2,
      equipItemListCount: 1,
      inventoryItemListEntries: JSON.stringify([
        { resRef: "itm_potion", x: 3, y: 4 },
        { resRef: "itm_scroll", x: 5, y: 6 },
      ]),
      equipItemListEntries: JSON.stringify([{ resRef: "itm_ring", slotMask: 4 }]),
    }));
  });

  it("fails closed before publishing missing or cyclic nested Item UTI references", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn(),
    };
    const missingStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn().mockResolvedValue(null),
      putModuleObject: jest.fn(),
      deleteModuleObject: jest.fn(),
    };
    repository.findByKindAndResref.mockResolvedValue(null);
    repository.resolveEffectiveTemplateBlueprint = jest.fn();
    const missingService = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      missingStorage,
    );

    await expect(missingService.createItemBlueprint({
      templateResRef: "missing_bag",
      name: "Missing Bag",
      baseItem: 16,
      inventoryItemListEntries: [{ resRef: "itm_missing", x: 0, y: 0 }],
      overwrite: false,
    })).rejects.toMatchObject({
      code: "ITEM_BLUEPRINT_REFERENCE_INVALID",
      details: [{ path: "inventoryItemListEntries.0.resRef" }],
    });
    expect(missingStorage.putModuleObject).not.toHaveBeenCalled();
    expect(repository.resolveEffectiveTemplateBlueprint).not.toHaveBeenCalled();

    const childBytes = serializeItemBlueprintToUtiGff({
      templateResRef: "itm_child",
      localizedName: "Child",
      tag: "ITM_CHILD",
      baseItem: 0,
    });
    const childSha256 = createHash("sha256").update(childBytes).digest("hex");
    const rootBytes = serializeItemBlueprintToUtiGff({
      templateResRef: "cycle_bag",
      localizedName: "Cycle Bag",
      tag: "CYCLE_BAG",
      baseItem: 16,
    });
    const rootSha256 = createHash("sha256").update(rootBytes).digest("hex");
    repository.findByKindAndResref.mockResolvedValue({
      templateId: "itm_itm_child",
      kind: "item",
      resref: "itm_child",
      name: "Child",
      category: "items",
      tags: [],
      previewImageUrl: "",
      metadata: {
        sourceObjectKey: "runtime-source/vanilla/itm_child.uti",
        sourceSha256: childSha256,
        sourceSizeBytes: childBytes.length,
        sourceExtension: "uti",
        sourceFileType: "UTI ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
    repository.resolveEffectiveTemplateBlueprint = jest.fn().mockResolvedValue({
      kind: "item",
      templateId: "itm_itm_child",
      resref: "itm_child",
      sourceObjectKey: "runtime-source/vanilla/itm_child.uti",
      sha256: childSha256,
      bytes: childBytes,
      dependencies: [{
        templateResRef: "cycle_bag",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTI,
        sha256: rootSha256,
        bytes: rootBytes,
      }],
    });
    const cyclicStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn().mockResolvedValue({
        key: "modules/current/cycle_bag.uti",
        size: rootBytes.length,
        contentType: "application/octet-stream",
        bytes: rootBytes,
      }),
      putModuleObject: jest.fn(),
      deleteModuleObject: jest.fn(),
    };
    const cyclicService = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      cyclicStorage,
    );

    await expect(cyclicService.updateItemBlueprint("cycle_bag", {
      templateResRef: "ignored_by_update",
      name: "Cycle Bag",
      baseItem: 16,
      inventoryItemListEntries: [{ resRef: "itm_child", x: 0, y: 0 }],
      overwrite: true,
    })).rejects.toMatchObject({
      code: "ITEM_BLUEPRINT_REFERENCE_CYCLE",
      details: [{ path: "inventoryItemListEntries.0.resRef" }],
    });
    expect(cyclicStorage.putModuleObject).not.toHaveBeenCalled();
  });

  it("updates and deletes module-backed creature UTC blueprints", async () => {
    const existingCreatureBytes = serializeCreatureBlueprintToUtcGff({
      templateResRef: "test_creature",
      firstName: "Before",
      tag: "TEST_CREATURE"
    });
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-creature-blueprint-lifecycle",
        totalFiles: 0,
        totalBytes: 0,
        objects: [],
        truncated: false,
        continuationToken: undefined
      }),
      getModuleObject: jest.fn().mockResolvedValue({
        key: "modules/current/test_creature.utc",
        size: existingCreatureBytes.length,
        contentType: "application/octet-stream",
        etag: "existing-creature",
        bytes: existingCreatureBytes
      }),
      putModuleObject: jest.fn(),
      deleteModuleObject: jest.fn().mockResolvedValue(true)
    };
    const putModuleObject =
      moduleBlobStorage.putModuleObject as jest.MockedFunction<
        NonNullable<ModuleBlobStoragePort["putModuleObject"]>
      >;
    putModuleObject.mockImplementation(async (settings, file) => ({
      key: `${settings.modulePrefix}/${file.fileName}`,
      size: file.bytes.length,
      etag: `etag-${file.fileName}`
    }));
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-07-10T09:30:00.000Z",
      hits: 0
    }));
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const updated = await serviceWithStorage.updateCreatureBlueprint("TEST_CREATURE", {
      templateResRef: "ignored_body_resref",
      name: "Test Creature",
      blueprint: {
        firstName: "Test",
        lastName: "Creature",
        tag: "TEST_CREATURE",
        appearanceId: 6,
        gender: 1,
        race: 6,
        phenotype: 2,
        challengeRating: 2.5,
        strength: 16,
        classListEntries: [
          {
            classId: 1,
            level: 3,
            knownSpells: [{ spellId: 7, spellLevel: 1 }]
          }
        ],
        inventoryItemListEntries: [
          {
            resRef: "nw_it_mpotion001",
            x: 2,
            y: 3,
            dropable: true
          }
        ],
        scripts: {
          onHeartbeat: "test_hb"
        }
      },
      overwrite: false
    });

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/test_creature.utc"
    );
    expect(putModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      expect.objectContaining({
        fileName: "test_creature.utc",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTC
      })
    );
    const written = putModuleObject.mock.calls[0]?.[1].bytes;
    expect(parseTemplateBlueprintFromGff(written as Buffer)).toMatchObject({
      sourceFileType: "UTC ",
      templateResRef: "test_creature",
      firstName: "Test",
      lastName: "Creature",
      appearanceId: 6,
      challengeRating: 2.5,
      scripts: {
        scriptheartbeat: "test_hb"
      },
      inventoryItemListCount: 1
    });
    expect(updated).toMatchObject({
      blueprint: {
        templateId: "cre_test_creature",
        resref: "test_creature",
        objectKey: "modules/current/test_creature.utc",
        sourceFileType: "UTC ",
        sourceFileVersion: "V3.2"
      },
      creature: {
        templateId: "cre_test_creature",
        resref: "test_creature"
      }
    });

    const deleted = await serviceWithStorage.deleteCreatureBlueprint("TEST_CREATURE");

    expect(moduleBlobStorage.deleteModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/test_creature.utc"
    );
    expect(deleted).toEqual({
      resref: "test_creature",
      objectKey: "modules/current/test_creature.utc",
      deleted: true
    });
  });

  it("renames a creature UTC without dropping preserved fields", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const existingBytes = serializeCreatureBlueprintToUtcGff({
      templateResRef: "old_guard",
      firstName: "Old Guard",
      tag: "OLD_GUARD",
      conversation: "guard_talk",
      scripts: { onHeartbeat: "guard_heartbeat" },
      variableListEntries: [{ name: "patrol_count", type: "int", value: 4 }]
    });
    const moduleObjects = new Map<string, Buffer>([
      ["modules/current/old_guard.utc", existingBytes]
    ]);
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        totalFiles: 1,
        totalBytes: existingBytes.length,
        objects: [],
        truncated: false
      }),
      getModuleObject: jest.fn(async (_settings, key) => {
        const bytes = moduleObjects.get(key);
        return bytes
          ? {
              key,
              size: bytes.length,
              contentType: "application/octet-stream",
              etag: `etag-${key}`,
              bytes
            }
          : null;
      }),
      putModuleObject: jest.fn(async (settings, file) => {
        const key = `${settings.modulePrefix}/${file.fileName}`;
        moduleObjects.set(key, file.bytes);
        return { key, size: file.bytes.length, etag: `etag-${file.fileName}` };
      }),
      deleteModuleObject: jest.fn(async (_settings, key) => moduleObjects.delete(key))
    };
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-07-10T10:00:00.000Z",
      hits: 0
    }));
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithStorage.renameCreatureBlueprint("old_guard", "new_guard");

    expect(moduleObjects.has("modules/current/old_guard.utc")).toBe(false);
    const renamedBytes = moduleObjects.get("modules/current/new_guard.utc");
    expect(parseTemplateBlueprintFromGff(renamedBytes as Buffer)).toMatchObject({
      templateResRef: "new_guard",
      firstName: "Old Guard",
      tag: "OLD_GUARD",
      conversation: "guard_talk",
      scripts: { scriptheartbeat: "guard_heartbeat" },
      variableListEntries: [{ name: "patrol_count", type: "int", value: 4 }]
    });
    expect(result).toMatchObject({
      previousResRef: "old_guard",
      previousObjectKey: "modules/current/old_guard.utc",
      blueprint: {
        resref: "new_guard",
        objectKey: "modules/current/new_guard.utc"
      }
    });
  });

  it("rolls back the new creature UTC when the previous resource cannot be deleted", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const existingBytes = serializeCreatureBlueprintToUtcGff({
      templateResRef: "old_guard",
      firstName: "Old Guard",
      tag: "OLD_GUARD"
    });
    const moduleObjects = new Map<string, Buffer>([
      ["modules/current/old_guard.utc", existingBytes]
    ]);
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(async (_settings, key) => {
        const bytes = moduleObjects.get(key);
        return bytes
          ? { key, size: bytes.length, contentType: "application/octet-stream", bytes }
          : null;
      }),
      putModuleObject: jest.fn(async (settings, file) => {
        const key = `${settings.modulePrefix}/${file.fileName}`;
        moduleObjects.set(key, file.bytes);
        return { key, size: file.bytes.length };
      }),
      deleteModuleObject: jest.fn(async (_settings, key) => {
        if (key.endsWith("old_guard.utc")) {
          return false;
        }
        return moduleObjects.delete(key);
      })
    };
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    await expect(serviceWithStorage.renameCreatureBlueprint("old_guard", "new_guard")).rejects.toMatchObject({
      code: "CREATURE_BLUEPRINT_RENAME_ROLLED_BACK"
    });
    expect(moduleObjects.has("modules/current/old_guard.utc")).toBe(true);
    expect(moduleObjects.has("modules/current/new_guard.utc")).toBe(false);
  });

  it("lists validated Creature resource options from the module snapshot", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const soundSetBytes = Buffer.from(
      "2DA V2.0\nDEFAULT: ****\nRESREF LABEL\n0 ss_guard Guard\n1 ss_orc Orc\n",
      "utf8"
    );
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        totalFiles: 5,
        totalBytes: soundSetBytes.length,
        objects: [
          { key: "modules/current/dialogs/guard_talk.dlg", size: 120 },
          { key: "modules/current/scripts/guard_heartbeat.ncs", size: 80 },
          { key: "modules/current/portraits/po_hm_guard.tga", size: 40 },
          { key: "modules/current/portraits/portrait_note.tga", size: 40 },
          { key: "modules/current/tables/soundset.2da", size: soundSetBytes.length }
        ],
        truncated: false
      }),
      getModuleObject: jest.fn(async (_settings, key) =>
        key.endsWith("soundset.2da")
          ? {
              key,
              size: soundSetBytes.length,
              contentType: "text/plain",
              bytes: soundSetBytes
            }
          : null
      )
    };
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    await expect(
      serviceWithStorage.listCreatureResourceOptions({ kind: "conversation", limit: 20 })
    ).resolves.toEqual({
      kind: "conversation",
      total: 1,
      items: [{ resRef: "guard_talk", label: "guard_talk" }]
    });
    await expect(
      serviceWithStorage.listCreatureResourceOptions({ kind: "script", limit: 20 })
    ).resolves.toEqual({
      kind: "script",
      total: 1,
      items: [{ resRef: "guard_heartbeat", label: "guard_heartbeat" }]
    });
    await expect(
      serviceWithStorage.listCreatureResourceOptions({ kind: "portrait", limit: 20 })
    ).resolves.toEqual({
      kind: "portrait",
      total: 1,
      items: [{ resRef: "po_hm_guard", label: "po_hm_guard" }]
    });
    await expect(
      serviceWithStorage.listCreatureResourceOptions({ kind: "soundset", limit: 20 })
    ).resolves.toEqual({
      kind: "soundset",
      total: 2,
      items: [
        { resRef: "ss_guard", label: "Guard", soundSetFile: 0 },
        { resRef: "ss_orc", label: "Orc", soundSetFile: 1 }
      ]
    });
  });

  it("creates module-backed store UTM blueprints", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn().mockResolvedValue(null),
      putModuleObject: jest.fn()
    };
    const putModuleObject =
      moduleBlobStorage.putModuleObject as jest.MockedFunction<
        NonNullable<ModuleBlobStoragePort["putModuleObject"]>
      >;
    putModuleObject.mockImplementation(async (settings, file) => ({
      key: `${settings.modulePrefix}/${file.fileName}`,
      size: file.bytes.length,
      etag: `etag-${file.fileName}`
    }));
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithStorage.createStoreBlueprint({
      resRef: "Test_Store",
      name: "Test Store",
      tag: "TEST_STORE",
      comments: "Store wizard test",
      markUp: 145,
      markDown: 35,
      blackMarket: true,
      bmMarkDown: 20,
      onOpenStore: "open_test_store",
      storeId: 7,
      storeListEntries: [
        {
          itemListEntries: [
            {
              resRef: "nw_it_mpotion021",
              x: 2,
              y: 3,
              infinite: true
            },
            {
              embeddedItem: {
                sourceStructTypeId: 0xffffffff,
                templateResRef: "emb_ring",
                localizedName: "Embedded Ring",
                tag: "EMB_RING",
                baseItem: 52
              },
              x: 4,
              y: 5,
              infinite: false
            }
          ]
        }
      ],
      willNotBuyBaseItems: [16],
      willOnlyBuyBaseItems: [22],
      overwrite: false
    });

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/test_store.utm"
    );
    expect(putModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      expect.objectContaining({
        fileName: "test_store.utm",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTM,
        bytes: expect.any(Buffer)
      })
    );

    const written = putModuleObject.mock.calls[0]?.[1].bytes;
    expect(written).toBeInstanceOf(Buffer);
    const parsed = parseTemplateBlueprintFromGff(written as Buffer);

    expect(parsed).toMatchObject({
      sourceFileType: "UTM ",
      templateResRef: "test_store",
      localizedName: "Test Store",
      tag: "TEST_STORE",
      markUp: 145,
      markDown: 35,
      blackMarket: true,
      bmMarkDown: 20,
      onOpenStore: "open_test_store",
      storeId: 7,
      storeListCount: 5,
      storeItemListTotal: 2,
      willNotBuyBaseItems: [16],
      willOnlyBuyBaseItems: [22]
    });
    expect(parsed?.storeListEntries?.[0]?.itemListEntries).toEqual([
      {
        resRef: "nw_it_mpotion021",
        x: 2,
        y: 3,
        infinite: true
      },
      {
        embeddedItem: {
          sourceStructTypeId: 0xffffffff,
          templateResRef: "emb_ring",
          tag: "EMB_RING",
          localizedName: "Embedded Ring",
          baseItem: 52,
          itemPropertyListCount: undefined,
          fieldCount: 4
        },
        x: 4,
        y: 5,
        infinite: false
      }
    ]);
    expect(result).toMatchObject({
      blueprint: {
        templateId: "str_test_store",
        resref: "test_store",
        name: "Test Store",
        objectKey: "modules/current/test_store.utm",
        sourceFileType: "UTM ",
        sourceFileVersion: "V3.2"
      },
      store: {
        templateId: "str_test_store",
        kind: "store",
        resref: "test_store",
        metadata: {
          sourceObjectKey: "modules/current/test_store.utm",
          sourceSizeBytes: (written as Buffer).length,
          sourceSha256: createHash("sha256").update(written as Buffer).digest("hex"),
          sourceExtension: "utm",
          sourceFileType: "UTM ",
          sourceFileVersion: "V3.2",
          sourceStructTypeId: 0xffffffff,
          sourceGeneratedBy: "aurora-web-store-wizard",
          storeListCount: 5,
          storeItemListTotal: 2,
          willNotBuyCount: 1,
          willOnlyBuyCount: 1
        }
      }
    });
  });

  it("updates and deletes module-backed store UTM blueprints", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn().mockResolvedValue({
        key: "modules/current/test_store.utm",
        size: 32,
        contentType: "application/octet-stream",
        etag: "existing-store",
        bytes: Buffer.from("existing")
      }),
      putModuleObject: jest.fn(),
      deleteModuleObject: jest.fn().mockResolvedValue(true)
    };
    const putModuleObject =
      moduleBlobStorage.putModuleObject as jest.MockedFunction<
        NonNullable<ModuleBlobStoragePort["putModuleObject"]>
      >;
    putModuleObject.mockImplementation(async (settings, file) => ({
      key: `${settings.modulePrefix}/${file.fileName}`,
      size: file.bytes.length,
      etag: `etag-${file.fileName}`
    }));
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const updated = await serviceWithStorage.updateStoreBlueprint("TEST_STORE", {
      resRef: "ignored_body_resref",
      name: "Updated Store",
      tag: "UPDATED_STORE",
      markUp: 175,
      markDown: 40,
      storeListEntries: [
        {
          bucketTypeId: 0,
          itemListEntries: [{ resRef: "nw_it_mpotion022", x: 1, y: 2 }]
        }
      ],
      overwrite: false
    });

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/test_store.utm"
    );
    expect(putModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      expect.objectContaining({
        fileName: "test_store.utm",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTM
      })
    );
    const written = putModuleObject.mock.calls[0]?.[1].bytes;
    const parsed = parseTemplateBlueprintFromGff(written as Buffer);
    expect(parsed).toMatchObject({
      sourceFileType: "UTM ",
      templateResRef: "test_store",
      localizedName: "Updated Store",
      tag: "UPDATED_STORE",
      markUp: 175,
      markDown: 40,
      storeItemListTotal: 1
    });
    expect(updated.blueprint).toMatchObject({
      templateId: "str_test_store",
      resref: "test_store",
      name: "Updated Store"
    });

    const deleted = await serviceWithStorage.deleteStoreBlueprint("TEST_STORE");

    expect(moduleBlobStorage.deleteModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/test_store.utm"
    );
    expect(deleted).toEqual({
      resref: "test_store",
      objectKey: "modules/current/test_store.utm",
      deleted: true
    });
  });

  it("creates module-backed placeable UTP blueprints with inventory ItemList", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn().mockResolvedValue(null),
      putModuleObject: jest.fn()
    };
    const putModuleObject =
      moduleBlobStorage.putModuleObject as jest.MockedFunction<
        NonNullable<ModuleBlobStoragePort["putModuleObject"]>
      >;
    putModuleObject.mockImplementation(async (settings, file) => ({
      key: `${settings.modulePrefix}/${file.fileName}`,
      size: file.bytes.length,
      etag: `etag-${file.fileName}`
    }));
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithStorage.createPlaceableBlueprint({
      templateResRef: "Test_Chest",
      name: "Test Chest",
      tag: "TEST_CHEST",
      comments: "Placeable wizard test",
      plot: true,
      useable: true,
      hasInventory: true,
      appearanceId: 204,
      inventoryItemListEntries: [
        {
          resRef: "nw_it_mpotion021",
          x: 2,
          y: 3,
          dropable: true,
          pickpocketable: false,
          infinite: true
        },
        {
          embeddedItem: {
            sourceStructTypeId: 0xffffffff,
            templateResRef: "emb_gem",
            localizedName: "Embedded Gem",
            tag: "EMB_GEM",
            baseItem: 21
          },
          x: 4,
          y: 5,
          dropable: true,
          pickpocketable: false,
          infinite: false
        }
      ],
      overwrite: false
    });

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/test_chest.utp"
    );
    expect(putModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      expect.objectContaining({
        fileName: "test_chest.utp",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTP,
        bytes: expect.any(Buffer)
      })
    );

    const written = putModuleObject.mock.calls[0]?.[1].bytes;
    const parsed = parseTemplateBlueprintFromGff(written as Buffer);

    expect(parsed).toMatchObject({
      sourceFileType: "UTP ",
      templateResRef: "test_chest",
      localizedName: "Test Chest",
      tag: "TEST_CHEST",
      comments: "Placeable wizard test",
      plot: true,
      useable: true,
      hasInventory: true,
      appearanceId: 204,
      inventoryItemListCount: 2,
      inventoryItemListEntries: [
        {
          resRef: "nw_it_mpotion021",
          x: 2,
          y: 3,
          dropable: true,
          pickpocketable: false,
          infinite: true
        },
        {
          embeddedItem: {
            sourceStructTypeId: 0xffffffff,
            templateResRef: "emb_gem",
            tag: "EMB_GEM",
            localizedName: "Embedded Gem",
            baseItem: 21,
            itemPropertyListCount: undefined,
            fieldCount: 4
          },
          x: 4,
          y: 5,
          dropable: true,
          pickpocketable: false,
          infinite: false
        }
      ]
    });
    expect(result).toMatchObject({
      blueprint: {
        templateId: "plc_test_chest",
        resref: "test_chest",
        name: "Test Chest",
        objectKey: "modules/current/test_chest.utp",
        sourceFileType: "UTP ",
        sourceFileVersion: "V3.2"
      },
      placeable: {
        templateId: "plc_test_chest",
        kind: "placeable",
        resref: "test_chest",
        tags: expect.arrayContaining(["container"]),
        metadata: {
          sourceGeneratedBy: "aurora-web-placeable-wizard",
          inventoryItemListCount: 2,
          hasInventory: true
        }
      }
    });
  });

  it("updates and deletes module-backed placeable UTP blueprints", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn().mockResolvedValue({
        key: "modules/current/test_chest.utp",
        size: 32,
        contentType: "application/octet-stream",
        etag: "existing-placeable",
        bytes: Buffer.from("existing")
      }),
      putModuleObject: jest.fn(),
      deleteModuleObject: jest.fn().mockResolvedValue(true)
    };
    const putModuleObject =
      moduleBlobStorage.putModuleObject as jest.MockedFunction<
        NonNullable<ModuleBlobStoragePort["putModuleObject"]>
      >;
    putModuleObject.mockImplementation(async (settings, file) => ({
      key: `${settings.modulePrefix}/${file.fileName}`,
      size: file.bytes.length,
      etag: `etag-${file.fileName}`
    }));
    const serviceWithStorage = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const updated = await serviceWithStorage.updatePlaceableBlueprint("TEST_CHEST", {
      templateResRef: "ignored_body_resref",
      name: "Updated Chest",
      tag: "UPDATED_CHEST",
      useable: true,
      hasInventory: true,
      appearanceId: 205,
      inventoryItemListEntries: [
        {
          randomResRef: "nw_it_random001",
          x: 1,
          y: 2,
          infinite: false
        }
      ],
      overwrite: false
    });

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/test_chest.utp"
    );
    expect(putModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      expect.objectContaining({
        fileName: "test_chest.utp",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.UTP
      })
    );
    const written = putModuleObject.mock.calls[0]?.[1].bytes;
    const parsed = parseTemplateBlueprintFromGff(written as Buffer);
    expect(parsed).toMatchObject({
      sourceFileType: "UTP ",
      templateResRef: "test_chest",
      localizedName: "Updated Chest",
      tag: "UPDATED_CHEST",
      hasInventory: true,
      appearanceId: 205,
      inventoryItemListEntries: [
        {
          randomResRef: "nw_it_random001",
          x: 1,
          y: 2,
          infinite: false
        }
      ]
    });
    expect(updated.blueprint).toMatchObject({
      templateId: "plc_test_chest",
      resref: "test_chest",
      name: "Updated Chest"
    });

    const deleted = await serviceWithStorage.deletePlaceableBlueprint("TEST_CHEST");

    expect(moduleBlobStorage.deleteModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      "modules/current/test_chest.utp"
    );
    expect(deleted).toEqual({
      resref: "test_chest",
      objectKey: "modules/current/test_chest.utp",
      deleted: true
    });
  });

  it("lists placeables through repository", async () => {
    const result: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_001")],
      total: 1,
      limit: 20,
      offset: 0
    };
    repository.listByKind.mockResolvedValue(result);

    const response = await service.listPlaceables({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      limit: 20,
      offset: 0
    });
    expect(response).toEqual({
      ...result,
      items: [
        {
          ...result.items[0],
          previewImageUrl: "/api/v1/catalog/placeables/plc_001/thumbnail"
        }
      ]
    });
  });

  it("reuses in-memory placeable list cache for repeated identical queries", async () => {
    const result: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_cached_list_001")],
      total: 1,
      limit: 100,
      offset: 0
    };
    repository.listByKind.mockResolvedValue(result);

    const first = await service.listPlaceables({ limit: 100, offset: 0 });
    const second = await service.listPlaceables({ limit: 100, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.items[0].previewImageUrl).toBe(
      "/api/v1/catalog/placeables/plc_cached_list_001/thumbnail"
    );
  });

  it("deduplicates concurrent identical placeable list requests", async () => {
    const result: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_concurrent_list_001")],
      total: 1,
      limit: 100,
      offset: 0
    };
    repository.listByKind.mockResolvedValue(result);

    const [first, second] = await Promise.all([
      service.listPlaceables({ limit: 100, offset: 0 }),
      service.listPlaceables({ limit: 100, offset: 0 })
    ]);

    expect(repository.listByKind).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.items[0].previewImageUrl).toBe(
      "/api/v1/catalog/placeables/plc_concurrent_list_001/thumbnail"
    );
  });

  it("expires in-memory placeable list cache after ttl", async () => {
    const firstResult: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_cached_list_001")],
      total: 1,
      limit: 100,
      offset: 0
    };
    const secondResult: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_cached_list_002")],
      total: 1,
      limit: 100,
      offset: 0
    };
    repository.listByKind
      .mockResolvedValueOnce(firstResult)
      .mockResolvedValueOnce(secondResult);

    let now = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => now);
    const first = await service.listPlaceables({ limit: 100, offset: 0 });
    now += 61_000;
    const second = await service.listPlaceables({ limit: 100, offset: 0 });
    dateNowSpy.mockRestore();

    expect(repository.listByKind).toHaveBeenCalledTimes(2);
    expect(first.items[0].previewImageUrl).toBe(
      "/api/v1/catalog/placeables/plc_cached_list_001/thumbnail"
    );
    expect(second.items[0].previewImageUrl).toBe(
      "/api/v1/catalog/placeables/plc_cached_list_002/thumbnail"
    );
  });

  it("keeps on-demand texture lookup enabled for batch render packages", async () => {
    const query = {
      templateId: "plc_batch_texture",
      appearanceType: 12,
      bypassCache: true,
      includeBenchmarkMetadata: true
    };
    const processSpy = jest
      .spyOn(service, "processPlaceable")
      .mockResolvedValue({
        cache: {
          key: "f".repeat(64),
          hit: false,
          storedAt: "2026-05-24T10:10:00.000Z",
          hits: 0
        },
        placeable: {
          ...buildTemplate("placeable", "plc_batch_texture"),
          render: {
            backendType: "generic",
            frontendType: "placeable",
            rendererPreset: "placeable-generic",
            isDoor: false,
            isVfx: false
          },
          assetManifest: buildEmptyManifest(),
          classification: {
            source: "template",
            normalizedSubtype: "generic",
            mismatchWithTemplate: false
          },
          processedAt: "2026-05-24T10:10:00.000Z"
        }
      } as Awaited<ReturnType<CatalogApplicationService["processPlaceable"]>>);

    const result = await service.processPlaceablesBatch([query]);

    expect(result.items).toHaveLength(1);
    expect(processSpy).toHaveBeenCalledWith(query, {
      allowOnDemandDerivedModelGeneration: true,
      allowExpensiveSourceReferenceScans: false,
      allowOnDemandTextureLookup: true
    });
  });

  it("deduplicates Area GIT batch work by resolved model while keeping instance identities", async () => {
    repository.resolvePlaceableAppearanceModel = jest.fn().mockResolvedValue({
      source2da: "placeables.2da",
      rowId: 12,
      requestedRowId: 12,
      modelResRef: "plc_shared_model"
    });
    const processSpy = jest
      .spyOn(service, "processPlaceable")
      .mockImplementation(async (query) => ({
        cache: {
          key: `${query.templateId ?? "template"}-${query.tag ?? "tag"}`.padEnd(64, "0"),
          hit: false,
          storedAt: "2026-06-26T10:15:00.000Z",
          hits: 0
        },
        placeable: {
          ...buildTemplate("placeable", query.templateId ?? "plc_area_instance"),
          templateId: query.templateId ?? "plc_area_instance",
          resref: query.resref ?? "area_instance",
          render: {
            backendType: "generic",
            frontendType: "placeable",
            rendererPreset: "placeable-generic",
            isDoor: false,
            isVfx: false
          },
          benchmarkCandidate: false,
          metadata: {
            tag: query.tag ?? "",
            appearanceId: query.appearanceType ?? -1
          },
          placeableRuntime: {
            source: {},
            identity: {},
            interaction: {},
            locking: {},
            trap: {},
            state: {},
            scripts: {}
          },
          placeableValidationIssues: [],
          assetManifest: buildEmptyManifest(),
          classification: {
            source: "template",
            normalizedSubtype: "generic",
            mismatchWithTemplate: false
          },
          processedAt: "2026-06-26T10:15:00.000Z"
        }
      } as Awaited<ReturnType<CatalogApplicationService["processPlaceable"]>>));

    const first = {
      templateId: "plc_area_a",
      resref: "area_a",
      tag: "area_a_tag",
      appearanceType: 12,
      bypassCache: false,
      includeBenchmarkMetadata: true
    };
    const second = {
      templateId: "plc_area_b",
      resref: "area_b",
      tag: "area_b_tag",
      appearanceType: 12,
      bypassCache: false,
      includeBenchmarkMetadata: true
    };

    const result = await service.processPlaceablesBatch([first, second]);

    expect(repository.resolvePlaceableAppearanceModel).toHaveBeenCalledWith(12, {
      tag: "area_a_tag",
      templateId: "plc_area_a",
      resref: "area_a"
    });
    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(result.items[0].placeable.templateId).toBe("plc_area_a");
    expect(result.items[1].placeable.templateId).toBe("plc_area_b");
  });

  it("keys Area GIT processing cache by the resolved appearance model", async () => {
    repository.findByKindAndId.mockResolvedValue(null);
    repository.findByKindAndResref.mockResolvedValue(null);
    repository.resolvePlaceableAppearanceModel = jest
      .fn()
      .mockResolvedValueOnce({
        source2da: "placeables.2da",
        rowId: 12301,
        requestedRowId: 12301,
        modelResRef: "pms_z21",
        resolutionPath: "placeables-direct-row"
      })
      .mockResolvedValueOnce({
        source2da: "placeables.2da",
        rowId: 12201,
        requestedRowId: 12301,
        modelResRef: "pms_z12",
        resolutionPath: "placeables-instance-row-minus-100"
      });
    placeableCache.get.mockResolvedValue(null);
    const storedKeys: string[] = [];
    placeableCache.set.mockImplementation(async (key, value) => {
      storedKeys.push(key);
      return {
        key,
        value,
        storedAt: "2026-06-27T10:00:00.000Z",
        hits: 0
      };
    });

    const query = {
      templateId: "q_060",
      resref: "q_060",
      tag: "q_bowl_3",
      appearanceType: 12301,
      subtypeHint: "generic" as const,
      bypassCache: false,
      includeBenchmarkMetadata: true
    };

    const directRow = await service.processPlaceable(query);
    const correctedRow = await service.processPlaceable(query);

    expect(repository.resolvePlaceableAppearanceModel).toHaveBeenCalledTimes(2);
    expect(storedKeys).toHaveLength(2);
    expect(storedKeys[1]).not.toBe(storedKeys[0]);
    expect(directRow.placeable.metadata?.lookupModelResRef).toBe("pms_z21");
    expect(correctedRow.placeable.metadata?.lookupModelResRef).toBe("pms_z12");
    expect(correctedRow.placeable.metadata?.lookupResolutionPath).toBe(
      "placeables-instance-row-minus-100"
    );
  });

  it("passes placeable subtype filter to repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listPlaceables({
      subtype: "vfx",
      limit: 20,
      offset: 0
    });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      subtype: "vfx",
      limit: 20,
      offset: 0
    });
  });

  it("passes placeable benchmark filter to repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listPlaceables({
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      benchmark: true,
      limit: 20,
      offset: 0
    });
  });

  it("lists creatures through repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listCreatures({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("creature", {
      limit: 20,
      offset: 0
    });
  });

  it("lists items through repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listItems({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("item", {
      limit: 20,
      offset: 0
    });
  });

  it("reports item generator support as ready for GFF-style UTG headers", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const utgBytes = Buffer.from("UTG V3.2\0generator-candidate", "ascii");
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-item-generator",
        totalFiles: 1,
        totalBytes: utgBytes.length,
        objects: [
          {
            key: "modules/current/generators/loot.utg",
            size: utgBytes.length,
            etag: "utg-etag"
          }
        ],
        truncated: false,
        continuationToken: undefined
      }),
      getModuleObject: jest.fn(async (_settings, key) =>
        key === "modules/current/generators/loot.utg"
          ? {
              key,
              size: utgBytes.length,
              contentType: "application/octet-stream",
              etag: "utg-etag",
              bytes: utgBytes
            }
          : null
      )
    };
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.getItemGeneratorSupport();

    expect(result).toMatchObject({
      supported: false,
      status: "unsupported",
      parserImplemented: false,
      parseableGffCount: 0
    });
    expect(result.gffCandidateCount).toBeGreaterThanOrEqual(1);
    expect(result.sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "loot.utg",
          header: "UTG V3.2",
          classification: "gff-candidate",
          supported: false,
          parseable: false
        })
      ])
    );
  });

  it("lists items with derived model part resref metadata", async () => {
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "item_cnr_b_dagger"),
      resref: "cnr_b_dagger",
      metadata: {
        ...buildTemplate("item", "item_cnr_b_dagger").metadata,
        baseItem: 22,
        baseItemModelType: "wswdg",
        modelPart1: 11,
        modelPart2: 13,
        modelPart3: 63
      }
    };
    repository.listByKind.mockResolvedValue({
      items: [itemTemplate],
      total: 1,
      limit: 20,
      offset: 0
    });

    const response = await service.listItems({ limit: 20, offset: 0 });

    expect(response.items[0].metadata).toMatchObject({
      baseItemModelType: "wswdg",
      modelPartResRef1: "wswdg_b_011",
      modelPartResRef2: "wswdg_m_013",
      modelPartResRef3: "wswdg_t_063",
      modelPartResRefRole1: "blade",
      modelPartResRefRole2: "middle",
      modelPartResRefRole3: "top",
      itemModelRefs: "wswdg_b_011|wswdg_m_013|wswdg_t_063"
    });
  });

  it("lists item icon candidates through a materialized cache entry", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const iconBytes = Buffer.from([
      0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 32, 8, 255, 128, 64, 255
    ]);
    const iconObjectKey = "modules/current/__aurora/sources/vanilla/textures/iwswdg.tga";
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-item-icon-list",
        totalFiles: 1,
        totalBytes: iconBytes.length,
        objects: [
          {
            key: iconObjectKey,
            size: iconBytes.length,
            etag: "icon-etag"
          }
        ],
        truncated: false,
        continuationToken: undefined
      }),
      getModuleObject: jest.fn(async (_settings, key) =>
        key === iconObjectKey
          ? {
              key,
              size: iconBytes.length,
              contentType: "image/x-tga",
              etag: "icon-etag",
              bytes: iconBytes
            }
          : null
      )
    };
    const cacheStore = new Map<string, unknown>();
    placeableCache.get.mockImplementation(async (key) => {
      const value = cacheStore.get(key);
      return value
        ? {
            key,
            value,
            storedAt: "2026-07-02T18:40:00.000Z",
            hits: 1
          }
        : null;
    });
    placeableCache.set.mockImplementation(async (key, value) => {
      cacheStore.set(key, value);
      return {
        key,
        value,
        storedAt: "2026-07-02T18:40:00.000Z",
        hits: 0
      };
    });
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "item_cnr_b_dagger"),
      resref: "cnr_b_dagger",
      metadata: {
        ...buildTemplate("item", "item_cnr_b_dagger").metadata,
        baseItem: 22,
        baseItemDefaultIcon: "iwswdg",
        baseItemModelType: "wswdg",
        modelPart1: 11,
        modelPart2: 13,
        modelPart3: 63
      }
    };
    repository.listByKind.mockResolvedValue({
      items: [itemTemplate],
      total: 1,
      limit: 20,
      offset: 0
    });

    const response = await serviceWithBlob.listItems({ limit: 20, offset: 0 });

    const candidates = JSON.parse(
      String(response.items[0].metadata.modelAssetCandidates)
    ) as Array<{ assetId: string; reference: string; assetUrl: string }>;
    expect(candidates[0]).toMatchObject({
      reference: "iwswdg",
      assetUrl: expect.stringContaining("/api/v1/catalog/placeables/cache/")
    });
    const urlMatch = candidates[0].assetUrl.match(/\/cache\/([^/]+)\/assets\/([^/.]+)\.tga$/u);
    expect(urlMatch).not.toBeNull();
    const iconCacheKey = urlMatch?.[1] ?? "";
    const iconAssetId = urlMatch?.[2] ?? "";
    expect(placeableCache.set).toHaveBeenCalledWith(
      iconCacheKey,
      expect.objectContaining({
        kind: "item",
        assetManifest: expect.objectContaining({
          moduleHash: "hash-item-icon-list"
        })
      })
    );

    const asset = await serviceWithBlob.getProcessedPlaceableAsset(iconCacheKey, iconAssetId);

    expect(asset.asset.objectKey).toBe(iconObjectKey);
    expect(asset.payload.bytes).toEqual(iconBytes);
  });

  it("lists potion default model candidates through the item list asset manifest", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const itemObjects = [
      "modules/current/__aurora/sources/vanilla/models/it_potion_000.glb",
      "modules/current/__aurora/sources/vanilla/textures/iit_potion.tga"
    ].map((key) => ({
      key,
      size: 4096,
      etag: `${key}-etag`
    }));
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-item-potion-list-assets",
        totalFiles: itemObjects.length,
        totalBytes: itemObjects.reduce((sum, entry) => sum + entry.size, 0),
        objects: itemObjects,
        truncated: false,
        continuationToken: undefined
      }),
      getModuleObject: jest.fn()
    };
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-07-06T18:30:00.000Z",
      hits: 0
    }));
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "itm_nw_it_mpotion002"),
      resref: "nw_it_mpotion002",
      metadata: {
        ...buildTemplate("item", "itm_nw_it_mpotion002").metadata,
        baseItem: 49,
        baseItemDefaultIcon: "iit_potion",
        baseItemModelType: "it_potion",
        modelPart1: 41,
        modelPart2: 13,
        modelPart3: 33
      }
    };
    repository.listByKind.mockResolvedValue({
      items: [itemTemplate],
      total: 1,
      limit: 20,
      offset: 0
    });

    const response = await serviceWithBlob.listItems({ limit: 20, offset: 0 });

    expect(response.items[0].metadata).toMatchObject({
      modelPartResRef1: "it_potion_000",
      modelPartResRefRole1: "default",
      itemModelRefs: "it_potion_000",
      itemIconRefs: "iit_potion"
    });
    const candidates = JSON.parse(
      String(response.items[0].metadata.modelAssetCandidates)
    ) as Array<{ role: string; reference: string; assetUrl: string }>;
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "model", reference: "it_potion_000" }),
        expect.objectContaining({ role: "texture", reference: "iit_potion" })
      ])
    );
    expect(placeableCache.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        kind: "item",
        metadata: expect.objectContaining({
          itemModelRefs: "it_potion_000",
          itemIconRefs: "iit_potion"
        }),
        assetManifest: expect.objectContaining({
          moduleHash: "hash-item-potion-list-assets"
        })
      })
    );
  });

  it("generates all multipart weapon model candidates before falling back to the inventory icon", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-item-model-hak-"));
    const hakPath = join(tempRoot, "items.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "wswdg_b_011",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.MDL,
          bytes: Buffer.from("newmodel wswdg_b_011", "utf-8")
        },
        {
          resref: "wswdg_m_013",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.MDL,
          bytes: Buffer.from("newmodel wswdg_m_013", "utf-8")
        },
        {
          resref: "wswdg_t_063",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.MDL,
          bytes: Buffer.from("newmodel wswdg_t_063", "utf-8")
        }
      ])
    );

    try {
      const runtimeSettings = buildRuntimeSettingsRecord();
      runtimeSettings.paths.hakDirectoryPath = tempRoot;
      runtimeSettings.paths.moduleDecompiledPath = "";
      runtimeSettings.sources.item = {
        ...(runtimeSettings.sources.item ?? {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: false,
          includeVanilla: false,
          hakProfileId: "",
          hakPriorityList: []
        }),
        includeHaks: true,
        includeVanilla: false,
        hakProfileId: "lc_items"
      };
      runtimeSettings.hakProfiles.lc_items = ["items.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(runtimeSettings),
        save: jest.fn()
      };
      const storedObjects = new Map<
        string,
        { bytes: Buffer; contentType: string; etag: string }
      >();
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-item-potion-on-demand-models",
        totalFiles: 0,
        totalBytes: 0,
        objects: [],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
        const stored = storedObjects.get(key);
        return stored
          ? {
              key,
              size: stored.bytes.length,
              contentType: stored.contentType,
              etag: stored.etag,
              bytes: stored.bytes
            }
          : null;
      });
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      putModuleObject.mockImplementation(async (_settings, file) => {
        const normalizedFileName = file.fileName.replace(/\\/gu, "/").replace(/^\/+/u, "");
        const key = `modules/current/${normalizedFileName}`;
        const bytes = Buffer.from(file.bytes);
        const etag = `etag-${storedObjects.size + 1}`;
        storedObjects.set(key, {
          bytes,
          contentType: "application/octet-stream",
          etag
        });
        return { key, size: bytes.length, etag };
      });
      const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
        generateDerivedAssets: jest.fn(
          async (input: Parameters<DerivedAssetGeneratorPort["generateDerivedAssets"]>[0]) => ({
            files: input.sourceFiles.map((sourceFile) => {
              const fileName = sourceFile.fileName.replace(/\\/gu, "/").split("/").pop() ?? "";
              const resref = fileName.replace(/\.[^.]+$/u, "");
              return {
                fileName: `__aurora/derived/models/${resref}.glb`,
                resourceType: 0,
                bytes: Buffer.from(`glb:${resref}`, "utf-8")
              };
            }),
            summary: {
              generator: "test-generator",
              generatedFiles: input.sourceFiles.length,
              generatedBytes: input.sourceFiles.length
            }
          })
        )
      };
      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage,
        derivedAssetGenerator
      );
      const itemTemplate: TemplateRecord = {
        ...buildTemplate("item", "item_cnr_b_dagger"),
        resref: "cnr_b_dagger",
        metadata: {
          ...buildTemplate("item", "item_cnr_b_dagger").metadata,
          baseItem: 22,
          baseItemDefaultIcon: "iwswdg",
          baseItemModelType: "wswdg",
          modelPart1: 11,
          modelPart2: 13,
          modelPart3: 63
        }
      };
      repository.listByKind.mockResolvedValue({
        items: [itemTemplate],
        total: 1,
        limit: 20,
        offset: 0
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-07-06T19:05:00.000Z",
        hits: 0
      }));

      const response = await serviceWithBlob.listItems({ limit: 20, offset: 0 });

      expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledWith({
        settingsRevision: runtimeSettings.revision,
        modulePrefix: runtimeSettings.blobStorage.modulePrefix,
        sourceFiles: expect.arrayContaining([
          expect.objectContaining({ fileName: expect.stringContaining("wswdg_b_011.mdl") }),
          expect.objectContaining({ fileName: expect.stringContaining("wswdg_m_013.mdl") }),
          expect.objectContaining({ fileName: expect.stringContaining("wswdg_t_063.mdl") })
        ])
      });
      const candidates = JSON.parse(
        String(response.items[0].metadata.modelAssetCandidates)
      ) as Array<{ role: string; extension: string; reference: string }>;
      expect(candidates).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "model",
            extension: "glb",
            reference: "wswdg_b_011"
          }),
          expect.objectContaining({
            role: "model",
            extension: "glb",
            reference: "wswdg_m_013"
          }),
          expect.objectContaining({
            role: "model",
            extension: "glb",
            reference: "wswdg_t_063"
          })
        ])
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("rebuilds stale item list icon cache entries when model assets are required", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const itemObjects = [
      "modules/current/__aurora/sources/vanilla/models/it_potion_000.glb",
      "modules/current/__aurora/sources/vanilla/textures/iit_potion.tga"
    ].map((key) => ({
      key,
      size: 4096,
      etag: `${key}-etag`
    }));
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-item-potion-list-assets-rebuild",
        totalFiles: itemObjects.length,
        totalBytes: itemObjects.reduce((sum, entry) => sum + entry.size, 0),
        objects: itemObjects,
        truncated: false,
        continuationToken: undefined
      }),
      getModuleObject: jest.fn()
    };
    const staleManifest = {
      version: "placeable-asset-manifest/v1" as const,
      source: "module-blob-snapshot" as const,
      generatedAt: "2026-07-06T18:40:00.000Z",
      moduleHash: "stale-icon-only",
      assetCount: 1,
      candidatesScanned: 1,
      assets: [
        {
          assetId: "stale-icon",
          role: "texture",
          fileName: "iit_potion.tga",
          objectKey: "modules/current/__aurora/sources/vanilla/textures/iit_potion.tga",
          extension: "tga",
          sizeBytes: 128,
          contentType: "image/x-tga"
        }
      ]
    };
    let getCount = 0;
    placeableCache.get.mockImplementation(async (key) => {
      getCount += 1;
      if (getCount === 1) {
        return {
          key,
          value: {
            templateId: "itm_nw_it_mpotion002",
            kind: "item",
            resref: "nw_it_mpotion002",
            name: "Potion",
            category: "test",
            benchmarkCandidate: false,
            metadata: {},
            render: buildTemplate("item", "itm_nw_it_mpotion002").metadata,
            assetManifest: staleManifest,
            processedAt: "2026-07-06T18:40:00.000Z"
          },
          storedAt: "2026-07-06T18:40:00.000Z",
          hits: 1
        };
      }
      return null;
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-07-06T19:10:00.000Z",
      hits: 0
    }));
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "itm_nw_it_mpotion002"),
      resref: "nw_it_mpotion002",
      metadata: {
        ...buildTemplate("item", "itm_nw_it_mpotion002").metadata,
        baseItem: 49,
        baseItemDefaultIcon: "iit_potion",
        baseItemModelType: "it_potion",
        baseItemDefaultModel: "it_potion_000",
        modelPart1: 41,
        modelPart2: 13,
        modelPart3: 33
      }
    };
    repository.listByKind.mockResolvedValue({
      items: [itemTemplate],
      total: 1,
      limit: 20,
      offset: 0
    });

    const response = await serviceWithBlob.listItems({ limit: 20, offset: 0 });

    const candidates = JSON.parse(
      String(response.items[0].metadata.modelAssetCandidates)
    ) as Array<{ role: string; extension: string; reference: string }>;
    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "model", extension: "glb", reference: "it_potion_000" })
      ])
    );
    expect(placeableCache.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        assetManifest: expect.objectContaining({
          moduleHash: "hash-item-potion-list-assets-rebuild"
        })
      })
    );
  });

  it("lists shield items as single-piece model refs", async () => {
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "item_tower_shield"),
      resref: "tower_shield",
      metadata: {
        ...buildTemplate("item", "item_tower_shield").metadata,
        baseItem: 57,
        baseItemModelType: "AShTo",
        modelPart1: 95
      }
    };
    repository.listByKind.mockResolvedValue({
      items: [itemTemplate],
      total: 1,
      limit: 20,
      offset: 0
    });

    const response = await service.listItems({ limit: 20, offset: 0 });

    expect(response.items[0].metadata).toMatchObject({
      baseItemModelType: "AShTo",
      modelPartResRef1: "ashto_095",
      modelPartResRefRole1: "blade",
      itemModelRefs: "ashto_095"
    });
  });

  it("lists creature fist items as single-piece model refs", async () => {
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "item_boxer_gloves"),
      resref: "boxer_gloves",
      metadata: {
        ...buildTemplate("item", "item_boxer_gloves").metadata,
        baseItem: 510,
        baseItemModelType: "wlcfg",
        modelPart1: 49
      }
    };
    repository.listByKind.mockResolvedValue({
      items: [itemTemplate],
      total: 1,
      limit: 20,
      offset: 0
    });

    const response = await service.listItems({ limit: 20, offset: 0 });

    expect(response.items[0].metadata).toMatchObject({
      baseItemModelType: "wlcfg",
      modelPartResRef1: "wlcfg_049",
      modelPartResRefRole1: "blade",
      itemModelRefs: "wlcfg_049"
    });
  });

  it("lists misc item classes as single-piece model refs", async () => {
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "item_chest"),
      resref: "chest_item",
      metadata: {
        ...buildTemplate("item", "item_chest").metadata,
        baseItem: 406,
        baseItemModelType: "it_misc",
        modelPart1: 206
      }
    };
    repository.listByKind.mockResolvedValue({
      items: [itemTemplate],
      total: 1,
      limit: 20,
      offset: 0
    });

    const response = await service.listItems({ limit: 20, offset: 0 });

    expect(response.items[0].metadata).toMatchObject({
      baseItemModelType: "it_misc",
      modelPartResRef1: "it_misc_206",
      modelPartResRefRole1: "blade",
      itemModelRefs: "it_misc_206"
    });
  });

  it("lists custom small misc item classes as single-piece model refs", async () => {
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "item_l_shards"),
      resref: "l_shards",
      metadata: {
        ...buildTemplate("item", "item_l_shards").metadata,
        baseItem: 407,
        baseItemModelType: "it_smlmis3",
        modelPart1: 166
      }
    };
    repository.listByKind.mockResolvedValue({
      items: [itemTemplate],
      total: 1,
      limit: 20,
      offset: 0
    });

    const response = await service.listItems({ limit: 20, offset: 0 });

    expect(response.items[0].metadata).toMatchObject({
      baseItemModelType: "it_smlmis3",
      modelPartResRef1: "it_smlmis3_166",
      modelPartResRefRole1: "blade",
      itemModelRefs: "it_smlmis3_166"
    });
  });

  it("lists cloak items with cloakmodel.2da model texture and icon refs", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const serviceWithRuntime = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository
    );
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "item_cloak_arcane"),
      resref: "cloak_arcane",
      metadata: {
        ...buildTemplate("item", "item_cloak_arcane").metadata,
        baseItem: 80,
        baseItemModelType: "cloak",
        baseItemDefaultIcon: "icloak_m_001",
        modelPart1: 2
      }
    };
    repository.listByKind.mockResolvedValue({
      items: [itemTemplate],
      total: 1,
      limit: 20,
      offset: 0
    });

    const response = await serviceWithRuntime.listItems({ limit: 20, offset: 0 });

    expect(response.items[0].metadata).toMatchObject({
      cloakModelRow: 2,
      cloakModel: 1,
      cloakTexture: 10,
      cloakIcon: 2,
      cloakModelResRef: "pmh0_cloak_001",
      cloakTextureResRef: "pmh0_cloak_010",
      cloakIconResRef: "icloak_m_002",
      cloakHiddenSlots: "wing|rShoul",
      modelPartResRef1: "pmh0_cloak_001",
      modelPartResRefRole1: "cloak",
      itemModelRefs: "pmh0_cloak_001",
      itemTextureRefs: "pmh0_cloak_010",
      itemIconRefs: "icloak_m_001|icloak_m_002"
    });
  });

  it("lists robe armor with parts_robe hide mask applied to model refs", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const serviceWithRuntime = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository
    );
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "item_robe_armor"),
      resref: "robe_armor",
      metadata: {
        ...buildTemplate("item", "item_robe_armor").metadata,
        baseItem: 16,
        bodyPartRFoot: 4,
        bodyPartRShin: 13,
        bodyPartRThigh: 3,
        bodyPartPelvis: 8,
        bodyPartTorso: 43,
        bodyPartBelt: 5,
        bodyPartRobe: 5
      }
    };
    repository.listByKind.mockResolvedValue({
      items: [itemTemplate],
      total: 1,
      limit: 20,
      offset: 0
    });

    const response = await serviceWithRuntime.listItems({ limit: 20, offset: 0 });

    expect(response.items[0].metadata).toMatchObject({
      armorRobeHiddenSlots: "rShin|lShin|rThigh|lThigh|pelvis|torso|belt|rShoul|lShoul",
      armorRobeHiddenSlotCount: 9,
      armorRobeHideSource2daRow: 5,
      itemModelRefs: "pmh0_footr004|pmh0_robe005"
    });
  });

  it("lists encounters through repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listEncounters({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("encounter", {
      limit: 20,
      offset: 0
    });
  });

  it("returns preview payload when template exists", async () => {
    const template = {
      ...buildTemplate("placeable", "plc_001"),
      benchmarkCandidate: true,
      benchmarkBucket: "placeable_heavy_vfx"
    };
    repository.findByKindAndId.mockResolvedValue(template);

    const preview = await service.getPlaceablePreview("plc_001");

    expect(preview.templateId).toBe("plc_001");
    expect(preview.kind).toBe("placeable");
    expect(preview.placeableSubtype).toBe("generic");
    expect(preview.benchmarkCandidate).toBe(true);
    expect(preview.benchmarkBucket).toBe("placeable_heavy_vfx");
    expect(preview.resref).toBe(template.resref);
    expect(preview.previewImageUrl).toBe("/api/v1/catalog/placeables/plc_001/thumbnail");
  });

  it("returns generated placeable thumbnail image payload", async () => {
    repository.findByKindAndId.mockResolvedValue(buildTemplate("placeable", "plc_001"));

    const thumbnail = await service.getPlaceableThumbnail("plc_001");

    expect(repository.findByKindAndId).toHaveBeenCalledWith("placeable", "plc_001");
    expect(thumbnail.contentType).toBe("image/svg+xml; charset=utf-8");
    expect(thumbnail.fileName).toBe("plc_001.svg");
    expect(thumbnail.bytes.toString("utf-8")).toContain("placeable_resref");
    expect(thumbnail.etag).toMatch(/^W\/"/u);
  });

  it("throws TEMPLATE_NOT_FOUND when template is missing", async () => {
    repository.findByKindAndId.mockResolvedValue(null);

    expect.assertions(4);
    try {
      await service.getPlaceablePreview("missing");
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const appError = error as AppException;
      expect(appError.code).toBe("TEMPLATE_NOT_FOUND");
      expect(appError.getStatus()).toBe(404);
      expect((appError.getResponse() as { message: string }).message).toBe(
        "placeable template was not found."
      );
    }
  });

  it("returns kind-specific not-found message for creature preview", async () => {
    repository.findByKindAndId.mockResolvedValue(null);

    expect.assertions(1);
    try {
      await service.getCreaturePreview("missing-creature");
    } catch (error) {
      expect((error as AppException).getResponse()).toMatchObject({
        message: "creature template was not found."
      });
    }
  });

  it("returns kind-specific not-found message for item preview", async () => {
    repository.findByKindAndId.mockResolvedValue(null);

    expect.assertions(1);
    try {
      await service.getItemPreview("missing-item");
    } catch (error) {
      expect((error as AppException).getResponse()).toMatchObject({
        message: "item template was not found."
      });
    }
  });

  it("returns false benchmark marker for non-benchmark preview", async () => {
    const template = buildTemplate("placeable", "plc_002");
    repository.findByKindAndId.mockResolvedValue(template);

    const preview = await service.getPlaceablePreview("plc_002");

    expect(preview).toMatchObject({
      benchmarkCandidate: false
    });
  });

  it("processes placeable into render contract and stores cache entry", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_vfx_001"),
      resref: "plc_vfx_001",
      placeableSubtype: "vfx",
      benchmarkCandidate: true,
      benchmarkBucket: "placeable_heavy_vfx",
      metadata: {
        ...buildTemplate("placeable", "plc_vfx_001").metadata,
        useable: true
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:00:00.000Z",
      hits: 0
    }));

    const result = await service.processPlaceable({
      templateId: "plc_vfx_001",
      subtypeHint: "vvx",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(false);
    expect(result.placeable.placeableSubtype).toBe("vfx");
    expect(result.placeable.render.frontendType).toBe("vfx");
    expect(result.placeable.renderPackage?.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT"])
    );
    expect(result.placeable.classification.mismatchWithTemplate).toBe(false);
    expect(result.placeable.benchmarkBucket).toBe("placeable_heavy_vfx");
    expect(result.placeable.assetManifest.version).toBe("placeable-asset-manifest/v1");
    expect(result.placeable.placeableRuntime?.interaction.useable).toBe(true);
    expect(result.placeable.placeableValidationIssues?.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["PLACEABLE_ONUSED_SCRIPT_MISSING"])
    );
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
  });

  it("returns missing_assets render package for empty manifest in test mode", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_empty_001"),
      resref: "plc_empty",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    const appConfig = { isTest: true } as unknown as AppConfigService;
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:00:00.000Z",
      hits: 0
    }));

    const serviceWithTestConfig = new CatalogApplicationService(
      repository,
      placeableCache,
      appConfig
    );

    const result = await serviceWithTestConfig.processPlaceable({
      templateId: "plc_empty_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.renderPackage?.status).toBe("missing_assets");
    expect(result.placeable.renderPackage?.assetRefs).toEqual({});
  });

  it("returns missing_derived render package when only raw model assets are discovered", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-raw-model",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/models/plc_raw.mdl",
          size: 12,
          etag: "model-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_raw_001"),
      resref: "plc_raw",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_raw_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.renderPackage?.status).toBe("missing_derived");
    expect(result.placeable.renderPackage?.assetRefs.modelAssetIds?.length).toBeGreaterThan(0);
    expect(result.placeable.renderPackage?.modelUrl).toBeUndefined();
    expect(result.placeable.renderPackage?.glbUrl).toBeUndefined();
  });

  it("generates and stores a derived glb on demand when a raw placeable model is discovered", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-raw-model",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/models/plc_raw.mdl",
          size: 12,
          etag: "model-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/plc_raw.mdl") {
        return {
          key,
          size: 12,
          contentType: "application/octet-stream",
          etag: "model-hash",
          bytes: Buffer.from("mdl")
        };
      }
      if (key === "modules/current/__aurora/derived/models/plc_raw.glb") {
        return {
          key,
          size: 3,
          contentType: "model/gltf-binary",
          etag: "derived-hash",
          bytes: Buffer.from("glb")
        };
      }
      return null;
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: "modules/current/__aurora/derived/models/plc_raw.glb",
      size: 3,
      etag: "derived-hash"
    });
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn(
        async (_input: Parameters<DerivedAssetGeneratorPort["generateDerivedAssets"]>[0]) => ({
        files: [
          {
            fileName: "__aurora/derived/models/plc_raw.glb",
            resourceType: 0,
            bytes: Buffer.from("glb")
          }
        ],
        summary: {
          generator: "test-generator",
          generatedFiles: 1,
          generatedBytes: 3
        }
      }))
    };

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_raw_001"),
      resref: "plc_raw",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithDerived = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithDerived.processPlaceable({
      templateId: "plc_raw_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledWith({
      settingsRevision: runtimeSettings.revision,
      modulePrefix: runtimeSettings.blobStorage.modulePrefix,
      sourceFiles: [
        expect.objectContaining({
          fileName: "modules/current/models/plc_raw.mdl",
          bytes: Buffer.from("mdl")
        })
      ]
    });
    expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      expect.objectContaining({
        fileName: "__aurora/derived/models/plc_raw.glb",
        bytes: Buffer.from("glb")
      })
    );
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(result.placeable.renderPackage?.glbUrl).toMatch(
      /^\/api\/v1\/catalog\/placeables\/cache\/.+\/assets\/.+\.glb$/u
    );
  });

  it("keeps non-generating batch cache entries separate from full placeable processing", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-batch-cache-raw-model",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/models/plc_raw.mdl",
          size: 12,
          etag: "model-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/plc_raw.mdl") {
        return {
          key,
          size: 12,
          contentType: "application/octet-stream",
          etag: "model-hash",
          bytes: Buffer.from("mdl")
        };
      }
      if (key === "modules/current/__aurora/derived/models/plc_raw.glb") {
        return {
          key,
          size: 3,
          contentType: "model/gltf-binary",
          etag: "derived-hash",
          bytes: Buffer.from("glb")
        };
      }
      return null;
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: "modules/current/__aurora/derived/models/plc_raw.glb",
      size: 3,
      etag: "derived-hash"
    });
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn(
        async (_input: Parameters<DerivedAssetGeneratorPort["generateDerivedAssets"]>[0]) => ({
        files: [
          {
            fileName: "__aurora/derived/models/plc_raw.glb",
            resourceType: 0,
            bytes: Buffer.from("glb")
          }
        ],
        summary: {
          generator: "test-generator",
          generatedFiles: 1,
          generatedBytes: 3
        }
      }))
    };

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_raw_001"),
      resref: "plc_raw",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    const cachedEntries = new Map<string, { value: PlaceableProcessingResult; storedAt: string; hits: number }>();
    placeableCache.get.mockImplementation(async (key) => {
      const cached = cachedEntries.get(key);
      if (!cached) {
        return null;
      }
      cached.hits += 1;
      return {
        key,
        value: cached.value,
        storedAt: cached.storedAt,
        hits: cached.hits
      };
    });
    placeableCache.set.mockImplementation(async (key, value) => {
      const storedAt = "2026-05-24T10:10:00.000Z";
      const typedValue = value as PlaceableProcessingResult;
      cachedEntries.set(key, { value: typedValue, storedAt, hits: 0 });
      return {
        key,
        value: typedValue,
        storedAt,
        hits: 0
      };
    });

    const serviceWithDerived = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const batch = await serviceWithDerived.processPlaceablesBatch([
      {
        templateId: "plc_raw_001",
        bypassCache: false,
        includeBenchmarkMetadata: true
      }
    ]);

    expect(batch.items[0].placeable.renderPackage?.status).toBe("missing_derived");
    expect(derivedAssetGenerator.generateDerivedAssets).not.toHaveBeenCalled();

    const full = await serviceWithDerived.processPlaceable({
      templateId: "plc_raw_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(full.cache.hit).toBe(false);
    expect(full.placeable.renderPackage?.status).toBe("ready");
    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledTimes(1);
    expect(new Set([...cachedEntries.keys()]).size).toBe(2);
  });

  it("returns ready render package with delivery urls when derived glb is discovered", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-derived-model",
      totalFiles: 2,
      totalBytes: 128,
      objects: [
        {
          key: "modules/current/models/plc_ready.glb",
          size: 120,
          etag: "derived-hash"
        },
        {
          key: "modules/current/textures/plc_ready.dds",
          size: 8,
          etag: "texture-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_ready_001"),
      resref: "plc_ready",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_ready_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.placeable.renderPackage;
    expect(renderPackage?.status).toBe("ready");
    const derivedModelAssetId = renderPackage?.assetRefs.derivedModelAssetIds?.[0];
    expect(derivedModelAssetId).toBeDefined();
    const assetById = new Map(
      result.placeable.assetManifest.assets.map((asset) => [asset.assetId, asset])
    );
    expect(renderPackage?.glbUrl).toBe(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${derivedModelAssetId}.glb`
    );
    expect(renderPackage?.modelUrl).toBeUndefined();

    const textureAssetIds = renderPackage?.assetRefs.textureAssetIds ?? [];
    expect(textureAssetIds.length).toBeGreaterThan(0);
    expect(renderPackage?.textureUrls).toEqual(
      textureAssetIds.map((assetId) => {
        const asset = assetById.get(assetId);
        return `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${assetId}.${asset?.extension}`;
      })
    );
  });

  it("prefers glb delivery URL when gltf and glb derived blob assets both exist", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-dual-derived-model",
      totalFiles: 2,
      totalBytes: 248,
      objects: [
        {
          key: "modules/current/models/plc_dual.gltf",
          size: 128,
          etag: "gltf-hash"
        },
        {
          key: "modules/current/models/plc_dual.glb",
          size: 120,
          etag: "glb-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_dual_001"),
      resref: "plc_dual",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_dual_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const gltfAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "plc_dual.gltf"
    );
    const glbAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "plc_dual.glb"
    );
    expect(gltfAsset).toBeDefined();
    expect(glbAsset).toBeDefined();
    expect(result.placeable.renderPackage?.assetRefs.derivedModelAssetIds).toEqual([
      glbAsset?.assetId,
      gltfAsset?.assetId
    ]);
    expect(result.placeable.renderPackage?.glbUrl).toBe(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${glbAsset?.assetId}.glb`
    );
    expect(result.placeable.renderPackage?.modelUrl).toBeUndefined();
  });

  it("adds blob texture assets from Aurora texture references embedded in derived glb", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-glb-texture-ref",
      totalFiles: 2,
      totalBytes: 136,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/plc_cache_chest.glb",
          size: 120,
          etag: "derived-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_core/textures/tx_chestwood.tga",
          size: 16,
          etag: "texture-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/__aurora/derived/models/plc_cache_chest.glb") {
        return null;
      }
      const bytes = buildGlbWithTextureReferences(["tx_chestwood"]);
      return {
        key,
        size: bytes.length,
        contentType: "model/gltf-binary",
        bytes
      };
    });

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_cache_chest_001"),
      resref: "plc_cache_chest",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_cache_chest"
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_cache_chest_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const textureAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "tx_chestwood.tga"
    );
    expect(textureAsset).toBeDefined();
    expect(textureAsset).toMatchObject({
      role: "texture",
      objectKey: "modules/current/__aurora/sources/hak/lc_core/textures/tx_chestwood.tga",
      extension: "tga",
      contentType: "image/x-tga"
    });
    const textureAssetId = textureAsset!.assetId;
    expect(result.placeable.renderPackage?.assetRefs.textureAssetIds).toContain(
      textureAssetId
    );
    expect(result.placeable.renderPackage?.textureUrls).toContain(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${textureAssetId}.tga`
    );
  });

  it("adds fxpa_dot01 as a fast-shadow texture asset when placeables.2da ShadowSize is present", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-placeable-shadow-texture-"));
    const hakPath = join(tempRoot, "shadow_textures.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "fxpa_dot01",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TGA,
          bytes: Buffer.from([
            0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 32, 8,
            255, 255, 255, 255
          ])
        }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "shadow_textures";
      settings.hakProfiles.shadow_textures = ["shadow_textures.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const storedObjects = new Map<
        string,
        { bytes: Buffer; contentType: string; etag: string }
      >();
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      const derivedKey = "modules/current/__aurora/derived/models/plc_shadow.glb";
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-shadow-texture",
        totalFiles: 1,
        totalBytes: 120,
        objects: [{ key: derivedKey, size: 120, etag: "derived-hash" }],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
        if (key === derivedKey) {
          const bytes = buildGlbWithTextureReferences([]);
          return {
            key,
            size: bytes.length,
            contentType: "model/gltf-binary",
            bytes
          };
        }
        const stored = storedObjects.get(key);
        return stored
          ? {
              key,
              size: stored.bytes.length,
              contentType: stored.contentType,
              etag: stored.etag,
              bytes: stored.bytes
            }
          : null;
      });
      putModuleObject.mockImplementation(async (_settings, file) => {
        const normalizedFileName = file.fileName.replace(/\\/gu, "/").replace(/^\/+/u, "");
        const key = `modules/current/${normalizedFileName}`;
        const bytes = Buffer.from(file.bytes);
        const etag = `etag-${storedObjects.size + 1}`;
        storedObjects.set(key, {
          bytes,
          contentType: "application/octet-stream",
          etag
        });
        return { key, size: bytes.length, etag };
      });

      repository.findByKindAndId.mockResolvedValue({
        ...buildTemplate("placeable", "plc_shadow_001"),
        resref: "plc_shadow",
        placeableSubtype: "generic",
        metadata: {
          lookupModelResRef: "plc_shadow",
          source2daShadowSize: 1
        }
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:10:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithBlob.processPlaceable({
        templateId: "plc_shadow_001",
        bypassCache: false,
        includeBenchmarkMetadata: true
      });

      const textureAsset = result.placeable.assetManifest.assets.find(
        (asset) => asset.fileName === "fxpa_dot01.tga"
      );
      expect(textureAsset).toMatchObject({
        role: "texture",
        extension: "tga",
        contentType: "image/x-tga"
      });
      expect(result.placeable.renderPackage?.assetRefs.textureAssetIds).toContain(
        textureAsset?.assetId
      );
      expect(result.placeable.renderPackage?.textureBindings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            reference: "fxpa_dot01",
            fileName: "fxpa_dot01.tga"
          })
        ])
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("resolves on-demand material assets before collecting material texture maps", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-placeable-material-hak-"));
    const hakPath = join(tempRoot, "materials.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "mat_ref",
          restype: 2072,
          bytes: Buffer.from(
            ["renderhint NormalAndSpecMapped", "texture0 mat_ref", "texture1 mat_ref_n"].join(
              "\n"
            ),
            "utf-8"
          )
        },
        { resref: "mat_ref", restype: 2033, bytes: Buffer.from([1, 2, 3]) },
        { resref: "mat_ref_n", restype: 2033, bytes: Buffer.from([4, 5, 6]) }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["materials.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const storedObjects = new Map<
        string,
        { bytes: Buffer; contentType: string; etag: string }
      >();
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      const derivedKey = "modules/current/__aurora/derived/models/plc_material.glb";
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-on-demand-material",
        totalFiles: 1,
        totalBytes: 120,
        objects: [{ key: derivedKey, size: 120, etag: "derived-hash" }],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
        if (key === derivedKey) {
          const bytes = buildGlbWithTextureReferences(["mat_ref"]);
          return {
            key,
            size: bytes.length,
            contentType: "model/gltf-binary",
            bytes
          };
        }
        const stored = storedObjects.get(key);
        return stored
          ? {
              key,
              size: stored.bytes.length,
              contentType: stored.contentType,
              etag: stored.etag,
              bytes: stored.bytes
            }
          : null;
      });
      putModuleObject.mockImplementation(async (_settings, file) => {
        const normalizedFileName = file.fileName.replace(/\\/gu, "/").replace(/^\/+/u, "");
        const key = `modules/current/${normalizedFileName}`;
        const bytes = Buffer.from(file.bytes);
        const etag = `etag-${storedObjects.size + 1}`;
        storedObjects.set(key, {
          bytes,
          contentType: "application/octet-stream",
          etag
        });
        return { key, size: bytes.length, etag };
      });

      repository.findByKindAndId.mockResolvedValue({
        ...buildTemplate("placeable", "plc_material_001"),
        resref: "plc_material",
        placeableSubtype: "generic",
        metadata: {
          lookupModelResRef: "plc_material"
        }
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:10:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithBlob.processPlaceable({
        templateId: "plc_material_001",
        bypassCache: false,
        includeBenchmarkMetadata: true
      });

      expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledTimes(3);
      expect(result.placeable.assetManifest.assets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "material",
            fileName: "mat_ref.mtr"
          }),
          expect.objectContaining({
            role: "texture",
            fileName: "mat_ref.dds"
          }),
          expect.objectContaining({
            role: "texture",
            fileName: "mat_ref_n.dds"
          })
        ])
      );
      const textureAssets = result.placeable.assetManifest.assets.filter(
        (asset) => asset.role === "texture"
      );
      expect(textureAssets.map((asset) => asset.fileName).sort()).toEqual([
        "mat_ref.dds",
        "mat_ref_n.dds"
      ]);
      expect(result.placeable.renderPackage?.textureUrls).toEqual(
        textureAssets.map(
          (asset) =>
            `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${asset.assetId}.dds`
        )
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("prefers DDS texture variants over earlier HAK TGA assets for material diffuse maps", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-placeable-dds-priority-"));
    const oldHakPath = join(tempRoot, "core_textures.hak");
    const reforgeHakPath = join(tempRoot, "reforge_materials.hak");
    await writeFile(
      oldHakPath,
      buildHakV10File([
        { resref: "mat_ref", restype: NWN_KEY_BIF_RESOURCE_TYPES.TGA, bytes: Buffer.from([9, 9, 9]) }
      ])
    );
    await writeFile(
      reforgeHakPath,
      buildHakV10File([
        {
          resref: "mat_ref",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.MTR,
          bytes: Buffer.from(
            ["renderhint NormalAndSpecMapped", "texture0 mat_ref", "texture1 mat_ref_n"].join(
              "\n"
            ),
            "utf-8"
          )
        },
        {
          resref: "mat_ref",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.DDS,
          bytes: buildNwnRawDxtTextureBytes({ width: 4, height: 4, encoding: 4 })
        },
        {
          resref: "mat_ref_n",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.DDS,
          bytes: buildNwnRawDxtTextureBytes({ width: 4, height: 4, encoding: 3 })
        }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "dds_priority";
      settings.hakProfiles.dds_priority = ["core_textures.hak", "reforge_materials.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const storedObjects = new Map<
        string,
        { bytes: Buffer; contentType: string; etag: string }
      >();
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      const derivedKey = "modules/current/__aurora/derived/models/plc_material.glb";
      const tgaSnapshotKey =
        "modules/current/__aurora/sources/hak/core_textures/textures/mat_ref.tga";
      const rawDdsSnapshotKey =
        "modules/current/__aurora/sources/hak/reforge_materials/mat_ref.dds";
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-dds-priority",
        totalFiles: 3,
        totalBytes: 145,
        objects: [
          { key: derivedKey, size: 120, etag: "derived-hash" },
          { key: tgaSnapshotKey, size: 9, etag: "old-tga" },
          { key: rawDdsSnapshotKey, size: 16, etag: "raw-dds" }
        ],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
        if (key === derivedKey) {
          const bytes = buildGlbWithTextureReferences(["mat_ref"]);
          return {
            key,
            size: bytes.length,
            contentType: "model/gltf-binary",
            bytes
          };
        }
        const stored = storedObjects.get(key);
        return stored
          ? {
              key,
              size: stored.bytes.length,
              contentType: stored.contentType,
              etag: stored.etag,
              bytes: stored.bytes
            }
          : null;
      });
      putModuleObject.mockImplementation(async (_settings, file) => {
        const normalizedFileName = file.fileName.replace(/\\/gu, "/").replace(/^\/+/u, "");
        const key = `modules/current/${normalizedFileName}`;
        const bytes = Buffer.from(file.bytes);
        const etag = `etag-${storedObjects.size + 1}`;
        storedObjects.set(key, {
          bytes,
          contentType: "application/octet-stream",
          etag
        });
        return { key, size: bytes.length, etag };
      });

      repository.findByKindAndId.mockResolvedValue({
        ...buildTemplate("placeable", "plc_material_001"),
        resref: "plc_material",
        placeableSubtype: "generic",
        metadata: {
          lookupModelResRef: "plc_material"
        }
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:10:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithBlob.processPlaceable({
        templateId: "plc_material_001",
        bypassCache: false,
        includeBenchmarkMetadata: true
      });

      expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledTimes(3);
      expect(result.placeable.assetManifest.assets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "material",
            fileName: "mat_ref.mtr"
          }),
          expect.objectContaining({
            role: "texture",
            fileName: "mat_ref.dds"
          }),
          expect.objectContaining({
            role: "texture",
            fileName: "mat_ref_n.dds"
          })
        ])
      );
      const textureAssets = result.placeable.assetManifest.assets.filter(
        (asset) => asset.role === "texture"
      );
      expect(
        storedObjects
          .get("modules/current/__aurora/sources/hak/reforge_materials/mat_ref.dds")
          ?.bytes.subarray(0, 4)
          .toString("ascii")
      ).toBe("DDS ");
      expect(textureAssets.map((asset) => asset.fileName).sort()).toEqual([
        "mat_ref.dds",
        "mat_ref_n.dds"
      ]);
      expect(result.placeable.renderPackage?.textureUrls).toEqual(
        textureAssets.map(
          (asset) =>
            `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${asset.assetId}.dds`
        )
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("resolves host-local vanilla texture assets through /host/nwn-game mounts", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-placeable-host-vanilla-"));
    const gameDataRoot = join(tempRoot, "game", "data");
    const previousHostRuntime = process.env.AURORA_HOST_LOCAL_RUNTIME;
    const previousGameRoot = process.env.AURORA_HOST_NWN_GAME_ROOT;

    try {
      await mkdir(gameDataRoot, { recursive: true });
      await writeFakeKeyBif(gameDataRoot, [
        {
          resref: "tin01_sac",
          resourceType: NWN_KEY_BIF_RESOURCE_TYPES.DDS,
          bytes: Buffer.from("DDS_SACK", "utf-8")
        }
      ]);

      process.env.AURORA_HOST_LOCAL_RUNTIME = "1";
      process.env.AURORA_HOST_NWN_GAME_ROOT = join(tempRoot, "game");

      const settings = buildRuntimeSettingsRecord();
      settings.paths.vanillaDataPath = "/host/nwn-game/data";
      settings.sources.placeable.includeVanilla = true;
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      const derivedKey = "modules/current/__aurora/derived/models/plc_hangbag.glb";
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-host-local-vanilla-texture",
        totalFiles: 1,
        totalBytes: 120,
        objects: [{ key: derivedKey, size: 120, etag: "derived-hash" }],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) =>
        key === derivedKey
          ? {
              key,
              size: 120,
              contentType: "model/gltf-binary",
              etag: "derived-hash",
              bytes: buildGlbWithTextureReferences(["tin01_sac"])
            }
          : null
      );
      putModuleObject.mockImplementation(async (_settings, file) => ({
        key: `modules/current/${file.fileName}`,
        size: file.bytes.length,
        etag: `etag-${file.fileName}`
      }));

      repository.findByKindAndId.mockResolvedValue({
        ...buildTemplate("placeable", "plc_hangbag_001"),
        resref: "plc_hangbag",
        placeableSubtype: "generic",
        metadata: {
          lookupModelResRef: "plc_hangbag"
        }
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:10:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithBlob.processPlaceable({
        templateId: "plc_hangbag_001",
        bypassCache: false,
        includeBenchmarkMetadata: true
      });

      expect(putModuleObject).toHaveBeenCalledWith(
        settings.blobStorage,
        expect.objectContaining({
          fileName: "__aurora/sources/vanilla/textures/tin01_sac.dds",
          resourceType: NWN_KEY_BIF_RESOURCE_TYPES.DDS,
          bytes: Buffer.from("DDS_SACK", "utf-8")
        })
      );
      expect(result.placeable.renderPackage?.textureBindings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            reference: "tin01_sac",
            assetId: expect.any(String)
          })
        ])
      );
    } finally {
      if (previousHostRuntime === undefined) {
        delete process.env.AURORA_HOST_LOCAL_RUNTIME;
      } else {
        process.env.AURORA_HOST_LOCAL_RUNTIME = previousHostRuntime;
      }
      if (previousGameRoot === undefined) {
        delete process.env.AURORA_HOST_NWN_GAME_ROOT;
      } else {
        process.env.AURORA_HOST_NWN_GAME_ROOT = previousGameRoot;
      }
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("keeps TXI sidecars from suppressing same-basename image textures", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-placeable-txi-sidecar-hak-"));
    const hakPath = join(tempRoot, "textures.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        { resref: "pee", restype: 3, bytes: Buffer.from([1, 2, 3]) }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["textures.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const storedObjects = new Map<
        string,
        { bytes: Buffer; contentType: string; etag: string }
      >();
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      const derivedKey = "modules/current/__aurora/derived/models/zlc_pee.glb";
      const txiKey = "modules/current/__aurora/sources/hak/cep3_core0/pee.txi";
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-txi-sidecar",
        totalFiles: 2,
        totalBytes: 124,
        objects: [
          { key: derivedKey, size: 120, etag: "derived-hash" },
          { key: txiKey, size: 4, etag: "txi-hash" }
        ],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
        if (key === derivedKey) {
          const bytes = buildGlbWithTextureReferences(["pee"]);
          return {
            key,
            size: bytes.length,
            contentType: "model/gltf-binary",
            bytes
          };
        }
        if (key === txiKey) {
          return {
            key,
            size: 4,
            contentType: "application/octet-stream",
            etag: "txi-hash",
            bytes: Buffer.from("txi\n")
          };
        }
        const stored = storedObjects.get(key);
        return stored
          ? {
              key,
              size: stored.bytes.length,
              contentType: stored.contentType,
              etag: stored.etag,
              bytes: stored.bytes
            }
          : null;
      });
      putModuleObject.mockImplementation(async (_settings, file) => {
        const normalizedFileName = file.fileName.replace(/\\/gu, "/").replace(/^\/+/u, "");
        const key = `modules/current/${normalizedFileName}`;
        const bytes = Buffer.from(file.bytes);
        const etag = `etag-${storedObjects.size + 1}`;
        storedObjects.set(key, {
          bytes,
          contentType: "application/octet-stream",
          etag
        });
        return { key, size: bytes.length, etag };
      });

      repository.findByKindAndId.mockResolvedValue({
        ...buildTemplate("placeable", "plc_pee_001"),
        resref: "zlc_pee",
        placeableSubtype: "generic",
        metadata: {
          lookupModelResRef: "zlc_pee"
        }
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:10:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithBlob.processPlaceable({
        templateId: "plc_pee_001",
        bypassCache: false,
        includeBenchmarkMetadata: true
      });

      expect(result.placeable.assetManifest.assets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "material",
            fileName: "pee.txi"
          }),
          expect.objectContaining({
            role: "texture",
            fileName: "pee.tga"
          })
        ])
      );
      const textureAsset = result.placeable.assetManifest.assets.find(
        (asset) => asset.fileName === "pee.tga"
      );
      expect(result.placeable.renderPackage?.textureUrls).toContain(
        `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${textureAsset?.assetId}.tga`
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("falls back to source model texture references when lightweight batch GLB metadata is empty", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-placeable-source-material-hak-"));
    const hakPath = join(tempRoot, "materials.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "mat_ref",
          restype: 2072,
          bytes: Buffer.from("texture0 mat_ref_d\n", "utf-8")
        },
        { resref: "mat_ref_d", restype: 2033, bytes: Buffer.from([1, 2, 3]) }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["materials.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const storedObjects = new Map<
        string,
        { bytes: Buffer; contentType: string; etag: string }
      >();
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      const derivedKey = "modules/current/__aurora/derived/models/plc_source_material.glb";
      const sourceKey =
        "modules/current/__aurora/sources/hak/materials/plc_source_material.mdl";
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-source-material-fallback",
        totalFiles: 2,
        totalBytes: 240,
        objects: [
          { key: derivedKey, size: 120, etag: "derived-hash" },
          { key: sourceKey, size: 120, etag: "source-hash" }
        ],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
        if (key === derivedKey) {
          const bytes = buildGlbFromJson({ asset: { version: "2.0" } });
          return {
            key,
            size: bytes.length,
            contentType: "model/gltf-binary",
            bytes
          };
        }
        if (key === sourceKey) {
          const bytes = Buffer.from(
            [
              "newmodel plc_source_material",
              "beginmodelgeom plc_source_material",
              "node trimesh mesh01",
              "  texture0 mat_ref",
              "endnode",
              "endmodelgeom plc_source_material"
            ].join("\n"),
            "utf-8"
          );
          return {
            key,
            size: bytes.length,
            contentType: "application/octet-stream",
            bytes
          };
        }
        const stored = storedObjects.get(key);
        return stored
          ? {
              key,
              size: stored.bytes.length,
              contentType: stored.contentType,
              etag: stored.etag,
              bytes: stored.bytes
            }
          : null;
      });
      putModuleObject.mockImplementation(async (_settings, file) => {
        const normalizedFileName = file.fileName.replace(/\\/gu, "/").replace(/^\/+/u, "");
        const key = `modules/current/${normalizedFileName}`;
        const bytes = Buffer.from(file.bytes);
        const etag = `etag-${storedObjects.size + 1}`;
        storedObjects.set(key, {
          bytes,
          contentType: "application/octet-stream",
          etag
        });
        return { key, size: bytes.length, etag };
      });

      repository.findByKindAndId.mockResolvedValue({
        ...buildTemplate("placeable", "plc_source_material_001"),
        resref: "plc_source_material",
        placeableSubtype: "generic",
        metadata: {
          lookupModelResRef: "plc_source_material"
        }
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:10:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithBlob.processPlaceable(
        {
          templateId: "plc_source_material_001",
          bypassCache: false,
          includeBenchmarkMetadata: true
        },
        {
          allowExpensiveSourceReferenceScans: false,
          allowOnDemandTextureLookup: true
        }
      );

      expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledTimes(2);
      expect(result.placeable.assetManifest.assets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "material",
            fileName: "mat_ref.mtr"
          }),
          expect.objectContaining({
            role: "texture",
            fileName: "mat_ref_d.dds"
          })
        ])
      );
      expect(result.placeable.renderPackage?.textureUrls).toHaveLength(1);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("adds blob texture assets from standard gltf image URI references in derived glb", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-standard-gltf-image-uri",
      totalFiles: 2,
      totalBytes: 136,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/plc_image_uri.glb",
          size: 120,
          etag: "derived-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_core/textures/tx_image_uri.dds",
          size: 16,
          etag: "texture-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/__aurora/derived/models/plc_image_uri.glb") {
        return null;
      }
      const bytes = buildGlbFromJson({
        asset: { version: "2.0", generator: "catalog-test" },
        images: [
          { uri: "textures/tx_image_uri.dds" },
          { uri: "data:image/png;base64,ignored" }
        ],
        materials: [
          {
            pbrMetallicRoughness: {
              baseColorTexture: { index: 0 }
            }
          }
        ]
      });
      return {
        key,
        size: bytes.length,
        contentType: "model/gltf-binary",
        bytes
      };
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_image_uri_001"),
      resref: "plc_image_uri",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_image_uri"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_image_uri_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.placeableSubtype).toBe("generic");
    const textureAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "tx_image_uri.dds"
    );
    expect(textureAsset).toMatchObject({
      role: "texture",
      objectKey: "modules/current/__aurora/sources/hak/lc_core/textures/tx_image_uri.dds"
    });
    expect(result.placeable.renderPackage?.textureUrls).toContain(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${textureAsset!.assetId}.dds`
    );
  });

  it("orders render package texture urls by Aurora source priority when blob textures collide", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    const settings = buildRuntimeSettingsRecord();
    settings.sources.placeable.includeHaks = true;
    settings.sources.placeable.hakPriorityList = ["lc_high.hak", "lc_low.hak"];
    runtimeSettingsRepository.get.mockResolvedValue(settings);
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-texture-priority",
      totalFiles: 5,
      totalBytes: 184,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/plc_priority.glb",
          size: 120,
          etag: "derived-hash"
        },
        {
          key: "modules/current/__aurora/sources/vanilla/textures/tx_shared.dds",
          size: 16,
          etag: "vanilla"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_low/textures/tx_shared.dds",
          size: 16,
          etag: "hak-low"
        },
        {
          key: "modules/current/textures/tx_shared.dds",
          size: 16,
          etag: "module"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_high/textures/tx_shared.dds",
          size: 16,
          etag: "hak-high"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/__aurora/derived/models/plc_priority.glb") {
        return null;
      }
      const bytes = buildGlbWithTextureReferences(["tx_shared"]);
      return {
        key,
        size: bytes.length,
        contentType: "model/gltf-binary",
        bytes
      };
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_priority_001"),
      resref: "plc_priority",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_priority"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_priority_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const textureAssetsByObjectKey = new Map(
      result.placeable.assetManifest.assets
        .filter((asset) => asset.role === "texture")
        .map((asset) => [asset.objectKey, asset])
    );
    const expectedTextureAssets = [
      textureAssetsByObjectKey.get("modules/current/textures/tx_shared.dds"),
      textureAssetsByObjectKey.get(
        "modules/current/__aurora/sources/hak/lc_high/textures/tx_shared.dds"
      ),
      textureAssetsByObjectKey.get(
        "modules/current/__aurora/sources/hak/lc_low/textures/tx_shared.dds"
      ),
      textureAssetsByObjectKey.get(
        "modules/current/__aurora/sources/vanilla/textures/tx_shared.dds"
      )
    ];
    expect(expectedTextureAssets.every(Boolean)).toBe(true);
    expect(result.placeable.renderPackage?.textureUrls).toEqual(
      expectedTextureAssets.map(
        (asset) =>
          `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${asset!.assetId}.dds`
      )
    );
  });

  it("uses texture references from converter-generated multi-material glb to collect blob texture assets", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const generatedGlb = convertAuroraAsciiMdlToGlb(MULTI_TEXTURE_PLACEABLE_ASCII_MDL).bytes;
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-converter-multi-texture",
      totalFiles: 3,
      totalBytes: generatedGlb.length + 32,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/plc_multi.glb",
          size: generatedGlb.length,
          etag: "derived-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_core/textures/tx_wood.dds",
          size: 16,
          etag: "wood-texture-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_core/textures/tx_metal.tga",
          size: 16,
          etag: "metal-texture-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/__aurora/derived/models/plc_multi.glb") {
        return null;
      }
      return {
        key,
        size: generatedGlb.length,
        contentType: "model/gltf-binary",
        bytes: generatedGlb
      };
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_multi_001"),
      resref: "plc_multi",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_multi"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_multi_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const textureAssets = result.placeable.assetManifest.assets.filter(
      (asset) => asset.role === "texture"
    );
    expect(textureAssets.map((asset) => asset.fileName)).toEqual([
      "tx_metal.tga",
      "tx_wood.dds"
    ]);
    expect(result.placeable.renderPackage?.textureUrls).toEqual(
      textureAssets.map(
        (asset) =>
          `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${asset.assetId}.${asset.extension}`
      )
    );
  });

  it("extracts Aurora material bump/env texture tokens from MTR assets", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/materials/fx_smoke.mtr",
      size: 128,
      contentType: "text/plain",
      bytes: Buffer.from(
        [
          "bumpmaptexture fxpa_smoke_bump",
          "bumpyshinytexture fxpa_smoke_shiny",
          "envmaptexture fxpa_smoke_env",
          "bumpreplacementtexture fxpa_smoke_repl",
          "blending additive",
          "blending punchthrough",
          "decal 1",
          "oParam float g_fShadowAlphaCutoff 0.5",
          "oParam int g_iShaderMode 2"
        ].join("\n"),
        "latin1"
      )
    });
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const references = await (
      serviceWithBlob as unknown as {
        collectTextureReferencesFromMaterialAssets: (
          assets: Array<{ role: string; objectKey: string }>
        ) => Promise<string[]>;
      }
    ).collectTextureReferencesFromMaterialAssets([
      {
        role: "material",
        objectKey: "modules/current/materials/fx_smoke.mtr"
      }
    ]);

    expect(references).toEqual([
      "fxpa_smoke_bump",
      "fxpa_smoke_env",
      "fxpa_smoke_repl",
      "fxpa_smoke_shiny"
    ]);
    expect(references).not.toEqual(
      expect.arrayContaining([
        "additive",
        "punchthrough",
        "1",
        "g_fshadowalphacutoff",
        "g_ishadermode"
      ])
    );
    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "aurora-module-assets" }),
      "modules/current/materials/fx_smoke.mtr"
    );
  });

  it("extracts Aurora MTR state and its reachable custom-shader source graph", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      const sourceByKey = new Map([
        [
          "modules/current/materials/fx_add.mtr",
          [
            "blending additive",
            "decal 0",
            "transparency 0",
            "twosided 0",
            "sample_framebuffer 2",
            "volumetric 1",
            "renderhint NormalTangents",
            "customShaderVS fx_add_vs",
            "customShaderFS fx_add_fs",
            "texture0 fx_add_d",
            "texture1 fx_add_n",
            "bumpmaptexture fx_add_bump",
            "bumpyshinytexture fx_add_shiny",
            "envmaptexture fx_add_env",
            "bumpreplacementtexture fx_add_replacement"
          ].join("\n")
        ],
        [
          "modules/current/materials/fx_punch.mtr",
          [
            "blending punchthrough",
            "decal 1",
            "transparency 1",
            "twosided 1",
            "renderhint NormalAndSpecMapped",
            "bitmap fx_punch_bitmap",
            "texture0 fx_punch_d",
            "texture2 fx_punch_s",
            "parameter float Roughness 0.62",
            "parameter float Specularity 0.45",
            "parameter float Metallicness 0.001",
            "parameter float CustomTint 1 0.5 0.25 1",
            "parameter int CustomMode 2"
          ].join("\n")
        ],
        [
          "modules/current/materials/fx_unknown.mtr",
          ["blending alpha", "decal maybe"].join("\n")
        ],
        [
          "modules/current/shaders/fx_add_vs.shd",
          ['#include "inc_common"', "void main() {}"].join("\n")
        ],
        [
          "modules/current/shaders/fx_add_fs.shd",
          ['#include "inc_common.shd"', "void main() {}"].join("\n")
        ],
        [
          "modules/current/shaders/inc_common.shd",
          "uniform mat4 m_mvp;"
        ]
      ]);
      const source = sourceByKey.get(key);
      if (!source) {
        return null;
      }
      return {
        key,
        size: source.length,
        contentType: "text/plain",
        bytes: Buffer.from(source, "latin1")
      };
    });
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const materialAssets = [
      {
        assetId: "asset_material_add",
        role: "material",
        fileName: "fx_add.mtr",
        objectKey: "modules/current/materials/fx_add.mtr",
        extension: "mtr"
      },
      {
        assetId: "asset_material_punch",
        role: "material",
        fileName: "fx_punch.mtr",
        objectKey: "modules/current/materials/fx_punch.mtr",
        extension: "mtr"
      },
      {
        assetId: "asset_material_unknown",
        role: "material",
        fileName: "fx_unknown.mtr",
        objectKey: "modules/current/materials/fx_unknown.mtr",
        extension: "mtr"
      },
      {
        assetId: "asset_shader_vs",
        role: "material",
        fileName: "fx_add_vs.shd",
        objectKey: "modules/current/shaders/fx_add_vs.shd",
        extension: "shd"
      },
      {
        assetId: "asset_shader_fs",
        role: "material",
        fileName: "fx_add_fs.shd",
        objectKey: "modules/current/shaders/fx_add_fs.shd",
        extension: "shd"
      },
      {
        assetId: "asset_shader_include",
        role: "material",
        fileName: "inc_common.shd",
        objectKey: "modules/current/shaders/inc_common.shd",
        extension: "shd"
      }
    ];

    const auroraMaterial = await (
      serviceWithBlob as unknown as {
        collectAuroraMaterialPayloadFromMaterialAssets: (
          assets: Array<{
            assetId: string;
            role: string;
            fileName: string;
            objectKey: string;
            extension: string;
          }>
        ) => Promise<PlaceableRenderPackage["auroraMaterial"] | undefined>;
      }
    ).collectAuroraMaterialPayloadFromMaterialAssets(materialAssets);

    expect(auroraMaterial).toEqual({
      source: "mtr",
      materials: [
        {
          source: "aurora-mtr",
          materialAssetId: "asset_material_add",
          materialFileName: "fx_add.mtr",
          materialObjectKey: "modules/current/materials/fx_add.mtr",
          state: {
            blending: "additive",
            auroraBlendField48: 0,
            auroraBlendField4c: 2,
            decal: false,
            transparency: false,
            twoSided: false,
            sampleFramebuffer: 2,
            volumetric: true,
            renderHint: "NormalTangents",
            customShaderVS: "fx_add_vs",
            customShaderFS: "fx_add_fs",
            customShaderProgram: {
              version: "aurora-shader-program-source/v1",
              status: "complete",
              stageRoots: {
                vertex: "fx_add_vs",
                fragment: "fx_add_fs"
              },
              sources: [
                {
                  resref: "fx_add_fs",
                  source: ['#include "inc_common.shd"', "void main() {}"].join("\n"),
                  includeRefs: ["inc_common"],
                  sourceAssetId: "asset_shader_fs",
                  sourceObjectKey: "modules/current/shaders/fx_add_fs.shd"
                },
                {
                  resref: "fx_add_vs",
                  source: ['#include "inc_common"', "void main() {}"].join("\n"),
                  includeRefs: ["inc_common"],
                  sourceAssetId: "asset_shader_vs",
                  sourceObjectKey: "modules/current/shaders/fx_add_vs.shd"
                },
                {
                  resref: "inc_common",
                  source: "uniform mat4 m_mvp;",
                  includeRefs: [],
                  sourceAssetId: "asset_shader_include",
                  sourceObjectKey: "modules/current/shaders/inc_common.shd"
                }
              ],
              unresolvedRefs: []
            },
            bumpmaptexture: "fx_add_bump",
            bumpyshinytexture: "fx_add_shiny",
            envmaptexture: "fx_add_env",
            bumpreplacementtexture: "fx_add_replacement",
            textureSlots: [
              {
                slot: 0,
                role: "diffuse",
                reference: "fx_add_d"
              },
              {
                slot: 1,
                role: "normal",
                reference: "fx_add_n"
              }
            ]
          }
        },
        {
          source: "aurora-mtr",
          materialAssetId: "asset_material_punch",
          materialFileName: "fx_punch.mtr",
          materialObjectKey: "modules/current/materials/fx_punch.mtr",
          state: {
            blending: "punchthrough",
            auroraBlendField48: 2,
            auroraBlendField4c: 3,
            decal: true,
            transparency: true,
            twoSided: true,
            renderHint: "NormalAndSpecMapped",
            roughness: 0.62,
            specularity: 0.45,
            parameters: [
              { name: "Roughness", kind: "float", values: [0.62], arity: 1 },
              { name: "Specularity", kind: "float", values: [0.45], arity: 1 },
              { name: "Metallicness", kind: "float", values: [0.001], arity: 1 },
              {
                name: "CustomTint",
                kind: "float",
                values: [1, 0.5, 0.25, 1],
                arity: 4
              },
              { name: "CustomMode", kind: "int", values: [2], arity: 1 }
            ],
            textureSlots: [
              {
                slot: 0,
                role: "diffuse",
                reference: "fx_punch_d"
              },
              {
                slot: 2,
                role: "specular",
                reference: "fx_punch_s"
              }
            ]
          }
        }
      ],
      diagnostics: [
        {
          code: "VFX_AURORA_MTR_CUSTOM_SHADER_SOURCE_GRAPH_READY",
          severity: "warn",
          message:
            "Material fx_add.mtr has a complete custom shader source/include graph; browser program binding and visual parity are still separate gates."
        }
      ]
    });

    const decorated = await (
      serviceWithBlob as unknown as {
        decorateRenderPackageWithAuroraMaterial: (
          assetManifest: { assets: typeof materialAssets },
          renderPackage: PlaceableRenderPackage,
          subtype?: string
        ) => Promise<PlaceableRenderPackage>;
      }
    ).decorateRenderPackageWithAuroraMaterial(
      { assets: materialAssets },
      {
        status: "missing_derived",
        diagnostics: [],
        assetRefs: {
          materialAssetIds: ["asset_material_add", "asset_material_punch"]
        }
      },
      "vfx"
    );

    expect(decorated.status).toBe("missing_derived");
    expect(decorated.auroraMaterial).toEqual(auroraMaterial);
    expect(decorated.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PLACEABLE_AURORA_MTR_MATERIAL_STATE_PRESERVED"
        })
      ])
    );
  });

  it("attaches Aurora TXI texture state to render package texture bindings", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/materials/phod_fx_pntgrm.txi") {
        return null;
      }
      const source = [
        "decal 1",
        "clamp 3",
        "blending additive",
        "mipmap 0",
        "filter 0",
        "bumpmaptexture phod_fx_pntgrm_b",
        "envmaptexture phod_fx_pntgrm_e",
        "proceduretype cycle",
        "numx 4",
        "numy 2",
        "fps 12"
      ].join("\n");
      return {
        key,
        size: source.length,
        contentType: "text/plain",
        bytes: Buffer.from(source, "latin1")
      };
    });
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const assets = [
      {
        assetId: "asset_texture_pentagram",
        role: "texture",
        fileName: "phod_fx_pntgrm.tga",
        objectKey: "modules/current/textures/phod_fx_pntgrm.tga",
        extension: "tga"
      },
      {
        assetId: "asset_txi_pentagram",
        role: "material",
        fileName: "phod_fx_pntgrm.txi",
        objectKey: "modules/current/materials/phod_fx_pntgrm.txi",
        extension: "txi"
      }
    ];

    const decorated = await (
      serviceWithBlob as unknown as {
        decorateRenderPackageWithAuroraTextureState: (
          assetManifest: { assets: typeof assets },
          renderPackage: PlaceableRenderPackage
        ) => Promise<PlaceableRenderPackage>;
      }
    ).decorateRenderPackageWithAuroraTextureState(
      { assets },
      {
        status: "ready",
        diagnostics: [],
        assetRefs: {
          textureAssetIds: ["asset_texture_pentagram"],
          materialAssetIds: ["asset_txi_pentagram"]
        },
        textureBindings: [
          {
            reference: "phod_fx_pntgrm",
            assetId: "asset_texture_pentagram",
            fileName: "phod_fx_pntgrm.tga",
            objectKey: "modules/current/textures/phod_fx_pntgrm.tga",
            deliveryUrl: "/api/v1/catalog/placeables/cache/cache/assets/asset_texture_pentagram"
          }
        ]
      }
    );

    expect(decorated.textureBindings?.[0]?.txi).toEqual({
      decal: true,
      clamp: 3,
      blending: "additive",
      mipmap: false,
      filter: false,
      bumpmaptexture: "phod_fx_pntgrm_b",
      envmaptexture: "phod_fx_pntgrm_e",
      proceduretype: "cycle",
      numx: 4,
      numy: 2,
      fps: 12
    });
  });

  it("extracts emitter texture references from binary source MDL when derived model is missing", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const sourceModelBytes = buildEmitterOnlyBinaryMdl("fxpa_smoke01", {
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Normal",
      xGridRaw: 4,
      yGridRaw: 4,
      fps: 12,
      frameStart: 1,
      frameEnd: 15,
      spawnType: 1,
      chunkName: "red_m_giblet",
      twoSidedTexture: true,
      loop: true,
      renderOrder: -3,
      random: true,
      isTinted: false,
      splat: true,
      controllerRows: 2,
      simulation: {
        xSize: 60,
        ySize: 40,
        birthrate: 5,
        lifeExp: 1.5,
        mass: -0.25,
        velocity: 3,
        randvel: 1,
        spread: 6.28,
        particleRot: 0.75,
        bounce: true,
        bounceCoefficient: 0.33,
        blurLength: 2,
        deadspace: 0.25,
        p2p: true,
        p2pBezier: true,
        p2pBezier2: 0.2,
        p2pBezier3: 0.8,
        combineTime: 0.4,
        grav: 2,
        drag: 1,
        threshold: 1.5,
        inherit: true,
        inheritVel: true,
        inheritLocal: true,
        inheritPart: true,
        affectedByWind: true,
        sizeStart: 0.5,
        sizeMid: 0.75,
        sizeEnd: 0.1,
        sizeStartY: 0.6,
        sizeMidY: 0.8,
        sizeEndY: 0.2,
        alphaStart: 1,
        alphaMid: 0.5,
        alphaEnd: 0,
        colorStart: [1, 0.4, 0],
        colorMid: [0.5, 0.2, 0],
        colorEnd: [0.2, 0.1, 0],
        percentStart: 0.1,
        percentMid: 0.6,
        percentEnd: 0.9
      },
      transform: {
        position: [0, 0, 5],
        orientationQuaternion: [0.7070903778076172, 0, 0, 0.7071231603622437]
      }
    });
    const chunkModelBytes = Buffer.from("newmodel red_m_giblet\n", "latin1");
    const chunkModelGlbBytes = Buffer.from("chunk glb");
    derivedAssetGenerator.generateDerivedAssets.mockImplementation(async (input) => {
      const isChunkModel = input.sourceFiles.some((file) =>
        file.fileName.includes("red_m_giblet.mdl")
      );
      if (!isChunkModel) {
        return {
          files: [],
          summary: {
            generator: "test-generator",
            generatedFiles: 0,
            generatedBytes: 0,
            failureReasons: ["no renderable geometry"]
          }
        };
      }
      return {
        files: [
          {
            fileName: "__aurora/derived/models/red_m_giblet.glb",
            resourceType: 0,
            bytes: chunkModelGlbBytes
          }
        ],
        summary: {
          generator: "test-generator",
          generatedFiles: 1,
          generatedBytes: chunkModelGlbBytes.length
        }
      };
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: "modules/current/__aurora/derived/models/red_m_giblet.glb",
      etag: "chunk-model-glb",
      size: chunkModelGlbBytes.length
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-source-emitter-texture",
      totalFiles: 3,
      totalBytes: sourceModelBytes.length + chunkModelBytes.length + 16,
      objects: [
        {
          key: "modules/current/models/cot_fx01.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/models/red_m_giblet.mdl",
          size: chunkModelBytes.length,
          etag: "chunk-model"
        },
        {
          key: "modules/current/textures/fxpa_smoke01.tga",
          size: 16,
          etag: "source-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/cot_fx01.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      if (key === "modules/current/models/red_m_giblet.mdl") {
        return {
          key,
          size: chunkModelBytes.length,
          contentType: "application/octet-stream",
          bytes: chunkModelBytes
        };
      }
      if (key === "modules/current/__aurora/derived/models/red_m_giblet.glb") {
        return {
          key,
          size: chunkModelGlbBytes.length,
          contentType: "model/gltf-binary",
          bytes: chunkModelGlbBytes
        };
      }
      return null;
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_cot_fx01"),
      resref: "plc_cot_fx01",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "cot_fx01"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_cot_fx01",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.renderPackage?.status).toBe("ready");
    const textureAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "fxpa_smoke01.tga"
    );
    const chunkModelAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "red_m_giblet.glb"
    );
    const chunkSourceModelAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "red_m_giblet.mdl"
    );
    expect(textureAsset).toBeDefined();
    expect(chunkModelAsset).toBeDefined();
    expect(chunkSourceModelAsset).toBeDefined();
    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceFiles: [
          expect.objectContaining({
            fileName: "modules/current/models/red_m_giblet.mdl",
            bytes: chunkModelBytes
          })
        ]
      })
    );
    expect(result.placeable.renderPackage?.assetRefs.chunkModelAssetIds).toContain(
      chunkModelAsset!.assetId
    );
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).toEqual(
      expect.arrayContaining([
        "VFX_CHUNKNAME_OVERRIDES_TEXTURE",
        "VFX_CHUNK_MODEL_RESOURCE_READY"
      ])
    );
    expect(result.placeable.renderPackage?.textureUrls).toContain(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${textureAsset!.assetId}.tga`
    );
    expect(result.placeable.renderPackage?.auroraEmitter?.emitters[0]).toMatchObject({
      source: "aurora-mdl-binary",
      sourceModelFileName: "cot_fx01.mdl",
      sourceModelObjectKey: "modules/current/models/cot_fx01.mdl",
      nodeName: "emit_smoke",
      texture: "fxpa_smoke01",
      chunkName: "red_m_giblet",
      chunkModelAssetId: chunkModelAsset!.assetId,
      chunkModelFileName: "red_m_giblet.glb",
      chunkModelObjectKey: "modules/current/__aurora/derived/models/red_m_giblet.glb",
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Normal",
      atlas: {
        xGridRaw: 4,
        yGridRaw: 4,
        effectiveXGrid: 4,
        effectiveYGrid: 4,
        fps: 12,
        frameStart: 1,
        frameEnd: 15,
        random: true
      },
      simulation: {
        xSize: 60,
        ySize: 40,
        spawnType: 1,
        birthrate: 5,
        lifeExp: 1.5,
        mass: -0.25,
        velocity: 3,
        randvel: 1,
        spread: expect.closeTo(6.28, 6),
        particleRot: 0.75,
        bounce: true,
        bounceCoefficient: expect.closeTo(0.33, 6),
        blurLength: 2,
        deadspace: 0.25,
        p2p: true,
        p2pType: "bezier",
        p2pBezier2: expect.closeTo(0.2, 6),
        p2pBezier3: expect.closeTo(0.8, 6),
        combineTime: expect.closeTo(0.4, 6),
        grav: 2,
        drag: 1,
        threshold: 1.5,
        inherit: true,
        inheritVel: true,
        inheritLocal: true,
        inheritPart: true,
        affectedByWind: true,
        sizeStart: 0.5,
        sizeMid: 0.75,
        sizeEnd: expect.closeTo(0.1, 6),
        sizeStartY: expect.closeTo(0.6, 6),
        sizeMidY: expect.closeTo(0.8, 6),
        sizeEndY: expect.closeTo(0.2, 6),
        alphaStart: 1,
        alphaMid: 0.5,
        alphaEnd: 0,
        colorStart: [1, expect.closeTo(0.4, 6), 0],
        colorMid: [0.5, expect.closeTo(0.2, 6), 0],
        colorEnd: [expect.closeTo(0.2, 6), expect.closeTo(0.1, 6), 0],
        percentStart: expect.closeTo(0.1, 6),
        percentMid: expect.closeTo(0.6, 6),
        percentEnd: expect.closeTo(0.9, 6)
      },
      sourceState: {
        twoSidedTexture: true,
        loop: true,
        renderOrder: -3,
        isTinted: false,
        splat: true
      },
      transform: {
        position: [0, 0, 5],
        orientation: {
          axis: [1, 0, 0],
          angleRadians: expect.closeTo(1.5707499652607495, 6)
        }
      }
    });
  });

  it("lists waypoints through repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listWaypoints({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("waypoint", {
      limit: 20,
      offset: 0
    });
  });

  it("attaches source MDL emitter payloads to ordinary placeables without reclassifying them as VFX", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [],
      summary: {
        generator: "test-generator",
        generatedFiles: 0,
        generatedBytes: 0,
        failureReasons: ["no renderable geometry"]
      }
    });

    const sourceModelBytes = buildEmitterOnlyBinaryMdl("fxpa_flare", {
      emitterType: "Fountain",
      renderMode: "Normal",
      blendMode: "Lighten",
      simulation: {
        birthrate: 12,
        lifeExp: 0.5,
        sizeStart: 0.1,
        sizeEnd: 0.25,
        alphaStart: 0.75,
        alphaEnd: 0
      },
      transform: {
        position: [0, 0, 1.5]
      }
    });
    const materialBytes = Buffer.from(
      [
        "transparency 0",
        "twosided 1",
        "sample_framebuffer 2",
        "volumetric 1",
        "bumpmaptexture fxpa_flare_bump",
        "bumpyshinytexture fxpa_flare_shiny",
        "envmaptexture fxpa_flare_env",
        "bumpreplacementtexture fxpa_flare_replacement",
        "texture6 fxpa_flare_flow"
      ].join("\n")
    );
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-generic-emitter",
      totalFiles: 3,
      totalBytes: sourceModelBytes.length + materialBytes.length + 16,
      objects: [
        {
          key: "modules/current/models/plc_magic_mouth.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/textures/fxpa_flare.tga",
          size: 16,
          etag: "source-texture"
        },
        {
          key: "modules/current/materials/fxpa_flare.mtr",
          size: materialBytes.length,
          etag: "source-material"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/plc_magic_mouth.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      if (key === "modules/current/materials/fxpa_flare.mtr") {
        return {
          key,
          size: materialBytes.length,
          contentType: "text/plain",
          bytes: materialBytes
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_magic_mouth"),
      resref: "plc_magic_mouth",
      name: "Magic Mouth",
      category: "props",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_magic_mouth"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));
    const vfxService = {
      processVfxPackage: jest.fn().mockResolvedValue({
        cache: {
          key: "vfx-cache",
          hit: false,
          storedAt: "2026-05-24T10:10:00.000Z",
          hits: 0
        },
        vfx: {
          version: "aurora-vfx-package/v1",
          packageKind: "runtime_package",
          sourcePolicyTrace: { diagnostics: [] },
          sourceRows: [],
          dependencyGraph: {
            version: "aurora-vfx-dependency-graph/v1",
            edges: [],
            diagnostics: []
          },
          runtimeEmitters: [
            {
              emitterIndex: 0,
              emitterNodeName: "glow",
              runtimeState: { diagnostics: [], lastTickDiagnostics: [] },
              runtimeSnapshot: {},
              renderContract: {
                version: "aurora-vfx-runtime-render-contract/v1",
                diagnostics: [],
                drawRecords: []
              }
            }
          ],
          renderContract: {
            version: "aurora-vfx-runtime-render-contract/v1",
            diagnostics: [],
            drawRecords: []
          },
          diagnostics: [],
          observability: {
            sourceHash: "hash",
            cacheHit: false,
            diagnosticsCount: 0,
            unresolvedDependencyCount: 0,
            runtimePackageStatus: "runtime_ready",
            renderContractStatus: "ready"
          }
        }
      })
    };

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator,
      vfxService as never
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_magic_mouth",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.placeableSubtype).toBe("generic");
    expect(result.placeable.render.isVfx).toBe(false);
    expect(result.placeable.render.backendType).toBe("generic");
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(result.placeable.renderPackage?.glbUrl).toBeUndefined();
    expect(result.placeable.renderPackage?.textureUrls?.[0]).toContain(".tga");
    expect(result.placeable.renderPackage?.auroraEmitter?.emitters[0]).toMatchObject({
      source: "aurora-mdl-binary",
      sourceModelFileName: "plc_magic_mouth.mdl",
      sourceModelObjectKey: "modules/current/models/plc_magic_mouth.mdl",
      texture: "fxpa_flare",
      emitterType: "Fountain",
      renderMode: "Normal",
      blendMode: "Lighten",
      transform: {
        position: [0, 0, 1.5]
      },
      simulation: {
        birthrate: 12,
        lifeExp: 0.5,
        sizeStart: expect.closeTo(0.1, 6),
        sizeEnd: expect.closeTo(0.25, 6),
        alphaStart: expect.closeTo(0.75, 6),
        alphaEnd: 0
      }
    });
    expect(result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "PLACEABLE_RENDER_READY",
        "PLACEABLE_AURORA_MDL_EMITTER_PAYLOAD_READY",
        "VFX_AURORA_MDL_EMITTER_PAYLOAD_READY",
        "VFX_AURORA_MDL_EMITTER_BACKEND_RUNTIME_PAYLOAD_READY",
        "VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL"
      ])
    );
    expect(vfxService.processVfxPackage).toHaveBeenCalledWith(
      expect.objectContaining({
        packageKind: "model_graph_runtime",
        sourceProfile: "catalog-placeable-source-mdl",
        runtime: {
          dtSeconds: 0.125,
          simulationStepSeconds: 1 / 60,
          tickCount: 80,
          executionParticleBudget: 4096,
          seed: 211
        },
        sourceEmitters: [
          expect.objectContaining({
            nodeKind: "emitter",
            nodeName: "emit_smoke",
            texture: "fxpa_flare",
            emitterType: "Fountain",
            renderMode: "Normal",
            blendMode: "Lighten"
          })
        ],
        sourceEmitterMaterials: [
          {
            emitterIndex: 0,
            emitterNodeName: "emit_smoke",
            materialState: {
              source: "aurora-mtr",
              materialRef: "fxpa_flare.mtr",
              transparency: false,
              twoSided: true,
              sampleFramebuffer: 2,
              volumetric: true,
              bumpmaptexture: "fxpa_flare_bump",
              bumpyshinytexture: "fxpa_flare_shiny",
              envmaptexture: "fxpa_flare_env",
              bumpreplacementtexture: "fxpa_flare_replacement",
              textureSlots: [
                {
                  slot: 6,
                  role: "unknown",
                  reference: "fxpa_flare_flow"
                }
              ]
            }
          }
        ]
      })
    );
    expect(result.placeable.renderPackage?.auroraVfxPayload).toMatchObject({
      version: "aurora-vfx-payload/v1",
      canonicalStatus: "canonical",
      backendCanonical: true,
      rendererEligibility: "source_backed",
      retailParityStatus: "blocked",
      sourceKind: "source_mdl_graph",
      previewMode: "none",
      contracts: {
        runtimeReplayCommand: expect.objectContaining({
          packageKind: "model_graph_runtime",
          sourceProfile: "catalog-placeable-source-mdl",
          sourceEmitters: [expect.objectContaining({ nodeName: "emit_smoke" })],
          runtime: {
            dtSeconds: 0.125,
            simulationStepSeconds: 1 / 60,
            tickCount: 80,
            executionParticleBudget: 4096,
            seed: 211
          },
          bypassCache: true
        })
      },
      localOnlyNotRetailEvidence: true,
      canonicalParityPromoted: false
    });
    expect(result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_AURORA_MDL_EMITTER_PAYLOAD_MISSING"
    );
  });

  it("refreshes cached VFX manifests when chunkName model resolution was missing", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const sourceModelBytes = buildEmitterOnlyBinaryMdl("fxpa_ash01", {
      emitterType: "Explosion",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Lighten",
      chunkName: "fx_lavaspurt",
      simulation: {
        birthrate: 1,
        lifeExp: 4,
        xSize: 900,
        ySize: 900
      }
    });
    const chunkModelBytes = Buffer.from("newmodel fx_lavaspurt\n", "latin1");
    const chunkModelGlbBytes = Buffer.from("lava spurt glb");

    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [
        {
          fileName: "__aurora/derived/models/fx_lavaspurt.glb",
          resourceType: 0,
          bytes: chunkModelGlbBytes
        }
      ],
      summary: {
        generator: "test-generator",
        generatedFiles: 1,
        generatedBytes: chunkModelGlbBytes.length
      }
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: "modules/current/__aurora/derived/models/fx_lavaspurt.glb",
      etag: "chunk-lava-glb",
      size: chunkModelGlbBytes.length
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-lava-chunk",
      totalFiles: 3,
      totalBytes: sourceModelBytes.length + chunkModelBytes.length + 16,
      objects: [
        {
          key: "modules/current/models/zlc_flr_sprtlava.mdl",
          size: sourceModelBytes.length,
          etag: "source-lava"
        },
        {
          key: "modules/current/models/fx_lavaspurt.mdl",
          size: chunkModelBytes.length,
          etag: "chunk-lava"
        },
        {
          key: "modules/current/textures/fxpa_ash01.tga",
          size: 16,
          etag: "ash-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/zlc_flr_sprtlava.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      if (key === "modules/current/models/fx_lavaspurt.mdl") {
        return {
          key,
          size: chunkModelBytes.length,
          contentType: "application/octet-stream",
          bytes: chunkModelBytes
        };
      }
      if (key === "modules/current/__aurora/derived/models/fx_lavaspurt.glb") {
        return {
          key,
          size: chunkModelGlbBytes.length,
          contentType: "model/gltf-binary",
          bytes: chunkModelGlbBytes
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_zlc_flr_sprtlava"),
      resref: "zlc_flr_sprtlava",
      name: "VFX: Spurts, Lava*",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "zlc_flr_sprtlava"
      }
    });

    const staleAsset = {
      assetId: "source-lava-asset",
      role: "model" as const,
      fileName: "zlc_flr_sprtlava.mdl",
      objectKey: "modules/current/models/zlc_flr_sprtlava.mdl",
      extension: "mdl",
      sizeBytes: sourceModelBytes.length,
      contentType: "application/octet-stream",
      etag: "source-lava"
    };
    placeableCache.get.mockResolvedValue({
      key: "cached-lava",
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_zlc_flr_sprtlava",
        resref: "zlc_flr_sprtlava",
        name: "VFX: Spurts, Lava*",
        category: "effects",
        placeableSubtype: "vfx",
        render: {
          backendType: "vfx",
          frontendType: "vfx",
          rendererPreset: "vfx-emitter",
          isDoor: false,
          isVfx: true
        },
        benchmarkCandidate: false,
        metadata: {
          lookupModelResRef: "zlc_flr_sprtlava"
        },
        placeableRuntime: {
          source: {},
          identity: {},
          interaction: {},
          locking: {},
          trap: {},
          state: {}
        },
        placeableValidationIssues: [],
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-lava-chunk",
          assetCount: 1,
          candidatesScanned: 3,
          assets: [staleAsset]
        },
        renderPackage: {
          status: "ready",
          diagnostics: [
            {
              code: "VFX_CHUNK_MODEL_MISSING",
              severity: "warn",
              message: "Chunk model 'fx_lavaspurt' was referenced but was not found."
            }
          ],
          assetRefs: {
            modelAssetIds: [staleAsset.assetId],
            otherAssetIds: [staleAsset.assetId]
          },
          auroraEmitter: {
            source: "source-mdl",
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: staleAsset.assetId,
                sourceModelFileName: staleAsset.fileName,
                sourceModelObjectKey: staleAsset.objectKey,
                nodeName: "fx_lavabase01",
                texture: "fxpa_ash01",
                chunkName: "fx_lavaspurt",
                emitterType: "Explosion",
                renderMode: "Billboard_to_World_Z"
              }
            ],
            diagnostics: []
          }
        },
        classification: {
          source: "template",
          normalizedSubtype: "vfx",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:00:00.000Z"
      }
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_zlc_flr_sprtlava",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const chunkModelAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "fx_lavaspurt.glb"
    );
    expect(chunkModelAsset).toBeDefined();
    expect(placeableCache.set).toHaveBeenCalled();
    expect(result.placeable.renderPackage?.assetRefs.chunkModelAssetIds).toContain(
      chunkModelAsset!.assetId
    );
    expect(result.placeable.renderPackage?.auroraEmitter?.emitters[0]).toMatchObject({
      chunkName: "fx_lavaspurt",
      chunkModelAssetId: chunkModelAsset!.assetId,
      chunkModelFileName: "fx_lavaspurt.glb"
    });
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).toEqual(
      expect.arrayContaining([
        "VFX_CHUNKNAME_OVERRIDES_TEXTURE",
        "VFX_CHUNK_MODEL_RESOURCE_READY"
      ])
    );
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).not.toContain("VFX_CHUNK_MODEL_MISSING");
  });

  it("preserves binary Aurora emitter birthrate keyframes instead of collapsing animated VFX to the first row", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [],
      summary: {
        generator: "test-generator",
        generatedFiles: 0,
        generatedBytes: 0,
        failureReasons: ["no renderable geometry"]
      }
    });

    const sourceModelBytes = buildEmitterOnlyBinaryMdl("fxpa_keyed_birth", {
      emitterType: "Fountain",
      renderMode: "Normal",
      blendMode: "Lighten",
      simulation: {
        birthrateKeyframes: [
          [0, 0],
          [0.25, 18],
          [1, 0]
        ],
        lifeExp: 1.5,
        sizeStartKeyframes: [
          [0, 0],
          [0.5, 3],
          [1, 1]
        ],
        sizeEnd: 1,
        alphaStartKeyframes: [
          [0, 0],
          [0.25, 1],
          [1, 0]
        ],
        alphaEnd: 0,
        colorStartKeyframes: [
          [0, 1, 0, 0],
          [0.5, 0, 1, 0],
          [1, 0, 0, 1]
        ],
        colorMidKeyframes: [
          [0, 1, 1, 0],
          [1, 0, 1, 1]
        ],
        colorEndKeyframes: [
          [0, 0.2, 0, 0],
          [1, 0, 0.2, 0]
        ],
        percentStartKeyframes: [
          [0, 0],
          [1, 0.1]
        ],
        percentMidKeyframes: [
          [0, 0.4],
          [1, 0.6]
        ],
        percentEndKeyframes: [
          [0, 0.8],
          [1, 1]
        ]
      }
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-keyed-emitter",
      totalFiles: 3,
      totalBytes: sourceModelBytes.length + 16 + 12,
      objects: [
        {
          key: "modules/current/models/plc_keyed_birth.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/__aurora/derived/models/plc_keyed_birth.glb",
          size: 12,
          etag: "stale-primary-derived"
        },
        {
          key: "modules/current/textures/fxpa_keyed_birth.tga",
          size: 16,
          etag: "source-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/plc_keyed_birth.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_keyed_birth"),
      resref: "plc_keyed_birth",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "plc_keyed_birth"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_keyed_birth",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(derivedAssetGenerator.generateDerivedAssets).not.toHaveBeenCalled();
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).toEqual(
      expect.arrayContaining([
        "PLACEABLE_RENDER_READY",
        "VFX_AURORA_MDL_EMITTER_PAYLOAD_READY",
        "VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL"
      ])
    );
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).not.toContain("PLACEABLE_RENDER_DERIVED_MISSING");
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).not.toContain("VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY");
    expect(result.placeable.renderPackage?.assetRefs.derivedModelAssetIds).toBeUndefined();
    expect(result.placeable.renderPackage?.glbUrl).toBeUndefined();

    const emitter = result.placeable.renderPackage?.auroraEmitter?.emitters[0];
    expect(emitter?.simulation?.birthrate).toBe(0);
    expect(emitter?.simulation?.timeline?.birthrate).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.25, 6), value: 18 },
      { time: 1, value: 0 }
    ]);
    expect(emitter?.simulation?.timeline?.sizeStart).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.5, 6), value: 3 },
      { time: 1, value: 1 }
    ]);
    expect(emitter?.simulation?.timeline?.alphaStart).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.25, 6), value: 1 },
      { time: 1, value: 0 }
    ]);
    expect(emitter?.simulation?.colorStart).toEqual([1, 0, 0]);
    expect(emitter?.simulation?.colorMid).toEqual([1, 1, 0]);
    expect(emitter?.simulation?.colorTimeline?.colorStart).toEqual([
      { time: 0, value: [1, 0, 0] },
      { time: expect.closeTo(0.5, 6), value: [0, 1, 0] },
      { time: 1, value: [0, 0, 1] }
    ]);
    expect(emitter?.simulation?.colorTimeline?.colorMid).toEqual([
      { time: 0, value: [1, 1, 0] },
      { time: 1, value: [0, 1, 1] }
    ]);
    expect(emitter?.simulation?.colorTimeline?.colorEnd).toEqual([
      { time: 0, value: [expect.closeTo(0.2, 6), 0, 0] },
      { time: 1, value: [0, expect.closeTo(0.2, 6), 0] }
    ]);
    expect(emitter?.simulation?.timeline?.percentStart).toEqual([
      { time: 0, value: 0 },
      { time: 1, value: expect.closeTo(0.1, 6) }
    ]);
    expect(emitter?.simulation?.timeline?.percentMid).toEqual([
      { time: 0, value: expect.closeTo(0.4, 6) },
      { time: 1, value: expect.closeTo(0.6, 6) }
    ]);
    expect(emitter?.simulation?.timeline?.percentEnd).toEqual([
      { time: 0, value: expect.closeTo(0.8, 6) },
      { time: 1, value: 1 }
    ]);
  });

  it("derives and composes source-MDL static geometry, emitters, and lights for VFX placeables", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const derivedModelBytes = Buffer.from("source-mdl-static-core-glb");
    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [
        {
          fileName: "__aurora/derived/models/dlp_light_08.glb",
          resourceType: 0,
          bytes: derivedModelBytes
        }
      ],
      summary: {
        generator: "test-generator",
        generatedFiles: 1,
        generatedBytes: derivedModelBytes.length,
        failureReasons: []
      }
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: "modules/current/__aurora/derived/models/dlp_light_08.glb",
      etag: "derived-static-core",
      size: derivedModelBytes.length
    });

    const sourceModel = Buffer.from(
      [
        "#MAXMODEL ASCII",
        "newmodel dlp_light_08",
        "beginmodelgeom dlp_light_08",
        "node dummy dlp_light_08",
        "  parent NULL",
        "endnode",
        "node trimesh static_core",
        "  parent dlp_light_08",
        "  alpha 0.75",
        "  verts 3",
        "    0 0 0",
        "    1 0 0",
        "    0 1 0",
        "  tverts 3",
        "    0 0",
        "    1 0",
        "    0 1",
        "  faces 1",
        "    0 1 2 1 0 1 2 1",
        "endnode",
        "node emitter paired_emitter",
        "  parent dlp_light_08",
        "  update Fountain",
        "  render Normal",
        "  blend Normal",
        "  texture fx_pair",
        "  birthrate 2",
        "  lifeExp 1",
        "endnode",
        "node light pulsing_light03",
        "  parent dlp_light_08",
        "  position 0.0 0.0 2.5",
        "  radius 3.0",
        "  shadowradius 1.25",
        "  verticaldisplacement 0.35",
        "  multiplier 3.0",
        "  color 0.0 0.592157 0.141176",
        "  ambientonly 0",
        "  isdynamic 1",
        "  affectDynamic 1",
        "  shadow 1",
        "  lightpriority 2",
        "  generateflare 1",
        "  texturenames 2",
        "    fx_flare_core",
        "    fx_flare_ring",
        "  endlist",
        "  flaresizes 2",
        "    0.25",
        "    0.5",
        "  endlist",
        "  flarepositions 2",
        "    0.1",
        "    0.9",
        "  endlist",
        "  flarecolorshifts 2",
        "    1.0 0.8 0.4",
        "    0.4 0.8 1.0",
        "  endlist",
        "  flareradius 12",
        "  lensflares 1",
        "  fadingLight 0",
        "endnode",
        "node light inverted_light",
        "  parent dlp_light_08",
        "  position 0.0 0.0 1.0",
        "  radius -1.5",
        "  multiplier -0.25",
        "  color -0.1 0.5 1.2",
        "  shadow 0",
        "endnode",
        "node placeablelight placeable_light_marker",
        "  parent dlp_light_08",
        "  position 0.25 0.0 1.5",
        "  radius 2.5",
        "  multiplier 1.5",
        "  color 0.59 0.56 0.37",
        "endnode",
        "endmodelgeom dlp_light_08",
        "newanim default dlp_light_08",
        " length 4.66667",
        " transtime 0.25",
        "animroot dlp_light_08",
        "node light pulsing_light03",
        "  parent dlp_light_08",
        "    positionkey",
        "      0.0  0.0 0.0 2.5",
        "      4.66667  0.0 0.0 2.5",
        "    endlist",
        "    colorkey",
        "      0.0   0.0392157 0.6 0.164706",
        "      2.33333   0.0 1.0 0.164706",
        "      4.66667   0.0392157 0.6 0.164706",
        "    endlist",
        "    radiuskey",
        "      0.0   3.0",
        "      2.33333   10.0",
        "      4.66667   3.0",
        "    endlist",
        "    shadowradiusbezierkey",
        "      0.0   1.25 0.0 0.0",
        "      2.33333   2.5 0.0 0.0",
        "      4.66667   1.25 0.0 0.0",
        "    endlist",
        "    verticaldisplacementkey",
        "      0.0   0.35",
        "      2.33333   0.75",
        "      4.66667   0.35",
        "    endlist",
        "    multiplierkey",
        "      0.0   3.0",
        "      2.33333   7.0",
        "      4.66667   3.0",
        "    endlist",
        "endnode",
        "node trimesh static_core",
        "  parent dlp_light_08",
        "  positionkey 2",
        "    0.0 0.0 0.0 3.0",
        "    4.66667 0.0 0.0 -1.0",
        "  alphakey 2",
        "    0.0 1.0",
        "    4.66667 0.0",
        "endnode",
        "doneanim default dlp_light_08",
        "donemodel dlp_light_08"
      ].join("\n")
    );
    const sourceModelSha256 = createHash("sha256")
      .update(sourceModel)
      .digest("hex");
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-light-node-vfx",
      totalFiles: 1,
      totalBytes: sourceModel.length,
      objects: [
        {
          key: "modules/current/models/dlp_light_08.mdl",
          size: sourceModel.length,
          etag: "1311385953ab5ffd861b1d457847fbe9"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/dlp_light_08.mdl") {
        return {
          key,
          size: sourceModel.length,
          contentType: "application/octet-stream",
          bytes: sourceModel
        };
      }
      return null;
    });
    repository.findByKindAndId.mockImplementation(async (_kind, templateId) => {
      if (templateId === "plc_dlp_light_08_source") {
        return {
          ...buildTemplate("placeable", "plc_dlp_light_08_source"),
          resref: "dlp_light_08",
          name: "Light: Pulse Light, Green*",
          placeableSubtype: "light_source",
          metadata: {
            lookupModelResRef: "dlp_light_08"
          }
        };
      }

      if (templateId === "plc_dlp_light_08_generic") {
        return {
          ...buildTemplate("placeable", "plc_dlp_light_08_generic"),
          resref: "dlp_light_08",
          name: "Campfire-style generic source model",
          placeableSubtype: "generic",
          metadata: {
            lookupModelResRef: "dlp_light_08"
          }
        };
      }

      return {
        ...buildTemplate("placeable", "plc_dlp_light_08"),
        resref: "dlp_light_08",
        name: "VFX: Pulse Light, Green*",
        placeableSubtype: "vfx",
        metadata: {
          lookupModelResRef: "dlp_light_08"
        }
      };
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_dlp_light_08",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.placeable.renderPackage;
    expect(renderPackage?.status).toBe("ready");
    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceFiles: [
          expect.objectContaining({
            fileName: "modules/current/models/dlp_light_08.mdl",
            bytes: sourceModel
          })
        ]
      })
    );
    expect(result.placeable.assetManifest.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "dlp_light_08.glb",
          objectKey: "modules/current/__aurora/derived/models/dlp_light_08.glb"
        })
      ])
    );
    expect(renderPackage?.assetRefs.derivedModelAssetIds).toHaveLength(1);
    expect(renderPackage?.glbUrl).toMatch(/\/assets\/[a-f0-9]+\.glb$/u);
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "PLACEABLE_RENDER_READY",
        "VFX_AURORA_MDL_LIGHT_PAYLOAD_READY",
        "VFX_AURORA_MDL_LIGHT_PREVIEW_NON_CANONICAL",
        "VFX_MDL_LIGHT_FLARE_PAYLOAD_PRESERVED",
        "VFX_MDL_LIGHT_FLARERADIUS_WRITE_UNVERIFIED"
      ])
    );
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "PLACEABLE_RENDER_DERIVED_MISSING"
    );
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_AURORA_MDL_EMITTER_PAYLOAD_MISSING"
    );
    expect(renderPackage?.auroraEmitter?.emitters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeName: "paired_emitter",
          sourceModelHash: sourceModelSha256,
          emitterType: "Fountain",
          texture: "fx_pair",
          directRows: expect.arrayContaining([
            expect.objectContaining({
              property: "birthrate",
              rawToken: "birthrate",
              rowKind: "direct",
              values: [2]
            })
          ])
        })
      ])
    );
    expect(renderPackage?.auroraModelGraph?.staticGeometryNodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "aurora-mdl-ascii",
          sourceModelFileName: "dlp_light_08.mdl",
          sourceModelHash: sourceModelSha256,
          nodeName: "static_core",
          sourceNodeKind: "trimesh",
          parentNodeName: "dlp_light_08",
          meshMaterialState: { alpha: 0.75 },
          animationTracks: [
            expect.objectContaining({
              animationName: "default",
              transform: expect.objectContaining({
                positionTimeline: [
                  { time: 0, value: [0, 0, 3] },
                  { time: expect.closeTo(4.66667, 6), value: [0, 0, -1] }
                ]
              })
            })
          ],
          meshMaterialAnimationTracks: [
            expect.objectContaining({
              animationName: "default",
              state: {
                alpha: 1,
                alphaTimeline: [
                  { time: 0, value: 1 },
                  { time: expect.closeTo(4.66667, 6), value: 0 }
                ]
              }
            })
          ]
        })
      ])
    );
    expect(renderPackage?.auroraModelGraph?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeKind: "static-geometry",
          sourceModelHash: sourceModelSha256,
          nodeName: "static_core",
          animationTracks: expect.any(Array),
          meshMaterialAnimationTracks: expect.any(Array)
        }),
        expect.objectContaining({
          nodeKind: "light",
          sourceModelHash: sourceModelSha256,
          nodeName: "pulsing_light03",
          transform: {
            position: [0, 0, 2.5]
          }
        })
      ])
    );

    const light = renderPackage?.auroraLight?.lights[0];
    expect(light).toMatchObject({
      source: "aurora-mdl-ascii",
      sourceModelFileName: "dlp_light_08.mdl",
      sourceModelHash: sourceModelSha256,
      nodeName: "pulsing_light03",
      sourceNodeKind: "light",
      parentNodeName: "dlp_light_08",
      radius: 3,
      shadowRadius: 1.25,
      verticalDisplacement: 0.35,
      multiplier: 3,
      color: [0, expect.closeTo(0.592157, 6), expect.closeTo(0.141176, 6)],
      ambientOnly: false,
      dynamicType: 1,
      affectDynamic: true,
      shadow: true,
      lightPriority: 2,
      generateFlare: true,
      textureNames: ["fx_flare_core", "fx_flare_ring"],
      flareSizes: [0.25, 0.5],
      flarePositions: [0.1, 0.9],
      flareColorShifts: [
        [1, 0.8, 0.4],
        [0.4, 0.8, 1]
      ],
      flareRadius: 12,
      lensFlares: true
    });
    expect(light?.transform?.position).toEqual([0, 0, 2.5]);
    expect(light?.animations?.[0]).toMatchObject({
      animationName: "default",
      lengthSeconds: expect.closeTo(4.66667, 6),
      transitionSeconds: expect.closeTo(0.25, 6),
      positionTimeline: [
        { time: 0, value: [0, 0, 2.5] },
        { time: expect.closeTo(4.66667, 6), value: [0, 0, 2.5] }
      ],
      colorTimeline: [
        { time: 0, value: [expect.closeTo(0.0392157, 6), 0.6, expect.closeTo(0.164706, 6)] },
        { time: expect.closeTo(2.33333, 6), value: [0, 1, expect.closeTo(0.164706, 6)] },
        {
          time: expect.closeTo(4.66667, 6),
          value: [expect.closeTo(0.0392157, 6), 0.6, expect.closeTo(0.164706, 6)]
        }
      ],
      radiusTimeline: [
        { time: 0, value: 3 },
        { time: expect.closeTo(2.33333, 6), value: 10 },
        { time: expect.closeTo(4.66667, 6), value: 3 }
      ],
      shadowRadiusTimeline: [
        { time: 0, value: 1.25 },
        { time: expect.closeTo(2.33333, 6), value: 2.5 },
        { time: expect.closeTo(4.66667, 6), value: 1.25 }
      ],
      verticalDisplacementTimeline: [
        { time: 0, value: 0.35 },
        { time: expect.closeTo(2.33333, 6), value: 0.75 },
        { time: expect.closeTo(4.66667, 6), value: 0.35 }
      ],
      multiplierTimeline: [
        { time: 0, value: 3 },
        { time: expect.closeTo(2.33333, 6), value: 7 },
        { time: expect.closeTo(4.66667, 6), value: 3 }
      ]
    });
    const invertedLight = renderPackage?.auroraLight?.lights.find(
      (candidate) => candidate.nodeName === "inverted_light"
    );
    expect(invertedLight).toMatchObject({
      sourceNodeKind: "light",
      radius: -1.5,
      multiplier: -0.25,
      color: [expect.closeTo(-0.1, 6), 0.5, 1.2],
      shadow: false
    });
    const placeableLightMarker = renderPackage?.auroraLight?.lights.find(
      (candidate) => candidate.nodeName === "placeable_light_marker"
    );
    expect(placeableLightMarker).toMatchObject({
      sourceNodeKind: "placeablelight",
      radius: 2.5,
      multiplier: 1.5,
      color: [0.59, 0.56, 0.37],
      transform: {
        position: [0.25, 0, 1.5]
      }
    });

    const lightSourceResult = await serviceWithBlob.processPlaceable({
      templateId: "plc_dlp_light_08_source",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    const lightSourceRenderPackage = lightSourceResult.placeable.renderPackage;
    expect(lightSourceResult.placeable.placeableSubtype).toBe("light_source");
    expect(lightSourceRenderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "PLACEABLE_AURORA_MDL_LIGHT_PAYLOAD_READY",
        "VFX_AURORA_MDL_LIGHT_PAYLOAD_READY"
      ])
    );
    expect(lightSourceRenderPackage?.auroraLight?.lights[0]).toMatchObject({
      sourceModelFileName: "dlp_light_08.mdl",
      nodeName: "pulsing_light03",
      sourceNodeKind: "light",
      radius: 3,
      multiplier: 3,
      color: [0, expect.closeTo(0.592157, 6), expect.closeTo(0.141176, 6)]
    });
    expect(lightSourceRenderPackage?.auroraModelGraph?.staticGeometryNodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "aurora-mdl-ascii",
          sourceModelFileName: "dlp_light_08.mdl",
          nodeName: "static_core",
          sourceNodeKind: "trimesh",
          parentNodeName: "dlp_light_08"
        })
      ])
    );
    expect(lightSourceRenderPackage?.auroraModelGraph?.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeKind: "emitter",
          nodeName: "paired_emitter"
        }),
        expect.objectContaining({
          nodeKind: "light",
          nodeName: "pulsing_light03"
        })
      ])
    );

    const genericResult = await serviceWithBlob.processPlaceable({
      templateId: "plc_dlp_light_08_generic",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    const genericRenderPackage = genericResult.placeable.renderPackage;
    expect(genericResult.placeable.placeableSubtype).toBe("generic");
    expect(genericResult.placeable.render.isVfx).toBe(false);
    expect(genericRenderPackage?.auroraModelGraph?.staticGeometryNodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceModelFileName: "dlp_light_08.mdl",
          nodeName: "static_core",
          sourceNodeKind: "trimesh"
        })
      ])
    );
    expect(genericRenderPackage?.auroraLight?.lights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeName: "pulsing_light03",
          radius: 3,
          multiplier: 3
        })
      ])
    );
  });

  it("preserves binary Aurora emitter animation-state controllers from source MDL animation roots", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [],
      summary: {
        generator: "test-generator",
        generatedFiles: 0,
        generatedBytes: 0,
        failureReasons: ["no renderable geometry"]
      }
    });

    const sourceModelBytes = buildEmitterOnlyBinaryMdl("phod_fx_pntgrm", {
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Lighten",
      simulation: {
        birthrate: 3,
        lifeExp: 4,
        alphaEnd: 0.2
      },
      animations: [
        {
          name: "off2on",
          lengthSeconds: 2,
          birthrateValues: [0, 4, 4]
        },
        {
          name: "off",
          lengthSeconds: 2,
          birthrateValues: [0, 0],
          alphaEndValues: [0, 0]
        },
        {
          name: "on",
          lengthSeconds: 2,
          birthrateValues: [4, 4],
          alphaEndValues: [1]
        }
      ]
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-binary-animation-emitter",
      totalFiles: 3,
      totalBytes: sourceModelBytes.length + 16 + 12,
      objects: [
        {
          key: "modules/current/models/phod_fx_pntgrm2.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/__aurora/derived/models/phod_fx_pntgrm2.glb",
          size: 12,
          etag: "stale-primary-derived"
        },
        {
          key: "modules/current/textures/phod_fx_pntgrm.tga",
          size: 16,
          etag: "source-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/phod_fx_pntgrm2.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_phod_fx_pntgrm2"),
      resref: "phod_fx_pntgrm2",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "phod_fx_pntgrm2"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_phod_fx_pntgrm2",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const emitter = result.placeable.renderPackage?.auroraEmitter?.emitters[0];
    expect(emitter).toMatchObject({
      source: "aurora-mdl-binary",
      nodeName: "emit_smoke",
      texture: "phod_fx_pntgrm",
      simulation: {
        birthrate: 3,
        lifeExp: 4,
        alphaEnd: expect.closeTo(0.2, 6)
      }
    });
    expect(emitter?.animations?.map((animation) => animation.animationName)).toEqual([
      "off2on",
      "off",
      "on"
    ]);
    expect(emitter?.animations?.find((animation) => animation.animationName === "off")).toMatchObject({
      lengthSeconds: 2,
      transitionSeconds: 0,
      simulation: {
        birthrate: 0,
        alphaEnd: 0,
        timeline: {
          birthrate: [
            { time: 0, value: 0 },
            { time: 2, value: 0 }
          ],
          alphaEnd: [
            { time: 0, value: 0 },
            { time: 2, value: 0 }
          ]
        }
      }
    });
    expect(emitter?.animations?.find((animation) => animation.animationName === "on")).toMatchObject({
      lengthSeconds: 2,
      transitionSeconds: 0,
      simulation: {
        birthrate: 4,
        alphaEnd: 1,
        timeline: {
          birthrate: [
            { time: 0, value: 4 },
            { time: 2, value: 4 }
          ]
        }
      }
    });
    expect(
      emitter?.animations?.find((animation) => animation.animationName === "off2on")?.simulation
        ?.timeline?.birthrate
    ).toEqual([
      { time: 0, value: 0 },
      { time: 1, value: 4 },
      { time: 2, value: 4 }
    ]);
  });

  it("preserves ASCII Aurora emitter key controllers from animation blocks", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const sourceModelBytes = Buffer.from(
      [
        "newmodel plc_ascii_keyed",
        "node emitter keyed_ascii",
        "  update Fountain",
        "  render Normal",
        "  blend Lighten",
        "  texture fxpa_ascii_keyed",
        "  birthrate 0",
        "  lifeExp 2",
        "  sizeStart 0",
        "  sizeEnd 1",
        "  alphaStart 0",
        "  alphaEnd 0",
        "  blastRadius 2.5",
        "  blastLength 1.25",
        "  lightningScale 1.5",
        "  lightningDelay 0.2",
        "  lightningRadius 0.75",
        "  colorMid 1 1 0",
        "  percentStart 0.1",
        "  percentMid 0.6",
        "  percentEnd 0.9",
        "  birthratekey 3",
        "    0.00 0",
        "    0.25 12",
        "    1.00 0",
        "  sizeStartkey 3",
        "    0.00 0",
        "    0.50 3",
        "    1.00 1",
        "  alphaStartkey 3",
        "    0.00 0",
        "    0.25 1",
        "    1.00 0",
        "  colorStartkey 3",
        "    0.00 1 0 0",
        "    0.50 0 1 0",
        "    1.00 0 0 1",
        "  colorEndkey 2",
        "    0.00 0.2 0 0",
        "    1.00 0 0.2 0",
        "  colorMidkey 2",
        "    0.00 1 1 0",
        "    1.00 0 1 1",
        "  percentStartkey 2",
        "    0.00 0",
        "    1.00 0.1",
        "  percentMidkey 2",
        "    0.00 0.4",
        "    1.00 0.6",
        "  percentEndkey 2",
        "    0.00 0.8",
        "    1.00 1",
        "  lightningScalekey 2",
        "    0.00 0.5",
        "    1.00 2.0",
        "  lightningDelaykey 2",
        "    0.00 0.1",
        "    1.00 0.4",
        "  lightningRadiuskey 2",
        "    0.00 0.25",
        "    1.00 1.0",
        "endnode",
        "newanim impact plc_ascii_keyed",
        "  event 0.25 detonate",
        "doneanim"
      ].join("\n"),
      "latin1"
    );
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-ascii-keyed-emitter",
      totalFiles: 2,
      totalBytes: sourceModelBytes.length + 16,
      objects: [
        {
          key: "modules/current/models/plc_ascii_keyed.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/textures/fxpa_ascii_keyed.tga",
          size: 16,
          etag: "source-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/plc_ascii_keyed.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_ascii_keyed"),
      resref: "plc_ascii_keyed",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "plc_ascii_keyed"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_ascii_keyed",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const emitter = result.placeable.renderPackage?.auroraEmitter?.emitters[0];
    expect(emitter).toMatchObject({
      source: "aurora-mdl-ascii",
      nodeName: "keyed_ascii",
      texture: "fxpa_ascii_keyed",
      renderMode: "Normal",
      blendMode: "Lighten",
      simulation: {
        birthrate: 0,
        lifeExp: 2,
        sizeStart: 0,
        alphaStart: 0,
        blastRadius: 2.5,
        blastLength: 1.25,
        lightningScale: 0.5,
        lightningDelay: 0.1,
        lightningRadius: 0.25,
        colorStart: [1, 0, 0],
        colorMid: [1, 1, 0],
        percentStart: 0,
        percentMid: 0.4,
        percentEnd: 0.8
      }
    });
    expect(emitter?.simulation?.timeline?.birthrate).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.25, 6), value: 12 },
      { time: 1, value: 0 }
    ]);
    expect(emitter?.simulation?.timeline?.sizeStart).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.5, 6), value: 3 },
      { time: 1, value: 1 }
    ]);
    expect(emitter?.simulation?.timeline?.alphaStart).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.25, 6), value: 1 },
      { time: 1, value: 0 }
    ]);
    expect(emitter?.simulation?.colorTimeline?.colorStart).toEqual([
      { time: 0, value: [1, 0, 0] },
      { time: expect.closeTo(0.5, 6), value: [0, 1, 0] },
      { time: 1, value: [0, 0, 1] }
    ]);
    expect(emitter?.simulation?.colorTimeline?.colorEnd).toEqual([
      { time: 0, value: [expect.closeTo(0.2, 6), 0, 0] },
      { time: 1, value: [0, expect.closeTo(0.2, 6), 0] }
    ]);
    expect(emitter?.simulation?.colorTimeline?.colorMid).toEqual([
      { time: 0, value: [1, 1, 0] },
      { time: 1, value: [0, 1, 1] }
    ]);
    expect(emitter?.simulation?.timeline?.percentStart).toEqual([
      { time: 0, value: 0 },
      { time: 1, value: expect.closeTo(0.1, 6) }
    ]);
    expect(emitter?.simulation?.timeline?.percentMid).toEqual([
      { time: 0, value: expect.closeTo(0.4, 6) },
      { time: 1, value: expect.closeTo(0.6, 6) }
    ]);
    expect(emitter?.simulation?.timeline?.percentEnd).toEqual([
      { time: 0, value: expect.closeTo(0.8, 6) },
      { time: 1, value: 1 }
    ]);
    expect(emitter?.simulation?.timeline?.lightningScale).toEqual([
      { time: 0, value: expect.closeTo(0.5, 6) },
      { time: 1, value: 2 }
    ]);
    expect(emitter?.simulation?.timeline?.lightningDelay).toEqual([
      { time: 0, value: expect.closeTo(0.1, 6) },
      { time: 1, value: expect.closeTo(0.4, 6) }
    ]);
    expect(emitter?.simulation?.timeline?.lightningRadius).toEqual([
      { time: 0, value: expect.closeTo(0.25, 6) },
      { time: 1, value: 1 }
    ]);
    expect(emitter?.events).toBeUndefined();
    expect(result.placeable.renderPackage?.auroraModelGraph?.animationEvents).toEqual([
      {
        source: "aurora-mdl-ascii",
         sourceModelAssetId: expect.any(String),
         sourceModelFileName: "plc_ascii_keyed.mdl",
         sourceModelHash: expect.any(String),
         sourceModelObjectKey: "modules/current/models/plc_ascii_keyed.mdl",
        time: expect.closeTo(0.25, 6),
        type: "detonate",
        animationName: "impact"
      }
    ]);
  });

  it("uses Aurora source precedence instead of duplicating identical emitter models from hak and vanilla", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const hakEmitterBytes = buildEmitterOnlyBinaryMdl("fx_hak_fog", {
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Normal",
      simulation: {
        xSize: 40,
        ySize: 40,
        birthrate: 5,
        lifeExp: 10,
        velocity: 0.2,
        randvel: 0.1,
        spread: 300,
        sizeStart: 14,
        sizeEnd: 26,
        alphaStart: 0.4,
        alphaEnd: 0,
        colorStart: [0.69, 0.69, 0.69],
        colorEnd: [0.68, 0.68, 0.68]
      }
    });
    const vanillaEmitterBytes = buildEmitterOnlyBinaryMdl("fx_vanilla_fog", {
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Normal",
      simulation: {
        xSize: 40,
        ySize: 40,
        birthrate: 1,
        lifeExp: 20,
        velocity: 0.2,
        randvel: 0.1,
        spread: 300,
        sizeStart: 6,
        sizeEnd: 15,
        alphaStart: 0.2,
        alphaEnd: 0,
        colorStart: [0.59, 0.59, 0.59],
        colorEnd: [0.38, 0.38, 0.38]
      }
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-duplicate-vfx-source",
      totalFiles: 4,
      totalBytes: hakEmitterBytes.length + vanillaEmitterBytes.length + 24,
      objects: [
        {
          key: "modules/current/__aurora/sources/vanilla/models/dag_fog_med.mdl",
          size: vanillaEmitterBytes.length,
          etag: "vanilla-model"
        },
        {
          key: "modules/current/__aurora/sources/hak/q_placeables/dag_fog_med.mdl",
          size: hakEmitterBytes.length,
          etag: "hak-model"
        },
        {
          key: "modules/current/__aurora/sources/vanilla/textures/fx_vanilla_fog.tga",
          size: 12,
          etag: "vanilla-texture"
        },
        {
          key: "modules/current/__aurora/sources/hak/q_placeables/textures/fx_hak_fog.tga",
          size: 12,
          etag: "hak-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/__aurora/sources/hak/q_placeables/dag_fog_med.mdl") {
        return {
          key,
          size: hakEmitterBytes.length,
          contentType: "application/octet-stream",
          bytes: hakEmitterBytes
        };
      }
      if (key === "modules/current/__aurora/sources/vanilla/models/dag_fog_med.mdl") {
        return {
          key,
          size: vanillaEmitterBytes.length,
          contentType: "application/octet-stream",
          bytes: vanillaEmitterBytes
        };
      }
      return {
        key,
        size: 12,
        contentType: "image/tga",
        bytes: Buffer.from("texture bytes")
      };
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_dag_fog_med"),
      resref: "dag_fog_med",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "dag_fog_med"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_dag_fog_med",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const emitters = result.placeable.renderPackage?.auroraEmitter?.emitters ?? [];
    expect(emitters).toHaveLength(1);
    expect(emitters[0]).toMatchObject({
      sourceModelFileName: "dag_fog_med.mdl",
      sourceModelObjectKey: "modules/current/__aurora/sources/hak/q_placeables/dag_fog_med.mdl",
      texture: "fx_hak_fog",
      renderMode: "Billboard_to_World_Z",
      simulation: {
        birthrate: 5,
        lifeExp: 10,
        sizeStart: 14,
        sizeEnd: 26
      }
    });
  });

  it("extracts ASCII emitter atlas playback fields from source MDL", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const sourceModelBytes = Buffer.from(
      [
        "newmodel cot_fx01",
        "node emitter fire!03",
        "  position 0.0466596 -0.126434 0.0124961",
        "  orientation 1.0 0.0 0.0 -1.42244",
        "  update Fountain",
        "  render Billboard_to_World_Z",
        "  Blend Normal",
        "  spawnType 0",
        "  texture fxpa_smoke01",
        "  renderhint normaltangents",
        "  customShaderVS fx_smoke_vs",
        "  customShaderFS fx_smoke_fs",
        "  customShaderGS fx_smoke_gs",
        "  bumpmaptexture fxpa_smoke_bump",
        "  bumpyshinytexture fxpa_smoke_shiny",
        "  envmaptexture fxpa_smoke_env",
        "  bumpreplacementtexture fxpa_smoke_repl",
        "  chunkName Red_M_Giblet",
        "  colorStart 0.392157 0.0 0.0",
        "  colorEnd 0.184314 0.0 0.0",
        "  alphaStart 0.5",
        "  alphaEnd 0.0",
        "  xSize 60.0",
        "  ySize 40.0",
        "  renderorder -3",
        "  transparency 1",
        "  twosided 1",
        "  twosidedtex 1",
        "  sample_framebuffer 2",
        "  volumetric 1",
        "  loop 0",
        "  m_isTinted 0",
        "  splat 1",
        "  rotatetexture 1",
        "  sizeStart 1.0",
        "  sizeMid 4.0",
        "  sizeEnd 6.0",
        "  sizeStart_y 0.0",
        "  sizeMid_y 2.0",
        "  sizeEnd_y 0.0",
        "  birthrate 5",
        "  lifeExp 5.0",
        "  mass -0.75",
        "  spread 1.0472",
        "  particleRot 0.2",
        "  velocity 0.5",
        "  randvel 0.4",
        "  bounce 1",
        "  bounce_co 0.35",
        "  blurlength 1.2",
        "  deadspace 0.25",
        "  p2p 1",
        "  p2p_sel 2",
        "  grav 0.8",
        "  drag 0.3",
        "  threshold 0.4",
        "  inherit 1",
        "  inheritvel 0",
        "  inherit_local 1",
        "  inherit_part 1",
        "  affectedByWind 1",
        "  alphaMid 0.85",
        "  xgrid 4",
        "  ygrid 4",
        "  fps 10",
        "  framestart 0",
        "  frameend 24",
        "  random 1",
        "  node reference REFm",
        "    parent fire!03",
        "    position 0 0 0.63",
        "    orientation 0 0 0 0",
        "  endnode",
        "endnode"
      ].join("\n"),
      "latin1"
    );
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-source-emitter-atlas",
      totalFiles: 6,
      totalBytes: sourceModelBytes.length + 80,
      objects: [
        {
          key: "modules/current/models/cot_fx01.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/textures/fxpa_smoke01.tga",
          size: 16,
          etag: "source-texture"
        },
        {
          key: "modules/current/textures/fxpa_smoke_bump.tga",
          size: 16,
          etag: "source-bump-texture"
        },
        {
          key: "modules/current/textures/fxpa_smoke_shiny.tga",
          size: 16,
          etag: "source-bumpy-shiny-texture"
        },
        {
          key: "modules/current/textures/fxpa_smoke_env.tga",
          size: 16,
          etag: "source-env-texture"
        },
        {
          key: "modules/current/textures/fxpa_smoke_repl.tga",
          size: 16,
          etag: "source-bump-replacement-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/models/cot_fx01.mdl") {
        return null;
      }
      return {
        key,
        size: sourceModelBytes.length,
        contentType: "application/octet-stream",
        bytes: sourceModelBytes
      };
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_cot_fx01"),
      resref: "plc_cot_fx01",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "cot_fx01"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_cot_fx01",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const textureFileNames = result.placeable.assetManifest.assets
      .filter((asset) => asset.role === "texture")
      .map((asset) => asset.fileName)
      .sort((left, right) => left.localeCompare(right));
    expect(textureFileNames).toEqual([
      "fxpa_smoke_bump.tga",
      "fxpa_smoke_env.tga",
      "fxpa_smoke_repl.tga",
      "fxpa_smoke_shiny.tga",
      "fxpa_smoke01.tga"
    ]);
    expect(result.placeable.renderPackage?.auroraEmitter?.emitters[0]).toMatchObject({
      source: "aurora-mdl-ascii",
      nodeName: "fire!03",
      texture: "fxpa_smoke01",
      chunkName: "red_m_giblet",
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Normal",
      atlas: {
        xGridRaw: 4,
        yGridRaw: 4,
        effectiveXGrid: 4,
        effectiveYGrid: 4,
        fps: 10,
        frameStart: 0,
        frameEnd: 24,
        random: true
      },
      simulation: {
        xSize: 60,
        ySize: 40,
        spawnType: 0,
        birthrate: 5,
        lifeExp: 5,
        mass: -0.75,
        velocity: 0.5,
        randvel: 0.4,
        spread: 1.0472,
        particleRot: 0.2,
        bounce: true,
        bounceCoefficient: 0.35,
        blurLength: 1.2,
        deadspace: 0.25,
        p2p: true,
        p2pType: "2",
        grav: 0.8,
        drag: 0.3,
        threshold: 0.4,
        inherit: true,
        inheritVel: false,
        inheritLocal: true,
        inheritPart: true,
        affectedByWind: true,
        sizeStart: 1,
        sizeMid: 4,
        sizeEnd: 6,
        sizeStartY: 0,
        sizeMidY: 2,
        sizeEndY: 0,
        alphaStart: 0.5,
        alphaMid: 0.85,
        alphaEnd: 0,
        colorStart: [0.392157, 0, 0],
        colorEnd: [0.184314, 0, 0]
      },
      transform: {
        position: [0.0466596, -0.126434, 0.0124961],
        orientation: {
          axis: [1, 0, 0],
          angleRadians: -1.42244
        }
      },
      referenceNodes: [
        {
          nodeName: "REFm",
          parentNodeName: "fire!03",
          transform: {
            position: [0, 0, 0.63]
          }
        }
      ],
      sourceState: {
        renderOrder: -3,
        renderHintRaw: "normaltangents",
        renderHintMode: 3,
        customShaderVS: "fx_smoke_vs",
        customShaderFS: "fx_smoke_fs",
        customShaderGS: "fx_smoke_gs",
        transparency: true,
        twoSidedMaterial: true,
        twoSidedTexture: true,
        sampleFramebuffer: 2,
        volumetric: true,
        loop: false,
        isTinted: false,
        splat: true,
        rotateTexture: true
      }
    });
  });

  it("deduplicates concurrent placeable processing misses by cache key", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_vfx_001"),
      resref: "plc_vfx_001",
      placeableSubtype: "vfx"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        key,
        value,
        storedAt: "2026-05-24T10:00:00.000Z",
        hits: 0
      };
    });

    const firstPromise = service.processPlaceable({
      templateId: "plc_vfx_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    const secondPromise = service.processPlaceable({
      templateId: "plc_vfx_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(first.cache.key).toBe(second.cache.key);
    expect(first.placeable.templateId).toBe("plc_vfx_001");
    expect(second.placeable.templateId).toBe("plc_vfx_001");
  });

  it("reuses placeable template lookup cache by templateId across repeated processing calls", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_lookup_001"),
      resref: "plc_lookup_001",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:00:00.000Z",
      hits: 0
    }));

    await service.processPlaceable({
      templateId: "plc_lookup_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    await service.processPlaceable({
      templateId: "plc_lookup_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(repository.findByKindAndId).toHaveBeenCalledTimes(1);
  });

  it("cleans in-flight map after completion so subsequent same-key miss reprocesses", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_vfx_001"),
      resref: "plc_vfx_001",
      placeableSubtype: "vfx"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:00:00.000Z",
      hits: 0
    }));

    await service.processPlaceable({
      templateId: "plc_vfx_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    await service.processPlaceable({
      templateId: "plc_vfx_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(placeableCache.set).toHaveBeenCalledTimes(2);
  });

  it("resolves placeable processing by resref", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_resref_001"),
      resref: "ad_top_lion_1",
      placeableSubtype: "vfx"
    };
    repository.findByKindAndResref.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:05:00.000Z",
      hits: 0
    }));

    const result = await service.processPlaceable({
      resref: "ad_top_lion_1",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(repository.findByKindAndResref).toHaveBeenCalledWith(
      "placeable",
      "ad_top_lion_1"
    );
    expect(result.placeable.templateId).toBe("plc_resref_001");
  });

  it("reuses creature template lookup cache by resref across repeated processing calls", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_lookup_001"),
      resref: "cre_lookup_resref_001"
    };
    repository.findByKindAndResref.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:00:00.000Z",
      hits: 0
    }));

    await service.processCreature({
      resref: "cre_lookup_resref_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    await service.processCreature({
      resref: "cre_lookup_resref_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(repository.findByKindAndResref).toHaveBeenCalledTimes(1);
  });

  it("returns cache hit for already processed placeable", async () => {
    placeableCache.get.mockResolvedValue({
      key: "a".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 3,
      value: {
        templateId: "plc_cached_001",
        resref: "plc_cached",
        name: "Cached Placeable",
        category: "benchmark",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: {
          sample: true
        },
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const result = await service.getProcessedPlaceable("a".repeat(64));

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(3);
    expect(result.placeable.placeableSubtype).toBe("door");
  });

  it("throws PLACEABLE_CACHE_NOT_FOUND when cache key is missing", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(service.getProcessedPlaceable("b".repeat(64))).rejects.toMatchObject({
      code: "PLACEABLE_CACHE_NOT_FOUND"
    });
  });

  it("processPlaceable returns cache hit payload when cached entry exists", async () => {
    placeableCache.get.mockResolvedValue({
      key: "a".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 4,
      value: {
        templateId: "plc_cached_002",
        resref: "plc_cached_002",
        name: "Cached Placeable 2",
        category: "benchmark",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "placeable-generic",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: true,
        benchmarkBucket: "bucket-a",
        metadata: { sample: true },
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });
    repository.findByKindAndId.mockResolvedValue(buildTemplate("placeable", "plc_cached_002"));

    const result = await service.processPlaceable({
      templateId: "plc_cached_002",
      bypassCache: false,
      includeBenchmarkMetadata: false
    });

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(4);
    expect(result.placeable.templateId).toBe("plc_cached_002");
    expect(result.placeable.placeableRuntime).toBeDefined();
    expect(result.placeable.placeableValidationIssues).toEqual([]);
    expect(result.placeable.benchmarkBucket).toBeUndefined();
    expect(placeableCache.set).not.toHaveBeenCalled();
  });

  it("processPlaceable refreshes cached legacy LightState runtime provenance", async () => {
    placeableCache.get.mockResolvedValue({
      key: "a".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 4,
      value: {
        templateId: "plc_cached_lightstate_legacy",
        resref: "plc_cached_lightstate_legacy",
        name: "Cached Legacy LightState",
        category: "benchmark",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "placeable-generic",
          isDoor: false,
          isVfx: false
        },
        metadata: {
          sourceFileType: "UTP ",
          templateResRef: "plc_cached_lightstate_legacy"
        },
        assetManifest: buildEmptyManifest(),
        placeableRuntime: {
          state: {
            lightState: 1
          }
        },
        placeableValidationIssues: [],
        renderPackage: {
          status: "unsupported",
          diagnostics: [],
          assetRefs: {}
        },
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      } as unknown as PlaceableProcessingResult
    });
    repository.findByKindAndId.mockResolvedValue(
      buildTemplate("placeable", "plc_cached_lightstate_legacy")
    );

    const result = await service.processPlaceable({
      templateId: "plc_cached_lightstate_legacy",
      bypassCache: false,
      includeBenchmarkMetadata: false
    });

    expect(result.cache.hit).toBe(true);
    expect(result.placeable.placeableRuntime?.state).toMatchObject({
      lightState: 1,
      lightStateSource:
        "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwserver.exe .pdata function 0x1404484d0..0x14044a2ec contains LightState xref at 0x140448ed0 and mov [rbx+0x368],1 at 0x140448eb5 before the optional LightState read",
      lightStateProofStatus:
        "retail-binary-backed-nwserver-lightstate-default-on-xref",
      lightStateDefaulted: true
    });
    expect(placeableCache.set).not.toHaveBeenCalled();
  });

  it("refreshes cached generic manifests when source MDL assets have legacy unknown roles", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-bodybag-model-role",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/__aurora/sources/vanilla/models/plc_u02.mdl",
          size: 12,
          etag: "model-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/__aurora/sources/vanilla/models/plc_u02.mdl") {
        return {
          key,
          size: 12,
          contentType: "application/octet-stream",
          etag: "model-hash",
          bytes: Buffer.from("mdl")
        };
      }
      if (key === "modules/current/__aurora/derived/models/plc_u02.glb") {
        return {
          key,
          size: 3,
          contentType: "model/gltf-binary",
          etag: "derived-hash",
          bytes: Buffer.from("glb")
        };
      }
      return null;
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: "modules/current/__aurora/derived/models/plc_u02.glb",
      size: 3,
      etag: "derived-hash"
    });
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn(
        async (_input: Parameters<DerivedAssetGeneratorPort["generateDerivedAssets"]>[0]) => ({
        files: [
          {
            fileName: "__aurora/derived/models/plc_u02.glb",
            resourceType: 0,
            bytes: Buffer.from("glb")
          }
        ],
        summary: {
          generator: "test-generator",
          generatedFiles: 1,
          generatedBytes: 3
        }
      }))
    };

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_invis_corpse_bdy"),
      resref: "invis_corpse_bdy",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_u02",
        bodyBag: true
      }
    });
    placeableCache.get.mockResolvedValue({
      key: "b".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 3,
      value: {
        templateId: "plc_invis_corpse_bdy",
        resref: "invis_corpse_bdy",
        name: "corpse",
        category: "placeable",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "placeable-generic",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: {
          lookupModelResRef: "plc_u02",
          bodyBag: true
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-bodybag-model-role",
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "legacy-mdl",
              role: "unknown",
              fileName: "plc_u02.mdl",
              objectKey: "modules/current/__aurora/sources/vanilla/models/plc_u02.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream",
              etag: "model-hash"
            }
          ]
        },
        renderPackage: {
          status: "unsupported",
          diagnostics: [
            {
              code: "PLACEABLE_RENDER_UNSUPPORTED_ASSET_SET",
              severity: "warn",
              message:
                "Placeable assets were found but no recognized source model asset exists."
            }
          ],
          assetRefs: {
            otherAssetIds: ["legacy-mdl"]
          }
        },
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:11:00.000Z",
      hits: 0
    }));

    const serviceWithDerived = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithDerived.processPlaceable({
      templateId: "plc_invis_corpse_bdy",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(true);
    expect(result.placeable.placeableSubtype).toBe("generic");
    expect(result.placeable.assetManifest.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "plc_u02.mdl",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "plc_u02.glb",
          role: "model"
        })
      ])
    );
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(result.placeable.renderPackage?.assetRefs.modelAssetIds).toBeDefined();
    expect(result.placeable.renderPackage?.glbUrl).toMatch(
      /^\/api\/v1\/catalog\/placeables\/cache\/.+\/assets\/.+\.glb$/u
    );
    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceFiles: [
          expect.objectContaining({
            fileName: "modules/current/__aurora/sources/vanilla/models/plc_u02.mdl",
            bytes: Buffer.from("mdl")
          })
        ]
      })
    );
  });

  it("uses template lookup model fallback for blocked area instance appearance rows", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-area-fallback-model",
      totalFiles: 1,
      totalBytes: 120,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/plc_fallback.glb",
          size: 120,
          etag: "derived-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);
    repository.resolvePlaceableAppearanceModel = jest.fn().mockResolvedValue(null);
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_reserved_row_fallback"),
      resref: "reserved_row_fallback",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_fallback"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:11:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_reserved_row_fallback",
      appearanceType: 15542,
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.metadata.areaInstanceModelLookupStatus).toBe("blocked");
    expect(result.placeable.assetManifest.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "plc_fallback.glb",
          role: "model"
        })
      ])
    );
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(result.placeable.renderPackage?.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PLACEABLE_RENDER_AREA_INSTANCE_MODEL_UNRESOLVED"
        })
      ])
    );
  });

  it("does not expose prefix-matched scene variants as the primary model for exact placeable lookups", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-exact-placeable-model",
      totalFiles: 1,
      totalBytes: 120,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/dag_applescene.glb",
          size: 120,
          etag: "scene-derived-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "tm_pl_frutapple1"),
      resref: "dag_apple",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "dag_apple"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:11:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "tm_pl_frutapple1",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.assetManifest.assets.map((asset) => asset.fileName)).toContain(
      "dag_applescene.glb"
    );
    expect(result.placeable.renderPackage?.status).toBe("missing_assets");
    expect(result.placeable.renderPackage?.assetRefs.derivedModelAssetIds).toBeUndefined();
    expect(result.placeable.renderPackage?.glbUrl).toBeUndefined();
  });

  it("processPlaceable suppresses Area GIT light-node helper geometry instead of resolving it as a physical appearance model", async () => {
    repository.resolvePlaceableAppearanceModel = jest.fn().mockResolvedValue({
      source2da: "placeables.2da",
      rowId: 26949,
      requestedRowId: 26949,
      modelResRef: "plc_core_0948",
      sourceKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da"
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:12:00.000Z",
      hits: 0
    }));

    const result = await service.processPlaceable({
      templateId: "plc_campfr",
      resref: "plc_campfr",
      tag: "VALELightNodeOrange03m",
      subtypeHint: "generic",
      appearanceType: 26949,
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(repository.resolvePlaceableAppearanceModel).not.toHaveBeenCalled();
    expect(result.placeable.placeableSubtype).toBe("light_source");
    expect(result.placeable.render.rendererPreset).toBe("placeable-light");
    expect(result.placeable.metadata).toMatchObject({
      areaInstanceTag: "VALELightNodeOrange03m",
      areaInstanceHelperRenderSuppressed: true,
      areaInstanceHelperKind: "light_node",
      areaInstanceModelLookupStatus: "blocked"
    });
    expect(result.placeable.metadata.modelResRef).toBeUndefined();
    expect(result.placeable.metadata.lookupModelResRef).toBeUndefined();
    expect(result.placeable.renderPackage).toMatchObject({
      status: "unsupported",
      diagnostics: [
        expect.objectContaining({
          code: "PLACEABLE_RENDER_AREA_INSTANCE_HELPER_NO_GEOMETRY"
        })
      ],
      assetRefs: {}
    });
  });

  it("processPlaceable classifies Area GIT VFX-tagged instances as backend-owned VFX render contracts", async () => {
    repository.resolvePlaceableAppearanceModel = jest.fn().mockResolvedValue({
      source2da: "placeables.2da",
      rowId: 332,
      requestedRowId: 332,
      modelResRef: "plc_t04",
      sourceKey: "modules/current/__aurora/sources/base/placeables.2da"
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:12:30.000Z",
      hits: 0
    }));

    const result = await service.processPlaceable({
      templateId: "tm_pl_lightred",
      resref: "tm_pl_lightred",
      tag: "VFXFlameLarge1",
      appearanceType: 332,
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(repository.resolvePlaceableAppearanceModel).toHaveBeenCalledWith(332, {
      tag: "VFXFlameLarge1",
      templateId: "tm_pl_lightred",
      resref: "tm_pl_lightred"
    });
    expect(result.placeable.placeableSubtype).toBe("vfx");
    expect(result.placeable.render).toMatchObject({
      backendType: "vfx",
      frontendType: "vfx",
      rendererPreset: "vfx-emitter",
      isVfx: true
    });
    expect(result.placeable.metadata).toMatchObject({
      areaInstanceTag: "VFXFlameLarge1",
      areaInstanceModelLookupStatus: "ready",
      modelResRef: "plc_t04",
      lookupModelResRef: "plc_t04"
    });
  });

  it("processPlaceable rebinds shared Area GIT model cache hits to the requested instance identity", async () => {
    repository.findByKindAndId.mockResolvedValue(null);
    repository.findByKindAndResref.mockResolvedValue(null);
    repository.resolvePlaceableAppearanceModel = jest.fn().mockResolvedValue({
      source2da: "placeables.2da",
      rowId: 12304,
      requestedRowId: 12304,
      modelResRef: "plc_wt305",
      sourceKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
      source2daLightColorRaw: "6",
      source2daLightColorRow: 6,
      source2daLightColorLabel: "PaleYellow",
      source2daLightColorSourceKey:
        "modules/current/__aurora/sources/vanilla/nwn_base.key/lightcolor.2da",
      source2daLightRed: 1.9,
      source2daLightGreen: 1.9,
      source2daLightBlue: 1,
      source2daToolsetRed: 0.94,
      source2daToolsetGreen: 0.94,
      source2daToolsetBlue: 0.77,
      source2daLightOffsetX: 0.12,
      source2daLightOffsetY: 0.1,
      source2daLightOffsetZ: 0.01,
      source2daShadowSize: 1,
      source2daStatic: false
    });
    placeableCache.get.mockResolvedValue({
      key: "950d837a".padEnd(64, "0"),
      storedAt: "2026-06-26T10:16:00.000Z",
      hits: 4,
      value: {
        templateId: "plc_witcher764",
        resref: "witcher764",
        name: "Cached Witcher Plant",
        category: "Area GIT Placeables",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "placeable-generic",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: {
          areaInstanceRenderSource: "git",
          areaInstanceModelLookupStatus: "ready",
          areaInstanceTag: "witcher_plant_4",
          appearanceId: 6305,
          areaInstanceAppearanceType: 6305,
          sourceKind: "2da",
          source2da: "placeables.2da",
          source2daRow: 6305,
          modelResRef: "plc_wt305",
          lookupModelResRef: "plc_wt305"
        },
        placeableRuntime: {
          source: {},
          identity: {},
          interaction: {},
          locking: {},
          trap: {},
          state: {},
          scripts: {}
        },
        placeableValidationIssues: [],
        assetManifest: buildEmptyManifest(),
        renderPackage: {
          status: "ready",
          diagnostics: [],
          assetRefs: {},
          glbUrl: "/api/v1/catalog/placeables/cache/950d837a/assets/plc_wt305.glb"
        },
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-06-26T10:10:00.000Z"
      }
    });

    const result = await service.processPlaceable({
      templateId: "plc_q_155",
      resref: "q_155",
      tag: "q_floorwooden_1",
      appearanceType: 12304,
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(true);
    expect(result.placeable.templateId).toBe("plc_q_155");
    expect(result.placeable.resref).toBe("q_155");
    expect(result.placeable.metadata).toMatchObject({
      areaInstanceTag: "q_floorwooden_1",
      appearanceId: 12304,
      areaInstanceAppearanceType: 12304,
      source2daRow: 12304,
      modelResRef: "plc_wt305",
      lookupModelResRef: "plc_wt305",
      source2daLightColorRaw: "6",
      source2daLightColorRow: 6,
      source2daLightColorLabel: "PaleYellow",
      source2daLightColorSourceKey:
        "modules/current/__aurora/sources/vanilla/nwn_base.key/lightcolor.2da",
      source2daLightRed: 1.9,
      source2daLightGreen: 1.9,
      source2daLightBlue: 1,
      source2daToolsetRed: 0.94,
      source2daToolsetGreen: 0.94,
      source2daToolsetBlue: 0.77,
      source2daLightOffsetX: 0.12,
      source2daLightOffsetY: 0.1,
      source2daLightOffsetZ: 0.01,
      source2daShadowSize: 1,
      source2daStatic: false
    });
    expect(result.placeable.renderPackage?.glbUrl).toContain("plc_wt305.glb");
  });

  it("processPlaceable refreshes rebound Area GIT cache hits when the cached render model differs from the resolved lookup", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const correctedGlbKey = "modules/current/__aurora/derived/models/plc_core_0374.glb";
    const staleGlbKey = "modules/current/__aurora/derived/models/plc_core_0474.glb";
    const correctedGlbBytes = buildGlbFromJson({ asset: { version: "2.0" } });
    const staleGlbBytes = buildGlbFromJson({ asset: { version: "2.0" } });
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-area-mtt-model-refresh",
        totalFiles: 2,
        totalBytes: correctedGlbBytes.length + staleGlbBytes.length,
        objects: [
          {
            key: correctedGlbKey,
            size: correctedGlbBytes.length,
            etag: "corrected-glb"
          },
          {
            key: staleGlbKey,
            size: staleGlbBytes.length,
            etag: "stale-glb"
          }
        ],
        truncated: false,
        continuationToken: undefined
      }),
      getModuleObject: jest.fn(async (_settings, key) => {
        if (key === correctedGlbKey) {
          return {
            key,
            size: correctedGlbBytes.length,
            contentType: "model/gltf-binary",
            bytes: correctedGlbBytes
          };
        }
        if (key === staleGlbKey) {
          return {
            key,
            size: staleGlbBytes.length,
            contentType: "model/gltf-binary",
            bytes: staleGlbBytes
          };
        }
        return null;
      })
    };
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "mtt_v2_060"),
      resref: "mtt_v2_060",
      placeableSubtype: "generic",
      metadata: {
        modelResRef: "plc_core_0474",
        lookupModelResRef: "plc_core_0474"
      }
    });
    repository.findByKindAndResref.mockResolvedValue(null);
    repository.resolvePlaceableAppearanceModel = jest.fn().mockResolvedValue({
      source2da: "placeables.2da",
      rowId: 26374,
      requestedRowId: 26474,
      modelResRef: "plc_core_0374",
      resolutionPath: "placeables-instance-row-minus-100"
    });
    placeableCache.get.mockResolvedValue({
      key: "c".repeat(64),
      storedAt: "2026-07-07T13:15:00.000Z",
      hits: 3,
      value: {
        templateId: "mtt_v2_060",
        resref: "mtt_v2_060",
        name: "Cached stale MTT",
        category: "Area GIT Placeables",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "placeable-generic",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: {
          areaInstanceRenderSource: "git",
          areaInstanceModelLookupStatus: "ready",
          areaInstanceTag: "mtt_v2_059",
          appearanceId: 26474,
          areaInstanceAppearanceType: 26474,
          sourceKind: "2da",
          source2da: "placeables.2da",
          source2daRow: 26474,
          lookupRequestedAppearanceType: 26474,
          lookupResolutionPath: "placeables-direct-row",
          modelResRef: "plc_core_0474",
          lookupModelResRef: "plc_core_0474"
        },
        placeableRuntime: {
          source: {},
          identity: {},
          interaction: {},
          locking: {},
          trap: {},
          state: {},
          scripts: {}
        },
        placeableValidationIssues: [],
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-07-07T13:14:00.000Z",
          moduleHash: "hash-area-mtt-model-refresh",
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "stale-0474-glb",
              role: "model",
              fileName: "plc_core_0474.glb",
              objectKey: staleGlbKey,
              extension: "glb",
              sizeBytes: staleGlbBytes.length,
              contentType: "model/gltf-binary",
              etag: "stale-glb"
            }
          ]
        },
        renderPackage: {
          status: "ready",
          diagnostics: [],
          assetRefs: {
            derivedModelAssetIds: ["stale-0474-glb"],
            otherAssetIds: ["stale-0474-glb"]
          },
          glbUrl: "/api/v1/catalog/placeables/cache/stale/assets/stale-0474-glb.glb"
        },
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-07-07T13:14:00.000Z"
      } as PlaceableProcessingResult
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-07-07T13:16:00.000Z",
      hits: 0
    }));
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "mtt_v2_060",
      resref: "mtt_v2_060",
      tag: "mtt_v2_059",
      localizedName: "[MTT] Beczka 1",
      description: "A simple object of the sort you would find in a bathroom.",
      appearanceType: 26474,
      subtypeHint: "generic",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    const renderedModelAssetIds = result.placeable.renderPackage?.assetRefs.derivedModelAssetIds ?? [];
    const renderedModelAssets = result.placeable.assetManifest.assets.filter((asset) =>
      renderedModelAssetIds.includes(asset.assetId)
    );

    expect(result.cache.hit).toBe(true);
    expect(result.placeable.metadata).toMatchObject({
      areaInstanceTag: "mtt_v2_059",
      areaInstanceAppearanceType: 26474,
      source2daRow: 26374,
      lookupRequestedAppearanceType: 26474,
      lookupResolutionPath: "placeables-instance-row-minus-100",
      modelResRef: "plc_core_0374",
      lookupModelResRef: "plc_core_0374"
    });
    expect(result.placeable.assetManifest.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "plc_core_0374.glb"
        })
      ])
    );
    expect(result.placeable.assetManifest.assets).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "plc_core_0474.glb"
        })
      ])
    );
    expect(renderedModelAssets).toEqual([
      expect.objectContaining({
        fileName: "plc_core_0374.glb"
      })
    ]);
    expect(result.placeable.renderPackage?.glbUrl).toMatch(
      /^\/api\/v1\/catalog\/placeables\/cache\/.+\/assets\/.+\.glb$/u
    );
  });

  it("processPlaceable rehydrates cached Area GIT light-node helpers without missing-assets fallback packages", async () => {
    const staleCachedHelper = {
      templateId: "plc_campfr",
      resref: "plc_campfr",
      name: "plc_campfr",
      category: "Area GIT Placeables",
      placeableSubtype: "light_source",
      render: {
        backendType: "light_source",
        frontendType: "placeable",
        rendererPreset: "placeable-light",
        isDoor: false,
        isVfx: false
      },
      benchmarkCandidate: false,
      metadata: {
        areaInstanceTemplateSource: "git",
        areaInstanceTemplateSynthesized: true,
        templateResRef: "plc_campfr",
        resref: "plc_campfr",
        tag: "VALELightNodeOrange03m",
        requestedTemplateId: "plc_campfr",
        requestedResRef: "plc_campfr",
        appearanceId: 26949,
        areaInstanceRenderSource: "git",
        areaInstanceModelLookupStatus: "blocked",
        areaInstanceTag: "VALELightNodeOrange03m",
        areaInstanceAppearanceType: 26949,
        areaInstanceHelperRenderSuppressed: true,
        areaInstanceHelperKind: "light_node"
      },
      placeableRuntime: {
        source: {},
        identity: {},
        interaction: {},
        locking: {},
        trap: {},
        state: {},
        scripts: {}
      },
      placeableValidationIssues: [],
      assetManifest: buildEmptyManifest(),
      renderPackage: {
        status: "missing_assets",
        diagnostics: [
          {
            code: "PLACEABLE_RENDER_ASSETS_MISSING",
            severity: "error",
            message: "No model assets were discovered for this placeable."
          }
        ],
        assetRefs: {}
      },
      processedAt: "2026-06-26T10:00:00.000Z"
    };
    placeableCache.get.mockResolvedValue({
      key: "cached-helper",
      value: staleCachedHelper as unknown as Parameters<typeof placeableCache.set>[1],
      storedAt: "2026-06-26T10:00:00.000Z",
      hits: 1
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-06-26T10:13:00.000Z",
      hits: 0
    }));

    const result = await service.processPlaceable({
      templateId: "plc_campfr",
      resref: "plc_campfr",
      tag: "VALELightNodeOrange03m",
      subtypeHint: "generic",
      appearanceType: 26949,
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.renderPackage).toMatchObject({
      status: "unsupported",
      diagnostics: [
        expect.objectContaining({
          code: "PLACEABLE_RENDER_AREA_INSTANCE_HELPER_NO_GEOMETRY"
        })
      ],
      assetRefs: {}
    });
    expect(result.placeable.renderPackage?.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PLACEABLE_RENDER_ASSETS_MISSING"
        })
      ])
    );
  });

  it("processPlaceable cache hit hydrates render package urls for derived gltf assets", async () => {
    const cacheKey = "a".repeat(64);
    const derivedAssetId = "derivedgltf001";
    const textureAssetId = "texturedds001";

    placeableCache.get.mockResolvedValue({
      key: cacheKey,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 2,
      value: {
        templateId: "plc_cached_003",
        resref: "plc_cached_003",
        name: "Cached Placeable 3",
        category: "benchmark",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "placeable-generic",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        placeableRuntime: {
          source: {},
          identity: {},
          interaction: {},
          locking: {},
          trap: {},
          state: {},
          scripts: {}
        },
        placeableValidationIssues: [],
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 2,
          candidatesScanned: 10,
          assets: [
            {
              assetId: derivedAssetId,
              role: "unknown",
              fileName: "plc_cached_003.gltf",
              objectKey: "modules/current/models/plc_cached_003.gltf",
              extension: "gltf",
              sizeBytes: 24,
              contentType: "model/gltf+json"
            },
            {
              assetId: textureAssetId,
              role: "texture",
              fileName: "plc_cached_003.dds",
              objectKey: "modules/current/textures/plc_cached_003.dds",
              extension: "dds",
              sizeBytes: 8,
              contentType: "image/vnd-ms.dds"
            }
          ]
        },
        renderPackage: {
          status: "ready",
          diagnostics: [
            {
              code: "PLACEABLE_RENDER_READY",
              severity: "warn",
              message: "Derived model asset exists; backend render package can be produced."
            }
          ],
          assetRefs: {
            derivedModelAssetIds: [derivedAssetId],
            textureAssetIds: [textureAssetId]
          }
        },
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });
    repository.findByKindAndId.mockResolvedValue(buildTemplate("placeable", "plc_cached_003"));

    const result = await service.processPlaceable({
      templateId: "plc_cached_003",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(true);
    const responseCacheKey = result.cache.key;
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(result.placeable.renderPackage?.modelUrl).toBe(
      `/api/v1/catalog/placeables/cache/${responseCacheKey}/assets/${derivedAssetId}.gltf`
    );
    expect(result.placeable.renderPackage?.glbUrl).toBeUndefined();
    expect(result.placeable.renderPackage?.textureUrls).toEqual([
      `/api/v1/catalog/placeables/cache/${responseCacheKey}/assets/${textureAssetId}.dds`
    ]);
    expect(placeableCache.set).not.toHaveBeenCalled();
  });

  it("processPlaceable cache hit upgrades a legacy Aurora emitter payload with the source model graph", async () => {
    const sourceModelAssetId = "sourcemdl001";
    const textureAssetId = "texturetga001";
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current",
        moduleHash: "hash-vfx",
        totalFiles: 0,
        totalBytes: 0,
        objects: [],
        truncated: false
      }),
      getModuleObject: jest.fn()
    };
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    placeableCache.get.mockResolvedValue({
      key: "c".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 7,
      value: {
        templateId: "plc_cached_vfx",
        resref: "phod_fx_pntgrm2",
        name: "Cached VFX",
        category: "benchmark",
        placeableSubtype: "vfx",
        render: {
          backendType: "vfx",
          frontendType: "vfx",
          rendererPreset: "vfx-aurora",
          isDoor: false,
          isVfx: true
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        placeableRuntime: {
          source: {},
          identity: {},
          interaction: {},
          locking: {},
          trap: {},
          state: {},
          scripts: {}
        },
        placeableValidationIssues: [],
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-vfx",
          assetCount: 2,
          candidatesScanned: 10,
          assets: [
            {
              assetId: sourceModelAssetId,
              role: "model",
              fileName: "phod_fx_pntgrm2.mdl",
              objectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
              extension: "mdl",
              sizeBytes: 128,
              contentType: "application/octet-stream"
            },
            {
              assetId: textureAssetId,
              role: "texture",
              fileName: "phod_fx_pntgrm2.tga",
              objectKey: "modules/current/textures/phod_fx_pntgrm2.tga",
              extension: "tga",
              sizeBytes: 64,
              contentType: "image/x-tga"
            }
          ]
        },
        renderPackage: {
          status: "ready",
          diagnostics: [
            {
              code: "PLACEABLE_RENDER_READY",
              severity: "warn",
              message: "Derived model asset exists; backend render package can be produced."
            }
          ],
          assetRefs: {
            modelAssetIds: [sourceModelAssetId],
            textureAssetIds: [textureAssetId]
          },
          auroraEmitter: {
            source: "source-mdl",
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId,
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "cached_emitter",
                texture: "phod_fx_pntgrm2",
                emitterType: "emitter",
                renderMode: "Billboard_to_World_Z",
                simulation: {
                  birthrate: 12,
                  lifeExp: 1.5
                }
              }
            ],
            diagnostics: []
          }
        },
        classification: {
          source: "template",
          normalizedSubtype: "vfx",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_cached_vfx"),
      placeableSubtype: "vfx",
      resref: "phod_fx_pntgrm2"
    });
    const sourceModel = Buffer.from(
      [
        "newmodel phod_fx_pntgrm2",
        "beginmodelgeom phod_fx_pntgrm2",
        "node dummy phod_fx_pntgrm2",
        "  parent NULL",
        "endnode",
        "node emitter cached_emitter",
        "  parent phod_fx_pntgrm2",
        "  update Fountain",
        "  render Billboard_to_World_Z",
        "  texture phod_fx_pntgrm2",
        "  birthrate 12",
        "  lifeExp 1.5",
        "endnode",
        "node light cached_light",
        "  parent phod_fx_pntgrm2",
        "  position 0 0 1",
        "  radius 2",
        "  multiplier 1",
        "  color 1 0.5 0.1",
        "endnode",
        "endmodelgeom phod_fx_pntgrm2"
      ].join("\n")
    );
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) =>
      key === "modules/current/models/phod_fx_pntgrm2.mdl"
        ? {
            key,
            size: sourceModel.length,
            contentType: "application/octet-stream",
            bytes: sourceModel
          }
        : null
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_cached_vfx",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(true);
    expect(result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.nodeName).toBe(
      "cached_emitter"
    );
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).toContain("VFX_AURORA_MDL_EMITTER_PAYLOAD_READY");
    expect(result.placeable.renderPackage?.auroraLight?.lights).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ nodeName: "cached_light", radius: 2, multiplier: 1 })
      ])
    );
    expect(result.placeable.renderPackage?.textureUrls).toEqual([
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${textureAssetId}.tga`
    ]);
    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      expect.anything(),
      "modules/current/models/phod_fx_pntgrm2.mdl"
    );
  });

  it("processPlaceable bypassCache=true skips cache read/write", async () => {
    repository.findByKindAndId.mockResolvedValue(buildTemplate("placeable", "plc_uncached_001"));
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:31:00.000Z",
      hits: 0
    }));

    const result = await service.processPlaceable({
      templateId: "plc_uncached_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(placeableCache.get).not.toHaveBeenCalled();
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(result.cache.hit).toBe(false);
    expect(result.placeable.benchmarkCandidate).toBe(false);
  });

  it("falls back to a retained compact cache value when full VFX admission is rejected", async () => {
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_large_vfx_admission"),
      placeableSubtype: "vfx"
    });
    const fullRenderPackage = {
      status: "ready",
      diagnostics: [],
      assetRefs: {},
      auroraVfxPayload: {
        version: "aurora-vfx-payload/v1",
        contracts: {
          runtimeEmitters: [
            {
              emitterNodeName: "large_emitter",
              runtimeFrames: Array.from({ length: 64 }, (_, index) => ({
                timeSeconds: index / 30,
                particles: [{ x: index, y: index, z: index }]
              }))
            }
          ]
        }
      }
    } as PlaceableRenderPackage;
    (
      service as unknown as {
        buildPlaceableRenderPackageForCacheEntry: jest.Mock;
      }
    ).buildPlaceableRenderPackageForCacheEntry = jest.fn().mockResolvedValue(fullRenderPackage);
    let compactStoredValue: PlaceableProcessingResult | null = null;
    placeableCache.set
      .mockImplementationOnce(async (key, value) => ({
        key,
        value,
        storedAt: "2026-08-18T19:10:00.000Z",
        hits: 0,
        retained: false
      }))
      .mockImplementationOnce(async (key, value) => {
        compactStoredValue = value as PlaceableProcessingResult;
        return {
          key,
          value,
          storedAt: "2026-08-18T19:10:00.001Z",
          hits: 0,
          retained: true
        };
      });

    const result = await service.processPlaceable({
      templateId: "plc_large_vfx_admission",
      bypassCache: true,
      includeBenchmarkMetadata: false
    });

    expect(placeableCache.set).toHaveBeenCalledTimes(2);
    expect(
      (result.placeable.renderPackage?.auroraVfxPayload as {
        contracts: { runtimeEmitters: unknown[] };
      }).contracts.runtimeEmitters
    ).toHaveLength(1);
    expect(compactStoredValue).not.toBeNull();
    const admittedValue = compactStoredValue as unknown as PlaceableProcessingResult;
    expect(
      (admittedValue.renderPackage?.auroraVfxPayload as {
        contracts: { runtimeEmitters: unknown[]; runtimeEmittersDeferred: boolean };
      }).contracts
    ).toMatchObject({ runtimeEmitters: [], runtimeEmittersDeferred: true });

    placeableCache.get.mockResolvedValue({
      key: result.cache.key,
      value: admittedValue,
      storedAt: "2026-08-18T19:10:00.001Z",
      hits: 1,
      retained: true
    });
    await expect(service.getProcessedPlaceable(result.cache.key)).resolves.toMatchObject({
      cache: { key: result.cache.key, hit: true },
      placeable: { assetManifest: expect.any(Object) }
    });
  });

  it("fails closed instead of publishing a cache key when compact admission is also rejected", async () => {
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_unretainable_vfx"),
      placeableSubtype: "vfx"
    });
    const fullRenderPackage = {
      status: "ready",
      diagnostics: [],
      assetRefs: {},
      auroraVfxPayload: {
        version: "aurora-vfx-payload/v1",
        contracts: {
          runtimeEmitters: [{ emitterNodeName: "large_emitter", runtimeFrames: [{}] }]
        }
      }
    } as PlaceableRenderPackage;
    (
      service as unknown as {
        buildPlaceableRenderPackageForCacheEntry: jest.Mock;
      }
    ).buildPlaceableRenderPackageForCacheEntry = jest.fn().mockResolvedValue(fullRenderPackage);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-08-18T19:11:00.000Z",
      hits: 0,
      retained: false
    }));

    await expect(service.processPlaceable({
      templateId: "plc_unretainable_vfx",
      bypassCache: true,
      includeBenchmarkMetadata: false
    })).rejects.toMatchObject({
      code: "PLACEABLE_CACHE_ADMISSION_FAILED",
      details: [
        {
          path: "placeableCache",
          reason: "compact_entry_rejected"
        }
      ]
    });
    expect(placeableCache.set).toHaveBeenCalledTimes(2);
  });

  it("diagnoses an uncompactable cache rejection without publishing a ghost key", async () => {
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-08-18T19:12:00.000Z",
      hits: 0,
      retained: false
    }));
    const privateService = service as unknown as {
      storePlaceableProcessingResult: (
        cacheKey: string,
        value: PlaceableProcessingResult
      ) => Promise<unknown>;
    };

    await expect(
      privateService.storePlaceableProcessingResult(
        "cache_uncompactable",
        { templateId: "plc_uncompactable" } as unknown as PlaceableProcessingResult
      )
    ).rejects.toMatchObject({
      code: "PLACEABLE_CACHE_ADMISSION_FAILED",
      details: [
        {
          path: "placeableCache",
          reason: "full_entry_rejected_without_compactable_vfx_frames"
        }
      ]
    });
    expect(placeableCache.set).toHaveBeenCalledTimes(2);
  });

  it("returns explicit message when processed placeable cache key is missing", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(service.getProcessedPlaceable("b".repeat(64))).rejects.toMatchObject({
      code: "PLACEABLE_CACHE_NOT_FOUND",
      message: "Placeable cache entry was not found."
    });
  });

  it("returns cached placeable asset payload from module blob storage", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue({
      ...buildRuntimeSettingsRecord(),
      revision: 3
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/models/plc_city_gate.mdl",
      size: 12,
      contentType: "application/octet-stream",
      bytes: Buffer.from("model-bytes", "utf-8")
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const cacheKey = "c".repeat(64);
    const assetId = "aabbccddeeff";
    placeableCache.get.mockResolvedValue({
      key: cacheKey,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 1,
          candidatesScanned: 50,
          assets: [
            {
              assetId,
              role: "model",
              fileName: "plc_city_gate.mdl",
              objectKey: "modules/current/models/plc_city_gate.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            }
          ]
        },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const result = await serviceWithBlob.getProcessedPlaceableAsset(cacheKey, assetId);

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "aurora-module-assets"
      }),
      "modules/current/models/plc_city_gate.mdl"
    );
    expect(result.asset.assetId).toBe(assetId);
    expect(result.payload.bytes.toString("utf-8")).toBe("model-bytes");
  });

  it("resolves cached placeable asset ids case-insensitively and with trimmed input", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue({
      ...buildRuntimeSettingsRecord(),
      revision: 4
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/models/plc_city_gate_01.mdl",
      size: 12,
      contentType: "application/octet-stream",
      bytes: Buffer.from("asset-bytes", "utf-8")
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    placeableCache.get.mockResolvedValue({
      key: "d".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 2,
          candidatesScanned: 50,
          assets: [
            {
              assetId: "other-id",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            },
            {
              assetId: "abcDEF012345",
              role: "model",
              fileName: "plc_city_gate_01.mdl",
              objectKey: "modules/current/models/plc_city_gate_01.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            }
          ]
        },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const result = await serviceWithBlob.getProcessedPlaceableAsset(
      "d".repeat(64),
      "  AbCdEf012345  "
    );

    expect(result.asset.assetId).toBe("abcDEF012345");
    expect(result.payload.bytes.toString("utf-8")).toBe("asset-bytes");
  });

  it("throws explicit asset-not-found error when asset id is missing in manifest", async () => {
    placeableCache.get.mockResolvedValue({
      key: "e".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 1,
          candidatesScanned: 50,
          assets: [
            {
              assetId: "only-id",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            }
          ]
        },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    await expect(
      service.getProcessedPlaceableAsset("e".repeat(64), "missing-id")
    ).rejects.toMatchObject({
      code: "PLACEABLE_ASSET_NOT_FOUND",
      message: "Placeable asset was not found in cached manifest."
    });
  });

  it("throws explicit blob-not-found error when module object payload is missing", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue({
      ...buildRuntimeSettingsRecord(),
      revision: 5
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 1,
          candidatesScanned: 50,
          assets: [
            {
              assetId: "only-id",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            }
          ]
        },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    await expect(
      serviceWithBlob.getProcessedPlaceableAsset("f".repeat(64), "only-id")
    ).rejects.toMatchObject({
      code: "PLACEABLE_ASSET_BLOB_NOT_FOUND",
      message: "Placeable asset blob object was not found."
    });
  });

  it("returns placeable asset delivery contracts without downloading bytes", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue({
      ...buildRuntimeSettingsRecord(),
      revision: 8
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const cacheKey = "a".repeat(64);
    placeableCache.get.mockResolvedValue({
      key: cacheKey,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 2,
          candidatesScanned: 50,
          assets: [
            {
              assetId: "abcdef012345",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            },
            {
              assetId: "abcdef012346",
              role: "texture",
              fileName: "plc_city_gate_00.dds",
              objectKey: "modules/current/textures/plc_city_gate_00.dds",
              extension: "dds",
              sizeBytes: 48,
              contentType: "image/vnd-ms.dds"
            }
          ]
        },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const result = await serviceWithBlob.getProcessedPlaceableAssetDelivery(cacheKey);

    expect(moduleBlobStorage.getModuleObject).not.toHaveBeenCalled();
    expect(result.moduleHash).toBe("hash-v1");
    expect(result.assets).toHaveLength(2);
    expect(result.assets[0]).toMatchObject({
      assetId: "abcdef012345",
      objectKey: "modules/current/models/plc_city_gate_00.mdl",
      contentType: "application/octet-stream",
      sizeBytes: 12,
      deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345.mdl`,
      deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345.mdl`,
      s3Url: "s3://aurora-module-assets/modules/current/models/plc_city_gate_00.mdl"
    });
  });

  it("self-heals cached placeable manifest when module hash changed before delivery contracts", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue({
      ...buildRuntimeSettingsRecord(),
      revision: 10
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-v2",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/models/plc_city_gate.mdl",
          size: 12,
          etag: "e1"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:32:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const cacheKey = "a".repeat(64);
    placeableCache.get.mockResolvedValue({
      key: cacheKey,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 1,
          candidatesScanned: 50,
          assets: [
            {
              assetId: "oldasset1",
              role: "model",
              fileName: "plc_city_gate_legacy.mdl",
              objectKey: "modules/current/models/plc_city_gate_legacy.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            }
          ]
        },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const result = await serviceWithBlob.getProcessedPlaceableAssetDelivery(cacheKey);

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current"
      }),
      { limit: 1 }
    );
    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current"
      }),
      { limit: 50_000, continuationToken: undefined }
    );
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(
      (placeableCache.set.mock.calls[0]?.[1] as { assetManifest?: { moduleHash?: string } })
        .assetManifest?.moduleHash
    ).toBe("hash-v2");
    expect(result.moduleHash).toBe("hash-v2");
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]?.objectKey).toBe("modules/current/models/plc_city_gate.mdl");
  });

  it("throws PLACEABLE_CACHE_NOT_FOUND when getProcessedPlaceableAssetDelivery cache key is missing", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(
      service.getProcessedPlaceableAssetDelivery("a".repeat(64))
    ).rejects.toMatchObject({
      code: "PLACEABLE_CACHE_NOT_FOUND",
      message: "Placeable cache entry was not found."
    });
  });

  it("returns delivery contracts without s3Url when runtime settings repository is unavailable", async () => {
    const cacheKey = "a".repeat(64);
    placeableCache.get.mockResolvedValue({
      key: cacheKey,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 1,
          candidatesScanned: 50,
          assets: [
            {
              assetId: "abcdef012345",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            }
          ]
        },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const result = await service.getProcessedPlaceableAssetDelivery(cacheKey);

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toMatchObject({
      assetId: "abcdef012345",
      objectKey: "modules/current/models/plc_city_gate_00.mdl",
      deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345.mdl`,
      deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345.mdl`
    });
    expect(result.assets[0].s3Url).toBeUndefined();
  });

  it("filters placeable delivery contracts by requested asset ids", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue({
      ...buildRuntimeSettingsRecord(),
      revision: 9
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const cacheKey = "b".repeat(64);
    placeableCache.get.mockResolvedValue({
      key: cacheKey,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 2,
          candidatesScanned: 50,
          assets: [
            {
              assetId: "abcDEF012345",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            },
            {
              assetId: "abcdef012346",
              role: "texture",
              fileName: "plc_city_gate_00.dds",
              objectKey: "modules/current/textures/plc_city_gate_00.dds",
              extension: "dds",
              sizeBytes: 48,
              contentType: "image/vnd-ms.dds"
            }
          ]
        },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const filtered = await serviceWithBlob.getProcessedPlaceableAssetDelivery(cacheKey, [
      "  abcdef012345  "
    ]);
    expect(filtered.assets).toHaveLength(1);
    expect(filtered.assets[0].assetId).toBe("abcDEF012345");

    await expect(
      serviceWithBlob.getProcessedPlaceableAssetDelivery(cacheKey, ["missing"])
    ).rejects.toMatchObject({
      code: "PLACEABLE_ASSET_NOT_FOUND",
      message: "Placeable asset was not found in cached manifest."
    });
  });

  it("builds placeable asset manifest from paged module snapshot and preserves first module hash", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue({
      ...buildRuntimeSettingsRecord(),
      revision: 6
    });
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-1",
        totalFiles: 2,
        totalBytes: 20,
        objects: [
          {
            key: "modules/current/models/plc_city_gate.mdl",
            size: 12,
            etag: "e1"
          }
        ],
        truncated: true,
        continuationToken: "page-2"
      })
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-2",
        totalFiles: 2,
        totalBytes: 20,
        objects: [
          {
            key: "modules/current/textures/plc_city_gate.dds",
            size: 8,
            etag: "e2"
          }
        ],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_city_gate_001"),
      resref: "plc_city_gate",
      placeableSubtype: "door"
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:31:00.000Z",
      hits: 0
    }));

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_city_gate_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current"
      }),
      {
        limit: 50_000,
        continuationToken: undefined
      }
    );
    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current"
      }),
      {
        limit: 50_000,
        continuationToken: "page-2"
      }
    );
    expect(result.placeable.assetManifest.moduleHash).toBe("hash-1");
    expect(result.placeable.assetManifest.candidatesScanned).toBe(2);
    expect(result.placeable.assetManifest.assetCount).toBe(2);
  });

  it("stops snapshot pagination when continuation token is missing even if page is truncated", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-single",
      totalFiles: 1,
      totalBytes: 16,
      objects: [
        {
          key: "modules/current/models/plc_city_gate.mdl",
          size: 16,
          etag: "e-single"
        }
      ],
      truncated: true,
      continuationToken: undefined
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const summary = await (
      serviceWithBlob as unknown as {
        listAllModuleSnapshotObjects: (
          settings: ReturnType<typeof buildRuntimeSettingsRecord>["blobStorage"]
        ) => Promise<{
          moduleHash?: string;
          totalFiles: number;
          totalBytes: number;
          truncated: boolean;
        }>;
      }
    ).listAllModuleSnapshotObjects(buildRuntimeSettingsRecord().blobStorage);

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
    expect(summary.moduleHash).toBe("hash-single");
    expect(summary.totalFiles).toBe(1);
    expect(summary.totalBytes).toBe(16);
    expect(summary.truncated).toBe(false);
  });

  it("processes creature into cached contract", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_guard_human_001"),
      resref: "cre_guard_human_001",
      metadata: {
        ...buildTemplate("creature", "cre_guard_human_001").metadata,
        firstName: "City",
        lastName: "Guard",
        appearanceId: 17,
        appearanceLabelSource2daRow: 17,
        appearanceModelType: "P",
        appearanceRaceModel: "P_HHM",
        appearanceHead: 22,
        colorSkin: 9
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const result = await service.processCreature({
      templateId: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(false);
    expect(result.creature.kind).toBe("creature");
    expect(result.creature.render.frontendType).toBe("creature");
    expect(result.creature.creatureRenderPackage).toMatchObject({
      status: "missing_derived",
      rendererPreset: "creature-standard",
      appearanceProfile: {
        appearanceType: 17,
        appearanceSource2daRow: 17,
        modelType: "P"
      },
      sourceModelCandidates: [
        expect.objectContaining({
          role: "appearance-race-model",
          source: "appearance.2da.RACE",
          confidence: "assembly-prefix"
        })
      ]
    });
    expect(result.creature.creatureRuntime).toBeDefined();
    expect(result.creature.creatureRuntime?.identity.firstName).toBe("City");
    expect(result.creature.creatureRuntime?.appearance.appearanceHead).toBe(22);
    expect(Array.isArray(result.creature.creatureValidationIssues)).toBe(true);
    expect(result.creature.creatureValidationIssues?.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["CREATURE_COLORS_PARTIAL"])
    );
  });

  it("processCreature applies appearance overrides to part render candidates and cache key", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_nw_hen_dae_01"),
      resref: "nw_hen_dae_01",
      metadata: {
        ...buildTemplate("creature", "cre_nw_hen_dae_01").metadata,
        firstName: "Daelan",
        appearanceId: 18,
        appearanceLabelSource2daRow: 18,
        appearanceModelType: "P",
        appearanceRaceModel: "O",
        phenotype: 0,
        gender: 0,
        genderLabel: "Male",
        appearanceHead: 4,
        bodyPartTorso: 1,
        bodyPartRFoot: 1,
        colorSkin: 41,
        colorHair: 1,
        partModelCandidates: JSON.stringify([
          {
            slot: "head",
            partId: 4,
            partModelName: "head",
            modelPrefix: "pmo0_",
            modelResRef: "pmo0_head004",
            modelResRefPattern: "aurora-player-body-part",
            modelResRefPatternFormat: "p%c%c%s_%s_%03d",
            source: "utc.Appearance_Head",
            sourceKey: "modules/current/blueprints/creatures/nw_hen_dae_01.utc"
          }
        ])
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    repository.resolveCreatureAppearanceProfile = jest.fn().mockResolvedValue({
      appearanceType: 6,
      appearanceLabel: "(Dynamic) Human",
      appearanceSource2daRow: 6,
      appearanceSourceKey: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
      modelType: "P",
      raceModel: "H",
      defaultPhenotype: "0",
      sizeCategory: 3
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const baseResult = await service.processCreature({
      templateId: "cre_nw_hen_dae_01",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    const variantResult = await service.processCreature({
      templateId: "cre_nw_hen_dae_01",
      bypassCache: false,
      includeBenchmarkMetadata: true,
      creatureAppearanceOverride: {
        appearanceType: 6,
        appearanceHead: 12,
        bodyParts: {
          torso: 2,
          rFoot: 3
        },
        colors: {
          skin: 30,
          hair: 53
        }
      }
    });

    expect(variantResult.cache.key).not.toBe(baseResult.cache.key);
    expect(repository.resolveCreatureAppearanceProfile).toHaveBeenCalledWith(6);
    expect(variantResult.creature.creatureRuntime?.appearance.appearanceType).toBe(6);
    expect(variantResult.creature.creatureRuntime?.appearance.appearanceRaceModel).toBe("H");
    expect(variantResult.creature.creatureRuntime?.appearance.appearanceHead).toBe(12);
    expect(variantResult.creature.creatureRuntime?.colors.skin).toBe(30);
    expect(
      variantResult.creature.creatureRenderPackage?.partModelCandidates.map((candidate) => ({
        slot: candidate.slot,
        partId: candidate.partId,
        modelResRef: candidate.modelResRef
      }))
    ).toEqual(
      expect.arrayContaining([
        { slot: "head", partId: 12, modelResRef: "pmh0_head012" },
        { slot: "torso", partId: 2, modelResRef: "pmh0_chest002" },
        { slot: "rFoot", partId: 3, modelResRef: "pmh0_footr003" }
      ])
    );
    expect(
      variantResult.creature.creatureRenderPackage?.partModelCandidates.map(
        (candidate) => candidate.modelResRef
      )
    ).not.toContain("pmo0_head004");
  });

  it("hydrates creature equipped item templates into renderable equipment model candidates", async () => {
    const creatureTemplate: TemplateRecord = {
      ...buildTemplate("creature", "cre_guard_human_001"),
      resref: "cre_guard_human_001",
      metadata: {
        ...buildTemplate("creature", "cre_guard_human_001").metadata,
        firstName: "City",
        lastName: "Guard",
        appearanceId: 17,
        appearanceLabelSource2daRow: 17,
        appearanceModelType: "P",
        appearanceRaceModel: "P_HHM",
        equipItemListCount: 1,
        equipItemListEntries: JSON.stringify([
          {
            resRef: "nw_wswss001",
            slotMask: 16
          }
        ])
      }
    };
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "itm_nw_wswss001"),
      resref: "nw_wswss001",
      metadata: {
        ...buildTemplate("item", "itm_nw_wswss001").metadata,
        templateResRef: "nw_wswss001",
        localizedName: "Short Sword",
        baseItem: 7,
        baseItemModelType: "wsw",
        modelPart1: 2,
        modelPart2: 1,
        modelPart3: 3
      }
    };
    repository.findByKindAndId.mockImplementation(async (kind, templateId) => {
      if (kind === "creature" && templateId === creatureTemplate.templateId) {
        return creatureTemplate;
      }
      if (kind === "item" && templateId === itemTemplate.templateId) {
        return itemTemplate;
      }
      return null;
    });
    repository.findByKindAndResref.mockImplementation(async (kind, resref) => {
      if (kind === "item" && resref === itemTemplate.resref) {
        return itemTemplate;
      }
      return null;
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const result = await service.processCreature({
      templateId: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const equippedItem = result.creature.creatureRuntime?.lists.equippedItems?.[0];
    expect(equippedItem).toMatchObject({
      resRef: "nw_wswss001",
      itemTemplateId: "itm_nw_wswss001",
      itemResref: "nw_wswss001",
      itemRuntime: expect.objectContaining({
        identity: expect.objectContaining({
          templateResRef: "nw_wswss001",
          localizedName: "Short Sword"
        }),
        visual: expect.objectContaining({
          baseItemModelType: "wsw",
          modelPartResRefs: ["wswb_002", "wswm_001", "wswt_003"]
        })
      })
    });
    expect(result.creature.creatureRenderPackage?.equipmentModelCandidates[0]).toMatchObject({
      resref: "nw_wswss001",
      itemTemplateId: "itm_nw_wswss001",
      itemResref: "nw_wswss001",
      slotLabels: ["right hand"],
      attachmentTargets: ["rhand_g"],
      sourceModelStatus: "model-resrefs-ready",
      itemModelType: "wsw",
      itemModelParts: [2, 1, 3],
      itemModelPartRoles: ["blade", "middle", "top"],
      itemModelPartResRefs: ["wswb_002", "wswm_001", "wswt_003"],
      itemModelPartCandidates: [
        { resref: "wswb_002", role: "blade", partId: 2 },
        { resref: "wswm_001", role: "middle", partId: 1 },
        { resref: "wswt_003", role: "top", partId: 3 }
      ]
    });
  });

  it("hydrates missing repository item model types from baseitems.2da for creature equipment", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-creature-equipment-baseitems-"));
    const hakPath = join(tempRoot, "lc_2da.hak");
    const rows = Array.from({ length: 23 }, (_, index) =>
      index === 22
        ? "22 dagger 2 WSwDg **** iiw_dagger 1 2 0x10 3 1 1.0 8 0 Weapon 1 22 0 1 1 0 0"
        : `${index} **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** ****`
    );
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "baseitems",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "label ModelType ItemClass DefaultModel DefaultIcon InvSlotWidth InvSlotHeight EquipableSlots BaseCost Stacking ItemMultiplier MaxProps MinProps PropColumn StorePanel StorePanelSort ChargesStarting ILRStackSize WeaponMatType AmmunitionType ArcaneSpellFailure",
              ...rows
            ].join("\n"),
            "utf-8"
          )
        },
        {
          resref: "itempropdef",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "Label Name SubTypeResRef CostTableResRef Param1ResRef GameStrRef Description",
              "0 **** **** **** **** **** **** ****",
              "15 CastSpell 1234 iprp_spells iprp_chargecost iprp_paramtable 4321 4322"
            ].join("\n"),
            "utf-8"
          )
        }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["lc_2da.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const serviceWithRuntimeSettings = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository
      );
      const creatureTemplate: TemplateRecord = {
        ...buildTemplate("creature", "cre_guard_human_001"),
        resref: "cre_guard_human_001",
        metadata: {
          ...buildTemplate("creature", "cre_guard_human_001").metadata,
          firstName: "City",
          lastName: "Guard",
          appearanceId: 17,
          appearanceLabelSource2daRow: 17,
          appearanceModelType: "P",
          appearanceRaceModel: "P_HHM",
          equipItemListCount: 1,
          equipItemListEntries: JSON.stringify([
          {
            resRef: "nw_dagger001",
              slotMask: 16,
              itemTemplateMetadata: {
                templateResRef: "nw_dagger001",
                localizedName: "Dagger",
                baseItem: 22,
                modelPart1: 11,
                modelPart2: 11,
                modelPart3: 11
              }
            }
          ])
        }
      };
      const itemTemplate: TemplateRecord = {
        ...buildTemplate("item", "itm_nw_dagger001"),
        resref: "nw_dagger001",
        metadata: {
          ...buildTemplate("item", "itm_nw_dagger001").metadata,
          templateResRef: "nw_dagger001",
          localizedName: "Dagger",
          baseItem: 22,
          modelPart1: 11,
          modelPart2: 11,
          modelPart3: 11,
          itemPropertyListCount: 1,
          itemPropertyListEntries: JSON.stringify([
            {
              propertyName: 15,
              subtype: 66,
              costTable: 3,
              costValue: 1,
              param1: 255,
              param1Value: 0,
              chanceAppear: 100
            }
          ])
        }
      };
      repository.findByKindAndId.mockImplementation(async (kind, templateId) => {
        if (kind === "creature" && templateId === creatureTemplate.templateId) {
          return creatureTemplate;
        }
        if (kind === "item" && templateId === itemTemplate.templateId) {
          return itemTemplate;
        }
        return null;
      });
      repository.findByKindAndResref.mockImplementation(async (kind, resref) => {
        if (kind === "item" && resref === itemTemplate.resref) {
          return itemTemplate;
        }
        return null;
      });
      repository.listByKind.mockImplementation(async (kind, query) => {
        if (kind === "item") {
          return {
            items: [itemTemplate],
            total: 1,
            limit: query.limit,
            offset: query.offset
          };
        }
        return {
          items: [],
          total: 0,
          limit: query.limit,
          offset: query.offset
        };
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:20:00.000Z",
        hits: 0
      }));

      const result = await serviceWithRuntimeSettings.processCreature({
        templateId: "cre_guard_human_001",
        bypassCache: false,
        includeBenchmarkMetadata: true
      });

      const equippedItem = result.creature.creatureRuntime?.lists.equippedItems?.[0];
      expect(equippedItem?.itemRuntime?.visual).toMatchObject({
        baseItemModelType: "wswdg",
        modelPartResRefs: ["wswdg_b_011", "wswdg_m_011", "wswdg_t_011"],
        modelPartResRefRoles: ["blade", "middle", "top"]
      });
      expect(equippedItem?.itemRuntime?.classification).toMatchObject({
        baseItem: 22,
        baseItemLabel: "dagger",
        itemClass: "wswdg",
        defaultIcon: "iiw_dagger",
        invSlotWidth: 1,
        invSlotHeight: 2,
        equipableSlots: "0x10",
        baseCost: 3,
        stacking: 1,
        itemMultiplier: 1,
        maxProps: 8,
        minProps: 0,
        propColumn: "Weapon",
        storePanel: 1,
        storePanelSort: 22
      });
      expect(result.creature.creatureRenderPackage?.equipmentModelCandidates[0]).toMatchObject({
        resref: "nw_dagger001",
        sourceModelStatus: "model-resrefs-ready",
        itemModelType: "wswdg",
        itemModelPartResRefs: ["wswdg_b_011", "wswdg_m_011", "wswdg_t_011"],
        itemModelPartCandidates: [
          { resref: "wswdg_b_011", role: "blade", partId: 11 },
          { resref: "wswdg_m_011", role: "middle", partId: 11 },
          { resref: "wswdg_t_011", role: "top", partId: 11 }
        ]
      });

      const itemResult = await serviceWithRuntimeSettings.processItem({
        templateId: "itm_nw_dagger001",
        bypassCache: true,
        includeBenchmarkMetadata: true
      });
      expect(itemResult.item.itemRuntime?.visual).toMatchObject({
        baseItemModelType: "wswdg",
        modelPartResRefs: ["wswdg_b_011", "wswdg_m_011", "wswdg_t_011"],
        modelPartResRefRoles: ["blade", "middle", "top"]
      });
      expect(itemResult.item.metadata).toMatchObject({
        baseItem2daLabel: "dagger",
        baseItemDefaultIcon: "iiw_dagger",
        baseItemInvSlotWidth: 1,
        baseItemInvSlotHeight: 2,
        baseItemStorePanel: 1,
        baseItemStorePanelSort: 22
      });
      expect(JSON.parse(String(itemResult.item.metadata.itemPropertyListEntries))).toEqual([
        expect.objectContaining({
          propertyName: 15,
          propertyLabel: "CastSpell",
          propertyDefinitionSource2daRow: 15,
          subTypeTable: "iprp_spells",
          costTableDefinition: "iprp_chargecost",
          param1Table: "iprp_paramtable",
          nameStrRef: 1234,
          gameStrRef: 4321,
          descriptionStrRef: 4322
        })
      ]);
      expect(itemResult.item.itemRuntime?.itemProperties[0]).toMatchObject({
        propertyName: 15,
        propertyLabel: "CastSpell",
        subTypeTable: "iprp_spells",
        costTableDefinition: "iprp_chargecost",
        param1Table: "iprp_paramtable"
      });

      const listedItems = await serviceWithRuntimeSettings.listItems({
        limit: 20,
        offset: 0
      });
      expect(JSON.parse(String(listedItems.items[0].metadata.itemPropertyListEntries))).toEqual([
        expect.objectContaining({
          propertyName: 15,
          propertyLabel: "CastSpell",
          subTypeTable: "iprp_spells",
          costTableDefinition: "iprp_chargecost",
          param1Table: "iprp_paramtable"
        })
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("exposes CastSpell caster level and usage flags from iprp_spells.2da", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-item-property-spells-"));
    const hakPath = join(tempRoot, "lc_2da.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "itempropdef",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "Label Name SubTypeResRef Cost CostTableResRef Param1ResRef GameStrRef Description",
              "15 CastSpell 668 iprp_spells **** 3 **** 5485 1078"
            ].join("\n"),
            "utf-8"
          )
        },
        {
          resref: "iprp_spells",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "Label Name CasterLvl InnateLvl Cost SpellIndex PotionUse WandUse GeneralUse Icon",
              "66 Cure_Light_Wounds 1170 2 1 750 32 1 1 1 iss_CurLgtW",
              "67 No_Potion 1171 3 2 4500 33 0 1 0 iss_NoPotion"
            ].join("\n"),
            "utf-8"
          )
        },
        {
          resref: "iprp_chargecost",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "Name Label Cost PotionCost WandCost",
              "1 1755 Single_Use 0.1334 1 1",
              "2 1743 5_Charges/Use 0.45 0 1"
            ].join("\n"),
            "utf-8"
          )
        }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["lc_2da.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const serviceWithRuntimeSettings = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository
      );

      const dictionary = await serviceWithRuntimeSettings.getItemPropertyDictionary();
      const castSpell = dictionary.properties.find((entry) => entry.propertyName === 15);

      expect(castSpell).toMatchObject({
        propertyName: 15,
        propertyLabel: "CastSpell",
        subTypeTable: "iprp_spells",
        costTableIndex: 3,
        costTableDefinition: "iprp_chargecost"
      });
      expect(castSpell?.subtypeOptions).toEqual([
        expect.objectContaining({
          rowId: 66,
          label: "Cure_Light_Wounds",
          cost: 750,
          casterLevel: 2,
          innateLevel: 1,
          spellIndex: 32,
          potionUse: true,
          wandUse: true,
          generalUse: true,
          icon: "iss_curlgtw"
        }),
        expect.objectContaining({
          rowId: 67,
          casterLevel: 3,
          innateLevel: 2,
          potionUse: false,
          wandUse: true,
          generalUse: false
        })
      ]);
      expect(castSpell?.costValueOptions).toEqual([
        expect.objectContaining({
          rowId: 1,
          label: "Single_Use",
          cost: 0.1334,
          potionCost: 1,
          wandCost: 1
        }),
        expect.objectContaining({
          rowId: 2,
          label: "5_Charges/Use",
          cost: 0.45,
          potionCost: 0,
          wandCost: 1
        })
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("maps item property cost table indexes beyond the original base set", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-item-property-extra-cost-"));
    const hakPath = join(tempRoot, "lc_2da.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "itempropdef",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "Label Name SubTypeResRef Cost CostTableResRef Param1ResRef GameStrRef Description",
              "70 Trap 9874 iprp_traps 0 17 **** 0 0",
              "78 Immunity_To_Spell_By_Level 9921 **** 0 23 **** 0 0"
            ].join("\n"),
            "utf-8"
          )
        },
        {
          resref: "iprp_trapcost",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "Label Name Cost",
              "1 Spike 2258 78"
            ].join("\n"),
            "utf-8"
          )
        },
        {
          resref: "iprp_spelllvlimm",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "Label Name Cost",
              "9 level9 5603 450000"
            ].join("\n"),
            "utf-8"
          )
        }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["lc_2da.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const serviceWithRuntimeSettings = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository
      );

      const dictionary = await serviceWithRuntimeSettings.getItemPropertyDictionary();
      const trap = dictionary.properties.find((entry) => entry.propertyName === 70);
      const spellLevelImmunity = dictionary.properties.find((entry) => entry.propertyName === 78);

      expect(trap).toMatchObject({
        propertyName: 70,
        costTableIndex: 17,
        costTableDefinition: "iprp_trapcost"
      });
      expect(trap?.costValueOptions).toEqual([
        expect.objectContaining({ rowId: 1, label: "Spike", cost: 78 })
      ]);
      expect(spellLevelImmunity).toMatchObject({
        propertyName: 78,
        costTableIndex: 23,
        costTableDefinition: "iprp_spelllvlimm"
      });
      expect(spellLevelImmunity?.costValueOptions).toEqual([
        expect.objectContaining({ rowId: 9, label: "level9", cost: 450000 })
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("uses local retail item property cost tables when runtime tables only expose zero costs", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-item-property-retail-fallback-"));
    const hakPath = join(tempRoot, "lc_2da.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "itempropdef",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "Label Name SubTypeResRef Cost CostTableResRef Param1ResRef GameStrRef Description",
              "6 Enhancement 1062 **** 0 2 **** 0 0"
            ].join("\n"),
            "utf-8"
          )
        },
        {
          resref: "iprp_meleecost",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            ["2DA V2.0", "", "Name Label Cost", "1 One 1 0"].join("\n"),
            "utf-8"
          )
        }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["lc_2da.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const serviceWithRuntimeSettings = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository
      );
      const serviceInternals = serviceWithRuntimeSettings as unknown as {
        resolveLocalItemRetailItemPropDefTwoDa: jest.Mock;
        resolveLocalItemRetailTwoDa: jest.Mock;
      };
      serviceInternals.resolveLocalItemRetailItemPropDefTwoDa = jest.fn().mockResolvedValue({
        resref: "itempropdef",
        fileName: "local-retail/itempropdef.2da",
        extension: "2da",
        bytes: Buffer.from(
          [
            "2DA V2.0",
            "",
            "Label Name SubTypeResRef Cost CostTableResRef Param1ResRef GameStrRef Description",
            "6 Enhancement 1062 **** 1 2 **** 0 0"
          ].join("\n"),
          "utf-8"
        )
      });
      serviceInternals.resolveLocalItemRetailTwoDa = jest
        .fn()
        .mockImplementation(async (resref: string) =>
          resref === "iprp_meleecost"
            ? {
                resref: "iprp_meleecost",
                fileName: "local-retail/iprp_meleecost.2da",
                extension: "2da",
                bytes: Buffer.from(
                  ["2DA V2.0", "", "Name Label Cost", "1 One 1 0.9"].join("\n"),
                  "utf-8"
                )
              }
            : null
        );

      const dictionary = await serviceWithRuntimeSettings.getItemPropertyDictionary();
      const enhancement = dictionary.properties.find((entry) => entry.propertyName === 6);

      expect(enhancement).toMatchObject({
        propertyName: 6,
        propertyLabel: "Enhancement",
        cost: 1,
        costTableIndex: 2,
        costTableDefinition: "iprp_meleecost"
      });
      expect(enhancement?.costValueOptions).toEqual([
        expect.objectContaining({
          rowId: 1,
          label: "1",
          cost: 0.9,
          sourceKey: "local-retail/iprp_meleecost.2da"
        })
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("derives armor base cost from armor.2da via torso ACBONUS", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-item-armor-cost-"));
    const hakPath = join(tempRoot, "lc_2da.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "parts_chest",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "COSTMODIFIER ACBONUS",
              "0 0 ****",
              "43 0 3.00"
            ].join("\n"),
            "utf-8"
          )
        },
        {
          resref: "armor",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA,
          bytes: Buffer.from(
            [
              "2DA V2.0",
              "",
              "ACBONUS DEXBONUS ACCHECK ARCANEFAILURE% WEIGHT COST DESCRIPTIONS BASEITEMSTATREF",
              "3 3 4 -1 20 150 15 1730 5436"
            ].join("\n"),
            "utf-8"
          )
        }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["lc_2da.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const serviceWithRuntimeSettings = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository
      );
      const serviceInternals = serviceWithRuntimeSettings as unknown as {
        ensureCreatureRuntimeItemArmorPartCostMetadata: (
          metadata: TemplateRecord["metadata"]
        ) => Promise<TemplateRecord["metadata"]>;
      };

      const metadata = await serviceInternals.ensureCreatureRuntimeItemArmorPartCostMetadata({
        bodyPartTorso: 43
      });

      expect(metadata).toMatchObject({
        baseItemBaseCost: 15,
        armorBaseCost: 15,
        armorBaseCostRow: 3,
        armorBaseCostTorsoAcBonus: 3,
        armorPartCostModifierTorso: 0,
        armorPartCostModifierTotal: 0,
        armorPartCostModifierResolvedCount: 1
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("processes direct-model creature into ready render package and cached asset delivery", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    const directModelGlbBytes = convertAuroraAsciiMdlToGlb(
      Buffer.from(
        [
          "newmodel n_bear",
          "setsupermodel n_bear a_ba",
          "beginmodelgeom n_bear",
          "node dummy n_bear",
          "endnode",
          "endmodelgeom n_bear"
        ].join("\n"),
        "utf-8"
      )
    ).bytes;
    const supermodelGlbBytes = convertAuroraAsciiMdlToGlb(
      Buffer.from(
        [
          "newmodel a_ba",
          "beginmodelgeom a_ba",
          "node dummy a_ba",
          "endnode",
          "endmodelgeom a_ba",
          "newanim walk a_ba",
          "  length 1",
          "  node dummy a_ba",
          "    positionkey 1",
          "      0 0 0 0",
          "  endnode",
          "doneanim walk a_ba"
        ].join("\n"),
        "utf-8"
      )
    ).bytes;
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-direct-model",
      totalFiles: 2,
      totalBytes: directModelGlbBytes.length + supermodelGlbBytes.length,
      objects: [
        {
          key: "modules/current/models/n_bear.glb",
          size: directModelGlbBytes.length,
          etag: "bear-glb-hash"
        },
        {
          key: "modules/current/models/A_BA.glb",
          size: supermodelGlbBytes.length,
          etag: "bear-supermodel-glb-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/n_bear.glb") {
        return {
          key,
          size: directModelGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: "bear-glb-hash",
          bytes: directModelGlbBytes
        };
      }
      if (key === "modules/current/models/A_BA.glb") {
        return {
          key,
          size: supermodelGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: "bear-supermodel-glb-hash",
          bytes: supermodelGlbBytes
        };
      }
      return null;
    });

    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_bear_001"),
      resref: "cre_bear_001",
      metadata: {
        ...buildTemplate("creature", "cre_bear_001").metadata,
        firstName: "Forest",
        lastName: "Bear",
        appearanceId: 23,
        appearanceLabelSource2daRow: 23,
        appearanceModelType: "S",
        appearanceRaceModel: "n_bear"
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_bear_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.creature.creatureRenderPackage;
    expect(renderPackage?.status).toBe("ready");
    expect(renderPackage?.sourceModelCandidates).toEqual([
      expect.objectContaining({
        resref: "n_bear",
        confidence: "direct-model",
        assetId: expect.any(String),
        glbUrl: expect.stringContaining(
          `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/`
        ),
        supermodelResRef: "a_ba",
        supermodelAssetId: expect.any(String),
        supermodelGlbUrl: expect.stringContaining(
          `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/`
        )
      })
    ]);
    const derivedAssetId = renderPackage?.assetRefs?.derivedModelAssetIds?.[0];
    expect(derivedAssetId).toBeDefined();
    expect(renderPackage?.glbUrl).toBe(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${derivedAssetId}.glb`
    );
    expect(result.creature.assetManifest?.assets).toEqual(
      expect.arrayContaining([
      expect.objectContaining({
        assetId: derivedAssetId,
        fileName: "n_bear.glb",
        role: "model"
      }),
      expect.objectContaining({
        fileName: "A_BA.glb",
        role: "model"
      })
      ])
    );

    const cachedValue = placeableCache.set.mock.calls[0]?.[1] as unknown as TemplateRecord;
    placeableCache.get.mockResolvedValueOnce({
      key: result.cache.key,
      value: cachedValue,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 1
    });
    moduleBlobStorage.getModuleObject.mockResolvedValueOnce({
      key: "modules/current/models/n_bear.glb",
      size: directModelGlbBytes.length,
      contentType: "model/gltf-binary",
      etag: "bear-glb-hash",
      bytes: directModelGlbBytes
    });

    const asset = await serviceWithBlob.getProcessedPlaceableAsset(
      result.cache.key,
      derivedAssetId!
    );
    expect(asset.asset.fileName).toBe("n_bear.glb");
    expect(asset.payload.bytes).toEqual(directModelGlbBytes);
  });

  it("adds creature animation supermodels declared only by source MDL metadata even when the direct model has own clips", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    const directSourceBytes = Buffer.from(
      [
        "newmodel c_skel_war02",
        "setsupermodel c_skel_war02 c_skel_anims",
        "beginmodelgeom c_skel_war02",
        "node dummy c_skel_war02",
        "endnode",
        "endmodelgeom c_skel_war02",
        "newanim pause1 c_skel_war02",
        "  length 1",
        "  node dummy c_skel_war02",
        "    positionkey 1",
        "      0 0 0 0",
        "  endnode",
        "doneanim pause1 c_skel_war02"
      ].join("\n"),
      "utf-8"
    );
    const staleDirectGlbBytes = convertAuroraAsciiMdlToGlb(
      Buffer.from(
        [
          "newmodel c_skel_war02",
          "beginmodelgeom c_skel_war02",
          "node dummy c_skel_war02",
          "endnode",
          "endmodelgeom c_skel_war02"
        ].join("\n"),
        "utf-8"
      )
    ).bytes;
    const supermodelGlbBytes = convertAuroraAsciiMdlToGlb(
      Buffer.from(
        [
          "newmodel c_skel_anims",
          "beginmodelgeom c_skel_anims",
          "node dummy c_skel_anims",
          "endnode",
          "endmodelgeom c_skel_anims",
          "newanim pause1 c_skel_anims",
          "  length 1",
          "  node dummy c_skel_anims",
          "    positionkey 1",
          "      0 0 0 0",
          "  endnode",
          "doneanim pause1 c_skel_anims"
        ].join("\n"),
        "utf-8"
      )
    ).bytes;
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-source-supermodel",
      totalFiles: 3,
      totalBytes:
        directSourceBytes.length + staleDirectGlbBytes.length + supermodelGlbBytes.length,
      objects: [
        {
          key: "modules/current/models/c_skel_war02.mdl",
          size: directSourceBytes.length,
          etag: "skel-war-source"
        },
        {
          key: "modules/current/models/c_skel_war02.glb",
          size: staleDirectGlbBytes.length,
          etag: "skel-war-stale-glb"
        },
        {
          key: "modules/current/models/c_skel_anims.glb",
          size: supermodelGlbBytes.length,
          etag: "skel-war-supermodel-glb"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/c_skel_war02.mdl") {
        return {
          key,
          size: directSourceBytes.length,
          contentType: "application/octet-stream",
          etag: "skel-war-source",
          bytes: directSourceBytes
        };
      }
      if (key === "modules/current/models/c_skel_war02.glb") {
        return {
          key,
          size: staleDirectGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: "skel-war-stale-glb",
          bytes: staleDirectGlbBytes
        };
      }
      if (key === "modules/current/models/c_skel_anims.glb") {
        return {
          key,
          size: supermodelGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: "skel-war-supermodel-glb",
          bytes: supermodelGlbBytes
        };
      }
      return null;
    });

    const template: TemplateRecord = {
      ...buildTemplate("creature", "nw_skelwarr01"),
      resref: "nw_skelwarr01",
      metadata: {
        ...buildTemplate("creature", "nw_skelwarr01").metadata,
        firstName: "Skeleton",
        lastName: "Warrior",
        appearanceId: 999,
        appearanceLabelSource2daRow: 999,
        appearanceModelType: "S",
        appearanceRaceModel: "c_skel_war02"
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "nw_skelwarr01",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.creature.assetManifest?.assets.map((asset) => asset.fileName).sort()).toEqual([
      "c_skel_anims.glb",
      "c_skel_war02.glb",
      "c_skel_war02.mdl"
    ]);
    expect(result.creature.creatureRenderPackage?.sourceModelCandidates[0]).toMatchObject({
      resref: "c_skel_war02",
      supermodelResRef: "c_skel_anims",
      supermodelAssetId: expect.any(String),
      supermodelGlbUrl: expect.stringContaining("/assets/")
    });
  });

  it("treats direct-model creature source emitters as ready when GLB derivation is unavailable", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    const sourceModelBytes = Buffer.from(
      [
        "newmodel bf_grue_fire",
        "beginmodelgeom bf_grue_fire",
        "node dummy bf_grue_fire",
        "endnode",
        "node emitter fire_emit",
        "  parent bf_grue_fire",
        "  update Fountain",
        "  render Billboard_to_World_Z",
        "  blend Lighten",
        "  texture fx_fire",
        "  birthrate 12",
        "  lifeexp 1",
        "endnode",
        "endmodelgeom bf_grue_fire"
      ].join("\n"),
      "utf-8"
    );
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-emitter-only",
      totalFiles: 3,
      totalBytes: sourceModelBytes.length + 96,
      objects: [
        {
          key: "modules/current/models/bf_grue_fire.mdl",
          size: sourceModelBytes.length,
          etag: "bf-grue-fire-mdl-hash"
        },
        {
          key: "modules/current/textures/fx_fire.tga",
          size: 64,
          etag: "fx-fire-texture-hash"
        },
        {
          key: "modules/current/portal_placehold.utc",
          size: 32,
          etag: "portal-utc-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/bf_grue_fire.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          etag: "bf-grue-fire-mdl-hash",
          bytes: sourceModelBytes
        };
      }
      return null;
    });

    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_portal_placehold"),
      resref: "portal_placehold",
      metadata: {
        ...buildTemplate("creature", "cre_portal_placehold").metadata,
        sourceObjectKey: "modules/current/portal_placehold.utc",
        firstName: "portal placeholder",
        appearanceId: 999,
        appearanceLabelSource2daRow: 999,
        appearanceModelType: "S",
        appearanceRaceModel: "bf_grue_fire"
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_portal_placehold",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.creature.creatureRenderPackage?.status).toBe("ready");
    expect(result.creature.creatureRenderPackage?.glbUrl).toBeUndefined();
    expect(result.creature.creatureRenderPackage?.auroraEmitter?.emitters[0]).toMatchObject({
      nodeName: "fire_emit",
      texture: "fx_fire",
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Lighten",
      simulation: {
        birthrate: 12,
        lifeExp: 1
      }
    });
    expect(
      result.creature.creatureRenderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).toEqual(
      expect.arrayContaining([
        "CREATURE_AURORA_MDL_EMITTER_PAYLOAD_READY",
        "CREATURE_RENDER_EMITTER_PREVIEW_READY"
      ])
    );
    expect(
      result.creature.creatureRenderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).not.toContain("CREATURE_RENDER_DIRECT_MODEL_DERIVED_MISSING");
  });

  it("attaches source MDL scene graph and animation inspection to creature render packages", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    const sourceKey = "modules/current/models/n_bear.mdl";
    const sourceBytes = Buffer.from(
      [
        "newmodel n_bear",
        "setsupermodel n_bear a_ba",
        "setanimationscale 1.25",
        "beginmodelgeom n_bear",
        "node dummy n_bear",
        "  position 0 0 0",
        "  orientation 0 1 0 1.57079632679",
        "endnode",
        "node skin torso_skin",
        "  parent n_bear",
        "  bitmap n_bear_body",
        "endnode",
        "node emitter breath_emit",
        "  parent n_bear",
        "  texture fx_breath",
        "endnode",
        "endmodelgeom n_bear",
        "newanim walk n_bear",
        "  length 1.2",
        "  transtime 0.25",
        "  animroot n_bear",
        "  event 0.6 footstep",
        "  node dummy n_bear",
        "    positionkey 1",
        "      0 0 0 0",
        "    orientationkey 1",
        "      0 0 0 1 0",
        "  endnode",
        "doneanim walk n_bear"
      ].join("\n"),
      "utf-8"
    );
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-source-inspection",
      totalFiles: 2,
      totalBytes: sourceBytes.length + 120,
      objects: [
        {
          key: sourceKey,
          size: sourceBytes.length,
          etag: "bear-mdl-hash"
        },
        {
          key: "modules/current/models/n_bear.glb",
          size: 120,
          etag: "bear-glb-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === sourceKey) {
        return {
          key,
          size: sourceBytes.length,
          contentType: "application/octet-stream",
          etag: "bear-mdl-hash",
          bytes: sourceBytes
        };
      }
      return null;
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("creature", "cre_bear_001"),
      resref: "cre_bear_001",
      metadata: {
        ...buildTemplate("creature", "cre_bear_001").metadata,
        firstName: "Forest",
        lastName: "Bear",
        appearanceId: 23,
        appearanceLabelSource2daRow: 23,
        appearanceModelType: "S",
        appearanceRaceModel: "n_bear"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_bear_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.creature.creatureRenderPackage;
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "CREATURE_SOURCE_MDL_INSPECTION_READY"
    );
    expect(renderPackage?.sourceMdlInspection?.models[0]).toMatchObject({
      source: "aurora-mdl-ascii",
      sourceModelFileName: "n_bear.mdl",
      modelName: "n_bear",
      supermodel: "a_ba",
      animationScale: 1.25,
      nodeCount: 3,
      rootNodeNames: ["n_bear"],
      nodeTypeCounts: {
        dummy: 1,
        emitter: 1,
        skin: 1
      },
      nodes: expect.arrayContaining([
        expect.objectContaining({
          name: "n_bear",
          orientation: [0, 1, 0, 1.57079632679]
        })
      ]),
      animationCount: 1,
      animationNames: ["walk"],
      animations: [
        expect.objectContaining({
          name: "walk",
          animRoot: "n_bear",
          animationScale: 1.25,
          lengthSeconds: 1.2,
          transitionSeconds: 0.25,
          events: [{ timeSeconds: 0.6, name: "footstep" }],
          nodeCount: 1,
          positionKeyCount: 1,
          orientationKeyCount: 1
        })
      ],
      textureReferences: ["fx_breath"]
    });
  });

  it("replaces stale direct-model creature derived GLBs with freshly generated current converter output", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    const sourceKey = "modules/current/models/n_bear.mdl";
    const staleKey = "modules/current/__aurora/derived/models/n_bear.glb";
    const refreshedKey = "modules/current/__aurora/derived/models/n_bear.glb";
    const sourceBytes = Buffer.from(
      [
        "newmodel n_bear",
        "setsupermodel n_bear NULL",
        "beginmodelgeom n_bear",
        "node dummy n_bear",
        "endnode",
        "node trimesh bear_body",
        "  parent n_bear",
        "  texture0 bear_skin",
        "  verts 3",
        "    0 0 0",
        "    1 0 0",
        "    0 1 0",
        "  tverts 3",
        "    0 0",
        "    1 0",
        "    0 1",
        "  faces 1",
        "    0 1 2 1 0 1 2 1",
        "endnode",
        "endmodelgeom n_bear",
        "newanim walk n_bear",
        "  length 1.0",
        "  transtime 0.25",
        "  node dummy n_bear",
        "    positionkey 1",
        "      0 0 0 0",
        "  endnode",
        "doneanim walk n_bear"
      ].join("\n"),
      "utf-8"
    );
    const staleGlbBytes = buildGlbWithConverterVersion(
      "aurora-mdl-to-glb/v6-ascii-axis-angle-node-orientation-binary-rotatetexture-vec4-tangents"
    );
    const refreshedGlbBytes = buildGlbWithConverterVersion(
      AURORA_MDL_TO_GLB_CONVERTER_VERSION
    );
    const staleAssetId = "stale-n-bear-glb";

    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-stale-derived",
      totalFiles: 2,
      totalBytes: sourceBytes.length + staleGlbBytes.length,
      objects: [
        {
          key: sourceKey,
          size: sourceBytes.length,
          etag: "bear-mdl-hash"
        },
        {
          key: staleKey,
          size: staleGlbBytes.length,
          etag: staleAssetId
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === sourceKey) {
        return {
          key,
          size: sourceBytes.length,
          contentType: "application/octet-stream",
          etag: "bear-mdl-hash",
          bytes: sourceBytes
        };
      }
      if (key === staleKey) {
        return {
          key,
          size: staleGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: staleAssetId,
          bytes: staleGlbBytes
        };
      }
      if (key === refreshedKey) {
        return {
          key,
          size: refreshedGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: "current-n-bear-glb",
          bytes: refreshedGlbBytes
        };
      }
      return null;
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: refreshedKey,
      etag: "current-n-bear-glb",
      size: refreshedGlbBytes.length
    });
    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [
        {
          fileName: "__aurora/derived/models/n_bear.glb",
          resourceType: 0,
          bytes: refreshedGlbBytes
        }
      ],
      summary: {
        generator: "test-generator",
        generatedFiles: 1,
        generatedBytes: refreshedGlbBytes.length
      }
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("creature", "cre_bear_001"),
      resref: "cre_bear_001",
      metadata: {
        ...buildTemplate("creature", "cre_bear_001").metadata,
        firstName: "Forest",
        lastName: "Bear",
        appearanceId: 23,
        appearanceLabelSource2daRow: 23,
        appearanceModelType: "S",
        appearanceRaceModel: "n_bear"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_bear_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.creature.creatureRenderPackage;
    const assetRefs = renderPackage?.assetRefs;
    const refreshedAssetId = assetRefs?.derivedModelAssetIds?.[0];
    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledTimes(1);
    expect(refreshedAssetId).toBeDefined();
    expect(refreshedAssetId).not.toBe(staleAssetId);
    expect(assetRefs?.derivedModelAssetIds).toEqual([refreshedAssetId]);
    expect(renderPackage?.glbUrl).toBe(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${refreshedAssetId}.glb`
    );
    expect(result.creature.assetManifest?.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetId: refreshedAssetId,
          fileName: "n_bear.glb",
          etag: "current-n-bear-glb"
        })
      ])
    );
    expect(
      result.creature.assetManifest?.assets.some((asset) => asset.assetId === staleAssetId)
    ).toBe(false);
  });

  it("prefers current converter direct-model creature GLB when historical blobs share a basename", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    const currentVersionSegment = AURORA_MDL_TO_GLB_CONVERTER_VERSION.replace(
      /[^a-zA-Z0-9._-]+/gu,
      "_"
    );
    const sourceKey = "modules/current/models/n_bear.mdl";
    const staleKey =
      "modules/current/__aurora/derived/models/aurora-mdl-to-glb_v11-binary-skin-inverse-binds-modelbase/n_bear.glb";
    const currentKey = `modules/current/__aurora/derived/models/${currentVersionSegment}/n_bear.glb`;
    const legacyKey = "modules/current/__aurora/derived/models/n_bear.glb";
    const sourceBytes = Buffer.from(
      [
        "newmodel n_bear",
        "setsupermodel n_bear NULL",
        "beginmodelgeom n_bear",
        "node dummy n_bear",
        "endnode",
        "node trimesh bear_body",
        "  parent n_bear",
        "  texture0 bear_skin",
        "  verts 3",
        "    0 0 0",
        "    1 0 0",
        "    0 1 0",
        "  tverts 3",
        "    0 0",
        "    1 0",
        "    0 1",
        "  faces 1",
        "    0 1 2 1 0 1 2 1",
        "endnode",
        "endmodelgeom n_bear"
      ].join("\n"),
      "utf-8"
    );
    const staleGlbBytes = buildGlbWithConverterVersion(
      "aurora-mdl-to-glb/v11-binary-skin-inverse-binds-modelbase"
    );
    const currentGlbBytes = buildGlbWithConverterVersion(
      AURORA_MDL_TO_GLB_CONVERTER_VERSION
    );
    const legacyGlbBytes = buildGlbWithConverterVersion("aurora-mdl-to-glb/v9-binary-skin-weights");

    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-current-derived-priority",
      totalFiles: 4,
      totalBytes:
        sourceBytes.length + staleGlbBytes.length + currentGlbBytes.length + legacyGlbBytes.length,
      objects: [
        { key: sourceKey, size: sourceBytes.length, etag: "bear-mdl-hash" },
        { key: staleKey, size: staleGlbBytes.length, etag: "stale-v11-glb" },
        { key: currentKey, size: currentGlbBytes.length, etag: "current-v12-glb" },
        { key: legacyKey, size: legacyGlbBytes.length, etag: "legacy-v9-glb" }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === sourceKey) {
        return {
          key,
          size: sourceBytes.length,
          contentType: "application/octet-stream",
          etag: "bear-mdl-hash",
          bytes: sourceBytes
        };
      }
      if (key === staleKey) {
        return {
          key,
          size: staleGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: "stale-v11-glb",
          bytes: staleGlbBytes
        };
      }
      if (key === currentKey) {
        return {
          key,
          size: currentGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: "current-v12-glb",
          bytes: currentGlbBytes
        };
      }
      if (key === legacyKey) {
        return {
          key,
          size: legacyGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: "legacy-v9-glb",
          bytes: legacyGlbBytes
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("creature", "cre_bear_001"),
      resref: "cre_bear_001",
      metadata: {
        ...buildTemplate("creature", "cre_bear_001").metadata,
        firstName: "Forest",
        lastName: "Bear",
        appearanceId: 23,
        appearanceLabelSource2daRow: 23,
        appearanceModelType: "S",
        appearanceRaceModel: "n_bear"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_bear_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const currentAsset = result.creature.assetManifest?.assets.find(
      (asset) => asset.objectKey === currentKey
    );
    expect(currentAsset).toBeDefined();
    expect(derivedAssetGenerator.generateDerivedAssets).not.toHaveBeenCalled();
    expect(result.creature.creatureRenderPackage?.assetRefs?.derivedModelAssetIds).toEqual([
      currentAsset!.assetId
    ]);
    expect(result.creature.creatureRenderPackage?.glbUrl).toBe(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${currentAsset!.assetId}.glb`
    );
    expect(
      result.creature.assetManifest?.assets.some(
        (asset) => asset.objectKey === staleKey || asset.objectKey === legacyKey
      )
    ).toBe(false);
  });

  it("rehydrates cached creature projections when cached derived GLBs are stale", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    const sourceKey = "modules/current/models/n_bear.mdl";
    const staleKey = "modules/current/__aurora/derived/models/n_bear.glb";
    const refreshedKey = "modules/current/__aurora/derived/models/n_bear.glb";
    const sourceBytes = Buffer.from(
      [
        "newmodel n_bear",
        "setsupermodel n_bear NULL",
        "beginmodelgeom n_bear",
        "node dummy n_bear",
        "endnode",
        "node trimesh bear_body",
        "  parent n_bear",
        "  texture0 bear_skin",
        "  verts 3",
        "    0 0 0",
        "    1 0 0",
        "    0 1 0",
        "  tverts 3",
        "    0 0",
        "    1 0",
        "    0 1",
        "  faces 1",
        "    0 1 2 1 0 1 2 1",
        "endnode",
        "endmodelgeom n_bear"
      ].join("\n"),
      "utf-8"
    );
    const staleGlbBytes = buildGlbWithConverterVersion("aurora-mdl-to-glb/v9-binary-skin-weights");
    const refreshedGlbBytes = buildGlbWithConverterVersion(
      AURORA_MDL_TO_GLB_CONVERTER_VERSION
    );
    const staleAssetId = "stale-cached-n-bear-glb";
    const sourceAsset = {
      assetId: "source-n-bear-mdl",
      role: "model" as const,
      fileName: "n_bear.mdl",
      objectKey: sourceKey,
      extension: "mdl",
      sizeBytes: sourceBytes.length,
      contentType: "application/octet-stream",
      etag: "bear-mdl-hash"
    };
    const staleAsset = {
      assetId: staleAssetId,
      role: "model" as const,
      fileName: "n_bear.glb",
      objectKey: staleKey,
      extension: "glb",
      sizeBytes: staleGlbBytes.length,
      contentType: "model/gltf-binary",
      etag: staleAssetId
    };

    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-cached-stale-derived",
      totalFiles: 2,
      totalBytes: sourceBytes.length + staleGlbBytes.length,
      objects: [
        {
          key: sourceKey,
          size: sourceBytes.length,
          etag: "bear-mdl-hash"
        },
        {
          key: staleKey,
          size: staleGlbBytes.length,
          etag: staleAssetId
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === sourceKey) {
        return {
          key,
          size: sourceBytes.length,
          contentType: "application/octet-stream",
          etag: "bear-mdl-hash",
          bytes: sourceBytes
        };
      }
      if (key === staleKey) {
        return {
          key,
          size: staleGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: staleAssetId,
          bytes: staleGlbBytes
        };
      }
      if (key === refreshedKey) {
        return {
          key,
          size: refreshedGlbBytes.length,
          contentType: "model/gltf-binary",
          etag: "current-cached-n-bear-glb",
          bytes: refreshedGlbBytes
        };
      }
      return null;
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: refreshedKey,
      etag: "current-cached-n-bear-glb",
      size: refreshedGlbBytes.length
    });
    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [
        {
          fileName: "__aurora/derived/models/n_bear.glb",
          resourceType: 0,
          bytes: refreshedGlbBytes
        }
      ],
      summary: {
        generator: "test-generator",
        generatedFiles: 1,
        generatedBytes: refreshedGlbBytes.length
      }
    });
    const template = {
      ...buildTemplate("creature", "cre_bear_cached_001"),
      resref: "cre_bear_cached_001",
      metadata: {
        ...buildTemplate("creature", "cre_bear_cached_001").metadata,
        firstName: "Cached",
        lastName: "Bear",
        appearanceId: 23,
        appearanceLabelSource2daRow: 23,
        appearanceModelType: "S",
        appearanceRaceModel: "n_bear"
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 6,
      value: {
        templateId: template.templateId,
        kind: "creature",
        resref: template.resref,
        name: "cached bear",
        category: "npc",
        benchmarkCandidate: false,
        metadata: template.metadata,
        render: {
          backendType: "creature",
          frontendType: "creature",
          rendererPreset: "creature-standard"
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:09:00.000Z",
          moduleHash: "hash-creature-cached-stale-derived",
          assetCount: 2,
          candidatesScanned: 2,
          assets: [sourceAsset, staleAsset]
        },
        creatureRuntime: {
          source: {},
          identity: {},
          appearance: {},
          bodyParts: {},
          colors: {},
          partModelCandidates: [],
          faction: {},
          stats: {},
          lists: {},
          scripts: {}
        },
        creatureRenderPackage: {
          status: "ready",
          rendererPreset: "creature-standard",
          diagnostics: [],
          sourceModelCandidates: [
            {
              resref: "n_bear",
              source: "appearance.2da",
              confidence: "direct-model"
            }
          ],
          skeletonModelCandidates: [],
          partModelCandidates: [],
          equipmentModelCandidates: [],
          assetRefs: {
            derivedModelAssetIds: [staleAssetId]
          },
          bodyParts: {},
          colors: {}
        },
        creatureValidationIssues: [],
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_bear_cached_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const refreshedAssetIds =
      result.creature.creatureRenderPackage?.assetRefs?.derivedModelAssetIds ?? [];
    expect(result.cache.hit).toBe(true);
    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledTimes(1);
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(refreshedAssetIds).toHaveLength(1);
    expect(refreshedAssetIds[0]).not.toBe(staleAssetId);
    expect(
      result.creature.assetManifest?.assets.some((asset) => asset.assetId === staleAssetId)
    ).toBe(false);
  });

  it("uses the direct creature model URL when equipment models are present in the same manifest", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-direct-equipment",
      totalFiles: 4,
      totalBytes: 320,
      objects: [
        {
          key: "modules/current/models/wswss_b_011.glb",
          size: 64,
          etag: "wswss-b-glb-hash"
        },
        {
          key: "modules/current/models/wswss_m_011.glb",
          size: 64,
          etag: "wswss-m-glb-hash"
        },
        {
          key: "modules/current/models/wswss_t_011.glb",
          size: 64,
          etag: "wswss-t-glb-hash"
        },
        {
          key: "modules/current/models/zcp_horse_cart.glb",
          size: 128,
          etag: "zcp-horse-cart-glb-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_caravan"),
      resref: "caravan",
      metadata: {
        ...buildTemplate("creature", "cre_caravan").metadata,
        firstName: "Karawana",
        appearanceId: 900,
        appearanceLabelSource2daRow: 900,
        appearanceModelType: "S",
        appearanceRaceModel: "zcp_horse_cart",
        equipItemListCount: 1,
        equipItemListEntries: JSON.stringify([
          {
            resRef: "nw_wswss001",
            slotMask: 0x10
          }
        ])
      }
    };
    const swordTemplate: TemplateRecord = {
      ...buildTemplate("item", "itm_nw_wswss001"),
      resref: "nw_wswss001",
      metadata: {
        ...buildTemplate("item", "itm_nw_wswss001").metadata,
        templateResRef: "nw_wswss001",
        localizedName: "Short Sword",
        baseItem: 7,
        baseItemModelType: "wswss",
        modelPart1: 11,
        modelPart2: 11,
        modelPart3: 11
      }
    };
    repository.findByKindAndId.mockImplementation(async (kind, templateId) => {
      if (kind === "creature" && templateId === template.templateId) {
        return template;
      }
      if (kind === "item" && templateId === swordTemplate.templateId) {
        return swordTemplate;
      }
      return null;
    });
    repository.findByKindAndResref.mockImplementation(async (kind, resref) => {
      if (kind === "item" && resref === swordTemplate.resref) {
        return swordTemplate;
      }
      return null;
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_caravan",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.creature.creatureRenderPackage;
    expect(renderPackage?.status).toBe("ready");
    expect(renderPackage?.sourceModelCandidates[0]).toMatchObject({
      resref: "zcp_horse_cart",
      confidence: "direct-model"
    });
    expect(renderPackage?.glbUrl).toBe(renderPackage?.sourceModelCandidates[0]?.glbUrl);
    expect(renderPackage?.equipmentModelCandidates[0]).toMatchObject({
      resref: "nw_wswss001",
      itemModelType: "wswss",
      sourceModelStatus: "model-resrefs-ready",
      itemModelPartResRefs: ["wswss_b_011", "wswss_m_011", "wswss_t_011"]
    });
    const equipmentPartUrls =
      renderPackage?.equipmentModelCandidates[0]?.itemModelPartCandidates
        ?.map((candidate) => candidate.glbUrl)
        .filter((url): url is string => typeof url === "string") ?? [];
    expect(equipmentPartUrls).toHaveLength(3);
    expect(equipmentPartUrls).not.toContain(renderPackage?.glbUrl);
  });

  it("processes part-based creature CAPart candidates into cached part model delivery URLs", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-part-model",
      totalFiles: 6,
      totalBytes: 416,
      objects: [
        {
          key: "modules/current/models/pfh2.glb",
          size: 64,
          etag: "pfh2-glb-hash"
        },
        {
          key: "modules/current/models/pfh2_rfoot004.glb",
          size: 96,
          etag: "rfoot-glb-hash"
        },
        {
          key: "modules/current/models/wswss_b_011.glb",
          size: 64,
          etag: "wswss-b-glb-hash"
        },
        {
          key: "modules/current/models/wswss_m_011.glb",
          size: 64,
          etag: "wswss-m-glb-hash"
        },
        {
          key: "modules/current/models/wswss_t_011.glb",
          size: 64,
          etag: "wswss-t-glb-hash"
        },
        {
          key: "modules/current/models/wswls_t_211.glb",
          size: 64,
          etag: "wswls-t-glb-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_guard_human_001"),
      resref: "cre_guard_human_001",
      metadata: {
        ...buildTemplate("creature", "cre_guard_human_001").metadata,
        firstName: "City",
        lastName: "Guard",
        appearanceId: 17,
        appearanceLabelSource2daRow: 17,
        appearanceModelType: "P",
        appearanceRaceModel: "H",
        phenotype: 2,
        gender: 1,
        genderLabel: "Female",
        bodyPartRFoot: 4,
        equipItemListCount: 4,
        equipItemListEntries: JSON.stringify([
          {
            resRef: "nw_wswss001",
            slotMask: 0x10
          },
          {
            resRef: "d_und_a_w_sword",
            slotMask: 0x10
          },
          {
            resRef: "wnd_hiena_hood",
            slotMask: 0x1
          },
          {
            resRef: "nw_it_creitemunh",
            slotMask: 0x20000
          }
        ]),
        partModelCandidates: JSON.stringify([
          {
            slot: "rFoot",
            partId: 4,
            partModelName: "rfoot",
            nodeName: "rfoot_g",
            modelPrefix: "pfh2_",
            modelResRef: "pfh2_rfoot004",
            modelResRefPattern: "aurora-player-body-part",
            source: "capart.2da.MDLNAME",
            source2daRow: 0,
            sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
          }
        ])
      }
    };
    const itemTemplate: TemplateRecord = {
      ...buildTemplate("item", "itm_nw_wswss001"),
      resref: "nw_wswss001",
      metadata: {
        ...buildTemplate("item", "itm_nw_wswss001").metadata,
        templateResRef: "nw_wswss001",
        localizedName: "Short Sword",
        baseItem: 7,
        baseItemModelType: "wswss",
        modelPart1: 11,
        modelPart2: 11,
        modelPart3: 11
      }
    };
    const partialWeaponItemTemplate: TemplateRecord = {
      ...buildTemplate("item", "itm_d_und_a_w_sword"),
      resref: "d_und_a_w_sword",
      metadata: {
        ...buildTemplate("item", "itm_d_und_a_w_sword").metadata,
        templateResRef: "d_und_a_w_sword",
        localizedName: "Ancient Longsword",
        baseItem: 6,
        baseItemModelType: "wswls",
        modelPart1: 211,
        modelPart2: 211,
        modelPart3: 211
      }
    };
    const helmetItemTemplate: TemplateRecord = {
      ...buildTemplate("item", "itm_wnd_hiena_hood"),
      resref: "wnd_hiena_hood",
      metadata: {
        ...buildTemplate("item", "itm_wnd_hiena_hood").metadata,
        templateResRef: "wnd_hiena_hood",
        localizedName: "Hyena Hood",
        baseItem: 75,
        baseItemModelType: "helm",
        modelPart1: 33
      }
    };
    const creatureArmorItemTemplate: TemplateRecord = {
      ...buildTemplate("item", "itm_nw_it_creitemunh"),
      resref: "nw_it_creitemunh",
      metadata: {
        ...buildTemplate("item", "itm_nw_it_creitemunh").metadata,
        templateResRef: "nw_it_creitemunh",
        localizedName: "Creature Armor",
        baseItem: 77,
        baseItemModelType: "it_cr_item",
        modelPart1: 1
      }
    };
    repository.findByKindAndId.mockImplementation(async (kind, templateId) => {
      if (kind === "creature" && templateId === template.templateId) {
        return template;
      }
      if (kind === "item" && templateId === itemTemplate.templateId) {
        return itemTemplate;
      }
      if (kind === "item" && templateId === partialWeaponItemTemplate.templateId) {
        return partialWeaponItemTemplate;
      }
      if (kind === "item" && templateId === helmetItemTemplate.templateId) {
        return helmetItemTemplate;
      }
      if (kind === "item" && templateId === creatureArmorItemTemplate.templateId) {
        return creatureArmorItemTemplate;
      }
      return null;
    });
    repository.findByKindAndResref.mockImplementation(async (kind, resref) => {
      if (kind === "item" && resref === itemTemplate.resref) {
        return itemTemplate;
      }
      if (kind === "item" && resref === partialWeaponItemTemplate.resref) {
        return partialWeaponItemTemplate;
      }
      if (kind === "item" && resref === helmetItemTemplate.resref) {
        return helmetItemTemplate;
      }
      if (kind === "item" && resref === creatureArmorItemTemplate.resref) {
        return creatureArmorItemTemplate;
      }
      return null;
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.creature.creatureRenderPackage;
    expect(renderPackage?.status).toBe("ready");
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "CREATURE_RENDER_BASE_SKELETON_MODEL_ASSETS_READY",
        "CREATURE_RENDER_CAPART_PART_MODEL_ASSETS_READY",
        "CREATURE_RENDER_EQUIPMENT_MODEL_ASSETS_READY",
        "CREATURE_RENDER_PART_MODEL_GROUP_READY",
        "CREATURE_RENDER_SKINNED_GLB_ASSEMBLY_PENDING"
      ])
    );
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "CREATURE_RENDER_EQUIPMENT_MODEL_ASSETS_PARTIAL"
    );
    const skeletonCandidate = renderPackage?.skeletonModelCandidates[0];
    expect(skeletonCandidate).toMatchObject({
      resref: "pfh2",
      assetId: expect.any(String),
      glbUrl: expect.stringContaining(
        `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/`
      )
    });
    const partCandidate = renderPackage?.partModelCandidates[0];
    expect(partCandidate).toMatchObject({
      slot: "rFoot",
      modelResRef: "pfh2_rfoot004",
      assetId: expect.any(String),
      glbUrl: expect.stringContaining(
        `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/`
      )
    });
    expect(
      renderPackage?.equipmentModelCandidates[0]?.itemModelPartCandidates?.map((candidate) => ({
        resref: candidate.resref,
        glbUrlReady: Boolean(candidate.glbUrl)
      }))
    ).toEqual([
      { resref: "wswss_b_011", glbUrlReady: true },
      { resref: "wswss_m_011", glbUrlReady: true },
      { resref: "wswss_t_011", glbUrlReady: true }
    ]);
    expect(renderPackage?.equipmentModelCandidates[1]).toMatchObject({
      resref: "d_und_a_w_sword",
      slotLabels: ["right hand"],
      itemModelType: "wswls",
      sourceModelStatus: "model-resrefs-ready",
      itemModelParts: [211],
      itemModelPartRoles: ["top"],
      itemModelPartResRefs: ["wswls_t_211"],
      itemModelPartCandidates: [
        expect.objectContaining({
          resref: "wswls_t_211",
          role: "top",
          partId: 211,
          glbUrl: expect.stringContaining(
            `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/`
          )
        })
      ]
    });
    expect(renderPackage?.equipmentModelCandidates[2]).toMatchObject({
      resref: "wnd_hiena_hood",
      slotLabels: ["head"],
      itemModelType: "helm",
      sourceModelStatus: "metadata-only"
    });
    expect(renderPackage?.equipmentModelCandidates[2]?.itemModelPartCandidates).toBeUndefined();
    expect(renderPackage?.equipmentModelCandidates[3]).toMatchObject({
      resref: "nw_it_creitemunh",
      slotLabels: ["creature armor"],
      itemModelType: "it_cr_item",
      sourceModelStatus: "metadata-only"
    });
    expect(renderPackage?.equipmentModelCandidates[3]?.itemModelPartCandidates).toBeUndefined();
    expect(result.creature.assetManifest?.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          assetId: skeletonCandidate?.assetId,
          fileName: "pfh2.glb",
          role: "model"
        }),
        expect.objectContaining({
          assetId: partCandidate?.assetId,
          fileName: "pfh2_rfoot004.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "wswss_b_011.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "wswss_m_011.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "wswss_t_011.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "wswls_t_211.glb",
          role: "model"
        })
      ])
    );
  });

  it("uses a phenotype-zero default head fallback when exact creature head part is unavailable", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-head-fallback",
      totalFiles: 2,
      totalBytes: 160,
      objects: [
        {
          key: "modules/current/models/pmh9.glb",
          size: 64,
          etag: "pmh9-glb-hash"
        },
        {
          key: "modules/current/models/pmh0_head001.glb",
          size: 96,
          etag: "pmh0-head001-glb-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_npc_bimber2"),
      resref: "npc_bimber2",
      metadata: {
        ...buildTemplate("creature", "cre_npc_bimber2").metadata,
        sourceObjectKey: "modules/current/npc_bimber2.utc",
        firstName: "Bimbrownik",
        lastName: "Borys",
        appearanceId: 6,
        appearanceLabelSource2daRow: 6,
        appearanceModelType: "P",
        appearanceRaceModel: "H",
        phenotype: 9,
        gender: 0,
        appearanceHead: 148,
        partModelCandidates: JSON.stringify([
          {
            slot: "head",
            partId: 148,
            partModelName: "head",
            modelPrefix: "pmh9_",
            modelResRef: "pmh9_head148",
            modelResRefPattern: "aurora-player-body-part",
            modelResRefPatternFormat: "p%c%c%s_%s_%03d",
            source: "utc.Appearance_Head",
            sourceKey: "modules/current/npc_bimber2.utc"
          }
        ])
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_npc_bimber2",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.creature.creatureRenderPackage;
    expect(renderPackage?.status).toBe("ready");
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "CREATURE_RENDER_BASE_SKELETON_MODEL_ASSETS_PARTIAL",
        "CREATURE_RENDER_CAPART_PART_MODEL_ASSETS_READY",
        "CREATURE_RENDER_PART_MODEL_FALLBACK_READY",
        "CREATURE_RENDER_PART_MODEL_GROUP_READY",
        "CREATURE_RENDER_SKINNED_GLB_ASSEMBLY_PENDING"
      ])
    );
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "CREATURE_RENDER_PART_MODEL_DERIVED_MISSING"
    );
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "CREATURE_RENDER_CAPART_PART_MODEL_ASSETS_PARTIAL"
    );
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "CREATURE_RENDER_PART_MODEL_GROUP_PARTIAL_READY"
    );
    expect(
      renderPackage?.partModelCandidates.map((candidate) => ({
        slot: candidate.slot,
        partId: candidate.partId,
        modelResRef: candidate.modelResRef,
        glbUrlReady: Boolean(candidate.glbUrl)
      }))
    ).toEqual([
      { slot: "head", partId: 1, modelResRef: "pmh0_head001", glbUrlReady: true }
    ]);
    expect(result.creature.assetManifest?.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "pmh9.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "pmh0_head001.glb",
          role: "model"
        })
      ])
    );
  });

  it("uses phenotype-zero body part fallbacks when exact creature body parts are unavailable", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-body-fallback",
      totalFiles: 3,
      totalBytes: 256,
      objects: [
        {
          key: "modules/current/models/pmh9.glb",
          size: 64,
          etag: "pmh9-glb-hash"
        },
        {
          key: "modules/current/models/pmh0_rfoot001.glb",
          size: 96,
          etag: "pmh0-rfoot001-glb-hash"
        },
        {
          key: "modules/current/models/pmh0_lfoot001.glb",
          size: 96,
          etag: "pmh0-lfoot001-glb-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_npc_bimber2"),
      resref: "npc_bimber2",
      metadata: {
        ...buildTemplate("creature", "cre_npc_bimber2").metadata,
        sourceObjectKey: "modules/current/npc_bimber2.utc",
        firstName: "Bimbrownik",
        lastName: "Borys",
        appearanceId: 6,
        appearanceLabelSource2daRow: 6,
        appearanceModelType: "P",
        appearanceRaceModel: "H",
        phenotype: 9,
        gender: 0,
        bodyPartRFoot: 1,
        bodyPartLFoot: 1,
        partModelCandidates: JSON.stringify([
          {
            slot: "rFoot",
            partId: 1,
            partModelName: "rfoot",
            nodeName: "rfoot_g",
            modelPrefix: "pmh9_",
            modelResRef: "pmh9_rfoot001",
            modelResRefPattern: "aurora-player-body-part",
            modelResRefPatternFormat: "p%c%c%s_%s_%03d",
            source: "capart.2da.MDLNAME",
            source2daRow: 0,
            sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
          },
          {
            slot: "lFoot",
            partId: 1,
            partModelName: "lfoot",
            nodeName: "lfoot_g",
            modelPrefix: "pmh9_",
            modelResRef: "pmh9_lfoot001",
            modelResRefPattern: "aurora-player-body-part",
            modelResRefPatternFormat: "p%c%c%s_%s_%03d",
            source: "capart.2da.MDLNAME",
            source2daRow: 1,
            sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
          }
        ])
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_npc_bimber2",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.creature.creatureRenderPackage;
    expect(renderPackage?.status).toBe("ready");
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "CREATURE_RENDER_BASE_SKELETON_MODEL_ASSETS_PARTIAL",
        "CREATURE_RENDER_CAPART_PART_MODEL_ASSETS_READY",
        "CREATURE_RENDER_PART_MODEL_FALLBACK_READY",
        "CREATURE_RENDER_PART_MODEL_GROUP_READY",
        "CREATURE_RENDER_SKINNED_GLB_ASSEMBLY_PENDING"
      ])
    );
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "CREATURE_RENDER_CAPART_PART_MODEL_ASSETS_PARTIAL"
    );
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "CREATURE_RENDER_PART_MODEL_GROUP_PARTIAL_READY"
    );
    expect(
      renderPackage?.partModelCandidates.map((candidate) => ({
        slot: candidate.slot,
        partId: candidate.partId,
        modelResRef: candidate.modelResRef,
        glbUrlReady: Boolean(candidate.glbUrl)
      }))
    ).toEqual([
      { slot: "rFoot", partId: 1, modelResRef: "pmh0_rfoot001", glbUrlReady: true },
      { slot: "lFoot", partId: 1, modelResRef: "pmh0_lfoot001", glbUrlReady: true }
    ]);
    expect(result.creature.assetManifest?.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "pmh9.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "pmh0_rfoot001.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "pmh0_lfoot001.glb",
          role: "model"
        })
      ])
    );
  });

  it("prefers same-part phenotype-zero fallbacks over generic body part fallbacks", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-preferred-body-fallback",
      totalFiles: 3,
      totalBytes: 256,
      objects: [
        {
          key: "modules/current/models/pmh9.glb",
          size: 64,
          etag: "pmh9-glb-hash"
        },
        {
          key: "modules/current/models/pmh0_footr160.glb",
          size: 96,
          etag: "pmh0-footr160-glb-hash"
        },
        {
          key: "modules/current/models/pmh0_footr001.glb",
          size: 96,
          etag: "pmh0-footr001-glb-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_npc_bimber2"),
      resref: "npc_bimber2",
      metadata: {
        ...buildTemplate("creature", "cre_npc_bimber2").metadata,
        sourceObjectKey: "modules/current/npc_bimber2.utc",
        firstName: "Bimbrownik",
        lastName: "Borys",
        appearanceId: 6,
        appearanceLabelSource2daRow: 6,
        appearanceModelType: "P",
        appearanceRaceModel: "H",
        phenotype: 9,
        gender: 0,
        bodyPartRFoot: 160,
        partModelCandidates: JSON.stringify([
          {
            slot: "rFoot",
            partId: 160,
            partModelName: "footr",
            nodeName: "rfoot_g",
            modelPrefix: "pmh9_",
            modelResRef: "pmh9_footr160",
            modelResRefPattern: "aurora-player-body-part",
            modelResRefPatternFormat: "p%c%c%s_%s_%03d",
            source: "capart.2da.MDLNAME",
            source2daRow: 0,
            sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da",
            materialColors: {
              leather1: 103,
              leather2: 11,
              cloth1: 102,
              cloth2: 8,
              metal1: 156,
              metal2: 157
            }
          }
        ])
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_npc_bimber2",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(
      result.creature.creatureRenderPackage?.partModelCandidates.map((candidate) => ({
        slot: candidate.slot,
        partId: candidate.partId,
        modelResRef: candidate.modelResRef,
        glbUrlReady: Boolean(candidate.glbUrl),
        materialColors: candidate.materialColors
      }))
    ).toEqual([
      {
        slot: "rFoot",
        partId: 160,
        modelResRef: "pmh0_footr160",
        glbUrlReady: true,
        materialColors: {
          leather1: 103,
          leather2: 11,
          cloth1: 102,
          cloth2: 8,
          metal1: 156,
          metal2: 157
        }
      }
    ]);
  });

  it("keeps part-based creature manifests from expanding short skeleton prefixes", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-exact-part-manifest",
      totalFiles: 6,
      totalBytes: 600,
      objects: [
        { key: "modules/current/models/pmh0.mdl", size: 100, etag: "skeleton" },
        { key: "modules/current/models/pmh0_head001.mdl", size: 100, etag: "head-001" },
        { key: "modules/current/models/pmh0_head006.mdl", size: 100, etag: "head-006" },
        { key: "modules/current/models/pmh0_chest001.mdl", size: 100, etag: "chest-001" },
        { key: "modules/current/textures/pmh0_head001.dds", size: 100, etag: "texture" },
        { key: "modules/current/auctioneer.utc", size: 100, etag: "utc" }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_auctioneer"),
      resref: "auctioneer",
      metadata: {
        ...buildTemplate("creature", "cre_auctioneer").metadata,
        sourceObjectKey: "modules/current/auctioneer.utc",
        firstName: "Auctioneer",
        appearanceId: 6,
        appearanceLabelSource2daRow: 6,
        appearanceModelType: "P",
        appearanceRaceModel: "H",
        phenotype: 0,
        gender: 0,
        appearanceHead: 1,
        partModelCandidates: JSON.stringify([
          {
            slot: "head",
            partId: 1,
            partModelName: "head",
            modelPrefix: "pmh0_",
            modelResRef: "pmh0_head001",
            modelResRefPattern: "aurora-player-body-part",
            source: "utc.Appearance_Head",
            sourceKey: "modules/current/auctioneer.utc"
          }
        ])
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_auctioneer",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.creature.assetManifest?.assets.map((asset) => asset.fileName).sort()).toEqual([
      "auctioneer.utc",
      "pmh0.mdl",
      "pmh0_head001.dds",
      "pmh0_head001.mdl"
    ]);
    expect(
      result.creature.creatureRenderPackage?.textureBindings?.map((binding) => binding.reference)
    ).toContain("pmh0_head001");
  });

  it("adds an available player-body animation supermodel for part-based creature skeletons", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-skeleton-supermodel",
      totalFiles: 5,
      totalBytes: 500,
      objects: [
        { key: "modules/current/models/pmh0.mdl", size: 100, etag: "skeleton" },
        { key: "modules/current/models/pmh0_head001.mdl", size: 100, etag: "head-001" },
        { key: "modules/current/models/a_oldm.glb", size: 100, etag: "oldm-glb" },
        { key: "modules/current/textures/pmh0_head001.dds", size: 100, etag: "texture" },
        { key: "modules/current/auctioneer.utc", size: 100, etag: "utc" }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_auctioneer"),
      resref: "auctioneer",
      metadata: {
        ...buildTemplate("creature", "cre_auctioneer").metadata,
        sourceObjectKey: "modules/current/auctioneer.utc",
        firstName: "Auctioneer",
        appearanceId: 6,
        appearanceLabelSource2daRow: 6,
        appearanceModelType: "P",
        appearanceRaceModel: "H",
        phenotype: 0,
        gender: 0,
        appearanceHead: 1,
        partModelCandidates: JSON.stringify([
          {
            slot: "head",
            partId: 1,
            partModelName: "head",
            modelPrefix: "pmh0_",
            modelResRef: "pmh0_head001",
            modelResRefPattern: "aurora-player-body-part",
            source: "utc.Appearance_Head",
            sourceKey: "modules/current/auctioneer.utc"
          }
        ])
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_auctioneer",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.creature.assetManifest?.assets.map((asset) => asset.fileName).sort()).toEqual([
      "a_oldm.glb",
      "auctioneer.utc",
      "pmh0.mdl",
      "pmh0_head001.dds",
      "pmh0_head001.mdl"
    ]);
    expect(result.creature.creatureRenderPackage?.skeletonModelCandidates[0]).toMatchObject({
      resref: "pmh0",
      supermodelResRef: "a_oldm",
      supermodelAssetId: expect.any(String),
      supermodelGlbUrl: expect.stringContaining("/assets/")
    });
  });

  it("hydrates missing exact creature part PLT textures from vanilla KEY/BIF", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-creature-head-texture-"));
    try {
      await writeFakeKeyBif(tempRoot, [
        {
          resref: "pmh0_head001",
          resourceType: NWN_KEY_BIF_RESOURCE_TYPES.PLT,
          bytes: Buffer.from("PLT_HEAD", "utf-8")
        }
      ]);
      const runtimeSettings = buildRuntimeSettingsRecord();
      runtimeSettings.paths.vanillaDataPath = tempRoot;
      runtimeSettings.sources.placeable.includeVanilla = true;
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(runtimeSettings),
        save: jest.fn()
      };
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-creature-vanilla-head-texture",
        totalFiles: 4,
        totalBytes: 400,
        objects: [
          { key: "modules/current/models/pmh0.mdl", size: 100, etag: "skeleton" },
          { key: "modules/current/models/pmh0_head001.mdl", size: 100, etag: "head-001" },
          { key: "modules/current/models/pmh0_head006.mdl", size: 100, etag: "head-006" },
          { key: "modules/current/auctioneer.utc", size: 100, etag: "utc" }
        ],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockResolvedValue(null);
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      putModuleObject.mockImplementation(async (settings, file) => ({
        key: `${settings.modulePrefix}/${file.fileName}`,
        size: file.bytes.length,
        etag: `etag-${file.fileName}`,
        lastModified: "2026-05-24T10:20:00.000Z"
      }));

      const template: TemplateRecord = {
        ...buildTemplate("creature", "cre_auctioneer"),
        resref: "auctioneer",
        metadata: {
          ...buildTemplate("creature", "cre_auctioneer").metadata,
          sourceObjectKey: "modules/current/auctioneer.utc",
          firstName: "Auctioneer",
          appearanceId: 6,
          appearanceLabelSource2daRow: 6,
          appearanceModelType: "P",
          appearanceRaceModel: "H",
          phenotype: 0,
          gender: 0,
          appearanceHead: 1,
          partModelCandidates: JSON.stringify([
            {
              slot: "head",
              partId: 1,
              partModelName: "head",
              modelPrefix: "pmh0_",
              modelResRef: "pmh0_head001",
              modelResRefPattern: "aurora-player-body-part",
              source: "utc.Appearance_Head",
              sourceKey: "modules/current/auctioneer.utc"
            }
          ])
        }
      };
      repository.findByKindAndId.mockResolvedValue(template);
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:20:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithBlob.processCreature({
        templateId: "cre_auctioneer",
        bypassCache: false,
        includeBenchmarkMetadata: true
      });

      expect(putModuleObject).toHaveBeenCalledWith(
        runtimeSettings.blobStorage,
        expect.objectContaining({
          fileName: "__aurora/sources/vanilla/textures/pmh0_head001.plt",
          resourceType: NWN_KEY_BIF_RESOURCE_TYPES.PLT,
          bytes: Buffer.from("PLT_HEAD", "utf-8")
        })
      );
      expect(result.creature.assetManifest?.assets.map((asset) => asset.fileName).sort()).toEqual([
        "auctioneer.utc",
        "pmh0.mdl",
        "pmh0_head001.mdl",
        "pmh0_head001.plt"
      ]);
      expect(
        result.creature.creatureRenderPackage?.textureBindings?.map((binding) => binding.reference)
      ).toContain("pmh0_head001");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("derives all raw CAPart creature part models before exposing delivery URLs", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const sourceModelBytesByKey = new Map<string, Buffer>([
      ["modules/current/models/pfh2.mdl", Buffer.from("skeleton mdl")],
      ["modules/current/models/pfh2_head022.mdl", Buffer.from("head mdl")],
      ["modules/current/models/pfh2_rfoot004.mdl", Buffer.from("rfoot mdl")],
      ["modules/current/models/pfh2_lfoot005.mdl", Buffer.from("lfoot mdl")],
      ["modules/current/models/wing_guard04.mdl", Buffer.from("wing mdl")],
      ["modules/current/models/tail_guard05.mdl", Buffer.from("tail mdl")]
    ]);
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-creature-raw-part-models",
      totalFiles: 6,
      totalBytes: 42,
      objects: [
        {
          key: "modules/current/models/pfh2.mdl",
          size: sourceModelBytesByKey.get("modules/current/models/pfh2.mdl")!.length,
          etag: "pfh2-mdl-hash"
        },
        {
          key: "modules/current/models/pfh2_head022.mdl",
          size: sourceModelBytesByKey.get("modules/current/models/pfh2_head022.mdl")!.length,
          etag: "head-mdl-hash"
        },
        {
          key: "modules/current/models/pfh2_rfoot004.mdl",
          size: sourceModelBytesByKey.get("modules/current/models/pfh2_rfoot004.mdl")!.length,
          etag: "rfoot-mdl-hash"
        },
        {
          key: "modules/current/models/pfh2_lfoot005.mdl",
          size: sourceModelBytesByKey.get("modules/current/models/pfh2_lfoot005.mdl")!.length,
          etag: "lfoot-mdl-hash"
        },
        {
          key: "modules/current/models/wing_guard04.mdl",
          size: sourceModelBytesByKey.get("modules/current/models/wing_guard04.mdl")!.length,
          etag: "wing-mdl-hash"
        },
        {
          key: "modules/current/models/tail_guard05.mdl",
          size: sourceModelBytesByKey.get("modules/current/models/tail_guard05.mdl")!.length,
          etag: "tail-mdl-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      const sourceBytes = sourceModelBytesByKey.get(key);
      if (sourceBytes) {
        return {
          key,
          size: sourceBytes.length,
          contentType: "application/octet-stream",
          etag: `${key}-etag`,
          bytes: sourceBytes
        };
      }
      return null;
    });
    derivedAssetGenerator.generateDerivedAssets.mockImplementation(async (input) => ({
      files: input.sourceFiles.map((file) => {
        const basename = file.fileName.split(/[\\/]/u).pop()!.replace(/\.(?:mdl|mdb)$/iu, "");
        const bytes = Buffer.from(`${basename} glb`);
        return {
          fileName: `__aurora/derived/models/${basename}.glb`,
          resourceType: 0,
          bytes
        };
      }),
      summary: {
        generator: "test-generator",
        generatedFiles: input.sourceFiles.length,
        generatedBytes: input.sourceFiles.reduce(
          (total, file) =>
            total +
            Buffer.from(
              `${file.fileName.split(/[\\/]/u).pop()!.replace(/\.(?:mdl|mdb)$/iu, "")} glb`
            ).length,
          0
        )
      }
    }));
    (moduleBlobStorage.putModuleObject as jest.Mock).mockImplementation(
      async (
        _settings: Parameters<NonNullable<ModuleBlobStoragePort["putModuleObject"]>>[0],
        file: Parameters<NonNullable<ModuleBlobStoragePort["putModuleObject"]>>[1]
      ) => {
        const fileName = file.fileName.split(/[\\/]/u).pop()!;
        return {
          key: `modules/current/__aurora/derived/models/${fileName}`,
          size: file.bytes.length,
          etag: `${fileName}-hash`
        };
      }
    );

    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_guard_human_001"),
      resref: "cre_guard_human_001",
      metadata: {
        ...buildTemplate("creature", "cre_guard_human_001").metadata,
        firstName: "City",
        lastName: "Guard",
        appearanceId: 17,
        appearanceLabelSource2daRow: 17,
        appearanceModelType: "P",
        appearanceRaceModel: "H",
        phenotype: 2,
        gender: 1,
        genderLabel: "Female",
        appearanceHead: 22,
        bodyPartRFoot: 4,
        bodyPartLFoot: 5,
        wingsNew: 4,
        tailNew: 5,
        partModelCandidates: JSON.stringify([
          {
            slot: "head",
            partId: 22,
            partModelName: "head",
            modelPrefix: "pfh2_",
            modelResRef: "pfh2_head022",
            modelResRefPattern: "aurora-player-body-part",
            source: "utc.Appearance_Head",
            sourceKey: "modules/current/blueprints/creatures/cre_guard_human_001.utc"
          },
          {
            slot: "rFoot",
            partId: 4,
            partModelName: "rfoot",
            nodeName: "rfoot_g",
            modelPrefix: "pfh2_",
            modelResRef: "pfh2_rfoot004",
            modelResRefPattern: "aurora-player-body-part",
            source: "capart.2da.MDLNAME",
            source2daRow: 0,
            sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
          },
          {
            slot: "lFoot",
            partId: 5,
            partModelName: "lfoot",
            nodeName: "lfoot_g",
            modelPrefix: "pfh2_",
            modelResRef: "pfh2_lfoot005",
            modelResRefPattern: "aurora-player-body-part",
            source: "capart.2da.MDLNAME",
            source2daRow: 1,
            sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
          },
          {
            slot: "wings",
            partId: 4,
            partModelName: "Guard_Wings",
            modelResRef: "wing_guard04",
            source: "wingmodel.2da.MODEL",
            source2daRow: 4,
            sourceKey: "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da"
          },
          {
            slot: "tail",
            partId: 5,
            partModelName: "Guard_Tail",
            modelResRef: "tail_guard05",
            source: "tailmodel.2da.MODEL",
            source2daRow: 5,
            sourceKey: "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da"
          }
        ])
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processCreature({
      templateId: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const generationInput = derivedAssetGenerator.generateDerivedAssets.mock.calls[0]?.[0];
    expect(generationInput?.sourceFiles).toHaveLength(6);
    expect(generationInput?.sourceFiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "modules/current/models/pfh2.mdl",
          bytes: sourceModelBytesByKey.get("modules/current/models/pfh2.mdl")
        }),
        expect.objectContaining({
          fileName: "modules/current/models/pfh2_head022.mdl",
          bytes: sourceModelBytesByKey.get("modules/current/models/pfh2_head022.mdl")
        }),
        expect.objectContaining({
          fileName: "modules/current/models/pfh2_rfoot004.mdl",
          bytes: sourceModelBytesByKey.get("modules/current/models/pfh2_rfoot004.mdl")
        }),
        expect.objectContaining({
          fileName: "modules/current/models/pfh2_lfoot005.mdl",
          bytes: sourceModelBytesByKey.get("modules/current/models/pfh2_lfoot005.mdl")
        }),
        expect.objectContaining({
          fileName: "modules/current/models/wing_guard04.mdl",
          bytes: sourceModelBytesByKey.get("modules/current/models/wing_guard04.mdl")
        }),
        expect.objectContaining({
          fileName: "modules/current/models/tail_guard05.mdl",
          bytes: sourceModelBytesByKey.get("modules/current/models/tail_guard05.mdl")
        })
      ])
    );
    expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledTimes(6);
    const renderPackage = result.creature.creatureRenderPackage;
    expect(renderPackage?.status).toBe("ready");
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "CREATURE_RENDER_BASE_SKELETON_MODEL_ASSETS_READY",
        "CREATURE_RENDER_CAPART_PART_MODEL_ASSETS_READY",
        "CREATURE_RENDER_PART_MODEL_GROUP_READY",
        "CREATURE_RENDER_SKINNED_GLB_ASSEMBLY_PENDING"
      ])
    );
    expect(renderPackage?.skeletonModelCandidates[0]).toMatchObject({
      resref: "pfh2",
      assetId: expect.any(String),
      glbUrl: expect.stringContaining(
        `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/`
      )
    });
    expect(
      renderPackage?.partModelCandidates.map((candidate) => ({
        slot: candidate.slot,
        modelResRef: candidate.modelResRef,
        glbUrlReady: Boolean(candidate.glbUrl)
      }))
    ).toEqual([
      { slot: "head", modelResRef: "pfh2_head022", glbUrlReady: true },
      { slot: "rFoot", modelResRef: "pfh2_rfoot004", glbUrlReady: true },
      { slot: "lFoot", modelResRef: "pfh2_lfoot005", glbUrlReady: true },
      { slot: "wings", modelResRef: "wing_guard04", glbUrlReady: true },
      { slot: "tail", modelResRef: "tail_guard05", glbUrlReady: true }
    ]);
    expect(result.creature.assetManifest?.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "pfh2.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "pfh2_head022.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "pfh2_rfoot004.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "pfh2_lfoot005.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "wing_guard04.glb",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "tail_guard05.glb",
          role: "model"
        })
      ])
    );
  });

  it("fetches missing CAPart creature source models on demand before derivation", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-creature-part-model-hak-"));
    const hakPath = join(tempRoot, "creature_parts.hak");
    const skeletonMdlBytes = Buffer.from("newmodel pfh2\n", "utf-8");
    const headMdlBytes = Buffer.from("newmodel pfh2_head022\n", "utf-8");
    const rfootMdlBytes = Buffer.from("newmodel pfh2_rfoot004\n", "utf-8");
    const lfootMdlBytes = Buffer.from("newmodel pfh2_lfoot005\n", "utf-8");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "pfh2",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.MDL,
          bytes: skeletonMdlBytes
        },
        {
          resref: "pfh2_head022",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.MDL,
          bytes: headMdlBytes
        },
        {
          resref: "pfh2_rfoot004",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.MDL,
          bytes: rfootMdlBytes
        },
        {
          resref: "pfh2_lfoot005",
          restype: NWN_KEY_BIF_RESOURCE_TYPES.MDL,
          bytes: lfootMdlBytes
        }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = false;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.creature = {
        includeModuleTemp0: true,
        includeModulePacked: false,
        includeHaks: true,
        includeVanilla: false,
        hakProfileId: "creature_parts",
        hakPriorityList: []
      };
      settings.hakProfiles.creature_parts = ["creature_parts.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const storedObjects = new Map<
        string,
        { bytes: Buffer; contentType: string; etag: string }
      >();
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
        generateDerivedAssets: jest.fn()
      };
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-creature-missing-part-models",
        totalFiles: 0,
        totalBytes: 0,
        objects: [],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
        const stored = storedObjects.get(key);
        return stored
          ? {
              key,
              size: stored.bytes.length,
              contentType: stored.contentType,
              etag: stored.etag,
              bytes: stored.bytes
            }
          : null;
      });
      putModuleObject.mockImplementation(async (_settings, file) => {
        const normalizedFileName = file.fileName.replace(/\\/gu, "/").replace(/^\/+/u, "");
        const key = `modules/current/${normalizedFileName}`;
        const bytes = Buffer.from(file.bytes);
        const etag = `etag-${storedObjects.size + 1}`;
        storedObjects.set(key, {
          bytes,
          contentType: "application/octet-stream",
          etag
        });
        return { key, size: bytes.length, etag };
      });
      derivedAssetGenerator.generateDerivedAssets.mockImplementation(async (input) => ({
        files: input.sourceFiles.map((file) => {
          const basename = file.fileName.split(/[\\/]/u).pop()!.replace(/\.(?:mdl|mdb)$/iu, "");
          const bytes = Buffer.from(`${basename} glb`);
          return {
            fileName: `__aurora/derived/models/${basename}.glb`,
            resourceType: 0,
            bytes
          };
        }),
        summary: {
          generator: "test-generator",
          generatedFiles: input.sourceFiles.length,
          generatedBytes: input.sourceFiles.length
        }
      }));

      const template: TemplateRecord = {
        ...buildTemplate("creature", "cre_guard_human_001"),
        resref: "cre_guard_human_001",
        metadata: {
          ...buildTemplate("creature", "cre_guard_human_001").metadata,
          firstName: "City",
          lastName: "Guard",
          appearanceId: 17,
          appearanceLabelSource2daRow: 17,
          appearanceModelType: "P",
          appearanceRaceModel: "H",
          phenotype: 2,
          gender: 1,
          genderLabel: "Female",
          appearanceHead: 22,
          bodyPartRFoot: 4,
          bodyPartLFoot: 5,
          partModelCandidates: JSON.stringify([
            {
              slot: "head",
              partId: 22,
              partModelName: "head",
              modelPrefix: "pfh2_",
              modelResRef: "pfh2_head022",
              modelResRefPattern: "aurora-player-body-part",
              source: "utc.Appearance_Head",
              sourceKey: "modules/current/blueprints/creatures/cre_guard_human_001.utc"
            },
            {
              slot: "rFoot",
              partId: 4,
              partModelName: "rfoot",
              nodeName: "rfoot_g",
              modelPrefix: "pfh2_",
              modelResRef: "pfh2_rfoot004",
              modelResRefPattern: "aurora-player-body-part",
              source: "capart.2da.MDLNAME",
              source2daRow: 0,
              sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
            },
            {
              slot: "lFoot",
              partId: 5,
              partModelName: "lfoot",
              nodeName: "lfoot_g",
              modelPrefix: "pfh2_",
              modelResRef: "pfh2_lfoot005",
              modelResRefPattern: "aurora-player-body-part",
              source: "capart.2da.MDLNAME",
              source2daRow: 1,
              sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
            }
          ])
        }
      };
      repository.findByKindAndId.mockResolvedValue(template);
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:20:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage,
        derivedAssetGenerator
      );

      const result = await serviceWithBlob.processCreature({
        templateId: "cre_guard_human_001",
        bypassCache: false,
        includeBenchmarkMetadata: true
      });

      expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledTimes(8);
      const generationInput = derivedAssetGenerator.generateDerivedAssets.mock.calls[0]?.[0];
      expect(generationInput?.sourceFiles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fileName:
              "modules/current/__aurora/sources/hak/creature_parts/pfh2.mdl",
            bytes: skeletonMdlBytes
          }),
          expect.objectContaining({
            fileName:
              "modules/current/__aurora/sources/hak/creature_parts/pfh2_head022.mdl",
            bytes: headMdlBytes
          }),
          expect.objectContaining({
            fileName:
              "modules/current/__aurora/sources/hak/creature_parts/pfh2_rfoot004.mdl",
            bytes: rfootMdlBytes
          }),
          expect.objectContaining({
            fileName:
              "modules/current/__aurora/sources/hak/creature_parts/pfh2_lfoot005.mdl",
            bytes: lfootMdlBytes
          })
        ])
      );
      expect(result.creature.assetManifest?.assets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            fileName: "pfh2.mdl",
            objectKey:
              "modules/current/__aurora/sources/hak/creature_parts/pfh2.mdl",
            role: "model"
          }),
          expect.objectContaining({
            fileName: "pfh2_head022.mdl",
            objectKey:
              "modules/current/__aurora/sources/hak/creature_parts/pfh2_head022.mdl",
            role: "model"
          }),
          expect.objectContaining({
            fileName: "pfh2_rfoot004.mdl",
            objectKey:
              "modules/current/__aurora/sources/hak/creature_parts/pfh2_rfoot004.mdl",
            role: "model"
          }),
          expect.objectContaining({
            fileName: "pfh2_lfoot005.mdl",
            objectKey:
              "modules/current/__aurora/sources/hak/creature_parts/pfh2_lfoot005.mdl",
            role: "model"
          }),
          expect.objectContaining({
            fileName: "pfh2.glb",
            role: "model"
          }),
          expect.objectContaining({
            fileName: "pfh2_head022.glb",
            role: "model"
          }),
          expect.objectContaining({
            fileName: "pfh2_rfoot004.glb",
            role: "model"
          }),
          expect.objectContaining({
            fileName: "pfh2_lfoot005.glb",
            role: "model"
          })
        ])
      );
      expect(result.creature.creatureRenderPackage?.skeletonModelCandidates[0]).toMatchObject({
        resref: "pfh2",
        assetId: expect.any(String),
        glbUrl: expect.stringContaining(
          `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/`
        )
      });
      expect(
        result.creature.creatureRenderPackage?.partModelCandidates.map((candidate) => ({
          slot: candidate.slot,
          modelResRef: candidate.modelResRef,
          glbUrlReady: Boolean(candidate.glbUrl)
        }))
      ).toEqual([
        { slot: "head", modelResRef: "pfh2_head022", glbUrlReady: true },
        { slot: "rFoot", modelResRef: "pfh2_rfoot004", glbUrlReady: true },
        { slot: "lFoot", modelResRef: "pfh2_lfoot005", glbUrlReady: true }
      ]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("deduplicates concurrent creature processing misses by cache key", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_guard_human_001"),
      resref: "cre_guard_human_001"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        key,
        value,
        storedAt: "2026-05-24T10:20:00.000Z",
        hits: 0
      };
    });

    const firstPromise = service.processCreature({
      templateId: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    const secondPromise = service.processCreature({
      templateId: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(first.cache.key).toBe(second.cache.key);
    expect(first.creature.templateId).toBe("cre_guard_human_001");
    expect(second.creature.templateId).toBe("cre_guard_human_001");
  });

  it("processes item into cached contract", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("item", "itm_health_potion_001"),
      resref: "itm_health_potion_001",
      metadata: {
        ...buildTemplate("item", "itm_health_potion_001").metadata,
        baseItem: 49,
        localizedName: "Health Potion",
        description: "Unknown potion",
        identifiedDescription: "Potion of Cure Moderate Wounds",
        charges: 1,
        stackSize: 10,
        identified: false
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:21:00.000Z",
      hits: 0
    }));

    const result = await service.processItem({
      templateId: "itm_health_potion_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(false);
    expect(result.item.kind).toBe("item");
    expect(result.item.render.frontendType).toBe("item");
    expect(result.item.itemRuntime).toBeDefined();
    expect(result.item.itemRuntime?.classification.baseItem).toBe(49);
    expect(result.item.itemRuntime?.identity.localizedName).toBe("Health Potion");
    expect(Array.isArray(result.item.itemValidationIssues)).toBe(true);
  });

  it("processItem refreshes cached potion runtime to use the Aurora default model", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("item", "itm_nw_it_mpotion002"),
      resref: "nw_it_mpotion002",
      metadata: {
        ...buildTemplate("item", "itm_nw_it_mpotion002").metadata,
        baseItem: 49,
        baseItemModelType: "it_potion",
        baseItemDefaultModel: "it_potion_000",
        baseItemDefaultIcon: "iit_potion",
        modelPart1: 41,
        modelPart2: 13,
        modelPart3: 33
      }
    };
    const staleCachedItem: TemplateProcessingResult = {
      templateId: "itm_nw_it_mpotion002",
      kind: "item",
      resref: "nw_it_mpotion002",
      name: "Potion",
      category: "test",
      benchmarkCandidate: false,
      metadata: template.metadata,
      render: {
        backendType: "item",
        frontendType: "item",
        rendererPreset: "item-standard"
      },
      assetManifest: {
        ...buildEmptyManifest(),
        moduleHash: "stale-icon-only",
        assetCount: 1,
        assets: [
          {
            assetId: "stale-icon",
            role: "texture",
            fileName: "iit_potion.tga",
            objectKey: "modules/current/__aurora/sources/vanilla/textures/iit_potion.tga",
            extension: "tga",
            contentType: "image/x-tga",
            sizeBytes: 32,
            etag: "stale-icon"
          }
        ]
      },
      itemRuntime: {
        source: {},
        identity: {},
        classification: {
          baseItem: 49,
          defaultIcon: "iit_potion"
        },
        visual: {
          baseItemModelType: "it_potion",
          baseItemDefaultModel: "it_potion_000",
          modelPart1: 41,
          modelPart2: 13,
          modelPart3: 33,
          modelParts: [41, 13, 33],
          modelPartRoles: ["blade", "middle", "top"],
          modelPartResRefs: ["it_potion_b_041", "it_potion_m_013", "it_potion_t_033"],
          modelPartResRefRoles: ["blade", "middle", "top"],
          cloakHiddenSlots: [],
          armorRobeHiddenSlots: [],
          armorPartModelCandidates: [],
          armorParts: {},
          materialColors: {}
        },
        pricing: {},
        state: {},
        palette: {},
        itemProperties: [],
        scripts: {}
      },
      itemValidationIssues: [],
      processedAt: "2026-07-06T18:55:00.000Z"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue({
      key: "cached-potion",
      value: staleCachedItem,
      storedAt: "2026-07-06T18:55:00.000Z",
      hits: 4
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-07-06T19:20:00.000Z",
      hits: 0
    }));

    const result = await service.processItem({
      templateId: "itm_nw_it_mpotion002",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(true);
    expect(result.item.itemRuntime?.visual).toMatchObject({
      baseItemModelType: "it_potion",
      baseItemDefaultModel: "it_potion_000",
      modelParts: [41, 13, 33],
      modelPartResRefs: ["it_potion_000"],
      modelPartResRefRoles: ["default"]
    });
    expect(result.item.metadata).toMatchObject({
      modelPartResRef1: "it_potion_000",
      modelPartResRefRole1: "default",
      itemModelRefs: "it_potion_000"
    });
    expect(placeableCache.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        itemRuntime: expect.objectContaining({
          visual: expect.objectContaining({
            modelPartResRefs: ["it_potion_000"]
          })
        })
      })
    );
  });

  it("processItem applies visual overrides to model and armor part candidates", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("item", "itm_cnr_b_dagger"),
      resref: "cnr_b_dagger",
      metadata: {
        ...buildTemplate("item", "itm_cnr_b_dagger").metadata,
        baseItem: 22,
        baseItemModelType: "WSwDg",
        modelPart1: 11,
        modelPart2: 13,
        modelPart3: 63,
        bodyPartTorso: 43,
        bodyPartRHand: 3,
        leather1Color: 2,
        metal2Color: 9
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-06-29T10:21:00.000Z",
      hits: 0
    }));

    const baseResult = await service.processItem({
      templateId: "itm_cnr_b_dagger",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    const variantResult = await service.processItem({
      templateId: "itm_cnr_b_dagger",
      bypassCache: false,
      includeBenchmarkMetadata: true,
      itemVisualOverride: {
        modelPart1: 12,
        armorParts: {
          torso: 0,
          rHand: 4
        },
        materialColors: {
          leather1: 7,
          metal2: 21
        }
      }
    });

    expect(variantResult.cache.key).not.toBe(baseResult.cache.key);
    expect(variantResult.item.metadata).toMatchObject({
      modelPart1: 12,
      bodyPartTorso: 0,
      bodyPartRHand: 4,
      leather1Color: 7,
      metal2Color: 21
    });
    expect(variantResult.item.itemRuntime?.visual).toMatchObject({
      modelPart1: 12,
      modelPart2: 13,
      modelPart3: 63,
      modelParts: [12, 13, 63],
      modelPartResRefs: ["wswdg_b_012", "wswdg_m_013", "wswdg_t_063"],
      armorParts: {
        torso: 0,
        rHand: 4
      },
      materialColors: {
        leather1: 7,
        metal2: 21
      }
    });
    expect(
      variantResult.item.itemRuntime?.visual.armorPartModelCandidates.map((candidate) => ({
        slot: candidate.slot,
        partId: candidate.partId,
        modelResRef: candidate.modelResRef
      }))
    ).toEqual([
      {
        slot: "rHand",
        partId: 4,
        modelResRef: "pmh0_handr004"
      }
    ]);
  });

  it("processItem prioritizes item HAK assets for single-piece shields", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    const settings = buildRuntimeSettingsRecord();
    settings.hakProfiles = {
      lc_items: ["bdhd_items.hak"],
      lc_creatures: ["creature_wrong.hak"]
    };
    settings.sources.item = {
      includeModuleTemp0: false,
      includeModulePacked: false,
      includeHaks: true,
      includeVanilla: false,
      hakProfileId: "lc_items",
      hakPriorityList: []
    };
    settings.sources.creature = {
      includeModuleTemp0: false,
      includeModulePacked: false,
      includeHaks: true,
      includeVanilla: false,
      hakProfileId: "lc_creatures",
      hakPriorityList: []
    };
    runtimeSettingsRepository.get.mockResolvedValue(settings);
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-item-shield",
      totalFiles: 2,
      totalBytes: 24,
      objects: [
        {
          key: "modules/current/__aurora/sources/hak/creature_wrong/ashto_095.glb",
          size: 12,
          etag: "creature-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/bdhd_items/ashto_095.glb",
          size: 12,
          etag: "item-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);
    const serviceWithItems = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const template: TemplateRecord = {
      ...buildTemplate("item", "itm_tower_shield"),
      resref: "tower_shield",
      metadata: {
        ...buildTemplate("item", "itm_tower_shield").metadata,
        baseItem: 57,
        baseItemModelType: "AShTo",
        modelPart1: 95
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-06-30T10:21:00.000Z",
      hits: 0
    }));

    const result = await serviceWithItems.processItem({
      templateId: "itm_tower_shield",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.item.itemRuntime?.visual.modelPartResRefs).toEqual(["ashto_095"]);
    expect(result.item.assetManifest?.assets[0]).toMatchObject({
      fileName: "ashto_095.glb",
      objectKey: "modules/current/__aurora/sources/hak/bdhd_items/ashto_095.glb"
    });
  });

  it("processItem includes sibling model part fallbacks for missing multipart item pieces", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    const settings = buildRuntimeSettingsRecord();
    settings.hakProfiles = {
      lc_items: ["lc_items.hak"]
    };
    settings.sources.item = {
      includeModuleTemp0: false,
      includeModulePacked: false,
      includeHaks: true,
      includeVanilla: false,
      hakProfileId: "lc_items",
      hakPriorityList: []
    };
    runtimeSettingsRepository.get.mockResolvedValue(settings);
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-item-sickle-fallback",
      totalFiles: 3,
      totalBytes: 36,
      objects: [
        {
          key: "modules/current/__aurora/sources/hak/lc_items/wspsc_b_011.glb",
          size: 12,
          etag: "blade-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_items/wspsc_m_011.glb",
          size: 12,
          etag: "middle-fallback-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_items/wspsc_t_011.glb",
          size: 12,
          etag: "top-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);
    const serviceWithItems = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const template: TemplateRecord = {
      ...buildTemplate("item", "itm_test_sierp"),
      resref: "test_sierp",
      metadata: {
        ...buildTemplate("item", "itm_test_sierp").metadata,
        baseItem: 60,
        baseItemModelType: "WSpSc",
        modelPart1: 11,
        modelPart2: 10,
        modelPart3: 11
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-07-01T10:21:00.000Z",
      hits: 0
    }));

    const result = await serviceWithItems.processItem({
      templateId: "itm_test_sierp",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.item.itemRuntime?.visual.modelPartResRefs).toEqual([
      "wspsc_b_011",
      "wspsc_m_010",
      "wspsc_t_011"
    ]);
    expect(result.item.assetManifest?.assets.map((asset) => asset.fileName).sort()).toEqual([
      "wspsc_b_011.glb",
      "wspsc_m_011.glb",
      "wspsc_t_011.glb"
    ]);
  });

  it("processes encounter into cached contract", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("encounter", "enc_forest_ambush_001"),
      resref: "enc_forest_ambush_001",
      metadata: {
        ...buildTemplate("encounter", "enc_forest_ambush_001").metadata,
        templateResRef: "enc_forest_ambush_001",
        localizedName: "Forest Ambush",
        active: true,
        difficulty: 2,
        difficultyIndex: 1,
        factionId: 5,
        maxCreatures: 6,
        recCreatures: 3,
        playerOnly: true,
        reset: true,
        resetTime: 120,
        respawns: 2,
        spawnOption: 1,
        encounterCreatureListEntries: JSON.stringify([
          {
            resRef: "nw_wolf001",
            appearance: 11,
            challengeRating: 1.5,
            singleSpawn: false
          }
        ]),
        "script.onentered": "enc_enter"
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:22:00.000Z",
      hits: 0
    }));

    const result = await service.processEncounter({
      templateId: "enc_forest_ambush_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(false);
    expect(result.encounter.kind).toBe("encounter");
    expect(result.encounter.render.frontendType).toBe("encounter");
    expect(result.encounter.encounterRuntime).toBeDefined();
    expect(result.encounter.encounterRuntime?.identity.localizedName).toBe("Forest Ambush");
    expect(result.encounter.encounterRuntime?.settings.maxCreatures).toBe(6);
    expect(result.encounter.encounterRuntime?.creatureList?.[0]?.resRef).toBe("nw_wolf001");
    expect(Array.isArray(result.encounter.encounterValidationIssues)).toBe(true);
  });

  it("returns creature/item/encounter processed cache entries", async () => {
    placeableCache.get
      .mockResolvedValueOnce({
        key: "c".repeat(64),
        storedAt: "2026-05-24T10:22:00.000Z",
        hits: 2,
        value: {
          templateId: "cre_guard_human_001",
          kind: "creature",
          resref: "cre_guard_human_001",
          name: "guard",
          category: "npc",
          benchmarkCandidate: false,
          metadata: {},
          render: {
            backendType: "creature",
            frontendType: "creature",
            rendererPreset: "creature-standard"
          },
          processedAt: "2026-05-24T10:20:00.000Z"
        }
      })
      .mockResolvedValueOnce({
        key: "d".repeat(64),
        storedAt: "2026-05-24T10:23:00.000Z",
        hits: 1,
        value: {
          templateId: "itm_health_potion_001",
          kind: "item",
          resref: "itm_health_potion_001",
          name: "potion",
          category: "consumable",
          benchmarkCandidate: false,
          metadata: {},
          render: {
            backendType: "item",
            frontendType: "item",
            rendererPreset: "item-standard"
          },
          processedAt: "2026-05-24T10:21:00.000Z"
        }
      })
      .mockResolvedValueOnce({
        key: "g".repeat(64),
        storedAt: "2026-05-24T10:24:00.000Z",
        hits: 1,
        value: {
          templateId: "enc_forest_ambush_001",
          kind: "encounter",
          resref: "enc_forest_ambush_001",
          name: "encounter",
          category: "encounter",
          benchmarkCandidate: false,
          metadata: {
            templateResRef: "enc_forest_ambush_001",
            encounterCreatureListEntries: JSON.stringify([{ resRef: "nw_wolf001" }]),
            "script.onentered": "enc_enter"
          },
          render: {
            backendType: "encounter",
            frontendType: "encounter",
            rendererPreset: "encounter-standard"
          },
          processedAt: "2026-05-24T10:22:00.000Z"
        }
      });

    const creature = await service.getProcessedCreature("c".repeat(64));
    const item = await service.getProcessedItem("d".repeat(64));
    const encounter = await service.getProcessedEncounter("g".repeat(64));

    expect(creature.creature.templateId).toBe("cre_guard_human_001");
    expect(creature.creature.creatureRuntime).toBeDefined();
    expect(creature.creature.creatureValidationIssues).toBeDefined();
    expect(item.item.templateId).toBe("itm_health_potion_001");
    expect(item.item.itemRuntime).toBeDefined();
    expect(item.item.itemValidationIssues).toBeDefined();
    expect(encounter.encounter.templateId).toBe("enc_forest_ambush_001");
    expect(encounter.encounter.encounterRuntime).toBeDefined();
    expect(encounter.encounter.encounterValidationIssues).toBeDefined();
  });

  it("throws creature/item/encounter cache not found errors", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(service.getProcessedCreature("e".repeat(64))).rejects.toMatchObject({
      code: "CREATURE_CACHE_NOT_FOUND"
    });
    await expect(service.getProcessedItem("f".repeat(64))).rejects.toMatchObject({
      code: "ITEM_CACHE_NOT_FOUND"
    });
    await expect(service.getProcessedEncounter("g".repeat(64))).rejects.toMatchObject({
      code: "ENCOUNTER_CACHE_NOT_FOUND"
    });
  });

  it("runs benchmark and returns deterministic metrics envelope", async () => {
    repository.listByKind.mockResolvedValue({
      items: [
        {
          ...buildTemplate("placeable", "plc_bench_001"),
          resref: "plc_bench_001",
          placeableSubtype: "generic",
          benchmarkCandidate: true
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });

    const processSpy = jest
      .spyOn(service, "processPlaceable")
      .mockResolvedValue({
        cache: {
          key: "c".repeat(64),
          hit: false,
          storedAt: "2026-05-24T10:15:00.000Z",
          hits: 0
        },
        placeable: {
          templateId: "plc_bench_001",
          resref: "plc_bench_001",
          name: "Bench",
          category: "benchmark",
          placeableSubtype: "generic",
          render: {
            backendType: "generic",
            frontendType: "placeable",
            rendererPreset: "placeable-generic",
            isDoor: false,
            isVfx: false
          },
          benchmarkCandidate: true,
          metadata: { sample: true },
          assetManifest: buildEmptyManifest(),
          classification: {
            source: "template",
            normalizedSubtype: "generic",
            mismatchWithTemplate: false
          },
          processedAt: "2026-05-24T10:14:00.000Z"
        }
      });

    const result = await service.benchmarkPlaceables({
      iterations: 3,
      warmupIterations: 1,
      bypassCache: true
    });

    expect(result.datasetFingerprint).toHaveLength(64);
    expect(result.metrics.perCandidate).toHaveLength(1);
    expect(result.metrics.overall.p95Ms).toBeGreaterThanOrEqual(0);
    expect(processSpy).toHaveBeenCalled();
  });

  it("benchmark invokes processPlaceable exact warmup and iteration counts with expected flags", async () => {
    repository.listByKind.mockResolvedValue({
      items: [
        {
          ...buildTemplate("placeable", "plc_bench_002"),
          resref: "plc_bench_002",
          placeableSubtype: "vfx",
          benchmarkCandidate: true
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });

    const processSpy = jest.spyOn(service, "processPlaceable").mockResolvedValue({
      cache: {
        key: "c".repeat(64),
        hit: false,
        storedAt: "2026-05-24T10:15:00.000Z",
        hits: 0
      },
      placeable: {
        templateId: "plc_bench_002",
        resref: "plc_bench_002",
        name: "Bench",
        category: "benchmark",
        placeableSubtype: "vfx",
        render: {
          backendType: "vfx",
          frontendType: "vfx",
          rendererPreset: "vfx-emitter",
          isDoor: false,
          isVfx: true
        },
        benchmarkCandidate: true,
        metadata: { sample: true },
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "vfx",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:14:00.000Z"
      }
    });

    await service.benchmarkPlaceables({
      iterations: 4,
      warmupIterations: 2,
      bypassCache: false
    });

    expect(processSpy).toHaveBeenCalledTimes(6);
    const [warmupCallA, warmupCallB, runCall1] = processSpy.mock.calls;
    expect(warmupCallA[0]).toMatchObject({
      templateId: "plc_bench_002",
      subtypeHint: "vfx",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    expect(warmupCallB[0]).toMatchObject({
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    expect(runCall1[0]).toMatchObject({
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
  });

  it("benchmark validation fails for unknown template ids and empty benchmark configuration", async () => {
    repository.findByKindAndId.mockResolvedValue(null);
    await expect(
      service.benchmarkPlaceables({
        templateIds: ["missing-id"],
        iterations: 1,
        warmupIterations: 0,
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Benchmark payload references unknown placeable template ids."
    });

    repository.findByKindAndId.mockResolvedValue(null);
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 200,
      offset: 0
    });
    await expect(
      service.benchmarkPlaceables({
        iterations: 1,
        warmupIterations: 0,
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "No benchmark placeables are configured."
    });
  });

  it("throws TEMPLATE_NOT_FOUND from processPlaceable when neither template id nor resref resolves", async () => {
    repository.findByKindAndId.mockResolvedValue(null);
    repository.findByKindAndResref.mockResolvedValue(null);

    await expect(
      service.processPlaceable({
        templateId: "missing_placeable",
        resref: "missing_resref",
        bypassCache: true,
        includeBenchmarkMetadata: true
      })
    ).rejects.toMatchObject({
      code: "TEMPLATE_NOT_FOUND",
      message: "placeable template was not found."
    });
  });

  it("throws PLACEABLE_CACHE_NOT_FOUND when getProcessedPlaceableAsset cache key is missing", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(
      service.getProcessedPlaceableAsset("a".repeat(64), "asset-id")
    ).rejects.toMatchObject({
      code: "PLACEABLE_CACHE_NOT_FOUND",
      message: "Placeable cache entry was not found."
    });
  });

  it("returns processCreature cache hit when bypassCache=false and cache exists", async () => {
    repository.findByKindAndId.mockResolvedValue(buildTemplate("creature", "cre_cached_001"));
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 6,
      value: {
        templateId: "cre_cached_001",
        kind: "creature",
        resref: "cre_cached_001",
        name: "cached creature",
        category: "npc",
        benchmarkCandidate: false,
        metadata: {},
        render: {
          backendType: "creature",
          frontendType: "creature",
          rendererPreset: "creature-standard"
        },
        creatureRuntime: {
          source: {},
          identity: {},
          appearance: {},
          bodyParts: {},
          colors: {},
          partModelCandidates: [],
          faction: {},
          stats: {},
          lists: {},
          scripts: {}
        },
        creatureRenderPackage: {
          status: "missing_profile",
          rendererPreset: "creature-standard",
          diagnostics: [],
          sourceModelCandidates: [],
          partModelCandidates: [],
          bodyParts: {},
          colors: {}
        },
        creatureValidationIssues: [],
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const result = await service.processCreature({
      templateId: "cre_cached_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(6);
    expect(result.creature.templateId).toBe("cre_cached_001");
    expect(placeableCache.set).not.toHaveBeenCalled();
  });

  it("processCreature bypassCache=true skips cache read and writes fresh payload", async () => {
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("creature", "cre_uncached_001"),
      benchmarkCandidate: undefined
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:31:00.000Z",
      hits: 0
    }));

    const result = await service.processCreature({
      templateId: "cre_uncached_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(placeableCache.get).not.toHaveBeenCalled();
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(result.cache.hit).toBe(false);
    expect(result.creature.benchmarkCandidate).toBe(false);
  });

  it("resolves creature processing by resref", async () => {
    repository.findByKindAndResref.mockResolvedValue({
      ...buildTemplate("creature", "cre_resref_001"),
      resref: "cre_guard_human_001"
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const result = await service.processCreature({
      resref: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(repository.findByKindAndResref).toHaveBeenCalledWith(
      "creature",
      "cre_guard_human_001"
    );
    expect(result.creature.templateId).toBe("cre_resref_001");
  });

  it("processCreature synthesizes an Area GIT creature when the catalog UTC is missing", async () => {
    repository.findByKindAndId.mockResolvedValue(null);
    repository.findByKindAndResref.mockResolvedValue(null);
    repository.resolveCreatureAppearanceProfile = jest.fn().mockResolvedValue({
      appearanceType: 6403,
      appearanceLabel: "Alligator* (Project Q)",
      appearanceSource2daRow: 6403,
      appearanceSourceKey: "runtime-source/hak/lc_2da/appearance.2da",
      modelType: "S",
      raceModel: "qc_alligator",
      portrait2da: "po_Deer",
      bloodColor: "R",
      sizeCategory: 3
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-06-30T12:00:00.000Z",
      hits: 0
    }));

    const result = await service.processCreature({
      templateId: "cre_alligator_hatchl",
      resref: "alligator_hatchl",
      creatureMetadata: {
        templateResRef: "alligator_hatchl",
        tag: "alligator_hatchling",
        firstName: "Alligator Hatchling",
        appearanceId: 6403,
        race: 9,
        hitPoints: 1
      },
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(repository.findByKindAndId).toHaveBeenCalledWith(
      "creature",
      "cre_alligator_hatchl"
    );
    expect(repository.findByKindAndResref).toHaveBeenCalledWith(
      "creature",
      "alligator_hatchl"
    );
    expect(result.creature).toMatchObject({
      templateId: "cre_alligator_hatchl",
      resref: "alligator_hatchl",
      name: "Alligator Hatchling",
      category: "Area GIT Creatures",
      benchmarkBucket: "area-git-instance",
      metadata: expect.objectContaining({
        areaInstanceTemplateSource: "git",
        areaInstanceTemplateSynthesized: true,
        templateResRef: "alligator_hatchl",
        tag: "alligator_hatchling",
        appearanceId: 6403,
        appearanceLabel: "Alligator* (Project Q)",
        appearanceRaceModel: "qc_alligator",
        race: 9
      })
    });
    expect(result.creature.creatureRuntime).toMatchObject({
      appearance: {
        appearanceType: 6403,
        appearanceRaceModel: "qc_alligator"
      }
    });
    expect(result.creature.creatureRenderPackage?.appearanceProfile).toMatchObject({
      appearanceType: 6403,
      raceModel: "qc_alligator"
    });
  });

  it("throws TEMPLATE_NOT_FOUND for processCreature when both id and resref are missing", async () => {
    repository.findByKindAndId.mockResolvedValue(null);
    repository.findByKindAndResref.mockResolvedValue(null);

    await expect(
      service.processCreature({
        templateId: "missing_creature",
        resref: "missing_creature_resref",
        bypassCache: true,
        includeBenchmarkMetadata: true
      })
    ).rejects.toMatchObject({
      code: "TEMPLATE_NOT_FOUND",
      message: "creature template was not found."
    });
  });

  it("throws creature cache not-found with explicit message", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(service.getProcessedCreature("f".repeat(64))).rejects.toMatchObject({
      code: "CREATURE_CACHE_NOT_FOUND",
      message: "creature cache entry was not found."
    });
  });

  it("benchmark with empty templateIds uses benchmark list query", async () => {
    repository.listByKind.mockResolvedValue({
      items: [
        {
          ...buildTemplate("placeable", "plc_bench_010"),
          resref: "plc_bench_010",
          placeableSubtype: "generic",
          benchmarkCandidate: true
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });
    jest.spyOn(service, "processPlaceable").mockResolvedValue({
      cache: {
        key: "f".repeat(64),
        hit: false,
        storedAt: "2026-05-24T10:15:00.000Z",
        hits: 0
      },
      placeable: {
        templateId: "plc_bench_010",
        resref: "plc_bench_010",
        name: "Bench",
        category: "benchmark",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "placeable-generic",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: true,
        metadata: {},
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:14:00.000Z"
      }
    });

    await service.benchmarkPlaceables({
      templateIds: [],
      iterations: 1,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      benchmark: true,
      limit: 200,
      offset: 0
    });
  });

  it("benchmark computes elapsed milliseconds from hrtime deltas", async () => {
    repository.listByKind.mockResolvedValue({
      items: [
        {
          ...buildTemplate("placeable", "plc_bench_011"),
          resref: "plc_bench_011",
          placeableSubtype: "generic",
          benchmarkCandidate: true
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });
    jest.spyOn(service, "processPlaceable").mockResolvedValue({
      cache: {
        key: "f".repeat(64),
        hit: false,
        storedAt: "2026-05-24T10:15:00.000Z",
        hits: 0
      },
      placeable: {
        templateId: "plc_bench_011",
        resref: "plc_bench_011",
        name: "Bench",
        category: "benchmark",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "placeable-generic",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: true,
        metadata: {},
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:14:00.000Z"
      }
    });
    const hrtimeSpy = jest
      .spyOn(process.hrtime, "bigint")
      .mockReturnValueOnce(1_000_000_000n)
      .mockReturnValueOnce(1_001_000_000n)
      .mockReturnValueOnce(2_000_000_000n)
      .mockReturnValueOnce(2_001_000_000n);

    const result = await service.benchmarkPlaceables({
      iterations: 2,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(result.metrics.overall.minMs).toBe(1);
    expect(result.metrics.overall.maxMs).toBe(1);
    hrtimeSpy.mockRestore();
  });

  it("hydrates missing legacy placeable manifest from module snapshot", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue({
      ...buildRuntimeSettingsRecord(),
      revision: 7
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-hydrate",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/models/plc_city_gate.mdl",
          size: 12,
          etag: "e1"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      } as unknown as ReturnType<typeof buildTemplate> & { placeableSubtype: "door" }
    });

    const result = await serviceWithBlob.getProcessedPlaceable("f".repeat(64));

    expect(result.placeable.assetManifest.version).toBe("placeable-asset-manifest/v1");
    expect(result.placeable.assetManifest.assetCount).toBe(1);
    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
  });

  it("returns empty non-truncated snapshot when module blob storage is unavailable", async () => {
    const summary = await (
      service as unknown as {
        listAllModuleSnapshotObjects: (
          settings: ReturnType<typeof buildRuntimeSettingsRecord>["blobStorage"]
        ) => Promise<{ totalFiles: number; totalBytes: number; truncated: boolean }>;
      }
    ).listAllModuleSnapshotObjects(buildRuntimeSettingsRecord().blobStorage);

    expect(summary.totalFiles).toBe(0);
    expect(summary.totalBytes).toBe(0);
    expect(summary.truncated).toBe(false);
  });

  it("refreshes module snapshot index after ttl and when snapshot identity changes", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue({
      ...buildRuntimeSettingsRecord(),
      revision: 8
    });
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-a",
        totalFiles: 1,
        totalBytes: 12,
        objects: [
          {
            key: "modules/current/models/plc_city_gate.mdl",
            size: 12,
            etag: "ea"
          }
        ],
        truncated: false,
        continuationToken: undefined
      })
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-b",
        totalFiles: 2,
        totalBytes: 20,
        objects: [
          {
            key: "modules/current/models/plc_city_gate.mdl",
            size: 12,
            etag: "ea"
          },
          {
            key: "modules/current/textures/plc_city_gate.dds",
            size: 8,
            etag: "eb"
          }
        ],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ candidatesScanned: number }> }
    ).getModuleSnapshotIndex();
    fakeNow = 301_000;
    const secondIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ candidatesScanned: number }> }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(firstIndex?.candidatesScanned).toBe(1);
    expect(secondIndex?.candidatesScanned).toBe(2);
    expect(secondIndex).not.toBe(firstIndex);
  });

  it("reuses module snapshot index within ttl and refreshes exactly at 5 minute boundary", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-a",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/a.mdl", size: 1, etag: "e1" }],
        truncated: false,
        continuationToken: undefined
      })
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-b",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/b.mdl", size: 1, etag: "e2" }],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    fakeNow = 299_500;
    const reusedIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    fakeNow = 301_000;
    const refreshedIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(reusedIndex).toBe(firstIndex);
    expect(refreshedIndex).not.toBe(firstIndex);
    expect(refreshedIndex?.moduleHash).toBe("hash-b");
  });

  it("refreshes module snapshot index when only module hash changes", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-a",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/shared.mdl", size: 1, etag: "e1" }],
        truncated: false,
        continuationToken: undefined
      })
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-b",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/changed.mdl", size: 1, etag: "e2" }],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    fakeNow = 301_000;
    const secondIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(secondIndex).not.toBe(firstIndex);
    expect(firstIndex?.moduleHash).toBe("hash-a");
    expect(secondIndex?.moduleHash).toBe("hash-b");
  });

  it("refreshes module snapshot index when bucket/prefix identity changes", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get
      .mockResolvedValueOnce({
        ...buildRuntimeSettingsRecord(),
        blobStorage: {
          ...buildRuntimeSettingsRecord().blobStorage,
          bucket: "ab",
          modulePrefix: "c"
        }
      })
      .mockResolvedValueOnce({
        ...buildRuntimeSettingsRecord(),
        blobStorage: {
          ...buildRuntimeSettingsRecord().blobStorage,
          bucket: "a",
          modulePrefix: "bc"
        }
      });
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "ab",
        prefix: "c/",
        moduleHash: "h",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "c/first.mdl", size: 1, etag: "e1" }],
        truncated: false,
        continuationToken: undefined
      })
      .mockResolvedValueOnce({
        bucket: "a",
        prefix: "bc/",
        moduleHash: "h",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "bc/second.mdl", size: 1, etag: "e2" }],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as {
        getModuleSnapshotIndex: () => Promise<{ byBasename: Map<string, unknown> }>;
      }
    ).getModuleSnapshotIndex();
    fakeNow = 301_000;
    const secondIndex = await (
      serviceWithBlob as unknown as {
        getModuleSnapshotIndex: () => Promise<{ byBasename: Map<string, unknown> }>;
      }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(secondIndex).not.toBe(firstIndex);
    expect(secondIndex?.byBasename.has("second")).toBe(true);
  });

  it("treats undefined moduleHash differently than empty moduleHash when caching snapshot index", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: undefined,
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/hashless_a.mdl", size: 1, etag: "e1" }],
        truncated: false,
        continuationToken: undefined
      })
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/hashless_b.mdl", size: 1, etag: "e2" }],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as {
        getModuleSnapshotIndex: () => Promise<{ byBasename: Map<string, unknown>; moduleHash?: string }>;
      }
    ).getModuleSnapshotIndex();
    fakeNow = 301_000;
    const secondIndex = await (
      serviceWithBlob as unknown as {
        getModuleSnapshotIndex: () => Promise<{ byBasename: Map<string, unknown>; moduleHash?: string }>;
      }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(secondIndex).not.toBe(firstIndex);
    expect(firstIndex?.moduleHash).toBeUndefined();
    expect(secondIndex?.moduleHash).toBe("");
    expect(secondIndex?.byBasename.has("hashless_b")).toBe(true);
  });

  it("skips module hash probing in test mode when cached placeable already has manifest", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    const appConfig = { isTest: true } as unknown as AppConfigService;
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      } as unknown as ReturnType<typeof buildTemplate> & { placeableSubtype: "door" }
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      appConfig,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    await serviceWithBlob.getProcessedPlaceable("f".repeat(64));

    expect(moduleBlobStorage.listModuleSnapshot).not.toHaveBeenCalled();
  });

  it("refreshes cached ready placeable manifest when derived GLB references recoverable textures", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const derivedKey = "modules/current/__aurora/derived/models/plc_cached_texture.glb";
    const textureKey = "modules/current/textures/tx_recovered.dds";
    const derivedBytes = buildGlbWithTextureReferences(["tx_recovered"]);
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-texture-recovery",
        totalFiles: 2,
        totalBytes: derivedBytes.length + 8,
        objects: [
          { key: derivedKey, size: derivedBytes.length, etag: "glb-etag" },
          { key: textureKey, size: 8, etag: "texture-etag" }
        ],
        truncated: false,
        continuationToken: undefined
      }),
      getModuleObject: jest.fn().mockImplementation(async (_settings, key) => {
        if (key !== derivedKey) {
          return null;
        }
        return {
          key,
          size: derivedBytes.length,
          contentType: "model/gltf-binary",
          bytes: derivedBytes
        };
      })
    };
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_cached_texture",
        resref: "plc_cached_texture",
        name: "Cached Texture",
        category: "urban",
        placeableSubtype: "generic",
        render: {
          backendType: "placeable",
          frontendType: "placeable",
          rendererPreset: "placeable-standard",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: {},
        assetManifest: {
          ...buildEmptyManifest(),
          moduleHash: "hash-texture-recovery",
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "asset-derived",
              role: "model",
              fileName: "plc_cached_texture.glb",
              objectKey: derivedKey,
              extension: "glb",
              sizeBytes: derivedBytes.length,
              contentType: "model/gltf-binary"
            }
          ]
        },
        renderPackage: {
          status: "ready",
          diagnostics: [],
          assetRefs: {
            derivedModelAssetIds: ["asset-derived"]
          },
          glbUrl: `/api/v1/catalog/placeables/cache/${"f".repeat(64)}/assets/asset-derived.glb`
        } satisfies PlaceableRenderPackage,
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      } as unknown as ReturnType<typeof buildTemplate> & { placeableSubtype: "generic" }
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:11:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.getProcessedPlaceable("f".repeat(64));

    const textureAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "tx_recovered.dds"
    );
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(result.placeable.renderPackage?.textureUrls).toEqual([
      `/api/v1/catalog/placeables/cache/${"f".repeat(64)}/assets/${textureAsset!.assetId}.dds`
    ]);
    expect(textureAsset).toMatchObject({
      role: "texture",
      fileName: "tx_recovered.dds",
      objectKey: textureKey
    });
  });

  it("adds missing texture diagnostics for embedded NWN2 source texture references without assets", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const derivedKey = "modules/current/__aurora/derived/models/nw2winecrate5.glb";
    const sourceKey =
      "modules/current/__aurora/sources/hak/cep3_core0/models/nw2winecrate5.mdl";
    const derivedBytes = buildGlbWithTextureReferences([]);
    const sourceBytes = Buffer.from(
      "\0nw2_mc_winecrate01\0plc_mc_winecrate05\0",
      "latin1"
    );
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-missing-nwn2-textures",
        totalFiles: 2,
        totalBytes: derivedBytes.length + sourceBytes.length,
        objects: [
          { key: derivedKey, size: derivedBytes.length, etag: "glb-etag" },
          { key: sourceKey, size: sourceBytes.length, etag: "mdl-etag" }
        ],
        truncated: false,
        continuationToken: undefined
      }),
      getModuleObject: jest.fn().mockImplementation(async (_settings, key) => {
        if (key === derivedKey) {
          return {
            key,
            size: derivedBytes.length,
            contentType: "model/gltf-binary",
            bytes: derivedBytes
          };
        }
        if (key === sourceKey) {
          return {
            key,
            size: sourceBytes.length,
            contentType: "application/octet-stream",
            bytes: sourceBytes
          };
        }
        return null;
      })
    };
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_zep_cask001"),
      resref: "zep_cask001",
      metadata: {
        lookupModelResRef: "nw2winecrate5"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_zep_cask001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    const missingTextureDiagnostic = result.placeable.renderPackage?.diagnostics.find(
      (diagnostic) => diagnostic.code === "PLACEABLE_RENDER_TEXTURES_MISSING"
    );

    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(result.placeable.renderPackage?.textureUrls).toBeUndefined();
    expect(missingTextureDiagnostic?.message).toEqual(
      expect.stringContaining("nw2_mc_winecrate01")
    );
    expect(missingTextureDiagnostic?.message).toEqual(
      expect.stringContaining("plc_mc_winecrate05")
    );
  });

  it("uses a lightweight module hash probe when validating cached placeable manifests", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current",
        moduleHash: undefined,
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/plc_city_gate.mdl", size: 1 }],
        truncated: false
      }),
      getModuleObject: jest.fn()
    };
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: {
          ...buildEmptyManifest(),
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "asset001",
              role: "model",
              fileName: "plc_city_gate.mdl",
              objectKey: "modules/current/models/plc_city_gate.mdl",
              extension: "mdl",
              sizeBytes: 1,
              contentType: "application/octet-stream"
            }
          ]
        },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      } as unknown as ReturnType<typeof buildTemplate> & { placeableSubtype: "door" }
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    await serviceWithBlob.getProcessedPlaceable("f".repeat(64));

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current"
      }),
      { limit: 1 }
    );
  });

  it("caches failed module hash probes to avoid repeated snapshot listing on consecutive reads", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockRejectedValue(new Error("blob_timeout"));
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      } as unknown as ReturnType<typeof buildTemplate> & { placeableSubtype: "door" }
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    await serviceWithBlob.getProcessedPlaceable("f".repeat(64));
    await serviceWithBlob.getProcessedPlaceable("f".repeat(64));

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
  });

  it("reuses previous index object when cache key is unchanged after ttl refresh", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "stable-hash",
      totalFiles: 1,
      totalBytes: 1,
      objects: [{ key: "modules/current/models/stable.mdl", size: 1, etag: "e-stable" }],
      truncated: false,
      continuationToken: undefined
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<object> }
    ).getModuleSnapshotIndex();
    fakeNow = 301_000;
    const secondIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<object> }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(secondIndex).toBe(firstIndex);
  });
});

function buildGlbWithTextureReferences(textureReferences: string[]): Buffer {
  return buildGlbFromJson({
      asset: { version: "2.0", generator: "catalog-test" },
      extras: {
        aurora: {
          textureReferences
        }
      }
    });
}

function buildGlbWithConverterVersion(converterVersion: string): Buffer {
  return buildGlbFromJson({
    asset: {
      version: "2.0",
      generator: `aurora-web aurora-mdl-to-glb ${converterVersion}`
    },
    extras: {
      aurora: {
        sourceModel: "n_bear",
        converterVersion
      }
    }
  });
}

function buildGlbFromJson(value: unknown): Buffer {
  const json = Buffer.from(JSON.stringify(value), "utf-8");
  const jsonPadding = (4 - (json.length % 4)) % 4;
  const paddedJson = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
  const bytes = Buffer.alloc(20 + paddedJson.length);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(paddedJson.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  paddedJson.copy(bytes, 20);
  return bytes;
}

function buildHakV10File(
  entries: Array<{ resref: string; restype: number; bytes: Buffer }>
): Buffer {
  const header = Buffer.alloc(160);
  const keyListOffset = 160;
  const keyEntrySize = 24;
  const resourceListOffset = keyListOffset + entries.length * keyEntrySize;
  const resourceListEntrySize = 8;
  const resourceDataOffsetStart =
    resourceListOffset + entries.length * resourceListEntrySize;

  header.write("HAK ", 0, 4, "ascii");
  header.write("V1.0", 4, 4, "ascii");
  header.writeUInt32LE(0, 8);
  header.writeUInt32LE(0, 12);
  header.writeUInt32LE(entries.length, 16);
  header.writeUInt32LE(0, 20);
  header.writeUInt32LE(keyListOffset, 24);
  header.writeUInt32LE(resourceListOffset, 28);

  const keyTable = Buffer.alloc(entries.length * keyEntrySize);
  const resourceTable = Buffer.alloc(entries.length * resourceListEntrySize);
  const payloadBuffers: Buffer[] = [];
  let currentOffset = resourceDataOffsetStart;

  entries.forEach((entry, index) => {
    const keyOffset = index * keyEntrySize;
    const resrefBytes = Buffer.from(entry.resref.toLowerCase(), "ascii");
    resrefBytes.copy(keyTable, keyOffset, 0, Math.min(resrefBytes.length, 16));
    keyTable.writeUInt32LE(index, keyOffset + 16);
    keyTable.writeUInt16LE(entry.restype, keyOffset + 20);
    keyTable.writeUInt16LE(0, keyOffset + 22);

    const resourceOffset = index * resourceListEntrySize;
    resourceTable.writeUInt32LE(currentOffset, resourceOffset);
    resourceTable.writeUInt32LE(entry.bytes.length, resourceOffset + 4);
    payloadBuffers.push(entry.bytes);
    currentOffset += entry.bytes.length;
  });

  return Buffer.concat([header, keyTable, resourceTable, ...payloadBuffers]);
}

function buildNwnRawDxtTextureBytes(input: {
  width: number;
  height: number;
  encoding: 3 | 4;
}): Buffer {
  const blockByteLength = input.encoding === 3 ? 8 : 16;
  const mip0ByteLength =
    Math.max(1, Math.ceil(input.width / 4)) *
    Math.max(1, Math.ceil(input.height / 4)) *
    blockByteLength;
  const header = Buffer.alloc(20);
  header.writeUInt32LE(input.width, 0);
  header.writeUInt32LE(input.height, 4);
  header.writeUInt32LE(input.encoding, 8);
  header.writeUInt32LE(mip0ByteLength, 12);
  header.writeFloatLE(1, 16);
  return Buffer.concat([header, Buffer.alloc(mip0ByteLength, 0xff)]);
}

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

function buildTemplate(kind: TemplateRecord["kind"], id: string): TemplateRecord {
  return {
    templateId: id,
    kind,
    placeableSubtype: kind === "placeable" ? "generic" : undefined,
    resref: `${kind}_resref`,
    name: `${kind} template`,
    category: "test",
    tags: ["tag"],
    previewImageUrl: `/preview/${kind}/${id}.webp`,
    metadata: {
      sample: true
    }
  };
}

function buildEmptyManifest() {
  return {
    version: "placeable-asset-manifest/v1" as const,
    source: "module-blob-snapshot" as const,
    generatedAt: "2026-05-24T10:00:00.000Z",
    moduleHash: undefined,
    assetCount: 0,
    candidatesScanned: 0,
    assets: []
  };
}

function buildRuntimeSettingsRecord(): RuntimeSettingsRecord {
  return {
    revision: 1,
    updatedAt: "2026-05-24T08:00:00.000Z",
    updatedBy: "admin.user",
    paths: {
      vanillaDataPath: "C:/nwn/data",
      hakDirectoryPath: "C:/nwn/hak",
      moduleDecompiledPath: "C:/nwn/temp0",
      modulePackedPath: "C:/nwn/module.mod",
      tlkBasePath: "C:/nwn/dialog.tlk",
      tlkCustomPath: ""
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
    telemetryDebugMode: "off" as const,
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
      },
      vfx: {
        includeModuleTemp0: true,
        includeModulePacked: false,
        includeHaks: false,
        includeVanilla: false,
        hakProfileId: "",
        hakPriorityList: []
      },
      item: {
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
        resref: "c_wingsmeph",
        metrics: { triangles: 659, meshes: 16, emitters: 0 },
        context: { source: "scene.json" }
      },
      placeableHeavyVfx: {
        resref: "ad_top_lion_1",
        metrics: { triangles: 798, meshes: 28, emitters: 1 },
        context: { source: "scene.json" }
      },
      placeableVfxPlcAlternative: {
        resref: "plc_x02",
        metrics: { triangles: 112, meshes: 5, emitters: 3 },
        context: { source: "scene.json" }
      },
      doorHeavyInstance: {
        resref: "tn_sdoor_14",
        metrics: { triangles: 250, meshes: 10, emitters: 0 },
        context: { source: "scene.json" }
      },
      doorHeavySingleMesh: {
        resref: "tn_gdoor_05",
        metrics: { triangles: 190, meshes: 6, emitters: 0, maxSingleMeshTriangles: 102 },
        context: { source: "scene.json" }
      }
    }
  };
}

function buildItemPaletteTestTlkBuffer(entries: Record<number, string>): Buffer {
  const entryIndexes = Object.keys(entries)
    .map((key) => Number.parseInt(key, 10))
    .filter((value) => Number.isInteger(value) && value >= 0);
  const stringCount = Math.max(0, ...entryIndexes) + 1;
  const headerSize = 20;
  const entrySize = 40;
  const stringDataOffset = headerSize + stringCount * entrySize;
  const table = Buffer.alloc(stringCount * entrySize);
  const chunks: Buffer[] = [];
  let currentOffset = 0;

  for (const index of entryIndexes) {
    const text = entries[index];
    if (!text) {
      continue;
    }
    const encoded = Buffer.from(text, "latin1");
    const entryOffset = index * entrySize;
    table.writeUInt32LE(currentOffset, entryOffset + 28);
    table.writeUInt32LE(encoded.length, entryOffset + 32);
    chunks.push(encoded);
    currentOffset += encoded.length;
  }

  const header = Buffer.alloc(headerSize);
  header.write("TLK V3.0", 0, "ascii");
  header.writeUInt32LE(0, 8);
  header.writeUInt32LE(stringCount, 12);
  header.writeUInt32LE(stringDataOffset, 16);

  return Buffer.concat([header, table, ...chunks]);
}

function buildEmitterOnlyBinaryMdl(
  textureName: string,
  options: {
    emitterType?: string;
    renderMode?: string;
    blendMode?: string;
    xGridRaw?: number;
    yGridRaw?: number;
    fps?: number;
    frameStart?: number;
    frameEnd?: number;
    spawnType?: number;
    twoSidedTexture?: boolean;
    loop?: boolean;
    renderOrder?: number;
    random?: boolean;
    isTinted?: boolean;
    splat?: boolean;
    chunkName?: string;
    controllerRows?: number;
    simulation?: {
      xSize?: number;
      ySize?: number;
      birthrate?: number;
      birthrateKeyframes?: Array<[number, number]>;
      lifeExp?: number;
      mass?: number;
      velocity?: number;
      randvel?: number;
      spread?: number;
      particleRot?: number;
      bounce?: boolean;
      bounceCoefficient?: number;
      blurLength?: number;
      deadspace?: number;
      p2p?: boolean;
      p2pBezier?: boolean;
      p2pBezier2?: number;
      p2pBezier3?: number;
      combineTime?: number;
      grav?: number;
      drag?: number;
      threshold?: number;
      inherit?: boolean;
      inheritVel?: boolean;
      inheritLocal?: boolean;
      inheritPart?: boolean;
      affectedByWind?: boolean;
      sizeStart?: number;
      sizeStartKeyframes?: Array<[number, number]>;
      sizeMid?: number;
      sizeEnd?: number;
      sizeStartY?: number;
      sizeMidY?: number;
      sizeEndY?: number;
      alphaStart?: number;
      alphaStartKeyframes?: Array<[number, number]>;
      alphaMid?: number;
      alphaEnd?: number;
      colorStart?: [number, number, number];
      colorStartKeyframes?: Array<[number, number, number, number]>;
      colorMid?: [number, number, number];
      colorMidKeyframes?: Array<[number, number, number, number]>;
      colorEnd?: [number, number, number];
      colorEndKeyframes?: Array<[number, number, number, number]>;
      percentStart?: number;
      percentStartKeyframes?: Array<[number, number]>;
      percentMid?: number;
      percentMidKeyframes?: Array<[number, number]>;
      percentEnd?: number;
      percentEndKeyframes?: Array<[number, number]>;
    };
    transform?: {
      position?: [number, number, number];
      orientationQuaternion?: [number, number, number, number];
    };
    animations?: Array<{
      name: string;
      lengthSeconds?: number;
      transitionSeconds?: number;
      birthrateValues?: number[];
      alphaEndValues?: number[];
    }>;
  } = {}
): Buffer {
  const modelDataSize = options.animations && options.animations.length > 0 ? 7200 : 1800;
  const bytes = Buffer.alloc(12 + modelDataSize);
  const rootNodeOffset = 232;
  const rootAbsOffset = 12 + rootNodeOffset;

  bytes.writeUInt32LE(0, 0);
  bytes.writeUInt32LE(modelDataSize, 4);
  bytes.writeUInt32LE(0, 8);
  writeCString(bytes, 20, 64, "vfx_source_model");
  bytes.writeUInt32LE(rootNodeOffset, 84);

  writeCString(bytes, rootAbsOffset + 32, 32, "emit_smoke");
  bytes.writeUInt32LE(0x0004, rootAbsOffset + 108);
  if (typeof options.xGridRaw === "number") {
    bytes.writeUInt32LE(options.xGridRaw, rootAbsOffset + 0x7c);
  }
  if (typeof options.yGridRaw === "number") {
    bytes.writeUInt32LE(options.yGridRaw, rootAbsOffset + 0x80);
  }
  if (typeof options.spawnType === "number") {
    bytes.writeUInt32LE(options.spawnType, rootAbsOffset + 0x84);
  }
  if (options.emitterType) {
    writeCString(bytes, rootAbsOffset + 0x88, 64, options.emitterType);
  }
  if (options.renderMode) {
    writeCString(bytes, rootAbsOffset + 0xa8, 64, options.renderMode);
  }
  if (options.blendMode) {
    writeCString(bytes, rootAbsOffset + 0xc8, 64, options.blendMode);
  }
  if (options.chunkName) {
    writeCString(bytes, rootAbsOffset + 0x128, 0x10, options.chunkName);
  }
  if (typeof options.simulation?.deadspace === "number") {
    bytes.writeFloatLE(options.simulation.deadspace, rootAbsOffset + 0x70);
  }
  let emitterFlags = options.random ? 0x20 : 0;
  if (options.simulation?.p2p) {
    emitterFlags |= 0x1;
  }
  if (options.simulation?.p2pBezier) {
    emitterFlags |= 0x2;
  }
  if (options.simulation?.affectedByWind) {
    emitterFlags |= 0x4;
  }
  if (options.isTinted) {
    emitterFlags |= 0x8;
  }
  if (options.simulation?.bounce) {
    emitterFlags |= 0x10;
  }
  if (options.simulation?.inherit) {
    emitterFlags |= 0x40;
  }
  if (options.simulation?.inheritVel) {
    emitterFlags |= 0x80;
  }
  if (options.simulation?.inheritLocal) {
    emitterFlags |= 0x100;
  }
  if (options.splat) {
    emitterFlags |= 0x200;
  }
  if (options.simulation?.inheritPart) {
    emitterFlags |= 0x400;
  }
  if (emitterFlags !== 0) {
    bytes.writeUInt32LE(emitterFlags, rootAbsOffset + 0x144);
  }
  if (typeof options.twoSidedTexture === "boolean") {
    bytes.writeUInt32LE(options.twoSidedTexture ? 1 : 0, rootAbsOffset + 0x138);
  }
  if (typeof options.loop === "boolean") {
    bytes.writeUInt32LE(options.loop ? 1 : 0, rootAbsOffset + 0x13c);
  }
  if (typeof options.renderOrder === "number") {
    bytes.writeInt16LE(options.renderOrder, rootAbsOffset + 0x140);
  }
  writeCString(bytes, rootAbsOffset + 232, 64, textureName);

  const controllerKeysOffset = 620;
  const controllerDataOffset = 1120;
  let controllerCount = 0;
  let dataCount = 0;
  const controllerRows = Math.max(1, Math.trunc(options.controllerRows ?? 1));
  const writeControllerRows = (
    type: number,
    rows: number[][],
    hasExplicitTimes = false
  ): void => {
    const keyTimes = rows.map((row, index) =>
      hasExplicitTimes
        ? row[0]!
        : rows.length > 1
          ? index / (rows.length - 1)
          : 0
    );
    const valueRows = rows.map((row) => (hasExplicitTimes ? row.slice(1) : row));
    const columns = valueRows[0]?.length ?? 0;
    if (
      rows.length === 0 ||
      columns === 0 ||
      valueRows.some((row) => row.length !== columns)
    ) {
      return;
    }
    const keyAbsOffset = 12 + controllerKeysOffset + controllerCount * 12;
    bytes.writeUInt32LE(type, keyAbsOffset);
    bytes.writeUInt16LE(rows.length, keyAbsOffset + 4);
    bytes.writeUInt16LE(dataCount, keyAbsOffset + 6);
    keyTimes.forEach((time, row) => {
      bytes.writeFloatLE(time, 12 + controllerDataOffset + (dataCount + row) * 4);
    });
    dataCount += rows.length;
    bytes.writeUInt16LE(dataCount, keyAbsOffset + 8);
    bytes.writeUInt8(columns, keyAbsOffset + 10);
    valueRows.forEach((rowValues, row) => {
      rowValues.forEach((value, index) => {
        bytes.writeFloatLE(
          value,
          12 + controllerDataOffset + (dataCount + row * columns + index) * 4
        );
      });
    });
    controllerCount += 1;
    dataCount += columns * rows.length;
  };
  const writeController = (type: number, values: number[]): void => {
    if (values.length === 0) {
      return;
    }
    writeControllerRows(
      type,
      Array.from({ length: controllerRows }, () => [...values])
    );
  };
  const writeNumberController = (type: number, value: number | undefined): void => {
    if (typeof value === "number") {
      writeController(type, [value]);
    }
  };
  const simulation = options.simulation;
  writeNumberController(128, options.fps);
  writeNumberController(136, options.frameStart);
  writeNumberController(132, options.frameEnd);
  if (simulation?.colorStartKeyframes) {
    writeControllerRows(108, simulation.colorStartKeyframes, true);
  } else if (simulation?.colorStart) {
    writeController(108, simulation.colorStart);
  }
  if (simulation?.colorMidKeyframes) {
    writeControllerRows(472, simulation.colorMidKeyframes, true);
  } else if (simulation?.colorMid) {
    writeController(472, simulation.colorMid);
  }
  if (simulation?.colorEndKeyframes) {
    writeControllerRows(96, simulation.colorEndKeyframes, true);
  } else if (simulation?.colorEnd) {
    writeController(96, simulation.colorEnd);
  }
  if (simulation?.alphaStartKeyframes) {
    writeControllerRows(84, simulation.alphaStartKeyframes, true);
  } else {
    writeNumberController(84, simulation?.alphaStart);
  }
  writeNumberController(468, simulation?.alphaMid);
  writeNumberController(80, simulation?.alphaEnd);
  writeNumberController(196, simulation?.xSize);
  writeNumberController(200, simulation?.ySize);
  if (simulation?.birthrateKeyframes) {
    writeControllerRows(88, simulation.birthrateKeyframes, true);
  } else {
    writeNumberController(88, simulation?.birthrate);
  }
  writeNumberController(144, simulation?.lifeExp);
  writeNumberController(148, simulation?.mass);
  writeNumberController(192, simulation?.velocity);
  writeNumberController(164, simulation?.randvel);
  writeNumberController(184, simulation?.spread);
  writeNumberController(160, simulation?.particleRot);
  writeNumberController(92, simulation?.bounceCoefficient);
  writeNumberController(204, simulation?.blurLength);
  writeNumberController(152, simulation?.p2pBezier2);
  writeNumberController(156, simulation?.p2pBezier3);
  writeNumberController(120, simulation?.combineTime);
  writeNumberController(140, simulation?.grav);
  writeNumberController(124, simulation?.drag);
  writeNumberController(188, simulation?.threshold);
  if (simulation?.sizeStartKeyframes) {
    writeControllerRows(168, simulation.sizeStartKeyframes, true);
  } else {
    writeNumberController(168, simulation?.sizeStart);
  }
  if (simulation?.percentStartKeyframes) {
    writeControllerRows(484, simulation.percentStartKeyframes, true);
  } else {
    writeNumberController(484, simulation?.percentStart);
  }
  if (simulation?.percentMidKeyframes) {
    writeControllerRows(485, simulation.percentMidKeyframes, true);
  } else {
    writeNumberController(485, simulation?.percentMid);
  }
  if (simulation?.percentEndKeyframes) {
    writeControllerRows(486, simulation.percentEndKeyframes, true);
  } else {
    writeNumberController(486, simulation?.percentEnd);
  }
  writeNumberController(488, simulation?.sizeMid);
  writeNumberController(172, simulation?.sizeEnd);
  writeNumberController(176, simulation?.sizeStartY);
  writeNumberController(492, simulation?.sizeMidY);
  writeNumberController(180, simulation?.sizeEndY);
  if (options.transform?.position) {
    writeController(8, options.transform.position);
  }
  if (options.transform?.orientationQuaternion) {
    writeController(20, options.transform.orientationQuaternion);
  }

  if (controllerCount > 0 && dataCount > 0) {
    bytes.writeUInt32LE(controllerKeysOffset, rootAbsOffset + 84);
    bytes.writeUInt32LE(controllerCount, rootAbsOffset + 88);
    bytes.writeUInt32LE(controllerDataOffset, rootAbsOffset + 96);
    bytes.writeUInt32LE(dataCount, rootAbsOffset + 100);
  }

  if (options.animations && options.animations.length > 0) {
    const animationArrayOffset = 1800;
    const animationBlockStartOffset = 1840;
    const animationBlockSize = 900;
    bytes.writeUInt32LE(animationArrayOffset, 12 + 120);
    bytes.writeUInt32LE(options.animations.length, 12 + 124);

    options.animations.forEach((animation, index) => {
      const animationOffset = animationBlockStartOffset + index * animationBlockSize;
      const animationAbsOffset = 12 + animationOffset;
      const animationNodeOffset = animationOffset + 300;
      const animationNodeAbsOffset = 12 + animationNodeOffset;
      const animationControllerKeysOffset = animationNodeOffset + 360;
      const animationControllerDataOffset = animationControllerKeysOffset + 160;
      let animationControllerCount = 0;
      let animationDataCount = 0;

      bytes.writeUInt32LE(animationOffset, 12 + animationArrayOffset + index * 4);
      writeCString(bytes, animationAbsOffset + 8, 64, animation.name);
      bytes.writeUInt32LE(animationNodeOffset, animationAbsOffset + 72);
      bytes.writeUInt32LE(11, animationAbsOffset + 76);
      bytes.writeFloatLE(animation.lengthSeconds ?? 2, animationAbsOffset + 0x70);
      bytes.writeFloatLE(animation.transitionSeconds ?? 0, animationAbsOffset + 0x74);
      writeCString(bytes, animationAbsOffset + 0x78, 64, "emit_smoke");

      writeCString(bytes, animationNodeAbsOffset + 32, 32, "emit_smoke");
      bytes.writeUInt32LE(0x0004, animationNodeAbsOffset + 108);

      const writeAnimationControllerRows = (type: number, values: number[]): void => {
        if (values.length === 0) {
          return;
        }
        const duration = animation.lengthSeconds ?? 2;
        const keyTimes = values.map((_, valueIndex) =>
          values.length > 1 ? (duration * valueIndex) / (values.length - 1) : 0
        );
        const keyAbsOffset =
          12 + animationControllerKeysOffset + animationControllerCount * 12;
        bytes.writeUInt32LE(type, keyAbsOffset);
        bytes.writeUInt16LE(values.length, keyAbsOffset + 4);
        bytes.writeUInt16LE(animationDataCount, keyAbsOffset + 6);
        keyTimes.forEach((time, valueIndex) => {
          bytes.writeFloatLE(
            time,
            12 + animationControllerDataOffset + (animationDataCount + valueIndex) * 4
          );
        });
        animationDataCount += values.length;
        bytes.writeUInt16LE(animationDataCount, keyAbsOffset + 8);
        bytes.writeUInt8(1, keyAbsOffset + 10);
        values.forEach((value, valueIndex) => {
          bytes.writeFloatLE(
            value,
            12 + animationControllerDataOffset + (animationDataCount + valueIndex) * 4
          );
        });
        animationControllerCount += 1;
        animationDataCount += values.length;
      };
      const writeAnimationScalarController = (type: number, values?: number[]): void => {
        if (!values || values.length === 0) {
          return;
        }
        writeAnimationControllerRows(type, values);
      };

      writeAnimationScalarController(88, animation.birthrateValues);
      writeAnimationScalarController(80, animation.alphaEndValues);

      if (animationControllerCount > 0 && animationDataCount > 0) {
        bytes.writeUInt32LE(animationControllerKeysOffset, animationNodeAbsOffset + 84);
        bytes.writeUInt32LE(animationControllerCount, animationNodeAbsOffset + 88);
        bytes.writeUInt32LE(animationControllerDataOffset, animationNodeAbsOffset + 96);
        bytes.writeUInt32LE(animationDataCount, animationNodeAbsOffset + 100);
      }
    });
  }

  return bytes;
}

function writeCString(buffer: Buffer, offset: number, length: number, value: string): void {
  buffer.write(value, offset, Math.max(0, Math.min(length - 1, Buffer.byteLength(value))), "ascii");
}
