#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  LINEAGE_V2_SCHEMA,
  LineageInputError,
  asArray,
  inventoryLineageDirectory,
  inventoryLineageFile,
  parseLineageArgs,
  parsePortableExecutableIdentity,
  portableRecordDigest,
  readLineageJson,
  readLineageJsonl,
  requireGeneratedAt,
  requireLineageArg,
  writeLineageJson
} from "./lib/aurora-decompilation-lineage-v2.mjs";

try {
  const args = parseLineageArgs(process.argv.slice(2));
  const packetRoot = path.resolve(requireLineageArg(args, "packet-root"));
  const outPath = path.resolve(requireLineageArg(args, "out"));
  const generatedAt = requireGeneratedAt(args["generated-at"]);
  const inputBinaryPath = path.resolve(requireLineageArg(args, "input-binary"));
  const toolDistributionPath = path.resolve(requireLineageArg(args, "tool-distribution"));
  const projectSnapshotPath = path.resolve(requireLineageArg(args, "project-snapshot"));
  const analyzerConfigPath = path.resolve(requireLineageArg(args, "analyzer-config"));
  const attestationPath = path.resolve(requireLineageArg(args, "session-attestation"));
  const invocationLogPath = path.resolve(requireLineageArg(args, "invocation-log"));
  const functionRecordsPath = path.resolve(requireLineageArg(args, "function-records"));
  const failureLedgerPath = path.resolve(requireLineageArg(args, "failure-ledger"));
  const callGraphPath = path.resolve(requireLineageArg(args, "call-graph"));
  const exportDir = path.resolve(requireLineageArg(args, "export-dir"));
  const exportScriptPaths = asArray(args["export-script"]).map((entry) => path.resolve(entry));
  if (exportScriptPaths.length === 0) {
    throw new LineageInputError("export_script_required", "At least one --export-script is required.");
  }

  const inputBinary = inventoryLineageFile(packetRoot, inputBinaryPath);
  const peIdentity = parsePortableExecutableIdentity(fs.readFileSync(inputBinaryPath));
  const attestation = readLineageJson(attestationPath, "session_attestation_json_malformed");
  const functionRecords = readLineageJsonl(functionRecordsPath, "function_records_jsonl_malformed");
  const callGraphRecords = readLineageJsonl(callGraphPath, "call_graph_jsonl_malformed");
  const failureLedger = readLineageJson(failureLedgerPath, "failure_ledger_json_malformed");
  const successCount = functionRecords.filter((entry) => entry?.decompileStatus === "success").length;
  const failureCount = functionRecords.filter((entry) => entry?.decompileStatus === "failure").length;
  const unknownCount = functionRecords.length - successCount - failureCount;
  const outputs = inventoryLineageDirectory(packetRoot, exportDir, [outPath]);

  const report = {
    schemaVersion: LINEAGE_V2_SCHEMA,
    packetType: "producer",
    generatedAt,
    status:
      attestation?.completionMarker === "ghidra-export-complete"
        ? "producer_packet_complete_unvalidated"
        : "producer_packet_incomplete_unvalidated",
    lineageComplete: false,
    decompilationCoverageComplete: false,
    authoritativeDecompilationClaim: false,
    authoritativeCompleteDecompilationClaim: false,
    sessionId: attestation?.sessionId ?? null,
    inputBinary: { file: inputBinary, pe: peIdentity },
    tool: {
      distribution: inventoryLineageFile(packetRoot, toolDistributionPath),
      attestedIdentity: {
        name: attestation?.tool?.name ?? null,
        version: attestation?.tool?.version ?? null,
        build: attestation?.tool?.build ?? null
      }
    },
    project: {
      snapshot: inventoryLineageFile(packetRoot, projectSnapshotPath),
      attestedId: attestation?.project?.id ?? null
    },
    analysis: {
      analyzerConfiguration: inventoryLineageFile(packetRoot, analyzerConfigPath),
      loader: attestation?.analysis?.loader ?? null,
      language: attestation?.analysis?.language ?? null,
      imageBase: attestation?.analysis?.imageBase ?? null,
      relocationPolicy: attestation?.analysis?.relocationPolicy ?? null
    },
    generation: {
      sessionAttestation: {
        file: inventoryLineageFile(packetRoot, attestationPath),
        record: attestation
      },
      invocationLog: inventoryLineageFile(packetRoot, invocationLogPath),
      exporterScripts: exportScriptPaths
        .map((filePath) => inventoryLineageFile(packetRoot, filePath))
        .sort((left, right) => left.portablePath.localeCompare(right.portablePath, "en")),
      functionRecords: {
        file: inventoryLineageFile(packetRoot, functionRecordsPath),
        recordCount: functionRecords.length
      },
      failureLedger: {
        file: inventoryLineageFile(packetRoot, failureLedgerPath),
        failureCount: Array.isArray(failureLedger?.failures) ? failureLedger.failures.length : null
      },
      callGraph: {
        file: inventoryLineageFile(packetRoot, callGraphPath),
        edgeCount: callGraphRecords.length
      },
      completionMarker: attestation?.completionMarker ?? null
    },
    derivedCoverage: {
      functionDiscovered: functionRecords.length,
      decompileSuccess: successCount,
      decompileFailure: failureCount,
      unknownStatus: unknownCount
    },
    export: {
      directoryPortablePath: path.relative(packetRoot, exportDir).replaceAll("\\", "/"),
      hostPathDiagnostic: exportDir,
      outputs
    }
  };
  report.portableRecordDigestSha256 = portableRecordDigest(report);
  writeLineageJson(outPath, report);
  process.stdout.write(
    `${JSON.stringify({
      result: report.status,
      report: outPath,
      portableRecordDigestSha256: report.portableRecordDigestSha256,
      authoritativeDecompilationClaim: false
    }, null, 2)}\n`
  );
} catch (error) {
  const code = error instanceof LineageInputError ? error.code : "producer_input_invalid";
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(
    `${JSON.stringify({
      result: "decompilation-lineage-v2-producer-input-invalid",
      status: "blocked_invalid_input",
      authoritativeDecompilationClaim: false,
      diagnosticCode: code,
      message
    }, null, 2)}\n`
  );
  process.exitCode = 2;
}
