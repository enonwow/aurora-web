import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

const screenDevice = '\\\\.\\DISPLAY1';
const validTime = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
const validOwner = value => value && ['pid', 'frameHwnd', 'viewportHwnd'].every(key => Number.isSafeInteger(value[key]) && value[key] > 0) && validTime(value.startedAt);
const sameOwner = (actual, expected) => ['pid', 'frameHwnd', ...['viewportHwnd', 'viewerHwnd'].filter(key => expected[key] !== undefined)].every(key => actual[key] === expected[key]) && Date.parse(actual.startedAt) === Date.parse(expected.startedAt);

// Binding is caller intent. It is deliberately not presented as a measured MOD,
// entry point, or proof of a native Paint action.
export function validateCaptureRequestBinding(value) {
  if (value === undefined) return undefined;
  const owner = value?.owner;
  const validExpectedOwner = owner && ['pid', 'frameHwnd', ...['viewportHwnd', 'viewerHwnd'].filter(key => owner[key] !== undefined)].every(key => Number.isSafeInteger(owner[key]) && owner[key] > 0) && validTime(owner.startedAt);
  if (!value || typeof value !== 'object' || typeof value.requestId !== 'string' || !value.requestId.trim() || value.requestId.length > 200 || !validTime(value.notBefore) || !validExpectedOwner || !value.target || typeof value.target !== 'object' || Array.isArray(value.target)) throw new Error('capture_binding_invalid');
  return structuredClone(value);
}

export function finalizeViewportCapture(result, pngBytes, requestBinding) {
  const binding = validateCaptureRequestBinding(requestBinding);
  if (result?.ok !== true) throw new Error('capture_not_successful');
  if (!validTime(result.captureStartedAt) || !validTime(result.capturedAt) || Date.parse(result.capturedAt) < Date.parse(result.captureStartedAt)) throw new Error('capture_time_invalid');
  if (!validOwner(result.owner) || !result.identityBefore || !result.identityAfter || !isDeepStrictEqual(result.identityBefore, result.identityAfter) || !sameOwner(result.owner, result.identityBefore.owner)) throw new Error('capture_identity_changed');
  if (result.moduleTitle !== result.identityBefore.moduleTitle || result.areaViewerTitle !== result.identityBefore.areaViewerTitle) throw new Error('capture_identity_changed');
  if (binding && !sameOwner(result.owner, binding.owner)) throw new Error('capture_owner_binding_mismatch');
  if (binding && Date.parse(result.captureStartedAt) < Date.parse(binding.notBefore)) throw new Error('capture_predates_request');
  const safety = result.safety;
  if (safety?.validatedTScrollBox !== true || safety.usesGlobalCursor !== false || safety.usesGlobalKeyboard !== false || safety.usesGlobalMouse !== false || safety.moduleScreenDevice !== screenDevice || safety.moduleScreenPrimary !== false || result.identityBefore.screenDevice !== screenDevice || result.identityBefore.screenPrimary !== false) throw new Error('capture_safety_invalid');
  if (String(safety.method).startsWith('physical-pixel')) {
    const samples = result.physicalOwnership;
    if (safety.windowFromPointVerified !== true || samples?.allStable !== true || !Array.isArray(samples.before) || samples.before.length !== 5 || !isDeepStrictEqual(samples.before, samples.after) || samples.before.some(point => point.owned !== true || point.ownerPid !== result.owner.pid || !Number.isSafeInteger(point.hwnd) || point.hwnd <= 0)) throw new Error('capture_physical_ownership_unverified');
  }
  const bytes = Buffer.from(pngBytes);
  if (bytes.length < 45 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.readUInt32BE(8) !== 13 || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.toString('ascii', bytes.length - 8, bytes.length - 4) !== 'IEND') throw new Error('capture_png_invalid');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height || width !== result.viewport?.width || height !== result.viewport?.height) throw new Error('capture_png_dimensions_mismatch');
  if (!isDeepStrictEqual(result.viewport, result.identityBefore.viewport)) throw new Error('capture_identity_changed');
  const { identityBefore, identityAfter, ...rest } = result;
  return {
    ...rest,
    version: 'aurora-toolset-viewport-capture/v2',
    status: 'verified',
    evidenceScope: 'capture_integrity_only',
    nativeEntrySurfaceVerified: false,
    png: { path: result.pngPath, sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, width, height },
    stability: { verified: true, before: identityBefore, after: identityAfter },
    safety: { ...safety, usesGlobalInput: false },
    ...(binding ? { requestBinding: binding } : {}),
  };
}
