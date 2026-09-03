import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(__dirname, "../../..");
const producerPath = path.join(
  repoRoot,
  "backend/scripts/create-aurora-decompilation-lineage-v2-packet.mjs"
);
const validatorPath = path.join(
  repoRoot,
  "backend/scripts/validate-aurora-decompilation-lineage-v2.mjs"
);

describe("Aurora decompilation lineage v2", () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-decomp-lineage-v2-"));
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("keeps producer packets non-authoritative and promotes only validator output", () => {
    const fixture = createFixture(tempRoot);
    const producer = produce(fixture);

    expect(producer.status).toBe(0);
    const packet = read(fixture.packetPath);
    expect(packet).toMatchObject({
      schemaVersion: "aurora-decompilation-lineage/v2",
      packetType: "producer",
      authoritativeDecompilationClaim: false,
      authoritativeCompleteDecompilationClaim: false,
      derivedCoverage: { functionDiscovered: 2, decompileSuccess: 2, decompileFailure: 0 }
    });
    expect(packet.portableRecordDigestSha256).toMatch(/^[a-f0-9]{64}$/u);

    const validation = validate(fixture);
    expect(validation.status).toBe(0);
    const result = read(fixture.validationPath);
    expect(result).toMatchObject({
      schemaVersion: "aurora-decompilation-lineage-validation/v2",
      packetType: "validator-result",
      status: "validated_lineage_complete_coverage_complete",
      lineageComplete: true,
      decompilationCoverageComplete: true,
      authoritativeDecompilationClaim: true,
      authoritativeCompleteDecompilationClaim: true,
      derivedCoverage: { functionDiscovered: 2, decompileSuccess: 2, decompileFailure: 0 }
    });
    expect(result.diagnostics).toEqual([]);
  });

  it("rejects an arbitrary regular text file as the input binary", () => {
    const fixture = createFixture(tempRoot);
    fs.writeFileSync(fixture.inputBinaryPath, "not a PE binary");
    refreshAttestation(fixture);

    const producer = produce(fixture);

    expect(producer.status).toBe(2);
    expect(producer.stderr).toContain("input_binary_pe_invalid");
    expect(producer.stderr).not.toMatch(/node:fs|at Object\./u);
    expect(fs.existsSync(fixture.packetPath)).toBe(false);
  });

  it("distinguishes complete lineage from incomplete decompilation coverage", () => {
    const fixture = createFixture(tempRoot, { failedFunctionIds: ["0x00401020:FUN_2"] });
    expect(produce(fixture).status).toBe(0);

    const validation = validate(fixture);

    expect(validation.status).toBe(0);
    expect(read(fixture.validationPath)).toMatchObject({
      status: "validated_lineage_complete_coverage_incomplete",
      lineageComplete: true,
      decompilationCoverageComplete: false,
      authoritativeDecompilationClaim: true,
      authoritativeCompleteDecompilationClaim: false,
      derivedCoverage: { functionDiscovered: 2, decompileSuccess: 1, decompileFailure: 1 }
    });
  });

  it("accepts an attested targeted selection while keeping full coverage incomplete", () => {
    const fixture = createFixture(tempRoot, { targetAddresses: ["0x00401000"] });
    expect(produce(fixture).status).toBe(0);

    const validation = validate(fixture);

    expect(validation.status).toBe(0);
    expect(read(fixture.validationPath)).toMatchObject({
      status: "validated_lineage_complete_coverage_incomplete",
      lineageComplete: true,
      decompilationCoverageComplete: false,
      authoritativeDecompilationClaim: true,
      authoritativeCompleteDecompilationClaim: false,
      derivedCoverage: { functionDiscovered: 2, decompileSuccess: 1, decompileFailure: 1 }
    });
  });

  it.each([
    {
      name: "cross-session function record",
      mutate: (fixture: Fixture) => {
        const records = readJsonl(fixture.functionRecordsPath);
        records[1].sessionId = "ghidra-session-other-0002";
        writeJsonl(fixture.functionRecordsPath, records);
      },
      code: "function_record_session_mismatch"
    },
    {
      name: "failure-ledger identity mismatch",
      mutate: (fixture: Fixture) => {
        writeJson(fixture.failureLedgerPath, {
          version: "aurora-ghidra-decompilation-failure-ledger/v1",
          sessionId: fixture.sessionId,
          failures: [{ functionId: "0x00409999:FUN_UNKNOWN", reasonCode: "timeout" }]
        });
      },
      code: "failure_ledger_identity_mismatch"
    },
    {
      name: "unknown call-graph node",
      mutate: (fixture: Fixture) => {
        writeJsonl(fixture.callGraphPath, [
          {
            sessionId: fixture.sessionId,
            fromFunctionId: "0x00401000:FUN_1",
            toFunctionId: "0x00409999:FUN_UNKNOWN"
          }
        ]);
      },
      code: "call_graph_node_unknown"
    },
    {
      name: "duplicate function identity",
      mutate: (fixture: Fixture) => {
        const records = readJsonl(fixture.functionRecordsPath);
        records.push({ ...records[0] });
        writeJsonl(fixture.functionRecordsPath, records);
      },
      code: "function_identity_duplicate"
    },
    {
      name: "attested tool distribution mismatch",
      mutate: (fixture: Fixture) => {
        const attestation = read(fixture.attestationPath);
        attestation.tool.distributionSha256 = sha("different-distribution");
        writeJson(fixture.attestationPath, attestation);
      },
      code: "attestation_tool_distribution_hash_mismatch"
    },
    {
      name: "targeted selection exports a non-target function",
      mutate: (fixture: Fixture) => {
        const attestation = read(fixture.attestationPath);
        attestation.generation.decompilationSelection = {
          mode: "targeted",
          addresses: ["0x00401000"]
        };
        writeJson(fixture.attestationPath, attestation);
      },
      code: "decompilation_selection_non_target_record_invalid"
    }
  ])("fails validation for $name", ({ mutate, code }) => {
    const fixture = createFixture(tempRoot);
    mutate(fixture);
    expect(produce(fixture).status).toBe(0);

    const validation = validate(fixture);

    expect(validation.status).toBe(1);
    expect(validation.stderr).not.toMatch(/SyntaxError|node:fs|ENOENT/u);
    const result = read(fixture.validationPath);
    expect(result).toMatchObject({
      lineageComplete: false,
      decompilationCoverageComplete: false,
      authoritativeDecompilationClaim: false,
      authoritativeCompleteDecompilationClaim: false
    });
    expect(result.diagnostics.map((entry: { code: string }) => entry.code)).toContain(code);
  });

  it("detects output tampering after producer packet creation", () => {
    const fixture = createFixture(tempRoot);
    expect(produce(fixture).status).toBe(0);
    fs.appendFileSync(path.join(fixture.exportDir, "FUN_1.c"), "// tampered\n");

    const validation = validate(fixture);

    expect(validation.status).toBe(1);
    expect(read(fixture.validationPath).diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "inventory_file_hash_mismatch" })])
    );
  });

  it("preserves portable digests when an identical packet root is relocated", () => {
    const fixture = createFixture(path.join(tempRoot, "original"));
    expect(produce(fixture).status).toBe(0);
    expect(validate(fixture).status).toBe(0);
    const firstPacketDigest = read(fixture.packetPath).portableRecordDigestSha256;
    const firstValidationDigest = read(fixture.validationPath).portableRecordDigestSha256;

    const relocatedRoot = path.join(tempRoot, "relocated");
    fs.cpSync(fixture.packetRoot, relocatedRoot, { recursive: true });
    const relocated = relocateFixture(fixture, relocatedRoot);
    relocated.validationPath = path.join(relocatedRoot, "validation-relocated.json");
    expect(validate(relocated).status).toBe(0);

    expect(read(relocated.packetPath).portableRecordDigestSha256).toBe(firstPacketDigest);
    expect(read(relocated.validationPath).portableRecordDigestSha256).toBe(firstValidationDigest);
  });

  it("rejects v1 input as legacy untrusted data", () => {
    const fixture = createFixture(tempRoot);
    writeJson(fixture.packetPath, {
      schemaVersion: "aurora-decompilation-lineage/v1",
      authoritativeDecompilationClaim: true
    });

    const validation = validate(fixture);

    expect(validation.status).toBe(1);
    expect(read(fixture.validationPath)).toMatchObject({
      status: "blocked_legacy_or_unknown_packet",
      authoritativeDecompilationClaim: false,
      authoritativeCompleteDecompilationClaim: false
    });
  });

  it("keeps interrupted sessions blocked and resumable", () => {
    const fixture = createFixture(tempRoot, { completionMarker: "interrupted" });
    expect(produce(fixture).status).toBe(0);

    const validation = validate(fixture);

    expect(validation.status).toBe(1);
    expect(read(fixture.validationPath)).toMatchObject({
      status: "blocked_incomplete_session",
      lineageComplete: false,
      authoritativeDecompilationClaim: false,
      resumeCondition: "Resume the same Ghidra session and emit a new packet with completionMarker=ghidra-export-complete."
    });
  });
});

