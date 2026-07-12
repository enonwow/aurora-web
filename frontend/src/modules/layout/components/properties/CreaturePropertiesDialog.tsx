import { Fragment, useState, type PointerEventHandler, type Ref } from "react";
import {
  SharedDialogActionsFooter,
  SharedLongTextPropertySection,
  SharedObjectPreviewPane,
  SharedPropertyDialogChrome,
  SharedPropertyTabsNav,
  SharedScriptSlotSection
} from "./SharedPropertyDialogSections";
import {
  resolveAbilityScoreModifier,
  CREATURE_ALIGNMENT_OPTIONS,
  CREATURE_APPEARANCE_CORE_FIELDS,
  CREATURE_APPEARANCE_EXTRA_PAIR,
  CREATURE_APPEARANCE_LIMB_PAIRS,
  CREATURE_FACTION_OPTIONS,
  CREATURE_FEAT_FILTER_OPTIONS,
  CREATURE_GENDER_OPTIONS,
  CREATURE_METAMAGIC_FILTER_OPTIONS,
  CREATURE_MOVEMENT_RATE_OPTIONS,
  CREATURE_PERCEPTION_RANGE_OPTIONS,
  CREATURE_PROPERTIES_TAB_OPTIONS,
  CREATURE_RACE_OPTIONS,
  CREATURE_SCRIPT_SLOT_KEYS,
  CREATURE_SCRIPT_SLOT_LABELS,
  CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS,
  CREATURE_SPELL_LEVEL_FILTER_OPTIONS,
  CREATURE_TREASURE_MODEL_OPTIONS,
  type CreaturePropertiesDialogState,
  type CreaturePropertiesDraft,
  type CreaturePropertiesTab,
  type CreatureScriptSlotKey
} from "../../application/workspaceObjectPropertyDrafts";
import {
  AURORA_ITEM_EQUIPMENT_SLOT_OPTIONS,
  formatItemEquipSlotMask,
  formatItemEquipmentSlotMask,
  parseItemEquipSlotMask
} from "../../../items/application/itemEquipSlots";
import type { CreatureApiResourceOption } from "../../../creatures/contracts";

type CreatureInventoryItemDraft = CreaturePropertiesDraft["inventoryItems"][number];
type CreatureEquippedItemDraft = CreaturePropertiesDraft["equippedItems"][number];
type CreatureInventoryItemUpdateValue =
  CreatureInventoryItemDraft[keyof CreatureInventoryItemDraft];
type CreatureEquippedItemUpdateValue = CreatureEquippedItemDraft[keyof CreatureEquippedItemDraft];
type CreatureVariableDraft = CreaturePropertiesDraft["variables"][number];
type EmbeddedItemDraft = NonNullable<CreatureInventoryItemDraft["embeddedItem"]>;
type EmbeddedItemPropertyDraft = NonNullable<EmbeddedItemDraft["itemPropertyListEntries"]>[number];
type CreatureResourceOptions = Partial<
  Record<"conversation" | "portrait" | "script" | "soundset", CreatureApiResourceOption[]>
>;

interface CreaturePropertiesDialogProps {
  creaturePropertiesDialog: CreaturePropertiesDialogState;
  creaturePropertiesDialogRef?: Ref<HTMLElement>;
  toggleCreaturePropertiesDialogCollapsed: () => void;
  cancelCreaturePropertiesDialog: () => void;
  setCreaturePropertiesActiveTab: (nextTab: CreaturePropertiesTab) => void;
  updateCreaturePropertiesDraftField: (
    field: keyof CreaturePropertiesDraft,
    value: string | number | boolean
  ) => void;
  updateCreatureClassEntry: (
    index: number,
    field: "classId" | "className" | "level",
    value: string | number
  ) => void;
  updateCreatureSkillRank: (index: number, rank: number) => void;
  updateCreatureScriptSlot: (field: CreatureScriptSlotKey, value: string) => void;
  updateCreatureAppearancePart: (
    field: keyof CreaturePropertiesDraft["appearanceParts"],
    value: string
  ) => void;
  updateCreatureAdvancedField: (
    field: keyof CreaturePropertiesDraft["advancedSettings"],
    value: string | number | boolean
  ) => void;
  addCreatureVariable: () => void;
  updateCreatureVariable: (index: number, entry: CreatureVariableDraft) => void;
  removeCreatureVariable: (index: number) => void;
  addCreatureInventoryItem: () => void;
  updateCreatureInventoryItem: (
    index: number,
    field: keyof CreaturePropertiesDraft["inventoryItems"][number],
    value: CreatureInventoryItemUpdateValue
  ) => void;
  removeCreatureInventoryItem: (index: number) => void;
  addCreatureEquippedItem: () => void;
  updateCreatureEquippedItem: (
    index: number,
    field: keyof CreaturePropertiesDraft["equippedItems"][number],
    value: CreatureEquippedItemUpdateValue
  ) => void;
  removeCreatureEquippedItem: (index: number) => void;
  creatureResourceOptions?: CreatureResourceOptions;
  applyCreaturePropertiesDraft: (closeAfterApply: boolean) => void;
  creatureFeatsFilter: string;
  setCreatureFeatsFilter: (nextFilter: string) => void;
  creatureSpellsLevelFilter: string;
  setCreatureSpellsLevelFilter: (nextFilter: string) => void;
  creatureSpellsMetaMagicFilter: string;
  setCreatureSpellsMetaMagicFilter: (nextFilter: string) => void;
  creatureSpellsClassFilterIndex: number;
  setCreatureSpellsClassFilterIndex: (nextIndex: number) => void;
  creatureSpecialAbilitiesFilter: string;
  setCreatureSpecialAbilitiesFilter: (nextFilter: string) => void;
  startCreaturePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  moveCreaturePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  endCreaturePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  cancelCreaturePropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
}

function formatOptionalNumber(value: number | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "-";
}

