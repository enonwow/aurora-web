import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { loadBinaryEntrySurfaceSource } from './aurora-binary-entry-surface-inspection.mjs';
import { armEntrySurface } from './aurora-binary-entry-surface-workflow.mjs';
import { buildEntryReopenBinaryProfile, buildEntryReopenPrepContext } from './aurora-binary-entry-reopen-prep-context.mjs';
import { validateReopenPreparation, validateReopenArmState, validateReopenColdOpenResult, readReopenStateOwner } from './aurora-binary-entry-reopen-contract.mjs';
import { validateTitleValidationUpgrade } from './aurora-binary-entry-reopen-title-upgrade.mjs';

const REQUEST = 'aurora-entry-reopen-request/v1';
const RECEIPT = 'aurora-entry-reopen-receipt/v1';
const SAFETY = Object.freeze({ nativePaintVerified: false, runtimeClaimed: false, nativeVerified: false,
  usesGlobalInput: false, savesModule: false, buildsModule: false, launchesNwn: false });
const DOCUMENTS = ['plan', 'result', 'before', 'ready', 'fresh'];

// Native operations are injected exclusively by the existing public prep wrapper.
// Unit tests use explicit simulated ports; this module never launches a process.
export function reopenEntrySurface({ profilePath, outDir, reopenDir, dryRun = false }, ports) {
  const source = loadBinaryEntrySurfaceSource({ profilePath, outDir });
  const createdAt = clock(ports);
  check(isAbsolute(reopenDir), 'REOPEN_ABSOLUTE_DIRECTORY_REQUIRED');
  const root = resolve(reopenDir);
  check(!existsSync(root), 'REOPEN_DIRECTORY_EXISTS'); canonicalDirectory(dirname(root));
  const initial = ports.inspect(); zeroProcesses(initial);
  const postSaveProfile = json(readBound(source.source.postSaveProfile));
  const binaryProfile = buildEntryReopenBinaryProfile({ source, postSaveProfile });
  const binaryPath = join(root, 'binary-profile.json'), binaryBytes = serialize(binaryProfile);
  const built = buildEntryReopenPrepContext({ source, postSaveProfile, rootDir: root,
    profilePath: binaryPath, profileSha256: hash(binaryBytes) });
  const prepPath = join(root, 'preparation-profile.json'), prepBytes = serialize(built.prepProfile);
  const producer = producerSet(ports.producerFiles);
  const request = { version: REQUEST, requestId: randomUUID(), createdAt,
    expiresAt: new Date(Date.parse(createdAt) + 30 * 60 * 1000).toISOString(), source,
    prepProfile: identity(prepPath, prepBytes), binaryProfile: identity(binaryPath, binaryBytes),
    prepOutDir: join(root, 'live', 'prep'), producer, safety: SAFETY };
  if (dryRun) return { ok: true, command: 'entry-reopen-dry-run', status: 'cold_reopen_planned',
    source, target: built.target, reopenDir: root, stateSource: ports.stateSource ?? 'host-read-only',
    safety: { ...SAFETY, writesEvidence: false, launchesToolset: false } };
  // Preserve every historical source and every failed attempt. Never reuse a root.
  mkdirSync(root); writeOnce(binaryPath, binaryBytes); writeOnce(prepPath, prepBytes);
  const requestPath = join(root, 'reopen-request.v1.json'); writeOnce(requestPath, serialize(request));
  let preparationStarted = false;
  try {
    const current = loadBinaryEntrySurfaceSource({ profilePath, outDir });
    check(equal(source, current), 'REOPEN_SOURCE_DRIFT');
    check(equal(producerSet(ports.producerFiles), producer), 'REOPEN_PRODUCER_DRIFT');
    preparationStarted = true;
    ports.prepare({ ...built, profilePath: prepPath, profileSha256: hash(prepBytes),
      binaryProfilePath: binaryPath, prepOutDir: request.prepOutDir, rootDir: root, source });
    const fresh = ports.inspect();
    check(equal(loadBinaryEntrySurfaceSource({ profilePath, outDir }), source), 'REOPEN_SOURCE_DRIFT');
    check(equal(producerSet(ports.producerFiles), producer), 'REOPEN_PRODUCER_DRIFT');
    const paths = { plan: join(request.prepOutDir, 'plan.json'), result: join(request.prepOutDir, 'prep-result.json'),
      before: join(request.prepOutDir, 'state-before.json'), ready: join(request.prepOutDir, 'state-ready.json'),
      fresh: join(root, 'state-admission.json') };
    writeOnce(paths.fresh, serialize(fresh));
    const data = Object.fromEntries(DOCUMENTS.map(key => [key, json(read(paths[key]))]));
    const acceptedAt = clock(ports);
    const verdict = validateReopenPreparation({ source, request, ...data, now: acceptedAt });
    const steps = readSteps(data.result, request, verdict.owner, data.ready.capturedAtUtc);
    const receipt = { version: RECEIPT, status: 'same_saved_module_reopened', request: fileIdentity(requestPath),
      requestId: request.requestId, acceptedAt, owner: verdict.owner, target: source.target,
      files: Object.fromEntries(DOCUMENTS.map(key => [key, fileIdentity(paths[key])])),
      steps: steps.map(step => step.ref),
      evidenceScope: 'reopen_ownership_only', evidenceAuthority: 'central_local_producer',
      fileValidatorAuthenticatesProducer: false, safety: SAFETY };
    const receiptPath = join(root, 'reopen-receipt.v1.json'); writeOnce(receiptPath, serialize(receipt));
    return { ok: true, command: 'entry-reopen', status: receipt.status, receiptPath,
      owner: receipt.owner, sourceModule: source.target.module, safety: SAFETY, liveQualificationRequired: true };
  } catch (error) {
    writeOnce(join(root, 'reopen-blocker.json'), serialize({ version: 'aurora-entry-reopen-blocker/v1',
      status: 'failed', requestId: request.requestId, blockerCode: error.code ?? 'REOPEN_PREPARATION_FAILED',
      message: String(error.message).slice(0, 1000), preparationStarted, safety: SAFETY,
      disposition: 'preserve_attempt_and_live_session; no_automatic_retry_or_historical_owner_fallback' }));
    throw error;
  }
}

