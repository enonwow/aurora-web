import type { SupportedGffField } from "./aurora-gff-uti-writer";

interface GffHeader {
  fileType: string;
  fileVersion: string;
  structOffset: number;
  structCount: number;
  fieldOffset: number;
  fieldCount: number;
  labelOffset: number;
  labelCount: number;
  fieldDataOffset: number;
  fieldDataCount: number;
  fieldIndicesOffset: number;
  fieldIndicesCount: number;
  listIndicesOffset: number;
  listIndicesCount: number;
}

interface GffStructEntry {
  typeId: number;
  dataOrOffset: number;
  fieldCount: number;
}

interface ParsedCExoLocString {
  strRef: number;
  text: string;
  entries: string[];
}

interface ParsedNameField {
  text?: string;
  strRef?: number;
}

interface ParsedGffListSummary {
  count: number;
  entries: ParsedGffFieldMap[];
}

interface ParsedGffStructSummary {
  typeId: number;
  fields: ParsedGffFieldMap;
}

type ParsedGffValue =
  | string
  | number
  | boolean
  | ParsedCExoLocString
  | ParsedGffStructSummary
  | ParsedGffListSummary;

type ParsedGffFieldMap = Map<string, ParsedGffValue>;
const GFF_STRUCT_TYPE_ID_FIELD = "__structTypeId";

export interface ParsedItemPropertyListEntry {
  propertyName?: number;
  subtype?: number;
  costTable?: number;
  costValue?: number;
  param1?: number;
  param1Value?: number;
  chanceAppear?: number;
}

export interface ParsedStoreItemListEntry {
  resRef?: string;
  randomResRef?: string;
  randomList?: string;
  embeddedItem?: ParsedEmbeddedItemSummary;
  x?: number;
  y?: number;
  infinite?: boolean;
}

export interface ParsedStoreListBucketEntry {
  bucketIndex: number;
  bucketTypeId?: number;
  itemListCount: number;
  itemListEntries: ParsedStoreItemListEntry[];
}

export interface ParsedEmbeddedItemSummary {
  sourceStructTypeId?: number;
  templateResRef?: string;
  tag?: string;
  localizedName?: string;
  localizedNameStrRef?: number;
  description?: string;
  descriptionStrRef?: number;
  identifiedDescription?: string;
  identifiedDescriptionStrRef?: number;
  comments?: string;
  paletteId?: number;
  plot?: boolean;
  baseItem?: number;
  modelPart1?: number;
  modelPart2?: number;
  modelPart3?: number;
  cost?: number;
  addCost?: number;
  costTable?: number;
  costValue?: number;
  charges?: number;
  stackSize?: number;
  identified?: boolean;
  stolen?: boolean;
  cursed?: boolean;
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
  bodyPartRobe?: number;
  leather1Color?: number;
  leather2Color?: number;
  cloth1Color?: number;
  cloth2Color?: number;
  metal1Color?: number;
  metal2Color?: number;
  itemPropertyListCount?: number;
  itemPropertyListEntries?: ParsedItemPropertyListEntry[];
  scripts?: Record<string, string>;
  fieldCount: number;
}

export interface ParsedTemplateBlueprint {
  sourceFileType: string;
  sourceFileVersion: string;
  sourceStructTypeId: number;
  templateResRef?: string;
  firstName?: string;
  firstNameStrRef?: number;
  lastName?: string;
  lastNameStrRef?: number;
  localizedName?: string;
  localizedNameStrRef?: number;
  displayName?: string;
  description?: string;
  descriptionStrRef?: number;
  identifiedDescription?: string;
  identifiedDescriptionStrRef?: number;
  comments?: string;
  paletteId?: number;
  tag?: string;
  conversation?: string;
  keyName?: string;
  plot?: boolean;
  active?: boolean;
  difficulty?: number;
  difficultyIndex?: number;
  playerOnly?: boolean;
  reset?: boolean;
  resetTime?: number;
  respawns?: number;
  spawnOption?: number;
  maxCreatures?: number;
  recCreatures?: number;
  baseItem?: number;
  modelPart1?: number;
  modelPart2?: number;
  modelPart3?: number;
  cost?: number;
  addCost?: number;
  costTable?: number;
  costValue?: number;
  charges?: number;
  stackSize?: number;
  identified?: boolean;
  stolen?: boolean;
  cursed?: boolean;
  itemArmorPreviewModelPrefix?: string;
  itemArmorPreviewContextLabel?: string;
  itemArmorPreviewGender?: number;
  itemArmorPreviewPhenotype?: number;
  itemArmorPreviewRaceModel?: string;
  appearanceId?: number;
  genericType?: number;
  animationState?: number;
  modelResRef?: string;
  hasInventory?: boolean;
  bodyBag?: boolean;
  isPc?: boolean;
  isImmortal?: boolean;
  lootable?: boolean;
  noPermDeath?: boolean;
  useable?: boolean;
  isStatic?: boolean;
  autoRemoveKey?: boolean;
  decayTime?: number;
  startingPackage?: boolean;
  closeLockDc?: number;
  openLockDc?: number;
  interruptable?: boolean;
  invulnerable?: boolean;
  keyRequired?: boolean;
  lockable?: boolean;
  locked?: boolean;
  trapDetectable?: boolean;
  trapDetectDc?: number;
  trapDisarmable?: boolean;
  disarmDc?: number;
  trapFlag?: boolean;
  trapOneShot?: boolean;
  trapType?: number;
  hardness?: number;
  lightState?: number;
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
  bodyPartRobe?: number;
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
  markUp?: number;
  markDown?: number;
  blackMarket?: boolean;
  bmMarkDown?: number;
  onOpenStore?: string;
  storeId?: number;
  storeListEntries?: ParsedStoreListBucketEntry[];
  storeListCount?: number;
  storeItemListTotal?: number;
  willNotBuyBaseItems?: number[];
  willOnlyBuyBaseItems?: number[];
  willNotBuyCount?: number;
  willOnlyBuyCount?: number;
  classListEntries?: Array<{
    classId?: number;
    level?: number;
    knownSpellCount?: number;
    memorizedSpellCount?: number;
    knownSpells?: Array<{
      spellId?: number;
      spellLevel?: number;
      metaMagic?: number;
      flags?: number;
    }>;
    memorizedSpells?: Array<{
      spellId?: number;
      spellLevel?: number;
      metaMagic?: number;
      flags?: number;
    }>;
  }>;
  featListEntries?: Array<{ featId?: number }>;
  templateListEntries?: Array<{ templateId?: number }>;
  specAbilityListEntries?: Array<{
    spellId?: number;
    flags?: number;
    casterLevel?: number;
  }>;
  inventoryItemListEntries?: Array<{
    resRef?: string;
    randomResRef?: string;
    randomList?: string;
    embeddedItem?: ParsedEmbeddedItemSummary;
    x?: number;
    y?: number;
    dropable?: boolean;
    pickpocketable?: boolean;
    infinite?: boolean;
  }>;
  equipItemListEntries?: Array<{
    resRef?: string;
    randomResRef?: string;
    randomList?: string;
    embeddedItem?: ParsedEmbeddedItemSummary;
    slotMask?: number;
    dropable?: boolean;
    pickpocketable?: boolean;
    infinite?: boolean;
  }>;
  itemPropertyListEntries?: ParsedItemPropertyListEntry[];
  encounterCreatureListEntries?: Array<{
    resRef?: string;
    appearance?: number;
    challengeRating?: number;
    singleSpawn?: boolean;
  }>;
  encounterCreatureListCount?: number;
  skillListEntries?: Array<{
    rank?: number;
  }>;
  variableListEntries?: Array<
    | { name: string; type: "int"; value: number }
    | { name: string; type: "float"; value: number }
    | { name: string; type: "string"; value: string }
  >;
  classListCount?: number;
  skillListCount?: number;
  featListCount?: number;
  templateListCount?: number;
  specAbilityListCount?: number;
  inventoryItemListCount?: number;
  equipItemListCount?: number;
  itemPropertyListCount?: number;
  scripts: Record<string, string>;
  dependencyRefs: string[];
  dependencyFingerprint: string;
  vfxEvidence: string[];
}

const GFF_HEADER_SIZE_BYTES = 56;
const GFF_STRUCT_ENTRY_SIZE_BYTES = 12;
const GFF_FIELD_ENTRY_SIZE_BYTES = 12;
const GFF_LABEL_ENTRY_SIZE_BYTES = 16;
// UTM store entries nest item properties one level deeper than UTC inventory entries.
const GFF_MAX_PARSED_NESTING_DEPTH = 4;

const FIELD_TYPE = {
  BYTE: 0,
  CHAR: 1,
  WORD: 2,
  SHORT: 3,
  DWORD: 4,
  INT: 5,
  DWORD64: 6,
  INT64: 7,
  FLOAT: 8,
  DOUBLE: 9,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  VOID: 13,
  STRUCT: 14,
  LIST: 15
} as const;

export const SCRIPT_FIELD_LABELS = [
  "onopen",
  "onclosed",
  "onused",
  "onentered",
  "onexit",
  "onexhausted",
  "onheartbeat",
  "onuserdefined",
  "oninvdisturbed",
  "onlocked",
  "onunlock",
  "onfailtoclose",
  "onfailtoopen",
  "onclick",
  "ondamaged",
  "ondeath",
  "ondialog",
  "onspellcastat",
  "onmeleedamaged",
  "ondisarm",
  "onlock",
  "onmeleeattacked",
  "ontraptriggered",
  "ontrapdisarmed",
  "oninventorydisturbed",
  "scriptheartbeat",
  "scriptonnotice",
  "scriptspellat",
  "scriptattacked",
  "scriptdamaged",
  "scriptdisturbed",
  "scriptendround",
  "scriptdialogue",
  "scriptspawn",
  "scriptrested",
  "scriptdeath",
  "scriptuserdefine",
  "scriptonblocked"
] as const;

const VFX_TEXT_PATTERN = /(vfx|vvx|emit|emitter|particle|fx_)/iu;
const AURORA_SPELL_FLAGS_RUNTIME_BIT = 1;
const AURORA_DEFAULT_SPELL_META_MAGIC = 0;
const AURORA_DEFAULT_SPECIAL_ABILITY_CASTER_LEVEL = 1;
const AURORA_MAX_SPECIAL_ABILITY_CASTER_LEVEL = 0xf;
const AURORA_DEFAULT_CREATURE_SKILL_COUNT = 28;
const GFF_MAX_PRESERVED_NESTING_DEPTH = 32;

export interface ParsedRawGffDocument {
  fileType: string;
  fileVersion: string;
  rootStructTypeId: number;
  fields: SupportedGffField[];
}

