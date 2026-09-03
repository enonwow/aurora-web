import {
  isExactEffectiveItemBaseItemsTwoDaTable,
  type EffectiveItemBaseItemModelType,
  type EffectiveItemBaseItemsTwoDaTable,
} from "../../catalog/domain/effective-item-base-items-two-da";

const SIGNED_INT_MAX = 0x7fff_ffff;
const WORD_MAX = 0xffff;
const BYTE_MAX = 0xff;

export const AREA_ITEM_ARMOR_PART_KEYS = [
  "rFoot", "lFoot", "rShin", "lShin", "lThigh", "rThigh", "pelvis", "torso",
  "belt", "neck", "rFArm", "lFArm", "rBicep", "lBicep", "rShoul", "lShoul",
  "rHand", "lHand", "robe",
] as const;
export const AREA_ITEM_MATERIAL_COLOR_KEYS = [
  "leather1", "leather2", "cloth1", "cloth2", "metal1", "metal2",
] as const;
export const AREA_ITEM_RAW_APPEARANCE_KEYS = [
  "modelPart1", "modelPart2", "modelPart3",
  ...AREA_ITEM_ARMOR_PART_KEYS,
  ...AREA_ITEM_MATERIAL_COLOR_KEYS,
] as const;

export type AreaItemArmorPartKey = typeof AREA_ITEM_ARMOR_PART_KEYS[number];
export type AreaItemMaterialColorKey = typeof AREA_ITEM_MATERIAL_COLOR_KEYS[number];
export type AreaItemRawAppearanceKey = typeof AREA_ITEM_RAW_APPEARANCE_KEYS[number];
export type AreaItemArmorParts = Readonly<Record<AreaItemArmorPartKey, number>>;
export type AreaItemMaterialColors = Readonly<Record<AreaItemMaterialColorKey, number>>;

export interface AreaItemBaseAppearanceRawStorage {
  readonly baseItem: number;
  readonly appearanceFields: Readonly<Partial<Record<AreaItemRawAppearanceKey, number>>>;
  readonly appearanceFieldOrder: readonly AreaItemRawAppearanceKey[];
}

export type AreaItemBaseAppearanceValue =
  | Readonly<{
      baseItem: number;
      modelType: 0;
      appearance: Readonly<{ modelPart1: number }>;
    }>
  | Readonly<{
      baseItem: number;
      modelType: 1;
      appearance: Readonly<{ modelPart1: number; materialColors: AreaItemMaterialColors }>;
    }>
  | Readonly<{
      baseItem: number;
      modelType: 2;
      appearance: Readonly<{ modelPart1: number; modelPart2: number; modelPart3: number }>;
    }>
  | Readonly<{
      baseItem: number;
      modelType: 3;
      appearance: Readonly<{ armorParts: AreaItemArmorParts; materialColors: AreaItemMaterialColors }>;
    }>;

export interface ExistingAreaItemBaseAppearanceProvenance {
  readonly expectedValue: AreaItemBaseAppearanceValue;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

export interface ExistingAreaItemBaseAppearanceMutation
  extends ExistingAreaItemBaseAppearanceProvenance {
  readonly value: AreaItemBaseAppearanceValue;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isUnsigned(value: unknown, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum;
}

function readExactNumericRecord<K extends string>(
  value: unknown,
  keys: readonly K[],
  maximum: number,
): Readonly<Record<K, number>> | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, keys)) return null;
  if (keys.some((key) => !isUnsigned(value[key], maximum))) return null;
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, value[key]]))) as
    Readonly<Record<K, number>>;
}

