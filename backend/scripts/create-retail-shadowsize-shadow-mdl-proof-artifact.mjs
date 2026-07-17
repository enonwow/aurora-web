#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");

const DEFAULT_SOURCE_REPORT =
  "backend/docs/aurora-reverse/artifacts/shadowsize-retail-proof-2026-07-02/fx-shadow-mdl-parser-report.json";
const DEFAULT_OUTPUT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview/retail-shadowsize-shadow-mdl-proof.json";
const DEFAULT_NWN_ROOT =
  process.env.AURORA_NWN_ROOT ?? "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights";
const SHADOW_MDL_AUDIT_SCRIPT = "backend/scripts/audit-retail-shadow-mdls.ts";

const EXPECTED_SHADOW_MDLS = [
  {
    shadowSizeRule: "0",
    resref: "fx_shadow_s",
    model: "Fx_Shadow_S",
    emitter: "Small",
    expectedSize: 1,
    expectedAlpha: 0.6000000238418579,
  },
  {
    shadowSizeRule: "present numeric value other than 0 or 2",
    resref: "fx_shadow_m",
    model: "Fx_Shadow_M",
    emitter: "Med",
    expectedSize: 1.600000023841858,
    expectedAlpha: 0.6000000238418579,
  },
  {
    shadowSizeRule: "2",
    resref: "fx_shadow_l",
    model: "Fx_Shadow_L",
    emitter: "Large",
    expectedSize: 3,
    expectedAlpha: 0.699999988079071,
  },
];

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    sourceReport: DEFAULT_SOURCE_REPORT,
    output: DEFAULT_OUTPUT,
    nwnRoot: DEFAULT_NWN_ROOT,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--sourceReport") {
      index += 1;
      options.sourceReport = requireValue(arg, argv[index]);
    } else if (arg === "--out" || arg === "--output") {
      index += 1;
      options.output = requireValue(arg, argv[index]);
    } else if (arg === "--nwnRoot") {
      index += 1;
      options.nwnRoot = requireValue(arg, argv[index]);
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
  console.log(`Usage: node scripts/create-retail-shadowsize-shadow-mdl-proof-artifact.mjs [options]

Options:
  --repoRoot <path>        Repository root. Defaults to the aurora-web root.
  --sourceReport <path>    Existing fx_shadow_s/m/l parser report.
  --out <path>             Output proof JSON path.
  --nwnRoot <path>         NWN install root for automatic source report generation.
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function nearlyEqual(left, right) {
  return Math.abs(left - right) < 0.000001;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function ensureSourceReport(repoRoot, sourceReportPath, nwnRoot) {
  if (existsSync(sourceReportPath)) {
    return {
      generated: false,
      status: "existing-source-report"
    };
  }
  const packageRoot = resolve(repoRoot, "backend");
  const tsNodeScript = resolve(
    packageRoot,
    "node_modules",
    "ts-node",
    "dist",
    "bin.js",
  );
  const scriptPath = resolve(repoRoot, SHADOW_MDL_AUDIT_SCRIPT);
  const result = spawnSync(
    process.execPath,
    [
      tsNodeScript,
      "--transpile-only",
      scriptPath,
      "--nwnRoot",
      nwnRoot,
      "--out",
      sourceReportPath,
    ],
    {
      cwd: packageRoot,
      encoding: "utf8",
      windowsHide: true,
    },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `Failed to generate source report: ${result.stderr || result.stdout || `exit ${result.status}`}`,
    );
  }
  if (!existsSync(sourceReportPath)) {
    throw new Error(`Source report generation completed but did not write: ${sourceReportPath}`);
  }
  return {
    generated: true,
    status: "generated-retail-shadow-mdl-source-report",
    stdout: result.stdout?.trim() ?? "",
  };
}

function validateEmitter(entry, expected) {
  const emitter = Array.isArray(entry.emitters)
    ? entry.emitters.find((candidate) => candidate.nodeName === expected.emitter)
    : null;
  const simulation = emitter?.simulation ?? {};
  const checks = [
    {
      key: "entryFound",
      passed: entry?.found === true,
      actual: entry?.found ?? null,
    },
    {
      key: "sourceFormat",
      passed: entry?.sourceFormat === "aurora-mdl-binary",
      actual: entry?.sourceFormat ?? null,
    },
    {
      key: "emitterFound",
      passed: emitter !== null,
      actual: emitter?.nodeName ?? null,
    },
    {
      key: "texture",
      passed: emitter?.texture === "fxpa_Dot01",
      actual: emitter?.texture ?? null,
    },
    {
      key: "emitterType",
      passed: emitter?.emitterType === "Single",
      actual: emitter?.emitterType ?? null,
    },
    {
      key: "renderMode",
      passed: emitter?.renderMode === "Billboard_to_Local_Z",
      actual: emitter?.renderMode ?? null,
    },
    {
      key: "blendMode",
      passed: emitter?.blendMode === "Normal",
      actual: emitter?.blendMode ?? null,
    },
    {
      key: "sizeStart",
      passed: nearlyEqual(simulation.sizeStart, expected.expectedSize),
      actual: simulation.sizeStart ?? null,
    },
    {
      key: "sizeEnd",
      passed: nearlyEqual(simulation.sizeEnd, expected.expectedSize),
      actual: simulation.sizeEnd ?? null,
    },
    {
      key: "alphaStart",
      passed: nearlyEqual(simulation.alphaStart, expected.expectedAlpha),
      actual: simulation.alphaStart ?? null,
    },
    {
      key: "alphaEnd",
      passed: nearlyEqual(simulation.alphaEnd, expected.expectedAlpha),
      actual: simulation.alphaEnd ?? null,
    },
    {
      key: "birthrate",
      passed: nearlyEqual(simulation.birthrate, 1),
      actual: simulation.birthrate ?? null,
    },
  ];

  return {
    shadowSizeRule: expected.shadowSizeRule,
    resref: expected.resref,
    model: expected.model,
    found: entry?.found === true,
    sha256: entry?.sha256 ?? null,
    size: entry?.size ?? null,
    sourceFormat: entry?.sourceFormat ?? null,
    emitter: emitter
      ? {
          nodeName: emitter.nodeName,
          texture: emitter.texture ?? null,
          emitterType: emitter.emitterType ?? null,
          renderMode: emitter.renderMode ?? null,
          blendMode: emitter.blendMode ?? null,
          position: emitter.position ?? null,
          simulation: {
            sizeStart: simulation.sizeStart ?? null,
            sizeEnd: simulation.sizeEnd ?? null,
            alphaStart: simulation.alphaStart ?? null,
            alphaEnd: simulation.alphaEnd ?? null,
            birthrate: simulation.birthrate ?? null,
          },
          sourceState: emitter.sourceState ?? null,
        }
      : null,
    checks,
    passed: checks.every((check) => check.passed),
  };
}

function buildProof(repoRoot, sourceReportPath, outputPath) {
  const sourceReport = readJson(sourceReportPath);
  const entriesByResref = new Map((sourceReport.report ?? []).map((entry) => [entry.resref, entry]));
  const emitterMetadata = EXPECTED_SHADOW_MDLS.map((expected) =>
    validateEmitter(entriesByResref.get(expected.resref), expected),
  );
  const metadataPassed = emitterMetadata.every((entry) => entry.passed);

  return {
    version: "aurora-retail-shadowsize-shadow-mdl-proof/v1",
    generatedAt: new Date().toISOString(),
    proofStatus: metadataPassed
      ? "source-backed-retail-shadowsize-shadow-mdl-selection-and-emitter-metadata-projection-parity-blocked"
      : "blocked-retail-shadowsize-shadow-mdl-parser-metadata-mismatch",
    passed: false,
    canonicalParityPromoted: false,
    sourceReport: toRepoRelative(repoRoot, sourceReportPath),
    output: toRepoRelative(repoRoot, outputPath),
    sourceReportStatus: sourceReport.status ?? null,
    sourceReportSearchedKeys: sourceReport.searchedKeys ?? [],
    selectionRule: {
      missingShadowSize: "no retail shadow MDL is synthesized",
      shadowSize0: "Fx_Shadow_S",
      shadowSize2: "Fx_Shadow_L",
      otherPresentNumericShadowSize: "Fx_Shadow_M",
    },
    sourceOwnerEvidence: {
      binary: "nwmain.exe",
      ownerFunction: "0x1408708c0..0x140870b0a",
      shadowSizeXref: "0x14087094c",
      recoveredSemantics:
        "reads placeables.2da ShadowSize and selects Fx_Shadow_S for 0, Fx_Shadow_L for 2, otherwise Fx_Shadow_M",
      auditSource:
        "backend/docs/aurora-reverse/light-shadow-audit-runtime-proof-2026-07-01.md:2500",
    },
    emitterMetadata,
    metadataPassed,
    projectionParityStatus:
      "blocked-retail-shadow-volume-projection-pixel-geometry-not-proven",
    blockedParityFacts: [
      "Fx_Shadow_S/M/L model selection and emitter metadata are source-backed",
      "world-space projection geometry, receiver alignment, and opacity tolerance are not proven by this artifact",
      "Aurora Web still must not promote retail shadow-volume/projection parity from this MDL metadata alone",
    ],
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const sourceReportPath = toAbsolute(repoRoot, options.sourceReport);
  const outputPath = toAbsolute(repoRoot, options.output);
  const sourceReportGeneration = ensureSourceReport(repoRoot, sourceReportPath, options.nwnRoot);
  const proof = buildProof(repoRoot, sourceReportPath, outputPath);
  proof.sourceReportGeneration = sourceReportGeneration;
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: proof.proofStatus,
        output: proof.output,
        metadataPassed: proof.metadataPassed,
        canonicalParityPromoted: proof.canonicalParityPromoted,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
