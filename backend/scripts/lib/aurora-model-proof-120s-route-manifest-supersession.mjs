import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const SHA256 = /^[a-f0-9]{64}$/u;
const MANIFEST_VERSION = "aurora-model-proof-120s-route-manifest/v1";
const SUPERSESSION_VERSION = "aurora-model-proof-120s-route-manifest-supersession/v1";
const SUPERSESSION_VERSION_V2 = "aurora-model-proof-120s-route-manifest-supersession/v2";
const COORDINATOR_LOCK_V1 = "model-proof-coordinator-excluding-route-manifest-load/v1";
const COORDINATOR_LOCK_V2 = "model-proof-coordinator-excluding-route-manifest-load-and-post-proof-cleanup/v2";

export function modelProofTimedCoordinatorDigest(source, mode = COORDINATOR_LOCK_V1) {
  if (mode !== COORDINATOR_LOCK_V1 && mode !== COORDINATOR_LOCK_V2) {
    fail("route_manifest_coordinator_semantic_lock_invalid");
  }
  const text = String(source ?? "");
  const withoutCompatibilityImport = text.replace(
    /^import \{ loadRouteManifestWithSupersession \} from "\.\/lib\/aurora-model-proof-120s-route-manifest-supersession\.mjs";\r?\n/mu,
    "",
  ).replace(
    /^\s*routeManifestSupersession: resolve\(SCRIPT_DIR, "lib", "aurora-model-proof-120s-route-manifest-supersession\.mjs"\),\r?\n/mu,
    "",
  ).replace(
    /^\s*verifiedTemp0RecoveryClientClick: resolve\(SCRIPT_DIR, "post-aurora-toolset-verified-temp0-recovery-client-click-no-global-input\.mjs"\),\r?\n/mu,
    "",
  ).replace(
    /^\s*preparationWelcomeDismiss: resolve\(SCRIPT_DIR, "close-aurora-toolset-dialog-no-global-input\.mjs"\),\r?\n/mu,
    "",
  );
  const withoutCompatibilityEvidence = withoutCompatibilityImport
    .replace(
      /    routeManifest: \{\r?\n      path: ctx\.routeManifestPath,\r?\n      profileExpectedSha256: ctx\.profile\.routeManifest\.sha256,\r?\n      resolvedSha256: ctx\.routeManifestSha256,\r?\n      version: ctx\.routeManifest\.version,\r?\n      supersession: ctx\.routeManifestSupersession,\r?\n    \},\r?\n    contractChecks,/u,
      "    routeManifest: { path: ctx.routeManifestPath, sha256: ctx.profile.routeManifest.sha256, version: ctx.routeManifest.version },\n    contractChecks,",
    )
    .replace(
      /      manifest: \{\r?\n        path: ctx\.routeManifestPath,\r?\n        profileExpectedSha256: ctx\.profile\.routeManifest\.sha256,\r?\n        resolvedSha256: ctx\.routeManifestSha256,\r?\n        version: ctx\.routeManifest\.version,\r?\n        supersession: ctx\.routeManifestSupersession,\r?\n      \},\r?\n      ready:/u,
      "      manifest: { path: ctx.routeManifestPath, sha256: ctx.profile.routeManifest.sha256, version: ctx.routeManifest.version },\n      ready:",
    );
  let timedSurface = withoutCompatibilityEvidence;
  if (mode === COORDINATOR_LOCK_V2) {
    timedSurface = timedSurface
      .replace(/^\s*validateAcceptedRuntimeNwmainCleanupAdmission,\r?\n/mu, "")
      .replace(/^\s*validateFailedLaneRecoveryAdmission,\r?\n/mu, "")
      .replace(/^\s*validateFailedLaneReadyCandidateBinding,\r?\n/mu, "")
      .replace(/^\s*validatePostRuntimeHiddenToolsetCleanupAdmission,\r?\n/mu, "")
      .replace(/^\s*validateToolsetOnlyVisibleReadyCleanupAdmission,\r?\n/mu, "")
      .replace(/^\s*case "cleanup-dry-run":.*\r?\n/mu, "")
      .replace(/^\s*case "recover-failed-lane-dry-run":.*\r?\n/mu, "")
      .replace(/^\s*case "recover-failed-lane":.*\r?\n/mu, "")
      .replace(/, "cleanup-dry-run"/gu, "")
      .replace(/, "recover-failed-lane-dry-run", "recover-failed-lane"/gu, "")
      .replace(/, recover-failed-lane-dry-run, recover-failed-lane/gu, "")
      .replace(
        /function cleanupProofProcessesDryRun\(ctx\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction waitForRuntime/u,
        "/* POST_PROOF_CLEANUP_COMMANDS */\n\nfunction waitForRuntime",
      )
      .replace(
        /function probePostRuntimeCleanupHostState\(readySession\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction probeProofReadySession/u,
        "/* POST_PROOF_CLEANUP_HOST_PROBE */\n\nfunction probeProofReadySession",
      );
    if (
      !timedSurface.includes("/* POST_PROOF_CLEANUP_COMMANDS */")
      || !timedSurface.includes("/* POST_PROOF_CLEANUP_HOST_PROBE */")
    ) {
      fail("route_manifest_coordinator_cleanup_normalization_failed");
    }
  }
  const marker = "/* ROUTE_MANIFEST_LOAD_CONTEXT */\n\nfunction verifyImmutableInputs";
  const normalized = timedSurface.replace(
    /function loadContext\(path\) \{[\s\S]*?\r?\n\}\r?\n\r?\nfunction verifyImmutableInputs/u,
    marker,
  );
  if (normalized === timedSurface || !normalized.includes(marker)) {
    fail("route_manifest_coordinator_normalization_failed");
  }
  return sha256Bytes(Buffer.from(normalized, "utf8"));
}

export function loadRouteManifestWithSupersession({ manifestPath, expectedSha256 }) {
  const currentIdentity = readExactJsonIdentity(manifestPath, "route_manifest_current");
  requireManifest(currentIdentity.value, "route_manifest_current_schema_invalid");
  requireCurrentRouteFiles(currentIdentity.value.routes);
  if (currentIdentity.sha256 === expectedSha256) {
    return {
      manifest: currentIdentity.value,
      manifestPath: currentIdentity.path,
      manifestSha256: currentIdentity.sha256,
      admission: null,
    };
  }
  if (!SHA256.test(String(expectedSha256 ?? ""))) fail("route_manifest_expected_hash_invalid");
  const policy = currentIdentity.value.supersession;
  if (policy?.version === SUPERSESSION_VERSION_V2) {
    return loadV2Supersession({
      currentIdentity,
      expectedSha256,
      policy,
    });
  }
  if (policy?.version !== SUPERSESSION_VERSION) fail("route_manifest_hash_mismatch");
  const historical = readDeclaredManifest(policy.from, "route_manifest_supersession_from");
  const intermediate = readDeclaredManifest(policy.intermediate, "route_manifest_supersession_intermediate");
  if (historical.sha256 !== expectedSha256) fail("route_manifest_supersession_from_hash_mismatch");

  const cleanupChanged = exactPathSet(policy.cleanupChangedRoutes, "route_manifest_supersession_cleanup_set_invalid");
  const compatibilityChanged = exactPathSet(policy.compatibilityChangedRoutes, "route_manifest_supersession_compatibility_set_invalid");
  const compatibilityAdded = exactPathSet(policy.compatibilityAddedRoutes, "route_manifest_supersession_added_set_invalid");
  requireExactDelta({
    before: historical.value.routes,
    after: intermediate.value.routes,
    expectedChanged: cleanupChanged,
    expectedAdded: new Set(),
    prefix: "route_manifest_supersession_cleanup",
  });
  requireExactDelta({
    before: intermediate.value.routes,
    after: currentIdentity.value.routes,
    expectedChanged: compatibilityChanged,
    expectedAdded: compatibilityAdded,
    prefix: "route_manifest_supersession",
  });

  const semanticLock = policy.coordinatorSemanticLock;
  if (
    semanticLock?.mode !== COORDINATOR_LOCK_V1
    || !SHA256.test(String(semanticLock?.sha256 ?? ""))
  ) {
    fail("route_manifest_coordinator_semantic_lock_invalid");
  }
  const coordinatorPath = resolve(String(semanticLock.routePath ?? ""));
  const coordinatorRoute = currentIdentity.value.routes.find((route) => samePath(route.path, coordinatorPath));
  if (!coordinatorRoute) fail("route_manifest_coordinator_route_missing");
  const actualTimedDigest = modelProofTimedCoordinatorDigest(readFileSync(coordinatorPath, "utf8"), semanticLock.mode);
  if (actualTimedDigest !== semanticLock.sha256) fail("route_manifest_coordinator_semantic_drift");

  return {
    manifest: currentIdentity.value,
    manifestPath: currentIdentity.path,
    manifestSha256: currentIdentity.sha256,
    admission: {
      version: "aurora-model-proof-120s-route-manifest-supersession-admission/v1",
      from: publicIdentity(historical),
      intermediate: publicIdentity(intermediate),
      to: publicIdentity(currentIdentity),
      cleanupChangedRoutes: [...cleanupChanged],
      compatibilityChangedRoutes: [...compatibilityChanged],
      compatibilityAddedRoutes: [...compatibilityAdded],
      coordinatorSemanticLock: {
        routePath: coordinatorPath,
        mode: semanticLock.mode,
        sha256: actualTimedDigest,
      },
      timedSemanticsUnchanged: true,
    },
  };
}

function loadV2Supersession({ currentIdentity, expectedSha256, policy }) {
  const historical = readDeclaredManifest(policy.from, "route_manifest_supersession_from");
  if (!Array.isArray(policy.transitions) || policy.transitions.length === 0) {
    fail("route_manifest_supersession_transitions_invalid");
  }

  const chain = [historical];
  let before = historical;
  for (const [index, transition] of policy.transitions.entries()) {
    const prefix = `route_manifest_supersession_transition_${index}`;
    const final = index === policy.transitions.length - 1;
    const usesCurrent = transition?.toCurrent === true;
    if (usesCurrent !== final || (usesCurrent && transition.to) || (!usesCurrent && !transition?.to)) {
      fail(`${prefix}_target_invalid`);
    }
    const after = usesCurrent
      ? currentIdentity
      : readDeclaredManifest(transition.to, `${prefix}_to`);
    chain.push(after);
    before = after;
  }
  if (
    before.path !== currentIdentity.path
    || before.sha256 !== currentIdentity.sha256
    || before.byteLength !== currentIdentity.byteLength
  ) {
    fail("route_manifest_supersession_final_identity_mismatch");
  }

  const matchingStarts = chain
    .slice(0, -1)
    .map((identity, index) => ({ identity, index }))
    .filter(({ identity }) => identity.sha256 === expectedSha256);
  if (matchingStarts.length === 0) fail("route_manifest_supersession_expected_hash_not_in_chain");
  if (matchingStarts.length !== 1) fail("route_manifest_supersession_expected_hash_ambiguous");
  const startIndex = matchingStarts[0].index;

  const transitions = [];
  before = chain[startIndex];
  for (let index = startIndex; index < policy.transitions.length; index += 1) {
    const transition = policy.transitions[index];
    const prefix = `route_manifest_supersession_transition_${index}`;
    const after = chain[index + 1];
    const changed = exactPathSet(transition.changedRoutes, `${prefix}_changed_set_invalid`);
    const added = exactPathSet(transition.addedRoutes, `${prefix}_added_set_invalid`);
    requireExactDelta({
      before: before.value.routes,
      after: after.value.routes,
      expectedChanged: changed,
      expectedAdded: added,
      prefix,
    });
    transitions.push({
      from: publicIdentity(before),
      to: publicIdentity(after),
      changedRoutes: [...changed],
      addedRoutes: [...added],
    });
    before = after;
  }

  const coordinatorSemanticLock = requireCoordinatorSemanticLock(policy, currentIdentity);
  return {
    manifest: currentIdentity.value,
    manifestPath: currentIdentity.path,
    manifestSha256: currentIdentity.sha256,
    admission: {
      version: "aurora-model-proof-120s-route-manifest-supersession-admission/v2",
      from: publicIdentity(chain[startIndex]),
      transitions,
      to: publicIdentity(currentIdentity),
      coordinatorSemanticLock,
      timedSemanticsUnchanged: true,
    },
  };
}

function requireCoordinatorSemanticLock(policy, currentIdentity) {
  const semanticLock = policy.coordinatorSemanticLock;
  if (
    !new Set([COORDINATOR_LOCK_V1, COORDINATOR_LOCK_V2]).has(semanticLock?.mode)
    || !SHA256.test(String(semanticLock?.sha256 ?? ""))
  ) {
    fail("route_manifest_coordinator_semantic_lock_invalid");
  }
  const coordinatorPath = resolve(String(semanticLock.routePath ?? ""));
  const coordinatorRoute = currentIdentity.value.routes.find((route) => samePath(route.path, coordinatorPath));
  if (!coordinatorRoute) fail("route_manifest_coordinator_route_missing");
  const actualTimedDigest = modelProofTimedCoordinatorDigest(readFileSync(coordinatorPath, "utf8"), semanticLock.mode);
  if (actualTimedDigest !== semanticLock.sha256) fail("route_manifest_coordinator_semantic_drift");
  return {
    routePath: coordinatorPath,
    mode: semanticLock.mode,
    sha256: actualTimedDigest,
  };
}

function requireExactDelta({ before, after, expectedChanged, expectedAdded, prefix }) {
  const left = routeMap(before, `${prefix}_before`);
  const right = routeMap(after, `${prefix}_after`);
  const removed = [...left.keys()].filter((path) => !right.has(path));
  if (removed.length !== 0) fail(`${prefix}_removed_route`, removed.join(","));
  const added = new Set([...right.keys()].filter((path) => !left.has(path)));
  const changed = new Set(
    [...left.keys()].filter((path) => right.has(path) && !sameRouteIdentity(left.get(path), right.get(path))),
  );
  if (!sameSet(added, expectedAdded)) fail(`${prefix}_added_set_mismatch`, JSON.stringify({ actual: [...added], expected: [...expectedAdded] }));
  if (!sameSet(changed, expectedChanged)) fail(`${prefix}_changed_set_mismatch`, JSON.stringify({ actual: [...changed], expected: [...expectedChanged] }));
}

function requireCurrentRouteFiles(routes) {
  const declared = routeMap(routes, "route_manifest_current");
  for (const route of declared.values()) {
    const full = resolve(route.path);
    if (!existsSync(full)) fail("route_manifest_current_route_missing", full);
    const entry = lstatSync(full);
    if (entry.isSymbolicLink() || !entry.isFile()) fail("route_manifest_current_route_not_file", full);
    if (statSync(full).size !== route.byteLength || sha256File(full) !== route.sha256) {
      fail("route_manifest_current_route_identity_drift", full);
    }
  }
}

function readDeclaredManifest(declaration, prefix) {
  requireIdentityDeclaration(declaration, prefix);
  const result = readExactJsonIdentity(declaration.path, prefix);
  if (result.sha256 !== declaration.sha256 || result.byteLength !== declaration.byteLength) {
    fail(`${prefix}_identity_mismatch`);
  }
  requireManifest(result.value, `${prefix}_schema_invalid`);
  return result;
}

function readExactJsonIdentity(path, prefix) {
  const full = resolve(String(path ?? ""));
  if (!existsSync(full)) fail(`${prefix}_missing`, full);
  const entry = lstatSync(full);
  if (entry.isSymbolicLink() || !entry.isFile()) fail(`${prefix}_not_file`, full);
  const bytes = readFileSync(full);
  let value;
  try {
    value = JSON.parse(bytes.toString("utf8"));
  } catch {
    fail(`${prefix}_json_invalid`, full);
  }
  return {
    path: full,
    sha256: sha256Bytes(bytes),
    byteLength: bytes.length,
    value,
  };
}

function requireManifest(value, code) {
  if (value?.version !== MANIFEST_VERSION || !Array.isArray(value.routes)) fail(code);
  routeMap(value.routes, code);
}

function routeMap(routes, prefix) {
  const result = new Map();
  for (const [index, route] of routes.entries()) {
    requireIdentityDeclaration(route, `${prefix}:${index}`);
    const key = normalizedPath(route.path);
    if (result.has(key)) fail(`${prefix}_duplicate_route`, route.path);
    result.set(key, { path: resolve(route.path), sha256: route.sha256, byteLength: route.byteLength });
  }
  return result;
}

function exactPathSet(values, code) {
  if (!Array.isArray(values)) fail(code);
  const normalized = values.map((value) => normalizedPath(value));
  if (new Set(normalized).size !== normalized.length) fail(code);
  return new Set(normalized);
}

function requireIdentityDeclaration(value, prefix) {
  if (
    typeof value?.path !== "string"
    || !value.path
    || !SHA256.test(String(value.sha256 ?? ""))
    || !Number.isInteger(value.byteLength)
    || value.byteLength <= 0
  ) {
    fail(`${prefix}_identity_invalid`);
  }
}

function sameRouteIdentity(left, right) {
  return left.sha256 === right.sha256 && left.byteLength === right.byteLength;
}

function sameSet(left, right) {
  return left.size === right.size && [...left].every((value) => right.has(value));
}

function normalizedPath(value) {
  return resolve(String(value ?? "")).toLowerCase();
}

function samePath(left, right) {
  return normalizedPath(left) === normalizedPath(right);
}

function publicIdentity(value) {
  return { path: value.path, sha256: value.sha256, byteLength: value.byteLength };
}

function sha256File(path) {
  return sha256Bytes(readFileSync(path));
}

function sha256Bytes(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
