import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import { finalizeViewportCapture } from "./aurora-viewport-capture-provenance.mjs";
import { NATIVE_GIT_INVENTORY_VERSION, NATIVE_INVENTORY_SOURCE_VERSION,
  readNativeSaveGitInventory, validateNativeSaveGitInventory } from "./aurora-native-save-git-inventory.mjs";
import {
  parseErfArchive, parseGff, requiredResource, requiredField,
  readString, readInteger, readFloat, readList,
} from "./aurora-model-proof-120s-erf-gff-readback.mjs";

const SHA256 = /^[a-f0-9]{64}$/u;
const RESREF = /^[a-z0-9_]{1,16}$/u;
export const ENTRY_SOURCE_VERSION = "aurora-binary-entry-surface-source/v2";
export const ENTRY_CAPTURE_VERSION = "aurora-toolset-viewport-capture/v2";
export const ENTRY_READ_ONLY_SAFETY = Object.freeze({
  readsSavedFilesOnly: true, startsToolset: false, startsNwn: false,
  usesGlobalInput: false, probesProcesses: false, probesWindows: false,
  capturesViewport: false, savesModule: false, mutatesSourceManifest: false,
});

// This module has no filesystem, child-process, native input or capture ports.
// Every positive result below describes integrity/binding, not walkability.
export function readEntrySurfaceModuleBytes(input, areaResref, { sourcePolicy = ENTRY_SOURCE_VERSION } = {}) {
  check([ENTRY_SOURCE_VERSION, NATIVE_GIT_INVENTORY_VERSION].includes(sourcePolicy), "ENTRY_SOURCE_POLICY_INVALID");
  check(RESREF.test(areaResref), "ENTRY_AREA_INVALID");
  const bytes = Buffer.from(input);
  const archive = parseErfArchive(bytes, "MOD ");
  const ifo = parseGff(requiredResource(archive, "module", 2014), "IFO ");
  const area = readString(requiredField(ifo.root, "Mod_Entry_Area"));
  check(area === areaResref, "ENTRY_AREA_MISMATCH");
  const are = parseGff(requiredResource(archive, area, 2012), "ARE ");
  const gitBytes = requiredResource(archive, area, 2023);
  const git = parseGff(gitBytes, "GIT ");
  const list = (parsed, label) => {
    const field = parsed.root.fields.find((item) => item.label === label);
    return field ? readList(requiredField(parsed.root, label), parsed) : [];
  };
  const optionalString = (struct, label) => struct.fields.some((field) => field.label === label)
    ? readString(requiredField(struct, label)) : null;
  const object = (struct) => ({
    templateResRef: readString(requiredField(struct, "TemplateResRef")),
    tag: optionalString(struct, "Tag"),
    appearanceType: readInteger(requiredField(struct, "Appearance_Type")),
    position: vector(struct, ["XPosition", "YPosition", "ZPosition"]),
  });
  return {
    moduleSha256: sha256(bytes), moduleBytes: bytes.length, area,
    entry: {
      position: vector(ifo.root, ["Mod_Entry_X", "Mod_Entry_Y", "Mod_Entry_Z"]),
      direction: vector(ifo.root, ["Mod_Entry_Dir_X", "Mod_Entry_Dir_Y"]),
    },
    orderedHakResrefs: list(ifo, "Mod_HakList").map((item) => readString(requiredField(item, "Mod_Hak"))),
    areaDetails: {
      width: readInteger(requiredField(are.root, "Width")),
      height: readInteger(requiredField(are.root, "Height")),
      tileSet: readString(requiredField(are.root, "Tileset")),
      tileCount: list(are, "Tile_List").length,
    },
    git: sourcePolicy === NATIVE_GIT_INVENTORY_VERSION ? { sha256: sha256(gitBytes), ...readNativeSaveGitInventory(git) } : {
      sha256: sha256(gitBytes), creatures: list(git, "Creature List").map(object),
      placeables: list(git, "Placeable List").map(object),
    },
  };
}

