import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, relative, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  deadlineStatus,
  validateModelProofProfile,
  validatePngBytes,
} from "./aurora-model-proof-120s-contract.mjs";
import { decodeDiagnosticRuntimePng } from "./aurora-model-proof-120s-multi-fixture-diagnostic-png.mjs";

const SHA256 = /^[a-f0-9]{64}$/u;
const CLOCK_VERSION = "aurora-model-proof-monotonic-clock/v1";
const ROUTE_MANIFEST_VERSION = "aurora-model-proof-120s-route-manifest/v1";
const REQUIRED_DISPATCHES = [
  "toolset-captured",
  "runtime-started",
  "runtime-captured",
  "finalize",
];

/**
 * Loads the immutable, published v1 acceptance graph. Historical route manifests
 * are validated from the route identities embedded in the accepted final packet;
 * this keeps an accepted run independently reproducible after the live route file
 * advances to a later, legitimate version.
 */
const PUBLISHED_ACCEPTANCE_TRUST_ROOTS = Object.freeze({
  "meshy2aurora-r31-run3-published-acceptance-v1": Object.freeze({
    kind: "exact_artifact_graph",
    profileSha256: "17c2bf806c27ff7de5973fdeb63a448c553a66db59baddc8f8feceab647a2f80",
    acceptanceSha256: "de8d235224b14033b3c2b9583f8987c34cba82c08ea6e76a207ca0a37dbd620e",
    finalPacketSha256: "1281c49c203d93d44460e7158ee4a0978f2edbeb1f849c439fccdffce4efc054",
    stateSha256: "717b0db9bba3cc40f97d285ef994eeffaf00729288f84547f1d542046f48fe92",
    readySha256: "85a97b0558ed2bd7c88cbbca264678aaecf843cc1b606da4d3873d4a0f3d5afa",
    moduleSha256: "8575465ef683256a54c101a3f4445a4e22803194c9b899a0e43e3fd069fdeafd",
    orderedHakSha256: ["ef26ae9a6a9df5cef9b3d8b1d33ab3cbe587af30e2ee0214d0b865e91ea5eb12"],
    runtimeCaptureSha256: "5dde10c72a8aacc26c528fab1e581f08b4445bd6fc863a639d4ff53b14d30df0",
  }),
});

export function loadCanonicalPublishedAcceptanceV1(options) {
  assert.ok(options && typeof options === "object" && !Array.isArray(options), "published_acceptance_trust_root_required");
  assert.ok(String(options.trustRootId ?? "").trim(), "published_acceptance_trust_root_required");
  const trustRoot = PUBLISHED_ACCEPTANCE_TRUST_ROOTS[options.trustRootId];
  assert.ok(trustRoot, `published_acceptance_trust_root_unknown:${options.trustRootId}`);
  assert.equal(trustRoot.kind, "exact_artifact_graph", `published_acceptance_production_trust_root_kind_invalid:${options.trustRootId}`);
  const pinnedProfileArtifact = readArtifactAt(resolve(options.profilePath), "published_trust_root_profile");
  if (trustRoot.kind === "exact_artifact_graph") assert.equal(pinnedProfileArtifact.sha256, trustRoot.profileSha256, "published_trust_root_profile_hash_mismatch");
  const inspected = inspectCanonicalPublishedAcceptanceV1(options.profilePath);
  validatePublishedTrustRoot(inspected, trustRoot);
  return {
    ...inspected,
    admissibility: {
      status: "admitted_by_code_owned_trust_root",
      admissible: true,
      trustRootId: options.trustRootId,
    },
  };
}

export function inspectCanonicalPublishedAcceptanceV1(profilePath) {
  const resolvedProfilePath = resolve(profilePath);
  const profileArtifact = readArtifactAt(resolvedProfilePath, "published_profile");
  const profile = validateModelProofProfile(parseJson(profileArtifact.bytes, "published_profile_json_invalid"));
  const outputRoot = resolve(profile.outputRoot);
  assert.ok(existsSync(outputRoot) && statSync(outputRoot).isDirectory(), `published_output_root_missing:${outputRoot}`);

  const clockArtifact = readOutputArtifact(outputRoot, resolve(outputRoot, "run-clock.json"), "published_clock");
  const stateArtifact = readOutputArtifact(outputRoot, resolve(outputRoot, "state.json"), "published_state");
  const readyArtifact = readOutputArtifact(outputRoot, resolve(outputRoot, "ready.json"), "published_ready");
  const finalArtifact = readOutputArtifact(outputRoot, resolve(outputRoot, "final-model-proof.json"), "published_final_packet");
  const acceptanceNames = readdirSync(outputRoot).filter((name) => /^final-model-proof\.accepted-at-\d+\.json$/u.test(name));
  assert.equal(acceptanceNames.length, 1, "published_acceptance_count_invalid");
  const acceptanceArtifact = readOutputArtifact(outputRoot, resolve(outputRoot, acceptanceNames[0]), "published_acceptance");

  const clock = parseJson(clockArtifact.bytes, "published_clock_json_invalid");
  const state = parseJson(stateArtifact.bytes, "published_state_json_invalid");
  const ready = parseJson(readyArtifact.bytes, "published_ready_json_invalid");
  const finalPacket = parseJson(finalArtifact.bytes, "published_final_packet_json_invalid");
  const acceptance = parseJson(acceptanceArtifact.bytes, "published_acceptance_json_invalid");
  validateClock(clock);
  validateAcceptanceEnvelope({
    profile,
    profilePath: resolvedProfilePath,
    profileSha256: profileArtifact.sha256,
    clock,
    finalPacket,
    finalArtifact,
    acceptance,
    acceptancePath: acceptanceArtifact.path,
  });

  const match = /^final-model-proof\.accepted-at-(\d+)\.json$/u.exec(basename(acceptanceArtifact.path));
  const publishCounter = match[1];
  const publishedDeadline = deadlineStatus(clock, BigInt(publishCounter));
  assert.equal(publishedDeadline.expired, false, "published_acceptance_counter_after_deadline");
  assert.ok(publishedDeadline.elapsedMs < 120_000, "published_acceptance_elapsed_invalid");

  validateFinalAndState({
    profile,
    profilePath: resolvedProfilePath,
    profileSha256: profileArtifact.sha256,
    outputRoot,
    finalPacket,
    state,
    ready,
    readyArtifact,
    publishedDeadline,
  });
  const routeManifest = validateHistoricalRouteManifest({ profile, finalPacket, ready });
  const immutable = validateImmutableCandidate(profile, ready);
  const packets = validateAcceptedPackets({
    profile,
    profileSha256: profileArtifact.sha256,
    outputRoot,
    finalPacket,
    state,
    publishedDeadline,
    runtimeProfile: immutable.runtimeProfile.value,
  });

  return {
    version: "aurora-model-proof-120s-published-acceptance-context/v1",
    profile,
    profilePath: resolvedProfilePath,
    profileSha256: profileArtifact.sha256,
    profileByteLength: profileArtifact.byteLength,
    outputRoot,
    publishCounter,
    elapsed: publishedDeadline,
    clock: publicArtifact(clockArtifact, clock),
    state: publicArtifact(stateArtifact, state),
    ready: publicArtifact(readyArtifact, ready),
    finalPacket: publicArtifact(finalArtifact, finalPacket),
    acceptance: publicArtifact(acceptanceArtifact, acceptance),
    routeManifest,
    immutable,
    toolset: packets.toolset,
    runtime: packets.runtime,
    admissibility: { status: "inspection_only_untrusted", admissible: false },
  };
}

function validatePublishedTrustRoot(context, trustRoot) {
  assert.equal(context.profileSha256, trustRoot.profileSha256, "published_trust_root_profile_hash_mismatch");
  assert.equal(context.acceptance.sha256, trustRoot.acceptanceSha256, "published_trust_root_acceptance_hash_mismatch");
  assert.equal(context.finalPacket.sha256, trustRoot.finalPacketSha256, "published_trust_root_final_packet_hash_mismatch");
  assert.equal(context.state.sha256, trustRoot.stateSha256, "published_trust_root_state_hash_mismatch");
  assert.equal(context.ready.sha256, trustRoot.readySha256, "published_trust_root_ready_hash_mismatch");
  assert.equal(context.immutable.installedModule.sha256, trustRoot.moduleSha256, "published_trust_root_module_hash_mismatch");
  requireEqual(context.immutable.orderedHaks.map((hak) => hak.sha256), trustRoot.orderedHakSha256, "published_trust_root_haks_mismatch");
  assert.equal(context.runtime.capture.sha256, trustRoot.runtimeCaptureSha256, "published_trust_root_runtime_capture_hash_mismatch");
}

