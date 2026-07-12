import type {
  AreaScene,
  SceneObject,
  SceneObjectCreatureProperties,
  SceneObjectItemProperties,
  SceneObjectKind,
  SceneObjectPlaceableProperties,
  SceneTile,
  TerrainBrushKind
} from "../../scene/contracts";
import { normalizeSceneObjectMetadata } from "../../scene/domain/sceneFactory";
import { mapCreatureApiListItemToSceneObject } from "../../creatures/application/creatureSceneObjectMapper";
import type {
  AreaApiCreatureMetadataPrimitive,
  AreaApiDetail,
  AreaApiObjectKind,
  AreaApiTileInstance
} from "../contracts";

const AURORA_TILE_TERRAIN_SEQUENCE: TerrainBrushKind[] = [
  "corridor",
  "doorway",
  "inn",
  "kitchen",
  "livingroom",
  "shop",
  "wall"
];

const BACKEND_KIND_TO_SCENE_KIND: Record<AreaApiObjectKind, SceneObjectKind> = {
  placeable: "placeables",
  door: "doors",
  creature: "creatures",
  encounter: "encounters",
  item: "items",
  sound: "sounds",
  store: "stores",
  trigger: "triggers",
  waypoint: "waypoints"
};

const RADIANS_PER_DEGREE = Math.PI / 180;
type AreaCreatureMetadata = Record<string, AreaApiCreatureMetadataPrimitive>;
type AreaItemMetadata = Record<string, AreaApiCreatureMetadataPrimitive>;

const CREATURE_LOOKUP_PROFILE_METADATA_KEYS = [
  "raceLabelSource2daRow",
  "raceLabelSourceKey",
  "genderLabelSource2daRow",
  "genderLabelSourceKey",
  "portraitResolvedSource2daRow",
  "portraitResolvedSourceKey",
  "soundSetResRef",
  "soundSetSource2daRow",
  "soundSetSourceKey"
] as const;

const CREATURE_LIST_COUNT_METADATA_KEYS = [
  "classListCount",
  "skillListCount",
  "featListCount",
  "templateListCount",
  "specAbilityListCount",
  "inventoryItemListCount",
  "equipItemListCount"
] as const;

const CREATURE_LOCALIZED_STRING_REF_METADATA_KEYS = [
  "firstNameStrRef",
  "lastNameStrRef",
  "localizedNameStrRef",
  "descriptionStrRef",
  "identifiedDescriptionStrRef",
  "subraceStrRef",
  "deityStrRef"
] as const;

const CREATURE_LOCALIZED_STRING_METADATA_KEYS = [
  "localizedName",
  "displayName",
  "identifiedDescription"
] as const;

export interface AreaSceneMapperOptions {
  creatureTemplateObjects?: readonly SceneObject[];
  objectTemplateObjects?: readonly SceneObject[];
}

const AREA_OBJECT_TEMPLATE_KINDS = new Set<SceneObjectKind>([
  "placeables",
  "doors",
  "items"
]);

const DEFAULT_VISUAL_TRANSFORM: SceneObject["visualTransform"] = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  pitch: 0,
  roll: 0,
  yaw: 0
};

function hasNonDefaultVisualTransform(transform: SceneObject["visualTransform"]): boolean {
  const scaleX = transform.scaleX ?? transform.scale;
  const scaleY = transform.scaleY ?? transform.scale;
  const scaleZ = transform.scaleZ ?? transform.scale;
  return (
    Math.abs(scaleX - 1) > 1e-6 ||
    Math.abs(scaleY - 1) > 1e-6 ||
    Math.abs(scaleZ - 1) > 1e-6 ||
    Math.abs(transform.offsetX) > 1e-6 ||
    Math.abs(transform.offsetY) > 1e-6 ||
    Math.abs(transform.offsetZ) > 1e-6 ||
    Math.abs(transform.pitch) > 1e-6 ||
    Math.abs(transform.roll) > 1e-6 ||
    Math.abs(transform.yaw) > 1e-6
  );
}

function resolveAreaPlaceableStaticFlag(
  entry: AreaApiDetail["objects"][number],
  templateObject: SceneObject | undefined,
  visualTransform: SceneObject["visualTransform"]
): boolean {
  if (hasNonDefaultVisualTransform(visualTransform)) {
    return false;
  }
  return entry.isStatic ?? templateObject?.isStatic ?? true;
}

function toSceneBearingRadians(bearingDegrees: number): number {
  if (!Number.isFinite(bearingDegrees)) {
    return 0;
  }
  return (((bearingDegrees % 360) + 360) % 360) * RADIANS_PER_DEGREE;
}

