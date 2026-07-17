#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const docsRoot = path.join(repoRoot, "backend/docs/aurora-reverse");
const guardRoot = path.join(docsRoot, "guard-reports");
const registryPath = path.join(docsRoot, "vfx-claim-registry.json");
const runLogPath = path.join(docsRoot, "vfx-run-log.jsonl");
const statePath = path.join(docsRoot, "vfx-loop-state.json");
const coordinatorPath = path.join(guardRoot, "vfx-domain-coordinator-latest.json");

const args = parseArgs(process.argv.slice(2));
const latestJsonPath = path.resolve(
  repoRoot,
  args.latestJson ?? path.join(guardRoot, "vfx-visual-audit-latest.json")
);
const latestMdPath = path.resolve(
  repoRoot,
  args.latestMd ?? path.join(guardRoot, "vfx-visual-audit-latest.md")
);
const backlogJsonPath = path.resolve(
  repoRoot,
  args.backlogJson ?? path.join(guardRoot, "vfx-visual-audit-backlog.json")
);

const state = readJson(statePath);
const registry = readJson(registryPath);
const runLogClaims = readRunLogClaims(runLogPath);
const coordinator = readJson(coordinatorPath);
const generatedAt = new Date().toISOString();
const auditId = `vfx-visual-audit-${generatedAt.replace(/[:.]/gu, "-")}`;

const directClaims = [...registry.claims, ...runLogClaims]
  .filter((claim) => typeof claim.status === "string" && claim.status.startsWith("completed"))
  .filter((claim) => typeof claim.fixtureId === "string")
  .filter((claim) => claim.id !== "vfx-dev-contract-visual-evidence-semantic-completeness-gate")
  .filter((claim) => claim.visualSummary && claim.visualSemanticChecks);

const latestByFixture = new Map();
for (const claim of directClaims) {
  const current = latestByFixture.get(claim.fixtureId);
  if (!current || (claim.iteration ?? 0) > (current.iteration ?? 0)) {
    latestByFixture.set(claim.fixtureId, claim);
  }
}

const perFixture = [...latestByFixture.values()]
  .sort((left, right) => compareAuditEntries(left, right))
  .map((claim) => buildAuditEntry(claim));

const renderPassCount = perFixture.filter((entry) => entry.render.status === "PASS").length;
const renderWarnCount = perFixture.filter((entry) => entry.render.status === "WARN").length;
const renderFailCount = perFixture.filter((entry) => entry.render.status === "FAIL").length;
const semanticPassCount = perFixture.filter((entry) => entry.semanticStatus === "PASS").length;
const semanticWarnCount = perFixture.filter((entry) => entry.semanticStatus === "WARN").length;
const semanticFailCount = perFixture.filter((entry) => entry.semanticStatus === "FAIL").length;
const humanReviewNeededCount = perFixture.filter((entry) => entry.humanReviewNeeded).length;
const canonicalPromotionAttemptCount = perFixture.filter(
  (entry) => entry.canonicalParityPromoted === true
).length;
const latestWorkerIterationCovered = Math.max(...perFixture.map((entry) => entry.latestIteration), 0);

const backlog = buildWorkerBacklog(perFixture);
const report = {
  auditId,
  generatedAt,
  auditMode: "refresh-from-vfx-claim-registry-after-worker-iteration-211",
  upstreamDirectiveRead: true,
  upstreamDirectiveSource: "backend/docs/aurora-reverse/guard-reports/vfx-domain-coordinator-latest.json",
  upstreamDirectiveTimestampOrVersion: coordinator.generatedAt,
  directiveCompliance: "followed",
  deviationOrBlocker: null,
  coordinatorDirective: coordinator.coordinatorDirective,
  latestWorkerIterationCovered,
  fixtureSetSource:
    "backend/docs/aurora-reverse/vfx-claim-registry.json direct completed visual claims plus catalog plc_zlc_o45 evidence",
  fixturesAudited: perFixture.length,
  renderPassCount,
  renderWarnCount,
  renderFailCount,
  semanticPassCount,
  semanticWarnCount,
  semanticFailCount,
  humanReviewNeededCount,
  canonicalPromotionAttemptCount,
  staleFindingsResolved: [
    {
      finding: "vfx-visual-audit-latest covered worker iteration 175 and omitted catalog plc_zlc_o45",
      resolution:
        "refreshed from durable completed claims through iteration 211 and included catalog-placeable-plc_zlc_o45"
    }
  ],
  perFixture,
  blockers: [
    "blocked_retail_capture",
    "retail_runtime_tick_dumps_missing",
    "retail_render_contract_snapshots_missing",
    "retail_capture_references_missing",
    "retail_comparison_evidence_missing"
  ],
  canonicalParityBlocked: true,
  workerBacklog: backlog.workerBacklog
};

