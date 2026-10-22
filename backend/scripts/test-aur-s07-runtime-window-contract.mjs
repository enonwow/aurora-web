#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createEntrySurfaceAcceptanceFixture } from '../test/unit/entry-surface-acceptance-fixture.mjs';

const scriptPath = fileURLToPath(new URL('./aur-s07-runtime-execution.mjs', import.meta.url));
const source = readFileSync(scriptPath, 'utf8');
assert.ok(source.includes('case "prepare-runtime-window-dry-run"'), 'AUR-S07 lacks public read-only runtime-window admission');
assert.ok(source.includes('case "prepare-runtime-window"'), 'AUR-S07 lacks the profile-bound owned placement step');
const { prepareRuntimeWindow, validateRuntimeWindowPolicy } = await import('./lib/aur-s07-runtime-window-contract.mjs');
const clone = value => structuredClone(value);
const device = '\\\\.\\DISPLAY1';
const sha = 'a'.repeat(64);
const bounds = { left: -1920, top: 0, right: 0, bottom: 1032, width: 1920, height: 1032 };
const profile = {
  id: 'arbitrary-fixture', module: { path: 'C:\\proof\\modules\\example.mod', sha256: sha, area: 'example_area', entryPoint: [1, 2, 0] },
  launch: { mode: 'central_guarded_test_module_action', processName: 'nwmain' },
  runtimeWindow: { version: 'aur-s07-runtime-window-policy/v1', expectedDevice: device, primary: false, placement: 'working-area' },
};
const target = { profileId: profile.id, profileSha256: sha, modulePath: profile.module.path, moduleSha256: sha, area: profile.module.area, entryPoint: [1, 2, 0] };
const nwn = { pid: 200, name: 'nwmain', startedAt: '2026-09-06T10:00:01.1234567Z', responding: true, mainWindowHandle: 300, parentPid: 100, commandLine: '-userdirectory "C:\\proof" +TestNewModule "example"' };
const evidence = {
  request: { ...target, version: 'aur-s07-runtime-launch-request/v1', requestId: 'request', createdAt: '2026-09-06T10:00:00.000Z', action: profile.launch.mode },
  dispatch: { ...target, version: 'aur-s07-runtime-test-module-dispatch/v1', requestId: 'request', dispatchedAt: '2026-09-06T10:00:02.000Z', atom: { ok: true, status: 'posted', processId: 100, frameHwnd: 400, module: 'example.mod', requestsNwnStart: true, usesGlobalInput: false } },
  handoff: { ...target, version: 'aur-s07-runtime-handoff/v1', requestId: 'request', createdAt: '2026-09-06T10:00:02.000Z', dispatchPath: 'C:\\run\\aur-s07-runtime-test-module-dispatch.json' },
  observation: { ...target, version: 'aur-s07-runtime-observation/v1', observedAt: '2026-09-06T10:00:03.000Z', process: clone(nwn), handoffPath: 'C:\\run\\aur-s07-runtime-handoff.json' },
  bindings: { request: { path: 'request', sha256: sha }, dispatch: { path: 'C:\\run\\aur-s07-runtime-test-module-dispatch.json', sha256: sha }, handoff: { path: 'C:\\run\\aur-s07-runtime-handoff.json', sha256: sha }, observation: { path: 'observation', sha256: sha } },
};
const state = {
  capturedAtUtc: '2026-09-06T10:00:04.000Z', processes: [clone(nwn)],
  parents: [{ pid: 100, name: 'nwtoolset', startedAt: '2026-09-06T09:59:00.0000000Z', responding: true }],
  window: { hwnd: 300, ownerPid: 200, visible: true, iconic: false, bounds: { left: -8, top: -8, right: 1912, bottom: 1024, width: 1920, height: 1032 } },
  visibleWindows: [{ hwnd: 300, ownerPid: 200 }],
  screens: [{ deviceName: device, primary: false, bounds: { ...bounds, bottom: 1080, height: 1080 }, workingArea: bounds }],
};
function harness(change = () => {}) {
  const local = { profile: clone(profile), evidence: clone(evidence), state: clone(state), files: new Map(), calls: [], reads: 0 };
  change(local);
  const deps = {
    loadEvidence: () => clone(local.evidence), exists: path => local.files.has(path),
    readState: () => { local.reads++; return clone(local.state); },
    writeExclusive: (path, value) => { assert.ok(!local.files.has(path)); local.files.set(path, clone(value)); local.calls.push('write:' + value.status); },
    now: () => '2026-09-06T10:00:05.000Z',
    prepare: expected => {
      assert.ok([...local.files.values()].some(value => value.status === 'intent-recorded'), 'intent must be durable before mutation');
      local.calls.push('prepare');
      assert.equal(expected.expectedDevice, device);
      assert.equal(expected.expectedHwnd, 300);
      const before = clone(local.state.window.bounds);
      local.state.window.bounds = clone(bounds);
      return { ok: true, status: 'verified', process: { name: 'nwmain', pid: 200, startedAtUtc: nwn.startedAt, responding: true }, window: { hwnd: 300, ownerPid: 200, before, after: clone(bounds) }, monitor: { deviceName: device, primary: false, workingArea: clone(bounds) }, safety: { usesGlobalCursor: false, usesGlobalMouse: false, usesGlobalKeyboard: false, changesZOrder: false, activatesWindow: false, setWindowPosFlags: ['SWP_NOZORDER', 'SWP_NOACTIVATE'] } };
    },
  };
  const run = dryRun => prepareRuntimeWindow({ profile: local.profile, profileSha256: sha, outputDirectory: 'C:\\run', dryRun }, deps);
  return { local, deps, run };
}

