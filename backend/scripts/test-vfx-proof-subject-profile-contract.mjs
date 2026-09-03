import assert from "node:assert/strict";
import fs from "node:fs";

import {
  indexVfxProofSubjectProfiles,
  parseVfxProofSubjectProfiles
} from "./lib/vfx-proof-subject-profile-contract.mjs";

const raw = JSON.parse(fs.readFileSync(new URL("../config/vfx-proof-subject-profiles.json", import.meta.url), "utf8"));
const profile = parseVfxProofSubjectProfiles(raw);
const indexed = indexVfxProofSubjectProfiles(profile);

assert.equal(profile.subjects.length, 2);
assert.equal(indexed.get("vfx-retail-chunk-particles-progfx-type9")?.renderVisibilityPolicy?.requiredDrawLane, "chunk_model");
assert.equal(indexed.get("catalog-placeable-plc_zlc_o45")?.subjectKind, "catalog-item");
assert.throws(
  () => parseVfxProofSubjectProfiles({ ...raw, unexpected: true }),
  /unknown field unexpected/
);
assert.throws(
  () => parseVfxProofSubjectProfiles({ ...raw, subjects: [...raw.subjects, raw.subjects[0]] }),
  /Duplicate VFX proof subject profile/
);

console.log("vfx proof subject profile contract self-test passed");
