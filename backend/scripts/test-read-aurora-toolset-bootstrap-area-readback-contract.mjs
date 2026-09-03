#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("backend/scripts/read-aurora-toolset-bootstrap-area-readback.mjs"), "utf8");
for (const field of ["displayName", "tag", "tileSet", "tiles", "dependencyFingerprint"]) {
  assert.match(source, new RegExp(`\\b${field}\\b`, "u"));
}
assert.match(source, /completeTileList:\s*tileCount === width \* height/u);
assert.match(source, /tile\.row/u);
assert.match(source, /tile\.orientation/u);
