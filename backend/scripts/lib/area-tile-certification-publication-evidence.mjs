import { createHash, randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  MATRIX_RUNTIME_BUILD_PROFILE_MAX_BYTES,
  buildMatrixRuntimeBuildBinding,
  validateMatrixRuntimeBuildBinding,
  validateMatrixRuntimeBuildObservations,
} from "./tile-add-connect-runtime-build-profile.mjs";
import {
  validateTileAddConnectRuntimeSourceIdentity,
} from "./tile-add-connect-runtime-source-identity.mjs";

export const AREA_TILE_CERTIFICATION_REPORT_MAX_BYTES = 64 * 1024 * 1024;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const TILESET_RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;
const TILE_SUBJECT_PATTERN = /^([a-z0-9_]{1,16}):(0|[1-9][0-9]{0,5})$/u;
const CHUNK_ID_PATTERN = /^[a-z0-9_-]{1,128}$/u;
const ATTEMPT_ID_PATTERN = /^[a-z0-9_-]{1,128}(?:\.attempt-[0-9]{4})?$/u;
const MODEL_SOURCE_STATUSES = new Set([
  "source_resolved",
  "source_missing",
  "intentional_placeholder",
  "invalid_missing_model_field",
]);
const REQUIRED_ARTIFACT_SUFFIXES = Object.freeze({
  frame: ".frame.json",
  state: ".state.json",
  canvas: ".canvas.png",
  page: ".png",
  lifecycle: ".lifecycle.jsonl",
});
const REQUIRED_VISUAL_CHECKS = Object.freeze([
  "requestedAreaLegible",
  "declaredFixtureLayoutVisible",
  "noUnexpectedBlankFailedBridgeOrPlaceholderTiles",
  "cameraFramingAccepted",
]);

export class InvalidAreaTileCertificationEvidenceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "InvalidAreaTileCertificationEvidenceError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new InvalidAreaTileCertificationEvidenceError(code, message);
}

export function loadAreaTileCertificationEvidence(input) {
  if (!isRecord(input)) fail("invalid_input", "Evidence input must be an object.");
  const repoRoot = requireDirectory(input.repoRoot, "repo_root_invalid");
  const catalogPath = requireFileInside(
    repoRoot,
    input.catalogPath,
    "catalog_path_escape",
    "catalog_missing",
  );
  const catalogSha256 = requireSha256(input.catalogSha256, "catalog_sha256_invalid");
  assertFileSha256(catalogPath, catalogSha256, "catalog_sha256_mismatch");
  const catalog = readJsonBounded(catalogPath, 16 * 1024 * 1024, "catalog_invalid");
  const expectedTilesetCount = positiveInteger(
    input.expectedTilesetCount,
    "expected_tileset_count_invalid",
    99,
    100_000,
  );
  const expectedRowCount = positiveInteger(
    input.expectedRowCount,
    "expected_row_count_invalid",
    53_700,
    100_000,
  );
  const catalogEvidence = validateCatalog({
    catalog,
    catalogPath,
    repoRoot,
    expectedTilesetCount,
    expectedRowCount,
  });

  const matrixDirectory = requireDirectory(input.matrixDirectory, "matrix_directory_invalid");
  const matrixPlanId = requireSha256(input.matrixPlanId, "matrix_plan_id_invalid");
  const manifestPath = path.join(matrixDirectory, "manifest.json");
  assertFileSha256(manifestPath, matrixPlanId, "matrix_manifest_sha256_mismatch");
  const checkpointSha256 = requireSha256(
    input.checkpointSha256,
    "checkpoint_sha256_invalid",
  );
  const status = validateMatrixStatus({
    status: input.matrixStatus,
    matrixDirectory,
    matrixPlanId,
    expectedTilesetCount,
    expectedRowCount,
  });
  const checkpointPath = path.join(matrixDirectory, "checkpoint.json");
  assertFileSha256(checkpointPath, checkpointSha256, "checkpoint_sha256_mismatch");
  const checkpoint = readJsonBounded(
    checkpointPath,
    16 * 1024 * 1024,
    "checkpoint_invalid",
  );
  validateCheckpoint(checkpoint, status, matrixDirectory);
  const runtimeBuildEvidence = validateRuntimeBuildEvidence({
    status,
    checkpoint,
  });

  const acceptedEvidence = validateAcceptedReviews({
    checkpoint,
    matrixDirectory,
    status,
    catalogEntries: catalogEvidence.entriesByResRef,
    catalogRows: catalogEvidence.rowsBySubject,
    runtimeBuildBinding: runtimeBuildEvidence.binding,
  });
  if (status.coverageCapturedRows !== acceptedEvidence.subjects.length) {
    fail(
      "matrix_coverage_row_count_mismatch",
      `Matrix status reports ${status.coverageCapturedRows} captured rows, but ${acceptedEvidence.subjects.length} exact rows were admitted.`,
    );
  }

  return deepFreeze({
    binding: {
      catalogSha256,
      sourceInventorySha256: catalogEvidence.sourceInventorySha256,
      modelSourceInventorySha256: catalogEvidence.modelSourceInventorySha256,
      matrixPlanId,
      matrixManifestSchema: status.manifestSchema,
      matrixContractRevision: status.contractRevision,
      matrixContractFingerprint: status.contractFingerprint,
      runtimeBuildProfileId: runtimeBuildEvidence.binding.profile.profileId,
      runtimeBuildProfileSha256: runtimeBuildEvidence.binding.profile.sha256,
      runtimeBuildBindingSha256: runtimeBuildEvidence.binding.bindingSha256,
    },
    catalogRows: catalogEvidence.rows,
    acceptedAddRenderSubjects: acceptedEvidence.subjects,
    diagnostics: {
      tilesetCount: catalogEvidence.tilesetCount,
      rowCount: catalogEvidence.rows.length,
      acceptedReviewCount: checkpoint.acceptedVisualReviews.length,
      acceptedAddRenderRowCount: acceptedEvidence.subjects.length,
      acceptedAddRenderEvidenceReferenceCount: acceptedEvidence.evidenceReferenceCount,
      duplicateAddRenderEvidenceReferenceCount:
        acceptedEvidence.evidenceReferenceCount - acceptedEvidence.subjects.length,
      checkpointSha256,
      checkpointNextChunkIndex: checkpoint.nextChunkIndex,
      matrixTotalChunks: status.totalChunks,
      matrixComplete: checkpoint.complete === true,
      runtimeBuildProfileId: runtimeBuildEvidence.binding.profile.profileId,
      runtimeBuildProfileSha256: runtimeBuildEvidence.binding.profile.sha256,
      runtimeBuildBindingSha256: runtimeBuildEvidence.binding.bindingSha256,
    },
  });
}

