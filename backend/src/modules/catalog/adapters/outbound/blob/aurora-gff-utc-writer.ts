import {
  buildGffBuffer,
  pushEmbeddedItemStruct,
  type SerializableEmbeddedItemBlueprint,
  type SupportedGffField
} from "./aurora-gff-uti-writer";

export interface SerializableCreatureInventoryItemEntry {
  resRef?: string;
  embeddedItem?: SerializableEmbeddedItemBlueprint;
  randomResRef?: string;
  randomList?: string;
  x?: number;
  y?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}

export interface SerializableCreatureEquippedItemEntry {
  resRef?: string;
  embeddedItem?: SerializableEmbeddedItemBlueprint;
  randomResRef?: string;
  randomList?: string;
  slotMask?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}

export interface SerializableCreatureInventoryBlueprint {
  templateResRef?: string;
  tag?: string;
  localizedName?: string;
  localizedNameStrRef?: number;
  inventoryItemListEntries?: SerializableCreatureInventoryItemEntry[];
  equipItemListEntries?: SerializableCreatureEquippedItemEntry[];
  sourceStructTypeId?: number;
}

export interface SerializableCreatureSpellEntry {
  spellId?: number;
  spellLevel?: number;
  metaMagic?: number;
  flags?: number;
}

export interface SerializableCreatureClassEntry {
  classId?: number;
  level?: number;
  knownSpells?: SerializableCreatureSpellEntry[];
  memorizedSpells?: SerializableCreatureSpellEntry[];
}

export type SerializableCreatureVariableEntry =
  | { name: string; type: "int"; value: number }
  | { name: string; type: "float"; value: number }
  | { name: string; type: "string"; value: string };

export interface SerializableCreatureBlueprint extends SerializableCreatureInventoryBlueprint {
  firstName?: string;
  firstNameStrRef?: number;
  lastName?: string;
  lastNameStrRef?: number;
  description?: string;
  descriptionStrRef?: number;
  comments?: string;
  paletteId?: number;
  conversation?: string;
  gender?: number;
  race?: number;
  subrace?: string;
  subraceStrRef?: number;
  deity?: string;
  deityStrRef?: number;
  phenotype?: number;
  portraitId?: number;
  portraitResRef?: string;
  soundSetFile?: number;
  appearanceId?: number;
  animationState?: number;
  appearanceHead?: number;
  bodyPartRFoot?: number;
  bodyPartLFoot?: number;
  bodyPartRShin?: number;
  bodyPartLShin?: number;
  bodyPartLThigh?: number;
  bodyPartRThigh?: number;
  bodyPartPelvis?: number;
  bodyPartTorso?: number;
  bodyPartBelt?: number;
  bodyPartNeck?: number;
  bodyPartRFArm?: number;
  bodyPartLFArm?: number;
  bodyPartRBicep?: number;
  bodyPartLBicep?: number;
  bodyPartRShoul?: number;
  bodyPartLShoul?: number;
  bodyPartRHand?: number;
  bodyPartLHand?: number;
  colorSkin?: number;
  colorHair?: number;
  colorTattoo1?: number;
  colorTattoo2?: number;
  leather1Color?: number;
  leather2Color?: number;
  cloth1Color?: number;
  cloth2Color?: number;
  metal1Color?: number;
  metal2Color?: number;
  wingsNew?: number;
  tailNew?: number;
  walkRate?: number;
  factionId?: number;
  challengeRating?: number;
  crAdjust?: number;
  perceptionRange?: number;
  disarmable?: boolean;
  plot?: boolean;
  isPc?: boolean;
  isImmortal?: boolean;
  lootable?: boolean;
  noPermDeath?: boolean;
  bodyBag?: boolean;
  startingPackage?: boolean;
  interruptable?: boolean;
  decayTime?: number;
  naturalAc?: number;
  hitPoints?: number;
  currentHitPoints?: number;
  maxHitPoints?: number;
  reflexBonus?: number;
  willBonus?: number;
  fortitudeBonus?: number;
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
  strengthAdjust?: number;
  dexterityAdjust?: number;
  constitutionAdjust?: number;
  intelligenceAdjust?: number;
  wisdomAdjust?: number;
  charismaAdjust?: number;
  goodEvil?: number;
  lawfulChaotic?: number;
  scripts?: Record<string, string>;
  classListEntries?: SerializableCreatureClassEntry[];
  featListEntries?: Array<{ featId?: number }>;
  templateListEntries?: Array<{ templateId?: number }>;
  specAbilityListEntries?: Array<{
    spellId?: number;
    flags?: number;
    casterLevel?: number;
  }>;
  skillListEntries?: Array<{ rank?: number }>;
  variableListEntries?: SerializableCreatureVariableEntry[];
}

