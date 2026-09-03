#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("backend/scripts/read-aurora-toolset-bootstrap-git-readback.mjs"), "utf8");
assert.match(source, /const parsedObjects = parseAreaObjectsFromGitGff\(bytes\);/u);
assert.match(source, /Array\.isArray\(parsedObjects\)\s*\?\s*parsedObjects\.filter/u);
assert.match(source, /Array\.isArray\(parsedObjects\?\.creatures\)\s*\?\s*parsedObjects\.creatures/u);
assert.match(source, /if \(!creatureObjects\) throw new Error\("bootstrap_git_object_schema_invalid"\);/u);
assert.doesNotMatch(source, /const objects = parseAreaObjectsFromGitGff\(bytes\);\s*const creatures = objects\.filter/u);
for (const kind of ["placeables", "doors", "creatures", "encounters", "items", "sounds", "stores", "triggers", "waypoints", "total"]) {
  assert.match(source, new RegExp(`\\b${kind}\\b`, "u"));
}
assert.match(source, /objectCounts/u);
