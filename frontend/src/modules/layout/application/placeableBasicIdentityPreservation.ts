import type { SceneObject, SceneObjectSourceMetadata } from "../../scene/contracts";
import { materializeExistingPlaceableTag } from "./placeableTagProvenance";

export interface PlaceableBasicIdentityDraft {
  readonly name: string;
  readonly tag: string;
  readonly resRef: string;
}

export function formatPreservedPlaceableAppearanceType(value: unknown): string {
  if (!Number.isSafeInteger(value)) {
    return "";
  }
  const appearanceType = value as number;
  if (appearanceType < 0 || appearanceType > 0xffff_ffff) {
    return "";
  }
  return String(appearanceType);
}

export function resolvePreservedPlaceableAppearanceDword(
  source: SceneObjectSourceMetadata | undefined,
): number | undefined {
  const appearance = source?.placeableBasicIdentity?.appearance;
  return appearance?.present === true && appearance.nativeType === "dword"
    ? appearance.value
    : undefined;
}

export function mustPreserveAuroraGitPlaceableBasicIdentity(
  source: SceneObjectSourceMetadata | undefined
): boolean {
  return source?.type === "aurora_git";
}

export function reducePlaceableBasicIdentityField(
  source: SceneObjectSourceMetadata | undefined,
  currentValue: string,
  candidateValue: string
): string {
  return mustPreserveAuroraGitPlaceableBasicIdentity(source)
    ? currentValue
    : candidateValue;
}

export function materializePlaceableBasicIdentity(
  sourceObject: SceneObject,
  draft: PlaceableBasicIdentityDraft
): PlaceableBasicIdentityDraft {
  if (mustPreserveAuroraGitPlaceableBasicIdentity(sourceObject.source)) {
    return {
      name: sourceObject.name ?? sourceObject.tag,
      tag: materializeExistingPlaceableTag(
        sourceObject.source,
        sourceObject.tag,
        draft.tag
      ),
      resRef: sourceObject.resRef
    };
  }
  return {
    name: draft.name.trim(),
    tag: draft.tag.trim(),
    resRef: draft.resRef.trim()
  };
}