export function parseTemplateBlueprintFromGff(
  bytes: Buffer
): ParsedTemplateBlueprint | null {
  try {
    const header = parseHeader(bytes);
    if (!header) {
      return null;
    }

    const labels = parseLabels(bytes, header);
    const structs = parseStructs(bytes, header);
    if (structs.length === 0) {
      return null;
    }

    const rootStruct = structs[0];
    const rootFieldIndices = resolveStructFieldIndices(bytes, header, rootStruct);
    if (!rootFieldIndices) {
      return null;
    }

    const fields = parseRootFields(bytes, header, labels, structs, rootFieldIndices);
    return mapFieldsToTemplateBlueprint(header, rootStruct.typeId, fields);
  } catch {
    return null;
  }
}

function parseHeader(bytes: Buffer): GffHeader | null {
  if (bytes.length < GFF_HEADER_SIZE_BYTES) {
    return null;
  }

  const header: GffHeader = {
    fileType: bytes.toString("ascii", 0, 4),
    fileVersion: bytes.toString("ascii", 4, 8),
    structOffset: bytes.readUInt32LE(8),
    structCount: bytes.readUInt32LE(12),
    fieldOffset: bytes.readUInt32LE(16),
    fieldCount: bytes.readUInt32LE(20),
    labelOffset: bytes.readUInt32LE(24),
    labelCount: bytes.readUInt32LE(28),
    fieldDataOffset: bytes.readUInt32LE(32),
    fieldDataCount: bytes.readUInt32LE(36),
    fieldIndicesOffset: bytes.readUInt32LE(40),
    fieldIndicesCount: bytes.readUInt32LE(44),
    listIndicesOffset: bytes.readUInt32LE(48),
    listIndicesCount: bytes.readUInt32LE(52)
  };

  if (
    !isRangeWithinBuffer(bytes, header.structOffset, header.structCount * GFF_STRUCT_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.fieldOffset, header.fieldCount * GFF_FIELD_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.labelOffset, header.labelCount * GFF_LABEL_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.fieldDataOffset, header.fieldDataCount) ||
    !isRangeWithinBuffer(bytes, header.fieldIndicesOffset, header.fieldIndicesCount) ||
    !isRangeWithinBuffer(bytes, header.listIndicesOffset, header.listIndicesCount)
  ) {
    return null;
  }

  return header;
}

function parseLabels(bytes: Buffer, header: GffHeader): string[] {
  const labels: string[] = [];
  for (let index = 0; index < header.labelCount; index += 1) {
    const offset = header.labelOffset + index * GFF_LABEL_ENTRY_SIZE_BYTES;
    const raw = bytes.subarray(offset, offset + GFF_LABEL_ENTRY_SIZE_BYTES);
    const nullByteIndex = raw.indexOf(0);
    const usedLength = nullByteIndex >= 0 ? nullByteIndex : raw.length;
    labels.push(raw.subarray(0, usedLength).toString("ascii").trim());
  }
  return labels;
}

function parseStructs(bytes: Buffer, header: GffHeader): GffStructEntry[] {
  const structs: GffStructEntry[] = [];
  for (let index = 0; index < header.structCount; index += 1) {
    const offset = header.structOffset + index * GFF_STRUCT_ENTRY_SIZE_BYTES;
    structs.push({
      typeId: bytes.readUInt32LE(offset),
      dataOrOffset: bytes.readUInt32LE(offset + 4),
      fieldCount: bytes.readUInt32LE(offset + 8)
    });
  }
  return structs;
}

function resolveStructFieldIndices(
  bytes: Buffer,
  header: GffHeader,
  entry: GffStructEntry
): number[] | null {
  if (entry.fieldCount === 0) {
    return [];
  }

  if (entry.fieldCount === 1) {
    return [entry.dataOrOffset];
  }

  const start = header.fieldIndicesOffset + entry.dataOrOffset;
  const expectedSize = entry.fieldCount * 4;
  if (!isRangeWithinBuffer(bytes, start, expectedSize)) {
    return null;
  }

  const indices: number[] = [];
  for (let index = 0; index < entry.fieldCount; index += 1) {
    indices.push(bytes.readUInt32LE(start + index * 4));
  }
  return indices;
}

function parseRootFields(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structs: GffStructEntry[],
  fieldIndices: number[]
): ParsedGffFieldMap {
  return parseStructFields(bytes, header, labels, structs, fieldIndices, 0);
}

function parseStructFields(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structs: GffStructEntry[],
  fieldIndices: number[],
  depth: number
): ParsedGffFieldMap {
  const fields = new Map<string, ParsedGffValue>();
  for (const fieldIndex of fieldIndices) {
    if (fieldIndex < 0 || fieldIndex >= header.fieldCount) {
      continue;
    }

    const fieldOffset = header.fieldOffset + fieldIndex * GFF_FIELD_ENTRY_SIZE_BYTES;
    const typeId = bytes.readUInt32LE(fieldOffset);
    const labelIndex = bytes.readUInt32LE(fieldOffset + 4);
    const dataOrOffset = bytes.readUInt32LE(fieldOffset + 8);

    const label = (labels[labelIndex] ?? `field_${labelIndex}`).trim();
    if (!label) {
      continue;
    }

    const normalizedLabel = normalizeLabel(label);
    const value = parseFieldValue(bytes, header, labels, structs, typeId, dataOrOffset, depth);
    if (value !== undefined) {
      fields.set(normalizedLabel, value);
    }
  }
  return fields;
}

function parseFieldValue(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structs: GffStructEntry[],
  typeId: number,
  dataOrOffset: number,
  depth: number
): ParsedGffValue | undefined {
  if (typeId === FIELD_TYPE.BYTE || typeId === FIELD_TYPE.CHAR) {
    return dataOrOffset & 0xff;
  }
  if (typeId === FIELD_TYPE.WORD || typeId === FIELD_TYPE.SHORT) {
    return dataOrOffset & 0xffff;
  }
  if (typeId === FIELD_TYPE.DWORD || typeId === FIELD_TYPE.INT) {
    return dataOrOffset | 0;
  }
  if (typeId === FIELD_TYPE.FLOAT) {
    const inline = Buffer.allocUnsafe(4);
    inline.writeUInt32LE(dataOrOffset, 0);
    return inline.readFloatLE(0);
  }

  if (typeId === FIELD_TYPE.CEXOSTRING) {
    return readCExoString(bytes, header, dataOrOffset);
  }
  if (typeId === FIELD_TYPE.RESREF) {
    return readResRef(bytes, header, dataOrOffset);
  }
  if (typeId === FIELD_TYPE.CEXOLOCSTRING) {
    return readCExoLocString(bytes, header, dataOrOffset);
  }
  if (typeId === FIELD_TYPE.STRUCT) {
    return readStructSummary(bytes, header, labels, structs, dataOrOffset, depth);
  }
  if (typeId === FIELD_TYPE.LIST) {
    return readListSummary(bytes, header, labels, structs, dataOrOffset, depth);
  }

  return undefined;
}

function readStructSummary(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structs: GffStructEntry[],
  structIndex: number,
  depth: number
): ParsedGffStructSummary | undefined {
  const struct = structs[structIndex];
  if (!struct) {
    return undefined;
  }
  const fieldIndices = resolveStructFieldIndices(bytes, header, struct);
  if (!fieldIndices) {
    return undefined;
  }
  const fields =
    depth >= GFF_MAX_PARSED_NESTING_DEPTH
      ? new Map<string, ParsedGffValue>()
      : parseStructFields(bytes, header, labels, structs, fieldIndices, depth + 1);
  fields.set(GFF_STRUCT_TYPE_ID_FIELD, struct.typeId);
  return {
    typeId: struct.typeId,
    fields
  };
}

function readCExoString(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): string | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 4)) {
    return undefined;
  }

  const length = bytes.readUInt32LE(offset);
  const valueOffset = offset + 4;
  if (!isRangeWithinBuffer(bytes, valueOffset, length)) {
    return undefined;
  }

  return sanitizeUtf8(bytes.subarray(valueOffset, valueOffset + length).toString("utf-8"));
}

function readResRef(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): string | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 1)) {
    return undefined;
  }

  const length = bytes.readUInt8(offset);
  const valueOffset = offset + 1;
  if (!isRangeWithinBuffer(bytes, valueOffset, length)) {
    return undefined;
  }

  return sanitizeAscii(bytes.subarray(valueOffset, valueOffset + length).toString("ascii"));
}

function readCExoLocString(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): ParsedCExoLocString | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 12)) {
    return undefined;
  }

  const totalSize = bytes.readUInt32LE(offset);
  const strRef = bytes.readUInt32LE(offset + 4);
  const stringCount = bytes.readUInt32LE(offset + 8);
  if (!isRangeWithinBuffer(bytes, offset + 12, Math.max(totalSize - 8, 0))) {
    return undefined;
  }

  let cursor = offset + 12;
  const entries: string[] = [];
  for (let index = 0; index < stringCount; index += 1) {
    if (!isRangeWithinBuffer(bytes, cursor, 8)) {
      break;
    }
    // language id (u32) is currently not used by backend contract.
    cursor += 4;
    const textLength = bytes.readUInt32LE(cursor);
    cursor += 4;
    if (!isRangeWithinBuffer(bytes, cursor, textLength)) {
      break;
    }
    const text = sanitizeUtf8(bytes.subarray(cursor, cursor + textLength).toString("utf-8"));
    cursor += textLength;
    if (text.length > 0) {
      entries.push(text);
    }
  }

  return {
    strRef,
    text: entries[0] ?? "",
    entries
  };
}

function readListSummary(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structs: GffStructEntry[],
  dataOrOffset: number,
  depth: number
): ParsedGffListSummary | undefined {
  const offset = header.listIndicesOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 4)) {
    return undefined;
  }

  const count = bytes.readUInt32LE(offset);
  const bodyOffset = offset + 4;
  if (!isRangeWithinBuffer(bytes, bodyOffset, count * 4)) {
    return undefined;
  }

  const entries: ParsedGffFieldMap[] = [];
  if (depth >= GFF_MAX_PARSED_NESTING_DEPTH) {
    return { count, entries };
  }

  for (let index = 0; index < count; index += 1) {
    const structIndex = bytes.readUInt32LE(bodyOffset + index * 4);
    const struct = structs[structIndex];
    if (!struct) {
      continue;
    }
    const fieldIndices = resolveStructFieldIndices(bytes, header, struct);
    if (!fieldIndices) {
      continue;
    }
    const entryFields = parseStructFields(bytes, header, labels, structs, fieldIndices, depth + 1);
    entryFields.set(GFF_STRUCT_TYPE_ID_FIELD, struct.typeId);
    entries.push(entryFields);
  }

  return { count, entries };
}

