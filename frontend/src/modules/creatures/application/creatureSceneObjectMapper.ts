import type {
  SceneObject,
  SceneObjectCreatureAppearanceProfile,
  SceneObjectCreatureAppearanceSettings,
  SceneObjectCreatureClassEntry,
  SceneObjectCreatureEquippedItemReference,
  SceneObjectCreatureFeatEntry,
  SceneObjectCreatureInventoryItemReference,
  SceneObjectCreatureLocalizedStringRefs,
  SceneObjectCreatureLocalizedStrings,
  SceneObjectCreatureLookupProfile,
  SceneObjectCreatureListCounts,
  SceneObjectCreatureSkillEntry,
  SceneObjectCreatureScriptSlots,
  SceneObjectCreatureSpecialAbilityEntry,
  SceneObjectCreatureSpellEntry,
  SceneObjectCreatureTemplateEntry,
  SceneObjectCreatureVariableEntry,
  SceneObjectEmbeddedItemSummary,
  SceneObjectItemPropertyEntry
} from "../../scene/contracts";
import { createNewSceneObject } from "../../scene/domain/sceneFactory";
import type {
  CreatureApiListItem,
  CreatureApiMetadataPrimitive
} from "../contracts";
import { CREATURE_SKILL_LABELS } from "./creatureSkillLabels";

const CREATURE_TEMPLATE_X = 0.5;
const CREATURE_TEMPLATE_Y = 0.5;
const AURORA_CREATURE_DEFAULT_ABILITY_SCORE = 0;
const AURORA_CREATURE_DEFAULT_HIT_POINTS = 0;

type CreatureMetadata = Record<string, CreatureApiMetadataPrimitive>;

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

