#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const repoRoot = resolve(backendRoot, "..");

const AREA_RESREF = "cdx_mapflat01";
const DEFAULT_MAP_PATH = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area",
  "concept-placeable-tile-map.json"
);
const DEFAULT_SUMMARY_PATH = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area",
  "summary.json"
);
const DEFAULT_OUT_ROOT = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-concept-parity"
);
const DEFAULT_TILE_RANK_PATH = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area",
  "sic11-tile-layout-rank-source-last-city-rerank-20260706.json"
);
const LAST_CITY_CONCEPT_BEST_BASELINE = {
  id: "tilemap49",
  score: 0.787,
  module: "codex_writer_concept_sic_tilemap49_masked_visual_rebalance_lab.mod",
  note: "Best clean proof so far; later candidates must beat this before promotion."
};
const LAST_CITY_CONCEPT_EXPERIMENT_MEMORY = [
  {
    id: "tilemap44",
    class: "tile_layout",
    tiles: ["global"],
    status: "quarantined_access_violation",
    score: null,
    decision: "never_retry",
    lesson: "Mixed enon_house_6 crop origin 0,2 raised Access Violation.",
    blocks: ["mixed_j_tile_crop", "retry_after_access_violation"]
  },
  {
    id: "tilemap45",
    class: "placeable_composition",
    tiles: ["SW"],
    status: "quarantined_access_violation",
    score: null,
    decision: "never_retry",
    lesson: "Retired SW dark-mass pass raised Access Violation.",
    blocks: ["sw_dark_mass_pass", "retry_after_access_violation"]
  },
  {
    id: "tilemap46",
    class: "hak_profile",
    tiles: ["global"],
    status: "quarantined_access_violation",
    score: null,
    decision: "never_retry",
    lesson: "Full 58-entry Last City HakList lab profile raised Access Violation during proof.",
    blocks: ["unsafe_hak_profile_58", "retry_after_access_violation"]
  },
  {
    id: "tilemap50",
    class: "placeable_composition",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.785,
    decision: "do_not_repeat",
    lesson: "+4 ordinary NW large-silhouette placeables opened cleanly but worsened score from 0.787 to 0.785.",
    blocks: ["nw_more_large_silhouette_placeables"]
  },
  {
    id: "tilemap51",
    class: "tile_layout",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.734,
    decision: "do_not_repeat",
    lesson: "Single NW tile substitution 72/2 -> 256/1 opened cleanly but badly worsened score.",
    blocks: ["nw_tile_256_orientation_1"]
  },
  {
    id: "tilemap55",
    class: "tile_layout",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.783,
    decision: "do_not_repeat",
    lesson: "Single NW orientation-only test 72/2 -> 72/1 opened cleanly but worsened score from 0.787 to 0.783.",
    blocks: ["nw_tile_72_orientation_1"]
  },
  {
    id: "tilemap56",
    class: "tile_layout",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.785,
    decision: "do_not_repeat",
    lesson: "Single NW orientation-only test 72/2 -> 72/0 opened cleanly but still worsened score from 0.787 to 0.785.",
    blocks: ["nw_tile_72_orientation_0"]
  },
  {
    id: "tilemap57",
    class: "tile_layout",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.758,
    decision: "do_not_repeat",
    lesson: "Residential middle-apartment NW material test 72/2 -> 194/0 opened cleanly but regressed to 0.758.",
    blocks: ["nw_tile_194_orientation_0"]
  },
  {
    id: "tilemap59",
    class: "tile_layout",
    tiles: ["NW"],
    status: "neutral_tiny_improvement",
    score: 0.789,
    decision: "do_not_promote",
    lesson: "Single NW orientation-only test 72/2 -> 72/3 opened cleanly and nudged score from 0.788 to 0.789, but the visual change is too small for acceptance.",
    blocks: ["nw_tile_72_orientation_3"]
  },
  {
    id: "tilemap60",
    class: "tile_layout",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.767,
    decision: "do_not_repeat",
    lesson:
      "Filtered NW tile substitution 72/2 -> 87/1 opened cleanly but regressed from 0.788 to 0.767; NW bright/wood read moved away from the concept.",
    blocks: ["nw_tile_87_orientation_1"]
  },
  {
    id: "tilemap61",
    class: "tile_layout",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.774,
    decision: "do_not_repeat",
    lesson:
      "Filtered NW tile substitution 72/2 -> 91/1 opened cleanly but regressed from 0.788 to 0.774; NW remained too bright/wood-heavy versus concept.",
    blocks: ["nw_tile_91_orientation_1"]
  },
  {
    id: "tilemap62",
    class: "tile_layout",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.765,
    decision: "do_not_repeat",
    lesson:
      "Filtered NW tile substitution 72/2 -> 476/0 opened cleanly but regressed from 0.788 to 0.765; dense-other tile moved farther from the concept read.",
    blocks: ["nw_tile_476_orientation_0"]
  },
  {
    id: "tilemap63",
    class: "tile_layout",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.762,
    decision: "do_not_repeat",
    lesson:
      "Filtered NW tile substitution 72/2 -> 59/3 opened cleanly but regressed from 0.788 to 0.762; continuing simple tile-id swaps is now low-value.",
    blocks: ["nw_tile_59_orientation_3", "nw_simple_tile_id_swap_regression_series"]
  },
  {
    id: "tilemap58",
    class: "area_lighting",
    tiles: ["global"],
    status: "neutral_tiny_improvement",
    score: 0.788,
    decision: "do_not_promote",
    lesson: "Deep-mood area lighting opened cleanly and nudged score from 0.787 to 0.788, but visual change is too small for acceptance.",
    blocks: ["deep_mood_alone_as_final_fix"]
  },
  {
    id: "tilemap52",
    class: "visual_transform",
    tiles: ["global"],
    status: "blocked_by_crash_risk",
    score: null,
    decision: "do_not_open",
    lesson: "q_148 concept_stone_spine VT 0.56/0.62 exceeded last clean Toolset range and was blocked before proof.",
    blocks: ["q_148_scale_above_0_45_0_50"]
  },
  {
    id: "tilemap53",
    class: "visual_transform",
    tiles: ["global"],
    status: "neutral_not_promoted",
    score: 0.787,
    decision: "do_not_promote",
    lesson: "q_148 concept_stone_spine VT at safe limit 0.45/0.50 was clean but did not improve score.",
    blocks: ["repeat_q_148_safe_limit_as_main_fix"]
  },
  {
    id: "tilemap54",
    class: "visual_transform",
    tiles: ["N", "NE", "NW", "S", "global"],
    status: "rejected_visual_regression",
    score: 0.781,
    decision: "do_not_repeat",
    lesson: "Safe wall VisualTransform bundle opened cleanly but worsened score from 0.787 to 0.781.",
    blocks: ["wall_vt_scale_bundle"]
  },
  {
    id: "tilemap64",
    class: "visual_transform",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.781,
    decision: "do_not_repeat",
    lesson:
      "NW existing-VT material/silhouette pivot opened cleanly but regressed from tilemap58 0.788 to 0.781; growing the same rugs/screen/wall VT bundle should be blocked by the concept map checker before Toolset.",
    blocks: ["nw_existing_vt_growth_bundle", "nw_grow_existing_vt_rugs_screen_wall"]
  },
  {
    id: "tilemap65",
    class: "placeable_composition",
    tiles: ["NW"],
    status: "neutral_not_promoted",
    score: 0.787,
    decision: "do_not_promote",
    lesson:
      "Single ordinary q_100/q_chair_6 low south-west furniture silhouette opened cleanly and passed map intent, but did not improve the visual score versus tilemap58/current mask (0.787 vs 0.788).",
    blocks: ["nw_single_low_chair_southwest_furniture_only"]
  },
  {
    id: "tilemap66",
    class: "visual_transform",
    tiles: ["NW"],
    status: "quarantined_access_violation",
    score: null,
    decision: "never_retry",
    lesson:
      "Single existing nwn2 round planning table VisualTransform shrink to 0.72 passed offline gates but raised Toolset access violation during readonly capture.",
    blocks: ["nw_round_planning_table_visual_transform", "retry_after_access_violation"]
  },
  {
    id: "tilemap67",
    class: "placeable_template_material",
    tiles: ["NW"],
    status: "rejected_visual_regression",
    score: 0.784,
    decision: "do_not_repeat",
    lesson:
      "Replacing the NW round planning table template with zep_tblcltc_002 opened cleanly, but regressed versus tilemap58 and left the same NW bright/flat read.",
    blocks: ["nw_round_planning_table_template_swap", "nw_table_material_only"]
  },
  {
    id: "tilemap68",
    class: "visual_transform_template_material",
    tiles: ["NW"],
    status: "quarantined_access_violation",
    score: null,
    decision: "never_retry",
    lesson:
      "Replacing the existing NW deep red-zone VT textile with zep_throwrug058 and lower Z passed offline gates but raised Toolset access violation during module load.",
    blocks: ["nw_deep_rug_zep_throwrug058_visual_transform", "retry_after_access_violation"]
  },
  {
    id: "tilemap69",
    class: "placeable_position_material",
    tiles: ["NW"],
    status: "neutral_not_promoted",
    score: 0.787,
    decision: "do_not_promote",
    lesson:
      "Lowering/repositioning the two ordinary non-VT NW saturation rugs opened and captured cleanly, but did not improve the concept comparison versus tilemap58.",
    blocks: ["nw_non_vt_saturation_rug_floor_tweak"]
  },
  {
    id: "tilemap70",
    class: "tile_layout",
    tiles: ["NW"],
    status: "quarantined_access_violation",
    score: null,
    decision: "never_retry",
    lesson:
      "NW tile shortlist candidate 72/2 -> 425/1 passed offline gates but raised a Toolset access violation during module load.",
    blocks: ["nw_tile_425_orientation_1", "retry_after_access_violation"]
  },
  {
    id: "tilemap72",
    class: "visual_transform_silhouette",
    tiles: ["NW"],
    status: "blocked_by_concept_map",
    score: null,
    decision: "do_not_open",
    lesson:
      "Growing the existing NW right shadow screen was blocked offline as a repeat of tilemap64 screen growth before Toolset proof.",
    blocks: ["tilemap64_screen_growth", "nw_right_screen_visual_transform_growth"]
  },
  {
    id: "tilemap73",
    class: "visual_transform_silhouette",
    tiles: ["NW"],
    status: "quarantined_access_violation",
    score: null,
    decision: "never_retry",
    lesson:
      "Shrinking the existing NW worn rug VisualTransform below the baseline passed offline gates but raised Toolset access violation during module load.",
    blocks: ["nw_worn_rug_shrink_visual_transform", "retry_after_access_violation"]
  },
  {
    id: "tilemap74",
    class: "placeable_template_material",
    tiles: ["NW"],
    status: "quarantined_access_violation",
    score: null,
    decision: "never_retry",
    lesson:
      "Replacing the existing NW worn rug template with witcher414 while keeping its VT passed offline gates but raised Toolset access violation during module load.",
    blocks: ["nw_worn_rug_red_carpet_template_swap", "retry_after_access_violation"]
  },
  {
    id: "tilemap75",
    class: "placeable_position_material",
    tiles: ["N"],
    status: "invalid_full_module_lab_access_violation",
    score: null,
    decision: "do_not_use_full_module_concept_tilemap_lab_target",
    lesson:
      "The tilemap75 proof target was accidentally generated as a full-size Last City module instead of a small concept lab. Its access violation is evidence against the full-module lab path, not against the N side-cabinet position idea.",
    blocks: [
      "full_module_concept_tilemap_lab_target",
      "repeated_area_toolset_access_violation_family",
      "retry_after_access_violation"
    ]
  }
];

const options = parseArgs(process.argv.slice(2));
const summaryPath = resolveMaybe(options.areaSummary ?? DEFAULT_SUMMARY_PATH);
const summary = readOptionalJson(summaryPath);
const modulePath = resolveMaybe(
  options.modulePath ??
    process.env.AURORA_LAST_CITY_CONCEPT_PARITY_MODULE_PATH ??
    process.env.AURORA_LAST_CITY_MODULE_PATH ??
    summary?.modulePath
);
if (!modulePath) {
  throw new Error("Missing --modulePath, AURORA_LAST_CITY_CONCEPT_PARITY_MODULE_PATH, or summary.modulePath.");
}
assertReadableFile(modulePath, "module");
const baselineModulePath = resolveMaybe(
  options.before ??
    options.baseline ??
    process.env.AURORA_LAST_CITY_CONCEPT_PARITY_BASELINE_MODULE_PATH ??
    null
);
if (baselineModulePath) {
  assertReadableFile(baselineModulePath, "baseline module");
}
const baselineIdentity = {
  id: options.baselineId ?? process.env.AURORA_LAST_CITY_CONCEPT_PARITY_BASELINE_ID ?? LAST_CITY_CONCEPT_BEST_BASELINE.id,
  score: numberOption(
    options.baselineScore ?? process.env.AURORA_LAST_CITY_CONCEPT_PARITY_BASELINE_SCORE,
    LAST_CITY_CONCEPT_BEST_BASELINE.score
  ),
  module: baselineModulePath ? basename(baselineModulePath) : LAST_CITY_CONCEPT_BEST_BASELINE.module,
  note: options.baselineNote ?? LAST_CITY_CONCEPT_BEST_BASELINE.note
};

const mapPath = resolveMaybe(options.map ?? DEFAULT_MAP_PATH);
assertReadableFile(mapPath, "concept placeable tile map");
const tileRankPath = resolveMaybe(
  options.tileRank ?? process.env.AURORA_LAST_CITY_CONCEPT_PARITY_TILE_RANK_PATH ?? (existsSync(DEFAULT_TILE_RANK_PATH) ? DEFAULT_TILE_RANK_PATH : null)
);
if (tileRankPath) {
  assertReadableFile(tileRankPath, "tile rank report");
}

const toolsetPath = resolveMaybe(
  options.toolset ??
    options.toolsetScreenshot ??
    process.env.AURORA_LAST_CITY_CONCEPT_PARITY_TOOLSET_SCREENSHOT ??
    null
);
if (toolsetPath) {
  assertReadableFile(toolsetPath, "Toolset screenshot");
}
const toolsetCrop = options.toolsetCrop ? String(options.toolsetCrop) : null;
const allowVisualTransformDiff = booleanOption(options.allowVisualTransformDiff, false);
const allowedVisualTransformDiffTags = parseDelimitedList(
  options.allowedVisualTransformDiffTags ?? options.allowedVtTags ?? ""
);

const label = sanitizeSegment(
  options.label ?? `${basename(modulePath, ".mod")}-${toolsetPath ? "visual" : "offline"}-${timestampSegment()}`
);
const outDir = resolveMaybe(options.out ?? resolve(DEFAULT_OUT_ROOT, label));
mkdirSync(outDir, { recursive: true });

const usageSuffix = sanitizeSegment(options.usageSuffix ?? `parity-${label}`);
const usageRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  `last-city-placeable-usage-map-${usageSuffix}`
);
const placeableMapPath = resolve(usageRoot, "placeable-usage-map.json");
const placeableInstancesPath = resolve(usageRoot, "placeable-instances.csv");

const steps = [];

runRequiredStep({
  id: "fresh_placeable_usage_map",
  script: "build-last-city-placeable-usage-map.mjs",
  args: [],
  env: {
    AURORA_LAST_CITY_MODULE_PATH: modulePath,
    AURORA_LAST_CITY_PLACEABLE_MAP_SUFFIX: usageSuffix
  }
});
assertReadableFile(placeableMapPath, "fresh placeable usage map");
assertReadableFile(placeableInstancesPath, "fresh placeable instances csv");

const conceptMapOut = resolve(outDir, "concept-placeable-tile-map-check.json");
runRequiredStep({
  id: "concept_placeable_tile_map",
  script: "check-last-city-concept-placeable-map.mjs",
  args: ["--modulePath", modulePath, "--map", mapPath, "--out", conceptMapOut]
});

const anchorOut = resolve(outDir, "concept-anchor-compare.json");
runRequiredStep({
  id: "concept_anchor_compare",
  script: "compare-last-city-concept-anchors.mjs",
  args: ["--modulePath", modulePath, "--map", mapPath, "--out", anchorOut, "--label", label]
});

const tileLayoutOut = resolve(outDir, "tile-layout.json");
runRequiredStep({
  id: "tile_layout",
  script: "inspect-last-city-area-tile-layout.mjs",
  args: ["--modulePath", modulePath, "--area", AREA_RESREF, "--out", tileLayoutOut, "--label", label]
});

let baselineTileLayoutOut = null;
let tileLayoutDiffOut = null;
if (baselineModulePath) {
  baselineTileLayoutOut = resolve(outDir, "baseline-tile-layout.json");
  runRequiredStep({
    id: "baseline_tile_layout",
    script: "inspect-last-city-area-tile-layout.mjs",
    args: ["--modulePath", baselineModulePath, "--area", AREA_RESREF, "--out", baselineTileLayoutOut, "--label", `${label}-baseline`]
  });
  tileLayoutDiffOut = resolve(outDir, "tile-layout-diff.json");
  const conceptTilesForTileDiff = readJson(mapPath).tiles ?? [];
  writeFileSync(
    tileLayoutDiffOut,
    `${JSON.stringify(
      buildTileLayoutDiff({
        before: readJson(baselineTileLayoutOut),
        after: readJson(tileLayoutOut),
        conceptTiles: conceptTilesForTileDiff
      }),
      null,
      2
    )}\n`,
    "utf8"
  );
}

let candidateDiffOut = null;
if (baselineModulePath) {
  candidateDiffOut = resolve(outDir, "candidate-diff.json");
  runRequiredStep({
    id: "candidate_diff",
    script: "compare-last-city-area-candidates.mjs",
    args: ["--before", baselineModulePath, "--after", modulePath, "--map", mapPath, "--out", candidateDiffOut]
  });
}

const crashRiskOut = resolve(outDir, "crash-risk.json");
runRequiredStep({
  id: "crash_risk",
  script: "check-last-city-apartment-area-crash-risk.mjs",
  args: ["--modulePath", modulePath, "--out", crashRiskOut]
});

let preflightOut = resolveMaybe(options.preflightReport ?? null);
let syntheticPreflight = null;
if (preflightOut) {
  assertReadableFile(preflightOut, "preflight report");
  steps.push({
    id: "toolset_proof_preflight",
    status: "reused",
    elapsedMs: 0,
    script: null,
    args: ["--preflightReport", preflightOut],
    summary: summarizeStepOutput(readJson(preflightOut))
  });
} else if (toolsetPath && options.runPreflightWithScreenshot !== "1") {
  syntheticPreflight = {
    status: "existing_capture_no_launch_preflight_skipped",
    blockers: [],
    softBlockers: ["preflight_report_not_supplied_for_existing_capture"],
    proofLaunchAllowedWithoutOverride: false,
    note:
      "A Toolset screenshot was supplied, so this dashboard does not rerun clean-start preflight or open Toolset. Pass --preflightReport before any new Toolset launch."
  };
  steps.push({
    id: "toolset_proof_preflight",
    status: "skipped",
    elapsedMs: 0,
    script: null,
    args: [],
    summary: syntheticPreflight
  });
} else {
  preflightOut = resolve(outDir, "toolset-proof-preflight.json");
  runRequiredStep({
    id: "toolset_proof_preflight",
    script: "preflight-last-city-toolset-proof.mjs",
    args: ["--modulePath", modulePath, "--out", preflightOut],
    allowBlockedStatus: true
  });
}

const comparisonDir = resolve(outDir, "concept-comparison");
let comparisonOut = null;
let imageDeltaOut = null;
let edgeArtifactOut = null;
if (toolsetPath) {
  const comparisonArgs = [
    "--toolset",
    toolsetPath,
    "--placeableMap",
    placeableMapPath,
    "--placeableInstances",
    placeableInstancesPath,
    "--areaSummary",
    summaryPath,
    "--out",
    comparisonDir
  ];
  if (toolsetCrop) {
    comparisonArgs.push("--toolsetCrop", toolsetCrop);
  }
  runRequiredStep({
    id: "visual_concept_comparison",
    script: "compare-area-concept-art.mjs",
    args: comparisonArgs
  });
  comparisonOut = resolve(comparisonDir, "comparison-report.json");
  assertReadableFile(comparisonOut, "concept comparison report");

  const cropPath = resolve(comparisonDir, "toolset-viewport-crop.png");
  const edgeArtifactDir = resolve(outDir, "edge-artifacts");
  runRequiredStep({
    id: "toolset_crop_edge_artifacts",
    script: "analyze-toolset-crop-edge-artifacts.mjs",
    args: ["--input", cropPath, "--out", edgeArtifactDir, "--label", label]
  });
  edgeArtifactOut = resolve(edgeArtifactDir, `${label}-edge-artifacts.json`);
  assertReadableFile(edgeArtifactOut, "Toolset edge artifact report");

  const imageDeltaDir = resolve(outDir, "image-delta");
  runRequiredStep({
    id: "image_delta_grid",
    script: "analyze-area-concept-image-delta.mjs",
    args: [
      "--toolsetCrop",
      cropPath,
      "--toolsetEdgeArtifactReport",
      edgeArtifactOut,
      "--out",
      imageDeltaDir,
      "--label",
      label
    ]
  });
  imageDeltaOut = resolve(imageDeltaDir, `${label}-image-delta.json`);
  assertReadableFile(imageDeltaOut, "image delta report");
}

const reports = {
  usageMap: readJson(placeableMapPath),
  conceptMap: readJson(conceptMapOut),
  anchors: readJson(anchorOut),
  tileLayout: readJson(tileLayoutOut),
  tileLayoutDiff: tileLayoutDiffOut ? readJson(tileLayoutDiffOut) : null,
  candidateDiff: candidateDiffOut ? readJson(candidateDiffOut) : null,
  crashRisk: readJson(crashRiskOut),
  preflight: preflightOut ? readJson(preflightOut) : syntheticPreflight,
  comparison: comparisonOut ? readJson(comparisonOut) : null,
  edgeArtifacts: edgeArtifactOut ? readJson(edgeArtifactOut) : null,
  imageDelta: imageDeltaOut ? readJson(imageDeltaOut) : null,
  tileRank: tileRankPath ? readJson(tileRankPath) : null
};