function formatOptionalText(value: string | undefined): string {
  return value && value.trim().length > 0 ? value : "-";
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

function formatEquipmentSlotCompatibility(entry: {
  slotMask?: number;
  itemBaseItem?: number;
  itemBaseItemEquipableSlots?: string;
}): { message: string; status: "ok" | "warning" | "info" } | undefined {
  const allowed = parseItemEquipSlotMask(entry.itemBaseItemEquipableSlots);
  if (!allowed) {
    return undefined;
  }

  const allowedText = formatItemEquipSlotMask(entry.itemBaseItemEquipableSlots) ?? allowed.raw;
  const baseText =
    typeof entry.itemBaseItem === "number" ? `Base ${entry.itemBaseItem}` : "Linked item";
  if (typeof entry.slotMask !== "number" || !Number.isFinite(entry.slotMask) || entry.slotMask <= 0) {
    return {
      status: "info",
      message: `${baseText} allowed slots: ${allowedText}`
    };
  }

  const slotMask = Math.trunc(entry.slotMask);
  const slotText = formatItemEquipmentSlotMask(slotMask) ?? `0x${slotMask.toString(16).toUpperCase()}`;
  if ((allowed.value & slotMask) === 0) {
    return {
      status: "warning",
      message: `Slot mismatch: ${slotText} is not in ${allowedText}`
    };
  }

  return {
    status: "ok",
    message: `Slot OK: ${slotText} matches ${allowedText}`
  };
}

function parseOptionalIntegerInput(value: string): number | undefined {
  if (value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseIntegerInput(value: string, fallback: number): number {
  return parseOptionalIntegerInput(value) ?? fallback;
}

function normalizeOptionalTextInput(value: string): string | undefined {
  return value.length > 0 ? value : undefined;
}

function cloneEmbeddedItemProperty(
  entry: EmbeddedItemPropertyDraft
): EmbeddedItemPropertyDraft {
  return { ...entry };
}

function cloneEmbeddedItemProperties(
  entries: EmbeddedItemDraft["itemPropertyListEntries"]
): EmbeddedItemPropertyDraft[] {
  return entries ? entries.map(cloneEmbeddedItemProperty) : [];
}

const EMBEDDED_ITEM_PROPERTY_FIELDS = [
  { key: "propertyName", label: "Property" },
  { key: "subtype", label: "Subtype" },
  { key: "costTable", label: "Cost Table" },
  { key: "costValue", label: "Cost Value" },
  { key: "param1", label: "Param 1" },
  { key: "param1Value", label: "Param 1 Value" },
  { key: "chanceAppear", label: "Chance" }
] satisfies Array<{ key: keyof EmbeddedItemPropertyDraft; label: string }>;

function createEmptyEmbeddedItemProperty(): EmbeddedItemPropertyDraft {
  return {};
}

function EmbeddedItemEditor({
  itemIndex,
  contextLabel,
  embeddedItem,
  onChange
}: {
  itemIndex: number;
  contextLabel: "Inventory item" | "Equipped item";
  embeddedItem: EmbeddedItemDraft | undefined;
  onChange: (nextEmbeddedItem: EmbeddedItemDraft) => void;
}) {
  if (!embeddedItem) {
    return null;
  }

  const propertyEntries = embeddedItem.itemPropertyListEntries ?? [];
  const ariaPrefix = `${contextLabel} ${itemIndex + 1} embedded`;
  const updateEmbeddedItem = (patch: Partial<EmbeddedItemDraft>) => {
    onChange({
      ...embeddedItem,
      itemPropertyListEntries: cloneEmbeddedItemProperties(embeddedItem.itemPropertyListEntries),
      ...patch
    });
  };
  const updatePropertyEntries = (nextEntries: EmbeddedItemPropertyDraft[]) => {
    updateEmbeddedItem({
      itemPropertyListEntries: nextEntries,
      itemPropertyListCount: nextEntries.length
    });
  };
  const updatePropertyEntry = (
    propertyIndex: number,
    field: keyof EmbeddedItemPropertyDraft,
    value: number | undefined
  ) => {
    updatePropertyEntries(
      propertyEntries.map((entry, entryIndex) =>
        entryIndex === propertyIndex ? { ...entry, [field]: value } : { ...entry }
      )
    );
  };

  return (
    <fieldset className="canvas-creature-properties-embedded-item">
      <legend>{contextLabel} {itemIndex + 1} Embedded Item</legend>
      <div className="canvas-creature-properties-embedded-grid">
        <label>
          <span>TemplateResRef</span>
          <input
            type="text"
            aria-label={`${ariaPrefix} template resref`}
            value={embeddedItem.templateResRef ?? ""}
            onChange={(event) =>
              updateEmbeddedItem({
                templateResRef: normalizeOptionalTextInput(event.target.value)
              })
            }
          />
        </label>
        <label>
          <span>Tag</span>
          <input
            type="text"
            aria-label={`${ariaPrefix} tag`}
            value={embeddedItem.tag ?? ""}
            onChange={(event) =>
              updateEmbeddedItem({
                tag: normalizeOptionalTextInput(event.target.value)
              })
            }
          />
        </label>
        <label>
          <span>Name</span>
          <input
            type="text"
            aria-label={`${ariaPrefix} localized name`}
            value={embeddedItem.localizedName ?? ""}
            onChange={(event) =>
              updateEmbeddedItem({
                localizedName: normalizeOptionalTextInput(event.target.value)
              })
            }
          />
        </label>
        <label>
          <span>Name StrRef</span>
          <input
            type="number"
            step="1"
            min={0}
            aria-label={`${ariaPrefix} localized name strref`}
            value={embeddedItem.localizedNameStrRef ?? ""}
            onChange={(event) =>
              updateEmbeddedItem({
                localizedNameStrRef: parseOptionalIntegerInput(event.target.value)
              })
            }
          />
        </label>
        <label>
          <span>Base Item</span>
          <input
            type="number"
            step="1"
            min={0}
            aria-label={`${ariaPrefix} base item`}
            value={embeddedItem.baseItem ?? ""}
            onChange={(event) =>
              updateEmbeddedItem({
                baseItem: parseOptionalIntegerInput(event.target.value)
              })
            }
          />
        </label>
        <label>
          <span>Struct Type</span>
          <input
            type="number"
            step="1"
            min={0}
            aria-label={`${ariaPrefix} struct type`}
            value={embeddedItem.sourceStructTypeId ?? ""}
            onChange={(event) =>
              updateEmbeddedItem({
                sourceStructTypeId: parseOptionalIntegerInput(event.target.value)
              })
            }
          />
        </label>
        <div className="canvas-creature-properties-embedded-meta">
          <span>Fields</span>
          <strong>{formatOptionalNumber(embeddedItem.fieldCount)}</strong>
        </div>
        <div className="canvas-creature-properties-embedded-meta">
          <span>Properties</span>
          <strong>{propertyEntries.length}</strong>
        </div>
      </div>

      <div className="canvas-creature-properties-section-actions canvas-creature-properties-embedded-actions">
        <button
          type="button"
          onClick={() =>
            updatePropertyEntries([
              ...propertyEntries.map(cloneEmbeddedItemProperty),
              createEmptyEmbeddedItemProperty()
            ])
          }
        >
          Add Property
        </button>
      </div>
      <table className="canvas-creature-properties-table canvas-creature-properties-embedded-property-table">
        <thead>
          <tr>
            {EMBEDDED_ITEM_PROPERTY_FIELDS.map((field) => (
              <th key={field.key} scope="col">
                {field.label}
              </th>
            ))}
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {propertyEntries.length > 0 ? (
            propertyEntries.map((propertyEntry, propertyIndex) => (
              <tr key={`${ariaPrefix}_property_${propertyIndex + 1}`}>
                {EMBEDDED_ITEM_PROPERTY_FIELDS.map((field) => (
                  <td key={field.key}>
                    <input
                      type="number"
                      step="1"
                      min={0}
                      aria-label={`${ariaPrefix} property ${propertyIndex + 1} ${field.label.toLowerCase()}`}
                      value={propertyEntry[field.key] ?? ""}
                      onChange={(event) =>
                        updatePropertyEntry(
                          propertyIndex,
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
                    onClick={() =>
                      updatePropertyEntries(
                        propertyEntries
                          .filter((_entry, entryIndex) => entryIndex !== propertyIndex)
                          .map(cloneEmbeddedItemProperty)
                      )
                    }
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={EMBEDDED_ITEM_PROPERTY_FIELDS.length + 1}>
                No embedded item properties
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </fieldset>
  );
}

export function CreaturePropertiesDialog({
  creaturePropertiesDialog,
  creaturePropertiesDialogRef,
  toggleCreaturePropertiesDialogCollapsed,
  cancelCreaturePropertiesDialog,
  setCreaturePropertiesActiveTab,
  updateCreaturePropertiesDraftField,
  updateCreatureClassEntry,
  updateCreatureSkillRank,
  updateCreatureScriptSlot,
  updateCreatureAppearancePart,
  updateCreatureAdvancedField,
  addCreatureVariable,
  updateCreatureVariable,
  removeCreatureVariable,
  addCreatureInventoryItem,
  updateCreatureInventoryItem,
  removeCreatureInventoryItem,
  addCreatureEquippedItem,
  updateCreatureEquippedItem,
  removeCreatureEquippedItem,
  creatureResourceOptions = {},
  applyCreaturePropertiesDraft,
  creatureFeatsFilter,
  setCreatureFeatsFilter,
  creatureSpellsLevelFilter,
  setCreatureSpellsLevelFilter,
  creatureSpellsMetaMagicFilter,
  setCreatureSpellsMetaMagicFilter,
  creatureSpellsClassFilterIndex,
  setCreatureSpellsClassFilterIndex,
  creatureSpecialAbilitiesFilter,
  setCreatureSpecialAbilitiesFilter,
  startCreaturePropertiesDialogDrag,
  moveCreaturePropertiesDialogDrag,
  endCreaturePropertiesDialogDrag,
  cancelCreaturePropertiesDialogDrag
}: CreaturePropertiesDialogProps) {
  const [showVariables, setShowVariables] = useState(false);
  const [activeResourcePicker, setActiveResourcePicker] = useState<
    "conversation" | "portrait" | "soundset" | null
  >(null);
  const creatureAbilityTotals = {
    strength: creaturePropertiesDialog.draft.strength + creaturePropertiesDialog.draft.strRacial,
    dexterity: creaturePropertiesDialog.draft.dexterity + creaturePropertiesDialog.draft.dexRacial,
    constitution:
      creaturePropertiesDialog.draft.constitution + creaturePropertiesDialog.draft.conRacial,
    intelligence:
      creaturePropertiesDialog.draft.intelligence + creaturePropertiesDialog.draft.intRacial,
    wisdom: creaturePropertiesDialog.draft.wisdom + creaturePropertiesDialog.draft.wisRacial,
    charisma: creaturePropertiesDialog.draft.charisma + creaturePropertiesDialog.draft.chaRacial
  };
  const creatureAbilityBonuses = {
    strength: resolveAbilityScoreModifier(creatureAbilityTotals.strength),
    dexterity: resolveAbilityScoreModifier(creatureAbilityTotals.dexterity),
    constitution: resolveAbilityScoreModifier(creatureAbilityTotals.constitution),
    intelligence: resolveAbilityScoreModifier(creatureAbilityTotals.intelligence),
    wisdom: resolveAbilityScoreModifier(creatureAbilityTotals.wisdom),
    charisma: resolveAbilityScoreModifier(creatureAbilityTotals.charisma)
  };
  const creatureTotalArmorClass =
    creaturePropertiesDialog.draft.naturalArmorClass +
    creaturePropertiesDialog.draft.baseArmorClass +
    creaturePropertiesDialog.draft.dexterityBonus +
    creaturePropertiesDialog.draft.sizeModifier;
  const creatureTotalHitPoints =
    creaturePropertiesDialog.draft.baseHitPoints + creaturePropertiesDialog.draft.hitPointBonuses;
  const creatureCalculatedChallengeRating = Math.max(
    0,
    creaturePropertiesDialog.draft.challengeRating +
      creaturePropertiesDialog.draft.advancedSettings.challengeRatingAdjustment
  );
  const creatureFeatsSource = creaturePropertiesDialog.draft.feats;
  const creatureFeatsRows =
    creatureFeatsFilter === "All Feats"
      ? creatureFeatsSource
      : creatureFeatsSource.filter((entry) => entry.type === creatureFeatsFilter);
  const creatureFeatsSummary = creatureFeatsSource
    .filter((entry) => entry.assigned)
    .reduce<Record<string, string[]>>((acc, entry) => {
      if (!acc[entry.type]) {
        acc[entry.type] = [];
      }
      acc[entry.type].push(entry.name);
      return acc;
    }, {});
  const creatureFeatsSummaryText =
    Object.entries(creatureFeatsSummary)
      .map(([type, names]) => `${type}\n${names.map((name) => `  ${name}`).join("\n")}`)
      .join("\n") || "No assigned feats";
  const creatureSpellSource = creaturePropertiesDialog.draft.spells;
  const creatureSpellsRows =
    creatureSpellsLevelFilter === "All Levels"
      ? creatureSpellSource
      : creatureSpellSource.filter(
          (entry) => String(entry.spellLevel) === creatureSpellsLevelFilter
        );
  const creatureClassFilterEntries = creaturePropertiesDialog.draft.classEntries
    .map((entry) => entry.className.trim())
    .filter((entry, index) => entry.length > 0 || index === 0)
    .slice(0, 8);
  const creatureSpellsSummaryText =
    creatureSpellsRows.map((entry) => `${entry.name} (L${entry.spellLevel})`).join("\n") ||
    "No spells in current filter";
  const creatureSpecialAbilitiesSource = creaturePropertiesDialog.draft.specialAbilities;
  const creatureSpecialAbilitiesRows =
    creatureSpecialAbilitiesFilter === "All Spells and Abilities"
      ? creatureSpecialAbilitiesSource
      : creatureSpecialAbilitiesSource.filter((entry) => entry.type === creatureSpecialAbilitiesFilter);
  const creatureSpecialAbilitiesSummaryText =
    creatureSpecialAbilitiesRows.map((entry) => `${entry.type}\n  ${entry.name}`).join("\n") ||
    "No abilities in current filter";

  return (
    <SharedPropertyDialogChrome
      articleRef={creaturePropertiesDialogRef}
      articleClassName="canvas-placeable-properties-dialog canvas-creature-properties-dialog"
      ariaLabel="Creature properties"
      windowX={creaturePropertiesDialog.windowX}
      windowY={creaturePropertiesDialog.windowY}
      headerClassName="canvas-placeable-properties-header"
      headerCopyClassName="canvas-placeable-properties-header-copy"
      headerActionsClassName="canvas-placeable-properties-header-actions"
      title="Creature Properties"
      subtitle={creaturePropertiesDialog.draft.tag || creaturePropertiesDialog.objectId}
      collapsed={creaturePropertiesDialog.collapsed}
      collapseLabel="Collapse creature properties dialog"
      expandLabel="Expand creature properties dialog"
      closeLabel="Close creature properties dialog"
      onToggleCollapsed={toggleCreaturePropertiesDialogCollapsed}
      onClose={cancelCreaturePropertiesDialog}
      onArticleMouseDown={(event) => event.stopPropagation()}
      onArticleContextMenu={(event) => event.preventDefault()}
      onHeaderPointerDown={startCreaturePropertiesDialogDrag}
      onHeaderPointerMove={moveCreaturePropertiesDialogDrag}
      onHeaderPointerUp={endCreaturePropertiesDialogDrag}
      onHeaderPointerCancel={cancelCreaturePropertiesDialogDrag}
    >
      <>
          <SharedPropertyTabsNav
            className="canvas-placeable-properties-tabs"
            ariaLabel="creature properties tabs"
            tabs={CREATURE_PROPERTIES_TAB_OPTIONS}
            activeTab={creaturePropertiesDialog.activeTab}
            onSelectTab={setCreaturePropertiesActiveTab}
          />

          <section className="canvas-placeable-properties-shell">
            <SharedObjectPreviewPane
              className="canvas-placeable-properties-preview-pane"
              previewClassName="canvas-placeable-properties-preview"
              previewText={creaturePropertiesDialog.draft.appearance}
              previewFallback="Creature Preview"
              actionClassName="canvas-placeable-properties-preview-action"
            />

            <div className="canvas-placeable-properties-pane">
              {creaturePropertiesDialog.activeTab === "basic" ? (
                <div className="canvas-placeable-properties-basic canvas-creature-properties-basic">
                  <fieldset className="canvas-placeable-properties-basic-identity canvas-placeable-properties-group">
                    <legend>Profile</legend>
                    <label className="canvas-placeable-properties-field-row">
                      <span>First Name</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.firstName}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("firstName", event.target.value)
                          }
                        />
                        <button type="button" disabled aria-label="Browse first name">
                          ...
                        </button>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Last Name</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.lastName}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("lastName", event.target.value)
                          }
                        />
                        <button type="button" disabled aria-label="Browse last name">
                          ...
                        </button>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Tag</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.tag}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("tag", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Race</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creaturePropertiesDialog.draft.race}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("race", event.target.value)
                          }
                        >
                          {CREATURE_RACE_OPTIONS.map((race) => (
                            <option key={race} value={race}>
                              {race}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Appearance</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.appearance}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("appearance", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Phenotype</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.phenotype}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("phenotype", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Gender</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creaturePropertiesDialog.draft.gender}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("gender", event.target.value)
                          }
                        >
                          {CREATURE_GENDER_OPTIONS.map((gender) => (
                            <option key={gender} value={gender}>
                              {gender}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Challenge Rating</span>
                      <div className="canvas-placeable-properties-field-control is-narrow">
                        <input
                          type="number"
                          step="0.1"
                          min={0}
                          value={creaturePropertiesDialog.draft.challengeRating}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField(
                              "challengeRating",
                              Math.max(0, Number.parseFloat(event.target.value) || 0)
                            )
                          }
                        />
                      </div>
                    </label>
                  </fieldset>

                  <div className="canvas-creature-properties-basic-panel-stack">
                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Portrait</legend>
                      <div className="canvas-placeable-properties-portrait-row">
                        <div className="canvas-placeable-properties-portrait-preview">
                          <span>{creaturePropertiesDialog.draft.portraitResRef || "Portrait"}</span>
                        </div>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            aria-label="Portrait"
                            value={creaturePropertiesDialog.draft.portraitResRef}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "portraitResRef",
                                event.target.value
                              )
                            }
                          />
                          <button
                            type="button"
                            aria-label="Browse portrait"
                            title="Browse portrait"
                            onClick={() =>
                              setActiveResourcePicker((current) =>
                                current === "portrait" ? null : "portrait"
                              )
                            }
                          >
                            ...
                          </button>
                        </div>
                      </div>
                      {activeResourcePicker === "portrait" ? (
                        <select
                          aria-label="Select portrait"
                          value={creaturePropertiesDialog.draft.portraitResRef}
                          onChange={(event) => {
                            updateCreaturePropertiesDraftField("portraitResRef", event.target.value);
                            setActiveResourcePicker(null);
                          }}
                        >
                          <option value="">Select portrait</option>
                          {(creatureResourceOptions.portrait ?? []).map((entry) => (
                            <option key={entry.resRef} value={entry.resRef}>
                              {entry.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                    </fieldset>

                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Conversation</legend>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Conversation</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={creaturePropertiesDialog.draft.conversation}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "conversation",
                                event.target.value
                              )
                            }
                          />
                          <button
                            type="button"
                            aria-label="Browse conversation"
                            title="Browse conversation"
                            onClick={() =>
                              setActiveResourcePicker((current) =>
                                current === "conversation" ? null : "conversation"
                              )
                            }
                          >
                            ...
                          </button>
                          <button type="button" disabled aria-label="Edit conversation">
                            Edit
                          </button>
                        </div>
                      </label>
                      {activeResourcePicker === "conversation" ? (
                        <select
                          aria-label="Select conversation"
                          value={creaturePropertiesDialog.draft.conversation}
                          onChange={(event) => {
                            updateCreaturePropertiesDraftField("conversation", event.target.value);
                            setActiveResourcePicker(null);
                          }}
                        >
                          <option value="">Select conversation</option>
                          {(creatureResourceOptions.conversation ?? []).map((entry) => (
                            <option key={entry.resRef} value={entry.resRef}>
                              {entry.label}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.noInterrupt}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("noInterrupt", event.target.checked)
                          }
                        />
                        No Interrupt
                      </label>
                    </fieldset>
                  </div>
                </div>
              ) : null}

              {creaturePropertiesDialog.activeTab === "statistics" ? (
                <div className="canvas-creature-properties-statistics">
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>Ability Scores</legend>
                    <table className="canvas-creature-properties-table">
                      <thead>
                        <tr>
                          <th scope="col">Ability</th>
                          <th scope="col">Score</th>
                          <th scope="col">Racial Modifier</th>
                          <th scope="col">Total</th>
                          <th scope="col">Bonus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ["Strength", "strength", "strRacial"],
                          ["Dexterity", "dexterity", "dexRacial"],
                          ["Constitution", "constitution", "conRacial"],
                          ["Intelligence", "intelligence", "intRacial"],
                          ["Wisdom", "wisdom", "wisRacial"],
                          ["Charisma", "charisma", "chaRacial"]
                        ].map(([label, scoreField, racialField]) => {
                          const scoreValue = creaturePropertiesDialog.draft[
                            scoreField as keyof CreaturePropertiesDraft
                          ] as number;
                          const racialValue = creaturePropertiesDialog.draft[
                            racialField as keyof CreaturePropertiesDraft
                          ] as number;
                          const totalValue = scoreValue + racialValue;
                          const bonusValue = resolveAbilityScoreModifier(totalValue);
                          return (
                            <tr key={label}>
                              <th scope="row">{label}</th>
                              <td>
                                <input
                                  type="number"
                                  step="1"
                                  aria-label={`${label} score`}
                                  value={scoreValue}
                                  onChange={(event) =>
                                    updateCreaturePropertiesDraftField(
                                      scoreField as keyof CreaturePropertiesDraft,
                                      Number.parseFloat(event.target.value) || 0
                                    )
                                  }
                                />
                              </td>
                              <td>
                                <input
                                  type="number"
                                  step="1"
                                  aria-label={`${label} racial modifier`}
                                  value={racialValue}
                                  onChange={(event) =>
                                    updateCreaturePropertiesDraftField(
                                      racialField as keyof CreaturePropertiesDraft,
                                      Number.parseFloat(event.target.value) || 0
                                    )
                                  }
                                />
                              </td>
                              <td>{totalValue}</td>
                              <td>{bonusValue}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </fieldset>

                  <div className="canvas-creature-properties-statistics-grid">
                    <fieldset className="canvas-placeable-properties-group">
                      <legend>Saves</legend>
                      <table className="canvas-creature-properties-table">
                        <thead>
                          <tr>
                            <th scope="col">Save</th>
                            <th scope="col">Base</th>
                            <th scope="col">Ability Modifier</th>
                            <th scope="col">Bonus</th>
                            <th scope="col">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ["Fortitude", "fortitudeBase", "fortitudeBonus", "constitution"],
                            ["Reflex", "reflexBase", "reflexBonus", "dexterity"],
                            ["Will", "willBase", "willBonus", "wisdom"]
                          ].map(([label, baseField, bonusField, abilityField]) => {
                            const baseValue = creaturePropertiesDialog.draft[
                              baseField as keyof CreaturePropertiesDraft
                            ] as number;
                            const bonusValue = creaturePropertiesDialog.draft[
                              bonusField as keyof CreaturePropertiesDraft
                            ] as number;
                            const abilityModifier =
                              creatureAbilityBonuses?.[
                                abilityField as keyof NonNullable<typeof creatureAbilityBonuses>
                              ] ?? 0;
                            return (
                              <tr key={label}>
                                <th scope="row">{label}</th>
                                <td>
                                  <span aria-label={`${label} base`} className="canvas-creature-properties-cell-value">
                                    {baseValue}
                                  </span>
                                </td>
                                <td>{abilityModifier}</td>
                                <td>
                                  <input
                                    type="number"
                                    step="1"
                                    aria-label={`${label} bonus`}
                                    value={bonusValue}
                                    onChange={(event) =>
                                      updateCreaturePropertiesDraftField(
                                        bonusField as keyof CreaturePropertiesDraft,
                                        Number.parseFloat(event.target.value) || 0
                                      )
                                    }
                                  />
                                </td>
                                <td>{baseValue + abilityModifier + bonusValue}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </fieldset>

                    <fieldset className="canvas-placeable-properties-group">
                      <legend>Armor / Hit Points</legend>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Natural AC</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.naturalArmorClass}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "naturalArmorClass",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Base AC</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.baseArmorClass}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "baseArmorClass",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Dexterity Bonus</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.dexterityBonus}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "dexterityBonus",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Size Modifier</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.sizeModifier}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "sizeModifier",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Base Hit Points</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.baseHitPoints}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "baseHitPoints",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Hit Point Bonuses</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.hitPointBonuses}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "hitPointBonuses",
                                Number.parseFloat(event.target.value) || 0
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Current Hit Points</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.currentHitPoints}
                            readOnly
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Max Hit Points</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            value={creaturePropertiesDialog.draft.maxHitPoints}
                            readOnly
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Total Armor Class</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input type="number" step="1" value={creatureTotalArmorClass} readOnly />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Total Hit Points</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input type="number" step="1" value={creatureTotalHitPoints} readOnly />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Movement Rate</span>
                        <div className="canvas-placeable-properties-field-control">
                          <select
                            value={creaturePropertiesDialog.draft.movementRate}
                            onChange={(event) =>
                              updateCreaturePropertiesDraftField(
                                "movementRate",
                                event.target.value
                              )
                            }
                          >
                            {CREATURE_MOVEMENT_RATE_OPTIONS.map((movementRate) => (
                              <option key={movementRate} value={movementRate}>
                                {movementRate}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                    </fieldset>
                  </div>
                </div>
              ) : null}

              {creaturePropertiesDialog.activeTab === "appearance" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <label className="canvas-placeable-properties-toggle">
                    <input
                      type="checkbox"
                      checked={creaturePropertiesDialog.draft.appearancePartBased}
                      onChange={(event) =>
                        updateCreaturePropertiesDraftField(
                          "appearancePartBased",
                          event.target.checked
                        )
                      }
                    />
                    Use part-based appearance
                  </label>
                  <div className="canvas-creature-properties-appearance-aurora">
                    <div className="canvas-creature-properties-appearance-core">
                      {CREATURE_APPEARANCE_CORE_FIELDS.map((entry) => (
                        <label
                          key={entry.key}
                          className="canvas-placeable-properties-field-row canvas-creature-properties-appearance-core-row"
                        >
                          <span>{entry.label}</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.appearanceParts[entry.key]}
                              disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                              onChange={(event) =>
                                updateCreatureAppearancePart(entry.key, event.target.value)
                              }
                            />
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="canvas-creature-properties-appearance-limbs">
                      {CREATURE_APPEARANCE_LIMB_PAIRS.map((pair) => (
                        <div key={pair.rightKey} className="canvas-creature-properties-appearance-pair">
                          <label className="canvas-placeable-properties-field-row">
                            <span>{pair.rightLabel}</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="text"
                                value={
                                  creaturePropertiesDialog.draft.appearanceParts[pair.rightKey]
                                }
                                disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                                onChange={(event) =>
                                  updateCreatureAppearancePart(pair.rightKey, event.target.value)
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>{pair.leftLabel}</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="text"
                                value={
                                  creaturePropertiesDialog.draft.appearanceParts[pair.leftKey]
                                }
                                disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                                onChange={(event) =>
                                  updateCreatureAppearancePart(pair.leftKey, event.target.value)
                                }
                              />
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>

                    <div className="canvas-creature-properties-appearance-tail-row">
                      <label className="canvas-placeable-properties-field-row">
                        <span>{CREATURE_APPEARANCE_EXTRA_PAIR.rightLabel}</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={
                              creaturePropertiesDialog.draft.appearanceParts[
                                CREATURE_APPEARANCE_EXTRA_PAIR.rightKey
                              ]
                            }
                            disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                            onChange={(event) =>
                              updateCreatureAppearancePart(
                                CREATURE_APPEARANCE_EXTRA_PAIR.rightKey,
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>{CREATURE_APPEARANCE_EXTRA_PAIR.leftLabel}</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={
                              creaturePropertiesDialog.draft.appearanceParts[
                                CREATURE_APPEARANCE_EXTRA_PAIR.leftKey
                              ]
                            }
                            disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                            onChange={(event) =>
                              updateCreatureAppearancePart(
                                CREATURE_APPEARANCE_EXTRA_PAIR.leftKey,
                                event.target.value
                              )
                            }
                          />
                        </div>
                      </label>
                    </div>
                  </div>
                  <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                    <legend>Colors</legend>
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Skin</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={creaturePropertiesDialog.draft.appearanceColors.skin}
                            readOnly
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Hair</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={creaturePropertiesDialog.draft.appearanceColors.hair}
                            readOnly
                          />
                        </div>
                      </label>
                    </div>
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Tattoo 1</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={creaturePropertiesDialog.draft.appearanceColors.tattoo1}
                            readOnly
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Tattoo 2</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={creaturePropertiesDialog.draft.appearanceColors.tattoo2}
                            readOnly
                          />
                        </div>
                      </label>
                    </div>
                  </fieldset>
                  <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                    <legend>Source-only Parts</legend>
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Belt</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={creaturePropertiesDialog.draft.appearanceSourceOnlyParts.belt}
                            readOnly
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Robe</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={creaturePropertiesDialog.draft.appearanceSourceOnlyParts.robe}
                            readOnly
                          />
                        </div>
                      </label>
                    </div>
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Right Shoulder</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={
                              creaturePropertiesDialog.draft.appearanceSourceOnlyParts
                                .rightShoulder
                            }
                            readOnly
                          />
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Left Shoulder</span>
                        <div className="canvas-placeable-properties-field-control">
                          <input
                            type="text"
                            value={
                              creaturePropertiesDialog.draft.appearanceSourceOnlyParts
                                .leftShoulder
                            }
                            readOnly
                          />
                        </div>
                      </label>
                    </div>
                  </fieldset>
                  <p className="canvas-placeable-properties-note">
                    Aurora-first: part fields affect only models supporting body-part overrides.
                  </p>
                </fieldset>
              ) : null}

              {creaturePropertiesDialog.activeTab === "classes" ? (
                <div className="canvas-creature-properties-classes">
                  <fieldset className="canvas-placeable-properties-group">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Alignment</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creaturePropertiesDialog.draft.alignment}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("alignment", event.target.value)
                          }
                        >
                          {CREATURE_ALIGNMENT_OPTIONS.map((alignment) => (
                            <option key={alignment} value={alignment}>
                              {alignment}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </fieldset>
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>Classes</legend>
                    <table className="canvas-creature-properties-table">
                      <thead>
                        <tr>
                          <th scope="col">ID</th>
                          <th scope="col">Class</th>
                          <th scope="col">Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creaturePropertiesDialog.draft.classEntries.map((entry, index) => (
                          <tr key={`class_${index + 1}`}>
                            <td>
                              <input
                                type="number"
                                min={0}
                                max={255}
                                aria-label={`Class ${index + 1} ID`}
                                value={entry.classId ?? ""}
                                onChange={(event) =>
                                  updateCreatureClassEntry(
                                    index,
                                    "classId",
                                    Number.parseInt(event.target.value, 10) || 0
                                  )
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="text"
                                value={entry.className}
                                onChange={(event) =>
                                  updateCreatureClassEntry(index, "className", event.target.value)
                                }
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="1"
                                min={1}
                                value={entry.level}
                                onChange={(event) =>
                                  updateCreatureClassEntry(
                                    index,
                                    "level",
                                    Math.max(1, Number.parseFloat(event.target.value) || 1)
                                  )
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Default Package for Autolevelup</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.defaultPackage}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField("defaultPackage", event.target.value)
                          }
                        />
                      </div>
                    </label>
                  </fieldset>
                  {creaturePropertiesDialog.draft.templateEntries.length > 0 ? (
                    <fieldset className="canvas-placeable-properties-group">
                      <legend>Template List</legend>
                      <table className="canvas-creature-properties-table">
                        <thead>
                          <tr>
                            <th scope="col">Entry</th>
                            <th scope="col">Template ID</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creaturePropertiesDialog.draft.templateEntries.map((entry, index) => (
                            <tr key={`template_${index + 1}`}>
                              <th scope="row">{index + 1}</th>
                              <td>
                                <input
                                  type="text"
                                  value={
                                    typeof entry.templateId === "number"
                                      ? String(entry.templateId)
                                      : ""
                                  }
                                  readOnly
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </fieldset>
                  ) : null}
                </div>
              ) : null}

              {creaturePropertiesDialog.activeTab === "skills" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <legend>Skills</legend>
                  <table className="canvas-creature-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Skill</th>
                        <th scope="col">Rank</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creaturePropertiesDialog.draft.skills.map((entry, index) => (
                        <tr key={entry.skill}>
                          <th scope="row">{entry.skill}</th>
                          <td>
                            <input
                              type="number"
                              step="1"
                              min={0}
                              value={entry.rank}
                              onChange={(event) =>
                                updateCreatureSkillRank(
                                  index,
                                  Math.max(0, Number.parseFloat(event.target.value) || 0)
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </fieldset>
              ) : null}

{creaturePropertiesDialog.activeTab === "scripts" ? (
  <>
    <SharedScriptSlotSection
                  className="canvas-placeable-properties-group"
                  legend="Scripts"
                  slots={CREATURE_SCRIPT_SLOT_KEYS}
                  labels={CREATURE_SCRIPT_SLOT_LABELS}
                  values={creaturePropertiesDialog.draft.scriptSlots}
                  onChange={updateCreatureScriptSlot}
                  inputIdPrefix="creature-script"
                  inputListId="creature-script-resource-options"
                  rowClassName="canvas-placeable-properties-field-row"
                  rowControlClassName="canvas-placeable-properties-field-control"
                  showInlineActionButtons
                  inlineBrowseDisabled
                  inlineEditDisabled
    />
    <datalist id="creature-script-resource-options">
      {(creatureResourceOptions.script ?? []).map((entry) => (
        <option key={entry.resRef} value={entry.resRef} label={entry.label} />
      ))}
    </datalist>
  </>
) : null}

              {creaturePropertiesDialog.activeTab === "advanced" ? (
                <div className="canvas-creature-properties-advanced">
                  <fieldset className="canvas-placeable-properties-group">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Blueprint ResRef</span>
                      <div className="canvas-placeable-properties-field-control">
                        <input
                          type="text"
                          value={creaturePropertiesDialog.draft.advancedSettings.blueprintResRef}
                          onChange={(event) =>
                            updateCreatureAdvancedField("blueprintResRef", event.target.value)
                          }
                        />
                      </div>
                    </label>
                    <div className="canvas-placeable-properties-basic-flags">
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.disarmable}
                          onChange={(event) =>
                            updateCreatureAdvancedField("disarmable", event.target.checked)
                          }
                        />
                        Disarmable
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.plot}
                          onChange={(event) =>
                            updateCreatureAdvancedField("plot", event.target.checked)
                          }
                        />
                        Plot
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={
                            creaturePropertiesDialog.draft.advancedSettings.playerCharacter
                          }
                          onChange={(event) =>
                            updateCreatureAdvancedField(
                              "playerCharacter",
                              event.target.checked
                            )
                          }
                        />
                        Player Character
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={
                            creaturePropertiesDialog.draft.advancedSettings.leavesLootableCorpse
                          }
                          onChange={(event) =>
                            updateCreatureAdvancedField(
                              "leavesLootableCorpse",
                              event.target.checked
                            )
                          }
                        />
                        Leaves Lootable Corpse
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.noPermanentDeath}
                          onChange={(event) =>
                            updateCreatureAdvancedField(
                              "noPermanentDeath",
                              event.target.checked
                            )
                          }
                        />
                        No Permanent Death
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.immortal}
                          onChange={(event) =>
                            updateCreatureAdvancedField("immortal", event.target.checked)
                          }
                        />
                        Immortal
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.bodyBag}
                          onChange={(event) =>
                            updateCreatureAdvancedField("bodyBag", event.target.checked)
                          }
                        />
                        Body Bag
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.advancedSettings.startingPackage}
                          onChange={(event) =>
                            updateCreatureAdvancedField("startingPackage", event.target.checked)
                          }
                        />
                        Starting Package
                      </label>
                    </div>
                  </fieldset>

                  <fieldset className="canvas-placeable-properties-group">
                    <div className="canvas-placeable-properties-dual-fields">
                      <label className="canvas-placeable-properties-field-row">
                        <span>Treasure Model</span>
                        <div className="canvas-placeable-properties-field-control">
                          <select
                            value={creaturePropertiesDialog.draft.advancedSettings.treasureModel}
                            onChange={(event) =>
                              updateCreatureAdvancedField("treasureModel", event.target.value)
                            }
                          >
                            {CREATURE_TREASURE_MODEL_OPTIONS.map((treasureModel) => (
                              <option key={treasureModel} value={treasureModel}>
                                {treasureModel}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Corpse Decay Time (s)</span>
                        <div className="canvas-placeable-properties-field-control is-narrow">
                          <input
                            type="number"
                            step="1"
                            min={0}
                            value={
                              creaturePropertiesDialog.draft.advancedSettings.corpseDecayTimeSeconds
                            }
                            onChange={(event) =>
                              updateCreatureAdvancedField(
                                "corpseDecayTimeSeconds",
                                Math.max(0, Number.parseFloat(event.target.value) || 0)
                              )
                            }
                          />
                        </div>
                      </label>
                    </div>

                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Faction</legend>
                      <label className="canvas-placeable-properties-field-row">
                        <span>Faction</span>
                        <div className="canvas-placeable-properties-field-control">
                          <select
                            value={creaturePropertiesDialog.draft.advancedSettings.faction}
                            onChange={(event) =>
                              updateCreatureAdvancedField("faction", event.target.value)
                            }
                          >
                            {CREATURE_FACTION_OPTIONS.map((faction) => (
                              <option key={faction} value={faction}>
                                {faction}
                              </option>
                            ))}
                          </select>
                          <button type="button" disabled>
                            Edit Factions
                          </button>
                        </div>
                      </label>
                    </fieldset>

                    <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                      <legend>Special</legend>
                      <div className="canvas-placeable-properties-dual-fields">
                        <label className="canvas-placeable-properties-field-row">
                          <span>Subrace</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.advancedSettings.subrace}
                              onChange={(event) =>
                                updateCreatureAdvancedField("subrace", event.target.value)
                              }
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Deity</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.advancedSettings.deity}
                              onChange={(event) =>
                                updateCreatureAdvancedField("deity", event.target.value)
                              }
                            />
                          </div>
                        </label>
                      </div>
                      <div className="canvas-placeable-properties-variables-row">
                        <button type="button" disabled>
                          Apply Template
                        </button>
                      </div>
                    </fieldset>

                    <div className="canvas-creature-properties-advanced-special-grid">
                      <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                        <legend>Challenge Rating</legend>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Calculated</span>
                          <div className="canvas-placeable-properties-field-control is-narrow">
                            <input
                              type="number"
                              step="0.01"
                              value={creatureCalculatedChallengeRating.toFixed(2)}
                              readOnly
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Adjustment</span>
                          <div className="canvas-placeable-properties-field-control is-narrow">
                            <input
                              type="number"
                              step="1"
                              value={
                                creaturePropertiesDialog.draft.advancedSettings
                                  .challengeRatingAdjustment
                              }
                              onChange={(event) =>
                                updateCreatureAdvancedField(
                                  "challengeRatingAdjustment",
                                  Number.parseFloat(event.target.value) || 0
                                )
                              }
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Challenge Rating</span>
                          <div className="canvas-placeable-properties-field-control is-narrow">
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              value={creaturePropertiesDialog.draft.challengeRating}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField(
                                  "challengeRating",
                                  Math.max(0, Number.parseFloat(event.target.value) || 0)
                                )
                              }
                            />
                          </div>
                        </label>
                      </fieldset>

                      <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                        <legend>Sound / Perception</legend>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Sound Set</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              readOnly
                              value={creaturePropertiesDialog.draft.advancedSettings.soundSet}
                            />
                            <button
                              type="button"
                              aria-label="Browse sound set"
                              title="Browse sound set"
                              onClick={() =>
                                setActiveResourcePicker((current) =>
                                  current === "soundset" ? null : "soundset"
                                )
                              }
                            >
                              ...
                            </button>
                          </div>
                        </label>
                        {activeResourcePicker === "soundset" ? (
                          <select
                            aria-label="Select sound set"
                            value={String(
                              creaturePropertiesDialog.draft.advancedSettings.soundSetFile ?? ""
                            )}
                            onChange={(event) => {
                              const selected = (creatureResourceOptions.soundset ?? []).find(
                                (entry) => String(entry.soundSetFile ?? "") === event.target.value
                              );
                              updateCreatureAdvancedField(
                                "soundSetFile",
                                selected?.soundSetFile ?? 0
                              );
                              updateCreatureAdvancedField("soundSet", selected?.label ?? "");
                              setActiveResourcePicker(null);
                            }}
                          >
                            <option value="">Select sound set</option>
                            {(creatureResourceOptions.soundset ?? []).map((entry) => (
                              <option
                                key={`${entry.soundSetFile ?? "none"}_${entry.resRef}`}
                                value={String(entry.soundSetFile ?? "")}
                              >
                                {entry.label}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <label className="canvas-placeable-properties-field-row">
                          <span>Perception Range</span>
                          <div className="canvas-placeable-properties-field-control">
                            <select
                              value={creaturePropertiesDialog.draft.advancedSettings.perceptionRange}
                              onChange={(event) =>
                                updateCreatureAdvancedField("perceptionRange", event.target.value)
                              }
                            >
                              {CREATURE_PERCEPTION_RANGE_OPTIONS.map((perceptionRange) => (
                                <option key={perceptionRange} value={perceptionRange}>
                                  {perceptionRange}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                      </fieldset>
                    </div>

                    <div className="canvas-placeable-properties-variables-row">
                      <button
                        type="button"
                        aria-expanded={showVariables}
                        onClick={() => setShowVariables((current) => !current)}
                      >
                        Variables ({creaturePropertiesDialog.draft.variables.length})
                      </button>
                    </div>
                    {showVariables ? (
                      <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                        <legend>Variables</legend>
                        <table className="canvas-creature-properties-table">
                          <thead>
                            <tr>
                              <th scope="col">Name</th>
                              <th scope="col">Type</th>
                              <th scope="col">Value</th>
                              <th scope="col" aria-label="Actions" />
                            </tr>
                          </thead>
                          <tbody>
                            {creaturePropertiesDialog.draft.variables.map((entry, index) => (
                              <tr key={`variable_${index + 1}`}>
                                <td>
                                  <input
                                    type="text"
                                    value={entry.name}
                                    aria-label={`Variable ${index + 1} name`}
                                    onChange={(event) =>
                                      updateCreatureVariable(index, {
                                        ...entry,
                                        name: event.target.value
                                      })
                                    }
                                  />
                                </td>
                                <td>
                                  <select
                                    value={entry.type}
                                    aria-label={`Variable ${index + 1} type`}
                                    onChange={(event) => {
                                      const type = event.target.value as CreatureVariableDraft["type"];
                                      updateCreatureVariable(index, {
                                        name: entry.name,
                                        type,
                                        value: type === "string" ? "" : 0
                                      } as CreatureVariableDraft);
                                    }}
                                  >
                                    <option value="int">Int</option>
                                    <option value="float">Float</option>
                                    <option value="string">String</option>
                                  </select>
                                </td>
                                <td>
                                  {entry.type === "string" ? (
                                    <input
                                      type="text"
                                      value={entry.value}
                                      aria-label={`Variable ${index + 1} value`}
                                      onChange={(event) =>
                                        updateCreatureVariable(index, {
                                          name: entry.name,
                                          type: "string",
                                          value: event.target.value
                                        })
                                      }
                                    />
                                  ) : (
                                    <input
                                      type="number"
                                      step={entry.type === "int" ? "1" : "any"}
                                      value={entry.value}
                                      aria-label={`Variable ${index + 1} value`}
                                      onChange={(event) => {
                                        const value = Number.parseFloat(event.target.value);
                                        updateCreatureVariable(index, {
                                          name: entry.name,
                                          type: entry.type,
                                          value:
                                            entry.type === "int"
                                              ? Math.trunc(Number.isFinite(value) ? value : 0)
                                              : Number.isFinite(value)
                                                ? value
                                                : 0
                                        });
                                      }}
                                    />
                                  )}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    aria-label={`Remove variable ${index + 1}`}
                                    onClick={() => removeCreatureVariable(index)}
                                  >
                                    x
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="canvas-creature-properties-aux-row">
                          <button type="button" onClick={addCreatureVariable}>
                            Add variable
                          </button>
                        </div>
                      </fieldset>
                    ) : null}
                  </fieldset>
                </div>
              ) : null}

              {creaturePropertiesDialog.activeTab === "feats" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <legend>Feats</legend>
                  <table className="canvas-creature-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Feat ID</th>
                        <th scope="col">Name</th>
                        <th scope="col">Type</th>
                        <th scope="col">Assigned</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creatureFeatsRows.map((entry, index) => (
                        <tr key={`feat_${index + 1}_${entry.name}`}>
                          <td>{formatOptionalNumber(entry.featId)}</td>
                          <td>{entry.name}</td>
                          <td>{entry.type}</td>
                          <td>
                            <input type="checkbox" checked={entry.assigned} readOnly />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="canvas-creature-properties-aux-row">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Filter</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creatureFeatsFilter}
                          onChange={(event) => setCreatureFeatsFilter(event.target.value)}
                        >
                          {CREATURE_FEAT_FILTER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button type="button" disabled aria-label="Feats help">
                          ?
                        </button>
                      </div>
                    </label>
                  </div>
                  <label className="canvas-placeable-properties-fulltext">
                    <span>Feats Selection Summary</span>
                    <textarea value={creatureFeatsSummaryText} readOnly rows={7} />
                  </label>
                </fieldset>
              ) : null}

              {creaturePropertiesDialog.activeTab === "spells" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <legend>Spells</legend>
                  <table className="canvas-creature-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Prepared</th>
                        <th scope="col">Spell ID</th>
                        <th scope="col">Class</th>
                        <th scope="col">Name</th>
                        <th scope="col">Spell Level</th>
                        <th scope="col">Casting Level</th>
                        <th scope="col">MetaMagic</th>
                        <th scope="col">Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creatureSpellsRows.map((entry, index) => (
                        <tr key={`spell_${index + 1}_${entry.name}`}>
                          <td>
                            <input type="checkbox" checked={entry.prepared} readOnly />
                          </td>
                          <td>{formatOptionalNumber(entry.spellId)}</td>
                          <td>
                            {entry.classIndex === undefined
                              ? "-"
                              : creaturePropertiesDialog.draft.classEntries[
                                  entry.classIndex
                                ]?.className || `Class ${entry.classIndex + 1}`}
                          </td>
                          <td>{entry.name}</td>
                          <td>{entry.spellLevel}</td>
                          <td>{entry.castingLevel}</td>
                          <td>{formatOptionalNumber(entry.metaMagic)}</td>
                          <td>{formatOptionalNumber(entry.flags)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="canvas-placeable-properties-dual-fields">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Spell Level</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creatureSpellsLevelFilter}
                          onChange={(event) => setCreatureSpellsLevelFilter(event.target.value)}
                        >
                          {CREATURE_SPELL_LEVEL_FILTER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </label>
                    <label className="canvas-placeable-properties-field-row">
                      <span>Meta-Magic</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creatureSpellsMetaMagicFilter}
                          onChange={(event) =>
                            setCreatureSpellsMetaMagicFilter(event.target.value)
                          }
                        >
                          {CREATURE_METAMAGIC_FILTER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button type="button" disabled aria-label="Spells help">
                          ?
                        </button>
                      </div>
                    </label>
                  </div>
                  <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                    <legend>Class</legend>
                    <div className="canvas-creature-properties-class-radio-grid">
                      {(creatureClassFilterEntries.length > 0
                        ? creatureClassFilterEntries
                        : ["Class 1"]
                      ).map((className, index) => (
                        <label
                          key={`${className || "class"}_${index + 1}`}
                          className="canvas-placeable-properties-toggle"
                        >
                          <input
                            type="radio"
                            name="creature-spells-class"
                            checked={creatureSpellsClassFilterIndex === index}
                            onChange={() => setCreatureSpellsClassFilterIndex(index)}
                          />
                          {className || `Class ${index + 1}`}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <label className="canvas-placeable-properties-fulltext">
                    <span>Spell Selection Summary</span>
                    <textarea value={creatureSpellsSummaryText} readOnly rows={7} />
                  </label>
                  <div className="canvas-placeable-properties-script-actions">
                    <button type="button" disabled>
                      Clear Class Spell List
                    </button>
                    <button type="button" disabled>
                      Save Class Spell List
                    </button>
                    <button type="button" disabled>
                      Load Class Spell List
                    </button>
                  </div>
                </fieldset>
              ) : null}

              {creaturePropertiesDialog.activeTab === "specialAbilities" ? (
                <fieldset className="canvas-placeable-properties-group">
                  <legend>Special Abilities</legend>
                  <table className="canvas-creature-properties-table">
                    <thead>
                      <tr>
                        <th scope="col">Spell ID</th>
                        <th scope="col">Name</th>
                        <th scope="col">Type</th>
                        <th scope="col">Flags</th>
                        <th scope="col">Caster Level</th>
                        <th scope="col">Uses</th>
                      </tr>
                    </thead>
                    <tbody>
                      {creatureSpecialAbilitiesRows.map((entry, index) => (
                        <tr key={`ability_${index + 1}_${entry.name}`}>
                          <td>{formatOptionalNumber(entry.spellId)}</td>
                          <td>{entry.name}</td>
                          <td>{entry.type}</td>
                          <td>{formatOptionalNumber(entry.flags)}</td>
                          <td>{entry.casterLevel}</td>
                          <td>{entry.uses}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="canvas-creature-properties-aux-row">
                    <label className="canvas-placeable-properties-field-row">
                      <span>Filter</span>
                      <div className="canvas-placeable-properties-field-control">
                        <select
                          value={creatureSpecialAbilitiesFilter}
                          onChange={(event) =>
                            setCreatureSpecialAbilitiesFilter(event.target.value)
                          }
                        >
                          {CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <button type="button" disabled aria-label="Special abilities help">
                          ?
                        </button>
                      </div>
                    </label>
                  </div>
                  <label className="canvas-placeable-properties-fulltext">
                    <span>Special Abilities Selection Summary</span>
                    <textarea value={creatureSpecialAbilitiesSummaryText} readOnly rows={7} />
                  </label>
                </fieldset>
              ) : null}

              {creaturePropertiesDialog.activeTab === "inventory" ? (
                <div className="canvas-placeable-properties-basic canvas-creature-properties-basic">
                  <fieldset className="canvas-placeable-properties-group">
                    <legend>Inventory</legend>
                    <div className="canvas-creature-properties-section-actions">
                      <button type="button" onClick={addCreatureInventoryItem}>
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
                        {creaturePropertiesDialog.draft.inventoryItems.length > 0 ? (
                          creaturePropertiesDialog.draft.inventoryItems.map((entry, index) => (
                            <Fragment
                              key={`inventory_${index + 1}_${entry.resRef ?? entry.embeddedItem?.templateResRef ?? "item"}`}
                            >
                              <tr>
                                <td>
                                  <input
                                    type="text"
                                    aria-label={`Inventory item ${index + 1} resref`}
                                    value={entry.resRef ?? ""}
                                    onChange={(event) =>
                                      updateCreatureInventoryItem(
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
                                    aria-label={`Inventory item ${index + 1} random resref`}
                                    value={entry.randomResRef ?? ""}
                                    onChange={(event) =>
                                      updateCreatureInventoryItem(
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
                                    aria-label={`Inventory item ${index + 1} random list`}
                                    value={entry.randomList ?? ""}
                                    onChange={(event) =>
                                      updateCreatureInventoryItem(
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
                                    aria-label={`Inventory item ${index + 1} repo x`}
                                    value={entry.x ?? 0}
                                    onChange={(event) =>
                                      updateCreatureInventoryItem(
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
                                    aria-label={`Inventory item ${index + 1} repo y`}
                                    value={entry.y ?? 0}
                                    onChange={(event) =>
                                      updateCreatureInventoryItem(
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
                                        aria-label={`Inventory item ${index + 1} dropable`}
                                        checked={Boolean(entry.dropable)}
                                        onChange={(event) =>
                                          updateCreatureInventoryItem(
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
                                        aria-label={`Inventory item ${index + 1} pickpocketable`}
                                        checked={Boolean(entry.pickpocketable)}
                                        onChange={(event) =>
                                          updateCreatureInventoryItem(
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
                                        aria-label={`Inventory item ${index + 1} infinite`}
                                        checked={Boolean(entry.infinite)}
                                        onChange={(event) =>
                                          updateCreatureInventoryItem(
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
                                    onClick={() => removeCreatureInventoryItem(index)}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                              {entry.embeddedItem ? (
                                <tr className="canvas-creature-properties-embedded-row">
                                  <td colSpan={8}>
                                    <EmbeddedItemEditor
                                      itemIndex={index}
                                      contextLabel="Inventory item"
                                      embeddedItem={entry.embeddedItem}
                                      onChange={(nextEmbeddedItem) =>
                                        updateCreatureInventoryItem(
                                          index,
                                          "embeddedItem",
                                          nextEmbeddedItem
                                        )
                                      }
                                    />
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8}>No inventory entries</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </fieldset>

                  <fieldset className="canvas-placeable-properties-group">
                    <legend>Equipped Items</legend>
                    <div className="canvas-creature-properties-section-actions">
                      <button type="button" onClick={addCreatureEquippedItem}>
                        Add Equip_ItemList Entry
                      </button>
                    </div>
                    <table className="canvas-creature-properties-table">
                      <thead>
                        <tr>
                          <th scope="col">Slot Mask</th>
                          <th scope="col">ResRef</th>
                          <th scope="col">Random ResRef</th>
                          <th scope="col">Random List</th>
                          <th scope="col">Linked UTI</th>
                          <th scope="col">Flags</th>
                          <th scope="col">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creaturePropertiesDialog.draft.equippedItems.length > 0 ? (
                          creaturePropertiesDialog.draft.equippedItems.map((entry, index) => (
                            <Fragment
                              key={`equipped_${index + 1}_${entry.resRef ?? entry.embeddedItem?.templateResRef ?? "item"}`}
                            >
                              <tr>
                                <td>
                                  <select
                                    aria-label={`Equipped item ${index + 1} slot mask`}
                                    value={
                                      AURORA_ITEM_EQUIPMENT_SLOT_OPTIONS.some(
                                        (option) => option.value === entry.slotMask
                                      )
                                        ? String(entry.slotMask)
                                        : ""
                                    }
                                    onChange={(event) =>
                                      updateCreatureEquippedItem(
                                        index,
                                        "slotMask",
                                        parseOptionalIntegerInput(event.target.value)
                                      )
                                    }
                                  >
                                    <option value="">Custom / none</option>
                                    {AURORA_ITEM_EQUIPMENT_SLOT_OPTIONS.map((option) => (
                                      <option key={option.key} value={option.value}>
                                        {option.selectLabel}
                                      </option>
                                    ))}
                                  </select>
                                  <input
                                    type="number"
                                    step="1"
                                    min={0}
                                    aria-label={`Equipped item ${index + 1} slot mask raw`}
                                    value={entry.slotMask ?? ""}
                                    onChange={(event) =>
                                      updateCreatureEquippedItem(
                                        index,
                                        "slotMask",
                                        parseOptionalIntegerInput(event.target.value)
                                      )
                                    }
                                  />
                                  <span className="canvas-creature-properties-cell-value">
                                    {formatItemEquipmentSlotMask(entry.slotMask) ?? "No slot mask"}
                                  </span>
                                  {(() => {
                                    const compatibility = formatEquipmentSlotCompatibility(entry);
                                    return compatibility ? (
                                      <span
                                        className={`canvas-creature-properties-cell-value canvas-creature-properties-slot-compatibility canvas-creature-properties-slot-compatibility--${compatibility.status}`}
                                      >
                                        {compatibility.message}
                                      </span>
                                    ) : null;
                                  })()}
                                </td>
                                <td>
                                  <input
                                    type="text"
                                    aria-label={`Equipped item ${index + 1} resref`}
                                    value={entry.resRef ?? ""}
                                    onChange={(event) =>
                                      updateCreatureEquippedItem(
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
                                    aria-label={`Equipped item ${index + 1} random resref`}
                                    value={entry.randomResRef ?? ""}
                                    onChange={(event) =>
                                      updateCreatureEquippedItem(
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
                                    aria-label={`Equipped item ${index + 1} random list`}
                                    value={entry.randomList ?? ""}
                                    onChange={(event) =>
                                      updateCreatureEquippedItem(
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
                                  <div className="canvas-creature-properties-item-flags">
                                    <label>
                                      <input
                                        type="checkbox"
                                        aria-label={`Equipped item ${index + 1} dropable`}
                                        checked={Boolean(entry.dropable)}
                                        onChange={(event) =>
                                          updateCreatureEquippedItem(
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
                                        aria-label={`Equipped item ${index + 1} pickpocketable`}
                                        checked={Boolean(entry.pickpocketable)}
                                        onChange={(event) =>
                                          updateCreatureEquippedItem(
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
                                        aria-label={`Equipped item ${index + 1} infinite`}
                                        checked={Boolean(entry.infinite)}
                                        onChange={(event) =>
                                          updateCreatureEquippedItem(
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
                                    onClick={() => removeCreatureEquippedItem(index)}
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                              {entry.embeddedItem ? (
                                <tr className="canvas-creature-properties-embedded-row">
                                  <td colSpan={7}>
                                    <EmbeddedItemEditor
                                      itemIndex={index}
                                      contextLabel="Equipped item"
                                      embeddedItem={entry.embeddedItem}
                                      onChange={(nextEmbeddedItem) =>
                                        updateCreatureEquippedItem(
                                          index,
                                          "embeddedItem",
                                          nextEmbeddedItem
                                        )
                                      }
                                    />
                                  </td>
                                </tr>
                              ) : null}
                            </Fragment>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7}>No equipped entries</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </fieldset>
                </div>
              ) : null}

              {creaturePropertiesDialog.activeTab === "comments" ? (
                <SharedLongTextPropertySection
                  sectionClassName="canvas-placeable-properties-group"
                  legend="Comments"
                  label="Comments"
                  value={creaturePropertiesDialog.draft.comments}
                  onChange={(nextValue) =>
                    updateCreaturePropertiesDraftField("comments", nextValue)
                  }
                  rows={10}
                />
              ) : null}
            </div>
          </section>

          <SharedDialogActionsFooter
            className="canvas-placeable-properties-actions"
            onApply={() => applyCreaturePropertiesDraft(false)}
            onOk={() => applyCreaturePropertiesDraft(true)}
            onCancel={() => cancelCreaturePropertiesDialog()}
          />
      </>
    </SharedPropertyDialogChrome>
  );
}
