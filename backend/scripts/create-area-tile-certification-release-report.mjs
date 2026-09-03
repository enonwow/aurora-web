#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

import {
  AREA_TILE_CERTIFICATION_REPORT_MAX_BYTES,
  loadAreaTileCertificationEvidence,
  writeCompactJsonAtomic,
} from "./lib/area-tile-certification-publication-evidence.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(scriptDirectory, "..");
const repoRoot = path.resolve(backendRoot, "..");
const matrixControllerPath = path.join(
  scriptDirectory,
  "aurora-tile-add-connect-matrix.mjs",
);
const publicationModulePath = path.join(
  backendRoot,
  "dist",
  "src",
  "modules",
  "areas",
  "domain",
  "area-tile-certification-publication.js",
);
const releaseReportModulePath = path.join(
  backendRoot,
  "dist",
  "src",
  "modules",
  "areas",
  "domain",
  "area-certification.release-report.js",
);
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

class AreaTileCertificationPublisherCliError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "AreaTileCertificationPublisherCliError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new AreaTileCertificationPublisherCliError(code, message);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) fail("unexpected_argument", `Unexpected argument: ${token}`);
    const key = token.slice(2);
    if (key === "execute") {
      if (result.execute !== undefined) fail("duplicate_argument", "--execute was repeated.");
      result.execute = true;
      continue;
    }
    if (result[key] !== undefined) fail("duplicate_argument", `--${key} was repeated.`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) fail("missing_argument_value", `--${key} requires a value.`);
    result[key] = value;
    index += 1;
  }
  const allowed = new Set([
    "catalog",
    "catalog-sha256",
    "matrix-directory",
    "matrix-plan-id",
    "checkpoint-sha256",
    "generated-at",
    "profile-id",
    "out",
    "execute",
  ]);
  for (const key of Object.keys(result)) {
    if (!allowed.has(key)) fail("unknown_argument", `Unknown argument: --${key}`);
  }
  for (const key of [
    "catalog",
    "catalog-sha256",
    "matrix-directory",
    "matrix-plan-id",
    "checkpoint-sha256",
    "generated-at",
    "profile-id",
    "out",
  ]) {
    if (typeof result[key] !== "string" || result[key].trim().length < 1) {
      fail("missing_required_argument", `--${key} is required.`);
    }
  }
  for (const key of ["catalog-sha256", "matrix-plan-id", "checkpoint-sha256"]) {
    if (!SHA256_PATTERN.test(result[key])) fail("invalid_sha256_argument", `--${key} must be a lowercase SHA-256.`);
  }
  return Object.freeze(result);
}

function runCanonicalMatrixStatus(matrixDirectory, matrixPlanId) {
  const child = spawnSync(
    process.execPath,
    [
      "--max-old-space-size=1024",
      matrixControllerPath,
      "status",
      "--out-directory",
      matrixDirectory,
      "--plan-id",
      matrixPlanId,
    ],
    {
      cwd: backendRoot,
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
    },
  );
  if (child.status !== 0) {
    fail(
      "matrix_status_failed",
      `Canonical matrix status failed with exit ${String(child.status)}: ${String(child.stderr ?? "").trim().slice(0, 1024)}`,
    );
  }
  try {
    return JSON.parse(child.stdout);
  } catch {
    fail("matrix_status_output_invalid", "Canonical matrix status did not return one JSON document.");
  }
}

function stableStatusProjection(status) {
  return JSON.stringify({
    planned: status?.planned,
    planBinding: status?.planBinding,
    validation: status?.validation,
    summary: status?.summary,
    checkpoint: status?.checkpoint,
    coverage: status?.coverage,
  });
}

function loadCompiledDomain() {
  if (!fs.existsSync(publicationModulePath) || !fs.existsSync(releaseReportModulePath)) {
    fail(
      "backend_build_required",
      "Compiled certification domain is missing; run the package publication script so the backend build gate runs first.",
    );
  }
  const require = createRequire(import.meta.url);
  const publication = require(publicationModulePath);
  const releaseReport = require(releaseReportModulePath);
  if (
    typeof publication.buildAreaTileCertificationPublication !== "function" ||
    typeof releaseReport.buildAreaCertificationReleaseReport !== "function"
  ) {
    fail("compiled_domain_invalid", "Compiled certification domain exports are unavailable.");
  }
  return {
    buildPublication: publication.buildAreaTileCertificationPublication,
    buildReleaseReport: releaseReport.buildAreaCertificationReleaseReport,
  };
}

