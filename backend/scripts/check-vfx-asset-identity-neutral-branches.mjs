#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  findAssetIdentityBranchViolations,
  findPythonAssetIdentityBranchViolations
} from "./lib/asset-identity-branch-gate.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const targets = [
  {
    file: "frontend/src/modules/vfx/dev/NwnVfxComparisonRunner.tsx",
    functions: null
  },
  {
    file: "frontend/src/modules/vfx/dev/VfxFixtureRunner.tsx",
    functions: null
  },
  {
    file: "frontend/src/modules/vfx/dev/vfxFixturePayloads.ts",
    functions: null
  },
  {
    file: "frontend/src/modules/layout/adapters/three/auroraVfxCanonicalRenderer.ts",
    functions: null
  },
  {
    file: "frontend/src/modules/vfx/domain/vfxIdentityNeutralProfiles.ts",
    functions: null
  },
  {
    file: "backend/src/modules/vfx/application/vfx.application.service.ts",
    functions: null
  },
  {
    file: "backend/src/modules/vfx/application/vfx-processing.types.ts",
    functions: null
  },
  {
    file: "backend/scripts/capture-vfx-nwn-web-row68-once.mjs",
    functions: null
  },
  {
    file: "backend/scripts/run-vfx-visual-correlation.mjs",
    functions: new Set(["createCorrelation", "buildVisualSemanticOracle"])
  },
  {
    file: "backend/scripts/check-vfx-retail-capture-setup-validation.mjs",
    functions: new Set(["validateManifestFixture", "validateCatalogCapturePrerequisites"])
  },
  {
    file: "backend/scripts/create-vfx-retail-blocker-packet.mjs",
    functions: new Set(["buildPrioritizedBlockers", "deriveMissingEvidence"])
  },
  {
    file: "backend/scripts/create-vfx-retail-evidence-handoff-manifest.mjs",
    functions: new Set(["toHandoffSubject", "nextOperatorAction"])
  },
  {
    file: "backend/scripts/refresh-vfx-visual-audit.mjs",
    functions: new Set(["buildAuditEntry", "buildWorkerBacklog", "compareAuditEntries", "titleForClaim"])
  },
  {
    file: "backend/scripts/generate-vfx-capture-sequences.mjs",
    functions: new Set(["classifyCapture"])
  }
];

const violations = targets.flatMap(({ file, functions }) => {
  const absolutePath = path.join(repoRoot, file);
  return findAssetIdentityBranchViolations({
    sourceText: fs.readFileSync(absolutePath, "utf8"),
    fileName: file,
    functionNames: functions
  });
});

violations.push(
  ...findPythonAssetIdentityBranchViolations({
    sourceText: fs.readFileSync(path.join(repoRoot, "backend/scripts/probe_vfx_apply_context.py"), "utf8"),
    fileName: "backend/scripts/probe_vfx_apply_context.py",
    functionName: "classify_capture"
  })
);

if (violations.length > 0) {
  for (const violation of violations) {
    console.error(
      `${violation.fileName}:${violation.line}:${violation.column} ${violation.reason}`
    );
  }
  process.exitCode = 1;
} else {
  console.log(`VFX asset-identity-neutral branch gate passed (${targets.length + 1} surfaces).`);
}
