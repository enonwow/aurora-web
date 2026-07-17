import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createFountainAtlasProgressionReport,
  getFailedChecks
} from "./run-vfx-visual-correlation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const firstCorrelationPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-74/cot-fx01-fountain-atlas-time-0.65-seed-74-auto-correlation-v2.contract-visual-correlation.json"
);
const firstSnapshotPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-74/cot-fx01-fountain-atlas-time-0.65-seed-74-auto-correlation-v2.render-contract-snapshot.json"
);
const secondCorrelationPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-75/cot-fx01-fountain-atlas-time-1.05-seed-75-auto-correlation.contract-visual-correlation.json"
);
const secondSnapshotPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-75/cot-fx01-fountain-atlas-time-1.05-seed-75-auto-correlation.render-contract-snapshot.json"
);
const outPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-75/cot-fx01-fountain-atlas-two-frame-progression-report.json"
);

const report = createFountainAtlasProgressionReport([
  {
    correlation: readJson(firstCorrelationPath),
    snapshot: readJson(firstSnapshotPath)
  },
  {
    correlation: readJson(secondCorrelationPath),
    snapshot: readJson(secondSnapshotPath)
  }
]);
const failedChecks = getFailedChecks(report);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (failedChecks.length > 0) {
  throw new Error(`Fountain atlas progression failed checks: ${failedChecks.join(", ")}`);
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
