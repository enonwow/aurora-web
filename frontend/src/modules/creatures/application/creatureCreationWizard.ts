import type {
  SceneObject,
  SceneObjectCreatureAbilityScores,
  SceneObjectCreatureAppearanceSettings,
  SceneObjectCreatureProperties,
  SceneObjectCreatureStatisticsSettings
} from "../../scene/contracts";
import type {
  CreatureApiBlueprintCreatePayload,
  CreatureApiBlueprintFields
} from "../contracts";
import { createNewSceneObject } from "../../scene/domain/sceneFactory";

export type CreatureCreationWizardStep = "template" | "identity" | "appearance" | "stats";

export type CreatureWizardBodyPartField =
  | "head"
  | "neck"
  | "torso"
  | "pelvis"
  | "rightBicep"
  | "leftBicep"
  | "rightForearm"
  | "leftForearm"
  | "rightHand"
  | "leftHand"
  | "rightThigh"
  | "leftThigh"
  | "rightShin"
  | "leftShin"
  | "rightFoot"
  | "leftFoot"
  | "wings"
  | "tail";

export type CreatureWizardColorField = "skin" | "hair" | "tattoo1" | "tattoo2";

export const CREATURE_CREATION_WIZARD_STEPS: Array<{
  id: CreatureCreationWizardStep;
  label: string;
}> = [
  { id: "template", label: "Template" },
  { id: "identity", label: "Identity" },
  { id: "appearance", label: "Appearance" },
  { id: "stats", label: "Stats" }
];

export const CREATURE_WIZARD_BODY_PART_FIELDS: Array<{
  id: CreatureWizardBodyPartField;
  label: string;
}> = [
  { id: "head", label: "Head" },
  { id: "neck", label: "Neck" },
  { id: "torso", label: "Torso" },
  { id: "pelvis", label: "Pelvis" },
  { id: "rightBicep", label: "R Bicep" },
  { id: "leftBicep", label: "L Bicep" },
  { id: "rightForearm", label: "R Forearm" },
  { id: "leftForearm", label: "L Forearm" },
  { id: "rightHand", label: "R Hand" },
  { id: "leftHand", label: "L Hand" },
  { id: "rightThigh", label: "R Thigh" },
  { id: "leftThigh", label: "L Thigh" },
  { id: "rightShin", label: "R Shin" },
  { id: "leftShin", label: "L Shin" },
  { id: "rightFoot", label: "R Foot" },
  { id: "leftFoot", label: "L Foot" },
  { id: "wings", label: "Wings" },
  { id: "tail", label: "Tail" }
];

export const CREATURE_WIZARD_COLOR_FIELDS: Array<{
  id: CreatureWizardColorField;
  label: string;
}> = [
  { id: "skin", label: "Skin" },
  { id: "hair", label: "Hair" },
  { id: "tattoo1", label: "Tattoo 1" },
  { id: "tattoo2", label: "Tattoo 2" }
];

export const CREATURE_WIZARD_DYNAMIC_APPEARANCE_OPTIONS: Array<{
  appearanceType: number;
  label: string;
  raceModel: string;
}> = [
  { appearanceType: 0, label: "(Dynamic) Dwarf", raceModel: "D" },
  { appearanceType: 1, label: "(Dynamic) Elf", raceModel: "E" },
  { appearanceType: 2, label: "(Dynamic) Gnome", raceModel: "G" },
  { appearanceType: 3, label: "(Dynamic) Halfling", raceModel: "A" },
  { appearanceType: 4, label: "(Dynamic) Half-Elf", raceModel: "H" },
  { appearanceType: 5, label: "(Dynamic) Half-Orc", raceModel: "O" },
  { appearanceType: 6, label: "(Dynamic) Human", raceModel: "H" }
];

const DEFAULT_ABILITY_SCORE = 10;
const DEFAULT_HIT_POINTS = 8;
const MAX_NWN_RESREF_LENGTH = 16;
const MAX_NWN_TAG_LENGTH = 32;

