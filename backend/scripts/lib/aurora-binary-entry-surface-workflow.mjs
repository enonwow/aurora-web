import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { loadBinaryEntrySurfaceSource } from "./aurora-binary-entry-surface-inspection.mjs";
import { ENTRY_READ_ONLY_SAFETY, validateBinaryEntrySurfaceSource, readEntrySurfaceModuleBytes,
  validatePaintModuleDelta, validateEntrySurfaceCapture } from "./aurora-binary-entry-surface-contract.mjs";
import { validateReopenedSession } from "./aurora-binary-entry-reopen-workflow.mjs";

export const HUMAN_WITNESS_VERSION = "aurora-entry-surface-human-witness/v2";
const REQUEST_VERSION = "aurora-entry-surface-request/v2";
const RECEIPT_VERSION = "aurora-entry-surface-observation/v2";
const GEOMETRY_VERSION = "aurora-toolset-binary-native-geometry-profile/v2";
const BASIS = "human_observed_native_paint_walk_admission";
const REQUEST_NAME = "entry-surface-request.v2.json";
const RECEIPT_NAME = "entry-surface-observation.v2.json";
const CLAIMS = ["used_native_paint_start_location", "clicked_visible_surface", "saved_module"];

export function armEntrySurface({ profilePath, outDir, evidenceDir, now = new Date().toISOString(), reopenedSession }) {
  const source = loadBinaryEntrySurfaceSource({ profilePath, outDir });
  const admittedOwner = reopenedSession === undefined ? null : validateReopenedSession(reopenedSession, source, now);
  check(typeof evidenceDir === "string" && !existsSync(resolve(evidenceDir)), "ENTRY_EVIDENCE_DIRECTORY_EXISTS");
  check(Number.isFinite(Date.parse(now)), "ENTRY_TIME_INVALID");
  const dir = resolve(evidenceDir);
  // Read every original before creating the new artifact directory.
  const originals = {
    manifest: read(source.source.manifest.path), profile: read(source.source.profile.path),
    postSaveProfile: read(source.source.postSaveProfile.path), module: read(source.target.module.path, 128 * 1024 * 1024),
  };
  for (const key of Object.keys(originals)) check(hash(originals[key]) === (key === "module" ? source.target.module.sha256 : source.source[key].sha256), "ENTRY_SOURCE_CHANGED_DURING_ARM");
  mkdirSync(dir);
  const snapshots = {};
  for (const [key, bytes] of Object.entries(originals)) {
    const path = join(dir, key === "module" ? "source.mod" : `source-${key}.json`);
    writeOnce(path, bytes); snapshots[key] = identity(path, bytes);
  }
  const owner = { ...(admittedOwner ?? source.owner) }; delete owner.livenessVerified;
  const request = {
    version: REQUEST_VERSION, requestId: randomUUID(), createdAt: now,
    expiresAt: new Date(Date.parse(now) + 15 * 60 * 1000).toISOString(),
    status: "awaiting_real_human_paint_and_save", source, snapshots,
    ...(reopenedSession === undefined ? {} : { reopenedSession }),
    captureBinding: { requestId: null, notBefore: now, owner, target: source.target },
    requiredWitness: { version: HUMAN_WITNESS_VERSION, actorKind: "human", claims: CLAIMS,
      sourceKind: "user_message", requiresActualUserResponse: true, fileValidatorAuthenticatesHuman: false },
    allowedDelta: { moduleHashMayChange: true, fields: ["Mod_Entry_X", "Mod_Entry_Y", "Mod_Entry_Z", "Mod_Entry_Dir_X", "Mod_Entry_Dir_Y"],
      otherIfoFieldsUnchanged: true, otherResourcesByteIdentical: true, orderedHaksUnchanged: true },
    safety: { ...ENTRY_READ_ONLY_SAFETY, readsSavedFilesOnly: false, writesNewEvidenceOnly: true },
  };
  request.captureBinding.requestId = request.requestId;
  const requestPath = join(dir, REQUEST_NAME), bindingPath = join(dir, "capture-binding.v2.json");
  writeJsonOnce(bindingPath, request.captureBinding); writeJsonOnce(requestPath, request);
  return { ok: true, command: "geometry-entry-surface-arm", status: request.status,
    requestPath, bindingPath, requestId: request.requestId, expiresAt: request.expiresAt,
    sourceModule: source.target.module, safety: request.safety, proofClaimed: false, runtimeClaimed: false };
}

