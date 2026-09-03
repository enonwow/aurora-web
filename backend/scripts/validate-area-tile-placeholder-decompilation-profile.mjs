#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  validateAreaTilePlaceholderDecompilationProfile
} from "./lib/area-tile-placeholder-decompilation-profile.mjs";

try {
  const args = parseArgs(process.argv.slice(2));
  const profilePath = path.resolve(requireArg(args, "profile"));
  const expectedSha256 = requireArg(args, "profile-sha256").toLowerCase();
  const outPath = path.resolve(requireArg(args, "out"));
  if (!/^[a-f0-9]{64}$/u.test(expectedSha256)) throw new Error("profile_sha256_invalid");
  if (!fs.existsSync(profilePath) || !fs.lstatSync(profilePath).isFile()) {
    throw new Error("profile_missing");
  }
  const bytes = fs.readFileSync(profilePath);
  const observedSha256 = sha256(bytes);
  if (observedSha256 !== expectedSha256) throw new Error("profile_sha256_mismatch");
  const profile = JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/u, ""));
  const memory = readMemorySnapshot();
  const validation = validateAreaTilePlaceholderDecompilationProfile({
    profile,
    memory,
    repoRoot: path.resolve(import.meta.dirname, "../..")
  });
  const result = {
    schema: "aurora-area-tile-placeholder-decompilation-profile-validation/v1",
    checkedAt: new Date().toISOString(),
    profile: { path: profilePath, sha256: observedSha256 },
    ...validation
  };
  if (fs.existsSync(outPath)) throw new Error("validation_output_already_exists");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, { flag: "wx" });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.ok) process.exitCode = 2;
  else if (!result.executionReady) process.exitCode = 3;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 2;
}

function parseArgs(argv) {
  const result = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const token = argv[index];
    const value = argv[index + 1];
    if (!token?.startsWith("--") || !value || value.startsWith("--") || result.has(token.slice(2))) {
      throw new Error("cli_arguments_invalid");
    }
    result.set(token.slice(2), value);
  }
  return result;
}

function requireArg(args, name) {
  const value = args.get(name)?.trim();
  if (!value) throw new Error(`cli_argument_missing:${name}`);
  return value;
}

function readMemorySnapshot() {
  if (process.platform !== "win32") {
    const free = os.freemem();
    return { freePhysicalBytes: free, freeVirtualBytes: free };
  }
  const command = [
    "$os = Get-CimInstance Win32_OperatingSystem",
    "[ordered]@{ freePhysicalBytes = [int64]$os.FreePhysicalMemory * 1KB; freeVirtualBytes = [int64]$os.FreeVirtualMemory * 1KB } | ConvertTo-Json -Compress"
  ].join("; ");
  const result = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    { encoding: "utf8", windowsHide: true }
  );
  if (result.status !== 0) throw new Error("memory_snapshot_failed");
  const parsed = JSON.parse(result.stdout);
  return {
    freePhysicalBytes: Number(parsed.freePhysicalBytes),
    freeVirtualBytes: Number(parsed.freeVirtualBytes)
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
