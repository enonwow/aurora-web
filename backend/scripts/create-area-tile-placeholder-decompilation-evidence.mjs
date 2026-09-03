#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  areaTilePlaceholderDecompilationAuthoritySubjectSha256,
  validateAreaTilePlaceholderDecompilationAuthoritySubject,
  validateAreaTilePlaceholderEvidenceArtifact
} from "./lib/area-tile-placeholder-evidence-profile.mjs";

const DRAFT_SCHEMA = "aurora-area-tile-placeholder-decompilation-evidence-draft/v1";
const PROPOSAL_SCHEMA = "aurora-area-tile-placeholder-decompilation-proposal/v1";
const EVIDENCE_SCHEMA = "aurora-area-tile-placeholder-evidence/v2";
const REVIEW_SCHEMA = "aurora-area-tile-placeholder-decompilation-semantic-review/v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const EVIDENCE_ID = /^[a-z0-9][a-z0-9._-]{0,127}$/u;
const ROW_ID = /^[a-z0-9_]{1,16}:[0-9]+$/u;

try {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === "draft") createDraft(options);
  else if (command === "finalize") finalizeDraft(options);
  else throw new Error("command_invalid");
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}

function createDraft(options) {
  const evidenceRoot = requireDirectory(requireOption(options, "evidence-root"), "evidence_root_invalid");
  const packetRoot = requireDirectory(requireOption(options, "packet-root"), "packet_root_invalid");
  requireInside(evidenceRoot, packetRoot, "packet_root_outside_evidence_root");
  const packetFile = readBoundJson(
    requireOption(options, "packet"),
    requireOption(options, "packet-sha256"),
    "packet"
  );
  const validationFile = readBoundJson(
    requireOption(options, "validation"),
    requireOption(options, "validation-sha256"),
    "validation"
  );
  requireInside(packetRoot, packetFile.path, "packet_outside_packet_root");
  requireInside(packetRoot, validationFile.path, "validation_outside_packet_root");
  const proposalFile = readBoundJson(
    requireOption(options, "proposal"),
    requireOption(options, "proposal-sha256"),
    "proposal"
  );
  const evidenceId = normalize(requireOption(options, "evidence-id"));
  if (!EVIDENCE_ID.test(evidenceId)) throw new Error("evidence_id_invalid");
  const certifiedRowIds = validateCertifiedRowIds(proposalFile.value);
  const functionBindings = validateProposalBindings(proposalFile.value);
  const binarySha256 = normalize(packetFile.value?.inputBinary?.file?.sha256);
  if (!SHA256.test(binarySha256)) throw new Error("packet_binary_sha256_invalid");
  const authority = {
    binarySha256,
    lineagePacketRootPath: relativeEvidencePath(evidenceRoot, packetRoot),
    lineagePacketPath: relativeEvidencePath(evidenceRoot, packetFile.path),
    lineagePacketSha256: packetFile.sha256,
    lineageValidationPath: relativeEvidencePath(evidenceRoot, validationFile.path),
    lineageValidationSha256: validationFile.sha256,
    functionBindings
  };
  validateAreaTilePlaceholderDecompilationAuthoritySubject({
    evidenceRoot,
    evidenceId,
    certifiedRowIds,
    authority
  });
  const subject = {
    schema: EVIDENCE_SCHEMA,
    evidenceId,
    kind: "aurora_decompilation",
    verdict: "verified",
    certifiedRowIds,
    authority
  };
  const draft = {
    schema: DRAFT_SCHEMA,
    authoritySubjectSha256: areaTilePlaceholderDecompilationAuthoritySubjectSha256({
      evidenceId,
      certifiedRowIds,
      authority
    }),
    proposal: {
      sha256: proposalFile.sha256
    },
    subject
  };
  const output = writeNewJson(requireOption(options, "out"), draft);
  process.stdout.write(`${JSON.stringify({
    result: "decompilation-placeholder-evidence-draft-created",
    draftPath: output.path,
    draftSha256: output.sha256,
    authoritySubjectSha256: draft.authoritySubjectSha256,
    certifiedRowCount: certifiedRowIds.length,
    functionBindingCount: functionBindings.length
  }, null, 2)}\n`);
}