export function publishedProfileTrustProjection(profile) {
  // Paths and descriptor hashes are intentionally excluded from the semantic
  // fixture root: its temporary directory changes per test. The code-owned root
  // separately pins the bytes that carry candidate identity (MOD, ordered HAKs,
  // HAK resources, capture), while this projection pins the profile contract.
  const descriptor = (value) => ({ declared: value != null, ...(value?.byteLength == null ? {} : { byteLength: value.byteLength }) });
  const candidateArtifact = (value) => ({ sha256: value?.sha256, ...(value?.byteLength == null ? {} : { byteLength: value.byteLength }) });
  return {
    version: profile?.version,
    id: profile?.id,
    hardLimitMs: profile?.hardLimitMs,
    binaryProfile: descriptor(profile?.binaryProfile),
    toolsetProfile: descriptor(profile?.toolsetProfile),
    runtimeProfile: descriptor(profile?.runtimeProfile),
    routeManifest: descriptor(profile?.routeManifest),
    installedModule: candidateArtifact(profile?.installedModule),
    orderedHakList: profile?.orderedHakList?.map((hak) => ({ resref: hak.resref, ...candidateArtifact(hak) })),
    resources: profile?.resources,
    area: profile?.area,
    fixture: profile?.fixture,
    runtime: { loadingModuleResref: profile?.runtime?.loadingModuleResref },
    entryMode: profile?.entryMode,
    policy: profile?.policy,
  };
}

export function publishedAcceptanceTrustProjection(context) {
  const runtimePacket = context.runtime.packet.value;
  const request = context.runtime.request.value;
  const handoff = context.runtime.handoff.value;
  const observation = context.runtime.observation.value;
  const windowPreparation = context.runtime.windowPreparation.value;
  const captureMetadata = context.runtime.capture.metadata.value;
  const logMetadata = context.runtime.log.metadata.value;
  return {
    profileProjectionSha256: sha256(Buffer.from(JSON.stringify(publishedProfileTrustProjection(context.profile)))),
    publishCounter: context.publishCounter,
    clock: acceptanceClockProjection(context.clock.value),
    routeIdentities: context.routeManifest.identities.map(({ sha256: identitySha256, byteLength }) => ({ sha256: identitySha256, byteLength })),
    state: {
      status: context.state.value.status,
      dispatches: context.state.value.dispatches,
      toolsetVerdict: context.state.value.toolsetVerdict,
      runtimeVerdict: context.state.value.runtimeVerdict,
      lastElapsedMs: context.state.value.lastElapsedMs,
    },
    slo: context.finalPacket.value.slo,
    toolsetVerdict: context.finalPacket.value.toolset.verdict,
    runtimeVerdict: context.finalPacket.value.runtime.verdict,
    toolsetCaptureSha256: context.toolset.capture.sha256,
    runtimeCaptureSha256: context.runtime.capture.sha256,
    runtimeLogSha256: context.runtime.log.sha256,
    runtimeContext: {
      runtimeProfileId: runtimePacket.runtimeProfileId,
      request: {
        requestId: request.requestId,
        createdAt: request.createdAt,
        profileId: request.profileId,
        moduleSha256: request.moduleSha256,
        area: request.area,
        entryPoint: request.entryPoint,
        action: request.action,
        startsNwn: request.startsNwn,
        usesGlobalInput: request.usesGlobalInput,
      },
      process: runtimePacket.process,
      handoff: {
        requestId: handoff.requestId,
        profileId: handoff.profileId,
        moduleSha256: handoff.moduleSha256,
        area: handoff.area,
        entryPoint: handoff.entryPoint,
        testModule: handoff.testModule,
        safety: handoff.safety,
      },
      observation: {
        profileId: observation.profileId,
        process: observation.process,
        moduleSha256: observation.moduleSha256,
        area: observation.area,
        entryPoint: observation.entryPoint,
        safety: observation.safety,
      },
      windowPreparation: {
        process: windowPreparation.process,
        window: windowPreparation.window,
        monitor: windowPreparation.monitor,
        safety: windowPreparation.safety,
      },
      captureMetadata: {
        status: captureMetadata.status,
        processId: captureMetadata.processId,
        startedAtUtc: captureMetadata.startedAtUtc,
        windowHwnd: captureMetadata.windowHwnd,
        title: captureMetadata.title,
        bounds: captureMetadata.bounds,
        monitor: captureMetadata.monitor,
        safety: captureMetadata.safety,
        pngBytes: captureMetadata.pngBytes,
        pngSha256: captureMetadata.pngSha256,
        capturedAtUtc: captureMetadata.capturedAtUtc,
      },
      logMetadata: {
        mode: logMetadata.mode,
        byteStart: logMetadata.byteStart,
        byteEnd: logMetadata.byteEnd,
        sha256: logMetadata.sha256,
        line: logMetadata.line,
        loadingModuleResref: logMetadata.loadingModuleResref,
        process: logMetadata.process,
        requestId: logMetadata.requestId,
      },
    },
  };
}

export function acceptanceClockProjection(clock) {
  return {
    source: clock?.source,
    frequency: clock?.frequency,
    startCounter: clock?.startCounter,
    deadlineCounter: clock?.deadlineCounter,
    hardLimitMs: clock?.hardLimitMs,
  };
}

export function loadOrderedHakResourceIdentity(orderedHaks, resref, type) {
  const resolvedResource = resolveOrderedHakResource(orderedHaks, resref, type);
  assert.ok(resolvedResource, `published_ordered_hak_resource_missing:${resref}:${type}`);
  return {
    resref,
    type,
    hakResref: resolvedResource.hak.resref,
    hakPath: resolve(resolvedResource.hak.path),
    byteLength: resolvedResource.bytes.length,
    sha256: sha256(resolvedResource.bytes),
  };
}

export function readOrderedHakResourceBytes(orderedHaks, resref, type) {
  const resolvedResource = resolveOrderedHakResource(orderedHaks, resref, type);
  assert.ok(resolvedResource, `published_ordered_hak_resource_missing:${resref}:${type}`);
  return Buffer.from(resolvedResource.bytes);
}

function validateAcceptanceEnvelope({ profile, profilePath, profileSha256, clock, finalPacket, finalArtifact, acceptance, acceptancePath }) {
  assert.equal(acceptance?.version, "aurora-model-proof-120s-acceptance/v1", "published_acceptance_version_invalid");
  assert.equal(acceptance?.status, "verified_if_published_filename_counter_is_within_deadline", "published_acceptance_status_invalid");
  assert.equal(acceptance?.profileId, profile.id, "published_acceptance_profile_id_mismatch");
  assert.equal(acceptance?.profileSha256, profileSha256, "published_acceptance_profile_hash_mismatch");
  requireEqual(acceptance?.clock, acceptanceClockProjection(clock), "published_acceptance_clock_projection_mismatch");
  requireArtifactIdentity(acceptance?.finalPacket, finalArtifact, "published_acceptance_final_packet");
  assert.equal(finalPacket?.profile?.id, profile.id, "published_final_profile_id_mismatch");
  assert.equal(finalPacket?.profile?.sha256, profileSha256, "published_final_profile_hash_mismatch");
  assert.equal(normalizedPath(finalPacket?.profile?.path), normalizedPath(profilePath), "published_final_profile_path_mismatch");
  assert.match(basename(acceptancePath), /^final-model-proof\.accepted-at-\d+\.json$/u, "published_acceptance_filename_invalid");
}