function reportProofTotals(report) {
  return Object.fromEntries(
    Object.entries(report.aggregate.proofs).map(([dimension, states]) => [
      dimension,
      {
        verified: states.verified,
        failed: states.failed,
        missing: states.missing,
      },
    ]),
  );
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const catalogPath = path.resolve(process.cwd(), args.catalog);
  const matrixDirectory = path.resolve(process.cwd(), args["matrix-directory"]);
  const outputPath = path.resolve(process.cwd(), args.out);
  const statusBefore = runCanonicalMatrixStatus(
    matrixDirectory,
    args["matrix-plan-id"],
  );
  const evidence = loadAreaTileCertificationEvidence({
    repoRoot,
    catalogPath,
    catalogSha256: args["catalog-sha256"],
    matrixDirectory,
    matrixPlanId: args["matrix-plan-id"],
    checkpointSha256: args["checkpoint-sha256"],
    matrixStatus: statusBefore,
    expectedTilesetCount: 99,
    expectedRowCount: 53_700,
  });
  const statusAfter = runCanonicalMatrixStatus(
    matrixDirectory,
    args["matrix-plan-id"],
  );
  if (stableStatusProjection(statusBefore) !== stableStatusProjection(statusAfter)) {
    fail("matrix_changed_during_publication", "Matrix status changed during evidence admission.");
  }
  const checkpointPath = path.join(matrixDirectory, "checkpoint.json");
  if (sha256(fs.readFileSync(checkpointPath)) !== args["checkpoint-sha256"]) {
    fail("checkpoint_changed_during_publication", "Checkpoint changed during evidence admission.");
  }

  const domain = loadCompiledDomain();
  const publication = domain.buildPublication({
    generatedAtIso: args["generated-at"],
    binding: {
      ...evidence.binding,
      profileId: args["profile-id"],
    },
    catalogRows: evidence.catalogRows,
    acceptedAddRenderSubjects: evidence.acceptedAddRenderSubjects,
  });
  const rebuilt = domain.buildReleaseReport({
    generatedAtIso: publication.report.generatedAtIso,
    plan: publication.report.plan,
    rows: publication.report.rowLedger,
  });
  const compact = Buffer.from(JSON.stringify(publication.report), "utf8");
  if (!compact.equals(Buffer.from(JSON.stringify(rebuilt), "utf8"))) {
    fail("release_report_rebuild_mismatch", "Canonical release-report rebuild changed the publication.");
  }
  if (compact.byteLength > AREA_TILE_CERTIFICATION_REPORT_MAX_BYTES) {
    fail(
      "release_report_budget_exceeded",
      `Compact report requires ${compact.byteLength} bytes; maximum is ${AREA_TILE_CERTIFICATION_REPORT_MAX_BYTES}.`,
    );
  }
  const expectedOutput = {
    path: outputPath,
    bytes: compact.byteLength,
    sha256: sha256(compact),
  };
  const written = args.execute === true
    ? writeCompactJsonAtomic(
        outputPath,
        publication.report,
        AREA_TILE_CERTIFICATION_REPORT_MAX_BYTES,
      )
    : null;
  if (written && (
    written.path !== expectedOutput.path ||
    written.bytes !== expectedOutput.bytes ||
    written.sha256 !== expectedOutput.sha256
  )) {
    fail("published_output_mismatch", "Published output differs from the validated report bytes.");
  }

  print({
    schema: "area-tile-certification-publication-result.v1",
    generatedAtIso: publication.report.generatedAtIso,
    writePerformed: args.execute === true,
    inputs: {
      catalogPath,
      catalogSha256: args["catalog-sha256"],
      matrixDirectory,
      matrixPlanId: args["matrix-plan-id"],
      checkpointSha256: args["checkpoint-sha256"],
      profileId: args["profile-id"],
    },
    corpus: {
      ...publication.corpus,
      corpusHash: publication.corpusHash,
    },
    plan: publication.plan,
    report: {
      schemaVersion: publication.report.schemaVersion,
      ledgerSha256: publication.report.ledgerSha256,
      reportSha256: publication.report.reportSha256,
      releaseStatus: publication.report.release.status,
      blockerCodes: publication.report.release.blockerCodes,
      rows: publication.report.aggregate.rows,
      proofs: reportProofTotals(publication.report),
    },
    evidence: evidence.diagnostics,
    output: written ?? expectedOutput,
  });
}

try {
  main();
} catch (error) {
  const code = typeof error?.code === "string" ? error.code : "publication_failed";
  process.stderr.write(`${JSON.stringify({ error: { code, message: String(error?.message ?? error) } })}\n`);
  process.exitCode = 1;
}
