import {
  isExactEffectiveAreaVisualEnvironmentCatalogBundle,
  type EffectiveAreaVisualEnvironmentCatalogBundle,
} from "../../catalog/domain/effective-area-visual-environment-two-da";
import {
  areaVisualEnvironmentCatalogSelectionsEqual,
  isAreaVisualEnvironmentCatalogSelection,
  type AreaVisualEnvironmentCatalogSelection,
} from "./area-visual-environment-catalog-selection";
import {
  areaVisualEnvironmentsEqual,
  isAreaVisualEnvironment,
  type AreaVisualEnvironment,
} from "./area-visual-environment";
import {
  areaVisualEnvironmentScalarControlsEqual,
  isAreaVisualEnvironmentScalarControls,
  type AreaVisualEnvironmentScalarControls,
} from "./area-visual-environment-scalar-controls";

export interface AreaVisualEnvironmentCatalogIdentity {
  readonly environmentSha256: string;
  readonly skyBoxesSha256: string;
}

export interface AreaVisualEnvironmentCatalogSelectionMutationExpectedValue
  extends AreaVisualEnvironmentCatalogSelection {
  readonly visualEnvironment: AreaVisualEnvironment;
  readonly visualEnvironmentScalarControls: AreaVisualEnvironmentScalarControls;
}

export interface AreaVisualEnvironmentCatalogSelectionMutationTarget
  extends AreaVisualEnvironmentCatalogSelection {
  readonly visualEnvironmentOverride?: AreaVisualEnvironment;
  readonly visualEnvironmentScalarControlsOverride?: AreaVisualEnvironmentScalarControls;
}

export interface ExistingAreaVisualEnvironmentCatalogSelectionMutation {
  readonly catalogIdentity: AreaVisualEnvironmentCatalogIdentity;
  readonly expectedValue: AreaVisualEnvironmentCatalogSelectionMutationExpectedValue;
  readonly value: AreaVisualEnvironmentCatalogSelectionMutationTarget;
}

export interface ResolvedAreaVisualEnvironmentCatalogSelectionMutation {
  readonly catalogIdentity: AreaVisualEnvironmentCatalogIdentity;
  readonly expectedValue: AreaVisualEnvironmentCatalogSelectionMutationExpectedValue;
  readonly value: AreaVisualEnvironmentCatalogSelectionMutationExpectedValue;
  readonly lightingSchemeChanged: boolean;
}

export type AreaVisualEnvironmentCatalogSelectionMutationErrorCode =
  | "mutation_invalid"
  | "catalog_invalid"
  | "catalog_identity_mismatch"
  | "source_row_missing"
  | "target_row_missing"
  | "selection_unchanged"
  | "sky_box_only_override_forbidden"
  | "redundant_override";

export class AreaVisualEnvironmentCatalogSelectionMutationError extends Error {
  constructor(
    readonly code: AreaVisualEnvironmentCatalogSelectionMutationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AreaVisualEnvironmentCatalogSelectionMutationError";
  }
}

export function isExistingAreaVisualEnvironmentCatalogSelectionMutation(
  value: unknown,
): value is ExistingAreaVisualEnvironmentCatalogSelectionMutation {
  if (!isRecord(value) || !hasExactKeys(value, [
    "catalogIdentity", "expectedValue", "value",
  ])) return false;
  return isCatalogIdentity(value.catalogIdentity)
    && isExpectedValue(value.expectedValue)
    && isTargetValue(value.value);
}

export function isResolvedAreaVisualEnvironmentCatalogSelectionMutation(
  value: unknown,
): value is ResolvedAreaVisualEnvironmentCatalogSelectionMutation {
  if (!isRecord(value) || !hasExactKeys(value, [
    "catalogIdentity", "expectedValue", "value", "lightingSchemeChanged",
  ]) || !isCatalogIdentity(value.catalogIdentity)
      || !isExpectedValue(value.expectedValue)
      || !isExpectedValue(value.value)
      || typeof value.lightingSchemeChanged !== "boolean") return false;
  const lightingChanged = value.expectedValue.lightingSchemeRowIndex
    !== value.value.lightingSchemeRowIndex;
  const skyBoxChanged = value.expectedValue.skyBoxRowIndex
    !== value.value.skyBoxRowIndex;
  return value.lightingSchemeChanged === lightingChanged
    && (lightingChanged || skyBoxChanged)
    && (lightingChanged || (
      areaVisualEnvironmentsEqual(
        value.expectedValue.visualEnvironment,
        value.value.visualEnvironment,
      )
      && areaVisualEnvironmentScalarControlsEqual(
        value.expectedValue.visualEnvironmentScalarControls,
        value.value.visualEnvironmentScalarControls,
      )
    ));
}

