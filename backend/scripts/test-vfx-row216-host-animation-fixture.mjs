import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "../..");
const fixtureRoot = path.resolve(repoRoot, "frontend/public/dev-fixtures/vfx-broad-row216");
const payload = JSON.parse(fs.readFileSync(path.resolve(fixtureRoot, "payload.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.resolve(fixtureRoot, "manifest.json"), "utf8"));

const profile = payload.contracts?.effectBeamAttachmentRuntime;
assert(profile?.version === "aurora-effect-beam-host-runtime/v1", "Runtime profile is missing.");
assert(profile.runtimeProfileId === "retail-row216-pfh0-c_yinnkeep-pause1", "Wrong runtime profile.");
assertHost(profile.source, {
  modelHash: "4ca6e5662fc6296f7240ec2457262f3c460680ba74f9947478dec413c523cfab",
  sourceModelObjectKey: "cep3_armor.hak/pfh0.mdl",
  requiredAnimatedNodes: ["rootdummy", "torso_g", "impact"]
});
assertHost(profile.target, {
  modelHash: "de10fa9c782f6203038a5a79c6f23a14e95141205ef4862224fef3ff2810f878",
  sourceModelObjectKey: "cep3_core0.hak/c_yinnkeep.mdl",
  requiredAnimatedNodes: ["rootdummy", "torso_g"]
});

const evidence = manifest.proofLifecycle?.effectBeamHostAnimation;
assert(evidence?.phasePolicy === "effect-onset-normalized", "Host phase policy is missing.");
assert(evidence.retailPhaseMatchEstablished === false, "Retail phase must remain explicitly open.");
assert(
  manifest.runtime?.simulationStepSeconds === 1 / 60,
  "Retail proof physics must use the shared 60 Hz simulation step."
);
assert(
  evidence.source?.supermodelSha256 ===
    "9c32a90423ab369b36195191589cfb96bd3cbb01fbaa8bcead9c3d210d003107",
  "Source supermodel hash mismatch."
);
assert(evidence.source?.baseModelSource === "cep3_armor.hak", "Wrong source base HAK.");
assert(
  evidence.source?.supermodelSource === "lc_addanimations.hak",
  "Wrong source supermodel HAK."
);
assert(evidence.target?.baseModelSource === "cep3_core0.hak", "Wrong target base HAK.");
assert(
  evidence.target?.supermodelSource === "nwn_base.key",
  "Wrong target supermodel source."
);
assert(
  evidence.target?.supermodelSha256 ===
    "a38c9f0de00a7e401419d1e668ad1b9d825cfc9635712cdb9ae63e840104ee2b",
  "Target supermodel hash mismatch."
);
assert(
  evidence.source?.matchedTransformNodeNames?.some((name) => name.toLowerCase() === "impact"),
  "Source Impact animation binding is missing."
);

process.stdout.write(
  `${JSON.stringify({
    contract: "aurora-vfx-row216-host-animation-fixture/v1",
    runtimeProfileId: profile.runtimeProfileId,
    sourceMatchedNodeCount: evidence.source.matchedTransformNodeNames.length,
    targetMatchedNodeCount: evidence.target.matchedTransformNodeNames.length,
    phasePolicy: evidence.phasePolicy,
    status: "pass"
  })}\n`
);

function assertHost(host, expected) {
  assert(host?.modelGraph?.sourceModelHash === expected.modelHash, "Host base model hash mismatch.");
  assert(
    host?.modelGraph?.sourceModelObjectKey === expected.sourceModelObjectKey,
    "Host base model source mismatch."
  );
  assert(host.animation?.animationName === "pause1", "Host pause1 state is missing.");
  assert(host.animation.loop === true, "Host pause1 state must loop.");
  assert(host.animation.lengthSeconds === 2, "Host pause1 length must be 2 seconds.");
  for (const nodeName of expected.requiredAnimatedNodes) {
    const node = host.modelGraph.nodes.find(
      (candidate) => candidate.nodeName?.toLowerCase() === nodeName
    );
    assert(
      node?.animationTracks?.some((track) => track.animationName?.toLowerCase() === "pause1"),
      `Host animation track ${nodeName}:pause1 is missing.`
    );
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
