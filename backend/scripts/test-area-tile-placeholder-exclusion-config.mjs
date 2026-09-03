import assert from "node:assert/strict";

import {
  parseAreaTilePlaceholderExclusionConfig
} from "./lib/area-tile-placeholder-exclusion-config.mjs";

assert.deepEqual(
  parseAreaTilePlaceholderExclusionConfig([
    "node",
    "audit-all-area-tiles.mjs",
    "--placeholder-exclusion-mode",
    "none"
  ]),
  { mode: "none", profilePath: null, profileSha256: null }
);

assert.deepEqual(
  parseAreaTilePlaceholderExclusionConfig([
    "node",
    "audit-all-area-tiles.mjs",
    "--placeholder-exclusion-mode",
    "evidence-profile",
    "--placeholder-evidence-profile",
    "proof.json",
    "--placeholder-evidence-profile-sha256",
    "A".repeat(64)
  ]),
  { mode: "evidence-profile", profilePath: "proof.json", profileSha256: "a".repeat(64) }
);

assert.throws(
  () => parseAreaTilePlaceholderExclusionConfig(["node", "audit-all-area-tiles.mjs"]),
  /--placeholder-exclusion-mode/u
);
assert.throws(
  () => parseAreaTilePlaceholderExclusionConfig([
    "node",
    "audit-all-area-tiles.mjs",
    "--placeholder-exclusion-mode",
    "none",
    "--placeholder-evidence-profile",
    "proof.json"
  ]),
  /must not include a placeholder evidence profile/u
);
assert.throws(
  () => parseAreaTilePlaceholderExclusionConfig([
    "node",
    "audit-all-area-tiles.mjs",
    "--placeholder-exclusion-mode",
    "evidence-profile",
    "--placeholder-evidence-profile",
    "proof.json"
  ]),
  /requires both placeholder evidence profile arguments/u
);
assert.throws(
  () => parseAreaTilePlaceholderExclusionConfig([
    "node",
    "audit-all-area-tiles.mjs",
    "--placeholder-exclusion-mode",
    "unexpected"
  ]),
  /must be none or evidence-profile/u
);

process.stdout.write("Area tile placeholder exclusion config: PASS\n");
