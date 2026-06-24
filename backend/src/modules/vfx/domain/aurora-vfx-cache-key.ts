import { createHash } from "node:crypto";
import type { AuroraVfxDependencyGraph } from "./aurora-vfx-dependency-graph";
import type { AuroraVfxSourcePolicyTrace } from "./aurora-vfx-source-policy";

export interface AuroraVfxOutputCacheKeyInput {
  packageKind: string;
  sourceHash: string;
  sourceRowId?: number;
  runtimeSettingsRevision: number;
  hakListHash: string;
  sourcePolicyHash: string;
  selectedTableHash?: string;
  selectedResourceHash?: string;
  dependencyGraph?: AuroraVfxDependencyGraph;
  runtime?: {
    dtSeconds?: number;
    particleLimit?: number;
    seed?: number;
  };
}

export interface AuroraVfxOutputCacheKeyParts {
  version: "aurora-vfx-output-cache-key/v1";
  packageKind: string;
  sourceHash: string;
  sourceRowId?: number;
  runtimeSettingsRevision: number;
  hakListHash: string;
  sourcePolicyHash: string;
  selectedTableHash?: string;
  selectedResourceHash?: string;
  dependencyEdgeKeys: string[];
  dependencySelectedResourceHashes: string[];
  runtime: {
    dtSeconds: number;
    particleLimit: number;
    seed: number;
  };
}

export function buildAuroraVfxOutputCacheKeyParts(
  input: AuroraVfxOutputCacheKeyInput
): AuroraVfxOutputCacheKeyParts {
  const dependencyEdges = input.dependencyGraph?.edges ?? [];
  return {
    version: "aurora-vfx-output-cache-key/v1",
    packageKind: input.packageKind,
    sourceHash: input.sourceHash,
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
    runtime: {
      dtSeconds: input.runtime?.dtSeconds ?? 0.25,
      particleLimit: input.runtime?.particleLimit ?? 64,
      seed: input.runtime?.seed ?? 0x12345678
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
    sourceRowId?: number;
    sourcePolicyTrace: AuroraVfxSourcePolicyTrace;
    dependencyGraph?: AuroraVfxDependencyGraph;
    runtime?: AuroraVfxOutputCacheKeyInput["runtime"];
  }
): string {
  return buildAuroraVfxOutputCacheKey({
    packageKind: input.packageKind,
    sourceHash: input.sourceHash,
    ...(typeof input.sourceRowId === "number" ? { sourceRowId: input.sourceRowId } : {}),
    runtimeSettingsRevision: input.sourcePolicyTrace.cacheKeyParts.runtimeSettingsRevision,
    hakListHash: input.sourcePolicyTrace.cacheKeyParts.hakListHash,
    sourcePolicyHash: input.sourcePolicyTrace.cacheKeyParts.policyHash,
    selectedTableHash: input.sourcePolicyTrace.cacheKeyParts.selectedTableHash,
    selectedResourceHash: input.sourcePolicyTrace.cacheKeyParts.selectedResourceHash,
    dependencyGraph: input.dependencyGraph,
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
