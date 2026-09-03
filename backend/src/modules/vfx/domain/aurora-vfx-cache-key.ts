import { createHash } from "node:crypto";
import type { AuroraVfxDependencyGraph } from "./aurora-vfx-dependency-graph";
import type { AuroraMdlAnimationEvent } from "./aurora-mdl-vfx-source.parser";
import type { AuroraVfxSourcePolicyTrace } from "./aurora-vfx-source-policy";
import type { AuroraWindManagerInput } from "./aurora-vfx-wind-manager";
import type { AuroraVfxMaterialSourceState } from "./aurora-vfx-render-contract";
import {
  NWN_EE_VFX_RNG_ALGORITHM,
  type AuroraRuntimeVector3
} from "./aurora-vfx-runtime-state";

interface AuroraVfxCacheEmitterMaterialState {
  emitterIndex: number;
  emitterNodeName: string;
  materialState: AuroraVfxMaterialSourceState;
}

export interface AuroraVfxOutputCacheKeyInput {
  packageKind: string;
  sourceHash: string;
  progFxHash?: string;
  sourceRowId?: number;
  runtimeSettingsRevision: number;
  hakListHash: string;
  sourcePolicyHash: string;
  selectedTableHash?: string;
  selectedResourceHash?: string;
  dependencyGraph?: AuroraVfxDependencyGraph;
  sourceEmitterMaterials?: AuroraVfxCacheEmitterMaterialState[];
  sourceAnimationEvents?: AuroraMdlAnimationEvent[];
  runtime?: {
    dtSeconds?: number;
    tickCount?: number;
    executionParticleBudget?: number;
    particleLimit?: number;
    seed?: number;
    animation?: {
      animationName: string;
      previousTimeSeconds?: number;
      currentTimeSeconds: number;
      blendWeight?: number;
    };
    windManager?: AuroraWindManagerInput;
    cameraPosition?: AuroraRuntimeVector3;
    cameraContextSource?:
      | "aurora-active-camera-world-position"
      | "proof-calibrated-camera-relative-to-vfx-owner";
  };
}

export interface AuroraVfxOutputCacheKeyParts {
  version: "aurora-vfx-output-cache-key/v2";
  packageKind: string;
  sourceHash: string;
  progFxHash?: string;
  sourceRowId?: number;
  runtimeSettingsRevision: number;
  hakListHash: string;
  sourcePolicyHash: string;
  selectedTableHash?: string;
  selectedResourceHash?: string;
  dependencyEdgeKeys: string[];
  dependencySelectedResourceHashes: string[];
  sourceEmitterMaterials: AuroraVfxCacheEmitterMaterialState[];
  sourceAnimationEvents: AuroraMdlAnimationEvent[];
  runtime: {
    rngAlgorithm: typeof NWN_EE_VFX_RNG_ALGORITHM;
    dtSeconds: number;
    tickCount: number;
    executionParticleBudget: number;
    particleLimit?: number;
    seed: number;
    animation?: {
      animationName: string;
      previousTimeSeconds: number;
      currentTimeSeconds: number;
      blendWeight: number;
    };
    windManager?: AuroraWindManagerInput;
    cameraPosition?: AuroraRuntimeVector3;
    cameraContextSource?:
      | "aurora-active-camera-world-position"
      | "proof-calibrated-camera-relative-to-vfx-owner";
  };
}

