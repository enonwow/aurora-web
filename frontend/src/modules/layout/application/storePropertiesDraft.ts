import type {
  SceneItemBaseItemCatalog,
  SceneObject,
  SceneObjectStoreVariableTargetEntry,
} from "../../scene/contracts";
import { isStoreEditorComment } from "../../scene/domain/storeEditorComment";
import {
  areaStoreCommerceValueEqual,
  cloneAreaStoreCommerceValue,
  isAreaStoreCommerceValue,
  type AreaStoreCommerceValue,
} from "../../scene/domain/storeCommerce";
import {
  areaStoreScriptResRefsValueEqual,
  cloneAreaStoreScriptResRefsValue,
  isAreaStoreScriptResRefsTargetValue,
  isAreaStoreScriptResRefsValue,
  type AreaStoreScriptResRefsValue,
} from "../../scene/domain/storeScriptResRefs";
import {
  readStoreVariableProvenance,
  readStoreVariableTargetEntries,
  storeVariableTargetEntriesEqual,
} from "../../scene/domain/storeVariableTable";
import {
  areaStoreRestrictionTargetsEqual,
  bindStoreRestrictionsProvenanceToCatalog,
  cloneStoreRestrictionsTarget,
  readStoreRestrictionsTarget,
  type AreaStoreRestrictionsTarget,
} from "../../scene/domain/storeRestrictions";
import {
  areaStoreInventoryTargetsEqual,
  bindStoreInventoryProvenanceToCatalog,
  cloneStoreInventoryTargetBuckets,
  readStoreInventoryTargetBuckets,
  type AreaStoreInventoryTargetBucket,
} from "../../scene/domain/storeInventory";
import { cloneSceneObject } from "./workspaceSceneObjectClone";

export interface StorePropertiesDraft {
  readonly commentControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly commerceControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly scriptControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly variableControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly restrictionControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly inventoryControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  readonly comments: string;
  readonly commerce: AreaStoreCommerceValue | null;
  readonly scriptResRefs: AreaStoreScriptResRefsValue | null;
  readonly variables: readonly SceneObjectStoreVariableTargetEntry[] | null;
  readonly restrictions: AreaStoreRestrictionsTarget | null;
  readonly inventoryBuckets: readonly AreaStoreInventoryTargetBucket[] | null;
}

export interface StorePropertiesDialogState {
  readonly objectId: string;
  readonly snapshotObject: SceneObject;
  readonly draft: StorePropertiesDraft;
  readonly windowX: number;
  readonly windowY: number;
  readonly anchorOffsetX: number;
  readonly anchorOffsetY: number;
  readonly collapsed: boolean;
}

export function canEditExistingStoreEditorComment(object: SceneObject): boolean {
  return object.kind === "stores" &&
    object.source?.type === "aurora_git" &&
    object.source.sourceKind === "store" &&
    Number.isInteger(object.source.sourceIndex) &&
    (object.source.sourceIndex ?? -1) >= 0 &&
    isStoreEditorComment(object.source.storeEditorComment) &&
    isStoreEditorComment(object.storeProperties?.comments);
}

export function canEditExistingStoreCommerce(object: SceneObject): boolean {
  return object.kind === "stores" &&
    object.source?.type === "aurora_git" &&
    object.source.sourceKind === "store" &&
    Number.isInteger(object.source.sourceIndex) &&
    (object.source.sourceIndex ?? -1) >= 0 &&
    isAreaStoreCommerceValue(object.source.storeCommerce) &&
    isAreaStoreCommerceValue(object.storeProperties?.commerce);
}

export function canEditExistingStoreScriptResRefs(object: SceneObject): boolean {
  return object.kind === "stores" &&
    object.source?.type === "aurora_git" &&
    object.source.sourceKind === "store" &&
    Number.isInteger(object.source.sourceIndex) &&
    (object.source.sourceIndex ?? -1) >= 0 &&
    isAreaStoreScriptResRefsValue(object.source.storeScriptResRefs) &&
    isAreaStoreScriptResRefsTargetValue(object.storeProperties?.scriptResRefs);
}

