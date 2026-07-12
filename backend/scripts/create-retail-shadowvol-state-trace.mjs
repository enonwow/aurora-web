#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_ARTIFACT_DIR =
  "backend/docs/aurora-reverse/artifacts/light-shadow-2026-07-03-shadowvol-preview";

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    artifactDir: DEFAULT_ARTIFACT_DIR,
    sourceAudit: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--artifactDir") {
      index += 1;
      options.artifactDir = requireValue(arg, argv[index]);
    } else if (arg === "--sourceAudit") {
      index += 1;
      options.sourceAudit = requireValue(arg, argv[index]);
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
  console.log(`Usage: node scripts/create-retail-shadowvol-state-trace.mjs [options]

Options:
  --repoRoot <path>       Repository root. Defaults to aurora-web root.
  --artifactDir <path>    Artifact directory. Defaults to ${DEFAULT_ARTIFACT_DIR}
  --sourceAudit <path>    Existing audit JSON to read instead of running the Python extractor.
`);
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function parsePossiblyUtf16JsonBuffer(buffer) {
  const text =
    buffer[0] === 0xff && buffer[1] === 0xfe
      ? buffer.toString("utf16le")
      : buffer.includes(0)
        ? buffer.toString("utf16le")
        : buffer.toString("utf8");
  return JSON.parse(text.replace(/^\uFEFF/u, ""));
}

function readAuditFromFile(path) {
  if (!existsSync(path)) {
    throw new Error(`Missing source audit JSON: ${path}`);
  }
  return {
    audit: parsePossiblyUtf16JsonBuffer(readFileSync(path)),
    source: {
      kind: "source-audit-file",
      path,
      ...describeFile(path),
    },
  };
}

function runCurrentAudit(repoRoot) {
  const scriptPath = resolve(repoRoot, "backend/scripts/audit-retail-light-function-disasm.py");
  const stdout = execFileSync("python", [scriptPath], {
    cwd: repoRoot,
    encoding: "buffer",
    maxBuffer: 1024 * 1024 * 24,
    timeout: 120000,
    windowsHide: true,
  });
  return {
    audit: parsePossiblyUtf16JsonBuffer(stdout),
    source: {
      kind: "fresh-python-extractor",
      path: toRepoRelative(repoRoot, scriptPath),
      stdoutBytes: stdout.length,
    },
  };
}

function describeFile(path) {
  const stats = statSync(path);
  return {
    bytes: stats.size,
    modifiedAt: stats.mtime.toISOString(),
  };
}

function compactHits(hits, limit = 24) {
  return Array.isArray(hits)
    ? hits.slice(0, limit).map((hit) => ({
        line: hit.line ?? null,
        phase: hit.phase ?? undefined,
        semantic: hit.semantic ?? undefined,
        function: hit.function ?? undefined,
        target: hit.target ?? undefined,
        text: hit.text ?? "",
      }))
    : [];
}

function requireEvidence(shadowEvidence, key) {
  const evidence = shadowEvidence?.[key];
  if (!evidence || typeof evidence !== "object") {
    throw new Error(`Missing shadowVolumeProjectionEvidence.${key}`);
  }
  return evidence;
}

function buildTrace(repoRoot, auditSource, audit) {
  const shadowEvidence = audit.shadowVolumeProjectionEvidence;
  if (!shadowEvidence) {
    throw new Error("Missing shadowVolumeProjectionEvidence in audit output.");
  }
  const stencil = requireEvidence(shadowEvidence, "stencilOpSequenceEvidence");
  const renderState = requireEvidence(shadowEvidence, "renderStateWrapperEvidence");
  const blendDepthColor = requireEvidence(
    shadowEvidence,
    "blendDepthColorMaskWrapperEvidence",
  );
  const localDraw = requireEvidence(shadowEvidence, "localDrawStateOrderEvidence");
  const activeEnvelope = requireEvidence(
    shadowEvidence,
    "activeLightRenderEnvelopeEvidence",
  );

  return {
    version: "aurora-retail-shadowvol-state-trace/v1",
    generatedAt: new Date().toISOString(),
    status: "source-backed-retail-decompilation-state-trace-ready-pixel-parity-blocked",
    canonicalParityPromoted: false,
    source: auditSource.kind,
    sourceAudit:
      auditSource.kind === "source-audit-file"
        ? {
            path: toRepoRelative(repoRoot, auditSource.path),
            bytes: auditSource.bytes,
            modifiedAt: auditSource.modifiedAt,
          }
        : {
            path: auditSource.path,
            stdoutBytes: auditSource.stdoutBytes,
          },
    shadowVolumeProofStatus: shadowEvidence.proofStatus,
    trace: {
      stencil: {
        proofStatus: stencil.proofStatus,
        wrapperFunction: stencil.wrapperFunction,
        targetFunction: stencil.targetFunction,
        zPassOps: stencil.zPassOps ?? [],
        zFailOps: stencil.zFailOps ?? [],
        faceSlotMappingStatus: stencil.faceSlotMappingStatus ?? "",
        toolsetFaceOpTableEvidence: stencil.toolsetFaceOpTableEvidence ?? null,
        sequenceHits: compactHits(stencil.sequenceHits),
      },
      renderStateSlot3: {
        proofStatus: renderState.proofStatus,
        disableWrapper: renderState.disableWrapper,
        enableWrapper: renderState.enableWrapper,
        stateStackPush: renderState.stateStackPush,
        stateStackPop: renderState.stateStackPop,
        slotCapabilityStatus: renderState.slotCapabilityStatus,
        toolsetCapabilityEvidence: renderState.toolsetCapabilityEvidence ?? null,
        sequenceHits: compactHits(renderState.sequenceHits),
      },
      blendDepthColorMaskWrappers: {
        proofStatus: blendDepthColor.proofStatus,
        blendFuncWrapper: blendDepthColor.blendFuncWrapper,
        colorMaskWrapper: blendDepthColor.colorMaskWrapper,
        depthMaskWrapper: blendDepthColor.depthMaskWrapper,
        depthFuncWrapper: blendDepthColor.depthFuncWrapper,
        blendFuncFacade: blendDepthColor.blendFuncFacade,
        colorMaskFacade: blendDepthColor.colorMaskFacade,
        depthMaskFacade: blendDepthColor.depthMaskFacade,
        depthFuncFacade: blendDepthColor.depthFuncFacade,
        facadeWrapperHits: compactHits(blendDepthColor.facadeWrapperHits),
      },
      localDrawOrder: {
        proofStatus: localDraw.proofStatus,
        function: localDraw.function,
        lineWindow: localDraw.lineWindow,
        orderedCallSequence: localDraw.orderedCallSequence ?? [],
        expectedCallSequence: localDraw.expectedCallSequence ?? [],
        localBlendDepthColorMaskCallHits: localDraw.localBlendDepthColorMaskCallHits ?? [],
        blockedSemantics: localDraw.blockedSemantics ?? [],
      },
      activeLightEnvelope: {
        proofStatus: activeEnvelope.proofStatus,
        function: activeEnvelope.function,
        lineWindow: activeEnvelope.lineWindow,
        activeLightGlobal: activeEnvelope.activeLightGlobal,
        renderDispatchSlots: activeEnvelope.renderDispatchSlots ?? [],
        stateWrapperHits: compactHits(activeEnvelope.stateWrapperHits),
        vtableDispatchHits: compactHits(activeEnvelope.vtableDispatchHits),
        colorDepthMaskCallHits: activeEnvelope.colorDepthMaskCallHits ?? [],
      },
    },
    acceptedSourceBackedFacts: [
      "retail/decompiled shadow-volume stencil op sequence and face-slot mapping are extracted",
      "render-state slot 3 is mapped to GL_CULL_FACE through nwtoolset.exe jump-table evidence",
      "blend/depth/color-mask wrapper and facade identities are extracted",
      "local draw order in FUN_00a878f8 is extracted",
      "active-light render envelope FUN_00a82464 is extracted",
    ],
    blockedRuntimeFacts: [
      "exact retail/toolset shadow-volume pixels",
      "shadow-volume opacity and receiver footprint comparison",
      "indirect vtable inherited render-state parity beyond the extracted local/envelope windows",
    ],
    blocker:
      "This is a decompilation-backed retail state trace input. It does not compare Aurora Web pixels or promote retail parity without the matching web trace and comparison report.",
  };
}

try {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const artifactDir = toAbsolute(repoRoot, options.artifactDir);
  mkdirSync(artifactDir, { recursive: true });
  const auditBundle = options.sourceAudit
    ? readAuditFromFile(toAbsolute(repoRoot, options.sourceAudit))
    : runCurrentAudit(repoRoot);
  const trace = buildTrace(repoRoot, auditBundle.source, auditBundle.audit);
  const outputPath = resolve(artifactDir, "retail-shadowvol-state-trace.json");
  writeFileSync(outputPath, `${JSON.stringify(trace, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: trace.status,
        output: toRepoRelative(repoRoot, outputPath),
        source: trace.source,
        shadowVolumeProofStatus: trace.shadowVolumeProofStatus,
        stencilProofStatus: trace.trace.stencil.proofStatus,
        activeLightEnvelopeProofStatus: trace.trace.activeLightEnvelope.proofStatus,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
