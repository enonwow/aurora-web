import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildDefaultRuntimeSettings } from "../src/modules/runtime-settings/domain/runtime-settings.defaults";
import { convertAuroraMdlToGlb } from "../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";
import { VfxApplicationService } from "../src/modules/vfx/application/vfx.application.service";
import type {
  VfxProcessCommand,
  VfxResourceTraceInput
} from "../src/modules/vfx/application/vfx-processing.types";
import { parseAuroraMdlVfxSource } from "../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import { parseAuroraTextureTxiSourceState } from "../src/modules/vfx/domain/aurora-vfx-texture-txi-source.parser";

const repoRoot = resolve(__dirname, "../..");
const fixtureRoot = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28"
);
const sourceRoot = resolve(fixtureRoot, "sources");
const publicRoot = resolve(repoRoot, "frontend/public/dev-fixtures/vfx-nwn-web-row28");
const row22PublicRoot = resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-nwn-web-row22"
);
const modelPath = resolve(sourceRoot, "vff_rainmeteor.mdl");
const sourceTablePath = resolve(sourceRoot, "visualeffects.2da");
const chunkModelPath = resolve(sourceRoot, "fx_meteor.mdl");
const sourceModelResourceKey = "vff_rainmeteor.glb";
const chunkResourceKey = "fx_meteor.glb";
const chunkRuntimePayloadResourceKey = "fx_meteor.runtime.json";
const RETAIL_PROOF_SIMULATION_STEP_SECONDS = 1 / 60;
const PROOF_SERIALIZED_FRAME_STRIDE = 2;
const MAX_PROOF_PAYLOAD_BYTES = 128 * 1024 * 1024;
// Deterministic replay seed for the immutable proof profile. The retail RNG
// state is not recoverable from the recorded MP4, so this is presentation data
// and must never become an asset-specific runtime behavior branch.
const seed = 523795;
const proofCameraPositionThreeWorld = [0.05148, 6.051473, -4.371987] as const;
// The proof-scene tile translations are already rebased by the exact saved
// Area effect location. Keep the VFX owner at that source-backed local origin;
// a luminance-centroid delta is an image measurement, not an Aurora transform.
const proofEffectOriginAlignmentAuroraXyz = [0, 0, 0] as const;
const proofRuntimeCameraPositionAurora =
  resolveAuroraCameraRelativeToMirroredProofOwner(
    proofCameraPositionThreeWorld,
    proofEffectOriginAlignmentAuroraXyz
  );
const proofRuntimeCameraSourceEvidence = [
  "backend/docs/aurora-reverse/vfx-row28-runtime-camera-context-audit-2026-08-24.md",
  "backend/docs/aurora-reverse/vfx-particle-deadspace-camera-orientation-audit-2026-08-13.md",
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/nwn-row28-baseline.png"
] as const;
const expectedModelHash =
  "ea57f0346166314602d9d473873cedde791f9911ef90722c114481a0b6ebf29b";
const expectedTableHash =
  "acefe76f7fb14e88916ae1ade40dd5108b8a2f601eaada82a67f751b4eb56ea2";
const expectedChunkHash =
  "43e6b33c5a7380a31266601db7444b80a5252c9bfc559ad91c5d8582ee90f93c";
const textureRefs = [
  "chunk64",
  "fxpa_flame02",
  "fxpa_flstrk",
  "fxpa_ringwave",
  "fxpa_Smoke01",
  "fxpa_starbnw",
  "fxpa_FireBb"
] as const;

