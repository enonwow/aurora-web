export const MAX_AREA_ENCOUNTER_CREATURE_LIST_ENTRIES = 1024;
export const AREA_ENCOUNTER_CREATURE_LIST_BLUEPRINT_PROFILE_ID =
  "effective-catalog-utc-encounter-creature-list-v1" as const;
export const MAX_AREA_ENCOUNTER_CREATURE_LIST_BLUEPRINT_BYTES = 1024 * 1024;

const SOURCE_ENTRY_KEYS = Object.freeze([
  "sourceIndex",
  "appearance",
  "challengeRating",
  "resRef",
  "singleSpawnByte",
]);
const LEGACY_TARGET_ENTRY_KEYS = Object.freeze([
  "appearance",
  "challengeRating",
  "resRef",
  "singleSpawn",
]);
const RETAINED_TARGET_ENTRY_KEYS = Object.freeze([
  "entryKind",
  "sourceIndex",
  "appearance",
  "challengeRating",
  "resRef",
  "singleSpawn",
]);
const BLUEPRINT_TARGET_ENTRY_KEYS = Object.freeze([
  "entryKind",
  "sourceProfileId",
  "templateId",
  "resRef",
  "appearance",
  "challengeRating",
  "sourceObjectKey",
  "sourceSizeBytes",
  "sourceSha256",
  "singleSpawn",
]);

export interface AreaEncounterCreatureListSourceEntry {
  readonly sourceIndex: number;
  readonly appearance: number;
  readonly challengeRating: number;
  readonly resRef: string;
  readonly singleSpawnByte: 0 | 1;
}

export interface AreaEncounterCreatureListLegacyTargetEntry {
  readonly appearance: number;
  readonly challengeRating: number;
  readonly resRef: string;
  readonly singleSpawn: boolean;
}

export interface AreaEncounterCreatureListRetainedTargetEntry {
  readonly entryKind: "retained";
  readonly sourceIndex: number;
  readonly appearance: number;
  readonly challengeRating: number;
  readonly resRef: string;
  readonly singleSpawn: boolean;
}

export interface AreaEncounterCreatureListBlueprintTargetEntry {
  readonly entryKind: "effective_blueprint";
  readonly sourceProfileId: typeof AREA_ENCOUNTER_CREATURE_LIST_BLUEPRINT_PROFILE_ID;
  readonly templateId: string;
  readonly resRef: string;
  readonly appearance: number;
  readonly challengeRating: number;
  readonly sourceObjectKey: string;
  readonly sourceSizeBytes: number;
  readonly sourceSha256: string;
  readonly singleSpawn: boolean;
}

export type AreaEncounterCreatureListStructuralTargetEntry =
  | AreaEncounterCreatureListRetainedTargetEntry
  | AreaEncounterCreatureListBlueprintTargetEntry;

export type AreaEncounterCreatureListTargetEntry =
  | AreaEncounterCreatureListLegacyTargetEntry
  | AreaEncounterCreatureListStructuralTargetEntry;

export interface AreaEncounterCreatureListProvenance {
  readonly expectedEntries: readonly AreaEncounterCreatureListSourceEntry[];
}

export type AreaEncounterCreatureListMutationEntry =
  | AreaEncounterCreatureListSourceEntry
  | AreaEncounterCreatureListStructuralTargetEntry;

export interface ExistingAreaEncounterCreatureListMutation {
  readonly expectedEntries: readonly AreaEncounterCreatureListSourceEntry[];
  readonly entries: readonly AreaEncounterCreatureListMutationEntry[];
}

export interface ExistingAreaEncounterCreatureListResolvedMutation {
  readonly expectedEntries: readonly AreaEncounterCreatureListSourceEntry[];
  readonly entries: readonly AreaEncounterCreatureListSourceEntry[];
}

export class AreaEncounterCreatureSingleSpawnValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AreaEncounterCreatureSingleSpawnValidationError";
  }
}

export function parseAreaEncounterCreatureListProvenance(
  value: unknown,
): AreaEncounterCreatureListProvenance {
  if (!isExactRecord(value, ["expectedEntries"])) {
    invalid("Encounter CreatureList provenance must contain only expectedEntries.");
  }
  return Object.freeze({
    expectedEntries: parseSourceEntries(value.expectedEntries),
  });
}

export function parseAreaEncounterCreatureListTargetEntries(
  value: unknown,
): readonly AreaEncounterCreatureListTargetEntry[] {
  if (!Array.isArray(value) || value.length > MAX_AREA_ENCOUNTER_CREATURE_LIST_ENTRIES) {
    invalid("Encounter CreatureList target entry count is invalid.");
  }
  const entries = value.map((entry, index) => parseTargetEntry(entry, index));
  const legacyCount = entries.filter(isLegacyTargetEntry).length;
  if (legacyCount > 0 && legacyCount !== entries.length) {
    invalid("Encounter CreatureList target cannot mix legacy and structural entries.");
  }
  if (legacyCount === 0) assertUniqueRetainedSourceIndices(entries);
  return Object.freeze(entries);
}