const parityReport = buildParityReport({
  modulePath,
  mapPath,
  summaryPath,
  toolsetPath,
  toolsetCrop,
  outDir,
  label,
  baselineIdentity,
  reports,
  outputs: {
    usageRoot,
    placeableMapPath,
    placeableInstancesPath,
    conceptMapOut,
    anchorOut,
    tileLayoutOut,
    baselineTileLayoutOut,
    tileLayoutDiffOut,
    comparisonOut,
    edgeArtifactOut,
    imageDeltaOut,
    tileRankPath,
    candidateDiffOut,
    crashRiskOut,
    preflightOut,
    fastPlanJsonPath: resolve(outDir, "fast-iteration-plan.json"),
    fastPlanMarkdownPath: resolve(outDir, "fast-iteration-plan.md"),
    layerBlameMapJsonPath: resolve(outDir, "layer-blame-map.json"),
    layerBlameMapMarkdownPath: resolve(outDir, "layer-blame-map.md"),
    comparisonBriefJsonPath: resolve(outDir, "comparison-brief.json"),
    comparisonBriefMarkdownPath: resolve(outDir, "comparison-brief.md"),
    operatorScorecardJsonPath: resolve(outDir, "operator-scorecard.json"),
    operatorScorecardMarkdownPath: resolve(outDir, "operator-scorecard.md"),
    iterationDecisionMatrixJsonPath: resolve(outDir, "iteration-decision-matrix.json"),
    iterationDecisionMatrixMarkdownPath: resolve(outDir, "iteration-decision-matrix.md"),
    markdownPath: resolve(outDir, "concept-parity-report.md"),
    jsonPath: resolve(outDir, "concept-parity-report.json")
  },
  steps
});

writeFileSync(parityReport.outputs.jsonPath, `${JSON.stringify(parityReport, null, 2)}\n`, "utf8");
writeFileSync(parityReport.outputs.markdownPath, renderMarkdown(parityReport), "utf8");
writeFileSync(parityReport.outputs.fastPlanJsonPath, `${JSON.stringify(parityReport.fastIterationPlan, null, 2)}\n`, "utf8");
writeFileSync(
  parityReport.outputs.fastPlanMarkdownPath,
  renderFastIterationPlanMarkdown(parityReport.fastIterationPlan, parityReport),
  "utf8"
);
writeFileSync(parityReport.outputs.layerBlameMapJsonPath, `${JSON.stringify(parityReport.layerBlameMap, null, 2)}\n`, "utf8");
writeFileSync(
  parityReport.outputs.layerBlameMapMarkdownPath,
  renderLayerBlameMapMarkdown(parityReport.layerBlameMap, parityReport),
  "utf8"
);
writeFileSync(
  parityReport.outputs.comparisonBriefJsonPath,
  `${JSON.stringify(parityReport.comparisonBrief, null, 2)}\n`,
  "utf8"
);
writeFileSync(
  parityReport.outputs.comparisonBriefMarkdownPath,
  renderComparisonBriefMarkdown(parityReport.comparisonBrief, parityReport),
  "utf8"
);
writeFileSync(
  parityReport.outputs.operatorScorecardJsonPath,
  `${JSON.stringify(parityReport.operatorScorecard, null, 2)}\n`,
  "utf8"
);
writeFileSync(
  parityReport.outputs.operatorScorecardMarkdownPath,
  renderOperatorScorecardMarkdown(parityReport.operatorScorecard, parityReport),
  "utf8"
);
writeFileSync(
  parityReport.outputs.iterationDecisionMatrixJsonPath,
  `${JSON.stringify(parityReport.fastIterationPlan.decisionMatrix, null, 2)}\n`,
  "utf8"
);
writeFileSync(
  parityReport.outputs.iterationDecisionMatrixMarkdownPath,
  renderIterationDecisionMatrixMarkdown(parityReport.fastIterationPlan.decisionMatrix, parityReport),
  "utf8"
);

console.log(
  JSON.stringify(
    {
      status: parityReport.status,
      score: parityReport.score,
      modulePath,
      toolsetPath,
      outputs: {
        report: parityReport.outputs.jsonPath,
        markdown: parityReport.outputs.markdownPath,
        usageMap: placeableMapPath,
        tileLayoutDiff: tileLayoutDiffOut,
        candidateDiff: candidateDiffOut,
        crashRisk: crashRiskOut,
        preflight: preflightOut,
        comparison: comparisonOut,
        edgeArtifacts: edgeArtifactOut,
        imageDelta: imageDeltaOut,
        tileRank: tileRankPath,
        fastPlan: parityReport.outputs.fastPlanJsonPath,
        fastPlanMarkdown: parityReport.outputs.fastPlanMarkdownPath,
        layerBlameMap: parityReport.outputs.layerBlameMapJsonPath,
        layerBlameMapMarkdown: parityReport.outputs.layerBlameMapMarkdownPath,
        comparisonBrief: parityReport.outputs.comparisonBriefJsonPath,
        comparisonBriefMarkdown: parityReport.outputs.comparisonBriefMarkdownPath,
        operatorScorecard: parityReport.outputs.operatorScorecardJsonPath,
        operatorScorecardMarkdown: parityReport.outputs.operatorScorecardMarkdownPath,
        iterationDecisionMatrix: parityReport.outputs.iterationDecisionMatrixJsonPath,
        iterationDecisionMatrixMarkdown: parityReport.outputs.iterationDecisionMatrixMarkdownPath
      },
      safetyGates: {
        candidateDiff: parityReport.scores.candidateDiffStatus,
        crashRisk: parityReport.scores.crashRiskStatus,
        preflight: parityReport.scores.preflightStatus
      },
      fastDecision: parityReport.fastIterationPlan.summary,
      comparisonBrief: parityReport.comparisonBrief.summary,
      topPriorities: parityReport.priorityQueue.slice(0, 5).map((item) => ({
        id: item.id,
        severity: item.severity,
        area: item.area,
        issue: item.issue
      })),
      nextCorrections: parityReport.correctionPlan.items.slice(0, 5).map((item) => ({
        tile: item.tile,
        strategy: item.strategy,
        targetZones: item.targetZones.map((zone) => zone.zone).join(", "),
        safestCandidates: item.safestCandidates.slice(0, 3).map((candidate) => candidate.tag)
      }))
    },
    null,
    2
  )
);

function runRequiredStep({ id, script, args, env, allowBlockedStatus = false }) {
  const scriptPath = resolve(scriptDir, script);
  const startedAt = Date.now();
  try {
    const output = execFileSync(process.execPath, [scriptPath, ...args], {
      cwd: repoRoot,
      env: { ...process.env, ...(env ?? {}) },
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024
    });
    const parsed = parseJsonOutput(output);
    steps.push({
      id,
      status: "passed",
      elapsedMs: Date.now() - startedAt,
      script: scriptPath,
      args,
      summary: summarizeStepOutput(parsed)
    });
    return parsed;
  } catch (error) {
    const parsed = parseJsonOutput(String(error?.stdout ?? ""));
    if (allowBlockedStatus && parsed?.status === "blocked") {
      steps.push({
        id,
        status: "blocked",
        elapsedMs: Date.now() - startedAt,
        script: scriptPath,
        args,
        summary: summarizeStepOutput(parsed)
      });
      return parsed;
    }
    steps.push({
      id,
      status: "failed",
      elapsedMs: Date.now() - startedAt,
      script: scriptPath,
      args,
      message: String(error?.message ?? error),
      stdout: String(error?.stdout ?? "").slice(-8000),
      stderr: String(error?.stderr ?? "").slice(-8000)
    });
    throw error;
  }
}

function buildParityReport({
  modulePath,
  mapPath,
  summaryPath,
  toolsetPath,
  toolsetCrop,
  outDir,
  label,
  baselineIdentity,
  reports,
  outputs,
  steps
}) {
  const conceptTiles = readJson(mapPath).tiles ?? [];
  const tilesById = new Map(conceptTiles.map((tile) => [tile.id, tile]));
  const tileLayoutByCell = buildTileLayoutByCell(reports.tileLayout, tilesById);
  const tileAssessments = conceptTiles.map((tile) =>
    buildTileAssessment({
      tile,
      conceptMapTile: findById(reports.conceptMap?.tiles, tile.id),
      anchorTile: findById(reports.anchors?.tiles, tile.id),
      imageCell: findById(reports.imageDelta?.cells, tile.id),
      tileLayout: tileLayoutByCell.get(tile.id) ?? null
    })
  );
  const priorityQueue = buildPriorityQueue({
    candidateDiff: reports.candidateDiff,
    tileLayoutDiff: reports.tileLayoutDiff,
    crashRisk: reports.crashRisk,
    preflight: reports.preflight,
    conceptMap: reports.conceptMap,
    anchors: reports.anchors,
    comparison: reports.comparison,
    imageDelta: reports.imageDelta,
    tileAssessments
  });
  const correctionPlan = buildCorrectionPlan({
    conceptMap: reports.conceptMap,
    imageDelta: reports.imageDelta,
    tileAssessments
  });
  const status = classifyOverallStatus({
    candidateDiff: reports.candidateDiff,
    crashRisk: reports.crashRisk,
    preflight: reports.preflight,
    conceptMap: reports.conceptMap,
    anchors: reports.anchors,
    comparison: reports.comparison,
    priorityQueue,
    toolsetPath
  });
  const structuralScore = scoreStructural({
    conceptMap: reports.conceptMap,
    anchors: reports.anchors
  });
  const score = scoreOverall({
    conceptMap: reports.conceptMap,
    anchors: reports.anchors,
    comparison: reports.comparison,
    imageDelta: reports.imageDelta
  });
  const fastIterationPlan = buildFastIterationPlan({
    status,
    score,
    toolsetPath,
    reports,
    tileAssessments,
    correctionPlan,
    priorityQueue,
    label,
    baselineIdentity
  });
  const layerBlameMap = buildLayerBlameMap({
    label,
    status,
    score,
    reports,
    outputs,
    tileAssessments,
    fastIterationPlan
  });
  const comparisonBrief = buildComparisonBrief({
    label,
    status,
    score,
    baselineIdentity,
    reports,
    tileAssessments,
    fastIterationPlan,
    layerBlameMap,
    priorityQueue,
    outputs
  });
  const operatorScorecard = buildOperatorScorecard({
    label,
    status,
    score,
    baselineIdentity,
    reports,
    fastIterationPlan,
    layerBlameMap,
    comparisonBrief,
    priorityQueue,
    outputs
  });

  return {
    version: "last-city-concept-parity-dashboard/v2",
    generatedAt: new Date().toISOString(),
    status,
    score,
    label,
    baselineIdentity,
    areaResref: AREA_RESREF,
    modulePath,
    mapPath,
    summaryPath,
    toolsetPath,
    toolsetCrop,
    safety: {
      launchesToolset: false,
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      method:
        "offline ERF/GFF checks plus existing Toolset screenshot comparison; this script never opens or controls Aurora Toolset"
    },
    scores: {
      conceptMapStatus: reports.conceptMap?.status ?? "missing",
      conceptMapErrors: reports.conceptMap?.errorCount ?? null,
      conceptMapWarnings: reports.conceptMap?.warningCount ?? null,
      anchorStatus: reports.anchors?.status ?? "missing",
      anchorScore: reports.anchors?.score ?? null,
      structuralScore,
      tileLayoutDiffStatus: reports.tileLayoutDiff?.status ?? (reports.candidateDiff ? "missing" : "not_run"),
      tileLayoutChangedCount: reports.tileLayoutDiff?.changedCount ?? null,
      candidateDiffStatus: reports.candidateDiff ? classifyCandidateDiff(reports.candidateDiff) : "not_run",
      candidateDiffVisualTransformChanges: getVisualTransformChangedCount(reports.candidateDiff),
      candidateDiffPlaceableDelta: reports.candidateDiff?.delta ?? null,
      crashRiskStatus: reports.crashRisk?.status ?? "missing",
      crashRiskErrors: reports.crashRisk?.errorCount ?? null,
      crashRiskWarnings: reports.crashRisk?.warningCount ?? null,
      preflightStatus: reports.preflight?.status ?? "missing",
      preflightBlockers: reports.preflight?.blockers ?? [],
      preflightSoftBlockers: reports.preflight?.softBlockers ?? [],
      avReadinessStatus: reports.preflight?.avReadiness?.status ?? "missing",
      avReadinessRequiresOverride: reports.preflight?.avReadiness?.requiresExplicitOverride ?? null,
      avReadinessHardBlockers: reports.preflight?.avReadiness?.hardBlockers ?? [],
      avReadinessPostGuardFailures: reports.preflight?.avReadiness?.family?.postGuardFailureCount ?? null,
      visualEvidenceStatus: reports.comparison || reports.imageDelta ? "present" : "missing",
      visualResult: reports.comparison?.result ?? (toolsetPath ? "missing" : "not_run"),
      visualScore: reports.comparison?.visualScore ?? null,
      semanticScore: reports.comparison?.semanticScore ?? null
    },
    tileAssessments,
    correctionPlan,
    fastIterationPlan,
    layerBlameMap,
    comparisonBrief,
    operatorScorecard,
    priorityQueue,
    steps,
    inputs: {
      modulePath,
      mapPath,
      summaryPath,
      toolsetPath,
      toolsetCrop,
      outDir
    },
    outputs
  };
}

function buildTileAssessment({ tile, conceptMapTile, anchorTile, imageCell, tileLayout }) {
  const anchorScore = anchorTile?.score ?? null;
  const mapClean =
    conceptMapTile?.errorCount === 0 &&
    conceptMapTile?.warningCount === 0 &&
    conceptMapTile?.budgetStatus === "ok";
  const imagePriority = imageCell?.delta?.priority ?? 0;
  const visualClass =
    !imageCell ? "not_measured" : imagePriority >= 0.9 ? "severe_visual_delta" : imagePriority >= 0.55 ? "visual_delta" : "close";
  const likelyCause = inferLikelyCause({ conceptMapTile, anchorTile, imageCell, mapClean });
  return {
    id: tile.id,
    conceptRole: tile.conceptRole,
    primaryRead: tile.primaryRead,
    worldBounds: tile.worldBounds,
    layout: tileLayout,
    placeables: {
      count: conceptMapTile?.placeableCount ?? anchorTile?.placeableCount ?? null,
      budgetStatus: conceptMapTile?.budgetStatus ?? null,
      visualTransformCount: conceptMapTile?.visualTransformCount ?? null,
      roleCounts: conceptMapTile?.roleCounts ?? anchorTile?.roleCounts ?? {}
    },
    anchors: {
      score: anchorScore,
      failed: anchorTile?.failedAnchors ?? null,
      partial: anchorTile?.partialAnchors ?? null,
      motifGaps: anchorTile?.motifGaps ?? null
    },
    image: imageCell
      ? {
          priority: imageCell.delta.priority,
          lumaDelta: imageCell.delta.luma,
          brightExcess: imageCell.delta.brightExcess,
          darkDeficit: imageCell.delta.darkDeficit,
          saturationDeficit: imageCell.delta.saturationDeficit,
          warmDelta: imageCell.delta.warmRatio,
          targetSubcells: (imageCell.targetSubcells ?? imageCell.subcells ?? []).slice(0, 3).map((subcell) => ({
            id: subcell.id,
            zone: subcell.zone,
            row: subcell.row,
            col: subcell.col,
            priority: subcell.delta?.priority,
            brightExcess: subcell.delta?.brightExcess,
            darkDeficit: subcell.delta?.darkDeficit,
            saturationDeficit: subcell.delta?.saturationDeficit
          }))
        }
      : null,
    visualClass,
    likelyCause,
    nextAction: buildTileNextAction({ tile, conceptMapTile, anchorTile, imageCell, likelyCause })
  };
}

function inferLikelyCause({ conceptMapTile, anchorTile, imageCell, mapClean }) {
  if (conceptMapTile?.errorCount > 0 || conceptMapTile?.warningCount > 0) {
    return "concept_map_rule_gap";
  }
  if ((anchorTile?.failedAnchors ?? 0) > 0 || (anchorTile?.partialAnchors ?? 0) > 0) {
    return "placeable_anchor_gap";
  }
  if (!imageCell) {
    return "awaiting_visual_capture";
  }
  const priority = imageCell.delta?.priority ?? 0;
  const brightExcess = imageCell.delta?.brightExcess ?? 0;
  const darkDeficit = imageCell.delta?.darkDeficit ?? 0;
  const saturationDeficit = imageCell.delta?.saturationDeficit ?? 0;
  if (mapClean && priority >= 0.55 && (brightExcess >= 12 || darkDeficit >= 0.08)) {
    return "tile_material_or_large_silhouette_gap";
  }
  if (mapClean && saturationDeficit >= 0.06) {
    return "palette_texture_gap";
  }
  if (priority >= 0.55) {
    return "mixed_visual_gap";
  }
  return "acceptable_for_current_iteration";
}

function buildTileNextAction({ tile, conceptMapTile, anchorTile, imageCell, likelyCause }) {
  if (likelyCause === "concept_map_rule_gap") {
    return `Fix concept map rule failures in ${tile.id}: budget=${conceptMapTile?.budgetStatus}, errors=${conceptMapTile?.errorCount}, warnings=${conceptMapTile?.warningCount}.`;
  }
  if (likelyCause === "placeable_anchor_gap") {
    const badAnchors = (anchorTile?.anchors ?? [])
      .filter((anchor) => anchor.status !== "passed")
      .map((anchor) => `${anchor.name}:${anchor.status}`)
      .join(", ");
    return `Move or replace real placeables inside anchor zones before touching VT: ${badAnchors || "anchor gap"}.`;
  }
  if (likelyCause === "tile_material_or_large_silhouette_gap") {
    return `Do not add small clutter first. Change tile/floor/wall read or add safe large structural silhouettes for ${tile.id}; image delta brightExcess=${format(imageCell?.delta?.brightExcess)}, darkDeficit=${format(imageCell?.delta?.darkDeficit)}.`;
  }
  if (likelyCause === "palette_texture_gap") {
    return `Prefer richer local textiles/wood in ${tile.id}, but keep anchors fixed; saturationDeficit=${format(imageCell?.delta?.saturationDeficit)}.`;
  }
  if (likelyCause === "awaiting_visual_capture") {
    return "Run controlled Toolset screenshot comparison before promoting this candidate.";
  }
  return "Keep this tile stable unless a neighboring tile change breaks the read.";
}

function buildPriorityQueue({ candidateDiff, tileLayoutDiff, crashRisk, preflight, conceptMap, anchors, comparison, imageDelta, tileAssessments }) {
  const priorities = [];
  const tileChanged = hasTileLayoutChanges(tileLayoutDiff);
  const areaLightingChanged = Number(tileLayoutDiff?.areaLightingDiff?.changedCount ?? 0) > 0;
  const objectChanged = hasPlaceableOrVisualTransformChanges(candidateDiff);
  if ([tileChanged, objectChanged, areaLightingChanged].filter(Boolean).length > 1) {
    priorities.push({
      id: "mixed_tile_placeable_lighting_candidate",
      severity: "high",
      area: "candidate_diff",
      issue: `Candidate mixes tile changes (${tileLayoutDiff?.changedCount ?? 0}), area lighting changes (${tileLayoutDiff?.areaLightingDiff?.changedCount ?? 0}), and placeable/VT changes (${summarizeObjectChangeCount(candidateDiff)}).`,
      nextAction: "Split into one tile-only, lighting-only, or placeable/VT-only candidate before Toolset proof."
    });
  }
  if (tileChanged) {
    priorities.push({
      id: "tile_layout_diff_review",
      severity: "medium",
      area: "tiles",
      issue: `Tile layout changed in ${tileLayoutDiff.changedCount} cell(s): ${tileLayoutDiff.changedCells
        .slice(0, 4)
        .map((cell) => `${cell.cellId}:${cell.before.tileId}/${cell.before.orientation}->${cell.after.tileId}/${cell.after.orientation}`)
        .join(", ")}.`,
      nextAction: "Treat this proof as tile/material evidence; do not infer placeable placement quality from it."
    });
  }
  if (areaLightingChanged) {
    priorities.push({
      id: "area_lighting_diff_review",
      severity: "medium",
      area: "lighting",
      issue: `Area lighting changed in ${tileLayoutDiff.areaLightingDiff.changedCount} field(s): ${tileLayoutDiff.areaLightingDiff.changes
        .slice(0, 4)
        .map((change) => `${change.field}:${change.before}->${change.after}`)
        .join(", ")}.`,
      nextAction: "Treat this proof as lighting evidence; do not infer tile material or placeable placement quality from it."
    });
  }
  if (crashRisk?.status && crashRisk.status !== "passed") {
    priorities.push({
      id: "crash_risk_failed",
      severity: "critical",
      area: "toolset_safety",
      issue: `Crash-risk gate failed: errors=${crashRisk.errorCount ?? "?"}, warnings=${crashRisk.warningCount ?? "?"}.`,
      nextAction: "Do not open Aurora Toolset. Fix the GFF/module invariants or quarantine the candidate."
    });
  }
  if (isPreflightHardBlocked(preflight)) {
    priorities.push({
      id: "toolset_preflight_blocked",
      severity: "critical",
      area: "toolset_safety",
      issue: `Toolset preflight status=${preflight.status ?? "missing"}, blockers=${(preflight.blockers ?? []).join(", ") || "none"}.`,
      nextAction: "Do not run Toolset proof until preflight blockers are empty."
    });
  } else if (isPreflightExplicitOverrideRequired(preflight)) {
    priorities.push({
      id: "toolset_preflight_requires_explicit_override",
      severity: "medium",
      area: "toolset_safety",
      issue: `Toolset preflight requires explicit supervised override: ${(preflight.softBlockers ?? []).join(", ") || "repeated AV family"}.`,
      nextAction:
        "Do not run automated Toolset proof. A visual proof may proceed only as one supervised single-open probe with explicit override."
    });
  }
  if (classifyCandidateDiff(candidateDiff) === "needs_diff_review") {
    priorities.push({
      id: "candidate_diff_review",
      severity: "high",
      area: "candidate_diff",
      issue: `Candidate diff requires review: VT changes=${getVisualTransformChangedCount(candidateDiff) ?? 0}, placeableDelta=${candidateDiff.delta ?? "?"}.`,
      nextAction: "Review candidate-diff.json before proof; split VisualTransform edits from placement-only edits."
    });
  }
  if (conceptMap?.status === "failed") {
    priorities.push({
      id: "concept_map_failed",
      severity: "critical",
      area: "placeables",
      issue: `${conceptMap.errorCount} concept-map errors.`,
      nextAction: "Fix blocked templates, unsafe floor overlays, VT-on-static, or missing hero motifs before Toolset proof."
    });
  } else if (conceptMap?.status === "passed_with_warnings") {
    priorities.push({
      id: "concept_map_warnings",
      severity: "high",
      area: "placeables",
      issue: `${conceptMap.warningCount} concept-map warnings.`,
      nextAction: "Resolve warnings so the proof does not hide avoidable composition problems."
    });
  }

  for (const tile of tileAssessments) {
    if (tile.likelyCause === "placeable_anchor_gap") {
      priorities.push({
        id: `anchor_${tile.id}`,
        severity: tile.anchors.failed > 0 ? "critical" : "high",
        area: tile.id,
        issue: `Anchor score ${format(tile.anchors.score)} with failed=${tile.anchors.failed}, partial=${tile.anchors.partial}.`,
        nextAction: tile.nextAction
      });
    }
  }

  for (const cell of [...(imageDelta?.cells ?? [])].sort((a, b) => (b.delta?.priority ?? 0) - (a.delta?.priority ?? 0))) {
    const tile = tileAssessments.find((item) => item.id === cell.id);
    if ((cell.delta?.priority ?? 0) < 0.45) {
      continue;
    }
    priorities.push({
      id: `visual_${cell.id}`,
      severity: (cell.delta?.priority ?? 0) >= 0.9 ? "high" : "medium",
      area: cell.id,
      issue: `${cell.role}: priority=${format(cell.delta?.priority)}, brightExcess=${format(cell.delta?.brightExcess)}, darkDeficit=${format(cell.delta?.darkDeficit)}, saturationDeficit=${format(cell.delta?.saturationDeficit)}.`,
      nextAction: tile?.nextAction ?? "Use the image-delta heatmap to target the next visual change."
    });
  }

  for (const check of comparison?.visualDeltaChecks ?? []) {
    if (check.status === "matched") {
      continue;
    }
    priorities.push({
      id: check.id,
      severity: check.status === "missing" ? "high" : "medium",
      area: "global_visual",
      issue: check.evidence,
      nextAction: buildGlobalVisualNextAction(check, comparison)
    });
  }

  return priorities.sort((a, b) => severityRank(b.severity) - severityRank(a.severity));
}

