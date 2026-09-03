import { createHash } from "node:crypto";

export const MODULE_SNAPSHOT_MANIFEST_SCHEMA_VERSION =
  "aurora-module-snapshot-manifest.v1" as const;
export const MODULE_SNAPSHOT_MAX_OBJECTS = 50_000;
export const MODULE_SNAPSHOT_MAX_CANONICAL_BYTES = 32 * 1024 * 1024;
export const MODULE_SNAPSHOT_MAX_LOGICAL_KEY_BYTES = 512;
export const MODULE_SNAPSHOT_MAX_OBJECT_BYTES = 2_147_483_647;

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MODULE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const UNSAFE_LOGICAL_KEY_CHARACTER = /[\\\u0000-\u001f\u007f:*?"<>|]/u;

export interface ModuleSnapshotObjectInput {
  readonly logicalKey: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
  readonly contentKey?: string;
}

export interface ModuleSnapshotObjectDescriptor {
  readonly logicalKey: string;
  readonly resourceType: number;
  readonly size: number;
  readonly sha256: string;
  readonly contentKey: string;
}

export interface ModuleSnapshotManifest {
  readonly schemaVersion: typeof MODULE_SNAPSHOT_MANIFEST_SCHEMA_VERSION;
  readonly moduleId: string;
  readonly parentRevision: string | null;
  readonly revision: string;
  readonly objects: readonly ModuleSnapshotObjectDescriptor[];
}

export interface CreateModuleSnapshotManifestInput {
  readonly moduleId: string;
  readonly parentRevision: string | null;
  readonly objects: readonly ModuleSnapshotObjectInput[];
}

export interface ApplyModuleSnapshotMutationInput {
  readonly upserts: readonly ModuleSnapshotObjectInput[];
  readonly removals: readonly string[];
}

export function buildModuleSnapshotContentKey(sha256: string): string {
  assertSha256(sha256, "Module snapshot content SHA-256");
  return `__aurora/cas/sha256/${sha256.slice(0, 2)}/${sha256}`;
}

export function normalizeModuleSnapshotLogicalKey(value: string): string {
  if (typeof value !== "string") {
    throw manifestError("Module snapshot logical key must be a string.");
  }
  const normalized = value.normalize("NFC");
  const byteLength = Buffer.byteLength(normalized, "utf8");
  if (
    normalized.length === 0 ||
    normalized !== value ||
    byteLength > MODULE_SNAPSHOT_MAX_LOGICAL_KEY_BYTES ||
    normalized.startsWith("/") ||
    normalized.endsWith("/") ||
    UNSAFE_LOGICAL_KEY_CHARACTER.test(normalized)
  ) {
    throw manifestError("Module snapshot logical key is not canonical or safe.");
  }
  const segments = normalized.split("/");
  if (
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        segment.toLowerCase() === "__aurora",
    )
  ) {
    throw manifestError("Module snapshot logical key contains a forbidden segment.");
  }
  return normalized;
}

export function createModuleSnapshotManifest(
  input: CreateModuleSnapshotManifestInput,
): ModuleSnapshotManifest {
  assertModuleId(input.moduleId);
  assertParentRevision(input.parentRevision);
  const objects = normalizeDescriptors(input.objects);
  const canonical = canonicalManifestJson({
    schemaVersion: MODULE_SNAPSHOT_MANIFEST_SCHEMA_VERSION,
    moduleId: input.moduleId,
    parentRevision: input.parentRevision,
    objects,
  });
  if (Buffer.byteLength(canonical, "utf8") > MODULE_SNAPSHOT_MAX_CANONICAL_BYTES) {
    throw manifestError("Module snapshot manifest exceeds the 32 MiB canonical budget.");
  }
  const revision = createHash("sha256").update(canonical, "utf8").digest("hex");
  return deepFreeze({
    schemaVersion: MODULE_SNAPSHOT_MANIFEST_SCHEMA_VERSION,
    moduleId: input.moduleId,
    parentRevision: input.parentRevision,
    revision,
    objects,
  });
}

