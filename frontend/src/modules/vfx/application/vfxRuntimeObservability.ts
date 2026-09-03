import * as THREE from "three";

export const VFX_RUNTIME_OBSERVABILITY_VERSION = "aurora-vfx-runtime-observability/v1";

export type VfxRuntimeProfile = "development" | "final";
export type VfxAssetKind = "model" | "texture" | "chunk-model" | "material" | "unknown";
export type VfxAssetSettlementStage =
  | "expected"
  | "requested"
  | "decoded"
  | "cached"
  | "bound"
  | "failed";

export interface VfxRuntimeExpectedAsset {
  key: string;
  kind: VfxAssetKind;
  reference?: string;
}

export interface VfxRuntimeAssetSettlementPatch {
  stage: Exclude<VfxAssetSettlementStage, "expected">;
  startedAtMs?: number;
  completedAtMs?: number;
  httpStatus?: number | null;
  retryCount?: number;
  error?: string | null;
}

export interface VfxRuntimeAssetSettlementEntry extends VfxRuntimeExpectedAsset {
  stage: VfxAssetSettlementStage;
  startedAtMs: number | null;
  completedAtMs: number | null;
  durationMs: number | null;
  httpStatus: number | null;
  retryCount: number;
  error: string | null;
}

interface MutableAssetSettlementEntry extends VfxRuntimeAssetSettlementEntry {}

const assetSettlementByRuntime = new WeakMap<object, Map<string, MutableAssetSettlementEntry>>();

function normalizeKey(value: string): string {
  const trimmed = value.trim();
  try {
    const url = new URL(trimmed, "http://aurora.local");
    if (!url.searchParams.has("auroraModelRetry")) {
      return trimmed;
    }
    url.searchParams.delete("auroraModelRetry");
    return url.href;
  } catch {
    return trimmed;
  }
}

function readAssetSettlementStore(runtime: object): Map<string, MutableAssetSettlementEntry> {
  const current = assetSettlementByRuntime.get(runtime);
  if (current) return current;
  const created = new Map<string, MutableAssetSettlementEntry>();
  assetSettlementByRuntime.set(runtime, created);
  return created;
}

function cloneAssetEntry(entry: MutableAssetSettlementEntry): VfxRuntimeAssetSettlementEntry {
  return { ...entry };
}

export function registerVfxRuntimeExpectedAssets(
  runtime: object,
  assets: readonly VfxRuntimeExpectedAsset[]
): void {
  const store = readAssetSettlementStore(runtime);
  assets.forEach((asset) => {
    const key = normalizeKey(asset.key);
    if (!key) return;
    const existing = store.get(key);
    if (existing) {
      existing.kind = asset.kind;
      existing.reference = asset.reference ?? existing.reference;
      return;
    }
    store.set(key, {
      key,
      kind: asset.kind,
      ...(asset.reference ? { reference: asset.reference } : {}),
      stage: "expected",
      startedAtMs: null,
      completedAtMs: null,
      durationMs: null,
      httpStatus: null,
      retryCount: 0,
      error: null
    });
  });
}

export function recordVfxRuntimeAssetSettlement(
  runtime: object,
  rawKey: string,
  patch: VfxRuntimeAssetSettlementPatch
): void {
  const key = normalizeKey(rawKey);
  if (!key) return;
  const store = readAssetSettlementStore(runtime);
  const entry =
    store.get(key) ??
    ({
      key,
      kind: "unknown" as const,
      stage: "expected" as const,
      startedAtMs: null,
      completedAtMs: null,
      durationMs: null,
      httpStatus: null,
      retryCount: 0,
      error: null
    } satisfies MutableAssetSettlementEntry);
  entry.stage = patch.stage;
  entry.startedAtMs = patch.startedAtMs ?? entry.startedAtMs;
  entry.completedAtMs = patch.completedAtMs ?? entry.completedAtMs;
  entry.httpStatus = patch.httpStatus ?? entry.httpStatus;
  entry.retryCount = Math.max(entry.retryCount, patch.retryCount ?? 0);
  entry.error = patch.error === undefined ? entry.error : patch.error;
  entry.durationMs =
    entry.startedAtMs !== null && entry.completedAtMs !== null
      ? Math.max(0, entry.completedAtMs - entry.startedAtMs)
      : null;
  store.set(key, entry);
}

