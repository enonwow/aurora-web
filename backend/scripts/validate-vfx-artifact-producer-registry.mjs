#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateVfxArtifactProducerRegistry } from "./lib/vfx-artifact-producer-registry.mjs";

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultRepoRoot = path.resolve(backendRoot, "..");
const args = parseArgs(process.argv.slice(2));
const repoRoot = path.resolve(args["repo-root"] ?? defaultRepoRoot);
const registryPath = path.resolve(
  repoRoot,
  args.registry ??
    path.join(repoRoot, "backend/docs/aurora-reverse/vfx-artifact-producer-registry-v1.json")
);
const result = validateVfxArtifactProducerRegistry({ registryPath, repoRoot });
const report = { ...result };
delete report.registry;
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!result.valid) process.exitCode = 1;

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (!key?.startsWith("--")) continue;
    parsed[key.slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
}
