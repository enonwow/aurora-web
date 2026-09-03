import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import "../../scripts/proof-capture-lock-auto.cjs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

import { createCaptureLifecycleTrace } from "./capture-lifecycle-trace.mjs";
import {
  installCaptureProcessGuard,
  releaseChildProcessStreams,
  shouldForceCaptureProcessExit
} from "./capture-process-lifecycle.mjs";
import {
  buildLocalBlankRuntimeFreshness,
  evaluateAreaPresentedFrameFence,
  evaluateAreaTileMutationRenderSettlement,
  evaluateAreaTileMutationRuntimeSettlement
} from "./lib/area-tile-mutation-runtime-settlement.mjs";
import {
  resolvePostMutationRuntimeWaitDeadline,
  shouldWaitForNewAreaRealTileModelsBeforeScenario
} from "./lib/area-runtime-wait-deadline.mjs";
import { buildGroupChunkBackgroundFixture, validateMatrixChunk } from "./lib/tile-add-connect-matrix.mjs";
import {
  MATRIX_RUNTIME_BUILD_PROFILE_MAX_BYTES,
  buildMatrixRuntimeBuildBinding,
  validateMatrixRuntimeBuildObservations
} from "./lib/tile-add-connect-runtime-build-profile.mjs";
import {
  computeTileAddConnectRuntimeSourceIdentity,
  summarizeTileAddConnectRuntimeSourceIdentity,
  validateTileAddConnectRuntimeSourceIdentity
} from "./lib/tile-add-connect-runtime-source-identity.mjs";
import {
  buildSameBrowserRestartProofStatus,
  createSameBrowserRestartReadyPacket,
  validateSameBrowserRestartResumePacket
} from "./lib/area-same-browser-restart-proof.mjs";

const DEFAULT_CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const DEFAULT_BASE_URL = "http://127.0.0.1:5173";
const DEFAULT_USERNAME = "builder.user";
const DEFAULT_PASSWORD = "builder123";
const DEFAULT_CAPTURE_TARGET = "ikea";
const DEFAULT_HTTP_TIMEOUT_MS = 10_000;
const DEFAULT_CHROME_CDP_TIMEOUT_MS = 30_000;
const DEFAULT_LOGIN_WAIT_MS = 6_000;
const DEFAULT_AUTHENTICATED_APP_WAIT_MS = 20_000;
const DEFAULT_CAPTURE_HARD_TIMEOUT_BUFFER_MS = 60_000;
const DEFAULT_BACKEND_DIRECT_HEALTH_URL = "http://127.0.0.1:3000/api/v1/health";
const DEFAULT_ACTIONABILITY_SAMPLE_LIMIT = 12;
const DEFAULT_NETWORK_REQUEST_ITEM_SAMPLE_LIMIT = 128;
// A cold ModuleSnapshotAreaRepository rebuild reads the complete local source
// snapshot before the Areas shell can render. Keep this comfortably above the
// observed 72 s cold-start path so capture reports a true readiness failure,
// not a false missing-workspace blocker.
const AREAS_WORKSPACE_LIST_WAIT_ATTEMPTS = 480;
const AREAS_WORKSPACE_LIST_WAIT_INTERVAL_MS = 250;
const AREA_RUNTIME_SNAPSHOT_WAIT_ATTEMPTS = 600;
const AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS = 100;
const APP_AUTH_SETTLED_POLL_INTERVAL_MS = 150;
const APP_AUTH_SETTLED_MIN_STABLE_POLLS = 4;
const AREA_RUNTIME_ROUTE_LOST_GRACE_ATTEMPTS = 8;
const AREA_SUPPORT_SURFACE_MIN_ACTIONABLE_OVERLAP_RATIO = 0.6;
const AREA_EDITING_MUTATING_SCENARIOS = new Set([
  "drag-terrain",
  "drag-crosser",
  "drag-height",
  "multi-copy-paste",
  "multi-copy-paste-local",
  "tile-properties",
  "tile-transform-local",
  "tile-replace-local",
  "tile-add-connect-matrix-local",
  "group-placement-local",
  "eraser-local",
  "eraser",
  "source-group-remove",
  "source-group-rotate",
  "source-group-cut",
  "group-base-height",
  "area-rotate",
  "area-rotate-rectangular",
  "area-rotate-rectangular-local"
]);
const AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY_SESSION_KEY =
  "aurora_web.areas_runtime_capture.terrain_only.v1";
const DEFAULT_AREA_RUNTIME_SNAPSHOT_WAIT_DEADLINE_MS =
  AREA_RUNTIME_SNAPSHOT_WAIT_ATTEMPTS * AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS;
const HELP_TEXT = `
Usage:
  node scripts/capture-areas-runtime-cdp.mjs [--area <text>] [--target ikea] [--view top-down] [--areaEditingLocalBlank true|false] [--areaEditingPreview terrain|group|crosser|eraser] [--areaEditingAction hover|commit|commit-undo] [--areaEditingScenario new-area-verify|multi-select|drag-terrain|drag-height|tile-transform-local|tile-replace-local|tile-add-connect-matrix-local|group-placement-local|eraser-local] [--areaEditingMatrixChunk <chunk.json>] [--areaEditingTileId 1200] [--areaEditingGroupId group0] [--areaEditingNewAreaTileset sic11] [--areaEditingNewAreaResRef verify_area] [--areaEditingNewAreaWidth 4] [--areaEditingNewAreaHeight 4] [--cleanCanvas true|false] [--tileOverlay true|false] [--tileLights true|false] [--displayFog true|false] [--terrainVoidMasksVisible true|false] [--terrainVoidMaskModelResRef <resref>] [--terrainVoidMaskSourceMesh <node>] [--terrainMaterialMode basic] [--focusWorldX <number>] [--focusWorldZ <number>] [--focusDistance <number>] [--visibility terrain-only] [--ceilingMeshes true|false] [--isolateObjectId <objectId>] [--highlightObjectIds <objectId,objectId>] [--sameBrowserRestart true] [--sameBrowserRestartPreviousBackendPid <pid>] [--sameBrowserRestartTimeoutMs <ms>] [--runtimeBuildProfile <path>] [--runtimeBuildProfileSha256 <sha256>] [--runtimeCanvasScreenshot true|false] [--pageScreenshot true|false] [--disableGpu true|false] [--baseUrl <url>] [--outDir <dir>] [--name <stem>] [--runtimeWaitMs <ms>] [--chromeCdpTimeoutMs <ms>] [--httpTimeoutMs <ms>] [--loginWaitMs <ms>] [--lifecycleTracePath <file.jsonl>] [--requireScreenshot]
  node scripts/capture-areas-runtime-cdp.mjs --summarizeFrame <frame.json> [--summaryLimit <count>]

Captures the live Areas workspace through Chrome DevTools Protocol, opens an Area,
and records the browser-readable terrain tile model and tile process runtime snapshots.
`.trim();

const options = parseArgs(process.argv.slice(2));
if (options.help === "true") {
  console.log(HELP_TEXT);
  process.exit(0);
}

const actionabilitySampleLimit = Number(
  options.summaryLimit ??
    process.env.AREAS_CAPTURE_SUMMARY_LIMIT ??
    DEFAULT_ACTIONABILITY_SAMPLE_LIMIT
);

if (options.summarizeFrame) {
  const frame = JSON.parse(fs.readFileSync(path.resolve(options.summarizeFrame), "utf8"));
  const runtimeActionabilitySummary =
    frame.runtimeActionabilitySummary ??
    buildRuntimeActionabilitySummary({
      domStatus: frame.domStatus,
      expectedAreaDetail: frame.expectedAreaDetail,
      networkCaptureSummary: frame.networkCaptureSummary,
      sampleLimit: actionabilitySampleLimit
    });
  console.log(
    JSON.stringify(
      buildConsoleSummary({
        ...frame,
        runtimeActionabilitySummary
      }),
      null,
      2
    )
  );
  process.exit(0);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");
const runtimeBuildBinding = loadOptionalMatrixRuntimeBuildBinding(options);
const outDir = path.resolve(
  repoRoot,
  options.outDir ?? "backend/docs/aurora-reverse/artifacts/areas-runtime-capture"
);
const lifecycleTrace = createCaptureLifecycleTrace(options.lifecycleTracePath);
const chromePath = options.chromePath ?? process.env.CHROME_PATH ?? DEFAULT_CHROME_PATH;
const baseUrl = options.baseUrl ?? process.env.AREAS_BASE_URL ?? DEFAULT_BASE_URL;
const port = Number(options.port ?? 9600 + Math.floor(Math.random() * 400));
const fileStem = sanitizeFileStem(options.name ?? "areas-runtime");
const username = options.username ?? process.env.AURORA_TEST_USERNAME ?? DEFAULT_USERNAME;
const password = options.password ?? process.env.AURORA_TEST_PASSWORD ?? DEFAULT_PASSWORD;
const explicitAreaQuery = options.area?.trim();
const captureTarget =
  options.target ??
  (explicitAreaQuery && explicitAreaQuery.length > 0 ? explicitAreaQuery : undefined) ??
  process.env.AURORA_AREA_CAPTURE_TARGET ??
  DEFAULT_CAPTURE_TARGET;
const areaQuery =
  explicitAreaQuery ??
  resolveCaptureTargetAreaQuery(captureTarget) ??
  process.env.AURORA_AREA_CAPTURE_QUERY ??
  "";
const authBaseUrl = (options.authBaseUrl ?? `${baseUrl}/_aurora/v1`).replace(/\/+$/u, "");
const backendDirectHealthUrl =
  options.backendDirectHealthUrl ??
  process.env.AREAS_BACKEND_DIRECT_HEALTH_URL ??
  (runtimeBuildBinding
    ? `${runtimeBuildBinding.backend.baseUrl}/api/v1/health`
    : DEFAULT_BACKEND_DIRECT_HEALTH_URL);
const httpTimeoutMs = Number(
  options.httpTimeoutMs ?? process.env.AREAS_CAPTURE_HTTP_TIMEOUT_MS ?? DEFAULT_HTTP_TIMEOUT_MS
);
const chromeCdpTimeoutMs = Number(
  options.chromeCdpTimeoutMs ??
    // A runtime proof must keep its CDP session alive for the same interval
    // as its requested terrain-settlement window.  Custom CEP/HAK tiles can
    // legitimately need more than the historical 30 s default on a cold
    // GLB conversion; otherwise the capture fails while the real request is
    // still in flight and reports a stale snapshot.
    options.runtimeWaitMs ??
    options.runtimeSnapshotWaitMs ??
    process.env.AREAS_CAPTURE_CHROME_CDP_TIMEOUT_MS ??
    DEFAULT_CHROME_CDP_TIMEOUT_MS
);
const loginWaitMs = Math.max(
  APP_AUTH_SETTLED_POLL_INTERVAL_MS,
  Number(options.loginWaitMs ?? process.env.AREAS_CAPTURE_LOGIN_WAIT_MS ?? DEFAULT_LOGIN_WAIT_MS)
);
const requireScreenshot = parseBooleanOption(
  options.requireScreenshot ?? process.env.AREAS_CAPTURE_REQUIRE_SCREENSHOT ?? "false"
);
const capturePageScreenshot = parseBooleanOption(
  options.pageScreenshot ??
    options.capturePageScreenshot ??
    process.env.AREAS_CAPTURE_PAGE_SCREENSHOT ??
    "true"
);
const capturePageScreenshotFromSurface = parseBooleanOption(
  options.pageScreenshotFromSurface ??
    options.fromSurface ??
    process.env.AREAS_CAPTURE_PAGE_SCREENSHOT_FROM_SURFACE ??
    "true"
);
const captureScreencastScreenshot = parseBooleanOption(
  options.screencastScreenshot ??
    options.captureScreencastScreenshot ??
    process.env.AREAS_CAPTURE_SCREENCAST_SCREENSHOT ??
    "false"
);
const captureRuntimeCanvasScreenshot = parseBooleanOption(
  options.runtimeCanvasScreenshot ??
    options.captureRuntimeCanvasScreenshot ??
    process.env.AREAS_CAPTURE_RUNTIME_CANVAS_SCREENSHOT ??
    "true"
);
const chromeDisableGpu = parseBooleanOption(
  options.disableGpu ?? process.env.AREAS_CAPTURE_DISABLE_GPU ?? "true"
);
const allowPartialEvidence = parseBooleanOption(
  options.allowPartialEvidence ?? process.env.AREAS_CAPTURE_ALLOW_PARTIAL_EVIDENCE ?? "false"
);
const areaRuntimeSnapshotWaitDeadlineMs = Math.max(
  AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS,
  Number(
    options.runtimeWaitMs ??
      options.runtimeSnapshotWaitMs ??
      process.env.AREAS_RUNTIME_SNAPSHOT_WAIT_MS ??
      DEFAULT_AREA_RUNTIME_SNAPSHOT_WAIT_DEADLINE_MS
  )
);
const postMutationRuntimeWaitDeadlineMs = resolvePostMutationRuntimeWaitDeadline({
  requestedWaitMs: areaRuntimeSnapshotWaitDeadlineMs,
  chromeCdpTimeoutMs
});
const networkSettlementTimeoutMs = Math.min(
  30_000,
  Math.max(5_000, areaRuntimeSnapshotWaitDeadlineMs)
);
const captureSameBrowserRestart = parseBooleanOption(
  options.sameBrowserRestart ??
    process.env.AREAS_CAPTURE_SAME_BROWSER_RESTART ??
    "false"
);
const sameBrowserRestartTimeoutMs = Math.max(
  10_000,
  Number(
    options.sameBrowserRestartTimeoutMs ??
      process.env.AREAS_CAPTURE_SAME_BROWSER_RESTART_TIMEOUT_MS ??
      180_000
  )
);
const sameBrowserRestartPreviousBackendProcessId = Number(
  options.sameBrowserRestartPreviousBackendPid ??
    process.env.AREAS_CAPTURE_SAME_BROWSER_RESTART_PREVIOUS_BACKEND_PID ??
    Number.NaN
);
const captureHardTimeoutMs = Math.max(
  30_000,
  Number(
    options.overallTimeoutMs ??
      process.env.AREAS_CAPTURE_OVERALL_TIMEOUT_MS ??
      chromeCdpTimeoutMs +
        loginWaitMs +
        areaRuntimeSnapshotWaitDeadlineMs +
        (captureSameBrowserRestart ? sameBrowserRestartTimeoutMs : 0) +
        DEFAULT_CAPTURE_HARD_TIMEOUT_BUFFER_MS
  )
);
const captureView = normalizeCaptureViewOption(
  options.view ?? options.captureView ?? process.env.AREAS_CAPTURE_VIEW ?? "default"
);
const captureAreaEditingPreview = normalizeAreaEditingPreviewOption(
  options.areaEditingPreview ?? process.env.AREAS_CAPTURE_AREA_EDITING_PREVIEW
);
const captureAreaEditingAction = normalizeAreaEditingActionOption(
  options.areaEditingAction ?? process.env.AREAS_CAPTURE_AREA_EDITING_ACTION
);
const captureAreaEditingScenario = normalizeAreaEditingScenarioOption(
  options.areaEditingScenario ?? process.env.AREAS_CAPTURE_AREA_EDITING_SCENARIO
);
const captureAreaEditingMatrixChunk = loadAreaEditingMatrixChunk(
  options.areaEditingMatrixChunk ?? process.env.AREAS_CAPTURE_AREA_EDITING_MATRIX_CHUNK,
  captureAreaEditingScenario
);
const captureAreaEditingGroupId = normalizeAreaEditingGroupIdOption(
  options.areaEditingGroupId ?? process.env.AREAS_CAPTURE_AREA_EDITING_GROUP_ID ?? "group0"
);
const captureAreaEditingTileId = normalizeAreaEditingTileIdOption(
  options.areaEditingTileId ?? process.env.AREAS_CAPTURE_AREA_EDITING_TILE_ID
);
const captureAreaEditingNewArea = {
  tilesetResRef: normalizeAreaEditingResRefOption(
    options.areaEditingNewAreaTileset ??
      process.env.AREAS_CAPTURE_AREA_EDITING_NEW_AREA_TILESET ??
      captureAreaEditingMatrixChunk?.tilesetResRef ??
      "sic11",
    "areaEditingNewAreaTileset"
  ),
  areaResRef: normalizeAreaEditingResRefOption(
    options.areaEditingNewAreaResRef ??
      process.env.AREAS_CAPTURE_AREA_EDITING_NEW_AREA_RESREF ??
      "verify_area",
    "areaEditingNewAreaResRef"
  ),
  width: normalizeAreaEditingDimensionOption(
    options.areaEditingNewAreaWidth ??
      process.env.AREAS_CAPTURE_AREA_EDITING_NEW_AREA_WIDTH ??
      captureAreaEditingMatrixChunk?.width ??
      4,
    "areaEditingNewAreaWidth"
  ),
  height: normalizeAreaEditingDimensionOption(
    options.areaEditingNewAreaHeight ??
      process.env.AREAS_CAPTURE_AREA_EDITING_NEW_AREA_HEIGHT ??
      captureAreaEditingMatrixChunk?.height ??
      4,
    "areaEditingNewAreaHeight"
  ),
  ...(captureAreaEditingScenario === "tile-add-connect-matrix-local"
    ? { proofInitializer: "first-compatible" }
    : {})
};
assertMatrixChunkMatchesNewArea(captureAreaEditingMatrixChunk, captureAreaEditingNewArea);
const captureAreaEditingLocalBlank = parseBooleanOption(
  options.areaEditingLocalBlank ?? process.env.AREAS_CAPTURE_AREA_EDITING_LOCAL_BLANK ?? "false"
);
if (
  captureSameBrowserRestart &&
  (!Number.isInteger(sameBrowserRestartPreviousBackendProcessId) ||
    sameBrowserRestartPreviousBackendProcessId <= 0)
) {
  throw new Error(
    "--sameBrowserRestart requires --sameBrowserRestartPreviousBackendPid with the exact positive backend runtime PID."
  );
}
if (
  captureSameBrowserRestart &&
  (captureAreaEditingLocalBlank || Boolean(captureAreaEditingScenario))
) {
  throw new Error(
    "--sameBrowserRestart is limited to an unchanged source-backed Area and cannot be combined with Area editing scenarios."
  );
}
const captureCleanCanvas = parseBooleanOption(
  options.cleanCanvas ?? process.env.AREAS_CAPTURE_CLEAN_CANVAS ?? "true"
);
const captureTileOverlay = parseOptionalBooleanOption(
  options.tileOverlay ??
    options.showTileGridOverlay ??
    process.env.AREAS_CAPTURE_TILE_OVERLAY ??
    process.env.AREAS_CAPTURE_SHOW_TILE_GRID_OVERLAY
);
const captureTileLights = parseOptionalBooleanOption(
  options.tileLights ??
    options.showTileLights ??
    process.env.AREAS_CAPTURE_TILE_LIGHTS ??
    process.env.AREAS_CAPTURE_SHOW_TILE_LIGHTS
);
const captureDisplayFog = parseOptionalBooleanOption(
  options.displayFog ?? process.env.AREAS_CAPTURE_DISPLAY_FOG
);
const captureUseAreaLighting = parseOptionalBooleanOption(
  options.useAreaLighting ?? process.env.AREAS_CAPTURE_USE_AREA_LIGHTING
);
const captureTerrainVoidMasksVisible = parseOptionalBooleanOption(
  options.terrainVoidMasksVisible ??
    options.voidMasksVisible ??
    process.env.AREAS_CAPTURE_TERRAIN_VOID_MASKS_VISIBLE
);
const captureTerrainVoidMaskFilter = {
  modelResRef: parseOptionalStringOption(
    options.terrainVoidMaskModelResRef ??
      options.voidMaskModelResRef ??
      process.env.AREAS_CAPTURE_TERRAIN_VOID_MASK_MODEL_RESREF
  ),
  sourceMesh: parseOptionalStringOption(
    options.terrainVoidMaskSourceMesh ??
      options.voidMaskSourceMesh ??
      process.env.AREAS_CAPTURE_TERRAIN_VOID_MASK_SOURCE_MESH
  )
};
const captureTerrainMaterialMode = parseOptionalStringOption(
  options.terrainMaterialMode ??
    options.materialMode ??
    process.env.AREAS_CAPTURE_TERRAIN_MATERIAL_MODE
);
const captureViewFocus = {
  worldX: parseOptionalNumberOption(
    options.focusWorldX ?? options.focusX ?? process.env.AREAS_CAPTURE_FOCUS_WORLD_X
  ),
  worldY: parseOptionalNumberOption(
    options.focusWorldY ?? options.focusY ?? process.env.AREAS_CAPTURE_FOCUS_WORLD_Y
  ),
  worldZ: parseOptionalNumberOption(
    options.focusWorldZ ?? options.focusZ ?? process.env.AREAS_CAPTURE_FOCUS_WORLD_Z
  ),
  distance: parseOptionalNumberOption(
    options.focusDistance ?? process.env.AREAS_CAPTURE_FOCUS_DISTANCE
  ),
  yawDegrees: parseOptionalNumberOption(
    options.focusYawDegrees ?? options.yawDegrees ?? process.env.AREAS_CAPTURE_FOCUS_YAW_DEGREES
  ),
  elevationDegrees: parseOptionalNumberOption(
    options.focusElevationDegrees ??
      options.elevationDegrees ??
      process.env.AREAS_CAPTURE_FOCUS_ELEVATION_DEGREES
  )
};
const captureVisibility = normalizeCaptureVisibilityOption(
  options.visibility ??
    options.captureVisibility ??
    process.env.AREAS_CAPTURE_VISIBILITY ??
    "all"
);
const captureCeilingMeshes = normalizeCaptureCeilingMeshesOption(
  options.ceilingMeshes ??
    options.captureCeilingMeshes ??
    process.env.AREAS_CAPTURE_CEILING_MESHES
);
const captureIsolateObjectId = parseOptionalStringOption(
  options.isolateObjectId ??
    options.isolateObject ??
    process.env.AREAS_CAPTURE_ISOLATE_OBJECT_ID
);
const captureHighlightObjectIdsRaw = parseOptionalStringOption(
  options.highlightObjectIds ??
    options.highlightObjectId ??
    options.highlightObjects ??
    process.env.AREAS_CAPTURE_HIGHLIGHT_OBJECT_IDS
);
const captureHighlightObjectIds = captureHighlightObjectIdsRaw
  ? captureHighlightObjectIdsRaw
      .split(/[;,]/u)
      .map((objectId) => objectId.trim())
      .filter(Boolean)
  : [];
const captureRemoveObjectIdsRaw = parseOptionalStringOption(
  options.removeObjectIds ??
    options.removeObjectId ??
    options.removeObjects ??
    process.env.AREAS_CAPTURE_REMOVE_OBJECT_IDS
);
const captureRemoveObjectIds = captureRemoveObjectIdsRaw
  ? captureRemoveObjectIdsRaw
      .split(/[;,]/u)
      .map((objectId) => objectId.trim())
      .filter(Boolean)
  : [];
const unsupportedProofOptions = [
  ...(allowPartialEvidence ? ["allowPartialEvidence"] : []),
  ...(captureScreencastScreenshot ? ["screencastScreenshot"] : []),
  ...(captureRemoveObjectIds.length > 0 ? ["removeObjectIds"] : [])
];
if (unsupportedProofOptions.length > 0) {
  throw new Error(
    `Area proof capture is fail-closed. Unsupported options: ${unsupportedProofOptions.join(", ")}. ` +
      "A proof must use the unmodified Area, a fully settled runtime snapshot, and a direct CDP screenshot."
  );
}
const captureRenderPriorityObjectIds = Array.from(
  new Set(
    [
      ...(captureIsolateObjectId ? [captureIsolateObjectId] : []),
      ...captureHighlightObjectIds
    ].filter(Boolean)
  )
);
const profileDir = path.join(outDir, `${fileStem}.chrome-profile`);
const keepProfile = options.keepProfile === "true";
const route = new URL("/app?mode=areas_mode", baseUrl).toString();
const bootstrapRoute = new URL("/login?mode=areas_mode", baseUrl).toString();
const pngPath = path.join(outDir, `${fileStem}.png`);
const canvasPngPath = path.join(outDir, `${fileStem}.canvas.png`);
const framePath = path.join(outDir, `${fileStem}.frame.json`);
const areaEditingScenarioStatePath = path.join(outDir, `${fileStem}.state.json`);
const areaEditingScenarioSummaryPath = path.join(outDir, `${fileStem}.summary.json`);
const failureFramePath = path.join(outDir, `${fileStem}.failure.frame.json`);
const progressFramePath = path.join(outDir, `${fileStem}.progress.frame.json`);
const sameBrowserRestartReadyPath = path.join(
  outDir,
  `${fileStem}.same-browser-restart.ready.json`
);
const sameBrowserRestartResumePath = path.join(
  outDir,
  `${fileStem}.same-browser-restart.resume.json`
);
const captureStartedAt = Date.now();

fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });
lifecycleTrace.record("runner-started", { fileStem, outDir, port, pid: process.pid });

let chromeStderr = "";
let chrome = null;
let chromeProcessGuard = null;
let chromeSpawnError = null;
let seededAuthState = null;
let expectedArea = null;
let expectedAreaDetail = null;
let authElapsedMs = null;
let runtimeEnvironmentPreflight = null;
let runtimeEnvironmentPostCapture = null;
let runtimeSourceIdentityPreflight = null;

try {
  lifecycleTrace.record("preflight-started");
  const authStartedAt = Date.now();
  if (runtimeBuildBinding) {
    runtimeSourceIdentityPreflight =
      computeTileAddConnectRuntimeSourceIdentity({ repoRoot });
    const runtimeSourceErrors = validateTileAddConnectRuntimeSourceIdentity(
      runtimeBuildBinding,
      summarizeTileAddConnectRuntimeSourceIdentity(
        runtimeSourceIdentityPreflight
      )
    );
    if (runtimeSourceErrors.length > 0) {
      throw createBlockerError(
        "runtime_source_identity_mismatch",
        "Current runtime sources do not match the immutable runtime-build profile.",
        {
          runtimeBuildBinding,
          runtimeSourceIdentity:
            summarizeTileAddConnectRuntimeSourceIdentity(
              runtimeSourceIdentityPreflight
            ),
          errors: runtimeSourceErrors
        }
      );
    }
  }
  runtimeEnvironmentPreflight = await preflightRuntimeEnvironment({
    route,
    bootstrapRoute,
    authBaseUrl,
    backendDirectHealthUrl,
    runtimeBuildBinding
  });
  seededAuthState = await createPersistedAuthState({
    authBaseUrl,
    username,
    password
  });
  if (
    !captureAreaEditingLocalBlank &&
    captureAreaEditingScenario !== "new-area-verify" &&
    captureAreaEditingScenario !== "multi-copy-paste-local" &&
    captureAreaEditingScenario !== "tile-transform-local" &&
    captureAreaEditingScenario !== "tile-replace-local" &&
    captureAreaEditingScenario !== "group-placement-local" &&
    captureAreaEditingScenario !== "eraser-local" &&
    captureAreaEditingScenario !== "area-rotate-rectangular-local"
  ) {
    expectedArea = await resolveExpectedAreaFromBackend({
      authBaseUrl,
      accessToken: seededAuthState.session.accessToken,
      areaQuery
    });
    expectedAreaDetail = await resolveExpectedAreaDetailFromBackend({
      authBaseUrl,
      accessToken: seededAuthState.session.accessToken,
      areaId: expectedArea.areaId
    });
  }
  authElapsedMs = Date.now() - authStartedAt;
  lifecycleTrace.record("preflight-finished", { authElapsedMs });

  lifecycleTrace.record("chrome-spawn-requested");
  chrome = spawn(
    chromePath,
    [
  "--headless=new",
  "--renderer-process-limit=2",
      ...(chromeDisableGpu ? ["--disable-gpu"] : []),
      "--no-sandbox",
      "--noerrdialogs",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-mode",
      "--disable-breakpad",
      "--disable-crash-reporter",
      `--remote-debugging-port=${port}`,
      "--window-size=1440,900",
      `--user-data-dir=${profileDir}`,
      bootstrapRoute
    ],
    { stdio: ["ignore", "pipe", "pipe"], windowsHide: true, detached: false }
  );
  chromeProcessGuard = installCaptureProcessGuard(chrome, {
    hardTimeoutMs: captureHardTimeoutMs,
    label: `areas-runtime:${fileStem}`
  });
  lifecycleTrace.record("chrome-spawned", { pid: chrome.pid ?? null });

  chrome.stderr.on("data", (chunk) => {
    chromeStderr += chunk.toString();
  });
  chrome.on("error", (error) => {
    chromeSpawnError = error;
    chromeStderr += `\nCHROME_SPAWN_ERROR: ${formatErrorForMessage(error)}`;
  });

  lifecycleTrace.record("capture-started");
  const result = await captureFromChrome({
    port,
    route,
    bootstrapRoute,
    pngPath,
    canvasPngPath,
    framePath,
    progressFramePath,
    chromeCdpTimeoutMs,
    seededAuthState,
    expectedArea,
    expectedAreaDetail,
    runtimeEnvironmentPreflight,
    requireScreenshot,
    captureRuntimeCanvasScreenshot,
    capturePageScreenshot,
    capturePageScreenshotFromSurface,
    captureScreencastScreenshot,
    allowPartialEvidence,
    captureView,
    captureAreaEditingPreview,
    captureAreaEditingAction,
    captureAreaEditingScenario,
    captureAreaEditingGroupId,
    captureAreaEditingTileId,
    captureAreaEditingNewArea,
    captureAreaEditingLocalBlank,
    areaEditingScenarioStatePath,
    areaEditingScenarioSummaryPath,
    captureCleanCanvas,
    captureViewFocus,
    captureRemoveObjectIds,
    areaRuntimeSnapshotWaitDeadlineMs,
    captureSameBrowserRestart,
    sameBrowserRestartTimeoutMs,
    sameBrowserRestartPreviousBackendProcessId,
    sameBrowserRestartReadyPath,
    sameBrowserRestartResumePath,
    actionabilitySampleLimit,
    username,
    password,
    timings: {
      authElapsedMs,
      captureStartedAt
    },
    lifecycleTrace,
    getChromeSpawnError: () => chromeSpawnError
  });
  lifecycleTrace.record("capture-returned", { totalElapsedMs: result?.timings?.totalElapsedMs ?? null });
  console.log(JSON.stringify(buildConsoleSummary(result), null, 2));
} catch (error) {
  lifecycleTrace.record("capture-failed", {
    error: error instanceof Error ? error.name : "Error",
    message: formatErrorForMessage(error)
  });
  const previousFrameEvidence = readExistingRuntimeFrameEvidence(framePath);
  const frame = buildFailureFrame(error, {
    areaQuery,
    authBaseUrl,
    baseUrl,
    bootstrapRoute,
    captureStartedAt,
    captureTarget,
    chromePath,
    expectedArea,
    expectedAreaDetail,
    failureFramePath,
    fileStem,
    framePath,
    httpTimeoutMs,
    chromeCdpTimeoutMs,
    canvasPngPath,
    pngPath,
    port,
    previousFrameEvidence,
    requireScreenshot,
    actionabilitySampleLimit,
    runtimeEnvironmentPreflight,
    route,
    seededAuthState
  });
  fs.writeFileSync(failureFramePath, `${JSON.stringify(frame, null, 2)}\n`);
  console.error(JSON.stringify(buildConsoleSummary(frame), null, 2));
  process.exitCode = 1;
} finally {
  lifecycleTrace.record("chrome-cleanup-started", { pid: chrome?.pid ?? null });
  try {
    if (chromeProcessGuard) {
      await chromeProcessGuard.terminate();
    } else if (chrome) {
      await terminateChromeCaptureProcess(chrome);
    }
  } finally {
    lifecycleTrace.record("chrome-stdio-released", {
      count: releaseChildProcessStreams(chrome)
    });
  }
  lifecycleTrace.record("chrome-cleanup-finished", { pid: chrome?.pid ?? null });
  if (!keepProfile) {
    lifecycleTrace.record("profile-cleanup-started", { profileDir });
    removeProfileDirBestEffort(profileDir);
    lifecycleTrace.record("profile-cleanup-finished", { profileDir });
  }
  lifecycleTrace.record("runner-finished");
}
if (shouldForceCaptureProcessExit(options.exitAfterCleanup)) {
  lifecycleTrace.record("forced-exit-requested", { exitCode: process.exitCode ?? 0 });
  process.exit(process.exitCode ?? 0);
}

function readExistingRuntimeFrameEvidence(candidateFramePath) {
  try {
    const stats = fs.statSync(candidateFramePath);
    const frame = JSON.parse(fs.readFileSync(candidateFramePath, "utf8"));
    return {
      exists: true,
      path: candidateFramePath,
      bytes: stats.size,
      mtimeMs: Math.round(stats.mtimeMs),
      version: frame.version ?? null,
      status: frame.status ?? null,
      capturedAt: frame.capturedAt ?? null,
      screenshotPath: frame.screenshotPath ?? null,
      screenshotBytes: frame.screenshotBytes ?? null,
      target: frame.target
        ? {
            captureTarget: frame.target.captureTarget ?? null,
            areaQuery: frame.target.areaQuery ?? null,
            expectedArea: summarizeAreaForConsole(frame.target.expectedArea),
            openedAreaMatchesExpected: frame.target.openedAreaMatchesExpected ?? null
          }
        : null,
      runtimeActionabilitySummary: frame.runtimeActionabilitySummary
        ? {
            version: frame.runtimeActionabilitySummary.version ?? null,
            status: frame.runtimeActionabilitySummary.status ?? null,
            firstErrorReason: frame.runtimeActionabilitySummary.firstErrorReason ?? null,
            sharedRenderer: frame.runtimeActionabilitySummary.sharedRenderer
              ? {
                  status: frame.runtimeActionabilitySummary.sharedRenderer.status ?? null,
                  missingPayloadCount:
                    frame.runtimeActionabilitySummary.sharedRenderer.missingPayloadCount ?? null,
                  renderedModelUrlCount:
                    frame.runtimeActionabilitySummary.sharedRenderer.renderedModelUrlCount ??
                    frame.runtimeActionabilitySummary.sharedRenderer.modelReadyCount ??
                    null
                }
              : null
          }
        : null
    };
  } catch (error) {
    return {
      exists: false,
      path: candidateFramePath,
      cause: serializeError(error)
    };
  }
}

async function captureFromChrome({
  port,
  route,
  bootstrapRoute,
  pngPath,
  canvasPngPath,
  framePath,
  progressFramePath,
  chromeCdpTimeoutMs,
  seededAuthState,
  expectedArea,
  expectedAreaDetail,
  runtimeEnvironmentPreflight,
  requireScreenshot,
  captureRuntimeCanvasScreenshot,
  capturePageScreenshot,
  capturePageScreenshotFromSurface,
  captureScreencastScreenshot,
  allowPartialEvidence,
  captureView,
  captureAreaEditingPreview,
  captureAreaEditingAction,
  captureAreaEditingScenario,
  captureAreaEditingGroupId,
  captureAreaEditingNewArea,
  captureAreaEditingLocalBlank,
  areaEditingScenarioStatePath,
  areaEditingScenarioSummaryPath,
  captureCleanCanvas,
  captureViewFocus,
  captureRemoveObjectIds,
  areaRuntimeSnapshotWaitDeadlineMs,
  captureSameBrowserRestart,
  sameBrowserRestartTimeoutMs,
  sameBrowserRestartPreviousBackendProcessId,
  sameBrowserRestartReadyPath,
  sameBrowserRestartResumePath,
  actionabilitySampleLimit,
  username,
  password,
    timings,
    lifecycleTrace,
    getChromeSpawnError
}) {
  const tab = await waitForTab(port, bootstrapRoute, {
    getChromeSpawnError,
    timeoutMs: chromeCdpTimeoutMs
  });
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let messageId = 0;
  const pending = new Map();
  const cdpEventHandlers = new Map();
  const networkCapture = createNetworkCapture();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) {
      recordNetworkEvent(networkCapture, message);
      const handlers = cdpEventHandlers.get(message.method);
      if (handlers) {
        for (const handler of Array.from(handlers)) {
          handler(message.params ?? {});
        }
      }
      return;
    }
    if (!pending.has(message.id)) {
      return;
    }
    const handlers = pending.get(message.id);
    pending.delete(message.id);
    clearTimeout(handlers.timeout);
    if (message.error) {
      handlers.reject(new Error(JSON.stringify(message.error)));
    } else {
      handlers.resolve(message.result);
    }
  };

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const rejectPending = (error) => {
    for (const [id, handlers] of pending.entries()) {
      clearTimeout(handlers.timeout);
      pending.delete(id);
      handlers.reject(error);
    }
  };
  ws.onerror = () => {
    rejectPending(new Error("Chrome DevTools WebSocket error during Areas runtime capture."));
  };
  ws.onclose = () => {
    rejectPending(new Error("Chrome DevTools WebSocket closed during Areas runtime capture."));
  };

  const addCdpEventHandler = (method, handler) => {
    if (!cdpEventHandlers.has(method)) {
      cdpEventHandlers.set(method, new Set());
    }
    const handlers = cdpEventHandlers.get(method);
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
      if (handlers.size === 0) {
        cdpEventHandlers.delete(method);
      }
    };
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++messageId;
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(
          createBlockerError(
            "chrome_cdp_command_timeout",
            `Chrome DevTools command ${method} timed out during Areas runtime capture.`,
            {
              method,
              timeoutMs: chromeCdpTimeoutMs
            }
          )
        );
      }, chromeCdpTimeoutMs);
      pending.set(id, { resolve, reject, timeout });
      try {
        ws.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timeout);
        pending.delete(id);
        reject(error);
      }
    });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable", { maxPostDataSize: 2_000_000 });
  try {
  const captureAreaEditingScenarioUsesLocalDraft =
    captureAreaEditingLocalBlank ||
    [
      "new-area-verify",
      "multi-copy-paste-local",
      "tile-transform-local",
      "tile-replace-local",
      "tile-add-connect-matrix-local",
      "group-placement-local",
      "eraser-local",
      "area-rotate-rectangular-local"
    ].includes(captureAreaEditingScenario ?? "");
  // A real-Area authoring proof must not silently switch to terrain-only:
  // tiles alone do not prove Area load, object-layer readiness, or camera parity.
  const effectiveCaptureVisibility =
    captureAreaEditingScenario && !captureAreaEditingScenarioUsesLocalDraft
      ? "all"
      : captureVisibility;
  const allowIntentionalHiddenGround =
    effectiveCaptureVisibility === "terrain-only" &&
    Boolean(captureAreaEditingScenario) &&
    captureAreaEditingScenario !== "new-area-verify";
  const loginReady = await authenticateBrowserForCapture(
    send,
    seededAuthState,
    { username, password },
    {
      tileOverlay: captureTileOverlay,
      terrainOnly: effectiveCaptureVisibility === "terrain-only"
    }
  );
  const areasWorkspaceStatus = await waitForAreasWorkspace(send);
  const createsNewAreaThroughUi =
    captureAreaEditingScenario === "new-area-verify" ||
    captureAreaEditingScenario === "multi-copy-paste-local" ||
    captureAreaEditingScenario === "tile-transform-local" ||
    captureAreaEditingScenario === "tile-replace-local" ||
    captureAreaEditingScenario === "tile-add-connect-matrix-local" ||
    captureAreaEditingScenario === "group-placement-local" ||
    captureAreaEditingScenario === "eraser-local" ||
    captureAreaEditingScenario === "area-rotate-rectangular-local" ||
    (captureAreaEditingLocalBlank && captureAreaEditingScenario === "tile-properties");
  let openedArea = createsNewAreaThroughUi
    ? await createLocalAreaThroughUiForVerify(
        send,
        captureAreaEditingNewArea,
        Math.max(10_000, Math.min(180_000, chromeCdpTimeoutMs - 5_000))
      )
    : captureAreaEditingLocalBlank
      ? await createLocalBlankAreaForEditingProof(send)
      : await openArea(send, areaQuery, expectedArea);
  const usesLocalAreaDraft = captureAreaEditingLocalBlank || createsNewAreaThroughUi;
  // The initial catalogue lookup may target a normal Area (for example
  // `_ikea`), while a local editing scenario immediately creates a different
  // transient Area.  Once that happens, freshness must be checked against the
  // newly opened Area expectation, not the catalogue lookup that merely got us
  // into the Areas workspace.
  const runtimeExpectedArea = usesLocalAreaDraft ? null : expectedArea;
  let domStatus = usesLocalAreaDraft
    ? await readLocalBlankAreaRuntimeStatus(send, openedArea)
    : await waitForAreaRuntimeSnapshot(send, openedArea, expectedArea, {
        progressFramePath,
        route,
        captureStartedAt: timings.captureStartedAt,
        captureVisibility: effectiveCaptureVisibility,
        allowPartialEvidence,
        runtimeSnapshotWaitDeadlineMs: areaRuntimeSnapshotWaitDeadlineMs
      });
  if (!usesLocalAreaDraft) {
    assertRuntimeStatusIsVisualProofReady(domStatus, openedArea, expectedArea, {
      route,
      requireScreenshot,
      captureVisibility: effectiveCaptureVisibility,
      allowIntentionalHiddenGround
    });
  } else if (domStatus.runtimeFreshness?.ok !== true) {
    throw createBlockerError(
      "areas_local_runtime_scene_identity_mismatch",
      "Local Area editing proof did not render the exact newly-created scene identity.",
      {
        endpoint: route,
        port: resolveUrlPort(route),
        openedArea,
        runtimeFreshness: domStatus.runtimeFreshness
      }
    );
  }
  let sameBrowserRestartProofContext = null;
  if (captureSameBrowserRestart) {
    await waitForRequiredNetworkSettlement(networkCapture, networkSettlementTimeoutMs);
    await hydrateNetworkResponseBodies(send, networkCapture);
    const baselineNetworkSummary = buildNetworkCaptureSummary(networkCapture);
    assertRequiredNetworkSettlement(baselineNetworkSummary);

    const challenge = crypto.randomUUID();
    const beforeSession = await createSameBrowserRestartSessionIdentity(send, challenge);
    const readyPacket = createSameBrowserRestartReadyPacket({
      challenge,
      readyAt: new Date().toISOString(),
      session: beforeSession,
      area: expectedArea,
      previousBackendProcessId: sameBrowserRestartPreviousBackendProcessId
    });
    writeSameBrowserRestartReadyPacket({
      readyPath: sameBrowserRestartReadyPath,
      resumePath: sameBrowserRestartResumePath,
      packet: readyPacket
    });
    resetNetworkCapture(networkCapture);
    lifecycleTrace?.record("same-browser-restart-ready", {
      readyPath: sameBrowserRestartReadyPath,
      resumePath: sameBrowserRestartResumePath,
      challenge,
      previousBackendProcessId: sameBrowserRestartPreviousBackendProcessId
    });

    const resumePacket = await waitForSameBrowserRestartResumePacket({
      resumePath: sameBrowserRestartResumePath,
      challenge,
      readyAt: readyPacket.readyAt,
      previousBackendProcessId: sameBrowserRestartPreviousBackendProcessId,
      timeoutMs: sameBrowserRestartTimeoutMs
    });
    lifecycleTrace?.record("same-browser-restart-resumed", {
      resumePath: sameBrowserRestartResumePath,
      currentBackendProcessId: resumePacket.currentBackendProcessId
    });

    const restartedAuthState = await createPersistedAuthState({
      authBaseUrl,
      username,
      password
    });
    const authRefresh = await refreshSameBrowserAuthStateWithoutNavigation(
      send,
      restartedAuthState,
      Math.min(30_000, sameBrowserRestartTimeoutMs)
    );
    const reopenedArea = await openArea(send, areaQuery, expectedArea);
    const reopenedDomStatus = await waitForAreaRuntimeSnapshot(
      send,
      reopenedArea,
      expectedArea,
      {
        progressFramePath,
        route,
        captureStartedAt: timings.captureStartedAt,
        captureVisibility: effectiveCaptureVisibility,
        allowPartialEvidence,
        runtimeSnapshotWaitDeadlineMs: areaRuntimeSnapshotWaitDeadlineMs
      }
    );
    assertRuntimeStatusIsVisualProofReady(reopenedDomStatus, reopenedArea, expectedArea, {
      route,
      requireScreenshot,
      captureVisibility: effectiveCaptureVisibility,
      allowIntentionalHiddenGround
    });
    const afterSession = await readSameBrowserRestartSessionIdentity(send);
    sameBrowserRestartProofContext = {
      readyPath: sameBrowserRestartReadyPath,
      resumePath: sameBrowserRestartResumePath,
      readyPacket,
      resumePacket,
      beforeSession,
      afterSession,
      authRefresh,
      baselineNetworkSummary,
      reopenedArea
    };
    openedArea = reopenedArea;
    domStatus = reopenedDomStatus;
  }
  if (progressFramePath) {
    writeAreaRuntimeCaptureProgressFrame(progressFramePath, {
      attempt: "runtime-ready-before-object-removal",
      route,
      openedArea,
      expectedArea,
      captureStartedAt: timings.captureStartedAt,
      waitStartedAt: timings.captureStartedAt,
      status: domStatus,
      settled: true
    });
  }
  const captureRemovedObjectsStatus = await applyCaptureRemoveObjectIds(
    send,
    captureRemoveObjectIds
  );
  if (
    captureRemoveObjectIds.length > 0 &&
    captureRemovedObjectsStatus.ok !== true
  ) {
    throw createBlockerError(
      "areas_capture_requested_object_removal_failed",
      "Areas runtime capture requested object removal before visual proof, but at least one object was not removed.",
      {
        endpoint: route,
        port: resolveUrlPort(route),
        requestedObjectIds: captureRemoveObjectIds,
        captureRemovedObjects: captureRemovedObjectsStatus,
        openedArea,
        expectedArea
      }
    );
  }
  if (captureRemovedObjectsStatus.applied) {
    const refreshedStatus = await readAreaRuntimeStatus(send, openedArea.areaText);
    domStatus = {
      ...refreshedStatus,
      areaExpectation: openedArea.areaExpectation ?? null,
      runtimeFreshness: buildRuntimeFreshnessCheck(refreshedStatus, openedArea, expectedArea),
      captureWaitElapsedMs: domStatus.captureWaitElapsedMs ?? null
    };
    if (!usesLocalAreaDraft) {
      assertRuntimeStatusIsVisualProofReady(domStatus, openedArea, expectedArea, {
        route,
        requireScreenshot,
        captureVisibility: effectiveCaptureVisibility,
        allowIntentionalHiddenGround
      });
    }
    if (progressFramePath) {
      writeAreaRuntimeCaptureProgressFrame(progressFramePath, {
        attempt: "runtime-ready-after-object-removal",
        route,
        openedArea,
        expectedArea,
        captureStartedAt: timings.captureStartedAt,
        waitStartedAt: timings.captureStartedAt,
        status: domStatus,
        settled: true
      });
    }
  }
  const captureCeilingMeshesStatus = await applyCaptureCeilingMeshes(send, captureCeilingMeshes);
  const captureVisibilityStatus = await applyCaptureVisibility(send, effectiveCaptureVisibility);
  // `--view perspective` is the proof-friendly whole-Area camera.  It must
  // not silently fall back to the current editor camera just because the
  // caller omitted a manual focus.  The opened ARE is authoritative for the
  // default target, in the same tile-space used by the Web renderer.
  const effectiveCaptureViewFocus = resolveCaptureViewFocusForOpenedArea(
    captureView,
    captureViewFocus,
    openedArea
  );
  let captureViewStatus = await applyCaptureView(send, captureView, effectiveCaptureViewFocus, {
    cleanCanvas: captureCleanCanvas,
    tileLightsVisible: captureTileLights,
    displayFog: captureDisplayFog,
    useAreaLighting: captureUseAreaLighting,
    terrainVoidMasksVisible: captureTerrainVoidMasksVisible,
    terrainVoidMaskFilter: captureTerrainVoidMaskFilter,
    terrainMaterialMode: captureTerrainMaterialMode,
    renderPriorityObjectIds: captureRenderPriorityObjectIds
  });
  // A dense proof gallery may legitimately need longer than the historical
  // 180 s new-Area warm-up.  Honour the caller's explicit runtime deadline,
  // while retaining that floor for existing local scenarios.
  const newAreaRealTileModelTimeoutMs = Math.min(
    chromeCdpTimeoutMs,
    Math.max(180_000, areaRuntimeSnapshotWaitDeadlineMs)
  );
  let areaEditingScenarioStatus = captureAreaEditingScenario === "new-area-verify"
    ? await verifyNewAreaDraftThroughUi(
      send,
      openedArea,
      Math.min(180_000, areaRuntimeSnapshotWaitDeadlineMs)
    )
    : null;
  if (captureAreaEditingScenario === "new-area-verify") {
    const expectedTileCount = Number(
      areaEditingScenarioStatus?.verification?.stats?.expectedTileCount ??
        openedArea.areaExpectation?.width * openedArea.areaExpectation?.height
    );
    let realTileModels;
    try {
      realTileModels = await waitForNewAreaRealTileModels(
        send,
        openedArea.areaText,
        expectedTileCount,
        newAreaRealTileModelTimeoutMs
      );
    } catch (error) {
      await attachNewAreaTileModelWaitVisualEvidence(error, {
        send,
        pngPath,
        canvasPngPath,
        captureIsolateObjectId,
        captureHighlightObjectIds,
        addCdpEventHandler,
        capturePageScreenshot,
        capturePageScreenshotFromSurface,
        captureScreencastScreenshot
      });
      throw error;
    }
    areaEditingScenarioStatus = {
      ...areaEditingScenarioStatus,
      realTileModels
    };
    domStatus = await readLocalBlankAreaRuntimeStatus(send, openedArea);
  }
  if (
    createsNewAreaThroughUi &&
    captureAreaEditingScenario &&
    captureAreaEditingScenario !== "new-area-verify" &&
    shouldWaitForNewAreaRealTileModelsBeforeScenario(
      captureAreaEditingScenario
    )
  ) {
    const expectedTileCount = Number(
      openedArea.areaExpectation?.width * openedArea.areaExpectation?.height
    );
    try {
      await waitForNewAreaRealTileModels(
        send,
        openedArea.areaText,
        expectedTileCount,
        newAreaRealTileModelTimeoutMs
      );
    } catch (error) {
      await attachNewAreaTileModelWaitVisualEvidence(error, {
        send,
        pngPath,
        canvasPngPath,
        captureIsolateObjectId,
        captureHighlightObjectIds,
        addCdpEventHandler,
        capturePageScreenshot,
        capturePageScreenshotFromSurface,
        captureScreencastScreenshot
      });
      throw error;
    }
    domStatus = await readLocalBlankAreaRuntimeStatus(send, openedArea);
  }
  if (
    captureAreaEditingScenario &&
    captureAreaEditingScenario !== "new-area-verify"
  ) {
    const visualProofBefore = ["tile-transform-local", "group-placement-local"].includes(captureAreaEditingScenario)
      ? await captureAreaEditingScenarioVisualStep({
          send,
          suffix: "before",
          pngPath,
          canvasPngPath,
          captureIsolateObjectId,
          captureHighlightObjectIds,
          addCdpEventHandler,
          capturePageScreenshot,
          capturePageScreenshotFromSurface,
          captureScreencastScreenshot
        })
      : null;
    const initialInvisibleGroundSurfaceEvidence =
      classifyIntentionalInvisibleGroundSurface(domStatus);
    areaEditingScenarioStatus = await executeAreaEditingRuntimeScenario({
      send,
      scenario: captureAreaEditingScenario,
      groupId: captureAreaEditingGroupId,
      tileId: captureAreaEditingTileId,
      matrixChunk: captureAreaEditingMatrixChunk,
      openedArea,
      initialSceneKey: domStatus.tileProcessSceneContract?.currentSceneKey ?? null
    });
    if (visualProofBefore) {
      areaEditingScenarioStatus = {
        ...areaEditingScenarioStatus,
        visualProof: { before: visualProofBefore }
      };
    }
    if (areaEditingScenarioStatus.ok !== true) {
      throw createBlockerError(
        `area_editing_scenario_${captureAreaEditingScenario.replace(/-/gu, "_")}_failed`,
        `Area editing runtime scenario ${captureAreaEditingScenario} did not satisfy its exact state, history, and selection assertions.`,
        { scenario: captureAreaEditingScenario, result: areaEditingScenarioStatus }
      );
    }
    if (
      areaEditingScenarioStatus.mutatesScene &&
      areaEditingScenarioStatus.requiresTileProcessSceneKeyChange !== false
    ) {
      const settledSceneKey = await waitForTileProcessCurrentSceneKeyChange(
        send,
        openedArea.areaText,
        domStatus.tileProcessSceneContract?.currentSceneKey ?? null,
        Math.min(120_000, chromeCdpTimeoutMs)
      );
      let settled;
      try {
        settled = await waitForAreaRuntimeSnapshot(send, openedArea, runtimeExpectedArea, {
          progressFramePath,
          route,
          captureStartedAt: timings.captureStartedAt,
          captureVisibility: effectiveCaptureVisibility,
          runtimeSnapshotWaitDeadlineMs: Math.min(120_000, chromeCdpTimeoutMs),
          requiredTileProcessSceneKey: settledSceneKey.sceneKey,
          requireStrictTerrainSettlement: true
        });
      } catch (error) {
        await attachTerminalTileModelBlockerVisualEvidence(error, {
          send,
          pngPath,
          canvasPngPath,
          captureIsolateObjectId,
          captureHighlightObjectIds,
          addCdpEventHandler,
          capturePageScreenshot,
          capturePageScreenshotFromSurface,
          captureScreencastScreenshot
        });
        await attachAreaEditingSettlementVisualEvidence(error, {
          send,
          pngPath,
          canvasPngPath,
          captureIsolateObjectId,
          captureHighlightObjectIds,
          addCdpEventHandler,
          capturePageScreenshot,
          capturePageScreenshotFromSurface,
          captureScreencastScreenshot
        });
        throw error;
      }
      const realTileSettlement = assertAreaEditingScenarioRealTileSettlement(
        settled,
        openedArea,
        captureAreaEditingScenario,
        areaEditingScenarioStatus
      );
      areaEditingScenarioStatus = {
        ...areaEditingScenarioStatus,
        realTileModels: {
          ok: true,
          expectedTileCount: Number(settled.terrainTileModelSnapshot?.tileCount ?? 0),
          intentionalInvisibleGroundSurface:
            initialInvisibleGroundSurfaceEvidence.intentionalInvisibleGroundSurface ||
            (realTileSettlement?.intentionalInvisibleGroundSurface ?? false),
          intentionalInvisibleGroundSurfaceEvidence:
            initialInvisibleGroundSurfaceEvidence.intentionalInvisibleGroundSurface
              ? initialInvisibleGroundSurfaceEvidence
              : realTileSettlement?.intentionalInvisibleGroundSurfaceEvidence ?? null,
          terrainTileModelSnapshot: settled.terrainTileModelSnapshot ?? null,
          tileProcessRuntimeSnapshot: settled.tileProcessRuntimeSnapshot ?? null
        }
      };
      domStatus = settled;
    } else if (areaEditingScenarioStatus.requiresPostMutationSettlement === true) {
      const settlementOpenedArea = areaEditingScenarioStatus.postMutationAreaExpectation
        ? {
            ...openedArea,
            areaExpectation: areaEditingScenarioStatus.postMutationAreaExpectation
          }
        : openedArea;
      const settled = await waitForAreaRuntimeSnapshot(send, settlementOpenedArea, runtimeExpectedArea, {
        progressFramePath,
        route,
        captureStartedAt: timings.captureStartedAt,
        captureVisibility: effectiveCaptureVisibility,
        runtimeSnapshotWaitDeadlineMs: postMutationRuntimeWaitDeadlineMs,
        requireStrictTerrainSettlement: true
      });
      const realTileSettlement = assertAreaEditingScenarioRealTileSettlement(
        settled,
        settlementOpenedArea,
        captureAreaEditingScenario,
        areaEditingScenarioStatus
      );
      areaEditingScenarioStatus = {
        ...areaEditingScenarioStatus,
        realTileModels: {
          ok: true,
          expectedTileCount: Number(settled.terrainTileModelSnapshot?.tileCount ?? 0),
          intentionalInvisibleGroundSurface:
            realTileSettlement?.intentionalInvisibleGroundSurface ?? false,
          intentionalInvisibleGroundSurfaceEvidence:
            realTileSettlement?.intentionalInvisibleGroundSurfaceEvidence ?? null,
          terrainTileModelSnapshot: settled.terrainTileModelSnapshot ?? null,
          tileProcessRuntimeSnapshot: settled.tileProcessRuntimeSnapshot ?? null
        }
      };
      domStatus = settled;
    } else {
      const realTileSettlement = assertAreaEditingScenarioRealTileSettlement(
        domStatus,
        openedArea,
        captureAreaEditingScenario,
        areaEditingScenarioStatus
      );
      areaEditingScenarioStatus = {
        ...areaEditingScenarioStatus,
        realTileModels: {
          ok: true,
          expectedTileCount: Number(domStatus.terrainTileModelSnapshot?.tileCount ?? 0),
          intentionalInvisibleGroundSurface:
            initialInvisibleGroundSurfaceEvidence.intentionalInvisibleGroundSurface ||
            (realTileSettlement?.intentionalInvisibleGroundSurface ?? false),
          intentionalInvisibleGroundSurfaceEvidence:
            initialInvisibleGroundSurfaceEvidence.intentionalInvisibleGroundSurface
              ? initialInvisibleGroundSurfaceEvidence
              : realTileSettlement?.intentionalInvisibleGroundSurfaceEvidence ?? null,
          terrainTileModelSnapshot: domStatus.terrainTileModelSnapshot ?? null,
          tileProcessRuntimeSnapshot: domStatus.tileProcessRuntimeSnapshot ?? null
        }
      };
    }
  }
  const preCommitTileProcessSceneKey =
    domStatus.tileProcessSceneContract?.currentSceneKey ?? null;
  // Scenario mode owns the complete mutation/Undo/Redo lifecycle. Keep the
  // legacy preview CLI intact when no scenario is requested, but never append
  // a second hidden preview commit after a scenario's proven final Redo state.
  const legacyAreaEditingPreview = captureAreaEditingScenario
    ? null
    : captureAreaEditingPreview;
  const areaEditingPreviewStatus = await applyAreaEditingPlacementPreview(
    send,
    legacyAreaEditingPreview,
    captureAreaEditingAction
  );
  if (legacyAreaEditingPreview && areaEditingPreviewStatus.ok !== true) {
    throw createBlockerError(
      "area_editing_preview_not_applied",
      "Area editing proof requested a placement preview, but the editor hover overlay was not activated.",
      {
        endpoint: route,
        requestedPreview: legacyAreaEditingPreview,
        areaEditingPreviewStatus,
        openedArea,
        expectedArea
      }
    );
  }
  let areaEditingActionStatus = {
    requested: captureAreaEditingAction,
    ok: areaEditingPreviewStatus.ok === true,
    commit: areaEditingPreviewStatus.commit ?? null,
    undo: null,
    stepArtifacts: []
  };
  if (
    legacyAreaEditingPreview &&
    captureAreaEditingAction === "commit-undo" &&
    areaEditingPreviewStatus.commit?.applied === true
  ) {
    const committedSceneKeyStatus = await waitForTileProcessCurrentSceneKeyChange(
      send,
      openedArea.areaText,
      preCommitTileProcessSceneKey,
      Math.min(120_000, chromeCdpTimeoutMs)
    );
    const commitSettledStatus = await waitForAreaRuntimeSnapshot(
      send,
      openedArea,
      runtimeExpectedArea,
      {
        progressFramePath,
        route,
        captureStartedAt: timings.captureStartedAt,
        captureVisibility: effectiveCaptureVisibility,
        runtimeSnapshotWaitDeadlineMs: Math.min(120_000, chromeCdpTimeoutMs),
        requiredTileProcessSceneKey: committedSceneKeyStatus.sceneKey,
        requireStrictTerrainSettlement: true
      }
    );
    const commitPngPath = pngPath.replace(/\.png$/u, ".commit.png");
    const commitCanvasPngPath = canvasPngPath.replace(/\.canvas\.png$/u, ".commit.canvas.png");
    const commitFramePath = framePath.replace(/\.frame\.json$/u, ".commit.frame.json");
    const commitRuntimeCanvasScreenshot = await captureRuntimeCanvasPng(
      send,
      commitCanvasPngPath,
      captureIsolateObjectId,
      captureHighlightObjectIds
    );
    const commitPageScreenshot = await capturePageOrCanvasScreenshot({
      send,
      addCdpEventHandler,
      capturePageScreenshot: true,
      capturePageScreenshotFromSurface,
      captureScreencastScreenshot,
      pngPath: commitPngPath,
      runtimeCanvasScreenshot: commitRuntimeCanvasScreenshot
    });
    const commitStepFrame = {
      version: "aurora-area-editing-runtime-step/v1",
      capturedAt: new Date().toISOString(),
      status: "captured",
      step: "commit",
      requestedPreview: legacyAreaEditingPreview,
      requestedAction: captureAreaEditingAction,
      areaEditingPreview: areaEditingPreviewStatus,
      commit: areaEditingPreviewStatus.commit,
      tileProcessSceneContract: commitSettledStatus.tileProcessSceneContract ?? null,
      terrainTileModelSnapshot: commitSettledStatus.terrainTileModelSnapshot ?? null,
      tileProcessRuntimeSnapshot: commitSettledStatus.tileProcessRuntimeSnapshot ?? null,
      pageScreenshot: commitPageScreenshot,
      runtimeCanvasScreenshot: commitRuntimeCanvasScreenshot,
      framePath: commitFramePath
    };
    fs.writeFileSync(commitFramePath, `${JSON.stringify(commitStepFrame, null, 2)}\n`);
    const undoStatus = await applyAreaEditingUndo(
      send,
      areaEditingPreviewStatus.commit.before.state,
      areaEditingPreviewStatus.commit.after.tool
    );
    if (undoStatus.ok !== true) {
      throw createBlockerError(
        "area_editing_undo_not_restored",
        "Area editing proof committed through the pointer handler, but normal Undo did not restore the previous state while keeping the tool armed.",
        {
          requestedPreview: legacyAreaEditingPreview,
          requestedAction: captureAreaEditingAction,
          areaEditingPreviewStatus,
          undoStatus,
          commitStepFrame
        }
      );
    }
    if (!preCommitTileProcessSceneKey) {
      throw createBlockerError(
        "area_editing_precommit_scene_key_missing",
        "Area editing proof could not identify the pre-commit tile process scene key for Undo settlement.",
        { commitStepFrame, undoStatus }
      );
    }
    domStatus = await waitForAreaRuntimeSnapshot(send, openedArea, runtimeExpectedArea, {
      progressFramePath,
      route,
      captureStartedAt: timings.captureStartedAt,
      captureVisibility: effectiveCaptureVisibility,
      runtimeSnapshotWaitDeadlineMs: Math.min(120_000, chromeCdpTimeoutMs),
      requiredTileProcessSceneKey: preCommitTileProcessSceneKey,
      requireStrictTerrainSettlement: true
    });
    areaEditingActionStatus = {
      ...areaEditingActionStatus,
      ok: true,
      undo: undoStatus,
      stepArtifacts: [
        {
          step: "commit",
          framePath: commitFramePath,
          pageScreenshot: commitPageScreenshot,
          runtimeCanvasScreenshot: commitRuntimeCanvasScreenshot
        }
      ]
    };
  }
  // A mutation may rebuild the scene and replace the editor's default orbit
  // camera. Re-apply the requested oracle view after the final mutation state,
  // not merely before it, so the captured proof has the requested angle.
  if (!usesLocalAreaDraft && captureView !== "default") {
    captureViewStatus = await applyCaptureView(send, captureView, effectiveCaptureViewFocus, {
      cleanCanvas: captureCleanCanvas,
      tileLightsVisible: captureTileLights,
      displayFog: captureDisplayFog,
      useAreaLighting: captureUseAreaLighting,
      terrainVoidMasksVisible: captureTerrainVoidMasksVisible,
      terrainVoidMaskFilter: captureTerrainVoidMaskFilter,
      terrainMaterialMode: captureTerrainMaterialMode,
      renderPriorityObjectIds: captureRenderPriorityObjectIds
    });
  }
  if (
    !usesLocalAreaDraft &&
    (captureViewStatus.applied || captureVisibilityStatus.applied || captureCeilingMeshesStatus.applied)
  ) {
    const refreshedStatus = await readAreaRuntimeStatus(send, openedArea.areaText);
    domStatus = {
      ...refreshedStatus,
      areaExpectation: openedArea.areaExpectation ?? null,
      runtimeFreshness: buildRuntimeFreshnessCheck(refreshedStatus, openedArea, expectedArea),
      captureWaitElapsedMs: domStatus.captureWaitElapsedMs ?? null
    };
    assertRuntimeStatusIsVisualProofReady(domStatus, openedArea, expectedArea, {
      route,
      requireScreenshot,
      captureVisibility: effectiveCaptureVisibility,
      allowIntentionalHiddenGround
    });
    assertRequestedCaptureCamera(domStatus, captureView, {
      route,
      openedArea,
      expectedArea
    });
    if (progressFramePath) {
      writeAreaRuntimeCaptureProgressFrame(progressFramePath, {
        attempt: "runtime-ready-after-view-application",
        route,
        openedArea,
        expectedArea,
        captureStartedAt: timings.captureStartedAt,
        waitStartedAt: timings.captureStartedAt,
        status: domStatus,
        settled: true
      });
    }
  }
  const requiresAreaTileMutationRuntimeSettlement =
    AREA_EDITING_MUTATING_SCENARIOS.has(captureAreaEditingScenario) ||
    (
      Boolean(legacyAreaEditingPreview) &&
      (captureAreaEditingAction === "commit" ||
        captureAreaEditingAction === "commit-undo")
    );
  if (requiresAreaTileMutationRuntimeSettlement) {
    const exactMutationSettlement = await waitForAreaTileMutationRuntimeSettlement(
      send,
      openedArea.areaText,
      {
        timeoutMs: Math.min(120_000, chromeCdpTimeoutMs),
        expectedCameraMode: "top_down_oracle"
      }
    );
    domStatus = {
      ...exactMutationSettlement.status,
      areaExpectation: openedArea.areaExpectation ?? null,
      runtimeFreshness:
        exactMutationSettlement.status.runtimeFreshness ??
        domStatus.runtimeFreshness ??
        null,
      captureWaitElapsedMs: domStatus.captureWaitElapsedMs ?? null,
      areaTileMutationSettlementWaitElapsedMs: exactMutationSettlement.elapsedMs
    };
    if (progressFramePath) {
      writeAreaRuntimeCaptureProgressFrame(progressFramePath, {
        attempt: "exact-area-tile-mutation-runtime-ready",
        route,
        openedArea,
        expectedArea,
        captureStartedAt: timings.captureStartedAt,
        waitStartedAt: Date.now() - exactMutationSettlement.elapsedMs,
        status: domStatus,
        settled: true
      });
    }
  }
  domStatus.areasWorkspaceWaitElapsedMs = areasWorkspaceStatus.areasWorkspaceWaitElapsedMs;
  const runtimeCanvasScreenshot = captureRuntimeCanvasScreenshot
    ? await captureRuntimeCanvasPng(
        send,
        canvasPngPath,
        captureIsolateObjectId,
        captureHighlightObjectIds
      )
    : {
        ok: false,
        path: canvasPngPath,
        reason: "runtime_canvas_capture_skipped",
        requestedObjectId:
          typeof captureIsolateObjectId === "string" ? captureIsolateObjectId.trim() : "",
        requestedObjectIds: captureHighlightObjectIds,
        matchedObjectId: "",
        matchedObjectIds: [],
        matchedObjectName: "",
        matchedObjectNames: [],
        visibleObjectCount: null,
        highlightedObjectCount: null
      };
  const runtimeCanvasVisualEvidence = runtimeCanvasScreenshot.ok
    ? inspectRuntimeCanvasVisualEvidence(canvasPngPath)
    : null;
  const capturedMutationEvidence =
    runtimeCanvasScreenshot.areaMutationRuntimeEvidence ?? {
      terrainSnapshot: null,
      cameraFrame: null,
      presentedFrame: null
    };
  const areaTileMutationRuntimeSettlement =
    evaluateAreaTileMutationRuntimeSettlement({
      trace: domStatus.areaTileMutationTrace ?? null,
      contractSettlement:
        domStatus.areaTileMutationContractSettlement ?? null,
      terrainSnapshot: capturedMutationEvidence.terrainSnapshot,
      cameraFrame: capturedMutationEvidence.cameraFrame,
      presentedFrame: capturedMutationEvidence.presentedFrame,
      expectedCameraMode: "top_down_oracle"
    });
  if (
    requiresAreaTileMutationRuntimeSettlement &&
    areaTileMutationRuntimeSettlement.status !== "ready"
  ) {
    throw createBlockerError(
      "area_tile_mutation_runtime_not_settled",
      "Area tile mutation proof did not bind the exact mutation to a ready terrain build, canonical camera, and presented frame.",
      {
        endpoint: route,
        port: resolveUrlPort(route),
        captureAreaEditingScenario,
        captureAreaEditingAction,
        areaTileMutationRuntimeSettlement,
        areaTileMutationTrace: domStatus.areaTileMutationTrace ?? null,
        areaTileMutationContractSettlement:
          domStatus.areaTileMutationContractSettlement ?? null,
        capturedMutationEvidence
      }
    );
  }

  const pageScreenshot = await capturePageOrCanvasScreenshot({
    send,
    addCdpEventHandler,
    capturePageScreenshot,
    capturePageScreenshotFromSurface,
    captureScreencastScreenshot,
    pngPath,
    runtimeCanvasScreenshot
  });
  const postCaptureDomStatus = requiresAreaTileMutationRuntimeSettlement
    ? await readAreaRuntimeStatus(send, openedArea.areaText)
    : null;
  const areaPresentedFrameFence = requiresAreaTileMutationRuntimeSettlement
    ? evaluateAreaPresentedFrameFence({
        capturedFrame: capturedMutationEvidence.presentedFrame,
        observedAfterCapture: postCaptureDomStatus?.presentedFrame ?? null
      })
    : null;
  const postCaptureAreaTileMutationRuntimeSettlement =
    requiresAreaTileMutationRuntimeSettlement
      ? evaluateAreaTileMutationRuntimeSettlement({
          trace: postCaptureDomStatus?.areaTileMutationTrace ?? null,
          contractSettlement:
            postCaptureDomStatus?.areaTileMutationContractSettlement ?? null,
          terrainSnapshot: capturedMutationEvidence.terrainSnapshot,
          cameraFrame: capturedMutationEvidence.cameraFrame,
          presentedFrame: capturedMutationEvidence.presentedFrame,
          expectedCameraMode: "top_down_oracle"
        })
      : areaTileMutationRuntimeSettlement;
  if (
    requiresAreaTileMutationRuntimeSettlement &&
    (
      areaPresentedFrameFence?.status !== "ready" ||
      postCaptureAreaTileMutationRuntimeSettlement.status !== "ready"
    )
  ) {
    throw createBlockerError(
      "area_tile_mutation_frame_fence_failed",
      "Area tile mutation changed or lost its settled mutation/frame binding during screenshot capture.",
      {
        endpoint: route,
        port: resolveUrlPort(route),
        captureAreaEditingScenario,
        captureAreaEditingAction,
        areaPresentedFrameFence,
        postCaptureAreaTileMutationRuntimeSettlement,
        capturedMutationEvidence,
        postCaptureDomStatus
      }
    );
  }
  const runtimeSourceIdentityPostCapture = runtimeBuildBinding
    ? computeTileAddConnectRuntimeSourceIdentity({ repoRoot })
    : null;
  runtimeEnvironmentPostCapture = runtimeBuildBinding
    ? await preflightRuntimeEnvironment({
        route,
        bootstrapRoute,
        authBaseUrl,
        backendDirectHealthUrl,
        runtimeBuildBinding
      })
    : runtimeEnvironmentPreflight;
  const runtimeBuildProof = buildMatrixRuntimeBuildProof(
    runtimeBuildBinding,
    runtimeEnvironmentPreflight,
    runtimeEnvironmentPostCapture,
    postCaptureDomStatus ?? domStatus,
    runtimeSourceIdentityPreflight,
    runtimeSourceIdentityPostCapture
  );
  if (runtimeBuildProof?.status !== undefined && runtimeBuildProof.status !== "verified") {
    throw createBlockerError(
      "runtime_build_identity_mismatch",
      "Areas runtime capture did not read back the exact frontend and backend builds declared by its immutable profile.",
      {
        endpoint: route,
        port: resolveUrlPort(route),
        runtimeBuildProof
      }
    );
  }
  const areaEditingScenarioArtifacts = areaEditingScenarioStatus
    ? writeAreaEditingScenarioArtifacts({
        scenario: captureAreaEditingScenario,
        status: areaEditingScenarioStatus,
        openedArea,
        statePath: areaEditingScenarioStatePath,
        summaryPath: areaEditingScenarioSummaryPath,
        screenshotPath: pngPath,
        canvasScreenshotPath: canvasPngPath,
        pageScreenshot,
        runtimeCanvasScreenshot
      })
    : null;
  if (captureAreaEditingAction === "commit-undo" && areaEditingActionStatus.undo?.ok === true) {
    const undoFramePath = framePath.replace(/\.frame\.json$/u, ".undo.frame.json");
    const undoStepFrame = {
      version: "aurora-area-editing-runtime-step/v1",
      capturedAt: new Date().toISOString(),
      status: "captured",
      step: "undo",
      requestedPreview: legacyAreaEditingPreview,
      requestedAction: captureAreaEditingAction,
      undo: areaEditingActionStatus.undo,
      tileProcessSceneContract: domStatus.tileProcessSceneContract ?? null,
      terrainTileModelSnapshot: domStatus.terrainTileModelSnapshot ?? null,
      tileProcessRuntimeSnapshot: domStatus.tileProcessRuntimeSnapshot ?? null,
      pageScreenshot,
      runtimeCanvasScreenshot,
      framePath: undoFramePath
    };
    fs.writeFileSync(undoFramePath, `${JSON.stringify(undoStepFrame, null, 2)}\n`);
    areaEditingActionStatus = {
      ...areaEditingActionStatus,
      stepArtifacts: [
        ...areaEditingActionStatus.stepArtifacts,
        {
          step: "undo",
          framePath: undoFramePath,
          pageScreenshot,
          runtimeCanvasScreenshot
        }
      ]
    };
  }
  const screenshotEvidence = inspectScreenshotEvidence(pngPath, timings.captureStartedAt);
  const canvasVisualEvidence = inspectCanvasVisualEvidence(pngPath, domStatus);
  const runtimeBlockerSnapshot = buildRuntimeBlockerSnapshot(
    domStatus,
    canvasVisualEvidence
  );
  if (requireScreenshot && !screenshotEvidence.fresh) {
    throw createBlockerError(
      "render_screenshot_missing",
      "Strict visual capture requires a fresh _IKEA screenshot, but no fresh PNG was produced.",
      {
        endpoint: route,
        port: resolveUrlPort(route),
        pngPath,
        expectedArea,
        screenshot: screenshotEvidence,
        strictFailureClass: "render_screenshot_missing"
      }
    );
  }
  await waitForRequiredNetworkSettlement(networkCapture, networkSettlementTimeoutMs);
  await hydrateNetworkResponseBodies(send, networkCapture);
  const networkCaptureSummary = buildNetworkCaptureSummary(networkCapture);
  assertRequiredNetworkSettlement(networkCaptureSummary);
  const sameBrowserRestartProof = sameBrowserRestartProofContext
    ? {
        ...buildSameBrowserRestartProofStatus({
          readyPacket: sameBrowserRestartProofContext.readyPacket,
          resumePacket: sameBrowserRestartProofContext.resumePacket,
          beforeSession: sameBrowserRestartProofContext.beforeSession,
          afterSession: sameBrowserRestartProofContext.afterSession,
          expectedArea,
          reopenedArea: sameBrowserRestartProofContext.reopenedArea,
          runtimeFreshness: domStatus.runtimeFreshness,
          expectedPlaceableCount: expectedArea?.objectCounts?.placeables ?? 0,
          postRestartNetworkSummary: networkCaptureSummary
        }),
        readyPath: sameBrowserRestartProofContext.readyPath,
        resumePath: sameBrowserRestartProofContext.resumePath,
        readyPacket: sameBrowserRestartProofContext.readyPacket,
        resumePacket: sameBrowserRestartProofContext.resumePacket,
        beforeSession: sameBrowserRestartProofContext.beforeSession,
        afterSession: sameBrowserRestartProofContext.afterSession,
        authRefresh: sameBrowserRestartProofContext.authRefresh,
        baselineNetworkSummary: sameBrowserRestartProofContext.baselineNetworkSummary
      }
    : null;
  if (sameBrowserRestartProof?.status === "blocked") {
    throw createBlockerError(
      "same_browser_backend_restart_proof_blocked",
      "The same-browser backend restart proof failed its document, Area, revalidation, or active network gate.",
      {
        endpoint: route,
        port: resolveUrlPort(route),
        sameBrowserRestartProof,
        networkCaptureSummary
      }
    );
  }
  const runtimeActionabilitySummary = buildRuntimeActionabilitySummary({
    domStatus,
    expectedAreaDetail,
    networkCaptureSummary,
    sampleLimit: actionabilitySampleLimit
  });
  const areaObjectSupportSurfaceSummary = buildAreaObjectSupportSurfaceSummary(
    domStatus.areaObjectSharedRendererSnapshot,
    {
      domStatus,
      openedArea,
      expectedArea
    }
  );
  const frame = {
    version: "aurora-areas-runtime-cdp-capture/v1",
    capturedAt: new Date().toISOString(),
    status: "captured",
    requestedRoute: route,
    finalRoute: domStatus.href,
    captureView: captureViewStatus,
    captureWorkspaceOptions: {
      tileOverlay: captureTileOverlay,
      tileLights: captureTileLights,
      displayFog: captureDisplayFog,
      useAreaLighting: captureUseAreaLighting,
      terrainVoidMasksVisible: captureTerrainVoidMasksVisible,
      terrainVoidMaskFilter: captureTerrainVoidMaskFilter,
      terrainMaterialMode: captureTerrainMaterialMode,
      removeObjectIds: captureRemoveObjectIds,
      isolateObjectId: captureIsolateObjectId,
      highlightObjectIds: captureHighlightObjectIds
    },
    areaEditingLocalBlank: captureAreaEditingLocalBlank,
    areaEditingScenario: areaEditingScenarioStatus,
    areaEditingScenarioArtifacts,
    areaEditingPreview: areaEditingPreviewStatus,
    areaEditingAction: areaEditingActionStatus,
    captureRemovedObjects: captureRemovedObjectsStatus,
    captureVisibility: captureVisibilityStatus,
    captureCeilingMeshes: captureCeilingMeshesStatus,
    target: {
      captureTarget,
      areaQuery,
      expectedArea,
      openedAreaMatchesExpected: domStatus.runtimeFreshness?.ok === true
    },
    areaQuery,
    openedArea,
    screenshotPath: pngPath,
    screenshotBytes: fs.statSync(pngPath).size,
    pageScreenshot,
    runtimeCanvasScreenshot,
    areaTileMutationRuntimeSettlement,
    postCaptureAreaTileMutationRuntimeSettlement,
    areaPresentedFrameFence,
    runtimeCanvasVisualEvidence,
    canvasVisualEvidence,
    framePath,
    timings: {
      authElapsedMs: timings.authElapsedMs,
      totalElapsedMs: Date.now() - timings.captureStartedAt,
      areasWorkspaceWaitElapsedMs: domStatus.areasWorkspaceWaitElapsedMs ?? null,
      captureWaitElapsedMs: domStatus.captureWaitElapsedMs ?? null
    },
    strictVisualMode: buildStrictVisualModeSuccess({
      requireScreenshot,
      screenshotEvidence
    }),
    runtimeEnvironmentPreflight,
    runtimeEnvironmentPostCapture,
    runtimeBuildProof,
    loginReady,
    seededAuth: {
      source: authBaseUrl,
      userId: seededAuthState.session.user.id,
      role: seededAuthState.session.user.role,
      permissionCount: seededAuthState.authorization.permissions.length
    },
    domStatus,
    terrainTileModelSnapshot: domStatus.terrainTileModelSnapshot,
    tileProcessRuntimeSnapshot: domStatus.tileProcessRuntimeSnapshot,
    areaObjectSharedRendererSnapshot: domStatus.areaObjectSharedRendererSnapshot,
    primitiveFallbackRenderSuppressionSnapshot:
      domStatus.primitiveFallbackRenderSuppressionSnapshot,
    expectedAreaDetailSummary: summarizeExpectedAreaDetail(expectedAreaDetail),
    areaObjectSupportSurfaceSummary,
    sameBrowserRestartProof,
    networkCaptureSummary,
    runtimeActionabilitySummary,
    runtimeBlockerSnapshot,
    captureMethod:
      "chrome-devtools-protocol Page.captureScreenshot plus direct WebGL canvas dataURL and data-area-terrain-tile-model-runtime-snapshot, data-area-tile-process-runtime-snapshot, shared renderer/placeable, loader, and blocker runtime datasets",
    chromeStderrTail: chromeStderr.slice(-1200),
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true
  };
  fs.writeFileSync(framePath, `${JSON.stringify(frame, null, 2)}\n`);
  lifecycleTrace?.record("frame-written", {
    framePath,
    totalElapsedMs: frame.timings?.totalElapsedMs ?? null
  });
  // A fresh canonical capture supersedes any previous failed attempt with the
  // same outDir/name; do not leave a stale failure frame beside green proof.
  fs.rmSync(failureFramePath, { force: true });
  return frame;
  } catch (error) {
    await enrichCaptureErrorWithNetwork(error, send, networkCapture);
    throw error;
  } finally {
    lifecycleTrace?.record("cdp-close-requested");
    ws.close();
  }
}

async function applyCaptureView(
  send,
  captureView,
  captureViewFocus = {},
  {
    cleanCanvas = false,
    tileLightsVisible = null,
    displayFog = null,
    useAreaLighting = null,
    terrainVoidMasksVisible = null,
    terrainVoidMaskFilter = {},
    terrainMaterialMode = null,
    renderPriorityObjectIds = []
  } = {}
) {
  if (captureView === "perspective" || captureView === "focused-perspective") {
    return applyFocusedPerspectiveCaptureView(send, captureView, captureViewFocus, {
      cleanCanvas,
      tileLightsVisible,
      displayFog,
      useAreaLighting,
      terrainVoidMasksVisible,
      terrainVoidMaskFilter,
      terrainMaterialMode,
      renderPriorityObjectIds
    });
  }
  if (captureView !== "top-down") {
    return {
      requested: captureView,
      applied: false,
      mode: "default",
      focus: normalizeCaptureViewFocusEvidence(captureViewFocus)
    };
  }
  const focus = normalizeCaptureViewFocusEvidence(captureViewFocus);
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const focus = ${JSON.stringify(focus)};
      const runtime = document.querySelector(".workspace-render-canvas");
      if (!runtime) {
        return {
          requested: "top-down",
          applied: false,
          ok: false,
          reason: "workspace_render_canvas_missing"
        };
      }
      runtime.dispatchEvent(
        new CustomEvent("aurora:areas:oracle-top-down-camera", {
          detail: {
            source: "areas-runtime-cdp-capture",
            cleanCanvas: ${JSON.stringify(cleanCanvas)},
            tileLightsVisible: ${JSON.stringify(tileLightsVisible)},
            displayFog: ${JSON.stringify(displayFog)},
            useAreaLighting: ${JSON.stringify(useAreaLighting)},
            renderPriorityObjectIds: ${JSON.stringify(renderPriorityObjectIds)},
            terrainVoidMasksVisible: ${JSON.stringify(terrainVoidMasksVisible)},
            terrainVoidMaskModelResRef: ${JSON.stringify(terrainVoidMaskFilter.modelResRef ?? null)},
            terrainVoidMaskSourceMesh: ${JSON.stringify(terrainVoidMaskFilter.sourceMesh ?? null)},
            terrainMaterialMode: ${JSON.stringify(terrainMaterialMode)},
            ...(typeof focus.worldX === "number" ? { targetX: focus.worldX } : {}),
            ...(typeof focus.worldY === "number" ? { targetY: focus.worldY } : {}),
            ...(typeof focus.worldZ === "number" ? { targetZ: focus.worldZ } : {}),
            ...(typeof focus.distance === "number" ? { distance: focus.distance } : {})
          }
        })
      );
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const dataset = runtime.dataset ?? {};
      return {
        requested: "top-down",
        applied: dataset.areaCameraFrameMode === "top_down_oracle",
        ok: dataset.areaCameraFrameMode === "top_down_oracle",
        mode: dataset.areaCameraFrameMode ?? null,
        source: dataset.areaCameraFrameSource ?? null,
        target: dataset.areaCameraFrameTarget ?? null,
        distance: dataset.areaCameraFrameDistance ?? null,
        size: dataset.areaCameraFrameSize ?? null,
        zoomRange: dataset.areaCameraFrameZoomRange ?? null,
        fov: dataset.areaCameraFrameFov ?? null,
        position: dataset.areaCameraFramePosition ?? null,
        actualTarget: dataset.areaCameraFrameActualTarget ?? null,
        up: dataset.areaCameraFrameUp ?? null,
        direction: dataset.areaCameraFrameDirection ?? null,
        actualDistance: dataset.areaCameraFrameActualDistance ?? null,
        focus,
        cleanCanvas: dataset.areaOracleCleanCanvas ?? null,
        cleanCanvasSource: dataset.areaOracleCleanCanvasSource ?? null,
        renderPriorityObjectIds: dataset.areaOracleRenderPriorityObjectIds ?? null,
        tileLightsVisible: dataset.areaOracleTileLightsVisible ?? null,
        displayFog: dataset.areaOracleDisplayFog ?? null,
        useAreaLighting: dataset.areaOracleUseAreaLighting ?? null,
        areaLightingLayerFound: dataset.areaOracleAreaLightingLayerFound ?? null,
        areaLightingLayerChildCount: dataset.areaOracleAreaLightingLayerChildCount ?? null,
        tileLightLayerFound: dataset.areaOracleTileLightLayerFound ?? null,
        tileLightLayerChildCount: dataset.areaOracleTileLightLayerChildCount ?? null,
        terrainVoidMasksVisible: dataset.areaOracleTerrainVoidMasksVisible ?? null,
        terrainVoidMaskCount: dataset.areaOracleTerrainVoidMaskCount ?? null,
        terrainVoidMaskMatchedCount: dataset.areaOracleTerrainVoidMaskMatchedCount ?? null,
        terrainVoidMaskFilterModelResRef: dataset.areaOracleTerrainVoidMaskFilterModelResRef ?? null,
        terrainVoidMaskFilterSourceMesh: dataset.areaOracleTerrainVoidMaskFilterSourceMesh ?? null,
        terrainMaterialMode: dataset.areaOracleTerrainMaterialMode ?? null,
        terrainMaterialConvertedCount: dataset.areaOracleTerrainMaterialConvertedCount ?? null,
        terrainMaterialLayerFound: dataset.areaOracleTerrainMaterialLayerFound ?? null
      };
    })()`
  });
  const value = result.result?.value ?? null;
  if (!value?.ok) {
    throw createBlockerError(
      "areas_capture_top_down_view_not_applied",
      "Areas runtime capture requested top-down oracle view, but the canvas did not acknowledge it.",
      {
        captureView,
        result: value
      }
    );
  }
  return value;
}

async function applyAreaEditingPlacementPreview(send, requestedPreview, requestedAction = "hover") {
  if (!requestedPreview) {
    return {
      requested: null,
      applied: false,
      ok: true,
      reason: "not_requested"
    };
  }

  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const requestedPreview = ${JSON.stringify(requestedPreview)};
      const requestedAction = ${JSON.stringify(requestedAction)};
      const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const nextFrame = () => new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      );
      const buttonByText = (label, root = document) =>
        Array.from(root.querySelectorAll("button")).find((button) => {
          const directLabel = button.querySelector(":scope > span")?.textContent?.trim();
          return button.textContent?.trim() === label || directLabel === label;
        }) ?? null;
      const waitFor = async (read, timeoutMs = 10000) => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const value = read();
          if (value) return value;
          await wait(100);
        }
        return null;
      };

      const panel = document.querySelector('.aurora-area-editing-panel');
      if (!panel) {
        return { requested: requestedPreview, applied: false, ok: false, reason: 'area_editing_panel_missing' };
      }
      const enableButton = buttonByText('Enable Aurora tile editing', panel);
      if (enableButton) {
        enableButton.click();
      }
      const terrainPalette = await waitFor(
        () => document.querySelector(
          '.aurora-area-editing-panel [role="group"][aria-label="Terrain palette"]'
        ),
        60_000
      );
      if (!terrainPalette) {
        return {
          requested: requestedPreview,
          applied: false,
          ok: false,
          reason: 'area_editing_payload_not_ready',
          alert: document.querySelector(
            '.aurora-area-editing-panel [role="alert"]'
          )?.textContent?.trim() ?? null
        };
      }
      const editingPanel = terrainPalette.closest('.aurora-area-editing-panel') ?? panel;

      let brushButton = null;
      if (requestedPreview === 'group') {
        const groupPalette = editingPanel.querySelector('[role="group"][aria-label="Tileset groups"]');
        brushButton = groupPalette?.querySelector('button') ?? null;
      } else if (requestedPreview === 'crosser') {
        const crosserPalette = editingPanel.querySelector('[role="group"][aria-label="Features and crossers palette"]');
        brushButton = crosserPalette?.querySelector('button') ?? null;
      } else if (requestedPreview === 'eraser') {
        brushButton = buttonByText('Eraser', editingPanel);
      } else {
        const terrainButtons = Array.from(terrainPalette.querySelectorAll('button'));
        brushButton = requestedAction === 'hover'
          ? terrainButtons[0] ?? null
          : terrainButtons[terrainButtons.length - 1] ?? null;
      }
      if (!brushButton) {
        return {
          requested: requestedPreview,
          applied: false,
          ok: false,
          reason: requestedPreview === 'group'
            ? 'tileset_group_brush_missing'
            : requestedPreview === 'crosser'
              ? 'crosser_brush_missing'
              : requestedPreview === 'eraser'
                ? 'eraser_brush_missing'
                : 'terrain_brush_missing'
        };
      }
      brushButton.click();

      let selectTerrainButton = buttonByText('Select Terrain');
      if (!selectTerrainButton) {
        const selectionTab = buttonByText('Selection');
        if (selectionTab) {
          selectionTab.click();
          await nextFrame();
          selectTerrainButton = await waitFor(() => buttonByText('Select Terrain'));
        }
      }
      if (selectTerrainButton) {
        selectTerrainButton.click();
      } else {
        return { requested: requestedPreview, applied: false, ok: false, reason: 'select_terrain_action_missing' };
      }
      await nextFrame();

      let stableEditingCanvas = null;
      let stableEditingState = null;
      let stableEditingPollCount = 0;
      const canvas = await waitFor(
        () => {
          const candidate = document.querySelector('.workspace-render-canvas');
          const proofState = candidate?.dataset.areaEditingProofState ?? null;
          if (!candidate || !proofState || !document.contains(candidate)) {
            stableEditingCanvas = null;
            stableEditingState = null;
            stableEditingPollCount = 0;
            return null;
          }
          if (candidate === stableEditingCanvas && proofState === stableEditingState) {
            stableEditingPollCount += 1;
          } else {
            stableEditingCanvas = candidate;
            stableEditingState = proofState;
            stableEditingPollCount = 1;
          }
          return stableEditingPollCount >= 3 ? candidate : null;
        },
        30_000
      );
      if (!canvas) {
        return {
          requested: requestedPreview,
          applied: false,
          ok: false,
          reason: 'workspace_area_editing_scene_not_synchronized'
        };
      }
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return { requested: requestedPreview, applied: false, ok: false, reason: 'workspace_render_canvas_has_no_layout' };
      }
      // The loading progress card occupies the visual center. The left Area
      // diamond band remains visible and hit-tests to the canvas at this pose.
      const clientX = rect.left + rect.width * 0.39;
      const clientY = rect.top + rect.height * 0.5;
      const hitTarget = document.elementFromPoint(clientX, clientY);
      const hitTargetIsCanvas = Boolean(hitTarget?.closest('.workspace-render-canvas'));
      for (let attempt = 0; attempt < 50; attempt += 1) {
        canvas.dispatchEvent(new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX,
          clientY,
          buttons: 0
        }));
        await nextFrame();
        if (
          canvas.dataset.areaTilePlacementPreviewStatus === 'visible' &&
          Number(canvas.dataset.areaTilePlacementPreviewCellCount ?? 0) > 0
        ) {
          break;
        }
        await wait(100);
      }

      const previewStatus = canvas.dataset.areaTilePlacementPreviewStatus ?? null;
      const previewCellCount = Number(canvas.dataset.areaTilePlacementPreviewCellCount ?? 0);
      const previewVisible = previewStatus === 'visible' && previewCellCount > 0;
      const previewEvidence = {
        valid: canvas.dataset.areaTilePlacementPreviewValid ?? null,
        cells: canvas.dataset.areaTilePlacementPreviewCells ?? null,
        kind: canvas.dataset.areaTilePlacementPreviewKind ?? null,
        anchor: canvas.dataset.areaTilePlacementPreviewAnchor ?? null,
        targetEdge: canvas.dataset.areaTilePlacementPreviewTargetEdge || null
      };
      const parseDatasetJson = (value) => {
        try {
          return value ? JSON.parse(value) : null;
        } catch {
          return null;
        }
      };
      const readProofSnapshot = () => ({
        state: parseDatasetJson(canvas.dataset.areaEditingProofState),
        tool: parseDatasetJson(canvas.dataset.areaEditingProofTool),
        history: {
          pastCount: Number(canvas.dataset.areaEditingProofHistoryPastCount ?? 0),
          futureCount: Number(canvas.dataset.areaEditingProofHistoryFutureCount ?? 0)
        },
        selectedGroupText:
          editingPanel.querySelector('[aria-label="Selected SET group"]')?.textContent?.trim() ?? null
      });
      const before = readProofSnapshot();

      return {
        requested: requestedPreview,
        requestedAction,
        applied: previewVisible,
        ok: previewVisible,
        reason: previewVisible ? null : 'area_tile_placement_preview_overlay_not_visible',
        brush: brushButton.textContent?.trim() ?? null,
        brushPressed: brushButton.getAttribute('aria-pressed'),
        terrainSelectionActive: selectTerrainButton?.classList.contains('is-active') ?? null,
        terrainSelectionSource: 'toolbar-button',
        hover: {
          clientX: Math.round(clientX),
          clientY: Math.round(clientY),
          hitTargetIsCanvas,
          hitTargetClassName: typeof hitTarget?.className === 'string' ? hitTarget.className : null,
          hitTargetTagName: hitTarget?.tagName ?? null
        },
        canvasSceneId: canvas.dataset.currentSceneId ?? null,
        canvasSceneSize: canvas.dataset.currentSceneSize ?? null,
        previewStatus,
        previewCellCount,
        previewValid: previewEvidence.valid,
        previewCells: previewEvidence.cells,
        previewKind: previewEvidence.kind,
        previewAnchor: parseDatasetJson(previewEvidence.anchor),
        targetEdge: previewEvidence.targetEdge,
        commit: requestedAction === 'hover'
          ? { requested: false, applied: false, before, after: null }
          : { requested: true, applied: false, before, after: null }
      };
    })()`
  });
  const value = result.result?.value ?? {
    requested: requestedPreview,
    applied: false,
    ok: false,
    reason: "area_editing_preview_result_missing"
  };
  if (value.ok !== true) {
    return value;
  }

  const clientX = Number(value.hover?.clientX);
  const clientY = Number(value.hover?.clientY);
  await send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: clientX,
    y: clientY,
    button: "none",
    buttons: 0
  });
  const browserHover = await readAreaEditingPreviewEvidence(send);
  if (requestedAction === "hover") {
    return {
      ...value,
      ok: browserHover?.visible === true,
      reason: browserHover?.visible === true
        ? null
        : "trusted_area_editing_hover_not_observed",
      previewStatus: browserHover?.status ?? value.previewStatus,
      previewCellCount: browserHover?.cellCount ?? value.previewCellCount,
      previewValid: browserHover?.valid ?? value.previewValid,
      previewCells: browserHover?.cells ?? value.previewCells,
      previewKind: browserHover?.kind ?? value.previewKind,
      previewAnchor: browserHover?.anchor ?? value.previewAnchor,
      targetEdge: browserHover?.targetEdge ?? value.targetEdge,
      pointerDispatch: {
        source: "chrome-devtools-protocol-input",
        trustedBrowserInput: true,
        clientX,
        clientY,
        sequence: ["mouseMoved"]
      }
    };
  }
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: clientX,
    y: clientY,
    button: "left",
    buttons: 1,
    clickCount: 1
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: clientX,
    y: clientY,
    button: "left",
    buttons: 0,
    clickCount: 1
  });
  const afterCommit = await waitForAreaEditingProofMutation(send, value.commit.before);
  return {
    ...value,
    ok: Boolean(afterCommit),
    reason: afterCommit ? null : "area_editing_pointer_commit_not_observed",
    commit: {
      requested: true,
      applied: Boolean(afterCommit),
      before: value.commit.before,
      after: afterCommit
    },
    pointerDispatch: {
      source: "chrome-devtools-protocol-input",
      trustedBrowserInput: true,
      clientX,
      clientY,
      sequence: ["mouseMoved", "mousePressed", "mouseReleased"]
    }
  };
}

async function readAreaEditingPreviewEvidence(send) {
  const result = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const canvas = document.querySelector('.workspace-render-canvas');
      if (!canvas) return null;
      const status = canvas.dataset.areaTilePlacementPreviewStatus ?? null;
      const cellCount = Number(canvas.dataset.areaTilePlacementPreviewCellCount ?? 0);
      const parse = (value) => { try { return value ? JSON.parse(value) : null; } catch { return value ?? null; } };
      return {
        visible: status === 'visible' && cellCount > 0,
        status,
        cellCount,
        valid: canvas.dataset.areaTilePlacementPreviewValid ?? null,
        cells: canvas.dataset.areaTilePlacementPreviewCells ?? null,
        kind: canvas.dataset.areaTilePlacementPreviewKind ?? null,
        anchor: parse(canvas.dataset.areaTilePlacementPreviewAnchor),
        targetEdge: canvas.dataset.areaTilePlacementPreviewTargetEdge || null
      };
    })()`
  });
  return result.result?.value ?? null;
}

async function waitForAreaEditingProofMutation(send, before, timeoutMs = 10000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const canvas = document.querySelector('.workspace-render-canvas');
        if (!canvas) return null;
        const parse = (value) => { try { return value ? JSON.parse(value) : null; } catch { return null; } };
        return {
          state: parse(canvas.dataset.areaEditingProofState),
          tool: parse(canvas.dataset.areaEditingProofTool),
          history: {
            pastCount: Number(canvas.dataset.areaEditingProofHistoryPastCount ?? 0),
            futureCount: Number(canvas.dataset.areaEditingProofHistoryFutureCount ?? 0)
          },
          selectedGroupText:
            document.querySelector('.aurora-area-editing-panel [aria-label="Selected SET group"]')?.textContent?.trim() ?? null
        };
      })()`
    });
    const snapshot = result.result?.value ?? null;
    if (
      snapshot &&
      JSON.stringify(snapshot.state) !== JSON.stringify(before.state) &&
      snapshot.history.pastCount > before.history.pastCount
    ) {
      return snapshot;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return null;
}

async function applyAreaEditingUndo(send, expectedBeforeState, expectedTool) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const expectedBeforeState = ${JSON.stringify(expectedBeforeState)};
      const expectedTool = ${JSON.stringify(expectedTool)};
      const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const waitFor = async (read, timeoutMs = 10000) => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const value = read();
          if (value) return value;
          await wait(100);
        }
        return null;
      };
      const buttonByText = (label) =>
        Array.from(document.querySelectorAll('button')).find((button) => {
          const directLabel = button.querySelector(':scope > span')?.textContent?.trim();
          return button.textContent?.trim() === label || directLabel === label;
        }) ?? null;
      const canvas = document.querySelector('.workspace-render-canvas');
      const undoButton = buttonByText('Undo');
      if (!canvas || !undoButton) {
        return {
          requested: true,
          applied: false,
          ok: false,
          reason: !canvas ? 'workspace_render_canvas_missing' : 'undo_button_missing'
        };
      }
      const parseDatasetJson = (value) => {
        try { return value ? JSON.parse(value) : null; } catch { return null; }
      };
      const readProofSnapshot = () => ({
        state: parseDatasetJson(canvas.dataset.areaEditingProofState),
        tool: parseDatasetJson(canvas.dataset.areaEditingProofTool),
        history: {
          pastCount: Number(canvas.dataset.areaEditingProofHistoryPastCount ?? 0),
          futureCount: Number(canvas.dataset.areaEditingProofHistoryFutureCount ?? 0)
        }
      });
      const beforeUndo = readProofSnapshot();
      undoButton.click();
      const afterUndo = await waitFor(() => {
        const snapshot = readProofSnapshot();
        return JSON.stringify(snapshot.state) === JSON.stringify(expectedBeforeState) &&
          snapshot.history.pastCount < beforeUndo.history.pastCount &&
          snapshot.history.futureCount > beforeUndo.history.futureCount
          ? snapshot
          : null;
      });
      const restored = Boolean(afterUndo);
      const toolStillArmed = restored && JSON.stringify(afterUndo.tool) === JSON.stringify(expectedTool);
      return {
        requested: true,
        applied: restored,
        ok: restored && toolStillArmed,
        reason: !restored
          ? 'area_editing_undo_restoration_not_observed'
          : !toolStillArmed
            ? 'area_editing_tool_not_armed_after_undo'
            : null,
        before: beforeUndo,
        after: afterUndo,
        restorationMatchesBefore: restored,
        toolStillArmed
      };
    })()`
  });
  return result.result?.value ?? {
    requested: true,
    applied: false,
    ok: false,
    reason: "area_editing_undo_result_missing"
  };
}

/**
 * Runs an end-to-end editor scenario exclusively through the rendered UI and
 * trusted CDP pointer input. The dev-only datasets are witnesses, never a
 * mutation backdoor: every state transition must be accompanied by its exact
 * history/selection delta or the scenario fails closed with a named reason.
 */
async function executeAreaEditingRuntimeScenario({
  send,
  scenario,
  groupId,
  tileId,
  matrixChunk,
  openedArea,
  initialSceneKey
}) {
  const mutatesScene = AREA_EDITING_MUTATING_SCENARIOS.has(scenario);
  const prepared = await prepareAreaEditingRuntimeScenario(send, scenario);
  if (!prepared.ok) return { ...prepared, scenario, mutatesScene };

  let before = await readAreaEditingScenarioSnapshot(send);
  if (!before?.state) {
    return scenarioFailure(scenario, mutatesScene, "area_editing_proof_state_missing", { before });
  }

  if (scenario === "group-base-height" && before.state.areaResRef === "_winds_study") {
    return executeChainedGroupBaseHeightScenario({
      send,
      scenario,
      openedArea,
      initialSceneKey,
      before
    });
  }
  if (scenario === "multi-copy-paste" || scenario === "multi-copy-paste-local") {
    return executeMultiCopyPasteScenario({ send, scenario, before });
  }
  if (scenario === "tile-properties") {
    return executeTilePropertiesScenario({ send, scenario, before });
  }
  if (scenario === "tile-transform-local") {
    return executeTileTransformLocalScenario({ send, scenario, before });
  }
  if (scenario === "tile-replace-local") {
    return executeTileReplaceLocalScenario({ send, scenario, tileId, before });
  }
  if (scenario === "tile-add-connect-matrix-local") {
    return executeTileAddConnectMatrixLocalScenario({ send, scenario, matrixChunk, before });
  }
  if (scenario === "group-placement-local") {
    return executeGroupPlacementLocalScenario({ send, scenario, groupId, before });
  }
  if (scenario === "eraser-local") {
    return executeEraserLocalScenario({ send, scenario, groupId, before });
  }

  if (scenario === "multi-select") {
    // Inspect mode intentionally has no placement-preview overlay. Temporarily
    // arm a non-mutating terrain hover so the renderer can expose an exact
    // cell-to-screen map, then switch back to Inspect before trusted clicks.
    const mappingTool = await armAreaEditingTool(send, "terrain");
    if (!mappingTool.ok) {
      return scenarioFailure(scenario, false, "multi_select_mapping_tool_not_armed", {
        mappingTool
      });
    }
    const cellMap = await collectAreaEditingCellScreenMap(send);
    const targets = chooseDistinctCellTargets(cellMap, 2);
    if (targets.length !== 2) {
      return scenarioFailure(scenario, false, "multi_select_two_runtime_cells_not_found", {
        mappedCellCount: cellMap.length
      });
    }
    await armAreaEditingTool(send, "inspect");
    before = await readAreaEditingScenarioSnapshot(send);
    await dispatchTrustedClick(send, targets[0], { modifiers: 0 });
    const firstSelection = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
      snapshot.selection?.tileIds?.length === 1
    );
    if (!firstSelection) {
      return scenarioFailure(scenario, false, "multi_select_anchor_selection_not_observed", {
        target: targets[0],
        current: await readAreaEditingScenarioSnapshot(send)
      });
    }
    await dispatchTrustedClick(send, targets[1], { modifiers: 2 });
    const commit = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
      snapshot.selection?.tileIds?.length === 2
    );
    const stateUnchanged = jsonEqual(commit?.state, before.state);
    const historyUnchanged = historyEquals(commit?.history, before.history);
    const selectedCells = commit?.selection?.cells ?? [];
    const exactSelection = selectedCells.length === 2 &&
      new Set(selectedCells.map(cellKey)).size === 2;
    const ok = Boolean(commit) && stateUnchanged && historyUnchanged && exactSelection;
    return {
      ok,
      reason: ok ? null : "multi_select_exact_delta_mismatch",
      scenario,
      mutatesScene: false,
      before,
      commit,
      undo: { applicable: false, reason: "selection_is_not_scene_history", snapshot: commit },
      redo: { applicable: false, reason: "selection_is_not_scene_history", snapshot: commit },
      assertions: { stateUnchanged, historyUnchanged, selectedTileCount: selectedCells.length, exactSelection },
      pointerDispatch: { source: "chrome-devtools-protocol-input", trustedBrowserInput: true }
    };
  }

  const action = await performAreaEditingScenarioCommit(send, scenario, before);
  if (!action.ok) return { ...action, scenario, mutatesScene };
  const commit = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    !jsonEqual(snapshot.state, before.state) &&
    snapshot.history.pastCount === before.history.pastCount + 1 &&
    snapshot.history.futureCount === 0
  );
  if (!commit) {
    return scenarioFailure(scenario, true, "scenario_commit_history_delta_not_observed", {
      before,
      action,
      current: await readAreaEditingScenarioSnapshot(send)
    });
  }
  const scenarioInvariant = verifyAreaEditingScenarioCommitInvariant(scenario, before, commit);
  if (!scenarioInvariant.ok) {
    return scenarioFailure(scenario, true, scenarioInvariant.reason, { before, commit, action, scenarioInvariant });
  }

  const undoButton = await findAreaEditingButtonCenter(send, ["Undo tile edit", "Undo"]);
  if (!undoButton) {
    return scenarioFailure(scenario, true, "scenario_undo_button_missing", { before, commit });
  }
  await dispatchTrustedClick(send, undoButton);
  const undoSnapshot = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, before.state) &&
    snapshot.history.pastCount === before.history.pastCount &&
    snapshot.history.futureCount === before.history.futureCount + 1
  );
  if (!undoSnapshot) {
    return scenarioFailure(scenario, true, "scenario_undo_exact_restoration_not_observed", {
      before,
      commit,
      current: await readAreaEditingScenarioSnapshot(send)
    });
  }

  const redoButton = await findAreaEditingButtonCenter(send, ["Redo tile edit", "Redo"]);
  if (!redoButton) {
    return scenarioFailure(scenario, true, "scenario_redo_button_missing", { undo: undoSnapshot });
  }
  await dispatchTrustedClick(send, redoButton);
  const redoSnapshot = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, commit.state) &&
    snapshot.history.pastCount === commit.history.pastCount &&
    snapshot.history.futureCount === commit.history.futureCount
  );
  if (!redoSnapshot) {
    return scenarioFailure(scenario, true, "scenario_redo_exact_restoration_not_observed", {
      commit,
      undo: undoSnapshot,
      current: await readAreaEditingScenarioSnapshot(send)
    });
  }

  return {
    ok: true,
    reason: null,
    scenario,
    mutatesScene: true,
    ...(scenario === "area-rotate-rectangular-local"
      ? {
          requiresTileProcessSceneKeyChange: false,
          requiresPostMutationSettlement: true,
          postMutationAreaExpectation: {
            ...(openedArea.areaExpectation ?? {}),
            width: commit.state.width,
            height: commit.state.height
          }
        }
      : {}),
    before,
    commit,
    undo: { applicable: true, snapshot: undoSnapshot },
    redo: { applicable: true, snapshot: redoSnapshot },
    action,
    assertions: {
      commitHistoryDelta: 1,
      commitClearedFuture: true,
      undoRestoredExactState: true,
      redoRestoredExactState: true,
      scenarioInvariant
    },
    pointerDispatch: { source: "chrome-devtools-protocol-input", trustedBrowserInput: true }
  };
}

async function executeTileTransformLocalScenario({ send, scenario, before }) {
  // This is intentionally a tiny, visible mutation proof for a freshly created
  // local Area: it selects one rendered cell and uses the same inspector buttons
  // exposed to an editor, then proves the two history commands can be undone and
  // redone.  It avoids a placement tool, so the before/after frames stay legible.
  await armAreaEditingTool(send, "terrain");
  // A freshly created Aurora Area can legitimately use an unpaintable default
  // surface (for example TMD19A's `Default=Solid` black floor).  This proof
  // only needs a raycastable tile to select and transform in Inspect mode;
  // placement validity belongs to a later paint operation and must not hide
  // otherwise editable cells from the audit.
  const cellMap = await collectAreaEditingCellScreenMap(send);
  // A tileset can choose a grouped tile as its default terrain (for example
  // sic11). Individual height controls are intentionally disabled for those
  // cells, so a generic tile-transform proof must select a visible loose cell.
  const groupedIds = new Set(
    (before.state.groupInstances ?? []).flatMap((group) => group.tileIds)
  );
  const groupedCells = new Set(
    (before.state.groupInstances ?? []).flatMap((group) =>
      (group.cells ?? []).map((cell) => `${cell.row}:${cell.col}`)
    )
  );
  const target = cellMap.find((cell) => {
    const tile = before.state.tiles.find((candidate) =>
      candidate.row === cell.row && candidate.col === cell.col
    );
    return tile && !groupedIds.has(tile.id) && !groupedCells.has(`${cell.row}:${cell.col}`);
  }) ?? null;
  if (!target) {
    return scenarioFailure(scenario, true, "tile_transform_local_loose_cell_not_found", {
      visibleCellCount: cellMap.length,
      groupedCellCount: Math.max(groupedIds.size, groupedCells.size)
    });
  }
  await armAreaEditingTool(send, "inspect");
  await dispatchTrustedClick(send, target);
  const selected = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    snapshot.selection?.cells?.length === 1 &&
    snapshot.selection.cells[0].row === target.row &&
    snapshot.selection.cells[0].col === target.col
  );
  if (!selected) return scenarioFailure(scenario, true, "tile_transform_local_target_not_selected", { target });
  const sourceTile = before.state.tiles.find((tile) =>
    tile.row === target.row && tile.col === target.col
  );
  if (!sourceTile) return scenarioFailure(scenario, true, "tile_transform_local_source_tile_missing", { target });

  const rotateButton = await findAreaEditingButtonCenter(send, ["Rotate tile right"]);
  if (!rotateButton) return scenarioFailure(scenario, true, "tile_transform_local_rotate_button_missing");
  await dispatchTrustedClick(send, rotateButton);
  const rotated = await waitForAreaEditingScenarioSnapshot(send, (snapshot) => {
    const tile = snapshot.state?.tiles?.find((candidate) => candidate.id === sourceTile.id);
    return tile?.orientation === (sourceTile.orientation + 1) % 4 &&
      snapshot.history?.pastCount === before.history.pastCount + 1 &&
      snapshot.history?.futureCount === 0;
  });
  if (!rotated) return scenarioFailure(scenario, true, "tile_transform_local_rotate_not_observed", { target });

  const heightButton = await findAreaEditingButtonCenter(send, ["Tile height +"]);
  if (!heightButton) return scenarioFailure(scenario, true, "tile_transform_local_height_button_missing");
  await dispatchTrustedClick(send, heightButton);
  const commit = await waitForAreaEditingScenarioSnapshot(send, (snapshot) => {
    const tile = snapshot.state?.tiles?.find((candidate) => candidate.id === sourceTile.id);
    return tile?.orientation === (sourceTile.orientation + 1) % 4 &&
      tile?.height === sourceTile.height + 1 &&
      snapshot.history?.pastCount === before.history.pastCount + 2 &&
      snapshot.history?.futureCount === 0;
  });
  if (!commit) {
    const lastSnapshot = await readAreaEditingScenarioSnapshot(send);
    const panelDiagnosticsResult = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const panel = document.querySelector(".aurora-area-editing-panel");
        const selectedStatus = panel?.querySelector('[role="status"]');
        const alerts = Array.from(
          panel?.querySelectorAll('[role="alert"]') ?? []
        ).map((entry) => entry.textContent?.replace(/\\s+/gu, " ").trim() ?? "");
        return {
          selectedStatus:
            selectedStatus?.textContent?.replace(/\\s+/gu, " ").trim() ?? null,
          alerts
        };
      })()`
    });
    return scenarioFailure(
      scenario,
      true,
      "tile_transform_local_height_not_observed",
      {
        target,
        sourceTile,
        rotatedState: rotated.state,
        lastSnapshot,
        panelDiagnostics: panelDiagnosticsResult.result?.value ?? null
      }
    );
  }

  const undoButton = await findAreaEditingButtonCenter(send, ["Undo tile edit", "Undo"]);
  if (!undoButton) return scenarioFailure(scenario, true, "tile_transform_local_undo_button_missing");
  await dispatchTrustedClick(send, undoButton);
  const undoHeight = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, rotated.state) && snapshot.history?.pastCount === rotated.history.pastCount
  );
  await dispatchTrustedClick(send, undoButton);
  const undo = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, before.state) && snapshot.history?.pastCount === before.history.pastCount
  );
  if (!undoHeight || !undo) return scenarioFailure(scenario, true, "tile_transform_local_undo_not_restored");

  const redoButton = await findAreaEditingButtonCenter(send, ["Redo tile edit", "Redo"]);
  if (!redoButton) return scenarioFailure(scenario, true, "tile_transform_local_redo_button_missing");
  await dispatchTrustedClick(send, redoButton);
  const redoRotate = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, rotated.state) && snapshot.history?.pastCount === rotated.history.pastCount
  );
  await dispatchTrustedClick(send, redoButton);
  const redo = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, commit.state) && snapshot.history?.pastCount === commit.history.pastCount
  );
  if (!redoRotate || !redo) return scenarioFailure(scenario, true, "tile_transform_local_redo_not_restored");

  return {
    ok: true,
    scenario,
    mutatesScene: true,
    requiresTileProcessSceneKeyChange: false,
    requiresPostMutationSettlement: true,
    before,
    selected,
    rotated,
    commit,
    undo: { applicable: true, height: undoHeight, snapshot: undo },
    redo: { applicable: true, rotate: redoRotate, snapshot: redo },
    action: {
      kind: "trusted-inspector-tile-transform",
      cell: { row: target.row, col: target.col },
      orientation: { before: sourceTile.orientation, after: (sourceTile.orientation + 1) % 4 },
      height: { before: sourceTile.height, after: sourceTile.height + 1 }
    },
    assertions: {
      historyCommandCount: 2,
      rotateApplied: true,
      heightApplied: true,
      undoRestoredExactState: true,
      redoRestoredExactState: true
    },
    pointerDispatch: { source: "chrome-devtools-protocol-input", trustedBrowserInput: true }
  };
}

async function executeTileReplaceLocalScenario({ send, scenario, tileId, before }) {
  if (!Number.isInteger(tileId)) {
    return scenarioFailure(scenario, true, "tile_replace_local_tile_id_missing");
  }
  await armAreaEditingTool(send, "terrain");
  // Replacing a cell that already has the requested Tile_ID is a valid UI
  // action but a no-op, so it cannot prove the exact undo/redo contract.
  const target = (await collectAreaEditingCellScreenMap(send)).find((candidate) =>
    before.state.tiles.some(
      (tile) => tile.row === candidate.row && tile.col === candidate.col && tile.tileId !== tileId
    )
  ) ?? null;
  if (!target) return scenarioFailure(scenario, true, "tile_replace_local_cell_missing");
  await armAreaEditingTool(send, "inspect");
  await dispatchTrustedClick(send, target);
  const selected = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    snapshot.selection?.cells?.[0]?.row === target.row && snapshot.selection?.cells?.[0]?.col === target.col
  );
  if (!selected) return scenarioFailure(scenario, true, "tile_replace_local_target_not_selected", { target });
  const setResult = await send("Runtime.evaluate", { returnByValue: true, expression: `(() => {
    const select = document.querySelector('select[aria-label="Replace Tile_ID"]');
    const option = select ? Array.from(select.options).find((item) => item.value === ${JSON.stringify(String(tileId))}) : null;
    if (!select || !option || select.disabled) return { ok: false, reason: 'tile_id_not_available_in_rendered_selector' };
    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    setter?.call(select, option.value); select.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, value: select.value };
  })()` });
  if (!setResult.result?.value?.ok) return scenarioFailure(scenario, true, "tile_replace_local_selector_not_available", { tileId, setResult: setResult.result?.value });
  const apply = await findAreaEditingButtonCenter(send, ["Apply exact Tile_ID fixture", "Apply Tile_ID"]);
  if (!apply) return scenarioFailure(scenario, true, "tile_replace_local_apply_missing");
  const pointerDispatch = await dispatchTrustedClick(send, apply);
  const commit = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    snapshot.state?.tiles?.some((tile) => tile.row === target.row && tile.col === target.col && tile.tileId === tileId) &&
    snapshot.history?.pastCount === before.history.pastCount + 1
  );
  if (!commit) return scenarioFailure(scenario, true, "tile_replace_local_commit_not_observed", { tileId, target });
  const history = await applyExactScenarioUndoRedo(send, before, commit);
  if (!history.ok) return scenarioFailure(scenario, true, history.reason, history);
  return {
    ok: true,
    scenario,
    mutatesScene: true,
    // The tile-process scene key intentionally contains only the unique
    // model-resref set. Replacing a cell with a model already used elsewhere
    // changes the full tile-state digest and terrain build without necessarily
    // changing that set. The post-mutation settlement below still requires the
    // exact mutation revision/digest, converged contract readiness, terrain
    // build, camera frame, and presented-frame fence.
    requiresTileProcessSceneKeyChange: false,
    requiresPostMutationSettlement: true,
    before,
    selected,
    commit,
    undo: history.undo,
    redo: history.redo,
    action: { kind: "inspector-tile-id-replace", tileId, cell: target },
    assertions: { undoRestoredExactState: true, redoRestoredExactState: true },
    pointerDispatch
  };
}

/**
 * Places one bounded matrix of explicit Tile_ID fixtures through the same
 * rendered inspector controls as a human author.  The chunk deliberately
 * stays inside one transient local Area: no API write, saved module or hidden
 * state injection is allowed. One visible batch command must prove every
 * requested cell together with its exact single history delta.
 */
async function executeTileAddConnectMatrixLocalScenario({ send, scenario, matrixChunk, before }) {
  if (!matrixChunk) {
    return scenarioFailure(scenario, true, "tile_add_connect_matrix_chunk_missing");
  }
  const chunkErrors = validateMatrixChunk(matrixChunk);
  if (chunkErrors.length > 0) {
    return scenarioFailure(scenario, true, "tile_add_connect_matrix_chunk_invalid", { chunkErrors });
  }
  if (matrixChunk.kind === "group") {
    return executeTileAddConnectGroupMatrixLocalScenario({ send, scenario, matrixChunk, before });
  }
  const expectedCellCount = matrixChunk.width * matrixChunk.height;
  if (before.state?.tiles?.length !== expectedCellCount) {
    return scenarioFailure(scenario, true, "tile_add_connect_matrix_initial_area_shape_mismatch", {
      expectedCellCount,
      observedTileCount: before.state?.tiles?.length ?? null,
      width: before.state?.width ?? null,
      height: before.state?.height ?? null
    });
  }
  const availableTileIds = await readAreaEditingReplaceableTileIds(send);
  const requestedCells = matrixChunk.cases
    .flatMap((matrixCase) => matrixCase.cells.map((cell) => ({ ...cell, rowId: matrixCase.rowId })))
    .sort((left, right) => left.row - right.row || left.col - right.col);
  const unavailable = requestedCells.filter((cell) => !availableTileIds.includes(cell.tileId));
  if (unavailable.length > 0) {
    return scenarioFailure(scenario, true, "tile_add_connect_matrix_tile_id_not_available", {
      unavailable: unavailable.slice(0, 16),
      unavailableCount: unavailable.length,
      availableTileIdCount: availableTileIds.length
    });
  }

  const applied = await applyMatrixFixtureBatchThroughInspector(send, before, requestedCells);
  if (!applied.ok) return scenarioFailure(scenario, true, applied.reason, { apply: applied });
  const current = applied.snapshot;
  const commands = [applied.command];

  const coverage = verifyTileAddConnectMatrixCoverage(current, matrixChunk);
  if (!coverage.ok) {
    return scenarioFailure(scenario, true, "tile_add_connect_matrix_final_coverage_mismatch", {
      chunkId: matrixChunk.id,
      coverage,
      final: current
    });
  }
  return {
    ok: true,
    scenario,
    mutatesScene: true,
    requiresTileProcessSceneKeyChange: false,
    requiresPostMutationSettlement: true,
    before,
    commit: current,
    undo: { applicable: false, reason: "matrix-final-state-proof" },
    redo: { applicable: false, reason: "matrix-final-state-proof" },
    action: {
      kind: "trusted-inspector-tile-add-connect-matrix",
      chunkId: matrixChunk.id,
      tilesetResRef: matrixChunk.tilesetResRef,
      sourcePath: matrixChunk.sourcePath ?? null,
      requestedCellCount: requestedCells.length,
      commandCount: commands.length,
      commands
    },
    coverage,
    assertions: {
      exactFixtureTileIds: true,
      sourceAndPartnerAdjacency: true,
      historyCommandCount: commands.length,
      historyDelta: current.history.pastCount - before.history.pastCount
    },
    pointerDispatch: { source: "chrome-devtools-protocol-input", trustedBrowserInput: true }
  };
}

async function executeTileAddConnectGroupMatrixLocalScenario({ send, scenario, matrixChunk, before }) {
  const expectedCellCount = matrixChunk.width * matrixChunk.height;
  if (before.state?.tiles?.length !== expectedCellCount) {
    return scenarioFailure(scenario, true, "tile_add_connect_group_matrix_initial_area_shape_mismatch", {
      expectedCellCount,
      observedTileCount: before.state?.tiles?.length ?? null,
      width: before.state?.width ?? null,
      height: before.state?.height ?? null
    });
  }
  let requestedBackgroundCells;
  try {
    requestedBackgroundCells = buildGroupChunkBackgroundFixture(matrixChunk);
  } catch (error) {
    return scenarioFailure(scenario, true, "tile_add_connect_group_matrix_background_fixture_invalid", {
      chunkId: matrixChunk.id,
      backgroundTileId: matrixChunk.backgroundTileId ?? null,
      message: error instanceof Error ? error.message : String(error)
    });
  }
  const availableTileIds = await readAreaEditingReplaceableTileIds(send);
  const backgroundTileId = requestedBackgroundCells[0].tileId;
  if (!availableTileIds.includes(backgroundTileId)) {
    return scenarioFailure(scenario, true, "tile_add_connect_group_matrix_background_tile_id_not_available", {
      backgroundTileId,
      availableTileIdCount: availableTileIds.length
    });
  }
  const underlay = await applyMatrixFixtureBatchThroughInspector(send, before, requestedBackgroundCells);
  if (!underlay.ok) {
    return scenarioFailure(scenario, true, "tile_add_connect_group_matrix_background_apply_failed", { apply: underlay });
  }
  const requestedGroups = matrixChunk.cases.map((matrixCase) => ({
    groupId: matrixCase.groupId,
    row: matrixCase.anchor.row,
    col: matrixCase.anchor.col,
    orientation: 0
  }));
  const applied = await applyMatrixGroupFixtureBatchThroughInspector(send, underlay.snapshot, requestedGroups, matrixChunk);
  if (!applied.ok) return scenarioFailure(scenario, true, applied.reason, { apply: applied });
  const current = applied.snapshot;
  const commands = [underlay.command, applied.command];
  const coverage = verifyTileAddConnectGroupMatrixCoverage(current, matrixChunk);
  if (!coverage.ok) {
    return scenarioFailure(scenario, true, "tile_add_connect_group_matrix_final_coverage_mismatch", {
      chunkId: matrixChunk.id,
      coverage,
      final: current
    });
  }
  return {
    ok: true,
    scenario,
    mutatesScene: true,
    requiresTileProcessSceneKeyChange: false,
    requiresPostMutationSettlement: true,
    before,
    commit: current,
    undo: { applicable: false, reason: "matrix-final-state-proof" },
    redo: { applicable: false, reason: "matrix-final-state-proof" },
    action: {
      kind: "trusted-inspector-tile-add-connect-group-matrix",
      chunkId: matrixChunk.id,
      tilesetResRef: matrixChunk.tilesetResRef,
      sourcePath: matrixChunk.sourcePath ?? null,
      requestedGroupCount: requestedGroups.length,
      requestedMemberTileCount: matrixChunk.memberTileCount,
      backgroundTileId,
      backgroundCellCount: requestedBackgroundCells.length,
      commandCount: commands.length,
      commands
    },
    coverage,
    assertions: {
      exactFixtureTileIds: true,
      declaredGroupLayout: true,
      historyCommandCount: commands.length,
      historyDelta: current.history.pastCount - before.history.pastCount
    },
    pointerDispatch: { source: "chrome-devtools-protocol-input", trustedBrowserInput: true }
  };
}

async function applyMatrixFixtureBatchThroughInspector(send, before, requestedCells) {
  const controls = await setAreaEditingMatrixFixtureBatch(send, requestedCells);
  if (!controls.ok) return { ok: false, reason: "tile_add_connect_matrix_batch_controls_not_ready", controls };
  const apply = await findAreaEditingButtonCenter(send, ["Apply matrix fixture batch"]);
  if (!apply) {
    return {
      ok: false,
      reason: "tile_add_connect_matrix_batch_apply_missing",
      controls,
      panelButtons: await readAreaEditingButtonDiagnostics(send)
    };
  }
  const pointerDispatch = await dispatchTrustedClick(send, apply);
  if (pointerDispatch.hitButtonLabel !== apply.label) {
    return { ok: false, reason: "tile_add_connect_matrix_batch_apply_target_mismatch", controls, apply, pointerDispatch };
  }
  const expectedPastCount = Number(before.history?.pastCount ?? 0) + 1;
  const snapshot = await waitForAreaEditingScenarioSnapshot(send, (candidate) =>
    candidate.history?.pastCount === expectedPastCount &&
    candidate.history?.futureCount === 0 &&
    requestedCells.every((cell) =>
      candidate.state?.tiles?.some((tile) =>
        tile.row === cell.row && tile.col === cell.col && tile.tileId === cell.tileId && tile.orientation === 0
      )
    )
  );
  if (!snapshot) {
    return {
      ok: false,
      reason: "tile_add_connect_matrix_batch_apply_not_observed",
      controls,
      expectedPastCount,
      current: await readAreaEditingScenarioSnapshot(send)
    };
  }
  return {
    ok: true,
    snapshot,
    command: {
      kind: "trusted-diagnostic-matrix-fixture-batch",
      fixtureCount: requestedCells.length,
      historyPastCount: snapshot.history.pastCount,
      pointerDispatch
    }
  };
}

async function applyMatrixGroupFixtureBatchThroughInspector(send, before, requestedGroups, matrixChunk) {
  const controls = await setAreaEditingMatrixGroupFixtureBatch(send, requestedGroups);
  if (!controls.ok) return { ok: false, reason: "tile_add_connect_group_matrix_batch_controls_not_ready", controls };
  const apply = await findAreaEditingButtonCenter(send, ["Apply matrix group fixture batch"]);
  if (!apply) {
    return {
      ok: false,
      reason: "tile_add_connect_group_matrix_batch_apply_missing",
      controls,
      panelButtons: await readAreaEditingButtonDiagnostics(send)
    };
  }
  const pointerDispatch = await dispatchTrustedClick(send, apply);
  if (pointerDispatch.hitButtonLabel !== apply.label) {
    return { ok: false, reason: "tile_add_connect_group_matrix_batch_apply_target_mismatch", controls, apply, pointerDispatch };
  }
  const expectedPastCount = Number(before.history?.pastCount ?? 0) + 1;
  const expectedMembers = matrixChunk.cases.flatMap((matrixCase) => matrixCase.memberCells);
  const snapshot = await waitForAreaEditingScenarioSnapshot(send, (candidate) =>
    candidate.history?.pastCount === expectedPastCount &&
    candidate.history?.futureCount === 0 &&
    expectedMembers.every((cell) =>
      candidate.state?.tiles?.some((tile) =>
        tile.row === cell.row && tile.col === cell.col && tile.tileId === cell.tileId && tile.orientation === cell.orientation
      )
    )
  );
  if (!snapshot) {
    return {
      ok: false,
      reason: "tile_add_connect_group_matrix_batch_apply_not_observed",
      controls,
      expectedPastCount,
      current: await readAreaEditingScenarioSnapshot(send)
    };
  }
  return {
    ok: true,
    snapshot,
    command: {
      kind: "trusted-diagnostic-matrix-group-fixture-batch",
      fixtureCount: requestedGroups.length,
      memberTileCount: expectedMembers.length,
      historyPastCount: snapshot.history.pastCount,
      pointerDispatch
    }
  };
}

async function setAreaEditingMatrixFixtureBatch(send, requestedCells) {
  const textarea = await findAreaEditingTextAreaCenter(send, "Matrix fixture batch JSON");
  if (!textarea) return { ok: false, reason: "matrix_fixture_batch_input_missing" };
  const value = JSON.stringify(requestedCells.map((cell) => ({
    row: cell.row,
    col: cell.col,
    tileId: cell.tileId
  })));
  return dispatchTrustedInputValue(send, textarea, value);
}

async function setAreaEditingMatrixGroupFixtureBatch(send, requestedGroups) {
  const textarea = await findAreaEditingTextAreaCenter(send, "Matrix group fixture batch JSON");
  if (!textarea) return { ok: false, reason: "matrix_group_fixture_batch_input_missing" };
  return dispatchTrustedInputValue(send, textarea, JSON.stringify(requestedGroups));
}

async function readAreaEditingReplaceableTileIds(send) {
  const result = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const select = document.querySelector('select[aria-label="Replace Tile_ID"]');
      if (!select || select.disabled) return { ok: false, reason: 'tile_id_selector_not_available' };
      const tileIds = Array.from(select.options)
        .map((option) => Number(option.value))
        .filter((tileId) => Number.isInteger(tileId) && tileId >= 0)
        .sort((left, right) => left - right);
      return { ok: tileIds.length > 0, tileIds };
    })()`
  });
  const value = result.result?.value ?? null;
  return value?.ok === true ? value.tileIds : [];
}

async function findAreaEditingTextAreaCenter(send, labelText) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const panel = document.querySelector('.aurora-area-editing-panel');
      const label = Array.from(panel?.querySelectorAll('label') ?? []).find((entry) =>
        entry.childNodes[0]?.textContent?.trim() === ${JSON.stringify(labelText)}
      ) ?? null;
      const textarea = label?.querySelector('textarea') ?? null;
      if (!textarea || textarea.disabled) return null;
      textarea.scrollIntoView({ block: 'center', inline: 'center' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const rect = textarea.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, label: ${JSON.stringify(labelText)} }
        : null;
    })()`
  });
  return result.result?.value ?? null;
}

async function dispatchTrustedInputValue(send, target, value) {
  const before = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const node = document.elementFromPoint(${JSON.stringify(target.x)}, ${JSON.stringify(target.y)});
      const input = node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement
        ? node
        : node?.closest?.('input, textarea') ?? null;
      return input ? { value: input.value } : null;
    })()`
  });
  if (before.result?.value?.value === value) {
    return { ok: true, value, unchanged: true };
  }
  await send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: target.x,
    y: target.y,
    button: "left",
    buttons: 1,
    clickCount: 1
  });
  await send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: target.x,
    y: target.y,
    button: "left",
    buttons: 0,
    clickCount: 1
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    modifiers: 2
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    modifiers: 2
  });
  await send("Input.insertText", { text: value });
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const active = document.activeElement;
      return {
        ok: (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) &&
          active.value === ${JSON.stringify(value)},
        value: active?.value ?? null
      };
    })()`
  });
  return result.result?.value ?? { ok: false, reason: "trusted_input_value_result_missing" };
}

function verifyTileAddConnectMatrixCoverage(snapshot, matrixChunk) {
  const byCell = new Map(
    (snapshot.state?.tiles ?? []).map((tile) => [`${tile.row}:${tile.col}`, tile])
  );
  const rows = matrixChunk.cases.map((matrixCase) => {
    const observedCells = matrixCase.cells.map((cell) => {
      const tile = byCell.get(`${cell.row}:${cell.col}`) ?? null;
      return {
        role: cell.role,
        requested: { row: cell.row, col: cell.col, tileId: cell.tileId },
        observed: tile
          ? { row: tile.row, col: tile.col, tileId: tile.tileId, orientation: tile.orientation, height: tile.height }
          : null,
        ok: tile?.tileId === cell.tileId
      };
    });
    const source = observedCells.find((cell) => cell.role === "source") ?? null;
    const partner = observedCells.find((cell) => cell.role === "partner") ?? null;
    return {
      rowId: matrixCase.rowId,
      cells: observedCells,
      sourceAndPartnerAdjacent: !partner ||
        (source?.observed?.row === partner.observed?.row && source.observed.col + 1 === partner.observed.col),
      ok: observedCells.every((cell) => cell.ok)
    };
  });
  const mismatches = rows.filter((row) => !row.ok || !row.sourceAndPartnerAdjacent);
  return {
    ok: mismatches.length === 0,
    chunkId: matrixChunk.id,
    expectedCaseCount: matrixChunk.caseCount,
    observedCaseCount: rows.length,
    rows,
    mismatchCount: mismatches.length,
    mismatchSample: mismatches.slice(0, 12)
  };
}

function verifyTileAddConnectGroupMatrixCoverage(snapshot, matrixChunk) {
  const byCell = new Map(
    (snapshot.state?.tiles ?? []).map((tile) => [`${tile.row}:${tile.col}`, tile])
  );
  const groupInstances = Array.isArray(snapshot.state?.groupInstances) ? snapshot.state.groupInstances : [];
  const cases = matrixChunk.cases.map((matrixCase) => {
    const observedMembers = matrixCase.memberCells.map((cell) => {
      const tile = byCell.get(`${cell.row}:${cell.col}`) ?? null;
      return {
        rowId: cell.rowId,
        requested: {
          row: cell.row,
          col: cell.col,
          tileId: cell.tileId,
          orientation: cell.orientation,
          memberIndex: cell.memberIndex
        },
        observed: tile
          ? { row: tile.row, col: tile.col, tileId: tile.tileId, orientation: tile.orientation, groupId: tile.groupId ?? null }
          : null,
        ok: tile?.tileId === cell.tileId && tile?.orientation === cell.orientation && tile?.groupId === matrixCase.groupId
      };
    });
    const expectedCells = matrixCase.memberCells
      .map((cell) => `${cell.row}:${cell.col}`)
      .sort((left, right) => left.localeCompare(right));
    const groupInstance = groupInstances.find((instance) =>
      instance.groupId === matrixCase.groupId &&
      instance.anchorRow === matrixCase.anchor.row &&
      instance.anchorCol === matrixCase.anchor.col &&
      instance.orientation === 0 &&
      Array.isArray(instance.cells) &&
      instance.cells.map((cell) => `${cell.row}:${cell.col}`).sort((left, right) => left.localeCompare(right)).join("|") === expectedCells.join("|")
    ) ?? null;
    return {
      id: matrixCase.id,
      groupId: matrixCase.groupId,
      anchor: matrixCase.anchor,
      members: observedMembers,
      groupInstance: groupInstance
        ? { groupId: groupInstance.groupId, anchorRow: groupInstance.anchorRow, anchorCol: groupInstance.anchorCol, orientation: groupInstance.orientation }
        : null,
      declaredLayoutObserved: groupInstance !== null,
      ok: observedMembers.every((member) => member.ok) && groupInstance !== null
    };
  });
  const mismatches = cases.filter((matrixCase) => !matrixCase.ok);
  return {
    ok: mismatches.length === 0,
    chunkId: matrixChunk.id,
    expectedCaseCount: matrixChunk.caseCount,
    observedCaseCount: cases.length,
    expectedMemberTileCount: matrixChunk.memberTileCount,
    observedMemberTileCount: cases.reduce((total, matrixCase) => total + matrixCase.members.length, 0),
    cases,
    mismatchCount: mismatches.length,
    mismatchSample: mismatches.slice(0, 12)
  };
}

async function executeEraserLocalScenario({ send, scenario, groupId, before }) {
  // A blank Area contains only the default terrain, for which Eraser can be a
  // semantic no-op. Create one named SET group through the visible group tool,
  // then remove that same group through the visible Eraser tool. This proves a
  // genuine delete operation without borrowing a retail Area fixture.
  const prep = await executeGroupPlacementLocalScenario({
    send,
    scenario: "eraser-local-prep",
    groupId,
    before
  });
  if (!prep.ok) return scenarioFailure(scenario, true, "eraser_local_group_prep_failed", { prep });
  const preDelete = prep.redo.snapshot;
  const targetCell = prep.action.cell;
  const eraserTool = await armAreaEditingTool(send, "eraser");
  if (!eraserTool.ok) return scenarioFailure(scenario, true, "eraser_local_tool_not_armed", { eraserTool });
  const target = (await collectAreaEditingCellScreenMap(send)).find(
    (cell) => cell.row === targetCell.row && cell.col === targetCell.col
  ) ?? null;
  if (!target) return scenarioFailure(scenario, true, "eraser_local_group_cell_not_projected", { targetCell });
  const pointerDispatch = await dispatchTrustedClick(send, target);
  const commit = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    !jsonEqual(snapshot.state, preDelete.state) &&
    snapshot.history?.pastCount === preDelete.history.pastCount + 1 &&
    snapshot.history?.futureCount === 0
  );
  if (!commit) {
    // A failed closed Delete proof must retain the post-click witness.  Without
    // it, a valid hover preview and a no-op click are indistinguishable from a
    // runtime state rejection, which hides the actual implementation defect.
    return scenarioFailure(scenario, true, "eraser_local_delete_not_observed", {
      preDelete,
      target,
      current: await readAreaEditingScenarioSnapshot(send)
    });
  }
  const preDeleteGroupCount = preDelete.state.groupInstances?.length ?? 0;
  const committedGroupCount = commit.state.groupInstances?.length ?? 0;
  if (committedGroupCount >= preDeleteGroupCount) {
    return scenarioFailure(scenario, true, "eraser_local_group_not_removed", {
      preDeleteGroupCount,
      committedGroupCount,
      target
    });
  }
  const undoButton = await findAreaEditingButtonCenter(send, ["Undo tile edit", "Undo"]);
  if (!undoButton) return scenarioFailure(scenario, true, "eraser_local_undo_button_missing");
  await dispatchTrustedClick(send, undoButton);
  const undo = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, preDelete.state) &&
    snapshot.history?.pastCount === preDelete.history.pastCount &&
    snapshot.history?.futureCount === preDelete.history.futureCount + 1
  );
  if (!undo) return scenarioFailure(scenario, true, "eraser_local_undo_not_restored");
  const redoButton = await findAreaEditingButtonCenter(send, ["Redo tile edit", "Redo"]);
  if (!redoButton) return scenarioFailure(scenario, true, "eraser_local_redo_button_missing");
  await dispatchTrustedClick(send, redoButton);
  const redo = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, commit.state) &&
    snapshot.history?.pastCount === commit.history.pastCount &&
    snapshot.history?.futureCount === commit.history.futureCount
  );
  if (!redo) return scenarioFailure(scenario, true, "eraser_local_redo_not_restored");
  return {
    ok: true,
    scenario,
    mutatesScene: true,
    requiresTileProcessSceneKeyChange: false,
    requiresPostMutationSettlement: true,
    before,
    prep,
    preDelete,
    commit,
    undo: { applicable: true, snapshot: undo },
    redo: { applicable: true, snapshot: redo },
    action: {
      kind: "trusted-eraser-group-delete",
      groupId,
      cell: { row: target.row, col: target.col },
      groupCount: { before: preDeleteGroupCount, after: committedGroupCount }
    },
    assertions: {
      deletedGroup: true,
      undoRestoredExactState: true,
      redoRestoredExactState: true
    },
    pointerDispatch
  };
}

async function executeGroupPlacementLocalScenario({ send, scenario, groupId, before }) {
  // A newly created DLS10 Area starts with its intentional Black base plane.
  // Place its first named Aurora SET group rather than claiming that the base
  // tile itself demonstrates sewer geometry.
  const groupTool = await armAreaEditingTool(send, "group", { groupId });
  if (!groupTool.ok) return scenarioFailure(scenario, true, "group_placement_local_group_not_armed", { groupTool });
  const candidates = await collectAreaEditingCellScreenMap(send, { requireValid: true });
  const target = candidates[0] ?? null;
  if (!target) return scenarioFailure(scenario, true, "group_placement_local_valid_cell_not_found");
  const pointerDispatch = await dispatchTrustedClick(send, target);
  const commit = await waitForAreaEditingScenarioSnapshot(send, (snapshot) => {
    const placed = snapshot.state?.groupInstances?.find((group) =>
      group.groupId === groupId && group.cells?.some((cell) => cell.row === target.row && cell.col === target.col)
    );
    return Boolean(placed) &&
      snapshot.history?.pastCount === before.history.pastCount + 1 &&
      snapshot.history?.futureCount === 0;
  });
  if (!commit) return scenarioFailure(scenario, true, "group_placement_local_commit_not_observed", { target, pointerDispatch });
  const placed = commit.state.groupInstances.find((group) =>
    group.groupId === groupId && group.cells?.some((cell) => cell.row === target.row && cell.col === target.col)
  );
  const placedTileIds = placed?.tileIds ?? [];
  if (placedTileIds.length === 0) {
    return scenarioFailure(scenario, true, "group_placement_local_members_missing", { target, placed });
  }
  const changedCells = changedAreaCells(before.state, commit.state);
  if (changedCells.length === 0) {
    return scenarioFailure(scenario, true, "group_placement_local_state_delta_missing", { target, placed });
  }
  const history = await applyExactScenarioUndoRedo(send, before, commit);
  if (!history.ok) return scenarioFailure(scenario, true, history.reason, history);
  // Leave the placed group explicitly selected for the page screenshot. The
  // inspector then exposes its origin/anchor instead of asking a reviewer to
  // infer the footprint from perspective alone.
  const inspectTool = await armAreaEditingTool(send, "inspect");
  if (!inspectTool.ok) return scenarioFailure(scenario, true, "group_placement_local_inspect_not_armed", { inspectTool });
  await dispatchTrustedClick(send, target);
  const selected = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    snapshot.selection?.cells?.length === 1 &&
    snapshot.selection.cells[0].row === target.row &&
    snapshot.selection.cells[0].col === target.col
  );
  if (!selected) return scenarioFailure(scenario, true, "group_placement_local_group_not_selected", { target });
  return {
    ok: true,
    scenario,
    mutatesScene: true,
    requiresPostMutationSettlement: true,
    before,
    commit,
    undo: { applicable: true, snapshot: history.undoSnapshot },
    redo: { applicable: true, snapshot: history.redoSnapshot },
    action: {
      kind: "trusted-set-group-placement",
      groupId,
      cell: { row: target.row, col: target.col },
      memberTileIds: placedTileIds,
      changedCells
    },
    assertions: {
      groupPlaced: true,
      memberCount: placedTileIds.length,
      changedCellCount: changedCells.length,
      undoRestoredExactState: true,
      redoRestoredExactState: true,
      placedGroupSelectedForVisualReview: true
    },
    pointerDispatch,
    selected
  };
}

async function executeMultiCopyPasteScenario({ send, scenario, before }) {
  await armAreaEditingTool(send, "terrain");
  const cellMap = await collectAreaEditingCellScreenMap(send);
  let plans = chooseMultiCopyPastePlans(before.state, cellMap, {
    allowIdentical: scenario === "multi-copy-paste-local"
  });
  if (plans.length === 0) {
    return scenarioFailure(scenario, true, "multi_copy_paste_loose_cell_plan_not_found", {
      mappedCellCount: cellMap.length
    });
  }
  await armAreaEditingTool(send, "inspect");
  let baseline = before;
  let prep = null;
  if (scenario === "multi-copy-paste-local") {
    const prepPlan = plans[0];
    await dispatchTrustedClick(send, prepPlan.sources[0]);
    await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
      snapshot.selection?.tileIds?.length === 1
    );
    await dispatchTrustedClick(send, prepPlan.sources[1], { modifiers: 2 });
    const prepSelection = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
      snapshot.selection?.tileIds?.length === 2
    );
    if (!prepSelection) {
      return scenarioFailure(scenario, true, "multi_copy_paste_local_prep_selection_missing");
    }
    const propertiesButton = await findAreaEditingButtonCenter(send, ["Tile Properties"]);
    if (!propertiesButton) {
      return scenarioFailure(scenario, true, "multi_copy_paste_local_prep_properties_missing");
    }
    await dispatchTrustedClick(send, propertiesButton);
    const input = await waitForLabeledInputCenter(send, "Main Light 1");
    if (!input) return scenarioFailure(scenario, true, "multi_copy_paste_local_prep_input_missing");
    await replaceTrustedInputText(send, input, "1");
    const okButton = await findAreaEditingButtonCenter(send, ["OK"]);
    if (!okButton) return scenarioFailure(scenario, true, "multi_copy_paste_local_prep_ok_missing");
    await dispatchTrustedClick(send, okButton);
    prep = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
      !jsonEqual(snapshot.state, before.state) &&
      snapshot.history.pastCount === before.history.pastCount + 1
    );
    if (!prep) return scenarioFailure(scenario, true, "multi_copy_paste_local_prep_commit_missing");
    baseline = prep;
    plans = [prepPlan];
  }
  const pasteAttempts = [];
  let commit = null;
  let committedTarget = null;
  let committedPlan = null;
  let copied = null;
  let selected = null;
  for (const plan of plans) {
    await dispatchTrustedClick(send, plan.sources[0]);
    const first = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
      snapshot.selection?.tileIds?.length === 1
    );
    if (!first) continue;
    await dispatchTrustedClick(send, plan.sources[1], { modifiers: 2 });
    selected = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
      snapshot.selection?.tileIds?.length === 2
    );
    if (!selected) continue;
    const copyButton = await findAreaEditingButtonCenter(send, ["Copy tile/group"]);
    if (!copyButton) return scenarioFailure(scenario, true, "multi_copy_paste_copy_action_missing");
    await dispatchTrustedClick(send, copyButton);
    copied = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
      jsonEqual(snapshot.state, baseline.state) && historyEquals(snapshot.history, baseline.history)
    );
    if (!copied) continue;
    for (const target of plan.targets) {
      await dispatchTrustedClick(send, target);
      const targetSelected = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
        snapshot.selection?.cells?.length === 1 &&
        snapshot.selection.cells[0].row === target.row &&
        snapshot.selection.cells[0].col === target.col
      );
      if (!targetSelected) continue;
      const pasteButton = await findAreaEditingButtonCenter(send, ["Paste at selected tile"]);
      if (!pasteButton) return scenarioFailure(scenario, true, "multi_copy_paste_paste_action_missing");
      await dispatchTrustedClick(send, pasteButton);
      commit = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
        !jsonEqual(snapshot.state, baseline.state) &&
        snapshot.history.pastCount === baseline.history.pastCount + 1 &&
        snapshot.history.futureCount === 0,
        700
      );
      const afterAttempt = commit ?? await readAreaEditingScenarioSnapshot(send);
      pasteAttempts.push({
        sources: plan.sources.map(({ row, col }) => ({ row, col })),
        target: { row: target.row, col: target.col },
        result: commit ? "committed" : "rejected",
        feedback: afterAttempt?.feedback?.text ?? null,
        history: afterAttempt?.history ?? null
      });
      if (commit) {
        committedTarget = target;
        committedPlan = plan;
        break;
      }
    }
    if (commit) break;
  }
  if (!commit) {
    return scenarioFailure(scenario, true, "multi_copy_paste_commit_not_observed", {
      planCount: plans.length,
      pasteAttempts,
      current: await readAreaEditingScenarioSnapshot(send)
    });
  }
  const changedCells = changedAreaCells(baseline.state, commit.state);
  const selectionExpanded = commit.selection?.tileIds?.length === 2;
  if (changedCells.length < 1 || !selectionExpanded) {
    return scenarioFailure(scenario, true, "multi_copy_paste_exact_delta_mismatch", {
      changedCells,
      selection: commit.selection
    });
  }
  const history = await applyExactScenarioUndoRedo(send, baseline, commit);
  if (!history.ok) return scenarioFailure(scenario, true, history.reason, history);
  return {
    ok: true,
    scenario,
    mutatesScene: true,
    ...(scenario === "multi-copy-paste-local"
      ? { requiresTileProcessSceneKeyChange: false, requiresPostMutationSettlement: true }
      : {}),
    before,
    ...(prep ? { prep: { snapshot: prep, sourceField: "mainLight1", sourceValue: 1 } } : {}),
    copy: { snapshot: copied, selection: selected.selection, historyDelta: 0 },
    commit,
    undo: { applicable: true, snapshot: history.undoSnapshot },
    redo: { applicable: true, snapshot: history.redoSnapshot },
    action: {
      kind: "trusted-multi-copy-paste",
      sources: committedPlan.sources.map(({ row, col }) => ({ row, col })),
      target: { row: committedTarget.row, col: committedTarget.col },
      pasteAttempts
    },
    assertions: {
      multiSelectCount: 2,
      copyHistoryDelta: 0,
      pasteHistoryDelta: 1,
      changedCellCount: changedCells.length,
      pasteSelectedTileCount: commit.selection?.tileIds?.length ?? 0,
      undoRestoredExactState: true,
      redoRestoredExactState: true
    }
  };
}

async function executeTilePropertiesScenario({ send, scenario, before }) {
  await armAreaEditingTool(send, "terrain");
  const cellMap = await collectAreaEditingCellScreenMap(send);
  const groupedIds = new Set(
    (before.state.groupInstances ?? []).flatMap((group) => group.tileIds)
  );
  const target = cellMap.find((cell) => {
    const tile = before.state.tiles.find((candidate) =>
      candidate.row === cell.row && candidate.col === cell.col
    );
    return tile && !groupedIds.has(tile.id);
  }) ?? null;
  if (!target) return scenarioFailure(scenario, true, "tile_properties_loose_cell_not_found");
  await armAreaEditingTool(send, "inspect");
  await dispatchTrustedClick(send, target);
  const selected = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    snapshot.selection?.cells?.length === 1 &&
    snapshot.selection.cells[0].row === target.row &&
    snapshot.selection.cells[0].col === target.col
  );
  if (!selected) return scenarioFailure(scenario, true, "tile_properties_target_not_selected");
  const sourceTile = before.state.tiles.find((tile) =>
    tile.row === target.row && tile.col === target.col
  );
  const nextValue = (Number(sourceTile?.mainLight1 ?? 0) + 1) % 256;
  const openButton = await findAreaEditingButtonCenter(send, ["Tile Properties"]);
  if (!openButton) return scenarioFailure(scenario, true, "tile_properties_action_missing");
  await dispatchTrustedClick(send, openButton);
  const input = await waitForLabeledInputCenter(send, "Main Light 1");
  if (!input) return scenarioFailure(scenario, true, "tile_properties_main_light_input_missing");
  await replaceTrustedInputText(send, input, String(nextValue));
  const okButton = await findAreaEditingButtonCenter(send, ["OK"]);
  if (!okButton) return scenarioFailure(scenario, true, "tile_properties_ok_action_missing");
  await dispatchTrustedClick(send, okButton);
  const commit = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    !jsonEqual(snapshot.state, before.state) &&
    snapshot.history.pastCount === before.history.pastCount + 1 &&
    snapshot.history.futureCount === 0
  );
  if (!commit) {
    return scenarioFailure(scenario, true, "tile_properties_commit_not_observed", {
      target,
      nextValue,
      current: await readAreaEditingScenarioSnapshot(send)
    });
  }
  const changedTile = commit.state.tiles.find((tile) =>
    tile.row === target.row && tile.col === target.col
  );
  const otherCellsUnchanged = before.state.tiles.every((tile) =>
    tile.row === target.row && tile.col === target.col
      ? true
      : jsonEqual(tile, commit.state.tiles.find((candidate) =>
          candidate.row === tile.row && candidate.col === tile.col
        ))
  );
  const exactFieldChange =
    changedTile?.mainLight1 === nextValue &&
    changedTile.tileId === sourceTile?.tileId &&
    changedTile.orientation === sourceTile?.orientation &&
    changedTile.height === sourceTile?.height &&
    otherCellsUnchanged;
  if (!exactFieldChange) {
    return scenarioFailure(scenario, true, "tile_properties_exact_field_delta_mismatch", {
      sourceTile,
      changedTile,
      nextValue,
      otherCellsUnchanged
    });
  }
  const history = await applyExactScenarioUndoRedo(send, before, commit);
  if (!history.ok) return scenarioFailure(scenario, true, history.reason, history);
  return {
    ok: true,
    scenario,
    mutatesScene: true,
    requiresTileProcessSceneKeyChange: false,
    before,
    commit,
    undo: { applicable: true, snapshot: history.undoSnapshot },
    redo: { applicable: true, snapshot: history.redoSnapshot },
    action: {
      kind: "trusted-tile-properties",
      cell: { row: target.row, col: target.col },
      field: "mainLight1",
      beforeValue: sourceTile?.mainLight1 ?? null,
      afterValue: nextValue
    },
    assertions: {
      historyDelta: 1,
      exactFieldChange: true,
      structuralTileFieldsUnchanged: true,
      otherCellsUnchanged: true,
      undoRestoredExactState: true,
      redoRestoredExactState: true
    }
  };
}

async function executeChainedGroupBaseHeightScenario({
  send,
  scenario,
  openedArea,
  initialSceneKey,
  before
}) {
  const heightTool = await armAreaEditingTool(send, "height");
  if (!heightTool?.ok) {
    return scenarioFailure(scenario, true, "group_base_height_raise_tool_not_armed", { heightTool });
  }
  const raiseCells = await collectAreaEditingCellScreenMap(send, { requireValid: true });
  if (raiseCells.length === 0) {
    return scenarioFailure(scenario, true, "group_base_height_raise_cell_not_found");
  }
  const raisedCell = raiseCells[0];
  const raiseDispatch = await dispatchTrustedClick(send, raisedCell);
  const prep = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    !jsonEqual(snapshot.state, before.state) &&
    snapshot.history.pastCount === before.history.pastCount + 1 &&
    snapshot.history.futureCount === 0
  );
  if (!prep) {
    return scenarioFailure(scenario, true, "group_base_height_raise_commit_not_observed", {
      before,
      raisedCell,
      raiseDispatch,
      current: await readAreaEditingScenarioSnapshot(send)
    });
  }
  const preparedTile = prep.state.tiles.find((tile) =>
    tile.row === raisedCell.row && tile.col === raisedCell.col
  ) ?? null;
  if (preparedTile?.height !== 1) {
    return scenarioFailure(scenario, true, "group_base_height_prepared_base_not_one", {
      raisedCell,
      preparedTile,
      prep
    });
  }
  const prepSettlement = await waitForIntentionalHiddenGroundSettlement(
    send,
    openedArea?.areaText ?? "_winds_study",
    initialSceneKey
  );

  const proofGroupId = "group112";
  const groupTool = await armAreaEditingTool(send, "group", { groupId: proofGroupId });
  if (!groupTool?.ok) {
    return scenarioFailure(scenario, true, "group_base_height_flat_group_not_armed", {
      groupTool,
      prep,
      prepSettlement
    });
  }
  const orientedPlacement = await findValidGroupPlacementAtPreparedCell(
    send,
    raisedCell,
    proofGroupId
  );
  const groupCells = orientedPlacement.mappedValidCells;
  const placementCell = orientedPlacement.placementCell;
  if (!placementCell) {
    return scenarioFailure(scenario, true, "group_base_height_flat_group_not_valid_at_prepared_cell", {
      proofGroupId,
      raisedCell,
      attemptedOrientations: orientedPlacement.attemptedOrientations,
      mappedValidCells: groupCells.map(({ row, col }) => ({ row, col })),
      prep,
      prepSettlement
    });
  }
  const placementDispatch = await dispatchTrustedClick(send, placementCell);
  const commit = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    !jsonEqual(snapshot.state, prep.state) &&
    snapshot.history.pastCount === prep.history.pastCount + 1 &&
    snapshot.history.futureCount === 0
  );
  if (!commit) {
    return scenarioFailure(scenario, true, "group_base_height_placement_commit_not_observed", {
      prep,
      placementCell,
      placementDispatch,
      current: await readAreaEditingScenarioSnapshot(send)
    });
  }
  const placedGroup = commit.state.groupInstances.find((group) =>
    group.groupId === proofGroupId &&
    group.cells.some((cell) => cell.row === raisedCell.row && cell.col === raisedCell.col)
  ) ?? null;
  const placedMembers = placedGroup?.tileIds.map((tileId) =>
    commit.state.tiles.find((tile) => tile.id === tileId)
  ) ?? [];
  const placementInvariant =
    Boolean(placedGroup) &&
    placedMembers.length === 1 &&
    placedMembers[0]?.height === preparedTile.height &&
    preparedTile.height === 1;
  if (!placementInvariant) {
    return scenarioFailure(scenario, true, "group_base_height_placement_invariant_failed", {
      preparedTile,
      placedGroup,
      placedMembers,
      prep,
      commit
    });
  }

  const undoButton = await findAreaEditingButtonCenter(send, ["Undo tile edit", "Undo"]);
  if (!undoButton) return scenarioFailure(scenario, true, "scenario_undo_button_missing");
  await dispatchTrustedClick(send, undoButton);
  const undoSnapshot = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, prep.state) &&
    snapshot.history.pastCount === prep.history.pastCount &&
    snapshot.history.futureCount === prep.history.futureCount + 1
  );
  if (!undoSnapshot) {
    return scenarioFailure(scenario, true, "group_base_height_undo_to_prep_not_observed", {
      prep,
      commit,
      current: await readAreaEditingScenarioSnapshot(send)
    });
  }
  const redoButton = await findAreaEditingButtonCenter(send, ["Redo tile edit", "Redo"]);
  if (!redoButton) return scenarioFailure(scenario, true, "scenario_redo_button_missing");
  await dispatchTrustedClick(send, redoButton);
  const redoSnapshot = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, commit.state) &&
    snapshot.history.pastCount === commit.history.pastCount &&
    snapshot.history.futureCount === commit.history.futureCount
  );
  if (!redoSnapshot) {
    return scenarioFailure(scenario, true, "group_base_height_redo_to_placement_not_observed", {
      commit,
      undoSnapshot,
      current: await readAreaEditingScenarioSnapshot(send)
    });
  }

  return {
    ok: true,
    scenario,
    mutatesScene: true,
    before,
    prep: {
      snapshot: prep,
      raisedCell: { row: raisedCell.row, col: raisedCell.col },
      preparedBaseHeight: preparedTile.height,
      settlement: prepSettlement,
      pointerDispatch: raiseDispatch
    },
    commit,
    undo: { applicable: true, snapshot: undoSnapshot },
    redo: { applicable: true, snapshot: redoSnapshot },
    action: {
      kind: "trusted-chained-raise-group-placement",
      groupId: proofGroupId,
      expectedTileId: placedMembers[0]?.tileId ?? null,
      orientation: orientedPlacement.orientation,
      placementCell: { row: placementCell.row, col: placementCell.col },
      pointerDispatch: placementDispatch
    },
    assertions: {
      preparedBaseHeight: 1,
      placementHistoryDeltaRelativeToPrep: 1,
      groupMemberCount: placedMembers.length,
      groupMemberTileId: placedMembers[0]?.tileId ?? null,
      groupMemberHeight: placedMembers[0]?.height ?? null,
      undoRestoredExactPrepState: true,
      redoRestoredExactPlacedState: true
    }
  };
}

async function findValidGroupPlacementAtPreparedCell(send, raisedCell, proofGroupId) {
  const attemptedOrientations = [];
  let lastCells = [];
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const toolSnapshot = await readAreaEditingScenarioSnapshot(send);
    const orientation = Number(toolSnapshot?.tool?.orientation ?? 0);
    const mappedValidCells = await collectAreaEditingCellScreenMap(send, { requireValid: true });
    lastCells = mappedValidCells;
    const placementCell = mappedValidCells.find((cell) =>
      cell.row === raisedCell.row && cell.col === raisedCell.col
    ) ?? null;
    attemptedOrientations.push({
      orientation,
      validCells: mappedValidCells.map(({ row, col }) => ({ row, col }))
    });
    if (placementCell) {
      return { placementCell, orientation, mappedValidCells, attemptedOrientations };
    }
    if (attempt < 3) {
      const rotateButton = await findAreaEditingButtonCenter(send, ["Rotate group brush right"]);
      if (!rotateButton) break;
      await dispatchTrustedClick(send, rotateButton);
      await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
        snapshot.tool?.kind === "group" &&
        snapshot.tool?.groupId === proofGroupId &&
        Number(snapshot.tool?.orientation ?? -1) === (orientation + 1) % 4
      );
    }
  }
  return {
    placementCell: null,
    orientation: null,
    mappedValidCells: lastCells,
    attemptedOrientations
  };
}

async function waitForIntentionalHiddenGroundSettlement(
  send,
  openedAreaText,
  previousSceneKey,
  timeoutMs = 120_000
) {
  const startedAt = Date.now();
  let lastStatus = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastStatus = await readAreaRuntimeStatus(send, openedAreaText);
    const snapshot = lastStatus?.terrainTileModelSnapshot ?? null;
    const tileCount = Number(snapshot?.tileCount ?? 0);
    const currentSceneKey = lastStatus?.tileProcessSceneContract?.currentSceneKey ?? null;
    const materialContracts = Number(snapshot?.materialTextureContractTileCount ?? 0);
    const materialApplied = Number(snapshot?.materialTextureAppliedTileCount ?? 0);
    const materialFailed = Number(snapshot?.materialTextureFailedTileCount ?? -1);
    const materialPending = Number(snapshot?.materialTexturePendingTileCount ?? -1);
    const tileProcess = lastStatus?.tileProcessRuntimeSnapshot ?? null;
    const intentionalHidden =
      classifyIntentionalInvisibleGroundSurface(lastStatus).intentionalInvisibleGroundSurface;
    const visualSettlement = Number(snapshot?.visibleMeshCount ?? 0) > 0 || intentionalHidden;
    if (
      currentSceneKey &&
      currentSceneKey !== previousSceneKey &&
      snapshot?.status === "ready" &&
      tileCount > 0 &&
      Number(snapshot.contractTileCount ?? 0) === tileCount &&
      Number(snapshot.loadedTileCount ?? 0) === tileCount &&
      Number(snapshot.failedTileCount ?? 0) === 0 &&
      Number(snapshot.bridgeTileCount ?? 0) === 0 &&
      materialContracts === tileCount &&
      materialApplied === tileCount &&
      materialFailed === 0 &&
      materialPending === 0 &&
      tileProcess?.status === "ready" &&
      Number(tileProcess.readyCandidateCount ?? -1) === Number(tileProcess.checkedCandidateCount ?? -2) &&
      Number(tileProcess.blockedCandidateCount ?? -1) === 0 &&
      visualSettlement
    ) {
      return {
        ok: true,
        elapsedMs: Date.now() - startedAt,
        sceneKey: currentSceneKey,
        terrainTileModelSnapshot: snapshot,
        tileProcessRuntimeSnapshot: lastStatus?.tileProcessRuntimeSnapshot ?? null,
        classification: intentionalHidden
          ? "intentional-hidden-ground-surfaces"
          : "visible-real-retile-after-raise"
      };
    }
    await sleep(AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS);
  }
  throw createBlockerError(
    "group_base_height_prep_hidden_ground_not_settled",
    "The trusted Raise preparation did not settle as the known intentional hidden tcm01_a20_04 ground surface fixture.",
    { openedAreaText, previousSceneKey, timeoutMs, lastStatus }
  );
}

async function prepareAreaEditingRuntimeScenario(send, scenario) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const button = (label, root = document) => Array.from(root.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === label ||
          candidate.querySelector(':scope > span')?.textContent?.trim() === label
      ) ?? null;
      const panel = document.querySelector('.aurora-area-editing-panel');
      if (!panel) return { ok: false, reason: 'area_editing_panel_missing' };
      button('Enable Aurora tile editing', panel)?.click();
      const startedAt = Date.now();
      while (Date.now() - startedAt < 60000 && !panel.querySelector('[role="group"][aria-label="Terrain palette"]')) {
        await wait(100);
      }
      if (!panel.querySelector('[role="group"][aria-label="Terrain palette"]')) {
        return { ok: false, reason: 'area_editing_payload_not_ready' };
      }
      const selectionTab = button('Selection');
      selectionTab?.click();
      await wait(0);
      button('Select Terrain')?.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const canvas = document.querySelector('.workspace-render-canvas');
      return {
        ok: Boolean(canvas?.dataset.areaEditingProofState),
        reason: canvas?.dataset.areaEditingProofState ? null : 'area_editing_proof_canvas_not_ready',
        scenario: ${JSON.stringify(scenario)},
        sceneId: canvas?.dataset.currentSceneId ?? null
      };
    })()`
  });
  return result.result?.value ?? { ok: false, reason: "area_editing_scenario_prepare_result_missing" };
}

async function performAreaEditingScenarioCommit(send, scenario, before) {
  if (
    scenario === "area-rotate" ||
    scenario === "area-rotate-rectangular" ||
    scenario === "area-rotate-rectangular-local"
  ) {
    const target = await findAreaEditingButtonCenter(send, ["Rotate entire Area right"]);
    if (!target) return { ok: false, reason: "area_rotate_action_missing" };
    const pointerDispatch = await dispatchTrustedClick(send, target);
    if (pointerDispatch.hitButtonLabel !== target.label) {
      return { ok: false, reason: "area_rotate_trusted_click_target_mismatch", target, pointerDispatch };
    }
    return { ok: true, kind: "trusted-button", target, pointerDispatch };
  }

  if (scenario.startsWith("source-group-")) {
    const sourceGroup = before.state.groupInstances?.find((group) => !group.underlay) ?? null;
    if (!sourceGroup?.cells?.length) {
      return { ok: false, reason: "source_group_fixture_not_found", groupCount: before.state.groupInstances?.length ?? 0 };
    }
    await armAreaEditingTool(send, "terrain");
    const cellMap = await collectAreaEditingCellScreenMap(send);
    const targetCell = sourceGroup.cells[0];
    const target = cellMap.find((entry) => entry.row === targetCell.row && entry.col === targetCell.col);
    if (!target) {
      return { ok: false, reason: "source_group_runtime_cell_not_projected", sourceGroup, mappedCellCount: cellMap.length };
    }
    await armAreaEditingTool(send, "inspect");
    await dispatchTrustedClick(send, target);
    const selected = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
      snapshot.selection?.group?.groupId === sourceGroup.groupId
    );
    if (!selected) return { ok: false, reason: "source_group_selection_not_observed", sourceGroup };
    const labels = scenario === "source-group-remove"
      ? ["Remove selected group", "Remove tile/group"]
      : scenario === "source-group-rotate"
        ? ["Rotate selected group right"]
        : ["Cut tile/group"];
    const actionTarget = await findAreaEditingButtonCenter(send, labels);
    if (!actionTarget) return { ok: false, reason: `${scenario.replace(/-/gu, "_")}_action_missing` };
    await dispatchTrustedClick(send, actionTarget);
    return { ok: true, kind: "trusted-source-group-action", sourceGroup, target, actionTarget };
  }

  const tool = scenario === "drag-terrain"
    ? "terrain"
    : scenario === "drag-crosser"
      ? "crosser"
      : scenario === "drag-height"
        ? "height"
        : scenario === "eraser"
          ? "eraser"
          : "group";
  let armed = await armAreaEditingTool(send, tool);
  if (!armed?.ok) return { ok: false, reason: `${tool}_tool_not_armed`, armed };
  let cellMap = await collectAreaEditingCellScreenMap(send, { requireValid: true });
  if (scenario === "eraser") {
    // A valid loose tile may retile to the same semantic Tile_ID/orientation,
    // which cannot prove a scene-key mutation. Prefer the recovered source
    // group fixture so the same mode-4 path must expand and replace a group.
    const sourceGroup = before.state.groupInstances?.find((group) => !group.underlay) ?? null;
    if (sourceGroup?.cells?.length) {
      const mappedCells = await collectAreaEditingCellScreenMap(send);
      const targetCell = sourceGroup.cells[0];
      const groupTarget = mappedCells.find(
        (entry) => entry.row === targetCell.row && entry.col === targetCell.col
      );
      if (groupTarget) cellMap = [groupTarget];
    }
  }
  if (scenario === "drag-height" && cellMap.length === 0) {
    const lowerArmed = await armAreaEditingTool(send, "height-down");
    if (lowerArmed?.ok) {
      armed = lowerArmed;
      cellMap = await collectAreaEditingCellScreenMap(send, { requireValid: true });
    }
  }
  if (cellMap.length === 0) {
    const mappedDiagnostics = scenario === "drag-height"
      ? await collectAreaEditingCellScreenMap(send)
      : [];
    const previewReasonCounts = mappedDiagnostics.reduce((counts, entry) => {
      const reason = String(entry.preview?.reason ?? "none");
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
    return {
      ok: false,
      reason: `${scenario.replace(/-/gu, "_")}_valid_runtime_fixture_not_found`,
      armed,
      mappedCellCount: mappedDiagnostics.length,
      previewReasonCounts,
      previewSample: mappedDiagnostics.slice(0, 6).map((entry) => entry.preview)
    };
  }
  if (scenario === "drag-height") {
    const target = cellMap[0];
    // Height retiling can invalidate an adjacent target after the first
    // accepted stroke cell. Keep a real press/move/release gesture inside the
    // one proven-valid cell and report the accepted target count explicitly;
    // the invariant below still requires the topology retile to change >=2
    // cells in one history command.
    await dispatchTrustedDrag(send, [target, target]);
    return {
      ok: true,
      kind: "trusted-drag-single-accepted-target",
      targets: [target],
      acceptedTargetCount: 1
    };
  }
  if (scenario.startsWith("drag-")) {
    const targets = chooseAdjacentCellTargets(cellMap);
    if (targets.length !== 2) {
      return { ok: false, reason: `${scenario.replace(/-/gu, "_")}_adjacent_cells_not_found`, mappedCellCount: cellMap.length };
    }
    await dispatchTrustedDrag(send, targets);
    return { ok: true, kind: "trusted-drag", targets };
  }
  await dispatchTrustedClick(send, cellMap[0]);
  return { ok: true, kind: "trusted-click", target: cellMap[0] };
}

async function armAreaEditingTool(send, tool, { groupId = null } = {}) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const tool = ${JSON.stringify(tool)};
      const requestedGroupId = ${JSON.stringify(groupId)};
      const waitFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const panel = document.querySelector('.aurora-area-editing-panel');
      const buttonByText = (label, root = document) => Array.from(root.querySelectorAll('button')).find(
        (candidate) => candidate.textContent?.trim() === label
      ) ?? null;
      if (!panel) return { ok: false, reason: 'area_editing_panel_missing' };
      let target = null;
      if (tool === 'inspect') target = buttonByText('Inspect tiles', panel);
      if (tool === 'terrain') {
        const buttons = Array.from(panel.querySelectorAll('[role="group"][aria-label="Terrain palette"] button'));
        target = buttons[buttons.length - 1] ?? null;
      }
      if (tool === 'crosser') target = panel.querySelector('[role="group"][aria-label="Features and crossers palette"] button');
      if (tool === 'height') target = buttonByText('Raise terrain', panel);
      if (tool === 'height-down') target = buttonByText('Lower terrain', panel);
      if (tool === 'eraser') target = buttonByText('Eraser', panel);
      if (tool === 'group') {
        const buttons = Array.from(panel.querySelectorAll('[role="group"][aria-label="Tileset groups"] button'));
        if (requestedGroupId) {
          for (const candidate of buttons) {
            candidate.click();
            await waitFrame();
            const canvas = document.querySelector('.workspace-render-canvas');
            const armed = (() => { try { return JSON.parse(canvas?.dataset.areaEditingProofTool ?? 'null'); } catch { return null; } })();
            if (armed?.kind === 'group' && armed.groupId === requestedGroupId) {
              target = candidate;
              break;
            }
          }
        } else {
          target = buttons[0] ?? null;
        }
      }
      if (!target || target.disabled) return { ok: false, reason: tool + '_tool_button_missing_or_disabled' };
      target.click();
      await waitFrame();
      const canvas = document.querySelector('.workspace-render-canvas');
      const parse = (value) => { try { return value ? JSON.parse(value) : null; } catch { return null; } };
      const armedTool = parse(canvas?.dataset.areaEditingProofTool);
      const expectedKind = tool === 'height-down' ? 'height' : tool;
      const expectedDelta = tool === 'height-down' ? -1 : null;
      return {
        ok: armedTool?.kind === expectedKind &&
          (expectedDelta === null || armedTool?.delta === expectedDelta) &&
          (!requestedGroupId || armedTool?.groupId === requestedGroupId),
        tool: armedTool,
        label: target.textContent?.trim() ?? null,
        requestedGroupId
      };
    })()`
  });
  return result.result?.value ?? { ok: false, reason: "area_editing_tool_arm_result_missing" };
}

async function collectAreaEditingCellScreenMap(send, { requireValid = false } = {}) {
  const geometry = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => { const canvas = document.querySelector('.workspace-render-canvas'); if (!canvas) return null; const rect = canvas.getBoundingClientRect(); return { left: rect.left, top: rect.top, width: rect.width, height: rect.height }; })()`
  });
  const rect = geometry.result?.value ?? null;
  if (!rect || rect.width < 1 || rect.height < 1) return [];
  const found = new Map();
  const columns = 30;
  const rows = 22;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const point = {
        x: rect.left + ((col + 0.5) / columns) * rect.width,
        y: rect.top + ((row + 0.5) / rows) * rect.height
      };
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point, button: "none", buttons: 0 });
      // Give React's pointer handler and the renderer overlay one frame to
      // publish the anchor witness before sampling the next screen point.
      await sleep(20);
      const evidence = await readAreaEditingPreviewEvidence(send);
      if (!evidence?.anchor || (requireValid && String(evidence.valid) !== "true")) continue;
      const key = cellKey(evidence.anchor);
      if (!found.has(key)) {
        found.set(key, { ...point, row: evidence.anchor.row, col: evidence.anchor.col, preview: evidence });
      }
    }
  }
  return [...found.values()];
}

async function readAreaEditingScenarioSnapshot(send) {
  const result = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const canvas = document.querySelector('.workspace-render-canvas');
      if (!canvas) return null;
      const parse = (value) => { try { return value ? JSON.parse(value) : null; } catch { return null; } };
      const feedback = document.querySelector('.canvas-area-editing-feedback');
      const panelAlert = document.querySelector('.aurora-area-editing-panel [role="alert"]');
      return {
        state: parse(canvas.dataset.areaEditingProofState),
        tool: parse(canvas.dataset.areaEditingProofTool),
        selection: parse(canvas.dataset.areaEditingProofSelection),
        history: {
          pastCount: Number(canvas.dataset.areaEditingProofHistoryPastCount ?? 0),
          futureCount: Number(canvas.dataset.areaEditingProofHistoryFutureCount ?? 0)
        },
        feedback: feedback ? { text: feedback.textContent?.trim() ?? null, role: feedback.getAttribute('role'), className: feedback.className } : null,
        panelAlert: panelAlert?.textContent?.trim() ?? null
      };
    })()`
  });
  return result.result?.value ?? null;
}

async function waitForAreaEditingScenarioSnapshot(send, predicate, timeoutMs = 15_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const snapshot = await readAreaEditingScenarioSnapshot(send);
    if (snapshot && predicate(snapshot)) return snapshot;
    await sleep(100);
  }
  return null;
}

async function findAreaEditingButtonCenter(send, labels) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const labels = ${JSON.stringify(labels)};
      const candidate = Array.from(document.querySelectorAll('button')).find((button) =>
        !button.disabled && labels.includes(button.textContent?.trim() ?? '')
      );
      if (!candidate) return null;
      candidate.scrollIntoView({ block: 'center', inline: 'center' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const rect = candidate.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, label: candidate.textContent?.trim() ?? null }
        : null;
    })()`
  });
  return result.result?.value ?? null;
}

async function readAreaEditingButtonDiagnostics(send) {
  const result = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => Array.from(document.querySelectorAll('.aurora-area-editing-panel button')).map((button) => ({
      label: button.textContent?.trim() ?? null,
      disabled: Boolean(button.disabled)
    })))()`
  });
  return result.result?.value ?? [];
}

async function dispatchTrustedClick(send, point, { modifiers = 0 } = {}) {
  const hit = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const node = document.elementFromPoint(${JSON.stringify(point.x)}, ${JSON.stringify(point.y)});
      const button = node?.closest?.('button') ?? null;
      return {
        tagName: node?.tagName ?? null,
        className: typeof node?.className === 'string' ? node.className : null,
        buttonLabel: button?.textContent?.trim() ?? null,
        buttonDisabled: button ? Boolean(button.disabled) : null
      };
    })()`
  });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: point.x, y: point.y, button: "none", buttons: 0, modifiers });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", buttons: 1, clickCount: 1, modifiers });
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", buttons: 0, clickCount: 1, modifiers });
  return {
    source: "chrome-devtools-protocol-input",
    trustedBrowserInput: true,
    hitTarget: hit.result?.value ?? null,
    hitButtonLabel: hit.result?.value?.buttonLabel ?? null
  };
}

async function dispatchTrustedDrag(send, targets) {
  const [start, end] = targets;
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: start.x, y: start.y, button: "none", buttons: 0 });
  await send("Input.dispatchMouseEvent", { type: "mousePressed", x: start.x, y: start.y, button: "left", buttons: 1, clickCount: 1 });
  for (let step = 1; step <= 8; step += 1) {
    const ratio = step / 8;
    await send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio,
      button: "left",
      buttons: 1
    });
  }
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: end.x, y: end.y, button: "left", buttons: 0, clickCount: 1 });
}

function chooseMultiCopyPastePlans(state, cellMap, { allowIdentical = false } = {}) {
  const byCell = new Map(cellMap.map((cell) => [cellKey(cell), cell]));
  const groupedIds = new Set(
    (state.groupInstances ?? []).flatMap((group) => group.tileIds)
  );
  const loose = state.tiles.filter((tile) => !groupedIds.has(tile.id) && byCell.has(cellKey(tile)));
  const plans = [];
  const seenPairs = new Set();
  for (const first of loose) {
    for (const second of loose) {
      const distance = Math.abs(second.row - first.row) + Math.abs(second.col - first.col);
      if (distance !== 1) continue;
      const pairKey = [first.id, second.id].sort().join("|");
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
      const originRow = Math.min(first.row, second.row);
      const originCol = Math.min(first.col, second.col);
      const sources = [first, second].sort((left, right) => left.row - right.row || left.col - right.col);
      const offsets = sources.map((tile) => ({ row: tile.row - originRow, col: tile.col - originCol }));
      const targets = [];
      for (const target of loose) {
        const destinations = offsets.map((offset) =>
          state.tiles.find((tile) =>
            tile.row === target.row + offset.row && tile.col === target.col + offset.col
          )
        );
        if (
          destinations.some((tile) => !tile || groupedIds.has(tile.id)) ||
          destinations.some((tile) => sources.some((source) => source.id === tile.id))
        ) continue;
        const changesValue = destinations.some((destination, index) => {
          const source = sources[index];
          return destination && (
            destination.tileId !== source.tileId ||
            destination.orientation !== source.orientation ||
            destination.height !== source.height ||
            destination.mainLight1 !== source.mainLight1
          );
        });
        if (!changesValue && !allowIdentical) continue;
        targets.push({
          ...byCell.get(cellKey(target)),
          destinationCells: destinations.map((tile) => ({ row: tile.row, col: tile.col }))
        });
      }
      if (targets.length > 0) {
        plans.push({
          sources: sources.map((tile) => byCell.get(cellKey(tile))),
          targets
        });
      }
    }
  }
  return plans;
}

function changedAreaCells(beforeState, afterState) {
  return afterState.tiles.flatMap((tile) => {
    const before = beforeState.tiles.find((candidate) =>
      candidate.row === tile.row && candidate.col === tile.col
    );
    return jsonEqual(before, tile) ? [] : [{ row: tile.row, col: tile.col }];
  });
}

async function applyExactScenarioUndoRedo(send, before, commit) {
  const undoButton = await findAreaEditingButtonCenter(send, ["Undo tile edit", "Undo"]);
  if (!undoButton) return { ok: false, reason: "scenario_undo_button_missing" };
  await dispatchTrustedClick(send, undoButton);
  const undoSnapshot = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, before.state) &&
    snapshot.history.pastCount === before.history.pastCount &&
    snapshot.history.futureCount === before.history.futureCount + 1
  );
  if (!undoSnapshot) {
    return {
      ok: false,
      reason: "scenario_undo_exact_restoration_not_observed",
      current: await readAreaEditingScenarioSnapshot(send)
    };
  }
  const redoButton = await findAreaEditingButtonCenter(send, ["Redo tile edit", "Redo"]);
  if (!redoButton) return { ok: false, reason: "scenario_redo_button_missing", undoSnapshot };
  await dispatchTrustedClick(send, redoButton);
  const redoSnapshot = await waitForAreaEditingScenarioSnapshot(send, (snapshot) =>
    jsonEqual(snapshot.state, commit.state) &&
    snapshot.history.pastCount === commit.history.pastCount &&
    snapshot.history.futureCount === commit.history.futureCount
  );
  if (!redoSnapshot) {
    return {
      ok: false,
      reason: "scenario_redo_exact_restoration_not_observed",
      undoSnapshot,
      current: await readAreaEditingScenarioSnapshot(send)
    };
  }
  return { ok: true, undoSnapshot, redoSnapshot };
}

async function waitForLabeledInputCenter(send, label, timeoutMs = 10_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const result = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const label = ${JSON.stringify(label)};
        const owner = Array.from(document.querySelectorAll('[role="dialog"] label')).find(
          (candidate) => candidate.textContent?.trim().startsWith(label)
        );
        const input = owner?.querySelector('input') ?? null;
        if (!input) return null;
        input.scrollIntoView({ block: 'center', inline: 'center' });
        const rect = input.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, value: input.value }
          : null;
      })()`
    });
    if (result.result?.value) return result.result.value;
    await sleep(100);
  }
  return null;
}

async function replaceTrustedInputText(send, input, value) {
  await dispatchTrustedClick(send, input);
  await send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    modifiers: 2
  });
  await send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "a",
    code: "KeyA",
    windowsVirtualKeyCode: 65,
    modifiers: 2
  });
  await send("Input.insertText", { text: value });
}

function verifyAreaEditingScenarioCommitInvariant(scenario, before, commit) {
  const beforeState = before.state;
  const state = commit.state;
  if (
    scenario === "area-rotate" ||
    scenario === "area-rotate-rectangular" ||
    scenario === "area-rotate-rectangular-local"
  ) {
    const rectangular = beforeState.width !== beforeState.height;
    const dimensionsTransposed =
      state.width === beforeState.height && state.height === beforeState.width;
    const groupsValid = (state.groupInstances ?? []).every((group) =>
      Number.isInteger(group.orientation) &&
      group.orientation >= 0 &&
      group.orientation <= 3 &&
      group.anchorRow >= 0 &&
      group.anchorRow < state.height &&
      group.anchorCol >= 0 &&
      group.anchorCol < state.width &&
      group.cells.every((cell) =>
        cell.row >= 0 && cell.row < state.height && cell.col >= 0 && cell.col < state.width
      )
    );
    const requiresRectangular =
      scenario === "area-rotate-rectangular" ||
      scenario === "area-rotate-rectangular-local";
    const ok = dimensionsTransposed && groupsValid &&
      (!requiresRectangular || rectangular);
    return {
      ok,
      reason: ok ? null : "area_rotate_rectangular_invariant_failed",
      rectangular,
      beforeSize: `${beforeState.width}x${beforeState.height}`,
      afterSize: `${state.width}x${state.height}`,
      dimensionsTransposed,
      groupCount: state.groupInstances?.length ?? 0,
      groupsValid
    };
  }
  if (scenario === "group-base-height") {
    const previousCount = beforeState.groupInstances?.length ?? 0;
    const placed = state.groupInstances?.slice(previousCount)?.[0] ?? null;
    const memberHeights = placed?.tileIds?.map((tileId) => state.tiles.find((tile) => tile.id === tileId)?.height) ?? [];
    const ok = Boolean(placed) && memberHeights.length === placed.tileIds.length && new Set(memberHeights).size === 1;
    return { ok, reason: ok ? null : "group_base_height_not_uniform", group: placed, memberHeights };
  }
  if (scenario.startsWith("source-group-")) {
    const beforeCount = beforeState.groupInstances?.length ?? 0;
    const afterCount = state.groupInstances?.length ?? 0;
    if (scenario === "source-group-rotate") {
      const beforeSource = beforeState.groupInstances?.find((group) => !group.underlay) ?? null;
      const rotated = state.groupInstances?.find((group) =>
        group.groupId === beforeSource?.groupId &&
        group.anchorRow === beforeSource.anchorRow &&
        group.anchorCol === beforeSource.anchorCol
      ) ?? null;
      const orientationDelta = beforeSource && rotated
        ? (rotated.orientation - beforeSource.orientation + 4) % 4
        : null;
      const ok = afterCount === beforeCount && orientationDelta === 1;
      return {
        ok,
        reason: ok ? null : "source_group_rotation_delta_mismatch",
        beforeCount,
        afterCount,
        beforeOrientation: beforeSource?.orientation ?? null,
        afterOrientation: rotated?.orientation ?? null,
        orientationDelta
      };
    }
    const ok = afterCount === beforeCount - 1;
    return { ok, reason: ok ? null : "source_group_instance_delta_mismatch", beforeCount, afterCount };
  }
  const changedCells = state.tiles.filter((tile) => {
    const previous = beforeState.tiles.find((candidate) => candidate.row === tile.row && candidate.col === tile.col);
    return !jsonEqual(tile, previous);
  });
  const minimum = scenario.startsWith("drag-") ? 2 : 1;
  return { ok: changedCells.length >= minimum, reason: changedCells.length >= minimum ? null : "scenario_changed_cell_delta_too_small", changedCellCount: changedCells.length, minimum };
}

function chooseDistinctCellTargets(cellMap, count) {
  return cellMap.slice(0, count);
}

function chooseAdjacentCellTargets(cellMap) {
  for (const first of cellMap) {
    const second = cellMap.find((candidate) =>
      Math.abs(candidate.row - first.row) + Math.abs(candidate.col - first.col) === 1
    );
    if (second) return [first, second];
  }
  return [];
}

function scenarioFailure(scenario, mutatesScene, reason, details = {}) {
  return { ok: false, scenario, mutatesScene, reason, details };
}

function cellKey(cell) {
  return `${cell.row}:${cell.col}`;
}

function jsonEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function historyEquals(left, right) {
  return left?.pastCount === right?.pastCount && left?.futureCount === right?.futureCount;
}

function assertAreaEditingScenarioRealTileSettlement(
  status,
  openedArea,
  scenario,
  scenarioStatus = null
) {
  const snapshot = status?.terrainTileModelSnapshot ?? null;
  const tileProcess = status?.tileProcessRuntimeSnapshot ?? null;
  const tileCount = Number(snapshot?.tileCount ?? 0);
  const loadedTileCount = Number(snapshot?.loadedTileCount ?? -1);
  const contractTileCount = Number(snapshot?.contractTileCount ?? -1);
  const failedTileCount = Number(snapshot?.failedTileCount ?? -1);
  const bridgeTileCount = Number(snapshot?.bridgeTileCount ?? -1);
  const materialContractCount = Number(snapshot?.materialTextureContractTileCount ?? -1);
  const materialAppliedCount = Number(snapshot?.materialTextureAppliedTileCount ?? -1);
  const materialFailedCount = Number(snapshot?.materialTextureFailedTileCount ?? -1);
  const materialPendingCount = Number(snapshot?.materialTexturePendingTileCount ?? -1);
  const intentionalInvisibleGroundSurfaceEvidence =
    classifyIntentionalInvisibleGroundSurface(status);
  const expectedGroupTileId = Number(scenarioStatus?.action?.expectedTileId ?? Number.NaN);
  const expectedGroupModelReady = scenario !== "group-base-height" || (
    Number.isInteger(expectedGroupTileId) &&
    new RegExp(`(?:^|\\|)[^|]*tile=${expectedGroupTileId},model=[a-z0-9_]+`, "u")
      .test(String(snapshot?.tileTransformSample ?? "")) &&
    materialContractCount >= 0 &&
    materialAppliedCount === materialContractCount &&
    materialFailedCount === 0 &&
    materialPendingCount === 0
  );
  if (
    snapshot?.status !== "ready" ||
    tileCount < 1 ||
    loadedTileCount !== tileCount ||
    contractTileCount !== tileCount ||
    failedTileCount !== 0 ||
    bridgeTileCount !== 0 ||
    materialContractCount < 0 ||
    materialAppliedCount !== materialContractCount ||
    materialFailedCount !== 0 ||
    materialPendingCount !== 0 ||
    tileProcess?.status !== "ready" ||
    Number(tileProcess?.readyCandidateCount ?? -1) !==
      Number(tileProcess?.checkedCandidateCount ?? -2) ||
    Number(tileProcess?.blockedCandidateCount ?? -1) !== 0 ||
    (Number(snapshot?.visibleMeshCount ?? 0) < 1 &&
      !intentionalInvisibleGroundSurfaceEvidence.intentionalInvisibleGroundSurface) ||
    !expectedGroupModelReady
  ) {
    throw createBlockerError(
      "area_editing_scenario_real_tile_settlement_failed",
      `Area editing scenario ${scenario} did not settle with real tile models (loaded=tileCount, failed=0, bridge=0).`,
      {
        scenario,
        openedArea,
        expectedGroupModelReady,
        expectedGroupTileId,
        intentionalInvisibleGroundSurfaceEvidence,
        terrainTileModelSnapshot: snapshot,
        tileProcessRuntimeSnapshot: status?.tileProcessRuntimeSnapshot ?? null
      }
    );
  }
  return {
    intentionalInvisibleGroundSurface:
      intentionalInvisibleGroundSurfaceEvidence.intentionalInvisibleGroundSurface,
    intentionalInvisibleGroundSurfaceEvidence
  };
}

async function createLocalAreaThroughUiForVerify(send, input, settingsTimeoutMs = 175_000) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const input = ${JSON.stringify(input)};
      const settingsTimeoutMs = ${JSON.stringify(settingsTimeoutMs)};
      const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const waitFor = async (read, timeoutMs = 60000) => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const value = read();
          if (value) return value;
          await wait(100);
        }
        return null;
      };
      const buttonByText = (label, root = document) =>
        Array.from(root.querySelectorAll('button')).find((button) =>
          button.textContent?.trim() === label
        ) ?? null;
      const fieldByLabel = (label, root) => {
        const owner = Array.from(root.querySelectorAll('label')).find((candidate) =>
          candidate.textContent?.trim().startsWith(label)
        );
        return owner?.querySelector('input,select') ?? null;
      };
      const setInputValue = (field, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
        if (!setter) throw new Error('HTMLInputElement value setter is unavailable.');
        // React tracks controlled input values separately from the DOM property.
        // Preserve the previous tracker value before assigning so the following
        // native input event is observed exactly like a user edit.
        const previousValue = field.value;
        setter.call(field, String(value));
        const tracker = field._valueTracker;
        tracker?.setValue(previousValue);
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const setSelectValue = (field, value) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
        if (!setter) throw new Error('HTMLSelectElement value setter is unavailable.');
        const previousValue = field.value;
        setter.call(field, String(value));
        const tracker = field._valueTracker;
        tracker?.setValue(previousValue);
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const clearAreaRuntimeDatasets = () => {
        const runtime = document.querySelector('.workspace-render-canvas');
        if (!runtime) return { ok: false, reason: 'runtime_canvas_missing_before_new_area' };
        const workspaceCanvasLayer = document.querySelector('.workspace-canvas-layer');
        [
          'areaTerrainAreaId',
          'areaTerrainTileModelRuntimeStatus',
          'areaTerrainTileModelRuntimeSnapshot',
          'areaTileProcessRuntimeAreaId',
          'areaTileProcessRuntimeStatus',
          'areaTileProcessRuntimeSnapshot',
          'areaObjectSharedRendererSnapshot',
          'areaPrimitiveFallbackRenderSuppressionSnapshot'
        ].forEach((key) => delete runtime.dataset[key]);
        const clearedAt = String(Date.now());
        runtime.dataset.areasRuntimeCaptureClearedAt = clearedAt;
        if (workspaceCanvasLayer?.dataset) {
          workspaceCanvasLayer.dataset.areasRuntimeCaptureClearedAt = clearedAt;
        }
        window.__auroraAreasRuntimeCaptureClearedAt = clearedAt;
        try {
          window.sessionStorage.setItem('aurora_areas_runtime_capture_cleared_at', clearedAt);
        } catch {
          // Session storage is best-effort capture evidence.
        }
        return { ok: true, clearedAt };
      };

      const panel = await waitFor(() => document.querySelector('.aurora-area-editing-panel'));
      if (!panel) return { ok: false, reason: 'area_editing_panel_missing' };
      const readPanelDiagnostics = () => {
        const currentPanel = document.querySelector('.aurora-area-editing-panel');
        return {
        panelText: currentPanel?.textContent?.trim() ?? null,
        buttons: Array.from(currentPanel?.querySelectorAll('button') ?? []).map((button) => ({
          text: button.textContent?.trim() ?? '',
          disabled: Boolean(button.disabled)
        }))
        };
      };
      const openButton = await waitFor(() => {
        const candidate = buttonByText('New blank local Area', panel);
        return candidate && !candidate.disabled ? candidate : null;
      }, 60000);
      if (!openButton) {
        return {
          ok: false,
          reason: 'new_area_button_not_actionable',
          ...readPanelDiagnostics()
        };
      }
      const runtimeDatasetCleared = clearAreaRuntimeDatasets();
      if (!runtimeDatasetCleared.ok) return runtimeDatasetCleared;
      openButton.click();
      const settingsWaitStartedAt = Date.now();
      const settings = await waitFor(() => {
        const currentPanel = document.querySelector('.aurora-area-editing-panel');
        const candidate = currentPanel?.querySelector(
          '[role="group"][aria-label="New Area settings"]'
        );
        return candidate?.querySelector('input') ? candidate : null;
      }, settingsTimeoutMs);
      if (!settings) {
        return {
          ok: false,
          reason: 'new_area_settings_missing',
          elapsedMs: Date.now() - settingsWaitStartedAt,
          settingsTimeoutMs,
          ...readPanelDiagnostics()
        };
      }
      const tileset = fieldByLabel('Tileset', settings);
      const areaResRef = fieldByLabel('Area resref', settings);
      const width = fieldByLabel('Width', settings);
      const height = fieldByLabel('Height', settings);
      const proofInitializer = fieldByLabel('Development proof initializer', settings);
      if (!tileset || !areaResRef || !width || !height) {
        return { ok: false, reason: 'new_area_fields_missing' };
      }
      if (input.proofInitializer && !proofInitializer) {
        return {
          ok: false,
          reason: 'new_area_development_proof_initializer_missing',
          requestedProofInitializer: input.proofInitializer
        };
      }
      const optionReady = await waitFor(() =>
        Array.from(tileset.options ?? []).some((option) => option.value === input.tilesetResRef)
      );
      if (!optionReady) {
        return {
          ok: false,
          reason: 'new_area_tileset_missing',
          requestedTileset: input.tilesetResRef,
          availableTilesets: Array.from(tileset.options ?? []).map((option) => option.value)
        };
      }
      setSelectValue(tileset, input.tilesetResRef);
      setInputValue(areaResRef, input.areaResRef);
      setInputValue(width, input.width);
      setInputValue(height, input.height);
      if (input.proofInitializer) {
        const proofOptionReady = Array.from(proofInitializer.options ?? []).some(
          (option) => option.value === input.proofInitializer
        );
        if (!proofOptionReady) {
          return {
            ok: false,
            reason: 'new_area_development_proof_initializer_unavailable',
            requestedProofInitializer: input.proofInitializer,
            availableProofInitializers: Array.from(proofInitializer.options ?? []).map(
              (option) => option.value
            )
          };
        }
        setSelectValue(proofInitializer, input.proofInitializer);
      }
      await wait(0);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const configuredValues = {
        tilesetResRef: tileset.value,
        areaResRef: areaResRef.value,
        width: Number(width.value),
        height: Number(height.value),
        proofInitializer: proofInitializer?.value ?? null
      };
      if (
        configuredValues.tilesetResRef !== input.tilesetResRef ||
        configuredValues.areaResRef !== input.areaResRef ||
        configuredValues.width !== input.width ||
        configuredValues.height !== input.height ||
        (input.proofInitializer && configuredValues.proofInitializer !== input.proofInitializer)
      ) {
        return {
          ok: false,
          reason: 'new_area_controlled_fields_not_applied',
          requestedValues: input,
          configuredValues
        };
      }
      const createButton = buttonByText('Create local Area', settings);
      if (!createButton) return { ok: false, reason: 'create_local_area_button_missing' };
      createButton.click();
      const expectedSceneId = 'area_' + input.areaResRef;
      const canvas = await waitFor(() => {
        const candidate = document.querySelector('.workspace-render-canvas');
        return candidate?.dataset.currentSceneId === expectedSceneId &&
          candidate.dataset.areaEditingProofState
          ? candidate
          : null;
      });
      if (!canvas) {
        return {
          ok: false,
          reason: 'new_area_canvas_not_ready',
          expectedSceneId,
          configuredValues,
          actualSceneId: document.querySelector('.workspace-render-canvas')?.dataset.currentSceneId ?? null,
          alert: document.querySelector(
            '.aurora-area-editing-panel [role="alert"]'
          )?.textContent?.trim() ?? null
        };
      }
      return {
        ok: true,
        areaText: input.areaResRef,
        rowTitle: input.areaResRef,
        areaExpectation: {
          areaId: expectedSceneId,
          name: input.areaResRef,
          width: input.width,
          height: input.height,
          objectCount: 0
        },
        localBlank: true,
        tileset: input.tilesetResRef,
        source: 'new-area-real-ui-workflow',
        proofInitializer: configuredValues.proofInitializer,
        runtimeDatasetCleared,
        configuredValues,
        sceneId: canvas.dataset.currentSceneId ?? null,
        sceneSize: canvas.dataset.currentSceneSize ?? null,
        tileCount: canvas.dataset.currentSceneTileCount ?? null
      };
    })()`
  });
  const value = result.result?.value ?? null;
  if (!value?.ok) {
    throw createBlockerError(
      "area_editing_new_area_ui_creation_failed",
      "New Area Verify scenario could not create a local draft through the real UI.",
      { input, result: value }
    );
  }
  return value;
}

async function verifyNewAreaDraftThroughUi(send, openedArea, verificationReadinessTimeoutMs) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const waitFor = async (read, timeoutMs = 60000) => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const value = read();
          if (value) return value;
          await wait(100);
        }
        return null;
      };
      const parse = (value) => { try { return value ? JSON.parse(value) : null; } catch { return null; } };
      const canvas = document.querySelector('.workspace-render-canvas');
      if (!canvas) return { ok: false, reason: 'workspace_render_canvas_missing' };
      const verificationReadinessTimeoutMs = ${JSON.stringify(verificationReadinessTimeoutMs)};
      let lastVerificationReadiness = null;
      const verificationTarget = await waitFor(() => {
        const currentPanel = document.querySelector('.aurora-area-editing-panel');
        const verificationGroup = currentPanel?.querySelector(
          '[role="group"][aria-label="Area verification and persistence"]'
        );
        const verifyButton = Array.from(verificationGroup?.querySelectorAll('button') ?? []).find(
          (button) => button.textContent?.trim() === 'Verify Area'
        );
        const waitingNode = currentPanel?.querySelector('[data-area-verification-waiting]');
        const workspace = document.querySelector('.workspace-layout');
        lastVerificationReadiness = {
          panelPresent: Boolean(currentPanel),
          verificationGroupPresent: Boolean(verificationGroup),
          button: verifyButton
            ? {
                present: true,
                disabled: verifyButton.disabled,
                ariaDisabled: verifyButton.getAttribute('aria-disabled'),
                title: verifyButton.getAttribute('title'),
                dataset: { ...verifyButton.dataset }
              }
            : { present: false, disabled: null, ariaDisabled: null, title: null, dataset: null },
          panelReadinessDataset: waitingNode ? { ...waitingNode.dataset } : null,
          panelReadinessText: waitingNode?.textContent?.trim() ?? null,
          workspaceReadinessDataset: workspace
            ? {
                requestPhase: workspace.dataset.areaTileProcessRequestPhase ?? null,
                currentSceneKey: workspace.dataset.areaTileProcessCurrentSceneKey ?? null,
                readinessSceneKey: workspace.dataset.areaTileProcessReadinessSceneKey ?? null,
                portReady: workspace.dataset.areaTileProcessPortReady ?? null,
                tokenReady: workspace.dataset.areaTileProcessTokenReady ?? null,
                mode: workspace.dataset.areaTileProcessMode ?? null
              }
            : null
        };
        return currentPanel && verificationGroup && verifyButton && !verifyButton.disabled
          ? { panel: currentPanel, verifyButton }
          : null;
      }, verificationReadinessTimeoutMs);
      if (!verificationTarget) {
        return {
          ok: false,
          reason: 'area_verification_readiness_wait_timeout',
          timeoutMs: verificationReadinessTimeoutMs,
          readiness: lastVerificationReadiness
        };
      }
      const before = {
        state: parse(canvas.dataset.areaEditingProofState),
        tool: parse(canvas.dataset.areaEditingProofTool),
        selection: parse(canvas.dataset.areaEditingProofSelection),
        history: {
          pastCount: Number(canvas.dataset.areaEditingProofHistoryPastCount ?? 0),
          futureCount: Number(canvas.dataset.areaEditingProofHistoryFutureCount ?? 0)
        }
      };
      verificationTarget.verifyButton.click();
      const report = await waitFor(() => {
        const currentPanel = document.querySelector('.aurora-area-editing-panel');
        const candidate = currentPanel?.querySelector('[aria-label="Area verification report"]');
        return candidate?.dataset.areaVerificationStatus ? candidate : null;
      });
      if (!report) {
        return {
          ok: false,
          reason: 'area_verification_report_missing',
          alert: document.querySelector(
            '.aurora-area-editing-panel [role="alert"]'
          )?.textContent?.trim() ?? null
        };
      }
      const verification = {
        status: report.dataset.areaVerificationStatus ?? null,
        stats: parse(report.dataset.areaVerificationStats),
        issues: parse(report.dataset.areaVerificationIssues),
        sourceUpdatedAtUnixMs: Number(report.dataset.areaVerificationSourceUpdatedAt ?? 0),
        text: report.textContent?.trim() ?? null
      };
      const after = {
        state: parse(canvas.dataset.areaEditingProofState),
        tool: parse(canvas.dataset.areaEditingProofTool),
        selection: parse(canvas.dataset.areaEditingProofSelection),
        history: {
          pastCount: Number(canvas.dataset.areaEditingProofHistoryPastCount ?? 0),
          futureCount: Number(canvas.dataset.areaEditingProofHistoryFutureCount ?? 0)
        }
      };
      const valid = verification.status === 'valid';
      const tileCountMatches = verification.stats?.tileCount === verification.stats?.expectedTileCount;
      return {
        ok: valid && tileCountMatches,
        reason: !valid
          ? 'area_verification_invalid'
          : !tileCountMatches
            ? 'area_verification_tile_count_mismatch'
            : null,
        requestedArea: ${JSON.stringify(openedArea.areaExpectation)},
        before,
        after,
        verification
      };
    })()`
  });
  const value = result.result?.value ?? null;
  if (!value?.ok) {
    if (value?.reason === "area_verification_readiness_wait_timeout") {
      throw createBlockerError(
        "area_editing_new_area_verify_readiness_timeout",
        "New Area Verify remained disabled because current-scene tile asset readiness did not settle.",
        { openedArea, result: value }
      );
    }
    throw createBlockerError(
      "area_editing_new_area_verify_failed",
      "New Area Verify scenario did not produce a valid structural verification report.",
      { openedArea, result: value }
    );
  }
  return value;
}

async function waitForNewAreaRealTileModels(
  send,
  openedAreaText,
  expectedTileCount,
  timeoutMs = 120_000
) {
  const normalizedExpectedTileCount = Number(expectedTileCount);
  if (!Number.isInteger(normalizedExpectedTileCount) || normalizedExpectedTileCount < 1) {
    throw createBlockerError(
      "area_editing_new_area_real_tile_models_not_ready",
      "New Area real-tile settlement requires a positive expected tile count.",
      { openedAreaText, expectedTileCount }
    );
  }
  const startedAt = Date.now();
  let lastStatus = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastStatus = await readAreaRuntimeStatus(send, openedAreaText);
    const terrainSnapshot = lastStatus?.terrainTileModelSnapshot ?? null;
    const tileProcessSnapshot = lastStatus?.tileProcessRuntimeSnapshot ?? null;
    if (
      terrainSnapshot?.status === "ready" &&
      Number(terrainSnapshot.tileCount ?? 0) === normalizedExpectedTileCount &&
      Number(terrainSnapshot.contractTileCount ?? 0) === normalizedExpectedTileCount &&
      Number(terrainSnapshot.loadedTileCount ?? 0) === normalizedExpectedTileCount &&
      Number(terrainSnapshot.failedTileCount ?? 0) === 0 &&
      Number(terrainSnapshot.bridgeTileCount ?? 0) === 0 &&
      tileProcessSnapshot?.status === "ready"
    ) {
      return {
        ok: true,
        expectedTileCount: normalizedExpectedTileCount,
        elapsedMs: Date.now() - startedAt,
        terrainTileModelSnapshot: terrainSnapshot,
        tileProcessRuntimeSnapshot: tileProcessSnapshot
      };
    }
    await sleep(AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS);
  }
  throw createBlockerError(
    "area_editing_new_area_real_tile_models_not_ready",
    "New Area Verify completed, but real tile models did not settle before screenshot capture.",
    {
      openedAreaText,
      expectedTileCount: normalizedExpectedTileCount,
      timeoutMs,
      lastSnapshot: lastStatus?.terrainTileModelSnapshot ?? null,
      tileProcess: lastStatus?.tileProcessRuntimeSnapshot ?? null
    }
  );
}

function writeAreaEditingScenarioArtifacts({
  scenario,
  status,
  openedArea,
  statePath,
  summaryPath,
  screenshotPath,
  canvasScreenshotPath,
  pageScreenshot,
  runtimeCanvasScreenshot
}) {
  const terrainTileModelSnapshot = status.realTileModels?.terrainTileModelSnapshot ?? null;
  const topologyTokens = status.before?.state?.topology?.tokens;
  const topologyTerrainValues = Array.isArray(topologyTokens)
    ? [...new Set(topologyTokens.filter((value) => typeof value === "string" && value.length > 0))]
    : [];
  const recoveredDefaultTerrain = topologyTerrainValues.length === 1
    ? topologyTerrainValues[0]
    : null;
  const recoveredIntentionalInvisible =
    terrainTileModelSnapshot?.visibleMeshCount === 0 &&
    terrainTileModelSnapshot?.loadedTileCount === terrainTileModelSnapshot?.tileCount &&
    recoveredDefaultTerrain === "wall" &&
    String(terrainTileModelSnapshot?.tileTransformSample ?? "").includes("model=sic11_a00_00");
  const stateArtifact = {
    version: "aurora-area-editing-runtime-state/v1",
    capturedAt: new Date().toISOString(),
    scenario,
    openedArea,
    before: status.before ?? null,
    copy: status.copy ?? null,
    prep: status.prep ?? null,
    commit: status.commit ?? null,
    undo: status.undo ?? null,
    redo: status.redo ?? null,
    after: status.after ?? status.redo?.snapshot ?? status.commit ?? null,
    action: status.action ?? null,
    assertions: status.assertions ?? null,
    pointerDispatch: status.pointerDispatch ?? null,
    verification: status.verification ?? null,
    realTileModels: status.realTileModels ?? null
  };
  const summaryArtifact = {
    version: "aurora-area-editing-runtime-summary/v1",
    capturedAt: stateArtifact.capturedAt,
    status: status.ok ? "captured" : "blocked",
    scenario,
    areaResRef: openedArea.areaText ?? null,
    tilesetResRef: openedArea.tileset ?? null,
    width: openedArea.areaExpectation?.width ?? null,
    height: openedArea.areaExpectation?.height ?? null,
    verificationStatus: status.verification?.status ?? null,
    stats: status.verification?.stats ?? null,
    issueCount: Array.isArray(status.verification?.issues)
      ? status.verification.issues.length
      : null,
    mutatesScene: status.mutatesScene ?? null,
    acceptedTargetCount: status.action?.acceptedTargetCount ?? null,
    exactStateHistorySelectionAssertions: status.assertions ?? null,
    steps: {
      before: Boolean(status.before),
      prep: status.prep
        ? { captured: true, preparedBaseHeight: status.prep.preparedBaseHeight ?? null }
        : { captured: false },
      commit: Boolean(status.commit),
      undo: status.undo?.applicable === false
        ? { applicable: false, reason: status.undo.reason ?? null }
        : { applicable: true, captured: Boolean(status.undo?.snapshot) },
      redo: status.redo?.applicable === false
        ? { applicable: false, reason: status.redo.reason ?? null }
        : { applicable: true, captured: Boolean(status.redo?.snapshot) }
    },
    realTileModels: status.realTileModels
      ? {
          status: status.realTileModels.terrainTileModelSnapshot?.status ?? null,
          expectedTileCount: status.realTileModels.expectedTileCount ?? null,
          tileCount: status.realTileModels.terrainTileModelSnapshot?.tileCount ?? null,
          contractTileCount:
            status.realTileModels.terrainTileModelSnapshot?.contractTileCount ?? null,
          loadedTileCount:
            status.realTileModels.terrainTileModelSnapshot?.loadedTileCount ?? null,
          failedTileCount:
            status.realTileModels.terrainTileModelSnapshot?.failedTileCount ?? null,
          bridgeTileCount:
            status.realTileModels.terrainTileModelSnapshot?.bridgeTileCount ?? null,
          visibleMeshCount:
            status.realTileModels.terrainTileModelSnapshot?.visibleMeshCount ?? null,
          defaultTerrain:
            status.realTileModels.terrainTileModelSnapshot?.defaultTerrain ??
            status.realTileModels.tileProcessRuntimeSnapshot?.defaultTerrain ??
            openedArea.defaultTerrain ??
            openedArea.configuredValues?.defaultTerrain ??
            recoveredDefaultTerrain,
          intentionalInvisible:
            status.realTileModels.terrainTileModelSnapshot?.intentionalInvisible ??
            status.realTileModels.tileProcessRuntimeSnapshot?.intentionalInvisible ??
            recoveredIntentionalInvisible,
          intentionalInvisibleGroundSurface:
            status.realTileModels.intentionalInvisibleGroundSurface ?? false,
          intentionalInvisibleGroundSurfaceEvidence:
            status.realTileModels.intentionalInvisibleGroundSurfaceEvidence ?? null,
          tileProcessStatus:
            status.realTileModels.tileProcessRuntimeSnapshot?.status ?? null,
          elapsedMs: status.realTileModels.elapsedMs ?? null
        }
      : null,
    statePath,
    screenshotPath,
    canvasScreenshotPath,
    pageScreenshot,
    runtimeCanvasScreenshot
  };
  fs.writeFileSync(statePath, `${JSON.stringify(stateArtifact, null, 2)}\n`);
  fs.writeFileSync(summaryPath, `${JSON.stringify(summaryArtifact, null, 2)}\n`);
  return { statePath, summaryPath };
}

async function createLocalBlankAreaForEditingProof(send) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
      const waitFor = async (read, timeoutMs = 20000) => {
        const startedAt = Date.now();
        while (Date.now() - startedAt < timeoutMs) {
          const value = read();
          if (value) return value;
          await wait(100);
        }
        return null;
      };
      const panel = await waitFor(() => document.querySelector('.aurora-area-editing-panel'));
      if (!panel) {
        return { ok: false, reason: 'area_editing_panel_missing' };
      }
      const terrain = (value) => ({
        topLeft: value,
        topRight: value,
        bottomRight: value,
        bottomLeft: value
      });
      const heights = { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 };
      const proofDetail = {
          areaResRef: 'new_area',
          width: 4,
          height: 4,
          definition: {
            tilesetResRef: 'proof_set',
            fingerprint: 'a'.repeat(64),
            defaultTerrain: 'grass',
            terrainTypes: [
              { id: 'grass', name: 'Grass' },
              { id: 'water', name: 'Water' }
            ],
            crosserTypes: [{ id: 'road', name: 'Road feature' }],
            transitionRules: [
              {
                placedTerrain: 'water',
                placedHeight: 0,
                adjacentTerrain: 'grass',
                adjacentHeight: 0,
                changedTerrain: 'water',
                changedHeight: 0
              }
            ],
            tiles: [
              { tileId: 0, terrain: terrain('grass'), crossers: {}, cornerHeights: heights },
              { tileId: 1, terrain: terrain('water'), crossers: {}, cornerHeights: heights },
              { tileId: 2, terrain: terrain('grass'), crossers: {}, cornerHeights: heights, groupId: 'proof_group' },
              { tileId: 3, terrain: terrain('grass'), crossers: {}, cornerHeights: heights, groupId: 'proof_group' },
              { tileId: 4, terrain: terrain('grass'), crossers: { top: 'road' }, cornerHeights: heights },
              { tileId: 5, terrain: terrain('grass'), crossers: { right: 'road' }, cornerHeights: heights },
              { tileId: 6, terrain: terrain('grass'), crossers: { bottom: 'road' }, cornerHeights: heights },
              { tileId: 7, terrain: terrain('grass'), crossers: { left: 'road' }, cornerHeights: heights }
            ],
            groups: [
              { id: 'proof_group', name: 'Two tile proof group', rows: 1, columns: 2, tileIds: [2, 3] }
            ]
          }
        };
      let canvas = null;
      const proofDispatchStartedAt = Date.now();
      while (!canvas && Date.now() - proofDispatchStartedAt < 30000) {
        window.dispatchEvent(new CustomEvent('aurora:areas:create-local-editing-proof', {
          detail: proofDetail
        }));
        await wait(250);
        const candidate = document.querySelector('.workspace-render-canvas');
        canvas = candidate?.dataset.currentSceneId === 'area_new_area' ? candidate : null;
      }
      const terrainPalette = await waitFor(() =>
        panel.querySelector('[role="group"][aria-label="Terrain palette"]')
      , 30000);
      if (!canvas || !terrainPalette) {
        return {
          ok: false,
          reason: 'local_blank_area_not_ready',
          sceneId: document.querySelector('.workspace-render-canvas')?.dataset.currentSceneId ?? null,
          alert: panel.querySelector('[role="alert"]')?.textContent?.trim() ?? null
        };
      }
      return {
        ok: true,
        areaText: 'new_area',
        rowTitle: 'new_area',
        areaExpectation: {
          areaId: 'area_new_area',
          name: 'new_area',
          width: 4,
          height: 4,
          objectCount: 0
        },
        localBlank: true,
        tileset: 'proof_set',
        source: 'dev-only-deterministic-area-editing-proof-event',
        sceneId: canvas.dataset.currentSceneId ?? null,
        sceneSize: canvas.dataset.currentSceneSize ?? null,
        tileCount: canvas.dataset.currentSceneTileCount ?? null
      };
    })()`
  });
  const value = result.result?.value ?? null;
  if (!value?.ok) {
    throw createBlockerError(
      "area_editing_local_blank_not_created",
      "Area editing proof could not create its isolated local blank Area.",
      { result: value }
    );
  }
  return value;
}

async function readLocalBlankAreaRuntimeStatus(send, openedArea) {
  const status = await readAreaRuntimeStatus(send, openedArea.areaText);
  return {
    ...status,
    openedAreaText: openedArea.areaText,
    areaExpectation: openedArea.areaExpectation,
    runtimeFreshness: buildLocalBlankRuntimeFreshness({
      expectedAreaId: openedArea.areaExpectation.areaId,
      actualSceneId: status.canvasSceneDataset?.sceneId ?? null
    }),
    captureWaitElapsedMs: 0
  };
}

function parseRuntimeDatasetJson(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    return {
      parseError: error instanceof Error ? error.message : String(error)
    };
  }
}

function buildCapturedAreaMutationRuntimeEvidence(dataset) {
  if (!dataset || typeof dataset !== "object") {
    return {
      terrainSnapshot: null,
      cameraFrame: null,
      presentedFrame: null
    };
  }
  return {
    terrainSnapshot: parseRuntimeDatasetJson(
      dataset.areaTerrainTileModelRuntimeSnapshot
    ),
    cameraFrame: {
      mode: dataset.areaCameraFrameMode ?? null,
      terrainBuildId: dataset.areaCameraFrameTerrainBuildId ?? null,
      tileStateDigest: dataset.areaCameraFrameTileStateDigest ?? null,
      boundsDigest: dataset.areaCameraFrameBoundsDigest ?? null,
      boundsPolicy: dataset.areaCameraFrameBoundsPolicy ?? null,
      observedTerrainBounds:
        dataset.areaCameraFrameObservedTerrainBounds ?? null,
      cameraTerrainBounds:
        dataset.areaCameraFrameCameraTerrainBounds ?? null,
      excludedMeshCount:
        dataset.areaCameraFrameExcludedMeshCount ?? null,
      excludedMeshSample:
        dataset.areaCameraFrameExcludedMeshSample ?? null,
      runtimeBoundsExpansionRatio:
        dataset.areaCameraFrameRuntimeBoundsExpansionRatio ?? null,
      runtimeBoundsPolicyStatus:
        dataset.areaCameraFrameRuntimeBoundsPolicyStatus ?? null,
      requiresIndependentVisualReview:
        dataset.areaCameraFrameRuntimeBoundsPolicyStatus ===
        "runtime_bounds_outlier",
      coverageStatus: dataset.areaCameraFrameCoverageStatus ?? null,
      clippedCornerCount:
        dataset.areaCameraFrameClippedCornerCount ?? null,
      minimumNdcMargin:
        dataset.areaCameraFrameMinimumNdcMargin ?? null
    },
    presentedFrame: {
      sequence: dataset.areaPresentedFrameSequence ?? null,
      terrainBuildId: dataset.areaPresentedFrameTerrainBuildId ?? null,
      tileStateDigest: dataset.areaPresentedFrameTileStateDigest ?? null,
      cameraTerrainBuildId:
        dataset.areaPresentedFrameCameraTerrainBuildId ?? null,
      cameraTileStateDigest:
        dataset.areaPresentedFrameCameraTileStateDigest ?? null,
      cameraCoverageStatus:
        dataset.areaPresentedFrameCameraCoverageStatus ?? null,
      presentedAt: dataset.areaPresentedFramePresentedAt ?? null,
      settlementToken:
        dataset.areaPresentedFrameSettlementToken ?? null
    }
  };
}

async function captureRuntimeCanvasPng(
  send,
  canvasPngPath,
  isolateObjectId = null,
  highlightObjectIds = []
) {
  try {
    const requestedObjectId = typeof isolateObjectId === "string" ? isolateObjectId.trim() : "";
    const requestedObjectIds = Array.isArray(highlightObjectIds)
      ? highlightObjectIds.map((objectId) => String(objectId).trim()).filter(Boolean)
      : [];
    const result = await send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(() => {
        const hook = window.__auroraAreaRuntimeCapture;
        if (!hook || typeof hook.captureCanvasFrame !== "function") {
          return { ok: false, reason: "aurora_area_runtime_capture_hook_missing" };
        }
        const isolateObjectId = ${JSON.stringify(requestedObjectId)};
        let captured = null;
        if (isolateObjectId) {
          if (typeof hook.captureIsolatedObjectFrame !== "function") {
            captured = {
              ok: false,
              reason: "aurora_area_runtime_capture_isolate_hook_missing",
              requestedObjectId: isolateObjectId
            };
          } else {
            captured = hook.captureIsolatedObjectFrame(isolateObjectId);
          }
        } else {
          const highlightObjectIds = ${JSON.stringify(requestedObjectIds)};
          if (highlightObjectIds.length > 0) {
            if (typeof hook.captureHighlightedObjectFrame !== "function") {
              captured = {
                ok: false,
                reason: "aurora_area_runtime_capture_highlight_hook_missing",
                requestedObjectIds: highlightObjectIds
              };
            } else {
              captured = hook.captureHighlightedObjectFrame(highlightObjectIds);
            }
          } else {
            captured = hook.captureCanvasFrame();
          }
        }
        const dataUrl = typeof captured?.dataUrl === "string" ? captured.dataUrl : "";
        if (captured?.ok && dataUrl.startsWith("data:image/png;base64,")) {
          return captured;
        }
        return {
          ok: false,
          reason: captured?.reason || captured?.issue || "aurora_area_runtime_capture_hook_failed",
          requestedObjectId: isolateObjectId,
          requestedObjectIds: highlightObjectIds
        };
      })()`
    });
    const value = result.result?.value ?? null;
    const dataUrl = typeof value?.dataUrl === "string" ? value.dataUrl : "";
    const prefix = "data:image/png;base64,";
    if (!value?.ok || !dataUrl.startsWith(prefix)) {
      return {
        ok: false,
        path: canvasPngPath,
        reason: value?.reason ?? value?.issue ?? "runtime_canvas_capture_failed",
        width: value?.width ?? null,
        height: value?.height ?? null,
        camera: value?.camera ?? null,
        requestedObjectId: value?.requestedObjectId ?? requestedObjectId,
        requestedObjectIds: value?.requestedObjectIds ?? requestedObjectIds,
        matchedObjectId: value?.matchedObjectId ?? "",
        matchedObjectIds: value?.matchedObjectIds ?? [],
        matchedObjectName: value?.matchedObjectName ?? "",
        matchedObjectNames: value?.matchedObjectNames ?? [],
        visibleObjectCount: value?.visibleObjectCount ?? null,
        highlightedObjectCount: value?.highlightedObjectCount ?? null,
        areaMutationRuntimeEvidence:
          buildCapturedAreaMutationRuntimeEvidence(value?.dataset)
      };
    }
    fs.writeFileSync(canvasPngPath, Buffer.from(dataUrl.slice(prefix.length), "base64"));
    const stats = fs.statSync(canvasPngPath);
    return {
      ok: true,
      path: canvasPngPath,
      bytes: stats.size,
      width: value.width ?? null,
      height: value.height ?? null,
      camera: value.camera ?? null,
      requestedObjectId: value.requestedObjectId ?? requestedObjectId,
      requestedObjectIds: value.requestedObjectIds ?? requestedObjectIds,
      matchedObjectId: value.matchedObjectId ?? "",
      matchedObjectIds: value.matchedObjectIds ?? [],
      matchedObjectName: value.matchedObjectName ?? "",
      matchedObjectNames: value.matchedObjectNames ?? [],
      visibleObjectCount: value.visibleObjectCount ?? null,
      highlightedObjectCount: value.highlightedObjectCount ?? null,
      areaMutationRuntimeEvidence:
        buildCapturedAreaMutationRuntimeEvidence(value.dataset)
    };
  } catch (error) {
    return {
      ok: false,
      path: canvasPngPath,
      reason: "runtime_canvas_capture_exception",
      requestedObjectId: typeof isolateObjectId === "string" ? isolateObjectId.trim() : "",
      requestedObjectIds: Array.isArray(highlightObjectIds)
        ? highlightObjectIds.map((objectId) => String(objectId).trim()).filter(Boolean)
        : [],
      matchedObjectId: "",
      matchedObjectIds: [],
      matchedObjectName: "",
      matchedObjectNames: [],
      visibleObjectCount: null,
      highlightedObjectCount: null,
      areaMutationRuntimeEvidence:
        buildCapturedAreaMutationRuntimeEvidence(null),
      cause: serializeError(error)
    };
  }
}

async function captureAreaEditingScenarioVisualStep({
  send,
  suffix,
  pngPath,
  canvasPngPath,
  captureIsolateObjectId,
  captureHighlightObjectIds,
  addCdpEventHandler,
  capturePageScreenshot,
  capturePageScreenshotFromSurface,
  captureScreencastScreenshot
}) {
  const stepPngPath = pngPath.replace(/\.png$/u, `.${suffix}.png`);
  const stepCanvasPngPath = canvasPngPath.replace(/\.canvas\.png$/u, `.${suffix}.canvas.png`);
  const runtimeCanvasScreenshot = await captureRuntimeCanvasPng(
    send,
    stepCanvasPngPath,
    captureIsolateObjectId,
    captureHighlightObjectIds
  );
  const pageScreenshot = await capturePageOrCanvasScreenshot({
    send,
    addCdpEventHandler,
    capturePageScreenshot,
    capturePageScreenshotFromSurface,
    captureScreencastScreenshot,
    pngPath: stepPngPath,
    runtimeCanvasScreenshot
  });
  return {
    step: suffix,
    screenshotPath: stepPngPath,
    canvasScreenshotPath: stepCanvasPngPath,
    pageScreenshot,
    runtimeCanvasScreenshot
  };
}

async function attachTerminalTileModelBlockerVisualEvidence(error, input) {
  if (error?.captureBlocker?.code !== "tile_model_source_missing") return;
  try {
    error.captureBlocker.diagnosticVisualEvidence =
      await captureAreaEditingScenarioVisualStep({
        ...input,
        suffix: "blocked"
      });
  } catch (visualCaptureError) {
    // Keep the source diagnosis authoritative even when the optional evidence
    // capture itself cannot be produced.
    error.captureBlocker.diagnosticVisualEvidenceError = serializeError(visualCaptureError);
  }
}

/**
 * A freshly created Area can select any legal SET tile before the browser has
 * received its model contracts.  When that settlement fails, keep a canvas
 * frame of the actual blocked Area: without it an audit would only retain a
 * JSON timeout and could not distinguish missing source data from a camera or
 * placement regression.
 */
async function attachNewAreaTileModelWaitVisualEvidence(error, input) {
  if (error?.captureBlocker?.code !== "area_editing_new_area_real_tile_models_not_ready") {
    return;
  }
  try {
    error.captureBlocker.diagnosticVisualEvidence =
      await captureAreaEditingScenarioVisualStep({
        ...input,
        suffix: "blocked-before-mutation"
      });
  } catch (visualCaptureError) {
    error.captureBlocker.diagnosticVisualEvidenceError = serializeError(visualCaptureError);
  }
}

/**
 * A batch may return a per-tile TILE_NOT_FOUND while its remaining tiles load
 * normally. In that case the terrain snapshot is `partial`, rather than the
 * terminal `blocked` state used by the narrower source blocker classifier.
 * Preserve the post-mutation canvas before reporting the settlement timeout:
 * it is the visual proof that the legal SET group was placed but is incomplete.
 */
async function attachAreaEditingSettlementVisualEvidence(error, input) {
  if (error?.captureBlocker?.code !== "areas_runtime_snapshot_stale_or_missing") {
    return;
  }
  try {
    error.captureBlocker.diagnosticVisualEvidence =
      await captureAreaEditingScenarioVisualStep({
        ...input,
        suffix: "blocked-after-mutation"
      });
  } catch (visualCaptureError) {
    error.captureBlocker.diagnosticVisualEvidenceError = serializeError(visualCaptureError);
  }
}

async function capturePageOrCanvasScreenshot({
  send,
  addCdpEventHandler,
  capturePageScreenshot = true,
  capturePageScreenshotFromSurface = true,
  captureScreencastScreenshot = false,
  pngPath,
  runtimeCanvasScreenshot
}) {
  if (capturePageScreenshot) {
    try {
      const screenshot = await send("Page.captureScreenshot", {
        format: "png",
        fromSurface: capturePageScreenshotFromSurface,
        captureBeyondViewport: false
      });
      fs.writeFileSync(pngPath, Buffer.from(screenshot.data, "base64"));
      return {
        ok: true,
        source: "page-capture-screenshot",
        fromSurface: capturePageScreenshotFromSurface,
        path: pngPath,
        bytes: fs.statSync(pngPath).size
      };
    } catch (error) {
      if (!captureScreencastScreenshot) {
        throw error;
      }
      return captureCdpScreencastScreenshot({
        send,
        addCdpEventHandler,
        pngPath,
        fallbackFrom: "page-capture-screenshot",
        fallbackCause: serializeError(error)
      });
    }
  }

  if (runtimeCanvasScreenshot?.ok && runtimeCanvasScreenshot.path) {
    fs.copyFileSync(runtimeCanvasScreenshot.path, pngPath);
    return {
      ok: true,
      source: "runtime-canvas-copy",
      path: pngPath,
      bytes: fs.statSync(pngPath).size,
      sourcePath: runtimeCanvasScreenshot.path
    };
  }

  if (captureScreencastScreenshot) {
    return captureCdpScreencastScreenshot({
      send,
      addCdpEventHandler,
      pngPath,
      fallbackFrom: "runtime-canvas-copy",
      fallbackCause: runtimeCanvasScreenshot ?? null
    });
  }

  throw createBlockerError(
    "areas_runtime_canvas_screenshot_missing",
    "Areas runtime capture requested canvas-only proof, but no runtime canvas PNG was available.",
    {
      pngPath,
      runtimeCanvasScreenshot
    }
  );
}

async function captureCdpScreencastScreenshot({
  send,
  addCdpEventHandler,
  pngPath,
  fallbackFrom,
  fallbackCause
}) {
  if (typeof addCdpEventHandler !== "function") {
    throw createBlockerError(
      "areas_runtime_screencast_handler_missing",
      "Areas runtime capture requested CDP screencast proof, but no event handler registration was available.",
      {
        pngPath,
        fallbackFrom,
        fallbackCause
      }
    );
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    let removeFrameHandler = () => {};
    let timeout = null;

    const settle = (fn) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timeout) {
        clearTimeout(timeout);
      }
      removeFrameHandler();
      try {
        fn();
      } finally {
        send("Page.stopScreencast").catch(() => {
          // Best effort: some Chrome builds stop the stream after the first frame.
        });
      }
    };

    removeFrameHandler = addCdpEventHandler("Page.screencastFrame", (params) => {
      const data = typeof params?.data === "string" ? params.data : "";
      settle(() => {
        try {
          if (params?.sessionId !== undefined) {
            send("Page.screencastFrameAck", { sessionId: params.sessionId }).catch(() => {
              // The frame is already in hand; ack failure should not discard proof.
            });
          }
          if (!data) {
            throw createBlockerError(
              "areas_runtime_screencast_frame_empty",
              "Areas runtime CDP screencast produced a frame event without PNG data.",
              {
                pngPath,
                fallbackFrom,
                fallbackCause
              }
            );
          }
          fs.writeFileSync(pngPath, Buffer.from(data, "base64"));
          resolve({
            ok: true,
            source: "page-screencast-frame",
            path: pngPath,
            bytes: fs.statSync(pngPath).size,
            fallbackFrom,
            fallbackCause
          });
        } catch (error) {
          reject(error);
        }
      });
    });

    timeout = setTimeout(() => {
      settle(() => {
        reject(
          createBlockerError(
            "areas_runtime_screencast_frame_timeout",
            "Areas runtime CDP screencast did not produce a frame before timeout.",
            {
              pngPath,
              fallbackFrom,
              fallbackCause
            }
          )
        );
      });
    }, 15_000);

    send("Page.startScreencast", {
      format: "png",
      quality: 100,
      everyNthFrame: 1
    }).catch((error) => {
      settle(() => {
        reject(
          createBlockerError(
            "areas_runtime_screencast_start_failed",
            "Areas runtime CDP screencast could not be started.",
            {
              pngPath,
              fallbackFrom,
              fallbackCause,
              cause: serializeError(error)
            }
          )
        );
      });
    });
  });
}

async function applyFocusedPerspectiveCaptureView(
  send,
  captureView,
  captureViewFocus = {},
  {
    cleanCanvas = false,
    tileLightsVisible = null,
    displayFog = null,
    useAreaLighting = null,
    terrainVoidMasksVisible = null,
    terrainVoidMaskFilter = {},
    terrainMaterialMode = null,
    renderPriorityObjectIds = []
  } = {}
) {
  const focus = normalizeCaptureViewFocusEvidence(captureViewFocus);
  if (focus.worldX === null || focus.worldZ === null) {
    return {
      requested: captureView,
      applied: false,
      mode: "default",
      focus,
      reason: "focus_world_x_or_z_missing"
    };
  }
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const focus = ${JSON.stringify(focus)};
      const runtime = document.querySelector(".workspace-render-canvas");
      if (!runtime) {
        return {
          requested: "focused-perspective",
          applied: false,
          ok: false,
          reason: "workspace_render_canvas_missing"
        };
      }
      runtime.dispatchEvent(
        new CustomEvent("aurora:areas:focused-perspective-camera", {
          detail: {
            source: "areas-runtime-cdp-capture",
            cleanCanvas: ${JSON.stringify(cleanCanvas)},
            tileLightsVisible: ${JSON.stringify(tileLightsVisible)},
            displayFog: ${JSON.stringify(displayFog)},
            useAreaLighting: ${JSON.stringify(useAreaLighting)},
            renderPriorityObjectIds: ${JSON.stringify(renderPriorityObjectIds)},
            terrainVoidMasksVisible: ${JSON.stringify(terrainVoidMasksVisible)},
            terrainVoidMaskModelResRef: ${JSON.stringify(terrainVoidMaskFilter.modelResRef ?? null)},
            terrainVoidMaskSourceMesh: ${JSON.stringify(terrainVoidMaskFilter.sourceMesh ?? null)},
            terrainMaterialMode: ${JSON.stringify(terrainMaterialMode)},
            targetX: focus.worldX,
            ...(typeof focus.worldY === "number" ? { targetY: focus.worldY } : {}),
            targetZ: focus.worldZ,
            ...(typeof focus.distance === "number" ? { distance: focus.distance } : {}),
            ...(typeof focus.yawDegrees === "number" ? { yawDegrees: focus.yawDegrees } : {}),
            ...(typeof focus.elevationDegrees === "number"
              ? { elevationDegrees: focus.elevationDegrees }
              : {})
          }
        })
      );
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const dataset = runtime.dataset ?? {};
      return {
        requested: "focused-perspective",
        applied: dataset.areaCameraFrameMode === "focused_perspective",
        ok: dataset.areaCameraFrameMode === "focused_perspective",
        mode: dataset.areaCameraFrameMode ?? null,
        source: dataset.areaCameraFrameSource ?? null,
        target: dataset.areaCameraFrameTarget ?? null,
        distance: dataset.areaCameraFrameDistance ?? null,
        size: dataset.areaCameraFrameSize ?? null,
        zoomRange: dataset.areaCameraFrameZoomRange ?? null,
        fov: dataset.areaCameraFrameFov ?? null,
        position: dataset.areaCameraFramePosition ?? null,
        actualTarget: dataset.areaCameraFrameActualTarget ?? null,
        up: dataset.areaCameraFrameUp ?? null,
        direction: dataset.areaCameraFrameDirection ?? null,
        actualDistance: dataset.areaCameraFrameActualDistance ?? null,
        focus,
        cleanCanvas: dataset.areaOracleCleanCanvas ?? null,
        cleanCanvasSource: dataset.areaOracleCleanCanvasSource ?? null,
        renderPriorityObjectIds: dataset.areaOracleRenderPriorityObjectIds ?? null,
        tileLightsVisible: dataset.areaOracleTileLightsVisible ?? null,
        displayFog: dataset.areaOracleDisplayFog ?? null,
        useAreaLighting: dataset.areaOracleUseAreaLighting ?? null,
        areaLightingLayerFound: dataset.areaOracleAreaLightingLayerFound ?? null,
        areaLightingLayerChildCount: dataset.areaOracleAreaLightingLayerChildCount ?? null,
        tileLightLayerFound: dataset.areaOracleTileLightLayerFound ?? null,
        tileLightLayerChildCount: dataset.areaOracleTileLightLayerChildCount ?? null,
        terrainVoidMasksVisible: dataset.areaOracleTerrainVoidMasksVisible ?? null,
        terrainVoidMaskCount: dataset.areaOracleTerrainVoidMaskCount ?? null,
        terrainVoidMaskMatchedCount: dataset.areaOracleTerrainVoidMaskMatchedCount ?? null,
        terrainVoidMaskFilterModelResRef: dataset.areaOracleTerrainVoidMaskFilterModelResRef ?? null,
        terrainVoidMaskFilterSourceMesh: dataset.areaOracleTerrainVoidMaskFilterSourceMesh ?? null,
        terrainMaterialMode: dataset.areaOracleTerrainMaterialMode ?? null,
        terrainMaterialConvertedCount: dataset.areaOracleTerrainMaterialConvertedCount ?? null,
        terrainMaterialLayerFound: dataset.areaOracleTerrainMaterialLayerFound ?? null
      };
    })()`
  });
  const value = result.result?.value ?? null;
  if (!value?.ok) {
    throw createBlockerError(
      "areas_capture_focused_perspective_view_not_applied",
      "Areas runtime capture requested focused perspective view, but the canvas did not acknowledge it.",
      {
        captureView,
        focus,
        result: value
      }
    );
  }
  return value;
}

async function applyCaptureRemoveObjectIds(send, removeObjectIds = []) {
  const requestedObjectIds = Array.isArray(removeObjectIds)
    ? removeObjectIds.map((objectId) => String(objectId).trim()).filter(Boolean)
    : [];
  if (requestedObjectIds.length === 0) {
    return {
      requestedObjectIds,
      applied: false,
      removedObjectIds: []
    };
  }

  const removedObjectIds = [];
  const steps = [];
  for (const objectId of requestedObjectIds) {
    const selectResult = await send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const objectId = ${JSON.stringify(objectId)};
        let rows = [];
        let row = null;
        for (let attempt = 0; attempt < 40; attempt += 1) {
          rows = Array.from(
            document.querySelectorAll("button.scene-object-row-source-backed, button")
          );
          row = rows.find((candidate) => {
            const text = (candidate.textContent ?? "").replace(/\\s+/gu, " ").trim();
            return text.includes(objectId + " |") || text.includes(" " + objectId + " ");
          }) ?? null;
          if (row) {
            break;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 100));
        }
        if (!row) {
          return {
            ok: false,
            reason: "scene_object_row_missing",
            objectId,
            rowCount: rows.length,
            sample: rows.slice(0, 12).map((candidate) =>
              (candidate.textContent ?? "").replace(/\\s+/gu, " ").trim().slice(0, 180)
            )
          };
        }
        row.scrollIntoView({ block: "center", inline: "nearest" });
        row.click();
        await new Promise((resolve) => window.setTimeout(resolve, 80));
        return {
          ok: true,
          objectId,
          selectedText: (row.textContent ?? "").replace(/\\s+/gu, " ").trim()
        };
      })()`
    });
    const selected = selectResult.result?.value ?? null;
    if (!selected?.ok) {
      return {
        requestedObjectIds,
        applied: removedObjectIds.length > 0,
        removedObjectIds,
        ok: false,
        reason: selected?.reason ?? "scene_object_select_failed",
        failedObjectId: objectId,
        steps
      };
    }

    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Delete",
      code: "Delete",
      windowsVirtualKeyCode: 46,
      nativeVirtualKeyCode: 46
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Delete",
      code: "Delete",
      windowsVirtualKeyCode: 46,
      nativeVirtualKeyCode: 46
    });
    await sleep(250);

    let verifyResult = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const objectId = ${JSON.stringify(objectId)};
        const rows = Array.from(
          document.querySelectorAll("button.scene-object-row-source-backed, button")
        );
        const matchingRows = rows
          .map((candidate) => (candidate.textContent ?? "").replace(/\\s+/gu, " ").trim())
          .filter((text) => text.includes(objectId + " |") || text.includes(" " + objectId + " "));
        const bodyText = document.body?.innerText ?? "";
        return {
          ok: matchingRows.length === 0,
          objectId,
          matchingRows,
          objectHeader:
            bodyText.match(/Scene Objects\\s+(\\d+)\\s+GIT\\s+(\\d+)\\s+PLC\\s+(\\d+)\\s+DOR\\s+(\\d+)/i)?.slice(1) ?? null
        };
      })()`
    });
    let verified = verifyResult.result?.value ?? null;
    if (!verified?.ok) {
      await send("Runtime.evaluate", {
        awaitPromise: true,
        returnByValue: true,
        expression: `(async () => {
          const event = new KeyboardEvent("keydown", {
            key: "Delete",
            code: "Delete",
            bubbles: true,
            cancelable: true
          });
          window.dispatchEvent(event);
          await new Promise((resolve) => window.setTimeout(resolve, 250));
          return {
            defaultPrevented: event.defaultPrevented
          };
        })()`
      });
      verifyResult = await send("Runtime.evaluate", {
        returnByValue: true,
        expression: `(() => {
          const objectId = ${JSON.stringify(objectId)};
          const rows = Array.from(
            document.querySelectorAll("button.scene-object-row-source-backed, button")
          );
          const matchingRows = rows
            .map((candidate) => (candidate.textContent ?? "").replace(/\\s+/gu, " ").trim())
            .filter((text) => text.includes(objectId + " |") || text.includes(" " + objectId + " "));
          const bodyText = document.body?.innerText ?? "";
          return {
            ok: matchingRows.length === 0,
            objectId,
            matchingRows,
            objectHeader:
              bodyText.match(/Scene Objects\\s+(\\d+)\\s+GIT\\s+(\\d+)\\s+PLC\\s+(\\d+)\\s+DOR\\s+(\\d+)/i)?.slice(1) ?? null
          };
        })()`
      });
      verified = verifyResult.result?.value ?? null;
    }
    steps.push({
      objectId,
      selectedText: selected.selectedText ?? null,
      removed: verified?.ok === true,
      objectHeader: verified?.objectHeader ?? null,
      matchingRows: verified?.matchingRows ?? []
    });
    if (!verified?.ok) {
      return {
        requestedObjectIds,
        applied: removedObjectIds.length > 0,
        removedObjectIds,
        ok: false,
        reason: "scene_object_delete_not_applied",
        failedObjectId: objectId,
        steps
      };
    }
    removedObjectIds.push(objectId);
  }

  return {
    requestedObjectIds,
    applied: removedObjectIds.length > 0,
    ok: true,
    removedObjectIds,
    steps
  };
}

async function applyCaptureVisibility(send, captureVisibility) {
  if (captureVisibility !== "terrain-only") {
    return {
      requested: captureVisibility,
      applied: false,
      mode: "all"
    };
  }
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const runtime = document.querySelector(".workspace-render-canvas");
      if (!runtime) {
        return {
          requested: "terrain-only",
          applied: false,
          ok: false,
          reason: "workspace_render_canvas_missing"
        };
      }
      runtime.dispatchEvent(
        new CustomEvent("aurora:areas:oracle-render-visibility", {
          detail: {
            source: "areas-runtime-cdp-capture",
            objectsVisible: false
          }
        })
      );
      const styleId = "aurora-areas-runtime-capture-terrain-only-style";
      let terrainOnlyStyle = document.getElementById(styleId);
      if (!terrainOnlyStyle) {
        terrainOnlyStyle = document.createElement("style");
        terrainOnlyStyle.id = styleId;
        terrainOnlyStyle.textContent = [
          ".canvas-area-runtime-alert",
          ".canvas-placeable-load-overlay"
        ].join(",") + "{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}";
        document.head.appendChild(terrainOnlyStyle);
      }
      const hiddenOverlayCount = Array.from(
        document.querySelectorAll(".canvas-area-runtime-alert, .canvas-placeable-load-overlay")
      ).reduce((count, element) => {
        if (element instanceof HTMLElement) {
          element.dataset.areasRuntimeCaptureHidden = "terrain-only";
          element.style.display = "none";
          return count + 1;
        }
        return count;
      }, 0);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const dataset = runtime.dataset ?? {};
      return {
        requested: "terrain-only",
        applied: dataset.areaOracleRenderVisibility === "terrain_only",
        ok:
          dataset.areaOracleRenderVisibility === "terrain_only" &&
          dataset.areaOracleObjectLayerVisible === "false",
        mode: dataset.areaOracleRenderVisibility ?? null,
        objectLayerVisible: dataset.areaOracleObjectLayerVisible ?? null,
        source: dataset.areaOracleRenderVisibilitySource ?? null,
        hiddenOverlayCount
      };
    })()`
  });
  const value = result.result?.value ?? null;
  if (!value?.ok) {
    throw createBlockerError(
      "areas_capture_terrain_only_visibility_not_applied",
      "Areas runtime capture requested terrain-only oracle visibility, but the canvas did not acknowledge it.",
      {
        captureVisibility,
        result: value
      }
    );
  }
  return value;
}

async function applyCaptureCeilingMeshes(send, captureCeilingMeshes) {
  if (captureCeilingMeshes === null) {
    return {
      requested: "default",
      applied: false,
      mode: "unchanged"
    };
  }
  const requested = captureCeilingMeshes === true;
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const requested = ${requested ? "true" : "false"};
      const waitFrames = async (count) => {
        for (let index = 0; index < count; index += 1) {
          await new Promise((resolve) => requestAnimationFrame(resolve));
        }
      };
      const normalizeButtonText = (button) => String(button.textContent ?? "").trim();
      const buttons = () => Array.from(document.querySelectorAll("button"));
      const canvasTab = buttons().find((button) => normalizeButtonText(button) === "Canvas");
      if (canvasTab && !canvasTab.classList.contains("is-active")) {
        canvasTab.click();
        await waitFrames(2);
      }
      const ceilingButton = buttons().find((button) => normalizeButtonText(button) === "Ceiling");
      if (!ceilingButton) {
        return {
          requested,
          applied: false,
          ok: false,
          reason: "ceiling_button_missing",
          canvasTabFound: Boolean(canvasTab)
        };
      }
      const before = ceilingButton.classList.contains("is-active");
      if (before !== requested) {
        ceilingButton.click();
        await waitFrames(8);
      } else {
        await waitFrames(4);
      }
      const styleId = "aurora-areas-runtime-capture-hide-topbar-drawer";
      let captureStyle = document.getElementById(styleId);
      if (!captureStyle) {
        captureStyle = document.createElement("style");
        captureStyle.id = styleId;
        captureStyle.textContent =
          ".topbar-drawer{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}";
        document.head.appendChild(captureStyle);
      }
      await waitFrames(2);
      const after = ceilingButton.classList.contains("is-active");
      const runtime = document.querySelector(".workspace-render-canvas");
      const dataset = runtime?.dataset ?? {};
      return {
        requested,
        applied: after === requested,
        ok: after === requested,
        before,
        after,
        hiddenCount: dataset.areaTerrainTileCeilingMeshHiddenCount ?? null,
        matchedCount: dataset.areaTerrainTileCeilingMeshMatchedCount ?? null,
        visibleMeshCount: dataset.areaTerrainTileModelVisibleMeshCount ?? null,
        hiddenMeshSample: dataset.areaTerrainTileModelHiddenMeshSample ?? null
      };
    })()`
  });
  const value = result.result?.value ?? null;
  if (!value?.ok) {
    throw createBlockerError(
      "areas_capture_ceiling_meshes_not_applied",
      "Areas runtime capture requested a ceiling-mesh visibility state, but the canvas did not acknowledge it.",
      {
        captureCeilingMeshes,
        result: value
      }
    );
  }
  return value;
}

async function preflightRuntimeEnvironment({
  route,
  bootstrapRoute,
  authBaseUrl,
  backendDirectHealthUrl,
  runtimeBuildBinding
}) {
  const frontendChecks = [];
  for (const endpoint of [route, bootstrapRoute]) {
    frontendChecks.push(
      await probeHttpEndpoint(endpoint, {
        label: endpoint === route ? "frontend_app" : "frontend_login",
        expectJson: false
      })
    );
  }
  const frontendOk = frontendChecks.some((check) => check.ok);
  if (!frontendOk) {
    throw createBlockerError(
      "frontend_unavailable",
      "Frontend route is unavailable before Areas runtime capture.",
      {
        runtimeEnvironmentPreflight: {
          frontend: frontendChecks,
          backendProxyHealth: null,
          backendDirectHealth: null
        }
      }
    );
  }

  if (runtimeBuildBinding) {
    const expectedFrontendOrigin = runtimeBuildBinding.frontend.baseUrl;
    const wrongFrontendOrigin = frontendChecks.find((check) => {
      try {
        return new URL(check.endpoint).origin !== expectedFrontendOrigin;
      } catch {
        return true;
      }
    });
    let directOriginMatches = false;
    try {
      directOriginMatches =
        new URL(backendDirectHealthUrl).origin ===
        runtimeBuildBinding.backend.baseUrl;
    } catch {
      directOriginMatches = false;
    }
    if (wrongFrontendOrigin || !directOriginMatches) {
      throw createBlockerError(
        "runtime_build_origin_mismatch",
        "Areas runtime capture origins do not match the immutable runtime-build profile.",
        {
          expectedFrontendOrigin,
          expectedBackendOrigin: runtimeBuildBinding.backend.baseUrl,
          frontend: frontendChecks,
          backendDirectHealthUrl
        }
      );
    }
  }

  const backendProxyHealth = await probeHttpEndpoint(`${authBaseUrl}/health`, {
    label: "backend_proxy_health",
    expectJson: true
  });
  if (backendProxyHealth.ok && !runtimeBuildBinding) {
    return {
      status: "ok",
      frontend: frontendChecks,
      backendProxyHealth,
      backendDirectHealth: null
    };
  }

  const backendDirectHealth = await probeHttpEndpoint(backendDirectHealthUrl, {
    label: "backend_direct_health",
    expectJson: true
  });
  const runtimeEnvironmentPreflight = {
    status:
      backendProxyHealth.ok && backendDirectHealth.ok
        ? "ok"
        : backendDirectHealth.ok
          ? "backend_proxy_blocked"
          : "backend_direct_blocked",
    frontend: frontendChecks,
    backendProxyHealth,
    backendDirectHealth
  };

  if (runtimeBuildBinding && backendProxyHealth.ok && backendDirectHealth.ok) {
    const backendErrors = validateMatrixRuntimeBuildObservations(
      runtimeBuildBinding,
      {
        frontend: runtimeBuildBinding.frontend,
        backendProxy: backendProxyHealth.payload?.runtimeBuild ?? null,
        backendDirect: backendDirectHealth.payload?.runtimeBuild ?? null
      }
    ).filter((code) => !code.startsWith("MATRIX_FRONTEND_RUNTIME_BUILD_"));
    if (backendErrors.length > 0) {
      throw createBlockerError(
        "runtime_build_backend_identity_mismatch",
        "Backend proxy/direct runtime-build readback does not match the immutable profile.",
        {
          runtimeEnvironmentPreflight,
          runtimeBuildBinding,
          errors: backendErrors
        }
      );
    }
    return runtimeEnvironmentPreflight;
  }

  if (backendDirectHealth.ok) {
    throw createBlockerError(
      "backend_proxy_unavailable",
      "Backend health is reachable directly, but unavailable through the frontend proxy.",
      {
        endpoint: backendProxyHealth.endpoint,
        port: backendProxyHealth.port,
        status: backendProxyHealth.status ?? null,
        elapsedMs: backendProxyHealth.elapsedMs,
        cause: backendProxyHealth.cause ?? null,
        runtimeEnvironmentPreflight
      }
    );
  }

  throw createBlockerError(
    "backend_direct_unavailable",
    "Backend health is unavailable through the frontend proxy and direct backend health endpoint.",
    {
      endpoint: backendDirectHealth.endpoint,
      port: backendDirectHealth.port,
      status: backendDirectHealth.status ?? null,
      elapsedMs: backendDirectHealth.elapsedMs,
      cause: backendDirectHealth.cause ?? null,
      runtimeEnvironmentPreflight,
      relatedBlockers: [
        {
          lane: "capture",
          code: "backend_proxy_unavailable",
          summary: "Backend proxy health check failed before Areas runtime capture.",
          details: backendProxyHealth
        }
      ]
    }
  );
}

function buildMatrixRuntimeBuildProof(
  binding,
  runtimeEnvironmentPreflight,
  runtimeEnvironmentPostCapture,
  domStatus,
  runtimeSourceIdentityPreflight,
  runtimeSourceIdentityPostCapture
) {
  if (!binding) return null;
  const frontendObservation = domStatus?.frontendRuntimeBuildIdentity ?? null;
  const preflightObservations = {
    frontend: frontendObservation,
    backendProxy:
      runtimeEnvironmentPreflight?.backendProxyHealth?.payload?.runtimeBuild ??
      null,
    backendDirect:
      runtimeEnvironmentPreflight?.backendDirectHealth?.payload?.runtimeBuild ??
      null
  };
  const observations = {
    frontend: frontendObservation,
    backendProxy:
      runtimeEnvironmentPostCapture?.backendProxyHealth?.payload?.runtimeBuild ??
      null,
    backendDirect:
      runtimeEnvironmentPostCapture?.backendDirectHealth?.payload?.runtimeBuild ??
      null
  };
  const sourceIdentity = {
    preflight: summarizeTileAddConnectRuntimeSourceIdentity(
      runtimeSourceIdentityPreflight
    ),
    postCapture: summarizeTileAddConnectRuntimeSourceIdentity(
      runtimeSourceIdentityPostCapture
    )
  };
  const errors = new Set(
    validateMatrixRuntimeBuildObservations(binding, observations)
  );
  for (const error of validateMatrixRuntimeBuildObservations(
    binding,
    preflightObservations
  )) {
    errors.add(`PREFLIGHT_${error}`);
  }
  if (
    preflightObservations.backendDirect?.processStartedAt !==
      observations.backendDirect?.processStartedAt ||
    preflightObservations.backendProxy?.processStartedAt !==
      observations.backendProxy?.processStartedAt
  ) {
    errors.add("MATRIX_BACKEND_RUNTIME_BUILD_PROCESS_RESTARTED_DURING_CAPTURE");
  }
  for (const error of validateTileAddConnectRuntimeSourceIdentity(
    binding,
    sourceIdentity.preflight
  )) {
    errors.add(`PREFLIGHT_${error}`);
  }
  for (const error of validateTileAddConnectRuntimeSourceIdentity(
    binding,
    sourceIdentity.postCapture
  )) {
    errors.add(`POST_CAPTURE_${error}`);
  }
  if (JSON.stringify(sourceIdentity.preflight) !== JSON.stringify(sourceIdentity.postCapture)) {
    errors.add("MATRIX_RUNTIME_SOURCE_IDENTITY_CHANGED_DURING_CAPTURE");
  }
  const errorList = [...errors].sort((left, right) => left.localeCompare(right));
  return {
    schema: "aurora-tile-add-connect-runtime-build-proof/v1",
    status: errorList.length === 0 ? "verified" : "blocked",
    binding,
    preflightObservations,
    observations,
    sourceIdentity,
    errors: errorList
  };
}

async function createPersistedAuthState({ authBaseUrl, username, password }) {
  const loginEndpoint = `${authBaseUrl}/auth/login`;
  const loginPayload = await fetchJsonWithTimeout(loginEndpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, password })
  }, "backend_login", {
    blockerCode: "backend_login_failed"
  });
  const accessToken = loginPayload.data?.session?.accessToken;
  if (!accessToken) {
    throw createBlockerError("backend_login_failed", "Backend login returned no access token.", {
      endpoint: loginEndpoint,
      port: resolveUrlPort(loginEndpoint),
      failureKind: "backend_login_missing_access_token"
    });
  }
  const meEndpoint = `${authBaseUrl}/auth/me`;
  const mePayload = await fetchJsonWithTimeout(meEndpoint, {
    headers: { authorization: `Bearer ${accessToken}` }
  }, "backend_me", {
    blockerCode: "backend_login_failed"
  });
  const role = mePayload.data?.roles?.[0] ?? "builder";
  return {
    session: {
      accessToken,
      issuedAt: loginPayload.data.session.issuedAt,
      expiresAt: loginPayload.data.session.expiresAt,
      user: {
        id: mePayload.data?.userId ?? loginPayload.data?.user?.userId ?? "u_builder_001",
        username,
        displayName:
          mePayload.data?.displayName ?? loginPayload.data?.user?.displayName ?? "Builder User",
        role
      }
    },
    authorization: {
      role,
      permissions: Array.isArray(mePayload.data?.permissions) ? mePayload.data.permissions : []
    }
  };
}

async function resolveExpectedAreaFromBackend({ authBaseUrl, accessToken, areaQuery }) {
  const endpoint = `${authBaseUrl}/areas?${new URLSearchParams({
    query: areaQuery,
    limit: "100",
    offset: "0"
  }).toString()}`;
  const payload = await fetchJsonWithTimeout(endpoint, {
    headers: { authorization: `Bearer ${accessToken}` }
  }, "areas_list");
  const items = payload?.data?.items;
  if (!Array.isArray(items)) {
    throw createBlockerError("areas_list_payload_invalid", "Areas list payload did not include data.items.", {
      endpoint,
      port: resolveUrlPort(endpoint),
      payloadShape: Object.keys(payload ?? {})
    });
  }
  const match = pickExpectedArea(items, areaQuery);
  if (!match.area) {
    throw createBlockerError("area_target_not_found", `Could not resolve target Area ${areaQuery}.`, {
      endpoint,
      port: resolveUrlPort(endpoint),
      areaQuery,
      candidateCount: items.length,
      candidates: items.slice(0, 12).map((item) => ({
        areaId: item.areaId ?? null,
        name: item.name ?? null,
        width: item.width ?? null,
        height: item.height ?? null,
        totalObjects: item.objectCounts?.total ?? null
      }))
    });
  }
  return {
    areaId: match.area.areaId,
    name: match.area.name,
    width: match.area.width,
    height: match.area.height,
    objectCounts: match.area.objectCounts ?? null,
    textureAtlasId: match.area.textureAtlasId ?? null,
    updatedAt: match.area.updatedAt ?? null,
    listEndpoint: endpoint,
    matchStrategy: match.strategy,
    candidateCount: items.length
  };
}

async function resolveExpectedAreaDetailFromBackend({ authBaseUrl, accessToken, areaId }) {
  if (!areaId) {
    return {
      status: "skipped",
      areaId: null,
      endpoint: null,
      objectCount: 0,
      objects: []
    };
  }
  const endpoint = `${authBaseUrl}/areas/${encodeURIComponent(areaId)}`;
  try {
    const payload = await fetchJsonWithTimeout(endpoint, {
      headers: { authorization: `Bearer ${accessToken}` }
    }, "areas_detail");
    const area = payload?.data ?? payload;
    const objects = Array.isArray(area?.objects) ? area.objects : [];
    return {
      status: "available",
      endpoint,
      areaId: area?.areaId ?? areaId,
      name: area?.name ?? null,
      objectCount: objects.length,
      objects: objects.map((object) => ({
        objectId: object.objectId ?? null,
        kind: object.kind ?? null,
        templateId: object.templateId ?? null,
        resRef: object.resRef ?? null,
        appearanceType: object.appearanceType ?? null,
        genericType: object.genericType ?? null,
        x: numberOrNull(object.x),
        y: numberOrNull(object.y),
        z: numberOrNull(object.z),
        bearing: numberOrNull(object.bearing),
        visualTransform:
          object.visualTransform && typeof object.visualTransform === "object"
            ? { ...object.visualTransform }
            : null
      }))
    };
  } catch (error) {
    return {
      status: "unavailable",
      endpoint,
      areaId,
      objectCount: null,
      objects: [],
      blocker: normalizeCaptureError(error)
    };
  }
}

async function probeHttpEndpoint(endpoint, { label, expectJson }) {
  const startedAt = Date.now();
  try {
    const response = await fetchWithTimeout(endpoint, { method: "GET" }, label);
    const elapsedMs = Date.now() - startedAt;
    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();
    let payload = null;
    let parseError = null;
    if (text && (expectJson || contentType.includes("json"))) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        parseError = formatErrorForMessage(error);
      }
    }
    const ok = response.ok && (!expectJson || !parseError);
    return {
      ok,
      label,
      endpoint,
      port: resolveUrlPort(endpoint),
      method: "GET",
      elapsedMs,
      status: response.status,
      statusText: response.statusText,
      contentType,
      responseTextTail: ok ? undefined : text.slice(-800),
      payload: payload && ok ? payload : undefined,
      parseError: parseError ?? undefined
    };
  } catch (error) {
    return {
      ok: false,
      label,
      endpoint,
      port: resolveUrlPort(endpoint),
      method: "GET",
      elapsedMs: Date.now() - startedAt,
      timeoutMs: httpTimeoutMs,
      cause: serializeError(error)
    };
  }
}

async function fetchWithTimeout(endpoint, init, label) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`${label} timed out after ${httpTimeoutMs}ms`));
  }, httpTimeoutMs);
  try {
    return await fetch(endpoint, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithTimeout(endpoint, init, label, options = {}) {
  const startedAt = Date.now();
  const method = init?.method ?? "GET";
  const blockerCode = options.blockerCode ?? null;
  try {
    const response = await fetchWithTimeout(endpoint, init, label);
    const elapsedMs = Date.now() - startedAt;
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (error) {
      throw createBlockerError(blockerCode ?? `${label}_invalid_json`, `${label} returned non-JSON response.`, {
        endpoint,
        port: resolveUrlPort(endpoint),
        method,
        elapsedMs,
        status: response.status,
        failureKind: `${label}_invalid_json`,
        responseTextTail: text.slice(-800),
        parseError: formatErrorForMessage(error)
      });
    }
    if (!response.ok) {
      throw createBlockerError(blockerCode ?? `${label}_http_${response.status}`, `${label} failed with HTTP ${response.status}.`, {
        endpoint,
        port: resolveUrlPort(endpoint),
        method,
        elapsedMs,
        status: response.status,
        failureKind: `${label}_http_${response.status}`,
        payload
      });
    }
    return payload;
  } catch (error) {
    if (error?.captureBlocker) {
      throw error;
    }
    const elapsedMs = Date.now() - startedAt;
    const timedOut = error?.name === "AbortError" || /timed out/i.test(error?.message ?? "");
    throw createBlockerError(
      blockerCode ?? (timedOut ? `${label}_timeout` : `${label}_fetch_failed`),
      `${label} ${timedOut ? "timed out" : "request failed"} for ${endpoint}.`,
      {
        endpoint,
        port: resolveUrlPort(endpoint),
        method,
        elapsedMs,
        timeoutMs: httpTimeoutMs,
        failureKind: timedOut ? `${label}_timeout` : `${label}_fetch_failed`,
        cause: serializeError(error)
      }
    );
  }
}

async function seedBrowserAuthState(send, seededAuthState, workspaceOptionsOverride = {}) {
  const workspaceOptions =
    typeof workspaceOptionsOverride.tileOverlay === "boolean"
      ? { showTileGridOverlay: workspaceOptionsOverride.tileOverlay }
      : null;
  const terrainOnlyRuntimeCapture = workspaceOptionsOverride.terrainOnly === true;
  await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `(() => {
      window.localStorage.setItem(
        "aurora_web.auth_session.v1",
        ${JSON.stringify(JSON.stringify(seededAuthState))}
      );
      window.localStorage.setItem("aurora_web.workspace_mode.v1", "areas_mode");
      const workspaceOptions = ${JSON.stringify(workspaceOptions)};
      if (workspaceOptions) {
        window.localStorage.setItem(
          "aurora_web.workspace_options",
          JSON.stringify(workspaceOptions)
        );
        window.localStorage.removeItem("aurora_web.workspace_options.v1");
      }
      if (${JSON.stringify(terrainOnlyRuntimeCapture)}) {
        window.sessionStorage.setItem(
          ${JSON.stringify(AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY_SESSION_KEY)},
          "true"
        );
        window.__AURORA_AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY__ = true;
      } else {
        window.sessionStorage.removeItem(
          ${JSON.stringify(AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY_SESSION_KEY)}
        );
        delete window.__AURORA_AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY__;
      }
      return true;
    })()`
  });
}

async function refreshSameBrowserAuthStateWithoutNavigation(
  send,
  refreshedAuthState,
  timeoutMs
) {
  const beforeSession = await readSameBrowserRestartSessionIdentity(send);
  const serializedState = JSON.stringify(refreshedAuthState);
  const response = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(() => {
      const key = "aurora_web.auth_session.v1";
      const oldValue = window.localStorage.getItem(key);
      const newValue = ${JSON.stringify(serializedState)};
      window.localStorage.setItem(key, newValue);
      const dispatched = window.dispatchEvent(
        new StorageEvent("storage", {
          key,
          oldValue,
          newValue,
          storageArea: window.localStorage,
          url: window.location.href
        })
      );
      return {
        dispatched,
        storedExactly: window.localStorage.getItem(key) === newValue,
        href: window.location.href,
        marker: window.__auroraAreasSameBrowserRestartProofV1 ?? null,
        performanceTimeOrigin: window.performance.timeOrigin
      };
    })()`
  });
  const dispatchStatus = response.result.value;
  if (dispatchStatus?.storedExactly !== true) {
    throw createBlockerError(
      "same_browser_restart_auth_refresh_storage_failed",
      "The refreshed backend session could not be stored in the existing browser document.",
      { dispatchStatus }
    );
  }
  const deadline = Date.now() + timeoutMs;
  let afterSession = null;
  while (Date.now() <= deadline) {
    afterSession = await readSameBrowserRestartSessionIdentity(send);
    if (
      afterSession?.marker === beforeSession?.marker &&
      afterSession?.performanceTimeOrigin === beforeSession?.performanceTimeOrigin &&
      afterSession?.href === beforeSession?.href
    ) {
      // React consumes the same-tab StorageEvent asynchronously. Give the
      // state/effect chain a stable turn before the authoritative Area reopen.
      await sleep(500);
      break;
    }
    await sleep(100);
  }
  if (
    afterSession?.marker !== beforeSession?.marker ||
    afterSession?.performanceTimeOrigin !== beforeSession?.performanceTimeOrigin ||
    afterSession?.href !== beforeSession?.href
  ) {
    throw createBlockerError(
      "same_browser_restart_auth_refresh_document_changed",
      "Refreshing the backend session replaced or navigated the browser document.",
      { beforeSession, afterSession, dispatchStatus, timeoutMs }
    );
  }
  return {
    status: "adopted_without_navigation",
    userId: refreshedAuthState.session.user.id,
    issuedAt: refreshedAuthState.session.issuedAt,
    accessTokenSha256: crypto
      .createHash("sha256")
      .update(refreshedAuthState.session.accessToken, "utf8")
      .digest("hex"),
    beforeSession,
    afterSession
  };
}

async function authenticateBrowserForCapture(
  send,
  seededAuthState,
  credentials,
  workspaceOptionsOverride = {}
) {
  const authenticatedAppWaitMs = Math.max(loginWaitMs, DEFAULT_AUTHENTICATED_APP_WAIT_MS);
  const initialStatus = await waitForLoginOrApp(send);
  await seedBrowserAuthState(send, seededAuthState, workspaceOptionsOverride);
  await send("Page.navigate", { url: route });
  const seededStatus = await waitForAuthenticatedAppOrLogin(send, authenticatedAppWaitMs);
  if (isAuthenticatedAppStatus(seededStatus)) {
    return {
      ...seededStatus,
      authMethod: "seeded_storage",
      workspaceOptionsOverride,
      initialStatus
    };
  }
  const fallbackLoginStatus = seededStatus?.hasUsername
    ? seededStatus
    : await prepareLoginFormFallback(send, authenticatedAppWaitMs);
  if (!fallbackLoginStatus?.hasUsername) {
    throw createBlockerError(
      "frontend_auth_seed_route_guard_blocked",
      "Seeded browser auth did not reach the app route and the login form was not available for fallback.",
      {
        endpoint: route,
        port: resolveUrlPort(route),
        initialStatus,
        seededStatus,
        fallbackLoginStatus
      }
    );
  }
  const submitted = await submitLoginForm(send, credentials, authenticatedAppWaitMs);
  const submittedStatus = await waitForAuthenticatedApp(send, authenticatedAppWaitMs, {
    submitted
  });
  return {
    ...submittedStatus,
    authMethod: "login_form_fallback",
    workspaceOptionsOverride,
    initialStatus,
    seededStatus,
    fallbackLoginStatus,
    submitted
  };
}

async function prepareLoginFormFallback(send, timeoutMs) {
  await send("Runtime.evaluate", {
    awaitPromise: true,
    expression: `(() => {
      window.localStorage.removeItem("aurora_web.auth_session.v1");
      return true;
    })()`
  });
  await send("Page.navigate", { url: bootstrapRoute });
  return waitForAuthenticatedAppOrLogin(send, timeoutMs);
}

async function waitForAuthenticatedAppOrLogin(send, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;
  let stableAppPolls = 0;
  do {
    const status = await readLoginStatus(send);
    lastStatus = status;
    if (status?.hasUsername && status?.routePath !== "/app") {
      return status;
    }
    if (isAuthenticatedAppStatus(status)) {
      stableAppPolls += 1;
      if (stableAppPolls >= APP_AUTH_SETTLED_MIN_STABLE_POLLS) {
        return {
          ...status,
          authSettledPollCount: stableAppPolls
        };
      }
    } else {
      stableAppPolls = 0;
    }
    await sleep(APP_AUTH_SETTLED_POLL_INTERVAL_MS);
  } while (Date.now() < deadline);
  return lastStatus;
}

async function waitForAuthenticatedApp(send, timeoutMs, diagnostics = {}) {
  const status = await waitForAuthenticatedAppOrLogin(send, timeoutMs);
  if (isAuthenticatedAppStatus(status)) {
    return status;
  }
  throw createBlockerError(
    "frontend_login_fallback_did_not_reach_authenticated_app",
    "Login form fallback did not reach a settled authenticated app route.",
    {
      endpoint: route,
      port: resolveUrlPort(route),
      lastStatus: status,
      timeoutMs,
      ...diagnostics
    }
  );
}

function isAuthenticatedAppStatus(status) {
  return (
    status?.routePath === "/app" &&
    status?.hasStoredAuth === true &&
    status?.hasUsername !== true &&
    (status?.hasAreaPanel === true ||
      status?.hasWorkspaceCanvas === true ||
      status?.hasAuthenticatedAppShell === true)
  );
}

async function waitForAppRouteOrLogin(send, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;
  do {
    const status = await readLoginStatus(send);
    lastStatus = status;
    if (status?.routePath === "/app" || status?.hasUsername) {
      return status;
    }
    await sleep(100);
  } while (Date.now() < deadline);
  return lastStatus;
}

async function waitForAppRoute(send, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastStatus = null;
  do {
    const status = await readLoginStatus(send);
    lastStatus = status;
    if (status?.routePath === "/app") {
      return status;
    }
    await sleep(150);
  } while (Date.now() < deadline);
  throw createBlockerError(
    "frontend_login_fallback_did_not_reach_app",
    "Login form fallback did not navigate to the app route.",
    {
      endpoint: route,
      port: resolveUrlPort(route),
      lastStatus,
      timeoutMs
    }
  );
}

async function submitLoginForm(send, credentials, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastSubmitted = null;
  let attemptCount = 0;
  do {
    attemptCount += 1;
    const result = await send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const username = document.querySelector("#username");
        const password = document.querySelector("#password");
        const form = username?.closest("form") ?? password?.closest("form");
        if (!username || !password || !form) {
          return {
            ok: false,
            reason: "login_form_missing",
            href: window.location.href,
            hasUsername: Boolean(username),
            hasPassword: Boolean(password),
            hasForm: Boolean(form),
            submitEventHandled: false
          };
        }
        const setValue = (element, value) => {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          if (setter) {
            setter.call(element, value);
          } else {
            element.value = value;
          }
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new Event("change", { bubbles: true }));
        };
        setValue(username, ${JSON.stringify(credentials.username)});
        setValue(password, ${JSON.stringify(credentials.password)});
        await new Promise((resolve) => window.setTimeout(resolve, 0));
        const submitEvent = new Event("submit", { bubbles: true, cancelable: true });
        const submitEventHandled = form.dispatchEvent(submitEvent) === false;
        await new Promise((resolve) => window.setTimeout(resolve, 0));
        return {
          ok: submitEventHandled,
          reason: submitEventHandled ? "react_submit_handler_confirmed" : "submit_handler_not_ready",
          submitEventHandled,
          href: window.location.href,
          usernameLength: username.value.length,
          passwordLength: password.value.length
        };
      })()`
    });
    const submitted = {
      ...result.result.value,
      attemptCount
    };
    lastSubmitted = submitted;
    if (submitted?.ok && submitted.submitEventHandled) {
      return submitted;
    }
    await sleep(APP_AUTH_SETTLED_POLL_INTERVAL_MS);
  } while (Date.now() < deadline);

  throw createBlockerError(
    "frontend_login_form_handler_not_ready",
    "Login form rendered but its submit handler did not become ready before the guarded timeout.",
    {
      endpoint: bootstrapRoute,
      port: resolveUrlPort(bootstrapRoute),
      timeoutMs,
      submitted: lastSubmitted
    }
  );
}

async function waitForLoginOrApp(send) {
  const deadline = Date.now() + loginWaitMs;
  let lastStatus = null;
  do {
    const status = await readLoginStatus(send);
    lastStatus = status;
    if (status?.hasUsername || status?.routePath === "/app" || status?.routePath === "/login") {
      return status;
    }
    await sleep(150);
  } while (Date.now() < deadline);
  throw createBlockerError("frontend_login_element_missing", "Login route did not expose an auth-ready app origin.", {
    endpoint: bootstrapRoute,
    port: resolveUrlPort(bootstrapRoute),
    selector: "#username",
    timeoutMs: loginWaitMs,
    lastStatus
  });
}

async function readLoginStatus(send) {
  const status = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => ({
      href: window.location.href,
      routePath: window.location.pathname,
      hasUsername: Boolean(document.querySelector("#username")),
      hasPassword: Boolean(document.querySelector("#password")),
      hasStoredAuth: Boolean(window.localStorage.getItem("aurora_web.auth_session.v1")),
      storedWorkspaceMode: window.localStorage.getItem("aurora_web.workspace_mode.v1"),
      hasAreaPanel: Boolean(document.querySelector(".area-selection-panel")),
      hasWorkspaceCanvas: Boolean(document.querySelector(".workspace-render-canvas")),
      hasOpenedAreaStatus: Boolean(document.querySelector(".areas-mode-open-area")),
      hasAuthenticatedAppShell: Boolean(
        document.querySelector(".page-content-workspace") ||
          document.querySelector(".workspace-mode-panel")
      )
    }))()`
  });
  return status.result.value;
}

async function waitForAreasWorkspace(send) {
  let lastStatus = null;
  const startedAt = Date.now();
  for (let attempt = 0; attempt < AREAS_WORKSPACE_LIST_WAIT_ATTEMPTS; attempt += 1) {
    const status = await readAreasWorkspaceStatus(send);
    lastStatus = {
      ...status,
      areasWorkspaceWaitElapsedMs: Date.now() - startedAt
    };
    if (status?.hasAreaPanel && status?.hasCanvas && status?.areaRowCount > 0) {
      return lastStatus;
    }
    await sleep(AREAS_WORKSPACE_LIST_WAIT_INTERVAL_MS);
  }
  throw createBlockerError("areas_workspace_missing_element", "Areas workspace did not expose area panel, canvas, and area rows.", {
    endpoint: route,
    port: resolveUrlPort(route),
    requiredSelectors: [".area-selection-panel", ".workspace-render-canvas", ".area-selection-panel .scene-object-row"],
    timeoutMs: AREAS_WORKSPACE_LIST_WAIT_ATTEMPTS * AREAS_WORKSPACE_LIST_WAIT_INTERVAL_MS,
    lastStatus
  });
}

async function readAreasWorkspaceStatus(send) {
  const status = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const runtime = document.querySelector(".workspace-render-canvas");
      const areaPanel = document.querySelector(".area-selection-panel");
      const areaRows = Array.from(document.querySelectorAll(".area-selection-panel .scene-object-row"));
      const areaPanelText = areaPanel?.textContent?.replace(/\\s+/gu, " ").trim() ?? "";
      const bodyText = document.body?.textContent?.replace(/\\s+/gu, " ").trim() ?? "";
      const root = document.querySelector("#root");
      return {
        href: window.location.href,
        title: document.title,
        routePath: window.location.pathname,
        hasAreaPanel: Boolean(areaPanel),
        hasCanvas: Boolean(runtime),
        hasRoot: Boolean(root),
        rootChildCount: root?.childElementCount ?? null,
        bodyTextSample: bodyText.slice(0, 800),
        storedWorkspaceMode: window.localStorage.getItem("aurora_web.workspace_mode.v1"),
        hasStoredAuth: Boolean(window.localStorage.getItem("aurora_web.auth_session.v1")),
        areaPanelText: areaPanelText.slice(0, 600),
        areaListLoading: /loading|refresh|wczyt|ladow/iu.test(areaPanelText),
        areaRowCount: areaRows.length,
        areaRowsSample: areaRows.slice(0, 8).map((row) => row.textContent?.trim() ?? "")
      };
    })()`
  });
  return status.result.value;
}

async function openArea(send, query, expectedArea) {
  const result = await send("Runtime.evaluate", {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const query = ${JSON.stringify(query.trim().toLowerCase())};
      const expectedArea = ${JSON.stringify(expectedArea)};
      const search = document.querySelector("input[aria-label='Filter areas']");
      // Do not filter the incremental client-side list before the requested
      // Area has arrived from a later page: doing so makes the result set look
      // empty although loading is still in progress.  The exact identity below
      // is the authoritative selector for capture requests that resolved an
      // Area through the API.
      if (search && query && !expectedArea) {
        const valueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        if (valueSetter) {
          valueSetter.call(search, query);
        } else {
          search.value = query;
        }
        search.dispatchEvent(new Event("input", { bubbles: true }));
        search.dispatchEvent(new Event("change", { bubbles: true }));
      }
      await waitForAreaRowsToSettle();
      const rows = Array.from(document.querySelectorAll(".area-selection-panel .scene-object-row"));
      const row = resolveTargetRow(rows, query, expectedArea);
      if (!row) {
        return {
          ok: false,
          reason: "area_row_not_found",
          query,
          expectedArea,
          rowCount: rows.length,
          rowsSample: rows.slice(0, 8).map(describeAreaRow)
        };
      }
      row.click();
      const selectionSettled = await waitForAreaRowSelection(row);
      if (!selectionSettled) {
        return {
          ok: false,
          reason: "area_row_selection_did_not_settle",
          areaText: row.textContent?.trim() ?? "",
          ariaSelected: row.getAttribute("aria-selected"),
          className: row.className
        };
      }
      const runtimeDatasetCleared = clearAreaRuntimeDatasets();
      row.focus();
      const keyboardOpenEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
        ctrlKey: true
      });
      row.dispatchEvent(keyboardOpenEvent);
      await sleep(120);
      const keyboardStartedOpen = isAreaOpenActionInProgress();
      const openButton = await waitForOpenSelectedAreaButton();
      if (!keyboardStartedOpen && (!openButton || openButton.disabled)) {
        return {
          ok: false,
          reason: "open_selected_area_unavailable",
          areaText: row.textContent?.trim() ?? "",
          buttonText: openButton?.textContent?.trim() ?? null,
          buttonDisabled: Boolean(openButton?.disabled),
          keyboardEventDefaultPrevented: keyboardOpenEvent.defaultPrevented
        };
      }
      if (!keyboardStartedOpen) {
        openButton.click();
      }
      const rowInfo = describeAreaRow(row);
      const parsedAreaExpectation = parseAreaExpectationFromRow(row);
      const areaExpectation = expectedArea
        ? {
            areaId: expectedArea.areaId,
            name: expectedArea.name,
            width: Number(expectedArea.width),
            height: Number(expectedArea.height),
            objectCount: Number(expectedArea.objectCounts?.total ?? parsedAreaExpectation.objectCount)
          }
        : parsedAreaExpectation;
      return {
        ok: true,
        areaText: row.textContent?.trim() ?? "",
        rowInfo,
        expectedArea,
        areaExpectation,
        query,
        buttonText: openButton?.textContent?.trim() ?? "",
        openTrigger: keyboardStartedOpen ? "row_ctrl_enter" : "open_selected_area_button",
        keyboardEventDefaultPrevented: keyboardOpenEvent.defaultPrevented,
        runtimeDatasetCleared
      };

      function resolveTargetRow(candidateRows, searchQuery, expected) {
        const normalizedExpectedName = normalizeAreaIdentity(expected?.name ?? "");
        const normalizedExpectedId = normalizeAreaIdentity(expected?.areaId ?? "");
        const normalizedQuery = normalizeAreaIdentity(searchQuery);
        if (normalizedExpectedName || normalizedExpectedId) {
          const exact = candidateRows.find((candidate) => {
            const info = describeAreaRow(candidate);
            return (
              normalizeAreaIdentity(info.title) === normalizedExpectedName ||
              normalizeAreaIdentity(info.title) === normalizedExpectedId
            );
          });
          if (exact) {
            return exact;
          }
        }
        if (searchQuery) {
          const exactQuery = candidateRows.find((candidate) => {
            const info = describeAreaRow(candidate);
            return normalizeAreaIdentity(info.title) === normalizedQuery;
          });
          if (exactQuery) {
            return exactQuery;
          }
          return candidateRows.find((candidate) =>
            normalizeAreaIdentity(candidate.textContent ?? "").includes(normalizedQuery)
          );
        }
        return candidateRows[0];
      }
      function describeAreaRow(row) {
        return {
          areaId: row.dataset.areaId ?? "",
          title: row.dataset.areaName ?? row.querySelector("strong")?.textContent?.trim() ?? "",
          width: numberOrNull(row.dataset.areaWidth),
          height: numberOrNull(row.dataset.areaHeight),
          objectCount: numberOrNull(row.dataset.areaObjectCount),
          placeableCount: numberOrNull(row.dataset.areaPlaceableCount),
          textureAtlasId: row.dataset.areaTextureAtlasId ?? "",
          text: row.textContent?.replace(/\\s+/gu, " ").trim() ?? "",
          ariaSelected: row.getAttribute("aria-selected"),
          className: row.className
        };
      }
      function parseAreaExpectationFromRow(row) {
        const info = describeAreaRow(row);
        const parsed = parseAreaExpectationFromText(row.textContent?.trim() ?? "");
        return {
          areaId: info.areaId || parsed.areaId,
          name: info.title || parsed.name,
          width: info.width ?? parsed.width,
          height: info.height ?? parsed.height,
          objectCount: info.objectCount ?? parsed.objectCount
        };
      }
      function numberOrNull(value) {
        const number = Number(value);
        return Number.isFinite(number) ? number : null;
      }
      function normalizeAreaIdentity(value) {
        return String(value ?? "").trim().toLowerCase().replace(/^area_+/u, "").replace(/[^a-z0-9]+/gu, "");
      }
      function clearAreaRuntimeDatasets() {
        const runtime = document.querySelector(".workspace-render-canvas");
        if (!runtime) {
          return {
            ok: false,
            reason: "runtime_canvas_missing_before_open"
          };
        }
        const dataset = runtime.dataset;
        const workspaceCanvasLayer = document.querySelector(".workspace-canvas-layer");
        [
          "areaTerrainAreaId",
          "areaTerrainTileModelRuntimeStatus",
          "areaTerrainTileModelRuntimeSnapshot",
          "areaTileProcessRuntimeAreaId",
          "areaTileProcessRuntimeStatus",
          "areaTileProcessRuntimeSnapshot",
          "areaObjectSharedRendererSnapshot",
          "areaPrimitiveFallbackRenderSuppressionSnapshot"
        ].forEach((key) => {
          delete dataset[key];
        });
        dataset.areasRuntimeCaptureClearedAt = String(Date.now());
        if (workspaceCanvasLayer?.dataset) {
          workspaceCanvasLayer.dataset.areasRuntimeCaptureClearedAt =
            dataset.areasRuntimeCaptureClearedAt;
        }
        window.__auroraAreasRuntimeCaptureClearedAt = dataset.areasRuntimeCaptureClearedAt;
        try {
          window.sessionStorage.setItem(
            "aurora_areas_runtime_capture_cleared_at",
            dataset.areasRuntimeCaptureClearedAt
          );
        } catch {
          // Session storage is best-effort capture evidence.
        }
        return {
          ok: true,
          clearedAt: dataset.areasRuntimeCaptureClearedAt
        };
      }
      function parseAreaExpectationFromText(text) {
        const sizeMatch = text.match(/\\|\\s*(\\d+)x(\\d+)\\s*\\|\\s*(\\d+)\\s+objects/i);
        return {
          areaId: null,
          name: null,
          width: sizeMatch ? Number(sizeMatch[1]) : null,
          height: sizeMatch ? Number(sizeMatch[2]) : null,
          objectCount: sizeMatch ? Number(sizeMatch[3]) : null
        };
      }
      async function waitForAreaRowsToSettle() {
        // The selector incrementally aggregates paginated Area responses.  A
        // filtered row can therefore be absent briefly even after the panel
        // itself has rendered its first page.  Wait for the requested identity
        // instead of treating that normal intermediate state as a missing Area.
        for (let attempt = 0; attempt < 300; attempt += 1) {
          const rows = Array.from(document.querySelectorAll(".area-selection-panel .scene-object-row"));
          if (!query || resolveTargetRow(rows, query, expectedArea)) {
            return true;
          }
          await sleep(100);
        }
        return false;
      }
      async function waitForAreaRowSelection(targetRow) {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          if (
            targetRow.getAttribute("aria-selected") === "true" ||
            targetRow.classList.contains("is-selected")
          ) {
            return true;
          }
          await sleep(50);
        }
        return false;
      }
      async function waitForOpenSelectedAreaButton() {
        for (let attempt = 0; attempt < 20; attempt += 1) {
          const button = Array.from(document.querySelectorAll("button"))
            .find((candidate) =>
              candidate.getAttribute("aria-label") === "Open Selected Area" ||
              candidate.textContent?.includes("Open Selected Area")
            );
          if (button && !button.disabled) {
            return button;
          }
          await sleep(50);
        }
        return Array.from(document.querySelectorAll("button"))
          .find((candidate) =>
            candidate.getAttribute("aria-label") === "Open Selected Area" ||
            candidate.textContent?.includes("Open Selected Area")
          ) ?? null;
      }
      function isAreaOpenActionInProgress() {
        const quickOpenButton = Array.from(document.querySelectorAll("button"))
          .find((candidate) => candidate.getAttribute("aria-label") === "Open Selected Area");
        const panelText = document
          .querySelector(".area-selection-panel")
          ?.textContent
          ?.replace(/\\s+/gu, " ")
          .trim() ?? "";
        return (
          /opening/i.test(quickOpenButton?.textContent ?? "") ||
          /opening\\s+/i.test(panelText)
        );
      }
      function sleep(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
      }
    })()`
  });
  const openedArea = result.result.value;
  if (!openedArea?.ok) {
    throw createBlockerError(
      `areas_open_${openedArea?.reason ?? "failed"}`,
      `Could not open target Area ${query}.`,
      {
        endpoint: route,
        port: resolveUrlPort(route),
        query,
        expectedArea,
        openedArea
      }
    );
  }
  return openedArea;
}

async function waitForAreaRuntimeSnapshot(
  send,
  openedArea,
  expectedArea,
  {
    progressFramePath,
    route,
    captureStartedAt,
    captureVisibility = "all",
    allowPartialEvidence = false,
    runtimeSnapshotWaitDeadlineMs = DEFAULT_AREA_RUNTIME_SNAPSHOT_WAIT_DEADLINE_MS,
    requiredTileProcessSceneKey = null,
    requireStrictTerrainSettlement = false
  } = {}
) {
  let lastStatus = null;
  const startedAt = Date.now();
  const normalizedRuntimeSnapshotWaitDeadlineMs = Math.max(
    AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS,
    Number(runtimeSnapshotWaitDeadlineMs) || DEFAULT_AREA_RUNTIME_SNAPSHOT_WAIT_DEADLINE_MS
  );
  const maxAttempts = Math.max(
    AREA_RUNTIME_SNAPSHOT_WAIT_ATTEMPTS,
    Math.ceil(
      normalizedRuntimeSnapshotWaitDeadlineMs / AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS
    )
  );
  const deadlineAt = startedAt + normalizedRuntimeSnapshotWaitDeadlineMs;
  let routeLostAttemptCount = 0;
  for (
    let attempt = 0;
    attempt < maxAttempts && Date.now() < deadlineAt;
    attempt += 1
  ) {
    const status = await readAreaRuntimeStatus(send, openedArea.areaText);
    if (status?.routePath !== "/app") {
      routeLostAttemptCount += 1;
      if (routeLostAttemptCount >= AREA_RUNTIME_ROUTE_LOST_GRACE_ATTEMPTS) {
        throw createBlockerError(
          "frontend_auth_lost_during_area_capture",
          "Areas capture left the app route while waiting for the opened Area runtime snapshot.",
          {
            endpoint: route,
            port: resolveUrlPort(route),
            expectedArea,
            openedArea,
            timeoutMs: routeLostAttemptCount * AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS,
            routeLostAttemptCount,
            lastStatus: status
          }
        );
      }
    } else {
      routeLostAttemptCount = 0;
    }
    const runtimeFreshness = buildRuntimeFreshnessCheck(status, openedArea, expectedArea);
    lastStatus = {
      ...status,
      areaExpectation: openedArea.areaExpectation ?? null,
      runtimeFreshness,
      captureWaitElapsedMs: Date.now() - startedAt
    };
    if (progressFramePath && (attempt === 0 || attempt % 4 === 0)) {
      writeAreaRuntimeCaptureProgressFrame(progressFramePath, {
        attempt,
        route,
        openedArea,
        expectedArea,
        captureStartedAt,
        waitStartedAt: startedAt,
        status: lastStatus
      });
    }
    const terminalTileModelBlocker = requireStrictTerrainSettlement
      ? classifyTerminalTileModelBlocker(lastStatus)
      : null;
    if (terminalTileModelBlocker) {
      throw createBlockerError(
        terminalTileModelBlocker.code,
        terminalTileModelBlocker.message,
        {
          endpoint: route,
          port: resolveUrlPort(route),
          expectedArea,
          openedArea,
          lastStatus,
          ...terminalTileModelBlocker.details
        }
      );
    }
    if (
      isExpectedAreaRuntimeSnapshot(lastStatus, openedArea, expectedArea, {
        captureVisibility
      }) &&
      (!requiredTileProcessSceneKey ||
        (lastStatus.tileProcessSceneContract?.currentSceneKey === requiredTileProcessSceneKey &&
          lastStatus.tileProcessSceneContract?.readinessSceneKey === requiredTileProcessSceneKey &&
          lastStatus.tileProcessSceneContract?.requestPhase === "ready")) &&
      (!requireStrictTerrainSettlement ||
        hasStrictTerrainTileModelSettlement(lastStatus))
    ) {
      if (progressFramePath) {
        writeAreaRuntimeCaptureProgressFrame(progressFramePath, {
          attempt,
          route,
          openedArea,
          expectedArea,
          captureStartedAt,
          waitStartedAt: startedAt,
          status: lastStatus,
          settled: true
        });
      }
      return lastStatus;
    }
    await sleep(AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS);
  }
  throw createBlockerError(
    "areas_runtime_snapshot_stale_or_missing",
    "Expected Area runtime snapshot did not settle for opened Area.",
    {
      endpoint: route,
      port: resolveUrlPort(route),
      expectedArea,
      openedArea,
      timeoutMs: maxAttempts * AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS,
      wallClockTimeoutMs: normalizedRuntimeSnapshotWaitDeadlineMs,
      lastStatus
    }
  );
}

async function waitForTileProcessCurrentSceneKeyChange(
  send,
  openedAreaText,
  previousSceneKey,
  timeoutMs
) {
  const startedAt = Date.now();
  let lastStatus = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastStatus = await readAreaRuntimeStatus(send, openedAreaText);
    const sceneKey = lastStatus?.tileProcessSceneContract?.currentSceneKey ?? null;
    if (sceneKey && sceneKey !== "none" && sceneKey !== previousSceneKey) {
      return { sceneKey, status: lastStatus };
    }
    await sleep(AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS);
  }
  throw createBlockerError(
    "area_editing_commit_scene_key_not_changed",
    "Pointer commit did not publish a new current-scene tile process key before timeout.",
    { previousSceneKey, timeoutMs, lastStatus }
  );
}

async function waitForAreaTileMutationRuntimeSettlement(
  send,
  openedAreaText,
  {
    timeoutMs = 120_000,
    expectedCameraMode = "top_down_oracle"
  } = {}
) {
  const startedAt = Date.now();
  let lastStatus = null;
  let lastSettlement = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastStatus = await readAreaRuntimeStatus(send, openedAreaText);
    lastSettlement = evaluateAreaTileMutationRenderSettlement({
      trace: lastStatus?.areaTileMutationTrace ?? null,
      contractSettlement:
        lastStatus?.areaTileMutationContractSettlement ?? null,
      terrainSnapshot: lastStatus?.terrainTileModelSnapshot ?? null,
      cameraFrame: lastStatus?.cameraFrame ?? null,
      expectedCameraMode
    });
    if (lastSettlement.status === "ready") {
      return {
        status: lastStatus,
        settlement: lastSettlement,
        elapsedMs: Date.now() - startedAt
      };
    }
    await sleep(AREA_RUNTIME_SNAPSHOT_WAIT_INTERVAL_MS);
  }
  throw createBlockerError(
    "area_tile_mutation_runtime_settlement_timeout",
    "The exact tile mutation did not reach a matching terrain build, camera frame, and presented frame before timeout.",
    {
      openedAreaText,
      expectedCameraMode,
      timeoutMs,
      areaTileMutationRuntimeSettlement: lastSettlement,
      areaTileMutationTrace: lastStatus?.areaTileMutationTrace ?? null,
      areaTileMutationContractSettlement:
        lastStatus?.areaTileMutationContractSettlement ?? null,
      terrainSnapshot: lastStatus?.terrainTileModelSnapshot ?? null,
      cameraFrame: lastStatus?.cameraFrame ?? null,
      presentedFrame: lastStatus?.presentedFrame ?? null
    }
  );
}

function assertRequestedCaptureCamera(status, captureView, context = {}) {
  if (captureView !== "top-down") {
    return;
  }
  const cameraFrame = status?.cameraFrame ?? null;
  const terrainSnapshot = status?.terrainTileModelSnapshot ?? null;
  const failedReasons = [];
  if (cameraFrame?.mode !== "top_down_oracle") {
    failedReasons.push("camera_mode_not_top_down_oracle");
  }
  if (cameraFrame?.coverageStatus !== "pass") {
    failedReasons.push("camera_coverage_not_pass");
  }
  if (Number(cameraFrame?.clippedCornerCount) !== 0) {
    failedReasons.push("camera_clipped_corner_count_nonzero");
  }
  if (
    !terrainSnapshot?.terrainBuildId ||
    cameraFrame?.terrainBuildId !== terrainSnapshot.terrainBuildId
  ) {
    failedReasons.push("camera_terrain_build_id_mismatch");
  }
  if (
    !terrainSnapshot?.tileStateDigest ||
    cameraFrame?.tileStateDigest !== terrainSnapshot.tileStateDigest
  ) {
    failedReasons.push("camera_tile_state_digest_mismatch");
  }
  if (failedReasons.length === 0) {
    return;
  }
  throw createBlockerError(
    "areas_capture_camera_not_canonical",
    "Areas capture reached final proof state without a canonical top-down camera bound to the settled terrain generation.",
    {
      ...context,
      requestedView: captureView,
      cameraFrame,
      terrainSnapshot,
      failedReasons
    }
  );
}

function assertRuntimeStatusIsVisualProofReady(
  status,
  openedArea,
  expectedArea,
  {
    route,
    requireScreenshot = false,
    captureVisibility = "all",
    allowIntentionalHiddenGround = false
  } = {}
) {
  if (!requireScreenshot) {
    return;
  }

  if (captureVisibility === "terrain-only") {
    const terrainSnapshot = status?.terrainTileModelSnapshot ?? null;
    const tileProcessSnapshot = status?.tileProcessRuntimeSnapshot ?? null;
    const tileCount = Number(terrainSnapshot?.tileCount ?? 0);
    const contractTileCount = Number(terrainSnapshot?.contractTileCount ?? 0);
    const loadedTileCount = Number(terrainSnapshot?.loadedTileCount ?? 0);
    const failedTileCount = Number(terrainSnapshot?.failedTileCount ?? 0);
    const bridgeTileCount = Number(terrainSnapshot?.bridgeTileCount ?? 0);
    const visibleMeshCount = Number(terrainSnapshot?.visibleMeshCount ?? 0);
    const intentionalHiddenGroundEvidence =
      classifyIntentionalInvisibleGroundSurface(status);
    const intentionalHiddenGround =
      allowIntentionalHiddenGround &&
      intentionalHiddenGroundEvidence.intentionalInvisibleGroundSurface;
    const failedReasons = [];
    if (status?.runtimeFreshness?.ok !== true) {
      failedReasons.push("runtime_freshness_not_expected_area");
    }
    if (terrainSnapshot?.version !== "aurora-areas-terrain-tile-model-runtime/v1") {
      failedReasons.push("terrain_tile_model_snapshot_missing");
    }
    if (tileProcessSnapshot?.status !== "ready") {
      failedReasons.push("tile_process_contract_not_ready");
    }
    if (tileCount < 1) {
      failedReasons.push("terrain_tile_count_zero");
    }
    if (contractTileCount !== tileCount) {
      failedReasons.push("terrain_contract_tile_count_mismatch");
    }
    if (loadedTileCount !== tileCount) {
      failedReasons.push("terrain_loaded_tile_count_mismatch");
    }
    if (failedTileCount !== 0) {
      failedReasons.push("terrain_tile_model_load_failed");
    }
    if (bridgeTileCount !== 0) {
      failedReasons.push("terrain_bridge_tile_count_nonzero");
    }
    if (visibleMeshCount < 1 && !intentionalHiddenGround) {
      failedReasons.push("terrain_visible_mesh_count_zero");
    }
    if (failedReasons.length === 0) {
      return;
    }
    throw createBlockerError(
      "areas_runtime_terrain_visual_proof_not_ready",
      "Terrain-only capture reached screenshot time before real tile models were fully visible.",
      {
        endpoint: route,
        port: resolveUrlPort(route),
        expectedArea,
        openedArea,
        failedReasons,
        runtimeFreshness: status?.runtimeFreshness ?? null,
        tileProcessStatus: tileProcessSnapshot?.status ?? null,
        terrainTileModels: {
          tileCount,
          contractTileCount,
          loadedTileCount,
          failedTileCount,
          bridgeTileCount,
          visibleMeshCount,
          intentionalHiddenGround,
          intentionalHiddenGroundEvidence
        },
        routePath: status?.routePath ?? null,
        href: status?.href ?? null
      }
    );
  }

  const snapshot = status?.areaObjectSharedRendererSnapshot ?? null;
  const total = Number(snapshot?.total ?? 0);
  const payloadBoundCount = Number(snapshot?.payloadBoundCount ?? 0);
  const modelReadyCount = Number(snapshot?.modelReadyCount ?? 0);
  const primitiveFallbackCount = Number(snapshot?.primitiveFallbackCount ?? 0);
  const visibleLoadBlockers = (status?.visualBlockers ?? [])
    .filter((entry) => String(entry?.selector ?? "").includes("load-overlay"))
    .map((entry) => entry?.text ?? entry?.selector ?? "load-overlay");
  const failedReasons = [];

  if (status?.runtimeFreshness?.ok !== true) {
    failedReasons.push("runtime_freshness_not_expected_area");
  }
  if (snapshot?.version !== "aurora-areas-shared-renderer-runtime/v1") {
    failedReasons.push("shared_renderer_snapshot_missing");
  }
  if (total < 1) {
    failedReasons.push("shared_renderer_total_zero");
  }
  if (payloadBoundCount < total) {
    failedReasons.push("payloads_not_fully_bound");
  }
  if (modelReadyCount < 1) {
    failedReasons.push("no_models_ready");
  }
  if (!hasExpectedPlaceableModelLoadSettlement(status)) {
    failedReasons.push("models_or_textures_not_fully_settled");
  }
  if (Number(snapshot?.placeholderReasonCounts?.["model-load-failed"] ?? 0) > 0) {
    failedReasons.push("model_load_failed");
  }
  if (primitiveFallbackCount > 0) {
    failedReasons.push("primitive_fallbacks_present");
  }
  if (visibleLoadBlockers.length > 0) {
    failedReasons.push("visible_load_overlay_present");
  }

  if (failedReasons.length === 0) {
    return;
  }

  throw createBlockerError(
    "areas_runtime_visual_proof_not_ready",
    "Areas runtime capture reached screenshot time before the opened Area was ready for visual proof.",
    {
      endpoint: route,
      port: resolveUrlPort(route),
      expectedArea,
      openedArea,
      failedReasons,
      runtimeFreshness: status?.runtimeFreshness ?? null,
      sharedRenderer: {
        version: snapshot?.version ?? null,
        status: snapshot?.status ?? null,
        total,
        payloadBoundCount,
        modelReadyCount,
        primitiveFallbackCount
      },
      visibleLoadBlockers,
      routePath: status?.routePath ?? null,
      href: status?.href ?? null
    }
  );
}

function writeAreaRuntimeCaptureProgressFrame(
  progressFramePath,
  {
    attempt,
    route,
    openedArea,
    expectedArea,
    captureStartedAt,
    waitStartedAt,
    status,
    settled = false
  }
) {
  try {
    const frame = {
      version: "aurora-areas-runtime-cdp-progress/v1",
      capturedAt: new Date().toISOString(),
      status: settled ? "settled" : "waiting",
      attempt,
      requestedRoute: route,
      target: {
        captureTarget,
        areaQuery,
        expectedArea,
        openedAreaMatchesExpected: status?.runtimeFreshness?.ok === true
      },
      openedArea,
      timings: {
        totalElapsedMs: captureStartedAt ? Date.now() - captureStartedAt : null,
        captureWaitElapsedMs: waitStartedAt ? Date.now() - waitStartedAt : null
      },
      domStatus: status,
      terrainTileModelSnapshot: status?.terrainTileModelSnapshot ?? null,
      tileProcessRuntimeSnapshot: status?.tileProcessRuntimeSnapshot ?? null,
      areaObjectSharedRendererSnapshot: status?.areaObjectSharedRendererSnapshot ?? null,
      placeableModelLoadQueueDataset: status?.placeableModelLoadQueueDataset ?? null,
      placeableTextureLoadQueueDataset: status?.placeableTextureLoadQueueDataset ?? null,
      areaObjectRuntimeDataset: status?.areaObjectRuntimeDataset ?? null
    };
    fs.writeFileSync(progressFramePath, `${JSON.stringify(frame, null, 2)}\n`);
  } catch {
    // Progress frames are best-effort evidence; capture itself should keep running.
  }
}

function isExpectedAreaRuntimeSnapshot(status, openedArea, expectedArea, options = {}) {
  if (!status?.runtimeFreshness?.ok) {
    return false;
  }
  const terrainSnapshot = status?.terrainTileModelSnapshot;
  if (terrainSnapshot?.version !== "aurora-areas-terrain-tile-model-runtime/v1") {
    return false;
  }
  const expectation = openedArea.areaExpectation ?? {};
  if (Number.isFinite(expectation.width) && Number.isFinite(expectation.height)) {
    const expectedExtent = `${expectation.width}x${expectation.height}`;
    if (status.terrainTileModelDataset?.extentFootprintSize !== expectedExtent) {
      return false;
    }
    const minimumTileCount = expectation.width * expectation.height;
    if (terrainSnapshot.tileCount < minimumTileCount) {
      return false;
    }
  }
  const tileProcessSnapshot = status?.tileProcessRuntimeSnapshot;
  if (tileProcessSnapshot?.version !== "aurora-areas-tile-process-runtime/v1") {
    return false;
  }
  if (tileProcessSnapshot.status === "not_checked") {
    return false;
  }
  const terrainSettled = hasExpectedTileModelLoaderSettlement(terrainSnapshot);
  if (!terrainSettled) {
    return false;
  }
  if (options.captureVisibility === "terrain-only") {
    return true;
  }
  return (
    hasExpectedPlaceablePayloadSettlement(status, openedArea, expectedArea) &&
    hasExpectedPlaceableModelLoadSettlement(status)
  );
}

function hasExpectedTileModelLoaderSettlement(terrainSnapshot) {
  if (!terrainSnapshot || Number(terrainSnapshot.contractTileCount ?? 0) < 1) {
    return true;
  }
  const tileCount = Number(terrainSnapshot.tileCount ?? 0);
  const loadedTileCount = Number(terrainSnapshot.loadedTileCount ?? 0);
  const failedTileCount = Number(terrainSnapshot.failedTileCount ?? 0);
  const materialTextureContractTileCount = Number(
    terrainSnapshot.materialTextureContractTileCount ?? 0
  );
  const materialTextureAppliedTileCount = Number(
    terrainSnapshot.materialTextureAppliedTileCount ?? 0
  );
  const materialTextureFailedTileCount = Number(
    terrainSnapshot.materialTextureFailedTileCount ?? 0
  );
  if (
    materialTextureContractTileCount > 0 &&
    materialTextureAppliedTileCount < materialTextureContractTileCount &&
    materialTextureFailedTileCount === 0
  ) {
    return false;
  }
  if (tileCount > 0 && loadedTileCount === tileCount) {
    return true;
  }
  if (failedTileCount > 0) {
    return true;
  }
  return terrainSnapshot.status === "blocked" && terrainSnapshot.blockerSummary !== "none";
}

function classifyIntentionalInvisibleGroundSurface(status) {
  const snapshot = status?.terrainTileModelSnapshot ?? null;
  const tileProcess = status?.tileProcessRuntimeSnapshot ?? null;
  const tileCount = Number(snapshot?.tileCount ?? 0);
  const hiddenMeshSample = String(snapshot?.hiddenMeshSample ?? "");
  const hiddenEntries = hiddenMeshSample === "none"
    ? []
    : hiddenMeshSample.split("|").filter(Boolean);
  const groundSurfaceNodePattern = /^(?:ground|terrain|floor|pavimento)\d*(?:__\d+)?$/u;
  const exclusivelyGroundSurfaceNodes =
    hiddenEntries.length >= tileCount &&
    hiddenEntries.every((entry) => {
      const node = /(?:^|,)node=([^,|]+)/u.exec(entry)?.[1]?.trim().toLowerCase() ?? "";
      const source = /(?:^|,)source=([^,|]+)/u.exec(entry)?.[1]?.trim().toLowerCase() ?? "";
      return groundSurfaceNodePattern.test(node) && groundSurfaceNodePattern.test(source);
    });
  const tileTransformEntries = String(snapshot?.tileTransformSample ?? "")
    .split("|")
    .filter(Boolean);
  const shadowReceiverEntries = String(snapshot?.shadowReceiverSample ?? "")
    .split("|")
    .filter(Boolean);
  const exactSic11InvisibleNeroSurface =
    snapshot?.tilesetResRef === "sic11" &&
    snapshot?.renderStatus === "source_backed_tile_model_bridge" &&
    tileTransformEntries.length === tileCount &&
    tileTransformEntries.every((entry) => /(?:^|,)model=sic11_a00_00(?:,|$)/u.test(entry)) &&
    Number(snapshot?.materialCount ?? -1) === tileCount &&
    Number(snapshot?.shadowReceiverMeshCount ?? -1) === tileCount &&
    shadowReceiverEntries.length === tileCount &&
    shadowReceiverEntries.every((entry) => /:nero_01:receiveShadow=1$/u.test(entry));
  const imageMap = status?.terrainImageMap2DDataset ?? {};
  const surface = status?.terrainSurfaceRuntimeDataset ?? {};
  const imageMapReadyVisible =
    imageMap.status === "ready" &&
    Number(imageMap.contractCount ?? 0) > 0 &&
    Number(imageMap.loadedCount ?? 0) === Number(imageMap.contractCount ?? 0) &&
    Number(imageMap.failedCount ?? 0) === 0;
  const sourceBackedFootprintReadyVisible =
    imageMap.status === "disabled_source_backed_glb_first" &&
    surface.sourceBridge === "true" &&
    surface.extentFootprintStatus ===
      "scene-dimensions-footprint-backed-by-area-contract" &&
    Boolean(surface.extentFootprintSize) &&
    Boolean(surface.extentFootprintLayer);
  const terrainSurfaceRuntimeReadyVisible =
    status?.terrainRuntimeStatus === "ready" &&
    (imageMapReadyVisible || sourceBackedFootprintReadyVisible);
  const materialContractCount = Number(snapshot?.materialTextureContractTileCount ?? 0);
  const materialAppliedCount = Number(snapshot?.materialTextureAppliedTileCount ?? 0);
  const materialFailedCount = Number(snapshot?.materialTextureFailedTileCount ?? -1);
  const materialPendingCount = Number(snapshot?.materialTexturePendingTileCount ?? -1);
  const tileProcessReady =
    tileProcess?.status === "ready" &&
    Number(tileProcess?.readyCandidateCount ?? 0) ===
      Number(tileProcess?.checkedCandidateCount ?? -1) &&
    Number(tileProcess?.blockedCandidateCount ?? -1) === 0;
  const intentionalInvisibleGroundSurface =
    snapshot?.status === "ready" &&
    tileCount > 0 &&
    Number(snapshot?.contractTileCount ?? 0) === tileCount &&
    Number(snapshot?.loadedTileCount ?? 0) === tileCount &&
    Number(snapshot?.failedTileCount ?? -1) === 0 &&
    Number(snapshot?.bridgeTileCount ?? -1) === 0 &&
    Number(snapshot?.visibleMeshCount ?? -1) === 0 &&
    materialContractCount === tileCount &&
    materialAppliedCount === tileCount &&
    materialFailedCount === 0 &&
    materialPendingCount === 0 &&
    tileProcessReady &&
    (exclusivelyGroundSurfaceNodes || exactSic11InvisibleNeroSurface) &&
    terrainSurfaceRuntimeReadyVisible;
  return {
    intentionalInvisibleGroundSurface,
    exclusivelyGroundSurfaceNodes,
    exactSic11InvisibleNeroSurface,
    intentionalInvisibleModelResRef: exactSic11InvisibleNeroSurface
      ? "sic11_a00_00"
      : null,
    intentionalInvisibleNodeName: exactSic11InvisibleNeroSurface ? "nero_01" : null,
    hiddenMeshEntryCount: hiddenEntries.length,
    terrainSurfaceRuntimeReadyVisible,
    imageMapReadyVisible,
    sourceBackedFootprintReadyVisible,
    tileProcessReady,
    materialContractCount,
    materialAppliedCount,
    materialFailedCount,
    materialPendingCount,
    imageMapStatus: imageMap.status ?? null,
    terrainSurfaceRuntimeDataset: surface
  };
}

function hasStrictTerrainTileModelSettlement(status) {
  const terrainSnapshot = status?.terrainTileModelSnapshot ?? null;
  const tileCount = Number(terrainSnapshot?.tileCount ?? 0);
  const intentionalHiddenGround =
    classifyIntentionalInvisibleGroundSurface(status).intentionalInvisibleGroundSurface;
  return (
    terrainSnapshot?.status === "ready" &&
    tileCount > 0 &&
    Number(terrainSnapshot?.contractTileCount ?? 0) === tileCount &&
    Number(terrainSnapshot?.loadedTileCount ?? 0) === tileCount &&
    Number(terrainSnapshot?.failedTileCount ?? 0) === 0 &&
    Number(terrainSnapshot?.bridgeTileCount ?? 0) === 0 &&
    (Number(terrainSnapshot?.visibleMeshCount ?? 0) > 0 || intentionalHiddenGround)
  );
}

/**
 * A strict proof should wait for a conversion that is still in progress, but
 * it must not turn a final backend refusal into a generic timeout.  In
 * particular, a custom SET can reference a model supplied by a separate HAK;
 * Aurora Web already exposes that as TILE_NOT_FOUND.  Preserve that diagnosis
 * and the exact model list for the audit instead of waiting out the deadline.
 */
function classifyTerminalTileModelBlocker(status) {
  const terrain = status?.terrainTileModelSnapshot ?? {};
  const tileProcess = status?.tileProcessRuntimeSnapshot ?? {};
  const tileCount = Number(terrain.tileCount ?? 0);
  const checkedCount = Number(tileProcess.checkedCandidateCount ?? 0);
  const blockedCount = Number(tileProcess.blockedCandidateCount ?? 0);
  const pendingCount = Number(terrain.pendingTileCount ?? 0);
  const terminal =
    tileCount > 0 &&
    tileProcess.status === "blocked" &&
    checkedCount >= tileCount &&
    blockedCount > 0 &&
    pendingCount === 0;
  if (!terminal) return null;

  const blockerSummary = String(tileProcess.blockerSummary ?? "");
  const blockedModels = String(terrain.blockedTileSample ?? "none")
    .split("|")
    .map((value) => value.trim())
    .filter(Boolean);
  const tileNotFound = blockerSummary.includes("TILE_NOT_FOUND");
  return {
    code: tileNotFound ? "tile_model_source_missing" : "tile_model_processing_blocked",
    message: tileNotFound
      ? "Tile model source is missing from the currently configured Aurora module/HAK sources."
      : "Tile processing reached a terminal blocked state.",
    details: {
      tileCount,
      checkedCount,
      blockedCount,
      pendingCount,
      blockedModels,
      tileProcessBlockerSummary: blockerSummary,
      terrainBlockerSummary: terrain.blockerSummary ?? null
    }
  };
}

function hasExpectedPlaceablePayloadSettlement(status, openedArea, expectedArea) {
  const expectedObjectCount =
    Number(expectedArea?.objectCounts?.placeables ?? Number.NaN) ||
    Number(openedArea?.areaExpectation?.objectCount ?? Number.NaN);
  if (!Number.isFinite(expectedObjectCount) || expectedObjectCount < 1) {
    return true;
  }

  const snapshot = status?.areaObjectSharedRendererSnapshot;
  if (snapshot?.version !== "aurora-areas-shared-renderer-runtime/v1") {
    return false;
  }

  const total = Number(snapshot.total ?? 0);
  const payloadBoundCount = Number(snapshot.payloadBoundCount ?? 0);
  const missingPayloadCount = Number(snapshot.placeholderReasonCounts?.["missing-payload"] ?? 0);
  const stillLoadingCount = Number(snapshot.placeholderReasonCounts?.["still-loading"] ?? 0);

  return (
    total >= expectedObjectCount &&
    payloadBoundCount >= total &&
    missingPayloadCount === 0 &&
    stillLoadingCount === 0
  );
}

function hasExpectedPlaceableModelLoadSettlement(status) {
  const snapshot = status?.areaObjectSharedRendererSnapshot ?? {};
  const areaObjectDataset = status?.areaObjectRuntimeDataset ?? {};
  const queueDataset = status?.placeableModelLoadQueueDataset ?? {};
  const hasVisiblePlaceableLoadOverlay = (status?.visualBlockers ?? []).some(
    (entry) => entry?.selector === ".canvas-placeable-load-overlay"
  );
  if (hasVisiblePlaceableLoadOverlay) {
    return false;
  }
  const activeCount = countOrZero(queueDataset.activeCount);
  const pendingCount = countOrZero(queueDataset.pendingCount);
  const completedCount = countOrZero(queueDataset.completedCount);
  const totalCount = countOrZero(queueDataset.totalCount);
  if (activeCount + pendingCount > 0) {
    return false;
  }
  if (totalCount > 0 && completedCount < totalCount) {
    return false;
  }

  const expectedModelUrlCount = countOrZero(
    areaObjectDataset.backendRenderModelUrlReadyCount
  );
  if (expectedModelUrlCount < 1) {
    return true;
  }
  const texturePendingCount = firstNonEmptyIdList(
    snapshot.texturePendingIds,
    areaObjectDataset.sharedRendererTexturePendingIds
  ).length;
  if (texturePendingCount > 0) {
    return false;
  }
  const textureStatusCounts = snapshot.textureStatusCounts ?? {};
  const nonSettledTextureCount = ["loading", "partial", "unknown", "missing", "fallback"]
    .map((status) => countOrZero(textureStatusCounts[status]))
    .reduce((sum, count) => sum + count, 0);
  if (nonSettledTextureCount > 0) {
    return false;
  }
  const modelReadyCount = countOrZero(
    snapshot.modelReadyCount ?? areaObjectDataset.sharedRendererModelReadyCount
  );
  const modelBoundsSampleCount = Array.isArray(snapshot.modelBoundsSample)
    ? snapshot.modelBoundsSample.length
    : countOrZero(areaObjectDataset.sharedRendererModelBoundsSampleCount);
  if (modelReadyCount > 0 && modelBoundsSampleCount < 1) {
    return false;
  }
  const modelLoadFailedCount = countOrZero(
    snapshot.placeholderReasonCounts?.["model-load-failed"]
  );
  return modelLoadFailedCount === 0 && modelReadyCount >= expectedModelUrlCount;
}

function countOrZero(value) {
  return Math.max(0, numberOrNull(value) ?? 0);
}

function buildRuntimeFreshnessCheck(status, openedArea, expectedArea) {
  const expectedAreaId = expectedArea?.areaId ?? openedArea?.areaExpectation?.areaId ?? null;
  const checks = [
    {
      id: "runtime_dataset_was_cleared_before_open",
      expected: "present",
      actual: status?.areasRuntimeCaptureClearedAt ?? null,
      ok: Boolean(status?.areasRuntimeCaptureClearedAt)
    },
    {
      id: "terrain_dataset_area_id",
      expected: expectedAreaId,
      actual: status?.terrainTileModelDataset?.areaId ?? status?.areaTerrainAreaId ?? null,
      ok: !expectedAreaId || status?.terrainTileModelDataset?.areaId === expectedAreaId
    },
    {
      id: "terrain_snapshot_area_id",
      expected: expectedAreaId,
      actual: status?.terrainTileModelSnapshot?.areaId ?? null,
      ok: !expectedAreaId || status?.terrainTileModelSnapshot?.areaId === expectedAreaId
    },
    {
      id: "tile_process_dataset_area_id",
      expected: expectedAreaId,
      actual: status?.tileProcessRuntimeDataset?.areaId ?? null,
      ok: !expectedAreaId || status?.tileProcessRuntimeDataset?.areaId === expectedAreaId
    },
    {
      id: "tile_process_snapshot_area_id",
      expected: expectedAreaId,
      actual: status?.tileProcessRuntimeSnapshot?.areaId ?? null,
      ok: !expectedAreaId || status?.tileProcessRuntimeSnapshot?.areaId === expectedAreaId
    }
  ];
  const failed = checks.filter((check) => !check.ok);
  return {
    ok: failed.length === 0,
    expectedAreaId,
    checks,
    failed
  };
}

function buildRuntimeBlockerSnapshot(status, canvasVisualEvidence = null) {
  const blockers = [];
  const terrainOnlyCapture = isTerrainOnlyRuntimeCaptureStatus(status);
  // The Inspector's "No objects" empty state describes placeables/GIT, not
  // terrain.  A terrain-only capture deliberately hides that object layer, so
  // treating the empty state as its first visual failure masks a valid tile
  // rendering proof.
  const firstRelevantVisualBlocker = status.visualBlockers?.find(
    (entry) => !(terrainOnlyCapture && entry?.selector === ".scene-objects-empty")
  );
  addBlocker(blockers, "visual", "first_visible_blocker", firstRelevantVisualBlocker?.text, {
    element: firstRelevantVisualBlocker ?? null
  });
  addBlocker(
    blockers,
    "visual_canvas",
    canvasVisualEvidence?.classification,
    summarizeCanvasVisualBlocker(canvasVisualEvidence),
    {
      canvasVisualEvidence
    }
  );
  addBlocker(
    blockers,
    "terrain_tile_model_loader",
    status.terrainTileModelSnapshot?.status ?? status.terrainRuntimeStatus,
    status.terrainTileModelSnapshot?.blockerSummary,
    {
      areaId: status.terrainTileModelSnapshot?.areaId ?? status.terrainTileModelDataset?.areaId,
      failedTileSample:
        status.terrainTileModelSnapshot?.failedTileSample ??
        status.terrainTileModelDataset?.failedTileSample,
      loaderErrorSample:
        status.terrainTileModelSnapshot?.loaderErrorSample ??
        status.terrainTileModelDataset?.loaderErrorSample,
      blockedTileSample:
        status.terrainTileModelSnapshot?.blockedTileSample ??
        status.terrainTileModelDataset?.blockedTileSample,
      materialTextureFailedTileSample:
        status.terrainTileModelSnapshot?.materialTextureFailedTileSample ??
        status.terrainTileModelDataset?.materialTextureFailedTileSample
    }
  );
  addBlocker(
    blockers,
    "tile_process_contract",
    status.tileProcessRuntimeSnapshot?.status ?? status.tileProcessRuntimeStatus,
    status.tileProcessRuntimeSnapshot?.blockerSummary ??
      status.tileProcessRuntimeDataset?.blockers,
    {
      areaId:
        status.tileProcessRuntimeSnapshot?.areaId ?? status.tileProcessRuntimeDataset?.areaId,
      textureMaterialBlockers:
        status.tileProcessRuntimeSnapshot?.textureMaterialBlockerSummary ??
        status.tileProcessRuntimeDataset?.textureMaterialBlockers,
      renderAssetContractBlockers:
        status.tileProcessRuntimeSnapshot?.renderAssetContractBlockerSummary ??
        status.tileProcessRuntimeDataset?.renderAssetContractBlockers,
      mdlGlbMaterialBlockers:
        status.tileProcessRuntimeSnapshot?.mdlGlbMaterialBlockerSummary ??
        status.tileProcessRuntimeDataset?.mdlGlbMaterialBlockers
    }
  );
  if (!terrainOnlyCapture) {
    addBlocker(
      blockers,
      "shared_placeables_renderer",
      status.areaObjectSharedRendererSnapshot?.status ??
        status.areaObjectRuntimeDataset?.sharedRendererStatus,
      summarizeSharedRendererBlocker(status),
      {
        snapshot: status.areaObjectSharedRendererSnapshot,
        dataset: status.areaObjectRuntimeDataset
      }
    );
  }
  addBlocker(
    blockers,
    "primitive_fallback_render_suppression",
    status.primitiveFallbackRenderSuppressionSnapshot?.reason ??
      status.primitiveFallbackRenderSuppressionDataset?.reason,
    summarizePrimitiveFallbackSuppression(status),
    {
      snapshot: status.primitiveFallbackRenderSuppressionSnapshot,
      dataset: status.primitiveFallbackRenderSuppressionDataset
    }
  );
  return {
    version: "aurora-areas-runtime-blocker-snapshot/v1",
    status: blockers.length > 0 ? "blocked_or_partial" : "clear",
    firstBlocker: blockers[0] ?? null,
    blockers
  };
}

function isTerrainOnlyRuntimeCaptureStatus(status) {
  return (
    status?.renderVisibility?.mode === "terrain_only" &&
    status?.renderVisibility?.objectLayerVisible === "false"
  );
}

function summarizeCanvasVisualBlocker(canvasVisualEvidence) {
  if (!canvasVisualEvidence || canvasVisualEvidence.status !== "sampled") {
    return null;
  }
  if (canvasVisualEvidence.classification !== "blank_or_nearly_black") {
    return null;
  }
  return [
    `canvas appears blank/black`,
    `nonBlackRatio=${canvasVisualEvidence.nonBlackPixelRatio}`,
    `brightRatio=${canvasVisualEvidence.brightPixelRatio}`,
    `avgLuma=${canvasVisualEvidence.averageLuminance}`,
    `maxLuma=${canvasVisualEvidence.maxLuminance}`
  ].join(" ");
}

function addBlocker(blockers, lane, code, summary, details) {
  const normalizedSummary = normalizeBlockerSummary(summary);
  if (!normalizedSummary) {
    return;
  }
  blockers.push({
    lane,
    code: code ?? "unknown",
    summary: normalizedSummary,
    details
  });
}

function normalizeBlockerSummary(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  if (!text || text === "none" || text === "ready") {
    return null;
  }
  if (text === "not_checked") {
    return "not_checked";
  }
  return text;
}

function summarizeSharedRendererBlocker(status) {
  const snapshot = status.areaObjectSharedRendererSnapshot;
  const dataset = status.areaObjectRuntimeDataset ?? {};
  if (snapshot?.status === "blocked" || snapshot?.status === "partial") {
    const parts = [
      `status=${snapshot.status}`,
      `missingPayload=${snapshot.missingPayloadIds?.length ?? 0}`,
      `primitiveFallback=${snapshot.primitiveFallbackCount ?? 0}`,
      `texturePending=${snapshot.texturePendingIds?.length ?? 0}`,
      `textureIssues=${snapshot.textureIssueIds?.length ?? 0}`,
      `blocked=${snapshot.blockedIds?.length ?? 0}`
    ];
    return parts.join(" ");
  }
  const textureIssueIds = dataset.sharedRendererTextureIssueIds;
  if (textureIssueIds && textureIssueIds !== "none") {
    return `texture issue ids: ${textureIssueIds}`;
  }
  const missingPayloadIds = dataset.sharedRendererMissingPayloadIds;
  if (missingPayloadIds && missingPayloadIds !== "none") {
    return `missing payload ids: ${missingPayloadIds}`;
  }
  const blockedIds = dataset.backendRenderBlockedIds;
  if (blockedIds && blockedIds !== "none") {
    return `backend render blocked ids: ${blockedIds}`;
  }
  return null;
}

function parseJsonObject(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function summarizePrimitiveFallbackSuppression(status) {
  const snapshot = status.primitiveFallbackRenderSuppressionSnapshot;
  const dataset = status.primitiveFallbackRenderSuppressionDataset ?? {};
  const suppressedCount = Number(snapshot?.suppressedCount ?? dataset.suppressedCount ?? 0);
  if (suppressedCount > 0) {
    return `suppressed=${suppressedCount} ids=${(snapshot?.suppressedIds ?? dataset.suppressedIds ?? "none").toString()}`;
  }
  return null;
}

async function readAreaRuntimeStatus(send, openedAreaText) {
  const status = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const runtime = document.querySelector(".workspace-render-canvas");
      const workspaceLayout = document.querySelector(".workspace-layout");
      const workspaceLayoutDataset = workspaceLayout?.dataset ?? {};
      const canvas = runtime?.querySelector("canvas") ?? document.querySelector("canvas");
      const dataset = runtime?.dataset ?? {};
      const terrainSnapshotRaw = dataset.areaTerrainTileModelRuntimeSnapshot ?? "";
      const tileProcessSnapshotRaw = dataset.areaTileProcessRuntimeSnapshot ?? "";
      const sharedRendererSnapshotRaw = dataset.areaObjectSharedRendererSnapshot ?? "";
      const primitiveFallbackRenderSuppressionSnapshotRaw =
        dataset.areaPrimitiveFallbackRenderSuppressionSnapshot ?? "";
      const areaTileMutationTraceRaw =
        workspaceLayoutDataset.areaTileMutationTrace ?? "";
      const areaTileMutationContractSettlementRaw =
        workspaceLayoutDataset.areaTileMutationContractSettlement ?? "";
      const frontendRuntimeBuildIdentityRaw =
        workspaceLayoutDataset.auroraRuntimeBuildIdentity ?? "";
      let terrainTileModelSnapshot = null;
      let tileProcessRuntimeSnapshot = null;
      let areaObjectSharedRendererSnapshot = null;
      let primitiveFallbackRenderSuppressionSnapshot = null;
      let areaTileMutationTrace = null;
      let areaTileMutationContractSettlement = null;
      let frontendRuntimeBuildIdentity = null;
      try {
        terrainTileModelSnapshot = terrainSnapshotRaw ? JSON.parse(terrainSnapshotRaw) : null;
      } catch (error) {
        terrainTileModelSnapshot = { parseError: error instanceof Error ? error.message : String(error) };
      }
      try {
        tileProcessRuntimeSnapshot = tileProcessSnapshotRaw ? JSON.parse(tileProcessSnapshotRaw) : null;
      } catch (error) {
        tileProcessRuntimeSnapshot = { parseError: error instanceof Error ? error.message : String(error) };
      }
      try {
        areaObjectSharedRendererSnapshot = sharedRendererSnapshotRaw
          ? JSON.parse(sharedRendererSnapshotRaw)
          : null;
      } catch (error) {
        areaObjectSharedRendererSnapshot = { parseError: error instanceof Error ? error.message : String(error) };
      }
      try {
        primitiveFallbackRenderSuppressionSnapshot = primitiveFallbackRenderSuppressionSnapshotRaw
          ? JSON.parse(primitiveFallbackRenderSuppressionSnapshotRaw)
          : null;
      } catch (error) {
        primitiveFallbackRenderSuppressionSnapshot = { parseError: error instanceof Error ? error.message : String(error) };
      }
      try {
        areaTileMutationTrace = areaTileMutationTraceRaw
          ? JSON.parse(areaTileMutationTraceRaw)
          : null;
      } catch (error) {
        areaTileMutationTrace = {
          parseError: error instanceof Error ? error.message : String(error)
        };
      }
      try {
        areaTileMutationContractSettlement = areaTileMutationContractSettlementRaw
          ? JSON.parse(areaTileMutationContractSettlementRaw)
          : null;
      } catch (error) {
        areaTileMutationContractSettlement = {
          parseError: error instanceof Error ? error.message : String(error)
        };
      }
      try {
        frontendRuntimeBuildIdentity = frontendRuntimeBuildIdentityRaw
          ? JSON.parse(frontendRuntimeBuildIdentityRaw)
          : null;
      } catch (error) {
        frontendRuntimeBuildIdentity = {
          parseError: error instanceof Error ? error.message : String(error)
        };
      }
      const texturePendingCount = Array.isArray(areaObjectSharedRendererSnapshot?.texturePendingIds)
        ? areaObjectSharedRendererSnapshot.texturePendingIds.length
        : 0;
      const textureIssueCount = Array.isArray(areaObjectSharedRendererSnapshot?.textureIssueIds)
        ? areaObjectSharedRendererSnapshot.textureIssueIds.length
        : 0;
      const areaSharedRendererNotApplicableCount = Number(
        areaObjectSharedRendererSnapshot?.placeholderReasonCounts?.["not-applicable"] ?? 0
      );
      const areaSharedRendererModelReadyCount = Number(
        areaObjectSharedRendererSnapshot?.modelReadyCount ?? 0
      );
      const areaSharedRendererModelBoundsSampleCount = Array.isArray(
        areaObjectSharedRendererSnapshot?.modelBoundsSample
      )
        ? areaObjectSharedRendererSnapshot.modelBoundsSample.length
        : Number(dataset.areaObjectSharedRendererModelBoundsSampleCount ?? 0);
      const areaSharedRendererSnapshotReady =
        areaObjectSharedRendererSnapshot?.version === "aurora-areas-shared-renderer-runtime/v1" &&
        areaObjectSharedRendererSnapshot?.status === "ready" &&
        Number(areaObjectSharedRendererSnapshot?.total ?? 0) > 0 &&
        areaSharedRendererModelReadyCount +
          areaSharedRendererNotApplicableCount >=
          Number(areaObjectSharedRendererSnapshot?.total ?? 0) &&
        Number(areaObjectSharedRendererSnapshot?.primitiveFallbackCount ?? 0) === 0 &&
        (areaSharedRendererModelReadyCount === 0 ||
          areaSharedRendererModelBoundsSampleCount > 0) &&
        texturePendingCount === 0 &&
        textureIssueCount === 0;
      const canvasRect = canvas?.getBoundingClientRect();
      const workspaceCanvasLayer = document.querySelector(".workspace-canvas-layer");
      const workspaceCanvasLayerDataset = workspaceCanvasLayer?.dataset ?? {};
      const canvasDataset = canvas?.dataset ?? {};
      const visualBlockers = Array.from(
        document.querySelectorAll(
          ".canvas-area-runtime-alert, .canvas-placeable-load-overlay, .scene-objects-empty"
        )
      )
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const opacity = Number.parseFloat(style.opacity || "1");
          return {
            selector:
              element.classList.contains("canvas-area-runtime-alert")
                ? ".canvas-area-runtime-alert"
                : element.classList.contains("canvas-placeable-load-overlay")
                  ? ".canvas-placeable-load-overlay"
                  : ".scene-objects-empty",
            text: element.textContent?.replace(/\\s+/gu, " ").trim().slice(0, 500) ?? "",
            visible:
              rect.width > 0 &&
              rect.height > 0 &&
              style.display !== "none" &&
              style.visibility !== "hidden" &&
              style.visibility !== "collapse" &&
              opacity > 0.01,
            rect: {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          };
        })
        .filter((entry) => entry.visible)
        .filter(
          (entry) =>
            entry.selector !== ".canvas-placeable-load-overlay" ||
            !areaSharedRendererSnapshotReady
        )
        .slice(0, 8);
      return {
        href: window.location.href,
        routePath: window.location.pathname,
        openedAreaText: ${JSON.stringify(openedAreaText)},
        workspaceMode: window.localStorage.getItem("aurora_web.workspace_mode.v1"),
        canvasPresent: Boolean(canvas),
        canvasRect: canvasRect
          ? {
              left: Math.round(canvasRect.left),
              top: Math.round(canvasRect.top),
              width: Math.round(canvasRect.width),
              height: Math.round(canvasRect.height)
            }
          : null,
        externalSceneSeedDataset: {
          sceneId:
            workspaceCanvasLayerDataset.externalSceneId ??
            dataset.externalSceneId ??
            null,
          size:
            workspaceCanvasLayerDataset.externalSceneSize ??
            dataset.externalSceneSize ??
            null,
          objectCount:
            workspaceCanvasLayerDataset.externalSceneObjectCount ??
            dataset.externalSceneObjectCount ??
            null
        },
        canvasSceneDataset: {
          sceneId: dataset.currentSceneId ?? canvasDataset.currentSceneId ?? null,
          size: dataset.currentSceneSize ?? canvasDataset.currentSceneSize ?? null,
          tileCount:
            dataset.currentSceneTileCount ?? canvasDataset.currentSceneTileCount ?? null,
          objectCount:
            dataset.currentSceneObjectCount ??
            canvasDataset.currentSceneObjectCount ??
            null
        },
        tileProcessSceneContract: {
          requestPhase: workspaceLayoutDataset.areaTileProcessRequestPhase ?? null,
          currentSceneKey: workspaceLayoutDataset.areaTileProcessCurrentSceneKey ?? null,
          readinessSceneKey: workspaceLayoutDataset.areaTileProcessReadinessSceneKey ?? null,
          portReady: workspaceLayoutDataset.areaTileProcessPortReady ?? null,
          tokenReady: workspaceLayoutDataset.areaTileProcessTokenReady ?? null
        },
        frontendRuntimeBuildIdentity,
        areaTileMutationTrace,
        areaTileMutationContractSettlement,
        cameraFrame: {
          status: dataset.areaCameraFrameStatus ?? null,
          source: dataset.areaCameraFrameSource ?? null,
          mode: dataset.areaCameraFrameMode ?? null,
          size: dataset.areaCameraFrameSize ?? null,
          target: dataset.areaCameraFrameTarget ?? null,
          distance: dataset.areaCameraFrameDistance ?? null,
          zoomRange: dataset.areaCameraFrameZoomRange ?? null,
          fov: dataset.areaCameraFrameFov ?? null,
          position: dataset.areaCameraFramePosition ?? null,
          actualTarget: dataset.areaCameraFrameActualTarget ?? null,
          up: dataset.areaCameraFrameUp ?? null,
          direction: dataset.areaCameraFrameDirection ?? null,
          actualDistance: dataset.areaCameraFrameActualDistance ?? null,
          terrainBuildId: dataset.areaCameraFrameTerrainBuildId ?? null,
          tileStateDigest: dataset.areaCameraFrameTileStateDigest ?? null,
          boundsDigest: dataset.areaCameraFrameBoundsDigest ?? null,
          boundsPolicy: dataset.areaCameraFrameBoundsPolicy ?? null,
          observedTerrainBounds:
            dataset.areaCameraFrameObservedTerrainBounds ?? null,
          cameraTerrainBounds:
            dataset.areaCameraFrameCameraTerrainBounds ?? null,
          excludedMeshCount:
            dataset.areaCameraFrameExcludedMeshCount ?? null,
          excludedMeshSample:
            dataset.areaCameraFrameExcludedMeshSample ?? null,
          runtimeBoundsExpansionRatio:
            dataset.areaCameraFrameRuntimeBoundsExpansionRatio ?? null,
          runtimeBoundsPolicyStatus:
            dataset.areaCameraFrameRuntimeBoundsPolicyStatus ?? null,
          requiresIndependentVisualReview:
            dataset.areaCameraFrameRuntimeBoundsPolicyStatus ===
            "runtime_bounds_outlier",
          coverageStatus: dataset.areaCameraFrameCoverageStatus ?? null,
          clippedCornerCount:
            dataset.areaCameraFrameClippedCornerCount ?? null,
          minimumNdcMargin:
            dataset.areaCameraFrameMinimumNdcMargin ?? null
        },
        presentedFrame: {
          sequence: dataset.areaPresentedFrameSequence ?? null,
          terrainBuildId:
            dataset.areaPresentedFrameTerrainBuildId ?? null,
          tileStateDigest:
            dataset.areaPresentedFrameTileStateDigest ?? null,
          cameraTerrainBuildId:
            dataset.areaPresentedFrameCameraTerrainBuildId ?? null,
          cameraTileStateDigest:
            dataset.areaPresentedFrameCameraTileStateDigest ?? null,
          cameraCoverageStatus:
            dataset.areaPresentedFrameCameraCoverageStatus ?? null,
          presentedAt: dataset.areaPresentedFramePresentedAt ?? null,
          settlementToken:
            dataset.areaPresentedFrameSettlementToken ?? null
        },
        renderVisibility: {
          mode: dataset.areaOracleRenderVisibility ?? null,
          objectLayerVisible: dataset.areaOracleObjectLayerVisible ?? null,
          source: dataset.areaOracleRenderVisibilitySource ?? null,
          tileLightMarkersVisible: dataset.areaOracleTileLightMarkersVisible ?? null,
          tileLightMarkerCount: dataset.areaOracleTileLightMarkerCount ?? null,
          tileLightsVisible: dataset.areaOracleTileLightsVisible ?? null,
          tileLightLayerFound: dataset.areaOracleTileLightLayerFound ?? null,
          tileLightLayerChildCount: dataset.areaOracleTileLightLayerChildCount ?? null
        },
        tileOverlayRuntimeDataset: {
          optionEnabled: dataset.areaTileOverlayOptionEnabled ?? null,
          renderLayerVisible: dataset.areaTileOverlayRenderLayerVisible ?? null,
          groupVisible: dataset.areaTileOverlayGroupVisible ?? null,
          childCount: dataset.areaTileOverlayChildCount ?? null,
          lineCount: dataset.areaTileOverlayLineCount ?? null,
          vertexCount: dataset.areaTileOverlayVertexCount ?? null,
          renderOrder: dataset.areaTileOverlayRenderOrder ?? null,
          depthTest: dataset.areaTileOverlayDepthTest ?? null,
          depthWrite: dataset.areaTileOverlayDepthWrite ?? null,
          opacity: dataset.areaTileOverlayOpacity ?? null,
          color: dataset.areaTileOverlayColor ?? null,
          position: dataset.areaTileOverlayPosition ?? null
        },
        terrainRuntimeStatus: dataset.areaTerrainTileModelRuntimeStatus ?? null,
        areasRuntimeCaptureClearedAt:
          dataset.areasRuntimeCaptureClearedAt ??
          workspaceCanvasLayerDataset.areasRuntimeCaptureClearedAt ??
          window.__auroraAreasRuntimeCaptureClearedAt ??
          window.sessionStorage.getItem("aurora_areas_runtime_capture_cleared_at") ??
          null,
        areaTerrainAreaId: dataset.areaTerrainAreaId ?? null,
        areaTerrainExtentFootprintSize: dataset.areaTerrainExtentFootprintSize ?? null,
        terrainSurfaceRuntimeDataset: {
          renderStatus: dataset.areaTerrainRenderStatus ?? null,
          sourceBridge: dataset.areaTerrainSourceBridge ?? null,
          geometryStatus: dataset.areaTerrainGeometryStatus ?? null,
          extentFootprintStatus: dataset.areaTerrainExtentFootprintStatus ?? null,
          extentFootprintSize: dataset.areaTerrainExtentFootprintSize ?? null,
          extentFootprintLayer: dataset.areaTerrainExtentFootprintLayer ?? null
        },
        terrainImageMap2DDataset: {
          status: dataset.areaTerrainImageMap2DStatus ?? null,
          contractCount: dataset.areaTerrainImageMap2DContractCount ?? null,
          loadedCount: dataset.areaTerrainImageMap2DLoadedCount ?? null,
          failedCount: dataset.areaTerrainImageMap2DFailedCount ?? null,
          sample: dataset.areaTerrainImageMap2DSample ?? null
        },
        lightShadowRuntimeDataset: {
          tileLightCandidateCount: dataset.areaTerrainTileLightCandidateCount ?? null,
          tileLightAcceptedCount: dataset.areaTerrainTileLightAcceptedCount ?? null,
          tileLightDroppedCount: dataset.areaTerrainTileLightDroppedCount ?? null,
          tileLightBudgetCap: dataset.areaTerrainTileLightBudgetCap ?? null,
          tileLightBudgetSource: dataset.areaTerrainTileLightBudgetSource ?? null,
          tileLightTileCount: dataset.areaTerrainTileLightTileCount ?? null,
          tileLightChannels: dataset.areaTerrainTileLightChannels ?? null,
          tileLightColorSample: dataset.areaTerrainTileLightColorSample ?? null,
          tileLightSourceKeySample: dataset.areaTerrainTileLightSourceKeySample ?? null,
          tileLightPreviewColorSample: dataset.areaTerrainTileLightPreviewColorSample ?? null,
          tileLightStatus: dataset.areaTerrainTileLightStatus ?? null,
          areaGlobalLightingStatus:
            dataset.areaTerrainAreaGlobalLightingStatus ?? null,
          areaGlobalLightingFieldCount:
            dataset.areaTerrainAreaGlobalLightingFieldCount ?? null,
          areaGlobalLightingPhase:
            dataset.areaTerrainAreaGlobalLightingPhase ?? null,
          areaGlobalLightingPhaseSource:
            dataset.areaTerrainAreaGlobalLightingPhaseSource ?? null,
          areaGlobalLightingFields:
            dataset.areaTerrainAreaGlobalLightingFields ?? null,
          areaGlobalFogStatus: dataset.areaTerrainAreaGlobalFogStatus ?? null,
          areaGlobalFogClipDistance:
            dataset.areaTerrainAreaGlobalFogClipDistance ?? null,
          areaGlobalFogAmount: dataset.areaTerrainAreaGlobalFogAmount ?? null,
          areaGlobalShadowOpacity:
            dataset.areaTerrainAreaGlobalShadowOpacity ?? null,
          areaGlobalShadowOpacitySource:
            dataset.areaTerrainAreaGlobalShadowOpacitySource ?? null,
          areaGlobalShadowOpacityFactor:
            dataset.areaTerrainAreaGlobalShadowOpacityFactor ?? null,
          areaGlobalShadowOpacityFactorSource:
            dataset.areaTerrainAreaGlobalShadowOpacityFactorSource ?? null,
          areaGlobalShadowStatus:
            dataset.areaTerrainAreaGlobalShadowStatus ?? null,
          areaGlobalShadowSourceField:
            dataset.areaTerrainAreaGlobalShadowSourceField ?? null,
          areaGlobalShadowStatusSource:
            dataset.areaTerrainAreaGlobalShadowStatusSource ?? null,
          sceneShadowProofStatus: dataset.sceneShadowProofStatus ?? null,
          sceneShadowRetailProjectionStatus:
            dataset.sceneShadowRetailProjectionStatus ?? null,
          sceneShadowPointLightCastShadowCount:
            dataset.sceneShadowPointLightCastShadowCount ?? null,
          sceneShadowPointLightSamples:
            dataset.sceneShadowPointLightSamples ?? null,
          sceneShadowDirectionalLightCastShadowCount:
            dataset.sceneShadowDirectionalLightCastShadowCount ?? null,
          sceneShadowDirectionalLightSamples:
            dataset.sceneShadowDirectionalLightSamples ?? null,
          sceneShadowProgFxType4ShadowRequestCount:
            dataset.sceneShadowProgFxType4ShadowRequestCount ?? null,
          sceneShadowProgFxType4ShadowRequestSamples:
            dataset.sceneShadowProgFxType4ShadowRequestSamples ?? null,
          sceneShadowFastShadowProxyCount:
            dataset.sceneShadowFastShadowProxyCount ?? null,
          sceneShadowFastShadowDisabledCount:
            dataset.sceneShadowFastShadowDisabledCount ?? null,
          sceneShadowFastShadowSamples:
            dataset.sceneShadowFastShadowSamples ?? null,
          sceneShadowAreaStatus:
            dataset.sceneShadowAreaStatus ?? null,
          sceneShadowAreaSourceField:
            dataset.sceneShadowAreaSourceField ?? null,
          sceneShadowAreaStatusSource:
            dataset.sceneShadowAreaStatusSource ?? null,
          sceneShadowAreaOpacity:
            dataset.sceneShadowAreaOpacity ?? null,
          sceneShadowAreaOpacitySource:
            dataset.sceneShadowAreaOpacitySource ?? null,
          sceneShadowAreaOpacityFactor:
            dataset.sceneShadowAreaOpacityFactor ?? null,
          sceneShadowAreaOpacityFactorSource:
            dataset.sceneShadowAreaOpacityFactorSource ?? null,
          areaGlobalLightIntensitySource:
            dataset.areaTerrainAreaGlobalLightIntensitySource ?? null,
          areaGlobalFogRangeSource:
            dataset.areaTerrainAreaGlobalFogRangeSource ?? null
        },
        terrainTileModelSnapshot,
        tileProcessRuntimeStatus: dataset.areaTileProcessRuntimeStatus ?? null,
        tileProcessRuntimeSnapshot,
        areaObjectSharedRendererSnapshot,
        primitiveFallbackRenderSuppressionSnapshot,
        visualBlockers,
        terrainTileModelDataset: {
          loaderPath: dataset.areaTerrainTileModelLoaderPath ?? null,
          areaId: dataset.areaTerrainAreaId ?? null,
          extentFootprintSize: dataset.areaTerrainExtentFootprintSize ?? null,
          contractTileCount: dataset.areaTerrainTileModelContractTileCount ?? null,
          pendingCount: dataset.areaTerrainTileModelPendingCount ?? null,
          loadedCount: dataset.areaTerrainTileModelLoadedCount ?? null,
          failedCount: dataset.areaTerrainTileModelFailedCount ?? null,
          blockedCount: dataset.areaTerrainTileModelBlockedCount ?? null,
          deliveryUrlSample: dataset.areaTerrainTileModelDeliveryUrlSample ?? null,
          objectKeySample: dataset.areaTerrainTileModelObjectKeySample ?? null,
          failedTileSample: dataset.areaTerrainTileModelFailedTileSample ?? null,
          loaderErrorSample: dataset.areaTerrainTileModelLoaderErrorSample ?? null,
          blockedTileSample: dataset.areaTerrainTileModelBlockedTileSample ?? null,
          materialTextureContractCount:
            dataset.areaTerrainTileMaterialTextureContractCount ?? null,
          materialTextureAppliedCount:
            dataset.areaTerrainTileMaterialTextureAppliedCount ?? null,
          materialTextureFailedCount:
            dataset.areaTerrainTileMaterialTextureFailedCount ?? null,
          materialTexturePendingCount:
            dataset.areaTerrainTileMaterialTexturePendingCount ?? null,
          materialTextureFailedTileSample:
            dataset.areaTerrainTileMaterialTextureFailedTileSample ?? null,
          visibleMeshSample: dataset.areaTerrainTileModelVisibleMeshSample ?? null,
          hiddenMeshSample: dataset.areaTerrainTileModelHiddenMeshSample ?? null,
          tileTransformSample: dataset.areaTerrainTileTransformSample ?? null
        },
        tileProcessRuntimeDataset: {
          areaId: dataset.areaTileProcessRuntimeAreaId ?? null,
          checkedCount: dataset.areaTileProcessRuntimeCheckedCount ?? null,
          readyCount: dataset.areaTileProcessRuntimeReadyCount ?? null,
          blockedCount: dataset.areaTileProcessRuntimeBlockedCount ?? null,
          blockers: dataset.areaTileProcessRuntimeBlockers ?? null,
          textureMaterialBlockers: dataset.areaTileProcessRuntimeTextureMaterialBlockers ?? null,
          renderAssetContractBlockers: dataset.areaTileProcessRuntimeRenderAssetContractBlockers ?? null,
          mdlGlbMaterialBlockers: dataset.areaTileProcessRuntimeMdlGlbMaterialBlockers ?? null
        },
        areaObjectRuntimeDataset: {
          source: dataset.areaObjectSource ?? null,
          sourceStatus: dataset.areaObjectSourceStatus ?? null,
          visibleCount: dataset.areaObjectVisibleCount ?? null,
          auroraGitCount: dataset.areaObjectAuroraGitCount ?? null,
          fallbackCount: dataset.areaObjectFallbackCount ?? null,
          placeableCount: dataset.areaObjectPlaceableCount ?? null,
          doorCount: dataset.areaObjectDoorCount ?? null,
          creatureCount: dataset.areaObjectCreatureCount ?? null,
          itemCount: dataset.areaObjectItemCount ?? null,
          soundCount: dataset.areaObjectSoundCount ?? null,
          creatureRenderPayloadReadyCount:
            dataset.areaObjectCreatureRenderPayloadReadyCount ?? null,
          creatureRenderPackageReadyCount:
            dataset.areaObjectCreatureRenderPackageReadyCount ?? null,
          creatureRenderModelUrlReadyCount:
            dataset.areaObjectCreatureRenderModelUrlReadyCount ?? null,
          creatureRenderModelReadyCount:
            dataset.areaObjectCreatureRenderModelReadyCount ?? null,
          creatureRenderPayloadStatus:
            dataset.areaObjectCreatureRenderPayloadStatus ?? null,
          creatureRenderModelStatus:
            dataset.areaObjectCreatureRenderModelStatus ?? null,
          creatureRenderPackageStatuses:
            dataset.areaObjectCreatureRenderPackageStatuses ?? null,
          backendRenderContractStatus: dataset.areaObjectBackendRenderContractStatus ?? null,
          backendRenderContractTotal: dataset.areaObjectBackendRenderContractTotal ?? null,
          backendRenderPayloadReadyCount:
            dataset.areaObjectBackendRenderPayloadReadyCount ?? null,
          backendRenderModelUrlReadyCount:
            dataset.areaObjectBackendRenderModelUrlReadyCount ?? null,
          backendRenderBlockedCount: dataset.areaObjectBackendRenderBlockedCount ?? null,
          backendRenderBlockedIds: dataset.areaObjectBackendRenderBlockedIds ?? null,
          primitiveFallbackIds: dataset.areaObjectPrimitiveFallbackIds ?? null,
          sharedRendererPath: dataset.areaObjectSharedRendererPath ?? null,
          sharedRendererStatus: dataset.areaObjectSharedRendererStatus ?? null,
          sharedRendererPayloadBoundCount:
            dataset.areaObjectSharedRendererPayloadBoundCount ?? null,
          sharedRendererModelReadyCount:
            dataset.areaObjectSharedRendererModelReadyCount ?? null,
          sharedRendererUniqueModelUrlCount:
            dataset.areaObjectSharedRendererUniqueModelUrlCount ?? null,
          sharedRendererUniqueModelCacheKeyCount:
            dataset.areaObjectSharedRendererUniqueModelCacheKeyCount ?? null,
          sharedRendererModelUrlSample:
            dataset.areaObjectSharedRendererModelUrlSample ?? null,
          sharedRendererModelCacheKeySample:
            dataset.areaObjectSharedRendererModelCacheKeySample ?? null,
          sharedRendererModelBoundsSample:
            dataset.areaObjectSharedRendererModelBoundsSample ?? null,
          sharedRendererRuntimeRootCount:
            dataset.areaObjectSharedRendererRuntimeRootCount ?? null,
          sharedRendererRuntimeRootWithChildrenCount:
            dataset.areaObjectSharedRendererRuntimeRootWithChildrenCount ?? null,
          sharedRendererRuntimeRootChildCount:
            dataset.areaObjectSharedRendererRuntimeRootChildCount ?? null,
          sharedRendererRuntimeRootMeshDescendantCount:
            dataset.areaObjectSharedRendererRuntimeRootMeshDescendantCount ?? null,
          sharedRendererRuntimeRootSample:
            dataset.areaObjectSharedRendererRuntimeRootSample ?? null,
          sharedRendererRuntimeRootEvaluationSample:
            dataset.areaObjectSharedRendererRuntimeRootEvaluationSample ?? null,
          sharedRendererRefreshError:
            dataset.areaObjectSharedRendererRefreshError ?? null,
          sharedRendererModelBoundsEntryCount:
            dataset.areaObjectSharedRendererModelBoundsEntryCount ?? null,
          sharedRendererModelBoundsSampleCount:
            dataset.areaObjectSharedRendererModelBoundsSampleCount ?? null,
          sharedRendererBoundsCandidateCount:
            dataset.areaObjectSharedRendererBoundsCandidateCount ?? null,
          sharedRendererPrimitiveFallbackCount:
            dataset.areaObjectSharedRendererPrimitiveFallbackCount ?? null,
          sharedRendererPrimitiveFallbackRenderLimit:
            dataset.areaObjectSharedRendererPrimitiveFallbackRenderLimit ?? null,
          sharedRendererPrimitiveFallbackSuppressedCount:
            dataset.areaObjectSharedRendererPrimitiveFallbackSuppressedCount ?? null,
          sharedRendererMissingPayloadIds:
            dataset.areaObjectSharedRendererMissingPayloadIds ?? null,
          sharedRendererModelLoadFailedIds:
            dataset.areaObjectSharedRendererModelLoadFailedIds ?? null,
          sharedRendererModelLoadFailedModelUrls:
            dataset.areaObjectSharedRendererModelLoadFailedModelUrls ?? null,
          sharedRendererModelLoadFailedModelCacheKeys:
            dataset.areaObjectSharedRendererModelLoadFailedModelCacheKeys ?? null,
          sharedRendererTextureStatusCounts:
            dataset.areaObjectSharedRendererTextureStatusCounts ?? null,
          sharedRendererTexturePendingIds:
            dataset.areaObjectSharedRendererTexturePendingIds ?? null,
          sharedRendererTextureIssueIds:
            dataset.areaObjectSharedRendererTextureIssueIds ?? null,
          sharedRendererTextureMissingIds:
            dataset.areaObjectSharedRendererTextureMissingIds ?? null,
          sharedRendererTextureFallbackIds:
            dataset.areaObjectSharedRendererTextureFallbackIds ?? null,
          sharedRendererTextureSkippedIds:
            dataset.areaObjectSharedRendererTextureSkippedIds ?? null
        },
        placeableModelLoadQueueDataset: {
          concurrencyLimit: dataset.placeableModelLoadConcurrencyLimit ?? null,
          startsPerFrameLimit: dataset.placeableModelLoadStartsPerFrameLimit ?? null,
          activeCount: dataset.placeableModelLoadQueueActiveCount ?? null,
          pendingCount: dataset.placeableModelLoadQueuePendingCount ?? null,
          completedCount: dataset.placeableModelLoadQueueCompletedCount ?? null,
          totalCount: dataset.placeableModelLoadQueueTotalCount ?? null,
          lastOutcome: dataset.placeableModelLoadLastOutcome ?? null,
          lastUrl: dataset.placeableModelLoadLastUrl ?? null,
          lastDetails: dataset.placeableModelLoadLastDetails ?? null,
          peakConcurrencyLimit: dataset.placeableModelLoadPeakConcurrencyLimit ?? null,
          peakStartsPerFrameLimit: dataset.placeableModelLoadPeakStartsPerFrameLimit ?? null,
          peakActiveCount: dataset.placeableModelLoadQueuePeakActiveCount ?? null,
          peakPendingCount: dataset.placeableModelLoadQueuePeakPendingCount ?? null,
          peakTotalCount: dataset.placeableModelLoadQueuePeakTotalCount ?? null,
          bulkModeActivated: dataset.placeableModelLoadBulkModeActivated ?? null,
          current: dataset.placeableModelLoadQueueCurrent ?? null
        },
        placeableTextureLoadQueueDataset: {
          concurrencyLimit: dataset.placeableTextureLoadConcurrencyLimit ?? null,
          activeCount: dataset.placeableTextureLoadQueueActiveCount ?? null,
          pendingCount: dataset.placeableTextureLoadQueuePendingCount ?? null,
          peakActiveCount: dataset.placeableTextureLoadQueuePeakActiveCount ?? null,
          peakPendingCount: dataset.placeableTextureLoadQueuePeakPendingCount ?? null,
          cacheSize: dataset.placeableTextureCacheSize ?? null,
          pendingCacheSize: dataset.placeableTexturePendingCacheSize ?? null,
          activeLabels: dataset.placeableTextureLoadQueueActiveLabels ?? null,
          pendingLabels: dataset.placeableTextureLoadQueuePendingLabels ?? null
        },
        primitiveFallbackRenderSuppressionDataset: {
          reason: dataset.areaPrimitiveFallbackRenderSuppressionReason ?? null,
          renderLimit: dataset.areaPrimitiveFallbackRenderLimit ?? null,
          candidateCount: dataset.areaPrimitiveFallbackCandidateCount ?? null,
          renderedCount: dataset.areaPrimitiveFallbackRenderedCount ?? null,
          suppressedCount: dataset.areaPrimitiveFallbackSuppressedCount ?? null,
          suppressedIds: dataset.areaPrimitiveFallbackSuppressedIds ?? null
        }
      };
    })()`
  });
  return status.result.value;
}

async function waitForTab(port, route, { getChromeSpawnError, timeoutMs = 10_000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let fallbackTab = null;
  while (Date.now() < deadline) {
    const spawnError = getChromeSpawnError?.();
    if (spawnError) {
      throw createBlockerError("chrome_spawn_failed", "Chrome could not be started for CDP capture.", {
        chromePath,
        endpoint: `http://127.0.0.1:${port}/json/list`,
        port,
        route,
        cause: serializeError(spawnError)
      });
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const tabs = await response.json();
      const tab = tabs.find((candidate) => candidate.url === route);
      if (tab?.webSocketDebuggerUrl) {
        return tab;
      }
      fallbackTab ??= tabs.find((candidate) => candidate.type === "page") ?? tabs[0] ?? null;
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  if (fallbackTab?.webSocketDebuggerUrl) {
    return fallbackTab;
  }
  throw createBlockerError("chrome_cdp_tab_timeout", `No Chrome DevTools Protocol tab became available on port ${port}.`, {
    chromePath,
    endpoint: `http://127.0.0.1:${port}/json/list`,
    port,
    route,
      timeoutMs,
    chromeStderrTail: chromeStderr.slice(-1200)
  });
}

function pickExpectedArea(items, areaQuery) {
  const queryIdentity = normalizeAreaIdentity(areaQuery);
  const queryLower = areaQuery.trim().toLowerCase();
  const exactName = items.find((item) => normalizeAreaIdentity(item.name) === queryIdentity);
  if (exactName) {
    return { area: exactName, strategy: "exact_name" };
  }
  const exactAreaId = items.find((item) => normalizeAreaIdentity(item.areaId) === queryIdentity);
  if (exactAreaId) {
    return { area: exactAreaId, strategy: "exact_area_id" };
  }
  const areaIdSuffix = items.find((item) =>
    String(item.areaId ?? "").trim().toLowerCase().endsWith(`__${queryLower.replace(/^_+/u, "")}`)
  );
  if (areaIdSuffix) {
    return { area: areaIdSuffix, strategy: "area_id_suffix" };
  }
  const includes = items.find((item) => {
    const fields = [item.areaId, item.name, ...(Array.isArray(item.tags) ? item.tags : [])]
      .map((value) => normalizeAreaIdentity(value))
      .join(" ");
    return fields.includes(queryIdentity);
  });
  if (includes) {
    return { area: includes, strategy: "identity_includes" };
  }
  return { area: null, strategy: "none" };
}

function normalizeAreaIdentity(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^area_+/u, "")
    .replace(/[^a-z0-9]+/gu, "");
}

function createBlockerError(code, message, details = {}) {
  const error = new Error(message);
  error.captureBlocker = {
    code,
    message,
    ...details
  };
  return error;
}

function buildFailureFrame(error, context) {
  const strictVisualMode = buildStrictVisualModeFailure(error, context);
  const blockers = normalizeCaptureErrors(error, strictVisualMode);
  const networkCaptureSummary = error?.captureBlocker?.networkCaptureSummary ?? null;
  const failureDomStatus = error?.captureBlocker?.lastStatus ?? null;
  const diagnosticVisualEvidence = error?.captureBlocker?.diagnosticVisualEvidence ?? null;
  const diagnosticPageScreenshot = diagnosticVisualEvidence?.pageScreenshot ?? null;
  const diagnosticCanvasScreenshot = diagnosticVisualEvidence?.runtimeCanvasScreenshot ?? null;
  const runtimeActionabilitySummary = buildRuntimeActionabilitySummary({
    domStatus: failureDomStatus,
    expectedAreaDetail: context.expectedAreaDetail,
    networkCaptureSummary,
    sampleLimit: context.actionabilitySampleLimit
  });
  return {
    version: "aurora-areas-runtime-cdp-capture/v1",
    capturedAt: new Date().toISOString(),
    status: "blocked",
    requestedRoute: context.route,
    finalRoute: null,
    target: {
      captureTarget: context.captureTarget,
      areaQuery: context.areaQuery,
      expectedArea: context.expectedArea,
      openedAreaMatchesExpected: false
    },
    areaQuery: context.areaQuery,
    openedArea: null,
    screenshotPath: diagnosticPageScreenshot?.path ?? null,
    screenshotBytes: Number(diagnosticPageScreenshot?.bytes ?? 0),
    runtimeCanvasScreenshot: {
      ok: diagnosticCanvasScreenshot?.ok === true,
      path: diagnosticCanvasScreenshot?.path ?? context.canvasPngPath ?? null,
      ...(diagnosticCanvasScreenshot?.ok === true
        ? diagnosticCanvasScreenshot
        : { reason: "capture_blocked_before_runtime_canvas_screenshot" })
    },
    runtimeCanvasVisualEvidence: diagnosticVisualEvidence ?? null,
    framePath: context.failureFramePath,
    failureFramePath: context.failureFramePath,
    preservedCanonicalFramePath: context.framePath,
    preservedCanonicalFrame: context.previousFrameEvidence,
    timings: {
      totalElapsedMs: Date.now() - context.captureStartedAt,
      httpTimeoutMs: context.httpTimeoutMs,
      chromeCdpTimeoutMs: context.chromeCdpTimeoutMs
    },
    strictVisualMode,
    runtimeEnvironmentPreflight:
      error?.captureBlocker?.runtimeEnvironmentPreflight ??
      context.runtimeEnvironmentPreflight ??
      null,
    seededAuth: context.seededAuthState
      ? {
          source: context.authBaseUrl,
          userId: context.seededAuthState.session.user.id,
          role: context.seededAuthState.session.user.role,
          permissionCount: context.seededAuthState.authorization.permissions.length
        }
      : null,
    domStatus: null,
    terrainTileModelSnapshot: null,
    tileProcessRuntimeSnapshot: null,
    areaObjectSharedRendererSnapshot: null,
    primitiveFallbackRenderSuppressionSnapshot: null,
    expectedAreaDetailSummary: summarizeExpectedAreaDetail(context.expectedAreaDetail),
    networkCaptureSummary,
    runtimeActionabilitySummary,
    runtimeBlockerSnapshot: {
      version: "aurora-areas-runtime-blocker-snapshot/v1",
      status: "blocked",
      firstBlocker: blockers[0] ?? null,
      blockers
    },
    diagnosticVisualEvidence,
    blocker: blockers[0] ?? normalizeCaptureError(error),
    captureMethod:
      "chrome-devtools-protocol Page.captureScreenshot plus data-area-terrain-tile-model-runtime-snapshot, data-area-tile-process-runtime-snapshot, shared renderer/placeable, loader, and blocker runtime datasets",
    chromePath: context.chromePath,
    chromeDebugPort: context.port,
    chromeStderrTail: chromeStderr.slice(-1200),
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true
  };
}

function normalizeCaptureErrors(error, strictVisualMode = null) {
  const primary = normalizeCaptureError(error);
  const related = Array.isArray(error?.captureBlocker?.relatedBlockers)
    ? error.captureBlocker.relatedBlockers
    : [];
  const blockers = [
    primary,
    ...related.map((blocker) => ({
      lane: blocker.lane ?? "capture",
      code: blocker.code ?? "capture_related_blocker",
      summary: blocker.summary ?? blocker.message ?? "Related capture blocker.",
      details: blocker.details ?? {}
    }))
  ];
  if (
    strictVisualMode?.requireScreenshot &&
    strictVisualMode.failureClass === "render_screenshot_missing" &&
    !blockers.some((blocker) => blocker.code === "render_screenshot_missing")
  ) {
    blockers.push({
      lane: "capture",
      code: "render_screenshot_missing",
      summary: "Strict visual capture did not produce a fresh _IKEA PNG.",
      details: {
        pngPath: strictVisualMode.screenshot?.path ?? null,
        screenshot: strictVisualMode.screenshot
      }
    });
  }
  return blockers;
}

function normalizeCaptureError(error) {
  const blocker = error?.captureBlocker;
  if (blocker) {
    return {
      lane: "capture",
      code: blocker.code,
      summary: blocker.message,
      details: { ...blocker, message: undefined, code: undefined }
    };
  }
  return {
    lane: "capture",
    code: "capture_failed",
    summary: formatErrorForMessage(error),
    details: {
      cause: serializeError(error)
    }
  };
}

function buildStrictVisualModeSuccess({ requireScreenshot, screenshotEvidence }) {
  return {
    requireScreenshot,
    status: requireScreenshot ? "passed" : "not_required",
    failureClass: null,
    screenshot: screenshotEvidence
  };
}

function buildStrictVisualModeFailure(error, context) {
  const screenshotEvidence = inspectScreenshotEvidence(context.pngPath, context.captureStartedAt);
  const blockerCode = error?.captureBlocker?.code ?? null;
  const failureClass = classifyStrictVisualFailure(blockerCode, screenshotEvidence);
  return {
    requireScreenshot: context.requireScreenshot,
    status: context.requireScreenshot ? "failed" : "not_required",
    failureClass: context.requireScreenshot ? failureClass : null,
    blockerCode,
    screenshot: screenshotEvidence
  };
}

function classifyStrictVisualFailure(blockerCode, screenshotEvidence) {
  if (isRuntimeEnvironmentBlockerCode(blockerCode)) {
    return "runtime_environment_blocked";
  }
  if (blockerCode === "render_screenshot_missing" || !screenshotEvidence.fresh) {
    return "render_screenshot_missing";
  }
  return "capture_blocked_before_strict_screenshot";
}

function isRuntimeEnvironmentBlockerCode(code) {
  return [
    "frontend_unavailable",
    "backend_proxy_unavailable",
    "backend_direct_unavailable",
    "backend_login_failed"
  ].includes(code);
}

function inspectScreenshotEvidence(pngPath, captureStartedAt) {
  try {
    const stats = fs.statSync(pngPath);
    return {
      path: pngPath,
      exists: true,
      bytes: stats.size,
      mtimeMs: Math.round(stats.mtimeMs),
      captureStartedAtMs: captureStartedAt,
      fresh: stats.size > 0 && stats.mtimeMs >= captureStartedAt
    };
  } catch (error) {
    return {
      path: pngPath,
      exists: false,
      bytes: 0,
      mtimeMs: null,
      captureStartedAtMs: captureStartedAt,
      fresh: false,
      cause: serializeError(error)
    };
  }
}

function inspectCanvasVisualEvidence(pngPath, domStatus) {
  try {
    const image = decodePngRgba(pngPath);
    const crop = resolveCanvasCropRect(domStatus, image.width, image.height);
    return samplePngCropVisualEvidence(image, crop);
  } catch (error) {
    return {
      version: "aurora-areas-canvas-visual-evidence/v1",
      status: "unavailable",
      reason: "png_visual_sampling_failed",
      cause: serializeError(error)
    };
  }
}

function inspectRuntimeCanvasVisualEvidence(pngPath) {
  try {
    const image = decodePngRgba(pngPath);
    return samplePngCropVisualEvidence(image, {
      x: 0,
      y: 0,
      width: image.width,
      height: image.height,
      source: "runtime_canvas_data_url"
    });
  } catch (error) {
    return {
      version: "aurora-areas-canvas-visual-evidence/v1",
      status: "unavailable",
      reason: "runtime_canvas_png_visual_sampling_failed",
      cause: serializeError(error)
    };
  }
}

function decodePngRgba(pngPath) {
  const buffer = fs.readFileSync(pngPath);
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    throw new Error(`Unsupported screenshot format: ${pngPath} is not a PNG file.`);
  }

  let offset = 8;
  let ihdr = null;
  let palette = null;
  let transparency = null;
  const idatChunks = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + length;
    if (chunkEnd + 4 > buffer.length) {
      throw new Error(`Malformed PNG chunk ${type}: length exceeds file size.`);
    }
    const chunk = buffer.subarray(chunkStart, chunkEnd);
    if (type === "IHDR") {
      ihdr = {
        width: chunk.readUInt32BE(0),
        height: chunk.readUInt32BE(4),
        bitDepth: chunk[8],
        colorType: chunk[9],
        compression: chunk[10],
        filter: chunk[11],
        interlace: chunk[12]
      };
    } else if (type === "PLTE") {
      palette = chunk;
    } else if (type === "tRNS") {
      transparency = chunk;
    } else if (type === "IDAT") {
      idatChunks.push(chunk);
    } else if (type === "IEND") {
      break;
    }
    offset = chunkEnd + 4;
  }

  if (!ihdr) {
    throw new Error("PNG is missing IHDR.");
  }
  if (ihdr.bitDepth !== 8 || ihdr.compression !== 0 || ihdr.filter !== 0 || ihdr.interlace !== 0) {
    throw new Error(
      `Unsupported PNG encoding bitDepth=${ihdr.bitDepth} compression=${ihdr.compression} filter=${ihdr.filter} interlace=${ihdr.interlace}.`
    );
  }
  if (idatChunks.length === 0) {
    throw new Error("PNG is missing IDAT.");
  }

  const channels = getPngChannelCount(ihdr.colorType);
  const bytesPerPixel = channels;
  const rowBytes = ihdr.width * channels;
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const raw = unfilterPngScanlines(inflated, ihdr.width, ihdr.height, bytesPerPixel, rowBytes);
  const rgba = new Uint8ClampedArray(ihdr.width * ihdr.height * 4);

  for (let pixelIndex = 0, rawIndex = 0; pixelIndex < rgba.length; pixelIndex += 4) {
    if (ihdr.colorType === 6) {
      rgba[pixelIndex] = raw[rawIndex++];
      rgba[pixelIndex + 1] = raw[rawIndex++];
      rgba[pixelIndex + 2] = raw[rawIndex++];
      rgba[pixelIndex + 3] = raw[rawIndex++];
    } else if (ihdr.colorType === 2) {
      rgba[pixelIndex] = raw[rawIndex++];
      rgba[pixelIndex + 1] = raw[rawIndex++];
      rgba[pixelIndex + 2] = raw[rawIndex++];
      rgba[pixelIndex + 3] = 255;
    } else if (ihdr.colorType === 0) {
      const value = raw[rawIndex++];
      rgba[pixelIndex] = value;
      rgba[pixelIndex + 1] = value;
      rgba[pixelIndex + 2] = value;
      rgba[pixelIndex + 3] = 255;
    } else if (ihdr.colorType === 4) {
      const value = raw[rawIndex++];
      rgba[pixelIndex] = value;
      rgba[pixelIndex + 1] = value;
      rgba[pixelIndex + 2] = value;
      rgba[pixelIndex + 3] = raw[rawIndex++];
    } else if (ihdr.colorType === 3) {
      if (!palette) {
        throw new Error("Palette PNG is missing PLTE.");
      }
      const paletteIndex = raw[rawIndex++];
      const paletteOffset = paletteIndex * 3;
      rgba[pixelIndex] = palette[paletteOffset] ?? 0;
      rgba[pixelIndex + 1] = palette[paletteOffset + 1] ?? 0;
      rgba[pixelIndex + 2] = palette[paletteOffset + 2] ?? 0;
      rgba[pixelIndex + 3] = transparency?.[paletteIndex] ?? 255;
    }
  }

  return {
    width: ihdr.width,
    height: ihdr.height,
    rgba
  };
}

function getPngChannelCount(colorType) {
  if (colorType === 0 || colorType === 3) {
    return 1;
  }
  if (colorType === 2) {
    return 3;
  }
  if (colorType === 4) {
    return 2;
  }
  if (colorType === 6) {
    return 4;
  }
  throw new Error(`Unsupported PNG color type ${colorType}.`);
}

function unfilterPngScanlines(inflated, width, height, bytesPerPixel, rowBytes) {
  const expectedLength = height * (rowBytes + 1);
  if (inflated.length < expectedLength) {
    throw new Error(
      `Inflated PNG data is truncated: expected at least ${expectedLength} bytes, got ${inflated.length}.`
    );
  }
  const output = new Uint8Array(width * height * bytesPerPixel);
  let inputOffset = 0;
  let outputOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filterType = inflated[inputOffset++];
    for (let column = 0; column < rowBytes; column += 1) {
      const raw = inflated[inputOffset++];
      const left = column >= bytesPerPixel ? output[outputOffset + column - bytesPerPixel] : 0;
      const up = row > 0 ? output[outputOffset + column - rowBytes] : 0;
      const upLeft =
        row > 0 && column >= bytesPerPixel
          ? output[outputOffset + column - rowBytes - bytesPerPixel]
          : 0;
      let value = raw;
      if (filterType === 1) {
        value = raw + left;
      } else if (filterType === 2) {
        value = raw + up;
      } else if (filterType === 3) {
        value = raw + Math.floor((left + up) / 2);
      } else if (filterType === 4) {
        value = raw + paethPredictor(left, up, upLeft);
      } else if (filterType !== 0) {
        throw new Error(`Unsupported PNG filter type ${filterType}.`);
      }
      output[outputOffset + column] = value & 0xff;
    }
    outputOffset += rowBytes;
  }
  return output;
}

function paethPredictor(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) {
    return left;
  }
  if (distanceUp <= distanceUpLeft) {
    return up;
  }
  return upLeft;
}

function resolveCanvasCropRect(domStatus, imageWidth, imageHeight) {
  const rect = domStatus?.canvasRect;
  const left = Number(rect?.left);
  const top = Number(rect?.top);
  const width = Number(rect?.width);
  const height = Number(rect?.height);
  if (
    Number.isFinite(left) &&
    Number.isFinite(top) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width > 1 &&
    height > 1
  ) {
    const x = clampInteger(Math.floor(left), 0, imageWidth - 1);
    const y = clampInteger(Math.floor(top), 0, imageHeight - 1);
    const right = clampInteger(Math.ceil(left + width), x + 1, imageWidth);
    const bottom = clampInteger(Math.ceil(top + height), y + 1, imageHeight);
    return {
      x,
      y,
      width: right - x,
      height: bottom - y,
      source: "dom_canvas_rect"
    };
  }
  return {
    x: 0,
    y: 0,
    width: imageWidth,
    height: imageHeight,
    source: "full_png_fallback"
  };
}

function clampInteger(value, min, max) {
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function samplePngCropVisualEvidence(image, crop) {
  const sampleWidth = 64;
  const sampleHeight = 64;
  let nonTransparentCount = 0;
  let nonBlackCount = 0;
  let brightCount = 0;
  let luminanceSum = 0;
  let maxLuminance = 0;
  for (let sampleY = 0; sampleY < sampleHeight; sampleY += 1) {
    const sourceY = crop.y + Math.min(crop.height - 1, Math.floor((sampleY + 0.5) * crop.height / sampleHeight));
    for (let sampleX = 0; sampleX < sampleWidth; sampleX += 1) {
      const sourceX = crop.x + Math.min(crop.width - 1, Math.floor((sampleX + 0.5) * crop.width / sampleWidth));
      const pixelIndex = (sourceY * image.width + sourceX) * 4;
      const alpha = image.rgba[pixelIndex + 3] ?? 0;
      if (alpha <= 8) {
        continue;
      }
      const red = image.rgba[pixelIndex] ?? 0;
      const green = image.rgba[pixelIndex + 1] ?? 0;
      const blue = image.rgba[pixelIndex + 2] ?? 0;
      const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
      nonTransparentCount += 1;
      luminanceSum += luminance;
      maxLuminance = Math.max(maxLuminance, luminance);
      if (red + green + blue > 24) {
        nonBlackCount += 1;
      }
      if (luminance > 16) {
        brightCount += 1;
      }
    }
  }
  const sampleCount = sampleWidth * sampleHeight;
  const nonBlackPixelRatio = nonBlackCount / sampleCount;
  const brightPixelRatio = brightCount / sampleCount;
  const averageLuminance = nonTransparentCount > 0 ? luminanceSum / nonTransparentCount : 0;
  const classification =
    nonBlackPixelRatio < 0.01 && brightPixelRatio < 0.002 && maxLuminance < 24
      ? "blank_or_nearly_black"
      : "visible_content";
  return {
    version: "aurora-areas-canvas-visual-evidence/v1",
    status: "sampled",
    source: "png-crop",
    imageWidth: image.width,
    imageHeight: image.height,
    crop,
    sampleWidth,
    sampleHeight,
    sampleCount,
    nonTransparentCount,
    nonBlackCount,
    brightCount,
    nonBlackPixelRatio: Number(nonBlackPixelRatio.toFixed(6)),
    brightPixelRatio: Number(brightPixelRatio.toFixed(6)),
    averageLuminance: Number(averageLuminance.toFixed(3)),
    maxLuminance: Number(maxLuminance.toFixed(3)),
    classification
  };
}

function buildConsoleSummary(frame) {
  const firstBlocker =
    frame.runtimeActionabilitySummary?.firstErrorReason ??
    frame.blocker?.code ??
    frame.runtimeBlockerSnapshot?.firstBlocker?.code ??
    null;
  return {
    version: frame.version,
    status: frame.status,
    capturedAt: frame.capturedAt,
    target: frame.target,
    screenshotPath: frame.screenshotPath,
    screenshotBytes: frame.screenshotBytes,
    runtimeCanvasScreenshot: frame.runtimeCanvasScreenshot ?? null,
    runtimeCanvasVisualEvidence: frame.runtimeCanvasVisualEvidence ?? null,
    canvasVisualEvidence: frame.canvasVisualEvidence,
    framePath: frame.framePath,
    failureFramePath: frame.failureFramePath ?? null,
    preservedCanonicalFramePath: frame.preservedCanonicalFramePath ?? null,
    preservedCanonicalFrame: frame.preservedCanonicalFrame ?? null,
    timings: frame.timings,
    strictVisualMode: frame.strictVisualMode,
    firstBlocker,
    blocker: summarizeBlockerForConsole(
      frame.blocker ?? frame.runtimeBlockerSnapshot?.firstBlocker ?? null
    ),
    runtimeEnvironmentPreflight: summarizeRuntimeEnvironmentPreflight(
      frame.runtimeEnvironmentPreflight
    ),
    expectedAreaDetailSummary: frame.expectedAreaDetailSummary ?? null,
    areaObjectSupportSurfaceSummary: frame.areaObjectSupportSurfaceSummary ?? null,
    runtimeActionabilitySummary: summarizeRuntimeActionabilityForConsole(
      frame.runtimeActionabilitySummary
    ),
    canonicalParityPromoted: frame.canonicalParityPromoted,
    localOnlyNotRetailEvidence: frame.localOnlyNotRetailEvidence
  };
}

function summarizeBlockerForConsole(blocker) {
  if (!blocker) {
    return null;
  }
  return {
    lane: blocker.lane ?? null,
    code: blocker.code ?? null,
    summary: blocker.summary ?? null,
    details: summarizeBlockerDetailsForConsole(blocker.details ?? {})
  };
}

function summarizeBlockerDetailsForConsole(details) {
  if (!details || typeof details !== "object") {
    return null;
  }
  return {
    endpoint: details.endpoint ?? null,
    port: details.port ?? null,
    method: details.method ?? null,
    status: details.status ?? null,
    elapsedMs: details.elapsedMs ?? null,
    timeoutMs: details.timeoutMs ?? null,
    failureKind: details.failureKind ?? null,
    selector: details.selector ?? null,
    query: details.query ?? null,
    expectedArea: summarizeAreaForConsole(details.expectedArea),
    openedArea: summarizeOpenedAreaForConsole(details.openedArea),
    lastStatus: summarizeDomStatusForConsole(details.lastStatus),
    cause: details.cause ?? null,
    networkCaptureSummary: summarizeNetworkCaptureCountsForConsole(
      details.networkCaptureSummary
    )
  };
}

function summarizeRuntimeActionabilityForConsole(summary) {
  if (!summary) {
    return null;
  }
  return {
    version: summary.version ?? null,
    status: summary.status ?? null,
    firstErrorReason: summary.firstErrorReason ?? null,
    sharedRenderer: summary.sharedRenderer
      ? {
          status: summary.sharedRenderer.status ?? null,
          total: summary.sharedRenderer.total ?? null,
          missingPayloadCount: summary.sharedRenderer.missingPayloadCount ?? null,
          payloadBoundCount: summary.sharedRenderer.payloadBoundCount ?? null,
          renderedModelUrlCount:
            summary.sharedRenderer.renderedModelUrlCount ??
            summary.sharedRenderer.modelReadyCount ??
            null,
          primitiveFallbackCount: summary.sharedRenderer.primitiveFallbackCount ?? null,
          primitiveFallbackSuppressedCount:
            summary.sharedRenderer.primitiveFallbackSuppressedCount ?? null,
          backendRenderPayloadReadyCount:
            summary.sharedRenderer.backendRenderPayloadReadyCount ?? null,
          backendRenderModelUrlReadyCount:
            summary.sharedRenderer.backendRenderModelUrlReadyCount ?? null,
          visualTransform: summary.sharedRenderer.visualTransform
            ? {
                expectedApiCount:
                  summary.sharedRenderer.visualTransform.expectedApiCount ?? null,
                runtimeMatchedExpectedCount:
                  summary.sharedRenderer.visualTransform.runtimeMatchedExpectedCount ?? null,
                runtimeEvidenceSource:
                  summary.sharedRenderer.visualTransform.runtimeEvidenceSource ?? null,
                runtimeAppliedExpectedCount:
                  summary.sharedRenderer.visualTransform.runtimeAppliedExpectedCount ?? null,
                missingRuntimeCount:
                  summary.sharedRenderer.visualTransform.missingRuntimeCount ?? null,
                notAppliedExpectedCount:
                  summary.sharedRenderer.visualTransform.notAppliedExpectedCount ?? null,
                unexpectedAppliedCount:
                  summary.sharedRenderer.visualTransform.unexpectedAppliedCount ?? null
              }
            : null
        }
      : null,
    queue: summary.queue ?? null,
    queueRequestCounts: summary.queueRequestCounts ?? null,
    payloadResponseCounts: summary.payloadResponseCounts ?? null,
    firstMissingObjects: Array.isArray(summary.firstMissingObjects)
      ? summary.firstMissingObjects.slice(0, 5)
      : [],
    network: summarizeNetworkCaptureSummaryForConsole(summary.network)
  };
}

function buildAreaObjectSupportSurfaceSummary(snapshot, context = {}, sampleLimit = 24) {
  const entries = Array.isArray(snapshot?.modelBoundsSample)
    ? snapshot.modelBoundsSample
    : [];
  const statusCounts = {};
  const confidenceCounts = {};
  const liftTargetCounts = {};
  const terrainSurfaceStatusCounts = {};
  const supportCorrectionStatusCounts = {};
  const supportCorrections = [];
  const resolvedBySupportCorrection = [];
  const sourceZConsistentFloating = [];
  const sourceZConsistentSupportOverlap = [];
  const partialOverlapSideContact = [];
  const modelOriginElevated = [];
  const issues = [];
  for (const entry of entries) {
    const modelSurface = entry?.modelSurface ?? {};
    const supportSurface = modelSurface.supportSurface ?? {};
    const supportCorrection = modelSurface.supportCorrection ?? {};
    const status = supportSurface.status ?? "missing";
    const confidence = supportSurface.confidence ?? "missing";
    const liftTarget = modelSurface.liftTarget ?? "missing";
    const terrainStatus = modelSurface.terrainSurface?.status ?? "missing";
    const supportCorrectionStatus = supportCorrection.status ?? "missing";
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    confidenceCounts[confidence] = (confidenceCounts[confidence] ?? 0) + 1;
    liftTargetCounts[liftTarget] = (liftTargetCounts[liftTarget] ?? 0) + 1;
    terrainSurfaceStatusCounts[terrainStatus] =
      (terrainSurfaceStatusCounts[terrainStatus] ?? 0) + 1;
    supportCorrectionStatusCounts[supportCorrectionStatus] =
      (supportCorrectionStatusCounts[supportCorrectionStatus] ?? 0) + 1;

    const supportCorrectionApplied =
      supportCorrection.applied === true || supportCorrectionStatus === "lifted";
    const supportCorrectionAfterBottomY = Number(supportCorrection.afterBottomY ?? NaN);
    const supportCorrectionSupportTopY = Number(supportCorrection.supportTopY ?? NaN);
    const supportCorrectionResidualGapY =
      Number.isFinite(supportCorrectionAfterBottomY) &&
      Number.isFinite(supportCorrectionSupportTopY)
        ? supportCorrectionAfterBottomY - supportCorrectionSupportTopY
        : Number.NaN;
    const supportCorrectionResolved =
      supportCorrectionApplied &&
      Number.isFinite(supportCorrectionResidualGapY) &&
      Math.abs(supportCorrectionResidualGapY) <= 0.004;

    if (supportCorrectionApplied) {
      const supportCorrectionEntry = {
        objectId: entry?.objectId ?? "",
        sourceId: entry?.sourceId ?? "",
        templateId: entry?.templateId ?? "",
        modelResRef: entry?.payloadModelResRef ?? "",
        offsetY: roundRuntimeNumber(supportCorrection.offsetY ?? 0),
        objectBottomY: roundRuntimeNumber(supportCorrection.objectBottomY ?? 0),
        afterBottomY: roundRuntimeNumber(supportCorrection.afterBottomY ?? 0),
        supportObjectId: supportCorrection.supportObjectId ?? "",
        supportModelResRef: supportCorrection.supportModelResRef ?? "",
        supportTopY: roundRuntimeNumber(supportCorrection.supportTopY ?? 0),
        gapY: roundRuntimeNumber(supportCorrection.gapY ?? 0),
        residualGapY: roundRuntimeNumber(supportCorrectionResidualGapY),
        overlapRatio: roundRuntimeNumber(supportCorrection.overlapRatio ?? 0),
        screenCenter: entry?.screenCenter ?? null
      };
      supportCorrections.push(supportCorrectionEntry);
      if (supportCorrectionResolved) {
        resolvedBySupportCorrection.push(supportCorrectionEntry);
      }
    }

    const sourceZDeltaY = Number(supportSurface.sourceZDeltaY ?? 0);
    const gapY = Number(supportSurface.gapY ?? 0);
    const sourceZ = Number(supportSurface.sourceZ ?? 0);
    const objectBottomY = Number(supportSurface.objectBottomY ?? NaN);
    const objectFootprintArea = Number(supportSurface.objectFootprintArea ?? NaN);
    const overlapArea = Number(supportSurface.overlapArea ?? NaN);
    const overlapRatio =
      Number.isFinite(objectFootprintArea) && objectFootprintArea > 0 &&
      Number.isFinite(overlapArea)
        ? overlapArea / Math.max(objectFootprintArea, 0.000001)
        : 0;
    const localMinY = Number(modelSurface.beforeMinY ?? NaN);
    const objectBottomSourceDeltaY =
      Number.isFinite(objectBottomY) && Number.isFinite(sourceZ)
        ? objectBottomY - sourceZ
        : Number.NaN;
    const objectBottomMatchesSourceZ =
      Number.isFinite(objectBottomY) &&
      Number.isFinite(sourceZ) &&
      Math.abs(objectBottomY - sourceZ) <= 0.004;
    const isSourceZConsistentFloating =
      status === "hit" &&
      gapY > 0.02 &&
      objectBottomMatchesSourceZ &&
      !supportCorrectionResolved;
    const hasNumericIssue =
      Number.isFinite(gapY) && Math.abs(gapY) > 0.02;
    const hasActionableOverlap =
      overlapRatio >= AREA_SUPPORT_SURFACE_MIN_ACTIONABLE_OVERLAP_RATIO;
    const isSourceZConsistentSupportOverlap =
      status === "hit" &&
      gapY < -0.01 &&
      objectBottomMatchesSourceZ &&
      hasActionableOverlap &&
      !supportCorrectionResolved;
    const isPartialOverlapSideContact =
      status === "hit" &&
      hasNumericIssue &&
      !supportCorrectionResolved &&
      !isSourceZConsistentFloating &&
      !isSourceZConsistentSupportOverlap &&
      !hasActionableOverlap;
    const isModelOriginElevated =
      status === "hit" &&
      gapY > 0.02 &&
      !isSourceZConsistentFloating &&
      !isSourceZConsistentSupportOverlap &&
      Number.isFinite(localMinY) &&
      Number.isFinite(objectBottomSourceDeltaY) &&
      localMinY > 0.02 &&
      Math.abs(objectBottomSourceDeltaY - localMinY) <= 0.004 &&
      !supportCorrectionResolved;
    if (isSourceZConsistentFloating) {
      sourceZConsistentFloating.push({
        objectId: entry?.objectId ?? "",
        sourceId: entry?.sourceId ?? "",
        templateId: entry?.templateId ?? "",
        modelResRef: entry?.payloadModelResRef ?? "",
        liftTarget: modelSurface.liftTarget ?? "",
        overlayReason: modelSurface.overlayReason ?? "",
        sourceZ: roundRuntimeNumber(sourceZ),
        objectBottomY: roundRuntimeNumber(objectBottomY),
        supportObjectId: supportSurface.supportObjectId ?? "",
        supportModelResRef: supportSurface.supportModelResRef ?? "",
        supportLiftTarget: supportSurface.supportLiftTarget ?? "",
        supportOverlayReason: supportSurface.supportOverlayReason ?? "",
        supportTopY: roundRuntimeNumber(supportSurface.supportTopY ?? 0),
        sourceZDeltaY: roundRuntimeNumber(sourceZDeltaY),
        gapY: roundRuntimeNumber(gapY),
        overlapRatio: roundRuntimeNumber(overlapRatio),
        confidence,
        supportCorrectionStatus,
        classification: "source-z-consistent-floating",
        screenCenter: entry?.screenCenter ?? null
      });
    }
    if (isSourceZConsistentSupportOverlap) {
      sourceZConsistentSupportOverlap.push({
        objectId: entry?.objectId ?? "",
        sourceId: entry?.sourceId ?? "",
        templateId: entry?.templateId ?? "",
        modelResRef: entry?.payloadModelResRef ?? "",
        liftTarget: modelSurface.liftTarget ?? "",
        overlayReason: modelSurface.overlayReason ?? "",
        sourceZ: roundRuntimeNumber(sourceZ),
        objectBottomY: roundRuntimeNumber(objectBottomY),
        supportObjectId: supportSurface.supportObjectId ?? "",
        supportModelResRef: supportSurface.supportModelResRef ?? "",
        supportLiftTarget: supportSurface.supportLiftTarget ?? "",
        supportOverlayReason: supportSurface.supportOverlayReason ?? "",
        supportTopY: roundRuntimeNumber(supportSurface.supportTopY ?? 0),
        sourceZDeltaY: roundRuntimeNumber(sourceZDeltaY),
        gapY: roundRuntimeNumber(gapY),
        overlapRatio: roundRuntimeNumber(overlapRatio),
        confidence,
        supportCorrectionStatus,
        classification: "source-z-consistent-support-overlap",
        screenCenter: entry?.screenCenter ?? null
      });
    }
    if (isPartialOverlapSideContact) {
      partialOverlapSideContact.push({
        objectId: entry?.objectId ?? "",
        sourceId: entry?.sourceId ?? "",
        templateId: entry?.templateId ?? "",
        modelResRef: entry?.payloadModelResRef ?? "",
        liftTarget: modelSurface.liftTarget ?? "",
        overlayReason: modelSurface.overlayReason ?? "",
        sourceZ: roundRuntimeNumber(sourceZ),
        objectBottomY: roundRuntimeNumber(objectBottomY),
        supportObjectId: supportSurface.supportObjectId ?? "",
        supportModelResRef: supportSurface.supportModelResRef ?? "",
        supportLiftTarget: supportSurface.supportLiftTarget ?? "",
        supportOverlayReason: supportSurface.supportOverlayReason ?? "",
        supportTopY: roundRuntimeNumber(supportSurface.supportTopY ?? 0),
        sourceZDeltaY: roundRuntimeNumber(sourceZDeltaY),
        gapY: roundRuntimeNumber(gapY),
        overlapRatio: roundRuntimeNumber(overlapRatio),
        confidence,
        supportCorrectionStatus,
        classification: "partial-overlap-side-contact",
        screenCenter: entry?.screenCenter ?? null
      });
    }
    if (isModelOriginElevated && !isPartialOverlapSideContact) {
      modelOriginElevated.push({
        objectId: entry?.objectId ?? "",
        sourceId: entry?.sourceId ?? "",
        templateId: entry?.templateId ?? "",
        modelResRef: entry?.payloadModelResRef ?? "",
        liftTarget: modelSurface.liftTarget ?? "",
        overlayReason: modelSurface.overlayReason ?? "",
        sourceZ: roundRuntimeNumber(sourceZ),
        objectBottomY: roundRuntimeNumber(objectBottomY),
        localMinY: roundRuntimeNumber(localMinY),
        objectBottomSourceDeltaY: roundRuntimeNumber(objectBottomSourceDeltaY),
        supportObjectId: supportSurface.supportObjectId ?? "",
        supportModelResRef: supportSurface.supportModelResRef ?? "",
        supportLiftTarget: supportSurface.supportLiftTarget ?? "",
        supportOverlayReason: supportSurface.supportOverlayReason ?? "",
        supportTopY: roundRuntimeNumber(supportSurface.supportTopY ?? 0),
        sourceZDeltaY: roundRuntimeNumber(sourceZDeltaY),
        gapY: roundRuntimeNumber(gapY),
        overlapRatio: roundRuntimeNumber(overlapRatio),
        confidence,
        supportCorrectionStatus,
        classification: "model-origin-elevated",
        screenCenter: entry?.screenCenter ?? null
      });
    }
    if (
      status === "hit" &&
      !supportCorrectionResolved &&
      !isSourceZConsistentFloating &&
      !isSourceZConsistentSupportOverlap &&
      !isPartialOverlapSideContact &&
      !isModelOriginElevated &&
      hasActionableOverlap &&
      hasNumericIssue
    ) {
      issues.push({
        objectId: entry?.objectId ?? "",
        sourceId: entry?.sourceId ?? "",
        templateId: entry?.templateId ?? "",
        modelResRef: entry?.payloadModelResRef ?? "",
        liftTarget: modelSurface.liftTarget ?? "",
        overlayReason: modelSurface.overlayReason ?? "",
        sourceZ: roundRuntimeNumber(supportSurface.sourceZ ?? 0),
        objectBottomY: roundRuntimeNumber(supportSurface.objectBottomY ?? 0),
        objectTopY: roundRuntimeNumber(supportSurface.objectTopY ?? 0),
        supportObjectId: supportSurface.supportObjectId ?? "",
        supportModelResRef: supportSurface.supportModelResRef ?? "",
        supportLiftTarget: supportSurface.supportLiftTarget ?? "",
        supportOverlayReason: supportSurface.supportOverlayReason ?? "",
        supportTopY: roundRuntimeNumber(supportSurface.supportTopY ?? 0),
        sourceZDeltaY: roundRuntimeNumber(sourceZDeltaY),
        gapY: roundRuntimeNumber(gapY),
        overlapRatio: roundRuntimeNumber(overlapRatio),
        confidence,
        supportCorrectionStatus,
        supportCorrectionApplied,
        resolvedBySupportCorrection: false,
        screenCenter: entry?.screenCenter ?? null
      });
    }
  }
  issues.sort(
    (left, right) =>
      Math.abs(right.sourceZDeltaY) - Math.abs(left.sourceZDeltaY) ||
      Math.abs(right.gapY) - Math.abs(left.gapY)
  );
  supportCorrections.sort(
    (left, right) =>
      Math.abs(right.offsetY) - Math.abs(left.offsetY) ||
      right.overlapRatio - left.overlapRatio
  );
  return {
    version: "aurora-area-object-support-surface-summary/v1",
    areaLoadEvidence: buildAreaObjectSupportAreaLoadEvidence(snapshot, context),
    entryCount: entries.length,
    statusCounts,
    confidenceCounts,
    liftTargetCounts,
    terrainSurfaceStatusCounts,
    supportCorrectionStatusCounts,
    supportCorrectionCount: supportCorrections.length,
    supportCorrectionSample: supportCorrections.slice(0, sampleLimit),
    resolvedBySupportCorrectionCount: resolvedBySupportCorrection.length,
    resolvedBySupportCorrectionSample: resolvedBySupportCorrection.slice(0, sampleLimit),
    sourceZConsistentFloatingCount: sourceZConsistentFloating.length,
    sourceZConsistentFloatingSample: sourceZConsistentFloating.slice(0, sampleLimit),
    sourceZConsistentSupportOverlapCount: sourceZConsistentSupportOverlap.length,
    sourceZConsistentSupportOverlapSample: sourceZConsistentSupportOverlap.slice(0, sampleLimit),
    partialOverlapSideContactCount: partialOverlapSideContact.length,
    partialOverlapSideContactSample: partialOverlapSideContact.slice(0, sampleLimit),
    modelOriginElevatedCount: modelOriginElevated.length,
    modelOriginElevatedSample: modelOriginElevated.slice(0, sampleLimit),
    issueCount: issues.length,
    issueSample: issues.slice(0, sampleLimit)
  };
}

function buildAreaObjectSupportAreaLoadEvidence(snapshot, context = {}) {
  const domStatus = context.domStatus ?? {};
  const expectedArea =
    context.expectedArea ?? context.openedArea?.expectedArea ?? context.openedArea?.areaExpectation ?? null;
  const openedArea = context.openedArea ?? null;
  const expectedAreaId =
    expectedArea?.areaId ??
    openedArea?.expectedArea?.areaId ??
    openedArea?.areaExpectation?.areaId ??
    domStatus.runtimeFreshness?.expectedAreaId ??
    null;
  const canvasSceneId =
    domStatus.canvasSceneDataset?.sceneId ??
    domStatus.externalSceneSeedDataset?.sceneId ??
    null;
  const terrainAreaId =
    domStatus.terrainTileModelSnapshot?.areaId ??
    domStatus.terrainTileModelDataset?.areaId ??
    domStatus.areaTerrainAreaId ??
    null;
  const sharedRendererStatus =
    snapshot?.status ??
    domStatus.areaObjectRuntimeDataset?.sharedRendererStatus ??
    null;
  const payloadBoundCount = Number(
    snapshot?.payloadBoundCount ??
      domStatus.areaObjectRuntimeDataset?.sharedRendererPayloadBoundCount ??
      0
  );
  const modelReadyCount = Number(
    snapshot?.modelReadyCount ??
      domStatus.areaObjectRuntimeDataset?.sharedRendererModelReadyCount ??
      0
  );
  const primitiveFallbackCount = Number(
    snapshot?.primitiveFallbackCount ??
      domStatus.areaObjectRuntimeDataset?.sharedRendererPrimitiveFallbackCount ??
      0
  );
  const textureStatusCounts =
    snapshot?.textureStatusCounts ??
    parseJsonOrNull(domStatus.areaObjectRuntimeDataset?.sharedRendererTextureStatusCounts) ??
    {};
  const runtimeFreshness = domStatus.runtimeFreshness ?? null;
  const sceneMatchesExpected =
    !expectedAreaId ||
    canvasSceneId === expectedAreaId ||
    terrainAreaId === expectedAreaId;
  return {
    ok:
      runtimeFreshness?.ok === true &&
      sceneMatchesExpected &&
      sharedRendererStatus === "ready" &&
      Number.isFinite(modelReadyCount) &&
      modelReadyCount > 0,
    expectedAreaId,
    openedAreaId:
      openedArea?.rowInfo?.areaId ??
      openedArea?.areaExpectation?.areaId ??
      openedArea?.expectedArea?.areaId ??
      null,
    canvasSceneId,
    terrainAreaId,
    openedAreaText: openedArea?.areaText ?? domStatus.openedAreaText ?? null,
    runtimeFreshnessOk: runtimeFreshness?.ok === true,
    runtimeFreshnessFailed: Array.isArray(runtimeFreshness?.failed)
      ? runtimeFreshness.failed
      : [],
    sharedRendererStatus,
    payloadBoundCount: Number.isFinite(payloadBoundCount) ? payloadBoundCount : 0,
    modelReadyCount: Number.isFinite(modelReadyCount) ? modelReadyCount : 0,
    primitiveFallbackCount: Number.isFinite(primitiveFallbackCount)
      ? primitiveFallbackCount
      : 0,
    textureStatusCounts
  };
}

function roundRuntimeNumber(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Number(numericValue.toFixed(6)) : 0;
}

function parseJsonOrNull(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function summarizeNetworkCaptureSummaryForConsole(summary) {
  if (!summary) {
    return null;
  }
  return {
    version: summary.version ?? null,
    observedRequestCount: summary.observedRequestCount ?? null,
    firstErrorReason: summary.firstErrorReason ?? null,
    groups: {
      placeableRenderPayloadBatch: summarizeNetworkGroupForConsole(
        summary.groups?.placeableRenderPayloadBatch
      ),
      placeableRenderPayloadSingle: summarizeNetworkGroupForConsole(
        summary.groups?.placeableRenderPayloadSingle
      ),
      placeableProcessBatch: summarizeNetworkGroupForConsole(
        summary.groups?.placeableProcessBatch
      ),
      placeableAssetContractsBatch: summarizeNetworkGroupForConsole(
        summary.groups?.placeableAssetContractsBatch
      ),
      placeableAssetContractsSingle: summarizeNetworkGroupForConsole(
        summary.groups?.placeableAssetContractsSingle
      ),
      placeableAssetDelivery: summarizeNetworkGroupForConsole(
        summary.groups?.placeableAssetDelivery
      ),
      creatureProcess: summarizeNetworkGroupForConsole(
        summary.groups?.creatureProcess
      )
    }
  };
}

function summarizeNetworkCaptureCountsForConsole(summary) {
  if (!summary) {
    return null;
  }
  return {
    observedRequestCount: summary.observedRequestCount ?? null,
    firstErrorReason: summary.firstErrorReason ?? null,
    groups: {
      placeableRenderPayloadBatch: summarizeNetworkGroupCountsForConsole(
        summary.groups?.placeableRenderPayloadBatch
      ),
      placeableRenderPayloadSingle: summarizeNetworkGroupCountsForConsole(
        summary.groups?.placeableRenderPayloadSingle
      ),
      placeableProcessBatch: summarizeNetworkGroupCountsForConsole(
        summary.groups?.placeableProcessBatch
      ),
      placeableAssetContractsBatch: summarizeNetworkGroupCountsForConsole(
        summary.groups?.placeableAssetContractsBatch
      ),
      placeableAssetContractsSingle: summarizeNetworkGroupCountsForConsole(
        summary.groups?.placeableAssetContractsSingle
      ),
      placeableAssetDelivery: summarizeNetworkGroupCountsForConsole(
        summary.groups?.placeableAssetDelivery
      ),
      creatureProcess: summarizeNetworkGroupCountsForConsole(
        summary.groups?.creatureProcess
      )
    }
  };
}

function summarizeNetworkGroupCountsForConsole(group) {
  if (!group) {
    return null;
  }
  return {
    requestCount: group.requestCount ?? 0,
    requestedItemCount: group.requestedItemCount ?? 0,
    responseCount: group.responseCount ?? 0,
    failedRequestCount: group.failedRequestCount ?? 0,
    inFlightRequestCount: group.inFlightRequestCount ?? 0,
    inFlightRequestedItemCount: group.inFlightRequestedItemCount ?? 0,
    oldestInFlightAgeMs: group.oldestInFlightAgeMs ?? null
  };
}

function summarizeNetworkGroupForConsole(group) {
  if (!group) {
    return null;
  }
  return {
    requestCount: group.requestCount ?? 0,
    requestedItemCount: group.requestedItemCount ?? 0,
    responseCount: group.responseCount ?? 0,
    responseStatusCounts: group.responseStatusCounts ?? {},
    responseItemCount: group.responseItemCount ?? 0,
    failedRequestCount: group.failedRequestCount ?? 0,
    inFlightRequestCount: group.inFlightRequestCount ?? 0,
    inFlightRequestedItemCount: group.inFlightRequestedItemCount ?? 0,
    oldestInFlightAgeMs: group.oldestInFlightAgeMs ?? null,
    responsePayloadCounts: group.responsePayloadCounts ?? null,
    requestItemSample: Array.isArray(group.requestItemSample)
      ? group.requestItemSample.slice(0, DEFAULT_NETWORK_REQUEST_ITEM_SAMPLE_LIMIT)
      : []
  };
}

function summarizeAreaForConsole(area) {
  if (!area) {
    return null;
  }
  return {
    areaId: area.areaId ?? null,
    name: area.name ?? null,
    width: area.width ?? null,
    height: area.height ?? null,
    objectCounts: area.objectCounts ?? null,
    updatedAt: area.updatedAt ?? null
  };
}

function summarizeOpenedAreaForConsole(openedArea) {
  if (!openedArea) {
    return null;
  }
  return {
    ok: openedArea.ok ?? null,
    areaText: openedArea.areaText ?? null,
    rowTitle: openedArea.rowInfo?.title ?? null,
    areaExpectation: openedArea.areaExpectation ?? null,
    query: openedArea.query ?? null,
    runtimeDatasetCleared: openedArea.runtimeDatasetCleared ?? null
  };
}

function summarizeDomStatusForConsole(status) {
  if (!status) {
    return null;
  }
  return {
    href: status.href ?? null,
    routePath: status.routePath ?? null,
    canvasPresent: status.canvasPresent ?? null,
    canvasRect: status.canvasRect ?? null,
    externalSceneSeedDataset: status.externalSceneSeedDataset ?? null,
    canvasSceneDataset: status.canvasSceneDataset ?? null,
    areaTerrainAreaId: status.areaTerrainAreaId ?? null,
    areaTerrainExtentFootprintSize: status.areaTerrainExtentFootprintSize ?? null,
    terrainRuntimeStatus: status.terrainRuntimeStatus ?? null,
    tileProcessRuntimeStatus: status.tileProcessRuntimeStatus ?? null,
    visualBlockers: Array.isArray(status.visualBlockers)
      ? status.visualBlockers.slice(0, 4)
      : null,
    runtimeFreshness: status.runtimeFreshness
      ? {
          ok: status.runtimeFreshness.ok,
          expectedAreaId: status.runtimeFreshness.expectedAreaId,
          failed: status.runtimeFreshness.failed
        }
      : null,
    terrainTileModelDataset: summarizeTerrainDatasetForConsole(
      status.terrainTileModelDataset
    ),
    tileProcessRuntimeDataset: summarizeTileProcessDatasetForConsole(
      status.tileProcessRuntimeDataset
    ),
    areaObjectRuntimeDataset: summarizeAreaObjectDatasetForConsole(
      status.areaObjectRuntimeDataset
    ),
    placeableModelLoadQueueDataset: summarizePlaceableModelLoadQueueDatasetForConsole(
      status.placeableModelLoadQueueDataset
    ),
    captureWaitElapsedMs: status.captureWaitElapsedMs ?? null
  };
}

function summarizeTerrainDatasetForConsole(dataset) {
  if (!dataset) {
    return null;
  }
  return {
    loaderPath: dataset.loaderPath ?? null,
    areaId: dataset.areaId ?? null,
    extentFootprintSize: dataset.extentFootprintSize ?? null,
    contractTileCount: dataset.contractTileCount ?? null,
    pendingCount: dataset.pendingCount ?? null,
    loadedCount: dataset.loadedCount ?? null,
    failedCount: dataset.failedCount ?? null,
    blockedCount: dataset.blockedCount ?? null,
    blockedTileSample: dataset.blockedTileSample ?? null,
    loaderErrorSample: dataset.loaderErrorSample ?? null
  };
}

function summarizeTileProcessDatasetForConsole(dataset) {
  if (!dataset) {
    return null;
  }
  return {
    areaId: dataset.areaId ?? null,
    checkedCount: dataset.checkedCount ?? null,
    readyCount: dataset.readyCount ?? null,
    blockedCount: dataset.blockedCount ?? null,
    blockers: dataset.blockers ?? null,
    renderAssetContractBlockers: dataset.renderAssetContractBlockers ?? null
  };
}

function summarizeAreaObjectDatasetForConsole(dataset) {
  if (!dataset) {
    return null;
  }
  return {
    source: dataset.source ?? null,
    sourceStatus: dataset.sourceStatus ?? null,
    visibleCount: dataset.visibleCount ?? null,
    auroraGitCount: dataset.auroraGitCount ?? null,
    fallbackCount: dataset.fallbackCount ?? null,
    placeableCount: dataset.placeableCount ?? null,
    doorCount: dataset.doorCount ?? null,
    backendRenderContractStatus: dataset.backendRenderContractStatus ?? null,
    backendRenderContractTotal: dataset.backendRenderContractTotal ?? null,
    backendRenderPayloadReadyCount: dataset.backendRenderPayloadReadyCount ?? null,
    backendRenderModelUrlReadyCount: dataset.backendRenderModelUrlReadyCount ?? null,
    backendRenderBlockedCount: dataset.backendRenderBlockedCount ?? null,
    sharedRendererStatus: dataset.sharedRendererStatus ?? null,
    sharedRendererPayloadBoundCount: dataset.sharedRendererPayloadBoundCount ?? null,
    sharedRendererModelReadyCount: dataset.sharedRendererModelReadyCount ?? null,
    sharedRendererUniqueModelUrlCount:
      dataset.sharedRendererUniqueModelUrlCount ?? null,
    sharedRendererUniqueModelCacheKeyCount:
      dataset.sharedRendererUniqueModelCacheKeyCount ?? null,
    sharedRendererPrimitiveFallbackCount:
      dataset.sharedRendererPrimitiveFallbackCount ?? null,
    sharedRendererPrimitiveFallbackSuppressedCount:
      dataset.sharedRendererPrimitiveFallbackSuppressedCount ?? null,
    sharedRendererMissingPayloadCount: splitRuntimeIdList(
      dataset.sharedRendererMissingPayloadIds
    ).length,
    sharedRendererModelLoadFailedCount: splitRuntimeIdList(
      dataset.sharedRendererModelLoadFailedIds
    ).length,
    sharedRendererTextureStatusCounts:
      parseJsonObject(dataset.sharedRendererTextureStatusCounts) ?? null,
    sharedRendererTexturePendingCount: splitRuntimeIdList(
      dataset.sharedRendererTexturePendingIds
    ).length,
    sharedRendererTextureIssueCount: splitRuntimeIdList(
      dataset.sharedRendererTextureIssueIds
    ).length,
    sharedRendererTextureMissingCount: splitRuntimeIdList(
      dataset.sharedRendererTextureMissingIds
    ).length,
    sharedRendererTextureFallbackCount: splitRuntimeIdList(
      dataset.sharedRendererTextureFallbackIds
    ).length,
    sharedRendererTextureSkippedCount: splitRuntimeIdList(
      dataset.sharedRendererTextureSkippedIds
    ).length,
    sharedRendererModelLoadFailedModelUrlsSample: splitRuntimeIdList(
      dataset.sharedRendererModelLoadFailedModelUrls
    ).slice(0, 3),
    sharedRendererModelLoadFailedModelCacheKeysSample: splitRuntimeIdList(
      dataset.sharedRendererModelLoadFailedModelCacheKeys
    ).slice(0, 3)
  };
}

function summarizePlaceableModelLoadQueueDatasetForConsole(dataset) {
  if (!dataset) {
    return null;
  }
  return {
    concurrencyLimit: dataset.concurrencyLimit ?? null,
    startsPerFrameLimit: dataset.startsPerFrameLimit ?? null,
    activeCount: dataset.activeCount ?? null,
    pendingCount: dataset.pendingCount ?? null,
    completedCount: dataset.completedCount ?? null,
    totalCount: dataset.totalCount ?? null,
    current: dataset.current ?? null
  };
}

function summarizeRuntimeEnvironmentPreflight(preflight) {
  if (!preflight) {
    return null;
  }
  return {
    status: preflight.status,
    frontend: Array.isArray(preflight.frontend)
      ? preflight.frontend.map(summarizeEndpointProbe)
      : null,
    backendProxyHealth: summarizeEndpointProbe(preflight.backendProxyHealth),
    backendDirectHealth: summarizeEndpointProbe(preflight.backendDirectHealth)
  };
}

function summarizeEndpointProbe(probe) {
  if (!probe) {
    return null;
  }
  return {
    ok: Boolean(probe.ok),
    label: probe.label ?? null,
    endpoint: probe.endpoint ?? null,
    port: probe.port ?? null,
    method: probe.method ?? null,
    elapsedMs: probe.elapsedMs ?? null,
    status: probe.status ?? null,
    cause: probe.cause ?? null,
    parseError: probe.parseError ?? null
  };
}

function buildRuntimeActionabilitySummary({
  domStatus,
  expectedAreaDetail,
  networkCaptureSummary,
  sampleLimit
}) {
  if (!domStatus) {
    return null;
  }
  const limit = normalizeSampleLimit(sampleLimit);
  const sharedRenderer = buildSharedRendererActionabilitySummary(
    domStatus,
    expectedAreaDetail,
    limit
  );
  const queue = parseQueueOverlaySummary(domStatus.visualBlockers);
  const modelLoadQueue = buildModelLoadQueueActionabilitySummary(domStatus);
  const firstMissingObjects = resolveFirstMissingObjects({
    ids: sharedRenderer.missingPayloadIdsSample,
    expectedAreaDetail,
    sampleLimit: limit
  });
  const areaObjectCounts = buildAreaObjectSourceCounts(expectedAreaDetail);
  const queueRequestCounts = buildQueueRequestCounts(queue, networkCaptureSummary);
  const payloadResponseCounts = buildPayloadResponseCounts(networkCaptureSummary);
  const terrainOnlyCapture = isTerrainOnlyRuntimeCaptureStatus(domStatus);
  const firstErrorReason = terrainOnlyCapture
    ? null
    : resolveActionabilityFirstErrorReason({
        sharedRenderer,
        queue,
        networkCaptureSummary
      });
  return {
    version: "aurora-areas-runtime-actionability-summary/v1",
    status: terrainOnlyCapture
      ? "skipped_terrain_only"
      : sharedRenderer.missingPayloadCount > 0
        ? "blocked"
        : sharedRenderer.status,
    sampleLimit: limit,
    skippedReason: terrainOnlyCapture ? "terrain_only_runtime_capture" : null,
    sharedRenderer,
    areaObjectCounts,
    firstMissingObjects: terrainOnlyCapture ? [] : firstMissingObjects,
    queue,
    modelLoadQueue,
    queueRequestCounts,
    payloadResponseCounts,
    firstErrorReason,
    network: networkCaptureSummary
  };
}

function buildSharedRendererActionabilitySummary(domStatus, expectedAreaDetail, sampleLimit) {
  const snapshot = domStatus.areaObjectSharedRendererSnapshot ?? {};
  const dataset = domStatus.areaObjectRuntimeDataset ?? {};
  const missingPayloadIds = firstNonEmptyIdList(
    snapshot.missingPayloadIds,
    dataset.sharedRendererMissingPayloadIds
  );
  const blockedIds = firstNonEmptyIdList(
    snapshot.blockedIds,
    dataset.backendRenderBlockedIds
  );
  const primitiveFallbackIds = firstNonEmptyIdList(
    snapshot.primitiveFallbackIds,
    dataset.primitiveFallbackIds
  );
  const texturePendingIds = firstNonEmptyIdList(
    snapshot.texturePendingIds,
    dataset.sharedRendererTexturePendingIds
  );
  const textureIssueIds = firstNonEmptyIdList(
    snapshot.textureIssueIds,
    dataset.sharedRendererTextureIssueIds
  );
  const textureMissingIds = firstNonEmptyIdList(
    snapshot.textureMissingIds,
    dataset.sharedRendererTextureMissingIds
  );
  const textureFallbackIds = firstNonEmptyIdList(
    snapshot.textureFallbackIds,
    dataset.sharedRendererTextureFallbackIds
  );
  const textureSkippedIds = firstNonEmptyIdList(
    snapshot.textureSkippedIds,
    dataset.sharedRendererTextureSkippedIds
  );
  const modelLoadFailedModelUrls = firstNonEmptyIdList(
    snapshot.modelLoadFailedModelUrls,
    dataset.sharedRendererModelLoadFailedModelUrls
  );
  const modelLoadFailedModelCacheKeys = firstNonEmptyIdList(
    snapshot.modelLoadFailedModelCacheKeys,
    dataset.sharedRendererModelLoadFailedModelCacheKeys
  );
  return {
    version: snapshot.version ?? null,
    path: snapshot.path ?? dataset.sharedRendererPath ?? null,
    status: snapshot.status ?? dataset.sharedRendererStatus ?? null,
    placeholderStatus: snapshot.placeholderStatus ?? null,
    total: numberOrNull(snapshot.total ?? dataset.backendRenderContractTotal ?? dataset.visibleCount),
    backendRenderContractStatus: dataset.backendRenderContractStatus ?? null,
    backendRenderPayloadReadyCount: numberOrNull(dataset.backendRenderPayloadReadyCount),
    backendRenderModelUrlReadyCount: numberOrNull(dataset.backendRenderModelUrlReadyCount),
    renderedModelUrlCount: numberOrNull(
      dataset.backendRenderModelUrlReadyCount ??
        snapshot.renderedModelUrlCount ??
        snapshot.modelReadyCount ??
        dataset.sharedRendererModelReadyCount
    ),
    backendRenderBlockedCount: numberOrNull(dataset.backendRenderBlockedCount),
    payloadBoundCount: numberOrNull(
      snapshot.payloadBoundCount ?? dataset.sharedRendererPayloadBoundCount
    ),
    modelReadyCount: numberOrNull(snapshot.modelReadyCount ?? dataset.sharedRendererModelReadyCount),
    primitiveFallbackCount: numberOrNull(
      snapshot.primitiveFallbackCount ?? dataset.sharedRendererPrimitiveFallbackCount
    ),
    primitiveFallbackRenderLimit: numberOrNull(
      snapshot.primitiveFallbackRenderLimit ??
        dataset.sharedRendererPrimitiveFallbackRenderLimit
    ),
    primitiveFallbackSuppressedCount: numberOrNull(
      snapshot.primitiveFallbackSuppressedCount ??
        dataset.sharedRendererPrimitiveFallbackSuppressedCount
    ),
    missingPayloadCount: missingPayloadIds.length,
    blockedCount: blockedIds.length,
    primitiveFallbackIdCount: primitiveFallbackIds.length,
    textureStatusCounts:
      snapshot.textureStatusCounts ?? parseJsonObject(dataset.sharedRendererTextureStatusCounts),
    texturePendingCount: texturePendingIds.length,
    textureIssueCount: textureIssueIds.length,
    textureMissingCount: textureMissingIds.length,
    textureFallbackCount: textureFallbackIds.length,
    textureSkippedCount: textureSkippedIds.length,
    placeholderReasonCounts: snapshot.placeholderReasonCounts ?? null,
    missingPayloadIdsSample: missingPayloadIds.slice(0, sampleLimit),
    blockedIdsSample: blockedIds.slice(0, sampleLimit),
    primitiveFallbackIdsSample: primitiveFallbackIds.slice(0, sampleLimit),
    texturePendingIdsSample: texturePendingIds.slice(0, sampleLimit),
    textureIssueIdsSample: textureIssueIds.slice(0, sampleLimit),
    textureMissingIdsSample: textureMissingIds.slice(0, sampleLimit),
    textureFallbackIdsSample: textureFallbackIds.slice(0, sampleLimit),
    textureSkippedIdsSample: textureSkippedIds.slice(0, sampleLimit),
    modelLoadFailedModelUrlsSample: modelLoadFailedModelUrls.slice(0, sampleLimit),
    modelLoadFailedModelCacheKeysSample: modelLoadFailedModelCacheKeys.slice(0, sampleLimit),
    visualTransform: buildSharedRendererVisualTransformSummary(
      snapshot,
      expectedAreaDetail,
      sampleLimit
    )
  };
}

function buildSharedRendererVisualTransformSummary(snapshot, expectedAreaDetail, sampleLimit) {
  const expectedObjects = Array.isArray(expectedAreaDetail?.objects)
    ? expectedAreaDetail.objects
    : [];
  const expectedWithVisualTransform = expectedObjects.filter((object) =>
    hasNonDefaultApiVisualTransform(object?.visualTransform)
  );
  const expectedBySourceId = new Map(
    expectedWithVisualTransform
      .filter((object) => object?.objectId)
      .map((object) => [String(object.objectId), object])
  );
  const objectVisualTransformEntries = Array.isArray(snapshot?.objectVisualTransformSample)
    ? snapshot.objectVisualTransformSample
    : [];
  const visualTransformEntries = Array.isArray(snapshot?.visualTransformSample)
    ? snapshot.visualTransformSample
    : [];
  const modelBoundsEntries = Array.isArray(snapshot?.modelBoundsSample)
    ? snapshot.modelBoundsSample
    : [];
  const runtimeEntries =
    objectVisualTransformEntries.length > 0
      ? objectVisualTransformEntries
      : visualTransformEntries.length > 0
        ? visualTransformEntries
        : modelBoundsEntries;
  const runtimeEvidenceSource =
    objectVisualTransformEntries.length > 0
      ? "object-visual-transform-sample"
      : visualTransformEntries.length > 0
        ? "shared-renderer-visual-transform-sample"
        : "model-bounds-sample";
  const runtimeBySourceId = new Map(
    runtimeEntries
      .filter((entry) => entry?.sourceId)
      .map((entry) => [String(entry.sourceId), entry])
  );
  const expectedRuntimeMatches = [];
  const missingRuntime = [];
  const notApplied = [];
  for (const expectedObject of expectedWithVisualTransform) {
    const sourceId = String(expectedObject.objectId ?? "");
    const runtimeEntry = runtimeBySourceId.get(sourceId);
    if (!runtimeEntry) {
      missingRuntime.push({
        sourceId,
        templateId: expectedObject.templateId ?? "",
        visualTransform: expectedObject.visualTransform ?? null
      });
      continue;
    }
    expectedRuntimeMatches.push(runtimeEntry);
    if (runtimeEntry.visualTransformApplied !== true) {
      notApplied.push({
        objectId: runtimeEntry.objectId ?? "",
        sourceId,
        templateId: runtimeEntry.templateId ?? expectedObject.templateId ?? "",
        expectedVisualTransform: expectedObject.visualTransform ?? null,
        runtimeVisualTransform: runtimeEntry.visualTransform ?? null,
        renderTransform: runtimeEntry.renderTransform ?? null
      });
    }
  }
  const unexpectedApplied = runtimeEntries.filter((entry) => {
    if (entry?.visualTransformApplied !== true) {
      return false;
    }
    const sourceId = String(entry.sourceId ?? "");
    return sourceId.length > 0 && !expectedBySourceId.has(sourceId);
  });

  return {
    version: "aurora-area-object-visual-transform-runtime/v1",
    expectedApiCount: expectedWithVisualTransform.length,
    runtimeRootCount: Number(snapshot?.objectVisualTransformRootCount ?? 0),
    runtimeAppliedCount: Number(snapshot?.objectVisualTransformAppliedCount ?? 0),
    runtimeSampleCount: runtimeEntries.length,
    runtimeEvidenceSource,
    runtimeMatchedExpectedCount: expectedRuntimeMatches.length,
    runtimeAppliedExpectedCount: expectedRuntimeMatches.filter(
      (entry) => entry.visualTransformApplied === true
    ).length,
    missingRuntimeCount: missingRuntime.length,
    notAppliedExpectedCount: notApplied.length,
    unexpectedAppliedCount: unexpectedApplied.length,
    expectedSample: expectedWithVisualTransform.slice(0, sampleLimit).map((object) => ({
      sourceId: object.objectId ?? "",
      templateId: object.templateId ?? "",
      visualTransform: object.visualTransform ?? null
    })),
    appliedSample: expectedRuntimeMatches
      .filter((entry) => entry.visualTransformApplied === true)
      .slice(0, sampleLimit)
      .map((entry) => ({
        objectId: entry.objectId ?? "",
        sourceId: entry.sourceId ?? "",
        templateId: entry.templateId ?? "",
        runtimeVisualTransform: entry.visualTransform ?? null,
        renderTransform: entry.renderTransform ?? null
      })),
    missingRuntimeSample: missingRuntime.slice(0, sampleLimit),
    notAppliedExpectedSample: notApplied.slice(0, sampleLimit),
    unexpectedAppliedSample: unexpectedApplied.slice(0, sampleLimit).map((entry) => ({
      objectId: entry.objectId ?? "",
      sourceId: entry.sourceId ?? "",
      templateId: entry.templateId ?? "",
      runtimeVisualTransform: entry.visualTransform ?? null
    }))
  };
}

function hasNonDefaultApiVisualTransform(transform) {
  if (!transform || typeof transform !== "object") {
    return false;
  }
  const scale = numberOrNull(transform.scale) ?? 1;
  const scaleX = numberOrNull(transform.scaleX) ?? scale;
  const scaleY = numberOrNull(transform.scaleY) ?? scale;
  const scaleZ = numberOrNull(transform.scaleZ) ?? scale;
  const offsetX = numberOrNull(transform.offsetX) ?? 0;
  const offsetY = numberOrNull(transform.offsetY) ?? 0;
  const offsetZ = numberOrNull(transform.offsetZ) ?? 0;
  const pitch = numberOrNull(transform.pitch) ?? 0;
  const yaw = numberOrNull(transform.yaw) ?? 0;
  const roll = numberOrNull(transform.roll) ?? 0;
  return (
    Math.abs(scaleX - 1) > 1e-6 ||
    Math.abs(scaleY - 1) > 1e-6 ||
    Math.abs(scaleZ - 1) > 1e-6 ||
    Math.abs(offsetX) > 1e-6 ||
    Math.abs(offsetY) > 1e-6 ||
    Math.abs(offsetZ) > 1e-6 ||
    Math.abs(pitch) > 1e-6 ||
    Math.abs(yaw) > 1e-6 ||
    Math.abs(roll) > 1e-6
  );
}

function buildModelLoadQueueActionabilitySummary(domStatus) {
  const dataset = domStatus.placeableModelLoadQueueDataset ?? {};
  const activeCount = numberOrNull(dataset.activeCount);
  const pendingCount = numberOrNull(dataset.pendingCount);
  const completedCount = numberOrNull(dataset.completedCount);
  const totalCount = numberOrNull(dataset.totalCount);
  const isLoading =
    countOrZero(activeCount) + countOrZero(pendingCount) > 0 ||
    (totalCount !== null && completedCount !== null && completedCount < totalCount);
  return {
    status: isLoading ? "loading" : "settled",
    concurrencyLimit: numberOrNull(dataset.concurrencyLimit),
    startsPerFrameLimit: numberOrNull(dataset.startsPerFrameLimit),
    peakConcurrencyLimit: numberOrNull(dataset.peakConcurrencyLimit),
    peakStartsPerFrameLimit: numberOrNull(dataset.peakStartsPerFrameLimit),
    peakActiveCount: numberOrNull(dataset.peakActiveCount),
    peakPendingCount: numberOrNull(dataset.peakPendingCount),
    peakTotalCount: numberOrNull(dataset.peakTotalCount),
    bulkModeActivated: dataset.bulkModeActivated ?? null,
    activeCount,
    pendingCount,
    completedCount,
    totalCount,
    current: dataset.current ?? null
  };
}

function resolveFirstMissingObjects({ ids, expectedAreaDetail, sampleLimit }) {
  const objectById = createAreaObjectIndex(expectedAreaDetail);
  return ids.slice(0, sampleLimit).map((objectId, index) => {
    const object = objectById.get(objectId);
    const inferred = inferObjectFactsFromObjectId(objectId);
    return {
      index,
      objectId,
      resRef: object?.resRef ?? inferred.resRef,
      resRefSource: object?.resRef ? "backend_area_detail" : inferred.resRefSource,
      templateId: object?.templateId ?? inferred.templateId,
      kind: object?.kind ?? inferred.kind,
      appearanceType: object?.appearanceType ?? null,
      genericType: object?.genericType ?? null,
      x: numberOrNull(object?.x),
      y: numberOrNull(object?.y),
      z: numberOrNull(object?.z),
      bearing: numberOrNull(object?.bearing)
    };
  });
}

function createAreaObjectIndex(expectedAreaDetail) {
  const objects = Array.isArray(expectedAreaDetail?.objects) ? expectedAreaDetail.objects : [];
  return new Map(
    objects
      .filter((object) => object?.objectId)
      .map((object) => [object.objectId, object])
  );
}

function summarizeExpectedAreaDetail(expectedAreaDetail) {
  if (!expectedAreaDetail) {
    return null;
  }
  return {
    status: expectedAreaDetail.status ?? null,
    endpoint: expectedAreaDetail.endpoint ?? null,
    areaId: expectedAreaDetail.areaId ?? null,
    name: expectedAreaDetail.name ?? null,
    objectCount: expectedAreaDetail.objectCount ?? null,
    blocker: expectedAreaDetail.blocker ?? null
  };
}

function buildAreaObjectSourceCounts(expectedAreaDetail) {
  const objects = Array.isArray(expectedAreaDetail?.objects) ? expectedAreaDetail.objects : [];
  const kindCounts = {};
  let userResRefLikeCount = 0;
  for (const object of objects) {
    const kind = object?.kind ?? "unknown";
    kindCounts[kind] = (kindCounts[kind] ?? 0) + 1;
    if (isUserLikeRuntimeIdentifier(object?.resRef, object?.templateId, object?.objectId)) {
      userResRefLikeCount += 1;
    }
  }
  return {
    source: expectedAreaDetail?.status ?? null,
    total: objects.length,
    kindCounts,
    userResRefLikeCount
  };
}

function parseQueueOverlaySummary(visualBlockers) {
  const blockers = Array.isArray(visualBlockers) ? visualBlockers : [];
  for (const blocker of blockers) {
    const text = String(blocker?.text ?? "");
    const match = text.match(/Loading\s+Area\s+PLC\/DOR\s+render\s+payloads\s*(\d+)\s*\/\s*(\d+)/iu);
    if (match) {
      const loaded = Number(match[1]);
      const total = Number(match[2]);
      return {
        source: blocker.selector ?? "visual_blocker",
        status: loaded >= total ? "complete" : "in_progress",
        loaded,
        total,
        remaining: Math.max(0, total - loaded),
        text: text.slice(0, 220)
      };
    }
  }
  return null;
}

function buildQueueRequestCounts(queue, networkCaptureSummary) {
  const groups = networkCaptureSummary?.groups ?? {};
  return {
    overlayLoaded: queue?.loaded ?? null,
    overlayTotal: queue?.total ?? null,
    overlayRemaining: queue?.remaining ?? null,
    areaProcessRequests: groups.areaProcess?.requestCount ?? 0,
    areaProcessInFlightRequests: groups.areaProcess?.inFlightRequestCount ?? 0,
    areaProcessOldestInFlightAgeMs: groups.areaProcess?.oldestInFlightAgeMs ?? null,
    tileProcessBatchRequests: groups.tileProcessBatch?.requestCount ?? 0,
    tileProcessBatchRequestedItems: groups.tileProcessBatch?.requestedItemCount ?? 0,
    tileProcessBatchInFlightRequests: groups.tileProcessBatch?.inFlightRequestCount ?? 0,
    tileProcessBatchOldestInFlightAgeMs:
      groups.tileProcessBatch?.oldestInFlightAgeMs ?? null,
    tileProcessRequests: groups.tileProcess?.requestCount ?? 0,
    tileProcessInFlightRequests: groups.tileProcess?.inFlightRequestCount ?? 0,
    tileProcessOldestInFlightAgeMs: groups.tileProcess?.oldestInFlightAgeMs ?? null,
    placeableRenderPayloadBatchRequests:
      groups.placeableRenderPayloadBatch?.requestCount ?? 0,
    placeableRenderPayloadBatchRequestedItems:
      groups.placeableRenderPayloadBatch?.requestedItemCount ?? 0,
    placeableRenderPayloadBatchInFlightRequests:
      groups.placeableRenderPayloadBatch?.inFlightRequestCount ?? 0,
    placeableRenderPayloadBatchInFlightRequestedItems:
      groups.placeableRenderPayloadBatch?.inFlightRequestedItemCount ?? 0,
    placeableRenderPayloadBatchOldestInFlightAgeMs:
      groups.placeableRenderPayloadBatch?.oldestInFlightAgeMs ?? null,
    placeableRenderPayloadSingleRequests:
      groups.placeableRenderPayloadSingle?.requestCount ?? 0,
    placeableRenderPayloadSingleInFlightRequests:
      groups.placeableRenderPayloadSingle?.inFlightRequestCount ?? 0,
    placeableRenderPayloadSingleOldestInFlightAgeMs:
      groups.placeableRenderPayloadSingle?.oldestInFlightAgeMs ?? null,
    placeableProcessBatchRequests: groups.placeableProcessBatch?.requestCount ?? 0,
    placeableProcessBatchRequestedItems:
      groups.placeableProcessBatch?.requestedItemCount ?? 0,
    placeableProcessBatchInFlightRequests:
      groups.placeableProcessBatch?.inFlightRequestCount ?? 0,
    placeableProcessBatchInFlightRequestedItems:
      groups.placeableProcessBatch?.inFlightRequestedItemCount ?? 0,
    placeableProcessBatchOldestInFlightAgeMs:
      groups.placeableProcessBatch?.oldestInFlightAgeMs ?? null,
    placeableAssetContractsBatchRequests:
      groups.placeableAssetContractsBatch?.requestCount ?? 0,
    placeableAssetContractsBatchRequestedItems:
      groups.placeableAssetContractsBatch?.requestedItemCount ?? 0,
    placeableAssetContractsBatchInFlightRequests:
      groups.placeableAssetContractsBatch?.inFlightRequestCount ?? 0,
    placeableAssetContractsBatchInFlightRequestedItems:
      groups.placeableAssetContractsBatch?.inFlightRequestedItemCount ?? 0,
    placeableAssetContractsBatchOldestInFlightAgeMs:
      groups.placeableAssetContractsBatch?.oldestInFlightAgeMs ?? null,
    placeableAssetContractsSingleRequests:
      groups.placeableAssetContractsSingle?.requestCount ?? 0,
    placeableAssetContractsSingleInFlightRequests:
      groups.placeableAssetContractsSingle?.inFlightRequestCount ?? 0,
    placeableAssetContractsSingleOldestInFlightAgeMs:
      groups.placeableAssetContractsSingle?.oldestInFlightAgeMs ?? null,
    placeableAssetDeliveryRequests:
      groups.placeableAssetDelivery?.requestCount ?? 0,
    placeableAssetDeliveryInFlightRequests:
      groups.placeableAssetDelivery?.inFlightRequestCount ?? 0,
    placeableAssetDeliveryOldestInFlightAgeMs:
      groups.placeableAssetDelivery?.oldestInFlightAgeMs ?? null,
    creatureProcessRequests: groups.creatureProcess?.requestCount ?? 0,
    creatureProcessRequestedItems: groups.creatureProcess?.requestedItemCount ?? 0,
    creatureProcessInFlightRequests: groups.creatureProcess?.inFlightRequestCount ?? 0,
    creatureProcessInFlightRequestedItems:
      groups.creatureProcess?.inFlightRequestedItemCount ?? 0,
    creatureProcessOldestInFlightAgeMs:
      groups.creatureProcess?.oldestInFlightAgeMs ?? null
  };
}

function buildPayloadResponseCounts(networkCaptureSummary) {
  const groups = networkCaptureSummary?.groups ?? {};
  const renderPayloadCounts =
    groups.placeableRenderPayloadBatch?.responsePayloadCounts ?? {};
  const processPayloadCounts = groups.placeableProcessBatch?.responsePayloadCounts ?? {};
  const effectivePayloadCounts =
    groups.placeableRenderPayloadBatch?.responseCount > 0
      ? renderPayloadCounts
      : processPayloadCounts;
  return {
    placeableRenderPayloadBatchResponses:
      groups.placeableRenderPayloadBatch?.responseCount ?? 0,
    placeableRenderPayloadBatchResponseItems:
      groups.placeableRenderPayloadBatch?.responseItemCount ?? 0,
    placeableRenderPayloadBatchFailedRequests:
      groups.placeableRenderPayloadBatch?.failedRequestCount ?? 0,
    placeableRenderPayloadSingleResponses:
      groups.placeableRenderPayloadSingle?.responseCount ?? 0,
    placeableRenderPayloadSingleFailedRequests:
      groups.placeableRenderPayloadSingle?.failedRequestCount ?? 0,
    placeableProcessBatchResponses: groups.placeableProcessBatch?.responseCount ?? 0,
    placeableProcessBatchResponseItems:
      groups.placeableProcessBatch?.responseItemCount ?? 0,
    placeableProcessBatchFailedRequests:
      groups.placeableProcessBatch?.failedRequestCount ?? 0,
    unsupportedCount: effectivePayloadCounts.renderPackageStatusCounts?.unsupported ?? 0,
    userResRefLikeCount: effectivePayloadCounts.userResRefLikeCount ?? 0,
    missingDerivedCount:
      effectivePayloadCounts.renderPackageStatusCounts?.missing_derived ?? 0,
    renderedModelUrlCount: effectivePayloadCounts.renderedModelUrlCount ?? 0,
    renderPackageStatusCounts: effectivePayloadCounts.renderPackageStatusCounts ?? {},
    placeableAssetContractsBatchResponses:
      groups.placeableAssetContractsBatch?.responseCount ?? 0,
    placeableAssetContractsBatchResponseItems:
      groups.placeableAssetContractsBatch?.responseItemCount ?? 0,
    placeableAssetContractsBatchFailedRequests:
      groups.placeableAssetContractsBatch?.failedRequestCount ?? 0,
    placeableAssetContractsSingleResponses:
      groups.placeableAssetContractsSingle?.responseCount ?? 0,
    placeableAssetContractsSingleFailedRequests:
      groups.placeableAssetContractsSingle?.failedRequestCount ?? 0,
    placeableAssetDeliveryResponses:
      groups.placeableAssetDelivery?.responseCount ?? 0,
    placeableAssetDeliveryFailedRequests:
      groups.placeableAssetDelivery?.failedRequestCount ?? 0,
    creatureProcessResponses: groups.creatureProcess?.responseCount ?? 0,
    creatureProcessResponseItems: groups.creatureProcess?.responseItemCount ?? 0,
    creatureProcessFailedRequests: groups.creatureProcess?.failedRequestCount ?? 0,
    creatureProcessRenderPackageStatusCounts:
      groups.creatureProcess?.responsePayloadCounts?.renderPackageStatusCounts ?? {},
    creatureProcessRenderedModelUrlCount:
      groups.creatureProcess?.responsePayloadCounts?.renderedModelUrlCount ?? 0
  };
}

function resolveActionabilityFirstErrorReason({
  sharedRenderer,
  queue,
  networkCaptureSummary
}) {
  if (networkCaptureSummary?.firstErrorReason) {
    return networkCaptureSummary.firstErrorReason;
  }
  if (queue && queue.remaining > 0) {
    return {
      code: "render_payload_queue_in_progress",
      summary: `Area PLC/DOR payload queue observed ${queue.loaded}/${queue.total}.`
    };
  }
  if (
    sharedRenderer.missingPayloadCount > 0 &&
    (networkCaptureSummary?.observedRequestCount ?? 0) === 0
  ) {
    return {
      code: "no_placeable_payload_requests_observed",
      summary: "Shared renderer is missing payloads, but CDP did not observe placeable payload requests."
    };
  }
  if (
    sharedRenderer.missingPayloadCount > 0 &&
    sharedRenderer.payloadBoundCount === 0
  ) {
    return {
      code: "payload_responses_not_bound_to_scene_objects",
      summary: "Placeable payload activity was observed, but no payloads are bound to shared renderer objects."
    };
  }
  return null;
}

function createNetworkCapture() {
  return {
    requests: new Map(),
    order: []
  };
}

function resetNetworkCapture(networkCapture) {
  networkCapture.requests.clear();
  networkCapture.order.length = 0;
}

async function createSameBrowserRestartSessionIdentity(send, marker) {
  const response = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const propertyName = "__auroraAreasSameBrowserRestartProofV1";
      if (Object.prototype.hasOwnProperty.call(window, propertyName)) {
        return {
          ok: false,
          reason: "same_browser_restart_session_marker_collision",
          marker: window[propertyName] ?? null,
          performanceTimeOrigin: window.performance.timeOrigin,
          href: window.location.href
        };
      }
      Object.defineProperty(window, propertyName, {
        value: ${JSON.stringify(marker)},
        writable: false,
        configurable: false,
        enumerable: false
      });
      return {
        ok: true,
        marker: window[propertyName],
        performanceTimeOrigin: window.performance.timeOrigin,
        href: window.location.href
      };
    })()`
  });
  const identity = response.result.value;
  if (identity?.ok !== true) {
    throw createBlockerError(
      identity?.reason ?? "same_browser_restart_session_marker_failed",
      "Could not bind the restart handoff to a fresh browser document marker.",
      { identity }
    );
  }
  return {
    marker: identity.marker,
    performanceTimeOrigin: identity.performanceTimeOrigin,
    href: identity.href
  };
}

async function readSameBrowserRestartSessionIdentity(send) {
  const response = await send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const propertyName = "__auroraAreasSameBrowserRestartProofV1";
      return {
        marker: Object.prototype.hasOwnProperty.call(window, propertyName)
          ? window[propertyName]
          : null,
        performanceTimeOrigin: window.performance.timeOrigin,
        href: window.location.href
      };
    })()`
  });
  return response.result.value;
}

function writeSameBrowserRestartReadyPacket({ readyPath, resumePath, packet }) {
  if (fs.existsSync(readyPath) || fs.existsSync(resumePath)) {
    throw createBlockerError(
      "same_browser_restart_handoff_path_not_fresh",
      "The restart handoff requires fresh ready/resume paths; a previous packet already exists.",
      {
        readyPath,
        readyPathExists: fs.existsSync(readyPath),
        resumePath,
        resumePathExists: fs.existsSync(resumePath)
      }
    );
  }
  const temporaryPath = `${readyPath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(packet, null, 2)}\n`, {
      encoding: "utf8",
      flag: "wx"
    });
    fs.renameSync(temporaryPath, readyPath);
  } finally {
    fs.rmSync(temporaryPath, { force: true });
  }
}

async function waitForSameBrowserRestartResumePacket({
  resumePath,
  challenge,
  readyAt,
  previousBackendProcessId,
  timeoutMs
}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (fs.existsSync(resumePath)) {
      try {
        const packet = JSON.parse(fs.readFileSync(resumePath, "utf8"));
        return validateSameBrowserRestartResumePacket(packet, {
          challenge,
          readyAt,
          previousBackendProcessId
        });
      } catch (error) {
        throw createBlockerError(
          "same_browser_restart_resume_packet_invalid",
          "The restart resume packet was present but failed exact validation.",
          {
            resumePath,
            cause: formatErrorForMessage(error)
          }
        );
      }
    }
    await sleep(100);
  }
  throw createBlockerError(
    "same_browser_restart_resume_timeout",
    "The browser remained open, but no fresh validated backend-restart resume packet arrived before the deadline.",
    {
      resumePath,
      timeoutMs,
      challenge
    }
  );
}

function recordNetworkEvent(networkCapture, message) {
  if (!message?.method?.startsWith("Network.")) {
    return;
  }
  const params = message.params ?? {};
  if (message.method === "Network.requestWillBeSent") {
    const request = params.request ?? {};
    if (String(request.method ?? "").toUpperCase() === "OPTIONS") {
      return;
    }
    const classification = classifyNetworkRequest(request.url);
    if (!classification) {
      return;
    }
    const postDataSummary = summarizeRequestPostData(request.postData);
    const entry = {
      requestId: params.requestId,
      group: classification.group,
      label: classification.label,
      url: request.url,
      method: request.method ?? null,
      startedTimestamp: params.timestamp ?? null,
      startedAtMs: Date.now(),
      postDataPayloadKeys: postDataSummary.payloadKeys,
      postDataItemCount: postDataSummary.itemCount,
      postDataItemSample: postDataSummary.itemSample,
      postDataItemSampleLimit: postDataSummary.sampleLimit,
      postDataParseError: postDataSummary.error,
      status: null,
      statusText: null,
      responseTimestamp: null,
      finishedTimestamp: null,
      failedTimestamp: null,
      encodedDataLength: null,
      responseItemCount: null,
      responsePayloadCounts: null,
      firstErrorReason: null,
      bodyParseError: null,
      responseBodyBytes: null,
      loadingFailure: null
    };
    networkCapture.requests.set(params.requestId, entry);
    networkCapture.order.push(entry);
    return;
  }

  const entry = networkCapture.requests.get(params.requestId);
  if (!entry) {
    return;
  }
  if (message.method === "Network.responseReceived") {
    entry.status = params.response?.status ?? null;
    entry.statusText = params.response?.statusText ?? null;
    entry.responseTimestamp = params.timestamp ?? null;
    entry.mimeType = params.response?.mimeType ?? null;
    return;
  }
  if (message.method === "Network.loadingFinished") {
    entry.finishedTimestamp = params.timestamp ?? null;
    entry.encodedDataLength = params.encodedDataLength ?? null;
    return;
  }
  if (message.method === "Network.loadingFailed") {
    entry.failedTimestamp = params.timestamp ?? null;
    entry.loadingFailure = {
      errorText: params.errorText ?? null,
      canceled: params.canceled ?? null,
      blockedReason: params.blockedReason ?? null
    };
  }
}

async function hydrateNetworkResponseBodies(send, networkCapture) {
  for (const entry of networkCapture.order) {
    if (!entry.responseTimestamp || entry.loadingFailure) {
      continue;
    }
    try {
      const responseBody = await send("Network.getResponseBody", {
        requestId: entry.requestId
      });
      if (entry.group === "placeableAssetDelivery") {
        entry.responseBodyBytes = responseBody.base64Encoded
          ? Buffer.from(responseBody.body ?? "", "base64").length
          : Buffer.byteLength(String(responseBody.body ?? ""), "utf8");
        continue;
      }
      const text = responseBody.base64Encoded
        ? Buffer.from(responseBody.body ?? "", "base64").toString("utf8")
        : String(responseBody.body ?? "");
      entry.responseBodyBytes = Buffer.byteLength(text, "utf8");
      if (!text) {
        continue;
      }
      try {
        const payload = JSON.parse(text);
        entry.responseItemCount = extractResponseItemCount(payload);
        entry.responsePayloadCounts = extractResponsePayloadCounts(payload);
        entry.firstErrorReason = extractFirstPayloadError(payload);
      } catch (error) {
        entry.bodyParseError = formatErrorForMessage(error);
      }
    } catch (error) {
      entry.bodyParseError = formatErrorForMessage(error);
    }
  }
}

async function enrichCaptureErrorWithNetwork(error, send, networkCapture) {
  try {
    await hydrateNetworkResponseBodies(send, networkCapture);
    const networkCaptureSummary = buildNetworkCaptureSummary(networkCapture);
    if (error?.captureBlocker) {
      error.captureBlocker.networkCaptureSummary = networkCaptureSummary;
    }
  } catch (networkError) {
    if (error?.captureBlocker) {
      error.captureBlocker.networkCaptureSummary = {
        version: "aurora-areas-cdp-network-capture-summary/v1",
        observedRequestCount: networkCapture.order.length,
        groups: null,
        firstErrorReason: {
          code: "network_capture_summary_failed",
          summary: formatErrorForMessage(networkError)
        }
      };
    }
  }
}

function buildNetworkCaptureSummary(networkCapture) {
  const summaryCreatedAtMs = Date.now();
  const groups = {
    areaProcess: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "areaProcess"),
      summaryCreatedAtMs
    ),
    tileProcessBatch: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "tileProcessBatch"),
      summaryCreatedAtMs
    ),
    tileProcess: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "tileProcess"),
      summaryCreatedAtMs
    ),
    placeableRenderPayloadBatch: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "placeableRenderPayloadBatch"),
      summaryCreatedAtMs
    ),
    placeableRenderPayloadSingle: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "placeableRenderPayloadSingle"),
      summaryCreatedAtMs
    ),
    placeableProcessBatch: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "placeableProcessBatch"),
      summaryCreatedAtMs
    ),
    placeableAssetContractsBatch: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "placeableAssetContractsBatch"),
      summaryCreatedAtMs
    ),
    placeableAssetContractsSingle: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "placeableAssetContractsSingle"),
      summaryCreatedAtMs
    ),
    placeableAssetDelivery: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "placeableAssetDelivery"),
      summaryCreatedAtMs
    ),
    creatureProcess: summarizeNetworkGroup(
      networkCapture.order.filter((entry) => entry.group === "creatureProcess"),
      summaryCreatedAtMs
    )
  };
  return {
    version: "aurora-areas-cdp-network-capture-summary/v1",
    summaryCreatedAtMs,
    observedRequestCount: networkCapture.order.length,
    groups,
    firstErrorReason:
      groups.areaProcess.firstErrorReason ??
      groups.tileProcessBatch.firstErrorReason ??
      groups.tileProcess.firstErrorReason ??
      groups.placeableRenderPayloadBatch.firstErrorReason ??
      groups.placeableRenderPayloadSingle.firstErrorReason ??
      groups.placeableProcessBatch.firstErrorReason ??
      groups.placeableAssetContractsBatch.firstErrorReason ??
      groups.placeableAssetContractsSingle.firstErrorReason ??
      groups.placeableAssetDelivery.firstErrorReason ??
      groups.creatureProcess.firstErrorReason ??
      null
  };
}

function requiredNetworkSettlementGroups() {
  return [
    { key: "areaProcess", failedCode: "area_process_failed", inFlightCode: "area_process_in_flight" },
    { key: "tileProcessBatch", failedCode: "tile_process_batch_failed", inFlightCode: "tile_process_batch_in_flight" },
    { key: "tileProcess", failedCode: "tile_process_failed", inFlightCode: "tile_process_in_flight" },
    { key: "placeableRenderPayloadBatch", failedCode: "placeable_render_payload_batch_failed", inFlightCode: "placeable_render_payload_batch_in_flight" },
    { key: "placeableRenderPayloadSingle", failedCode: "placeable_render_payload_single_failed", inFlightCode: "placeable_render_payload_single_in_flight" },
    { key: "placeableProcessBatch", failedCode: "placeable_process_batch_failed", inFlightCode: "placeable_process_batch_in_flight" },
    { key: "placeableAssetContractsBatch", failedCode: "placeable_asset_contracts_batch_failed", inFlightCode: "placeable_asset_contracts_batch_in_flight" },
    { key: "placeableAssetContractsSingle", failedCode: "placeable_asset_contracts_single_failed", inFlightCode: "placeable_asset_contracts_single_in_flight" },
    { key: "placeableAssetDelivery", failedCode: "placeable_asset_delivery_failed", inFlightCode: "placeable_asset_delivery_in_flight" },
    { key: "creatureProcess", failedCode: "creature_process_failed", inFlightCode: "creature_process_in_flight" }
  ];
}

async function waitForRequiredNetworkSettlement(networkCapture, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let quietSinceMs = null;
  while (Date.now() <= deadline) {
    const summary = buildNetworkCaptureSummary(networkCapture);
    const blocker = resolveRequiredNetworkSettlementBlocker(summary);
    if (!blocker) {
      quietSinceMs ??= Date.now();
      if (Date.now() - quietSinceMs >= 500) {
        return;
      }
    } else {
      quietSinceMs = null;
      if (blocker.kind === "failed") {
        throw createNetworkSettlementBlocker(blocker, summary, timeoutMs);
      }
    }
    await sleep(100);
  }

  const summary = buildNetworkCaptureSummary(networkCapture);
  const blocker = resolveRequiredNetworkSettlementBlocker(summary) ?? {
    kind: "in_flight",
    code: "network_settlement_timeout",
    label: "required network requests",
    group: { inFlightRequestCount: 0, oldestInFlightAgeMs: null }
  };
  throw createNetworkSettlementBlocker(blocker, summary, timeoutMs);
}

function assertRequiredNetworkSettlement(networkCaptureSummary) {
  const blocker = resolveRequiredNetworkSettlementBlocker(networkCaptureSummary);
  if (blocker) {
    throw createNetworkSettlementBlocker(blocker, networkCaptureSummary, 0);
  }
}

function resolveRequiredNetworkSettlementBlocker(networkCaptureSummary) {
  const groups = networkCaptureSummary?.groups ?? {};
  for (const required of requiredNetworkSettlementGroups()) {
    const group = groups[required.key] ?? {};
    if (Number(group.failedRequestCount ?? 0) > 0) {
      return {
        kind: "failed",
        code: required.failedCode,
        label: required.key,
        group
      };
    }
    if (Number(group.inFlightRequestCount ?? 0) > 0) {
      return {
        kind: "in_flight",
        code: required.inFlightCode,
        label: required.key,
        group
      };
    }
  }
  return null;
}

function createNetworkSettlementBlocker(blocker, networkCaptureSummary, timeoutMs) {
  const inFlightCount = Number(blocker.group?.inFlightRequestCount ?? 0);
  const failedCount = Number(blocker.group?.failedRequestCount ?? 0);
  return createBlockerError(
    blocker.code,
    blocker.kind === "failed"
      ? `${blocker.label} observed ${failedCount} failed request(s).`
      : `${blocker.label} still has ${inFlightCount} request(s) in flight.`,
    {
      timeoutMs,
      group: blocker.label,
      failedRequestCount: failedCount,
      inFlightRequestCount: inFlightCount,
      oldestInFlightAgeMs: blocker.group?.oldestInFlightAgeMs ?? null,
      firstErrorReason: blocker.group?.firstErrorReason ?? null,
      networkCaptureSummary
    }
  );
}

function summarizeNetworkGroup(entries, summaryCreatedAtMs) {
  const responseStatusCounts = {};
  let requestCount = 0;
  let requestedItemCount = 0;
  let responseCount = 0;
  let responseItemCount = 0;
  let failedRequestCount = 0;
  let inFlightRequestCount = 0;
  let inFlightRequestedItemCount = 0;
  let oldestInFlightAgeMs = null;
  let firstErrorReason = null;
  const responsePayloadCounts = createEmptyResponsePayloadCounts();
  const firstRequests = [];
  const requestItemSample = [];

  for (const entry of entries) {
    requestCount += 1;
    requestedItemCount += Number(entry.postDataItemCount ?? 0);
    const inFlight = isNetworkEntryInFlight(entry);
    if (inFlight) {
      const inFlightAgeMs = resolveNetworkInFlightAgeMs(entry, summaryCreatedAtMs);
      inFlightRequestCount += 1;
      inFlightRequestedItemCount += Number(entry.postDataItemCount ?? 0);
      oldestInFlightAgeMs = Math.max(oldestInFlightAgeMs ?? 0, inFlightAgeMs ?? 0);
    }
    if (entry.status !== null && entry.status !== undefined) {
      responseCount += 1;
      responseStatusCounts[String(entry.status)] =
        (responseStatusCounts[String(entry.status)] ?? 0) + 1;
    }
    responseItemCount += Number(entry.responseItemCount ?? 0);
    mergeResponsePayloadCounts(responsePayloadCounts, entry.responsePayloadCounts);
    const entryError = resolveNetworkEntryErrorReason(entry);
    if (entryError) {
      failedRequestCount += 1;
      firstErrorReason = firstErrorReason ?? entryError;
    }
    for (const item of entry.postDataItemSample ?? []) {
      if (requestItemSample.length >= DEFAULT_NETWORK_REQUEST_ITEM_SAMPLE_LIMIT) {
        break;
      }
      requestItemSample.push({
        requestOrdinal: requestCount - 1,
        ...item
      });
    }
    if (firstRequests.length < 4) {
      firstRequests.push({
        url: entry.url,
        method: entry.method,
        status: entry.status,
        requestedItemCount: entry.postDataItemCount,
        requestItemSampleLimit: entry.postDataItemSampleLimit,
        requestItemSample: entry.postDataItemSample,
        postDataPayloadKeys: entry.postDataPayloadKeys,
        postDataParseError: entry.postDataParseError,
        responseItemCount: entry.responseItemCount,
        responseBodyBytes: entry.responseBodyBytes,
        elapsedMs: resolveNetworkElapsedMs(entry),
        inFlight,
        inFlightAgeMs: inFlight
          ? resolveNetworkInFlightAgeMs(entry, summaryCreatedAtMs)
          : null,
        errorReason: entryError
      });
    }
  }

  return {
    requestCount,
    requestedItemCount,
    responseCount,
    responseStatusCounts,
    responseItemCount,
    responsePayloadCounts,
    failedRequestCount,
    inFlightRequestCount,
    inFlightRequestedItemCount,
    oldestInFlightAgeMs,
    firstErrorReason,
    requestItemSample,
    firstRequests
  };
}

function resolveNetworkEntryErrorReason(entry) {
  if (entry.loadingFailure) {
    return {
      code: "network_loading_failed",
      summary: entry.loadingFailure.errorText ?? "Network loading failed.",
      details: entry.loadingFailure
    };
  }
  if (Number(entry.status ?? 0) >= 400) {
    return {
      code: `http_${entry.status}`,
      summary: `${entry.label} returned HTTP ${entry.status}.`,
      details: {
        url: entry.url,
        status: entry.status,
        statusText: entry.statusText
      }
    };
  }
  if (entry.firstErrorReason) {
    return entry.firstErrorReason;
  }
  if (
    entry.bodyParseError &&
    entry.status !== null &&
    !isCdpInspectorCacheEviction(entry.bodyParseError)
  ) {
    return {
      code: "response_body_parse_failed",
      summary: entry.bodyParseError,
      details: {
        url: entry.url,
        status: entry.status
      }
    };
  }
  return null;
}

function isCdpInspectorCacheEviction(message) {
  return String(message ?? "").includes("Request content was evicted from inspector cache");
}

function isNetworkEntryInFlight(entry) {
  return (
    !entry.finishedTimestamp &&
    !entry.failedTimestamp &&
    !entry.loadingFailure
  );
}

function resolveNetworkInFlightAgeMs(entry, summaryCreatedAtMs) {
  if (!entry.startedAtMs) {
    return null;
  }
  return Math.max(0, Math.round(summaryCreatedAtMs - entry.startedAtMs));
}

function classifyNetworkRequest(url) {
  let pathname = "";
  try {
    pathname = new URL(url).pathname;
  } catch {
    pathname = String(url ?? "");
  }
  if (/\/areas\/[^/]+\/process$/u.test(pathname)) {
    return {
      group: "areaProcess",
      label: "area process"
    };
  }
  if (pathname.endsWith("/catalog/tiles/process/batch")) {
    return {
      group: "tileProcessBatch",
      label: "tile process batch"
    };
  }
  if (/\/catalog\/tiles\/[^/]+\/process$/u.test(pathname)) {
    return {
      group: "tileProcess",
      label: "tile process"
    };
  }
  if (pathname.endsWith("/catalog/placeables/process/batch")) {
    return {
      group: "placeableProcessBatch",
      label: "placeable process batch"
    };
  }
  if (pathname.endsWith("/catalog/placeables/render-payloads/batch")) {
    return {
      group: "placeableRenderPayloadBatch",
      label: "placeable render payload batch"
    };
  }
  if (pathname.endsWith("/catalog/placeables/cache/assets/contracts/batch")) {
    return {
      group: "placeableAssetContractsBatch",
      label: "placeable asset contracts batch"
    };
  }
  if (/\/catalog\/placeables\/cache\/[^/]+\/assets\/contracts$/u.test(pathname)) {
    return {
      group: "placeableAssetContractsSingle",
      label: "placeable asset contracts"
    };
  }
  if (/\/catalog\/placeables\/cache\/[^/]+\/assets\/[^/]+$/u.test(pathname)) {
    return {
      group: "placeableAssetDelivery",
      label: "placeable asset delivery"
    };
  }
  if (/\/catalog\/placeables\/cache\/[^/]+$/u.test(pathname)) {
    return {
      group: "placeableRenderPayloadSingle",
      label: "placeable render payload"
    };
  }
  if (pathname.endsWith("/catalog/creatures/process")) {
    return {
      group: "creatureProcess",
      label: "creature process"
    };
  }
  return null;
}

function summarizeRequestPostData(postData) {
  const parsed = parseRequestItems(postData);
  const items = parsed.items ?? [];
  return {
    payloadKeys: parsed.payloadKeys,
    itemCount: parsed.items ? parsed.items.length : null,
    itemSample: items
      .slice(0, DEFAULT_NETWORK_REQUEST_ITEM_SAMPLE_LIMIT)
      .map((item, index) => summarizeRequestItemForNetworkSample(item, index)),
    sampleLimit: DEFAULT_NETWORK_REQUEST_ITEM_SAMPLE_LIMIT,
    error: parsed.error
  };
}

function summarizeRequestItemForNetworkSample(item, index) {
  if (!item || typeof item !== "object") {
    return {
      index,
      key: null,
      resref: null,
      templateId: null,
      tag: null,
      appearanceType: null,
      genericType: null,
      fieldKeys: []
    };
  }
  const key =
    item.key ??
    item.requestKey ??
    item.tileId ??
    item.sceneObjectId ??
    item.objectId ??
    item.sourceInstanceIndexKey ??
    item.cacheKey ??
    item.templateId ??
    item.resref ??
    item.resRef ??
    null;
  return {
    index,
    key: key === null || key === undefined ? null : String(key),
    tileId: firstStringValue(item.tileId),
    resref: firstStringValue(item.resref, item.resRef, item.templateResRef),
    templateId: firstStringValue(item.templateId, item.templateID),
    tag: firstStringValue(item.tag, item.Tag),
    appearanceType: numberOrNull(item.appearanceType),
    genericType: numberOrNull(item.genericType),
    subtypeHint: firstStringValue(item.subtypeHint, item.placeableSubtype, item.objectKind, item.kind),
    fieldKeys: Object.keys(item).slice(0, 16)
  };
}

function countRequestItemsFromPostData(postData) {
  const parsed = parseRequestItems(postData);
  return parsed.items ? parsed.items.length : null;
}

function parseRequestItemsError(postData) {
  const parsed = parseRequestItems(postData);
  return parsed.error;
}

function parseRequestItems(postData) {
  if (!postData) {
    return { items: null, payloadKeys: [], error: null };
  }
  try {
    const payload = JSON.parse(postData);
    const payloadKeys =
      payload && typeof payload === "object" ? Object.keys(payload).slice(0, 16) : [];
    if (Array.isArray(payload?.items)) {
      return {
        payloadKeys,
        items: payload.items,
        error: null
      };
    }
    if (
      payload &&
      typeof payload === "object" &&
      !Array.isArray(payload) &&
      (typeof payload.templateId === "string" || typeof payload.resref === "string")
    ) {
      return {
        payloadKeys,
        items: [payload],
        error: null
      };
    }
    return {
      payloadKeys,
      items: null,
      error: null
    };
  } catch (error) {
    return {
      items: null,
      payloadKeys: [],
      error: formatErrorForMessage(error)
    };
  }
}

function extractResponseItemCount(payload) {
  if (Array.isArray(payload?.data?.items)) {
    return payload.data.items.length;
  }
  if (Array.isArray(payload?.items)) {
    return payload.items.length;
  }
  if (payload?.data?.creature) {
    return 1;
  }
  return null;
}

function extractResponsePayloadCounts(payload) {
  const counts = createEmptyResponsePayloadCounts();
  const items = Array.isArray(payload?.data?.items)
    ? payload.data.items
    : Array.isArray(payload?.items)
      ? payload.items
      : payload?.data?.creature
        ? [payload.data.creature]
        : [];
  for (const item of items) {
    const renderable = item?.payload ?? item?.placeable ?? item?.creature ?? item;
    const renderPackage =
      renderable?.renderPackage ?? renderable?.creatureRenderPackage ?? null;
    const status = renderPackage?.status ?? null;
    if (status) {
      counts.renderPackageStatusCounts[status] =
        (counts.renderPackageStatusCounts[status] ?? 0) + 1;
    }
    if (renderPackage?.modelUrl || renderPackage?.glbUrl) {
      counts.renderedModelUrlCount += 1;
    }
    if ((renderPackage?.assetRefs?.derivedModelAssetIds?.length ?? 0) > 0) {
      counts.derivedModelAssetRefCount += 1;
    }
    if (isUserLikeRuntimeIdentifier(
      renderable?.resref,
      renderable?.templateId,
      renderable?.name,
      renderable?.category
    )) {
      counts.userResRefLikeCount += 1;
    }
    for (const diagnostic of renderPackage?.diagnostics ?? []) {
      const code = diagnostic?.code ?? "unknown";
      counts.renderPackageDiagnosticCodeCounts[code] =
        (counts.renderPackageDiagnosticCodeCounts[code] ?? 0) + 1;
    }
  }
  return counts;
}

function createEmptyResponsePayloadCounts() {
  return {
    renderPackageStatusCounts: {},
    renderedModelUrlCount: 0,
    derivedModelAssetRefCount: 0,
    userResRefLikeCount: 0,
    renderPackageDiagnosticCodeCounts: {}
  };
}

function mergeResponsePayloadCounts(target, source) {
  if (!source) {
    return target;
  }
  target.renderedModelUrlCount += Number(source.renderedModelUrlCount ?? 0);
  target.derivedModelAssetRefCount += Number(source.derivedModelAssetRefCount ?? 0);
  target.userResRefLikeCount += Number(source.userResRefLikeCount ?? 0);
  mergeCountMap(target.renderPackageStatusCounts, source.renderPackageStatusCounts);
  mergeCountMap(
    target.renderPackageDiagnosticCodeCounts,
    source.renderPackageDiagnosticCodeCounts
  );
  return target;
}

function mergeCountMap(target, source) {
  for (const [key, value] of Object.entries(source ?? {})) {
    target[key] = (target[key] ?? 0) + Number(value ?? 0);
  }
}

function extractFirstPayloadError(payload) {
  const directCode = payload?.error?.code ?? payload?.code ?? null;
  const directMessage = payload?.error?.message ?? payload?.message ?? null;
  if (directCode || directMessage) {
    return {
      code: directCode ?? "payload_error",
      summary: directMessage ?? directCode,
      details: {
        source: "response_payload"
      }
    };
  }
  const items = Array.isArray(payload?.data?.items)
    ? payload.data.items
    : Array.isArray(payload?.items)
      ? payload.items
      : [];
  const erroredItem = items.find((item) => item?.error || item?.code || item?.message);
  if (erroredItem) {
    return {
      code: erroredItem.error?.code ?? erroredItem.code ?? "payload_item_error",
      summary: erroredItem.error?.message ?? erroredItem.message ?? "Payload item error.",
      details: {
        itemKeys: Object.keys(erroredItem).slice(0, 12)
      }
    };
  }
  return null;
}

function resolveNetworkElapsedMs(entry) {
  const end = entry.finishedTimestamp ?? entry.responseTimestamp ?? entry.failedTimestamp;
  if (entry.startedTimestamp === null || entry.startedTimestamp === undefined || !end) {
    return null;
  }
  return Math.max(0, Math.round((end - entry.startedTimestamp) * 1000));
}

function firstNonEmptyIdList(...values) {
  for (const value of values) {
    const ids = splitRuntimeIdList(value);
    if (ids.length > 0) {
      return ids;
    }
  }
  return [];
}

function splitRuntimeIdList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (value === null || value === undefined) {
    return [];
  }
  const text = String(value).trim();
  if (!text || text === "none") {
    return [];
  }
  return text
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferObjectFactsFromObjectId(objectId) {
  const localId = String(objectId ?? "").split(":").pop() ?? "";
  const withoutObjectPrefix = localId.replace(/^obj_/u, "");
  const withoutOrdinal = withoutObjectPrefix.replace(/_\d+$/u, "");
  const kindPrefix = withoutOrdinal.match(/^(plc|dor|cre|itm|snd)_/u)?.[1] ?? null;
  return {
    templateId: withoutOrdinal || null,
    resRef: withoutOrdinal.replace(/^(plc|dor|cre|itm|snd)_/u, "") || null,
    resRefSource: "inferred_from_object_id",
    kind:
      kindPrefix === "plc"
        ? "placeable"
        : kindPrefix === "dor"
          ? "door"
          : kindPrefix === "cre"
            ? "creature"
            : kindPrefix === "itm"
              ? "item"
              : kindPrefix === "snd"
                ? "sound"
                : null
  };
}

function isUserLikeRuntimeIdentifier(...values) {
  return values
    .filter((value) => value !== null && value !== undefined)
    .some((value) => /(^|[^a-z0-9])user([^a-z0-9]|$)/iu.test(String(value)));
}

function firstStringValue(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function normalizeSampleLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return DEFAULT_ACTIONABILITY_SAMPLE_LIMIT;
  }
  return Math.min(50, Math.floor(parsed));
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveUrlPort(value) {
  try {
    const parsed = new URL(value);
    if (parsed.port) {
      return Number(parsed.port);
    }
    return parsed.protocol === "https:" ? 443 : 80;
  } catch {
    return null;
  }
}

function serializeError(error) {
  return {
    name: error?.name ?? null,
    message: error?.message ?? String(error),
    code: error?.code ?? error?.cause?.code ?? null,
    stack: error?.stack?.split("\n").slice(0, 6).join("\n") ?? null,
    cause: error?.cause
      ? {
          name: error.cause.name ?? null,
          message: error.cause.message ?? String(error.cause),
          code: error.cause.code ?? null
        }
      : null
  };
}

function formatErrorForMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = "true";
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function loadOptionalMatrixRuntimeBuildBinding(parsedOptions) {
  const profileValue = parsedOptions.runtimeBuildProfile;
  const shaValue = parsedOptions.runtimeBuildProfileSha256;
  if (profileValue === undefined && shaValue === undefined) return null;
  if (
    typeof profileValue !== "string" ||
    profileValue.trim().length === 0 ||
    typeof shaValue !== "string" ||
    !/^[a-f0-9]{64}$/u.test(shaValue.trim().toLowerCase())
  ) {
    throw new Error(
      "Matrix runtime-build proof requires --runtimeBuildProfile and --runtimeBuildProfileSha256 together."
    );
  }
  const profilePath = path.resolve(process.cwd(), profileValue);
  if (!fs.existsSync(profilePath) || !fs.statSync(profilePath).isFile()) {
    throw new Error(`Matrix runtime-build profile is missing: ${profilePath}`);
  }
  const bytes = fs.statSync(profilePath).size;
  if (bytes < 2 || bytes > MATRIX_RUNTIME_BUILD_PROFILE_MAX_BYTES) {
    throw new Error("MATRIX_RUNTIME_BUILD_PROFILE_BUDGET_EXCEEDED");
  }
  const expectedSha256 = shaValue.trim().toLowerCase();
  const actualSha256 = crypto
    .createHash("sha256")
    .update(fs.readFileSync(profilePath))
    .digest("hex");
  if (actualSha256 !== expectedSha256) {
    throw new Error(
      `MATRIX_RUNTIME_BUILD_PROFILE_SHA256_MISMATCH: expected ${expectedSha256}, observed ${actualSha256}.`
    );
  }
  let profile;
  try {
    profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  } catch {
    throw new Error("MATRIX_RUNTIME_BUILD_PROFILE_INVALID_JSON");
  }
  return buildMatrixRuntimeBuildBinding({
    profile,
    profilePath,
    profileSha256: expectedSha256
  });
}

function resolveCaptureTargetAreaQuery(value) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === "ikea" || normalized === "_ikea") {
    return "_ikea";
  }
  return normalized;
}

function normalizeCaptureViewOption(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "default" || normalized === "orbit") {
    return "default";
  }
  if (["top", "topdown", "top-down", "top_down", "oracle-top-down"].includes(normalized)) {
    return "top-down";
  }
  return normalized;
}

function normalizeAreaEditingPreviewOption(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || ["false", "none", "off"].includes(normalized)) {
    return null;
  }
  if (["terrain", "tile", "single-tile", "single_tile"].includes(normalized)) {
    return "terrain";
  }
  if (["group", "set-group", "set_group"].includes(normalized)) {
    return "group";
  }
  if (["crosser", "feature", "features", "road"].includes(normalized)) {
    return "crosser";
  }
  if (["eraser", "erase", "mode-4", "mode_4"].includes(normalized)) {
    return "eraser";
  }
  throw new Error(
    `Unsupported --areaEditingPreview value: ${value}. Expected terrain, group, crosser, eraser, or none.`
  );
}

function normalizeAreaEditingScenarioOption(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || ["false", "none", "off"].includes(normalized)) {
    return null;
  }
  if (["new-area-verify", "new_area_verify", "verify-new-area"].includes(normalized)) {
    return "new-area-verify";
  }
  const aliases = new Map([
    ["multi_select", "multi-select"],
    ["drag_terrain", "drag-terrain"],
    ["drag_crosser", "drag-crosser"],
    ["drag_height", "drag-height"],
    ["multi_copy_paste", "multi-copy-paste"],
    ["multi_copy_paste_local", "multi-copy-paste-local"],
    ["tile_properties", "tile-properties"],
    ["tile_transform_local", "tile-transform-local"],
    ["tile_replace_local", "tile-replace-local"],
    ["tile_add_connect_matrix_local", "tile-add-connect-matrix-local"],
    ["group_placement_local", "group-placement-local"],
    ["eraser_local", "eraser-local"],
    ["source_group_remove", "source-group-remove"],
    ["source_group_rotate", "source-group-rotate"],
    ["source_group_cut", "source-group-cut"],
    ["group_base_height", "group-base-height"],
    ["area_rotate", "area-rotate"],
    ["area_rotate_rectangular", "area-rotate-rectangular"],
    ["area_rotate_rectangular_local", "area-rotate-rectangular-local"]
  ]);
  const canonical = aliases.get(normalized) ?? normalized;
  if (
    [
      "multi-select",
      "drag-terrain",
      "drag-crosser",
      "drag-height",
      "multi-copy-paste",
      "multi-copy-paste-local",
      "tile-properties",
      "tile-transform-local",
      "tile-replace-local",
      "tile-add-connect-matrix-local",
      "group-placement-local",
      "eraser-local",
      "eraser",
      "source-group-remove",
      "source-group-rotate",
      "source-group-cut",
      "group-base-height",
      "area-rotate",
      "area-rotate-rectangular",
      "area-rotate-rectangular-local"
    ].includes(canonical)
  ) {
    return canonical;
  }
  throw new Error(
    `Unsupported --areaEditingScenario value: ${value}. Expected new-area-verify, multi-select, drag-terrain, drag-crosser, drag-height, tile-transform-local, tile-add-connect-matrix-local, group-placement-local, eraser-local, eraser, source-group-remove, source-group-rotate, source-group-cut, group-base-height, area-rotate, or none.`
  );
}

function loadAreaEditingMatrixChunk(value, scenario) {
  if (value === undefined || value === null || String(value).trim() === "") {
    if (scenario === "tile-add-connect-matrix-local") {
      throw new Error("--areaEditingMatrixChunk is required for tile-add-connect-matrix-local.");
    }
    return null;
  }
  if (scenario !== "tile-add-connect-matrix-local") {
    throw new Error("--areaEditingMatrixChunk is valid only with --areaEditingScenario tile-add-connect-matrix-local.");
  }
  const chunkPath = path.resolve(String(value));
  if (!fs.existsSync(chunkPath)) {
    throw new Error(`Matrix chunk does not exist: ${chunkPath}.`);
  }
  const chunk = JSON.parse(fs.readFileSync(chunkPath, "utf8"));
  const validationErrors = validateMatrixChunk(chunk);
  if (validationErrors.length > 0) {
    throw new Error(`Matrix chunk is invalid: ${validationErrors.join(", ")}.`);
  }
  return { ...chunk, sourcePath: chunkPath };
}

function assertMatrixChunkMatchesNewArea(chunk, newArea) {
  if (!chunk) return;
  if (
    chunk.tilesetResRef !== newArea.tilesetResRef ||
    chunk.width !== newArea.width ||
    chunk.height !== newArea.height
  ) {
    throw new Error(
      "Matrix chunk tileset and dimensions must exactly match the local draft Area: " +
      `${chunk.tilesetResRef} ${chunk.width}x${chunk.height} versus ` +
      `${newArea.tilesetResRef} ${newArea.width}x${newArea.height}.`
    );
  }
}

function normalizeAreaEditingTileIdOption(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const tileId = Number(value);
  if (!Number.isInteger(tileId) || tileId < 0) throw new Error("--areaEditingTileId must be a non-negative integer.");
  return tileId;
}

function normalizeAreaEditingResRefOption(value, optionName) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!/^[a-z0-9_]{1,16}$/u.test(normalized)) {
    throw new Error(`--${optionName} must be a valid 1..16 character Aurora ResRef.`);
  }
  return normalized;
}

function normalizeAreaEditingGroupIdOption(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!/^group\d+$/u.test(normalized)) {
    throw new Error("--areaEditingGroupId must be an Aurora SET group id such as group0.");
  }
  return normalized;
}

function normalizeAreaEditingDimensionOption(value, optionName) {
  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized < 2 || normalized > 32) {
    throw new Error(`--${optionName} must be an integer in the recovered 2..32 range.`);
  }
  return normalized;
}

function normalizeAreaEditingActionOption(value) {
  const normalized = String(value ?? "hover").trim().toLowerCase();
  if (!normalized || ["hover", "preview"].includes(normalized)) {
    return "hover";
  }
  if (["commit", "click"].includes(normalized)) {
    return "commit";
  }
  if (["commit-undo", "commit_undo", "undo"].includes(normalized)) {
    return "commit-undo";
  }
  throw new Error(
    `Unsupported --areaEditingAction value: ${value}. Expected hover, commit, or commit-undo.`
  );
}

function normalizeCaptureVisibilityOption(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized || normalized === "all" || normalized === "objects") {
    return "all";
  }
  if (["terrain", "terrain-only", "terrain_only", "tiles", "tiles-only"].includes(normalized)) {
    return "terrain-only";
  }
  return normalized;
}

function normalizeCaptureCeilingMeshesOption(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const normalized = String(value).trim().toLowerCase();
  if (!normalized || ["default", "auto", "unchanged"].includes(normalized)) {
    return null;
  }
  if (["1", "true", "yes", "on", "show", "shown", "visible"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "hide", "hidden"].includes(normalized)) {
    return false;
  }
  return null;
}

function sanitizeFileStem(value) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function parseBooleanOption(value) {
  return ["1", "true", "yes", "on"].includes(String(value ?? "").trim().toLowerCase());
}

function parseOptionalBooleanOption(value) {
  if (value === undefined || value === null || String(value).trim().length === 0) {
    return null;
  }
  return parseBooleanOption(value);
}

function parseOptionalNumberOption(value) {
  if (value === undefined || value === null || String(value).trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseOptionalStringOption(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const parsed = String(value).trim();
  return parsed.length > 0 ? parsed : null;
}

function normalizeCaptureViewFocusEvidence(focus = {}) {
  return {
    worldX: typeof focus.worldX === "number" && Number.isFinite(focus.worldX) ? focus.worldX : null,
    worldY: typeof focus.worldY === "number" && Number.isFinite(focus.worldY) ? focus.worldY : null,
    worldZ: typeof focus.worldZ === "number" && Number.isFinite(focus.worldZ) ? focus.worldZ : null,
    distance:
      typeof focus.distance === "number" && Number.isFinite(focus.distance) ? focus.distance : null,
    yawDegrees:
      typeof focus.yawDegrees === "number" && Number.isFinite(focus.yawDegrees)
        ? focus.yawDegrees
        : null,
    elevationDegrees:
      typeof focus.elevationDegrees === "number" && Number.isFinite(focus.elevationDegrees)
        ? focus.elevationDegrees
        : null
  };
}

function resolveCaptureViewFocusForOpenedArea(captureView, focus, openedArea) {
  const normalized = normalizeCaptureViewFocusEvidence(focus);
  if (captureView !== "perspective") {
    return normalized;
  }
  const expectation = openedArea?.areaExpectation ?? {};
  const width = Number(expectation.width);
  const height = Number(expectation.height);
  // A focused perspective event accepts Web tile coordinates (not Aurora's
  // 10-unit world coordinates).  New Areas always have an expectation; for a
  // pre-existing Area we preserve the explicit/fallback behavior if it is
  // unavailable rather than inventing a target.
  if (!(Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0)) {
    return normalized;
  }
  return {
    ...normalized,
    worldX: normalized.worldX ?? width / 2,
    worldY: normalized.worldY ?? 0.22,
    worldZ: normalized.worldZ ?? height / 2
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function onceProcessExits(childProcess, timeoutMs = 5_000) {
  return new Promise((resolve) => {
    if (!childProcess || childProcess.exitCode !== null || childProcess.signalCode !== null) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      try {
        childProcess.kill("SIGKILL");
      } catch {
        // Best effort cleanup; capture failure evidence is more important than hanging here.
      }
      resolve();
    }, timeoutMs);
    childProcess.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function terminateChromeCaptureProcess(childProcess) {
  if (!childProcess || childProcess.exitCode !== null || childProcess.signalCode !== null) {
    return;
  }
  const exitPromise = onceProcessExits(childProcess, 5_000);
  if (process.platform === "win32" && childProcess.pid) {
    spawnSync("taskkill", ["/PID", String(childProcess.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
      timeout: 5_000
    });
  } else {
    childProcess.kill("SIGTERM");
  }
  await exitPromise;
}

function removeProfileDirBestEffort(profileDir) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true });
      return;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
}
