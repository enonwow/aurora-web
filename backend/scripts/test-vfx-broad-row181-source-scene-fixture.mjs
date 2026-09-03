#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const fixtureRoot = resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-broad-row181"
);
const manifest = JSON.parse(
  await readFile(resolve(fixtureRoot, "manifest.json"), "utf8")
);
const scene = manifest.proofScene;

assert.equal(
  scene?.status,
  "source-backed-exact-row181-module-area-source-target-actor"
);
assert.equal(
  manifest.proofLifecycle?.sceneAlignment?.captureModule,
  "codex_vb_r181b.mod"
);
assert.deepEqual(manifest.proofLifecycle?.progFxType10Projectile, {
  sourceRef: "retail-proof-source",
  sourcePosition: { x: 0, y: 0, z: 0 },
  targetRef: "retail-proof-target",
  targetPosition: { x: 0, y: 3, z: 0 },
  provenance: "retail-client-disassembly"
});
assert.equal(
  scene?.sourceModule?.sha256,
  "4ed1a443d4382e0e2b6de58a89b2d1da1376e0dc58b475238b1bd4603e2f42a4"
);
assert.equal(
  scene?.sourceArea?.areSha256,
  "f2e52a1f014ff5e9b4eab6998dad0b1ddc3d9b17e44bd7e717a16bf83c056061"
);
assert.equal(
  scene?.sourceArea?.gitSha256,
  "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6"
);
assert.deepEqual(scene?.effectOrigin, { x: 9.5, y: 3.8, z: 0 });
assert.equal(scene?.areaLighting?.sourceSha256, scene.sourceArea.areSha256);

assert.equal(scene?.coverage?.sourceTileCount, 4);
assert.equal(scene?.coverage?.admittedTileCount, 4);
assert.equal(scene?.coverage?.unresolvedTileCount, 0);
assert.deepEqual(scene?.coverage?.unresolvedTileIndexes, []);

assert.deepEqual(
  scene?.models?.map((entry) => ({
    instanceId: entry.instanceId,
    sourceResref: entry.sourceResref,
    resourceKey: entry.resourceKey,
    translation: entry.translation,
    orientationQuarterTurns: entry.orientationQuarterTurns
  })),
  [
    {
      instanceId: "enon_test_effect:tile-0",
      sourceResref: "tin01_h01_02",
      resourceKey: "scene/tin01_h01_02.glb",
      translation: [-4.5, 1.2, 0],
      orientationQuarterTurns: 2
    },
    {
      instanceId: "enon_test_effect:tile-1",
      sourceResref: "tin01_h01_03",
      resourceKey: "scene/tin01_h01_03.glb",
      translation: [5.5, 1.2, 0],
      orientationQuarterTurns: 3
    },
    {
      instanceId: "enon_test_effect:tile-2",
      sourceResref: "gin01_h01_08",
      resourceKey: "scene/gin01_h01_08.glb",
      translation: [-4.5, 11.2, 0],
      orientationQuarterTurns: 1
    },
    {
      instanceId: "enon_test_effect:tile-3",
      sourceResref: "gin01_h01_08",
      resourceKey: "scene/gin01_h01_08.glb",
      translation: [5.5, 11.2, 0],
      orientationQuarterTurns: 0
    }
  ]
);

assert.ok((scene?.textures?.length ?? 0) >= 14);
assert.equal(scene?.actors?.length, 1);
assert.deepEqual(
  {
    role: scene.actors[0].role,
    templateResRef: scene.actors[0].templateResRef,
    sourceModel: scene.actors[0].sourceModel,
    supermodel: scene.actors[0].supermodel,
    animationName: scene.actors[0].animationName,
    normalizedPosition: scene.actors[0].normalizedPosition,
    sourceForwardAuroraXY: scene.actors[0].sourceForwardAuroraXY,
    sourceForwardSource: scene.actors[0].sourceForwardSource
  },
  {
    role: "target_creature",
    templateResRef: "nw_innkeeper",
    sourceModel: "c_yinnkeep",
    supermodel: "a_ba",
    animationName: "pause1",
    normalizedPosition: [0, 3, 0],
    sourceForwardAuroraXY: [0, -1],
    sourceForwardSource:
      "vb181shot.nss: SetFacingPoint(GetPosition(oSource)); target=(9.5,6.8), source=(9.5,3.8)"
  }
);
assert.deepEqual(
  scene?.omittedOracleObjects?.map((entry) => entry.role).sort(),
  ["source_creature"]
);

for (const resource of [...scene.models, ...scene.textures]) {
  await access(resolve(fixtureRoot, resource.resourceKey));
}

process.stdout.write(
  `${JSON.stringify({
    status: "ok",
    fixtureId: manifest.fixtureId,
    admittedTileCount: scene.coverage.admittedTileCount,
    unresolvedTileCount: scene.coverage.unresolvedTileCount,
    actorCount: scene.actors.length,
    textureCount: scene.textures.length
  })}\n`
);
