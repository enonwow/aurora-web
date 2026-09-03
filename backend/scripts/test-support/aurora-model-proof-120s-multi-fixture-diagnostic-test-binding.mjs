import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { __createMultiFixtureDiagnosticBindingForTests } from "../lib/aurora-model-proof-120s-multi-fixture-diagnostic-binding.mjs";
import {
  acceptanceClockProjection,
  inspectCanonicalPublishedAcceptanceV1,
  publishedAcceptanceTrustProjection,
  publishedProfileTrustProjection,
} from "../lib/aurora-model-proof-120s-published-acceptance.mjs";

export function createSyntheticPublishedAcceptanceTrustRootForTests(context, trustRootId) {
  assert.equal(context?.version, "aurora-model-proof-120s-published-acceptance-context/v1", "test_published_context_invalid");
  assert.ok(String(trustRootId ?? "").trim(), "test_trust_root_id_invalid");
  return Object.freeze({
    id: trustRootId,
    kind: "semantic_artifact_graph_test_only",
    profileId: context.profile.id,
    moduleSha256: context.immutable.installedModule.sha256,
    orderedHakSha256: context.immutable.orderedHaks.map((hak) => hak.sha256),
    resourceSha256: Object.freeze(Object.fromEntries(Object.entries(context.profile.resources).map(([name, value]) => [name, value.sha256]))),
    runtimeCaptureSha256: context.runtime.capture.sha256,
    publishCounter: context.publishCounter,
    clock: Object.freeze(acceptanceClockProjection(context.clock.value)),
    routeIdentitySha256: context.routeManifest.identities.map((identity) => identity.sha256),
    profileProjectionSha256: sha256Json(publishedProfileTrustProjection(context.profile)),
    acceptanceProjectionSha256: sha256Json(publishedAcceptanceTrustProjection(context)),
  });
}

export function createMultiFixtureDiagnosticTestBinding({ trustRoot, hooks = {} }) {
  assert.equal(trustRoot?.kind, "semantic_artifact_graph_test_only", "test_trust_root_kind_invalid");
  const testOnlyAcceptanceLoader = (options) => {
    assert.ok(options && typeof options === "object" && !Array.isArray(options), "published_acceptance_trust_root_required");
    assert.equal(options.trustRootId, trustRoot.id, `published_acceptance_trust_root_unknown:${options.trustRootId}`);
    const context = inspectCanonicalPublishedAcceptanceV1(options.profilePath);
    assert.equal(sha256Json(publishedProfileTrustProjection(context.profile)), trustRoot.profileProjectionSha256, "published_trust_root_profile_projection_mismatch");
    assert.equal(sha256Json(publishedAcceptanceTrustProjection(context)), trustRoot.acceptanceProjectionSha256, "published_trust_root_acceptance_projection_mismatch");
    assert.equal(context.profile.id, trustRoot.profileId, "published_trust_root_profile_id_mismatch");
    assert.equal(context.publishCounter, trustRoot.publishCounter, "published_trust_root_publish_counter_mismatch");
    requireEqual(acceptanceClockProjection(context.clock.value), trustRoot.clock, "published_trust_root_clock_mismatch");
    requireEqual(context.routeManifest.identities.map((identity) => identity.sha256), trustRoot.routeIdentitySha256, "published_trust_root_routes_mismatch");
    for (const [name, expected] of Object.entries(trustRoot.resourceSha256)) {
      assert.equal(context.profile.resources[name].sha256, expected, `published_trust_root_resource_hash_mismatch:${name}`);
    }
    assert.equal(context.immutable.installedModule.sha256, trustRoot.moduleSha256, "published_trust_root_module_hash_mismatch");
    requireEqual(context.immutable.orderedHaks.map((hak) => hak.sha256), trustRoot.orderedHakSha256, "published_trust_root_haks_mismatch");
    assert.equal(context.runtime.capture.sha256, trustRoot.runtimeCaptureSha256, "published_trust_root_runtime_capture_hash_mismatch");
    return {
      ...context,
      admissibility: {
        status: "admitted_by_test_only_injected_trust_root",
        admissible: true,
        trustRootId: trustRoot.id,
        testOnly: true,
      },
    };
  };
  return __createMultiFixtureDiagnosticBindingForTests(testOnlyAcceptanceLoader, hooks);
}

function sha256Json(value) {
  return createHash("sha256").update(Buffer.from(JSON.stringify(value))).digest("hex");
}

function requireEqual(actual, expected, error) {
  assert.ok(isDeepStrictEqual(actual, expected), error);
}