export function applyModuleSnapshotChanges(
  baseline: ModuleSnapshotManifest,
  changes: readonly ModuleSnapshotObjectInput[],
): ModuleSnapshotManifest {
  const verifiedBaseline = createModuleSnapshotManifest({
    moduleId: baseline.moduleId,
    parentRevision: baseline.parentRevision,
    objects: baseline.objects,
  });
  if (
    baseline.schemaVersion !== MODULE_SNAPSHOT_MANIFEST_SCHEMA_VERSION ||
    baseline.revision !== verifiedBaseline.revision
  ) {
    throw manifestError("Module snapshot baseline revision does not match its canonical manifest.");
  }
  if (changes.length === 0) {
    throw manifestError("Module snapshot successor requires at least one object change.");
  }
  const normalizedChanges = normalizeDescriptors(changes);
  const merged = new Map<string, ModuleSnapshotObjectDescriptor>();
  for (const descriptor of verifiedBaseline.objects) {
    merged.set(comparisonKey(descriptor.logicalKey), descriptor);
  }
  for (const descriptor of normalizedChanges) {
    merged.set(comparisonKey(descriptor.logicalKey), descriptor);
  }
  return createModuleSnapshotManifest({
    moduleId: baseline.moduleId,
    parentRevision: baseline.revision,
    objects: Array.from(merged.values()),
  });
}

/** Builds one immutable successor containing an explicit upsert/removal delta. */
export function applyModuleSnapshotMutation(
  baseline: ModuleSnapshotManifest,
  mutation: ApplyModuleSnapshotMutationInput,
): ModuleSnapshotManifest {
  const verifiedBaseline = createModuleSnapshotManifest({
    moduleId: baseline.moduleId,
    parentRevision: baseline.parentRevision,
    objects: baseline.objects,
  });
  if (
    baseline.schemaVersion !== MODULE_SNAPSHOT_MANIFEST_SCHEMA_VERSION ||
    baseline.revision !== verifiedBaseline.revision
  ) {
    throw manifestError("Module snapshot baseline revision does not match its canonical manifest.");
  }
  if (
    !mutation ||
    !Array.isArray(mutation.upserts) ||
    !Array.isArray(mutation.removals) ||
    mutation.upserts.length + mutation.removals.length === 0
  ) {
    throw manifestError("Module snapshot mutation requires an upsert or removal.");
  }
  const upserts = normalizeDescriptors(mutation.upserts);
  const removalKeys = new Map<string, string>();
  for (const rawKey of mutation.removals) {
    const logicalKey = normalizeModuleSnapshotLogicalKey(rawKey);
    const key = comparisonKey(logicalKey);
    if (removalKeys.has(key)) {
      throw manifestError(`Module snapshot removal key collides: ${logicalKey}.`);
    }
    removalKeys.set(key, logicalKey);
  }
  if (upserts.some((descriptor) => removalKeys.has(comparisonKey(descriptor.logicalKey)))) {
    throw manifestError("Module snapshot mutation cannot upsert and remove the same key.");
  }
  const merged = new Map<string, ModuleSnapshotObjectDescriptor>();
  for (const descriptor of verifiedBaseline.objects) {
    merged.set(comparisonKey(descriptor.logicalKey), descriptor);
  }
  for (const [key, logicalKey] of removalKeys) {
    if (!merged.delete(key)) {
      throw manifestError(`Module snapshot removal target is missing: ${logicalKey}.`);
    }
  }
  for (const descriptor of upserts) {
    merged.set(comparisonKey(descriptor.logicalKey), descriptor);
  }
  return createModuleSnapshotManifest({
    moduleId: baseline.moduleId,
    parentRevision: baseline.revision,
    objects: Array.from(merged.values()),
  });
}

export function validateModuleSnapshotManifest(
  manifest: ModuleSnapshotManifest,
): ModuleSnapshotManifest {
  const verified = createModuleSnapshotManifest({
    moduleId: manifest.moduleId,
    parentRevision: manifest.parentRevision,
    objects: manifest.objects,
  });
  if (
    manifest.schemaVersion !== MODULE_SNAPSHOT_MANIFEST_SCHEMA_VERSION ||
    manifest.revision !== verified.revision
  ) {
    throw manifestError(
      "Module snapshot manifest revision does not match its canonical content.",
    );
  }
  return verified;
}

