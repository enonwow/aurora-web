#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("backend/scripts/build-area-create-native-proof-module.ts"), "utf8");
assert.match(source, /extractModuleIfoHakList/u);
assert.match(source, /orderedHaks/u);
assert.match(source, /candidateModuleIfo/u);
assert.doesNotMatch(source, /DEFAULT_HAK/u);
assert.doesNotMatch(source, /requiredHak/u);
