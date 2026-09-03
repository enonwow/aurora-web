function reject(code, detail) {
  const error = new Error(detail ? `${code}:${detail}` : code);
  error.code = code;
  throw error;
}

function sameText(left, right) {
  return typeof left === "string" && typeof right === "string" && left === right;
}

function sameStartTime(left, right) {
  const parse = (value) => {
    const text = String(value ?? "");
    const dotNet = /^\/Date\((-?\d+)(?:[+-]\d+)?\)\/$/u.exec(text);
    if (dotNet) return Number(dotNet[1]);
    const timestamp = Date.parse(text);
    return Number.isFinite(timestamp) ? timestamp : Number.NaN;
  };
  const leftTimestamp = parse(left);
  const rightTimestamp = parse(right);
  return Number.isFinite(leftTimestamp)
    && Number.isFinite(rightTimestamp)
    && leftTimestamp === rightTimestamp;
}

function exactModuleTitle(title, moduleResRef) {
  const value = typeof title === "string" ? title : "";
  return !value.endsWith("*") && value.toLowerCase().endsWith(` - ${moduleResRef}.mod`.toLowerCase());
}

export function validateCleanAreaCreateAdmission({
  profile,
  expectedProfileSha256,
  manifest,
  queueManifest,
  processes,
  windows,
}) {
  if (profile?.version !== "aurora-toolset-binary-area-create-profile/v1"
    || profile?.proofKind !== "area-create-empty-structural") {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_PROFILE_INVALID");
  }
  if (!/^[a-f0-9]{64}$/u.test(expectedProfileSha256 ?? "")
    || manifest?.profileSha256 !== expectedProfileSha256
    || manifest?.profileId !== profile.id
    || manifest?.profileKind !== "area-create-empty-structural") {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_PROFILE_BINDING_INVALID");
  }
  if (!sameText(manifest?.module?.resref, profile?.module?.resref)
    || !sameText(manifest?.module?.path, profile?.module?.path)
    || !sameText(manifest?.module?.sha256, profile?.module?.sha256)
    || !sameText(manifest?.area?.resref, profile?.area?.resref)
    || !sameText(manifest?.area?.displayName, profile?.area?.displayName)) {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_IDENTITY_INVALID");
  }
  if (manifest?.structuralPreflight?.ok !== true
    || manifest?.structuralPreflight?.status !== "binary_area_create_structural_readback_valid"
    || manifest?.structuralPreflight?.module?.sha256 !== profile.module.sha256
    || manifest?.structuralPreflight?.area?.resref !== profile.area.resref
    || manifest?.structuralPreflight?.area?.displayName !== profile.area.displayName) {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_STRUCTURAL_PREFLIGHT_INVALID");
  }
  if (manifest?.status !== "failed" || manifest?.blockerCode !== "native_geometry_save_unverified") {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_FAILURE_STATE_INVALID");
  }
  const nativeSave = manifest?.nativeSave;
  if (nativeSave?.areaWasSaved !== false
    || nativeSave?.invalidLocationsDialog !== false
    || nativeSave?.inaccessibleObjectsDialog !== false
    || !String(nativeSave?.error ?? "").includes("module_not_dirty_before_save")) {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_SAVE_DIAGNOSTIC_INVALID");
  }
  if (!Array.isArray(processes) || processes.length !== 1 || processes[0]?.Responding !== true) {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_PROCESS_INVALID");
  }
  const process = processes[0];
  const openedProcess = manifest?.open?.process;
  const openedResult = manifest?.open?.result;
  const openedModule = openedResult?.moduleOpen ?? openedResult;
  const openedProcessId = openedResult?.processId ?? openedProcess?.Id;
  const openedFrameHwnd = openedResult?.frameHwnd ?? openedModule?.moduleWindowHwnd;
  const openedFrameTitle = openedResult?.titleAfter ?? openedModule?.moduleWindowTitle;
  const exactProcessOwnership = manifest?.open?.resumedExactProcess === true
    || (manifest?.open?.resumedExactProcess == null && openedModule?.startedToolset === true);
  if (!Number.isInteger(process.Id)
    || process.Id !== openedProcess?.Id
    || process.Id !== openedProcessId
    || !sameStartTime(process.StartTime, openedProcess?.StartTime)
    || !exactProcessOwnership
    || !Number.isInteger(openedFrameHwnd)
    || openedFrameHwnd <= 0
    || !exactModuleTitle(openedFrameTitle, profile.module.resref)) {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_PROCESS_BINDING_INVALID");
  }
  if (windows?.ok !== true || windows?.responding !== true || windows?.processId !== process.Id || !Array.isArray(windows?.windows)) {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_WINDOW_OBSERVATION_INVALID");
  }
  const frameWindows = windows.windows.filter((window) => window?.className === "TfrmFrame");
  const blockingWindows = windows.windows.filter((window) => window?.className === "#32770" || /^Tdlg/u.test(String(window?.className ?? "")));
  if (frameWindows.length !== 1
    || blockingWindows.length !== 0
    || frameWindows[0]?.hwnd !== openedFrameHwnd
    || !exactModuleTitle(frameWindows[0]?.text, profile.module.resref)) {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_WINDOW_BINDING_INVALID");
  }
  const savedWindowObservation = nativeSave?.windows;
  const savedFrame = savedWindowObservation?.windows?.filter((window) => window?.className === "TfrmFrame") ?? [];
  if (savedWindowObservation?.ok !== true
    || savedWindowObservation?.processId !== process.Id
    || savedWindowObservation?.responding !== true
    || savedFrame.length !== 1
    || savedFrame[0]?.hwnd !== openedFrameHwnd
    || !exactModuleTitle(savedFrame[0]?.text, profile.module.resref)) {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_FAILURE_WINDOW_BINDING_INVALID");
  }
  if (queueManifest?.version !== "toolset-area-oracle-queue/v1"
    || queueManifest?.status !== "completed"
    || queueManifest?.safety?.usesGlobalInput !== false
    || queueManifest?.safety?.savesModule !== false
    || !Array.isArray(queueManifest?.items)
    || queueManifest.items.length !== 1) {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_QUEUE_INVALID");
  }
  const item = queueManifest.items[0];
  if (item?.status !== "opened"
    || item?.area?.resref !== profile.area.resref
    || item?.area?.name !== profile.area.displayName
    || item?.areaOpen?.ok !== true
    || item?.areaOpen?.moduleWindowTitle !== frameWindows[0].text
    || item?.areaOpen?.areaViewerTitle !== ` - ${profile.area.resref}`
    || !Number.isInteger(item?.areaOpen?.areaViewerHwnd)
    || item.areaOpen.areaViewerHwnd <= 0) {
    reject("BINARY_NATIVE_CLEAN_AREA_CREATE_AREA_OPEN_BINDING_INVALID");
  }
  return {
    cleanModuleAccepted: true,
    nativeSaveClaimed: false,
    process,
    frame: frameWindows[0],
    areaViewer: { hwnd: item.areaOpen.areaViewerHwnd, title: item.areaOpen.areaViewerTitle },
  };
}
