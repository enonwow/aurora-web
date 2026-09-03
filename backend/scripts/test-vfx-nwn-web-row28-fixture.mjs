import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const publicRoot = resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-nwn-web-row28"
);
const manifest = JSON.parse(
  await readFile(resolve(publicRoot, "manifest.json"), "utf8")
);
const payload = JSON.parse(
  await readFile(resolve(publicRoot, "payload.json"), "utf8")
);
const payloadFileBytes = await readFile(resolve(publicRoot, "payload.json"));
const sourcePreparation = JSON.parse(
  await readFile(
    resolve(
      repoRoot,
      "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/source-preparation.json"
    ),
    "utf8"
  )
);
const sourceModel = manifest.sourceRenderableModel;
const chunk = manifest.chunks?.[0];

if (
  manifest.version !== "aurora-vfx-nwn-web-fixture/v1" ||
  manifest.fixtureId !== "vfx-nwn-web-row28" ||
  manifest.lifecycle !== "fire-and-forget" ||
  manifest.intentionalTriggerCount !== 1 ||
  manifest.sourceRowId !== 28 ||
  manifest.sourceLabel !== "VFX_FNF_METEOR_SWEARM" ||
  manifest.publicConstant !== "VFX_FNF_METEOR_SWARM" ||
  manifest.sourceModel?.sha256 !==
    "ea57f0346166314602d9d473873cedde791f9911ef90722c114481a0b6ebf29b" ||
  manifest.sourceTable?.sha256 !==
    "acefe76f7fb14e88916ae1ade40dd5108b8a2f601eaada82a67f751b4eb56ea2" ||
  manifest.runtime?.animationName !== "impact" ||
  manifest.runtime?.seed !== 523795 ||
  JSON.stringify(manifest.runtime?.cameraPosition) !==
    JSON.stringify({ x: -0.05148, y: -4.371987, z: 6.051473 }) ||
  manifest.runtime?.cameraContextSource !==
    "proof-calibrated-camera-relative-to-vfx-owner" ||
  !manifest.runtime?.cameraSourceEvidence?.includes(
    "backend/docs/aurora-reverse/vfx-row28-runtime-camera-context-audit-2026-08-24.md"
  ) ||
  manifest.nativeOracleCalibration?.version !==
    "aurora-vfx-native-oracle-calibration/v1" ||
  manifest.nativeOracleCalibration?.sourceEvidence !==
    "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/calibration-v18-client-animation-rate/source-aligned-playback-calibration-summary.json" ||
  manifest.nativeOracleCalibration?.runtimeSeed !== 523795 ||
  manifest.nativeOracleCalibration?.runtimeSeedSelection !==
    "deterministic-presentation-seed-native-state-unrecovered" ||
  manifest.nativeOracleCalibration?.runtimeSeedSourceEvidence !==
    "backend/docs/aurora-reverse/vfx-retail-rng-seed-recoverability-audit-2026-08-25.md" ||
  manifest.nativeOracleCalibration?.additiveParticleRadianceScale !== 1 ||
  manifest.nativeOracleCalibration?.bloomMultiplier !== 1 ||
  manifest.nativeOracleCalibration?.viewportWidth !== 1460 ||
  manifest.nativeOracleCalibration?.viewportHeight !== 810 ||
  manifest.nativeOracleCalibration?.runtimePlaybackRate !== 1 ||
  manifest.nativeOracleCalibration?.runtimePlaybackDelaySeconds !== 0 ||
  manifest.nativeOracleCalibration?.runtimeTimingCalibrationMethod !==
    "retail-client-source-animation-rate" ||
  manifest.nativeOracleCalibration?.nativeTriggerRelativeOnsetSeconds !== 1 ||
  manifest.nativeOracleCalibration?.nativeTriggerRelativeLastVisibleSeconds !== 3 ||
  manifest.nativeOracleCalibration?.sourceOnsetSeconds !== 871 / 1728 ||
  manifest.nativeOracleCalibration?.sourceDynamicPeakSeconds !== 589 / 432 ||
  manifest.nativeOracleCalibration?.sourceLastVisibleSeconds !== 11147 / 3456 ||
  manifest.runtime?.animationTickCount !== 198 ||
  !(manifest.runtime?.tickCount > manifest.runtime?.animationTickCount) ||
  manifest.emitterNames?.length !== 11 ||
  manifest.sourceLightNames?.length !== 1 ||
  sourceModel?.version !== "aurora-vfx-source-model-renderable/v1" ||
  sourceModel?.resref !== "vff_rainmeteor" ||
  sourceModel?.resourceKey !== "vff_rainmeteor.glb" ||
  sourceModel?.sourceSha256 !== manifest.sourceModel.sha256 ||
  sourceModel?.sourceGeometryNodeCount !== 12 ||
  chunk?.resref !== "fx_meteor" ||
  chunk?.resourceKey !== "fx_meteor.glb" ||
  chunk?.runtimePayloadResourceKey !== "fx_meteor.runtime.json" ||
  chunk?.sourceSha256 !==
    "43e6b33c5a7380a31266601db7444b80a5252c9bfc559ad91c5d8582ee90f93c" ||
  chunk?.sourceStaticGeometryCount !== 0 ||
  chunk?.hostGraphLifecycle !== "transient" ||
  chunk?.sourceEmitterNames?.length !== 4 ||
  manifest.comparisonContext?.cameraMatchEstablished !== false ||
  manifest.comparisonContext?.sceneMatchEstablished !== false ||
  manifest.comparisonContext?.ownerTargetMatchEstablished !== true ||
  manifest.proofScene?.status !==
    "source-backed-row28-native-top-down-interior-visible-surfaces-from-identical-row22-area-source" ||
  manifest.proofScene?.meshFilter !==
    "native-top-down-interior-visible-surfaces" ||
  manifest.proofScene?.meshVisibilityRule?.version !==
    "nwn-vfx-proof-scene-mesh-visibility-rule/v1" ||
  manifest.proofScene?.meshVisibilityRule?.kind !== "model-y-maximum" ||
  manifest.proofScene?.meshVisibilityRule?.maximumY !== 1.3 ||
  manifest.proofScene?.meshVisibilityRule?.comparisonAdmission !==
    "comparison-scene" ||
  manifest.proofScene?.effectOriginAlignment?.method !==
    "source-location-rebased-scene-origin" ||
  manifest.proofScene?.effectOriginAlignment?.sourceEvidence !==
    "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/calibration-v6-source-time/source-time-calibration-summary.json" ||
  JSON.stringify(manifest.proofScene?.effectOriginAlignment?.offset) !==
    JSON.stringify([0, 0, 0]) ||
  manifest.proofScene?.nativeBaselineLightingCalibration?.areaGlobalScale !== 0 ||
  manifest.proofScene?.nativeBaselineLightingCalibration?.tileLocalScale !== 0.45 ||
  manifest.proofScene?.nativeBaselineLightingCalibration?.method !==
    "matched-empty-scene-roi-luma-rmse" ||
  manifest.proofScene?.nativeBaselineLightingCalibration?.sourceEvidence !==
    "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/validated-summary.json" ||
  !manifest.proofScene?.sourceEvidence?.includes(
    "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/nwn-final/v1/nwn-row28-baseline.png"
  ) ||
  payload.provenance?.sourceRowId !== 28 ||
  payload.provenance?.sourceResRef !== "vff_rainmeteor" ||
  payload.contracts?.runtimeEmitters?.length !== 11 ||
  payload.contracts?.runtimeSharedRng?.version !==
    "aurora-vfx-shared-rng-lineage/v1" ||
  manifest.payloadTransport?.version !==
    "aurora-vfx-proof-payload-transport/v1" ||
  manifest.payloadTransport?.payloadBytes !== payloadFileBytes.byteLength ||
  manifest.payloadTransport?.maximumPayloadBytes !== 128 * 1024 * 1024 ||
  manifest.payloadTransport?.childRenderFrameVersion !==
    "aurora-vfx-child-render-contract-frame/v1" ||
  payloadFileBytes.byteLength > manifest.payloadTransport.maximumPayloadBytes ||
  payload.diagnostics?.runtimeState?.some(
    (entry) => entry.code === "VFX_PARTICLE_DEADSPACE_CAMERA_POSITION_REQUIRED"
  )
) {
  throw new Error("Row28 fixture contract is incomplete or source identity drifted.");
}