export function setVfxRuntimeAssetBound(runtime: object, key: string, completedAtMs?: number): void {
  recordVfxRuntimeAssetSettlement(runtime, key, {
    stage: "bound",
    ...(completedAtMs === undefined ? {} : { completedAtMs })
  });
}

export function readVfxRuntimeAssetSettlement(runtime: object): VfxRuntimeAssetSettlementEntry[] {
  return Array.from(readAssetSettlementStore(runtime).values())
    .map(cloneAssetEntry)
    .sort((left, right) => left.key.localeCompare(right.key));
}

export interface VfxRuntimeBuildIdentityInput {
  frontend?: { commit?: string | null; imageDigest?: string | null; builtAt?: string | null };
  backend?: {
    commit?: string | null;
    imageDigest?: string | null;
    builtAt?: string | null;
    processStartedAt?: string | null;
  };
  contractVersion?: string | null;
  cacheKey?: string | null;
}

export interface VfxRuntimeHostGraphExpectation {
  staticBranches: readonly string[];
  emitterBranches: readonly string[];
  /**
   * Source-backed child runtimes can attach these emitter branches only while
   * their owning particle/model instance is alive. They are allowed when
   * observed, but their absence at another lifecycle sample is not a failure.
   */
  transientEmitterBranches?: readonly string[];
  lightBranches: readonly string[];
}

export interface CreateVfxRuntimeObservabilityReportInput {
  runtime: object;
  root: THREE.Object3D | null;
  compositionRoots?: readonly THREE.Object3D[];
  expectedPlaybackRootCount?: number;
  profile: VfxRuntimeProfile;
  overlayRequested: boolean;
  requirePlaceableComposition?: boolean;
  runtimeEmittersDeferred?: boolean;
  /**
   * A final post-roll is stricter than a terminal-frame observation: it must
   * prove that the completed runtime hid the selected frame after duration.
   */
  requirePostDurationHidden?: boolean;
  expectedHostGraph: VfxRuntimeHostGraphExpectation;
  buildIdentity: VfxRuntimeBuildIdentityInput;
  additionalProofBlockers?: readonly string[];
  timeoutMs?: number;
}

interface VfxRuntimeBranchLedger {
  static: string[];
  emitter: string[];
  light: string[];
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) => left.localeCompare(right));
}

function branchName(node: THREE.Object3D): string {
  return (
    asNonEmptyString(node.userData.auroraVfxHostBranchName) ??
    asNonEmptyString(node.userData.auroraEmitterNode) ??
    asNonEmptyString(node.userData.auroraVfxCanonicalEmitterNodeName) ??
    asNonEmptyString(node.userData.auroraVfxCanonicalSourceModelNodeName) ??
    asNonEmptyString(node.userData.auroraVfxCanonicalSourceMdlLightNodeName) ??
    node.name.trim()
  );
}

function collectAttachedHostBranches(
  root: THREE.Object3D | null,
  expected: VfxRuntimeHostGraphExpectation
): VfxRuntimeBranchLedger {
  const collected: VfxRuntimeBranchLedger = { static: [], emitter: [], light: [] };
  if (!root) return collected;
  const expectedStaticNames = new Set(expected.staticBranches);
  const expectedEmitterNames = new Set([
    ...expected.emitterBranches,
    ...(expected.transientEmitterBranches ?? [])
  ]);
  const expectedLightNames = new Set(expected.lightBranches);
  root.traverse((node) => {
    const kind = asNonEmptyString(node.userData.auroraVfxHostBranchKind);
    const name = branchName(node);
    const runtimeEmitterNames = Array.isArray(
      node.userData.auroraVfxCanonicalRuntimeEmitterNodeNames
    )
      ? node.userData.auroraVfxCanonicalRuntimeEmitterNodeNames
          .map(asNonEmptyString)
          .filter((entry): entry is string => entry !== null)
      : [];
    collected.emitter.push(...runtimeEmitterNames);
    if (!name) return;
    if (kind === "static" || kind === "emitter" || kind === "light") {
      collected[kind].push(name);
      return;
    }
    if (expectedStaticNames.has(name)) {
      collected.static.push(name);
      return;
    }
    if (expectedEmitterNames.has(name)) {
      collected.emitter.push(name);
      return;
    }
    if (node instanceof THREE.PointLight || node.userData.auroraVfxCanonicalLightSibling === true) {
      collected.light.push(name);
      return;
    }
    if (expectedLightNames.has(name)) {
      collected.light.push(name);
    }
  });
  return {
    static: uniqueSorted(collected.static),
    emitter: uniqueSorted(collected.emitter),
    light: uniqueSorted(collected.light)
  };
}

