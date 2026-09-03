import { describe, expect, it } from "vitest";
import type {
  AuroraAreaVfxCollisionContract,
  SceneTile
} from "../../../../../src/modules/scene/contracts";
import {
  buildAreaTileConnectivityDiagnostics,
  buildAreaTileWalkmeshOverlaySegments
} from "../../../../../src/modules/scene/domain/areaTileConnectivityDiagnostics";

function tile(
  id: string,
  row: number,
  col: number,
  overrides: Partial<SceneTile> = {}
): SceneTile {
  return {
    id,
    row,
    col,
    terrain: "grass",
    orientation: 0,
    rotateTexture: false,
    plot: false,
    source: "aurora_tile_list",
    pathNode: `path_${id}`,
    height: 0,
    ...overrides
  };
}

function squareWalkmesh(z = 0) {
  return {
    version: "aurora-wok-walkmesh/v1",
    sourceFormat: "aurora-wok-ascii",
    resourceName: `square-${z}`,
    diagnostics: [],
    nodes: [
      {
        nodeName: "walkmesh",
        vertices: [
          { x: -5, y: -5, z },
          { x: 5, y: -5, z },
          { x: 5, y: 5, z },
          { x: -5, y: 5, z }
        ],
        faces: [
          { vertexIndices: [0, 1, 2], rawTokens: [0, 1, 2], sourceLineNumber: 10 },
          { vertexIndices: [0, 2, 3], rawTokens: [0, 2, 3], sourceLineNumber: 11 }
        ],
        aabbRecords: []
      }
    ]
  };
}

function collision(
  rightWalkmesh = squareWalkmesh(),
  overrides: Partial<AuroraAreaVfxCollisionContract> = {}
): AuroraAreaVfxCollisionContract {
  return {
    version: "aurora-area-vfx-collision/v1",
    coordinateSpace: "aurora-area-z-up",
    unitsPerTile: 10,
    status: "ready",
    fingerprint: "f".repeat(64),
    resources: [
      {
        resourceId: "left-resource",
        modelResRef: "left-model",
        sourceObjectKey: "base/left.wok",
        sourceLayer: "vanilla",
        sourceHash: "a".repeat(64),
        walkmesh: squareWalkmesh()
      },
      {
        resourceId: "right-resource",
        modelResRef: "right-model",
        sourceObjectKey: "base/right.wok",
        sourceLayer: "vanilla",
        sourceHash: "b".repeat(64),
        walkmesh: rightWalkmesh
      }
    ],
    instances: [
      {
        instanceId: "left",
        resourceId: "left-resource",
        translation: { x: 5, y: 5, z: 0 },
        orientationQuarterTurns: 0
      },
      {
        instanceId: "right",
        resourceId: "right-resource",
        translation: { x: 15, y: 5, z: 0 },
        orientationQuarterTurns: 0
      }
    ],
    diagnostics: [],
    ...overrides
  };
}

function rectangleWalkmesh(
  minX: number,
  maxX: number,
  minY = -5,
  maxY = 5,
  z = 0
) {
  return {
    ...squareWalkmesh(z),
    nodes: [
      {
        ...squareWalkmesh(z).nodes[0],
        vertices: [
          { x: minX, y: minY, z },
          { x: maxX, y: minY, z },
          { x: maxX, y: maxY, z },
          { x: minX, y: maxY, z }
        ]
      }
    ]
  };
}

function replaceFirstWalkmesh(value: unknown): AuroraAreaVfxCollisionContract {
  const result = collision();
  result.resources[0] = {
    ...result.resources[0]!,
    walkmesh: value as AuroraAreaVfxCollisionContract["resources"][number]["walkmesh"]
  };
  return result;
}