function validateFinalAndState({ profile, profilePath, profileSha256, outputRoot, finalPacket, state, ready, readyArtifact, publishedDeadline }) {
  assert.equal(finalPacket?.version, "aurora-model-proof-120s-final/v1", "published_final_version_invalid");
  assert.equal(finalPacket?.status, "pending_qpc_acceptance", "published_final_status_invalid");
  validateSlo(finalPacket?.slo, "published_final_slo");
  assert.ok(finalPacket.slo.elapsedMs <= publishedDeadline.elapsedMs, "published_final_after_acceptance");
  requireEqual(finalPacket?.candidate, {
    module: profile.installedModule,
    orderedHakList: profile.orderedHakList,
    resources: profile.resources,
    area: profile.area,
    fixture: profile.fixture,
  }, "published_final_candidate_mismatch");
  validateVerdict(finalPacket?.toolset?.verdict, "toolset", new Set(["visible"]), finalPacket.slo.elapsedMs);
  validateVerdict(finalPacket?.runtime?.verdict, "runtime", new Set(["visible", "not_visible"]), finalPacket.slo.elapsedMs);

  assert.equal(state?.version, "aurora-model-proof-120s-state/v1", "published_state_version_invalid");
  assert.equal(state?.profileId, profile.id, "published_state_profile_id_mismatch");
  assert.equal(state?.profileSha256, profileSha256, "published_state_profile_hash_mismatch");
  assert.equal(state?.status, "finalized", "published_state_status_invalid");
  assert.equal(state?.toolsetVerdict, finalPacket.toolset.verdict.modelVisibility, "published_state_toolset_verdict_mismatch");
  assert.equal(state?.runtimeVerdict, finalPacket.runtime.verdict.modelVisibility, "published_state_runtime_verdict_mismatch");
  assert.equal(state?.lastElapsedMs, finalPacket.slo.elapsedMs, "published_state_elapsed_mismatch");
  const expectedDispatches = [...REQUIRED_DISPATCHES, "record-toolset-visible", `record-runtime-${state.runtimeVerdict === "visible" ? "visible" : "not-visible"}`].sort();
  requireEqual(Object.keys(state?.dispatches ?? {}).sort(), expectedDispatches, "published_state_dispatch_set_invalid");
  for (const event of expectedDispatches) assert.equal(state.dispatches[event], 1, `published_state_dispatch_invalid:${event}`);
  requireArtifactIdentity(state?.ready, readyArtifact, "published_state_ready");
  assert.equal(ready?.ok, true, "published_ready_not_ok");
  assert.equal(ready?.status, "MODEL_PROOF_120S_READY", "published_ready_status_invalid");
  assert.equal(ready?.profileId, profile.id, "published_ready_profile_id_mismatch");
  assert.equal(ready?.profileSha256, profileSha256, "published_ready_profile_hash_mismatch");
  requireEqual(ready?.module, { path: profile.installedModule.path, sha256: profile.installedModule.sha256 }, "published_ready_module_mismatch");
  requireEqual(ready?.area, profile.area, "published_ready_area_mismatch");
  requireEqual(ready?.fixture, profile.fixture, "published_ready_fixture_mismatch");
  requireArtifactIdentity(finalPacket?.routes?.ready, readyArtifact, "published_final_ready");
  assert.equal(normalizedPath(profile.outputRoot), normalizedPath(outputRoot), "published_output_root_drift");
  assert.ok(normalizedPath(profilePath) !== normalizedPath(outputRoot), "published_profile_must_not_be_output_root");
}

function validateHistoricalRouteManifest({ profile, finalPacket, ready }) {
  assert.equal(finalPacket?.routes?.manifest?.version, ROUTE_MANIFEST_VERSION, "published_route_manifest_version_invalid");
  assert.equal(finalPacket?.routes?.manifest?.sha256, profile.routeManifest.sha256, "published_route_manifest_hash_mismatch");
  assert.equal(normalizedPath(finalPacket?.routes?.manifest?.path), normalizedPath(profile.routeManifest.path), "published_route_manifest_path_mismatch");
  assert.ok(Array.isArray(finalPacket?.routes?.identities) && finalPacket.routes.identities.length > 0, "published_route_identities_missing");
  requireEqual(ready?.routeIdentities, finalPacket.routes.identities, "published_ready_route_identities_mismatch");
  requireEqual(ready?.routeManifest, finalPacket.routes.manifest, "published_ready_route_manifest_mismatch");
  const historicalBytes = Buffer.from(`${JSON.stringify({ version: ROUTE_MANIFEST_VERSION, routes: finalPacket.routes.identities }, null, 2)}\n`);
  assert.equal(sha256(historicalBytes), profile.routeManifest.sha256, "published_historical_route_manifest_hash_mismatch");
  return {
    version: ROUTE_MANIFEST_VERSION,
    path: resolve(profile.routeManifest.path),
    sha256: sha256(historicalBytes),
    byteLength: historicalBytes.length,
    source: "accepted_final_packet_route_identities",
    identities: structuredClone(finalPacket.routes.identities),
  };
}

function validateImmutableCandidate(profile, ready) {
  const binaryProfileArtifact = readDeclaredExternalArtifact(profile.binaryProfile, "published_binary_profile");
  const toolsetProfileArtifact = readDeclaredExternalArtifact(profile.toolsetProfile, "published_toolset_profile");
  const runtimeProfileArtifact = readDeclaredExternalArtifact(profile.runtimeProfile, "published_runtime_profile");
  const binaryProfile = parseJson(binaryProfileArtifact.bytes, "published_binary_profile_json_invalid");
  const toolsetProfile = parseJson(toolsetProfileArtifact.bytes, "published_toolset_profile_json_invalid");
  const runtimeProfile = parseJson(runtimeProfileArtifact.bytes, "published_runtime_profile_json_invalid");
  const sourceModule = readArtifactAt(resolve(binaryProfile?.module?.path ?? ""), "published_source_module");
  assert.equal(sourceModule.sha256, profile.installedModule.sha256, "published_source_module_hash_mismatch");
  assert.equal(binaryProfile?.module?.sha256, profile.installedModule.sha256, "published_binary_module_hash_mismatch");
  assert.equal(binaryProfile?.area?.resref, profile.area.resref, "published_binary_area_mismatch");
  requireEqual(binaryProfile?.entryPoint?.position, profile.area.entryPoint, "published_binary_entry_point_mismatch");
  const binaryFixture = binaryProfile?.fixtures?.find((fixture) => fixture.id === profile.fixture.id);
  assert.ok(binaryFixture, "published_binary_fixture_missing");
  requireEqual(
    {
      id: binaryFixture.id,
      templateResRef: binaryFixture.templateResRef,
      appearanceRow: binaryFixture.appearanceType,
      position: binaryFixture.position,
    },
    {
      id: profile.fixture.id,
      templateResRef: profile.fixture.templateResRef,
      appearanceRow: profile.fixture.appearanceRow,
      position: profile.fixture.position,
    },
    "published_binary_fixture_mismatch",
  );
  const installedModule = readDeclaredExternalArtifact(profile.installedModule, "published_installed_module", true);
  assert.equal(sourceModule.sha256, installedModule.sha256, "published_source_installed_module_bytes_mismatch");
  assert.equal(binaryProfile?.orderedHakList?.length, profile.orderedHakList.length, "published_ordered_hak_count_mismatch");
  const orderedHaks = profile.orderedHakList.map((hak, index) => {
    assert.equal(binaryProfile.orderedHakList[index]?.resref, hak.resref, `published_binary_hak_resref_mismatch:${index}`);
    assert.equal(binaryProfile.orderedHakList[index]?.sha256, hak.sha256, `published_binary_hak_hash_mismatch:${index}`);
    const artifact = readDeclaredExternalArtifact(hak, `published_ordered_hak:${index}`, true);
    return { ...publicArtifact(artifact), resref: hak.resref };
  });
  assert.equal(runtimeProfile?.version, "aur-s07-runtime-profile/v1", "published_runtime_profile_version_invalid");
  assert.match(runtimeProfile?.id ?? "", /^[a-z0-9][a-z0-9-]{2,127}$/u, "published_runtime_profile_id_invalid");
  requireEqual(runtimeProfile?.module, {
    sha256: profile.installedModule.sha256,
    area: profile.area.resref,
    entryPoint: profile.area.entryPoint,
  }, "published_runtime_profile_module_mismatch");
  requireEqual(runtimeProfile?.orderedHakList, profile.orderedHakList.map(({ resref, sha256: hakSha256 }) => ({ resref, sha256: hakSha256 })), "published_runtime_profile_haks_mismatch");
  assert.ok(Array.isArray(runtimeProfile?.fixtures), "published_runtime_profile_fixtures_invalid");
  const runtimeFixture = runtimeProfile.fixtures.find((fixture) => fixture.id === profile.fixture.id);
  assert.ok(runtimeFixture, "published_runtime_profile_fixture_missing");
  requireEqual({
    id: runtimeFixture.id,
    templateResRef: runtimeFixture.templateResRef,
    appearanceRow: runtimeFixture.appearanceRow,
    position: runtimeFixture.position,
  }, {
    id: profile.fixture.id,
    templateResRef: profile.fixture.templateResRef,
    appearanceRow: profile.fixture.appearanceRow,
    position: profile.fixture.position,
  }, "published_runtime_profile_fixture_mismatch");
  assert.equal(runtimeProfile?.launch?.mode, "user_owned_test_module_action", "published_runtime_profile_launch_mode_invalid");
  assert.equal(runtimeProfile?.launch?.processName, "nwmain", "published_runtime_profile_process_invalid");
  assert.equal(runtimeProfile?.noLocalSubstitute, true, "published_runtime_profile_local_substitute_invalid");
  const specs = [
    { name: "mdl", type: 2002, ...profile.resources.mdl },
    { name: "tga", type: 3, ...profile.resources.tga },
    { name: "appearance2da", type: 2017, ...profile.resources.appearance2da },
  ];
  const resources = specs.map((spec) => {
    const resolvedResource = resolveOrderedHakResource(profile.orderedHakList, spec.resref, spec.type);
    assert.ok(resolvedResource, `published_ordered_hak_resource_missing:${spec.name}`);
    assert.equal(sha256(resolvedResource.bytes), spec.sha256, `published_ordered_hak_resource_hash_mismatch:${spec.name}`);
    return { name: spec.name, resref: spec.resref, type: spec.type, hakResref: resolvedResource.hak.resref, byteLength: resolvedResource.bytes.length, sha256: spec.sha256 };
  });
  assert.ok(Array.isArray(ready?.resources) && ready.resources.length === resources.length, "published_ready_resources_invalid");
  for (const [index, resource] of resources.entries()) {
    const declared = ready.resources[index];
    requireEqual(
      { name: declared?.name, resref: declared?.resref, type: declared?.type, hakResref: declared?.hakResref, sha256: declared?.sha256, byteLength: declared?.byteLength },
      resource,
      `published_ready_resource_mismatch:${index}`,
    );
    assert.equal(normalizedPath(declared?.hakPath), normalizedPath(profile.orderedHakList.find((hak) => hak.resref === resource.hakResref)?.path), `published_ready_resource_hak_path_mismatch:${index}`);
  }
  return {
    binaryProfile: publicArtifact(binaryProfileArtifact, binaryProfile),
    toolsetProfile: publicArtifact(toolsetProfileArtifact, toolsetProfile),
    runtimeProfile: publicArtifact(runtimeProfileArtifact, runtimeProfile),
    sourceModule: publicArtifact(sourceModule),
    installedModule: publicArtifact(installedModule),
    orderedHaks,
    resources,
  };
}

