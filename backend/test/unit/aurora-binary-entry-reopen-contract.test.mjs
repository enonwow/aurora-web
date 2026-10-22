import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";
import { validateReopenPreparation, validateReopenArmState, readReopenStateOwner } from "../../scripts/lib/aurora-binary-entry-reopen-contract.mjs";

const sha = (char) => char.repeat(64);
const clone = (value) => structuredClone(value);
const path = (name) => resolve("reopen-test", name);
function reopenFixture() {
  const source = { version: "aurora-binary-entry-surface-source/v2", status: "native_entry_observation_missing",
    source: { manifest: { path: path("source.json"), sha256: sha("a"), bytes: 123 } },
    target: { module: { path: path("arbitrary.mod"), sha256: sha("b"), bytes: 200, resref: "arbitrary" },
      orderedHakList: [{ path: path("shared.hak"), sha256: sha("c"), bytes: 400, resref: "shared" }],
      area: "entry_area", entry: { position: [20, 20, 0], direction: [0, 1] }, git: { sha256: sha("d"), creatures: [] } },
    owner: { pid: 1234, startedAt: "2026-09-05T23:49:06.824Z", frameHwnd: 5678, livenessVerified: false } };
  const request = { version: "aurora-entry-reopen-request/v1", requestId: "143bbf3a-702f-42de-9098-99dc89e236ab",
    createdAt: "2026-09-06T12:00:00.000Z", expiresAt: "2026-09-06T12:30:00.000Z", source: clone(source),
    prepProfile: { path: path("reopen-prep.json"), sha256: sha("e"), bytes: 400 },
    binaryProfile: { path: path("reopen-binary.json"), sha256: sha("f"), bytes: 500 }, prepOutDir: path("live/prep") };
  const target = { moduleResref: "arbitrary", moduleName: "arbitrary.mod", installedModulePath: source.target.module.path, areaResref: "entry_area" };
  const profile = { ...request.prepProfile, id: "request-specific-prep" };
  const plan = { version: "aurora-model-proof-120s-prep-plan/v1", createdAtUtc: "2026-09-06T12:00:01.000Z", profile, target,
    decision: { route: "cold", processId: null, currentModule: null } };
  const result = { version: "aurora-model-proof-120s-prep-result/v1", command: "prepare", ok: true, status: "proof_ready",
    createdAtUtc: "2026-09-06T12:00:06.000Z", profile: clone(profile), prepOutDir: request.prepOutDir,
    target: clone(target), initialDecision: clone(plan.decision), finalDecision: { route: "adopt", processId: 2234, area: "entry_area", currentModule: "arbitrary.mod" }, processId: 2234,
    steps: ["cold-preflight", "cold-open"].map((name) => ({ name, resultPath: resolve(request.prepOutDir, `${name}.json`) })) };
  const before = { version: "aurora-model-proof-120s-prep-state/v1", capturedAtUtc: "2026-09-06T12:00:00.500Z", nwmain: [], toolsets: [] };
  const session = { pid: 2234, startedAtUtc: "2026-09-06T12:00:02.1234567Z", responding: true, frameCount: 1,
    frame: { hwnd: 7654, className: "TfrmFrame", title: "BioWare Aurora Toolset - arbitrary.mod", monitor: { deviceName: "\\\\.\\DISPLAY1", primary: false } },
    modals: [], areaViewers: [{ hwnd: 8765, title: " - entry_area", resref: "entry_area", canonicalViewportHwnd: 9876, canonicalViewportCount: 1,
      viewports: [{ hwnd: 9876, bounds: { left: -1400, top: 200, width: 795, height: 512 }, captureEligible: true }] }] };
  const ready = { version: before.version, capturedAtUtc: "2026-09-06T12:00:05.000Z", nwmain: [], toolsets: [session] };
  const fresh = { ...clone(ready), capturedAtUtc: "2026-09-06T12:00:07.000Z" };
  return { source, request, plan, result, before, ready, fresh, now: "2026-09-06T12:00:08.000Z" };
}

