import type {
  SceneObject,
  SceneObjectEncounterCreatureEntry
} from "../../scene/contracts";
import { createNewSceneObject } from "../../scene/domain/sceneFactory";
import type {
  EncounterApiListItem,
  EncounterApiMetadataPrimitive
} from "../contracts";

const ENCOUNTER_TEMPLATE_X = 0.5;
const ENCOUNTER_TEMPLATE_Y = 0.5;

type EncounterMetadata = Record<string, EncounterApiMetadataPrimitive>;

function sanitizeIdentifier(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .replace(/[^a-zA-Z0-9_]+/gu, "_")
    .replace(/^_+|_+$/gu, "");
  return normalized.length > 0 ? normalized : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(metadata: EncounterMetadata | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(metadata: EncounterMetadata | undefined, key: string): number | undefined {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(metadata: EncounterMetadata | undefined, key: string): boolean | undefined {
  const value = metadata?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function readRecordString(entry: Record<string, unknown>, key: string): string | undefined {
  const value = entry[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readRecordNumber(entry: Record<string, unknown>, key: string): number | undefined {
  const value = entry[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readRecordBoolean(entry: Record<string, unknown>, key: string): boolean | undefined {
  const value = entry[key];
  return typeof value === "boolean" ? value : undefined;
}

function readJsonArray(metadata: EncounterMetadata | undefined, key: string): unknown[] {
  const value = metadata?.[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapCreatureListEntries(
  metadata: EncounterMetadata | undefined
): SceneObjectEncounterCreatureEntry[] {
  return readJsonArray(metadata, "encounterCreatureListEntries")
    .filter(isRecord)
    .map((entry) => ({
      resRef: readRecordString(entry, "resRef"),
      appearance: readRecordNumber(entry, "appearance"),
      challengeRating: readRecordNumber(entry, "challengeRating"),
      singleSpawn: readRecordBoolean(entry, "singleSpawn")
    }))
    .filter((entry) =>
      Object.values(entry).some((value) => value !== undefined && value !== "")
    );
}

function mapScriptSlots(metadata: EncounterMetadata | undefined): Record<string, string> | undefined {
  if (!metadata) {
    return undefined;
  }
  const scripts = Object.entries(metadata).reduce<Record<string, string>>(
    (accumulator, [key, value]) => {
      if (!key.startsWith("script.") || typeof value !== "string" || value.trim().length === 0) {
        return accumulator;
      }
      accumulator[key.slice("script.".length)] = value;
      return accumulator;
    },
    {}
  );
  return Object.keys(scripts).length > 0 ? scripts : undefined;
}

export function mapEncounterApiListItemToSceneObject(
  encounter: EncounterApiListItem,
  sequence = 1
): SceneObject {
  const metadata = encounter.metadata;
  const object = createNewSceneObject(
    "encounters",
    ENCOUNTER_TEMPLATE_X,
    ENCOUNTER_TEMPLATE_Y,
    sequence
  );
  const normalizedTemplateId = sanitizeIdentifier(encounter.templateId, `encounter_${sequence}`);
  const templateResRef = readString(metadata, "templateResRef") ?? encounter.resref;
  const tag = readString(metadata, "tag") ?? encounter.resref;
  const localizedName = readString(metadata, "localizedName") ?? readString(metadata, "displayName");
  const creatureList = mapCreatureListEntries(metadata);
  const scripts = mapScriptSlots(metadata);

  return {
    ...object,
    id: `enc_template_${normalizedTemplateId}`,
    name: localizedName ?? encounter.name,
    resRef: templateResRef,
    tag: tag.toUpperCase(),
    previewImageUrl: encounter.previewImageUrl.trim() || undefined,
    source: {
      type: "aurora_git",
      sourceObjectId: encounter.templateId,
      sourceKind: "encounter",
      templateId: encounter.templateId
    },
    encounterProperties: {
      localizedName,
      description: readString(metadata, "description"),
      active: readBoolean(metadata, "active"),
      difficulty: readNumber(metadata, "difficulty"),
      difficultyIndex: readNumber(metadata, "difficultyIndex"),
      factionId: readNumber(metadata, "factionId"),
      maxCreatures: readNumber(metadata, "maxCreatures"),
      recCreatures: readNumber(metadata, "recCreatures"),
      playerOnly: readBoolean(metadata, "playerOnly"),
      reset: readBoolean(metadata, "reset"),
      resetTime: readNumber(metadata, "resetTime"),
      respawns: readNumber(metadata, "respawns"),
      spawnOption: readNumber(metadata, "spawnOption"),
      ...(creatureList.length > 0 ? { creatureList } : {}),
      ...(scripts ? { scripts } : {})
    }
  };
}
