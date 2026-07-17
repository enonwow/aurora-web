import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createRow50EffectVisualEffectStabilityReport,
  getFailedChecks
} from "./run-vfx-visual-correlation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const firstCorrelationPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-60/row50-time-0.75-seed-7-auto-correlation.contract-visual-correlation.json"
);
const secondCorrelationPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-81/row50-time-1.15-seed-81-auto-correlation.contract-visual-correlation.json"
);
const outPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-81/row50-effectvisualeffect-two-frame-stability-report.json"
);

const report = createRow50EffectVisualEffectStabilityReport([
  readJson(firstCorrelationPath),
  readJson(secondCorrelationPath)
]);
const failedChecks = getFailedChecks(report);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (failedChecks.length > 0) {
  throw new Error(`row50 EffectVisualEffect stability failed checks: ${failedChecks.join(", ")}`);
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
