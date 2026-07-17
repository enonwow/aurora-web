import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createEffectBeamStabilityReport,
  getFailedChecks
} from "./run-vfx-visual-correlation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const firstCorrelationPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-71/beam-row210-body-chest-time-0.80-seed-71-auto-correlation.contract-visual-correlation.json"
);
const secondCorrelationPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-72/beam-row210-body-chest-time-1.20-seed-72-auto-correlation.contract-visual-correlation.json"
);
const outPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-73/beam-row210-two-frame-stability-report.json"
);

const firstCorrelation = readJson(firstCorrelationPath);
const secondCorrelation = readJson(secondCorrelationPath);
const report = createEffectBeamStabilityReport([firstCorrelation, secondCorrelation]);
const failedChecks = getFailedChecks(report);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (failedChecks.length > 0) {
  throw new Error(`EffectBeam stability failed checks: ${failedChecks.join(", ")}`);
}

console.log(
  JSON.stringify(
    {
      result: report.result,
      report: path.relative(repoRoot, outPath).replaceAll(path.sep, "/"),
      checks: report.checks
    },
    null,
    2
  )
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
