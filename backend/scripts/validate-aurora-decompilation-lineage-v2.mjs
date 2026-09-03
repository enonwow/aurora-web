#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import {
  FAILURE_LEDGER_SCHEMA,
  LINEAGE_V2_SCHEMA,
  LINEAGE_V2_VALIDATION_SCHEMA,
  SESSION_ATTESTATION_SCHEMA,
  LineageInputError,
  inspectInventoryAgainstDisk,
  parseLineageArgs,
  parsePortableExecutableIdentity,
  portableRecordDigest,
  readLineageJson,
  readLineageJsonl,
  requireGeneratedAt,
  requireLineageArg,
  resolveInventoryPath,
  sha256,
  toPortablePath,
  writeLineageJson
} from "./lib/aurora-decompilation-lineage-v2.mjs";

let outPath = null;
try {
  const args = parseLineageArgs(process.argv.slice(2));
  const packetRoot = path.resolve(requireLineageArg(args, "packet-root"));
  const packetPath = path.resolve(requireLineageArg(args, "packet"));
  outPath = path.resolve(requireLineageArg(args, "out"));
  const generatedAt = requireGeneratedAt(args["generated-at"]);
  const packet = readLineageJson(packetPath, "producer_packet_json_malformed");

  if (packet?.schemaVersion !== LINEAGE_V2_SCHEMA || packet?.packetType !== "producer") {
    const report = withDigest({
      schemaVersion: LINEAGE_V2_VALIDATION_SCHEMA,
      packetType: "validator-result",
      generatedAt,
      status: "blocked_legacy_or_unknown_packet",
      lineageComplete: false,
      decompilationCoverageComplete: false,
      authoritativeDecompilationClaim: false,
      authoritativeCompleteDecompilationClaim: false,
      inputPacket: toPortablePath(packetRoot, packetPath),
      producerSchemaVersion: packet?.schemaVersion ?? null,
      derivedCoverage: emptyCoverage(),
      diagnostics: [diagnostic("producer_packet_schema_untrusted")],
      resumeCondition:
        "Create a raw aurora-decompilation-lineage/v2 producer packet from one exact Ghidra session, then validate it."
    });
    writeLineageJson(outPath, report);
    process.exitCode = 1;
  } else {
    const diagnostics = [];
    const add = (code, detail = null, subject = null) =>
      diagnostics.push(diagnostic(code, detail, subject));

    if (packet.authoritativeDecompilationClaim === true || packet.authoritativeCompleteDecompilationClaim === true) {
      add("producer_packet_authority_forbidden");
    }
    const recomputedPacketDigest = portableRecordDigest(packet);
    if (packet.portableRecordDigestSha256 !== recomputedPacketDigest) {
      add("producer_packet_digest_mismatch");
    }

    const inventories = collectInventories(packet);
    const inventoryPaths = new Map();
    for (const [subject, inventory] of inventories) {
      const inspection = inspectInventoryAgainstDisk(packetRoot, inventory);
      if (!inspection.ok) {
        add(inspection.code, null, subject);
      } else {
        inventoryPaths.set(subject, inspection.filePath);
      }
    }

    const attestation = readEvidenceJson(
      inventoryPaths.get("generation.sessionAttestation"),
      "session_attestation_json_malformed",
      add
    );
    const functionRecords = readEvidenceJsonl(
      inventoryPaths.get("generation.functionRecords"),
      "function_records_jsonl_malformed",
      add
    );
    const failureLedger = readEvidenceJson(
      inventoryPaths.get("generation.failureLedger"),
      "failure_ledger_json_malformed",
      add
    );
    const callGraph = readEvidenceJsonl(
      inventoryPaths.get("generation.callGraph"),
      "call_graph_jsonl_malformed",
      add
    );

    let peIdentity = null;
    const inputPath = inventoryPaths.get("inputBinary");
    if (inputPath) {
      try {
        peIdentity = parsePortableExecutableIdentity(fs.readFileSync(inputPath));
      } catch (error) {
        add(error.code ?? "input_binary_pe_invalid");
      }
    }
    if (peIdentity && !deepEqual(peIdentity, packet.inputBinary?.pe)) {
      add("producer_packet_pe_identity_mismatch");
    }

    validateAttestation({
      packet,
      attestation,
      peIdentity,
      inventoryPaths,
      packetRoot,
      add
    });
    const derivedCoverage = validateFunctionRecords({
      packet,
      attestation,
      functionRecords,
      failureLedger,
      callGraph,
      add
    });

    const interrupted = attestation?.completionMarker === "interrupted";
    if (interrupted) add("session_completion_marker_interrupted");
    else if (attestation?.completionMarker !== "ghidra-export-complete") {
      add("session_completion_marker_invalid");
    }
    if (packet.generation?.completionMarker !== attestation?.completionMarker) {
      add("producer_completion_marker_mismatch");
    }

    const sortedDiagnostics = sortDiagnostics(diagnostics);
    const lineageComplete = sortedDiagnostics.length === 0;
    const decompilationCoverageComplete =
      lineageComplete &&
      derivedCoverage.functionDiscovered > 0 &&
      derivedCoverage.decompileFailure === 0 &&
      derivedCoverage.unknownStatus === 0 &&
      derivedCoverage.decompileSuccess === derivedCoverage.functionDiscovered;
    const status = interrupted
      ? "blocked_incomplete_session"
      : lineageComplete
        ? decompilationCoverageComplete
          ? "validated_lineage_complete_coverage_complete"
          : "validated_lineage_complete_coverage_incomplete"
        : "blocked_invalid_lineage";
    const report = withDigest({
      schemaVersion: LINEAGE_V2_VALIDATION_SCHEMA,
      packetType: "validator-result",
      generatedAt,
      status,
      lineageComplete,
      decompilationCoverageComplete,
      authoritativeDecompilationClaim: lineageComplete,
      authoritativeCompleteDecompilationClaim:
        lineageComplete && decompilationCoverageComplete,
      inputPacket: toPortablePath(packetRoot, packetPath),
      producerPortableRecordDigestSha256: packet.portableRecordDigestSha256 ?? null,
      recomputedProducerPortableRecordDigestSha256: recomputedPacketDigest,
      sessionId: attestation?.sessionId ?? packet.sessionId ?? null,
      derivedCoverage,
      diagnostics: sortedDiagnostics,
      resumeCondition: interrupted
        ? "Resume the same Ghidra session and emit a new packet with completionMarker=ghidra-export-complete."
        : lineageComplete
          ? null
          : "Repair the listed identity/cross-reference failures and emit a new raw producer packet; validator output cannot be edited into authority."
    });
    writeLineageJson(outPath, report);
    process.stdout.write(
      `${JSON.stringify({
        result: report.status,
        report: outPath,
        lineageComplete,
        decompilationCoverageComplete,
        authoritativeDecompilationClaim: report.authoritativeDecompilationClaim
      }, null, 2)}\n`
    );
    if (!lineageComplete) process.exitCode = 1;
  }
} catch (error) {
  const code = error instanceof LineageInputError ? error.code : "validator_input_invalid";
  const message = error instanceof Error ? error.message : String(error);
  const report = withDigest({
    schemaVersion: LINEAGE_V2_VALIDATION_SCHEMA,
    packetType: "validator-result",
    generatedAt: new Date().toISOString(),
    status: "blocked_invalid_validator_input",
    lineageComplete: false,
    decompilationCoverageComplete: false,
    authoritativeDecompilationClaim: false,
    authoritativeCompleteDecompilationClaim: false,
    inputPacket: null,
    derivedCoverage: emptyCoverage(),
    diagnostics: [diagnostic(code, message)],
    resumeCondition: "Repair the validator inputs and rerun validation."
  });
  if (outPath) writeLineageJson(outPath, report);
  process.stderr.write(
    `${JSON.stringify({
      result: report.status,
      authoritativeDecompilationClaim: false,
      diagnosticCode: code,
      message
    }, null, 2)}\n`
  );
  process.exitCode = 1;
}

