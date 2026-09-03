import { createHash } from "node:crypto";
import type { AtomicModuleSnapshotRepositoryPort } from "./ports/atomic-module-snapshot.port";
import {
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  validateModuleSnapshotManifest,
  type ModuleSnapshotManifest,
  type ModuleSnapshotObjectDescriptor,
} from "../domain/module-snapshot-manifest";
import {
  AREA_DELETE_IMPACT_SCAN_VERSION,
  AREA_DELETE_PREVIEW_SCHEMA_VERSION,
  type AreaDeleteImpactFinding,
  type AreaDeleteImpactScanInput,
  type AreaDeletePreview,
  type AreaDeletePreviewResource,
} from "../domain/area-delete.types";
import {
  moduleIfoAreaMembershipCount,
  readModuleIfoEntryArea,
} from "../adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import { parseRawGffDocument } from "../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { SupportedGffField } from "../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const MAX_FINDINGS = 256;
const MAX_SCRIPT_SOURCE_BYTES = 4 * 1024 * 1024;
const PREVIEW_TTL_MS = 5 * 60 * 1_000;
const LINK_FIELD_NAMES = new Set([
  "linkedto",
  "transitiondestin",
  "transitiondestination",
]);

export type AreaDeletePreviewErrorCode =
  | "AREA_DELETE_MODULE_REVISION_CONFLICT"
  | "AREA_DELETE_SOURCE_MISSING"
  | "AREA_DELETE_RESOURCE_COLLISION"
  | "AREA_DELETE_STORAGE_UNAVAILABLE";

export class AreaDeletePreviewError extends Error {
  constructor(
    readonly code: AreaDeletePreviewErrorCode,
    readonly status: number,
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaDeletePreviewError";
    this.details = Object.freeze([...details]);
  }
}

export class AreaDeleteImpactScanner {
  constructor(
    private readonly repository: Pick<
      AtomicModuleSnapshotRepositoryPort,
      "readHead" | "readManifest" | "readContent"
    >,
    private readonly clock: Readonly<{ nowIso(): string }> = {
      nowIso: () => new Date().toISOString(),
    },
  ) {}