const UTC_FILE_TYPE = "UTC ";
const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const CREATURE_INVENTORY_STRUCT_TYPE_ID = 0;

export function serializeCreatureInventoryToUtcGff(
  input: SerializableCreatureInventoryBlueprint
): Buffer {
  return serializeCreatureBlueprintToUtcGff(input);
}

export function serializeCreatureBlueprintToUtcGff(
  input: SerializableCreatureBlueprint,
  options: {
    preservedFields?: SupportedGffField[];
    rootStructTypeId?: number;
  } = {}
): Buffer {
  const fields = buildCreatureBlueprintFields(input);
  return buildGffBuffer(
    options.preservedFields
      ? mergeCreatureBlueprintFields(options.preservedFields, fields, input)
      : fields,
    UTC_FILE_TYPE,
    normalizeUInt32(options.rootStructTypeId ?? input.sourceStructTypeId ?? ROOT_STRUCT_TYPE_ID)
  );
}

function mergeCreatureBlueprintFields(
  preservedFields: SupportedGffField[],
  replacementFields: SupportedGffField[],
  input: SerializableCreatureBlueprint
): SupportedGffField[] {
  const replacedLabels = new Set(replacementFields.map((field) => field.label.toLowerCase()));
  const explicitListLabels: Array<[unknown, string]> = [
    [input.classListEntries, "classlist"],
    [input.featListEntries, "featlist"],
    [input.templateListEntries, "templatelist"],
    [input.specAbilityListEntries, "specabilitylist"],
    [input.inventoryItemListEntries, "itemlist"],
    [input.equipItemListEntries, "equip_itemlist"]
  ];
  for (const [value, label] of explicitListLabels) {
    if (value !== undefined) {
      replacedLabels.add(label);
    }
  }
  if (input.variableListEntries !== undefined) {
    replacedLabels.add("vartable");
  }
  return [
    ...preservedFields.filter((field) => !replacedLabels.has(field.label.toLowerCase())),
    ...replacementFields
  ];
}

