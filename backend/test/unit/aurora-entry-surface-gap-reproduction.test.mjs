import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test as nodeTest } from "node:test";
import vm from "node:vm";

// Deliberate pre-fix reproduction, NOT feature qualification. Do not import the
// executable runners: their top-level/error paths can probe native processes.
// Only named function bodies execute, against memory-only read/write ports.
const binarySource = readFileSync(new URL("../../scripts/aurora-toolset-binary-module-native-geometry.mjs", import.meta.url), "utf8");
const verticalSource = readFileSync(new URL("../../scripts/aurora-toolset-vertical-slice.mjs", import.meta.url), "utf8");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const clone = (value) => structuredClone(value);
const moduleA = "a".repeat(64);
const moduleB = "b".repeat(64);
const area = "example_area";
const entryA = { moduleSha256: moduleA, area, position: [20, 20, 0], direction: [0, 1] };
const outputDir = resolve("isolated-memory-only");
const originalSources = sha(binarySource) === "83b79479dc78fabe21534b9f7ad537de34ed3cd2755cbf78e80c5d97dd35be7b"
  && sha(verticalSource) === "21719345f41a0a261c6746b6178d8844843e2cc1dad325d2c39da54b74457130";
const test = (name, fn) => nodeTest(`HISTORICAL ${name}`, {
  skip: originalSources ? false : "Pre-fix sources changed; current acceptance is covered by rejection/workflow tests.",
}, fn);

console.log(JSON.stringify({
  kind: "pre_fix_negative_reproduction_sources",
  binarySha256: sha(binarySource), verticalSliceSha256: sha(verticalSource),
  executesRunnerTopLevel: false, nativeCapabilitiesProvided: false,
}));

function extract(source, name, ports) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `named source function exists: ${name}`);
  const end = source.indexOf("\nfunction ", start + marker.length);
  assert.notEqual(end, -1, `bounded next-function delimiter exists: ${name}`);
  const body = source.slice(start, end).trim();
  // These extracted functions delegate only to the supplied memory-only ports.
  assert.doesNotMatch(body, /\b(?:execFileSync|spawn|toolsetProcessesSafe|visibleWindowsSafe|process)\b/u);
  return vm.runInNewContext(`(${body})`, { ...ports }, { timeout: 1000 });
}

function fail(code, message) { throw new Error(`${code}: ${message}`); }

function barePositive(entry = entryA) {
  return {
    version: "aurora-entry-surface-observation/v1",
    status: "validated_user_owned_observation",
    moduleSha256: entry.moduleSha256,
    area: entry.area,
    entry: clone(entry.position),
    safety: { projectSuppliedAccessibilityBoolean: false },
  };
}

function ingestHarness({ requestTarget = entryA, currentTarget = entryA } = {}) {
  const arbitraryText = Buffer.from("This is not a PNG, a native capture, or a human observation.");
  const textPath = resolve(outputDir, "not-an-image.txt");
  const request = {
    version: "aurora-entry-surface-user-observation-request/v1",
    requestId: "armed-request-a",
    declarationId: "fixture-a",
    declarationSha256: "c".repeat(64),
    moduleSha256: requestTarget.moduleSha256,
    area: requestTarget.area,
    entry: clone(requestTarget.position),
  };
  const handoff = {
    version: "aurora-entry-surface-user-observation-handoff/v1",
    requestId: request.requestId,
    declarationId: "fixture-a",
    moduleSha256: currentTarget.moduleSha256,
    area: currentTarget.area,
    entry: clone(currentTarget.position),
    capture: { path: textPath, sha256: sha(arbitraryText) },
    observationKind: "user_observed_native_toolset_paint_start_location",
  };
  const writes = new Map();
  const prints = [];
  const ingest = extract(verticalSource, "bootstrapEntrySurfaceIngest", {
    resolve,
    validateDeclaration: () => undefined,
    readJson: (path) => {
      assert.equal(path, resolve(outputDir, "entry-surface-user-observation-request.json"));
      return clone(request);
    },
    readNativeEntryReadback: () => clone(currentTarget),
    existsSync: (path) => path === textPath,
    fileIdentity: (path) => {
      assert.equal(resolve(path), textPath);
      return { sha256: sha(arbitraryText), bytes: arbitraryText.length };
    },
    writeJson: (path, value) => writes.set(path, clone(value)),
    print: (value) => prints.push(clone(value)),
  });
  return {
    request, handoff, writes, prints,
    run: () => {
      ingest({ id: "fixture-a" }, outputDir, handoff);
      return writes.get(resolve(outputDir, "entry-surface-observation.json"));
    },
  };
}

