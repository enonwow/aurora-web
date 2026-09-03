#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const profile = readJson(resolve(options.profile ?? "backend/docs/aurora-reverse/proof-profiles/m0-static-rigid-v5.json"));
const packet = readJson(requiredPath(options.packet, "--packet"));

assertEqual(packet.version, "aurora-m0-toolset-packet/v1", "invalid_toolset_packet_identity");
assertEqual(packet.profileId, profile.id, "toolset_packet_profile_mismatch");
assertEqual(packet.moduleSha256, profile.module.sha256, "toolset_packet_module_hash_mismatch");
assertEqual(packet.area, profile.module.area, "toolset_packet_area_mismatch");
assertEqual(JSON.stringify(packet.fixtures), JSON.stringify(profile.fixtures.map(toFixtureBinding)), "toolset_packet_fixture_mismatch");

const artifacts = new Map((packet.artifacts ?? []).map((artifact) => [artifact.kind, artifact]));
for (const kind of ["toolset-queue-manifest", "toolset-viewport", "toolset-viewport-result"]) {
  const artifact = artifacts.get(kind);
  if (!artifact) throw new Error(`toolset_packet_artifact_missing:${kind}`);
  assertArtifactHash(artifact);
}

const queue = readJson(artifacts.get("toolset-queue-manifest").path);
assertEqual(queue.version, "toolset-area-oracle-queue/v1", "toolset_queue_version_mismatch");
assertEqual(queue.status, "completed", "toolset_queue_not_completed");
assertEqual(queue.expectedModule, `${profile.module.resref}.mod`, "toolset_queue_module_mismatch");
const opened = queue.items?.filter((item) => item.status === "opened" && item.area?.resref === profile.toolsetArea.resref) ?? [];
if (opened.length !== 1) throw new Error("toolset_queue_area_open_missing");
assertEqual(opened[0].area?.name, profile.toolsetArea.nativeTreeDisplayName, "toolset_queue_area_display_name_mismatch");

const viewport = readJson(artifacts.get("toolset-viewport-result").path);
assertEqual(viewport.ok, true, "toolset_viewport_capture_failed");
assertEqual(viewport.status, "verified", "toolset_viewport_capture_unverified");
for (const key of ["usesGlobalCursor", "usesGlobalKeyboard", "usesGlobalMouse"]) {
  assertEqual(viewport.safety?.[key], false, `toolset_viewport_safety_${key}`);
}
if (!String(viewport.safety?.method ?? "").includes("TScrollBox")) {
  throw new Error("toolset_viewport_target_not_tscrollbox");
}

process.stdout.write(`${JSON.stringify({
  ok: true,
  status: "verified",
  profileId: profile.id,
  acceptedArtifacts: [...artifacts.keys()],
}, null, 2)}\n`);

function toFixtureBinding(fixture) {
  return { id: fixture.id, resref: fixture.resref, appearanceRow: fixture.appearanceRow, position: fixture.position };
}

function assertArtifactHash(artifact) {
  if (!artifact.path || !existsSync(artifact.path)) throw new Error(`toolset_packet_artifact_path_missing:${artifact.kind}`);
  const actual = createHash("sha256").update(readFileSync(artifact.path)).digest("hex");
  assertEqual(actual, artifact.sha256, `toolset_packet_artifact_hash_mismatch:${artifact.kind}`);
}

function assertEqual(actual, expected, code) {
  if (actual !== expected) throw new Error(code);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function requiredPath(value, name) {
  if (!value) throw new Error(`missing:${name}`);
  return resolve(value);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`unexpected:${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`missing_value:${token}`);
    parsed[token.slice(2)] = value;
    index += 1;
  }
  return parsed;
}
