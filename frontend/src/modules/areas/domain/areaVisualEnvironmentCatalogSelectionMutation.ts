import {
  isEffectiveAreaVisualEnvironmentCatalogBundle,
  type EffectiveAreaVisualEnvironmentCatalogBundle,
} from "./effectiveAreaVisualEnvironmentCatalog";
import {
  areaVisualEnvironmentCatalogSelectionsEqual,
  isAreaVisualEnvironmentCatalogSelection,
  type AreaVisualEnvironmentCatalogSelection,
} from "./areaVisualEnvironmentCatalogSelection";
import {
  areaVisualEnvironmentsEqual,
  cloneAreaVisualEnvironment,
  isAreaVisualEnvironment,
  type AreaVisualEnvironment,
} from "./areaVisualEnvironment";
import {
  areaVisualEnvironmentScalarControlsEqual,
  cloneAreaVisualEnvironmentScalarControls,
  isAreaVisualEnvironmentScalarControls,
  type AreaVisualEnvironmentScalarControls,
} from "./areaVisualEnvironmentScalarControls";

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

export interface BuildAreaVisualEnvironmentCatalogSelectionMutationInput {
  readonly catalogs: EffectiveAreaVisualEnvironmentCatalogBundle;
  readonly sourceSelection: AreaVisualEnvironmentCatalogSelection;
  readonly targetSelection: AreaVisualEnvironmentCatalogSelection;
  readonly sourceVisualEnvironment: AreaVisualEnvironment;
  readonly targetVisualEnvironment: AreaVisualEnvironment;
  readonly sourceScalarControls: AreaVisualEnvironmentScalarControls;
  readonly targetScalarControls: AreaVisualEnvironmentScalarControls;
}

export function buildExistingAreaVisualEnvironmentCatalogSelectionMutation(
  input: BuildAreaVisualEnvironmentCatalogSelectionMutationInput,
): ExistingAreaVisualEnvironmentCatalogSelectionMutation | undefined {
  if (!isEffectiveAreaVisualEnvironmentCatalogBundle(input.catalogs)) {
    throw new Error("Effective Area visual-environment catalogs are malformed.");
  }
  if (!isAreaVisualEnvironmentCatalogSelection(input.sourceSelection)
      || !isAreaVisualEnvironmentCatalogSelection(input.targetSelection)) {
    throw new Error("Area visual-environment catalog selection is malformed.");
  }
  if (!isAreaVisualEnvironment(input.sourceVisualEnvironment)
      || !isAreaVisualEnvironment(input.targetVisualEnvironment)
      || !isAreaVisualEnvironmentScalarControls(input.sourceScalarControls)
      || !isAreaVisualEnvironmentScalarControls(input.targetScalarControls)) {
    throw new Error("Area visual-environment catalog mutation state is malformed.");
  }
  if (areaVisualEnvironmentCatalogSelectionsEqual(
    input.sourceSelection,
    input.targetSelection,
  )) return undefined;

  const sourceRowsExist = input.catalogs.lightingSchemes.rows.some(
    (row) => row.rowIndex === input.sourceSelection.lightingSchemeRowIndex,
  ) && input.catalogs.skyBoxes.rows.some(
    (row) => row.rowIndex === input.sourceSelection.skyBoxRowIndex,
  );
  const targetLighting = input.catalogs.lightingSchemes.rows.find(
    (row) => row.rowIndex === input.targetSelection.lightingSchemeRowIndex,
  );
  const targetSkyBoxExists = input.catalogs.skyBoxes.rows.some(
    (row) => row.rowIndex === input.targetSelection.skyBoxRowIndex,
  );
  if (!sourceRowsExist || !targetLighting || !targetSkyBoxExists) {
    throw new Error("Area visual selection row is absent from the effective catalogs.");
  }

  const lightingSchemeChanged = input.sourceSelection.lightingSchemeRowIndex
    !== input.targetSelection.lightingSchemeRowIndex;
  const visualEnvironmentOverride = lightingSchemeChanged
    && !areaVisualEnvironmentsEqual(
      input.targetVisualEnvironment,
      targetLighting.visualEnvironment,
    )
    ? freezeVisual(input.targetVisualEnvironment)
    : undefined;
  const visualEnvironmentScalarControlsOverride = lightingSchemeChanged
    && !areaVisualEnvironmentScalarControlsEqual(
      input.targetScalarControls,
      targetLighting.visualEnvironmentScalarControls,
    )
    ? Object.freeze(cloneAreaVisualEnvironmentScalarControls(
      input.targetScalarControls,
    ))
    : undefined;
  return Object.freeze({
    catalogIdentity: Object.freeze({
      environmentSha256: input.catalogs.lightingSchemes.descriptor.sha256,
      skyBoxesSha256: input.catalogs.skyBoxes.descriptor.sha256,
    }),
    expectedValue: Object.freeze({
      lightingSchemeRowIndex: input.sourceSelection.lightingSchemeRowIndex,
      skyBoxRowIndex: input.sourceSelection.skyBoxRowIndex,
      visualEnvironment: freezeVisual(input.sourceVisualEnvironment),
      visualEnvironmentScalarControls: Object.freeze(
        cloneAreaVisualEnvironmentScalarControls(input.sourceScalarControls),
      ),
    }),
    value: Object.freeze({
      lightingSchemeRowIndex: input.targetSelection.lightingSchemeRowIndex,
      skyBoxRowIndex: input.targetSelection.skyBoxRowIndex,
      ...(visualEnvironmentOverride ? { visualEnvironmentOverride } : {}),
      ...(visualEnvironmentScalarControlsOverride
        ? { visualEnvironmentScalarControlsOverride }
        : {}),
    }),
  });
}