function readValue(value: unknown): AreaItemBaseAppearanceValue | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["baseItem", "modelType", "appearance"]) ||
    !isUnsigned(value.baseItem, SIGNED_INT_MAX) || !isPlainRecord(value.appearance)) return null;
  const baseItem = value.baseItem;
  if (value.modelType === 0) {
    if (!hasExactKeys(value.appearance, ["modelPart1"]) ||
      !isUnsigned(value.appearance.modelPart1, WORD_MAX)) return null;
    return Object.freeze({
      baseItem,
      modelType: 0,
      appearance: Object.freeze({ modelPart1: value.appearance.modelPart1 }),
    });
  }
  if (value.modelType === 1) {
    if (!hasExactKeys(value.appearance, ["modelPart1", "materialColors"]) ||
      !isUnsigned(value.appearance.modelPart1, WORD_MAX)) return null;
    const materialColors = readExactNumericRecord(
      value.appearance.materialColors,
      AREA_ITEM_MATERIAL_COLOR_KEYS,
      BYTE_MAX,
    );
    return materialColors ? Object.freeze({
      baseItem,
      modelType: 1,
      appearance: Object.freeze({ modelPart1: value.appearance.modelPart1, materialColors }),
    }) : null;
  }
  if (value.modelType === 2) {
    if (!hasExactKeys(value.appearance, ["modelPart1", "modelPart2", "modelPart3"]) ||
      !isUnsigned(value.appearance.modelPart1, WORD_MAX) ||
      !isUnsigned(value.appearance.modelPart2, WORD_MAX) ||
      !isUnsigned(value.appearance.modelPart3, WORD_MAX)) return null;
    return Object.freeze({
      baseItem,
      modelType: 2,
      appearance: Object.freeze({
        modelPart1: value.appearance.modelPart1,
        modelPart2: value.appearance.modelPart2,
        modelPart3: value.appearance.modelPart3,
      }),
    });
  }
  if (value.modelType === 3) {
    if (!hasExactKeys(value.appearance, ["armorParts", "materialColors"])) return null;
    const armorParts = readExactNumericRecord(
      value.appearance.armorParts,
      AREA_ITEM_ARMOR_PART_KEYS,
      WORD_MAX,
    );
    const materialColors = readExactNumericRecord(
      value.appearance.materialColors,
      AREA_ITEM_MATERIAL_COLOR_KEYS,
      BYTE_MAX,
    );
    return armorParts && materialColors ? Object.freeze({
      baseItem,
      modelType: 3,
      appearance: Object.freeze({ armorParts, materialColors }),
    }) : null;
  }
  return null;
}

export function readAreaItemBaseAppearanceValue(
  value: unknown,
): AreaItemBaseAppearanceValue | null {
  return readValue(value);
}

export function readItemBaseAppearanceRawStorage(
  value: unknown,
): AreaItemBaseAppearanceRawStorage | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "baseItem", "appearanceFields", "appearanceFieldOrder",
  ]) || !isUnsigned(value.baseItem, SIGNED_INT_MAX) ||
    !isPlainRecord(value.appearanceFields) || !Array.isArray(value.appearanceFieldOrder)) {
    return null;
  }
  const keys = Object.keys(value.appearanceFields);
  if (keys.some((key) => !AREA_ITEM_RAW_APPEARANCE_KEYS.includes(key as AreaItemRawAppearanceKey))) {
    return null;
  }
  const appearanceFields: Partial<Record<AreaItemRawAppearanceKey, number>> = {};
  for (const key of keys as AreaItemRawAppearanceKey[]) {
    const maximum = AREA_ITEM_MATERIAL_COLOR_KEYS.includes(key as AreaItemMaterialColorKey)
      ? BYTE_MAX
      : WORD_MAX;
    const candidate = value.appearanceFields[key];
    if (!isUnsigned(candidate, maximum)) return null;
    appearanceFields[key] = candidate;
  }
  if (value.appearanceFieldOrder.length !== keys.length ||
    value.appearanceFieldOrder.some((key) =>
      typeof key !== "string" ||
      !AREA_ITEM_RAW_APPEARANCE_KEYS.includes(key as AreaItemRawAppearanceKey)) ||
    new Set(value.appearanceFieldOrder).size !== value.appearanceFieldOrder.length ||
    value.appearanceFieldOrder.some((key) => !keys.includes(String(key)))) return null;
  return Object.freeze({
    baseItem: value.baseItem,
    appearanceFields: Object.freeze(appearanceFields),
    appearanceFieldOrder: Object.freeze(
      [...value.appearanceFieldOrder] as AreaItemRawAppearanceKey[],
    ),
  });
}