export function validateBinaryEntrySurfaceSource({ manifest, profile, postSaveProfile, identities, packed, sourcePolicy = ENTRY_SOURCE_VERSION }) {
  check([ENTRY_SOURCE_VERSION, NATIVE_GIT_INVENTORY_VERSION].includes(sourcePolicy), "ENTRY_SOURCE_POLICY_INVALID");
  const nativeInventory = sourcePolicy === NATIVE_GIT_INVENTORY_VERSION;
  check(nativeInventory ? packed?.git?.version === NATIVE_GIT_INVENTORY_VERSION : packed?.git?.version === undefined, "ENTRY_SOURCE_POLICY_MISMATCH");
  check(manifest?.version === "aurora-toolset-binary-native-geometry-manifest/v1"
    && manifest.status === "geometry_saved_pending_entry_observation"
    && manifest.profileKind === "model-fixture-geometry", "ENTRY_SOURCE_MANIFEST_INVALID");
  check(profile?.version === "aurora-toolset-binary-module-bootstrap-profile/v1"
    && profile.id && profile.id === manifest.profileId, "ENTRY_SOURCE_PROFILE_INVALID");
  for (const key of ["manifest", "profile", "postSaveProfile", "module"]) validateIdentity(identities?.[key]);
  check(samePath(manifest.profilePath, identities.profile.path)
    && manifest.profileSha256 === identities.profile.sha256
    && samePath(manifest.postSaveProfilePath, identities.postSaveProfile.path)
    && samePath(manifest.artifactDir, dirname(identities.manifest.path)), "ENTRY_SOURCE_IDENTITY_MISMATCH");
  check(equal(manifest.module, profile.module), "ENTRY_SOURCE_MODULE_MISMATCH");
  check(RESREF.test(profile.module?.resref) && RESREF.test(profile.area?.resref), "ENTRY_SOURCE_RESREF_INVALID");
  const normalizedPostSave = structuredClone(postSaveProfile);
  check(normalizedPostSave?.module, "ENTRY_POST_SAVE_PROFILE_INVALID");
  normalizedPostSave.module.sha256 = profile.module.sha256;
  normalizedPostSave.module.bytes = profile.module.bytes;
  check(equal(profile, normalizedPostSave), "ENTRY_POST_SAVE_PROFILE_LINEAGE_MISMATCH");
  const measured = identities.module;
  check(samePath(measured.path, profile.module.path)
    && measured.sha256 === postSaveProfile.module.sha256
    && measured.sha256 === packed.moduleSha256 && measured.bytes === packed.moduleBytes,
  "ENTRY_POST_SAVE_MODULE_MISMATCH");
  const structural = manifest.postSaveStructural;
  check(structural?.ok === true && structural.status === "binary_bootstrap_structural_readback_valid"
    && structural.module?.sha256 === measured.sha256
    && samePath(structural.module.path, measured.path), "ENTRY_POST_SAVE_STRUCTURAL_MISMATCH");
  const save = manifest.nativeSave;
  check(save?.areaWasSaved === true && save.invalidLocationsDialog === false
    && save.inaccessibleObjectsDialog === false && save.statusText === "Area was saved"
    && save.save?.ok === true && samePath(save.save.modulePath, measured.path)
    && save.save.after?.bytes === measured.bytes
    && (save.save.after.sha256 == null || String(save.save.after.sha256).toLowerCase() === measured.sha256),
  "ENTRY_NATIVE_SAVE_RECEIPT_INVALID");
  const diagnostics = [];
  const staleFields = [postSaveProfile.module.bytes, structural.module.bytes];
  if (staleFields.some((bytes) => bytes !== measured.bytes)) {
    check(staleFields.every((bytes) => bytes === profile.module.bytes)
      && save.save.before?.bytes === profile.module.bytes, "ENTRY_POST_SAVE_BYTES_MISMATCH");
    diagnostics.push({ code: "LEGACY_POST_SAVE_BYTES_STALE", declaredBytes: profile.module.bytes,
      measuredBytes: measured.bytes, sourcePreserved: true });
  }
  check(equal(manifest.area, profile.area) && packed.area === profile.area.resref
    && packed.areaDetails.width === profile.area.width && packed.areaDetails.height === profile.area.height
    && packed.areaDetails.tileSet === profile.area.tileSet
    && packed.areaDetails.tileCount === profile.area.width * profile.area.height, "ENTRY_AREA_READBACK_MISMATCH");
  const entry = manifest.nativeEntryReadback;
  check(entry?.moduleSha256 === measured.sha256 && samePath(entry.modulePath, measured.path)
    && entry.area === packed.area && equal(entry.position, packed.entry.position)
    && equal(entry.direction, packed.entry.direction)
    && profile.entryPoint?.area === packed.area
    && equal(profile.entryPoint.position, packed.entry.position)
    && equal(profile.entryPoint.direction, packed.entry.direction), "ENTRY_TUPLE_READBACK_MISMATCH");
  check(Array.isArray(profile.orderedHakList) && profile.orderedHakList.length > 0
    && profile.orderedHakList.length === identities.haks?.length
    && equal(profile.orderedHakList.map((hak) => hak.resref), packed.orderedHakResrefs), "ENTRY_HAK_ORDER_MISMATCH");
  const orderedHakList = profile.orderedHakList.map((hak, index) => {
    const actual = identities.haks[index]; validateIdentity(actual);
    check(samePath(hak.path, actual.path) && hak.sha256 === actual.sha256
      && (hak.bytes == null || hak.bytes === actual.bytes), "ENTRY_HAK_IDENTITY_MISMATCH");
    return { ...actual, resref: hak.resref };
  });
  const git = manifest.nativeGitReadback;
  check(git?.moduleSha256 === measured.sha256 && samePath(git.modulePath, measured.path)
    && git.area === packed.area && git.gitSha256 === packed.git.sha256, "ENTRY_GIT_READBACK_MISMATCH");
  let requiredFixtureBindings;
  if (nativeInventory) {
    requiredFixtureBindings = validateNativeSaveGitInventory({ receipt: git, git: packed.git, fixtures: profile.fixtures });
  } else {
    check(equal(normalizeObjects(git.creatures), normalizeObjects(packed.git.creatures))
      && equal(normalizeObjects(git.placeables), normalizeObjects(packed.git.placeables)), "ENTRY_GIT_READBACK_MISMATCH");
    check(Array.isArray(profile.fixtures) && profile.fixtures.length > 0
      && profile.fixtures.length === packed.git.creatures.length + packed.git.placeables.length,
    "ENTRY_FIXTURE_COUNT_MISMATCH");
    const objects = [...packed.git.creatures, ...packed.git.placeables];
    for (const fixture of profile.fixtures) {
      const matches = objects.filter((object) => object.templateResRef === fixture.templateResRef
        && object.appearanceType === fixture.appearanceType && equal(object.position, fixture.position)
        && (fixture.tag == null || object.tag === fixture.tag));
      check(matches.length === 1, "ENTRY_FIXTURE_READBACK_MISMATCH");
    }
  }
  const ownerProcess = manifest.open?.process;
  const startedAt = normalizedTime(ownerProcess?.StartTime);
  check(Number.isSafeInteger(ownerProcess?.Id) && ownerProcess.Id > 0
    && ownerProcess.Id === save.save.processId && startedAt
    && Number.isSafeInteger(save.save.frameHwnd) && save.save.frameHwnd > 0, "ENTRY_OWNER_RECEIPT_INVALID");
  return {
    version: nativeInventory ? NATIVE_INVENTORY_SOURCE_VERSION : ENTRY_SOURCE_VERSION, status: "native_entry_observation_missing",
    ...(nativeInventory ? { requiredFixtureBindings } : {}),
    source: { kind: "binary_native_geometry_post_save", manifest: identities.manifest,
      profile: identities.profile, postSaveProfile: identities.postSaveProfile },
    target: { module: { ...measured, resref: profile.module.resref }, orderedHakList,
      area: packed.area, entry: structuredClone(packed.entry), git: structuredClone(packed.git) },
    owner: { pid: ownerProcess.Id, startedAt, frameHwnd: save.save.frameHwnd, livenessVerified: false },
    diagnostics, semanticVerdict: "not_evaluated", proofClaimed: false, runtimeClaimed: false,
    safety: { ...ENTRY_READ_ONLY_SAFETY },
  };
}

