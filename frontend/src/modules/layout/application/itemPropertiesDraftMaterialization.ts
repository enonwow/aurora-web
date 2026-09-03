import type {
  SceneObject,
  SceneItemBaseItemCatalog,
  SceneObjectItemArmorParts,
  SceneObjectItemMaterialColors,
  SceneObjectItemProperties,
} from "../../scene/contracts";
import type { ItemPropertiesDraft } from "./workspaceObjectPropertyDrafts";
import {
  canEditExistingItemEditorComment,
  materializeExistingItemComments,
} from "./itemEditorCommentProvenance";
import { isItemWizardBlueprintEditorObject } from
  "./itemBlueprintPropertiesApplyRouting";
import {
  materializeExistingItemInstanceState,
} from "./itemInstanceStateProvenance";
import {
  materializeExistingItemLocalizedStrings,
} from "./itemLocalizedStringProvenance";
import {
  canEditExistingItemPropertyList,
  materializeExistingItemPropertyList,
} from "./itemPropertyListProvenance";
import {
  canEditExistingItemInventory,
  materializeExistingItemInventory,
} from "./itemInventoryProvenance";
import { materializeExistingItemTag } from "./itemTagProvenance";
import { materializeExistingItemTemplateResRef } from
  "./itemTemplateResRefProvenance";
import {
  canEditExistingItemVariables,
  materializeItemVariables,
  materializeExistingItemVariables,
} from "./itemVariableProvenance";
import { materializeExistingItemBaseAppearance } from
  "./itemBaseAppearanceProvenance";
import { cloneItemBaseAppearanceValue } from
  "../../scene/domain/itemBaseAppearance";
import { readItemBlueprintReferenceLists } from
  "../../scene/domain/itemBlueprintInventory";

export type ItemPropertiesDraftMaterializationPolicy =
  | "wizard_blueprint"
  | "retained_exact_only";

export interface ItemPropertiesDraftMaterializationResult {
  readonly policy: ItemPropertiesDraftMaterializationPolicy;
  readonly object: SceneObject;
}

const INSTANCE_STATE_FIELDS = Object.freeze([
  "charges",
  "cost",
  "stolen",
  "stackSize",
  "plot",
  "addCost",
  "identified",
  "cursed",
] as const);

function cloneItemProperties(
  source: SceneObjectItemProperties | undefined,
): SceneObjectItemProperties {
  return {
    ...(source ?? {}),
    ...(source?.modelParts ? { modelParts: [...source.modelParts] } : {}),
    ...(source?.baseAppearance
      ? { baseAppearance: cloneItemBaseAppearanceValue(source.baseAppearance) }
      : {}),
    ...(source?.armorPreviewContext
      ? { armorPreviewContext: { ...source.armorPreviewContext } }
      : {}),
    ...(source?.armorParts ? { armorParts: { ...source.armorParts } } : {}),
    ...(source?.materialColors
      ? { materialColors: { ...source.materialColors } }
      : {}),
    ...(source?.propertyList
      ? { propertyList: source.propertyList.map((entry) => ({ ...entry })) }
      : {}),
    ...(source?.inventoryItems
      ? { inventoryItems: source.inventoryItems.map((entry) => ({ ...entry })) }
      : {}),
    ...(source?.blueprintInventoryItems
      ? { blueprintInventoryItems: source.blueprintInventoryItems.map((entry) => ({ ...entry })) }
      : {}),
    ...(source?.blueprintEquippedItems
      ? { blueprintEquippedItems: source.blueprintEquippedItems.map((entry) => ({ ...entry })) }
      : {}),
    ...(source?.variables
      ? { variables: source.variables.map((entry) => ({ ...entry })) }
      : {}),
    ...(source?.scripts ? { scripts: { ...source.scripts } } : {}),
  };
}

function materializeArmorParts(
  draft: Readonly<ItemPropertiesDraft["armorParts"]>,
): SceneObjectItemArmorParts {
  const result: SceneObjectItemArmorParts = {};
  for (const [key, value] of Object.entries(draft) as Array<
    [keyof SceneObjectItemArmorParts, number | undefined]
  >) {
    if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = Math.trunc(value);
    }
  }
  return result;
}

function materializeMaterialColors(
  draft: Readonly<ItemPropertiesDraft["materialColors"]>,
): SceneObjectItemMaterialColors {
  const result: SceneObjectItemMaterialColors = {};
  for (const [key, value] of Object.entries(draft) as Array<
    [keyof SceneObjectItemMaterialColors, number | undefined]
  >) {
    if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = Math.max(0, Math.min(255, Math.trunc(value)));
    }
  }
  return result;
}

function materializeArmorContext(
  draft: Readonly<ItemPropertiesDraft["armorPreviewContext"]>,
): NonNullable<SceneObjectItemProperties["armorPreviewContext"]> {
  const result: NonNullable<SceneObjectItemProperties["armorPreviewContext"]> = {
    modelPrefix: draft.modelPrefix.trim(),
  };
  const label = draft.label.trim();
  const raceModel = draft.raceModel.trim();
  const gender = Number.parseInt(draft.gender.trim(), 10);
  const phenotype = Number.parseInt(draft.phenotype.trim(), 10);
  if (label.length > 0) result.label = label;
  if (raceModel.length > 0) result.raceModel = raceModel;
  if (Number.isFinite(gender)) result.gender = gender;
  if (Number.isFinite(phenotype)) result.phenotype = phenotype;
  return result;
}