export function projectAreaEncounterCreatureListSourceEntries(
  entries: readonly AreaEncounterCreatureListSourceEntry[],
): readonly AreaEncounterCreatureListRetainedTargetEntry[] {
  return Object.freeze(entries.map((entry) => Object.freeze({
    entryKind: "retained" as const,
    sourceIndex: entry.sourceIndex,
    appearance: entry.appearance,
    challengeRating: entry.challengeRating,
    resRef: entry.resRef,
    singleSpawn: entry.singleSpawnByte === 1,
  })));
}

export function projectAreaEncounterCreatureListMutation(
  provenanceInput: unknown,
  targetInput: unknown,
): ExistingAreaEncounterCreatureListMutation | undefined {
  const provenance = parseAreaEncounterCreatureListProvenance(provenanceInput);
  const targetEntries = parseAreaEncounterCreatureListTargetEntries(targetInput);
  if (targetEntries.length > 0 && targetEntries.every(isLegacyTargetEntry)) {
    if (targetEntries.length !== provenance.expectedEntries.length) {
      invalid("Encounter CreatureList legacy target length differs from immutable source identity.");
    }
    const entries = provenance.expectedEntries.map((expected, index) => {
      const target = targetEntries[index]!;
      if (!sameLegacyIdentity(expected, target)) {
        invalid(`Encounter CreatureList legacy target identity differs at source index ${index}.`);
      }
      return Object.freeze({
        ...expected,
        singleSpawnByte: target.singleSpawn ? 1 as const : 0 as const,
      });
    });
    if (areaEncounterCreatureListEntriesEqual(provenance.expectedEntries, entries)) {
      return undefined;
    }
    return Object.freeze({
      expectedEntries: provenance.expectedEntries,
      entries: Object.freeze(entries),
    });
  }

  const structuralEntries = targetEntries as readonly AreaEncounterCreatureListStructuralTargetEntry[];
  validateRetainedTargetsAgainstSource(provenance.expectedEntries, structuralEntries);
  if (structuralTargetEqualsSource(provenance.expectedEntries, structuralEntries)) return undefined;
  return Object.freeze({
    expectedEntries: provenance.expectedEntries,
    entries: Object.freeze(structuralEntries.map((entry) => Object.freeze({ ...entry }))),
  });
}

export function parseAreaEncounterCreatureListMutation(
  value: unknown,
): ExistingAreaEncounterCreatureListMutation {
  if (!isExactRecord(value, ["expectedEntries", "entries"])) {
    invalid("Encounter CreatureList mutation must contain one complete CAS pair.");
  }
  const expectedEntries = parseSourceEntries(value.expectedEntries);
  if (!Array.isArray(value.entries) || value.entries.length > MAX_AREA_ENCOUNTER_CREATURE_LIST_ENTRIES) {
    invalid("Encounter CreatureList mutation entry count is invalid.");
  }
  if (value.entries.length > 0
    && value.entries.every((entry) => isExactRecord(entry, SOURCE_ENTRY_KEYS))) {
    const entries = parseSourceEntries(value.entries);
    if (entries.length !== expectedEntries.length) {
      invalid("Encounter CreatureList legacy mutation length differs from immutable source identity.");
    }
    for (let index = 0; index < expectedEntries.length; index += 1) {
      if (!sameSourceIdentity(expectedEntries[index]!, entries[index]!)) {
        invalid(`Encounter CreatureList legacy mutation identity differs at source index ${index}.`);
      }
    }
    if (areaEncounterCreatureListEntriesEqual(expectedEntries, entries)) {
      invalid("Encounter CreatureList mutation is unchanged.");
    }
    return Object.freeze({ expectedEntries, entries });
  }
  const parsedTargets = parseAreaEncounterCreatureListTargetEntries(value.entries);
  if (parsedTargets.some(isLegacyTargetEntry)) {
    invalid("Encounter CreatureList wire mutation must not contain legacy target entries.");
  }
  const entries = parsedTargets as readonly AreaEncounterCreatureListStructuralTargetEntry[];
  validateRetainedTargetsAgainstSource(expectedEntries, entries);
  if (structuralTargetEqualsSource(expectedEntries, entries)) {
    invalid("Encounter CreatureList mutation is unchanged.");
  }
  return Object.freeze({ expectedEntries, entries });
}