async function main(): Promise<void> {
  const [modelBytes, sourceTableBytes, chunkModelBytes] = await Promise.all([
    readFile(modelPath),
    readFile(sourceTablePath),
    readFile(chunkModelPath)
  ]);
  const modelHash = sha256(modelBytes);
  const sourceTableHash = sha256(sourceTableBytes);
  const chunkModelHash = sha256(chunkModelBytes);
  if (
    modelHash !== expectedModelHash ||
    sourceTableHash !== expectedTableHash ||
    chunkModelHash !== expectedChunkHash
  ) {
    throw new Error("Row28 retail source identity drifted from the admitted hashes.");
  }

  const parsedModel = parseAuroraMdlVfxSource(modelBytes, {
    sourceModelObjectKey: "proof/vfx-nwn-web-row28/vff_rainmeteor.mdl",
    sourceModelFileName: "vff_rainmeteor.mdl",
    sourceModelHash: modelHash
  });
  const parsedChunkModel = parseAuroraMdlVfxSource(chunkModelBytes, {
    sourceModelObjectKey: "proof/vfx-nwn-web-row28/fx_meteor.mdl",
    sourceModelFileName: "fx_meteor.mdl",
    sourceModelHash: chunkModelHash
  });
  const sourceModelGlb = convertAuroraMdlToGlb(modelBytes);
  const chunkGlb = convertAuroraMdlToGlb(chunkModelBytes);
  if (
    parsedModel.emitters.length !== 11 ||
    parsedModel.lights.length !== 1 ||
    parsedModel.staticGeometryNodes.length !== 12
  ) {
    throw new Error("Row28 vff_rainmeteor source graph no longer matches 11/1/12.");
  }
  if (
    parsedChunkModel.emitters.length !== 4 ||
    parsedChunkModel.staticGeometryNodes.length !== 0
  ) {
    throw new Error("Row28 fx_meteor must remain an emitter-only 4/0 source model.");
  }

  const animationLengthSeconds = resolveImpactAnimationLengthSeconds(
    parsedModel,
    sourceModelGlb.sourceAnimations
  );
  const dtSeconds = RETAIL_PROOF_SIMULATION_STEP_SECONDS;
  const animationTickCount = Math.max(
    1,
    Math.round(animationLengthSeconds / dtSeconds)
  );
  const maximumParticleLifetimeSeconds = maximumParticleLifetime(parsedModel);
  const tailTickCount = Math.ceil(maximumParticleLifetimeSeconds / dtSeconds) + 1;
  const tickCount = animationTickCount + tailTickCount;
  const chunkAnimationLengthSeconds = resolveImpactAnimationLengthSeconds(
    parsedChunkModel,
    chunkGlb.sourceAnimations
  );
  const chunkAnimationTickCount = Math.max(
    1,
    Math.round(chunkAnimationLengthSeconds / dtSeconds)
  );
  const chunkMaximumParticleLifetimeSeconds = maximumParticleLifetime(parsedChunkModel);
  const chunkTailTickCount =
    Math.ceil(chunkMaximumParticleLifetimeSeconds / dtSeconds) + 1;
  const chunkTickCount = chunkAnimationTickCount + chunkTailTickCount;
  const textures = await loadSourceTextures();
  const textureByRef = new Map(
    textures.map((texture) => [texture.resref.toLowerCase(), texture] as const)
  );

  const service = new VfxApplicationService({
    get: async () => buildDefaultRuntimeSettings("2026-08-17T00:00:00.000Z"),
    save: async () => undefined
  });
  const rootCommand: VfxProcessCommand = {
    packageKind: "model_graph_runtime",
    sourceTableText: sourceTableBytes.toString("latin1"),
    sourceObjectKey: "proof/vfx-nwn-web-row28/visualeffects.2da",
    sourceLayer: "vanilla",
    sourceRowId: 28,
    effectInstance: {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 28,
      applicationMode: "location",
      durationType: "instant",
      targetRef: "retail-capture-location"
    },
    sourceEmitters: parsedModel.emitters,
    sourceAnimationEvents: parsedModel.animationEvents,
    sourceModelGraph: parsedModel.modelGraph,
    resourceTraces: [
      createResourceTrace({
        resourceClass: "chunk_model",
        resref: "fx_meteor",
        ownerPath: "mdl:vff_rainmeteor.mdl/emitter:OmenEmitter02/chunkName",
        resourceKey: chunkResourceKey,
        sourcePath: "retail/models/fx_meteor.mdl",
        resourceHash: chunkModelHash
      }),
      ...parsedModel.emitters.flatMap((emitter) => {
        const texture = textureByRef.get((emitter.texture ?? "").toLowerCase());
        return texture
          ? [
              createResourceTrace({
                resourceClass: "texture",
                resref: texture.resref,
                ownerPath: `mdl:vff_rainmeteor.mdl/emitter:${emitter.nodeName}/texture`,
                resourceKey: texture.resourceKey,
                sourcePath: `retail/textures/${texture.resref}.tga`,
                resourceHash: texture.sha256
              })
            ]
          : [];
      })
    ],
    runtime: createRuntimeSettings({
      dtSeconds,
      tickCount,
      animationLengthSeconds,
      animationTickCount,
      seed,
      profileId: "vfx-nwn-web-row28-proof",
      cameraPosition: proofRuntimeCameraPositionAurora,
      cameraContextSource: "proof-calibrated-camera-relative-to-vfx-owner"
    }),
    bypassCache: true,
    includeBenchmarkMetadata: false
  };
  const childResourceTraces = parsedChunkModel.emitters.flatMap((emitter) => {
    const texture = textureByRef.get((emitter.texture ?? "").toLowerCase());
    return texture
      ? [
          createResourceTrace({
            resourceClass: "texture",
            resref: texture.resref,
            ownerPath: `mdl:fx_meteor.mdl/emitter:${emitter.nodeName}/texture`,
            resourceKey: texture.resourceKey,
            sourcePath: `retail/textures/${texture.resref}.tga`,
            resourceHash: texture.sha256
          })
        ]
      : [];
  });
  const childCommand = {
    packageKind: "model_graph_runtime",
    sourceObjectKey: "proof/vfx-nwn-web-row28/fx_meteor.mdl",
    sourceLayer: "vanilla",
    sourceEmitters: parsedChunkModel.emitters,
    sourceAnimationEvents: parsedChunkModel.animationEvents,
    sourceModelGraph: parsedChunkModel.modelGraph,
    resourceTraces: childResourceTraces
  } satisfies Omit<
    VfxProcessCommand,
    "runtime" | "bypassCache" | "includeBenchmarkMetadata"
  >;
  const envelope = await service.processVfxRuntimeTree({
    rootCommand,
    childModels: [
      {
        requestedRef: "fx_meteor",
        command: childCommand,
        animation: {
          animationName: "impact",
          lengthSeconds: chunkAnimationLengthSeconds
        }
      }
    ]
  });
  // This resource payload carries the immutable child model graph/material
  // dependencies. Live proof particles use their scheduler-bound frame from
  // the root runtime tree and never clone this fallback simulation.
  const chunkEnvelope = await service.processVfxPackage({
    ...childCommand,
    runtime: createRuntimeSettings({
      dtSeconds,
      tickCount: chunkTickCount,
      animationLengthSeconds: chunkAnimationLengthSeconds,
      animationTickCount: chunkAnimationTickCount,
      seed,
      profileId: "vfx-child-model-resource-payload-fallback"
    }),
    bypassCache: true,
    includeBenchmarkMetadata: false
  });

  const runtime = {
    ...envelope.vfx,
    runtimeEmitters: envelope.vfx.runtimeEmitters?.map((entry) => ({
      ...entry,
      runtimeFrames: sampleRuntimeFrames(
        entry.runtimeFrames ?? [],
        PROOF_SERIALIZED_FRAME_STRIDE
      )
    }))
  };
  const chunkRuntime = {
    ...chunkEnvelope.vfx,
    runtimeEmitters: chunkEnvelope.vfx.runtimeEmitters?.map((entry) => ({
      ...entry,
      runtimeFrames: sampleRuntimeFrames(
        entry.runtimeFrames ?? [],
        PROOF_SERIALIZED_FRAME_STRIDE
      )
    }))
  };
  const payload = createPayload({
    runtime,
    parsedModel,
    sourceResRef: "vff_rainmeteor",
    effectInstanceId: "vfx-nwn-web-row28",
    sourceProfile: "nwn-ee-retail-key-bif-row28-source-backed-proof",
    runtimeProfile: "retail-impact-99-ticks-native-oracle-seed-523795"
  });
  const chunkRuntimePayload = createPayload({
    runtime: chunkRuntime,
    parsedModel: parsedChunkModel,
    sourceResRef: "fx_meteor",
    effectInstanceId: "vfx-nwn-web-row28-chunk-model-runtime",
    sourceProfile: "nwn-ee-retail-key-bif-row28-fx-meteor-runtime",
    runtimeProfile: "retail-impact-child-model-runtime-source-backed"
  });
  const payloadJson = JSON.stringify(payload);
  const chunkRuntimePayloadJson = JSON.stringify(chunkRuntimePayload);
  const payloadBytes = Buffer.byteLength(payloadJson, "utf8");
  if (payloadBytes > MAX_PROOF_PAYLOAD_BYTES) {
    throw new Error(
      `Row28 proof payload exceeds the bounded transport budget: ${payloadBytes} > ${MAX_PROOF_PAYLOAD_BYTES}.`
    );
  }
  const proofScene = await prepareDiagnosticProofScene();
  const manifest = {
    version: "aurora-vfx-nwn-web-fixture/v1",
    fixtureId: "vfx-nwn-web-row28",
    viewProfile: {
      projection: "perspective",
      viewportWidth: 1460,
      viewportHeight: 810,
      cameraHalfWidth: 0,
      cameraHalfHeight: 0,
      perspectiveFovDegrees: 39.46380817873839,
      cameraPosition: proofCameraPositionThreeWorld,
      cameraUp: [0, 1, 0],
      cameraLookAt: [0.03482, 0.01, 3.737955],
      cameraViewOffsetPixels: [70, 50],
      receiverSize: [13, 7.2],
      receiverPosition: [0, 0.4, -0.34],
      receiverRotationX: 0,
      targetRadius: 0.28,
      targetLength: 1.15,
      targetPosition: [0, 0.85, -0.16],
      cameraStatus:
        "accepted-row28-native-baseline-reuses-same-area-camera-and-exact-native-viewport",
      cameraSourceEvidence: [
        "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/nwn/nwn-row22-one-trigger-validated-baseline.png",
        "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/source-preparation.json",
        "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/nwn-row28-baseline.png",
        "identical Area, module entry camera script, and proof workstation settings in the accepted row22 and row28 captures",
        "exact accepted row28 native capture viewport 1460x810",
        "exact retail camera pose not recovered"
      ],
      cameraCalibration: {
        status: "saved-retail-origin-and-planar-receiver-fit",
        sourceFrame:
          "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/nwn-row28-baseline.png",
        rmsTolerancePixels: 8,
        samples: [
          {
            worldPosition: [2.32, 0.01, 8.86],
            retailPixelPosition: [474.02042, 110.90669]
          },
          {
            worldPosition: [2.11, 0.01, 3.58],
            retailPixelPosition: [427.00955, 363.9312]
          },
          {
            worldPosition: [-3.32, 0.01, 3.54],
            retailPixelPosition: [1035.9949, 363.9639]
          },
          {
            worldPosition: [-3.16, 0.01, 9.02],
            retailPixelPosition: [915.98456, 110.93438]
          },
          {
            worldPosition: [0, 0.01, 0],
            retailPixelPosition: [667.0075, 710.0275]
          }
        ]
      }
    },
    lifecycle: "fire-and-forget",
    intentionalTriggerCount: 1,
    sourceRowId: 28,
    sourceLabel: "VFX_FNF_METEOR_SWEARM",
    publicConstant: "VFX_FNF_METEOR_SWARM",
    sourceModel: { path: modelPath, resref: "vff_rainmeteor", sha256: modelHash },
    sourceTable: { path: sourceTablePath, sha256: sourceTableHash },
    sourceRenderableModel: {
      version: "aurora-vfx-source-model-renderable/v1",
      resref: "vff_rainmeteor",
      resourceKey: sourceModelResourceKey,
      sourcePath: modelPath,
      sourceSha256: modelHash,
      sourceGeometryNodeCount: parsedModel.staticGeometryNodes.length,
      materialDependencies: sourceModelGlb.textureReferences.map((resref) =>
        materialDependency(resref, textureByRef)
      )
    },
    textures: textures.map((texture) => ({
      resref: texture.resref,
      path: texture.path,
      sha256: texture.sha256,
      resourceKey: texture.resourceKey,
      ...(texture.txiPath
        ? {
            txiPath: texture.txiPath,
            txiSha256: texture.txiSha256,
            txi: texture.txi
          }
        : {})
    })),
    chunks: [
      {
        resref: "fx_meteor",
        resourceKey: chunkResourceKey,
        sourcePath: chunkModelPath,
        sourceSha256: chunkModelHash,
        sourceStaticGeometryCount: parsedChunkModel.staticGeometryNodes.length,
        hostGraphLifecycle: "transient",
        runtimePayloadResourceKey: chunkRuntimePayloadResourceKey,
        runtimePayloadSourceModelObjectKey:
          "proof/vfx-nwn-web-row28/fx_meteor.mdl",
        sourceEmitterNames: parsedChunkModel.emitters.map((entry) => entry.nodeName),
        materialDependencies: chunkGlb.textureReferences.map((resref) =>
          materialDependency(resref, textureByRef)
        )
      }
    ],
    runtime: {
      animationName: "impact",
      animationLengthSeconds,
      animationTickCount,
      maximumParticleLifetimeSeconds,
      tailTickCount,
      dtSeconds,
      simulationStepSeconds: RETAIL_PROOF_SIMULATION_STEP_SECONDS,
      outputFrameStride: PROOF_SERIALIZED_FRAME_STRIDE,
      serializedFrameStepSeconds:
        RETAIL_PROOF_SIMULATION_STEP_SECONDS * PROOF_SERIALIZED_FRAME_STRIDE,
      simulationStepEvidence: [
        "Aurora Toolset decompilation FUN_00a31288/FUN_00a31ca4 consumes caller-provided delta time rather than a fixed MDL keyframe rate",
        "backend/scripts/prepare-vfx-web-broad-proof-fixtures.ts defines the shared retail proof simulation step as 1/60",
        "proof workstation settings.tml uses adaptive VSync and Win32_VideoController reports a 60 Hz active display"
      ],
      tickCount,
      durationSeconds: dtSeconds * tickCount,
      seed,
      cameraPosition: proofRuntimeCameraPositionAurora,
      cameraContextSource: "proof-calibrated-camera-relative-to-vfx-owner",
      cameraSourceEvidence: proofRuntimeCameraSourceEvidence
    },
    nativeOracleCalibration: {
      version: "aurora-vfx-native-oracle-calibration/v1",
      sourceEvidence:
        "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/calibration-v18-client-animation-rate/source-aligned-playback-calibration-summary.json",
      runtimeSeed: seed,
      runtimeSeedSelection:
        "deterministic-presentation-seed-native-state-unrecovered",
      runtimeSeedSourceEvidence:
        "backend/docs/aurora-reverse/vfx-retail-rng-seed-recoverability-audit-2026-08-25.md",
      additiveParticleRadianceScale: 1,
      bloomMultiplier: 1,
      viewportWidth: 1460,
      viewportHeight: 810,
      runtimePlaybackRate: 1,
      runtimePlaybackDelaySeconds: 0,
      runtimeTimingCalibrationMethod:
        "retail-client-source-animation-rate",
      nativeTriggerRelativeOnsetSeconds: 1,
      nativeTriggerRelativeLastVisibleSeconds: 3,
      sourceOnsetSeconds: 871 / 1728,
      sourceDynamicPeakSeconds: 589 / 432,
      sourceLastVisibleSeconds: 11147 / 3456
    },
    renderProfile: {
      runtimeFrameMaterialization: "lazy"
    },
    payloadTransport: {
      version: "aurora-vfx-proof-payload-transport/v1",
      payloadBytes,
      maximumPayloadBytes: MAX_PROOF_PAYLOAD_BYTES,
      runtimeFrameMaterialization: "lazy",
      childRenderFrameVersion:
        "aurora-vfx-child-render-contract-frame/v1",
      status: "within-bounded-proof-transport-budget"
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
        entry.animations?.find((animation) => animation.animationName === "impact") ??
        null
    })),
    runtimeFrameCounts: runtime.runtimeEmitters?.map((entry) => ({
      emitterNodeName: entry.emitterNodeName,
      frameCount: entry.runtimeFrames?.length ?? 0,
      maxActiveParticleCount: Math.max(
        0,
        ...(entry.runtimeFrames?.map(
          (frame) => frame.runtimeState.activeParticleIds.length
        ) ?? [])
      )
    })),
    comparisonContext: {
      cameraMatchEstablished: false,
      sceneMatchEstablished: false,
      ownerTargetMatchEstablished: true,
      comparisonStatus:
        "source-backed-row28-effect-and-location-context-row22-retail-area-reused-exact-row28-retail-camera-and-scene-oracle-not-captured"
    },
    proofScene,
    cameraClientEvent: {
      status: "source-preserved-runtime-camera-path-unmapped",
      shakeType: 2,
      delaySeconds: 0.1,
      durationSeconds: 3.4,
      diagnosticCode: "VFX_2DA_SHAKE_CLIENT_EVENT_UNMAPPED"
    },
    diagnosticCodes: runtime.diagnostics.map((entry) => entry.code)
  };

  await mkdir(publicRoot, { recursive: true });
  await Promise.all([
    writeFile(resolve(publicRoot, "payload.json"), payloadJson),
    writeFile(resolve(publicRoot, "manifest.json"), JSON.stringify(manifest, null, 2)),
    writeFile(resolve(fixtureRoot, "fixture-manifest.json"), JSON.stringify(manifest, null, 2)),
    writeFile(resolve(publicRoot, sourceModelResourceKey), sourceModelGlb.bytes),
    writeFile(resolve(publicRoot, chunkResourceKey), chunkGlb.bytes),
    writeFile(
      resolve(publicRoot, chunkRuntimePayloadResourceKey),
      chunkRuntimePayloadJson
    ),
    ...textures.map((texture) =>
      copyFile(texture.path, resolve(publicRoot, texture.resourceKey))
    )
  ]);
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

