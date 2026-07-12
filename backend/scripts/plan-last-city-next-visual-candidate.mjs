#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const artifactRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts"
);
const defaultBaselineDir = resolve(
  artifactRoot,
  "last-city-apartment-concept-parity",
  "tilemap58-current-contract-after-tilemap70-20260706"
);
const defaultBaselineReportPath = resolve(defaultBaselineDir, "concept-parity-report.json");
const defaultConceptMapPath = resolve(
  artifactRoot,
  "last-city-apartment-area",
  "concept-placeable-tile-map.json"
);
const defaultOutDir = resolve(
  artifactRoot,
  "last-city-apartment-concept-parity",
  "next-visual-candidate-plan-20260706"
);

const options = parseArgs(process.argv.slice(2));
const baselineReportPath = resolveMaybe(options.baselineReport ?? defaultBaselineReportPath);
const conceptMapPath = resolveMaybe(options.map ?? defaultConceptMapPath);
const outDir = resolveMaybe(options.outDir ?? defaultOutDir);
const label = sanitizeSegment(options.label ?? "next-visual-candidate-plan-20260706");

assertFile(baselineReportPath, "baseline report");
assertFile(conceptMapPath, "concept map");
mkdirSync(outDir, { recursive: true });

const baseline = readJson(baselineReportPath);
const baselineDir = dirname(baselineReportPath);
const layerBlame = readJson(resolveFromReport(baseline, "layerBlameMapJsonPath", "layer-blame-map.json"));
const decisionMatrix = readJson(resolveFromReport(baseline, "iterationDecisionMatrixJsonPath", "iteration-decision-matrix.json"));
const fastPlan = readJson(resolveFromReport(baseline, "fastPlanJsonPath", "fast-iteration-plan.json"));
const operatorScorecard = readOptionalJson(
  resolveFromReport(baseline, "operatorScorecardJsonPath", "operator-scorecard.json")
);
const conceptMap = readJson(conceptMapPath);
const placeableRows = readOptionalCsv(baseline.outputs?.placeableInstancesPath);

const topVisualPriority = findTopVisualPriority(baseline.priorityQueue ?? []);
const tileId = topVisualPriority?.area ?? "NW";
const layerTile = findTile(layerBlame.tiles, tileId);
const matrixTile = findTile(decisionMatrix.tiles, tileId);
const fastTile = findTile(fastPlan.tiles, tileId);
const conceptTile = findTile(conceptMap.tiles, tileId);
const currentTileRows = placeableRows.filter((row) => rowTile(row) === tileId);
const currentTags = new Set(currentTileRows.map((row) => String(row.tag ?? "").toLowerCase()));

const rejectedCandidateOptions = buildRejectedCandidateOptions({
  currentTags,
  conceptTile,
  matrixTile
});
const blockedTokens = collectBlockedTokens({ layerTile, matrixTile, conceptTile, operatorScorecard });
const nextCandidateContract = buildNextCandidateContract({
  tileId,
  topVisualPriority,
  layerTile,
  matrixTile,
  fastTile,
  conceptTile,
  rejectedCandidateOptions,
  blockedTokens
});

const report = {
  version: "last-city-next-visual-candidate-plan/v1",
  generatedAt: new Date().toISOString(),
  label,
  safety: {
    launchesToolset: false,
    mutatesModule: false,
    usesGlobalCursor: false,
    method:
      "offline planner from concept screenshot delta, concept tile map, layer blame, decision matrix, and current placeable map"
  },
  baseline: {
    reportPath: baselineReportPath,
    modulePath: baseline.modulePath,
    status: baseline.status,
    visualScore: baseline.scores?.visualScore ?? null,
    visualResult: baseline.scores?.visualResult ?? null,
    preflightStatus: baseline.scores?.preflightStatus ?? null,
    baselineIdentity: baseline.baselineIdentity ?? null
  },
  selectedTile: {
    tile: tileId,
    conceptRole: conceptTile?.conceptRole ?? null,
    topPriority: topVisualPriority,
    layerDecision: {
      currentDecision: layerTile?.currentDecision ?? null,
      primaryLayer: layerTile?.primaryLayer ?? null,
      confidence: layerTile?.confidence ?? null,
      safeNext: layerTile?.safeNext ?? null,
      rejectIfMixedWith: layerTile?.rejectIfMixedWith ?? []
    },
    fastPlan: {
      decision: fastTile?.decision ?? null,
      reason: fastTile?.reason ?? null,
      targetZones: fastTile?.targetZones ?? []
    },
    currentPlaceableCount: currentTileRows.length,
    currentKnownTags: Array.from(currentTags).sort()
  },
  blockedTokens,
  rejectedCandidateOptions,
  nextCandidateContract,
  outputs: {
    jsonPath: resolve(outDir, `${label}.json`),
    markdownPath: resolve(outDir, `${label}.md`)
  }
};