export function validateEntrySurfaceTransition({ source, after, parentSourceSha256, actionReceipt }) {
  check(source?.version === ENTRY_SOURCE_VERSION && parentSourceSha256 === source.source?.manifest?.sha256,
    "ENTRY_LINEAGE_MISMATCH");
  validateIdentity(after?.module);
  check(after.module.resref === source.target.module.resref && samePath(after.module.path, source.target.module.path), "ENTRY_LINEAGE_MODULE_MISMATCH");
  check(equal(after.orderedHakList, source.target.orderedHakList), "ENTRY_HAK_TRANSITION_MISMATCH");
  check(after.area === source.target.area && equal(after.entry, source.target.entry), "ENTRY_TUPLE_TRANSITION_UNQUALIFIED");
  check(equal(after.git, source.target.git), "ENTRY_GIT_TRANSITION_MISMATCH");
  // A later qualified central Paint producer may admit an audited entry delta.
  // No caller-supplied boolean or purported observer identity is accepted here.
  return { version: "aurora-entry-surface-transition-binding/v2",
    status: actionReceipt == null ? "native_action_receipt_missing" : "native_action_receipt_unqualified",
    sourceModuleSha256: source.target.module.sha256, targetModuleSha256: after.module.sha256,
    semanticVerdict: "not_evaluated", proofClaimed: false, runtimeClaimed: false };
}

