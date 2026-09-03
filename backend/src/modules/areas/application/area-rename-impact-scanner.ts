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
  AREA_RENAME_IMPACT_SCAN_VERSION,
  AREA_RENAME_PREVIEW_SCHEMA_VERSION,
  AREA_RENAME_SCAN_BUDGETS,
  type AreaRenameImpactFinding,
  type AreaRenameImpactScanInput,
  type AreaRenamePreview,
  type AreaRenamePreviewResource,
} from "../domain/area-rename.types";
import {
  readExactAreaRootResRef,
  readExactModuleAreaIdentity,
} from "../adapters/outbound/blob/aurora-gff-area-resref-rename-writer";
import { parseRawGffDocument } from "../../catalog/adapters/outbound/blob/aurora-gff-template-parser";

const PREVIEW_TTL_MS = 5 * 60 * 1_000;
const CANONICAL_RESREF = /^[a-z0-9_]{1,16}$/u;
const SOURCE_EXTENSIONS = ["are", "gic", "git"] as const;

export type AreaRenamePreviewErrorCode =
  | "AREA_RENAME_INVALID"
  | "AREA_RENAME_MODULE_REVISION_CONFLICT"
  | "AREA_RENAME_SOURCE_MISSING"
  | "AREA_RENAME_RESOURCE_COLLISION"
  | "AREA_RENAME_STORAGE_UNAVAILABLE";

export class AreaRenamePreviewError extends Error {
  constructor(
    readonly code: AreaRenamePreviewErrorCode,
    readonly status: number,
    message: string,
    readonly details: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaRenamePreviewError";
    this.details = Object.freeze([...details]);
  }
}

export class AreaRenameImpactScanner {
  constructor(
    private readonly repository: Pick<
      AtomicModuleSnapshotRepositoryPort,
      "readHead" | "readManifest" | "readContent"
    >,
    private readonly clock: Readonly<{ nowIso(): string }> = {
      nowIso: () => new Date().toISOString(),
    },
  ) {}