function buildCreatureBlueprintFields(
  input: SerializableCreatureBlueprint
): SupportedGffField[] {
  const fields: SupportedGffField[] = [];
  pushResRef(fields, "TemplateResRef", input.templateResRef);
  pushCExoString(fields, "Tag", input.tag);
  pushLocString(
    fields,
    "FirstName",
    input.firstName ?? input.localizedName,
    input.firstNameStrRef ?? input.localizedNameStrRef
  );
  pushLocString(fields, "LastName", input.lastName, input.lastNameStrRef);
  pushLocString(fields, "Description", input.description, input.descriptionStrRef);
  pushCExoString(fields, "Comment", input.comments);
  pushByte(fields, "PaletteID", input.paletteId);
  pushResRef(fields, "Conversation", input.conversation);

  pushByte(fields, "Gender", input.gender);
  pushWord(fields, "Race", input.race);
  pushLocString(fields, "Subrace", input.subrace, input.subraceStrRef);
  pushLocString(fields, "Deity", input.deity, input.deityStrRef);
  pushWord(fields, "Phenotype", input.phenotype);
  pushWord(fields, "PortraitId", input.portraitId);
  pushResRef(fields, "Portrait", input.portraitResRef);
  pushWord(fields, "SoundSetFile", input.soundSetFile);

  pushWord(fields, "Appearance_Type", input.appearanceId);
  pushDword(fields, "AnimationState", input.animationState);
  pushByte(fields, "Appearance_Head", input.appearanceHead);
  pushCreatureAppearanceFields(fields, input);

  pushInt(fields, "WalkRate", input.walkRate);
  pushWord(fields, "FactionID", input.factionId);
  pushFloat(fields, "ChallengeRating", input.challengeRating);
  pushInt(fields, "CRAdjust", input.crAdjust);
  pushByte(fields, "PerceptionRange", input.perceptionRange);
  pushByte(fields, "Disarmable", booleanToByte(input.disarmable));
  pushByte(fields, "Plot", booleanToByte(input.plot));
  pushByte(fields, "IsPC", booleanToByte(input.isPc));
  pushByte(fields, "IsImmortal", booleanToByte(input.isImmortal));
  pushByte(fields, "Lootable", booleanToByte(input.lootable));
  pushByte(fields, "NoPermDeath", booleanToByte(input.noPermDeath));
  pushByte(fields, "BodyBag", booleanToByte(input.bodyBag));
  pushByte(fields, "StartingPackage", booleanToByte(input.startingPackage));
  pushByte(fields, "Interruptable", booleanToByte(input.interruptable));
  pushDword(fields, "DecayTime", input.decayTime);
  pushByte(fields, "NaturalAC", input.naturalAc);
  pushShort(fields, "HitPoints", input.hitPoints);
  pushShort(fields, "CurrentHitPoints", input.currentHitPoints);
  pushShort(fields, "MaxHitPoints", input.maxHitPoints);
  pushChar(fields, "refbonus", input.reflexBonus);
  pushChar(fields, "willbonus", input.willBonus);
  pushChar(fields, "fortbonus", input.fortitudeBonus);
  pushByte(fields, "Str", input.strength);
  pushByte(fields, "Dex", input.dexterity);
  pushByte(fields, "Con", input.constitution);
  pushByte(fields, "Int", input.intelligence);
  pushByte(fields, "Wis", input.wisdom);
  pushByte(fields, "Cha", input.charisma);
  pushChar(fields, "StrAdjust", input.strengthAdjust);
  pushChar(fields, "DexAdjust", input.dexterityAdjust);
  pushChar(fields, "ConAdjust", input.constitutionAdjust);
  pushChar(fields, "IntAdjust", input.intelligenceAdjust);
  pushChar(fields, "WisAdjust", input.wisdomAdjust);
  pushChar(fields, "ChaAdjust", input.charismaAdjust);
  pushByte(fields, "GoodEvil", input.goodEvil);
  pushByte(fields, "LawfulChaotic", input.lawfulChaotic);

  pushCreatureScriptFields(fields, input.scripts);
  pushCreatureListFields(fields, input);
  pushCreatureVariableList(fields, input.variableListEntries);

  fields.push(...buildCreatureInventoryListFields(input));

  return fields;
}

export function buildCreatureInventoryListFields(
  input: SerializableCreatureInventoryBlueprint
): SupportedGffField[] {
  const fields: SupportedGffField[] = [];
  const inventoryEntries = (input.inventoryItemListEntries ?? [])
    .map(buildInventoryItemFields)
    .filter((entry) => entry.fields.length > 0);
  if (inventoryEntries.length > 0) {
    fields.push({ label: "ItemList", type: "list", value: inventoryEntries });
  }

  const equippedEntries = (input.equipItemListEntries ?? [])
    .map(buildEquippedItemFields)
    .filter((entry) => entry.fields.length > 0);
  if (equippedEntries.length > 0) {
    fields.push({ label: "Equip_ItemList", type: "list", value: equippedEntries });
  }
  return fields;
}