function validateAcceptedPackets({ profile, profileSha256, outputRoot, finalPacket, state, publishedDeadline, runtimeProfile }) {
  const toolsetPacketArtifact = readDeclaredOutputArtifact(outputRoot, state?.artifacts?.toolsetPacket, "published_toolset_packet");
  const toolsetVerdictArtifact = readDeclaredOutputArtifact(outputRoot, state?.artifacts?.toolsetVerdict, "published_toolset_verdict");
  const runtimePacketArtifact = readDeclaredOutputArtifact(outputRoot, state?.artifacts?.runtimePacket, "published_runtime_packet");
  const runtimeVerdictArtifact = readDeclaredOutputArtifact(outputRoot, state?.artifacts?.runtimeVerdict, "published_runtime_verdict");
  const toolsetPacket = parseJson(toolsetPacketArtifact.bytes, "published_toolset_packet_json_invalid");
  const toolsetVerdict = parseJson(toolsetVerdictArtifact.bytes, "published_toolset_verdict_json_invalid");
  const runtimePacket = parseJson(runtimePacketArtifact.bytes, "published_runtime_packet_json_invalid");
  const runtimeVerdict = parseJson(runtimeVerdictArtifact.bytes, "published_runtime_verdict_json_invalid");
  requirePacketRef(finalPacket?.toolset, toolsetPacketArtifact, "toolset");
  requirePacketRef(finalPacket?.runtime, runtimePacketArtifact, "runtime");
  requireEqual(toolsetVerdict, finalPacket.toolset.verdict, "published_toolset_verdict_packet_mismatch");
  requireEqual(runtimeVerdict, finalPacket.runtime.verdict, "published_runtime_verdict_packet_mismatch");
  validateAxisPacket(toolsetPacket, profile, profileSha256, "toolset");
  validateAxisPacket(runtimePacket, profile, profileSha256, "runtime");
  requireEqual(toolsetPacket?.visualInspection, stripVerdictTiming(toolsetVerdict), "published_toolset_packet_verdict_mismatch");
  requireEqual(runtimePacket?.visualInspection, stripVerdictTiming(runtimeVerdict), "published_runtime_packet_verdict_mismatch");

  const toolsetCapture = readDeclaredOutputArtifact(outputRoot, state?.artifacts?.toolsetCapture, "published_toolset_capture", true);
  const toolsetCaptureMetadata = readOutputArtifact(outputRoot, state.artifacts.toolsetCapture.metadataPath, "published_toolset_capture_metadata");
  assert.equal(toolsetCaptureMetadata.sha256, state.artifacts.toolsetCapture.metadataSha256, "published_toolset_capture_metadata_hash_mismatch");
  parseJson(toolsetCaptureMetadata.bytes, "published_toolset_capture_metadata_json_invalid");
  validatePngBytes(toolsetCapture.bytes);
  requireCaptureBinding(toolsetPacket?.capture, state.artifacts.toolsetCapture, toolsetCapture, "toolset");
  assert.equal(toolsetVerdict.captureSha256, toolsetCapture.sha256, "published_toolset_verdict_capture_mismatch");

  const runtimeCapture = readDeclaredOutputArtifact(outputRoot, state?.artifacts?.runtimeCapture, "published_runtime_capture", true);
  const runtimeCaptureMetadata = readOutputArtifact(outputRoot, state.artifacts.runtimeCapture.metadataPath, "published_runtime_capture_metadata");
  assert.equal(runtimeCaptureMetadata.sha256, state.artifacts.runtimeCapture.metadataSha256, "published_runtime_capture_metadata_hash_mismatch");
  const runtimeCaptureMetadataValue = parseJson(runtimeCaptureMetadata.bytes, "published_runtime_capture_metadata_json_invalid");
  const decodedRuntime = decodeDiagnosticRuntimePng(runtimeCapture.bytes);
  assert.equal(decodedRuntime.width, state.artifacts.runtimeCapture.width, "published_runtime_capture_width_mismatch");
  assert.equal(decodedRuntime.height, state.artifacts.runtimeCapture.height, "published_runtime_capture_height_mismatch");
  requireCaptureBinding(runtimePacket?.capture, state.artifacts.runtimeCapture, runtimeCapture, "runtime");
  assert.equal(runtimeVerdict.captureSha256, runtimeCapture.sha256, "published_runtime_verdict_capture_mismatch");
  assert.equal(normalizedPath(runtimeCaptureMetadataValue?.pngPath), normalizedPath(runtimeCapture.path), "published_runtime_capture_metadata_path_mismatch");
  assert.equal(runtimeCaptureMetadataValue?.pngSha256, runtimeCapture.sha256, "published_runtime_capture_metadata_png_hash_mismatch");
  assert.equal(runtimeCaptureMetadataValue?.pngBytes, runtimeCapture.byteLength, "published_runtime_capture_metadata_png_length_mismatch");
  assert.ok(runtimeVerdict.elapsed.elapsedMs <= finalPacket.slo.elapsedMs && runtimeVerdict.elapsed.elapsedMs <= publishedDeadline.elapsedMs, "published_runtime_capture_outside_qpc_run");
  assert.equal(runtimeVerdict.elapsed.expired, false, "published_runtime_verdict_expired");

  const runtimeLog = readDeclaredOutputArtifact(outputRoot, state?.artifacts?.runtimeLog, "published_runtime_log", true);
  const runtimeLogMetadata = readOutputArtifact(outputRoot, state.artifacts.runtimeLog.metadataPath, "published_runtime_log_metadata");
  assert.equal(runtimeLogMetadata.sha256, state.artifacts.runtimeLog.metadataSha256, "published_runtime_log_metadata_hash_mismatch");
  const runtimeLogMetadataValue = parseJson(runtimeLogMetadata.bytes, "published_runtime_log_metadata_json_invalid");
  assert.equal(runtimeLogMetadataValue?.sha256, runtimeLog.sha256, "published_runtime_log_window_hash_mismatch");
  requireEqual(runtimePacket?.engineLogWindow, {
    path: state.artifacts.runtimeLog.path,
    sha256: state.artifacts.runtimeLog.sha256,
    metadataPath: state.artifacts.runtimeLog.metadataPath,
    metadataSha256: state.artifacts.runtimeLog.metadataSha256,
  }, "published_runtime_packet_log_mismatch");

  const observation = readDeclaredOutputArtifact(outputRoot, state?.artifacts?.runtimeObservation, "published_runtime_observation");
  const windowPreparation = readDeclaredOutputArtifact(outputRoot, state?.artifacts?.runtimeWindowPreparation, "published_runtime_window_preparation");
  const observationValue = parseJson(observation.bytes, "published_runtime_observation_json_invalid");
  const windowPreparationValue = parseJson(windowPreparation.bytes, "published_runtime_window_preparation_json_invalid");
  requireArtifactIdentity(runtimePacket?.observation, observation, "published_runtime_packet_observation");
  requireArtifactIdentity(runtimePacket?.windowPreparation, windowPreparation, "published_runtime_packet_window_preparation");
  const requestArtifact = readOutputArtifact(outputRoot, runtimePacket?.request?.path, "published_runtime_request");
  const handoffArtifact = readOutputArtifact(outputRoot, runtimePacket?.handoff?.path, "published_runtime_handoff");
  assert.equal(requestArtifact.sha256, runtimePacket?.request?.sha256, "published_runtime_request_hash_mismatch");
  assert.equal(handoffArtifact.sha256, runtimePacket?.handoff?.sha256, "published_runtime_handoff_hash_mismatch");
  const requestValue = parseJson(requestArtifact.bytes, "published_runtime_request_json_invalid");
  const handoffValue = parseJson(handoffArtifact.bytes, "published_runtime_handoff_json_invalid");
  validateRuntimeAcceptanceContext({
    profile,
    runtimeProfile,
    runtimePacket,
    request: requestValue,
    requestArtifact,
    handoff: handoffValue,
    handoffArtifact,
    observation: observationValue,
    windowPreparation: windowPreparationValue,
    runtimeCaptureMetadata: runtimeCaptureMetadataValue,
    runtimeCapture,
    decodedRuntime,
    runtimeLogMetadata: runtimeLogMetadataValue,
    runtimeLog,
  });

  return {
    toolset: {
      packet: publicArtifact(toolsetPacketArtifact, toolsetPacket),
      verdict: publicArtifact(toolsetVerdictArtifact, toolsetVerdict),
      capture: { ...publicArtifact(toolsetCapture), width: state.artifacts.toolsetCapture.width, height: state.artifacts.toolsetCapture.height },
    },
    runtime: {
      packet: publicArtifact(runtimePacketArtifact, runtimePacket),
      verdict: publicArtifact(runtimeVerdictArtifact, runtimeVerdict),
      request: publicArtifact(requestArtifact, requestValue),
      handoff: publicArtifact(handoffArtifact, handoffValue),
      observation: publicArtifact(observation, observationValue),
      windowPreparation: publicArtifact(windowPreparation, windowPreparationValue),
      capture: {
        ...publicArtifact(runtimeCapture),
        width: decodedRuntime.width,
        height: decodedRuntime.height,
        metadata: publicArtifact(runtimeCaptureMetadata, runtimeCaptureMetadataValue),
      },
      log: {
        ...publicArtifact(runtimeLog),
        metadata: publicArtifact(runtimeLogMetadata, runtimeLogMetadataValue),
      },
    },
  };
}