  async scan(input: AreaDeleteImpactScanInput): Promise<AreaDeletePreview> {
    const head = await this.repository.readHead(input.moduleId);
    if (!head) {
      throw previewError("AREA_DELETE_SOURCE_MISSING", 404, "Module snapshot head is missing.");
    }
    if (head.revision !== input.expectedModuleRevision) {
      throw previewError(
        "AREA_DELETE_MODULE_REVISION_CONFLICT",
        412,
        "Module revision changed before the Area Delete preview.",
        [`expected=${input.expectedModuleRevision}`, `actual=${head.revision}`],
      );
    }
    if (head.quarantined) {
      throw previewError(
        "AREA_DELETE_STORAGE_UNAVAILABLE",
        503,
        "Module snapshot is quarantined.",
      );
    }
    const manifest = await this.repository.readManifest(head.manifestKey);
    if (!manifest) {
      throw previewError("AREA_DELETE_STORAGE_UNAVAILABLE", 503, "Module manifest is missing.");
    }
    this.assertManifestIdentity(manifest, head);
    const targetDescriptors = (["are", "gic", "git"] as const).map((extension) =>
      this.requireUniqueDescriptor(
        manifest,
        `${input.areaResRef}.${extension}`,
        resourceTypeForExtension(extension),
      ),
    );
    const ifoDescriptor = this.requireUniqueDescriptor(manifest, "module.ifo", 2014);
    const targetBytes = new Map<string, Buffer>();
    for (const descriptor of targetDescriptors) {
      targetBytes.set(descriptor.logicalKey.toLowerCase(), await this.readVerified(descriptor));
    }
    const ifoBytes = await this.readVerified(ifoDescriptor);
    const findings: AreaDeleteImpactFinding[] = [];
    let truncated = false;
    const addFinding = (finding: AreaDeleteImpactFinding): void => {
      if (findings.length < MAX_FINDINGS - 1) findings.push(Object.freeze(finding));
      else truncated = true;
    };

    this.validateTargetResources(input.areaResRef, targetDescriptors, targetBytes, addFinding);
    const membershipCount = moduleIfoAreaMembershipCount(ifoBytes, input.areaResRef);
    if (membershipCount !== 1) {
      addFinding(finding(
        "AREA_DELETE_MEMBERSHIP_INVALID",
        "module.ifo",
        "$.Mod_Area_list",
        `Expected exactly one target membership; received ${membershipCount}.`,
      ));
    }
    const entryAreaResRef = readModuleIfoEntryArea(ifoBytes);
    if (entryAreaResRef === normalizeIdentity(input.areaResRef)) {
      addFinding(finding(
        "AREA_DELETE_ENTRY_AREA_REFERENCE",
        "module.ifo",
        "$.Mod_Entry_Area",
        "The target is the native module entry Area.",
      ));
    }

    const targetGitKey = `${input.areaResRef}.git`.toLowerCase();
    for (const descriptor of manifest.objects) {
      const logicalKey = descriptor.logicalKey.toLowerCase();
      if (logicalKey.endsWith(".git") && logicalKey !== targetGitKey) {
        const bytes = await this.readVerified(descriptor);
        const document = parseRawGffDocument(bytes);
        if (!document || document.fileType !== "GIT " || document.fileVersion !== "V3.2") {
          addFinding(finding(
            "AREA_DELETE_GIT_SCAN_INVALID",
            descriptor.logicalKey,
            "$",
            "Retained GIT could not be completely inspected.",
          ));
        } else {
          scanFieldsForTarget(
            document.fields,
            "$",
            input.areaResRef,
            descriptor.logicalKey,
            addFinding,
          );
        }
      } else if (logicalKey.endsWith(".nss")) {
        const bytes = await this.readVerified(descriptor);
        if (
          bytes.length > MAX_SCRIPT_SOURCE_BYTES ||
          scriptContainsToken(bytes, input.areaResRef)
        ) {
          addFinding(finding(
            "AREA_DELETE_SCRIPT_SOURCE_REFERENCE",
            descriptor.logicalKey,
            "$text",
            bytes.length > MAX_SCRIPT_SOURCE_BYTES
              ? "Script source exceeds the admitted static-scan budget."
              : "Script source contains the exact target Area token.",
          ));
        }
      } else if (logicalKey.endsWith(".ncs")) {
        addFinding(finding(
          "AREA_DELETE_COMPILED_SCRIPT_UNINSPECTABLE",
          descriptor.logicalKey,
          "$binary",
          "Compiled script prevents complete static Area-reference proof.",
        ));
      }
    }
    if (truncated) {
      findings.splice(MAX_FINDINGS - 1, 1, finding(
        "AREA_DELETE_REFERENCE_SCAN_TRUNCATED",
        "module.manifest",
        "$",
        "Impact findings exceeded the admitted 256-entry budget.",
      ));
    }
    findings.sort(compareFindings);
    const targetResources = Object.freeze(targetDescriptors.map(publicDescriptor));
    const moduleIfo = publicDescriptor(ifoDescriptor);
    const blockerCount = findings.filter((entry) => entry.severity === "blocker").length;
    const warningCount = findings.length - blockerCount;
    const hashInput = {
      schemaVersion: AREA_DELETE_PREVIEW_SCHEMA_VERSION,
      scanVersion: AREA_DELETE_IMPACT_SCAN_VERSION,
      moduleId: input.moduleId,
      areaResRef: normalizeIdentity(input.areaResRef),
      moduleRevision: head.revision,
      targetResources,
      moduleIfo,
      membershipCount,
      entryAreaResRef,
      findings,
      blockerCount,
      warningCount,
    };
    const previewSha256 = createHash("sha256")
      .update(canonicalJson(hashInput), "utf8")
      .digest("hex");
    const nowMs = Date.parse(this.clock.nowIso());
    if (!Number.isFinite(nowMs)) {
      throw previewError("AREA_DELETE_STORAGE_UNAVAILABLE", 503, "Preview clock is invalid.");
    }
    return deepFreeze({
      ...hashInput,
      previewSha256,
      expiresAt: new Date(nowMs + PREVIEW_TTL_MS).toISOString(),
    });
  }

  private validateTargetResources(
    areaResRef: string,
    descriptors: readonly ModuleSnapshotObjectDescriptor[],
    bytesByKey: ReadonlyMap<string, Buffer>,
    addFinding: (finding: AreaDeleteImpactFinding) => void,
  ): void {
    const expectedTypes = new Map(["are", "git", "gic"].map((extension) => [
      extension,
      extension.toUpperCase().padEnd(4, " "),
    ]));
    for (const descriptor of descriptors) {
      const extension = descriptor.logicalKey.split(".").at(-1)?.toLowerCase() ?? "";
      const bytes = bytesByKey.get(descriptor.logicalKey.toLowerCase());
      const document = bytes ? parseRawGffDocument(bytes) : null;
      if (
        !document ||
        document.fileVersion !== "V3.2" ||
        document.fileType !== expectedTypes.get(extension)
      ) {
        addFinding(finding(
          "AREA_DELETE_TARGET_RESOURCE_INVALID",
          descriptor.logicalKey,
          "$",
          `Target ${extension.toUpperCase()} is not a readable V3.2 GFF.`,
        ));
      }
    }
    void areaResRef;
  }

