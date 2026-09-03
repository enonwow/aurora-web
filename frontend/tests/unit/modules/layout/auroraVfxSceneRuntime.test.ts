import { describe, expect, it, vi } from "vitest";
import {
  requiresAuroraVfxSceneCollisionRuntime,
  resolveAuroraVfxSceneRuntimePayload
} from "../../../../src/modules/layout/adapters/three/auroraVfxSceneRuntime";
import type {
  AuroraAreaVfxCollisionContract,
  AuroraVfxPayload,
  SceneObject
} from "../../../../src/modules/scene/contracts";

describe("Aurora VFX scene runtime", () => {
  it("deduplicates backend replay and sends the source-space object transform once", async () => {
    const fetchFn = vi.fn(async () =>
      new Response(
        JSON.stringify({
          data: {
            cache: { key: "cache", hit: false, storedAt: "now", hits: 0 },
            vfx: {
              version: "aurora-vfx-package/v1",
              dependencyGraph: { version: "graph/v1", diagnostics: [] },
              runtimeEmitters: [{ emitterNodeName: "emit_bounce", runtimeFrames: [] }]
            }
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    const runtimeKey = {};
    const input = {
      runtimeKey,
      fetchFn: fetchFn as unknown as typeof fetch,
      requestHeaders: { Authorization: "Bearer test" },
      payload: bouncePayload(),
      areaCollision: collisionContract(),
      object: sceneObject(),
      apiBaseUrl: "http://localhost/api/v1"
    };

    const [first, second] = await Promise.all([
      resolveAuroraVfxSceneRuntimePayload(input),
      resolveAuroraVfxSceneRuntimePayload(input)
    ]);

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const request = fetchFn.mock.calls[0]?.[1] as RequestInit;
    const body = JSON.parse(String(request.body)) as Record<string, any>;
    expect(body).toMatchObject({
      bypassCache: true,
      runtime: {
        dtSeconds: 0.25,
        areaCollision: {
          version: "aurora-area-vfx-scene-collision/v1",
          objectTransform: {
            translation: { x: 12.5, y: 25, z: 5 },
            bearingRadians: Math.PI / 2,
            visualTransform: {
              scaleX: 2,
              scaleY: 3,
              scaleZ: 4,
              offsetX: 1,
              offsetY: 2,
              offsetZ: 3
            }
          }
        }
      }
    });
    expect(first?.provenance.runtimeProfile).toBe("aurora-area-wok-scene-runtime/v1");
    expect(second).toBe(first);
  });

  it("does not replay emitters that do not request Aurora bounce collision", async () => {
    const payload = bouncePayload();
    const replay = payload.contracts.runtimeReplayCommand as Record<string, any>;
    replay.sourceEmitters[0].simulation.bounce = false;

    expect(requiresAuroraVfxSceneCollisionRuntime(payload, collisionContract())).toBe(false);
  });
});

function bouncePayload(): AuroraVfxPayload {
  return {
    version: "aurora-vfx-payload/v1",
    canonicalStatus: "canonical",
    backendCanonical: true,
    sourceKind: "source_mdl_graph",
    previewMode: "none",
    diagnostics: {
      sourceRows: [],
      effectInstance: [],
      phaseSchedule: [],
      dependencyGraph: [],
      runtimeState: [],
      renderContract: [],
      payload: []
    },
    contracts: {
      runtimeReplayCommand: {
        packageKind: "model_graph_runtime",
        sourceEmitters: [
          {
            nodeName: "emit_bounce",
            simulation: { bounce: true, bounceCoefficient: 0.5 }
          }
        ],
        runtime: { dtSeconds: 0.25, tickCount: 40, particleLimit: 64, seed: 211 },
        bypassCache: true,
        includeBenchmarkMetadata: false
      },
      runtimeEmitters: []
    },
    provenance: {}
  };
}

function collisionContract(): AuroraAreaVfxCollisionContract {
  return {
    version: "aurora-area-vfx-collision/v1",
    coordinateSpace: "aurora-area-z-up",
    unitsPerTile: 10,
    status: "ready",
    fingerprint: "a".repeat(64),
    resources: [
      {
        resourceId: "wok:test",
        modelResRef: "test",
        sourceObjectKey: "test.wok",
        sourceLayer: "module",
        sourceHash: "b".repeat(64),
        walkmesh: {
          version: "aurora-wok-walkmesh/v1",
          sourceFormat: "aurora-wok-ascii",
          nodes: [],
          diagnostics: []
        }
      }
    ],
    instances: [
      {
        instanceId: "area:tile:0",
        resourceId: "wok:test",
        translation: { x: 5, y: 5, z: 0 },
        orientationQuarterTurns: 0
      }
    ],
    diagnostics: []
  };
}

function sceneObject(): SceneObject {
  return {
    id: "area:placeable:0",
    kind: "placeables",
    name: "Bounce VFX",
    resRef: "bounce_vfx",
    tag: "BOUNCE_VFX",
    x: 1.25,
    y: 2.5,
    z: 0.5,
    bearing: Math.PI / 2,
    visualTransform: {
      scale: 1,
      scaleX: 2,
      scaleY: 3,
      scaleZ: 4,
      offsetX: 0.1,
      offsetY: 0.2,
      offsetZ: 0.3,
      pitch: 0.4,
      roll: 0.5,
      yaw: 0.6
    }
  };
}