function validateCatalog({
  catalog,
  catalogPath,
  repoRoot,
  expectedTilesetCount,
  expectedRowCount,
}) {
  if (
    !isRecord(catalog) ||
    catalog.schema !== "aurora-tileset-definition-catalog/v2" ||
    !Array.isArray(catalog.entries) ||
    !isRecord(catalog.summary) ||
    !isRecord(catalog.sourceInventory) ||
    !isRecord(catalog.modelSourceInventory)
  ) {
    fail("catalog_invalid", "Catalog v2 envelope is invalid.");
  }
  if (
    catalog.entries.length !== expectedTilesetCount ||
    catalog.summary.tilesetCount !== expectedTilesetCount ||
    catalog.summary.totalTileCount !== expectedRowCount ||
    catalog.modelSourceInventory.rowCount !== expectedRowCount
  ) {
    fail("catalog_count_mismatch", "Catalog and expected publication counts differ.");
  }

  const sourceInventorySha256 = requireSha256(
    catalog.sourceInventory.sha256,
    "source_inventory_sha256_invalid",
  );
  const sourceInventoryPath = resolveRepoRelativeFile(
    repoRoot,
    catalog.sourceInventory.path,
    "source_inventory_path_escape",
    "source_inventory_missing",
  );
  assertFileSha256(
    sourceInventoryPath,
    sourceInventorySha256,
    "source_inventory_sha256_mismatch",
  );
  const modelSourceInventorySha256 = requireSha256(
    catalog.modelSourceInventory.sha256,
    "model_source_inventory_sha256_invalid",
  );
  const modelSourceInventoryPath = resolveRepoRelativeFile(
    repoRoot,
    catalog.modelSourceInventory.path,
    "model_source_inventory_path_escape",
    "model_source_inventory_missing",
  );
  assertFileSha256(
    modelSourceInventoryPath,
    modelSourceInventorySha256,
    "model_source_inventory_sha256_mismatch",
  );

  const catalogDirectory = path.dirname(catalogPath);
  const seenResRefs = new Set();
  const rows = [];
  const rowsBySubject = new Map();
  const entriesByResRef = new Map();
  const statusCounts = {
    source_resolved: 0,
    source_missing: 0,
    intentional_placeholder: 0,
    invalid_missing_model_field: 0,
  };
  let groupCount = 0;
  let diagnosticCount = 0;

  for (const entry of catalog.entries) {
    if (
      !isRecord(entry) ||
      typeof entry.tilesetResRef !== "string" ||
      !TILESET_RESREF_PATTERN.test(entry.tilesetResRef) ||
      seenResRefs.has(entry.tilesetResRef) ||
      typeof entry.sourceKey !== "string" ||
      entry.sourceKey.trim().length < 1 ||
      entry.sourceKey.includes("\0")
    ) {
      fail("catalog_entry_invalid", "Catalog contains an invalid or duplicate tileset entry.");
    }
    seenResRefs.add(entry.tilesetResRef);
    const sourceSha256 = requireSha256(
      entry.sourceSha256,
      "catalog_entry_source_sha256_invalid",
    );
    const definitionSha256 = requireSha256(
      entry.definitionSha256,
      "catalog_entry_definition_sha256_invalid",
    );
    const definitionPath = resolveInside(
      catalogDirectory,
      entry.definitionPath,
      "definition_path_escape",
      "definition_missing",
    );
    assertFileSha256(
      definitionPath,
      definitionSha256,
      "definition_sha256_mismatch",
    );
    const definition = readJsonBounded(
      definitionPath,
      4 * 1024 * 1024,
      "definition_invalid",
    );
    if (
      !isRecord(definition) ||
      definition.schemaVersion !== 1 ||
      definition.tilesetResRef !== entry.tilesetResRef ||
      definition.fingerprint !== sourceSha256 ||
      !Array.isArray(definition.tiles) ||
      !Array.isArray(definition.groups) ||
      !Array.isArray(definition.diagnostics) ||
      definition.tiles.length !== entry.tileCount ||
      definition.groups.length !== entry.groupCount ||
      definition.diagnostics.length !== entry.diagnosticCount
    ) {
      fail("definition_contract_mismatch", `Definition ${entry.tilesetResRef} differs from its catalog entry.`);
    }
    const seenTileIds = new Set();
    for (const tile of definition.tiles) {
      if (
        !isRecord(tile) ||
        !Number.isInteger(tile.tileId) ||
        tile.tileId < 0 ||
        tile.tileId > 999_999 ||
        seenTileIds.has(tile.tileId)
      ) {
        fail("definition_tile_invalid", `Definition ${entry.tilesetResRef} has an invalid or duplicate Tile_ID.`);
      }
      if (!MODEL_SOURCE_STATUSES.has(tile.modelSourceStatus)) {
        fail(
          "definition_model_source_status_invalid",
          `Definition ${entry.tilesetResRef}:${tile.tileId} has an unsupported model-source status.`,
        );
      }
      seenTileIds.add(tile.tileId);
      statusCounts[tile.modelSourceStatus] += 1;
      const row = Object.freeze({
        tilesetResRef: entry.tilesetResRef,
        tileId: tile.tileId,
        modelSourceStatus: tile.modelSourceStatus,
      });
      const subject = `${entry.tilesetResRef}:${tile.tileId}`;
      if (rowsBySubject.has(subject)) {
        fail("catalog_subject_duplicate", `Catalog subject ${subject} is duplicated.`);
      }
      rows.push(row);
      rowsBySubject.set(subject, row);
    }
    groupCount += definition.groups.length;
    diagnosticCount += definition.diagnostics.length;
    entriesByResRef.set(entry.tilesetResRef, Object.freeze({
      tilesetResRef: entry.tilesetResRef,
      sourceKey: entry.sourceKey,
      sourceSha256,
      definitionSha256,
    }));
  }

  if (
    rows.length !== expectedRowCount ||
    groupCount !== catalog.summary.totalGroupCount ||
    diagnosticCount !== catalog.summary.totalDiagnosticCount ||
    statusCounts.source_resolved !== catalog.summary.sourceResolvedTileCount ||
    statusCounts.source_missing !== catalog.summary.sourceMissingTileCount ||
    statusCounts.intentional_placeholder !== catalog.summary.intentionalPlaceholderTileCount ||
    statusCounts.invalid_missing_model_field !== catalog.summary.invalidMissingModelFieldTileCount
  ) {
    fail("catalog_summary_mismatch", "Catalog summary does not match its exact definition shards.");
  }
  rows.sort((left, right) =>
    left.tilesetResRef.localeCompare(right.tilesetResRef) || left.tileId - right.tileId
  );
  return {
    sourceInventorySha256,
    modelSourceInventorySha256,
    tilesetCount: seenResRefs.size,
    rows: Object.freeze(rows),
    rowsBySubject,
    entriesByResRef,
  };
}

