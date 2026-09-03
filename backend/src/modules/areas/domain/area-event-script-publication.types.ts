import { createHash } from "node:crypto";
import type {
  NwnScriptCompileResult,
  NwnScriptCompilerDiagnostic,
  NwnScriptCompilerProviderIdentity,
} from "../application/ports/nwn-script-compiler.port";
import {
  AREA_EVENT_SCRIPT_NCS_RESOURCE_TYPE,
  AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE,
} from "./area-event-script-catalog";
import { AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES } from "./area-event-script-source-command";
import type { AreaEventScriptSourceCommand } from "./area-event-script-source-command";
import type { AreaCreateJournalState } from "./area-create-transaction.types";

export const AREA_EVENT_SCRIPT_NDB_RESOURCE_TYPE = 2064 as const;
export const AREA_EVENT_SCRIPT_COMPILED_ARTIFACT_MAX_BYTES = 4 * 1024 * 1024;
export const AREA_EVENT_SCRIPT_PUBLICATION_RECEIPT_SCHEMA_VERSION =
  "area-event-script-publication-receipt.v1" as const;
export const AREA_EVENT_SCRIPT_VALIDATION_RESULT_SCHEMA_VERSION =
  "area-event-script-validation-result.v1" as const;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;

export type AreaEventScriptPublicationResourceExtension = "ncs" | "ndb" | "nss";

