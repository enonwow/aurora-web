import type {
  SceneItemBaseItemCatalog,
  SceneItemBaseItemCatalogRow,
  SceneObjectItemArmorParts,
  SceneObjectItemBaseAppearanceProvenance,
  SceneObjectItemBaseAppearanceValue,
  SceneObjectItemMaterialColors,
  SceneObjectItemProperties,
} from "../contracts";

const SIGNED_INT_MAX = 0x7fff_ffff;
const WORD_MAX = 0xffff;
const BYTE_MAX = 0xff;
const MAX_CATALOG_ROWS = 4096;
const MAX_CATALOG_BYTES = 16 * 1024 * 1024;

export const ITEM_BASE_APPEARANCE_ARMOR_PART_KEYS = [
  "rFoot", "lFoot", "rShin", "lShin", "lThigh", "rThigh", "pelvis", "torso",
  "belt", "neck", "rFArm", "lFArm", "rBicep", "lBicep", "rShoul", "lShoul",
  "rHand", "lHand", "robe",
] as const satisfies readonly (keyof SceneObjectItemArmorParts)[];

export const ITEM_BASE_APPEARANCE_MATERIAL_COLOR_KEYS = [
  "leather1", "leather2", "cloth1", "cloth2", "metal1", "metal2",
] as const satisfies readonly (keyof SceneObjectItemMaterialColors)[];

export interface ItemBaseAppearanceDraftCandidate {
  readonly baseItem?: number;
  readonly modelPart1?: number;
  readonly modelPart2?: number;
  readonly modelPart3?: number;
  readonly armorParts?: Readonly<SceneObjectItemArmorParts>;
  readonly materialColors?: Readonly<SceneObjectItemMaterialColors>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}

function isBoundedText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= maximum &&
    !value.includes("\0");
}

function readExactNumericRecord<K extends string>(
  value: unknown,
  keys: readonly K[],
  maximum: number,
): Readonly<Record<K, number>> | null {
  if (!isRecord(value) || !hasExactKeys(value, keys) ||
    keys.some((key) => !isIntegerBetween(value[key], 0, maximum))) return null;
  return Object.freeze(Object.fromEntries(keys.map((key) => [key, value[key]]))) as
    Readonly<Record<K, number>>;
}

