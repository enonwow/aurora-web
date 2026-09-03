import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PROFILE_SCHEMA = "aurora-area-tile-placeholder-evidence-profile/v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const RESREF = /^[a-z0-9_]{1,16}$/u;
const PROFILE_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const EVIDENCE_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const EVIDENCE_KINDS = new Set(["toolset_native", "aurora_decompilation"]);
const EVIDENCE_ARTIFACT_SCHEMA_V1 = "aurora-area-tile-placeholder-evidence/v1";
const EVIDENCE_ARTIFACT_SCHEMA_V2 = "aurora-area-tile-placeholder-evidence/v2";
const REVIEW_ARTIFACT_SCHEMA = "aurora-area-tile-placeholder-evidence-profile-review/v1";
const DECOMPILATION_SEMANTIC_REVIEW_SCHEMA =
  "aurora-area-tile-placeholder-decompilation-semantic-review/v1";
const LINEAGE_PACKET_SCHEMA = "aurora-decompilation-lineage/v2";
const LINEAGE_VALIDATION_SCHEMA = "aurora-decompilation-lineage-validation/v2";
const FUNCTION_ADDRESS = /^0x[a-f0-9]{8,16}$/u;

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort((left, right) => left.localeCompare(right, "en"))
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function areaTilePlaceholderEvidenceProfileSubjectSha256(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("Placeholder evidence profile review subject must be an object.");
  }
  const { review: _review, ...subject } = profile;
  return sha256Bytes(Buffer.from(canonicalJson(subject), "utf8"));
}

export function areaTilePlaceholderDecompilationAuthoritySubjectSha256({
  evidenceId,
  certifiedRowIds,
  authority
}) {
  if (!authority || typeof authority !== "object" || Array.isArray(authority)) {
    throw new Error("Decompilation placeholder authority review subject must be an object.");
  }
  const { semanticReview: _semanticReview, ...authoritySubject } = authority;
  return sha256Bytes(Buffer.from(canonicalJson({
    evidenceId,
    certifiedRowIds,
    authority: authoritySubject
  }), "utf8"));
}

function normalizeToken(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function canonicalIsoTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) || date.toISOString() !== value ? null : value;
}

function parseJsonObject(bytes, label) {
  let parsed;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed;
}

function isInside(parentDirectory, candidatePath) {
  const relative = path.relative(path.resolve(parentDirectory), path.resolve(candidatePath));
  return relative.length > 0 &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
}

function requireNonNegativeInteger(value, label) {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0) {
    throw new Error(`${label} must be a non-negative integer.`);
  }
  return numeric;
}

function resolveBoundEvidenceFile(evidenceRoot, relativePath, expectedSha256, label) {
  const normalizedExpectedSha256 = normalizeToken(expectedSha256);
  if (typeof relativePath !== "string" || !relativePath.trim() || path.isAbsolute(relativePath)) {
    throw new Error(`${label} has an invalid path.`);
  }
  if (!SHA256.test(normalizedExpectedSha256)) {
    throw new Error(`${label} has an invalid SHA-256.`);
  }
  const candidatePath = path.resolve(evidenceRoot, relativePath.trim());
  if (!isInside(evidenceRoot, candidatePath)) {
    throw new Error(`${label} escapes the evidence root.`);
  }
  if (!fs.existsSync(candidatePath) || !fs.statSync(candidatePath).isFile()) {
    throw new Error(`${label} is missing: ${candidatePath}.`);
  }
  const realEvidenceRoot = fs.realpathSync(evidenceRoot);
  const realCandidatePath = fs.realpathSync(candidatePath);
  if (!isInside(realEvidenceRoot, realCandidatePath)) {
    throw new Error(`${label} resolves outside the evidence root.`);
  }
  const bytes = fs.readFileSync(realCandidatePath);
  const observedSha256 = sha256Bytes(bytes);
  if (observedSha256 !== normalizedExpectedSha256) {
    throw new Error(
      `${label} SHA-256 mismatch: expected ${normalizedExpectedSha256}, observed ${observedSha256}.`
    );
  }
  return { path: realCandidatePath, sha256: observedSha256, bytes };
}