test("completed cold reopen admits exact full owner while preserving source history", () => {
  const input = reopenFixture(), before = clone(input);
  const result = validateReopenPreparation(input);
  assert.deepEqual(result.owner, { pid: 2234, startedAt: "2026-09-06T12:00:02.1234567Z", frameHwnd: 7654, viewerHwnd: 8765, viewportHwnd: 9876 });
  assert.deepEqual(result.target, input.source.target);
  assert.deepEqual(input, before);
  assert.equal(result.accessibleSurface, undefined);
});

test("rejects old or fabricated owner, including same-ms different StartTime", () => {
  for (const mutate of [
    (x) => { x.ready.toolsets[0].pid = x.source.owner.pid; x.ready.toolsets[0].startedAtUtc = x.source.owner.startedAt; },
    (x) => { x.fresh.toolsets[0].startedAtUtc = "2026-09-06T12:00:02.1234568Z"; },
    (x) => { x.fresh.toolsets[0].frame.hwnd += 1; },
    (x) => { x.result.processId += 1; },
    (x) => { x.ready.toolsets[0].startedAtUtc = "2026-09-06T11:59:59.9999999Z"; },
  ]) { const input = reopenFixture(); mutate(input); assert.throws(() => validateReopenPreparation(input), /REOPEN_/u); }
});

test("same PID can be reused only with a genuinely later full StartTime", () => {
  const input = reopenFixture();
  for (const state of [input.ready, input.fresh]) state.toolsets[0].pid = input.source.owner.pid;
  input.result.processId = input.source.owner.pid; input.result.finalDecision.processId = input.source.owner.pid;
  assert.equal(validateReopenPreparation(input).owner.pid, input.source.owner.pid);
});

test("rejects changed source MOD, ordered HAK, Area, entry or source identity", () => {
  for (const mutate of [
    (x) => { x.request.source.target.module.sha256 = sha("0"); },
    (x) => { x.request.source.target.orderedHakList[0].sha256 = sha("0"); },
    (x) => { x.request.source.target.area = "foreign"; },
    (x) => { x.request.source.target.entry.position[0] = 21; },
    (x) => { x.request.source.source.manifest.sha256 = sha("0"); },
    (x) => { x.result.target.installedModulePath = path("foreign.mod"); },
    (x) => { x.plan.target.areaResref = "foreign"; },
  ]) { const input = reopenFixture(); mutate(input); assert.throws(() => validateReopenPreparation(input), /REOPEN_/u); }
});

test("rejects old/foreign process presence, incomplete or another-session preparation", () => {
  for (const mutate of [
    (x) => { x.before.toolsets = [clone(x.ready.toolsets[0])]; },
    (x) => { x.before.nwmain = [{ pid: 9 }]; },
    (x) => { x.fresh.nwmain = [{ pid: 9 }]; },
    (x) => { x.fresh.toolsets.push(clone(x.fresh.toolsets[0])); },
    (x) => { x.result.status = "failed"; },
    (x) => { x.result.ok = false; },
    (x) => { x.plan.decision.route = "adopt"; },
    (x) => { x.result.initialDecision.route = "switch"; },
    (x) => { x.result.finalDecision.route = "load-area"; },
    (x) => { x.result.prepOutDir = path("another/prep"); },
    (x) => { x.result.profile.sha256 = sha("0"); },
    (x) => { x.plan.profile.path = path("another.json"); },
    (x) => { x.result.createdAtUtc = "2026-09-05T12:00:00Z"; },
    (x) => { x.request.expiresAt = "2026-09-06T12:01:00Z"; },
    (x) => { delete x.ready; },
  ]) { const input = reopenFixture(); mutate(input); assert.throws(() => validateReopenPreparation(input), /REOPEN_/u); }
});