export interface CreatureCreationWizardDraft {
  baseObjectId: string;
  name: string;
  resRef: string;
  tag: string;
  firstName: string;
  lastName: string;
  race: string;
  appearance: string;
  phenotype: string;
  gender: string;
  description: string;
  alignment: string;
  challengeRating: number;
  hitPoints: number;
  movementRate: string;
  abilityScores: SceneObjectCreatureAbilityScores;
  bodyParts: Record<CreatureWizardBodyPartField, string>;
  colors: Record<CreatureWizardColorField, string>;
  plot: boolean;
  immortal: boolean;
  leavesLootableCorpse: boolean;
}

function trimText(value: string | undefined, fallback = ""): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function parseAppearanceType(value: string | undefined): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return Math.max(0, Math.trunc(parsed));
}

function normalizeWizardAppearanceValue(
  value: string | undefined,
  sourceAppearanceType: number | undefined
): string {
  if (typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)) {
    return String(Math.max(0, Math.trunc(sourceAppearanceType)));
  }
  const trimmed = trimText(value, "6");
  const directOption = CREATURE_WIZARD_DYNAMIC_APPEARANCE_OPTIONS.find(
    (option) => option.label.toLowerCase() === trimmed.toLowerCase()
  );
  if (directOption) {
    return String(directOption.appearanceType);
  }
  const looseOption = CREATURE_WIZARD_DYNAMIC_APPEARANCE_OPTIONS.find((option) => {
    const raceLabel = option.label.replace(/^\(Dynamic\)\s*/i, "");
    return raceLabel.toLowerCase() === trimmed.toLowerCase();
  });
  return looseOption ? String(looseOption.appearanceType) : trimmed;
}

function sanitizeResRef(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_NWN_RESREF_LENGTH);
  return normalized.length > 0 ? normalized : fallback.slice(0, MAX_NWN_RESREF_LENGTH);
}

function sanitizeTag(value: string, fallback: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, MAX_NWN_TAG_LENGTH);
  return normalized.length > 0 ? normalized : fallback.slice(0, MAX_NWN_TAG_LENGTH);
}

function buildWizardResRef(base: SceneObject | undefined, sequence: number): string {
  const suffix = String(Math.max(1, sequence)).padStart(3, "0");
  const baseStem = sanitizeResRef(base?.resRef ?? base?.tag ?? "creature", "creature");
  return sanitizeResRef(`${baseStem.slice(0, 12)}_${suffix}`, `cre_${suffix}`);
}

function readBodyPart(
  appearanceSettings: SceneObjectCreatureAppearanceSettings | undefined,
  field: CreatureWizardBodyPartField,
  fallback: string
): string {
  const value = appearanceSettings?.[field];
  return trimText(value, fallback);
}

function buildBodyParts(
  appearanceSettings: SceneObjectCreatureAppearanceSettings | undefined
): Record<CreatureWizardBodyPartField, string> {
  return {
    head: readBodyPart(appearanceSettings, "head", "1"),
    neck: readBodyPart(appearanceSettings, "neck", "1"),
    torso: readBodyPart(appearanceSettings, "torso", "1"),
    pelvis: readBodyPart(appearanceSettings, "pelvis", "1"),
    rightBicep: readBodyPart(appearanceSettings, "rightBicep", "1"),
    leftBicep: readBodyPart(appearanceSettings, "leftBicep", "1"),
    rightForearm: readBodyPart(appearanceSettings, "rightForearm", "1"),
    leftForearm: readBodyPart(appearanceSettings, "leftForearm", "1"),
    rightHand: readBodyPart(appearanceSettings, "rightHand", "1"),
    leftHand: readBodyPart(appearanceSettings, "leftHand", "1"),
    rightThigh: readBodyPart(appearanceSettings, "rightThigh", "1"),
    leftThigh: readBodyPart(appearanceSettings, "leftThigh", "1"),
    rightShin: readBodyPart(appearanceSettings, "rightShin", "1"),
    leftShin: readBodyPart(appearanceSettings, "leftShin", "1"),
    rightFoot: readBodyPart(appearanceSettings, "rightFoot", "1"),
    leftFoot: readBodyPart(appearanceSettings, "leftFoot", "1"),
    wings: readBodyPart(appearanceSettings, "wings", "0"),
    tail: readBodyPart(appearanceSettings, "tail", "0")
  };
}

