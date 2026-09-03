#!/usr/bin/env node

import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

import { parseAuroraTilesetEditingDefinition } from "../src/modules/areas/adapters/outbound/blob/aurora-set-tileset-parser";

const CATALOG_SCHEMA = "aurora-tileset-definition-catalog/v2";
const RESULT_SCHEMA = "aurora-tileset-definition-catalog-result/v2";
const SHA256 = /^[a-f0-9]{64}$/u;
const RESREF = /^[a-z0-9_]{1,16}$/u;
const MODEL_SOURCE_STATUSES = new Set([
  "source_resolved",
  "source_missing",
  "intentional_placeholder",
  "invalid_missing_model_field"
]);
const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");

interface ParsedArguments {
  readonly selectionInventory: string;
  readonly selectionInventorySha256: string;
  readonly modelSourceInventory: string;
  readonly modelSourceInventorySha256: string;
  readonly outDirectory: string;
}

interface SelectionTileset {
  readonly tilesetResRef?: unknown;
  readonly setSource?: unknown;
  readonly tileCount?: unknown;
}

interface SelectionInventory {
  readonly schemaVersion?: unknown;
  readonly generatedAt?: unknown;
  readonly input?: {
    readonly sourceRoot?: unknown;
    readonly selectedTilesets?: unknown;
  };
  readonly totals?: { readonly tiles?: unknown };
  readonly tilesets?: unknown;
}

interface ModelSourceInventoryRow {
  readonly tilesetResRef?: unknown;
  readonly tileId?: unknown;
  readonly modelResRef?: unknown;
  readonly modelStatus?: unknown;
  readonly modelSourceLayer?: unknown;
  readonly modelSource?: unknown;
}

interface ValidatedModelSourceInventoryRow {
  readonly tilesetResRef: string;
  readonly tileId: number;
  readonly modelResRef: string;
  readonly modelStatus:
    | "source_resolved"
    | "source_missing"
    | "intentional_placeholder"
    | "invalid_missing_model_field";
  readonly modelSourceLayer: string;
  readonly modelSource: string;
}

interface CatalogEntry {
  readonly tilesetResRef: string;
  readonly sourcePath: string;
  readonly sourceKey: string;
  readonly sourceSha256: string;
  readonly definitionPath: string;
  readonly definitionSha256: string;
  readonly tileCount: number;
  readonly groupCount: number;
  readonly diagnosticCount: number;
}

