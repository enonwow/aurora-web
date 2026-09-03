import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const fixtureRoot = path.resolve(
  repoRoot,
  "frontend/public/dev-fixtures/vfx-broad-row44"
);
const manifest = readJson(path.resolve(fixtureRoot, "manifest.json"));
const payload = readJson(path.resolve(fixtureRoot, "payload.json"));

assert(
  manifest.sourceModel?.sha256 ===
    "64c610ac4ebce0f7c0b79af2432e430943fe5280db5948df8300a2360cb7c6d3",
  "row44 source model identity changed"
);
assert(
  manifest.runtime?.dtSeconds <= 1 / 60,
  "row44 proof fixture must sample its 0.1-second Explosion lifetime at 60 fps or finer"
);

const runtimeEmitters = payload.contracts?.runtimeEmitters;
assert(Array.isArray(runtimeEmitters), "row44 runtime emitters are missing");

assertEmitterLifecycle("sparks", 30);
assertEmitterLifecycle("acid", 50);
assertEmitterLifecycle("cloud", 2);

assert(
  manifest.diagnosticCodes?.includes("VFX_EXPLOSION_DETONATE_EVENT_CONSUMED"),
  "row44 must record the source detonate event as consumed"
);
assert(
  hasNonZeroMotionSegment(runtimeEmitters.find((entry) => entry.emitterNodeName === "sparks")),
  "row44 sparks must produce at least one non-zero Motion Blur segment before expiry"
);
assert(
  hasPositiveParticleSize(runtimeEmitters.find((entry) => entry.emitterNodeName === "acid")),
  "row44 acid must grow beyond its zero start size before expiry"
);

console.log(
  JSON.stringify({
    status: "passed",
    contract: "aurora-vfx-broad-row44-animation-origin-fixture/v1",
    maximumActiveParticleCounts: {
      sparks: 30,
      acid: 50,
      cloud: 2
    },
    finalActiveParticleCount: 0
  })
);

function assertEmitterLifecycle(nodeName, expectedMaximum) {
  const emitter = runtimeEmitters.find((entry) => entry.emitterNodeName === nodeName);
  assert(emitter, `row44 ${nodeName} emitter is missing`);
  const activeCounts = emitter.runtimeFrames.map(
    (frame) => frame.runtimeState?.activeParticleIds?.length ?? 0
  );
  assert(
    Math.max(0, ...activeCounts) === expectedMaximum,
    `row44 ${nodeName} maximum active-particle count must be ${expectedMaximum}`
  );
  assert(
    activeCounts.at(-1) === 0,
    `row44 ${nodeName} must be empty in the final runtime frame`
  );
}

function hasNonZeroMotionSegment(emitter) {
  return emitter?.runtimeFrames.some((frame) =>
    frame.renderContract?.drawRecords?.some((record) => {
      const current = record.position;
      const previous = record.previousPosition;
      if (!current || !previous) return false;
      return Math.hypot(
        current.x - previous.x,
        current.y - previous.y,
        current.z - previous.z
      ) > 1e-6;
    })
  );
}

function hasPositiveParticleSize(emitter) {
  return emitter?.runtimeFrames.some((frame) =>
    frame.renderContract?.drawRecords?.some(
      (record) => (record.size?.x ?? 0) > 0 && (record.size?.y ?? 0) > 0
    )
  );
}

function readJson(filePath) {
  assert(fs.existsSync(filePath), `missing JSON fixture: ${filePath}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
