import type { PointerEventHandler, Ref } from "react";
import type {
  SceneObjectItemArmorParts,
  SceneObjectItemMaterialColors,
  SceneObjectItemPropertyEntry
} from "../../../scene/contracts";
import {
  ITEM_PROPERTIES_TAB_OPTIONS,
  type ItemPropertiesDialogState,
  type ItemPropertiesDraft,
  type ItemPropertiesTab
} from "../../application/workspaceObjectPropertyDrafts";
import { formatItemEquipSlotMask } from "../../../items/application/itemEquipSlots";
import { resolveItemMaterialColorHex } from "../../../items/application/itemPresentation";
import {
  SharedDialogActionsFooter,
  SharedLongTextPropertySection,
  SharedPropertyDialogChrome,
  SharedPropertyTabsNav
} from "./SharedPropertyDialogSections";
import { ItemModelPreviewPane } from "./ItemModelPreviewPane";

type ItemPropertiesEditableField =
  | "name"
  | "tag"
  | "resRef"
  | "localizedName"
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
  | "costTable"
  | "costValue"
  | "charges"
  | "stackSize"
  | "identified"
  | "stolen"
  | "plot"
  | "cursed"
  | "description"
  | "descriptionStrRef"
  | "identifiedDescription"
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
    value: string | number | boolean | undefined
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
  removeItemPropertyEntry: (index: number) => void;
  addItemScriptEntry: () => void;
  updateItemScriptEntry: (scriptKey: string, nextKey: string, value: string) => void;
  removeItemScriptEntry: (scriptKey: string) => void;
  applyItemPropertiesDraft: (closeAfterApply: boolean) => void;
  itemAssetAccessToken?: string | null;
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
}> = [
  { key: "propertyName", label: "Property" },
  { key: "subtype", label: "Subtype" },
  { key: "costTable", label: "Cost Table" },
  { key: "costValue", label: "Cost Value" },
  { key: "param1", label: "Param 1" },
  { key: "param1Value", label: "Param 1 Value" },
  { key: "chanceAppear", label: "Chance" }
];

const ITEM_SCRIPT_RESREF_MAX_LENGTH = 16;

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

function sanitizeScriptKey(value: string): string {
  return value.trim().slice(0, ITEM_SCRIPT_RESREF_MAX_LENGTH);
}

