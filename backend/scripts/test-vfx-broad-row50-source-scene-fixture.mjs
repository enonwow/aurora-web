#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const fixtureRoot = resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-broad-row50"
);
const manifest = JSON.parse(
  await readFile(resolve(fixtureRoot, "manifest.json"), "utf8")
);
const payload = JSON.parse(
  await readFile(resolve(fixtureRoot, "payload.json"), "utf8")
);
const scene = manifest.proofScene;

assert.equal(
  scene?.status,
  "source-backed-exact-row50-module-area-target-actor"
);
assert.equal(manifest.runtime?.dtSeconds, 1 / 60);
assert.equal(manifest.runtime?.outputFrameStride, 2);
assert.equal(manifest.runtime?.serializedFrameStepSeconds, 1 / 30);
assert.deepEqual(manifest.runtime?.cameraPosition, {
  x: -0.0247812236,
  y: -5.4020129462,
  z: 2.2138376047
});
assert.equal(
  manifest.runtime?.cameraContextSource,
  "proof-calibrated-camera-relative-to-vfx-owner"
);
const diagnostics = Object.values(payload.diagnostics ?? {}).flatMap((entries) =>
  Array.isArray(entries) ? entries : []
);
assert.ok(
  !diagnostics.some(
    (entry) => entry.code === "VFX_PARTICLE_DEADSPACE_CAMERA_POSITION_REQUIRED"
  ),
  "row50 proof fixture must resolve the camera required by sparks.deadspace"
);
assert.deepEqual(
  manifest.runtimeFrameCounts?.find((entry) => entry.emitterNodeName === "souldust"),
  {
    emitterNodeName: "souldust",
    frameCount: 186,
    maxActiveParticleCount: 0,
    finalActiveParticleCount: 0
  }
);
assert.equal(
  scene?.sourceModule?.sha256,
  "f7602d85db6768af7940f7de19aa54799ab1e9398aa224451bd6bf9d94b24fb1"
);
assert.equal(
  scene?.sourceArea?.areSha256,
  "3bd24a1014ac5052a34e77c200fda9dc05b908bdc4f696f9b485ea76d9eb6f3c"
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
    normalizedPosition: [0, 0, 0],
    sourceForwardAuroraXY: [0, -1],
    sourceForwardSource:
      "vb50shot.nss: SetFacingPoint(GetPosition(oSource)); target=(9.5,6.8), source=(9.5,3.8)"
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
