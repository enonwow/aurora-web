import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { finalizeViewportCapture } from "../../scripts/lib/aurora-viewport-capture-provenance.mjs";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const f = (label, type, value) => ({ label, type, value });
const str = (label, value) => f(label, 10, value);
const ref = (label, value) => f(label, 11, value);
const num = (label, value) => f(label, 8, value);
const int = (label, value) => f(label, 4, value);
const list = (label, value) => f(label, 15, value);

// Test-only serializer with a tiny independent grammar. No game/process ports.
function gff(type, rootFields) {
  const structs = [], fields = [], labels = [], data = [], indices = [], lists = [];
  let dataSize = 0, indexSize = 0, listSize = 0;
  function addStruct(items) {
    const id = structs.length, entry = { ids: [] }; structs.push(entry);
    for (const item of items) {
      let value = item.value;
      if (item.type === 10 || item.type === 11) {
        const text = Buffer.from(value), prefix = Buffer.alloc(item.type === 10 ? 4 : 1);
        if (item.type === 10) prefix.writeUInt32LE(text.length); else prefix[0] = text.length;
        value = dataSize; data.push(prefix, text); dataSize += prefix.length + text.length;
      } else if (item.type === 8) {
        const bytes = Buffer.alloc(4); bytes.writeFloatLE(value); value = bytes.readUInt32LE();
      } else if (item.type === 15) {
        const children = item.value.map(addStruct), bytes = Buffer.alloc(4 + children.length * 4);
        bytes.writeUInt32LE(children.length); children.forEach((child, index) => bytes.writeUInt32LE(child, 4 + index * 4));
        value = listSize; lists.push(bytes); listSize += bytes.length;
      }
      let label = labels.indexOf(item.label); if (label < 0) { label = labels.length; labels.push(item.label); }
      entry.ids.push(fields.length); fields.push({ type: item.type, label, value });
    }
    return id;
  }
  addStruct(rootFields);
  const structBytes = Buffer.alloc(structs.length * 12), fieldBytes = Buffer.alloc(fields.length * 12), labelBytes = Buffer.alloc(labels.length * 16);
  structs.forEach((entry, index) => {
    structBytes.writeUInt32LE(index === 0 ? 0xffffffff : 0, index * 12);
    structBytes.writeUInt32LE(entry.ids.length === 1 ? entry.ids[0] : indexSize, index * 12 + 4);
    structBytes.writeUInt32LE(entry.ids.length, index * 12 + 8);
    if (entry.ids.length > 1) { const bytes = Buffer.alloc(entry.ids.length * 4); entry.ids.forEach((id, i) => bytes.writeUInt32LE(id, i * 4)); indices.push(bytes); indexSize += bytes.length; }
  });
  fields.forEach((entry, index) => { fieldBytes.writeUInt32LE(entry.type, index * 12); fieldBytes.writeUInt32LE(entry.label, index * 12 + 4); fieldBytes.writeUInt32LE(entry.value, index * 12 + 8); });
  labels.forEach((label, index) => labelBytes.write(label, index * 16, 16, "ascii"));
  const sections = [structBytes, fieldBytes, labelBytes, Buffer.concat(data), Buffer.concat(indices), Buffer.concat(lists)];
  const counts = [structs.length, fields.length, labels.length, dataSize, indexSize, listSize];
  const header = Buffer.alloc(56); header.write(type + "V3.2"); let offset = 56;
  sections.forEach((bytes, index) => { header.writeUInt32LE(offset, 8 + index * 8); header.writeUInt32LE(counts[index], 12 + index * 8); offset += bytes.length; });
  return Buffer.concat([header, ...sections]);
}

export function fixtureModule(position = [20, 20, 0], { appearance = 219, unrelatedIfo = "stable" } = {}) {
  const ifo = gff("IFO ", [ref("Mod_Entry_Area", "entry_area"), ...["X", "Y", "Z"].map((axis, index) => num(`Mod_Entry_${axis}`, position[index])), num("Mod_Entry_Dir_X", 0), num("Mod_Entry_Dir_Y", 1), str("Mod_Name", unrelatedIfo), list("Mod_HakList", [[str("Mod_Hak", "arbitrary")]])]);
  const are = gff("ARE ", [int("Width", 4), int("Height", 4), ref("Tileset", "ttd01"), list("Tile_List", Array.from({ length: 16 }, () => [int("Tile_ID", 0)]))]);
  const git = gff("GIT ", [list("Creature List", [[ref("TemplateResRef", "guard"), str("Tag", "GUARD"), int("Appearance_Type", appearance), num("XPosition", 20), num("YPosition", 23), num("ZPosition", 0)]]), list("Placeable List", [])]);
  const resources = [{ name: "module", type: 2014, bytes: ifo }, { name: "entry_area", type: 2012, bytes: are }, { name: "entry_area", type: 2023, bytes: git }];
  const header = Buffer.alloc(160), keys = Buffer.alloc(resources.length * 24), table = Buffer.alloc(resources.length * 8);
  header.write("MOD V1.0"); header.writeUInt32LE(resources.length, 16); header.writeUInt32LE(160, 24); header.writeUInt32LE(160 + keys.length, 28);
  let offset = 160 + keys.length + table.length;
  resources.forEach((item, index) => { keys.write(item.name, index * 24, 16, "ascii"); keys.writeUInt32LE(index, index * 24 + 16); keys.writeUInt16LE(item.type, index * 24 + 20); table.writeUInt32LE(offset, index * 8); table.writeUInt32LE(item.bytes.length, index * 8 + 4); offset += item.bytes.length; });
  return { bytes: Buffer.concat([header, keys, table, ...resources.map((item) => item.bytes)]), gitSha256: sha(git) };
}