export function armReopenedEntrySurface({ receiptPath, evidenceDir }, ports) {
  const bundle = loadReopenBundle(receiptPath);
  const verdict = validateReopenBundle(bundle);
  const source = loadBinaryEntrySurfaceSource({ profilePath: bundle.request.source.source.profile.path,
    outDir: dirname(bundle.request.source.source.manifest.path) });
  check(equal(source, bundle.request.source), 'REOPEN_SOURCE_DRIFT');
  check(equal(producerSet(ports.producerFiles), bundle.receipt.continuation?.producer ?? bundle.request.producer), 'REOPEN_PRODUCER_DRIFT');
  const state = ports.inspect(), now = clock(ports);
  validateReopenArmState({ owner: verdict.owner, target: source.target, state,
    notBefore: bundle.receipt.acceptedAt, now });
  check(equal(loadBinaryEntrySurfaceSource({ profilePath: source.source.profile.path,
    outDir: dirname(source.source.manifest.path) }), source), 'REOPEN_SOURCE_DRIFT');
  check(equal(producerSet(ports.producerFiles), bundle.receipt.continuation?.producer ?? bundle.request.producer), 'REOPEN_PRODUCER_DRIFT');
  // ARM snapshots this complete admission so later Paint may legitimately change MOD.
  return armEntrySurface({ profilePath: source.source.profile.path, outDir: dirname(source.source.manifest.path),
    evidenceDir, now, reopenedSession: { version: 'aurora-entry-reopen-arm-admission/v1', bundle, state, checkedAt: now } });
}

