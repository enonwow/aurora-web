export interface AreaVisualEnvironmentCatalogSelection {
  readonly lightingSchemeRowIndex: number;
  readonly skyBoxRowIndex: number;
}

const EXACT_KEYS = new Set<keyof AreaVisualEnvironmentCatalogSelection>([
  "lightingSchemeRowIndex",
  "skyBoxRowIndex",
]);

export function isAreaVisualEnvironmentCatalogSelection(
  value: unknown,
): value is AreaVisualEnvironmentCatalogSelection {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length === EXACT_KEYS.size
    && keys.every((key) => EXACT_KEYS.has(key as keyof AreaVisualEnvironmentCatalogSelection))
    && isByte(record.lightingSchemeRowIndex)
    && isByte(record.skyBoxRowIndex);
}

export function cloneAreaVisualEnvironmentCatalogSelection(
  value: AreaVisualEnvironmentCatalogSelection,
): AreaVisualEnvironmentCatalogSelection {
  return {
    lightingSchemeRowIndex: value.lightingSchemeRowIndex,
    skyBoxRowIndex: value.skyBoxRowIndex,
  };
}

export function areaVisualEnvironmentCatalogSelectionsEqual(
  left: unknown,
  right: unknown,
): boolean {
  return isAreaVisualEnvironmentCatalogSelection(left)
    && isAreaVisualEnvironmentCatalogSelection(right)
    && left.lightingSchemeRowIndex === right.lightingSchemeRowIndex
    && left.skyBoxRowIndex === right.skyBoxRowIndex;
}

function isByte(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xff;
}