let cases = 0;
const check = (name, fn) => { fn(); cases++; };
check('dry-run admits fresh child starting before dispatch receipt, writes/moves nothing', () => {
  const h = harness(); const result = h.run(true); assert.equal(result.status, 'admitted'); assert.equal(h.local.files.size, 0); assert.deepEqual(h.local.calls, []);
});
check('one owned placement with immutable before/after', () => {
  const h = harness(); const result = h.run(false); assert.equal(result.status, 'verified'); assert.deepEqual(h.local.calls, ['write:intent-recorded', 'prepare', 'write:verified']); assert.equal(h.local.reads, 3);
  assert.throws(() => h.run(false), /already_attempted/); assert.throws(() => h.run(true), /already_attempted/);
});
const negatives = [
  ['missing policy', h => { delete h.profile.runtimeWindow; }],
  ['primary policy', h => { h.profile.runtimeWindow.primary = true; }],
  ['extra policy key', h => { h.profile.runtimeWindow.retry = true; }],
  ['user-owned launch', h => { h.profile.launch.mode = 'user_owned_test_module_action'; }],
  ['wrong request', h => { h.evidence.request.profileSha256 = 'b'.repeat(64); }],
  ['wrong dispatch request', h => { h.evidence.dispatch.requestId = 'other'; }],
  ['wrong handoff path', h => { h.evidence.handoff.dispatchPath = 'C:\\other.json'; }],
  ['wrong observed module', h => { h.evidence.observation.moduleSha256 = 'b'.repeat(64); }],
  ['stale child', h => { h.state.processes[0].startedAt = '2026-09-06T09:59:59.0000000Z'; }],
  ['different PID', h => { h.state.processes[0].pid = 201; }],
  ['submillisecond StartTime change', h => { h.state.processes[0].startedAt = '2026-09-06T10:00:01.1234568Z'; }],
  ['different parent', h => { h.state.processes[0].parentPid = 999; }],
  ['reused parent PID', h => { h.state.parents[0].startedAt = '2026-09-06T10:00:00.100Z'; }],
  ['wrong parent name', h => { h.state.parents[0].name = 'unrelated'; }],
  ['second NWN', h => { h.state.processes.push(clone(nwn)); }],
  ['second Toolset', h => { h.state.parents.push(clone(h.state.parents[0])); }],
  ['wrong module commandline', h => { h.state.processes[0].commandLine = '-userdirectory "C:\\proof" +TestNewModule "another"'; }],
  ['wrong userdirectory', h => { h.state.processes[0].commandLine = '-userdirectory "C:\\another" +TestNewModule "example"'; }],
  ['duplicate TestNewModule', h => { h.state.processes[0].commandLine += ' +TestNewModule "example"'; }],
  ['glued switches and arguments', h => { h.state.processes[0].commandLine = '-userdirectory"C:\\proof"+TestNewModule"example"'; }],
  ['window identity change', h => { h.state.window.hwnd = 301; }],
  ['foreign owner', h => { h.state.window.ownerPid = 201; }],
  ['hidden main window', h => { h.state.window.visible = false; }],
  ['extra visible window/modal', h => { h.state.visibleWindows.push({ hwnd: 301, ownerPid: 200 }); }],
  ['wrong monitor', h => { h.state.screens[0].deviceName = '\\\\.\\DISPLAY9'; }],
  ['primary target', h => { h.state.screens[0].primary = true; }],
];
for (const [name, mutate] of negatives) check(name, () => { const h = harness(mutate); assert.throws(() => h.run(false), /runtime_window_/); assert.equal(h.local.files.size, 0); assert.ok(!h.local.calls.includes('prepare')); });
check('drift after durable intent is preserved and never moved/retried', () => {
  const h = harness(); const read = h.deps.readState; h.deps.readState = () => { const value = read(); if (h.local.reads === 2) value.window.hwnd++; return value; };
  assert.throws(() => h.run(false), /runtime_window_/); assert.deepEqual(h.local.calls, ['write:intent-recorded', 'write:failed']); assert.throws(() => h.run(false), /already_attempted/);
});
check('unexpected after-bounds fail with durable evidence', () => {
  const h = harness(); const prepare = h.deps.prepare; h.deps.prepare = expected => { const result = prepare(expected); h.local.state.window.bounds.left = 0; return result; };
  assert.throws(() => h.run(false), /runtime_window_/); assert.deepEqual(h.local.calls, ['write:intent-recorded', 'prepare', 'write:failed']);
});
check('atom failure consumes the one attempt', () => {
  const h = harness(); h.deps.prepare = () => { h.local.calls.push('prepare'); throw new Error('atom failed'); };
  assert.throws(() => h.run(false), /atom failed/); assert.deepEqual(h.local.calls, ['write:intent-recorded', 'prepare', 'write:failed']); assert.throws(() => h.run(false), /already_attempted/);
});
check('absent policy remains compatible for ordinary profiles', () => validateRuntimeWindowPolicy(undefined));
check('commandline with evidenced optional executable token', () => {
  const h = harness(value => { value.state.processes[0].commandLine = '"C:\\NWN\\nwmain.exe" ' + value.state.processes[0].commandLine; });
  assert.equal(h.run(true).status, 'admitted');
});
check('same resref in another directory cannot stand in for the loaded modules resource', () => {
  const h = harness(value => {
    value.profile.module.path = 'C:\\proof\\other\\example.mod';
    for (const kind of ['request', 'dispatch', 'handoff']) value.evidence[kind].modulePath = value.profile.module.path;
  });
  assert.throws(() => h.run(true), /module_directory_invalid/);
});
check('changed evidence after intent does not reach atom', () => {
  const h = harness(); let reads = 0; const load = h.deps.loadEvidence;
  h.deps.loadEvidence = () => { const result = load(); if (++reads > 1) result.bindings.observation.sha256 = 'b'.repeat(64); return result; };
  assert.throws(() => h.run(false), /before_action_drift/); assert.deepEqual(h.local.calls, ['write:intent-recorded', 'write:failed']);
});
check('unsafe atom receipt cannot be accepted', () => {
  const h = harness(); const prepare = h.deps.prepare;
  h.deps.prepare = expected => { const result = prepare(expected); result.safety.activatesWindow = true; return result; };
  assert.throws(() => h.run(false), /atom_safety_invalid/); assert.deepEqual(h.local.calls, ['write:intent-recorded', 'prepare', 'write:failed']);
});
check('atom receipt cannot substitute another device', () => {
  const h = harness(); const prepare = h.deps.prepare;
  h.deps.prepare = expected => { const result = prepare(expected); result.monitor.deviceName = '\\\\.\\DISPLAY2'; return result; };
  assert.throws(() => h.run(false), /atom_result_invalid/);
});

