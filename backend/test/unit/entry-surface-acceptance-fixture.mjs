import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { writeSourceFixture, fixtureModule, fixtureCapture } from "./entry-surface-fixture.mjs";
import { armEntrySurface, ingestEntrySurface, finalizeEntrySurface } from "../../scripts/lib/aurora-binary-entry-surface-workflow.mjs";

// Simulated native action and human response ONLY for offline plumbing tests.
// These artifacts are never eligible as live native proof.
export function createEntrySurfaceAcceptanceFixture(dir, { finalize = true, name = "fixture_a" } = {}) {
  const sourceDir = join(dir, "source"); mkdirSync(sourceDir);
  const source = writeSourceFixture(sourceDir, name), evidenceDir = join(dir, "evidence");
  const baseTime = Date.now();
  const iso = (delta) => new Date(baseTime + delta).toISOString();
  const arm = armEntrySurface({ profilePath: source.profilePath, outDir: sourceDir, evidenceDir, now: iso(-1000) });
  const request = JSON.parse(readFileSync(arm.requestPath, "utf8"));
  writeFileSync(source.modulePath, fixtureModule([22, 21, 0]).bytes);
  const pngPath = join(dir, "actual-fixture-capture.png"), sidecarPath = join(dir, "actual-fixture-capture.json");
  const { png, sidecar } = fixtureCapture({ binding: request.captureBinding, pngPath, capturedAt: iso(1000) });
  writeFileSync(pngPath, png); writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));
  const witness = { version: "aurora-entry-surface-human-witness/v2", requestId: arm.requestId,
    actorKind: "human", source: { kind: "user_message", reference: "test-only:simulated-user-response", receivedAt: iso(2000) },
    statement: "TEST SIMULATION: I used Paint Start Location, clicked the visible surface, and saved this module.",
    claims: ["used_native_paint_start_location", "clicked_visible_surface", "saved_module"],
    captureSha256: createHash("sha256").update(png).digest("hex") };
  const witnessPath = join(dir, "fixture-witness.json"); writeFileSync(witnessPath, JSON.stringify(witness, null, 2));
  const handoff = { version: "aurora-entry-surface-handoff/v2", requestId: arm.requestId, capture: { sidecarPath, pngPath }, witnessPath };
  const handoffPath = join(dir, "fixture-handoff.json"); writeFileSync(handoffPath, JSON.stringify(handoff, null, 2));
  const input = { evidenceDir, handoffPath, now: iso(3000) };
  const result = finalize ? finalizeEntrySurface({ evidenceDir: (ingestEntrySurface(input), evidenceDir) }) : null;
  return { ...source, sourceDir, evidenceDir, arm, request, handoff, handoffPath, witness, witnessPath,
    pngPath, sidecarPath, sidecar, input, result, geometryProfilePath: result?.geometryProfilePath };
}