function readString(metadata: CreatureMetadata | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(metadata: CreatureMetadata | undefined, key: string): number | undefined {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(metadata: CreatureMetadata | undefined, key: string): boolean | undefined {
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

function readJsonArray(metadata: CreatureMetadata | undefined, key: string): unknown[] {
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

function mapEmbeddedItemPropertyEntries(value: unknown): SceneObjectItemPropertyEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const entries = value
    .filter(isRecord)
    .map((entry) => ({
      propertyName: readRecordNumber(entry, "propertyName"),
      subtype: readRecordNumber(entry, "subtype"),
      costTable: readRecordNumber(entry, "costTable"),
      costValue: readRecordNumber(entry, "costValue"),
      param1: readRecordNumber(entry, "param1"),
      param1Value: readRecordNumber(entry, "param1Value"),
      chanceAppear: readRecordNumber(entry, "chanceAppear")
    }))
    .filter((entry) => Object.values(entry).some((entryValue) => entryValue !== undefined));
  return entries.length > 0 ? entries : undefined;
}

function mapEmbeddedItemSummary(
  entry: Record<string, unknown>
): SceneObjectEmbeddedItemSummary | undefined {
  const rawEmbeddedItem = entry.embeddedItem;
  if (!isRecord(rawEmbeddedItem)) {
    return undefined;
  }
  const summary: SceneObjectEmbeddedItemSummary = {
    sourceStructTypeId: readRecordNumber(rawEmbeddedItem, "sourceStructTypeId"),
    templateResRef: readRecordString(rawEmbeddedItem, "templateResRef"),
    tag: readRecordString(rawEmbeddedItem, "tag"),
    localizedName: readRecordString(rawEmbeddedItem, "localizedName"),
    localizedNameStrRef: readRecordNumber(rawEmbeddedItem, "localizedNameStrRef"),
    description: readRecordString(rawEmbeddedItem, "description"),
    descriptionStrRef: readRecordNumber(rawEmbeddedItem, "descriptionStrRef"),
    identifiedDescription: readRecordString(rawEmbeddedItem, "identifiedDescription"),
    identifiedDescriptionStrRef: readRecordNumber(rawEmbeddedItem, "identifiedDescriptionStrRef"),
    comments: readRecordString(rawEmbeddedItem, "comments"),
    paletteId: readRecordNumber(rawEmbeddedItem, "paletteId"),
    plot: readRecordBoolean(rawEmbeddedItem, "plot"),
    baseItem: readRecordNumber(rawEmbeddedItem, "baseItem"),
    modelPart1: readRecordNumber(rawEmbeddedItem, "modelPart1"),
    modelPart2: readRecordNumber(rawEmbeddedItem, "modelPart2"),
    modelPart3: readRecordNumber(rawEmbeddedItem, "modelPart3"),
    cost: readRecordNumber(rawEmbeddedItem, "cost"),
    addCost: readRecordNumber(rawEmbeddedItem, "addCost"),
    costTable: readRecordNumber(rawEmbeddedItem, "costTable"),
    costValue: readRecordNumber(rawEmbeddedItem, "costValue"),
    charges: readRecordNumber(rawEmbeddedItem, "charges"),
    stackSize: readRecordNumber(rawEmbeddedItem, "stackSize"),
    identified: readRecordBoolean(rawEmbeddedItem, "identified"),
    stolen: readRecordBoolean(rawEmbeddedItem, "stolen"),
    cursed: readRecordBoolean(rawEmbeddedItem, "cursed"),
    bodyPartRFoot: readRecordNumber(rawEmbeddedItem, "bodyPartRFoot"),
    bodyPartLFoot: readRecordNumber(rawEmbeddedItem, "bodyPartLFoot"),
    bodyPartRShin: readRecordNumber(rawEmbeddedItem, "bodyPartRShin"),
    bodyPartLShin: readRecordNumber(rawEmbeddedItem, "bodyPartLShin"),
    bodyPartLThigh: readRecordNumber(rawEmbeddedItem, "bodyPartLThigh"),
    bodyPartRThigh: readRecordNumber(rawEmbeddedItem, "bodyPartRThigh"),
    bodyPartPelvis: readRecordNumber(rawEmbeddedItem, "bodyPartPelvis"),
    bodyPartTorso: readRecordNumber(rawEmbeddedItem, "bodyPartTorso"),
    bodyPartBelt: readRecordNumber(rawEmbeddedItem, "bodyPartBelt"),
    bodyPartNeck: readRecordNumber(rawEmbeddedItem, "bodyPartNeck"),
    bodyPartRFArm: readRecordNumber(rawEmbeddedItem, "bodyPartRFArm"),
    bodyPartLFArm: readRecordNumber(rawEmbeddedItem, "bodyPartLFArm"),
    bodyPartRBicep: readRecordNumber(rawEmbeddedItem, "bodyPartRBicep"),
    bodyPartLBicep: readRecordNumber(rawEmbeddedItem, "bodyPartLBicep"),
    bodyPartRShoul: readRecordNumber(rawEmbeddedItem, "bodyPartRShoul"),
    bodyPartLShoul: readRecordNumber(rawEmbeddedItem, "bodyPartLShoul"),
    bodyPartRHand: readRecordNumber(rawEmbeddedItem, "bodyPartRHand"),
    bodyPartLHand: readRecordNumber(rawEmbeddedItem, "bodyPartLHand"),
    bodyPartRobe: readRecordNumber(rawEmbeddedItem, "bodyPartRobe"),
    leather1Color: readRecordNumber(rawEmbeddedItem, "leather1Color"),
    leather2Color: readRecordNumber(rawEmbeddedItem, "leather2Color"),
    cloth1Color: readRecordNumber(rawEmbeddedItem, "cloth1Color"),
    cloth2Color: readRecordNumber(rawEmbeddedItem, "cloth2Color"),
    metal1Color: readRecordNumber(rawEmbeddedItem, "metal1Color"),
    metal2Color: readRecordNumber(rawEmbeddedItem, "metal2Color"),
    itemPropertyListCount: readRecordNumber(rawEmbeddedItem, "itemPropertyListCount"),
    itemPropertyListEntries: mapEmbeddedItemPropertyEntries(
      rawEmbeddedItem.itemPropertyListEntries
    ),
    scripts: readRecordStringMap(rawEmbeddedItem, "scripts"),
    fieldCount: readRecordNumber(rawEmbeddedItem, "fieldCount")
  };
  return Object.values(summary).some((value) => value !== undefined && value !== "")
    ? summary
    : undefined;
}

function readRecordStringMap(
  entry: Record<string, unknown>,
  key: string
): Record<string, string> | undefined {
  const value = entry[key];
  if (!isRecord(value)) {
    return undefined;
  }
  const mapped: Record<string, string> = {};
  Object.entries(value).forEach(([entryKey, entryValue]) => {
    const normalizedKey = entryKey.trim();
    const normalizedValue =
      typeof entryValue === "string" && entryValue.trim().length > 0
        ? entryValue.trim()
        : undefined;
    if (normalizedKey.length > 0 && normalizedValue) {
      mapped[normalizedKey] = normalizedValue;
    }
  });
  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function formatNumberLabel(prefix: string, value: number | undefined, fallback = ""): string {
  return typeof value === "number" ? `${prefix} ${value}` : fallback;
}

function formatPartNumber(value: number | undefined): string {
  return typeof value === "number" ? String(value) : "";
}

function readEffectiveNumber(
  metadata: CreatureMetadata | undefined,
  primaryKey: string,
  fallbackKey: string,
  fallback: number
): number {
  return readNumber(metadata, primaryKey) ?? readNumber(metadata, fallbackKey) ?? fallback;
}

function resolveAlignmentLabel(
  goodEvil: number | undefined,
  lawfulChaotic: number | undefined
): string {
  const moralAxis =
    typeof goodEvil === "number" ? (goodEvil >= 67 ? "Good" : goodEvil <= 33 ? "Evil" : "Neutral") : "Neutral";
  const orderAxis =
    typeof lawfulChaotic === "number"
      ? lawfulChaotic >= 67
        ? "Lawful"
        : lawfulChaotic <= 33
          ? "Chaotic"
          : "Neutral"
      : "Neutral";

  if (moralAxis === "Neutral" && orderAxis === "Neutral") {
    return "True Neutral";
  }
  if (orderAxis === "Neutral") {
    return `Neutral ${moralAxis}`;
  }
  if (moralAxis === "Neutral") {
    return `${orderAxis} Neutral`;
  }
  return `${orderAxis} ${moralAxis}`;
}

function mapClassEntries(metadata: CreatureMetadata | undefined): SceneObjectCreatureClassEntry[] {
  return readJsonArray(metadata, "classListEntries")
    .filter(isRecord)
    .map((entry, index) => {
      const classId = typeof entry.classId === "number" ? entry.classId : undefined;
      const classLabel =
        typeof entry.classLabel === "string" && entry.classLabel.trim().length > 0
          ? entry.classLabel.trim()
          : undefined;
      const level = typeof entry.level === "number" && Number.isFinite(entry.level)
        ? Math.max(0, entry.level)
        : 0;
      return {
        ...(classId !== undefined ? { classId } : {}),
        className: classLabel ?? formatNumberLabel("Class", classId, `Class ${index + 1}`),
        level
      };
    });
}

function mapSkillEntries(metadata: CreatureMetadata | undefined): SceneObjectCreatureSkillEntry[] {
  return readJsonArray(metadata, "skillListEntries")
    .filter(isRecord)
    .map((entry, index) => {
      const skillId = typeof entry.skillId === "number" && Number.isFinite(entry.skillId)
        ? Math.max(0, Math.trunc(entry.skillId))
        : index;
      const skillLabel =
        typeof entry.skillLabel === "string" && entry.skillLabel.trim().length > 0
          ? entry.skillLabel.trim()
          : undefined;
      return {
        skill: skillLabel ?? CREATURE_SKILL_LABELS[skillId] ?? `Skill ${skillId + 1}`,
        rank:
          typeof entry.rank === "number" && Number.isFinite(entry.rank)
            ? Math.max(0, entry.rank)
            : 0
      };
    });
}

function mapFeatEntries(metadata: CreatureMetadata | undefined): SceneObjectCreatureFeatEntry[] {
  return readJsonArray(metadata, "featListEntries")
    .filter(isRecord)
    .map((entry, index) => {
      const featId = typeof entry.featId === "number" ? entry.featId : undefined;
      const featLabel =
        typeof entry.featLabel === "string" && entry.featLabel.trim().length > 0
          ? entry.featLabel.trim()
          : undefined;
      return {
        ...(featId !== undefined ? { featId } : {}),
        name: featLabel ?? formatNumberLabel("Feat", featId, `Feat ${index + 1}`),
        type: "feat",
        assigned: true
      };
    });
}

function mapTemplateEntries(metadata: CreatureMetadata | undefined): SceneObjectCreatureTemplateEntry[] {
  return readJsonArray(metadata, "templateListEntries")
    .filter(isRecord)
    .map((entry) => ({ templateId: readRecordNumber(entry, "templateId") }))
    .filter((entry) => typeof entry.templateId === "number");
}

function mapSpellsFromClassEntries(
  metadata: CreatureMetadata | undefined
): SceneObjectCreatureSpellEntry[] {
  const spells: SceneObjectCreatureSpellEntry[] = [];
  readJsonArray(metadata, "classListEntries")
    .filter(isRecord)
    .forEach((entry, classIndex) => {
      const classLevel =
        typeof entry.level === "number" && Number.isFinite(entry.level) ? entry.level : 0;
      const knownSpells = Array.isArray(entry.knownSpells) ? entry.knownSpells : [];
      knownSpells.filter(isRecord).forEach((spell, index) => {
        const spellId = typeof spell.spellId === "number" ? spell.spellId : undefined;
        const spellLabel =
          typeof spell.spellLabel === "string" && spell.spellLabel.trim().length > 0
            ? spell.spellLabel.trim()
            : undefined;
        const spellLevel = typeof spell.spellLevel === "number" ? spell.spellLevel : 0;
        const metaMagic = typeof spell.metaMagic === "number" ? spell.metaMagic : undefined;
        const flags = typeof spell.flags === "number" ? spell.flags : undefined;
        spells.push({
          ...(spellId !== undefined ? { spellId } : {}),
          classIndex,
          prepared: false,
          name: spellLabel ?? formatNumberLabel("Spell", spellId, `Known Spell ${index + 1}`),
          spellLevel,
          castingLevel: classLevel,
          metaMagic,
          flags
        });
      });
      const memorizedSpells = Array.isArray(entry.memorizedSpells)
        ? entry.memorizedSpells
        : [];
      memorizedSpells.filter(isRecord).forEach((spell, index) => {
        const spellId = typeof spell.spellId === "number" ? spell.spellId : undefined;
        const spellLabel =
          typeof spell.spellLabel === "string" && spell.spellLabel.trim().length > 0
            ? spell.spellLabel.trim()
            : undefined;
        const spellLevel = typeof spell.spellLevel === "number" ? spell.spellLevel : 0;
        const metaMagic = typeof spell.metaMagic === "number" ? spell.metaMagic : undefined;
        const flags = typeof spell.flags === "number" ? spell.flags : undefined;
        spells.push({
          ...(spellId !== undefined ? { spellId } : {}),
          classIndex,
          prepared: true,
          name: spellLabel ?? formatNumberLabel("Spell", spellId, `Memorized Spell ${index + 1}`),
          spellLevel,
          castingLevel: classLevel,
          metaMagic,
          flags
        });
      });
    });
  return spells;
}

function buildAppearanceSettings(
  metadata: CreatureMetadata | undefined
): SceneObjectCreatureAppearanceSettings | undefined {
  const appearanceHead = readNumber(metadata, "appearanceHead");
  const bodyPartNeck = readNumber(metadata, "bodyPartNeck");
  const bodyPartTorso = readNumber(metadata, "bodyPartTorso");
  const bodyPartPelvis = readNumber(metadata, "bodyPartPelvis");
  const bodyPartBelt = readNumber(metadata, "bodyPartBelt");
  const bodyPartRBicep = readNumber(metadata, "bodyPartRBicep");
  const bodyPartLBicep = readNumber(metadata, "bodyPartLBicep");
  const bodyPartRShoul = readNumber(metadata, "bodyPartRShoul");
  const bodyPartLShoul = readNumber(metadata, "bodyPartLShoul");
  const bodyPartRFArm = readNumber(metadata, "bodyPartRFArm");
  const bodyPartLFArm = readNumber(metadata, "bodyPartLFArm");
  const bodyPartRHand = readNumber(metadata, "bodyPartRHand");
  const bodyPartLHand = readNumber(metadata, "bodyPartLHand");
  const bodyPartRThigh = readNumber(metadata, "bodyPartRThigh");
  const bodyPartLThigh = readNumber(metadata, "bodyPartLThigh");
  const bodyPartRShin = readNumber(metadata, "bodyPartRShin");
  const bodyPartLShin = readNumber(metadata, "bodyPartLShin");
  const bodyPartRFoot = readNumber(metadata, "bodyPartRFoot");
  const bodyPartLFoot = readNumber(metadata, "bodyPartLFoot");
  const bodyPartRobe = readNumber(metadata, "bodyPartRobe");
  const wingsNew = readNumber(metadata, "wingsNew");
  const tailNew = readNumber(metadata, "tailNew");
  const colorSkin = readNumber(metadata, "colorSkin");
  const colorHair = readNumber(metadata, "colorHair");
  const colorTattoo1 = readNumber(metadata, "colorTattoo1");
  const colorTattoo2 = readNumber(metadata, "colorTattoo2");
  const hasPartValue = [
    appearanceHead,
    bodyPartNeck,
    bodyPartTorso,
    bodyPartPelvis,
    bodyPartBelt,
    bodyPartRBicep,
    bodyPartLBicep,
    bodyPartRShoul,
    bodyPartLShoul,
    bodyPartRFArm,
    bodyPartLFArm,
    bodyPartRHand,
    bodyPartLHand,
    bodyPartRThigh,
    bodyPartLThigh,
    bodyPartRShin,
    bodyPartLShin,
    bodyPartRFoot,
    bodyPartLFoot,
    bodyPartRobe,
    wingsNew,
    tailNew,
    colorSkin,
    colorHair,
    colorTattoo1,
    colorTattoo2
  ].some((value) => value !== undefined);

  if (!hasPartValue) {
    return undefined;
  }

  return {
    partBasedAppearance: true,
    head: formatPartNumber(appearanceHead),
    neck: formatPartNumber(bodyPartNeck),
    torso: formatPartNumber(bodyPartTorso),
    pelvis: formatPartNumber(bodyPartPelvis),
    rightBicep: formatPartNumber(bodyPartRBicep),
    leftBicep: formatPartNumber(bodyPartLBicep),
    rightForearm: formatPartNumber(bodyPartRFArm),
    leftForearm: formatPartNumber(bodyPartLFArm),
    rightHand: formatPartNumber(bodyPartRHand),
    leftHand: formatPartNumber(bodyPartLHand),
    rightThigh: formatPartNumber(bodyPartRThigh),
    leftThigh: formatPartNumber(bodyPartLThigh),
    rightShin: formatPartNumber(bodyPartRShin),
    leftShin: formatPartNumber(bodyPartLShin),
    rightFoot: formatPartNumber(bodyPartRFoot),
    leftFoot: formatPartNumber(bodyPartLFoot),
    wings: formatPartNumber(wingsNew),
    tail: formatPartNumber(tailNew),
    colors: {
      skin: formatPartNumber(colorSkin),
      hair: formatPartNumber(colorHair),
      tattoo1: formatPartNumber(colorTattoo1),
      tattoo2: formatPartNumber(colorTattoo2)
    },
    sourceOnlyParts: {
      belt: formatPartNumber(bodyPartBelt),
      robe: formatPartNumber(bodyPartRobe),
      rightShoulder: formatPartNumber(bodyPartRShoul),
      leftShoulder: formatPartNumber(bodyPartLShoul)
    }
  };
}

function buildAppearanceProfile(
  metadata: CreatureMetadata | undefined
): SceneObjectCreatureAppearanceProfile | undefined {
  const source2daRow = readNumber(metadata, "appearanceLabelSource2daRow");
  const sourceKey = readString(metadata, "appearanceLabelSourceKey");
  const modelType = readString(metadata, "appearanceModelType");
  const raceModel = readString(metadata, "appearanceRaceModel");
  const portrait2da = readString(metadata, "appearancePortrait2da");
  const envMap = readString(metadata, "appearanceEnvMap");
  const defaultPhenotype = readString(metadata, "appearanceDefaultPhenotype");
  const bloodColor = readString(metadata, "appearanceBloodColor");
  const sizeCategory = readNumber(metadata, "appearanceSizeCategory");
  const sizeCategoryLabel = readString(metadata, "appearanceSizeCategoryLabel");
  const sizeCategorySource2daRow = readNumber(metadata, "appearanceSizeCategorySource2daRow");
  const sizeCategorySourceKey = readString(metadata, "appearanceSizeCategorySourceKey");
  const raceAppearanceId = readNumber(metadata, "raceAppearanceId");
  const hasProfileValue = [
    source2daRow,
    sourceKey,
    modelType,
    raceModel,
    portrait2da,
    envMap,
    defaultPhenotype,
    bloodColor,
    sizeCategory,
    sizeCategoryLabel,
    sizeCategorySource2daRow,
    sizeCategorySourceKey,
    raceAppearanceId
  ].some((value) => value !== undefined);

  if (!hasProfileValue) {
    return undefined;
  }

  return {
    ...(source2daRow !== undefined ? { source2daRow } : {}),
    ...(sourceKey ? { sourceKey } : {}),
    ...(modelType ? { modelType } : {}),
    ...(raceModel ? { raceModel } : {}),
    ...(portrait2da ? { portrait2da } : {}),
    ...(envMap ? { envMap } : {}),
    ...(defaultPhenotype ? { defaultPhenotype } : {}),
    ...(bloodColor ? { bloodColor } : {}),
    ...(sizeCategory !== undefined ? { sizeCategory } : {}),
    ...(sizeCategoryLabel ? { sizeCategoryLabel } : {}),
    ...(sizeCategorySource2daRow !== undefined ? { sizeCategorySource2daRow } : {}),
    ...(sizeCategorySourceKey ? { sizeCategorySourceKey } : {}),
    ...(raceAppearanceId !== undefined ? { raceAppearanceId } : {})
  };
}

function buildLookupProfile(
  metadata: CreatureMetadata | undefined
): SceneObjectCreatureLookupProfile | undefined {
  const raceLabelSource2daRow = readNumber(metadata, "raceLabelSource2daRow");
  const raceLabelSourceKey = readString(metadata, "raceLabelSourceKey");
  const genderLabelSource2daRow = readNumber(metadata, "genderLabelSource2daRow");
  const genderLabelSourceKey = readString(metadata, "genderLabelSourceKey");
  const portraitResolvedSource2daRow = readNumber(metadata, "portraitResolvedSource2daRow");
  const portraitResolvedSourceKey = readString(metadata, "portraitResolvedSourceKey");
  const soundSetResRef = readString(metadata, "soundSetResRef");
  const soundSetSource2daRow = readNumber(metadata, "soundSetSource2daRow");
  const soundSetSourceKey = readString(metadata, "soundSetSourceKey");
  const hasProfileValue = [
    raceLabelSource2daRow,
    raceLabelSourceKey,
    genderLabelSource2daRow,
    genderLabelSourceKey,
    portraitResolvedSource2daRow,
    portraitResolvedSourceKey,
    soundSetResRef,
    soundSetSource2daRow,
    soundSetSourceKey
  ].some((value) => value !== undefined);

  if (!hasProfileValue) {
    return undefined;
  }

  return {
    ...(raceLabelSource2daRow !== undefined ? { raceLabelSource2daRow } : {}),
    ...(raceLabelSourceKey ? { raceLabelSourceKey } : {}),
    ...(genderLabelSource2daRow !== undefined ? { genderLabelSource2daRow } : {}),
    ...(genderLabelSourceKey ? { genderLabelSourceKey } : {}),
    ...(portraitResolvedSource2daRow !== undefined
      ? { portraitResolvedSource2daRow }
      : {}),
    ...(portraitResolvedSourceKey ? { portraitResolvedSourceKey } : {}),
    ...(soundSetResRef ? { soundSetResRef } : {}),
    ...(soundSetSource2daRow !== undefined ? { soundSetSource2daRow } : {}),
    ...(soundSetSourceKey ? { soundSetSourceKey } : {})
  };
}

function buildListCounts(
  metadata: CreatureMetadata | undefined
): SceneObjectCreatureListCounts | undefined {
  const classListCount = readNumber(metadata, "classListCount");
  const skillListCount = readNumber(metadata, "skillListCount");
  const featListCount = readNumber(metadata, "featListCount");
  const templateListCount = readNumber(metadata, "templateListCount");
  const specAbilityListCount = readNumber(metadata, "specAbilityListCount");
  const inventoryItemListCount = readNumber(metadata, "inventoryItemListCount");
  const equipItemListCount = readNumber(metadata, "equipItemListCount");
  const hasCounts = [
    classListCount,
    skillListCount,
    featListCount,
    templateListCount,
    specAbilityListCount,
    inventoryItemListCount,
    equipItemListCount
  ].some((value) => value !== undefined);

  if (!hasCounts) {
    return undefined;
  }

  return {
    ...(classListCount !== undefined ? { classListCount } : {}),
    ...(skillListCount !== undefined ? { skillListCount } : {}),
    ...(featListCount !== undefined ? { featListCount } : {}),
    ...(templateListCount !== undefined ? { templateListCount } : {}),
    ...(specAbilityListCount !== undefined ? { specAbilityListCount } : {}),
    ...(inventoryItemListCount !== undefined ? { inventoryItemListCount } : {}),
    ...(equipItemListCount !== undefined ? { equipItemListCount } : {})
  };
}

function buildLocalizedStringRefs(
  metadata: CreatureMetadata | undefined
): SceneObjectCreatureLocalizedStringRefs | undefined {
  const firstName = readNumber(metadata, "firstNameStrRef");
  const lastName = readNumber(metadata, "lastNameStrRef");
  const localizedName = readNumber(metadata, "localizedNameStrRef");
  const description = readNumber(metadata, "descriptionStrRef");
  const identifiedDescription = readNumber(metadata, "identifiedDescriptionStrRef");
  const subrace = readNumber(metadata, "subraceStrRef");
  const deity = readNumber(metadata, "deityStrRef");
  const hasRefs = [
    firstName,
    lastName,
    localizedName,
    description,
    identifiedDescription,
    subrace,
    deity
  ].some((value) => value !== undefined);

  if (!hasRefs) {
    return undefined;
  }

  return {
    ...(firstName !== undefined ? { firstName } : {}),
    ...(lastName !== undefined ? { lastName } : {}),
    ...(localizedName !== undefined ? { localizedName } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(identifiedDescription !== undefined ? { identifiedDescription } : {}),
    ...(subrace !== undefined ? { subrace } : {}),
    ...(deity !== undefined ? { deity } : {})
  };
}

function buildLocalizedStrings(
  metadata: CreatureMetadata | undefined
): SceneObjectCreatureLocalizedStrings | undefined {
  const localizedName = readString(metadata, "localizedName");
  const displayName = readString(metadata, "displayName");
  const identifiedDescription = readString(metadata, "identifiedDescription");
  const hasStrings = [localizedName, displayName, identifiedDescription].some(
    (value) => value !== undefined
  );

  if (!hasStrings) {
    return undefined;
  }

  return {
    ...(localizedName ? { localizedName } : {}),
    ...(displayName ? { displayName } : {}),
    ...(identifiedDescription ? { identifiedDescription } : {})
  };
}

function mapInventoryItems(
  metadata: CreatureMetadata | undefined
): SceneObjectCreatureInventoryItemReference[] {
  return readJsonArray(metadata, "inventoryItemListEntries")
    .filter(isRecord)
    .map((entry) => ({
      resRef: readRecordString(entry, "resRef"),
      randomResRef: readRecordString(entry, "randomResRef"),
      randomList: readRecordString(entry, "randomList"),
      embeddedItem: mapEmbeddedItemSummary(entry),
      itemTemplateId: readRecordString(entry, "itemTemplateId"),
      itemResRef: readRecordString(entry, "itemResref"),
      itemSourceFingerprint: readRecordString(entry, "itemSourceFingerprint"),
      itemSourceObjectKey: readRecordString(entry, "itemSourceObjectKey"),
      itemBaseItem: readRecordNumber(entry, "itemBaseItem"),
      itemBaseItemEquipableSlots: readRecordString(entry, "itemBaseItemEquipableSlots"),
      x: readRecordNumber(entry, "x"),
      y: readRecordNumber(entry, "y"),
      dropable: readRecordBoolean(entry, "dropable"),
      pickpocketable: readRecordBoolean(entry, "pickpocketable"),
      infinite: readRecordBoolean(entry, "infinite")
    }))
    .filter((entry) =>
      Object.values(entry).some((value) => value !== undefined && value !== "")
    );
}

function mapEquippedItems(
  metadata: CreatureMetadata | undefined
): SceneObjectCreatureEquippedItemReference[] {
  return readJsonArray(metadata, "equipItemListEntries")
    .filter(isRecord)
    .map((entry) => ({
      resRef: readRecordString(entry, "resRef"),
      randomResRef: readRecordString(entry, "randomResRef"),
      randomList: readRecordString(entry, "randomList"),
      embeddedItem: mapEmbeddedItemSummary(entry),
      itemTemplateId: readRecordString(entry, "itemTemplateId"),
      itemResRef: readRecordString(entry, "itemResref"),
      itemSourceFingerprint: readRecordString(entry, "itemSourceFingerprint"),
      itemSourceObjectKey: readRecordString(entry, "itemSourceObjectKey"),
      itemBaseItem: readRecordNumber(entry, "itemBaseItem"),
      itemBaseItemEquipableSlots: readRecordString(entry, "itemBaseItemEquipableSlots"),
      slotMask: readRecordNumber(entry, "slotMask"),
      dropable: readRecordBoolean(entry, "dropable"),
      pickpocketable: readRecordBoolean(entry, "pickpocketable"),
      infinite: readRecordBoolean(entry, "infinite")
    }))
    .filter((entry) =>
      Object.values(entry).some((value) => value !== undefined && value !== "")
    );
}

function mapSpecialAbilities(
  metadata: CreatureMetadata | undefined
): SceneObjectCreatureSpecialAbilityEntry[] {
  return readJsonArray(metadata, "specAbilityListEntries")
    .filter(isRecord)
    .map((entry, index) => {
      const spellId = typeof entry.spellId === "number" ? entry.spellId : undefined;
      const spellLabel =
        typeof entry.spellLabel === "string" && entry.spellLabel.trim().length > 0
          ? entry.spellLabel.trim()
          : undefined;
      const flags = typeof entry.flags === "number" ? entry.flags : undefined;
      const casterLevel =
        typeof entry.casterLevel === "number" && Number.isFinite(entry.casterLevel)
          ? entry.casterLevel
          : 0;
      return {
        ...(spellId !== undefined ? { spellId } : {}),
        ...(flags !== undefined ? { flags } : {}),
        name: spellLabel ?? formatNumberLabel("Spell", spellId, `Special Ability ${index + 1}`),
        type: typeof flags === "number" ? `Flags ${flags}` : "special",
        casterLevel,
        uses: 0
      };
    });
}

function mapCreatureVariables(metadata: CreatureMetadata | undefined): SceneObjectCreatureVariableEntry[] {
  const variables: SceneObjectCreatureVariableEntry[] = [];
  for (const entry of readJsonArray(metadata, "variableListEntries")) {
    if (!isRecord(entry) || typeof entry.name !== "string" || entry.name.trim().length === 0) {
      continue;
    }
    if (entry.type === "int" && typeof entry.value === "number" && Number.isFinite(entry.value)) {
      variables.push({ name: entry.name.trim(), type: "int", value: Math.trunc(entry.value) });
      continue;
    }
    if (entry.type === "float" && typeof entry.value === "number" && Number.isFinite(entry.value)) {
      variables.push({ name: entry.name.trim(), type: "float", value: entry.value });
      continue;
    }
    if (entry.type === "string" && typeof entry.value === "string") {
      variables.push({ name: entry.name.trim(), type: "string", value: entry.value });
    }
  }
  return variables;
}

function readScriptSlot(
  metadata: CreatureMetadata | undefined,
  labels: readonly string[]
): string {
  for (const label of labels) {
    const value = readString(metadata, `script.${label}`);
    if (value) {
      return value;
    }
  }
  return "";
}

function buildScriptSlots(metadata: CreatureMetadata | undefined): SceneObjectCreatureScriptSlots {
  return {
    onBlocked: readScriptSlot(metadata, ["scriptonblocked"]),
    onCombatRoundEnd: readScriptSlot(metadata, ["scriptendround"]),
    onConversation: readScriptSlot(metadata, ["scriptdialogue", "ondialog"]),
    onDamaged: readScriptSlot(metadata, ["scriptdamaged", "ondamaged"]),
    onDeath: readScriptSlot(metadata, ["scriptdeath", "ondeath"]),
    onDisturbed: readScriptSlot(metadata, [
      "scriptdisturbed",
      "oninventorydisturbed",
      "oninvdisturbed"
    ]),
    onHeartbeat: readScriptSlot(metadata, ["scriptheartbeat", "onheartbeat"]),
    onPerception: readScriptSlot(metadata, ["scriptonnotice"]),
    onPhysicalAttacked: readScriptSlot(metadata, ["scriptattacked", "onmeleeattacked"]),
    onRested: readScriptSlot(metadata, ["scriptrested"]),
    onSpawn: readScriptSlot(metadata, ["scriptspawn"]),
    onSpellCastAt: readScriptSlot(metadata, ["scriptspellat", "onspellcastat"]),
    onUserDefined: readScriptSlot(metadata, ["scriptuserdefine", "onuserdefined"])
  };
}

export function mapCreatureApiListItemToSceneObject(
  creature: CreatureApiListItem,
  sequence = 1
): SceneObject {
  const metadata = creature.metadata;
  const object = createNewSceneObject(
    "creatures",
    CREATURE_TEMPLATE_X,
    CREATURE_TEMPLATE_Y,
    sequence
  );
  const normalizedTemplateId = sanitizeIdentifier(creature.templateId, `creature_${sequence}`);
  const templateResRef = readString(metadata, "templateResRef") ?? creature.resref;
  const tag = readString(metadata, "tag") ?? creature.resref;
  const firstName = readString(metadata, "firstName") ?? creature.name;
  const lastName = readString(metadata, "lastName") ?? "";
  const sourceEtag = readString(metadata, "sourceEtag");
  const sourceFileType = readString(metadata, "sourceFileType");
  const sourceFileVersion = readString(metadata, "sourceFileVersion");
  const sourceStructTypeId = readNumber(metadata, "sourceStructTypeId");
  const sourceModelResRef = readString(metadata, "modelResRef");
  const classEntries = mapClassEntries(metadata);
  const skills = mapSkillEntries(metadata);
  const feats = mapFeatEntries(metadata);
  const templateEntries = mapTemplateEntries(metadata);
  const spells = mapSpellsFromClassEntries(metadata);
  const specialAbilities = mapSpecialAbilities(metadata);
  const variables = mapCreatureVariables(metadata);
  const inventoryItems = mapInventoryItems(metadata);
  const equippedItems = mapEquippedItems(metadata);
  const appearanceSettings = buildAppearanceSettings(metadata);
  const appearanceProfile = buildAppearanceProfile(metadata);
  const lookupProfile = buildLookupProfile(metadata);
  const listCounts = buildListCounts(metadata);
  const localizedStringRefs = buildLocalizedStringRefs(metadata);
  const localizedStrings = buildLocalizedStrings(metadata);
  const appearanceType = readNumber(metadata, "appearanceId");
  const appearanceLabel = readString(metadata, "appearanceLabel");
  const race = readNumber(metadata, "race");
  const raceLabel = readString(metadata, "raceLabel");
  const phenotype = readNumber(metadata, "phenotype");
  const phenotypeLabel = readString(metadata, "phenotypeLabel");
  const gender = readNumber(metadata, "gender");
  const genderLabel = readString(metadata, "genderLabel");
  const factionId = readNumber(metadata, "factionId");
  const soundSetFile = readNumber(metadata, "soundSetFile");
  const soundSetLabel = readString(metadata, "soundSetLabel") ?? readString(metadata, "soundSetResRef");
  const animationState = readNumber(metadata, "animationState");
  const animationName =
    readString(metadata, "animationName") ?? readString(metadata, "animationStateName");
  const walkRateSource2daRow = readNumber(metadata, "walkRateSource2daRow");
  const walkRateSource2daName = readString(metadata, "walkRateSource2daName");
  const walkRateSpeed2daRow = readNumber(metadata, "walkRateSpeed2daRow");
  const walkRateAppearance2daSourceKey = readString(
    metadata,
    "walkRateAppearance2daSourceKey"
  );
  const walkRateSpeed2daSourceKey = readString(metadata, "walkRateSpeed2daSourceKey");
  const portraitId = readNumber(metadata, "portraitId") ?? readNumber(metadata, "portraitIdEffective");
  const portraitResRef =
    readString(metadata, "portraitResRef") ??
    readString(metadata, "portraitResolvedResRef") ??
    formatNumberLabel("Portrait", portraitId);
  const alignment = resolveAlignmentLabel(
    readNumber(metadata, "goodEvil"),
    readNumber(metadata, "lawfulChaotic")
  );
  const perceptionRange = readEffectiveNumber(
    metadata,
    "perceptionRange",
    "perceptionRangeEffective",
    11
  );
  const hitPoints = readNumber(metadata, "hitPoints") ?? AURORA_CREATURE_DEFAULT_HIT_POINTS;
  const maxHitPoints = readNumber(metadata, "maxHitPoints") ?? hitPoints;
  const currentHitPoints = readNumber(metadata, "currentHitPoints") ?? maxHitPoints;

  return {
    ...object,
    id: `cre_template_${normalizedTemplateId}`,
    name: creature.name,
    resRef: creature.resref,
    tag: tag.toUpperCase(),
    previewImageUrl: creature.previewImageUrl.trim() || undefined,
    source: {
      type: "aurora_git",
      sourceObjectId: creature.templateId,
      sourceKind: "creature",
      templateId: creature.templateId,
      ...(sourceEtag ? { sourceEtag } : {}),
      ...(sourceFileType ? { sourceFileType } : {}),
      ...(sourceFileVersion ? { sourceFileVersion } : {}),
      ...(sourceStructTypeId !== undefined ? { sourceStructTypeId } : {}),
      ...(sourceModelResRef ? { sourceModelResRef } : {}),
      appearanceType,
      ...(metadata ? { creatureMetadata: { ...metadata } } : {})
    },
    creatureProperties: {
      firstName,
      lastName,
      race: raceLabel ?? formatNumberLabel("Race", race),
      appearance: appearanceLabel ?? formatNumberLabel("Appearance", appearanceType, templateResRef),
      phenotype: phenotypeLabel ?? formatNumberLabel("Phenotype", phenotype),
      gender: genderLabel ?? formatNumberLabel("Gender", gender),
      description: readString(metadata, "description") ?? "",
      comments: readString(metadata, "comments") ?? "",
      challengeRating: readEffectiveNumber(metadata, "challengeRating", "challengeRatingEffective", 1),
      portraitResRef,
      conversation: readString(metadata, "conversation") ?? "",
      noInterrupt: !(readBoolean(metadata, "interruptable") ?? true),
      alignment,
      statistics: {
        abilityScores: {
          strength: readNumber(metadata, "strength") ?? AURORA_CREATURE_DEFAULT_ABILITY_SCORE,
          dexterity: readNumber(metadata, "dexterity") ?? AURORA_CREATURE_DEFAULT_ABILITY_SCORE,
          constitution:
            readNumber(metadata, "constitution") ?? AURORA_CREATURE_DEFAULT_ABILITY_SCORE,
          intelligence:
            readNumber(metadata, "intelligence") ?? AURORA_CREATURE_DEFAULT_ABILITY_SCORE,
          wisdom: readNumber(metadata, "wisdom") ?? AURORA_CREATURE_DEFAULT_ABILITY_SCORE,
          charisma: readNumber(metadata, "charisma") ?? AURORA_CREATURE_DEFAULT_ABILITY_SCORE
        },
        racialModifiers: {
          strength: readNumber(metadata, "strengthAdjust") ?? 0,
          dexterity: readNumber(metadata, "dexterityAdjust") ?? 0,
          constitution: readNumber(metadata, "constitutionAdjust") ?? 0,
          intelligence: readNumber(metadata, "intelligenceAdjust") ?? 0,
          wisdom: readNumber(metadata, "wisdomAdjust") ?? 0,
          charisma: readNumber(metadata, "charismaAdjust") ?? 0
        },
        saves: {
          fortitudeBase: 0,
          fortitudeBonus: readNumber(metadata, "fortitudeBonus") ?? 0,
          reflexBase: 0,
          reflexBonus: readNumber(metadata, "reflexBonus") ?? 0,
          willBase: 0,
          willBonus: readNumber(metadata, "willBonus") ?? 0
        },
        naturalArmorClass: readNumber(metadata, "naturalAc") ?? 0,
        baseArmorClass: 10,
        dexterityBonus: 0,
        sizeModifier: 0,
        baseHitPoints: hitPoints,
        hitPointBonuses: Math.max(0, maxHitPoints - hitPoints),
        currentHitPoints,
        maxHitPoints,
        movementRate: String(readNumber(metadata, "walkRateEffective") ?? readNumber(metadata, "walkRate") ?? "")
      },
      scriptSlots: buildScriptSlots(metadata),
      advancedSettings: {
        blueprintResRef: templateResRef,
        paletteId: readNumber(metadata, "paletteId"),
        disarmable: readBoolean(metadata, "disarmable") ?? true,
        plot: readBoolean(metadata, "plot") ?? false,
        playerCharacter: readBoolean(metadata, "isPc") ?? false,
        leavesLootableCorpse: readBoolean(metadata, "lootable") ?? false,
        noPermanentDeath: readBoolean(metadata, "noPermDeath") ?? false,
        immortal: readBoolean(metadata, "isImmortal") ?? false,
        bodyBag: readBoolean(metadata, "bodyBag") ?? false,
        startingPackage: readBoolean(metadata, "startingPackage") ?? false,
        treasureModel: "",
        corpseDecayTimeSeconds: readNumber(metadata, "decayTime") ?? 0,
        faction: formatNumberLabel("Faction", factionId),
        subrace: readString(metadata, "subrace") ?? "",
        deity: readString(metadata, "deity") ?? "",
        challengeRatingAdjustment: readNumber(metadata, "crAdjust") ?? 0,
        soundSet: soundSetLabel ?? formatNumberLabel("SoundSet", soundSetFile),
        ...(soundSetFile !== undefined ? { soundSetFile } : {}),
        perceptionRange: String(perceptionRange),
        ...(walkRateSource2daRow !== undefined ? { walkRateSource2daRow } : {}),
        ...(walkRateSource2daName ? { walkRateSource2daName } : {}),
        ...(walkRateSpeed2daRow !== undefined ? { walkRateSpeed2daRow } : {}),
        ...(walkRateAppearance2daSourceKey ? { walkRateAppearance2daSourceKey } : {}),
        ...(walkRateSpeed2daSourceKey ? { walkRateSpeed2daSourceKey } : {}),
        ...(animationState !== undefined ? { animationState } : {}),
        ...(animationName ? { animationName } : {})
      },
      ...(appearanceSettings ? { appearanceSettings } : {}),
      ...(appearanceProfile ? { appearanceProfile } : {}),
      ...(lookupProfile ? { lookupProfile } : {}),
      ...(listCounts ? { listCounts } : {}),
      ...(localizedStringRefs ? { localizedStringRefs } : {}),
      ...(localizedStrings ? { localizedStrings } : {}),
      ...(classEntries.length > 0 ? { classEntries } : {}),
      ...(templateEntries.length > 0 ? { templateEntries } : {}),
      ...(skills.length > 0 ? { skills } : {}),
      ...(feats.length > 0 ? { feats } : {}),
      ...(spells.length > 0 ? { spells } : {}),
      ...(specialAbilities.length > 0 ? { specialAbilities } : {}),
      ...(variables.length > 0 ? { variables } : {}),
      ...(inventoryItems.length > 0 ? { inventoryItems } : {}),
      ...(equippedItems.length > 0 ? { equippedItems } : {})
    }
  };
}
