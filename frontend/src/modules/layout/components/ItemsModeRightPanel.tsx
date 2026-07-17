import { useEffect, useMemo, useState } from "react";
import type { SceneObject } from "../contracts";
import type {
  SceneObjectItemArmorParts,
  SceneObjectItemMaterialColors
} from "../../scene/contracts";
import type { ItemApiVisualOverride } from "../../items/contracts";
import { formatItemEquipSlotMask } from "../../items/application/itemEquipSlots";
import { resolveItemVisualSupportInfo } from "../../items/application/itemVisualSupport";
import {
  formatItemPropertyEntry,
  resolveItemArmorParts,
  resolveItemMaterialColorHex,
  resolveItemMaterialColors,
  resolveItemModelParts,
  summarizeItemAssembly
} from "../../items/application/itemPresentation";

type ItemModelPartDraftKey = "modelPart1" | "modelPart2" | "modelPart3";
type ItemArmorPartDraftKey = keyof SceneObjectItemArmorParts;
type ItemMaterialColorDraftKey = keyof SceneObjectItemMaterialColors;
type ItemWizardStep = "template" | "model" | "colors" | "place";

interface ItemCreatorDraft {
  modelPart1: string;
  modelPart2: string;
  modelPart3: string;
  armorContext: {
    modelPrefix: string;
    label: string;
    gender?: number;
    phenotype?: number;
    raceModel: string;
  };
  armorParts: Record<ItemArmorPartDraftKey, string>;
  materialColors: Record<ItemMaterialColorDraftKey, string>;
}

interface ItemsModeRightPanelProps {
  activePreviewObject: SceneObject | null;
  sourcePreviewObject: SceneObject | null;
  loadedItems: number;
  creatorStatus: "idle" | "applying";
  creatorErrorMessage: string | null;
  onApplyVisualOverride: (override: ItemApiVisualOverride) => Promise<void> | void;
  onResetVisualOverride: () => Promise<void> | void;
  onCreateConfiguredItem?: (override: ItemApiVisualOverride | undefined) => Promise<void> | void;
}

const ITEM_WIZARD_STEPS: ReadonlyArray<{
  id: ItemWizardStep;
  label: string;
}> = [
  { id: "template", label: "Template" },
  { id: "model", label: "Model" },
  { id: "colors", label: "Colors" },
  { id: "place", label: "Place" }
];

const ITEM_MODEL_PART_FIELDS: ReadonlyArray<{
  key: ItemModelPartDraftKey;
  label: string;
}> = [
  { key: "modelPart1", label: "Part 1" },
  { key: "modelPart2", label: "Part 2" },
  { key: "modelPart3", label: "Part 3" }
];

const ITEM_ARMOR_PART_FIELDS: ReadonlyArray<{
  key: ItemArmorPartDraftKey;
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
  key: ItemMaterialColorDraftKey;
  label: string;
}> = [
  { key: "leather1", label: "Leather 1" },
  { key: "leather2", label: "Leather 2" },
  { key: "cloth1", label: "Cloth 1" },
  { key: "cloth2", label: "Cloth 2" },
  { key: "metal1", label: "Metal 1" },
  { key: "metal2", label: "Metal 2" }
];

function formatValue(value: string | number | boolean | undefined): string {
  if (value === undefined || value === "") {
    return "-";
  }
  return String(value);
}

function formatNumberList(values: number[] | undefined): string {
  return values && values.length > 0 ? values.join(" / ") : "-";
}

function formatDraftNumber(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value)
    ? String(Math.max(0, Math.trunc(value)))
    : "";
}

function readModelPartValue(
  object: SceneObject | null,
  key: ItemModelPartDraftKey,
  index: number
): number | undefined {
  return object?.itemProperties?.[key] ?? object?.itemProperties?.modelParts?.[index];
}

function buildEmptyArmorDraft(): Record<ItemArmorPartDraftKey, string> {
  return ITEM_ARMOR_PART_FIELDS.reduce(
    (draft, field) => {
      draft[field.key] = "";
      return draft;
    },
    {} as Record<ItemArmorPartDraftKey, string>
  );
}

