#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, token, index, all) => index % 2 === 0 ? [...pairs, [token.slice(2), all[index + 1]]] : pairs, []));
const profile = JSON.parse(readFileSync(resolve(args.profile ?? "backend/docs/aurora-reverse/proof-profiles/m0-static-rigid-v5.json"), "utf8"));
const packet = JSON.parse(readFileSync(resolve(required(args.packet, "--packet")), "utf8"));
if (packet.version !== "aurora-runtime-capture-ingestion/v1" || packet.submittedBy !== "user") throw new Error("invalid_runtime_ingestion_identity");
if (packet.profileId !== profile.id || packet.moduleSha256 !== profile.module.sha256 || packet.area !== profile.module.area) throw new Error("runtime_ingestion_profile_mismatch");
if (JSON.stringify(packet.fixtures) !== JSON.stringify(profile.fixtures.map((fixture) => ({ id: fixture.id, resref: fixture.resref, appearanceRow: fixture.appearanceRow, position: fixture.position })))) throw new Error("runtime_ingestion_fixture_mismatch");
for (const artifact of packet.artifacts ?? []) {
  if (!existsSync(artifact.path)) throw new Error(`runtime_artifact_missing:${artifact.path}`);
  const hash = createHash("sha256").update(readFileSync(artifact.path)).digest("hex");
  if (hash !== artifact.sha256) throw new Error(`runtime_artifact_hash_mismatch:${artifact.path}`);
}
if (!packet.artifacts?.some((artifact) => artifact.kind === "runtime-capture") || !packet.artifacts?.some((artifact) => artifact.kind === "engine-load-log")) throw new Error("runtime_artifact_kinds_missing");
process.stdout.write(`${JSON.stringify({ ok: true, status: "verified", profileId: profile.id, acceptedArtifacts: packet.artifacts.map((artifact) => artifact.kind) }, null, 2)}\n`);
function required(value, name) { if (!value) throw new Error(`missing:${name}`); return value; }