function compareBranches(
  kind: keyof VfxRuntimeBranchLedger,
  expected: readonly string[],
  attached: readonly string[],
  allowedTransient: readonly string[] = []
): string[] {
  const matchesExpectedBranch = (attachedName: string, expectedName: string): boolean =>
    attachedName === expectedName ||
    (kind === "emitter" && attachedName.startsWith(`${expectedName}@`));
  const allowed = [...expected, ...allowedTransient];
  return [
    ...expected
      .filter(
        (expectedName) =>
          !attached.some((attachedName) =>
            matchesExpectedBranch(attachedName, expectedName)
          )
      )
      .map((entry) => `${kind}:missing:${entry}`),
    ...attached
      .filter(
        (attachedName) =>
          !allowed.some((expectedName) =>
            matchesExpectedBranch(attachedName, expectedName)
          )
      )
      .map((entry) => `${kind}:unexpected:${entry}`)
  ];
}

function buildHostGraph(
  root: THREE.Object3D | null,
  expected: VfxRuntimeHostGraphExpectation,
  compositionRequired: boolean,
  compositionRoots?: readonly THREE.Object3D[]
) {
  const attached = collectAttachedHostBranches(root, expected);
  const normalizedExpected: VfxRuntimeBranchLedger = {
    static: uniqueSorted(expected.staticBranches),
    emitter: uniqueSorted(expected.emitterBranches),
    light: uniqueSorted(expected.lightBranches)
  };
  const allowedTransient: VfxRuntimeBranchLedger = {
    static: [],
    emitter: uniqueSorted(expected.transientEmitterBranches ?? []).filter(
      (entry) => !normalizedExpected.emitter.includes(entry)
    ),
    light: []
  };
  const mismatches = [
    ...compareBranches("static", normalizedExpected.static, attached.static),
    ...compareBranches(
      "emitter",
      normalizedExpected.emitter,
      attached.emitter,
      allowedTransient.emitter
    ),
    ...compareBranches("light", normalizedExpected.light, attached.light)
  ];
  const roots = compositionRoots ?? (root ? [root] : []);
  const composition =
    roots.length > 0 &&
    roots.every(
      (candidate) =>
        candidate.userData.auroraVfxCanonicalPlaceableComposition === true
    );
  const compositionModes = uniqueSorted(
    roots
      .map((candidate) =>
        asNonEmptyString(
          candidate.userData.auroraVfxCanonicalPlaceableCompositionMode
        )
      )
      .filter((entry): entry is string => entry !== null)
  );
  const compositionReasons = uniqueSorted(
    roots
      .map((candidate) =>
        asNonEmptyString(
          candidate.userData.auroraVfxCanonicalPlaceableCompositionReason
        )
      )
      .filter((entry): entry is string => entry !== null)
  );
  const compositionReason = composition
    ? compositionReasons[0] ?? "ready"
    : compositionReasons.join("|") || "not-reported";
  return {
    status:
      mismatches.length === 0 && (!compositionRequired || composition)
        ? ("pass" as const)
        : ("fail" as const),
    expected: normalizedExpected,
    allowedTransient,
    attached,
    composition,
    compositionRootCount: roots.length,
    compositionRequired,
    compositionMode: compositionModes.join("|"),
    compositionReason,
    mismatches: uniqueSorted(mismatches)
  };
}