function validateMatrixStatus({
  status,
  matrixDirectory,
  matrixPlanId,
  expectedTilesetCount,
  expectedRowCount,
}) {
  if (
    !isRecord(status) ||
    status.schema !== "aurora-tile-add-connect-matrix-status/v2" ||
    status.planned !== true ||
    !isRecord(status.validation) ||
    status.validation.status !== "ready" ||
    !Array.isArray(status.validation.errors) ||
    status.validation.errors.length !== 0 ||
    !isRecord(status.planBinding) ||
    status.planBinding.planId !== matrixPlanId ||
    path.resolve(String(status.planBinding.outDirectory ?? "")) !== matrixDirectory ||
    typeof status.planBinding.manifestSchema !== "string" ||
    typeof status.planBinding.contractRevision !== "string" ||
    status.planBinding.contractRevision !== "path-node-aware-v8" ||
    !SHA256_PATTERN.test(String(status.planBinding.contractFingerprint ?? "")) ||
    validateMatrixRuntimeBuildBinding(status.planBinding.runtimeBuildBinding).length !== 0 ||
    !isRecord(status.summary) ||
    status.summary.tilesetCount !== expectedTilesetCount ||
    status.summary.totalRows !== expectedRowCount ||
    !isRecord(status.checkpoint) ||
    !isRecord(status.coverage) ||
    !isRecord(status.coverage.addRenderCoverage) ||
    status.coverage.addRenderCoverage.totalRows !== expectedRowCount ||
    !Number.isInteger(status.coverage.addRenderCoverage.capturedRows) ||
    !Number.isInteger(status.checkpoint.totalChunks)
  ) {
    fail("matrix_status_invalid", "Canonical matrix status is not an exact ready plan binding.");
  }
  return Object.freeze({
    matrixPlanId,
    manifestSchema: status.planBinding.manifestSchema,
    contractRevision: status.planBinding.contractRevision,
    contractFingerprint: status.planBinding.contractFingerprint,
    runtimeBuildBinding: status.planBinding.runtimeBuildBinding,
    nextChunkIndex: status.checkpoint.nextChunkIndex,
    capturedChunkCount: status.checkpoint.capturedChunkCount,
    totalChunks: status.checkpoint.totalChunks,
    complete: status.checkpoint.complete === true,
    coverageCapturedRows: status.coverage.addRenderCoverage.capturedRows,
  });
}

