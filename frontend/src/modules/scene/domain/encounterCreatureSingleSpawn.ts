import type {
  SceneObject,
  SceneObjectEncounterCreatureListBlueprintTargetEntry,
  SceneObjectEncounterCreatureListLegacyTargetEntry,
  SceneObjectEncounterCreatureListProvenance,
  SceneObjectEncounterCreatureListRetainedTargetEntry,
  SceneObjectEncounterCreatureListSourceEntry,
  SceneObjectEncounterCreatureListStructuralTargetEntry,
  SceneObjectEncounterCreatureListTargetEntry,
} from "../contracts";

export const MAX_ENCOUNTER_CREATURE_LIST_ENTRIES = 1024;
export const ENCOUNTER_CREATURE_LIST_BLUEPRINT_PROFILE_ID =
  "effective-catalog-utc-encounter-creature-list-v1" as const;
export const MAX_ENCOUNTER_CREATURE_LIST_BLUEPRINT_BYTES = 1024 * 1024;

const SOURCE_KEYS = Object.freeze([
  "sourceIndex", "appearance", "challengeRating", "resRef", "singleSpawnByte",
]);
const LEGACY_TARGET_KEYS = Object.freeze([
  "appearance", "challengeRating", "resRef", "singleSpawn",
]);
const RETAINED_TARGET_KEYS = Object.freeze([
  "entryKind", "sourceIndex", "appearance", "challengeRating", "resRef", "singleSpawn",
]);
const BLUEPRINT_TARGET_KEYS = Object.freeze([
  "entryKind", "sourceProfileId", "templateId", "resRef", "appearance",
  "challengeRating", "sourceObjectKey", "sourceSizeBytes", "sourceSha256", "singleSpawn",
]);

export function readEncounterCreatureListProvenance(
  value: unknown,
): SceneObjectEncounterCreatureListProvenance | null {
  if (!isExactRecord(value, ["expectedEntries"])) return null;
  const expectedEntries = readSourceEntries(value.expectedEntries);
  return expectedEntries ? Object.freeze({ expectedEntries }) : null;
}

export function readEncounterCreatureListTargetEntries(
  value: unknown,
): readonly SceneObjectEncounterCreatureListTargetEntry[] | null {
  if (!Array.isArray(value) || value.length > MAX_ENCOUNTER_CREATURE_LIST_ENTRIES) {
    return null;
  }
  const entries: SceneObjectEncounterCreatureListTargetEntry[] = [];
  for (const candidate of value) {
    const entry = readTargetEntry(candidate);
    if (!entry) return null;
    entries.push(entry);
  }
  const legacyCount = entries.filter(isLegacyTargetEntry).length;
  if (legacyCount > 0 && legacyCount !== entries.length) return null;
  if (legacyCount === 0) {
    const retained = new Set<number>();
    for (const entry of entries) {
      if (!("entryKind" in entry) || entry.entryKind !== "retained") continue;
      if (retained.has(entry.sourceIndex)) return null;
      retained.add(entry.sourceIndex);
    }
  }
  return Object.freeze(entries);
}

export function projectEncounterCreatureListSourceEntries(
  source: readonly SceneObjectEncounterCreatureListSourceEntry[],
): readonly SceneObjectEncounterCreatureListRetainedTargetEntry[] {
  const exactSource = readSourceEntries(source);
  if (!exactSource) return Object.freeze([]);
  return Object.freeze(exactSource.map((entry) => Object.freeze({
    entryKind: "retained" as const,
    sourceIndex: entry.sourceIndex,
    appearance: entry.appearance,
    challengeRating: entry.challengeRating,
    resRef: entry.resRef,
    singleSpawn: entry.singleSpawnByte === 1,
  })));
}

export function normalizeEncounterCreatureListTargetEntries(
  source: readonly SceneObjectEncounterCreatureListSourceEntry[],
  target: unknown,
): readonly SceneObjectEncounterCreatureListStructuralTargetEntry[] | null {
  const exactSource = readSourceEntries(source);
  const exactTarget = readEncounterCreatureListTargetEntries(target);
  if (!exactSource || !exactTarget
    || !encounterCreatureListIdentityMatches(exactSource, exactTarget)) return null;
  if (exactTarget.length > 0 && exactTarget.every(isLegacyTargetEntry)) {
    return Object.freeze(exactSource.map((entry, index) => Object.freeze({
      entryKind: "retained" as const,
      sourceIndex: entry.sourceIndex,
      appearance: entry.appearance,
      challengeRating: entry.challengeRating,
      resRef: entry.resRef,
      singleSpawn: exactTarget[index]!.singleSpawn,
    })));
  }
  return Object.freeze((exactTarget as readonly SceneObjectEncounterCreatureListStructuralTargetEntry[])
    .map((entry) => Object.freeze({ ...entry })));
}