function buildColors(
  appearanceSettings: SceneObjectCreatureAppearanceSettings | undefined
): Record<CreatureWizardColorField, string> {
  return {
    skin: trimText(appearanceSettings?.colors?.skin, "1"),
    hair: trimText(appearanceSettings?.colors?.hair, "1"),
    tattoo1: trimText(appearanceSettings?.colors?.tattoo1, "0"),
    tattoo2: trimText(appearanceSettings?.colors?.tattoo2, "0")
  };
}

function buildAbilityScores(
  statistics: SceneObjectCreatureStatisticsSettings | undefined
): SceneObjectCreatureAbilityScores {
  return {
    strength: statistics?.abilityScores.strength ?? DEFAULT_ABILITY_SCORE,
    dexterity: statistics?.abilityScores.dexterity ?? DEFAULT_ABILITY_SCORE,
    constitution: statistics?.abilityScores.constitution ?? DEFAULT_ABILITY_SCORE,
    intelligence: statistics?.abilityScores.intelligence ?? DEFAULT_ABILITY_SCORE,
    wisdom: statistics?.abilityScores.wisdom ?? DEFAULT_ABILITY_SCORE,
    charisma: statistics?.abilityScores.charisma ?? DEFAULT_ABILITY_SCORE
  };
}

function buildStatisticsFromDraft(
  draft: CreatureCreationWizardDraft,
  baseStatistics: SceneObjectCreatureStatisticsSettings | undefined
): SceneObjectCreatureStatisticsSettings {
  return {
    abilityScores: draft.abilityScores,
    racialModifiers: baseStatistics?.racialModifiers ?? {
      strength: 0,
      dexterity: 0,
      constitution: 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0
    },
    saves: baseStatistics?.saves ?? {
      fortitudeBase: 0,
      fortitudeBonus: 0,
      reflexBase: 0,
      reflexBonus: 0,
      willBase: 0,
      willBonus: 0
    },
    naturalArmorClass: baseStatistics?.naturalArmorClass ?? 0,
    baseArmorClass: baseStatistics?.baseArmorClass ?? 10,
    dexterityBonus: baseStatistics?.dexterityBonus ?? 0,
    sizeModifier: baseStatistics?.sizeModifier ?? 0,
    baseHitPoints: draft.hitPoints,
    hitPointBonuses: Math.max(0, (baseStatistics?.hitPointBonuses ?? 0)),
    currentHitPoints: draft.hitPoints,
    maxHitPoints: draft.hitPoints,
    movementRate: draft.movementRate
  };
}

function buildAppearanceSettingsFromDraft(
  draft: CreatureCreationWizardDraft,
  baseAppearance: SceneObjectCreatureAppearanceSettings | undefined
): SceneObjectCreatureAppearanceSettings {
  return {
    ...(baseAppearance ?? {}),
    partBasedAppearance: true,
    ...draft.bodyParts,
    colors: draft.colors
  };
}

function resolveInheritedSourceTemplateId(base: SceneObject): string {
  const sourceTemplateId = base.source?.type === "aurora_git" ? base.source.templateId?.trim() : "";
  const sourceObjectId =
    base.source?.type === "aurora_git" ? base.source.sourceObjectId?.trim() : "";
  if (sourceTemplateId) {
    return sourceTemplateId;
  }
  if (sourceObjectId) {
    return sourceObjectId;
  }
  return `cre_${sanitizeResRef(base.resRef, base.id)}`;
}