function validateCheckpoint(checkpoint, status, matrixDirectory) {
  if (
    !isRecord(checkpoint) ||
    checkpoint.schema !== "aurora-tile-add-connect-matrix-checkpoint/v2" ||
    checkpoint.planId !== status.matrixPlanId ||
    checkpoint.planId !== checkpoint.manifestSha256 ||
    checkpoint.manifestSchema !== status.manifestSchema ||
    checkpoint.contractRevision !== status.contractRevision ||
    checkpoint.contractFingerprint !== status.contractFingerprint ||
    !sameJson(checkpoint.runtimeBuildBinding, status.runtimeBuildBinding) ||
    path.resolve(String(checkpoint.planDirectory ?? "")) !== matrixDirectory ||
    !Number.isInteger(checkpoint.nextChunkIndex) ||
    checkpoint.nextChunkIndex !== status.nextChunkIndex ||
    checkpoint.complete !== status.complete ||
    !Array.isArray(checkpoint.capturedChunkIds) ||
    checkpoint.capturedChunkIds.length !== status.capturedChunkCount ||
    checkpoint.capturedChunkIds.length !== checkpoint.nextChunkIndex ||
    !Array.isArray(checkpoint.acceptedVisualReviews) ||
    checkpoint.acceptedVisualReviews.length !== checkpoint.capturedChunkIds.length ||
    checkpoint.pendingCapture !== undefined
  ) {
    fail("checkpoint_invalid", "Checkpoint differs from the canonical matrix status binding.");
  }
}

