import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { finalizeViewportCapture, validateCaptureRequestBinding } from '../../scripts/lib/aurora-viewport-capture-provenance.mjs';

const startedAt = '2026-09-06T10:00:00.000Z';
const owner = { pid: 17, startedAt, frameHwnd: 100, viewerHwnd: 101, viewportHwnd: 102 };
const viewport = { left: -900, top: 40, width: 1, height: 1 };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const snapshot = () => ({ owner: { ...owner }, viewport: { ...viewport }, moduleTitle: 'Aurora - test.mod', areaViewerTitle: 'test_area', screenDevice: '\\\\.\\DISPLAY1', screenPrimary: false });
const raw = () => ({ ok: true, moduleTitle: 'Aurora - test.mod', areaViewerTitle: 'test_area', captureStartedAt: '2026-09-06T10:01:00.000Z', capturedAt: '2026-09-06T10:01:00.250Z', owner: { ...owner }, viewport: { ...viewport }, identityBefore: snapshot(), identityAfter: snapshot(), pngPath: 'capture.png', safety: { validatedTScrollBox: true, method: 'read-only BitBlt(GetWindowDC) of validated TScrollBox viewport', windowFromPointVerified: false, usesGlobalCursor: false, usesGlobalKeyboard: false, usesGlobalMouse: false, moduleScreenDevice: '\\\\.\\DISPLAY1', moduleScreenPrimary: false } });
const binding = () => ({ requestId: 'request-17', notBefore: '2026-09-06T10:00:30.000Z', owner: { ...owner }, target: { module: { sha256: 'a'.repeat(64) }, area: 'test_area' } });

test('capture receipt measures actual PNG and owner without promoting an entry-surface claim', () => {
  const result = finalizeViewportCapture(raw(), png, binding());
  assert.equal(result.version, 'aurora-toolset-viewport-capture/v2');
  assert.equal(result.evidenceScope, 'capture_integrity_only');
  assert.equal(result.nativeEntrySurfaceVerified, false);
  assert.deepEqual(result.owner, owner);
  assert.equal(result.png.sha256, createHash('sha256').update(png).digest('hex'));
  assert.equal(result.png.bytes, png.length);
  assert.deepEqual([result.png.width, result.png.height], [1, 1]);
  assert.equal(result.stability.verified, true);
  assert.deepEqual(result.requestBinding, binding());
  assert.equal(result.target, undefined);
});

test('foreign/restarted process, changed HWND, rectangle, title or monitor fail closed', () => {
  for (const mutate of [r => r.identityAfter.owner.pid++, r => r.identityAfter.owner.startedAt = '2026-09-06T10:01:01.000Z', r => r.identityAfter.owner.viewportHwnd++, r => r.identityAfter.viewport.left++, r => r.identityAfter.moduleTitle = 'other.mod', r => r.identityAfter.screenPrimary = true]) {
    const result = raw(); mutate(result);
    assert.throws(() => finalizeViewportCapture(result, png, binding()), /capture_identity_changed/);
  }
  const expected = binding(); expected.owner.pid++;
  assert.throws(() => finalizeViewportCapture(raw(), png, expected), /capture_owner_binding_mismatch/);
  const staleTitle = raw(); staleTitle.moduleTitle = 'Aurora - other.mod';
  assert.throws(() => finalizeViewportCapture(staleTitle, png), /capture_identity_changed/);
});

test('stale capture or invalid time cannot bind to a new request', () => {
  const stale = binding(); stale.notBefore = '2026-09-06T10:01:00.100Z';
  assert.throws(() => finalizeViewportCapture(raw(), png, stale), /capture_predates_request/);
  const invalid = raw(); invalid.capturedAt = 'tomorrow';
  assert.throws(() => finalizeViewportCapture(invalid, png), /capture_time_invalid/);
  const backwards = raw(); backwards.capturedAt = '2026-09-06T10:00:59.000Z';
  assert.throws(() => finalizeViewportCapture(backwards, png), /capture_time_invalid/);
});

test('text, truncated PNG, mismatched dimensions and failed captures are rejected', () => {
  assert.throws(() => finalizeViewportCapture(raw(), Buffer.from('not an image')), /capture_png_invalid/);
  assert.throws(() => finalizeViewportCapture(raw(), png.subarray(0, 28)), /capture_png_invalid/);
  const wrongSize = raw(); wrongSize.viewport.width = 2;
  assert.throws(() => finalizeViewportCapture(wrongSize, png), /capture_png_dimensions_mismatch/);
  const failed = raw(); failed.ok = false;
  assert.throws(() => finalizeViewportCapture(failed, png), /capture_not_successful/);
});

test('physical captures require WindowFromPoint; HWND captures do not invent it', () => {
  const screen = raw(); screen.safety.method = 'physical-pixel capture of validated TScrollBox rectangle after WindowFromPoint ownership verification';
  assert.throws(() => finalizeViewportCapture(screen, png), /capture_physical_ownership_unverified/);
  screen.safety.windowFromPointVerified = true;
  const points = Array.from({ length: 5 }, (_, i) => ({ x: i, y: i, hwnd: 102, ownerPid: 17, owned: true }));
  screen.physicalOwnership = { before: points, after: structuredClone(points), allStable: true };
  assert.equal(finalizeViewportCapture(screen, png).safety.windowFromPointVerified, true);
  screen.physicalOwnership.after[0].hwnd = 888;
  assert.throws(() => finalizeViewportCapture(screen, png), /capture_physical_ownership_unverified/);
  screen.physicalOwnership.after = structuredClone(points);
  screen.physicalOwnership.before[0].owned = false;
  screen.physicalOwnership.after[0].owned = false;
  assert.throws(() => finalizeViewportCapture(screen, png), /capture_physical_ownership_unverified/);
  const primary = raw(); primary.safety.moduleScreenPrimary = true;
  assert.throws(() => finalizeViewportCapture(primary, png), /capture_safety_invalid/);
});

test('request binding is optional but requires explicit valid identity and time when used', () => {
  assert.equal(validateCaptureRequestBinding(undefined), undefined);
  assert.throws(() => validateCaptureRequestBinding({ requestId: 'r' }), /capture_binding_invalid/);
  const invalid = binding(); invalid.owner.startedAt = 'bad';
  assert.throws(() => validateCaptureRequestBinding(invalid), /capture_binding_invalid/);
  assert.deepEqual(validateCaptureRequestBinding(binding()), binding());
  const inherited = binding(); delete inherited.owner.viewportHwnd; delete inherited.owner.viewerHwnd;
  assert.equal(finalizeViewportCapture(raw(), png, inherited).owner.viewportHwnd, 102);
});
