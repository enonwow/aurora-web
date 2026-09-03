#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  BASE_GAME_INDEX_SET_VERSION,
  RESOURCE_PROVENANCE_VERSION,
  verifyModelProofResources,
} from "./lib/aurora-model-proof-120s-resource-provider.mjs";

const root = mkdtempSync(join(tmpdir(), "aurora-model-proof-resource-provider-"));
const gameRoot = join(root, "game");
const dataRoot = join(gameRoot, "data");
mkdirSync(dataRoot, { recursive: true });

const payloads = {
  mdl: Buffer.from("synthetic base game mdl", "utf8"),
  tga: Buffer.from("synthetic base game tga", "utf8"),
  appearance: Buffer.from("synthetic appearance 2da", "utf8"),
};
const keyPath = join(dataRoot, "nwn_base.key");
writeSyntheticKeyBif({
  keyPath,
  bifPath: join(dataRoot, "models_01.bif"),
  bifName: "data/models_01.bif",
  resources: [
    { resref: "c_horror", type: 2002, bytes: payloads.mdl },
    { resref: "c_horror", type: 3, bytes: payloads.tga },
  ],
});
const hakPath = join(root, "appearance-only.hak");
writeSyntheticHak(hakPath, [{ resref: "appearance", type: 2017, bytes: payloads.appearance }]);

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const artifact = (path) => ({ path, byteLength: statSync(path).size, sha256: sha256(readFileSync(path)) });
const provenance = (provider, resourceType) => ({
  version: RESOURCE_PROVENANCE_VERSION,
  provider,
  resourceType,
});
const resources = {
  mdl: { resref: "c_horror", sha256: sha256(payloads.mdl), provenance: provenance("base-game", 2002) },
  tga: { resref: "c_horror", sha256: sha256(payloads.tga), provenance: provenance("base-game", 3) },
  appearance2da: {
    resref: "appearance",
    row: 15219,
    sha256: sha256(payloads.appearance),
    provenance: provenance("ordered-hak", 2017),
  },
  baseGameIndexSet: {
    version: BASE_GAME_INDEX_SET_VERSION,
    rootPath: gameRoot,
    keyFiles: [artifact(keyPath)],
  },
};
const orderedHakList = [{ resref: "appearance_only", ...artifact(hakPath) }];

const resolved = verifyModelProofResources({ resources, orderedHakList });
assert.deepEqual(resolved.map(({ name, provider }) => ({ name, provider })), [
  { name: "mdl", provider: "base-game" },
  { name: "tga", provider: "base-game" },
  { name: "appearance2da", provider: "ordered-hak" },
]);
assert.equal(resolved[0].keyPath, resolve(keyPath));
assert.equal(resolved[0].sha256, resources.mdl.sha256);
assert.equal(resolved[1].sha256, resources.tga.sha256);
assert.equal(resolved[2].hakResref, "appearance_only");

// Existing v1 profiles remain an implicit ordered-HAK provider and do not need
// the new base-game index set.
const allHakPath = join(root, "all-resources.hak");
writeSyntheticHak(allHakPath, [
  { resref: "c_horror", type: 2002, bytes: payloads.mdl },
  { resref: "c_horror", type: 3, bytes: payloads.tga },
  { resref: "appearance", type: 2017, bytes: payloads.appearance },
]);
const legacyResources = structuredClone(resources);
delete legacyResources.baseGameIndexSet;
delete legacyResources.mdl.provenance;
delete legacyResources.tga.provenance;
delete legacyResources.appearance2da.provenance;
const legacy = verifyModelProofResources({ resources: legacyResources, orderedHakList: [{ resref: "legacy", ...artifact(allHakPath) }] });
assert.ok(legacy.every((value) => value.provider === "ordered-hak"));

