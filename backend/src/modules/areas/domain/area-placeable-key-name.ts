export const AREA_PLACEABLE_KEY_NAME_MAX_LENGTH = 32;

export function isAreaPlaceableKeyName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= AREA_PLACEABLE_KEY_NAME_MAX_LENGTH &&
    !value.includes("\0")
  );
}
