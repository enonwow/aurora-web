import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const options = parseArgs(process.argv.slice(2));
const framePath = path.resolve(requiredOption(options, "frame"));
const outPath = path.resolve(options.out ?? framePath.replace(/\.frame\.json$/i, ".comparison.json"));
const frame = JSON.parse(fs.readFileSync(framePath, "utf8"));
const snapshot = options.snapshot
  ? JSON.parse(fs.readFileSync(path.resolve(options.snapshot), "utf8"))
  : null;
const screenshotPath = path.resolve(path.dirname(framePath), frame.screenshot);
const png = readPngRgba(screenshotPath);
const analysis = analyzeCapture(png, frame, snapshot);

fs.writeFileSync(outPath, `${JSON.stringify(analysis, null, 2)}\n`);
console.log(JSON.stringify(analysis, null, 2));

function analyzeCapture(png, frame, snapshot) {
  const canvasRegion = {
    x0: 0,
    y0: 0,
    x1: Math.floor(png.width * 0.7),
    y1: png.height
  };
  const mask = new Uint8Array(png.width * png.height);
  let objectPixels = 0;
  let sumX = 0;
  let sumY = 0;
  let minX = png.width;
  let minY = png.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = canvasRegion.y0; y < canvasRegion.y1; y += 1) {
    for (let x = canvasRegion.x0; x < canvasRegion.x1; x += 1) {
      const offset = (y * png.width + x) * 4;
      const r = png.rgba[offset];
      const g = png.rgba[offset + 1];
      const b = png.rgba[offset + 2];
      const a = png.rgba[offset + 3];
      if (isVfxObjectPixel(r, g, b, a)) {
        const index = y * png.width + x;
        mask[index] = 1;
        objectPixels += 1;
        sumX += x;
        sumY += y;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  const components = findConnectedComponents(mask, png.width, png.height)
    .filter((component) => component.pixelCount >= 16)
    .sort((a, b) => b.pixelCount - a.pixelCount);
  const bounds =
    objectPixels > 0
      ? { x0: minX, y0: minY, x1: maxX, y1: maxY }
      : { x0: null, y0: null, x1: null, y1: null };
  const boundsArea =
    objectPixels > 0 ? Math.max(1, (maxX - minX + 1) * (maxY - minY + 1)) : 0;
  const drawParticles = Number(frame.domStatus?.drawParticles ?? 0);
  const comparisonResult =
    frame.domStatus?.canvasNonblank === "true" &&
    objectPixels > 0 &&
    components.length >= Math.min(drawParticles, 1)
      ? "local-structural-visible"
      : "local-structural-failed";
  const contractChecks = snapshot ? buildContractChecks({ frame, snapshot, components, objectPixels }) : null;

  return {
    version: "aurora-vfx-local-structural-comparison/v1",
    comparedAt: new Date().toISOString(),
    oracle: "render-contract-local-diagnostic",
    comparisonResult,
    canonicalParityPromoted: false,
    frameArtifact: framePath,
    screenshot: screenshotPath,
    fixtureId: frame.fixtureId,
    timeSeconds: frame.timeSeconds,
    seed: frame.seed,
    sourceDomStatus: frame.domStatus,
    image: {
      width: png.width,
      height: png.height,
      canvasRegion,
      ignoredRightUiPanel: true
    },
    metrics: {
      objectPixels,
      bounds,
      boundsArea,
      occupancyRatio: boundsArea > 0 ? round(objectPixels / boundsArea, 6) : 0,
      centroid:
        objectPixels > 0
          ? { x: round(sumX / objectPixels, 3), y: round(sumY / objectPixels, 3) }
          : { x: null, y: null },
      connectedComponentCount: components.length,
      largestComponents: components.slice(0, 12)
    },
    disproofChecks: {
      canvasNonblankMatchesDom: frame.domStatus?.canvasNonblank === "true" && objectPixels > 0,
      drawParticleCountMatchesDom: drawParticles === Number(frame.domStatus?.drawParticles ?? 0),
      hasVisibleParticleClusters: components.length > 0,
      ...(contractChecks ? { renderContractMatchesCapture: contractChecks.result === "passed" } : {}),
      localOnlyNotCanonical: true
    },
    contractChecks,
    notes: [
      "This local structural comparison is diagnostic only and cannot promote retail parity.",
      "The pixel mask ignores the right-side UI/status panel and counts saturated/bright VFX pixels in the canvas region."
    ]
  };
}

function buildContractChecks({ frame, snapshot, components, objectPixels }) {
  const renderContract = snapshot.renderContract ?? {};
  const metrics = snapshot.metrics ?? {};
  const drawRecords = Array.isArray(renderContract.drawRecords) ? renderContract.drawRecords : [];
  const drawParticleCount = Number(renderContract.drawParticleCount ?? metrics.drawParticleCount ?? NaN);
  const drawVertexCount = Number(renderContract.drawVertexCount ?? metrics.drawVertexCount ?? NaN);
  const domDrawParticles = Number(frame.domStatus?.drawParticles ?? NaN);
  const domRenderedVertices = Number(frame.domStatus?.renderedVertices ?? NaN);
  const domRenderedRenderOrder = Number(frame.domStatus?.renderedRenderOrder ?? NaN);
  const expectedRenderOrder = Number(renderContract.renderOrder?.value ?? NaN);
  const domRenderedRenderMode = normalizeString(frame.domStatus?.renderedRenderMode);
  const domRenderedBlendMode = normalizeString(frame.domStatus?.renderedBlendMode);
  const domRenderedRenderModeRawToken = normalizeString(frame.domStatus?.renderedRenderModeRawToken);
  const domRenderedBlendModeRawToken = normalizeString(frame.domStatus?.renderedBlendModeRawToken);
  const domRenderedBlendModeNumber = Number(frame.domStatus?.renderedBlendModeNumber ?? NaN);
  const domRenderedDiagnosticCodes = readStringArray(frame.domStatus?.renderedDiagnosticCodes);
  const expectedDiagnosticCodes = Array.isArray(metrics.diagnosticCodes)
    ? metrics.diagnosticCodes.filter((entry) => typeof entry === "string").sort()
    : [];
  const expectedRenderMode = normalizeString(renderContract.renderMode?.enum);
  const expectedBlendMode = normalizeString(renderContract.blendMode?.enum);
  const expectedRenderModeRawToken = normalizeString(renderContract.renderMode?.rawToken);
  const expectedBlendModeRawToken = normalizeString(renderContract.blendMode?.rawToken);
  const expectedBlendModeNumber = Number(renderContract.blendMode?.modeNumber ?? NaN);
  const domRenderedAtlasFrames = readNumberArray(frame.domStatus?.renderedAtlasFrames);
  const expectedAtlasFrames = drawRecords
    .map((record) => record.atlasUv?.frameIndex)
    .filter((frameIndex) => typeof frameIndex === "number" && Number.isFinite(frameIndex));
  const domRenderedAtlasUvU0 = readNumberArray(frame.domStatus?.renderedAtlasUvU0);
  const domRenderedAtlasUvV0 = readNumberArray(frame.domStatus?.renderedAtlasUvV0);
  const domRenderedAtlasUvU1 = readNumberArray(frame.domStatus?.renderedAtlasUvU1);
  const domRenderedAtlasUvV1 = readNumberArray(frame.domStatus?.renderedAtlasUvV1);
  const expectedAtlasUvU0 = drawRecords
    .map((record) => record.atlasUv?.u0)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedAtlasUvV0 = drawRecords
    .map((record) => record.atlasUv?.v0)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedAtlasUvU1 = drawRecords
    .map((record) => record.atlasUv?.u1)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedAtlasUvV1 = drawRecords
    .map((record) => record.atlasUv?.v1)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const domRenderedDrawRecordIds = readStringArray(frame.domStatus?.renderedDrawRecordIds);
  const expectedDrawRecordIds = drawRecords
    .map((record) => record.drawRecordId)
    .filter((drawRecordId) => typeof drawRecordId === "string" && drawRecordId.length > 0);
  const domRenderedEmitterNodeNames = readStringArray(frame.domStatus?.renderedEmitterNodeNames);
  const expectedEmitterNodeNames = drawRecords
    .map((record) => record.emitterNodeName ?? "")
    .filter((emitterNodeName) => typeof emitterNodeName === "string" && emitterNodeName.length > 0);
  const domRenderedDrawRecordLanes = readStringArray(frame.domStatus?.renderedDrawRecordLanes);
  const expectedDrawRecordLanes = drawRecords
    .map((record) => record.lane)
    .filter((lane) => typeof lane === "string" && lane.length > 0);
  const domRenderedParticleIds = readNumberArray(frame.domStatus?.renderedParticleIds);
  const expectedParticleIds = drawRecords
    .map((record) => record.particleId)
    .filter((particleId) => typeof particleId === "number" && Number.isFinite(particleId));
  const domRenderedParticleIndexes = readNumberArray(frame.domStatus?.renderedParticleIndexes);
  const expectedParticleIndexes = drawRecords
    .map((record) => record.particleIndex)
    .filter((particleIndex) => typeof particleIndex === "number" && Number.isFinite(particleIndex));
  const domRenderedPositionX = readNumberArray(frame.domStatus?.renderedPositionX);
  const domRenderedPositionY = readNumberArray(frame.domStatus?.renderedPositionY);
  const domRenderedPositionZ = readNumberArray(frame.domStatus?.renderedPositionZ);
  const domRenderedVelocityX = readNumberArray(frame.domStatus?.renderedVelocityX);
  const domRenderedVelocityY = readNumberArray(frame.domStatus?.renderedVelocityY);
  const domRenderedVelocityZ = readNumberArray(frame.domStatus?.renderedVelocityZ);
  const domRenderedColorR = readNumberArray(frame.domStatus?.renderedColorR);
  const domRenderedColorG = readNumberArray(frame.domStatus?.renderedColorG);
  const domRenderedColorB = readNumberArray(frame.domStatus?.renderedColorB);
  const domRenderedParticleSizeX = readNumberArray(frame.domStatus?.renderedParticleSizeX);
  const domRenderedParticleSizeY = readNumberArray(frame.domStatus?.renderedParticleSizeY);
  const domRenderedAlpha = readNumberArray(frame.domStatus?.renderedAlpha);
  const expectedVelocityX = drawRecords
    .map((record) => record.velocity?.x)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedVelocityY = drawRecords
    .map((record) => record.velocity?.y)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedVelocityZ = drawRecords
    .map((record) => record.velocity?.z)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedColorR = drawRecords
    .map((record) => record.color?.r)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedColorG = drawRecords
    .map((record) => record.color?.g)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedColorB = drawRecords
    .map((record) => record.color?.b)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedParticleSizeX = drawRecords
    .map((record) => record.size?.x)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedParticleSizeY = drawRecords
    .map((record) => record.size?.y)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedAlpha = drawRecords
    .map((record) => record.alpha)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedPositionX = drawRecords
    .map((record) => record.position?.x)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedPositionY = drawRecords
    .map((record) => record.position?.y)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const expectedPositionZ = drawRecords
    .map((record) => record.position?.z)
    .filter((entry) => typeof entry === "number" && Number.isFinite(entry));
  const domRenderedRecordVerticesPerParticle = readNumberArray(
    frame.domStatus?.renderedRecordVerticesPerParticle
  );
  const expectedRecordVerticesPerParticle = drawRecords
    .map((record) => record.verticesPerParticle)
    .filter((verticesPerParticle) => typeof verticesPerParticle === "number" && Number.isFinite(verticesPerParticle));
  const domRenderedPltLayers = readStringArray(frame.domStatus?.renderedPltLayers);
  const expectedPltLayers = drawRecords
    .map((record) => record.pltLayer ?? record.atlasProvenance?.pltLayer)
    .filter((pltLayer) => typeof pltLayer === "string" && pltLayer.length > 0);
  const domRenderedPltLayerColorSources = readStringArray(frame.domStatus?.renderedPltLayerColorSources);
  const expectedPltLayerColorSources = drawRecords
    .map((record) => record.pltLayerColorSource ?? record.atlasProvenance?.pltLayerColorSource)
    .filter((pltLayerColorSource) => typeof pltLayerColorSource === "string" && pltLayerColorSource.length > 0);
  const expectedAtlasFrameStats = readAtlasFrameStats(expectedAtlasFrames);
  const expectedColorStats = readColorStats(drawRecords);
  const expectedAlphaStats = readNumberFieldStats(drawRecords, "alpha");
  const expectedParticleSizeStats = readParticleSizeStats(drawRecords);
  const expectedAtlasUvStats = readAtlasUvStats(drawRecords);
  const expectedPositionStats = readPositionStats(drawRecords);
  const domRenderedGeometry = readDomRenderedGeometry(frame);
  const expectedVerticesPerParticle = Number(renderContract.verticesPerDrawParticle ?? 6);
  const expectedDrawRoute = readExpectedDrawRoute(drawRecords);
  const domRenderedBoundsWidth = Number(frame.domStatus?.renderedBounds?.width ?? NaN);
  const domRenderedBoundsHeight = Number(frame.domStatus?.renderedBounds?.height ?? NaN);
  const domRenderedBoundsDepth = Number(frame.domStatus?.renderedBounds?.depth ?? NaN);
  const domRenderedBoundsCenterX = Number(frame.domStatus?.renderedBounds?.centerX ?? NaN);
  const domRenderedBoundsCenterY = Number(frame.domStatus?.renderedBounds?.centerY ?? NaN);
  const domRenderedBoundsCenterZ = Number(frame.domStatus?.renderedBounds?.centerZ ?? NaN);
  const expectedBounds = readBoundsStats(expectedPositionStats);
  const domRenderedTextureReference = normalizeString(frame.domStatus?.renderedTextureReference);
  const domRenderedTextureStatus = normalizeString(frame.domStatus?.renderedTextureStatus);
  const domTextureProfile = normalizeString(frame.domStatus?.textureProfile);
  const domTextureAtlas = readDomTextureAtlas(frame);
  const expectedFountainAtlas = renderContract.fountainAtlas ?? null;
  const domRenderedMaterial = readDomRenderedMaterial(frame);
  const expectedTextureReference = readExpectedTextureReference(snapshot);
  const expectedMaterial = readExpectedMaterialState(renderContract);
  const drawLane = renderContract.drawLane ?? metrics.drawLane;
  const isChunkLane = drawLane === "chunk_model";
  const checks = {
    fixtureIdMatchesSnapshot:
      !snapshot.fixtureId || !frame.fixtureId || snapshot.fixtureId === frame.fixtureId,
    renderContractDrawParticlesMatchesDom: drawParticleCount === domDrawParticles,
    renderContractDrawRecordsMatchSnapshot:
      drawRecords.length === Number(metrics.drawRecordCount ?? drawRecords.length),
    renderContractDrawVertexCountIsConsistent:
      Number.isFinite(drawVertexCount) &&
      (isChunkLane ? drawVertexCount === 0 : drawVertexCount === drawParticleCount * 6),
    renderContractDrawVerticesMatchDom:
      !Number.isFinite(domRenderedVertices) ||
      (isChunkLane ? domRenderedVertices === 0 : drawVertexCount === domRenderedVertices),
    renderedRenderOrderMatchesContract:
      !Number.isFinite(expectedRenderOrder) ||
      (Number.isFinite(domRenderedRenderOrder) && domRenderedRenderOrder === expectedRenderOrder),
    renderedRenderModeMatchesContract:
      !expectedRenderMode || domRenderedRenderMode === expectedRenderMode,
    renderedBlendModeMatchesContract:
      !expectedBlendMode || domRenderedBlendMode === expectedBlendMode,
    renderedRenderModeRawTokenMatchesContract:
      !expectedRenderModeRawToken || domRenderedRenderModeRawToken === expectedRenderModeRawToken,
    renderedBlendModeRawTokenMatchesContract:
      !expectedBlendModeRawToken || domRenderedBlendModeRawToken === expectedBlendModeRawToken,
    renderedBlendModeNumberMatchesContract:
      !Number.isFinite(expectedBlendModeNumber) ||
      (Number.isFinite(domRenderedBlendModeNumber) &&
        domRenderedBlendModeNumber === expectedBlendModeNumber),
    renderedDiagnosticCodesMatchMetrics:
      expectedDiagnosticCodes.length === 0 ||
      expectedDiagnosticCodes.every((code) => domRenderedDiagnosticCodes.includes(code)),
    renderedAtlasFramesMatchContract:
      isChunkLane ||
      (expectedAtlasFrames.length === drawRecords.length &&
        arraysEqual(domRenderedAtlasFrames, expectedAtlasFrames)),
    renderedAtlasUvU0MatchesContract:
      isChunkLane ||
      expectedAtlasUvU0.length === 0 ||
      (expectedAtlasUvU0.length === drawRecords.length &&
        arraysApproxEqual(domRenderedAtlasUvU0, expectedAtlasUvU0)),
    renderedAtlasUvV0MatchesContract:
      isChunkLane ||
      expectedAtlasUvV0.length === 0 ||
      (expectedAtlasUvV0.length === drawRecords.length &&
        arraysApproxEqual(domRenderedAtlasUvV0, expectedAtlasUvV0)),
    renderedAtlasUvU1MatchesContract:
      isChunkLane ||
      expectedAtlasUvU1.length === 0 ||
      (expectedAtlasUvU1.length === drawRecords.length &&
        arraysApproxEqual(domRenderedAtlasUvU1, expectedAtlasUvU1)),
    renderedAtlasUvV1MatchesContract:
      isChunkLane ||
      expectedAtlasUvV1.length === 0 ||
      (expectedAtlasUvV1.length === drawRecords.length &&
        arraysApproxEqual(domRenderedAtlasUvV1, expectedAtlasUvV1)),
    renderedAtlasUvRectsMatchContract:
      isChunkLane ||
      expectedAtlasUvU0.length === 0 ||
      (expectedAtlasUvU0.length === drawRecords.length &&
        expectedAtlasUvV0.length === drawRecords.length &&
        expectedAtlasUvU1.length === drawRecords.length &&
        expectedAtlasUvV1.length === drawRecords.length &&
        arraysApproxEqual(domRenderedAtlasUvU0, expectedAtlasUvU0) &&
        arraysApproxEqual(domRenderedAtlasUvV0, expectedAtlasUvV0) &&
        arraysApproxEqual(domRenderedAtlasUvU1, expectedAtlasUvU1) &&
        arraysApproxEqual(domRenderedAtlasUvV1, expectedAtlasUvV1)),
    renderedDrawRecordIdsMatchContract:
      isChunkLane ||
      (expectedDrawRecordIds.length === drawRecords.length &&
        arraysEqual(domRenderedDrawRecordIds, expectedDrawRecordIds)),
    renderedEmitterNodeNamesMatchContract:
      isChunkLane ||
      (expectedEmitterNodeNames.length === drawRecords.length &&
        arraysEqual(domRenderedEmitterNodeNames, expectedEmitterNodeNames)),
    renderedDrawRecordLanesMatchContract:
      isChunkLane ||
      (expectedDrawRecordLanes.length === drawRecords.length &&
        arraysEqual(domRenderedDrawRecordLanes, expectedDrawRecordLanes)),
    renderedParticleIdsMatchContract:
      isChunkLane ||
      (expectedParticleIds.length === drawRecords.length &&
        arraysEqual(domRenderedParticleIds, expectedParticleIds)),
    renderedParticleIndexesMatchContract:
      isChunkLane ||
      (expectedParticleIndexes.length === drawRecords.length &&
        arraysEqual(domRenderedParticleIndexes, expectedParticleIndexes)),
    renderedPositionXMatchesContract:
      isChunkLane ||
      expectedPositionX.length === 0 ||
      (expectedPositionX.length === drawRecords.length &&
        arraysApproxEqual(domRenderedPositionX, expectedPositionX)),
    renderedPositionYMatchesContract:
      isChunkLane ||
      expectedPositionY.length === 0 ||
      (expectedPositionY.length === drawRecords.length &&
        arraysApproxEqual(domRenderedPositionY, expectedPositionY)),
    renderedPositionZMatchesContract:
      isChunkLane ||
      expectedPositionZ.length === 0 ||
      (expectedPositionZ.length === drawRecords.length &&
        arraysApproxEqual(domRenderedPositionZ, expectedPositionZ)),
    renderedPositionVectorsMatchContract:
      isChunkLane ||
      expectedPositionX.length === 0 ||
      (expectedPositionX.length === drawRecords.length &&
        expectedPositionY.length === drawRecords.length &&
        expectedPositionZ.length === drawRecords.length &&
        arraysApproxEqual(domRenderedPositionX, expectedPositionX) &&
        arraysApproxEqual(domRenderedPositionY, expectedPositionY) &&
        arraysApproxEqual(domRenderedPositionZ, expectedPositionZ)),
    renderedVelocityXMatchesContract:
      isChunkLane ||
      expectedVelocityX.length === 0 ||
      (expectedVelocityX.length === drawRecords.length &&
        arraysApproxEqual(domRenderedVelocityX, expectedVelocityX)),
    renderedVelocityYMatchesContract:
      isChunkLane ||
      expectedVelocityY.length === 0 ||
      (expectedVelocityY.length === drawRecords.length &&
        arraysApproxEqual(domRenderedVelocityY, expectedVelocityY)),
    renderedVelocityZMatchesContract:
      isChunkLane ||
      expectedVelocityZ.length === 0 ||
      (expectedVelocityZ.length === drawRecords.length &&
        arraysApproxEqual(domRenderedVelocityZ, expectedVelocityZ)),
    renderedVelocityVectorsMatchContract:
      isChunkLane ||
      expectedVelocityX.length === 0 ||
      (expectedVelocityX.length === drawRecords.length &&
        expectedVelocityY.length === drawRecords.length &&
        expectedVelocityZ.length === drawRecords.length &&
        arraysApproxEqual(domRenderedVelocityX, expectedVelocityX) &&
        arraysApproxEqual(domRenderedVelocityY, expectedVelocityY) &&
        arraysApproxEqual(domRenderedVelocityZ, expectedVelocityZ)),
    renderedColorRMatchesContract:
      isChunkLane ||
      expectedColorR.length === 0 ||
      (expectedColorR.length === drawRecords.length &&
        arraysApproxEqual(domRenderedColorR, expectedColorR)),
    renderedColorGMatchesContract:
      isChunkLane ||
      expectedColorG.length === 0 ||
      (expectedColorG.length === drawRecords.length &&
        arraysApproxEqual(domRenderedColorG, expectedColorG)),
    renderedColorBMatchesContract:
      isChunkLane ||
      expectedColorB.length === 0 ||
      (expectedColorB.length === drawRecords.length &&
        arraysApproxEqual(domRenderedColorB, expectedColorB)),
    renderedColorVectorsMatchContract:
      isChunkLane ||
      expectedColorR.length === 0 ||
      (expectedColorR.length === drawRecords.length &&
        expectedColorG.length === drawRecords.length &&
        expectedColorB.length === drawRecords.length &&
        arraysApproxEqual(domRenderedColorR, expectedColorR) &&
        arraysApproxEqual(domRenderedColorG, expectedColorG) &&
        arraysApproxEqual(domRenderedColorB, expectedColorB)),
    renderedParticleSizeXMatchesContract:
      isChunkLane ||
      expectedParticleSizeX.length === 0 ||
      (expectedParticleSizeX.length === drawRecords.length &&
        arraysApproxEqual(domRenderedParticleSizeX, expectedParticleSizeX)),
    renderedParticleSizeYMatchesContract:
      isChunkLane ||
      expectedParticleSizeY.length === 0 ||
      (expectedParticleSizeY.length === drawRecords.length &&
        arraysApproxEqual(domRenderedParticleSizeY, expectedParticleSizeY)),
    renderedParticleSizeVectorsMatchContract:
      isChunkLane ||
      expectedParticleSizeX.length === 0 ||
      (expectedParticleSizeX.length === drawRecords.length &&
        expectedParticleSizeY.length === drawRecords.length &&
        arraysApproxEqual(domRenderedParticleSizeX, expectedParticleSizeX) &&
        arraysApproxEqual(domRenderedParticleSizeY, expectedParticleSizeY)),
    renderedAlphaMatchesContract:
      isChunkLane ||
      expectedAlpha.length === 0 ||
      (expectedAlpha.length === drawRecords.length &&
        arraysApproxEqual(domRenderedAlpha, expectedAlpha)),
    renderedRecordVerticesPerParticleMatchContract:
      isChunkLane ||
      (expectedRecordVerticesPerParticle.length === drawRecords.length &&
        arraysEqual(domRenderedRecordVerticesPerParticle, expectedRecordVerticesPerParticle)),
    renderedPltLayersMatchContract:
      isChunkLane ||
      expectedPltLayers.length === 0 ||
      (expectedPltLayers.length === drawRecords.length &&
        arraysEqual(domRenderedPltLayers, expectedPltLayers)),
    renderedPltLayerColorSourcesMatchContract:
      isChunkLane ||
      expectedPltLayerColorSources.length === 0 ||
      (expectedPltLayerColorSources.length === drawRecords.length &&
        arraysEqual(domRenderedPltLayerColorSources, expectedPltLayerColorSources)),
    renderedGeometryNonIndexedDrawArrays:
      isChunkLane || domRenderedGeometry.nonIndexedDrawArrays === "true",
    renderedGeometryIndexedDrawArrays:
      isChunkLane || domRenderedGeometry.indexedDrawArrays === String(expectedDrawRoute.indexed),
    renderedGeometryDrawModeArgumentMatchesContract:
      isChunkLane || domRenderedGeometry.drawModeArgument === expectedDrawRoute.drawModeArgument,
    renderedGeometryDrawModeArgumentSourceMatchesContract:
      isChunkLane ||
      domRenderedGeometry.drawModeArgumentSource === expectedDrawRoute.drawModeArgumentSource,
    renderedGeometryVerticesPerParticleMatchesContract:
      isChunkLane ||
      (Number.isFinite(expectedVerticesPerParticle) &&
        domRenderedGeometry.verticesPerParticle === expectedVerticesPerParticle),
    renderedGeometryAtlasUvSourceMatchesContract:
      isChunkLane || domRenderedGeometry.atlasUvSource === "aurora-particle-draw-record",
    renderedGeometryPositionAttributeMatchesVertexCount:
      isChunkLane ||
      (domRenderedGeometry.positionAttributeCount === drawVertexCount &&
        domRenderedGeometry.positionAttributeItemSize === 3),
    renderedGeometryPositionAttributeRangeMatchesContract:
      isChunkLane ||
      (approxEqual(domRenderedGeometry.positionAttributeXMin, expectedPositionStats.xMin) &&
        approxEqual(domRenderedGeometry.positionAttributeXMax, expectedPositionStats.xMax) &&
        approxEqual(domRenderedGeometry.positionAttributeYMin, expectedPositionStats.yMin) &&
        approxEqual(domRenderedGeometry.positionAttributeYMax, expectedPositionStats.yMax) &&
        approxEqual(domRenderedGeometry.positionAttributeZMin, expectedPositionStats.zMin) &&
        approxEqual(domRenderedGeometry.positionAttributeZMax, expectedPositionStats.zMax)),
    renderedGeometryPositionAttributeUniqueValuesPerRecordMatchContract:
      isChunkLane ||
      (domRenderedGeometry.positionAttributeMinUniqueValuesPerRecord === 4 &&
        domRenderedGeometry.positionAttributeMaxUniqueValuesPerRecord === 4),
    renderedGeometryColorAttributeMatchesVertexCount:
      isChunkLane ||
      (domRenderedGeometry.colorAttributeCount === drawVertexCount &&
        domRenderedGeometry.colorAttributeItemSize === 3),
    renderedGeometryColorAttributeUniqueCountMatchesContract:
      isChunkLane || domRenderedGeometry.colorAttributeUniqueCount === expectedColorStats.uniqueCount,
    renderedGeometryColorAttributeRangeMatchesContract:
      isChunkLane ||
      (approxEqual(domRenderedGeometry.colorAttributeRMin, expectedColorStats.rMin) &&
        approxEqual(domRenderedGeometry.colorAttributeRMax, expectedColorStats.rMax) &&
        approxEqual(domRenderedGeometry.colorAttributeGMin, expectedColorStats.gMin) &&
        approxEqual(domRenderedGeometry.colorAttributeGMax, expectedColorStats.gMax) &&
        approxEqual(domRenderedGeometry.colorAttributeBMin, expectedColorStats.bMin) &&
        approxEqual(domRenderedGeometry.colorAttributeBMax, expectedColorStats.bMax)),
    renderedGeometryColorAttributeUniqueValuesPerRecordMatchContract:
      isChunkLane ||
      (domRenderedGeometry.colorAttributeMinUniqueValuesPerRecord === 1 &&
        domRenderedGeometry.colorAttributeMaxUniqueValuesPerRecord === 1),
    renderedGeometryAlphaAttributeMatchesVertexCount:
      isChunkLane ||
      (domRenderedGeometry.alphaAttributeCount === drawVertexCount &&
        domRenderedGeometry.alphaAttributeItemSize === 1),
    renderedGeometryAlphaAttributeRangeMatchesContract:
      isChunkLane ||
      (approxEqual(domRenderedGeometry.alphaAttributeMin, expectedAlphaStats.min) &&
        approxEqual(domRenderedGeometry.alphaAttributeMax, expectedAlphaStats.max)),
    renderedGeometryAlphaAttributeUniqueValuesPerRecordMatchContract:
      isChunkLane ||
      (domRenderedGeometry.alphaAttributeMinUniqueValuesPerRecord === 1 &&
        domRenderedGeometry.alphaAttributeMaxUniqueValuesPerRecord === 1),
    renderedGeometryParticleSizeAttributeMatchesVertexCount:
      isChunkLane ||
      (domRenderedGeometry.particleSizeAttributeCount === drawVertexCount &&
        domRenderedGeometry.particleSizeAttributeItemSize === 2),
    renderedGeometryParticleSizeAttributeRangeMatchesContract:
      isChunkLane ||
      (approxEqual(domRenderedGeometry.particleSizeAttributeXMin, expectedParticleSizeStats.xMin) &&
        approxEqual(domRenderedGeometry.particleSizeAttributeXMax, expectedParticleSizeStats.xMax) &&
        approxEqual(domRenderedGeometry.particleSizeAttributeYMin, expectedParticleSizeStats.yMin) &&
        approxEqual(domRenderedGeometry.particleSizeAttributeYMax, expectedParticleSizeStats.yMax)),
    renderedGeometryParticleSizeAttributeUniqueValuesPerRecordMatchContract:
      isChunkLane ||
      (domRenderedGeometry.particleSizeAttributeMinUniqueValuesPerRecord === 1 &&
        domRenderedGeometry.particleSizeAttributeMaxUniqueValuesPerRecord === 1),
    renderedGeometryAtlasFrameAttributeMatchesVertexCount:
      isChunkLane ||
      (domRenderedGeometry.atlasFrameAttributeCount === drawVertexCount &&
        domRenderedGeometry.atlasFrameAttributeItemSize === 1),
    renderedGeometryAtlasFrameAttributeSourceMatchesContract:
      isChunkLane ||
      domRenderedGeometry.atlasFrameAttributeSource === "auroraAtlasFrameIndex-buffer-attribute",
    renderedGeometryAtlasFrameAttributeUniqueCountMatchesContract:
      isChunkLane ||
      domRenderedGeometry.atlasFrameAttributeUniqueCount === expectedAtlasFrameStats.uniqueCount,
    renderedGeometryAtlasFrameAttributeRangeMatchesContract:
      isChunkLane ||
      (domRenderedGeometry.atlasFrameAttributeMin === expectedAtlasFrameStats.min &&
        domRenderedGeometry.atlasFrameAttributeMax === expectedAtlasFrameStats.max),
    renderedGeometryAtlasFrameAttributeUniqueValuesPerRecordMatchContract:
      isChunkLane ||
      (domRenderedGeometry.atlasFrameAttributeMinUniqueValuesPerRecord === 1 &&
        domRenderedGeometry.atlasFrameAttributeMaxUniqueValuesPerRecord === 1),
    renderedGeometryDrawRecordIndexAttributeMatchesVertexCount:
      isChunkLane ||
      (domRenderedGeometry.drawRecordIndexAttributeCount === drawVertexCount &&
        domRenderedGeometry.drawRecordIndexAttributeItemSize === 1),
    renderedGeometryDrawRecordIndexAttributeSourceMatchesContract:
      isChunkLane ||
      domRenderedGeometry.drawRecordIndexAttributeSource === "auroraDrawRecordIndex-buffer-attribute",
    renderedGeometryDrawRecordIndexAttributeUniqueCountMatchesContract:
      isChunkLane ||
      domRenderedGeometry.drawRecordIndexAttributeUniqueCount === drawRecords.length,
    renderedGeometryDrawRecordIndexAttributeRangeMatchesContract:
      isChunkLane ||
      (domRenderedGeometry.drawRecordIndexAttributeMin === 0 &&
        domRenderedGeometry.drawRecordIndexAttributeMax === drawRecords.length - 1),
    renderedGeometryDrawRecordIndexAttributeVertexBucketSizeMatchesContract:
      isChunkLane ||
      (domRenderedGeometry.drawRecordIndexAttributeMinVerticesPerRecord ===
        expectedVerticesPerParticle &&
        domRenderedGeometry.drawRecordIndexAttributeMaxVerticesPerRecord ===
          expectedVerticesPerParticle),
    renderedGeometryUvAttributeMatchesVertexCount:
      isChunkLane ||
      (domRenderedGeometry.uvAttributeCount === drawVertexCount &&
        domRenderedGeometry.uvAttributeItemSize === 2),
    renderedGeometryUvAttributeRangeMatchesContract:
      isChunkLane ||
      (approxEqual(domRenderedGeometry.uvAttributeUMin, expectedAtlasUvStats.uMin) &&
        approxEqual(domRenderedGeometry.uvAttributeUMax, expectedAtlasUvStats.uMax) &&
        approxEqual(domRenderedGeometry.uvAttributeVMin, expectedAtlasUvStats.vMin) &&
        approxEqual(domRenderedGeometry.uvAttributeVMax, expectedAtlasUvStats.vMax)),
    renderedGeometryUvAttributeUniqueValuesPerRecordMatchContract:
      isChunkLane ||
      (domRenderedGeometry.uvAttributeMinUniqueValuesPerRecord === 4 &&
        domRenderedGeometry.uvAttributeMaxUniqueValuesPerRecord === 4),
    renderedBoundsMatchLane:
      isChunkLane ||
      (Number.isFinite(domRenderedBoundsWidth) &&
        Number.isFinite(domRenderedBoundsHeight) &&
        Number.isFinite(domRenderedBoundsDepth) &&
        domRenderedBoundsWidth > 0 &&
        domRenderedBoundsHeight > 0),
    renderedBoundsCenterFinite:
      isChunkLane ||
      (Number.isFinite(domRenderedBoundsCenterX) &&
        Number.isFinite(domRenderedBoundsCenterY) &&
        Number.isFinite(domRenderedBoundsCenterZ)),
    renderedBoundsMatchContract:
      isChunkLane ||
      (approxEqual(domRenderedBoundsWidth, expectedBounds.width) &&
        approxEqual(domRenderedBoundsHeight, expectedBounds.height) &&
        approxEqual(domRenderedBoundsDepth, expectedBounds.depth) &&
        approxEqual(domRenderedBoundsCenterX, expectedBounds.centerX) &&
        approxEqual(domRenderedBoundsCenterY, expectedBounds.centerY) &&
        approxEqual(domRenderedBoundsCenterZ, expectedBounds.centerZ)),
    renderedTextureReferenceMatchesDependency:
      isChunkLane ||
      !expectedTextureReference ||
      domRenderedTextureReference === expectedTextureReference,
    renderedTextureStatusApplied:
      isChunkLane || domRenderedTextureStatus === "applied",
    renderedTextureProfilePresent:
      isChunkLane || domTextureProfile.length > 0,
    renderedTextureAtlasDimensionsConsistent:
      isChunkLane ||
      (domTextureAtlas.columns > 0 &&
        domTextureAtlas.rows > 0 &&
        domTextureAtlas.cellSize > 0 &&
        domTextureAtlas.cellCount === domTextureAtlas.columns * domTextureAtlas.rows &&
        domTextureAtlas.width === domTextureAtlas.columns * domTextureAtlas.cellSize &&
        domTextureAtlas.height === domTextureAtlas.rows * domTextureAtlas.cellSize),
    renderedTextureAtlasGridMatchesFountainContract:
      isChunkLane ||
      !expectedFountainAtlas ||
      (domTextureAtlas.columns === Number(expectedFountainAtlas.xgrid) &&
        domTextureAtlas.rows === Number(expectedFountainAtlas.ygrid)),
    renderedTextureAtlasCellCountMatchesFountainContract:
      isChunkLane ||
      !expectedFountainAtlas ||
      domTextureAtlas.cellCount === Number(expectedFountainAtlas.xgrid) * Number(expectedFountainAtlas.ygrid),
    renderedMaterialStatusApplied:
      isChunkLane || domRenderedMaterial.status === "applied",
    renderedMaterialTransparentMatchesBlend:
      isChunkLane ||
      domRenderedMaterial.transparent === expectedMaterial.transparent,
    renderedMaterialDepthWriteMatchesBlend:
      isChunkLane ||
      domRenderedMaterial.depthWrite === expectedMaterial.depthWrite,
    renderedMaterialDepthTestEnabled:
      isChunkLane ||
      domRenderedMaterial.depthTest === expectedMaterial.depthTest,
    renderedMaterialAlphaTestMatchesBlend:
      isChunkLane ||
      approxEqual(domRenderedMaterial.alphaTest, expectedMaterial.alphaTest),
    renderedMaterialOpacityIsUnit:
      isChunkLane ||
      approxEqual(domRenderedMaterial.opacity, expectedMaterial.opacity),
    renderedMaterialColorIsWhite:
      isChunkLane ||
      domRenderedMaterial.colorHex === expectedMaterial.colorHex,
    renderedMaterialBlendingMatchesBlend:
      isChunkLane ||
      domRenderedMaterial.blending === expectedMaterial.blending,
    renderedMaterialBlendSrcMatchesBlend:
      isChunkLane ||
      domRenderedMaterial.blendSrc === expectedMaterial.blendSrc,
    renderedMaterialBlendDstMatchesBlend:
      isChunkLane ||
      domRenderedMaterial.blendDst === expectedMaterial.blendDst,
    renderedMaterialBlendEquationMatchesBlend:
      isChunkLane ||
      domRenderedMaterial.blendEquation === expectedMaterial.blendEquation,
    renderedMaterialMapBoundMatchesTextureStatus:
      isChunkLane ||
      (domRenderedTextureStatus === "applied"
        ? domRenderedMaterial.mapBound === "true"
        : domRenderedMaterial.mapBound !== "true"),
    renderedMaterialMapReferenceMatchesTextureReference:
      isChunkLane ||
      !expectedTextureReference ||
      (domRenderedMaterial.mapReference === domRenderedTextureReference &&
        domRenderedMaterial.mapReference === expectedTextureReference),
    renderedMaterialVertexColorsEnabled:
      isChunkLane || domRenderedMaterial.vertexColors === "true",
    renderedMaterialSideDoubleSided:
      isChunkLane || domRenderedMaterial.side === "DoubleSide",
    visibleOutputMatchesLane:
      isChunkLane
        ? objectPixels > 0 && components.length > 0 && drawParticleCount === 0
        : objectPixels > 0 && components.length > 0 && drawParticleCount > 0,
    localOnlyNotCanonical:
      snapshot.canonicalParityPromoted === false &&
      frame.domStatus?.canonicalParityPromoted === "false"
  };

  if (isChunkLane) {
    checks.chunkLaneDoesNotEmitTexturedDrawRecords =
      drawParticleCount === 0 && drawVertexCount === 0 && drawRecords.length === 0;
  } else {
    checks.visibleComponentsWithinDrawParticleBudget =
      components.length > 0 && components.length <= drawParticleCount;
  }

  const failedChecks = Object.entries(checks)
    .filter(([, passed]) => passed !== true)
    .map(([name]) => name);

  return {
    version: "aurora-vfx-local-structural-contract-checks/v1",
    result: failedChecks.length === 0 ? "passed" : "failed",
    fixtureId: snapshot.fixtureId ?? frame.fixtureId,
    drawLane,
    drawParticleCount,
    drawVertexCount,
    drawRecordCount: drawRecords.length,
    domDrawParticles,
    domRenderedVertices: Number.isFinite(domRenderedVertices) ? domRenderedVertices : null,
    domRenderedRenderOrder: Number.isFinite(domRenderedRenderOrder)
      ? domRenderedRenderOrder
      : null,
    expectedRenderOrder: Number.isFinite(expectedRenderOrder) ? expectedRenderOrder : null,
    domRenderedRenderMode,
    expectedRenderMode,
    domRenderedBlendMode,
    expectedBlendMode,
    domRenderedModeRaw: {
      renderModeRawToken: domRenderedRenderModeRawToken,
      expectedRenderModeRawToken,
      blendModeRawToken: domRenderedBlendModeRawToken,
      expectedBlendModeRawToken,
      blendModeNumber: Number.isFinite(domRenderedBlendModeNumber)
        ? domRenderedBlendModeNumber
        : null,
      expectedBlendModeNumber: Number.isFinite(expectedBlendModeNumber)
        ? expectedBlendModeNumber
        : null
    },
    domRenderedDiagnosticCodes,
    expectedDiagnosticCodes,
    domRenderedAtlasFrames,
    expectedAtlasFrames,
    domRenderedAtlasUv: {
      u0: domRenderedAtlasUvU0,
      v0: domRenderedAtlasUvV0,
      u1: domRenderedAtlasUvU1,
      v1: domRenderedAtlasUvV1
    },
    expectedAtlasUv: {
      u0: expectedAtlasUvU0,
      v0: expectedAtlasUvV0,
      u1: expectedAtlasUvU1,
      v1: expectedAtlasUvV1
    },
    domRenderedDrawRecordIds,
    expectedDrawRecordIds,
    domRenderedEmitterNodeNames,
    expectedEmitterNodeNames,
    domRenderedDrawRecordLanes,
    expectedDrawRecordLanes,
    domRenderedParticleIds,
    expectedParticleIds,
    domRenderedParticleIndexes,
    expectedParticleIndexes,
    domRenderedPosition: {
      x: domRenderedPositionX,
      y: domRenderedPositionY,
      z: domRenderedPositionZ
    },
    expectedPosition: {
      x: expectedPositionX,
      y: expectedPositionY,
      z: expectedPositionZ
    },
    domRenderedVelocity: {
      x: domRenderedVelocityX,
      y: domRenderedVelocityY,
      z: domRenderedVelocityZ
    },
    expectedVelocity: {
      x: expectedVelocityX,
      y: expectedVelocityY,
      z: expectedVelocityZ
    },
    domRenderedColor: {
      r: domRenderedColorR,
      g: domRenderedColorG,
      b: domRenderedColorB
    },
    expectedColor: {
      r: expectedColorR,
      g: expectedColorG,
      b: expectedColorB
    },
    domRenderedParticleSize: {
      x: domRenderedParticleSizeX,
      y: domRenderedParticleSizeY
    },
    expectedParticleSize: {
      x: expectedParticleSizeX,
      y: expectedParticleSizeY
    },
    domRenderedAlpha,
    expectedAlpha,
    domRenderedRecordVerticesPerParticle,
    expectedRecordVerticesPerParticle,
    domRenderedPltLayers,
    expectedPltLayers,
    domRenderedPltLayerColorSources,
    expectedPltLayerColorSources,
    domRenderedGeometry: {
      ...domRenderedGeometry,
      expectedVerticesPerParticle: Number.isFinite(expectedVerticesPerParticle)
        ? expectedVerticesPerParticle
        : null,
      expectedIndexedDrawArrays: String(expectedDrawRoute.indexed),
      expectedDrawModeArgument: expectedDrawRoute.drawModeArgument,
      expectedDrawModeArgumentSource: expectedDrawRoute.drawModeArgumentSource,
      expectedAtlasUvSource: isChunkLane ? "" : "aurora-particle-draw-record",
      expectedAttributeCount: isChunkLane ? 0 : drawVertexCount,
      expectedPositionAttributeItemSize: isChunkLane ? 0 : 3,
      expectedPositionAttributeXMin: isChunkLane ? 0 : expectedPositionStats.xMin,
      expectedPositionAttributeXMax: isChunkLane ? 0 : expectedPositionStats.xMax,
      expectedPositionAttributeYMin: isChunkLane ? 0 : expectedPositionStats.yMin,
      expectedPositionAttributeYMax: isChunkLane ? 0 : expectedPositionStats.yMax,
      expectedPositionAttributeZMin: isChunkLane ? 0 : expectedPositionStats.zMin,
      expectedPositionAttributeZMax: isChunkLane ? 0 : expectedPositionStats.zMax,
      expectedPositionAttributeMinUniqueValuesPerRecord: isChunkLane ? 0 : 4,
      expectedPositionAttributeMaxUniqueValuesPerRecord: isChunkLane ? 0 : 4,
      expectedColorAttributeItemSize: isChunkLane ? 0 : 3,
      expectedColorAttributeUniqueCount: isChunkLane ? 0 : expectedColorStats.uniqueCount,
      expectedColorAttributeRMin: isChunkLane ? 0 : expectedColorStats.rMin,
      expectedColorAttributeRMax: isChunkLane ? 0 : expectedColorStats.rMax,
      expectedColorAttributeGMin: isChunkLane ? 0 : expectedColorStats.gMin,
      expectedColorAttributeGMax: isChunkLane ? 0 : expectedColorStats.gMax,
      expectedColorAttributeBMin: isChunkLane ? 0 : expectedColorStats.bMin,
      expectedColorAttributeBMax: isChunkLane ? 0 : expectedColorStats.bMax,
      expectedColorAttributeMinUniqueValuesPerRecord: isChunkLane ? 0 : 1,
      expectedColorAttributeMaxUniqueValuesPerRecord: isChunkLane ? 0 : 1,
      expectedAlphaAttributeItemSize: isChunkLane ? 0 : 1,
      expectedAlphaAttributeMin: isChunkLane ? 0 : expectedAlphaStats.min,
      expectedAlphaAttributeMax: isChunkLane ? 0 : expectedAlphaStats.max,
      expectedAlphaAttributeMinUniqueValuesPerRecord: isChunkLane ? 0 : 1,
      expectedAlphaAttributeMaxUniqueValuesPerRecord: isChunkLane ? 0 : 1,
      expectedParticleSizeAttributeItemSize: isChunkLane ? 0 : 2,
      expectedParticleSizeAttributeXMin: isChunkLane ? 0 : expectedParticleSizeStats.xMin,
      expectedParticleSizeAttributeXMax: isChunkLane ? 0 : expectedParticleSizeStats.xMax,
      expectedParticleSizeAttributeYMin: isChunkLane ? 0 : expectedParticleSizeStats.yMin,
      expectedParticleSizeAttributeYMax: isChunkLane ? 0 : expectedParticleSizeStats.yMax,
      expectedParticleSizeAttributeMinUniqueValuesPerRecord: isChunkLane ? 0 : 1,
      expectedParticleSizeAttributeMaxUniqueValuesPerRecord: isChunkLane ? 0 : 1,
      expectedAtlasFrameAttributeItemSize: isChunkLane ? 0 : 1,
      expectedAtlasFrameAttributeSource: isChunkLane
        ? ""
        : "auroraAtlasFrameIndex-buffer-attribute",
      expectedAtlasFrameAttributeUniqueCount: isChunkLane
        ? 0
        : expectedAtlasFrameStats.uniqueCount,
      expectedAtlasFrameAttributeMin: isChunkLane ? 0 : expectedAtlasFrameStats.min,
      expectedAtlasFrameAttributeMax: isChunkLane ? 0 : expectedAtlasFrameStats.max,
      expectedAtlasFrameAttributeMinUniqueValuesPerRecord: isChunkLane ? 0 : 1,
      expectedAtlasFrameAttributeMaxUniqueValuesPerRecord: isChunkLane ? 0 : 1,
      expectedDrawRecordIndexAttributeItemSize: isChunkLane ? 0 : 1,
      expectedDrawRecordIndexAttributeSource: isChunkLane
        ? ""
        : "auroraDrawRecordIndex-buffer-attribute",
      expectedDrawRecordIndexAttributeUniqueCount: isChunkLane ? 0 : drawRecords.length,
      expectedDrawRecordIndexAttributeMin: 0,
      expectedDrawRecordIndexAttributeMax: isChunkLane ? 0 : drawRecords.length - 1,
      expectedDrawRecordIndexAttributeMinVerticesPerRecord: isChunkLane
        ? 0
        : expectedVerticesPerParticle,
      expectedDrawRecordIndexAttributeMaxVerticesPerRecord: isChunkLane
        ? 0
        : expectedVerticesPerParticle,
      expectedUvAttributeItemSize: isChunkLane ? 0 : 2,
      expectedUvAttributeUMin: isChunkLane ? 0 : expectedAtlasUvStats.uMin,
      expectedUvAttributeUMax: isChunkLane ? 0 : expectedAtlasUvStats.uMax,
      expectedUvAttributeVMin: isChunkLane ? 0 : expectedAtlasUvStats.vMin,
      expectedUvAttributeVMax: isChunkLane ? 0 : expectedAtlasUvStats.vMax,
      expectedUvAttributeMinUniqueValuesPerRecord: isChunkLane ? 0 : 4,
      expectedUvAttributeMaxUniqueValuesPerRecord: isChunkLane ? 0 : 4
    },
    domRenderedBounds:
      Number.isFinite(domRenderedBoundsWidth) && Number.isFinite(domRenderedBoundsHeight)
        ? {
            width: domRenderedBoundsWidth,
            height: domRenderedBoundsHeight,
            depth: Number.isFinite(domRenderedBoundsDepth) ? domRenderedBoundsDepth : null,
            centerX: Number.isFinite(domRenderedBoundsCenterX) ? domRenderedBoundsCenterX : null,
            centerY: Number.isFinite(domRenderedBoundsCenterY) ? domRenderedBoundsCenterY : null,
            centerZ: Number.isFinite(domRenderedBoundsCenterZ) ? domRenderedBoundsCenterZ : null,
            expectedWidth: isChunkLane ? 0 : expectedBounds.width,
            expectedHeight: isChunkLane ? 0 : expectedBounds.height,
            expectedDepth: isChunkLane ? 0 : expectedBounds.depth,
            expectedCenterX: isChunkLane ? 0 : expectedBounds.centerX,
            expectedCenterY: isChunkLane ? 0 : expectedBounds.centerY,
            expectedCenterZ: isChunkLane ? 0 : expectedBounds.centerZ
          }
        : null,
    domRenderedTexture: {
      reference: domRenderedTextureReference,
      status: domRenderedTextureStatus,
      expectedReference: expectedTextureReference,
      profile: domTextureProfile,
      atlas: domTextureAtlas,
      expectedFountainAtlasGrid: expectedFountainAtlas
        ? {
            columns: Number(expectedFountainAtlas.xgrid),
            rows: Number(expectedFountainAtlas.ygrid),
            cellCount: Number(expectedFountainAtlas.xgrid) * Number(expectedFountainAtlas.ygrid)
          }
        : null
    },
    domRenderedMaterial: {
      ...domRenderedMaterial,
      expected: {
        ...expectedMaterial,
        mapBound: isChunkLane ? "false" : "true",
        mapReference: expectedTextureReference,
        vertexColors: isChunkLane ? "false" : "true",
        side: isChunkLane ? "none" : "DoubleSide"
      }
    },
    connectedComponentCount: components.length,
    objectPixels,
    checks,
    failedChecks,
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true
  };
}

function readExpectedTextureReference(snapshot) {
  const edges = Array.isArray(snapshot.dependencyGraph?.edges) ? snapshot.dependencyGraph.edges : [];
  const textureEdge = edges.find((edge) => {
    const edgeType = normalizeString(edge?.edgeType);
    const requestedClass = normalizeString(edge?.requestedResourceClass);
    return edgeType === "texture" || requestedClass === "texture";
  });
  return normalizeString(textureEdge?.requestedRef);
}

function normalizeString(value) {
  return typeof value === "string" ? value : "";
}

function readDomRenderedMaterial(frame) {
  const material = frame.domStatus?.renderedMaterial ?? {};
  return {
    transparent: normalizeBooleanString(material.transparent),
    depthWrite: normalizeBooleanString(material.depthWrite),
    depthTest: normalizeBooleanString(material.depthTest),
    alphaTest: Number.isFinite(Number(material.alphaTest)) ? Number(material.alphaTest) : 0,
    opacity: Number.isFinite(Number(material.opacity)) ? Number(material.opacity) : 0,
    colorHex: normalizeString(material.colorHex).toLowerCase(),
    blending: normalizeString(material.blending),
    blendSrc: normalizeString(material.blendSrc),
    blendDst: normalizeString(material.blendDst),
    blendEquation: normalizeString(material.blendEquation),
    mapBound: normalizeBooleanString(material.mapBound),
    mapReference: normalizeString(material.mapReference),
    vertexColors: normalizeBooleanString(material.vertexColors),
    side: normalizeString(material.side),
    status: normalizeString(material.status)
  };
}

function readDomTextureAtlas(frame) {
  const atlas = frame.domStatus?.textureAtlas ?? {};
  return {
    columns: readFiniteNumber(atlas.columns),
    rows: readFiniteNumber(atlas.rows),
    cellSize: readFiniteNumber(atlas.cellSize),
    cellCount: readFiniteNumber(atlas.cellCount),
    width: readFiniteNumber(atlas.width),
    height: readFiniteNumber(atlas.height)
  };
}

function readDomRenderedGeometry(frame) {
  const geometry = frame.domStatus?.renderedGeometry ?? {};
  return {
    nonIndexedDrawArrays: normalizeBooleanString(geometry.nonIndexedDrawArrays),
    indexedDrawArrays: normalizeBooleanString(geometry.indexedDrawArrays),
    drawModeArgument: Number.isFinite(Number(geometry.drawModeArgument))
      ? Number(geometry.drawModeArgument)
      : 0,
    drawModeArgumentSource: normalizeString(geometry.drawModeArgumentSource),
    verticesPerParticle: Number.isFinite(Number(geometry.verticesPerParticle))
      ? Number(geometry.verticesPerParticle)
      : 0,
    atlasUvSource: normalizeString(geometry.atlasUvSource),
    positionAttributeCount: readFiniteNumber(geometry.positionAttributeCount),
    positionAttributeItemSize: readFiniteNumber(geometry.positionAttributeItemSize),
    positionAttributeXMin: readFiniteNumber(geometry.positionAttributeXMin),
    positionAttributeXMax: readFiniteNumber(geometry.positionAttributeXMax),
    positionAttributeYMin: readFiniteNumber(geometry.positionAttributeYMin),
    positionAttributeYMax: readFiniteNumber(geometry.positionAttributeYMax),
    positionAttributeZMin: readFiniteNumber(geometry.positionAttributeZMin),
    positionAttributeZMax: readFiniteNumber(geometry.positionAttributeZMax),
    positionAttributeMinUniqueValuesPerRecord: readFiniteNumber(
      geometry.positionAttributeMinUniqueValuesPerRecord
    ),
    positionAttributeMaxUniqueValuesPerRecord: readFiniteNumber(
      geometry.positionAttributeMaxUniqueValuesPerRecord
    ),
    colorAttributeCount: readFiniteNumber(geometry.colorAttributeCount),
    colorAttributeItemSize: readFiniteNumber(geometry.colorAttributeItemSize),
    colorAttributeUniqueCount: readFiniteNumber(geometry.colorAttributeUniqueCount),
    colorAttributeRMin: readFiniteNumber(geometry.colorAttributeRMin),
    colorAttributeRMax: readFiniteNumber(geometry.colorAttributeRMax),
    colorAttributeGMin: readFiniteNumber(geometry.colorAttributeGMin),
    colorAttributeGMax: readFiniteNumber(geometry.colorAttributeGMax),
    colorAttributeBMin: readFiniteNumber(geometry.colorAttributeBMin),
    colorAttributeBMax: readFiniteNumber(geometry.colorAttributeBMax),
    colorAttributeMinUniqueValuesPerRecord: readFiniteNumber(
      geometry.colorAttributeMinUniqueValuesPerRecord
    ),
    colorAttributeMaxUniqueValuesPerRecord: readFiniteNumber(
      geometry.colorAttributeMaxUniqueValuesPerRecord
    ),
    alphaAttributeCount: readFiniteNumber(geometry.alphaAttributeCount),
    alphaAttributeItemSize: readFiniteNumber(geometry.alphaAttributeItemSize),
    alphaAttributeMin: readFiniteNumber(geometry.alphaAttributeMin),
    alphaAttributeMax: readFiniteNumber(geometry.alphaAttributeMax),
    alphaAttributeMinUniqueValuesPerRecord: readFiniteNumber(
      geometry.alphaAttributeMinUniqueValuesPerRecord
    ),
    alphaAttributeMaxUniqueValuesPerRecord: readFiniteNumber(
      geometry.alphaAttributeMaxUniqueValuesPerRecord
    ),
    particleSizeAttributeCount: readFiniteNumber(geometry.particleSizeAttributeCount),
    particleSizeAttributeItemSize: readFiniteNumber(geometry.particleSizeAttributeItemSize),
    particleSizeAttributeXMin: readFiniteNumber(geometry.particleSizeAttributeXMin),
    particleSizeAttributeXMax: readFiniteNumber(geometry.particleSizeAttributeXMax),
    particleSizeAttributeYMin: readFiniteNumber(geometry.particleSizeAttributeYMin),
    particleSizeAttributeYMax: readFiniteNumber(geometry.particleSizeAttributeYMax),
    particleSizeAttributeMinUniqueValuesPerRecord: readFiniteNumber(
      geometry.particleSizeAttributeMinUniqueValuesPerRecord
    ),
    particleSizeAttributeMaxUniqueValuesPerRecord: readFiniteNumber(
      geometry.particleSizeAttributeMaxUniqueValuesPerRecord
    ),
    atlasFrameAttributeCount: readFiniteNumber(geometry.atlasFrameAttributeCount),
    atlasFrameAttributeItemSize: readFiniteNumber(geometry.atlasFrameAttributeItemSize),
    atlasFrameAttributeSource: normalizeString(geometry.atlasFrameAttributeSource),
    atlasFrameAttributeUniqueCount: readFiniteNumber(geometry.atlasFrameAttributeUniqueCount),
    atlasFrameAttributeMin: readFiniteNumber(geometry.atlasFrameAttributeMin),
    atlasFrameAttributeMax: readFiniteNumber(geometry.atlasFrameAttributeMax),
    atlasFrameAttributeMinUniqueValuesPerRecord: readFiniteNumber(
      geometry.atlasFrameAttributeMinUniqueValuesPerRecord
    ),
    atlasFrameAttributeMaxUniqueValuesPerRecord: readFiniteNumber(
      geometry.atlasFrameAttributeMaxUniqueValuesPerRecord
    ),
    drawRecordIndexAttributeCount: readFiniteNumber(geometry.drawRecordIndexAttributeCount),
    drawRecordIndexAttributeItemSize: readFiniteNumber(geometry.drawRecordIndexAttributeItemSize),
    drawRecordIndexAttributeSource: normalizeString(geometry.drawRecordIndexAttributeSource),
    drawRecordIndexAttributeUniqueCount: readFiniteNumber(
      geometry.drawRecordIndexAttributeUniqueCount
    ),
    drawRecordIndexAttributeMin: readFiniteNumber(geometry.drawRecordIndexAttributeMin),
    drawRecordIndexAttributeMax: readFiniteNumber(geometry.drawRecordIndexAttributeMax),
    drawRecordIndexAttributeMinVerticesPerRecord: readFiniteNumber(
      geometry.drawRecordIndexAttributeMinVerticesPerRecord
    ),
    drawRecordIndexAttributeMaxVerticesPerRecord: readFiniteNumber(
      geometry.drawRecordIndexAttributeMaxVerticesPerRecord
    ),
    uvAttributeCount: readFiniteNumber(geometry.uvAttributeCount),
    uvAttributeItemSize: readFiniteNumber(geometry.uvAttributeItemSize),
    uvAttributeUMin: readFiniteNumber(geometry.uvAttributeUMin),
    uvAttributeUMax: readFiniteNumber(geometry.uvAttributeUMax),
    uvAttributeVMin: readFiniteNumber(geometry.uvAttributeVMin),
    uvAttributeVMax: readFiniteNumber(geometry.uvAttributeVMax),
    uvAttributeMinUniqueValuesPerRecord: readFiniteNumber(
      geometry.uvAttributeMinUniqueValuesPerRecord
    ),
    uvAttributeMaxUniqueValuesPerRecord: readFiniteNumber(
      geometry.uvAttributeMaxUniqueValuesPerRecord
    )
  };
}

function readColorStats(drawRecords) {
  const colorValues = drawRecords
    .map((record) => record?.color)
    .filter(
      (color) =>
        Number.isFinite(Number(color?.r)) &&
        Number.isFinite(Number(color?.g)) &&
        Number.isFinite(Number(color?.b))
    );
  const colors = colorValues.map(
    (color) =>
      `${Number(color.r).toFixed(6)}:${Number(color.g).toFixed(6)}:${Number(color.b).toFixed(6)}`
  );
  if (colorValues.length === 0) {
    return {
      uniqueCount: 0,
      rMin: 0,
      rMax: 0,
      gMin: 0,
      gMax: 0,
      bMin: 0,
      bMax: 0
    };
  }
  const rValues = colorValues.map((color) => Number(color.r));
  const gValues = colorValues.map((color) => Number(color.g));
  const bValues = colorValues.map((color) => Number(color.b));
  return {
    uniqueCount: new Set(colors).size,
    rMin: Math.min(...rValues),
    rMax: Math.max(...rValues),
    gMin: Math.min(...gValues),
    gMax: Math.max(...gValues),
    bMin: Math.min(...bValues),
    bMax: Math.max(...bValues)
  };
}

function readNumberFieldStats(drawRecords, fieldName) {
  const values = drawRecords
    .map((record) => Number(record?.[fieldName]))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) {
    return { min: 0, max: 0 };
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function readParticleSizeStats(drawRecords) {
  const xStats = readNestedNumberStats(drawRecords, "size", "x");
  const yStats = readNestedNumberStats(drawRecords, "size", "y");
  return {
    xMin: xStats.min,
    xMax: xStats.max,
    yMin: yStats.min,
    yMax: yStats.max
  };
}

function readAtlasUvStats(drawRecords) {
  const uStats = readNestedNumberStats(drawRecords, "atlasUv", "u0");
  const u1Stats = readNestedNumberStats(drawRecords, "atlasUv", "u1");
  const vStats = readNestedNumberStats(drawRecords, "atlasUv", "v0");
  const v1Stats = readNestedNumberStats(drawRecords, "atlasUv", "v1");
  return {
    uMin: Math.min(uStats.min, u1Stats.min),
    uMax: Math.max(uStats.max, u1Stats.max),
    vMin: Math.min(vStats.min, v1Stats.min),
    vMax: Math.max(vStats.max, v1Stats.max)
  };
}

function readPositionStats(drawRecords) {
  const ranges = drawRecords
    .map((record) => {
      const position = record?.position;
      const size = record?.size;
      const x = Number(position?.x);
      const y = Number(position?.y);
      const z = Number(position?.z);
      const sizeX = Number(size?.x);
      const sizeY = Number(size?.y);
      if (
        !Number.isFinite(x) ||
        !Number.isFinite(y) ||
        !Number.isFinite(z) ||
        !Number.isFinite(sizeX) ||
        !Number.isFinite(sizeY)
      ) {
        return null;
      }
      return {
        xMin: x - Math.max(0, sizeX) * 0.5,
        xMax: x + Math.max(0, sizeX) * 0.5,
        yMin: y - Math.max(0, sizeY) * 0.5,
        yMax: y + Math.max(0, sizeY) * 0.5,
        zMin: z,
        zMax: z
      };
    })
    .filter(Boolean);
  if (ranges.length === 0) {
    return { xMin: 0, xMax: 0, yMin: 0, yMax: 0, zMin: 0, zMax: 0 };
  }
  return {
    xMin: Math.min(...ranges.map((range) => range.xMin)),
    xMax: Math.max(...ranges.map((range) => range.xMax)),
    yMin: Math.min(...ranges.map((range) => range.yMin)),
    yMax: Math.max(...ranges.map((range) => range.yMax)),
    zMin: Math.min(...ranges.map((range) => range.zMin)),
    zMax: Math.max(...ranges.map((range) => range.zMax))
  };
}

function readBoundsStats(positionStats) {
  const width = positionStats.xMax - positionStats.xMin;
  const height = positionStats.yMax - positionStats.yMin;
  const depth = positionStats.zMax - positionStats.zMin;
  return {
    width,
    height,
    depth,
    centerX: positionStats.xMin + width * 0.5,
    centerY: positionStats.yMin + height * 0.5,
    centerZ: positionStats.zMin + depth * 0.5
  };
}

function readNestedNumberStats(drawRecords, objectFieldName, numberFieldName) {
  const values = drawRecords
    .map((record) => Number(record?.[objectFieldName]?.[numberFieldName]))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) {
    return { min: 0, max: 0 };
  }
  return {
    min: Math.min(...values),
    max: Math.max(...values)
  };
}

function readAtlasFrameStats(frameIndexes) {
  if (!Array.isArray(frameIndexes) || frameIndexes.length === 0) {
    return {
      uniqueCount: 0,
      min: 0,
      max: 0
    };
  }
  return {
    uniqueCount: new Set(frameIndexes).size,
    min: Math.min(...frameIndexes),
    max: Math.max(...frameIndexes)
  };
}

function readExpectedDrawRoute(drawRecords) {
  const firstRoute = drawRecords.find((record) => record?.drawRoute)?.drawRoute ?? {};
  return {
    indexed: firstRoute.indexed === true,
    drawModeArgument: Number.isFinite(Number(firstRoute.drawModeArgument))
      ? Number(firstRoute.drawModeArgument)
      : 3,
    drawModeArgumentSource:
      normalizeString(firstRoute.drawModeArgumentSource) || "aurora-draw-wrapper-mode-arg3"
  };
}

function readNumberArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry) => typeof entry === "number" && Number.isFinite(entry));
}

function readStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry) => typeof entry === "string" && entry.length > 0);
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function arraysApproxEqual(left, right) {
  return left.length === right.length && left.every((entry, index) => approxEqual(entry, right[index]));
}

function normalizeBooleanString(value) {
  if (value === true || value === "true") {
    return "true";
  }
  if (value === false || value === "false") {
    return "false";
  }
  return "";
}

function readFiniteNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function readExpectedMaterialState(renderContract) {
  const blendMode = normalizeString(renderContract.blendMode?.enum);
  return {
    transparent: blendMode === "punch_through" ? "false" : "true",
    depthWrite: blendMode === "punch_through" ? "true" : "false",
    depthTest: "true",
    alphaTest: blendMode === "punch_through" ? 0.5 : 0,
    opacity: 1,
    colorHex: "#ffffff",
    blending: blendMode === "normal" || blendMode === "punch_through" ? "normal" : "custom",
    blendSrc: "SrcAlphaFactor",
    blendDst: blendMode === "normal" || blendMode === "punch_through"
      ? "OneMinusSrcAlphaFactor"
      : "OneFactor",
    blendEquation: "AddEquation"
  };
}

function approxEqual(left, right, epsilon = 0.000001) {
  return Math.abs(left - right) <= epsilon;
}

function isVfxObjectPixel(r, g, b, a) {
  if (a < 16) {
    return false;
  }
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return max >= 72 && luminance >= 52 && max - min >= 18;
}

