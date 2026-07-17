import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultOutPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-99/vfx-analyze-capture-contract-checks.json"
);

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);
const artifactDir = path.dirname(outPath);
fs.mkdirSync(artifactDir, { recursive: true });

const fixture = createFixtureArtifacts(artifactDir);
const cases = [
  runAnalyzerCase({
    caseId: "matching-contract-checks-pass",
    framePath: fixture.framePath,
    snapshotPath: fixture.matchingSnapshotPath,
    outPath: path.join(artifactDir, "matching-contract-checks.comparison.json"),
    expectResult: "passed",
    expectedFailedChecks: []
  }),
  runAnalyzerCase({
    caseId: "draw-particle-mismatch-fails",
    framePath: fixture.framePath,
    snapshotPath: fixture.mismatchSnapshotPath,
    outPath: path.join(artifactDir, "draw-particle-mismatch.comparison.json"),
    expectResult: "failed",
    expectedFailedChecks: [
      "renderContractDrawParticlesMatchesDom",
      "renderContractDrawVerticesMatchDom",
      "renderedAtlasFramesMatchContract",
      "renderedAtlasUvU0MatchesContract",
      "renderedAtlasUvV0MatchesContract",
      "renderedAtlasUvU1MatchesContract",
      "renderedAtlasUvV1MatchesContract",
      "renderedAtlasUvRectsMatchContract",
      "renderedDrawRecordIdsMatchContract",
      "renderedEmitterNodeNamesMatchContract",
      "renderedDrawRecordLanesMatchContract",
      "renderedParticleIdsMatchContract",
      "renderedParticleIndexesMatchContract",
      "renderedPositionXMatchesContract",
      "renderedPositionYMatchesContract",
      "renderedPositionZMatchesContract",
      "renderedPositionVectorsMatchContract",
      "renderedVelocityXMatchesContract",
      "renderedVelocityYMatchesContract",
      "renderedVelocityZMatchesContract",
      "renderedVelocityVectorsMatchContract",
      "renderedColorRMatchesContract",
      "renderedColorGMatchesContract",
      "renderedColorBMatchesContract",
      "renderedColorVectorsMatchContract",
      "renderedParticleSizeXMatchesContract",
      "renderedParticleSizeYMatchesContract",
      "renderedParticleSizeVectorsMatchContract",
      "renderedAlphaMatchesContract",
      "renderedRecordVerticesPerParticleMatchContract",
      "renderedPltLayersMatchContract",
      "renderedPltLayerColorSourcesMatchContract",
      "renderedGeometryPositionAttributeMatchesVertexCount",
      "renderedGeometryPositionAttributeRangeMatchesContract",
      "renderedGeometryColorAttributeMatchesVertexCount",
      "renderedGeometryColorAttributeUniqueCountMatchesContract",
      "renderedGeometryColorAttributeRangeMatchesContract",
      "renderedGeometryAlphaAttributeMatchesVertexCount",
      "renderedGeometryAlphaAttributeRangeMatchesContract",
      "renderedGeometryParticleSizeAttributeMatchesVertexCount",
      "renderedGeometryParticleSizeAttributeRangeMatchesContract",
      "renderedGeometryAtlasFrameAttributeMatchesVertexCount",
      "renderedGeometryAtlasFrameAttributeUniqueCountMatchesContract",
      "renderedGeometryAtlasFrameAttributeRangeMatchesContract",
      "renderedGeometryDrawRecordIndexAttributeMatchesVertexCount",
      "renderedGeometryDrawRecordIndexAttributeUniqueCountMatchesContract",
      "renderedGeometryDrawRecordIndexAttributeRangeMatchesContract",
      "renderedGeometryUvAttributeMatchesVertexCount",
      "renderedGeometryUvAttributeRangeMatchesContract",
      "renderedBoundsMatchContract"
    ]
  }),
  runAnalyzerCase({
    caseId: "snapshot-optional-backward-compatible",
    framePath: fixture.framePath,
    outPath: path.join(artifactDir, "snapshot-optional.comparison.json"),
    expectContractChecks: null
  })
];