function mapFieldsToTemplateBlueprint(
  header: GffHeader,
  rootStructTypeId: number,
  fields: ParsedGffFieldMap
): ParsedTemplateBlueprint {
  const templateResRef = readStringField(fields, [
    "templateresref",
    "resref",
    "tagresref"
  ]);
  const firstNameInfo = readNameInfoField(fields, ["firstname"]);
  const firstName = firstNameInfo.text;
  const lastNameInfo = readNameInfoField(fields, ["lastname"]);
  const lastName = lastNameInfo.text;
  const localizedNameInfo = readNameInfoField(fields, [
    "locname",
    "localizedname",
    "name",
    "displayname"
  ]);
  const localizedName = localizedNameInfo.text;
  const displayName = localizedName;
  const descriptionInfo = readNameInfoField(fields, ["description", "desc"]);
  const description = descriptionInfo.text;
  const identifiedDescriptionInfo = readNameInfoField(fields, [
    "descidentified",
    "descriptionidentified"
  ]);
  const identifiedDescription = identifiedDescriptionInfo.text;
  const comments = readStringField(fields, ["comment", "comments"]);
  const paletteId = readNumberField(fields, ["paletteid"]);
  const tag = readStringField(fields, ["tag"]);
  const conversation = readStringField(fields, ["conversation", "conv"]);
  const keyName = readStringField(fields, ["keyname", "key"]);
  const markUp = readNumberField(fields, ["markup"]);
  const markDown = readNumberField(fields, ["markdown"]);
  const blackMarket = readBooleanField(fields, ["blackmarket"]);
  const bmMarkDown = readNumberField(fields, ["bm_markdown", "bmmarkdown"]);
  const onOpenStore = readStringField(fields, ["onopenstore"]);
  const storeId = readNumberField(fields, ["id", "storeid"]);
  const plot = readBooleanField(fields, ["plot"]);
  const active = readBooleanField(fields, ["active"]);
  const difficulty = readNumberField(fields, ["difficulty"]);
  const difficultyIndex = readNumberField(fields, ["difficultyindex"]);
  const playerOnly = readBooleanField(fields, ["playeronly"]);
  const reset = readBooleanField(fields, ["reset"]);
  const resetTime = readNumberField(fields, ["resettime"]);
  const respawns = readNumberField(fields, ["respawns"]);
  const spawnOption = readNumberField(fields, ["spawnoption"]);
  const maxCreatures = readNumberField(fields, ["maxcreatures"]);
  const recCreatures = readNumberField(fields, ["reccreatures"]);
  const baseItem = readNumberField(fields, ["baseitem"]);
  const modelPart1 = readNumberField(fields, ["modelpart1"]);
  const modelPart2 = readNumberField(fields, ["modelpart2"]);
  const modelPart3 = readNumberField(fields, ["modelpart3"]);
  const cost = readNumberField(fields, ["cost"]);
  const addCost = readNumberField(fields, ["addcost"]);
  const costTable = readNumberField(fields, ["costtable"]);
  const costValue = readNumberField(fields, ["costvalue"]);
  const charges = readNumberField(fields, ["charges"]);
  const stackSize = readNumberField(fields, ["stacksize"]);
  const identified = readBooleanField(fields, ["identified"]);
  const stolen = readBooleanField(fields, ["stolen"]);
  const cursed = readBooleanField(fields, ["cursed"]);
  const modelResRef = readStringField(fields, ["modelname", "modelresref", "model"]);
  const appearanceId = readNumberField(fields, ["appearance", "appearance_type"]);
  const genericType = readNumberField(fields, [
    "generictype",
    "generic_type",
    "genericappearance",
    "genericappearancetype"
  ]);
  const animationState = readNumberField(fields, ["animationstate", "animation"]);
  const hasInventory = readBooleanField(fields, ["hasinventory", "inventory"]);
  const bodyBag = readBooleanField(fields, ["bodybag"]);
  const isPc = readBooleanField(fields, ["ispc"]);
  const isImmortal = readBooleanField(fields, ["isimmortal"]);
  const lootable = readBooleanField(fields, ["lootable"]);
  const noPermDeath = readBooleanField(fields, ["nopermdeath"]);
  const useable = readBooleanField(fields, ["useable", "usable"]);
  const isStatic = readBooleanField(fields, ["static"]);
  const autoRemoveKey = readBooleanField(fields, ["autoremovekey"]);
  const decayTime = readNumberField(fields, ["decaytime"]);
  const startingPackage = readBooleanField(fields, ["startingpackage"]);
  const closeLockDc = readNumberField(fields, ["closelockdc"]);
  const openLockDc = readNumberField(fields, ["openlockdc"]);
  const interruptable = readBooleanField(fields, ["interruptable", "interruptible"]);
  const invulnerable = readBooleanField(fields, ["invulnerable"]);
  const keyRequired = readBooleanField(fields, ["keyrequired"]);
  const lockable = readBooleanField(fields, ["lockable"]);
  const locked = readBooleanField(fields, ["locked"]);
  const trapDetectable = readBooleanField(fields, ["trapdetectable"]);
  const trapDetectDc = readNumberField(fields, ["trapdetectdc"]);
  const trapDisarmable = readBooleanField(fields, ["trapdisarmable"]);
  const disarmDc = readNumberField(fields, ["disarmdc"]);
  const trapFlag = readBooleanField(fields, ["trapflag"]);
  const trapOneShot = readBooleanField(fields, ["traponeshot"]);
  const trapType = readNumberField(fields, ["traptype"]);
  const hardness = readNumberField(fields, ["hardness"]);
  const lightState = readNumberField(fields, ["lightstate", "light"]);
  const gender = readNumberField(fields, ["gender"]);
  const race = readNumberField(fields, ["race"]);
  const subraceInfo = readNameInfoField(fields, ["subrace"]);
  const subrace = subraceInfo.text;
  const deityInfo = readNameInfoField(fields, ["deity"]);
  const deity = deityInfo.text;
  const phenotype = normalizeCreaturePhenotype(readNumberField(fields, ["phenotype"]));
  const portraitId = readNumberField(fields, ["portraitid"]);
  const portraitResRef = readStringField(fields, ["portrait"]);
  const soundSetFile = readNumberField(fields, ["soundsetfile"]);
  const appearanceHead = readNumberField(fields, ["appearance_head", "appearancehead"]);
  const bodyPartRFoot = readNumberField(fields, ["bodypart_rfoot", "armorpart_rfoot"]);
  const bodyPartLFoot = readNumberField(fields, ["bodypart_lfoot", "armorpart_lfoot"]);
  const bodyPartRShin = readNumberField(fields, ["bodypart_rshin", "armorpart_rshin"]);
  const bodyPartLShin = readNumberField(fields, ["bodypart_lshin", "armorpart_lshin"]);
  const bodyPartLThigh = readNumberField(fields, ["bodypart_lthigh", "armorpart_lthigh"]);
  const bodyPartRThigh = readNumberField(fields, ["bodypart_rthigh", "armorpart_rthigh"]);
  const bodyPartPelvis = readNumberField(fields, ["bodypart_pelvis", "armorpart_pelvis"]);
  const bodyPartTorso = readNumberField(fields, ["bodypart_torso", "armorpart_torso"]);
  const bodyPartBelt = readNumberField(fields, ["bodypart_belt", "armorpart_belt"]);
  const bodyPartNeck = readNumberField(fields, ["bodypart_neck", "armorpart_neck"]);
  const bodyPartRFArm = readNumberField(fields, ["bodypart_rfarm", "armorpart_rfarm"]);
  const bodyPartLFArm = readNumberField(fields, ["bodypart_lfarm", "armorpart_lfarm"]);
  const bodyPartRBicep = readNumberField(fields, ["bodypart_rbicep", "armorpart_rbicep"]);
  const bodyPartLBicep = readNumberField(fields, ["bodypart_lbicep", "armorpart_lbicep"]);
  const bodyPartRShoul = readNumberField(fields, ["bodypart_rshoul", "armorpart_rshoul"]);
  const bodyPartLShoul = readNumberField(fields, ["bodypart_lshoul", "armorpart_lshoul"]);
  const bodyPartRHand = readNumberField(fields, ["bodypart_rhand", "armorpart_rhand"]);
  const bodyPartLHand = readNumberField(fields, ["bodypart_lhand", "armorpart_lhand"]);
  const bodyPartRobe = readNumberField(fields, ["bodypart_robe", "armorpart_robe"]);
  const colorSkin = readNumberField(fields, ["color_skin"]);
  const colorHair = readNumberField(fields, ["color_hair"]);
  const colorTattoo1 = readNumberField(fields, ["color_tattoo1"]);
  const colorTattoo2 = readNumberField(fields, ["color_tattoo2"]);
  const leather1Color = readNumberField(fields, ["leather1color"]);
  const leather2Color = readNumberField(fields, ["leather2color"]);
  const cloth1Color = readNumberField(fields, ["cloth1color"]);
  const cloth2Color = readNumberField(fields, ["cloth2color"]);
  const metal1Color = readNumberField(fields, ["metal1color"]);
  const metal2Color = readNumberField(fields, ["metal2color"]);
  const wingsNew = readNumberField(fields, ["wings_new", "wingsnew", "wings"]);
  const tailNew = readNumberField(fields, ["tail_new", "tailnew", "tail"]);
  const walkRate = readNumberField(fields, ["walkrate"]);
  const factionId = readNumberField(fields, ["factionid", "faction"]);
  const challengeRating = readNumberField(fields, ["challengerating"]);
  const crAdjust = readNumberField(fields, ["cradjust"]);
  const perceptionRange = readNumberField(fields, ["perceptionrange"]);
  const disarmable = readBooleanField(fields, ["disarmable"]);
  const naturalAc = readNumberField(fields, ["naturalac"]);
  const hitPoints = readNumberField(fields, ["hitpoints"]);
  const currentHitPoints = readNumberField(fields, ["currenthitpoints", "currenthp"]);
  const maxHitPoints = readNumberField(fields, ["maxhitpoints"]);
  const reflexBonus = readNumberField(fields, ["refbonus", "refsave"]);
  const willBonus = readNumberField(fields, ["willbonus", "willsave"]);
  const fortitudeBonus = readNumberField(fields, ["fortbonus", "fortsave"]);
  const strength = readNumberField(fields, ["str", "strength"]);
  const dexterity = readNumberField(fields, ["dex", "dexterity"]);
  const constitution = readNumberField(fields, ["con", "constitution"]);
  const intelligence = readNumberField(fields, ["int", "intelligence"]);
  const wisdom = readNumberField(fields, ["wis", "wisdom"]);
  const charisma = readNumberField(fields, ["cha", "charisma"]);
  const strengthAdjust = readNumberField(fields, ["stradjust", "strengthadjust"]);
  const dexterityAdjust = readNumberField(fields, ["dexadjust", "dexterityadjust"]);
  const constitutionAdjust = readNumberField(fields, ["conadjust", "constitutionadjust"]);
  const intelligenceAdjust = readNumberField(fields, ["intadjust", "intelligenceadjust"]);
  const wisdomAdjust = readNumberField(fields, ["wisadjust", "wisdomadjust"]);
  const charismaAdjust = readNumberField(fields, ["chaadjust", "charismaadjust"]);
  const goodEvil = readNumberField(fields, ["goodevil"]);
  const lawfulChaotic = readNumberField(fields, ["lawfulchaotic"]);
  const classListCount = readListCountField(fields, ["classlist"]);
  const skillListCount = readListCountField(fields, ["skilllist"]);
  const featListCount = readListCountField(fields, ["featlist"]);
  const templateListCount = readListCountField(fields, ["templatelist"]);
  const specAbilityListCount = readListCountField(fields, ["specabilitylist"]);
  const inventoryItemListCount = readListCountField(fields, ["itemlist"]);
  const equipItemListCount = readListCountField(fields, ["equip_itemlist", "equipitemlist"]);
  const itemPropertyListCount = readListCountField(fields, ["propertieslist"]);
  const classListEntries = readClassListEntries(fields);
  const featListEntries = readIdListEntries(fields, ["featlist"], ["feat", "featid"]);
  const templateListEntries = readIdListEntries(fields, ["templatelist"], ["templateid"]).map(
    (entry) => ({ templateId: entry.featId })
  );
  const specAbilityListEntries = readSpecAbilityListEntries(fields);
  const inventoryItemListEntries = readInventoryItemListEntries(fields);
  const equipItemListEntries = readEquippedItemListEntries(fields);
  const itemPropertyListEntries = readItemPropertyListEntries(fields);
  const storeListEntries = readStoreListEntries(fields);
  const storeListCount = readListCountField(fields, ["storelist"]);
  const storeItemListTotal = storeListEntries.reduce(
    (sum, bucket) => sum + bucket.itemListEntries.length,
    0
  );
  const willNotBuyBaseItems = readStoreRestrictedBaseItems(fields, ["willnotbuy"]);
  const willOnlyBuyBaseItems = readStoreRestrictedBaseItems(fields, ["willonlybuy"]);
  const encounterCreatureListEntries = readEncounterCreatureListEntries(fields);
  const encounterCreatureListCount = readListCountField(fields, ["creaturelist"]);
  const skillListEntries = readSkillListEntries(fields);
  const variableListEntries = readCreatureVariableListEntries(fields);
  const scripts = readScriptFields(fields);

  const dependencyRefs = dedupeStrings([
    modelResRef,
    conversation,
    portraitResRef,
    ...encounterCreatureListEntries
      .map((entry) => entry.resRef)
      .filter((value): value is string => Boolean(value && value.length > 0)),
    ...Object.values(scripts),
    onOpenStore,
    templateResRef,
    tag
  ].filter((value): value is string => Boolean(value && value.length > 0)));

  const vfxEvidence = collectVfxEvidence({
    tag,
    modelResRef,
    templateResRef,
    dependencyRefs
  });

  const dependencyFingerprint = buildDependencyFingerprint(dependencyRefs);
  const resolvedDisplayName = displayName ?? buildCreatureDisplayName(firstName, lastName);

  return {
    sourceFileType: header.fileType,
    sourceFileVersion: header.fileVersion,
    sourceStructTypeId: rootStructTypeId,
    templateResRef,
    firstName,
    firstNameStrRef: firstNameInfo.strRef,
    lastName,
    lastNameStrRef: lastNameInfo.strRef,
    localizedName,
    localizedNameStrRef: localizedNameInfo.strRef,
    displayName: resolvedDisplayName,
    description,
    descriptionStrRef: descriptionInfo.strRef,
    identifiedDescription,
    identifiedDescriptionStrRef: identifiedDescriptionInfo.strRef,
    comments,
    paletteId: Number.isFinite(paletteId ?? Number.NaN) ? paletteId : undefined,
    tag,
    conversation,
    keyName,
    markUp: Number.isFinite(markUp ?? Number.NaN) ? markUp : undefined,
    markDown: Number.isFinite(markDown ?? Number.NaN) ? markDown : undefined,
    blackMarket,
    bmMarkDown: Number.isFinite(bmMarkDown ?? Number.NaN) ? bmMarkDown : undefined,
    onOpenStore,
    storeId: Number.isFinite(storeId ?? Number.NaN) ? storeId : undefined,
    plot,
    active,
    difficulty: Number.isFinite(difficulty ?? Number.NaN) ? difficulty : undefined,
    difficultyIndex: Number.isFinite(difficultyIndex ?? Number.NaN)
      ? difficultyIndex
      : undefined,
    playerOnly,
    reset,
    resetTime: Number.isFinite(resetTime ?? Number.NaN) ? resetTime : undefined,
    respawns: Number.isFinite(respawns ?? Number.NaN) ? respawns : undefined,
    spawnOption: Number.isFinite(spawnOption ?? Number.NaN) ? spawnOption : undefined,
    maxCreatures: Number.isFinite(maxCreatures ?? Number.NaN) ? maxCreatures : undefined,
    recCreatures: Number.isFinite(recCreatures ?? Number.NaN) ? recCreatures : undefined,
    baseItem: Number.isFinite(baseItem ?? Number.NaN) ? baseItem : undefined,
    modelPart1: Number.isFinite(modelPart1 ?? Number.NaN) ? modelPart1 : undefined,
    modelPart2: Number.isFinite(modelPart2 ?? Number.NaN) ? modelPart2 : undefined,
    modelPart3: Number.isFinite(modelPart3 ?? Number.NaN) ? modelPart3 : undefined,
    cost: Number.isFinite(cost ?? Number.NaN) ? cost : undefined,
    addCost: Number.isFinite(addCost ?? Number.NaN) ? addCost : undefined,
    costTable: Number.isFinite(costTable ?? Number.NaN) ? costTable : undefined,
    costValue: Number.isFinite(costValue ?? Number.NaN) ? costValue : undefined,
    charges: Number.isFinite(charges ?? Number.NaN) ? charges : undefined,
    stackSize: Number.isFinite(stackSize ?? Number.NaN) ? stackSize : undefined,
    identified,
    stolen,
    cursed,
    appearanceId: Number.isFinite(appearanceId ?? Number.NaN) ? appearanceId : undefined,
    genericType: Number.isFinite(genericType ?? Number.NaN) ? genericType : undefined,
    animationState: Number.isFinite(animationState ?? Number.NaN) ? animationState : undefined,
    modelResRef,
    hasInventory,
    bodyBag,
    isPc,
    isImmortal,
    lootable,
    noPermDeath,
    useable,
    isStatic,
    autoRemoveKey,
    decayTime: Number.isFinite(decayTime ?? Number.NaN) ? decayTime : undefined,
    startingPackage,
    closeLockDc: Number.isFinite(closeLockDc ?? Number.NaN) ? closeLockDc : undefined,
    openLockDc: Number.isFinite(openLockDc ?? Number.NaN) ? openLockDc : undefined,
    interruptable,
    invulnerable,
    keyRequired,
    lockable,
    locked,
    trapDetectable,
    trapDetectDc: Number.isFinite(trapDetectDc ?? Number.NaN) ? trapDetectDc : undefined,
    trapDisarmable,
    disarmDc: Number.isFinite(disarmDc ?? Number.NaN) ? disarmDc : undefined,
    trapFlag,
    trapOneShot,
    trapType: Number.isFinite(trapType ?? Number.NaN) ? trapType : undefined,
    hardness: Number.isFinite(hardness ?? Number.NaN) ? hardness : undefined,
    gender: Number.isFinite(gender ?? Number.NaN) ? gender : undefined,
    race: Number.isFinite(race ?? Number.NaN) ? race : undefined,
    subrace,
    subraceStrRef: subraceInfo.strRef,
    deity,
    deityStrRef: deityInfo.strRef,
    phenotype: Number.isFinite(phenotype ?? Number.NaN) ? phenotype : undefined,
    portraitId: Number.isFinite(portraitId ?? Number.NaN) ? portraitId : undefined,
    portraitResRef,
    soundSetFile: Number.isFinite(soundSetFile ?? Number.NaN) ? soundSetFile : undefined,
    appearanceHead: Number.isFinite(appearanceHead ?? Number.NaN) ? appearanceHead : undefined,
    bodyPartRFoot: Number.isFinite(bodyPartRFoot ?? Number.NaN) ? bodyPartRFoot : undefined,
    bodyPartLFoot: Number.isFinite(bodyPartLFoot ?? Number.NaN) ? bodyPartLFoot : undefined,
    bodyPartRShin: Number.isFinite(bodyPartRShin ?? Number.NaN) ? bodyPartRShin : undefined,
    bodyPartLShin: Number.isFinite(bodyPartLShin ?? Number.NaN) ? bodyPartLShin : undefined,
    bodyPartLThigh: Number.isFinite(bodyPartLThigh ?? Number.NaN)
      ? bodyPartLThigh
      : undefined,
    bodyPartRThigh: Number.isFinite(bodyPartRThigh ?? Number.NaN)
      ? bodyPartRThigh
      : undefined,
    bodyPartPelvis: Number.isFinite(bodyPartPelvis ?? Number.NaN) ? bodyPartPelvis : undefined,
    bodyPartTorso: Number.isFinite(bodyPartTorso ?? Number.NaN) ? bodyPartTorso : undefined,
    bodyPartBelt: Number.isFinite(bodyPartBelt ?? Number.NaN) ? bodyPartBelt : undefined,
    bodyPartNeck: Number.isFinite(bodyPartNeck ?? Number.NaN) ? bodyPartNeck : undefined,
    bodyPartRFArm: Number.isFinite(bodyPartRFArm ?? Number.NaN) ? bodyPartRFArm : undefined,
    bodyPartLFArm: Number.isFinite(bodyPartLFArm ?? Number.NaN) ? bodyPartLFArm : undefined,
    bodyPartRBicep: Number.isFinite(bodyPartRBicep ?? Number.NaN) ? bodyPartRBicep : undefined,
    bodyPartLBicep: Number.isFinite(bodyPartLBicep ?? Number.NaN) ? bodyPartLBicep : undefined,
    bodyPartRShoul: Number.isFinite(bodyPartRShoul ?? Number.NaN) ? bodyPartRShoul : undefined,
    bodyPartLShoul: Number.isFinite(bodyPartLShoul ?? Number.NaN) ? bodyPartLShoul : undefined,
    bodyPartRHand: Number.isFinite(bodyPartRHand ?? Number.NaN) ? bodyPartRHand : undefined,
    bodyPartLHand: Number.isFinite(bodyPartLHand ?? Number.NaN) ? bodyPartLHand : undefined,
    bodyPartRobe: Number.isFinite(bodyPartRobe ?? Number.NaN) ? bodyPartRobe : undefined,
    colorSkin: Number.isFinite(colorSkin ?? Number.NaN) ? colorSkin : undefined,
    colorHair: Number.isFinite(colorHair ?? Number.NaN) ? colorHair : undefined,
    colorTattoo1: Number.isFinite(colorTattoo1 ?? Number.NaN) ? colorTattoo1 : undefined,
    colorTattoo2: Number.isFinite(colorTattoo2 ?? Number.NaN) ? colorTattoo2 : undefined,
    leather1Color: Number.isFinite(leather1Color ?? Number.NaN) ? leather1Color : undefined,
    leather2Color: Number.isFinite(leather2Color ?? Number.NaN) ? leather2Color : undefined,
    cloth1Color: Number.isFinite(cloth1Color ?? Number.NaN) ? cloth1Color : undefined,
    cloth2Color: Number.isFinite(cloth2Color ?? Number.NaN) ? cloth2Color : undefined,
    metal1Color: Number.isFinite(metal1Color ?? Number.NaN) ? metal1Color : undefined,
    metal2Color: Number.isFinite(metal2Color ?? Number.NaN) ? metal2Color : undefined,
    wingsNew: Number.isFinite(wingsNew ?? Number.NaN) ? wingsNew : undefined,
    tailNew: Number.isFinite(tailNew ?? Number.NaN) ? tailNew : undefined,
    walkRate: Number.isFinite(walkRate ?? Number.NaN) ? walkRate : undefined,
    factionId: Number.isFinite(factionId ?? Number.NaN) ? factionId : undefined,
    challengeRating: Number.isFinite(challengeRating ?? Number.NaN)
      ? challengeRating
      : undefined,
    crAdjust: Number.isFinite(crAdjust ?? Number.NaN) ? crAdjust : undefined,
    perceptionRange: Number.isFinite(perceptionRange ?? Number.NaN)
      ? perceptionRange
      : undefined,
    disarmable,
    naturalAc: Number.isFinite(naturalAc ?? Number.NaN) ? naturalAc : undefined,
    hitPoints: Number.isFinite(hitPoints ?? Number.NaN) ? hitPoints : undefined,
    currentHitPoints: Number.isFinite(currentHitPoints ?? Number.NaN)
      ? currentHitPoints
      : undefined,
    maxHitPoints: Number.isFinite(maxHitPoints ?? Number.NaN) ? maxHitPoints : undefined,
    reflexBonus: Number.isFinite(reflexBonus ?? Number.NaN) ? reflexBonus : undefined,
    willBonus: Number.isFinite(willBonus ?? Number.NaN) ? willBonus : undefined,
    fortitudeBonus: Number.isFinite(fortitudeBonus ?? Number.NaN)
      ? fortitudeBonus
      : undefined,
    strength: Number.isFinite(strength ?? Number.NaN) ? strength : undefined,
    dexterity: Number.isFinite(dexterity ?? Number.NaN) ? dexterity : undefined,
    constitution: Number.isFinite(constitution ?? Number.NaN) ? constitution : undefined,
    intelligence: Number.isFinite(intelligence ?? Number.NaN) ? intelligence : undefined,
    wisdom: Number.isFinite(wisdom ?? Number.NaN) ? wisdom : undefined,
    charisma: Number.isFinite(charisma ?? Number.NaN) ? charisma : undefined,
    strengthAdjust: Number.isFinite(strengthAdjust ?? Number.NaN)
      ? strengthAdjust
      : undefined,
    dexterityAdjust: Number.isFinite(dexterityAdjust ?? Number.NaN)
      ? dexterityAdjust
      : undefined,
    constitutionAdjust: Number.isFinite(constitutionAdjust ?? Number.NaN)
      ? constitutionAdjust
      : undefined,
    intelligenceAdjust: Number.isFinite(intelligenceAdjust ?? Number.NaN)
      ? intelligenceAdjust
      : undefined,
    wisdomAdjust: Number.isFinite(wisdomAdjust ?? Number.NaN) ? wisdomAdjust : undefined,
    charismaAdjust: Number.isFinite(charismaAdjust ?? Number.NaN)
      ? charismaAdjust
      : undefined,
    goodEvil: Number.isFinite(goodEvil ?? Number.NaN) ? goodEvil : undefined,
    lawfulChaotic: Number.isFinite(lawfulChaotic ?? Number.NaN)
      ? lawfulChaotic
      : undefined,
    classListEntries: classListEntries.length > 0 ? classListEntries : undefined,
    featListEntries: featListEntries.length > 0 ? featListEntries : undefined,
    templateListEntries: templateListEntries.length > 0 ? templateListEntries : undefined,
    specAbilityListEntries:
      specAbilityListEntries.length > 0 ? specAbilityListEntries : undefined,
    inventoryItemListEntries:
      inventoryItemListEntries.length > 0 ? inventoryItemListEntries : undefined,
    equipItemListEntries: equipItemListEntries.length > 0 ? equipItemListEntries : undefined,
    itemPropertyListEntries:
      itemPropertyListEntries.length > 0 ? itemPropertyListEntries : undefined,
    storeListEntries: storeListEntries.length > 0 ? storeListEntries : undefined,
    storeListCount: Number.isFinite(storeListCount ?? Number.NaN)
      ? storeListCount
      : undefined,
    storeItemListTotal: storeItemListTotal > 0 ? storeItemListTotal : undefined,
    willNotBuyBaseItems: willNotBuyBaseItems.length > 0 ? willNotBuyBaseItems : undefined,
    willOnlyBuyBaseItems: willOnlyBuyBaseItems.length > 0 ? willOnlyBuyBaseItems : undefined,
    willNotBuyCount: willNotBuyBaseItems.length > 0 ? willNotBuyBaseItems.length : undefined,
    willOnlyBuyCount: willOnlyBuyBaseItems.length > 0 ? willOnlyBuyBaseItems.length : undefined,
    encounterCreatureListEntries:
      encounterCreatureListEntries.length > 0 ? encounterCreatureListEntries : undefined,
    encounterCreatureListCount: Number.isFinite(encounterCreatureListCount ?? Number.NaN)
      ? encounterCreatureListCount
      : undefined,
    skillListEntries: skillListEntries.length > 0 ? skillListEntries : undefined,
    variableListEntries: variableListEntries.length > 0 ? variableListEntries : undefined,
    classListCount: Number.isFinite(classListCount ?? Number.NaN) ? classListCount : undefined,
    skillListCount: Number.isFinite(skillListCount ?? Number.NaN) ? skillListCount : undefined,
    featListCount: Number.isFinite(featListCount ?? Number.NaN) ? featListCount : undefined,
    templateListCount: Number.isFinite(templateListCount ?? Number.NaN)
      ? templateListCount
      : undefined,
    specAbilityListCount: Number.isFinite(specAbilityListCount ?? Number.NaN)
      ? specAbilityListCount
      : undefined,
    inventoryItemListCount: Number.isFinite(inventoryItemListCount ?? Number.NaN)
      ? inventoryItemListCount
      : undefined,
    equipItemListCount: Number.isFinite(equipItemListCount ?? Number.NaN)
      ? equipItemListCount
      : undefined,
    itemPropertyListCount: Number.isFinite(itemPropertyListCount ?? Number.NaN)
      ? itemPropertyListCount
      : undefined,
    lightState: Number.isFinite(lightState ?? Number.NaN) ? lightState : undefined,
    scripts,
    dependencyRefs,
    dependencyFingerprint,
    vfxEvidence
  };
}