function materializeWizardBlueprint(
  source: SceneObject,
  draft: Readonly<ItemPropertiesDraft>,
): SceneObject {
  const properties = cloneItemProperties(source.itemProperties);
  const modelParts = [draft.modelPart1, draft.modelPart2, draft.modelPart3]
    .filter((entry): entry is number =>
      typeof entry === "number" && Number.isFinite(entry));
  const variables = materializeItemVariables(
    source,
    source.itemProperties?.variables,
    draft.variables,
  );
  const blueprintReferenceLists = readItemBlueprintReferenceLists(
    draft.blueprintInventoryItems,
    draft.blueprintEquippedItems,
    draft.resRef,
  );

  return {
    ...source,
    name: draft.name.trim() || draft.tag || draft.resRef || source.name,
    tag: draft.tag,
    resRef: draft.resRef,
    itemProperties: {
      ...properties,
      localizedName: draft.localizedName,
      localizedNameStrRef: draft.localizedNameStrRef,
      description: draft.description,
      descriptionStrRef: draft.descriptionStrRef,
      identifiedDescription: draft.identifiedDescription,
      identifiedDescriptionStrRef: draft.identifiedDescriptionStrRef,
      comments: draft.comments,
      paletteId: draft.paletteId,
      baseItem: draft.baseItem,
      modelPart1: draft.modelPart1,
      modelPart2: draft.modelPart2,
      modelPart3: draft.modelPart3,
      modelParts,
      armorPreviewContext: materializeArmorContext(draft.armorPreviewContext),
      cloakModelRow: draft.cloakModelRow,
      cloakModel: draft.cloakModel,
      cloakTexture: draft.cloakTexture,
      cloakIcon: draft.cloakIcon,
      cloakModelResRef: draft.cloakModelResRef.trim() || undefined,
      cloakTextureResRef: draft.cloakTextureResRef.trim() || undefined,
      cloakIconResRef: draft.cloakIconResRef.trim() || undefined,
      armorParts: materializeArmorParts(draft.armorParts),
      materialColors: materializeMaterialColors(draft.materialColors),
      cost: draft.cost,
      addCost: draft.addCost,
      costTable: draft.costTable,
      costValue: draft.costValue,
      charges: draft.charges,
      stackSize: draft.stackSize,
      identified: draft.identified,
      stolen: draft.stolen,
      plot: draft.plot,
      cursed: draft.cursed,
      propertyList: draft.propertyList.map((entry) => ({ ...entry })),
      blueprintInventoryItems: blueprintReferenceLists
        ? blueprintReferenceLists.inventory.map((entry) => ({ ...entry }))
        : properties.blueprintInventoryItems,
      blueprintEquippedItems: blueprintReferenceLists
        ? blueprintReferenceLists.equipment.map((entry) => ({ ...entry }))
        : properties.blueprintEquippedItems,
      variables,
      scripts: source.itemProperties?.scripts
        ? { ...source.itemProperties.scripts }
        : undefined,
    },
  };
}

function materializeRetainedItem(
  source: SceneObject,
  draft: Readonly<ItemPropertiesDraft>,
  itemBaseItemCatalog: SceneItemBaseItemCatalog | null | undefined,
): SceneObject {
  let properties = cloneItemProperties(source.itemProperties);
  Object.assign(
    properties,
    materializeExistingItemLocalizedStrings(
      source.source,
      source.itemProperties,
      {
        localizedName: draft.localizedName,
        description: draft.description,
        identifiedDescription: draft.identifiedDescription,
      },
    ),
  );

  const instanceState = materializeExistingItemInstanceState(
    source.source,
    source.itemProperties,
    {
      charges: draft.charges,
      cost: draft.cost,
      stolen: draft.stolen,
      stackSize: draft.stackSize,
      plot: draft.plot,
      addCost: draft.addCost,
      identified: draft.identified,
      cursed: draft.cursed,
    },
  );
  for (const field of INSTANCE_STATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(instanceState ?? {}, field)) {
      properties[field] = instanceState?.[field] as never;
    }
  }

  if (canEditExistingItemEditorComment(source.source)) {
    properties.comments = materializeExistingItemComments(
      source.source,
      source.itemProperties?.comments ?? "",
      draft.comments,
    );
  }
  if (canEditExistingItemVariables(source.source)) {
    properties.variables = materializeExistingItemVariables(
      source.source,
      source.itemProperties?.variables,
      draft.variables,
    );
  }
  if (canEditExistingItemPropertyList(source.source)) {
    properties.propertyList = materializeExistingItemPropertyList(
      source.source,
      source.itemProperties?.propertyList,
      draft.propertyList,
    );
  }
  if (canEditExistingItemInventory(source.source)) {
    properties.inventoryItems = materializeExistingItemInventory(
      source.source,
      source.itemProperties?.inventoryItems,
      draft.inventoryItems,
    );
  }
  properties = materializeExistingItemBaseAppearance(
    source.source,
    properties,
    draft,
    itemBaseItemCatalog,
  ) ?? properties;

  return {
    ...source,
    tag: materializeExistingItemTag(source.source, source.tag, draft.tag),
    resRef: materializeExistingItemTemplateResRef(
      source.source,
      source.resRef,
      draft.resRef,
    ),
    itemProperties: properties,
  };
}

export function materializeItemPropertiesDraft(
  source: SceneObject,
  draft: Readonly<ItemPropertiesDraft>,
  itemBaseItemCatalog?: SceneItemBaseItemCatalog | null,
): ItemPropertiesDraftMaterializationResult {
  if (isItemWizardBlueprintEditorObject(source)) {
    return {
      policy: "wizard_blueprint",
      object: materializeWizardBlueprint(source, draft),
    };
  }
  return {
    policy: "retained_exact_only",
    object: materializeRetainedItem(source, draft, itemBaseItemCatalog),
  };
}