export function createCreatureWizardDraft(
  base: SceneObject | undefined,
  sequence = 1
): CreatureCreationWizardDraft {
  const baseCreature = base?.creatureProperties;
  const baseResRef = buildWizardResRef(base, sequence);
  const displayName = trimText(baseCreature?.firstName, base?.name ?? base?.tag ?? "Creature");

  return {
    baseObjectId: base?.id ?? "",
    name: displayName,
    resRef: baseResRef,
    tag: sanitizeTag(base?.tag ? `${base.tag}_${sequence}` : baseResRef, baseResRef.toUpperCase()),
    firstName: displayName,
    lastName: trimText(baseCreature?.lastName),
    race: trimText(baseCreature?.race, "Human"),
    appearance: normalizeWizardAppearanceValue(
      baseCreature?.appearance,
      base?.source?.type === "aurora_git" ? base.source.appearanceType : undefined
    ),
    phenotype: trimText(baseCreature?.phenotype, "Normal"),
    gender: trimText(baseCreature?.gender, "Unknown"),
    description: trimText(baseCreature?.description),
    alignment: trimText(baseCreature?.alignment, "Neutral"),
    challengeRating: baseCreature?.challengeRating ?? 1,
    hitPoints: baseCreature?.statistics?.maxHitPoints ?? DEFAULT_HIT_POINTS,
    movementRate: trimText(baseCreature?.statistics?.movementRate, "0"),
    abilityScores: buildAbilityScores(baseCreature?.statistics),
    bodyParts: buildBodyParts(baseCreature?.appearanceSettings),
    colors: buildColors(baseCreature?.appearanceSettings),
    plot: baseCreature?.advancedSettings?.plot ?? false,
    immortal: baseCreature?.advancedSettings?.immortal ?? false,
    leavesLootableCorpse: baseCreature?.advancedSettings?.leavesLootableCorpse ?? false
  };
}

export function createCreatureSceneObjectFromWizardDraft(
  draft: CreatureCreationWizardDraft,
  base: SceneObject,
  sequence = 1
): SceneObject {
  const resRef = sanitizeResRef(draft.resRef, buildWizardResRef(base, sequence));
  const tag = sanitizeTag(draft.tag, resRef.toUpperCase());
  const object = createNewSceneObject("creatures", 0.5, 0.5, sequence);
  const baseCreature: SceneObjectCreatureProperties | undefined = base.creatureProperties;
  const inheritedTemplateId = resolveInheritedSourceTemplateId(base);
  const draftAppearanceType = parseAppearanceType(draft.appearance);
  const sourceObjectId =
    base.source?.type === "aurora_git" && base.source.sourceObjectId?.trim()
      ? base.source.sourceObjectId.trim()
      : inheritedTemplateId;
  const firstName = trimText(draft.firstName, draft.name || tag);
  const lastName = trimText(draft.lastName);
  const name = trimText(draft.name, [firstName, lastName].filter(Boolean).join(" ") || tag);
  const id = `cre_wizard_${sanitizeResRef(`${resRef}_${sequence}`, `cre_${sequence}`)}`;

  return {
    ...object,
    id,
    name,
    resRef,
    tag,
    previewImageUrl: base.previewImageUrl,
    source: {
      ...(base.source ?? {}),
      type: "aurora_git",
      sourceKind: "creature",
      sourceObjectId,
      templateId: inheritedTemplateId,
      localizedName: name,
      description: draft.description,
      appearanceType: draftAppearanceType ?? base.source?.appearanceType
    },
    creatureProperties: {
      ...(baseCreature ?? {}),
      firstName,
      lastName,
      race: trimText(draft.race, baseCreature?.race ?? ""),
      appearance: trimText(draft.appearance, baseCreature?.appearance ?? ""),
      phenotype: trimText(draft.phenotype, baseCreature?.phenotype ?? ""),
      gender: trimText(draft.gender, baseCreature?.gender ?? ""),
      description: draft.description,
      challengeRating: draft.challengeRating,
      portraitResRef: baseCreature?.portraitResRef ?? "",
      conversation: baseCreature?.conversation ?? "",
      noInterrupt: baseCreature?.noInterrupt ?? false,
      alignment: trimText(draft.alignment, baseCreature?.alignment ?? ""),
      statistics: buildStatisticsFromDraft(draft, baseCreature?.statistics),
      appearanceSettings: buildAppearanceSettingsFromDraft(
        draft,
        baseCreature?.appearanceSettings
      ),
      scriptSlots: baseCreature?.scriptSlots,
      appearanceProfile: baseCreature?.appearanceProfile,
      lookupProfile: baseCreature?.lookupProfile,
      listCounts: baseCreature?.listCounts,
      localizedStringRefs: baseCreature?.localizedStringRefs,
      localizedStrings: baseCreature?.localizedStrings,
      classEntries: baseCreature?.classEntries,
      templateEntries: baseCreature?.templateEntries,
      skills: baseCreature?.skills,
      feats: baseCreature?.feats,
      spells: baseCreature?.spells,
      specialAbilities: baseCreature?.specialAbilities,
      inventoryItems: baseCreature?.inventoryItems,
      equippedItems: baseCreature?.equippedItems,
      advancedSettings: {
        ...(baseCreature?.advancedSettings ?? {
          disarmable: true,
          leavesLootableCorpse: false,
          noPermanentDeath: false,
          plot: false,
          immortal: false,
          treasureModel: "",
          corpseDecayTimeSeconds: 0,
          faction: "",
          subrace: "",
          deity: "",
          challengeRatingAdjustment: 0,
          soundSet: "",
          perceptionRange: ""
        }),
        blueprintResRef: resRef,
        plot: draft.plot,
        immortal: draft.immortal,
        leavesLootableCorpse: draft.leavesLootableCorpse
      }
    }
  };
}

