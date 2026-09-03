#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SCHEMA_VERSION = "aurora-decompilation-lineage/v1";
const LEGACY_MISSING_LINEAGE_FIELDS = [
  "input.binding",
  "tool.name",
  "tool.version",
  "project.id",
  "project.snapshot",
  "analysis.loader",
  "analysis.language",
  "analysis.imageBase",
  "analysis.relocationPolicy",
  "analysis.analyzerConfiguration",
  "generation.sessionId",
  "generation.invocationLog",
  "generation.exportScripts",
  "generation.failureLedger",
  "coverage.functionDiscovered",
  "coverage.decompileSuccess",
  "coverage.decompileFailure",
  "coverage.callGraph"
];

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({
    result: "decompilation-lineage-input-invalid",
    status: "blocked_invalid_input",
    authoritativeDecompilationClaim: false,
    message
  }, null, 2));
  process.exit(2);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = requireOneOf(args.mode, "mode", ["audit-legacy", "bind-session"]);
  const outPath = requirePath(args.out, "out");
  const exportDir = requireDirectory(args["export-dir"], "export-dir");
  const generatedAt = readGeneratedAt(args["generated-at"]);
  const outputs = inventoryDirectory(exportDir, outPath);
  if (outputs.length === 0) {
    throw new Error("export-dir must contain at least one regular output file");
  }

  if (mode === "audit-legacy") {
    const candidateInput = args["candidate-input-binary"]
      ? {
          classification: "candidate_only_not_proven_generator_input",
          ...inventoryFile(requireFile(args["candidate-input-binary"], "candidate-input-binary"))
        }
      : null;
    const report = withRecordDigest({
      schemaVersion: SCHEMA_VERSION,
      generatedAt,
      status: "blocked_unbound_legacy_export",
      lineageBound: false,
      authoritativeDecompilationClaim: false,
      candidateInput,
      exportDirectory: path.resolve(exportDir),
      outputs,
      missingLineageFields: LEGACY_MISSING_LINEAGE_FIELDS,
      blocker:
        "Output hashes prove only current export identity. No evidence binds this legacy export to the candidate input or a reproducible decompiler session."
    });
    writeJson(outPath, report);
    console.error(JSON.stringify({
      result: report.status,
      report: path.resolve(outPath),
      outputCount: outputs.length,
      missingLineageFieldCount: report.missingLineageFields.length
    }, null, 2));
    process.exit(1);
  }

  const functionDiscovered = requireNonNegativeInteger(args["function-discovered"], "function-discovered");
  const decompileSuccess = requireNonNegativeInteger(args["decompile-success"], "decompile-success");
  const decompileFailure = requireNonNegativeInteger(args["decompile-failure"], "decompile-failure");
  if (decompileSuccess + decompileFailure !== functionDiscovered) {
    throw new Error(
      "decompile-success plus decompile-failure must equal function-discovered"
    );
  }

  const exportScriptPaths = asArray(args["export-script"]);
  if (exportScriptPaths.length === 0) {
    throw new Error("export-script is required at least once");
  }
  const report = withRecordDigest({
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    status: "bound_complete_legacy_untrusted",
    lineageBound: true,
    authoritativeDecompilationClaim: false,
    authorityMigration:
      "v1 self-attestation is legacy/untrusted; only an independent aurora-decompilation-lineage-validation/v2 result may assert authority",
    sessionId: requireString(args["session-id"], "session-id"),
    inputBinary: inventoryFile(requireFile(args["input-binary"], "input-binary")),
    tool: {
      name: requireString(args["tool-name"], "tool-name"),
      version: requireString(args["tool-version"], "tool-version")
    },
    project: {
      id: requireString(args["project-id"], "project-id"),
      snapshot: inventoryFile(requireFile(args["project-snapshot"], "project-snapshot"))
    },
    analysis: {
      loader: requireString(args.loader, "loader"),
      language: requireString(args.language, "language"),
      imageBase: requireString(args["image-base"], "image-base"),
      relocationPolicy: requireString(args["relocation-policy"], "relocation-policy"),
      analyzerConfiguration: inventoryFile(
        requireFile(args["analyzer-config"], "analyzer-config")
      )
    },
    generation: {
      invocationLog: inventoryFile(requireFile(args["invocation-log"], "invocation-log")),
      exportScripts: exportScriptPaths
        .map((filePath, index) => inventoryFile(requireFile(filePath, `export-script[${index}]`)))
        .sort(compareInventoryPaths),
      failureLedger: inventoryFile(requireFile(args["failure-ledger"], "failure-ledger"))
    },
    coverage: {
      functionDiscovered,
      decompileSuccess,
      decompileFailure,
      complete: true,
      callGraph: inventoryFile(requireFile(args["call-graph"], "call-graph"))
    },
    exportDirectory: path.resolve(exportDir),
    outputs
  });
  writeJson(outPath, report);
  console.log(JSON.stringify({
    result: report.status,
    report: path.resolve(outPath),
    recordDigestSha256: report.recordDigestSha256,
    outputCount: outputs.length
  }, null, 2));
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`unexpected positional argument: ${token}`);
    }
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`missing value for --${key}`);
    }
    index += 1;
    if (key === "export-script") {
      parsed[key] = [...asArray(parsed[key]), value];
    } else {
      parsed[key] = value;
    }
  }
  return parsed;
}

function inventoryDirectory(directoryPath, excludedPath) {
  const resolvedExcluded = path.resolve(excludedPath);
  return walkFiles(directoryPath)
    .filter((filePath) => path.resolve(filePath) !== resolvedExcluded)
    .map((filePath) => {
      const inventory = inventoryFile(filePath);
      return {
        path: path.relative(directoryPath, filePath).replaceAll("\\", "/"),
        bytes: inventory.bytes,
        sha256: inventory.sha256
      };
    })
    .sort(compareInventoryPaths);
}

function walkFiles(directoryPath) {
  return fs.readdirSync(directoryPath, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      return walkFiles(entryPath);
    }
    return entry.isFile() ? [entryPath] : [];
  });
}

function inventoryFile(filePath) {
  const resolvedPath = path.resolve(filePath);
  const bytes = fs.readFileSync(resolvedPath);
  return {
    path: resolvedPath,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex")
  };
}

function withRecordDigest(report) {
  return {
    ...report,
    recordDigestSha256: createHash("sha256").update(JSON.stringify(report)).digest("hex")
  };
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function requirePath(value, name) {
  return path.resolve(requireString(value, name));
}

function requireFile(value, name) {
  const filePath = requirePath(value, name);
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`${name} must reference an existing regular file: ${filePath}`);
  }
  return filePath;
}

function requireDirectory(value, name) {
  const directoryPath = requirePath(value, name);
  if (!fs.existsSync(directoryPath) || !fs.statSync(directoryPath).isDirectory()) {
    throw new Error(`${name} must reference an existing directory: ${directoryPath}`);
  }
  return directoryPath;
}

function requireString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

function requireOneOf(value, name, allowed) {
  const result = requireString(value, name);
  if (!allowed.includes(result)) {
    throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  }
  return result;
}

function requireNonNegativeInteger(value, name) {
  const result = Number(requireString(value, name));
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return result;
}

function readGeneratedAt(value) {
  if (value === undefined) {
    return new Date().toISOString();
  }
  const result = requireString(value, "generated-at");
  if (!Number.isFinite(Date.parse(result))) {
    throw new Error("generated-at must be an ISO-8601 timestamp");
  }
  return result;
}

function asArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  return value === undefined ? [] : [value];
}

function compareInventoryPaths(left, right) {
  return left.path.localeCompare(right.path, "en");
}