const failedCases = cases.filter((entry) => entry.failedChecks.length > 0);
const report = {
  version: "aurora-vfx-analyze-capture-contract-checks-test/v1",
  generatedAt: new Date().toISOString(),
  artifact: toRepoPath(outPath),
  oracle: "local-analyze-capture-contract-checks-self-test",
  result: failedCases.length === 0 ? "analyze-capture-contract-checks-passed" : "analyze-capture-contract-checks-failed",
  canonicalParityPromoted: false,
  localOnlyNotRetailEvidence: true,
  artifacts: {
    screenshot: toRepoPath(fixture.screenshotPath),
    frame: toRepoPath(fixture.framePath),
    matchingSnapshot: toRepoPath(fixture.matchingSnapshotPath),
    mismatchSnapshot: toRepoPath(fixture.mismatchSnapshotPath)
  },
  summary: {
    caseCount: cases.length,
    passedCaseCount: cases.length - failedCases.length,
    failedCaseCount: failedCases.length,
    failedCheckCount: failedCases.reduce((sum, entry) => sum + entry.failedChecks.length, 0),
    canonicalPromotionAttemptCount: 0
  },
  cases,
  blockers: [
    "retail_capture_required_for_canonical_parity",
    "retail_comparison_required_for_canonical_parity",
    "local_analyzer_contract_checks_are_not_retail_evidence"
  ],
  notes: [
    "This self-test uses synthetic local PNG/frame/snapshot artifacts to verify analyzer contractChecks behavior.",
    "It proves local analyzer regression coverage only and cannot promote canonical parity."
  ]
};

fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      result: report.result,
      report: toRepoPath(outPath),
      summary: report.summary
    },
    null,
    2
  )
);

if (report.result !== "analyze-capture-contract-checks-passed") {
  process.exitCode = 1;
}

