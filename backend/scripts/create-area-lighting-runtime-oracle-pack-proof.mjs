#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_OUTPUT = `${DEFAULT_ARTIFACT_DIR}/area-lighting-retail-runtime-oracle-pack-proof.json`;

const RUNTIME_CAPTURE_TARGETS = [
  {
    artifact: "retail-or-toolset-shadowvol-campfire.png",
    caseId: "shadowvol-campfire-pixel-geometry-opacity",
    source: "retail-or-toolset-window-pixels",
    captureKind: "single-reference-png",
  },
  {
    artifact: "retail-cross-lane-all-lanes-before-budget.png",
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    source: "retail-runtime-scene-pixels",
    captureKind: "before-budget-reference-png",
  },
  {
    artifact: "retail-cross-lane-all-lanes-after-budget.png",
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    source: "retail-runtime-scene-pixels",
    captureKind: "after-budget-reference-png",
  },
  {
    artifact: "retail-cross-lane-active-slots.json",
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    source: "retail-runtime-slot-dump-or-observed-oracle",
    captureKind: "structured-active-slot-oracle",
  },
  {
    artifact: "retail-progfx-priority-policy-before.png",
    caseId: "progfx-type4-priority-tie-and-zero-policy",
    source: "retail-runtime-scene-pixels",
    captureKind: "before-policy-reference-png",
  },
  {
    artifact: "retail-progfx-priority-policy-after.png",
    caseId: "progfx-type4-priority-tie-and-zero-policy",
    source: "retail-runtime-scene-pixels",
    captureKind: "after-policy-reference-png",
  },
  {
    artifact: "retail-progfx-proximity-distance-sweep-contact-sheet.png",
    caseId: "progfx-type4-proximity-threshold",
    source: "retail-runtime-distance-sweep-pixels",
    captureKind: "distance-sweep-contact-sheet",
  },
  {
    artifact: "retail-progfx-attach-scene-before.png",
    caseId: "progfx-type4-attach-to-scene-restore",
    source: "retail-runtime-scene-pixels",
    captureKind: "before-attach-reference-png",
  },
  {
    artifact: "retail-progfx-attach-scene-active.png",
    caseId: "progfx-type4-attach-to-scene-restore",
    source: "retail-runtime-scene-pixels",
    captureKind: "active-attach-reference-png",
  },
  {
    artifact: "retail-progfx-attach-scene-after-remove.png",
    caseId: "progfx-type4-attach-to-scene-restore",
    source: "retail-runtime-scene-pixels",
    captureKind: "after-remove-attach-reference-png",
  },
  {
    artifact: "retail-progfx-blindvision-before.png",
    caseId: "progfx-type4-blind-vision-pixels",
    source: "retail-runtime-vision-pixels",
    captureKind: "before-vision-reference-png",
  },
  {
    artifact: "retail-progfx-blindvision-active.png",
    caseId: "progfx-type4-blind-vision-pixels",
    source: "retail-runtime-vision-pixels",
    captureKind: "active-vision-reference-png",
  },
];

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    output: DEFAULT_OUTPUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--artifactDir") {
      index += 1;
      options.artifactDir = requireValue(arg, argv[index]);
    } else if (arg === "--out" || arg === "--output") {
      index += 1;
      options.output = requireValue(arg, argv[index]);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/create-area-lighting-runtime-oracle-pack-proof.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to aurora-web root.
  --artifactDir <path>    Runtime artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --out <path>            Proof JSON output. Defaults to ${DEFAULT_OUTPUT}
`);
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
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

function artifactPath(artifactDir, name) {
  return resolve(artifactDir, name);
}

function readJsonWithBom(path) {
  return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, ""));
}

function inspectPng(path) {
  const buffer = readFileSync(path);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    return {
      pngReadable: false,
      error: "invalid-png-signature",
      signature,
    };
  }
  return {
    pngReadable: true,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer.readUInt8(25),
    bitDepth: buffer.readUInt8(24),
  };
}

function jsonVerdict(json) {
  const status = String(json?.status ?? "");
  const passed = json?.passed === true || /^passed\b/i.test(status) || status === "passed";
  const failed =
    json?.passed === false ||
    json?.canonicalParityPromoted === false ||
    /^blocked\b/i.test(status) ||
    /^failed\b/i.test(status);
  return {
    readable: true,
    status: json?.status ?? null,
    passed,
    failed,
    canonicalParityPromoted: json?.canonicalParityPromoted ?? null,
  };
}

function inspectTarget(repoRoot, artifactDir, target) {
  const path = artifactPath(artifactDir, target.artifact);
  if (!existsSync(path)) {
    return {
      ...target,
      present: false,
      path: toRepoRelative(repoRoot, path),
      status: "missing",
    };
  }
  const buffer = readFileSync(path);
  const stats = statSync(path);
  const base = {
    ...target,
    present: true,
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    sha256: sha256(buffer),
    modifiedAt: stats.mtime.toISOString(),
  };
  const extension = extname(target.artifact).toLowerCase();
  if (extension === ".png") {
    const png = inspectPng(path);
    return {
      ...base,
      status:
        png.pngReadable && png.width > 0 && png.height > 0
          ? "present-readable-png"
          : "present-invalid-png",
      ...png,
    };
  }
  if (extension === ".json") {
    try {
      const json = readJsonWithBom(path);
      return {
        ...base,
        status: "present-readable-json",
        json: jsonVerdict(json),
        directRetailSlotDumpAvailable: json.directRetailSlotDumpAvailable ?? null,
        directRendererSlotOrderObserved: json.directRendererSlotOrderObserved ?? null,
        acceptedSlotsCount: Array.isArray(json.acceptedSlots) ? json.acceptedSlots.length : null,
        droppedSlotsCount: Array.isArray(json.droppedSlots) ? json.droppedSlots.length : null,
      };
    } catch (error) {
      return {
        ...base,
        status: "present-invalid-json",
        json: {
          readable: false,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
  return {
    ...base,
    status: "present-unsupported-extension",
  };
}

function groupByCase(targets) {
  const grouped = new Map();
  for (const target of targets) {
    const entries = grouped.get(target.caseId) ?? [];
    entries.push(target);
    grouped.set(target.caseId, entries);
  }
  return [...grouped.entries()].map(([caseId, artifacts]) => ({
    caseId,
    artifactCount: artifacts.length,
    presentArtifactCount: artifacts.filter((artifact) => artifact.present).length,
    readableArtifactCount: artifacts.filter((artifact) =>
      artifact.status === "present-readable-png" || artifact.status === "present-readable-json",
    ).length,
    artifacts: artifacts.map((artifact) => artifact.artifact),
  }));
}

function buildProof(options) {
  const repoRoot = resolve(options.repoRoot);
  const artifactDir = toAbsolute(repoRoot, options.artifactDir);
  const targets = RUNTIME_CAPTURE_TARGETS.map((target) =>
    inspectTarget(repoRoot, artifactDir, target),
  );
  const missing = targets.filter((target) => !target.present).map((target) => target.artifact);
  const invalid = targets
    .filter(
      (target) =>
        target.status === "present-invalid-png" || target.status === "present-invalid-json",
    )
    .map((target) => target.artifact);
  const pngTargets = targets.filter((target) => extname(target.artifact).toLowerCase() === ".png");
  const jsonTargets = targets.filter((target) => extname(target.artifact).toLowerCase() === ".json");
  const allPresentReadable = missing.length === 0 && invalid.length === 0;

  return {
    version: "aurora-area-lighting-retail-runtime-oracle-pack-proof/v1",
    generatedAt: new Date().toISOString(),
    status: allPresentReadable
      ? "runtime-oracle-pack-present-readable-parity-still-blocked"
      : "runtime-oracle-pack-incomplete-or-invalid",
    artifactDir: toRepoRelative(repoRoot, artifactDir),
    passed: false,
    canonicalParityPromoted: false,
    summary: {
      requiredRuntimeArtifactCount: RUNTIME_CAPTURE_TARGETS.length,
      presentRuntimeArtifactCount: targets.filter((target) => target.present).length,
      readableRuntimeArtifactCount: targets.filter(
        (target) =>
          target.status === "present-readable-png" || target.status === "present-readable-json",
      ).length,
      missingRuntimeArtifactCount: missing.length,
      invalidRuntimeArtifactCount: invalid.length,
      pngArtifactCount: pngTargets.length,
      jsonArtifactCount: jsonTargets.length,
      pngReadableCount: pngTargets.filter((target) => target.pngReadable).length,
      jsonReadableCount: jsonTargets.filter((target) => target.json?.readable).length,
    },
    cases: groupByCase(targets),
    targets,
    missingRuntimeArtifacts: missing,
    invalidRuntimeArtifacts: invalid,
    proofScope: {
      provesRequiredRuntimeArtifactsPresent: allPresentReadable,
      provesPngsAreReadable: pngTargets.every((target) => target.pngReadable),
      provesStructuredActiveSlotJsonReadable: jsonTargets.every((target) => target.json?.readable),
      provesDirectRetailActiveSlotDump:
        jsonTargets.some((target) => target.artifact === "retail-cross-lane-active-slots.json") &&
        jsonTargets.every((target) => target.directRetailSlotDumpAvailable === true),
      provesRetailPixelParity: false,
      provesCanonicalParity: false,
    },
    blockedParityFacts: [
      "This proof validates presence/readability/hash/dimensions of the 12 runtime oracle capture targets only.",
      "It does not prove active-light accepted/dropped lane owner order without a direct renderer slot dump or accepted classifier.",
      "It does not prove shadow-volume footprint/opacity parity without a case-specific retail-vs-web evaluator.",
      "It does not promote ProgFX priority/proximity/attach/blindvision parity from pixels alone.",
    ],
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const outputPath = toAbsolute(repoRoot, options.output);
  const proof = buildProof(options);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: proof.status,
        output: toRepoRelative(repoRoot, outputPath),
        summary: proof.summary,
        canonicalParityPromoted: proof.canonicalParityPromoted,
      },
      null,
      2,
    ),
  );
}

main();
