#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const defaultArtifactDir = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-211"
);
const defaultOutPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-catalog-preview-guardrails-report.json"
);

const args = parseArgs(process.argv.slice(2));
const artifactDir = path.resolve(repoRoot, args.artifactDir ?? defaultArtifactDir);
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);

const thresholdPath = path.join(artifactDir, "plc-zlc-o45-catalog-preview-threshold-semantic-check.json");
const framePath = path.join(
  artifactDir,
  "plc-zlc-o45-time-0.32-seed-211-catalog-preview-fixed-visible.frame.json"
);
const canonicalFramePath = path.join(
  artifactDir,
  "plc-zlc-o45-time-0.32-seed-211-canonical-backend-runtime-payload-ready.frame.json"
);
const backendSnapshotPath = path.join(artifactDir, "plc-zlc-o45-backend-process-snapshot.json");

const threshold = readJsonIfPresent(thresholdPath);
const frame = readJsonIfPresent(framePath);
const canonicalFrame = readJsonIfPresent(canonicalFramePath);
const backendSnapshot = readJsonIfPresent(backendSnapshotPath);
const frameJson = frame?.domStatus?.frameJson ?? frame?.domStatus?.devFrameJson ?? {};
const canonicalFrameJson =
  canonicalFrame?.domStatus?.frameJson ?? canonicalFrame?.domStatus?.devFrameJson ?? {};
const frameRoute = frame?.route ?? frame?.finalRoute ?? frame?.requestedRoute ?? null;
const canonicalFrameRoute =
  canonicalFrame?.route ?? canonicalFrame?.finalRoute ?? canonicalFrame?.requestedRoute ?? null;
const screenshotPath = resolveMaybeAbsolute(frame?.screenshot ?? frame?.screenshotPath ?? threshold?.screenshot);
const canonicalScreenshotPath = resolveMaybeAbsolute(
  canonicalFrame?.screenshot ?? canonicalFrame?.screenshotPath
);
const screenshotBytes = screenshotPath && fs.existsSync(screenshotPath) ? fs.statSync(screenshotPath).size : null;
const canonicalScreenshotBytes =
  canonicalScreenshotPath && fs.existsSync(canonicalScreenshotPath)
    ? fs.statSync(canonicalScreenshotPath).size
    : null;

const visualSemanticOracle = {
  version: "aurora-vfx-catalog-preview-guardrail-oracle/v1",
  fixture: "plc_zlc_o45 / zlc_o45 / VFX: Magic Mouth, Flat Anim P* (dobervich)",
  basis: [
    "iteration 211 deterministic /dev/catalog-vfx-preview route evidence",
    "iteration 211 backend process snapshot for templateId=plc_zlc_o45",
    "iteration 211 CDP frame and screenshot artifacts",
    "iteration 211 catalog-equivalent semantic threshold artifact",
    "source-mdl zlc_o45.mdl auroraEmitter Fountain/Lighten payload evidence"
  ],
  expectedShape: "The catalog preview must have visible grid-excluding object pixels for the Magic Mouth source-mdl Fountain flare cluster.",
  motionPath: "The fixed route time=0.32 seed=211 must represent an active Fountain schedule with positive particle count.",
  colorOpacityAlpha: "The source orange-to-yellow color curve and alphaStart > alphaEnd fade must be preserved.",
  blendMaterial: "Normal render mode, Lighten blend mode, transparent material, and either applied fxpa_flare texture or the local visibility fallback must be preserved.",
  textureAtlas: "fxpa_flare texture provenance and backend texture URLs must remain present.",
  lane: "The route must remain the real catalog preview flow for templateId=plc_zlc_o45, not a generic fixture-only surrogate.",
  particleCountOrder: "The source-mdl particle count must remain 10 for the deterministic catalog preview evidence.",
  canonicalThinHost:
    "The backend-canonical proof packet must show the same catalog route selecting the canonical renderer with backend payload ready and the legacy source-MDL emitter overlay suppressed.",
  lifetimeFraming: "Finite emitter bounds must remain in view and grid-excluding pixels must stay above the catalog guard threshold.",
  humanReviewNeeded: {
    required: true,
    missingOracle:
      "Retail runtime/render/capture/comparison evidence for exact zlc_o45 Magic Mouth placement, original fxpa_flare texture appearance, particle timing, Lighten intensity, and framebuffer comparison.",
    blocksCanonicalParity: true
  }
};

