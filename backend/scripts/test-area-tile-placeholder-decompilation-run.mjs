#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  buildAreaTilePlaceholderDecompilationExecutionPlan,
  validateFreshAreaTilePlaceholderPacketRoot
} from "./lib/area-tile-placeholder-decompilation-run.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "area-tile-decomp-run-"));
try {
  const repoRoot = path.join(root, "repo");
  const packetRoot = path.join(repoRoot, ".codex-tmp", "lineage", "pass1");
  const profilePath = path.join(repoRoot, "profile.json");
  fs.mkdirSync(repoRoot, { recursive: true });
  fs.writeFileSync(profilePath, "profile\n");

  const profile = fixtureProfile(repoRoot, packetRoot);
  const profileSha256 = sha256(fs.readFileSync(profilePath));
  const plan = buildAreaTilePlaceholderDecompilationExecutionPlan({
    profile,
    profilePath,
    profileSha256,
    repoRoot
  });

  assert.equal(plan.schema, "aurora-area-tile-placeholder-decompilation-execution-plan/v1");
  assert.equal(plan.packetRoot, packetRoot);
  assert.equal(plan.sessionId, `ghidra-session-${profileSha256.slice(0, 16)}`);
  assert.deepEqual(plan.ghidra.environment, {
    GHIDRA_HEADLESS_MAXMEM: "1536M"
  });
  assert.deepEqual(
    plan.invocationRecord.arguments.slice(0, 8),
    [
      profile.profileId,
      "Aurora",
      "-process",
      "nwtoolset.exe",
      "-readOnly",
      "-noanalysis",
      "-max-cpu",
      "1"
    ]
  );
  assert.equal(
    plan.paths.projectLocation,
    path.join(
      repoRoot,
      "output",
      "proof",
      "area-tile-placeholder-ghidra-workspaces",
      profile.profileId
    )
  );
  assert.equal(plan.invocationRecord.arguments.includes("--target-addresses"), false);
  assert.ok(plan.invocationRecord.arguments.includes("--target-addresses-base64url"));
  assert.equal(
    plan.invocationRecord.arguments[
      plan.invocationRecord.arguments.indexOf("--target-addresses-base64url") + 1
    ],
    "MHgwMDVhN2ZjOCwweDAwNWE5ZjMwLDB4MDA1ZTNkZjQ"
  );
  assert.ok(plan.invocationRecord.arguments.includes("--timeout-seconds"));
  assert.equal(
    plan.invocationRecord.arguments[plan.invocationRecord.arguments.indexOf("--timeout-seconds") + 1],
    "30"
  );
  if (process.platform === "win32") {
    assert.equal(plan.ghidra.executable, "cmd.exe");
    assert.equal(
      plan.ghidra.cwd,
      path.join(repoRoot, "output", "proof", "area-tile-placeholder-ghidra-workspaces")
    );
    assert.deepEqual(plan.ghidra.arguments.slice(0, 3), ["/d", "/s", "/c"]);
    assert.match(
      plan.ghidra.arguments[3],
      /^\.\.\\\.\.\\\.\.\\sources\\analyzeHeadless\.bat area-tile-placeholder-lineage-v2-pass1 Aurora /u
    );
    fs.mkdirSync(plan.ghidra.cwd, { recursive: true });
    try {
      const batchSmoke = spawnSync(plan.ghidra.executable, plan.ghidra.arguments, {
        cwd: plan.ghidra.cwd,
        encoding: "utf8",
        windowsHide: true
      });
      assert.equal(batchSmoke.status, 0, `${batchSmoke.stdout}\n${batchSmoke.stderr}`);
      assert.match(batchSmoke.stdout, /HEADLESS_OK/u);
    } finally {
      fs.rmSync(plan.ghidra.cwd, { recursive: true, force: true });
    }
  } else {
    assert.equal(plan.ghidra.executable, plan.invocationRecord.executable);
    assert.deepEqual(plan.ghidra.arguments, plan.invocationRecord.arguments);
    assert.equal(
      plan.ghidra.cwd,
      path.join(repoRoot, "output", "proof", "area-tile-placeholder-ghidra-workspaces")
    );
  }
  assert.equal(plan.analyzerConfiguration.analysisMode, "existing-analysis-read-only");
  assert.equal(plan.analyzerConfiguration.runtimeBehaviorChangesAllowed, false);
  assert.equal(plan.analyzerConfiguration.maxCpu, 1);
  assert.equal(plan.analyzerConfiguration.maxHeapMiB, 1536);
  assert.deepEqual(
    plan.stagedFiles.map(({ role }) => role),
    [
      "profile",
      "input_binary",
      "tool_distribution",
      "project_snapshot",
      "exporter",
      "source_gap_manifest",
      "legacy_discovery_0",
      "legacy_discovery_1",
      "legacy_discovery_2",
      "runner",
      "runner_library",
      "profile_validator_library",
      "project_restore_script",
      "lineage_producer",
      "lineage_validator",
      "lineage_library"
    ]
  );
  assert.throws(
    () => buildAreaTilePlaceholderDecompilationExecutionPlan({
      profile: { ...profile, outputRoot: path.dirname(repoRoot) },
      profilePath,
      profileSha256,
      repoRoot
    }),
    /packet_root_outside_repo/u
  );

  assert.equal(validateFreshAreaTilePlaceholderPacketRoot(packetRoot, repoRoot), packetRoot);
  fs.mkdirSync(packetRoot, { recursive: true });
  assert.throws(
    () => validateFreshAreaTilePlaceholderPacketRoot(packetRoot, repoRoot),
    /packet_root_already_exists/u
  );

  if (process.platform === "win32") {
    testProjectArchiveRestore(root, profile.execution.projectRestoreScript.path);
  }

  process.stdout.write("area tile placeholder decompilation run tests: PASS\n");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

function fixtureProfile(repoRoot, packetRoot) {
  const source = (name) => {
    const filePath = path.join(repoRoot, "sources", name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(
      filePath,
      name === "analyzeHeadless.bat"
        ? [
            "@echo off",
            "set TARGET_FOUND=",
            ":scan",
            "if \"%~1\"==\"\" goto done",
            "if \"%~1\"==\"MHgwMDVhN2ZjOCwweDAwNWE5ZjMwLDB4MDA1ZTNkZjQ\" set TARGET_FOUND=1",
            "shift",
            "goto scan",
            ":done",
            "if not defined TARGET_FOUND exit /b 23",
            "echo HEADLESS_OK",
            "exit /b 0",
            ""
          ].join("\r\n")
        : `${name}\n`
    );
    return record(filePath);
  };
  return {
    schema: "aurora-area-tile-placeholder-decompilation-profile/v1",
    profileId: "area-tile-placeholder-lineage-v2-pass1",
    generatedAt: "2026-09-01T00:00:00.000Z",
    binary: source("nwtoolset.exe"),
    projectSnapshot: source("Aurora.gar"),
    toolchain: {
      release: "Ghidra 12.1.3",
      archive: source("ghidra.zip"),
      headlessPath: source("analyzeHeadless.bat").path,
      maxHeapMiB: 1536,
      maxCpu: 1
    },
    exporter: source("ExportAuroraDecompilationLineageV2.java"),
    sourceGapManifest: source("source-gap-manifest.json"),
    legacyDiscovery: [source("legacy.c"), source("functions.tsv"), source("strings.tsv")],
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
      runner: source("run-area-tile-placeholder-decompilation-pass.mjs"),
      runnerLibrary: source("area-tile-placeholder-decompilation-run.mjs"),
      profileValidatorLibrary: source("area-tile-placeholder-decompilation-profile.mjs"),
      projectRestoreScript: record(path.resolve(import.meta.dirname, "ghidra/RestoreGhidraProjectArchive.ps1")),
      lineageProducer: source("create-aurora-decompilation-lineage-v2-packet.mjs"),
      lineageValidator: source("validate-aurora-decompilation-lineage-v2.mjs"),
      lineageLibrary: source("aurora-decompilation-lineage-v2.mjs")
    },
    resourceGate: {
      minimumFreePhysicalBytes: 8 * 1024 ** 3,
      minimumFreeVirtualBytes: 6 * 1024 ** 3
    },
    outputRoot: path.relative(repoRoot, packetRoot).replaceAll("\\", "/"),
    acceptance: {
      lineageV2ValidatorRequired: true,
      selectedFunctionsMustDecompile: true,
      semanticVerdictMustCiteFunctions: true,
      runtimeBehaviorChangesAllowed: false
    }
  };
}

function testProjectArchiveRestore(root, restoreScriptPath) {
  const source = path.join(root, "archive-source");
  const archiveGar = path.join(root, "project.gar");
  const projectLocation = path.join(root, "restored");
  fs.mkdirSync(path.join(source, "idata"), { recursive: true });
  fs.writeFileSync(path.join(source, "JAR_FORMAT"), "1\n");
  fs.writeFileSync(path.join(source, "Old.gpr"), "must be skipped\n");
  fs.writeFileSync(path.join(source, "project.prp"), "must be skipped\n");
  fs.writeFileSync(path.join(source, "idata", "payload.bin"), "payload\n");
  createZipArchiveWithEntries(archiveGar, [
    { name: "JAR_FORMAT", source: path.join(source, "JAR_FORMAT") },
    { name: "Old.gpr", source: path.join(source, "Old.gpr") },
    { name: "project.prp", source: path.join(source, "project.prp") },
    { name: "idata\\payload.bin", source: path.join(source, "idata", "payload.bin") }
  ]);
  const restore = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-File",
      restoreScriptPath,
      "-ArchivePath",
      archiveGar,
      "-ProjectLocation",
      projectLocation,
      "-ProjectName",
      "Aurora"
    ],
    { encoding: "utf8", windowsHide: true }
  );
  assert.equal(restore.status, 0, `${restore.stdout}\n${restore.stderr}`);
  assert.equal(fs.readFileSync(path.join(projectLocation, "Aurora.rep", "idata", "payload.bin"), "utf8"), "payload\n");
  assert.equal(fs.existsSync(path.join(projectLocation, "Aurora.gpr")), true);
  assert.equal(fs.statSync(path.join(projectLocation, "Aurora.gpr")).size, 0);
  assert.equal(fs.existsSync(path.join(projectLocation, "Aurora.rep", "Old.gpr")), false);
  assert.equal(fs.existsSync(path.join(projectLocation, "Aurora.rep", "project.prp")), false);

  const unsafeArchive = path.join(root, "unsafe-project.gar");
  const unsafeLocation = path.join(root, "unsafe-restored");
  createZipArchiveWithEntries(unsafeArchive, [
    { name: "JAR_FORMAT", source: path.join(source, "JAR_FORMAT") },
    { name: "..\\escape.bin", source: path.join(source, "idata", "payload.bin") }
  ]);
  const unsafeRestore = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-File",
      restoreScriptPath,
      "-ArchivePath",
      unsafeArchive,
      "-ProjectLocation",
      unsafeLocation,
      "-ProjectName",
      "Aurora"
    ],
    { encoding: "utf8", windowsHide: true }
  );
  assert.notEqual(unsafeRestore.status, 0);
  assert.match(unsafeRestore.stderr, /ghidra_project_archive_entry_name_invalid/u);
  assert.equal(fs.existsSync(path.join(root, "escape.bin")), false);
  assert.equal(fs.existsSync(path.join(unsafeLocation, "Aurora.rep")), false);
}