describe("Area tile connectivity diagnostics", () => {
  it("builds bounded source-WOK line segments in Aurora world coordinates", () => {
    const result = buildAreaTileWalkmeshOverlaySegments(collision());

    expect(result).toMatchObject({
      version: "aurora-area-tile-wok-overlay/v1",
      status: "ready",
      instanceCount: 2,
      segmentCount: 12,
      truncated: false
    });
    expect(result.segments[0]).toEqual({
      tileId: "left",
      first: { x: 0, y: 0, z: 0 },
      second: { x: 10, y: 0, z: 0 }
    });
    expect(result.segments.some((segment) => segment.second.x === 20)).toBe(true);
  });

  it("fails the WOK overlay closed for malformed or non-ready contracts", () => {
    const malformed = collision();
    malformed.resources[0] = {
      ...malformed.resources[0]!,
      walkmesh: { version: "aurora-wok-walkmesh/v1", nodes: "not-an-array" }
    };

    expect(buildAreaTileWalkmeshOverlaySegments(malformed)).toMatchObject({
      status: "partial",
      instanceCount: 1,
      segmentCount: 6
    });
    expect(
      buildAreaTileWalkmeshOverlaySegments({ ...collision(), status: "partial" })
    ).toEqual({
      version: "aurora-area-tile-wok-overlay/v1",
      status: "unavailable",
      instanceCount: 0,
      segmentCount: 0,
      truncated: false,
      segments: []
    });
    expect(buildAreaTileWalkmeshOverlaySegments(undefined)).toEqual({
      version: "aurora-area-tile-wok-overlay/v1",
      status: "unavailable",
      instanceCount: 0,
      segmentCount: 0,
      truncated: false,
      segments: []
    });
  });

  it("reports an empty ready WOK contract as unavailable and ambiguous resources as partial", () => {
    expect(buildAreaTileWalkmeshOverlaySegments({
      ...collision(),
      resources: [],
      instances: []
    })).toEqual({
      version: "aurora-area-tile-wok-overlay/v1",
      status: "unavailable",
      instanceCount: 0,
      segmentCount: 0,
      truncated: false,
      segments: []
    });

    const ambiguous = collision();
    ambiguous.resources.push({ ...ambiguous.resources[0]! });
    expect(buildAreaTileWalkmeshOverlaySegments(ambiguous)).toMatchObject({
      status: "partial",
      instanceCount: 1,
      segmentCount: 6,
      truncated: false
    });
  });

  it("keeps a malformed-then-valid duplicate WOK resource ambiguous", () => {
    const contract = collision();
    const valid = contract.resources[0]!;
    contract.resources[0] = {
      ...valid,
      walkmesh: { version: "wrong", nodes: [] }
    };
    contract.resources.push(valid);
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: contract
    });
    expect(result.seams[0]).toMatchObject({
      wokGeometricStatus: "unresolved",
      wokReason: "walkmesh-resource-invalid"
    });
  });

  it.each([
    ["null walkmesh", null],
    ["array walkmesh", []],
    ["wrong version", { version: "wrong", nodes: [] }],
    ["nodes not array", { version: "aurora-wok-walkmesh/v1", nodes: {} }],
    [
      "primitive node",
      { version: "aurora-wok-walkmesh/v1", nodes: [null] }
    ],
    [
      "vertices not array",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [{ vertices: {}, faces: [] }]
      }
    ],
    [
      "faces not array",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [{ vertices: [], faces: {} }]
      }
    ],
    [
      "invalid vertex coordinate",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [{ vertices: [{ x: "0", y: 0, z: 0 }], faces: [] }]
      }
    ],
    [
      "primitive face",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [
          {
            vertices: [{ x: 0, y: 0, z: 0 }],
            faces: [null]
          }
        ]
      }
    ],
    [
      "face indices not array",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [
          {
            vertices: [{ x: 0, y: 0, z: 0 }],
            faces: [{ vertexIndices: {} }]
          }
        ]
      }
    ],
    [
      "face index wrong length",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [
          {
            vertices: [{ x: 0, y: 0, z: 0 }],
            faces: [{ vertexIndices: [0, 0] }]
          }
        ]
      }
    ],
    [
      "face index non-number",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [
          {
            vertices: [{ x: 0, y: 0, z: 0 }],
            faces: [{ vertexIndices: [0, 0, "0"] }]
          }
        ]
      }
    ],
    [
      "face index fractional",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [
          {
            vertices: [{ x: 0, y: 0, z: 0 }],
            faces: [{ vertexIndices: [0, 0, 0.5] }]
          }
        ]
      }
    ],
    [
      "face index negative",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [
          {
            vertices: [{ x: 0, y: 0, z: 0 }],
            faces: [{ vertexIndices: [0, 0, -1] }]
          }
        ]
      }
    ],
    [
      "face index out of range",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [
          {
            vertices: [
              { x: 0, y: 0, z: 0 },
              { x: 1, y: 0, z: 0 },
              { x: 0, y: 1, z: 0 }
            ],
            faces: [{ vertexIndices: [0, 1, 3] }]
          }
        ]
      }
    ],
    [
      "duplicate face index",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [
          {
            vertices: [
              { x: 0, y: 0, z: 0 },
              { x: 1, y: 0, z: 0 },
              { x: 0, y: 1, z: 0 }
            ],
            faces: [{ vertexIndices: [0, 1, 1] }]
          }
        ]
      }
    ],
    [
      "invalid node position",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [{ vertices: [], faces: [], position: { x: 0, y: 0 } }]
      }
    ],
    [
      "orientation not array",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [{ vertices: [], faces: [], orientationRaw: {} }]
      }
    ],
    [
      "orientation wrong length",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [{ vertices: [], faces: [], orientationRaw: [1, 0, 0] }]
      }
    ],
    [
      "orientation non-finite",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [{ vertices: [], faces: [], orientationRaw: [1, 0, 0, Number.NaN] }]
      }
    ],
    [
      "orientation non-zero angle with zero axis",
      {
        version: "aurora-wok-walkmesh/v1",
        nodes: [{ vertices: [], faces: [], orientationRaw: [0, 0, 0, 1] }]
      }
    ]
  ])("rejects malformed source WOK: %s", (_label, walkmesh) => {
    const result = buildAreaTileWalkmeshOverlaySegments(replaceFirstWalkmesh(walkmesh));
    expect(result).toMatchObject({ status: "partial", instanceCount: 1, segmentCount: 6 });
  });

  it("honors all ARE quarter-turn orientations in source WOK world geometry", () => {
    const expectedFirstSegments = [
      [{ x: 0, y: 0, z: 0 }, { x: 10, y: 0, z: 0 }],
      [{ x: 0, y: 10, z: 0 }, { x: 0, y: 0, z: 0 }],
      [{ x: 10, y: 10, z: 0 }, { x: 0, y: 10, z: 0 }],
      [{ x: 10, y: 0, z: 0 }, { x: 10, y: 10, z: 0 }]
    ];
    for (const orientation of [0, 1, 2, 3] as const) {
      const contract = collision();
      contract.resources = [contract.resources[0]!];
      contract.instances = [{
        ...contract.instances[0]!,
        orientationQuarterTurns: orientation
      }];
      const result = buildAreaTileWalkmeshOverlaySegments(contract);
      expect([result.segments[0]?.first, result.segments[0]?.second]).toEqual(
        expectedFirstSegments[orientation]
      );
    }
  });

  it.each([
    [[2, 0, 0, Math.PI / 2], { x: 7, y: 4, z: 5 }, { x: 10, y: 1, z: 8 }],
    [[0, 2, 0, Math.PI / 2], { x: 9, y: 9, z: 2 }, { x: 12, y: 12, z: -1 }],
    [[0, 0, 2, Math.PI / 2], { x: 4, y: 8, z: 6 }, { x: 1, y: 11, z: 9 }],
    [
      [1, 2, 3, 0.7],
      { x: 7, y: 9, z: 6 },
      { x: 9.080349063599838, y: 12.932264595183351, z: 8.685040582011153 }
    ]
  ])("applies non-unit WOK node axis-angle transforms", (orientationRaw, first, second) => {
    const walkmesh = squareWalkmesh() as ReturnType<typeof squareWalkmesh> & {
      nodes: Array<ReturnType<typeof squareWalkmesh>["nodes"][number] & {
        position?: { x: number; y: number; z: number };
        orientationRaw?: number[];
      }>;
    };
    walkmesh.nodes[0]!.vertices = [
      { x: 1, y: 2, z: 3 },
      { x: 4, y: 5, z: 6 },
      { x: 7, y: 8, z: 10 },
      { x: -1, y: -2, z: -3 }
    ];
    walkmesh.nodes[0]!.position = { x: 1, y: 2, z: 3 };
    walkmesh.nodes[0]!.orientationRaw = orientationRaw;
    const contract = collision();
    contract.resources = [{ ...contract.resources[0]!, walkmesh }];
    contract.instances = [contract.instances[0]!];

    const segment = buildAreaTileWalkmeshOverlaySegments(contract).segments[0]!;
    expect(segment.first.x).toBeCloseTo(first.x, 10);
    expect(segment.first.y).toBeCloseTo(first.y, 10);
    expect(segment.first.z).toBeCloseTo(first.z, 10);
    expect(segment.second.x).toBeCloseTo(second.x, 10);
    expect(segment.second.y).toBeCloseTo(second.y, 10);
    expect(segment.second.z).toBeCloseTo(second.z, 10);
  });

  it("keeps zero-angle zero-axis nodes finite and normalizes negative ARE turns", () => {
    const contract = collision();
    contract.resources = [{
      ...contract.resources[0]!,
      walkmesh: {
        ...squareWalkmesh(),
        nodes: [{ ...squareWalkmesh().nodes[0]!, orientationRaw: [0, 0, 0, 0] }]
      }
    }];
    contract.instances = [{ ...contract.instances[0]!, orientationQuarterTurns: -1 }];
    expect(buildAreaTileWalkmeshOverlaySegments(contract).segments[0]).toEqual({
      tileId: "left",
      first: { x: 10, y: 0, z: 0 },
      second: { x: 10, y: 10, z: 0 }
    });
  });

  it("preserves non-zero WOK translation height in overlay coordinates", () => {
    const contract = collision();
    contract.resources = [contract.resources[0]!];
    contract.instances = [{
      ...contract.instances[0]!,
      translation: { x: 5, y: 5, z: 20 }
    }];
    expect(buildAreaTileWalkmeshOverlaySegments(contract).segments[0]?.first.z).toBe(20);
  });

  it("records a source-backed geometric WOK contact without promoting PathNode to PathConnect", () => {
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: collision()
    });

    expect(result).toMatchObject({
      version: "aurora-area-tile-connectivity-diagnostics/v1",
      pathConnect: {
        status: "missing",
        evidence: "native-path-connect-not-recovered"
      },
      summary: {
        expectedInternalSeams: 1,
        wokGeometricContactSeams: 1,
        wokDiscontinuousSeams: 0,
        unresolvedSeams: 0,
        geometricContactComponents: 1
      }
    });
    expect(result.seams).toEqual([
      expect.objectContaining({
        seamId: "left:right",
        firstTileId: "left",
        secondTileId: "right",
        direction: "right",
        pathMetadataStatus: "present-both",
        pathConnectStatus: "missing",
        wokGeometricStatus: "contact"
      })
    ]);
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "AREA_TILE_PATH_CONNECT_NATIVE_EVIDENCE_MISSING" })
    );
    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "AREA_TILE_WOK_GEOMETRIC_DISCONTINUITY" })
    );
  });

  it("keeps a visible-height WOK discontinuity separate from native traversability", () => {
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: collision(squareWalkmesh(1))
    });

    expect(result.seams[0]).toMatchObject({
      wokGeometricStatus: "discontinuous",
      pathConnectStatus: "missing"
    });
    expect(result.summary).toMatchObject({
      wokGeometricContactSeams: 0,
      wokDiscontinuousSeams: 1,
      geometricContactComponents: 2
    });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "AREA_TILE_WOK_GEOMETRIC_DISCONTINUITY",
        seamId: "left:right"
      })
    );
  });

  it("evaluates bottom seams with the same source-WOK transform contract", () => {
    const contract = collision();
    contract.instances = [
      { ...contract.instances[0]!, instanceId: "top" },
      {
        ...contract.instances[1]!,
        instanceId: "bottom",
        translation: { x: 5, y: 15, z: 0 }
      }
    ];
    const result = buildAreaTileConnectivityDiagnostics({
      width: 1,
      height: 2,
      tiles: [tile("top", 0, 0), tile("bottom", 1, 0)],
      collision: contract
    });
    expect(result.seams).toEqual([
      expect.objectContaining({
        seamId: "top:bottom",
        direction: "bottom",
        wokGeometricStatus: "contact"
      })
    ]);
  });

  it("uses the row-derived boundary for bottom seams below the first row", () => {
    const contract = collision();
    contract.resources = [contract.resources[0]!];
    contract.instances = [0, 1, 2].map((row) => ({
      ...contract.instances[0]!,
      instanceId: `tile-${row}`,
      translation: { x: 5, y: row * 10 + 5, z: 0 }
    }));
    const result = buildAreaTileConnectivityDiagnostics({
      width: 1,
      height: 3,
      tiles: [0, 1, 2].map((row) => tile(`tile-${row}`, row, 0)),
      collision: contract
    });
    expect(result.seams.map((seam) => seam.wokGeometricStatus)).toEqual([
      "contact",
      "contact"
    ]);
    expect(result.summary.geometricContactComponents).toBe(1);
  });

  it.each([
    [rectangleWalkmesh(-4, 4), rectangleWalkmesh(-4, 4), "boundary-geometry-absent-both"],
    [rectangleWalkmesh(-4, 4), squareWalkmesh(), "boundary-geometry-absent-first"],
    [squareWalkmesh(), rectangleWalkmesh(-4, 4), "boundary-geometry-absent-second"],
    [squareWalkmesh(), rectangleWalkmesh(-5, 5, 6, 7), "boundary-geometry-discontinuous"]
  ])("classifies independent WOK boundary absence/discontinuity reasons", (
    firstWalkmesh,
    secondWalkmesh,
    expectedReason
  ) => {
    const contract = collision(secondWalkmesh);
    contract.resources[0] = { ...contract.resources[0]!, walkmesh: firstWalkmesh };
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: contract
    });
    expect(result.seams[0]).toMatchObject({
      wokGeometricStatus: "discontinuous",
      wokReason: expectedReason
    });
  });

  it("requires matching WOK heights at both ends of a positive-length overlap", () => {
    const sloped = squareWalkmesh();
    sloped.nodes[0]!.vertices[0]!.z = 0;
    sloped.nodes[0]!.vertices[3]!.z = 1;
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: collision(sloped)
    });
    expect(result.seams[0]).toMatchObject({
      wokGeometricStatus: "discontinuous",
      wokReason: "boundary-geometry-discontinuous"
    });
  });

  it("interpolates reversed sloped WOK boundary edges consistently", () => {
    const left = squareWalkmesh();
    left.nodes[0]!.vertices[1]!.z = 2;
    left.nodes[0]!.vertices[2]!.z = 4;
    const right = squareWalkmesh();
    right.nodes[0]!.vertices[0]!.z = 2;
    right.nodes[0]!.vertices[3]!.z = 4;
    const contract = collision(right);
    contract.resources[0] = { ...contract.resources[0]!, walkmesh: left };
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: contract
    });
    expect(result.seams[0]).toMatchObject({
      wokGeometricStatus: "contact",
      firstBoundarySegmentCount: 1,
      secondBoundarySegmentCount: 1
    });
  });

  it.each([
    [3, 4],
    [2, 5]
  ])("rejects a WOK slope mismatch at either overlap endpoint", (startZ, endZ) => {
    const left = squareWalkmesh();
    left.nodes[0]!.vertices[1]!.z = 2;
    left.nodes[0]!.vertices[2]!.z = 4;
    const right = squareWalkmesh();
    right.nodes[0]!.vertices[0]!.z = startZ;
    right.nodes[0]!.vertices[3]!.z = endZ;
    const contract = collision(right);
    contract.resources[0] = { ...contract.resources[0]!, walkmesh: left };
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: contract
    });
    expect(result.seams[0]?.wokGeometricStatus).toBe("discontinuous");
  });

  it("does not count zero-length boundary geometry as a seam segment", () => {
    const degenerate = squareWalkmesh();
    degenerate.nodes[0]!.vertices = [
      { x: 5, y: 0, z: 0 },
      { x: 5, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }
    ];
    degenerate.nodes[0]!.faces = [
      { vertexIndices: [0, 1, 2], rawTokens: [0, 1, 2], sourceLineNumber: 10 }
    ];
    const contract = collision();
    contract.resources[0] = { ...contract.resources[0]!, walkmesh: degenerate };
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: contract
    });
    expect(result.seams[0]).toMatchObject({
      wokReason: "boundary-geometry-absent-first",
      firstBoundarySegmentCount: 0
    });
  });

  it("reports absent WOK contracts as unresolved instead of inventing a seam verdict", () => {
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [
        tile("left", 0, 0, { pathNode: undefined }),
        tile("right", 0, 1, { pathNode: undefined })
      ]
    });

    expect(result.seams[0]).toMatchObject({
      pathMetadataStatus: "missing-both",
      pathConnectStatus: "missing",
      wokGeometricStatus: "unresolved",
      wokReason: "collision-contract-missing"
    });
    expect(result.summary).toMatchObject({
      unresolvedSeams: 1,
      geometricContactComponents: 2
    });
  });

  it("keeps a non-ready collision contract distinct from a missing contract", () => {
    const nonReady = collision();
    nonReady.status = "partial";
    nonReady.resources[0] = {
      ...nonReady.resources[0]!,
      walkmesh: { version: "wrong", nodes: [] }
    };
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: nonReady
    });
    expect(result.seams[0]).toMatchObject({
      wokGeometricStatus: "unresolved",
      wokReason: "collision-contract-not-ready"
    });
    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "AREA_TILE_WOK_RESOURCE_INVALID" })
    );
  });

  it("reports a bounded-contract overflow as unresolved resource provenance", () => {
    const contract = collision();
    const resource = contract.resources[0]!;
    contract.resources = Array.from({ length: 4_097 }, (_, index) => ({
      ...resource,
      resourceId: `resource-${index}`
    }));
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: contract
    });
    expect(result.seams[0]).toMatchObject({
      wokGeometricStatus: "unresolved",
      wokReason: "walkmesh-resource-invalid"
    });
  });

  it("fails closed when a collision instance no longer matches its exact tile transform", () => {
    const stale = collision();
    stale.instances[1] = {
      ...stale.instances[1]!,
      translation: { x: 15.25, y: 5, z: 0 }
    };

    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: stale
    });

    expect(result.seams[0]).toMatchObject({
      wokGeometricStatus: "unresolved",
      wokReason: "tile-instance-provenance-invalid"
    });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "AREA_TILE_WOK_INSTANCE_TRANSFORM_MISMATCH",
        tileId: "right"
      })
    );
  });

  it.each([
    ["missing", (contract: AuroraAreaVfxCollisionContract) => contract.instances.pop(), "AREA_TILE_WOK_INSTANCE_MISSING"],
    ["duplicate", (contract: AuroraAreaVfxCollisionContract) => contract.instances.push({ ...contract.instances[1]! }), "AREA_TILE_WOK_INSTANCE_DUPLICATE"],
    ["missing resource", (contract: AuroraAreaVfxCollisionContract) => { contract.instances[1] = { ...contract.instances[1]!, resourceId: "missing" }; }, "AREA_TILE_WOK_RESOURCE_INVALID"],
    ["duplicate resource", (contract: AuroraAreaVfxCollisionContract) => contract.resources.push({ ...contract.resources[1]! }), "AREA_TILE_WOK_RESOURCE_INVALID"]
  ])("fails closed for %s WOK provenance", (_label, mutate, diagnosticCode) => {
    const contract = collision();
    mutate(contract);
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: contract
    });
    expect(result.seams[0]?.wokGeometricStatus).toBe("unresolved");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: diagnosticCode, tileId: "right" })
    );
  });

  it("reports exact missing and duplicate instance messages and left-side invalidity", () => {
    for (const [instances, message] of [
      [collision().instances.slice(1), "Tile left has no exact WOK collision instance."],
      [
        [collision().instances[0]!, { ...collision().instances[0]! }, collision().instances[1]!],
        "Tile left has more than one WOK collision instance."
      ]
    ] as const) {
      const result = buildAreaTileConnectivityDiagnostics({
        width: 2,
        height: 1,
        tiles: [tile("left", 0, 0), tile("right", 0, 1)],
        collision: { ...collision(), instances: [...instances] }
      });
      expect(result.seams[0]).toMatchObject({
        wokGeometricStatus: "unresolved",
        wokReason: "tile-instance-provenance-invalid"
      });
      expect(result.diagnostics).toContainEqual(expect.objectContaining({ message }));
    }
  });

  it("rejects an exact-position WOK instance with a stale tile orientation", () => {
    const contract = collision();
    contract.instances[1] = {
      ...contract.instances[1]!,
      orientationQuarterTurns: 1
    };
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)],
      collision: contract
    });
    expect(result.seams[0]).toMatchObject({
      wokGeometricStatus: "unresolved",
      wokReason: "tile-instance-provenance-invalid"
    });
  });

  it("keeps all four PathNode presence combinations separate from PathConnect", () => {
    const combinations = [
      ["a", "b", "present-both", 1],
      ["a", undefined, "present-first-only", 0],
      [undefined, "b", "present-second-only", 0],
      [undefined, undefined, "missing-both", 0],
      ["", "b", "present-second-only", 0],
      ["a", "", "present-first-only", 0]
    ] as const;
    for (const [firstPath, secondPath, status, presentBothCount] of combinations) {
      const result = buildAreaTileConnectivityDiagnostics({
        width: 2,
        height: 1,
        tiles: [
          tile("left", 0, 0, { pathNode: firstPath }),
          tile("right", 0, 1, { pathNode: secondPath })
        ]
      });
      expect(result.seams[0]?.pathMetadataStatus).toBe(status);
      expect(result.summary.pathMetadataPresentBothSeams).toBe(presentBothCount);
      expect(result.seams[0]?.pathConnectStatus).toBe("missing");
    }
  });

  it.each([
    [0, 1, []],
    [1.5, 1, []],
    [1, 0, []],
    [1, 1.5, []],
    [2, 1, [tile("left", 0, 0)]],
    [2, 1, [tile("left", 0, 0), tile("duplicate", 0, 0)]],
    [2, 1, [tile("left", 0, 0), tile("outside", 0, 2)]],
    [2, 1, [tile("same", 0, 0), tile("same", 0, 1)]]
  ])("reports invalid or non-dense grids", (width, height, tiles) => {
    const result = buildAreaTileConnectivityDiagnostics({ width, height, tiles });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "AREA_TILE_GRID_INCOMPLETE", severity: "error" })
    );
  });

  it("does not emit the grid diagnostic for an exact dense unique grid", () => {
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0), tile("right", 0, 1)]
    });
    expect(result.diagnostics).not.toContainEqual(
      expect.objectContaining({ code: "AREA_TILE_GRID_INCOMPLETE" })
    );
  });

  it("accepts an exact dense non-square and square grid without a grid diagnostic", () => {
    for (const [width, height] of [[3, 2], [2, 2]] as const) {
      const tiles = Array.from({ length: width * height }, (_, index) =>
        tile(`tile-${width}-${height}-${index}`, Math.floor(index / width), index % width)
      );
      const result = buildAreaTileConnectivityDiagnostics({ width, height, tiles });
      expect(result.diagnostics).not.toContainEqual(
        expect.objectContaining({ code: "AREA_TILE_GRID_INCOMPLETE" })
      );
    }
  });

  it("rejects an otherwise dense grid with one additional unique outside tile", () => {
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [
        tile("left", 0, 0),
        tile("right", 0, 1),
        tile("outside", 0, 2)
      ]
    });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "AREA_TILE_GRID_INCOMPLETE" })
    );
  });

  it("returns zero geometric components for an empty grid", () => {
    expect(
      buildAreaTileConnectivityDiagnostics({ width: 0, height: 0, tiles: [] }).summary
        .geometricContactComponents
    ).toBe(0);
  });

  it("rejects stale transforms on every axis while accepting the epsilon boundary", () => {
    for (const [axis, delta, expected] of [
      ["x", 1e-6, "contact"],
      ["x", 1.01e-6, "unresolved"],
      ["y", 0.25, "unresolved"],
      ["z", 0.25, "unresolved"]
    ] as const) {
      const contract = collision();
      const translation = { ...contract.instances[1]!.translation };
      translation[axis] += delta;
      contract.instances[1] = {
        ...contract.instances[1]!,
        translation
      };
      const result = buildAreaTileConnectivityDiagnostics({
        width: 2,
        height: 1,
        tiles: [tile("left", 0, 0), tile("right", 0, 1)],
        collision: contract
      });
      expect(result.seams[0]?.wokGeometricStatus).toBe(expected);
    }
  });

  it("includes tile height in exact WOK instance provenance", () => {
    const contract = collision();
    contract.instances = contract.instances.map((instance) => ({
      ...instance,
      translation: { ...instance.translation, z: 20 }
    }));
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 1,
      tiles: [tile("left", 0, 0, { height: 2 }), tile("right", 0, 1, { height: 2 })],
      collision: contract
    });
    expect(result.seams[0]?.wokGeometricStatus).toBe("contact");
  });

  it("evaluates every internal seam exactly once in stable row-major order", () => {
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 2,
      tiles: [
        tile("a", 0, 0),
        tile("b", 0, 1),
        tile("c", 1, 0),
        tile("d", 1, 1)
      ]
    });

    expect(result.seams.map((seam) => seam.seamId)).toEqual([
      "a:b",
      "a:c",
      "b:d",
      "c:d"
    ]);
    expect(result.summary.expectedInternalSeams).toBe(4);
  });

  it("computes transitive geometric components across a non-trivial seam order", () => {
    const base = collision();
    const resourceTemplate = base.resources[0]!;
    const walkmeshes = [
      squareWalkmesh(),
      rectangleWalkmesh(-4, 5),
      squareWalkmesh(),
      squareWalkmesh()
    ];
    const ids = ["a", "b", "c", "d"];
    base.resources = ids.map((id, index) => ({
      ...resourceTemplate,
      resourceId: `resource-${id}`,
      walkmesh: walkmeshes[index]!
    }));
    base.instances = ids.map((id, index) => ({
      instanceId: id,
      resourceId: `resource-${id}`,
      translation: {
        x: (index % 2) * 10 + 5,
        y: Math.floor(index / 2) * 10 + 5,
        z: 0
      },
      orientationQuarterTurns: 0
    }));
    const result = buildAreaTileConnectivityDiagnostics({
      width: 2,
      height: 2,
      tiles: ids.map((id, index) => tile(id, Math.floor(index / 2), index % 2)),
      collision: base
    });
    expect(result.seams.map((seam) => seam.wokGeometricStatus)).toEqual([
      "discontinuous",
      "contact",
      "contact",
      "contact"
    ]);
    expect(result.summary.geometricContactComponents).toBe(1);
  });

  it("uses the column-derived boundary for right seams beyond the first column", () => {
    const contract = collision();
    contract.resources = [contract.resources[0]!];
    contract.instances = [0, 1, 2].map((col) => ({
      ...contract.instances[0]!,
      instanceId: `tile-${col}`,
      translation: { x: col * 10 + 5, y: 5, z: 0 }
    }));
    const result = buildAreaTileConnectivityDiagnostics({
      width: 3,
      height: 1,
      tiles: [0, 1, 2].map((col) => tile(`tile-${col}`, 0, col)),
      collision: contract
    });
    expect(result.seams.map((seam) => seam.wokGeometricStatus)).toEqual([
      "contact",
      "contact"
    ]);
  });
});
