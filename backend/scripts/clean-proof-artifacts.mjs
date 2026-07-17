import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "../..");

const defaultRoots = [
  ".codex-tmp",
  "backend/.codex-tmp",
  "frontend/.codex-tmp",
  "docs/aurora-reverse/artifacts",
  "frontend/public/aurora-evidence",
  "backend/docs/aurora-reverse/artifacts"
];

const args = parseArgs(process.argv.slice(2));
const dryRun = !args.yes;
const olderThanHours = Number(args.olderThanHours ?? 24);
const deleteAll = Boolean(args.all);
const roots = args.roots?.length ? args.roots : defaultRoots;
const cutoffMs = Date.now() - olderThanHours * 60 * 60 * 1000;

if (!Number.isFinite(olderThanHours) || olderThanHours < 0) {
  throw new Error("--older-than-hours must be a non-negative number");
}

const candidates = [];

for (const relativeRoot of roots) {
  const root = path.resolve(repoRoot, relativeRoot);
  assertInsideRepo(root);

  if (!fs.existsSync(root)) {
    continue;
  }

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    const stat = safeStat(fullPath);
    if (!stat) {
      continue;
    }

    const isOldEnough = deleteAll || stat.mtimeMs <= cutoffMs;
    if (!isOldEnough) {
      continue;
    }

    candidates.push({
      path: fullPath,
      relativePath: path.relative(repoRoot, fullPath),
      sizeBytes: entry.isDirectory() ? directorySize(fullPath) : stat.size,
      lastWrite: stat.mtime
    });
  }
}

for (const file of fs.readdirSync(repoRoot, { withFileTypes: true })) {
  if (!file.isFile() || !file.name.startsWith(".codex-tmp-")) {
    continue;
  }

  const fullPath = path.join(repoRoot, file.name);
  const stat = safeStat(fullPath);
  if (!stat) {
    continue;
  }

  const isOldEnough = deleteAll || stat.mtimeMs <= cutoffMs;
  if (isOldEnough) {
    candidates.push({
      path: fullPath,
      relativePath: path.relative(repoRoot, fullPath),
      sizeBytes: stat.size,
      lastWrite: stat.mtime
    });
  }
}

candidates.sort((a, b) => b.sizeBytes - a.sizeBytes);

let removedBytes = 0;
let failed = 0;

for (const candidate of candidates) {
  if (dryRun) {
    continue;
  }

  try {
    fs.rmSync(candidate.path, { recursive: true, force: true });
    removedBytes += candidate.sizeBytes;
  } catch (error) {
    failed += 1;
    console.error(`Failed to remove ${candidate.relativePath}: ${error.message}`);
  }
}

const totalBytes = candidates.reduce((sum, candidate) => sum + candidate.sizeBytes, 0);

console.log(JSON.stringify({
  repoRoot,
  mode: dryRun ? "dry-run" : "delete",
  cutoff: deleteAll ? "all" : new Date(cutoffMs).toISOString(),
  candidateCount: candidates.length,
  candidateSizeGB: toGB(totalBytes),
  removedSizeGB: toGB(removedBytes),
  failed,
  candidates: candidates.slice(0, 80).map((candidate) => ({
    path: candidate.relativePath,
    sizeGB: toGB(candidate.sizeBytes),
    lastWrite: candidate.lastWrite.toISOString()
  }))
}, null, 2));

function parseArgs(argv) {
  const parsed = { roots: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--yes") {
      parsed.yes = true;
    } else if (arg === "--all") {
      parsed.all = true;
    } else if (arg === "--older-than-hours" && next) {
      parsed.olderThanHours = next;
      index += 1;
    } else if (arg === "--root" && next) {
      parsed.roots.push(next);
      index += 1;
    } else if (arg === "--help") {
      printHelpAndExit();
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function printHelpAndExit() {
  console.log(`Usage:
  node scripts/clean-proof-artifacts.mjs [--older-than-hours 24] [--all] [--yes]
  node scripts/clean-proof-artifacts.mjs --root frontend/public/aurora-evidence --older-than-hours 12 --yes

Defaults to dry-run. Pass --yes to delete.`);
  process.exit(0);
}

function assertInsideRepo(targetPath) {
  const relative = path.relative(repoRoot, targetPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing to touch path outside repo: ${targetPath}`);
  }
}

function safeStat(targetPath) {
  try {
    return fs.statSync(targetPath);
  } catch {
    return null;
  }
}

function directorySize(root) {
  let size = 0;
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const stat = safeStat(fullPath);
      if (!stat) {
        continue;
      }

      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        size += stat.size;
      }
    }
  }

  return size;
}

function toGB(bytes) {
  return Math.round((bytes / 1024 / 1024 / 1024) * 100) / 100;
}