function buildEmptyMaterialColorDraft(): Record<ItemMaterialColorDraftKey, string> {
  return ITEM_MATERIAL_COLOR_FIELDS.reduce(
    (draft, field) => {
      draft[field.key] = "";
      return draft;
    },
    {} as Record<ItemMaterialColorDraftKey, string>
  );
}

function buildItemCreatorDraft(object: SceneObject | null): ItemCreatorDraft {
  const armorDraft = buildEmptyArmorDraft();
  ITEM_ARMOR_PART_FIELDS.forEach((field) => {
    armorDraft[field.key] = formatDraftNumber(object?.itemProperties?.armorParts?.[field.key]);
  });
  const materialColorDraft = buildEmptyMaterialColorDraft();
  ITEM_MATERIAL_COLOR_FIELDS.forEach((field) => {
    materialColorDraft[field.key] = formatDraftNumber(
      object?.itemProperties?.materialColors?.[field.key]
    );
  });
  return {
    modelPart1: formatDraftNumber(readModelPartValue(object, "modelPart1", 0)),
    modelPart2: formatDraftNumber(readModelPartValue(object, "modelPart2", 1)),
    modelPart3: formatDraftNumber(readModelPartValue(object, "modelPart3", 2)),
    armorContext: {
      modelPrefix: object?.itemProperties?.armorPreviewContext?.modelPrefix ?? "",
      label: object?.itemProperties?.armorPreviewContext?.label ?? "",
      gender: object?.itemProperties?.armorPreviewContext?.gender,
      phenotype: object?.itemProperties?.armorPreviewContext?.phenotype,
      raceModel: object?.itemProperties?.armorPreviewContext?.raceModel ?? ""
    },
    armorParts: armorDraft,
    materialColors: materialColorDraft
  };
}

function cloneItemCreatorDraft(draft: ItemCreatorDraft): ItemCreatorDraft {
  return {
    modelPart1: draft.modelPart1,
    modelPart2: draft.modelPart2,
    modelPart3: draft.modelPart3,
    armorContext: { ...draft.armorContext },
    armorParts: { ...draft.armorParts },
    materialColors: { ...draft.materialColors }
  };
}

function sanitizePartInput(value: string): string {
  return value.replace(/\D/gu, "").slice(0, 3);
}

function sanitizeArmorPrefixInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/gu, "")
    .slice(0, 5);
}

function parsePartInput(value: string): number | undefined {
  const normalized = value.trim();
  if (!/^\d{1,3}$/u.test(normalized)) {
    return undefined;
  }
  return Math.max(0, Math.min(999, Number.parseInt(normalized, 10)));
}

function parseColorInput(value: string): number | undefined {
  const normalized = value.trim();
  if (!/^\d{1,3}$/u.test(normalized)) {
    return undefined;
  }
  return Math.max(0, Math.min(255, Number.parseInt(normalized, 10)));
}

function parseArmorPrefixInput(value: string): string | undefined {
  const normalized = value.trim().toLowerCase();
  return /^p[fm][a-z][0-9]_$/u.test(normalized) ? normalized : undefined;
}

function hasOwnKeys(value: object): boolean {
  return Object.keys(value).length > 0;
}

