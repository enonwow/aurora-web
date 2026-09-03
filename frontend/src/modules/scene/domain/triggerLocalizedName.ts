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

export const MAX_TRIGGER_LOCALIZED_NAME_ASCII_BYTES = 256;

export function readTriggerLocalizedNameStorage(
  value: unknown,
): SceneObjectNativeLocalizedStringStorage | undefined {
  return readNativeLocalizedStringStorage(value);
}
export function cloneTriggerLocalizedNameStorage(
  value: SceneObjectNativeLocalizedStringStorage,
): SceneObjectNativeLocalizedStringStorage {
  return cloneNativeLocalizedStringStorage(value);
}

export function readTriggerLocalizedNameInlineAsciiStorage(
  value: unknown,
): string | undefined {
  return readNativeInlineAsciiStorage(
    value,
    MAX_TRIGGER_LOCALIZED_NAME_ASCII_BYTES,
  );
}

export function isTriggerLocalizedNameInlineAsciiText(
  value: unknown,
): value is string {
  return isNativeInlineAsciiText(
    value,
    MAX_TRIGGER_LOCALIZED_NAME_ASCII_BYTES,
  );
}

export function readExistingTriggerLocalizedNameSourceValue(
  source: SceneObjectSourceMetadata | undefined,
): string | undefined {
  return source?.type === "aurora_git" &&
    source.sourceKind === "trigger" &&
    Number.isSafeInteger(source.sourceIndex) &&
    Number(source.sourceIndex) >= 0
    ? readTriggerLocalizedNameInlineAsciiStorage(
        source.triggerLocalizedNameStorage,
      )
    : undefined;
}

export function canEditExistingTriggerLocalizedName(
  source: SceneObjectSourceMetadata | undefined,
): boolean {
  return readExistingTriggerLocalizedNameSourceValue(source) !== undefined;
}