function validateRuntimeBuildEvidence({ status, checkpoint }) {
  const binding = status.runtimeBuildBinding;
  const bindingErrors = validateMatrixRuntimeBuildBinding(binding);
  if (bindingErrors.length > 0) {
    fail(
      "runtime_build_binding_invalid",
      `Runtime-build binding is invalid: ${bindingErrors.join(", ")}.`,
    );
  }
  if (!sameJson(checkpoint.runtimeBuildBinding, binding)) {
    fail(
      "runtime_build_checkpoint_binding_mismatch",
      "Checkpoint runtime-build binding differs from canonical matrix status.",
    );
  }
  const profilePath = requireAbsoluteFile(
    binding.profile.path,
    "runtime_build_profile_path_invalid",
    "runtime_build_profile_missing",
  );
  const descriptor = fs.statSync(profilePath);
  if (descriptor.size < 2 || descriptor.size > MATRIX_RUNTIME_BUILD_PROFILE_MAX_BYTES) {
    fail(
      "runtime_build_profile_budget_exceeded",
      "Runtime-build profile exceeds its bounded JSON budget.",
    );
  }
  assertFileSha256(
    profilePath,
    binding.profile.sha256,
    "runtime_build_profile_sha256_mismatch",
  );
  const profile = readJsonBounded(
    profilePath,
    MATRIX_RUNTIME_BUILD_PROFILE_MAX_BYTES,
    "runtime_build_profile_invalid",
  );
  let rebuilt;
  try {
    rebuilt = buildMatrixRuntimeBuildBinding({
      profile,
      profilePath,
      profileSha256: binding.profile.sha256,
    });
  } catch (error) {
    fail(
      "runtime_build_profile_invalid",
      `Runtime-build profile cannot be normalized: ${String(error?.message ?? error)}`,
    );
  }
  if (!sameJson(rebuilt, binding)) {
    fail(
      "runtime_build_profile_binding_mismatch",
      "Runtime-build profile no longer rebuilds the matrix binding.",
    );
  }
  return Object.freeze({ binding });
}

function validateAcceptedReviews({
  checkpoint,
  matrixDirectory,
  status,
  catalogEntries,
  catalogRows,
  runtimeBuildBinding,
}) {
  const chunksDirectory = path.join(matrixDirectory, "chunks");
  const capturesDirectory = path.join(matrixDirectory, "captures");
  const seenChunkIds = new Set();
  const seenSubjects = new Set();
  const acceptedSubjects = [];
  let evidenceReferenceCount = 0;

  for (let index = 0; index < checkpoint.acceptedVisualReviews.length; index += 1) {
    const accepted = checkpoint.acceptedVisualReviews[index];
    const expectedChunkId = checkpoint.capturedChunkIds[index];
    if (
      !isRecord(accepted) ||
      typeof accepted.chunkId !== "string" ||
      !CHUNK_ID_PATTERN.test(accepted.chunkId) ||
      accepted.chunkId !== expectedChunkId ||
      seenChunkIds.has(accepted.chunkId) ||
      typeof accepted.attemptId !== "string" ||
      !ATTEMPT_ID_PATTERN.test(accepted.attemptId) ||
      !isRecord(accepted.artifactSha256)
    ) {
      fail("accepted_review_invalid", "Checkpoint accepted-review membership is invalid.");
    }
    if (!sameJson(accepted.runtimeBuildBinding, runtimeBuildBinding)) {
      fail(
        "runtime_build_accepted_review_binding_mismatch",
        `Accepted review ${accepted.chunkId} has a different runtime-build binding.`,
      );
    }
    seenChunkIds.add(accepted.chunkId);

    const chunkPath = resolveInside(
      chunksDirectory,
      `${accepted.chunkId}.json`,
      "chunk_path_escape",
      "chunk_missing",
    );
    const chunk = readJsonBounded(chunkPath, 8 * 1024 * 1024, "chunk_invalid");
    const catalogEntry = catalogEntries.get(chunk?.tilesetResRef);
    if (
      !isRecord(chunk) ||
      chunk.schema !== "aurora-tile-add-connect-matrix-chunk/v1" ||
      chunk.id !== accepted.chunkId ||
      (chunk.kind !== "tile" && chunk.kind !== "group") ||
      !catalogEntry ||
      chunk.sourceKey !== catalogEntry.sourceKey ||
      chunk.etag !== catalogEntry.sourceSha256 ||
      !SHA256_PATTERN.test(String(chunk.definitionFingerprint ?? "")) ||
      !SHA256_PATTERN.test(String(chunk.runtimeDefinitionFingerprint ?? "")) ||
      !Array.isArray(chunk.cases) ||
      chunk.caseCount !== chunk.cases.length
    ) {
      fail("chunk_contract_mismatch", `Accepted chunk ${accepted.chunkId} is invalid.`);
    }

    const reviewPath = resolveAcceptedReviewPath(
      capturesDirectory,
      accepted.visualReviewPath,
    );
    const reviewSha256 = requireSha256(
      accepted.visualReviewSha256,
      "visual_review_sha256_invalid",
    );
    assertFileSha256(
      reviewPath,
      reviewSha256,
      "visual_review_sha256_mismatch",
    );
    const review = readJsonBounded(
      reviewPath,
      4 * 1024 * 1024,
      "visual_review_invalid",
    );
    validateReview({
      accepted,
      review,
      chunk,
      status,
      runtimeBuildBinding,
    });
    validateReviewArtifacts({
      accepted,
      review,
      capturesDirectory,
      runtimeBuildBinding,
    });

    const chunkSubjects = extractChunkSubjects(chunk);
    for (const subject of chunkSubjects) {
      evidenceReferenceCount += 1;
      const catalogRow = catalogRows.get(subject);
      if (!catalogRow) {
        fail("accepted_subject_not_in_catalog", `Accepted subject ${subject} is absent from the catalog.`);
      }
      if (catalogRow.modelSourceStatus !== "source_resolved") {
        fail("accepted_subject_not_source_resolved", `Accepted subject ${subject} is not source-resolved.`);
      }
      if (seenSubjects.has(subject)) continue;
      seenSubjects.add(subject);
      acceptedSubjects.push(subject);
    }
  }
  acceptedSubjects.sort((left, right) => left.localeCompare(right));
  return Object.freeze({
    subjects: Object.freeze(acceptedSubjects),
    evidenceReferenceCount,
  });
}