export function validateEntrySurfaceCapture({ sidecar, pngBytes, pngPath, target, owner, requestId, notBefore, now, expiresAt }) {
  check(sidecar?.version === ENTRY_CAPTURE_VERSION && sidecar.status === "verified"
    && sidecar.evidenceScope === "capture_integrity_only" && sidecar.nativeEntrySurfaceVerified === false
    && sidecar.requestBinding?.requestId === requestId
    && typeof requestId === "string" && requestId.length > 0, "ENTRY_CAPTURE_REQUEST_MISMATCH");
  const bindingOwner = { ...owner }; delete bindingOwner.livenessVerified;
  check(equal(sidecar.requestBinding.target, target) && equal(sidecar.requestBinding.owner, bindingOwner)
    && Date.parse(sidecar.requestBinding.notBefore) === Date.parse(notBefore), "ENTRY_CAPTURE_TARGET_MISMATCH");
  check(sidecar.owner?.pid === owner.pid && sidecar.owner.frameHwnd === owner.frameHwnd
    && Date.parse(sidecar.owner.startedAt) === Date.parse(owner.startedAt), "ENTRY_CAPTURE_OWNER_MISMATCH");
  const captured = Date.parse(sidecar.capturedAt), started = Date.parse(sidecar.captureStartedAt), lower = Date.parse(notBefore);
  const current = Date.parse(now), expiry = Date.parse(expiresAt);
  check([captured, started, lower, current, expiry].every(Number.isFinite)
    && lower <= started && started <= captured && captured <= current && current <= expiry,
  "ENTRY_CAPTURE_STALE");
  check(sidecar.stability?.verified === true && sidecar.safety?.usesGlobalInput === false, "ENTRY_CAPTURE_SAFETY_INVALID");
  const png = Buffer.from(pngBytes ?? []);
  const dimensions = validatePng(png);
  try {
    finalizeViewportCapture({ ...sidecar, identityBefore: sidecar.stability.before, identityAfter: sidecar.stability.after }, png, sidecar.requestBinding);
  } catch (error) { check(false, `ENTRY_CAPTURE_PROVENANCE_INVALID:${error.message}`); }
  check(samePath(sidecar.png?.path, pngPath) && sidecar.png.sha256 === sha256(png)
    && sidecar.png.bytes === png.length && sidecar.png.width === dimensions.width
    && sidecar.png.height === dimensions.height
    && sidecar.viewport?.width === dimensions.width && sidecar.viewport.height === dimensions.height
    && Number.isSafeInteger(sidecar.viewport.left) && Number.isSafeInteger(sidecar.viewport.top),
  "ENTRY_CAPTURE_PNG_IDENTITY_MISMATCH");
  return { version: "aurora-entry-surface-capture-binding/v2", status: "capture_binding_valid",
    semanticVerdict: "not_evaluated", png: { ...sidecar.png }, capturedAt: sidecar.capturedAt };
}

