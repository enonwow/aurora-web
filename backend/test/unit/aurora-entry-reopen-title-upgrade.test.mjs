import assert from 'node:assert/strict';
import test from 'node:test';
import { resolve } from 'node:path';
import { validateTitleValidationUpgrade } from '../../scripts/lib/aurora-binary-entry-reopen-title-upgrade.mjs';

const h = (char) => char.repeat(64);
const identity = (path, char = 'a', bytes = 100) => ({ path: resolve(path), sha256: h(char), bytes });
const backend = resolve('isolated-title-upgrade/backend');
const code = (name, char = 'a') => identity(resolve(backend, name), char);
const contract = 'scripts/lib/aurora-binary-entry-reopen-contract.mjs';
function fixture() {
  const names = ['request', 'blocker', 'failedState', 'plan', 'result', 'before', 'ready', 'prepProfile', 'binaryProfile', 'step0', 'step1', 'step2'];
  const files = Object.fromEntries(names.map((name) => [name, identity(resolve('isolated-title-upgrade/attempt', `${name}.json`))]));
  const previousProducer = [code('scripts/lib/aurora-binary-entry-reopen-public.mjs'), code(contract),
    code('scripts/lib/aurora-binary-entry-reopen-workflow.mjs'), code('scripts/lib/aurora-model-proof-120s-prep-contract.mjs'),
    code('scripts/prepare-aurora-model-proof-120s.mjs'), code('src/unchanged.ts')];
  const currentProducer = structuredClone(previousProducer); currentProducer[1].sha256 = h('b');
  currentProducer.push(code('scripts/lib/aurora-binary-entry-reopen-title-upgrade.mjs', 'c'));
  const request = { version: 'aurora-entry-reopen-request/v1', requestId: 'd04e5e69-34c5-477b-a9d4-f1cbf985a30b',
    producer: previousProducer, prepProfile: files.prepProfile, binaryProfile: files.binaryProfile,
    createdAt: '2026-09-06T09:44:45.841Z', expiresAt: '2026-09-06T10:14:45.841Z' };
  const blocker = { version: 'aurora-entry-reopen-blocker/v1', status: 'failed', requestId: request.requestId,
    blockerCode: 'REOPEN_READY_MODULE_MISMATCH', preparationStarted: true };
  const failedState = { version: 'aurora-model-proof-120s-prep-state/v1', capturedAtUtc: '2026-09-06T09:45:13.5556179Z', nwmain: [], toolsets: [] };
  const upgrade = { version: 'aurora-entry-reopen-title-validation-upgrade/v1', reason: 'REOPEN_READY_MODULE_MISMATCH',
    requestIdentity: structuredClone(files.request), frozen: structuredClone(files),
    previousProducer: structuredClone(previousProducer), nextProducer: structuredClone(currentProducer) };
  return { request, blocker, failedState, files, upgrade, currentProducer };
}

test('admits only the bound title-validator code upgrade and leaves historical request/TTL unchanged', () => {
  const input = fixture(), before = structuredClone(input);
  const result = validateTitleValidationUpgrade(input);
  assert.deepEqual(result.changedPaths, [resolve(backend, contract)]);
  assert.deepEqual(result.addedPaths, [resolve(backend, 'scripts/lib/aurora-binary-entry-reopen-title-upgrade.mjs')]);
  assert.equal(result.nativePaintVerified, false);
  assert.deepEqual(input, before);
});

test('supports a two-step preparation and the optional new resume helper', () => {
  const input = fixture(); delete input.files.step2; delete input.upgrade.frozen.step2;
  const helper = code('scripts/lib/aurora-binary-entry-reopen-title-resume.mjs', 'd');
  input.currentProducer.push(helper); input.upgrade.nextProducer.push(structuredClone(helper));
  assert.equal(validateTitleValidationUpgrade(input).addedPaths.length, 2);
});

test('archived nextProducer can be validated at ARM without consulting running code or a clock', () => {
  const input = fixture(); input.currentProducer = structuredClone(input.upgrade.nextProducer);
  assert.equal(validateTitleValidationUpgrade(input).changedPaths.length, 1);
});

test('rejects unrelated blocker, request identity, missing or altered preserved evidence', () => {
  for (const mutate of [
    (x) => { x.upgrade.version = 'unknown'; },
    (x) => { x.upgrade.reason = 'OTHER_FAILURE'; },
    (x) => { x.blocker.blockerCode = 'OTHER_FAILURE'; },
    (x) => { x.blocker.status = 'success'; },
    (x) => { x.blocker.preparationStarted = false; },
    (x) => { x.blocker.requestId = 'other'; },
    (x) => { x.upgrade.requestIdentity.sha256 = h('f'); },
    (x) => { x.upgrade.frozen.ready.bytes += 1; },
    (x) => { delete x.upgrade.frozen.failedState; },
    (x) => { delete x.files.step1; delete x.upgrade.frozen.step1; },
    (x) => { x.files.unrelated = x.files.ready; x.upgrade.frozen.unrelated = x.files.ready; },
    (x) => { x.files.ready.bytes = 0; x.upgrade.frozen.ready.bytes = 0; },
    (x) => { x.failedState.version = 'fixture'; },
    (x) => { x.request.prepProfile = x.files.binaryProfile; },
  ]) { const input = fixture(); mutate(input); assert.throws(() => validateTitleValidationUpgrade(input), { code: 'REOPEN_TITLE_UPGRADE_INVALID' }); }
});

test('rejects mutation/removal outside the reviewed code delta, foreign roots and duplicate producer paths', () => {
  for (const mutate of [
    (x) => { x.currentProducer[4].sha256 = h('d'); },
    (x) => { x.currentProducer[5].bytes += 1; },
    (x) => { x.currentProducer.splice(5, 1); },
    (x) => { x.currentProducer.push(code('scripts/unreviewed.mjs', 'd')); },
    (x) => { x.currentProducer.push(identity(resolve(backend, '..', 'foreign.mjs'), 'd')); },
    (x) => { x.currentProducer.push(structuredClone(x.currentProducer[0])); },
    (x) => { x.currentProducer[1].sha256 = h('a'); },
  ]) {
    const input = fixture(); mutate(input); input.upgrade.nextProducer = structuredClone(input.currentProducer);
    assert.throws(() => validateTitleValidationUpgrade(input), { code: 'REOPEN_TITLE_UPGRADE_INVALID' });
  }
});

test('requires old producer set to equal the immutable request and new set to equal the supplied exact snapshot', () => {
  for (const mutate of [
    (x) => { x.upgrade.previousProducer[0].sha256 = h('e'); },
    (x) => { x.upgrade.nextProducer[0].sha256 = h('e'); },
    (x) => { x.upgrade.nextProducer.reverse(); },
    (x) => { x.request.producer.push(structuredClone(x.request.producer[0])); x.upgrade.previousProducer = structuredClone(x.request.producer); },
  ]) { const input = fixture(); mutate(input); assert.throws(() => validateTitleValidationUpgrade(input), { code: 'REOPEN_TITLE_UPGRADE_INVALID' }); }
});