test("rejects dirty, modal, wrong monitor, foreign/ambiguous Area and viewport", () => {
  for (const mutate of [
    (s) => { s.responding = false; }, (s) => { s.frame.title += "*"; },
    (s) => { s.modals = [{ hwnd: 1 }]; }, (s) => { s.frame.monitor.primary = true; },
    (s) => { s.frame.monitor.deviceName = "\\\\.\\DISPLAY2"; },
    (s) => { s.frame.title = "BioWare Aurora Toolset - other.mod"; },
    (s) => { s.areaViewers[0].resref = "other"; },
    (s) => { s.areaViewers.push(clone(s.areaViewers[0])); },
    (s) => { s.areaViewers[0].viewports.push(clone(s.areaViewers[0].viewports[0])); },
    (s) => { s.areaViewers[0].viewports[0].bounds.width = 20; },
  ]) { const input = reopenFixture(); mutate(input.fresh.toolsets[0]); assert.throws(() => validateReopenPreparation(input), /REOPEN_/u); }
});

test("ARM state must be current, exact owner at full precision, and zero NWN", () => {
  const input = reopenFixture(), admitted = validateReopenPreparation(input);
  const args = { ...admitted, state: input.fresh, notBefore: input.result.createdAtUtc, now: input.now };
  assert.deepEqual(validateReopenArmState(args).owner, admitted.owner);
  for (const mutate of [
    (x) => { x.now = "2026-09-06T12:00:38.001Z"; },
    (x) => { x.state.capturedAtUtc = "2026-09-06T12:00:09Z"; },
    (x) => { x.state.toolsets[0].startedAtUtc = "2026-09-06T12:00:02.1234568Z"; },
    (x) => { x.state.nwmain = [{ pid: 8 }]; },
  ]) { const changed = clone(args); mutate(changed); assert.throws(() => validateReopenArmState(changed), /REOPEN_/u); }
});

test("UTC ticks preserve sub-ms identity and reject invalid or ambiguous timestamps", () => {
  const input = reopenFixture();
  input.ready.toolsets[0].startedAtUtc = "2026-09-06T12:00:02.1234000Z";
  input.fresh.toolsets[0].startedAtUtc = "2026-09-06T12:00:02.1234Z";
  assert.equal(validateReopenPreparation(input).owner.startedAt, "2026-09-06T12:00:02.1234000Z");
  for (const value of [undefined, "2026-02-30T12:00:02Z", "2026-09-06T12:00:02.12345678Z", "2026-09-06T12:00:02+00:00", "2026-09-06T12:00:02", 0]) {
    const changed = reopenFixture(); changed.fresh.toolsets[0].startedAtUtc = value;
    assert.throws(() => validateReopenPreparation(changed), (error) => error.code === "REOPEN_TIME_INVALID");
  }
});

test("freshness is strictly less than 30 seconds and preparation timestamps are causal", () => {
  const input = reopenFixture(), admitted = validateReopenPreparation(input);
  const args = { ...admitted, state: input.fresh, notBefore: input.result.createdAtUtc, now: "2026-09-06T12:00:36.9999999Z" };
  assert.doesNotThrow(() => validateReopenArmState(args));
  args.now = "2026-09-06T12:00:37.0000000Z";
  assert.throws(() => validateReopenArmState(args), /REOPEN_ARM_STATE_NOT_FRESH/u);
  for (const mutate of [
    (x) => { x.before.capturedAtUtc = "2026-09-06T11:59:59Z"; },
    (x) => { x.plan.createdAtUtc = "2026-09-06T12:00:03Z"; },
    (x) => { x.ready.capturedAtUtc = "2026-09-06T12:00:07Z"; },
    (x) => { x.fresh.capturedAtUtc = "2026-09-06T12:00:09Z"; },
    (x) => { x.now = "2026-09-06T12:30:00.0000001Z"; },
  ]) { const changed = reopenFixture(); mutate(changed); assert.throws(() => validateReopenPreparation(changed), /REOPEN_/u); }
});

test("incomplete identities and false inspector declarations fail with coded errors", () => {
  for (const mutate of [
    (x) => { delete x.request.prepProfile; },
    (x) => { x.request.binaryProfile.bytes = 0; },
    (x) => { x.plan.profile.id = "another-request"; },
    (x) => { x.plan.profile.bytes = 1; },
    (x) => { x.fresh.version = "fixture-only"; },
    (x) => { x.fresh.toolsets[0].frameCount = 2; },
    (x) => { x.fresh.toolsets[0].areaViewers[0].canonicalViewportHwnd += 1; },
    (x) => { x.fresh.toolsets[0].areaViewers[0].viewports[0].bounds.left = NaN; },
    (x) => { x.fresh.toolsets[0].areaViewers[0].viewports[0].captureEligible = false; },
  ]) { const changed = reopenFixture(); mutate(changed); assert.throws(() => validateReopenPreparation(changed), (error) => error.code?.startsWith("REOPEN_")); }
});