function findConnectedComponents(mask, width, height) {
  const visited = new Uint8Array(mask.length);
  const components = [];
  const queue = [];
  const directions = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1]
  ];

  for (let start = 0; start < mask.length; start += 1) {
    if (!mask[start] || visited[start]) {
      continue;
    }
    visited[start] = 1;
    queue.length = 0;
    queue.push(start);
    let pixelCount = 0;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      const x = index % width;
      const y = Math.floor(index / width);
      pixelCount += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      for (const [dx, dy] of directions) {
        const nextX = x + dx;
        const nextY = y + dy;
        if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) {
          continue;
        }
        const nextIndex = nextY * width + nextX;
        if (mask[nextIndex] && !visited[nextIndex]) {
          visited[nextIndex] = 1;
          queue.push(nextIndex);
        }
      }
    }
    components.push({
      pixelCount,
      bounds: { x0: minX, y0: minY, x1: maxX, y1: maxY },
      centroid: {
        x: round((minX + maxX) / 2, 3),
        y: round((minY + maxY) / 2, 3)
      }
    });
  }
  return components;
}

function readPngRgba(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error(`${filePath} is not a PNG file.`);
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}.`);
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idatChunks));
  const stride = width * bytesPerPixel;
  const unfiltered = Buffer.alloc(height * stride);
  let rawOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset++];
    const rowOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset++];
      const left = x >= bytesPerPixel ? unfiltered[rowOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? unfiltered[rowOffset + x - stride] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? unfiltered[rowOffset + x - stride - bytesPerPixel] : 0;
      unfiltered[rowOffset + x] = unfilterByte(filter, value, left, up, upLeft);
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let index = 0, source = 0, target = 0; index < width * height; index += 1) {
    rgba[target++] = unfiltered[source++];
    rgba[target++] = unfiltered[source++];
    rgba[target++] = unfiltered[source++];
    rgba[target++] = colorType === 6 ? unfiltered[source++] : 255;
  }
  return { width, height, rgba };
}

function unfilterByte(filter, value, left, up, upLeft) {
  if (filter === 0) {
    return value;
  }
  if (filter === 1) {
    return (value + left) & 0xff;
  }
  if (filter === 2) {
    return (value + up) & 0xff;
  }
  if (filter === 3) {
    return (value + Math.floor((left + up) / 2)) & 0xff;
  }
  if (filter === 4) {
    return (value + paethPredictor(left, up, upLeft)) & 0xff;
  }
  throw new Error(`Unsupported PNG filter ${filter}.`);
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }
  return upDistance <= upLeftDistance ? up : upLeft;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = value;
      index += 1;
    }
  }
  return parsed;
}

function requiredOption(options, key) {
  const value = options[key];
  if (!value) {
    throw new Error(`Missing required --${key} option.`);
  }
  return value;
}

function round(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}
