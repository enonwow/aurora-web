import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const sequencePath = join(
  repoRoot,
  "backend",
  "docs",
  "aurora-reverse",
  "artifacts",
  "vfx-catalog-lab-map",
  "vfx-capture-sequences.json"
);
const allV2Dir = join(repoRoot, ".codex-tmp", "aurora-live-evidence", "vfx-capture-clips", "all-v2");
const probeRoot = join(
  repoRoot,
  ".codex-tmp",
  "aurora-live-evidence",
  "vfx-context-probe",
  "apply-target-vs-location"
);
const missingAuditDir = join(repoRoot, ".codex-tmp", "aurora-live-evidence", "vfx-missing-resource-audit");
const outputDir = join(repoRoot, ".codex-tmp", "aurora-live-evidence", "vfx-iteration1");
const runtimeRerunDir = join(outputDir, "runtime-reruns");
const iterationProbeRoots = [
  probeRoot,
  join(outputDir, "runtime-probe-missing-fallbacks"),
  runtimeRerunDir
];

const OVERLAP_SCORE_THRESHOLD = 10;
const TAIL_RISK_THRESHOLD = 10;
const AUTO_RERUN_MIN_BEST_MEAN_DELTA = 1.0;
const AUTO_RERUN_IMPACT_ROI_CHANGED_RATIO = 0.008;
const AUTO_RERUN_IMPACT_ROI_COLOR_CHANGED_RATIO = 0.004;
const AUTO_RERUN_GENERAL_ROI_CHANGED_RATIO = 0.02;
const AUTO_RERUN_GENERAL_ROI_COLOR_CHANGED_RATIO = 0.02;
const MIN_ARTIFACT_BYTES = {
  mp4: 8192,
  json: 128,
  bestPng: 1024,
  midPng: 1024
};
const APPROVED_REPLACEMENT_ROWS = new Set([757, 857, 934, 1807, 1980, 1992, 4219, 10212, 10218, 10813]);
const PREFERRED_REPLACEMENT_VARIANTS = new Map([
  [1807, "location"],
  [10212, "location"]
]);

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows, columns) {
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/u, ""));
    rows.push(row);
  }
  if (rows.length === 0) {
    return [];
  }
  const headers = rows[0];
  return rows.slice(1).filter((fields) => fields.some((field) => field !== "")).map((fields) =>
    Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ""]))
  );
}

async function readCsvIfExists(path) {
  if (!existsSync(path)) {
    return [];
  }
  return parseCsv(await readFile(path, "utf-8"));
}

function addReason(map, rowId, reason) {
  if (!Number.isFinite(rowId)) {
    return;
  }
  if (!map.has(rowId)) {
    map.set(rowId, new Set());
  }
  map.get(rowId).add(reason);
}

function siblingArtifacts(mp4Path) {
  const stem = mp4Path.replace(/\.mp4$/iu, "");
  return {
    mp4: mp4Path,
    json: `${stem}.json`,
    bestPng: `${stem}_best.png`,
    midPng: `${stem}_mid.png`
  };
}

async function artifactReady(path, minBytes) {
  if (!path || !existsSync(path)) {
    return false;
  }
  return (await stat(path)).size >= minBytes;
}

async function artifactsReady(artifacts) {
  return (
    (await artifactReady(artifacts.mp4, MIN_ARTIFACT_BYTES.mp4)) &&
    (await artifactReady(artifacts.json, MIN_ARTIFACT_BYTES.json)) &&
    (await artifactReady(artifacts.bestPng, MIN_ARTIFACT_BYTES.bestPng)) &&
    (await artifactReady(artifacts.midPng, MIN_ARTIFACT_BYTES.midPng))
  );
}

