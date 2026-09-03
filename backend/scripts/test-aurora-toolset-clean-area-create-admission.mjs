#!/usr/bin/env node
import assert from "node:assert/strict";
import { validateCleanAreaCreateAdmission } from "./lib/aurora-toolset-clean-area-create-admission.mjs";

const profile = {
  version: "aurora-toolset-binary-area-create-profile/v1",
  id: "clean-area-contract",
  proofKind: "area-create-empty-structural",
  module: { resref: "contractmod", path: "C:\\proof\\contractmod.mod", sha256: "a".repeat(64) },
  area: { resref: "contractarea", displayName: "Contract Area" },
};
const manifest = {
  version: "aurora-toolset-binary-native-geometry-manifest/v1",
  profileId: profile.id,
  profileKind: "area-create-empty-structural",
  profileSha256: "b".repeat(64),
  module: { ...profile.module },
  area: { ...profile.area },
  structuralPreflight: {
    ok: true,
    status: "binary_area_create_structural_readback_valid",
    module: { ...profile.module },
    area: { ...profile.area },
  },
  status: "failed",
  blockerCode: "native_geometry_save_unverified",
  open: {
    process: { Id: 123, StartTime: "/Date(1000)/", Responding: true },
    resumedExactProcess: true,
    result: {
      processId: 123,
      frameHwnd: 456,
      titleAfter: "BioWare Aurora Neverwinter Nights Toolset - contractmod.mod",
    },
  },
  nativeSave: {
    areaWasSaved: false,
    invalidLocationsDialog: false,
    inaccessibleObjectsDialog: false,
    error: "module_not_dirty_before_save",
  },
};
const queueManifest = {
  version: "toolset-area-oracle-queue/v1",
  status: "completed",
  safety: { usesGlobalInput: false, savesModule: false },
  items: [{
    area: { name: "Contract Area", resref: "contractarea" },
    status: "opened",
    areaOpen: {
      ok: true,
      moduleWindowTitle: "BioWare Aurora Neverwinter Nights Toolset - contractmod.mod",
      areaViewerTitle: " - contractarea",
      areaViewerHwnd: 789,
    },
  }],
};
const windows = {
  ok: true,
  processId: 123,
  responding: true,
  windows: [
    { hwnd: 456, className: "TfrmFrame", text: "BioWare Aurora Neverwinter Nights Toolset - contractmod.mod" },
    { hwnd: 987, className: "TApplication", text: "BioWare Aurora Neverwinter Nights Toolset" },
  ],
};
manifest.nativeSave.windows = structuredClone(windows);

const admitted = validateCleanAreaCreateAdmission({
  profile,
  expectedProfileSha256: "b".repeat(64),
  manifest,
  queueManifest,
  processes: [{ Id: 123, StartTime: "/Date(1000)/", Responding: true }],
  windows,
});
assert.equal(admitted.process.Id, 123);
assert.equal(admitted.frame.hwnd, 456);
assert.equal(admitted.areaViewer.hwnd, 789);
assert.equal(admitted.nativeSaveClaimed, false);
assert.equal(admitted.cleanModuleAccepted, true);

const currentOpenShapeManifest = structuredClone(manifest);
currentOpenShapeManifest.open.process.StartTime = "1970-01-01T00:00:01.000Z";
delete currentOpenShapeManifest.open.resumedExactProcess;
currentOpenShapeManifest.open.result = {
  ok: true,
  moduleOpen: {
    processId: 123,
    startedToolset: true,
    moduleWindowHwnd: 456,
    moduleWindowTitle: "BioWare Aurora Neverwinter Nights Toolset - contractmod.mod",
    moduleLoadOwner: "explicit_open",
  },
};
const currentOpenShape = validateCleanAreaCreateAdmission({
  profile,
  expectedProfileSha256: "b".repeat(64),
  manifest: currentOpenShapeManifest,
  queueManifest,
  processes: [{ Id: 123, StartTime: "/Date(1000)/", Responding: true }],
  windows,
});
assert.equal(currentOpenShape.process.Id, 123);
assert.equal(currentOpenShape.frame.hwnd, 456);

for (const mutate of [
  (value) => { value.manifest.status = "module_ready"; },
  (value) => { value.manifest.blockerCode = "area_geometry_invalid"; },
  (value) => { value.manifest.nativeSave.error = "save_file_unchanged"; },
  (value) => { value.manifest.nativeSave.invalidLocationsDialog = true; },
  (value) => { value.manifest.nativeSave.inaccessibleObjectsDialog = true; },
  (value) => { value.manifest.structuralPreflight.module.sha256 = "c".repeat(64); },
  (value) => { value.manifest.open.resumedExactProcess = false; },
  (value) => { value.queueManifest.items[0].area.resref = "other"; },
  (value) => { value.queueManifest.items[0].areaOpen.areaViewerTitle = " - other"; },
  (value) => { value.processes[0].Id = 124; },
  (value) => { value.windows.windows[0].text += "*"; },
  (value) => { value.windows.windows.push({ hwnd: 111, className: "#32770", text: "Error" }); },
]) {
  const value = structuredClone({ profile, expectedProfileSha256: "b".repeat(64), manifest, queueManifest, processes: [{ Id: 123, StartTime: "/Date(1000)/", Responding: true }], windows });
  mutate(value);
  assert.throws(() => validateCleanAreaCreateAdmission(value));
}

console.log(JSON.stringify({ ok: true, status: "aurora_toolset_clean_area_create_admission_contract_valid" }));