// Only finish the known final title-validation failure. The completed cold
// preparation, original request/expiry and source history are never rewritten.
export function resumeReopenTitleValidation({ reopenDir, upgradePath, dryRun = false }, ports) {
  const root = resolve(reopenDir); canonicalDirectory(root);
  const receiptPath = join(root, 'reopen-receipt.v1.json'), resumeDir = join(root, 'title-validation-resume');
  check(!existsSync(receiptPath) && !existsSync(resumeDir), 'REOPEN_TITLE_RESUME_ALREADY_DISPATCHED');
  const frozen = titleResumeFrozenFiles(root), request = json(readBound(frozen.request));
  const upgradeBytes = read(upgradePath), upgrade = json(upgradeBytes);
  const blocker = json(readBound(frozen.blocker)), failedState = json(readBound(frozen.failedState));
  const producer = producerSet(ports.producerFiles);
  validateTitleValidationUpgrade({ request, upgrade, currentProducer: producer, failedState, blocker, files: frozen });
  const source = loadBinaryEntrySurfaceSource({ profilePath: request.source.source.profile.path,
    outDir: dirname(request.source.source.manifest.path) });
  check(equal(source, request.source), 'REOPEN_SOURCE_DRIFT');
  check(Number.isFinite(Date.parse(clock(ports))) && Date.parse(clock(ports)) <= Date.parse(request.expiresAt), 'REOPEN_REQUEST_WINDOW_INVALID');
  const files = Object.fromEntries(['plan', 'result', 'before', 'ready'].map(key => [key, json(readBound(frozen[key]))]));
  const fresh = ports.inspect(), now = clock(ports);
  const verdict = validateReopenPreparation({ source, request, ...files, fresh, now });
  check(equal(readReopenStateOwner({ state: failedState, target: source.target }), verdict.owner), 'REOPEN_TITLE_RESUME_OWNER_MISMATCH');
  check(Date.parse(files.ready.capturedAtUtc) <= Date.parse(failedState.capturedAtUtc)
    && Date.parse(failedState.capturedAtUtc) <= Date.parse(fresh.capturedAtUtc), 'REOPEN_TITLE_RESUME_TIME_INVALID');
  const steps = readSteps(files.result, request, verdict.owner, files.ready.capturedAtUtc);
  check(equal(titleResumeFrozenFiles(root), frozen), 'REOPEN_TITLE_FROZEN_DRIFT');
  check(equal(loadBinaryEntrySurfaceSource({ profilePath: source.source.profile.path, outDir: dirname(source.source.manifest.path) }), source), 'REOPEN_SOURCE_DRIFT');
  check(equal(producerSet(ports.producerFiles), producer), 'REOPEN_PRODUCER_DRIFT');
  if (dryRun) return { ok: true, status: 'title_validation_resume_admitted', owner: verdict.owner,
    requestId: request.requestId, expiresAt: request.expiresAt, safety: { ...SAFETY, launchesToolset: false, writesEvidence: false } };
  mkdirSync(resumeDir);
  const freshPath = join(resumeDir, 'state-admission.json'), upgradeSnapshot = join(resumeDir, 'upgrade.json');
  writeOnce(freshPath, serialize(fresh)); writeOnce(upgradeSnapshot, upgradeBytes);
  const receipt = { version: RECEIPT, status: 'same_saved_module_reopened', request: frozen.request,
    requestId: request.requestId, acceptedAt: now, owner: verdict.owner, target: source.target,
    files: { plan: frozen.plan, result: frozen.result, before: frozen.before, ready: frozen.ready, fresh: fileIdentity(freshPath) },
    steps: steps.map(step => step.ref),
    continuation: { version: 'aurora-entry-reopen-title-validation-resume/v1', upgrade: fileIdentity(upgradeSnapshot),
      originalState: frozen.failedState, blocker: frozen.blocker, producer },
    evidenceScope: 'reopen_ownership_only', evidenceAuthority: 'central_local_producer', fileValidatorAuthenticatesProducer: false, safety: SAFETY };
  writeOnce(receiptPath, serialize(receipt));
  return { ok: true, status: receipt.status, receiptPath, owner: receipt.owner, safety: { ...SAFETY, launchesToolset: false } };
}

