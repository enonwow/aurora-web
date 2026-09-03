export const PLACEABLE_KEY_NAME_MAX_LENGTH = 32;

export function isPlaceableKeyName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= PLACEABLE_KEY_NAME_MAX_LENGTH &&
    !value.includes("\0")
  );
}