function readStringField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): string | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (typeof raw === "string") {
      const normalized = sanitizeAscii(raw);
      if (normalized.length > 0) {
        return normalized;
      }
    }
  }
  return undefined;
}

function readNameField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): string | undefined {
  return readNameInfoField(fields, aliases).text;
}

function readNameInfoField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): ParsedNameField {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (typeof raw === "string") {
      const normalized = sanitizeUtf8(raw);
      if (normalized.length > 0) {
        return { text: normalized };
      }
      continue;
    }
    if (isParsedLocString(raw)) {
      const loc = raw;
      const strRef = isValidTalkTableStrRef(loc.strRef) ? loc.strRef : undefined;
      if (typeof loc.text === "string" && loc.text.trim().length > 0) {
        return {
          text: sanitizeUtf8(loc.text),
          strRef
        };
      }
      return { strRef };
    }
  }
  return {};
}

function readNumberField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): number | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
  }
  return undefined;
}

function readBooleanField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): boolean | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (typeof raw === "number") {
      return raw !== 0;
    }
    if (typeof raw === "boolean") {
      return raw;
    }
  }
  return undefined;
}

function readListCountField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): number | undefined {
  const list = readListField(fields, aliases);
  return list?.count;
}

function readListField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): ParsedGffListSummary | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (isParsedListSummary(raw)) {
      return raw;
    }
  }
  return undefined;
}

