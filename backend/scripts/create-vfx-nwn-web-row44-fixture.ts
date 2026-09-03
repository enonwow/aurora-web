import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildDefaultRuntimeSettings } from "../src/modules/runtime-settings/domain/runtime-settings.defaults";
import { VfxApplicationService } from "../src/modules/vfx/application/vfx.application.service";
import { parseAuroraMdlVfxSource } from "../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";

const repoRoot = resolve(__dirname, "../..");
const fixtureRoot = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row44"
);
const publicRoot = resolve(repoRoot, "frontend/public/dev-fixtures/vfx-nwn-web-row44");
const modelPath = resolve(fixtureRoot, "sources/vim_explacid.mdl");
const sourceTablePath = resolve(
  "C:/Projects/nwn/VFX/source-assets/loose-graphics-and-references/nwn-vfx-research/downloads/stock_2da/visualeffects.2da"
);
const texturePath = resolve(
  "C:/Projects/nwn/VFX/source-assets/loose-graphics-and-references/tmp_extract/fxpa_flare.png"
);
const dtSeconds = 1 / 12;
const tickCount = 24;
const seed = 440044;

async function main(): Promise<void> {
  const [modelBytes, sourceTableBytes, textureBytes] = await Promise.all([
    readFile(modelPath),
    readFile(sourceTablePath),
    readFile(texturePath)
  ]);
  const modelHash = sha256(modelBytes);
  const sourceTableHash = sha256(sourceTableBytes);
  const textureHash = sha256(textureBytes);
  const parsedModel = parseAuroraMdlVfxSource(modelBytes, {
    sourceModelObjectKey: "proof/vfx-nwn-web-row44/vim_explacid.mdl",
    sourceModelFileName: "vim_explacid.mdl",
    sourceModelHash: modelHash
  });
  if (parsedModel.emitters.length !== 4) {
    throw new Error(`Expected four source emitters, received ${parsedModel.emitters.length}.`);
  }

  const service = new VfxApplicationService({
    get: async () => buildDefaultRuntimeSettings("2026-07-14T00:00:00.000Z"),
    save: async () => undefined
  });
  const envelope = await service.processVfxPackage({
    packageKind: "model_graph_runtime",
    sourceTableText: sourceTableBytes.toString("latin1"),
    sourceObjectKey: "proof/vfx-nwn-web-row44/visualeffects.2da",
    sourceLayer: "external_fixture",
    sourceRowId: 44,
    effectInstance: {
      constructorKind: "EffectVisualEffect",
      sourceRowId: 44,
      applicationMode: "location",
      durationType: "instant",
      targetRef: "proof-origin"
    },
    sourceEmitters: parsedModel.emitters,
    sourceAnimationEvents: parsedModel.animationEvents,
    sourceModelGraph: parsedModel.modelGraph,
    runtime: {
      dtSeconds,
      tickCount,
      particleLimit: 512,
      seed,
      windManager: {
        profileId: "vfx-nwn-web-row44-proof",
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
      windManagerSnapshot: runtime.windManagerSnapshot
    },
    provenance: {
      backendPayloadVersion: runtime.version,
      sourceProfile: "nwn-row44-one-trigger-proof",
      sourceTable: "visualeffects.2da",
      sourceRowId: 44,
      sourceLabel: runtime.selectedSourceRow?.label ?? "VFX_IMP_ACID_S",
      sourceResRef: "vim_explacid",
      effectInstanceId: "vfx-nwn-web-row44",
      runtimeProfile: "fixed-12fps-2s-seed-440044",
      renderContractVersion: runtime.renderContract?.version
    }
  };
  const manifest = {
    version: "aurora-vfx-nwn-web-fixture/v1",
    fixtureId: "vfx-nwn-web-row44",
    lifecycle: "fire-and-forget",
    intentionalTriggerCount: 1,
    sourceRowId: 44,
    sourceLabel: "VFX_IMP_ACID_S",
    sourceModel: { path: modelPath, sha256: modelHash },
    sourceTable: { path: sourceTablePath, sha256: sourceTableHash },
    texture: { path: texturePath, sha256: textureHash },
    runtime: { dtSeconds, tickCount, durationSeconds: dtSeconds * tickCount, seed },
    emitterNames: parsedModel.emitters.map((entry) => entry.nodeName),
    runtimeFrameCounts: runtime.runtimeEmitters?.map((entry) => ({
      emitterNodeName: entry.emitterNodeName,
      frameCount: entry.runtimeFrames?.length ?? 0
    })) ?? []
  };

  await mkdir(publicRoot, { recursive: true });
  await writeFile(resolve(publicRoot, "payload.json"), JSON.stringify(payload));
  await writeFile(resolve(publicRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
  await writeFile(resolve(fixtureRoot, "fixture-manifest.json"), JSON.stringify(manifest, null, 2));
  await copyFile(texturePath, resolve(publicRoot, "fxpa_flare.png"));
  process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

void main();