function toSceneObject(
  areaId: string,
  entry: AreaApiDetail["objects"][number],
  creatureTemplateLookup: ReadonlyMap<string, SceneObject>,
  objectTemplateLookup: ReadonlyMap<string, SceneObject>
): SceneObject {
  const sceneKind = BACKEND_KIND_TO_SCENE_KIND[entry.kind];
  const sourceResRef = entry.resRef?.trim() || entry.templateId;
  const templateObject = resolveAreaObjectTemplateObject(
    entry,
    sceneKind,
    sourceResRef,
    objectTemplateLookup
  );
  const templateCreature =
    sceneKind === "creatures"
      ? resolveCreatureTemplateObject(entry, sourceResRef, creatureTemplateLookup)
      : undefined;
  const mappedCreature =
    sceneKind === "creatures" && entry.creatureMetadata
      ? mapCreatureApiListItemToSceneObject(
          {
            templateId: entry.templateId,
            resref: sourceResRef,
            name:
              typeof entry.creatureMetadata.firstName === "string" &&
              entry.creatureMetadata.firstName.trim().length > 0
                ? entry.creatureMetadata.firstName.trim()
                : entry.templateId,
            category: "area-git",
            tags: ["area-git"],
            previewImageUrl: "",
            metadata: {
              ...entry.creatureMetadata,
              templateResRef:
                typeof entry.creatureMetadata.templateResRef === "string"
                  ? entry.creatureMetadata.templateResRef
                  : sourceResRef
            }
          },
          1
        )
      : undefined;
  const creatureProperties = mergeAreaCreatureProperties(
    templateCreature?.creatureProperties,
    mappedCreature?.creatureProperties,
    entry.creatureMetadata
  );
  const itemProperties = mergeAreaItemProperties(
    templateObject?.itemProperties,
    entry.itemMetadata
  );
  const hasGitFirstName = hasMetadataKey(entry.creatureMetadata, "firstName");
  const visualTransform = cloneVisualTransform(entry.visualTransform);
  return normalizeSceneObjectMetadata({
    id: `${areaId}:${entry.objectId}`,
    kind: sceneKind,
    name:
      sceneKind === "creatures"
        ? hasGitFirstName
          ? mappedCreature?.name ?? templateCreature?.name ?? entry.templateId
          : templateCreature?.name ?? mappedCreature?.name ?? entry.templateId
        : templateObject?.name ?? entry.localizedName ?? entry.templateId,
    resRef: sourceResRef,
    tag:
      entry.tag?.trim() ||
      mappedCreature?.tag ||
      templateCreature?.tag ||
      templateObject?.tag ||
      entry.templateId.toUpperCase(),
    isStatic:
      sceneKind === "placeables"
        ? resolveAreaPlaceableStaticFlag(entry, templateObject, visualTransform)
        : false,
    x: entry.x,
    y: entry.y,
    z: entry.z,
    bearing: toSceneBearingRadians(entry.bearing),
    source: {
      type: "aurora_git",
      areaId,
      sourceObjectId: entry.objectId,
      sourceKind: entry.kind,
      templateId: entry.templateId,
      ...(entry.appearanceType !== undefined ? { appearanceType: entry.appearanceType } : {}),
      ...(entry.genericType !== undefined ? { genericType: entry.genericType } : {}),
      ...(entry.localizedName ? { localizedName: entry.localizedName } : {}),
      ...(entry.description ? { description: entry.description } : {}),
      ...(sceneKind === "creatures" && entry.creatureMetadata
        ? { creatureMetadata: { ...entry.creatureMetadata } }
        : {})
    },
    ...(sceneKind === "sounds" && entry.soundPositioning
      ? {
          soundPositioning: entry.soundPositioning
        }
      : {}),
    ...(sceneKind === "doors" && entry.doorTransition
      ? {
          doorTransition: {
            ...entry.doorTransition,
            flags: { ...entry.doorTransition.flags },
            ...(entry.doorTransition.extra
              ? { extra: { ...entry.doorTransition.extra } }
              : {})
          }
        }
      : {}),
    ...(creatureProperties
      ? {
          creatureProperties
        }
      : {}),
    ...(sceneKind === "placeables" && templateObject?.placeableProperties
      ? {
          placeableProperties: clonePlaceableProperties(templateObject.placeableProperties)
        }
      : {}),
    ...(sceneKind === "items" && itemProperties
      ? {
          itemProperties
        }
      : {}),
    visualTransform
  });
}

function cloneVisualTransform(
  transform: SceneObject["visualTransform"] | undefined
): SceneObject["visualTransform"] {
  return transform ? { ...transform } : { ...DEFAULT_VISUAL_TRANSFORM };
}

function buildCreatureTemplateLookup(
  objects: readonly SceneObject[] | undefined
): ReadonlyMap<string, SceneObject> {
  const lookup = new Map<string, SceneObject>();
  for (const object of objects ?? []) {
    if (object.kind !== "creatures" || !object.creatureProperties) {
      continue;
    }
    addCreatureTemplateLookupKey(lookup, object.resRef, object);
    addCreatureTemplateLookupKey(lookup, object.source?.templateId, object);
    addCreatureTemplateLookupKey(lookup, object.id.replace(/^cre_template_/u, ""), object);
  }
  return lookup;
}

function buildAreaObjectTemplateLookup(
  objects: readonly SceneObject[] | undefined
): ReadonlyMap<string, SceneObject> {
  const lookup = new Map<string, SceneObject>();
  for (const object of objects ?? []) {
    if (!AREA_OBJECT_TEMPLATE_KINDS.has(object.kind)) {
      continue;
    }
    addTemplateLookupKey(lookup, object.resRef, object);
    addTemplateLookupKey(lookup, object.source?.templateId, object);
    addTemplateLookupKey(lookup, object.id, object);
    addTemplateLookupKey(lookup, object.id.replace(/^preview:/u, ""), object);
  }
  return lookup;
}

function addCreatureTemplateLookupKey(
  lookup: Map<string, SceneObject>,
  value: string | undefined,
  object: SceneObject
): void {
  addTemplateLookupKey(lookup, value, object);
}

function addTemplateLookupKey(
  lookup: Map<string, SceneObject>,
  value: string | undefined,
  object: SceneObject
): void {
  const key = normalizeLookupKey(value);
  if (key && !lookup.has(key)) {
    lookup.set(key, object);
  }
}

function resolveAreaObjectTemplateObject(
  entry: AreaApiDetail["objects"][number],
  sceneKind: SceneObjectKind,
  sourceResRef: string,
  lookup: ReadonlyMap<string, SceneObject>
): SceneObject | undefined {
  if (!AREA_OBJECT_TEMPLATE_KINDS.has(sceneKind)) {
    return undefined;
  }
  return (
    lookup.get(normalizeLookupKey(sourceResRef)) ??
    lookup.get(normalizeLookupKey(entry.resRef)) ??
    lookup.get(normalizeLookupKey(entry.templateId))
  );
}

