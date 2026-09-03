import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const fixtureRoot = path.resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-broad-row210"
);
const manifest = readJson(path.resolve(fixtureRoot, "manifest.json"));
const payload = readJson(path.resolve(fixtureRoot, "payload.json"));

assert(
  manifest.sourceModel?.sha256 ===
    "88a338e61c6dae67e43a02cb6aa4bd2395532487b680252964e9d2ca4d04fba8",
  "row210 source model identity changed"
);
assert(
  manifest.proofLifecycle?.effectBeamAttachment,
  "row210 must expose the resolved retail-model EffectBeam attachment"
);
assert(
  manifest.proofLifecycle.effectBeamAttachment.sourceNodeName.toLowerCase() === "impact",
  "row210 source BODY_NODE_CHEST must resolve to Impact"
);
assert(
  manifest.proofLifecycle.effectBeamAttachment.targetNodeName.toLowerCase() === "impact",
  "row210 target must resolve to Impact"
);

const runtimeEmitters = payload.contracts?.runtimeEmitters;
assert(Array.isArray(runtimeEmitters), "row210 runtime emitters are missing");

assertLightningEmitter("OmenEmitter03", 3, 2);
assertLightningEmitter("OmenEmitter04", 65, 64);

const handbal = runtimeEmitters.find((entry) => entry.emitterNodeName === "handbal");
assert(handbal, "row210 handbal emitter is missing");
assert(
  maximumDrawCount(handbal) > 0,
  "row210 source flare must contribute visible draw records"
);

console.log(
  JSON.stringify({
    status: "passed",
    contract: "aurora-vfx-broad-row210-lightning-fixture/v1",
    lightningPointCounts: {
      OmenEmitter03: 3,
      OmenEmitter04: 65
    },
    sourceFlareVisible: true
  })
);

function assertLightningEmitter(nodeName, expectedPointCount, expectedSegmentCount) {
  const emitter = runtimeEmitters.find((entry) => entry.emitterNodeName === nodeName);
  assert(emitter, `row210 ${nodeName} emitter is missing`);
  const settled = emitter.runtimeFrames.find(
    (frame) =>
      frame.runtimeState?.activeParticleIds?.length === expectedPointCount &&
      frame.renderContract?.drawParticleCount === expectedSegmentCount
  );
  assert(
    settled,
    `row210 ${nodeName} must settle at ${expectedPointCount} points and ${expectedSegmentCount} linked segments`
  );
  assert(
    settled.renderContract.drawLane === "linked_textured_quad",
    `row210 ${nodeName} must use linked_textured_quad`
  );
  assert(
    settled.renderContract.drawRecords.length === expectedSegmentCount,
    `row210 ${nodeName} linked draw-record count mismatch`
  );
}

function maximumDrawCount(emitter) {
  return Math.max(
    0,
    ...emitter.runtimeFrames.map((frame) => frame.renderContract?.drawParticleCount ?? 0)
  );
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), `missing JSON fixture: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
