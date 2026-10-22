import { useEffect, useState, type PointerEventHandler, type Ref } from "react";
import type {
  SceneObjectEditableLocalizedStringEntry,
  SceneObjectItemArmorParts,
  SceneObjectItemMaterialColors,
  SceneObjectItemPropertyEntry,
  SceneObjectItemVariableTargetEntry,
  SceneItemBaseItemCatalog,
} from "../../../scene/contracts";
import {
  ITEM_PROPERTIES_TAB_OPTIONS,
  type ItemPropertiesDialogState,
  type ItemPropertiesDraft,
  type ItemPropertiesTab
} from "../../application/workspaceObjectPropertyDrafts";
import {
  AURORA_ITEM_EQUIPMENT_SLOT_OPTIONS,
  formatItemEquipSlotMask,
} from "../../../items/application/itemEquipSlots";
import { resolveItemMaterialColorHex } from "../../../items/application/itemPresentation";
import {
  SharedDialogActionsFooter,
  SharedLongTextPropertySection,
  SharedPropertyDialogChrome,
  SharedPropertyTabsNav
} from "./SharedPropertyDialogSections";
import { ItemModelPreviewPane } from "./ItemModelPreviewPane";
import { canEditExistingItemEditorComment } from "../../application/itemEditorCommentProvenance";
import { canEditExistingItemInstanceState } from "../../application/itemInstanceStateProvenance";
import {
  canEditExistingItemTag,
  MAX_ITEM_TAG_CODE_UNITS,
} from "../../application/itemTagProvenance";
import {
  canEditExistingItemTemplateResRef,
  ITEM_TEMPLATE_RESREF_MAX_CODE_UNITS,
} from "../../application/itemTemplateResRefProvenance";
import { canEditExistingItemLocalizedString } from
  "../../application/itemLocalizedStringProvenance";
import {
  MAX_ITEM_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_LOCALIZED_STRING_ENTRIES,
  MAX_ITEM_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_ITEM_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
  MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  isItemLocalizedStringInlineAsciiText,
} from "../../../scene/domain/itemLocalizedStrings";
import { ITEM_EDITOR_COMMENT_MAX_CODE_UNITS } from "../../../scene/domain/itemEditorComment";
import { canEditItemVariables } from "../../application/itemVariableProvenance";
import { canEditExistingItemPropertyList } from
  "../../application/itemPropertyListProvenance";
import { readItemPropertyListTargetEntries } from
  "../../../scene/domain/itemPropertyList";
import { MAX_AREA_ITEM_INVENTORY_ENTRIES, readItemInventoryTargetEntries } from
  "../../../scene/domain/itemInventory";
import {
  canEditExistingItemInventory,
  type ExistingItemInventoryBlueprintOption,
  MAX_ITEM_BLUEPRINT_REFERENCE_COUNT,
  readItemBlueprintReferenceLists,
} from
  "../../application/itemInventoryProvenance";
import { AuroraVariableTableEditor } from "./AuroraVariableTableEditor";
import { isItemWizardBlueprintEditorObject } from
  "../../application/itemBlueprintPropertiesApplyRouting";
import {
  canEditExistingItemBaseAppearance,
  isExistingItemBaseAppearanceTargetComplete,
} from "../../application/itemBaseAppearanceProvenance";
import { LocalizedStringEntryEditor } from "./LocalizedStringEntryEditor";

type ItemPropertiesEditableField =
  | "name"
  | "tag"
  | "resRef"
  | "localizedName"
  | "localizedNameEntries"
  | "localizedNameStrRef"
  | "paletteId"
  | "baseItem"
  | "modelPart1"
  | "modelPart2"
  | "modelPart3"
  | "cloakModelRow"
  | "cloakModel"
  | "cloakTexture"
  | "cloakIcon"
  | "cloakModelResRef"
  | "cloakTextureResRef"
  | "cloakIconResRef"
  | "cost"
  | "addCost"
  | "charges"
  | "stackSize"
  | "identified"
  | "stolen"
  | "plot"
  | "cursed"
  | "description"
  | "descriptionEntries"
  | "descriptionStrRef"
  | "identifiedDescription"
  | "identifiedDescriptionEntries"
  | "identifiedDescriptionStrRef"
  | "comments";

interface ItemPropertiesDialogProps {
  itemPropertiesDialog: ItemPropertiesDialogState;
  itemPropertiesDialogRef?: Ref<HTMLElement>;
  toggleItemPropertiesDialogCollapsed: () => void;
  cancelItemPropertiesDialog: () => void;
  setItemPropertiesActiveTab: (nextTab: ItemPropertiesTab) => void;
  updateItemPropertiesDraftField: (
    field: ItemPropertiesEditableField,
    value:
      | string
      | number
      | boolean
      | undefined
      | readonly SceneObjectEditableLocalizedStringEntry[]
  ) => void;
  updateItemArmorContextDraftField: (
    field: keyof ItemPropertiesDraft["armorPreviewContext"],
    value: string
  ) => void;
  updateItemArmorPartDraftField: (
    field: keyof SceneObjectItemArmorParts,
    value: number | undefined
  ) => void;
  updateItemMaterialColorDraftField: (
    field: keyof SceneObjectItemMaterialColors,
    value: number | undefined
  ) => void;
  addItemPropertyEntry: () => void;
  updateItemPropertyEntry: (
    index: number,
    field: keyof SceneObjectItemPropertyEntry,
    value: string | number | undefined
  ) => void;
  moveItemPropertyEntry: (index: number, direction: "up" | "down") => void;
  removeItemPropertyEntry: (index: number) => void;
  updateItemInventoryCoordinate: (
    index: number,
    field: "x" | "y",
    value: number,
  ) => void;
  moveItemInventoryEntry: (index: number, direction: "up" | "down") => void;
  removeItemInventoryEntry: (index: number) => void;
  itemInventoryBlueprintOptions: readonly ExistingItemInventoryBlueprintOption[];
  addItemInventoryBlueprintEntry: (templateObjectId: string) => void;
  addItemBlueprintInventoryEntry: () => void;
  updateItemBlueprintInventoryEntry: (
    index: number,
    field: "resRef" | "x" | "y",
    value: string | number,
  ) => void;
  moveItemBlueprintInventoryEntry: (index: number, direction: "up" | "down") => void;
  removeItemBlueprintInventoryEntry: (index: number) => void;
  addItemBlueprintEquipmentEntry: () => void;
  updateItemBlueprintEquipmentEntry: (
    index: number,
    field: "resRef" | "slotMask",
    value: string | number,
  ) => void;
  removeItemBlueprintEquipmentEntry: (index: number) => void;
  addItemVariable: () => void;
  updateItemVariable: (index: number, entry: SceneObjectItemVariableTargetEntry) => void;
  moveItemVariable: (index: number, direction: "up" | "down") => void;
  removeItemVariable: (index: number) => void;
  applyItemPropertiesDraft: (closeAfterApply: boolean) => void;
  itemAssetAccessToken?: string | null;
  itemBaseItemCatalog?: SceneItemBaseItemCatalog | null;
  startItemPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  moveItemPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  endItemPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  cancelItemPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
}