interface Fixture {
  packetRoot: string;
  sessionId: string;
  inputBinaryPath: string;
  toolDistributionPath: string;
  projectSnapshotPath: string;
  analyzerConfigPath: string;
  invocationLogPath: string;
  exportScriptPath: string;
  attestationPath: string;
  functionRecordsPath: string;
  failureLedgerPath: string;
  callGraphPath: string;
  exportDir: string;
  packetPath: string;
  validationPath: string;
}

function createFixture(
  packetRoot: string,
  options: {
    failedFunctionIds?: string[];
    completionMarker?: string;
    targetAddresses?: string[];
  } = {}
): Fixture {
  fs.mkdirSync(packetRoot, { recursive: true });
  const fixture: Fixture = {
    packetRoot,
    sessionId: "ghidra-session-test-0001",
    inputBinaryPath: path.join(packetRoot, "input", "nwtoolset.exe"),
    toolDistributionPath: path.join(packetRoot, "tool", "ghidra-build.txt"),
    projectSnapshotPath: path.join(packetRoot, "project", "aurora.gar"),
    analyzerConfigPath: path.join(packetRoot, "analysis", "analyzers.json"),
    invocationLogPath: path.join(packetRoot, "generation", "invocation.log"),
    exportScriptPath: path.join(packetRoot, "generation", "ExportAuroraLineage.java"),
    attestationPath: path.join(packetRoot, "generation", "session-attestation.json"),
    functionRecordsPath: path.join(packetRoot, "generation", "function-records.jsonl"),
    failureLedgerPath: path.join(packetRoot, "generation", "failure-ledger.json"),
    callGraphPath: path.join(packetRoot, "generation", "call-graph.jsonl"),
    exportDir: path.join(packetRoot, "export"),
    packetPath: path.join(packetRoot, "producer-packet.json"),
    validationPath: path.join(packetRoot, "validation.json")
  };
  for (const directory of ["input", "tool", "project", "analysis", "generation", "export"]) {
    fs.mkdirSync(path.join(packetRoot, directory), { recursive: true });
  }
  fs.writeFileSync(fixture.inputBinaryPath, minimalPe32());
  fs.writeFileSync(fixture.toolDistributionPath, "Ghidra 11.2.1 PUBLIC build 2026-08-17\n");
  fs.writeFileSync(fixture.projectSnapshotPath, "deterministic-project-snapshot\n");
  fs.writeFileSync(fixture.analyzerConfigPath, '{"Decompiler Parameter ID":"default"}\n');
  fs.writeFileSync(fixture.invocationLogPath, "analyzeHeadless exact invocation\n");
  fs.writeFileSync(fixture.exportScriptPath, "public class ExportAuroraLineage {}\n");

  const failed = new Set(options.failedFunctionIds ?? []);
  const targeted = options.targetAddresses === undefined
    ? null
    : new Set(options.targetAddresses);
  const functions = [
    { functionId: "0x00401000:FUN_1", address: "0x00401000", name: "FUN_1" },
    { functionId: "0x00401020:FUN_2", address: "0x00401020", name: "FUN_2" }
  ];
  const records: Array<Record<string, any>> = functions.map((entry) => {
    if (targeted && !targeted.has(entry.address)) {
      return {
        sessionId: fixture.sessionId,
        ...entry,
        decompileStatus: "failure",
        failureReasonCode: "decompiler_not_targeted"
      };
    }
    if (failed.has(entry.functionId)) {
      return {
        sessionId: fixture.sessionId,
        ...entry,
        decompileStatus: "failure",
        failureReasonCode: "decompiler_timeout"
      };
    }
    const outputPath = `${entry.name}.c`;
    const contents = `void ${entry.name}(void) {}\n`;
    fs.writeFileSync(path.join(fixture.exportDir, outputPath), contents);
    return {
      sessionId: fixture.sessionId,
      ...entry,
      decompileStatus: "success",
      outputPath,
      outputSha256: sha(contents)
    };
  });
  writeJsonl(fixture.functionRecordsPath, records);
  writeJson(fixture.failureLedgerPath, {
    version: "aurora-ghidra-decompilation-failure-ledger/v1",
    sessionId: fixture.sessionId,
    failures: records
      .filter((entry) => entry.decompileStatus === "failure")
      .map((entry) => ({
        functionId: entry.functionId,
        reasonCode: entry.failureReasonCode
      }))
  });
  writeJsonl(fixture.callGraphPath, [
    {
      sessionId: fixture.sessionId,
      fromFunctionId: functions[0].functionId,
      toFunctionId: functions[1].functionId
    }
  ]);
  writeAttestation(
    fixture,
    options.completionMarker ?? "ghidra-export-complete",
    options.targetAddresses
  );
  return fixture;
}