function validateAttestation({ packet, attestation, peIdentity, inventoryPaths, packetRoot, add }) {
  if (!attestation || attestation.version !== SESSION_ATTESTATION_SCHEMA) {
    add("session_attestation_schema_invalid");
    return;
  }
  if (!/^ghidra-session-[A-Za-z0-9_-]{8,}$/u.test(attestation.sessionId ?? "")) {
    add("session_id_invalid");
  }
  if (packet.sessionId !== attestation.sessionId) add("producer_packet_session_mismatch");
  if (packet.generation?.sessionAttestation?.record &&
      !deepEqual(packet.generation.sessionAttestation.record, attestation)) {
    add("embedded_session_attestation_mismatch");
  }
  if (attestation.inputBinary?.sha256 !== packet.inputBinary?.file?.sha256) {
    add("attestation_input_binary_hash_mismatch");
  }
  if (peIdentity && !deepEqual(attestation.inputBinary?.pe, peIdentity)) {
    add("attestation_pe_identity_mismatch");
  }
  if (attestation.tool?.name !== "Ghidra") add("attestation_tool_name_invalid");
  if (!nonEmpty(attestation.tool?.version) || !nonEmpty(attestation.tool?.build)) {
    add("attestation_tool_build_identity_missing");
  }
  if (attestation.tool?.distributionSha256 !== packet.tool?.distribution?.sha256) {
    add("attestation_tool_distribution_hash_mismatch");
  }
  if (!nonEmpty(attestation.project?.id)) add("attestation_project_id_missing");
  if (attestation.project?.snapshotSha256 !== packet.project?.snapshot?.sha256) {
    add("attestation_project_snapshot_hash_mismatch");
  }
  if (!String(attestation.analysis?.loader ?? "").toLowerCase().includes("portable executable")) {
    add("attestation_loader_not_pe");
  }
  if (peIdentity) {
    const expectedWidth = peIdentity.format === "PE32" ? ":32:" : ":64:";
    if (!String(attestation.analysis?.language ?? "").includes(expectedWidth)) {
      add("attestation_language_width_mismatch");
    }
    if (attestation.analysis?.imageBase !== peIdentity.imageBase) {
      add("attestation_image_base_mismatch");
    }
  }
  if (!nonEmpty(attestation.analysis?.relocationPolicy)) {
    add("attestation_relocation_policy_missing");
  }
  if (
    attestation.analysis?.analyzerConfigurationSha256 !==
    packet.analysis?.analyzerConfiguration?.sha256
  ) {
    add("attestation_analyzer_configuration_hash_mismatch");
  }
  if (attestation.generation?.invocationLogSha256 !== packet.generation?.invocationLog?.sha256) {
    add("attestation_invocation_log_hash_mismatch");
  }
  const attestedScripts = [...(attestation.generation?.exporterScriptSha256s ?? [])].sort();
  const packetScripts = (packet.generation?.exporterScripts ?? [])
    .map((entry) => entry.sha256)
    .sort();
  if (!deepEqual(attestedScripts, packetScripts)) {
    add("attestation_exporter_script_hash_mismatch");
  }

  compareAttestedGenerationHash(
    attestation.generation?.functionRecordsSha256,
    packet.generation?.functionRecords?.file?.sha256,
    "attestation_function_records_hash_mismatch",
    add
  );
  compareAttestedGenerationHash(
    attestation.generation?.failureLedgerSha256,
    packet.generation?.failureLedger?.file?.sha256,
    "attestation_failure_ledger_hash_mismatch",
    add
  );
  compareAttestedGenerationHash(
    attestation.generation?.callGraphSha256,
    packet.generation?.callGraph?.file?.sha256,
    "attestation_call_graph_hash_mismatch",
    add
  );
  const actualExportOutputs = (packet.export?.outputs ?? [])
    .map((entry) => ({ path: entry.exportPath, sha256: entry.sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  const attestedExportOutputs = [...(attestation.generation?.exportOutputs ?? [])]
    .map((entry) => ({ path: entry.path, sha256: entry.sha256 }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  if (!deepEqual(attestedExportOutputs, actualExportOutputs)) {
    add("attestation_export_inventory_mismatch");
  }

  for (const [subject, field] of [
    ["generation.functionRecords", "functionRecordsSha256"],
    ["generation.failureLedger", "failureLedgerSha256"],
    ["generation.callGraph", "callGraphSha256"]
  ]) {
    if (inventoryPaths.has(subject) && !nonEmpty(attestation.generation?.[field])) {
      add("attestation_generation_hash_missing", field);
    }
  }
  void packetRoot;
}

function validateFunctionRecords({ packet, attestation, functionRecords, failureLedger, callGraph, add }) {
  const records = Array.isArray(functionRecords) ? functionRecords : [];
  const sessionId = attestation?.sessionId ?? null;
  const selection = attestation?.generation?.decompilationSelection;
  let selectionMode = "full";
  const selectedAddresses = new Set();
  let selectionValid = true;
  if (selection !== undefined) {
    if (!selection || !["full", "targeted"].includes(selection.mode) || !Array.isArray(selection.addresses)) {
      add("decompilation_selection_invalid");
      selectionValid = false;
    } else {
      selectionMode = selection.mode;
      for (const address of selection.addresses) {
        if (!/^0x[0-9a-f]{8,16}$/u.test(address ?? "") || selectedAddresses.has(address)) {
          add("decompilation_selection_invalid", address ?? null);
          selectionValid = false;
          continue;
        }
        selectedAddresses.add(address);
      }
      if ((selectionMode === "full" && selectedAddresses.size !== 0) ||
          (selectionMode === "targeted" && selectedAddresses.size === 0)) {
        add("decompilation_selection_invalid", selectionMode);
        selectionValid = false;
      }
    }
  }
  const functionIds = new Set();
  const discoveredAddresses = new Set();
  const failed = new Map();
  let success = 0;
  let failure = 0;
  let unknown = 0;
  const outputByExportPath = new Map(
    (packet.export?.outputs ?? []).map((entry) => [entry.exportPath, entry])
  );
  for (const record of records) {
    if (record?.sessionId !== sessionId) add("function_record_session_mismatch", null, record?.functionId);
    const functionId = record?.functionId;
    if (!nonEmpty(functionId) || !/^0x[0-9a-f]{8,16}:[A-Za-z0-9_?$@]+$/u.test(functionId)) {
      add("function_identity_invalid", null, functionId ?? null);
      continue;
    }
    if (`${record.address}:${record.name}` !== functionId) {
      add("function_identity_components_mismatch", null, functionId);
    }
    discoveredAddresses.add(record.address);
    if (functionIds.has(functionId)) add("function_identity_duplicate", null, functionId);
    functionIds.add(functionId);
    if (record.decompileStatus === "success") {
      success += 1;
      if (!nonEmpty(record.outputPath) || !nonEmpty(record.outputSha256)) {
        add("function_success_output_missing", null, functionId);
      } else {
        const output = outputByExportPath.get(record.outputPath);
        if (!output) add("function_success_output_not_in_inventory", record.outputPath, functionId);
        else if (output.sha256 !== record.outputSha256) {
          add("function_success_output_hash_mismatch", record.outputPath, functionId);
        }
      }
    } else if (record.decompileStatus === "failure") {
      failure += 1;
      if (!nonEmpty(record.failureReasonCode)) add("function_failure_reason_missing", null, functionId);
      failed.set(functionId, record.failureReasonCode ?? null);
    } else {
      unknown += 1;
      add("function_decompile_status_invalid", null, functionId);
    }
    if (selectionValid && selection !== undefined) {
      const selected = selectedAddresses.has(record.address);
      if (selectionMode === "targeted" && !selected &&
          !(record.decompileStatus === "failure" &&
            record.failureReasonCode === "decompiler_not_targeted")) {
        add("decompilation_selection_non_target_record_invalid", null, functionId);
      }
      if (selectionMode === "targeted" && selected &&
          record.failureReasonCode === "decompiler_not_targeted") {
        add("decompilation_selection_target_record_invalid", null, functionId);
      }
      if (selectionMode === "full" && record.failureReasonCode === "decompiler_not_targeted") {
        add("decompilation_selection_full_record_invalid", null, functionId);
      }
    }
  }
  if (records.length === 0) add("function_records_empty");
  if (selectionValid && selectionMode === "targeted") {
    for (const address of selectedAddresses) {
      if (!discoveredAddresses.has(address)) {
        add("decompilation_selection_target_missing", address);
      }
    }
  }

  const ledgerFailures = Array.isArray(failureLedger?.failures) ? failureLedger.failures : [];
  if (failureLedger?.version !== FAILURE_LEDGER_SCHEMA) add("failure_ledger_schema_invalid");
  if (failureLedger?.sessionId !== sessionId) add("failure_ledger_session_mismatch");
  const ledgerMap = new Map();
  for (const entry of ledgerFailures) {
    if (ledgerMap.has(entry?.functionId)) add("failure_ledger_identity_duplicate", null, entry?.functionId);
    ledgerMap.set(entry?.functionId, entry?.reasonCode ?? null);
  }
  if (!sameMap(ledgerMap, failed)) add("failure_ledger_identity_mismatch");

  const edgeKeys = new Set();
  for (const edge of Array.isArray(callGraph) ? callGraph : []) {
    if (edge?.sessionId !== sessionId) add("call_graph_session_mismatch");
    if (!functionIds.has(edge?.fromFunctionId) || !functionIds.has(edge?.toFunctionId)) {
      add("call_graph_node_unknown", `${edge?.fromFunctionId ?? "?"}->${edge?.toFunctionId ?? "?"}`);
    }
    const key = `${edge?.fromFunctionId ?? "?"}->${edge?.toFunctionId ?? "?"}`;
    if (edgeKeys.has(key)) add("call_graph_edge_duplicate", key);
    edgeKeys.add(key);
  }

  const derived = {
    functionDiscovered: records.length,
    decompileSuccess: success,
    decompileFailure: failure,
    unknownStatus: unknown,
    callGraphEdgeCount: Array.isArray(callGraph) ? callGraph.length : 0,
    failureLedgerCount: ledgerFailures.length
  };
  if (packet.generation?.functionRecords?.recordCount !== records.length) {
    add("producer_function_record_count_mismatch");
  }
  if (packet.generation?.failureLedger?.failureCount !== ledgerFailures.length) {
    add("producer_failure_ledger_count_mismatch");
  }
  if (packet.generation?.callGraph?.edgeCount !== derived.callGraphEdgeCount) {
    add("producer_call_graph_edge_count_mismatch");
  }
  const packetCoverage = packet.derivedCoverage ?? {};
  for (const key of ["functionDiscovered", "decompileSuccess", "decompileFailure", "unknownStatus"]) {
    if (packetCoverage[key] !== derived[key]) add("producer_derived_coverage_mismatch", key);
  }
  return derived;
}

function collectInventories(packet) {
  const entries = [
    ["inputBinary", packet.inputBinary?.file],
    ["tool.distribution", packet.tool?.distribution],
    ["project.snapshot", packet.project?.snapshot],
    ["analysis.analyzerConfiguration", packet.analysis?.analyzerConfiguration],
    ["generation.sessionAttestation", packet.generation?.sessionAttestation?.file],
    ["generation.invocationLog", packet.generation?.invocationLog],
    ["generation.functionRecords", packet.generation?.functionRecords?.file],
    ["generation.failureLedger", packet.generation?.failureLedger?.file],
    ["generation.callGraph", packet.generation?.callGraph?.file]
  ];
  for (const [index, inventory] of (packet.generation?.exporterScripts ?? []).entries()) {
    entries.push([`generation.exporterScripts[${index}]`, inventory]);
  }
  for (const [index, inventory] of (packet.export?.outputs ?? []).entries()) {
    entries.push([`export.outputs[${index}]`, inventory]);
  }
  return entries;
}

function readEvidenceJson(filePath, code, add) {
  if (!filePath) return null;
  try {
    return readLineageJson(filePath, code);
  } catch (error) {
    add(error.code ?? code);
    return null;
  }
}

function readEvidenceJsonl(filePath, code, add) {
  if (!filePath) return [];
  try {
    return readLineageJsonl(filePath, code);
  } catch (error) {
    add(error.code ?? code);
    return [];
  }
}

function compareAttestedGenerationHash(actual, expected, code, add) {
  if (actual !== expected) add(code);
}

function withDigest(report) {
  return { ...report, portableRecordDigestSha256: portableRecordDigest(report) };
}

function diagnostic(code, detail = null, subject = null) {
  return { code, detail, subject };
}

function sortDiagnostics(diagnostics) {
  return [...diagnostics].sort((left, right) =>
    `${left.code}:${left.subject ?? ""}:${left.detail ?? ""}`.localeCompare(
      `${right.code}:${right.subject ?? ""}:${right.detail ?? ""}`,
      "en"
    )
  );
}

function emptyCoverage() {
  return {
    functionDiscovered: 0,
    decompileSuccess: 0,
    decompileFailure: 0,
    unknownStatus: 0,
    callGraphEdgeCount: 0,
    failureLedgerCount: 0
  };
}

function sameMap(left, right) {
  if (left.size !== right.size) return false;
  for (const [key, value] of left) if (right.get(key) !== value) return false;
  return true;
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

void resolveInventoryPath;
void sha256;
