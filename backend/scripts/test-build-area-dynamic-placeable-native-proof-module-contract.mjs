#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(
  resolve(here, "build-area-dynamic-placeable-native-proof-module.ts"),
  "utf8",
);

for (const required of [
  "aurora-area-dynamic-placeable-native-proof-module.v1",
  "aurora-toolset-binary-dynamic-placeable-profile/v1",
  "dynamic-placeable-catalog-copy",
  "effective-catalog-utp-placeable-copy-v1",
  "parseEffectivePortraitsTwoDa",
  "mutateExistingAreaObjectsInGitGic",
  "parseRawGffDocument",
  "NwnKeyBifResourceReader",
  "exactCandidateReadback",
  "flag: \"wx\"",
]) {
  assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
}

assert.doesNotMatch(source, /nwtoolset|nwmain|SendInput|SetCursorPos/u);