function buildCorrectionPlan({ conceptMap, imageDelta, tileAssessments }) {
  const cellsById = new Map((imageDelta?.cells ?? []).map((cell) => [cell.id, cell]));
  const mapTilesById = new Map((conceptMap?.tiles ?? []).map((tile) => [tile.id, tile]));
  const items = [...tileAssessments]
    .filter((tile) => (tile.image?.priority ?? 0) >= 0.45 || tile.likelyCause !== "acceptable_for_current_iteration")
    .sort((left, right) => (right.image?.priority ?? 0) - (left.image?.priority ?? 0))
    .map((tile) =>
      buildTileCorrectionItem({
        tile,
        imageCell: cellsById.get(tile.id) ?? null,
        conceptMapTile: mapTilesById.get(tile.id) ?? null
      })
    );

  return {
    version: "last-city-concept-correction-plan/v1",
    method:
      "Uses existing offline concept map, GIT placeables, tile layout, and screenshot subcell deltas. It does not launch Aurora Toolset.",
    guardrails: [
      "Run this plan before creating a module candidate; Toolset proof is only for candidates that pass offline checks.",
      "When the last clean baseline already has many VisualTransform objects, prefer moving existing placeables over adding new VT objects.",
      "Treat access violation as a critical stop: close Toolset, archive temp0, quarantine the candidate, and do not retry the same module.",
      "Keep tile orientation/layout changes separate from placeable Bearing and VisualTransform changes."
    ],
    items,
    topUnsafeSignals: items
      .flatMap((item) => item.riskNotes.map((note) => ({ tile: item.tile, note })))
      .slice(0, 12)
  };
}

function buildTileCorrectionItem({ tile, imageCell, conceptMapTile }) {
  const targetZones = buildTargetZones(tile, imageCell);
  const strategy = chooseCorrectionStrategy(tile);
  const safestCandidates = selectSafestCandidates({
    tile,
    conceptMapTile,
    strategy,
    targetZones
  });
  const riskNotes = [];
  const vtCandidates = safestCandidates.filter((candidate) => candidate.visualTransform).length;
  if (vtCandidates > 0) {
    riskNotes.push(`${vtCandidates} selected candidates already use VisualTransform; move them carefully and do not add new VT in the same pass.`);
  }
  if ((conceptMapTile?.visualTransformCount ?? 0) >= 20) {
    riskNotes.push(`High VT density in tile (${conceptMapTile.visualTransformCount}); prefer position/bearing tweaks over new scaled objects.`);
  }
  if (tile.likelyCause === "tile_material_or_large_silhouette_gap") {
    riskNotes.push("Visual metrics point to large silhouette/tile read, so small clutter is low leverage.");
  }
  return {
    tile: tile.id,
    role: tile.conceptRole,
    priority: tile.image?.priority ?? null,
    likelyCause: tile.likelyCause,
    strategy,
    imageDelta: tile.image
      ? {
          brightExcess: tile.image.brightExcess,
          darkDeficit: tile.image.darkDeficit,
          saturationDeficit: tile.image.saturationDeficit,
          warmDelta: tile.image.warmDelta
        }
      : null,
    targetZones,
    safestCandidates,
    action: buildCorrectionAction({ tile, targetZones, safestCandidates, strategy }),
    riskNotes
  };
}

function chooseCorrectionStrategy(tile) {
  const image = tile.image ?? {};
  if (tile.likelyCause === "placeable_anchor_gap") {
    return "fix_anchor_positions_first";
  }
  if ((image.brightExcess ?? 0) >= 16 || (image.darkDeficit ?? 0) >= 0.1) {
    return "reuse_large_dark_silhouette_or_rebalance_tile";
  }
  if ((image.saturationDeficit ?? 0) >= 0.06) {
    return "reuse_richer_textile_or_wood";
  }
  if (tile.likelyCause === "awaiting_visual_capture") {
    return "capture_needed_before_edit";
  }
  return "minor_watch_or_local_adjust";
}

function buildTargetZones(tile, imageCell) {
  const bounds = tile.worldBounds ?? {};
  const minX = Number(bounds.minX ?? 0);
  const maxX = Number(bounds.maxX ?? minX + 10);
  const minY = Number(bounds.minY ?? 0);
  const maxY = Number(bounds.maxY ?? minY + 10);
  return (imageCell?.targetSubcells ?? imageCell?.subcells ?? [])
    .slice(0, 3)
    .map((subcell) => {
      const col = Number(subcell.col ?? 1);
      const row = Number(subcell.row ?? 1);
      return {
        zone: subcell.zone ?? `r${row}c${col}`,
        subcell: subcell.id,
        priority: subcell.delta?.priority ?? null,
        brightExcess: subcell.delta?.brightExcess ?? null,
        darkDeficit: subcell.delta?.darkDeficit ?? null,
        saturationDeficit: subcell.delta?.saturationDeficit ?? null,
        worldTarget: {
          x: round2(minX + ((col + 0.5) / 3) * (maxX - minX)),
          y: round2(maxY - ((row + 0.5) / 3) * (maxY - minY))
        }
      };
    });
}

function selectSafestCandidates({ conceptMapTile, strategy, targetZones }) {
  const desiredRoles = desiredRolesForStrategy(strategy);
  const desiredZones = new Set(targetZones.map((target) => target.zone));
  return [...(conceptMapTile?.adjustmentCandidates ?? [])]
    .filter((candidate) => candidate.safeUse !== "avoid_for_next_pass" && candidate.safeUse !== "blocked_static_visual_transform")
    .map((candidate) => {
      const roleBoost = desiredRoles.includes(candidate.role) ? 3 : 0;
      const zoneBoost = desiredZones.has(candidate.zone) ? 2 : 0;
      const vtPenalty = candidate.visualTransform ? 0.5 : 0;
      const nearest = nearestTarget(candidate, targetZones);
      const distancePenalty = nearest ? Math.min(2, Number(nearest.distance ?? 0) / 5) : 0;
      return {
        ...candidate,
        correctionScore: round2(Number(candidate.score ?? 0) + roleBoost + zoneBoost - vtPenalty - distancePenalty),
        nearestTargetZone: nearest?.zone ?? null,
        distanceToTarget: nearest ? round2(nearest.distance) : null,
        moveHint: nearest
          ? {
              from: { x: round2(candidate.x), y: round2(candidate.y), z: round2(candidate.z ?? 0) },
              to: nearest.worldTarget,
              dx: round2(nearest.worldTarget.x - Number(candidate.x ?? 0)),
              dy: round2(nearest.worldTarget.y - Number(candidate.y ?? 0))
            }
          : null
      };
    })
    .sort((left, right) => right.correctionScore - left.correctionScore)
    .slice(0, 8);
}

function nearestTarget(candidate, targetZones) {
  if (!targetZones.length) {
    return null;
  }
  const x = Number(candidate.x ?? 0);
  const y = Number(candidate.y ?? 0);
  return targetZones
    .map((target) => {
      const tx = Number(target.worldTarget?.x ?? 0);
      const ty = Number(target.worldTarget?.y ?? 0);
      return {
        ...target,
        distance: Math.hypot(x - tx, y - ty)
      };
    })
    .sort((left, right) => left.distance - right.distance)[0];
}

function desiredRolesForStrategy(strategy) {
  if (strategy === "reuse_large_dark_silhouette_or_rebalance_tile") {
    return ["storage_containers", "structural_windows_walls", "textiles_rugs", "sleep_private", "tables_seating"];
  }
  if (strategy === "reuse_richer_textile_or_wood") {
    return ["textiles_rugs", "tables_seating", "storage_containers", "structural_windows_walls"];
  }
  if (strategy === "fix_anchor_positions_first") {
    return ["maps_books_papers", "tables_seating", "storage_containers", "textiles_rugs", "lighting_fire"];
  }
  return ["storage_containers", "textiles_rugs", "tables_seating", "structural_windows_walls"];
}

function buildCorrectionAction({ tile, targetZones, safestCandidates, strategy }) {
  const zoneText = targetZones.length
    ? targetZones.map((zone) => `${zone.zone}@${zone.worldTarget.x},${zone.worldTarget.y}`).join("; ")
    : "no measured subcell target";
  const candidateText = safestCandidates.length
    ? safestCandidates
        .slice(0, 4)
        .map((candidate) => `${candidate.templateResRef}/${candidate.tag} (${candidate.safeUse})`)
        .join("; ")
    : "no safe candidates from current tile";
  if (strategy === "reuse_large_dark_silhouette_or_rebalance_tile") {
    return `First test existing large silhouettes in ${tile.id}: target ${zoneText}; candidates ${candidateText}. Avoid adding a new VT bundle.`;
  }
  if (strategy === "reuse_richer_textile_or_wood") {
    return `Improve local material read in ${tile.id}: target ${zoneText}; reuse textile/wood candidates ${candidateText}.`;
  }
  if (strategy === "fix_anchor_positions_first") {
    return `Fix anchor placement in ${tile.id} before image polishing: target ${zoneText}; candidates ${candidateText}.`;
  }
  return `Keep ${tile.id} low-risk: target ${zoneText}; candidates ${candidateText}.`;
}

function buildFastIterationPlan({ status, score, toolsetPath, reports, tileAssessments, correctionPlan, priorityQueue, label, baselineIdentity }) {
  const safety = buildFastSafetyState(reports);
  const correctionByTile = new Map((correctionPlan.items ?? []).map((item) => [item.tile, item]));
  const sortedTiles = [...tileAssessments]
    .map((tile) =>
      buildFastTileDecision({
        tile,
        correctionItem: correctionByTile.get(tile.id) ?? null,
        safety
      })
    )
    .sort((left, right) => {
      const actionRank = fastActionRank(right.decision) - fastActionRank(left.decision);
      if (actionRank !== 0) {
        return actionRank;
      }
      return Number(right.priority ?? 0) - Number(left.priority ?? 0);
  });
  const firstActionable = sortedTiles.find((tile) => tile.decision !== "hold_current_tile") ?? sortedTiles[0] ?? null;
  const safetyBlocked = safety.status === "blocked";
  const safetyRequiresOverride = safety.status === "requires_explicit_override";
  const changeSummary = buildCandidateChangeSummary({
    candidateDiff: reports.candidateDiff,
    tileLayoutDiff: reports.tileLayoutDiff
  });
  const summary = {
    status,
    score,
    safetyStatus: safety.status,
    screenshotCompared: Boolean(toolsetPath),
    nextLoop: safetyBlocked
      ? "stop_safety_first"
      : safetyRequiresOverride
        ? "await_supervised_toolset_override"
        : !toolsetPath
          ? "capture_toolset_before_visual_edits"
          : firstActionable?.decision ?? "hold_current_tile",
    firstTile: firstActionable?.tile ?? null,
    firstReason: firstActionable?.reason ?? null,
    tileFirstCount: sortedTiles.filter((tile) => tile.decision === "tile_first").length,
    placeableFirstCount: sortedTiles.filter((tile) => tile.decision === "placeable_first").length,
    paletteFirstCount: sortedTiles.filter((tile) => tile.decision === "palette_placeable_first").length,
    criticalPriorityCount: priorityQueue.filter((item) => item.severity === "critical").length,
    highPriorityCount: priorityQueue.filter((item) => item.severity === "high").length
  };
  const decisionMatrix = buildIterationDecisionMatrix({
    label,
    status,
    score,
    safety,
    changeSummary,
    sortedTiles,
    firstActionable,
    priorityQueue,
    baselineIdentity
  });

  return {
    version: "last-city-fast-placeable-tile-iteration-plan/v1",
    generatedAt: new Date().toISOString(),
    method:
      "Separates safety, placeable anchors, tile/material image deltas, and palette/texture gaps. It is offline-only and never launches Toolset.",
    summary,
    safety,
    policy: {
      maxOneVariablePerCandidate:
        "Change only one class per candidate: tile layout/material/large silhouette OR placeable positions OR VisualTransform, then rerun this report.",
      visualTransform:
        "VisualTransform is allowed, but keep it isolated. Non-default VT must keep Static=0 and should not be combined with tile orientation/layout changes.",
      auroraAdjustLocation:
        "Use Aurora Adjust Location for final placeable placement only after this plan points at a placeable_first tile; do not use it to debug tile/material mismatches.",
      accessViolation:
        "Access violation is a critical stop: close Toolset, archive temp0, quarantine the candidate, and do not retry the same module."
    },
    changeSummary,
    decisionMatrix,
    experimentMemory: decisionMatrix.experimentMemory,
    tiles: sortedTiles,
    nextCommands: buildFastNextCommands({ safety, toolsetPath, firstActionable })
  };
}

function buildFastSafetyState(reports) {
  const blockers = [];
  const candidateDiffStatus = reports.candidateDiff ? classifyCandidateDiff(reports.candidateDiff) : "not_run";
  if (candidateDiffStatus === "needs_diff_review") {
    blockers.push("candidate_diff_review");
  }
  if (reports.crashRisk?.status && reports.crashRisk.status !== "passed") {
    blockers.push("crash_risk_failed");
  }
  const softBlockers = [];
  if (isPreflightHardBlocked(reports.preflight)) {
    blockers.push("toolset_preflight_blocked");
  } else if (isPreflightExplicitOverrideRequired(reports.preflight)) {
    softBlockers.push("toolset_preflight_requires_explicit_override");
  }
  if (reports.conceptMap?.status === "failed") {
    blockers.push("concept_map_failed");
  }
  return {
    status: blockers.length ? "blocked" : softBlockers.length ? "requires_explicit_override" : "passed",
    blockers,
    softBlockers,
    candidateDiffStatus,
    crashRiskStatus: reports.crashRisk?.status ?? "missing",
    preflightStatus: reports.preflight?.status ?? "missing",
    conceptMapStatus: reports.conceptMap?.status ?? "missing"
  };
}

function buildFastTileDecision({ tile, correctionItem, safety }) {
  const priority = Number(tile.image?.priority ?? 0);
  const brightExcess = Number(tile.image?.brightExcess ?? 0);
  const darkDeficit = Number(tile.image?.darkDeficit ?? 0);
  const saturationDeficit = Number(tile.image?.saturationDeficit ?? 0);
  const anchorFailed = Number(tile.anchors?.failed ?? 0);
  const anchorPartial = Number(tile.anchors?.partial ?? 0);
  const mapBad = tile.placeables?.budgetStatus && tile.placeables.budgetStatus !== "ok";
  const decision = chooseFastDecision({
    safety,
    tile,
    priority,
    brightExcess,
    darkDeficit,
    saturationDeficit,
    anchorFailed,
    anchorPartial,
    mapBad
  });
  const candidates = (correctionItem?.safestCandidates ?? []).slice(0, 5).map((candidate) => ({
    templateResRef: candidate.templateResRef,
    tag: candidate.tag,
    role: candidate.role,
    safeUse: candidate.safeUse,
    visualTransform: Boolean(candidate.visualTransform),
    correctionScore: candidate.correctionScore,
    nearestTargetZone: candidate.nearestTargetZone,
    distanceToTarget: candidate.distanceToTarget,
    moveHint: candidate.moveHint
  }));
  const targetZones = (correctionItem?.targetZones ?? []).map((zone) => ({
    zone: zone.zone,
    subcell: zone.subcell,
    priority: zone.priority,
    brightExcess: zone.brightExcess,
    darkDeficit: zone.darkDeficit,
    saturationDeficit: zone.saturationDeficit,
    worldTarget: zone.worldTarget
  }));

  return {
    tile: tile.id,
    role: tile.conceptRole,
    layout: tile.layout,
    priority: round2(priority),
    decision,
    reason: fastDecisionReason({
      tile,
      decision,
      priority,
      brightExcess,
      darkDeficit,
      saturationDeficit,
      anchorFailed,
      anchorPartial,
      mapBad
    }),
    signals: {
      anchorScore: tile.anchors?.score ?? null,
      anchorFailed,
      anchorPartial,
      placeableCount: tile.placeables?.count ?? null,
      visualTransformCount: tile.placeables?.visualTransformCount ?? null,
      likelyCause: tile.likelyCause,
      brightExcess: round2(brightExcess),
      darkDeficit: round2(darkDeficit),
      saturationDeficit: round2(saturationDeficit)
    },
    targetZones,
    placeableCandidates: candidates,
    doNotTouch: buildFastDoNotTouch(decision),
    offlineGateBeforeToolset: buildOfflineGateForDecision(decision)
  };
}

function chooseFastDecision({
  safety,
  tile,
  priority,
  brightExcess,
  darkDeficit,
  saturationDeficit,
  anchorFailed,
  anchorPartial,
  mapBad
}) {
  if (safety.status === "blocked") {
    return "safety_first";
  }
  if (!tile.image) {
    return "capture_first";
  }
  if (mapBad || anchorFailed > 0 || anchorPartial > 0 || tile.likelyCause === "placeable_anchor_gap") {
    return "placeable_first";
  }
  if (priority >= 0.55 && (brightExcess >= 12 || darkDeficit >= 0.08)) {
    return "tile_first";
  }
  if (priority >= 0.45 && saturationDeficit >= 0.06) {
    return "palette_placeable_first";
  }
  return "hold_current_tile";
}

function fastDecisionReason({
  tile,
  decision,
  priority,
  brightExcess,
  darkDeficit,
  saturationDeficit,
  anchorFailed,
  anchorPartial,
  mapBad
}) {
  if (decision === "safety_first") {
    return "Safety gates are not clean; no visual proof should be launched.";
  }
  if (decision === "capture_first") {
    return "No Toolset screenshot/image delta is attached, so visual diagnosis would be guesswork.";
  }
  if (decision === "placeable_first") {
    return `Placeable/map gate is not clean for ${tile.id}: mapBad=${Boolean(mapBad)}, anchorFailed=${anchorFailed}, anchorPartial=${anchorPartial}.`;
  }
  if (decision === "tile_first") {
    return `Anchors are clean, but image delta is large: priority=${format(priority)}, brightExcess=${format(brightExcess)}, darkDeficit=${format(darkDeficit)}.`;
  }
  if (decision === "palette_placeable_first") {
    return `Shape is closer than palette: saturationDeficit=${format(saturationDeficit)} with priority=${format(priority)}.`;
  }
  return `No high-priority automated mismatch for ${tile.id}; keep stable unless a neighboring edit changes the read.`;
}

function buildFastDoNotTouch(decision) {
  if (decision === "safety_first") {
    return ["Do not open Toolset.", "Do not retry a module that already raised access violation."];
  }
  if (decision === "tile_first") {
    return [
      "Do not spend the next pass on tiny clutter.",
      "Do not mix tile layout/orientation with placeable Bearing or new VisualTransform.",
      "Do not open Toolset until offline crash-risk and preflight pass."
    ];
  }
  if (decision === "placeable_first") {
    return [
      "Do not change tile IDs/orientations in this pass.",
      "Do not add new VisualTransform unless this is the only variable in the candidate."
    ];
  }
  if (decision === "palette_placeable_first") {
    return ["Do not move anchors that already pass.", "Do not use blocked mood overlays for color correction."];
  }
  return ["Do not churn this tile while higher-priority cells remain."];
}

function buildOfflineGateForDecision(decision) {
  if (decision === "safety_first") {
    return "fix_safety_report_before_any_toolset_use";
  }
  if (decision === "capture_first") {
    return "run_readonly_toolset_capture_once_preflight_is_clean";
  }
  if (decision === "tile_first") {
    return "candidate_diff_plus_crash_risk_plus_preflight_then_one_readonly_capture";
  }
  if (decision === "placeable_first" || decision === "palette_placeable_first") {
    return "concept_map_plus_anchor_compare_plus_candidate_diff_then_one_readonly_capture";
  }
  return "no_candidate_needed";
}

function fastActionRank(decision) {
  return {
    safety_first: 6,
    placeable_first: 5,
    tile_first: 4,
    palette_placeable_first: 3,
    capture_first: 2,
    hold_current_tile: 1
  }[decision] ?? 0;
}