function buildItemVisualOverride(draft: ItemCreatorDraft): ItemApiVisualOverride | undefined {
  const override: ItemApiVisualOverride = {};
  ITEM_MODEL_PART_FIELDS.forEach((field) => {
    const parsed = parsePartInput(draft[field.key]);
    if (parsed !== undefined) {
      override[field.key] = parsed;
    }
  });
  const modelPrefix = parseArmorPrefixInput(draft.armorContext.modelPrefix);
  if (modelPrefix) {
    override.armorContext = {
      modelPrefix,
      ...(draft.armorContext.label.trim()
        ? { label: draft.armorContext.label.trim().slice(0, 64) }
        : {}),
      ...(draft.armorContext.gender !== undefined ? { gender: draft.armorContext.gender } : {}),
      ...(draft.armorContext.phenotype !== undefined
        ? { phenotype: draft.armorContext.phenotype }
        : {}),
      ...(draft.armorContext.raceModel.trim()
        ? { raceModel: draft.armorContext.raceModel.trim().toLowerCase().slice(0, 32) }
        : {})
    };
  }

  const armorParts: NonNullable<ItemApiVisualOverride["armorParts"]> = {};
  ITEM_ARMOR_PART_FIELDS.forEach((field) => {
    const parsed = parsePartInput(draft.armorParts[field.key]);
    if (parsed !== undefined) {
      armorParts[field.key] = parsed;
    }
  });
  if (hasOwnKeys(armorParts)) {
    override.armorParts = armorParts;
  }

  const materialColors: NonNullable<ItemApiVisualOverride["materialColors"]> = {};
  ITEM_MATERIAL_COLOR_FIELDS.forEach((field) => {
    const parsed = parseColorInput(draft.materialColors[field.key]);
    if (parsed !== undefined) {
      materialColors[field.key] = parsed;
    }
  });
  if (hasOwnKeys(materialColors)) {
    override.materialColors = materialColors;
  }

  return hasOwnKeys(override) ? override : undefined;
}

function areStringRecordsEqual(
  left: Record<string, string>,
  right: Record<string, string>
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if ((left[key] ?? "") !== (right[key] ?? "")) {
      return false;
    }
  }
  return true;
}

function areItemCreatorDraftsEqual(left: ItemCreatorDraft, right: ItemCreatorDraft): boolean {
  return (
    left.modelPart1 === right.modelPart1 &&
    left.modelPart2 === right.modelPart2 &&
    left.modelPart3 === right.modelPart3 &&
    left.armorContext.modelPrefix === right.armorContext.modelPrefix &&
    left.armorContext.label === right.armorContext.label &&
    left.armorContext.gender === right.armorContext.gender &&
    left.armorContext.phenotype === right.armorContext.phenotype &&
    left.armorContext.raceModel === right.armorContext.raceModel &&
    areStringRecordsEqual(left.armorParts, right.armorParts) &&
    areStringRecordsEqual(left.materialColors, right.materialColors)
  );
}