const CREATURE_BLUEPRINT_JSON_FIELDS = new Set([
  "classListEntries",
  "featListEntries",
  "templateListEntries",
  "specAbilityListEntries",
  "skillListEntries",
  "variableListEntries",
  "inventoryItemListEntries",
  "equipItemListEntries"
]);

const CREATURE_SCRIPT_SLOT_TO_GFF_LABEL: Record<string, string> = {
  onBlocked: "scriptonblocked",
  onCombatRoundEnd: "scriptendround",
  onConversation: "scriptdialogue",
  onDamaged: "scriptdamaged",
  onDeath: "scriptdeath",
  onDisturbed: "scriptdisturbed",
  onHeartbeat: "scriptheartbeat",
  onPerception: "scriptonnotice",
  onPhysicalAttacked: "scriptattacked",
  onRested: "scriptrested",
  onSpawn: "scriptspawn",
  onSpellCastAt: "scriptspellat",
  onUserDefined: "scriptuserdefine"
};

function readFiniteInteger(value: string | number | undefined): number | undefined {
  const parsed = typeof value === "number" ? value : Number(value?.trim());
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined;
}

function isAuroraResRef(value: string): boolean {
  return /^[A-Za-z0-9_]{1,16}$/u.test(value.trim());
}

function copySourceCreatureBlueprintFields(source: SceneObject): CreatureApiBlueprintFields {
  const metadata = source.source?.type === "aurora_git" ? source.source.creatureMetadata : undefined;
  if (!metadata) {
    return {};
  }

  const fields: CreatureApiBlueprintFields = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (CREATURE_BLUEPRINT_JSON_FIELDS.has(key) && typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          fields[key] = parsed;
        }
      } catch {
        // Keep the source value absent rather than inventing a malformed list.
      }
      continue;
    }
    if (!key.startsWith("source") && !key.startsWith("createdBy")) {
      fields[key] = value;
    }
  }

  const scripts = Object.entries(metadata)
    .filter(([key, value]) => key.startsWith("script.") && typeof value === "string")
    .reduce<Record<string, string>>((result, [key, value]) => {
      result[key.slice("script.".length)] = value as string;
      return result;
    }, {});
  if (Object.keys(scripts).length > 0) {
    fields.scripts = scripts;
  }
  return fields;
}