function resolveCreatureTemplateObject(
  entry: AreaApiDetail["objects"][number],
  sourceResRef: string,
  lookup: ReadonlyMap<string, SceneObject>
): SceneObject | undefined {
  const metadataTemplateResRef =
    typeof entry.creatureMetadata?.templateResRef === "string"
      ? entry.creatureMetadata.templateResRef
      : undefined;
  return (
    lookup.get(normalizeLookupKey(metadataTemplateResRef)) ??
    lookup.get(normalizeLookupKey(sourceResRef)) ??
    lookup.get(normalizeLookupKey(entry.templateId))
  );
}

function normalizeLookupKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function mergeAreaCreatureProperties(
  templateProperties: SceneObjectCreatureProperties | undefined,
  gitProperties: SceneObjectCreatureProperties | undefined,
  metadata: AreaCreatureMetadata | undefined
): SceneObjectCreatureProperties | undefined {
  if (!templateProperties) {
    return gitProperties ? cloneCreatureProperties(gitProperties) : undefined;
  }
  const merged = cloneCreatureProperties(templateProperties);
  if (!gitProperties || !metadata) {
    return merged;
  }

  if (hasMetadataKey(metadata, "firstName")) merged.firstName = gitProperties.firstName;
  if (hasMetadataKey(metadata, "lastName")) merged.lastName = gitProperties.lastName;
  if (hasAnyMetadataKey(metadata, ["race", "raceLabel"])) merged.race = gitProperties.race;
  if (hasAnyMetadataKey(metadata, ["appearanceId", "appearanceLabel"])) {
    merged.appearance = gitProperties.appearance;
  }
  if (hasAnyMetadataKey(metadata, ["phenotype", "phenotypeLabel"])) {
    merged.phenotype = gitProperties.phenotype;
  }
  if (hasMetadataKey(metadata, "gender")) merged.gender = gitProperties.gender;
  if (hasMetadataKey(metadata, "description")) merged.description = gitProperties.description;
  if (hasMetadataKey(metadata, "comments")) merged.comments = gitProperties.comments;
  if (hasAnyMetadataKey(metadata, ["challengeRating", "challengeRatingEffective"])) {
    merged.challengeRating = gitProperties.challengeRating;
  }
  if (hasAnyMetadataKey(metadata, ["portraitId", "portraitResRef", "portraitResolvedResRef"])) {
    merged.portraitResRef = gitProperties.portraitResRef;
  }
  if (hasMetadataKey(metadata, "conversation")) merged.conversation = gitProperties.conversation;
  if (hasMetadataKey(metadata, "interruptable")) merged.noInterrupt = gitProperties.noInterrupt;
  if (hasAnyMetadataKey(metadata, ["goodEvil", "lawfulChaotic"])) {
    merged.alignment = gitProperties.alignment;
  }
  if (hasCreatureAppearanceMetadata(metadata) && gitProperties.appearanceSettings) {
    merged.appearanceSettings = cloneAppearanceSettings(gitProperties.appearanceSettings);
  }
  if (hasCreatureAppearanceProfileMetadata(metadata) && gitProperties.appearanceProfile) {
    merged.appearanceProfile = { ...gitProperties.appearanceProfile };
  }
  if (hasAnyMetadataKey(metadata, CREATURE_LOOKUP_PROFILE_METADATA_KEYS) && gitProperties.lookupProfile) {
    merged.lookupProfile = { ...gitProperties.lookupProfile };
  }
  if (
    hasAnyMetadataKey(metadata, CREATURE_LOCALIZED_STRING_REF_METADATA_KEYS) &&
    gitProperties.localizedStringRefs
  ) {
    merged.localizedStringRefs = { ...gitProperties.localizedStringRefs };
  }
  if (
    hasAnyMetadataKey(metadata, CREATURE_LOCALIZED_STRING_METADATA_KEYS) &&
    gitProperties.localizedStrings
  ) {
    merged.localizedStrings = { ...gitProperties.localizedStrings };
  }
  merged.statistics = mergeCreatureStatistics(
    merged.statistics,
    gitProperties.statistics,
    metadata
  );
  merged.scriptSlots = mergeCreatureScriptSlots(
    merged.scriptSlots,
    gitProperties.scriptSlots,
    metadata
  );
  merged.advancedSettings = mergeCreatureAdvancedSettings(
    merged.advancedSettings,
    gitProperties.advancedSettings,
    metadata
  );
  mergeCreatureListProperties(merged, gitProperties, metadata);
  if (hasAnyMetadataKey(metadata, CREATURE_LIST_COUNT_METADATA_KEYS) && gitProperties.listCounts) {
    merged.listCounts = { ...gitProperties.listCounts };
  }

  return merged;
}

function mergeCreatureListProperties(
  merged: SceneObjectCreatureProperties,
  gitProperties: SceneObjectCreatureProperties,
  metadata: AreaCreatureMetadata
): void {
  if (hasAnyMetadataKey(metadata, ["classListEntries", "classListCount"])) {
    merged.classEntries = cloneObjectList(gitProperties.classEntries);
    merged.spells = cloneObjectList(gitProperties.spells);
  }
  if (hasAnyMetadataKey(metadata, ["templateListEntries", "templateListCount"])) {
    merged.templateEntries = cloneObjectList(gitProperties.templateEntries);
  }
  if (hasAnyMetadataKey(metadata, ["skillListEntries", "skillListCount"])) {
    merged.skills = cloneObjectList(gitProperties.skills);
  }
  if (hasAnyMetadataKey(metadata, ["featListEntries", "featListCount"])) {
    merged.feats = cloneObjectList(gitProperties.feats);
  }
  if (hasAnyMetadataKey(metadata, ["specAbilityListEntries", "specAbilityListCount"])) {
    merged.specialAbilities = cloneObjectList(gitProperties.specialAbilities);
  }
  if (hasAnyMetadataKey(metadata, ["inventoryItemListEntries", "inventoryItemListCount"])) {
    merged.inventoryItems = cloneObjectList(gitProperties.inventoryItems);
  }
  if (hasAnyMetadataKey(metadata, ["equipItemListEntries", "equipItemListCount"])) {
    merged.equippedItems = cloneObjectList(gitProperties.equippedItems);
  }
}