export function validatePaintModuleDelta(beforeBytes, afterBytes, area) {
  const before = parseErfArchive(beforeBytes, "MOD "), after = parseErfArchive(afterBytes, "MOD ");
  check(before.resources.length === after.resources.length, "ENTRY_RESOURCE_SET_CHANGED");
  const beforeEntry = readEntrySurfaceModuleBytes(beforeBytes, area), afterEntry = readEntrySurfaceModuleBytes(afterBytes, area);
  for (const resource of before.resources) {
    const current = after.resources.find((item) => item.resref === resource.resref && item.type === resource.type);
    check(current, "ENTRY_RESOURCE_SET_CHANGED");
    if (resource.resref === "module" && resource.type === 2014) {
      const a = parseGff(resource.bytes, "IFO "), b = parseGff(current.bytes, "IFO ");
      const allowed = new Set(["Mod_Entry_X", "Mod_Entry_Y", "Mod_Entry_Z", "Mod_Entry_Dir_X", "Mod_Entry_Dir_Y"]);
      check(equal(gffValue(a, a.root, allowed), gffValue(b, b.root, allowed)), "ENTRY_UNRELATED_IFO_CHANGE");
    } else check(resource.bytes.equals(current.bytes), "ENTRY_UNRELATED_RESOURCE_CHANGE");
  }
  check(equal(beforeEntry.orderedHakResrefs, afterEntry.orderedHakResrefs), "ENTRY_HAK_TRANSITION_MISMATCH");
  return { before: beforeEntry, after: afterEntry, entryDelta: {
    before: beforeEntry.entry, after: afterEntry.entry,
    changed: !equal(beforeEntry.entry, afterEntry.entry),
    allowedFields: ["Mod_Entry_X", "Mod_Entry_Y", "Mod_Entry_Z", "Mod_Entry_Dir_X", "Mod_Entry_Dir_Y"],
  }, unchangedNonEntryResources: true };
}

function gffValue(parsed, struct, omitted = new Set(), depth = 0) {
  check(depth <= 64, "ENTRY_GFF_DEPTH_INVALID");
  return { typeId: struct.typeId, fields: struct.fields.filter((field) => !omitted.has(field.label)).map((field) => {
    let value;
    if (field.typeId <= 5 || field.typeId === 8) value = field.dataOrOffset;
    else if (field.typeId === 10 || field.typeId === 11) value = readString(field);
    else if (field.typeId === 14) { check(parsed.structs[field.dataOrOffset], "ENTRY_GFF_STRUCT_INVALID"); value = gffValue(parsed, parsed.structs[field.dataOrOffset], new Set(), depth + 1); }
    else if (field.typeId === 15) value = readList(field, parsed).map((child) => gffValue(parsed, child, new Set(), depth + 1));
    else {
      const offset = parsed.header.fieldDataOffset + field.dataOrOffset;
      check(offset >= 0 && offset + 4 <= parsed.bytes.length, "ENTRY_GFF_DATA_INVALID");
      const length = [6, 7, 9].includes(field.typeId) ? 8 : field.typeId === 16 ? 16 : field.typeId === 17 ? 12
        : [12, 13].includes(field.typeId) ? 4 + parsed.bytes.readUInt32LE(offset) : -1;
      check(length >= 0 && offset + length <= parsed.bytes.length, "ENTRY_GFF_DATA_INVALID");
      value = parsed.bytes.subarray(offset, offset + length).toString("hex");
    }
    return { label: field.label, typeId: field.typeId, value };
  }).sort((a, b) => a.label.localeCompare(b.label)) };
}

