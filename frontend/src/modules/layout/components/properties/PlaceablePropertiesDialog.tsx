import type { PointerEventHandler, Ref } from "react";
import type { SceneObject } from "../../contracts";
import {
  SharedAdvancedSettingsSection,
  SharedDialogActionsFooter,
  SharedLongTextPropertySection,
  SharedObjectPreviewPane,
  SharedPropertyDialogChrome,
  SharedPropertyTabsNav,
  SharedScriptSlotSection
} from "./SharedPropertyDialogSections";
import {
  SharedLockPropertySection,
  SharedTrapPropertySection
} from "./LockTrapPropertySections";
import {
  PLACEABLE_FACTION_OPTIONS,
  PLACEABLE_INITIAL_STATE_OPTIONS,
  PLACEABLE_PROPERTIES_TAB_OPTIONS,
  PLACEABLE_SCRIPT_SLOT_KEYS,
  PLACEABLE_SCRIPT_SLOT_LABELS,
  PLACEABLE_TRAP_TYPE_OPTIONS,
  PLACEABLE_TREASURE_MODEL_OPTIONS,
  type PlaceablePropertiesDialogState,
  type PlaceablePropertiesDraft,
  type PlaceablePropertiesTab,
  type PlaceableScriptSlotKey
} from "../../application/workspaceObjectPropertyDrafts";
import {
  resolvePlaceableRenderContractState,
  type PlaceableRenderContractState
} from "../../application/workspacePlaceableRenderContracts";
import type { PlaceableViewportRenderPayload } from "../../../placeables/application/placeableRenderPayloadResolver";

type PlaceablePropertiesEditableField =
  | "name"
  | "tag"
  | "resRef"
  | "isStatic"
  | "plot"
  | "useable"
  | "hasInventory"
  | "scriptSlotsEnabled"
  | "disabledFlagsEnabled"
  | "hardness"
  | "hitPoints"
  | "fortitudeSave"
  | "reflexSave"
  | "willSave"
  | "description"
  | "comments";

interface PlaceablePropertiesDialogProps {
  placeablePropertiesDialog: PlaceablePropertiesDialogState;
  placeableRenderPayload?: PlaceableViewportRenderPayload | null;
  placeablePropertiesDialogRef?: Ref<HTMLElement>;
  togglePlaceablePropertiesDialogCollapsed: () => void;
  cancelPlaceablePropertiesDialog: () => void;
  setPlaceablePropertiesActiveTab: (nextTab: PlaceablePropertiesTab) => void;
  updatePlaceablePropertiesDraftField: (
    field: PlaceablePropertiesEditableField,
    value: string | boolean | number
  ) => void;
  updatePlaceableScriptSlotDraftField: (field: PlaceableScriptSlotKey, value: string) => void;
  updatePlaceableDisabledFlagDraftField: (
    field: keyof PlaceablePropertiesDraft["disabledFlags"],
    value: boolean
  ) => void;
  updatePlaceableLockDraftField: (
    field: keyof PlaceablePropertiesDraft["lockSettings"],
    value: string | boolean | number
  ) => void;
  updatePlaceableTrapDraftField: (
    field: keyof PlaceablePropertiesDraft["trapSettings"],
    value: string | boolean | number
  ) => void;
  updatePlaceableAdvancedDraftField: (
    field: keyof PlaceablePropertiesDraft["advancedSettings"],
    value: string | boolean
  ) => void;
  addPlaceableInventoryItem: () => void;
  updatePlaceableInventoryItem: (
    index: number,
    field: keyof PlaceablePropertiesDraft["inventoryItems"][number],
    value: string | number | boolean | undefined
  ) => void;
  removePlaceableInventoryItem: (index: number) => void;
  applyPlaceablePropertiesDraft: (closeAfterApply: boolean) => void;
  startPlaceablePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  movePlaceablePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  endPlaceablePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  cancelPlaceablePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
}

function formatObjectNumber(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toFixed(fractionDigits);
}

function formatOptionalText(value: string | undefined): string {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : "-";
}