function cloneCreatureProperties(
  source: SceneObjectCreatureProperties
): SceneObjectCreatureProperties {
  return {
    ...source,
    statistics: source.statistics
      ? {
          ...source.statistics,
          abilityScores: { ...source.statistics.abilityScores },
          racialModifiers: { ...source.statistics.racialModifiers },
          saves: { ...source.statistics.saves }
        }
      : undefined,
    appearanceSettings: source.appearanceSettings
      ? cloneAppearanceSettings(source.appearanceSettings)
      : undefined,
    appearanceProfile: source.appearanceProfile ? { ...source.appearanceProfile } : undefined,
    lookupProfile: source.lookupProfile ? { ...source.lookupProfile } : undefined,
    listCounts: source.listCounts ? { ...source.listCounts } : undefined,
    localizedStringRefs: source.localizedStringRefs
      ? { ...source.localizedStringRefs }
      : undefined,
    localizedStrings: source.localizedStrings ? { ...source.localizedStrings } : undefined,
    classEntries: source.classEntries?.map((entry) => ({ ...entry })),
    templateEntries: source.templateEntries?.map((entry) => ({ ...entry })),
    skills: source.skills?.map((entry) => ({ ...entry })),
    scriptSlots: source.scriptSlots ? { ...source.scriptSlots } : undefined,
    advancedSettings: source.advancedSettings ? { ...source.advancedSettings } : undefined,
    feats: source.feats?.map((entry) => ({ ...entry })),
    spells: source.spells?.map((entry) => ({ ...entry })),
    specialAbilities: source.specialAbilities?.map((entry) => ({ ...entry })),
    inventoryItems: source.inventoryItems?.map((entry) => ({ ...entry })),
    equippedItems: source.equippedItems?.map((entry) => ({ ...entry }))
  };
}

function clonePlaceableProperties(
  source: SceneObjectPlaceableProperties
): SceneObjectPlaceableProperties {
  return {
    ...source,
    scriptSlots: source.scriptSlots ? { ...source.scriptSlots } : undefined,
    disabledFlags: source.disabledFlags ? { ...source.disabledFlags } : undefined,
    lockSettings: source.lockSettings ? { ...source.lockSettings } : undefined,
    trapSettings: source.trapSettings ? { ...source.trapSettings } : undefined,
    advancedSettings: source.advancedSettings ? { ...source.advancedSettings } : undefined,
    ...(source.inventoryItems
      ? { inventoryItems: source.inventoryItems.map((entry) => ({ ...entry })) }
      : {})
  };
}

function cloneItemProperties(source: SceneObjectItemProperties): SceneObjectItemProperties {
  return {
    ...source,
    modelParts: source.modelParts ? [...source.modelParts] : undefined,
    modelPartResRefs: source.modelPartResRefs ? [...source.modelPartResRefs] : undefined,
    modelPartResRefRoles: source.modelPartResRefRoles ? [...source.modelPartResRefRoles] : undefined,
    baseItemReqFeats: source.baseItemReqFeats ? [...source.baseItemReqFeats] : undefined,
    armorPreviewContext: source.armorPreviewContext
      ? { ...source.armorPreviewContext }
      : undefined,
    modelPartCandidates: source.modelPartCandidates?.map((entry) => ({ ...entry })),
    armorPartModelCandidates: source.armorPartModelCandidates?.map((entry) => ({ ...entry })),
    modelAssetCandidates: source.modelAssetCandidates?.map((entry) => ({ ...entry })),
    armorPartCostModifiers: source.armorPartCostModifiers
      ? { ...source.armorPartCostModifiers }
      : undefined,
    armorParts: source.armorParts ? { ...source.armorParts } : undefined,
    materialColors: source.materialColors ? { ...source.materialColors } : undefined,
    propertyList: source.propertyList?.map((entry) => ({ ...entry })),
    scripts: source.scripts ? { ...source.scripts } : undefined
  };
}