const checks = {
  thresholdArtifactPresent: Boolean(threshold),
  frameArtifactPresent: Boolean(frame),
  backendSnapshotPresent: Boolean(backendSnapshot),
  screenshotPresent: Boolean(screenshotPath && fs.existsSync(screenshotPath)),
  screenshotBytesMatchFrame:
    screenshotBytes !== null &&
    Number(frame?.screenshotBytes ?? NaN) === screenshotBytes &&
    Number(threshold?.screenshotBytes ?? NaN) === screenshotBytes,
  routeIsCatalogPreview:
    frameRoute === "http://127.0.0.1:5173/dev/catalog-vfx-preview?templateId=plc_zlc_o45&time=0.32&seed=211" &&
    threshold?.route === frameRoute,
  fixedTemplateTimeSeed:
    frameJson.templateId === "plc_zlc_o45" &&
    frameJson.routeTimeSeconds === 0.32 &&
    frameJson.seed === 211,
  backendSnapshotMatchesCatalogItem:
    backendSnapshot?.templateId === "plc_zlc_o45" &&
    backendSnapshot?.resref === "zlc_o45" &&
    String(backendSnapshot?.name ?? "").includes("Magic Mouth"),
  backendSnapshotCacheRecorded: typeof backendSnapshot?.cache?.key === "string" && backendSnapshot.cache.key.length > 0,
  frameReady: frameJson.status === "ready" && frameJson.renderPackageStatus === "ready",
  canvasNonblank: frameJson.canvasNonblank === true,
  gridHiddenObjectPixelsPositive: Number(frameJson.objectPixelsWithoutGrid ?? 0) > 0,
  gridHiddenObjectPixelsAboveThreshold:
    Number(frameJson.objectPixelsWithoutGrid ?? 0) >= Number(threshold?.objectPixelThreshold ?? 80),
  thresholdPassed: threshold?.passed === true,
  thresholdCanonicalBlocked: threshold?.canonicalParityPromoted === false,
  allThresholdSemanticChecksPass:
    Boolean(threshold?.visualSemanticChecks) &&
    Object.values(threshold.visualSemanticChecks).every((value) => value === true),
  thresholdLocalOnlyNotCanonical: threshold?.visualSemanticChecks?.localOnlyNotCanonical === true,
  humanReviewNeededRecorded:
    threshold?.humanReviewNeeded?.required === true &&
    String(threshold?.humanReviewNeeded?.missingOracle ?? "").includes("retail"),
  sourceMdlPayloadReady: frameJson.sourceMdlPayloadReady === true,
  modelFileName: frameJson.modelFileName === "zlc_o45.mdl",
  textureUrlsPresent: Array.isArray(frameJson.textureUrls) && frameJson.textureUrls.length >= 1,
  emitterNodeGlow: frameJson.emitterSource === "source-mdl" && frameJson.emitterNode === "glow",
  fountainLightenNormal:
    frameJson.emitterType === "Fountain" &&
    frameJson.emitterBlendMode === "Lighten" &&
    frameJson.emitterRenderMode === "Normal",
  emitterTextureFxpaFlare: frameJson.emitterTexture === "fxpa_flare",
  particleCountTen: frameJson.particleCount === 10,
  textureStatusApplied: frameJson.textureStatus === "applied",
  colorOpacityAlpha:
    closeTo(frameJson.colorStart?.[0], 0.9294120073318481) &&
    closeTo(frameJson.colorStart?.[1], 0.2588239908218384) &&
    closeTo(frameJson.colorStart?.[2], 0) &&
    closeTo(frameJson.colorEnd?.[0], 1) &&
    closeTo(frameJson.colorEnd?.[1], 1) &&
    closeTo(frameJson.colorEnd?.[2], 0) &&
    Number(frameJson.alphaStart) > Number(frameJson.alphaEnd) &&
    Number(frameJson.alphaStart) > 0,
  visibilityFloorApplied:
    (frameJson.particleSizeVisibilityFloorPreviewMode === "surface-emitter-catalog-visibility-floor" ||
      frameJson.textureStatus === "applied") &&
    Number(frameJson.sizeStart) > 0 &&
    Number(frameJson.sizeEnd) > 0,
  materialFallbackApplied:
    frameJson.materialFallbackApplied === true || frameJson.textureStatus === "applied",
  emitterInViewBounds:
    Array.isArray(frameJson.emitterWorldBoundsSize) &&
    frameJson.emitterWorldBoundsSize.length === 3 &&
    frameJson.emitterWorldBoundsSize.every((value) => Number.isFinite(value) && value > 0),
  localOnlyNotCanonical: true
};

