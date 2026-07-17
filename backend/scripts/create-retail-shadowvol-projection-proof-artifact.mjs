#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";
const DEFAULT_AUDIT = `${DEFAULT_ARTIFACT_DIR}/audit-retail-light-function-disasm-2026-07-03.json`;
const DEFAULT_OUTPUT = `${DEFAULT_ARTIFACT_DIR}/retail-shadowvol-projection-proof.json`;

const REQUIRED_SHADERS = ["vs_shadowvol", "fs_shadowvol"];
const REQUIRED_BUCKETS = ["0xd", "0xe", "0xb", "0xc"];

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    audit: DEFAULT_AUDIT,
    output: DEFAULT_OUTPUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--audit") {
      index += 1;
      options.audit = requireValue(arg, argv[index]);
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
  console.log(`Usage: node scripts/create-retail-shadowvol-projection-proof-artifact.mjs [options]

Options:
  --repoRoot <path>  Repository root. Defaults to aurora-web root.
  --audit <path>     audit-retail-light-function-disasm JSON. Defaults to ${DEFAULT_AUDIT}
  --out <path>       Proof JSON output. Defaults to ${DEFAULT_OUTPUT}
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

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function describeFile(repoRoot, path) {
  const stats = statSync(path);
  return {
    path: toRepoRelative(repoRoot, path),
    bytes: stats.size,
    sha256: sha256(readFileSync(path)),
    modifiedAt: stats.mtime.toISOString(),
  };
}

function readJsonWithBom(path) {
  const buffer = readFileSync(path);
  const text =
    buffer[0] === 0xff && buffer[1] === 0xfe
      ? buffer.toString("utf16le")
      : buffer.includes(0)
        ? buffer.toString("utf16le")
        : buffer.toString("utf8");
  return JSON.parse(text.replace(/^\uFEFF/u, ""));
}

function listIncludesAll(actual, required) {
  const set = new Set(Array.isArray(actual) ? actual : []);
  return required.every((entry) => set.has(entry));
}

function proofStatusIsSourceBacked(status) {
  return typeof status === "string" && status.startsWith("source-backed-");
}

function compactHits(hits, limit = 8) {
  return Array.isArray(hits) ? hits.slice(0, limit) : [];
}

function buildProof(options) {
  const repoRoot = resolve(options.repoRoot);
  const auditPath = toAbsolute(repoRoot, options.audit);
  if (!existsSync(auditPath)) {
    return {
      version: "aurora-retail-shadowvol-projection-proof/v1",
      generatedAt: new Date().toISOString(),
      status: "blocked-retail-light-disasm-audit-missing",
      auditFile: { path: toRepoRelative(repoRoot, auditPath), missing: true },
      canonicalParityPromoted: false,
      proofScope: defaultProofScope(),
    };
  }

  const audit = readJsonWithBom(auditPath);
  const evidence = audit.shadowVolumeProjectionEvidence ?? {};
  const checks = [
    {
      key: "projectionProofStatus",
      passed:
        proofStatusIsSourceBacked(evidence.proofStatus) &&
        String(evidence.proofStatus).includes("retail-parity-blocked"),
      value: evidence.proofStatus ?? null,
    },
    {
      key: "shadowShaders",
      passed: listIncludesAll(evidence.shaderNamesFound, REQUIRED_SHADERS),
      required: REQUIRED_SHADERS,
      value: evidence.shaderNamesFound ?? [],
    },
    {
      key: "renderBuckets",
      passed: listIncludesAll(evidence.renderBuckets, REQUIRED_BUCKETS),
      required: REQUIRED_BUCKETS,
      value: evidence.renderBuckets ?? [],
    },
    {
      key: "casterGeometry",
      passed: proofStatusIsSourceBacked(evidence.casterBufferGeometryEvidence?.proofStatus),
      value: evidence.casterBufferGeometryEvidence?.proofStatus ?? null,
    },
    {
      key: "stencilOps",
      passed: proofStatusIsSourceBacked(evidence.stencilOpSequenceEvidence?.proofStatus),
      value: evidence.stencilOpSequenceEvidence?.proofStatus ?? null,
    },
    {
      key: "localDrawStateOrder",
      passed: proofStatusIsSourceBacked(evidence.localDrawStateOrderEvidence?.proofStatus),
      value: evidence.localDrawStateOrderEvidence?.proofStatus ?? null,
    },
    {
      key: "shaderUniforms",
      passed: proofStatusIsSourceBacked(evidence.shaderUniformEvidence?.proofStatus),
      value: evidence.shaderUniformEvidence?.proofStatus ?? null,
    },
  ];
  const sourceBacked = checks.every((check) => check.passed);
  const remainingBlockedSemantics = Array.isArray(evidence.remainingBlockedSemantics)
    ? evidence.remainingBlockedSemantics
    : [];

  return {
    version: "aurora-retail-shadowvol-projection-proof/v1",
    generatedAt: new Date().toISOString(),
    status: sourceBacked
      ? "source-backed-shadowvol-projection-caster-path-retail-pixel-parity-blocked"
      : "partial-shadowvol-projection-caster-path-proof",
    canonicalParityPromoted: false,
    auditFile: describeFile(repoRoot, auditPath),
    source: evidence.source ?? null,
    proofStatus: evidence.proofStatus ?? null,
    shaderNamesFound: evidence.shaderNamesFound ?? [],
    renderBuckets: evidence.renderBuckets ?? [],
    recoveredInputs: evidence.recoveredInputs ?? [],
    sourceAnchors: {
      shaderProgram: "decompiled_all.c:913917",
      lightProfile: "decompiled_all.c:913930-913955",
      zPassStencilOps: "decompiled_all.c:913986-913987",
      zFailStencilOps: "decompiled_all.c:914032-914033",
      casterGeometry: "decompiled_all.c:888319-888403",
      drawWrapper: "decompiled_all.c:904108-904112",
      drawDispatch: "decompiled_all.c:902867-902912",
      renderStateOrder: "decompiled_all.c:913929-914033",
    },
    checks,
    selectedEvidence: {
      renderPathHits: compactHits(evidence.shadowVolumeRenderPathHits),
      lightProfileHits: compactHits(evidence.shadowVolumeLightProfileHits),
      casterGeometry: {
        proofStatus: evidence.casterBufferGeometryEvidence?.proofStatus ?? null,
        perSourceVertexRecords: evidence.casterBufferGeometryEvidence?.perSourceVertexRecords ?? null,
        indicesPerCasterEdge: evidence.casterBufferGeometryEvidence?.indicesPerCasterEdge ?? null,
        vertexTransformHits: compactHits(
          evidence.casterBufferGeometryEvidence?.sourceVertexTransformHits,
          4,
        ),
        pairedVertexWriteHits: compactHits(
          evidence.casterBufferGeometryEvidence?.pairedVertexWriteHits,
          8,
        ),
        indexPatternHits: compactHits(evidence.casterBufferGeometryEvidence?.indexPatternHits, 12),
      },
      stencilOps: {
        proofStatus: evidence.stencilOpSequenceEvidence?.proofStatus ?? null,
        zPassOps: evidence.stencilOpSequenceEvidence?.zPassOps ?? [],
        zFailOps: evidence.stencilOpSequenceEvidence?.zFailOps ?? [],
        sequenceHits: compactHits(evidence.stencilOpSequenceEvidence?.sequenceHits, 8),
        toolsetFaceOpTableProof:
          evidence.stencilOpSequenceEvidence?.toolsetFaceOpTableEvidence?.proofStatus ?? null,
      },
      localDrawStateOrder: {
        proofStatus: evidence.localDrawStateOrderEvidence?.proofStatus ?? null,
        expectedCallSequence:
          evidence.localDrawStateOrderEvidence?.expectedCallSequence ?? [],
      },
      shaderUniforms: {
        proofStatus: evidence.shaderUniformEvidence?.proofStatus ?? null,
        transformUpload: evidence.shaderUniformEvidence?.transformUpload ?? null,
        shaderProgramBind: evidence.shaderUniformEvidence?.shaderProgramBind ?? null,
        uniformSlot0: evidence.shaderUniformEvidence?.uniformSlot0 ?? null,
        uniformSlot1: evidence.shaderUniformEvidence?.uniformSlot1 ?? null,
      },
    },
    remainingBlockedSemantics,
    blockedParityFacts: [
      ...remainingBlockedSemantics,
      "retail shadow-volume projection pixel geometry is not accepted without a normalized retail-vs-web evaluator",
      "retail receiver footprint and ShadowOpacity tolerance remain unproven by this source extractor",
    ],
    proofScope: {
      ...defaultProofScope(),
      provesSourceBackedProjectionCasterPath: sourceBacked,
    },
  };
}

function defaultProofScope() {
  return {
    provesSourceBackedProjectionCasterPath: false,
    provesRetailPixels: false,
    provesProjectionPixelParity: false,
    provesShadowOpacityTolerance: false,
    provesCanonicalParity: false,
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
        shaderNamesFound: proof.shaderNamesFound ?? [],
        renderBuckets: proof.renderBuckets ?? [],
        canonicalParityPromoted: proof.canonicalParityPromoted,
      },
      null,
      2,
    ),
  );
}

main();