function shouldUseReplacementClip(summaryPath, reasonsByRow, clip) {
  const rowId = Number(clip.rowId);
  if (APPROVED_REPLACEMENT_ROWS.has(rowId)) {
    const preferredVariant = PREFERRED_REPLACEMENT_VARIANTS.get(rowId);
    return !preferredVariant || clip.variant === preferredVariant;
  }

  if (!String(summaryPath).startsWith(runtimeRerunDir)) {
    return false;
  }
  if (!reasonsByRow.has(rowId)) {
    return false;
  }
  const impactRoiVisible =
    clip.captureMode === "object_impact_closeup" &&
    (Number(clip.roiChangedRatio) >= AUTO_RERUN_IMPACT_ROI_CHANGED_RATIO ||
      Number(clip.roiColorChangedRatio) >= AUTO_RERUN_IMPACT_ROI_COLOR_CHANGED_RATIO);
  const generalRoiVisible =
    Number(clip.roiChangedRatio) >= AUTO_RERUN_GENERAL_ROI_CHANGED_RATIO ||
    Number(clip.roiColorChangedRatio) >= AUTO_RERUN_GENERAL_ROI_COLOR_CHANGED_RATIO;
  return Number(clip.bestMeanDelta) >= AUTO_RERUN_MIN_BEST_MEAN_DELTA || impactRoiVisible || generalRoiVisible;
}

function replacementSource(summaryPath, rowId) {
  if (String(summaryPath).startsWith(runtimeRerunDir) && !APPROVED_REPLACEMENT_ROWS.has(rowId)) {
    return "runtime-rerun-auto";
  }
  return "probe-fixed";
}

function replacementVisibilityScore(clip) {
  return Math.max(
    Number(clip.bestMeanDelta) || 0,
    (Number(clip.roiChangedRatio) || 0) * 100,
    (Number(clip.roiColorChangedRatio) || 0) * 100
  );
}

