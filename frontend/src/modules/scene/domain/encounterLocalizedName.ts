import type {
  SceneObjectNativeLocalizedStringStorage,
  SceneObjectSourceMetadata,
} from "../contracts";
import {
  cloneNativeLocalizedStringStorage,
  isNativeInlineAsciiText,
  readNativeInlineAsciiStorage,
  readNativeLocalizedStringStorage,
} from "./nativeLocalizedStringStorage";

export const MAX_ENCOUNTER_LOCALIZED_NAME_ASCII_BYTES = 256;

export function readEncounterLocalizedNameStorage(
  value: unknown,
): SceneObjectNativeLocalizedStringStorage | undefined {
  return readNativeLocalizedStringStorage(value);
}

export function cloneEncounterLocalizedNameStorage(
  value: SceneObjectNativeLocalizedStringStorage,
): SceneObjectNativeLocalizedStringStorage {
  return cloneNativeLocalizedStringStorage(value);
}

export function readEncounterLocalizedNameInlineAsciiStorage(
  value: unknown,
): string | undefined {
  return readNativeInlineAsciiStorage(
    value,
    MAX_ENCOUNTER_LOCALIZED_NAME_ASCII_BYTES,
  );
}

export function isEncounterLocalizedNameInlineAsciiText(
  value: unknown,
): value is string {
  return isNativeInlineAsciiText(
    value,
    MAX_ENCOUNTER_LOCALIZED_NAME_ASCII_BYTES,
  );
}

export function readExistingEncounterLocalizedNameSourceValue(
  source: SceneObjectSourceMetadata | undefined,
): string | undefined {
  return source?.type === "aurora_git" &&
    source.sourceKind === "encounter" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0
    ? readEncounterLocalizedNameInlineAsciiStorage(
        source.encounterLocalizedNameStorage,
      )
    : undefined;
}