function createFixtureArtifacts(artifactDir) {
  const screenshotPath = path.join(artifactDir, "analyzer-contract-check-synthetic.png");
  const framePath = path.join(artifactDir, "analyzer-contract-check-synthetic.frame.json");
  const matchingSnapshotPath = path.join(artifactDir, "analyzer-contract-check-matching.snapshot.json");
  const mismatchSnapshotPath = path.join(artifactDir, "analyzer-contract-check-mismatch.snapshot.json");

  fs.writeFileSync(screenshotPath, createPngRgba(32, 32, (x, y) =>
    x >= 8 && x <= 23 && y >= 8 && y <= 23 ? [255, 64, 32, 255] : [0, 0, 0, 255]
  ));
  fs.writeFileSync(framePath, `${JSON.stringify({
    version: "aurora-vfx-cdp-capture/v1",
    fixtureId: "analyzer-contract-check-synthetic",
    timeSeconds: 0.5,
    seed: 99,
    screenshot: screenshotPath,
    domStatus: {
      fixtureId: "analyzer-contract-check-synthetic",
      renderStatus: "rendered",
      canvasNonblank: "true",
      objectPixels: 256,
      drawParticles: 1,
      renderedVertices: 6,
      renderedRenderOrder: 7,
      renderedRenderMode: "billboard_to_world_z",
      renderedRenderModeRawToken: "Billboard_to_World_Z",
      renderedBlendMode: "normal",
      renderedBlendModeRawToken: "Normal",
      renderedBlendModeNumber: 0,
      renderedDiagnosticCodes: ["VFX_SYNTHETIC_DIAGNOSTIC"],
      renderedAtlasFrames: [0],
      renderedAtlasFrameCount: 1,
      renderedAtlasUvU0: [0.25],
      renderedAtlasUvV0: [0.5],
      renderedAtlasUvU1: [0.5],
      renderedAtlasUvV1: [0.75],
      renderedDrawRecordIds: ["synthetic:0"],
      renderedEmitterNodeNames: ["synthetic_emitter"],
      renderedDrawRecordLanes: ["textured_quad"],
      renderedParticleIds: [100],
      renderedParticleIndexes: [0],
      renderedPositionX: [0],
      renderedPositionY: [0],
      renderedPositionZ: [0.3],
      renderedVelocityX: [0.12],
      renderedVelocityY: [0.16],
      renderedVelocityZ: [0],
      renderedColorR: [1],
      renderedColorG: [0.25],
      renderedColorB: [0.5],
      renderedParticleSizeX: [0.4],
      renderedParticleSizeY: [0.2],
      renderedAlpha: [0.75],
      renderedRecordVerticesPerParticle: [6],
      renderedPltLayers: ["synthetic_layer"],
      renderedPltLayerColorSources: ["synthetic_color_source"],
      renderedGeometry: {
        nonIndexedDrawArrays: "true",
        indexedDrawArrays: "false",
        drawModeArgument: 3,
        drawModeArgumentSource: "aurora-draw-wrapper-mode-arg3",
        verticesPerParticle: 6,
        atlasUvSource: "aurora-particle-draw-record",
        positionAttributeCount: 6,
        positionAttributeItemSize: 3,
        positionAttributeXMin: -0.2,
        positionAttributeXMax: 0.2,
        positionAttributeYMin: -0.1,
        positionAttributeYMax: 0.1,
        positionAttributeZMin: 0.3,
        positionAttributeZMax: 0.3,
        positionAttributeMinUniqueValuesPerRecord: 4,
        positionAttributeMaxUniqueValuesPerRecord: 4,
        colorAttributeCount: 6,
        colorAttributeItemSize: 3,
        colorAttributeUniqueCount: 1,
        colorAttributeRMin: 1,
        colorAttributeRMax: 1,
        colorAttributeGMin: 0.25,
        colorAttributeGMax: 0.25,
        colorAttributeBMin: 0.5,
        colorAttributeBMax: 0.5,
        colorAttributeMinUniqueValuesPerRecord: 1,
        colorAttributeMaxUniqueValuesPerRecord: 1,
        alphaAttributeCount: 6,
        alphaAttributeItemSize: 1,
        alphaAttributeMin: 0.75,
        alphaAttributeMax: 0.75,
        alphaAttributeMinUniqueValuesPerRecord: 1,
        alphaAttributeMaxUniqueValuesPerRecord: 1,
        particleSizeAttributeCount: 6,
        particleSizeAttributeItemSize: 2,
        particleSizeAttributeXMin: 0.4,
        particleSizeAttributeXMax: 0.4,
        particleSizeAttributeYMin: 0.2,
        particleSizeAttributeYMax: 0.2,
        particleSizeAttributeMinUniqueValuesPerRecord: 1,
        particleSizeAttributeMaxUniqueValuesPerRecord: 1,
        atlasFrameAttributeCount: 6,
        atlasFrameAttributeItemSize: 1,
        atlasFrameAttributeSource: "auroraAtlasFrameIndex-buffer-attribute",
        atlasFrameAttributeUniqueCount: 1,
        atlasFrameAttributeMin: 0,
        atlasFrameAttributeMax: 0,
        atlasFrameAttributeMinUniqueValuesPerRecord: 1,
        atlasFrameAttributeMaxUniqueValuesPerRecord: 1,
        drawRecordIndexAttributeCount: 6,
        drawRecordIndexAttributeItemSize: 1,
        drawRecordIndexAttributeSource: "auroraDrawRecordIndex-buffer-attribute",
        drawRecordIndexAttributeUniqueCount: 1,
        drawRecordIndexAttributeMin: 0,
        drawRecordIndexAttributeMax: 0,
        drawRecordIndexAttributeMinVerticesPerRecord: 6,
        drawRecordIndexAttributeMaxVerticesPerRecord: 6,
        uvAttributeCount: 6,
        uvAttributeItemSize: 2,
        uvAttributeUMin: 0.25,
        uvAttributeUMax: 0.5,
        uvAttributeVMin: 0.5,
        uvAttributeVMax: 0.75,
        uvAttributeMinUniqueValuesPerRecord: 4,
        uvAttributeMaxUniqueValuesPerRecord: 4
      },
      renderedBounds: {
        width: 0.4,
        height: 0.2,
        depth: 0,
        centerX: 0,
        centerY: 0,
        centerZ: 0.3
      },
      renderedTextureReference: "fx_canonical_fire",
      renderedTextureStatus: "applied",
      renderedMaterial: {
        transparent: "true",
        depthWrite: "false",
        depthTest: "true",
        alphaTest: 0,
        opacity: 1,
        colorHex: "#ffffff",
        blending: "normal",
        blendSrc: "SrcAlphaFactor",
        blendDst: "OneMinusSrcAlphaFactor",
        blendEquation: "AddEquation",
        mapBound: "true",
        mapReference: "fx_canonical_fire",
        vertexColors: "true",
        side: "DoubleSide",
        status: "applied"
      },
      textureProfile: "synthetic-contract-check",
      textureAtlas: {
        columns: 4,
        rows: 4,
        cellSize: 32,
        cellCount: 16,
        width: 128,
        height: 128
      },
      canonicalParityPromoted: "false"
    }
  }, null, 2)}\n`);
  fs.writeFileSync(matchingSnapshotPath, `${JSON.stringify(snapshot({ drawParticleCount: 1 }), null, 2)}\n`);
  fs.writeFileSync(mismatchSnapshotPath, `${JSON.stringify(snapshot({ drawParticleCount: 2 }), null, 2)}\n`);

  return { screenshotPath, framePath, matchingSnapshotPath, mismatchSnapshotPath };
}

