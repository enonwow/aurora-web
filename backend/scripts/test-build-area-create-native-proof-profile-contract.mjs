#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("backend/scripts/build-area-create-native-proof-profile.mjs"), "utf8");
for (const required of [
  "aurora-toolset-binary-area-create-profile/v1",
  "area-create-empty-structural",
  "candidate-built-awaiting-live-certification",
  "exactCandidateReadback",
  "raw.are.summary.json",
  "raw.git.summary.json",
  "raw.gic.status.json",
  "module-ifo-area-entry.json",
  "read-aurora-toolset-bootstrap-hak-readback.mjs",
  "expectedObjectCounts",
  "flag: \"wx\"",
]) {
  assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
}
assert.doesNotMatch(source, /nwtoolset|nwmain|SendInput|SetCursorPos/u);