const ITEM_ARMOR_PART_FIELDS: ReadonlyArray<{
  key: keyof SceneObjectItemArmorParts;
  label: string;
}> = [
  { key: "rFoot", label: "R Foot" },
  { key: "lFoot", label: "L Foot" },
  { key: "rShin", label: "R Shin" },
  { key: "lShin", label: "L Shin" },
  { key: "lThigh", label: "L Thigh" },
  { key: "rThigh", label: "R Thigh" },
  { key: "pelvis", label: "Pelvis" },
  { key: "torso", label: "Torso" },
  { key: "belt", label: "Belt" },
  { key: "neck", label: "Neck" },
  { key: "rFArm", label: "R Forearm" },
  { key: "lFArm", label: "L Forearm" },
  { key: "rBicep", label: "R Bicep" },
  { key: "lBicep", label: "L Bicep" },
  { key: "rShoul", label: "R Shoulder" },
  { key: "lShoul", label: "L Shoulder" },
  { key: "rHand", label: "R Hand" },
  { key: "lHand", label: "L Hand" },
  { key: "robe", label: "Robe" }
];

const ITEM_MATERIAL_COLOR_FIELDS: ReadonlyArray<{
  key: keyof SceneObjectItemMaterialColors;
  label: string;
}> = [
  { key: "leather1", label: "Leather 1" },
  { key: "leather2", label: "Leather 2" },
  { key: "cloth1", label: "Cloth 1" },
  { key: "cloth2", label: "Cloth 2" },
  { key: "metal1", label: "Metal 1" },
  { key: "metal2", label: "Metal 2" }
];

const ITEM_PROPERTY_NUMERIC_FIELDS: ReadonlyArray<{
  key: keyof SceneObjectItemPropertyEntry;
  label: string;
  maximum: number;
}> = [
  { key: "propertyName", label: "Property", maximum: 0xffff },
  { key: "subtype", label: "Subtype", maximum: 0xffff },
  { key: "costTable", label: "Cost Table", maximum: 0xff },
  { key: "costValue", label: "Cost Value", maximum: 0xffff },
  { key: "param1", label: "Param 1", maximum: 0xff },
  { key: "param1Value", label: "Param 1 Value", maximum: 0xff },
  { key: "chanceAppear", label: "Chance", maximum: 0xff }
];

