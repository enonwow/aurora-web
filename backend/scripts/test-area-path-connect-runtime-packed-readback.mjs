#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

import { inspectPathConnectRuntimePackedModule } from "./lib/area-path-connect-runtime-packed-readback.mjs";
import { buildErf, buildGff } from "./test-support/aurora-model-proof-120s-erf-gff-fixture.mjs";

const scriptResref = "pc_tms01_run";
const source = "void main() {\n  int value = 1;\n}\n";
const packedSource = Buffer.from(source.replaceAll("\n", "\r\n"), "ascii");
const ncs = Buffer.from([0x4e, 0x43, 0x53, 0x20, 0x56, 0x31, 0x2e, 0x30]);
const are = buildGff("ARE ", {
  typeId: 0xffffffff,
  fields: [{ label: "OnEnter", typeId: 11, value: scriptResref }],
});
const moduleBytes = buildErf("MOD ", [
  { resref: "demo", type: 2012, bytes: are },
  { resref: scriptResref, type: 2009, bytes: packedSource },
  { resref: scriptResref, type: 2010, bytes: ncs },
]);

const result = inspectPathConnectRuntimePackedModule(moduleBytes, {
  areaResref: "demo",
  scriptResref,
  expectedNormalizedSourceSha256: sha256(Buffer.from(source, "ascii")),
  expectedNcsSha256: sha256(ncs),
});
assert.equal(result.status, "packed-runtime-binding-verified");
assert.equal(result.area.onEnter, scriptResref);
assert.equal(result.script.nss.normalizedBytes, Buffer.byteLength(source, "ascii"));
assert.equal(result.script.nss.exactNormalizedSource, true);
assert.equal(result.script.ncs.exactCompiledBytecode, true);

assert.throws(() => inspectPathConnectRuntimePackedModule(moduleBytes, {
  areaResref: "demo",
  scriptResref,
  expectedNormalizedSourceSha256: "0".repeat(64),
  expectedNcsSha256: sha256(ncs),
}), /packed_runtime_nss_hash_mismatch/u);

const wrongArea = buildGff("ARE ", {
  typeId: 0xffffffff,
  fields: [{ label: "OnEnter", typeId: 11, value: "different" }],
});
const wrongModule = buildErf("MOD ", [
  { resref: "demo", type: 2012, bytes: wrongArea },
  { resref: scriptResref, type: 2009, bytes: packedSource },
  { resref: scriptResref, type: 2010, bytes: ncs },
]);
assert.throws(() => inspectPathConnectRuntimePackedModule(wrongModule, {
  areaResref: "demo",
  scriptResref,
  expectedNormalizedSourceSha256: sha256(Buffer.from(source, "ascii")),
  expectedNcsSha256: sha256(ncs),
}), /packed_runtime_on_enter_mismatch/u);

console.log(JSON.stringify({ ok: true, status: "area_path_connect_runtime_packed_readback_valid" }));

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
