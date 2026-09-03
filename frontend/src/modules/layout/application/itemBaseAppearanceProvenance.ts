import type {
  SceneItemBaseItemCatalog,
  SceneObjectItemProperties,
  SceneObjectSourceMetadata,
} from "../../scene/contracts";
import {
  bindItemBaseAppearanceProvenanceToCatalog,
  buildItemBaseAppearanceTarget,
  projectItemBaseAppearanceToProperties,
  readItemBaseItemCatalog,
} from "../../scene/domain/itemBaseAppearance";
import type { ItemPropertiesDraft } from "./workspaceObjectPropertyDrafts";

function admittedCatalog(
  source: SceneObjectSourceMetadata | undefined,
  catalog: SceneItemBaseItemCatalog | null | undefined,
) {
  if (source?.type !== "aurora_git" || source.sourceKind !== "item" ||
    !Number.isSafeInteger(source.sourceIndex) || Number(source.sourceIndex) < 0) return null;
  const exactCatalog = readItemBaseItemCatalog(catalog);
  const provenance = exactCatalog
    ? bindItemBaseAppearanceProvenanceToCatalog(source.itemBaseAppearance, exactCatalog)
    : null;
  return provenance && exactCatalog ? { provenance, catalog: exactCatalog } : null;
}

export function canEditExistingItemBaseAppearance(
  source: SceneObjectSourceMetadata | undefined,
  catalog: SceneItemBaseItemCatalog | null | undefined,
): boolean {
  return admittedCatalog(source, catalog) !== null;
}

export function isExistingItemBaseAppearanceTargetComplete(
  source: SceneObjectSourceMetadata | undefined,
  draft: Readonly<ItemPropertiesDraft>,
  catalog: SceneItemBaseItemCatalog | null | undefined,
): boolean {
  const admitted = admittedCatalog(source, catalog);
  return admitted === null || buildItemBaseAppearanceTarget(draft, admitted.catalog) !== null;
}

export function reduceExistingItemBaseItemDraft(
  source: SceneObjectSourceMetadata | undefined,
  draft: Readonly<ItemPropertiesDraft>,
  candidateBaseItem: unknown,
  catalog: SceneItemBaseItemCatalog | null | undefined,
): ItemPropertiesDraft {
  const admitted = admittedCatalog(source, catalog);
  if (!admitted || !Number.isSafeInteger(candidateBaseItem) || Number(candidateBaseItem) < 0) {
    return draft as ItemPropertiesDraft;
  }
  const nextRow = admitted.catalog.rows[Number(candidateBaseItem)];
  if (!nextRow || nextRow.rowIndex !== candidateBaseItem) return draft as ItemPropertiesDraft;
  const currentRow = Number.isSafeInteger(draft.baseItem)
    ? admitted.catalog.rows[Number(draft.baseItem)]
    : undefined;
  if (currentRow?.modelType === nextRow.modelType) {
    return { ...draft, baseItem: Number(candidateBaseItem) };
  }
  return {
    ...draft,
    baseItem: Number(candidateBaseItem),
    modelPart1: undefined,
    modelPart2: undefined,
    modelPart3: undefined,
    armorParts: {},
    materialColors: {},
  };
}

export function materializeExistingItemBaseAppearance(
  source: SceneObjectSourceMetadata | undefined,
  current: SceneObjectItemProperties | undefined,
  draft: Readonly<ItemPropertiesDraft>,
  catalog: SceneItemBaseItemCatalog | null | undefined,
): SceneObjectItemProperties | undefined {
  const admitted = admittedCatalog(source, catalog);
  const target = admitted
    ? buildItemBaseAppearanceTarget(draft, admitted.catalog)
    : null;
  if (!admitted || !target || !current) return current;

  return projectItemBaseAppearanceToProperties(current, target);
}
