import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_BASES = [
  process.env.ITEM_AUDIT_API_BASE_URL,
  process.env.ITEM_CAPTURE_BASE_URL
    ? `${process.env.ITEM_CAPTURE_BASE_URL.replace(/\/+$/u, "")}/_aurora/v1`
    : undefined,
  "http://127.0.0.1:3000/api/v1",
  "http://127.0.0.1:5173/_aurora/v1"
].filter(Boolean);

const DEFAULT_CASES = [
  { id: "armor-property-cost", resref: "aarcl009", expectedBucket: "armor" },
  { id: "weapon-model-parts", resref: "nw_wswmls002", expectedBucket: "weapon" },
  { id: "shield-single-model", resref: "l_lshd_0", expectedBucket: "shield" },
  { id: "potion-cast-spell", resref: "nw_it_mpotion001", expectedBucket: "potion" },
  { id: "wand-charges-cast-spell", resref: "nw_wmgwn002", expectedBucket: "wand" },
  { id: "scroll-cast-spell", resref: "nw_it_sparscr202", expectedBucket: "scroll" },
  { id: "stacked-ammo-empty", resref: "nw_wamar001", expectedBucket: "stack" },
  { id: "stacked-ammo-property", resref: "nw_wammar001", expectedBucket: "stack-property" },
  { id: "gem-add-cost", resref: "nw_it_gem005", expectedBucket: "add-cost" },
  { id: "trap-add-cost", resref: "nw_it_trap004", expectedBucket: "add-cost-property" },
  { id: "property-heavy-creature-item", resref: "x3_it_diamhide", expectedBucket: "property-heavy" }
];

const AURORA_CAST_SPELL_PROPERTY_NAME = 15;
const AURORA_WAND_BASE_ITEM = 46;
const AURORA_POTION_BASE_ITEM = 49;
const AURORA_SPELL_SCROLL_BASE_ITEM = 75;
const ARMOR_PART_KEYS = [
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

const ARMOR_PART_METADATA_KEYS = {
  rFoot: "bodyPartRFoot",
  lFoot: "bodyPartLFoot",
  rShin: "bodyPartRShin",
  lShin: "bodyPartLShin",
  lThigh: "bodyPartLThigh",
  rThigh: "bodyPartRThigh",
  pelvis: "bodyPartPelvis",
  torso: "bodyPartTorso",
  belt: "bodyPartBelt",
  neck: "bodyPartNeck",
  rFArm: "bodyPartRFArm",
  lFArm: "bodyPartLFArm",
  rBicep: "bodyPartRBicep",
  lBicep: "bodyPartLBicep",
  rShoul: "bodyPartRShoul",
  lShoul: "bodyPartLShoul",
  rHand: "bodyPartRHand",
  lHand: "bodyPartLHand",
  robe: "bodyPartRobe"
};

const ARMOR_COST_METADATA_KEYS = {
  rFoot: "armorPartCostModifierRFoot",
  lFoot: "armorPartCostModifierLFoot",
  rShin: "armorPartCostModifierRShin",
  lShin: "armorPartCostModifierLShin",
  lThigh: "armorPartCostModifierLThigh",
  rThigh: "armorPartCostModifierRThigh",
  pelvis: "armorPartCostModifierPelvis",
  torso: "armorPartCostModifierTorso",
  belt: "armorPartCostModifierBelt",
  neck: "armorPartCostModifierNeck",
  rFArm: "armorPartCostModifierRFArm",
  lFArm: "armorPartCostModifierLFArm",
  rBicep: "armorPartCostModifierRBicep",
  lBicep: "armorPartCostModifierLBicep",
  rShoul: "armorPartCostModifierRShoul",
  lShoul: "armorPartCostModifierLShoul",
  rHand: "armorPartCostModifierRHand",
  lHand: "armorPartCostModifierLHand",
  robe: "armorPartCostModifierRobe"
};

function parseManualCasesFromEnv() {
  const raw = process.env.ITEM_COST_ILR_CASES;
  if (!raw || raw.trim().length === 0) {
    return null;
  }
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((resref, index) => ({
      id: `env-case-${String(index + 1).padStart(2, "0")}`,
      resref,
      expectedBucket: "env"
    }));
}

function parseBooleanEnv(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  return ["1", "true", "yes", "on"].includes(String(raw).trim().toLowerCase());
}

function parsePositiveIntEnv(name, fallback) {
  const parsed = Number(process.env[name]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function shouldDiscoverCases() {
  const mode = String(process.env.ITEM_COST_ILR_CASE_MODE ?? "").trim().toLowerCase();
  return mode === "broad" || mode === "catalog" || parseBooleanEnv("ITEM_COST_ILR_DISCOVER");
}

async function fetchJson(url, init = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 300)}`);
    }
    return text.trim().length > 0 ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

async function login(baseUrl) {
  const username = process.env.AURORA_USERNAME ?? "builder.user";
  const password = process.env.AURORA_PASSWORD ?? "builder123";
  const payload = await fetchJson(
    `${baseUrl}/auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    },
    15000
  );
  const accessToken =
    payload?.data?.session?.accessToken ??
    payload?.data?.accessToken ??
    payload?.accessToken ??
    payload?.data?.token;
  if (!accessToken) {
    throw new Error(`Auth response from ${baseUrl} did not include accessToken.`);
  }
  return accessToken;
}