function writeAttestation(
  fixture: Fixture,
  completionMarker: string,
  targetAddresses?: string[]
): void {
  writeJson(fixture.attestationPath, {
    version: "aurora-ghidra-decompilation-session-attestation/v1",
    sessionId: fixture.sessionId,
    completionMarker,
    inputBinary: {
      sha256: hashFile(fixture.inputBinaryPath),
      pe: {
        format: "PE32",
        machine: "0x014c",
        timestamp: "0x12345678",
        optionalHeaderMagic: "0x010b",
        imageBase: "0x00400000"
      }
    },
    tool: {
      name: "Ghidra",
      version: "11.2.1",
      build: "PUBLIC-20260817",
      distributionSha256: hashFile(fixture.toolDistributionPath)
    },
    project: {
      id: "aurora-toolset-test",
      snapshotSha256: hashFile(fixture.projectSnapshotPath)
    },
    analysis: {
      loader: "Portable Executable (PE)",
      language: "x86:LE:32:default",
      imageBase: "0x00400000",
      relocationPolicy: "loader-default-recorded",
      analyzerConfigurationSha256: hashFile(fixture.analyzerConfigPath)
    },
    generation: {
      invocationLogSha256: hashFile(fixture.invocationLogPath),
      exporterScriptSha256s: [hashFile(fixture.exportScriptPath)],
      functionRecordsSha256: hashFile(fixture.functionRecordsPath),
      failureLedgerSha256: hashFile(fixture.failureLedgerPath),
      callGraphSha256: hashFile(fixture.callGraphPath),
      decompilationSelection: {
        mode: targetAddresses === undefined ? "full" : "targeted",
        addresses: [...(targetAddresses ?? [])].sort((left, right) =>
          left.localeCompare(right, "en")
        )
      },
      exportOutputs: fs
        .readdirSync(fixture.exportDir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => ({
          path: entry.name,
          sha256: hashFile(path.join(fixture.exportDir, entry.name))
        }))
        .sort((left, right) => left.path.localeCompare(right.path, "en"))
    }
  });
}