export function readEncounterCreatureBlueprintTargetEntry(
  object: SceneObject,
): SceneObjectEncounterCreatureListBlueprintTargetEntry | null {
  const source = object.source;
  const metadata = source?.creatureMetadata;
  if (object.kind !== "creatures" || source?.sourceKind !== "creature"
    || source.sourceFileType !== "UTC " || source.sourceFileVersion !== "V3.2"
    || source.sourceStructTypeId !== 0xffff_ffff || !isRecord(metadata)) return null;
  const templateId = source.templateId;
  const resRef = metadata.templateResRef;
  const appearance = metadata.appearanceId;
  const challengeRating = metadata.challengeRating;
  const sourceObjectKey = metadata.sourceObjectKey;
  const sourceSizeBytes = metadata.sourceSizeBytes;
  const sourceSha256 = metadata.sourceSha256;
  if (typeof templateId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/u.test(templateId)
    || typeof resRef !== "string" || !/^[a-z0-9_]{1,16}$/u.test(resRef)
    || object.resRef !== resRef || !Number.isSafeInteger(appearance)
    || Number(appearance) < 0 || Number(appearance) > 0xffff
    || !isExactFloat32(challengeRating)
    || typeof sourceObjectKey !== "string" || sourceObjectKey.trim().length < 1
    || sourceObjectKey.length > 2048 || sourceObjectKey.includes("\0")
    || !Number.isSafeInteger(sourceSizeBytes) || Number(sourceSizeBytes) < 1
    || Number(sourceSizeBytes) > MAX_ENCOUNTER_CREATURE_LIST_BLUEPRINT_BYTES
    || typeof sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(sourceSha256)) {
    return null;
  }
  return Object.freeze({
    entryKind: "effective_blueprint" as const,
    sourceProfileId: ENCOUNTER_CREATURE_LIST_BLUEPRINT_PROFILE_ID,
    templateId,
    resRef,
    appearance: Number(appearance),
    challengeRating,
    sourceObjectKey,
    sourceSizeBytes: Number(sourceSizeBytes),
    sourceSha256,
    singleSpawn: false,
  });
}

export function encounterCreatureListEntriesEqual(
  source: readonly SceneObjectEncounterCreatureListSourceEntry[],
  target: readonly SceneObjectEncounterCreatureListTargetEntry[],
): boolean {
  const normalized = normalizeEncounterCreatureListTargetEntries(source, target);
  return normalized !== null && source.length === normalized.length
    && source.every((entry, index) => {
      const candidate = normalized[index];
      return candidate?.entryKind === "retained"
        && candidate.sourceIndex === entry.sourceIndex
        && sameIdentity(entry, candidate)
        && (entry.singleSpawnByte === 1) === candidate.singleSpawn;
    });
}

export function encounterCreatureListIdentityMatches(
  source: readonly SceneObjectEncounterCreatureListSourceEntry[],
  target: readonly SceneObjectEncounterCreatureListTargetEntry[],
): boolean {
  const exactSource = readSourceEntries(source);
  const exactTarget = readEncounterCreatureListTargetEntries(target);
  if (!exactSource || !exactTarget) return false;
  if (exactTarget.length > 0 && exactTarget.every(isLegacyTargetEntry)) {
    return exactSource.length === exactTarget.length && exactSource.every(
      (entry, index) => sameIdentity(entry, exactTarget[index]!),
    );
  }
  return (exactTarget as readonly SceneObjectEncounterCreatureListStructuralTargetEntry[])
    .every((entry) => entry.entryKind === "effective_blueprint"
      || (exactSource[entry.sourceIndex] !== undefined
        && sameIdentity(exactSource[entry.sourceIndex]!, entry)));
}

export function encounterCreatureListTargetEntriesEqual(
  left: unknown,
  right: readonly SceneObjectEncounterCreatureListTargetEntry[],
): boolean {
  const admittedLeft = readEncounterCreatureListTargetEntries(left);
  const admittedRight = readEncounterCreatureListTargetEntries(right);
  return admittedLeft !== null && admittedRight !== null
    && admittedLeft.length === admittedRight.length
    && admittedLeft.every((entry, index) => targetEntriesEqual(entry, admittedRight[index]!));
}