test("completed step references must be cold-preflight, cold-open and optional load-area in this request directory", () => {
  const input = reopenFixture();
  input.result.steps.push({ name: "load-area", resultPath: resolve(input.request.prepOutDir, "load-area.json") });
  assert.doesNotThrow(() => validateReopenPreparation(input));
  for (const mutate of [
    (x) => { delete x.result.steps; },
    (x) => { x.result.steps.pop(); },
    (x) => { x.result.steps.reverse(); },
    (x) => { x.result.steps[0].name = "adopt"; },
    (x) => { x.result.steps[0].resultPath = path("other/prep/cold-preflight.json"); },
    (x) => { x.result.steps.push(clone(x.result.steps[1])); },
    (x) => { x.result.steps.push({ name: "native-paint", resultPath: resolve(x.request.prepOutDir, "native-paint.json") }); },
  ]) { const changed = reopenFixture(); mutate(changed); assert.throws(() => validateReopenPreparation(changed), /REOPEN_/u); }
});

// Exact inspector shape recorded in r8-reopen-01/state-admission.json at this
// timestamp. This historical fixture does not assert current native liveness.
function recordedRetailState() {
  return { version: "aurora-model-proof-120s-prep-state/v1", capturedAtUtc: "2026-09-06T09:45:13.5556179Z", nwmain: [],
    toolsets: [{ pid: 29632, startedAtUtc: "2026-09-06T09:45:00.8541894Z", responding: true, frameCount: 1,
      frame: { hwnd: 264758, className: "TfrmFrame", title: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - wyrok08a.mod",
        monitor: { deviceName: "\\\\.\\DISPLAY1", primary: false } }, modals: [],
      areaViewers: [{ hwnd: 658776, title: "- wyrok_stage", resref: "wyrok_stage", rawViewportCount: 2, canonicalViewportCount: 1, canonicalViewportHwnd: 658764,
        viewports: [
          { hwnd: 658764, bounds: { left: -1434, top: 289, width: 795, height: 512 }, captureEligible: true },
          { hwnd: 527664, bounds: { left: -1434, top: 801, width: 795, height: 40 }, captureEligible: false },
        ] }] }] };
}

test("recorded retail Toolset title resolves the exact module without inventing an application prefix", () => {
  const input = reopenFixture(), target = clone(input.source.target);
  target.module.resref = "wyrok08a"; target.area = "wyrok_stage";
  const state = recordedRetailState(), before = clone(state);
  assert.deepEqual(readReopenStateOwner({ state, target }), { pid: 29632, startedAt: "2026-09-06T09:45:00.8541894Z",
    frameHwnd: 264758, viewerHwnd: 658776, viewportHwnd: 658764 });
  assert.deepEqual(state, before);
  state.toolsets[0].frame.title = state.toolsets[0].frame.title.replace("wyrok08a.mod", "WYROK08A.MOD");
  assert.equal(readReopenStateOwner({ state, target }).pid, 29632);
});

test("retail title parsing rejects dirty, wrong MOD and similar module names", () => {
  const target = clone(reopenFixture().source.target); target.module.resref = "wyrok08a"; target.area = "wyrok_stage";
  for (const title of [
    "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - wyrok08a.mod*",
    "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - other.mod",
    "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - wyrok08a_extra.mod",
    "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - my_wyrok08a.mod",
    "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - wyrok08a.mod.bak",
    "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - wyrok08aXmod",
  ]) {
    const state = recordedRetailState(); state.toolsets[0].frame.title = title;
    assert.throws(() => readReopenStateOwner({ state, target }), /REOPEN_READY_MODULE_MISMATCH/u);
  }
});