export function readItemBaseAppearanceValue(
  value: unknown,
): SceneObjectItemBaseAppearanceValue | null {
  if (!isRecord(value) || !hasExactKeys(value, ["baseItem", "modelType", "appearance"]) ||
    !isIntegerBetween(value.baseItem, 0, SIGNED_INT_MAX) || !isRecord(value.appearance)) {
    return null;
  }
  const baseItem = value.baseItem;
  if (value.modelType === 0) {
    if (!hasExactKeys(value.appearance, ["modelPart1"]) ||
      !isIntegerBetween(value.appearance.modelPart1, 0, WORD_MAX)) return null;
    return Object.freeze({
      baseItem,
      modelType: 0,
      appearance: Object.freeze({ modelPart1: value.appearance.modelPart1 }),
    });
  }
  if (value.modelType === 1) {
    if (!hasExactKeys(value.appearance, ["modelPart1", "materialColors"]) ||
      !isIntegerBetween(value.appearance.modelPart1, 0, WORD_MAX)) return null;
    const materialColors = readExactNumericRecord(
      value.appearance.materialColors,
      ITEM_BASE_APPEARANCE_MATERIAL_COLOR_KEYS,
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
      !isIntegerBetween(value.appearance.modelPart1, 0, WORD_MAX) ||
      !isIntegerBetween(value.appearance.modelPart2, 0, WORD_MAX) ||
      !isIntegerBetween(value.appearance.modelPart3, 0, WORD_MAX)) return null;
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
      ITEM_BASE_APPEARANCE_ARMOR_PART_KEYS,
      WORD_MAX,
    );
    const materialColors = readExactNumericRecord(
      value.appearance.materialColors,
      ITEM_BASE_APPEARANCE_MATERIAL_COLOR_KEYS,
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

function readCatalogRow(value: unknown, index: number): SceneItemBaseItemCatalogRow | null {
  if (!isRecord(value)) return null;
  const allowed = [
    "rowIndex", "nameStrRef", "label", "modelType", "itemClass", "displayName",
    "invSlotWidth", "invSlotHeight",
  ];
  if (Object.keys(value).some((key) => !allowed.includes(key)) || value.rowIndex !== index ||
    (value.nameStrRef !== undefined && !isIntegerBetween(value.nameStrRef, 0, 0xffff_ffff)) ||
    (value.label !== undefined && !isBoundedText(value.label, 256)) ||
    (value.modelType !== 0 && value.modelType !== 1 &&
      value.modelType !== 2 && value.modelType !== 3) ||
    (value.itemClass !== undefined && !isBoundedText(value.itemClass, 64)) ||
    (value.invSlotWidth !== undefined && !isIntegerBetween(value.invSlotWidth, 1, 10)) ||
    (value.invSlotHeight !== undefined && !isIntegerBetween(value.invSlotHeight, 1, 10)) ||
    !isBoundedText(value.displayName, 1024)) return null;
  return Object.freeze({
    rowIndex: index,
    ...(value.nameStrRef === undefined ? {} : { nameStrRef: value.nameStrRef }),
    ...(value.label === undefined ? {} : { label: value.label }),
    modelType: value.modelType,
    ...(value.itemClass === undefined ? {} : { itemClass: value.itemClass }),
    displayName: value.displayName,
    ...(value.invSlotWidth === undefined ? {} : { invSlotWidth: value.invSlotWidth }),
    ...(value.invSlotHeight === undefined ? {} : { invSlotHeight: value.invSlotHeight }),
  });
}

function validateCatalog(value: unknown): value is SceneItemBaseItemCatalog {
  if (!isRecord(value) || !hasExactKeys(value, ["descriptor", "rows"]) ||
    !isRecord(value.descriptor) || !Array.isArray(value.rows)) return false;
  const descriptor = value.descriptor;
  if (!hasExactKeys(descriptor, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes", "rowCount",
  ]) || descriptor.resourceName !== "baseitems.2da" ||
    !isBoundedText(descriptor.sourceObjectKey, 2048) ||
    (descriptor.sourceLayer !== "module" && descriptor.sourceLayer !== "hak" &&
      descriptor.sourceLayer !== "vanilla") ||
    typeof descriptor.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(descriptor.sha256) ||
    !isIntegerBetween(descriptor.sizeBytes, 1, MAX_CATALOG_BYTES) ||
    !isIntegerBetween(descriptor.rowCount, 1, MAX_CATALOG_ROWS) ||
    value.rows.length !== descriptor.rowCount) return false;
  return value.rows.every((row, index) => readCatalogRow(row, index) !== null);
}

export function readItemBaseItemCatalog(value: unknown): SceneItemBaseItemCatalog | null {
  if (!validateCatalog(value)) return null;
  return Object.freeze({
    descriptor: Object.freeze({ ...value.descriptor }),
    rows: Object.freeze(value.rows.map((row, index) => readCatalogRow(row, index)!)),
  });
}

export function readItemBaseAppearanceProvenance(
  value: unknown,
): SceneObjectItemBaseAppearanceProvenance | null {
  if (!isRecord(value) || !hasExactKeys(value, [
    "expectedValue", "tableSha256", "tableRowCount",
  ]) || typeof value.tableSha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.tableSha256) ||
    !isIntegerBetween(value.tableRowCount, 1, MAX_CATALOG_ROWS)) return null;
  const expectedValue = readItemBaseAppearanceValue(value.expectedValue);
  if (!expectedValue || expectedValue.baseItem >= value.tableRowCount) return null;
  return Object.freeze({
    expectedValue,
    tableSha256: value.tableSha256,
    tableRowCount: value.tableRowCount,
  });
}