export function buildAuroraVfxOutputCacheKeyParts(
  input: AuroraVfxOutputCacheKeyInput
): AuroraVfxOutputCacheKeyParts {
  const dependencyEdges = input.dependencyGraph?.edges ?? [];
  return {
    version: "aurora-vfx-output-cache-key/v2",
    packageKind: input.packageKind,
    sourceHash: input.sourceHash,
    ...(input.progFxHash ? { progFxHash: input.progFxHash } : {}),
    ...(typeof input.sourceRowId === "number" ? { sourceRowId: input.sourceRowId } : {}),
    runtimeSettingsRevision: input.runtimeSettingsRevision,
    hakListHash: input.hakListHash,
    sourcePolicyHash: input.sourcePolicyHash,
    ...(input.selectedTableHash ? { selectedTableHash: input.selectedTableHash } : {}),
    ...(input.selectedResourceHash ? { selectedResourceHash: input.selectedResourceHash } : {}),
    dependencyEdgeKeys: dependencyEdges.map((edge) => hashStable(edge.cacheKeyParts)),
    dependencySelectedResourceHashes: dependencyEdges
      .map((edge) => edge.cacheKeyParts.selectedResourceHash)
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => left.localeCompare(right)),
    sourceEmitterMaterials: [...(input.sourceEmitterMaterials ?? [])],
    sourceAnimationEvents: [...(input.sourceAnimationEvents ?? [])],
    runtime: {
      rngAlgorithm: NWN_EE_VFX_RNG_ALGORITHM,
      dtSeconds: input.runtime?.dtSeconds ?? 0.25,
      tickCount: input.runtime?.tickCount ?? 1,
      executionParticleBudget:
        input.runtime?.executionParticleBudget ??
        Math.max(4096, input.runtime?.particleLimit ?? 4096),
      ...(input.runtime?.particleLimit !== undefined
        ? { particleLimit: input.runtime.particleLimit }
        : {}),
      seed: input.runtime?.seed ?? 0x12345678,
      ...(input.runtime?.animation
        ? {
            animation: {
              animationName: input.runtime.animation.animationName,
              previousTimeSeconds: input.runtime.animation.previousTimeSeconds ?? 0,
              currentTimeSeconds: input.runtime.animation.currentTimeSeconds,
              blendWeight: input.runtime.animation.blendWeight ?? 1
            }
          }
        : {}),
      ...(input.runtime?.windManager ? { windManager: input.runtime.windManager } : {}),
      ...(input.runtime?.cameraPosition
        ? { cameraPosition: input.runtime.cameraPosition }
        : {}),
      ...(input.runtime?.cameraContextSource
        ? { cameraContextSource: input.runtime.cameraContextSource }
        : {})
    }
  };
}

export function buildAuroraVfxOutputCacheKey(
  input: AuroraVfxOutputCacheKeyInput
): string {
  return hashStable(buildAuroraVfxOutputCacheKeyParts(input));
}

export function buildAuroraVfxOutputCacheKeyFromPolicy(
  input: {
    packageKind: string;
    sourceHash: string;
    progFxHash?: string;
    sourceRowId?: number;
    sourcePolicyTrace: AuroraVfxSourcePolicyTrace;
    dependencyGraph?: AuroraVfxDependencyGraph;
    sourceEmitterMaterials?: AuroraVfxCacheEmitterMaterialState[];
    sourceAnimationEvents?: AuroraMdlAnimationEvent[];
    runtime?: AuroraVfxOutputCacheKeyInput["runtime"];
  }
): string {
  return buildAuroraVfxOutputCacheKey({
    packageKind: input.packageKind,
    sourceHash: input.sourceHash,
    ...(input.progFxHash ? { progFxHash: input.progFxHash } : {}),
    ...(typeof input.sourceRowId === "number" ? { sourceRowId: input.sourceRowId } : {}),
    runtimeSettingsRevision: input.sourcePolicyTrace.cacheKeyParts.runtimeSettingsRevision,
    hakListHash: input.sourcePolicyTrace.cacheKeyParts.hakListHash,
    sourcePolicyHash: input.sourcePolicyTrace.cacheKeyParts.policyHash,
    selectedTableHash: input.sourcePolicyTrace.cacheKeyParts.selectedTableHash,
    selectedResourceHash: input.sourcePolicyTrace.cacheKeyParts.selectedResourceHash,
    dependencyGraph: input.dependencyGraph,
    sourceEmitterMaterials: input.sourceEmitterMaterials,
    sourceAnimationEvents: input.sourceAnimationEvents,
    runtime: input.runtime
  });
}

function hashStable(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`);
  return `{${entries.join(",")}}`;
}