function refreshAttestation(fixture: Fixture): void {
  writeAttestation(fixture, "ghidra-export-complete");
}

function produce(fixture: Fixture) {
  return spawnSync(
    process.execPath,
    [
      producerPath,
      "--packet-root", fixture.packetRoot,
      "--input-binary", fixture.inputBinaryPath,
      "--tool-distribution", fixture.toolDistributionPath,
      "--project-snapshot", fixture.projectSnapshotPath,
      "--analyzer-config", fixture.analyzerConfigPath,
      "--session-attestation", fixture.attestationPath,
      "--invocation-log", fixture.invocationLogPath,
      "--function-records", fixture.functionRecordsPath,
      "--failure-ledger", fixture.failureLedgerPath,
      "--call-graph", fixture.callGraphPath,
      "--export-dir", fixture.exportDir,
      "--export-script", fixture.exportScriptPath,
      "--out", fixture.packetPath,
      "--generated-at", "2026-08-17T00:00:00.000Z"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );
}

function validate(fixture: Fixture) {
  return spawnSync(
    process.execPath,
    [
      validatorPath,
      "--packet-root", fixture.packetRoot,
      "--packet", fixture.packetPath,
      "--out", fixture.validationPath,
      "--generated-at", "2026-08-17T00:00:00.000Z"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );
}

function relocateFixture(fixture: Fixture, packetRoot: string): Fixture {
  const relocate = (filePath: string) => path.join(packetRoot, path.relative(fixture.packetRoot, filePath));
  return Object.fromEntries(
    Object.entries(fixture).map(([key, value]) => [
      key,
      key === "packetRoot" ? packetRoot : key === "sessionId" ? value : relocate(value)
    ])
  ) as unknown as Fixture;
}

function minimalPe32(): Buffer {
  const bytes = Buffer.alloc(512);
  bytes.write("MZ", 0, "ascii");
  bytes.writeUInt32LE(0x80, 0x3c);
  bytes.write("PE\0\0", 0x80, "binary");
  bytes.writeUInt16LE(0x014c, 0x84);
  bytes.writeUInt32LE(0x12345678, 0x88);
  bytes.writeUInt16LE(0x00e0, 0x94);
  bytes.writeUInt16LE(0x010b, 0x98);
  bytes.writeUInt32LE(0x00400000, 0x98 + 28);
  return bytes;
}

function read(filePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath: string): Array<Record<string, any>> {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(filePath: string, values: unknown[]): void {
  fs.writeFileSync(filePath, `${values.map((value) => JSON.stringify(value)).join("\n")}\n`);
}

function hashFile(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