function buildDrawLedger(root: THREE.Object3D | null) {
  type DrawLedgerEntry = {
    drawRecordId: string;
    emitter: string;
    lane: string;
    particleCount: number;
    vertexCount: number;
    textureReference: string;
    blend: string;
    depthWrite: boolean | null;
    bounds: { width: number; height: number; depth: number };
  };
  const entriesById = new Map<string, DrawLedgerEntry>();
  root?.traverse((node) => {
    if (node.userData.auroraVfxCanonicalDrawMesh !== true) return;
    const ids = Array.isArray(node.userData.auroraVfxCanonicalDrawRecordIds)
      ? node.userData.auroraVfxCanonicalDrawRecordIds
      : [];
    const emitters = Array.isArray(node.userData.auroraVfxCanonicalEmitterNodeNames)
      ? node.userData.auroraVfxCanonicalEmitterNodeNames
      : [];
    const vertexCount = Number(node.userData.auroraVfxCanonicalDrawVertexCount ?? 0);
    const particleCount = Number(node.userData.auroraVfxCanonicalDrawParticleCount ?? ids.length);
    const sourceBounds = {
      width: Number(node.userData.auroraVfxCanonicalRenderedBoundsWidth ?? 0),
      height: Number(node.userData.auroraVfxCanonicalRenderedBoundsHeight ?? 0),
      depth: Number(node.userData.auroraVfxCanonicalRenderedBoundsDepth ?? 0)
    };
    const measuredBounds =
      sourceBounds.width > 0 ||
      sourceBounds.height > 0 ||
      sourceBounds.depth > 0
        ? sourceBounds
        : measureObjectBounds(node);
    ids.forEach((rawId: unknown, index: number) => {
      const drawRecordId = asNonEmptyString(rawId) ?? `${node.name || "draw"}:${index}`;
      const nextEntry: DrawLedgerEntry = {
        drawRecordId,
        emitter: asNonEmptyString(emitters[index]) ?? "",
        lane: asNonEmptyString(node.userData.auroraVfxCanonicalDrawLane) ?? "unknown",
        particleCount,
        vertexCount,
        textureReference: asNonEmptyString(node.userData.auroraVfxCanonicalTextureReference) ?? "",
        blend: asNonEmptyString(node.userData.auroraVfxCanonicalBlendMode) ?? "",
        depthWrite:
          typeof node.userData.auroraVfxCanonicalDepthWrite === "boolean"
            ? node.userData.auroraVfxCanonicalDepthWrite
            : null,
        bounds: { ...measuredBounds }
      };
      const existing = entriesById.get(drawRecordId);
      if (!existing) {
        entriesById.set(drawRecordId, nextEntry);
        return;
      }
      existing.particleCount = Math.max(existing.particleCount, nextEntry.particleCount);
      existing.vertexCount = Math.max(existing.vertexCount, nextEntry.vertexCount);
      existing.bounds.width = Math.max(existing.bounds.width, nextEntry.bounds.width);
      existing.bounds.height = Math.max(existing.bounds.height, nextEntry.bounds.height);
      existing.bounds.depth = Math.max(existing.bounds.depth, nextEntry.bounds.depth);
    });
  });
  const entries = Array.from(entriesById.values());
  entries.sort((left, right) => left.drawRecordId.localeCompare(right.drawRecordId));
  return { status: entries.length > 0 ? ("pass" as const) : ("fail" as const), entries };
}

function measureObjectBounds(node: THREE.Object3D): {
  width: number;
  height: number;
  depth: number;
} {
  node.updateWorldMatrix(true, false);
  const bounds = new THREE.Box3().setFromObject(node);
  if (bounds.isEmpty()) {
    return { width: 0, height: 0, depth: 0 };
  }
  const size = bounds.getSize(new THREE.Vector3());
  return {
    width: size.x,
    height: size.y,
    depth: size.z
  };
}

