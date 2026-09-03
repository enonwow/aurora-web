import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { validateMatrixRuntimeBuildProfile } from "./lib/tile-add-connect-runtime-build-profile.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const generator = path.join(
  scriptDirectory,
  "create-tile-add-connect-runtime-build-profile.mjs"
);
const root = fs.mkdtempSync(
  path.join(os.tmpdir(), "aurora-tile-runtime-build-profile-")
);
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

try {
  const profilePath = path.join(root, "profile.json");
  const sourceManifestPath = path.join(root, "source-manifest.json");
  const args = [
    "--output", profilePath,
    "--source-manifest", sourceManifestPath,
    "--profile-id", "area-tiles-runtime-build-generator-test-v8",
    "--built-at", "2026-08-21T16:30:00.000Z"
  ];
  const generated = spawnSync(process.execPath, [generator, ...args], {
    encoding: "utf8"
  });
  assert.equal(generated.status, 0, generated.stderr || generated.stdout);
  const result = JSON.parse(generated.stdout);
  const profile = JSON.parse(fs.readFileSync(profilePath, "utf8"));
  const sourceManifest = JSON.parse(
    fs.readFileSync(sourceManifestPath, "utf8")
  );
  assert.deepEqual(validateMatrixRuntimeBuildProfile(profile), []);
  assert.match(result.runtimeDigest, /^[a-f0-9]{64}$/u);
  assert.equal(profile.frontend.imageDigest, `sha256:${result.runtimeDigest}`);
  assert.equal(profile.backend.imageDigest, profile.frontend.imageDigest);
  assert.equal(profile.frontend.commit, result.runtimeCommit);
  assert.equal(profile.backend.commit, result.runtimeCommit);
  assert.equal(sourceManifest.runtimeDigest, result.runtimeDigest);
  assert.equal(sourceManifest.fileCount, sourceManifest.records.length);
  assert.equal(
    sha256(Buffer.from(JSON.stringify(sourceManifest.records), "utf8")),
    result.runtimeDigest
  );
  assert.equal(
    sha256(fs.readFileSync(profilePath)),
    result.profile.sha256
  );
  assert.equal(
    sha256(fs.readFileSync(sourceManifestPath)),
    result.sourceManifest.sha256
  );
  const repeated = spawnSync(process.execPath, [generator, ...args], {
    encoding: "utf8"
  });
  assert.notEqual(repeated.status, 0);
  assert.match(repeated.stderr, /Immutable output already exists/u);
  process.stdout.write("tile runtime-build profile generator: PASS\n");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