const canonicalChecks = {
  canonicalFrameArtifactPresent: Boolean(canonicalFrame),
  canonicalScreenshotPresent: Boolean(canonicalScreenshotPath && fs.existsSync(canonicalScreenshotPath)),
  canonicalScreenshotBytesMatchFrame:
    canonicalScreenshotBytes !== null &&
    Number(canonicalFrame?.screenshotBytes ?? NaN) === canonicalScreenshotBytes,
  canonicalRouteIsCatalogPreview:
    canonicalFrameRoute ===
    "http://127.0.0.1:5173/dev/catalog-vfx-preview?templateId=plc_zlc_o45&time=0.32&seed=211",
  canonicalFixedTemplateTimeSeed:
    canonicalFrameJson.templateId === "plc_zlc_o45" &&
    canonicalFrameJson.routeTimeSeconds === 0.32 &&
    canonicalFrameJson.seed === 211,
  canonicalFrameReady:
    canonicalFrameJson.status === "ready" &&
    canonicalFrameJson.renderPackageStatus === "ready",
  canonicalCanvasNonblank: canonicalFrameJson.canvasNonblank === true,
  canonicalGridHiddenObjectPixelsAboveThreshold:
    Number(canonicalFrameJson.objectPixelsWithoutGrid ?? 0) >=
    Number(threshold?.objectPixelThreshold ?? 80),
  canonicalBackendPayloadReady: canonicalFrameJson.auroraVfxBackendPayloadReady === true,
  canonicalBackendCanonical: canonicalFrameJson.auroraVfxBackendCanonical === true,
  canonicalStatus:
    canonicalFrameJson.auroraVfxCanonicalStatus === "canonical" &&
    canonicalFrameJson.auroraVfxPreviewMode === "aurora_emitter_particle_preview",
  canonicalRendererSelected:
    canonicalFrameJson.auroraVfxRenderer === "canonical" &&
    canonicalFrameJson.auroraVfxCanonicalRenderer === true,
  canonicalDevReady: canonicalFrame?.domStatus?.devCanonicalRendererReady === true,
  canonicalSourceMdlOverlaySuppressed:
    canonicalFrameJson.sourceMdlEmitterPreviewStatus === "" &&
    canonicalFrame?.domStatus?.devSourceMdlEmitterPreviewStatus === "",
  canonicalRetailProofPendingRecorded:
    Array.isArray(canonicalFrameJson.auroraVfxDiagnosticCodes) &&
    canonicalFrameJson.auroraVfxDiagnosticCodes.includes(
      "VFX_AURORA_MDL_EMITTER_RETAIL_PROOF_PENDING"
    ),
  canonicalLocalOnlyNotRetailEvidence:
    canonicalFrame?.localOnlyNotRetailEvidence === true &&
    canonicalFrame?.canonicalParityPromoted === false
};

Object.assign(checks, canonicalChecks);

const failedChecks = Object.entries(checks)
  .filter(([, passed]) => passed !== true)
  .map(([name]) => name);

