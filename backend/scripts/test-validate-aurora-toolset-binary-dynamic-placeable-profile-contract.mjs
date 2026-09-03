#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const validator = resolve(here, "validate-aurora-toolset-binary-module-bootstrap.mjs");
const workDir = mkdtempSync(resolve(tmpdir(), "aurora-dynamic-placeable-profile-"));

try {
  const valid = profile();
  const validPath = writeProfile("valid.json", valid);
  const accepted = JSON.parse(execFileSync(process.execPath, [
    validator,
    "--mode", "dry-run",
    "--profile", validPath,
  ], { encoding: "utf8", windowsHide: true }));

  assert.equal(accepted.ok, true);
  assert.equal(accepted.profileKind, "dynamic-placeable-catalog-copy");
  assert.equal(accepted.status, "binary_dynamic_placeable_profile_schema_valid");

  assertRejected("wrong-source-profile.json", {
    ...valid,
    fixture: { ...valid.fixture, sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1" },
  }, "binary_dynamic_placeable_profile_fixture_invalid");
  assertRejected("wrong-count.json", {
    ...valid,
    git: { ...valid.git, expectedObjectCounts: { ...valid.git.expectedObjectCounts, placeables: 0, total: 0 } },
  }, "binary_dynamic_placeable_profile_expected_git_invalid");
  assertRejected("wrong-comment.json", {
    ...valid,
    gic: { ...valid.gic, expectedComment: "different" },
  }, "binary_dynamic_placeable_profile_comment_binding_invalid");
  const { toolsetCapture: _capture, ...withoutCapture } = valid;
  assertRejected(
    "missing-capture.json",
    withoutCapture,
    "binary_dynamic_placeable_profile_capture_invalid",
  );
} finally {
  rmSync(workDir, { recursive: true, force: true });
}

function profile() {
  const expectedObjectCounts = {
    placeables: 1,
    doors: 0,
    creatures: 0,
    encounters: 0,
    items: 0,
    sounds: 0,
    stores: 0,
    triggers: 0,
    waypoints: 0,
    total: 1,
  };
  return {
    version: "aurora-toolset-binary-dynamic-placeable-profile/v1",
    id: "aw_dynamic_placeable_proof_01:awdp01:plc_watertrough",
    proofKind: "dynamic-placeable-catalog-copy",
    module: {
      resref: "aw_dynamic_placeable_proof_01",
      path: "C:\\proof\\aw_dynamic_placeable_proof_01.mod",
      sha256: "a".repeat(64),
    },
    area: {
      resref: "awdp01",
      displayName: "Aurora Web Dynamic Placeable Proof",
      width: 2,
      height: 2,
    },
    entryPoint: { area: "demo", position: [21.5, 19.5, 0] },
    orderedHakList: [{
      resref: "aur_s07",
      path: "C:\\proof\\aur_s07.hak",
      sha256: "b".repeat(64),
    }],
    fixtures: [{
      id: "dynamic-placeable-0",
      kind: "placeable",
      templateResRef: "plc_watertrough",
      position: [10, 10, 0],
    }],
    fixture: {
      ordinal: 0,
      sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
      templateId: "plc_plc_watertrough",
      templateResRef: "plc_watertrough",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp",
      sourceSha256: "c".repeat(64),
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      tag: "Water Trough",
      resolvedPortraitId: 462,
      position: [10, 10, 0],
      bearing: 0,
      gicComment: "Water Trough",
    },
    toolsetCapture: {
      targetClass: "TScrollBox",
      areaResRef: "awdp01",
      objectKind: "placeable",
      objectOrdinal: 0,
      templateResRef: "plc_watertrough",
      artifactDirectory: "C:\\proof\\native",
      viewportArtifact: "viewport.png",
      resultArtifact: "viewport.capture.json",
    },
    git: { expectedObjectCounts },
    gic: { required: true, expectedComment: "Water Trough" },
    noLocalToolsetAdapter: true,
  };
}

function writeProfile(name, value) {
  const path = resolve(workDir, name);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return path;
}

function assertRejected(name, value, diagnostic) {
  const result = spawnSync(process.execPath, [
    validator,
    "--mode", "dry-run",
    "--profile", writeProfile(name, value),
  ], { encoding: "utf8", windowsHide: true });
  assert.notEqual(result.status, 0, name);
  assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(diagnostic, "u"), name);
}
