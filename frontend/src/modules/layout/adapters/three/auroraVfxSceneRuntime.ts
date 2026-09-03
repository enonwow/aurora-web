import type {
  AuroraAreaVfxCollisionContract,
  AuroraVfxJsonValue,
  AuroraVfxPayload,
  SceneObject
} from "../../../scene/contracts";
import { resolveWorkspaceBackendApiBaseUrl } from "../../../shared/workspaceBackendApiBaseUrl";

interface SceneRuntimeCacheState {
  resolved: Map<string, AuroraVfxPayload>;
  pending: Map<string, Promise<AuroraVfxPayload | null>>;
}

export interface AuroraVfxSceneRuntimeInput {
  runtimeKey: object;
  fetchFn: typeof fetch;
  requestHeaders: Readonly<Record<string, string>>;
  payload: AuroraVfxPayload;
  areaCollision: AuroraAreaVfxCollisionContract;
  object: SceneObject;
  apiBaseUrl?: string;
}

const AURORA_UNITS_PER_TILE = 10;
const cacheByRuntime = new WeakMap<object, SceneRuntimeCacheState>();

export function requiresAuroraVfxSceneCollisionRuntime(
  payload: AuroraVfxPayload,
  areaCollision: AuroraAreaVfxCollisionContract | undefined
): boolean {
  if (!areaCollision || areaCollision.instances.length === 0) {
    return false;
  }
  const replayCommand = readRecord(payload.contracts.runtimeReplayCommand);
  const sourceEmitters = Array.isArray(replayCommand?.sourceEmitters)
    ? replayCommand.sourceEmitters
    : replayCommand?.sourceEmitter
      ? [replayCommand.sourceEmitter]
      : [];
  return sourceEmitters.some((sourceEmitter) => {
    const emitter = readRecord(sourceEmitter);
    const simulation = readRecord(emitter?.simulation);
    return simulation?.bounce === true;
  });
}

export function resolveAuroraVfxSceneRuntimePayload(
  input: AuroraVfxSceneRuntimeInput
): Promise<AuroraVfxPayload | null> {
  if (!requiresAuroraVfxSceneCollisionRuntime(input.payload, input.areaCollision)) {
    return Promise.resolve(null);
  }
  const replayCommand = readRecord(input.payload.contracts.runtimeReplayCommand);
  if (!replayCommand) {
    return Promise.resolve(null);
  }
  const objectTransform = buildAuroraObjectTransform(input.object);
  const key = JSON.stringify({
    areaFingerprint: input.areaCollision.fingerprint,
    objectTransform,
    replayCommand
  });
  const cache = getRuntimeCache(input.runtimeKey);
  const resolved = cache.resolved.get(key);
  if (resolved) {
    return Promise.resolve(resolved);
  }
  const pending = cache.pending.get(key);
  if (pending) {
    return pending;
  }

  const request = requestAuroraVfxSceneRuntime(input, replayCommand, objectTransform)
    .then((payload) => {
      if (payload) {
        cache.resolved.set(key, payload);
      }
      return payload;
    })
    .finally(() => {
      cache.pending.delete(key);
    });
  cache.pending.set(key, request);
  return request;
}

async function requestAuroraVfxSceneRuntime(
  input: AuroraVfxSceneRuntimeInput,
  replayCommand: Record<string, unknown>,
  objectTransform: ReturnType<typeof buildAuroraObjectTransform>
): Promise<AuroraVfxPayload | null> {
  const runtime = readRecord(replayCommand.runtime) ?? {};
  const response = await input.fetchFn(
    `${(input.apiBaseUrl ?? resolveWorkspaceBackendApiBaseUrl()).replace(/\/+$/u, "")}/vfx/process`,
    {
      method: "POST",
      headers: {
        ...input.requestHeaders,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...replayCommand,
        runtime: {
          ...runtime,
          areaCollision: {
            version: "aurora-area-vfx-scene-collision/v1",
            area: input.areaCollision,
            objectTransform
          }
        },
        bypassCache: true,
        includeBenchmarkMetadata: false
      })
    }
  );
  if (!response.ok) {
    return null;
  }
  const envelope = readRecord(await response.json());
  const serviceEnvelope = readRecord(envelope?.data);
  const vfx = readRecord(serviceEnvelope?.vfx);
  if (!vfx || vfx.version !== "aurora-vfx-package/v1") {
    return null;
  }
  return mergeSceneRuntimePackage(input.payload, vfx);
}