function buildParticleShaderLedger(root: THREE.Object3D | null) {
  type ParticleShaderLedgerEntry = {
    drawRecordIds: string[];
    emitter: string;
    softDepthGate: string;
    softDepthDisableReason: string | null;
    sourceMaxHalfExtent: number;
    worldScale: number;
    maxHalfExtent: number;
    particleSoftness: number;
    sizeSpace: string;
    framebufferDepthIdentity: string | null;
    framebufferDepthSource: string | null;
    framebufferDepthStatus: string;
    framebufferDepthMatchesSceneTarget: boolean;
    fogBranch: string;
    shaderApplied: boolean;
    sampledFrameIndex: number | null;
    sampledElapsedSeconds: number | null;
  };
  type ParticleShaderLedgerSnapshot = {
    status: "pass";
    entries: ParticleShaderLedgerEntry[];
    mismatches: string[];
    playbackTriggerCount: number;
    highestObservedFrameIndex: number | null;
  };
  const entriesByKey = new Map<string, ParticleShaderLedgerEntry>();
  const mismatches: string[] = [];
  const sampledFrameIndexValue = Number(
    root?.userData.auroraVfxCanonicalRuntimePlaybackFrameIndex
  );
  const sampledFrameIndex = Number.isFinite(sampledFrameIndexValue)
    ? sampledFrameIndexValue
    : null;
  const sampledElapsedSecondsValue = Number(
    root?.userData.auroraVfxCanonicalRuntimePlaybackElapsedSeconds
  );
  const sampledElapsedSeconds = Number.isFinite(sampledElapsedSecondsValue)
    ? sampledElapsedSecondsValue
    : null;
  const playbackTriggerCountValue = Number(
    root?.userData.auroraVfxCanonicalRuntimePlaybackTriggerCount
  );
  const playbackTriggerCount = Number.isFinite(playbackTriggerCountValue)
    ? playbackTriggerCountValue
    : root?.userData.auroraVfxCanonicalRuntimePlaybackOneTrigger === true
      ? 1
      : 0;

  root?.traverseVisible((node) => {
    if (node.userData.auroraVfxCanonicalDrawMesh !== true) return;
    const softDepth = node.userData.auroraVfxCanonicalParticleSoftDepthState;
    const fogBranch = asNonEmptyString(
      node.userData.auroraVfxCanonicalParticleFogBranch
    );
    if (!softDepth && !fogBranch) return;

    const drawRecordIds = uniqueSorted(
      Array.isArray(node.userData.auroraVfxCanonicalDrawRecordIds)
        ? node.userData.auroraVfxCanonicalDrawRecordIds
            .map(asNonEmptyString)
            .filter((entry): entry is string => entry !== null)
        : []
    );
    const emitterNames = Array.isArray(
      node.userData.auroraVfxCanonicalEmitterNodeNames
    )
      ? node.userData.auroraVfxCanonicalEmitterNodeNames
          .map(asNonEmptyString)
          .filter((entry): entry is string => entry !== null)
      : [];
    const emitter = (emitterNames[0] ?? node.name) || "unknown-emitter";
    const depthInput =
      node.userData.auroraVfxCanonicalParticleDepthInput ?? {};
    const materialList = node instanceof THREE.Mesh
      ? Array.isArray(node.material)
        ? node.material
        : [node.material]
      : [];
    const shaderApplied =
      node.userData.auroraVfxCanonicalParticleShaderApplied === true ||
      materialList.some(
        (material) =>
          material.userData.auroraVfxCanonicalParticleShaderApplied === true
      );
    const softDepthGate = asNonEmptyString(softDepth?.status) ?? "missing";
    const softDepthDisableReason =
      asNonEmptyString(softDepth?.disableReason) ?? null;
    const particleSoftness = Number(softDepth?.particleSoftness ?? 0);
    const maxHalfExtent = Number(softDepth?.maxHalfExtent ?? 0);
    const sourceMaxHalfExtent = Number(
      softDepth?.sourceMaxHalfExtent ?? maxHalfExtent
    );
    const worldScale = Number(softDepth?.worldScale ?? 1);
    const framebufferDepthStatus =
      asNonEmptyString(depthInput.status) ?? "unbound";
    const entry: ParticleShaderLedgerEntry = {
      drawRecordIds,
      emitter,
      softDepthGate,
      softDepthDisableReason,
      sourceMaxHalfExtent: Number.isFinite(sourceMaxHalfExtent)
        ? sourceMaxHalfExtent
        : 0,
      worldScale: Number.isFinite(worldScale) ? worldScale : 0,
      maxHalfExtent,
      particleSoftness: Number.isFinite(particleSoftness)
        ? particleSoftness
        : 0,
      sizeSpace: asNonEmptyString(softDepth?.sizeSpace) ?? "unreported",
      framebufferDepthIdentity: asNonEmptyString(depthInput.textureUuid),
      framebufferDepthSource: asNonEmptyString(depthInput.source),
      framebufferDepthStatus,
      framebufferDepthMatchesSceneTarget:
        depthInput.matchesSceneTarget === true,
      fogBranch: fogBranch ?? "",
      shaderApplied,
      sampledFrameIndex,
      sampledElapsedSeconds
    };
    const key = drawRecordIds.join("|") || node.uuid;
    entriesByKey.set(key, entry);

    if (!shaderApplied) {
      mismatches.push(`${emitter}:particle-shader-not-applied`);
    }
    if (softDepthGate === "enabled") {
      if (
        framebufferDepthStatus !== "bound" ||
        entry.framebufferDepthIdentity === null ||
        entry.framebufferDepthSource !==
          "aurora-retail-scene-target-depth" ||
        !entry.framebufferDepthMatchesSceneTarget
      ) {
        mismatches.push(
          `${emitter}:soft-depth-enabled-without-bound-scene-depth`
        );
      }
      if (!(entry.particleSoftness > 0)) {
        mismatches.push(
          `${emitter}:soft-depth-enabled-without-particleSoftness`
        );
      }
      if (
        !(entry.sourceMaxHalfExtent > 0) ||
        !(entry.worldScale > 0) ||
        !(entry.maxHalfExtent > 0) ||
        entry.sizeSpace !== "three-view-space"
      ) {
        mismatches.push(
          `${emitter}:soft-depth-size-space-contract-invalid`
        );
      }
    } else if (
      softDepthGate !== "disabled" ||
      entry.particleSoftness !== 0 ||
      softDepthDisableReason === null
    ) {
      mismatches.push(`${emitter}:soft-depth-disable-contract-invalid`);
    }
    if (
      entry.fogBranch !== "normal_rgb_mix" &&
      entry.fogBranch !== "additive_alpha_attenuation"
    ) {
      mismatches.push(`${emitter}:particle-fog-branch-missing`);
    }
  });

  const entries = Array.from(entriesByKey.values()).sort((left, right) =>
    left.drawRecordIds.join("|").localeCompare(right.drawRecordIds.join("|"))
  );
  if (entries.length === 0) {
    const retainedSnapshot =
      root?.userData
        .auroraVfxCanonicalParticleShaderLedgerSnapshot as
        | ParticleShaderLedgerSnapshot
        | undefined;
    if (
      retainedSnapshot?.status === "pass" &&
      Array.isArray(retainedSnapshot.entries) &&
      Array.isArray(retainedSnapshot.mismatches) &&
      retainedSnapshot.playbackTriggerCount === playbackTriggerCount
    ) {
      return {
        status: "pass" as const,
        phase: "postplayback-retained-coverage",
        entries: retainedSnapshot.entries,
        mismatches: retainedSnapshot.mismatches
      };
    }
    if (
      root?.visible === false &&
      root.userData.auroraVfxCanonicalRuntimePlayback === true
    ) {
      return {
        status: "pass" as const,
        phase: "preplayback-hidden",
        entries,
        mismatches
      };
    }
    mismatches.push("particle-shader-ledger-empty");
  }
  const result = {
    status: mismatches.length === 0 ? ("pass" as const) : ("fail" as const),
    phase: "visible-frame",
    entries,
    mismatches: uniqueSorted(mismatches)
  };
  if (root && result.status === "pass") {
    const previousSnapshot =
      root.userData
        .auroraVfxCanonicalParticleShaderLedgerSnapshot as
        | ParticleShaderLedgerSnapshot
        | undefined;
    const samePlayback =
      previousSnapshot?.status === "pass" &&
      previousSnapshot.playbackTriggerCount === playbackTriggerCount &&
      (
        sampledFrameIndex === null ||
        previousSnapshot.highestObservedFrameIndex === null ||
        sampledFrameIndex >= previousSnapshot.highestObservedFrameIndex
      );
    const retainedByKey = new Map<string, ParticleShaderLedgerEntry>();
    if (samePlayback && previousSnapshot) {
      previousSnapshot.entries.forEach((entry) => {
        retainedByKey.set(
          entry.drawRecordIds.join("|") || `emitter:${entry.emitter}`,
          { ...entry, drawRecordIds: [...entry.drawRecordIds] }
        );
      });
    }
    result.entries.forEach((entry) => {
      const key =
        entry.drawRecordIds.join("|") || `emitter:${entry.emitter}`;
      const previous = retainedByKey.get(key);
      if (!previous || isBetterParticleShaderSample(entry, previous)) {
        retainedByKey.set(key, {
          ...entry,
          drawRecordIds: [...entry.drawRecordIds]
        });
      }
    });
    const retainedEntries = Array.from(retainedByKey.values()).sort(
      (left, right) =>
        left.drawRecordIds
          .join("|")
          .localeCompare(right.drawRecordIds.join("|"))
    );
    root.userData.auroraVfxCanonicalParticleShaderLedgerSnapshot = {
      status: result.status,
      entries: retainedEntries,
      mismatches: [],
      playbackTriggerCount,
      highestObservedFrameIndex:
        sampledFrameIndex === null
          ? previousSnapshot?.highestObservedFrameIndex ?? null
          : Math.max(
              sampledFrameIndex,
              samePlayback
                ? previousSnapshot?.highestObservedFrameIndex ??
                    sampledFrameIndex
                : sampledFrameIndex
            )
    } satisfies ParticleShaderLedgerSnapshot;
  }
  return result;
}