function readStructField(
  fields: ParsedGffFieldMap,
  aliases: readonly string[]
): ParsedGffStructSummary | undefined {
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (isParsedStructSummary(raw)) {
      return raw;
    }
  }
  return undefined;
}

function readClassListEntries(
  fields: ParsedGffFieldMap
): Array<{
  classId?: number;
  level?: number;
  knownSpellCount?: number;
  memorizedSpellCount?: number;
  knownSpells?: Array<{
    spellId?: number;
    spellLevel?: number;
    metaMagic?: number;
    flags?: number;
  }>;
  memorizedSpells?: Array<{
    spellId?: number;
    spellLevel?: number;
    metaMagic?: number;
    flags?: number;
  }>;
}> {
  const list = readListField(fields, ["classlist"]);
  if (!list) {
    return [];
  }

  return list.entries
    .map((entry) => {
      const rawClassId = readNumberField(entry, ["class"]);
      const rawLevel = readNumberField(entry, ["classlevel"]);
      const classId = Number.isFinite(rawClassId ?? Number.NaN) ? (rawClassId as number) : 0;
      const level = Number.isFinite(rawLevel ?? Number.NaN) ? (rawLevel as number) : 0;
      const shouldReadKnownSpells = classId === 1 || classId === 9;
      const knownSpells = shouldReadKnownSpells
        ? [
            ...readClassSpellListEntries(entry, ["knownlist"]),
            ...readLeveledClassSpellListEntries(entry, "knownlist")
          ]
        : [];
      const memorizedSpells = [
        ...readClassSpellListEntries(entry, ["memorizedlist"]),
        ...readLeveledClassSpellListEntries(entry, "memorizedlist")
      ];
      const knownSpellCount = knownSpells.length > 0 ? knownSpells.length : undefined;
      const memorizedSpellCount =
        memorizedSpells.length > 0 ? memorizedSpells.length : undefined;
      return {
        classId,
        level,
        knownSpellCount,
        memorizedSpellCount,
        knownSpells: knownSpells.length > 0 ? knownSpells : undefined,
        memorizedSpells: memorizedSpells.length > 0 ? memorizedSpells : undefined
      };
    });
}