export function resolveAreaVisualEnvironmentCatalogSelectionMutation(
  mutation: unknown,
  catalogs: unknown,
): ResolvedAreaVisualEnvironmentCatalogSelectionMutation {
  if (!isExistingAreaVisualEnvironmentCatalogSelectionMutation(mutation)) {
    throw failure("mutation_invalid", "Catalog-bound visual selection mutation is malformed.");
  }
  if (!isExactEffectiveAreaVisualEnvironmentCatalogBundle(catalogs)) {
    throw failure("catalog_invalid", "Effective Area visual-environment catalogs are unavailable or malformed.");
  }
  if (
    mutation.catalogIdentity.environmentSha256 !== catalogs.lightingSchemes.descriptor.sha256
    || mutation.catalogIdentity.skyBoxesSha256 !== catalogs.skyBoxes.descriptor.sha256
  ) {
    throw failure("catalog_identity_mismatch", "Effective Area visual-environment catalogs changed.");
  }
  if (!catalogs.lightingSchemes.rows.some(
    (row) => row.rowIndex === mutation.expectedValue.lightingSchemeRowIndex,
  ) || !catalogs.skyBoxes.rows.some(
    (row) => row.rowIndex === mutation.expectedValue.skyBoxRowIndex,
  )) {
    throw failure("source_row_missing", "Retained Area visual selection is absent from the effective catalogs.");
  }
  const targetLighting = catalogs.lightingSchemes.rows.find(
    (row) => row.rowIndex === mutation.value.lightingSchemeRowIndex,
  );
  const targetSkyBoxExists = catalogs.skyBoxes.rows.some(
    (row) => row.rowIndex === mutation.value.skyBoxRowIndex,
  );
  if (!targetLighting || !targetSkyBoxExists) {
    throw failure("target_row_missing", "Target Area visual selection is absent from the effective catalogs.");
  }
  if (areaVisualEnvironmentCatalogSelectionsEqual(
    {
      lightingSchemeRowIndex: mutation.expectedValue.lightingSchemeRowIndex,
      skyBoxRowIndex: mutation.expectedValue.skyBoxRowIndex,
    },
    {
      lightingSchemeRowIndex: mutation.value.lightingSchemeRowIndex,
      skyBoxRowIndex: mutation.value.skyBoxRowIndex,
    },
  )) {
    throw failure("selection_unchanged", "Area visual selection must change at least one physical row ordinal.");
  }

  const lightingSchemeChanged = mutation.expectedValue.lightingSchemeRowIndex
    !== mutation.value.lightingSchemeRowIndex;
  if (!lightingSchemeChanged && (
    mutation.value.visualEnvironmentOverride !== undefined
    || mutation.value.visualEnvironmentScalarControlsOverride !== undefined
  )) {
    throw failure(
      "sky_box_only_override_forbidden",
      "A Sky-Box-only selection cannot carry environment overrides.",
    );
  }
  if (
    mutation.value.visualEnvironmentOverride !== undefined
    && areaVisualEnvironmentsEqual(
      mutation.value.visualEnvironmentOverride,
      targetLighting.visualEnvironment,
    )
  ) {
    throw failure("redundant_override", "Visual-environment override duplicates the selected row target.");
  }
  if (
    mutation.value.visualEnvironmentScalarControlsOverride !== undefined
    && areaVisualEnvironmentScalarControlsEqual(
      mutation.value.visualEnvironmentScalarControlsOverride,
      targetLighting.visualEnvironmentScalarControls,
    )
  ) {
    throw failure("redundant_override", "Scalar-controls override duplicates the selected row target.");
  }

  const visualEnvironment = lightingSchemeChanged
    ? mutation.value.visualEnvironmentOverride ?? targetLighting.visualEnvironment
    : mutation.expectedValue.visualEnvironment;
  const visualEnvironmentScalarControls = lightingSchemeChanged
    ? mutation.value.visualEnvironmentScalarControlsOverride
      ?? targetLighting.visualEnvironmentScalarControls
    : mutation.expectedValue.visualEnvironmentScalarControls;
  return Object.freeze({
    catalogIdentity: Object.freeze({ ...mutation.catalogIdentity }),
    expectedValue: freezeExpectedValue(mutation.expectedValue),
    value: freezeExpectedValue({
      lightingSchemeRowIndex: mutation.value.lightingSchemeRowIndex,
      skyBoxRowIndex: mutation.value.skyBoxRowIndex,
      visualEnvironment,
      visualEnvironmentScalarControls,
    }),
    lightingSchemeChanged,
  });
}

