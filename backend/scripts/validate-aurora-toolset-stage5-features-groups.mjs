#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const packet = resolve(repoRoot, "backend/docs/aurora-reverse/evidence/stage5-live-2026-07-16/s05-03-features-groups");
const featurePacket = resolve(packet, "../s05-01-single-tile");

function readJson(path) {
  const buffer = readFileSync(path);
  const encoding = buffer[0] === 0xff && buffer[1] === 0xfe ? "utf16le" : "utf8";
  return JSON.parse(buffer.toString(encoding).replace(/^\uFEFF/, ""));
}

const featureAction = readJson(resolve(featurePacket, "area001-feature-1x1-action.json"));
const featureDiff = readJson(resolve(featurePacket, "area001-feature-1x1-diff.json"));
const palette = readJson(resolve(packet, "group-palette-readback.json"));
const groupDiff = readJson(resolve(packet, "group-diff.json"));
const rollback = readJson(resolve(packet, "group-rollback.json"));
const baselineManifest = readJson(resolve(groupDiff.baseline, "manifest.json"));
const afterManifest = readJson(resolve(groupDiff.after, "manifest.json"));

const expected = [
  [19, 2, 3, 1774, 3], [20, 2, 4, 1145, 0], [21, 2, 5, 91, 3], [22, 2, 6, 91, 0],
  [27, 3, 3, 1475, 2], [28, 3, 4, 1775, 0], [29, 3, 5, 1776, 0], [30, 3, 6, 1622, 1],
  [35, 4, 3, 92, 3], [36, 4, 4, 1777, 0], [37, 4, 5, 1778, 0], [38, 4, 6, 93, 0],
  [43, 5, 3, 263, 2], [44, 5, 4, 302, 1], [45, 5, 5, 1470, 2], [46, 5, 6, 1622, 1],
];
const actual = groupDiff.changes.map(({ index, after }) => [index, after.row, after.col, after.tileId, after.orientation]);
const stableFields = ["height", "mainLight1", "mainLight2", "sourceLight1", "sourceLight2", "animLoop1", "animLoop2", "animLoop3"];
const exactGroupLeaves = palette.tree.nodes.filter((node) => node.text === "Small square (2x2)" && node.hasChildren === false);

const checks = {
  featurePlacementProven: featureAction.ok === true && featureAction.action?.selectedText === "Ground with grass patch" && featureDiff.changedCount === 1,
  exactGroupPaletteIdentity: exactGroupLeaves.length === 1 && exactGroupLeaves[0].depth === 2,
  exactContiguousFootprint: groupDiff.changedCount === 16 && JSON.stringify(actual) === JSON.stringify(expected),
  sourceFieldsStable: groupDiff.changes.every((change) => stableFields.every((field) => change.before[field] === change.after[field])),
  sourceIdentityStable: baselineManifest.areaResref === "area001" && afterManifest.areaResref === "area001" && baselineManifest.parsed.are.tileSet === "tcm02" && afterManifest.parsed.are.tileCount === 64,
  objectCountsStable: JSON.stringify(baselineManifest.parsed.git.counts) === JSON.stringify(afterManifest.parsed.git.counts) && afterManifest.parsed.git.counts.total === 1,
  completeRollback: rollback.ok === true && rollback.tileCount === 64 && rollback.changedCount === 0,
  noGlobalInput: featureAction.safety?.usesGlobalCursor === false && featureAction.safety?.usesGlobalKeyboard === false && featureAction.safety?.usesGlobalMouse === false && palette.safety?.usesGlobalCursor === false && palette.safety?.usesGlobalKeyboard === false && palette.safety?.usesGlobalMouse === false,
  proofPacksExist: [groupDiff.baseline, groupDiff.after, rollback.baseline, rollback.rollback].every((path) => existsSync(path)),
};

const passed = Object.values(checks).filter(Boolean).length;
const result = {
  ok: passed === Object.keys(checks).length,
  stage: "AUR-S05-03",
  acceptedFunctions: passed === Object.keys(checks).length ? ["AUR-S05-03"] : [],
  checks,
  passed,
  total: Object.keys(checks).length,
  note: "The declared 2x2 group produced a saved 4x4 source footprint including the surrounding transition/autotile border; every affected tile is enumerated.",
};
writeFileSync(resolve(packet, "validation.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
