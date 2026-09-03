export const AREA_STORE_COMMERCE_FIELDS = Object.freeze([
  "markUp",
  "markDown",
  "blackMarket",
  "blackMarketMarkDown",
  "identifyPrice",
  "maxBuyPrice",
  "storeGold",
] as const);

export interface AreaStoreCommerceValue {
  readonly markUp: number;
  readonly markDown: number;
  readonly blackMarket: boolean;
  readonly blackMarketMarkDown: number;
  readonly identifyPrice: number;
  readonly maxBuyPrice: number;
  readonly storeGold: number;
}

const INT32_MIN = -2_147_483_648;
const INT32_MAX = 2_147_483_647;

export function isAreaStoreCommerceValue(
  value: unknown,
): value is AreaStoreCommerceValue {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (keys.length !== AREA_STORE_COMMERCE_FIELDS.length ||
      AREA_STORE_COMMERCE_FIELDS.some((field) => !Object.prototype.hasOwnProperty.call(candidate, field))) {
    return false;
  }
  return isInt32(candidate.markUp) &&
    isInt32(candidate.markDown) &&
    typeof candidate.blackMarket === "boolean" &&
    isInt32(candidate.blackMarketMarkDown) &&
    isInt32(candidate.identifyPrice) &&
    isInt32(candidate.maxBuyPrice) &&
    isInt32(candidate.storeGold);
}

export function readAreaStoreCommerceValue(
  value: unknown,
): AreaStoreCommerceValue | undefined {
  return isAreaStoreCommerceValue(value) ? cloneAreaStoreCommerceValue(value) : undefined;
}

export function cloneAreaStoreCommerceValue(
  value: Readonly<AreaStoreCommerceValue>,
): AreaStoreCommerceValue {
  return {
    markUp: value.markUp,
    markDown: value.markDown,
    blackMarket: value.blackMarket,
    blackMarketMarkDown: value.blackMarketMarkDown,
    identifyPrice: value.identifyPrice,
    maxBuyPrice: value.maxBuyPrice,
    storeGold: value.storeGold,
  };
}

export function areaStoreCommerceValueEqual(
  left: Readonly<AreaStoreCommerceValue>,
  right: Readonly<AreaStoreCommerceValue>,
): boolean {
  return AREA_STORE_COMMERCE_FIELDS.every((field) => left[field] === right[field]);
}

function isInt32(value: unknown): value is number {
  return Number.isInteger(value) &&
    (value as number) >= INT32_MIN &&
    (value as number) <= INT32_MAX;
}
