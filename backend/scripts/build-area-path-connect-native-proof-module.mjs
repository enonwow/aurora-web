#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildPathConnectProofProfile,
  derivePathConnectProofAreaTiles,
} from "./lib/area-path-connect-native-proof-module.mjs";
import { validateMatrixManifest } from "./lib/tile-add-connect-matrix.mjs";
import { validatePathConnectDifferentialProfile } from "./lib/tile-path-connect-differential-proof.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(here, "..");
const projectRoot = resolve(backendRoot, "..");
const userProfile = process.env.USERPROFILE ?? "";
const modulesDir = resolve(userProfile, "Documents", "Neverwinter Nights", "modules");
const hakDir = resolve(userProfile, "Documents", "Neverwinter Nights", "hak");
const proofRoot = resolve(projectRoot, "output", "proof", "tile-path-connect-native-2026-08-19");
const resourceTypes = Object.freeze({ are: 2012, set: 2013, ifo: 2014, git: 2023, gic: 2046 });
const positiveAreaResRef = "pc_tms01_pos";
const negativeAreaResRef = "pc_tms01_neg";

const require = createRequire(import.meta.url);
process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" });
require("ts-node/register/transpile-only");
const { serializeAurS0505AreaCreateCandidate } = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-area-create-writer");
const { serializeEmptyAreaGit, serializeEmptyAreaGic } = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-area-companion-writer");
const { ensureModuleIfoHak, patchModuleIfoAreaList } = require("../src/modules/areas/adapters/outbound/blob/aurora-gff-module-ifo-area-writer");
const { validateAreaCreationResourceSet } = require("../src/modules/areas/adapters/outbound/blob/aurora-area-creation-resource-set-validator");
const { getAurS0505CreationProfile, AUR_S05_05_CREATION_PROFILE_FINGERPRINT } = require("../src/modules/areas/domain/area-create-profile");
const { buildNwnErfV10, parseNwnErfV10 } = require("../src/modules/runtime-settings/domain/nwn-erf-v10");
const { extractModuleIfoHakList } = require("../src/modules/runtime-settings/application/runtime-settings.application.service");
const { readNwnErfResourceIndex, readNwnErfResourceFromIndex } = require("../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service");

const options = parseOptions(process.argv.slice(2));
await main(options);

