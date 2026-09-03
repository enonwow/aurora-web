import { createHash } from "node:crypto";
import { AreaUpdateCompilerFailure } from "../../src/modules/areas/application/area-update-candidate.compiler";
import { AreaUpdateValidationApplicationService } from "../../src/modules/areas/application/area-update-validation.application.service";
import { updateModuleIfoStartLocation } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  AreaTileProductionAdmissionSourceError,
} from "../../src/modules/areas/application/ports/area-tile-production-admission.port";

const MODULE_ID = "workspace:module-01";
const MODULE_REVISION = "revision-17";
const DRAFT_HASH = "d".repeat(64);
const SOURCE_HASH = "a".repeat(64);
const SET_HASH = "e".repeat(64);

function admittedTileProduction() {
  return Object.freeze({
    allowed: true as const,
    code: "AREA_TILE_PRODUCTION_ADMITTED" as const,
    tilesetResRef: "tms01",
    tileIds: Object.freeze([2, 7]),
    diagnostics: Object.freeze([]) as readonly [],
    admission: Object.freeze({
      schemaVersion: "area-tile-production-admission.v1" as const,
      policyVersion: "area-tile-production-admission-policy.v1" as const,
      reportGeneratedAtIso: "2026-08-21T18:00:00.000Z",
      planId: "plan-01",
      corpusHash: "c".repeat(64),
      profileId: "source-bound-v7",
      ledgerSha256: "1".repeat(64),
      reportSha256: "2".repeat(64),
      tilesetResRef: "tms01",
      uniqueTileIdCount: 2,
      tileIdSetSha256: "3".repeat(64),
    }),
  });
}