function buildFastNextCommands({ safety, toolsetPath, firstActionable }) {
  if (safety.status === "blocked") {
    return [
      "node backend/scripts/check-last-city-apartment-area-crash-risk.mjs --modulePath <candidate.mod> --out <out>/crash-risk.json",
      "node backend/scripts/preflight-last-city-toolset-proof.mjs --modulePath <candidate.mod> --out <out>/toolset-proof-preflight.json"
    ];
  }
  if (safety.status === "requires_explicit_override") {
    return [
      "Do not auto-launch Toolset from this report.",
      "For visual proof, run exactly one supervised single-open probe only after explicitly setting the repeated-AV-family override."
    ];
  }
  if (!toolsetPath) {
    return [
      "node backend/scripts/open-last-city-module-and-area-toolset-no-global-input.mjs --modulePath <candidate.mod> --area cdx_mapflat01",
      "node backend/scripts/capture-areas-toolset-window-readonly.mjs --expectedModuleParts <candidate-name> --expectedArea cdx_mapflat01"
    ];
  }
  if (firstActionable?.decision === "tile_first") {
    return [
      "Generate one candidate with only tile/material/large-silhouette changes for the listed tile.",
      "Run compare-last-city-concept-parity.mjs with --baseline and --preflightReport before any Toolset proof."
    ];
  }
  if (firstActionable?.decision === "placeable_first" || firstActionable?.decision === "palette_placeable_first") {
    return [
      "Apply only the listed moveHint/Adjust Location changes for the first tile.",
      "Run compare-last-city-concept-parity.mjs with --baseline before Toolset proof."
    ];
  }
  return ["Keep current module stable; review human visual gaps before making another candidate."];
}

function classifyOverallStatus({ candidateDiff, crashRisk, preflight, conceptMap, anchors, comparison, priorityQueue, toolsetPath }) {
  if (crashRisk?.status && crashRisk.status !== "passed") {
    return "blocked_by_crash_risk";
  }
  if (isPreflightHardBlocked(preflight)) {
    return "blocked_by_toolset_preflight";
  }
  if (classifyCandidateDiff(candidateDiff) === "needs_diff_review") {
    return "needs_candidate_diff_review";
  }
  if (conceptMap?.status === "failed") {
    return "blocked_by_placeable_rules";
  }
  if (anchors?.status !== "passed") {
    return "needs_placeable_anchor_iteration";
  }
  if (!toolsetPath && isPreflightExplicitOverrideRequired(preflight)) {
    return "offline_pass_requires_supervised_toolset_override";
  }
  if (!toolsetPath) {
    return "offline_pass_awaiting_toolset_visual";
  }
  if (
    comparison?.result === "needs_visual_iteration" ||
    priorityQueue.some((item) => item.area !== "placeables" && ["critical", "high"].includes(item.severity))
  ) {
    return "needs_visual_tile_or_composition_iteration";
  }
  if (comparison?.result === "pass_with_iteration_notes") {
    return "visual_pass_with_iteration_notes";
  }
  return comparison?.result ?? "unknown";
}

function isPreflightHardBlocked(preflight) {
  if (!preflight) {
    return false;
  }
  if ((preflight.blockers ?? []).length > 0) {
    return true;
  }
  return Boolean(
    preflight.status &&
      !["passed", "requires_explicit_override", "existing_capture_no_launch_preflight_skipped"].includes(preflight.status)
  );
}

function isPreflightExplicitOverrideRequired(preflight) {
  return (
    preflight?.status === "requires_explicit_override" ||
    preflight?.requiresExplicitOverride === true ||
    preflight?.avReadiness?.requiresExplicitOverride === true
  );
}

function classifyCandidateDiff(candidateDiff) {
  if (!candidateDiff) {
    return "not_run";
  }
  if ((getVisualTransformChangedCount(candidateDiff) ?? 0) > 0) {
    return isAllowedVisualTransformDiff(candidateDiff) ? "passed_reviewed_vt" : "needs_diff_review";
  }
  if ((candidateDiff.after?.riskyOverlayCount ?? 0) > 0 || (candidateDiff.after?.nonMotifFloorOverlayCount ?? 0) > 0) {
    return "needs_diff_review";
  }
  return "passed";
}

function getVisualTransformChangedCount(candidateDiff) {
  if (!candidateDiff) {
    return null;
  }
  return candidateDiff.delta?.visualTransformChangedCount ?? candidateDiff.visualTransformChangedCount ?? 0;
}

function isAllowedVisualTransformDiff(candidateDiff) {
  if (!allowVisualTransformDiff) {
    return false;
  }
  if ((candidateDiff.delta?.addedCount ?? 0) > 0 || (candidateDiff.delta?.removedCount ?? 0) > 0) {
    return false;
  }
  if ((candidateDiff.after?.riskyOverlayCount ?? 0) > 0 || (candidateDiff.after?.nonMotifFloorOverlayCount ?? 0) > 0) {
    return false;
  }
  const samples = candidateDiff.delta?.visualTransformChangedSamples ?? [];
  if (!samples.length) {
    return false;
  }
  if (!allowedVisualTransformDiffTags.length) {
    return true;
  }
  return samples.every((sample) => {
    const tag = String(sample.placeable?.tag ?? "").toLowerCase();
    return allowedVisualTransformDiffTags.some((allowed) => tag.includes(allowed));
  });
}

function buildGlobalVisualNextAction(check, comparison) {
  const conceptStats = comparison?.imageEvidence?.conceptImage?.stats ?? {};
  const toolsetStats = comparison?.imageEvidence?.toolsetCropImage?.stats ?? {};
  if (check.id === "visual_warmth") {
    const conceptWarm = Number(conceptStats.warmPixelRatio);
    const toolsetWarm = Number(toolsetStats.warmPixelRatio);
    if (Number.isFinite(conceptWarm) && Number.isFinite(toolsetWarm) && toolsetWarm > conceptWarm) {
      return "Reduce the uniform warm wood read: add darker/neutral stone or wall mass, then keep candle warmth as localized highlights.";
    }
    return "Add localized warm candle/fire points without flattening the whole room into one color.";
  }
  if (check.id === "visual_luma_parity") {
    const conceptLuma = Number(conceptStats.averageLuma);
    const toolsetLuma = Number(toolsetStats.averageLuma);
    if (Number.isFinite(conceptLuma) && Number.isFinite(toolsetLuma) && toolsetLuma > conceptLuma) {
      return "Darken the large floor/wall reads before adding clutter; the Toolset crop is brighter than the concept.";
    }
    return "Recover readable highlights without losing the concept's dark mass.";
  }
  if (check.id === "visual_dark_mass") {
    const conceptDark = Number(conceptStats.darkPixelRatio);
    const toolsetDark = Number(toolsetStats.darkPixelRatio);
    if (Number.isFinite(conceptDark) && Number.isFinite(toolsetDark) && toolsetDark < conceptDark) {
      return "Increase dark structural mass and reduce empty bright floor reads.";
    }
    return "Keep dark mass controlled; avoid turning furniture clusters into unreadable blocks.";
  }
  return check.nextAction;
}

function buildTileLayoutDiff({ before, after, conceptTiles }) {
  const conceptByCell = new Map(
    (conceptTiles ?? []).map((tile) => [`${Number(tile.tile?.x ?? -1)},${Number(tile.tile?.y ?? -1)}`, tile])
  );
  const beforeByCell = new Map((before?.tiles ?? []).map((tile) => [`${Number(tile.x)},${Number(tile.y)}`, tile]));
  const afterByCell = new Map((after?.tiles ?? []).map((tile) => [`${Number(tile.x)},${Number(tile.y)}`, tile]));
  const keys = [...new Set([...beforeByCell.keys(), ...afterByCell.keys()])].sort();
  const changedCells = [];
  for (const key of keys) {
    const beforeTile = beforeByCell.get(key) ?? null;
    const afterTile = afterByCell.get(key) ?? null;
    const conceptTile = conceptByCell.get(key) ?? null;
    const fieldChanges = [];
    for (const field of ["tileId", "orientation", "mainLight1", "mainLight2", "sourceLight1", "sourceLight2"]) {
      if (normalizeNumber(beforeTile?.[field]) !== normalizeNumber(afterTile?.[field])) {
        fieldChanges.push({
          field,
          before: beforeTile?.[field] ?? null,
          after: afterTile?.[field] ?? null
        });
      }
    }
    if (fieldChanges.length) {
      changedCells.push({
        cellId: conceptTile?.id ?? key,
        conceptRole: conceptTile?.conceptRole ?? null,
        x: afterTile?.x ?? beforeTile?.x ?? null,
        y: afterTile?.y ?? beforeTile?.y ?? null,
        before: beforeTile ? compactTileLayoutCell(beforeTile) : null,
        after: afterTile ? compactTileLayoutCell(afterTile) : null,
        fieldChanges
      });
    }
  }
  return {
    version: "last-city-tile-layout-diff/v1",
    generatedAt: new Date().toISOString(),
    beforePath: before?.modulePath ?? null,
    afterPath: after?.modulePath ?? null,
    areaResref: after?.areaResref ?? before?.areaResref ?? AREA_RESREF,
    status: changedCells.length ? "changed" : "unchanged",
    changedCount: changedCells.length,
    tileIdChangedCount: changedCells.filter((cell) => cell.fieldChanges.some((change) => change.field === "tileId")).length,
    orientationChangedCount: changedCells.filter((cell) => cell.fieldChanges.some((change) => change.field === "orientation")).length,
    lightChangedCount: changedCells.filter((cell) =>
      cell.fieldChanges.some((change) => ["mainLight1", "mainLight2", "sourceLight1", "sourceLight2"].includes(change.field))
    ).length,
    areaLightingDiff: buildAreaLightingDiff(before?.areaLighting, after?.areaLighting),
    changedCells
  };
}

function buildAreaLightingDiff(beforeLighting, afterLighting) {
  const fields = [
    "ShadowOpacity",
    "MoonAmbientColor",
    "MoonDiffuseColor",
    "SunAmbientColor",
    "SunDiffuseColor",
    "SunShadows",
    "MoonShadows",
    "FogColor",
    "FogAmount",
    "FogClipDist",
    "IsNight",
    "DayNightCycle"
  ];
  const changes = fields
    .filter((field) => normalizeNumber(beforeLighting?.[field]) !== normalizeNumber(afterLighting?.[field]))
    .map((field) => ({
      field,
      before: beforeLighting?.[field] ?? null,
      after: afterLighting?.[field] ?? null
    }));
  return {
    status: changes.length ? "changed" : "unchanged",
    changedCount: changes.length,
    changes
  };
}

function compactTileLayoutCell(tile) {
  return {
    index: tile.index ?? null,
    x: tile.x ?? null,
    y: tile.y ?? null,
    tileId: tile.tileId ?? null,
    orientation: tile.orientation ?? null,
    mainLights: [tile.mainLight1 ?? null, tile.mainLight2 ?? null],
    sourceLights: [tile.sourceLight1 ?? null, tile.sourceLight2 ?? null]
  };
}

function normalizeNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function hasTileLayoutChanges(tileLayoutDiff) {
  return Number(tileLayoutDiff?.changedCount ?? 0) > 0;
}

function hasPlaceableOrVisualTransformChanges(candidateDiff) {
  const delta = candidateDiff?.delta ?? {};
  return (
    Number(delta.addedCount ?? 0) > 0 ||
    Number(delta.removedCount ?? 0) > 0 ||
    Number(delta.visualTransformChangedCount ?? candidateDiff?.visualTransformChangedCount ?? 0) > 0
  );
}

function summarizeObjectChangeCount(candidateDiff) {
  const delta = candidateDiff?.delta ?? {};
  const added = Number(delta.addedCount ?? 0);
  const removed = Number(delta.removedCount ?? 0);
  const vt = Number(delta.visualTransformChangedCount ?? candidateDiff?.visualTransformChangedCount ?? 0);
  return `added=${added}, removed=${removed}, vt=${vt}`;
}

function buildCandidateChangeSummary({ candidateDiff, tileLayoutDiff }) {
  const delta = candidateDiff?.delta ?? {};
  const tileChanged = hasTileLayoutChanges(tileLayoutDiff);
  const areaLightingChanged = Number(tileLayoutDiff?.areaLightingDiff?.changedCount ?? 0) > 0;
  const objectAdded = Number(delta.addedCount ?? 0);
  const objectRemoved = Number(delta.removedCount ?? 0);
  const vtChanged = Number(delta.visualTransformChangedCount ?? candidateDiff?.visualTransformChangedCount ?? 0);
  const objectChanged = objectAdded > 0 || objectRemoved > 0 || vtChanged > 0;
  const candidateClass =
    [tileChanged, objectChanged, areaLightingChanged].filter(Boolean).length > 1
      ? "mixed_tile_object_or_lighting"
      : tileChanged
        ? "tile_layout_only"
        : objectChanged
          ? "placeable_or_visual_transform_only"
          : areaLightingChanged
            ? "area_lighting_only"
            : "no_structural_delta";
  return {
    candidateClass,
    noMixStatus: [tileChanged, objectChanged, areaLightingChanged].filter(Boolean).length > 1 ? "violated" : "clean",
    tileLayout: tileLayoutDiff
      ? {
          status: tileLayoutDiff.status,
          changedCount: tileLayoutDiff.changedCount,
          tileIdChangedCount: tileLayoutDiff.tileIdChangedCount,
          orientationChangedCount: tileLayoutDiff.orientationChangedCount,
          lightChangedCount: tileLayoutDiff.lightChangedCount,
          areaLightingDiff: tileLayoutDiff.areaLightingDiff ?? { status: "missing", changedCount: null, changes: [] },
          changedCells: (tileLayoutDiff.changedCells ?? []).slice(0, 8)
        }
      : {
          status: "not_run",
          changedCount: null,
          changedCells: []
        },
    placeables: {
      addedCount: objectAdded,
      removedCount: objectRemoved,
      visualTransformChangedCount: vtChanged,
      addedByTile: delta.addedByTile ?? {},
      removedByTile: delta.removedByTile ?? {},
      visualTransformChangedByTile: delta.visualTransformChangedByTile ?? {}
    }
  };
}

function buildIterationDecisionMatrix({ label, status, score, safety, changeSummary, sortedTiles, firstActionable, priorityQueue, baselineIdentity }) {
  const baseline = baselineIdentity ?? LAST_CITY_CONCEPT_BEST_BASELINE;
  const scoreDelta = hasFiniteNumericValue(score) && hasFiniteNumericValue(baseline.score)
    ? Number((Number(score) - Number(baseline.score)).toFixed(3))
    : null;
  const candidateVerdict = buildCandidateVerdict({ status, scoreDelta, safety, changeSummary, baseline });
  const firstTile = firstActionable?.tile ?? null;
  const experimentMemory = buildRelevantExperimentMemory({ firstTile, changeSummary });
  return {
    version: "last-city-iteration-decision-matrix/v1",
    generatedAt: new Date().toISOString(),
    label,
    status,
    baseline,
    candidateVerdict,
    changeSummary,
    experimentMemory,
    firstActionable: firstActionable
      ? {
          tile: firstActionable.tile,
          decision: firstActionable.decision,
          reason: firstActionable.reason
        }
      : null,
    priorityQueue: priorityQueue.slice(0, 8),
    tiles: sortedTiles.map((tile) => buildDecisionMatrixTileRow({ tile, experimentMemory })),
    nextSingleExperiment: buildNextSingleExperiment({ firstActionable, changeSummary, experimentMemory })
  };
}

function buildCandidateVerdict({ status, scoreDelta, safety, changeSummary, baseline }) {
  if (safety.status === "blocked") {
    return {
      status: "blocked",
      promotion: "no",
      reason: `Safety is ${safety.status}; do not proof or promote.`
    };
  }
  if (safety.status === "requires_explicit_override") {
    return {
      status: "awaiting_supervised_toolset_override",
      promotion: "no",
      reason:
        "Offline gates passed, but Toolset proof requires an explicit supervised single-open override because of repeated historical AVs."
    };
  }
  if (status === "offline_pass_awaiting_toolset_visual") {
    return {
      status: "awaiting_visual_proof",
      promotion: "no",
      reason: "Offline gates passed, but no Toolset screenshot was compared yet."
    };
  }
  if (changeSummary.noMixStatus === "violated") {
    return {
      status: "split_required",
      promotion: "no",
      reason: "Candidate mixes tile layout and placeable/VT changes, so visual result cannot identify one cause."
    };
  }
  if (!hasFiniteNumericValue(scoreDelta)) {
    return {
      status: "visual_score_missing",
      promotion: "no",
      scoreDelta: null,
      reason: "No visual score is available; do not compare against the visual baseline."
    };
  }
  if (scoreDelta > 0.003) {
    return {
      status: "candidate_improved",
      promotion: "review_visual_then_promote",
      scoreDelta,
      reason: `Score is above ${baseline.id} by ${format(scoreDelta)}; human visual review still required.`
    };
  }
  if (scoreDelta >= -0.003) {
    return {
      status: "candidate_neutral",
      promotion: "no",
      scoreDelta,
      reason: `Score is effectively tied with ${baseline.id}; keep baseline unless visual review shows a clear win.`
    };
  }
  return {
    status: "candidate_regressed",
    promotion: "no",
    scoreDelta,
    reason: `Score is below ${baseline.id} by ${format(Math.abs(scoreDelta))}; reject this direction.`
  };
}

function buildRelevantExperimentMemory({ firstTile, changeSummary }) {
  const relevant = LAST_CITY_CONCEPT_EXPERIMENT_MEMORY.filter((entry) => {
    const tileMatch = !firstTile || entry.tiles.includes(firstTile) || entry.tiles.includes("global");
    const classMatch =
      changeSummary.candidateClass === "tile_layout_only"
        ? entry.class === "tile_layout" || entry.class === "hak_profile"
        : changeSummary.candidateClass === "placeable_or_visual_transform_only"
          ? entry.class === "placeable_composition" || entry.class === "visual_transform"
          : changeSummary.candidateClass === "area_lighting_only"
            ? entry.class === "area_lighting"
          : true;
    return tileMatch || classMatch;
  });
  return {
    currentBest: LAST_CITY_CONCEPT_BEST_BASELINE,
    doNotRepeat: relevant.filter((entry) => entry.decision === "do_not_repeat" || entry.decision === "never_retry"),
    blockedBeforeToolset: relevant.filter((entry) => entry.decision === "do_not_open"),
    neutralNotPromoted: relevant.filter((entry) => entry.decision === "do_not_promote"),
    allRelevant: relevant
  };
}

function buildDecisionMatrixTileRow({ tile, experimentMemory }) {
  const blockedForTile = experimentMemory.allRelevant
    .filter((entry) => entry.tiles.includes(tile.tile) || entry.tiles.includes("global"))
    .map((entry) => ({
      id: entry.id,
      status: entry.status,
      lesson: entry.lesson,
      blocks: entry.blocks
    }));
  return {
    tile: tile.tile,
    role: tile.role,
    decision: tile.decision,
    priority: tile.priority,
    placeableLayer: describePlaceableLayer(tile),
    tileLayer: describeTileLayer(tile),
    visualTransformLayer: describeVisualTransformLayer(tile),
    blockedLessons: blockedForTile,
    allowedNext: buildAllowedNextForTile(tile, blockedForTile)
  };
}

function describePlaceableLayer(tile) {
  const anchorFailed = Number(tile.signals.anchorFailed ?? 0);
  const anchorPartial = Number(tile.signals.anchorPartial ?? 0);
  if (anchorFailed > 0 || anchorPartial > 0) {
    return {
      state: "needs_adjust_location_or_template_fix",
      evidence: `anchorFailed=${anchorFailed}, anchorPartial=${anchorPartial}`,
      action: "Use Aurora Adjust Location or generator positions for the failing anchor only; do not change tile layout in the same candidate."
    };
  }
  return {
    state: "anchors_clean",
    evidence: `anchorScore=${format(tile.signals.anchorScore)}, placeables=${format(tile.signals.placeableCount)}`,
    action: "Do not start with random Adjust Location; image delta is not caused by missing anchor coverage."
  };
}

function describeTileLayer(tile) {
  if (tile.decision === "tile_first") {
    return {
      state: "primary_mismatch",
      evidence: `brightExcess=${format(tile.signals.brightExcess)}, darkDeficit=${format(tile.signals.darkDeficit)}, likelyCause=${tile.signals.likelyCause}`,
      action: "Use a tile/material/large-silhouette experiment and keep placeable/VT changes out of the same candidate."
    };
  }
  if (tile.decision === "palette_placeable_first") {
    return {
      state: "palette_or_texture_mismatch",
      evidence: `saturationDeficit=${format(tile.signals.saturationDeficit)}`,
      action: "Use richer local textile/wood objects or material choice, keeping anchors stable."
    };
  }
  return {
    state: "not_first_target",
    evidence: `decision=${tile.decision}`,
    action: "Hold tile layout stable while higher-priority cells are tested."
  };
}

function describeVisualTransformLayer(tile) {
  const vtCount = Number(tile.signals.visualTransformCount ?? 0);
  return {
    state: vtCount > 0 ? "present_but_not_first_explanation" : "not_present",
    evidence: `visualTransformCount=${format(vtCount)}`,
    action:
      "Use VisualTransform only as an isolated candidate. Wall-scale bundle tilemap54 regressed, and q_148 above safe range is blocked."
  };
}

function buildAllowedNextForTile(tile, blockedLessons) {
  if (tile.decision === "safety_first") {
    return "No visual iteration. Fix safety and preflight first.";
  }
  if (tile.decision === "tile_first" && tile.tile === "NW") {
    return "NW: one tile/material or lighting experiment only; do not repeat +4 NW silhouettes, single low SW chair-only, round planning table VT, tile 256/1, tile 72/1, tile 72/0, tile 72/3, tile 87/1, tile 91/1, tile 476/0, tile 59/3, tile 194/0, q_148 over 0.45/0.50, or the wall VT bundle.";
  }
  if (tile.decision === "tile_first") {
    return `One ${tile.tile} tile/material or large-silhouette experiment, with no new VT and no simultaneous Adjust Location. Blocked lessons: ${blockedLessons.map((lesson) => lesson.id).join(", ") || "none"}.`;
  }
  if (tile.decision === "placeable_first") {
    return `Only the failing ${tile.tile} anchor move/replacement; use Adjust Location or generator coordinates, then recapture.`;
  }
  if (tile.decision === "palette_placeable_first") {
    return `Only local color/material enrichment in ${tile.tile}; keep anchor objects fixed.`;
  }
  return "Hold this tile.";
}