function validateReview({
  accepted,
  review,
  chunk,
  status,
  runtimeBuildBinding,
}) {
  if (
    !isRecord(review) ||
    review.schema !== "aurora-tile-add-connect-matrix-visual-review/v1" ||
    review.verdict !== "verified" ||
    typeof review.reviewerIdentity !== "string" ||
    review.reviewerIdentity.trim().length < 1 ||
    review.reviewerIdentity !== accepted.reviewerIdentity ||
    typeof review.reviewedAt !== "string" ||
    !Number.isFinite(Date.parse(review.reviewedAt)) ||
    review.reviewedAt !== accepted.reviewedAt ||
    review.auroraToolsetProveContractVersion !== "1.0.15" ||
    !isRecord(review.planBinding) ||
    review.planBinding.planId !== status.matrixPlanId ||
    review.planBinding.manifestSchema !== status.manifestSchema ||
    review.planBinding.contractRevision !== status.contractRevision ||
    review.planBinding.contractFingerprint !== status.contractFingerprint ||
    !sameJson(review.planBinding.runtimeBuildBinding, runtimeBuildBinding) ||
    !sameJson(review.runtimeBuildBinding, runtimeBuildBinding) ||
    !isRecord(review.chunk) ||
    review.chunk.id !== chunk.id ||
    review.chunk.definitionFingerprint !== chunk.definitionFingerprint ||
    review.chunk.runtimeDefinitionFingerprint !== chunk.runtimeDefinitionFingerprint ||
    !isRecord(review.pendingCapture) ||
    review.pendingCapture.attemptId !== accepted.attemptId ||
    !isRecord(review.pendingCapture.artifacts) ||
    !isRecord(review.checks) ||
    REQUIRED_VISUAL_CHECKS.some((check) => review.checks[check] !== true) ||
    !isRecord(review.pathConnect) ||
    review.pathConnect.accepted !== false ||
    review.pathConnect.status !== "missing"
  ) {
    fail("visual_review_contract_mismatch", `Visual review for ${chunk.id} is not admissible Add/Render proof.`);
  }
}