function mergeSceneRuntimePackage(
  payload: AuroraVfxPayload,
  vfx: Record<string, unknown>
): AuroraVfxPayload {
  const contracts = {
    ...payload.contracts,
    ...(toJsonValue(vfx.dependencyGraph) !== undefined
      ? { dependencyGraph: toJsonValue(vfx.dependencyGraph)! }
      : {}),
    ...(toJsonValue(vfx.runtimeEmitters) !== undefined
      ? { runtimeEmitters: toJsonValue(vfx.runtimeEmitters)! }
      : {}),
    ...(toJsonValue(vfx.runtimeState) !== undefined
      ? { runtimeState: toJsonValue(vfx.runtimeState)! }
      : {}),
    ...(toJsonValue(vfx.renderContract) !== undefined
      ? { renderContract: toJsonValue(vfx.renderContract)! }
      : {})
  };
  return {
    ...payload,
    contracts,
    diagnostics: {
      ...payload.diagnostics,
      payload: [
        ...payload.diagnostics.payload,
        {
          code: "VFX_AURORA_AREA_WOK_SCENE_RUNTIME_APPLIED",
          severity: "info",
          message:
            "Canonical runtime frames were recomputed by the backend against source-precedence static area WOK instances in Aurora coordinates."
        }
      ]
    },
    provenance: {
      ...payload.provenance,
      runtimeProfile: "aurora-area-wok-scene-runtime/v1"
    }
  };
}

function buildAuroraObjectTransform(object: SceneObject) {
  const transform = object.visualTransform;
  return {
    translation: {
      x: object.x * AURORA_UNITS_PER_TILE,
      y: object.y * AURORA_UNITS_PER_TILE,
      z: object.z * AURORA_UNITS_PER_TILE
    },
    bearingRadians: object.bearing,
    visualTransform: {
      scaleX: Math.max(0.01, transform.scaleX ?? transform.scale),
      scaleY: Math.max(0.01, transform.scaleY ?? transform.scale),
      scaleZ: Math.max(0.01, transform.scaleZ ?? transform.scale),
      offsetX: transform.offsetX * AURORA_UNITS_PER_TILE,
      offsetY: transform.offsetY * AURORA_UNITS_PER_TILE,
      offsetZ: transform.offsetZ * AURORA_UNITS_PER_TILE,
      pitch: transform.pitch,
      roll: transform.roll,
      yaw: transform.yaw
    }
  };
}

function getRuntimeCache(runtimeKey: object): SceneRuntimeCacheState {
  const existing = cacheByRuntime.get(runtimeKey);
  if (existing) {
    return existing;
  }
  const created: SceneRuntimeCacheState = {
    resolved: new Map(),
    pending: new Map()
  };
  cacheByRuntime.set(runtimeKey, created);
  return created;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function toJsonValue(value: unknown): AuroraVfxJsonValue | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (Array.isArray(value)) {
    const normalized = value.map(toJsonValue);
    return normalized.every((entry) => entry !== undefined)
      ? (normalized as AuroraVfxJsonValue[])
      : undefined;
  }
  const record = readRecord(value);
  if (!record) {
    return undefined;
  }
  const normalized: Record<string, AuroraVfxJsonValue> = {};
  for (const [key, entry] of Object.entries(record)) {
    const json = toJsonValue(entry);
    if (json !== undefined) {
      normalized[key] = json;
    }
  }
  return normalized;
}
