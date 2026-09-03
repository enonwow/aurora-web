const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const cp = require("node:child_process");
require("../../scripts/proof-capture-lock-auto.cjs");

const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const repoRoot = path.resolve(__dirname, "..", "..");
const outDir = path.resolve(
  repoRoot,
  process.env.AREA_LIGHT_SHADOW_PREVIEW_OUT_DIR ||
    "backend/docs/aurora-reverse/artifacts/scene-shadow-diagnostics-2026-07-02"
);
const url =
  process.env.AREA_LIGHT_SHADOW_PREVIEW_URL ||
  "http://127.0.0.1:5173/dev/area-light-shadow-preview?areaId=area__winds_study";
const name = process.env.AREA_LIGHT_SHADOW_PREVIEW_NAME || "winds-study-area-light-shadow-preview";
const virtualTimeBudgetMs = Math.max(
  1000,
  Number(process.env.AREA_LIGHT_SHADOW_PREVIEW_VIRTUAL_TIME_BUDGET_MS || 10000)
);
const windowWidth = Math.max(
  320,
  Number(process.env.AREA_LIGHT_SHADOW_PREVIEW_WINDOW_WIDTH || 1280)
);
const windowHeight = Math.max(
  240,
  Number(process.env.AREA_LIGHT_SHADOW_PREVIEW_WINDOW_HEIGHT || 720)
);
const png = path.join(outDir, `${name}.png`);
const framePath = path.join(outDir, `${name}.frame.json`);

fs.mkdirSync(outDir, { recursive: true });
const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-area-light-shadow-preview-"));

const baseArgs = [
  "--headless=new",
  "--renderer-process-limit=2",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-background-networking",
  "--disable-extensions",
  `--window-size=${windowWidth},${windowHeight}`,
  "--hide-scrollbars",
  `--user-data-dir=${profileDir}`,
  `--virtual-time-budget=${virtualTimeBudgetMs}`
];

try {
  cp.execFileSync(chrome, [...baseArgs, `--screenshot=${png}`, url], {
    stdio: "pipe"
  });

  const dom = cp.execFileSync(chrome, [...baseArgs, "--dump-dom", url], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const match = dom.match(
    /<script id="area-light-shadow-preview-frame" type="application\/json">([\s\S]*?)<\/script>/
  );
  if (!match) {
    throw new Error("area light shadow frame script not found");
  }

  const snapshot = JSON.parse(match[1]);
  const frame = {
    version: "aurora-area-light-shadow-preview/v1",
    capturedAt: new Date().toISOString(),
    url,
    screenshotPath: png,
    screenshotBytes: fs.statSync(png).size,
    snapshot
  };
  fs.writeFileSync(framePath, `${JSON.stringify(frame, null, 2)}\n`);

  console.log(
    JSON.stringify(
      {
        png,
        framePath,
        screenshotBytes: frame.screenshotBytes,
        snapshot: {
          status: snapshot.status,
          areaId: snapshot.areaId,
          areaGlobalShadowStatus: snapshot.areaGlobalShadowStatus,
          areaGlobalShadowSourceField: snapshot.areaGlobalShadowSourceField,
          areaGlobalShadowOpacity: snapshot.areaGlobalShadowOpacity,
          areaGlobalShadowOpacityFactor: snapshot.areaGlobalShadowOpacityFactor,
          sceneShadowDirectionalLightCastShadowCount:
            snapshot.sceneShadowDirectionalLightCastShadowCount,
          sceneShadowDirectionalLightSamples:
            snapshot.sceneShadowDirectionalLightSamples,
          sceneShadowItemPropertyLightShadowPolicyCount:
            snapshot.sceneShadowItemPropertyLightShadowPolicyCount,
          sceneShadowItemPropertyLightShadowPolicySamples:
            snapshot.sceneShadowItemPropertyLightShadowPolicySamples,
          sceneShadowProgFxType4ShadowRequestCount:
            snapshot.sceneShadowProgFxType4ShadowRequestCount,
          sceneShadowProgFxType4ShadowRequestSamples:
            snapshot.sceneShadowProgFxType4ShadowRequestSamples,
          terrainTileModelLoadedCount:
            snapshot.terrainTileModelLoadedCount,
          terrainTileModelVisibleMeshCount:
            snapshot.terrainTileModelVisibleMeshCount,
          terrainTileModelMaterialMapCount:
            snapshot.terrainTileModelMaterialMapCount,
          terrainTileModelVisibleMeshSample:
            snapshot.terrainTileModelVisibleMeshSample,
          terrainTileShadowReceiverMeshCount:
            snapshot.terrainTileShadowReceiverMeshCount,
          terrainTileShadowReceiverStatus:
            snapshot.terrainTileShadowReceiverStatus,
          terrainTileShadowReceiverSample:
            snapshot.terrainTileShadowReceiverSample,
          terrainRuntimeStatus: snapshot.terrainRuntimeStatus
        }
      }
      ,
      null,
      2
    )
  );
} finally {
  fs.rmSync(profileDir, { recursive: true, force: true });
}