function expectedRawFieldOrder(modelType: EffectiveItemBaseItemModelType): readonly AreaItemRawAppearanceKey[] {
  if (modelType === 0) return ["modelPart1"];
  if (modelType === 1) return ["modelPart1", ...AREA_ITEM_MATERIAL_COLOR_KEYS];
  if (modelType === 2) return ["modelPart1", "modelPart2", "modelPart3"];
  return [...AREA_ITEM_ARMOR_PART_KEYS, ...AREA_ITEM_MATERIAL_COLOR_KEYS];
}

function valueFromRaw(
  raw: AreaItemBaseAppearanceRawStorage,
  modelType: EffectiveItemBaseItemModelType,
): AreaItemBaseAppearanceValue | null {
  const fields = raw.appearanceFields;
  const expectedOrder = expectedRawFieldOrder(modelType);
  if (raw.appearanceFieldOrder.length !== expectedOrder.length ||
    raw.appearanceFieldOrder.some((key, index) => key !== expectedOrder[index])) return null;
  if (modelType === 0) {
    return readValue({ baseItem: raw.baseItem, modelType, appearance: fields });
  }
  if (modelType === 1) {
    const { modelPart1, ...colors } = fields;
    return readValue({
      baseItem: raw.baseItem,
      modelType,
      appearance: { modelPart1, materialColors: colors },
    });
  }
  if (modelType === 2) {
    return readValue({ baseItem: raw.baseItem, modelType, appearance: fields });
  }
  return readValue({
    baseItem: raw.baseItem,
    modelType,
    appearance: {
      armorParts: Object.fromEntries(
        AREA_ITEM_ARMOR_PART_KEYS.map((key) => [key, fields[key]]),
      ),
      materialColors: Object.fromEntries(
        AREA_ITEM_MATERIAL_COLOR_KEYS.map((key) => [key, fields[key]]),
      ),
    },
  });
}

export function bindEffectiveBaseItemsTwoDaToItemBaseAppearance(
  raw: AreaItemBaseAppearanceRawStorage,
  tableInput: unknown,
): ExistingAreaItemBaseAppearanceProvenance | null {
  if (!isExactEffectiveItemBaseItemsTwoDaTable(tableInput)) return null;
  const table: EffectiveItemBaseItemsTwoDaTable = tableInput;
  const row = table.rows.find((candidate) => candidate.rowIndex === raw.baseItem);
  if (!row) return null;
  const expectedValue = valueFromRaw(raw, row.modelType);
  if (!expectedValue) return null;
  return Object.freeze({
    expectedValue,
    tableSha256: table.descriptor.sha256,
    tableRowCount: table.descriptor.rowCount,
  });
}

function valuesEqual(left: AreaItemBaseAppearanceValue, right: AreaItemBaseAppearanceValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function itemBaseAppearanceRawMatchesValue(
  raw: AreaItemBaseAppearanceRawStorage,
  expected: AreaItemBaseAppearanceValue,
): boolean {
  const resolved = valueFromRaw(raw, expected.modelType);
  return resolved !== null && valuesEqual(resolved, expected);
}

export function readExistingAreaItemBaseAppearanceProvenance(
  value: unknown,
): ExistingAreaItemBaseAppearanceProvenance | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "expectedValue", "tableSha256", "tableRowCount",
  ]) || typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !Number.isSafeInteger(value.tableRowCount) || Number(value.tableRowCount) < 1 ||
    Number(value.tableRowCount) > 4096) return null;
  const expectedValue = readValue(value.expectedValue);
  if (!expectedValue || expectedValue.baseItem >= Number(value.tableRowCount)) return null;
  return Object.freeze({
    expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: Number(value.tableRowCount),
  });
}

export function readExistingAreaItemBaseAppearanceMutation(
  value: unknown,
): ExistingAreaItemBaseAppearanceMutation | null {
  if (!isPlainRecord(value) || !hasExactKeys(value, [
    "expectedValue", "value", "tableSha256", "tableRowCount",
  ])) return null;
  const provenance = readExistingAreaItemBaseAppearanceProvenance({
    expectedValue: value.expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
  const target = readValue(value.value);
  if (!provenance || !target || target.baseItem >= provenance.tableRowCount ||
    valuesEqual(provenance.expectedValue, target)) return null;
  return Object.freeze({ ...provenance, value: target });
}