function isCatalogIdentity(value: unknown): value is AreaVisualEnvironmentCatalogIdentity {
  return isRecord(value)
    && hasExactKeys(value, ["environmentSha256", "skyBoxesSha256"])
    && isSha256(value.environmentSha256)
    && isSha256(value.skyBoxesSha256);
}

function isExpectedValue(
  value: unknown,
): value is AreaVisualEnvironmentCatalogSelectionMutationExpectedValue {
  return isRecord(value)
    && hasExactKeys(value, [
      "lightingSchemeRowIndex",
      "skyBoxRowIndex",
      "visualEnvironment",
      "visualEnvironmentScalarControls",
    ])
    && isAreaVisualEnvironmentCatalogSelection({
      lightingSchemeRowIndex: value.lightingSchemeRowIndex,
      skyBoxRowIndex: value.skyBoxRowIndex,
    })
    && isAreaVisualEnvironment(value.visualEnvironment)
    && isAreaVisualEnvironmentScalarControls(value.visualEnvironmentScalarControls);
}

function isTargetValue(value: unknown): value is AreaVisualEnvironmentCatalogSelectionMutationTarget {
  if (!isRecord(value) || !hasAllowedKeys(value, [
    "lightingSchemeRowIndex",
    "skyBoxRowIndex",
    "visualEnvironmentOverride",
    "visualEnvironmentScalarControlsOverride",
  ])) return false;
  if (!isAreaVisualEnvironmentCatalogSelection({
    lightingSchemeRowIndex: value.lightingSchemeRowIndex,
    skyBoxRowIndex: value.skyBoxRowIndex,
  })) return false;
  return (value.visualEnvironmentOverride === undefined
      || isAreaVisualEnvironment(value.visualEnvironmentOverride))
    && (value.visualEnvironmentScalarControlsOverride === undefined
      || isAreaVisualEnvironmentScalarControls(
        value.visualEnvironmentScalarControlsOverride,
      ));
}

function freezeExpectedValue(
  value: AreaVisualEnvironmentCatalogSelectionMutationExpectedValue,
): AreaVisualEnvironmentCatalogSelectionMutationExpectedValue {
  return Object.freeze({
    lightingSchemeRowIndex: value.lightingSchemeRowIndex,
    skyBoxRowIndex: value.skyBoxRowIndex,
    visualEnvironment: Object.freeze({
      ...value.visualEnvironment,
      sun: Object.freeze({ ...value.visualEnvironment.sun }),
      moon: Object.freeze({ ...value.visualEnvironment.moon }),
    }),
    visualEnvironmentScalarControls: Object.freeze({
      ...value.visualEnvironmentScalarControls,
    }),
  });
}

function failure(
  code: AreaVisualEnvironmentCatalogSelectionMutationErrorCode,
  message: string,
): AreaVisualEnvironmentCatalogSelectionMutationError {
  return new AreaVisualEnvironmentCatalogSelectionMutationError(code, message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function hasAllowedKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.includes("lightingSchemeRowIndex")
    && keys.includes("skyBoxRowIndex")
    && keys.every((key) => allowed.includes(key));
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}