function createRuntimeSettings(input: {
  dtSeconds: number;
  tickCount: number;
  animationLengthSeconds: number;
  animationTickCount: number;
  seed: number;
  profileId: string;
  cameraPosition?: { x: number; y: number; z: number };
  cameraContextSource?: "proof-calibrated-camera-relative-to-vfx-owner";
}) {
  return {
    dtSeconds: input.dtSeconds,
    tickCount: input.tickCount,
    executionParticleBudget: 8192,
    seed: input.seed,
    ...(input.cameraPosition && input.cameraContextSource
      ? {
          cameraPosition: input.cameraPosition,
          cameraContextSource: input.cameraContextSource
        }
      : {}),
    animation: {
      animationName: "impact",
      previousTimeSeconds: 0,
      currentTimeSeconds: input.animationLengthSeconds,
      blendWeight: 1,
      playbackTickCount: input.animationTickCount
    },
    windManager: {
      profileId: input.profileId,
      noiseSeed: input.seed,
      globalWindVector: { x: 0, y: 0, z: 0 },
      variationYawRadians: 0,
      variationPitchRadians: 0,
      noisePeriodSeconds: 1
    }
  };
}

function resolveAuroraCameraRelativeToMirroredProofOwner(
  cameraWorldThree: readonly [number, number, number],
  ownerOffsetAurora: readonly [number, number, number]
): { x: number; y: number; z: number } {
  const [cameraWorldX, cameraWorldY, cameraWorldZ] = cameraWorldThree;
  const [ownerAuroraX, ownerAuroraY, ownerAuroraZ] = ownerOffsetAurora;
  // The production Area frame mirrors Three X once. Invert that frame,
  // subtract the VFX owner translation after C=(x,z,y), then convert the
  // camera-relative Three vector back to Aurora XYZ.
  const relativeThreeX = -cameraWorldX - ownerAuroraX;
  const relativeThreeY = cameraWorldY - ownerAuroraZ;
  const relativeThreeZ = cameraWorldZ - ownerAuroraY;
  return {
    x: relativeThreeX,
    y: relativeThreeZ,
    z: relativeThreeY
  };
}

