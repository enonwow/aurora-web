export const SCRIPT_MODULE_ID = "module:test";
export const SCRIPT_REVISION = "a".repeat(64);
export const SCRIPT_NEXT_REVISION = "b".repeat(64);
export const SCRIPT_SOURCE = "void main() {}\n";

export function areaEventScriptSourceSnapshotFixture() {
  return {
    schemaVersion: "area-event-script-source-snapshot.v1",
    moduleId: SCRIPT_MODULE_ID,
    moduleRevision: SCRIPT_REVISION,
    targetResRef: "area_enter",
    sourceEncoding: "utf-8",
    sourceText: SCRIPT_SOURCE,
    sourceSize: new TextEncoder().encode(SCRIPT_SOURCE).byteLength,
    sourceSha256: "1".repeat(64),
  } as const;
}

export function areaEventScriptValidationFixture(status: "compiled" | "rejected" = "compiled") {
  const common = {
    schemaVersion: "area-event-script-validation-result.v1",
    status,
    moduleId: SCRIPT_MODULE_ID,
    moduleRevision: SCRIPT_REVISION,
    targetResRef: "area_enter",
    sourceSha256: "1".repeat(64),
    includeSetSha256: "2".repeat(64),
    executionProfileSha256: "3".repeat(64),
    provider: providerFixture(),
    diagnostics: status === "compiled" ? [] : [{
      code: "NWNSCRIPT_COMPILE_ERROR",
      severity: "error",
      line: 1,
      column: 6,
      message: "Expected declaration.",
      detailSha256: "9".repeat(64),
    }],
    compilerReceiptSha256: "8".repeat(64),
  } as const;
  return status === "compiled"
    ? {
        ...common,
        status: "compiled" as const,
        artifacts: {
          ncs: { size: 128, sha256: "4".repeat(64) },
          ndb: { size: 96, sha256: "5".repeat(64) },
        },
      }
    : { ...common, status: "rejected" as const };
}

export function areaEventScriptPublicationReceiptFixture() {
  return {
    schemaVersion: "area-event-script-publication-receipt.v1",
    transactionId: "script-tx-1",
    moduleId: SCRIPT_MODULE_ID,
    targetResRef: "area_enter",
    previousModuleRevision: SCRIPT_REVISION,
    newModuleRevision: SCRIPT_NEXT_REVISION,
    commandHash: "0".repeat(64),
    sourceSha256: "1".repeat(64),
    includeSetSha256: "2".repeat(64),
    executionProfileSha256: "3".repeat(64),
    provider: providerFixture(),
    compilerReceiptSha256: "8".repeat(64),
    resources: [
      { extension: "ncs", logicalKey: "area_enter.ncs", resourceType: 2010, size: 128, sha256: "4".repeat(64) },
      { extension: "ndb", logicalKey: "area_enter.ndb", resourceType: 2064, size: 96, sha256: "5".repeat(64) },
      { extension: "nss", logicalKey: "area_enter.nss", resourceType: 2009, size: 15, sha256: "1".repeat(64) },
    ],
    readbackStatus: "verified",
    warnings: [],
    publishedAt: "2026-08-26T12:00:00.000Z",
  } as const;
}

function providerFixture() {
  return {
    providerId: "neverwinter-nim-official-script-compiler",
    executableSha256: "a".repeat(64),
    versionMarker: "neverwinter 2.1.2",
    versionOutputSha256: "b".repeat(64),
    languageSpecSha256: "c".repeat(64),
    runtimeLibrarySetSha256: "d".repeat(64),
    launcherFileSetSha256: "e".repeat(64),
  } as const;
}
