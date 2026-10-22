import { win32 } from 'node:path';

const VERSION = 'aur-s07-runtime-window-policy/v1';
const fail = code => { throw new Error('runtime_window_' + code); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pathEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && win32.normalize(a).toLowerCase() === win32.normalize(b).toLowerCase();
const positive = value => Number.isSafeInteger(value) && value > 0;
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

// Preserve Windows' 100 ns process identity; Date.parse alone drops precision.
function ticks(value) {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,7}))?Z$/u.exec(value ?? '');
  const milliseconds = match && Date.parse(match[1] + 'Z');
  if (!match || !Number.isFinite(milliseconds)) fail('timestamp_invalid');
  return BigInt(milliseconds) * 10000n + BigInt((match[2] ?? '').padEnd(7, '0'));
}
function rect(value) {
  return value && ['left', 'top', 'right', 'bottom', 'width', 'height'].every(key => Number.isFinite(value[key])) &&
    value.width > 0 && value.height > 0 && value.right === value.left + value.width && value.bottom === value.top + value.height;
}
function inside(inner, outer) { return rect(inner) && rect(outer) && inner.left >= outer.left && inner.top >= outer.top && inner.right <= outer.right && inner.bottom <= outer.bottom; }

export function validateRuntimeWindowPolicy(policy) {
  if (policy === undefined) return;
  if (!policy || !same(Object.keys(policy).sort(), ['expectedDevice', 'placement', 'primary', 'version']) ||
      policy.version !== VERSION || policy.placement !== 'working-area' || policy.primary !== false ||
      typeof policy.expectedDevice !== 'string' || !/^\\\\\.\\DISPLAY\d+$/u.test(policy.expectedDevice)) fail('policy_invalid');
}

function validateCommandLine(commandLine, modulePath) {
  if (!win32.isAbsolute(modulePath) || win32.basename(win32.dirname(modulePath)).toLowerCase() !== 'modules') fail('module_directory_invalid');
  if (typeof commandLine !== 'string' || !commandLine.trim()) fail('command_line_missing');
  if (/[\r\n]/u.test(commandLine)) fail('command_line_invalid');
  const tokens = []; const pattern = /[ \t]*(?:"([^"\r\n]*)"|([^ \t"\r\n]+))(?=[ \t]|$)/gy;
  let offset = 0;
  while (offset < commandLine.length) {
    if (!commandLine.slice(offset).trim()) break;
    pattern.lastIndex = offset;
    const match = pattern.exec(commandLine);
    if (!match) fail('command_line_invalid');
    tokens.push(match[1] ?? match[2]); offset = pattern.lastIndex;
  }
  // Toolset's evidenced command line may omit the executable token.
  if (tokens[0] && win32.basename(tokens[0]).toLowerCase() === 'nwmain.exe') tokens.shift();
  if (tokens.length !== 4 || tokens[0].toLowerCase() !== '-userdirectory' || tokens[2].toLowerCase() !== '+testnewmodule' ||
      !pathEqual(tokens[1], win32.dirname(win32.dirname(modulePath))) ||
      tokens[3].toLowerCase() !== win32.basename(modulePath, win32.extname(modulePath)).toLowerCase()) fail('command_line_target_mismatch');
}

function admission(profile, profileSha256, evidence, state) {
  validateRuntimeWindowPolicy(profile.runtimeWindow);
  if (!profile.runtimeWindow) fail('policy_required');
  if (profile.launch?.mode !== 'central_guarded_test_module_action' || profile.launch.processName !== 'nwmain') fail('central_dispatch_required');
  const { request, dispatch, handoff, observation, bindings } = evidence;
  const versions = { request: 'aur-s07-runtime-launch-request/v1', dispatch: 'aur-s07-runtime-test-module-dispatch/v1', handoff: 'aur-s07-runtime-handoff/v1', observation: 'aur-s07-runtime-observation/v1' };
  for (const [kind, version] of Object.entries(versions)) {
    const value = evidence[kind];
    if (value?.version !== version || value.profileId !== profile.id || value.profileSha256 !== profileSha256 ||
        value.moduleSha256 !== profile.module.sha256 || value.area !== profile.module.area || !same(value.entryPoint, profile.module.entryPoint) ||
        !bindings?.[kind]?.path || !hash(bindings[kind].sha256)) fail('lineage_mismatch_' + kind);
    if (kind !== 'observation' && (!pathEqual(value.modulePath, profile.module.path) || value.requestId !== request.requestId)) fail('request_mismatch_' + kind);
  }
  if (!request.requestId || request.action !== profile.launch.mode || dispatch.atom?.ok !== true || dispatch.atom.status !== 'posted' ||
      dispatch.atom.requestsNwnStart !== true || dispatch.atom.usesGlobalInput !== false || !positive(dispatch.atom.processId) || !positive(dispatch.atom.frameHwnd) ||
      dispatch.atom.module?.toLowerCase() !== win32.basename(profile.module.path).toLowerCase() ||
      !pathEqual(handoff.dispatchPath, bindings.dispatch.path) || !pathEqual(observation.handoffPath, bindings.handoff.path)) fail('dispatch_binding_invalid');
  const requestTime = ticks(request.createdAt), dispatchTime = ticks(dispatch.dispatchedAt), observedTime = ticks(observation.observedAt);
  if (dispatchTime < requestTime || ticks(handoff.createdAt) !== dispatchTime || observedTime < dispatchTime || ticks(state.capturedAtUtc) < observedTime) fail('lineage_time_invalid');
  if (!Array.isArray(state.processes) || state.processes.length !== 1 || !Array.isArray(state.parents) || state.parents.length !== 1) fail('process_count_invalid');
  const process = state.processes[0], parent = state.parents[0], observed = observation.process;
  if (process.name !== 'nwmain' || !positive(process.pid) || process.pid !== observed?.pid || process.responding !== true ||
      !positive(process.mainWindowHandle) || process.mainWindowHandle !== observed.mainWindowHandle ||
      ticks(process.startedAt) !== ticks(observed.startedAt) || ticks(process.startedAt) < requestTime || ticks(process.startedAt) > observedTime) fail('process_identity_invalid');
  if (parent.name !== 'nwtoolset' || parent.pid !== dispatch.atom.processId || process.parentPid !== parent.pid ||
      parent.responding !== true || ticks(parent.startedAt) > requestTime) fail('parent_identity_invalid');
  validateCommandLine(process.commandLine, profile.module.path);
  const window = state.window;
  if (window?.hwnd !== process.mainWindowHandle || window.ownerPid !== process.pid || window.visible !== true || window.iconic !== false || !rect(window.bounds) ||
      !Array.isArray(state.visibleWindows) || state.visibleWindows.length !== 1 || state.visibleWindows[0].hwnd !== window.hwnd || state.visibleWindows[0].ownerPid !== process.pid) fail('window_identity_invalid');
  const targets = state.screens?.filter(screen => screen.primary === false);
  if (!targets || targets.length !== 1 || targets[0].deviceName !== profile.runtimeWindow.expectedDevice || !inside(targets[0].workingArea, targets[0].bounds)) fail('target_monitor_invalid');
  return { process, parent, window, target: targets[0], bindings };
}