function formatLinkedItemText(entry: {
  itemResRef?: string;
  itemTemplateId?: string;
  embeddedItem?: {
    templateResRef?: string;
    tag?: string;
    localizedName?: string;
    baseItem?: number;
    itemPropertyListCount?: number;
  };
}): string {
  const linked = formatOptionalText(entry.itemResRef ?? entry.itemTemplateId);
  if (linked !== "-") {
    return linked;
  }
  const embedded = entry.embeddedItem;
  if (!embedded) {
    return "-";
  }
  const identifier = embedded.templateResRef ?? embedded.tag ?? embedded.localizedName ?? "Item";
  const details = [
    embedded.localizedName && embedded.localizedName !== identifier
      ? embedded.localizedName
      : undefined,
    typeof embedded.baseItem === "number" ? `Base ${embedded.baseItem}` : undefined,
    typeof embedded.itemPropertyListCount === "number"
      ? `${embedded.itemPropertyListCount} props`
      : undefined
  ].filter((value): value is string => Boolean(value));
  return details.length > 0
    ? `Embedded ${identifier} (${details.join(", ")})`
    : `Embedded ${identifier}`;
}

function parseIntegerInput(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveSourceStatusLabel(object: SceneObject): string {
  return object.source?.type === "aurora_git" ? "source-backed GIT" : "fallback/local";
}

function resolveSourceIdLabel(object: SceneObject): string {
  return object.source?.sourceObjectId ?? object.id;
}

function resolveTemplateIdLabel(object: SceneObject): string {
  return object.source?.templateId ?? object.resRef;
}

function resolvePlacementLabel(object: SceneObject): string {
  return [
    `x ${formatObjectNumber(object.x, 2)}`,
    `y ${formatObjectNumber(object.y, 2)}`,
    `z ${formatObjectNumber(object.z, 2)}`,
    `bearing ${formatObjectNumber(object.bearing, 0)} deg`
  ].join(" / ");
}

function resolvePlaceableHandoffStatus(
  renderState: PlaceableRenderContractState | null,
  payload: PlaceableViewportRenderPayload | null | undefined
): {
  label: string;
  blocker: string;
  datasetStatus: string;
} {
  if (!payload || !renderState) {
    return {
      label: "blocked: no selected render contract payload",
      blocker: "placeable process/render contract payload not loaded for this selected object",
      datasetStatus: "missing-render-contract"
    };
  }

  if (renderState.fallbackToPrimitive) {
    return {
      label: "fallback primitive",
      blocker:
        renderState.modelFallbackReason ??
        "model delivery URL missing; viewport must keep primitive marker",
      datasetStatus: "fallback-primitive"
    };
  }

  return {
    label: "model handoff ready",
    blocker: "none for model URL; full Aurora parity still requires runtime visual proof",
    datasetStatus: "model-url-ready"
  };
}

function readPlaceableMetadataValue(
  payload: PlaceableViewportRenderPayload | null | undefined,
  keys: string[]
): string | null {
  const metadata = payload?.placeable.metadata;
  if (!metadata) {
    return null;
  }
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
  }
  return null;
}

function resolvePlaceableAppearanceLabel(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const sourceAppearanceType = object.source?.appearanceType;
  if (typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)) {
    return `GIT Appearance ${sourceAppearanceType}`;
  }
  const appearanceType = payload?.placeable.placeableRuntime?.state?.appearanceType;
  if (typeof appearanceType === "number" && Number.isFinite(appearanceType)) {
    return `render payload ${appearanceType}; Area GIT Appearance not carried yet`;
  }
  return "missing: Area object payload does not carry Appearance";
}

function resolvePlaceableModelNameLabel(
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  return (
    readPlaceableMetadataValue(payload, [
      "lookupModelResRef",
      "modelResRef",
      "reservedModelResRef",
      "modelName",
      "ModelName"
    ]) ?? "missing: placeables.2da ModelName not resolved in selected payload"
  );
}

function resolvePlaceableTwoDaLookupLabel(
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const source2da = readPlaceableMetadataValue(payload, ["source2da"]);
  const row = readPlaceableMetadataValue(payload, ["source2daRow", "appearanceId"]);
  const label = readPlaceableMetadataValue(payload, ["source2daLabel"]);
  const model = readPlaceableMetadataValue(payload, ["lookupModelResRef", "modelResRef"]);
  if (source2da && row && model) {
    return `${source2da} row ${row}${label ? ` (${label})` : ""} -> ${model}`;
  }
  if (model) {
    return `template/model metadata -> ${model}; 2DA row not exposed`;
  }
  return "blocked: placeables.2da resolver metadata not available";
}