function sampleRuntimeFrames<T>(frames: T[], stride: number): T[] {
  const safeStride = Math.max(1, Math.trunc(stride));
  if (safeStride <= 1 || frames.length <= 2) return frames;
  const sampled = frames.filter((_, index) => index % safeStride === 0);
  const finalFrame = frames.at(-1);
  if (finalFrame !== undefined && sampled.at(-1) !== finalFrame) {
    sampled.push(finalFrame);
  }
  return sampled;
}

function createPayload(input: {
  runtime: any;
  parsedModel: ReturnType<typeof parseAuroraMdlVfxSource>;
  sourceResRef: string;
  effectInstanceId: string;
  sourceProfile: string;
  runtimeProfile: string;
}) {
  const diagnostics = input.runtime.diagnostics.map((entry: any) => ({
    code: entry.code,
    severity: entry.severity,
    message: entry.message
  }));
  return {
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
      sourceRows: input.runtime.selectedSourceRow
        ? [input.runtime.selectedSourceRow]
        : [],
      effectInstance: input.runtime.effectInstance,
      phaseSchedule: input.runtime.phaseSchedule,
      dependencyGraph: input.runtime.dependencyGraph,
      runtimeEmitters: input.runtime.runtimeEmitters,
      runtimeState: input.runtime.runtimeState,
      renderContract: input.runtime.renderContract,
      runtimeSharedRng: input.runtime.runtimeSharedRng,
      sourceModelGraph: input.parsedModel.modelGraph,
      sourceMdlLights: input.parsedModel.lights,
      windManagerSnapshot: input.runtime.windManagerSnapshot
    },
    provenance: {
      backendPayloadVersion: input.runtime.version,
      sourceProfile: input.sourceProfile,
      sourceTable: "visualeffects.2da",
      sourceRowId: 28,
      sourceLabel:
        input.runtime.selectedSourceRow?.label ?? "VFX_FNF_METEOR_SWEARM",
      sourceResRef: input.sourceResRef,
      effectInstanceId: input.effectInstanceId,
      runtimeProfile: input.runtimeProfile,
      renderContractVersion: input.runtime.renderContract?.version
    }
  };
}