function pushCreatureAppearanceFields(
  fields: SupportedGffField[],
  input: SerializableCreatureBlueprint
): void {
  pushByte(fields, "BodyPart_RFoot", input.bodyPartRFoot);
  pushByte(fields, "BodyPart_LFoot", input.bodyPartLFoot);
  pushByte(fields, "BodyPart_RShin", input.bodyPartRShin);
  pushByte(fields, "BodyPart_LShin", input.bodyPartLShin);
  pushByte(fields, "BodyPart_LThigh", input.bodyPartLThigh);
  pushByte(fields, "BodyPart_RThigh", input.bodyPartRThigh);
  pushByte(fields, "BodyPart_Pelvis", input.bodyPartPelvis);
  pushByte(fields, "BodyPart_Torso", input.bodyPartTorso);
  pushByte(fields, "BodyPart_Belt", input.bodyPartBelt);
  pushByte(fields, "BodyPart_Neck", input.bodyPartNeck);
  pushByte(fields, "BodyPart_RFArm", input.bodyPartRFArm);
  pushByte(fields, "BodyPart_LFArm", input.bodyPartLFArm);
  pushByte(fields, "BodyPart_RBicep", input.bodyPartRBicep);
  pushByte(fields, "BodyPart_LBicep", input.bodyPartLBicep);
  pushByte(fields, "BodyPart_RShoul", input.bodyPartRShoul);
  pushByte(fields, "BodyPart_LShoul", input.bodyPartLShoul);
  pushByte(fields, "BodyPart_RHand", input.bodyPartRHand);
  pushByte(fields, "BodyPart_LHand", input.bodyPartLHand);
  pushByte(fields, "Color_Skin", input.colorSkin);
  pushByte(fields, "Color_Hair", input.colorHair);
  pushByte(fields, "Color_Tattoo1", input.colorTattoo1);
  pushByte(fields, "Color_Tattoo2", input.colorTattoo2);
  pushByte(fields, "Leather1Color", input.leather1Color);
  pushByte(fields, "Leather2Color", input.leather2Color);
  pushByte(fields, "Cloth1Color", input.cloth1Color);
  pushByte(fields, "Cloth2Color", input.cloth2Color);
  pushByte(fields, "Metal1Color", input.metal1Color);
  pushByte(fields, "Metal2Color", input.metal2Color);
  pushDword(fields, "Wings_New", input.wingsNew);
  pushDword(fields, "Tail_New", input.tailNew);
}

function pushCreatureScriptFields(
  fields: SupportedGffField[],
  scripts: Record<string, string> | undefined
): void {
  if (!scripts) {
    return;
  }

  for (const [label, value] of Object.entries(scripts)) {
    const normalizedLabel = normalizeCreatureScriptLabel(label);
    const normalizedValue = normalizeResRef(value);
    if (normalizedLabel && normalizedValue) {
      fields.push({ label: normalizedLabel, type: "resref", value: normalizedValue });
    }
  }
}

function normalizeCreatureScriptLabel(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    onblocked: "scriptonblocked",
    onconversation: "scriptdialogue",
    ondamaged: "scriptdamaged",
    ondeath: "scriptdeath",
    ondisturbed: "scriptdisturbed",
    onheartbeat: "scriptheartbeat",
    onperception: "scriptonnotice",
    onphysicalattacked: "scriptattacked",
    onrested: "scriptrested",
    onspawn: "scriptspawn",
    onspellcastat: "scriptspellat",
    onuserdefined: "scriptuserdefine"
  };
  const resolved = aliases[normalized] ?? normalized;
  return /^[a-z0-9_]{1,16}$/u.test(resolved) ? resolved : undefined;
}

function pushCreatureListFields(
  fields: SupportedGffField[],
  input: SerializableCreatureBlueprint
): void {
  const classes = (input.classListEntries ?? [])
    .map(buildCreatureClassFields)
    .filter((entry) => entry.fields.length > 0);
  if (classes.length > 0) {
    fields.push({ label: "ClassList", type: "list", value: classes });
  }

  const feats = (input.featListEntries ?? [])
    .map((entry) => buildIdListEntry("Feat", entry.featId))
    .filter((entry) => entry.fields.length > 0);
  if (feats.length > 0) {
    fields.push({ label: "FeatList", type: "list", value: feats });
  }

  const templates = (input.templateListEntries ?? [])
    .map((entry) => buildIdListEntry("TemplateId", entry.templateId))
    .filter((entry) => entry.fields.length > 0);
  if (templates.length > 0) {
    fields.push({ label: "TemplateList", type: "list", value: templates });
  }

  const specialAbilities = (input.specAbilityListEntries ?? [])
    .map(buildSpecialAbilityFields)
    .filter((entry) => entry.fields.length > 0);
  if (specialAbilities.length > 0) {
    fields.push({ label: "SpecAbilityList", type: "list", value: specialAbilities });
  }

  const skills = (input.skillListEntries ?? [])
    .map((entry) => buildIdListEntry("Rank", entry.rank))
    .filter((entry) => entry.fields.length > 0);
  if (skills.length > 0) {
    fields.push({ label: "SkillList", type: "list", value: skills });
  }
}

