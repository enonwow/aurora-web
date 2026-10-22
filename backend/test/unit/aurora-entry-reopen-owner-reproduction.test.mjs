import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { armEntrySurface, ingestEntrySurface } from "../../scripts/lib/aurora-binary-entry-surface-workflow.mjs";
import { writeSourceFixture, fixtureCapture } from "./entry-surface-fixture.mjs";
import { createEntrySurfaceAcceptanceFixture } from "./entry-surface-acceptance-fixture.mjs";
import { finalizeViewportCapture } from "../../scripts/lib/aurora-viewport-capture-provenance.mjs";

function isolated(fn) {
  const dir = mkdtempSync(join(tmpdir(), "aurora-reopen-repro-"));
  try { fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("existing ARM retains historical owner even though source is a saved immutable disk target", () => isolated((dir) => {
  const source = writeSourceFixture(dir), evidenceDir = join(dir, "proof");
  const arm = armEntrySurface({ profilePath: source.profilePath, outDir: dir, evidenceDir });
  const request = JSON.parse(readFileSync(arm.requestPath));
  assert.equal(request.source.owner.livenessVerified, false);
  assert.equal(request.captureBinding.owner.pid, 1234);
  assert.equal(request.captureBinding.owner.startedAt, "2026-09-05T23:49:06.824Z");
}));

test("well-formed capture of a new owner cannot satisfy the historical ARM binding", () => isolated((dir) => {
  const source = writeSourceFixture(dir);
  const arm = armEntrySurface({ profilePath: source.profilePath, outDir: dir, evidenceDir: join(dir, "proof"), now: "2026-09-06T11:59:59.000Z" });
  const request = JSON.parse(readFileSync(arm.requestPath));
  const newBinding = structuredClone(request.captureBinding);
  newBinding.owner = { pid: 2234, startedAt: "2026-09-06T12:00:00.1234567Z", frameHwnd: 7654 };
  const { png, sidecar } = fixtureCapture({ binding: newBinding, pngPath: join(dir, "capture.png"), capturedAt: "2026-09-06T12:00:01.1234567Z" });
  assert.throws(() => finalizeViewportCapture({ ...sidecar, identityBefore: sidecar.stability.before, identityAfter: sidecar.stability.after }, png, request.captureBinding), /capture_owner_binding_mismatch/u);
}));

test("manual binding substitution is rejected by immutable-source reconstruction", () => isolated((dir) => {
  const fixture = createEntrySurfaceAcceptanceFixture(dir, { finalize: false });
  fixture.request.captureBinding.owner.pid = 2234;
  writeFileSync(fixture.arm.requestPath, JSON.stringify(fixture.request));
  assert.throws(() => ingestEntrySurface(fixture.input), /ENTRY_REQUEST_CAPTURE_BINDING_MISMATCH/u);
}));