export function bindItemBaseAppearanceProvenanceToCatalog(
  provenanceInput: unknown,
  catalogInput: unknown,
): SceneObjectItemBaseAppearanceProvenance | null {
  const provenance = readItemBaseAppearanceProvenance(provenanceInput);
  if (!provenance || !validateCatalog(catalogInput) ||
    catalogInput.descriptor.sha256 !== provenance.tableSha256 ||
    catalogInput.descriptor.rowCount !== provenance.tableRowCount) return null;
  const row = catalogInput.rows[provenance.expectedValue.baseItem];
  return row?.rowIndex === provenance.expectedValue.baseItem &&
    row.modelType === provenance.expectedValue.modelType
    ? provenance
    : null;
}

export function buildItemBaseAppearanceTarget(
  candidate: ItemBaseAppearanceDraftCandidate,
  catalogInput: unknown,
): SceneObjectItemBaseAppearanceValue | null {
  if (!validateCatalog(catalogInput) ||
    !isIntegerBetween(candidate.baseItem, 0, SIGNED_INT_MAX)) return null;
  const row = catalogInput.rows[candidate.baseItem];
  if (!row || row.rowIndex !== candidate.baseItem) return null;
  if (row.modelType === 0) {
    return readItemBaseAppearanceValue({
      baseItem: candidate.baseItem,
      modelType: 0,
      appearance: { modelPart1: candidate.modelPart1 },
    });
  }
  if (row.modelType === 1) {
    return readItemBaseAppearanceValue({
      baseItem: candidate.baseItem,
      modelType: 1,
      appearance: {
        modelPart1: candidate.modelPart1,
        materialColors: candidate.materialColors,
      },
    });
  }
  if (row.modelType === 2) {
    return readItemBaseAppearanceValue({
      baseItem: candidate.baseItem,
      modelType: 2,
      appearance: {
        modelPart1: candidate.modelPart1,
        modelPart2: candidate.modelPart2,
        modelPart3: candidate.modelPart3,
      },
    });
  }
  return readItemBaseAppearanceValue({
    baseItem: candidate.baseItem,
    modelType: 3,
    appearance: {
      armorParts: candidate.armorParts,
      materialColors: candidate.materialColors,
    },
  });
}

export function cloneItemBaseAppearanceValue(
  value: SceneObjectItemBaseAppearanceValue,
): SceneObjectItemBaseAppearanceValue {
  return readItemBaseAppearanceValue(value)!;
}

export function cloneItemBaseAppearanceProvenance(
  value: SceneObjectItemBaseAppearanceProvenance,
): SceneObjectItemBaseAppearanceProvenance {
  return readItemBaseAppearanceProvenance(value)!;
}

export function cloneItemBaseItemCatalog(
  value: SceneItemBaseItemCatalog,
): SceneItemBaseItemCatalog {
  return readItemBaseItemCatalog(value)!;
}

export function projectItemBaseAppearanceToProperties(
  current: SceneObjectItemProperties | undefined,
  target: SceneObjectItemBaseAppearanceValue,
): SceneObjectItemProperties {
  const result: SceneObjectItemProperties = { ...(current ?? {}) };
  delete result.modelPart1;
  delete result.modelPart2;
  delete result.modelPart3;
  delete result.modelParts;
  delete result.armorParts;
  delete result.materialColors;

  result.baseItem = target.baseItem;
  result.baseAppearance = cloneItemBaseAppearanceValue(target);
  if (target.modelType === 0) {
    result.modelPart1 = target.appearance.modelPart1;
    result.modelParts = [target.appearance.modelPart1];
  } else if (target.modelType === 1) {
    result.modelPart1 = target.appearance.modelPart1;
    result.modelParts = [target.appearance.modelPart1];
    result.materialColors = { ...target.appearance.materialColors };
  } else if (target.modelType === 2) {
    result.modelPart1 = target.appearance.modelPart1;
    result.modelPart2 = target.appearance.modelPart2;
    result.modelPart3 = target.appearance.modelPart3;
    result.modelParts = [
      target.appearance.modelPart1,
      target.appearance.modelPart2,
      target.appearance.modelPart3,
    ];
  } else {
    result.armorParts = { ...target.appearance.armorParts };
    result.materialColors = { ...target.appearance.materialColors };
  }
  return result;
}