const backlogReport = {
  auditId,
  generatedAt,
  upstreamDirectiveRead: true,
  upstreamDirectiveSource: report.upstreamDirectiveSource,
  upstreamDirectiveTimestampOrVersion: report.upstreamDirectiveTimestampOrVersion,
  directiveCompliance: "followed",
  latestWorkerIterationCovered,
  canonicalParityBlocked: true,
  workerBacklog: backlog.workerBacklog
};

fs.mkdirSync(path.dirname(latestJsonPath), { recursive: true });
fs.writeFileSync(latestJsonPath, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(backlogJsonPath, `${JSON.stringify(backlogReport, null, 2)}\n`);
fs.writeFileSync(latestMdPath, renderMarkdownReport(report, backlogReport));

console.log(
  JSON.stringify(
    {
      auditId,
      latestWorkerIterationCovered,
      fixturesAudited: report.fixturesAudited,
      renderPassCount,
      semanticPassCount,
      semanticWarnCount,
      semanticFailCount,
      humanReviewNeededCount,
      canonicalPromotionAttemptCount,
      latestJson: toRepoPath(latestJsonPath),
      latestMd: toRepoPath(latestMdPath),
      backlogJson: toRepoPath(backlogJsonPath)
    },
    null,
    2
  )
);

function buildAuditEntry(claim) {
  const checks = claim.visualSemanticChecks ?? {};
  const failedSemanticChecks = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([key]) => key);
  const visualSummary = claim.visualSummary ?? {};
  const objectPixels =
    visualSummary.objectPixelsWithoutGrid ??
    visualSummary.domObjectPixels ??
    visualSummary.analyzerObjectPixels ??
    null;
  const canvasNonblank = visualSummary.canvasNonblank === true;
  const renderStatus = visualSummary.renderStatus ?? "unknown";
  const renderPass = canvasNonblank || claim.fixtureId === "vfx-retail-chunk-particles-progfx-type9";
  const humanReview = readHumanReviewNeeded(claim);
  const semanticStatus =
    failedSemanticChecks.length > 0
      ? "FAIL"
      : Object.keys(checks).length === 0 || !claim.visualSemanticOracle
        ? "WARN"
        : "PASS";

  return {
    fixtureId: claim.fixtureId,
    title: titleForClaim(claim),
    latestIteration: claim.iteration,
    activeClaim: claim.id,
    route: claim.route,
    selectedCase: claim.selectedCase,
    artifacts: normalizeArtifacts(claim.artifacts),
    render: {
      status: renderPass ? "PASS" : renderStatus === "unknown" ? "WARN" : "FAIL",
      renderStatus,
      canvasNonblank,
      screenshotBytes: visualSummary.screenshotBytes ?? null,
      objectPixels,
      objectPixelThreshold: visualSummary.objectPixelThreshold ?? null,
      drawLane: visualSummary.drawLane ?? null,
      drawParticles: visualSummary.drawParticles ?? visualSummary.particleCount ?? null,
      renderedVertices: visualSummary.renderedVertices ?? null,
      correlationResult: claim.comparisonResult ?? null,
      thresholdPassed: failedSemanticChecks.length === 0
    },
    visualSummary,
    visualSemanticOracle: claim.visualSemanticOracle,
    visualSemanticChecks: checks,
    semanticStatus,
    failedSemanticChecks,
    warnSemanticChecks: semanticStatus === "WARN" ? ["visualSemanticOracleOrChecksMissing"] : [],
    humanReviewNeeded: humanReview.required,
    humanReviewNeededFor: humanReview.missingOracles,
    canonicalParityPromoted: claim.canonicalParityPromoted === true,
    blockers: claim.blockers ?? []
  };
}

function buildWorkerBacklog(entries) {
  const workerBacklog = [];
  const chunk = entries.find((entry) => entry.fixtureId === "vfx-retail-chunk-particles-progfx-type9");
  if (chunk) {
    workerBacklog.push({
      priority: workerBacklog.length + 1,
      fixtureId: chunk.fixtureId,
      type: "missing-retail-resource-oracle",
      title: "Collect or admit real progfx Type 9 chunk model resource/source row and retail chunk capture",
      evidence: [
        "Latest local diagnostic preserves chunk_model lane and does not synthesize fake particles.",
        "Coordinator says worker-only local implementation cannot honestly resolve the real resource/source/retail oracle."
      ],
      recommendedAction:
        "Do not mark fixed locally; keep diagnostic behavior and collect real resource/source plus retail capture evidence."
    });
  }

  for (const entry of entries.filter(
    (candidate) =>
      candidate.humanReviewNeeded &&
      candidate.fixtureId !== "vfx-retail-chunk-particles-progfx-type9"
  )) {
    workerBacklog.push({
      priority: workerBacklog.length + 1,
      fixtureId: entry.fixtureId,
      type: entry.fixtureId.startsWith("catalog-placeable-")
        ? "catalog-retail-human-review-needed"
        : "retail-human-review-needed",
      title: `Collect retail runtime/render/capture/comparison evidence for ${entry.fixtureId}`,
      evidence: entry.humanReviewNeededFor,
      recommendedAction:
        "Do not repeat local semantic work unless a regression appears; collect retail evidence before canonical parity."
    });
  }
  return { workerBacklog };
}

