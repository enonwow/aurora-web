#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("backend/scripts/read-aurora-toolset-bootstrap-hak-readback.mjs"), "utf8");
for (const required of ["readNwnErfResourceIndex", "readNwnErfResourceFromIndex", "extractModuleIfoHakList", "orderedHakResrefs", "moduleSha256"]) {
  assert.match(source, new RegExp(required, "u"));
}
assert.doesNotMatch(source, /nwtoolset|nwmain|SendInput|SetCursorPos/u);