function isBetterParticleShaderSample(
  candidate: {
    softDepthGate: string;
    shaderApplied: boolean;
    maxHalfExtent: number;
    particleSoftness: number;
  },
  current: {
    softDepthGate: string;
    shaderApplied: boolean;
    maxHalfExtent: number;
    particleSoftness: number;
  }
): boolean {
  const candidateScore = [
    candidate.softDepthGate === "enabled" ? 1 : 0,
    candidate.shaderApplied ? 1 : 0,
    candidate.maxHalfExtent,
    candidate.particleSoftness
  ];
  const currentScore = [
    current.softDepthGate === "enabled" ? 1 : 0,
    current.shaderApplied ? 1 : 0,
    current.maxHalfExtent,
    current.particleSoftness
  ];
  for (let index = 0; index < candidateScore.length; index += 1) {
    const delta = (candidateScore[index] ?? 0) - (currentScore[index] ?? 0);
    if (delta !== 0) return delta > 0;
  }
  return false;
}

function buildPlaybackGuard(
  root: THREE.Object3D | null,
  requirePostDurationHidden: boolean,
  expectedRootCount: number
) {
  const isPlaybackRoot = (node: THREE.Object3D): boolean =>
    node.userData.auroraVfxCanonicalRuntimePlayback === true &&
    node.children.some(
      (child) => child.userData.auroraVfxCanonicalRuntimeFrame === true
    );
  const roots: THREE.Object3D[] = [];
  root?.traverse((node) => {
    if (!isPlaybackRoot(node)) return;
    let ancestor = node.parent;
    while (ancestor) {
      if (isPlaybackRoot(ancestor)) return;
      if (ancestor === root) break;
      ancestor = ancestor.parent;
    }
    roots.push(node);
  });
  const rootTriggerCounts = roots.map((node) => {
    const explicit = Number(node.userData.auroraVfxCanonicalRuntimePlaybackTriggerCount);
    return Number.isFinite(explicit)
      ? explicit
      : node.userData.auroraVfxCanonicalRuntimePlaybackOneTrigger === true
        ? 1
        : 0;
  });
  const triggerCount = rootTriggerCounts.reduce((total, count) => total + count, 0);
  const oneTriggerPerRoot = rootTriggerCounts.every((count) => count === 1);
  const loop = roots.some((node) => node.userData.auroraVfxCanonicalRuntimePlaybackLoop === true);
  const overlapCount =
    Math.max(0, roots.length - expectedRootCount) +
    rootTriggerCounts.reduce((total, count) => total + Math.max(0, count - 1), 0);
  const durationSeconds = roots.reduce((total, node) => {
    const duration = Number(node.userData.auroraVfxCanonicalRuntimePlaybackDurationSeconds);
    return Math.max(total, Number.isFinite(duration) ? duration : 0);
  }, 0);
  const elapsedSeconds = roots.reduce((total, node) => {
    const elapsed = Number(node.userData.auroraVfxCanonicalRuntimePlaybackElapsedSeconds);
    return Math.max(total, Number.isFinite(elapsed) ? elapsed : 0);
  }, 0);
  const completed = roots.some(
    (node) => node.userData.auroraVfxCanonicalRuntimePlaybackCompleted === true
  );
  const postDurationHidden = roots.some(
    (node) => node.userData.auroraVfxCanonicalRuntimePlaybackPostDurationHidden === true
  );
  const status =
    roots.length === expectedRootCount &&
    oneTriggerPerRoot &&
    !loop &&
    overlapCount === 0 &&
    (!requirePostDurationHidden || (completed && postDurationHidden))
      ? "pass"
      : "blocked";
  return {
    status,
    playbackId: asNonEmptyString(roots[0]?.uuid) ?? "",
    rootCount: roots.length,
    expectedRootCount,
    triggerCount,
    oneTriggerPerRoot,
    loop,
    overlapCount,
    durationSeconds,
    elapsedSeconds,
    completed,
    postDurationHidden,
    postDurationHiddenRequired: requirePostDurationHidden
  };
}

