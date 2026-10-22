import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

const VERSION = 'aurora-entry-reopen-title-validation-upgrade/v1';
const PUBLIC = 'scripts/lib/aurora-binary-entry-reopen-public.mjs';
const CONTRACT = 'scripts/lib/aurora-binary-entry-reopen-contract.mjs';
const CHANGED = new Set([CONTRACT, PUBLIC,
  'scripts/lib/aurora-binary-entry-reopen-workflow.mjs',
  'scripts/lib/aurora-model-proof-120s-prep-contract.mjs']);
const ADDED = new Set(['scripts/lib/aurora-binary-entry-reopen-title-upgrade.mjs',
  'scripts/lib/aurora-binary-entry-reopen-title-resume.mjs']);
const FROZEN = ['request', 'blocker', 'failedState', 'plan', 'result', 'before', 'ready',
  'prepProfile', 'binaryProfile', 'step0', 'step1'];

// Pure compatibility binding, not a process probe or a new preparation. At ARM
// the supplied currentProducer may be the archived exact admitted next snapshot.
// The caller still validates actual source bytes, owner, titles and original TTL.
export function validateTitleValidationUpgrade({ request, upgrade, currentProducer, failedState, blocker, files } = {}) {
  check(request?.version === 'aurora-entry-reopen-request/v1'
    && typeof request.requestId === 'string' && request.requestId.length > 0
    && upgrade?.version === VERSION && upgrade.reason === 'REOPEN_READY_MODULE_MISMATCH');
  check(blocker?.version === 'aurora-entry-reopen-blocker/v1' && blocker.status === 'failed'
    && blocker.requestId === request.requestId && blocker.blockerCode === upgrade.reason
    && blocker.preparationStarted === true);
  check(failedState?.version === 'aurora-model-proof-120s-prep-state/v1'
    && Array.isArray(failedState.toolsets) && Array.isArray(failedState.nwmain));
  check(files && typeof files === 'object' && !Array.isArray(files));
  const keys = Object.keys(files);
  check(FROZEN.every(key => keys.includes(key))
    && keys.every(key => FROZEN.includes(key) || key === 'step2')
    && Object.values(files).every(validIdentity));
  check(isDeepStrictEqual(upgrade.frozen, files)
    && isDeepStrictEqual(upgrade.requestIdentity, files.request)
    && isDeepStrictEqual(request.prepProfile, files.prepProfile)
    && isDeepStrictEqual(request.binaryProfile, files.binaryProfile));
  check(Array.isArray(request.producer) && request.producer.length > 0 && request.producer.length <= 400
    && request.producer.every(validIdentity)
    && isDeepStrictEqual(upgrade.previousProducer, request.producer)
    && Array.isArray(currentProducer) && currentProducer.length > 0 && currentProducer.length <= 400
    && currentProducer.every(validIdentity)
    && isDeepStrictEqual(upgrade.nextProducer, currentProducer));

  const anchors = request.producer.filter(item => normalized(item.path).endsWith('/' + PUBLIC));
  check(anchors.length === 1);
  const backend = dirname(dirname(dirname(resolve(anchors[0].path))));
  const old = producerMap(request.producer, backend), next = producerMap(currentProducer, backend);
  const changedPaths = [], addedPaths = [];
  for (const [name, previous] of old) {
    const current = next.get(name); check(current);
    if (!isDeepStrictEqual(current, previous)) {
      check(CHANGED.has(name)); changedPaths.push(current.path);
    }
  }
  for (const [name, current] of next) {
    if (!old.has(name)) { check(ADDED.has(name)); addedPaths.push(current.path); }
  }
  // A title-only continuation cannot claim a no-op upgrade of the very contract
  // that rejected the recorded retail frame title.
  check(changedPaths.some(path => normalized(relative(backend, path)) === CONTRACT));
  return { version: 'aurora-entry-reopen-title-validation-upgrade-admission/v1',
    changedPaths: changedPaths.sort(), addedPaths: addedPaths.sort(),
    nativePaintVerified: false, runtimeClaimed: false };
}

function producerMap(producer, backend) {
  const result = new Map();
  for (const item of producer) {
    const child = relative(backend, resolve(item.path)), name = normalized(child);
    check(child && !isAbsolute(child) && name !== '..' && !name.startsWith('../')
      && !name.split('/').includes('node_modules') && !result.has(name));
    result.set(name, item);
  }
  return result;
}
function validIdentity(value) {
  return value && typeof value.path === 'string' && isAbsolute(value.path)
    && /^[a-f0-9]{64}$/u.test(value.sha256) && Number.isSafeInteger(value.bytes) && value.bytes > 0
    && Object.keys(value).length === 3;
}
function normalized(value) { return value.replaceAll('\\', '/').toLowerCase(); }
function check(condition) {
  if (!condition) { const error = new Error('REOPEN_TITLE_UPGRADE_INVALID'); error.code = 'REOPEN_TITLE_UPGRADE_INVALID'; throw error; }
}