function resolveEvidenceDirectory(evidenceRoot, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath.trim() || path.isAbsolute(relativePath)) {
    throw new Error(`${label} has an invalid path.`);
  }
  const candidatePath = path.resolve(evidenceRoot, relativePath.trim());
  if (!isInside(evidenceRoot, candidatePath)) {
    throw new Error(`${label} escapes the evidence root.`);
  }
  if (!fs.existsSync(candidatePath) || !fs.statSync(candidatePath).isDirectory()) {
    throw new Error(`${label} is missing: ${candidatePath}.`);
  }
  const realEvidenceRoot = fs.realpathSync(evidenceRoot);
  const realCandidatePath = fs.realpathSync(candidatePath);
  if (!isInside(realEvidenceRoot, realCandidatePath)) {
    throw new Error(`${label} resolves outside the evidence root.`);
  }
  return realCandidatePath;
}

function parseJsonLines(bytes, label) {
  const records = [];
  for (const [index, line] of bytes.toString("utf8").split(/\r?\n/u).entries()) {
    if (!line.trim()) continue;
    records.push(parseJsonObject(Buffer.from(line, "utf8"), `${label} line ${index + 1}`));
  }
  if (records.length === 0) {
    throw new Error(`${label} must contain at least one record.`);
  }
  return records;
}

function validateNativeAuthority(evidenceRoot, evidenceId, authority) {
  if (
    !SHA256.test(normalizeToken(authority?.binarySha256)) ||
    typeof authority?.proofContractVersion !== "string" ||
    !authority.proofContractVersion.trim() ||
    authority?.settledState?.status !== "verified" ||
    authority?.settledState?.unexpectedFailedTileCount !== 0 ||
    authority?.settledState?.bridgeTileCount !== 0 ||
    !Array.isArray(authority?.artifactBindings) ||
    authority.artifactBindings.length === 0
  ) {
    throw new Error(`Native placeholder evidence ${evidenceId} lacks settled proof authority.`);
  }
  const artifactBindings = authority.artifactBindings.map((binding, index) => {
    const resolved = resolveBoundEvidenceFile(
      evidenceRoot,
      binding?.artifactPath,
      binding?.artifactSha256,
      `Native placeholder evidence ${evidenceId} artifact binding ${index}`
    );
    return Object.freeze({
      artifactPath: resolved.path,
      artifactSha256: resolved.sha256
    });
  });
  return Object.freeze({
    binarySha256: normalizeToken(authority.binarySha256),
    proofContractVersion: authority.proofContractVersion.trim(),
    settledState: Object.freeze({
      status: "verified",
      unexpectedFailedTileCount: 0,
      bridgeTileCount: 0
    }),
    artifactBindings: Object.freeze(artifactBindings)
  });
}

export function validateAreaTilePlaceholderDecompilationAuthoritySubject({
  evidenceRoot,
  evidenceId,
  authority,
  certifiedRowIds
}) {
  const resolvedEvidenceRoot = path.resolve(String(evidenceRoot ?? ""));
  if (!fs.existsSync(resolvedEvidenceRoot) || !fs.statSync(resolvedEvidenceRoot).isDirectory()) {
    throw new Error(`Placeholder evidence root is missing: ${resolvedEvidenceRoot}.`);
  }
  return validateDecompilationAuthority(
    resolvedEvidenceRoot,
    normalizeToken(evidenceId),
    authority,
    Array.isArray(certifiedRowIds) ? certifiedRowIds.map(normalizeToken) : [],
    false
  );
}

