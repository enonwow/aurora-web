import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  NWN_KEY_BIF_RESOURCE_TYPES,
  NwnKeyBifResourceReader
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { parseAuroraTwoDaTable } from "../src/common/aurora/two-da/aurora-two-da-table";
import {
  parseAreaMetadataFromAreGff,
  type ParsedAreaTileBlueprint
} from "../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { readNwnErfResource } from "../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import { buildDefaultRuntimeSettings } from "../src/modules/runtime-settings/domain/runtime-settings.defaults";
import { VfxApplicationService } from "../src/modules/vfx/application/vfx.application.service";
import { parseAuroraMdlVfxSource } from "../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import { convertAuroraMdlToGlb } from "../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";
import {
  createAuroraRetailAreaWokCollisionContext,
  parseAuroraAsciiWokWalkmesh
} from "../src/modules/vfx/domain/aurora-wok-walkmesh";

const repoRoot = resolve(__dirname, "../..");
const fixtureRoot = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22"
);
const sourceRoot = resolve(fixtureRoot, "sources");
const publicRoot = resolve(repoRoot, "frontend/public/dev-fixtures/vfx-nwn-web-row22");
const modelPath = resolve(sourceRoot, "vff_explfire.mdl");
const sourceTablePath = resolve(sourceRoot, "visualeffects.2da");
const chunkModelPath = resolve(sourceRoot, "fx_rockchunksml.mdl");
const chunkResourceKey = "fx_rockchunksml.glb";
const chunkRuntimePayloadResourceKey = "fx_rockchunksml.runtime.json";
const chunkDirtTexturePath = resolve(sourceRoot, "fxpa_dirt.tga");
const chunkDirtTextureTxiPath = resolve(sourceRoot, "fxpa_dirt.txi");
const chunkDirtTextureResourceKey = "fxpa_dirt.tga";
const textureRefs = ["fxpa_Explode1", "fxpa_Smoke01", "fxpa_flstrk", "fxpa_ringwave"] as const;
const animationTickCount = 149;
const seed = 220022;
const nwnInstallRoot = "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const nwnBaseKeyPath = resolve(nwnInstallRoot, "data/nwn_base.key");
const nwnUserRoot = "C:/Users/enonw/Documents/Neverwinter Nights";
const qTilesetsHakPath = resolve(nwnUserRoot, "hak/q_tilesets.hak");
const oracleModulePath = resolve(nwnUserRoot, "modules/codex_vfx_row22.mod");
const oracleAreaResref = "enon_test_effect";
const oracleEffectOrigin = { x: 9.5, y: 3.799999952316284, z: 0 } as const;
const oracleAreaTiles = [
  { tileIndex: 0, column: 0, row: 0, tileId: 107, orientation: 2, height: 0, resref: "tin01_h01_02", source: "nwn_base.key" },
  { tileIndex: 1, column: 1, row: 0, tileId: 147, orientation: 3, height: 0, resref: "tin01_h01_03", source: "nwn_base.key" },
  { tileIndex: 2, column: 0, row: 1, tileId: 364, orientation: 1, height: 0, resref: "gin01_h01_08", source: "q_tilesets.hak" },
  { tileIndex: 3, column: 1, row: 1, tileId: 364, orientation: 0, height: 0, resref: "gin01_h01_08", source: "q_tilesets.hak" }
] as const;
const oracleAreaModelSpecs = [
  { resref: "tin01_h01_02", source: "nwn_base.key" },
  { resref: "tin01_h01_03", source: "nwn_base.key" },
  { resref: "gin01_h01_08", source: "q_tilesets.hak" }
] as const;