const meteorEmitters = payload.contracts.runtimeEmitters.filter((entry) =>
  ["OmenEmitter02", "OmenEmitter03"].includes(entry.emitterNodeName)
);
const firstFiveMeteorPositions = meteorEmitters.flatMap((entry) =>
  entry.runtimeFrames[10].renderContract.chunkLane.particleInstances
    .filter((particle) => particle.particleId <= 5)
    .map((particle) => particle.position)
);
const scheduledChildFrames = meteorEmitters.flatMap((entry) =>
  entry.runtimeFrames.flatMap((frame) =>
    (frame.renderContract.chunkLane?.particleInstances ?? []).flatMap(
      (particle) => particle.modelRuntimeFrame ? [particle.modelRuntimeFrame] : []
    )
  )
);
if (
  firstFiveMeteorPositions.length !== 10 ||
  firstFiveMeteorPositions.some((position) =>
    [position.x, position.y, position.z].some((value) => !Number.isFinite(value))
  )
) {
  throw new Error(
    "Row28 native-oracle seed must deterministically materialize ten finite first-five meteor positions."
  );
}
if (
  scheduledChildFrames.length === 0 ||
  scheduledChildFrames.some(
    (frame) =>
      frame.version !== "aurora-vfx-child-model-runtime-frame/v1" ||
      frame.rngLineage?.algorithm !== "nwn-ee-msvc-rand15" ||
      frame.runtimeEmitters?.some(
        (emitter) =>
          emitter.renderContractFrame?.version !==
            "aurora-vfx-child-render-contract-frame/v1" ||
          Object.hasOwn(emitter, "renderContract") ||
          emitter.renderContractFrame.compactDrawRecords?.some(
            (record) =>
              Object.hasOwn(record, "renderMode") ||
              Object.hasOwn(record, "blendMode") ||
              Object.hasOwn(record, "renderState")
          )
      )
  )
) {
  throw new Error(
    "Row28 live Chunk particles must carry compact instance-bound shared-scheduler frames."
  );
}