function mergeAreaItemProperties(
  templateProperties: SceneObjectItemProperties | undefined,
  metadata: AreaItemMetadata | undefined
): SceneObjectItemProperties | undefined {
  const merged = templateProperties ? cloneItemProperties(templateProperties) : {};
  if (!metadata) {
    return templateProperties ? merged : undefined;
  }

  setItemStringField(merged, metadata, "localizedName", "localizedName");
  setItemStringField(merged, metadata, "description", "description");
  setItemStringField(merged, metadata, "identifiedDescription", "identifiedDescription");
  setItemStringField(merged, metadata, "comments", "comments");

  const numericBindings: Array<[string, keyof SceneObjectItemProperties]> = [
    ["localizedNameStrRef", "localizedNameStrRef"],
    ["descriptionStrRef", "descriptionStrRef"],
    ["identifiedDescriptionStrRef", "identifiedDescriptionStrRef"],
    ["paletteId", "paletteId"],
    ["baseItem", "baseItem"],
    ["modelPart1", "modelPart1"],
    ["modelPart2", "modelPart2"],
    ["modelPart3", "modelPart3"],
    ["cost", "cost"],
    ["addCost", "addCost"],
    ["costTable", "costTable"],
    ["costValue", "costValue"],
    ["charges", "charges"],
    ["stackSize", "stackSize"]
  ];
  for (const [metadataKey, propertyKey] of numericBindings) {
    setItemNumberField(merged, metadata, metadataKey, propertyKey);
  }
  merged.modelParts = [merged.modelPart1, merged.modelPart2, merged.modelPart3].filter(
    (entry): entry is number => typeof entry === "number" && Number.isFinite(entry)
  );

  const booleanBindings: Array<[string, keyof SceneObjectItemProperties]> = [
    ["identified", "identified"],
    ["stolen", "stolen"],
    ["plot", "plot"],
    ["cursed", "cursed"]
  ];
  for (const [metadataKey, propertyKey] of booleanBindings) {
    setItemBooleanField(merged, metadata, metadataKey, propertyKey);
  }

  const armorParts = { ...(merged.armorParts ?? {}) };
  const armorBindings: Array<[string, keyof NonNullable<SceneObjectItemProperties["armorParts"]>]> = [
    ["bodyPartRFoot", "rFoot"],
    ["bodyPartLFoot", "lFoot"],
    ["bodyPartRShin", "rShin"],
    ["bodyPartLShin", "lShin"],
    ["bodyPartLThigh", "lThigh"],
    ["bodyPartRThigh", "rThigh"],
    ["bodyPartPelvis", "pelvis"],
    ["bodyPartTorso", "torso"],
    ["bodyPartBelt", "belt"],
    ["bodyPartNeck", "neck"],
    ["bodyPartRFArm", "rFArm"],
    ["bodyPartLFArm", "lFArm"],
    ["bodyPartRBicep", "rBicep"],
    ["bodyPartLBicep", "lBicep"],
    ["bodyPartRShoul", "rShoul"],
    ["bodyPartLShoul", "lShoul"],
    ["bodyPartRHand", "rHand"],
    ["bodyPartLHand", "lHand"],
    ["bodyPartRobe", "robe"]
  ];
  for (const [metadataKey, partKey] of armorBindings) {
    const value = readMetadataNumber(metadata, metadataKey);
    if (value !== undefined) {
      armorParts[partKey] = value;
    }
  }
  if (Object.keys(armorParts).length > 0) {
    merged.armorParts = armorParts;
  }

  const materialColors = { ...(merged.materialColors ?? {}) };
  const colorBindings: Array<[string, keyof NonNullable<SceneObjectItemProperties["materialColors"]>]> = [
    ["leather1Color", "leather1"],
    ["leather2Color", "leather2"],
    ["cloth1Color", "cloth1"],
    ["cloth2Color", "cloth2"],
    ["metal1Color", "metal1"],
    ["metal2Color", "metal2"]
  ];
  for (const [metadataKey, colorKey] of colorBindings) {
    const value = readMetadataNumber(metadata, metadataKey);
    if (value !== undefined) {
      materialColors[colorKey] = value;
    }
  }
  if (Object.keys(materialColors).length > 0) {
    merged.materialColors = materialColors;
  }

  const propertyList = readItemPropertyEntries(metadata.itemPropertyListEntries);
  if (propertyList) {
    merged.propertyList = propertyList;
  }
  const scripts = readItemScriptEntries(metadata);
  if (scripts) {
    merged.scripts = scripts;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function readMetadataString(metadata: AreaItemMetadata, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readMetadataNumber(metadata: AreaItemMetadata, key: string): number | undefined {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;
}

function readMetadataBoolean(metadata: AreaItemMetadata, key: string): boolean | undefined {
  const value = metadata[key];
  return typeof value === "boolean" ? value : undefined;
}

function setItemStringField(
  target: SceneObjectItemProperties,
  metadata: AreaItemMetadata,
  metadataKey: string,
  propertyKey: keyof SceneObjectItemProperties
): void {
  const value = readMetadataString(metadata, metadataKey);
  if (value !== undefined) {
    (target as Record<string, unknown>)[propertyKey] = value;
  }
}

function setItemNumberField(
  target: SceneObjectItemProperties,
  metadata: AreaItemMetadata,
  metadataKey: string,
  propertyKey: keyof SceneObjectItemProperties
): void {
  const value = readMetadataNumber(metadata, metadataKey);
  if (value !== undefined) {
    (target as Record<string, unknown>)[propertyKey] = value;
  }
}

function setItemBooleanField(
  target: SceneObjectItemProperties,
  metadata: AreaItemMetadata,
  metadataKey: string,
  propertyKey: keyof SceneObjectItemProperties
): void {
  const value = readMetadataBoolean(metadata, metadataKey);
  if (value !== undefined) {
    (target as Record<string, unknown>)[propertyKey] = value;
  }
}

function readItemPropertyEntries(
  value: AreaApiCreatureMetadataPrimitive | undefined
): SceneObjectItemProperties["propertyList"] | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return undefined;
    }
    return parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => ({
        propertyName: readFiniteObjectNumber(entry, "propertyName"),
        subtype: readFiniteObjectNumber(entry, "subtype"),
        costTable: readFiniteObjectNumber(entry, "costTable"),
        costValue: readFiniteObjectNumber(entry, "costValue"),
        param1: readFiniteObjectNumber(entry, "param1"),
        param1Value: readFiniteObjectNumber(entry, "param1Value"),
        chanceAppear: readFiniteObjectNumber(entry, "chanceAppear")
      }))
      .filter((entry) =>
        Object.values(entry).some((entryValue) => typeof entryValue === "number")
      );
  } catch {
    return undefined;
  }
}

function readFiniteObjectNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;
}