function readTargetEntry(value: unknown): SceneObjectEncounterCreatureListTargetEntry | null {
  if (isExactRecord(value, LEGACY_TARGET_KEYS)) {
    if (!isSignedInt32(value.appearance) || !isExactFloat32(value.challengeRating)
      || !isResRef(value.resRef) || typeof value.singleSpawn !== "boolean") return null;
    return Object.freeze({
      appearance: Number(value.appearance),
      challengeRating: Number(value.challengeRating),
      resRef: String(value.resRef),
      singleSpawn: value.singleSpawn,
    });
  }
  if (isExactRecord(value, RETAINED_TARGET_KEYS)) {
    if (value.entryKind !== "retained" || !Number.isSafeInteger(value.sourceIndex)
      || Number(value.sourceIndex) < 0
      || Number(value.sourceIndex) >= MAX_ENCOUNTER_CREATURE_LIST_ENTRIES
      || !isSignedInt32(value.appearance) || !isExactFloat32(value.challengeRating)
      || !isResRef(value.resRef) || typeof value.singleSpawn !== "boolean") return null;
    return Object.freeze({
      entryKind: "retained" as const,
      sourceIndex: Number(value.sourceIndex),
      appearance: Number(value.appearance),
      challengeRating: Number(value.challengeRating),
      resRef: String(value.resRef),
      singleSpawn: value.singleSpawn,
    });
  }
  if (isExactRecord(value, BLUEPRINT_TARGET_KEYS)) {
    if (value.entryKind !== "effective_blueprint"
      || value.sourceProfileId !== ENCOUNTER_CREATURE_LIST_BLUEPRINT_PROFILE_ID
      || typeof value.templateId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/u.test(value.templateId)
      || typeof value.resRef !== "string" || !/^[a-z0-9_]{1,16}$/u.test(value.resRef)
      || !isSignedInt32(value.appearance) || !isExactFloat32(value.challengeRating)
      || typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.trim().length < 1
      || value.sourceObjectKey.length > 2048 || value.sourceObjectKey.includes("\0")
      || !Number.isSafeInteger(value.sourceSizeBytes) || Number(value.sourceSizeBytes) < 1
      || Number(value.sourceSizeBytes) > MAX_ENCOUNTER_CREATURE_LIST_BLUEPRINT_BYTES
      || typeof value.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.sourceSha256)
      || typeof value.singleSpawn !== "boolean") return null;
    return Object.freeze({
      entryKind: "effective_blueprint" as const,
      sourceProfileId: ENCOUNTER_CREATURE_LIST_BLUEPRINT_PROFILE_ID,
      templateId: value.templateId,
      resRef: value.resRef,
      appearance: Number(value.appearance),
      challengeRating: Number(value.challengeRating),
      sourceObjectKey: value.sourceObjectKey,
      sourceSizeBytes: Number(value.sourceSizeBytes),
      sourceSha256: value.sourceSha256,
      singleSpawn: value.singleSpawn,
    });
  }
  return null;
}

function readSourceEntries(
  value: unknown,
): readonly SceneObjectEncounterCreatureListSourceEntry[] | null {
  if (!Array.isArray(value) || value.length > MAX_ENCOUNTER_CREATURE_LIST_ENTRIES) return null;
  const entries: SceneObjectEncounterCreatureListSourceEntry[] = [];
  for (let index = 0; index < value.length; index += 1) {
    const candidate = value[index];
    if (!isExactRecord(candidate, SOURCE_KEYS) || candidate.sourceIndex !== index
      || !isSignedInt32(candidate.appearance) || !isExactFloat32(candidate.challengeRating)
      || !isResRef(candidate.resRef)
      || (candidate.singleSpawnByte !== 0 && candidate.singleSpawnByte !== 1)) return null;
    entries.push(Object.freeze({
      sourceIndex: index,
      appearance: Number(candidate.appearance),
      challengeRating: Number(candidate.challengeRating),
      resRef: String(candidate.resRef),
      singleSpawnByte: candidate.singleSpawnByte as 0 | 1,
    }));
  }
  return Object.freeze(entries);
}

function isLegacyTargetEntry(
  entry: SceneObjectEncounterCreatureListTargetEntry,
): entry is SceneObjectEncounterCreatureListLegacyTargetEntry {
  return !("entryKind" in entry);
}

function sameIdentity(
  left: Pick<SceneObjectEncounterCreatureListSourceEntry, "appearance" | "challengeRating" | "resRef">,
  right: Pick<SceneObjectEncounterCreatureListTargetEntry, "appearance" | "challengeRating" | "resRef">,
): boolean {
  return left.appearance === right.appearance
    && Object.is(left.challengeRating, right.challengeRating)
    && left.resRef === right.resRef;
}

function targetEntriesEqual(
  left: SceneObjectEncounterCreatureListTargetEntry,
  right: SceneObjectEncounterCreatureListTargetEntry,
): boolean {
  if (!("entryKind" in left) || !("entryKind" in right)) {
    return !("entryKind" in left) && !("entryKind" in right)
      && sameIdentity(left, right) && left.singleSpawn === right.singleSpawn;
  }
  if (left.entryKind !== right.entryKind || !sameIdentity(left, right)
    || left.singleSpawn !== right.singleSpawn) return false;
  if (left.entryKind === "retained" && right.entryKind === "retained") {
    return left.sourceIndex === right.sourceIndex;
  }
  return left.entryKind === "effective_blueprint" && right.entryKind === "effective_blueprint"
    && left.sourceProfileId === right.sourceProfileId
    && left.templateId === right.templateId
    && left.sourceObjectKey === right.sourceObjectKey
    && left.sourceSizeBytes === right.sourceSizeBytes
    && left.sourceSha256 === right.sourceSha256;
}

function isSignedInt32(value: unknown): value is number {
  return Number.isInteger(value)
    && Number(value) >= -0x80000000
    && Number(value) <= 0x7fffffff;
}

function isExactFloat32(value: unknown): value is number {
  return typeof value === "number"
    && Number.isFinite(value)
    && Object.is(Math.fround(value), value);
}

function isResRef(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}
