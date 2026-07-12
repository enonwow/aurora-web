import type {
  SceneObjectItemArmorParts,
  SceneObjectItemProperties,
  SceneObjectItemPropertyEntry
} from "../../scene/contracts";

const AURORA_CAST_SPELL_PROPERTY_NAME = 15;
const AURORA_WAND_BASE_ITEM = 46;
const AURORA_POTION_BASE_ITEM = 49;
const AURORA_SPELL_SCROLL_BASE_ITEM = 75;
const ARMOR_PART_KEYS: Array<keyof SceneObjectItemArmorParts> = [
  "rFoot",
  "lFoot",
  "rShin",
  "lShin",
  "lThigh",
  "rThigh",
  "pelvis",
  "torso",
  "belt",
  "neck",
  "rFArm",
  "lFArm",
  "rBicep",
  "lBicep",
  "rShoul",
  "lShoul",
  "rHand",
  "lHand",
  "robe"
];

export interface ItemCostChoiceOption {
  rowId?: number;
  value: number;
  cost?: number;
  potionCost?: number;
  wandCost?: number;
  casterLevel?: number;
  innateLevel?: number;
  spellIndex?: number;
  potionUse?: boolean;
  wandUse?: boolean;
  generalUse?: boolean;
}

export interface ItemCostPropertyOption {
  propertyName: number;
  cost?: number;
  costTableDefinition?: string;
  subtypeOptions?: readonly ItemCostChoiceOption[];
  costValueOptions?: readonly ItemCostChoiceOption[];
}

export interface ItemCostBreakdown {
  baseCost: number;
  stackSize?: number;
  ilrStackSize?: number;
  ilrStackStatus: "not-applicable" | "within-limit" | "exceeds-limit";
  armorPartCostModifierTotal: number;
  propertyCostSubtotal: number;
  castSpellPropertyCostSubtotal: number;
  preMultiplierSubtotal: number;
  itemMultiplier: number;
  multipliedSubtotal: number;
  costStackSize: number;
  baseArmorStackMultipliedSubtotal: number;
  propertyStackMultipliedSubtotal: number;
  stackMultipliedSubtotal: number;
  addCost: number;
  finalCost: number;
  resolvedPropertyCount: number;
  unresolvedPropertyCount: number;
  resolvedArmorPartCount: number;
  unresolvedArmorPartCount: number;
  castSpellPropertyCount: number;
}

function resolveIlrStackStatus(properties: SceneObjectItemProperties): Pick<
  ItemCostBreakdown,
  "stackSize" | "ilrStackSize" | "ilrStackStatus"
> {
  const stackSize = normalizeNonNegative(properties.stackSize);
  const ilrStackSize = normalizeNonNegative(properties.baseItemIlrStackSize);
  if (stackSize === undefined || ilrStackSize === undefined || ilrStackSize <= 0) {
    return {
      ...(stackSize !== undefined ? { stackSize } : {}),
      ...(ilrStackSize !== undefined ? { ilrStackSize } : {}),
      ilrStackStatus: "not-applicable"
    };
  }
  return {
    stackSize,
    ilrStackSize,
    ilrStackStatus: stackSize > ilrStackSize ? "exceeds-limit" : "within-limit"
  };
}

function resolveCostStackSize(properties: SceneObjectItemProperties): number {
  const stackSize = normalizeNonNegative(properties.stackSize);
  if (stackSize !== undefined && stackSize > 0) {
    return Math.trunc(stackSize);
  }
  const baseItemStacking = normalizeNonNegative(properties.baseItemStacking);
  if (baseItemStacking !== undefined && baseItemStacking > 0) {
    return Math.trunc(baseItemStacking);
  }
  return 1;
}