export function writeSourceFixture(dir, name = "fixture_a") {
  const module = fixtureModule(), modulePath = join(dir, `${name}.mod`), hakPath = join(dir, "arbitrary.hak");
  writeFileSync(modulePath, module.bytes); writeFileSync(hakPath, "fixture HAK bytes");
  const profilePath = join(dir, "profile.json"), postSaveProfilePath = join(dir, "post-save.json");
  const profile = { version: "aurora-toolset-binary-module-bootstrap-profile/v1", id: name,
    module: { path: modulePath, resref: name, sha256: "a".repeat(64), bytes: 100 },
    area: { resref: "entry_area", width: 4, height: 4, displayName: "Test", tileSet: "ttd01" },
    entryPoint: { area: "entry_area", position: [20, 20, 0], direction: [0, 1] },
    fixtures: [{ id: "guard", templateResRef: "guard", tag: "GUARD", appearanceType: 219, position: [20, 23, 0] }],
    orderedHakList: [{ path: hakPath, resref: "arbitrary", sha256: sha(Buffer.from("fixture HAK bytes")), bytes: 17 }] };
  const postSaveProfile = structuredClone(profile); postSaveProfile.module.sha256 = sha(module.bytes); postSaveProfile.module.bytes = module.bytes.length;
  const writeJson = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2));
  writeJson(profilePath, profile); writeJson(postSaveProfilePath, postSaveProfile);
  const manifest = { version: "aurora-toolset-binary-native-geometry-manifest/v1", status: "geometry_saved_pending_entry_observation", profileKind: "model-fixture-geometry",
    profileId: name, profilePath, profileSha256: sha(Buffer.from(JSON.stringify(profile, null, 2))), artifactDir: dir, module: profile.module, area: profile.area,
    postSaveProfilePath, postSaveStructural: { ok: true, status: "binary_bootstrap_structural_readback_valid", module: postSaveProfile.module },
    open: { process: { Id: 1234, StartTime: "2026-09-05T23:49:06.824Z" } },
    nativeSave: { areaWasSaved: true, invalidLocationsDialog: false, inaccessibleObjectsDialog: false, statusText: "Area was saved", save: { ok: true, processId: 1234, frameHwnd: 5678, modulePath, before: { bytes: 100 }, after: { bytes: module.bytes.length } } },
    nativeEntryReadback: { modulePath, moduleSha256: sha(module.bytes), area: "entry_area", position: [20, 20, 0], direction: [0, 1] },
    nativeGitReadback: { modulePath, moduleSha256: sha(module.bytes), area: "entry_area", gitSha256: module.gitSha256, creatures: [{ templateResRef: "guard", tag: "GUARD", appearanceType: 219, position: [20, 23, 0] }], placeables: [] } };
  const manifestPath = join(dir, "binary-native-geometry-manifest.json"); writeJson(manifestPath, manifest);
  return { profilePath, manifestPath, modulePath, hakPath, profile, manifest };
}

export function fixturePng() {
  const header = Buffer.alloc(13); header.writeUInt32BE(1, 0); header.writeUInt32BE(1, 4); header[8] = 8; header[9] = 6;
  function chunk(kind, data) {
    const body = Buffer.concat([Buffer.from(kind), data]); let crc = -1;
    for (const byte of body) { crc ^= byte; for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) * 0xedb88320); }
    const result = Buffer.alloc(data.length + 12); result.writeUInt32BE(data.length, 0); body.copy(result, 4); result.writeUInt32BE((crc ^ -1) >>> 0, data.length + 8); return result;
  }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", header), chunk("IDAT", deflateSync(Buffer.from([0, 255, 0, 0, 255]))), chunk("IEND", Buffer.alloc(0))]);
}

export function fixtureCapture({ binding, pngPath, capturedAt }) {
  const png = fixturePng(), viewport = { left: -100, top: 100, width: 1, height: 1 };
  const owner = { ...binding.owner, viewerHwnd: 6677, viewportHwnd: 6789 };
  const identity = { owner, viewport, moduleTitle: `BioWare Aurora Toolset - ${binding.target.module.resref}.mod`,
    areaViewerTitle: ` - ${binding.target.area}`, screenDevice: "\\\\.\\DISPLAY1", screenPrimary: false };
  const result = { ok: true, pngPath, captureStartedAt: capturedAt, capturedAt, owner, viewport,
    moduleTitle: identity.moduleTitle, areaViewerTitle: identity.areaViewerTitle,
    identityBefore: identity, identityAfter: structuredClone(identity),
    safety: { method: "PrintWindow TScrollBox", validatedTScrollBox: true, windowFromPointVerified: false,
      usesGlobalCursor: false, usesGlobalKeyboard: false, usesGlobalMouse: false,
      moduleScreenDevice: "\\\\.\\DISPLAY1", moduleScreenPrimary: false } };
  return { png, sidecar: finalizeViewportCapture(result, png, binding) };
}