function mapCreatureInventoryEntries(
  entries: SceneObjectCreatureProperties["inventoryItems"]
): Array<Record<string, unknown>> | undefined {
  return entries?.map((entry) => ({
    ...(entry.resRef ? { resRef: entry.resRef } : {}),
    ...(entry.randomResRef ? { randomResRef: entry.randomResRef } : {}),
    ...(entry.randomList ? { randomList: entry.randomList } : {}),
    ...(entry.embeddedItem ? { embeddedItem: entry.embeddedItem } : {}),
    ...(entry.x !== undefined ? { x: entry.x } : {}),
    ...(entry.y !== undefined ? { y: entry.y } : {}),
    ...(entry.dropable !== undefined ? { dropable: entry.dropable } : {}),
    ...(entry.pickpocketable !== undefined ? { pickpocketable: entry.pickpocketable } : {}),
    ...(entry.infinite !== undefined ? { infinite: entry.infinite } : {})
  }));
}

function mapCreatureEquippedEntries(
  entries: SceneObjectCreatureProperties["equippedItems"]
): Array<Record<string, unknown>> | undefined {
  return entries?.map((entry) => ({
    ...(entry.resRef ? { resRef: entry.resRef } : {}),
    ...(entry.randomResRef ? { randomResRef: entry.randomResRef } : {}),
    ...(entry.randomList ? { randomList: entry.randomList } : {}),
    ...(entry.embeddedItem ? { embeddedItem: entry.embeddedItem } : {}),
    ...(entry.slotMask !== undefined ? { slotMask: entry.slotMask } : {}),
    ...(entry.dropable !== undefined ? { dropable: entry.dropable } : {}),
    ...(entry.pickpocketable !== undefined ? { pickpocketable: entry.pickpocketable } : {}),
    ...(entry.infinite !== undefined ? { infinite: entry.infinite } : {})
  }));
}

function toAuroraListId(value: unknown, maximum = 65535): number | undefined {
  const parsed = typeof value === "number" ? value : undefined;
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : undefined;
}

function toAuroraSpellEntry(entry: {
  spellId?: number;
  spellLevel: number;
  metaMagic?: number;
  flags?: number;
}): Record<string, number> | undefined {
  const spellId = toAuroraListId(entry.spellId);
  if (spellId === undefined) {
    return undefined;
  }
  const spellLevel = Math.max(0, Math.min(13, Math.trunc(entry.spellLevel)));
  const metaMagic = toAuroraListId(entry.metaMagic, 255);
  const flags = toAuroraListId(entry.flags, 255);
  return {
    spellId,
    spellLevel,
    ...(metaMagic !== undefined ? { metaMagic } : {}),
    ...(flags !== undefined ? { flags } : {})
  };
}