function formatOptionalValue(value: string | number | boolean | undefined): string {
  if (value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function parseOptionalIntegerInput(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function ItemPropertiesDialog({
  itemPropertiesDialog,
  itemPropertiesDialogRef,
  toggleItemPropertiesDialogCollapsed,
  cancelItemPropertiesDialog,
  setItemPropertiesActiveTab,
  updateItemPropertiesDraftField,
  updateItemArmorContextDraftField,
  updateItemArmorPartDraftField,
  updateItemMaterialColorDraftField,
  addItemPropertyEntry,
  updateItemPropertyEntry,
  moveItemPropertyEntry,
  removeItemPropertyEntry,
  updateItemInventoryCoordinate,
  moveItemInventoryEntry,
  removeItemInventoryEntry,
  itemInventoryBlueprintOptions,
  addItemInventoryBlueprintEntry,
  addItemBlueprintInventoryEntry,
  updateItemBlueprintInventoryEntry,
  moveItemBlueprintInventoryEntry,
  removeItemBlueprintInventoryEntry,
  addItemBlueprintEquipmentEntry,
  updateItemBlueprintEquipmentEntry,
  removeItemBlueprintEquipmentEntry,
  addItemVariable,
  updateItemVariable,
  moveItemVariable,
  removeItemVariable,
  applyItemPropertiesDraft,
  itemAssetAccessToken = null,
  itemBaseItemCatalog = null,
  startItemPropertiesDialogDrag,
  moveItemPropertiesDialogDrag,
  endItemPropertiesDialogDrag,
  cancelItemPropertiesDialogDrag
}: ItemPropertiesDialogProps) {
  const draft = itemPropertiesDialog.draft;
  const source = itemPropertiesDialog.snapshotObject;
  const [selectedInventoryBlueprintObjectId, setSelectedInventoryBlueprintObjectId] =
    useState(itemInventoryBlueprintOptions[0]?.templateObjectId ?? "");
  useEffect(() => {
    setSelectedInventoryBlueprintObjectId((current) =>
      itemInventoryBlueprintOptions.some((option) => option.templateObjectId === current)
        ? current
        : itemInventoryBlueprintOptions[0]?.templateObjectId ?? "",
    );
  }, [itemInventoryBlueprintOptions, source.id]);
  const isBlueprintEditor = isItemWizardBlueprintEditorObject(source);
  const canEditRetainedEditorComment = canEditExistingItemEditorComment(source.source);
  const canEditRetainedInstanceState = canEditExistingItemInstanceState(source.source);
  const canEditRetainedTag = canEditExistingItemTag(source.source);
  const canEditRetainedTemplateResRef = canEditExistingItemTemplateResRef(source.source);
  const canEditRetainedLocalizedName = canEditExistingItemLocalizedString(
    source.source,
    "localizedName",
  );
  const canEditRetainedDescription = canEditExistingItemLocalizedString(
    source.source,
    "description",
  );
  const canEditRetainedIdentifiedDescription = canEditExistingItemLocalizedString(
    source.source,
    "identifiedDescription",
  );
  const canEditEditorComment = isBlueprintEditor || canEditRetainedEditorComment;
  const canEditInstanceState = isBlueprintEditor || canEditRetainedInstanceState;
  const canEditTag = isBlueprintEditor || canEditRetainedTag;
  const canEditTemplateResRef = isBlueprintEditor || canEditRetainedTemplateResRef;
  const canEditLocalizedName = isBlueprintEditor || canEditRetainedLocalizedName;
  const canEditDescription = isBlueprintEditor || canEditRetainedDescription;
  const canEditIdentifiedDescription =
    isBlueprintEditor || canEditRetainedIdentifiedDescription;
  const canEditVariables = canEditItemVariables(source);
  const canEditRetainedPropertyList = canEditExistingItemPropertyList(source.source);
  const canEditPropertyList = isBlueprintEditor || canEditRetainedPropertyList;
  const propertyListState = canEditPropertyList ? "ACTIVE_NOW" : "PRESERVE_ONLY";
  const propertyListTitle = isBlueprintEditor
    ? "ACTIVE_NOW: Item-wizard UTI PropertiesList authoring"
    : canEditRetainedPropertyList
      ? "ACTIVE_NOW: exact retained ground-item PropertiesList"
      : "PRESERVE_ONLY: exact physically present retained PropertiesList provenance is unavailable";
  const propertyLabelTitle = isBlueprintEditor
    ? propertyListTitle
    : "READ_ONLY: retained PropertiesList labels are derived display metadata";
  const itemPropertyListTargetComplete = !canEditRetainedPropertyList ||
    readItemPropertyListTargetEntries(draft.propertyList) !== null;
  const canEditRetainedInventory = canEditExistingItemInventory(source.source);
  const itemInventoryState = isBlueprintEditor || canEditRetainedInventory
    ? "ACTIVE_NOW"
    : "PRESERVE_ONLY";
  const itemInventoryTitle = isBlueprintEditor
    ? "ACTIVE_NOW: Item-wizard reference-form UTI ItemList authoring"
    : canEditRetainedInventory
      ? "ACTIVE_NOW: retained identities are read-only; exact catalog UTI add is enabled"
      : "PRESERVE_ONLY: exact retained ground-item ItemList provenance is unavailable";
  const blueprintReferenceLists = isBlueprintEditor
    ? readItemBlueprintReferenceLists(
        draft.blueprintInventoryItems,
        draft.blueprintEquippedItems,
        draft.resRef,
      )
    : null;
  const itemInventoryTargetComplete = isBlueprintEditor
    ? blueprintReferenceLists !== null
    : !canEditRetainedInventory || readItemInventoryTargetEntries(
        draft.inventoryItems,
        source.source?.itemInventoryItems,
      ) !== null;
  const canEditRetainedBaseAppearance = canEditExistingItemBaseAppearance(
    source.source,
    itemBaseItemCatalog,
  );
  const canEditBaseAppearance = isBlueprintEditor || canEditRetainedBaseAppearance;
  const baseAppearanceState = canEditBaseAppearance ? "ACTIVE_NOW" : "PRESERVE_ONLY";
  const baseAppearanceTitle = isBlueprintEditor
    ? "ACTIVE_NOW: Item-wizard UTI BaseItem/appearance authoring"
    : canEditRetainedBaseAppearance
      ? "ACTIVE_NOW: exact catalog-bound retained ground-item BaseItem/appearance"
      : "PRESERVE_ONLY: exact catalog-bound retained ground-item BaseItem/appearance provenance is unavailable";
  const selectedBaseItemRow = canEditRetainedBaseAppearance &&
    Number.isSafeInteger(draft.baseItem)
    ? itemBaseItemCatalog?.rows[Number(draft.baseItem)]
    : undefined;
  const retainedModelType = selectedBaseItemRow && selectedBaseItemRow.rowIndex === draft.baseItem
    ? selectedBaseItemRow.modelType
    : undefined;
  const canEditModelPart1 = isBlueprintEditor || canEditRetainedBaseAppearance &&
    (retainedModelType === 0 || retainedModelType === 1 || retainedModelType === 2);
  const canEditModelPart2 = isBlueprintEditor || canEditRetainedBaseAppearance &&
    retainedModelType === 2;
  const canEditModelPart3 = canEditModelPart2;
  const canEditArmorParts = isBlueprintEditor || canEditRetainedBaseAppearance &&
    retainedModelType === 3;
  const canEditMaterialColors = isBlueprintEditor || canEditRetainedBaseAppearance &&
    (retainedModelType === 1 || retainedModelType === 3);
  const itemBaseAppearanceTargetComplete = isExistingItemBaseAppearanceTargetComplete(
    source.source,
    draft,
    itemBaseItemCatalog,
  );
  const blueprintOnlyState = isBlueprintEditor ? "ACTIVE_NOW" : "PRESERVE_ONLY";
  const blueprintOnlyTitle = isBlueprintEditor
    ? "ACTIVE_NOW: Item-wizard UTI authoring"
    : "PRESERVE_ONLY: no exact retained ground-item write contract";

  return (
    <SharedPropertyDialogChrome
      articleRef={itemPropertiesDialogRef}
      articleClassName="canvas-placeable-properties-dialog canvas-item-properties-dialog"
      ariaLabel="Item properties dialog"
      windowX={itemPropertiesDialog.windowX}
      windowY={itemPropertiesDialog.windowY}
      headerClassName="canvas-placeable-properties-header"
      headerCopyClassName="canvas-placeable-properties-header-copy"
      headerActionsClassName="canvas-placeable-properties-header-actions"
      title="Item Properties"
      subtitle={`${draft.name || draft.tag || draft.resRef} / ${draft.resRef}`}
      collapsed={itemPropertiesDialog.collapsed}
      collapseLabel="Collapse item properties dialog"
      expandLabel="Expand item properties dialog"
      closeLabel="Close item properties dialog"
      onToggleCollapsed={toggleItemPropertiesDialogCollapsed}
      onClose={cancelItemPropertiesDialog}
      onHeaderPointerDown={startItemPropertiesDialogDrag}
      onHeaderPointerMove={moveItemPropertiesDialogDrag}
      onHeaderPointerUp={endItemPropertiesDialogDrag}
      onHeaderPointerCancel={cancelItemPropertiesDialogDrag}
    >
      <>
        <SharedPropertyTabsNav
          className="canvas-placeable-properties-tabs"
          ariaLabel="Item property sections"
          tabs={ITEM_PROPERTIES_TAB_OPTIONS}
          activeTab={itemPropertiesDialog.activeTab}
          onSelectTab={setItemPropertiesActiveTab}
        />

        {!itemPropertiesDialog.collapsed ? (
          <section className="canvas-placeable-properties-body">
            {!itemBaseAppearanceTargetComplete ? (
              <p className="canvas-placeable-properties-provenance-state" role="status">
                INCOMPLETE_BASE_APPEARANCE_TARGET
              </p>
            ) : null}
            <ItemModelPreviewPane
              object={source}
              previewImageUrl={source.previewImageUrl}
              previewImageAlt={`${draft.tag || draft.resRef || source.tag} preview`}
              assetAccessToken={itemAssetAccessToken}
              processingStatus={itemPropertiesDialog.previewProcessingStatus}
            />

            <div className="canvas-placeable-properties-content">
              {itemPropertiesDialog.activeTab === "basic" ? (
                <div className="canvas-placeable-properties-basic canvas-item-properties-basic">
                  <label className="canvas-placeable-properties-field-row">
                    <span>
                      Name{" "}
                      <small className="canvas-property-support-state">
                        {blueprintOnlyState}
                      </small>
                    </span>
                    <input
                      type="text"
                      aria-label="Name"
                      disabled={!isBlueprintEditor}
                      title={blueprintOnlyTitle}
                      value={draft.name}
                      onChange={(event) =>
                        updateItemPropertiesDraftField("name", event.target.value)
                      }
                    />
                  </label>
                  <label className="canvas-placeable-properties-field-row">
                    <span>
                      Tag{" "}
                      <small className="canvas-property-support-state">
                        {canEditTag ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                      </small>
                    </span>
                    <input
                      type="text"
                      aria-label="Tag"
                      value={draft.tag}
                      disabled={!canEditTag}
                      maxLength={MAX_ITEM_TAG_CODE_UNITS}
                      title={isBlueprintEditor
                        ? "ACTIVE_NOW: Item-wizard UTI Tag"
                        : canEditRetainedTag
                        ? "ACTIVE_NOW: exact retained ground-item Tag"
                        : "PRESERVE_ONLY: exact retained ground-item Tag provenance is unavailable"}
                      onChange={(event) =>
                        updateItemPropertiesDraftField("tag", event.target.value)
                      }
                    />
                  </label>
                  <label className="canvas-placeable-properties-field-row">
                    <span>
                      ResRef{" "}
                      <small className="canvas-property-support-state">
                        {canEditTemplateResRef ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                      </small>
                    </span>
                    <input
                      type="text"
                      aria-label="ResRef"
                      value={draft.resRef}
                      disabled={!canEditTemplateResRef}
                      maxLength={ITEM_TEMPLATE_RESREF_MAX_CODE_UNITS}
                      title={isBlueprintEditor
                        ? "ACTIVE_NOW: Item-wizard UTI TemplateResRef"
                        : canEditRetainedTemplateResRef
                        ? "ACTIVE_NOW: exact retained ground-item TemplateResRef"
                        : "PRESERVE_ONLY: exact retained ground-item TemplateResRef provenance is unavailable"}
                      onChange={(event) =>
                        updateItemPropertiesDraftField("resRef", event.target.value)
                      }
                    />
                  </label>
                  <label className="canvas-placeable-properties-field-row">
                    <span>
                      Localized Name{" "}
                      <small className="canvas-property-support-state">
                        {canEditLocalizedName ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                      </small>
                    </span>
                    <input
                      type="text"
                      aria-label="Localized Name"
                      value={draft.localizedName}
                      disabled={!canEditLocalizedName}
                      maxLength={MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES}
                      title={isBlueprintEditor
                        ? "ACTIVE_NOW: Item-wizard UTI LocalizedName"
                        : canEditRetainedLocalizedName
                        ? "ACTIVE_NOW: exact retained ground-item LocalizedName"
                        : "PRESERVE_ONLY: exact retained ground-item LocalizedName provenance is unavailable"}
                      onChange={(event) =>
                        updateItemPropertiesDraftField("localizedName", event.target.value)
                      }
                    />
                  </label>
                  {canEditRetainedLocalizedName ? (
                    <LocalizedStringEntryEditor
                      objectLabel="Item"
                      fieldLabel="Name"
                      entries={draft.localizedNameEntries}
                      defaultTextMaxLength={MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES}
                      entryTextMaxLength={MAX_ITEM_LOCALIZED_STRING_ENTRY_BYTES}
                      maxEntries={MAX_ITEM_LOCALIZED_STRING_ENTRIES}
                      maxTotalTextLength={MAX_ITEM_LOCALIZED_STRING_TOTAL_TEXT_BYTES}
                      isInlineText={isItemLocalizedStringInlineAsciiText}
                      onChange={(entries) => updateItemPropertiesDraftField(
                        "localizedNameEntries",
                        entries,
                      )}
                    />
                  ) : null}
                  <label className="canvas-placeable-properties-field-row">
                    <span>
                      Name StrRef{" "}
                      <small className="canvas-property-support-state">
                        {blueprintOnlyState}
                      </small>
                    </span>
                    <input
                      type="number"
                      aria-label="Name StrRef"
                      step="1"
                      disabled={!isBlueprintEditor}
                      title={blueprintOnlyTitle}
                      value={draft.localizedNameStrRef ?? ""}
                      onChange={(event) =>
                        updateItemPropertiesDraftField(
                          "localizedNameStrRef",
                          parseOptionalIntegerInput(event.target.value)
                        )
                      }
                    />
                  </label>
                  <label className="canvas-placeable-properties-field-row">
                    <span>
                      Palette{" "}
                      <small className="canvas-property-support-state">
                        {blueprintOnlyState}
                      </small>
                    </span>
                    <input
                      type="number"
                      aria-label="Palette"
                      step="1"
                      disabled={!isBlueprintEditor}
                      title={blueprintOnlyTitle}
                      value={draft.paletteId ?? ""}
                      onChange={(event) =>
                        updateItemPropertiesDraftField(
                          "paletteId",
                          parseOptionalIntegerInput(event.target.value)
                        )
                      }
                    />
                  </label>
                  <label className="canvas-placeable-properties-field-row">
                    <span>
                      Base Item{" "}
                      <small className="canvas-property-support-state">
                        {baseAppearanceState}
                      </small>
                    </span>
                    {canEditRetainedBaseAppearance ? (
                      <select
                        aria-label="Base Item"
                        title={baseAppearanceTitle}
                        value={draft.baseItem ?? ""}
                        onChange={(event) =>
                          updateItemPropertiesDraftField(
                            "baseItem",
                            parseOptionalIntegerInput(event.target.value),
                          )
                        }
                      >
                        {itemBaseItemCatalog!.rows.map((row) => (
                          <option key={row.rowIndex} value={row.rowIndex}>
                            {row.rowIndex} — {row.displayName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="number"
                        aria-label="Base Item"
                        step="1"
                        disabled={!isBlueprintEditor}
                        title={baseAppearanceTitle}
                        value={draft.baseItem ?? ""}
                        onChange={(event) =>
                          updateItemPropertiesDraftField(
                            "baseItem",
                            parseOptionalIntegerInput(event.target.value)
                          )
                        }
                      />
                    )}
                  </label>
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>
                      Cost / Stack{" "}
                      <span className="canvas-property-support-state">
                        {canEditInstanceState ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                      </span>
                    </legend>
                    <div className="canvas-item-properties-grid">
                      {([
                        { field: "cost", label: "Cost", minimum: 0, maximum: 0xffff_ffff, exact: true },
                        { field: "addCost", label: "Add Cost", minimum: 0, maximum: 0xffff_ffff, exact: true },
                        { field: "charges", label: "Charges", minimum: 0, maximum: 0xff, exact: true },
                        { field: "stackSize", label: "Stack Size", minimum: 0, maximum: 0xffff, exact: true }
                      ] as const).map(({ field, label, exact, ...range }) => (
                        <label key={field} className="canvas-placeable-properties-field-row">
                          <span>{label}</span>
                          <input
                            type="number"
                            step="1"
                            min={"minimum" in range ? range.minimum : undefined}
                            max={"maximum" in range ? range.maximum : undefined}
                            disabled={
                              !isBlueprintEditor &&
                              (!exact || !canEditRetainedInstanceState)
                            }
                            title={isBlueprintEditor
                              ? "ACTIVE_NOW: Item-wizard UTI instance state"
                              : exact && canEditRetainedInstanceState
                              ? "ACTIVE_NOW: exact retained ground-item instance state"
                              : "PRESERVE_ONLY: exact mutable provenance is unavailable"}
                            value={draft[field] ?? ""}
                            onChange={(event) =>
                              updateItemPropertiesDraftField(
                                field,
                                parseOptionalIntegerInput(event.target.value)
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>
                      Flags{" "}
                      <span className="canvas-property-support-state">
                        {canEditInstanceState ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                      </span>
                    </legend>
                    <div className="canvas-placeable-properties-toggle-grid">
                      {([
                        ["identified", "Identified"],
                        ["stolen", "Stolen"],
                        ["plot", "Plot"],
                        ["cursed", "Cursed"]
                      ] as const).map(([field, label]) => (
                        <label key={field}>
                          <input
                            type="checkbox"
                            checked={draft[field]}
                            disabled={!canEditInstanceState}
                            title={isBlueprintEditor
                              ? "ACTIVE_NOW: Item-wizard UTI instance state"
                              : canEditRetainedInstanceState
                              ? "ACTIVE_NOW: exact retained ground-item instance state"
                              : "PRESERVE_ONLY: exact mutable provenance is unavailable"}
                            onChange={(event) =>
                              updateItemPropertiesDraftField(field, event.target.checked)
                            }
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <dl className="workspace-mode-inspector-list items-inspector-list">
                    <div>
                      <dt>Equip Slots</dt>
                      <dd>
                        {formatOptionalValue(
                          formatItemEquipSlotMask(source.itemProperties?.baseItemEquipableSlots) ??
                            source.itemProperties?.baseItemEquipableSlots
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Inventory Size</dt>
                      <dd>
                        {formatOptionalValue(source.itemProperties?.baseItemInvSlotWidth)} x{" "}
                        {formatOptionalValue(source.itemProperties?.baseItemInvSlotHeight)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              {itemPropertiesDialog.activeTab === "visual" ? (
                <div className="canvas-placeable-properties-basic canvas-item-properties-basic">
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>
                      Model Parts{" "}
                      <span className="canvas-property-support-state">
                        {baseAppearanceState}
                      </span>
                    </legend>
                    <div className="canvas-item-properties-grid">
                      {([
                        ["modelPart1", "Part 1", canEditModelPart1],
                        ["modelPart2", "Part 2", canEditModelPart2],
                        ["modelPart3", "Part 3", canEditModelPart3]
                      ] as const).map(([field, label, canEdit]) => (
                        <label key={field} className="canvas-placeable-properties-field-row">
                          <span>{label}</span>
                          <input
                            type="number"
                            step="1"
                            disabled={!canEdit}
                            title={baseAppearanceTitle}
                            value={draft[field] ?? ""}
                            onChange={(event) =>
                              updateItemPropertiesDraftField(
                                field,
                                parseOptionalIntegerInput(event.target.value)
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="canvas-placeable-properties-group">
                    <legend>
                      Armor Context{" "}
                      <span className="canvas-property-support-state">
                        {blueprintOnlyState}
                      </span>
                    </legend>
                    <div className="canvas-item-properties-grid">
                      {([
                        ["modelPrefix", "Prefix"],
                        ["label", "Label"],
                        ["gender", "Gender"],
                        ["phenotype", "Phenotype"],
                        ["raceModel", "Race Model"]
                      ] as const).map(([field, label]) => (
                        <label key={field} className="canvas-placeable-properties-field-row">
                          <span>{label}</span>
                          <input
                            type="text"
                            disabled={!isBlueprintEditor}
                            title={blueprintOnlyTitle}
                            value={draft.armorPreviewContext[field]}
                            onChange={(event) =>
                              updateItemArmorContextDraftField(field, event.target.value)
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="canvas-placeable-properties-group">
                    <legend>
                      Armor Parts{" "}
                      <span className="canvas-property-support-state">
                        {baseAppearanceState}
                      </span>
                    </legend>
                    <div className="canvas-item-properties-armor-grid">
                      {ITEM_ARMOR_PART_FIELDS.map((field) => (
                        <label key={field.key} className="canvas-placeable-properties-field-row">
                          <span>{field.label}</span>
                          <input
                            type="number"
                            step="1"
                            disabled={!canEditArmorParts}
                            title={baseAppearanceTitle}
                            value={draft.armorParts[field.key] ?? ""}
                            onChange={(event) =>
                              updateItemArmorPartDraftField(
                                field.key,
                                parseOptionalIntegerInput(event.target.value)
                              )
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <fieldset className="canvas-placeable-properties-group">
                    <legend>
                      Cloak / Robe{" "}
                      <span className="canvas-property-support-state">
                        {blueprintOnlyState}
                      </span>
                    </legend>
                    <div className="canvas-item-properties-grid">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Model Row</span>
                        <input
                          type="number"
                          step="1"
                          disabled={!isBlueprintEditor}
                          title={blueprintOnlyTitle}
                          value={draft.cloakModelRow ?? ""}
                          onChange={(event) =>
                            updateItemPropertiesDraftField(
                              "cloakModelRow",
                              parseOptionalIntegerInput(event.target.value)
                            )
                          }
                        />
                      </label>
                      {([
                        ["cloakModel", "Model"],
                        ["cloakTexture", "Texture"],
                        ["cloakIcon", "Icon"]
                      ] as const).map(([field, label]) => (
                        <label key={field} className="canvas-placeable-properties-field-row">
                          <span>{label}</span>
                          <input
                            type="number"
                            step="1"
                            disabled={!isBlueprintEditor}
                            title={blueprintOnlyTitle}
                            value={draft[field] ?? ""}
                            readOnly
                          />
                        </label>
                      ))}
                      {([
                        ["cloakModelResRef", "Model ResRef"],
                        ["cloakTextureResRef", "Texture ResRef"],
                        ["cloakIconResRef", "Icon ResRef"]
                      ] as const).map(([field, label]) => (
                        <label key={field} className="canvas-placeable-properties-field-row">
                          <span>{label}</span>
                          <input
                            type="text"
                            disabled={!isBlueprintEditor}
                            title={blueprintOnlyTitle}
                            value={draft[field]}
                            readOnly
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              ) : null}

              {itemPropertiesDialog.activeTab === "colors" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <legend>
                    Material Colors{" "}
                    <span className="canvas-property-support-state">
                      {baseAppearanceState}
                    </span>
                  </legend>
                  <div className="canvas-item-properties-color-grid">
                    {ITEM_MATERIAL_COLOR_FIELDS.map((field) => (
                      <label key={field.key} className="canvas-placeable-properties-field-row">
                        <span>{field.label}</span>
                        <div className="items-creator-color-input-row">
                          <i
                            aria-hidden="true"
                            style={{
                              backgroundColor: resolveItemMaterialColorHex(
                                field.key,
                                draft.materialColors[field.key] ?? 0
                              )
                            }}
                          />
                          <input
                            type="number"
                            min={0}
                            max={255}
                            step="1"
                            disabled={!canEditMaterialColors}
                            title={baseAppearanceTitle}
                            value={draft.materialColors[field.key] ?? ""}
                            onChange={(event) =>
                              updateItemMaterialColorDraftField(
                                field.key,
                                parseOptionalIntegerInput(event.target.value)
                              )
                            }
                          />
                        </div>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}

              {itemPropertiesDialog.activeTab === "properties" ? (
                <div className="canvas-placeable-properties-basic canvas-item-properties-basic">
                <fieldset className="canvas-placeable-properties-group">
                  <legend>
                    Item Properties{" "}
                    <span className="canvas-property-support-state">
                      {propertyListState}
                    </span>
                  </legend>
                  <div className="canvas-creature-properties-section-actions">
                    <button
                      type="button"
                      disabled={!canEditPropertyList}
                      title={propertyListTitle}
                      onClick={addItemPropertyEntry}
                    >
                      Add Property
                    </button>
                  </div>
                  {!itemPropertyListTargetComplete ? (
                    <p className="canvas-placeable-properties-provenance-state" role="status">
                      INCOMPLETE_TARGET
                    </p>
                  ) : null}
                  <table className="canvas-creature-properties-table canvas-item-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Label</th>
                        {ITEM_PROPERTY_NUMERIC_FIELDS.map((field) => (
                          <th key={field.key} scope="col">
                            {field.label}
                          </th>
                        ))}
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draft.propertyList.length > 0 ? (
                        draft.propertyList.map((entry, index) => (
                          <tr key={`item_property_${index + 1}`}>
                            <td>
                              <input
                                type="text"
                                aria-label={`Item property ${index + 1} label`}
                                disabled={!isBlueprintEditor}
                                title={propertyLabelTitle}
                                value={entry.propertyLabel ?? ""}
                                onChange={(event) =>
                                  updateItemPropertyEntry(
                                    index,
                                    "propertyLabel",
                                    event.target.value
                                  )
                                }
                              />
                            </td>
                            {ITEM_PROPERTY_NUMERIC_FIELDS.map((field) => (
                              <td key={field.key}>
                                <input
                                  type="number"
                                  min={0}
                                  max={field.maximum}
                                  step="1"
                                  aria-label={`Item property ${index + 1} ${field.label.toLowerCase()}`}
                                  disabled={!canEditPropertyList}
                                  title={propertyListTitle}
                                  value={entry[field.key] ?? ""}
                                  onChange={(event) =>
                                    updateItemPropertyEntry(
                                      index,
                                      field.key,
                                      parseOptionalIntegerInput(event.target.value)
                                    )
                                  }
                                />
                              </td>
                            ))}
                            <td>
                              <button
                                type="button"
                                aria-label={`Move item property ${index + 1} up`}
                                disabled={!canEditPropertyList || index === 0}
                                title={propertyListTitle}
                                onClick={() => moveItemPropertyEntry(index, "up")}
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                aria-label={`Move item property ${index + 1} down`}
                                disabled={!canEditPropertyList || index >= draft.propertyList.length - 1}
                                title={propertyListTitle}
                                onClick={() => moveItemPropertyEntry(index, "down")}
                              >
                                Down
                              </button>
                              <button
                                type="button"
                                aria-label={`Remove item property ${index + 1}`}
                                disabled={!canEditPropertyList}
                                title={propertyListTitle}
                                onClick={() => removeItemPropertyEntry(index)}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={ITEM_PROPERTY_NUMERIC_FIELDS.length + 2}>
                            No item properties
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </fieldset>
                {isBlueprintEditor ? (
                  <>
                    <fieldset className="canvas-placeable-properties-group">
                      <legend>
                        ItemList{" "}
                        <span className="canvas-property-support-state">ACTIVE_NOW</span>
                      </legend>
                      <p className="canvas-placeable-properties-provenance-state">
                        ItemList: ACTIVE_NOW
                      </p>
                      <p className="canvas-placeable-properties-provenance-state">
                        Ordered UTI reference entries. ResRef and repository Word coordinates are
                        authored without normalization.
                      </p>
                      {!itemInventoryTargetComplete ? (
                        <p className="canvas-placeable-properties-provenance-state" role="status">
                          INCOMPLETE_BLUEPRINT_REFERENCE_TARGET
                        </p>
                      ) : null}
                      <div className="canvas-creature-properties-section-actions">
                        <button
                          type="button"
                          aria-label="Add inventory reference"
                          title={itemInventoryTitle}
                          disabled={
                            draft.blueprintInventoryItems.length +
                              draft.blueprintEquippedItems.length >=
                            MAX_ITEM_BLUEPRINT_REFERENCE_COUNT
                          }
                          onClick={addItemBlueprintInventoryEntry}
                        >
                          Add Item
                        </button>
                      </div>
                      <table className="canvas-creature-properties-table canvas-item-properties-table">
                        <thead>
                          <tr>
                            <th scope="col">ResRef</th>
                            <th scope="col">Repo X</th>
                            <th scope="col">Repo Y</th>
                            <th scope="col">Order</th>
                            <th scope="col">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draft.blueprintInventoryItems.length > 0 ? (
                            draft.blueprintInventoryItems.map((entry, index) => (
                              <tr key={`item_blueprint_inventory_${index}`}>
                                <td>
                                  <input
                                    type="text"
                                    maxLength={16}
                                    aria-label={`Item blueprint inventory ${index + 1} resref`}
                                    title={itemInventoryTitle}
                                    value={entry.resRef}
                                    onChange={(event) => updateItemBlueprintInventoryEntry(
                                      index,
                                      "resRef",
                                      event.target.value,
                                    )}
                                  />
                                </td>
                                {(["x", "y"] as const).map((field) => (
                                  <td key={field}>
                                    <input
                                      type="number"
                                      min={0}
                                      max={0xffff}
                                      step="1"
                                      aria-label={`Item blueprint inventory ${index + 1} repo ${field}`}
                                      title={itemInventoryTitle}
                                      value={entry[field]}
                                      onChange={(event) => updateItemBlueprintInventoryEntry(
                                        index,
                                        field,
                                        parseOptionalIntegerInput(event.target.value) ?? -1,
                                      )}
                                    />
                                  </td>
                                ))}
                                <td>
                                  <button
                                    type="button"
                                    aria-label={`Move blueprint inventory item ${index + 1} up`}
                                    disabled={index === 0}
                                    onClick={() => moveItemBlueprintInventoryEntry(index, "up")}
                                  >
                                    Up
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Move blueprint inventory item ${index + 1} down`}
                                    disabled={index >= draft.blueprintInventoryItems.length - 1}
                                    onClick={() => moveItemBlueprintInventoryEntry(index, "down")}
                                  >
                                    Down
                                  </button>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    aria-label={`Remove blueprint inventory item ${index + 1}`}
                                    onClick={() => removeItemBlueprintInventoryEntry(index)}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan={5}>No inventory references</td></tr>
                          )}
                        </tbody>
                      </table>
                    </fieldset>
                    <fieldset className="canvas-placeable-properties-group">
                      <legend>
                        Equip_ItemList{" "}
                        <span className="canvas-property-support-state">ACTIVE_NOW</span>
                      </legend>
                      <p className="canvas-placeable-properties-provenance-state">
                        Equip_ItemList: ACTIVE_NOW
                      </p>
                      <p className="canvas-placeable-properties-provenance-state">
                        One exact reference per unique native one-hot equipment slot.
                      </p>
                      <div className="canvas-creature-properties-section-actions">
                        <button
                          type="button"
                          aria-label="Add equipment reference"
                          title={itemInventoryTitle}
                          disabled={
                            draft.blueprintEquippedItems.length >=
                              AURORA_ITEM_EQUIPMENT_SLOT_OPTIONS.length ||
                            draft.blueprintInventoryItems.length +
                              draft.blueprintEquippedItems.length >=
                              MAX_ITEM_BLUEPRINT_REFERENCE_COUNT
                          }
                          onClick={addItemBlueprintEquipmentEntry}
                        >
                          Add Equipped Item
                        </button>
                      </div>
                      <table className="canvas-creature-properties-table canvas-item-properties-table">
                        <thead>
                          <tr>
                            <th scope="col">ResRef</th>
                            <th scope="col">Slot</th>
                            <th scope="col">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draft.blueprintEquippedItems.length > 0 ? (
                            draft.blueprintEquippedItems.map((entry, index) => (
                              <tr key={`item_blueprint_equipment_${entry.slotMask}_${index}`}>
                                <td>
                                  <input
                                    type="text"
                                    maxLength={16}
                                    aria-label={`Item blueprint equipment ${index + 1} resref`}
                                    title={itemInventoryTitle}
                                    value={entry.resRef}
                                    onChange={(event) => updateItemBlueprintEquipmentEntry(
                                      index,
                                      "resRef",
                                      event.target.value,
                                    )}
                                  />
                                </td>
                                <td>
                                  <select
                                    aria-label={`Item blueprint equipment ${index + 1} slot`}
                                    title={itemInventoryTitle}
                                    value={entry.slotMask}
                                    onChange={(event) => updateItemBlueprintEquipmentEntry(
                                      index,
                                      "slotMask",
                                      Number.parseInt(event.target.value, 10),
                                    )}
                                  >
                                    {AURORA_ITEM_EQUIPMENT_SLOT_OPTIONS.map((option) => (
                                      <option
                                        key={option.value}
                                        value={option.value}
                                        disabled={draft.blueprintEquippedItems.some(
                                          (candidate, candidateIndex) =>
                                            candidateIndex !== index &&
                                            candidate.slotMask === option.value,
                                        )}
                                      >
                                        {option.selectLabel}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    aria-label={`Remove blueprint equipment item ${index + 1}`}
                                    onClick={() => removeItemBlueprintEquipmentEntry(index)}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan={3}>No equipment references</td></tr>
                          )}
                        </tbody>
                      </table>
                    </fieldset>
                  </>
                ) : (
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>
                      ItemList{" "}
                      <span className="canvas-property-support-state">
                        {itemInventoryState}
                      </span>
                    </legend>
                    <p className="canvas-placeable-properties-provenance-state">
                      Retained identities stay immutable. Exact effective UTI catalog entries may
                      be added; order, repository coordinates, and removal are writable.
                    </p>
                    <div className="canvas-creature-properties-section-actions">
                      <select
                        aria-label="Inventory UTI template"
                        title={itemInventoryTitle}
                        disabled={!canEditRetainedInventory || itemInventoryBlueprintOptions.length === 0}
                        value={selectedInventoryBlueprintObjectId}
                        onChange={(event) => setSelectedInventoryBlueprintObjectId(event.target.value)}
                      >
                        {itemInventoryBlueprintOptions.length === 0 ? (
                          <option value="">No exact effective UTI templates</option>
                        ) : itemInventoryBlueprintOptions.map((option) => (
                          <option key={option.templateObjectId} value={option.templateObjectId}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        aria-label="Add catalog inventory item"
                        title={itemInventoryTitle}
                        disabled={
                          !canEditRetainedInventory ||
                          selectedInventoryBlueprintObjectId.length === 0 ||
                          draft.inventoryItems.length >= MAX_AREA_ITEM_INVENTORY_ENTRIES
                        }
                        onClick={() => addItemInventoryBlueprintEntry(
                          selectedInventoryBlueprintObjectId,
                        )}
                      >
                        Add Item
                      </button>
                    </div>
                    {!itemInventoryTargetComplete ? (
                      <p className="canvas-placeable-properties-provenance-state" role="status">
                        INCOMPLETE_INVENTORY_TARGET
                      </p>
                    ) : null}
                    <table className="canvas-creature-properties-table canvas-item-properties-table">
                      <thead>
                        <tr>
                          <th scope="col">Identity</th>
                          <th scope="col">Repo X</th>
                          <th scope="col">Repo Y</th>
                          <th scope="col">Order</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draft.inventoryItems.length > 0 ? (
                          draft.inventoryItems.map((entry, index) => (
                            <tr key={"sourceIndex" in entry
                              ? `item_inventory_retained_${entry.sourceIndex}_${index}`
                              : `item_inventory_blueprint_${entry.itemTemplateId}_${index}`}
                            >
                              <td>
                                <input
                                  type="text"
                                  aria-label={`Item inventory ${index + 1} resref`}
                                  disabled
                                  title={"sourceIndex" in entry
                                    ? "READ_ONLY: retained embedded Item identity"
                                    : "READ_ONLY: exact effective catalog UTI identity"}
                                  value={entry.resRef}
                                />
                              </td>
                              {(["x", "y"] as const).map((field) => (
                                <td key={field}>
                                  <input
                                    type="number"
                                    min={0}
                                    max={0xffff}
                                    step="1"
                                    disabled={!canEditRetainedInventory}
                                    title={itemInventoryTitle}
                                    aria-label={`Item inventory ${index + 1} repo ${field}`}
                                    value={entry[field]}
                                    onChange={(event) => updateItemInventoryCoordinate(
                                      index,
                                      field,
                                      parseOptionalIntegerInput(event.target.value) ?? 0,
                                    )}
                                  />
                                </td>
                              ))}
                              <td>
                                <button
                                  type="button"
                                  aria-label={`Move inventory item ${index + 1} up`}
                                  disabled={!canEditRetainedInventory || index === 0}
                                  title={itemInventoryTitle}
                                  onClick={() => moveItemInventoryEntry(index, "up")}
                                >
                                  Up
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Move inventory item ${index + 1} down`}
                                  disabled={
                                    !canEditRetainedInventory ||
                                    index >= draft.inventoryItems.length - 1
                                  }
                                  title={itemInventoryTitle}
                                  onClick={() => moveItemInventoryEntry(index, "down")}
                                >
                                  Down
                                </button>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  aria-label={`Remove inventory item ${index + 1}`}
                                  disabled={!canEditRetainedInventory}
                                  title={itemInventoryTitle}
                                  onClick={() => removeItemInventoryEntry(index)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={5}>No inventory entries</td></tr>
                        )}
                      </tbody>
                    </table>
                  </fieldset>
                )}
                </div>
              ) : null}

              {itemPropertiesDialog.activeTab === "variables" ? (
                <div className="canvas-placeable-properties-group">
                  <div className="canvas-placeable-properties-variables-row">
                    <span className="canvas-placeable-properties-provenance-state">
                      {canEditVariables ? "ACTIVE_NOW" : "PRESERVE_ONLY"}
                    </span>
                  </div>
                  <AuroraVariableTableEditor
                    entries={draft.variables}
                    editable={canEditVariables}
                    ariaLabelPrefix="Item variable"
                    actionAriaLabelPrefix="item variable"
                    addButtonAriaLabel="Add variable"
                    onAdd={addItemVariable}
                    onUpdate={updateItemVariable}
                    onMove={moveItemVariable}
                    onRemove={removeItemVariable}
                  />
                </div>
              ) : null}

              {itemPropertiesDialog.activeTab === "comments" ? (
                <>
                  <SharedLongTextPropertySection
                    sectionClassName="canvas-placeable-properties-group"
                    legend="Description"
                    label="Description"
                    value={draft.description}
                    disabled={!canEditDescription}
                    maxLength={MAX_ITEM_DESCRIPTION_ASCII_BYTES}
                    onChange={(nextValue) =>
                      updateItemPropertiesDraftField("description", nextValue)
                    }
                    rows={5}
                  />
                  {canEditRetainedDescription ? (
                    <LocalizedStringEntryEditor
                      objectLabel="Item"
                      fieldLabel="Description"
                      entries={draft.descriptionEntries}
                      defaultTextMaxLength={MAX_ITEM_DESCRIPTION_ASCII_BYTES}
                      entryTextMaxLength={MAX_ITEM_LOCALIZED_STRING_ENTRY_BYTES}
                      maxEntries={MAX_ITEM_LOCALIZED_STRING_ENTRIES}
                      maxTotalTextLength={MAX_ITEM_LOCALIZED_STRING_TOTAL_TEXT_BYTES}
                      isInlineText={isItemLocalizedStringInlineAsciiText}
                      onChange={(entries) => updateItemPropertiesDraftField(
                        "descriptionEntries",
                        entries,
                      )}
                    />
                  ) : null}
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>Localized String References</legend>
                    <div className="canvas-item-properties-grid">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Description StrRef</span>
                        <input
                          type="number"
                          step="1"
                          disabled={!isBlueprintEditor}
                          title={blueprintOnlyTitle}
                          value={draft.descriptionStrRef ?? ""}
                          onChange={(event) =>
                            updateItemPropertiesDraftField(
                              "descriptionStrRef",
                              parseOptionalIntegerInput(event.target.value)
                            )
                          }
                        />
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Identified StrRef</span>
                        <input
                          type="number"
                          step="1"
                          disabled={!isBlueprintEditor}
                          title={blueprintOnlyTitle}
                          value={draft.identifiedDescriptionStrRef ?? ""}
                          onChange={(event) =>
                            updateItemPropertiesDraftField(
                              "identifiedDescriptionStrRef",
                              parseOptionalIntegerInput(event.target.value)
                            )
                          }
                        />
                      </label>
                    </div>
                  </fieldset>
                  <SharedLongTextPropertySection
                    sectionClassName="canvas-placeable-properties-group"
                    legend="Identified Description"
                    label="Identified Description"
                    value={draft.identifiedDescription}
                    disabled={!canEditIdentifiedDescription}
                    maxLength={MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES}
                    onChange={(nextValue) =>
                      updateItemPropertiesDraftField("identifiedDescription", nextValue)
                    }
                    rows={5}
                  />
                  {canEditRetainedIdentifiedDescription ? (
                    <LocalizedStringEntryEditor
                      objectLabel="Item"
                      fieldLabel="Identified Description"
                      entries={draft.identifiedDescriptionEntries}
                      defaultTextMaxLength={MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES}
                      entryTextMaxLength={MAX_ITEM_LOCALIZED_STRING_ENTRY_BYTES}
                      maxEntries={MAX_ITEM_LOCALIZED_STRING_ENTRIES}
                      maxTotalTextLength={MAX_ITEM_LOCALIZED_STRING_TOTAL_TEXT_BYTES}
                      isInlineText={isItemLocalizedStringInlineAsciiText}
                      onChange={(entries) => updateItemPropertiesDraftField(
                        "identifiedDescriptionEntries",
                        entries,
                      )}
                    />
                  ) : null}
                  <SharedLongTextPropertySection
                    sectionClassName="canvas-placeable-properties-group"
                    legend="Comments"
                    label="Comments"
                    value={draft.comments}
                    disabled={!canEditEditorComment}
                    maxLength={ITEM_EDITOR_COMMENT_MAX_CODE_UNITS}
                    onChange={(nextValue) => updateItemPropertiesDraftField("comments", nextValue)}
                    rows={5}
                  />
                </>
              ) : null}
            </div>
          </section>
        ) : null}

        <SharedDialogActionsFooter
          className="canvas-placeable-properties-actions"
          onApply={() => applyItemPropertiesDraft(false)}
          onOk={() => applyItemPropertiesDraft(true)}
          onCancel={() => cancelItemPropertiesDialog()}
          applyDisabled={
            !itemPropertyListTargetComplete ||
            !itemInventoryTargetComplete ||
            !itemBaseAppearanceTargetComplete
          }
          okDisabled={
            !itemPropertyListTargetComplete ||
            !itemInventoryTargetComplete ||
            !itemBaseAppearanceTargetComplete
          }
        />
      </>
    </SharedPropertyDialogChrome>
  );
}