writeFileSync(report.outputs.jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
writeFileSync(report.outputs.markdownPath, renderMarkdown(report), "utf8");
console.log(
  JSON.stringify(
    {
      status: report.nextCandidateContract.status,
      tile: report.selectedTile.tile,
      nextLayer: report.nextCandidateContract.allowedLayer,
      jsonPath: report.outputs.jsonPath,
      markdownPath: report.outputs.markdownPath
    },
    null,
    2
  )
);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
    } else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}

function resolveMaybe(value) {
  return value ? resolve(value) : null;
}

function sanitizeSegment(value) {
  return String(value ?? "plan")
    .replace(/[^a-z0-9_.-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96) || "plan";
}

function assertFile(path, label) {
  if (!path || !existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
}

function readJson(path) {
  assertFile(path, basename(path));
  return JSON.parse(readFileSync(path, "utf8"));
}

function readOptionalJson(path) {
  return path && existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

function resolveFromReport(report, outputKey, fallbackFileName) {
  return report.outputs?.[outputKey] ?? resolve(baselineDir, fallbackFileName);
}

function findTopVisualPriority(priorityQueue) {
  return priorityQueue.find((entry) => String(entry.id ?? "").startsWith("visual_")) ?? null;
}

function findTile(tiles, tileId) {
  if (!Array.isArray(tiles)) {
    return null;
  }
  return tiles.find((tile) => tile.tile === tileId || tile.id === tileId) ?? null;
}

function rowTile(row) {
  const x = Number(row.x);
  const y = Number(row.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  if (x < 10 && y >= 10) return "NW";
  if (x >= 10 && x < 20 && y >= 10) return "N";
  if (x >= 20 && y >= 10) return "NE";
  if (x < 10 && y < 10) return "SW";
  if (x >= 10 && x < 20 && y < 10) return "S";
  if (x >= 20 && y < 10) return "SE";
  return null;
}

function readOptionalCsv(path) {
  if (!path || !existsSync(path)) {
    return [];
  }
  const lines = readFileSync(path, "utf8").split(/\r?\n/u).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (quoted && char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function buildRejectedCandidateOptions({ currentTags, conceptTile, matrixTile }) {
  const blockedDirections = conceptTile?.visualIntent?.blockedDirections ?? [];
  const blockedGrowth = conceptTile?.visualIntent?.blockedVisualTransformGrowth ?? [];
  const blockedLessons = matrixTile?.blockedLessons ?? [];
  const options = [
    {
      id: "repeat_simple_tile_id_swap",
      verdict: "rejected",
      reason: "NW simple tile-id/orientation swaps are a documented regression series.",
      evidence: findBlockedEvidence(blockedLessons, "nw_simple_tile_id_swap_regression_series")
    },
    {
      id: "grow_existing_vt_bundle",
      verdict: "rejected",
      reason: "Tilemap64 regressed after growing the same NW rugs/screen/wall VT bundle.",
      evidence: [
        ...blockedGrowth.map((entry) => entry.id),
        findBlockedEvidence(blockedLessons, "nw_existing_vt_growth_bundle")
      ].filter(Boolean)
    },
    {
      id: "retry_vt_textile_or_table",
      verdict: "rejected",
      reason: "VT textile/table directions include quarantined AV cases.",
      evidence: blockedDirections
        .filter((entry) => String(entry.class ?? "").includes("visual_transform"))
        .map((entry) => entry.id)
    },
    {
      id: "add_more_small_clutter",
      verdict: "rejected",
      reason: "NW anchor coverage is already clean; image delta points at large read/material, not small clutter.",
      evidence: ["anchorScore=1", "anchorFailed=0", "anchorPartial=0"]
    },
    {
      id: "study_left_dark_window_parity",
      verdict: currentTags.has("witcher_window_4_study_left_dark_window_parity")
        ? "already_present"
        : "candidate_possible",
      reason: "This structural/window silhouette is useful only if absent; tilemap58 already contains it.",
      evidence: ["tag=witcher_window_4_study_left_dark_window_parity"]
    },
    {
      id: "study_lounge_luma_shadow_final",
      verdict: "requires_separate_crash_risk_gate",
      reason:
        "This would address luma directly, but q_314/q_floor_20 style floor overlays are treated as heavy overlay risk and cannot be slipped in as a normal placeable pass.",
      evidence: ["template=q_314", "tag=study_lounge_luma_shadow_final", "risk=heavy-overlay"]
    }
  ];
  return options;
}

function findBlockedEvidence(blockedLessons, token) {
  const hit = blockedLessons.find((lesson) => (lesson.blocks ?? []).includes(token));
  return hit ? `${hit.id}:${token}` : null;
}

function collectBlockedTokens({ layerTile, matrixTile, conceptTile, operatorScorecard }) {
  const tokens = new Set();
  for (const source of [
    ...(matrixTile?.blockedLessons ?? []),
    ...(layerTile?.tileLayer?.blockedExperiments ?? []),
    ...(layerTile?.visualTransformLayer?.blockedExperiments ?? []),
    ...(conceptTile?.visualIntent?.blockedDirections ?? []),
    ...(operatorScorecard?.blockedMoves ?? [])
  ]) {
    for (const token of source.blocks ?? []) {
      tokens.add(token);
    }
    if (source.id) {
      tokens.add(source.id);
    }
    if (source.class) {
      tokens.add(source.class);
    }
  }
  return Array.from(tokens).sort();
}

function buildNextCandidateContract({
  tileId,
  topVisualPriority,
  layerTile,
  matrixTile,
  fastTile,
  conceptTile,
  rejectedCandidateOptions,
  blockedTokens
}) {
  const hasOnlyRejectedOrPresent = rejectedCandidateOptions.every((option) =>
    ["rejected", "already_present", "requires_separate_crash_risk_gate"].includes(option.verdict)
  );
  const status = hasOnlyRejectedOrPresent
    ? "needs_explicit_single_delta_design_before_module_generation"
    : "ready_to_select_single_delta_candidate";
  return {
    status,
    tile: tileId,
    allowedLayer: layerTile?.safeNext?.allowedChange ?? "nw_material_silhouette_or_existing_vt_only",
    requiredEvidence: "fresh visual screenshot comparison is required before promotion",
    rationale: topVisualPriority?.issue ?? fastTile?.reason ?? null,
    keepStable: [
      `Tile_ID ${layerTile?.layout?.tileId ?? conceptTile?.tile?.tileId ?? "current"}`,
      `Tile_Orientation ${layerTile?.layout?.orientation ?? "current"}`,
      "area lighting",
      "placeable Bearing",
      "anchor positions unless the candidate explicitly names one existing object"
    ],
    rejectIfMixedWith: Array.from(
      new Set([
        ...(layerTile?.rejectIfMixedWith ?? []),
        ...(operatorRejectIfMixedWithFallback()),
        "retry_after_access_violation",
        "simple_tile_id_swap",
        "new_unrelated_placeables",
        "vt_growth_bundle"
      ])
    ),
    blockedTokens,
    beforeGeneratingModule: [
      "Name exactly one object/template/material delta and one target subcell.",
      "Reject it if it matches any blocked token or rejected candidate family in this report.",
      "Run crash-risk/concept-map/preflight offline; preflight must remain Toolset dry-only.",
      "Do not launch Toolset unless the user explicitly approves a supervised single probe."
    ],
    candidateShape:
      "single NW material/silhouette delta, preferably non-overlay and non-VT-growth; no tile layout, lighting, Bearing, or clutter bundle"
  };
}

function operatorRejectIfMixedWithFallback() {
  return ["tile_id", "tile_orientation", "area_lighting", "new_visual_transform_bundle"];
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Last City Next Visual Candidate Plan");
  lines.push("");
  lines.push(`Status: \`${report.nextCandidateContract.status}\``);
  lines.push(`Tile: \`${report.selectedTile.tile}\` (${report.selectedTile.conceptRole ?? "unknown"})`);
  lines.push(`Baseline module: \`${report.baseline.modulePath}\``);
  lines.push(`Visual score: \`${report.baseline.visualScore ?? "unknown"}\``);
  lines.push("");
  lines.push("## Evidence");
  lines.push("");
  lines.push(`- Top visual priority: ${report.selectedTile.topPriority?.issue ?? "missing"}`);
  lines.push(`- Primary layer: \`${report.selectedTile.layerDecision.primaryLayer ?? "missing"}\``);
  lines.push(`- Fast-plan decision: \`${report.selectedTile.fastPlan.decision ?? "missing"}\``);
  lines.push(`- Current NW placeables: \`${report.selectedTile.currentPlaceableCount}\``);
  lines.push("");
  lines.push("## Contract");
  lines.push("");
  lines.push(`Allowed layer: \`${report.nextCandidateContract.allowedLayer}\``);
  lines.push(`Candidate shape: ${report.nextCandidateContract.candidateShape}`);
  lines.push("");
  lines.push("Keep stable:");
  for (const item of report.nextCandidateContract.keepStable) {
    lines.push(`- ${item}`);
  }
  lines.push("");
  lines.push("Reject if mixed with:");
  for (const item of report.nextCandidateContract.rejectIfMixedWith) {
    lines.push(`- \`${item}\``);
  }
  lines.push("");
  lines.push("## Rejected Options");
  lines.push("");
  for (const option of report.rejectedCandidateOptions) {
    lines.push(`- \`${option.id}\`: \`${option.verdict}\` - ${option.reason}`);
  }
  lines.push("");
  lines.push("## Before Generating A Module");
  lines.push("");
  for (const step of report.nextCandidateContract.beforeGeneratingModule) {
    lines.push(`- ${step}`);
  }
  lines.push("");
  lines.push("This planner is offline-only. It does not launch Aurora Toolset and does not mutate a module.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}