function pushCreatureVariableList(
  fields: SupportedGffField[],
  variables: SerializableCreatureVariableEntry[] | undefined
): void {
  if (!variables || variables.length === 0) {
    return;
  }
  const entries = variables
    .map(buildCreatureVariableFields)
    .filter((entry) => entry.fields.length > 0);
  if (entries.length > 0) {
    fields.push({ label: "VarTable", type: "list", value: entries });
  }
}

function buildCreatureVariableFields(entry: SerializableCreatureVariableEntry): {
  typeId: number;
  fields: SupportedGffField[];
} {
  const name = entry.name.trim().slice(0, 64);
  if (!name) {
    return { typeId: CREATURE_INVENTORY_STRUCT_TYPE_ID, fields: [] };
  }
  const fields: SupportedGffField[] = [
    { label: "Name", type: "cexostring", value: name },
    {
      label: "Type",
      type: "int",
      value: entry.type === "int" ? 1 : entry.type === "float" ? 2 : 3
    }
  ];
  if (entry.type === "int") {
    fields.push({ label: "Value", type: "int", value: entry.value });
  } else if (entry.type === "float") {
    fields.push({ label: "Value", type: "float", value: entry.value });
  } else {
    fields.push({ label: "Value", type: "cexostring", value: entry.value });
  }
  return { typeId: CREATURE_INVENTORY_STRUCT_TYPE_ID, fields };
}

function buildCreatureClassFields(entry: SerializableCreatureClassEntry): {
  typeId: number;
  fields: SupportedGffField[];
} {
  const fields: SupportedGffField[] = [];
  pushByte(fields, "Class", entry.classId);
  pushByte(fields, "ClassLevel", entry.level);
  pushCreatureSpellListFields(fields, "KnownList", entry.knownSpells, entry.classId);
  pushCreatureSpellListFields(fields, "MemorizedList", entry.memorizedSpells);
  return { typeId: CREATURE_INVENTORY_STRUCT_TYPE_ID, fields };
}

function pushCreatureSpellListFields(
  fields: SupportedGffField[],
  label: "KnownList" | "MemorizedList",
  spells: SerializableCreatureSpellEntry[] | undefined,
  classId?: number
): void {
  if (!spells || spells.length === 0 || (label === "KnownList" && classId !== 1 && classId !== 9)) {
    return;
  }

  const byLevel = new Map<number | undefined, SerializableCreatureSpellEntry[]>();
  for (const spell of spells) {
    const level = Number.isInteger(spell.spellLevel) ? Math.max(0, Math.min(13, spell.spellLevel!)) : undefined;
    const entries = byLevel.get(level) ?? [];
    entries.push(spell);
    byLevel.set(level, entries);
  }

  for (const [level, entries] of byLevel) {
    const list = entries.map(buildCreatureSpellFields).filter((entry) => entry.fields.length > 0);
    if (list.length > 0) {
      fields.push({ label: level === undefined ? label : `${label}${level}`, type: "list", value: list });
    }
  }
}

function buildCreatureSpellFields(entry: SerializableCreatureSpellEntry): {
  typeId: number;
  fields: SupportedGffField[];
} {
  const fields: SupportedGffField[] = [];
  pushWord(fields, "Spell", entry.spellId);
  pushByte(fields, "SpellMetaMagic", entry.metaMagic ?? 0);
  pushByte(fields, "SpellFlags", (entry.flags ?? 0) | 1);
  return { typeId: CREATURE_INVENTORY_STRUCT_TYPE_ID, fields };
}

function buildSpecialAbilityFields(entry: {
  spellId?: number;
  flags?: number;
  casterLevel?: number;
}): { typeId: number; fields: SupportedGffField[] } {
  const fields: SupportedGffField[] = [];
  pushWord(fields, "Spell", entry.spellId);
  pushByte(fields, "SpellFlags", (entry.flags ?? 0) | 1);
  pushByte(fields, "SpellCasterLevel", entry.casterLevel ?? 1);
  return { typeId: CREATURE_INVENTORY_STRUCT_TYPE_ID, fields };
}