async function collectReplacementClips(reasonsByRow) {
  const replacements = new Map();
  const summaryPaths = [];
  const collectSummaryPaths = async (root) => {
    if (!existsSync(root)) {
      return;
    }
    if (existsSync(join(root, "CANCELED.txt"))) {
      return;
    }
    for (const entry of await readdir(root, { withFileTypes: true })) {
      const path = join(root, entry.name);
      if (entry.isDirectory()) {
        await collectSummaryPaths(path);
      } else if (entry.isFile() && entry.name === "context-probe-summary.json") {
        summaryPaths.push(path);
      }
    }
  };
  for (const root of iterationProbeRoots) {
    await collectSummaryPaths(root);
  }
  summaryPaths.sort();
  for (const summaryPath of summaryPaths) {
    const summary = JSON.parse(await readFile(summaryPath, "utf-8"));
    for (const clip of summary.clips ?? []) {
      const rowId = Number(clip.rowId);
      if (!shouldUseReplacementClip(summaryPath, reasonsByRow, clip)) {
        continue;
      }
      const artifacts = {
        mp4: clip.mp4,
        json: clip.json,
        bestPng: clip.bestPng,
        midPng: String(clip.bestPng ?? "").replace(/_best\.png$/u, "_mid.png")
      };
      if (!(await artifactsReady(artifacts))) {
        continue;
      }
      const previous = replacements.get(rowId);
      const visibilityScore = replacementVisibilityScore(clip);
      const isNewer = !previous || String(summary.generatedAt) > String(previous.generatedAt);
      const isSameRunAndBetter =
        previous &&
        String(summary.generatedAt) === String(previous.generatedAt) &&
        visibilityScore > Number(previous.visibilityScore || 0);
      if (!previous || isNewer || isSameRunAndBetter) {
        replacements.set(rowId, {
          rowId,
          label: clip.label,
          source: replacementSource(summaryPath, rowId),
          generatedAt: summary.generatedAt,
          bestMeanDelta: clip.bestMeanDelta,
          visibilityScore,
          captureMode: clip.captureMode,
          variant: clip.variant ?? "",
          roiChangedRatio: clip.roiChangedRatio ?? "",
          roiColorChangedRatio: clip.roiColorChangedRatio ?? "",
          artifacts
        });
      }
    }
  }
  return replacements;
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const generatedAt = new Date().toISOString();
  const sequences = JSON.parse(await readFile(sequencePath, "utf-8"));
  const expectedRows = sequences.sequences.flatMap((sequence) => sequence.clips);
  const reasonsByRow = new Map();
  const detailRows = [];

  const strictEmpty = await readCsvIfExists(join(allV2Dir, "qa-vfx-empty-strict-candidates.csv"));
  const lowVisibility = await readCsvIfExists(join(allV2Dir, "qa-vfx-low-visibility-candidates.csv"));
  const overlapPair = await readCsvIfExists(join(allV2Dir, "qa-vfx-overlap-pair-candidates.csv"));
  const overlapLocation = await readCsvIfExists(join(allV2Dir, "qa-vfx-overlap-location-candidates.csv"));
  const tailRisk = await readCsvIfExists(join(allV2Dir, "qa-vfx-tail-risk-candidates.csv"));
  const missingResourceRows = await readCsvIfExists(join(missingAuditDir, "vfx-missing-resource-rows.csv"));

  for (const row of strictEmpty) {
    addReason(reasonsByRow, Number(row.rowId), "strict-empty");
  }
  for (const row of lowVisibility) {
    addReason(reasonsByRow, Number(row.rowId), "low-visibility");
  }
  for (const row of missingResourceRows) {
    addReason(reasonsByRow, Number(row.rowId), "missing-runtime-resource");
  }
  for (const row of overlapPair) {
    if (Number(row.overlapScore) >= OVERLAP_SCORE_THRESHOLD) {
      addReason(reasonsByRow, Number(row.prevRowId), "overlap-tail-source");
      addReason(reasonsByRow, Number(row.nextRowId), "overlap-contaminated-next");
    }
  }
  for (const row of overlapLocation) {
    if (Number(row.overlapScore) >= OVERLAP_SCORE_THRESHOLD) {
      addReason(reasonsByRow, Number(row.prevRowId), "location-overlap-tail-source");
      addReason(reasonsByRow, Number(row.nextRowId), "location-overlap-contaminated-next");
    }
  }
  for (const row of tailRisk) {
    if (Number(row.tailRiskScore) >= TAIL_RISK_THRESHOLD) {
      addReason(reasonsByRow, Number(row.rowId), "tail-risk");
    }
  }

  const replacements = await collectReplacementClips(reasonsByRow);
  for (const row of expectedRows) {
    const rowId = Number(row.rowId);
    const baseArtifacts = siblingArtifacts(join(allV2Dir, row.suggestedFileName));
    const replacement = replacements.get(rowId);
    const selectedArtifacts = replacement?.artifacts ?? baseArtifacts;
    const baseReady = await artifactsReady(baseArtifacts);
    const selectedReady = await artifactsReady(selectedArtifacts);
    const reasons = [...(reasonsByRow.get(rowId) ?? [])].sort();
    const hasOnlyKnownUnfixableMissingResource =
      reasons.includes("missing-runtime-resource") && /^HGVFX_(?:FNF|DUR)_TEST_/u.test(String(row.label));
    const status = replacement
      ? "fixed-replacement"
      : !baseReady
        ? "missing-artifact"
        : hasOnlyKnownUnfixableMissingResource
          ? "known-unfixable-test-placeholder"
          : reasons.length > 0
            ? "needs-iteration1-rerun"
            : "base-ok";

    detailRows.push({
      rowId,
      label: row.label,
      targetMode: row.targetMode,
      captureMode: row.captureMode,
      scriptName: row.scriptName,
      sequenceIndex: row.sequenceIndex,
      status,
      reasons: reasons.join(";"),
      selectedSource: replacement?.source ?? "all-v2",
      selectedMp4: selectedArtifacts.mp4,
      selectedBestPng: selectedArtifacts.bestPng,
      selectedJson: selectedArtifacts.json,
      selectedReady,
      baseReady,
      replacementGeneratedAt: replacement?.generatedAt ?? "",
      replacementBestMeanDelta: replacement?.bestMeanDelta ?? "",
      replacementRoiChangedRatio: replacement?.roiChangedRatio ?? "",
      replacementRoiColorChangedRatio: replacement?.roiColorChangedRatio ?? ""
    });
  }

  const rerunRows = detailRows.filter((row) => row.status === "missing-artifact" || row.status === "needs-iteration1-rerun");
  const severeRerunRows = rerunRows.filter((row) =>
    row.reasons.split(";").some((reason) =>
      [
        "strict-empty",
        "missing-runtime-resource",
        "overlap-contaminated-next",
        "location-overlap-contaminated-next"
      ].includes(reason)
    )
  );
  const counts = detailRows.reduce((map, row) => {
    map[row.status] = (map[row.status] ?? 0) + 1;
    return map;
  }, {});
  const reasonCounts = {};
  for (const row of detailRows) {
    for (const reason of row.reasons.split(";").filter(Boolean)) {
      reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    }
  }

  const manifestPath = join(outputDir, "vfx-iteration1-manifest.csv");
  const summaryPath = join(outputDir, "vfx-iteration1-summary.json");
  const rerunPath = join(outputDir, "vfx-iteration1-rerun-row-ids.txt");
  const severeRerunPath = join(outputDir, "vfx-iteration1-severe-rerun-row-ids.txt");
  const reportPath = join(outputDir, "vfx-iteration1-report.md");

  await writeFile(
    manifestPath,
    toCsv(detailRows, [
      "rowId",
      "label",
      "targetMode",
      "captureMode",
      "scriptName",
      "sequenceIndex",
      "status",
      "reasons",
      "selectedSource",
      "selectedMp4",
      "selectedBestPng",
      "selectedJson",
      "selectedReady",
      "baseReady",
      "replacementGeneratedAt",
      "replacementBestMeanDelta",
      "replacementRoiChangedRatio",
      "replacementRoiColorChangedRatio"
    ]),
    "utf-8"
  );
  await writeFile(rerunPath, `${rerunRows.map((row) => row.rowId).join(",")}\n`, "utf-8");
  await writeFile(severeRerunPath, `${severeRerunRows.map((row) => row.rowId).join(",")}\n`, "utf-8");
  await writeFile(
    summaryPath,
    JSON.stringify(
      {
        version: "aurora-vfx-iteration1-manifest/v1",
        generatedAt,
        thresholds: {
          overlapScore: OVERLAP_SCORE_THRESHOLD,
          tailRiskScore: TAIL_RISK_THRESHOLD
        },
        counts,
        reasonCounts,
        totalExpected: expectedRows.length,
        rerunCount: rerunRows.length,
        severeRerunCount: severeRerunRows.length,
        approvedReplacementRows: [...APPROVED_REPLACEMENT_ROWS].sort((left, right) => left - right),
        files: {
          manifestPath,
          rerunPath,
          severeRerunPath,
          reportPath
        }
      },
      null,
      2
    ),
    "utf-8"
  );
  await writeFile(
    reportPath,
    [
      "# VFX Iteration 1 Manifest",
      "",
      `Generated: ${generatedAt}`,
      "",
      "## Counts",
      "",
      "| Status | Count |",
      "|---|---:|",
      ...Object.entries(counts).sort().map(([status, count]) => `| ${status} | ${count} |`),
      "",
      "## Reasons",
      "",
      "| Reason | Count |",
      "|---|---:|",
      ...Object.entries(reasonCounts).sort().map(([reason, count]) => `| ${reason} | ${count} |`),
      "",
      `Full rerun rows: ${rerunRows.length}`,
      `Severe rerun rows: ${severeRerunRows.length}`,
      "",
      "## Files",
      "",
      `- Manifest: ${manifestPath}`,
      `- Rerun row ids: ${rerunPath}`,
      `- Severe rerun row ids: ${severeRerunPath}`
    ].join("\n") + "\n",
    "utf-8"
  );

  console.log(
    JSON.stringify(
      {
        outputDir,
        totalExpected: expectedRows.length,
        counts,
        reasonCounts,
        rerunCount: rerunRows.length,
        severeRerunCount: severeRerunRows.length,
        manifestPath,
        rerunPath,
        severeRerunPath,
        reportPath
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
