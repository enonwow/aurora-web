#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const evidenceDir = resolve(required(options.evidenceDir, "--evidenceDir"));
const outPath = options.out ? resolve(options.out) : null;
const failures = [];

const create = json("fresh-area007-rural-create.json");
const resize = json("area007-rural-positive-resize-small.json");
const packed = json("area007-sparse-packed-readback.json");
const source = json(join("area007-sparse-source-pack", "raw.are.summary.json"));
const manifest = json(join("area007-sparse-source-pack", "manifest.json"));
const audit = text("sparse-grid-fill-av-audit.md");
const screenshotPath = join(evidenceDir, "area007-sparse-4x4-frame.png");

check(create?.ok === true && create?.wizard?.expectedClass === "TdlgAreaWizard", "fresh_area_wizard_not_verified");
check(create?.wizard?.selectionProof?.tileset === "Rural" && create?.wizard?.selectionProof?.selectedIndex === 24, "fresh_area_tileset_not_rural");
check(create?.wizard?.selectionProof?.size === "Tiny" && create?.wizard?.selectionProof?.sizeIndex === 0, "fresh_area_size_not_tiny");
check(safeMutation(create), "fresh_area_creation_safety_contract_failed");

const action = resize?.dialog?.action;
check(resize?.ok === true && resize?.menu?.commandId === 63 && resize?.dialog?.className === "TfrmAreaResize", "native_resize_identity_mismatch");
check(action?.preset?.text === "Small" && action?.preset?.index === 1, "native_resize_preset_mismatch");
check(action?.preset?.viewerDimensionsBefore?.rows === 2 && action?.preset?.viewerDimensionsBefore?.columns === 2, "live_baseline_dimensions_not_2x2");
check(action?.viewerDimensionsAfterCommit?.rows === 4 && action?.viewerDimensionsAfterCommit?.columns === 4, "live_committed_dimensions_not_4x4");
check(resize?.final?.moduleDirty === true && safeMutation(resize), "native_resize_commit_or_safety_failed");
check(resize?.safety?.directDimensionWrites === false, "direct_dimension_write_detected");

const area = packed?.areas?.find((candidate) => candidate.resref === "area007");
check(packed?.ok === true && area?.width === 4 && area?.height === 4, "packed_area_dimensions_not_4x4");
check(area?.tileSet === "ttr01" && area?.tileCount === 4 && area?.hasGit === true && area?.hasGic === true, "packed_sparse_area_identity_mismatch");
check(source?.parsed?.width === 4 && source?.parsed?.height === 4 && source?.parsed?.tileCount === 4, "source_pack_sparse_geometry_mismatch");
check(source?.parsed?.name === "Area 006" && source?.parsed?.tag === "Area006" && source?.parsed?.tileSet === "ttr01", "source_pack_area_identity_mismatch");
check(manifest?.parsed?.git?.counts?.total === 0 && manifest?.parsed?.gic?.status === "present", "source_pack_git_or_gic_mismatch");

check(existsSync(screenshotPath) && statSync(screenshotPath).size > 0, "sparse_grid_screenshot_missing");
check(/tile cells/u.test(audit) && /Tile_List\.length == Width \* Height/u.test(audit), "audit_missing_tile_cell_invariant");
check(/0066C289/u.test(audit) && /00000020/u.test(audit) && /00683333/u.test(audit), "audit_missing_exact_access_violations");
check(/zakończyć dokładną scratch sesję Toolsetu/u.test(audit) && /trasę odrzuconą/u.test(audit), "audit_missing_fail_close_rule");

const expectedSlots = (source?.parsed?.width ?? 0) * (source?.parsed?.height ?? 0);
const populatedTiles = source?.parsed?.tileCount ?? 0;
const emptySlots = expectedSlots - populatedTiles;
check(expectedSlots === 16 && populatedTiles === 4 && emptySlots === 12, "sparse_slot_count_mismatch");

const result = {
  ok: failures.length === 0,
  status: failures.length === 0 ? "verified-negative" : "failed",
  standardId: "AUR-S05-06",
  outcome: "resize-expansion-rejected-for-production",
  evidenceDir,
  checks: {
    baseline: { width: action?.preset?.viewerDimensionsBefore?.columns ?? null, height: action?.preset?.viewerDimensionsBefore?.rows ?? null, tileSet: create?.wizard?.selectionProof?.tileset ?? null },
    committedLive: action?.viewerDimensionsAfterCommit ?? null,
    packed: { width: area?.width ?? null, height: area?.height ?? null, tileCount: area?.tileCount ?? null },
    grid: { expectedSlots, populatedTiles, emptySlots },
    exactAv: ["0066C289/00000020", "00683333/0000003C"],
    invariant: "Tile_List.length == Width * Height",
    acceptedForProduction: false,
  },
  failureCount: failures.length,
  failures,
};

if (outPath) { mkdirSync(dirname(outPath), { recursive: true }); writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8"); }
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 2;

function safeMutation(value) { return value?.final?.unexpectedWindowCount === 0 && value?.final?.frameEnabled === true && value?.safety?.globalCursor === false && value?.safety?.globalKeyboard === false && value?.safety?.globalMouse === false && value?.safety?.syntheticFocus === false; }
function json(relativePath) { const path = join(evidenceDir, relativePath); if (!existsSync(path)) { failures.push(`missing:${relativePath}`); return null; } try { return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/u, "")); } catch { failures.push(`invalid_json:${relativePath}`); return null; } }
function text(relativePath) { const path = join(evidenceDir, relativePath); if (!existsSync(path)) { failures.push(`missing:${relativePath}`); return ""; } return readFileSync(path, "utf8").replace(/^\uFEFF/u, ""); }
function check(value, code) { if (!value) failures.push(code); }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function parseArgs(argv) { const result = {}; for (let index = 0; index < argv.length; index += 2) { const key = argv[index], value = argv[index + 1]; if (!key?.startsWith("--") || value === undefined) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); result[key.slice(2)] = value; } return result; }