function validateDecompilationAuthority(
  evidenceRoot,
  evidenceId,
  authority,
  certifiedRowIds,
  requireSemanticReview = true
) {
  const binarySha256 = normalizeToken(authority?.binarySha256);
  const functionBindings = Array.isArray(authority?.functionBindings)
    ? authority.functionBindings
    : [];
  if (
    !SHA256.test(binarySha256) ||
    functionBindings.length === 0 ||
    new Set(functionBindings.map((binding) => normalizeToken(binding?.address))).size !==
      functionBindings.length ||
    functionBindings.some((binding) =>
      !FUNCTION_ADDRESS.test(normalizeToken(binding?.address)) ||
      !SHA256.test(normalizeToken(binding?.outputSha256)) ||
      !Number.isInteger(binding?.lineStart) ||
      !Number.isInteger(binding?.lineEnd) ||
      binding.lineStart < 1 ||
      binding.lineEnd < binding.lineStart ||
      binding.lineEnd - binding.lineStart + 1 > 64 ||
      typeof binding?.finding !== "string" ||
      !binding.finding.trim()
    )
  ) {
    throw new Error(`Decompilation placeholder evidence ${evidenceId} lacks exact function authority.`);
  }
  const packetRoot = resolveEvidenceDirectory(
    evidenceRoot,
    authority?.lineagePacketRootPath,
    `Decompilation placeholder evidence ${evidenceId} packet root`
  );
  const packetFile = resolveBoundEvidenceFile(
    evidenceRoot,
    authority?.lineagePacketPath,
    authority?.lineagePacketSha256,
    `Decompilation placeholder evidence ${evidenceId} lineage packet`
  );
  const validationFile = resolveBoundEvidenceFile(
    evidenceRoot,
    authority?.lineageValidationPath,
    authority?.lineageValidationSha256,
    `Decompilation placeholder evidence ${evidenceId} lineage validation`
  );
  const packet = parseJsonObject(packetFile.bytes, `Lineage packet for ${evidenceId}`);
  const validation = parseJsonObject(
    validationFile.bytes,
    `Lineage validation for ${evidenceId}`
  );
  if (!isInside(packetRoot, packetFile.path) || !isInside(packetRoot, validationFile.path)) {
    throw new Error(`Decompilation placeholder evidence ${evidenceId} lineage files escape the packet root.`);
  }
  const packetDigest = normalizeToken(packet.portableRecordDigestSha256);
  const validationProducerDigest = normalizeToken(
    validation.producerPortableRecordDigestSha256
  );
  const validationRecomputedDigest = normalizeToken(
    validation.recomputedProducerPortableRecordDigestSha256
  );
  const portablePacketPath = path.relative(packetRoot, packetFile.path).replaceAll("\\", "/");
  if (
    packet.schemaVersion !== LINEAGE_PACKET_SCHEMA ||
    packet.packetType !== "producer" ||
    normalizeToken(packet.inputBinary?.file?.sha256) !== binarySha256 ||
    packet.authoritativeDecompilationClaim !== false ||
    !SHA256.test(packetDigest) ||
    validation.schemaVersion !== LINEAGE_VALIDATION_SCHEMA ||
    validation.packetType !== "validator-result" ||
    validation.lineageComplete !== true ||
    validation.authoritativeDecompilationClaim !== true ||
    !Array.isArray(validation.diagnostics) ||
    validation.diagnostics.length !== 0 ||
    validation.inputPacket !== portablePacketPath ||
    validationProducerDigest !== packetDigest ||
    validationRecomputedDigest !== packetDigest
  ) {
    throw new Error(`Decompilation placeholder evidence ${evidenceId} is not authoritative lineage v2.`);
  }
  const functionInventory = packet.generation?.functionRecords?.file;
  const functionRecordsFile = resolveBoundEvidenceFile(
    packetRoot,
    functionInventory?.portablePath,
    functionInventory?.sha256,
    `Decompilation placeholder evidence ${evidenceId} function records`
  );
  const successfulFunctionRecords = new Map(
    parseJsonLines(functionRecordsFile.bytes, `Function records for ${evidenceId}`)
      .filter((record) => record.decompileStatus === "success")
      .map((record) => [normalizeToken(record.address), record])
      .filter(([address]) => FUNCTION_ADDRESS.test(address))
  );
  const exportDirectory = resolveEvidenceDirectory(
    packetRoot,
    packet.export?.directoryPortablePath,
    `Decompilation placeholder evidence ${evidenceId} export directory`
  );
  const normalizedFunctionBindings = functionBindings.map((binding) => {
    const address = normalizeToken(binding.address);
    const outputSha256 = normalizeToken(binding.outputSha256);
    const record = successfulFunctionRecords.get(address);
    if (!record) {
      throw new Error(
        `Decompilation placeholder evidence ${evidenceId} function binding lacks a successful lineage record.`
      );
    }
    if (normalizeToken(record.outputSha256) !== outputSha256) {
      throw new Error(
        `Decompilation placeholder evidence ${evidenceId} function output SHA-256 does not match lineage.`
      );
    }
    const outputFile = resolveBoundEvidenceFile(
      exportDirectory,
      record.outputPath,
      outputSha256,
      `Decompilation placeholder evidence ${evidenceId} cited function output ${address}`
    );
    const outputLines = outputFile.bytes.toString("utf8").split(/\r?\n/u);
    if (binding.lineEnd > outputLines.length) {
      throw new Error(
        `Decompilation placeholder evidence ${evidenceId} function citation exceeds the output line count.`
      );
    }
    if (outputLines.slice(binding.lineStart - 1, binding.lineEnd).every((line) => !line.trim())) {
      throw new Error(
        `Decompilation placeholder evidence ${evidenceId} function citation is empty.`
      );
    }
    return Object.freeze({
      address,
      outputSha256,
      lineStart: binding.lineStart,
      lineEnd: binding.lineEnd,
      finding: binding.finding.trim()
    });
  });
  const authoritySubject = {
    binarySha256,
    lineagePacketRootPath: authority.lineagePacketRootPath,
    lineagePacketPath: authority.lineagePacketPath,
    lineagePacketSha256: normalizeToken(authority.lineagePacketSha256),
    lineageValidationPath: authority.lineageValidationPath,
    lineageValidationSha256: normalizeToken(authority.lineageValidationSha256),
    functionBindings: normalizedFunctionBindings
  };
  const validatedAuthority = {
    binarySha256,
    lineagePacketRootPath: packetRoot,
    lineagePacketPath: packetFile.path,
    lineagePacketSha256: packetFile.sha256,
    lineageValidationPath: validationFile.path,
    lineageValidationSha256: validationFile.sha256,
    functionBindings: Object.freeze(normalizedFunctionBindings)
  };
  if (!requireSemanticReview) return Object.freeze(validatedAuthority);
  const semanticReviewFile = resolveBoundEvidenceFile(
    evidenceRoot,
    authority?.semanticReview?.artifactPath,
    authority?.semanticReview?.artifactSha256,
    `Decompilation placeholder evidence ${evidenceId} semantic review`
  );
  const semanticReview = parseJsonObject(
    semanticReviewFile.bytes,
    `Decompilation placeholder evidence ${evidenceId} semantic review`
  );
  const reviewedRowIds = Array.isArray(semanticReview.certifiedRowIds)
    ? semanticReview.certifiedRowIds.map(normalizeToken)
    : [];
  if (
    semanticReview.schema !== DECOMPILATION_SEMANTIC_REVIEW_SCHEMA ||
    normalizeToken(semanticReview.evidenceId) !== evidenceId ||
    normalizeToken(semanticReview.authoritySubjectSha256) !==
      areaTilePlaceholderDecompilationAuthoritySubjectSha256({
        evidenceId,
        certifiedRowIds,
        authority: authoritySubject
      }) ||
    JSON.stringify(reviewedRowIds) !== JSON.stringify(certifiedRowIds) ||
    semanticReview.status !== "verified" ||
    typeof semanticReview.reviewer !== "string" ||
    !semanticReview.reviewer.trim() ||
    !canonicalIsoTimestamp(semanticReview.reviewedAt) ||
    semanticReview.independentReview !== true ||
    typeof semanticReview.notes !== "string" ||
    !semanticReview.notes.trim()
  ) {
    throw new Error(`Decompilation placeholder evidence ${evidenceId} semantic review is invalid.`);
  }
  return Object.freeze({
    ...validatedAuthority,
    semanticReview: Object.freeze({
      artifactPath: semanticReviewFile.path,
      artifactSha256: semanticReviewFile.sha256,
      reviewer: semanticReview.reviewer.trim(),
      reviewedAt: semanticReview.reviewedAt,
      independentReview: true,
      notes: semanticReview.notes.trim()
    })
  });
}