function readItemScriptEntries(metadata: AreaItemMetadata): Record<string, string> | undefined {
  const scripts = Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) => key.startsWith("script.") && typeof value === "string")
      .map(([key, value]) => [key.slice("script.".length), String(value).trim()] as const)
      .filter(([key, value]) => key.length > 0 && value.length > 0)
  );
  return Object.keys(scripts).length > 0 ? scripts : undefined;
}

function cloneObjectList<T extends object>(source: readonly T[] | undefined): T[] | undefined {
  return source?.map((entry) => ({ ...entry }));
}

function cloneAppearanceSettings(
  source: NonNullable<SceneObjectCreatureProperties["appearanceSettings"]>
): NonNullable<SceneObjectCreatureProperties["appearanceSettings"]> {
  return {
    ...source,
    colors: source.colors ? { ...source.colors } : undefined,
    sourceOnlyParts: source.sourceOnlyParts ? { ...source.sourceOnlyParts } : undefined
  };
}

function mergeCreatureStatistics(
  templateStats: SceneObjectCreatureProperties["statistics"],
  gitStats: SceneObjectCreatureProperties["statistics"],
  metadata: AreaCreatureMetadata
): SceneObjectCreatureProperties["statistics"] {
  if (!gitStats) {
    return templateStats;
  }
  const merged = templateStats
    ? {
        ...templateStats,
        abilityScores: { ...templateStats.abilityScores },
        racialModifiers: { ...templateStats.racialModifiers },
        saves: { ...templateStats.saves }
      }
    : {
        ...gitStats,
        abilityScores: { ...gitStats.abilityScores },
        racialModifiers: { ...gitStats.racialModifiers },
        saves: { ...gitStats.saves }
      };

  if (hasMetadataKey(metadata, "strength")) merged.abilityScores.strength = gitStats.abilityScores.strength;
  if (hasMetadataKey(metadata, "dexterity")) merged.abilityScores.dexterity = gitStats.abilityScores.dexterity;
  if (hasMetadataKey(metadata, "constitution")) {
    merged.abilityScores.constitution = gitStats.abilityScores.constitution;
  }
  if (hasMetadataKey(metadata, "intelligence")) {
    merged.abilityScores.intelligence = gitStats.abilityScores.intelligence;
  }
  if (hasMetadataKey(metadata, "wisdom")) merged.abilityScores.wisdom = gitStats.abilityScores.wisdom;
  if (hasMetadataKey(metadata, "charisma")) merged.abilityScores.charisma = gitStats.abilityScores.charisma;
  if (hasMetadataKey(metadata, "strengthAdjust")) {
    merged.racialModifiers.strength = gitStats.racialModifiers.strength;
  }
  if (hasMetadataKey(metadata, "dexterityAdjust")) {
    merged.racialModifiers.dexterity = gitStats.racialModifiers.dexterity;
  }
  if (hasMetadataKey(metadata, "constitutionAdjust")) {
    merged.racialModifiers.constitution = gitStats.racialModifiers.constitution;
  }
  if (hasMetadataKey(metadata, "intelligenceAdjust")) {
    merged.racialModifiers.intelligence = gitStats.racialModifiers.intelligence;
  }
  if (hasMetadataKey(metadata, "wisdomAdjust")) {
    merged.racialModifiers.wisdom = gitStats.racialModifiers.wisdom;
  }
  if (hasMetadataKey(metadata, "charismaAdjust")) {
    merged.racialModifiers.charisma = gitStats.racialModifiers.charisma;
  }
  if (hasMetadataKey(metadata, "naturalAc")) merged.naturalArmorClass = gitStats.naturalArmorClass;
  if (hasMetadataKey(metadata, "reflexBonus")) merged.saves.reflexBonus = gitStats.saves.reflexBonus;
  if (hasMetadataKey(metadata, "willBonus")) merged.saves.willBonus = gitStats.saves.willBonus;
  if (hasMetadataKey(metadata, "fortitudeBonus")) merged.saves.fortitudeBonus = gitStats.saves.fortitudeBonus;
  if (hasAnyMetadataKey(metadata, ["hitPoints", "maxHitPoints"])) {
    merged.baseHitPoints = gitStats.baseHitPoints;
    merged.hitPointBonuses = gitStats.hitPointBonuses;
    merged.maxHitPoints = gitStats.maxHitPoints;
  }
  if (hasMetadataKey(metadata, "currentHitPoints")) {
    merged.currentHitPoints = gitStats.currentHitPoints;
  }
  if (hasAnyMetadataKey(metadata, ["walkRate", "walkRateEffective"])) {
    merged.movementRate = gitStats.movementRate;
  }
  return merged;
}

function mergeCreatureScriptSlots(
  templateSlots: SceneObjectCreatureProperties["scriptSlots"],
  gitSlots: SceneObjectCreatureProperties["scriptSlots"],
  metadata: AreaCreatureMetadata
): SceneObjectCreatureProperties["scriptSlots"] {
  if (!gitSlots) {
    return templateSlots;
  }
  const merged = templateSlots ? { ...templateSlots } : { ...gitSlots };
  const bindings: Array<[string, keyof NonNullable<SceneObjectCreatureProperties["scriptSlots"]>]> = [
    ["script.scriptonblocked", "onBlocked"],
    ["script.scriptendround", "onCombatRoundEnd"],
    ["script.scriptdialogue", "onConversation"],
    ["script.scriptdamaged", "onDamaged"],
    ["script.scriptdeath", "onDeath"],
    ["script.scriptdisturbed", "onDisturbed"],
    ["script.scriptheartbeat", "onHeartbeat"],
    ["script.scriptonnotice", "onPerception"],
    ["script.scriptattacked", "onPhysicalAttacked"],
    ["script.scriptrested", "onRested"],
    ["script.scriptspawn", "onSpawn"],
    ["script.scriptspellat", "onSpellCastAt"],
    ["script.scriptuserdefine", "onUserDefined"]
  ];
  for (const [metadataKey, slotKey] of bindings) {
    if (hasMetadataKey(metadata, metadataKey)) {
      merged[slotKey] = gitSlots[slotKey];
    }
  }
  return merged;
}

