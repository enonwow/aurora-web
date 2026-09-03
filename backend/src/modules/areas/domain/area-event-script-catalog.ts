export const AREA_EVENT_SCRIPT_CATALOG_SCHEMA_VERSION =
  "area-event-script-catalog.v1" as const;
export const AREA_EVENT_SCRIPT_CATALOG_MAX_INSPECTED_DESCRIPTORS = 50_000;
export const AREA_EVENT_SCRIPT_CATALOG_MAX_ADMITTED_RESREFS = 10_000;
export const AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE = 2009 as const;
export const AREA_EVENT_SCRIPT_NCS_RESOURCE_TYPE = 2010 as const;

const SCRIPT_KEY_PATTERN = /^([a-z0-9_]{1,16})\.(nss|ncs)$/u;
const SCRIPT_LIKE_EXTENSION_PATTERN = /\.(?:nss|ncs)$/iu;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export type AreaEventScriptArtifactStatus =
  | "source_and_bytecode"
  | "source_only"
  | "bytecode_only";
export type AreaEventScriptCatalogDiagnostic =
  | "external_runtime_layers_not_resolved"
  | "paired_freshness_unverified"
  | "rejected_committed_descriptors";

export interface AreaEventScriptCatalogInputDescriptor {
  readonly logicalKey: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
}

export interface AreaEventScriptCatalogSourceDescriptor
  extends AreaEventScriptCatalogInputDescriptor {
  readonly resourceType: typeof AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE;
}

export interface AreaEventScriptCatalogBytecodeDescriptor
  extends AreaEventScriptCatalogInputDescriptor {
  readonly resourceType: typeof AREA_EVENT_SCRIPT_NCS_RESOURCE_TYPE;
}

export interface AreaEventScriptCatalogItem {
  readonly resRef: string;
  readonly artifactStatus: AreaEventScriptArtifactStatus;
  readonly freshness: "unverified" | null;
  readonly source?: AreaEventScriptCatalogSourceDescriptor;
  readonly bytecode?: AreaEventScriptCatalogBytecodeDescriptor;
}

export interface AreaEventScriptCatalogSummary {
  readonly admittedCatalogCount: number;
  readonly sourceAndBytecode: number;
  readonly sourceOnly: number;
  readonly bytecodeOnly: number;
  readonly rejectedDescriptors: number;
}

export interface BuiltAreaEventScriptCatalog {
  readonly items: readonly AreaEventScriptCatalogItem[];
  readonly summary: AreaEventScriptCatalogSummary;
  readonly diagnostics: readonly AreaEventScriptCatalogDiagnostic[];
  readonly inspectedDescriptorCount: number;
}

export type AreaEventScriptCatalogErrorCode =
  | "AREA_EVENT_SCRIPT_CATALOG_DESCRIPTOR_BUDGET_EXCEEDED"
  | "AREA_EVENT_SCRIPT_CATALOG_RESREF_BUDGET_EXCEEDED"
  | "AREA_EVENT_SCRIPT_CATALOG_RESPONSE_BUDGET_EXCEEDED";

export class AreaEventScriptCatalogError extends Error {
  constructor(
    readonly code: AreaEventScriptCatalogErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AreaEventScriptCatalogError";
  }
}

interface CandidateSlots {
  readonly source: AreaEventScriptCatalogSourceDescriptor[];
  readonly bytecode: AreaEventScriptCatalogBytecodeDescriptor[];
}

