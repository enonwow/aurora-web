import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildDefaultRuntimeSettings } from "../src/modules/runtime-settings/domain/runtime-settings.defaults";
import { VfxApplicationService } from "../src/modules/vfx/application/vfx.application.service";
import { parseAuroraMdlVfxSource } from "../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";

const repoRoot = resolve(__dirname, "../..");
const fixtureRoot = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row68"
);
const sourceRoot = resolve(fixtureRoot, "sources");
const publicRoot = resolve(repoRoot, "frontend/public/dev-fixtures/vfx-nwn-web-row68");
const row22PublicRoot = resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-nwn-web-row22"
);
const row216PublicRoot = resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-broad-row216"
);
const modelPath = resolve(sourceRoot, "vim_heal04.mdl");
const sourceTablePath = resolve(sourceRoot, "visualeffects.2da");
const nwnPreflightPath = resolve(fixtureRoot, "nwn/preflight.json");
const nwnSummaryPath = resolve(fixtureRoot, "nwn/summary.json");
const textureRefs = ["fxpa_flare", "fxpa_starbnw"] as const;
const animationTickCount = 79;
const seed = 680068;

async function main(): Promise<void> {
  const [modelBytes, sourceTableBytes, proofScene] = await Promise.all([
    readFile(modelPath),
    readFile(sourceTablePath),
    prepareRow68RetailProofScene()
  ]);
  const modelHash = sha256(modelBytes);
  const sourceTableHash = sha256(sourceTableBytes);
  const parsedModel = parseAuroraMdlVfxSource(modelBytes, {
    sourceModelObjectKey: "proof/vfx-nwn-web-row68/vim_heal04.mdl",
    sourceModelFileName: "vim_heal04.mdl",
    sourceModelHash: modelHash
  });
  if (parsedModel.emitters.length !== 4 || parsedModel.lights.length !== 1) {
    throw new Error(
      `Expected four emitters and one light; received ${parsedModel.emitters.length}/${parsedModel.lights.length}.`
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
      const path = resolve(sourceRoot, `${resref}.png`);
      const bytes = await readFile(path);
      return { resref, path, bytes, sha256: sha256(bytes) };
    })
  );
  const service = new VfxApplicationService({
    get: async () => buildDefaultRuntimeSettings("2026-07-14T00:00:00.000Z"),
    save: async () => undefined
  });
  const envelope = await service.processVfxPackage({
    packageKind: "model_graph_runtime",
    sourceTableText: sourceTableBytes.toString("latin1"),
    sourceObjectKey: "proof/vfx-nwn-web-row68/visualeffects.2da",
    sourceLayer: "vanilla",
    sourceRowId: 68,
    effectInstance: {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 68,
      applicationMode: "object",
      durationType: "instant",
      targetRef: "retail-capture-target"
    },
    sourceEmitters: parsedModel.emitters,
    sourceAnimationEvents: parsedModel.animationEvents,
    sourceModelGraph: parsedModel.modelGraph,
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
        profileId: "vfx-nwn-web-row68-proof",
        noiseSeed: seed,
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
      sourceProfile: "nwn-ee-retail-key-bif-row68-one-trigger-proof",
      sourceTable: "visualeffects.2da",
      sourceRowId: 68,
      sourceLabel: runtime.selectedSourceRow?.label ?? "VFX_IMP_HEALING_M",
      sourceResRef: "vim_heal04",
      effectInstanceId: "vfx-nwn-web-row68",
      runtimeProfile: "retail-impact-79-ticks-seed-680068",
      renderContractVersion: runtime.renderContract?.version
    }
  };
  const manifest = {
    version: "aurora-vfx-nwn-web-fixture/v1",
    fixtureId: "vfx-nwn-web-row68",
    lifecycle: "fire-and-forget",
    intentionalTriggerCount: 1,
    sourceRowId: 68,
    sourceLabel: "VFX_IMP_HEALING_M",
    sourceModel: { path: modelPath, sha256: modelHash },
    sourceTable: { path: sourceTablePath, sha256: sourceTableHash },
    textures: textureFiles.map((entry) => ({
      resref: entry.resref,
      path: entry.path,
      sha256: entry.sha256
    })),
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
    comparisonContext: {
      cameraMatchEstablished: false,
      sceneMatchEstablished: false,
      ownerTargetMatchEstablished: true,
      comparisonStatus:
        "source-backed-exact-module-area-bic-target-and-context-actor-with-calibrated-camera-exact-camera-pixel-parity-open"
    },
    proofScene,
    diagnosticCodes: diagnostics.map((entry) => entry.code)
  };

  await mkdir(publicRoot, { recursive: true });
  await writeFile(resolve(publicRoot, "payload.json"), JSON.stringify(payload));
  await writeFile(resolve(publicRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(resolve(fixtureRoot, "fixture-manifest.json"), JSON.stringify(manifest, null, 2));
  for (const texture of textureFiles) {
    await copyFile(texture.path, resolve(publicRoot, `${texture.resref}.png`));
  }
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

async function prepareRow68RetailProofScene(): Promise<Record<string, unknown>> {
  const [row22Manifest, row216Manifest, nwnPreflight, nwnSummary] =
    await Promise.all([
      readJsonFile<Record<string, unknown>>(resolve(row22PublicRoot, "manifest.json")),
      readJsonFile<Record<string, unknown>>(resolve(row216PublicRoot, "manifest.json")),
      readJsonFile<{
        sourceModule?: { path?: string; sha256?: string };
      }>(nwnPreflightPath),
      readJsonFile<{
        module?: { defaultBicSource?: string };
      }>(nwnSummaryPath)
    ]);
  const row22Scene = requiredProofScene(row22Manifest, "row22");
  const row216Scene = requiredProofScene(row216Manifest, "row216");
  const row22Origin = row22Scene.effectOrigin as
    | { x?: number; y?: number; z?: number }
    | undefined;
  const row216Actors = row216Scene.actors as Array<Record<string, unknown>> | undefined;
  const models = row22Scene.models as Array<Record<string, unknown>> | undefined;
  const textures = row22Scene.textures as Array<Record<string, unknown>> | undefined;
  const expectedModuleSha256 =
    "fda307d129f0c0e17411fb5820c6c528ee66e3a079202be5e8e38be781cff010";
  const expectedBicSha256 =
    "5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0";
  const defaultBicSource = nwnSummary.module?.defaultBicSource;

  if (
    nwnPreflight.sourceModule?.sha256 !== expectedModuleSha256 ||
    row22Origin?.x !== 9.5 ||
    row22Origin?.y !== 3.799999952316284 ||
    row22Origin?.z !== 0 ||
    models?.length !== 4 ||
    textures?.length !== 14 ||
    row216Actors?.length !== 2 ||
    !defaultBicSource
  ) {
    throw new Error("The admitted row68 retail proof-scene contract changed.");
  }
  const bicBytes = await readFile(defaultBicSource);
  if (
    sha256(bicBytes) !== expectedBicSha256 ||
    row216Actors[0]?.sourceBicSha256 !== expectedBicSha256
  ) {
    throw new Error("The exact row68 first-PC BIC identity changed.");
  }

  for (const resource of [...models, ...textures]) {
    const resourceKey = String(resource.resourceKey ?? "");
    if (!resourceKey || resourceKey.includes("..")) {
      throw new Error(`Unsafe row68 proof-scene resource key '${resourceKey}'.`);
    }
    const sourcePath = resolve(row22PublicRoot, resourceKey);
    const destinationPath = resolve(publicRoot, resourceKey);
    if (!destinationPath.startsWith(publicRoot)) {
      throw new Error(`Unsafe row68 proof-scene destination '${destinationPath}'.`);
    }
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
  }

  const [playerActor, innkeeperActor] = row216Actors;
  return {
    ...row22Scene,
    meshFilter: undefined,
    status: "source-backed-exact-row68-module-area-bic-target-and-context-actor",
    areaLighting: {
      ...(row22Scene.areaLighting as Record<string, unknown>),
      sourcePath:
        `${nwnPreflight.sourceModule?.path ?? ""}::enon_test_effect.are`,
      sourceSha256:
        "5dad3c2b055056479f4ce7b2c8bc25a408208700b6901c1bf1986ac50368f585"
    },
    sourceModule: {
      path: nwnPreflight.sourceModule?.path,
      sha256: expectedModuleSha256
    },
    sourceArea: {
      areaResref: "enon_test_effect",
      areSha256:
        "5dad3c2b055056479f4ce7b2c8bc25a408208700b6901c1bf1986ac50368f585",
      gitSha256:
        "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6",
      sourcePackVersion: "aurora-area-source-pack/manifest/v1"
    },
    coverage: {
      sourceTileCount: 4,
      admittedTileCount: 4,
      unresolvedTileCount: 0,
      unresolvedTileIndexes: []
    },
    actors: [
      {
        ...playerActor,
        role: "target_creature",
        normalizedPosition: [0, 0, 0],
        sourceForwardSource:
          "module.ifo entry transform; vfx68shot.nss applies EffectVisualEffect to GetFirstPC()"
      },
      {
        ...innkeeperActor,
        role: "scene_creature",
        normalizedPosition: [0, 3, 0],
        sourceForwardSource:
          "enon_test_effect.git creature transform from the admitted exact module Area"
      }
    ],
    objectAttachmentTarget: {
      version: "aurora-vfx-object-attachment-target/v1",
      phase: "impact",
      targetKind: "creature",
      sourceKind: "actor-role",
      sourceId: "target_creature",
      targetSpecialNodePrefix: ""
    },
    omittedOracleObjects: [],
    sourceEvidence: [
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row68/nwn/preflight.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row68/nwn/summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row68/nwn/scripts/vfx68entry.nss",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row68/nwn/scripts/vfx68shot.nss",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/source-scene/enon-test-effect-row1-exact-module-source-pack-20260811/manifest.json",
      defaultBicSource
    ]
  };
}

function requiredProofScene(
  manifest: Record<string, unknown>,
  fixtureLabel: string
): Record<string, unknown> {
  const proofScene = manifest.proofScene;
  if (!proofScene || typeof proofScene !== "object" || Array.isArray(proofScene)) {
    throw new Error(`The ${fixtureLabel} source-backed proof scene is missing.`);
  }
  return proofScene as Record<string, unknown>;
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
