#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  areaTilePlaceholderEvidenceProfileSubjectSha256,
  loadAreaTilePlaceholderEvidenceProfile,
  validateAreaTilePlaceholderEvidenceArtifact
} from "./lib/area-tile-placeholder-evidence-profile.mjs";
import { loadSelectedAreaTilesetCorpus } from "./lib/area-tileset-source-corpus.mjs";

const EVIDENCE_INDEX_SCHEMA = "aurora-area-tile-placeholder-evidence-index/v1";
const DRAFT_SCHEMA = "aurora-area-tile-placeholder-evidence-profile-draft/v1";
const PROFILE_SCHEMA = "aurora-area-tile-placeholder-evidence-profile/v1";
const REVIEW_SCHEMA = "aurora-area-tile-placeholder-evidence-profile-review/v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const PROFILE_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const ROW_ID = /^([a-z0-9_]{1,16}):(\d+)$/u;

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeToken(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function canonicalIsoTimestamp(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) || date.toISOString() !== value ? null : value;
}

function parseArgs(argv) {
  const command = argv[2];
  const values = new Map();
  for (let index = 3; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || values.has(key)) {
      throw new Error(`Invalid or duplicate argument ${key ?? "<missing>"}.`);
    }
    values.set(key, value);
  }
  const requireOption = (name) => {
    const value = values.get(name)?.trim();
    if (!value) throw new Error(`${name} <value> is required.`);
    return value;
  };
  return { command, requireOption };
}

function readHashBoundJson(filePath, expectedSha256, label) {
  const resolvedPath = path.resolve(filePath);
  const normalizedExpectedSha256 = normalizeToken(expectedSha256);
  if (!SHA256.test(normalizedExpectedSha256)) {
    throw new Error(`${label} expected SHA-256 must be exact and lowercase.`);
  }
  if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
    throw new Error(`${label} is missing: ${resolvedPath}.`);
  }
  const bytes = fs.readFileSync(resolvedPath);
  const observedSha256 = sha256(bytes);
  if (observedSha256 !== normalizedExpectedSha256) {
    throw new Error(
      `${label} SHA-256 mismatch: expected ${normalizedExpectedSha256}, observed ${observedSha256}.`
    );
  }
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(`${label} is not valid JSON.`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return { path: resolvedPath, sha256: observedSha256, value };
}

function relativeEvidencePath(evidenceRoot, artifactPath, label) {
  const relative = path.relative(path.resolve(evidenceRoot), path.resolve(artifactPath));
  if (
    !relative ||
    relative === ".." ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`${label} is outside the evidence root.`);
  }
  return relative.replaceAll("\\", "/");
}

function writeNewJson(outPath, value) {
  const resolvedOutPath = path.resolve(outPath);
  if (fs.existsSync(resolvedOutPath)) {
    throw new Error(`Output already exists: ${resolvedOutPath}.`);
  }
  fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.writeFileSync(resolvedOutPath, bytes, { flag: "wx" });
  return { path: resolvedOutPath, sha256: sha256(bytes), bytes };
}

function createDraft({ sourceRoot, evidenceRoot, evidenceIndex, profileId, generatedAt }) {
  if (evidenceIndex.schema !== EVIDENCE_INDEX_SCHEMA || !Array.isArray(evidenceIndex.evidence)) {
    throw new Error("Placeholder evidence index schema is invalid.");
  }
  if (!PROFILE_ID.test(profileId) || !canonicalIsoTimestamp(generatedAt)) {
    throw new Error("Placeholder evidence profile id or generation timestamp is invalid.");
  }
  const validatedEvidence = evidenceIndex.evidence.map((evidence) =>
    validateAreaTilePlaceholderEvidenceArtifact({ evidenceRoot, evidence })
  );
  if (validatedEvidence.length === 0) {
    throw new Error("Placeholder evidence index contains no evidence artifacts.");
  }
  const evidenceIds = new Set(validatedEvidence.map((entry) => entry.evidenceId));
  if (evidenceIds.size !== validatedEvidence.length) {
    throw new Error("Placeholder evidence index contains duplicate evidence ids.");
  }
  const corpus = loadSelectedAreaTilesetCorpus(sourceRoot);
  const evidenceIdsByRow = new Map();
  for (const evidence of validatedEvidence) {
    for (const rowId of evidence.certifiedRowIds) {
      const rowEvidenceIds = evidenceIdsByRow.get(rowId) ?? [];
      rowEvidenceIds.push(evidence.evidenceId);
      evidenceIdsByRow.set(rowId, rowEvidenceIds);
    }
  }
  const rows = [...evidenceIdsByRow]
    .sort(([left], [right]) => left.localeCompare(right, "en"))
    .map(([rowId, rowEvidenceIds]) => {
      const match = rowId.match(ROW_ID);
      if (!match) throw new Error(`Evidence certifies invalid Area tile row id ${rowId}.`);
      const tilesetResRef = match[1];
      const tileId = Number.parseInt(match[2], 10);
      const tileset = corpus.selectedByResRef.get(tilesetResRef);
      const tile = tileset?.definition.tiles.find((entry) => entry.tileId === tileId);
      if (!tileset || !tile) {
        throw new Error(`Evidence certifies a row absent from the selected SET corpus: ${rowId}.`);
      }
      return {
        tilesetResRef,
        tileId,
        setSha256: tileset.setSha256,
        modelResRef: tile.modelResRef,
        status: "intentional_placeholder",
        evidenceIds: [...rowEvidenceIds].sort((left, right) => left.localeCompare(right, "en"))
      };
    });
  const evidence = validatedEvidence
    .map((entry) => ({
      evidenceId: entry.evidenceId,
      kind: entry.kind,
      artifactPath: relativeEvidencePath(
        evidenceRoot,
        entry.artifactPath,
        `Placeholder evidence artifact ${entry.evidenceId}`
      ),
      artifactSha256: entry.artifactSha256
    }))
    .sort((left, right) => left.evidenceId.localeCompare(right.evidenceId, "en"));
  const subject = {
    schema: PROFILE_SCHEMA,
    profileId,
    generatedAt,
    evidence,
    rows
  };
  return {
    schema: DRAFT_SCHEMA,
    subjectSha256: areaTilePlaceholderEvidenceProfileSubjectSha256(subject),
    corpus: {
      sourceRoot: corpus.sourceRoot,
      setVariantCount: corpus.setVariantPaths.length,
      selectedTilesetCount: corpus.selectedTilesets.length,
      certifiedRowCount: rows.length
    },
    subject
  };
}

