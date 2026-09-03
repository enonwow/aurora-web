export interface ExistingAreaPlaceableTemplateResRefMutation {
  readonly expectedResRef: string;
  readonly resRef: string;
}

export function isAreaPlaceableTemplateResRef(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_]{1,16}$/u.test(value);
}

export function readExistingAreaPlaceableTemplateResRefMutation(
  value: unknown,
): ExistingAreaPlaceableTemplateResRefMutation | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }
  const pair = value as Readonly<Record<string, unknown>>;
  if (
    Object.keys(pair).length !== 2 ||
    !Object.prototype.hasOwnProperty.call(pair, "expectedResRef") ||
    !Object.prototype.hasOwnProperty.call(pair, "resRef") ||
    !isAreaPlaceableTemplateResRef(pair.expectedResRef) ||
    !isAreaPlaceableTemplateResRef(pair.resRef) ||
    pair.expectedResRef === pair.resRef
  ) {
    return undefined;
  }
  return Object.freeze({
    expectedResRef: pair.expectedResRef,
    resRef: pair.resRef,
  });
}
