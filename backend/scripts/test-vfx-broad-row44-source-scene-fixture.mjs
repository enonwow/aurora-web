#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const fixtureRoot = resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-broad-row44"
);
const manifest = JSON.parse(
  await readFile(resolve(fixtureRoot, "manifest.json"), "utf8")
);
const scene = manifest.proofScene;

assert.equal(
  scene?.status,
  "source-backed-exact-row44-module-area-bic-source-and-target-actors"
);
assert.equal(
  scene?.sourceModule?.sha256,
  "b8e03c0b9e1708467d57ff1b652b4c83df9c38638b0773d15033dc7448c8c790"
);
assert.equal(
  scene?.sourceArea?.areSha256,
  "ccdf7a3e02ac9eb304e45833cf2c1f11fc18e0829d372e7f2e8550c7e40d279d"
);
assert.equal(
  scene?.sourceArea?.gitSha256,
  "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6"
);
assert.deepEqual(scene?.effectOrigin, { x: 9.5, y: 6.8, z: 0 });
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
      translation: [-4.5, -1.8, 0],
      orientationQuarterTurns: 2
    },
    {
      instanceId: "enon_test_effect:tile-1",
      sourceResref: "tin01_h01_03",
      resourceKey: "scene/tin01_h01_03.glb",
      translation: [5.5, -1.8, 0],
      orientationQuarterTurns: 3
    },
    {
      instanceId: "enon_test_effect:tile-2",
      sourceResref: "gin01_h01_08",
      resourceKey: "scene/gin01_h01_08.glb",
      translation: [-4.5, 8.2, 0],
      orientationQuarterTurns: 1
    },
    {
      instanceId: "enon_test_effect:tile-3",
      sourceResref: "gin01_h01_08",
      resourceKey: "scene/gin01_h01_08.glb",
      translation: [5.5, 8.2, 0],
      orientationQuarterTurns: 0
    }
  ]
);

assert.ok((scene?.textures?.length ?? 0) >= 14);
assert.equal(scene?.actors?.length, 2);
const [sourceActor, targetActor] = scene.actors;
assert.equal(sourceActor.role, "source_creature");
assert.equal(sourceActor.instanceId, "enon_test_effect:player-entry");
assert.equal(sourceActor.processResRef, "proof_avri461");
assert.equal(sourceActor.sourceModel, "pfh0");
assert.equal(sourceActor.supermodel, "a_fa");
assert.equal(sourceActor.renderMode, "part-based");
assert.equal(
  sourceActor.sourceBicSha256,
  "5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0"
);
assert.deepEqual(sourceActor.normalizedPosition, [0, -3, 0]);
assert.equal(sourceActor.bearingRadians, 0);
assert.deepEqual(sourceActor.sourceForwardAuroraXY, [0, 1]);
assert.ok(sourceActor.expectedPartModelResRefs.includes("pfh0_chest050"));
assert.deepEqual(sourceActor.expectedEquipmentResRefs, ["nw_cloth001"]);
assert.deepEqual(
  targetActor,
  {
    role: "target_creature",
    instanceId: "enon_test_effect:creature-0",
    templateResRef: "nw_innkeeper",
    appearanceId: 233,
    appearanceLabel: "Human: Innkeeper",
    sourceModel: "c_yinnkeep",
    sourceModelSource: "hak/lc_2da/appearance.2da#233 -> hak/cep3_core0/c_yinnkeep.mdl",
    supermodel: "a_ba",
    animationName: "pause1",
    normalizedPosition: [0, 0, 0],
    bearingRadians: Math.PI / 2,
    sourceForwardAuroraXY: [0, -1],
    sourceForwardSource:
      "vb44shot.nss: SetFacingPoint(GetPosition(oSource)); target=(9.5,6.8), source=(9.5,3.8)",
    sourceBoundsHeight: 1.9428,
    sourceHakListCount: 59,
    sourceHakListSha256:
      "7d850c468e4872625a7ec46841bcfc35d51b37ec35595db27e218cf3a2ef6e40"
  }
);
assert.deepEqual(scene?.omittedOracleObjects, []);
assert.equal(manifest.comparisonContext?.cameraMatchEstablished, false);
assert.equal(manifest.comparisonContext?.sceneMatchEstablished, false);
assert.equal(manifest.comparisonContext?.ownerTargetMatchEstablished, true);
assert.equal(
  manifest.comparisonContext?.comparisonStatus,
  "source-backed-exact-row44-scene-bic-source-target-open-camera-material"
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
    textureCount: scene.textures.length
  })}\n`
);
