import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createP2pGravityStabilityReport,
  getFailedChecks
} from "./run-vfx-visual-correlation.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const firstCorrelationPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-80/p2p-gravity-time-0.70-seed-41-auto-correlation-v2.contract-visual-correlation.json"
);
const secondCorrelationPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-80/p2p-gravity-time-1.10-seed-80-auto-correlation.contract-visual-correlation.json"
);
const outPath = path.join(
  repoRoot,
  "backend/docs/aurora-reverse/artifacts/vfx-iteration-80/p2p-gravity-two-frame-stability-report.json"
);

const report = createP2pGravityStabilityReport([
  readJson(firstCorrelationPath),
  readJson(secondCorrelationPath)
]);
const failedChecks = getFailedChecks(report);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

if (failedChecks.length > 0) {
  throw new Error(`P2P gravity stability failed checks: ${failedChecks.join(", ")}`);
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