function validateReviewArtifacts({
  accepted,
  review,
  capturesDirectory,
  runtimeBuildBinding,
}) {
  for (const [kind, suffix] of Object.entries(REQUIRED_ARTIFACT_SUFFIXES)) {
    const expected = requireSha256(
      accepted.artifactSha256[kind],
      `accepted_${kind}_sha256_invalid`,
    );
    if (review.pendingCapture.artifacts[kind] !== expected) {
      fail("visual_review_artifact_binding_mismatch", `Visual review ${kind} hash differs from the checkpoint.`);
    }
    const artifactPath = resolveInside(
      capturesDirectory,
      `${accepted.attemptId}${suffix}`,
      "capture_artifact_path_escape",
      "capture_artifact_missing",
    );
    assertFileSha256(
      artifactPath,
      expected,
      `capture_${kind}_sha256_mismatch`,
    );
  }
  if (
    Object.keys(accepted.artifactSha256).sort().join(",") !==
      Object.keys(REQUIRED_ARTIFACT_SUFFIXES).sort().join(",") ||
    Object.keys(review.pendingCapture.artifacts).sort().join(",") !==
      Object.keys(REQUIRED_ARTIFACT_SUFFIXES).sort().join(",")
  ) {
    fail("capture_artifact_keys_invalid", "Capture artifact binding must contain exactly five required kinds.");
  }
  const framePath = resolveInside(
    capturesDirectory,
    `${accepted.attemptId}${REQUIRED_ARTIFACT_SUFFIXES.frame}`,
    "capture_frame_path_escape",
    "capture_frame_missing",
  );
  const frame = readJsonBounded(
    framePath,
    8 * 1024 * 1024,
    "capture_frame_invalid",
  );
  if (
    !isRecord(frame) ||
    frame.status !== "captured" ||
    !isRecord(frame.runtimeBuildProof) ||
    frame.runtimeBuildProof.status !== "verified" ||
    !sameJson(frame.runtimeBuildProof.binding, runtimeBuildBinding)
  ) {
    fail(
      "runtime_build_frame_binding_mismatch",
      `Capture frame ${accepted.attemptId} lacks the exact verified runtime-build binding.`,
    );
  }
  const observationErrors = validateMatrixRuntimeBuildObservations(
    runtimeBuildBinding,
    frame.runtimeBuildProof.observations,
  );
  const preflightObservationErrors = validateMatrixRuntimeBuildObservations(
    runtimeBuildBinding,
    frame.runtimeBuildProof.preflightObservations,
  );
  const backendRestarted =
    frame.runtimeBuildProof.preflightObservations?.backendDirect
      ?.processStartedAt !==
      frame.runtimeBuildProof.observations?.backendDirect?.processStartedAt ||
    frame.runtimeBuildProof.preflightObservations?.backendProxy
      ?.processStartedAt !==
      frame.runtimeBuildProof.observations?.backendProxy?.processStartedAt;
  if (
    observationErrors.length > 0 ||
    preflightObservationErrors.length > 0 ||
    backendRestarted
  ) {
    fail(
      "runtime_build_frame_observation_mismatch",
      `Capture frame ${accepted.attemptId} runtime-build observations are invalid or changed during capture.`,
    );
  }
  const sourceIdentity = frame.runtimeBuildProof.sourceIdentity;
  const preflightSourceErrors = validateTileAddConnectRuntimeSourceIdentity(
    runtimeBuildBinding,
    sourceIdentity?.preflight,
  );
  const postCaptureSourceErrors = validateTileAddConnectRuntimeSourceIdentity(
    runtimeBuildBinding,
    sourceIdentity?.postCapture,
  );
  if (
    preflightSourceErrors.length > 0 ||
    postCaptureSourceErrors.length > 0 ||
    !sameJson(sourceIdentity?.preflight, sourceIdentity?.postCapture)
  ) {
    fail(
      "runtime_source_identity_mismatch",
      `Capture frame ${accepted.attemptId} does not bind one unchanged runtime source identity.`,
    );
  }
}

function extractChunkSubjects(chunk) {
  const subjects = [];
  const seen = new Set();
  for (const fixture of chunk.cases) {
    const members = chunk.kind === "tile"
      ? [{ rowId: fixture?.rowId, tileId: fixture?.cells?.find((cell) => cell?.role === "source")?.tileId }]
      : fixture?.memberCells;
    if (!Array.isArray(members) || members.length < 1) {
      fail("chunk_fixture_invalid", `Chunk ${chunk.id} contains an empty fixture.`);
    }
    for (const member of members) {
      const match = TILE_SUBJECT_PATTERN.exec(String(member?.rowId ?? ""));
      if (
        !match ||
        match[1] !== chunk.tilesetResRef ||
        Number(match[2]) !== member?.tileId ||
        seen.has(member.rowId)
      ) {
        fail("chunk_member_invalid", `Chunk ${chunk.id} contains an invalid or duplicate member row.`);
      }
      seen.add(member.rowId);
      subjects.push(member.rowId);
    }
  }
  if (chunk.kind === "group" && chunk.memberTileCount !== subjects.length) {
    fail("chunk_member_count_mismatch", `Group chunk ${chunk.id} member count differs from its fixtures.`);
  }
  return subjects;
}

function resolveAcceptedReviewPath(capturesDirectory, value) {
  if (typeof value !== "string" || value.trim().length < 1 || value.includes("\0")) {
    fail("visual_review_path_invalid", "Visual review path is invalid.");
  }
  const candidate = path.resolve(value);
  if (!isPathInside(capturesDirectory, candidate)) {
    fail("visual_review_path_escape", "Visual review path escapes the matrix capture directory.");
  }
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    fail("visual_review_missing", "Visual review file is missing.");
  }
  return candidate;
}