if (
  sourcePreparation.chunks?.[0]?.emitterCount !== 4 ||
  sourcePreparation.chunks?.[0]?.staticGeometryCount !== 0 ||
  sourcePreparation.textures?.some(
    (entry) => String(entry.resref).toLowerCase() === "null"
  )
) {
  throw new Error("Row28 recursive source preparation admitted a placeholder resource.");
}

const requiredTextureRefs = new Set([
  "chunk64",
  "fxpa_flame02",
  "fxpa_flstrk",
  "fxpa_ringwave",
  "fxpa_smoke01",
  "fxpa_starbnw",
  "fxpa_firebb"
]);
const textureRefs = new Set(
  (manifest.textures ?? []).map((entry) => String(entry.resref).toLowerCase())
);
for (const required of requiredTextureRefs) {
  if (!textureRefs.has(required)) {
    throw new Error(`Row28 fixture is missing source texture ${required}.`);
  }
}

for (const resourceKey of [
  sourceModel.resourceKey,
  chunk.resourceKey,
  chunk.runtimePayloadResourceKey,
  ...(manifest.textures ?? []).map((entry) => entry.resourceKey)
]) {
  const bytes = await readFile(resolve(publicRoot, resourceKey));
  if (bytes.length === 0) {
    throw new Error(`Row28 public fixture asset ${resourceKey} is empty.`);
  }
}

const chunkPayloadBytes = await readFile(
  resolve(publicRoot, chunk.runtimePayloadResourceKey)
);
const chunkPayload = JSON.parse(chunkPayloadBytes.toString("utf8"));
if (
  chunkPayload.provenance?.sourceResRef !== "fx_meteor" ||
  chunkPayload.contracts?.runtimeEmitters?.length !== 4 ||
  chunkPayload.contracts?.runtimeSharedRng?.initialState?.seed !== 523795
) {
  throw new Error("Row28 nested meteor runtime is not source-backed.");
}

process.stdout.write(
  `${JSON.stringify({
    status: "ok",
    fixtureId: manifest.fixtureId,
    payloadSha256: sha256(Buffer.from(JSON.stringify(payload))),
    sourceModel: sourceModel.resourceKey,
    chunk: chunk.resourceKey,
    textureCount: textureRefs.size
  })}\n`
);

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