function createZipArchiveWithEntries(destination, entries) {
  const command = [
    "Add-Type -AssemblyName System.IO.Compression",
    "$items = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($env:AURORA_TEST_ZIP_ENTRIES)) | ConvertFrom-Json",
    "$stream = [IO.File]::Open($env:AURORA_TEST_ZIP_DESTINATION, [IO.FileMode]::CreateNew, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)",
    "try {",
    "  $archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create, $false)",
    "  try {",
    "    foreach ($item in $items) {",
    "      $entry = $archive.CreateEntry([string]$item.name)",
    "      $entryStream = $entry.Open()",
    "      try {",
    "        $bytes = [IO.File]::ReadAllBytes([string]$item.source)",
    "        $entryStream.Write($bytes, 0, $bytes.Length)",
    "      } finally { $entryStream.Dispose() }",
    "    }",
    "  } finally { $archive.Dispose() }",
    "} finally { $stream.Dispose() }"
  ].join("; ");
  const archive = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", command],
    {
      encoding: "utf8",
      windowsHide: true,
      env: {
        ...process.env,
        AURORA_TEST_ZIP_DESTINATION: destination,
        AURORA_TEST_ZIP_ENTRIES: Buffer.from(JSON.stringify(entries), "utf8").toString("base64")
      }
    }
  );
  assert.equal(archive.status, 0, `${archive.stdout}\n${archive.stderr}`);
}

function record(filePath) {
  const bytes = fs.readFileSync(filePath);
  return {
    path: filePath,
    bytes: bytes.length,
    sha256: sha256(bytes)
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