function readClassSpellListEntries(
  fields: ParsedGffFieldMap,
  listAliases: readonly string[]
): Array<{
  spellId?: number;
  spellLevel?: number;
  metaMagic?: number;
  flags?: number;
}> {
  const list = readListField(fields, listAliases);
  if (!list) {
    return [];
  }

  return list.entries
    .map((entry) => {
      const spellId = readNumberField(entry, ["spell"]);
      const metaMagic = readNumberField(entry, ["spellmetamagic"]);
      const flags = readNumberField(entry, ["spellflags"]);
      return {
        spellId: Number.isFinite(spellId ?? Number.NaN) ? (spellId as number) : 0,
        metaMagic: normalizeAuroraSpellMetaMagic(metaMagic),
        flags: normalizeAuroraSpellFlags(flags)
      };
    });
}

function readLeveledClassSpellListEntries(
  fields: ParsedGffFieldMap,
  baseAlias: "knownlist" | "memorizedlist"
): Array<{
  spellId?: number;
  spellLevel?: number;
  metaMagic?: number;
  flags?: number;
}> {
  const entries: Array<{
    spellId?: number;
    spellLevel?: number;
    metaMagic?: number;
    flags?: number;
  }> = [];

  for (let spellLevel = 0; spellLevel < 14; spellLevel += 1) {
    const levelEntries = readClassSpellListEntries(fields, [`${baseAlias}${spellLevel}`]);
    for (const entry of levelEntries) {
      entries.push({
        ...entry,
        spellLevel
      });
    }
  }

  return entries;
}

function readIdListEntries(
  fields: ParsedGffFieldMap,
  listAliases: readonly string[],
  idAliases: readonly string[]
): Array<{ featId?: number }> {
  const list = readListField(fields, listAliases);
  if (!list) {
    return [];
  }

  return list.entries
    .map((entry) => {
      const featId = readNumberField(entry, idAliases);
      return {
        featId: Number.isFinite(featId ?? Number.NaN) ? (featId as number) : 0
      };
    });
}

function readSpecAbilityListEntries(
  fields: ParsedGffFieldMap
): Array<{
  spellId?: number;
  flags?: number;
  casterLevel?: number;
}> {
  const list = readListField(fields, ["specabilitylist"]);
  if (!list) {
    return [];
  }

  return list.entries
    .map((entry) => {
      const spellId = readNumberField(entry, ["spell"]);
      const flags = readNumberField(entry, ["spellflags"]);
      const casterLevel = readNumberField(entry, ["spellcasterlevel"]);
      return {
        spellId: Number.isFinite(spellId ?? Number.NaN) ? (spellId as number) : 0,
        flags: normalizeAuroraSpellFlags(flags),
        casterLevel: normalizeAuroraSpecialAbilityCasterLevel(casterLevel)
      };
    });
}

function normalizeAuroraSpellMetaMagic(value: number | undefined): number {
  return Number.isFinite(value ?? Number.NaN)
    ? Math.max(0, Math.trunc(value as number))
    : AURORA_DEFAULT_SPELL_META_MAGIC;
}

function normalizeAuroraSpellFlags(value: number | undefined): number {
  const source = Number.isFinite(value ?? Number.NaN) ? Math.max(0, Math.trunc(value as number)) : 0;
  return source | AURORA_SPELL_FLAGS_RUNTIME_BIT;
}

function normalizeAuroraSpecialAbilityCasterLevel(value: number | undefined): number {
  const source = Number.isFinite(value ?? Number.NaN)
    ? Math.max(0, Math.trunc(value as number))
    : AURORA_DEFAULT_SPECIAL_ABILITY_CASTER_LEVEL;
  return Math.min(source, AURORA_MAX_SPECIAL_ABILITY_CASTER_LEVEL);
}

function readInventoryItemListEntries(
  fields: ParsedGffFieldMap
): Array<{
  resRef?: string;
  randomResRef?: string;
  randomList?: string;
  embeddedItem?: ParsedEmbeddedItemSummary;
  x?: number;
  y?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}> {
  const list = readListField(fields, ["itemlist"]);
  if (!list) {
    return [];
  }

  return list.entries
    .flatMap((entry) => {
      const resRef = readStringField(entry, ["inventoryres"]);
      const randomResRef = readStringField(entry, ["randomresref"]);
      const randomList = readStringField(entry, ["randomlist"]);
      const embeddedItem = readEmbeddedItemSummary(entry, ["item"]);
      if (!resRef && !randomResRef && !randomList && !embeddedItem) {
        return [];
      }
      const x = readNumberField(entry, ["repos_posx"]);
      const y = readNumberField(entry, ["repos_posy"]);
      return [{
        ...(resRef ? { resRef } : {}),
        ...(randomResRef ? { randomResRef } : {}),
        ...(randomList ? { randomList } : {}),
        ...(embeddedItem ? { embeddedItem } : {}),
        x: Number.isFinite(x ?? Number.NaN) ? (x as number) : 0,
        y: Number.isFinite(y ?? Number.NaN) ? (y as number) : 0,
        dropable: readBooleanField(entry, ["dropable", "droppable"]) ?? false,
        pickpocketable: readBooleanField(entry, ["pickpocketable"]) ?? false,
        infinite: readBooleanField(entry, ["infinite"]) ?? false
      }];
    });
}

function readEquippedItemListEntries(
  fields: ParsedGffFieldMap
): Array<{
  resRef?: string;
  randomResRef?: string;
  randomList?: string;
  embeddedItem?: ParsedEmbeddedItemSummary;
  slotMask?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}> {
  const list = readListField(fields, ["equip_itemlist", "equipitemlist"]);
  if (!list) {
    return [];
  }

  return list.entries
    .flatMap((entry) => {
      const resRef = readStringField(entry, ["equippedres"]);
      const randomResRef = readStringField(entry, ["randomresref"]);
      const randomList = readStringField(entry, ["randomlist"]);
      const embeddedItem = readEmbeddedItemSummary(entry, ["item"]);
      if (!resRef && !randomResRef && !randomList && !embeddedItem) {
        return [];
      }
      const slotMask = readNumberField(entry, [GFF_STRUCT_TYPE_ID_FIELD]);
      return [{
        ...(resRef ? { resRef } : {}),
        ...(randomResRef ? { randomResRef } : {}),
        ...(randomList ? { randomList } : {}),
        ...(embeddedItem ? { embeddedItem } : {}),
        slotMask: Number.isFinite(slotMask ?? Number.NaN) ? slotMask : undefined,
        dropable: readBooleanField(entry, ["dropable", "droppable"]) ?? false,
        pickpocketable: readBooleanField(entry, ["pickpocketable"]) ?? false,
        infinite: readBooleanField(entry, ["infinite"]) ?? false
      }];
    });
}

