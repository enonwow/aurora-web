import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const manifestPath = resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-nwn-web-row68/manifest.json"
);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const target = manifest.proofScene?.objectAttachmentTarget;

if (
  target?.version !== "aurora-vfx-object-attachment-target/v1" ||
  target?.phase !== "impact" ||
  target?.targetKind !== "creature" ||
  target?.sourceKind !== "actor-role" ||
  target?.sourceId !== "target_creature" ||
  target?.targetSpecialNodePrefix !== "" ||
  manifest.comparisonContext?.ownerTargetMatchEstablished !== true
) {
  throw new Error(
    "Row68 must expose its exact BIC target through the versioned object-attachment contract."
  );
}

process.stdout.write(
  `${JSON.stringify({
    status: "ok",
    fixtureId: manifest.fixtureId,
    objectAttachmentTarget: target
  })}\n`
);
