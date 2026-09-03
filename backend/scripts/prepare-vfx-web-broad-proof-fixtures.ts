import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { readNwnErfResource } from "../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";
import {
  parseRawGffDocument,
  parseTemplateBlueprintFromGff
} from "../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { buildDefaultRuntimeSettings } from "../src/modules/runtime-settings/domain/runtime-settings.defaults";
import { VfxApplicationService } from "../src/modules/vfx/application/vfx.application.service";
import type { VfxEmitterRuntimePackage } from "../src/modules/vfx/application/vfx-processing.types";
import {
  buildAuroraAoeRuntimeObject,
  parseAuroraAoeTwoDa,
  type AuroraAoeEffectInstance,
  type AuroraVfxEffectInstance
} from "../src/modules/vfx/domain/aurora-vfx-source.parser";
import { parseAuroraMdlVfxSource } from "../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import { inspectAuroraMdlSource } from "../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";
import {
  composeAuroraMdlInheritedTransformAnimation,
  type AuroraMdlInheritedAnimationCompositionEvidence
} from "../src/modules/vfx/domain/aurora-mdl-inherited-animation-graph";
import {
  auroraObjectOrientationFromForward,
  buildAuroraEffectBeamAttachment,
  type AuroraVfxEffectBeamAttachmentRuntimeProfile,
  type AuroraVfxResolvedEffectBeamAttachment
} from "../src/modules/vfx/domain/aurora-vfx-effect-beam-attachment";
import type {
  AuroraProgFxType10ProjectileRuntimeContext
} from "../src/modules/vfx/domain/aurora-vfx-progfx-type10-projectile";
import {
  buildAuroraObjectDurationVisualOwnerContract,
  resolveAuroraObjectDurationVisualOwnerUpdateSchedule
} from "../src/modules/vfx/domain/aurora-vfx-object-duration-owner-runtime";
import { buildVfxProofResourceTraces } from "./support/vfx-proof-resource-traces";

type FixtureSlug = "row44" | "row50" | "row210" | "row216" | "row181" | "row1" | "aoe0";

interface FixtureSpec {
  slug: FixtureSlug;
  rowId: number;
  label: string;
  lifecycle: "fire-and-forget" | "duration";
  requestedDurationSeconds?: number;
  animationName?: string;
  animationLoop?: boolean;
  runtimeDtSeconds?: number;
  outputFrameStride?: number;
  seed: number;
  effect?: Omit<AuroraVfxEffectInstance, "sourceRowId">;
  aoeEffect?: Omit<AuroraAoeEffectInstance, "sourceRowId">;
  objectDurationVisualOwner?: boolean;
  runtimeTarget?: {
    targetRef: string;
    targetPosition: { x: number; y: number; z: number };
    targetForward?: { x: number; y: number; z: number };
    effectBeamAttachment?: AuroraVfxResolvedEffectBeamAttachment;
  };
  runtimeType10Projectile?: AuroraProgFxType10ProjectileRuntimeContext;
  runtimeCamera?: {
    position: { x: number; y: number; z: number };
    contextSource: "proof-calibrated-camera-relative-to-vfx-owner";
    sourceEvidence: string[];
  };
  proofSceneAlignment?: {
    captureModule: string;
    areaResref: string;
    sourcePosition: { x: number; y: number; z: number };
    sourceForward: { x: number; y: number; z: number };
    targetPosition: { x: number; y: number; z: number };
    targetForward: { x: number; y: number; z: number };
    normalizedTargetPosition: { x: number; y: number; z: number };
    sourceEvidence: string[];
  };
  groupMotion?: {
    from: [number, number, number];
    to: [number, number, number];
    durationSeconds: number;
  };
  knownRuntimeGap?: string;
}

const RETAIL_PROOF_SIMULATION_STEP_SECONDS = 1 / 60;

const specs: FixtureSpec[] = [
  {
    slug: "row44",
    rowId: 44,
    label: "VFX_IMP_ACID_S",
    lifecycle: "fire-and-forget",
    animationName: "impact",
    runtimeDtSeconds: 1 / 60,
    seed: 440044,
    effect: {
      constructorKind: "EffectVisualEffect",
      applicationMode: "location",
      durationType: "instant",
      targetRef: "retail-proof-location"
    },
    knownRuntimeGap:
      "animation-origin detonate dispatch, the exact four-tile HAK-backed row44 proof scene, source-backed local tile lights, the exact BIC-derived source creature, and the nw_innkeeper/c_yinnkeep pause1 target actor are active; the exact capture camera, retail RNG seed, and remaining material/postprocess parity remain open"
  },
  {
    slug: "row50",
    rowId: 50,
    label: "VFX_IMP_DEATH",
    lifecycle: "fire-and-forget",
    animationName: "impact",
    runtimeDtSeconds: 1 / 60,
    outputFrameStride: 2,
    seed: 500050,
    effect: {
      constructorKind: "EffectVisualEffect",
      applicationMode: "object",
      durationType: "instant",
      targetRef: "retail-proof-target"
    },
    runtimeCamera: {
      position: {
        x: -0.0247812236,
        y: -5.4020129462,
        z: 2.2138376047
      },
      contextSource: "proof-calibrated-camera-relative-to-vfx-owner",
      sourceEvidence: [
        "backend/docs/aurora-reverse/vfx-row50-proof-camera-source-audit-2026-08-13.md",
        "backend/docs/aurora-reverse/vfx-row50-proof-scene-source-audit-2026-07-19.md"
      ]
    },
    knownRuntimeGap:
      "the exact four-tile HAK-backed row50 proof scene, source-backed local tile lights, and the nw_innkeeper/c_yinnkeep pause1 target actor are active; the source creature, exact capture camera, retail RNG seed, and remaining material/postprocess parity remain open"
  },
  {
    slug: "row210",
    rowId: 210,
    label: "VFX_BEAM_FIRE",
    lifecycle: "duration",
    requestedDurationSeconds: 20,
    seed: 210210,
    effect: {
      constructorKind: "EffectBeam",
      applicationMode: "object",
      durationType: "temporary",
      durationSeconds: 20,
      effectorRef: "retail-proof-effector",
      targetRef: "retail-proof-target",
      bodyNode: "BODY_NODE_CHEST"
    },
    runtimeTarget: {
      targetRef: "retail-proof-target",
      targetPosition: { x: 0, y: 0, z: 5 },
      targetForward: { x: 0, y: 0, z: -1 }
    },
    proofSceneAlignment: {
      captureModule: "codex_vb_r210.mod",
      areaResref: "enon_test_effect",
      sourcePosition: { x: 9.5, y: 3.799999952316284, z: 0 },
      sourceForward: { x: 0, y: 1, z: 0 },
      targetPosition: { x: 9.5, y: 6.8, z: 0 },
      targetForward: { x: 0, y: -1, z: 0 },
      normalizedTargetPosition: { x: 0, y: 3, z: 0 },
      sourceEvidence: [
        "row210/nwn/summary.json",
        "row216/nwn/source-scene/enon-test-effect-source-pack-20260716/module-ifo-area-entry.json",
        "row216/nwn/source-scene/enon-test-effect-source-pack-20260716/objects.csv"
      ]
    },
    knownRuntimeGap:
      "retail Type 7 source/target Impact-node attachment and native 3/65-point Lightning scheduling are active; host actors, exact capture camera, retail RNG seed, and material/postprocess parity remain open"
  },
  {
    slug: "row216",
    rowId: 216,
    label: "VFX_BEAM_FIRE_LASH",
    lifecycle: "duration",
    requestedDurationSeconds: 20,
    animationName: "cast01",
    animationLoop: true,
    runtimeDtSeconds: 1 / 30,
    outputFrameStride: 4,
    seed: 216216,
    effect: {
      constructorKind: "EffectBeam",
      applicationMode: "object",
      durationType: "temporary",
      durationSeconds: 20,
      effectorRef: "retail-proof-effector",
      targetRef: "retail-proof-target",
      bodyNode: "BODY_NODE_CHEST"
    },
    runtimeTarget: {
      targetRef: "retail-proof-target",
      targetPosition: { x: 0, y: 3, z: 0 },
      targetForward: { x: 0, y: -1, z: 0 }
    },
    proofSceneAlignment: {
      captureModule: "codex_vb_r216.mod",
      areaResref: "enon_test_effect",
      sourcePosition: { x: 9.5, y: 3.799999952316284, z: 0 },
      sourceForward: { x: 0, y: 1, z: 0 },
      targetPosition: { x: 9.5, y: 6.8, z: 0 },
      targetForward: { x: 0, y: -1, z: 0 },
      normalizedTargetPosition: { x: 0, y: 3, z: 0 },
      sourceEvidence: [
        "row216/nwn/summary.json",
        "row216/nwn/source-scene/enon-test-effect-source-pack-20260716/module-ifo-area-entry.json",
        "row216/nwn/source-scene/enon-test-effect-source-pack-20260716/objects.csv"
      ]
    },
    knownRuntimeGap:
      "retail Type 7 attach/reattach now resolves source and target Impact nodes from the exact capture BIC-derived pfh0/c_yinnkeep retail MDL hierarchies; matched proof still decides remaining particle-shape and cadence gaps"
  },
  {
    slug: "row181",
    rowId: 181,
    label: "VFX_IMP_MIRV",
    lifecycle: "fire-and-forget",
    seed: 181181,
    effect: {
      constructorKind: "EffectVisualEffect",
      applicationMode: "object",
      durationType: "instant",
      creatorRef: "retail-proof-source",
      targetRef: "retail-proof-target"
    },
    runtimeType10Projectile: {
      sourceRef: "retail-proof-source",
      sourcePosition: { x: 0, y: 0, z: 0 },
      targetRef: "retail-proof-target",
      targetPosition: { x: 0, y: 3, z: 0 },
      provenance: "retail-client-disassembly"
    },
    proofSceneAlignment: {
      captureModule: "codex_vb_r181b.mod",
      areaResref: "enon_test_effect",
      sourcePosition: { x: 9.5, y: 3.799999952316284, z: 0 },
      sourceForward: { x: 0, y: 1, z: 0 },
      targetPosition: { x: 9.5, y: 6.8, z: 0 },
      targetForward: { x: 0, y: -1, z: 0 },
      normalizedTargetPosition: { x: 0, y: 3, z: 0 },
      sourceEvidence: [
        "row181/nwn-recapture-2/summary.json",
        "row181/nwn-recapture-2/source-scene/enon-test-effect-row181-exact-module-source-pack-20260813/manifest.json",
        "row181/nwn-recapture-2/scripts/vb181entry.nss",
        "row181/nwn-recapture-2/scripts/vb181shot.nss",
        "vfx-progfx-type10-projectile-audit-2026-07-18.md",
        "vfx-progfx-type10-log-timing-correction-audit-2026-08-13.md"
      ]
    },
    knownRuntimeGap:
      "retail Type 10 creates one CNWCProjectile, uses deterministic log-distance timing, and path style 4 drives the emitter owner through the exact source-to-target axis in the HAK-backed row181 Area; the source creature, exact capture camera, emitter cadence, particle material, and light parity remain open"
  },
  {
    slug: "row1",
    rowId: 1,
    label: "VFX_DUR_DARKNESS",
    lifecycle: "duration",
    requestedDurationSeconds: 20,
    objectDurationVisualOwner: true,
    seed: 100001,
    effect: {
      constructorKind: "EffectVisualEffect",
      applicationMode: "object",
      durationType: "temporary",
      durationSeconds: 20,
      targetRef: "retail-proof-target"
    },
    knownRuntimeGap:
      "retail impact-duration-cessation owner lifecycle now uses truncated integer owner timers, same-frame removal-before-update ordering, and no timer overshoot carry; omitted source creature, local tile-light admission, exact capture camera, and negative-light material/postprocess response remain open"
  },
  {
    slug: "aoe0",
    rowId: 0,
    label: "VFX_PER_FOGACID",
    lifecycle: "duration",
    requestedDurationSeconds: 20,
    animationName: "duration",
    animationLoop: true,
    outputFrameStride: 2,
    seed: 900000,
    aoeEffect: {
      constructorKind: "EffectAreaOfEffect",
      applicationMode: "static_location",
      durationType: "temporary",
      durationSeconds: 20,
      creatorRef: "retail-proof-source",
      anchorLocation: { x: 0, y: 0, z: 0 },
      lifecycleState: "active"
    },
    knownRuntimeGap:
      "native 20-owner MODEL/NUMACT/DURATION/EDGEWGHT scheduling, impact-duration-cessation cycling, and the exact four-tile HAK-backed retail Area receiver packet are active; exact retail RNG seed, walkmesh grounding, sound scheduling, omitted creatures, exact camera, and remaining scene parity remain open"
  }
];