function normalizeNumber(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeNonNegative(value: number | undefined): number | undefined {
  const normalized = normalizeNumber(value);
  return normalized === undefined ? undefined : Math.max(0, normalized);
}

function roundAuroraCost(value: number): number {
  return Math.round(value);
}

function resolveChoiceCost(
  options: readonly ItemCostChoiceOption[] | undefined,
  value: number | undefined
): number | undefined {
  return normalizeNumber(resolveChoiceOption(options, value)?.cost);
}

function resolveChoiceOption(
  options: readonly ItemCostChoiceOption[] | undefined,
  value: number | undefined
): ItemCostChoiceOption | undefined {
  if (value === undefined) {
    return undefined;
  }
  return options?.find((option) => option.value === value || option.rowId === value);
}

function resolveArmorCost(properties: SceneObjectItemProperties): Pick<
  ItemCostBreakdown,
  "armorPartCostModifierTotal" | "resolvedArmorPartCount" | "unresolvedArmorPartCount"
> {
  if (!properties.armorPartCostModifiers) {
    return {
      armorPartCostModifierTotal: 0,
      resolvedArmorPartCount: 0,
      unresolvedArmorPartCount: 0
    };
  }

  let armorPartCostModifierTotal = 0;
  let resolvedArmorPartCount = 0;
  let unresolvedArmorPartCount = 0;

  ARMOR_PART_KEYS.forEach((key) => {
    const part = normalizeNumber(properties.armorParts?.[key]);
    if (part === undefined) {
      return;
    }
    const modifier = normalizeNumber(properties.armorPartCostModifiers?.[key]);
    if (modifier === undefined) {
      unresolvedArmorPartCount += 1;
      return;
    }
    armorPartCostModifierTotal += modifier;
    resolvedArmorPartCount += 1;
  });

  return {
    armorPartCostModifierTotal,
    resolvedArmorPartCount,
    unresolvedArmorPartCount
  };
}

function calculateCastSpellAggregate(costs: number[]): number {
  const sorted = [...costs].sort((left, right) => right - left);
  return sorted.reduce((subtotal, cost, index) => {
    if (index === 0) {
      return subtotal + roundAuroraCost(cost);
    }
    if (index === 1) {
      return subtotal + roundAuroraCost(cost * 0.75);
    }
    return subtotal + roundAuroraCost(cost * 0.5);
  }, 0);
}

function normalizeCostTableDefinition(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

function calculateStandardPropertyCost(
  propertyName: number,
  option: ItemCostPropertyOption | undefined,
  propertyBaseCost: number,
  subtypeCost: number | undefined,
  costValueCost: number | undefined
): { rawCost: number; correction: number } {
  const costTableDefinition = normalizeCostTableDefinition(option?.costTableDefinition);
  if (
    costTableDefinition === "iprp_meleecost" &&
    propertyBaseCost > 0 &&
    costValueCost !== undefined &&
    costValueCost > 0
  ) {
    return { rawCost: propertyBaseCost * costValueCost, correction: propertyName === 1 ? 0 : 1 };
  }
  if (
    (costTableDefinition === "iprp_trapcost" || costTableDefinition === "iprp_soakcost") &&
    subtypeCost !== undefined &&
    subtypeCost > 0 &&
    costValueCost !== undefined &&
    costValueCost > 0
  ) {
    return { rawCost: subtypeCost * costValueCost, correction: 0 };
  }
  if (
    costTableDefinition === "iprp_spelllvlimm" &&
    propertyBaseCost > 0 &&
    costValueCost !== undefined &&
    costValueCost > 0
  ) {
    return { rawCost: propertyBaseCost * costValueCost, correction: 0 };
  }
  if (costTableDefinition === "iprp_base1" && subtypeCost !== undefined && subtypeCost > 0) {
    return { rawCost: subtypeCost, correction: 0 };
  }

  return {
    rawCost:
      Math.max(0, propertyBaseCost) +
      Math.max(0, normalizeNonNegative(subtypeCost) ?? 0) +
      Math.max(0, normalizeNonNegative(costValueCost) ?? 0),
    correction: 0
  };
}

function resolveEffectiveSpellLevel(value: number | undefined): number | undefined {
  const normalized = normalizeNumber(value);
  if (normalized === undefined) {
    return undefined;
  }
  return normalized <= 0 ? 0.5 : normalized;
}

function resolveCastSpellUsageSupported(
  baseItem: number | undefined,
  subtypeOption: ItemCostChoiceOption | undefined,
  costValueOption: ItemCostChoiceOption | undefined
): boolean {
  if (!subtypeOption) {
    return true;
  }
  if (baseItem === AURORA_POTION_BASE_ITEM && subtypeOption.potionUse === false) {
    return false;
  }
  if (baseItem === AURORA_WAND_BASE_ITEM && subtypeOption.wandUse === false) {
    return false;
  }
  if (
    (baseItem === AURORA_POTION_BASE_ITEM || baseItem === AURORA_SPELL_SCROLL_BASE_ITEM) &&
    costValueOption?.potionCost === 0
  ) {
    return false;
  }
  if (baseItem === AURORA_WAND_BASE_ITEM && costValueOption?.wandCost === 0) {
    return false;
  }
  if (
    baseItem !== AURORA_POTION_BASE_ITEM &&
    baseItem !== AURORA_WAND_BASE_ITEM &&
    subtypeOption.generalUse === false
  ) {
    return false;
  }
  return true;
}

function resolveSpecialCastSpellCost(
  baseItem: number | undefined,
  subtypeOption: ItemCostChoiceOption | undefined,
  costValueOption: ItemCostChoiceOption | undefined
): number | undefined {
  const casterLevel = normalizeNumber(subtypeOption?.casterLevel);
  const innateLevel = resolveEffectiveSpellLevel(subtypeOption?.innateLevel);
  if (casterLevel === undefined || innateLevel === undefined) {
    return undefined;
  }
  if (baseItem === AURORA_POTION_BASE_ITEM) {
    return Math.max(0, casterLevel * innateLevel * 50);
  }
  if (baseItem === AURORA_SPELL_SCROLL_BASE_ITEM) {
    return Math.max(0, casterLevel * innateLevel * 100);
  }
  if (baseItem === AURORA_WAND_BASE_ITEM) {
    const chargeCostMultiplier = normalizeNumber(costValueOption?.cost) ?? 1;
    return Math.max(0, Math.trunc(casterLevel * innateLevel * 750 * chargeCostMultiplier));
  }
  return undefined;
}

export function calculateAuroraItemCostBreakdown(
  properties: SceneObjectItemProperties,
  propertyOptions: readonly ItemCostPropertyOption[] = []
): ItemCostBreakdown {
  const addCost = Math.max(0, Math.trunc(normalizeNumber(properties.addCost) ?? 0));
  const baseCost = Math.max(0, normalizeNumber(properties.baseItemBaseCost) ?? 0);
  const itemMultiplier = Math.max(0, normalizeNumber(properties.baseItemItemMultiplier) ?? 1);
  const baseItem = normalizeNumber(properties.baseItem);
  const ilrStack = resolveIlrStackStatus(properties);
  const armorCost = resolveArmorCost(properties);
  const propertyOptionsByName = new Map(
    propertyOptions.map((option) => [option.propertyName, option])
  );
  let propertyRawSubtotal = 0;
  let propertyCostCorrection = 0;
  let resolvedPropertyCount = 0;
  let unresolvedPropertyCount = 0;
  const castSpellCosts: number[] = [];

  (properties.propertyList ?? []).forEach((entry: SceneObjectItemPropertyEntry) => {
    const propertyName = normalizeNumber(entry.propertyName);
    if (propertyName === undefined) {
      unresolvedPropertyCount += 1;
      return;
    }
    const option = propertyOptionsByName.get(propertyName);
    const propertyBaseCost = normalizeNumber(option?.cost) ?? 0;
    const subtypeOption = resolveChoiceOption(option?.subtypeOptions, entry.subtype);
    const subtypeCost = normalizeNumber(subtypeOption?.cost);
    const costValueCost = resolveChoiceCost(option?.costValueOptions, entry.costValue);
    const hasCostValueTable = (option?.costValueOptions?.length ?? 0) > 0;

    if (propertyName === AURORA_CAST_SPELL_PROPERTY_NAME) {
      const costValueOption = resolveChoiceOption(option?.costValueOptions, entry.costValue);
      const specialCastSpellCost = resolveSpecialCastSpellCost(
        baseItem,
        subtypeOption,
        costValueOption
      );
      if (!resolveCastSpellUsageSupported(baseItem, subtypeOption, costValueOption)) {
        unresolvedPropertyCount += 1;
      } else if (specialCastSpellCost !== undefined) {
        castSpellCosts.push(specialCastSpellCost);
        resolvedPropertyCount += 1;
      } else if (subtypeCost !== undefined && costValueCost !== undefined) {
        castSpellCosts.push(Math.max(0, subtypeCost * costValueCost));
        resolvedPropertyCount += 1;
      } else {
        unresolvedPropertyCount += 1;
      }
      return;
    }

    const hasAnyCostData =
      (option?.cost !== undefined && option.cost !== 0) ||
      subtypeCost !== undefined ||
      costValueCost !== undefined;
    if (entry.costValue !== undefined && hasCostValueTable && costValueCost === undefined) {
      unresolvedPropertyCount += 1;
      return;
    }
    if (!hasAnyCostData) {
      return;
    }

    const resolvedCost = calculateStandardPropertyCost(
      propertyName,
      option,
      propertyBaseCost,
      subtypeCost,
      costValueCost
    );
    propertyRawSubtotal += resolvedCost.rawCost;
    propertyCostCorrection += resolvedCost.correction;
    resolvedPropertyCount += 1;
  });

  const propertyCostSubtotal =
    propertyRawSubtotal > 0
      ? Math.max(0, roundAuroraCost(Math.pow(propertyRawSubtotal, 2) * 1000) - propertyCostCorrection)
      : 0;
  const castSpellPropertyCostSubtotal = calculateCastSpellAggregate(castSpellCosts);
  const preMultiplierSubtotal =
    baseCost +
    armorCost.armorPartCostModifierTotal +
    propertyCostSubtotal +
    castSpellPropertyCostSubtotal;
  const costStackSize = resolveCostStackSize(properties);
  const baseArmorSubtotal = baseCost + armorCost.armorPartCostModifierTotal;
  const propertyAndCastSpellSubtotal = propertyCostSubtotal + castSpellPropertyCostSubtotal;
  const baseArmorStackMultipliedSubtotal =
    roundAuroraCost(baseArmorSubtotal * itemMultiplier) * costStackSize;
  const propertyStackMultipliedSubtotal = roundAuroraCost(
    propertyAndCastSpellSubtotal * itemMultiplier * costStackSize
  );
  const stackMultipliedSubtotal =
    baseArmorStackMultipliedSubtotal + propertyStackMultipliedSubtotal;
  const multipliedSubtotal = roundAuroraCost(preMultiplierSubtotal * itemMultiplier);
  const finalCost = Math.max(0, stackMultipliedSubtotal) + addCost;

  return {
    baseCost,
    ...ilrStack,
    armorPartCostModifierTotal: armorCost.armorPartCostModifierTotal,
    propertyCostSubtotal,
    castSpellPropertyCostSubtotal,
    preMultiplierSubtotal,
    itemMultiplier,
    multipliedSubtotal,
    costStackSize,
    baseArmorStackMultipliedSubtotal,
    propertyStackMultipliedSubtotal,
    stackMultipliedSubtotal,
    addCost,
    finalCost,
    resolvedPropertyCount,
    unresolvedPropertyCount,
    resolvedArmorPartCount: armorCost.resolvedArmorPartCount,
    unresolvedArmorPartCount: armorCost.unresolvedArmorPartCount,
    castSpellPropertyCount: castSpellCosts.length
  };
}
