#!/usr/bin/env node
/**
 * Binds a verified source-targeted selection transaction to the selection
 * outline visible in a later, read-only live viewport observation.  Camera
 * navigation changes screen coordinates, not the selected source tile, so a
 * previous selection centre must never be reused after panning.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { analyzeAuroraToolsetSelectionAnchor } from "./analyze-aurora-toolset-selection-anchor.mjs";

const options = parseArgs(process.argv.slice(2));
const sourceSelectionPath = requiredFile(options.sourceSelection, "--sourceSelection");
const observationPath = requiredFile(options.observation, "--observation");
const outPath = resolve(requiredText(options.out, "--out"));
const sourceSelection = readJson(sourceSelectionPath);
const observation = readJson(observationPath);

const capturePath = requiredFile(observation?.capture?.viewportPng, "observation.capture.viewportPng");
const blockers = [];
if (sourceSelection?.status !== "verified" || sourceSelection?.evidenceKind !== "source-targeted-visual-selection/v1") {
  blockers.push("source_targeted_selection_unverified");
}
if (!sourceSelection?.sourceTile) blockers.push("source_tile_identity_missing");
if (!observation?.target?.areaResref) blockers.push("observation_area_missing");
if (String(sourceSelection?.plan?.area ?? "").toLowerCase() !== String(observation?.target?.areaResref ?? "").toLowerCase()) {
  blockers.push("source_selection_observation_area_mismatch");
}

const currentAnchor = analyzeAuroraToolsetSelectionAnchor({ imagePath: capturePath });
if (!currentAnchor?.acceptance?.accepted) blockers.push(currentAnchor?.acceptance?.blockerCode ?? "current_selection_anchor_unavailable");
const result = {
  version: "aurora-toolset-focused-tile-proof/v1",
  status: blockers.length === 0 ? "verified" : "blocked",
  evidenceKind: "source-targeted-visual-selection/v1",
  semanticClaim: blockers.length === 0
    ? "The source tile was selected by the verified transaction; later targeted camera navigation preserved its visible selection outline while changing only its screen position."
    : "No focused-tile claim is made because the identity-to-current-outline chain is incomplete.",
  sourceTile: sourceSelection?.sourceTile ?? null,
  selectionCenter: currentAnchor?.selectionAnchor?.center ?? null,
  selectionOutline: currentAnchor?.selectionAnchor?.bounds ?? null,
  capturePath,
  observationPath,
  sourceSelectionPath,
  chain: {
    sourceIdentity: {
      status: sourceSelection?.status ?? null,
      evidenceKind: sourceSelection?.evidenceKind ?? null,
      sourceTile: sourceSelection?.sourceTile ?? null,
    },
    currentVisualAnchor: {
      status: currentAnchor?.status ?? null,
      acceptance: currentAnchor?.acceptance ?? null,
      selectionAnchor: currentAnchor?.selectionAnchor ?? null,
    },
    rule: "Screen centre is read from the current PNG. Source identity is inherited only from the earlier verified source-targeted selection transaction; a blue outline alone is never treated as a tile identity.",
  },
  blockers,
  generatedAt: new Date().toISOString(),
};
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: result.status, outPath, blockerCodes: blockers, result }, null, 2));
process.exitCode = result.status === "verified" ? 0 : 2;

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for ${token}.`);
    result[token.slice(2)] = value;
    index += 1;
  }
  return result;
}
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function requiredText(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
function requiredFile(value, name) { const path = resolve(requiredText(value, name)); if (!existsSync(path)) throw new Error(`${name} does not exist: ${path}`); return path; }