function resolveEvidenceArtifact(evidenceRoot, rawEvidence) {
  const evidenceId = normalizeToken(rawEvidence?.evidenceId);
  const kind = normalizeToken(rawEvidence?.kind);
  const artifactRelativePath = typeof rawEvidence?.artifactPath === "string"
    ? rawEvidence.artifactPath.trim()
    : "";
  const artifactSha256 = normalizeToken(rawEvidence?.artifactSha256);
  if (!EVIDENCE_ID.test(evidenceId)) {
    throw new Error(`Placeholder profile contains invalid evidence id ${evidenceId || "<missing>"}.`);
  }
  if (!EVIDENCE_KINDS.has(kind)) {
    throw new Error(`Placeholder profile evidence ${evidenceId} has unsupported authority ${kind || "<missing>"}.`);
  }
  if (!artifactRelativePath || path.isAbsolute(artifactRelativePath)) {
    throw new Error(`Placeholder profile evidence ${evidenceId} has an invalid artifact path.`);
  }
  if (!SHA256.test(artifactSha256)) {
    throw new Error(`Placeholder profile evidence ${evidenceId} has an invalid artifact SHA-256.`);
  }
  const resolvedArtifact = resolveBoundEvidenceFile(
    evidenceRoot,
    artifactRelativePath,
    artifactSha256,
    `Placeholder profile evidence artifact ${evidenceId}`
  );
  const artifact = parseJsonObject(
    resolvedArtifact.bytes,
    `Placeholder profile evidence artifact ${evidenceId}`
  );
  const certifiedRowIds = Array.isArray(artifact.certifiedRowIds)
    ? artifact.certifiedRowIds.map(normalizeToken)
    : [];
  if (
    artifact.schema !== (kind === "aurora_decompilation"
      ? EVIDENCE_ARTIFACT_SCHEMA_V2
      : EVIDENCE_ARTIFACT_SCHEMA_V1) ||
    normalizeToken(artifact.evidenceId) !== evidenceId ||
    normalizeToken(artifact.kind) !== kind ||
    artifact.verdict !== "verified" ||
    certifiedRowIds.length === 0 ||
    new Set(certifiedRowIds).size !== certifiedRowIds.length
  ) {
    throw new Error(`Placeholder profile evidence ${evidenceId} has unsupported evidence artifact schema.`);
  }
  const authority = kind === "toolset_native"
    ? validateNativeAuthority(evidenceRoot, evidenceId, artifact.authority)
    : validateDecompilationAuthority(
      evidenceRoot,
      evidenceId,
      artifact.authority,
      certifiedRowIds
    );
  return Object.freeze({
    evidenceId,
    kind,
    artifactPath: resolvedArtifact.path,
    artifactSha256: resolvedArtifact.sha256,
    certifiedRowIds: Object.freeze(certifiedRowIds),
    authority
  });
}

