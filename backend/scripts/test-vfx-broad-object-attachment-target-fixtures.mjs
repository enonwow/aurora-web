import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const expected = [
  { fixtureId: "vfx-broad-row1", sourceId: "target_creature" },
  { fixtureId: "vfx-broad-row50", sourceId: "target_creature" }
];

for (const entry of expected) {
  const manifest = JSON.parse(
    await readFile(
      resolve(
        repoRoot,
        `frontend/public/dev-fixtures/${entry.fixtureId}/manifest.json`
      ),
      "utf8"
    )
  );
  assert.deepEqual(manifest.proofScene?.objectAttachmentTarget, {
    version: "aurora-vfx-object-attachment-target/v1",
    phase: "impact",
    targetKind: "creature",
    sourceKind: "actor-role",
    sourceId: entry.sourceId,
    targetSpecialNodePrefix: ""
  });
}

process.stdout.write(
  `${JSON.stringify({
    status: "ok",
    fixtures: expected.map((entry) => entry.fixtureId)
  })}\n`
);
