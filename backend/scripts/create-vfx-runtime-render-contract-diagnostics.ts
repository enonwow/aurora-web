import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import type { AuroraMdlEmitterNode } from "../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import { buildAuroraVfxRuntimeRenderContract } from "../src/modules/vfx/domain/aurora-vfx-render-contract";
import {
  buildAuroraEmitterRuntimeSnapshot,
  createAuroraEmitterRuntimeState,
  tickAuroraEmitterRuntime
} from "../src/modules/vfx/domain/aurora-vfx-runtime-state";

const repoRoot = path.resolve(__dirname, "..", "..");
const defaultOutPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-96/vfx-runtime-render-contract-diagnostics.json"
);

const args = parseArgs(process.argv.slice(2));
const outPath = path.resolve(repoRoot, args.out ?? defaultOutPath);
const report = buildReport(outPath);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      result: report.result,
      report: toRepoPath(outPath),
      summary: report.summary
    },
    null,
    2
  )
);

if (report.result !== "runtime-render-contract-diagnostics-passed") {
  process.exitCode = 1;
}

function buildReport(outPathForReport: string) {
  const cases = [buildChunkModelLaneContractCase()];
  const failedCases = cases.filter((entry) => entry.failedChecks.length > 0);
  const canonicalPromotionAttempts = cases.filter(
    (entry) => entry.canonicalParityPromoted === true
  );

  return {
    version: "aurora-vfx-runtime-render-contract-diagnostics/v1",
    generatedAt: new Date().toISOString(),
    artifact: toRepoPath(outPathForReport),
    oracle: "local-runtime-render-contract-diagnostic-snapshots",
    result:
      failedCases.length === 0 && canonicalPromotionAttempts.length === 0
        ? "runtime-render-contract-diagnostics-passed"
        : "runtime-render-contract-diagnostics-failed",
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true,
    summary: {
      caseCount: cases.length,
      passedCaseCount: cases.length - failedCases.length,
      failedCaseCount: failedCases.length,
      failedCheckCount: failedCases.reduce((sum, entry) => sum + entry.failedChecks.length, 0),
      canonicalPromotionAttemptCount: canonicalPromotionAttempts.length,
      drawLanes: [...new Set(cases.map((entry) => entry.contract.drawLane))].sort()
    },
    cases,
    blockers: [
      "retail_capture_required_for_canonical_parity",
      "retail_runtime_tick_dump_required_for_canonical_parity",
      "retail_render_contract_snapshot_required_for_canonical_parity",
      "retail_chunk_model_resource_required_for_canonical_parity",
      "local_runtime_render_contract_diagnostics_are_not_retail_evidence"
    ],
    notes: [
      "These snapshots exercise local backend runtime-to-render-contract integration only.",
      "They do not prove retail chunk model resource resolution, browser output, or canonical parity."
    ]
  };
}

function buildChunkModelLaneContractCase() {
  const emitter = chunkEmitter("progfx_type9_chunk_model_pending");
  const runtimeState = tickAuroraEmitterRuntime(
    createAuroraEmitterRuntimeState(emitter, { family: "Chunk", seed: 96 }),
    0.25
  );
  const runtimeSnapshot = buildAuroraEmitterRuntimeSnapshot(runtimeState);
  const contract = buildAuroraVfxRuntimeRenderContract({
    runtimeState,
    sourceEmitter: emitter,
    collapseChunkToTextureLane: true
  });
  const diagnosticCodes = contract.diagnostics.map((diagnostic) => diagnostic.code);

  return caseResult({
    caseId: "chunk-model-lane-runtime-render-contract",
    fixtureId: "vfx-retail-chunk-particles-progfx-type9",
    tickPlan: [0.25],
    runtimeSnapshot,
    contract,
    checks: [
      check("runtime produced two local chunk placeholders", runtimeSnapshot.activeParticles.length === 2),
      check("render contract keeps chunk model lane", contract.drawLane === "chunk_model"),
      check("chunk lane preserves chunkName", contract.chunkLane?.chunkName === emitter.chunkName),
      check("chunk lane has no textured draw particles", contract.drawParticleCount === 0),
      check("chunk lane has no textured draw vertices", contract.drawVertexCount === 0),
      check("chunk lane has no textured draw records", contract.drawRecords.length === 0),
      check("collapse attempt was diagnosed", diagnosticCodes.includes("VFX_TEXTURE_FIELD_LANE_COLLAPSED")),
      check(
        "runtime chunk placeholder diagnostic survived render contract merge",
        diagnosticCodes.includes("VFX_CHUNK_LOCAL_PLACEHOLDER_DIAGNOSTIC")
      ),
      check(
        "retail chunk resource blocker remains present",
        diagnosticCodes.includes("VFX_CHUNK_RETAIL_RESOURCE_CAPTURE_REQUIRED")
      )
    ]
  });
}