function sanitizeScriptResRef(value: string): string {
  return value.trim().slice(0, ITEM_SCRIPT_RESREF_MAX_LENGTH);
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
  removeItemPropertyEntry,
  addItemScriptEntry,
  updateItemScriptEntry,
  removeItemScriptEntry,
  applyItemPropertiesDraft,
  itemAssetAccessToken = null,
  startItemPropertiesDialogDrag,
  moveItemPropertiesDialogDrag,
  endItemPropertiesDialogDrag,
  cancelItemPropertiesDialogDrag
}: ItemPropertiesDialogProps) {
  const draft = itemPropertiesDialog.draft;
  const source = itemPropertiesDialog.snapshotObject;
  const scriptEntries = Object.entries(draft.scripts).sort(([left], [right]) =>
    left.localeCompare(right)
  );

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
                    <span>Name</span>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(event) =>
                        updateItemPropertiesDraftField("name", event.target.value)
                      }
                    />
                  </label>
                  <label className="canvas-placeable-properties-field-row">
                    <span>Tag</span>
                    <input
                      type="text"
                      value={draft.tag}
                      onChange={(event) =>
                        updateItemPropertiesDraftField("tag", event.target.value)
                      }
                    />
                  </label>
                  <label className="canvas-placeable-properties-field-row">
                    <span>ResRef</span>
                    <input
                      type="text"
                      value={draft.resRef}
                      onChange={(event) =>
                        updateItemPropertiesDraftField("resRef", event.target.value)
                      }
                    />
                  </label>
                  <label className="canvas-placeable-properties-field-row">
                    <span>Localized Name</span>
                    <input
                      type="text"
                      value={draft.localizedName}
                      onChange={(event) =>
                        updateItemPropertiesDraftField("localizedName", event.target.value)
                      }
                    />
                  </label>
                  <label className="canvas-placeable-properties-field-row">
                    <span>Name StrRef</span>
                    <input
                      type="number"
                      step="1"
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
                    <span>Palette</span>
                    <input
                      type="number"
                      step="1"
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
                    <span>Base Item</span>
                    <input
                      type="number"
                      step="1"
                      value={draft.baseItem ?? ""}
                      onChange={(event) =>
                        updateItemPropertiesDraftField(
                          "baseItem",
                          parseOptionalIntegerInput(event.target.value)
                        )
                      }
                    />
                  </label>
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>Cost / Stack</legend>
                    <div className="canvas-item-properties-grid">
                      {([
                        ["cost", "Cost"],
                        ["addCost", "Add Cost"],
                        ["costTable", "Cost Table"],
                        ["costValue", "Cost Value"],
                        ["charges", "Charges"],
                        ["stackSize", "Stack Size"]
                      ] as const).map(([field, label]) => (
                        <label key={field} className="canvas-placeable-properties-field-row">
                          <span>{label}</span>
                          <input
                            type="number"
                            step="1"
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
                    <legend>Flags</legend>
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
                    <legend>Model Parts</legend>
                    <div className="canvas-item-properties-grid">
                      {([
                        ["modelPart1", "Part 1"],
                        ["modelPart2", "Part 2"],
                        ["modelPart3", "Part 3"]
                      ] as const).map(([field, label]) => (
                        <label key={field} className="canvas-placeable-properties-field-row">
                          <span>{label}</span>
                          <input
                            type="number"
                            step="1"
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
                    <legend>Armor Context</legend>
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
                    <legend>Armor Parts</legend>
                    <div className="canvas-item-properties-armor-grid">
                      {ITEM_ARMOR_PART_FIELDS.map((field) => (
                        <label key={field.key} className="canvas-placeable-properties-field-row">
                          <span>{field.label}</span>
                          <input
                            type="number"
                            step="1"
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
                    <legend>Cloak / Robe</legend>
                    <div className="canvas-item-properties-grid">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Model Row</span>
                        <input
                          type="number"
                          step="1"
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
                  <legend>Material Colors</legend>
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
                <fieldset className="canvas-placeable-properties-group">
                  <legend>Item Properties</legend>
                  <div className="canvas-creature-properties-section-actions">
                    <button type="button" onClick={addItemPropertyEntry}>
                      Add Property
                    </button>
                  </div>
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
                                  step="1"
                                  aria-label={`Item property ${index + 1} ${field.label.toLowerCase()}`}
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
              ) : null}

              {itemPropertiesDialog.activeTab === "scripts" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <legend>Scripts</legend>
                  <div className="canvas-creature-properties-section-actions">
                    <button type="button" onClick={addItemScriptEntry}>
                      Add Script
                    </button>
                  </div>
                  <table className="canvas-creature-properties-table canvas-item-scripts-table">
                    <thead>
                      <tr>
                        <th scope="col">Slot</th>
                        <th scope="col">Script</th>
                        <th scope="col">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scriptEntries.length > 0 ? (
                        scriptEntries.map(([scriptKey, scriptValue], index) => (
                          <tr key={`${scriptKey}_${index}`}>
                            <td>
                              <input
                                type="text"
                                aria-label={`Item script ${index + 1} slot`}
                                maxLength={ITEM_SCRIPT_RESREF_MAX_LENGTH}
                                title="Aurora script slot label ResRef max 16 characters"
                                value={scriptKey}
                                onChange={(event) =>
                                  updateItemScriptEntry(
                                    scriptKey,
                                    sanitizeScriptKey(event.target.value),
                                    scriptValue
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                aria-label={`Item script ${index + 1} value`}
                                maxLength={ITEM_SCRIPT_RESREF_MAX_LENGTH}
                                title="Aurora script ResRef max 16 characters"
                                value={scriptValue}
                                onChange={(event) =>
                                  updateItemScriptEntry(
                                    scriptKey,
                                    scriptKey,
                                    sanitizeScriptResRef(event.target.value)
                                  )
                                }
                              />
                            </td>
                            <td>
                              <button type="button" onClick={() => removeItemScriptEntry(scriptKey)}>
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3}>No scripts</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </fieldset>
              ) : null}

              {itemPropertiesDialog.activeTab === "comments" ? (
                <>
                  <SharedLongTextPropertySection
                    sectionClassName="canvas-placeable-properties-group"
                    legend="Description"
                    label="Description"
                    value={draft.description}
                    onChange={(nextValue) =>
                      updateItemPropertiesDraftField("description", nextValue)
                    }
                    rows={5}
                  />
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>Localized String References</legend>
                    <div className="canvas-item-properties-grid">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Description StrRef</span>
                        <input
                          type="number"
                          step="1"
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
                    onChange={(nextValue) =>
                      updateItemPropertiesDraftField("identifiedDescription", nextValue)
                    }
                    rows={5}
                  />
                  <SharedLongTextPropertySection
                    sectionClassName="canvas-placeable-properties-group"
                    legend="Comments"
                    label="Comments"
                    value={draft.comments}
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
        />
      </>
    </SharedPropertyDialogChrome>
  );
}
