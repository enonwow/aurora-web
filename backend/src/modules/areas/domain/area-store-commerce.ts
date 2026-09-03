export const AREA_STORE_COMMERCE_FIELDS = Object.freeze([
  Object.freeze({ key: "markUp", label: "MarkUp", nativeType: "int" }),
  Object.freeze({ key: "markDown", label: "MarkDown", nativeType: "int" }),
  Object.freeze({ key: "blackMarket", label: "BlackMarket", nativeType: "byte" }),
  Object.freeze({ key: "blackMarketMarkDown", label: "BM_MarkDown", nativeType: "int" }),
  Object.freeze({ key: "identifyPrice", label: "IdentifyPrice", nativeType: "int" }),
  Object.freeze({ key: "maxBuyPrice", label: "MaxBuyPrice", nativeType: "int" }),
  Object.freeze({ key: "storeGold", label: "StoreGold", nativeType: "int" }),
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

export interface ExistingAreaStoreCommerceMutation {
  readonly expectedValue: AreaStoreCommerceValue;
  readonly value: AreaStoreCommerceValue;
}

const VALUE_KEYS = AREA_STORE_COMMERCE_FIELDS.map((field) => field.key);
const INT32_MIN = -0x8000_0000;
const INT32_MAX = 0x7fff_ffff;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => actual.includes(key));
}

function isSignedInt32(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= INT32_MIN && Number(value) <= INT32_MAX;
}

export function readAreaStoreCommerceValue(input: unknown): AreaStoreCommerceValue | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, VALUE_KEYS)) return null;
  if (
    !isSignedInt32(input.markUp)
    || !isSignedInt32(input.markDown)
    || typeof input.blackMarket !== "boolean"
    || !isSignedInt32(input.blackMarketMarkDown)
    || !isSignedInt32(input.identifyPrice)
    || !isSignedInt32(input.maxBuyPrice)
    || !isSignedInt32(input.storeGold)
  ) return null;
  return Object.freeze({
    markUp: input.markUp,
    markDown: input.markDown,
    blackMarket: input.blackMarket,
    blackMarketMarkDown: input.blackMarketMarkDown,
    identifyPrice: input.identifyPrice,
    maxBuyPrice: input.maxBuyPrice,
    storeGold: input.storeGold,
  });
}

export function cloneAreaStoreCommerceValue(
  value: AreaStoreCommerceValue,
): AreaStoreCommerceValue {
  return Object.freeze({ ...value });
}

export function areaStoreCommerceValueEqual(
  left: AreaStoreCommerceValue,
  right: AreaStoreCommerceValue,
): boolean {
  return AREA_STORE_COMMERCE_FIELDS.every((field) => left[field.key] === right[field.key]);
}

export function readAreaStoreCommerceMutation(
  input: unknown,
): ExistingAreaStoreCommerceMutation | null {
  if (!isPlainRecord(input) || !hasExactKeys(input, ["expectedValue", "value"])) return null;
  const expectedValue = readAreaStoreCommerceValue(input.expectedValue);
  const value = readAreaStoreCommerceValue(input.value);
  if (!expectedValue || !value || areaStoreCommerceValueEqual(expectedValue, value)) return null;
  return Object.freeze({ expectedValue, value });
}