// TEST SIMULATION only: synthetic MOD/HAK, capture, witness and entry/v2 lineage.
// These temporary fixtures and simulated placement receipts are not native proof.
// Run the real CLI with every child-process port blocked except the two mocks.
check('public CLI dry-run, geometry/v2 receipts and MOD hash gate with isolated OS dependencies', () => {
  const directory = mkdtempSync(join(tmpdir(), 'aur-s07-window-contract-'));
  writeFileSync(join(directory, 'TEST-SIMULATION.txt'), 'Offline contract fixture only; not native NWN/Toolset proof.\n');
  const entry = createEntrySurfaceAcceptanceFixture(directory, { name: 'example', sourceDirectoryName: 'modules' });
  const geometry = entry.result.geometryProfile, gatePath = entry.geometryProfilePath;
  assert.equal(geometry.version, 'aurora-toolset-binary-native-geometry-profile/v2');
  assert.match(entry.witness.statement, /^TEST SIMULATION:/);
  const modulePath = geometry.module.path, originalModule = readFileSync(modulePath), originalGate = readFileSync(gatePath);
  const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
  const localProfile = { ...clone(profile), version: 'aur-s07-runtime-profile/v1',
    module: { ...geometry.module, area: geometry.area.resref, entryPoint: geometry.entryPoint.position },
    geometryGate: { status: 'verified', artifact: gatePath, sha256: digest(gatePath) },
    fixtures: geometry.fixtures, orderedHakList: geometry.orderedHakList };
  const profilePath = join(directory, 'profile.json'); writeFileSync(profilePath, JSON.stringify(localProfile));
  const localState = clone(state);
  localState.processes[0].commandLine = '-userdirectory "' + directory + '" +TestNewModule "example"';
  const names = { request: 'launch-request', dispatch: 'test-module-dispatch', handoff: 'handoff', observation: 'observation' };
  const mockPath = join(directory, 'mock-os.mjs');
  writeFileSync(mockPath, `
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import { syncBuiltinESMExports } from 'node:module';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, basename } from 'node:path';
const fixture = JSON.parse(readFileSync(process.env.S07_OFFLINE_FIXTURE, 'utf8'));
const state = fixture.state;
const trace = event => appendFileSync(fixture.tracePath, event + '\\n');
let drifted = false;
for (const port of ['exec', 'execSync', 'execFile', 'spawn', 'spawnSync', 'fork']) {
  cp[port] = () => { throw new Error('unmocked process port forbidden: ' + port); };
}
cp.execFileSync = (file, args) => {
  if (file === 'powershell.exe' && args.at(-1).includes('public static class S07WindowRead')) {
    trace('read-state');
    if (fixture.driftPath && !drifted) {
      assert.ok(!existsSync(join(fixture.runDirectory, 'aur-s07-runtime-window-intent.json')));
      appendFileSync(fixture.driftPath, ' ');
      drifted = true;
    }
    return JSON.stringify(state);
  }
  if (file === process.execPath && basename(args[0]) === 'prepare-nwmain-proof-window-no-global-input.mjs') {
    trace('prepare');
    assert.equal(args[1], 'prepare');
    assert.deepEqual(args.slice(2), ['--pid', '200', '--startedAtUtc', state.processes[0].startedAt, '--expectedDevice', state.screens[0].deviceName, '--expectedHwnd', '300']);
    assert.ok(existsSync(join(fixture.runDirectory, 'aur-s07-runtime-window-intent.json')));
    assert.ok(!existsSync(join(fixture.runDirectory, 'aur-s07-runtime-window-result.json')));
    const before = structuredClone(state.window.bounds); state.window.bounds = structuredClone(state.screens[0].workingArea);
    return JSON.stringify({ ok: true, status: 'verified', process: { name: 'nwmain', pid: 200, startedAtUtc: state.processes[0].startedAt, responding: true }, window: { hwnd: 300, ownerPid: 200, before, after: state.window.bounds }, monitor: state.screens[0], safety: { usesGlobalCursor: false, usesGlobalMouse: false, usesGlobalKeyboard: false, changesZOrder: false, activatesWindow: false, setWindowPosFlags: ['SWP_NOZORDER', 'SWP_NOACTIVATE'] } });
  }
  throw new Error('unmocked process execution forbidden: ' + file);
};
syncBuiltinESMExports();
`);
  const makeRun = (name, drift) => {
    const runDirectory = join(directory, name); mkdirSync(runDirectory);
    const localEvidence = clone(evidence);
    for (const [kind, receiptName] of Object.entries(names)) {
      Object.assign(localEvidence[kind], { profileSha256: digest(profilePath), modulePath, moduleSha256: localProfile.module.sha256,
        area: localProfile.module.area, entryPoint: localProfile.module.entryPoint });
      if (kind === 'handoff') localEvidence[kind].dispatchPath = join(runDirectory, 'aur-s07-runtime-test-module-dispatch.json');
      if (kind === 'observation') { localEvidence[kind].handoffPath = join(runDirectory, 'aur-s07-runtime-handoff.json'); localEvidence[kind].process = clone(localState.processes[0]); }
      writeFileSync(join(runDirectory, 'aur-s07-runtime-' + receiptName + '.json'), JSON.stringify(localEvidence[kind]));
    }
    const tracePath = join(directory, name + '-os-trace.txt'); writeFileSync(tracePath, '');
    const driftPath = { module: modulePath, geometry: gatePath, evidence: join(runDirectory, 'aur-s07-runtime-observation.json') }[drift];
    const fixturePath = join(directory, name + '-os-fixture.json');
    writeFileSync(fixturePath, JSON.stringify({ state: localState, runDirectory, tracePath, driftPath }));
    const cli = command => spawnSync(process.execPath, ['--import', pathToFileURL(mockPath).href, scriptPath, command, '--profile', profilePath, '--outDir', runDirectory],
      { encoding: 'utf8', windowsHide: true, timeout: 10_000, env: { ...process.env, S07_OFFLINE_FIXTURE: fixturePath } });
    return { runDirectory, cli, trace: () => readFileSync(tracePath, 'utf8') };
  };
  const { runDirectory, cli, trace } = makeRun('run');
  const beforeFiles = readdirSync(runDirectory);
  const dry = cli('prepare-runtime-window-dry-run'); assert.equal(dry.status, 0, dry.stderr); assert.equal(JSON.parse(dry.stdout).status, 'admitted'); assert.deepEqual(readdirSync(runDirectory), beforeFiles);
  assert.equal(trace(), 'read-state\n');
  writeFileSync(modulePath, 'changed module');
  // geometry/v2 now rejects current-target drift during profile admission, before OS reads.
  const stale = cli('prepare-runtime-window'); assert.notEqual(stale.status, 0); assert.match(stale.stderr, /ENTRY_CURRENT_TARGET_MISMATCH/); assert.deepEqual(readdirSync(runDirectory), beforeFiles);
  assert.equal(trace(), 'read-state\n');
  writeFileSync(modulePath, originalModule);
  writeFileSync(gatePath, Buffer.concat([originalGate, Buffer.from(' ')]));
  const staleGate = cli('prepare-runtime-window'); assert.notEqual(staleGate.status, 0); assert.match(staleGate.stderr, /area_geometry_gate_hash_mismatch/);
  assert.deepEqual(readdirSync(runDirectory), beforeFiles); assert.equal(trace(), 'read-state\n');
  writeFileSync(gatePath, originalGate);
  const liveMock = cli('prepare-runtime-window'); assert.equal(liveMock.status, 0, liveMock.stderr); const result = JSON.parse(liveMock.stdout);
  assert.equal(result.status, 'verified'); assert.equal(result.packetValidatorCoversPreparation, false);
  assert.ok(existsSync(result.intentPath)); assert.ok(existsSync(result.resultPath)); assert.deepEqual(result.after.window.bounds, bounds);
  assert.equal(trace().split('\n').filter(event => event === 'prepare').length, 1);
  const retry = cli('prepare-runtime-window'); assert.notEqual(retry.status, 0); assert.match(retry.stderr, /runtime_window_already_attempted/);
  assert.equal(trace().split('\n').filter(event => event === 'prepare').length, 1);
  for (const [drift, expected] of [
    ['module', /runtime_window_module_changed/],
    ['geometry', /runtime_window_geometry_gate_changed/],
    ['evidence', /runtime_window_before_action_drift/],
  ]) check('public CLI ' + drift + ' drift after validation blocks placement and consumes the attempt', () => {
    const attempt = makeRun('drift-' + drift, drift);
    try {
      const failed = attempt.cli('prepare-runtime-window'); assert.notEqual(failed.status, 0); assert.match(failed.stderr, expected);
      assert.ok(existsSync(join(attempt.runDirectory, 'aur-s07-runtime-window-intent.json')));
      const receipt = JSON.parse(readFileSync(join(attempt.runDirectory, 'aur-s07-runtime-window-result.json'), 'utf8'));
      assert.equal(receipt.status, 'failed'); assert.doesNotMatch(attempt.trace(), /prepare/);
    } finally {
      writeFileSync(modulePath, originalModule); writeFileSync(gatePath, originalGate);
    }
    const retry = attempt.cli('prepare-runtime-window'); assert.notEqual(retry.status, 0); assert.match(retry.stderr, /runtime_window_already_attempted/);
    assert.doesNotMatch(attempt.trace(), /prepare/);
  });
});
check('existing atom keeps legacy dry-run and checks new expectations before mutation', () => {
  const atomPath = fileURLToPath(new URL('./prepare-nwmain-proof-window-no-global-input.mjs', import.meta.url));
  const atomSource = readFileSync(atomPath, 'utf8');
  const mutationOffset = atomSource.indexOf('if(-not[NwmainProofWindowPrepare]::SetWindowPos');
  for (const guard of ['nwmain_exact_start_mismatch', 'nwmain_expected_hwnd_mismatch', 'nwmain_expected_device_mismatch']) {
    assert.ok(atomSource.indexOf(guard) > 0 && atomSource.indexOf(guard) < mutationOffset, guard + ' must guard SetWindowPos');
  }
  const dry = (...extra) => spawnSync(process.execPath, [atomPath, 'dry-run', '--pid', '200', '--startedAtUtc', nwn.startedAt, ...extra], { encoding: 'utf8', windowsHide: true, timeout: 10_000 });
  const legacy = dry(); assert.equal(legacy.status, 0, legacy.stderr); assert.deepEqual(JSON.parse(legacy.stdout).expectedProcess, { name: 'nwmain', pid: 200, startedAtUtc: nwn.startedAt });
  const strict = dry('--expectedDevice', device, '--expectedHwnd', '300'); assert.equal(strict.status, 0, strict.stderr);
  assert.equal(JSON.parse(strict.stdout).expectedDevice, device); assert.equal(JSON.parse(strict.stdout).expectedHwnd, 300);
  const wrongDevice = dry('--expectedDevice', 'primary'); assert.notEqual(wrongDevice.status, 0); assert.match(wrongDevice.stderr, /--expectedDevice/);
  const wrongHwnd = dry('--expectedHwnd', '0'); assert.notEqual(wrongHwnd.status, 0); assert.match(wrongHwnd.stderr, /--expectedHwnd/);
});
check('embedded PowerShell parses without executing any native inspection or action', () => {
  const atomPath = fileURLToPath(new URL('./prepare-nwmain-proof-window-no-global-input.mjs', import.meta.url));
  const parser = [
    "$ErrorActionPreference = 'Stop'",
    'foreach ($file in @($env:S07_PARSE_RUNNER, $env:S07_PARSE_ATOM)) {',
    '  $text = [IO.File]::ReadAllText($file)',
    "  if (-not ($text -match '(?s)const source = String.raw`(?<source>.*?)`;')) { throw 'embedded script missing' }",
    '  $tokens = $null; $parseErrors = $null',
    '  [void][System.Management.Automation.Language.Parser]::ParseInput($Matches.source, [ref]$tokens, [ref]$parseErrors)',
    "  if ($parseErrors.Count -ne 0) { throw ($parseErrors | Out-String) }",
    '}',
    "Write-Output 'parse-only-valid'",
  ].join('\n');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', parser], {
    encoding: 'utf8', windowsHide: true, timeout: 10_000,
    env: { ...process.env, S07_PARSE_RUNNER: scriptPath, S07_PARSE_ATOM: atomPath },
  });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /parse-only-valid/);
});
console.log(JSON.stringify({ ok: true, cases, testSimulation: true, geometryVersion: 'aurora-toolset-binary-native-geometry-profile/v2', usesLiveProcesses: false, status: 'aur_s07_runtime_window_offline_contract_passed' }));