export function validateAreaTilePlaceholderEvidenceArtifact({ evidenceRoot, evidence }) {
  const resolvedEvidenceRoot = path.resolve(String(evidenceRoot ?? ""));
  if (!fs.existsSync(resolvedEvidenceRoot) || !fs.statSync(resolvedEvidenceRoot).isDirectory()) {
    throw new Error(`Placeholder evidence root is missing: ${resolvedEvidenceRoot}.`);
  }
  return resolveEvidenceArtifact(resolvedEvidenceRoot, evidence);
}

function validateReviewArtifact(evidenceRoot, rawProfile, profileId) {
  const reviewFile = resolveBoundEvidenceFile(
    evidenceRoot,
    rawProfile.review?.artifactPath,
    rawProfile.review?.artifactSha256,
    `Placeholder evidence profile ${profileId} independent review`
  );
  const review = parseJsonObject(
    reviewFile.bytes,
    `Placeholder evidence profile ${profileId} independent review`
  );
  if (
    review.schema !== REVIEW_ARTIFACT_SCHEMA ||
    normalizeToken(review.profileId) !== profileId ||
    normalizeToken(review.subjectSha256) !==
      areaTilePlaceholderEvidenceProfileSubjectSha256(rawProfile) ||
    review.status !== "verified" ||
    typeof review.reviewer !== "string" ||
    !review.reviewer.trim() ||
    !canonicalIsoTimestamp(review.reviewedAt) ||
    review.independentReview !== true ||
    typeof review.notes !== "string" ||
    !review.notes.trim()
  ) {
    throw new Error(`Placeholder evidence profile ${profileId} independent review is invalid.`);
  }
  return Object.freeze({
    artifactPath: reviewFile.path,
    artifactSha256: reviewFile.sha256,
    reviewer: review.reviewer.trim(),
    reviewedAt: review.reviewedAt,
    independentReview: true,
    notes: review.notes.trim()
  });
}