function command() {
  return {
    schemaVersion: "area-update-validation.v1",
    moduleId: MODULE_ID,
    areaResRef: "crypt01",
    expectedModuleRevision: MODULE_REVISION,
    draft: { id: "draft_01", revision: 7, normalizedSha256: DRAFT_HASH },
    clientCommandId: "client-command-01",
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function compiledCandidate() {
  const are = Buffer.from("compiled-are");
  const git = Buffer.from("compiled-git-with-waypoint");
  const gic = Buffer.from("compiled-gic-with-waypoint-comment");
  const ifo = Buffer.from("preserved-module-ifo");
  const counts = Object.freeze({
    creature: 0,
    door: 0,
    encounter: 0,
    item: 0,
    placeable: 0,
    sound: 0,
    store: 0,
    trigger: 0,
    waypoint: 1,
  });
  const emptyCounts = Object.freeze({ ...counts, waypoint: 0 });
  return Object.freeze({
    areaId: "crypt01",
    sourceAreaSha256: SOURCE_HASH,
    candidateAreaSha256: sha256(are),
    setFingerprintSha256: SET_HASH,
    projectedDraft: Object.freeze({
      areaResRef: "crypt01",
      name: "Crypt",
      width: 3,
      height: 1,
      tilesetResRef: "tms01",
      tilesetFingerprint: SET_HASH,
      areaFingerprint: SOURCE_HASH,
      tiles: Object.freeze([
        Object.freeze({ row: 0, col: 0, tileId: 7, orientation: 0, height: 0 }),
        Object.freeze({ row: 0, col: 1, tileId: 2, orientation: 0, height: 0 }),
        Object.freeze({ row: 0, col: 2, tileId: 7, orientation: 0, height: 0 }),
      ]),
    }),
    objectMutation: Object.freeze({
      sourceGitSha256: "1".repeat(64),
      sourceGicSha256: "2".repeat(64),
      candidateGitSha256: sha256(git),
      candidateGicSha256: sha256(gic),
      sourceCounts: emptyCounts,
      candidateCounts: counts,
      deletedCounts: emptyCounts,
      transformedCounts: emptyCounts,
      addedCounts: counts,
      totalDeleted: 0,
      totalTransformed: 0,
      totalAdded: 1,
      blueprintSources: Object.freeze([
        Object.freeze({
          sourceProfileId: "nwn-base-key-utw-v1",
          templateResRef: "nw_waypoint001",
          sourceSha256: "13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a",
          addedCount: 1,
        }),
      ]),
    }),
    resources: Object.freeze([
      resource("are", 2012, are),
      resource("git", 2023, git),
      resource("gic", 2046, gic),
    ]),
    moduleIfo: Object.freeze({
      key: "module.ifo",
      fileName: "module.ifo",
      resourceType: 2014,
      baselineBytes: Buffer.from(ifo),
      baselineSha256: sha256(ifo),
      candidateBytes: Buffer.from(ifo),
      candidateSha256: sha256(ifo),
    }),
  });
}

function compiledCandidateWithStartLocationMutation() {
  const base = compiledCandidate();
  const expectedValue = Object.freeze({
    areaResRef: "crypt01",
    x: Math.fround(1),
    y: Math.fround(2),
    z: Math.fround(3),
    directionX: Math.fround(0),
    directionY: Math.fround(1),
  });
  const value = Object.freeze({
    ...expectedValue,
    x: Math.fround(12.5),
    y: Math.fround(-4.25),
  });
  const baselineBytes = buildGffBuffer([
    { label: "Mod_Entry_Area", type: "resref", value: expectedValue.areaResRef },
    { label: "Mod_Entry_X", type: "float", value: expectedValue.x },
    { label: "Mod_Entry_Y", type: "float", value: expectedValue.y },
    { label: "Mod_Entry_Z", type: "float", value: expectedValue.z },
    { label: "Mod_Entry_Dir_X", type: "float", value: expectedValue.directionX },
    { label: "Mod_Entry_Dir_Y", type: "float", value: expectedValue.directionY },
    {
      label: "Mod_Area_list",
      type: "list",
      value: [{
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref", value: "crypt01" }],
      }],
    },
  ], "IFO ", 0);
  const candidateBytes = updateModuleIfoStartLocation(
    baselineBytes,
    { expectedValue, value },
  ).bytes;
  return Object.freeze({
    ...base,
    projectedDraft: Object.freeze({
      ...base.projectedDraft,
      moduleStartLocation: Object.freeze({ expectedValue, value }),
    }),
    moduleStartLocationMutation: Object.freeze({
      expectedValue,
      value,
      sourceIfoSha256: sha256(baselineBytes),
      candidateIfoSha256: sha256(candidateBytes),
    }),
    moduleIfo: Object.freeze({
      ...base.moduleIfo,
      baselineBytes,
      baselineSha256: sha256(baselineBytes),
      candidateBytes,
      candidateSha256: sha256(candidateBytes),
    }),
  });
}

function compiledCandidateWithAudioEnvironmentMutation() {
  const base = compiledCandidate();
  const expectedValue = Object.freeze({
    ambientSoundDayId: 41,
    ambientSoundNightId: 42,
    ambientSoundDayVolume: 101,
    ambientSoundNightVolume: 102,
    environmentAudioId: 7,
    musicBattleId: 13,
    musicDayId: 11,
    musicNightId: 12,
    musicDelayMilliseconds: 3000,
  });
  const value = Object.freeze({
    ...expectedValue,
    ambientSoundNightVolume: 77,
    musicDelayMilliseconds: -4000,
  });
  const git = buildGffBuffer([{
    label: "AreaProperties",
    type: "struct",
    value: {
      typeId: 100,
      fields: [
        { label: "AmbientSndDay", type: "int", value: value.ambientSoundDayId },
        { label: "AmbientSndNight", type: "int", value: value.ambientSoundNightId },
        { label: "AmbientSndDayVol", type: "int", value: value.ambientSoundDayVolume },
        { label: "AmbientSndNitVol", type: "int", value: value.ambientSoundNightVolume },
        { label: "EnvAudio", type: "int", value: value.environmentAudioId },
        { label: "MusicBattle", type: "int", value: value.musicBattleId },
        { label: "MusicDay", type: "int", value: value.musicDayId },
        { label: "MusicNight", type: "int", value: value.musicNightId },
        { label: "MusicDelay", type: "int", value: value.musicDelayMilliseconds },
      ],
    },
  }], "GIT ", 0xffff_ffff);
  const resources = Object.freeze([
    base.resources[0]!,
    resource("git", 2023, git),
    base.resources[2]!,
  ]);
  return Object.freeze({
    ...base,
    projectedDraft: Object.freeze({
      ...base.projectedDraft,
      audioEnvironment: Object.freeze({
        expectedValue,
        value,
        sourceGitSha256: "1".repeat(64),
      }),
    }),
    objectMutation: Object.freeze({
      ...base.objectMutation,
      candidateGitSha256: sha256(git),
    }),
    audioEnvironmentMutation: Object.freeze({
      expectedValue,
      value,
      sourceGitSha256: "1".repeat(64),
      candidateGitSha256: sha256(git),
    }),
    resources,
  });
}

function compiledCandidateWithVariableMutation() {
  const base = compiledCandidate();
  const expectedEntries = Object.freeze([
    Object.freeze({ sourceIndex: 0, name: "COUNT", type: "int" as const, value: 3 }),
    Object.freeze({ sourceIndex: 1, name: "TEXT", type: "string" as const, value: "old" }),
  ]);
  const entries = Object.freeze([
    Object.freeze({ name: "TEXT", type: "string" as const, value: "updated" }),
    Object.freeze({ name: "COUNT", type: "int" as const, value: 7 }),
  ]);
  const git = variableGit(entries);
  return Object.freeze({
    ...base,
    projectedDraft: Object.freeze({
      ...base.projectedDraft,
      variables: Object.freeze({
        expectedEntries,
        entries,
        sourceGitSha256: "1".repeat(64),
      }),
    }),
    objectMutation: Object.freeze({
      ...base.objectMutation,
      candidateGitSha256: sha256(git),
    }),
    variableMutation: Object.freeze({
      expectedEntries,
      entries,
      sourceGitSha256: "1".repeat(64),
      candidateGitSha256: sha256(git),
    }),
    resources: Object.freeze([
      base.resources[0]!,
      resource("git", 2023, git),
      base.resources[2]!,
    ]),
  });
}

function compiledCandidateWithVisualCatalogSelectionMutation() {
  const base = compiledCandidate();
  const expectedVisual = Object.freeze({
    dayNightMode: "always_day" as const,
    shadowOpacity: 25,
    chanceRain: 10,
    chanceSnow: 0,
    chanceLightning: 5,
    sun: Object.freeze({
      ambientColor: 0x030201,
      diffuseColor: 0x060504,
      fogColor: 0x090807,
      fogAmount: 2,
      shadows: true,
    }),
    moon: Object.freeze({
      ambientColor: 0x0c0b0a,
      diffuseColor: 0x0f0e0d,
      fogColor: 0x121110,
      fogAmount: 3,
      shadows: false,
    }),
  });
  const valueVisual = Object.freeze({
    ...expectedVisual,
    dayNightMode: "cycle" as const,
    shadowOpacity: 65,
    sun: Object.freeze({ ...expectedVisual.sun, fogAmount: 7 }),
    moon: Object.freeze({ ...expectedVisual.moon, shadows: true }),
  });
  const expectedValue = Object.freeze({
    lightingSchemeRowIndex: 0,
    skyBoxRowIndex: 0,
    visualEnvironment: expectedVisual,
    visualEnvironmentScalarControls: Object.freeze({
      fogClipDistance: 45,
      windPower: 0,
    }),
  });
  const value = Object.freeze({
    lightingSchemeRowIndex: 1,
    skyBoxRowIndex: 1,
    visualEnvironment: valueVisual,
    visualEnvironmentScalarControls: Object.freeze({
      fogClipDistance: 120,
      windPower: 2,
    }),
  });
  const catalogIdentity = Object.freeze({
    environmentSha256: "a".repeat(64),
    skyBoxesSha256: "b".repeat(64),
  });
  const are = buildGffBuffer([
    { label: "LightingScheme", type: "byte", value: 1 },
    { label: "SkyBox", type: "byte", value: 1 },
    { label: "DayNightCycle", type: "byte", value: 1 },
    { label: "IsNight", type: "byte", value: 0 },
    { label: "ShadowOpacity", type: "byte", value: valueVisual.shadowOpacity },
    { label: "ChanceRain", type: "int", value: valueVisual.chanceRain },
    { label: "ChanceSnow", type: "int", value: valueVisual.chanceSnow },
    { label: "ChanceLightning", type: "int", value: valueVisual.chanceLightning },
    { label: "SunAmbientColor", type: "dword", value: valueVisual.sun.ambientColor },
    { label: "SunDiffuseColor", type: "dword", value: valueVisual.sun.diffuseColor },
    { label: "SunFogColor", type: "dword", value: valueVisual.sun.fogColor },
    { label: "SunFogAmount", type: "byte", value: valueVisual.sun.fogAmount },
    { label: "SunShadows", type: "byte", value: valueVisual.sun.shadows ? 1 : 0 },
    { label: "MoonAmbientColor", type: "dword", value: valueVisual.moon.ambientColor },
    { label: "MoonDiffuseColor", type: "dword", value: valueVisual.moon.diffuseColor },
    { label: "MoonFogColor", type: "dword", value: valueVisual.moon.fogColor },
    { label: "MoonFogAmount", type: "byte", value: valueVisual.moon.fogAmount },
    { label: "MoonShadows", type: "byte", value: valueVisual.moon.shadows ? 1 : 0 },
    { label: "FogClipDist", type: "float", value: 120 },
    { label: "WindPower", type: "int", value: 2 },
  ], "ARE ", 0);
  const { objectMutation: _objectMutation, ...withoutObjectMutation } = base;
  return Object.freeze({
    ...withoutObjectMutation,
    candidateAreaSha256: sha256(are),
    projectedDraft: Object.freeze({
      ...base.projectedDraft,
      visualEnvironmentCatalogSelection: Object.freeze({
        catalogIdentity,
        expectedValue,
        value: Object.freeze({
          lightingSchemeRowIndex: value.lightingSchemeRowIndex,
          skyBoxRowIndex: value.skyBoxRowIndex,
        }),
      }),
    }),
    visualEnvironmentCatalogSelectionMutation: Object.freeze({
      catalogIdentity,
      expectedValue,
      value,
      lightingSchemeChanged: true,
    }),
    unchangedCompanions: Object.freeze({
      gitSha256: base.resources[1]!.sha256,
      gicSha256: base.resources[2]!.sha256,
      moduleIfoSha256: base.moduleIfo.candidateSha256,
    }),
    resources: Object.freeze([
      resource("are", 2012, are),
      base.resources[1]!,
      base.resources[2]!,
    ]),
  });
}

function variableGit(entries: readonly Readonly<{
  name: string;
  type: "int" | "float" | "string";
  value: number | string;
}>[]) {
  return buildGffBuffer([{
    label: "VarTable",
    type: "list",
    value: entries.map((entry) => ({
      typeId: 0,
      fields: [
        { label: "Name", type: "cexostring", value: entry.name },
        { label: "Type", type: "dword", value: entry.type === "int" ? 1 : entry.type === "float" ? 2 : 3 },
        entry.type === "int"
          ? { label: "Value", type: "int", value: entry.value as number }
          : entry.type === "float"
            ? { label: "Value", type: "float", value: entry.value as number }
            : { label: "Value", type: "cexostring", value: entry.value as string },
      ],
    })),
  }], "GIT ", 0xffff_ffff);
}

function resource(extension: "are" | "git" | "gic", resourceType: number, bytes: Buffer) {
  return Object.freeze({
    extension,
    key: `crypt01.${extension}`,
    fileName: `crypt01.${extension}`,
    resourceType,
    bytes: Buffer.from(bytes),
    size: bytes.length,
    sha256: sha256(bytes),
  });
}

function harness() {
  const candidate = compiledCandidate();
  const dependencies = {
    bootstrap: {
      ensureCurrentWorkspaceBootstrapped: jest.fn(async () => ({
        head: { moduleId: MODULE_ID, revision: MODULE_REVISION },
      })),
    },
    authorization: { authorize: jest.fn(async () => true) },
    storage: {
      readModuleState: jest.fn(async () => ({
        moduleId: MODULE_ID,
        revision: MODULE_REVISION,
        quarantined: false,
      })),
    },
    compiler: { compile: jest.fn(async () => candidate) },
    tileAdmission: {
      evaluateProductionAdmission: jest.fn(async () => admittedTileProduction()),
    },
    ids: { nextValidationId: jest.fn(() => "validation-01") },
    clock: { now: jest.fn(() => new Date("2026-08-12T08:30:00.000Z")) },
  };
  return {
    candidate,
    dependencies,
    service: new AreaUpdateValidationApplicationService(dependencies as never),
  };
}

describe("AreaUpdateValidationApplicationService", () => {
  it("authorizes, binds the current revision, compiles ARE/GIT/GIC plus IFO, and returns a binary-free receipt", async () => {
    const { service, dependencies, candidate } = harness();

    const result = await service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    });

    expect(dependencies.authorization.authorize).toHaveBeenCalledWith({
      actorId: "admin-01",
      moduleId: MODULE_ID,
      permission: "area.materialize.update",
    });
    expect(dependencies.compiler.compile).toHaveBeenCalledWith(
      {
        ...command(),
        schemaVersion: "area-update-command.v1",
      },
      { moduleId: MODULE_ID, revision: MODULE_REVISION, quarantined: false },
      "admin-01",
      "validation-01",
    );
    expect(result).toMatchObject({
      schemaVersion: "area-update-validation-receipt.v1",
      validationId: "validation-01",
      moduleId: MODULE_ID,
      moduleRevision: MODULE_REVISION,
      areaResRef: "crypt01",
      sourceAreaSha256: SOURCE_HASH,
      draft: { id: "draft_01", revision: 7, normalizedSha256: DRAFT_HASH },
      candidateAre: {
        fileName: "crypt01.are",
        resourceType: 2012,
        size: candidate.resources[0]!.size,
        sha256: candidate.resources[0]!.sha256,
      },
      candidateResources: [
        expect.objectContaining({ extension: "are", resourceType: 2012 }),
        expect.objectContaining({ extension: "git", resourceType: 2023 }),
        expect.objectContaining({ extension: "gic", resourceType: 2046 }),
      ],
      candidateModuleIfo: {
        fileName: "module.ifo",
        resourceType: 2014,
        size: candidate.moduleIfo.candidateBytes.length,
        sha256: candidate.moduleIfo.candidateSha256,
      },
      objectMutation: {
        totalAdded: 1,
        addedCounts: { waypoint: 1 },
        blueprintSources: [
          expect.objectContaining({
            sourceProfileId: "nwn-base-key-utw-v1",
            templateResRef: "nw_waypoint001",
            addedCount: 1,
          }),
        ],
      },
      tileProductionAdmission: admittedTileProduction().admission,
      validatorVersion: "aurora-area-update-candidate-validator.v1",
      createdAt: "2026-08-12T08:30:00.000Z",
      expiresAt: "2026-08-12T08:35:00.000Z",
    });
    expect(JSON.stringify(result)).not.toContain('"type":"Buffer"');
    expect(result).not.toHaveProperty("resources");
    expect(result).not.toHaveProperty("projectedDraft");
    expect(dependencies.tileAdmission.evaluateProductionAdmission).toHaveBeenCalledWith({
      tilesetResRef: "tms01",
      candidateTileIds: [7, 2, 7],
    });
  });

  it("independently reads back and returns an exact Area audio mutation summary", async () => {
    const { service, dependencies } = harness();
    const candidate = compiledCandidateWithAudioEnvironmentMutation();
    dependencies.compiler.compile.mockResolvedValue(candidate as never);

    const result = await service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    });

    expect(result.audioEnvironmentMutation).toEqual(candidate.audioEnvironmentMutation);
    expect(result.candidateResources.find((entry) => entry.extension === "git")?.sha256)
      .toBe(candidate.audioEnvironmentMutation.candidateGitSha256);
  });

  it("independently reads back and returns an exact typed ordered Area variable summary", async () => {
    const { service, dependencies } = harness();
    const candidate = compiledCandidateWithVariableMutation();
    dependencies.compiler.compile.mockResolvedValue(candidate as never);

    const result = await service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    });

    expect(result.variableMutation).toEqual(candidate.variableMutation);
    expect(result.candidateResources.find((entry) => entry.extension === "git")?.sha256)
      .toBe(candidate.variableMutation.candidateGitSha256);
  });

  it("independently reads back and returns a catalog-bound visual selection summary", async () => {
    const { service, dependencies } = harness();
    const candidate = compiledCandidateWithVisualCatalogSelectionMutation();
    dependencies.compiler.compile.mockResolvedValue(candidate as never);

    const result = await service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    });

    expect(result.visualEnvironmentCatalogSelectionMutation).toEqual(
      candidate.visualEnvironmentCatalogSelectionMutation,
    );
  });

  it("rejects a visual-selection summary that differs from the candidate ARE bytes", async () => {
    const { service, dependencies } = harness();
    const candidate = compiledCandidateWithVisualCatalogSelectionMutation();
    dependencies.compiler.compile.mockResolvedValue({
      ...candidate,
      projectedDraft: {
        ...candidate.projectedDraft,
        visualEnvironmentCatalogSelection: {
          ...candidate.projectedDraft.visualEnvironmentCatalogSelection,
          value: {
            ...candidate.projectedDraft.visualEnvironmentCatalogSelection.value,
            skyBoxRowIndex: 2,
          },
        },
      },
      visualEnvironmentCatalogSelectionMutation: {
        ...candidate.visualEnvironmentCatalogSelectionMutation,
        value: {
          ...candidate.visualEnvironmentCatalogSelectionMutation.value,
          skyBoxRowIndex: 2,
        },
      },
    } as never);

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      code: "AREA_UPDATE_CANDIDATE_INVALID",
      details: expect.arrayContaining([expect.objectContaining({
        reason: expect.stringContaining("visual selection failed independent"),
      })]),
    });
  });

  it("rejects matching variable summary hashes whose GIT bytes do not contain the declared table", async () => {
    const { service, dependencies } = harness();
    const candidate = compiledCandidateWithVariableMutation();
    const wrongGit = variableGit([
      { name: "TEXT", type: "string", value: "wrong" },
      { name: "COUNT", type: "int", value: 7 },
    ]);
    const wrongSha256 = sha256(wrongGit);
    dependencies.compiler.compile.mockResolvedValue({
      ...candidate,
      objectMutation: {
        ...candidate.objectMutation,
        candidateGitSha256: wrongSha256,
      },
      variableMutation: {
        ...candidate.variableMutation,
        candidateGitSha256: wrongSha256,
      },
      resources: [
        candidate.resources[0]!,
        resource("git", 2023, wrongGit),
        candidate.resources[2]!,
      ],
    } as never);

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      code: "AREA_UPDATE_CANDIDATE_INVALID",
      details: expect.arrayContaining([expect.objectContaining({
        reason: expect.stringContaining("variable table failed independent"),
      })]),
    });
  });

  it("independently reads back the exact baseline and candidate Start Location tuples", async () => {
    const { service, dependencies } = harness();
    const candidate = compiledCandidateWithStartLocationMutation();
    dependencies.compiler.compile.mockResolvedValue(candidate as never);

    const result = await service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    });

    expect(result.moduleStartLocationMutation).toEqual(candidate.moduleStartLocationMutation);
    expect(result.candidateModuleIfo.sha256).toBe(candidate.moduleIfo.candidateSha256);
  });

  it("rejects matching IFO hashes whose bytes do not contain the declared target tuple", async () => {
    const { service, dependencies } = harness();
    const candidate = compiledCandidateWithStartLocationMutation();
    const wrongBytes = Buffer.from(candidate.moduleIfo.baselineBytes);
    const wrongSha256 = sha256(wrongBytes);
    dependencies.compiler.compile.mockResolvedValue({
      ...candidate,
      moduleStartLocationMutation: {
        ...candidate.moduleStartLocationMutation,
        candidateIfoSha256: wrongSha256,
      },
      moduleIfo: {
        ...candidate.moduleIfo,
        candidateBytes: wrongBytes,
        candidateSha256: wrongSha256,
      },
    } as never);

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      code: "AREA_UPDATE_CANDIDATE_INVALID",
      details: expect.arrayContaining([expect.objectContaining({
        reason: expect.stringContaining("tuple failed independent"),
      })]),
    });
  });

  it("rejects an uncertified complete candidate after compilation without returning a receipt", async () => {
    const { service, dependencies } = harness();
    dependencies.tileAdmission.evaluateProductionAdmission.mockResolvedValue({
      allowed: false,
      code: "AREA_TILE_CERTIFICATION_PROOF_MISSING",
      tilesetResRef: "tms01",
      tileIds: [2, 7],
      diagnostics: [{
        tileId: 7,
        rowId: "tile:tms01:7",
        stage: "render",
        status: "missing",
      }],
    } as never);

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      status: 422,
      retryable: false,
      response: {
        code: "AREA_TILE_CERTIFICATION_PROOF_MISSING",
        retryable: false,
        details: [{
          path: "tileProductionAdmission.0",
          reason: "tileId=7;rowId=tile:tms01:7;stage=render;status=missing",
        }],
      },
    });
  });

  it("maps a transport-neutral ledger source failure to a retryable validation error", async () => {
    const { service, dependencies } = harness();
    dependencies.tileAdmission.evaluateProductionAdmission.mockRejectedValue(
      new AreaTileProductionAdmissionSourceError(
        "AREA_TILE_CERTIFICATION_LEDGER_INVALID",
        "The Area tile-certification ledger is invalid.",
      ),
    );

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      status: 503,
      retryable: true,
      response: {
        code: "AREA_TILE_CERTIFICATION_LEDGER_INVALID",
        details: [],
        retryable: true,
      },
    });
  });

  it("returns unchanged-companion evidence when the full compiler reports no object mutation", async () => {
    const { service, dependencies, candidate } = harness();
    const { objectMutation: _objectMutation, ...withoutMutation } = candidate;
    const unchangedCompanions = Object.freeze({
      gitSha256: candidate.resources[1]!.sha256,
      gicSha256: candidate.resources[2]!.sha256,
      moduleIfoSha256: candidate.moduleIfo.candidateSha256,
    });
    dependencies.compiler.compile.mockResolvedValue({
      ...withoutMutation,
      unchangedCompanions,
    } as never);

    const result = await service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    });

    expect(result).toMatchObject({ unchangedCompanions });
    expect(result).not.toHaveProperty("objectMutation");
  });

  it("rejects an invalid command with bounded field diagnostics before authorization", async () => {
    const { service, dependencies } = harness();

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: {},
    })).rejects.toMatchObject({
      status: 422,
      retryable: false,
      response: {
        code: "AREA_UPDATE_INVALID",
        retryable: false,
        details: expect.arrayContaining([
          expect.objectContaining({ path: "schemaVersion", reason: expect.any(String) }),
        ]),
      },
    });
    expect(dependencies.authorization.authorize).not.toHaveBeenCalled();
  });

  it("rejects path/body identity disagreement before touching infrastructure", async () => {
    const { service, dependencies } = harness();

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "other",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({ response: { code: "AREA_UPDATE_INVALID" } });
    expect(dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped).not.toHaveBeenCalled();
    expect(dependencies.compiler.compile).not.toHaveBeenCalled();
  });

  it("rejects a body module identity disagreement independently from the Area identity", async () => {
    const { service, dependencies } = harness();

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: { ...command(), moduleId: "workspace:other" },
    })).rejects.toMatchObject({
      status: 422,
      retryable: false,
      response: { code: "AREA_UPDATE_INVALID", details: [], retryable: false },
    });
    expect(dependencies.authorization.authorize).not.toHaveBeenCalled();
  });

  it("denies an actor before compiling the candidate", async () => {
    const { service, dependencies } = harness();
    dependencies.authorization.authorize.mockResolvedValue(false);

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "builder-01",
      body: command(),
    })).rejects.toMatchObject({ response: { code: "AREA_UPDATE_PERMISSION_DENIED" } });
    expect(dependencies.compiler.compile).not.toHaveBeenCalled();
  });

  it("rejects a missing authenticated actor before authorization", async () => {
    const { service, dependencies } = harness();

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "",
      body: command(),
    })).rejects.toMatchObject({
      status: 401,
      response: { code: "AREA_UPDATE_PERMISSION_DENIED" },
    });
    expect(dependencies.authorization.authorize).not.toHaveBeenCalled();
    expect(dependencies.compiler.compile).not.toHaveBeenCalled();
  });

  it("rejects a path module outside the bootstrapped workspace", async () => {
    const { service, dependencies } = harness();
    dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped.mockResolvedValue({
      head: { moduleId: "workspace:other", revision: MODULE_REVISION },
    } as never);

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      status: 404,
      response: { code: "AREA_UPDATE_STORAGE_UNAVAILABLE" },
    });
    expect(dependencies.storage.readModuleState).not.toHaveBeenCalled();
    expect(dependencies.compiler.compile).not.toHaveBeenCalled();
  });

  it("rejects a quarantined snapshot as retryable before compiling", async () => {
    const { service, dependencies } = harness();
    dependencies.storage.readModuleState.mockResolvedValue({
      moduleId: MODULE_ID,
      revision: MODULE_REVISION,
      quarantined: true,
    });

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      status: 503,
      retryable: true,
      response: {
        code: "AREA_UPDATE_STORAGE_UNAVAILABLE",
        details: [],
        retryable: true,
      },
    });
    expect(dependencies.compiler.compile).not.toHaveBeenCalled();
  });

  it("fails on a stale module revision before compiling the candidate", async () => {
    const { service, dependencies } = harness();
    dependencies.storage.readModuleState.mockResolvedValue({
      moduleId: MODULE_ID,
      revision: "revision-18",
      quarantined: false,
    });

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      status: 412,
      retryable: false,
      response: {
        code: "AREA_UPDATE_MODULE_REVISION_CONFLICT",
        details: [{
          path: "expectedModuleRevision",
          reason: `expected=${MODULE_REVISION};actual=revision-18`,
        }],
        retryable: false,
      },
    });
    expect(dependencies.compiler.compile).not.toHaveBeenCalled();
  });

  it.each([
    ["AREA_UPDATE_DRAFT_NOT_FOUND", 404],
    ["AREA_UPDATE_DRAFT_REVISION_CONFLICT", 412],
    ["AREA_UPDATE_COMPANION_MISSING", 409],
    ["AREA_UPDATE_COMPANION_MISMATCH", 409],
    ["AREA_UPDATE_OBJECT_MUTATION_INVALID", 422],
    ["AREA_UPDATE_CANDIDATE_INVALID", 422],
    ["AREA_UPDATE_STORAGE_UNAVAILABLE", 503],
  ] as const)("maps compiler failure %s without publishing", async (code, status) => {
    const { service, dependencies } = harness();
    dependencies.compiler.compile.mockRejectedValue(
      new AreaUpdateCompilerFailure(code, status, "bounded failure", ["detail"]),
    );

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      status,
      retryable: code === "AREA_UPDATE_STORAGE_UNAVAILABLE",
      response: {
        code,
        details: [{ path: "candidate", reason: "detail" }],
        retryable: code === "AREA_UPDATE_STORAGE_UNAVAILABLE",
      },
    });
  });

  it("bounds compiler diagnostics and marks only storage failures retryable", async () => {
    const { service, dependencies } = harness();
    dependencies.compiler.compile.mockRejectedValue(
      new AreaUpdateCompilerFailure(
        "AREA_UPDATE_STORAGE_UNAVAILABLE",
        503,
        "source unavailable",
        Array.from({ length: 40 }, (_, index) => `${index}:${"x".repeat(300)}`),
      ),
    );

    const rejection = service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    });
    await expect(rejection).rejects.toMatchObject({
      status: 503,
      retryable: true,
      response: { code: "AREA_UPDATE_STORAGE_UNAVAILABLE", retryable: true },
    });
    await rejection.catch((error: unknown) => {
      expect(error).toMatchObject({
        details: expect.any(Array),
      });
      const details = (error as { details: Array<{ path: string; reason: string }> }).details;
      expect(details).toHaveLength(32);
      expect(details.every((entry) => entry.path === "candidate")).toBe(true);
      expect(details.every((entry) => entry.reason.length === 256)).toBe(true);
    });
  });

  it("does not translate an unknown compiler exception", async () => {
    const { service, dependencies } = harness();
    const failure = new TypeError("unexpected compiler contract break");
    dependencies.compiler.compile.mockRejectedValue(failure);

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toBe(failure);
  });

  it("fails closed when compiler resource metadata is internally inconsistent", async () => {
    const { service, dependencies, candidate } = harness();
    dependencies.compiler.compile.mockResolvedValue({
      ...candidate,
      resources: Object.freeze([
        { ...candidate.resources[0]!, size: candidate.resources[0]!.size + 1 },
        candidate.resources[1]!,
        candidate.resources[2]!,
      ]),
    } as never);

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      status: 422,
      response: {
        code: "AREA_UPDATE_CANDIDATE_INVALID",
        details: [
          {
            path: "candidate",
            reason: "Candidate ARE metadata failed exact validation.",
          },
        ],
      },
    });
  });

  it.each([
    ["wrong Area identity", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, areaId: "other" })],
    ["wrong resource count", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, resources: candidate.resources.slice(0, 2) })],
    ["missing ARE resource", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, resources: [candidate.resources[1]!, candidate.resources[2]!, candidate.resources[2]!] })],
    ["duplicate ARE resource", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, resources: [candidate.resources[0]!, candidate.resources[0]!, candidate.resources[2]!] })],
    ["wrong GIT filename", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, resources: [candidate.resources[0]!, { ...candidate.resources[1]!, fileName: "other.git" }, candidate.resources[2]!] })],
    ["wrong GIC resource type", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, resources: [candidate.resources[0]!, candidate.resources[1]!, { ...candidate.resources[2]!, resourceType: 999 }] })],
    ["wrong GIT digest", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, resources: [candidate.resources[0]!, { ...candidate.resources[1]!, sha256: "f".repeat(64) }, candidate.resources[2]!] })],
    ["wrong ARE summary digest", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, candidateAreaSha256: "f".repeat(64) })],
    ["wrong IFO filename", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, moduleIfo: { ...candidate.moduleIfo, fileName: "other.ifo" } })],
    ["wrong IFO resource type", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, moduleIfo: { ...candidate.moduleIfo, resourceType: 999 } })],
    ["empty IFO candidate", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, moduleIfo: { ...candidate.moduleIfo, candidateBytes: Buffer.alloc(0), candidateSha256: sha256(Buffer.alloc(0)) } })],
    ["wrong IFO digest", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, moduleIfo: { ...candidate.moduleIfo, candidateSha256: "f".repeat(64) } })],
    ["mismatched object-mutation GIT digest", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, objectMutation: { ...candidate.objectMutation!, candidateGitSha256: "f".repeat(64) } })],
    ["both companion summary modes", (candidate: ReturnType<typeof compiledCandidate>) => ({ ...candidate, unchangedCompanions: { gitSha256: candidate.resources[1]!.sha256, gicSha256: candidate.resources[2]!.sha256, moduleIfoSha256: candidate.moduleIfo.candidateSha256 } })],
    ["neither companion summary mode", (candidate: ReturnType<typeof compiledCandidate>) => {
      const { objectMutation: _objectMutation, ...withoutMutation } = candidate;
      return withoutMutation;
    }],
    ["mismatched unchanged GIC digest", (candidate: ReturnType<typeof compiledCandidate>) => {
      const { objectMutation: _objectMutation, ...withoutMutation } = candidate;
      return { ...withoutMutation, unchangedCompanions: { gitSha256: candidate.resources[1]!.sha256, gicSha256: "f".repeat(64), moduleIfoSha256: candidate.moduleIfo.candidateSha256 } };
    }],
  ])("fails closed for compiler output with %s", async (_label, mutate) => {
    const { service, dependencies, candidate } = harness();
    dependencies.compiler.compile.mockResolvedValue(mutate(candidate) as never);

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      status: 422,
      response: { code: "AREA_UPDATE_CANDIDATE_INVALID" },
    });
  });

  it.each([
    [
      "resource count before searching for an absent GIC",
      (candidate: ReturnType<typeof compiledCandidate>) => ({
        ...candidate,
        resources: candidate.resources.slice(0, 2),
      }),
      "Candidate identity or resource count is invalid.",
    ],
    [
      "duplicate ARE before inspecting the absent GIT",
      (candidate: ReturnType<typeof compiledCandidate>) => ({
        ...candidate,
        resources: [candidate.resources[0]!, candidate.resources[0]!, candidate.resources[2]!],
      }),
      "Candidate ARE metadata failed exact validation.",
    ],
    [
      "GIT content digest before inspecting the object summary",
      (candidate: ReturnType<typeof compiledCandidate>) => ({
        ...candidate,
        resources: [
          candidate.resources[0]!,
          { ...candidate.resources[1]!, sha256: "f".repeat(64) },
          candidate.resources[2]!,
        ],
      }),
      "Candidate GIT metadata failed exact validation.",
    ],
    [
      "object-mutation GIC digest",
      (candidate: ReturnType<typeof compiledCandidate>) => ({
        ...candidate,
        objectMutation: {
          ...candidate.objectMutation!,
          candidateGicSha256: "f".repeat(64),
        },
      }),
      "Object mutation summary differs from GIT/GIC candidates.",
    ],
    [
      "unchanged GIT digest",
      (candidate: ReturnType<typeof compiledCandidate>) => {
        const { objectMutation: _objectMutation, ...withoutMutation } = candidate;
        return {
          ...withoutMutation,
          unchangedCompanions: {
            gitSha256: "f".repeat(64),
            gicSha256: candidate.resources[2]!.sha256,
            moduleIfoSha256: candidate.moduleIfo.candidateSha256,
          },
        };
      },
      "Unchanged companion summary differs from the candidates.",
    ],
    [
      "unchanged IFO digest",
      (candidate: ReturnType<typeof compiledCandidate>) => {
        const { objectMutation: _objectMutation, ...withoutMutation } = candidate;
        return {
          ...withoutMutation,
          unchangedCompanions: {
            gitSha256: candidate.resources[1]!.sha256,
            gicSha256: candidate.resources[2]!.sha256,
            moduleIfoSha256: "f".repeat(64),
          },
        };
      },
      "Unchanged companion summary differs from the candidates.",
    ],
  ])("reports the first exact candidate inconsistency for %s", async (_label, mutate, reason) => {
    const { service, dependencies, candidate } = harness();
    dependencies.compiler.compile.mockResolvedValue(mutate(candidate) as never);

    await expect(service.validate({
      moduleId: MODULE_ID,
      areaResRef: "crypt01",
      actorId: "admin-01",
      body: command(),
    })).rejects.toMatchObject({
      status: 422,
      response: {
        code: "AREA_UPDATE_CANDIDATE_INVALID",
        details: [{ path: "candidate", reason }],
      },
    });
  });
});