function validateRuntimeAcceptanceContext({
  profile,
  runtimeProfile,
  runtimePacket,
  request,
  requestArtifact,
  handoff,
  handoffArtifact,
  observation,
  windowPreparation,
  runtimeCaptureMetadata,
  runtimeCapture,
  decodedRuntime,
  runtimeLogMetadata,
  runtimeLog,
}) {
  const process = runtimePacket?.process;
  assert.ok(Number.isSafeInteger(process?.pid) && process.pid > 0, "published_runtime_process_pid_invalid");
  assert.equal(process?.name, "nwmain", "published_runtime_process_name_invalid");
  const processStartMs = parseRuntimeTime(process?.startedAtUtc, "published_runtime_process_start_invalid");
  assert.equal(process?.responding, true, "published_runtime_process_not_responding");
  assert.ok(Number.isSafeInteger(process?.mainWindowHandle) && process.mainWindowHandle > 0, "published_runtime_process_hwnd_invalid");
  assert.ok(String(process?.title ?? "").trim(), "published_runtime_process_title_invalid");
  assert.equal(runtimePacket?.runtimeProfileId, runtimeProfile?.id, "published_runtime_packet_runtime_profile_id_mismatch");

  assert.equal(request?.version, "aur-s07-runtime-launch-request/v1", "published_runtime_request_version_invalid");
  assert.ok(String(request?.requestId ?? "").trim(), "published_runtime_request_id_invalid");
  assert.equal(runtimePacket?.request?.requestId, request.requestId, "published_runtime_request_id_mismatch");
  assert.equal(request?.profileId, runtimeProfile.id, "published_runtime_request_profile_mismatch");
  assert.equal(request?.moduleSha256, profile.installedModule.sha256, "published_runtime_request_module_mismatch");
  assert.equal(request?.area, profile.area.resref, "published_runtime_request_area_mismatch");
  requireEqual(request?.entryPoint, profile.area.entryPoint, "published_runtime_request_entry_point_mismatch");
  assert.equal(request?.action, "user_owned_test_module_action", "published_runtime_request_action_invalid");
  assert.equal(request?.startsNwn, false, "published_runtime_request_starts_nwn_invalid");
  assert.equal(request?.usesGlobalInput, false, "published_runtime_request_global_input_invalid");
  const requestCreatedMs = parseRuntimeTime(request?.createdAt, "published_runtime_request_created_at_invalid");
  assert.ok(processStartMs >= requestCreatedMs, "published_runtime_process_predates_request");

  assert.equal(handoff?.version, "aur-s07-runtime-handoff/v1", "published_runtime_handoff_version_invalid");
  assert.equal(handoff?.requestId, request.requestId, "published_runtime_handoff_request_id_mismatch");
  assert.equal(handoff?.profileId, runtimeProfile.id, "published_runtime_handoff_profile_mismatch");
  assert.equal(handoff?.moduleSha256, profile.installedModule.sha256, "published_runtime_handoff_module_mismatch");
  assert.equal(handoff?.area, profile.area.resref, "published_runtime_handoff_area_mismatch");
  requireEqual(handoff?.entryPoint, profile.area.entryPoint, "published_runtime_handoff_entry_point_mismatch");
  assert.equal(handoff?.testModule?.commandId, 121, "published_runtime_handoff_command_invalid");
  assert.equal(handoff?.testModule?.commandCount, 1, "published_runtime_handoff_command_count_invalid");
  assert.equal(handoff?.testModule?.nwmainPid, process.pid, "published_runtime_handoff_pid_mismatch");
  assert.equal(handoff?.testModule?.nwmainStartUtc, process.startedAtUtc, "published_runtime_handoff_start_mismatch");
  assert.equal(handoff?.testModule?.nwmainResponding, true, "published_runtime_handoff_process_not_responding");
  assert.equal(handoff?.safety?.usesGlobalInput, false, "published_runtime_handoff_global_input_invalid");
  assert.equal(handoff?.safety?.secondTestModuleInvocation, false, "published_runtime_handoff_second_invocation_invalid");

  assert.equal(observation?.version, "aur-s07-runtime-observation/v1", "published_runtime_observation_version_invalid");
  assert.equal(observation?.profileId, runtimeProfile.id, "published_runtime_observation_profile_mismatch");
  assert.equal(observation?.process?.pid, process.pid, "published_runtime_observation_pid_mismatch");
  assert.equal(observation?.process?.name, process.name, "published_runtime_observation_process_name_mismatch");
  assert.equal(parseRuntimeTime(observation?.process?.startedAt, "published_runtime_observation_start_invalid"), Math.trunc(processStartMs), "published_runtime_observation_start_mismatch");
  assert.equal(observation?.process?.responding, process.responding, "published_runtime_observation_responding_mismatch");
  assert.equal(observation?.moduleSha256, profile.installedModule.sha256, "published_runtime_observation_module_mismatch");
  assert.equal(observation?.area, profile.area.resref, "published_runtime_observation_area_mismatch");
  requireEqual(observation?.entryPoint, profile.area.entryPoint, "published_runtime_observation_entry_point_mismatch");
  assert.equal(normalizedPath(observation?.handoffPath), normalizedPath(handoffArtifact.path), "published_runtime_observation_handoff_path_mismatch");
  assert.equal(observation?.safety?.startsNwn, false, "published_runtime_observation_starts_nwn_invalid");
  assert.equal(observation?.safety?.usesGlobalInput, false, "published_runtime_observation_global_input_invalid");

  assert.equal(windowPreparation?.ok, true, "published_runtime_window_preparation_not_ok");
  assert.equal(windowPreparation?.status, "verified", "published_runtime_window_preparation_status_invalid");
  assert.equal(windowPreparation?.process?.pid, process.pid, "published_runtime_window_preparation_pid_mismatch");
  assert.equal(windowPreparation?.process?.name, process.name, "published_runtime_window_preparation_process_name_mismatch");
  assert.equal(windowPreparation?.process?.startedAtUtc, process.startedAtUtc, "published_runtime_window_preparation_start_mismatch");
  assert.equal(windowPreparation?.process?.responding, process.responding, "published_runtime_window_preparation_responding_mismatch");
  assert.equal(windowPreparation?.window?.hwnd, process.mainWindowHandle, "published_runtime_window_preparation_hwnd_mismatch");
  assert.equal(windowPreparation?.window?.ownerPid, process.pid, "published_runtime_window_preparation_owner_pid_mismatch");
  assert.equal(windowPreparation?.monitor?.primary, false, "published_runtime_window_preparation_primary_monitor_invalid");
  assert.equal(windowPreparation?.safety?.usesGlobalCursor, false, "published_runtime_window_preparation_global_cursor_invalid");
  assert.equal(windowPreparation?.safety?.usesGlobalMouse, false, "published_runtime_window_preparation_global_mouse_invalid");
  assert.equal(windowPreparation?.safety?.usesGlobalKeyboard, false, "published_runtime_window_preparation_global_keyboard_invalid");
  assert.equal(windowPreparation?.safety?.changesZOrder, false, "published_runtime_window_preparation_z_order_invalid");
  assert.equal(windowPreparation?.safety?.activatesWindow, false, "published_runtime_window_preparation_activation_invalid");

  assert.equal(runtimeCaptureMetadata?.ok, true, "published_runtime_capture_metadata_not_ok");
  assert.equal(runtimeCaptureMetadata?.status, "verified", "published_runtime_capture_metadata_status_invalid");
  assert.equal(runtimeCaptureMetadata?.processId, process.pid, "published_runtime_capture_pid_mismatch");
  assert.equal(runtimeCaptureMetadata?.startedAtUtc, process.startedAtUtc, "published_runtime_capture_start_mismatch");
  assert.equal(runtimeCaptureMetadata?.windowHwnd, process.mainWindowHandle, "published_runtime_capture_hwnd_mismatch");
  assert.equal(runtimeCaptureMetadata?.title, process.title, "published_runtime_capture_title_mismatch");
  assert.equal(runtimeCaptureMetadata?.monitor?.primary, false, "published_runtime_capture_primary_monitor_invalid");
  assert.equal(runtimeCaptureMetadata?.monitor?.deviceName, windowPreparation?.monitor?.deviceName, "published_runtime_capture_monitor_mismatch");
  const preparedBounds = windowPreparation?.window?.after;
  requireEqual(runtimeCaptureMetadata?.bounds, {
    left: preparedBounds?.left,
    top: preparedBounds?.top,
    width: preparedBounds?.width,
    height: preparedBounds?.height,
  }, "published_runtime_capture_bounds_mismatch");
  assert.equal(runtimeCaptureMetadata?.bounds?.width, decodedRuntime.width, "published_runtime_capture_metadata_width_mismatch");
  assert.equal(runtimeCaptureMetadata?.bounds?.height, decodedRuntime.height, "published_runtime_capture_metadata_height_mismatch");
  assert.equal(runtimeCaptureMetadata?.safety?.usesGlobalCursor, false, "published_runtime_capture_global_cursor_invalid");
  assert.equal(runtimeCaptureMetadata?.safety?.usesGlobalMouse, false, "published_runtime_capture_global_mouse_invalid");
  assert.equal(runtimeCaptureMetadata?.safety?.usesGlobalKeyboard, false, "published_runtime_capture_global_keyboard_invalid");
  assert.equal(runtimeCaptureMetadata?.safety?.changesWindowGeometry, false, "published_runtime_capture_geometry_invalid");
  assert.equal(runtimeCaptureMetadata?.safety?.activatesWindow, false, "published_runtime_capture_activation_invalid");
  assert.ok(parseRuntimeTime(runtimeCaptureMetadata?.capturedAtUtc, "published_runtime_capture_time_invalid") >= processStartMs, "published_runtime_capture_predates_process");

  assert.equal(runtimePacket?.safety?.usesGlobalInput, false, "published_runtime_packet_global_input_invalid");
  assert.equal(runtimePacket?.safety?.testModuleCommandCount, 1, "published_runtime_packet_command_count_invalid");
  assert.equal(runtimePacket?.safety?.saved, false, "published_runtime_packet_saved_invalid");
  assert.equal(runtimePacket?.safety?.built, false, "published_runtime_packet_built_invalid");
  assert.equal(runtimePacket?.safety?.repacked, false, "published_runtime_packet_repacked_invalid");
  validateRuntimeCaptureLeaseSchema(runtimePacket, runtimeCaptureMetadata);

  assert.equal(runtimeLogMetadata?.version, "aurora-model-proof-engine-log-window/v1", "published_runtime_log_metadata_version_invalid");
  assert.equal(normalizedPath(runtimeLogMetadata?.sourcePath), normalizedPath(profile.runtime.engineLogPath), "published_runtime_log_source_mismatch");
  assert.ok(new Set(["append_same_identity", "rotated_preserved_prefix"]).has(runtimeLogMetadata?.mode), "published_runtime_log_mode_invalid");
  validateLogSnapshot(runtimeLogMetadata?.baseline, "baseline");
  validateLogSnapshot(runtimeLogMetadata?.selectedBaseline, "selected_baseline");
  validateLogIdentity(runtimeLogMetadata?.after, "after");
  assert.ok(Array.isArray(runtimeLogMetadata?.observedResets) && runtimeLogMetadata.observedResets.length <= 1, "published_runtime_log_resets_invalid");
  assert.equal(runtimeLogMetadata?.byteStart, Number(runtimeLogMetadata.selectedBaseline.identity.size), "published_runtime_log_byte_start_invalid");
  assert.equal(runtimeLogMetadata?.byteEnd, Number(runtimeLogMetadata.after.size), "published_runtime_log_byte_end_invalid");
  assert.equal(runtimeLogMetadata.byteEnd - runtimeLogMetadata.byteStart, runtimeLog.byteLength, "published_runtime_log_window_length_mismatch");
  assert.ok(BigInt(runtimeLogMetadata.after.mtimeNs) > BigInt(runtimeLogMetadata.selectedBaseline.identity.mtimeNs), "published_runtime_log_not_updated_after_baseline");
  assert.ok(BigInt(runtimeLogMetadata.after.mtimeNs) >= BigInt(Math.trunc(requestCreatedMs)) * 1_000_000n, "published_runtime_log_not_fresh_for_request");
  if (runtimeLogMetadata.mode === "append_same_identity") {
    assert.equal(runtimeLogMetadata.after.dev, runtimeLogMetadata.selectedBaseline.identity.dev, "published_runtime_log_device_mismatch");
    assert.equal(runtimeLogMetadata.after.ino, runtimeLogMetadata.selectedBaseline.identity.ino, "published_runtime_log_inode_mismatch");
  }
  assert.equal(runtimeLogMetadata?.loadingModuleResref, profile.runtime.loadingModuleResref, "published_runtime_loading_module_mismatch");
  const exactLoadingPattern = new RegExp(`(?:^|\\s)Loading Module:\\s*${escapeRegex(profile.runtime.loadingModuleResref)}\\s*$`, "u");
  assert.ok(exactLoadingPattern.test(String(runtimeLogMetadata?.line ?? "")), "published_runtime_loading_module_line_invalid");
  const loadingLines = runtimeLog.bytes.toString("utf8").split(/\r?\n/u).filter((line) => line.includes("Loading Module:"));
  assert.equal(loadingLines.length, 1, "published_runtime_loading_module_line_count_invalid");
  assert.equal(loadingLines[0], runtimeLogMetadata.line, "published_runtime_loading_module_window_mismatch");
  assert.equal(handoff?.testModule?.engineLoadLine, runtimeLogMetadata.line, "published_runtime_handoff_log_line_mismatch");
  assert.equal(runtimeLogMetadata?.requestId, request.requestId, "published_runtime_log_request_id_mismatch");
  requireEqual(runtimeLogMetadata?.process, process, "published_runtime_log_process_mismatch");
  assert.equal(normalizedPath(requestArtifact.path), normalizedPath(runtimePacket.request.path), "published_runtime_request_path_mismatch");
  assert.equal(normalizedPath(handoffArtifact.path), normalizedPath(runtimePacket.handoff.path), "published_runtime_handoff_path_mismatch");
  assert.equal(runtimeCapture.sha256, runtimeCaptureMetadata.pngSha256, "published_runtime_capture_context_hash_mismatch");
}