function finalizeDraft(options) {
  const evidenceRoot = requireDirectory(requireOption(options, "evidence-root"), "evidence_root_invalid");
  const draftFile = readBoundJson(
    requireOption(options, "draft"),
    requireOption(options, "draft-sha256"),
    "draft"
  );
  const reviewFile = readBoundJson(
    requireOption(options, "review"),
    requireOption(options, "review-sha256"),
    "review"
  );
  requireInside(evidenceRoot, reviewFile.path, "semantic_review_outside_evidence_root");
  const draft = draftFile.value;
  const subject = draft?.subject;
  const computedSubjectSha256 = areaTilePlaceholderDecompilationAuthoritySubjectSha256({
    evidenceId: subject?.evidenceId,
    certifiedRowIds: subject?.certifiedRowIds,
    authority: subject?.authority
  });
  if (
    draft?.schema !== DRAFT_SCHEMA ||
    subject?.schema !== EVIDENCE_SCHEMA ||
    subject?.kind !== "aurora_decompilation" ||
    subject?.verdict !== "verified" ||
    normalize(draft.authoritySubjectSha256) !== computedSubjectSha256
  ) {
    throw new Error("draft_invalid_or_drifted");
  }
  const review = reviewFile.value;
  if (
    review?.schema !== REVIEW_SCHEMA ||
    normalize(review.evidenceId) !== normalize(subject.evidenceId) ||
    normalize(review.authoritySubjectSha256) !== computedSubjectSha256 ||
    JSON.stringify(review.certifiedRowIds?.map(normalize) ?? []) !==
      JSON.stringify(subject.certifiedRowIds) ||
    review.status !== "verified" ||
    typeof review.reviewer !== "string" ||
    !review.reviewer.trim() ||
    !canonicalIsoTimestamp(review.reviewedAt) ||
    review.independentReview !== true ||
    typeof review.notes !== "string" ||
    !review.notes.trim()
  ) {
    throw new Error("semantic review is invalid");
  }
  const artifact = {
    ...subject,
    authority: {
      ...subject.authority,
      semanticReview: {
        artifactPath: relativeEvidencePath(evidenceRoot, reviewFile.path),
        artifactSha256: reviewFile.sha256
      }
    }
  };
  const outputPath = path.resolve(requireOption(options, "out"));
  requireInside(evidenceRoot, outputPath, "evidence_output_outside_evidence_root");
  if (fs.existsSync(outputPath)) throw new Error("evidence_output_already_exists");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(artifact, null, 2)}\n`, "utf8");
  const artifactSha256 = sha256(bytes);
  const temporaryPath = `${outputPath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporaryPath, bytes, { flag: "wx" });
    validateAreaTilePlaceholderEvidenceArtifact({
      evidenceRoot,
      evidence: {
        evidenceId: subject.evidenceId,
        kind: "aurora_decompilation",
        artifactPath: relativeEvidencePath(evidenceRoot, temporaryPath),
        artifactSha256
      }
    });
    fs.renameSync(temporaryPath, outputPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  }
  process.stdout.write(`${JSON.stringify({
    result: "decompilation-placeholder-evidence-finalized",
    evidencePath: outputPath,
    evidenceSha256: artifactSha256,
    authoritySubjectSha256: computedSubjectSha256,
    certifiedRowCount: subject.certifiedRowIds.length,
    functionBindingCount: subject.authority.functionBindings.length
  }, null, 2)}\n`);
}

function validateCertifiedRowIds(proposal) {
  const values = Array.isArray(proposal?.certifiedRowIds)
    ? proposal.certifiedRowIds.map(normalize)
    : [];
  if (
    proposal?.schema !== PROPOSAL_SCHEMA ||
    values.length === 0 ||
    new Set(values).size !== values.length ||
    values.some((value) => !ROW_ID.test(value)) ||
    JSON.stringify(values) !== JSON.stringify([...values].sort((left, right) => left.localeCompare(right, "en")))
  ) {
    throw new Error("proposal_certified_rows_invalid");
  }
  return values;
}

function validateProposalBindings(proposal) {
  if (!Array.isArray(proposal?.functionBindings) || proposal.functionBindings.length === 0) {
    throw new Error("proposal_function_bindings_invalid");
  }
  const bindings = proposal.functionBindings.map((binding) => ({
    address: normalize(binding?.address),
    outputSha256: normalize(binding?.outputSha256),
    lineStart: binding?.lineStart,
    lineEnd: binding?.lineEnd,
    finding: typeof binding?.finding === "string" ? binding.finding.trim() : ""
  }));
  if (JSON.stringify(bindings.map(({ address }) => address)) !==
      JSON.stringify(bindings.map(({ address }) => address).sort((left, right) => left.localeCompare(right, "en")))) {
    throw new Error("proposal_function_bindings_not_sorted");
  }
  return bindings;
}

function readBoundJson(filePath, expectedSha256, label) {
  const resolvedPath = path.resolve(filePath);
  const normalizedExpectedSha256 = normalize(expectedSha256);
  if (!SHA256.test(normalizedExpectedSha256)) throw new Error(`${label}_sha256_invalid`);
  if (!fs.existsSync(resolvedPath) || !fs.lstatSync(resolvedPath).isFile() ||
      fs.lstatSync(resolvedPath).isSymbolicLink()) {
    throw new Error(`${label}_file_invalid`);
  }
  const bytes = fs.readFileSync(resolvedPath);
  const observedSha256 = sha256(bytes);
  if (observedSha256 !== normalizedExpectedSha256) throw new Error(`${label}_sha256_mismatch`);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/u, ""));
  } catch {
    throw new Error(`${label}_json_invalid`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}_object_invalid`);
  }
  return { path: fs.realpathSync(resolvedPath), sha256: observedSha256, value };
}

function requireDirectory(value, code) {
  const resolved = path.resolve(value);
  if (!fs.existsSync(resolved) || !fs.lstatSync(resolved).isDirectory() ||
      fs.lstatSync(resolved).isSymbolicLink()) {
    throw new Error(code);
  }
  return fs.realpathSync(resolved);
}

function requireInside(root, candidate, code) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(code);
  }
}

function relativeEvidencePath(evidenceRoot, candidate) {
  requireInside(evidenceRoot, candidate, "artifact_outside_evidence_root");
  return path.relative(evidenceRoot, candidate).replaceAll("\\", "/");
}

function writeNewJson(filePath, value) {
  const resolvedPath = path.resolve(filePath);
  if (fs.existsSync(resolvedPath)) throw new Error("output_already_exists");
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.writeFileSync(resolvedPath, bytes, { flag: "wx" });
  return { path: resolvedPath, sha256: sha256(bytes) };
}

function parseArgs(argv) {
  const command = argv[0];
  if (!command || command.startsWith("--")) throw new Error("command_missing");
  const options = new Map();
  for (let index = 1; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith("--") || !value || value.startsWith("--") || options.has(token.slice(2))) {
      throw new Error("cli_arguments_invalid");
    }
    options.set(token.slice(2), value);
  }
  return { command, options };
}

function requireOption(options, name) {
  const value = options.get(name)?.trim();
  if (!value) throw new Error(`cli_argument_missing:${name}`);
  return value;
}

function normalize(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function canonicalIsoTimestamp(value) {
  if (typeof value !== "string" || !value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString() === value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