function finalizeProfile({ draft, reviewRecord, reviewPath, reviewSha256, evidenceRoot }) {
  if (
    draft.schema !== DRAFT_SCHEMA ||
    !draft.subject ||
    draft.subject.schema !== PROFILE_SCHEMA ||
    normalizeToken(draft.subjectSha256) !==
      areaTilePlaceholderEvidenceProfileSubjectSha256(draft.subject)
  ) {
    throw new Error("Placeholder evidence profile draft is invalid or has drifted.");
  }
  if (
    reviewRecord.schema !== REVIEW_SCHEMA ||
    normalizeToken(reviewRecord.profileId) !== normalizeToken(draft.subject.profileId) ||
    normalizeToken(reviewRecord.subjectSha256) !== normalizeToken(draft.subjectSha256) ||
    reviewRecord.status !== "verified" ||
    typeof reviewRecord.reviewer !== "string" ||
    !reviewRecord.reviewer.trim() ||
    !canonicalIsoTimestamp(reviewRecord.reviewedAt) ||
    reviewRecord.independentReview !== true ||
    typeof reviewRecord.notes !== "string" ||
    !reviewRecord.notes.trim()
  ) {
    throw new Error("Placeholder evidence profile review record is invalid.");
  }
  return {
    ...draft.subject,
    review: {
      artifactPath: relativeEvidencePath(
        evidenceRoot,
        reviewPath,
        "Placeholder evidence profile review"
      ),
      artifactSha256: reviewSha256
    }
  };
}

try {
  const { command, requireOption } = parseArgs(process.argv);
  if (command === "draft") {
    const evidenceIndexFile = readHashBoundJson(
      requireOption("--evidence-index"),
      requireOption("--evidence-index-sha256"),
      "Placeholder evidence index"
    );
    const draft = createDraft({
      sourceRoot: requireOption("--source-root"),
      evidenceRoot: requireOption("--evidence-root"),
      evidenceIndex: evidenceIndexFile.value,
      profileId: normalizeToken(requireOption("--profile-id")),
      generatedAt: requireOption("--generated-at")
    });
    const output = writeNewJson(requireOption("--out"), draft);
    process.stdout.write(`${JSON.stringify({
      result: "placeholder-evidence-profile-draft-created",
      draftPath: output.path,
      draftSha256: output.sha256,
      subjectSha256: draft.subjectSha256,
      certifiedRowCount: draft.subject.rows.length
    }, null, 2)}\n`);
  } else if (command === "finalize") {
    const evidenceRoot = path.resolve(requireOption("--evidence-root"));
    const draftFile = readHashBoundJson(
      requireOption("--draft"),
      requireOption("--draft-sha256"),
      "Placeholder evidence profile draft"
    );
    const reviewFile = readHashBoundJson(
      requireOption("--review"),
      requireOption("--review-sha256"),
      "Placeholder evidence profile review"
    );
    const profile = finalizeProfile({
      draft: draftFile.value,
      reviewRecord: reviewFile.value,
      reviewPath: reviewFile.path,
      reviewSha256: reviewFile.sha256,
      evidenceRoot
    });
    const resolvedOutPath = path.resolve(requireOption("--out"));
    if (fs.existsSync(resolvedOutPath)) throw new Error(`Output already exists: ${resolvedOutPath}.`);
    fs.mkdirSync(path.dirname(resolvedOutPath), { recursive: true });
    const profileBytes = Buffer.from(`${JSON.stringify(profile, null, 2)}\n`, "utf8");
    const profileSha256 = sha256(profileBytes);
    const temporaryPath = `${resolvedOutPath}.tmp-${process.pid}`;
    try {
      fs.writeFileSync(temporaryPath, profileBytes, { flag: "wx" });
      loadAreaTilePlaceholderEvidenceProfile({
        profilePath: temporaryPath,
        expectedSha256: profileSha256,
        evidenceRoot
      });
      fs.renameSync(temporaryPath, resolvedOutPath);
    } finally {
      if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
    }
    process.stdout.write(`${JSON.stringify({
      result: "placeholder-evidence-profile-finalized",
      profilePath: resolvedOutPath,
      profileSha256,
      subjectSha256: draftFile.value.subjectSha256,
      certifiedRowCount: profile.rows.length
    }, null, 2)}\n`);
  } else {
    throw new Error("Expected command draft or finalize.");
  }
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