function option(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function requireOption(argv: readonly string[], name: string): string {
  const value = option(argv, name)?.trim();
  if (!value) throw new Error(`Missing required ${name} <value>.`);
  return value;
}

function parseArguments(argv: readonly string[]): ParsedArguments {
  const selectionInventory = path.resolve(process.cwd(), requireOption(argv, "--selection-inventory"));
  const selectionInventorySha256 = requireOption(argv, "--selection-inventory-sha256").toLowerCase();
  const modelSourceInventory = path.resolve(process.cwd(), requireOption(argv, "--model-source-inventory"));
  const modelSourceInventorySha256 = requireOption(argv, "--model-source-inventory-sha256").toLowerCase();
  const outDirectory = path.resolve(process.cwd(), requireOption(argv, "--out-directory"));
  if (!SHA256.test(selectionInventorySha256)) {
    throw new Error("--selection-inventory-sha256 must be an exact lowercase SHA-256.");
  }
  if (!SHA256.test(modelSourceInventorySha256)) {
    throw new Error("--model-source-inventory-sha256 must be an exact lowercase SHA-256.");
  }
  if (samePath(outDirectory, repoRoot) || !isInside(path.dirname(outDirectory), outDirectory)) {
    throw new Error("--out-directory must name one exact child directory, not the repository root.");
  }
  return {
    selectionInventory,
    selectionInventorySha256,
    modelSourceInventory,
    modelSourceInventorySha256,
    outDirectory
  };
}

function samePath(left: string, right: string): boolean {
  const normalizedLeft = path.resolve(left);
  const normalizedRight = path.resolve(right);
  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

function isInside(parentDirectory: string, candidatePath: string): boolean {
  const relative = path.relative(path.resolve(parentDirectory), path.resolve(candidatePath));
  return relative.length > 0 && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function sha256Bytes(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function displayPath(filePath: string): string {
  const absolute = path.resolve(filePath);
  return isInside(repoRoot, absolute)
    ? path.relative(repoRoot, absolute).replaceAll("\\", "/")
    : absolute.replaceAll("\\", "/");
}

function sourceKey(setSource: string, tilesetResRef: string): string {
  const normalized = setSource.replaceAll("\\", "/").replace(/^\.\//u, "");
  const marker = "modules/current/";
  const markerIndex = normalized.toLowerCase().indexOf(marker);
  const key = markerIndex >= 0 ? normalized.slice(markerIndex) : normalized;
  if (!key.toLowerCase().endsWith(`/${tilesetResRef}.set`) || key.startsWith("/") || key.includes("../")) {
    throw new Error(`Tileset ${tilesetResRef} has an invalid source key: ${key}.`);
  }
  return key;
}

function atomicWrite(filePath: string, text: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(temporaryPath, text, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function loadSelection(filePath: string, expectedSha256: string): SelectionInventory {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Selection inventory is missing: ${filePath}.`);
  }
  const bytes = fs.readFileSync(filePath);
  const observedSha256 = sha256Bytes(bytes);
  if (observedSha256 !== expectedSha256) {
    throw new Error(`Selection inventory SHA-256 mismatch: expected ${expectedSha256}, observed ${observedSha256}.`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Selection inventory is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Selection inventory must be a JSON object.");
  }
  return parsed as SelectionInventory;
}

function validateSelection(selection: SelectionInventory): readonly SelectionTileset[] {
  if (selection.schemaVersion !== 1 || typeof selection.generatedAt !== "string") {
    throw new Error("Selection inventory schemaVersion/generatedAt is invalid.");
  }
  if (!Array.isArray(selection.tilesets) || selection.tilesets.length === 0) {
    throw new Error("Selection inventory must contain at least one selected tileset.");
  }
  if (typeof selection.input?.sourceRoot !== "string" || !selection.input.sourceRoot.trim()) {
    throw new Error("Selection inventory sourceRoot is invalid.");
  }
  if (selection.input?.selectedTilesets !== selection.tilesets.length) {
    throw new Error("Selection inventory selectedTilesets does not equal its exact tileset membership.");
  }
  const declaredTiles = selection.tilesets.reduce((sum, entry) => {
    const tileCount = (entry as SelectionTileset)?.tileCount;
    return sum + (Number.isInteger(tileCount) ? Number(tileCount) : 0);
  }, 0);
  if (selection.totals?.tiles !== declaredTiles) {
    throw new Error("Selection inventory tile total does not equal its exact tileset membership.");
  }
  return selection.tilesets as readonly SelectionTileset[];
}

function normalizeModelResRef(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function modelDeclarationMatchesInventory(
  declaration: unknown,
  sourceRow: ValidatedModelSourceInventoryRow
): boolean {
  return normalizeModelResRef(declaration) === sourceRow.modelResRef;
}

function loadModelSourceInventory(
  filePath: string,
  expectedSha256: string
): readonly ValidatedModelSourceInventoryRow[] {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Model source inventory is missing: ${filePath}.`);
  }
  const bytes = fs.readFileSync(filePath);
  const observedSha256 = sha256Bytes(bytes);
  if (observedSha256 !== expectedSha256) {
    throw new Error(
      `Model source inventory SHA-256 mismatch: expected ${expectedSha256}, observed ${observedSha256}.`
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("Model source inventory is not valid JSON.");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Model source inventory must be a non-empty JSON array.");
  }
  const seen = new Set<string>();
  return parsed.map((value, index) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`Model source inventory row ${index} is not an object.`);
    }
    const row = value as ModelSourceInventoryRow;
    const tilesetResRef = typeof row.tilesetResRef === "string"
      ? row.tilesetResRef.trim().toLowerCase()
      : "";
    const tileId = Number(row.tileId);
    const modelResRef = normalizeModelResRef(row.modelResRef);
    const modelStatus = typeof row.modelStatus === "string"
      ? row.modelStatus.trim().toLowerCase()
      : "";
    const modelSourceLayer = typeof row.modelSourceLayer === "string"
      ? row.modelSourceLayer.trim()
      : "";
    const modelSource = typeof row.modelSource === "string"
      ? row.modelSource.trim()
      : "";
    if (!RESREF.test(tilesetResRef) || !Number.isInteger(tileId) || tileId < 0) {
      throw new Error(`Model source inventory row ${index} has an invalid tile identity.`);
    }
    if (!MODEL_SOURCE_STATUSES.has(modelStatus)) {
      throw new Error(`Model source inventory row ${tilesetResRef}:${tileId} has unsupported modelStatus ${modelStatus || "<missing>"}.`);
    }
    if (modelStatus === "invalid_missing_model_field" ? modelResRef.length > 0 : modelResRef.length === 0) {
      throw new Error(`Model source inventory row ${tilesetResRef}:${tileId} has a modelResRef/status mismatch.`);
    }
    if (modelStatus === "source_resolved" && (!modelSourceLayer || !modelSource)) {
      throw new Error(`Resolved model source inventory row ${tilesetResRef}:${tileId} lacks source provenance.`);
    }
    const key = `${tilesetResRef}:${tileId}`;
    if (seen.has(key)) {
      throw new Error(`Model source inventory contains duplicate row ${key}.`);
    }
    seen.add(key);
    return {
      tilesetResRef,
      tileId,
      modelResRef,
      modelStatus: modelStatus as ValidatedModelSourceInventoryRow["modelStatus"],
      modelSourceLayer,
      modelSource
    };
  });
}

function compileCatalog(args: ParsedArguments): {
  readonly catalogPath: string;
  readonly catalogSha256: string;
  readonly summary: {
    readonly tilesetCount: number;
    readonly totalTileCount: number;
    readonly totalGroupCount: number;
    readonly totalDiagnosticCount: number;
    readonly sourceResolvedTileCount: number;
    readonly sourceMissingTileCount: number;
    readonly intentionalPlaceholderTileCount: number;
    readonly invalidMissingModelFieldTileCount: number;
  };
} {
  if (fs.existsSync(args.outDirectory)) {
    throw new Error(`Catalog output already exists; use a new immutable directory: ${args.outDirectory}.`);
  }
  const selection = loadSelection(args.selectionInventory, args.selectionInventorySha256);
  const selectedTilesets = validateSelection(selection);
  const modelSourceRows = loadModelSourceInventory(
    args.modelSourceInventory,
    args.modelSourceInventorySha256
  );
  const modelSourceRowsById = new Map(
    modelSourceRows.map((row) => [`${row.tilesetResRef}:${row.tileId}`, row])
  );
  const consumedModelSourceRows = new Set<string>();
  const stagingDirectory = `${args.outDirectory}.tmp-${process.pid}`;
  if (fs.existsSync(stagingDirectory)) {
    throw new Error(`Catalog staging directory already exists: ${stagingDirectory}.`);
  }

  try {
    const seenResRefs = new Set<string>();
    const entries: CatalogEntry[] = [];
    for (const rawEntry of [...selectedTilesets].sort((left, right) =>
      String(left.tilesetResRef).localeCompare(String(right.tilesetResRef)))) {
      const tilesetResRef = typeof rawEntry.tilesetResRef === "string"
        ? rawEntry.tilesetResRef.trim().toLowerCase()
        : "";
      const setSource = typeof rawEntry.setSource === "string" ? rawEntry.setSource.trim() : "";
      const tileCount = Number(rawEntry.tileCount);
      if (!RESREF.test(tilesetResRef) || seenResRefs.has(tilesetResRef)) {
        throw new Error(`Selection contains an invalid or duplicate tileset ResRef: ${tilesetResRef || "<missing>"}.`);
      }
      if (!setSource || !Number.isInteger(tileCount) || tileCount < 0) {
        throw new Error(`Selection entry ${tilesetResRef} has an invalid source or tile count.`);
      }
      const sourcePath = path.isAbsolute(setSource) ? path.resolve(setSource) : path.resolve(repoRoot, setSource);
      if (!isInside(repoRoot, sourcePath) || path.basename(sourcePath).toLowerCase() !== `${tilesetResRef}.set`) {
        throw new Error(`Selection source for ${tilesetResRef} must be its exact repository-local SET file.`);
      }
      if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) {
        throw new Error(`Selection source for ${tilesetResRef} is missing: ${sourcePath}.`);
      }
      const bytes = fs.readFileSync(sourcePath);
      const sourceSha256 = sha256Bytes(bytes);
      const parsedDefinition = parseAuroraTilesetEditingDefinition(bytes, tilesetResRef);
      if (parsedDefinition.tilesetResRef !== tilesetResRef || parsedDefinition.fingerprint !== sourceSha256) {
        throw new Error(`Parsed definition for ${tilesetResRef} does not bind the exact SET bytes.`);
      }
      if (parsedDefinition.tiles.length !== tileCount) {
        throw new Error(
          `Parsed definition for ${tilesetResRef} has ${parsedDefinition.tiles.length} tiles; selection declares ${tileCount}.`
        );
      }
      const definition = {
        ...parsedDefinition,
        tiles: parsedDefinition.tiles.map((tile) => {
          const key = `${tilesetResRef}:${tile.tileId}`;
          const sourceRow = modelSourceRowsById.get(key);
          if (!sourceRow) {
            throw new Error(`Model source inventory is missing exact row ${key}.`);
          }
          if (!modelDeclarationMatchesInventory(tile.modelResRef, sourceRow)) {
            throw new Error(`Model source inventory ResRef mismatch for ${key}.`);
          }
          consumedModelSourceRows.add(key);
          return {
            ...tile,
            modelSourceStatus: sourceRow.modelStatus,
            modelSourceLayer: sourceRow.modelSourceLayer,
            modelSourceReference: sourceRow.modelSource
          };
        })
      };
      const definitionRelativePath = `definitions/${tilesetResRef}.json`;
      const definitionPath = path.join(stagingDirectory, "definitions", `${tilesetResRef}.json`);
      const definitionJson = JSON.stringify(definition);
      atomicWrite(definitionPath, definitionJson);
      entries.push({
        tilesetResRef,
        sourcePath: displayPath(sourcePath),
        sourceKey: sourceKey(setSource, tilesetResRef),
        sourceSha256,
        definitionPath: definitionRelativePath,
        definitionSha256: sha256Bytes(definitionJson),
        tileCount: definition.tiles.length,
        groupCount: definition.groups.length,
        diagnosticCount: definition.diagnostics.length
      });
      seenResRefs.add(tilesetResRef);
    }

    if (
      consumedModelSourceRows.size !== modelSourceRows.length ||
      modelSourceRows.some((row) => !consumedModelSourceRows.has(`${row.tilesetResRef}:${row.tileId}`))
    ) {
      throw new Error("Model source inventory membership does not exactly match the selected tileset rows.");
    }

    const summary = {
      tilesetCount: entries.length,
      totalTileCount: entries.reduce((sum, entry) => sum + entry.tileCount, 0),
      totalGroupCount: entries.reduce((sum, entry) => sum + entry.groupCount, 0),
      totalDiagnosticCount: entries.reduce((sum, entry) => sum + entry.diagnosticCount, 0),
      sourceResolvedTileCount: modelSourceRows.filter((row) => row.modelStatus === "source_resolved").length,
      sourceMissingTileCount: modelSourceRows.filter((row) => row.modelStatus === "source_missing").length,
      intentionalPlaceholderTileCount: modelSourceRows.filter((row) => row.modelStatus === "intentional_placeholder").length,
      invalidMissingModelFieldTileCount: modelSourceRows.filter((row) => row.modelStatus === "invalid_missing_model_field").length
    };
    const catalog = {
      schema: CATALOG_SCHEMA,
      generatedAt: new Date().toISOString(),
      sourceInventory: {
        path: displayPath(args.selectionInventory),
        sha256: args.selectionInventorySha256,
        schemaVersion: selection.schemaVersion,
        generatedAt: selection.generatedAt
      },
      modelSourceInventory: {
        path: displayPath(args.modelSourceInventory),
        sha256: args.modelSourceInventorySha256,
        format: "aurora-all-area-tiles/tiles-json-array-v1",
        rowCount: modelSourceRows.length
      },
      sourceRoot: selection.input?.sourceRoot,
      summary,
      entries
    };
    const catalogPath = path.join(stagingDirectory, "catalog.json");
    const catalogJson = `${JSON.stringify(catalog, null, 2)}\n`;
    atomicWrite(catalogPath, catalogJson);
    const catalogSha256 = sha256Bytes(catalogJson);
    fs.renameSync(stagingDirectory, args.outDirectory);
    return {
      catalogPath: path.join(args.outDirectory, "catalog.json"),
      catalogSha256,
      summary
    };
  } catch (error) {
    if (fs.existsSync(stagingDirectory) && isInside(path.dirname(stagingDirectory), stagingDirectory)) {
      fs.rmSync(stagingDirectory, { recursive: true, force: true });
    }
    throw error;
  }
}

try {
  const result = compileCatalog(parseArguments(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify({ schema: RESULT_SCHEMA, ...result }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
