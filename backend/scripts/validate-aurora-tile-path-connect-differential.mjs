#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeJsonAtomic } from "./runtime-tile-sweep-io.mjs";
import {
  PATH_CONNECT_DIFFERENTIAL_ARTIFACT_KINDS,
  buildPathConnectDifferentialProof,
  validatePathConnectDifferentialPacket,
  validatePathConnectDifferentialProfile,
  validatePathConnectDifferentialProofForRow
} from "./lib/tile-path-connect-differential-proof.mjs";

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function requiredPath(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) throw new Error(`Missing --${name}.`);
  return path.resolve(process.cwd(), value);
}

function readRegularFile(filePath, code) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    throw new Error(`${code}:missing`);
  }
  if (!stat.isFile()) throw new Error(`${code}:not_regular_file`);
  return fs.readFileSync(filePath);
}

function parseJson(bytes, code) {
  try {
    return JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/u, ""));
  } catch {
    throw new Error(`${code}:invalid_json`);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizeArtifactPath(packetPath, artifactPath) {
  return path.isAbsolute(artifactPath)
    ? path.resolve(artifactPath)
    : path.resolve(path.dirname(packetPath), artifactPath);
}

function validateArtifactHashes(packet, packetPath) {
  const failures = [];
  const normalized = structuredClone(packet);
  for (const kind of PATH_CONNECT_DIFFERENTIAL_ARTIFACT_KINDS) {
    const declared = packet.artifacts?.[kind];
    if (typeof declared?.path !== "string" || typeof declared?.sha256 !== "string") continue;
    const artifactPath = normalizeArtifactPath(packetPath, declared.path);
    normalized.artifacts[kind].path = artifactPath;
    let bytes;
    try {
      bytes = readRegularFile(artifactPath, `PATH_CONNECT_ARTIFACT_INVALID:${kind}`);
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
      continue;
    }
    if (sha256(bytes) !== declared.sha256) failures.push(`PATH_CONNECT_ARTIFACT_SHA256_MISMATCH:${kind}`);
  }
  return { failures, normalized };
}

function print(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const profilePath = requiredPath(options.profile, "profile");
  const packetPath = requiredPath(options.packet, "packet");
  const rowPath = requiredPath(options.row, "row");
  const outPath = requiredPath(options.out, "out");
  const profileBytes = readRegularFile(profilePath, "PATH_CONNECT_PROFILE_FILE_INVALID");
  const packetBytes = readRegularFile(packetPath, "PATH_CONNECT_PACKET_FILE_INVALID");
  const rowBytes = readRegularFile(rowPath, "PATH_CONNECT_ROW_FILE_INVALID");
  const profile = parseJson(profileBytes, "PATH_CONNECT_PROFILE_FILE_INVALID");
  const packet = parseJson(packetBytes, "PATH_CONNECT_PACKET_FILE_INVALID");
  const row = parseJson(rowBytes, "PATH_CONNECT_ROW_FILE_INVALID");
  const profileSha256 = sha256(profileBytes);
  const packetSha256 = sha256(packetBytes);

  const failures = [
    ...validatePathConnectDifferentialProfile(profile, row),
    ...validatePathConnectDifferentialPacket(packet, profile, profileSha256)
  ];
  const artifactValidation = validateArtifactHashes(packet, packetPath);
  failures.push(...artifactValidation.failures);
  const uniqueFailures = [...new Set(failures)].sort();
  if (uniqueFailures.length > 0) {
    print({
      ok: false,
      status: "failed",
      blockerCode: "PATH_CONNECT_DIFFERENTIAL_PROOF_REJECTED",
      profilePath,
      packetPath,
      rowPath,
      failureCount: uniqueFailures.length,
      failures: uniqueFailures
    });
    process.exitCode = 2;
    return;
  }

  const proof = buildPathConnectDifferentialProof({
    profile,
    profilePath,
    profileSha256,
    packet: artifactValidation.normalized,
    packetPath,
    packetSha256
  });
  const proofErrors = validatePathConnectDifferentialProofForRow(proof, row);
  if (proofErrors.length > 0) {
    print({
      ok: false,
      status: "failed",
      blockerCode: "PATH_CONNECT_DIFFERENTIAL_PROOF_REJECTED",
      profilePath,
      packetPath,
      rowPath,
      failureCount: proofErrors.length,
      failures: proofErrors
    });
    process.exitCode = 2;
    return;
  }

  writeJsonAtomic(outPath, proof);
  print({
    ok: true,
    status: "verified",
    proofPath: outPath,
    proofSha256: sha256(fs.readFileSync(outPath)),
    profile: { id: profile.id, path: profilePath, sha256: profileSha256 },
    packet: { path: packetPath, sha256: packetSha256 },
    binding: proof.binding,
    proofClaimed: true,
    pathConnectAccepted: true
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    print({
      ok: false,
      status: "failed",
      blockerCode: "PATH_CONNECT_DIFFERENTIAL_VALIDATOR_FAILED",
      failures: [error instanceof Error ? error.message : String(error)]
    });
    process.exitCode = 1;
  }
}