function resolvePlaceableTemplateLookupLabel(
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  return (
    readPlaceableMetadataValue(payload, ["lookupTemplateResRef", "templateResRef"]) ??
    "blocked: template lookup resref not available"
  );
}

function resolvePlaceableDependencyLookupLabel(
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const dependencyCount = readPlaceableMetadataValue(payload, [
    "lookupDependencyCount",
    "dependencyCount"
  ]);
  const dependencyRefs = readPlaceableMetadataValue(payload, ["lookupDependencyRefs"]);
  if (dependencyRefs) {
    return `${dependencyCount ?? "?"} refs: ${dependencyRefs}`;
  }
  return "blocked: model dependency lookup refs not exposed";
}

function resolvePlaceableModelAssetLabel(
  renderState: PlaceableRenderContractState | null,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  if (renderState?.modelUrl) {
    return `model asset URL ready / ${renderState.modelStatus ?? "status unknown"}`;
  }
  if (renderState?.hasModelContract) {
    return "model contract present; delivery URL missing";
  }
  return payload ? "missing model asset contract" : "not loaded";
}

function resolvePlaceablePocBlocker(
  object: SceneObject,
  renderState: PlaceableRenderContractState | null,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const blockers: string[] = [];
  const sourceAppearanceType = object.source?.appearanceType;
  if (typeof sourceAppearanceType !== "number" || !Number.isFinite(sourceAppearanceType)) {
    blockers.push("Area GIT Appearance is not preserved in object payload");
  }
  if (!readPlaceableMetadataValue(payload, ["lookupModelResRef", "modelResRef"])) {
    blockers.push("placeables.2da ModelName lookup is not available for selected object");
  }
  if (!renderState?.modelUrl) {
    blockers.push(renderState?.modelFallbackReason ?? "model asset URL not ready");
  }
  return blockers.length > 0 ? blockers.join(" / ") : "none for visible model contract";
}