export function canEditExistingStoreVariables(object: SceneObject): boolean {
  return object.kind === "stores" &&
    object.source?.type === "aurora_git" &&
    object.source.sourceKind === "store" &&
    Number.isInteger(object.source.sourceIndex) &&
    (object.source.sourceIndex ?? -1) >= 0 &&
    readStoreVariableProvenance(object.source.storeVariables) !== null &&
    readStoreVariableTargetEntries(object.storeProperties?.variables) !== null;
}

export function canEditExistingStoreRestrictions(
  object: SceneObject,
  itemBaseItemCatalog: SceneItemBaseItemCatalog | null | undefined,
): boolean {
  if (object.kind !== "stores" || object.source?.type !== "aurora_git" ||
    object.source.sourceKind !== "store" || !Number.isInteger(object.source.sourceIndex) ||
    (object.source.sourceIndex ?? -1) < 0 || !itemBaseItemCatalog) return false;
  const provenance = bindStoreRestrictionsProvenanceToCatalog(
    object.source.storeRestrictions,
    itemBaseItemCatalog,
  );
  return provenance !== null &&
    readStoreRestrictionsTarget(
      object.storeProperties?.restrictions,
      provenance.tableRowCount,
    ) !== null;
}

export function canEditExistingStoreInventory(
  object: SceneObject,
  itemBaseItemCatalog: SceneItemBaseItemCatalog | null | undefined,
): boolean {
  if (object.kind !== "stores" || object.source?.type !== "aurora_git" ||
    object.source.sourceKind !== "store" || !Number.isInteger(object.source.sourceIndex) ||
    (object.source.sourceIndex ?? -1) < 0 || !itemBaseItemCatalog) return false;
  const provenance = bindStoreInventoryProvenanceToCatalog(
    object.source.storeInventory,
    itemBaseItemCatalog,
  );
  return provenance !== null && readStoreInventoryTargetBuckets(
    object.storeProperties?.inventoryBuckets,
    provenance.expectedBuckets,
  ) !== null;
}

export function buildStorePropertiesDraft(
  object: SceneObject,
  itemBaseItemCatalog?: SceneItemBaseItemCatalog | null,
): StorePropertiesDraft {
  const editable = canEditExistingStoreEditorComment(object);
  const commerceEditable = canEditExistingStoreCommerce(object);
  const scriptEditable = canEditExistingStoreScriptResRefs(object);
  const variableEditable = canEditExistingStoreVariables(object);
  const restrictionEditable = canEditExistingStoreRestrictions(
    object,
    itemBaseItemCatalog,
  );
  const inventoryEditable = canEditExistingStoreInventory(
    object,
    itemBaseItemCatalog,
  );
  const inventoryProvenance = inventoryEditable
    ? bindStoreInventoryProvenanceToCatalog(
        object.source?.storeInventory,
        itemBaseItemCatalog,
      )
    : null;
  return {
    commentControlState: editable ? "ACTIVE_NOW" : "PRESERVE_ONLY",
    commerceControlState: commerceEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY",
    scriptControlState: scriptEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY",
    variableControlState: variableEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY",
    restrictionControlState: restrictionEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY",
    inventoryControlState: inventoryEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY",
    comments: isStoreEditorComment(object.storeProperties?.comments)
      ? object.storeProperties.comments
      : "",
    commerce: commerceEditable
      ? cloneAreaStoreCommerceValue(object.storeProperties!.commerce!)
      : null,
    scriptResRefs: scriptEditable
      ? cloneAreaStoreScriptResRefsValue(object.storeProperties!.scriptResRefs!)
      : null,
    variables: variableEditable
      ? object.storeProperties!.variables!.map((entry) => ({ ...entry }))
      : null,
    restrictions: restrictionEditable
      ? cloneStoreRestrictionsTarget(object.storeProperties!.restrictions!)
      : null,
    inventoryBuckets: inventoryEditable && inventoryProvenance
      ? cloneStoreInventoryTargetBuckets(
          object.storeProperties!.inventoryBuckets!,
          inventoryProvenance.expectedBuckets,
        )
      : null,
  };
}