  async scan(input: AreaRenameImpactScanInput): Promise<AreaRenamePreview> {
    assertRenameInput(input);
    const head = await this.repository.readHead(input.moduleId);
    if (!head) {
      throw previewError("AREA_RENAME_SOURCE_MISSING", 404, "Module snapshot head is missing.");
    }
    if (head.revision !== input.expectedModuleRevision) {
      throw previewError(
        "AREA_RENAME_MODULE_REVISION_CONFLICT",
        412,
        "Module revision changed before the Area rename preview.",
        [`expected=${input.expectedModuleRevision}`, `actual=${head.revision}`],
      );
    }
    if (head.quarantined) {
      throw previewError("AREA_RENAME_STORAGE_UNAVAILABLE", 503, "Module snapshot is quarantined.");
    }
    const manifest = await this.repository.readManifest(head.manifestKey);
    if (!manifest) {
      throw previewError("AREA_RENAME_STORAGE_UNAVAILABLE", 503, "Module manifest is missing.");
    }
    this.assertManifestIdentity(manifest, head);

    const sourceDescriptors = SOURCE_EXTENSIONS.map((extension) => this.requireUniqueDescriptor(
      manifest,
      `${input.areaResRef}.${extension}`,
      resourceTypeForExtension(extension),
    ));
    const targetResourceKeys = SOURCE_EXTENSIONS.map((extension) =>
      `${input.targetAreaResRef}.${extension}`,
    );
    for (const logicalKey of targetResourceKeys) {
      if (manifest.objects.some((entry) => entry.logicalKey.toLowerCase() === logicalKey)) {
        throw previewError(
          "AREA_RENAME_RESOURCE_COLLISION",
          409,
          `Area rename target resource already exists: ${logicalKey}.`,
        );
      }
    }
    const ifoDescriptor = this.requireUniqueDescriptor(manifest, "module.ifo", 2014);

    const findings: AreaRenameImpactFinding[] = [];
    let findingsTruncated = false;
    const addFinding = (entry: AreaRenameImpactFinding): void => {
      if (findings.length < AREA_RENAME_SCAN_BUDGETS.maxFindings - 1) {
        findings.push(Object.freeze(entry));
      } else {
        findingsTruncated = true;
      }
    };
    if (manifest.objects.length > AREA_RENAME_SCAN_BUDGETS.maxObjects) {
      addFinding(finding(
        "AREA_RENAME_SCAN_BUDGET_EXCEEDED",
        "module.manifest",
        "$.objects",
        `Manifest contains ${manifest.objects.length} objects; limit is ${AREA_RENAME_SCAN_BUDGETS.maxObjects}.`,
      ));
    }

    const requiredKeys = new Set(
      [...sourceDescriptors, ifoDescriptor].map((entry) => entry.logicalKey.toLowerCase()),
    );
    const bytesByKey = new Map<string, Buffer>();
    let admittedTotalBytes = 0;
    for (const [index, descriptor] of manifest.objects.entries()) {
      const logicalKey = descriptor.logicalKey.toLowerCase();
      const required = requiredKeys.has(logicalKey);
      if (index >= AREA_RENAME_SCAN_BUDGETS.maxObjects && !required) {
        continue;
      }
      if (descriptor.size > AREA_RENAME_SCAN_BUDGETS.maxObjectBytes) {
        addFinding(finding(
          "AREA_RENAME_SCAN_BUDGET_EXCEEDED",
          descriptor.logicalKey,
          "$binary",
          `Object size ${descriptor.size} exceeds ${AREA_RENAME_SCAN_BUDGETS.maxObjectBytes} bytes.`,
        ));
        if (!required) continue;
      }
      if (admittedTotalBytes + descriptor.size > AREA_RENAME_SCAN_BUDGETS.maxTotalBytes) {
        addFinding(finding(
          "AREA_RENAME_SCAN_BUDGET_EXCEEDED",
          descriptor.logicalKey,
          "$binary",
          `Aggregate scan exceeds ${AREA_RENAME_SCAN_BUDGETS.maxTotalBytes} bytes.`,
        ));
        if (!required) continue;
      }
      const bytes = await this.readVerified(descriptor);
      bytesByKey.set(logicalKey, bytes);
      admittedTotalBytes += descriptor.size;
    }

    for (const descriptor of [...sourceDescriptors, ifoDescriptor]) {
      if (!bytesByKey.has(descriptor.logicalKey.toLowerCase())) {
        bytesByKey.set(
          descriptor.logicalKey.toLowerCase(),
          await this.readVerified(descriptor),
        );
      }
    }

    const areDescriptor = sourceDescriptors.find((entry) => entry.logicalKey.toLowerCase().endsWith(".are"));
    const gitDescriptor = sourceDescriptors.find((entry) => entry.logicalKey.toLowerCase().endsWith(".git"));
    const gicDescriptor = sourceDescriptors.find((entry) => entry.logicalKey.toLowerCase().endsWith(".gic"));
    if (!areDescriptor || !gitDescriptor || !gicDescriptor) {
      throw previewError("AREA_RENAME_STORAGE_UNAVAILABLE", 503, "Area source descriptor classification failed.");
    }
    const areBytes = bytesByKey.get(areDescriptor.logicalKey.toLowerCase())!;
    const gitBytes = bytesByKey.get(gitDescriptor.logicalKey.toLowerCase())!;
    const gicBytes = bytesByKey.get(gicDescriptor.logicalKey.toLowerCase())!;
    const ifoBytes = bytesByKey.get(ifoDescriptor.logicalKey.toLowerCase())!;

    const sourceAreaRootResRef = readExactAreaRootResRef(areBytes);
    const areIdentityValid = sourceAreaRootResRef === input.areaResRef;
    if (!areIdentityValid) {
      addFinding(finding(
        "AREA_RENAME_SOURCE_IDENTITY_INVALID",
        areDescriptor.logicalKey,
        "$.ResRef",
        "Source ARE must contain one exact canonical root ResRef matching the source identity.",
      ));
    }
    validateCompanion(gitBytes, "GIT ", gitDescriptor.logicalKey, addFinding);
    validateCompanion(gicBytes, "GIC ", gicDescriptor.logicalKey, addFinding);

    const oldModuleIdentity = readExactModuleAreaIdentity(ifoBytes, input.areaResRef);
    const newModuleIdentity = readExactModuleAreaIdentity(ifoBytes, input.targetAreaResRef);
    const moduleIdentityValid = oldModuleIdentity !== null && newModuleIdentity !== null;
    const oldMembershipCount = oldModuleIdentity?.membershipCount ?? 0;
    const newMembershipCount = newModuleIdentity?.membershipCount ?? 0;
    const entryAreaResRef = oldModuleIdentity?.entryAreaResRef ?? null;
    if (!moduleIdentityValid || oldMembershipCount !== 1 || newMembershipCount !== 0) {
      addFinding(finding(
        "AREA_RENAME_MEMBERSHIP_INVALID",
        ifoDescriptor.logicalKey,
        "$.Mod_Area_list",
        "Module IFO must have one exact source membership, zero target memberships, and exact identity fields.",
      ));
    }

    for (const descriptor of manifest.objects) {
      const logicalKey = descriptor.logicalKey.toLowerCase();
      const bytes = bytesByKey.get(logicalKey);
      if (!bytes) continue;
      if (logicalKey === areDescriptor.logicalKey.toLowerCase() && !areIdentityValid) continue;
      if (logicalKey === ifoDescriptor.logicalKey.toLowerCase() && !moduleIdentityValid) continue;
      const admittedSingleByteCount = logicalKey === areDescriptor.logicalKey.toLowerCase()
        ? 1
        : logicalKey === ifoDescriptor.logicalKey.toLowerCase()
          ? oldMembershipCount + (entryAreaResRef === input.areaResRef ? 1 : 0)
          : 0;
      scanRawTokenRepresentations(
        bytes,
        input.areaResRef,
        descriptor.logicalKey,
        admittedSingleByteCount,
        addFinding,
      );
    }

    if (findingsTruncated) {
      findings.push(finding(
        "AREA_RENAME_REFERENCE_SCAN_TRUNCATED",
        "module.manifest",
        "$",
        `Impact findings exceeded the admitted ${AREA_RENAME_SCAN_BUDGETS.maxFindings}-entry budget.`,
      ));
    }
    findings.sort(compareFindings);
    const sourceResources = Object.freeze(sourceDescriptors.map(publicDescriptor));
    const moduleIfo = publicDescriptor(ifoDescriptor);
    const blockerCount = findings.filter((entry) => entry.severity === "blocker").length;
    const warningCount = findings.length - blockerCount;
    const hashInput = {
      schemaVersion: AREA_RENAME_PREVIEW_SCHEMA_VERSION,
      scanVersion: AREA_RENAME_IMPACT_SCAN_VERSION,
      moduleId: input.moduleId,
      areaResRef: input.areaResRef,
      targetAreaResRef: input.targetAreaResRef,
      moduleRevision: head.revision,
      sourceResources,
      targetResourceKeys: Object.freeze([...targetResourceKeys]),
      moduleIfo,
      sourceAreaRootResRef,
      oldMembershipCount,
      newMembershipCount,
      entryAreaResRef,
      entryAreaUpdated: entryAreaResRef === input.areaResRef,
      scanBudgets: AREA_RENAME_SCAN_BUDGETS,
      findings,
      blockerCount,
      warningCount,
    };
    const previewSha256 = createHash("sha256")
      .update(canonicalJson(hashInput), "utf8")
      .digest("hex");
    const nowMs = Date.parse(this.clock.nowIso());
    if (!Number.isFinite(nowMs)) {
      throw previewError("AREA_RENAME_STORAGE_UNAVAILABLE", 503, "Preview clock is invalid.");
    }
    return deepFreeze({
      ...hashInput,
      previewSha256,
      expiresAt: new Date(nowMs + PREVIEW_TTL_MS).toISOString(),
    });
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
        "AREA_RENAME_SOURCE_MISSING",
        404,
        `Required Area rename resource is missing: ${logicalKey}.`,
      );
    }
    if (matches.length !== 1 || matches[0]?.resourceType !== expectedType) {
      throw previewError(
        "AREA_RENAME_RESOURCE_COLLISION",
        409,
        `Area rename resource identity collides: ${logicalKey}.`,
      );
    }
    return matches[0];
  }

  private async readVerified(descriptor: ModuleSnapshotObjectDescriptor): Promise<Buffer> {
    const retained = await this.repository.readContent(descriptor.contentKey);
    if (!retained ||
        retained.size !== descriptor.size || retained.sha256 !== descriptor.sha256 ||
        retained.bytes.length !== descriptor.size || sha256(retained.bytes) !== descriptor.sha256) {
      throw previewError(
        "AREA_RENAME_STORAGE_UNAVAILABLE",
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
    if (verified.revision !== head.revision ||
        buildModuleSnapshotManifestKey(verified) !== head.manifestKey ||
        hashModuleSnapshotManifest(verified) !== head.manifestSha256) {
      throw previewError(
        "AREA_RENAME_STORAGE_UNAVAILABLE",
        503,
        "Module manifest does not match the captured head.",
      );
    }
  }
}

function validateCompanion(
  bytes: Buffer,
  expectedFileType: "GIT " | "GIC ",
  resourceKey: string,
  addFinding: (finding: AreaRenameImpactFinding) => void,
): void {
  const document = parseRawGffDocument(bytes);
  if (!document || document.fileType !== expectedFileType || document.fileVersion !== "V3.2") {
    addFinding(finding(
      "AREA_RENAME_COMPANION_INVALID",
      resourceKey,
      "$",
      `Source companion must be a readable ${expectedFileType.trim()} V3.2 GFF document.`,
    ));
  }
}

function scanRawTokenRepresentations(
  bytes: Buffer,
  target: string,
  resourceKey: string,
  admittedSingleByteCount: number,
  addFinding: (finding: AreaRenameImpactFinding) => void,
): void {
  const counts = [
    ["single-byte", countSingleByteTokens(bytes, target), admittedSingleByteCount],
    ["utf-16le", countUtf16Tokens(bytes, target, "le"), 0],
    ["utf-16be", countUtf16Tokens(bytes, target, "be"), 0],
  ] as const;
  for (const [encoding, count, admitted] of counts) {
    if (count > admitted) {
      addFinding(finding(
        "AREA_RENAME_STATIC_REFERENCE",
        resourceKey,
        `$binary:${encoding}`,
        `Found ${count - admitted} non-admitted exact source identity token(s) in ${encoding} representation.`,
      ));
    }
  }
}

function countSingleByteTokens(bytes: Buffer, target: string): number {
  let count = 0;
  for (let offset = 0; offset + target.length <= bytes.length; offset += 1) {
    if (!matchesAsciiAt(bytes, offset, target)) continue;
    const left = offset === 0 ? -1 : bytes[offset - 1]!;
    const rightOffset = offset + target.length;
    const right = rightOffset >= bytes.length ? -1 : bytes[rightOffset]!;
    if (!isResRefAscii(left) && !isResRefAscii(right)) count += 1;
  }
  return count;
}

function countUtf16Tokens(bytes: Buffer, target: string, endian: "le" | "be"): number {
  const width = target.length * 2;
  let count = 0;
  for (let offset = 0; offset + width <= bytes.length; offset += 1) {
    let matches = true;
    for (let index = 0; index < target.length; index += 1) {
      const codeUnit = readCodeUnit(bytes, offset + index * 2, endian);
      if (asciiLower(codeUnit) !== target.charCodeAt(index)) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;
    const left = offset < 2 ? -1 : readCodeUnit(bytes, offset - 2, endian);
    const rightOffset = offset + width;
    const right = rightOffset + 1 >= bytes.length ? -1 : readCodeUnit(bytes, rightOffset, endian);
    if (!isResRefAscii(left) && !isResRefAscii(right)) count += 1;
  }
  return count;
}

function matchesAsciiAt(bytes: Buffer, offset: number, target: string): boolean {
  for (let index = 0; index < target.length; index += 1) {
    if (asciiLower(bytes[offset + index]!) !== target.charCodeAt(index)) return false;
  }
  return true;
}

function readCodeUnit(bytes: Buffer, offset: number, endian: "le" | "be"): number {
  return endian === "le"
    ? bytes[offset]! | (bytes[offset + 1]! << 8)
    : (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function asciiLower(value: number): number {
  return value >= 0x41 && value <= 0x5a ? value + 0x20 : value;
}

function isResRefAscii(value: number): boolean {
  const normalized = asciiLower(value);
  return (normalized >= 0x61 && normalized <= 0x7a) ||
    (normalized >= 0x30 && normalized <= 0x39) || normalized === 0x5f;
}

function finding(
  code: AreaRenameImpactFinding["code"],
  resourceKey: string,
  fieldPath: string,
  reason: string,
): AreaRenameImpactFinding {
  return Object.freeze({ code, severity: "blocker", resourceKey, fieldPath, reason });
}

function compareFindings(left: AreaRenameImpactFinding, right: AreaRenameImpactFinding): number {
  return left.code.localeCompare(right.code, "en") ||
    left.resourceKey.toLowerCase().localeCompare(right.resourceKey.toLowerCase(), "en") ||
    left.fieldPath.localeCompare(right.fieldPath, "en");
}

function publicDescriptor(descriptor: ModuleSnapshotObjectDescriptor): AreaRenamePreviewResource {
  return Object.freeze({
    logicalKey: descriptor.logicalKey,
    resourceType: descriptor.resourceType,
    size: descriptor.size,
    sha256: descriptor.sha256,
  });
}

function resourceTypeForExtension(extension: typeof SOURCE_EXTENSIONS[number]): number {
  return extension === "are" ? 2012 : extension === "git" ? 2023 : 2046;
}

function assertRenameInput(input: AreaRenameImpactScanInput): void {
  if (!CANONICAL_RESREF.test(input.areaResRef) ||
      !CANONICAL_RESREF.test(input.targetAreaResRef) ||
      input.areaResRef === input.targetAreaResRef) {
    throw previewError(
      "AREA_RENAME_INVALID",
      422,
      "Area rename identities must be distinct canonical lowercase ResRefs.",
    );
  }
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

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function previewError(
  code: AreaRenamePreviewErrorCode,
  status: number,
  message: string,
  details: readonly string[] = [],
): AreaRenamePreviewError {
  return new AreaRenamePreviewError(code, status, message, details);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