function mergeCreatureAdvancedSettings(
  templateSettings: SceneObjectCreatureProperties["advancedSettings"],
  gitSettings: SceneObjectCreatureProperties["advancedSettings"],
  metadata: AreaCreatureMetadata
): SceneObjectCreatureProperties["advancedSettings"] {
  if (!gitSettings) {
    return templateSettings;
  }
  const merged = templateSettings ? { ...templateSettings } : { ...gitSettings };
  if (hasMetadataKey(metadata, "templateResRef")) merged.blueprintResRef = gitSettings.blueprintResRef;
  if (hasMetadataKey(metadata, "paletteId")) merged.paletteId = gitSettings.paletteId;
  if (hasMetadataKey(metadata, "disarmable")) merged.disarmable = gitSettings.disarmable;
  if (hasMetadataKey(metadata, "plot")) merged.plot = gitSettings.plot;
  if (hasMetadataKey(metadata, "isPc")) merged.playerCharacter = gitSettings.playerCharacter;
  if (hasMetadataKey(metadata, "lootable")) merged.leavesLootableCorpse = gitSettings.leavesLootableCorpse;
  if (hasMetadataKey(metadata, "noPermDeath")) merged.noPermanentDeath = gitSettings.noPermanentDeath;
  if (hasMetadataKey(metadata, "isImmortal")) merged.immortal = gitSettings.immortal;
  if (hasMetadataKey(metadata, "bodyBag")) merged.bodyBag = gitSettings.bodyBag;
  if (hasMetadataKey(metadata, "startingPackage")) merged.startingPackage = gitSettings.startingPackage;
  if (hasMetadataKey(metadata, "decayTime")) {
    merged.corpseDecayTimeSeconds = gitSettings.corpseDecayTimeSeconds;
  }
  if (hasMetadataKey(metadata, "factionId")) merged.faction = gitSettings.faction;
  if (hasMetadataKey(metadata, "subrace")) merged.subrace = gitSettings.subrace;
  if (hasMetadataKey(metadata, "deity")) merged.deity = gitSettings.deity;
  if (hasMetadataKey(metadata, "crAdjust")) {
    merged.challengeRatingAdjustment = gitSettings.challengeRatingAdjustment;
  }
  if (hasAnyMetadataKey(metadata, ["soundSetFile", "soundSetLabel", "soundSetResRef"])) {
    merged.soundSet = gitSettings.soundSet;
  }
  if (hasAnyMetadataKey(metadata, ["perceptionRange", "perceptionRangeEffective"])) {
    merged.perceptionRange = gitSettings.perceptionRange;
  }
  return merged;
}

function hasCreatureAppearanceMetadata(metadata: AreaCreatureMetadata): boolean {
  return hasAnyMetadataKey(metadata, [
    "appearanceHead",
    "bodyPartNeck",
    "bodyPartTorso",
    "bodyPartPelvis",
    "bodyPartBelt",
    "bodyPartRBicep",
    "bodyPartLBicep",
    "bodyPartRShoul",
    "bodyPartLShoul",
    "bodyPartRFArm",
    "bodyPartLFArm",
    "bodyPartRHand",
    "bodyPartLHand",
    "bodyPartRThigh",
    "bodyPartLThigh",
    "bodyPartRShin",
    "bodyPartLShin",
    "bodyPartRFoot",
    "bodyPartLFoot",
    "bodyPartRobe",
    "wingsNew",
    "tailNew",
    "colorSkin",
    "colorHair",
    "colorTattoo1",
    "colorTattoo2"
  ]);
}

function hasCreatureAppearanceProfileMetadata(metadata: AreaCreatureMetadata): boolean {
  return hasAnyMetadataKey(metadata, [
    "appearanceLabelSource2daRow",
    "appearanceLabelSourceKey",
    "appearanceModelType",
    "appearanceRaceModel",
    "appearancePortrait2da",
    "appearanceEnvMap",
    "appearanceDefaultPhenotype",
    "appearanceBloodColor",
    "appearanceSizeCategory",
    "appearanceSizeCategoryLabel",
    "appearanceSizeCategorySource2daRow",
    "appearanceSizeCategorySourceKey",
    "raceAppearanceId"
  ]);
}

function hasAnyMetadataKey(
  metadata: AreaCreatureMetadata | undefined,
  keys: readonly string[]
): boolean {
  return keys.some((key) => hasMetadataKey(metadata, key));
}

function hasMetadataKey(metadata: AreaCreatureMetadata | undefined, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(metadata ?? {}, key);
}

function terrainFromAuroraTile(tileId: number | undefined, tileIndex: number): TerrainBrushKind {
  const sourceIndex = Number.isFinite(tileId ?? Number.NaN) ? tileId ?? 0 : tileIndex;
  return AURORA_TILE_TERRAIN_SEQUENCE[Math.abs(sourceIndex) % AURORA_TILE_TERRAIN_SEQUENCE.length];
}

function normalizeOrientation(value: number | undefined): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return 0;
  }
  return ((((Math.trunc(value ?? 0) % 4) + 4) % 4) as 0 | 1 | 2 | 3);
}