for (const [expected, mutate] of [
  ["resource_provider_invalid:mdl", (value) => { value.mdl.provenance.provider = "caller-packet"; }],
  ["resource_provenance_type_invalid:mdl", (value) => { value.mdl.provenance.resourceType = 3; }],
  ["model_texture_resource_provider_mismatch", (value) => { value.tga.provenance.provider = "ordered-hak"; }],
  ["base_game_index_set_required", (value) => { delete value.baseGameIndexSet; }],
  ["base_game_key_hash_mismatch", (value) => { value.baseGameIndexSet.keyFiles[0].sha256 = "0".repeat(64); }],
  ["base_game_resource_hash_mismatch:mdl", (value) => { value.mdl.sha256 = "1".repeat(64); }],
  ["base_game_resource_missing:mdl", (value) => { value.mdl.resref = "missing_model"; }],
  ["resource_provenance_version_invalid:mdl", (value) => { value.mdl.provenance.version = "unknown"; }],
]) {
  const changed = structuredClone(resources);
  mutate(changed);
  assert.throws(() => verifyModelProofResources({ resources: changed, orderedHakList }), new RegExp(expected));
}

console.log(JSON.stringify({ ok: true, status: "aurora_model_proof_120s_resource_provider_contract_valid" }));

function writeSyntheticKeyBif({ keyPath: targetKeyPath, bifPath, bifName, resources: entries }) {
  const bifHeaderSize = 20;
  const bifTableOffset = bifHeaderSize;
  const bifEntrySize = 16;
  let payloadOffset = bifTableOffset + entries.length * bifEntrySize;
  const bif = Buffer.alloc(payloadOffset + entries.reduce((sum, entry) => sum + entry.bytes.length, 0));
  bif.write("BIFF", 0, "ascii");
  bif.write("V1  ", 4, "ascii");
  bif.writeUInt32LE(entries.length, 8);
  bif.writeUInt32LE(0, 12);
  bif.writeUInt32LE(bifTableOffset, 16);
  for (const [index, entry] of entries.entries()) {
    const table = bifTableOffset + index * bifEntrySize;
    bif.writeUInt32LE(index, table);
    bif.writeUInt32LE(payloadOffset, table + 4);
    bif.writeUInt32LE(entry.bytes.length, table + 8);
    bif.writeUInt32LE(entry.type, table + 12);
    entry.bytes.copy(bif, payloadOffset);
    payloadOffset += entry.bytes.length;
  }
  writeFileSync(bifPath, bif);

  const fileTableOffset = 32;
  const keyTableOffset = fileTableOffset + 12;
  const nameOffset = keyTableOffset + entries.length * 22;
  const nameBytes = Buffer.from(`${bifName}\0`, "ascii");
  const key = Buffer.alloc(nameOffset + nameBytes.length);
  key.write("KEY ", 0, "ascii");
  key.write("V1  ", 4, "ascii");
  key.writeUInt32LE(1, 8);
  key.writeUInt32LE(entries.length, 12);
  key.writeUInt32LE(fileTableOffset, 16);
  key.writeUInt32LE(keyTableOffset, 20);
  key.writeUInt32LE(bif.length, fileTableOffset);
  key.writeUInt32LE(nameOffset, fileTableOffset + 4);
  key.writeUInt16LE(nameBytes.length, fileTableOffset + 8);
  for (const [index, entry] of entries.entries()) {
    const table = keyTableOffset + index * 22;
    key.write(entry.resref, table, 16, "ascii");
    key.writeUInt16LE(entry.type, table + 16);
    key.writeUInt32LE(index, table + 18);
  }
  nameBytes.copy(key, nameOffset);
  writeFileSync(targetKeyPath, key);
}

function writeSyntheticHak(path, entries) {
  const keyOffset = 160;
  const resourceOffset = keyOffset + entries.length * 24;
  let payloadOffset = resourceOffset + entries.length * 8;
  const hak = Buffer.alloc(payloadOffset + entries.reduce((sum, entry) => sum + entry.bytes.length, 0));
  hak.write("HAK ", 0, "ascii");
  hak.write("V1.0", 4, "ascii");
  hak.writeUInt32LE(entries.length, 16);
  hak.writeUInt32LE(keyOffset, 24);
  hak.writeUInt32LE(resourceOffset, 28);
  for (const [index, entry] of entries.entries()) {
    const key = keyOffset + index * 24;
    hak.write(entry.resref, key, 16, "ascii");
    hak.writeUInt32LE(index, key + 16);
    hak.writeUInt16LE(entry.type, key + 20);
    const resource = resourceOffset + index * 8;
    hak.writeUInt32LE(payloadOffset, resource);
    hak.writeUInt32LE(entry.bytes.length, resource + 4);
    entry.bytes.copy(hak, payloadOffset);
    payloadOffset += entry.bytes.length;
  }
  writeFileSync(path, hak);
}