export function ingestEntrySurface({ evidenceDir, handoffPath, now = new Date().toISOString() }) {
  const dir = resolve(evidenceDir), requestPath = join(dir, REQUEST_NAME);
  const requestFile = read(requestPath), request = json(requestFile);
  const source = checkRequest(request);
  const handoffFile = read(handoffPath), handoff = json(handoffFile);
  exactKeys(handoff, ["version", "requestId", "capture", "witnessPath"]);
  check(handoff.version === "aurora-entry-surface-handoff/v2" && handoff.requestId === request.requestId, "ENTRY_HANDOFF_REQUEST_MISMATCH");
  exactKeys(handoff.capture, ["sidecarPath", "pngPath"]);
  const receiptPath = join(dir, RECEIPT_NAME);
  if (existsSync(receiptPath)) {
    const receipt = json(read(receiptPath));
    check(receipt.handoffSha256 === hash(handoffFile), "ENTRY_NONCE_ALREADY_CONSUMED");
    const verified = verifyReceipt(dir);
    return { ok: true, command: "geometry-entry-surface-ingest", status: "observation_recorded", receiptPath,
      idempotentReplay: true, entryDelta: verified.receipt.entryDelta, proofClaimed: false, runtimeClaimed: false };
  }
  const nowMs = Date.parse(now);
  check(Number.isFinite(nowMs) && nowMs <= Date.parse(request.expiresAt) && nowMs >= Date.parse(request.createdAt), "ENTRY_REQUEST_EXPIRED");
  if (!handoff.witnessPath) return { ok: true, command: "geometry-entry-surface-ingest", status: "human_confirmation_pending", requestId: request.requestId, proofClaimed: false, runtimeClaimed: false };
  const witnessBytes = read(handoff.witnessPath), witness = json(witnessBytes);
  const sidecarBytes = read(handoff.capture.sidecarPath), sidecar = json(sidecarBytes);
  checkReopenedCaptureOwner(request, sidecar);
  const png = read(handoff.capture.pngPath, 32 * 1024 * 1024);
  const targetBytes = read(source.target.module.path, 128 * 1024 * 1024);
  const delta = validatePaintModuleDelta(read(request.snapshots.module.path, 128 * 1024 * 1024), targetBytes, source.target.area);
  const target = { ...source.target, module: { ...source.target.module, sha256: hash(targetBytes), bytes: targetBytes.length },
    entry: delta.after.entry, git: delta.after.git };
  const binding = validateEntrySurfaceCapture({ sidecar, pngBytes: png, pngPath: handoff.capture.pngPath,
    ...captureInputs(request, now) });
  validateWitness(witness, request, binding, now);
  validateSavedCaptureTarget(sidecar, target, source.target.module.path);
  const savedAt = statSync(source.target.module.path).mtimeMs;
  check(savedAt >= Date.parse(request.createdAt) && savedAt <= Date.parse(sidecar.captureStartedAt), "ENTRY_SAVE_OUTSIDE_REQUEST_CAPTURE_INTERVAL");
  check(hash(read(source.target.module.path, 128 * 1024 * 1024)) === target.module.sha256, "ENTRY_TARGET_CHANGED_DURING_INGEST");
  const files = {};
  for (const [key, fileName, bytes] of [["targetModule", "target.mod", targetBytes], ["witness", "human-witness.v2.json", witnessBytes],
    ["capture", "entry-capture.png", png], ["sidecar", "entry-capture.v2.json", sidecarBytes], ["handoff", "handoff.v2.json", handoffFile]]) {
    const path = join(dir, fileName); writeOnce(path, bytes); files[key] = identity(path, bytes);
  }
  const receipt = { version: RECEIPT_VERSION, status: "recorded_human_reported_native_paint", requestId: request.requestId,
    request: identity(requestPath, requestFile), sourceManifestSha256: source.source.manifest.sha256,
    acceptedAt: now, handoffSha256: hash(handoffFile), files, target, entryDelta: delta.entryDelta,
    childSave: { basis: "human_reported_native_save_with_saved_file_readback",
      moduleSha256: target.module.sha256, moduleBytes: target.module.bytes,
      lastWriteTimeUtc: new Date(savedAt).toISOString(), entry: target.entry },
    basis: BASIS, witnessAuthority: "human_reported", fileValidatorAuthenticatesHuman: false,
    proofScope: "nativePaintWalkAdmission", runtimeClaimed: false };
  writeJsonOnce(receiptPath, receipt);
  return { ok: true, command: "geometry-entry-surface-ingest", status: "observation_recorded", receiptPath,
    basis: BASIS, witnessAuthority: "human_reported", entryDelta: delta.entryDelta, targetModule: target.module,
    proofClaimed: false, runtimeClaimed: false, safety: { ...ENTRY_READ_ONLY_SAFETY, readsSavedFilesOnly: false, writesNewEvidenceOnly: true } };
}

