import {
  createAuroraRetailAreaWokCollisionContext,
  createAuroraWokStaticCollisionContext,
  parseAuroraAsciiWokWalkmesh
} from "../../src/modules/vfx/domain/aurora-wok-walkmesh";
import type { AuroraParticleCollisionQuery } from "../../src/modules/vfx/domain/aurora-vfx-runtime-state";
import { createAuroraAreaVfxSceneCollisionContext } from "../../src/modules/vfx/domain/aurora-vfx-area-collision";

const RETAIL_WOK_SYNTAX_FIXTURE = `#NWmax WALKMESH ASCII
beginwalkmeshgeom amp01_a01_01
node aabb Walkmesh_A01
  position 0 0 0
  orientation 1 0 0 0
  verts 4
    -1 -1 0
    1 -1 0
    1 1 0
    -1 1 0
  faces 2
    2 1 0 0 0 1 2 4
    0 3 2 0 0 3 2 4
  tverts 6
    0 0 0
  aabb -1 -1 0 1 1 0 -1 1
    -1 -1 0 1 1 0 0
    -1 -1 0 1 1 0 1
endnode
endwalkmeshgeom amp01_a01_01`;

describe("Aurora ASCII WOK walkmesh", () => {
  it("preserves retail node, transform, vertex, and face-tail records without inferring face semantics", () => {
    const walkmesh = parseAuroraAsciiWokWalkmesh(RETAIL_WOK_SYNTAX_FIXTURE);

    expect(walkmesh).toMatchObject({
      version: "aurora-wok-walkmesh/v1",
      sourceFormat: "aurora-wok-ascii",
      resourceName: "amp01_a01_01",
      diagnostics: [],
      nodes: [
        {
          nodeName: "Walkmesh_A01",
          position: { x: 0, y: 0, z: 0 },
          orientationRaw: [1, 0, 0, 0],
          aabbRecords: [
            {
              rawTokens: [-1, -1, 0, 1, 1, 0, -1, 1],
              boundsMin: { x: -1, y: -1, z: 0 },
              boundsMax: { x: 1, y: 1, z: 0 },
              faceIndex: -1,
              planeMask: 1,
              planeMaskSource: "source-token",
              childRecordIndices: [1, 2]
            },
            {
              rawTokens: [-1, -1, 0, 1, 1, 0, 0],
              faceIndex: 0,
              planeMask: 0,
              planeMaskSource: "aurora-default-zero"
            },
            {
              rawTokens: [-1, -1, 0, 1, 1, 0, 1],
              faceIndex: 1,
              planeMask: 0,
              planeMaskSource: "aurora-default-zero"
            }
          ],
          vertices: [
            { x: -1, y: -1, z: 0 },
            { x: 1, y: -1, z: 0 },
            { x: 1, y: 1, z: 0 },
            { x: -1, y: 1, z: 0 }
          ],
          faces: expect.arrayContaining([
            expect.objectContaining({
              vertexIndices: [2, 1, 0],
              rawTokens: [2, 1, 0, 0, 0, 1, 2, 4]
            })
          ])
        }
      ]
    });
    expect(walkmesh.nodes[0]?.faces).toHaveLength(2);
  });

  it("reconstructs preorder children and derives Aurora's missing AABB plane mask from child bounds", () => {
    const walkmesh = parseAuroraAsciiWokWalkmesh(
      RETAIL_WOK_SYNTAX_FIXTURE.replace(
        `aabb -1 -1 0 1 1 0 -1 1
    -1 -1 0 1 1 0 0
    -1 -1 0 1 1 0 1`,
        `aabb -2 -1 0 2 1 0 -1
    -2 -1 0 0 1 0 0
    0 -1 0 2 1 0 1`
      )
    );

    expect(walkmesh.diagnostics).toEqual([]);
    expect(walkmesh.nodes[0]?.aabbRecords[0]).toMatchObject({
      faceIndex: -1,
      planeMask: 1,
      planeMaskSource: "aurora-derived-child-bounds",
      childRecordIndices: [1, 2]
    });
  });

  it("matches Aurora's negative-axis bits and strict dominant-axis tie order", () => {
    const sourceTree = `aabb -1 -1 0 1 1 0 -1 1
    -1 -1 0 1 1 0 0
    -1 -1 0 1 1 0 1`;
    const negativeY = parseAuroraAsciiWokWalkmesh(
      RETAIL_WOK_SYNTAX_FIXTURE.replace(
        sourceTree,
        `aabb -1 -2 -1 1 2 1 -1
    -1 0 -1 1 2 1 0
    -1 -2 -1 1 0 1 1`
      )
    );
    const tiedAxes = parseAuroraAsciiWokWalkmesh(
      RETAIL_WOK_SYNTAX_FIXTURE.replace(
        sourceTree,
        `aabb 0 0 0 2 2 2 -1
    0 0 0 1 1 1 0
    1 1 1 2 2 2 1`
      )
    );

    expect(negativeY.nodes[0]?.aabbRecords[0]?.planeMask).toBe(16);
    expect(tiedAxes.nodes[0]?.aabbRecords[0]?.planeMask).toBe(4);
  });

  it("fails visibly when an internal Aurora AABB record does not have two preorder children", () => {
    const walkmesh = parseAuroraAsciiWokWalkmesh(
      RETAIL_WOK_SYNTAX_FIXTURE.replace(
        `aabb -1 -1 0 1 1 0 -1 1
    -1 -1 0 1 1 0 0
    -1 -1 0 1 1 0 1`,
        `aabb -1 -1 0 1 1 0 -1
    -1 -1 0 1 1 0 0`
      )
    );

    expect(walkmesh.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "WOK_AABB_TREE_TRUNCATED",
          severity: "warn"
        })
      ])
    );
  });

  it("reports a static WOK contact as profile-gated evidence without claiming the Aurora collision service", () => {
    const context = createAuroraWokStaticCollisionContext({
      walkmesh: parseAuroraAsciiWokWalkmesh(RETAIL_WOK_SYNTAX_FIXTURE)
    });

    const contact = context.resolve(collisionQuery());

    expect(context).toMatchObject({
      collisionProfileId: "aurora-wok-static-profile-gated/v1",
      requestedCollisionClasses: ["retail-wok-static-geometry"],
      serviceEvidence: "profile-gated-adapter"
    });
    expect(contact).toMatchObject({
      status: "hit",
      hitPosition: { x: 0, y: 0, z: 0 },
      contactNormal: { x: 0, y: 0, z: -1 },
      contactNormalProvenance: "retail-wok-ascii-face-winding-profile-gated",
      segmentParameter: 0.5,
      contactDistance: 1,
      collisionOwnerProvenance:
        "retail-wok-ascii-static-triangle:amp01_a01_01:Walkmesh_A01:line-12"
    });
  });

  it("tests only faces referenced by Aurora AABB leaves when a source tree is present", () => {
    const walkmesh = parseAuroraAsciiWokWalkmesh(
      RETAIL_WOK_SYNTAX_FIXTURE.replace(
        `aabb -1 -1 0 1 1 0 -1 1
    -1 -1 0 1 1 0 0
    -1 -1 0 1 1 0 1`,
        `aabb -1 -1 0 1 1 0 0`
      )
    );
    const context = createAuroraRetailAreaWokCollisionContext({
      instances: [
        {
          instanceId: "area:tile-0",
          walkmesh,
          translation: { x: 0, y: 0, z: 0 }
        }
      ]
    });

    expect(
      context.resolve(
        collisionQuery(
          { x: -0.75, y: 0.75, z: 1 },
          { x: -0.75, y: 0.75, z: -1 }
        )
      )
    ).toMatchObject({ status: "noHit" });
  });

  it("uses Aurora's direction mask and shared shortened endpoint for equal AABB hits", () => {
    const walkmesh = parseAuroraAsciiWokWalkmesh(
      RETAIL_WOK_SYNTAX_FIXTURE.replace(
        "aabb -1 -1 0 1 1 0 -1 1",
        "aabb -1 -1 0 1 1 0 -1 4"
      )
    );
    const context = createAuroraRetailAreaWokCollisionContext({
      instances: [
        {
          instanceId: "area:tile-0",
          walkmesh,
          translation: { x: 0, y: 0, z: 0 }
        }
      ]
    });

    expect(
      context.resolve(collisionQuery({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 }))
    ).toMatchObject({
      status: "hit",
      collisionOwnerProvenance:
        "retail-wok-ascii-static-triangle:area:tile-0:amp01_a01_01:Walkmesh_A01:line-13"
    });
  });

  it("applies the source-mapped WOK node position before testing a contact", () => {
    const walkmesh = parseAuroraAsciiWokWalkmesh(
      RETAIL_WOK_SYNTAX_FIXTURE.replace("position 0 0 0", "position 1 0 0")
    );

    expect(
      createAuroraWokStaticCollisionContext({ walkmesh }).resolve(
        collisionQuery({ x: 1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 })
      )
    ).toMatchObject({
      status: "hit",
      hitPosition: { x: 1, y: 0, z: 0 }
    });
  });

  it("applies Aurora's 4 - Tile_Orientation quarter turn before area translation", () => {
    const walkmesh = parseAuroraAsciiWokWalkmesh(
      RETAIL_WOK_SYNTAX_FIXTURE.replace("position 0 0 0", "position 1 0 0")
    );
    const context = createAuroraRetailAreaWokCollisionContext({
      instances: [
        {
          instanceId: "area:tile-1",
          walkmesh,
          translation: { x: 5, y: 6, z: 0 },
          orientationQuarterTurns: 3
        }
      ]
    });

    const contact = context.resolve(
      collisionQuery({ x: 5, y: 7, z: 1 }, { x: 5, y: 7, z: -1 })
    );

    expect(context).toMatchObject({
      collisionProfileId: "aurora-runtime-static-wok-hit/v1",
      requestedCollisionClasses: ["retail-area-static-wok-geometry"],
      serviceEvidence: "aurora-runtime-service"
    });
    expect(contact).toMatchObject({
      status: "hit",
      hitPosition: { x: 5, y: 7, z: 0 },
      contactNormalProvenance:
        "aurora-static-wok-face-winding-query-helper-slots-0x54-0x58-0x5c",
      collisionOwnerProvenance:
        "retail-wok-ascii-static-triangle:area:tile-1:amp01_a01_01:Walkmesh_A01:line-12"
    });
  });

  it("returns noHit after a VFX-helper static miss without selecting dynamic traversal", () => {
    const context = createAuroraRetailAreaWokCollisionContext({
      instances: [
        {
          instanceId: "area:tile-0",
          walkmesh: parseAuroraAsciiWokWalkmesh(RETAIL_WOK_SYNTAX_FIXTURE),
          translation: { x: 0, y: 0, z: 0 }
        }
      ]
    });

    expect(
      context.resolve(collisionQuery({ x: 10, y: 10, z: 1 }, { x: 10, y: 10, z: -1 }))
    ).toEqual({
      status: "noHit",
      diagnostics: [
        expect.objectContaining({
          code: "VFX_AURORA_VFX_QUERY_STATIC_MISS_NO_HIT",
          severity: "info"
        })
      ]
    });
  });

  it("maps object-local VFX queries through Aurora placement and visual transforms before WOK traversal", () => {
    const walkmesh = parseAuroraAsciiWokWalkmesh(RETAIL_WOK_SYNTAX_FIXTURE);
    const context = createAuroraAreaVfxSceneCollisionContext({
      version: "aurora-area-vfx-scene-collision/v1",
      area: {
        version: "aurora-area-vfx-collision/v1",
        coordinateSpace: "aurora-area-z-up",
        unitsPerTile: 10,
        status: "ready",
        fingerprint: "0".repeat(64),
        resources: [
          {
            resourceId: "wok:amp01_a01_01:test",
            modelResRef: "amp01_a01_01",
            sourceObjectKey: "__aurora/sources/vanilla/walkmeshes/amp01_a01_01.wok",
            sourceLayer: "vanilla",
            sourceHash: "1".repeat(64),
            walkmesh
          }
        ],
        instances: [
          {
            instanceId: "area:tile-0",
            resourceId: "wok:amp01_a01_01:test",
            translation: { x: 7, y: 22, z: 0 },
            orientationQuarterTurns: 0
          }
        ],
        diagnostics: []
      },
      objectTransform: {
        translation: { x: 10, y: 20, z: 0 },
        bearingRadians: Math.PI / 2,
        visualTransform: {
          scaleX: 2,
          scaleY: 3,
          scaleZ: 2,
          offsetX: 2,
          offsetY: 3,
          offsetZ: 0,
          pitch: 0,
          roll: 0,
          yaw: 0
        }
      }
    });

    const result = context.resolve(collisionQuery());
    expect(result).toMatchObject({
      status: "hit",
      contactNormal: { x: 0, y: 0, z: -1 },
      contactDistance: 1,
      collisionOwnerProvenance: expect.stringContaining("area:tile-0")
    });
    expect(result?.hitPosition?.x).toBeCloseTo(0, 12);
    expect(result?.hitPosition?.y).toBeCloseTo(0, 12);
    expect(result?.hitPosition?.z).toBeCloseTo(0, 12);
  });

  it("applies WOK node axis-angle before node position and area transforms", () => {
    const walkmesh = parseAuroraAsciiWokWalkmesh(
      RETAIL_WOK_SYNTAX_FIXTURE
        .replace("position 0 0 0", "position 1 0 0")
        .replace("orientation 1 0 0 0", `orientation 0 1 0 ${Math.PI / 2}`)
    );
    const context = createAuroraRetailAreaWokCollisionContext({
      instances: [
        {
          instanceId: "area:tile-0",
          walkmesh,
          translation: { x: 0, y: 0, z: 0 }
        }
      ]
    });

    const result = context.resolve(
      collisionQuery({ x: 2, y: 0, z: 0 }, { x: 0.5, y: 0, z: 0 })
    );
    expect(result).toMatchObject({
      status: "hit",
      hitPosition: { x: 1, y: 0, z: 0 },
      contactNormal: { x: -1, y: 0, z: 0 }
    });
  });

  it("rejects a non-zero WOK node orientation with a zero-length axis", () => {
    const walkmesh = parseAuroraAsciiWokWalkmesh(
      RETAIL_WOK_SYNTAX_FIXTURE.replace("orientation 1 0 0 0", "orientation 0 0 0 1")
    );
    const context = createAuroraRetailAreaWokCollisionContext({
      instances: [
        {
          instanceId: "area:tile-0",
          walkmesh,
          translation: { x: 0, y: 0, z: 0 }
        }
      ]
    });

    expect(context.resolve(collisionQuery())).toEqual({
      status: "unsupported",
      diagnostics: [
        expect.objectContaining({
          code: "VFX_WOK_NODE_ORIENTATION_AXIS_INVALID",
          severity: "warn"
        })
      ]
    });
  });
});

function collisionQuery(
  currentPosition = { x: 0, y: 0, z: 1 },
  testEndpoint = { x: 0, y: 0, z: -1 }
): AuroraParticleCollisionQuery {
  return {
    queryId: "wok-static-query",
    emitterNodeName: "emit_chunk",
    runtimeEmitterIdentity: "runtime:emit_chunk",
    sourceFlagsWord: 0x10,
    queryHelperIdentity: "helper:emit_chunk",
    queryHelperInitArguments: {
      enabled: 1,
      includeMask: 0xbfffffff,
      excludeMask: 0xffffffff,
      reserved: 0
    },
    queryResetGeneration: 1,
    staleResultReset: true,
    particleId: 1,
    particleLane: "chunk",
    currentPosition,
    predictedPosition: testEndpoint,
    testEndpoint,
    velocityBeforeCollision: { x: 0, y: 0, z: -2 },
    deltaSeconds: 1,
    bounceCoefficient: 1,
    splatRequested: false,
    collisionProfileId: "aurora-wok-static-profile-gated/v1",
    requestedCollisionClasses: ["retail-wok-static-geometry"],
    collisionServiceEvidence: "profile-gated-adapter",
    reason: "bounce",
    status: "pending"
  };
}
