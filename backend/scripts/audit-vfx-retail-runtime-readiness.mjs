#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const moduleDir = "C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules";
const installDir = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights\\bin\\win32";
const options = parseArgs(process.argv.slice(2));
const outPath = resolve(
  repoRoot,
  options.out ?? "backend/docs/aurora-reverse/artifacts/vfx-iteration-213/p4-retail-runtime-readiness.json"
);

const manifest = readJson("backend/docs/aurora-reverse/vfx-retail-parity-fixtures.json");
const toolsetStatePath = resolve(repoRoot, ".codex-tmp/area-toolset-oracle-20260710/session-state.json");
const toolsetState = readJsonIfPresent(toolsetStatePath);
const activeToolsetPid = toolsetState?.process?.pid;
const toolsetTargetsVfxLab = String(toolsetState?.modulePath ?? "").toLowerCase().includes("vfx_catalog_lab");
const vfxEvidenceDir = resolve(repoRoot, ".codex-tmp/aurora-live-evidence/vfx-capture-clips");
const retiredLauncherPath = resolve(repoRoot, "backend/scripts/capture_all_vfx_clips.py");
const retiredLauncher = readFileSync(retiredLauncherPath, "utf8").includes(
  "This VFX retail capture launcher is retired"
);

const fixtures = Array.isArray(manifest.fixtures) ? manifest.fixtures : [];
const canonicalAllowedFixtureCount = fixtures.filter((fixture) => fixture?.status === "passed").length;
const modules = ["tlc_vfx_catalog_lab.mod", "tlc_vfx_catalog_lab_iter1.mod"].map((name) =>
  fileEvidence(resolve(moduleDir, name))
);
const report = {
  version: "aurora-vfx-retail-runtime-readiness/v1",
  generatedAt: new Date().toISOString(),
  artifact: toRepoPath(outPath),
  result: "manual-retail-runtime-capture-required",
  localOnlyNotRetailEvidence: true,
  infrastructure: {
    nwmain: fileEvidence(resolve(installDir, "nwmain.exe")),
    nwtoolset: fileEvidence(resolve(installDir, "nwtoolset.exe")),
    vfxLabModules: modules,
    activeToolsetSession: toolsetState
      ? {
          phase: toolsetState.phase ?? null,
          pid: activeToolsetPid ?? null,
          modulePath: toolsetState.modulePath ?? null,
          area: toolsetState.currentArea?.resref ?? null,
          targetsVfxLab: toolsetTargetsVfxLab
        }
      : null
  },
  capturePath: {
    retiredLauncher,
    liveVfxEvidenceDirectoryExists: existsSync(vfxEvidenceDir),
    liveVfxEvidenceDirectory: toRepoPath(vfxEvidenceDir)
  },
  retailManifest: {
    fixtureCount: fixtures.length,
    canonicalAllowedFixtureCount,
    blockedFixtureCount: fixtures.filter((fixture) => fixture?.status !== "passed").length
  },
  blockers: [
    "retail-runtime-capture-media-required",
    "retail-runtime-tick-dump-required",
    "retail-render-contract-snapshot-required",
    "retail-comparison-required",
    ...(retiredLauncher ? ["legacy-vfx-client-launcher-retired"] : []),
    ...(toolsetState && !toolsetTargetsVfxLab ? ["active-toolset-session-is-not-vfx-lab"] : []),
    ...(!existsSync(vfxEvidenceDir) ? ["no-current-vfx-live-evidence-directory"] : [])
  ],
  nextAction:
    "Capture a selected fixture in a separately prepared NWN retail VFX lab session, then ingest its media and metadata into the fixture pack before changing parity status."
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));

function fileEvidence(path) {
  return {
    path,
    exists: existsSync(path),
    ...(existsSync(path) ? { sizeBytes: statSync(path).size } : {})
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(repoRoot, relativePath), "utf8"));
}

function readJsonIfPresent(path) {
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

function toRepoPath(path) {
  const relative = path.startsWith(repoRoot) ? path.slice(repoRoot.length + 1) : path;
  return relative.replace(/\\/gu, "/");
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for --${key}.`);
    }
    result[key] = value;
    index += 1;
  }
  return result;
}
