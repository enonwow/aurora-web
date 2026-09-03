#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  validateAreaTilePlaceholderDecompilationProfile
} from "./lib/area-tile-placeholder-decompilation-profile.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "area-tile-decomp-profile-"));
try {
  const files = Object.fromEntries(
    [
      "binary",
      "project",
      "archive",
      "headless",
      "exporter",
      "sourceGap",
      "legacyC",
      "legacyFunctions",
      "legacyStrings",
      "runner",
      "runnerLibrary",
      "profileValidatorLibrary",
      "projectRestoreScript",
      "lineageProducer",
      "lineageValidator",
      "lineageLibrary"
    ]
      .map((name) => {
        const filePath = path.join(root, name);
        fs.writeFileSync(filePath, `${name}-bytes\n`);
        return [name, record(filePath)];
      })
  );
  const profile = {
    schema: "aurora-area-tile-placeholder-decompilation-profile/v1",
    profileId: "area-tile-placeholder-lineage-v2-pass1",
    generatedAt: "2026-09-01T00:00:00.000Z",
    binary: files.binary,
    projectSnapshot: files.project,
    toolchain: {
      release: "Ghidra 12.1.3",
      archive: files.archive,
      headlessPath: files.headless.path,
      maxHeapMiB: 1536,
      maxCpu: 1
    },
    exporter: files.exporter,
    sourceGapManifest: files.sourceGap,
    legacyDiscovery: [
      { ...files.legacyC, authority: "discovery_only" },
      { ...files.legacyFunctions, authority: "discovery_only" },
      { ...files.legacyStrings, authority: "discovery_only" }
    ],
    targets: {
      addresses: ["0x005a7fc8", "0x005a9f30", "0x005e3df4"],
      timeoutSeconds: 30
    },
    analysis: {
      projectName: "Aurora",
      programName: "nwtoolset.exe",
      projectId: "aurora-nwtoolset-current-2026-05-24",
      relocationPolicy: "loader-default-recorded",
      mode: "existing-analysis-read-only"
    },
    execution: {
      runner: files.runner,
      runnerLibrary: files.runnerLibrary,
      profileValidatorLibrary: files.profileValidatorLibrary,
      projectRestoreScript: files.projectRestoreScript,
      lineageProducer: files.lineageProducer,
      lineageValidator: files.lineageValidator,
      lineageLibrary: files.lineageLibrary
    },
    resourceGate: {
      minimumFreePhysicalBytes: 8 * 1024 ** 3,
      minimumFreeVirtualBytes: 6 * 1024 ** 3
    },
    outputRoot: path.join(root, "output"),
    acceptance: {
      lineageV2ValidatorRequired: true,
      selectedFunctionsMustDecompile: true,
      semanticVerdictMustCiteFunctions: true,
      runtimeBehaviorChangesAllowed: false
    }
  };

  const blocked = validateAreaTilePlaceholderDecompilationProfile({
    profile,
    memory: { freePhysicalBytes: 4 * 1024 ** 3, freeVirtualBytes: 3 * 1024 ** 3 }
  });
  assert.equal(blocked.ok, true);
  assert.equal(blocked.executionReady, false);
  assert.equal(blocked.status, "blocked_resource_headroom");
  assert.deepEqual(blocked.diagnostics.map(({ code }) => code), ["resource_headroom_insufficient"]);

  const ready = validateAreaTilePlaceholderDecompilationProfile({
    profile,
    memory: { freePhysicalBytes: 12 * 1024 ** 3, freeVirtualBytes: 10 * 1024 ** 3 }
  });
  assert.equal(ready.ok, true);
  assert.equal(ready.executionReady, true);
  assert.equal(ready.status, "ready");
  assert.deepEqual(ready.diagnostics, []);

  const wrongAnalysis = validateAreaTilePlaceholderDecompilationProfile({
    profile: { ...profile, analysis: { ...profile.analysis, mode: "reanalyze" } },
    memory: { freePhysicalBytes: 12 * 1024 ** 3, freeVirtualBytes: 10 * 1024 ** 3 }
  });
  assert.equal(wrongAnalysis.ok, false);
  assert.ok(wrongAnalysis.diagnostics.some(({ code }) => code === "analysis_contract_invalid"));

  fs.appendFileSync(files.projectRestoreScript.path, "drift");
  const runnerDrifted = validateAreaTilePlaceholderDecompilationProfile({
    profile,
    memory: { freePhysicalBytes: 12 * 1024 ** 3, freeVirtualBytes: 10 * 1024 ** 3 }
  });
  assert.equal(runnerDrifted.ok, false);
  assert.ok(
    runnerDrifted.diagnostics.some(({ code }) => code === "execution_project_restore_script_sha256_mismatch")
  );
  fs.writeFileSync(files.projectRestoreScript.path, "projectRestoreScript-bytes\n");

  fs.appendFileSync(files.binary.path, "drift");
  const drifted = validateAreaTilePlaceholderDecompilationProfile({
    profile,
    memory: { freePhysicalBytes: 12 * 1024 ** 3, freeVirtualBytes: 10 * 1024 ** 3 }
  });
  assert.equal(drifted.ok, false);
  assert.equal(drifted.executionReady, false);
  assert.equal(drifted.status, "invalid");
  assert.ok(drifted.diagnostics.some(({ code }) => code === "binary_sha256_mismatch"));

  process.stdout.write("area tile placeholder decompilation profile tests: PASS\n");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

function record(filePath) {
  const bytes = fs.readFileSync(filePath);
  return {
    path: filePath,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}
