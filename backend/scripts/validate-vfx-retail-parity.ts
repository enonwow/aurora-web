import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  validateAuroraVfxRetailParityManifest,
  type AuroraVfxRetailParityManifest
} from "../src/modules/vfx/domain/aurora-vfx-retail-parity-gate";

const manifestPath =
  process.argv[2] ??
  resolve(process.cwd(), "docs", "aurora-reverse", "vfx-retail-parity-fixtures.json");

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as AuroraVfxRetailParityManifest;
const result = validateAuroraVfxRetailParityManifest(manifest);

const summary = {
  manifestPath,
  fixtureCount: result.fixtureCount,
  canonicalAllowedFixtureCount: result.canonicalAllowedFixtureCount,
  blockedFixtureCount: result.blockedFixtureCount,
  allCanonicalClaimsValid: result.allCanonicalClaimsValid,
  missingEvidenceSummary: result.missingEvidenceSummary,
  fixtures: result.fixtures.map((fixture) => ({
    fixtureId: fixture.fixtureId,
    requiredCase: fixture.requiredCase,
    status: fixture.status,
    behaviorClaim: fixture.behaviorClaim,
    diagnosticEvidenceRefCount: fixture.diagnosticEvidenceRefCount,
    hasImplementationRevision: fixture.hasImplementationRevision,
    canonicalAllowed: fixture.canonicalAllowed,
    missingEvidence: fixture.missingEvidence,
    nextActions: fixture.nextActions,
    diagnostics: fixture.diagnostics.map((diagnostic) => ({
      code: diagnostic.code,
      severity: diagnostic.severity,
      message: diagnostic.message
    }))
  }))
};

console.log(JSON.stringify(summary, null, 2));

if (
  result.blockedFixtureCount > 0 ||
  result.diagnostics.some((diagnostic) => diagnostic.severity === "error")
) {
  process.exitCode = 1;
}