export function isExistingAreaVisualEnvironmentCatalogSelectionMutation(
  value: unknown,
): value is ExistingAreaVisualEnvironmentCatalogSelectionMutation {
  if (!isRecord(value) || !hasExactKeys(value, [
    "catalogIdentity", "expectedValue", "value",
  ]) || !isCatalogIdentity(value.catalogIdentity)
      || !isExpectedValue(value.expectedValue)
      || !isTargetValue(value.value)) return false;
  return value.expectedValue.lightingSchemeRowIndex
      !== value.value.lightingSchemeRowIndex
    || value.expectedValue.skyBoxRowIndex !== value.value.skyBoxRowIndex;
}

function isCatalogIdentity(value: unknown): value is AreaVisualEnvironmentCatalogIdentity {
  return isRecord(value) && hasExactKeys(value, [
    "environmentSha256", "skyBoxesSha256",
  ]) && isSha256(value.environmentSha256) && isSha256(value.skyBoxesSha256);
}

function isExpectedValue(
  value: unknown,
): value is AreaVisualEnvironmentCatalogSelectionMutationExpectedValue {
  return isRecord(value) && hasExactKeys(value, [
    "lightingSchemeRowIndex", "skyBoxRowIndex", "visualEnvironment",
    "visualEnvironmentScalarControls",
  ]) && isAreaVisualEnvironmentCatalogSelection({
    lightingSchemeRowIndex: value.lightingSchemeRowIndex,
    skyBoxRowIndex: value.skyBoxRowIndex,
  }) && isAreaVisualEnvironment(value.visualEnvironment)
    && isAreaVisualEnvironmentScalarControls(value.visualEnvironmentScalarControls);
}

function isTargetValue(
  value: unknown,
): value is AreaVisualEnvironmentCatalogSelectionMutationTarget {
  if (!isRecord(value) || !hasAllowedKeys(value, [
    "lightingSchemeRowIndex", "skyBoxRowIndex", "visualEnvironmentOverride",
    "visualEnvironmentScalarControlsOverride",
  ]) || !Object.hasOwn(value, "lightingSchemeRowIndex")
      || !Object.hasOwn(value, "skyBoxRowIndex")) return false;
  return isAreaVisualEnvironmentCatalogSelection({
    lightingSchemeRowIndex: value.lightingSchemeRowIndex,
    skyBoxRowIndex: value.skyBoxRowIndex,
  }) && (value.visualEnvironmentOverride === undefined
      || isAreaVisualEnvironment(value.visualEnvironmentOverride))
    && (value.visualEnvironmentScalarControlsOverride === undefined
      || isAreaVisualEnvironmentScalarControls(
        value.visualEnvironmentScalarControlsOverride,
      ));
}

function freezeVisual(value: AreaVisualEnvironment): AreaVisualEnvironment {
  const clone = cloneAreaVisualEnvironment(value);
  return Object.freeze({
    ...clone,
    sun: Object.freeze({ ...clone.sun }),
    moon: Object.freeze({ ...clone.moon }),
  });
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
  return Object.keys(value).every((key) => allowed.includes(key));
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}
