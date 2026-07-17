import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const options = parseArgs(process.argv.slice(2));
const fixtureId = requiredOption(options, "fixture");
const timeSeconds = Number.parseFloat(options.time ?? "0.5");
const seed = Number.parseInt(options.seed ?? "1", 10);
const outPath = path.resolve(requiredOption(options, "out"));
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(scriptDir, "..");

const vite = await createServer({
  root: frontendRoot,
  logLevel: "error",
  server: { middlewareMode: true },
  appType: "custom"
});

try {
  const module = await vite.ssrLoadModule("/src/modules/vfx/dev/vfxFixturePayloads.ts");
  const fixture = module.createDevAuroraVfxPayload({
    fixtureId,
    timeSeconds,
    seed
  });
  const contracts = fixture.payload.contracts;
  const renderContract = contracts.renderContract;
  const snapshot = {
    version: "aurora-vfx-dev-render-contract-snapshot/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: fixture.fixtureId,
    requestedFixtureId: fixtureId,
    title: fixture.title,
    timeSeconds: fixture.timeSeconds,
    seed: fixture.seed,
    oracle: fixture.oracle,
    comparisonResult: fixture.comparisonResult,
    canonicalParityPromoted: fixture.canonicalParityPromoted,
    localOnlyNotRetailEvidence: true,
    payloadVersion: fixture.payload.version,
    sourceRows: contracts.sourceRows,
    effectInstance: contracts.effectInstance,
    phaseSchedule: contracts.phaseSchedule,
    dependencyGraph: contracts.dependencyGraph,
    runtimeState: contracts.runtimeState,
    renderContract,
    diagnostics: fixture.payload.diagnostics,
    provenance: fixture.payload.provenance,
    metrics: {
      drawLane: renderContract.drawLane,
      activeParticleCount: renderContract.activeParticleCount,
      drawParticleCount: renderContract.drawParticleCount,
      drawVertexCount: renderContract.drawVertexCount,
      drawRecordCount: Array.isArray(renderContract.drawRecords)
        ? renderContract.drawRecords.length
        : 0,
      diagnosticCodes: flattenDiagnosticCodes(fixture.payload.diagnostics),
      renderContractSha256: sha256Json(renderContract),
      payloadContractsSha256: sha256Json(contracts)
    },
    notes: [
      "This snapshot is produced from the dev VFX fixture payload generator.",
      "It is a local render-contract diagnostic and cannot promote canonical retail parity."
    ]
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        fixtureId: snapshot.fixtureId,
        outPath,
        drawLane: snapshot.metrics.drawLane,
        drawParticleCount: snapshot.metrics.drawParticleCount,
        drawVertexCount: snapshot.metrics.drawVertexCount,
        renderContractSha256: snapshot.metrics.renderContractSha256
      },
      null,
      2
    )
  );
} finally {
  await vite.close();
}

function flattenDiagnosticCodes(diagnostics) {
  return Object.values(diagnostics ?? {})
    .flatMap((entries) => (Array.isArray(entries) ? entries : []))
    .map((entry) => entry.code)
    .filter((code) => typeof code === "string")
    .sort();
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(stableJson(value))).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return value.map(stableJson);
  }
  if (!value || typeof value !== "object") {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableJson(entry)])
  );
}

function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      result[key] = "true";
      continue;
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function requiredOption(options, key) {
  const value = options[key];
  if (!value) {
    throw new Error(`Missing required --${key} option.`);
  }
  return value;
}
