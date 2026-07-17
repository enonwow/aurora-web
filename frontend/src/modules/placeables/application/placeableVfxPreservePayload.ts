import type { SceneObjectVfxDiagnostic, SceneObjectVfxPreservePayload } from "../../scene/contracts";
import {
  buildPreviewOnlyAuroraVfxPayload,
  buildSceneObjectVfxPayloadFromAuroraPayload
} from "../../scene/domain/auroraVfxPayload";
import type { PlaceableViewportRenderPayload } from "./placeableRenderPayloadResolver";

type MetadataPrimitive = string | number | boolean;

export interface PlaceableVfxPreviewLike {
  templateId?: string;
  resref?: string;
  name?: string;
  kind?: string;
  placeableSubtype?: string;
  metadata?: Record<string, MetadataPrimitive>;
}

const VFX_TEXT_PATTERN = /(vfx|vvx|emit|emitter|particle|fx_)/iu;

function readMetadataString(
  metadata: Record<string, MetadataPrimitive> | undefined,
  key: string
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function addDiagnostic(
  diagnostics: SceneObjectVfxDiagnostic[],
  diagnostic: SceneObjectVfxDiagnostic
): void {
  if (diagnostics.some((entry) => entry.code === diagnostic.code)) {
    return;
  }
  diagnostics.push(diagnostic);
}

function hasVfxText(value: unknown): boolean {
  return typeof value === "string" && VFX_TEXT_PATTERN.test(value);
}

function hasAuroraEmitterChunkModel(payload: PlaceableViewportRenderPayload): boolean {
  return (
    payload.renderPackage?.auroraEmitter?.emitters.some(
      (emitter) => typeof emitter.chunkName === "string" && emitter.chunkName.trim().length > 0
    ) === true
  );
}

function hasResolvedAuroraEmitterChunkModel(payload: PlaceableViewportRenderPayload): boolean {
  const deliveredAssetIds = new Set(
    payload.assetContracts.assets
      .filter((asset) => asset.deliveryUrl.trim().length > 0)
      .map((asset) => asset.assetId)
  );
  return (
    payload.renderPackage?.auroraEmitter?.emitters.some((emitter) => {
      const hasChunkName =
        typeof emitter.chunkName === "string" && emitter.chunkName.trim().length > 0;
      const chunkModelAssetId =
        typeof emitter.chunkModelAssetId === "string"
          ? emitter.chunkModelAssetId.trim()
          : "";
      return hasChunkName && chunkModelAssetId.length > 0 && deliveredAssetIds.has(chunkModelAssetId);
    }) === true
  );
}

function hasAuroraEmitterPayload(payload: PlaceableViewportRenderPayload): boolean {
  return (
    payload.renderPackage?.auroraEmitter?.emitters.some((emitter) =>
      Boolean(
        emitter.renderMode ||
          emitter.emitterType ||
          emitter.texture ||
          emitter.chunkName ||
          emitter.simulation
      )
    ) === true
  );
}

function hasAuroraLightPayload(payload: PlaceableViewportRenderPayload): boolean {
  return (
    payload.renderPackage?.auroraLight?.lights.some((light) =>
      Boolean(
        light.nodeName ||
          light.radius ||
          light.multiplier ||
          light.color ||
          light.animations?.length
      )
    ) === true
  );
}

export function isPlaceablePreviewVfx(payload: PlaceableVfxPreviewLike): boolean {
  const metadata = payload.metadata;
  return (
    payload.placeableSubtype === "vfx" ||
    payload.kind === "vfx" ||
    readMetadataString(metadata, "placeableSubtype") === "vfx" ||
    readMetadataString(metadata, "frontendType") === "vfx" ||
    readMetadataString(metadata, "rendererPreset") === "vfx-emitter" ||
    hasVfxText(payload.templateId) ||
    hasVfxText(payload.resref) ||
    hasVfxText(payload.name) ||
    hasVfxText(readMetadataString(metadata, "vfxPreset")) ||
    hasVfxText(readMetadataString(metadata, "lookupModelResRef"))
  );
}

export function buildVfxPayloadFromPlaceablePreview(
  preview: PlaceableVfxPreviewLike
): SceneObjectVfxPreservePayload | undefined {
  if (!isPlaceablePreviewVfx(preview)) {
    return undefined;
  }

  const metadata = preview.metadata;
  const sourceResRef = readString(preview.resref) ?? readString(preview.templateId) ?? "";
  const sourceLabel = readString(preview.name) ?? readString(preview.templateId) ?? sourceResRef;
  const emitter =
    readMetadataString(metadata, "lookupModelResRef") ??
    readMetadataString(metadata, "modelResRef") ??
    readMetadataString(metadata, "model") ??
    sourceResRef;
  const profile =
    readMetadataString(metadata, "vfxPreset") ??
    readMetadataString(metadata, "rendererPreset") ??
    "placeable-vfx-preview";
  const diagnostics: SceneObjectVfxDiagnostic[] = [
    {
      code: "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
      severity: "warn",
      message:
        "Placeable VFX preview is a catalog/source-list object, not an EffectVisualEffect instance."
    },
    {
      code: "VFX_PLACEABLE_VFX_PRESERVE_PAYLOAD_PREVIEW_ONLY",
      severity: "warn",
      message:
        "VFX payload is preserved for Aurora parity, but runtime phase scheduling is not mapped yet."
    }
  ];

  return {
    version: "scene-object-vfx-preserve/v1",
    profile,
    emitter,
    script: readMetadataString(metadata, "script.onused") ?? "",
    sourceKind: "placeable_preview",
    sourceProfile: "catalog-placeable-vfx",
    sourceTable: "placeable-template-catalog",
    sourceLabel,
    sourceResRef,
    previewMode: "sprite_scaffold",
    canonicalStatus: "preview_only",
    diagnostics,
    auroraPayload: buildPreviewOnlyAuroraVfxPayload({
      sourceKind: "placeable_preview",
      previewMode: "sprite_scaffold",
      sourceProfile: "catalog-placeable-vfx",
      sourceTable: "placeable-template-catalog",
      sourceLabel,
      sourceResRef,
      diagnostics
    }),
    flags: {
      isPlaceableVfx: true
    },
    extra: {
      templateId: readString(preview.templateId) ?? "",
      rendererPreset: readMetadataString(metadata, "rendererPreset") ?? "",
      sourceKind: readString(preview.kind) ?? ""
    }
  };
}

export function buildVfxPayloadFromRenderPayload(
  payload: PlaceableViewportRenderPayload
): SceneObjectVfxPreservePayload | undefined {
  const renderContract = payload.placeable.render;
  const isVfx =
    renderContract.frontendType === "vfx" ||
    renderContract.isVfx ||
    payload.placeable.placeableSubtype === "vfx";
  if (!isVfx) {
    return undefined;
  }

  const renderPackage = payload.renderPackage;
  const backendVfxPayload = buildSceneObjectVfxPayloadFromAuroraPayload(
    readBackendAuroraVfxPayload(renderPackage),
    {
      profile:
        readMetadataString(payload.placeable.metadata, "vfxPreset") ??
        renderContract.rendererPreset ??
        "placeable-vfx-preview",
      emitter:
        readMetadataString(payload.placeable.metadata, "lookupModelResRef") ??
        readMetadataString(payload.placeable.metadata, "modelResRef") ??
        payload.placeable.resref,
      sourceLabel: payload.placeable.name,
      sourceResRef: payload.placeable.resref
    }
  );
  if (backendVfxPayload) {
    return {
      ...backendVfxPayload,
      flags: {
        ...backendVfxPayload.flags,
        isPlaceableVfx: true
      },
      extra: {
        ...backendVfxPayload.extra,
        templateId: payload.templateId,
        cacheKey: payload.cacheKey,
        renderPackageStatus: renderPackage?.status ?? ""
      }
    };
  }

  const hasDerivedModelPreview =
    Boolean(renderPackage?.glbUrl || renderPackage?.modelUrl) ||
    (renderPackage?.assetRefs.derivedModelAssetIds?.length ?? 0) > 0;
  const roleByAssetId = new Map(
    payload.placeable.assetManifest.assets.map((asset) => [asset.assetId, asset.role])
  );
  const hasTextureAssetPreview =
    (renderPackage?.textureUrls?.length ?? 0) > 0 ||
    (renderPackage?.assetRefs.textureAssetIds?.length ?? 0) > 0 ||
    payload.assetContracts.assets.some((asset) => roleByAssetId.get(asset.assetId) === "texture");
  const hasChunkModelPayload = hasAuroraEmitterChunkModel(payload);
  const hasResolvedChunkModelPayload = hasResolvedAuroraEmitterChunkModel(payload);
  const hasEmitterPayload = hasAuroraEmitterPayload(payload);
  const hasLightPayload = hasAuroraLightPayload(payload);
  const hasStaticModelPreview =
    hasDerivedModelPreview && !hasChunkModelPayload && !hasEmitterPayload && !hasLightPayload;
  const hasVisiblePreview =
    hasResolvedChunkModelPayload ||
    hasEmitterPayload ||
    hasLightPayload ||
    hasStaticModelPreview ||
    hasTextureAssetPreview;
  const previewMode = hasResolvedChunkModelPayload
    ? "chunk_model_particle_preview"
    : hasChunkModelPayload
      ? "chunk_model_source_only"
      : hasEmitterPayload
        ? "aurora_emitter_particle_preview"
        : hasLightPayload
          ? "aurora_light_node_preview"
          : hasStaticModelPreview
            ? "static_model_preview"
            : hasTextureAssetPreview
              ? "texture_particle_preview"
              : "none";
  const diagnostics: SceneObjectVfxDiagnostic[] = [];

  (renderPackage?.diagnostics ?? []).forEach((diagnostic) => {
    addDiagnostic(diagnostics, {
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message
    });
  });

  addDiagnostic(diagnostics, {
    code: "VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT",
    severity: "warn",
    message:
      "Placeable VFX preview is a catalog/source-list object, not an EffectVisualEffect instance."
  });
  addDiagnostic(diagnostics, {
    code: hasResolvedChunkModelPayload
      ? "VFX_CHUNK_MODEL_RESOURCE_READY"
      : hasChunkModelPayload
        ? "VFX_CHUNK_MODEL_RESOLVER_REQUIRED"
        : hasEmitterPayload
          ? "VFX_AURORA_EMITTER_PARTICLE_PREVIEW_NON_CANONICAL"
          : hasLightPayload
            ? "VFX_AURORA_LIGHT_NODE_PREVIEW_NON_CANONICAL"
            : hasStaticModelPreview
              ? "VFX_STATIC_MODEL_PREVIEW_NON_CANONICAL"
            : hasTextureAssetPreview
              ? "VFX_FRONTEND_TEXTURE_PARTICLE_PREVIEW_NON_CANONICAL"
              : "VFX_FRONTEND_TEXTURE_PARTICLE_ASSET_MISSING",
    severity: "warn",
    message: hasResolvedChunkModelPayload
      ? "Aurora chunkName resolved to a delivered derived model asset; browser preview renders the chunk-model particle lane."
      : hasChunkModelPayload
      ? "At least one Aurora emitter uses chunkName; chunk particles require model-resource resolution and must not be previewed as texture billboards."
      : hasEmitterPayload
      ? "Browser preview uses parsed Aurora emitter nodes, render modes and simulation fields; canonical EffectVisualEffect context is still required."
      : hasLightPayload
      ? "Browser preview renders parsed Aurora source MDL light nodes as visible non-canonical light markers; canonical EffectVisualEffect context is still required."
      : hasStaticModelPreview
      ? "Browser preview renders the delivered Aurora model because this VFX placeable has no emitter or light nodes."
      : hasTextureAssetPreview
      ? "Browser preview uses delivered Aurora texture assets as particle billboards; phase scheduling still needs canonical EffectVisualEffect context."
      : "No delivered texture asset is available for this VFX preview, so the browser does not draw a procedural substitute."
  });
  if (hasDerivedModelPreview) {
    addDiagnostic(diagnostics, {
      code: "VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY",
      severity: "warn",
      message:
        "Derived GLB/model delivery is preview provenance only; VFX source rows and effect-instance context are still required."
    });
  }

  const metadata = payload.placeable.metadata ?? {};
  return {
    version: "scene-object-vfx-preserve/v1",
    profile:
      readMetadataString(metadata, "vfxPreset") ??
      renderContract.rendererPreset ??
      "placeable-vfx-preview",
    emitter:
      readMetadataString(metadata, "lookupModelResRef") ??
      readMetadataString(metadata, "modelResRef") ??
      readMetadataString(metadata, "model") ??
      payload.placeable.resref,
    script: readMetadataString(metadata, "script.onused") ?? "",
    sourceKind: "placeable_preview",
    sourceProfile: "catalog-placeable-vfx",
    sourceTable: "placeable-template-catalog",
    sourceLabel: payload.placeable.name,
    sourceResRef: payload.placeable.resref,
    previewMode,
    canonicalStatus: "preview_only",
    diagnostics,
    auroraPayload: buildPreviewOnlyAuroraVfxPayload({
      sourceKind: "placeable_preview",
      previewMode,
      sourceProfile: "catalog-placeable-vfx",
      sourceTable: "placeable-template-catalog",
      sourceLabel: payload.placeable.name,
      sourceResRef: payload.placeable.resref,
      diagnostics
    }),
    flags: {
      isPlaceableVfx: true,
      hasDerivedModelPreview
    },
    extra: {
      templateId: payload.templateId,
      cacheKey: payload.cacheKey,
      renderPackageStatus: renderPackage?.status ?? "",
      textureAssetPreview: hasTextureAssetPreview,
      staticModelPreview: hasStaticModelPreview,
      chunkModelAssetPreview: hasResolvedChunkModelPayload,
      lightNodePreview: hasLightPayload,
      visiblePreview: hasVisiblePreview,
      rendererPreset: renderContract.rendererPreset
    }
  };
}

function readBackendAuroraVfxPayload(renderPackage: unknown): unknown {
  if (typeof renderPackage !== "object" || renderPackage === null) {
    return undefined;
  }
  const candidate = renderPackage as {
    auroraVfxPayload?: unknown;
    vfxPayload?: unknown;
  };
  return candidate.auroraVfxPayload ?? candidate.vfxPayload;
}