function createResourceTrace(input: {
  resourceClass: "texture" | "chunk_model";
  resref: string;
  ownerPath: string;
  resourceKey: string;
  sourcePath: string;
  resourceHash: string;
}): VfxResourceTraceInput {
  return {
    requestedResourceClass: input.resourceClass,
    requestedRef: input.resref,
    ownerPath: input.ownerPath,
    selectedCandidate: {
      sourceLayer: "vanilla",
      resourceKey: input.resourceKey,
      sourcePath: input.sourcePath,
      resourceHash: input.resourceHash,
      candidateId: `nwn-ee-retail-key-bif:${input.resref}`,
      precedenceRank: 0
    }
  };
}

async function loadSourceTextures() {
  return Promise.all(
    textureRefs.map(async (resref) => {
      const path = resolve(sourceRoot, `${resref}.tga`);
      const bytes = await readFile(path);
      const txiPath = resolve(sourceRoot, `${resref}.txi`);
      const hasTxi = await existsAsFile(txiPath);
      const txiBytes = hasTxi ? await readFile(txiPath) : undefined;
      return {
        resref,
        path,
        sha256: sha256(bytes),
        resourceKey: `${resref.toLowerCase()}.tga`,
        ...(txiBytes
          ? {
              txiPath,
              txiSha256: sha256(txiBytes),
              txi: parseAuroraTextureTxiSourceState(txiBytes, txiPath)
            }
          : {})
      };
    })
  );
}