export function finalizeEntrySurface({ evidenceDir }) {
  const dir = resolve(evidenceDir), verified = verifyReceipt(dir);
  const geometryProfile = buildGeometry(verified), geometryProfilePath = join(dir, "binary-native-geometry-profile.v2.json");
  writeJsonOnce(geometryProfilePath, geometryProfile);
  return { ok: true, command: "geometry-entry-surface-finalize", ...validateGeometryArtifact(geometryProfilePath) };
}

export function validateGeometryArtifact(geometryProfilePath) {
  const geometryProfile = json(read(geometryProfilePath));
  if (geometryProfile?.version === "aurora-toolset-binary-native-geometry-profile/v1") {
    return { status: "legacy_unqualified", geometryProfile, geometryProfilePath: resolve(geometryProfilePath),
      requiresRequalification: true, proofClaimed: false, runtimeClaimed: false };
  }
  check(geometryProfile?.version === GEOMETRY_VERSION, "ENTRY_GEOMETRY_VERSION_INVALID");
  const verified = verifyReceipt(dirname(resolve(geometryProfilePath)));
  check(equal(geometryProfile, buildGeometry(verified)), "ENTRY_GEOMETRY_PROFILE_MISMATCH");
  return { status: "verified", geometryProfile, geometryProfilePath: resolve(geometryProfilePath),
    sourceModule: verified.request.source.target.module, targetModule: verified.receipt.target.module,
    basis: BASIS, witnessAuthority: "human_reported", fileValidatorAuthenticatesHuman: false,
    proofScope: "nativePaintWalkAdmission", runtimeClaimed: false, safety: { ...ENTRY_READ_ONLY_SAFETY } };
}

function verifyReceipt(dir) {
  const requestPath = join(dir, REQUEST_NAME), requestBytes = read(requestPath), request = json(requestBytes), source = checkRequest(request);
  const receiptPath = join(dir, RECEIPT_NAME), receiptBytes = read(receiptPath), receipt = json(receiptBytes);
  check(receipt.version === RECEIPT_VERSION && receipt.status === "recorded_human_reported_native_paint"
    && receipt.requestId === request.requestId && receipt.request.sha256 === hash(requestBytes)
    && receipt.sourceManifestSha256 === source.source.manifest.sha256 && receipt.basis === BASIS
    && receipt.witnessAuthority === "human_reported" && receipt.fileValidatorAuthenticatesHuman === false,
  "ENTRY_RECEIPT_INVALID");
  const bytes = Object.fromEntries(Object.entries(receipt.files).map(([key, item]) => {
    check(samePath(dirname(item.path), dir), "ENTRY_ARTIFACT_PATH_INVALID");
    const value = read(item.path, key === "targetModule" ? 128 * 1024 * 1024 : 32 * 1024 * 1024);
    check(hash(value) === item.sha256 && value.length === item.bytes, "ENTRY_ARTIFACT_HASH_MISMATCH"); return [key, value];
  }));
  const delta = validatePaintModuleDelta(read(request.snapshots.module.path, 128 * 1024 * 1024), bytes.targetModule, source.target.area);
  check(hash(bytes.targetModule) === receipt.target.module.sha256 && bytes.targetModule.length === receipt.target.module.bytes
    && equal(receipt.target.entry, delta.after.entry) && equal(receipt.target.git, delta.after.git)
    && equal(receipt.target.orderedHakList, source.target.orderedHakList)
    && receipt.target.area === source.target.area && samePath(receipt.target.module.path, source.target.module.path)
    && receipt.target.module.resref === source.target.module.resref
    && equal(receipt.entryDelta, delta.entryDelta), "ENTRY_RECEIPT_TARGET_MISMATCH");
  const sidecar = json(bytes.sidecar), witness = json(bytes.witness), handoff = json(bytes.handoff);
  checkReopenedCaptureOwner(request, sidecar);
  const childSave = receipt.childSave;
  check(childSave?.basis === "human_reported_native_save_with_saved_file_readback"
    && childSave.moduleSha256 === receipt.target.module.sha256 && childSave.moduleBytes === receipt.target.module.bytes
    && equal(childSave.entry, receipt.target.entry) && Number.isFinite(Date.parse(childSave.lastWriteTimeUtc))
    && Date.parse(childSave.lastWriteTimeUtc) >= Date.parse(request.createdAt)
    && Date.parse(childSave.lastWriteTimeUtc) <= Date.parse(sidecar.captureStartedAt), "ENTRY_CHILD_SAVE_READBACK_MISMATCH");
  check(handoff.requestId === request.requestId && hash(bytes.handoff) === receipt.handoffSha256, "ENTRY_HANDOFF_REQUEST_MISMATCH");
  const binding = validateEntrySurfaceCapture({ sidecar, pngBytes: bytes.capture, pngPath: sidecar.png.path,
    ...captureInputs(request, receipt.acceptedAt) });
  validateWitness(witness, request, binding, receipt.acceptedAt);
  validateSavedCaptureTarget(sidecar, receipt.target, source.target.module.path);
  check(hash(read(source.target.module.path, 128 * 1024 * 1024)) === receipt.target.module.sha256, "ENTRY_CURRENT_TARGET_MISMATCH");
  return { request, receipt, receiptIdentity: identity(receiptPath, receiptBytes), sourceProfile: json(read(request.snapshots.profile.path)), sourceManifest: json(read(request.snapshots.manifest.path)) };
}