export function writeCompactJsonAtomic(
  outputPath,
  value,
  maxBytes = AREA_TILE_CERTIFICATION_REPORT_MAX_BYTES,
) {
  if (typeof outputPath !== "string" || outputPath.trim().length < 1 || outputPath.includes("\0")) {
    fail("output_path_invalid", "Publication output path is invalid.");
  }
  if (!Number.isInteger(maxBytes) || maxBytes < 2) {
    fail("output_budget_invalid", "Publication output budget is invalid.");
  }
  const bytes = Buffer.from(JSON.stringify(value), "utf8");
  if (bytes.byteLength < 2 || bytes.byteLength > maxBytes) {
    fail("output_budget_exceeded", `Publication output requires ${bytes.byteLength} bytes.`);
  }
  const resolved = path.resolve(outputPath);
  const directory = path.dirname(resolved);
  fs.mkdirSync(directory, { recursive: true });
  const temporaryPath = path.join(
    directory,
    `.${path.basename(resolved)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  let descriptor = null;
  try {
    descriptor = fs.openSync(temporaryPath, "wx");
    fs.writeFileSync(descriptor, bytes);
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = null;
    fs.renameSync(temporaryPath, resolved);
    const published = fs.readFileSync(resolved);
    if (!published.equals(bytes)) {
      fail("output_readback_mismatch", "Published report differs from its compact source bytes.");
    }
    return Object.freeze({
      path: resolved,
      bytes: bytes.byteLength,
      sha256: sha256(published),
    });
  } finally {
    if (descriptor !== null) fs.closeSync(descriptor);
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  }
}

function resolveRepoRelativeFile(repoRoot, value, escapeCode, missingCode) {
  if (typeof value !== "string" || value.trim().length < 1 || value.includes("\0") || path.isAbsolute(value)) {
    fail(escapeCode, "Repository-relative evidence path is invalid.");
  }
  return requireFileInside(repoRoot, path.resolve(repoRoot, value), escapeCode, missingCode);
}

function requireAbsoluteFile(value, invalidCode, missingCode) {
  if (
    typeof value !== "string" ||
    value.trim().length < 1 ||
    value.includes("\0") ||
    !path.isAbsolute(value)
  ) {
    fail(invalidCode, "Expected an absolute evidence-file path.");
  }
  const candidate = path.resolve(value);
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    fail(missingCode, `Evidence file is missing: ${candidate}`);
  }
  return candidate;
}

function resolveInside(root, value, escapeCode, missingCode) {
  if (typeof value !== "string" || value.trim().length < 1 || value.includes("\0") || path.isAbsolute(value)) {
    fail(escapeCode, "Evidence path is not a safe relative path.");
  }
  return requireFileInside(root, path.resolve(root, value), escapeCode, missingCode);
}

function requireFileInside(root, value, escapeCode, missingCode) {
  const candidate = path.resolve(String(value ?? ""));
  if (!isPathInside(root, candidate)) fail(escapeCode, "Evidence path escapes its allowed root.");
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    fail(missingCode, `Evidence file is missing: ${candidate}`);
  }
  return candidate;
}

function requireDirectory(value, code) {
  const candidate = path.resolve(String(value ?? ""));
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) {
    fail(code, `Required directory is missing: ${candidate}`);
  }
  return candidate;
}

function isPathInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function readJsonBounded(filePath, maxBytes, code) {
  const descriptor = fs.statSync(filePath);
  if (!descriptor.isFile() || descriptor.size < 2 || descriptor.size > maxBytes) {
    fail(code, `JSON evidence file has an invalid size: ${filePath}`);
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    fail(code, `JSON evidence file is malformed: ${filePath}`);
  }
}

function assertFileSha256(filePath, expected, code) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    fail(code, `Hash-bound evidence file is missing: ${filePath}`);
  }
  const actual = sha256(fs.readFileSync(filePath));
  if (actual !== expected) {
    fail(code, `Evidence SHA-256 mismatch for ${filePath}: expected ${expected}, observed ${actual}.`);
  }
}

function requireSha256(value, code) {
  if (typeof value !== "string" || !SHA256_PATTERN.test(value)) {
    fail(code, "Expected an exact lowercase SHA-256.");
  }
  return value;
}

function positiveInteger(value, code, fallback, maximum) {
  const candidate = value === undefined ? fallback : value;
  if (!Number.isInteger(candidate) || candidate < 1 || candidate > maximum) {
    fail(code, "Expected a bounded positive integer.");
  }
  return candidate;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalJson(value[key])]),
  );
}

function sameJson(left, right) {
  return JSON.stringify(canonicalJson(left)) === JSON.stringify(canonicalJson(right));
}

function deepFreeze(value) {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}