async function prepareDiagnosticProofScene(): Promise<Record<string, unknown>> {
  const row22Manifest = JSON.parse(
    await readFile(resolve(row22PublicRoot, "manifest.json"), "utf8")
  ) as Record<string, any>;
  const row22Scene = row22Manifest.proofScene;
  if (!row22Scene || !Array.isArray(row22Scene.models) || !Array.isArray(row22Scene.textures)) {
    throw new Error("The admitted row22 source-backed proof scene is missing.");
  }
  for (const resource of [...row22Scene.models, ...row22Scene.textures]) {
    const resourceKey = String(resource.resourceKey ?? "");
    if (!resourceKey || resourceKey.includes("..")) {
      throw new Error(`Unsafe row28 proof-scene resource key '${resourceKey}'.`);
    }
    const destinationPath = resolve(publicRoot, resourceKey);
    if (!destinationPath.startsWith(publicRoot)) {
      throw new Error(`Unsafe row28 proof-scene destination '${destinationPath}'.`);
    }
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(resolve(row22PublicRoot, resourceKey), destinationPath);
  }
  return {
    ...row22Scene,
    meshFilter: "native-top-down-interior-visible-surfaces",
    meshVisibilityRule: {
      version: "nwn-vfx-proof-scene-mesh-visibility-rule/v1",
      kind: "model-y-maximum",
      maximumY: 1.3,
      comparisonAdmission: "comparison-scene",
      sourceEvidence:
        "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/validated-summary.json"
    },
    effectOriginAlignment: {
      offset: proofEffectOriginAlignmentAuroraXyz,
      sourceEvidence:
        "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/calibration-v6-source-time/source-time-calibration-summary.json",
      method: "source-location-rebased-scene-origin"
    },
    nativeBaselineLightingCalibration: {
      areaGlobalScale: 0,
      tileLocalScale: 0.45,
      sourceEvidence:
        "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/validated-summary.json",
      method: "matched-empty-scene-roi-luma-rmse",
      nativeRoiLumaMeans: [62.68, 52.52, 85.67],
      calibratedWebRoiLumaMeans: [62.74, 53.06, 88.02],
      roiLumaRmse: 1.39,
      viewport: [1460, 810],
      regions: [
        [900, 500, 1300, 700],
        [300, 20, 1100, 100],
        [500, 120, 900, 190]
      ]
    },
    status:
      "source-backed-row28-native-top-down-interior-visible-surfaces-from-identical-row22-area-source",
    sourceEvidence: [
      "frontend/public/dev-fixtures/vfx-nwn-web-row22/manifest.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/source-preparation.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/nwn-row28-baseline.png"
    ]
  };
}

