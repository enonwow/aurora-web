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

interface ParsedGffListSummary {
  count: number;
}

type ParsedGffValue =
  | string
  | number
  | boolean
  | ParsedCExoLocString
  | ParsedGffListSummary;

type ParsedGffFieldMap = Map<string, ParsedGffValue>;

export interface ParsedTemplateBlueprint {
  sourceFileType: string;
  sourceFileVersion: string;
  sourceStructTypeId: number;
  templateResRef?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  description?: string;
  tag?: string;
  conversation?: string;
  keyName?: string;
  appearanceId?: number;
  animationState?: number;
  modelResRef?: string;
  hasInventory?: boolean;
  bodyBag?: boolean;
  useable?: boolean;
  isStatic?: boolean;
  autoRemoveKey?: boolean;
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
  deity?: string;
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
  wingsNew?: number;
  tailNew?: number;
  factionId?: number;
  challengeRating?: number;
  crAdjust?: number;
  perceptionRange?: number;
  naturalAc?: number;
  hitPoints?: number;
  currentHitPoints?: number;
  maxHitPoints?: number;
  reflexBonus?: number;
  willBonus?: number;
  fortitudeBonus?: number;
  goodEvil?: number;
  lawfulChaotic?: number;
  classListCount?: number;
  skillListCount?: number;
  featListCount?: number;
  templateListCount?: number;
  specAbilityListCount?: number;
  equipItemListCount?: number;
  scripts: Record<string, string>;
  dependencyRefs: string[];
  dependencyFingerprint: string;
  vfxEvidence: string[];
}

const GFF_HEADER_SIZE_BYTES = 56;
const GFF_STRUCT_ENTRY_SIZE_BYTES = 12;
const GFF_FIELD_ENTRY_SIZE_BYTES = 12;
const GFF_LABEL_ENTRY_SIZE_BYTES = 16;

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

const SCRIPT_FIELD_LABELS = [
  "onopen",
  "onclosed",
  "onused",
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

    const fields = parseRootFields(bytes, header, labels, rootFieldIndices);
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
  fieldIndices: number[]
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
    const value = parseFieldValue(bytes, header, typeId, dataOrOffset);
    if (value !== undefined) {
      fields.set(normalizedLabel, value);
    }
  }
  return fields;
}