test("CURRENT GAP: binary validator accepts a positive v1 observation with no request, capture or human receipt", () => {
  const validate = extract(binarySource, "validateEntryObservation", { fail });
  const observation = barePositive();
  assert.equal(observation.capture, undefined);
  assert.equal(observation.requestId, undefined);
  assert.doesNotThrow(() => validate(observation, clone(entryA), moduleA));
});

test("CONTROL: binary validator still rejects wrong MOD, Area, and saved entry tuple", () => {
  const validate = extract(binarySource, "validateEntryObservation", { fail });
  for (const patch of [{ moduleSha256: moduleB }, { area: "other_area" }, { entry: [21, 20, 0] }]) {
    assert.throws(() => validate({ ...barePositive(), ...patch }, clone(entryA), moduleA), /BINARY_NATIVE_ENTRY_SURFACE_OBSERVATION_INVALID/u);
  }
});

test("CURRENT GAP: ingest accepts hash-matching text bytes as a native Toolset capture", () => {
  const harness = ingestHarness();
  const observation = harness.run();
  assert.equal(observation.status, "validated_user_owned_observation");
  assert.match(observation.capture.path, /not-an-image\.txt$/u);
  assert.equal(observation.capture.sidecar, undefined);
});

test("CURRENT GAP: ingest accepts a new MOD, Area, and entry after arm when only nonce is reused", () => {
  const currentTarget = { moduleSha256: moduleB, area: "changed_area", position: [6, 8, 1], direction: [1, 0] };
  const harness = ingestHarness({ currentTarget });
  const observation = harness.run();
  assert.equal(harness.request.moduleSha256, moduleA);
  assert.equal(observation.status, "validated_user_owned_observation");
  assert.equal(observation.moduleSha256, moduleB);
  assert.equal(observation.area, currentTarget.area);
  assert.deepEqual(observation.entry, currentTarget.position);
});

test("CURRENT GAP: supplied stale, foreign, failed capture provenance is ignored", () => {
  const harness = ingestHarness();
  harness.handoff.capture.sidecar = {
    status: "failed", capturedAt: "2000-01-01T00:00:00.000Z",
    moduleSha256: moduleB, area: "foreign_area", requestId: "another-request",
    owner: { pid: 1, startTime: "2000-01-01T00:00:00.000Z", hwnd: 123 },
    safety: { moduleScreenPrimary: true, usesGlobalMouse: true },
  };
  assert.equal(harness.run().status, "validated_user_owned_observation");
});

test("CONTROL: ingest rejects a nonce mismatch and capture hash mismatch", () => {
  const harness = ingestHarness();
  harness.handoff.requestId = "wrong-request";
  harness.handoff.capture.sha256 = "f".repeat(64);
  const result = harness.run();
  assert.equal(result.status, "failed");
  assert.ok(result.failures.includes("entry_handoff_request_mismatch"));
  assert.ok(result.failures.includes("entry_handoff_capture_invalid"));
});

test("CURRENT GAP: binary geometry validation accepts forged booleans without module or evidence bytes", () => {
  const forged = {
    version: "aurora-toolset-binary-native-geometry-profile/v1",
    module: { sha256: "not-even-a-sha256" }, area: { displayName: "Invented Area" },
    nativeSave: { areaWasSaved: true, invalidLocationsDialog: false, inaccessibleObjectsDialog: false, statusText: "Area was saved" },
    entryPoint: { accessibleSurface: true },
    fixtures: [{ accessibleSurface: true, nativeSaveAccepted: true, savedGitReadback: true }],
  };
  const validate = extract(binarySource, "validateGeometry", {
    readJson: () => clone(forged), resolve, fail,
    text: (value) => typeof value === "string" && value.trim().length > 0,
  });
  assert.equal(validate(resolve(outputDir, "forged.json")).status, "binary_native_geometry_profile_valid");
});

test("CURRENT GAP: the existing arm cannot consume a binary-only pending manifest", () => {
  const binaryPath = resolve(outputDir, "binary-native-geometry-manifest.json");
  const files = new Map([[binaryPath, { status: "geometry_saved_pending_entry_observation", nativeEntryReadback: clone(entryA) }]]);
  let readbackCalls = 0;
  const arm = extract(verticalSource, "bootstrapEntrySurfaceArm", {
    resolve,
    validateDeclaration: () => undefined,
    readJson: (path) => {
      if (!files.has(path)) throw new Error(`isolated_missing_file:${path}`);
      return clone(files.get(path));
    },
    readNativeEntryReadback: () => { readbackCalls += 1; return clone(entryA); },
  });
  assert.throws(() => arm({ id: "binary-fixture" }, outputDir), /isolated_missing_file:.*bootstrap-manifest\.json/u);
  assert.equal(readbackCalls, 0);
  assert.equal(files.size, 1);
});