function validateRow(rawRow, evidenceIds, seenRowIds) {
  const tilesetResRef = normalizeToken(rawRow?.tilesetResRef);
  const tileId = requireNonNegativeInteger(
    rawRow?.tileId,
    `Placeholder profile ${tilesetResRef || "<missing>"} tileId`
  );
  const setSha256 = normalizeToken(rawRow?.setSha256);
  const modelResRef = rawRow?.modelResRef === null
    ? null
    : normalizeToken(rawRow?.modelResRef) || null;
  const status = normalizeToken(rawRow?.status);
  const rowEvidenceIds = Array.isArray(rawRow?.evidenceIds)
    ? rawRow.evidenceIds.map(normalizeToken)
    : [];
  const rowId = `${tilesetResRef}:${tileId}`;
  if (!RESREF.test(tilesetResRef) || seenRowIds.has(rowId)) {
    throw new Error(`Placeholder profile contains invalid or duplicate row ${rowId}.`);
  }
  if (!SHA256.test(setSha256)) {
    throw new Error(`Placeholder profile row ${rowId} has an invalid SET SHA-256.`);
  }
  if (status !== "intentional_placeholder") {
    throw new Error(`Placeholder profile row ${rowId} has unsupported status ${status || "<missing>"}.`);
  }
  if (
    rowEvidenceIds.length === 0 ||
    new Set(rowEvidenceIds).size !== rowEvidenceIds.length ||
    rowEvidenceIds.some((evidenceId) => !evidenceIds.has(evidenceId))
  ) {
    throw new Error(`Placeholder profile row ${rowId} references unknown evidence.`);
  }
  seenRowIds.add(rowId);
  return Object.freeze({
    rowId,
    tilesetResRef,
    tileId,
    setSha256,
    modelResRef,
    status,
    evidenceIds: Object.freeze(rowEvidenceIds)
  });
}