export function buildCreatureBlueprintCreatePayloadFromSceneObject(
  source: SceneObject
): CreatureApiBlueprintCreatePayload | null {
  if (source.kind !== "creatures" || !source.creatureProperties) {
    return null;
  }

  const creature = source.creatureProperties;
  const appearance = creature.appearanceSettings;
  const statistics = creature.statistics;
  const advanced = creature.advancedSettings;
  const sourceAppearanceId =
    source.source?.type === "aurora_git" ? source.source.appearanceType : undefined;
  const appearanceId = readFiniteInteger(creature.appearance) ?? sourceAppearanceId;
  const fields: CreatureApiBlueprintFields = {
    ...copySourceCreatureBlueprintFields(source),
    firstName: trimText(creature.firstName, source.name),
    lastName: trimText(creature.lastName),
    description: creature.description,
    tag: source.tag,
    ...(appearanceId !== undefined ? { appearanceId } : {}),
    ...(statistics
      ? {
          strength: statistics.abilityScores.strength,
          dexterity: statistics.abilityScores.dexterity,
          constitution: statistics.abilityScores.constitution,
          intelligence: statistics.abilityScores.intelligence,
          wisdom: statistics.abilityScores.wisdom,
          charisma: statistics.abilityScores.charisma,
          strengthAdjust: statistics.racialModifiers.strength,
          dexterityAdjust: statistics.racialModifiers.dexterity,
          constitutionAdjust: statistics.racialModifiers.constitution,
          intelligenceAdjust: statistics.racialModifiers.intelligence,
          wisdomAdjust: statistics.racialModifiers.wisdom,
          charismaAdjust: statistics.racialModifiers.charisma,
          naturalAc: statistics.naturalArmorClass,
          hitPoints: statistics.baseHitPoints,
          currentHitPoints: statistics.currentHitPoints,
          maxHitPoints: statistics.maxHitPoints,
          reflexBonus: statistics.saves.reflexBonus,
          willBonus: statistics.saves.willBonus,
          fortitudeBonus: statistics.saves.fortitudeBonus,
          ...(readFiniteInteger(statistics.movementRate) !== undefined
            ? { walkRate: readFiniteInteger(statistics.movementRate) }
            : {})
        }
      : {}),
    ...(appearance
      ? {
          appearanceHead: readFiniteInteger(appearance.head),
          bodyPartNeck: readFiniteInteger(appearance.neck),
          bodyPartTorso: readFiniteInteger(appearance.torso),
          bodyPartPelvis: readFiniteInteger(appearance.pelvis),
          bodyPartRBicep: readFiniteInteger(appearance.rightBicep),
          bodyPartLBicep: readFiniteInteger(appearance.leftBicep),
          bodyPartRFArm: readFiniteInteger(appearance.rightForearm),
          bodyPartLFArm: readFiniteInteger(appearance.leftForearm),
          bodyPartRHand: readFiniteInteger(appearance.rightHand),
          bodyPartLHand: readFiniteInteger(appearance.leftHand),
          bodyPartRThigh: readFiniteInteger(appearance.rightThigh),
          bodyPartLThigh: readFiniteInteger(appearance.leftThigh),
          bodyPartRShin: readFiniteInteger(appearance.rightShin),
          bodyPartLShin: readFiniteInteger(appearance.leftShin),
          bodyPartRFoot: readFiniteInteger(appearance.rightFoot),
          bodyPartLFoot: readFiniteInteger(appearance.leftFoot),
          wingsNew: readFiniteInteger(appearance.wings),
          tailNew: readFiniteInteger(appearance.tail),
          colorSkin: readFiniteInteger(appearance.colors?.skin),
          colorHair: readFiniteInteger(appearance.colors?.hair),
          colorTattoo1: readFiniteInteger(appearance.colors?.tattoo1),
          colorTattoo2: readFiniteInteger(appearance.colors?.tattoo2),
          bodyPartBelt: readFiniteInteger(appearance.sourceOnlyParts?.belt),
          bodyPartRobe: readFiniteInteger(appearance.sourceOnlyParts?.robe),
          bodyPartRShoul: readFiniteInteger(appearance.sourceOnlyParts?.rightShoulder),
          bodyPartLShoul: readFiniteInteger(appearance.sourceOnlyParts?.leftShoulder)
        }
      : {}),
    ...(advanced
      ? {
          paletteId: advanced.paletteId,
          disarmable: advanced.disarmable,
          plot: advanced.plot,
          isPc: advanced.playerCharacter,
          lootable: advanced.leavesLootableCorpse,
          noPermDeath: advanced.noPermanentDeath,
          isImmortal: advanced.immortal,
          bodyBag: advanced.bodyBag,
          startingPackage: advanced.startingPackage,
          decayTime: advanced.corpseDecayTimeSeconds,
          crAdjust: advanced.challengeRatingAdjustment,
          soundSetFile: advanced.soundSetFile,
          perceptionRange: readFiniteInteger(advanced.perceptionRange),
          animationState: advanced.animationState,
          subrace: advanced.subrace,
          deity: advanced.deity
        }
      : {}),
    interruptable: !creature.noInterrupt,
    challengeRating: creature.challengeRating,
    ...(creature.comments ? { comments: creature.comments } : {}),
    ...(mapCreatureInventoryEntries(creature.inventoryItems)
      ? { inventoryItemListEntries: mapCreatureInventoryEntries(creature.inventoryItems) }
      : {}),
    ...(mapCreatureEquippedEntries(creature.equippedItems)
      ? { equipItemListEntries: mapCreatureEquippedEntries(creature.equippedItems) }
      : {})
  };

  const portraitResRef = creature.portraitResRef.trim();
  if (isAuroraResRef(portraitResRef)) {
    fields.portraitResRef = portraitResRef;
  }
  const conversation = creature.conversation.trim();
  if (isAuroraResRef(conversation)) {
    fields.conversation = conversation;
  }

  if (creature.templateEntries) {
    fields.templateListEntries = creature.templateEntries.map((entry) => ({ ...entry }));
  }
  if (creature.skills) {
    fields.skillListEntries = creature.skills.map((entry) => ({
      rank: Math.max(0, Math.trunc(entry.rank))
    }));
  }
  if (creature.variables) {
    fields.variableListEntries = creature.variables.map((entry) => ({ ...entry }));
  }
  const sourceClassEntries = Array.isArray(fields.classListEntries)
    ? fields.classListEntries
    : [];
  const sourceClassRecords = sourceClassEntries.map((entry) =>
    entry && typeof entry === "object" ? (entry as Record<string, unknown>) : {}
  );
  const shouldReplaceSpellLists =
    creature.spells !== undefined &&
    (creature.spells.length > 0 ||
      sourceClassRecords.some(
        (entry) => Array.isArray(entry.knownSpells) || Array.isArray(entry.memorizedSpells)
      ));
  if (creature.classEntries && (sourceClassEntries.length > 0 || creature.classEntries.length > 0)) {
    fields.classListEntries = creature.classEntries
      .map((entry, index) => {
        const previous = sourceClassRecords[index] ?? {};
        const classId = toAuroraListId(entry.classId, 255) ?? toAuroraListId(previous.classId, 255);
        if (classId === undefined) {
          return null;
        }
        const nextEntry: Record<string, unknown> = {
          ...previous,
          classId,
          level: Math.max(1, Math.min(255, Math.trunc(entry.level)))
        };
        if (shouldReplaceSpellLists) {
          const mapClassSpells = (prepared: boolean) =>
            creature.spells
              .filter((spell) => spell.classIndex === index && spell.prepared === prepared)
              .map(toAuroraSpellEntry)
              .filter((spell): spell is Record<string, number> => spell !== undefined);
          nextEntry.knownSpells = mapClassSpells(false);
          nextEntry.memorizedSpells = mapClassSpells(true);
        }
        return nextEntry;
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null);
  }
  if (creature.feats !== undefined) {
    fields.featListEntries = creature.feats
      .filter((entry) => entry.assigned)
      .map((entry) => toAuroraListId(entry.featId))
      .filter((featId): featId is number => featId !== undefined)
      .map((featId) => ({ featId }));
  }
  if (creature.specialAbilities !== undefined) {
    fields.specAbilityListEntries = creature.specialAbilities
      .map((entry) => {
        const spellId = toAuroraListId(entry.spellId);
        if (spellId === undefined) {
          return null;
        }
        const flags = toAuroraListId(entry.flags, 255);
        return {
          spellId,
          ...(flags !== undefined ? { flags } : {}),
          casterLevel: Math.max(0, Math.min(15, Math.trunc(entry.casterLevel)))
        };
      })
      .filter(
        (
          entry
        ): entry is { spellId: number; flags?: number; casterLevel: number } => entry !== null
      );
  }

  const scripts = Object.entries(creature.scriptSlots ?? {}).reduce<Record<string, string>>(
    (result, [slot, value]) => {
      const label = CREATURE_SCRIPT_SLOT_TO_GFF_LABEL[slot];
      const normalized = value.trim();
      if (label && normalized) {
        result[label] = normalized;
      }
      return result;
    },
    {}
  );
  if (Object.keys(scripts).length > 0) {
    fields.scripts = scripts;
  }

  return {
    templateResRef: source.resRef,
    name: source.name,
    blueprint: fields,
    overwrite: true
  };
}