function buildNextSingleExperiment({ firstActionable, changeSummary, experimentMemory }) {
  if (!firstActionable) {
    return {
      type: "none",
      command: "Review human visual gaps before another candidate.",
      guardrail: "No automated target selected."
    };
  }
  if (changeSummary.noMixStatus === "violated") {
    return {
      type: "split_current_candidate",
      command: "Split tile layout, area lighting, and placeable/VT changes into separate modules before any Toolset proof.",
      guardrail: "Mixed candidates are not interpretable."
    };
  }
  if (firstActionable.decision === "tile_first" && changeSummary.candidateClass === "area_lighting_only") {
    return {
      type: "lighting_only_review",
      tile: firstActionable.tile,
      command: "Review this as a lighting-only proof; do not promote unless the visual score beats the baseline.",
      guardrail: "Do not combine lighting with tile or placeable changes in the same candidate."
    };
  }
  if (firstActionable.decision === "tile_first") {
    return {
      type: "tile_or_material_only",
      tile: firstActionable.tile,
      command: `Create exactly one ${firstActionable.tile} tile/material candidate, then run compare-last-city-concept-parity.mjs with --baseline and a fresh screenshot.`,
      guardrail: `Avoid known blocked/rejected moves: ${experimentMemory.allRelevant
        .flatMap((entry) => entry.blocks ?? [])
        .slice(0, 8)
        .join(", ") || "none"}.`
    };
  }
  if (firstActionable.decision === "placeable_first" || firstActionable.decision === "palette_placeable_first") {
    return {
      type: "placeable_only",
      tile: firstActionable.tile,
      command: `Apply only listed ${firstActionable.tile} move hints or local material placeables; do not change tile layout or add unrelated VT.`,
      guardrail: "Use Adjust Location only for the named objects and capture once."
    };
  }
  return {
    type: "hold",
    tile: firstActionable.tile,
    command: "Keep current candidate stable.",
    guardrail: "No low-risk automated edit selected."
  };
}

function scoreOverall({ conceptMap, anchors, comparison, imageDelta }) {
  if (!comparison && !imageDelta) {
    return null;
  }
  const mapScore = conceptMap?.status === "passed" ? 1 : conceptMap?.status === "passed_with_warnings" ? 0.8 : 0;
  const anchorScore = Number(anchors?.score ?? 0);
  const visualScore = comparison ? Number(comparison.visualScore ?? 0) : 0;
  const worstImagePriority = Math.max(0, ...(imageDelta?.summary?.worstCells ?? []).map((cell) => Number(cell.priority ?? 0)));
  const imageScore = imageDelta ? Math.max(0, Math.min(1, 1 - worstImagePriority / 1.25)) : 0;
  const weights = comparison ? [0.2, 0.25, 0.35, 0.2] : [0.25, 0.25, 0, 0.5];
  const score =
    mapScore * weights[0] +
    anchorScore * weights[1] +
    visualScore * weights[2] +
    imageScore * weights[3];
  return Number(score.toFixed(3));
}

function scoreStructural({ conceptMap, anchors }) {
  const mapScore = conceptMap?.status === "passed" ? 1 : conceptMap?.status === "passed_with_warnings" ? 0.8 : 0;
  const anchorScore = Number(anchors?.score ?? 0);
  return Number((mapScore * 0.45 + anchorScore * 0.55).toFixed(3));
}

function buildTileLayoutByCell(tileLayout, conceptTilesById) {
  const result = new Map();
  for (const tile of tileLayout?.tiles ?? []) {
    for (const [cellId, conceptTile] of conceptTilesById.entries()) {
      const position = conceptTile.tile ?? {};
      if (Number(position.x) === Number(tile.x) && Number(position.y) === Number(tile.y)) {
        result.set(cellId, {
          index: tile.index,
          x: tile.x,
          y: tile.y,
          tileId: tile.tileId,
          orientation: tile.orientation,
          mainLights: [tile.mainLight1, tile.mainLight2],
          sourceLights: [tile.sourceLight1, tile.sourceLight2]
        });
      }
    }
  }
  return result;
}

function buildLayerBlameMap({ label, status, score, reports, outputs, tileAssessments, fastIterationPlan }) {
  const fastTilesById = new Map((fastIterationPlan?.tiles ?? []).map((tile) => [tile.tile, tile]));
  const conceptTilesById = new Map((reports.conceptMap?.tiles ?? []).map((tile) => [tile.id, tile]));
  const anchorTilesById = new Map((reports.anchors?.tiles ?? []).map((tile) => [tile.id, tile]));
  const imageCellsById = new Map((reports.imageDelta?.cells ?? []).map((cell) => [cell.id, cell]));
  const tileChangesById = new Map((reports.tileLayoutDiff?.changedCells ?? []).map((cell) => [cell.cellId, cell]));
  const instanceRows = readPlaceableInstanceCsv(outputs.placeableInstancesPath).filter((row) => row.areaResref === AREA_RESREF);
  const instancesByTile = groupPlaceableInstancesByTile(instanceRows, tileAssessments);
  const candidateLayerChanges = buildCandidateLayerChanges(reports.candidateDiff, reports.tileLayoutDiff);
  const tiles = (fastIterationPlan?.tiles ?? tileAssessments).map((fastTile, index) => {
    const tileId = fastTile.tile ?? fastTile.id;
    const assessment = tileAssessments.find((tile) => tile.id === tileId) ?? {};
    const conceptTile = conceptTilesById.get(tileId) ?? null;
    const anchorTile = anchorTilesById.get(tileId) ?? null;
    const imageCell = imageCellsById.get(tileId) ?? null;
    const localInstances = instancesByTile.get(tileId) ?? [];
    const layer = classifyTileLayerBlame({ fastTile, assessment, conceptTile, anchorTile, imageCell, candidateLayerChanges, tileId });
    const targetZones = fastTile.targetZones ?? assessment.image?.targetSubcells ?? [];
    return {
      tile: tileId,
      role: fastTile.role ?? assessment.conceptRole ?? conceptTile?.conceptRole ?? null,
      layout: assessment.layout ?? fastTile.layout ?? null,
      currentDecision: fastTile.decision ?? "unknown",
      primaryLayer: layer.primaryLayer,
      confidence: layer.confidence,
      evidence: layer.evidence,
      imageDelta: compactImageDelta(assessment.image, imageCell),
      placeableLayer: {
        verdict: layer.placeableVerdict,
        anchorScore: anchorTile?.score ?? assessment.anchors?.score ?? null,
        anchorFailed: anchorTile?.failedAnchors ?? assessment.anchors?.failed ?? null,
        anchorPartial: anchorTile?.partialAnchors ?? assessment.anchors?.partial ?? null,
        budgetStatus: conceptTile?.budgetStatus ?? assessment.placeables?.budgetStatus ?? null,
        count: localInstances.length || conceptTile?.placeableCount || assessment.placeables?.count || 0,
        roleCounts: topCounts(countBy(localInstances, "role"), 8),
        topTemplates: topCounts(countBy(localInstances, "templateResRef"), 8),
        nearestMeasuredTargets: nearestPlaceablesToTargets(localInstances, targetZones, 6),
        adjustmentCandidates: (fastTile.placeableCandidates ?? []).slice(0, 5)
      },
      tileLayer: {
        verdict: layer.tileVerdict,
        changedInCandidate: Boolean(tileChangesById.get(tileId)),
        candidateTileChange: tileChangesById.get(tileId) ?? null,
        imageTargets: normalizeTargetZones(targetZones),
        tileCandidateShortlist: buildTileCandidateShortlist({
          tileId,
          decision: fastTile.decision,
          layout: assessment.layout ?? fastTile.layout ?? null,
          rankReport: reports.tileRank
        }),
        blockedExperiments: blockedExperimentMemoryForTile(tileId, "tile_layout")
      },
      visualTransformLayer: {
        verdict: layer.visualTransformVerdict,
        count: conceptTile?.visualTransformCount ?? assessment.placeables?.visualTransformCount ?? null,
        changedInCandidate: Number(candidateLayerChanges.visualTransformChangedByTile[tileId] ?? 0),
        blockedExperiments: blockedExperimentMemoryForTile(tileId, "visual_transform")
      },
      lightingLayer: {
        verdict: layer.lightingVerdict,
        areaLightingChanged: candidateLayerChanges.areaLightingChanged,
        changedFields: candidateLayerChanges.areaLightingFields
      },
      safeNext: buildLayerSafeNext({ fastTile, layer, tileId, rank: index + 1 }),
      rejectIfMixedWith: buildLayerRejectMix(layer.primaryLayer)
    };
  });
  const first = tiles.find((tile) => tile.safeNext?.rank === 1) ?? tiles[0] ?? null;
  return {
    version: "last-city-layer-blame-map/v1",
    generatedAt: new Date().toISOString(),
    label,
    status,
    score,
    method:
      "Offline layer blame map: combines screenshot image deltas, concept anchors, GIT placeables, candidate diff, ARE tile layout, and area lighting diff. It never launches Toolset.",
    summary: {
      firstTile: first?.tile ?? null,
      firstLayer: first?.primaryLayer ?? null,
      firstAction: first?.safeNext?.action ?? null,
      tileCount: tiles.length,
      placeableInstanceRows: instanceRows.length,
      safetyStatus: fastIterationPlan?.summary?.safetyStatus ?? "unknown"
    },
    guardrails: [
      "One candidate may change exactly one layer: tile/material, placeable position, VisualTransform, or area lighting.",
      "If primaryLayer is tile_material_or_large_silhouette and anchors are clean, do not use random Adjust Location as the next proof.",
      "If primaryLayer is placeable_anchor_or_budget, do not change tile ids/orientations in the same proof.",
      "Access violation remains a critical stop: close Toolset, quarantine the module, and do not retry that candidate."
    ],
    candidateLayerChanges,
    tiles
  };
}

function classifyTileLayerBlame({ fastTile, assessment, conceptTile, anchorTile, imageCell, candidateLayerChanges, tileId }) {
  const decision = fastTile?.decision ?? "unknown";
  const priority = Number(assessment.image?.priority ?? imageCell?.delta?.priority ?? 0);
  const brightExcess = Number(assessment.image?.brightExcess ?? imageCell?.delta?.brightExcess ?? 0);
  const darkDeficit = Number(assessment.image?.darkDeficit ?? imageCell?.delta?.darkDeficit ?? 0);
  const saturationDeficit = Number(assessment.image?.saturationDeficit ?? imageCell?.delta?.saturationDeficit ?? 0);
  const anchorFailed = Number(anchorTile?.failedAnchors ?? assessment.anchors?.failed ?? 0);
  const anchorPartial = Number(anchorTile?.partialAnchors ?? assessment.anchors?.partial ?? 0);
  const budgetStatus = conceptTile?.budgetStatus ?? assessment.placeables?.budgetStatus ?? "unknown";
  const vtCount = Number(conceptTile?.visualTransformCount ?? assessment.placeables?.visualTransformCount ?? 0);
  const vtChanged = Number(candidateLayerChanges.visualTransformChangedByTile[tileId] ?? 0);
  const evidence = [
    `decision=${decision}`,
    `priority=${format(priority)}`,
    `brightExcess=${format(brightExcess)}`,
    `darkDeficit=${format(darkDeficit)}`,
    `saturationDeficit=${format(saturationDeficit)}`,
    `anchorFailed=${anchorFailed}`,
    `anchorPartial=${anchorPartial}`,
    `budget=${budgetStatus}`,
    `vt=${vtCount}`
  ];
  if (decision === "safety_first") {
    return {
      primaryLayer: "safety",
      confidence: "high",
      evidence,
      placeableVerdict: "not_assessed_until_safety_passes",
      tileVerdict: "not_assessed_until_safety_passes",
      visualTransformVerdict: "not_assessed_until_safety_passes",
      lightingVerdict: "not_assessed_until_safety_passes"
    };
  }
  if (anchorFailed > 0 || anchorPartial > 0 || (budgetStatus !== "unknown" && budgetStatus !== "ok")) {
    return {
      primaryLayer: "placeable_anchor_or_budget",
      confidence: "high",
      evidence,
      placeableVerdict: "responsible_anchor_or_budget_gap",
      tileVerdict: "hold_until_placeable_gate_clean",
      visualTransformVerdict: vtChanged > 0 ? "candidate_changed_vt_review_separately" : "not_first",
      lightingVerdict: candidateLayerChanges.areaLightingChanged ? "changed_but_not_primary" : "unchanged"
    };
  }
  if (decision === "palette_placeable_first") {
    return {
      primaryLayer: "placeable_palette_material",
      confidence: saturationDeficit >= 0.06 ? "medium" : "low",
      evidence,
      placeableVerdict: "anchors_clean_palette_or_material_read_gap",
      tileVerdict: "no_tile_id_change_first",
      visualTransformVerdict: vtCount >= 20 ? "dense_vt_do_not_add_more" : "not_first",
      lightingVerdict: candidateLayerChanges.areaLightingChanged ? "changed_but_not_primary" : "unchanged"
    };
  }
  if (decision === "tile_first" || priority >= 0.55) {
    return {
      primaryLayer: "tile_material_or_large_silhouette",
      confidence: brightExcess >= 12 || darkDeficit >= 0.08 ? "high" : "medium",
      evidence,
      placeableVerdict: "anchors_clean_do_not_randomly_adjust",
      tileVerdict: "responsible_large_read_or_material_mismatch",
      visualTransformVerdict: vtCount >= 20 ? "dense_vt_but_not_primary" : "available_only_as_isolated_candidate",
      lightingVerdict: candidateLayerChanges.areaLightingChanged ? "lighting_changed_review_result_only" : "unchanged"
    };
  }
  if (candidateLayerChanges.areaLightingChanged) {
    return {
      primaryLayer: "area_lighting",
      confidence: "medium",
      evidence,
      placeableVerdict: "unchanged",
      tileVerdict: "unchanged",
      visualTransformVerdict: vtChanged > 0 ? "candidate_changed_vt_review_separately" : "unchanged",
      lightingVerdict: "responsible_current_candidate"
    };
  }
  return {
    primaryLayer: "hold_or_human_visual_review",
    confidence: "low",
    evidence,
    placeableVerdict: "clean_or_low_priority",
    tileVerdict: "clean_or_low_priority",
    visualTransformVerdict: vtChanged > 0 ? "candidate_changed_vt_review_separately" : "clean_or_low_priority",
    lightingVerdict: "unchanged"
  };
}

function buildCandidateLayerChanges(candidateDiff, tileLayoutDiff) {
  const delta = candidateDiff?.delta ?? {};
  const areaLightingDiff = tileLayoutDiff?.areaLightingDiff ?? {};
  return {
    candidateClass: buildCandidateChangeSummary({ candidateDiff, tileLayoutDiff }).candidateClass,
    addedByTile: delta.addedByTile ?? {},
    removedByTile: delta.removedByTile ?? {},
    visualTransformChangedByTile: delta.visualTransformChangedByTile ?? {},
    tileChangedCells: (tileLayoutDiff?.changedCells ?? []).map((cell) => cell.cellId),
    areaLightingChanged: Number(areaLightingDiff.changedCount ?? 0) > 0,
    areaLightingFields: (areaLightingDiff.changes ?? []).map((change) => change.field)
  };
}

function compactImageDelta(image, imageCell) {
  const source = image ?? (imageCell ? { ...imageCell.delta, targetSubcells: imageCell.targetSubcells ?? imageCell.subcells ?? [] } : null);
  if (!source) {
    return null;
  }
  return {
    priority: source.priority ?? null,
    brightExcess: source.brightExcess ?? null,
    darkDeficit: source.darkDeficit ?? null,
    saturationDeficit: source.saturationDeficit ?? null,
    warmDelta: source.warmDelta ?? source.warmRatio ?? null,
    targetSubcells: (source.targetSubcells ?? []).slice(0, 4)
  };
}

function buildLayerSafeNext({ fastTile, layer, tileId, rank }) {
  const base = {
    rank,
    layer: layer.primaryLayer,
    tile: tileId,
    action: null,
    gate: fastTile?.offlineGateBeforeToolset ?? "compare_offline_before_toolset"
  };
  if (layer.primaryLayer === "tile_material_or_large_silhouette") {
    if (rejectedExperimentCountForTile(tileId, "tile_layout") >= 6) {
      return {
        ...base,
        action: `Create one ${tileId} material/silhouette or existing-VisualTransform candidate only; keep Tile_ID, orientation, anchor positions, and area lighting unchanged.`,
        allowedChange: `${tileId.toLowerCase()}_material_silhouette_or_existing_vt_only`
      };
    }
    return {
      ...base,
      action: `Create one ${tileId} tile/material/large-silhouette candidate only; keep placeable positions, Bearing, and VisualTransform unchanged.`,
      allowedChange: "tile_or_material_only"
    };
  }
  if (layer.primaryLayer === "placeable_anchor_or_budget") {
    return {
      ...base,
      action: `Move or replace only the failing ${tileId} anchor placeables; use Adjust Location/generator coordinates, no tile changes.`,
      allowedChange: "placeable_position_only"
    };
  }
  if (layer.primaryLayer === "placeable_palette_material") {
    return {
      ...base,
      action: `Use only local textile/wood/material placeables in ${tileId}; keep anchors and tiles stable.`,
      allowedChange: "local_placeable_material_only"
    };
  }
  if (layer.primaryLayer === "area_lighting") {
    return {
      ...base,
      action: "Review lighting proof against baseline; do not combine with tile/placeable edits.",
      allowedChange: "area_lighting_only"
    };
  }
  if (layer.primaryLayer === "safety") {
    return {
      ...base,
      action: "Fix safety/preflight/crash-risk first; do not open Toolset.",
      allowedChange: "safety_only"
    };
  }
  return {
    ...base,
    action: `Hold ${tileId} unless human visual review identifies a concrete mismatch.`,
    allowedChange: "none"
  };
}

function buildLayerRejectMix(primaryLayer) {
  if (primaryLayer === "tile_material_or_large_silhouette") {
    return ["placeable_position", "placeable_bearing", "new_visual_transform", "area_lighting"];
  }
  if (primaryLayer === "placeable_anchor_or_budget" || primaryLayer === "placeable_palette_material") {
    return ["tile_id", "tile_orientation", "area_lighting", "unrelated_visual_transform"];
  }
  if (primaryLayer === "area_lighting") {
    return ["tile_id", "tile_orientation", "placeable_position", "visual_transform"];
  }
  if (primaryLayer === "safety") {
    return ["toolset_launch", "module_retry_after_access_violation"];
  }
  return ["unrelated_churn"];
}

function groupPlaceableInstancesByTile(instances, tileAssessments) {
  const result = new Map(tileAssessments.map((tile) => [tile.id, []]));
  for (const instance of instances) {
    const tile = tileAssessments.find((candidate) => pointInsideBounds(instance, candidate.worldBounds));
    if (tile) {
      result.get(tile.id).push(instance);
    }
  }
  return result;
}

function pointInsideBounds(instance, bounds) {
  if (!bounds) {
    return false;
  }
  const x = Number(instance.x);
  const y = Number(instance.y);
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    x >= Number(bounds.minX) &&
    x <= Number(bounds.maxX) &&
    y >= Number(bounds.minY) &&
    y <= Number(bounds.maxY)
  );
}

function nearestPlaceablesToTargets(instances, targetZones, limit) {
  const targets = normalizeTargetZones(targetZones);
  if (!targets.length) {
    return instances.slice(0, limit).map(compactPlaceableInstance);
  }
  return instances
    .flatMap((instance) =>
      targets.map((target) => ({
        ...compactPlaceableInstance(instance),
        nearestTargetZone: target.zone,
        distanceToTarget: round2(Math.hypot(Number(instance.x) - Number(target.worldTarget?.x ?? 0), Number(instance.y) - Number(target.worldTarget?.y ?? 0)))
      }))
    )
    .sort((left, right) => Number(left.distanceToTarget ?? 999) - Number(right.distanceToTarget ?? 999))
    .slice(0, limit);
}

function compactPlaceableInstance(instance) {
  return {
    templateResRef: instance.templateResRef,
    tag: instance.tag,
    role: instance.role,
    x: round2(instance.x),
    y: round2(instance.y),
    z: round2(instance.z),
    bearing: round2(instance.bearing)
  };
}

function normalizeTargetZones(targetZones) {
  return (targetZones ?? [])
    .map((target) => ({
      zone: target.zone ?? target.id ?? "unknown",
      subcell: target.subcell ?? target.id ?? null,
      priority: target.priority ?? target.delta?.priority ?? null,
      brightExcess: target.brightExcess ?? target.delta?.brightExcess ?? null,
      darkDeficit: target.darkDeficit ?? target.delta?.darkDeficit ?? null,
      saturationDeficit: target.saturationDeficit ?? target.delta?.saturationDeficit ?? null,
      worldTarget: target.worldTarget ?? null
    }))
    .filter((target) => target.zone);
}