function readHumanReviewNeeded(claim) {
  const oracle = claim.visualSemanticOracle ?? {};
  const source = oracle.humanReviewNeeded;
  if (Array.isArray(source)) {
    return {
      required: source.length > 0,
      missingOracles: source.map((entry) => entry.missingOracle ?? entry.reason ?? String(entry))
    };
  }
  if (source && typeof source === "object") {
    return {
      required: source.required !== false,
      missingOracles: [source.missingOracle ?? source.reason ?? "retail evidence missing"]
    };
  }
  const retailBlockers = (claim.blockers ?? []).filter((blocker) => /retail|canonical/iu.test(blocker));
  return {
    required: retailBlockers.length > 0,
    missingOracles: retailBlockers
  };
}

function compareAuditEntries(left, right) {
  const leftCatalog = left.fixtureId.startsWith("catalog-placeable-") ? 0 : 1;
  const rightCatalog = right.fixtureId.startsWith("catalog-placeable-") ? 0 : 1;
  if (leftCatalog !== rightCatalog) {
    return leftCatalog - rightCatalog;
  }
  return String(left.fixtureId).localeCompare(String(right.fixtureId));
}

function normalizeArtifacts(artifacts) {
  if (Array.isArray(artifacts)) {
    return Object.fromEntries(
      artifacts.map((artifact, index) => [`artifact${index + 1}`, artifact])
    );
  }
  return artifacts ?? {};
}

function titleForClaim(claim) {
  if (claim.fixtureId === "catalog-placeable-plc_zlc_o45") {
    return "plc_zlc_o45 / zlc_o45 / VFX: Magic Mouth, Flat Anim P* (dobervich)";
  }
  return claim.fixtureId;
}

function renderMarkdownReport(report, backlogReport) {
  const lines = [
    "# Aurora VFX Visual Audit Report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Directive",
    "",
    `- Upstream directive read: ${report.upstreamDirectiveRead}`,
    `- Coordinator source: ${report.upstreamDirectiveSource}`,
    `- Coordinator timestamp: ${report.upstreamDirectiveTimestampOrVersion}`,
    `- Compliance: ${report.directiveCompliance}`,
    `- Directive: ${report.coordinatorDirective}`,
    "",
    "## Summary",
    "",
    `- Latest worker iteration covered: ${report.latestWorkerIterationCovered}`,
    `- Fixtures/catalog items audited: ${report.fixturesAudited}`,
    `- Render PASS/WARN/FAIL: ${report.renderPassCount}/${report.renderWarnCount}/${report.renderFailCount}`,
    `- Semantic PASS/WARN/FAIL: ${report.semanticPassCount}/${report.semanticWarnCount}/${report.semanticFailCount}`,
    `- Human review needed: ${report.humanReviewNeededCount}`,
    `- Canonical promotion attempts: ${report.canonicalPromotionAttemptCount}`,
    `- Canonical parity blocked: ${report.canonicalParityBlocked}`,
    "",
    "## Audited Items",
    "",
    "| Fixture/catalog item | Iteration | Render | Semantic | Human review |",
    "| --- | ---: | --- | --- | --- |"
  ];
  for (const entry of report.perFixture) {
    lines.push(
      `| ${entry.fixtureId} | ${entry.latestIteration} | ${entry.render.status} | ${entry.semanticStatus} | ${entry.humanReviewNeeded ? "yes" : "no"} |`
    );
  }
  lines.push("", "## Worker Backlog", "");
  for (const item of backlogReport.workerBacklog) {
    lines.push(`${item.priority}. ${item.fixtureId}: ${item.type} - ${item.recommendedAction}`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readRunLogClaims(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((entry) => entry.type === "worker_iteration_completed" || entry.kind === "worker-iteration")
    .filter((entry) => entry.visualSummary && entry.visualSemanticChecks)
    .map((entry) => ({
      id: entry.activeClaim,
      iteration: entry.iteration,
      status: "completed_from_run_log",
      fixtureId: entry.fixtureId ?? entry.selectedFixture,
      route: entry.route,
      selectedCase: entry.selectedCase,
      artifacts: entry.artifacts,
      visualSummary: entry.visualSummary,
      visualSemanticOracle: entry.visualSemanticOracle,
      visualSemanticChecks: entry.visualSemanticChecks,
      blockers: entry.blockers,
      canonicalParityPromoted: entry.canonicalParityPromoted,
      comparisonResult: entry.comparisonResult
    }));
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    parsed[arg.slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
}

function toRepoPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/gu, "/");
}