function caseResult(input: {
  caseId: string;
  fixtureId: string;
  tickPlan: number[];
  runtimeSnapshot: ReturnType<typeof buildAuroraEmitterRuntimeSnapshot>;
  contract: ReturnType<typeof buildAuroraVfxRuntimeRenderContract>;
  checks: CheckResult[];
}) {
  const failedChecks = input.checks
    .filter((entry) => !entry.passed)
    .map((entry) => entry.name);

  return {
    caseId: input.caseId,
    fixtureId: input.fixtureId,
    tickPlanSeconds: input.tickPlan,
    status: failedChecks.length === 0 ? "passed" : "failed",
    failedChecks,
    checkResults: input.checks,
    runtimeSnapshotFingerprint: fingerprint(input.runtimeSnapshot),
    renderContractFingerprint: fingerprint(input.contract),
    runtimeSnapshot: input.runtimeSnapshot,
    contract: input.contract,
    canonicalParityPromoted: false,
    localOnlyNotRetailEvidence: true
  };
}

interface CheckResult {
  name: string;
  passed: boolean;
}

function check(name: string, passed: boolean): CheckResult {
  return { name, passed };
}

function chunkEmitter(chunkName: string): AuroraMdlEmitterNode {
  return {
    nodeKind: "emitter",
    nodeName: "emit_chunk_type9",
    sourceFormat: "aurora-mdl-ascii",
    sourceModelObjectKey: "modules/current/models/progfx_type9_chunk_model_pending.mdl",
    provenance: {
      sourceFormat: "aurora-mdl-ascii",
      sourceModelObjectKey: "modules/current/models/progfx_type9_chunk_model_pending.mdl"
    },
    emitterType: "Chunk",
    emitterTypeRaw: "Chunk",
    texture: "progfx_type9_texture_token_preserved",
    chunkName,
    renderMode: "Billboard_to_World_Z",
    renderModeRaw: "Billboard_to_World_Z",
    blendMode: "Normal",
    blendModeRaw: "Normal",
    atlas: {
      effectiveXGrid: 1,
      effectiveYGrid: 1,
      frameStart: 0,
      frameEnd: 0
    },
    simulation: {
      birthrate: 2,
      lifeExp: 1,
      velocity: 0,
      randvel: 0,
      spread: 0,
      grav: 0,
      colorStart: [1, 1, 1],
      colorMid: [1, 1, 1],
      colorEnd: [1, 1, 1],
      alphaStart: 1,
      alphaMid: 1,
      alphaEnd: 1,
      sizeStart: 1,
      sizeMid: 1,
      sizeEnd: 1
    },
    sourceState: {},
    directRows: [],
    keyRows: [],
    bezierKeyRows: [],
    colorTimelines: {}
  };
}

function fingerprint(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function parseArgs(rawArgs: string[]): { out?: string } {
  const parsed: { out?: string } = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--out") {
      parsed.out = rawArgs[++index];
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: ts-node --transpile-only scripts/create-vfx-runtime-render-contract-diagnostics.ts [--out path]"
      );
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function toRepoPath(filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, "/");
}