const repoRoot = resolve(__dirname, "../..");
const retailRoot = resolve("C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data");
const retailKeyPath = resolve(retailRoot, "nwn_base.key");
const row216CaptureBicPath = resolve(
  "C:/Users/enonw/Documents/Neverwinter Nights/localvault/avriemail461.bic"
);
const nwnUserHakRoot = resolve(
  "C:/Users/enonw/Documents/Neverwinter Nights/hak"
);
const evidenceRoot = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16"
);
const publicFixtureRoot = resolve(repoRoot, "frontend/public/dev-fixtures");
const defaultDtSeconds = 1 / 8;
// The broad matrix peaks below 80 live particles per emitter. Keeping a small
// source-safe headroom avoids serializing hundreds of unused pool entries per frame.
const particleLimit = 96;

async function main(): Promise<void> {
  const retailReader = await NwnKeyBifResourceReader.open(retailKeyPath, retailRoot);
  const service = new VfxApplicationService({
    get: async () => buildDefaultRuntimeSettings("2026-07-16T00:00:00.000Z"),
    save: async () => undefined
  });
  const fixtureResults = [];
  const requestedSlug = process.env.VFX_BROAD_FIXTURE_SLUG?.trim();
  const selectedSpecs = requestedSlug
    ? specs.filter((spec) => spec.slug === requestedSlug)
    : specs;
  if (selectedSpecs.length === 0) {
    throw new Error(`Unknown VFX broad fixture slug '${requestedSlug}'.`);
  }

  for (const spec of selectedSpecs) {
    const dtSeconds = spec.runtimeDtSeconds ?? defaultDtSeconds;
    const fixtureEvidenceRoot = resolve(evidenceRoot, spec.slug);
    const sourceRoot = resolve(fixtureEvidenceRoot, "sources");
    const sourceManifest = JSON.parse(
      await readFile(resolve(fixtureEvidenceRoot, "source-manifest.json"), "utf8")
    ) as {
      source: { table: string; rowId: number; label: string; rawRow: string; progfxRowId?: number };
      model: { resref: string; emitterCount: number; lightCount: number };
      resources: Array<{ resref: string; type: string; path: string; sha256: string }>;
      missingTextureResources: string[];
    };
    assertRetailManifest(spec, sourceManifest);
    const modelPath = resolve(sourceRoot, `${sourceManifest.model.resref}.mdl`);
    const modelBytes = await readFile(modelPath);
    const parsedModel = parseAuroraMdlVfxSource(modelBytes, {
      sourceModelObjectKey: `proof/vfx-broad/${spec.slug}/${sourceManifest.model.resref}.mdl`,
      sourceModelFileName: `${sourceManifest.model.resref}.mdl`,
      sourceModelHash: sha256(modelBytes)
    });
    const resourceTraces = buildVfxProofResourceTraces({
      sourceModelFileName: `${sourceManifest.model.resref}.mdl`,
      sourceObjectKeyPrefix: `proof/vfx-broad/${spec.slug}/sources`,
      emitters: parsedModel.emitters,
      resources: sourceManifest.resources
    });
    const retailEffectBeamEvidence = spec.slug === "row210" || spec.slug === "row216"
      ? await buildBroadRetailEffectBeamAttachment(retailReader, spec.slug)
      : undefined;
    const effectBeamAttachment = retailEffectBeamEvidence?.attachment
      ?? spec.runtimeTarget?.effectBeamAttachment;
    const runtimeTarget = spec.runtimeTarget
      ? {
          ...spec.runtimeTarget,
          ...(effectBeamAttachment ? { effectBeamAttachment } : {})
        }
      : undefined;
    const runtimeContext =
      runtimeTarget || spec.runtimeType10Projectile
        ? {
            ...(runtimeTarget ?? {}),
            ...(spec.runtimeType10Projectile
              ? { progFxType10Projectile: spec.runtimeType10Projectile }
              : {})
          }
        : undefined;
    const animationLengthSeconds = spec.animationName
      ? resolveAnimationLengthSeconds(parsedModel.emitters, spec.animationName)
      : undefined;
    const objectDurationVisualOwnerContract = spec.objectDurationVisualOwner
      ? buildAuroraObjectDurationVisualOwnerContract({
          sourceRowId: spec.rowId,
          sourceModelResRef: sourceManifest.model.resref,
          effectDurationMilliseconds: (spec.requestedDurationSeconds ?? 0) * 1000,
          impactMilliseconds:
            resolveAnimationLengthSeconds(parsedModel.emitters, "impact") * 1000,
          durationAnimationMilliseconds:
            resolveAnimationLengthSeconds(parsedModel.emitters, "duration") * 1000,
          cessationMilliseconds:
            resolveAnimationLengthSeconds(parsedModel.emitters, "cessation") * 1000
        })
      : undefined;
    const maximumParticleLifetimeSeconds = Math.max(
      0,
      ...parsedModel.emitters.flatMap((emitter) => [
        emitter.simulation?.lifeExp ?? 0,
        ...(emitter.animationPasses ?? []).map(
          (pass) => pass.emitterState?.simulation?.lifeExp ?? 0
        )
      ])
    );
    const objectDurationVisualOwnerUpdateSchedule =
      objectDurationVisualOwnerContract
        ? resolveAuroraObjectDurationVisualOwnerUpdateSchedule(
            objectDurationVisualOwnerContract,
            { updateStepMilliseconds: dtSeconds * 1000 }
          )
        : undefined;
    let runtimeDurationSeconds = objectDurationVisualOwnerUpdateSchedule
      ? objectDurationVisualOwnerUpdateSchedule.releaseCompleteAtMilliseconds / 1000
      : spec.requestedDurationSeconds ?? Math.max(
          2,
          (animationLengthSeconds ?? 0) + maximumParticleLifetimeSeconds + dtSeconds
        );
    let tickCount = Math.ceil(runtimeDurationSeconds / dtSeconds);
    const animationPlaybackTickCount = animationLengthSeconds
      ? Math.max(1, Math.ceil(animationLengthSeconds / dtSeconds))
      : undefined;
    const sourceTablePath = resolve(sourceRoot, sourceManifest.source.table);
    const sourceTableText = spec.slug === "aoe0"
      ? undefined
      : (await readFile(sourceTablePath)).toString("latin1");
    const aoeSourceTableText = spec.slug === "aoe0"
      ? (await readFile(sourceTablePath)).toString("latin1")
      : undefined;
    const parsedAoe = aoeSourceTableText
      ? parseAuroraAoeTwoDa(aoeSourceTableText, {
          profile: `nwn-ee-retail-key-bif-${spec.slug}`,
          source: {
            objectKey: `proof/vfx-broad/${spec.slug}/${sourceManifest.source.table}`,
            layer: "vanilla",
            hash: sha256(Buffer.from(aoeSourceTableText, "latin1"))
          }
        })
      : undefined;
    const selectedAoeSourceRow = parsedAoe?.rows.find((row) => row.rowId === spec.rowId);
    const aoeRuntimeResult = spec.aoeEffect
      ? buildAuroraAoeRuntimeObject(selectedAoeSourceRow, {
          ...spec.aoeEffect,
          sourceRowId: spec.rowId
        }, {
          visualSeed: spec.seed
        })
      : undefined;
    const aoeVisualAnimationDurations = aoeRuntimeResult?.runtimeObject?.visualFootprint
      ? {
          impactMilliseconds:
            resolveAnimationLengthSeconds(parsedModel.emitters, "impact") * 1000,
          cessationMilliseconds:
            resolveAnimationLengthSeconds(parsedModel.emitters, "cessation") * 1000
        }
      : undefined;
    const aoeStopAtMilliseconds =
      aoeRuntimeResult?.runtimeObject?.visualFootprint &&
      spec.requestedDurationSeconds !== undefined
        ? spec.requestedDurationSeconds * 1000
        : undefined;
    if (
      aoeRuntimeResult?.runtimeObject?.visualFootprint &&
      aoeStopAtMilliseconds !== undefined
    ) {
      runtimeDurationSeconds =
        (aoeStopAtMilliseconds +
          aoeRuntimeResult.runtimeObject.visualFootprint.lifecycle.postRemovalMilliseconds) /
        1000;
      tickCount = Math.ceil(runtimeDurationSeconds / dtSeconds);
    }
    const progFxPath = resolve(sourceRoot, "progfx.2da");
    const progFxTableText = sourceManifest.source.progfxRowId === undefined
      ? undefined
      : (await readFile(progFxPath)).toString("latin1");
    const effectInstance = spec.effect
      ? { ...spec.effect, sourceRowId: spec.rowId }
      : undefined;
    const envelope = await service.processVfxPackage({
      packageKind: "model_graph_runtime",
      ...(sourceTableText ? { sourceTableText } : {}),
      ...(progFxTableText ? { progFxTableText } : {}),
      sourceObjectKey: `proof/vfx-broad/${spec.slug}/${sourceManifest.source.table}`,
      sourceLayer: "vanilla",
      sourceProfile: `nwn-ee-retail-key-bif-${spec.slug}`,
      ...(spec.slug === "aoe0" ? {} : { sourceRowId: spec.rowId }),
      ...(effectInstance ? { effectInstance } : {}),
      sourceEmitters: parsedModel.emitters,
      sourceAnimationEvents: parsedModel.animationEvents,
      sourceModelGraph: parsedModel.modelGraph,
      resourceTraces,
      runtime: {
        dtSeconds,
        simulationStepSeconds: RETAIL_PROOF_SIMULATION_STEP_SECONDS,
        tickCount,
        particleLimit,
        seed: spec.seed,
        ...(spec.animationName && animationLengthSeconds
          ? {
              animation: {
                animationName: spec.animationName,
                previousTimeSeconds: 0,
                currentTimeSeconds: animationLengthSeconds,
                blendWeight: 1,
                playbackTickCount: animationPlaybackTickCount,
                ...(spec.animationLoop ? { loop: true } : {})
              }
            }
          : {}),
        windManager: {
          profileId: `vfx-broad-${spec.slug}-proof`,
          noiseSeed: spec.seed,
          globalWindVector: { x: 0, y: 0, z: 0 },
          variationYawRadians: 0,
          variationPitchRadians: 0,
          noisePeriodSeconds: 1
        },
        ...(spec.runtimeCamera
          ? {
              cameraPosition: spec.runtimeCamera.position,
              cameraContextSource: spec.runtimeCamera.contextSource
            }
          : {}),
        ...(retailEffectBeamEvidence
          ? { effectBeamAttachmentRuntime: retailEffectBeamEvidence.runtimeProfile }
          : {}),
        ...(runtimeContext ? { context: runtimeContext } : {}),
        ...(aoeRuntimeResult?.runtimeObject?.visualFootprint &&
        aoeVisualAnimationDurations
          ? {
              aoeVisualRuntime: {
                contract: aoeRuntimeResult.runtimeObject.visualFootprint,
                animationDurations: aoeVisualAnimationDurations,
                ...(aoeStopAtMilliseconds !== undefined
                  ? { stopAtMilliseconds: aoeStopAtMilliseconds }
                  : {})
              }
            }
          : {}),
        ...(objectDurationVisualOwnerContract
          ? {
              objectDurationVisualRuntime: {
                contract: objectDurationVisualOwnerContract
              }
            }
          : {})
      },
      bypassCache: true,
      includeBenchmarkMetadata: false
    });
    const runtime = envelope.vfx;
    const compactRuntimeEmitters = compactEmitterRuntimePackages(
      runtime.runtimeEmitters ?? [],
      spec.outputFrameStride ?? 1
    );
    const diagnostics = [
      ...runtime.diagnostics,
      ...(aoeRuntimeResult?.diagnostics ?? [])
    ].map((entry) => ({
      code: entry.code,
      severity: entry.severity,
      message: entry.message
    }));
    const publicRoot = resolve(publicFixtureRoot, `vfx-broad-${spec.slug}`);
    await mkdir(publicRoot, { recursive: true });
    const textureResources = sourceManifest.resources.filter((entry) => entry.type === "tga");
    const txiResourcesByResref = new Map(
      sourceManifest.resources
        .filter((entry) => entry.type === "txi")
        .map((entry) => [entry.resref.toLowerCase(), entry] as const)
    );
    const textures = [];
    for (const texture of textureResources) {
      const resourceKey = basename(texture.path).toLowerCase();
      await copyFile(texture.path, resolve(publicRoot, resourceKey));
      const txiResource = txiResourcesByResref.get(texture.resref.toLowerCase());
      const txi = txiResource
        ? parseFixtureTextureTxi(await readFile(txiResource.path, "utf8"), txiResource.path)
        : undefined;
      textures.push({
        resref: texture.resref.toLowerCase(),
        resourceKey,
        sourcePath: texture.path,
        sha256: texture.sha256,
        ...(txi ? { txi } : {})
      });
    }
    const proofScene =
      spec.slug === "row1"
        ? await prepareRow1RetailAreaProofScene(publicRoot)
        : spec.slug === "aoe0"
          ? await prepareAoe0RetailAreaProofScene(publicRoot)
        : spec.slug === "row44"
          ? await prepareRow44RetailAreaProofScene(publicRoot)
          : spec.slug === "row50"
            ? await prepareRow50RetailAreaProofScene(publicRoot)
            : spec.slug === "row216" && retailEffectBeamEvidence
              ? await prepareRow216RetailAreaProofScene(
                  publicRoot,
                  retailEffectBeamEvidence.sourceCreatureOracle.proofActor
                )
            : spec.slug === "row181"
              ? await prepareRow181RetailAreaProofScene(publicRoot)
          : undefined;
    const payload = {
      version: "aurora-vfx-payload/v1",
      canonicalStatus: "canonical",
      backendCanonical: true,
      sourceKind: effectInstance || aoeRuntimeResult?.runtimeObject
        ? "effect_instance"
        : "source_model",
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
        sourceRows: runtime.selectedSourceRow
          ? [runtime.selectedSourceRow]
          : selectedAoeSourceRow
            ? [selectedAoeSourceRow]
            : [],
        effectInstance: runtime.effectInstance,
        aoeRuntimeObject: aoeRuntimeResult?.runtimeObject,
        objectDurationVisualOwnerContract,
        objectDurationVisualOwnerUpdateSchedule,
        phaseSchedule: runtime.phaseSchedule,
        dependencyGraph: runtime.dependencyGraph,
        runtimeEmitters: compactRuntimeEmitters,
        runtimeState: compactRuntimeState(runtime.runtimeState),
        renderContract: compactRenderContract(runtime.renderContract),
        sourceModelGraph: parsedModel.modelGraph,
        sourceMdlLights: parsedModel.lights,
        windManagerSnapshot: runtime.windManagerSnapshot,
        ...(retailEffectBeamEvidence
          ? { effectBeamAttachmentRuntime: retailEffectBeamEvidence.runtimeProfile }
          : {})
      },
      provenance: {
        backendPayloadVersion: runtime.version,
        sourceProfile: `nwn-ee-retail-key-bif-${spec.slug}-one-trigger-proof`,
        sourceTable: sourceManifest.source.table,
        sourceRowId: spec.rowId,
        sourceLabel: spec.label,
        sourceResRef: sourceManifest.model.resref,
        effectInstanceId: `vfx-broad-${spec.slug}`,
        runtimeProfile: `retail-${spec.animationName ?? "base"}-${Math.round(1 / dtSeconds)}fps-seed-${spec.seed}`,
        renderContractVersion: runtime.renderContract?.version
      }
    };
    const manifest = {
      version: "aurora-vfx-web-broad-fixture/v1",
      fixtureId: `vfx-broad-${spec.slug}`,
      sourceFixtureId: spec.slug,
      sourceProfile: "nwn-ee-retail-key-bif",
      sourceRowId: spec.rowId,
      sourceLabel: spec.label,
      sourceTable: sourceManifest.source.table,
      sourceModel: {
        resref: sourceManifest.model.resref,
        path: modelPath,
        sha256: sha256(modelBytes),
        emitterCount: parsedModel.emitters.length,
        lightCount: parsedModel.lights.length
      },
      lifecycle: spec.lifecycle,
      intentionalTriggerCount: 1,
      loop: false,
      animationLoop: spec.animationLoop ?? false,
      textures,
      runtime: {
        dtSeconds,
        simulationStepSeconds: RETAIL_PROOF_SIMULATION_STEP_SECONDS,
        outputFrameStride: spec.outputFrameStride ?? 1,
        serializedFrameStepSeconds: dtSeconds * (spec.outputFrameStride ?? 1),
        tickCount,
        durationSeconds: tickCount * dtSeconds,
        particleLimit,
        seed: spec.seed,
        animationName: spec.animationName ?? null,
        animationLengthSeconds: animationLengthSeconds ?? null,
        animationPlaybackTickCount: animationPlaybackTickCount ?? null,
        maximumParticleLifetimeSeconds,
        ...(spec.runtimeCamera
          ? {
              cameraPosition: spec.runtimeCamera.position,
              cameraContextSource: spec.runtimeCamera.contextSource,
              cameraSourceEvidence: spec.runtimeCamera.sourceEvidence
            }
          : {})
      },
      proofLifecycle: {
        requestedDurationSeconds: spec.requestedDurationSeconds ?? null,
        runtimeDurationSeconds: tickCount * dtSeconds,
        ...(spec.groupMotion ? { groupMotion: spec.groupMotion } : {}),
        ...(spec.proofSceneAlignment
          ? { sceneAlignment: spec.proofSceneAlignment }
          : {}),
        ...(effectBeamAttachment ? { effectBeamAttachment } : {}),
        ...(spec.runtimeType10Projectile
          ? { progFxType10Projectile: spec.runtimeType10Projectile }
          : {}),
        ...(retailEffectBeamEvidence
          ? { sourceCreatureOracle: retailEffectBeamEvidence.sourceCreatureOracle }
          : {}),
        ...(retailEffectBeamEvidence
          ? { effectBeamHostAnimation: retailEffectBeamEvidence.hostAnimationEvidence }
          : {}),
        ...(objectDurationVisualOwnerContract
          ? { objectDurationVisualOwner: objectDurationVisualOwnerContract }
          : {}),
        ...(objectDurationVisualOwnerUpdateSchedule
          ? {
              objectDurationVisualOwnerUpdateSchedule
            }
          : {})
      },
      comparisonContext: {
        cameraMatchEstablished: false,
        sceneMatchEstablished: false,
        ownerTargetMatchEstablished: spec.slug === "row44",
        comparisonStatus:
          spec.slug === "row44"
            ? "source-backed-exact-row44-scene-bic-source-target-open-camera-material"
            : proofScene
              ? "source-backed-partial-proof-scene-open-camera-scene-owner-target"
              : "runtime-semantics-only-open-camera-scene-owner-target"
      },
      ...(proofScene ? { proofScene } : {}),
      sourceEmitterNames: parsedModel.emitters.map((entry) => entry.nodeName),
      sourceLightNames: parsedModel.lights.map((entry) => entry.nodeName),
      runtimeFrameCounts: compactRuntimeEmitters.map((entry) => {
        const runtimeFrames = Array.isArray(entry.runtimeFrames)
          ? entry.runtimeFrames as Array<Record<string, unknown>>
          : [];
        const activeCounts = runtimeFrames.map((frame) => {
          const state = frame.runtimeState && typeof frame.runtimeState === "object"
            ? frame.runtimeState as Record<string, unknown>
            : {};
          return Array.isArray(state.activeParticleIds) ? state.activeParticleIds.length : 0;
        });
        return {
          emitterNodeName: entry.emitterNodeName,
          frameCount: runtimeFrames.length,
          maxActiveParticleCount: Math.max(0, ...activeCounts),
          finalActiveParticleCount: activeCounts.at(-1) ?? 0
        };
      }),
      knownRuntimeGap: spec.knownRuntimeGap ?? null,
      diagnosticCodes: diagnostics.map((entry) => entry.code)
    };
    await writeFile(resolve(publicRoot, "payload.json"), JSON.stringify(payload));
    await writeFile(resolve(publicRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    await writeFile(
      resolve(fixtureEvidenceRoot, "web-fixture-manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`
    );
    fixtureResults.push({
      fixtureId: manifest.fixtureId,
      payloadBytes: Buffer.byteLength(JSON.stringify(payload)),
      runtimeDurationSeconds: manifest.runtime.durationSeconds,
      emitterCount: parsedModel.emitters.length,
      textureCount: textures.length,
      knownRuntimeGap: manifest.knownRuntimeGap
    });
    process.stdout.write(`${JSON.stringify(fixtureResults.at(-1))}\n`);
  }

  const fixtureIndexPath = resolve(evidenceRoot, "web-fixture-index.json");
  let fixtureIndexResults = fixtureResults;
  if (requestedSlug) {
    const existingIndex = JSON.parse(
      await readFile(fixtureIndexPath, "utf8")
    ) as { fixtures?: Array<{ fixtureId?: string }> };
    const replacements = new Map(
      fixtureResults.map((entry) => [entry.fixtureId, entry] as const)
    );
    fixtureIndexResults = (existingIndex.fixtures ?? [])
      .map((entry) => replacements.get(entry.fixtureId ?? "") ?? entry)
      .concat(
        fixtureResults.filter(
          (entry) =>
            !(existingIndex.fixtures ?? []).some(
              (existing) => existing.fixtureId === entry.fixtureId
            )
        )
      ) as typeof fixtureResults;
  }
  await writeFile(
    fixtureIndexPath,
    `${JSON.stringify({ version: "aurora-vfx-web-broad-fixture-index/v1", fixtures: fixtureIndexResults }, null, 2)}\n`
  );
}

async function buildBroadRetailEffectBeamAttachment(
  reader: NwnKeyBifResourceReader,
  fixtureSlug: "row210" | "row216"
): Promise<{
  attachment: AuroraVfxResolvedEffectBeamAttachment;
  runtimeProfile: AuroraVfxEffectBeamAttachmentRuntimeProfile;
  hostAnimationEvidence: {
    phasePolicy: "effect-onset-normalized";
    retailPhaseMatchEstablished: false;
    source: AuroraMdlInheritedAnimationCompositionEvidence & {
      baseModelResref: string;
      baseModelSha256: string;
      baseModelSource: string;
      supermodelResref: string;
      supermodelSha256: string;
      supermodelSource: string;
    };
    target: AuroraMdlInheritedAnimationCompositionEvidence & {
      baseModelResref: string;
      baseModelSha256: string;
      baseModelSource: string;
      supermodelResref: string;
      supermodelSha256: string;
      supermodelSource: string;
    };
  };
  sourceCreatureOracle: {
    bicPath: string;
    bicSha256: string;
    gender: number;
    appearanceType: number;
    phenotype: number;
    ambientAnimationState: number;
    animationDay: number;
    animationTime: number;
    resolvedSourceModelResref: string;
    resolvedSourceModelSha256: string;
    proofActor: Record<string, unknown>;
  };
}> {
  const captureOracle = await loadCapturePlayerOracle();
  const {
    captureBicHash,
    captureBic,
    captureBlueprint
  } = captureOracle;
  const gender = requiredNumericGffField(captureBic.fields, "Gender");
  const appearanceType = requiredNumericGffField(captureBic.fields, "Appearance_Type");
  const phenotype = requiredNumericGffField(captureBic.fields, "Phenotype");
  const ambientAnimationState = requiredNumericGffField(
    captureBic.fields,
    "AmbientAnimState"
  );
  const animationDay = requiredNumericGffField(captureBic.fields, "AnimationDay");
  const animationTime = requiredNumericGffField(captureBic.fields, "AnimationTime");
  if (
    gender !== 1 ||
    appearanceType !== 6 ||
    phenotype !== 0 ||
    ambientAnimationState !== 0 ||
    animationDay !== 0 ||
    animationTime !== 0
  ) {
    throw new Error(
      `Unexpected row216 capture character contract: gender=${gender}, appearance=${appearanceType}, phenotype=${phenotype}, ambient=${ambientAnimationState}, animationDay=${animationDay}, animationTime=${animationTime}.`
    );
  }

  const sourceModelResref = "pfh0";
  const targetModelResref = "c_yinnkeep";
  const sourceSupermodelResref = "a_fa";
  const targetSupermodelResref = "a_ba";
  const sourceModelSource = "cep3_armor.hak";
  const targetModelSource = "cep3_core0.hak";
  const sourceSupermodelSource = "lc_addanimations.hak";
  const targetSupermodelSource = "nwn_base.key";
  const [sourceModelBytes, targetModelBytes, sourceSupermodelBytes, targetSupermodelBytes] =
    await Promise.all([
      requiredHakResource(sourceModelSource, sourceModelResref),
      requiredHakResource(targetModelSource, targetModelResref),
      requiredHakResource(sourceSupermodelSource, sourceSupermodelResref),
      requiredRetailResource(reader, targetSupermodelResref, NWN_KEY_BIF_RESOURCE_TYPES.MDL)
    ]);
  const sourceHash = sha256(sourceModelBytes);
  const targetHash = sha256(targetModelBytes);
  const sourceSupermodelHash = sha256(sourceSupermodelBytes);
  const targetSupermodelHash = sha256(targetSupermodelBytes);
  assertExpectedRetailHash(
    `${sourceModelResref}.mdl`,
    sourceHash,
    "4ca6e5662fc6296f7240ec2457262f3c460680ba74f9947478dec413c523cfab"
  );
  assertExpectedRetailHash(
    `${targetModelResref}.mdl`,
    targetHash,
    "de10fa9c782f6203038a5a79c6f23a14e95141205ef4862224fef3ff2810f878"
  );
  assertExpectedRetailHash(
    `${sourceSupermodelResref}.mdl`,
    sourceSupermodelHash,
    "9c32a90423ab369b36195191589cfb96bd3cbb01fbaa8bcead9c3d210d003107"
  );
  assertExpectedRetailHash(
    `${targetSupermodelResref}.mdl`,
    targetSupermodelHash,
    "a38c9f0de00a7e401419d1e668ad1b9d825cfc9635712cdb9ae63e840104ee2b"
  );
  assertExpectedSupermodel(sourceModelBytes, sourceModelResref, sourceSupermodelResref);
  assertExpectedSupermodel(targetModelBytes, targetModelResref, targetSupermodelResref);
  const sourceModel = parseAuroraMdlVfxSource(sourceModelBytes, {
    sourceModelObjectKey: `${sourceModelSource}/${sourceModelResref}.mdl`,
    sourceModelFileName: `${sourceModelResref}.mdl`,
    sourceModelHash: sourceHash
  });
  const targetModel = parseAuroraMdlVfxSource(targetModelBytes, {
    sourceModelObjectKey: `${targetModelSource}/${targetModelResref}.mdl`,
    sourceModelFileName: `${targetModelResref}.mdl`,
    sourceModelHash: targetHash
  });
  const sourceHostAnimation = composeRetailHostAnimation(
    sourceModel.modelGraph,
    sourceSupermodelBytes,
    "pause1"
  );
  const targetHostAnimation = composeRetailHostAnimation(
    targetModel.modelGraph,
    targetSupermodelBytes,
    "pause1"
  );
  const runtimeProfile: AuroraVfxEffectBeamAttachmentRuntimeProfile = {
    version: "aurora-effect-beam-host-runtime/v1",
    runtimeProfileId: `retail-${fixtureSlug}-pfh0-c_yinnkeep-pause1`,
    source: {
      ref: "retail-proof-effector",
      bodyNode: 1,
      modelGraph: sourceHostAnimation.modelGraph,
      objectTransform: {
        position: { x: 0, y: 0, z: 0 },
        orientation: auroraObjectOrientationFromForward({ x: 0, y: 1, z: 0 })
      },
      animation: {
        animationName: "pause1",
        startTimeSeconds: animationTime,
        timeScale: 1,
        loop: true,
        lengthSeconds: 2,
        blendWeight: 1
      }
    },
    target: {
      ref: "retail-proof-target",
      bodyNode: 0,
      modelGraph: targetHostAnimation.modelGraph,
      objectTransform: {
        position: { x: 0, y: 3, z: 0 },
        orientation: auroraObjectOrientationFromForward({ x: 0, y: -1, z: 0 })
      },
      animation: {
        animationName: "pause1",
        startTimeSeconds: 0,
        timeScale: 1,
        loop: true,
        lengthSeconds: 2,
        blendWeight: 1
      }
    }
  };
  return {
    attachment: buildAuroraEffectBeamAttachment({
      sourceRef: runtimeProfile.source.ref,
      sourceModelGraph: runtimeProfile.source.modelGraph,
      sourceObjectTransform: runtimeProfile.source.objectTransform,
      sourceBodyNode: runtimeProfile.source.bodyNode,
      sourceAnimation: runtimeProfile.source.animation,
      targetRef: runtimeProfile.target.ref,
      targetModelGraph: runtimeProfile.target.modelGraph,
      targetObjectTransform: runtimeProfile.target.objectTransform,
      targetBodyNode: runtimeProfile.target.bodyNode,
      targetAnimation: runtimeProfile.target.animation,
      sourceTimeSeconds: 0
    }),
    runtimeProfile,
    hostAnimationEvidence: {
      phasePolicy: "effect-onset-normalized",
      retailPhaseMatchEstablished: false,
      source: {
        baseModelResref: sourceModelResref,
        baseModelSha256: sourceHash,
        supermodelResref: sourceSupermodelResref,
        supermodelSha256: sourceSupermodelHash,
        baseModelSource: sourceModelSource,
        supermodelSource: sourceSupermodelSource,
        ...sourceHostAnimation.evidence
      },
      target: {
        baseModelResref: targetModelResref,
        baseModelSha256: targetHash,
        supermodelResref: targetSupermodelResref,
        supermodelSha256: targetSupermodelHash,
        baseModelSource: targetModelSource,
        supermodelSource: targetSupermodelSource,
        ...targetHostAnimation.evidence
      }
    },
    sourceCreatureOracle: {
      bicPath: row216CaptureBicPath,
      bicSha256: captureBicHash,
      gender,
      appearanceType,
      phenotype,
      ambientAnimationState,
      animationDay,
      animationTime,
      resolvedSourceModelResref: sourceModelResref,
      resolvedSourceModelSha256: sourceHash,
      proofActor: captureOracle.proofActor
    }
  };
}

async function loadCapturePlayerOracle(): Promise<{
  captureBicHash: string;
  captureBic: NonNullable<ReturnType<typeof parseRawGffDocument>>;
  captureBlueprint: NonNullable<ReturnType<typeof parseTemplateBlueprintFromGff>>;
  proofActor: Record<string, unknown>;
}> {
  const captureBicBytes = await readFile(row216CaptureBicPath);
  const captureBicHash = sha256(captureBicBytes);
  assertExpectedRetailHash(
    "capture avriemail461.bic",
    captureBicHash,
    "5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0"
  );
  const captureBic = parseRawGffDocument(captureBicBytes);
  const captureBlueprint = parseTemplateBlueprintFromGff(captureBicBytes);
  if (!captureBic || captureBic.fileType !== "BIC " || !captureBlueprint) {
    throw new Error("The admitted capture character is not a valid Aurora BIC.");
  }
  return {
    captureBicHash,
    captureBic,
    captureBlueprint,
    proofActor: buildCapturePlayerProofActor(
      captureBic,
      captureBlueprint,
      captureBicHash
    )
  };
}

function buildCapturePlayerProofActor(
  captureBic: NonNullable<ReturnType<typeof parseRawGffDocument>>,
  captureBlueprint: NonNullable<ReturnType<typeof parseTemplateBlueprintFromGff>>,
  captureBicSha256: string
): Record<string, unknown> {
  const baseBodyParts = readBicBodyPartContract(captureBic.fields, "BodyPart_");
  const equipmentList = requiredGffListField(captureBic.fields, "Equip_ItemList");
  if (equipmentList.length !== 1) {
    throw new Error(
      `The capture BIC must contain one equipped item, received ${equipmentList.length}.`
    );
  }
  const equippedArmor = equipmentList[0];
  if (equippedArmor.typeId !== 2) {
    throw new Error(
      `The capture BIC equipped slot must be chest mask 2, received ${equippedArmor.typeId}.`
    );
  }
  const armorFields = equippedArmor.fields;
  const equippedResRef = requiredStringGffField(armorFields, "TemplateResRef");
  if (equippedResRef.toLowerCase() !== "nw_cloth001") {
    throw new Error(
      `Unexpected capture BIC chest item '${equippedResRef}'.`
    );
  }
  const armorBodyParts = readBicBodyPartContract(armorFields, "ArmorPart_");
  const materialColors = {
    leather1: requiredNumericGffField(armorFields, "Leather1Color"),
    leather2: requiredNumericGffField(armorFields, "Leather2Color"),
    cloth1: requiredNumericGffField(armorFields, "Cloth1Color"),
    cloth2: requiredNumericGffField(armorFields, "Cloth2Color"),
    metal1: requiredNumericGffField(armorFields, "Metal1Color"),
    metal2: requiredNumericGffField(armorFields, "Metal2Color")
  };
  const itemTemplateMetadata = {
    sourceFileType: captureBic.fileType,
    sourceFileVersion: captureBic.fileVersion,
    templateResRef: equippedResRef,
    baseItem: requiredNumericGffField(armorFields, "BaseItem"),
    ...Object.fromEntries(
      Object.entries(armorBodyParts).map(([key, value]) => [
        `bodyPart${key[0]?.toUpperCase()}${key.slice(1)}`,
        value
      ])
    ),
    leather1Color: materialColors.leather1,
    leather2Color: materialColors.leather2,
    cloth1Color: materialColors.cloth1,
    cloth2Color: materialColors.cloth2,
    metal1Color: materialColors.metal1,
    metal2Color: materialColors.metal2
  };
  const processResRef = "proof_avri461";
  const appearanceHead = requiredNumericGffField(captureBic.fields, "Appearance_Head");
  const appearanceId = requiredNumericGffField(captureBic.fields, "Appearance_Type");
  const creatureMetadata = {
    sourceFileType: captureBic.fileType,
    sourceFileVersion: captureBic.fileVersion,
    templateResRef: processResRef,
    resref: processResRef,
    firstName: captureBlueprint.firstName ?? "Avri",
    lastName: captureBlueprint.lastName ?? "Email",
    appearanceId,
    appearanceType: appearanceId,
    appearanceHead,
    gender: requiredNumericGffField(captureBic.fields, "Gender"),
    race: requiredNumericGffField(captureBic.fields, "Race"),
    phenotype: requiredNumericGffField(captureBic.fields, "Phenotype"),
    equipItemListEntries: JSON.stringify([
      {
        resRef: equippedResRef,
        slotMask: equippedArmor.typeId,
        itemTemplateMetadata
      }
    ])
  };
  const expectedPartModelResRefs = [
    `pfh0_head${String(appearanceHead).padStart(3, "0")}`,
    ...Object.entries(armorBodyParts)
      .filter(([, partId]) => partId > 0)
      .map(([key, partId]) => {
        const modelPartNameByKey: Record<string, string> = {
          rFoot: "footr",
          lFoot: "footl",
          rShin: "shinr",
          lShin: "shinl",
          lThigh: "legl",
          rThigh: "legr",
          pelvis: "pelvis",
          torso: "chest",
          belt: "belt",
          neck: "neck",
          rFArm: "forer",
          lFArm: "forel",
          rBicep: "bicepr",
          lBicep: "bicepl",
          rShoul: "sholr",
          lShoul: "sholl",
          rHand: "handr",
          lHand: "handl",
          robe: "robe"
        };
        const partName = modelPartNameByKey[key];
        if (!partName) throw new Error(`Unsupported capture BIC armor part '${key}'.`);
        return `pfh0_${partName}${String(partId).padStart(3, "0")}`;
      })
  ];

  return {
    role: "source_creature",
    instanceId: "enon_test_effect:player-entry",
    processResRef,
    renderMode: "part-based",
    creatureMetadata,
    creatureAppearanceOverride: {
      appearanceType: appearanceId,
      appearanceHead,
      bodyParts: baseBodyParts,
      colors: {
        skin: requiredNumericGffField(captureBic.fields, "Color_Skin"),
        hair: requiredNumericGffField(captureBic.fields, "Color_Hair"),
        tattoo1: requiredNumericGffField(captureBic.fields, "Color_Tattoo1"),
        tattoo2: requiredNumericGffField(captureBic.fields, "Color_Tattoo2")
      }
    },
    appearanceId,
    appearanceLabel: "(Dynamic) Human",
    sourceModel: "pfh0",
    sourceModelSource:
      "BIC appearance/body/equipment fields + hak/lc_2da appearance.2da/capart.2da + retail part MDLs",
    sourceModelObjectKeyIncludes: "hak/cep3_armor/pfh0.mdl",
    supermodel: "a_fa",
    animationName: "pause1",
    expectedPartModelResRefs,
    expectedEquipmentResRefs: [equippedResRef],
    expectedMaterialColors: materialColors,
    sourceBicSha256: captureBicSha256,
    normalizedPosition: [0, 0, 0],
    bearingRadians: 0,
    sourceForwardAuroraXY: [0, 1],
    sourceForwardSource:
      "module.ifo Mod_Entry_X/Y/Z and Mod_Entry_Dir_X/Y from the row216 source pack",
    sourceHakListCount: 59,
    sourceHakListSha256:
      "7d850c468e4872625a7ec46841bcfc35d51b37ec35595db27e218cf3a2ef6e40"
  };
}

function readBicBodyPartContract(
  fields: NonNullable<ReturnType<typeof parseRawGffDocument>>["fields"],
  prefix: "BodyPart_" | "ArmorPart_"
): Record<string, number> {
  const labelsByKey: Record<string, string> = {
    rFoot: "RFoot",
    lFoot: "LFoot",
    rShin: "RShin",
    lShin: "LShin",
    lThigh: "LThigh",
    rThigh: "RThigh",
    pelvis: "Pelvis",
    torso: "Torso",
    belt: "Belt",
    neck: "Neck",
    rFArm: "RFArm",
    lFArm: "LFArm",
    rBicep: "RBicep",
    lBicep: "LBicep",
    rShoul: "RShoul",
    lShoul: "LShoul",
    rHand: "RHand",
    lHand: "LHand",
    robe: "Robe"
  };
  return Object.fromEntries(
    Object.entries(labelsByKey).flatMap(([key, suffix]) => {
      const field = fields.find(
        (entry) => entry.label.toLowerCase() === `${prefix}${suffix}`.toLowerCase()
      );
      return field && typeof field.value === "number"
        ? [[key, field.value] as const]
        : [];
    })
  );
}

function requiredGffListField(
  fields: NonNullable<ReturnType<typeof parseRawGffDocument>>["fields"],
  label: string
): Array<{
  typeId: number;
  fields: NonNullable<ReturnType<typeof parseRawGffDocument>>["fields"];
}> {
  const field = fields.find((entry) => entry.label.toLowerCase() === label.toLowerCase());
  if (!field || !Array.isArray(field.value)) {
    throw new Error(`Missing GFF list field '${label}' in the row216 capture BIC.`);
  }
  return field.value.map((entry) => ({
    typeId: entry.typeId,
    fields: entry.fields
  }));
}

function requiredStringGffField(
  fields: NonNullable<ReturnType<typeof parseRawGffDocument>>["fields"],
  label: string
): string {
  const field = fields.find((entry) => entry.label.toLowerCase() === label.toLowerCase());
  if (!field || typeof field.value !== "string" || !field.value.trim()) {
    throw new Error(`Missing string GFF field '${label}' in the row216 capture BIC.`);
  }
  return field.value.trim();
}

function composeRetailHostAnimation(
  modelGraph: ReturnType<typeof parseAuroraMdlVfxSource>["modelGraph"],
  supermodelBytes: Buffer,
  animationName: string
): ReturnType<typeof composeAuroraMdlInheritedTransformAnimation> {
  const inspection = inspectAuroraMdlSource(supermodelBytes);
  const animation = inspection.sourceAnimations?.find(
    (candidate) => candidate.name.toLowerCase() === animationName.toLowerCase()
  );
  if (!animation) {
    throw new Error(
      `Retail supermodel '${inspection.modelName}' is missing animation '${animationName}'.`
    );
  }
  return composeAuroraMdlInheritedTransformAnimation(modelGraph, {
    animationName: animation.name,
    lengthSeconds: animation.length,
    transitionSeconds: animation.transitionTime,
    nodes: animation.nodes.map((node) => ({
      nodeName: node.nodeName,
      positionKeys: node.positionKeys.map((key) => ({
        time: key.time,
        value: [...key.value] as [number, number, number]
      })),
      orientationKeys: node.orientationKeys.map((key) => ({
        time: key.time,
        axisAngle: [...key.axisAngle] as [number, number, number, number]
      })),
      scaleKeys: node.scaleKeys.map((key) => ({ time: key.time, value: key.value }))
    }))
  });
}

function assertExpectedSupermodel(
  modelBytes: Buffer,
  modelResref: string,
  expectedSupermodelResref: string
): void {
  const actual = inspectAuroraMdlSource(modelBytes).supermodel?.toLowerCase();
  if (actual !== expectedSupermodelResref.toLowerCase()) {
    throw new Error(
      `Retail ${modelResref}.mdl supermodel mismatch: expected ${expectedSupermodelResref}, received ${actual ?? "none"}.`
    );
  }
}

function requiredNumericGffField(
  fields: NonNullable<ReturnType<typeof parseRawGffDocument>>["fields"],
  label: string
): number {
  const field = fields.find((entry) => entry.label.toLowerCase() === label.toLowerCase());
  if (!field || typeof field.value !== "number" || !Number.isFinite(field.value)) {
    throw new Error(`Missing numeric GFF field '${label}' in the row216 capture BIC.`);
  }
  return field.value;
}

async function requiredRetailResource(
  reader: NwnKeyBifResourceReader,
  resref: string,
  resourceType: number
): Promise<Buffer> {
  const bytes = await reader.read(resref, resourceType);
  if (!bytes) throw new Error(`Missing retail resource ${resref}:${resourceType}.`);
  return bytes;
}

async function requiredHakResource(hakName: string, resref: string): Promise<Buffer> {
  const hakPath = resolve(nwnUserHakRoot, hakName);
  const bytes = await readNwnErfResource(
    hakPath,
    resref,
    NWN_KEY_BIF_RESOURCE_TYPES.MDL
  );
  if (!bytes) throw new Error(`Missing ordered-HAK resource ${hakName}/${resref}.mdl.`);
  return bytes;
}

function assertExpectedRetailHash(name: string, actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`Retail ${name} hash mismatch: expected ${expected}, received ${actual}.`);
  }
}

