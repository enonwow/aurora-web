import type {
  PlaceableAssetEntry,
  PlaceableAssetManifest,
  PlaceableRenderPackage
} from "../domain/template.types";
import { extractBasename } from "./catalog-processing.helpers";
import type { AuroraMdlEmitterNode } from "../../vfx/domain/aurora-mdl-vfx-source.parser";
import type {
  VfxEmitterMaterialStateInput,
  VfxProcessCommand,
  VfxResourceTraceInput,
  VfxRuntimePackage,
  VfxSourceCandidateInput
} from "../../vfx/application/vfx-processing.types";
import { buildSourceMdlLightFeatureContracts } from "./catalog-source-mdl-light-feature-manifest";

type PlaceableEmitters = NonNullable<PlaceableRenderPackage["auroraEmitter"]>["emitters"];
type PlaceableEmitter = PlaceableEmitters[number];

export interface PlaceableVfxRuntimePackagingPort {
  buildEmitterMaterials(
    renderPackage: PlaceableRenderPackage,
    emitters?: PlaceableEmitters
  ): VfxEmitterMaterialStateInput[];
  selectRuntimeSourceEmitters(emitters: PlaceableEmitters): PlaceableEmitters;
  toMdlEmitterNode(emitter: PlaceableEmitter): AuroraMdlEmitterNode;
  buildPayload(
    vfx: VfxRuntimePackage,
    runtimeReplayCommand: VfxProcessCommand,
    auroraLight?: PlaceableRenderPackage["auroraLight"]
  ): Record<string, unknown>;
  buildResourceTraces(
    assetManifest: PlaceableAssetManifest,
    auroraEmitter: PlaceableRenderPackage["auroraEmitter"] | undefined
  ): VfxResourceTraceInput[];
  buildSourceCandidates(
    assetManifest: PlaceableAssetManifest,
    auroraEmitter: PlaceableRenderPackage["auroraEmitter"] | undefined
  ): VfxSourceCandidateInput[];
}

export const placeableVfxRuntimePackaging: PlaceableVfxRuntimePackagingPort = {
  buildEmitterMaterials,
  selectRuntimeSourceEmitters,
  toMdlEmitterNode,
  buildPayload,
  buildResourceTraces,
  buildSourceCandidates
};

function buildEmitterMaterials(
  renderPackage: PlaceableRenderPackage,
  emitters = renderPackage.auroraEmitter?.emitters ?? []
): VfxEmitterMaterialStateInput[] {
  const materialsByReference = new Map<
    string,
    NonNullable<PlaceableRenderPackage["auroraMaterial"]>["materials"][number]
  >();
  for (const material of renderPackage.auroraMaterial?.materials ?? []) {
    const reference = extractBasename(material.materialFileName).trim().toLowerCase();
    if (reference && !materialsByReference.has(reference)) {
      materialsByReference.set(reference, material);
    }
  }

  return emitters.flatMap((emitter, emitterIndex) => {
    const textureReference = extractBasename(emitter.texture ?? "").trim().toLowerCase();
    const material = textureReference ? materialsByReference.get(textureReference) : undefined;
    if (!material) {
      return [];
    }
    const state = material.state;
    return [
      {
        emitterIndex,
        emitterNodeName: emitter.nodeName,
        materialState: {
          source: "aurora-mtr" as const,
          materialRef: material.materialFileName,
          ...(state.renderHint ? { renderHint: state.renderHint } : {}),
          ...(state.customShaderVS ? { customShaderVS: state.customShaderVS } : {}),
          ...(state.customShaderFS ? { customShaderFS: state.customShaderFS } : {}),
          ...(state.customShaderGS ? { customShaderGS: state.customShaderGS } : {}),
          ...(state.customShaderProgram
            ? { customShaderProgram: state.customShaderProgram }
            : {}),
          ...(state.parameters ? { parameters: state.parameters } : {}),
          ...(typeof state.transparency === "boolean"
            ? { transparency: state.transparency }
            : {}),
          ...(typeof state.twoSided === "boolean" ? { twoSided: state.twoSided } : {}),
          ...(typeof state.sampleFramebuffer === "number"
            ? { sampleFramebuffer: state.sampleFramebuffer }
            : {}),
          ...(typeof state.volumetric === "boolean" ? { volumetric: state.volumetric } : {}),
          ...(state.bumpmaptexture ? { bumpmaptexture: state.bumpmaptexture } : {}),
          ...(state.bumpyshinytexture ? { bumpyshinytexture: state.bumpyshinytexture } : {}),
          ...(state.envmaptexture ? { envmaptexture: state.envmaptexture } : {}),
          ...(state.bumpreplacementtexture
            ? { bumpreplacementtexture: state.bumpreplacementtexture }
            : {}),
          ...(state.textureSlots?.length
            ? {
                textureSlots: state.textureSlots.map((slot) => ({
                  slot: slot.slot,
                  role: slot.role,
                  reference: slot.reference
                }))
              }
            : {})
        }
      }
    ];
  });
}