async function main(config) {
  assertSafeOptions(config);
  for (const [path, label] of [
    [config.baseModulePath, "base module"],
    [config.matrixManifestPath, "matrix manifest"],
    [config.matrixCheckpointPath, "matrix checkpoint"],
    [config.matrixSummaryPath, "matrix summary"],
    [config.proofInputPath, "proof inventory"],
    [config.setSourcePath, "tms01 SET source"],
    [config.requiredHakPath, "cep3_tiles HAK"],
  ]) await requireFile(path, label);
  for (const path of [config.outputModulePath, config.manifestPath, config.pathProfilePath, config.binaryProfilePath]) {
    if (existsSync(path)) throw new Error(`path_connect_proof_output_already_exists:${path}`);
  }

  const generatedAt = new Date().toISOString();
  const matrixBytes = await readFile(config.matrixManifestPath);
  const matrix = JSON.parse(matrixBytes.toString("utf8"));
  const matrixErrors = validateMatrixManifest(matrix);
  if (matrixErrors.length > 0) throw new Error(`path_connect_matrix_invalid:${matrixErrors.join(",")}`);
  const checkpointBytes = await readFile(config.matrixCheckpointPath);
  const checkpoint = JSON.parse(checkpointBytes.toString("utf8"));
  const summaryBytes = await readFile(config.matrixSummaryPath);
  const summary = JSON.parse(summaryBytes.toString("utf8"));
  if (checkpoint.schema !== "aurora-tile-add-connect-matrix-checkpoint/v2" ||
    checkpoint.planId !== checkpoint.manifestSha256 ||
    checkpoint.contractRevision !== matrix.contract.revision ||
    checkpoint.contractFingerprint !== matrix.contract.fingerprint ||
    summary.planBinding?.planId !== checkpoint.planId ||
    summary.planBinding?.contractRevision !== matrix.contract.revision ||
    summary.planBinding?.contractFingerprint !== matrix.contract.fingerprint ||
    !Array.isArray(summary.validationErrors) || summary.validationErrors.length !== 0) {
    throw new Error("path_connect_matrix_plan_binding_invalid");
  }
  const rowMatches = matrix.rows.filter((candidate) => candidate?.id === config.rowId);
  if (rowMatches.length !== 1) throw new Error("path_connect_matrix_row_cardinality_invalid");
  const row = rowMatches[0];
  const chunkMatches = matrix.chunks.filter((candidate) => candidate?.id === row.fixture?.chunkId);
  if (chunkMatches.length !== 1 || chunkMatches[0].width !== 2 || chunkMatches[0].height !== 2 ||
    chunkMatches[0].caseCount !== 1 || chunkMatches[0].etag !== summary.source?.sourceSha256) {
    throw new Error("path_connect_matrix_chunk_binding_invalid");
  }

  const proofInputBytes = await readFile(config.proofInputPath);
  const setBytes = await readFile(config.setSourcePath);
  const setSha256 = sha256(setBytes);
  if (sha256(proofInputBytes) !== summary.source.inventorySha256 ||
    setSha256 !== summary.source.sourceSha256 ||
    resolve(summary.source.inventoryPath) !== config.proofInputPath ||
    resolve(summary.source.sourcePath) !== config.setSourcePath ||
    summary.source.sourceKey !== chunkMatches[0].sourceKey) {
    throw new Error("path_connect_set_inventory_binding_invalid");
  }

  const hakIndex = await readNwnErfResourceIndex(config.requiredHakPath);
  const hakSetBytes = hakIndex
    ? await readNwnErfResourceFromIndex(config.requiredHakPath, hakIndex, "tms01", resourceTypes.set)
    : null;
  if (!hakSetBytes || sha256(hakSetBytes) !== setSha256 || !hakSetBytes.equals(setBytes)) {
    throw new Error("path_connect_hak_set_readback_mismatch");
  }

  const admittedBaseProfile = getAurS0505CreationProfile();
  const proofAreas = derivePathConnectProofAreaTiles({
    row,
    baseTiles: admittedBaseProfile.tiles,
    width: 2,
    height: 2,
  });
  const positiveCommand = commandFor({
    areaResRef: positiveAreaResRef,
    name: "PathConnect Positive tms01 7 to 5",
    tag: "AW_PC_TMS01_POS",
    tiles: proofAreas.positive,
    setSha256,
    matrixFingerprint: matrix.contract.fingerprint,
  });
  const negativeCommand = commandFor({
    areaResRef: negativeAreaResRef,
    name: "PathConnect Negative tms01 7 to 6",
    tag: "AW_PC_TMS01_NEG",
    tiles: proofAreas.negative,
    setSha256,
    matrixFingerprint: matrix.contract.fingerprint,
  });
  const positive = buildAreaResources(positiveCommand);
  const negative = buildAreaResources(negativeCommand);

  const baseModuleBytes = await readFile(config.baseModulePath);
  const baseArchive = parseNwnErfV10(baseModuleBytes, config.baseModulePath);
  if (baseArchive.signature !== "MOD ") throw new Error("path_connect_base_not_mod");
  assertNoResourceCollision(baseArchive.entries, positiveAreaResRef);
  assertNoResourceCollision(baseArchive.entries, negativeAreaResRef);
  const baseIfo = requireResource(baseArchive.entries, "module", resourceTypes.ifo).bytes;
  const hakPatch = ensureModuleIfoHak(baseIfo, "cep3_tiles");
  if (hakPatch.orderedHakResRefs.at(-1) !== "cep3_tiles") {
    throw new Error("path_connect_required_hak_priority_invalid");
  }
  const withPositive = patchModuleIfoAreaList(hakPatch.bytes, positiveAreaResRef);
  const withBoth = patchModuleIfoAreaList(withPositive.bytes, negativeAreaResRef);

  const outputEntries = baseArchive.entries.map((entry) => entry.resref === "module" && entry.type === resourceTypes.ifo
    ? { resref: "module", type: resourceTypes.ifo, bytes: Buffer.from(withBoth.bytes) }
    : { ...entry, bytes: Buffer.from(entry.bytes) });
  for (const area of [positive, negative]) {
    for (const resource of area.resources) outputEntries.push({ ...resource, bytes: Buffer.from(resource.bytes) });
  }
  const outputModuleBytes = buildNwnErfV10({
    header: baseArchive.header,
    localizedStrings: baseArchive.localizedStrings,
    entries: outputEntries,
  });
  await mkdir(dirname(config.outputModulePath), { recursive: true });
  await writeFile(config.outputModulePath, outputModuleBytes, { flag: "wx" });

  const persistedModuleBytes = await readFile(config.outputModulePath);
  const persisted = parseNwnErfV10(persistedModuleBytes, config.outputModulePath);
  assertExactResource(persisted.entries, "module", resourceTypes.ifo, withBoth.bytes);
  for (const area of [positive, negative]) {
    for (const resource of area.resources) {
      assertExactResource(persisted.entries, resource.resref, resource.type, resource.bytes);
    }
  }
  const persistedIfo = requireResource(persisted.entries, "module", resourceTypes.ifo).bytes;
  const orderedHakResRefs = extractModuleIfoHakList(persistedIfo).map((value) => String(value).toLowerCase());
  if (JSON.stringify(orderedHakResRefs) !== JSON.stringify(hakPatch.orderedHakResRefs)) {
    throw new Error("path_connect_persisted_hak_readback_mismatch");
  }
  if (sha256(await readFile(config.baseModulePath)) !== sha256(baseModuleBytes)) {
    throw new Error("path_connect_base_module_changed");
  }

  const moduleSha256 = sha256(persistedModuleBytes);
  const pathProfile = buildPathConnectProofProfile({
    row,
    moduleSha256,
    positiveAreaResRef,
    negativeAreaResRef,
    width: 2,
    height: 2,
  });
  const profileErrors = validatePathConnectDifferentialProfile(pathProfile, row);
  if (profileErrors.length > 0) throw new Error(`path_connect_profile_invalid:${profileErrors.join(",")}`);

  const orderedHakList = [];
  for (const resref of orderedHakResRefs) {
    const path = resolve(hakDir, `${resref}.hak`);
    await requireFile(path, `ordered HAK ${resref}`);
    orderedHakList.push({ resref, path, sha256: await sha256File(path) });
  }
  const requiredHak = orderedHakList.find((candidate) => candidate.resref === "cep3_tiles");
  if (!requiredHak || resolve(requiredHak.path) !== config.requiredHakPath) {
    throw new Error("path_connect_required_hak_file_binding_invalid");
  }
  const entryReadback = JSON.parse(execFileSync(process.execPath, [
    resolve(here, "read-aurora-toolset-bootstrap-entry-readback.mjs"),
    "--module", config.outputModulePath,
  ], { encoding: "utf8", windowsHide: true, timeout: 60_000 }).trim());
  if (entryReadback.moduleSha256 !== moduleSha256) throw new Error("path_connect_entry_readback_stale");

  const binaryProfile = {
    version: "aurora-toolset-binary-area-create-profile/v1",
    id: `${basename(config.outputModulePath, ".mod")}:${positiveAreaResRef}:path-connect-structural`,
    proofKind: "area-create-empty-structural",
    module: { resref: basename(config.outputModulePath, ".mod"), path: config.outputModulePath, sha256: moduleSha256 },
    area: {
      resref: positiveAreaResRef,
      displayName: positiveCommand.area.name,
      tag: positiveCommand.area.tag,
      width: 2,
      height: 2,
      tileSet: "tms01",
      tiles: proofAreas.positive,
    },
    moduleEntryPoint: { area: entryReadback.area, position: entryReadback.position },
    orderedHakList,
    git: {
      exactEmpty: true,
      expectedObjectCounts: {
        placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0,
        sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 0,
      },
    },
    gic: { required: true },
    provenance: {
      matrixPlanId: checkpoint.planId,
      matrixContractRevision: matrix.contract.revision,
      matrixContractFingerprint: matrix.contract.fingerprint,
      rowId: row.id,
      exactHakSetReadbackSha256: sha256(hakSetBytes),
      admittedStructuralDefaultsProfileId: admittedBaseProfile.id,
      admittedStructuralDefaultsProfileFingerprintSha256: AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
      arbitraryTopologyPublicCreateGateRemainsClosed: true,
    },
    noLocalToolsetAdapter: true,
  };

  await mkdir(dirname(config.manifestPath), { recursive: true });
  await writeFile(config.pathProfilePath, `${JSON.stringify(pathProfile, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await writeFile(config.binaryProfilePath, `${JSON.stringify(binaryProfile, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  const pathProfileBytes = await readFile(config.pathProfilePath);
  const binaryProfileBytes = await readFile(config.binaryProfilePath);
  const manifest = {
    schemaVersion: "aurora-area-path-connect-native-proof-module.v1",
    generatedAt,
    status: "candidate-built-awaiting-live-certification",
    safety: {
      baseModuleReadOnly: true,
      baseModuleBytesUnchanged: true,
      outputCreatedExclusively: true,
      requiredHakAppendedAtHighestAuroraPriority: true,
      publicArbitraryTopologyAreaCreateGateRemainsClosed: true,
    },
    claimBoundary: {
      twoAreaStructuralCandidate: "verified",
      exactHakSetBinding: "verified",
      exactPackedReadback: "verified",
      toolsetOpenSave: "missing",
      nwnRuntimeDifferential: "missing",
      pathConnect: "not-yet-claimed",
      wokSeam: "not-yet-claimed-by-this-candidate",
    },
    source: {
      baseModule: await fileRecord(config.baseModulePath),
      matrixManifest: { ...(await fileRecord(config.matrixManifestPath)), planId: checkpoint.planId },
      matrixCheckpoint: await fileRecord(config.matrixCheckpointPath),
      matrixSummary: await fileRecord(config.matrixSummaryPath),
      proofInventory: await fileRecord(config.proofInputPath),
      tilesetSet: { ...(await fileRecord(config.setSourcePath)), logicalKey: summary.source.sourceKey },
      requiredHak: { ...(await fileRecord(config.requiredHakPath)), resref: "cep3_tiles" },
      hakTilesetReadback: { resref: "tms01", resourceType: resourceTypes.set, bytes: hakSetBytes.length, sha256: sha256(hakSetBytes) },
      orderedHakList,
    },
    matrix: {
      contractRevision: matrix.contract.revision,
      contractFingerprint: matrix.contract.fingerprint,
      rowId: row.id,
      chunkId: row.fixture.chunkId,
      fixture: row.fixture,
      negativeControl: row.pathConnect.negativeControl,
    },
    areas: [
      areaManifest("positive", positiveCommand, positive),
      areaManifest("negative", negativeCommand, negative),
    ],
    output: {
      module: await fileRecord(config.outputModulePath),
      entryCount: persisted.entries.length,
      exactCandidateReadback: true,
      pathConnectProfile: await fileRecord(config.pathProfilePath),
      binaryToolsetProfile: await fileRecord(config.binaryProfilePath),
      profileHashesVerified: sha256(pathProfileBytes) === (await fileRecord(config.pathProfilePath)).sha256 &&
        sha256(binaryProfileBytes) === (await fileRecord(config.binaryProfilePath)).sha256,
    },
  };
  await writeFile(config.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  process.stdout.write(`${JSON.stringify({
    status: manifest.status,
    module: manifest.output.module,
    manifestPath: config.manifestPath,
    pathProfilePath: config.pathProfilePath,
    binaryProfilePath: config.binaryProfilePath,
    areas: manifest.areas.map((area) => ({ role: area.role, resref: area.command.area.resRef, tiles: area.command.tiles.map((tile) => ({ row: tile.row, col: tile.col, tileId: tile.tileId, orientation: tile.orientation })) })),
    orderedHaks: orderedHakResRefs,
  }, null, 2)}\n`);
}

function buildAreaResources(command) {
  const are = serializeAurS0505AreaCreateCandidate(command);
  const git = serializeEmptyAreaGit();
  const gic = serializeEmptyAreaGic();
  const structural = validateAreaCreationResourceSet({ are, git, gic });
  if (!structural.valid) {
    throw new Error(`path_connect_area_structural_validation_failed:${structural.diagnostics.map((entry) => entry.code).join(",")}`);
  }
  return {
    resources: [
      { resref: command.area.resRef, type: resourceTypes.are, extension: "are", bytes: are },
      { resref: command.area.resRef, type: resourceTypes.git, extension: "git", bytes: git },
      { resref: command.area.resRef, type: resourceTypes.gic, extension: "gic", bytes: gic },
    ],
    structuralDiagnostics: structural.diagnostics,
  };
}

function commandFor({ areaResRef, name, tag, tiles, setSha256, matrixFingerprint }) {
  return {
    schemaVersion: "area-create-command.v1",
    moduleId: "proof:path-connect-tms01-7",
    expectedModuleRevision: "proof-only-no-publication",
    creationProfile: { id: "aurora-path-connect-tms01-7-proof.v1", fingerprintSha256: matrixFingerprint },
    area: { name, resRef: areaResRef, tag },
    tileset: { resRef: "tms01", setFingerprintSha256: setSha256 },
    dimensions: { width: 2, height: 2 },
    initializer: { algorithmVersion: "path-connect-differential-fixture.v1", seed: 0 },
    tiles,
    groupInstances: [],
    draft: { id: `native-proof-${areaResRef}`, revision: 1, normalizedSha256: sha256(Buffer.from(JSON.stringify({ areaResRef, tiles, setSha256, matrixFingerprint }))) },
    clientCommandId: `native-proof-${areaResRef}-01`,
  };
}

function areaManifest(role, command, area) {
  return {
    role,
    command,
    structuralValidation: { valid: true, diagnostics: area.structuralDiagnostics },
    resources: area.resources.map((resource) => ({
      resref: resource.resref,
      extension: resource.extension,
      resourceType: resource.type,
      bytes: resource.bytes.length,
      sha256: sha256(resource.bytes),
    })),
  };
}

function parseOptions(args) {
  const values = new Map();
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    const value = args[index + 1];
    if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) {
      throw new Error(`invalid_argument:${key ?? "end"}`);
    }
    values.set(key.slice(2), value);
  }
  const matrixRoot = resolve(projectRoot, "output", "proof", "tile-path-connect-tms01-v5-tiny");
  return {
    baseModulePath: resolve(values.get("base") ?? resolve(modulesDir, "s05e0717.mod")),
    outputModulePath: resolve(values.get("output") ?? resolve(modulesDir, "aw_path_connect_proof_01.mod")),
    matrixManifestPath: resolve(values.get("matrix") ?? resolve(matrixRoot, "manifest.json")),
    matrixCheckpointPath: resolve(values.get("checkpoint") ?? resolve(matrixRoot, "checkpoint.json")),
    matrixSummaryPath: resolve(values.get("summary") ?? resolve(matrixRoot, "summary.json")),
    proofInputPath: resolve(values.get("proof-input") ?? resolve(projectRoot, ".codex-tmp", "tms01-path-connect", "proof-input.json")),
    setSourcePath: resolve(values.get("set") ?? resolve(projectRoot, ".codex-tmp", "tms01-path-connect", "source", "tms01.set")),
    requiredHakPath: resolve(values.get("hak") ?? resolve(hakDir, "cep3_tiles.hak")),
    manifestPath: resolve(values.get("manifest") ?? resolve(proofRoot, "candidate-manifest.json")),
    pathProfilePath: resolve(values.get("path-profile") ?? resolve(proofRoot, "path-connect-profile.json")),
    binaryProfilePath: resolve(values.get("binary-profile") ?? resolve(proofRoot, "binary-toolset-profile.json")),
    rowId: values.get("row") ?? "tms01:7",
  };
}

function assertSafeOptions(config) {
  if (dirname(config.outputModulePath).toLowerCase() !== modulesDir.toLowerCase() ||
    !basename(config.outputModulePath).startsWith("aw_path_connect_proof_") ||
    basename(config.outputModulePath).toLowerCase() !== basename(config.outputModulePath)) {
    throw new Error("path_connect_proof_output_path_unsafe");
  }
  if (config.outputModulePath === config.baseModulePath || config.rowId !== "tms01:7" ||
    basename(config.requiredHakPath).toLowerCase() !== "cep3_tiles.hak") {
    throw new Error("path_connect_proof_input_identity_invalid");
  }
}

function assertNoResourceCollision(entries, resref) {
  if (entries.some((entry) => entry.resref.toLowerCase() === resref)) {
    throw new Error(`path_connect_area_resource_collision:${resref}`);
  }
}

function requireResource(entries, resref, type) {
  const matches = entries.filter((entry) => entry.resref.toLowerCase() === resref && entry.type === type);
  if (matches.length !== 1) throw new Error(`path_connect_resource_cardinality_invalid:${resref}:${type}`);
  return matches[0];
}

function assertExactResource(entries, resref, type, expected) {
  const actual = requireResource(entries, resref, type);
  if (!actual.bytes.equals(expected)) throw new Error(`path_connect_resource_readback_mismatch:${resref}:${type}`);
}

async function requireFile(path, label) {
  const details = await stat(path).catch(() => null);
  if (!details?.isFile() || details.size <= 0) throw new Error(`path_connect_required_file_missing:${label}:${path}`);
}

async function fileRecord(path) {
  const details = await stat(path);
  return { path: resolve(path), bytes: details.size, sha256: await sha256File(path) };
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function sha256File(path) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, rejectPromise) => {
    const stream = createReadStream(path);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", rejectPromise);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}
