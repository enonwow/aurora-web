#!/usr/bin/env node
/**
 * Deterministic, read-only inventory of every tile exposed by the Area editor.
 *
 * This deliberately audits the original Aurora resource layers instead of the
 * web cache alone: a missing cached .mdl merely means it was not synced yet,
 * not that the game cannot supply the model.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertAreaTilePlaceholderEvidenceCoverage,
  loadAreaTilePlaceholderEvidenceProfile,
  resolveAreaTilePlaceholderEvidence
} from "./lib/area-tile-placeholder-evidence-profile.mjs";
import {
  parseAreaTilePlaceholderExclusionConfig
} from "./lib/area-tile-placeholder-exclusion-config.mjs";
import { indexErfModelResRefs } from "./lib/erf-model-source-index.mjs";
import { indexKeyModelSources } from "./lib/key-model-source-index.mjs";
import { loadSelectedAreaTilesetCorpus } from "./lib/area-tileset-source-corpus.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function option(argv, name, fallback) {
  const index = argv.indexOf(name);
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
}

const placeholderExclusion = parseAreaTilePlaceholderExclusionConfig(process.argv);
const options = {
  sourceRoot: option(process.argv, "--source-root", ".codex-tmp/module-blob-mirror/modules/current"),
  hakDirectory: option(process.argv, "--hak-directory", "/host/nwn-docs/hak"),
  dataDirectory: option(process.argv, "--data-directory", "/host/nwn-game/data"),
  outDirectory: option(process.argv, "--out-directory", ".codex-tmp/all-area-tiles-audit")
};

const sourceRoot = resolveFromRepo(options.sourceRoot);
const outDirectory = resolveFromRepo(options.outDirectory);
const placeholderEvidenceProfilePath = placeholderExclusion.profilePath
  ? resolveFromRepo(placeholderExclusion.profilePath)
  : null;

function resolveFromRepo(value) {
  return path.isAbsolute(value) ? value : path.resolve(repoRoot, value);
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function walk(directory, predicate) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(item, predicate));
    else if (entry.isFile() && predicate(item)) files.push(item);
  }
  return files;
}

function displayPath(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/gu, "/");
}

function resourceResref(filePath) {
  return normalize(path.basename(filePath, path.extname(filePath)));
}

function addSource(index, resref, source) {
  const sources = index.get(resref) ?? [];
  sources.push(source);
  index.set(resref, sources);
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function writeCsv(filePath, rows) {
  const headers = Object.keys(rows[0] ?? {});
  fs.writeFileSync(filePath, [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\n") + "\n");
}

const tilesetCorpus = loadSelectedAreaTilesetCorpus(sourceRoot);
const placeholderEvidenceProfile = placeholderExclusion.mode === "evidence-profile"
  ? loadAreaTilePlaceholderEvidenceProfile({
      profilePath: placeholderEvidenceProfilePath,
      expectedSha256: placeholderExclusion.profileSha256,
      evidenceRoot: repoRoot
    })
  : null;
fs.mkdirSync(outDirectory, { recursive: true });

const cachedModels = new Set(walk(sourceRoot, (filePath) => filePath.toLowerCase().endsWith(".mdl")).map(resourceResref));
const modelSources = new Map();
for (const filePath of walk(sourceRoot, (filePath) => filePath.toLowerCase().endsWith(".mdl"))) addSource(modelSources, resourceResref(filePath), { layer: "snapshot", reference: displayPath(filePath) });

const hakFiles = walk(options.hakDirectory, (filePath) => filePath.toLowerCase().endsWith(".hak"));
for (const hakPath of hakFiles) {
  for (const resref of indexErfModelResRefs(hakPath)) {
    addSource(modelSources, resref, { layer: "hak", reference: path.basename(hakPath) });
  }
}

const keyFiles = fs.existsSync(options.dataDirectory)
  ? fs.readdirSync(options.dataDirectory).filter((name) => /^nwn_.*\.key$/iu.test(name)).map((name) => path.join(options.dataDirectory, name))
  : [];
for (const keyPath of keyFiles) {
  for (const source of indexKeyModelSources(keyPath, {
    resourceRoot: path.dirname(options.dataDirectory)
  })) {
    addSource(modelSources, source.resRef, {
      layer: "bif",
      reference: `${path.basename(keyPath)}:${path.basename(source.bifPath)}`
    });
  }
}

const rows = [];
const tilesetRows = [];
const consumedPlaceholderEvidenceRowIds = new Set();
for (const tilesetEntry of tilesetCorpus.selectedTilesets) {
  const { tilesetResRef, setPath, setSha256, definition: set } = tilesetEntry;
  let resolved = 0;
  let cached = 0;
  let missingModelField = 0;
  let placeholders = 0;
  let unresolvedModels = 0;
  for (const tile of set.tiles) {
    const sources = tile.modelResRef ? modelSources.get(tile.modelResRef) ?? [] : [];
    const preferred = sources.find((source) => source.layer === "snapshot") ?? sources.find((source) => source.layer === "hak") ?? sources[0];
    const hasResolvedModel = Boolean(preferred);
    const intentionalPlaceholder = placeholderEvidenceProfile
      ? resolveAreaTilePlaceholderEvidence({
          profile: placeholderEvidenceProfile,
          tilesetResRef,
          tileId: tile.tileId,
          setSha256,
          modelResRef: tile.modelResRef,
          consumedRowIds: consumedPlaceholderEvidenceRowIds
        })
      : false;
    const placeholderEvidenceRow = intentionalPlaceholder
        ? placeholderEvidenceProfile?.rowsById.get(`${tilesetResRef}:${tile.tileId}`)
      : null;
    if (hasResolvedModel || intentionalPlaceholder) resolved += 1;
    if (tile.modelResRef && cachedModels.has(tile.modelResRef)) cached += 1;
    if (intentionalPlaceholder) placeholders += 1;
    else if (!tile.modelResRef) missingModelField += 1;
    else if (!hasResolvedModel) unresolvedModels += 1;
    rows.push({
      tilesetResRef,
      tilesetName: set.unlocalizedName ?? set.name ?? tilesetResRef,
      setSource: displayPath(setPath),
      tileId: tile.tileId,
      modelResRef: tile.modelResRef ?? "",
      modelStatus: intentionalPlaceholder ? "intentional_placeholder" : !tile.modelResRef ? "invalid_missing_model_field" : hasResolvedModel ? "source_resolved" : "source_missing",
      modelSourceLayer: preferred?.layer ?? "",
      modelSource: preferred?.reference ?? "",
      placeholderEvidenceProfileId: intentionalPlaceholder
        ? placeholderEvidenceProfile?.binding.profileId
        : "",
      placeholderEvidenceIds: placeholderEvidenceRow?.evidenceIds.join("|") ?? "",
      modelCachedInWebWorkspace: tile.modelResRef ? cachedModels.has(tile.modelResRef) : false,
      imageMap2D: tile.imageMap2D ?? "",
      orientation: tile.orientation ?? "",
      groupId: tile.groupId ?? "",
      groupIds: tile.groupIds ?? []
    });
  }
  tilesetRows.push({
    tilesetResRef,
    tilesetName: set.unlocalizedName ?? set.name ?? tilesetResRef,
    displayNameStrRef: set.displayNameStrRef ?? "",
    setSource: displayPath(setPath),
    tileCount: set.tiles.length,
    renderableOrPlaceholderCount: resolved,
    cachedModelCount: cached,
    intentionalPlaceholderCount: placeholders,
    tilesWithoutModelField: missingModelField,
    unresolvedModelCount: unresolvedModels,
    auditStatus: missingModelField > 0 ? "invalid_set" : unresolvedModels > 0 ? "missing_model_sources" : "all_render_contracts_resolved"
  });
}
if (placeholderEvidenceProfile) {
  assertAreaTilePlaceholderEvidenceCoverage(
    placeholderEvidenceProfile,
    consumedPlaceholderEvidenceRowIds
  );
}

const summary = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  scope: "Every selected .SET resource exposed by the Aurora-web Area editor; model resources are resolved from the current snapshot, all installed HAK archives, and installed NWN KEY/BIF indexes.",
  input: {
    sourceRoot: displayPath(sourceRoot),
    hakDirectory: options.hakDirectory,
    dataDirectory: options.dataDirectory,
    setSourceVariants: tilesetCorpus.setVariantPaths.length,
    selectedTilesets: tilesetCorpus.selectedTilesets.length,
    indexedHakFiles: hakFiles.length,
    indexedKeyFiles: keyFiles.map((filePath) => path.basename(filePath)),
    snapshotModelFiles: cachedModels.size,
    indexedModelResrefs: modelSources.size,
    placeholderExclusion: {
      mode: placeholderExclusion.mode,
      evidenceProfile: placeholderEvidenceProfile?.binding ?? null
    }
  },
  totals: {
    tiles: rows.length,
    tilesWithResolvedSource: rows.filter((row) => row.modelStatus === "source_resolved").length,
    intentionalPlaceholders: rows.filter((row) => row.modelStatus === "intentional_placeholder").length,
    tilesWithMissingSource: rows.filter((row) => row.modelStatus === "source_missing").length,
    tilesWithInvalidSetDefinition: rows.filter((row) => row.modelStatus === "invalid_missing_model_field").length,
    tilesWithModelAlreadyCached: rows.filter((row) => row.modelCachedInWebWorkspace).length,
    uniqueModels: new Set(rows.map((row) => row.modelResRef).filter(Boolean)).size
  },
  tilesets: tilesetRows
};

fs.writeFileSync(path.join(outDirectory, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
fs.writeFileSync(path.join(outDirectory, "tiles.json"), JSON.stringify(rows, null, 2) + "\n");
writeCsv(path.join(outDirectory, "tiles.csv"), rows);
writeCsv(path.join(outDirectory, "tilesets.csv"), tilesetRows);
const unresolvedRows = rows.filter((row) => row.modelStatus === "source_missing");
writeCsv(path.join(outDirectory, "unresolved-models.csv"), unresolvedRows);
const unresolvedTilesets = tilesetRows.filter((row) => row.unresolvedModelCount > 0);
const markdown = [
  "# Aurora-web full Area/tile audit",
  "",
  `Generated: ${summary.generatedAt}`,
  "",
  "## Scope and result",
  "",
  `- ${summary.input.selectedTilesets} selected tilesets, ${summary.totals.tiles} tile records, ${summary.totals.uniqueModels} unique Model resrefs.`,
  `- Indexed ${summary.input.indexedHakFiles} installed HAK archives and ${summary.input.indexedKeyFiles.join(", ")} before marking a model missing.`,
  `- ${summary.totals.tilesWithResolvedSource} tile records resolve to an installed source; ${summary.totals.intentionalPlaceholders} are exclusions certified by the bound placeholder evidence profile; ${summary.totals.tilesWithMissingSource} records reference an unresolved model. Exclusion mode: ${summary.input.placeholderExclusion.mode}.`,
  "",
  "## Audit status by tileset",
  "",
  "| tileset | name | tile records | intentional placeholders | unresolved models |",
  "|---|---|---:|---:|---:|",
  ...unresolvedTilesets.map((row) => `| ${row.tilesetResRef} | ${row.tilesetName.replace(/\|/gu, "\\|")} | ${row.tileCount} | ${row.intentionalPlaceholderCount} | ${row.unresolvedModelCount} |`),
  "",
  "`tiles.csv` is the per-tile proof; `unresolved-models.csv` is the actionable exception list; `tilesets.csv` is the aggregate matrix."
].join("\n") + "\n";
fs.writeFileSync(path.join(outDirectory, "README.md"), markdown);
console.log(JSON.stringify({ input: summary.input, totals: summary.totals }, null, 2));
