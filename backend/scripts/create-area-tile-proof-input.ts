import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseAuroraTilesetEditingDefinition,
  type AuroraTilesetEditingDefinition
} from "../src/modules/areas/adapters/outbound/blob/aurora-set-tileset-parser";

const repoRoot = path.resolve(__dirname, "..", "..");
const sourceRoot = path.resolve(
  repoRoot,
  process.argv[2] ?? ".codex-tmp/module-blob-mirror/modules/current"
);
const outFile = path.resolve(
  repoRoot,
  process.argv[3] ?? ".codex-tmp/all-area-tiles-audit-20260716/proof-input.json"
);

interface ProofInput {
  schemaVersion: 1;
  generatedAt: string;
  sourceRoot: string;
  definitions: Array<{
    tilesetResRef: string;
    source: string;
    definition: AuroraTilesetEditingDefinition;
  }>;
}

function walk(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const item = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(item);
    return entry.isFile() ? [item] : [];
  });
}

function sourcePriority(filePath: string): number {
  const normalized = filePath.replace(/\\/gu, "/").toLowerCase();
  if (!normalized.includes("/__aurora/sources/")) return 0;
  if (normalized.includes("/__aurora/sources/hak/")) return 1;
  if (normalized.includes("/__aurora/sources/vanilla/")) return 2;
  return 3;
}

function compareSources(left: string, right: string): number {
  return sourcePriority(left) - sourcePriority(right) ||
    left.split(/[\\/]+/u).length - right.split(/[\\/]+/u).length ||
    left.localeCompare(right);
}

function resref(filePath: string): string {
  return path.basename(filePath, path.extname(filePath)).trim().toLowerCase();
}

const selected = new Map<string, string>();
for (const filePath of walk(sourceRoot)
  .filter((filePath) => filePath.toLowerCase().endsWith(".set"))
  .sort(compareSources)) {
  const tilesetResRef = resref(filePath);
  if (!selected.has(tilesetResRef)) selected.set(tilesetResRef, filePath);
}

const definitions = [...selected.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([tilesetResRef, filePath]) => {
    const bytes = fs.readFileSync(filePath);
    const definition = parseAuroraTilesetEditingDefinition(bytes, tilesetResRef);
    const sourceHash = createHash("sha256").update(bytes).digest("hex");
    if (definition.fingerprint !== sourceHash) {
      throw new Error(`SET fingerprint mismatch for ${tilesetResRef}.`);
    }
    return {
      tilesetResRef,
      source: path.relative(repoRoot, filePath).replace(/\\/gu, "/"),
      definition
    };
  });

const payload: ProofInput = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  sourceRoot: path.relative(repoRoot, sourceRoot).replace(/\\/gu, "/"),
  definitions
};

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(payload)}\n`);
console.log(JSON.stringify({
  outFile: path.relative(repoRoot, outFile).replace(/\\/gu, "/"),
  tilesets: definitions.length,
  tiles: definitions.reduce((total, entry) => total + entry.definition.tiles.length, 0),
  groups: definitions.reduce((total, entry) => total + entry.definition.groups.length, 0)
}, null, 2));