  private requireUniqueDescriptor(
    manifest: ModuleSnapshotManifest,
    logicalKey: string,
    expectedType: number,
  ): ModuleSnapshotObjectDescriptor {
    const matches = manifest.objects.filter(
      (entry) => entry.logicalKey.toLowerCase() === logicalKey.toLowerCase(),
    );
    if (matches.length === 0) {
      throw previewError(
        "AREA_DELETE_SOURCE_MISSING",
        404,
        `Required Area Delete resource is missing: ${logicalKey}.`,
      );
    }
    if (matches.length !== 1 || matches[0].resourceType !== expectedType) {
      throw previewError(
        "AREA_DELETE_RESOURCE_COLLISION",
        409,
        `Area Delete resource identity collides: ${logicalKey}.`,
      );
    }
    return matches[0];
  }

  private async readVerified(descriptor: ModuleSnapshotObjectDescriptor): Promise<Buffer> {
    const retained = await this.repository.readContent(descriptor.contentKey);
    if (
      !retained ||
      retained.size !== descriptor.size ||
      retained.sha256 !== descriptor.sha256 ||
      retained.bytes.length !== descriptor.size ||
      sha256(retained.bytes) !== descriptor.sha256
    ) {
      throw previewError(
        "AREA_DELETE_STORAGE_UNAVAILABLE",
        503,
        `Snapshot content does not match descriptor: ${descriptor.logicalKey}.`,
      );
    }
    return Buffer.from(retained.bytes);
  }

  private assertManifestIdentity(
    manifest: ModuleSnapshotManifest,
    head: Readonly<{ revision: string; manifestKey: string; manifestSha256: string }>,
  ): void {
    const verified = validateModuleSnapshotManifest(manifest);
    if (
      verified.revision !== head.revision ||
      buildModuleSnapshotManifestKey(verified) !== head.manifestKey ||
      hashModuleSnapshotManifest(verified) !== head.manifestSha256
    ) {
      throw previewError(
        "AREA_DELETE_STORAGE_UNAVAILABLE",
        503,
        "Module manifest does not match the captured head.",
      );
    }
  }
}

function scanFieldsForTarget(
  fields: readonly SupportedGffField[],
  path: string,
  target: string,
  resourceKey: string,
  addFinding: (finding: AreaDeleteImpactFinding) => void,
): void {
  for (const field of fields) {
    const fieldPath = `${path}.${field.label}`;
    if (
      LINK_FIELD_NAMES.has(field.label.toLowerCase()) &&
      typeof field.value === "string" &&
      normalizeIdentity(field.value) === normalizeIdentity(target)
    ) {
      addFinding(finding(
        "AREA_DELETE_GIT_REFERENCE",
        resourceKey,
        fieldPath,
        "Retained GIT linkage field identifies the target Area.",
      ));
    }
    if (field.type === "struct") {
      scanFieldsForTarget(field.value.fields, fieldPath, target, resourceKey, addFinding);
    } else if (field.type === "list") {
      field.value.forEach((entry, index) =>
        scanFieldsForTarget(
          entry.fields,
          `${fieldPath}[${index}]`,
          target,
          resourceKey,
          addFinding,
        ),
      );
    }
  }
}

function scriptContainsToken(bytes: Buffer, target: string): boolean {
  const escaped = normalizeIdentity(target).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9_])${escaped}([^A-Za-z0-9_]|$)`, "iu")
    .test(bytes.toString("utf8"));
}

function finding(
  code: AreaDeleteImpactFinding["code"],
  resourceKey: string,
  fieldPath: string,
  reason: string,
): AreaDeleteImpactFinding {
  return Object.freeze({ code, severity: "blocker", resourceKey, fieldPath, reason });
}

function compareFindings(left: AreaDeleteImpactFinding, right: AreaDeleteImpactFinding): number {
  return (
    left.code.localeCompare(right.code, "en") ||
    left.resourceKey.toLowerCase().localeCompare(right.resourceKey.toLowerCase(), "en") ||
    left.fieldPath.localeCompare(right.fieldPath, "en")
  );
}

function publicDescriptor(descriptor: ModuleSnapshotObjectDescriptor): AreaDeletePreviewResource {
  return Object.freeze({
    logicalKey: descriptor.logicalKey,
    resourceType: descriptor.resourceType,
    size: descriptor.size,
    sha256: descriptor.sha256,
  });
}

function resourceTypeForExtension(extension: "are" | "git" | "gic"): number {
  return extension === "are" ? 2012 : extension === "git" ? 2023 : 2046;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right, "en"))
      .map(([key, child]) => `${JSON.stringify(key)}:${canonicalJson(child)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function normalizeIdentity(value: string): string {
  return value.trim().toLowerCase();
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function previewError(
  code: AreaDeletePreviewErrorCode,
  status: number,
  message: string,
  details: readonly string[] = [],
): AreaDeletePreviewError {
  return new AreaDeletePreviewError(code, status, message, details);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