export function ItemsModeRightPanel({
  activePreviewObject,
  sourcePreviewObject,
  loadedItems,
  creatorStatus,
  creatorErrorMessage,
  onApplyVisualOverride,
  onResetVisualOverride,
  onCreateConfiguredItem
}: ItemsModeRightPanelProps) {
  const properties = activePreviewObject?.itemProperties;
  const itemParts = activePreviewObject ? resolveItemModelParts(activePreviewObject) : [];
  const armorParts = activePreviewObject ? resolveItemArmorParts(activePreviewObject) : [];
  const materialColors = activePreviewObject ? resolveItemMaterialColors(activePreviewObject) : [];
  const visualSupportInfo = activePreviewObject
    ? resolveItemVisualSupportInfo(activePreviewObject)
    : null;
  const propertyList = properties?.propertyList ?? [];
  const scriptCount = properties?.scripts ? Object.keys(properties.scripts).length : 0;
  const robeHiddenSlots = properties?.armorRobeHiddenSlots ?? [];
  const sourceDraftObject = sourcePreviewObject ?? activePreviewObject;
  const sourceDraft = useMemo(
    () => buildItemCreatorDraft(sourceDraftObject),
    [sourceDraftObject?.id]
  );
  const [creatorDraft, setCreatorDraft] = useState<ItemCreatorDraft>(() =>
    cloneItemCreatorDraft(sourceDraft)
  );
  const [wizardStep, setWizardStep] = useState<ItemWizardStep>("template");
  const canUseCreator = Boolean(activePreviewObject);
  const isApplyingCreator = creatorStatus === "applying";
  const activeWizardStepIndex = Math.max(
    0,
    ITEM_WIZARD_STEPS.findIndex((step) => step.id === wizardStep)
  );
  const canPlaceConfiguredItem = Boolean(activePreviewObject && onCreateConfiguredItem);

  useEffect(() => {
    setCreatorDraft(cloneItemCreatorDraft(sourceDraft));
    setWizardStep("template");
  }, [sourceDraft]);

  const handleModelPartChange = (key: ItemModelPartDraftKey, value: string) => {
    const sanitized = sanitizePartInput(value);
    setCreatorDraft((current) => ({
      ...current,
      [key]: sanitized
    }));
  };

  const handleArmorPartChange = (key: ItemArmorPartDraftKey, value: string) => {
    const sanitized = sanitizePartInput(value);
    setCreatorDraft((current) => ({
      ...current,
      armorParts: {
        ...current.armorParts,
        [key]: sanitized
      }
    }));
  };

  const handleArmorPrefixChange = (value: string) => {
    const sanitized = sanitizeArmorPrefixInput(value);
    setCreatorDraft((current) => ({
      ...current,
      armorContext: {
        ...current.armorContext,
        modelPrefix: sanitized
      }
    }));
  };

  const handleMaterialColorChange = (key: ItemMaterialColorDraftKey, value: string) => {
    const sanitized = sanitizePartInput(value);
    setCreatorDraft((current) => ({
      ...current,
      materialColors: {
        ...current.materialColors,
        [key]: sanitized
      }
    }));
  };

  const resolveCreatorColorHex = (key: ItemMaterialColorDraftKey, value: string) =>
    resolveItemMaterialColorHex(key, parseColorInput(value) ?? 0);

  const handleApplyCreator = () => {
    const override = buildItemVisualOverride(creatorDraft);
    if (!override) {
      return;
    }
    void onApplyVisualOverride(override);
  };

  const handleResetCreator = () => {
    setCreatorDraft(cloneItemCreatorDraft(sourceDraft));
    void onResetVisualOverride();
  };

  const handleCreateConfiguredItem = () => {
    if (!onCreateConfiguredItem) {
      return;
    }
    void onCreateConfiguredItem(
      areItemCreatorDraftsEqual(creatorDraft, sourceDraft)
        ? undefined
        : buildItemVisualOverride(creatorDraft)
    );
  };

  const goToPreviousWizardStep = () => {
    const previousStep = ITEM_WIZARD_STEPS[Math.max(0, activeWizardStepIndex - 1)];
    setWizardStep(previousStep?.id ?? wizardStep);
  };

  const goToNextWizardStep = () => {
    const nextStep =
      ITEM_WIZARD_STEPS[Math.min(ITEM_WIZARD_STEPS.length - 1, activeWizardStepIndex + 1)];
    setWizardStep(nextStep?.id ?? wizardStep);
  };

  return (
    <article
      className="sidebar-section workspace-sidebar-minimal items-mode-right-panel"
      aria-label="items inspector"
    >
      <header className="scene-objects-header">
        <h2>Item Inspector</h2>
        <span className="scene-objects-total" title="Loaded items">
          {loadedItems}
        </span>
      </header>

      {activePreviewObject ? (
        <div className="items-inspector-content">
          <div className="items-inspector-titleblock">
            <strong title={activePreviewObject.name ?? activePreviewObject.tag}>
              {activePreviewObject.name ?? activePreviewObject.tag}
            </strong>
            <span>{summarizeItemAssembly(activePreviewObject)}</span>
          </div>

          {visualSupportInfo ? (
            <p
              className={`items-visual-support-notice is-${visualSupportInfo.tone}`}
              role={visualSupportInfo.tone === "warning" ? "alert" : "status"}
            >
              <strong>{visualSupportInfo.label}</strong>
              <span>{visualSupportInfo.detail}</span>
            </p>
          ) : null}

          <section
            className="items-inspector-section items-creator-section"
            aria-label="item preview editor"
          >
            <header>
              <h3>Preview Editor</h3>
              <span>{isApplyingCreator ? "applying" : `${activeWizardStepIndex + 1}/4`}</span>
            </header>
            <div className="items-wizard-tabs" role="tablist" aria-label="item preview editor steps">
              {ITEM_WIZARD_STEPS.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  aria-selected={wizardStep === step.id}
                  className={`items-wizard-tab${wizardStep === step.id ? " is-active" : ""}`}
                  disabled={!canUseCreator || isApplyingCreator}
                  onClick={() => setWizardStep(step.id)}
                >
                  {step.label}
                </button>
              ))}
            </div>

            {wizardStep === "template" ? (
              <div className="items-wizard-page">
                <dl className="items-wizard-summary">
                  <div>
                    <dt>Template</dt>
                    <dd>{activePreviewObject.id}</dd>
                  </div>
                  <div>
                    <dt>ResRef</dt>
                    <dd>{activePreviewObject.resRef}</dd>
                  </div>
                  <div>
                    <dt>Base</dt>
                    <dd>{formatValue(properties?.baseItemLabel ?? properties?.baseItem)}</dd>
                  </div>
                  <div>
                    <dt>Assembly</dt>
                    <dd>{summarizeItemAssembly(activePreviewObject)}</dd>
                  </div>
                </dl>
              </div>
            ) : null}

            {wizardStep === "model" ? (
              <div className="items-wizard-page">
                <label className="items-creator-field items-creator-prefix-field">
                  <span>Armor Prefix</span>
                  <input
                    type="text"
                    inputMode="text"
                    maxLength={5}
                    value={creatorDraft.armorContext.modelPrefix}
                    placeholder="pmh0_"
                    disabled={!canUseCreator || isApplyingCreator}
                    onChange={(event) => handleArmorPrefixChange(event.target.value)}
                  />
                </label>
                <div className="items-creator-model-grid" aria-label="item model part editor">
                  {ITEM_MODEL_PART_FIELDS.map((field) => (
                    <label key={field.key} className="items-creator-field">
                      <span>{field.label}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={999}
                        value={creatorDraft[field.key]}
                        disabled={!canUseCreator || isApplyingCreator}
                        onChange={(event) => handleModelPartChange(field.key, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
                <div className="items-creator-armor-grid" aria-label="item armor body-part editor">
                  {ITEM_ARMOR_PART_FIELDS.map((field) => (
                    <label
                      key={field.key}
                      className="items-creator-field items-creator-armor-field"
                    >
                      <span>{field.label}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={999}
                        value={creatorDraft.armorParts[field.key]}
                        disabled={!canUseCreator || isApplyingCreator}
                        onChange={(event) => handleArmorPartChange(field.key, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {wizardStep === "colors" ? (
              <div className="items-wizard-page">
                <div className="items-creator-color-grid" aria-label="item material color editor">
                  {ITEM_MATERIAL_COLOR_FIELDS.map((field) => (
                    <label
                      key={field.key}
                      className="items-creator-field items-creator-color-field"
                    >
                      <span>{field.label}</span>
                      <div className="items-creator-color-input-row">
                        <i
                          aria-hidden="true"
                          style={{
                            backgroundColor: resolveCreatorColorHex(
                              field.key,
                              creatorDraft.materialColors[field.key]
                            )
                          }}
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={255}
                          value={creatorDraft.materialColors[field.key]}
                          disabled={!canUseCreator || isApplyingCreator}
                          onChange={(event) =>
                            handleMaterialColorChange(field.key, event.target.value)
                          }
                        />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            {wizardStep === "place" ? (
              <div className="items-wizard-page">
                <dl className="items-wizard-summary">
                  <div>
                    <dt>Model</dt>
                    <dd>
                      {[creatorDraft.modelPart1, creatorDraft.modelPart2, creatorDraft.modelPart3]
                        .filter((value) => value.trim().length > 0)
                        .join(" / ") || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>Armor Prefix</dt>
                    <dd>{creatorDraft.armorContext.modelPrefix || "-"}</dd>
                  </div>
                  <div>
                    <dt>Armor</dt>
                    <dd>
                      {
                        Object.values(creatorDraft.armorParts).filter(
                          (value) => value.trim().length > 0
                        ).length
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Colors</dt>
                    <dd>
                      {
                        Object.values(creatorDraft.materialColors).filter(
                          (value) => value.trim().length > 0
                        ).length
                      }
                    </dd>
                  </div>
                </dl>
              </div>
            ) : null}

            <div className="items-wizard-nav">
              <button
                type="button"
                className="items-creator-action"
                disabled={!canUseCreator || isApplyingCreator || activeWizardStepIndex === 0}
                onClick={goToPreviousWizardStep}
              >
                Back
              </button>
              <button
                type="button"
                className="items-creator-action"
                disabled={
                  !canUseCreator ||
                  isApplyingCreator ||
                  activeWizardStepIndex >= ITEM_WIZARD_STEPS.length - 1
                }
                onClick={goToNextWizardStep}
              >
                Next
              </button>
            </div>
            <div className="items-creator-actions">
              <button
                type="button"
                className="items-creator-action"
                disabled={!canUseCreator || isApplyingCreator}
                onClick={handleApplyCreator}
              >
                {isApplyingCreator ? "Applying..." : "Apply Preview"}
              </button>
              <button
                type="button"
                className="items-creator-action"
                disabled={!canUseCreator || isApplyingCreator}
                onClick={handleResetCreator}
              >
                Reset Source
              </button>
              <button
                type="button"
                className="items-creator-action items-creator-primary-action"
                disabled={!canPlaceConfiguredItem || isApplyingCreator}
                onClick={handleCreateConfiguredItem}
              >
                Place in Area
              </button>
            </div>
            {creatorErrorMessage ? (
              <p className="items-creator-error" role="alert">
                {creatorErrorMessage}
              </p>
            ) : null}
          </section>

          <dl className="workspace-mode-inspector-list items-inspector-list">
            <div>
              <dt>Template</dt>
              <dd>{activePreviewObject.id}</dd>
            </div>
            <div>
              <dt>ResRef</dt>
              <dd>{activePreviewObject.resRef}</dd>
            </div>
            <div>
              <dt>Base Item</dt>
              <dd>{formatValue(properties?.baseItemLabel ?? properties?.baseItem)}</dd>
            </div>
            <div>
              <dt>Model Type</dt>
              <dd>{formatValue(properties?.baseItemModelType)}</dd>
            </div>
            <div>
              <dt>Default Model</dt>
              <dd>{formatValue(properties?.baseItemDefaultModel)}</dd>
            </div>
            <div>
              <dt>Default Icon</dt>
              <dd>{formatValue(properties?.baseItemDefaultIcon)}</dd>
            </div>
            <div>
              <dt>Armor Prefix</dt>
              <dd>{formatValue(properties?.armorPreviewContext?.modelPrefix)}</dd>
            </div>
            <div>
              <dt>Inventory Size</dt>
              <dd>
                {formatValue(properties?.baseItemInvSlotWidth)} x{" "}
                {formatValue(properties?.baseItemInvSlotHeight)}
              </dd>
            </div>
            <div>
              <dt>Equip Slots</dt>
              <dd>
                {formatValue(
                  formatItemEquipSlotMask(properties?.baseItemEquipableSlots) ??
                    properties?.baseItemEquipableSlots
                )}
              </dd>
            </div>
            <div>
              <dt>Store Panel</dt>
              <dd>
                {formatValue(properties?.baseItemStorePanel)} /{" "}
                {formatValue(properties?.baseItemStorePanelSort)}
              </dd>
            </div>
            <div>
              <dt>Property Slots</dt>
              <dd>
                {formatValue(properties?.baseItemMinProps)} -{" "}
                {formatValue(properties?.baseItemMaxProps)}
              </dd>
            </div>
            <div>
              <dt>Cost</dt>
              <dd>{formatValue(properties?.cost)}</dd>
            </div>
            <div>
              <dt>Stack / Charges</dt>
              <dd>
                {formatValue(properties?.stackSize)} / {formatValue(properties?.charges)}
              </dd>
            </div>
            <div>
              <dt>Palette</dt>
              <dd>{formatValue(properties?.paletteId)}</dd>
            </div>
            <div>
              <dt>Flags</dt>
              <dd>
                {[
                  properties?.plot ? "Plot" : "",
                  properties?.cursed ? "Cursed" : "",
                  properties?.identified ? "Identified" : "",
                  properties?.stolen ? "Stolen" : ""
                ]
                  .filter((value) => value.length > 0)
                  .join(", ") || "-"}
              </dd>
            </div>
          </dl>

          <section className="items-inspector-section" aria-label="item model assembly">
            <header>
              <h3>Model Assembly</h3>
              <span>{formatNumberList(properties?.modelParts)}</span>
            </header>
            {itemParts.length > 0 ? (
              <div className="items-inspector-part-grid">
                {itemParts.map((part) => (
                  <div key={part.slot} className="items-inspector-part">
                    <span>{part.label}</span>
                    <strong>{part.value}</strong>
                    <small>{part.resRef ?? "-"}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p className="scene-objects-empty">No model part metadata.</p>
            )}
          </section>

          {properties?.cloakModelResRef ? (
            <section className="items-inspector-section" aria-label="item cloak model">
              <header>
                <h3>Cloak</h3>
                <span>{properties.cloakModelResRef}</span>
              </header>
              <dl className="workspace-mode-inspector-list items-inspector-list">
                <div>
                  <dt>Row / Model</dt>
                  <dd>
                    {formatValue(properties.cloakModelRow)} /{" "}
                    {formatValue(properties.cloakModel)}
                  </dd>
                </div>
                <div>
                  <dt>Texture / Icon</dt>
                  <dd>
                    {formatValue(properties.cloakTextureResRef)} /{" "}
                    {formatValue(properties.cloakIconResRef)}
                  </dd>
                </div>
                <div>
                  <dt>Hide Flags</dt>
                  <dd>{properties.cloakHiddenSlots?.join(", ") || "-"}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <section className="items-inspector-section" aria-label="item material colors">
            <header>
              <h3>Material Colors</h3>
              <span>{materialColors.length}</span>
            </header>
            {materialColors.length > 0 ? (
              <div className="items-inspector-color-grid">
                {materialColors.map((color) => (
                  <span key={color.slot} className="items-inspector-color">
                    <i style={{ backgroundColor: color.colorHex }} />
                    <span>{color.label}</span>
                    <b>{color.value}</b>
                  </span>
                ))}
              </div>
            ) : (
              <p className="scene-objects-empty">No material color overrides.</p>
            )}
          </section>

          <section className="items-inspector-section" aria-label="item armor parts">
            <header>
              <h3>Armor Parts</h3>
              <span>{robeHiddenSlots.length > 0 ? `${armorParts.length} / ${robeHiddenSlots.length} hidden` : armorParts.length}</span>
            </header>
            {armorParts.length > 0 ? (
              <>
                <div className="items-inspector-armor-grid">
                  {armorParts.map((part) => (
                    <span key={part.slot} className="items-inspector-armor-part">
                      <span>{part.label}</span>
                      <b>{part.value}</b>
                    </span>
                  ))}
                </div>
                {robeHiddenSlots.length > 0 ? (
                  <p className="items-inspector-muted-line">
                    Robe mask hides {robeHiddenSlots.join(", ")}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="scene-objects-empty">No armor body-part metadata.</p>
            )}
          </section>

          <section className="items-inspector-section" aria-label="item properties">
            <header>
              <h3>Properties</h3>
              <span>{propertyList.length}</span>
            </header>
            {propertyList.length > 0 ? (
              <ol className="items-inspector-property-list">
                {propertyList.slice(0, 8).map((entry, index) => (
                  <li key={`${index}:${formatItemPropertyEntry(entry)}`}>
                    {formatItemPropertyEntry(entry) || "Property entry"}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="scene-objects-empty">No item property entries.</p>
            )}
          </section>

          <dl className="workspace-mode-inspector-list items-inspector-list">
            <div>
              <dt>Armor Parts</dt>
              <dd>{armorParts.length}</dd>
            </div>
            <div>
              <dt>Scripts</dt>
              <dd>{scriptCount}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <p className="scene-objects-empty">No item selected.</p>
      )}
    </article>
  );
}