export function parseAreaEncounterCreatureListResolvedMutation(
  value: unknown,
): ExistingAreaEncounterCreatureListResolvedMutation {
  if (!isExactRecord(value, ["expectedEntries", "entries"])) {
    invalid("Resolved Encounter CreatureList mutation must contain one complete CAS pair.");
  }
  const expectedEntries = parseSourceEntries(value.expectedEntries);
  const entries = parseSourceEntries(value.entries);
  if (resolvedEntriesEqualSource(expectedEntries, entries)) {
    invalid("Resolved Encounter CreatureList mutation is unchanged.");
  }
  return Object.freeze({ expectedEntries, entries });
}

export function areaEncounterCreatureListEntriesEqual(
  left: readonly AreaEncounterCreatureListSourceEntry[],
  right: readonly AreaEncounterCreatureListSourceEntry[],
): boolean {
  return left.length === right.length && left.every((entry, index) => {
    const candidate = right[index];
    return candidate !== undefined
      && sameSourceIdentity(entry, candidate)
      && entry.singleSpawnByte === candidate.singleSpawnByte;
  });
}

function parseSourceEntries(value: unknown): readonly AreaEncounterCreatureListSourceEntry[] {
  if (!Array.isArray(value) || value.length > MAX_AREA_ENCOUNTER_CREATURE_LIST_ENTRIES) {
    invalid("Encounter CreatureList source entry count is invalid.");
  }
  return Object.freeze(value.map((entry, index) => parseSourceEntry(entry, index)));
}

function parseSourceEntry(
  value: unknown,
  expectedIndex: number,
): AreaEncounterCreatureListSourceEntry {
  if (
    !isExactRecord(value, SOURCE_ENTRY_KEYS)
    || value.sourceIndex !== expectedIndex
    || !isSignedInt32(value.appearance)
    || !isExactFloat32(value.challengeRating)
    || !isEncounterCreatureResRef(value.resRef)
    || (value.singleSpawnByte !== 0 && value.singleSpawnByte !== 1)
  ) invalid(`Encounter CreatureList source entry ${expectedIndex} is invalid.`);
  return Object.freeze({
    sourceIndex: expectedIndex,
    appearance: Number(value.appearance),
    challengeRating: Number(value.challengeRating),
    resRef: String(value.resRef),
    singleSpawnByte: value.singleSpawnByte as 0 | 1,
  });
}