export function areStorePropertiesDraftsEqual(
  left: Readonly<StorePropertiesDraft>,
  right: Readonly<StorePropertiesDraft>,
): boolean {
  return left.commentControlState === right.commentControlState &&
    left.commerceControlState === right.commerceControlState &&
    left.scriptControlState === right.scriptControlState &&
    left.variableControlState === right.variableControlState &&
    left.restrictionControlState === right.restrictionControlState &&
    left.inventoryControlState === right.inventoryControlState &&
    left.comments === right.comments &&
    (left.commerce === null
      ? right.commerce === null
      : right.commerce !== null && areaStoreCommerceValueEqual(left.commerce, right.commerce)) &&
    (left.scriptResRefs === null
      ? right.scriptResRefs === null
      : right.scriptResRefs !== null &&
        areaStoreScriptResRefsValueEqual(left.scriptResRefs, right.scriptResRefs)) &&
    (left.variables === null
      ? right.variables === null
      : right.variables !== null &&
        storeVariableTargetEntriesEqual(left.variables, right.variables)) &&
    (left.restrictions === null
      ? right.restrictions === null
      : right.restrictions !== null &&
        areaStoreRestrictionTargetsEqual(left.restrictions, right.restrictions)) &&
    (left.inventoryBuckets === null
      ? right.inventoryBuckets === null
      : right.inventoryBuckets !== null &&
        areaStoreInventoryTargetsEqual(left.inventoryBuckets, right.inventoryBuckets));
}

export function materializeStorePropertiesDraft(
  source: SceneObject,
  draft: Readonly<StorePropertiesDraft>,
  itemBaseItemCatalog?: SceneItemBaseItemCatalog | null,
): SceneObject {
  const cloned = cloneSceneObject(source);
  const storeProperties = cloned.storeProperties
    ? { ...cloned.storeProperties }
    : { comments: "" };
  let changed = false;
  if (canEditExistingStoreEditorComment(source) &&
      draft.commentControlState === "ACTIVE_NOW" &&
      isStoreEditorComment(draft.comments)) {
    storeProperties.comments = draft.comments;
    changed = true;
  }
  if (canEditExistingStoreCommerce(source) &&
      draft.commerceControlState === "ACTIVE_NOW" &&
      isAreaStoreCommerceValue(draft.commerce)) {
    storeProperties.commerce = cloneAreaStoreCommerceValue(draft.commerce);
    changed = true;
  }
  if (canEditExistingStoreScriptResRefs(source) &&
      draft.scriptControlState === "ACTIVE_NOW" &&
      isAreaStoreScriptResRefsTargetValue(draft.scriptResRefs)) {
    storeProperties.scriptResRefs = cloneAreaStoreScriptResRefsValue(
      draft.scriptResRefs,
    );
    changed = true;
  }
  if (canEditExistingStoreVariables(source) &&
      draft.variableControlState === "ACTIVE_NOW") {
    const variables = readStoreVariableTargetEntries(draft.variables);
    if (variables !== null) {
      storeProperties.variables = variables.map((entry) => ({ ...entry }));
      changed = true;
    }
  }
  if (canEditExistingStoreRestrictions(source, itemBaseItemCatalog) &&
      draft.restrictionControlState === "ACTIVE_NOW") {
    const provenance = bindStoreRestrictionsProvenanceToCatalog(
      source.source?.storeRestrictions,
      itemBaseItemCatalog,
    );
    const restrictions = provenance
      ? readStoreRestrictionsTarget(draft.restrictions, provenance.tableRowCount)
      : null;
    if (restrictions !== null) {
      storeProperties.restrictions = cloneStoreRestrictionsTarget(restrictions);
      changed = true;
    }
  }
  if (canEditExistingStoreInventory(source, itemBaseItemCatalog) &&
      draft.inventoryControlState === "ACTIVE_NOW") {
    const provenance = bindStoreInventoryProvenanceToCatalog(
      source.source?.storeInventory,
      itemBaseItemCatalog,
    );
    const inventoryBuckets = provenance
      ? readStoreInventoryTargetBuckets(
          draft.inventoryBuckets,
          provenance.expectedBuckets,
        )
      : null;
    if (inventoryBuckets !== null && provenance) {
      storeProperties.inventoryBuckets = cloneStoreInventoryTargetBuckets(
        inventoryBuckets,
        provenance.expectedBuckets,
      );
      changed = true;
    }
  }
  if (!changed) return cloned;
  return {
    ...cloned,
    storeProperties,
  };
}