function countBy(rows, field) {
  const counts = {};
  for (const row of rows ?? []) {
    const key = row?.[field] ? String(row[field]) : "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function topCounts(counts, limit) {
  return Object.entries(counts ?? {})
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function blockedExperimentMemoryForTile(tileId, className) {
  return LAST_CITY_CONCEPT_EXPERIMENT_MEMORY.filter(
    (entry) =>
      (entry.class === className || (className === "tile_layout" && entry.class === "area_lighting")) &&
      ((entry.tiles ?? []).includes(tileId) || (entry.tiles ?? []).includes("global"))
  ).map((entry) => ({
    id: entry.id,
    status: entry.status,
    decision: entry.decision,
    blocks: entry.blocks ?? []
  }));
}

function buildTileCandidateShortlist({ tileId, decision, layout, rankReport }) {
  if (decision !== "tile_first" || !rankReport || !layout) {
    return [];
  }
  const x = Number(layout.x);
  const y = Number(layout.y);
  const currentTileId = Number(layout.tileId);
  const currentOrientation = Number(layout.orientation);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return [];
  }
  const blocked = new Set(
    blockedExperimentMemoryForTile(tileId, "tile_layout")
      .flatMap((entry) => entry.blocks ?? [])
      .map((block) => String(block).toLowerCase())
  );
  const candidates = [];
  for (const source of iterateTileRankSources(rankReport)) {
    const candidate = tileCandidateFromRankSource(source, x, y);
    if (!candidate) {
      continue;
    }
    if (candidate.tileId <= 0) {
      continue;
    }
    if (blocked.has("mixed_j_tile_crop") && isJTileCandidate(candidate, source)) {
      continue;
    }
    if (candidate.tileId === currentTileId && candidate.orientation === currentOrientation) {
      continue;
    }
    const blockKeys = [
      `${tileId}_tile_${candidate.tileId}_orientation_${candidate.orientation}`,
      `${tileId.toLowerCase()}_tile_${candidate.tileId}_orientation_${candidate.orientation}`,
      `tile_${candidate.tileId}_orientation_${candidate.orientation}`,
      `${tileId.toLowerCase()}_tile_${candidate.tileId}_${candidate.orientation}`
    ].map((key) => key.toLowerCase());
    if (blockKeys.some((key) => blocked.has(key))) {
      continue;
    }
    candidates.push({
      tileId: candidate.tileId,
      orientation: candidate.orientation,
      sourceResref: source.resref ?? source.parentResref ?? null,
      sourceCategory: source.category ?? source.parentCategory ?? null,
      sourceScore: source.score ?? source.relevanceScore ?? null,
      sourceSize: source.size ?? source.parentSize ?? null,
      currentTemplateMatch: Boolean(source.currentTemplateMatch),
      modelResRef: candidate.modelResRef ?? null,
      models: candidate.modelResRef ? [candidate.modelResRef] : (source.models ?? []).slice(0, 4),
      reason: buildTileCandidateReason({ source, candidate, currentTileId, currentOrientation })
    });
  }
  return dedupeTileCandidates(candidates)
    .sort((left, right) => scoreTileCandidate(right) - scoreTileCandidate(left))
    .slice(0, 8);
}

function* iterateTileRankSources(rankReport) {
  for (const source of rankReport.layouts ?? []) {
    yield source;
  }
  for (const source of rankReport.subLayouts3x2 ?? []) {
    yield source;
  }
}

function tileCandidateFromRankSource(source, x, y) {
  const tile = (source.tiles ?? []).find((candidate) => Number(candidate.x) === x && Number(candidate.y) === y);
  if (tile) {
    return {
      tileId: Number(tile.tileId),
      orientation: Number(tile.orientation),
      modelResRef: tile.modelResRef ?? null
    };
  }
  const width = Number(source.width ?? 3);
  const height = Number(source.height ?? 2);
  if (width !== 3 || height !== 2) {
    return null;
  }
  const index = y * 3 + x;
  const tileId = Number(source.tileIds?.[index]);
  const orientation = Number(source.tileOrientations?.[index]);
  if (!Number.isFinite(tileId) || !Number.isFinite(orientation)) {
    return null;
  }
  return {
    tileId,
    orientation,
    modelResRef: null
  };
}

function dedupeTileCandidates(candidates) {
  const byKey = new Map();
  for (const candidate of candidates) {
    const key = `${candidate.tileId}/${candidate.orientation}`;
    const existing = byKey.get(key);
    if (!existing || scoreTileCandidate(candidate) > scoreTileCandidate(existing)) {
      byKey.set(key, candidate);
    }
  }
  return [...byKey.values()];
}

function scoreTileCandidate(candidate) {
  const category = String(candidate.sourceCategory ?? "");
  const score = Number(candidate.sourceScore ?? 0);
  const residentialBonus = category.startsWith("apartment") ? 12 : 0;
  const richBonus = category === "apartment_rich" ? 4 : 0;
  const templatePenalty = candidate.currentTemplateMatch ? -10 : 0;
  return score + residentialBonus + richBonus + templatePenalty;
}

function buildTileCandidateReason({ source, candidate, currentTileId, currentOrientation }) {
  const sourceName = source.resref ?? source.parentResref ?? "unknown";
  const category = source.category ?? source.parentCategory ?? "unknown";
  const change = `${currentTileId}/${currentOrientation} -> ${candidate.tileId}/${candidate.orientation}`;
  return `${change} from ${sourceName} (${category}); score=${format(source.score ?? source.relevanceScore)}`;
}

function isJTileCandidate(candidate, source) {
  const modelRefs = [
    candidate.modelResRef,
    ...(candidate.models ?? []),
    ...(source.models ?? [])
  ]
    .filter(Boolean)
    .map((model) => String(model).toLowerCase());
  return modelRefs.some((model) => /(?:^|_)j\d/iu.test(model) || /_j\d/iu.test(model));
}

function readPlaceableInstanceCsv(path) {
  if (!path || !existsSync(path)) {
    return [];
  }
  const rows = parseCsv(readFileSync(path, "utf8"));
  if (rows.length < 2) {
    return [];
  }
  const header = rows[0];
  return rows.slice(1).map((row) => {
    const record = {};
    for (let index = 0; index < header.length; index += 1) {
      record[header[index]] = row[index] ?? "";
    }
    return {
      areaResref: record.areaResref,
      areaName: record.areaName,
      areaCategory: record.areaCategory,
      tileSet: record.tileSet,
      templateResRef: record.templateResRef,
      role: record.role,
      tag: record.tag,
      localizedName: record.localizedName,
      x: Number(record.x),
      y: Number(record.y),
      z: Number(record.z),
      bearing: Number(record.bearing),
      instanceIndex: Number(record.instanceIndex)
    };
  });
}

function parseCsv(text) {
  return String(text ?? "")
    .split(/\r?\n/u)
    .filter((line) => line.length > 0)
    .map(parseCsvLine);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
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

function buildComparisonBrief({
  label,
  status,
  score,
  baselineIdentity,
  reports,
  tileAssessments,
  fastIterationPlan,
  layerBlameMap,
  priorityQueue,
  outputs
}) {
  const matrix = fastIterationPlan?.decisionMatrix ?? {};
  const verdict = matrix.candidateVerdict ?? {};
  const scoreDelta = Number.isFinite(Number(verdict.scoreDelta))
    ? Number(verdict.scoreDelta)
    : hasFiniteNumericValue(score) && hasFiniteNumericValue(baselineIdentity?.score)
      ? Number((Number(score) - Number(baselineIdentity.score)).toFixed(3))
      : null;
  const first = layerBlameMap?.tiles?.[0] ?? null;
  const action = chooseComparisonBriefAction({
    status,
    reports,
    verdict,
    first,
    safetyStatus: fastIterationPlan?.summary?.safetyStatus
  });
  const worklist = buildComparisonBriefWorklist({ layerBlameMap, tileAssessments });
  const blockedMoves = [
    ...new Set((matrix.experimentMemory?.allRelevant ?? LAST_CITY_CONCEPT_EXPERIMENT_MEMORY).flatMap((entry) => entry.blocks ?? []))
  ].sort();
  return {
    version: "last-city-comparison-brief/v1",
    generatedAt: new Date().toISOString(),
    label,
    summary: {
      status,
      action: action.action,
      reason: action.reason,
      score,
      baselineId: baselineIdentity?.id ?? null,
      baselineScore: baselineIdentity?.score ?? null,
      scoreDelta,
      candidateVerdict: verdict.status ?? null,
      promotion: verdict.promotion ?? null,
      safetyStatus: fastIterationPlan?.summary?.safetyStatus ?? "unknown",
      firstTile: first?.tile ?? null,
      firstLayer: first?.primaryLayer ?? null,
      firstAllowedChange: action.allowedChange ?? first?.safeNext?.allowedChange ?? null,
      toolsetScreenshotCompared: Boolean(reports.comparison),
      nextLoop: fastIterationPlan?.summary?.nextLoop ?? null
    },
    compareAxes: buildComparisonAxes({ reports, layerBlameMap, fastIterationPlan }),
    guardrails: [
      "Read this brief first, then only drill into layer-blame-map or contact sheet for evidence.",
      "Do not open Toolset when safetyStatus is not passed.",
      "Do not mix tile/material changes with placeable position/Bearing, VisualTransform, or area lighting.",
      "Use Aurora Adjust Location only when the first layer is placeable_anchor_or_budget or placeable_palette_material.",
      "If a Toolset access violation appears, close Toolset, quarantine the candidate, and do not retry that module."
    ],
    blockedMoves,
    worklist,
    topPriorities: priorityQueue.slice(0, 6).map((item) => ({
      severity: item.severity,
      area: item.area,
      issue: item.issue,
      nextAction: item.nextAction
    })),
    files: {
      operatorScorecard: outputs.operatorScorecardMarkdownPath,
      dashboard: outputs.markdownPath,
      layerBlameMap: outputs.layerBlameMapMarkdownPath,
      fastPlan: outputs.fastPlanMarkdownPath,
      decisionMatrix: outputs.iterationDecisionMatrixMarkdownPath,
      visualComparison: outputs.comparisonOut ?? null,
      imageDelta: outputs.imageDeltaOut ?? null,
      tileRank: outputs.tileRankPath ?? null
    }
  };
}

function chooseComparisonBriefAction({ status, reports, verdict, first, safetyStatus }) {
  if (safetyStatus === "blocked") {
    return {
      action: "stop_safety_first",
      reason: `Safety is ${safetyStatus}; fix crash-risk/preflight before any Toolset proof.`
    };
  }
  if (safetyStatus === "requires_explicit_override") {
    return {
      action: "await_supervised_toolset_override",
      reason:
        "Offline gates are clean, but Toolset proof needs an explicit supervised single-open override."
    };
  }
  if (verdict?.status === "candidate_regressed") {
    return {
      action: "reject_current_candidate",
      reason: verdict.reason ?? "Candidate regressed against the baseline."
    };
  }
  if (verdict?.status === "split_required") {
    return {
      action: "split_candidate_layers",
      reason: verdict.reason ?? "Candidate mixes layers, so the visual result cannot identify one cause."
    };
  }
  if (!reports.comparison) {
    return {
      action: "capture_toolset_after_offline_pass",
      reason: "Offline gates passed, but no Toolset screenshot was compared yet."
    };
  }
  if (verdict?.status === "candidate_improved") {
    return {
      action: "human_visual_review_before_promotion",
      reason: verdict.reason ?? "Automated score improved; still needs concept visual review before promotion."
    };
  }
  if (
    first?.primaryLayer === "tile_material_or_large_silhouette" &&
    rejectedExperimentCountForTile(first.tile, "tile_layout") >= 6
  ) {
    return {
      action: "pivot_from_tile_id_swaps",
      allowedChange: "nw_material_silhouette_or_existing_vt_only",
      reason: `${first.tile} still owns the visual mismatch, but repeated isolated tile-id swaps regressed; create one isolated NW material/silhouette or existing-VT pass without changing tile ids.`
    };
  }
  if (first?.primaryLayer === "tile_material_or_large_silhouette") {
    return {
      action: "create_one_tile_material_candidate",
      reason: `${first.tile} is first and anchors are clean; compare tile/material or large-silhouette only.`
    };
  }
  if (first?.primaryLayer === "placeable_anchor_or_budget") {
    return {
      action: "adjust_named_placeables_only",
      reason: `${first.tile} has an anchor/budget gap; use Adjust Location/generator positions only for named objects.`
    };
  }
  if (first?.primaryLayer === "placeable_palette_material") {
    return {
      action: "local_placeable_material_pass",
      reason: `${first.tile} has a palette/material read gap; keep anchors and tiles stable.`
    };
  }
  if (status === "needs_visual_tile_or_composition_iteration") {
    return {
      action: "human_visual_review_then_one_layer_candidate",
      reason: "Automated status still needs visual iteration, but no stronger layer action was selected."
    };
  }
  return {
    action: "hold_or_review",
    reason: "No low-risk automated edit selected."
  };
}

function buildComparisonAxes({ reports, layerBlameMap, fastIterationPlan }) {
  const tiles = layerBlameMap?.tiles ?? [];
  const layerCounts = countBy(tiles, "primaryLayer");
  return {
    tile: {
      firstCount: Number(fastIterationPlan?.summary?.tileFirstCount ?? 0),
      changedCells: layerBlameMap?.candidateLayerChanges?.tileChangedCells ?? [],
      primaryBlameCount: layerCounts.tile_material_or_large_silhouette ?? 0
    },
    placeable: {
      firstCount: Number(fastIterationPlan?.summary?.placeableFirstCount ?? 0),
      addedCount: Number(layerBlameMap?.candidateLayerChanges?.placeableAddedCount ?? reports.candidateDiff?.delta?.addedCount ?? 0),
      removedCount: Number(layerBlameMap?.candidateLayerChanges?.placeableRemovedCount ?? reports.candidateDiff?.delta?.removedCount ?? 0),
      primaryBlameCount:
        Number(layerCounts.placeable_anchor_or_budget ?? 0) + Number(layerCounts.placeable_palette_material ?? 0)
    },
    visualTransform: {
      changedCount: getVisualTransformChangedCount(reports.candidateDiff),
      tilesWithChangedVisualTransform: Object.keys(reports.candidateDiff?.delta?.visualTransformChangedByTile ?? {})
    },
    lighting: {
      changed: Boolean(layerBlameMap?.candidateLayerChanges?.areaLightingChanged),
      fields: layerBlameMap?.candidateLayerChanges?.areaLightingFields ?? []
    },
    visual: {
      toolsetScreenshotCompared: Boolean(reports.comparison),
      visualScore: reports.comparison?.visualScore ?? null,
      worstImagePriority: reports.imageDelta
        ? Math.max(0, ...(reports.imageDelta.summary?.worstCells ?? []).map((cell) => Number(cell.priority ?? 0)))
        : null
    }
  };
}

function rejectedExperimentCountForTile(tileId, className) {
  return LAST_CITY_CONCEPT_EXPERIMENT_MEMORY.filter(
    (entry) =>
      entry.class === className &&
      entry.status === "rejected_visual_regression" &&
      ((entry.tiles ?? []).includes(tileId) || (entry.tiles ?? []).includes("global"))
  ).length;
}

function buildComparisonBriefWorklist({ layerBlameMap, tileAssessments }) {
  const assessmentsById = new Map((tileAssessments ?? []).map((tile) => [tile.id, tile]));
  return (layerBlameMap?.tiles ?? []).slice(0, 8).map((tile) => {
    const assessment = assessmentsById.get(tile.tile) ?? {};
    return {
      rank: tile.safeNext?.rank ?? null,
      tile: tile.tile,
      role: tile.role,
      primaryLayer: tile.primaryLayer,
      confidence: tile.confidence,
      metrics: {
        priority: tile.imageDelta?.priority ?? null,
        brightExcess: tile.imageDelta?.brightExcess ?? null,
        darkDeficit: tile.imageDelta?.darkDeficit ?? null,
        saturationDeficit: tile.imageDelta?.saturationDeficit ?? null
      },
      currentTile: assessment.layout
        ? {
            tileId: assessment.layout.tileId,
            orientation: assessment.layout.orientation,
            x: assessment.layout.x,
            y: assessment.layout.y
          }
        : null,
      allowedChange: tile.safeNext?.allowedChange ?? null,
      nextAction: tile.safeNext?.action ?? null,
      rejectIfMixedWith: buildOperatorRejectMix(tile),
      placeableContext: (tile.placeableLayer?.nearestMeasuredTargets ?? []).slice(0, 5).map((item) => ({
        templateResRef: item.templateResRef,
        tag: item.tag,
        role: item.role,
        x: item.x,
        y: item.y,
        nearestTargetZone: item.nearestTargetZone ?? null,
        distanceToTarget: item.distanceToTarget ?? null
      })),
      placeableCandidates: (tile.placeableLayer?.adjustmentCandidates ?? []).slice(0, 4).map((candidate) => ({
        templateResRef: candidate.templateResRef,
        tag: candidate.tag,
        role: candidate.role,
        safeUse: candidate.safeUse,
        nearestTargetZone: candidate.nearestTargetZone,
        distanceToTarget: candidate.distanceToTarget,
        visualTransform: Boolean(candidate.visualTransform),
        moveHint: candidate.moveHint ?? null
      })),
      tileCandidates: String(tile.safeNext?.allowedChange ?? "").includes("material_silhouette_or_existing_vt")
        ? []
        : (tile.tileLayer?.tileCandidateShortlist ?? []).slice(0, 6).map((candidate) => ({
            tileId: candidate.tileId,
            orientation: candidate.orientation,
            sourceResref: candidate.sourceResref,
            sourceCategory: candidate.sourceCategory,
            sourceScore: candidate.sourceScore,
            modelResRef: candidate.modelResRef,
            reason: candidate.reason
          })),
      tileCandidateNote: String(tile.safeNext?.allowedChange ?? "").includes("material_silhouette_or_existing_vt")
        ? "blocked_for_current_pass: simple tile-id/orientation swaps already regressed"
        : null,
      visualTransform: {
        verdict: tile.visualTransformLayer?.verdict ?? null,
        count: tile.visualTransformLayer?.count ?? null,
        changedInCandidate: tile.visualTransformLayer?.changedInCandidate ?? null
      }
    };
  });
}

function buildOperatorScorecard({
  label,
  status,
  score,
  baselineIdentity,
  reports,
  fastIterationPlan,
  layerBlameMap,
  comparisonBrief,
  priorityQueue,
  outputs
}) {
  const firstTile = layerBlameMap?.tiles?.[0] ?? null;
  const summary = comparisonBrief?.summary ?? {};
  const safety = fastIterationPlan?.safety ?? {};
  const changeSummary = fastIterationPlan?.changeSummary ?? {};
  const nextCandidateContract = buildOperatorNextCandidateContract({
    summary,
    firstTile,
    safety,
    changeSummary
  });
  return {
    version: "last-city-placeable-tile-operator-scorecard/v1",
    generatedAt: new Date().toISOString(),
    label,
    method:
      "One-stop operator card: joins concept image subcell deltas, ARE tile layout, GIT placeable anchors, VisualTransform evidence, candidate diff, safety gates, and experiment memory. It never launches Toolset.",
    summary: {
      status,
      score,
      baselineId: baselineIdentity?.id ?? null,
      baselineScore: baselineIdentity?.score ?? null,
      scoreDelta: summary.scoreDelta ?? null,
      action: summary.action ?? null,
      reason: summary.reason ?? null,
      safetyStatus: summary.safetyStatus ?? safety.status ?? "unknown",
      firstTile: summary.firstTile ?? firstTile?.tile ?? null,
      firstLayer: summary.firstLayer ?? firstTile?.primaryLayer ?? null,
      allowedChange: summary.firstAllowedChange ?? firstTile?.safeNext?.allowedChange ?? null,
      nextLoop: summary.nextLoop ?? fastIterationPlan?.summary?.nextLoop ?? null,
      toolsetScreenshotCompared: Boolean(reports.comparison)
    },
    gates: {
      candidateDiff: classifyCandidateDiff(reports.candidateDiff),
      crashRisk: reports.crashRisk?.status ?? "missing",
      preflight: reports.preflight?.status ?? "missing",
      conceptMap: reports.conceptMap?.status ?? "missing",
      anchors: reports.anchors?.status ?? "missing",
      visual: reports.comparison?.result ?? (reports.comparison ? "missing" : "not_run"),
      blockers: [
        ...(reports.preflight?.blockers ?? []),
        ...(reports.crashRisk?.errors ?? []).map((error) => error.id ?? error.code ?? "crash_risk_error")
      ]
    },
    candidateLayerDiff: {
      candidateClass: changeSummary.candidateClass ?? layerBlameMap?.candidateLayerChanges?.candidateClass ?? "unknown",
      noMixStatus: changeSummary.noMixStatus ?? "unknown",
      tileChangedCells: layerBlameMap?.candidateLayerChanges?.tileChangedCells ?? [],
      placeableAddedCount: Number(changeSummary.placeables?.addedCount ?? 0),
      placeableRemovedCount: Number(changeSummary.placeables?.removedCount ?? 0),
      visualTransformChangedCount: Number(changeSummary.placeables?.visualTransformChangedCount ?? 0),
      visualTransformChangedByTile: changeSummary.placeables?.visualTransformChangedByTile ?? {},
      areaLightingChanged: Boolean(layerBlameMap?.candidateLayerChanges?.areaLightingChanged),
      areaLightingFields: layerBlameMap?.candidateLayerChanges?.areaLightingFields ?? []
    },
    compareAxes: comparisonBrief?.compareAxes ?? {},
    nextCandidateContract,
    tiles: buildOperatorTileCards({ layerBlameMap, comparisonBrief }).slice(0, 8),
    topPriorities: (priorityQueue ?? []).slice(0, 6).map((item) => ({
      severity: item.severity,
      area: item.area,
      issue: item.issue,
      nextAction: item.nextAction
    })),
    blockedMoves: comparisonBrief?.blockedMoves ?? [],
    guardrails: [
      "Read this card before editing; drill into other reports only for evidence.",
      "One candidate changes exactly one layer: tile/material, placeable position, existing VisualTransform, or lighting.",
      "Do not open Toolset unless safetyStatus is passed and the offline candidate diff is reviewable.",
      "Use Aurora Adjust Location only when this card says placeable_position_only or names concrete placeables.",
      "Access violation is a critical stop: close Toolset, quarantine the candidate, and do not retry that module."
    ],
    files: {
      operatorScorecard: outputs.operatorScorecardMarkdownPath,
      comparisonBrief: outputs.comparisonBriefMarkdownPath,
      layerBlameMap: outputs.layerBlameMapMarkdownPath,
      fastPlan: outputs.fastPlanMarkdownPath,
      decisionMatrix: outputs.iterationDecisionMatrixMarkdownPath,
      visualComparison: outputs.comparisonOut ?? null,
      imageDelta: outputs.imageDeltaOut ?? null,
      contactSheet: outputs.comparisonOut ? resolve(dirname(outputs.comparisonOut), "comparison-contact-sheet.png") : null
    }
  };
}

function buildOperatorNextCandidateContract({ summary, firstTile, safety, changeSummary }) {
  const safetyStatus = summary.safetyStatus ?? safety?.status ?? "unknown";
  const allowedChange = summary.firstAllowedChange ?? firstTile?.safeNext?.allowedChange ?? "none";
  const firstTileId = summary.firstTile ?? firstTile?.tile ?? null;
  const base = {
    action: summary.action ?? "hold_or_review",
    tile: firstTileId,
    allowedChange,
    beforeToolset: [
      "Run compare-last-city-concept-parity.mjs without --toolset against the candidate and baseline.",
      "Open Toolset only when candidateDiff, crashRisk, and preflight are clean."
    ],
    afterToolset: [
      "Run readonly screenshot capture once.",
      "Rerun compare-last-city-concept-parity.mjs with --toolset and fixed crop."
    ],
    accessViolationPolicy: "critical_stop_close_toolset_quarantine_candidate_no_retry"
  };
  if (safetyStatus !== "passed") {
    return {
      ...base,
      allowedChange: "safety_only",
      keepStable: ["all_tiles", "all_placeables", "all_visual_transform", "area_lighting"],
      rejectIfMixedWith: ["toolset_launch", "visual_iteration"],
      command: "Fix safety/preflight/crash-risk before generating or opening another candidate."
    };
  }
  if (allowedChange.includes("material_silhouette_or_existing_vt")) {
    return {
      ...base,
      keepStable: ["Tile_ID", "Tile_Orientation", "anchor_positions", "Bearing", "area_lighting"],
      rejectIfMixedWith: ["tile_id", "tile_orientation", "area_lighting", "new_unrelated_placeables", "new_visual_transform_bundle"],
      command: `Create one isolated ${firstTileId} material/silhouette or existing-VisualTransform pass; do not continue simple tile-id swaps.`
    };
  }
  if (allowedChange === "tile_or_material_only") {
    return {
      ...base,
      keepStable: ["placeable_positions", "Bearing", "VisualTransform", "area_lighting"],
      rejectIfMixedWith: ["placeable_position", "placeable_bearing", "visual_transform", "area_lighting"],
      command: `Create one isolated ${firstTileId} tile/material candidate.`
    };
  }
  if (allowedChange === "placeable_position_only") {
    return {
      ...base,
      keepStable: ["Tile_ID", "Tile_Orientation", "area_lighting", "unrelated_placeables", "unrelated_visual_transform"],
      rejectIfMixedWith: ["tile_id", "tile_orientation", "area_lighting", "unrelated_vt"],
      command: `Move or replace only named ${firstTileId} anchor placeables, then recapture.`
    };
  }
  if (allowedChange === "local_placeable_material_only") {
    return {
      ...base,
      keepStable: ["Tile_ID", "Tile_Orientation", "anchor_positions", "area_lighting"],
      rejectIfMixedWith: ["tile_id", "tile_orientation", "area_lighting", "anchor_shuffle"],
      command: `Use one local ${firstTileId} material/placeable read pass, keeping anchors fixed.`
    };
  }
  if (allowedChange === "area_lighting_only") {
    return {
      ...base,
      keepStable: ["Tile_ID", "Tile_Orientation", "placeables", "VisualTransform"],
      rejectIfMixedWith: ["tile_id", "tile_orientation", "placeable_position", "visual_transform"],
      command: "Review or isolate lighting only; do not combine with objects."
    };
  }
  return {
    ...base,
    keepStable: ["all_unrelated_layers"],
    rejectIfMixedWith: ["unrelated_churn"],
    command: changeSummary?.noMixStatus === "mixed" ? "Split mixed candidate layers." : "Hold and perform human visual review before another candidate."
  };
}

function buildOperatorTileCards({ layerBlameMap, comparisonBrief }) {
  const briefByTile = new Map((comparisonBrief?.worklist ?? []).map((item) => [item.tile, item]));
  return (layerBlameMap?.tiles ?? []).map((tile, index) => {
    const brief = briefByTile.get(tile.tile) ?? {};
    const vtCandidates = (tile.placeableLayer?.adjustmentCandidates ?? [])
      .filter((candidate) => candidate.visualTransform)
      .slice(0, 4)
      .map(compactPlaceableCandidate);
    return {
      rank: index + 1,
      tile: tile.tile,
      role: tile.role,
      primaryLayer: tile.primaryLayer,
      confidence: tile.confidence,
      allowedChange: tile.safeNext?.allowedChange ?? brief.allowedChange ?? null,
      nextAction: tile.safeNext?.action ?? brief.nextAction ?? null,
      rejectIfMixedWith: buildOperatorRejectMix(tile),
      metrics: brief.metrics ?? {
        priority: tile.imageDelta?.priority ?? null,
        brightExcess: tile.imageDelta?.brightExcess ?? null,
        darkDeficit: tile.imageDelta?.darkDeficit ?? null,
        saturationDeficit: tile.imageDelta?.saturationDeficit ?? null
      },
      currentTile: brief.currentTile ?? {
        tileId: tile.layout?.tileId ?? null,
        orientation: tile.layout?.orientation ?? null,
        x: tile.layout?.x ?? null,
        y: tile.layout?.y ?? null
      },
      imageTargets: normalizeTargetZones(tile.imageDelta?.targetSubcells ?? []).slice(0, 4),
      placeableAxis: {
        verdict: tile.placeableLayer?.verdict ?? null,
        anchorScore: tile.placeableLayer?.anchorScore ?? null,
        anchorFailed: tile.placeableLayer?.anchorFailed ?? null,
        anchorPartial: tile.placeableLayer?.anchorPartial ?? null,
        budgetStatus: tile.placeableLayer?.budgetStatus ?? null,
        count: tile.placeableLayer?.count ?? null,
        topTemplates: tile.placeableLayer?.topTemplates ?? [],
        nearestMeasuredTargets: (tile.placeableLayer?.nearestMeasuredTargets ?? []).slice(0, 6).map(compactPlaceableTarget),
        adjustmentCandidates: (tile.placeableLayer?.adjustmentCandidates ?? []).slice(0, 6).map(compactPlaceableCandidate)
      },
      tileAxis: {
        verdict: tile.tileLayer?.verdict ?? null,
        changedInCandidate: Boolean(tile.tileLayer?.changedInCandidate),
        tileCandidateShortlist: (tile.tileLayer?.tileCandidateShortlist ?? []).slice(0, 6).map(compactTileCandidate),
        tileCandidateNote: String(tile.safeNext?.allowedChange ?? "").includes("material_silhouette_or_existing_vt")
          ? "blocked_for_current_pass: keep Tile_ID/orientation stable; use this shortlist only after a later explicit tile pass"
          : null,
        blockedExperiments: tile.tileLayer?.blockedExperiments ?? []
      },
      visualTransformAxis: {
        verdict: tile.visualTransformLayer?.verdict ?? null,
        count: tile.visualTransformLayer?.count ?? null,
        changedInCandidate: tile.visualTransformLayer?.changedInCandidate ?? null,
        existingVtCandidates: vtCandidates,
        blockedExperiments: tile.visualTransformLayer?.blockedExperiments ?? []
      },
      lightingAxis: {
        verdict: tile.lightingLayer?.verdict ?? null,
        areaLightingChanged: Boolean(tile.lightingLayer?.areaLightingChanged),
        changedFields: tile.lightingLayer?.changedFields ?? []
      }
    };
  });
}

function buildOperatorRejectMix(tile) {
  const allowedChange = String(tile.safeNext?.allowedChange ?? "");
  if (allowedChange.includes("material_silhouette_or_existing_vt")) {
    return ["tile_id", "tile_orientation", "area_lighting", "new_visual_transform_bundle", "unrelated_anchor_shuffle"];
  }
  return tile.rejectIfMixedWith ?? [];
}

function compactPlaceableTarget(item) {
  return {
    templateResRef: item.templateResRef,
    tag: item.tag,
    role: item.role,
    x: item.x,
    y: item.y,
    z: item.z,
    bearing: item.bearing,
    nearestTargetZone: item.nearestTargetZone ?? null,
    distanceToTarget: item.distanceToTarget ?? null
  };
}

function compactPlaceableCandidate(candidate) {
  return {
    templateResRef: candidate.templateResRef,
    tag: candidate.tag,
    role: candidate.role,
    safeUse: candidate.safeUse,
    visualTransform: Boolean(candidate.visualTransform),
    nearestTargetZone: candidate.nearestTargetZone ?? null,
    distanceToTarget: candidate.distanceToTarget ?? null,
    moveHint: candidate.moveHint ?? null
  };
}

function compactTileCandidate(candidate) {
  return {
    tileId: candidate.tileId,
    orientation: candidate.orientation,
    sourceResref: candidate.sourceResref,
    sourceCategory: candidate.sourceCategory,
    sourceScore: candidate.sourceScore,
    modelResRef: candidate.modelResRef,
    reason: candidate.reason
  };
}

function renderOperatorScorecardMarkdown(card, report) {
  const lines = [];
  lines.push("# Last City Operator Scorecard");
  lines.push("");
  lines.push(`Generated: ${card.generatedAt}`);
  lines.push(`Module: \`${report.modulePath}\``);
  lines.push(`Status: \`${card.summary.status}\`, score=${format(card.summary.score)}`);
  lines.push("");
  lines.push("## Decision");
  lines.push("");
  lines.push(`- Action: \`${card.summary.action}\``);
  lines.push(`- Reason: ${card.summary.reason ?? "none"}`);
  lines.push(`- Safety: \`${card.summary.safetyStatus}\``);
  lines.push(`- First tile/layer: \`${card.summary.firstTile ?? "none"}\` / \`${card.summary.firstLayer ?? "none"}\``);
  lines.push(`- Allowed change: \`${card.summary.allowedChange ?? "none"}\``);
  lines.push(`- Baseline: \`${card.summary.baselineId ?? "none"}\`, score=${format(card.summary.baselineScore)}, delta=${format(card.summary.scoreDelta)}`);
  lines.push("");
  lines.push("## Next Candidate Contract");
  lines.push("");
  lines.push(`- Command: ${card.nextCandidateContract.command}`);
  lines.push(`- Change only: \`${card.nextCandidateContract.allowedChange}\``);
  lines.push(`- Keep stable: \`${card.nextCandidateContract.keepStable.join(", ") || "none"}\``);
  lines.push(`- Reject if mixed with: \`${card.nextCandidateContract.rejectIfMixedWith.join(", ") || "none"}\``);
  lines.push(`- Access violation: \`${card.nextCandidateContract.accessViolationPolicy}\``);
  lines.push("");
  lines.push("Before Toolset:");
  for (const step of card.nextCandidateContract.beforeToolset) {
    lines.push(`- ${step}`);
  }
  lines.push("");
  lines.push("After Toolset:");
  for (const step of card.nextCandidateContract.afterToolset) {
    lines.push(`- ${step}`);
  }
  lines.push("");
  lines.push("## Gates");
  lines.push("");
  lines.push("| Gate | State |");
  lines.push("| --- | --- |");
  lines.push(`| candidateDiff | ${escapeTable(card.gates.candidateDiff)} |`);
  lines.push(`| crashRisk | ${escapeTable(card.gates.crashRisk)} |`);
  lines.push(`| preflight | ${escapeTable(card.gates.preflight)} |`);
  lines.push(`| conceptMap | ${escapeTable(card.gates.conceptMap)} |`);
  lines.push(`| anchors | ${escapeTable(card.gates.anchors)} |`);
  lines.push(`| visual | ${escapeTable(card.gates.visual)} |`);
  lines.push("");
  lines.push("## Candidate Layer Diff");
  lines.push("");
  lines.push(`- Candidate class: \`${card.candidateLayerDiff.candidateClass}\`, no-mix: \`${card.candidateLayerDiff.noMixStatus}\``);
  lines.push(`- Tile changed cells: \`${card.candidateLayerDiff.tileChangedCells.join(", ") || "none"}\``);
  lines.push(`- Placeables: added=${format(card.candidateLayerDiff.placeableAddedCount)}, removed=${format(card.candidateLayerDiff.placeableRemovedCount)}`);
  lines.push(`- VisualTransform changed=${format(card.candidateLayerDiff.visualTransformChangedCount)}, tiles=\`${Object.keys(card.candidateLayerDiff.visualTransformChangedByTile ?? {}).join(", ") || "none"}\``);
  lines.push(`- Area lighting changed=\`${card.candidateLayerDiff.areaLightingChanged}\`, fields=\`${card.candidateLayerDiff.areaLightingFields.join(", ") || "none"}\``);
  lines.push("");
  lines.push("## Ranked Tile/Placeable Work");
  lines.push("");
  lines.push("| Rank | Tile | Layer | Metrics | Current tile | Placeable gate | VT | Allowed next |");
  lines.push("| ---: | --- | --- | --- | --- | --- | --- | --- |");
  for (const tile of card.tiles) {
    const metrics = [
      `p=${format(tile.metrics.priority)}`,
      `bright=${format(tile.metrics.brightExcess)}`,
      `dark=${format(tile.metrics.darkDeficit)}`,
      `sat=${format(tile.metrics.saturationDeficit)}`
    ].join(", ");
    const currentTile = tile.currentTile?.tileId ? `${tile.currentTile.tileId}/${tile.currentTile.orientation}` : "unknown";
    const placeableGate = [
      tile.placeableAxis.verdict,
      `anchor=${format(tile.placeableAxis.anchorScore)}`,
      `failed=${format(tile.placeableAxis.anchorFailed)}`,
      `partial=${format(tile.placeableAxis.anchorPartial)}`,
      `count=${format(tile.placeableAxis.count)}`
    ].join(", ");
    const vt = [
      tile.visualTransformAxis.verdict,
      `count=${format(tile.visualTransformAxis.count)}`,
      `changed=${format(tile.visualTransformAxis.changedInCandidate)}`
    ].join(", ");
    lines.push(
      `| ${tile.rank} | ${escapeTable(tile.tile)} | ${escapeTable(tile.primaryLayer)} | ${escapeTable(metrics)} | ${escapeTable(currentTile)} | ${escapeTable(placeableGate)} | ${escapeTable(vt)} | ${escapeTable(tile.nextAction ?? "none")} |`
    );
  }
  lines.push("");
  lines.push("## First Tile Evidence");
  lines.push("");
  const first = card.tiles[0];
  if (first) {
    lines.push(`Tile \`${first.tile}\` targets:`);
    for (const target of first.imageTargets.slice(0, 4)) {
      lines.push(`- ${target.zone}: priority=${format(target.priority)}, bright=${format(target.brightExcess)}, dark=${format(target.darkDeficit)}, sat=${format(target.saturationDeficit)}`);
    }
    lines.push("");
    lines.push("Nearest placeables:");
    for (const placeable of first.placeableAxis.nearestMeasuredTargets.slice(0, 6)) {
      lines.push(`- \`${placeable.templateResRef}/${placeable.tag}\` role=${placeable.role}, pos=${format(placeable.x)},${format(placeable.y)}, target=${placeable.nearestTargetZone ?? "none"}, dist=${format(placeable.distanceToTarget)}`);
    }
    lines.push("");
    lines.push("Existing VT candidates:");
    if (first.visualTransformAxis.existingVtCandidates.length) {
      for (const candidate of first.visualTransformAxis.existingVtCandidates) {
        const move = candidate.moveHint ? ` -> ${candidate.moveHint.to.x},${candidate.moveHint.to.y}` : "";
        lines.push(`- \`${candidate.templateResRef}/${candidate.tag}\` safe=${candidate.safeUse}, target=${candidate.nearestTargetZone ?? "none"}, dist=${format(candidate.distanceToTarget)}${move}`);
      }
    } else {
      lines.push("- none");
    }
    lines.push("");
    lines.push("Tile shortlist:");
    if (first.tileAxis.tileCandidateNote) {
      lines.push(`- ${first.tileAxis.tileCandidateNote}`);
    }
    if (first.tileAxis.tileCandidateShortlist.length) {
      for (const candidate of first.tileAxis.tileCandidateShortlist.slice(0, 6)) {
        lines.push(`- \`${candidate.tileId}/${candidate.orientation}\` ${candidate.sourceResref ?? "unknown"} score=${format(candidate.sourceScore)} reason=${candidate.reason ?? "none"}`);
      }
    } else if (!first.tileAxis.tileCandidateNote) {
      lines.push("- none");
    }
  }
  lines.push("");
  lines.push("## Guardrails");
  lines.push("");
  for (const guardrail of card.guardrails) {
    lines.push(`- ${guardrail}`);
  }
  lines.push("");
  lines.push("## Files");
  lines.push("");
  lines.push(`- Comparison brief: \`${card.files.comparisonBrief}\``);
  lines.push(`- Layer blame: \`${card.files.layerBlameMap}\``);
  lines.push(`- Fast plan: \`${card.files.fastPlan}\``);
  if (card.files.visualComparison) {
    lines.push(`- Visual comparison: \`${card.files.visualComparison}\``);
  }
  if (card.files.contactSheet) {
    lines.push(`- Contact sheet: \`${card.files.contactSheet}\``);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderComparisonBriefMarkdown(brief, report) {
  const lines = [];
  lines.push("# Last City Comparison Brief");
  lines.push("");
  lines.push(`Generated: ${brief.generatedAt}`);
  lines.push(`Module: \`${report.modulePath}\``);
  lines.push(`Dashboard: \`${report.outputs.markdownPath}\``);
  lines.push("");
  lines.push("## Decision");
  lines.push("");
  lines.push(`- Action: \`${brief.summary.action}\``);
  lines.push(`- Reason: ${brief.summary.reason}`);
  lines.push(`- Status: \`${brief.summary.status}\``);
  lines.push(`- Score: \`${format(brief.summary.score)}\` vs \`${brief.summary.baselineId}\` \`${format(brief.summary.baselineScore)}\` (delta \`${format(brief.summary.scoreDelta)}\`)`);
  lines.push(`- Candidate verdict: \`${brief.summary.candidateVerdict ?? "none"}\`, promotion: \`${brief.summary.promotion ?? "none"}\``);
  lines.push(`- Safety: \`${brief.summary.safetyStatus}\``);
  lines.push(`- First tile/layer: \`${brief.summary.firstTile ?? "none"}\` / \`${brief.summary.firstLayer ?? "none"}\``);
  lines.push("");
  lines.push("## Compare Axes");
  lines.push("");
  lines.push("| Axis | State |");
  lines.push("| --- | --- |");
  lines.push(
    `| Tile | first=${format(brief.compareAxes.tile.firstCount)}, primaryBlame=${format(brief.compareAxes.tile.primaryBlameCount)}, changed=${escapeTable(brief.compareAxes.tile.changedCells.join(", ") || "none")} |`
  );
  lines.push(
    `| Placeable | first=${format(brief.compareAxes.placeable.firstCount)}, primaryBlame=${format(brief.compareAxes.placeable.primaryBlameCount)}, added=${format(brief.compareAxes.placeable.addedCount)}, removed=${format(brief.compareAxes.placeable.removedCount)} |`
  );
  lines.push(
    `| VisualTransform | changed=${format(brief.compareAxes.visualTransform.changedCount)}, tiles=${escapeTable(brief.compareAxes.visualTransform.tilesWithChangedVisualTransform.join(", ") || "none")} |`
  );
  lines.push(
    `| Lighting | changed=${brief.compareAxes.lighting.changed}, fields=${escapeTable(brief.compareAxes.lighting.fields.join(", ") || "none")} |`
  );
  lines.push(
    `| Visual | compared=${brief.compareAxes.visual.toolsetScreenshotCompared}, visualScore=${format(brief.compareAxes.visual.visualScore)}, worstPriority=${format(brief.compareAxes.visual.worstImagePriority)} |`
  );
  lines.push("");
  lines.push("## Worklist");
  lines.push("");
  lines.push("| Rank | Tile | Layer | Metrics | Allowed next | Tile shortlist | Placeable context | Reject if mixed with |");
  lines.push("| ---: | --- | --- | --- | --- | --- | --- | --- |");
  for (const item of brief.worklist) {
    const metrics = [
      `p=${format(item.metrics.priority)}`,
      `bright=${format(item.metrics.brightExcess)}`,
      `dark=${format(item.metrics.darkDeficit)}`,
      `sat=${format(item.metrics.saturationDeficit)}`
    ].join(", ");
    const tileCandidates = item.tileCandidates
      .slice(0, 4)
      .map((candidate) => `${candidate.tileId}/${candidate.orientation} ${candidate.sourceResref ?? "unknown"}`)
      .join("; ");
    const placeables = item.placeableContext
      .slice(0, 4)
      .map((placeable) => `${placeable.templateResRef}/${placeable.tag}@${placeable.x},${placeable.y}`)
      .join("; ");
    lines.push(
      `| ${format(item.rank)} | ${escapeTable(item.tile)} | ${escapeTable(item.primaryLayer)} | ${escapeTable(metrics)} | ${escapeTable(item.nextAction ?? "none")} | ${escapeTable(tileCandidates || item.tileCandidateNote || "none")} | ${escapeTable(placeables || "none")} | ${escapeTable((item.rejectIfMixedWith ?? []).join(", ") || "none")} |`
    );
  }
  lines.push("");
  lines.push("## Blocked Moves");
  lines.push("");
  lines.push(brief.blockedMoves.length ? brief.blockedMoves.map((move) => `- \`${move}\``).join("\n") : "- none");
  lines.push("");
  lines.push("## Guardrails");
  lines.push("");
  for (const guardrail of brief.guardrails) {
    lines.push(`- ${guardrail}`);
  }
  lines.push("");
  lines.push("## Drilldown Files");
  lines.push("");
  lines.push(`- Operator scorecard: \`${brief.files.operatorScorecard}\``);
  lines.push(`- Layer blame: \`${brief.files.layerBlameMap}\``);
  lines.push(`- Fast plan: \`${brief.files.fastPlan}\``);
  lines.push(`- Decision matrix: \`${brief.files.decisionMatrix}\``);
  if (brief.files.visualComparison) {
    lines.push(`- Visual comparison: \`${brief.files.visualComparison}\``);
  }
  if (brief.files.imageDelta) {
    lines.push(`- Image delta: \`${brief.files.imageDelta}\``);
  }
  if (brief.files.tileRank) {
    lines.push(`- Tile rank source: \`${brief.files.tileRank}\``);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderLayerBlameMapMarkdown(map, report) {
  const lines = [];
  lines.push("# Layer Blame Map");
  lines.push("");
  lines.push(`Generated: ${map.generatedAt}`);
  lines.push(`Module: \`${report.modulePath}\``);
  lines.push(`Dashboard: \`${report.outputs.markdownPath}\``);
  lines.push(`Status: \`${map.status}\`, score=${format(map.score)}`);
  lines.push(`First tile/layer: \`${map.summary.firstTile ?? "none"}\` / \`${map.summary.firstLayer ?? "none"}\``);
  lines.push("");
  lines.push("## Method");
  lines.push("");
  lines.push(map.method);
  lines.push("");
  lines.push("Guardrails:");
  lines.push("");
  for (const guardrail of map.guardrails) {
    lines.push(`- ${guardrail}`);
  }
  lines.push("");
  lines.push("## Layer Decisions");
  lines.push("");
  lines.push("| Rank | Tile | Role | Primary layer | Confidence | Evidence | Safe next | Reject if mixed with |");
  lines.push("| ---: | --- | --- | --- | --- | --- | --- | --- |");
  for (const tile of map.tiles) {
    lines.push(
      `| ${tile.safeNext.rank} | ${escapeTable(tile.tile)} | ${escapeTable(tile.role)} | ${escapeTable(tile.primaryLayer)} | ${escapeTable(tile.confidence)} | ${escapeTable(tile.evidence.join(", "))} | ${escapeTable(tile.safeNext.action)} | ${escapeTable(tile.rejectIfMixedWith.join(", "))} |`
    );
  }
  lines.push("");
  lines.push("## Fast Object Context");
  lines.push("");
  lines.push("| Tile | Placeable verdict | Tile verdict | VT verdict | Lighting verdict | Top nearby placeables | Tile candidates |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const tile of map.tiles.slice(0, 8)) {
    const nearby = tile.placeableLayer.nearestMeasuredTargets
      .slice(0, 4)
      .map((item) => `${item.templateResRef}/${item.tag}@${item.x},${item.y}`)
      .join("; ");
    const tileCandidates = tile.tileLayer.tileCandidateShortlist
      .slice(0, 4)
      .map((item) => `${item.tileId}/${item.orientation} ${item.sourceResref ?? "unknown"}`)
      .join("; ");
    lines.push(
      `| ${escapeTable(tile.tile)} | ${escapeTable(tile.placeableLayer.verdict)} | ${escapeTable(tile.tileLayer.verdict)} | ${escapeTable(tile.visualTransformLayer.verdict)} | ${escapeTable(tile.lightingLayer.verdict)} | ${escapeTable(nearby || "none")} | ${escapeTable(tileCandidates || "none")} |`
    );
  }
  lines.push("");
  lines.push("## Candidate Layer Changes");
  lines.push("");
  lines.push(`- Candidate class: \`${map.candidateLayerChanges.candidateClass}\``);
  lines.push(`- Tile changed cells: \`${map.candidateLayerChanges.tileChangedCells.join(", ") || "none"}\``);
  lines.push(`- Area lighting changed: \`${map.candidateLayerChanges.areaLightingChanged}\` (${map.candidateLayerChanges.areaLightingFields.join(", ") || "none"})`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderMarkdown(report) {
  const lines = [];
  lines.push("# Last City Concept Parity Dashboard");
  lines.push("");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push(`Status: ${report.status}`);
  lines.push(`Score: ${report.score}`);
  lines.push(`Module: \`${report.modulePath}\``);
  lines.push(`Toolset screenshot: ${report.toolsetPath ? `\`${report.toolsetPath}\`` : "`not supplied`"}`);
  lines.push(`Toolset crop override: ${report.toolsetCrop ? `\`${report.toolsetCrop}\`` : "`none`"}`);
  lines.push("");
  lines.push("## What This Checks");
  lines.push("");
  lines.push("- fresh placeable usage map from the candidate module;");
  lines.push("- optional candidate diff against a known baseline module;");
  lines.push("- concept placeable/tile budget and safety rules;");
  lines.push("- concept anchor zones against actual GIT placeable positions;");
  lines.push("- ARE tile layout and tile lights;");
  lines.push("- offline crash-risk and Toolset preflight gates;");
  lines.push("- Toolset screenshot versus concept art image metrics, when a screenshot is supplied.");
  lines.push("");
  lines.push("## Scores");
  lines.push("");
  lines.push(`- Concept map: ${report.scores.conceptMapStatus}, errors=${report.scores.conceptMapErrors}, warnings=${report.scores.conceptMapWarnings}`);
  lines.push(`- Anchors: ${report.scores.anchorStatus}, score=${format(report.scores.anchorScore)}`);
  lines.push(`- Structural score: ${format(report.scores.structuralScore)} (map and anchors only; not visual parity)`);
  lines.push(`- Tile layout diff: ${report.scores.tileLayoutDiffStatus}, changed=${format(report.scores.tileLayoutChangedCount)}`);
  lines.push(`- Candidate diff: ${report.scores.candidateDiffStatus}, placeableDelta=${format(report.scores.candidateDiffPlaceableDelta)}, visualTransformChanges=${format(report.scores.candidateDiffVisualTransformChanges)}`);
  lines.push(`- Crash risk: ${report.scores.crashRiskStatus}, errors=${format(report.scores.crashRiskErrors)}, warnings=${format(report.scores.crashRiskWarnings)}`);
  lines.push(
    `- Toolset preflight: ${report.scores.preflightStatus}, blockers=${escapeInline((report.scores.preflightBlockers ?? []).join(", ") || "none")}, softBlockers=${escapeInline((report.scores.preflightSoftBlockers ?? []).join(", ") || "none")}`
  );
  lines.push(`- AV readiness: ${report.scores.avReadinessStatus}, override=${report.scores.avReadinessRequiresOverride === true}, hardBlockers=${escapeInline((report.scores.avReadinessHardBlockers ?? []).join(", ") || "none")}, postGuardFailures=${format(report.scores.avReadinessPostGuardFailures)}`);
  lines.push(`- Visual: ${report.scores.visualResult}, visualScore=${format(report.scores.visualScore)}, semanticScore=${format(report.scores.semanticScore)}`);
  lines.push("");
  lines.push("## Fast Iteration Plan");
  lines.push("");
  lines.push(`Next loop: \`${report.fastIterationPlan.summary.nextLoop}\``);
  lines.push(`First tile: \`${report.fastIterationPlan.summary.firstTile ?? "none"}\``);
  lines.push(`Reason: ${report.fastIterationPlan.summary.firstReason ?? "none"}`);
  lines.push("");
  lines.push("| Tile | Decision | Priority | Target zones | First candidates |");
  lines.push("| --- | --- | ---: | --- | --- |");
  for (const tile of report.fastIterationPlan.tiles.slice(0, 8)) {
    const zones = tile.targetZones
      .slice(0, 3)
      .map((zone) => `${zone.zone}@${zone.worldTarget?.x},${zone.worldTarget?.y}`)
      .join("; ");
    const candidates = tile.placeableCandidates
      .slice(0, 3)
      .map((candidate) => `${candidate.templateResRef}/${candidate.tag}`)
      .join("; ");
    lines.push(
      `| ${escapeTable(tile.tile)} | ${escapeTable(tile.decision)} | ${format(tile.priority)} | ${escapeTable(zones || "none")} | ${escapeTable(candidates || "none")} |`
    );
  }
  lines.push("");
  lines.push("## Layer Blame Map");
  lines.push("");
  lines.push(`First layer: \`${report.layerBlameMap.summary.firstLayer ?? "none"}\` on tile \`${report.layerBlameMap.summary.firstTile ?? "none"}\``);
  lines.push(`First action: ${report.layerBlameMap.summary.firstAction ?? "none"}`);
  lines.push("");
  lines.push("| Tile | Primary layer | Confidence | Placeables | Tile | VT | Safe next |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- |");
  for (const tile of report.layerBlameMap.tiles.slice(0, 8)) {
    lines.push(
      `| ${escapeTable(tile.tile)} | ${escapeTable(tile.primaryLayer)} | ${escapeTable(tile.confidence)} | ${escapeTable(tile.placeableLayer.verdict)} | ${escapeTable(tile.tileLayer.verdict)} | ${escapeTable(tile.visualTransformLayer.verdict)} | ${escapeTable(tile.safeNext.action)} |`
    );
  }
  lines.push("");
  lines.push("## Priority Queue");
  lines.push("");
  if (report.priorityQueue.length === 0) {
    lines.push("No automated priority items. Human visual review is still required before promotion.");
  } else {
    lines.push("| Severity | Area | Issue | Next action |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of report.priorityQueue.slice(0, 12)) {
      lines.push(
        `| ${escapeTable(item.severity)} | ${escapeTable(item.area)} | ${escapeTable(item.issue)} | ${escapeTable(item.nextAction)} |`
      );
    }
  }
  lines.push("");
  lines.push("## Correction Plan");
  lines.push("");
  lines.push(report.correctionPlan.method);
  lines.push("");
  lines.push("| Tile | Strategy | Target zones | Safest candidates | Action |");
  lines.push("| --- | --- | --- | --- | --- |");
  for (const item of report.correctionPlan.items.slice(0, 10)) {
    const zones = item.targetZones
      .map((zone) => `${zone.zone}@${zone.worldTarget.x},${zone.worldTarget.y}`)
      .join("; ");
    const candidates = item.safestCandidates
      .slice(0, 4)
      .map((candidate) => `${candidate.templateResRef}/${candidate.tag}`)
      .join("; ");
    lines.push(
      `| ${escapeTable(item.tile)} | ${escapeTable(item.strategy)} | ${escapeTable(zones)} | ${escapeTable(candidates || "none")} | ${escapeTable(item.action)} |`
    );
  }
  lines.push("");
  lines.push("Guardrails:");
  lines.push("");
  for (const guardrail of report.correctionPlan.guardrails) {
    lines.push(`- ${guardrail}`);
  }
  lines.push("");
  lines.push("## Tile Assessments");
  lines.push("");
  lines.push("| Tile | Role | Tile_ID/orient | Placeables | Anchor | Image | Likely cause | Next action |");
  lines.push("| --- | --- | --- | ---: | --- | --- | --- | --- |");
  for (const tile of report.tileAssessments) {
    const layout = tile.layout ? `${tile.layout.tileId}/${tile.layout.orientation}` : "unknown";
    const anchor = `score=${format(tile.anchors.score)}, failed=${tile.anchors.failed}, partial=${tile.anchors.partial}`;
    const image = tile.image
      ? `priority=${format(tile.image.priority)}, bright=${format(tile.image.brightExcess)}, darkDef=${format(tile.image.darkDeficit)}, zones=${tile.image.targetSubcells.map((subcell) => subcell.zone).join("/")}`
      : "not measured";
    lines.push(
      `| ${escapeTable(tile.id)} | ${escapeTable(tile.conceptRole)} | ${escapeTable(layout)} | ${tile.placeables.count ?? "?"} | ${escapeTable(anchor)} | ${escapeTable(image)} | ${escapeTable(tile.likelyCause)} | ${escapeTable(tile.nextAction)} |`
    );
  }
  lines.push("");
  lines.push("## Outputs");
  lines.push("");
  lines.push(`- JSON: \`${report.outputs.jsonPath}\``);
  lines.push(`- Fresh placeable map: \`${report.outputs.placeableMapPath}\``);
  if (report.outputs.candidateDiffOut) {
    lines.push(`- Candidate diff: \`${report.outputs.candidateDiffOut}\``);
  }
  lines.push(`- Crash risk: \`${report.outputs.crashRiskOut}\``);
  lines.push(`- Toolset preflight: \`${report.outputs.preflightOut}\``);
  lines.push(`- Anchor report: \`${report.outputs.anchorOut}\``);
  lines.push(`- Concept map report: \`${report.outputs.conceptMapOut}\``);
  lines.push(`- Tile layout: \`${report.outputs.tileLayoutOut}\``);
  if (report.outputs.comparisonOut) {
    lines.push(`- Visual comparison: \`${report.outputs.comparisonOut}\``);
  }
  if (report.outputs.edgeArtifactOut) {
    lines.push(`- Edge artifacts: \`${report.outputs.edgeArtifactOut}\``);
  }
  if (report.outputs.imageDeltaOut) {
    lines.push(`- Image delta: \`${report.outputs.imageDeltaOut}\``);
  }
  lines.push(`- Fast iteration plan: \`${report.outputs.fastPlanJsonPath}\``);
  lines.push(`- Fast iteration plan markdown: \`${report.outputs.fastPlanMarkdownPath}\``);
  lines.push(`- Layer blame map: \`${report.outputs.layerBlameMapJsonPath}\``);
  lines.push(`- Layer blame map markdown: \`${report.outputs.layerBlameMapMarkdownPath}\``);
  lines.push(`- Comparison brief: \`${report.outputs.comparisonBriefJsonPath}\``);
  lines.push(`- Comparison brief markdown: \`${report.outputs.comparisonBriefMarkdownPath}\``);
  lines.push(`- Operator scorecard: \`${report.outputs.operatorScorecardJsonPath}\``);
  lines.push(`- Operator scorecard markdown: \`${report.outputs.operatorScorecardMarkdownPath}\``);
  lines.push(`- Iteration decision matrix: \`${report.outputs.iterationDecisionMatrixJsonPath}\``);
  lines.push(`- Iteration decision matrix markdown: \`${report.outputs.iterationDecisionMatrixMarkdownPath}\``);
  lines.push("");
  lines.push("## Safety");
  lines.push("");
  lines.push(`Launches Toolset: \`${report.safety.launchesToolset}\``);
  lines.push(`Uses global cursor/keyboard: \`${report.safety.usesGlobalCursor || report.safety.usesGlobalKeyboard}\``);
  lines.push(report.safety.method);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderFastIterationPlanMarkdown(plan, report) {
  const lines = [];
  lines.push("# Fast Placeable/Tile Iteration Plan");
  lines.push("");
  lines.push(`Generated: ${plan.generatedAt}`);
  lines.push(`Module: \`${report.modulePath}\``);
  lines.push(`Dashboard: \`${report.outputs.markdownPath}\``);
  lines.push(`Status: \`${plan.summary.status}\`, score=${format(plan.summary.score)}`);
  lines.push(`Safety: \`${plan.summary.safetyStatus}\``);
  lines.push(`Next loop: \`${plan.summary.nextLoop}\``);
  lines.push(`First tile: \`${plan.summary.firstTile ?? "none"}\``);
  lines.push("");
  lines.push("## Why");
  lines.push("");
  lines.push(plan.summary.firstReason ?? "No first action selected.");
  lines.push("");
  lines.push("## Policy");
  lines.push("");
  lines.push(`- ${plan.policy.maxOneVariablePerCandidate}`);
  lines.push(`- ${plan.policy.visualTransform}`);
  lines.push(`- ${plan.policy.auroraAdjustLocation}`);
  lines.push(`- ${plan.policy.accessViolation}`);
  lines.push("");
  lines.push("## Tile Decisions");
  lines.push("");
  lines.push("| Rank | Tile | Role | Decision | Priority | Signals | Targets | Candidates / move hints |");
  lines.push("| ---: | --- | --- | --- | ---: | --- | --- | --- |");
  for (const [index, tile] of plan.tiles.entries()) {
    const signals = [
      `anchor=${format(tile.signals.anchorScore)}`,
      `bright=${format(tile.signals.brightExcess)}`,
      `darkDef=${format(tile.signals.darkDeficit)}`,
      `satDef=${format(tile.signals.saturationDeficit)}`,
      `vt=${format(tile.signals.visualTransformCount)}`
    ].join(", ");
    const targets = tile.targetZones
      .slice(0, 3)
      .map((target) => `${target.zone}@${target.worldTarget?.x},${target.worldTarget?.y}`)
      .join("; ");
    const candidates = tile.placeableCandidates
      .slice(0, 4)
      .map((candidate) => {
        const move = candidate.moveHint
          ? ` -> ${candidate.moveHint.to.x},${candidate.moveHint.to.y} (dx=${candidate.moveHint.dx},dy=${candidate.moveHint.dy})`
          : "";
        const vt = candidate.visualTransform ? ",VT" : "";
        return `${candidate.templateResRef}/${candidate.tag}${move} [${candidate.safeUse}${vt}]`;
      })
      .join("; ");
    lines.push(
      `| ${index + 1} | ${escapeTable(tile.tile)} | ${escapeTable(tile.role)} | ${escapeTable(tile.decision)} | ${format(tile.priority)} | ${escapeTable(signals)} | ${escapeTable(targets || "none")} | ${escapeTable(candidates || "none")} |`
    );
  }
  lines.push("");
  lines.push("## Do Not Mix");
  lines.push("");
  for (const tile of plan.tiles.slice(0, 6)) {
    lines.push(`- ${tile.tile}: ${tile.doNotTouch.join(" ")}`);
  }
  lines.push("");
  lines.push("## Next Commands");
  lines.push("");
  for (const command of plan.nextCommands) {
    lines.push(`- \`${command}\``);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderIterationDecisionMatrixMarkdown(matrix, report) {
  const lines = [];
  lines.push("# Iteration Decision Matrix");
  lines.push("");
  lines.push(`Generated: ${matrix.generatedAt}`);
  lines.push(`Module: \`${report.modulePath}\``);
  lines.push(`Dashboard: \`${report.outputs.markdownPath}\``);
  lines.push(`Baseline: \`${matrix.baseline.id}\`, score=${format(matrix.baseline.score)}`);
  lines.push("");
  lines.push("## Candidate Verdict");
  lines.push("");
  lines.push(`- Status: \`${matrix.candidateVerdict.status}\``);
  lines.push(`- Promotion: \`${matrix.candidateVerdict.promotion}\``);
  lines.push(`- Reason: ${matrix.candidateVerdict.reason}`);
  lines.push(`- Candidate class: \`${matrix.changeSummary.candidateClass}\``);
  lines.push(`- No-mix status: \`${matrix.changeSummary.noMixStatus}\``);
  lines.push(
    `- Tile diff: changed=${format(matrix.changeSummary.tileLayout.changedCount)}, tileId=${format(matrix.changeSummary.tileLayout.tileIdChangedCount)}, orientation=${format(matrix.changeSummary.tileLayout.orientationChangedCount)}, lights=${format(matrix.changeSummary.tileLayout.lightChangedCount)}`
  );
  lines.push(
    `- Area lighting diff: changed=${format(matrix.changeSummary.tileLayout.areaLightingDiff?.changedCount)}, status=${matrix.changeSummary.tileLayout.areaLightingDiff?.status ?? "missing"}`
  );
  lines.push(
    `- Placeable/VT diff: added=${format(matrix.changeSummary.placeables.addedCount)}, removed=${format(matrix.changeSummary.placeables.removedCount)}, vt=${format(matrix.changeSummary.placeables.visualTransformChangedCount)}`
  );
  lines.push("");
  lines.push("## Known Experiment Memory");
  lines.push("");
  const memoryRows = [
    ...matrix.experimentMemory.doNotRepeat,
    ...matrix.experimentMemory.blockedBeforeToolset,
    ...matrix.experimentMemory.neutralNotPromoted
  ];
  if (!memoryRows.length) {
    lines.push("No relevant experiment memory for the current first tile.");
  } else {
    lines.push("| Id | Status | Decision | Lesson | Blocks |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const entry of memoryRows) {
      lines.push(
        `| ${escapeTable(entry.id)} | ${escapeTable(entry.status)} | ${escapeTable(entry.decision)} | ${escapeTable(entry.lesson)} | ${escapeTable((entry.blocks ?? []).join(", "))} |`
      );
    }
  }
  lines.push("");
  lines.push("## Tile / Placeable / VT Matrix");
  lines.push("");
  lines.push("| Tile | Decision | Placeable layer | Tile layer | VisualTransform layer | Allowed next |");
  lines.push("| --- | --- | --- | --- | --- | --- |");
  for (const tile of matrix.tiles) {
    lines.push(
      `| ${escapeTable(tile.tile)} | ${escapeTable(tile.decision)} | ${escapeTable(`${tile.placeableLayer.state}: ${tile.placeableLayer.action}`)} | ${escapeTable(`${tile.tileLayer.state}: ${tile.tileLayer.action}`)} | ${escapeTable(`${tile.visualTransformLayer.state}: ${tile.visualTransformLayer.action}`)} | ${escapeTable(tile.allowedNext)} |`
    );
  }
  lines.push("");
  lines.push("## Next Single Experiment");
  lines.push("");
  lines.push(`- Type: \`${matrix.nextSingleExperiment.type}\``);
  if (matrix.nextSingleExperiment.tile) {
    lines.push(`- Tile: \`${matrix.nextSingleExperiment.tile}\``);
  }
  lines.push(`- Command: ${matrix.nextSingleExperiment.command}`);
  lines.push(`- Guardrail: ${matrix.nextSingleExperiment.guardrail}`);
  lines.push("");
  return `${lines.join("\n")}\n`;
}

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
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function booleanOption(value, defaultValue = false) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  const text = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(text)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(text)) {
    return false;
  }
  return defaultValue;
}

function numberOption(value, defaultValue = null) {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Expected numeric option, got ${JSON.stringify(value)}.`);
  }
  return number;
}

function parseDelimitedList(value) {
  return String(value ?? "")
    .split(/[|,;]/u)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

function resolveMaybe(value) {
  return value ? resolve(repoRoot, value) : value;
}

function assertReadableFile(path, label) {
  if (!path || !existsSync(path)) {
    throw new Error(`Missing ${label}: ${path}`);
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readOptionalJson(path) {
  return path && existsSync(path) ? readJson(path) : null;
}

function parseJsonOutput(output) {
  const text = String(output ?? "").trim();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    const start = text.lastIndexOf("\n{");
    if (start >= 0) {
      return JSON.parse(text.slice(start + 1));
    }
    const objectStart = text.indexOf("{");
    const objectEnd = text.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      return JSON.parse(text.slice(objectStart, objectEnd + 1));
    }
    return { rawOutput: text.slice(-4000) };
  }
}

function summarizeStepOutput(output) {
  if (!output || typeof output !== "object") {
    return output;
  }
  return {
    status: output.status ?? output.result ?? (output.ok === true ? "ok" : undefined),
    score: output.score,
    outPath: output.outPath,
    markdownPath: output.markdownPath,
    outputs: output.outputs,
    worstCells: output.worstCells,
    topPriorities: output.topPriorities
  };
}

function findById(items, id) {
  return (items ?? []).find((item) => item.id === id) ?? null;
}

function severityRank(severity) {
  return { low: 1, medium: 2, high: 3, critical: 4 }[severity] ?? 0;
}

function sanitizeSegment(value) {
  return String(value ?? "artifact")
    .trim()
    .replace(/[^a-z0-9_-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 120);
}

function timestampSegment() {
  return new Date().toISOString().replace(/[-:]/gu, "").replace(/\.\d{3}Z$/u, "Z");
}

function format(value) {
  if (!hasFiniteNumericValue(value)) {
    return "unknown";
  }
  const number = Number(value);
  return String(Number(number.toFixed(4)));
}

function hasFiniteNumericValue(value) {
  if (value === null || value === undefined || value === "") {
    return false;
  }
  return Number.isFinite(Number(value));
}

function round2(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : value;
}

function escapeTable(value) {
  return String(value ?? "")
    .replace(/\|/gu, "\\|")
    .replace(/\r?\n/gu, " ");
}

function escapeInline(value) {
  return String(value ?? "").replace(/`/gu, "'");
}