function parseFieldValue(
  bytes: Buffer,
  header: GffHeader,
  typeId: number,
  dataOrOffset: number
): ParsedGffValue | undefined {
  if (typeId === FIELD_TYPE.BYTE || typeId === FIELD_TYPE.CHAR) {
    return (dataOrOffset & 0xff) > 0 ? 1 : 0;
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
  if (typeId === FIELD_TYPE.LIST) {
    return readListSummary(bytes, header, dataOrOffset);
  }

  return undefined;
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
  dataOrOffset: number
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

  return { count };
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
  const firstName = readNameField(fields, ["firstname"]);
  const lastName = readNameField(fields, ["lastname"]);
  const displayName = readNameField(fields, [
    "locname",
    "name",
    "displayname"
  ]);
  const description = readNameField(fields, ["description", "desc"]);
  const tag = readStringField(fields, ["tag"]);
  const conversation = readStringField(fields, ["conversation", "conv"]);
  const keyName = readStringField(fields, ["keyname", "key"]);
  const modelResRef = readStringField(fields, ["modelname", "modelresref", "model"]);
  const appearanceId = readNumberField(fields, ["appearance", "appearance_type"]);
  const animationState = readNumberField(fields, ["animationstate", "animation"]);
  const hasInventory = readBooleanField(fields, ["hasinventory", "inventory"]);
  const bodyBag = readBooleanField(fields, ["bodybag"]);
  const useable = readBooleanField(fields, ["useable", "usable"]);
  const isStatic = readBooleanField(fields, ["static"]);
  const autoRemoveKey = readBooleanField(fields, ["autoremovekey"]);
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
  const subrace = readStringField(fields, ["subrace"]);
  const deity = readStringField(fields, ["deity"]);
  const phenotype = readNumberField(fields, ["phenotype"]);
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
  const wingsNew = readNumberField(fields, ["wings_new", "wingsnew"]);
  const tailNew = readNumberField(fields, ["tail_new", "tailnew"]);
  const factionId = readNumberField(fields, ["factionid", "faction"]);
  const challengeRating = readNumberField(fields, ["challengerating"]);
  const crAdjust = readNumberField(fields, ["cradjust"]);
  const perceptionRange = readNumberField(fields, ["perceptionrange"]);
  const naturalAc = readNumberField(fields, ["naturalac"]);
  const hitPoints = readNumberField(fields, ["hitpoints"]);
  const currentHitPoints = readNumberField(fields, ["currenthitpoints", "currenthp"]);
  const maxHitPoints = readNumberField(fields, ["maxhitpoints"]);
  const reflexBonus = readNumberField(fields, ["refbonus"]);
  const willBonus = readNumberField(fields, ["willbonus"]);
  const fortitudeBonus = readNumberField(fields, ["fortbonus"]);
  const goodEvil = readNumberField(fields, ["goodevil"]);
  const lawfulChaotic = readNumberField(fields, ["lawfulchaotic"]);
  const classListCount = readListCountField(fields, ["classlist"]);
  const skillListCount = readListCountField(fields, ["skilllist"]);
  const featListCount = readListCountField(fields, ["featlist"]);
  const templateListCount = readListCountField(fields, ["templatelist"]);
  const specAbilityListCount = readListCountField(fields, ["specabilitylist"]);
  const equipItemListCount = readListCountField(fields, ["equip_itemlist", "equipitemlist"]);
  const scripts = readScriptFields(fields);

  const dependencyRefs = dedupeStrings([
    modelResRef,
    conversation,
    portraitResRef,
    ...Object.values(scripts),
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
    lastName,
    displayName: resolvedDisplayName,
    description,
    tag,
    conversation,
    keyName,
    appearanceId: Number.isFinite(appearanceId ?? Number.NaN) ? appearanceId : undefined,
    animationState: Number.isFinite(animationState ?? Number.NaN) ? animationState : undefined,
    modelResRef,
    hasInventory,
    bodyBag,
    useable,
    isStatic,
    autoRemoveKey,
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
    deity,
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
    wingsNew: Number.isFinite(wingsNew ?? Number.NaN) ? wingsNew : undefined,
    tailNew: Number.isFinite(tailNew ?? Number.NaN) ? tailNew : undefined,
    factionId: Number.isFinite(factionId ?? Number.NaN) ? factionId : undefined,
    challengeRating: Number.isFinite(challengeRating ?? Number.NaN)
      ? challengeRating
      : undefined,
    crAdjust: Number.isFinite(crAdjust ?? Number.NaN) ? crAdjust : undefined,
    perceptionRange: Number.isFinite(perceptionRange ?? Number.NaN)
      ? perceptionRange
      : undefined,
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
    goodEvil: Number.isFinite(goodEvil ?? Number.NaN) ? goodEvil : undefined,
    lawfulChaotic: Number.isFinite(lawfulChaotic ?? Number.NaN)
      ? lawfulChaotic
      : undefined,
    classListCount: Number.isFinite(classListCount ?? Number.NaN) ? classListCount : undefined,
    skillListCount: Number.isFinite(skillListCount ?? Number.NaN) ? skillListCount : undefined,
    featListCount: Number.isFinite(featListCount ?? Number.NaN) ? featListCount : undefined,
    templateListCount: Number.isFinite(templateListCount ?? Number.NaN)
      ? templateListCount
      : undefined,
    specAbilityListCount: Number.isFinite(specAbilityListCount ?? Number.NaN)
      ? specAbilityListCount
      : undefined,
    equipItemListCount: Number.isFinite(equipItemListCount ?? Number.NaN)
      ? equipItemListCount
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
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (typeof raw === "string") {
      const normalized = sanitizeUtf8(raw);
      if (normalized.length > 0) {
        return normalized;
      }
      continue;
    }
    if (isParsedLocString(raw)) {
      const loc = raw;
      if (typeof loc.text === "string" && loc.text.trim().length > 0) {
        return sanitizeUtf8(loc.text);
      }
    }
  }
  return undefined;
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
  for (const alias of aliases) {
    const raw = fields.get(alias);
    if (isParsedListSummary(raw)) {
      return raw.count;
    }
  }
  return undefined;
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

function isParsedListSummary(
  value: ParsedGffValue | undefined
): value is ParsedGffListSummary {
  return typeof value === "object" && value !== null && "count" in value;
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
