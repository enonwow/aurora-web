#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_SETTINGS = resolve(
  process.env.USERPROFILE ?? "",
  "Documents/Neverwinter Nights/settings.tml",
);
const DEFAULT_NWN_EXE =
  "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwmain.exe";
const DEFAULT_MODULE_NAME = "als_oracle";

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    settings: DEFAULT_SETTINGS,
    nwnExe: DEFAULT_NWN_EXE,
    moduleName: DEFAULT_MODULE_NAME,
    outputName: "retail-cross-lane-max-light-variant-observation.json",
    variantDirPrefix: "retail-maxlights",
    beforeArtifact: "retail-cross-lane-all-lanes-before-budget.png",
    afterArtifact: "retail-cross-lane-all-lanes-after-budget.png",
    activeSlotArtifact: "retail-cross-lane-active-slots.json",
    durationSeconds: 55,
    variants: [3, 8, 32],
    skipCapture: false,
    allowFocusCapture: false,
    allowTopMostNoFocus: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--artifactDir") {
      index += 1;
      options.artifactDir = requireValue(arg, argv[index]);
    } else if (arg === "--settings") {
      index += 1;
      options.settings = requireValue(arg, argv[index]);
    } else if (arg === "--nwnExe") {
      index += 1;
      options.nwnExe = requireValue(arg, argv[index]);
    } else if (arg === "--moduleName") {
      index += 1;
      options.moduleName = requireValue(arg, argv[index]);
    } else if (arg === "--outputName") {
      index += 1;
      options.outputName = requireValue(arg, argv[index]);
    } else if (arg === "--variantDirPrefix") {
      index += 1;
      options.variantDirPrefix = requireValue(arg, argv[index]);
    } else if (arg === "--beforeArtifact") {
      index += 1;
      options.beforeArtifact = requireValue(arg, argv[index]);
    } else if (arg === "--afterArtifact") {
      index += 1;
      options.afterArtifact = requireValue(arg, argv[index]);
    } else if (arg === "--activeSlotArtifact") {
      index += 1;
      options.activeSlotArtifact = requireValue(arg, argv[index]);
    } else if (arg === "--durationSeconds") {
      index += 1;
      options.durationSeconds = Number.parseInt(requireValue(arg, argv[index]), 10);
    } else if (arg === "--variants") {
      index += 1;
      options.variants = requireValue(arg, argv[index])
        .split(",")
        .map((entry) => Number.parseInt(entry.trim(), 10))
        .filter((entry) => Number.isFinite(entry));
    } else if (arg === "--skipCapture") {
      options.skipCapture = true;
    } else if (arg === "--allowFocusCapture") {
      options.allowFocusCapture = true;
    } else if (arg === "--allowTopMostNoFocus") {
      options.allowTopMostNoFocus = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function printHelp() {
  console.log(`Usage: node scripts/capture-area-lighting-retail-max-light-variants.mjs [options]

Options:
  --repoRoot <path>          Repository root. Defaults to the aurora-web root.
  --artifactDir <path>       Artifact root. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --settings <path>          NWN settings.tml path.
  --nwnExe <path>            nwmain.exe path.
  --moduleName <name>        Module name. Defaults to ${DEFAULT_MODULE_NAME}
  --outputName <json>        Observation report filename. Defaults to retail-cross-lane-max-light-variant-observation.json.
  --variantDirPrefix <name>  Variant directory prefix. Defaults to retail-maxlights.
  --beforeArtifact <png>     Before-budget cue artifact. Defaults to retail-cross-lane-all-lanes-before-budget.png.
  --afterArtifact <png>      After-budget cue artifact. Defaults to retail-cross-lane-all-lanes-after-budget.png.
  --activeSlotArtifact <x>   Active-slot cue artifact. Defaults to retail-cross-lane-active-slots.json.
  --durationSeconds <n>      Capture duration per variant. Defaults to 55.
  --variants <csv>           Max-light variants. Defaults to 3,8,32.
  --skipCapture              Write a dry report without launching NWN.
  --allowFocusCapture        Allow SetForegroundWindow/topmost/ESC automation. Defaults to safe no-focus capture.
  --allowTopMostNoFocus      Keep the NWN window topmost on the second monitor without focus/keyboard automation.
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function describeArtifact(repoRoot, path) {
  if (!existsSync(path)) {
    return {
      status: "missing",
      path: toRepoRelative(repoRoot, path),
    };
  }
  const stats = statSync(path);
  const buffer = readFileSync(path);
  return {
    status: "present",
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
    sha256: sha256(buffer),
  };
}

function patchMaxLights(settingsText, maxLights) {
  const sectionPattern = /(\[graphics\.lighting\]\r?\n)([\s\S]*?)(?=\r?\n\t\[|$)/u;
  const match = settingsText.match(sectionPattern);
  if (!match) {
    throw new Error("Could not find [graphics.lighting] in settings.tml.");
  }
  const sectionHeader = match[1];
  let sectionBody = match[2];
  if (/\t\tmax-lights\s*=\s*\d+/u.test(sectionBody)) {
    sectionBody = sectionBody.replace(/\t\tmax-lights\s*=\s*\d+/u, `\t\tmax-lights = ${maxLights}`);
  } else {
    sectionBody += `\t\tmax-lights = ${maxLights}\r\n`;
  }
  return settingsText.replace(sectionPattern, `${sectionHeader}${sectionBody}`);
}

function stopNwmain() {
  spawnSync(
    "powershell",
    [
      "-NoProfile",
      "-Command",
      "Get-Process nwmain -ErrorAction SilentlyContinue | Stop-Process -Force",
    ],
    { stdio: "ignore" },
  );
}

function runCapture(repoRoot, variantArtifactDir, options) {
  const captureScript = resolve(repoRoot, "backend/scripts/capture-area-lighting-retail-oracle-window.ps1");
  const stdout = execFileSync(
    "powershell",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      captureScript,
      "-NwnExe",
      toAbsolute(repoRoot, options.nwnExe),
      "-ModuleName",
      options.moduleName,
      "-ArtifactDir",
      variantArtifactDir,
      "-DurationSeconds",
      String(options.durationSeconds),
      "-Overwrite",
      ...buildCaptureSafetyFlags(options),
    ],
    {
      cwd: resolve(repoRoot, "backend"),
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 16,
      timeout: Math.max(120000, (options.durationSeconds + 45) * 1000),
    },
  );
  return JSON.parse(stdout);
}

function buildCaptureSafetyFlags(options) {
  if (options.allowFocusCapture) {
    return [];
  }
  if (options.allowTopMostNoFocus) {
    return ["-AllowTopMostWithoutFocus", "-NoFocus", "-NoEscape"];
  }
  return ["-NoFocus", "-NoTopMost", "-NoEscape"];
}

function buildVariantRecord(repoRoot, artifactDir, maxLights, captureResult, options) {
  const variantDir = resolve(artifactDir, `${options.variantDirPrefix}-${maxLights}`);
  return {
    maxLights,
    artifactDir: toRepoRelative(repoRoot, variantDir),
    moduleName: options.moduleName,
    beforeArtifact: options.beforeArtifact,
    afterArtifact: options.afterArtifact,
    captureStatus: captureResult?.status ?? "not-run",
    secondScreen: captureResult?.secondScreen ?? null,
    capturedCount: captureResult?.capturedCount ?? 0,
    beforeBudget: describeArtifact(
      repoRoot,
      resolve(variantDir, options.beforeArtifact),
    ),
    afterBudget: describeArtifact(
      repoRoot,
      resolve(variantDir, options.afterArtifact),
    ),
    activeSlotCue: captureResult?.cues?.find?.(
      (cue) => cue.artifactCue === options.activeSlotArtifact,
    ) ?? null,
  };
}

throw new Error(
  "This retail max-light proof launcher is retired. It mutates local NWN settings and launches nwmain.exe; use a guarded Toolset workflow or user-provided capture ingestion instead."
);

const options = parseArgs(process.argv.slice(2));
const repoRoot = resolve(options.repoRoot);
const artifactDir = toAbsolute(repoRoot, options.artifactDir);
const settingsPath = toAbsolute(repoRoot, options.settings);
const outputPath = resolve(artifactDir, options.outputName);
mkdirSync(artifactDir, { recursive: true });

if (!existsSync(settingsPath)) {
  throw new Error(`Missing NWN settings file: ${settingsPath}`);
}

const originalSettings = readFileSync(settingsPath, "utf8");
const originalSettingsHash = sha256(Buffer.from(originalSettings, "utf8"));
const backupPath = resolve(
  artifactDir,
  `settings-before-maxlights-${new Date().toISOString().replace(/[:.]/gu, "-")}.tml`,
);
writeFileSync(backupPath, originalSettings, "utf8");

const variants = [];
try {
  for (const maxLights of options.variants) {
    const variantDir = resolve(artifactDir, `${options.variantDirPrefix}-${maxLights}`);
    mkdirSync(variantDir, { recursive: true });
    const patched = patchMaxLights(originalSettings, maxLights);
    writeFileSync(settingsPath, patched, "utf8");
    const captureResult = options.skipCapture ? { status: "skipped" } : runCapture(repoRoot, variantDir, options);
    stopNwmain();
    variants.push(buildVariantRecord(repoRoot, artifactDir, maxLights, captureResult, options));
  }
} finally {
  stopNwmain();
  writeFileSync(settingsPath, originalSettings, "utf8");
}

const restoredSettings = readFileSync(settingsPath, "utf8");
const restoredSettingsHash = sha256(Buffer.from(restoredSettings, "utf8"));
const report = {
  version: "aurora-area-lighting-retail-max-light-variant-observation/v1",
  generatedAt: new Date().toISOString(),
  status: options.skipCapture
    ? "dry-run-no-retail-captures"
    : "blocked-retail-max-light-variant-captures-present-slot-owner-classifier-required",
  passed: false,
  canonicalParityPromoted: false,
  directRetailSlotDumpAvailable: false,
  directRendererSlotOrderObserved: false,
  captureConfig: {
    moduleName: options.moduleName,
    outputName: options.outputName,
    variantDirPrefix: options.variantDirPrefix,
    beforeArtifact: options.beforeArtifact,
    afterArtifact: options.afterArtifact,
    activeSlotArtifact: options.activeSlotArtifact,
  },
  safety: {
    launchesRetailProcess: !options.skipCapture,
    movesNwnToSecondMonitor: true,
    usesGlobalCursor: false,
    usesGlobalKeyboard: options.allowFocusCapture,
    usesForegroundWindow: options.allowFocusCapture,
    usesTopmost: options.allowFocusCapture || options.allowTopMostNoFocus,
    safeNoFocusCapture: !options.allowFocusCapture,
    noFocusTopMostCapture: !options.allowFocusCapture && options.allowTopMostNoFocus,
    settingsRestored: restoredSettingsHash === originalSettingsHash,
    settingsBackup: toRepoRelative(repoRoot, backupPath),
  },
  settings: {
    path: settingsPath,
    originalSha256: originalSettingsHash,
    restoredSha256: restoredSettingsHash,
    restoredMatchesOriginal: restoredSettingsHash === originalSettingsHash,
    variants: options.variants,
  },
  variants,
  blockedParityFacts: [
    "max-light variants can expose budget-sensitive retail pixels, but they are still not a direct renderer active-slot dump",
    "lane-owner accepted/dropped classification requires isolated lane references or a stronger pixel-differential classifier",
  ],
  blocker:
    "Retail captures with controlled graphics.lighting.max-lights variants are present, but active-slot accepted/dropped lane owners are not classified yet.",
};

writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      status: report.status,
      output: toRepoRelative(repoRoot, outputPath),
      settingsRestored: report.safety.settingsRestored,
      variantCount: variants.length,
      variants: variants.map((variant) => ({
        maxLights: variant.maxLights,
        captureStatus: variant.captureStatus,
        capturedCount: variant.capturedCount,
        beforeBudget: variant.beforeBudget.status,
        afterBudget: variant.afterBudget.status,
      })),
    },
    null,
    2,
  ),
);
