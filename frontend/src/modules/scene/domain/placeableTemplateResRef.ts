export const PLACEABLE_TEMPLATE_RESREF_MAX_CODE_UNITS = 16;

const PLACEABLE_TEMPLATE_RESREF_PATTERN = /^[a-z0-9_]{1,16}$/u;

export function isPlaceableTemplateResRef(value: unknown): value is string {
  return typeof value === "string" && PLACEABLE_TEMPLATE_RESREF_PATTERN.test(value);
}

export function readPlaceableTemplateResRef(value: unknown): string | undefined {
  return isPlaceableTemplateResRef(value) ? value : undefined;
}
