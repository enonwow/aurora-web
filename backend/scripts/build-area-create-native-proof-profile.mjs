#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const options = parseArgs(process.argv.slice(2));
const candidatePath = requiredPath(options.candidate, "--candidate");
const sourcePackDir = requiredPath(options.sourcePack, "--sourcePack");
const outputPath = requiredPath(options.out, "--out");

const candidate = readJson(candidatePath);
const sourceManifest = readJson(resolve(sourcePackDir, "manifest.json"));
const are = readJson(resolve(sourcePackDir, "raw.are.summary.json"));
const git = readJson(resolve(sourcePackDir, "raw.git.summary.json"));
const gic = readJson(resolve(sourcePackDir, "raw.gic.status.json"));
const ifo = readJson(resolve(sourcePackDir, "module-ifo-area-entry.json"));

if (
  candidate.schemaVersion !== "aurora-area-create-native-proof-module.v1"
  || candidate.status !== "candidate-built-awaiting-live-certification"
  || candidate.output?.exactCandidateReadback !== true
) {
  throw new Error("area_create_candidate_manifest_invalid");
}
const areaResref = candidate.command?.area?.resRef;
if (
  !areaResref
  || areaResref !== sourceManifest.areaResref
  || areaResref !== ifo.areaResref
  || are.parsed?.tileCount !== candidate.command?.tiles?.length
  || git.counts?.total !== 0
  || gic.status !== "present"
) {
  throw new Error("area_create_source_pack_binding_invalid");
}
assertCurrentFile(candidate.output.module.path, candidate.output.module.sha256, "module");
if (basename(candidate.output.module.path, ".mod").toLowerCase() !== basename(candidate.output.module.path, ".mod")) {
  throw new Error("area_create_module_resref_must_be_lowercase");
}
for (const [extension, source] of [["are", are.source], ["git", git.source], ["gic", gic.source]]) {
  const expected = candidate.candidate.resources.find((resource) => resource.extension === extension);
  if (!expected || expected.resref !== areaResref || expected.sha256 !== source.sha256 || expected.bytes !== source.sizeBytes) {
    throw new Error(`area_create_resource_binding_invalid:${extension}`);
  }
}

const tiles = are.parsed.tiles.map(({ index: _index, ...tile }) => tile);
if (JSON.stringify(tiles) !== JSON.stringify(candidate.command.tiles)) {
  throw new Error("area_create_tile_contract_binding_invalid");
}
const hakReadback = JSON.parse(execFileSync(process.execPath, [
  resolve(here, "read-aurora-toolset-bootstrap-hak-readback.mjs"),
  "--module",
  resolve(candidate.output.module.path),
], { encoding: "utf8", windowsHide: true, timeout: 60_000 }).trim());
if (hakReadback.moduleSha256 !== candidate.output.module.sha256 || hakReadback.orderedHakResrefs.length === 0) {
  throw new Error("area_create_module_hak_readback_invalid");
}
const hakRoot = dirname(candidate.source.requiredHak?.path ?? candidate.source.orderedHaks?.[0]?.path ?? "");
const orderedHakList = hakReadback.orderedHakResrefs.map((resref) => {
  const path = resolve(hakRoot, `${resref}.hak`);
  const bytes = readFileSync(path);
  assertCurrentFile(path, sha256(bytes), `hak:${resref}`);
  return { resref, path, sha256: sha256(bytes) };
});

const profile = {
  version: "aurora-toolset-binary-area-create-profile/v1",
  id: `${basename(candidate.output.module.path, ".mod")}:${areaResref}:empty-structural`,
  proofKind: "area-create-empty-structural",
  module: {
    resref: basename(candidate.output.module.path, ".mod"),
    path: resolve(candidate.output.module.path),
    sha256: candidate.output.module.sha256,
  },
  area: {
    resref: areaResref,
    displayName: are.parsed.name,
    tag: are.parsed.tag,
    width: are.parsed.width,
    height: are.parsed.height,
    tileSet: are.parsed.tileSet,
    tiles,
  },
  moduleEntryPoint: {
    area: ifo.entryArea,
    position: [ifo.entryPosition.x, ifo.entryPosition.y, ifo.entryPosition.z],
  },
  orderedHakList,
  git: { exactEmpty: true, expectedObjectCounts: git.counts },
  gic: { required: true },
  provenance: {
    candidateManifest: { path: candidatePath, sha256: sha256(readFileSync(candidatePath)) },
    sourcePackManifest: { path: resolve(sourcePackDir, "manifest.json"), sha256: sha256(readFileSync(resolve(sourcePackDir, "manifest.json"))) },
    compilerProfileId: candidate.compiler.profileId,
    compilerProfileFingerprintSha256: candidate.compiler.profileFingerprintSha256,
    actualModuleHakReadback: hakReadback,
    candidateDeclaredHakWasNotUsedAsAuthority: true,
  },
  noLocalToolsetAdapter: true,
};

writeFileSync(outputPath, `${JSON.stringify(profile, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
process.stdout.write(`${JSON.stringify({ ok: true, status: "binary_area_create_profile_written", outputPath, profile }, null, 2)}\n`);

function assertCurrentFile(path, expectedSha256, label) {
  const actualPath = resolve(path);
  const details = statSync(actualPath);
  if (!details.isFile() || details.size === 0 || sha256(readFileSync(actualPath)) !== expectedSha256) {
    throw new Error(`area_create_${label}_identity_invalid`);
  }
}
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function requiredPath(value, name) { if (!value) throw new Error(`missing:${name}`); return resolve(value); }
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid:${key ?? "end"}`); result[key.slice(2)] = value; } return result; }