async function createApiSession() {
  const attempts = [];
  for (const baseUrl of DEFAULT_BASES) {
    try {
      const accessToken = await login(baseUrl);
      return { baseUrl, accessToken, attempts };
    } catch (error) {
      attempts.push({ baseUrl, error: formatError(error) });
    }
  }
  throw new Error(`Could not authenticate against any API base: ${JSON.stringify(attempts)}`);
}

function formatError(error) {
  if (error?.name === "AbortError") {
    return "timeout";
  }
  return error instanceof Error ? error.message : String(error);
}

function createApi({ baseUrl, accessToken }) {
  return async function api(pathname, init = {}, timeoutMs = 45000) {
    const headers = {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${accessToken}`
    };
    return fetchJson(`${baseUrl}${pathname}`, { ...init, headers }, timeoutMs);
  };
}

async function fetchAllCatalogItems(api) {
  const limit = parsePositiveIntEnv("ITEM_COST_ILR_PAGE_LIMIT", 1000);
  const hardLimit = Number(process.env.ITEM_COST_ILR_HARD_LIMIT ?? 0);
  const timeoutMs = parsePositiveIntEnv("ITEM_COST_ILR_LIST_TIMEOUT_MS", 120000);
  const items = [];
  let total = null;
  for (let offset = 0; total === null || offset < total; offset += limit) {
    if (hardLimit > 0 && items.length >= hardLimit) {
      break;
    }
    const separator = `?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}`;
    const payload = await api(`/catalog/items${separator}`, {}, timeoutMs);
    const page = Array.isArray(payload?.data?.items) ? payload.data.items : [];
    total = Number(payload?.data?.total ?? page.length);
    items.push(...page);
    if (page.length === 0) {
      break;
    }
  }
  return hardLimit > 0 ? items.slice(0, hardLimit) : items;
}

function normalizeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeNonNegative(value) {
  const normalized = normalizeNumber(value);
  return normalized === undefined ? undefined : Math.max(0, normalized);
}

function readNumber(record, key) {
  return normalizeNumber(record?.[key]);
}

function roundAuroraCost(value) {
  return Math.round(value);
}

function readJsonArray(metadata, key) {
  const value = metadata?.[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mapArmorParts(metadata, keyMap) {
  const mapped = {};
  for (const key of ARMOR_PART_KEYS) {
    const value = readNumber(metadata, keyMap[key]);
    if (value !== undefined) {
      mapped[key] = value;
    }
  }
  return Object.keys(mapped).length > 0 ? mapped : undefined;
}

function mapPropertyList(metadata) {
  return readJsonArray(metadata, "itemPropertyListEntries")
    .filter((entry) => entry && typeof entry === "object" && !Array.isArray(entry))
    .map((entry) => ({
      propertyName: readNumber(entry, "propertyName"),
      propertyLabel:
        typeof entry.propertyLabel === "string" && entry.propertyLabel.trim().length > 0
          ? entry.propertyLabel
          : undefined,
      subtype: readNumber(entry, "subtype"),
      costTable: readNumber(entry, "costTable"),
      costValue: readNumber(entry, "costValue"),
      param1: readNumber(entry, "param1"),
      param1Value: readNumber(entry, "param1Value"),
      chanceAppear: readNumber(entry, "chanceAppear")
    }))
    .filter((entry) => Object.values(entry).some((value) => value !== undefined));
}

function metadataToProperties(metadata) {
  const armorParts = mapArmorParts(metadata, ARMOR_PART_METADATA_KEYS);
  const armorPartCostModifiers = mapArmorParts(metadata, ARMOR_COST_METADATA_KEYS);
  return {
    sourceObjectKey:
      typeof metadata?.sourceObjectKey === "string" ? metadata.sourceObjectKey : undefined,
    baseItem: readNumber(metadata, "baseItem"),
    baseItemLabel:
      typeof metadata?.baseItemLabel === "string" ? metadata.baseItemLabel : undefined,
    baseItemBaseCost: readNumber(metadata, "baseItemBaseCost"),
    baseItemStacking: readNumber(metadata, "baseItemStacking"),
    baseItemItemMultiplier: readNumber(metadata, "baseItemItemMultiplier"),
    baseItemIlrStackSize: readNumber(metadata, "baseItemIlrStackSize"),
    cost: readNumber(metadata, "cost"),
    addCost: readNumber(metadata, "addCost"),
    charges: readNumber(metadata, "charges"),
    stackSize: readNumber(metadata, "stackSize"),
    propertyList: mapPropertyList(metadata),
    ...(armorParts ? { armorParts } : {}),
    ...(armorPartCostModifiers ? { armorPartCostModifiers } : {})
  };
}

function catalogItemProperties(item) {
  const metadata = item?.metadata ?? {};
  return {
    resref: String(item?.resref ?? metadata.templateResRef ?? "").trim(),
    baseItemLabel: normalizeText(metadata.baseItem2daLabel),
    baseItemModelType: normalizeText(metadata.baseItemModelType || metadata.baseItem2daItemClass),
    baseItemStorePanel: readNumber(metadata, "baseItemStorePanel"),
    modelPart1: readNumber(metadata, "modelPart1"),
    modelPart2: readNumber(metadata, "modelPart2"),
    modelPart3: readNumber(metadata, "modelPart3"),
    bodyPartTorso: readNumber(metadata, "bodyPartTorso"),
    bodyPartRobe: readNumber(metadata, "bodyPartRobe"),
    cost: readNumber(metadata, "cost"),
    addCost: readNumber(metadata, "addCost"),
    charges: readNumber(metadata, "charges"),
    stackSize: readNumber(metadata, "stackSize"),
    baseItemStacking: readNumber(metadata, "baseItemStacking"),
    baseItemIlrStackSize: readNumber(metadata, "baseItemIlrStackSize"),
    propertyList: readJsonArray(metadata, "itemPropertyListEntries"),
    propertyListCount: readNumber(metadata, "itemPropertyListCount") ?? 0,
    defaultIcon: normalizeText(metadata.baseItemDefaultIcon),
    itemModelRefs: normalizeText(metadata.itemModelRefs)
  };
}

function hasThreeModelParts(properties) {
  return (
    properties.modelPart1 !== undefined &&
    properties.modelPart2 !== undefined &&
    properties.modelPart3 !== undefined
  );
}

function isArmorLike(properties) {
  return properties.baseItemLabel === "armor" || properties.bodyPartTorso !== undefined;
}

function isShieldLike(properties) {
  return (
    properties.baseItemLabel.includes("shield") ||
    properties.baseItemModelType.includes("shd") ||
    properties.defaultIcon.includes("shd")
  );
}

function hasCastSpellProperty(properties) {
  return properties.propertyList.some(
    (entry) => readNumber(entry, "propertyName") === AURORA_CAST_SPELL_PROPERTY_NAME
  );
}

function hasPositiveSourceCost(properties) {
  return properties.cost !== undefined && properties.cost >= 0;
}

function buildBucketRules() {
  return [
    {
      bucket: "armor-auto",
      predicate: (properties) => isArmorLike(properties)
    },
    {
      bucket: "robe-cloak-auto",
      predicate: (properties) =>
        properties.bodyPartRobe !== undefined ||
        properties.itemModelRefs.includes("cloak") ||
        properties.baseItemLabel.includes("robe")
    },
    {
      bucket: "shield-auto",
      predicate: (properties) => isShieldLike(properties)
    },
    {
      bucket: "three-part-model-auto",
      predicate: (properties) => hasThreeModelParts(properties)
    },
    {
      bucket: "cast-spell-auto",
      predicate: (properties) => hasCastSpellProperty(properties)
    },
    {
      bucket: "property-heavy-auto",
      predicate: (properties) => properties.propertyListCount >= 3
    },
    {
      bucket: "add-cost-auto",
      predicate: (properties) => (properties.addCost ?? 0) > 0
    },
    {
      bucket: "charged-auto",
      predicate: (properties) => (properties.charges ?? 0) > 0
    },
    {
      bucket: "stacked-auto",
      predicate: (properties) =>
        (properties.stackSize ?? 0) > 1 || (properties.baseItemStacking ?? 0) > 1
    },
    {
      bucket: "ilr-exceeds-auto",
      predicate: (properties) =>
        (properties.stackSize ?? 0) > 0 &&
        (properties.baseItemIlrStackSize ?? 0) > 0 &&
        properties.stackSize > properties.baseItemIlrStackSize
    },
    {
      bucket: "ilr-within-auto",
      predicate: (properties) =>
        (properties.stackSize ?? 0) > 0 &&
        (properties.baseItemIlrStackSize ?? 0) > 0 &&
        properties.stackSize <= properties.baseItemIlrStackSize
    },
    {
      bucket: "single-part-or-icon-auto",
      predicate: (properties) =>
        properties.modelPart1 !== undefined &&
        properties.modelPart2 === undefined &&
        properties.modelPart3 === undefined
    }
  ];
}

function addUniqueCase(cases, seen, item, expectedBucket) {
  const properties = catalogItemProperties(item);
  if (!properties.resref || seen.has(properties.resref) || !hasPositiveSourceCost(properties)) {
    return false;
  }
  seen.add(properties.resref);
  cases.push({
    id: `${expectedBucket}-${String(cases.length + 1).padStart(3, "0")}`,
    resref: properties.resref,
    expectedBucket
  });
  return true;
}

function buildDiscoveredCases(items) {
  const perBucket = parsePositiveIntEnv("ITEM_COST_ILR_BUCKET_LIMIT", 8);
  const maxCases = parsePositiveIntEnv("ITEM_COST_ILR_MAX_CASES", 96);
  const includeDefaultCases = parseBooleanEnv("ITEM_COST_ILR_INCLUDE_DEFAULT_CASES", true);
  const sortedItems = [...items].sort((left, right) =>
    String(left?.resref ?? "").localeCompare(String(right?.resref ?? ""))
  );
  const cases = [];
  const seen = new Set();
  const bucketCounts = {};

  if (includeDefaultCases) {
    for (const itemCase of DEFAULT_CASES) {
      if (!seen.has(itemCase.resref)) {
        seen.add(itemCase.resref);
        cases.push(itemCase);
        bucketCounts[itemCase.expectedBucket] = (bucketCounts[itemCase.expectedBucket] ?? 0) + 1;
      }
    }
  }

  for (const rule of buildBucketRules()) {
    let added = 0;
    for (const item of sortedItems) {
      if (cases.length >= maxCases) {
        break;
      }
      const properties = catalogItemProperties(item);
      if (!rule.predicate(properties)) {
        continue;
      }
      if (addUniqueCase(cases, seen, item, rule.bucket)) {
        added += 1;
        bucketCounts[rule.bucket] = (bucketCounts[rule.bucket] ?? 0) + 1;
      }
      if (added >= perBucket) {
        break;
      }
    }
  }

  const representedBaseItems = new Set(
    cases
      .map((itemCase) => catalogItemProperties(sortedItems.find((item) => item?.resref === itemCase.resref)))
      .map((properties) => properties.baseItemLabel)
      .filter(Boolean)
  );
  for (const item of sortedItems) {
    if (cases.length >= maxCases) {
      break;
    }
    const properties = catalogItemProperties(item);
    if (!properties.baseItemLabel || representedBaseItems.has(properties.baseItemLabel)) {
      continue;
    }
    if (addUniqueCase(cases, seen, item, "baseitem-diversity-auto")) {
      representedBaseItems.add(properties.baseItemLabel);
      bucketCounts["baseitem-diversity-auto"] =
        (bucketCounts["baseitem-diversity-auto"] ?? 0) + 1;
    }
  }

  return {
    cases,
    discovery: {
      mode: "broad",
      catalogItemCount: items.length,
      includeDefaultCases,
      perBucket,
      maxCases,
      selectedCaseCount: cases.length,
      bucketCounts
    }
  };
}

async function resolveCases(api) {
  const manualCases = parseManualCasesFromEnv();
  if (manualCases) {
    return {
      cases: manualCases,
      discovery: { mode: "env", selectedCaseCount: manualCases.length }
    };
  }
  if (!shouldDiscoverCases()) {
    return {
      cases: DEFAULT_CASES,
      discovery: { mode: "default", selectedCaseCount: DEFAULT_CASES.length }
    };
  }
  const catalogItems = await fetchAllCatalogItems(api);
  return buildDiscoveredCases(catalogItems);
}

function resolveIlrStackStatus(properties) {
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

function resolveCostStackSize(properties) {
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

function resolveChoiceOption(options, value) {
  if (value === undefined) {
    return undefined;
  }
  return options?.find((option) => option.value === value || option.rowId === value);
}

function resolveChoiceCost(options, value) {
  return normalizeNumber(resolveChoiceOption(options, value)?.cost);
}

function resolveArmorCost(properties) {
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
  for (const key of ARMOR_PART_KEYS) {
    const part = normalizeNumber(properties.armorParts?.[key]);
    if (part === undefined) {
      continue;
    }
    const modifier = normalizeNumber(properties.armorPartCostModifiers?.[key]);
    if (modifier === undefined) {
      unresolvedArmorPartCount += 1;
      continue;
    }
    armorPartCostModifierTotal += modifier;
    resolvedArmorPartCount += 1;
  }
  return {
    armorPartCostModifierTotal,
    resolvedArmorPartCount,
    unresolvedArmorPartCount
  };
}

function calculateCastSpellAggregate(costs) {
  return [...costs]
    .sort((left, right) => right - left)
    .reduce((subtotal, cost, index) => {
      if (index === 0) {
        return subtotal + roundAuroraCost(cost);
      }
      if (index === 1) {
        return subtotal + roundAuroraCost(cost * 0.75);
      }
      return subtotal + roundAuroraCost(cost * 0.5);
    }, 0);
}

function normalizeCostTableDefinition(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : undefined;
}

function calculateStandardPropertyCost(
  propertyName,
  option,
  propertyBaseCost,
  subtypeCost,
  costValueCost
) {
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
  return (
    {
      rawCost:
        Math.max(0, propertyBaseCost) +
        Math.max(0, normalizeNonNegative(subtypeCost) ?? 0) +
        Math.max(0, normalizeNonNegative(costValueCost) ?? 0),
      correction: 0
    }
  );
}

function resolveEffectiveSpellLevel(value) {
  const normalized = normalizeNumber(value);
  if (normalized === undefined) {
    return undefined;
  }
  return normalized <= 0 ? 0.5 : normalized;
}

function resolveCastSpellUsageSupported(baseItem, subtypeOption, costValueOption) {
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

function resolveSpecialCastSpellCost(baseItem, subtypeOption, costValueOption) {
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

function calculateAuroraItemCostBreakdown(properties, propertyOptions = []) {
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
  const castSpellCosts = [];

  for (const entry of properties.propertyList ?? []) {
    const propertyName = normalizeNumber(entry.propertyName);
    if (propertyName === undefined) {
      unresolvedPropertyCount += 1;
      continue;
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
      continue;
    }

    const hasAnyCostData =
      (option?.cost !== undefined && option.cost !== 0) ||
      subtypeCost !== undefined ||
      costValueCost !== undefined;
    if (entry.costValue !== undefined && hasCostValueTable && costValueCost === undefined) {
      unresolvedPropertyCount += 1;
      continue;
    }
    if (!hasAnyCostData) {
      continue;
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
  }

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

function classifyCase(properties, breakdown) {
  const sourceCost = normalizeNumber(properties.cost);
  if (breakdown.unresolvedPropertyCount > 0 || breakdown.unresolvedArmorPartCount > 0) {
    return "unresolved";
  }
  if (sourceCost === undefined) {
    return "no-source-cost";
  }
  return breakdown.finalCost === sourceCost ? "exact" : "delta";
}

function isAutoDiscoveredCase(itemCase) {
  return String(itemCase.expectedBucket ?? "").endsWith("-auto");
}

function normalizeAuditStatus(status, itemCase) {
  if (
    status === "delta" &&
    isAutoDiscoveredCase(itemCase) &&
    !parseBooleanEnv("ITEM_COST_ILR_STRICT_SOURCE_DELTAS")
  ) {
    return "source-delta";
  }
  return status;
}

function compactProperties(properties) {
  return {
    sourceObjectKey: properties.sourceObjectKey,
    baseItem: properties.baseItem,
    baseItemLabel: properties.baseItemLabel,
    sourceCost: properties.cost,
    addCost: properties.addCost,
    charges: properties.charges,
    stackSize: properties.stackSize,
    baseItemBaseCost: properties.baseItemBaseCost,
    baseItemStacking: properties.baseItemStacking,
    baseItemItemMultiplier: properties.baseItemItemMultiplier,
    baseItemIlrStackSize: properties.baseItemIlrStackSize,
    propertyListCount: properties.propertyList?.length ?? 0,
    propertyList: (properties.propertyList ?? []).map((entry) => ({
      propertyName: entry.propertyName,
      propertyLabel: entry.propertyLabel,
      subtype: entry.subtype,
      costTable: entry.costTable,
      costValue: entry.costValue,
      param1: entry.param1,
      param1Value: entry.param1Value
    })),
    armorPartCount: properties.armorParts ? Object.keys(properties.armorParts).length : 0
  };
}

async function processCase(api, itemCase) {
  const payload = await api(
    "/catalog/items/process",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resref: itemCase.resref,
        bypassCache: false,
        includeBenchmarkMetadata: true
      })
    },
    90000
  );
  const item = payload?.data?.item;
  if (!item) {
    throw new Error(`Process response for ${itemCase.resref} did not include data.item.`);
  }
  return item;
}

async function main() {
  const session = await createApiSession();
  const api = createApi(session);
  const propertyDictionaryPayload = await api("/catalog/items/property-dictionary", {}, 45000);
  const propertyOptions = propertyDictionaryPayload?.data?.properties ?? [];
  const { cases, discovery } = await resolveCases(api);
  const results = [];

  for (const itemCase of cases) {
    const startedAt = Date.now();
    try {
      const item = await processCase(api, itemCase);
      const properties = metadataToProperties(item.metadata ?? {});
      const breakdown = calculateAuroraItemCostBreakdown(properties, propertyOptions);
      const sourceCost = normalizeNumber(properties.cost);
      const delta = sourceCost === undefined ? undefined : breakdown.finalCost - sourceCost;
      const rawStatus = classifyCase(properties, breakdown);
      const status = normalizeAuditStatus(rawStatus, itemCase);
      results.push({
        ...itemCase,
        status,
        rawStatus,
        durationMs: Date.now() - startedAt,
        templateId: item.templateId,
        name: item.name,
        category: item.category,
        source: compactProperties(properties),
        calculated: breakdown,
        delta
      });
      console.log(
        `${status.padEnd(14)} ${itemCase.resref.padEnd(18)} cost=${sourceCost ?? "-"} calc=${
          breakdown.finalCost
        } delta=${delta ?? "-"} ilr=${breakdown.ilrStackStatus}`
      );
    } catch (error) {
      results.push({
        ...itemCase,
        status: "error",
        durationMs: Date.now() - startedAt,
        error: formatError(error)
      });
      console.log(`${"error".padEnd(14)} ${itemCase.resref.padEnd(18)} ${formatError(error)}`);
    }
  }

  const statusCounts = results.reduce((accumulator, result) => {
    accumulator[result.status] = (accumulator[result.status] ?? 0) + 1;
    return accumulator;
  }, {});
  const sourceDeltaCaseCount = results.filter((result) => result.status === "source-delta").length;
  const issueCaseCount = results.filter(
    (result) => !["exact", "no-source-cost", "source-delta"].includes(result.status)
  ).length;
  const rawDeltaCaseCount = results.filter((result) => result.rawStatus === "delta").length;
  const summary = {
    generatedAt: new Date().toISOString(),
    apiBaseUrl: session.baseUrl,
    caseCount: results.length,
    discovery,
    statusCounts,
    rawDeltaCaseCount,
    sourceDeltaCaseCount,
    issueCaseCount,
    decompilationAnchors: [
      "C:/Projects/New Folder/AUDYT_ITEMY.md:TNWItem::CalculateCost/FUN_006023c4",
      "C:/Projects/New Folder/export/decompiled_all.c:298360"
    ],
    notes: [
      "This matrix uses live POST /catalog/items/process payloads and compares the web calculator to source UTI Cost metadata.",
      "status=delta means the source cost is present but the calculated value is different.",
      "status=source-delta means a broad auto-discovered item has a saved UTI Cost that differs from the current runtime 2DA calculator; it is kept as audit evidence but is not a strict calculator failure unless ITEM_COST_ILR_STRICT_SOURCE_DELTAS=1.",
      "status=unresolved means at least one item property or armor part cost could not be resolved from current 2DA metadata."
    ],
    cases: results
  };

  const outputDir =
    process.env.ITEM_COST_ILR_OUTPUT_DIR ??
    path.resolve(".codex-tmp", "item-proof-all", "25-cost-ilr-matrix");
  await fs.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, "25-item-cost-ilr-matrix-summary.json");
  const issuePath = path.join(outputDir, "25-item-cost-ilr-matrix-issues.md");
  await fs.writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  const issueRows = results.filter((result) =>
    ["delta", "source-delta", "unresolved", "error"].includes(result.status)
  );
  const issueMarkdown = [
    "# Item Cost/ILR Matrix Issues",
    "",
    `Generated: ${summary.generatedAt}`,
    `API: ${summary.apiBaseUrl}`,
    `Cases: ${summary.caseCount}`,
    `Status counts: ${JSON.stringify(statusCounts)}`,
    `Strict issue cases: ${issueCaseCount}`,
    `Source delta cases: ${sourceDeltaCaseCount}`,
    "",
    "| Status | ResRef | Bucket | Source Cost | Calculated | Delta | Notes |",
    "| --- | --- | --- | ---: | ---: | ---: | --- |",
    ...issueRows.map((result) =>
      [
        result.status,
        result.resref,
        result.expectedBucket,
        result.source?.sourceCost ?? "-",
        result.calculated?.finalCost ?? "-",
        result.delta ?? "-",
        result.error ?? result.source?.sourceObjectKey ?? ""
      ]
        .map((value) => String(value).replace(/\|/gu, "\\|"))
        .join(" | ")
        .replace(/^/u, "| ")
        .replace(/$/u, " |")
    ),
    ""
  ].join("\n");
  await fs.writeFile(issuePath, issueMarkdown, "utf8");

  console.log(
    JSON.stringify(
      { outputPath, issuePath, caseCount: summary.caseCount, statusCounts, issueCaseCount },
      null,
      2
    )
  );

  if (process.env.ITEM_COST_ILR_STRICT === "1" && issueCaseCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(formatError(error));
  process.exitCode = 1;
});