function materialDependency(resref: string, textures: ReadonlyMap<string, any>) {
  const texture = textures.get(resref.toLowerCase());
  return texture
    ? {
        resref,
        status: "source-artifact-available",
        sourcePath: texture.path,
        sha256: texture.sha256
      }
    : {
        resref,
        status: "source-artifact-unresolved",
        reason: "No Aurora/NWN source texture artifact was supplied."
      };
}

function maximumParticleLifetime(
  model: ReturnType<typeof parseAuroraMdlVfxSource>
): number {
  return Math.max(
    0,
    ...model.emitters.flatMap((emitter) => [
      emitter.simulation?.lifeExp ?? 0,
      ...(emitter.animationPasses ?? []).map(
        (pass) => pass.emitterState?.simulation?.lifeExp ?? 0
      )
    ])
  );
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
          .filter(
            (value): value is number => typeof value === "number" && value > 0
          ) ?? []
      ),
      ...(convertedAnimations ?? [])
        .filter((animation) => animation.name.trim().toLowerCase() === "impact")
        .map((animation) => animation.length)
        .filter(
          (value): value is number => typeof value === "number" && value > 0
        )
    ].map((value) => Number(value.toFixed(6)))
  );
  if (lengths.size !== 1) {
    throw new Error(
      `Expected one positive impact length; received ${[...lengths].join(", ")}.`
    );
  }
  return [...lengths][0]!;
}

async function existsAsFile(pathValue: string): Promise<boolean> {
  try {
    return (await stat(pathValue)).isFile();
  } catch {
    return false;
  }
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