function isUsableIdentityToken(value: string | null): value is string {
  return value !== null && !/[-_:]$/u.test(value);
}

function isUsableOptionalDigest(value: string | null): boolean {
  return value === null || /^sha256:[0-9a-f]{64}$/iu.test(value);
}

function buildIdentity(input: VfxRuntimeBuildIdentityInput) {
  const frontendCommit = asNonEmptyString(input.frontend?.commit);
  const frontendImageDigest = asNonEmptyString(input.frontend?.imageDigest);
  const backendCommit = asNonEmptyString(input.backend?.commit);
  const backendImageDigest = asNonEmptyString(input.backend?.imageDigest);
  const backendProcessStartedAt = asNonEmptyString(
    input.backend?.processStartedAt
  );
  const frontendReady =
    isUsableIdentityToken(frontendCommit) &&
    isUsableOptionalDigest(frontendImageDigest);
  const backendReady = Boolean(
    isUsableIdentityToken(backendCommit) &&
      backendProcessStartedAt &&
      isUsableOptionalDigest(backendImageDigest)
  );
  const contractReady = Boolean(asNonEmptyString(input.contractVersion));
  const cacheReady = Boolean(asNonEmptyString(input.cacheKey));
  return {
    status: frontendReady && backendReady && contractReady && cacheReady ? ("ready" as const) : ("blocked" as const),
    frontend: {
      commit: frontendCommit,
      imageDigest: frontendImageDigest,
      builtAt: asNonEmptyString(input.frontend?.builtAt)
    },
    backend: {
      commit: backendCommit,
      imageDigest: backendImageDigest,
      builtAt: asNonEmptyString(input.backend?.builtAt),
      processStartedAt: backendProcessStartedAt
    },
    contractVersion: asNonEmptyString(input.contractVersion),
    cacheKey: asNonEmptyString(input.cacheKey)
  };
}