export interface AreaEventScriptPublicationCandidateResource {
  readonly extension: AreaEventScriptPublicationResourceExtension;
  readonly logicalKey: string;
  readonly resourceType: number;
  readonly bytes: Buffer;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaEventScriptPublicationCandidate {
  readonly expectedModuleRevision: string;
  readonly targetResRef: string;
  readonly sourceSha256: string;
  readonly includeSetSha256: string;
  readonly executionProfileSha256: string;
  readonly provider: NwnScriptCompilerProviderIdentity;
  readonly compilerReceiptSha256: string;
  readonly diagnostics: readonly NwnScriptCompilerDiagnostic[];
  readonly resources: readonly AreaEventScriptPublicationCandidateResource[];
}

export interface AreaEventScriptPersistedResource {
  readonly extension: AreaEventScriptPublicationResourceExtension;
  readonly logicalKey: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaEventScriptPublicationReadbackResult {
  readonly verified: boolean;
  readonly newModuleRevision: string;
  readonly resources: readonly AreaEventScriptPersistedResource[];
  readonly diagnostics: readonly string[];
}

export interface AreaEventScriptPublicationReceipt {
  readonly schemaVersion: typeof AREA_EVENT_SCRIPT_PUBLICATION_RECEIPT_SCHEMA_VERSION;
  readonly transactionId: string;
  readonly moduleId: string;
  readonly targetResRef: string;
  readonly previousModuleRevision: string;
  readonly newModuleRevision: string;
  readonly commandHash: string;
  readonly sourceSha256: string;
  readonly includeSetSha256: string;
  readonly executionProfileSha256: string;
  readonly provider: NwnScriptCompilerProviderIdentity;
  readonly compilerReceiptSha256: string;
  readonly resources: readonly AreaEventScriptPersistedResource[];
  readonly readbackStatus: "verified";
  readonly warnings: readonly NwnScriptCompilerDiagnostic[];
  readonly publishedAt: string;
}

export interface AreaEventScriptValidationResult {
  readonly schemaVersion: typeof AREA_EVENT_SCRIPT_VALIDATION_RESULT_SCHEMA_VERSION;
  readonly status: "compiled" | "rejected";
  readonly moduleId: string;
  readonly moduleRevision: string;
  readonly targetResRef: string;
  readonly sourceSha256: string;
  readonly includeSetSha256: string;
  readonly executionProfileSha256: string;
  readonly provider: NwnScriptCompilerProviderIdentity;
  readonly diagnostics: readonly NwnScriptCompilerDiagnostic[];
  readonly artifacts?: Readonly<{
    ncs: Readonly<{ size: number; sha256: string }>;
    ndb: Readonly<{ size: number; sha256: string }>;
  }>;
  readonly compilerReceiptSha256: string;
}

export interface AreaEventScriptPublicationExecutionInput {
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly ifMatchHeader: string | undefined;
  readonly command: AreaEventScriptSourceCommand;
  readonly commandHash: string;
}

export interface AreaEventScriptPublicationExecutionResult {
  readonly idempotency: "created" | "replayed";
  readonly receipt: AreaEventScriptPublicationReceipt;
}

export interface AreaEventScriptPublicationCandidateManifest {
  readonly targetResRef: string;
  readonly sourceSha256: string;
  readonly includeSetSha256: string;
  readonly executionProfileSha256: string;
  readonly provider: NwnScriptCompilerProviderIdentity;
  readonly compilerReceiptSha256: string;
  readonly resources: readonly AreaEventScriptPersistedResource[];
}

export interface AreaEventScriptPublicationJournalRecord {
  readonly transactionId: string;
  readonly moduleId: string;
  readonly targetResRef: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly commandHash: string;
  readonly expectedModuleRevision: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly candidate: AreaEventScriptPublicationCandidate;
  readonly createdAt: string;
}

export interface AreaEventScriptPublicationPersistedJournalRecord {
  readonly transactionId: string;
  readonly moduleId: string;
  readonly targetResRef: string;
  readonly actorId: string;
  readonly idempotencyKey: string;
  readonly commandHash: string;
  readonly expectedModuleRevision: string;
  readonly leaseId: string;
  readonly fencingToken: number;
  readonly state: AreaCreateJournalState;
  readonly candidateManifest: AreaEventScriptPublicationCandidateManifest;
  readonly receipt?: AreaEventScriptPublicationReceipt;
  readonly diagnostics: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class AreaEventScriptPublicationCandidateError extends Error {
  constructor(
    readonly code:
      | "AREA_EVENT_SCRIPT_COMPILE_REJECTED"
      | "AREA_EVENT_SCRIPT_COMPILER_RESULT_INVALID",
    message: string,
    readonly diagnostics: readonly NwnScriptCompilerDiagnostic[] = [],
  ) {
    super(`${code}: ${message}`);
    this.name = "AreaEventScriptPublicationCandidateError";
  }
}

export function buildAreaEventScriptPublicationCandidate(input: Readonly<{
  expectedModuleRevision: string;
  sourceBytes: Buffer;
  compilation: NwnScriptCompileResult;
}>): AreaEventScriptPublicationCandidate {
  const { compilation } = input;
  if (compilation?.status !== "compiled" || !compilation.artifacts) {
    throw new AreaEventScriptPublicationCandidateError(
      "AREA_EVENT_SCRIPT_COMPILE_REJECTED",
      "NWScript compiler rejected the submitted source.",
      freezeDiagnostics(compilation?.diagnostics ?? []),
    );
  }
  if (
    !SHA256_PATTERN.test(input.expectedModuleRevision) ||
    !Buffer.isBuffer(input.sourceBytes) ||
    input.sourceBytes.length > AREA_EVENT_SCRIPT_SOURCE_MAX_BYTES ||
    !RESREF_PATTERN.test(compilation.targetResref) ||
    compilation.targetResref === "nwscript" ||
    compilation.sourceSha256 !== sha256(input.sourceBytes) ||
    !SHA256_PATTERN.test(compilation.sourceSha256) ||
    !SHA256_PATTERN.test(compilation.includeSetSha256) ||
    !SHA256_PATTERN.test(compilation.executionProfileSha256) ||
    !SHA256_PATTERN.test(compilation.receiptSha256) ||
    !isProviderIdentity(compilation.provider)
  ) {
    throw invalidCompilerResult();
  }
  const ncs = cloneArtifact(compilation.artifacts.ncs);
  const ndb = cloneArtifact(compilation.artifacts.ndb);
  const source = Buffer.from(input.sourceBytes);
  const resources = Object.freeze<AreaEventScriptPublicationCandidateResource[]>([
    freezeResource("ncs", AREA_EVENT_SCRIPT_NCS_RESOURCE_TYPE, compilation.targetResref, ncs),
    freezeResource("ndb", AREA_EVENT_SCRIPT_NDB_RESOURCE_TYPE, compilation.targetResref, ndb),
    freezeResource("nss", AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE, compilation.targetResref, {
      bytes: source,
      size: source.length,
      sha256: compilation.sourceSha256,
    }),
  ]);
  return Object.freeze({
    expectedModuleRevision: input.expectedModuleRevision,
    targetResRef: compilation.targetResref,
    sourceSha256: compilation.sourceSha256,
    includeSetSha256: compilation.includeSetSha256,
    executionProfileSha256: compilation.executionProfileSha256,
    provider: freezeProvider(compilation.provider),
    compilerReceiptSha256: compilation.receiptSha256,
    diagnostics: freezeDiagnostics(compilation.diagnostics),
    resources,
  });
}

export function buildAreaEventScriptValidationResult(input: Readonly<{
  moduleId: string;
  moduleRevision: string;
  sourceBytes: Buffer;
  compilation: NwnScriptCompileResult;
}>): AreaEventScriptValidationResult {
  const compilation = input.compilation;
  if (
    !SHA256_PATTERN.test(input.moduleRevision) ||
    !Buffer.isBuffer(input.sourceBytes) ||
    compilation?.schemaVersion !== "area-nwscript-compile-result.v1" ||
    !RESREF_PATTERN.test(compilation.targetResref) ||
    compilation.targetResref === "nwscript" ||
    compilation.sourceSha256 !== sha256(input.sourceBytes) ||
    !SHA256_PATTERN.test(compilation.includeSetSha256) ||
    !SHA256_PATTERN.test(compilation.executionProfileSha256) ||
    !SHA256_PATTERN.test(compilation.receiptSha256) ||
    !isProviderIdentity(compilation.provider)
  ) {
    throw invalidCompilerResult();
  }
  const diagnostics = freezeDiagnostics(compilation.diagnostics);
  if (compilation.status === "compiled") {
    const candidate = buildAreaEventScriptPublicationCandidate({
      expectedModuleRevision: input.moduleRevision,
      sourceBytes: input.sourceBytes,
      compilation,
    });
    return Object.freeze({
      schemaVersion: AREA_EVENT_SCRIPT_VALIDATION_RESULT_SCHEMA_VERSION,
      status: "compiled",
      moduleId: input.moduleId,
      moduleRevision: input.moduleRevision,
      targetResRef: compilation.targetResref,
      sourceSha256: compilation.sourceSha256,
      includeSetSha256: compilation.includeSetSha256,
      executionProfileSha256: compilation.executionProfileSha256,
      provider: candidate.provider,
      diagnostics,
      artifacts: Object.freeze({
        ncs: descriptorOnly(compilation.artifacts!.ncs),
        ndb: descriptorOnly(compilation.artifacts!.ndb),
      }),
      compilerReceiptSha256: compilation.receiptSha256,
    });
  }
  if (compilation.status !== "rejected" || compilation.artifacts !== undefined) {
    throw invalidCompilerResult();
  }
  return Object.freeze({
    schemaVersion: AREA_EVENT_SCRIPT_VALIDATION_RESULT_SCHEMA_VERSION,
    status: "rejected",
    moduleId: input.moduleId,
    moduleRevision: input.moduleRevision,
    targetResRef: compilation.targetResref,
    sourceSha256: compilation.sourceSha256,
    includeSetSha256: compilation.includeSetSha256,
    executionProfileSha256: compilation.executionProfileSha256,
    provider: freezeProvider(compilation.provider),
    diagnostics,
    compilerReceiptSha256: compilation.receiptSha256,
  });
}

export function createAreaEventScriptPublicationCandidateManifest(
  candidate: AreaEventScriptPublicationCandidate,
): AreaEventScriptPublicationCandidateManifest {
  const verified = validateAreaEventScriptPublicationCandidate(candidate);
  return Object.freeze({
    targetResRef: verified.targetResRef,
    sourceSha256: verified.sourceSha256,
    includeSetSha256: verified.includeSetSha256,
    executionProfileSha256: verified.executionProfileSha256,
    provider: freezeProvider(verified.provider),
    compilerReceiptSha256: verified.compilerReceiptSha256,
    resources: Object.freeze(verified.resources.map(({ bytes: _bytes, ...resource }) =>
      Object.freeze(resource))),
  });
}

export function validateAreaEventScriptPublicationCandidate(
  candidate: AreaEventScriptPublicationCandidate,
): AreaEventScriptPublicationCandidate {
  if (
    !candidate ||
    !SHA256_PATTERN.test(candidate.expectedModuleRevision) ||
    !RESREF_PATTERN.test(candidate.targetResRef) ||
    candidate.targetResRef === "nwscript" ||
    !SHA256_PATTERN.test(candidate.sourceSha256) ||
    !SHA256_PATTERN.test(candidate.includeSetSha256) ||
    !SHA256_PATTERN.test(candidate.executionProfileSha256) ||
    !SHA256_PATTERN.test(candidate.compilerReceiptSha256) ||
    !isProviderIdentity(candidate.provider) ||
    !Array.isArray(candidate.resources) ||
    candidate.resources.length !== 3
  ) {
    throw invalidCompilerResult();
  }
  const resources = candidate.resources.map((resource) => cloneResource(resource));
  const expected = [
    ["ncs", AREA_EVENT_SCRIPT_NCS_RESOURCE_TYPE],
    ["ndb", AREA_EVENT_SCRIPT_NDB_RESOURCE_TYPE],
    ["nss", AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE],
  ] as const;
  for (const [index, [extension, resourceType]] of expected.entries()) {
    const resource = resources[index];
    if (
      resource.extension !== extension ||
      resource.resourceType !== resourceType ||
      resource.logicalKey !== `${candidate.targetResRef}.${extension}` ||
      (extension === "nss" && resource.sha256 !== candidate.sourceSha256)
    ) {
      throw invalidCompilerResult();
    }
  }
  return Object.freeze({
    ...candidate,
    provider: freezeProvider(candidate.provider),
    diagnostics: freezeDiagnostics(candidate.diagnostics),
    resources: Object.freeze(resources),
  });
}

function cloneArtifact(artifact: Readonly<{ bytes: Buffer; size: number; sha256: string }>) {
  if (
    !artifact ||
    !Buffer.isBuffer(artifact.bytes) ||
    !Number.isSafeInteger(artifact.size) ||
    artifact.size < 0 ||
    artifact.size > AREA_EVENT_SCRIPT_COMPILED_ARTIFACT_MAX_BYTES ||
    artifact.bytes.length !== artifact.size ||
    !SHA256_PATTERN.test(artifact.sha256) ||
    sha256(artifact.bytes) !== artifact.sha256
  ) {
    throw invalidCompilerResult();
  }
  return Object.freeze({
    bytes: Buffer.from(artifact.bytes),
    size: artifact.size,
    sha256: artifact.sha256,
  });
}

function descriptorOnly(
  artifact: Readonly<{ bytes: Buffer; size: number; sha256: string }>,
): Readonly<{ size: number; sha256: string }> {
  const verified = cloneArtifact(artifact);
  return Object.freeze({ size: verified.size, sha256: verified.sha256 });
}

function cloneResource(
  resource: AreaEventScriptPublicationCandidateResource,
): AreaEventScriptPublicationCandidateResource {
  const cloned = cloneArtifact(resource);
  return Object.freeze({
    extension: resource.extension,
    logicalKey: resource.logicalKey,
    resourceType: resource.resourceType,
    ...cloned,
  });
}

function freezeResource(
  extension: AreaEventScriptPublicationResourceExtension,
  resourceType: number,
  targetResRef: string,
  artifact: Readonly<{ bytes: Buffer; size: number; sha256: string }>,
): AreaEventScriptPublicationCandidateResource {
  return Object.freeze({
    extension,
    logicalKey: `${targetResRef}.${extension}`,
    resourceType,
    bytes: Buffer.from(artifact.bytes),
    size: artifact.size,
    sha256: artifact.sha256,
  });
}

function isProviderIdentity(value: NwnScriptCompilerProviderIdentity): boolean {
  return Boolean(
    value &&
      value.providerId === "neverwinter-nim-official-script-compiler" &&
      SHA256_PATTERN.test(value.executableSha256) &&
      typeof value.versionMarker === "string" &&
      value.versionMarker.length > 0 &&
      Buffer.byteLength(value.versionMarker, "utf8") <= 256 &&
      SHA256_PATTERN.test(value.versionOutputSha256) &&
      SHA256_PATTERN.test(value.languageSpecSha256) &&
      SHA256_PATTERN.test(value.runtimeLibrarySetSha256) &&
      SHA256_PATTERN.test(value.launcherFileSetSha256),
  );
}

function freezeProvider(
  provider: NwnScriptCompilerProviderIdentity,
): NwnScriptCompilerProviderIdentity {
  return Object.freeze({ ...provider });
}

function freezeDiagnostics(
  values: readonly NwnScriptCompilerDiagnostic[],
): readonly NwnScriptCompilerDiagnostic[] {
  if (!Array.isArray(values) || values.length > 100) throw invalidCompilerResult();
  return Object.freeze(values.map((value) => {
    if (
      !value ||
      !["NWNSCRIPT_COMPILE_ERROR", "NWNSCRIPT_COMPILE_WARNING", "NWNSCRIPT_COMPILER_REJECTED"].includes(value.code) ||
      !["error", "warning"].includes(value.severity) ||
      typeof value.message !== "string" ||
      value.message.length === 0 ||
      Buffer.byteLength(value.message, "utf8") > 1_024 ||
      (value.line !== undefined && (!Number.isSafeInteger(value.line) || value.line < 1)) ||
      (value.column !== undefined && (!Number.isSafeInteger(value.column) || value.column < 1)) ||
      (value.detailSha256 !== undefined && !SHA256_PATTERN.test(value.detailSha256))
    ) {
      throw invalidCompilerResult();
    }
    return Object.freeze({ ...value });
  }));
}

function invalidCompilerResult(): AreaEventScriptPublicationCandidateError {
  return new AreaEventScriptPublicationCandidateError(
    "AREA_EVENT_SCRIPT_COMPILER_RESULT_INVALID",
    "NWScript compiler result does not match the publication contract.",
  );
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