const report = {
  version: "aurora-vfx-catalog-preview-guardrails/v1",
  generatedAt: new Date().toISOString(),
  artifactDir: toRepoPath(artifactDir),
  fixtureId: "catalog-placeable-plc_zlc_o45",
  route: frameRoute ?? threshold?.route ?? null,
  result:
    failedChecks.length === 0
      ? "catalog-preview-guardrails-passed"
      : "catalog-preview-guardrails-failed",
  canonicalParityPromoted: false,
  localOnlyNotRetailEvidence: true,
  artifacts: {
    backendSnapshot: toRepoPath(backendSnapshotPath),
    frame: toRepoPath(framePath),
    canonicalFrame: toRepoPath(canonicalFramePath),
    screenshot: screenshotPath ? toRepoPath(screenshotPath) : null,
    canonicalScreenshot: canonicalScreenshotPath ? toRepoPath(canonicalScreenshotPath) : null,
    thresholdSemanticCheck: toRepoPath(thresholdPath)
  },
  visualSummary: {
    status: frameJson.status ?? null,
    renderPackageStatus: frameJson.renderPackageStatus ?? null,
    canvasNonblank: frameJson.canvasNonblank ?? null,
    objectPixelsWithoutGrid: frameJson.objectPixelsWithoutGrid ?? null,
    objectPixelThreshold: threshold?.objectPixelThreshold ?? null,
    screenshotBytes,
    modelFileName: frameJson.modelFileName ?? null,
    textureUrlCount: Array.isArray(frameJson.textureUrls) ? frameJson.textureUrls.length : null,
    emitterType: frameJson.emitterType ?? null,
    emitterTexture: frameJson.emitterTexture ?? null,
    emitterBlendMode: frameJson.emitterBlendMode ?? null,
    emitterRenderMode: frameJson.emitterRenderMode ?? null,
    particleCount: frameJson.particleCount ?? null,
    materialFallbackApplied: frameJson.materialFallbackApplied ?? null,
    particleSizeVisibilityFloorPreviewMode:
      frameJson.particleSizeVisibilityFloorPreviewMode ?? null,
    canonicalObjectPixelsWithoutGrid: canonicalFrameJson.objectPixelsWithoutGrid ?? null,
    canonicalBackendPayloadReady: canonicalFrameJson.auroraVfxBackendPayloadReady ?? null,
    canonicalBackendCanonical: canonicalFrameJson.auroraVfxBackendCanonical ?? null,
    canonicalStatus: canonicalFrameJson.auroraVfxCanonicalStatus ?? null,
    canonicalRenderer: canonicalFrameJson.auroraVfxRenderer ?? null,
    canonicalRendererReady: canonicalFrame?.domStatus?.devCanonicalRendererReady ?? null,
    canonicalSourceMdlEmitterPreviewStatus:
      canonicalFrameJson.sourceMdlEmitterPreviewStatus ?? null
  },
  visualSemanticOracle,
  visualSemanticChecks: checks,
  failedChecks,
  failedCheckCount: failedChecks.length,
  humanReviewNeeded: [visualSemanticOracle.humanReviewNeeded],
  blockers: [
    "retail_runtime_tick_dumps_missing",
    "retail_render_contract_snapshots_missing",
    "retail_capture_references_missing",
    "retail_comparison_evidence_missing",
    "catalog_plc_zlc_o45_local_guardrail_is_not_retail_oracle"
  ]
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(
  JSON.stringify(
    {
      result: report.result,
      report: toRepoPath(outPath),
      failedCheckCount: report.failedCheckCount,
      objectPixelsWithoutGrid: report.visualSummary.objectPixelsWithoutGrid,
      canonicalParityPromoted: report.canonicalParityPromoted
    },
    null,
    2
  )
);

if (failedChecks.length > 0) {
  process.exit(1);
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function resolveMaybeAbsolute(filePath) {
  if (!filePath) return null;
  return path.isAbsolute(filePath) ? filePath : path.resolve(repoRoot, filePath);
}

function closeTo(actual, expected, tolerance = 0.00001) {
  return Math.abs(Number(actual) - expected) <= tolerance;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--artifactDir") {
      parsed.artifactDir = rawArgs[++index];
    } else if (arg === "--out") {
      parsed.out = rawArgs[++index];
    } else if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/check-vfx-catalog-preview-guardrails.mjs [--artifactDir path] [--out path]");
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