function selectRuntimeSourceEmitters(emitters: PlaceableEmitters): PlaceableEmitters {
  const emittersWithParticleAssets = emitters.filter((emitter) => {
    const texture = extractBasename(emitter.texture ?? "").trim().toLowerCase();
    const chunkName = extractBasename(emitter.chunkName ?? "").trim().toLowerCase();
    return (
      chunkName.length > 0 ||
      (texture.length > 0 && texture !== "null" && texture !== "none")
    );
  });
  const candidates =
    emittersWithParticleAssets.length > 0 ? emittersWithParticleAssets : emitters;
  const selected = new Map<string, (typeof candidates)[number]>();
  for (const emitter of candidates) {
    const sourceModel = (
      emitter.sourceModelObjectKey ??
      emitter.sourceModelFileName ??
      ""
    )
      .trim()
      .toLowerCase();
    const nodeName = emitter.nodeName.trim().toLowerCase();
    const key = `${sourceModel}\u0000${nodeName}`;
    if (!selected.has(key)) {
      selected.set(key, emitter);
    }
  }
  return Array.from(selected.values());
}

function toMdlEmitterNode(emitter: PlaceableEmitter): AuroraMdlEmitterNode {
  return {
    ...emitter,
    nodeKind: "emitter",
    nodeName: emitter.nodeName,
    provenance: {
      sourceFormat: emitter.source,
      sourceModelObjectKey: emitter.sourceModelObjectKey,
      sourceModelFileName: emitter.sourceModelFileName
    },
    sourceFormat: emitter.source,
    sourceModelObjectKey: emitter.sourceModelObjectKey,
    sourceModelFileName: emitter.sourceModelFileName,
    emitterTypeRaw: emitter.emitterType,
    renderModeRaw: emitter.renderMode,
    blendModeRaw: emitter.blendMode,
    directRows: emitter.directRows ?? [],
    keyRows: emitter.keyRows ?? [],
    bezierKeyRows: emitter.bezierKeyRows ?? [],
    colorTimelines: {}
  } as unknown as AuroraMdlEmitterNode;
}

function buildPayload(
  vfx: VfxRuntimePackage,
  runtimeReplayCommand: VfxProcessCommand,
  auroraLight?: PlaceableRenderPackage["auroraLight"]
) {
  return {
    version: "aurora-vfx-payload/v1",
    canonicalStatus: "canonical",
    backendCanonical: true,
    rendererEligibility: "source_backed",
    retailParityStatus: "blocked",
    sourceKind: "source_mdl_graph",
    previewMode: "none",
    diagnostics: {
      sourceRows: vfx.sourceRows.flatMap((row) => row.diagnostics ?? []),
      effectInstance: vfx.effectInstance
        ? []
        : [
            {
              code: "VFX_PLACEABLE_EFFECT_INSTANCE_CONTEXT_MISSING",
              severity: "warn",
              message:
                "Placeable source-MDL emitter was packaged through the backend runtime without a retail EffectVisualEffect instance context."
            }
          ],
      phaseSchedule: vfx.phaseSchedule?.diagnostics ?? [],
      dependencyGraph: vfx.dependencyGraph.diagnostics,
      runtimeState:
        vfx.runtimeEmitters?.flatMap((entry) => [
          ...entry.runtimeState.diagnostics,
          ...entry.runtimeState.lastTickDiagnostics
        ]) ?? [],
      renderContract:
        vfx.runtimeEmitters?.flatMap((entry) => entry.renderContract.diagnostics) ?? [],
      payload: [
        ...vfx.diagnostics,
        {
          code: "VFX_AURORA_MDL_EMITTER_RETAIL_PROOF_PENDING",
          severity: "warn",
          message:
            "Backend runtime/render-contract payload is local convergence evidence only; Aurora/NWN/Toolset retail comparison proof is still required."
        }
      ]
    },
    contracts: {
      dependencyGraph: vfx.dependencyGraph,
      runtimeReplayCommand,
      ...(runtimeReplayCommand.sourceModelGraph
        ? { sourceModelGraph: runtimeReplayCommand.sourceModelGraph }
        : {}),
      ...(vfx.runtimeEmitters ? { runtimeEmitters: vfx.runtimeEmitters } : {}),
      ...(vfx.renderContract ? { renderContract: vfx.renderContract } : {}),
      ...buildSourceMdlLightFeatureContracts(auroraLight)
    },
    provenance: {
      backendPayloadVersion: vfx.version,
      sourceProfile: "catalog-placeable-source-mdl",
      sourceTable: undefined,
      ...(vfx.renderContract?.version
        ? { renderContractVersion: vfx.renderContract.version }
        : {})
    },
    localOnlyNotRetailEvidence: true,
    canonicalParityPromoted: false
  };
}