export function titleResumeFrozenFiles(root) {
  const requestPath = join(root, 'reopen-request.v1.json'), request = json(read(requestPath));
  const paths = { request: requestPath, blocker: join(root, 'reopen-blocker.json'), failedState: join(root, 'state-admission.json'),
    plan: join(root, 'live', 'prep', 'plan.json'), result: join(root, 'live', 'prep', 'prep-result.json'),
    before: join(root, 'live', 'prep', 'state-before.json'), ready: join(root, 'live', 'prep', 'state-ready.json'),
    prepProfile: join(root, 'preparation-profile.json'), binaryProfile: join(root, 'binary-profile.json') };
  check(samePath(request.prepOutDir, join(root, 'live', 'prep')), 'REOPEN_FOREIGN_SESSION_EVIDENCE');
  const result = json(read(paths.result));
  check(Array.isArray(result.steps) && result.steps.length >= 2 && result.steps.length <= 3, 'REOPEN_STEPS_INCOMPLETE');
  for (const [index, step] of result.steps.entries()) {
    check(samePath(step.resultPath, join(request.prepOutDir, `${step.name}.json`)), 'REOPEN_FOREIGN_SESSION_EVIDENCE');
    paths[`step${index}`] = step.resultPath;
  }
  return Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, fileIdentity(path)]));
}

export function validateReopenedSession(admission, source, armTime) {
  check(admission?.version === 'aurora-entry-reopen-arm-admission/v1'
    && admission.checkedAt === armTime, 'REOPEN_ARM_ADMISSION_INVALID');
  const verdict = validateReopenBundle(admission.bundle);
  check(equal(admission.bundle.request.source, source), 'REOPEN_SOURCE_DRIFT');
  validateReopenArmState({ owner: verdict.owner, target: source.target, state: admission.state,
    notBefore: admission.bundle.receipt.acceptedAt, now: armTime });
  return verdict.owner;
}

function loadReopenBundle(receiptPath) {
  const receiptBytes = read(receiptPath), receipt = json(receiptBytes), requestBytes = readBound(receipt.request);
  const request = json(requestBytes), files = {}, raw = {};
  const root = dirname(resolve(receiptPath));
  validateBundleLayout(receipt, request, root);
  for (const key of DOCUMENTS) { const bytes = readBound(receipt.files?.[key]); files[key] = json(bytes); raw[key] = bytes.toString('base64'); }
  check(Array.isArray(receipt.steps) && receipt.steps.length >= 2 && receipt.steps.length <= 3, 'REOPEN_STEPS_INCOMPLETE');
  const steps = receipt.steps.map(ref => ({ ref, raw: readBound(ref).toString('base64') }));
  return { receipt, request, files, raw: { ...raw, request: requestBytes.toString('base64') },
    steps,
    ...(receipt.continuation ? { continuation: { upgrade: readBound(receipt.continuation.upgrade).toString('base64'),
      failedState: readBound(receipt.continuation.originalState).toString('base64'), blocker: readBound(receipt.continuation.blocker).toString('base64') } } : {}),
    prepProfile: readBound(request.prepProfile).toString('base64'), binaryProfile: readBound(request.binaryProfile).toString('base64') };
}

function validateBundleLayout(receipt, request, root) {
  check(samePath(receipt.request.path, join(root, 'reopen-request.v1.json'))
    && samePath(request.prepProfile?.path, join(root, 'preparation-profile.json'))
    && samePath(request.binaryProfile?.path, join(root, 'binary-profile.json'))
    && samePath(request.prepOutDir, join(root, 'live', 'prep')), 'REOPEN_FOREIGN_SESSION_EVIDENCE');
  const expected = { plan: join(request.prepOutDir, 'plan.json'), result: join(request.prepOutDir, 'prep-result.json'),
    before: join(request.prepOutDir, 'state-before.json'), ready: join(request.prepOutDir, 'state-ready.json'),
    fresh: receipt.continuation ? join(root, 'title-validation-resume', 'state-admission.json') : join(root, 'state-admission.json') };
  for (const key of DOCUMENTS) check(samePath(receipt.files?.[key]?.path, expected[key]), 'REOPEN_FOREIGN_SESSION_EVIDENCE');
  if (receipt.continuation) check(receipt.continuation.version === 'aurora-entry-reopen-title-validation-resume/v1'
    && samePath(receipt.continuation.upgrade?.path, join(root, 'title-validation-resume', 'upgrade.json'))
    && samePath(receipt.continuation.originalState?.path, join(root, 'state-admission.json'))
    && samePath(receipt.continuation.blocker?.path, join(root, 'reopen-blocker.json')), 'REOPEN_TITLE_RESUME_LAYOUT_INVALID');
}

