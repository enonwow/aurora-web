#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
const source = readFileSync(resolve("backend/scripts/validate-aurora-toolset-binary-module-bootstrap.mjs"), "utf8");
const entryReader = readFileSync(resolve("backend/scripts/read-aurora-toolset-bootstrap-entry-readback.mjs"), "utf8");
for (const required of ["aurora-toolset-binary-module-bootstrap-profile/v1", "read-aurora-toolset-bootstrap-area-readback.mjs", "read-aurora-toolset-bootstrap-entry-readback.mjs", "read-aurora-toolset-bootstrap-git-readback.mjs", "extractModuleIfoHakList", "binary_bootstrap_ordered_hak_list_mismatch", "noNativeGeometryOrVisualProofClaimed"]) assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")));
assert.doesNotMatch(source, /nwtoolset|nwmain|PostMessage|SendInput|SetCursorPos/);
assert.match(source, /resolve\(here, name\)/);
assert.match(entryReader, /new URL\("inspect-area-lighting-module-gff-labels\.mjs", import\.meta\.url\)/);
const dir = mkdtempSync(join(tmpdir(), "aurora-binary-bootstrap-cwd-"));
try {
  const profile = join(dir, "profile.json");
  writeFileSync(profile, JSON.stringify({ version: "aurora-toolset-binary-module-bootstrap-profile/v1", id: "cross_cwd", module: { resref: "m2a_cross", path: "C:\\not-used\\m2a_cross.mod", sha256: "a".repeat(64) }, area: { resref: "m2a_area", width: 2, height: 2 }, entryPoint: { area: "m2a_area", position: [10, 10, 0] }, orderedHakList: [{ resref: "m2a_hak", path: "C:\\not-used\\m2a_hak.hak", sha256: "b".repeat(64) }], fixtures: [{ id: "fixture", templateResRef: "m2a_utc", appearanceType: 15109, position: [10, 10, 0] }], noLocalToolsetAdapter: true }));
  const output = execFileSync(process.execPath, [resolve("backend/scripts/validate-aurora-toolset-binary-module-bootstrap.mjs"), "--mode", "dry-run", "--profile", profile], { encoding: "utf8", cwd: dir });
  assert.match(output, /binary_bootstrap_profile_schema_valid/);

  const installedHakNamesProfile = join(dir, "installed-hak-names-profile.json");
  writeFileSync(installedHakNamesProfile, JSON.stringify({
    version: "aurora-toolset-binary-module-bootstrap-profile/v1",
    id: "installed_hak_name_contract",
    module: { resref: "m2a_haks", path: "C:\\not-used\\m2a_haks.mod", sha256: "a".repeat(64) },
    area: { resref: "m2a_area", width: 2, height: 2 },
    entryPoint: { area: "m2a_area", position: [10, 10, 0] },
    orderedHakList: ["+sic_builder", "q_!tilesets", "vale-c_and_m", "lc_placeable_cust"].map((resref, index) => ({ resref, path: `C:\\not-used\\hak-${index}.hak`, sha256: "b".repeat(64) })),
    fixtures: [{ id: "fixture", templateResRef: "m2a_utc", appearanceType: 15109, position: [10, 10, 0] }],
    noLocalToolsetAdapter: true,
  }));
  const installedHakNamesOutput = execFileSync(process.execPath, [resolve("backend/scripts/validate-aurora-toolset-binary-module-bootstrap.mjs"), "--mode", "dry-run", "--profile", installedHakNamesProfile], { encoding: "utf8", cwd: dir });
  assert.match(installedHakNamesOutput, /binary_bootstrap_profile_schema_valid/);

  const emptyAreaProfile = join(dir, "empty-area-profile.json");
  const emptyArea = {
    version: "aurora-toolset-binary-area-create-profile/v1",
    id: "area_create_empty_structural_contract",
    proofKind: "area-create-empty-structural",
    module: { resref: "aw_area_create", path: "C:\\not-used\\aw_area_create.mod", sha256: "c".repeat(64) },
    area: {
      resref: "aw_created_area",
      displayName: "Created Area",
      tag: "AW_CREATED_AREA",
      width: 2,
      height: 2,
      tileSet: "tms01",
      tiles: [
        { row: 0, col: 0, tileId: 12, orientation: 2, height: 0, mainLight1: 0, mainLight2: 0, sourceLight1: 0, sourceLight2: 0, animLoop1: 1, animLoop2: 1, animLoop3: 1 },
        { row: 0, col: 1, tileId: 12, orientation: 1, height: 0, mainLight1: 0, mainLight2: 0, sourceLight1: 0, sourceLight2: 0, animLoop1: 1, animLoop2: 1, animLoop3: 1 },
        { row: 1, col: 0, tileId: 12, orientation: 3, height: 0, mainLight1: 0, mainLight2: 0, sourceLight1: 0, sourceLight2: 0, animLoop1: 1, animLoop2: 1, animLoop3: 1 },
        { row: 1, col: 1, tileId: 12, orientation: 0, height: 0, mainLight1: 0, mainLight2: 0, sourceLight1: 0, sourceLight2: 0, animLoop1: 1, animLoop2: 1, animLoop3: 1 },
      ],
    },
    moduleEntryPoint: { area: "existing_start", position: [21, 19, 0] },
    orderedHakList: [{ resref: "cep3_tiles", path: "C:\\not-used\\cep3_tiles.hak", sha256: "d".repeat(64) }],
    git: {
      exactEmpty: true,
      expectedObjectCounts: { placeables: 0, doors: 0, creatures: 0, encounters: 0, items: 0, sounds: 0, stores: 0, triggers: 0, waypoints: 0, total: 0 },
    },
    gic: { required: true },
    noLocalToolsetAdapter: true,
  };
  writeFileSync(emptyAreaProfile, JSON.stringify(emptyArea));
  const emptyOutput = execFileSync(process.execPath, [resolve("backend/scripts/validate-aurora-toolset-binary-module-bootstrap.mjs"), "--mode", "dry-run", "--profile", emptyAreaProfile], { encoding: "utf8", cwd: dir });
  assert.match(emptyOutput, /binary_area_create_profile_schema_valid/);
  assert.match(emptyOutput, /area-create-empty-structural/);

  writeFileSync(emptyAreaProfile, JSON.stringify({ ...emptyArea, fixtures: [] }));
  assert.throws(
    () => execFileSync(process.execPath, [resolve("backend/scripts/validate-aurora-toolset-binary-module-bootstrap.mjs"), "--mode", "dry-run", "--profile", emptyAreaProfile], { encoding: "utf8", cwd: dir, stdio: "pipe" }),
    /binary_area_create_profile_forbidden_model_fixture_field/,
  );
} finally { rmSync(dir, { recursive: true, force: true }); }
