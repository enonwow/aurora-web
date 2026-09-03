import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const fixtureRoot = path.resolve(repoRoot, "frontend/public/dev-fixtures");
const fixtureIds = [
  "vfx-nwn-web-row68",
  "vfx-broad-row44",
  "vfx-broad-row50",
  "vfx-broad-row210",
  "vfx-broad-row216",
  "vfx-broad-row181",
  "vfx-broad-row1",
  "vfx-broad-aoe0"
];

for (const fixtureId of fixtureIds) {
  const manifestPath = path.resolve(fixtureRoot, fixtureId, "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const comparisonContext = manifest.comparisonContext;
  if (!comparisonContext) {
    throw new Error(`${fixtureId} comparison context is missing.`);
  }
  for (const field of [
    "cameraMatchEstablished",
    "sceneMatchEstablished",
    "ownerTargetMatchEstablished"
  ]) {
    if (comparisonContext[field] !== false) {
      throw new Error(
        `${fixtureId} must fail ${field} closed until a matched retail proof establishes it.`
      );
    }
  }
  if (
    typeof comparisonContext.comparisonStatus !== "string" ||
    comparisonContext.comparisonStatus.length === 0
  ) {
    throw new Error(`${fixtureId} comparison status is missing.`);
  }
}

const row68Manifest = JSON.parse(
  fs.readFileSync(
    path.resolve(fixtureRoot, "vfx-nwn-web-row68", "manifest.json"),
    "utf8"
  )
);
if (
  row68Manifest.proofScene?.status !==
    "source-backed-exact-row68-module-area-bic-target-and-context-actor" ||
  row68Manifest.proofScene?.meshFilter !== undefined ||
  row68Manifest.proofScene?.effectOrigin?.x !== 9.5 ||
  row68Manifest.proofScene?.effectOrigin?.y !== 3.799999952316284 ||
  row68Manifest.proofScene?.effectOrigin?.z !== 0 ||
  row68Manifest.proofScene?.sourceModule?.sha256 !==
    "fda307d129f0c0e17411fb5820c6c528ee66e3a079202be5e8e38be781cff010" ||
  row68Manifest.proofScene?.sourceArea?.areSha256 !==
    "5dad3c2b055056479f4ce7b2c8bc25a408208700b6901c1bf1986ac50368f585" ||
  row68Manifest.proofScene?.sourceArea?.gitSha256 !==
    "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6" ||
  row68Manifest.proofScene?.coverage?.sourceTileCount !== 4 ||
  row68Manifest.proofScene?.coverage?.admittedTileCount !== 4 ||
  row68Manifest.proofScene?.coverage?.unresolvedTileCount !== 0 ||
  row68Manifest.proofScene?.models?.length !== 4 ||
  row68Manifest.proofScene?.textures?.length !== 14 ||
  row68Manifest.proofScene?.actors?.length !== 2 ||
  row68Manifest.proofScene?.actors?.[0]?.role !== "target_creature" ||
  row68Manifest.proofScene?.actors?.[0]?.sourceModel !== "pfh0" ||
  row68Manifest.proofScene?.actors?.[0]?.sourceBicSha256 !==
    "5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0" ||
  row68Manifest.proofScene?.actors?.[1]?.role !== "scene_creature" ||
  row68Manifest.proofScene?.actors?.[1]?.sourceModel !== "c_yinnkeep"
) {
  throw new Error(
    "vfx-nwn-web-row68 must use the exact source module Area, first-PC BIC target, and GIT innkeeper context actor."
  );
}

const row1Manifest = JSON.parse(
  fs.readFileSync(
    path.resolve(fixtureRoot, "vfx-broad-row1", "manifest.json"),
    "utf8"
  )
);
if (
  row1Manifest.proofScene?.status !==
    "source-backed-exact-row1-module-area-target-actor" ||
  row1Manifest.proofScene?.meshFilter !== undefined ||
  row1Manifest.proofScene?.effectOrigin?.x !== 9.5 ||
  row1Manifest.proofScene?.effectOrigin?.y !== 6.8 ||
  row1Manifest.proofScene?.effectOrigin?.z !== 0 ||
  row1Manifest.proofScene?.sourceModule?.sha256 !==
    "fda307d129f0c0e17411fb5820c6c528ee66e3a079202be5e8e38be781cff010" ||
  row1Manifest.proofScene?.sourceArea?.areSha256 !==
    "5dad3c2b055056479f4ce7b2c8bc25a408208700b6901c1bf1986ac50368f585" ||
  row1Manifest.proofScene?.sourceArea?.gitSha256 !==
    "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6" ||
  row1Manifest.proofScene?.coverage?.sourceTileCount !== 4 ||
  row1Manifest.proofScene?.coverage?.admittedTileCount !== 4 ||
  row1Manifest.proofScene?.coverage?.unresolvedTileCount !== 0 ||
  JSON.stringify(
    row1Manifest.proofScene?.models?.map((entry) => entry.instanceId)
  ) !==
    JSON.stringify([
      "enon_test_effect:tile-0",
      "enon_test_effect:tile-1",
      "enon_test_effect:tile-2",
      "enon_test_effect:tile-3"
    ]) ||
  row1Manifest.proofScene?.textures?.length !== 14 ||
  row1Manifest.proofScene?.actors?.length !== 1 ||
  row1Manifest.proofScene?.actors?.[0]?.role !== "target_creature" ||
  row1Manifest.proofScene?.actors?.[0]?.sourceModel !== "c_yinnkeep"
) {
  throw new Error(
    "vfx-broad-row1 must use the exact packed-module Area, all four HAK-resolved tiles, and the source-backed target actor."
  );
}
if (
  JSON.stringify(
    row1Manifest.proofScene?.omittedOracleObjects?.map((entry) => entry.role)
  ) !== JSON.stringify(["source_creature"])
) {
  throw new Error(
    "vfx-broad-row1 must disclose only the non-reconstructed player actor."
  );
}

const aoeManifest = JSON.parse(
  fs.readFileSync(
    path.resolve(fixtureRoot, "vfx-broad-aoe0", "manifest.json"),
    "utf8"
  )
);
if (
  aoeManifest.proofScene?.status !==
    "source-backed-exact-aoe0-module-area-target-centered" ||
  aoeManifest.proofScene?.meshFilter !== undefined ||
  aoeManifest.proofScene?.effectOrigin?.x !== 9.5 ||
  aoeManifest.proofScene?.effectOrigin?.y !== 6.8 ||
  aoeManifest.proofScene?.effectOrigin?.z !== 0 ||
  aoeManifest.proofScene?.sourceModule?.sha256 !==
    "bfc6992cdb2d72d34e1cf421fb860e922f173fd649e20bb24aea33535c31a4c4" ||
  aoeManifest.proofScene?.sourceArea?.areSha256 !==
    "afdb077f76ae1a9cde5175333a82b276a7cbac0e93517cf040fa24dba2c402c6" ||
  aoeManifest.proofScene?.sourceArea?.gitSha256 !==
    "bd3637343c89bb7c719a260cd61d07f5774be21a9b840107451abe9c046df8e6" ||
  aoeManifest.proofScene?.coverage?.sourceTileCount !== 4 ||
  aoeManifest.proofScene?.coverage?.admittedTileCount !== 4 ||
  aoeManifest.proofScene?.coverage?.unresolvedTileCount !== 0 ||
  JSON.stringify(aoeManifest.proofScene?.coverage?.unresolvedTileIndexes) !==
    JSON.stringify([]) ||
  JSON.stringify(
    aoeManifest.proofScene?.models?.map((entry) => entry.instanceId)
  ) !==
    JSON.stringify([
      "enon_test_effect:tile-0",
      "enon_test_effect:tile-1",
      "enon_test_effect:tile-2",
      "enon_test_effect:tile-3"
    ]) ||
  aoeManifest.proofScene?.textures?.length !== 14
) {
  throw new Error(
    "vfx-broad-aoe0 must use the exact admitted AOE module source scene."
  );
}
if (
  JSON.stringify(
    aoeManifest.proofScene?.omittedOracleObjects
      ?.map((entry) => entry.role)
      .sort()
  ) !== JSON.stringify(["source_creature", "target_creature"])
) {
  throw new Error(
    "vfx-broad-aoe0 must disclose both non-reconstructed oracle actors."
  );
}

process.stdout.write(
  `${JSON.stringify({
    contract: "aurora-vfx-broad-comparison-context-fixtures/v1",
    fixtureCount: fixtureIds.length,
    status: "pass"
  })}\n`
);