function snapshot({ drawParticleCount }) {
  return {
    version: "aurora-vfx-dev-render-contract-snapshot/v1",
    fixtureId: "analyzer-contract-check-synthetic",
    timeSeconds: 0.5,
    seed: 99,
    canonicalParityPromoted: false,
    metrics: {
      drawLane: "textured_quad",
      drawParticleCount,
      drawVertexCount: drawParticleCount * 6,
      drawRecordCount: drawParticleCount,
      diagnosticCodes: ["VFX_SYNTHETIC_DIAGNOSTIC"]
    },
    dependencyGraph: {
      version: "aurora-vfx-dependency-graph/v1",
      edges: [
        {
          edgeType: "texture",
          requestedResourceClass: "texture",
          requestedRef: "fx_canonical_fire",
          selectedCandidate: {
            resourceKey: "fx_canonical_fire.tga"
          }
        }
      ],
      diagnostics: []
    },
    renderContract: {
      drawLane: "textured_quad",
      renderMode: {
        enum: "billboard_to_world_z",
        rawToken: "Billboard_to_World_Z"
      },
      blendMode: {
        enum: "normal",
        rawToken: "Normal",
        modeNumber: 0
      },
      renderOrder: {
        value: 7,
        rawValue: 7
      },
      drawParticleCount,
      drawVertexCount: drawParticleCount * 6,
      drawRecords: Array.from({ length: drawParticleCount }, (_, index) => ({
        drawRecordId: `synthetic:${index}`,
        emitterNodeName: `synthetic_emitter${index === 0 ? "" : `_${index}`}`,
        lane: "textured_quad",
        particleId: 100 + index,
        particleIndex: index,
        verticesPerParticle: 6,
        pltLayer: index === 0 ? "synthetic_layer" : "synthetic_layer_mismatch",
        pltLayerColorSource:
          index === 0 ? "synthetic_color_source" : "synthetic_color_source_mismatch",
        position: index === 0
          ? { x: 0, y: 0, z: 0.3 }
          : { x: 0.6, y: 0.2, z: 0.1 },
        velocity: index === 0
          ? { x: 0.12, y: 0.16, z: 0 }
          : { x: 0.18, y: -0.04, z: 0.02 },
        color: index === 0
          ? { r: 1, g: 0.25, b: 0.5 }
          : { r: 0.2, g: 0.8, b: 1 },
        alpha: index === 0 ? 0.75 : 0.45,
        size: index === 0 ? { x: 0.4, y: 0.2 } : { x: 0.2, y: 0.6 },
        atlasUv: {
          u0: index === 0 ? 0.25 : 0.5,
          v0: index === 0 ? 0.5 : 0,
          u1: index === 0 ? 0.5 : 0.75,
          v1: index === 0 ? 0.75 : 0.25,
          frameIndex: index
        }
      }))
    }
  };
}

function runAnalyzerCase(input) {
  const args = [
    "scripts/analyze-vfx-capture.mjs",
    "--frame",
    input.framePath,
    "--out",
    input.outPath
  ];
  if (input.snapshotPath) {
    args.splice(3, 0, "--snapshot", input.snapshotPath);
  }

  const result = spawnSync("node", args, {
    cwd: path.join(repoRoot, "backend"),
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024
  });
  const analysis = fs.existsSync(input.outPath)
    ? JSON.parse(fs.readFileSync(input.outPath, "utf8"))
    : null;
  const failedChecks = [];

  if (result.status !== 0) {
    failedChecks.push("analyzer_command_exited_nonzero");
  }
  if (input.expectContractChecks === null) {
    if (analysis?.contractChecks !== null) {
      failedChecks.push("contractChecks_should_be_null_without_snapshot");
    }
  } else {
    if (analysis?.contractChecks?.result !== input.expectResult) {
      failedChecks.push("contractChecks_result_unexpected");
    }
    for (const expected of input.expectedFailedChecks ?? []) {
      if (!analysis?.contractChecks?.failedChecks?.includes(expected)) {
        failedChecks.push(`missing_failed_check:${expected}`);
      }
    }
    for (const unexpected of analysis?.contractChecks?.failedChecks ?? []) {
      if (!(input.expectedFailedChecks ?? []).includes(unexpected)) {
        failedChecks.push(`unexpected_failed_check:${unexpected}`);
      }
    }
  }
  if (analysis?.canonicalParityPromoted !== false) {
    failedChecks.push("canonical_parity_promoted");
  }

  return {
    caseId: input.caseId,
    status: failedChecks.length === 0 ? "passed" : "failed",
    failedChecks,
    artifacts: {
      comparison: toRepoPath(input.outPath),
      ...(input.snapshotPath ? { snapshot: toRepoPath(input.snapshotPath) } : {})
    },
    analyzerExitCode: result.status,
    contractChecks: analysis?.contractChecks ?? null,
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true
  };
}

function createPngRgba(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  let offset = 0;
  for (let y = 0; y < height; y += 1) {
    raw[offset++] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixel(x, y);
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = a;
    }
  }
  return Buffer.concat([
    pngSignature(),
    pngChunk("IHDR", ihdr(width, height)),
    pngChunk("IDAT", zlib.deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function pngSignature() {
  return Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--out") {
      parsed.out = rawArgs[++index];
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/test-vfx-analyze-capture-contract-checks.mjs [--out path]");
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}