export function loadAreaTilePlaceholderEvidenceProfile({
  profilePath,
  expectedSha256,
  evidenceRoot
}) {
  const resolvedProfilePath = path.resolve(String(profilePath ?? ""));
  const normalizedExpectedSha256 = normalizeToken(expectedSha256);
  const resolvedEvidenceRoot = path.resolve(String(evidenceRoot ?? ""));
  if (!SHA256.test(normalizedExpectedSha256)) {
    throw new Error("Placeholder evidence profile expected SHA-256 must be exact and lowercase.");
  }
  if (!fs.existsSync(resolvedEvidenceRoot) || !fs.statSync(resolvedEvidenceRoot).isDirectory()) {
    throw new Error(`Placeholder evidence root is missing: ${resolvedEvidenceRoot}.`);
  }
  if (!fs.existsSync(resolvedProfilePath) || !fs.statSync(resolvedProfilePath).isFile()) {
    throw new Error(`Placeholder evidence profile is missing: ${resolvedProfilePath}.`);
  }
  const profileBytes = fs.readFileSync(resolvedProfilePath);
  const observedProfileSha256 = sha256Bytes(profileBytes);
  if (observedProfileSha256 !== normalizedExpectedSha256) {
    throw new Error(
      `Placeholder evidence profile SHA-256 mismatch: expected ${normalizedExpectedSha256}, ` +
      `observed ${observedProfileSha256}.`
    );
  }
  const rawProfile = parseJsonObject(profileBytes, "Placeholder evidence profile");
  const profileId = normalizeToken(rawProfile.profileId);
  if (
    rawProfile.schema !== PROFILE_SCHEMA ||
    !PROFILE_ID.test(profileId) ||
    !canonicalIsoTimestamp(rawProfile.generatedAt)
  ) {
    throw new Error("Placeholder evidence profile identity or timestamp is invalid.");
  }
  const review = validateReviewArtifact(resolvedEvidenceRoot, rawProfile, profileId);
  if (!Array.isArray(rawProfile.evidence) || rawProfile.evidence.length === 0) {
    throw new Error("Placeholder evidence profile requires at least one evidence artifact.");
  }
  const evidence = rawProfile.evidence.map((entry) =>
    resolveEvidenceArtifact(resolvedEvidenceRoot, entry)
  );
  const evidenceById = new Map();
  for (const entry of evidence) {
    if (evidenceById.has(entry.evidenceId)) {
      throw new Error(`Placeholder evidence profile contains duplicate evidence ${entry.evidenceId}.`);
    }
    evidenceById.set(entry.evidenceId, entry);
  }
  if (evidence.some((entry) =>
    entry.kind === "aurora_decompilation" &&
    normalizeToken(entry.authority.semanticReview.reviewer) === normalizeToken(review.reviewer)
  )) {
    throw new Error(
      "Placeholder evidence profile review must be independent from decompilation semantic review."
    );
  }
  if (!Array.isArray(rawProfile.rows) || rawProfile.rows.length === 0) {
    throw new Error("Placeholder evidence profile requires at least one certified row.");
  }
  const seenRowIds = new Set();
  const rows = rawProfile.rows.map((row) =>
    validateRow(row, evidenceById, seenRowIds)
  );
  const rowsById = new Map(rows.map((row) => [row.rowId, row]));
  for (const evidenceEntry of evidence) {
    for (const rowId of evidenceEntry.certifiedRowIds) {
      const row = rowsById.get(rowId);
      if (!row || !row.evidenceIds.includes(evidenceEntry.evidenceId)) {
        throw new Error(
          `Placeholder evidence ${evidenceEntry.evidenceId} row binding mismatch at ${rowId}.`
        );
      }
    }
  }
  for (const row of rows) {
    for (const evidenceId of row.evidenceIds) {
      if (!evidenceById.get(evidenceId).certifiedRowIds.includes(row.rowId)) {
        throw new Error(`Placeholder profile row ${row.rowId} evidence binding is not symmetric.`);
      }
    }
  }
  const usedEvidenceIds = new Set(rows.flatMap((row) => row.evidenceIds));
  if (evidence.some((entry) => !usedEvidenceIds.has(entry.evidenceId))) {
    throw new Error("Placeholder evidence profile contains an unreferenced evidence artifact.");
  }
  return Object.freeze({
    binding: Object.freeze({
      schema: "aurora-area-tile-placeholder-evidence-profile-binding/v1",
      profileId,
      profilePath: resolvedProfilePath,
      profileSha256: observedProfileSha256,
      profileSchema: PROFILE_SCHEMA,
      evidenceArtifactCount: evidence.length,
      certifiedRowCount: rows.length
    }),
    review,
    evidence: Object.freeze(evidence),
    rows: Object.freeze(rows),
    rowsById
  });
}

export function resolveAreaTilePlaceholderEvidence({
  profile,
  tilesetResRef,
  tileId,
  setSha256,
  modelResRef,
  consumedRowIds
}) {
  if (!profile?.rowsById || !(profile.rowsById instanceof Map)) {
    throw new Error("A validated placeholder evidence profile is required.");
  }
  const normalizedTilesetResRef = normalizeToken(tilesetResRef);
  const normalizedTileId = requireNonNegativeInteger(tileId, "Placeholder evidence tileId");
  const rowId = `${normalizedTilesetResRef}:${normalizedTileId}`;
  const row = profile.rowsById.get(rowId);
  if (!row) return false;
  const normalizedSetSha256 = normalizeToken(setSha256);
  const normalizedModelResRef = modelResRef === null || modelResRef === undefined
    ? null
    : normalizeToken(modelResRef) || null;
  if (normalizedSetSha256 !== row.setSha256) {
    throw new Error(`Placeholder evidence SET SHA-256 mismatch for ${rowId}.`);
  }
  if (normalizedModelResRef !== row.modelResRef) {
    throw new Error(`Placeholder evidence model declaration mismatch for ${rowId}.`);
  }
  consumedRowIds?.add(rowId);
  return true;
}

export function assertAreaTilePlaceholderEvidenceCoverage(profile, consumedRowIds) {
  if (!(consumedRowIds instanceof Set)) {
    throw new Error("Placeholder evidence coverage requires an exact consumed-row set.");
  }
  const missing = profile.rows.filter((row) => !consumedRowIds.has(row.rowId));
  if (missing.length > 0 || consumedRowIds.size !== profile.rows.length) {
    throw new Error(
      `Placeholder evidence row was not consumed by the selected SET corpus: ` +
      `${missing[0]?.rowId ?? "unexpected-extra-row"}.`
    );
  }
}