export function validateRuntimeCaptureLeaseSchema(runtimePacket, runtimeCaptureMetadata) {
  assert.equal(runtimePacket?.version, "aurora-model-proof-120s-runtime-packet/v1", "published_runtime_capture_lease_packet_version_invalid");
  const packetSafety = runtimePacket?.safety;
  const captureSafety = runtimeCaptureMetadata?.safety;
  assert.ok(packetSafety && captureSafety, "published_runtime_capture_lease_safety_missing");
  const packetHasLease = Object.hasOwn(runtimePacket, "windowSurfaceLease");
  const captureHasLease = Object.hasOwn(runtimeCaptureMetadata, "zOrderLease");
  const packetHasTemporaryLease = Object.hasOwn(packetSafety, "temporaryZOrderLease");
  const captureHasTemporaryLease = Object.hasOwn(captureSafety, "temporaryZOrderLease");
  const captureHasLegacyChanges = Object.hasOwn(captureSafety, "changesZOrder");

  const legacySchema = !packetHasLease
    && !captureHasLease
    && !packetHasTemporaryLease
    && !captureHasTemporaryLease
    && captureHasLegacyChanges;
  const currentSchema = packetHasLease
    && captureHasLease
    && packetHasTemporaryLease
    && captureHasTemporaryLease
    && !captureHasLegacyChanges;
  assert.ok(legacySchema || currentSchema, "published_runtime_capture_lease_schema_invalid");

  if (legacySchema) {
    assert.equal(captureSafety.changesZOrder, false, "published_runtime_capture_legacy_z_order_invalid");
    assert.equal(packetSafety.changesZOrder, false, "published_runtime_packet_legacy_z_order_invalid");
    return {
      schema: "legacy_no_lease",
      leaseRequired: false,
      leaseLifted: false,
      zOrderMutationCount: 0,
    };
  }

  requireEqual(runtimePacket.windowSurfaceLease, runtimeCaptureMetadata.zOrderLease, "published_runtime_capture_lease_packet_mismatch");
  const process = runtimePacket?.process;
  assert.equal(runtimeCaptureMetadata?.processId, process?.pid, "published_runtime_capture_lease_pid_mismatch");
  assert.equal(runtimeCaptureMetadata?.startedAtUtc, process?.startedAtUtc, "published_runtime_capture_lease_start_mismatch");
  assert.equal(runtimeCaptureMetadata?.windowHwnd, process?.mainWindowHandle, "published_runtime_capture_lease_hwnd_mismatch");
  assert.equal(runtimeCaptureMetadata?.startTimeMatchedExactly, true, "published_runtime_capture_lease_start_readback_invalid");
  requireEqual(runtimeCaptureMetadata?.identitySnapshot, {
    processId: process?.pid,
    startedAtUtc: process?.startedAtUtc,
    windowHwnd: process?.mainWindowHandle,
  }, "published_runtime_capture_lease_identity_snapshot_mismatch");
  assert.equal(runtimeCaptureMetadata?.visibleOwnedTopWindowCount, 1, "published_runtime_capture_lease_owned_window_count_invalid");
  assert.equal(runtimeCaptureMetadata?.modalFreeBeforeCapture, true, "published_runtime_capture_lease_modal_before_invalid");
  assert.equal(runtimeCaptureMetadata?.modalFreeAfterRestore, true, "published_runtime_capture_lease_modal_after_invalid");
  assert.equal(runtimeCaptureMetadata?.captureCount, 1, "published_runtime_capture_lease_capture_count_invalid");
  assert.equal(packetSafety.physicalCaptureCount, 1, "published_runtime_packet_physical_capture_count_invalid");

  const lease = runtimeCaptureMetadata.zOrderLease;
  assert.equal(typeof lease?.required, "boolean", "published_runtime_capture_lease_required_invalid");
  assert.equal(typeof lease?.lifted, "boolean", "published_runtime_capture_lease_lifted_invalid");
  assert.equal(lease.lifted, lease.required, "published_runtime_capture_lease_required_lifted_mismatch");
  const expectedMutations = lease.lifted ? 2 : 0;
  assert.equal(lease?.zOrderMutationCount, expectedMutations, "published_runtime_capture_lease_mutation_count_invalid");
  assert.ok(new Set([0, 2]).has(lease.zOrderMutationCount), "published_runtime_capture_lease_mutation_set_invalid");
  assert.equal(captureSafety.temporaryZOrderLease, lease.lifted, "published_runtime_capture_temporary_lease_mismatch");
  assert.equal(packetSafety.changesZOrder, lease.lifted, "published_runtime_packet_z_order_mismatch");
  assert.equal(packetSafety.temporaryZOrderLease, lease.lifted, "published_runtime_packet_temporary_lease_mismatch");
  assert.equal(captureSafety.zOrderRestored, true, "published_runtime_capture_z_order_not_restored");
  assert.equal(packetSafety.zOrderRestored, true, "published_runtime_packet_z_order_not_restored");
  assert.equal(captureSafety.usesTopmost, false, "published_runtime_capture_topmost_invalid");
  assert.equal(packetSafety.usesTopmost, false, "published_runtime_packet_topmost_invalid");
  assert.equal(captureSafety.activatesWindow, false, "published_runtime_capture_activation_invalid");
  assert.equal(packetSafety.activatesWindow, false, "published_runtime_packet_activation_invalid");

  assert.equal(lease?.lift?.target, "HWND_TOP", "published_runtime_capture_lease_target_invalid");
  assert.equal(lease?.lift?.usesTopmost, false, "published_runtime_capture_lease_topmost_invalid");
  assert.equal(lease?.lift?.activatesWindow, false, "published_runtime_capture_lease_activation_invalid");
  requireEqual(lease?.lift?.flags, [
    "SWP_NOMOVE",
    "SWP_NOSIZE",
    "SWP_NOACTIVATE",
    "SWP_NOOWNERZORDER",
    "SWP_NOSENDCHANGING",
  ], "published_runtime_capture_lease_flags_invalid");

  assert.ok(lease?.restore && typeof lease.restore === "object", "published_runtime_capture_lease_restore_missing");
  assert.equal(lease.restore.required, lease.lifted, "published_runtime_capture_lease_restore_required_mismatch");
  assert.equal(lease.restore.attempted, lease.lifted, "published_runtime_capture_lease_restore_attempted_mismatch");
  assert.equal(lease.restore.succeeded, true, "published_runtime_capture_lease_restore_failed");
  assert.equal(lease.restore.processIdentityUnchanged, true, "published_runtime_capture_lease_restore_process_drift");
  assert.equal(lease.restore.windowIdentityUnchanged, true, "published_runtime_capture_lease_restore_window_drift");
  assert.equal(lease.restore.modalFree, true, "published_runtime_capture_lease_restore_modal_invalid");
  assert.ok(Number.isSafeInteger(lease?.originalPredecessor?.hwnd) && lease.originalPredecessor.hwnd > 0, "published_runtime_capture_lease_predecessor_hwnd_invalid");
  assert.ok(Number.isSafeInteger(lease?.originalPredecessor?.pid) && lease.originalPredecessor.pid > 0, "published_runtime_capture_lease_predecessor_pid_invalid");
  assert.equal(lease.restore.predecessorHwndAfter, lease.originalPredecessor.hwnd, "published_runtime_capture_lease_predecessor_restore_mismatch");
  assert.equal(lease.restore.predecessorPidAfter, lease.originalPredecessor.pid, "published_runtime_capture_lease_predecessor_pid_restore_mismatch");

  for (const [name, owners] of [
    ["initial", lease.initialProbeOwners],
    ["post_lift", lease.postLiftProbeOwners],
    ["capture", lease.captureProbeOwners],
  ]) {
    assert.ok(Array.isArray(owners) && owners.length > 0 && owners.every((pid) => Number.isSafeInteger(pid) && pid > 0), `published_runtime_capture_lease_${name}_probes_invalid`);
  }
  if (lease.lifted) {
    assert.ok(lease.initialProbeOwners.some((pid) => pid !== process.pid), "published_runtime_capture_lease_foreign_obscurer_missing");
  } else {
    assert.ok(lease.initialProbeOwners.every((pid) => pid === process.pid), "published_runtime_capture_lease_unneeded_lift_state_invalid");
  }
  assert.ok(lease.postLiftProbeOwners.every((pid) => pid === process.pid), "published_runtime_capture_lease_post_lift_owner_invalid");
  assert.ok(lease.captureProbeOwners.every((pid) => pid === process.pid), "published_runtime_capture_lease_capture_owner_invalid");

  return {
    schema: "current_scoped_zorder_lease",
    leaseRequired: lease.required,
    leaseLifted: lease.lifted,
    zOrderMutationCount: lease.zOrderMutationCount,
  };
}