function buildResourceTraces(
  assetManifest: PlaceableAssetManifest,
  auroraEmitter: PlaceableRenderPackage["auroraEmitter"] | undefined
): VfxResourceTraceInput[] {
  if (!auroraEmitter) {
    return [];
  }
  const textureAssetsByBasename = buildAssetEntriesByBasename(
    assetManifest.assets.filter((asset) => asset.role === "texture")
  );
  const modelAssetsById = new Map(assetManifest.assets.map((asset) => [asset.assetId, asset]));
  return auroraEmitter.emitters.flatMap((emitter) => {
    const ownerPath = `mdl:${emitter.sourceModelFileName ?? emitter.sourceModelObjectKey ?? "unknown"}/emitter:${emitter.nodeName}`;
    const traces: VfxResourceTraceInput[] = [];
    const textureRef =
      typeof emitter.texture === "string" ? extractBasename(emitter.texture) : "";
    const textureAsset = textureRef
      ? textureAssetsByBasename.get(textureRef)?.[0]
      : undefined;
    if (textureRef) {
      traces.push({
        requestedResourceClass: "texture",
        requestedRef: textureRef,
        ownerPath,
        ...(textureAsset ? { selectedCandidate: toSelectedCandidate(textureAsset) } : {})
      });
    }
    const chunkRef =
      typeof emitter.chunkName === "string" ? extractBasename(emitter.chunkName) : "";
    const chunkAsset = emitter.chunkModelAssetId
      ? modelAssetsById.get(emitter.chunkModelAssetId)
      : undefined;
    if (chunkRef) {
      traces.push({
        requestedResourceClass: "chunk_model",
        requestedRef: chunkRef,
        ownerPath,
        ...(chunkAsset ? { selectedCandidate: toSelectedCandidate(chunkAsset) } : {})
      });
    }
    return traces;
  });
}

function buildSourceCandidates(
  assetManifest: PlaceableAssetManifest,
  auroraEmitter: PlaceableRenderPackage["auroraEmitter"] | undefined
): VfxSourceCandidateInput[] {
  if (!auroraEmitter) {
    return [];
  }
  const assetsById = new Map(assetManifest.assets.map((asset) => [asset.assetId, asset]));
  const seen = new Set<string>();
  return auroraEmitter.emitters.flatMap((emitter) => {
    if (seen.has(emitter.sourceModelAssetId)) {
      return [];
    }
    seen.add(emitter.sourceModelAssetId);
    const asset = assetsById.get(emitter.sourceModelAssetId);
    if (!asset) {
      return [];
    }
    return [
      {
        candidateId: `source-mdl:${asset.assetId}`,
        layer: "module",
        resourceKind: "resource",
        resourceKey: asset.fileName,
        sourcePath: asset.objectKey,
        sourceHash: asset.etag,
        resourceHash: asset.etag
      }
    ];
  });
}

function buildAssetEntriesByBasename(
  assets: PlaceableAssetEntry[]
): Map<string, PlaceableAssetEntry[]> {
  const byBasename = new Map<string, PlaceableAssetEntry[]>();
  for (const asset of assets) {
    const basename = extractBasename(asset.fileName);
    if (!basename) {
      continue;
    }
    const bucket = byBasename.get(basename) ?? [];
    bucket.push(asset);
    byBasename.set(basename, bucket);
  }
  return byBasename;
}

function toSelectedCandidate(asset: PlaceableAssetEntry) {
  return {
    candidateId: asset.assetId,
    sourceLayer: "module" as const,
    resourceKey: asset.fileName,
    sourcePath: asset.objectKey,
    sourceHash: asset.etag,
    resourceHash: asset.etag,
    precedenceRank: 0
  };
}
