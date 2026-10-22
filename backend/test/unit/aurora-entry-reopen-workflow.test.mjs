import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { writeSourceFixture, fixtureModule, fixtureCapture } from './entry-surface-fixture.mjs';
import { reopenEntrySurface, armReopenedEntrySurface, resumeReopenTitleValidation, titleResumeFrozenFiles, producerSet } from '../../scripts/lib/aurora-binary-entry-reopen-workflow.mjs';
import { ingestEntrySurface, finalizeEntrySurface } from '../../scripts/lib/aurora-binary-entry-surface-workflow.mjs';
import { createHash } from 'node:crypto';

function simulation(dir, { changeColdOpen = value => value } = {}) {
  const sourceDir = join(dir, 'source'); mkdirSync(sourceDir);
  const fixture = writeSourceFixture(sourceDir), reopenDir = join(dir, 'reopen');
  const base = Date.now() - 3000;
  const iso = delta => new Date(base + delta).toISOString();
  const owner = { pid: 8811, startedAt: iso(100).replace('Z', '0000Z'), frameHwnd: 9911, viewerHwnd: 6677, viewportHwnd: 6789 };
  const state = delta => ({ version: 'aurora-model-proof-120s-prep-state/v1', capturedAtUtc: iso(delta), nwmain: [],
    toolsets: [{ pid: owner.pid, startedAtUtc: owner.startedAt, responding: true, frameCount: 1,
      frame: { hwnd: owner.frameHwnd, className: 'TfrmFrame', title: 'BioWare Aurora Toolset - fixture_a.mod',
        monitor: { deviceName: '\\\\.\\DISPLAY1', primary: false } }, modals: [],
      areaViewers: [{ hwnd: owner.viewerHwnd, title: ' - entry_area', resref: 'entry_area',
        canonicalViewportHwnd: owner.viewportHwnd, canonicalViewportCount: 1,
        viewports: [{ hwnd: owner.viewportHwnd, bounds: { left: -900, top: 100, width: 800, height: 600 }, captureEligible: true }] }] }] });
  let opened = false, currentTime = iso(0);
  const write = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2) + '\n');
  const producerPath = join(dir, 'simulated-producer.mjs'); writeFileSync(producerPath, '// TEST ONLY simulated producer bytes\n');
  const ports = { now: () => currentTime, producerFiles: [producerPath],
    inspect: () => opened ? state(Date.parse(currentTime) - base - 1) : { version: 'aurora-model-proof-120s-prep-state/v1', capturedAtUtc: iso(1), nwmain: [], toolsets: [] },
    prepare: entry => {
      mkdirSync(entry.prepOutDir, { recursive: true });
      const initialDecision = { route: 'cold', processId: null, currentModule: null, reason: 'zero_toolset_processes' };
      const finalDecision = { route: 'adopt', processId: owner.pid, currentModule: 'fixture_a.mod', area: 'entry_area', reason: 'exact_module_area_viewport_ready' };
      const profile = { path: entry.profilePath, sha256: entry.profileSha256, id: entry.prepProfile.id };
      write(join(entry.prepOutDir, 'plan.json'), { version: 'aurora-model-proof-120s-prep-plan/v1', createdAtUtc: iso(10), profile, target: entry.target, decision: initialDecision });
      write(join(entry.prepOutDir, 'state-before.json'), ports.inspect());
      write(join(entry.prepOutDir, 'state-ready.json'), state(1000));
      const coldOpen = changeColdOpen({ ok: true, command: 'open', status: 'binary_native_geometry_module_ready',
        manifestPath: join(entry.prepOutDir, 'cold-open', 'binary-native-geometry-manifest.json'),
        process: { Id: owner.pid, StartTime: `/Date(${Date.parse(owner.startedAt)})/`, StartTimeUtc: owner.startedAt,
          MainWindowTitle: 'BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17', Responding: true } });
      for (const [name, time, child] of [['cold-preflight', 50, { ok: true, command: 'preflight', status: 'binary_native_geometry_prepared' }], ['cold-open', 900, coldOpen]])
        write(join(entry.prepOutDir, `${name}.json`), { name, completedAtUtc: iso(time), result: child });
      write(join(entry.prepOutDir, 'prep-result.json'), { version: 'aurora-model-proof-120s-prep-result/v1', ok: true,
        command: 'prepare', status: 'proof_ready', createdAtUtc: iso(1001), profile, prepOutDir: entry.prepOutDir,
        initialDecision, finalDecision, processId: owner.pid, target: entry.target,
        steps: [{ name: 'cold-preflight', resultPath: join(entry.prepOutDir, 'cold-preflight.json') }, { name: 'cold-open', resultPath: join(entry.prepOutDir, 'cold-open.json') }] });
      opened = true; currentTime = iso(1100);
    } };
  return { ...fixture, sourceDir, reopenDir, ports, owner, iso, write, state, producerPath,
    advance: delta => { currentTime = iso(delta); } };
}