function checkRequest(request) {
  check(request?.version === REQUEST_VERSION && typeof request.requestId === "string" && request.requestId.length > 0
    && Date.parse(request.expiresAt) > Date.parse(request.createdAt)
    && Date.parse(request.expiresAt) - Date.parse(request.createdAt) === 15 * 60 * 1000, "ENTRY_REQUEST_INVALID");
  const originals = {};
  for (const key of ["manifest", "profile", "postSaveProfile", "module"]) {
    const snapshot = request.snapshots?.[key]; check(snapshot, "ENTRY_SOURCE_SNAPSHOT_MISSING");
    const bytes = read(snapshot.path, key === "module" ? 128 * 1024 * 1024 : 16 * 1024 * 1024);
    check(hash(bytes) === snapshot.sha256 && bytes.length === snapshot.bytes, "ENTRY_SOURCE_SNAPSHOT_CHANGED"); originals[key] = bytes;
    const original = key === "module" ? request.source.target.module : request.source.source[key];
    check(hash(bytes) === original.sha256 && bytes.length === original.bytes, "ENTRY_SOURCE_SNAPSHOT_BINDING_MISMATCH");
  }
  const haks = request.source.target.orderedHakList.map((hak) => identity(hak.path, read(hak.path, 512 * 1024 * 1024)));
  const measured = validateBinaryEntrySurfaceSource({ manifest: json(originals.manifest), profile: json(originals.profile),
    postSaveProfile: json(originals.postSaveProfile),
    identities: { ...request.source.source, module: request.source.target.module, haks },
    packed: readEntrySurfaceModuleBytes(originals.module, request.source.target.area) });
  check(equal(measured, request.source), "ENTRY_REQUEST_SOURCE_MISMATCH");
  const expectedOwner = { ...(request.reopenedSession === undefined ? measured.owner
    : validateReopenedSession(request.reopenedSession, measured, request.createdAt)) }; delete expectedOwner.livenessVerified;
  check(equal(request.captureBinding, { requestId: request.requestId, notBefore: request.createdAt, owner: expectedOwner, target: measured.target }), "ENTRY_REQUEST_CAPTURE_BINDING_MISMATCH");
  return measured;
}

function validateWitness(witness, request, capture, acceptedAt) {
  exactKeys(witness, ["version", "requestId", "actorKind", "source", "statement", "claims", "captureSha256"]);
  exactKeys(witness.source, ["kind", "reference", "receivedAt"]);
  check(witness.version === HUMAN_WITNESS_VERSION && witness.requestId === request.requestId
    && witness.actorKind === "human" && witness.source.kind === "user_message"
    && typeof witness.source.reference === "string" && witness.source.reference.trim().length > 0
    && typeof witness.statement === "string" && witness.statement.trim().length > 0 && witness.statement.length <= 8000
    && equal(witness.claims, CLAIMS) && witness.captureSha256 === capture.png.sha256,
  "ENTRY_REAL_HUMAN_WITNESS_REQUIRED");
  const received = Date.parse(witness.source.receivedAt);
  check(Number.isFinite(received) && received >= Date.parse(request.createdAt) && received <= Date.parse(acceptedAt), "ENTRY_WITNESS_TIME_INVALID");
  // The host must supply a real user response. File validation cannot
  // authenticate a person and never upgrades this to authenticated evidence.
}