function validateReopenBundle(bundle) {
  const { receipt, request, files, raw } = bundle ?? {};
  check(receipt?.version === RECEIPT && receipt.status === 'same_saved_module_reopened'
    && receipt.requestId === request?.requestId && request.version === REQUEST
    && receipt.evidenceScope === 'reopen_ownership_only' && equal(receipt.safety, SAFETY), 'REOPEN_RECEIPT_INVALID');
  check(typeof request.prepProfile?.path === 'string', 'REOPEN_EVIDENCE_INCOMPLETE');
  validateBundleLayout(receipt, request, dirname(request.prepProfile.path));
  checkBoundRaw(raw?.request, receipt.request, request);
  for (const key of DOCUMENTS) checkBoundRaw(raw?.[key], receipt.files?.[key], files?.[key]);
  const prepProfile = checkBoundRaw(bundle.prepProfile, request.prepProfile);
  const binaryProfile = checkBoundRaw(bundle.binaryProfile, request.binaryProfile);
  check(equal(binaryProfile, buildEntryReopenBinaryProfile({ source: request.source, postSaveProfile: binaryProfile })), 'REOPEN_BINARY_PROFILE_INVALID');
  const built = buildEntryReopenPrepContext({ source: request.source, postSaveProfile: binaryProfile,
    rootDir: dirname(request.prepProfile.path), profilePath: request.binaryProfile.path, profileSha256: request.binaryProfile.sha256 });
  check(equal(prepProfile, built.prepProfile), 'REOPEN_PREP_PROFILE_INVALID');
  const verdict = validateReopenPreparation({ source: request.source, request, ...files, now: receipt.acceptedAt });
  if (receipt.continuation) {
    const c = receipt.continuation, upgrade = checkBoundRaw(bundle.continuation?.upgrade, c.upgrade),
      failedState = checkBoundRaw(bundle.continuation?.failedState, c.originalState), blocker = checkBoundRaw(bundle.continuation?.blocker, c.blocker);
    const frozen = { request: receipt.request, blocker: c.blocker, failedState: c.originalState,
      plan: receipt.files.plan, result: receipt.files.result, before: receipt.files.before, ready: receipt.files.ready,
      prepProfile: request.prepProfile, binaryProfile: request.binaryProfile,
      ...Object.fromEntries(receipt.steps.map((ref, index) => [`step${index}`, ref])) };
    validateTitleValidationUpgrade({ request, upgrade, currentProducer: c.producer, failedState, blocker, files: frozen });
    check(equal(readReopenStateOwner({ state: failedState, target: request.source.target }), verdict.owner), 'REOPEN_TITLE_RESUME_OWNER_MISMATCH');
    check(Date.parse(files.ready.capturedAtUtc) <= Date.parse(failedState.capturedAtUtc)
      && Date.parse(failedState.capturedAtUtc) <= Date.parse(files.fresh.capturedAtUtc), 'REOPEN_TITLE_RESUME_TIME_INVALID');
  }
  check(equal(bundle.steps?.map(step => step.ref), receipt.steps), 'REOPEN_STEPS_INCOMPLETE');
  validateSteps(bundle.steps, files.result, request, verdict.owner, files.ready.capturedAtUtc);
  check(equal(verdict.owner, receipt.owner) && equal(receipt.target, request.source.target), 'REOPEN_RECEIPT_OWNER_TARGET_MISMATCH');
  return verdict;
}