export function PlaceablePropertiesDialog({
  placeablePropertiesDialog,
  placeableRenderPayload = null,
  placeablePropertiesDialogRef,
  togglePlaceablePropertiesDialogCollapsed,
  cancelPlaceablePropertiesDialog,
  setPlaceablePropertiesActiveTab,
  updatePlaceablePropertiesDraftField,
  updatePlaceableScriptSlotDraftField,
  updatePlaceableDisabledFlagDraftField,
  updatePlaceableLockDraftField,
  updatePlaceableTrapDraftField,
  updatePlaceableAdvancedDraftField,
  addPlaceableInventoryItem,
  updatePlaceableInventoryItem,
  removePlaceableInventoryItem,
  applyPlaceablePropertiesDraft,
  startPlaceablePropertiesDialogDrag,
  movePlaceablePropertiesDialogDrag,
  endPlaceablePropertiesDialogDrag,
  cancelPlaceablePropertiesDialogDrag
}: PlaceablePropertiesDialogProps) {
  const sourceObject = placeablePropertiesDialog.snapshotObject;
  const renderState = placeableRenderPayload
    ? resolvePlaceableRenderContractState(placeableRenderPayload)
    : null;
  const handoffStatus = resolvePlaceableHandoffStatus(renderState, placeableRenderPayload);
  const pocModelBlocker = resolvePlaceablePocBlocker(
    sourceObject,
    renderState,
    placeableRenderPayload
  );
  const twoDaLookupLabel = resolvePlaceableTwoDaLookupLabel(placeableRenderPayload);

  return (
    <SharedPropertyDialogChrome
      articleRef={placeablePropertiesDialogRef}
      articleClassName="canvas-placeable-properties-dialog"
      ariaLabel="Placeable properties"
      windowX={placeablePropertiesDialog.windowX}
      windowY={placeablePropertiesDialog.windowY}
      headerClassName="canvas-placeable-properties-header"
      headerCopyClassName="canvas-placeable-properties-header-copy"
      headerActionsClassName="canvas-placeable-properties-header-actions"
      title="Placeable Object Properties"
      subtitle={placeablePropertiesDialog.draft.tag || placeablePropertiesDialog.objectId}
      collapsed={placeablePropertiesDialog.collapsed}
      collapseLabel="Collapse placeable properties dialog"
      expandLabel="Expand placeable properties dialog"
      closeLabel="Close placeable properties dialog"
      onToggleCollapsed={togglePlaceablePropertiesDialogCollapsed}
      onClose={cancelPlaceablePropertiesDialog}
      onArticleMouseDown={(event) => event.stopPropagation()}
      onArticleContextMenu={(event) => event.preventDefault()}
      onHeaderPointerDown={startPlaceablePropertiesDialogDrag}
      onHeaderPointerMove={movePlaceablePropertiesDialogDrag}
      onHeaderPointerUp={endPlaceablePropertiesDialogDrag}
      onHeaderPointerCancel={cancelPlaceablePropertiesDialogDrag}
    >
      <>
          <SharedPropertyTabsNav
            className="canvas-placeable-properties-tabs"
            ariaLabel="placeable properties tabs"
            tabs={PLACEABLE_PROPERTIES_TAB_OPTIONS}
            activeTab={placeablePropertiesDialog.activeTab}
            onSelectTab={setPlaceablePropertiesActiveTab}
          />

          <section
            className="canvas-area-object-evidence-panel"
            aria-label="Aurora placeable source and render handoff"
            data-source-status={sourceObject.source?.type === "aurora_git" ? "source-backed" : "fallback"}
            data-model-handoff-status={handoffStatus.datasetStatus}
            data-poc-model-path="git-appearance-placeables2da-modelname-model-asset"
            data-poc-model-blocker={pocModelBlocker}
            data-2da-lookup-status={twoDaLookupLabel.startsWith("blocked") ? "blocked" : "ready"}
          >
            <div className="canvas-area-object-evidence-header">
              <h3>Aurora Source / Render Handoff</h3>
              <span className="canvas-area-object-evidence-chip">{handoffStatus.label}</span>
            </div>
            <dl className="canvas-area-object-evidence-grid">
              <div>
                <dt>Source</dt>
                <dd>{resolveSourceStatusLabel(sourceObject)}</dd>
              </div>
              <div>
                <dt>Source ID</dt>
                <dd>{resolveSourceIdLabel(sourceObject)}</dd>
              </div>
              <div>
                <dt>Template</dt>
                <dd>{resolveTemplateIdLabel(sourceObject)}</dd>
              </div>
              <div>
                <dt>Placement</dt>
                <dd>{resolvePlacementLabel(sourceObject)}</dd>
              </div>
              <div>
                <dt>POC Model Path</dt>
                <dd>GIT Appearance -&gt; placeables.2da ModelName -&gt; model asset</dd>
              </div>
              <div>
                <dt>Appearance</dt>
                <dd>{resolvePlaceableAppearanceLabel(sourceObject, placeableRenderPayload)}</dd>
              </div>
              <div>
                <dt>2DA ModelName</dt>
                <dd>{resolvePlaceableModelNameLabel(placeableRenderPayload)}</dd>
              </div>
              <div>
                <dt>2DA Resolver</dt>
                <dd>{twoDaLookupLabel}</dd>
              </div>
              <div>
                <dt>Template Lookup</dt>
                <dd>{resolvePlaceableTemplateLookupLabel(placeableRenderPayload)}</dd>
              </div>
              <div>
                <dt>Dependencies</dt>
                <dd>{resolvePlaceableDependencyLookupLabel(placeableRenderPayload)}</dd>
              </div>
              <div>
                <dt>Model Asset</dt>
                <dd>{resolvePlaceableModelAssetLabel(renderState, placeableRenderPayload)}</dd>
              </div>
              <div>
                <dt>Model Contract</dt>
                <dd>
                  {renderState
                    ? `model=${renderState.hasModelContract ? "yes" : "no"}, texture=${
                        renderState.hasTextureContract ? "yes" : "no"
                      }, metadata=${renderState.hasMetadataContract ? "yes" : "no"}`
                    : "not loaded"}
                </dd>
              </div>
              <div>
                <dt>Render Path</dt>
                <dd>
                  {renderState?.modelUrl
                    ? `model url ready / ${renderState.modelStatus ?? "status unknown"}`
                    : handoffStatus.blocker}
                </dd>
              </div>
              <div>
                <dt>Cache Key</dt>
                <dd>{placeableRenderPayload?.cacheKey ?? "not loaded"}</dd>
              </div>
              <div>
                <dt>Blocker</dt>
                <dd>{pocModelBlocker}</dd>
              </div>
            </dl>
          </section>

          <section className="canvas-placeable-properties-shell">
            <SharedObjectPreviewPane
              className="canvas-placeable-properties-preview-pane"
              previewClassName="canvas-placeable-properties-preview"
              previewText={placeablePropertiesDialog.draft.resRef}
              actionClassName="canvas-placeable-properties-preview-action"
            />

            <div className="canvas-placeable-properties-pane">
              {placeablePropertiesDialog.activeTab === "basic" ? (
                <div className="canvas-placeable-properties-basic">
                  <div className="canvas-placeable-properties-basic-identity">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Name</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={placeablePropertiesDialog.draft.name}
                          onChange={(event) =>
                            updatePlaceablePropertiesDraftField("name", event.target.value)
                          }
                        />
                        <button type="button" disabled aria-label="Browse name">
                          ...
                        </button>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Tag</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={placeablePropertiesDialog.draft.tag}
                          onChange={(event) =>
                            updatePlaceablePropertiesDraftField("tag", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Appearance Type</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={placeablePropertiesDialog.draft.resRef}
                          onChange={(event) =>
                            updatePlaceablePropertiesDraftField("resRef", event.target.value)
                          }
                        />
                      </div>
                    </label>
                  </div>

                  <div className="canvas-placeable-properties-basic-details">
                    <div className="canvas-placeable-properties-basic-stats">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Hardness</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            step="1"
                            value={placeablePropertiesDialog.draft.hardness}
                            onChange={(event) =>
                              updatePlaceablePropertiesDraftField(
                                "hardness",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Hit Points</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            step="1"
                            value={placeablePropertiesDialog.draft.hitPoints}
                            onChange={(event) =>
                              updatePlaceablePropertiesDraftField(
                                "hitPoints",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Fortitude Save</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            step="1"
                            value={placeablePropertiesDialog.draft.fortitudeSave}
                            onChange={(event) =>
                              updatePlaceablePropertiesDraftField(
                                "fortitudeSave",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Reflex Save</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            step="1"
                            value={placeablePropertiesDialog.draft.reflexSave}
                            onChange={(event) =>
                              updatePlaceablePropertiesDraftField(
                                "reflexSave",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Will Save</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="number"
                            step="1"
                            value={placeablePropertiesDialog.draft.willSave}
                            onChange={(event) =>
                              updatePlaceablePropertiesDraftField(
                                "willSave",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                    </div>
                    <div className="canvas-placeable-properties-basic-flags">
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={placeablePropertiesDialog.draft.plot}
                          onChange={(event) =>
                            updatePlaceablePropertiesDraftField("plot", event.target.checked)
                          }
                        />
                        Plot
                        <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={placeablePropertiesDialog.draft.useable}
                          onChange={(event) =>
                            updatePlaceablePropertiesDraftField("useable", event.target.checked)
                          }
                        />
                        Useable
                        <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={placeablePropertiesDialog.draft.hasInventory}
                          onChange={(event) =>
                            updatePlaceablePropertiesDraftField(
                              "hasInventory",
                              event.target.checked
                            )
                          }
                        />
                        Has Inventory
                        <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={placeablePropertiesDialog.draft.isStatic}
                          onChange={(event) =>
                            updatePlaceablePropertiesDraftField("isStatic", event.target.checked)
                          }
                        />
                        Static
                        <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}

              {placeablePropertiesDialog.activeTab === "inventory" ? (
                <div className="canvas-placeable-properties-basic canvas-creature-properties-basic">
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>ItemList</legend>
                    <div className="canvas-creature-properties-section-actions">
                      <button type="button" onClick={addPlaceableInventoryItem}>
                        Add ItemList Entry
                      </button>
                    </div>
                    <table className="canvas-creature-properties-table">
                      <thead>
                        <tr>
                          <th scope="col">ResRef</th>
                          <th scope="col">Random ResRef</th>
                          <th scope="col">Random List</th>
                          <th scope="col">Linked UTI</th>
                          <th scope="col">Repo X</th>
                          <th scope="col">Repo Y</th>
                          <th scope="col">Flags</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {placeablePropertiesDialog.draft.inventoryItems.length > 0 ? (
                          placeablePropertiesDialog.draft.inventoryItems.map((entry, index) => (
                            <tr key={`placeable_inventory_${index + 1}_${entry.resRef ?? "item"}`}>
                              <td>
                                <input
                                  type="text"
                                  aria-label={`Placeable inventory item ${index + 1} resref`}
                                  value={entry.resRef ?? ""}
                                  onChange={(event) =>
                                    updatePlaceableInventoryItem(
                                      index,
                                      "resRef",
                                      event.target.value
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  aria-label={`Placeable inventory item ${index + 1} random resref`}
                                  value={entry.randomResRef ?? ""}
                                  onChange={(event) =>
                                    updatePlaceableInventoryItem(
                                      index,
                                      "randomResRef",
                                      event.target.value
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="text"
                                  aria-label={`Placeable inventory item ${index + 1} random list`}
                                  value={entry.randomList ?? ""}
                                  onChange={(event) =>
                                    updatePlaceableInventoryItem(
                                      index,
                                      "randomList",
                                      event.target.value
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <span className="canvas-creature-properties-cell-value">
                                  {formatLinkedItemText(entry)}
                                </span>
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="1"
                                  min={0}
                                  aria-label={`Placeable inventory item ${index + 1} repo x`}
                                  value={entry.x ?? 0}
                                  onChange={(event) =>
                                    updatePlaceableInventoryItem(
                                      index,
                                      "x",
                                      parseIntegerInput(event.target.value, 0)
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="1"
                                  min={0}
                                  aria-label={`Placeable inventory item ${index + 1} repo y`}
                                  value={entry.y ?? 0}
                                  onChange={(event) =>
                                    updatePlaceableInventoryItem(
                                      index,
                                      "y",
                                      parseIntegerInput(event.target.value, 0)
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <div className="canvas-creature-properties-item-flags">
                                  <label>
                                    <input
                                      type="checkbox"
                                      aria-label={`Placeable inventory item ${index + 1} dropable`}
                                      checked={Boolean(entry.dropable)}
                                      onChange={(event) =>
                                        updatePlaceableInventoryItem(
                                          index,
                                          "dropable",
                                          event.target.checked
                                        )
                                      }
                                    />
                                    Drop
                                  </label>
                                  <label>
                                    <input
                                      type="checkbox"
                                      aria-label={`Placeable inventory item ${index + 1} pickpocketable`}
                                      checked={Boolean(entry.pickpocketable)}
                                      onChange={(event) =>
                                        updatePlaceableInventoryItem(
                                          index,
                                          "pickpocketable",
                                          event.target.checked
                                        )
                                      }
                                    />
                                    Pick
                                  </label>
                                  <label>
                                    <input
                                      type="checkbox"
                                      aria-label={`Placeable inventory item ${index + 1} infinite`}
                                      checked={Boolean(entry.infinite)}
                                      onChange={(event) =>
                                        updatePlaceableInventoryItem(
                                          index,
                                          "infinite",
                                          event.target.checked
                                        )
                                      }
                                    />
                                    Infinite
                                  </label>
                                </div>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  onClick={() => removePlaceableInventoryItem(index)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8}>No inventory entries</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </fieldset>
                </div>
              ) : null}

              {placeablePropertiesDialog.activeTab === "lock" ? (
                <SharedLockPropertySection
                  value={placeablePropertiesDialog.draft.lockSettings}
                  onChange={updatePlaceableLockDraftField}
                  classNames={{
                    root: "canvas-placeable-properties-group",
                    toggle: "canvas-placeable-properties-toggle",
                    dualFields: "canvas-placeable-properties-dual-fields",
                    fieldRow: "canvas-placeable-properties-field-row",
                    fieldControl: "canvas-placeable-properties-field-control",
                    fieldControlNarrow: "is-narrow"
                  }}
                  behavior={{
                    disableLockDetailsWhenUnlocked: true,
                    disableAutoRemoveKeyUnlessLockedAndRelockable: true
                  }}
                />
              ) : null}

              {placeablePropertiesDialog.activeTab === "trap" ? (
                <SharedTrapPropertySection
                  value={placeablePropertiesDialog.draft.trapSettings}
                  onChange={updatePlaceableTrapDraftField}
                  trapTypeOptions={PLACEABLE_TRAP_TYPE_OPTIONS}
                  classNames={{
                    root: "canvas-placeable-properties-group",
                    nested: "canvas-placeable-properties-group canvas-placeable-properties-nested",
                    toggle: "canvas-placeable-properties-toggle",
                    toggleGrid: "canvas-placeable-properties-toggle-grid",
                    dualFields: "canvas-placeable-properties-dual-fields",
                    fieldRow: "canvas-placeable-properties-field-row",
                    fieldControl: "canvas-placeable-properties-field-control",
                    fieldControlNarrow: "is-narrow",
                    scriptRow: "canvas-placeable-properties-script-row"
                  }}
                  behavior={{
                    disableTrapDetailsWhenUntrapped: true
                  }}
                  scriptActionButtons={{
                    onDisarmScript: [{ label: "...", disabled: true }, { label: "Edit", disabled: true }],
                    onTrapTriggeredScript: [{ label: "...", disabled: true }, { label: "Edit", disabled: true }]
                  }}
                />
              ) : null}

              {placeablePropertiesDialog.activeTab === "scripts" ? (
                <SharedScriptSlotSection
                  className="canvas-placeable-properties-group canvas-placeable-properties-scripts"
                  rowClassName="canvas-placeable-properties-script-row"
                  rowLabelClassName="canvas-placeable-properties-script-input-label"
                  slots={PLACEABLE_SCRIPT_SLOT_KEYS}
                  labels={PLACEABLE_SCRIPT_SLOT_LABELS}
                  values={placeablePropertiesDialog.draft.scriptSlots}
                  onChange={updatePlaceableScriptSlotDraftField}
                  inputIdPrefix="placeable-script"
                  hiddenLabelSuffix={<span className="canvas-accessibility-hidden"> Script</span>}
                  showInlineActionButtons
                  inlineBrowseDisabled
                  inlineEditDisabled
                  showSaveLoadActions
                  saveLoadActionsClassName="canvas-placeable-properties-script-actions"
                  saveDisabled
                  loadDisabled
                  enablePayloadToggle={{
                    checked: placeablePropertiesDialog.draft.scriptSlotsEnabled,
                    onChange: (checked) =>
                      updatePlaceablePropertiesDraftField("scriptSlotsEnabled", checked),
                    className: "canvas-accessibility-hidden",
                    label: "Enable script slots payload"
                  }}
                />
              ) : null}

              {placeablePropertiesDialog.activeTab === "advanced" ? (
                <SharedAdvancedSettingsSection
                  sectionClassName="canvas-placeable-properties-group"
                  fieldRowClassName="canvas-placeable-properties-field-row"
                  fieldControlClassName="canvas-placeable-properties-field-control"
                  toggleClassName="canvas-placeable-properties-toggle"
                  portraitRowClassName="canvas-placeable-properties-portrait-row"
                  portraitPreviewClassName="canvas-placeable-properties-portrait-preview"
                  variablesRowClassName="canvas-placeable-properties-variables-row"
                  blueprintResRef={placeablePropertiesDialog.draft.advancedSettings.blueprintResRef}
                  onBlueprintResRefChange={(nextValue) =>
                    updatePlaceableAdvancedDraftField("blueprintResRef", nextValue)
                  }
                  belongsToFaction={placeablePropertiesDialog.draft.advancedSettings.belongsToFaction}
                  factionOptions={PLACEABLE_FACTION_OPTIONS}
                  onBelongsToFactionChange={(nextValue) =>
                    updatePlaceableAdvancedDraftField("belongsToFaction", nextValue)
                  }
                  conversation={placeablePropertiesDialog.draft.advancedSettings.conversation}
                  onConversationChange={(nextValue) =>
                    updatePlaceableAdvancedDraftField("conversation", nextValue)
                  }
                  showConversationActions
                  noInterrupt={placeablePropertiesDialog.draft.advancedSettings.noInterrupt}
                  onNoInterruptChange={(checked) =>
                    updatePlaceableAdvancedDraftField("noInterrupt", checked)
                  }
                  portraitResRef={placeablePropertiesDialog.draft.advancedSettings.portraitResRef}
                  onPortraitResRefChange={(nextValue) =>
                    updatePlaceableAdvancedDraftField("portraitResRef", nextValue)
                  }
                  showPortraitBrowseAction
                  initialState={placeablePropertiesDialog.draft.advancedSettings.initialState}
                  initialStateOptions={PLACEABLE_INITIAL_STATE_OPTIONS}
                  onInitialStateChange={(nextValue) =>
                    updatePlaceableAdvancedDraftField("initialState", nextValue)
                  }
                  treasureModel={placeablePropertiesDialog.draft.advancedSettings.treasureModel}
                  treasureModelOptions={PLACEABLE_TREASURE_MODEL_OPTIONS}
                  onTreasureModelChange={(nextValue) =>
                    updatePlaceableAdvancedDraftField("treasureModel", nextValue)
                  }
                >
                  <details className="canvas-placeable-properties-preserve-note">
                    <summary>Preserve-only payload flags</summary>
                    <label className="canvas-placeable-properties-toggle">
                      <input
                        type="checkbox"
                        checked={placeablePropertiesDialog.draft.disabledFlagsEnabled}
                        onChange={(event) =>
                          updatePlaceablePropertiesDraftField(
                            "disabledFlagsEnabled",
                            event.target.checked
                          )
                        }
                      />
                      Enable disabled flags payload
                    </label>
                    <div className="canvas-placeable-properties-toggle-grid">
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={placeablePropertiesDialog.draft.disabledFlags.plot}
                          disabled={!placeablePropertiesDialog.draft.disabledFlagsEnabled}
                          onChange={(event) =>
                            updatePlaceableDisabledFlagDraftField("plot", event.target.checked)
                          }
                        />
                        Plot Disabled
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={placeablePropertiesDialog.draft.disabledFlags.useable}
                          disabled={!placeablePropertiesDialog.draft.disabledFlagsEnabled}
                          onChange={(event) =>
                            updatePlaceableDisabledFlagDraftField("useable", event.target.checked)
                          }
                        />
                        Useable Disabled
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={placeablePropertiesDialog.draft.disabledFlags.hasInventory}
                          disabled={!placeablePropertiesDialog.draft.disabledFlagsEnabled}
                          onChange={(event) =>
                            updatePlaceableDisabledFlagDraftField(
                              "hasInventory",
                              event.target.checked
                            )
                          }
                        />
                        Inventory Disabled
                      </label>
                    </div>
                  </details>
                </SharedAdvancedSettingsSection>
              ) : null}

              {placeablePropertiesDialog.activeTab === "description" ? (
                <SharedLongTextPropertySection
                  sectionClassName="canvas-placeable-properties-group"
                  labelClassName="canvas-placeable-properties-fulltext"
                  label="Description"
                  value={placeablePropertiesDialog.draft.description}
                  onChange={(nextValue) =>
                    updatePlaceablePropertiesDraftField("description", nextValue)
                  }
                />
              ) : null}

              {placeablePropertiesDialog.activeTab === "comments" ? (
                <SharedLongTextPropertySection
                  sectionClassName="canvas-placeable-properties-group"
                  labelClassName="canvas-placeable-properties-fulltext"
                  label="Comments"
                  value={placeablePropertiesDialog.draft.comments}
                  onChange={(nextValue) =>
                    updatePlaceablePropertiesDraftField("comments", nextValue)
                  }
                />
              ) : null}
            </div>
          </section>

          <SharedDialogActionsFooter
            className="canvas-placeable-properties-actions"
            onApply={() => applyPlaceablePropertiesDraft(false)}
            onOk={() => applyPlaceablePropertiesDraft(true)}
            onCancel={() => cancelPlaceablePropertiesDialog()}
          />
      </>
    </SharedPropertyDialogChrome>
  );
}