function validateSavedCaptureTarget(sidecar, target, modulePath) {
  const before = sidecar.stability.before;
  check(String(before.moduleTitle).toLowerCase().endsWith(` - ${basename(modulePath).toLowerCase()}`)
    && String(before.areaViewerTitle).trim().replace(/^-\s*/u, "").toLowerCase() === target.area, "ENTRY_CAPTURE_WINDOW_TARGET_MISMATCH");
}
function checkReopenedCaptureOwner(request, sidecar) {
  if (request.reopenedSession === undefined) return;
  const owner = request.captureBinding.owner;
  check([sidecar.owner, sidecar.stability?.before?.owner, sidecar.stability?.after?.owner].every(actual =>
    actual && ['pid', 'startedAt', 'frameHwnd', 'viewerHwnd', 'viewportHwnd'].every(key => actual[key] === owner[key])),
  'REOPEN_CAPTURE_OWNER_MISMATCH');
}
function captureInputs(request, now) { return { target: request.captureBinding.target, owner: request.captureBinding.owner,
  requestId: request.requestId, notBefore: request.createdAt, expiresAt: request.expiresAt, now }; }
function buildGeometry({ request, receipt, receiptIdentity, sourceProfile, sourceManifest }) {
  return { version: GEOMETRY_VERSION, id: `${sourceProfile.id}:native-entry-v2`,
    module: receipt.target.module, area: sourceProfile.area, orderedHakList: receipt.target.orderedHakList,
    entryPoint: { area: receipt.target.area, ...receipt.target.entry, accessibleSurface: true },
    fixtures: sourceProfile.fixtures.map((fixture) => ({ ...fixture, accessibleSurface: true, nativeSaveAccepted: true, savedGitReadback: true })),
    sourceNativeSave: sourceManifest.nativeSave,
    childSave: receipt.childSave,
    observation: { version: RECEIPT_VERSION, requestId: request.requestId, receipt: receiptIdentity,
      sourceManifestSha256: request.source.source.manifest.sha256, sourceModuleSha256: request.source.target.module.sha256,
      targetModuleSha256: receipt.target.module.sha256, entryDelta: receipt.entryDelta,
      basis: BASIS, witnessAuthority: "human_reported", fileValidatorAuthenticatesHuman: false },
    validationBasis: { entry: BASIS, fixtures: "unchanged_source_native_save_readback", runtimeReachability: "not_evaluated" },
    proofScope: "nativePaintWalkAdmission", runtimeClaimed: false, noLocalToolsetAdapter: true };
}
function exactKeys(value, keys) { check(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every((key) => keys.includes(key)), "ENTRY_UNSUPPORTED_INPUT_FIELD"); }
function read(path, max = 16 * 1024 * 1024) { check(typeof path === "string" && statSync(path).isFile() && statSync(path).size <= max, "ENTRY_ARTIFACT_INVALID"); return readFileSync(path); }
function identity(path, bytes) { return { path: resolve(path), sha256: hash(bytes), bytes: bytes.length }; }
function hash(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function json(bytes) { try { return JSON.parse(bytes.toString("utf8")); } catch { check(false, "ENTRY_JSON_INVALID"); } }
function writeOnce(path, bytes) { if (existsSync(path)) { check(readFileSync(path).equals(bytes), "ENTRY_IMMUTABLE_ARTIFACT_EXISTS"); return; } writeFileSync(path, bytes, { flag: "wx" }); }
function writeJsonOnce(path, value) { writeOnce(path, Buffer.from(JSON.stringify(value, null, 2) + "\n")); }
function samePath(a, b) { return typeof a === "string" && typeof b === "string" && resolve(a).toLowerCase() === resolve(b).toLowerCase(); }
function sorted(value) { if (Array.isArray(value)) return value.map(sorted); return value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sorted(value[key])])) : value; }
function equal(a, b) { return JSON.stringify(sorted(a)) === JSON.stringify(sorted(b)); }
function check(condition, code) { if (!condition) { const error = new Error(code); error.code = code; throw error; } }