function readSteps(result, request, owner, readyAt) {
  const steps = result.steps.map(step => { const bytes = read(step.resultPath); return { ref: identity(step.resultPath, bytes), raw: bytes.toString('base64') }; });
  validateSteps(steps, result, request, owner, readyAt); return steps;
}
function validateSteps(steps, result, request, owner, readyAt) {
  check(Array.isArray(steps) && steps.length === result.steps.length, 'REOPEN_STEPS_INCOMPLETE');
  for (const [index, item] of steps.entries()) {
    const expected = result.steps[index], step = checkBoundRaw(item.raw, item.ref);
    check(samePath(item.ref.path, join(request.prepOutDir, `${expected.name}.json`))
      && samePath(item.ref.path, expected.resultPath) && step.name === expected.name
      && step.result && step.result.ok !== false && step.result.status !== 'blocked'
      && Date.parse(step.completedAtUtc) >= Date.parse(request.createdAt)
      && Date.parse(step.completedAtUtc) <= Date.parse(result.createdAtUtc), 'REOPEN_CHILD_STEP_INVALID');
    if (expected.name === 'cold-open') validateReopenColdOpenResult({ result: step.result, request, owner, completedAt: step.completedAtUtc, readyAt });
  }
}

export function producerSet(paths) {
  check(Array.isArray(paths) && paths.length > 0 && paths.length < 500, 'REOPEN_PRODUCER_SET_INVALID');
  return [...new Set(paths.map(path => resolve(path)))].sort().map(fileIdentity);
}
function zeroProcesses(state) {
  check(Array.isArray(state?.nwmain) && Array.isArray(state?.toolsets), 'REOPEN_PROCESS_STATE_INVALID');
  check(state.nwmain.length === 0 && state.toolsets.length === 0, 'REOPEN_PROCESS_PRESENT');
}
function canonicalDirectory(path) { check(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink()
  && resolve(realpathSync.native(path)).toLowerCase() === resolve(path).toLowerCase(), 'REOPEN_DIRECTORY_NOT_CANONICAL'); }
function clock(ports) { const value = ports.now?.() ?? new Date().toISOString(); check(Number.isFinite(Date.parse(value)), 'REOPEN_TIME_INVALID'); return value; }
function read(path) { check(typeof path === 'string' && statSync(path).isFile() && statSync(path).size <= 32 * 1024 * 1024, 'REOPEN_FILE_INVALID'); return readFileSync(path); }
function fileIdentity(path) { return identity(path, read(path)); }
function identity(path, bytes) { return { path: resolve(path), sha256: hash(bytes), bytes: bytes.length }; }
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function readBound(ref) { const bytes = read(ref?.path); check(hash(bytes) === ref.sha256 && bytes.length === ref.bytes, 'REOPEN_EVIDENCE_DRIFT'); return bytes; }
function checkBoundRaw(raw, ref, parsed) { check(typeof raw === 'string' && ref, 'REOPEN_EVIDENCE_INCOMPLETE'); const bytes = Buffer.from(raw, 'base64');
  check(hash(bytes) === ref.sha256 && bytes.length === ref.bytes, 'REOPEN_EVIDENCE_DRIFT'); const value = json(bytes);
  if (parsed !== undefined) check(equal(value, parsed), 'REOPEN_EVIDENCE_DRIFT'); return value; }
function serialize(value) { return Buffer.from(JSON.stringify(value, null, 2) + '\n'); }
function json(bytes) { return JSON.parse(bytes.toString('utf8')); }
function writeOnce(path, bytes) { writeFileSync(path, bytes, { flag: 'wx' }); }
function equal(a, b) { return isDeepStrictEqual(a, b); }
function samePath(a, b) { return typeof a === 'string' && typeof b === 'string' && resolve(a).toLowerCase() === resolve(b).toLowerCase(); }
function check(condition, code) { if (!condition) { const error = new Error(code); error.code = code; throw error; } }
