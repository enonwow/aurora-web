import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const fixtureRoot = path.resolve(repoRoot, "frontend/public/dev-fixtures");
const fixtureIds = [
  "vfx-broad-row44",
  "vfx-broad-row50",
  "vfx-broad-row210",
  "vfx-broad-row216",
  "vfx-broad-row181",
  "vfx-broad-row1",
  "vfx-broad-aoe0"
];
const allowedUnresolvedClasses = new Set(["sound", "progfx_row"]);
const totals = {
  edgeCount: 0,
  resolvedCount: 0,
  unresolvedCount: 0,
  sourceOnlyCount: 0
};

for (const fixtureId of fixtureIds) {
  const payloadPath = path.resolve(fixtureRoot, fixtureId, "payload.json");
  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  const edges = payload.contracts?.dependencyGraph?.edges;
  if (!Array.isArray(edges)) {
    throw new Error(`${fixtureId} dependency graph edges are missing.`);
  }

  for (const edge of edges) {
    totals.edgeCount += 1;
    if (edge.resolveStatus === "resolved") totals.resolvedCount += 1;
    if (edge.resolveStatus === "unresolved") totals.unresolvedCount += 1;
    if (edge.resolveStatus === "source_only") totals.sourceOnlyCount += 1;

    if (/^\s*null(?:\.txi)?\s*$/iu.test(edge.requestedRef)) {
      throw new Error(`${fixtureId} exposes Aurora texture NULL as resource edge ${edge.edgeId}.`);
    }
    if (
      edge.diagnostics?.some(
        (diagnostic) => diagnostic.code === "VFX_TEXTURE_RESOURCE_MISSING_DIAGNOSTIC"
      )
    ) {
      throw new Error(`${fixtureId} still reports missing delivered texture ${edge.requestedRef}.`);
    }
    if (edge.edgeType === "texture" && edge.resolveStatus !== "resolved") {
      throw new Error(`${fixtureId} texture ${edge.requestedRef} is not provenance-resolved.`);
    }
    if (edge.resolveStatus === "resolved") {
      const candidate = edge.selectedCandidate;
      if (
        !candidate ||
        candidate.sourceLayer !== "vanilla" ||
        typeof candidate.resourceHash !== "string" ||
        candidate.resourceHash.length === 0 ||
        typeof candidate.sourcePath !== "string" ||
        !candidate.sourcePath.startsWith("proof/vfx-broad/") ||
        path.isAbsolute(candidate.sourcePath)
      ) {
        throw new Error(`${fixtureId} resolved edge ${edge.edgeId} lacks safe retail provenance.`);
      }
    }
    if (
      edge.resolveStatus === "unresolved" &&
      !allowedUnresolvedClasses.has(edge.requestedResourceClass)
    ) {
      throw new Error(
        `${fixtureId} has unexpected unresolved ${edge.requestedResourceClass} ${edge.requestedRef}.`
      );
    }
  }
}

const expectedTotals = {
  edgeCount: 98,
  resolvedCount: 67,
  unresolvedCount: 9,
  sourceOnlyCount: 22
};
if (JSON.stringify(totals) !== JSON.stringify(expectedTotals)) {
  throw new Error(
    `Broad resource-resolution totals changed: ${JSON.stringify({ expectedTotals, totals })}`
  );
}

process.stdout.write(
  `${JSON.stringify({
    contract: "aurora-vfx-broad-resource-resolution-fixtures/v1",
    fixtureCount: fixtureIds.length,
    ...totals,
    unresolvedClasses: [...allowedUnresolvedClasses],
    status: "pass"
  })}\n`
);