function validatePng(bytes) {
  check(bytes.length >= 45 && bytes.length <= 32 * 1024 * 1024
    && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "ENTRY_CAPTURE_PNG_INVALID");
  let offset = 8, dimensions = null, idat = false, ended = false, channels = 0;
  const compressed = [];
  while (offset < bytes.length) {
    check(offset + 12 <= bytes.length, "ENTRY_CAPTURE_PNG_TRUNCATED");
    const length = bytes.readUInt32BE(offset), end = offset + 12 + length;
    check(end <= bytes.length, "ENTRY_CAPTURE_PNG_TRUNCATED");
    const kind = bytes.toString("ascii", offset + 4, offset + 8);
    check(/^[A-Za-z]{4}$/u.test(kind) && !["acTL", "fcTL", "fdAT"].includes(kind)
      && (kind[0] === kind[0].toLowerCase() || ["IHDR", "PLTE", "IDAT", "IEND"].includes(kind)), "ENTRY_CAPTURE_PNG_CHUNK_INVALID");
    check(crc32(bytes.subarray(offset + 4, offset + 8 + length)) === bytes.readUInt32BE(offset + 8 + length), "ENTRY_CAPTURE_PNG_CRC_INVALID");
    if (offset === 8) {
      check(kind === "IHDR" && length === 13, "ENTRY_CAPTURE_PNG_HEADER_INVALID");
      dimensions = { width: bytes.readUInt32BE(offset + 8), height: bytes.readUInt32BE(offset + 12) };
      check(dimensions.width > 0 && dimensions.height > 0 && dimensions.width <= 8192 && dimensions.height <= 8192, "ENTRY_CAPTURE_PNG_BOUNDS_INVALID");
      check(bytes[offset + 16] === 8 && [2, 6].includes(bytes[offset + 17]) && bytes[offset + 18] === 0 && bytes[offset + 19] === 0 && bytes[offset + 20] === 0, "ENTRY_CAPTURE_PNG_FORMAT_INVALID");
      channels = bytes[offset + 17] === 6 ? 4 : 3;
    } else check(kind !== "IHDR", "ENTRY_CAPTURE_PNG_HEADER_INVALID");
    if (kind === "IDAT") { idat = true; compressed.push(bytes.subarray(offset + 8, offset + 8 + length)); }
    if (kind === "IEND") { check(length === 0 && end === bytes.length && idat, "ENTRY_CAPTURE_PNG_END_INVALID"); ended = true; }
    offset = end;
  }
  check(ended, "ENTRY_CAPTURE_PNG_END_MISSING");
  const stride = dimensions.width * channels + 1, expected = stride * dimensions.height;
  let decoded;
  try { decoded = inflateSync(Buffer.concat(compressed), { maxOutputLength: expected + 1 }); }
  catch { check(false, "ENTRY_CAPTURE_PNG_DECOMPRESSION_INVALID"); }
  check(decoded.length === expected, "ENTRY_CAPTURE_PNG_DECOMPRESSION_INVALID");
  for (let row = 0; row < dimensions.height; row += 1) check(decoded[row * stride] <= 4, "ENTRY_CAPTURE_PNG_FILTER_INVALID");
  return dimensions;
}

function normalizeObjects(objects) {
  return (objects ?? []).map(({ templateResRef, tag, appearanceType, position }) => ({ templateResRef, tag, appearanceType, position }));
}
function vector(struct, labels) {
  const result = labels.map((label) => readFloat(requiredField(struct, label)));
  check(result.every(Number.isFinite), "ENTRY_VECTOR_INVALID"); return result;
}
function normalizedTime(value) {
  const legacy = typeof value === "string" ? /^\/Date\((\d+)\)\/$/u.exec(value) : null;
  const milliseconds = legacy ? Number(legacy[1]) : Date.parse(value);
  return Number.isFinite(milliseconds) ? new Date(milliseconds).toISOString() : null;
}
function validateIdentity(value) {
  check(typeof value?.path === "string" && value.path.length > 0 && SHA256.test(value.sha256)
    && Number.isSafeInteger(value.bytes) && value.bytes > 0, "ENTRY_FILE_IDENTITY_INVALID");
}
function samePath(a, b) { return typeof a === "string" && typeof b === "string" && resolve(a).toLowerCase() === resolve(b).toLowerCase(); }
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  return value;
}
function equal(a, b) { return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b)); }
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function check(condition, code) { if (!condition) { const error = new Error(code); error.code = code; throw error; } }