function parseRuntimeTime(value, message) {
  const text = String(value ?? "");
  const powershell = /^\/Date\((\d+)\)\/$/u.exec(text);
  const epochMs = powershell ? Number(powershell[1]) : Date.parse(text);
  assert.ok(Number.isFinite(epochMs), message);
  return epochMs;
}

function validateLogIdentity(identity, name) {
  assert.ok(identity && ["dev", "ino", "size", "mtimeNs"].every((field) => /^\d+$/u.test(String(identity[field] ?? ""))), `published_runtime_log_${name}_identity_invalid`);
}

function validateLogSnapshot(snapshot, name) {
  assert.ok(snapshot && Number.isFinite(Date.parse(snapshot.capturedAtUtc)), `published_runtime_log_${name}_capture_time_invalid`);
  validateLogIdentity(snapshot.identity, name);
  assert.match(snapshot.sha256 ?? "", SHA256, `published_runtime_log_${name}_hash_invalid`);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

function validateAxisPacket(packet, profile, profileSha256, environment) {
  assert.equal(packet?.version, `aurora-model-proof-120s-${environment}-packet/v1`, `published_${environment}_packet_version_invalid`);
  assert.equal(packet?.profileId, profile.id, `published_${environment}_packet_profile_id_mismatch`);
  assert.equal(packet?.profileSha256, profileSha256, `published_${environment}_packet_profile_hash_mismatch`);
  requireEqual(packet?.module, profile.installedModule, `published_${environment}_packet_module_mismatch`);
  requireEqual(packet?.orderedHakList, profile.orderedHakList, `published_${environment}_packet_haks_mismatch`);
  requireEqual(packet?.area, profile.area, `published_${environment}_packet_area_mismatch`);
  requireEqual(packet?.fixture, profile.fixture, `published_${environment}_packet_fixture_mismatch`);
  assert.equal(packet?.modelVisibility, packet?.visualInspection?.modelVisibility, `published_${environment}_packet_visibility_mismatch`);
  assert.equal(packet?.proofCompleteness, packet?.visualInspection?.proofCompleteness, `published_${environment}_packet_completeness_mismatch`);
}

function validateVerdict(verdict, environment, visibility, maxElapsed) {
  assert.equal(verdict?.environment, environment, `published_${environment}_verdict_environment_invalid`);
  assert.match(verdict?.captureSha256 ?? "", SHA256, `published_${environment}_verdict_capture_hash_invalid`);
  assert.ok(visibility.has(verdict?.modelVisibility), `published_${environment}_verdict_visibility_invalid`);
  assert.equal(verdict?.proofCompleteness, "verified", `published_${environment}_verdict_completeness_invalid`);
  assert.ok(String(verdict?.inspection ?? "").trim(), `published_${environment}_verdict_inspection_missing`);
  assert.ok(Number.isInteger(verdict?.elapsed?.elapsedMs) && verdict.elapsed.elapsedMs <= maxElapsed, `published_${environment}_verdict_elapsed_invalid`);
  assert.equal(verdict?.elapsed?.expired, false, `published_${environment}_verdict_expired`);
}

function validateSlo(slo, name) {
  assert.equal(slo?.hardLimitMs, 120_000, `${name}_hard_limit_invalid`);
  assert.ok(Number.isInteger(slo?.elapsedMs) && slo.elapsedMs >= 0 && slo.elapsedMs < 120_000, `${name}_elapsed_invalid`);
  assert.equal(slo?.remainingMs, 120_000 - slo.elapsedMs, `${name}_remaining_invalid`);
  assert.equal(slo?.expired, false, `${name}_expired`);
}

function validateClock(clock) {
  assert.equal(clock?.version, CLOCK_VERSION, "published_clock_version_invalid");
  deadlineStatus(clock, BigInt(clock.startCounter));
}

function requirePacketRef(axis, artifact, environment) {
  assert.equal(normalizedPath(axis?.packetPath), normalizedPath(artifact.path), `published_${environment}_packet_path_mismatch`);
  assert.equal(axis?.packetSha256, artifact.sha256, `published_${environment}_packet_hash_mismatch`);
}

function requireCaptureBinding(packetCapture, stateCapture, artifact, environment) {
  for (const value of [packetCapture, stateCapture]) {
    assert.equal(normalizedPath(value?.path), normalizedPath(artifact.path), `published_${environment}_capture_path_mismatch`);
    assert.equal(value?.sha256, artifact.sha256, `published_${environment}_capture_hash_mismatch`);
    assert.equal(value?.byteLength, artifact.byteLength, `published_${environment}_capture_length_mismatch`);
  }
  assert.equal(normalizedPath(packetCapture?.metadataPath), normalizedPath(stateCapture?.metadataPath), `published_${environment}_capture_metadata_path_mismatch`);
  assert.equal(packetCapture?.metadataSha256, stateCapture?.metadataSha256, `published_${environment}_capture_metadata_hash_mismatch`);
}

function stripVerdictTiming(verdict) {
  const { recordedAtUtc: _recordedAtUtc, elapsed: _elapsed, ...value } = verdict;
  return value;
}

function resolveOrderedHakResource(orderedHaks, resref, type) {
  for (const hak of orderedHaks) {
    const bytes = readErfResource(hak.path, resref, type);
    if (bytes) return { hak, bytes };
  }
  return null;
}

function readErfResource(path, expectedResref, expectedType) {
  const bytes = readFileSync(resolve(path));
  assert.ok(bytes.length >= 160, `published_hak_header_truncated:${path}`);
  assert.equal(bytes.subarray(0, 4).toString("ascii"), "HAK ", `published_hak_header_invalid:${path}`);
  assert.ok(new Set(["V1.0", "V1.1"]).has(bytes.subarray(4, 8).toString("ascii")), `published_hak_version_invalid:${path}`);
  const entryCount = bytes.readUInt32LE(16);
  const keyOffset = bytes.readUInt32LE(24);
  const resourceOffset = bytes.readUInt32LE(28);
  assert.ok(keyOffset + entryCount * 24 <= bytes.length && resourceOffset + entryCount * 8 <= bytes.length, `published_hak_index_out_of_range:${path}`);
  const matches = [];
  for (let index = 0; index < entryCount; index += 1) {
    const key = keyOffset + index * 24;
    const keyResref = bytes.subarray(key, key + 16).toString("ascii").replace(/\0.*$/u, "").toLowerCase();
    const resourceId = bytes.readUInt32LE(key + 16);
    const keyType = bytes.readUInt16LE(key + 20);
    if (keyResref !== expectedResref.toLowerCase() || keyType !== expectedType) continue;
    assert.ok(resourceId < entryCount, `published_hak_resource_id_out_of_range:${path}`);
    const entry = resourceOffset + resourceId * 8;
    const offset = bytes.readUInt32LE(entry);
    const length = bytes.readUInt32LE(entry + 4);
    assert.ok(offset + length <= bytes.length, `published_hak_resource_payload_out_of_range:${path}`);
    matches.push(bytes.subarray(offset, offset + length));
  }
  assert.ok(matches.length <= 1, `published_hak_resource_ambiguous:${path}:${expectedResref}:${expectedType}`);
  return matches[0] ?? null;
}

function readDeclaredExternalArtifact(declaration, name, requireLength = false) {
  assert.match(declaration?.sha256 ?? "", SHA256, `${name}_declared_hash_invalid`);
  const artifact = readArtifactAt(resolve(declaration?.path ?? ""), name);
  assert.equal(artifact.sha256, declaration.sha256, `${name}_hash_mismatch`);
  if (requireLength || declaration.byteLength != null) assert.equal(artifact.byteLength, declaration.byteLength, `${name}_length_mismatch`);
  return artifact;
}

function readDeclaredOutputArtifact(outputRoot, declaration, name, requireLength = false) {
  assert.ok(declaration && typeof declaration.path === "string", `${name}_declaration_missing`);
  const artifact = readOutputArtifact(outputRoot, declaration.path, name);
  assert.equal(artifact.sha256, declaration.sha256, `${name}_hash_mismatch`);
  if (requireLength || declaration.byteLength != null) assert.equal(artifact.byteLength, declaration.byteLength, `${name}_length_mismatch`);
  return artifact;
}

function readOutputArtifact(outputRoot, path, name) {
  const resolvedPath = resolve(String(path ?? ""));
  assert.ok(isUnderRoot(outputRoot, resolvedPath), `${name}_outside_output_root:${resolvedPath}`);
  return readArtifactAt(resolvedPath, name);
}

function readArtifactAt(path, name) {
  assert.ok(existsSync(path), `${name}_missing:${path}`);
  assert.ok(statSync(path).isFile(), `${name}_not_file:${path}`);
  const bytes = readFileSync(path);
  return { path: resolve(path), bytes, sha256: sha256(bytes), byteLength: bytes.length };
}

function requireArtifactIdentity(declaration, artifact, name) {
  assert.equal(normalizedPath(declaration?.path), normalizedPath(artifact.path), `${name}_path_mismatch`);
  assert.equal(declaration?.sha256, artifact.sha256, `${name}_hash_mismatch`);
  if (declaration?.byteLength != null) assert.equal(declaration.byteLength, artifact.byteLength, `${name}_length_mismatch`);
}

function publicArtifact(artifact, value = undefined) {
  return { path: artifact.path, sha256: artifact.sha256, byteLength: artifact.byteLength, ...(value === undefined ? {} : { value }) };
}

function parseJson(bytes, error) {
  try {
    return JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error(error);
  }
}

function isUnderRoot(root, path) {
  const value = relative(resolve(root), resolve(path));
  return value === "" || (!value.startsWith("..") && !/^[/\\]/u.test(value));
}

function normalizedPath(path) {
  return resolve(String(path ?? "")).toLowerCase();
}

function requireEqual(actual, expected, error) {
  assert.ok(isDeepStrictEqual(actual, expected), error);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