test('reopen rejects a live process before calling preparation or creating evidence', () => {
  const dir = mkdtempSync(join(tmpdir(), 'entry-reopen-denial-'));
  try {
    const sourceDir = join(dir, 'source'); mkdirSync(sourceDir);
    const fixture = writeSourceFixture(sourceDir);
    const reopenDir = join(dir, 'reopen'); let preparations = 0;
    assert.throws(() => reopenEntrySurface({ profilePath: fixture.profilePath, outDir: sourceDir, reopenDir }, {
      inspect: () => ({ version: 'aurora-model-proof-120s-prep-state/v1', capturedAtUtc: new Date().toISOString(), nwmain: [], toolsets: [{ pid: 123 }] }),
      prepare: () => { preparations++; }, producerFiles: [import.meta.filename],
    }), /REOPEN_.*PROCESS/);
    assert.equal(preparations, 0); assert.equal(existsSync(reopenDir), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('ARM refuses missing/foreign reopen evidence without probing or falling back to historical owner', () => {
  let probes = 0;
  assert.throws(() => armReopenedEntrySurface({ receiptPath: 'absent-reopen-receipt.json', evidenceDir: 'must-not-be-created' }, {
    inspect: () => { probes++; }, producerFiles: [import.meta.filename],
  }));
  assert.equal(probes, 0);
});

test('SIMULATION: a thrown preparation preserves request, blocker and every original source byte', () => {
  const dir = mkdtempSync(join(tmpdir(), 'entry-reopen-failure-'));
  try {
    const f = simulation(dir);
    const before = [f.manifestPath, f.profilePath, f.modulePath, f.hakPath, f.manifest.postSaveProfilePath].map(path => [path, readFileSync(path)]);
    const ports = { ...f.ports, prepare: entry => {
      mkdirSync(entry.prepOutDir, { recursive: true }); f.write(join(entry.prepOutDir, 'partial-test-evidence.json'), { simulated: true });
      throw new Error('SIMULATED_PREPARATION_FAILURE');
    } };
    assert.throws(() => reopenEntrySurface({ profilePath: f.profilePath, outDir: f.sourceDir, reopenDir: f.reopenDir }, ports), /SIMULATED_PREPARATION_FAILURE/);
    assert.equal(existsSync(join(f.reopenDir, 'reopen-request.v1.json')), true);
    assert.equal(existsSync(join(f.reopenDir, 'reopen-receipt.v1.json')), false);
    assert.equal(existsSync(join(f.reopenDir, 'live', 'prep', 'partial-test-evidence.json')), true);
    const blocker = JSON.parse(readFileSync(join(f.reopenDir, 'reopen-blocker.json'), 'utf8'));
    assert.equal(blocker.preparationStarted, true); assert.match(blocker.message, /SIMULATED_PREPARATION_FAILURE/);
    for (const [path, bytes] of before) assert.deepEqual(readFileSync(path), bytes);
    assert.throws(() => reopenEntrySurface({ profilePath: f.profilePath, outDir: f.sourceDir, reopenDir: f.reopenDir }, ports), /REOPEN_DIRECTORY_EXISTS/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('SIMULATION: same saved source reopens, fresh ARM pins new owner, Paint readback reaches geometry/v2', () => {
  const dir = mkdtempSync(join(tmpdir(), 'entry-reopen-simulation-'));
  try {
    const f = simulation(dir);
    const originalManifest = readFileSync(join(f.sourceDir, 'binary-native-geometry-manifest.json'));
    const result = reopenEntrySurface({ profilePath: f.profilePath, outDir: f.sourceDir, reopenDir: f.reopenDir }, f.ports);
    assert.equal(result.status, 'same_saved_module_reopened'); assert.deepEqual(result.owner, f.owner);
    const evidenceDir = join(dir, 'paint'); f.advance(1200);
    const arm = armReopenedEntrySurface({ receiptPath: result.receiptPath, evidenceDir }, f.ports);
    const request = JSON.parse(readFileSync(arm.requestPath, 'utf8'));
    assert.notEqual(request.source.owner.pid, f.owner.pid);
    assert.deepEqual(request.captureBinding.owner, f.owner);
    assert.deepEqual(readFileSync(join(f.sourceDir, 'binary-native-geometry-manifest.json')), originalManifest);
    writeFileSync(f.modulePath, fixtureModule([22, 21, 0]).bytes);
    const pngPath = join(dir, 'simulated.png'), sidecarPath = join(dir, 'simulated.capture.json');
    const capture = fixtureCapture({ binding: request.captureBinding, pngPath, capturedAt: f.iso(4000) });
    writeFileSync(pngPath, capture.png); f.write(sidecarPath, capture.sidecar);
    const witnessPath = join(dir, 'test-only-witness.json'); f.write(witnessPath, { version: 'aurora-entry-surface-human-witness/v2',
      requestId: arm.requestId, actorKind: 'human', source: { kind: 'user_message', reference: 'TEST_ONLY_SIMULATED_RESPONSE', receivedAt: f.iso(4100) },
      statement: 'TEST SIMULATION ONLY; not a live human observation.', claims: ['used_native_paint_start_location', 'clicked_visible_surface', 'saved_module'],
      captureSha256: createHash('sha256').update(capture.png).digest('hex') });
    const handoffPath = join(dir, 'test-handoff.json'); f.write(handoffPath, { version: 'aurora-entry-surface-handoff/v2',
      requestId: arm.requestId, capture: { sidecarPath, pngPath }, witnessPath });
    ingestEntrySurface({ evidenceDir, handoffPath, now: f.iso(4200) });
    assert.equal(finalizeEntrySurface({ evidenceDir }).status, 'verified');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('SIMULATION: stale/foreign owner and source drift stop ARM before evidence creation', () => {
  const dir = mkdtempSync(join(tmpdir(), 'entry-reopen-drift-'));
  try {
    const f = simulation(dir);
    const result = reopenEntrySurface({ profilePath: f.profilePath, outDir: f.sourceDir, reopenDir: f.reopenDir }, f.ports);
    f.advance(1200); const evidenceDir = join(dir, 'paint');
    const foreign = f.state(1199); foreign.toolsets[0].startedAtUtc = f.iso(101).replace('Z', '0000Z');
    assert.throws(() => armReopenedEntrySurface({ receiptPath: result.receiptPath, evidenceDir }, { ...f.ports, inspect: () => foreign }));
    assert.equal(existsSync(evidenceDir), false);
    writeFileSync(f.modulePath, fixtureModule([22, 21, 0]).bytes);
    let probes = 0;
    assert.throws(() => armReopenedEntrySurface({ receiptPath: result.receiptPath, evidenceDir }, { ...f.ports, inspect: () => { probes++; } }));
    assert.equal(probes, 0); assert.equal(existsSync(evidenceDir), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('SIMULATION: incomplete/foreign-session receipts, child record, HAK and producer drift fail before native inspection', () => {
  const dir = mkdtempSync(join(tmpdir(), 'entry-reopen-evidence-'));
  try {
    const f = simulation(dir), result = reopenEntrySurface({ profilePath: f.profilePath, outDir: f.sourceDir, reopenDir: f.reopenDir }, f.ports);
    f.advance(1200); const evidenceDir = join(dir, 'paint');
    const original = readFileSync(result.receiptPath), receipt = JSON.parse(original);
    const cases = [
      () => { const value = structuredClone(receipt); delete value.files.ready; f.write(result.receiptPath, value); },
      () => { const value = structuredClone(receipt); value.owner.pid++; f.write(result.receiptPath, value); },
      () => { const value = structuredClone(receipt); value.files.ready.path = join(dir, 'another-session.json'); f.write(result.receiptPath, value); },
      () => writeFileSync(join(f.reopenDir, 'live', 'prep', 'cold-open.json'), '{}'),
      () => writeFileSync(f.hakPath, 'drifted HAK'),
      () => writeFileSync(f.producerPath, '// changed producer'),
    ];
    for (const mutate of cases) {
      const paths = [result.receiptPath, join(f.reopenDir, 'live', 'prep', 'cold-open.json'), f.hakPath, f.producerPath];
      const saved = paths.map(path => [path, readFileSync(path)]); mutate(); let probes = 0;
      assert.throws(() => armReopenedEntrySurface({ receiptPath: result.receiptPath, evidenceDir }, {
        ...f.ports, inspect: () => { probes++; throw new Error('UNEXPECTED_NATIVE_INSPECTION'); } }));
      assert.equal(probes, 0); assert.equal(existsSync(evidenceDir), false);
      for (const [path, bytes] of saved) writeFileSync(path, bytes);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('SIMULATION regression: cold-open A cannot hand off to ready/fresh/summary B for the same saved target', () => {
  const dir = mkdtempSync(join(tmpdir(), 'entry-reopen-cold-owner-'));
  try {
    const f = simulation(dir, { changeColdOpen: value => { value.process.Id += 10; return value; } });
    assert.throws(() => reopenEntrySurface({ profilePath: f.profilePath, outDir: f.sourceDir, reopenDir: f.reopenDir }, f.ports), /REOPEN_COLD_OPEN_OWNER_MISMATCH/);
    assert.equal(existsSync(join(f.reopenDir, 'reopen-receipt.v1.json')), false);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('SIMULATION regression: same PID with 100 ns drift, missing full start, wrong command/status/manifest are rejected', () => {
  for (const mutate of [
    value => { value.process.StartTimeUtc = value.process.StartTimeUtc.replace(/0000Z$/, '0001Z'); },
    value => { delete value.process.StartTimeUtc; },
    value => { value.command = 'preflight'; },
    value => { value.status = 'module_ready'; },
    value => { value.process.Responding = false; },
    value => { value.manifestPath = join(dirname(value.manifestPath), 'foreign-manifest.json'); },
  ]) {
    const dir = mkdtempSync(join(tmpdir(), 'entry-reopen-cold-invalid-'));
    try {
      const f = simulation(dir, { changeColdOpen: value => { mutate(value); return value; } });
      assert.throws(() => reopenEntrySurface({ profilePath: f.profilePath, outDir: f.sourceDir, reopenDir: f.reopenDir }, f.ports), /REOPEN_COLD_OPEN_/);
      assert.equal(existsSync(join(f.reopenDir, 'reopen-receipt.v1.json')), false);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test('SIMULATION regression: ARM snapshots revalidate the cold-open owner and chronology even when changed child hashes agree', () => {
  const dir = mkdtempSync(join(tmpdir(), 'entry-reopen-embedded-owner-'));
  try {
    const f = simulation(dir), result = reopenEntrySurface({ profilePath: f.profilePath, outDir: f.sourceDir, reopenDir: f.reopenDir }, f.ports);
    f.advance(1200); const evidenceDir = join(dir, 'paint');
    const arm = armReopenedEntrySurface({ receiptPath: result.receiptPath, evidenceDir }, f.ports);
    const original = JSON.parse(readFileSync(arm.requestPath, 'utf8'));
    for (const change of [
      value => { value.result.process.Id++; },
      value => { value.result.process.StartTimeUtc = value.result.process.StartTimeUtc.replace(/0000Z$/, '0001Z'); },
      value => { value.completedAtUtc = f.iso(1001); },
    ]) {
      const request = structuredClone(original), bundle = request.reopenedSession.bundle;
      const item = bundle.steps[1], step = JSON.parse(Buffer.from(item.raw, 'base64'));
      change(step); const bytes = Buffer.from(JSON.stringify(step, null, 2) + '\n');
      item.raw = bytes.toString('base64'); item.ref.sha256 = createHash('sha256').update(bytes).digest('hex'); item.ref.bytes = bytes.length;
      bundle.receipt.steps[1] = structuredClone(item.ref); f.write(arm.requestPath, request);
      assert.throws(() => ingestEntrySurface({ evidenceDir, handoffPath: join(dir, 'unused-handoff.json'), now: f.iso(1300) }), /REOPEN_COLD_OPEN_(OWNER_MISMATCH|TIME_ORDER_INVALID)/);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('SIMULATION: title-validation resume preserves failed packet, uses fresh owner and original expiry, never calls prepare', () => {
  const dir = mkdtempSync(join(tmpdir(), 'entry-reopen-title-resume-'));
  try {
    const f = simulation(dir), lib = join(dir, 'backend', 'scripts', 'lib'); mkdirSync(lib, { recursive: true });
    const names = ['aurora-binary-entry-reopen-contract.mjs', 'aurora-binary-entry-reopen-workflow.mjs', 'aurora-binary-entry-reopen-public.mjs', 'aurora-model-proof-120s-prep-contract.mjs'];
    const oldFiles = names.map(name => { const path = join(lib, name); writeFileSync(path, '// original producer\n'); return path; });
    f.ports.producerFiles = oldFiles;
    const prepare = f.ports.prepare;
    assert.throws(() => reopenEntrySurface({ profilePath: f.profilePath, outDir: f.sourceDir, reopenDir: f.reopenDir }, {
      ...f.ports, prepare: input => { prepare(input); f.write(join(f.reopenDir, 'state-admission.json'), f.state(1099));
        const error = new Error('REOPEN_READY_MODULE_MISMATCH'); error.code = error.message; throw error; },
    }), /REOPEN_READY_MODULE_MISMATCH/);
    const requestPath = join(f.reopenDir, 'reopen-request.v1.json');
    const original = readFileSync(requestPath), request = JSON.parse(original);
    const frozen = titleResumeFrozenFiles(f.reopenDir);
    for (const path of oldFiles) writeFileSync(path, '// corrected producer\n');
    const addition = join(lib, 'aurora-binary-entry-reopen-title-upgrade.mjs'); writeFileSync(addition, '// upgrade validator\n');
    f.ports.producerFiles = [...oldFiles, addition];
    const upgrade = { version: 'aurora-entry-reopen-title-validation-upgrade/v1', reason: 'REOPEN_READY_MODULE_MISMATCH',
      requestIdentity: frozen.request, frozen, previousProducer: request.producer, nextProducer: producerSet(f.ports.producerFiles) };
    const upgradePath = join(dir, 'upgrade.json'); f.write(upgradePath, upgrade);
    f.ports.prepare = () => { throw new Error('PREPARE_MUST_NOT_RUN'); }; f.advance(5000);
    const input = { reopenDir: f.reopenDir, upgradePath };
    const dry = resumeReopenTitleValidation({ ...input, dryRun: true }, f.ports);
    assert.equal(dry.status, 'title_validation_resume_admitted');
    assert.equal(existsSync(join(f.reopenDir, 'title-validation-resume')), false);
    const wrong = f.state(4999); wrong.toolsets[0].pid++;
    assert.throws(() => resumeReopenTitleValidation(input, { ...f.ports, inspect: () => wrong }), /REOPEN_/);
    f.advance(31 * 60 * 1000);
    assert.throws(() => resumeReopenTitleValidation(input, f.ports), /REOPEN_REQUEST_WINDOW_INVALID/);
    f.advance(5000);
    const result = resumeReopenTitleValidation(input, f.ports);
    assert.equal(result.status, 'same_saved_module_reopened');
    assert.deepEqual(readFileSync(requestPath), original);
    assert.deepEqual(titleResumeFrozenFiles(f.reopenDir), frozen);
    assert.equal(JSON.parse(readFileSync(result.receiptPath, 'utf8')).continuation.version, 'aurora-entry-reopen-title-validation-resume/v1');
    f.advance(5100);
    const evidenceDir = join(dir, 'paint'), arm = armReopenedEntrySurface({ receiptPath: result.receiptPath, evidenceDir }, f.ports);
    assert.equal(arm.status, 'awaiting_real_human_paint_and_save');
    const paintRequest = JSON.parse(readFileSync(arm.requestPath, 'utf8'));
    writeFileSync(f.modulePath, fixtureModule([22, 21, 0]).bytes);
    // Test-only saved-file time follows the simulated future ARM clock.
    utimesSync(f.modulePath, new Date(f.iso(6000)), new Date(f.iso(6000)));
    const pngPath = join(dir, 'SIMULATED-resume.png'), sidecarPath = join(dir, 'SIMULATED-resume-capture.json');
    const capture = fixtureCapture({ binding: paintRequest.captureBinding, pngPath, capturedAt: f.iso(9000) });
    writeFileSync(pngPath, capture.png); f.write(sidecarPath, capture.sidecar);
    const witnessPath = join(dir, 'SIMULATED-resume-witness.json');
    f.write(witnessPath, { version: 'aurora-entry-surface-human-witness/v2', requestId: arm.requestId, actorKind: 'human',
      source: { kind: 'user_message', reference: 'TEST_ONLY_SIMULATION', receivedAt: f.iso(9100) }, statement: 'TEST SIMULATION ONLY',
      claims: ['used_native_paint_start_location', 'clicked_visible_surface', 'saved_module'], captureSha256: createHash('sha256').update(capture.png).digest('hex') });
    const handoffPath = join(dir, 'SIMULATED-resume-handoff.json');
    f.write(handoffPath, { version: 'aurora-entry-surface-handoff/v2', requestId: arm.requestId, capture: { sidecarPath, pngPath }, witnessPath });
    ingestEntrySurface({ evidenceDir, handoffPath, now: f.iso(9200) });
    assert.equal(finalizeEntrySurface({ evidenceDir }).status, 'verified');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
