#!/usr/bin/env node
/* Central consumer-side contract for a project-owned, offline-built MOD.
 * It never creates a MOD and never opens Toolset/NWN. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = resolve(fileURLToPath(new URL(".", import.meta.url)));
const MODEL_PROFILE_VERSION = "aurora-toolset-binary-module-bootstrap-profile/v1";
const AREA_CREATE_PROFILE_VERSION = "aurora-toolset-binary-area-create-profile/v1";
const AREA_CREATE_PROOF_KIND = "area-create-empty-structural";
const DYNAMIC_PLACEABLE_PROFILE_VERSION = "aurora-toolset-binary-dynamic-placeable-profile/v1";
const DYNAMIC_PLACEABLE_PROOF_KIND = "dynamic-placeable-catalog-copy";
const DYNAMIC_PLACEABLE_SOURCE_PROFILE = "effective-catalog-utp-placeable-copy-v1";
const OBJECT_COUNT_KEYS = Object.freeze([
  "placeables", "doors", "creatures", "encounters", "items",
  "sounds", "stores", "triggers", "waypoints", "total",
]);
const TILE_FIELDS = Object.freeze([
  "row", "col", "tileId", "orientation", "height", "mainLight1", "mainLight2",
  "sourceLight1", "sourceLight2", "animLoop1", "animLoop2", "animLoop3",
]);

const options = parseArgs(process.argv.slice(2));
const profilePath = required(options.profile, "--profile");
const mode = required(options.mode, "--mode");
if (!["dry-run", "preflight"].includes(mode)) throw new Error("binary_bootstrap_mode_invalid");
const profile = JSON.parse(readFileSync(resolve(profilePath), "utf8"));
const profileKind = await validateProfile(profile, mode === "preflight");
if (mode === "dry-run") {
  print({
    ok: true,
    command: "validate-aurora-toolset-binary-module-bootstrap",
    mode,
    status: profileKind === AREA_CREATE_PROOF_KIND
      ? "binary_area_create_profile_schema_valid"
      : profileKind === DYNAMIC_PLACEABLE_PROOF_KIND
        ? "binary_dynamic_placeable_profile_schema_valid"
        : "binary_bootstrap_profile_schema_valid",
    profileKind,
    startsToolset: false,
    startsNwn: false,
    usesGlobalInput: false,
    noLocalToolsetAdapter: true,
  });
} else {
  print({
    ok: true,
    command: "validate-aurora-toolset-binary-module-bootstrap",
    mode,
    status: profileKind === AREA_CREATE_PROOF_KIND
      ? "binary_area_create_structural_readback_valid"
      : profileKind === DYNAMIC_PLACEABLE_PROOF_KIND
        ? "binary_dynamic_placeable_structural_readback_valid"
        : "binary_bootstrap_structural_readback_valid",
    profileKind,
    module: profile.module,
    area: profile.area,
    entryPoint: profileKind === AREA_CREATE_PROOF_KIND ? profile.moduleEntryPoint : profile.entryPoint,
    fixtures: profileKind === AREA_CREATE_PROOF_KIND ? [] : profile.fixtures,
    git: profileKind === AREA_CREATE_PROOF_KIND ? profile.git : undefined,
    gic: profileKind === AREA_CREATE_PROOF_KIND ? profile.gic : undefined,
    orderedHakList: profile.orderedHakList,
    startsToolset: false,
    startsNwn: false,
    usesGlobalInput: false,
    noNativeGeometryOrVisualProofClaimed: true,
  });
}

async function validateProfile(profile, inspect) {
  const profileKind = classifyProfile(profile);
  validateCommonProfile(profile);
  if (profileKind === AREA_CREATE_PROOF_KIND) validateAreaCreateProfile(profile);
  else if (profileKind === DYNAMIC_PLACEABLE_PROOF_KIND) validateDynamicPlaceableProfile(profile);
  else validateModelProfile(profile);
  if (inspect) await inspectProfile(profile, profileKind);
  return profileKind;
}

function classifyProfile(profile) {
  if (profile?.version === MODEL_PROFILE_VERSION) return "model-fixture-geometry";
  if (profile?.version === AREA_CREATE_PROFILE_VERSION && profile?.proofKind === AREA_CREATE_PROOF_KIND) {
    return AREA_CREATE_PROOF_KIND;
  }
  if (profile?.version === DYNAMIC_PLACEABLE_PROFILE_VERSION && profile?.proofKind === DYNAMIC_PLACEABLE_PROOF_KIND) {
    return DYNAMIC_PLACEABLE_PROOF_KIND;
  }
  throw new Error("binary_bootstrap_profile_identity_invalid");
}

function validateCommonProfile(profile) {
  if (!text(profile.id) || profile.noLocalToolsetAdapter !== true) {
    throw new Error("binary_bootstrap_profile_identity_invalid");
  }
  if (
    !resref(profile.module?.resref)
    || !text(profile.module?.path)
    || !sha256Value(profile.module?.sha256)
    || !resref(profile.area?.resref)
    || !positiveInteger(profile.area?.width)
    || !positiveInteger(profile.area?.height)
    || !Array.isArray(profile.orderedHakList)
    || profile.orderedHakList.length === 0
    || profile.orderedHakList.some((hak) => !hakName(hak.resref) || !text(hak.path) || !sha256Value(hak.sha256))
  ) {
    throw new Error("binary_bootstrap_profile_content_invalid");
  }
}

function validateModelProfile(profile) {
  if (!Array.isArray(profile.fixtures) || profile.fixtures.length === 0) {
    throw new Error("binary_bootstrap_profile_content_invalid");
  }
  if (
    profile.entryPoint?.area !== profile.area.resref
    || !vector(profile.entryPoint?.position)
    || profile.fixtures.some((fixture) =>
      !text(fixture.id)
      || !resref(fixture.templateResRef)
      || !Number.isInteger(fixture.appearanceType)
      || !vector(fixture.position))
  ) {
    throw new Error("binary_bootstrap_profile_binding_invalid");
  }
}

function validateAreaCreateProfile(profile) {
  if (Object.hasOwn(profile, "fixtures") || Object.hasOwn(profile, "entryPoint")) {
    throw new Error("binary_area_create_profile_forbidden_model_fixture_field");
  }
  if (
    !text(profile.area.displayName)
    || !text(profile.area.tag)
    || !resref(profile.area.tileSet)
    || !Array.isArray(profile.area.tiles)
    || profile.area.tiles.length !== profile.area.width * profile.area.height
    || !resref(profile.moduleEntryPoint?.area)
    || !vector(profile.moduleEntryPoint?.position)
    || profile.git?.exactEmpty !== true
    || profile.gic?.required !== true
  ) {
    throw new Error("binary_area_create_profile_content_invalid");
  }
  for (let index = 0; index < profile.area.tiles.length; index += 1) {
    const tile = profile.area.tiles[index];
    const expectedRow = Math.floor(index / profile.area.width);
    const expectedCol = index % profile.area.width;
    if (
      tile?.row !== expectedRow
      || tile?.col !== expectedCol
      || TILE_FIELDS.some((field) => !Number.isInteger(tile?.[field]))
      || tile.tileId < 0
      || tile.orientation < 0
      || tile.orientation > 3
    ) {
      throw new Error(`binary_area_create_profile_tile_invalid:${index}`);
    }
  }
  const counts = profile.git.expectedObjectCounts;
  if (
    !counts
    || Object.keys(counts).sort().join("|") !== [...OBJECT_COUNT_KEYS].sort().join("|")
    || OBJECT_COUNT_KEYS.some((key) => counts[key] !== 0)
  ) {
    throw new Error("binary_area_create_profile_expected_empty_git_invalid");
  }
}

function validateDynamicPlaceableProfile(profile) {
  const fixture = profile.fixture;
  const displayFixture = profile.fixtures?.[0];
  if (
    !text(profile.area?.displayName)
    || !resref(profile.entryPoint?.area)
    || !vector(profile.entryPoint?.position)
    || !Array.isArray(profile.fixtures)
    || profile.fixtures.length !== 1
    || !displayFixture
    || !text(displayFixture.id)
    || displayFixture.kind !== "placeable"
    || !resref(displayFixture.templateResRef)
    || !vector(displayFixture.position)
    || !fixture
    || fixture.ordinal !== 0
    || fixture.sourceProfileId !== DYNAMIC_PLACEABLE_SOURCE_PROFILE
    || !text(fixture.templateId)
    || !resref(fixture.templateResRef)
    || fixture.templateResRef !== displayFixture.templateResRef
    || !text(fixture.sourceObjectKey)
    || fixture.sourceObjectKey.length > 2048
    || fixture.sourceObjectKey.includes("\0")
    || !sha256Value(fixture.sourceSha256)
    || fixture.sourceFileType !== "UTP "
    || fixture.sourceFileVersion !== "V3.2"
    || fixture.sourceStructTypeId !== 0xffffffff
    || typeof fixture.tag !== "string"
    || !Number.isInteger(fixture.resolvedPortraitId)
    || fixture.resolvedPortraitId < 0
    || fixture.resolvedPortraitId > 0xffff
    || !vector(fixture.position)
    || !sameVector(fixture.position, displayFixture.position)
    || !Number.isFinite(fixture.bearing)
    || typeof fixture.gicComment !== "string"
  ) {
    throw new Error("binary_dynamic_placeable_profile_fixture_invalid");
  }
  const capture = profile.toolsetCapture;
  if (
    capture?.targetClass !== "TScrollBox"
    || capture.areaResRef !== profile.area.resref
    || capture.objectKind !== "placeable"
    || capture.objectOrdinal !== fixture.ordinal
    || capture.templateResRef !== fixture.templateResRef
    || !text(capture.artifactDirectory)
    || capture.viewportArtifact !== "viewport.png"
    || capture.resultArtifact !== "viewport.capture.json"
  ) {
    throw new Error("binary_dynamic_placeable_profile_capture_invalid");
  }
  const counts = profile.git?.expectedObjectCounts;
  if (
    !counts
    || Object.keys(counts).sort().join("|") !== [...OBJECT_COUNT_KEYS].sort().join("|")
    || counts.placeables !== 1
    || counts.total !== 1
    || OBJECT_COUNT_KEYS.some((key) => !["placeables", "total"].includes(key) && counts[key] !== 0)
  ) {
    throw new Error("binary_dynamic_placeable_profile_expected_git_invalid");
  }
  if (
    profile.gic?.required !== true
    || typeof profile.gic.expectedComment !== "string"
    || profile.gic.expectedComment !== fixture.gicComment
  ) {
    throw new Error("binary_dynamic_placeable_profile_comment_binding_invalid");
  }
}

async function inspectProfile(profile, profileKind) {
  const modulePath = resolve(profile.module.path);
  if (
    !existsSync(modulePath)
    || statSync(modulePath).size <= 0
    || basename(modulePath).toLowerCase() !== `${profile.module.resref}.mod`
  ) {
    throw new Error("binary_bootstrap_module_identity_invalid");
  }
  if (sha(modulePath) !== profile.module.sha256) throw new Error("binary_bootstrap_module_hash_mismatch");
  for (const hak of profile.orderedHakList) {
    const path = resolve(hak.path);
    if (!existsSync(path) || sha(path) !== hak.sha256) {
      throw new Error(`binary_bootstrap_hak_hash_mismatch:${hak.resref}`);
    }
  }

  const area = atom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", modulePath, "--area", profile.area.resref]);
  if (
    area.width !== profile.area.width
    || area.height !== profile.area.height
    || area.tileCount !== profile.area.width * profile.area.height
    || area.completeTileList !== true
  ) {
    throw new Error("binary_bootstrap_area_structure_mismatch");
  }

  const entry = atom("read-aurora-toolset-bootstrap-entry-readback.mjs", ["--module", modulePath]);
  const expectedEntry = profileKind === AREA_CREATE_PROOF_KIND ? profile.moduleEntryPoint : profile.entryPoint;
  if (entry.area !== expectedEntry.area.toLowerCase() || !sameVector(entry.position, expectedEntry.position)) {
    throw new Error("binary_bootstrap_entry_readback_mismatch");
  }

  const git = atom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", modulePath, "--area", profile.area.resref]);
  if (profileKind === AREA_CREATE_PROOF_KIND) {
    validateAreaCreateReadback(profile, area, git);
  } else if (profileKind === DYNAMIC_PLACEABLE_PROOF_KIND) {
    validateDynamicPlaceableReadback(profile, git);
  } else {
    validateModelReadback(profile, git);
  }

  const require = createRequire(import.meta.url);
  process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" });
  require("ts-node/register/transpile-only");
  const { readNwnErfResourceIndex, readNwnErfResourceFromIndex } = require("../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service");
  const { extractModuleIfoHakList } = require("../src/modules/runtime-settings/application/runtime-settings.application.service");
  const index = await readNwnErfResourceIndex(modulePath);
  if (!index) throw new Error("binary_bootstrap_module_index_missing");
  if (profileKind === AREA_CREATE_PROOF_KIND || profileKind === DYNAMIC_PLACEABLE_PROOF_KIND) {
    const gic = await readNwnErfResourceFromIndex(modulePath, index, profile.area.resref, 2046);
    if (!gic || gic.length === 0) throw new Error("binary_area_create_gic_readback_missing");
    if (profileKind === DYNAMIC_PLACEABLE_PROOF_KIND) {
      validateDynamicPlaceableGicReadback(profile, gic);
    }
  }
  const ifo = await readNwnErfResourceFromIndex(modulePath, index, "module", 2014);
  const actualHaks = ifo ? extractModuleIfoHakList(ifo) : null;
  if (!Array.isArray(actualHaks) || JSON.stringify(actualHaks.map(String)) !== JSON.stringify(profile.orderedHakList.map((hak) => hak.resref))) {
    throw new Error(`binary_bootstrap_ordered_hak_list_mismatch:${JSON.stringify({ expected: profile.orderedHakList.map((hak) => hak.resref), actual: actualHaks })}`);
  }
}

function validateAreaCreateReadback(profile, area, git) {
  if (
    area.displayName !== profile.area.displayName
    || area.tag !== profile.area.tag
    || area.tileSet !== profile.area.tileSet.toLowerCase()
  ) {
    throw new Error("binary_area_create_area_metadata_mismatch");
  }
  const expectedTiles = profile.area.tiles.map(projectTile);
  const actualTiles = Array.isArray(area.tiles) ? area.tiles.map(projectTile) : null;
  if (!actualTiles || JSON.stringify(actualTiles) !== JSON.stringify(expectedTiles)) {
    throw new Error("binary_area_create_tile_readback_mismatch");
  }
  if (JSON.stringify(git.objectCounts) !== JSON.stringify(profile.git.expectedObjectCounts)) {
    throw new Error("binary_area_create_git_not_exactly_empty");
  }
}

function validateModelReadback(profile, git) {
  if (!Array.isArray(git.creatures) || git.creatures.length !== profile.fixtures.length) {
    throw new Error("binary_bootstrap_fixture_count_mismatch");
  }
  for (let index = 0; index < profile.fixtures.length; index += 1) {
    const expected = profile.fixtures[index];
    const actual = git.creatures[index];
    if (
      actual.templateResRef !== expected.templateResRef.toLowerCase()
      || actual.appearanceType !== expected.appearanceType
      || !sameVector(actual.position, expected.position)
    ) {
      throw new Error(`binary_bootstrap_fixture_readback_mismatch:${expected.id}`);
    }
  }
}

function validateDynamicPlaceableReadback(profile, git) {
  const expected = profile.fixture;
  const actual = Array.isArray(git.placeables) && git.placeables.length === 1
    ? git.placeables[0]
    : null;
  if (
    JSON.stringify(git.objectCounts) !== JSON.stringify(profile.git.expectedObjectCounts)
    || !actual
    || actual.templateResRef !== expected.templateResRef.toLowerCase()
    || actual.tag !== expected.tag
    || actual.portraitId !== expected.resolvedPortraitId
    || !sameVector(actual.position, expected.position)
    || actual.bearing !== expected.bearing
  ) {
    throw new Error("binary_dynamic_placeable_git_readback_mismatch");
  }
}

function validateDynamicPlaceableGicReadback(profile, bytes) {
  const require = createRequire(import.meta.url);
  process.env.TS_NODE_COMPILER_OPTIONS = JSON.stringify({ module: "CommonJS", moduleResolution: "node" });
  require("ts-node/register/transpile-only");
  const { parseRawGffDocument } = require("../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser");
  const document = parseRawGffDocument(Buffer.from(bytes));
  const lists = document?.fields?.filter((field) => field.label === "Placeable List" && field.type === "list") ?? [];
  const placeable = lists.length === 1 && lists[0].value.length === 1 ? lists[0].value[0] : null;
  const comments = placeable?.fields?.filter((field) => field.label === "Comment" && field.type === "cexostring") ?? [];
  if (
    document?.fileType !== "GIC "
    || document.fileVersion !== "V3.2"
    || placeable?.typeId !== 9
    || comments.length !== 1
    || comments[0].value !== profile.gic.expectedComment
  ) {
    throw new Error("binary_dynamic_placeable_gic_readback_mismatch");
  }
}

function projectTile(tile) {
  return Object.fromEntries(TILE_FIELDS.map((field) => [field, tile?.[field]]));
}

function atom(name, args) {
  return JSON.parse(execFileSync(process.execPath, [resolve(here, name), ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 60_000,
  }).trim());
}
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid:${key ?? "end"}`); result[key.slice(2)] = value; } return result; }
function required(value, name) { if (!value) throw new Error(`missing:${name}`); return value; }
function text(value) { return typeof value === "string" && value.trim().length > 0; }
function resref(value) { return typeof value === "string" && /^[a-z0-9_]{1,32}$/iu.test(value); }
function hakName(value) { return typeof value === "string" && /^[a-z0-9_+!-]{1,32}$/iu.test(value); }
function positiveInteger(value) { return Number.isInteger(value) && value > 0; }
function vector(value) { return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite); }
function sameVector(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function sha256Value(value) { return /^[a-f0-9]{64}$/u.test(value ?? ""); }
function sha(path) { return createHash("sha256").update(readFileSync(path)).digest("hex"); }
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