function assertRetailManifest(
  spec: FixtureSpec,
  manifest: {
    source: { rowId: number; label: string };
    model: { emitterCount: number };
    missingTextureResources: string[];
  }
): void {
  if (manifest.source.rowId !== spec.rowId || manifest.source.label !== spec.label) {
    throw new Error(`Retail source mismatch for ${spec.slug}.`);
  }
  if (manifest.model.emitterCount <= 0 || manifest.missingTextureResources.length > 0) {
    throw new Error(`Retail source dependencies are incomplete for ${spec.slug}.`);
  }
}

function resolveAnimationLengthSeconds(
  emitters: ReturnType<typeof parseAuroraMdlVfxSource>["emitters"],
  animationName: string
): number {
  const lengths = [
    ...new Set(
      emitters.flatMap((emitter) =>
        (emitter.animationPasses ?? [])
          .filter((pass) => pass.animationName.toLowerCase() === animationName.toLowerCase())
          .map((pass) => pass.lengthSeconds)
      )
    )
  ].filter((value): value is number => typeof value === "number" && value > 0);
  if (lengths.length !== 1) {
    throw new Error(
      `Expected one positive '${animationName}' animation length; received ${lengths.join(", ") || "none"}.`
    );
  }
  return lengths[0];
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function parseFixtureTextureTxi(text: string, source: string): {
  mipmap?: boolean;
  filter?: boolean;
  clamp?: 0 | 1 | 2 | 3;
  downsampleMin?: number;
  downsampleMax?: number;
  source: string;
} {
  const state: {
    mipmap?: boolean;
    filter?: boolean;
    clamp?: 0 | 1 | 2 | 3;
    downsampleMin?: number;
    downsampleMax?: number;
    source: string;
  } = { source };
  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.replace(/\/\/.*$/u, "").replace(/#.*$/u, "").trim();
    if (!line) continue;
    const [rawKey, rawValue] = line.split(/\s+/u, 2);
    const key = rawKey?.toLowerCase();
    const value = Number(rawValue);
    if (!Number.isFinite(value)) continue;
    if (key === "mipmap") state.mipmap = value !== 0;
    if (key === "filter") state.filter = value !== 0;
    if (key === "clamp" && value >= 0 && value <= 3) {
      state.clamp = Math.trunc(value) as 0 | 1 | 2 | 3;
    }
    if (key === "downsamplemin") state.downsampleMin = value;
    if (key === "downsamplemax") state.downsampleMax = value;
  }
  return state;
}

interface RetailAreaProofSceneSource {
  status: string;
  sourceCoordinateSpace: string;
  meshFilter: string;
  effectOrigin: { x: number; y: number; z: number };
  areaLighting: Record<string, unknown>;
  models: Array<{
    instanceId?: string;
    resourceKey: string;
    translation: [number, number, number];
    [key: string]: unknown;
  }>;
  textures: Array<{
    resourceKey: string;
    [key: string]: unknown;
  }>;
  omittedOracleObjects?: Array<Record<string, unknown>>;
}

async function readRetailAreaProofSceneSource(): Promise<RetailAreaProofSceneSource> {
  const sourceFixtureRoot = resolve(publicFixtureRoot, "vfx-nwn-web-row22");
  const sourceManifestPath = resolve(
    repoRoot,
    "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row22/fixture-manifest.json"
  );
  const sourceManifest = JSON.parse(
    await readFile(sourceManifestPath, "utf8")
  ) as {
    proofScene?: RetailAreaProofSceneSource;
  };
  const source = sourceManifest.proofScene;
  if (!source) {
    throw new Error("The source-backed row22 retail-area proof scene is missing.");
  }
  return source;
}

async function prepareTargetCenteredRetailAreaProofScene(
  destinationFixtureRoot: string,
  input: {
    status: string;
    effectOrigin: { x: number; y: number; z: number };
    admittedInstanceIds?: ReadonlySet<string>;
    areaLighting?: Record<string, unknown>;
    sourceEvidence: string[];
    omittedOracleObjects?: Array<Record<string, unknown>>;
    metadata?: Record<string, unknown>;
  }
): Promise<Record<string, unknown>> {
  const sourceFixtureRoot = resolve(publicFixtureRoot, "vfx-nwn-web-row22");
  const source = await readRetailAreaProofSceneSource();
  const translationOffset = {
    x: source.effectOrigin.x - input.effectOrigin.x,
    y: source.effectOrigin.y - input.effectOrigin.y,
    z: source.effectOrigin.z - input.effectOrigin.z
  };
  const models = source.models
    .filter(
      (entry) =>
        !input.admittedInstanceIds ||
        (entry.instanceId ? input.admittedInstanceIds.has(entry.instanceId) : false)
    )
    .map((entry) => ({
    ...entry,
    translation: [
      normalizeProofSceneCoordinate(entry.translation[0] + translationOffset.x),
      normalizeProofSceneCoordinate(entry.translation[1] + translationOffset.y),
      normalizeProofSceneCoordinate(entry.translation[2] + translationOffset.z)
    ] as [number, number, number]
    }));
  for (const resource of [...models, ...source.textures]) {
    const sourcePath = resolve(sourceFixtureRoot, resource.resourceKey);
    const destinationPath = resolve(destinationFixtureRoot, resource.resourceKey);
    if (!destinationPath.startsWith(destinationFixtureRoot)) {
      throw new Error(`Unsafe proof-scene resource key '${resource.resourceKey}'.`);
    }
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
  }
  return {
    ...source,
    ...(input.metadata ?? {}),
    status: input.status,
    effectOrigin: input.effectOrigin,
    areaLighting: {
      ...source.areaLighting,
      ...(input.areaLighting ?? {})
    },
    models,
    sourceEvidence: input.sourceEvidence,
    omittedOracleObjects:
      input.omittedOracleObjects ?? source.omittedOracleObjects ?? []
  };
}

async function prepareRow1RetailAreaProofScene(
  destinationFixtureRoot: string
): Promise<Record<string, unknown>> {
  const sourcePackRoot = resolve(
    evidenceRoot,
    "row1/nwn/source-scene/enon-test-effect-row1-exact-module-source-pack-20260811"
  );
  const [sourcePackManifest, rawAreSummary, rawGitSummary, tilesetSummary, preflight] =
    await Promise.all([
      readJsonFile<Record<string, unknown>>(resolve(sourcePackRoot, "manifest.json")),
      readJsonFile<{
        source?: { sha256?: string };
        parsed?: { tileCount?: number };
      }>(resolve(sourcePackRoot, "raw.are.summary.json")),
      readJsonFile<{ source?: { sha256?: string } }>(
        resolve(sourcePackRoot, "raw.git.summary.json")
      ),
      readJsonFile<{
        source?: { path?: string };
        referencedTileCount?: number;
        referencedModelResolvedCount?: number;
        referencedTiles?: Array<{
          index?: number;
          resolvedModelResRef?: string;
        }>;
      }>(resolve(sourcePackRoot, "tileset.set.summary.json")),
      readJsonFile<{
        sourceModule?: { path?: string; sha256?: string };
      }>(resolve(evidenceRoot, "row1/nwn/preflight.json"))
    ]);

  const expected = {
    moduleSha256: "fda307d129f0c0e17411fb5820c6c528ee66e3a079202be5e8e38be781cff010",
    areSha256: "5dad3c2b055056479f4ce7b2c8bc25a408208700b6901c1bf1986ac50368f585",
    gitSha256: "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6"
  };
  if (
    preflight.sourceModule?.sha256 !== expected.moduleSha256 ||
    rawAreSummary.source?.sha256 !== expected.areSha256 ||
    rawGitSummary.source?.sha256 !== expected.gitSha256
  ) {
    throw new Error("The exact row1 source-scene identity does not match the admitted proof contract.");
  }

  const resolvedTiles = (tilesetSummary.referencedTiles ?? [])
    .filter(
      (entry): entry is { index: number; resolvedModelResRef: string } =>
        typeof entry.index === "number" && Boolean(entry.resolvedModelResRef)
    )
    .map((entry) => ({
      index: entry.index,
      resolvedModelResRef: entry.resolvedModelResRef
    }));
  if (
    rawAreSummary.parsed?.tileCount !== 4 ||
    tilesetSummary.referencedTileCount !== 4 ||
    tilesetSummary.referencedModelResolvedCount !== 4 ||
    !tilesetSummary.source?.path?.toLowerCase().endsWith("q_tilesets.hak") ||
    JSON.stringify(resolvedTiles) !==
      JSON.stringify([
        { index: 0, resolvedModelResRef: "tin01_h01_02" },
        { index: 1, resolvedModelResRef: "tin01_h01_03" },
        { index: 2, resolvedModelResRef: "gin01_h01_08" },
        { index: 3, resolvedModelResRef: "gin01_h01_08" }
      ])
  ) {
    throw new Error("The exact row1 HAK-backed proof-scene coverage changed.");
  }

  const scene = await prepareTargetCenteredRetailAreaProofScene(destinationFixtureRoot, {
    status: "source-backed-exact-row1-module-area-target-actor",
    effectOrigin: { x: 9.5, y: 6.8, z: 0 },
    areaLighting: {
      sourcePath:
        "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\tlc_vfx_catalog_lab_iter1.mod::enon_test_effect.are",
      sourceSha256: expected.areSha256
    },
    metadata: {
      sourceModule: {
        path: preflight.sourceModule?.path,
        sha256: expected.moduleSha256
      },
      sourceArea: {
        areaResref: "enon_test_effect",
        areSha256: expected.areSha256,
        gitSha256: expected.gitSha256,
        sourcePackVersion: sourcePackManifest.version
      },
      coverage: {
        sourceTileCount: 4,
        admittedTileCount: 4,
        unresolvedTileCount: 0,
        unresolvedTileIndexes: []
      },
      actors: [
        {
          role: "target_creature",
          instanceId: "enon_test_effect:creature-0",
          templateResRef: "nw_innkeeper",
          appearanceId: 233,
          appearanceLabel: "Human: Innkeeper",
          sourceModel: "c_yinnkeep",
          sourceModelSource:
            "hak/lc_2da/appearance.2da#233 -> hak/cep3_core0/c_yinnkeep.mdl",
          supermodel: "a_ba",
          animationName: "pause1",
          normalizedPosition: [0, 0, 0],
          bearingRadians: Math.PI / 2,
          sourceForwardAuroraXY: [0, -1],
          sourceForwardSource:
            "vb1shot.nss: SetFacingPoint(GetPosition(oSource)); target=(9.5,6.8), source=(9.5,3.8)",
          sourceBoundsHeight: 1.9428,
          sourceHakListCount: 59,
          sourceHakListSha256:
            "7d850c468e4872625a7ec46841bcfc35d51b37ec35595db27e218cf3a2ef6e40"
        }
      ],
      objectAttachmentTarget: {
        version: "aurora-vfx-object-attachment-target/v1",
        phase: "impact",
        targetKind: "creature",
        sourceKind: "actor-role",
        sourceId: "target_creature",
        targetSpecialNodePrefix: ""
      }
    },
    sourceEvidence: [
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/preflight.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/source-scene/enon-test-effect-row1-exact-module-source-pack-20260811/manifest.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/source-scene/enon-test-effect-row1-exact-module-source-pack-20260811/raw.are.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/source-scene/enon-test-effect-row1-exact-module-source-pack-20260811/raw.git.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/source-scene/enon-test-effect-row1-exact-module-source-pack-20260811/tileset.set.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row1/nwn/scripts/vb1shot.nss",
      "backend/docs/aurora-reverse/vfx-object-duration-owner-runtime-audit-2026-07-19.md",
      "backend/docs/aurora-reverse/vfx-object-duration-owner-integer-tick-audit-2026-08-13.md"
    ],
    omittedOracleObjects: [
      {
        role: "source_creature",
        sourceModel: "pfh0",
        reason:
          "The exact player appearance requires BIC appearance-part and PLT assembly and is not reconstructed in this comparison fixture."
      }
    ]
  });
  const { meshFilter: _row1ReceiverFilter, ...fullScene } = scene;
  return fullScene;
}

async function prepareAoe0RetailAreaProofScene(
  destinationFixtureRoot: string
): Promise<Record<string, unknown>> {
  const sourcePackRoot = resolve(
    evidenceRoot,
    "aoe0/nwn/source-scene/enon-test-effect-aoe0-exact-module-source-pack-20260813"
  );
  const [sourcePackManifest, rawAreSummary, rawGitSummary, tilesetSummary, aoeSummary] =
    await Promise.all([
      readJsonFile<Record<string, unknown>>(resolve(sourcePackRoot, "manifest.json")),
      readJsonFile<{
        source?: { sha256?: string };
        parsed?: { tileCount?: number };
      }>(resolve(sourcePackRoot, "raw.are.summary.json")),
      readJsonFile<{ source?: { sha256?: string } }>(
        resolve(sourcePackRoot, "raw.git.summary.json")
      ),
      readJsonFile<{
        source?: { path?: string };
        referencedTileCount?: number;
        referencedModelResolvedCount?: number;
        referencedTiles?: Array<{
          index?: number;
          resolvedModelResRef?: string;
        }>;
      }>(resolve(sourcePackRoot, "tileset.set.summary.json")),
      readJsonFile<{
        module?: { module?: string; moduleSha256?: string };
      }>(resolve(evidenceRoot, "aoe0/nwn/summary.json"))
    ]);

  const expected = {
    moduleSha256: "bfc6992cdb2d72d34e1cf421fb860e922f173fd649e20bb24aea33535c31a4c4",
    areSha256: "afdb077f76ae1a9cde5175333a82b276a7cbac0e93517cf040fa24dba2c402c6",
    gitSha256: "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6"
  };
  if (
    aoeSummary.module?.moduleSha256 !== expected.moduleSha256 ||
    rawAreSummary.source?.sha256 !== expected.areSha256 ||
    rawGitSummary.source?.sha256 !== expected.gitSha256
  ) {
    throw new Error("The exact aoe0 source-scene identity does not match the admitted proof contract.");
  }

  const resolvedTiles = (tilesetSummary.referencedTiles ?? [])
    .filter(
      (entry): entry is { index: number; resolvedModelResRef: string } =>
        typeof entry.index === "number" && Boolean(entry.resolvedModelResRef)
    )
    .map((entry) => ({
      index: entry.index,
      resolvedModelResRef: entry.resolvedModelResRef
    }));
  if (
    rawAreSummary.parsed?.tileCount !== 4 ||
    tilesetSummary.referencedTileCount !== 4 ||
    tilesetSummary.referencedModelResolvedCount !== 4 ||
    !tilesetSummary.source?.path?.toLowerCase().endsWith("q_tilesets.hak") ||
    JSON.stringify(resolvedTiles) !==
      JSON.stringify([
        { index: 0, resolvedModelResRef: "tin01_h01_02" },
        { index: 1, resolvedModelResRef: "tin01_h01_03" },
        { index: 2, resolvedModelResRef: "gin01_h01_08" },
        { index: 3, resolvedModelResRef: "gin01_h01_08" }
      ])
  ) {
    throw new Error("The exact aoe0 base-tile proof-scene coverage changed.");
  }

  const scene = await prepareTargetCenteredRetailAreaProofScene(destinationFixtureRoot, {
    status: "source-backed-exact-aoe0-module-area-target-centered",
    effectOrigin: { x: 9.5, y: 6.8, z: 0 },
    areaLighting: {
      sourcePath:
        "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\codex_vb_aoe0.mod::enon_test_effect.are",
      sourceSha256: expected.areSha256
    },
    metadata: {
      sourceModule: {
        path: aoeSummary.module?.module,
        sha256: expected.moduleSha256
      },
      sourceArea: {
        areaResref: "enon_test_effect",
        areSha256: expected.areSha256,
        gitSha256: expected.gitSha256,
        sourcePackVersion: sourcePackManifest.version
      },
      coverage: {
        sourceTileCount: 4,
        admittedTileCount: 4,
        unresolvedTileCount: 0,
        unresolvedTileIndexes: []
      }
    },
    sourceEvidence: [
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/source-scene/enon-test-effect-aoe0-exact-module-source-pack-20260813/manifest.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/source-scene/enon-test-effect-aoe0-exact-module-source-pack-20260813/raw.are.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/source-scene/enon-test-effect-aoe0-exact-module-source-pack-20260813/raw.git.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/source-scene/enon-test-effect-aoe0-exact-module-source-pack-20260813/tileset.set.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/aoe0/nwn/scripts/vba0shot.nss",
      "backend/docs/aurora-reverse/vfx-persistent-aoe-runtime-audit-2026-07-19.md"
    ],
    omittedOracleObjects: [
      {
        role: "source_creature",
        sourceModel: "pfh0",
        reason:
          "The exact player appearance requires BIC appearance-part and PLT assembly and is not reconstructed in this comparison fixture."
      },
      {
        role: "target_creature",
        sourceModel: "c_yinnkeep",
        reason:
          "The saved target requires its HAK-backed supermodel animation chain and is not replaced with a static or fallback actor."
      }
    ]
  });
  const { meshFilter: _row1ReceiverFilter, ...fullScene } = scene;
  return fullScene;
}

async function prepareRow44RetailAreaProofScene(
  destinationFixtureRoot: string
): Promise<Record<string, unknown>> {
  const sourcePackRoot = resolve(
    evidenceRoot,
    "row44/nwn/source-scene/enon-test-effect-row44-exact-module-source-pack-20260813"
  );
  const [
    sourcePackManifest,
    rawAreSummary,
    rawGitSummary,
    tilesetSummary,
    row44Summary,
    capturePlayerOracle
  ] =
    await Promise.all([
      readJsonFile<Record<string, unknown>>(resolve(sourcePackRoot, "manifest.json")),
      readJsonFile<{
        source?: { sha256?: string };
        parsed?: { tileCount?: number };
      }>(resolve(sourcePackRoot, "raw.are.summary.json")),
      readJsonFile<{ source?: { sha256?: string } }>(
        resolve(sourcePackRoot, "raw.git.summary.json")
      ),
      readJsonFile<{
        source?: { path?: string };
        referencedTileCount?: number;
        referencedModelResolvedCount?: number;
        referencedTiles?: Array<{
          index?: number;
          resolvedModelResRef?: string;
        }>;
      }>(resolve(sourcePackRoot, "tileset.set.summary.json")),
      readJsonFile<{
        module?: {
          module?: string;
          moduleSha256?: string;
          defaultBicSource?: string;
        };
      }>(resolve(evidenceRoot, "row44/nwn/summary.json")),
      loadCapturePlayerOracle()
    ]);

  const expected = {
    moduleSha256: "b8e03c0b9e1708467d57ff1b652b4c83df9c38638b0773d15033dc7448c8c790",
    areSha256: "ccdf7a3e02ac9eb304e45833cf2c1f11fc18e0829d372e7f2e8550c7e40d279d",
    gitSha256: "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6"
  };
  if (
    row44Summary.module?.moduleSha256 !== expected.moduleSha256 ||
    resolve(row44Summary.module?.defaultBicSource ?? "") !== row216CaptureBicPath ||
    rawAreSummary.source?.sha256 !== expected.areSha256 ||
    rawGitSummary.source?.sha256 !== expected.gitSha256
  ) {
    throw new Error("The exact row44 source-scene identity does not match the admitted proof contract.");
  }

  const resolvedTiles = (tilesetSummary.referencedTiles ?? [])
    .filter(
      (entry): entry is { index: number; resolvedModelResRef: string } =>
        typeof entry.index === "number" && Boolean(entry.resolvedModelResRef)
    )
    .map((entry) => ({
      index: entry.index,
      resolvedModelResRef: entry.resolvedModelResRef
    }));
  if (
    rawAreSummary.parsed?.tileCount !== 4 ||
    tilesetSummary.referencedTileCount !== 4 ||
    tilesetSummary.referencedModelResolvedCount !== 4 ||
    !tilesetSummary.source?.path?.toLowerCase().endsWith("q_tilesets.hak") ||
    JSON.stringify(resolvedTiles) !==
      JSON.stringify([
        { index: 0, resolvedModelResRef: "tin01_h01_02" },
        { index: 1, resolvedModelResRef: "tin01_h01_03" },
        { index: 2, resolvedModelResRef: "gin01_h01_08" },
        { index: 3, resolvedModelResRef: "gin01_h01_08" }
      ])
  ) {
    throw new Error("The exact row44 base-tile proof-scene coverage changed.");
  }

  const scene = await prepareTargetCenteredRetailAreaProofScene(destinationFixtureRoot, {
    status: "source-backed-exact-row44-module-area-bic-source-and-target-actors",
    effectOrigin: { x: 9.5, y: 6.8, z: 0 },
    areaLighting: {
      sourcePath:
        "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\codex_vb_row44.mod::enon_test_effect.are",
      sourceSha256: expected.areSha256
    },
    metadata: {
      sourceModule: {
        path: row44Summary.module?.module,
        sha256: expected.moduleSha256
      },
      sourceArea: {
        areaResref: "enon_test_effect",
        areSha256: expected.areSha256,
        gitSha256: expected.gitSha256,
        sourcePackVersion: sourcePackManifest.version
      },
      coverage: {
        sourceTileCount: 4,
        admittedTileCount: 4,
        unresolvedTileCount: 0,
        unresolvedTileIndexes: []
      },
      actors: [
        {
          ...capturePlayerOracle.proofActor,
          role: "source_creature",
          normalizedPosition: [0, -3, 0],
          bearingRadians: 0,
          sourceForwardAuroraXY: [0, 1],
          sourceForwardSource:
            "vb44shot.nss: SetFacingPoint(GetPosition(oTarget)); source=(9.5,3.8), target=(9.5,6.8)"
        },
        {
          role: "target_creature",
          instanceId: "enon_test_effect:creature-0",
          templateResRef: "nw_innkeeper",
          appearanceId: 233,
          appearanceLabel: "Human: Innkeeper",
          sourceModel: "c_yinnkeep",
          sourceModelSource:
            "hak/lc_2da/appearance.2da#233 -> hak/cep3_core0/c_yinnkeep.mdl",
          supermodel: "a_ba",
          animationName: "pause1",
          normalizedPosition: [0, 0, 0],
          bearingRadians: Math.PI / 2,
          sourceForwardAuroraXY: [0, -1],
          sourceForwardSource:
            "vb44shot.nss: SetFacingPoint(GetPosition(oSource)); target=(9.5,6.8), source=(9.5,3.8)",
          sourceBoundsHeight: 1.9428,
          sourceHakListCount: 59,
          sourceHakListSha256:
            "7d850c468e4872625a7ec46841bcfc35d51b37ec35595db27e218cf3a2ef6e40"
        }
      ]
    },
    sourceEvidence: [
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/source-scene/enon-test-effect-row44-exact-module-source-pack-20260813/manifest.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/source-scene/enon-test-effect-row44-exact-module-source-pack-20260813/raw.are.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/source-scene/enon-test-effect-row44-exact-module-source-pack-20260813/raw.git.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/source-scene/enon-test-effect-row44-exact-module-source-pack-20260813/tileset.set.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row44/nwn/scripts/vb44shot.nss",
      "backend/docs/aurora-reverse/vfx-row44-proof-scene-source-audit-2026-07-19.md",
      row44Summary.module?.defaultBicSource ?? row216CaptureBicPath
    ],
    omittedOracleObjects: []
  });
  const { meshFilter: _row44ReceiverFilter, ...fullScene } = scene;
  return fullScene;
}

async function prepareRow50RetailAreaProofScene(
  destinationFixtureRoot: string
): Promise<Record<string, unknown>> {
  const sourcePackRoot = resolve(
    evidenceRoot,
    "row50/nwn/source-scene/enon-test-effect-row50-exact-module-source-pack-20260813"
  );
  const [sourcePackManifest, rawAreSummary, rawGitSummary, tilesetSummary, row50Summary] =
    await Promise.all([
      readJsonFile<Record<string, unknown>>(resolve(sourcePackRoot, "manifest.json")),
      readJsonFile<{
        source?: { sha256?: string };
        parsed?: { tileCount?: number };
      }>(resolve(sourcePackRoot, "raw.are.summary.json")),
      readJsonFile<{ source?: { sha256?: string } }>(
        resolve(sourcePackRoot, "raw.git.summary.json")
      ),
      readJsonFile<{
        source?: { path?: string };
        referencedTileCount?: number;
        referencedModelResolvedCount?: number;
        referencedTiles?: Array<{
          index?: number;
          resolvedModelResRef?: string;
        }>;
      }>(resolve(sourcePackRoot, "tileset.set.summary.json")),
      readJsonFile<{
        module?: { module?: string; moduleSha256?: string };
      }>(resolve(evidenceRoot, "row50/nwn/summary.json"))
    ]);

  const expected = {
    moduleSha256: "f7602d85db6768af7940f7de19aa54799ab1e9398aa224451bd6bf9d94b24fb1",
    areSha256: "3bd24a1014ac5052a34e77c200fda9dc05b908bdc4f696f9b485ea76d9eb6f3c",
    gitSha256: "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6"
  };
  if (
    row50Summary.module?.moduleSha256 !== expected.moduleSha256 ||
    rawAreSummary.source?.sha256 !== expected.areSha256 ||
    rawGitSummary.source?.sha256 !== expected.gitSha256
  ) {
    throw new Error("The exact row50 source-scene identity does not match the admitted proof contract.");
  }

  const resolvedTiles = (tilesetSummary.referencedTiles ?? [])
    .filter(
      (entry): entry is { index: number; resolvedModelResRef: string } =>
        typeof entry.index === "number" && Boolean(entry.resolvedModelResRef)
    )
    .map((entry) => ({
      index: entry.index,
      resolvedModelResRef: entry.resolvedModelResRef
    }));
  if (
    rawAreSummary.parsed?.tileCount !== 4 ||
    tilesetSummary.referencedTileCount !== 4 ||
    tilesetSummary.referencedModelResolvedCount !== 4 ||
    !tilesetSummary.source?.path?.toLowerCase().endsWith("q_tilesets.hak") ||
    JSON.stringify(resolvedTiles) !==
      JSON.stringify([
        { index: 0, resolvedModelResRef: "tin01_h01_02" },
        { index: 1, resolvedModelResRef: "tin01_h01_03" },
        { index: 2, resolvedModelResRef: "gin01_h01_08" },
        { index: 3, resolvedModelResRef: "gin01_h01_08" }
      ])
  ) {
    throw new Error("The exact row50 base-tile proof-scene coverage changed.");
  }

  const scene = await prepareTargetCenteredRetailAreaProofScene(destinationFixtureRoot, {
    status: "source-backed-exact-row50-module-area-target-actor",
    effectOrigin: { x: 9.5, y: 6.8, z: 0 },
    areaLighting: {
      sourcePath:
        "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\codex_vb_row50.mod::enon_test_effect.are",
      sourceSha256: expected.areSha256
    },
    metadata: {
      sourceModule: {
        path: row50Summary.module?.module,
        sha256: expected.moduleSha256
      },
      sourceArea: {
        areaResref: "enon_test_effect",
        areSha256: expected.areSha256,
        gitSha256: expected.gitSha256,
        sourcePackVersion: sourcePackManifest.version
      },
      coverage: {
        sourceTileCount: 4,
        admittedTileCount: 4,
        unresolvedTileCount: 0,
        unresolvedTileIndexes: []
      },
      actors: [
        {
          role: "target_creature",
          instanceId: "enon_test_effect:creature-0",
          templateResRef: "nw_innkeeper",
          appearanceId: 233,
          appearanceLabel: "Human: Innkeeper",
          sourceModel: "c_yinnkeep",
          sourceModelSource:
            "hak/lc_2da/appearance.2da#233 -> hak/cep3_core0/c_yinnkeep.mdl",
          supermodel: "a_ba",
          animationName: "pause1",
          normalizedPosition: [0, 0, 0],
          bearingRadians: Math.PI / 2,
          sourceForwardAuroraXY: [0, -1],
          sourceForwardSource:
            "vb50shot.nss: SetFacingPoint(GetPosition(oSource)); target=(9.5,6.8), source=(9.5,3.8)",
          sourceBoundsHeight: 1.9428,
          sourceHakListCount: 59,
          sourceHakListSha256:
            "7d850c468e4872625a7ec46841bcfc35d51b37ec35595db27e218cf3a2ef6e40"
        }
      ],
      objectAttachmentTarget: {
        version: "aurora-vfx-object-attachment-target/v1",
        phase: "impact",
        targetKind: "creature",
        sourceKind: "actor-role",
        sourceId: "target_creature",
        targetSpecialNodePrefix: ""
      }
    },
    sourceEvidence: [
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row50/nwn/summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row50/nwn/source-scene/enon-test-effect-row50-exact-module-source-pack-20260813/manifest.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row50/nwn/source-scene/enon-test-effect-row50-exact-module-source-pack-20260813/raw.are.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row50/nwn/source-scene/enon-test-effect-row50-exact-module-source-pack-20260813/raw.git.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row50/nwn/source-scene/enon-test-effect-row50-exact-module-source-pack-20260813/tileset.set.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row50/nwn/scripts/vb50shot.nss",
      "backend/docs/aurora-reverse/vfx-row50-proof-scene-source-audit-2026-07-19.md"
    ],
    omittedOracleObjects: [
      {
        role: "source_creature",
        sourceModel: "pfh0",
        reason:
          "The exact player appearance requires BIC appearance-part and PLT assembly and is not reconstructed in this comparison fixture."
      }
    ]
  });
  const { meshFilter: _row50ReceiverFilter, ...fullScene } = scene;
  return fullScene;
}

async function prepareRow216RetailAreaProofScene(
  destinationFixtureRoot: string,
  sourceProofActor: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const sourcePackRoot = resolve(
    evidenceRoot,
    "row216/nwn/source-scene/enon-test-effect-source-pack-20260716"
  );
  const [sourcePackManifest, rawAreSummary, rawGitSummary, tilesetSummary, nwnSummary] =
    await Promise.all([
      readJsonFile<Record<string, unknown>>(resolve(sourcePackRoot, "manifest.json")),
      readJsonFile<{
        source?: { sha256?: string; path?: string };
        parsed?: { tileCount?: number };
      }>(resolve(sourcePackRoot, "raw.are.summary.json")),
      readJsonFile<{ source?: { sha256?: string } }>(
        resolve(sourcePackRoot, "raw.git.summary.json")
      ),
      readJsonFile<{
        referencedTileCount?: number;
        referencedModelResolvedCount?: number;
      }>(resolve(sourcePackRoot, "tileset.set.summary.json")),
      readJsonFile<{
        module?: { module?: string; moduleSha256?: string; defaultBicSource?: string };
      }>(resolve(evidenceRoot, "row216/nwn/summary.json"))
    ]);
  const expected = {
    moduleSha256: "7621ef0431d31eb981a3d0a652c84b37ad361da66a3e8d962da1f621def17436",
    areSha256: "ae74d9f72242d0deb64d5fa888dbfd7c3c5a082ae381d74ab4323e354969d784",
    gitSha256: "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6"
  };
  if (
    nwnSummary.module?.moduleSha256 !== expected.moduleSha256 ||
    rawAreSummary.source?.sha256 !== expected.areSha256 ||
    rawGitSummary.source?.sha256 !== expected.gitSha256
  ) {
    throw new Error("The row216 module/Area source identity changed from the admitted proof contract.");
  }
  if (
    rawAreSummary.parsed?.tileCount !== 4 ||
    tilesetSummary.referencedTileCount !== 4 ||
    tilesetSummary.referencedModelResolvedCount !== 4
  ) {
    throw new Error("The row216 four-tile proof-scene coverage changed.");
  }

  const scene = await prepareTargetCenteredRetailAreaProofScene(destinationFixtureRoot, {
    status:
      "source-backed-row216-area-geometry-exact-bic-source-and-git-target-actors",
    effectOrigin: { x: 9.5, y: 3.799999952316284, z: 0 },
    areaLighting: {
      sourcePath: rawAreSummary.source?.path,
      sourceSha256: expected.areSha256
    },
    metadata: {
      sourceModule: {
        path: nwnSummary.module?.module,
        sha256: expected.moduleSha256
      },
      sourceArea: {
        areaResref: "enon_test_effect",
        areSha256: expected.areSha256,
        gitSha256: expected.gitSha256,
        sourcePackVersion: sourcePackManifest.version
      },
      coverage: {
        sourceTileCount: 4,
        admittedTileCount: 4,
        unresolvedTileCount: 0,
        unresolvedTileIndexes: []
      },
      actors: [
        sourceProofActor,
        {
          role: "target_creature",
          instanceId: "enon_test_effect:creature-0",
          templateResRef: "nw_innkeeper",
          appearanceId: 233,
          appearanceLabel: "Human: Innkeeper",
          sourceModel: "c_yinnkeep",
          sourceModelSource:
            "hak/lc_2da/appearance.2da#233 -> hak/cep3_core0/c_yinnkeep.mdl",
          sourceModelObjectKeyIncludes: "hak/cep3_core0/c_yinnkeep.mdl",
          supermodel: "a_ba",
          animationName: "pause1",
          normalizedPosition: [0, 3, 0],
          bearingRadians: Math.PI / 2,
          sourceForwardAuroraXY: [0, -1],
          sourceForwardSource:
            "row216 script/source-target contract: target=(9.5,6.8), source=(9.5,3.8)",
          sourceBoundsHeight: 1.9428,
          sourceHakListCount: 59,
          sourceHakListSha256:
            "7d850c468e4872625a7ec46841bcfc35d51b37ec35595db27e218cf3a2ef6e40"
        }
      ]
    },
    sourceEvidence: [
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn/summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn/source-scene/enon-test-effect-source-pack-20260716/manifest.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn/source-scene/enon-test-effect-source-pack-20260716/raw.are.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn/source-scene/enon-test-effect-source-pack-20260716/raw.git.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row216/nwn/source-scene/enon-test-effect-source-pack-20260716/tileset.set.summary.json",
      "C:/Users/enonw/Documents/Neverwinter Nights/localvault/avriemail461.bic",
      "backend/docs/aurora-reverse/vfx-row216-contour-occlusion-audit-2026-08-13.md"
    ],
    omittedOracleObjects: []
  });
  const { meshFilter: _row216ReceiverFilter, ...fullScene } = scene;
  return fullScene;
}

async function prepareRow181RetailAreaProofScene(
  destinationFixtureRoot: string
): Promise<Record<string, unknown>> {
  const sourcePackRoot = resolve(
    evidenceRoot,
    "row181/nwn-recapture-2/source-scene/enon-test-effect-row181-exact-module-source-pack-20260813"
  );
  const [sourcePackManifest, rawAreSummary, rawGitSummary, tilesetSummary, row181Summary] =
    await Promise.all([
      readJsonFile<Record<string, unknown>>(resolve(sourcePackRoot, "manifest.json")),
      readJsonFile<{
        source?: { sha256?: string };
        parsed?: { tileCount?: number };
      }>(resolve(sourcePackRoot, "raw.are.summary.json")),
      readJsonFile<{ source?: { sha256?: string } }>(
        resolve(sourcePackRoot, "raw.git.summary.json")
      ),
      readJsonFile<{
        source?: { path?: string };
        referencedTileCount?: number;
        referencedModelResolvedCount?: number;
        referencedTiles?: Array<{
          index?: number;
          resolvedModelResRef?: string;
        }>;
      }>(resolve(sourcePackRoot, "tileset.set.summary.json")),
      readJsonFile<{
        module?: { module?: string; moduleSha256?: string };
      }>(resolve(evidenceRoot, "row181/nwn-recapture-2/summary.json"))
    ]);

  const expected = {
    moduleSha256: "4ed1a443d4382e0e2b6de58a89b2d1da1376e0dc58b475238b1bd4603e2f42a4",
    areSha256: "f2e52a1f014ff5e9b4eab6998dad0b1ddc3d9b17e44bd7e717a16bf83c056061",
    gitSha256: "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6"
  };
  if (
    row181Summary.module?.moduleSha256 !== expected.moduleSha256 ||
    rawAreSummary.source?.sha256 !== expected.areSha256 ||
    rawGitSummary.source?.sha256 !== expected.gitSha256
  ) {
    throw new Error(
      "The exact row181 source-scene identity does not match the admitted proof contract."
    );
  }

  const resolvedTiles = (tilesetSummary.referencedTiles ?? [])
    .filter(
      (entry): entry is { index: number; resolvedModelResRef: string } =>
        typeof entry.index === "number" && Boolean(entry.resolvedModelResRef)
    )
    .map((entry) => ({
      index: entry.index,
      resolvedModelResRef: entry.resolvedModelResRef
    }));
  if (
    rawAreSummary.parsed?.tileCount !== 4 ||
    tilesetSummary.referencedTileCount !== 4 ||
    tilesetSummary.referencedModelResolvedCount !== 4 ||
    !tilesetSummary.source?.path?.toLowerCase().endsWith("q_tilesets.hak") ||
    JSON.stringify(resolvedTiles) !==
      JSON.stringify([
        { index: 0, resolvedModelResRef: "tin01_h01_02" },
        { index: 1, resolvedModelResRef: "tin01_h01_03" },
        { index: 2, resolvedModelResRef: "gin01_h01_08" },
        { index: 3, resolvedModelResRef: "gin01_h01_08" }
      ])
  ) {
    throw new Error("The exact row181 base-tile proof-scene coverage changed.");
  }

  const scene = await prepareTargetCenteredRetailAreaProofScene(destinationFixtureRoot, {
    status: "source-backed-exact-row181-module-area-source-target-actor",
    effectOrigin: { x: 9.5, y: 3.8, z: 0 },
    areaLighting: {
      sourcePath:
        "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\codex_vb_r181b.mod::enon_test_effect.are",
      sourceSha256: expected.areSha256
    },
    metadata: {
      sourceModule: {
        path: row181Summary.module?.module,
        sha256: expected.moduleSha256
      },
      sourceArea: {
        areaResref: "enon_test_effect",
        areSha256: expected.areSha256,
        gitSha256: expected.gitSha256,
        sourcePackVersion: sourcePackManifest.version
      },
      coverage: {
        sourceTileCount: 4,
        admittedTileCount: 4,
        unresolvedTileCount: 0,
        unresolvedTileIndexes: []
      },
      actors: [
        {
          role: "target_creature",
          instanceId: "enon_test_effect:creature-0",
          templateResRef: "nw_innkeeper",
          appearanceId: 233,
          appearanceLabel: "Human: Innkeeper",
          sourceModel: "c_yinnkeep",
          sourceModelSource:
            "hak/lc_2da/appearance.2da#233 -> hak/cep3_core0/c_yinnkeep.mdl",
          supermodel: "a_ba",
          animationName: "pause1",
          normalizedPosition: [0, 3, 0],
          bearingRadians: Math.PI / 2,
          sourceForwardAuroraXY: [0, -1],
          sourceForwardSource:
            "vb181shot.nss: SetFacingPoint(GetPosition(oSource)); target=(9.5,6.8), source=(9.5,3.8)",
          sourceBoundsHeight: 1.9428,
          sourceHakListCount: 59,
          sourceHakListSha256:
            "7d850c468e4872625a7ec46841bcfc35d51b37ec35595db27e218cf3a2ef6e40"
        }
      ]
    },
    sourceEvidence: [
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row181/nwn-recapture-2/summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row181/nwn-recapture-2/source-scene/enon-test-effect-row181-exact-module-source-pack-20260813/manifest.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row181/nwn-recapture-2/source-scene/enon-test-effect-row181-exact-module-source-pack-20260813/raw.are.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row181/nwn-recapture-2/source-scene/enon-test-effect-row181-exact-module-source-pack-20260813/raw.git.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row181/nwn-recapture-2/source-scene/enon-test-effect-row181-exact-module-source-pack-20260813/tileset.set.summary.json",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row181/nwn-recapture-2/scripts/vb181entry.nss",
      "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16/row181/nwn-recapture-2/scripts/vb181shot.nss",
      "backend/docs/aurora-reverse/vfx-progfx-type10-projectile-audit-2026-07-18.md"
    ],
    omittedOracleObjects: [
      {
        role: "source_creature",
        sourceModel: "pfh0",
        reason:
          "The exact player appearance requires BIC appearance-part and PLT assembly and is not reconstructed in this comparison fixture."
      }
    ]
  });
  const { meshFilter: _row181ReceiverFilter, ...fullScene } = scene;
  return fullScene;
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function normalizeProofSceneCoordinate(value: number): number {
  return Number(value.toFixed(12));
}

function compactEmitterRuntimePackages(
  entries: VfxEmitterRuntimePackage[],
  frameStride: number
): Array<Record<string, unknown>> {
  const safeFrameStride = Math.max(1, Math.trunc(frameStride));
  return entries.map((entry) => ({
    emitterIndex: entry.emitterIndex,
    emitterNodeName: entry.emitterNodeName,
    ...(entry.selectedAnimation ? { selectedAnimation: entry.selectedAnimation } : {}),
    ...(entry.aoeVisualOwner ? { aoeVisualOwner: entry.aoeVisualOwner } : {}),
    ...(entry.objectDurationVisualOwner
      ? { objectDurationVisualOwner: entry.objectDurationVisualOwner }
      : {}),
    runtimeState: compactRuntimeState(entry.runtimeState),
    renderContract: compactRenderContract(entry.renderContract),
    runtimeFrames: sampleRuntimeFrames(entry.runtimeFrames ?? [], safeFrameStride).map((frame) => ({
      tickIndex: frame.tickIndex,
      timeSeconds: frame.timeSeconds,
      ...(frame.selectedAnimation ? { selectedAnimation: frame.selectedAnimation } : {}),
      ...(frame.sourceOwnerTransform
        ? { sourceOwnerTransform: frame.sourceOwnerTransform }
        : {}),
      ...(frame.aoeVisualOwner ? { aoeVisualOwner: frame.aoeVisualOwner } : {}),
      ...(frame.objectDurationVisualOwner
        ? { objectDurationVisualOwner: frame.objectDurationVisualOwner }
        : {}),
      runtimeState: compactRuntimeState(frame.runtimeState),
      renderContract: compactRenderContract(frame.renderContract)
    }))
  }));
}

function sampleRuntimeFrames<T>(frames: T[], stride: number): T[] {
  if (stride <= 1 || frames.length <= 2) return frames;
  const sampled = frames.filter((_, index) => index % stride === 0);
  const finalFrame = frames.at(-1);
  if (finalFrame !== undefined && sampled.at(-1) !== finalFrame) {
    sampled.push(finalFrame);
  }
  return sampled;
}

function compactRuntimeState(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const state = value as Record<string, unknown>;
  return {
    version: state.version,
    emitterNodeName: state.emitterNodeName,
    family: state.family,
    localClockSeconds: state.localClockSeconds,
    sourceClockSeconds: state.sourceClockSeconds,
    activeParticleIds: state.activeParticleIds
  };
}

function compactRenderContract(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const contract = value as Record<string, unknown>;
  const drawRecords = Array.isArray(contract.drawRecords)
    ? contract.drawRecords.map(compactDrawRecord)
    : [];
  return {
    version: contract.version,
    emitterNodeName: contract.emitterNodeName,
    activeParticleCount: contract.activeParticleCount,
    drawParticleCount: contract.drawParticleCount,
    verticesPerDrawParticle: contract.verticesPerDrawParticle,
    drawVertexCount: contract.drawVertexCount,
    drawLane: contract.drawLane,
    renderMode: contract.renderMode,
    blendMode: contract.blendMode,
    materialState: contract.materialState,
    renderState: contract.renderState,
    renderOrder: contract.renderOrder,
    chunkLane: contract.chunkLane,
    progFxType4Light: contract.progFxType4Light,
    progFxType4Requests: contract.progFxType4Requests,
    pltRenderContext: contract.pltRenderContext,
    drawRecords
  };
}

function compactDrawRecord(value: unknown): Record<string, unknown> {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const compact = Object.fromEntries(
    [
      "recordKind",
      "drawRecordId",
      "emitterNodeName",
      "lane",
      "particleId",
      "particleIndex",
      "linkedNextParticleId",
      "linkedNextPosition",
      "position",
      "previousPosition",
      "velocity",
      "direction",
      "landed",
      "contactNormal",
      "splat",
      "inheritedVelocityMagnitude",
      "inheritedVelocityDirection",
      "inheritPart",
      "rotationRadians",
      "particleOrientation",
      "emitterOrientation",
      "color",
      "alpha",
      "size",
      "atlasUv",
      "pltLayer",
      "pltLayerColorSource"
    ].flatMap((key) => record[key] === undefined ? [] : [[key, record[key]]])
  );
  return {
    ...compact,
    ...(compactMode(record.renderMode) ? { renderMode: compactMode(record.renderMode) } : {}),
    ...(compactMode(record.blendMode) ? { blendMode: compactMode(record.blendMode) } : {}),
    ...(compactRenderOrder(record.renderOrder)
      ? { renderOrder: compactRenderOrder(record.renderOrder) }
      : {})
  };
}

function compactMode(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const mode = value as Record<string, unknown>;
  return {
    enum: mode.enum,
    rawToken: mode.rawToken,
    modeNumber: mode.modeNumber
  };
}

function compactRenderOrder(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") return undefined;
  const order = value as Record<string, unknown>;
  return { value: order.value };
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