function readEmbeddedItemSummary(
  fields: ParsedGffFieldMap,
  labels: string[]
): ParsedEmbeddedItemSummary | undefined {
  const embeddedItem = readStructField(fields, labels);
  if (!embeddedItem) {
    return undefined;
  }

  const embeddedFields = embeddedItem.fields;
  const nameInfo = readNameInfoField(embeddedFields, ["localizedname", "locname"]);
  const descriptionInfo = readNameInfoField(embeddedFields, ["description", "desc"]);
  const identifiedDescriptionInfo = readNameInfoField(embeddedFields, [
    "descidentified",
    "descriptionidentified"
  ]);
  const itemPropertyListEntries = readItemPropertyListEntries(embeddedFields);
  const rawItemPropertyListCount = readListCountField(embeddedFields, ["propertieslist"]);
  const itemPropertyListCount = Number.isFinite(rawItemPropertyListCount ?? Number.NaN)
    ? rawItemPropertyListCount
    : itemPropertyListEntries.length > 0
      ? itemPropertyListEntries.length
      : undefined;
  const scripts = readScriptFields(embeddedFields);
  return {
    sourceStructTypeId: embeddedItem.typeId,
    templateResRef: readStringField(embeddedFields, ["templateresref", "resref"]),
    tag: readStringField(embeddedFields, ["tag"]),
    localizedName: nameInfo.text,
    ...(Number.isFinite(nameInfo.strRef ?? Number.NaN)
      ? { localizedNameStrRef: nameInfo.strRef }
      : {}),
    description: descriptionInfo.text,
    ...(Number.isFinite(descriptionInfo.strRef ?? Number.NaN)
      ? { descriptionStrRef: descriptionInfo.strRef }
      : {}),
    identifiedDescription: identifiedDescriptionInfo.text,
    ...(Number.isFinite(identifiedDescriptionInfo.strRef ?? Number.NaN)
      ? { identifiedDescriptionStrRef: identifiedDescriptionInfo.strRef }
      : {}),
    comments: readStringField(embeddedFields, ["comment", "comments"]),
    paletteId: readNumberField(embeddedFields, ["paletteid"]),
    plot: readBooleanField(embeddedFields, ["plot"]),
    baseItem: readNumberField(embeddedFields, ["baseitem"]),
    modelPart1: readNumberField(embeddedFields, ["modelpart1"]),
    modelPart2: readNumberField(embeddedFields, ["modelpart2"]),
    modelPart3: readNumberField(embeddedFields, ["modelpart3"]),
    cost: readNumberField(embeddedFields, ["cost"]),
    addCost: readNumberField(embeddedFields, ["addcost"]),
    costTable: readNumberField(embeddedFields, ["costtable"]),
    costValue: readNumberField(embeddedFields, ["costvalue"]),
    charges: readNumberField(embeddedFields, ["charges"]),
    stackSize: readNumberField(embeddedFields, ["stacksize"]),
    identified: readBooleanField(embeddedFields, ["identified"]),
    stolen: readBooleanField(embeddedFields, ["stolen"]),
    cursed: readBooleanField(embeddedFields, ["cursed"]),
    bodyPartRFoot: readNumberField(embeddedFields, ["bodypart_rfoot", "armorpart_rfoot"]),
    bodyPartLFoot: readNumberField(embeddedFields, ["bodypart_lfoot", "armorpart_lfoot"]),
    bodyPartRShin: readNumberField(embeddedFields, ["bodypart_rshin", "armorpart_rshin"]),
    bodyPartLShin: readNumberField(embeddedFields, ["bodypart_lshin", "armorpart_lshin"]),
    bodyPartLThigh: readNumberField(embeddedFields, ["bodypart_lthigh", "armorpart_lthigh"]),
    bodyPartRThigh: readNumberField(embeddedFields, ["bodypart_rthigh", "armorpart_rthigh"]),
    bodyPartPelvis: readNumberField(embeddedFields, ["bodypart_pelvis", "armorpart_pelvis"]),
    bodyPartTorso: readNumberField(embeddedFields, ["bodypart_torso", "armorpart_torso"]),
    bodyPartBelt: readNumberField(embeddedFields, ["bodypart_belt", "armorpart_belt"]),
    bodyPartNeck: readNumberField(embeddedFields, ["bodypart_neck", "armorpart_neck"]),
    bodyPartRFArm: readNumberField(embeddedFields, ["bodypart_rfarm", "armorpart_rfarm"]),
    bodyPartLFArm: readNumberField(embeddedFields, ["bodypart_lfarm", "armorpart_lfarm"]),
    bodyPartRBicep: readNumberField(embeddedFields, ["bodypart_rbicep", "armorpart_rbicep"]),
    bodyPartLBicep: readNumberField(embeddedFields, ["bodypart_lbicep", "armorpart_lbicep"]),
    bodyPartRShoul: readNumberField(embeddedFields, ["bodypart_rshoul", "armorpart_rshoul"]),
    bodyPartLShoul: readNumberField(embeddedFields, ["bodypart_lshoul", "armorpart_lshoul"]),
    bodyPartRHand: readNumberField(embeddedFields, ["bodypart_rhand", "armorpart_rhand"]),
    bodyPartLHand: readNumberField(embeddedFields, ["bodypart_lhand", "armorpart_lhand"]),
    bodyPartRobe: readNumberField(embeddedFields, ["bodypart_robe", "armorpart_robe"]),
    leather1Color: readNumberField(embeddedFields, ["leather1color"]),
    leather2Color: readNumberField(embeddedFields, ["leather2color"]),
    cloth1Color: readNumberField(embeddedFields, ["cloth1color"]),
    cloth2Color: readNumberField(embeddedFields, ["cloth2color"]),
    metal1Color: readNumberField(embeddedFields, ["metal1color"]),
    metal2Color: readNumberField(embeddedFields, ["metal2color"]),
    itemPropertyListCount: Number.isFinite(itemPropertyListCount ?? Number.NaN)
      ? itemPropertyListCount
      : undefined,
    itemPropertyListEntries:
      itemPropertyListEntries.length > 0 ? itemPropertyListEntries : undefined,
    scripts: Object.keys(scripts).length > 0 ? scripts : undefined,
    fieldCount: Math.max(0, embeddedItem.fields.size - 1)
  };
}

/**
 * Reads every GFF type that Aurora's V3.2 container supports so callers can
 * merge authored fields without discarding unknown data from an existing UTC.
 */
export function parseRawGffDocument(bytes: Buffer): ParsedRawGffDocument | null {
  try {
    const header = parseHeader(bytes);
    if (!header) {
      return null;
    }
    const labels = parseLabels(bytes, header);
    const structs = parseStructs(bytes, header);
    const root = structs[0];
    if (!root) {
      return null;
    }
    const parsedRoot = parseRawGffStruct(bytes, header, labels, structs, 0, 0);
    if (!parsedRoot) {
      return null;
    }
    return {
      fileType: header.fileType,
      fileVersion: header.fileVersion,
      rootStructTypeId: parsedRoot.typeId,
      fields: parsedRoot.fields
    };
  } catch {
    return null;
  }
}

function parseRawGffStruct(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structs: GffStructEntry[],
  structIndex: number,
  depth: number
): { typeId: number; fields: SupportedGffField[] } | null {
  if (depth > GFF_MAX_PRESERVED_NESTING_DEPTH) {
    return null;
  }
  const struct = structs[structIndex];
  if (!struct) {
    return null;
  }
  const fieldIndices = resolveStructFieldIndices(bytes, header, struct);
  if (!fieldIndices) {
    return null;
  }
  const fields: SupportedGffField[] = [];
  for (const fieldIndex of fieldIndices) {
    const field = parseRawGffField(bytes, header, labels, structs, fieldIndex, depth);
    if (!field) {
      return null;
    }
    fields.push(field);
  }
  return { typeId: struct.typeId, fields };
}

function parseRawGffField(
  bytes: Buffer,
  header: GffHeader,
  labels: string[],
  structs: GffStructEntry[],
  fieldIndex: number,
  depth: number
): SupportedGffField | null {
  if (fieldIndex < 0 || fieldIndex >= header.fieldCount) {
    return null;
  }
  const fieldOffset = header.fieldOffset + fieldIndex * GFF_FIELD_ENTRY_SIZE_BYTES;
  const typeId = bytes.readUInt32LE(fieldOffset);
  const labelIndex = bytes.readUInt32LE(fieldOffset + 4);
  const dataOrOffset = bytes.readUInt32LE(fieldOffset + 8);
  const label = labels[labelIndex]?.trim();
  if (!label) {
    return null;
  }

  if (typeId === FIELD_TYPE.BYTE) {
    return { label, type: "byte", value: dataOrOffset & 0xff };
  }
  if (typeId === FIELD_TYPE.CHAR) {
    return { label, type: "char", value: readInlineSigned(dataOrOffset, 8) };
  }
  if (typeId === FIELD_TYPE.WORD) {
    return { label, type: "word", value: dataOrOffset & 0xffff };
  }
  if (typeId === FIELD_TYPE.SHORT) {
    return { label, type: "short", value: readInlineSigned(dataOrOffset, 16) };
  }
  if (typeId === FIELD_TYPE.DWORD) {
    return { label, type: "dword", value: dataOrOffset >>> 0 };
  }
  if (typeId === FIELD_TYPE.INT) {
    return { label, type: "int", value: dataOrOffset | 0 };
  }
  if (typeId === FIELD_TYPE.FLOAT) {
    const inline = Buffer.allocUnsafe(4);
    inline.writeUInt32LE(dataOrOffset, 0);
    return { label, type: "float", value: inline.readFloatLE(0) };
  }
  if (typeId === FIELD_TYPE.CEXOSTRING) {
    const value = readRawCExoString(bytes, header, dataOrOffset);
    return value === undefined ? null : { label, type: "cexostring", value };
  }
  if (typeId === FIELD_TYPE.RESREF) {
    const value = readRawResRef(bytes, header, dataOrOffset);
    return value === undefined ? null : { label, type: "resref", value };
  }
  if (typeId === FIELD_TYPE.CEXOLOCSTRING) {
    const value = readRawCExoLocString(bytes, header, dataOrOffset);
    return value === undefined ? null : { label, type: "cexolocstring", value };
  }
  if (typeId === FIELD_TYPE.DWORD64 || typeId === FIELD_TYPE.INT64 || typeId === FIELD_TYPE.DOUBLE) {
    const offset = resolveRawFieldDataOffset(header, dataOrOffset, 8);
    if (offset === undefined) {
      return null;
    }
    if (typeId === FIELD_TYPE.DWORD64) {
      return { label, type: "dword64", value: bytes.readBigUInt64LE(offset) };
    }
    if (typeId === FIELD_TYPE.INT64) {
      return { label, type: "int64", value: bytes.readBigInt64LE(offset) };
    }
    return { label, type: "double", value: bytes.readDoubleLE(offset) };
  }
  if (typeId === FIELD_TYPE.VOID) {
    const offset = resolveRawFieldDataOffset(header, dataOrOffset, 4);
    if (offset === undefined) {
      return null;
    }
    const length = bytes.readUInt32LE(offset);
    const valueOffset = resolveRawFieldDataOffset(header, dataOrOffset + 4, length);
    return valueOffset === undefined
      ? null
      : { label, type: "void", value: Buffer.from(bytes.subarray(valueOffset, valueOffset + length)) };
  }
  if (typeId === FIELD_TYPE.STRUCT) {
    const value = parseRawGffStruct(bytes, header, labels, structs, dataOrOffset, depth + 1);
    return value ? { label, type: "struct", value } : null;
  }
  if (typeId === FIELD_TYPE.LIST) {
    const offset = header.listIndicesOffset + dataOrOffset;
    if (!isRangeWithinBuffer(bytes, offset, 4)) {
      return null;
    }
    const count = bytes.readUInt32LE(offset);
    const bodyOffset = offset + 4;
    if (!isRangeWithinBuffer(bytes, bodyOffset, count * 4)) {
      return null;
    }
    const value: Array<{ typeId: number; fields: SupportedGffField[] }> = [];
    for (let index = 0; index < count; index += 1) {
      const structIndex = bytes.readUInt32LE(bodyOffset + index * 4);
      const entry = parseRawGffStruct(bytes, header, labels, structs, structIndex, depth + 1);
      if (!entry) {
        return null;
      }
      value.push(entry);
    }
    return { label, type: "list", value };
  }
  return null;
}

function readInlineSigned(value: number, bits: 8 | 16): number {
  const unsigned = bits === 8 ? value & 0xff : value & 0xffff;
  const sign = 1 << (bits - 1);
  return unsigned & sign ? unsigned - sign * 2 : unsigned;
}

function resolveRawFieldDataOffset(
  header: GffHeader,
  relativeOffset: number,
  length: number
): number | undefined {
  if (
    relativeOffset < 0 ||
    length < 0 ||
    relativeOffset > header.fieldDataCount ||
    length > header.fieldDataCount - relativeOffset
  ) {
    return undefined;
  }
  return header.fieldDataOffset + relativeOffset;
}

function readRawCExoString(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): string | undefined {
  const offset = resolveRawFieldDataOffset(header, dataOrOffset, 4);
  if (offset === undefined) {
    return undefined;
  }
  const length = bytes.readUInt32LE(offset);
  const valueOffset = resolveRawFieldDataOffset(header, dataOrOffset + 4, length);
  return valueOffset === undefined ? undefined : bytes.subarray(valueOffset, valueOffset + length).toString("utf-8");
}