function fingerprint(admitted) {
  return { process: admitted.process, parent: admitted.parent, window: admitted.window, target: admitted.target, bindings: admitted.bindings };
}

function validateAfter(before, after, result) {
  const expected = before.target.workingArea;
  if (!same(before.process, after.process) || !same(before.parent, after.parent) || !same(before.target, after.target) ||
      before.window.hwnd !== after.window.hwnd || !same(after.window.bounds, expected)) fail('after_identity_or_bounds_invalid');
  if (result?.ok !== true || result.status !== 'verified' || result.process?.name !== 'nwmain' || result.process.pid !== before.process.pid ||
      ticks(result.process.startedAtUtc) !== ticks(before.process.startedAt) || result.process.responding !== true ||
      result.window?.hwnd !== before.window.hwnd || result.window.ownerPid !== before.process.pid || !same(result.window.before, before.window.bounds) || !same(result.window.after, expected) ||
      result.monitor?.deviceName !== before.target.deviceName || result.monitor.primary !== false ||
      result.monitor.workingArea?.left !== expected.left || result.monitor.workingArea.top !== expected.top || result.monitor.workingArea.width !== expected.width || result.monitor.workingArea.height !== expected.height) fail('atom_result_invalid');
  const safety = result.safety;
  if (!safety || ['usesGlobalCursor', 'usesGlobalMouse', 'usesGlobalKeyboard', 'changesZOrder', 'activatesWindow'].some(key => safety[key] !== false) ||
      !same(safety.setWindowPosFlags, ['SWP_NOZORDER', 'SWP_NOACTIVATE'])) fail('atom_safety_invalid');
}

// Side effects are injected: this is the public route's actual transaction,
// exercised offline with mock readers/writers and a mock of the existing atom.
export function prepareRuntimeWindow({ profile, profileSha256, outputDirectory, dryRun }, deps) {
  validateRuntimeWindowPolicy(profile.runtimeWindow);
  if (!profile.runtimeWindow) fail('policy_required');
  const intentPath = win32.join(outputDirectory, 'aur-s07-runtime-window-intent.json');
  const resultPath = win32.join(outputDirectory, 'aur-s07-runtime-window-result.json');
  if (deps.exists(intentPath) || deps.exists(resultPath)) fail('already_attempted');
  const evidence = deps.loadEvidence();
  const state = deps.readState();
  const before = admission(profile, profileSha256, evidence, state);
  const plan = { version: 'aur-s07-runtime-window-preparation/v1', status: 'admitted', profileId: profile.id, profileSha256,
    moduleSha256: profile.module.sha256, requestId: evidence.request.requestId, policy: profile.runtimeWindow,
    before: state, evidence: before.bindings, packetValidatorCoversPreparation: false,
    startsNwn: false, usesGlobalInput: false, changesZOrder: false, activatesWindow: false };
  if (dryRun) return plan;
  deps.writeExclusive(intentPath, { ...plan, status: 'intent-recorded', createdAtUtc: deps.now() });
  let atomResult = null, afterState = null;
  try {
    const current = admission(profile, profileSha256, deps.loadEvidence(), deps.readState());
    if (!same(fingerprint(before), fingerprint(current))) fail('before_action_drift');
    atomResult = deps.prepare({ pid: before.process.pid, startedAtUtc: before.process.startedAt, expectedDevice: before.target.deviceName, expectedHwnd: before.window.hwnd });
    afterState = deps.readState();
    const after = admission(profile, profileSha256, deps.loadEvidence(), afterState);
    if (!same(before.bindings, after.bindings)) fail('evidence_changed_after_action');
    validateAfter(before, after, atomResult);
    const result = { ...plan, status: 'verified', completedAtUtc: deps.now(), intentPath, after: afterState, atomResult };
    deps.writeExclusive(resultPath, result);
    return { ...result, resultPath };
  } catch (error) {
    deps.writeExclusive(resultPath, { ...plan, status: 'failed', failedAtUtc: deps.now(), intentPath, after: afterState, atomResult, error: String(error?.message ?? error), retryAllowed: false });
    throw error;
  }
}