function buildIdListEntry(label: string, value: unknown): {
  typeId: number;
  fields: SupportedGffField[];
} {
  const fields: SupportedGffField[] = [];
  pushWord(fields, label, value);
  return { typeId: CREATURE_INVENTORY_STRUCT_TYPE_ID, fields };
}

function buildInventoryItemFields(entry: SerializableCreatureInventoryItemEntry): {
  typeId: number;
  fields: SupportedGffField[];
} {
  const fields: SupportedGffField[] = [];
  pushResRef(fields, "InventoryRes", entry.resRef);
  pushEmbeddedItemStruct(fields, "Item", entry.embeddedItem);
  pushResRef(fields, "RandomResRef", entry.randomResRef);
  pushResRef(fields, "RandomList", entry.randomList);
  pushWord(fields, "Repos_PosX", entry.x);
  pushWord(fields, "Repos_Posy", entry.y);
  pushByte(fields, "Dropable", booleanToByte(entry.dropable));
  pushByte(fields, "Pickpocketable", booleanToByte(entry.pickpocketable));
  pushByte(fields, "Infinite", booleanToByte(entry.infinite));
  return { typeId: CREATURE_INVENTORY_STRUCT_TYPE_ID, fields };
}

function buildEquippedItemFields(entry: SerializableCreatureEquippedItemEntry): {
  typeId: number;
  fields: SupportedGffField[];
} {
  const fields: SupportedGffField[] = [];
  pushResRef(fields, "EquippedRes", entry.resRef);
  pushEmbeddedItemStruct(fields, "Item", entry.embeddedItem);
  pushResRef(fields, "RandomResRef", entry.randomResRef);
  pushResRef(fields, "RandomList", entry.randomList);
  pushByte(fields, "Dropable", booleanToByte(entry.dropable));
  pushByte(fields, "Pickpocketable", booleanToByte(entry.pickpocketable));
  pushByte(fields, "Infinite", booleanToByte(entry.infinite));
  return { typeId: normalizeUInt32(entry.slotMask ?? CREATURE_INVENTORY_STRUCT_TYPE_ID), fields };
}

function pushByte(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "byte", value });
  }
}

function pushChar(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "char", value });
  }
}

function pushWord(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "word", value });
  }
}

function pushShort(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "short", value });
  }
}

function pushDword(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "dword", value });
  }
}

function pushInt(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "int", value });
  }
}

function pushFloat(fields: SupportedGffField[], label: string, value: unknown): void {
  if (isFiniteNumber(value)) {
    fields.push({ label, type: "float", value });
  }
}

function pushCExoString(fields: SupportedGffField[], label: string, value: unknown): void {
  const normalized = normalizeString(value);
  if (normalized) {
    fields.push({ label, type: "cexostring", value: normalized });
  }
}

function pushResRef(fields: SupportedGffField[], label: string, value: unknown): void {
  const normalized = normalizeResRef(value);
  if (normalized) {
    fields.push({ label, type: "resref", value: normalized });
  }
}

function pushLocString(
  fields: SupportedGffField[],
  label: string,
  text: unknown,
  strRef: unknown
): void {
  const normalizedText = normalizeString(text);
  const normalizedStrRef = isFiniteNumber(strRef) ? normalizeUInt32(strRef) : undefined;
  if (normalizedText || normalizedStrRef !== undefined) {
    fields.push({
      label,
      type: "cexolocstring",
      value: { ...(normalizedText ? { text: normalizedText } : {}), strRef: normalizedStrRef }
    });
  }
}

function booleanToByte(value: boolean | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value ? 1 : 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeUInt32(value: number): number {
  return Math.max(0, Math.min(0xffffffff, Math.trunc(value))) >>> 0;
}

function normalizeString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeResRef(value: unknown): string | undefined {
  const normalized = normalizeString(value)?.replace(/[^a-z0-9_]/giu, "_").slice(0, 16);
  return normalized && /[a-z0-9]/iu.test(normalized) ? normalized : undefined;
}