function readRawResRef(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): string | undefined {
  const offset = resolveRawFieldDataOffset(header, dataOrOffset, 1);
  if (offset === undefined) {
    return undefined;
  }
  const length = bytes.readUInt8(offset);
  const valueOffset = resolveRawFieldDataOffset(header, dataOrOffset + 1, length);
  return valueOffset === undefined ? undefined : bytes.subarray(valueOffset, valueOffset + length).toString("ascii");
}

function readRawCExoLocString(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): { strRef: number; entries: Array<{ languageId: number; text: string }> } | undefined {
  const offset = resolveRawFieldDataOffset(header, dataOrOffset, 12);
  if (offset === undefined) {
    return undefined;
  }
  const totalSize = bytes.readUInt32LE(offset);
  if (totalSize < 8 || resolveRawFieldDataOffset(header, dataOrOffset, totalSize + 4) === undefined) {
    return undefined;
  }
  const strRef = bytes.readUInt32LE(offset + 4);
  const count = bytes.readUInt32LE(offset + 8);
  const end = offset + 4 + totalSize;
  const entries: Array<{ languageId: number; text: string }> = [];
  let cursor = offset + 12;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 8 > end) {
      return undefined;
    }
    const languageId = bytes.readUInt32LE(cursor);
    const textLength = bytes.readUInt32LE(cursor + 4);
    cursor += 8;
    if (cursor + textLength > end) {
      return undefined;
    }
    entries.push({
      languageId,
      text: bytes.subarray(cursor, cursor + textLength).toString("utf-8")
    });
    cursor += textLength;
  }
  return { strRef, entries };
}

function readItemPropertyListEntries(fields: ParsedGffFieldMap): ParsedItemPropertyListEntry[] {
  const list = readListField(fields, ["propertieslist"]);
  if (!list) {
    return [];
  }

  return list.entries
    .map((entry) => {
      const propertyName = readNumberField(entry, ["propertyname"]);
      const subtype = readNumberField(entry, ["subtype"]);
      const costTable = readNumberField(entry, ["costtable"]);
      const costValue = readNumberField(entry, ["costvalue"]);
      const param1 = readNumberField(entry, ["param1"]);
      const param1Value = readNumberField(entry, ["param1value"]);
      const chanceAppear = readNumberField(entry, ["chanceappear"]);
      return {
        propertyName: Number.isFinite(propertyName ?? Number.NaN) ? propertyName : undefined,
        subtype: Number.isFinite(subtype ?? Number.NaN) ? subtype : undefined,
        costTable: Number.isFinite(costTable ?? Number.NaN) ? costTable : undefined,
        costValue: Number.isFinite(costValue ?? Number.NaN) ? costValue : undefined,
        param1: Number.isFinite(param1 ?? Number.NaN) ? param1 : undefined,
        param1Value: Number.isFinite(param1Value ?? Number.NaN) ? param1Value : undefined,
        chanceAppear: Number.isFinite(chanceAppear ?? Number.NaN) ? chanceAppear : undefined
      };
    })
    .filter((entry) => Object.values(entry).some((value) => value !== undefined));
}

function readStoreListEntries(fields: ParsedGffFieldMap): ParsedStoreListBucketEntry[] {
  const list = readListField(fields, ["storelist"]);
  if (!list) {
    return [];
  }

  return list.entries.map((entry, index) => {
    const itemList = readListField(entry, ["itemlist"]);
    const itemListEntries = (itemList?.entries ?? [])
      .map((itemEntry) => {
        const resRef = readStringField(itemEntry, ["inventoryres"]);
        const randomResRef = readStringField(itemEntry, ["randomresref"]);
        const randomList = readStringField(itemEntry, ["randomlist"]);
        const embeddedItem = readEmbeddedItemSummary(itemEntry, ["item"]);
        const x = readNumberField(itemEntry, ["repos_posx"]);
        const y = readNumberField(itemEntry, ["repos_posy"]);
        const infinite = readBooleanField(itemEntry, ["infinite"]);
        return {
          ...(resRef ? { resRef } : {}),
          ...(randomResRef ? { randomResRef } : {}),
          ...(randomList ? { randomList } : {}),
          ...(embeddedItem ? { embeddedItem } : {}),
          ...(Number.isFinite(x ?? Number.NaN) ? { x } : {}),
          ...(Number.isFinite(y ?? Number.NaN) ? { y } : {}),
          ...(typeof infinite === "boolean" ? { infinite } : {})
        };
      })
      .filter((itemEntry) => Object.values(itemEntry).some((value) => value !== undefined));
    const bucketTypeId = readNumberField(entry, [GFF_STRUCT_TYPE_ID_FIELD]);
    return {
      bucketIndex: index,
      ...(Number.isFinite(bucketTypeId ?? Number.NaN) ? { bucketTypeId } : {}),
      itemListCount: Number.isFinite(itemList?.count ?? Number.NaN)
        ? itemList?.count ?? itemListEntries.length
        : itemListEntries.length,
      itemListEntries
    };
  });
}

function readStoreRestrictedBaseItems(
  fields: ParsedGffFieldMap,
  listAliases: readonly string[]
): number[] {
  const list = readListField(fields, listAliases);
  if (!list) {
    return [];
  }

  return list.entries
    .map((entry) => readNumberField(entry, ["baseitem"]))
    .filter((value): value is number => Number.isFinite(value ?? Number.NaN));
}

function readEncounterCreatureListEntries(
  fields: ParsedGffFieldMap
): Array<{
  resRef?: string;
  appearance?: number;
  challengeRating?: number;
  singleSpawn?: boolean;
}> {
  const list = readListField(fields, ["creaturelist"]);
  if (!list) {
    return [];
  }

  return list.entries.map((entry) => {
    const appearance = readNumberField(entry, ["appearance"]);
    const challengeRating = readNumberField(entry, ["cr", "challengerating"]);
    return {
      resRef: readStringField(entry, ["resref"]),
      appearance: Number.isFinite(appearance ?? Number.NaN) ? appearance : undefined,
      challengeRating: Number.isFinite(challengeRating ?? Number.NaN)
        ? challengeRating
        : undefined,
      singleSpawn: readBooleanField(entry, ["singlespawn"]) ?? false
    };
  });
}

function readSkillListEntries(
  fields: ParsedGffFieldMap
): Array<{
  rank?: number;
}> {
  const list = readListField(fields, ["skilllist"]);
  if (!list) {
    return [];
  }

  const entryCount = Math.max(AURORA_DEFAULT_CREATURE_SKILL_COUNT, list.entries.length);
  return Array.from({ length: entryCount }, (_, index) => {
    const entry = list.entries[index];
    const rank = entry ? readNumberField(entry, ["rank"]) : undefined;
    return {
      rank: Number.isFinite(rank ?? Number.NaN) ? rank : 0
    };
  });
}

function readCreatureVariableListEntries(
  fields: ParsedGffFieldMap
): Array<
  | { name: string; type: "int"; value: number }
  | { name: string; type: "float"; value: number }
  | { name: string; type: "string"; value: string }
> {
  const list = readListField(fields, ["vartable"]);
  if (!list) {
    return [];
  }
  const entries: Array<
    | { name: string; type: "int"; value: number }
    | { name: string; type: "float"; value: number }
    | { name: string; type: "string"; value: string }
  > = [];
  for (const entry of list.entries) {
    const name = readStringField(entry, ["name"]);
    const type = readNumberField(entry, ["type"]);
    const rawValue = entry.get("value");
    if (!name) {
      continue;
    }
    if (type === 1 && typeof rawValue === "number" && Number.isFinite(rawValue)) {
      entries.push({ name, type: "int", value: Math.trunc(rawValue) });
      continue;
    }
    if (type === 2 && typeof rawValue === "number" && Number.isFinite(rawValue)) {
      entries.push({ name, type: "float", value: rawValue });
      continue;
    }
    if (type === 3 && typeof rawValue === "string") {
      entries.push({ name, type: "string", value: rawValue });
    }
  }
  return entries;
}

function readScriptFields(fields: ParsedGffFieldMap): Record<string, string> {
  const scripts: Record<string, string> = {};
  for (const label of SCRIPT_FIELD_LABELS) {
    const value = fields.get(label);
    if (typeof value !== "string") {
      continue;
    }
    const normalized = sanitizeAscii(value);
    if (!normalized) {
      continue;
    }
    scripts[label] = normalized;
  }
  return scripts;
}

function buildCreatureDisplayName(
  firstName?: string,
  lastName?: string
): string | undefined {
  const combined = [firstName, lastName]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ")
    .trim();
  if (combined.length === 0) {
    return undefined;
  }
  return combined;
}

function normalizeCreaturePhenotype(value: number | undefined): number | undefined {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return undefined;
  }
  return value === 1 ? 0 : value;
}

function collectVfxEvidence(input: {
  tag?: string;
  modelResRef?: string;
  templateResRef?: string;
  dependencyRefs: string[];
}): string[] {
  const evidence: string[] = [];
  if (input.modelResRef && VFX_TEXT_PATTERN.test(input.modelResRef)) {
    evidence.push("modelResRef");
  }
  if (input.tag && VFX_TEXT_PATTERN.test(input.tag)) {
    evidence.push("tag");
  }
  if (input.templateResRef && VFX_TEXT_PATTERN.test(input.templateResRef)) {
    evidence.push("templateResRef");
  }
  if (input.dependencyRefs.some((entry) => VFX_TEXT_PATTERN.test(entry))) {
    evidence.push("dependencyRefs");
  }
  return dedupeStrings(evidence);
}

function buildDependencyFingerprint(dependencies: string[]): string {
  if (dependencies.length === 0) {
    return "none";
  }
  return dependencies.join("|");
}

function isRangeWithinBuffer(bytes: Buffer, offset: number, length: number): boolean {
  if (!Number.isFinite(offset) || !Number.isFinite(length)) {
    return false;
  }
  if (offset < 0 || length < 0) {
    return false;
  }
  if (offset > bytes.length) {
    return false;
  }
  if (offset + length > bytes.length) {
    return false;
  }
  return true;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

function isParsedLocString(value: ParsedGffValue | undefined): value is ParsedCExoLocString {
  return (
    typeof value === "object" &&
    value !== null &&
    "strRef" in value &&
    "entries" in value &&
    "text" in value
  );
}

function isValidTalkTableStrRef(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value !== 0xffffffff;
}

function isParsedListSummary(
  value: ParsedGffValue | undefined
): value is ParsedGffListSummary {
  return typeof value === "object" && value !== null && "count" in value;
}

function isParsedStructSummary(
  value: ParsedGffValue | undefined
): value is ParsedGffStructSummary {
  return typeof value === "object" && value !== null && "typeId" in value && "fields" in value;
}

function sanitizeAscii(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function sanitizeUtf8(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function dedupeStrings(values: readonly string[]): string[] {
  const output: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}