export function createVfxRuntimeObservabilityReport(
  input: CreateVfxRuntimeObservabilityReportInput
) {
  const identity = buildIdentity(input.buildIdentity);
  const hostGraph = buildHostGraph(
    input.root,
    input.expectedHostGraph,
    input.requirePlaceableComposition ?? true,
    input.compositionRoots
  );
  const assets = readVfxRuntimeAssetSettlement(input.runtime);
  const assetSettlementStatus = assets.some((entry) => entry.stage === "failed")
    ? "failed"
    : assets.length === 0 ||
        assets.some((entry) => entry.stage !== "cached" && entry.stage !== "bound")
      ? "pending"
      : "settled";
  const drawLedger = buildDrawLedger(input.root);
  const particleShaderLedger = buildParticleShaderLedger(input.root);
  const playbackGuard = buildPlaybackGuard(
    input.root,
    input.requirePostDurationHidden === true,
    Math.max(1, Math.trunc(input.expectedPlaybackRootCount ?? 1))
  );
  const debugOverlay = {
    enabled: input.profile === "development" && input.overlayRequested,
    finalProfileDisabled: input.profile === "final"
  };
  const blockerManifest = [
    ...(input.runtimeEmittersDeferred === true
      ? ["deferred-runtime-emitters-unhydrated"]
      : []),
    ...(identity.status !== "ready" ? ["runtime-build-identity-missing"] : []),
    ...(hostGraph.status !== "pass" ? ["canonical-host-graph-failed"] : []),
    ...(assetSettlementStatus === "pending" ? ["asset-settlement-pending"] : []),
    ...(assetSettlementStatus === "failed" ? ["asset-settlement-failed"] : []),
    ...(drawLedger.status !== "pass" ? ["canonical-draw-ledger-empty"] : []),
    ...(particleShaderLedger.status !== "pass"
      ? ["particle-shader-ledger-failed"]
      : []),
    ...(playbackGuard.status !== "pass" ? ["single-playback-guard-failed"] : []),
    ...(playbackGuard.postDurationHiddenRequired && !playbackGuard.completed
      ? ["post-duration-playback-not-completed"]
      : []),
    ...(playbackGuard.postDurationHiddenRequired && !playbackGuard.postDurationHidden
      ? ["post-duration-playback-not-hidden"]
      : []),
    ...(input.timeoutMs !== undefined && assetSettlementStatus !== "settled"
      ? [`settlement-timeout-${Math.max(0, Math.trunc(input.timeoutMs))}ms`]
      : []),
    ...Array.from(
      new Set(
        (input.additionalProofBlockers ?? [])
          .map(asNonEmptyString)
          .filter((blocker): blocker is string => blocker !== null)
      )
    )
  ];
  return {
    version: VFX_RUNTIME_OBSERVABILITY_VERSION,
    identity,
    hostGraph,
    assetSettlement: { status: assetSettlementStatus, entries: assets },
    drawLedger,
    particleShaderLedger,
    playbackGuard,
    debugOverlay,
    proofGate: {
      status: blockerManifest.length === 0 ? ("pass" as const) : ("fail" as const),
      blockerManifest
    }
  };
}