function toSceneTile(area: AreaApiDetail, tile: AreaApiTileInstance): SceneTile {
  const orientation = normalizeOrientation(tile.orientation);
  return {
    id: tile.tileInstanceId,
    row: tile.row,
    col: tile.col,
    terrain: terrainFromAuroraTile(tile.tileId, tile.tileIndex),
    orientation,
    rotateTexture: orientation % 2 === 1,
    plot: false,
    source: "aurora_tile_list",
    areaId: tile.areaId || area.areaId,
    tilesetResRef: tile.tilesetResRef,
    tileIndex: tile.tileIndex,
    ...(tile.tileId !== undefined ? { tileId: tile.tileId } : {}),
    ...(tile.modelResRef ? { modelResRef: tile.modelResRef } : {}),
    ...(tile.modelSource ? { modelSource: tile.modelSource } : {}),
    ...(tile.imageMap2D ? { imageMap2D: tile.imageMap2D } : {}),
    ...(tile.tilesetOrientation !== undefined
      ? { tilesetOrientation: normalizeOrientation(tile.tilesetOrientation) }
      : {}),
    ...(tile.mainLight1 !== undefined ? { mainLight1: tile.mainLight1 } : {}),
    ...(tile.mainLight2 !== undefined ? { mainLight2: tile.mainLight2 } : {}),
    ...(tile.sourceLight1 !== undefined ? { sourceLight1: tile.sourceLight1 } : {}),
    ...(tile.sourceLight2 !== undefined ? { sourceLight2: tile.sourceLight2 } : {}),
    ...(tile.mainLight1Color ? { mainLight1Color: { ...tile.mainLight1Color } } : {}),
    ...(tile.mainLight2Color ? { mainLight2Color: { ...tile.mainLight2Color } } : {}),
    ...(tile.sourceLight1Color ? { sourceLight1Color: { ...tile.sourceLight1Color } } : {}),
    ...(tile.sourceLight2Color ? { sourceLight2Color: { ...tile.sourceLight2Color } } : {}),
    ...(tile.animLoop1 !== undefined ? { animLoop1: tile.animLoop1 } : {}),
    ...(tile.animLoop2 !== undefined ? { animLoop2: tile.animLoop2 } : {}),
    ...(tile.animLoop3 !== undefined ? { animLoop3: tile.animLoop3 } : {}),
    ...(tile.pathNode ? { pathNode: tile.pathNode } : {}),
    ...(tile.visibilityNode ? { visibilityNode: tile.visibilityNode } : {}),
    ...(tile.visibilityOrientation !== undefined
      ? { visibilityOrientation: normalizeOrientation(tile.visibilityOrientation) }
      : {}),
    ...(tile.doorVisibilityNode ? { doorVisibilityNode: tile.doorVisibilityNode } : {}),
    ...(tile.doorVisibilityOrientation !== undefined
      ? { doorVisibilityOrientation: normalizeOrientation(tile.doorVisibilityOrientation) }
      : {}),
    ...(tile.edges ? { edges: { ...tile.edges } } : {}),
    ...(tile.cornerHeights ? { cornerHeights: { ...tile.cornerHeights } } : {}),
    ...(tile.height !== undefined ? { height: tile.height } : {}),
    ...(tile.fallbackReason ? { fallbackReason: tile.fallbackReason } : {})
  };
}

function mapAreaSceneLighting(
  lighting: AreaApiDetail["lighting"]
): Pick<AreaScene, "lighting"> {
  if (!lighting || lighting.fields.length === 0) {
    return {};
  }
  return {
    lighting: {
      source: lighting.source,
      fields: lighting.fields.map((field) => ({
        field: field.field,
        value: field.value
      }))
    }
  };
}

export function mapBackendAreaToScene(
  area: AreaApiDetail,
  now: () => number = () => Date.now(),
  options: AreaSceneMapperOptions = {}
): AreaScene {
  const areaTiles = area.tiles ?? [];
  const creatureTemplateLookup = buildCreatureTemplateLookup(options.creatureTemplateObjects);
  const objectTemplateLookup = buildAreaObjectTemplateLookup(options.objectTemplateObjects);
  const objects = area.objects.map((entry) =>
    toSceneObject(area.areaId, entry, creatureTemplateLookup, objectTemplateLookup)
  );
  if (areaTiles.length > 0) {
    return {
      sceneId: area.areaId,
      areaName: area.name,
      width: area.width,
      height: area.height,
      biome: area.biome,
      tags: [...area.tags],
      benchmark: area.benchmark,
      previewImageUrl: area.previewImageUrl,
      textureAtlas: { ...area.textureAtlas },
      composition: { ...area.composition },
      backendUpdatedAt: area.updatedAt,
      ...mapAreaSceneLighting(area.lighting),
      tileSource: {
        type: "aurora_tile_list",
        tilesetResRef: area.tileSet ?? areaTiles[0]?.tilesetResRef,
        tileCount: areaTiles.length,
        ...(areaTiles.some((tile) => tile.fallbackReason)
          ? { fallbackReason: "tile-metadata-incomplete" }
          : {})
      },
      tiles: areaTiles.map((tile) => toSceneTile(area, tile)),
      objects,
      updatedAtUnixMs: now(),
      source: "aurora_area"
    };
  }

  return {
    sceneId: area.areaId,
    areaName: area.name,
    width: area.width,
    height: area.height,
    biome: area.biome,
    tags: [...area.tags],
    benchmark: area.benchmark,
    previewImageUrl: area.previewImageUrl,
    textureAtlas: { ...area.textureAtlas },
    composition: { ...area.composition },
    backendUpdatedAt: area.updatedAt,
    ...mapAreaSceneLighting(area.lighting),
    tileSource: {
      type: "blocked_missing_tile_data",
      tileCount: 0,
      fallbackReason: "area-api-tile-list-missing"
    },
    tiles: [],
    objects,
    updatedAtUnixMs: now(),
    source: "aurora_area"
  };
}