export function buildModuleSnapshotManifestKey(
  manifest: ModuleSnapshotManifest,
): string {
  const verified = validateModuleSnapshotManifest(manifest);
  const moduleKey = Buffer.from(verified.moduleId, "utf8").toString("base64url");
  return `__aurora/manifests/module/${moduleKey}/${verified.revision}.v1.json`;
}

export function hashModuleSnapshotManifest(
  manifest: ModuleSnapshotManifest,
): string {
  return createHash("sha256")
    .update(JSON.stringify(validateModuleSnapshotManifest(manifest)), "utf8")
    .digest("hex");
}

function normalizeDescriptors(
  values: readonly ModuleSnapshotObjectInput[],
): readonly ModuleSnapshotObjectDescriptor[] {
  if (!Array.isArray(values)) {
    throw manifestError("Module snapshot objects must be an array.");
  }
  if (values.length > MODULE_SNAPSHOT_MAX_OBJECTS) {
    throw manifestError("Module snapshot manifest exceeds 50,000 objects.");
  }
  const seen = new Set<string>();
  const descriptors = values.map((value) => {
    if (!value || typeof value !== "object") {
      throw manifestError("Module snapshot object descriptor must be an object.");
    }
    const logicalKey = normalizeModuleSnapshotLogicalKey(value.logicalKey);
    const key = comparisonKey(logicalKey);
    if (seen.has(key)) {
      throw manifestError(`Module snapshot logical key collides: ${logicalKey}.`);
    }
    seen.add(key);
    if (
      !Number.isInteger(value.resourceType) ||
      value.resourceType < 0 ||
      value.resourceType > 65_535
    ) {
      throw manifestError("Module snapshot resource type must be an unsigned 16-bit integer.");
    }
    if (
      !Number.isSafeInteger(value.size) ||
      value.size < 0 ||
      value.size > MODULE_SNAPSHOT_MAX_OBJECT_BYTES
    ) {
      throw manifestError("Module snapshot object size is outside the admitted range.");
    }
    assertSha256(value.sha256, "Module snapshot object SHA-256");
    const contentKey = buildModuleSnapshotContentKey(value.sha256);
    if (value.contentKey !== undefined && value.contentKey !== contentKey) {
      throw manifestError("Module snapshot content key does not match its SHA-256.");
    }
    return Object.freeze({
      logicalKey,
      resourceType: value.resourceType,
      size: value.size,
      sha256: value.sha256,
      contentKey,
    });
  });
  descriptors.sort((left, right) =>
    comparisonKey(left.logicalKey).localeCompare(comparisonKey(right.logicalKey), "en"),
  );
  return Object.freeze(descriptors);
}

function canonicalManifestJson(input: Readonly<{
  schemaVersion: typeof MODULE_SNAPSHOT_MANIFEST_SCHEMA_VERSION;
  moduleId: string;
  parentRevision: string | null;
  objects: readonly ModuleSnapshotObjectDescriptor[];
}>): string {
  return JSON.stringify({
    schemaVersion: input.schemaVersion,
    moduleId: input.moduleId,
    parentRevision: input.parentRevision,
    objects: input.objects.map((object) => ({
      logicalKey: object.logicalKey,
      resourceType: object.resourceType,
      size: object.size,
      sha256: object.sha256,
      contentKey: object.contentKey,
    })),
  });
}

function comparisonKey(logicalKey: string): string {
  return logicalKey.toLowerCase();
}

function assertModuleId(value: string): void {
  if (!MODULE_ID_PATTERN.test(value)) {
    throw manifestError("Module snapshot module ID is not canonical.");
  }
}

function assertParentRevision(value: string | null): void {
  if (value !== null) {
    assertSha256(value, "Module snapshot parent revision");
  }
}

function assertSha256(value: string, label: string): void {
  if (!SHA256_PATTERN.test(value)) {
    throw manifestError(`${label} must be lowercase SHA-256.`);
  }
}

function manifestError(message: string): Error {
  return new Error(`AREA_SNAPSHOT_MANIFEST_INVALID: ${message}`);
}

function deepFreeze<T>(value: T): T {
  if (Object(value) !== value) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