async function main(): Promise<void> {
  const [
    modelBytes,
    sourceTableBytes,
    chunkModelBytes,
    chunkDirtTextureBytes,
    chunkDirtTextureTxiBytes
  ] = await Promise.all([
    readFile(modelPath),
    readFile(sourceTablePath),
    readFile(chunkModelPath),
    readFile(chunkDirtTexturePath),
    readFile(chunkDirtTextureTxiPath)
  ]);
  const modelHash = sha256(modelBytes);
  const sourceTableHash = sha256(sourceTableBytes);
  const parsedModel = parseAuroraMdlVfxSource(modelBytes, {
    sourceModelObjectKey: "proof/vfx-nwn-web-row22/vff_explfire.mdl",
    sourceModelFileName: "vff_explfire.mdl",
    sourceModelHash: modelHash
  });
  const chunkModelHash = sha256(chunkModelBytes);
  const parsedChunkModel = parseAuroraMdlVfxSource(chunkModelBytes, {
    sourceModelObjectKey: "proof/vfx-nwn-web-row22/fx_rockchunksml.mdl",
    sourceModelFileName: "fx_rockchunksml.mdl",
    sourceModelHash: chunkModelHash
  });
  const chunkGlb = convertAuroraMdlToGlb(chunkModelBytes);
  if (parsedModel.emitters.length !== 6 || parsedModel.lights.length !== 1) {
    throw new Error(
      `Expected six emitters and one light; received ${parsedModel.emitters.length}/${parsedModel.lights.length}.`
    );
  }
  const animationLengths = new Set(
    parsedModel.emitters.map((emitter) =>
      emitter.animationPasses?.find((pass) => pass.animationName === "impact")?.lengthSeconds
    )
  );
  if (animationLengths.size !== 1) {
    throw new Error(`Impact animation lengths disagree: ${[...animationLengths].join(", ")}.`);
  }
  const animationLengthSeconds = [...animationLengths][0];
  if (!(typeof animationLengthSeconds === "number" && animationLengthSeconds > 0)) {
    throw new Error("Retail impact animation length is missing or non-positive.");
  }
  const dtSeconds = animationLengthSeconds / animationTickCount;
  const maximumParticleLifetimeSeconds = Math.max(
    0,
    ...parsedModel.emitters.flatMap((emitter) => [
      emitter.simulation?.lifeExp ?? 0,
      ...(emitter.animationPasses ?? []).map(
        (pass) => pass.emitterState?.simulation?.lifeExp ?? 0
      )
    ])
  );
  const tailTickCount = Math.ceil(maximumParticleLifetimeSeconds / dtSeconds) + 1;
  const tickCount = animationTickCount + tailTickCount;

  const textureFiles = await Promise.all(
    textureRefs.map(async (resref) => {
      const path = resolve(sourceRoot, `${resref}.tga`);
      const txiPath = resolve(sourceRoot, `${resref}.txi`);
      const [bytes, txiBytes] = await Promise.all([readFile(path), readFile(txiPath)]);
      return {
        resref,
        path,
        bytes,
        sha256: sha256(bytes),
        txiPath,
        txiSha256: sha256(txiBytes),
        txi: parseAuroraTxiSamplerState(txiBytes, txiPath)
      };
    })
  );
  const fixtureTextureFiles = [
    ...textureFiles.map((entry) => ({
      ...entry,
      resourceKey: `${entry.resref.toLowerCase()}.tga`
    })),
    {
      resref: "fxpa_dirt",
      path: chunkDirtTexturePath,
      bytes: chunkDirtTextureBytes,
      sha256: sha256(chunkDirtTextureBytes),
      txiPath: chunkDirtTextureTxiPath,
      txiSha256: sha256(chunkDirtTextureTxiBytes),
      txi: parseAuroraTxiSamplerState(chunkDirtTextureTxiBytes, chunkDirtTextureTxiPath),
      resourceKey: chunkDirtTextureResourceKey
    }
  ];
  const textureFilesByReference = new Map(
    fixtureTextureFiles.map((entry) => [entry.resref.trim().toLowerCase(), entry] as const)
  );
  const chunkImpactAnimationLengthSeconds = resolveImpactAnimationLengthSeconds(
    parsedChunkModel,
    chunkGlb.sourceAnimations
  );
  const chunkAnimationTickCount = Math.max(
    1,
    Math.ceil(chunkImpactAnimationLengthSeconds / dtSeconds)
  );
  const chunkMaximumParticleLifetimeSeconds = Math.max(
    0,
    ...parsedChunkModel.emitters.flatMap((emitter) => [
      emitter.simulation?.lifeExp ?? 0,
      ...(emitter.animationPasses ?? []).map(
        (pass) => pass.emitterState?.simulation?.lifeExp ?? 0
      )
    ])
  );
  const chunkTailTickCount = Math.ceil(chunkMaximumParticleLifetimeSeconds / dtSeconds) + 1;
  const chunkTickCount = chunkAnimationTickCount + chunkTailTickCount;
  const chunkSmokeTexture = textureFilesByReference.get("fxpa_smoke01");
  if (!chunkSmokeTexture) {
    throw new Error("The parsed fx_rockchunksml child emitter requires fxpa_Smoke01.tga.");
  }
  const baseReader = await NwnKeyBifResourceReader.open(nwnBaseKeyPath, nwnInstallRoot);
  const [
    tin01H0102Wok,
    tin01H0103Wok,
    gin01H0108Wok,
    oracleModuleBytes,
    oracleAreaBytesRaw,
    ...areaModelBytes
  ] = await Promise.all([
    baseReader.read("tin01_h01_02", NWN_KEY_BIF_RESOURCE_TYPES.WOK),
    baseReader.read("tin01_h01_03", NWN_KEY_BIF_RESOURCE_TYPES.WOK),
    readNwnErfResource(qTilesetsHakPath, "gin01_h01_08", NWN_KEY_BIF_RESOURCE_TYPES.WOK),
    readFile(oracleModulePath),
    readNwnErfResource(oracleModulePath, oracleAreaResref, 2012),
    ...oracleAreaModelSpecs.map((model) =>
      model.source === "q_tilesets.hak"
        ? readNwnErfResource(qTilesetsHakPath, model.resref, NWN_KEY_BIF_RESOURCE_TYPES.MDL)
        : baseReader.read(model.resref, NWN_KEY_BIF_RESOURCE_TYPES.MDL)
    )
  ]);
  const oracleAreaBytes = requireResource(
    oracleAreaBytesRaw,
    `${oracleAreaResref}.are`
  );
  const oracleArea = parseAreaMetadataFromAreGff(oracleAreaBytes);
  if (!oracleArea) {
    throw new Error(`Retail area ${oracleAreaResref}.are could not be parsed.`);
  }
  const oracleAreaLighting = resolveOracleAreaGlobalLighting(
    oracleArea.globalLighting.fields
  );
  const areaModels = oracleAreaModelSpecs.map((model, index) => {
    const bytes = requireResource(areaModelBytes[index] ?? null, `${model.resref}.mdl`);
    const converted = convertAuroraMdlToGlb(bytes);
    const parsedVfxSource = parseAuroraMdlVfxSource(bytes, {
      sourceModelObjectKey:
        model.source === "q_tilesets.hak" ? qTilesetsHakPath : nwnBaseKeyPath,
      sourceModelFileName: `${model.resref}.mdl`,
      sourceModelHash: sha256(bytes)
    });
    return {
      ...model,
      bytes,
      sha256: sha256(bytes),
      resourceKey: `scene/${model.resref}.glb`,
      converted,
      parsedVfxSource
    };
  });
  const [lightColorTwoDaBytesRaw, sourceLightModelBytesRaw] = await Promise.all([
    baseReader.read("lightcolor", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA),
    baseReader.read("fx_flame01", NWN_KEY_BIF_RESOURCE_TYPES.MDL)
  ]);
  const lightColorTwoDaBytes = requireResource(
    lightColorTwoDaBytesRaw,
    "lightcolor.2da"
  );
  const sourceLightModelBytes = requireResource(
    sourceLightModelBytesRaw,
    "fx_flame01.mdl"
  );
  const mainLightColors = parseProofSceneTileLightColorLookup(
    lightColorTwoDaBytes,
    "lightcolor.2da"
  );
  const sourceLightColors = parseProofSceneTileSourceLightColorLookup(
    sourceLightModelBytes
  );
  const proofSceneTileLighting = oracleAreaTiles.map((tile) => {
    const parsedTile = oracleArea.tiles.find(
      (candidate) => candidate.index === tile.tileIndex
    );
    if (!parsedTile) {
      throw new Error(`Retail ARE tile ${tile.tileIndex} is missing.`);
    }
    if (
      parsedTile.tileId !== tile.tileId ||
      parsedTile.orientation !== tile.orientation ||
      parsedTile.row !== tile.row ||
      parsedTile.col !== tile.column
    ) {
      throw new Error(
        `Retail ARE tile ${tile.tileIndex} no longer matches the row 22 proof layout.`
      );
    }
    const model = areaModels.find((entry) => entry.resref === tile.resref)!;
    return {
      tileIndex: tile.tileIndex,
      lights: buildProofSceneTileLights({
        tile: parsedTile,
        modelName: model.converted.modelName,
        sourceHierarchy: model.converted.sourceHierarchy ?? [],
        nativeLights: model.parsedVfxSource.lights,
        sourceModelFileName: `${model.resref}.mdl`,
        sourceModelObjectKey:
          model.source === "q_tilesets.hak" ? qTilesetsHakPath : nwnBaseKeyPath,
        sourceModelHash: model.sha256,
        mainLightColors,
        sourceLightColors,
        mainLightColorSource: `${nwnBaseKeyPath}/lightcolor.2da`,
        mainLightColorSourceSha256: sha256(lightColorTwoDaBytes),
        sourceLightColorSource: `${nwnBaseKeyPath}/fx_flame01.mdl`,
        sourceLightColorSourceSha256: sha256(sourceLightModelBytes)
      })
    };
  });
  const proofSceneTileLightEntries = proofSceneTileLighting.flatMap(
    (entry) => entry.lights
  );
  const resolvedProofSceneSourceLightCount =
    proofSceneTileLightEntries.filter(
      (entry) => entry.rendererStatus === "source-node-resolved"
    ).length;
  const unresolvedProofSceneSourceLightCount =
    proofSceneTileLightEntries.filter(
      (entry) => entry.rendererStatus === "source-node-unresolved"
    ).length;
  const absentProofSceneSourceLightCount =
    proofSceneTileLightEntries.filter(
      (entry) =>
        entry.rendererStatus === "source-node-absent-by-aurora-slot-count"
    ).length;
  const resolvedProofSceneMainLightCount = proofSceneTileLightEntries.filter(
    (entry) => entry.rendererStatus === "main-native-node-resolved"
  ).length;
  const unresolvedProofSceneMainLightCount = proofSceneTileLightEntries.filter(
    (entry) => entry.rendererStatus === "main-native-node-unresolved"
  ).length;
  const areaTextureReferences = [
    ...new Set(
      areaModels.flatMap((model) =>
        model.converted.textureReferences.map((reference) =>
          reference.trim().toLowerCase()
        )
      )
    )
  ].sort();
  const areaTextures = await Promise.all(
    areaTextureReferences.map(async (resref) => {
      const [hakBytes, baseBytes] = await Promise.all([
        readNwnErfResource(qTilesetsHakPath, resref, NWN_KEY_BIF_RESOURCE_TYPES.TGA),
        baseReader.read(resref, NWN_KEY_BIF_RESOURCE_TYPES.TGA)
      ]);
      const bytes = hakBytes ?? baseBytes;
      if (!bytes) {
        throw new Error(`Required retail area texture ${resref}.tga was not found.`);
      }
      return {
        resref,
        bytes,
        sha256: sha256(bytes),
        sourcePath: hakBytes ? qTilesetsHakPath : nwnBaseKeyPath,
        resourceKey: `scene/textures/${resref}.tga`
      };
    })
  );
  const wokResources = [
    { resref: "tin01_h01_02", bytes: requireResource(tin01H0102Wok, "tin01_h01_02.wok"), source: nwnBaseKeyPath },
    { resref: "tin01_h01_03", bytes: requireResource(tin01H0103Wok, "tin01_h01_03.wok"), source: nwnBaseKeyPath },
    { resref: "gin01_h01_08", bytes: requireResource(gin01H0108Wok, "gin01_h01_08.wok"), source: qTilesetsHakPath }
  ];
  const walkmeshesByResref = new Map(
    wokResources.map((resource) => [
      resource.resref,
      parseAuroraAsciiWokWalkmesh(resource.bytes)
    ] as const)
  );
  const collisionContext = createAuroraRetailAreaWokCollisionContext({
    collisionProfileId: "nwn-row22-enon-test-effect-static-wok/v1",
    instances: oracleAreaTiles.map((tile) => ({
      instanceId: `enon_test_effect:tile-${tile.tileIndex}`,
      walkmesh: requireWalkmesh(walkmeshesByResref, tile.resref),
      translation: {
        x: tile.column * 10 + 5 - oracleEffectOrigin.x,
        y: tile.row * 10 + 5 - oracleEffectOrigin.y,
        z: tile.height - oracleEffectOrigin.z
      },
      orientationQuarterTurns: tile.orientation
    }))
  });
  const service = new VfxApplicationService({
    get: async () => buildDefaultRuntimeSettings("2026-07-14T00:00:00.000Z"),
    save: async () => undefined
  });
  const envelope = await service.processVfxPackage({
    packageKind: "model_graph_runtime",
    sourceTableText: sourceTableBytes.toString("latin1"),
    sourceObjectKey: "proof/vfx-nwn-web-row22/visualeffects.2da",
    sourceLayer: "vanilla",
    sourceRowId: 22,
    effectInstance: {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 22,
      applicationMode: "location",
      durationType: "instant",
      targetRef: "retail-capture-target"
    },
    sourceEmitters: parsedModel.emitters,
    sourceAnimationEvents: parsedModel.animationEvents,
    sourceModelGraph: parsedModel.modelGraph,
    resourceTraces: [
      {
        requestedResourceClass: "chunk_model",
        requestedRef: "fx_rockchunksml",
        ownerPath: "mdl:vff_explfire.mdl/emitter:Chunkssml/chunkName",
        selectedCandidate: {
          sourceLayer: "vanilla",
          resourceKey: chunkResourceKey,
          sourcePath: "retail/models/fx_rockchunksml.mdl",
          resourceHash: sha256(chunkModelBytes),
          candidateId: "nwn-ee-retail-key-bif:fx_rockchunksml.mdl",
          precedenceRank: 0
        }
      }
    ],
    runtime: {
      dtSeconds,
      tickCount,
      executionParticleBudget: 4096,
      seed,
      animation: {
        animationName: "impact",
        previousTimeSeconds: 0,
        currentTimeSeconds: animationLengthSeconds,
        blendWeight: 1,
        playbackTickCount: animationTickCount
      },
      windManager: {
        profileId: "vfx-nwn-web-row22-proof",
        noiseSeed: seed,
        globalWindVector: { x: 0, y: 0, z: 0 },
        variationYawRadians: 0,
        variationPitchRadians: 0,
        noisePeriodSeconds: 1
      },
      context: { collisionContext }
    },
    bypassCache: true,
    includeBenchmarkMetadata: false
  });
  const chunkEnvelope = await service.processVfxPackage({
    packageKind: "model_graph_runtime",
    sourceTableText: sourceTableBytes.toString("latin1"),
    sourceObjectKey: "proof/vfx-nwn-web-row22/visualeffects.2da",
    sourceLayer: "vanilla",
    sourceRowId: 22,
    effectInstance: {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 22,
      applicationMode: "location",
      durationType: "instant",
      targetRef: "retail-chunk-model-instance"
    },
    sourceEmitters: parsedChunkModel.emitters,
    sourceAnimationEvents: parsedChunkModel.animationEvents,
    sourceModelGraph: parsedChunkModel.modelGraph,
    resourceTraces: [
      {
        requestedResourceClass: "texture",
        requestedRef: "fxpa_Smoke01",
        ownerPath: "mdl:fx_rockchunksml.mdl/emitter:smoke04/texture",
        selectedCandidate: {
          sourceLayer: "vanilla",
          resourceKey: "fxpa_smoke01.tga",
          sourcePath: "retail/textures/fxpa_Smoke01.tga",
          resourceHash: chunkSmokeTexture.sha256,
          candidateId: "nwn-ee-retail-key-bif:fxpa_Smoke01.tga",
          precedenceRank: 0
        }
      }
    ],
    runtime: {
      dtSeconds,
      tickCount: chunkTickCount,
      executionParticleBudget: 4096,
      seed: seed + 1,
      animation: {
        animationName: "impact",
        previousTimeSeconds: 0,
        currentTimeSeconds: chunkImpactAnimationLengthSeconds,
        blendWeight: 1,
        playbackTickCount: chunkAnimationTickCount
      },
      windManager: {
        profileId: "vfx-nwn-web-row22-chunk-model-runtime",
        noiseSeed: seed + 1,
        globalWindVector: { x: 0, y: 0, z: 0 },
        variationYawRadians: 0,
        variationPitchRadians: 0,
        noisePeriodSeconds: 1
      }
    },
    bypassCache: true,
    includeBenchmarkMetadata: false
  });
  const runtime = envelope.vfx;
  const chunkEmitterFrames =
    runtime.runtimeEmitters?.find((entry) => entry.emitterNodeName === "Chunkssml")
      ?.runtimeFrames ?? [];
  const chunkCollisionResults = chunkEmitterFrames.flatMap(
    (frame) => frame.runtimeState.collisionResults
  );
  const chunkActivePositions: Array<{ x: number; y: number; z: number }> = [];
  const landedChunkParticleIds = new Set<number>();
  for (const frame of chunkEmitterFrames) {
    const activeIds = new Set(frame.runtimeState.activeParticleIds);
    for (const particle of frame.runtimeState.particles) {
      if (particle.landed) {
        landedChunkParticleIds.add(particle.particleId);
      }
      if (activeIds.has(particle.particleId)) {
        chunkActivePositions.push(particle.position);
      }
    }
  }
  const chunkCollisionRuntimeSummary = {
    queryCount: chunkEmitterFrames.reduce(
      (total, frame) => total + frame.runtimeState.collisionQueries.length,
      0
    ),
    resultCount: chunkCollisionResults.length,
    hitCount: chunkCollisionResults.filter((entry) => entry.status === "hit").length,
    appliedHitCount: chunkCollisionResults.filter((entry) => entry.appliedToRuntime).length,
    staticNoHitCount: chunkCollisionResults.filter((entry) => entry.status === "noHit").length,
    landedParticleIds: [...landedChunkParticleIds].sort((left, right) => left - right),
    activePositionBounds: resolvePositionBounds(chunkActivePositions)
  };
  const diagnostics = runtime.diagnostics.map((entry) => ({
    code: entry.code,
    severity: entry.severity,
    message: entry.message
  }));
  const payload = {
    version: "aurora-vfx-payload/v1",
    canonicalStatus: "canonical",
    backendCanonical: true,
    sourceKind: "effect_instance",
    previewMode: "none",
    diagnostics: {
      sourceRows: [],
      effectInstance: [],
      phaseSchedule: [],
      dependencyGraph: [],
      runtimeState: diagnostics,
      renderContract: [],
      payload: []
    },
    contracts: {
      sourceRows: runtime.selectedSourceRow ? [runtime.selectedSourceRow] : [],
      effectInstance: runtime.effectInstance,
      phaseSchedule: runtime.phaseSchedule,
      dependencyGraph: runtime.dependencyGraph,
      runtimeEmitters: runtime.runtimeEmitters,
      runtimeState: runtime.runtimeState,
      renderContract: runtime.renderContract,
      sourceModelGraph: parsedModel.modelGraph,
      sourceMdlLights: parsedModel.lights,
      windManagerSnapshot: runtime.windManagerSnapshot
    },
    provenance: {
      backendPayloadVersion: runtime.version,
      sourceProfile: "nwn-ee-retail-key-bif-row22-one-trigger-proof",
      sourceTable: "visualeffects.2da",
      sourceRowId: 22,
      sourceLabel: runtime.selectedSourceRow?.label ?? "VFX_FNF_FIREBALL",
      sourceResRef: "vff_explfire",
      effectInstanceId: "vfx-nwn-web-row22",
      runtimeProfile: "retail-impact-149-ticks-seed-220022",
      renderContractVersion: runtime.renderContract?.version
    }
  };
  const chunkRuntime = chunkEnvelope.vfx;
  const chunkRuntimePayload = {
    version: "aurora-vfx-payload/v1",
    canonicalStatus: "canonical",
    backendCanonical: true,
    sourceKind: "effect_instance",
    previewMode: "none",
    diagnostics: {
      sourceRows: [],
      effectInstance: [],
      phaseSchedule: [],
      dependencyGraph: [],
      runtimeState: chunkRuntime.diagnostics.map((entry) => ({
        code: entry.code,
        severity: entry.severity,
        message: entry.message
      })),
      renderContract: [],
      payload: []
    },
    contracts: {
      sourceRows: chunkRuntime.selectedSourceRow ? [chunkRuntime.selectedSourceRow] : [],
      effectInstance: chunkRuntime.effectInstance,
      phaseSchedule: chunkRuntime.phaseSchedule,
      dependencyGraph: chunkRuntime.dependencyGraph,
      runtimeEmitters: chunkRuntime.runtimeEmitters,
      runtimeState: chunkRuntime.runtimeState,
      renderContract: chunkRuntime.renderContract,
      sourceModelGraph: parsedChunkModel.modelGraph,
      sourceMdlLights: parsedChunkModel.lights,
      windManagerSnapshot: chunkRuntime.windManagerSnapshot
    },
    provenance: {
      backendPayloadVersion: chunkRuntime.version,
      sourceProfile: "nwn-ee-retail-key-bif-row22-chunk-model-runtime",
      sourceTable: "visualeffects.2da",
      sourceRowId: 22,
      sourceLabel: runtime.selectedSourceRow?.label ?? "VFX_FNF_FIREBALL",
      sourceResRef: "fx_rockchunksml",
      effectInstanceId: "vfx-nwn-web-row22-chunk-model-runtime",
      runtimeProfile: "retail-impact-child-model-runtime-source-backed",
      renderContractVersion: chunkRuntime.renderContract?.version
    }
  };
  const chunkMaterialDependencies = chunkGlb.textureReferences.map((resref) => {
    const sourceTexture = textureFilesByReference.get(resref.trim().toLowerCase());
    return {
      resref,
      status: sourceTexture ? "source-artifact-available" : "source-artifact-unresolved",
      ...(sourceTexture
        ? { sourcePath: sourceTexture.path, sha256: sourceTexture.sha256 }
        : {
            reason:
              "No Aurora/NWN source texture artifact was supplied for this source-MDL material reference; no substitute texture is permitted."
          })
    };
  });
  const manifest = {
    version: "aurora-vfx-nwn-web-fixture/v1",
    fixtureId: "vfx-nwn-web-row22",
    lifecycle: "fire-and-forget",
    intentionalTriggerCount: 1,
    sourceRowId: 22,
    sourceLabel: "VFX_FNF_FIREBALL",
    comparisonContext: {
      oracle: {
        video: "nwn/nwn-row22-one-trigger.mp4",
        viewport: { width: 880, height: 750 },
        camera: {
          mode: 0,
          maximumDistance: 6,
          source: "Neverwinter Nights settings.tml captured on the oracle workstation",
          exactPoseStatus: "not-recovered-from-saved-nwn-video"
        },
        scene: {
          areaResref: oracleAreaResref,
          tileset: "tin01",
          status: "retail-area-visible-in-saved-video"
        },
        ownerTargetStatus: "not-recovered-as-renderable-web-scene-objects"
      },
      web: {
        viewport: { width: 880, height: 750 },
        camera: {
          projection: "perspective",
          fovDegrees: 36.743818,
          position: [0.05148, 6.051473, -4.371987],
          up: [0, 1, 0],
          lookAt: [0.03482, 0.01, 3.737955],
          status:
            "retail-frame-origin-and-planar-receiver-calibrated-camera-transform-not-exact",
          calibration: {
            status: "saved-retail-origin-and-planar-receiver-fit",
            sourceFrame:
              "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger-validated-baseline.png",
            rmsTolerancePixels: 8
          }
        },
        scene: {
          status:
            "source-backed-retail-area-horizontal-floor-receivers-global-lighting-native-main-and-source-slot-count-tile-lighting-without-creatures"
        }
      },
      cameraMatchEstablished: false,
      sceneMatchEstablished: false,
      ownerTargetMatchEstablished: false,
      comparisonStatus:
        "source-area-geometry-global-lighting-native-main-and-source-slot-count-tile-lighting-backed-origin-and-planar-camera-calibrated-exact-camera-owner-target-gaps"
    },
    sourceModel: { path: modelPath, sha256: modelHash },
    sourceTable: { path: sourceTablePath, sha256: sourceTableHash },
    textures: fixtureTextureFiles.map((entry) => ({
      resref: entry.resref,
      path: entry.path,
      sha256: entry.sha256,
      resourceKey: entry.resourceKey,
      txiPath: entry.txiPath,
      txiSha256: entry.txiSha256,
      txi: entry.txi
    })),
    chunks: [
      {
        resref: "fx_rockchunksml",
        resourceKey: chunkResourceKey,
        sourcePath: chunkModelPath,
        sourceSha256: chunkModelHash,
        runtimePayloadResourceKey: chunkRuntimePayloadResourceKey,
        runtimePayloadSourceModelObjectKey: "proof/vfx-nwn-web-row22/fx_rockchunksml.mdl",
        sourceEmitterNames: parsedChunkModel.emitters.map((entry) => entry.nodeName),
        materialDependencies: chunkMaterialDependencies
      }
    ],
    collisionOracle: {
      module: {
        path: oracleModulePath,
        sha256: sha256(oracleModuleBytes),
        areaResref: oracleAreaResref,
        areaSourceSha256: sha256(oracleAreaBytes)
      },
      effectOrigin: oracleEffectOrigin,
      tileset: "tin01",
      hakPrecedence: ["q_tilesets", "cep3_tiles"],
      staticTraversalProfile: collisionContext.collisionProfileId,
      dynamicTraversalStatus: "not-selected-by-vfx-query-helper-arg0-1",
      runtimeSummary: chunkCollisionRuntimeSummary,
      tiles: oracleAreaTiles.map((tile) => {
        const resource = wokResources.find((entry) => entry.resref === tile.resref)!;
        return {
          ...tile,
          sourcePath: resource.source,
          sourceSha256: sha256(resource.bytes),
          savedEvidencePath: resolve(sourceRoot, `${resource.resref}.wok`)
        };
      })
    },
    proofScene: {
      status:
        "source-backed-retail-area-horizontal-floor-receivers-global-lighting-native-main-and-source-slot-count-tile-lighting",
      sourceCoordinateSpace: "aurora-z-up",
      meshFilter: "horizontal-floor-receivers",
      meshVisibilityRule: {
        version: "nwn-vfx-proof-scene-mesh-visibility-rule/v1",
        kind: "model-y-maximum",
        maximumY: 0.05,
        comparisonAdmission: "diagnostic-only",
        sourceEvidence:
          "backend/docs/aurora-reverse/vfx-row22-proof-scene-parity-readiness-audit-2026-07-20.md"
      },
      effectOrigin: oracleEffectOrigin,
      areaLighting: {
        status: "source-backed-are-global-ambient-diffuse",
        areaResref: oracleAreaResref,
        sourcePath: resolve(sourceRoot, `${oracleAreaResref}.are`),
        sourceSha256: sha256(oracleAreaBytes),
        phase: oracleAreaLighting.phase,
        fields: oracleArea.globalLighting.fields,
        ambientColorPacked: oracleAreaLighting.ambientColorPacked,
        ambientColorRgb: oracleAreaLighting.ambientColorRgb,
        diffuseColorPacked: oracleAreaLighting.diffuseColorPacked,
        diffuseColorRgb: oracleAreaLighting.diffuseColorRgb,
        directionalPosition: oracleAreaLighting.directionalPosition,
        localTileLightingStatus: [
          "source-backed-tile-lighting",
          `resolved-source-${resolvedProofSceneSourceLightCount}`,
          `absent-source-${absentProofSceneSourceLightCount}`,
          `unresolved-source-${unresolvedProofSceneSourceLightCount}`,
          `resolved-main-${resolvedProofSceneMainLightCount}`,
          `unresolved-main-${unresolvedProofSceneMainLightCount}`
        ].join(":")
      },
      models: oracleAreaTiles.map((tile) => {
        const model = areaModels.find((entry) => entry.resref === tile.resref)!;
        const tileLighting = proofSceneTileLighting.find(
          (entry) => entry.tileIndex === tile.tileIndex
        );
        return {
          role: "area_tile",
          instanceId: `enon_test_effect:tile-${tile.tileIndex}`,
          sourceResref: tile.resref,
          resourceKey: model.resourceKey,
          sourcePath:
            model.source === "q_tilesets.hak" ? qTilesetsHakPath : nwnBaseKeyPath,
          sourceSha256: model.sha256,
          translation: [
            tile.column * 10 + 5 - oracleEffectOrigin.x,
            tile.row * 10 + 5 - oracleEffectOrigin.y,
            tile.height - oracleEffectOrigin.z
          ],
          orientationQuarterTurns: tile.orientation,
          tileLights: tileLighting?.lights ?? []
        };
      }),
      textures: areaTextures.map((texture) => ({
        resref: texture.resref,
        resourceKey: texture.resourceKey,
        sourcePath: texture.sourcePath,
        sourceSha256: texture.sha256
      })),
      omittedOracleObjects: [
        {
          role: "source_creature",
          sourceModel: "pfh0",
          reason:
            "The player appearance is modular and requires BIC appearance-part/PLT assembly; a root-only pfh0 substitute is not permitted in comparison proof."
        },
        {
          role: "target_creature",
          sourceModel: "c_yinnkeep",
          reason:
            "The saved target uses supermodel idle animation; a static bind-pose substitute is not permitted in comparison proof."
        }
      ]
    },
    runtime: {
      animationName: "impact",
      animationLengthSeconds,
      animationTickCount,
      maximumParticleLifetimeSeconds,
      tailTickCount,
      dtSeconds,
      tickCount,
      durationSeconds: dtSeconds * tickCount,
      seed
    },
    emitterNames: parsedModel.emitters.map((entry) => entry.nodeName),
    sourceLightNames: parsedModel.lights.map((entry) => entry.nodeName),
    sourceAnimationTimelines: parsedModel.emitters.map((entry) => ({
      emitterNodeName: entry.nodeName,
      birthrate:
        entry.animationPasses?.find((pass) => pass.animationName === "impact")
          ?.emitterState?.simulation?.timeline?.birthrate ?? []
    })),
    sourceLightAnimationTracks: parsedModel.lights.map((entry) => ({
      lightNodeName: entry.nodeName,
      color: entry.color,
      radius: entry.radius,
      multiplier: entry.multiplier,
      impact:
        entry.animations?.find((animation) => animation.animationName === "impact") ?? null
    })),
    runtimeFrameCounts:
      runtime.runtimeEmitters?.map((entry) => ({
        emitterNodeName: entry.emitterNodeName,
        frameCount: entry.runtimeFrames?.length ?? 0,
        maxActiveParticleCount: Math.max(
          0,
          ...(entry.runtimeFrames?.map(
            (frame) => frame.runtimeState.activeParticleIds.length
          ) ?? [])
        ),
        finalActiveParticleCount:
          entry.runtimeFrames?.at(-1)?.runtimeState.activeParticleIds.length ?? 0
      })) ?? [],
    diagnosticCodes: diagnostics.map((entry) => entry.code)
  };

  await mkdir(publicRoot, { recursive: true });
  await mkdir(resolve(publicRoot, "scene/textures"), { recursive: true });
  await mkdir(resolve(sourceRoot, "scene/textures"), { recursive: true });
  const manifestOnly = process.env.VFX_ROW22_FIXTURE_MANIFEST_ONLY === "1";
  if (!manifestOnly) {
    await writeFileIfChanged(
      resolve(publicRoot, "payload.json"),
      JSON.stringify(payload)
    );
    await writeFileIfChanged(
      resolve(publicRoot, chunkRuntimePayloadResourceKey),
      JSON.stringify(chunkRuntimePayload)
    );
  }
  await writeFileIfChanged(
    resolve(publicRoot, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  await writeFileIfChanged(
    resolve(fixtureRoot, "fixture-manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  if (!manifestOnly) {
    for (const resource of wokResources) {
      await writeFile(resolve(sourceRoot, `${resource.resref}.wok`), resource.bytes);
    }
    await writeFile(resolve(sourceRoot, `${oracleAreaResref}.are`), oracleAreaBytes);
    for (const texture of fixtureTextureFiles) {
      const publicTexturePath = resolve(publicRoot, texture.resourceKey);
      await rm(publicTexturePath, { force: true });
      await copyFile(texture.path, publicTexturePath);
    }
    for (const model of areaModels) {
      await writeFile(resolve(publicRoot, model.resourceKey), model.converted.bytes);
      await writeFile(resolve(sourceRoot, `scene/${model.resref}.mdl`), model.bytes);
    }
    for (const texture of areaTextures) {
      await writeFile(resolve(publicRoot, texture.resourceKey), texture.bytes);
      await writeFile(
        resolve(sourceRoot, `scene/textures/${texture.resref}.tga`),
        texture.bytes
      );
    }
    await writeFile(resolve(publicRoot, chunkResourceKey), chunkGlb.bytes);
  }
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

interface AuroraTxiSamplerState {
  mipmap?: boolean;
  filter?: boolean;
  clamp?: 0 | 1 | 2 | 3;
  downsampleMin?: number;
  downsampleMax?: number;
  source: string;
}

function parseAuroraTxiSamplerState(bytes: Buffer, source: string): AuroraTxiSamplerState {
  const result: AuroraTxiSamplerState = { source };
  for (const rawLine of bytes.toString("utf8").split(/\r?\n/u)) {
    const line = rawLine.replace(/(?:#|\/\/).*$/u, "").trim();
    if (!line) continue;
    const [rawKey, rawValue] = line.split(/\s+/u, 2);
    if (!rawKey || rawValue === undefined) continue;
    const key = rawKey.toLowerCase();
    if (key === "mipmap") {
      result.mipmap = parseAuroraTxiBoolean(rawValue);
    } else if (key === "filter") {
      result.filter = parseAuroraTxiBoolean(rawValue);
    } else if (key === "clamp") {
      const clamp = Number.parseInt(rawValue, 10);
      if (clamp === 0 || clamp === 1 || clamp === 2 || clamp === 3) {
        result.clamp = clamp;
      }
    } else if (key === "downsamplemin") {
      result.downsampleMin = parseAuroraTxiNumber(rawValue);
    } else if (key === "downsamplemax") {
      result.downsampleMax = parseAuroraTxiNumber(rawValue);
    }
  }
  return result;
}

function parseAuroraTxiBoolean(value: string): boolean | undefined {
  const normalized = value.trim().toLowerCase();
  if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  return undefined;
}

function parseAuroraTxiNumber(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function requireResource(resource: Buffer | null, resourceName: string): Buffer {
  if (!resource) {
    throw new Error(`Required retail resource ${resourceName} was not found.`);
  }
  return resource;
}

async function writeFileIfChanged(
  path: string,
  content: Buffer | string
): Promise<boolean> {
  const nextBytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
  try {
    const currentBytes = await readFile(path);
    if (currentBytes.equals(nextBytes)) {
      return false;
    }
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      (error as NodeJS.ErrnoException).code !== "ENOENT"
    ) {
      throw error;
    }
  }
  await writeFile(path, nextBytes);
  return true;
}

function requireWalkmesh(
  walkmeshes: ReadonlyMap<string, ReturnType<typeof parseAuroraAsciiWokWalkmesh>>,
  resref: string
): ReturnType<typeof parseAuroraAsciiWokWalkmesh> {
  const walkmesh = walkmeshes.get(resref);
  if (!walkmesh) {
    throw new Error(`Parsed retail WOK ${resref} is missing.`);
  }
  if (walkmesh.diagnostics.length > 0) {
    throw new Error(
      `Retail WOK ${resref} produced diagnostics: ${walkmesh.diagnostics.map((entry) => entry.code).join(", ")}.`
    );
  }
  return walkmesh;
}

function resolveOracleAreaGlobalLighting(
  fields: ReadonlyArray<{ field: string; value: number }>
): {
  phase: "sun" | "moon";
  ambientColorPacked: number;
  ambientColorRgb: [number, number, number];
  diffuseColorPacked: number;
  diffuseColorRgb: [number, number, number];
  directionalPosition: [number, number, number];
} {
  const fieldsByName = new Map(fields.map((entry) => [entry.field, entry.value]));
  const phase = (fieldsByName.get("IsNight") ?? 0) > 0 ? "moon" : "sun";
  const ambientColorPacked = resolveRequiredAreaPackedColor(
    fieldsByName,
    phase === "moon" ? "MoonAmbientColor" : "SunAmbientColor"
  );
  const diffuseColorPacked = resolveRequiredAreaPackedColor(
    fieldsByName,
    phase === "moon" ? "MoonDiffuseColor" : "SunDiffuseColor"
  );
  return {
    phase,
    ambientColorPacked,
    ambientColorRgb: decodeAreaPackedColor(ambientColorPacked),
    diffuseColorPacked,
    diffuseColorRgb: decodeAreaPackedColor(diffuseColorPacked),
    directionalPosition:
      phase === "moon" ? [-0.35, 0.72, -0.5] : [0.45, 1, 0.35]
  };
}

function resolveRequiredAreaPackedColor(
  fieldsByName: ReadonlyMap<string, number>,
  field: string
): number {
  const value = fieldsByName.get(field);
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Retail ARE field ${field} is missing.`);
  }
  return Math.trunc(value) >>> 0;
}

function decodeAreaPackedColor(value: number): [number, number, number] {
  return [
    (value & 0xff) / 255,
    ((value >> 8) & 0xff) / 255,
    ((value >> 16) & 0xff) / 255
  ];
}

type ProofSceneTileLightChannel =
  | "mainLight1"
  | "mainLight2"
  | "sourceLight1"
  | "sourceLight2";

interface ProofSceneTileLightEntry {
  channel: ProofSceneTileLightChannel;
  role: "main" | "source";
  rowId: number;
  colorRgb: [number, number, number];
  colorSource: string;
  colorSourceSha256: string;
  rendererStatus:
    | "source-node-resolved"
    | "source-node-absent-by-aurora-slot-count"
    | "source-node-unresolved"
    | "main-native-node-resolved"
    | "main-native-node-unresolved";
  sourceNode?: {
    name: string;
    position: [number, number, number];
    coordinateSpace: "model-local-aurora-z-up";
  };
  sourceSlotIndex?: 1 | 2;
  sourceNodeCount?: number;
  sourceSlotProofStatus?: "source-backed-tile-mdl-source-light-slot-count";
  sourceRadius?: number;
  sourceRadiusUnits?: "aurora-model-units";
  sourceMultiplier?: number;
  sourceMultiplierStatus?: string;
  nativeNode?: {
    name: string;
    position: [number, number, number];
    coordinateSpace: "model-local-aurora-z-up";
    radius: number;
    multiplier: number;
    lightPriority?: number;
    ambientOnly?: boolean;
    dynamicType?: number;
    affectDynamic?: boolean;
    shadow?: boolean;
    sourceModelFileName: string;
    sourceModelObjectKey: string;
    sourceModelHash: string;
    proofStatus: "source-backed-tile-mdl-native-main-light";
  };
}

interface ProofSceneSourceHierarchyNode {
  name: string;
  nodeType: string;
  parentName?: string;
  position: [number, number, number];
  scale: number;
}

function parseProofSceneTileLightColorLookup(
  bytes: Buffer,
  tableName: "lightcolor.2da" | "tilecolor.2da"
): Map<number, [number, number, number]> {
  const table = parseAuroraTwoDaTable(bytes, {
    tableName,
    profile: "vfx-row22-proof-scene-tile-lighting",
    sourceObjectKey: `${nwnBaseKeyPath}/${tableName}`,
    sourceLayer: "vanilla",
    sourceHash: sha256(bytes)
  });
  const lookup = new Map<number, [number, number, number]>();
  table.rows.forEach((row) => {
    const color = (["red", "green", "blue"] as const).map((channel) => {
      const cell = row.cells.find(
        (candidate) => candidate.column.trim().toLowerCase() === channel
      );
      const value = Number(cell?.value);
      return Number.isFinite(value) ? value : Number.NaN;
    }) as [number, number, number];
    if (color.every(Number.isFinite)) {
      lookup.set(row.rowId, color);
    }
  });
  return lookup;
}

function parseProofSceneTileSourceLightColorLookup(
  bytes: Buffer
): Map<number, [number, number, number]> {
  const parsed = parseAuroraMdlVfxSource(bytes, {
    sourceModelObjectKey: nwnBaseKeyPath,
    sourceModelFileName: "fx_flame01.mdl",
    sourceModelHash: sha256(bytes)
  });
  const light = parsed.lights.find(
    (candidate) => candidate.nodeName.trim().toLowerCase() === "auroralight01"
  );
  if (!light) {
    throw new Error("fx_flame01.mdl AuroraLight01 is missing.");
  }
  const lookup = new Map<number, [number, number, number]>();
  for (const animation of light.animations ?? []) {
    const animationName = animation.animationName.trim();
    if (!/^\d+$/u.test(animationName)) {
      continue;
    }
    const rowId = Number(animationName);
    const color = animation.colorTimeline?.[0]?.value ?? light.color;
    if (
      Number.isInteger(rowId) &&
      rowId > 0 &&
      color?.length === 3 &&
      color.every((value) => Number.isFinite(value))
    ) {
      lookup.set(rowId, [...color] as [number, number, number]);
    }
  }
  return lookup;
}

function buildProofSceneTileLights(input: {
  tile: ParsedAreaTileBlueprint;
  modelName: string;
  sourceHierarchy: readonly ProofSceneSourceHierarchyNode[];
  nativeLights: ReturnType<typeof parseAuroraMdlVfxSource>["lights"];
  sourceModelFileName: string;
  sourceModelObjectKey: string;
  sourceModelHash: string;
  mainLightColors: ReadonlyMap<number, [number, number, number]>;
  sourceLightColors: ReadonlyMap<number, [number, number, number]>;
  mainLightColorSource: string;
  mainLightColorSourceSha256: string;
  sourceLightColorSource: string;
  sourceLightColorSourceSha256: string;
}): ProofSceneTileLightEntry[] {
  const references = [
    {
      channel: "mainLight1" as const,
      role: "main" as const,
      rowId: input.tile.mainLight1,
      colors: input.mainLightColors,
      colorSource: input.mainLightColorSource,
      colorSourceSha256: input.mainLightColorSourceSha256
    },
    {
      channel: "mainLight2" as const,
      role: "main" as const,
      rowId: input.tile.mainLight2,
      colors: input.mainLightColors,
      colorSource: input.mainLightColorSource,
      colorSourceSha256: input.mainLightColorSourceSha256
    },
    {
      channel: "sourceLight1" as const,
      role: "source" as const,
      rowId: input.tile.sourceLight1,
      colors: input.sourceLightColors,
      colorSource: input.sourceLightColorSource,
      colorSourceSha256: input.sourceLightColorSourceSha256
    },
    {
      channel: "sourceLight2" as const,
      role: "source" as const,
      rowId: input.tile.sourceLight2,
      colors: input.sourceLightColors,
      colorSource: input.sourceLightColorSource,
      colorSourceSha256: input.sourceLightColorSourceSha256
    }
  ];

  const entries: ProofSceneTileLightEntry[] = [];
  for (const reference of references) {
    if (
      typeof reference.rowId !== "number" ||
      !Number.isInteger(reference.rowId) ||
      reference.rowId <= 0
    ) {
      continue;
    }
    const colorRgb = reference.colors.get(reference.rowId);
    if (!colorRgb) {
      throw new Error(
        `${reference.colorSource} row ${reference.rowId} required by ARE tile ${input.tile.index} is missing.`
      );
    }
    if (reference.role === "main") {
      const nativeNode = resolveProofSceneTileMainLightNode(
        input.nativeLights,
        input.modelName,
        reference.channel,
        input.sourceModelFileName,
        input.sourceModelObjectKey,
        input.sourceModelHash
      );
      entries.push({
        channel: reference.channel,
        role: reference.role,
        rowId: reference.rowId,
        colorRgb,
        colorSource: reference.colorSource,
        colorSourceSha256: reference.colorSourceSha256,
        rendererStatus: nativeNode
          ? "main-native-node-resolved" as const
          : "main-native-node-unresolved" as const,
        ...(nativeNode ? { nativeNode } : {})
      });
      continue;
    }

    const sourceNode = resolveProofSceneTileSourceNode(
      input.sourceHierarchy,
      input.modelName,
      reference.channel
    );
    const sourceSlotIndex = reference.channel === "sourceLight1" ? 1 : 2;
    const sourceNodeCount = countProofSceneTileSourceNodes(
      input.sourceHierarchy,
      input.modelName
    );
    entries.push({
      channel: reference.channel,
      role: reference.role,
      rowId: reference.rowId,
      colorRgb,
      colorSource: reference.colorSource,
      colorSourceSha256: reference.colorSourceSha256,
      rendererStatus: sourceNode
        ? "source-node-resolved" as const
        : "source-node-absent-by-aurora-slot-count" as const,
      sourceSlotIndex,
      sourceNodeCount,
      sourceSlotProofStatus: "source-backed-tile-mdl-source-light-slot-count",
      ...(sourceNode
        ? {
            sourceNode: {
              name: sourceNode.name,
              position: [...sourceNode.position] as [number, number, number],
              coordinateSpace: "model-local-aurora-z-up" as const
            }
          }
        : {}),
      sourceRadius: 7,
      sourceRadiusUnits: "aurora-model-units" as const,
      sourceMultiplier: 1,
      sourceMultiplierStatus:
        "nwmain.exe PartLight::PartLight 0x140087ea2 default multiplier 1.0"
    });
  }
  return entries;
}

function resolveProofSceneTileMainLightNode(
  lights: ReturnType<typeof parseAuroraMdlVfxSource>["lights"],
  modelName: string,
  channel: "mainLight1" | "mainLight2",
  sourceModelFileName: string,
  sourceModelObjectKey: string,
  sourceModelHash: string
): ProofSceneTileLightEntry["nativeNode"] | null {
  const slot = channel === "mainLight1" ? "ml1" : "ml2";
  const normalizedModel = normalizeProofSceneSourceNodeName(modelName);
  const light = lights.find((candidate) => {
    const normalizedName = normalizeProofSceneSourceNodeName(candidate.nodeName);
    return normalizedName === `${normalizedModel}${slot}` || normalizedName.endsWith(slot);
  });
  const position = light?.transform?.position;
  if (
    !light ||
    !position ||
    position.length !== 3 ||
    position.some((value) => !Number.isFinite(value)) ||
    typeof light.radius !== "number" ||
    !Number.isFinite(light.radius) ||
    light.radius <= 0
  ) {
    return null;
  }
  return {
    name: light.nodeName,
    position: [...position] as [number, number, number],
    coordinateSpace: "model-local-aurora-z-up",
    radius: light.radius,
    multiplier:
      typeof light.multiplier === "number" && Number.isFinite(light.multiplier)
        ? light.multiplier
        : 1,
    ...(typeof light.lightPriority === "number" && Number.isFinite(light.lightPriority)
      ? { lightPriority: light.lightPriority }
      : {}),
    ...(typeof light.ambientOnly === "boolean"
      ? { ambientOnly: light.ambientOnly }
      : {}),
    ...(typeof light.dynamicType === "number" && Number.isFinite(light.dynamicType)
      ? { dynamicType: light.dynamicType }
      : {}),
    ...(typeof light.affectDynamic === "boolean"
      ? { affectDynamic: light.affectDynamic }
      : {}),
    ...(typeof light.shadow === "boolean" ? { shadow: light.shadow } : {}),
    sourceModelFileName,
    sourceModelObjectKey,
    sourceModelHash,
    proofStatus: "source-backed-tile-mdl-native-main-light"
  };
}

function resolveProofSceneTileSourceNode(
  sourceHierarchy: readonly ProofSceneSourceHierarchyNode[],
  modelName: string,
  channel: "sourceLight1" | "sourceLight2"
): ProofSceneSourceHierarchyNode | null {
  const slot = channel === "sourceLight1" ? "1" : "2";
  const normalizedRoot = normalizeProofSceneSourceNodeName(modelName);
  return sourceHierarchy.find((node) => {
    const normalizedName = normalizeProofSceneSourceNodeName(node.name);
    const normalizedParent = normalizeProofSceneSourceNodeName(
      node.parentName ?? ""
    );
    const sourceNameMatches =
      normalizedName === `sourcelight${slot}` ||
      normalizedName.endsWith(`sl${slot}`);
    return (
      node.nodeType.trim().toLowerCase() === "dummy" &&
      sourceNameMatches &&
      normalizedParent === normalizedRoot
    );
  }) ?? null;
}

function countProofSceneTileSourceNodes(
  sourceHierarchy: readonly ProofSceneSourceHierarchyNode[],
  modelName: string
): number {
  const normalizedRoot = normalizeProofSceneSourceNodeName(modelName);
  return sourceHierarchy.filter((node) => {
    const normalizedName = normalizeProofSceneSourceNodeName(node.name);
    const normalizedParent = normalizeProofSceneSourceNodeName(
      node.parentName ?? ""
    );
    return (
      node.nodeType.trim().toLowerCase() === "dummy" &&
      (normalizedName === "sourcelight1" ||
        normalizedName === "sourcelight2" ||
        /sl[12]$/u.test(normalizedName)) &&
      normalizedParent === normalizedRoot
    );
  }).length;
}

function normalizeProofSceneSourceNodeName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function resolvePositionBounds(
  positions: ReadonlyArray<{ x: number; y: number; z: number }>
): {
  minimum: { x: number; y: number; z: number };
  maximum: { x: number; y: number; z: number };
} | null {
  if (positions.length === 0) {
    return null;
  }
  return {
    minimum: {
      x: Math.min(...positions.map((entry) => entry.x)),
      y: Math.min(...positions.map((entry) => entry.y)),
      z: Math.min(...positions.map((entry) => entry.z))
    },
    maximum: {
      x: Math.max(...positions.map((entry) => entry.x)),
      y: Math.max(...positions.map((entry) => entry.y)),
      z: Math.max(...positions.map((entry) => entry.z))
    }
  };
}

function resolveImpactAnimationLengthSeconds(
  model: ReturnType<typeof parseAuroraMdlVfxSource>,
  convertedAnimations:
    | ReturnType<typeof convertAuroraMdlToGlb>["sourceAnimations"]
    | undefined
): number {
  const lengths = new Set(
    [
      ...model.emitters.flatMap((emitter) =>
        emitter.animationPasses
          ?.filter((pass) => pass.animationName === "impact")
          .map((pass) => pass.lengthSeconds)
          .filter((value): value is number => typeof value === "number" && value > 0) ?? []
      ),
      ...(convertedAnimations ?? [])
        .filter((animation) => animation.name.trim().toLowerCase() === "impact")
        .map((animation) => animation.length)
        .filter((value): value is number => typeof value === "number" && value > 0)
    ]
  );
  if (lengths.size !== 1) {
    throw new Error(
      `Expected one positive impact length for the Chunk source model; received ${[...lengths].join(", ")}.`
    );
  }
  return [...lengths][0]!;
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