export function buildAreaEventScriptCatalog(
  descriptors: readonly AreaEventScriptCatalogInputDescriptor[],
): BuiltAreaEventScriptCatalog {
  if (
    !Array.isArray(descriptors)
    || descriptors.length > AREA_EVENT_SCRIPT_CATALOG_MAX_INSPECTED_DESCRIPTORS
  ) {
    throw new AreaEventScriptCatalogError(
      "AREA_EVENT_SCRIPT_CATALOG_DESCRIPTOR_BUDGET_EXCEEDED",
      `Area event-script catalog cannot inspect more than ${AREA_EVENT_SCRIPT_CATALOG_MAX_INSPECTED_DESCRIPTORS} descriptors.`,
    );
  }

  const slotsByResRef = new Map<string, CandidateSlots>();
  let rejectedDescriptors = 0;
  for (const descriptor of descriptors) {
    if (!isScriptCandidate(descriptor)) continue;
    const match = isValidDescriptorShape(descriptor)
      ? SCRIPT_KEY_PATTERN.exec(descriptor.logicalKey)
      : null;
    if (!match) {
      rejectedDescriptors += 1;
      continue;
    }
    const [, resRef, extension] = match;
    if (
      (extension === "nss" && descriptor.resourceType !== AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE)
      || (extension === "ncs" && descriptor.resourceType !== AREA_EVENT_SCRIPT_NCS_RESOURCE_TYPE)
    ) {
      rejectedDescriptors += 1;
      continue;
    }
    const slots = slotsByResRef.get(resRef) ?? { source: [], bytecode: [] };
    const projected = Object.freeze({
      logicalKey: descriptor.logicalKey,
      resourceType: descriptor.resourceType,
      size: descriptor.size,
      sha256: descriptor.sha256,
    });
    if (extension === "nss") {
      slots.source.push(projected as AreaEventScriptCatalogSourceDescriptor);
    } else {
      slots.bytecode.push(projected as AreaEventScriptCatalogBytecodeDescriptor);
    }
    slotsByResRef.set(resRef, slots);
  }

  if (slotsByResRef.size > AREA_EVENT_SCRIPT_CATALOG_MAX_ADMITTED_RESREFS) {
    throw new AreaEventScriptCatalogError(
      "AREA_EVENT_SCRIPT_CATALOG_RESREF_BUDGET_EXCEEDED",
      `Area event-script catalog cannot admit more than ${AREA_EVENT_SCRIPT_CATALOG_MAX_ADMITTED_RESREFS} ResRefs.`,
    );
  }

  const items: AreaEventScriptCatalogItem[] = [];
  for (const [resRef, slots] of slotsByResRef) {
    if (slots.source.length > 1) rejectedDescriptors += slots.source.length;
    if (slots.bytecode.length > 1) rejectedDescriptors += slots.bytecode.length;
    const source = slots.source.length === 1 ? slots.source[0] : undefined;
    const bytecode = slots.bytecode.length === 1 ? slots.bytecode[0] : undefined;
    if (!source && !bytecode) continue;
    items.push(Object.freeze({
      resRef,
      artifactStatus: source && bytecode
        ? "source_and_bytecode"
        : source
          ? "source_only"
          : "bytecode_only",
      freshness: source && bytecode ? "unverified" : null,
      ...(source ? { source } : {}),
      ...(bytecode ? { bytecode } : {}),
    }));
  }
  items.sort(compareResRefs);

  const summary = Object.freeze({
    admittedCatalogCount: items.length,
    sourceAndBytecode: items.filter((item) => item.artifactStatus === "source_and_bytecode").length,
    sourceOnly: items.filter((item) => item.artifactStatus === "source_only").length,
    bytecodeOnly: items.filter((item) => item.artifactStatus === "bytecode_only").length,
    rejectedDescriptors,
  });
  const diagnostics: AreaEventScriptCatalogDiagnostic[] = [
    "external_runtime_layers_not_resolved",
  ];
  if (summary.sourceAndBytecode > 0) diagnostics.push("paired_freshness_unverified");
  if (rejectedDescriptors > 0) diagnostics.push("rejected_committed_descriptors");

  return Object.freeze({
    items: Object.freeze(items),
    summary,
    diagnostics: Object.freeze(diagnostics),
    inspectedDescriptorCount: descriptors.length,
  });
}

function isScriptCandidate(descriptor: AreaEventScriptCatalogInputDescriptor): boolean {
  return descriptor?.resourceType === AREA_EVENT_SCRIPT_NSS_RESOURCE_TYPE
    || descriptor?.resourceType === AREA_EVENT_SCRIPT_NCS_RESOURCE_TYPE
    || (typeof descriptor?.logicalKey === "string"
      && SCRIPT_LIKE_EXTENSION_PATTERN.test(descriptor.logicalKey));
}

function isValidDescriptorShape(descriptor: AreaEventScriptCatalogInputDescriptor): boolean {
  return Boolean(
    descriptor
    && typeof descriptor.logicalKey === "string"
    && Number.isInteger(descriptor.resourceType)
    && Number.isSafeInteger(descriptor.size)
    && descriptor.size >= 0
    && SHA256_PATTERN.test(descriptor.sha256),
  );
}

function compareResRefs(left: AreaEventScriptCatalogItem, right: AreaEventScriptCatalogItem): number {
  return left.resRef < right.resRef ? -1 : left.resRef > right.resRef ? 1 : 0;
}
