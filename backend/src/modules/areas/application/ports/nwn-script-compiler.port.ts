export const NWN_SCRIPT_COMPILER = Symbol("NWN_SCRIPT_COMPILER");

export const NWN_SCRIPT_COMPILE_RESULT_SCHEMA_VERSION =
  "area-nwscript-compile-result.v1" as const;

export interface NwnScriptSourceResource {
  readonly resref: string;
  readonly bytes: Buffer;
}

export interface NwnScriptCompileInput {
  readonly target: NwnScriptSourceResource;
  readonly includes: readonly NwnScriptSourceResource[];
}

export interface NwnScriptCompilerDiagnostic {
  readonly code: "NWNSCRIPT_COMPILE_ERROR" | "NWNSCRIPT_COMPILE_WARNING" | "NWNSCRIPT_COMPILER_REJECTED";
  readonly severity: "error" | "warning";
  readonly line?: number;
  readonly column?: number;
  readonly message: string;
  readonly detailSha256?: string;
}

export interface NwnScriptCompilerArtifact {
  readonly bytes: Buffer;
  readonly size: number;
  readonly sha256: string;
}

export interface NwnScriptCompilerProviderIdentity {
  readonly providerId: "neverwinter-nim-official-script-compiler";
  readonly executableSha256: string;
  readonly versionMarker: string;
  readonly versionOutputSha256: string;
  readonly languageSpecSha256: string;
  readonly runtimeLibrarySetSha256: string;
  readonly launcherFileSetSha256: string;
}

export interface NwnScriptCompileResult {
  readonly schemaVersion: typeof NWN_SCRIPT_COMPILE_RESULT_SCHEMA_VERSION;
  readonly status: "compiled" | "rejected";
  readonly targetResref: string;
  readonly sourceSha256: string;
  readonly includeSetSha256: string;
  readonly executionProfileSha256: string;
  readonly provider: NwnScriptCompilerProviderIdentity;
  readonly diagnostics: readonly NwnScriptCompilerDiagnostic[];
  readonly artifacts?: Readonly<{
    ncs: NwnScriptCompilerArtifact;
    ndb: NwnScriptCompilerArtifact;
  }>;
  readonly receiptSha256: string;
}

export interface NwnScriptCompilerPort {
  compile(input: NwnScriptCompileInput): Promise<NwnScriptCompileResult>;
}