function parseTargetEntry(
  value: unknown,
  index: number,
): AreaEncounterCreatureListTargetEntry {
  if (isExactRecord(value, LEGACY_TARGET_ENTRY_KEYS)) {
    if (!isSignedInt32(value.appearance) || !isExactFloat32(value.challengeRating)
      || !isEncounterCreatureResRef(value.resRef) || typeof value.singleSpawn !== "boolean") {
      invalid(`Encounter CreatureList legacy target entry ${index} is invalid.`);
    }
    return Object.freeze({
      appearance: Number(value.appearance),
      challengeRating: Number(value.challengeRating),
      resRef: String(value.resRef),
      singleSpawn: value.singleSpawn,
    });
  }
  if (isExactRecord(value, RETAINED_TARGET_ENTRY_KEYS)) {
    if (value.entryKind !== "retained" || !Number.isSafeInteger(value.sourceIndex)
      || Number(value.sourceIndex) < 0
      || Number(value.sourceIndex) >= MAX_AREA_ENCOUNTER_CREATURE_LIST_ENTRIES
      || !isSignedInt32(value.appearance) || !isExactFloat32(value.challengeRating)
      || !isEncounterCreatureResRef(value.resRef) || typeof value.singleSpawn !== "boolean") {
      invalid(`Encounter CreatureList retained target entry ${index} is invalid.`);
    }
    return Object.freeze({
      entryKind: "retained" as const,
      sourceIndex: Number(value.sourceIndex),
      appearance: Number(value.appearance),
      challengeRating: Number(value.challengeRating),
      resRef: String(value.resRef),
      singleSpawn: value.singleSpawn,
    });
  }
  if (isExactRecord(value, BLUEPRINT_TARGET_ENTRY_KEYS)) {
    if (value.entryKind !== "effective_blueprint"
      || value.sourceProfileId !== AREA_ENCOUNTER_CREATURE_LIST_BLUEPRINT_PROFILE_ID
      || typeof value.templateId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/u.test(value.templateId)
      || typeof value.resRef !== "string" || !/^[a-z0-9_]{1,16}$/u.test(value.resRef)
      || !isSignedInt32(value.appearance) || !isExactFloat32(value.challengeRating)
      || typeof value.sourceObjectKey !== "string" || value.sourceObjectKey.trim().length < 1
      || value.sourceObjectKey.length > 2048 || value.sourceObjectKey.includes("\0")
      || !Number.isSafeInteger(value.sourceSizeBytes) || Number(value.sourceSizeBytes) < 1
      || Number(value.sourceSizeBytes) > MAX_AREA_ENCOUNTER_CREATURE_LIST_BLUEPRINT_BYTES
      || typeof value.sourceSha256 !== "string" || !/^[a-f0-9]{64}$/u.test(value.sourceSha256)
      || typeof value.singleSpawn !== "boolean") {
      invalid(`Encounter CreatureList effective blueprint target entry ${index} is invalid.`);
    }
    return Object.freeze({
      entryKind: "effective_blueprint" as const,
      sourceProfileId: AREA_ENCOUNTER_CREATURE_LIST_BLUEPRINT_PROFILE_ID,
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
  invalid(`Encounter CreatureList target entry ${index} is invalid.`);
}

function validateRetainedTargetsAgainstSource(
  source: readonly AreaEncounterCreatureListSourceEntry[],
  targets: readonly AreaEncounterCreatureListStructuralTargetEntry[],
): void {
  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index]!;
    if (target.entryKind !== "retained") continue;
    const expected = source[target.sourceIndex];
    if (!expected || !sameRetainedIdentity(expected, target)) {
      invalid(`Encounter CreatureList retained target identity differs at target index ${index}.`);
    }
  }
}

function assertUniqueRetainedSourceIndices(
  entries: readonly AreaEncounterCreatureListTargetEntry[],
): void {
  const retained = new Set<number>();
  for (const entry of entries) {
    if (!isStructuralTargetEntry(entry) || entry.entryKind !== "retained") continue;
    if (retained.has(entry.sourceIndex)) {
      invalid(`Encounter CreatureList retained source index ${entry.sourceIndex} is duplicated.`);
    }
    retained.add(entry.sourceIndex);
  }
}

function structuralTargetEqualsSource(
  source: readonly AreaEncounterCreatureListSourceEntry[],
  targets: readonly AreaEncounterCreatureListStructuralTargetEntry[],
): boolean {
  return source.length === targets.length && source.every((entry, index) => {
    const target = targets[index];
    return target?.entryKind === "retained"
      && target.sourceIndex === entry.sourceIndex
      && sameRetainedIdentity(entry, target)
      && target.singleSpawn === (entry.singleSpawnByte === 1);
  });
}

function resolvedEntriesEqualSource(
  source: readonly AreaEncounterCreatureListSourceEntry[],
  entries: readonly AreaEncounterCreatureListSourceEntry[],
): boolean {
  return source.length === entries.length && source.every((entry, index) => {
    const candidate = entries[index];
    return candidate !== undefined && entry.appearance === candidate.appearance
      && Object.is(entry.challengeRating, candidate.challengeRating)
      && entry.resRef === candidate.resRef
      && entry.singleSpawnByte === candidate.singleSpawnByte;
  });
}

function isLegacyTargetEntry(
  entry: AreaEncounterCreatureListTargetEntry,
): entry is AreaEncounterCreatureListLegacyTargetEntry {
  return !("entryKind" in entry);
}

function isStructuralTargetEntry(
  entry: AreaEncounterCreatureListTargetEntry,
): entry is AreaEncounterCreatureListStructuralTargetEntry {
  return "entryKind" in entry;
}

function sameLegacyIdentity(
  source: AreaEncounterCreatureListSourceEntry,
  target: AreaEncounterCreatureListLegacyTargetEntry,
): boolean {
  return source.appearance === target.appearance
    && Object.is(source.challengeRating, target.challengeRating)
    && source.resRef === target.resRef;
}

function sameRetainedIdentity(
  source: AreaEncounterCreatureListSourceEntry,
  target: AreaEncounterCreatureListRetainedTargetEntry,
): boolean {
  return source.appearance === target.appearance
    && Object.is(source.challengeRating, target.challengeRating)
    && source.resRef === target.resRef;
}

function sameSourceIdentity(
  left: AreaEncounterCreatureListSourceEntry,
  right: AreaEncounterCreatureListSourceEntry,
): boolean {
  return left.sourceIndex === right.sourceIndex
    && left.appearance === right.appearance
    && Object.is(left.challengeRating, right.challengeRating)
    && left.resRef === right.resRef;
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

function isEncounterCreatureResRef(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value);
}

function isExactRecord(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value);
  return keys.length === expectedKeys.length
    && expectedKeys.every((key) => Object.prototype.hasOwnProperty.call(value, key));
}

function invalid(message: string): never {
  throw new AreaEncounterCreatureSingleSpawnValidationError(message);
}
