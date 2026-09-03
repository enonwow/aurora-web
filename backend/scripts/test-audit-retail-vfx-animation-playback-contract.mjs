#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const auditPath = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-web-row28/calibration-v18-client-animation-rate/client-animation-playback-audit.json"
);
const audit = JSON.parse(await readFile(auditPath, "utf8"));

assert.equal(audit.version, "aurora-retail-vfx-animation-playback-audit/v1");
assert.equal(
  audit.binary.sha256,
  "3b7cb1252e0edb2ce22d7971f333aade027039ae30a45b4bc64732c3e6bec73a"
);
assert.equal(audit.sourceRowTransport.inputRegister, "edx");
assert.equal(audit.sourceRowTransport.storageOffset, "0x180");
assert.equal(audit.animationDispatch.wrapperVtableSlot, "0x80");
assert.equal(audit.animationDispatch.playAnimationFunctionVa, "0x1409b2f30");
assert.deepEqual(audit.playbackRateBranch, {
  sourceRowOffset: "0x180",
  exceptionalSourceRowId: 40,
  exceptionalRate: 0.800000011920929,
  defaultRate: 1,
  targetSourceRowId: 28,
  targetRate: 1
});
assert.equal(
  audit.proofStatus,
  "source-backed-retail-client-row28-animation-playback-rate-1"
);

process.stdout.write(`${JSON.stringify({ status: "ok", auditPath })}\n`);
